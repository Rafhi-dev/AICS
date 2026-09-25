import { prisma } from '../../shared/database/prisma';

export class KnowledgeService {
  public static async getKnowledgeItems(userId: string, isAdmin: boolean, queryUserId?: string) {
    let targetUserId = userId;
    if (isAdmin && queryUserId) {
      targetUserId = String(queryUserId);
    }

    return await prisma.knowledgeItem.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public static async createKnowledgeItem(
    userId: string,
    isAdmin: boolean,
    body: {
      userId?: string;
      category?: string;
      question: string;
      answer: string;
      isActive?: boolean;
    }
  ) {
    let targetUserId = userId;
    if (isAdmin && body.userId) {
      targetUserId = String(body.userId);
    }

    const { category, question, answer, isActive } = body;
    if (!question || !answer) {
      throw { status: 400, message: 'Pertanyaan dan jawaban wajib diisi' };
    }

    return await prisma.knowledgeItem.create({
      data: {
        userId: targetUserId,
        category: category || 'Umum',
        question: question.trim(),
        answer: answer.trim(),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
  }

  public static async updateKnowledgeItem(
    id: string,
    userId: string,
    isAdmin: boolean,
    body: {
      category?: string;
      question?: string;
      answer?: string;
      isActive?: boolean;
    }
  ) {
    const whereClause: any = { id };
    if (!isAdmin) {
      whereClause.userId = userId;
    }

    const existing = await prisma.knowledgeItem.findFirst({
      where: whereClause,
    });
    if (!existing) {
      throw { status: 404, message: 'Item FAQ tidak ditemukan' };
    }

    const { category, question, answer, isActive } = body;

    return await prisma.knowledgeItem.update({
      where: { id },
      data: {
        category: category !== undefined ? category : undefined,
        question: question !== undefined ? question.trim() : undefined,
        answer: answer !== undefined ? answer.trim() : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });
  }

  public static async deleteKnowledgeItem(id: string, userId: string, isAdmin: boolean) {
    const whereClause: any = { id };
    if (!isAdmin) {
      whereClause.userId = userId;
    }

    const existing = await prisma.knowledgeItem.findFirst({
      where: whereClause,
    });
    if (!existing) {
      throw { status: 404, message: 'Item FAQ tidak ditemukan' };
    }

    await prisma.knowledgeItem.delete({
      where: { id },
    });

    return true;
  }
}
