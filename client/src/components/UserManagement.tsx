import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Dialog } from './ui/Dialog';
import {
  Users,
  UserPlus,
  Trash2,
  RotateCcw,
  Edit2,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  MessageSquare,
  FileText,
  HelpCircle,
  ShieldCheck,
  KeyRound,
  Eye,
  Calendar,
  Clock,
} from 'lucide-react';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface UserItem {
  id: string;
  name: string;
  username?: string | null;
  email: string;
  role: 'ADMIN' | 'USER';
  tokenVersion: number;
  waConnectedNumber: string | null;
  waLiveStatus?: string;
  activeUntil?: string | null;
  isExpired?: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    conversations: number;
    documents: number;
    knowledgeItems: number;
  };
}

interface UserManagementProps {
  onImpersonate?: (token: string, user: any) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onImpersonate }) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuditTab, setIsAuditTab] = useState(false);
  const [search, setSearch] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [impersonateUser, setImpersonateUser] = useState<UserItem | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [subUser, setSubUser] = useState<UserItem | null>(null);

  // Subscription Form State
  const [subDays, setSubDays] = useState<number>(30);
  const [subMode, setSubMode] = useState<'days' | 'unlimited' | 'date'>('days');
  const [subCustomDate, setSubCustomDate] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'USER' as 'USER' | 'ADMIN',
  });
  const [editData, setEditData] = useState({
    name: '',
    username: '',
    email: '',
    role: 'USER' as 'USER' | 'ADMIN',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchUsers = async (audit = isAuditTab) => {
    try {
      setLoading(true);
      const res = await api.get(`/users?audit=${audit}`);
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(isAuditTab);
  }, [isAuditTab]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'USER',
    });
    setAddModalOpen(true);
  };

  const handleOpenEdit = (user: UserItem) => {
    setSelectedUser(user);
    setEditData({
      name: user.name,
      username: user.username || '',
      email: user.email,
      role: user.role,
      password: '',
    });
    setEditModalOpen(true);
  };

  const handleOpenTerminate = (user: UserItem) => {
    setSelectedUser(user);
    setTerminateModalOpen(true);
  };

  const handleOpenSubscription = (user: UserItem) => {
    setSubUser(user);
    setSubDays(30);
    setSubMode('days');
    setSubCustomDate('');
    setSubModalOpen(true);
  };

  const handleSaveSubscription = async () => {
    if (!subUser) return;
    try {
      setSubmitting(true);
      const payload: any = {};
      if (subMode === 'unlimited') {
        payload.isUnlimited = true;
      } else if (subMode === 'date') {
        if (!subCustomDate) {
          setErrorMsg('Silakan tentukan tanggal kedaluwarsa.');
          setSubmitting(false);
          return;
        }
        payload.customDate = subCustomDate;
      } else {
        payload.days = Number(subDays) || 30;
      }

      const res = await api.patch(`/users/${subUser.id}/subscription`, payload);
      if (res.data.success) {
        setActionSuccess(`Masa aktif untuk ${subUser.name} berhasil diperbarui!`);
        setTimeout(() => setActionSuccess(null), 4000);
        setSubModalOpen(false);
        fetchUsers();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal memperbarui masa aktif pengguna');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return;

    setSubmitting(true);
    try {
      const res = await api.post('/users', formData);
      if (res.data.success) {
        setAddModalOpen(false);
        setActionSuccess(`Pengguna ${res.data.data.name} berhasil didaftarkan!`);
        setTimeout(() => setActionSuccess(null), 4000);
        fetchUsers();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal menambahkan pengguna');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const res = await api.put(`/users/${selectedUser.id}`, editData);
      if (res.data.success) {
        setEditModalOpen(false);
        setActionSuccess(`Data ${res.data.data.name} berhasil diperbarui!`);
        setTimeout(() => setActionSuccess(null), 4000);
        fetchUsers();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal mengubah data pengguna');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSoftDelete = (user: UserItem) => {
    setDeleteUser(user);
  };

  const handleConfirmSoftDelete = async () => {
    if (!deleteUser) return;
    try {
      setSubmitting(true);
      const res = await api.delete(`/users/${deleteUser.id}`);
      if (res.data.success) {
        setActionSuccess(`Akun ${deleteUser.name} berhasil dinonaktifkan (soft delete).`);
        setTimeout(() => setActionSuccess(null), 4000);
        setDeleteUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal menonaktifkan akun');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async (user: UserItem) => {
    try {
      const res = await api.post(`/users/${user.id}/restore`);
      if (res.data.success) {
        setActionSuccess(`Akun ${user.name} berhasil dipulihkan!`);
        setTimeout(() => setActionSuccess(null), 4000);
        fetchUsers();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal memulihkan akun');
    }
  };

  const handleOpenImpersonate = (user: UserItem) => {
    setImpersonateUser(user);
  };

  const handleConfirmImpersonate = async () => {
    if (!impersonateUser) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/users/${impersonateUser.id}/impersonate`);
      if (res.data.success && res.data.data) {
        if (onImpersonate) {
          onImpersonate(res.data.data.token, res.data.data.user);
        }
      }
      setImpersonateUser(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal meng-impersonate pengguna');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmTerminate = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/users/${selectedUser.id}/terminate`);
      if (res.data.success) {
        setTerminateModalOpen(false);
        setActionSuccess(
          `🚨 Sesi login dan koneksi WhatsApp milik ${selectedUser.name} telah berhasil diputus secara paksa!`
        );
        setTimeout(() => setActionSuccess(null), 6000);
        fetchUsers();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal melakukan terminasi darurat');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
      {/* Banner / Header Card */}
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                  <Users className="h-4 w-4" />
                </span>
                <h2 className="text-lg font-bold text-slate-900">Manajemen Pengguna & Multi-Klien</h2>
                <Badge variant="default" className="text-[10px] bg-indigo-600">
                  Super Admin
                </Badge>
              </div>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Kelola akun klien dan pengguna platform. Setiap akun memiliki nomor WhatsApp mandiri
                yang terpisah, basis data dokumen sendiri, serta fitur keamanan pemutusan darurat (Emergency Terminate) jika terjadi indikasi peretasan.
              </p>
            </div>
            <Button
              onClick={handleOpenAdd}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs shadow-sm whitespace-nowrap self-start md:self-auto"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Tambah Pengguna Baru
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center space-x-2 text-xs text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex rounded-lg bg-slate-100 p-1 w-full sm:w-auto">
          <button
            onClick={() => setIsAuditTab(false)}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              !isAuditTab
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pengguna Aktif
          </button>
          <button
            onClick={() => setIsAuditTab(true)}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              isAuditTab
                ? 'bg-white text-amber-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Arsip Audit (Terhapus)
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-white"
          />
        </div>
      </div>

      {/* User Table Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Nama & Kredensial</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Masa Aktif Akun</th>
                <th className="px-4 py-3">Status WhatsApp Sesi</th>
                <th className="px-4 py-3">Data Tenant</th>
                <th className="px-4 py-3">Terdaftar</th>
                <th className="px-4 py-3 text-right">Aksi & Keamanan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    {isAuditTab
                      ? 'Tidak ada akun pengguna di arsip terhapus.'
                      : 'Belum ada pengguna yang terdaftar.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isConnected = u.waLiveStatus === 'CONNECTED' || !!u.waConnectedNumber;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        u.deletedAt ? 'bg-amber-50/30 opacity-75' : ''
                      }`}
                    >
                      {/* Name & Email & Username */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            @{u.username || '-'}
                          </span>
                          <span className="text-[11px] text-slate-500">{u.email}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        {u.role === 'ADMIN' ? (
                          <Badge variant="default" className="text-[10px] bg-indigo-600">
                            ADMIN
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            USER / KLIEN
                          </Badge>
                        )}
                      </td>

                      {/* Masa Aktif Akun */}
                      <td className="px-4 py-3.5">
                        {u.role === 'ADMIN' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Permanen (Admin)
                          </span>
                        ) : !u.activeUntil ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Selamanya
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {u.isExpired ? (
                              <Badge variant="destructive" className="text-[10px] bg-red-100 text-red-700 border border-red-200 py-0.5">
                                Kedaluwarsa
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 py-0.5">
                                Aktif ({Math.max(0, Math.ceil((new Date(u.activeUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} hari)
                              </Badge>
                            )}
                            <div className="text-[10px] text-slate-500 font-mono">
                              s/d {new Date(u.activeUntil).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenSubscription(u)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline block cursor-pointer"
                            >
                              Atur Masa Aktif
                            </button>
                          </div>
                        )}
                      </td>

                      {/* WhatsApp Session Status */}
                      <td className="px-4 py-3.5">
                        {isConnected ? (
                          <div className="flex items-center space-x-1.5 text-emerald-700">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="font-mono text-[11px] font-semibold">
                              {u.waConnectedNumber || 'Terhubung'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
                            <Smartphone className="h-3 w-3" />
                            <span>Belum Tertaut</span>
                          </div>
                        )}
                      </td>

                      {/* Data counts */}
                      <td className="px-4 py-3.5 text-[11px] text-slate-500">
                        <div className="flex items-center space-x-2">
                          <span title="Percakapan">
                            💬 {u._count?.conversations || 0}
                          </span>
                          <span>•</span>
                          <span title="Dokumen">
                            📄 {u._count?.documents || 0}
                          </span>
                          <span>•</span>
                          <span title="FAQ">
                            ❓ {u._count?.knowledgeItems || 0}
                          </span>
                        </div>
                      </td>

                      {/* Created date */}
                      <td className="px-4 py-3.5 text-[11px] text-slate-500">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {isAuditTab ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(u)}
                              className="text-xs h-7 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Pulihkan
                            </Button>
                          ) : (
                            <>
                              {/* Perpanjang Masa Aktif Button (Khusus User) */}
                              {u.role === 'USER' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenSubscription(u)}
                                  className="text-[11px] h-7 px-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-900 shadow-xs"
                                  title="Atur atau Perpanjang Masa Aktif Akun"
                                >
                                  <Clock className="h-3 w-3 mr-1 text-purple-600" />
                                  Perpanjang
                                </Button>
                              )}

                              {/* Impersonate Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenImpersonate(u)}
                                className="text-[11px] h-7 px-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-900 shadow-xs cursor-pointer"
                                title="Impersonate: Masuk dan lihat dashboard sebagai pengguna ini"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Impersonate
                              </Button>

                              {/* Emergency Terminate Button */}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleOpenTerminate(u)}
                                className="text-[11px] h-7 px-2.5 bg-red-600 hover:bg-red-700 shadow-sm cursor-pointer"
                                title="Putus Sesi Web & Putus Koneksi WA (Jika akun ter-hack)"
                              >
                                <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                                Terminate
                              </Button>

                              {/* Edit Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(u)}
                                className="h-7 w-7 p-0 text-slate-600 cursor-pointer"
                                title="Edit Pengguna"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>

                              {/* Soft Delete Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenSoftDelete(u)}
                                className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Hapus / Nonaktifkan Akun"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Tambah Pengguna Baru */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900">Tambah Akun Klien / Pengguna</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Akun baru akan mendapatkan sesi WhatsApp terisolasi dan database tenant masing-masing.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Klien / Bisnis *</label>
              <Input
                placeholder="Contoh: Toko Barokah / dr. Amanda"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="text-xs h-9"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Username (Opsional)
              </label>
              <Input
                placeholder="Kosongkan jika ingin dibuat otomatis (misal: user7821)"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="text-xs h-9 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Format otomatis: userKodeRand (untuk klien) atau adminKodeRand (untuk admin).
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alamat Email *</label>
              <Input
                type="email"
                placeholder="klien@perusahaan.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="text-xs h-9"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kata Sandi (Password) *</label>
              <Input
                type="password"
                placeholder="Minimal 6 karakter"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="text-xs h-9"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tingkat Hak Akses (Role)</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="USER">User / Klien (Hanya dashboard miliknya sendiri)</option>
                <option value="ADMIN">Administrator (Akses penuh & manajemen user)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddModalOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs text-white"
            >
              {submitting ? 'Menyimpan...' : 'Daftarkan Pengguna'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Edit Pengguna */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900">Ubah Data Pengguna</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ubah nama, username, email, peran hak akses, atau reset kata sandi pengguna.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                required
                className="text-xs h-9"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Username (Login ID)</label>
              <Input
                value={editData.username}
                onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                placeholder="Contoh: user5407 atau toko_sepatu"
                className="text-xs h-9 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Pengguna dapat login menggunakan username ini atau alamat email.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alamat Email *</label>
              <Input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                required
                className="text-xs h-9"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tingkat Hak Akses (Role)</label>
              <select
                value={editData.role}
                onChange={(e) => setEditData({ ...editData, role: e.target.value as any })}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="USER">User / Klien</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reset Kata Sandi Baru (Kosongkan jika tidak ingin diubah)
              </label>
              <Input
                type="password"
                placeholder="Ketik password baru jika ingin mengubah..."
                value={editData.password}
                onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs text-white"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Emergency Terminate Confirmation */}
      <Dialog open={terminateModalOpen} onOpenChange={setTerminateModalOpen}>
        <div className="space-y-4 text-xs text-center sm:text-left">
          <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-red-900">
              Konfirmasi Pemutusan Darurat (Emergency Terminate)
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Tindakan ini ditujukan jika akun pengguna <strong>{selectedUser?.name}</strong>{' '}
              ({selectedUser?.email}) terindikasi <strong>di-hack atau mengalami kebocoran akses</strong>.
            </p>
          </div>

          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-left text-xs text-red-800 space-y-1.5">
            <div className="font-bold flex items-center space-x-1">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>Dampak Tindakan Ini:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-red-700">
              <li>
                <strong>Sesi Web Mati Seketika:</strong> Semua token login di browser/perangkat pelaku langsung dibatalkan (401 Unauthorized).
              </li>
              <li>
                <strong>WhatsApp Terputus:</strong> Sesi WhatsApp milik pengguna ini langsung di-logout paksa dari server agar pelaku tidak bisa membaca atau membalas chat.
              </li>
            </ul>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTerminateModalOpen(false)}
              className="text-xs"
            >
              Batalkan
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={handleConfirmTerminate}
              className="bg-red-600 hover:bg-red-700 text-xs text-white shadow-sm"
            >
              {submitting ? 'Memutuskan Sesi...' : 'Ya, Putus Sesi & WhatsApp Sekarang'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal: Atur & Perpanjang Masa Aktif Akun */}
      <Dialog open={subModalOpen} onOpenChange={setSubModalOpen}>
        <div className="space-y-4 text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Atur Masa Aktif Akun Klien
              </h3>
              <p className="text-xs text-slate-500">
                {subUser?.name} ({subUser?.email})
              </p>
            </div>
          </div>

          {/* Status Masa Aktif Terkini */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
            <div className="text-[11px] text-slate-500 font-medium">Status Masa Aktif Saat Ini:</div>
            {subUser?.role === 'ADMIN' ? (
              <Badge variant="outline" className="text-xs font-semibold text-indigo-700 bg-indigo-50 border-indigo-200">
                Permanen (Super Admin)
              </Badge>
            ) : !subUser?.activeUntil ? (
              <Badge variant="success" className="text-xs font-semibold">
                Aktif Selamanya (Tanpa Batas Waktu)
              </Badge>
            ) : subUser?.isExpired ? (
              <div className="flex items-center space-x-2">
                <Badge variant="destructive" className="text-xs font-semibold bg-red-100 text-red-700 border-red-200">
                  Kedaluwarsa
                </Badge>
                <span className="text-slate-600">
                  (Berakhir pada{' '}
                  {new Date(subUser.activeUntil).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  )
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Badge variant="success" className="text-xs font-semibold bg-emerald-100 text-emerald-800 border-emerald-200">
                  Aktif (Sisa{' '}
                  {Math.max(
                    0,
                    Math.ceil((new Date(subUser.activeUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  )}{' '}
                  hari)
                </Badge>
                <span className="text-slate-600 font-mono">
                  s/d{' '}
                  {new Date(subUser.activeUntil).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Opsi Tambah / Perpanjang Durasi */}
          <div className="space-y-3">
            <label className="block font-semibold text-slate-800">
              Pilih Opsi Perpanjangan:
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSubMode('days');
                  setSubDays(30);
                }}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                  subMode === 'days' && subDays === 30
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 font-bold ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-semibold">+30 Hari (1 Bulan)</div>
                <div className="text-[10px] text-slate-500 font-normal">Perpanjang 1 bulan standar</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubMode('days');
                  setSubDays(90);
                }}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                  subMode === 'days' && subDays === 90
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 font-bold ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-semibold">+90 Hari (3 Bulan)</div>
                <div className="text-[10px] text-slate-500 font-normal">Paket triwulan</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubMode('days');
                  setSubDays(365);
                }}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                  subMode === 'days' && subDays === 365
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 font-bold ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-semibold">+365 Hari (1 Tahun)</div>
                <div className="text-[10px] text-slate-500 font-normal">Paket tahunan</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubMode('unlimited');
                }}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                  subMode === 'unlimited'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 font-bold ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-semibold">Selamanya (Unlimited)</div>
                <div className="text-[10px] text-slate-500 font-normal">Tanpa batas waktu aktif</div>
              </button>
            </div>

            {/* Opsi Kustom Hari atau Tanggal */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="subModeRadio"
                    checked={subMode === 'days'}
                    onChange={() => setSubMode('days')}
                    className="text-purple-600"
                  />
                  <span className="font-medium text-slate-700">Tambah Jumlah Hari:</span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="subModeRadio"
                    checked={subMode === 'date'}
                    onChange={() => setSubMode('date')}
                    className="text-purple-600"
                  />
                  <span className="font-medium text-slate-700">Tentukan Tanggal Pasti:</span>
                </label>
              </div>

              {subMode === 'days' && (
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    min="1"
                    value={subDays}
                    onChange={(e) => setSubDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-9 text-xs w-32"
                  />
                  <span className="text-slate-500">Hari dari sekarang (atau ditambah ke sisa aktif)</span>
                </div>
              )}

              {subMode === 'date' && (
                <div>
                  <Input
                    type="date"
                    value={subCustomDate}
                    onChange={(e) => setSubCustomDate(e.target.value)}
                    className="h-9 text-xs w-56"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Pilih tanggal akhir masa aktif akun klien.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubModalOpen(false)}
              className="text-xs cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={handleSaveSubscription}
              className="bg-purple-600 hover:bg-purple-700 text-xs text-white shadow-sm cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : 'Terapkan Perpanjangan'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal Konfirmasi Masuk / Impersonate */}
      <ConfirmDialog
        open={Boolean(impersonateUser)}
        onOpenChange={(open) => !open && setImpersonateUser(null)}
        title="Masuk Sebagai Klien (Impersonate)"
        variant="primary"
        icon={Eye}
        confirmText="Mulai Impersonasi"
        loading={submitting}
        onConfirm={handleConfirmImpersonate}
        description={
          <div>
            Apakah Anda ingin masuk (impersonate) sebagai{' '}
            <strong className="text-slate-900 font-bold">{impersonateUser?.name}</strong>?
            <p className="mt-1.5 text-[11px] text-slate-500">
              Anda akan dapat melihat dan menguji akunnya seolah-olah Anda adalah klien ini tanpa perlu kata sandi mereka.
            </p>
          </div>
        }
      />

      {/* Modal Konfirmasi Nonaktifkan Akun (Soft Delete) */}
      <ConfirmDialog
        open={Boolean(deleteUser)}
        onOpenChange={(open) => !open && setDeleteUser(null)}
        title="Nonaktifkan Akun Pengguna"
        variant="danger"
        icon={Trash2}
        confirmText="Nonaktifkan Akun"
        loading={submitting}
        onConfirm={handleConfirmSoftDelete}
        description={
          <div>
            Apakah Anda yakin ingin menonaktifkan akun{' '}
            <strong className="text-slate-900 font-bold">{deleteUser?.name}</strong>?
            <p className="mt-1.5 text-[11px] text-slate-500">
              Akun tidak akan dapat login kembali, namun datanya tetap tersimpan aman dan dapat dipulihkan kapan saja dari Arsip Audit.
            </p>
          </div>
        }
      />

      {/* Modal Pemberitahuan Pesan Error */}
      <ConfirmDialog
        open={Boolean(errorMsg)}
        onOpenChange={(open) => !open && setErrorMsg(null)}
        title="Pemberitahuan"
        variant="warning"
        isAlert
        confirmText="Mengerti"
        onConfirm={() => setErrorMsg(null)}
        description={<span className="text-red-700 font-medium">{errorMsg}</span>}
      />
    </div>
  );
};
