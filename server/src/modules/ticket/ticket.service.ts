import { prisma } from '../../shared/database/prisma';

export class TicketService {
  public static async getTickets(
    user: any,
    query: { status?: string; search?: string }
  ) {
    const { status, search } = query;
    const where: any = {};

    // Jika bukan Admin, hanya tampilkan tiket miliknya sendiri
    if (user.role !== 'ADMIN') {
      where.userId = user.id;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    return await prisma.ticket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            activeUntil: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  public static async createTicket(
    user: any,
    body: {
      subject: string;
      category?: string;
      message: string;
      priority?: string;
    }
  ) {
    const { subject, category, message, priority } = body;

    if (!subject || !subject.trim()) {
      throw { status: 400, message: 'Subjek tiket wajib diisi' };
    }
    if (!message || !message.trim()) {
      throw { status: 400, message: 'Pesan kendala wajib diisi' };
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const ticketNumber = `TIK-${randomSuffix}`;

    return await prisma.ticket.create({
      data: {
        ticketNumber,
        userId: user.id,
        subject: subject.trim(),
        category: category || 'BANTUAN',
        priority: priority || 'MEDIUM',
        status: 'OPEN',
        messages: {
          create: {
            senderId: user.id,
            senderName: user.name,
            senderRole: user.role,
            message: message.trim(),
          },
        },
      },
      include: {
        messages: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  public static async getTicketDetail(id: string, user: any) {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            activeUntil: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw { status: 404, message: 'Tiket tidak ditemukan' };
    }

    if (user.role !== 'ADMIN' && ticket.userId !== user.id) {
      throw { status: 403, message: 'Akses ditolak' };
    }

    return ticket;
  }

  public static async replyTicket(id: string, user: any, message: string) {
    if (!message || !message.trim()) {
      throw { status: 400, message: 'Pesan balasan wajib diisi' };
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });

    if (!ticket) {
      throw { status: 404, message: 'Tiket tidak ditemukan' };
    }

    if (user.role !== 'ADMIN' && ticket.userId !== user.id) {
      throw { status: 403, message: 'Akses ditolak' };
    }

    let newStatus = ticket.status;
    if (user.role === 'ADMIN' && ticket.status === 'OPEN') {
      newStatus = 'IN_PROGRESS';
    }

    const [newMessage, updatedTicket] = await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: user.id,
          senderName: user.name,
          senderRole: user.role,
          message: message.trim(),
        },
      }),
      prisma.ticket.update({
        where: { id },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      }),
    ]);

    return {
      message: newMessage,
      ticketStatus: updatedTicket.status,
    };
  }

  public static async updateTicketStatus(id: string, user: any, status: string) {
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!status || !validStatuses.includes(status)) {
      throw {
        status: 400,
        message: 'Status tidak valid (pilih: OPEN, IN_PROGRESS, RESOLVED, atau CLOSED)',
      };
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw { status: 404, message: 'Tiket tidak ditemukan' };
    }

    if (user.role !== 'ADMIN' && ticket.userId !== user.id) {
      throw { status: 403, message: 'Akses ditolak' };
    }

    return await prisma.ticket.update({
      where: { id },
      data: { status: status as any },
    });
  }
}
