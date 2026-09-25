import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode';
import { Server as SocketIOServer } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../shared/database/prisma';

export type WAConnectionStatus =
  | 'DISCONNECTED'
  | 'INITIALIZING'
  | 'QR_READY'
  | 'AUTHENTICATING'
  | 'CONNECTED'
  | 'ERROR';

export interface UserSessionState {
  userId: string;
  client: WASocket | null;
  status: WAConnectionStatus;
  currentQrCode: string | null;
  connectedNumber: string | null;
  isInitializing: boolean;
}

export class WhatsAppService {
  private static instance: WhatsAppService;
  private sessions: Map<string, UserSessionState> = new Map();
  private io: SocketIOServer | null = null;
  private onMessageCallback: ((userId: string, message: any) => Promise<void>) | null = null;
  private authDataDir: string;

  private constructor() {
    this.authDataDir = path.join(process.cwd(), '.baileys_auth');
    if (!fs.existsSync(this.authDataDir)) {
      fs.mkdirSync(this.authDataDir, { recursive: true });
    }
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  public setSocketServer(io: SocketIOServer) {
    this.io = io;
  }

  public setOnMessageHandler(callback: (userId: string, message: any) => Promise<void>) {
    this.onMessageCallback = callback;
  }

  public getSessionState(userId: string): UserSessionState {
    let state = this.sessions.get(userId);
    if (!state) {
      state = {
        userId,
        client: null,
        status: 'DISCONNECTED',
        currentQrCode: null,
        connectedNumber: null,
        isInitializing: false,
      };
      this.sessions.set(userId, state);
    }
    return state;
  }

  public getStatus(userId: string) {
    const state = this.getSessionState(userId);
    return {
      status: state.status,
      qrCode: state.currentQrCode,
      connectedNumber: state.connectedNumber,
    };
  }

  public updateStatus(
    userId: string,
    newStatus: WAConnectionStatus,
    qrCode?: string | null
  ) {
    const state = this.getSessionState(userId);
    state.status = newStatus;
    if (qrCode !== undefined) {
      state.currentQrCode = qrCode;
    }
    console.log(`[Baileys User ${userId}] Status changed to: ${newStatus}`);

    // Emit socket event ke room user tertentu
    if (this.io) {
      this.io.to(`user_${userId}`).emit('wa_status', {
        status: state.status,
        qrCode: state.currentQrCode,
        connectedNumber: state.connectedNumber,
      });
    }
  }

  private formatTargetJid(to: string): string {
    let targetJid = to.trim();
    if (!targetJid.includes('@')) {
      targetJid = `${targetJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    } else if (targetJid.endsWith('@c.us')) {
      targetJid = targetJid.replace('@c.us', '@s.whatsapp.net');
    }
    return targetJid;
  }

  public async initialize(userId: string): Promise<void> {
    const state = this.getSessionState(userId);

    if (state.isInitializing || (state.client && state.status === 'CONNECTED')) {
      console.log(`[Baileys] Client for user ${userId} is already running or initializing.`);
      return;
    }

    state.isInitializing = true;
    this.updateStatus(userId, 'INITIALIZING');

    console.log(`[Baileys] Initializing WebSocket engine for user ${userId}...`);

    try {
      // Hentikan instance lama jika ada
      if (state.client) {
        try {
          state.client.end(new Error('Re-initializing session'));
        } catch {
          // ignore
        }
        state.client = null;
      }

      const userAuthDir = path.join(this.authDataDir, `session-user_${userId}`);
      if (!fs.existsSync(userAuthDir)) {
        fs.mkdirSync(userAuthDir, { recursive: true });
      }

      const { state: authState, saveCreds } = await useMultiFileAuthState(userAuthDir);
      const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

      const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }) as any,
        printQRInTerminal: false,
        auth: authState,
        browser: ['Artemis CS Agent', 'Desktop', '1.0.0'],
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
      });

      state.client = sock;

      // Event simpan kredensial auth
      sock.ev.on('creds.update', saveCreds);

      // Event update koneksi (QR, Connected, Disconnected)
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Penerimaan QR Code
        if (qr) {
          console.log(`[Baileys] QR Code received for user ${userId}`);
          try {
            const qrDataUrl = await qrcode.toDataURL(qr, { margin: 2, scale: 6 });
            this.updateStatus(userId, 'QR_READY', qrDataUrl);
          } catch {
            this.updateStatus(userId, 'QR_READY', qr);
          }
        }

        if (connection === 'connecting') {
          this.updateStatus(userId, 'INITIALIZING');
        } else if (connection === 'open') {
          console.log(`[Baileys User ${userId}] WhatsApp Connected / READY!`);
          let connectedNumber = 'Connected';
          try {
            const userJid = sock.user?.id;
            if (userJid) {
              const clean = userJid.split(':')[0].split('@')[0];
              connectedNumber = `+${clean}`;
            }
          } catch {
            connectedNumber = 'Connected';
          }

          state.connectedNumber = connectedNumber;
          state.isInitializing = false;
          this.updateStatus(userId, 'CONNECTED', null);

          // Simpan nomor terhubung ke database Neon PostgreSQL
          await prisma.user
            .update({
              where: { id: userId },
              data: { waConnectedNumber: connectedNumber },
            })
            .catch(() => {});
        } else if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          console.log(
            `[Baileys User ${userId}] Connection closed (statusCode: ${statusCode}, isLoggedOut: ${isLoggedOut})`
          );

          state.client = null;
          state.isInitializing = false;

          if (isLoggedOut) {
            await this.logout(userId);
          } else {
            // Reconnect otomatis jika koneksi terputus sesaat
            this.updateStatus(userId, 'INITIALIZING', null);
            setTimeout(() => {
              this.initialize(userId).catch((err) => {
                console.error(`[Baileys Reconnect Error user ${userId}]:`, err);
              });
            }, 3000);
          }
        }
      });

      // Event pesan WhatsApp masuk
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
          try {
            if (!msg.message) continue;
            if (msg.key.fromMe) continue;

            const senderJid = msg.key.remoteJid;
            if (!senderJid) continue;

            // Abaikan grup (@g.us), status/broadcast, dan newsletter
            if (
              senderJid.endsWith('@g.us') ||
              senderJid === 'status@broadcast' ||
              senderJid.endsWith('@newsletter')
            ) {
              continue;
            }

            // Ekstrak teks pesan
            const text =
              msg.message.conversation ||
              msg.message.extendedTextMessage?.text ||
              msg.message.imageMessage?.caption ||
              msg.message.videoMessage?.caption ||
              msg.message.documentMessage?.caption ||
              '';

            if (!text.trim()) continue;

            console.log(
              `[Baileys User ${userId}] Message from ${msg.pushName || senderJid}: ${text}`
            );

            // Adaptasi pesan ke format chat.service.ts
            const adaptedMessage = {
              id: msg.key.id,
              from: senderJid,
              fromMe: false,
              body: text,
              sender: {
                pushname: msg.pushName || null,
              },
              notifyName: msg.pushName || null,
              raw: msg,
            };

            if (this.onMessageCallback) {
              await this.onMessageCallback(userId, adaptedMessage);
            }
          } catch (err) {
            console.error(`[Baileys onMessage Error user ${userId}]:`, err);
          }
        }
      });
    } catch (error: any) {
      console.error(`[Baileys Initialization Error user ${userId}]:`, error);
      this.updateStatus(userId, 'ERROR');
    } finally {
      state.isInitializing = false;
    }
  }

  public async sendMessage(userId: string, to: string, text: string): Promise<boolean> {
    const state = this.getSessionState(userId);
    if (!state.client || state.status !== 'CONNECTED') {
      console.warn(`[Baileys] Cannot send message: client for user ${userId} is not connected.`);
      return false;
    }

    try {
      const targetJid = this.formatTargetJid(to);

      // Simulasi status mengetik (Anti-Ban Safety)
      await state.client.presenceSubscribe(targetJid).catch(() => {});
      await state.client.sendPresenceUpdate('composing', targetJid).catch(() => {});
      const delay = Math.floor(Math.random() * 700) + 800;
      await new Promise((resolve) => setTimeout(resolve, delay));
      await state.client.sendPresenceUpdate('paused', targetJid).catch(() => {});

      await state.client.sendMessage(targetJid, { text });
      return true;
    } catch (error) {
      console.error(`[Baileys Send Message Error for user ${userId} to ${to}]:`, error);
      return false;
    }
  }

  public async sendImage(
    userId: string,
    to: string,
    filePathOrData: string,
    filename: string,
    caption?: string
  ): Promise<boolean> {
    const state = this.getSessionState(userId);
    if (!state.client || state.status !== 'CONNECTED') {
      console.warn(`[Baileys] Cannot send image: client for user ${userId} is not connected.`);
      return false;
    }

    try {
      const targetJid = this.formatTargetJid(to);
      let imageBuffer: Buffer;

      if (fs.existsSync(filePathOrData)) {
        imageBuffer = fs.readFileSync(filePathOrData);
      } else if (filePathOrData.startsWith('data:')) {
        const matches = filePathOrData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          imageBuffer = Buffer.from(matches[2], 'base64');
        } else {
          return false;
        }
      } else {
        return false;
      }

      await state.client.sendMessage(targetJid, {
        image: imageBuffer,
        caption: caption || '',
        fileName: filename,
      });
      return true;
    } catch (error) {
      console.error(`[Baileys Send Image Error for user ${userId} to ${to}]:`, error);
      return false;
    }
  }

  public async sendFile(
    userId: string,
    to: string,
    filePathOrData: string,
    filename: string,
    caption?: string
  ): Promise<boolean> {
    const state = this.getSessionState(userId);
    if (!state.client || state.status !== 'CONNECTED') {
      console.warn(`[Baileys] Cannot send file: client for user ${userId} is not connected.`);
      return false;
    }

    try {
      const targetJid = this.formatTargetJid(to);
      let fileBuffer: Buffer;
      let detectedMime = 'application/octet-stream';

      if (fs.existsSync(filePathOrData)) {
        fileBuffer = fs.readFileSync(filePathOrData);
      } else if (filePathOrData.startsWith('data:')) {
        const matches = filePathOrData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          detectedMime = matches[1];
          fileBuffer = Buffer.from(matches[2], 'base64');
        } else {
          return false;
        }
      } else {
        return false;
      }

      const ext = path.extname(filename).toLowerCase();
      if (ext === '.pdf') detectedMime = 'application/pdf';
      else if (ext === '.doc') detectedMime = 'application/msword';
      else if (ext === '.docx')
        detectedMime =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === '.txt') detectedMime = 'text/plain';

      await state.client.sendMessage(targetJid, {
        document: fileBuffer,
        mimetype: detectedMime,
        fileName: filename,
        caption: caption || '',
      });
      return true;
    } catch (error) {
      console.error(`[Baileys Send File Error for user ${userId} to ${to}]:`, error);
      return false;
    }
  }

  public async restart(userId: string): Promise<void> {
    const state = this.getSessionState(userId);
    if (state.client) {
      try {
        state.client.end(new Error('Manual Restart'));
      } catch {
        // ignore
      }
      state.client = null;
    }
    state.isInitializing = false;
    await this.initialize(userId);
  }

  public async logout(userId: string): Promise<void> {
    const state = this.getSessionState(userId);
    try {
      if (state.client) {
        await state.client.logout().catch(() => {});
        state.client = null;
      }
    } catch (err) {
      console.error(`[Baileys] Error logging out user ${userId}:`, err);
    }

    // Hapus direktori autentikasi sesi user
    const userAuthDir = path.join(this.authDataDir, `session-user_${userId}`);
    if (fs.existsSync(userAuthDir)) {
      try {
        fs.rmSync(userAuthDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }

    state.connectedNumber = null;
    state.client = null;
    state.isInitializing = false;
    this.updateStatus(userId, 'DISCONNECTED', null);

    await prisma.user
      .update({
        where: { id: userId },
        data: { waConnectedNumber: null },
      })
      .catch(() => {});
  }
}

export const whatsappService = WhatsAppService.getInstance();
export const openWAService = whatsappService;
