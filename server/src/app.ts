import express from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes';
import chatRoutes from './modules/chat/chat.routes';
import botConfigRoutes from './modules/bot-config/bot-config.routes';
import knowledgeRoutes from './modules/knowledge/knowledge.routes';
import documentRoutes from './modules/document/document.routes';
import ticketRoutes from './modules/ticket/ticket.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Sajikan folder uploads untuk preview gambar dan dokumen
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Daftarkan Routes Modul
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wa', whatsappRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/config', botConfigRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/tickets', ticketRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'AICS Backend API is running', health: '/api/health' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { app };
