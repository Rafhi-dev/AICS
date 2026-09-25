import { prisma } from '../database/prisma';

/**
 * Generate unique username with format:
 * - USER: user<randomCode> (e.g. user8492)
 * - ADMIN: admin<randomCode> (e.g. admin1920)
 */
export async function generateUniqueUsername(role: 'ADMIN' | 'USER'): Promise<string> {
  const prefix = role === 'ADMIN' ? 'admin' : 'user';

  for (let i = 0; i < 50; i++) {
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    const candidate = `${prefix}${randomCode}`;

    const exists = await prisma.user.findFirst({
      where: {
        username: {
          equals: candidate,
          mode: 'insensitive',
        },
      },
    });

    if (!exists) {
      return candidate;
    }
  }

  return `${prefix}${Date.now().toString().slice(-4)}`;
}
