import axios from 'axios';
import { config } from '../../config';
import { prisma } from '../../shared/database/prisma';

export type JinaTask = 'retrieval.passage' | 'retrieval.query' | 'text-matching' | 'classification';

export class JinaService {
  private static instance: JinaService;
  private readonly baseUrl = 'https://api.jina.ai/v1/embeddings';
  private readonly model = 'jina-embeddings-v3';

  private constructor() {}

  public static getInstance(): JinaService {
    if (!JinaService.instance) {
      JinaService.instance = new JinaService();
    }
    return JinaService.instance;
  }

  /**
   * Mengambil API key aktif untuk Jina AI
   */
  public async getActiveApiKey(userId?: string | null): Promise<string> {
    if (userId) {
      const userConfig = await prisma.botConfig.findUnique({
        where: { userId },
      });
      if (userConfig?.jinaApiKey?.trim()) {
        return userConfig.jinaApiKey.trim();
      }
    }

    // Cek admin config
    const adminConfig = await prisma.botConfig.findFirst({
      where: { jinaApiKey: { not: '' } },
    });
    if (adminConfig?.jinaApiKey?.trim()) {
      return adminConfig.jinaApiKey.trim();
    }

    return config.jinaApiKey || '';
  }

  /**
   * Mengambil model aktif untuk Jina AI
   */
  public async getActiveModel(userId?: string | null): Promise<string> {
    if (userId) {
      const userConfig = await prisma.botConfig.findUnique({
        where: { userId },
      });
      if (userConfig?.jinaModel?.trim()) {
        return userConfig.jinaModel.trim();
      }
    }

    const adminConfig = await prisma.botConfig.findFirst({
      where: { jinaModel: { not: '' } },
    });
    if (adminConfig?.jinaModel?.trim()) {
      return adminConfig.jinaModel.trim();
    }

    return config.jinaModel || 'jina-embeddings-v3';
  }

  /**
   * Menghasilkan vektor embedding untuk teks tunggal menggunakan Jina Embeddings
   */
  public async generateEmbedding(
    text: string,
    task: JinaTask = 'retrieval.passage',
    apiKeyOverride?: string | null,
    modelOverride?: string | null
  ): Promise<number[]> {
    const cleanText = text.trim();
    if (!cleanText) return [];

    const apiKey = apiKeyOverride?.trim() || (await this.getActiveApiKey());
    if (!apiKey) {
      throw new Error('Jina AI API Key belum dikonfigurasi di Settings.');
    }

    const activeModel = modelOverride?.trim() || (await this.getActiveModel());
    const isV4 = activeModel.includes('v4');
    const isV3 = activeModel.includes('v3');

    try {
      console.log(`[JinaService] Menghasilkan embedding (${activeModel}, task: ${task}, len: ${cleanText.length})...`);
      const payload: any = {
        model: activeModel,
        late_chunking: false,
        input: [cleanText],
      };
      if (isV4) {
        payload.task = task;
        payload.dimensions = 2048;
      } else if (isV3) {
        payload.task = task;
        payload.dimensions = 1024;
      }

      const response = await axios.post(
        this.baseUrl,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 25000,
        }
      );

      const embedding = response.data?.data?.[0]?.embedding;
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Format respon embedding Jina AI tidak valid.');
      }

      return embedding;
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Error generating Jina embedding';
      console.error('[JinaService Error]:', errMsg);
      throw new Error(`Gagal membuat embedding Jina AI (${activeModel}): ${errMsg}`);
    }
  }

  /**
   * Menghasilkan vektor embedding untuk beberapa potongan teks sekaligus (batch)
   */
  public async generateEmbeddingsBatch(
    texts: string[],
    task: JinaTask = 'retrieval.passage',
    apiKeyOverride?: string | null,
    modelOverride?: string | null
  ): Promise<number[][]> {
    const validTexts = texts.map((t) => t.trim()).filter((t) => t.length > 0);
    if (validTexts.length === 0) return [];

    const apiKey = apiKeyOverride?.trim() || (await this.getActiveApiKey());
    if (!apiKey) {
      throw new Error('Jina AI API Key belum dikonfigurasi di Settings.');
    }

    const activeModel = modelOverride?.trim() || (await this.getActiveModel());
    const isV4 = activeModel.includes('v4');
    const isV3 = activeModel.includes('v3');

    try {
      console.log(`[JinaService] Batch embedding (${activeModel}, ${validTexts.length} chunks, task: ${task})...`);
      const payload: any = {
        model: activeModel,
        late_chunking: false,
        input: validTexts,
      };
      if (isV4) {
        payload.task = task;
        payload.dimensions = 2048;
      } else if (isV3) {
        payload.task = task;
        payload.dimensions = 1024;
      }

      const response = await axios.post(
        this.baseUrl,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 45000,
        }
      );

      const data = response.data?.data;
      if (!Array.isArray(data)) {
        throw new Error('Format respons batch Jina AI tidak valid.');
      }

      // Pastikan urutan data sesuai indeks
      return data.sort((a: any, b: any) => a.index - b.index).map((item: any) => item.embedding);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Error batch Jina embedding';
      console.error('[JinaService Batch Error]:', errMsg);
      throw new Error(`Gagal batch embedding Jina AI (${activeModel}): ${errMsg}`);
    }
  }
}

export const jinaService = JinaService.getInstance();
