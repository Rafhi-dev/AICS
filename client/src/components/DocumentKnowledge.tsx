import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { getFileUrl } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Badge } from './ui/Badge';
import { Switch } from './ui/Switch';
import { Dialog } from './ui/Dialog';
import { ConfirmDialog } from './ui/ConfirmDialog';
import {
  FileText,
  UploadCloud,
  File,
  Image as ImageIcon,
  Trash2,
  Search,
  Plus,
  Tag,
  ExternalLink,
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  description: string | null;
  content: string;
  keywords: string[];
  fileUrl: string | null;
  fileName: string | null;
  fileType: string;
  canSendAsMedia: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface DocumentKnowledgeProps {
  targetUserId?: string;
  targetUserName?: string;
}

export const DocumentKnowledge: React.FC<DocumentKnowledgeProps> = ({
  targetUserId,
  targetUserName,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Brosur & Layanan');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [canSendAsMedia, setCanSendAsMedia] = useState(true);
  const [content, setContent] = useState('');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const url = targetUserId ? `/documents?userId=${targetUserId}` : '/documents';
      const res = await api.get(url);
      if (res.data.success) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [targetUserId]);

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setCategory('Brosur & Layanan');
    setDescription('');
    setKeywords('');
    setCanSendAsMedia(true);
    setContent('');
  };

  const handleOpenModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        // Otomatis isi judul dari nama file tanpa ekstensi
        const baseName = selected.name.replace(/\.[^/.]+$/, '');
        setTitle(baseName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setActionError('Judul dokumen wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      formData.append('title', title);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('keywords', keywords);
      formData.append('canSendAsMedia', String(canSendAsMedia));
      formData.append('content', content);
      if (targetUserId) {
        formData.append('userId', targetUserId);
      }

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setDocuments((prev) => [res.data.data, ...prev]);
        setModalOpen(false);
        resetForm();
      }
    } catch (err: any) {
      console.error('Error uploading document:', err);
      setActionError(err.response?.data?.error || 'Gagal mengunggah dokumen.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const res = await api.patch(`/documents/${id}/toggle`, {
        isActive: !currentStatus,
      });
      if (res.data.success) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === id ? { ...d, isActive: !currentStatus } : d))
        );
      }
    } catch (err) {
      console.error('Error toggling document:', err);
    }
  };

  const handleOpenDelete = (doc: DocumentItem) => {
    setDocToDelete(doc);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    try {
      const res = await api.delete(`/documents/${docToDelete.id}`);
      if (res.data.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
        setDocToDelete(null);
      }
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setActionError(err.response?.data?.error || 'Gagal menghapus dokumen.');
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const q = search.toLowerCase();
    const inTitle = doc.title.toLowerCase().includes(q);
    const inDesc = (doc.description || '').toLowerCase().includes(q);
    const inContent = doc.content.toLowerCase().includes(q);
    const inKeywords = doc.keywords.some((k) => k.toLowerCase().includes(q));
    const inCategory = doc.category.toLowerCase().includes(q);
    return inTitle || inDesc || inContent || inKeywords || inCategory;
  });

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      {targetUserName && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs text-indigo-950 shadow-xs">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>
              Anda sedang mengelola dokumen & brosur untuk akun klien: <strong>{targetUserName}</strong>
            </span>
          </div>
          <span className="font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 text-[10px]">
            Mode Administrator
          </span>
        </div>
      )}

      {/* Top Banner / Info Card */}
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-emerald-50/50 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                  <FileText className="h-4 w-4" />
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  Basis Dokumen & Brosur Otomatis
                </h2>
                <Badge variant="secondary" className="text-[10px]">
                  Keyword Matching
                </Badge>
              </div>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Unggah dokumen PDF, katalog produk, brosur gambar, atau panduan kerja. AI
                akan mencocokkan pertanyaan pelanggan menggunakan sistem RAG semantik dan dapat
                mengirimkan gambar/file brosur langsung ke chat WhatsApp pelanggan!
              </p>
            </div>
            <Button
              onClick={handleOpenModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs shadow-sm whitespace-nowrap self-start md:self-auto"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Unggah Dokumen Baru
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Bar & Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari judul, kata kunci, isi dokumen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-white"
          />
        </div>
        <div className="text-xs text-slate-500 flex items-center space-x-2">
          <span>
            Total: <strong className="text-slate-800">{documents.length}</strong> dokumen
          </span>
          <span>•</span>
          <span>
            Aktif:{' '}
            <strong className="text-emerald-700">
              {documents.filter((d) => d.isActive).length}
            </strong>
          </span>
        </div>
      </div>

      {/* Document Grid / List */}
      {loading ? (
        <div className="flex h-40 items-center justify-center text-xs text-slate-400">
          Memuat basis dokumen...
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card className="border-dashed border-slate-200 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <UploadCloud className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Belum Ada Dokumen Terdaftar</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Mulai dengan mengunggah brosur gambar promo, pricelist PDF, atau file informasi layanan Anda agar AI dapat membaca dan membagikannya ke pelanggan.
          </p>
          <Button
            onClick={handleOpenModal}
            variant="outline"
            className="mt-4 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Unggah Sekarang
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isImage = doc.fileType === 'IMAGE';
            const isPdf = doc.fileType === 'PDF';

            return (
              <Card
                key={doc.id}
                className={`flex flex-col justify-between border transition-all ${
                  doc.isActive
                    ? 'border-slate-200 shadow-sm hover:border-slate-300'
                    : 'border-slate-200/60 bg-slate-50/40 opacity-70'
                }`}
              >
                <div>
                  {/* File preview banner if image */}
                  {isImage && doc.fileUrl && (
                    <div className="relative h-36 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                      <img
                        src={getFileUrl(doc.fileUrl)}
                        alt={doc.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          // Fallback if image load fails
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-[10px] shadow-sm bg-white/90 backdrop-blur">
                          Brosur Gambar
                        </Badge>
                      </div>
                    </div>
                  )}

                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isImage
                              ? 'bg-amber-100 text-amber-700'
                              : isPdf
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {isImage ? (
                            <ImageIcon className="h-4 w-4" />
                          ) : isPdf ? (
                            <FileText className="h-4 w-4" />
                          ) : (
                            <File className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold text-slate-900 leading-snug line-clamp-1">
                            {doc.title}
                          </CardTitle>
                          <span className="text-[10px] text-slate-400">{doc.category}</span>
                        </div>
                      </div>

                      <Switch
                        checked={doc.isActive}
                        onCheckedChange={() => handleToggle(doc.id, doc.isActive)}
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-3">
                    {doc.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 italic">
                        "{doc.description}"
                      </p>
                    )}

                    {/* Keywords Tag List */}
                    {doc.keywords && doc.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <Tag className="h-3 w-3 text-slate-400 mr-0.5" />
                        {doc.keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Extracted content snippet */}
                    {doc.content && (
                      <div className="rounded-md bg-slate-50 p-2 text-[11px] text-slate-600 line-clamp-3 font-mono leading-relaxed border border-slate-100">
                        {doc.content}
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Card Footer */}
                <div className="border-t border-slate-100 p-3 bg-slate-50/40 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5">
                    {doc.canSendAsMedia && doc.fileUrl && (
                      <Badge variant="success" className="text-[9px] flex items-center space-x-1">
                        <Send className="h-2.5 w-2.5" />
                        <span>Kirim ke WA</span>
                      </Badge>
                    )}
                    {doc.fileUrl && (
                      <a
                        href={getFileUrl(doc.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <ExternalLink className="h-3 w-3 mr-0.5" />
                        Buka Berkas
                      </a>
                    )}
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleOpenDelete(doc)}
                    className="h-7 w-7 p-0 cursor-pointer"
                    title="Hapus Dokumen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Dialog Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900">Unggah Dokumen & Brosur AI</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tambahkan file brosur, pricelist PDF, atau katalog agar AI dapat memahami isi dan mengirimkannya ke WhatsApp pelanggan.
            </p>
          </div>
          {/* File Picker */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Pilih Berkas (Gambar JPG/PNG, PDF, atau Teks)
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
              <input
                type="file"
                id="doc-file-input"
                accept="image/*,application/pdf,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="doc-file-input"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <UploadCloud className="h-7 w-7 text-indigo-500 mb-1" />
                <span className="font-semibold text-slate-700">
                  {file ? file.name : 'Klik untuk memilih berkas'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Mendukung Gambar (Brosur Promo), Dokumen PDF (Pricelist), atau TXT hingga 25MB
                </span>
              </label>
            </div>
          </div>

          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Judul Dokumen / Brosur *
              </label>
              <Input
                placeholder="Contoh: Brosur Paket Wedding Silver 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
              <Input
                placeholder="Contoh: Brosur, Pricelist, Menu, SOP"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Deskripsi Singkat untuk AI (Opsional)
            </label>
            <Input
              placeholder="Jelaskan isi gambar/file ini agar AI tahu kapan harus mengirimkannya ke pelanggan"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Kata Kunci Pencocokan (Pisahkan dengan koma)
            </label>
            <Input
              placeholder="Contoh: brosur, paket wedding, foto, pricelist, harga paket"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="text-xs h-9 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Jika pesan pelanggan mengandung kata kunci ini, AI akan memprioritaskan dokumen ini.
            </p>
          </div>

          {/* Auto Send Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="font-semibold text-slate-800">
                Kirim Berkas/Gambar Ini ke WhatsApp Otomatis
              </p>
              <p className="text-[11px] text-slate-500">
                Jika pelanggan meminta foto/brosur/file ini, AI dapat langsung mengirimkannya ke chat WA.
              </p>
            </div>
            <Switch
              checked={canSendAsMedia}
              onCheckedChange={setCanSendAsMedia}
            />
          </div>

          {/* Content / Manual Text Override */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Isi Teks / Ekstraksi Dokumen (Opsional)
            </label>
            <Textarea
              rows={4}
              placeholder="Jika mengunggah PDF, teks akan otomatis diekstrak. Anda juga dapat mengetik atau menambahkan catatan detail di sini..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting || !title.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs"
            >
              {submitting ? 'Mengunggah & Menyimpan...' : 'Simpan ke Pengetahuan AI'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal Konfirmasi Hapus Dokumen */}
      <ConfirmDialog
        open={Boolean(docToDelete)}
        onOpenChange={(open) => !open && setDocToDelete(null)}
        title="Hapus Dokumen"
        variant="danger"
        icon={Trash2}
        confirmText="Hapus Dokumen"
        onConfirm={handleConfirmDelete}
        description={
          <div>
            Apakah Anda yakin ingin menghapus dokumen{' '}
            <strong className="text-slate-900 font-bold">{docToDelete?.title}</strong> dari basis pengetahuan?
            <p className="mt-1.5 text-[11px] text-slate-500">
              Dokumen ini tidak akan lagi digunakan oleh bot AI untuk menjawab atau dikirimkan ke WhatsApp pelanggan.
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
