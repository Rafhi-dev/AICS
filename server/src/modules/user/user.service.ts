import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../shared/database/prisma';
import { config } from '../../config';
import { whatsappService as openWAService } from '../whatsapp/whatsapp.service';
import { generateUniqueUsername } from '../../shared/utils/username';

export class UserService {
  public static async getUsers(isAudit: boolean) {
    const users = await prisma.user.findMany({
      where: isAudit ? { deletedAt: { not: null } } : { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        tokenVersion: true,
        waConnectedNumber: true,
        activeUntil: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            conversations: true,
            documents: true,
            knowledgeItems: true,
          },
        },
      },
    });

    return users.map((u) => {
      const waInfo = openWAService.getStatus(u.id);
      const isExpired =
        u.role === 'USER' && u.activeUntil ? new Date(u.activeUntil) < new Date() : false;

      return {
        ...u,
        isExpired,
        waLiveStatus: waInfo.status,
        waConnectedNumber: waInfo.connectedNumber || u.waConnectedNumber,
      };
    });
  }

  public static async createUser(body: {
    name: string;
    email: string;
    password: string;
    role?: string;
    username?: string;
    activeUntil?: string;
  }) {
    const { name, email, password, role, username } = body;

    if (!name || !email || !password) {
      throw { status: 400, message: 'Nama, email, dan password wajib diisi' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingEmail = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingEmail) {
      throw { status: 400, message: 'Email sudah terdaftar' };
    }

    const userRole = role === 'ADMIN' ? 'ADMIN' : 'USER';

    let finalUsername = '';
    if (username && typeof username === 'string' && username.trim().length > 0) {
      finalUsername = username.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(finalUsername)) {
        throw {
          status: 400,
          message:
            'Username hanya boleh berisi huruf, angka, underscore (_), atau strip (-) minimal 3 karakter.',
        };
      }

      const existingUsername = await prisma.user.findFirst({
        where: {
          username: { equals: finalUsername, mode: 'insensitive' },
        },
      });

      if (existingUsername) {
        throw {
          status: 400,
          message: `Username "${finalUsername}" sudah digunakan oleh akun lain.`,
        };
      }
    } else {
      finalUsername = await generateUniqueUsername(userRole);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let initialActiveUntil: Date | null = null;
    if (userRole === 'USER') {
      if (body.activeUntil) {
        initialActiveUntil = new Date(body.activeUntil);
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        initialActiveUntil = d;
      }
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        username: finalUsername,
        email: cleanEmail,
        password: hashedPassword,
        role: userRole,
        activeUntil: initialActiveUntil,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        activeUntil: true,
        createdAt: true,
      },
    });

    await prisma.botConfig
      .create({
        data: {
          userId: user.id,
          businessName: user.name,
        },
      })
      .catch(() => {});

    return user;
  }

  public static async updateUser(
    id: string,
    body: {
      name?: string;
      email?: string;
      username?: string;
      role?: string;
      password?: string;
    }
  ) {
    const { name, email, username, role, password } = body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw { status: 404, message: 'Pengguna tidak ditemukan' };
    }

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name.trim();

    if (email && email.trim().toLowerCase() !== existingUser.email.toLowerCase()) {
      const cleanEmail = email.trim().toLowerCase();
      const duplicateEmail = await prisma.user.findFirst({
        where: {
          email: cleanEmail,
          id: { not: id },
        },
      });
      if (duplicateEmail) {
        throw {
          status: 400,
          message: `Email "${cleanEmail}" sudah digunakan oleh akun lain.`,
        };
      }
      dataToUpdate.email = cleanEmail;
    }

    if (username && username.trim().toLowerCase() !== (existingUser.username || '').toLowerCase()) {
      const cleanUsername = username.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(cleanUsername)) {
        throw {
          status: 400,
          message:
            'Username hanya boleh berisi huruf, angka, underscore (_), atau strip (-) minimal 3 karakter.',
        };
      }

      const duplicateUsername = await prisma.user.findFirst({
        where: {
          username: { equals: cleanUsername, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (duplicateUsername) {
        throw {
          status: 400,
          message: `Username "${cleanUsername}" sudah digunakan oleh akun lain.`,
        };
      }
      dataToUpdate.username = cleanUsername;
    }

    if (role && (role === 'ADMIN' || role === 'USER')) dataToUpdate.role = role;

    if (password && password.trim().length >= 6) {
      dataToUpdate.password = await bcrypt.hash(password.trim(), 10);
      dataToUpdate.tokenVersion = { increment: 1 };
    }

    return await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  public static async softDeleteUser(id: string, currentAdminId: string) {
    if (currentAdminId === id) {
      throw { status: 400, message: 'Anda tidak dapat menghapus akun Anda sendiri.' };
    }

    const now = new Date();
    const user = await prisma.user.update({
      where: { id },
      data: {
        deletedAt: now,
        tokenVersion: { increment: 1 },
      },
    });

    await openWAService.logout(id);
    return user;
  }

  public static async restoreUser(id: string) {
    return await prisma.user.update({
      where: { id },
      data: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  public static async emergencyTerminate(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw { status: 404, message: 'Pengguna tidak ditemukan' };
    }

    await prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });

    await openWAService.logout(id);
    return user;
  }

  public static async impersonateUser(id: string, adminId: string) {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw { status: 404, message: 'Pengguna target tidak ditemukan' };
    }

    if (targetUser.deletedAt) {
      throw {
        status: 400,
        message: 'Tidak dapat meng-impersonate akun yang telah dinonaktifkan (soft delete)',
      };
    }

    const token = jwt.sign(
      {
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        tokenVersion: targetUser.tokenVersion,
        isImpersonated: true,
        impersonatedBy: adminId,
      },
      config.jwtSecret,
      { expiresIn: '1d' }
    );

    return {
      token,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
      },
    };
  }

  public static async updateSubscription(id: string, body: any) {
    const daysToAdd = body.daysToAdd ?? body.days;
    const activeUntil = body.activeUntil ?? body.customDate;
    const unlimited = body.unlimited ?? body.isUnlimited;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw { status: 404, message: 'Pengguna tidak ditemukan' };
    }

    let newActiveUntil: Date | null = null;

    if (unlimited === true) {
      newActiveUntil = null;
    } else if (activeUntil) {
      newActiveUntil = new Date(activeUntil);
    } else if (daysToAdd !== undefined && daysToAdd !== null) {
      const days = Number(daysToAdd);
      const baseDate =
        user.activeUntil && new Date(user.activeUntil) > new Date()
          ? new Date(user.activeUntil)
          : new Date();
      baseDate.setDate(baseDate.getDate() + days);
      newActiveUntil = baseDate;
    } else {
      throw {
        status: 400,
        message: 'Tentukan daysToAdd, activeUntil, atau flag unlimited',
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { activeUntil: newActiveUntil },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        activeUntil: true,
      },
    });

    const isExpired =
      updatedUser.role === 'USER' && updatedUser.activeUntil
        ? new Date(updatedUser.activeUntil) < new Date()
        : false;

    return {
      ...updatedUser,
      isExpired,
    };
  }
}
