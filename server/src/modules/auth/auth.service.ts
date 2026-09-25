import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../shared/database/prisma';
import { config } from '../../config';

export class AuthService {
  public static async login(identifierInput: string, passwordInput: string) {
    const identifier = (identifierInput || '').trim();
    const password = passwordInput;

    if (!identifier || !password) {
      throw { status: 400, message: 'Email atau username dan password wajib diisi' };
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { username: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      throw { status: 401, message: 'Email/Username atau password salah' };
    }

    if (user.deletedAt) {
      throw {
        status: 401,
        message: 'Akun ini telah dinonaktifkan. Silakan hubungi Administrator.',
      };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw { status: 401, message: 'Email/Username atau password salah' };
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        tokenVersion: user.tokenVersion,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const isExpired =
      user.role === 'USER' && user.activeUntil ? new Date(user.activeUntil) < new Date() : false;

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        activeUntil: user.activeUntil,
        isExpired,
      },
    };
  }

  public static async getProfile(user: any) {
    const isExpired =
      user.role === 'USER' && user.activeUntil ? new Date(user.activeUntil) < new Date() : false;

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      activeUntil: user.activeUntil,
      isExpired,
      waConnectedNumber: user.waConnectedNumber,
      createdAt: user.createdAt,
    };
  }

  public static async updateProfile(
    userId: string,
    body: {
      name?: string;
      username?: string;
      currentPassword?: string;
      newPassword?: string;
    }
  ) {
    const { name, username, currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw { status: 404, message: 'Pengguna tidak ditemukan' };
    }

    const updateData: any = {};

    // 1. Validasi & update nama
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName || trimmedName.length < 2) {
        throw { status: 400, message: 'Nama minimal 2 karakter' };
      }
      updateData.name = trimmedName;
    }

    // 2. Validasi & update username jika diisi
    if (username !== undefined) {
      const cleanUsername = String(username).trim().toLowerCase().replace(/^@+/, '');
      if (cleanUsername) {
        if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(cleanUsername)) {
          throw {
            status: 400,
            message: 'Username hanya boleh huruf, angka, titik, underscore, strip (3-30 karakter)',
          };
        }

        if (cleanUsername !== user.username) {
          const existing = await prisma.user.findFirst({
            where: {
              username: { equals: cleanUsername, mode: 'insensitive' },
              id: { not: userId },
            },
          });
          if (existing) {
            throw {
              status: 400,
              message: `Username "${cleanUsername}" sudah digunakan oleh akun lain`,
            };
          }
          updateData.username = cleanUsername;
        }
      }
    }

    // 3. Update password jika diminta
    if (newPassword) {
      if (!currentPassword) {
        throw {
          status: 400,
          message: 'Kata sandi saat ini wajib diisi untuk mengubah kata sandi',
        };
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw {
          status: 400,
          message: 'Kata sandi saat ini tidak cocok / salah',
        };
      }

      if (String(newPassword).length < 6) {
        throw {
          status: 400,
          message: 'Kata sandi baru minimal 6 karakter',
        };
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        waConnectedNumber: true,
        createdAt: true,
      },
    });

    return updatedUser;
  }
}
