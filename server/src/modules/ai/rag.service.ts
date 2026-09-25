import { config } from '../../config';
import { prisma } from '../../shared/database/prisma';
import { geminiService } from './gemini.service';
import { jinaService } from './jina.service';

export interface ScoredChunk {
  id: string;
  documentId: string;
  content: string;
  similarity: number;
}

export class RagService {
  private static instance: RagService;

  private constructor() {}

  public static getInstance(): RagService {
    if (!RagService.instance) {
      RagService.instance = new RagService();
    }
    return RagService.instance;
  }

  /**
   * Mengambil konfigurasi engine embedding aktif (Jina AI untuk DeepSeek atau Gemini)
   */
  private async getEmbeddingConfig(userId?: string | null) {
    let botConfig = userId
      ? await prisma.botConfig.findUnique({ where: { userId } })
      : null;

    if (!botConfig) {
      botConfig = await prisma.botConfig.findFirst({
        where: { userId: null },
      });
    }

    if (!botConfig) {
      botConfig = await prisma.botConfig.findFirst();
    }

    const aiProvider = botConfig?.aiProvider || 'DEEPSEEK';
    let jinaKey = botConfig?.jinaApiKey?.trim();
    if (!jinaKey) {
      const adminConfig = await prisma.botConfig.findFirst({
        where: { jinaApiKey: { not: '' } },
      });
      jinaKey = adminConfig?.jinaApiKey?.trim() || config.jinaApiKey;
    }

    let jinaModel = (botConfig as any)?.jinaModel?.trim();
    if (!jinaModel) {
      const adminConfig = await (prisma.botConfig as any).findFirst({
        where: { jinaModel: { not: '' } },
      });
      jinaModel = (adminConfig as any)?.jinaModel?.trim() || config.jinaModel || 'jina-embeddings-v3';
    }

    let geminiKey = botConfig?.geminiApiKey?.trim();
    if (!geminiKey) {
      const adminConfig = await prisma.botConfig.findFirst({
        where: { geminiApiKey: { not: '' } },
      });
      geminiKey = adminConfig?.geminiApiKey?.trim() || config.geminiApiKey;
    }

    return {
      aiProvider,
      jinaKey,
      jinaModel,
      geminiKey,
    };
  }

  /**
   * Menghitung kemiripan sudut (Cosine Similarity) antara dua vektor embedding
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Memotong teks panjang menjadi potongan-potongan kecil (chunks) dengan overlap
   */
  public chunkText(text: string, maxChunkLength = 800, overlap = 150): string[] {
    const cleanText = text.replace(/\r\n/g, '\n').trim();
    if (!cleanText) return [];

    // Jika teks lebih pendek dari ukuran maksimal, langsung jadikan 1 chunk
    if (cleanText.length <= maxChunkLength) {
      return [cleanText];
    }

    const chunks: string[] = [];
    // Pisahkan per paragraf terlebih dahulu untuk menjaga keutuhan makna
    const paragraphs = cleanText.split(/\n\s*\n/);
    let currentChunk = '';

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      if ((currentChunk + '\n\n' + trimmedPara).length <= maxChunkLength) {
        currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedPara : trimmedPara;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          // Ambil overlap dari akhir chunk sebelumnya
          const overlapText = currentChunk.slice(-overlap);
          currentChunk = overlapText + '\n\n' + trimmedPara;
        } else {
          // Jika 1 paragraf sangat panjang (melebihi maxChunkLength), potong per karakter
          let start = 0;
          while (start < trimmedPara.length) {
            const end = Math.min(start + maxChunkLength, trimmedPara.length);
            chunks.push(trimmedPara.substring(start, end));
            start += maxChunkLength - overlap;
          }
          currentChunk = '';
        }
      }
    }

    if (currentChunk && currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Mengindeks dokumen ke dalam potongan vektor RAG (disimpan ke database)
   */
  public async indexDocument(
    documentId: string,
    userId: string | null | undefined,
    content: string
  ): Promise<number> {
    try {
      if (!content || !content.trim()) return 0;

      // 1. Hapus chunk lama dari dokumen ini jika ada
      await (prisma as any).documentChunk.deleteMany({
        where: { documentId },
      });

      // 2. Pecah teks menjadi chunks
      const textChunks = this.chunkText(content);
      if (textChunks.length === 0) return 0;

      console.log(
        `[RagService] Memproses ${textChunks.length} chunks untuk dokumen ${documentId}...`
      );

      // 3. Tentukan engine embedding: Jina AI (jika provider DEEPSEEK & jinaApiKey tersedia) atau Gemini
      const embCfg = await this.getEmbeddingConfig(userId);
      const useJina = embCfg.aiProvider === 'DEEPSEEK' && !!embCfg.jinaKey;

      let batchEmbeddings: number[][] = [];
      if (useJina) {
        try {
          console.log(
            `[RagService] Menggunakan Jina AI Embeddings (${embCfg.jinaModel}, ${textChunks.length} chunks, task: retrieval.passage)...`
          );
          batchEmbeddings = await jinaService.generateEmbeddingsBatch(
            textChunks,
            'retrieval.passage',
            embCfg.jinaKey,
            embCfg.jinaModel
          );
        } catch (batchErr: any) {
          console.warn('[RagService] Batch Jina embedding gagal, mencoba per chunk:', batchErr?.message || batchErr);
        }
      }

      let indexedCount = 0;
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        try {
          let embedding = batchEmbeddings[i];
          if (!embedding || embedding.length === 0) {
            if (useJina) {
              embedding = await jinaService.generateEmbedding(
                chunk,
                'retrieval.passage',
                embCfg.jinaKey,
                embCfg.jinaModel
              );
            } else {
              embedding = await geminiService.generateEmbedding(chunk, embCfg.geminiKey);
            }
          }

          if (embedding && embedding.length > 0) {
            await (prisma as any).documentChunk.create({
              data: {
                documentId,
                userId: userId || null,
                chunkIndex: i,
                content: chunk,
                embedding: embedding,
              },
            });
            indexedCount++;
          }
        } catch (embErr: any) {
          console.error(`[RagService] Gagal embed chunk #${i}:`, embErr?.message || embErr);
        }
      }

      console.log(
        `[RagService] Berhasil mengindeks ${indexedCount}/${textChunks.length} chunks ke database!`
      );
      return indexedCount;
    } catch (err: any) {
      console.error('[RagService indexDocument Error]:', err?.message || err);
      return 0;
    }
  }

  /**
   * Menghapus seluruh vektor chunk saat dokumen dihapus
   */
  public async deleteDocumentChunks(documentId: string): Promise<void> {
    try {
      await (prisma as any).documentChunk.deleteMany({
        where: { documentId },
      });
    } catch (err: any) {
      console.error('[RagService deleteDocumentChunks Error]:', err?.message || err);
    }
  }

  /**
   * Mencari potongan dokumen RAG paling relevan berdasarkan makna pertanyaan pelanggan
   */
  public async findRelevantContext(
    userId: string | null | undefined,
    queryText: string,
    topK = 5,
    minSimilarity = 0.25
  ): Promise<{ contextText: string; matchedChunks: ScoredChunk[] }> {
    try {
      const cleanQuery = queryText.trim().toLowerCase();
      if (!cleanQuery) return { contextText: '', matchedChunks: [] };

      // 1. Generate embedding untuk pertanyaan pelanggan
      const embCfg = await this.getEmbeddingConfig(userId);
      const useJina = embCfg.aiProvider === 'DEEPSEEK' && !!embCfg.jinaKey;

      let queryEmbedding: number[] = [];
      if (useJina) {
        try {
          console.log(`[RagService] Menghasilkan query embedding via Jina AI (${embCfg.jinaModel}, task: retrieval.query)...`);
          queryEmbedding = await jinaService.generateEmbedding(
            cleanQuery,
            'retrieval.query',
            embCfg.jinaKey,
            embCfg.jinaModel
          );
        } catch (jinaErr: any) {
          console.warn('[RagService] Jina query embedding gagal, mencoba fallback ke Gemini:', jinaErr?.message || jinaErr);
          queryEmbedding = await geminiService.generateEmbedding(cleanQuery, embCfg.geminiKey);
        }
      } else {
        queryEmbedding = await geminiService.generateEmbedding(cleanQuery, embCfg.geminiKey);
      }

      const userCondition = userId
        ? { OR: [{ userId }, { userId: null }] }
        : {};

      const scored: ScoredChunk[] = [];

      // 2. Pencarian cepat native pgvector dengan indeks HNSW & Hybrid Retrieval
      if (queryEmbedding && queryEmbedding.length > 0) {
        const queryVectorStr = `[${queryEmbedding.join(',')}]`;
        const queryDim = queryEmbedding.length;
        const candidateLimit = Math.max(topK * 4, 25);

        try {
          const rawMatches: any[] = await prisma.$queryRawUnsafe(`
            SELECT 
              dc.id, 
              dc."documentId", 
              dc.content,
              (1 - (dc.embedding_vec <=> $1::vector)) AS similarity,
              dk.title,
              dk.keywords
            FROM "DocumentChunk" dc
            JOIN "DocumentKnowledge" dk ON dc."documentId" = dk.id
            WHERE dk."isActive" = true
              AND ($2::text IS NULL OR dc."userId" = $2::text OR dc."userId" IS NULL)
              AND dc.embedding_vec IS NOT NULL
              AND array_length(dc.embedding, 1) = $3
            ORDER BY dc.embedding_vec <=> $1::vector ASC
            LIMIT $4;
          `, queryVectorStr, userId || null, queryDim, candidateLimit);

          const queryWords = cleanQuery.split(/\s+/).filter((w: string) => w.length > 2);

          for (const item of rawMatches) {
            let sim = Number(item.similarity) || 0;

            // Hybrid Keyword Match Boost
            const contentLower = String(item.content || '').toLowerCase();
            const docKeywords = (Array.isArray(item.keywords) ? item.keywords : []).map((k: string) => String(k || '').toLowerCase());
            const titleLower = String(item.title || '').toLowerCase();

            let matchCount = 0;
            for (const w of queryWords) {
              if (contentLower.includes(w)) matchCount++;
              if (docKeywords.some((k: string) => k.includes(w))) matchCount += 1.5;
              if (titleLower.includes(w)) matchCount++;
            }

            if (matchCount > 0) {
              sim += Math.min(0.20, matchCount * 0.05);
            }

            if (sim >= minSimilarity) {
              scored.push({
                id: item.id,
                documentId: item.documentId,
                content: item.content,
                similarity: sim,
              });
            }
          }

          scored.sort((a, b) => b.similarity - a.similarity);
        } catch (dbErr: any) {
          console.warn('[RagService] Native pgvector search fallback notice:', dbErr?.message || dbErr);
        }
      }

      // Fallback in-memory jika hasil pgvector kosong (misal format embedding lawas 3072)
      if (scored.length === 0) {
        const activeChunks = await (prisma as any).documentChunk.findMany({
          where: {
            ...userCondition,
            document: {
              isActive: true,
            },
          },
          select: {
            id: true,
            documentId: true,
            content: true,
            embedding: true,
            document: {
              select: {
                title: true,
                keywords: true,
              },
            },
          },
        });

        if (activeChunks && activeChunks.length > 0) {
          const queryWords = cleanQuery.split(/\s+/).filter((w: string) => w.length > 2);

          for (const item of activeChunks) {
            let sim = queryEmbedding && queryEmbedding.length > 0
              ? this.cosineSimilarity(queryEmbedding, item.embedding)
              : 0;

            const contentLower = item.content.toLowerCase();
            const docKeywords = (item.document?.keywords || []).map((k: string) => k.toLowerCase());
            const titleLower = (item.document?.title || '').toLowerCase();

            let matchCount = 0;
            for (const w of queryWords) {
              if (contentLower.includes(w)) matchCount++;
              if (docKeywords.some((k: string) => k.includes(w))) matchCount += 1.5;
              if (titleLower.includes(w)) matchCount++;
            }

            if (matchCount > 0) {
              sim += Math.min(0.20, matchCount * 0.05);
            }

            if (sim >= minSimilarity) {
              scored.push({
                id: item.id,
                documentId: item.documentId,
                content: item.content,
                similarity: sim,
              });
            }
          }

          scored.sort((a, b) => b.similarity - a.similarity);
        }
      }

      const topMatches = scored.slice(0, topK);

      // 4. Cari juga dari tabel Tanya-Jawab Tanya (KnowledgeItem)
      const qnaItems = await (prisma as any).knowledgeItem.findMany({
        where: {
          ...userCondition,
          isActive: true,
        },
        take: 5,
      });

      const matchedQnA: string[] = [];
      if (qnaItems && qnaItems.length > 0) {
        for (const qna of qnaItems) {
          const qLower = qna.question.toLowerCase();
          const words = cleanQuery.split(/\s+/).filter((w: string) => w.length > 2);
          const isMatch = words.some((w: string) => qLower.includes(w));
          if (isMatch) {
            matchedQnA.push(`Tanya: ${qna.question}\nJawab: ${qna.answer}`);
          }
        }
      }

      // 5. Satukan potongan teks untuk disajikan sebagai konteks ke AI
      let contextParts: string[] = [];

      if (matchedQnA.length > 0) {
        contextParts.push(`[TANYA JAWAB RESMI]:\n${matchedQnA.join('\n\n')}`);
      }

      if (topMatches.length > 0) {
        const docsText = topMatches
          .map((m, idx) => `[Kutipan Dokumen ${idx + 1}]:\n${m.content}`)
          .join('\n\n---\n\n');
        contextParts.push(docsText);
      }

      const contextText = contextParts.join('\n\n====================\n\n');

      return {
        contextText,
        matchedChunks: topMatches,
      };
    } catch (err: any) {
      console.error('[RagService findRelevantContext Error]:', err?.message || err);
      return { contextText: '', matchedChunks: [] };
    }
  }
}

export const ragService = RagService.getInstance();
