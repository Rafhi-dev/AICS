import { Request, Response, NextFunction } from 'express';
import { expressjwt } from 'express-jwt';
import { config } from '../../config';
import { prisma } from '../database/prisma';

// Extend Express Request interface to include user & auth
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email: string;
        role: string;
        tokenVersion: number;
      };
      user?: any;
    }
  }
}

// 1. JWT verification middleware using express-jwt
export const verifyJwt = expressjwt({
  secret: config.jwtSecret,
  algorithms: ['HS256'],
  requestProperty: 'auth',
});

// 2. Middleware to validate user status (soft-delete, tokenVersion invalidation)
export const validateUserSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ success: false, error: 'Autentikasi diperlukan' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Pengguna tidak ditemukan' });
    }

    // Jika akun di-soft delete
    if (user.deletedAt) {
      return res.status(401).json({
        success: false,
        error: 'Akun ini telah dinonaktifkan. Silakan hubungi Administrator.',
      });
    }

    // Pengecekan Emergency Terminate / Token Invalidation
    if (user.tokenVersion !== req.auth.tokenVersion) {
      return res.status(401).json({
        success: false,
        error: 'Sesi Anda telah diputus oleh Administrator untuk keamanan. Silakan login kembali.',
      });
    }

    req.user = user;
    next();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Gabungan middleware proteksi auth
export const requireAuth = [verifyJwt, validateUserSession];

// 3. Role Guard: Khusus Admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Akses ditolak: Fitur ini hanya dapat diakses oleh Administrator.',
    });
  }
  next();
};

// 4. Subscription Guard: Memeriksa apakah masa aktif akun pengguna masih berlaku
export const requireActiveSubscription = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Autentikasi diperlukan' });
  }

  // Admin bebas akses selamanya
  if (user.role === 'ADMIN') {
    return next();
  }

  // Jika user biasa dan masa aktifnya sudah kedaluwarsa
  if (user.activeUntil && new Date(user.activeUntil) < new Date()) {
    return res.status(403).json({
      success: false,
      isExpired: true,
      error:
        'Masa aktif akun Anda telah berakhir. Silakan hubungi Administrator atau kirim tiket bantuan untuk memperpanjang masa aktif akun.',
    });
  }

  next();
};

// Gabungan auth + subscription aktif
export const requireActiveUser = [...requireAuth, requireActiveSubscription];
