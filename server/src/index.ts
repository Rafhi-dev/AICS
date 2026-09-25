import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import bcrypt from 'bcryptjs';
import { config } from './config';
import { prisma } from './shared/database/prisma';
import { whatsappService } from './modules/whatsapp/whatsapp.service';
import { chatService } from './modules/chat/chat.service';
import { app } from './app';

const server = http.createServer(app);

// Inisialisasi Socket.IO instance
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

// Hubungkan Socket.IO ke service
whatsappService.setSocketServer(io);
chatService.setSocketServer(io);

// Sambungkan incoming message WhatsApp ke ChatService dengan userId
whatsappService.setOnMessageHandler(async (userId, msg) => {
  await chatService.handleIncomingMessage(userId, msg);
});

// Socket.IO event handler dengan user room
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Klien bergabung ke room khusus user setelah login
  socket.on('join_user', (userId: string) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`[Socket.io] Socket ${socket.id} joined room user_${userId}`);
      // Kirim status WA terkini khusus user tersebut
      socket.emit('wa_status', whatsappService.getStatus(userId));
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

server.listen(config.port, '0.0.0.0', async () => {
  console.log(`🚀 WA CS Agent Server is running on http://localhost:${config.port}`);

  try {
    // Verifikasi koneksi database Neon
    await prisma.$connect();
    console.log('✅ Connected to Neon PostgreSQL database successfully.');

    // Seed default Admin account jika belum ada
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = await prisma.user.create({
        data: {
          name: 'Super Administrator',
          email: 'admin@wa-agent.local',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      await prisma.botConfig
        .create({
          data: {
            userId: admin.id,
            businessName: 'Agent AI Master',
            systemPrompt:
              'Anda adalah Asisten Customer Service (CS) AI yang ramah, profesional, sopan, dan sangat membantu.',
          },
        })
        .catch(() => {});

      console.log('🌱 Super Admin account created: admin@wa-agent.local / admin123');
    }

    // Auto-restore sesi WhatsApp untuk user yang sebelumnya terhubung
    const connectedUsers = await prisma.user.findMany({
      where: {
        waConnectedNumber: { not: null },
        deletedAt: null,
      },
    });

    for (const u of connectedUsers) {
      console.log(`⏳ Restoring WhatsApp session for user: ${u.name} (${u.email})`);
      whatsappService.initialize(u.id).catch((err) => {
        console.warn(`Could not restore session for user ${u.id}:`, err.message);
      });
    }
  } catch (dbErr) {
    console.error('⚠️ Database startup notice:', dbErr);
  }
});
