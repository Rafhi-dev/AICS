import fs from 'fs';
import path from 'path';
import { prisma } from '../../shared/database/prisma';
import { geminiService } from '../ai/gemini.service';
import { mineruService } from '../ai/mineru.service';
import { ragService } from '../ai/rag.service';

export interface DocumentMatch {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  canSendAsMedia: boolean;
  score: number;
}

export class DocumentService {
  private static instance: DocumentService;

  private constructor() {}

  public static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  /**
   * Ekstraksi teks dari file (PDF, gambar dokumen, atau file teks).
   * Prioritas: MinerU Cloud API -> Fallback: Google Gemini Multimodal.
   */
  public async extractTextFromFile(
    filePath: string,
    mimeType: string,
    apiKeyOverride?: string | null,
    mineruTokenOverride?: string | null,
    fileName?: string
  ): Promise<string> {
    try {
      if (
        mimeType.startsWith('text/') ||
        filePath.toLowerCase().endsWith('.txt') ||
        filePath.toLowerCase().endsWith('.md')
      ) {
        return fs.readFileSync(filePath, 'utf-8');
      }

      const isPdf = mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf');

      // 1. Ekstraksi via LangChain MinerU Document Loader
      if (isPdf) {
        try {
          const { MinerUDocumentLoader } = require('../ai/langchain-mineru.loader');
          const loader = new MinerUDocumentLoader(
            filePath,
            fileName || path.basename(filePath),
            mineruTokenOverride,
            apiKeyOverride
          );
          const docs = await loader.load();
          if (docs.length > 0 && docs[0].pageContent?.trim().length > 50) {
            console.log(`[DocumentService] Ekstraksi via LangChain-MinerU berhasil (${docs[0].pageContent.length} karakter)!`);
            return docs[0].pageContent;
          }
        } catch (loaderErr: any) {
          console.warn('[DocumentService] MinerUDocumentLoader gagal, beralih ke Gemini Multimodal...', loaderErr?.message);
        }
      }

      // 2. Fallback ke Gemini Multimodal (Cepat & Native)
      console.log('[DocumentService] Menggunakan Gemini Multimodal untuk membaca dokumen...');
      return await geminiService.extractTextFromDocument(filePath, mimeType, apiKeyOverride);
    } catch (err: any) {
      console.error('[DocumentService extractTextFromFile Error]:', err?.message || err);
      return '';
    }
  }

  /**
   * Pencarian cerdas berbasis kata kunci & relevansi untuk pesan pelanggan
   */
  public async findRelevantDocuments(
    queryText: string,
    userId?: string | null
  ): Promise<DocumentMatch[]> {
    try {
      const activeDocs = await prisma.documentKnowledge.findMany({
        where: {
          isActive: true,
          ...(userId ? { userId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      if (activeDocs.length === 0) return [];

      const queryNormalized = String(queryText || '').toLowerCase();
      const queryTokens = queryNormalized
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\n]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 2);

      const scoredDocs: DocumentMatch[] = [];

      for (const doc of activeDocs) {
        let score = 0;
        const docTitle = (doc.title || '').toLowerCase();
        const docKeywords = (doc.keywords || []).map((k) => String(k || '').toLowerCase().trim());
        const docContent = (doc.content || '').toLowerCase();

        // 1. Cek pencocokan kata kunci tags (bobot tinggi)
        for (const kw of docKeywords) {
          if (!kw) continue;
          if (queryNormalized.includes(kw)) {
            score += 15;
          } else {
            // Cek kata per kata dalam tag
            const kwWords = kw.split(/\s+/);
            for (const kwWord of kwWords) {
              if (queryTokens.includes(kwWord)) {
                score += 5;
              }
            }
          }
        }

        // 2. Cek kecocokan di judul dokumen
        for (const token of queryTokens) {
          if (docTitle.includes(token)) {
            score += 4;
          }
          if (docContent.includes(token)) {
            score += 1;
          }
        }

        // Jika ada kecocokan atau dokumen sedikit, sertakan
        if (score > 0) {
          scoredDocs.push({
            id: doc.id,
            title: doc.title,
            category: doc.category,
            content: doc.content || '',
            keywords: doc.keywords || [],
            fileUrl: doc.fileUrl,
            fileName: doc.fileName,
            fileType: doc.fileType,
            canSendAsMedia: doc.canSendAsMedia,
            score: score,
          });
        }
      }

      // Urutkan berdasarkan skor tertinggi
      scoredDocs.sort((a, b) => b.score - a.score);

      // Jika tidak ada skor yang cocok sama sekali tapi jumlah dokumen sedikit (< 4),
      // berikan dokumen aktif sebagai konteks umum
      if (scoredDocs.length === 0 && activeDocs.length <= 3) {
        return activeDocs.map((doc) => ({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          content: doc.content || '',
          keywords: doc.keywords || [],
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          fileType: doc.fileType,
          canSendAsMedia: doc.canSendAsMedia,
          score: 1,
        }));
      }

      // Ambil maksimal 4 dokumen paling relevan agar prompt efisien
      return scoredDocs.slice(0, 4);
    } catch (err: any) {
      console.error('[DocumentService findRelevantDocuments Error]:', err);
      return [];
    }
  }

  // --- CRUD Database Operations ---

  public async getDocuments(userId: string, isAdmin: boolean, queryUserId?: string) {
    let targetUserId = userId;
    if (isAdmin && queryUserId) {
      targetUserId = String(queryUserId);
    }

    return await prisma.documentKnowledge.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async createDocument(
    userId: string,
    file: Express.Multer.File | undefined,
    body: {
      title: string;
      category?: string;
      description?: string;
      keywords?: string | string[];
      canSendAsMedia?: any;
      content?: string;
    }
  ) {
    const { title, category, description, keywords, canSendAsMedia, content } = body;

    let parsedKeywords: string[] = [];
    if (keywords) {
      if (Array.isArray(keywords)) {
        parsedKeywords = keywords;
      } else if (typeof keywords === 'string') {
        parsedKeywords = keywords
          .split(',')
          .map((k: string) => k.trim())
          .filter(Boolean);
      }
    }

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string = 'TEXT';
    let extractedContent = content ? content.trim() : '';

    if (file) {
      fileName = file.originalname;
      fileUrl = `/uploads/${file.filename}`;

      let botConfig = userId ? await prisma.botConfig.findUnique({ where: { userId } }) : null;
      if (!botConfig) {
        botConfig = await prisma.botConfig.findFirst({ where: { userId: null } });
      }

      let mineruToken = botConfig?.mineruApiToken?.trim();
      let geminiKey = botConfig?.geminiApiKey?.trim();

      if (!mineruToken) {
        const adminConfig = await prisma.botConfig.findFirst({
          where: { mineruApiToken: { not: '' } },
        });
        mineruToken = adminConfig?.mineruApiToken?.trim() || undefined;
      }
      if (!geminiKey) {
        const adminConfig = await prisma.botConfig.findFirst({
          where: { geminiApiKey: { not: '' } },
        });
        geminiKey = adminConfig?.geminiApiKey?.trim() || undefined;
      }

      const mime = file.mimetype;
      if (mime.startsWith('image/')) {
        fileType = 'IMAGE';
      } else if (mime === 'application/pdf') {
        fileType = 'PDF';
        if (!extractedContent) {
          const pdfText = await this.extractTextFromFile(file.path, mime, geminiKey, mineruToken, fileName);
          extractedContent = pdfText.slice(0, 500000);
        }
      } else {
        fileType = 'TEXT';
        if (!extractedContent) {
          const text = await this.extractTextFromFile(file.path, mime, geminiKey, mineruToken, fileName);
          extractedContent = text.slice(0, 500000);
        }
      }
    }

    const doc = await prisma.documentKnowledge.create({
      data: {
        userId,
        title: title.trim(),
        category: category || 'Umum',
        description: description || null,
        content: extractedContent,
        keywords: parsedKeywords,
        fileUrl,
        fileName,
        fileType,
        canSendAsMedia: canSendAsMedia !== undefined ? String(canSendAsMedia) === 'true' : true,
        isActive: true,
      },
    });

    if (extractedContent && extractedContent.trim().length > 0) {
      ragService.indexDocument(doc.id, userId, extractedContent).catch((err) => {
        console.error('[Document Upload RAG Error]:', err?.message || err);
      });
    }

    return doc;
  }

  public async updateDocument(
    id: string,
    userId: string,
    isAdmin: boolean,
    body: {
      title?: string;
      category?: string;
      description?: string;
      content?: string;
      keywords?: any;
      canSendAsMedia?: any;
      isActive?: any;
    }
  ) {
    const where: any = { id };
    if (!isAdmin) where.userId = userId;

    const existing = await prisma.documentKnowledge.findFirst({ where });
    if (!existing) {
      throw new Error('Dokumen tidak ditemukan');
    }

    let parsedKeywords = undefined;
    if (body.keywords !== undefined) {
      if (Array.isArray(body.keywords)) {
        parsedKeywords = body.keywords;
      } else if (typeof body.keywords === 'string') {
        parsedKeywords = body.keywords
          .split(',')
          .map((k: string) => k.trim())
          .filter(Boolean);
      }
    }

    const updated = await prisma.documentKnowledge.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title.trim() : undefined,
        category: body.category !== undefined ? body.category : undefined,
        description: body.description !== undefined ? body.description : undefined,
        content: body.content !== undefined ? body.content.trim() : undefined,
        keywords: parsedKeywords,
        canSendAsMedia: body.canSendAsMedia !== undefined ? Boolean(body.canSendAsMedia) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
    });

    if (body.content !== undefined && updated.content) {
      ragService.indexDocument(updated.id, userId, updated.content).catch((err) => {
        console.error('[Document Update RAG Error]:', err?.message || err);
      });
    }

    return updated;
  }

  public async deleteDocument(id: string, userId: string, isAdmin: boolean) {
    const where: any = { id };
    if (!isAdmin) where.userId = userId;

    const doc = await prisma.documentKnowledge.findFirst({ where });
    if (doc) {
      if (doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), 'uploads', doc.fileUrl.replace('/uploads/', ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await ragService.deleteDocumentChunks(id);
      await prisma.documentKnowledge.delete({ where: { id } });
    }
    return true;
  }

  public async toggleDocument(id: string, userId: string, isAdmin: boolean, isActive: boolean) {
    const where: any = { id };
    if (!isAdmin) where.userId = userId;

    const existing = await prisma.documentKnowledge.findFirst({ where });
    if (!existing) {
      throw new Error('Dokumen tidak ditemukan');
    }

    return await prisma.documentKnowledge.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });
  }
}

export const documentService = DocumentService.getInstance();
