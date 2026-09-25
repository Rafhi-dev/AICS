import { prisma } from '../../shared/database/prisma';
import { config as envConfig } from '../../config';

export class BotConfigService {
  public static async getConfig(user: any) {
    const userId = user.id;
    let botConfig = await prisma.botConfig.findUnique({
      where: { userId },
    });

    if (!botConfig) {
      botConfig = await prisma.botConfig.create({
        data: {
          userId,
          businessName: user.name || 'Layanan Pelanggan AI',
          systemPrompt:
            'Anda adalah Asisten Customer Service (CS) AI yang ramah, profesional, sopan, dan sangat membantu. Tugas Anda adalah menyapa pelanggan, menjawab pertanyaan seputar layanan dan produk berdasarkan informasi yang tersedia, serta memberikan solusi terbaik secara singkat, jelas, dan santun. Jika tidak mengetahui jawaban spesifik, sarankan pelanggan menunggu agen manusia kami.',
          botMode: 'CUSTOMER_SERVICE',
          ownerName: user.name || 'Pemilik',
          paInstructions:
            'Anda adalah sekretaris pribadi profesional dari Pemilik. Anda berbicara atas nama beliau dengan sopan, santun, ramah, dan terstruktur. Tugas Anda adalah menyapa siapa pun yang menghubungi nomor ini, menjelaskan bahwa beliau sedang sibuk/ada agenda penting, menanyakan keperluan mereka dengan detail, mencatat pesan titipan, serta memberikan informasi ketersediaan atau catatan yang relevan.',
          geminiApiKey: envConfig.geminiApiKey,
          geminiModel: envConfig.geminiModel,
          deepseekApiKey: envConfig.deepseekApiKey,
          deepseekModel: envConfig.deepseekModel,
          mineruApiToken: envConfig.mineruApiToken,
          jinaApiKey: envConfig.jinaApiKey,
          jinaModel: envConfig.jinaModel,
          aiProvider: 'DEEPSEEK',
          autoReplyEnabled: true,
          temperature: 0.2,
          maxTokens: 800,
        },
      });
    }

    const isAdmin = user.role === 'ADMIN';
    const responseData = { ...botConfig };
    if (!isAdmin) {
      if (responseData.geminiApiKey) responseData.geminiApiKey = '••••••••••••••••••••••••';
      if (responseData.deepseekApiKey) responseData.deepseekApiKey = '••••••••••••••••••••••••';
      if (responseData.mineruApiToken) responseData.mineruApiToken = '••••••••••••••••••••••••';
      if (responseData.jinaApiKey) responseData.jinaApiKey = '••••••••••••••••••••••••';
    }

    return responseData;
  }

  public static async updateConfig(user: any, body: any) {
    const userId = user.id;
    const isAdmin = user.role === 'ADMIN';
    const {
      businessName,
      systemPrompt,
      botMode,
      ownerName,
      paInstructions,
      autoReplyEnabled,
      aiProvider,
      deepseekApiKey,
      deepseekModel,
      mineruApiToken,
      jinaApiKey,
      jinaModel,
      geminiApiKey,
      geminiModel,
      temperature,
      maxTokens,
    } = body;

    const updateData: any = {
      businessName,
      systemPrompt,
      botMode: botMode || undefined,
      ownerName: ownerName || undefined,
      paInstructions: paInstructions || undefined,
      autoReplyEnabled: autoReplyEnabled !== undefined ? autoReplyEnabled : undefined,
      aiProvider: aiProvider || undefined,
    };

    if (isAdmin) {
      if (geminiApiKey !== undefined && !geminiApiKey.includes('••••')) {
        updateData.geminiApiKey = geminiApiKey;
      }
      if (deepseekApiKey !== undefined && !deepseekApiKey.includes('••••')) {
        updateData.deepseekApiKey = deepseekApiKey;
      }
      if (mineruApiToken !== undefined && !mineruApiToken.includes('••••')) {
        updateData.mineruApiToken = mineruApiToken;
      }
      if (jinaApiKey !== undefined && !jinaApiKey.includes('••••')) {
        updateData.jinaApiKey = jinaApiKey;
      }
      if (geminiModel) updateData.geminiModel = geminiModel;
      if (deepseekModel) updateData.deepseekModel = deepseekModel;
      if (jinaModel) updateData.jinaModel = jinaModel;
      if (temperature !== undefined) updateData.temperature = parseFloat(temperature);
      if (maxTokens !== undefined) updateData.maxTokens = parseInt(maxTokens, 10);
    }

    return await prisma.botConfig.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        businessName: businessName || 'Layanan Pelanggan AI',
        systemPrompt: systemPrompt || 'Anda adalah Asisten CS AI yang ramah dan membantu.',
        botMode: botMode || 'CUSTOMER_SERVICE',
        ownerName: ownerName || 'Pemilik',
        paInstructions: paInstructions || '',
        autoReplyEnabled: autoReplyEnabled !== undefined ? autoReplyEnabled : true,
        aiProvider: aiProvider || 'DEEPSEEK',
        deepseekApiKey:
          isAdmin && deepseekApiKey && !deepseekApiKey.includes('••••')
            ? deepseekApiKey
            : envConfig.deepseekApiKey,
        deepseekModel: deepseekModel || envConfig.deepseekModel || 'deepseek-chat',
        mineruApiToken:
          isAdmin && mineruApiToken && !mineruApiToken.includes('••••')
            ? mineruApiToken
            : envConfig.mineruApiToken,
        jinaApiKey:
          isAdmin && jinaApiKey && !jinaApiKey.includes('••••')
            ? jinaApiKey
            : envConfig.jinaApiKey,
        jinaModel: (isAdmin && jinaModel) || envConfig.jinaModel || 'jina-embeddings-v3',
        geminiApiKey:
          isAdmin && geminiApiKey && !geminiApiKey.includes('••••')
            ? geminiApiKey
            : envConfig.geminiApiKey,
        geminiModel: (isAdmin && geminiModel) || envConfig.geminiModel || 'gemini-3.5-flash-lite',
        temperature: isAdmin && temperature !== undefined ? parseFloat(temperature) : 0.2,
        maxTokens: isAdmin && maxTokens !== undefined ? parseInt(maxTokens, 10) : 800,
      },
    });
  }
}
