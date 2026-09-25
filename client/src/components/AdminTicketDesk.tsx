import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import {
  LifeBuoy,
  Search,
  CheckCircle2,
  Clock,
  Send,
  User,
  Calendar,
  Filter,
  Loader2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  CalendarClock,
  RefreshCw,
} from 'lucide-react';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface TicketItem {
  id: string;
  ticketNumber: string;
  userId: string;
  subject: string;
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    username?: string | null;
    email: string;
    role: string;
    activeUntil?: string | null;
  };
  messages?: TicketMessage[];
  _count?: { messages: number };
}

export const AdminTicketDesk: React.FC = () => {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<TicketItem | null>(null);
  const [loadingActiveTicket, setLoadingActiveTicket] = useState(false);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Reply Form
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Extend Subscription Quick Action
  const [extending, setExtending] = useState(false);
  const [extendSuccess, setExtendSuccess] = useState<string | null>(null);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (statusFilter !== 'ALL') query.append('status', statusFilter);
      if (searchQuery) query.append('search', searchQuery);

      const res = await api.get(`/tickets?${query.toString()}`);
      if (res.data.success) {
        setTickets(res.data.data);
        // Jika belum ada tiket yang dipilih, pilih yang pertama jika ada
        if (!selectedTicketId && res.data.data.length > 0) {
          setSelectedTicketId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  // Load active ticket detail when selectedTicketId changes
  useEffect(() => {
    if (!selectedTicketId) {
      setActiveTicket(null);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoadingActiveTicket(true);
        const res = await api.get(`/tickets/${selectedTicketId}`);
        if (res.data.success) {
          setActiveTicket(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching ticket detail:', err);
      } finally {
        setLoadingActiveTicket(false);
      }
    };

    fetchDetail();
  }, [selectedTicketId]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;

    try {
      setSendingReply(true);
      const res = await api.post(`/tickets/${activeTicket.id}/messages`, {
        message: replyText.trim(),
      });
      if (res.data.success) {
        setReplyText('');
        // Reload detail
        const refreshed = await api.get(`/tickets/${activeTicket.id}`);
        if (refreshed.data.success) {
          setActiveTicket(refreshed.data.data);
        }
        fetchTickets();
      }
    } catch (err: any) {
      setErrorModalMsg(err.response?.data?.error || 'Gagal mengirim balasan');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!activeTicket) return;
    try {
      const res = await api.patch(`/tickets/${activeTicket.id}/status`, { status: newStatus });
      if (res.data.success) {
        setActiveTicket({ ...activeTicket, status: newStatus as any });
        fetchTickets();
      }
    } catch (err: any) {
      setErrorModalMsg(err.response?.data?.error || 'Gagal mengubah status');
    }
  };

  const handleQuickExtend = async (days: number) => {
    if (!activeTicket?.user) return;
    setExtending(true);
    setExtendSuccess(null);
    try {
      const res = await api.patch(`/users/${activeTicket.user.id}/subscription`, {
        daysToAdd: days,
      });
      if (res.data.success) {
        setExtendSuccess(`Masa aktif ${activeTicket.user.name} berhasil diperpanjang +${days} hari!`);
        // Refresh active ticket user
        const refreshed = await api.get(`/tickets/${activeTicket.id}`);
        if (refreshed.data.success) {
          setActiveTicket(refreshed.data.data);
        }
        setTimeout(() => setExtendSuccess(null), 4000);
      }
    } catch (err: any) {
      setErrorModalMsg(err.response?.data?.error || 'Gagal memperpanjang masa aktif');
    } finally {
      setExtending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="warning" className="text-[10px] py-0.5 font-bold">Menunggu</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="default" className="bg-indigo-600 text-white text-[10px] py-0.5 font-bold">Diproses</Badge>;
      case 'RESOLVED':
        return <Badge variant="success" className="text-[10px] py-0.5 font-bold">Selesai</Badge>;
      case 'CLOSED':
        return <Badge variant="secondary" className="text-[10px] py-0.5 font-bold">Ditutup</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] py-0.5">{status}</Badge>;
    }
  };

  const isUserExpired = (activeUntil?: string | null) => {
    if (!activeUntil) return false;
    return new Date(activeUntil) < new Date();
  };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              Tiket Bantuan & Dukungan Pengguna
            </h1>
            <p className="text-xs text-slate-500">
              Kelola pertanyaan, bantuan teknis, dan perpanjangan masa aktif dari seluruh pengguna
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchTickets}
          className="text-xs h-8 px-3 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1 text-slate-500" />
          Muat Ulang
        </Button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-175px)] min-h-[550px]">
        {/* Kolom Kiri: Daftar Tiket (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {/* Filter & Search Bar */}
          <div className="p-3 border-b border-slate-100 space-y-2 bg-slate-50/50">
            <div className="relative">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTickets()}
                placeholder="Cari tiket, nomor atau subjek..."
                className="pl-8 text-xs bg-white h-8"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-1 text-[11px] font-semibold overflow-x-auto">
              {[
                { id: 'ALL', label: 'Semua' },
                { id: 'OPEN', label: 'Menunggu' },
                { id: 'IN_PROGRESS', label: 'Diproses' },
                { id: 'RESOLVED', label: 'Selesai' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all ${
                    statusFilter === f.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* List Tiket */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                <p className="text-xs">Memuat daftar tiket...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-16 text-center text-slate-400 p-4">
                <LifeBuoy className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Tidak ada tiket bantuan</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Tiket yang dikirimkan oleh pengguna akan muncul di sini.
                </p>
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicketId === t.id;
                const expired = isUserExpired(t.user?.activeUntil);
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-3 rounded-xl transition-all cursor-pointer m-1 ${
                      isSelected
                        ? 'bg-indigo-50/80 border border-indigo-200 shadow-xs'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                          #{t.ticketNumber}
                        </span>
                        {getStatusBadge(t.status)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(t.updatedAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 truncate mb-0.5">
                      {t.subject}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate max-w-[130px] font-medium text-slate-700">
                        {t.user?.name}
                      </span>
                      {expired ? (
                        <span className="text-[10px] font-bold text-red-600">⚠️ Expired</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">{t.category}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom Kanan: Detail Percakapan Tiket (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {!activeTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <MessageSquare className="h-10 w-10 text-slate-300 mb-2" />
              <h3 className="text-sm font-semibold text-slate-700">Pilih Tiket untuk Melihat Obrolan</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Pilih salah satu tiket di kolom kiri untuk berkomunikasi langsung dengan pengguna atau memperpanjang masa aktif akun mereka.
              </p>
            </div>
          ) : (
            <>
              {/* Header Percakapan Tiket */}
              <div className="p-3.5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                      #{activeTicket.ticketNumber}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{activeTicket.subject}</h3>
                    {getStatusBadge(activeTicket.status)}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                    <span>Pemohon: <strong>{activeTicket.user?.name}</strong></span>
                    {activeTicket.user?.username && <span>(@{activeTicket.user.username})</span>}
                    <span>•</span>
                    <span>{activeTicket.user?.email}</span>
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="flex items-center space-x-2 shrink-0">
                  <label className="text-[11px] text-slate-500 font-semibold">Status:</label>
                  <select
                    value={activeTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="text-xs font-semibold rounded-lg border border-slate-200 bg-white px-2 py-1 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="OPEN">Menunggu (OPEN)</option>
                    <option value="IN_PROGRESS">Sedang Diproses (IN_PROGRESS)</option>
                    <option value="RESOLVED">Selesai (RESOLVED)</option>
                    <option value="CLOSED">Tutup Tiket (CLOSED)</option>
                  </select>
                </div>
              </div>

              {/* Panel Info Masa Aktif & Tombol Perpanjang Instan */}
              <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  <span>
                    Masa Aktif Klien:{' '}
                    <strong>
                      {activeTicket.user?.activeUntil
                        ? new Date(activeTicket.user.activeUntil).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Tidak Terbatas'}
                    </strong>
                    {isUserExpired(activeTicket.user?.activeUntil) && (
                      <span className="ml-2 font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full text-[10px]">
                        Kedaluwarsa
                      </span>
                    )}
                  </span>
                </div>

                {/* Tombol Cepat Perpanjang */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">Perpanjang Cepat:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickExtend(30)}
                    disabled={extending}
                    className="text-[11px] h-6 px-2 bg-white text-indigo-700 hover:bg-indigo-100"
                  >
                    +30 Hari
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickExtend(90)}
                    disabled={extending}
                    className="text-[11px] h-6 px-2 bg-white text-indigo-700 hover:bg-indigo-100"
                  >
                    +90 Hari
                  </Button>
                </div>
              </div>

              {extendSuccess && (
                <div className="px-4 py-2 bg-emerald-50 text-emerald-800 text-xs border-b border-emerald-200 flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{extendSuccess}</span>
                </div>
              )}

              {/* Pesan-Pesan Obrolan */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingActiveTicket ? (
                  <div className="py-20 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <p className="text-xs">Memuat percakapan tiket...</p>
                  </div>
                ) : (
                  activeTicket.messages?.map((msg) => {
                    const isAdmin = msg.senderRole === 'ADMIN';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-slate-400">
                          <span className={isAdmin ? 'font-bold text-indigo-700' : 'font-semibold text-slate-700'}>
                            {isAdmin ? '🛡️ Anda (Admin Support)' : msg.senderName}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(msg.createdAt).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div
                          className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                            isAdmin
                              ? 'bg-indigo-600 text-white rounded-tr-xs shadow-xs'
                              : 'bg-slate-100 text-slate-900 rounded-tl-xs border border-slate-200'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Form Kirim Balasan Admin */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-slate-200 bg-slate-50 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Tulis balasan bantuan kepada pengguna..."
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={sendingReply || !replyText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 text-xs font-semibold"
                >
                  {sendingReply ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Send className="h-3.5 w-3.5 mr-1" />
                  )}
                  Balas
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Modal Pemberitahuan Error / Validasi */}
      <ConfirmDialog
        open={Boolean(errorModalMsg)}
        onOpenChange={(open) => !open && setErrorModalMsg(null)}
        title="Pemberitahuan"
        variant="warning"
        isAlert
        confirmText="Mengerti"
        onConfirm={() => setErrorModalMsg(null)}
        description={<span className="text-red-700 font-medium">{errorModalMsg}</span>}
      />
    </div>
  );
};
