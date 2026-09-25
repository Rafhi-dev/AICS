import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { prisma } from '../../shared/database/prisma';
import { geminiService } from '../ai/gemini.service';
import { deepseekService } from '../ai/deepseek.service';
import { ragService } from '../ai/rag.service';
import { documentService } from '../document/document.service';
import { whatsappService as openWAService } from '../whatsapp/whatsapp.service';
import { config } from '../../config';

export class ChatService {
  private static instance: ChatService;
  private io: SocketIOServer | null = null;

  private constructor() {}

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  public setSocketServer(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Menangani pesan WhatsApp yang masuk dari pelanggan untuk user tertentu
   */
  public async handleIncomingMessage(userId: string, waMessage: any): Promise<void> {
    // Abaikan pesan yang dikirim oleh bot/akun sendiri
    if (waMessage.fromMe) return;

    const rawFrom = waMessage.from; // e.g. 62812345678@c.us or 138714659446960@lid
    const text = waMessage.body?.trim();
    if (!text) return;

    const pushName = waMessage.sender?.pushname || waMessage.notifyName || null;
    const phone = rawFrom.replace(/@(c\.us|lid|s\.whatsapp\.net)/g, '');
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const displayName = pushName || (cleanPhone ? `User +${cleanPhone}` : `User ${phone}`);

    try {
      // 1. Dapatkan atau buat data Contact untuk user tersebut
      const contact = await prisma.contact.upsert({
        where: {
          userId_waId: {
            userId,
            waId: rawFrom,
          },
        },
        update: {
          pushName: pushName || undefined,
          phone: phone,
          updatedAt: new Date(),
        },
        create: {
          userId,
          waId: rawFrom,
          name: displayName,
          pushName: pushName,
          phone: phone,
          isAiActive: true,
        },
      });

      // 2. Dapatkan atau buat percakapan aktif untuk user tersebut
      let conversation = await prisma.conversation.findFirst({
        where: {
          userId,
          contactId: contact.id,
          deletedAt: null,
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            userId,
            contactId: contact.id,
            status: 'OPEN',
            lastMessageAt: new Date(),
          },
        });
      } else {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date(), status: 'OPEN' },
        });
      }

      // Pastikan waMessageId selalu String (di whatsapp-web.js waMessage.id berbentuk objek)
      let waMessageId: string | null = null;
      if (typeof waMessage.id === 'string') {
        waMessageId = waMessage.id;
      } else if (waMessage.id && typeof waMessage.id === 'object') {
        waMessageId = waMessage.id._serialized || waMessage.id.id || waMessage.id.$1 || null;
      }

      // 3. Simpan pesan pelanggan ke database
      const customerMsg = await prisma.message.create({
        data: {
          waMessageId: waMessageId,
          conversationId: conversation.id,
          sender: 'CUSTOMER',
          text: text,
          createdAt: new Date(),
        },
      });

      // Emit real-time update ke room user yang bersangkutan
      if (this.io) {
        this.io.to(`user_${userId}`).emit('new_message', {
          conversationId: conversation.id,
          message: customerMsg,
          contact: contact,
        });
      }

      // 4. Periksa apakah Auto-Reply aktif (Global User & Per-Kontak)
      let botConfig = await prisma.botConfig.findUnique({
        where: { userId },
      });

      if (!botConfig) {
        botConfig = await prisma.botConfig.findFirst({
          where: { userId: null },
        });
      }

      const isGlobalActive = botConfig ? botConfig.autoReplyEnabled : true;
      const isContactAiActive = contact.isAiActive;

      if (!isGlobalActive || !isContactAiActive) {
        console.log(
          `[ChatService User ${userId}] Auto-reply skipped for ${contact.name || phone}. Global=${isGlobalActive}, ContactAI=${isContactAiActive}`
        );
        return;
      }

      // 5. Ambil 10 pesan riwayat terakhir untuk konteks percakapan
      const history = await prisma.message.findMany({
        where: { conversationId: conversation.id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        take: 10,
        select: { sender: true, text: true },
      });

      // Beritahu frontend user bahwa AI sedang berpikir
      if (this.io) {
        this.io.to(`user_${userId}`).emit('ai_typing', {
          conversationId: conversation.id,
          isTyping: true,
        });
      }

      // 6. Generate jawaban dari AI (DeepSeek atau Gemini + RAG)
      const ragData = await ragService.findRelevantContext(userId, text, 5);
      const matchedDocs = await documentService.findRelevantDocuments(text, userId);
      const relevantMediaDoc = matchedDocs.find((d) => d.canSendAsMedia && d.fileUrl) || null;

      const aiProvider = botConfig?.aiProvider || 'DEEPSEEK';
      let aiResult;

      if (aiProvider === 'GEMINI') {
        aiResult = await geminiService.generateReply(
          userId,
          contact.waId,
          text,
          history,
          ragData.contextText,
          relevantMediaDoc
        );
      } else {
        aiResult = await deepseekService.generateReply(
          userId,
          contact.waId,
          text,
          history,
          ragData.contextText,
          relevantMediaDoc
        );
      }

      const replyText = aiResult.replyText;
      const media = aiResult.mediaToSend;

      // Selesai berpikir
      if (this.io) {
        this.io.to(`user_${userId}`).emit('ai_typing', {
          conversationId: conversation.id,
          isTyping: false,
        });
      }

      // 7. Kirim balasan ke WhatsApp pelanggan (dan lampiran media jika diminta)
      if (media && media.fileUrl) {
        let filePath = media.fileUrl;
        if (filePath.startsWith('/uploads/')) {
          filePath = path.join(process.cwd(), 'uploads', filePath.replace('/uploads/', ''));
        }

        if (fs.existsSync(filePath)) {
          if (media.fileType === 'IMAGE') {
            console.log(
              `[ChatService User ${userId}] Sending brochure image to ${contact.waId}: ${media.fileName}`
            );
            await openWAService.sendImage(userId, contact.waId, filePath, media.fileName, replyText);
          } else {
            console.log(
              `[ChatService User ${userId}] Sending document to ${contact.waId}: ${media.fileName}`
            );
            await openWAService.sendMessage(userId, contact.waId, replyText);
            await openWAService.sendFile(userId, contact.waId, filePath, media.fileName, media.title);
          }
        } else {
          await openWAService.sendMessage(userId, contact.waId, replyText);
        }
      } else {
        await openWAService.sendMessage(userId, contact.waId, replyText);
      }

      // 8. Simpan balasan bot ke database
      const botMsg = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: 'BOT',
          text: replyText,
          mediaUrl: media ? media.fileUrl : null,
          mediaType: media ? media.fileType : null,
          createdAt: new Date(),
        },
      });

      // Emit balasan bot ke frontend user
      if (this.io) {
        this.io.to(`user_${userId}`).emit('new_message', {
          conversationId: conversation.id,
          message: botMsg,
          contact: contact,
        });
      }
    } catch (err: any) {
      console.error(`[ChatService Error for user ${userId}]:`, err);
      if (this.io) {
        this.io.to(`user_${userId}`).emit('ai_typing', { isTyping: false });
      }
    }
  }

  /**
   * Ambil daftar percakapan milik user
   */
  public async getConversations(userId: string, isAudit: boolean) {
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        ...(isAudit ? { deletedAt: { not: null } } : { deletedAt: null }),
      },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return conversations.map((c) => ({
      id: c.id,
      contact: c.contact,
      status: c.status,
      lastMessageAt: c.lastMessageAt,
      deletedAt: c.deletedAt,
      lastMessage: c.messages[0] || null,
    }));
  }

  /**
   * Ambil riwayat percakapan beserta seluruh pesan
   */
  public async getConversationMessages(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: { contact: true },
    });

    if (!conversation) {
      return null;
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    return { conversation, messages };
  }

  /**
   * Operator manusia membalas manual dari dashboard
   */
  public async sendAgentReply(userId: string, conversationId: string, text: string): Promise<any> {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: { contact: true },
    });

    if (!conversation) {
      throw new Error('Percakapan tidak ditemukan');
    }

    // Kirim pesan via WhatsApp client user
    const sent = await openWAService.sendMessage(userId, conversation.contact.waId, text);
    if (!sent) {
      throw new Error('Gagal mengirim pesan melalui WhatsApp');
    }

    // Simpan pesan operator ke database
    const agentMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'AGENT',
        text: text,
        createdAt: new Date(),
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    if (this.io) {
      this.io.to(`user_${userId}`).emit('new_message', {
        conversationId: conversation.id,
        message: agentMsg,
        contact: conversation.contact,
      });
    }

    return agentMsg;
  }

  /**
   * Soft delete percakapan untuk keperluan audit
   */
  public async softDeleteConversation(userId: string, conversationId: string): Promise<any> {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new Error('Percakapan tidak ditemukan');
    }

    const now = new Date();
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { deletedAt: now },
    });

    await prisma.message.updateMany({
      where: { conversationId, deletedAt: null },
      data: { deletedAt: now },
    });

    return updated;
  }

  /**
   * Pulihkan percakapan yang di-soft-delete
   */
  public async restoreConversation(userId: string, conversationId: string): Promise<any> {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new Error('Percakapan tidak ditemukan');
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { deletedAt: null },
    });

    await prisma.message.updateMany({
      where: { conversationId },
      data: { deletedAt: null },
    });

    return updated;
  }

  /**
   * Toggle AI status untuk kontak tertentu
   */
  public async toggleContactAi(userId: string, contactId: string, isAiActive: boolean) {
    return await prisma.contact.updateMany({
      where: { id: contactId, userId },
      data: { isAiActive: Boolean(isAiActive) },
    });
  }
}

export const chatService = ChatService.getInstance();
