import React, { useState, useEffect } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { api } from '../lib/api';
import {
  User,
  AtSign,
  Mail,
  KeyRound,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';

export interface ProfileUserData {
  id: string;
  name: string;
  username?: string | null;
  email: string;
  role: 'ADMIN' | 'USER';
}

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: ProfileUserData | null;
  onProfileUpdated: (updatedUser: ProfileUserData) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  open,
  onOpenChange,
  currentUser,
  onProfileUpdated,
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser && open) {
      setName(currentUser.name || '');
      setUsername(currentUser.username || '');
      setChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(null);
    }
  }, [currentUser, open]);

  if (!currentUser) return null;

  // Inisial untuk avatar
  const initials = (name || currentUser.name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isAdmin = currentUser.role === 'ADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Nama lengkap tidak boleh kosong');
      return;
    }

    if (changePassword) {
      if (!currentPassword) {
        setError('Masukkan kata sandi saat ini untuk melanjutkan perubahan');
        return;
      }
      if (newPassword.length < 6) {
        setError('Kata sandi baru minimal 6 karakter');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Konfirmasi kata sandi baru tidak cocok');
        return;
      }
    }

    setLoading(true);

    try {
      const payload: any = {
        name: name.trim(),
        username: username.trim() || undefined,
      };

      if (changePassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await api.put('/auth/profile', payload);

      if (res.data.success && res.data.data) {
        setSuccess('Profil berhasil diperbarui!');
        onProfileUpdated(res.data.data);

        setTimeout(() => {
          onOpenChange(false);
        }, 1200);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Gagal memperbarui profil. Silakan coba lagi.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4">
        {/* Header Profile */}
        <div className="flex items-center space-x-3.5 pb-3 border-b border-slate-100">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white font-bold text-base shadow-md ${
              isAdmin
                ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-500/25'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/25'
            }`}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 truncate">
                Edit Profil Pengguna
              </h2>
              <Badge
                variant={isAdmin ? 'default' : 'success'}
                className={`text-[10px] font-semibold py-0.5 px-2 ${
                  isAdmin ? 'bg-indigo-600 text-white border-transparent' : ''
                }`}
              >
                {isAdmin ? 'Super Admin' : 'Pengguna'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
          </div>
        </div>

        {/* Feedback Alert */}
        {error && (
          <div className="flex items-start space-x-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center space-x-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Email (Readonly) */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Alamat Email (Akun)
            </label>
            <div className="relative">
              <Input
                type="email"
                value={currentUser.email}
                disabled
                className="bg-slate-50 text-slate-500 cursor-not-allowed pl-8"
              />
              <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Email terdaftar di sistem. Hubungi administrator jika perlu pergantian email.
            </span>
          </div>

          {/* Nama Lengkap */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Nama Lengkap / Perusahaan <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Anda atau Nama Bisnis"
                required
                className="pl-8"
              />
              <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Username <span className="text-slate-400 font-normal">(bisa dipakai untuk login)</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="username_anda"
                className="pl-8"
              />
              <AtSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Gunakan huruf kecil, angka, titik, atau garis bawah (3-30 karakter).
            </span>
          </div>

          {/* Toggle Ubah Password */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setChangePassword(!changePassword)}
              className="flex items-center space-x-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors focus:outline-none"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>{changePassword ? 'Batalkan Ubah Kata Sandi' : 'Ingin Ubah Kata Sandi?'}</span>
            </button>

            {changePassword && (
              <div className="mt-3 space-y-2.5 rounded-lg bg-slate-50 p-3 border border-slate-200 animate-in fade-in-0 duration-200">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Kata Sandi Saat Ini <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan kata sandi lama Anda"
                      className="pl-8 bg-white"
                    />
                    <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Kata Sandi Baru <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="pl-8 bg-white"
                    />
                    <KeyRound className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Konfirmasi Kata Sandi Baru <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      className="pl-8 bg-white"
                    />
                    <KeyRound className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs h-8 px-3"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="text-xs h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};
