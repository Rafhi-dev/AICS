import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Badge } from './ui/Badge';
import { Switch } from './ui/Switch';
import { Dialog } from './ui/Dialog';
import { ConfirmDialog } from './ui/ConfirmDialog';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Search,
  Sparkles,
  HelpCircle,
  Tag,
} from 'lucide-react';

interface KnowledgeItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  isActive: boolean;
  createdAt: string;
}

export interface KnowledgeBaseProps {
  targetUserId?: string;
  targetUserName?: string;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  targetUserId,
  targetUserName,
}) => {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [faqToDelete, setFaqToDelete] = useState<KnowledgeItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category: 'Umum',
    question: '',
    answer: '',
    isActive: true,
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const url = targetUserId ? `/knowledge?userId=${targetUserId}` : '/knowledge';
      const res = await api.get(url);
      if (res.data.success) {
        setItems(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching knowledge:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [targetUserId]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      category: 'Umum',
      question: '',
      answer: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (item: KnowledgeItem) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      question: item.question,
      answer: item.answer,
      isActive: item.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) return;

    try {
      if (editingItem) {
        // Update
        const res = await api.put(`/knowledge/${editingItem.id}`, formData);
        if (res.data.success) {
          setItems((prev) =>
            prev.map((it) => (it.id === editingItem.id ? res.data.data : it))
          );
        }
      } else {
        // Create
        const payload: any = { ...formData };
        if (targetUserId) {
          payload.userId = targetUserId;
        }
        const res = await api.post('/knowledge', payload);
        if (res.data.success) {
          setItems((prev) => [res.data.data, ...prev]);
        }
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Error saving knowledge item:', err);
      setActionError('Gagal menyimpan item FAQ.');
    }
  };

  const handleOpenDelete = (item: KnowledgeItem) => {
    setFaqToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!faqToDelete) return;
    try {
      const res = await api.delete(`/knowledge/${faqToDelete.id}`);
      if (res.data.success) {
        setItems((prev) => prev.filter((it) => it.id !== faqToDelete.id));
        setFaqToDelete(null);
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      setActionError('Gagal menghapus item FAQ.');
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const res = await api.put(`/knowledge/${id}`, { isActive: !current });
      if (res.data.success) {
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, isActive: !current } : it))
        );
      }
    } catch (err) {
      console.error('Error toggling active:', err);
    }
  };

  const filteredItems = items.filter(
    (it) =>
      it.question.toLowerCase().includes(search.toLowerCase()) ||
      it.answer.toLowerCase().includes(search.toLowerCase()) ||
      it.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
      {targetUserName && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-950 shadow-xs">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Anda sedang mengelola FAQ / Pertanyaan Umum untuk akun klien: <strong>{targetUserName}</strong>
            </span>
          </div>
          <span className="font-semibold text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-200 text-[10px]">
            Mode Administrator
          </span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-amber-600" />
            <span>Basis Pengetahuan & FAQ CS</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Informasi di bawah ini akan diinjeksikan secara dinamis ke konteks AI agar dapat menjawab pertanyaan seputar produk dan operasional bisnis secara akurat.
          </p>
        </div>

        <Button
          onClick={openAddModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-xs px-4 h-9 shadow-sm"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Tambah Informasi Baru
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center space-x-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari topik, pertanyaan, atau kata kunci..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 bg-white"
          />
        </div>
        <span className="text-xs text-slate-500">
          Total: <b>{filteredItems.length}</b> informasi
        </span>
      </div>

      {/* List / Cards */}
      {loading ? (
        <div className="flex h-40 items-center justify-center text-xs text-slate-400">
          Memuat basis pengetahuan...
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300 stroke-[1.5] mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">Belum ada informasi</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Klik tombol "Tambah Informasi Baru" untuk memasukkan jam kerja, harga produk, rekening pembayaran, atau aturan layanan.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`flex flex-col justify-between border-slate-200 transition-all ${
                item.isActive ? 'bg-white' : 'bg-slate-50/70 opacity-75'
              }`}
            >
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px] py-0.5">
                    <Tag className="h-2.5 w-2.5 mr-1 text-slate-500" />
                    {item.category}
                  </Badge>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] text-slate-500">
                      {item.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <Switch
                      checked={item.isActive}
                      onCheckedChange={() => handleToggleActive(item.id, item.isActive)}
                    />
                  </div>
                </div>

                <h4 className="text-xs font-bold text-slate-900 flex items-start space-x-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item.question}</span>
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap pl-5 border-l-2 border-emerald-100">
                  {item.answer}
                </p>
              </div>

              <div className="flex items-center justify-end space-x-1.5 border-t border-slate-100 bg-slate-50/50 px-4 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(item)}
                  className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenDelete(item)}
                  className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Hapus
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {editingItem ? 'Ubah Informasi FAQ' : 'Tambah Informasi Pengetahuan Baru'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Informasi ini akan dijadikan acuan AI saat menjawab pertanyaan pelanggan.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori / Topik
              </label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Misal: Jam Buka, Harga Paket, Lokasi, Garansi"
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pertanyaan Pelanggan (FAQ)
              </label>
              <Input
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Misal: Berapa harga langganan bulanan?"
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jawaban Resmi / Penjelasan
              </label>
              <Textarea
                rows={5}
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Tuliskan jawaban yang akurat, jelas, dan santun..."
                className="text-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(val) => setFormData({ ...formData, isActive: val })}
              />
              <span className="text-xs text-slate-700 font-medium">
                Aktifkan dalam konteks AI
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="text-xs cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-xs px-4 cursor-pointer"
            >
              {editingItem ? 'Simpan Perubahan' : 'Tambahkan'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal Konfirmasi Hapus FAQ */}
      <ConfirmDialog
        open={Boolean(faqToDelete)}
        onOpenChange={(open) => !open && setFaqToDelete(null)}
        title="Hapus Pertanyaan FAQ"
        variant="danger"
        icon={Trash2}
        confirmText="Hapus FAQ"
        onConfirm={handleConfirmDelete}
        description={
          <div>
            Apakah Anda yakin ingin menghapus FAQ{' '}
            <strong className="text-slate-900 font-bold">"{faqToDelete?.question}"</strong> dari sistem?
            <p className="mt-1.5 text-[11px] text-slate-500">
              Bot AI tidak akan lagi menggunakan informasi ini sebagai rujukan untuk menjawab pertanyaan pelanggan.
            </p>
          </div>
        }
      />

      {/* Modal Pemberitahuan Error / Validasi */}
      <ConfirmDialog
        open={Boolean(actionError)}
        onOpenChange={(open) => !open && setActionError(null)}
        title="Pemberitahuan"
        variant="warning"
        isAlert
        confirmText="Tutup"
        onConfirm={() => setActionError(null)}
        description={<span className="text-red-700 font-medium">{actionError}</span>}
      />
    </div>
  );
};
