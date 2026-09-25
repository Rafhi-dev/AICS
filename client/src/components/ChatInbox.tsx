import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { formatDate, formatDateTime } from '../lib/utils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Switch } from './ui/Switch';
import {
  Search,
  Send,
  User,
  Bot,
  UserCheck,
  Sparkles,
  MessageCircle,
  Clock,
  Trash2,
  RotateCcw,
  Archive,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface Contact {
  id: string;
  waId: string;
  name: string | null;
  pushName: string | null;
  phone: string;
  isAiActive: boolean;
}

interface Message {
  id: string;
  sender: 'CUSTOMER' | 'BOT' | 'AGENT';
  text: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  createdAt: string;
}

interface ConversationItem {
  id: string;
  contact: Contact;
  status: string;
  deletedAt?: string | null;
  lastMessageAt: string;
  lastMessage: Message | null;
}

export const ChatInbox: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [auditMode, setAuditMode] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ambil daftar percakapan berdasarkan filter audit
  const fetchConversations = async (isAudit = auditMode) => {
    try {
      setLoading(true);
      const res = await api.get(`/chats?audit=${isAudit}`);
      if (res.data.success) {
        setConversations(res.data.data);
        if (res.data.data.length > 0) {
          // Pilih percakapan pertama bila yang sekarang tidak ada di list
          const exists = res.data.data.some((c: ConversationItem) => c.id === selectedId);
          if (!exists) {
            setSelectedId(res.data.data[0].id);
          }
        } else {
          setSelectedId(null);
          setMessages([]);
          setActiveContact(null);
          setActiveConversation(null);
        }
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Ambil pesan pada percakapan yang dipilih
  const fetchMessages = async (convId: string) => {
    try {
      const res = await api.get(`/chats/${convId}/messages`);
      if (res.data.success) {
        setMessages(res.data.data.messages);
        setActiveContact(res.data.data.conversation.contact);
        setActiveConversation(res.data.data.conversation);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    fetchConversations(auditMode);
  }, [auditMode]);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
    }
  }, [selectedId]);

  // Scroll otomatis ke bawah saat pesan baru masuk
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Socket listener untuk real-time update pesan
  useEffect(() => {
    const handleNewMessage = (payload: {
      conversationId: string;
      message: Message;
      contact: Contact;
    }) => {
      // Jika sedang dalam audit mode, abaikan update live chat
      if (auditMode) return;

      // Perbarui list percakapan
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === payload.conversationId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            lastMessageAt: payload.message.createdAt,
            lastMessage: payload.message,
            contact: payload.contact,
          };
          // Pindahkan percakapan yang baru ke atas
          return [updated[index], ...updated.filter((_, i) => i !== index)];
        } else {
          return [
            {
              id: payload.conversationId,
              contact: payload.contact,
              status: 'OPEN',
              deletedAt: null,
              lastMessageAt: payload.message.createdAt,
              lastMessage: payload.message,
            },
            ...prev,
          ];
        }
      });

      // Jika pesan masuk ke percakapan yang sedang dibuka
      if (selectedId === payload.conversationId) {
        setMessages((prev) => [...prev, payload.message]);
      }
    };

    const handleAiTyping = (payload: { conversationId: string; isTyping: boolean }) => {
      if (payload.conversationId === selectedId || !payload.conversationId) {
        setIsTyping(payload.isTyping);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('ai_typing', handleAiTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('ai_typing', handleAiTyping);
    };
  }, [selectedId, auditMode]);

  // Kirim balasan manual dari operator
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !replyText.trim()) return;

    const textToSend = replyText.trim();
    setReplyText('');

    try {
      await api.post(`/chats/${selectedId}/messages`, { text: textToSend });
    } catch (err) {
      console.error('Error sending message:', err);
      setActionNotice('Gagal mengirim pesan manual.');
    }
  };

  // Toggle Human Takeover (isAiActive)
  const handleToggleAi = async (contactId: string, currentVal: boolean) => {
    try {
      const res = await api.patch(`/chats/contacts/${contactId}/toggle-ai`, {
        isAiActive: !currentVal,
      });
      if (res.data.success) {
        setActiveContact((prev) => (prev ? { ...prev, isAiActive: !currentVal } : prev));
        setConversations((prev) =>
          prev.map((c) =>
            c.contact.id === contactId
              ? { ...c, contact: { ...c.contact, isAiActive: !currentVal } }
              : c
          )
        );
      }
    } catch (err) {
      console.error('Error toggling AI:', err);
    }
  };

  // Soft Delete Conversation
  const handleConfirmSoftDelete = async () => {
    if (!selectedId) return;

    try {
      const res = await api.delete(`/chats/${selectedId}`);
      if (res.data.success) {
        // Hapus dari list saat ini
        setConversations((prev) => prev.filter((c) => c.id !== selectedId));
        setSelectedId(null);
        setActiveContact(null);
        setActiveConversation(null);
        setMessages([]);
        setDeleteConfirmOpen(false);
      }
    } catch (err) {
      console.error('Error soft-deleting chat:', err);
      setActionNotice('Gagal menghapus percakapan.');
    }
  };

  // Restore Soft-Deleted Conversation
  const handleRestore = async () => {
    if (!selectedId) return;
    try {
      const res = await api.post(`/chats/${selectedId}/restore`);
      if (res.data.success) {
        // Pindahkan kembali atau hapus dari list audit
        setConversations((prev) => prev.filter((c) => c.id !== selectedId));
        setSelectedId(null);
        setActiveContact(null);
        setActiveConversation(null);
        setMessages([]);
        setActionNotice('Percakapan berhasil dipulihkan ke Obrolan Aktif!');
      }
    } catch (err) {
      console.error('Error restoring chat:', err);
      setActionNotice('Gagal memulihkan percakapan.');
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const name = c.contact.name || c.contact.pushName || c.contact.phone || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="grid h-[calc(100vh-5rem)] grid-cols-12 gap-4 p-4 max-w-7xl mx-auto">
      {/* Kolom Kiri: Daftar Kontak/Chat */}
      <Card className="col-span-12 md:col-span-4 flex flex-col h-full overflow-hidden border-slate-200">
        {/* Tab Switcher (Aktif vs Audit) */}
        <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex space-x-1">
          <button
            onClick={() => setAuditMode(false)}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              !auditMode
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Obrolan Aktif</span>
          </button>
          <button
            onClick={() => setAuditMode(true)}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              auditMode
                ? 'bg-white text-amber-700 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Archive className="h-3.5 w-3.5" />
            <span>Audit / Terhapus</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder={auditMode ? 'Cari di riwayat audit...' : 'Cari obrolan / nomor...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-slate-50 text-xs"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-xs text-slate-400">
              Memuat percakapan...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col h-60 items-center justify-center text-center p-6 text-slate-400">
              {auditMode ? (
                <>
                  <Archive className="h-10 w-10 text-slate-300 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-medium text-slate-600">Tidak ada arsip terhapus</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Obrolan yang dihapus dengan soft-delete akan diarsipkan di sini.
                  </p>
                </>
              ) : (
                <>
                  <MessageCircle className="h-10 w-10 text-slate-300 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-medium text-slate-600">Belum ada obrolan aktif</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Pesan WhatsApp yang masuk akan otomatis muncul di sini.
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedId;
              const displayName =
                conv.contact.name || conv.contact.pushName || `+${conv.contact.phone}` || 'Pelanggan';

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`flex cursor-pointer items-start space-x-3 p-3.5 transition-all ${
                    isSelected
                      ? auditMode
                        ? 'bg-amber-50/70 border-l-4 border-l-amber-600'
                        : 'bg-emerald-50/70 border-l-4 border-l-emerald-600'
                      : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-semibold text-xs">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-900 truncate">
                        {displayName}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {conv.lastMessageAt ? formatDate(conv.lastMessageAt) : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {conv.lastMessage?.text || 'Mulai percakapan...'}
                    </p>
                    <div className="mt-1 flex items-center space-x-1.5">
                      {conv.deletedAt ? (
                        <span className="inline-flex items-center rounded-sm bg-amber-100 px-1.5 py-0.2 text-[9px] font-medium text-amber-800">
                          <ShieldAlert className="h-2.5 w-2.5 mr-0.5" /> Soft-Deleted
                        </span>
                      ) : conv.contact.isAiActive ? (
                        <span className="inline-flex items-center rounded-sm bg-emerald-100 px-1.5 py-0.2 text-[9px] font-medium text-emerald-700">
                          <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI Auto-Reply
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-sm bg-blue-100 px-1.5 py-0.2 text-[9px] font-medium text-blue-700">
                          <User className="h-2.5 w-2.5 mr-0.5" /> Human Mode
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Kolom Kanan: Jendela Pesan */}
      <Card className="col-span-12 md:col-span-8 flex flex-col h-full overflow-hidden border-slate-200">
        {selectedId && activeContact ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-3.5 bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                  {(activeContact.name || activeContact.pushName || 'P')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-900 leading-none">
                      {activeContact.name || activeContact.pushName || `+${activeContact.phone}`}
                    </h3>
                    {activeConversation?.deletedAt && (
                      <Badge variant="warning" className="text-[10px]">
                        Arsip Audit
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[11px] text-slate-500 font-mono">
                      +{activeContact.phone || activeContact.waId.replace('@c.us', '')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions: Soft Delete / Restore & AI Toggle */}
              <div className="flex items-center space-x-2">
                {activeConversation?.deletedAt ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRestore}
                    className="text-xs h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Pulihkan Obrolan
                  </Button>
                ) : (
                  <>
                    {/* Human Takeover Switch */}
                    <div className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-semibold text-slate-800">
                          {activeContact.isAiActive ? 'Auto AI Mode' : 'Human Mode'}
                        </div>
                      </div>
                      <Switch
                        checked={activeContact.isAiActive}
                        onCheckedChange={() =>
                          handleToggleAi(activeContact.id, activeContact.isAiActive)
                        }
                      />
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="text-xs h-8 cursor-pointer"
                      title="Hapus Obrolan (Soft Delete untuk audit)"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Hapus
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Banner Audit jika Obrolan Berstatus Soft-Deleted */}
            {activeConversation?.deletedAt && (
              <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 flex items-center space-x-2 text-xs text-amber-800">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Obrolan ini telah dihapus pada{' '}
                  <strong>{formatDateTime(activeConversation.deletedAt)}</strong>. Data tersimpan
                  penuh di database Neon untuk keperluan audit dan dapat dipulihkan kapan saja.
                </span>
              </div>
            )}

            {/* Chat Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2]/30">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  Belum ada riwayat pesan dalam obrolan ini.
                </div>
              ) : (
                messages.map((msg) => {
                  const isCustomer = msg.sender === 'CUSTOMER';
                  const isBot = msg.sender === 'BOT';
                  const isAgent = msg.sender === 'AGENT';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`relative max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs shadow-sm ${
                          isCustomer
                            ? 'bg-white text-slate-900 border border-slate-200/80 rounded-tl-none'
                            : isBot
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-indigo-600 text-white rounded-tr-none'
                        }`}
                      >
                        {/* Sender Label */}
                        <div
                          className={`flex items-center space-x-1 text-[10px] font-semibold mb-1 ${
                            isCustomer
                              ? 'text-slate-500'
                              : isBot
                              ? 'text-emerald-100'
                              : 'text-indigo-100'
                          }`}
                        >
                          {isBot && (
                            <>
                              <Sparkles className="h-3 w-3" />
                              <span>AI Assistant</span>
                            </>
                          )}
                          {isAgent && (
                            <>
                              <UserCheck className="h-3 w-3" />
                              <span>CS Operator (Human)</span>
                            </>
                          )}
                          {isCustomer && (
                            <>
                              <User className="h-3 w-3" />
                              <span>{activeContact.pushName || 'Pelanggan'}</span>
                            </>
                          )}
                        </div>

                        {/* Media Display if present (Brosur / Gambar / File) */}
                        {msg.mediaUrl && (
                          <div className="mb-2">
                            {msg.mediaType === 'IMAGE' ? (
                              <div className="rounded-lg overflow-hidden border border-white/20 bg-black/10">
                                <a
                                  href={msg.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img
                                    src={msg.mediaUrl}
                                    alt="Media Attachment"
                                    className="max-h-60 max-w-full object-cover rounded hover:opacity-90 transition-opacity"
                                  />
                                </a>
                                <div className="p-1 text-[10px] flex items-center space-x-1 text-slate-200">
                                  <ImageIcon className="h-3 w-3" />
                                  <span>Brosur / Gambar Terkirim</span>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg p-2 bg-black/10 border border-white/20 flex items-center space-x-2">
                                <FileText className="h-4 w-4" />
                                <div className="flex-1 truncate">
                                  <span className="text-[11px] font-medium">Berkas Dokumen</span>
                                </div>
                                <a
                                  href={msg.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] underline hover:text-white inline-flex items-center"
                                >
                                  <ExternalLink className="h-3 w-3 mr-0.5" /> Buka
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Content text */}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                        {/* Timestamp */}
                        <div
                          className={`mt-1 text-right text-[9px] ${
                            isCustomer ? 'text-slate-400' : 'text-emerald-100/80'
                          }`}
                        >
                          {formatDateTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg w-fit border border-emerald-200 animate-pulse">
                  <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  <span>AI sedang menyusun jawaban...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Box */}
            {!activeConversation?.deletedAt && (
              <form
                onSubmit={handleSendMessage}
                className="border-t border-slate-200 bg-white p-3 flex items-center space-x-2"
              >
                <Input
                  placeholder="Tulis balasan manual untuk pelanggan (akan terkirim ke WhatsApp)..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 text-xs h-10"
                />
                <Button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 h-10 px-4 text-xs"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Kirim
                </Button>
              </form>
            )}
          </>
        ) : (
          <div className="flex flex-col h-full items-center justify-center text-center p-8 text-slate-400">
            <MessageCircle className="h-14 w-14 text-slate-300 mb-3 stroke-[1.5]" />
            <h3 className="text-sm font-semibold text-slate-700">Pilih Obrolan</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {auditMode
                ? 'Pilih obrolan dari daftar arsip terhapus untuk mengaudit riwayat atau memulihkannya.'
                : 'Klik salah satu obrolan di panel kiri untuk membaca pesan dan mengambil alih percakapan bila diperlukan.'}
            </p>
          </div>
        )}
      </Card>

      {/* Modal Konfirmasi Hapus Obrolan */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Hapus Obrolan"
        variant="danger"
        icon={Trash2}
        confirmText="Hapus Obrolan"
        onConfirm={handleConfirmSoftDelete}
        description={
          <div>
            Apakah Anda yakin ingin menghapus obrolan dengan{' '}
            <strong className="text-slate-900 font-semibold">
              {activeContact?.name || activeContact?.pushName || activeContact?.phone}
            </strong>?
            <p className="mt-1.5 text-[11px] text-slate-500">
              Data percakapan tetap tersimpan aman di database dan dapat dilihat kembali melalui tab Arsip Audit.
            </p>
          </div>
        }
      />

      {/* Modal Pemberitahuan Aksi */}
      <ConfirmDialog
        open={Boolean(actionNotice)}
        onOpenChange={(open) => !open && setActionNotice(null)}
        title="Pemberitahuan"
        variant="info"
        isAlert
        confirmText="Tutup"
        onConfirm={() => setActionNotice(null)}
        description={<span>{actionNotice}</span>}
      />
    </div>
  );
};
