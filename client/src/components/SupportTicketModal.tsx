import React, { useState, useEffect } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { api } from '../lib/api';
import {
  LifeBuoy,
  PlusCircle,
  History,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Calendar,
  HelpCircle,
} from 'lucide-react';

interface TicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: string;
  createdAt: string;
  updatedAt: string;
  messages?: Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    message: string;
    createdAt: string;
  }>;
  _count?: { messages: number };
}

interface SupportTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    activeUntil?: string | null;
    isExpired?: boolean;
  } | null;
  defaultCategory?: string;
  defaultSubject?: string;
}

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({
  open,
  onOpenChange,
  currentUser,
  defaultCategory,
  defaultSubject,
}) => {
  const [activeView, setActiveView] = useState<'create' | 'list' | 'detail'>('create');
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form Buat Tiket
  const [subject, setSubject] = useState(defaultSubject || '');
  const [category, setCategory] = useState(defaultCategory || 'BANTUAN');
  const [priority, setPriority] = useState('MEDIUM');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Balas Chat di Detail
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    if (open) {
      if (defaultSubject) setSubject(defaultSubject);
      if (defaultCategory) setCategory(defaultCategory);
      fetchTickets();
    } else {
      setError(null);
      setSuccess(null);
      setSelectedTicket(null);
      setActiveView('create');
    }
  }, [open, defaultSubject, defaultCategory]);

  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      const res = await api.get('/tickets');
      if (res.data.success) {
        setTickets(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError('Judul dan rincian pesan kendala wajib diisi');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.post('/tickets', {
        subject: subject.trim(),
        category,
        priority,
        message: message.trim(),
      });

      if (res.data.success) {
        setSuccess(`Tiket #${res.data.data.ticketNumber} berhasil dikirim ke Administrator!`);
        setSubject('');
        setMessage('');
        fetchTickets();
        setTimeout(() => {
          setSuccess(null);
          setActiveView('list');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal mengirim tiket');
    } finally {
      setSubmitting(false);
    }
  };

  const openTicketDetail = async (ticketId: string) => {
    try {
      setLoadingDetail(true);
      setActiveView('detail');
      const res = await api.get(`/tickets/${ticketId}`);
      if (res.data.success) {
        setSelectedTicket(res.data.data);
      }
    } catch (err) {
      console.error('Error loading ticket detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const res = await api.post(`/tickets/${selectedTicket.id}/messages`, {
        message: replyMessage.trim(),
      });

      if (res.data.success && res.data.data) {
        setReplyMessage('');
        // Reload detail tiket
        const refreshed = await api.get(`/tickets/${selectedTicket.id}`);
        if (refreshed.data.success) {
          setSelectedTicket(refreshed.data.data);
        }
        fetchTickets();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal mengirim balasan');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="warning" className="text-[10px] py-0.5">Menunggu Balasan</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="default" className="bg-indigo-600 text-white text-[10px] py-0.5">Sedang Diproses</Badge>;
      case 'RESOLVED':
        return <Badge variant="success" className="text-[10px] py-0.5">Selesai</Badge>;
      case 'CLOSED':
        return <Badge variant="secondary" className="text-[10px] py-0.5">Ditutup</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] py-0.5">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4 max-w-xl mx-auto">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Pusat Bantuan & Tiket Dukungan
              </h2>
              <p className="text-xs text-slate-500">
                Kirim pertanyaan, kendala teknis, atau permintaan perpanjangan akun ke Admin
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigasi Modal */}
        <div className="flex items-center space-x-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveView('create')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg transition-all ${
              activeView === 'create'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Kirim Tiket Baru</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('list');
              fetchTickets();
            }}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg transition-all ${
              activeView === 'list' || activeView === 'detail'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Riwayat Tiket ({tickets.length})</span>
          </button>
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

        {/* View 1: Form Buat Tiket */}
        {activeView === 'create' && (
          <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
            {currentUser?.isExpired && (
              <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Masa aktif Anda telah berakhir:</strong> Anda dapat menggunakan form ini untuk meminta perpanjangan akun kepada Administrator.
                </span>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Kategori Tiket <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'PERPANJANGAN', label: 'Perpanjang Akun' },
                  { id: 'TEKNIS', label: 'Kendala Teknis WA' },
                  { id: 'BANTUAN', label: 'Pertanyaan Umum' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                      category === cat.id
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Subjek / Judul Kendala <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Contoh: Mohon perpanjangan masa aktif akun 3 bulan ke depan"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Tingkat Prioritas
              </label>
              <div className="flex space-x-2">
                {[
                  { id: 'LOW', label: 'Rendah' },
                  { id: 'MEDIUM', label: 'Sedang (Normal)' },
                  { id: 'HIGH', label: 'Mendesak (Tinggi)' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`py-1.5 px-3 rounded-lg border text-xs transition-all ${
                      priority === p.id
                        ? 'border-slate-800 bg-slate-900 text-white font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Pesan / Rincian Kendala <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Jelaskan kebutuhan, kendala, atau pertanyaan Anda secara detail agar Administrator dapat segera menindaklanjuti..."
                required
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="text-xs h-8 px-3"
              >
                Tutup
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="text-xs h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Kirim Tiket Sekarang
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* View 2: Daftar Riwayat Tiket */}
        {activeView === 'list' && (
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {loadingTickets ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                <p className="text-xs">Memuat daftar tiket Anda...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-10 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 p-6">
                <HelpCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Belum ada tiket bantuan</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Jika Anda memiliki kendala atau butuh perpanjangan akun, klik tombol "Kirim Tiket Baru" di atas.
                </p>
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => openTicketDetail(t.id)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        #{t.ticketNumber}
                      </span>
                      {getStatusBadge(t.status)}
                      <span className="text-[10px] text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600">
                      {t.subject}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {t.messages && t.messages[0] ? t.messages[0].message : 'Tidak ada pesan'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </div>
              ))
            )}
          </div>
        )}

        {/* View 3: Detail Percakapan Tiket */}
        {activeView === 'detail' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900 font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Kembali ke Daftar</span>
              </button>

              {selectedTicket && getStatusBadge(selectedTicket.status)}
            </div>

            {loadingDetail || !selectedTicket ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                <p className="text-xs">Memuat percakapan tiket...</p>
              </div>
            ) : (
              <>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span className="font-mono font-bold text-indigo-700">#{selectedTicket.ticketNumber}</span>
                    <span>{new Date(selectedTicket.createdAt).toLocaleString('id-ID')}</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">{selectedTicket.subject}</h3>
                </div>

                {/* Pesan Obrolan */}
                <div className="space-y-2.5 max-h-[38vh] overflow-y-auto p-1">
                  {selectedTicket.messages?.map((msg) => {
                    const isAdmin = msg.senderRole === 'ADMIN';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                      >
                        <div className="flex items-center space-x-1 mb-1 text-[10px] text-slate-400">
                          <span className={isAdmin ? 'font-bold text-indigo-600' : 'font-medium'}>
                            {isAdmin ? '🛡️ Admin Support' : msg.senderName}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                            isAdmin
                              ? 'bg-indigo-50/90 text-indigo-950 border border-indigo-200 rounded-tl-xs'
                              : 'bg-emerald-600 text-white rounded-tr-xs shadow-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Form Kirim Balasan */}
                {selectedTicket.status !== 'CLOSED' ? (
                  <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-100 flex gap-2">
                    <input
                      type="text"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Tulis pesan balasan ke Admin..."
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={sendingReply || !replyMessage.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 text-xs"
                    >
                      {sendingReply ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center p-2 rounded-lg bg-slate-100 text-[11px] text-slate-500 font-medium">
                    Tiket ini telah ditutup. Jika butuh bantuan baru, silakan ajukan tiket baru.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};
