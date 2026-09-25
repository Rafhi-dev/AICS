import { config } from '../../config';
import { prisma } from '../../shared/database/prisma';
import { geminiService, GeminiReplyResult } from './gemini.service';

export class DeepSeekService {
  private static instance: DeepSeekService;

  private constructor() {}

  public static getInstance(): DeepSeekService {
    if (!DeepSeekService.instance) {
      DeepSeekService.instance = new DeepSeekService();
    }
    return DeepSeekService.instance;
  }

  /**
   * Menghasilkan balasan WhatsApp menggunakan DeepSeek API (deepseek-chat)
   * Berdasarkan konteks dokumen RAG
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

      let activeApiKey = botConfig?.deepseekApiKey?.trim() || config.deepseekApiKey;
      if (!activeApiKey) {
        const adminConfig = await prisma.botConfig.findFirst({
          where: { deepseekApiKey: { not: '' } },
        });
        activeApiKey = adminConfig?.deepseekApiKey?.trim() || config.deepseekApiKey;
      }
      const activeModel = botConfig?.deepseekModel?.trim() || config.deepseekModel || 'deepseek-flash';
      const temperature = typeof botConfig?.temperature === 'number' ? botConfig.temperature : 0.2;

      // Jika DeepSeek API Key belum diisi oleh pengguna di settings, fallback otomatis ke Gemini
      if (!activeApiKey) {
        console.warn('[DeepSeekService] API Key DeepSeek belum diisi, mengalihkan balasan ke Gemini AI Studio...');
        return await geminiService.generateReply(
          userId,
          contactWaId,
          customerMessage,
          historyMessages,
          retrievedContext,
          relevantMediaDoc
        );
      }

      // 2. Susun system instruction
      const isPersonalAssistant = botConfig?.botMode === 'PERSONAL_ASSISTANT';
      const baseSystemPrompt = isPersonalAssistant
        ? botConfig?.paInstructions ||
          'Anda adalah asisten pribadi yang ramah, sopan, dan sigap mencatat pesan.'
        : botConfig?.systemPrompt ||
          'Anda adalah Asisten Customer Service (CS) AI yang ramah, profesional, sopan, dan sangat membantu.';

      const businessName = botConfig?.businessName || 'Layanan Pelanggan';

      const systemPrompt = `[IDENTITAS & PERAN SISTEM]
Nama Bisnis / Toko: ${businessName}
${baseSystemPrompt}

[PRINSIP AKURASI TINGGI & ANTI-HALUSINASI (SANGAT KETAT)]:
1. HANYA JAWAB BERDASARKAN FAKTA: Rujuk secara ketat informasi resmi yang diberikan pada [BASIS PENGETAHUAN DOKUMEN & RAG].
2. DILARANG KERAS MENGARANG ATAU SPEKULASI (ANTI-HALUSINASI): Jangan pernah mengarang data, harga, jadwal operasional, promo, garansi, atau spesifikasi yang tidak tertulis dalam dokumen.
3. JIKA INFORMASI TIDAK TERSEDIA: Katakan dengan santun, jujur, dan ramah bahwa informasi tersebut belum tercatat di sistem kami, lalu arahkan pelanggan untuk menunggu tim admin memeriksa lebih lanjut. JANGAN PERNAH menebak jawaban.
4. GAYA KOMUNIKASI WHATSAPP: Ramah, hangat, sopan, ringkas, dan jelas (to-the-point). Gunakan salam dan bahasa Indonesia yang alami dan nyaman dibaca di layar HP tanpa bertele-tele.`;

      // 3. Susun User Prompt dengan RAG Context & History
      let promptContent = '';

      if (retrievedContext && retrievedContext.trim().length > 0) {
        promptContent += `[BASIS PENGETAHUAN DOKUMEN & RAG]:\n${retrievedContext}\n\n(PANDUAN: Jawab HANYA berdasarkan fakta di atas. Jika ditanya hal di luar fakta di atas, nyatakan belum tersedia dan arahkan ke admin)\n\n`;
      }

      if (relevantMediaDoc && relevantMediaDoc.fileUrl) {
        promptContent += `[INFORMASI LAMPIRAN MEDIA]:\nTersedia dokumen/media: "${relevantMediaDoc.title}" (${relevantMediaDoc.fileName || ''}). Sistem kami akan otomatis melampirkan file ini bersama balasan Anda. Silakan sebutkan dalam pesan Anda bahwa Anda telah melampirkan file/brosur tersebut.\n\n`;
      }

      const formattedHistory = historyMessages
        .slice(-6)
        .map((h) => `${h.sender === 'CUSTOMER' ? 'Pelanggan' : 'CS'}: ${h.text}`)
        .join('\n');

      if (formattedHistory) {
        promptContent += `[RIWAYAT CHAT TERAKHIR]:\n${formattedHistory}\n\n`;
      }

      promptContent += `Pelanggan: ${customerMessage}\nCS (${businessName}):`;

      // 4. Eksekusi via LangChain RAG Chain khusus DeepSeek
      console.log(`[DeepSeekService] Menjalankan LangChain Chain via DeepSeek (${activeModel})...`);
      const { ChatOpenAI } = require('@langchain/openai');
      const { SystemMessage, HumanMessage } = require('@langchain/core/messages');
      const { StringOutputParser } = require('@langchain/core/output_parsers');

      const modelOptions: any = {
        modelName: activeModel,
        temperature,
        maxTokens: botConfig?.maxTokens || 800,
        apiKey: activeApiKey,
        configuration: {
          baseURL: 'https://api.deepseek.com',
        },
      };

      // Untuk model non-reasoner (misal deepseek-flash), nonaktifkan thinking agar balasan CS instan
      if (!activeModel.toLowerCase().includes('reasoner')) {
        modelOptions.modelKwargs = {
          thinking: { type: 'disabled' },
        };
      }

      const chatModel = new ChatOpenAI(modelOptions);

      const chain = chatModel.pipe(new StringOutputParser());
      const rawReply = await chain.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(promptContent),
      ]);

      const replyText = (typeof rawReply === 'string' ? rawReply : String(rawReply || '')).trim();

      if (!replyText) {
        throw new Error('Respons dari LangChain DeepSeek kosong.');
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
      console.error('[DeepSeekService generateReply Error]:', err?.message || err);
      // Fallback ke Gemini jika DeepSeek crash
      try {
        console.log('[DeepSeekService] Menjalankan fallback darurat ke Gemini...');
        return await geminiService.generateReply(
          userId,
          contactWaId,
          customerMessage,
          historyMessages,
          retrievedContext,
          relevantMediaDoc
        );
      } catch {
        return {
          replyText:
            'Halo! Mohon maaf, sistem AI kami sedang mengalami kendala sementara. Tim admin kami akan segera merespons pesan Anda ya.',
          mediaToSend: null,
        };
      }
    }
  }
}

export const deepseekService = DeepSeekService.getInstance();
