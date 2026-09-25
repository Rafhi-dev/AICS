import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { config } from '../../config';
import { prisma } from '../../shared/database/prisma';

export interface GeminiReplyResult {
  replyText: string;
  mediaToSend?: {
    id: string;
    title: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
  } | null;
}

export class GeminiService {
  private static instance: GeminiService;

  private constructor() {}

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  /**
   * Mengambil instance client GoogleGenerativeAI berdasarkan user atau config env
   */
  private getClient(apiKeyOverride?: string | null): GoogleGenerativeAI {
    const key = apiKeyOverride?.trim() || config.geminiApiKey?.trim();
    if (!key) {
      throw new Error(
        'Gemini API Key belum dikonfigurasi. Silakan atur GEMINI_API_KEY di file .env atau pengaturan Bot.'
      );
    }
    return new GoogleGenerativeAI(key);
  }

  /**
   * Ekstraksi dokumen PDF atau file teks menggunakan Google Gemini Multimodal secara native.
   * Tidak memerlukan library lokal seperti pdf-parse!
   */
  public async extractTextFromDocument(
    filePath: string,
    mimeType: string,
    apiKeyOverride?: string | null
  ): Promise<string> {
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`[GeminiService] File tidak ditemukan: ${filePath}`);
        return '';
      }

      // Untuk file teks / markdown biasa, baca langsung
      if (
        mimeType.startsWith('text/') ||
        filePath.toLowerCase().endsWith('.txt') ||
        filePath.toLowerCase().endsWith('.md')
      ) {
        return fs.readFileSync(filePath, 'utf-8');
      }

      // Untuk file PDF atau gambar dokumen, gunakan Gemini Multimodal
      const isPdf = mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf');
      const isImage =
        mimeType.startsWith('image/') ||
        /\.(jpg|jpeg|png|webp|gif)$/i.test(filePath);

      if (!isPdf && !isImage) {
        console.warn(`[GeminiService] Format file ${mimeType} tidak didukung langsung.`);
        return '';
      }

      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');
      const effectiveMimeType = isPdf ? 'application/pdf' : mimeType || 'image/jpeg';
      const genAI = this.getClient(apiKeyOverride);

      const prompt = `Anda adalah sistem ekstraksi dokumen presisi tinggi (High-Fidelity Document Extractor).
TUGAS WAJIB:
1. Ekstrak SELURUH teks dari SELURUH HALAMAN dari awal sampai akhir tanpa ada yang dilewati, diringkas, atau dipotong.
2. Ekstrak seluruh tabel secara lengkap (termasuk kode, nama, kolom data, unit kompetensi, skema, dll).
3. Ekstrak seluruh daftar entitas: daftar klien/partner, portofolio, produk, harga, nomor telepon/kontak, alamat, serta pengurus/organisasi.
4. Susun dalam format Markdown terstruktur per judul halaman/bab.
5. JANGAN memotong atau membuat rangkuman singkat. Tuliskan teks selengkap-lengkapnya persis seperti isi dokumen asli.`;

      const candidateModels = Array.from(
        new Set([
          config.geminiModel || 'gemini-3.5-flash-lite',
          'gemini-3.5-flash-lite',
          'gemini-3.1-flash-lite',
          'gemini-3.8-flash',
        ].filter(Boolean))
      );

      let extractedText = '';
      let lastErr: any = null;

      for (const mName of candidateModels) {
        try {
          console.log(`[GeminiService] Mengekstrak dokumen (${effectiveMimeType}) dengan model ${mName}...`);
          const model = genAI.getGenerativeModel({
            model: mName,
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192,
            },
          });
          const response = await model.generateContent([
            {
              inlineData: {
                data: base64Data,
                mimeType: effectiveMimeType,
              },
            },
            prompt,
          ]);

          extractedText = response.response.text().trim();
          if (extractedText) {
            console.log(`[GeminiService] Ekstraksi selesai dengan ${mName}! Panjang teks: ${extractedText.length} karakter.`);
            break;
          }
        } catch (mErr: any) {
          console.warn(`[GeminiService] Ekstraksi dengan ${mName} gagal (${mErr?.message || mErr}), mencoba fallback...`);
          lastErr = mErr;
        }
      }

      if (!extractedText && lastErr) {
        throw lastErr;
      }

      return extractedText;
    } catch (err: any) {
      console.error('[GeminiService extractTextFromDocument Error]:', err?.message || err);
      return '';
    }
  }

  /**
   * Menghasilkan koordinat vektor untuk teks menggunakan gemini-embedding-001
   */
  public async generateEmbedding(
    text: string,
    apiKeyOverride?: string | null
  ): Promise<number[]> {
    try {
      const cleanText = text.trim();
      if (!cleanText) return [];

      const genAI = this.getClient(apiKeyOverride);
      const embeddingModel = genAI.getGenerativeModel({
        model: 'gemini-embedding-001',
      });

      const result = await embeddingModel.embedContent(cleanText);
      return result.embedding.values || [];
    } catch (err: any) {
      console.error('[GeminiService generateEmbedding Error]:', err?.message || err);
      return [];
    }
  }

  /**
   * Menghasilkan balasan WhatsApp CS menggunakan Gemini berdasarkan konteks dokumen RAG
   */
  public async generateReply(
    userId: string | null | undefined,
    contactWaId: string,
    customerMessage: string,
    historyMessages: { sender: string; text: string }[] = [],
    retrievedContext: string = '',
    relevantMediaDoc?: {
      id: string;
      title: string;
      fileUrl: string | null;
      fileName: string | null;
      fileType: string | null;
    } | null
  ): Promise<GeminiReplyResult> {
    try {
      // 1. Ambil bot config dari database
      let botConfig = userId
        ? await prisma.botConfig.findUnique({ where: { userId } })
        : null;

      if (!botConfig) {
        botConfig = await prisma.botConfig.findFirst({
          where: { userId: null },
        });
      }

      const activeApiKey = botConfig?.geminiApiKey?.trim() || config.geminiApiKey;
      const activeModel = botConfig?.geminiModel?.trim() || config.geminiModel || 'gemini-3.5-flash-lite';
      const temperature = typeof botConfig?.temperature === 'number' ? botConfig.temperature : 0.2;

      const genAI = this.getClient(activeApiKey);

      // 2. Susun system instruction
      const isPersonalAssistant = botConfig?.botMode === 'PERSONAL_ASSISTANT';
      const baseSystemPrompt = isPersonalAssistant
        ? botConfig?.paInstructions ||
          'Anda adalah asisten pribadi yang ramah, sopan, dan sigap mencatat pesan.'
        : botConfig?.systemPrompt ||
          'Anda adalah Asisten Customer Service (CS) AI yang ramah, profesional, sopan, dan sangat membantu.';

      const businessName = botConfig?.businessName || 'Layanan Pelanggan';

      const systemInstruction = `[IDENTITAS & PERAN SISTEM]
Nama Bisnis / Toko: ${businessName}
${baseSystemPrompt}

[PRINSIP AKURASI TINGGI & ANTI-HALUSINASI (SANGAT KETAT)]:
1. HANYA JAWAB BERDASARKAN FAKTA: Rujuk secara ketat informasi resmi yang diberikan pada [BASIS PENGETAHUAN DOKUMEN & RAG].
2. DILARANG KERAS MENGARANG ATAU SPEKULASI (ANTI-HALUSINASI): Jangan pernah mengarang data, harga, jadwal operasional, promo, garansi, atau syarat yang tidak tertulis dalam dokumen.
3. JIKA INFORMASI TIDAK TERSEDIA: Katakan dengan santun, jujur, dan ramah bahwa informasi tersebut belum tercatat di sistem kami, lalu arahkan pelanggan untuk menunggu tim admin memeriksa lebih lanjut. JANGAN PERNAH menebak jawaban.
4. GAYA KOMUNIKASI WHATSAPP: Ramah, hangat, sopan, ringkas, dan jelas (to-the-point). Gunakan salam dan bahasa Indonesia yang alami dan nyaman dibaca di layar HP tanpa bertele-tele.`;

      let promptContent = '';

      if (retrievedContext && retrievedContext.trim().length > 0) {
        promptContent += `[BASIS PENGETAHUAN DOKUMEN & RAG]:
${retrievedContext}
(PANDUAN: Jawab HANYA berdasarkan fakta di atas. Jika ditanya hal di luar fakta di atas, nyatakan belum tersedia dan arahkan ke admin)\n\n`;
      }

      if (relevantMediaDoc && relevantMediaDoc.fileUrl) {
        promptContent += `[INFORMASI LAMPIRAN MEDIA]:
Tersedia dokumen/media: "${relevantMediaDoc.title}" (${relevantMediaDoc.fileName || ''}).
Sistem kami akan otomatis melampirkan file ini bersama balasan Anda. Silakan sebutkan dalam pesan Anda bahwa Anda telah melampirkan file/brosur tersebut.\n\n`;
      }

      // 3. Susun riwayat percakapan
      const formattedHistory = historyMessages
        .slice(-6)
        .map((h) => `${h.sender === 'CUSTOMER' ? 'Pelanggan' : 'CS'}: ${h.text}`)
        .join('\n');

      if (formattedHistory) {
        promptContent += `[RIWAYAT CHAT TERAKHIR]\n${formattedHistory}\n\n`;
      }

      promptContent += `Pelanggan: ${customerMessage}\nCS (${businessName}):`;

      const candidateModels = Array.from(
        new Set([
          activeModel,
          'gemini-3.5-flash-lite',
          'gemini-3.1-flash-lite',
          'gemini-3.8-flash',
        ].filter(Boolean))
      );

      let replyText = '';
      let lastErr: any = null;

      for (const mName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: mName,
            systemInstruction,
            generationConfig: {
              temperature,
              maxOutputTokens: botConfig?.maxTokens || 800,
            },
          });
          const result = await model.generateContent(promptContent);
          replyText = result.response.text().trim();
          if (replyText) break;
        } catch (mErr: any) {
          console.warn(`[GeminiService] Model ${mName} gagal (${mErr?.message || mErr}), mencoba fallback...`);
          lastErr = mErr;
        }
      }

      if (!replyText) {
        throw lastErr || new Error('Semua model Gemini sedang sibuk.');
      }

      let mediaToSend = null;
      if (relevantMediaDoc && relevantMediaDoc.fileUrl) {
        mediaToSend = {
          id: relevantMediaDoc.id,
          title: relevantMediaDoc.title,
          fileUrl: relevantMediaDoc.fileUrl,
          fileName: relevantMediaDoc.fileName || 'dokumen.pdf',
          fileType: relevantMediaDoc.fileType || 'PDF',
        };
      }

      return {
        replyText,
        mediaToSend,
      };
    } catch (err: any) {
      console.error('[GeminiService generateReply Error]:', err?.message || err);
      return {
        replyText:
          'Halo! Mohon maaf, sistem AI kami sedang mengalami kendala sementara. Tim admin kami akan segera merespons pesan Anda ya.',
        mediaToSend: null,
      };
    }
  }
}

export const geminiService = GeminiService.getInstance();
