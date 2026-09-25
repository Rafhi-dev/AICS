import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Switch } from './ui/Switch';
import { Badge } from './ui/Badge';
import {
  Bot,
  Save,
  CheckCircle2,
  Sliders,
  Sparkles,
  UserCheck,
  Building2,
  ShieldCheck,
  CalendarClock,
} from 'lucide-react';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface AiConfigProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'USER';
  } | null;
}

const DEEPSEEK_PRESETS = [
  { value: 'deepseek-flash', label: 'deepseek-flash (V4.1-Flash - Rekomendasi CS)' },
  { value: 'deepseek-v4-pro', label: 'deepseek-v4-pro (V4-Pro - Penalaran Mendalam)' },
  { value: 'deepseek-chat', label: 'deepseek-chat (DeepSeek-V3 Legacy)' },
  { value: 'deepseek-reasoner', label: 'deepseek-reasoner (DeepSeek-R1 Legacy)' },
];

const JINA_PRESETS = [
  { value: 'jina-embeddings-v4', label: 'jina-embeddings-v4 (SOTA 2048-dim - Rekomendasi)' },
  { value: 'jina-embeddings-v3', label: 'jina-embeddings-v3 (Multilingual 1024-dim)' },
  { value: 'jina-embeddings-v2-base-en', label: 'jina-embeddings-v2-base-en (English 768-dim)' },
  { value: 'jina-embeddings-v2-base-zh', label: 'jina-embeddings-v2-base-zh (Bilingual 768-dim)' },
  { value: 'jina-embeddings-v2-base-code', label: 'jina-embeddings-v2-base-code (Code 768-dim)' },
];

const GEMINI_PRESETS = [
  { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (Terbaru & Cepat)' },
  { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash (Generasi 2)' },
  { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash (Hemat Kuota)' },
  { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro (Kapasitas Besar)' },
  { value: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite' },
];

export const AiConfig: React.FC<AiConfigProps> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === 'ADMIN';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    businessName: '',
    botMode: 'CUSTOMER_SERVICE' as 'CUSTOMER_SERVICE' | 'PERSONAL_ASSISTANT',
    ownerName: '',
    paInstructions: '',
    systemPrompt: '',
    autoReplyEnabled: true,
    aiProvider: 'DEEPSEEK' as 'DEEPSEEK' | 'GEMINI',
    deepseekApiKey: '',
    deepseekModel: 'deepseek-flash',
    mineruApiToken: '',
    jinaApiKey: '',
    jinaModel: 'jina-embeddings-v3',
    geminiApiKey: '',
    geminiModel: 'gemini-3.5-flash-lite',
    temperature: 0.2,
    maxTokens: 800,
  });

  const [showDeepseekKey, setShowDeepseekKey] = useState(false);
  const [showMineruToken, setShowMineruToken] = useState(false);
  const [showJinaKey, setShowJinaKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  const [customDeepseek, setCustomDeepseek] = useState(false);
  const [customJina, setCustomJina] = useState(false);
  const [customGemini, setCustomGemini] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/config');
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        const dsModel = d.deepseekModel || 'deepseek-flash';
        const jnModel = d.jinaModel || 'jina-embeddings-v3';
        const gmModel = d.geminiModel || 'gemini-3.5-flash-lite';

        setFormData({
          businessName: d.businessName || '',
          botMode: d.botMode || 'CUSTOMER_SERVICE',
          ownerName: d.ownerName || '',
          paInstructions: d.paInstructions || '',
          systemPrompt: d.systemPrompt || '',
          autoReplyEnabled: d.autoReplyEnabled ?? true,
          aiProvider: (d.aiProvider as 'DEEPSEEK' | 'GEMINI') || 'DEEPSEEK',
          deepseekApiKey: d.deepseekApiKey || '',
          deepseekModel: dsModel,
          mineruApiToken: d.mineruApiToken || '',
          jinaApiKey: d.jinaApiKey || '',
          jinaModel: jnModel,
          geminiApiKey: d.geminiApiKey || '',
          geminiModel: gmModel,
          temperature: d.temperature ?? 0.2,
          maxTokens: d.maxTokens ?? 800,
        });

        if (!DEEPSEEK_PRESETS.some((p) => p.value === dsModel)) setCustomDeepseek(true);
        if (!JINA_PRESETS.some((p) => p.value === jnModel)) setCustomJina(true);
        if (!GEMINI_PRESETS.some((p) => p.value === gmModel)) setCustomGemini(true);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await api.put('/config', formData);
      if (res.data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Error saving config:', err);
      setErrorModalMsg('Gagal menyimpan konfigurasi. Silakan periksa koneksi dan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
        Memuat konfigurasi AI...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <form onSubmit={handleSave}>
        <div className="space-y-6">
          {/* Master Switch */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Master Switch Auto-Reply</CardTitle>
                    <CardDescription>
                      Aktifkan atau matikan kemampuan AI membalas otomatis pesan WhatsApp.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <span className="text-xs font-semibold text-slate-800">
                    {formData.autoReplyEnabled ? 'Auto-Reply AKTIF' : 'Auto-Reply NONAKTIF'}
                  </span>
                  <Switch
                    checked={formData.autoReplyEnabled}
                    onCheckedChange={(val) => setFormData({ ...formData, autoReplyEnabled: val })}
                  />
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Persona & Mode Selection (CS vs Personal Assistant) */}
          <Card className="border-indigo-100 shadow-sm">
            <CardHeader className="border-b border-indigo-50 bg-indigo-50/30">
              <div className="flex items-center space-x-2.5">
                <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Pilih Peran & Mode AI (Dual Persona)</CardTitle>
                  <CardDescription>
                    Pilih apakah AI bertindak sebagai Customer Service Toko/Perusahaan atau sebagai Sekretaris Pribadi yang mewakili Anda.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              {/* Mode Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CS Mode Card */}
                <div
                  onClick={() => setFormData({ ...formData, botMode: 'CUSTOMER_SERVICE' })}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    formData.botMode === 'CUSTOMER_SERVICE'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Customer Service Bisnis</h4>
                        <p className="text-[10px] text-slate-500">Mewakili Brand / Perusahaan</p>
                      </div>
                    </div>
                    {formData.botMode === 'CUSTOMER_SERVICE' && (
                      <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    )}
                  </div>
                  <p className="mt-3 text-[11px] text-slate-600 leading-relaxed">
                    AI menjawab seputar katalog produk, harga, jam operasional, dan mengirimkan brosur atas nama bisnis/perusahaan.
                  </p>
                </div>

                {/* PA Mode Card */}
                <div
                  onClick={() => setFormData({ ...formData, botMode: 'PERSONAL_ASSISTANT' })}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    formData.botMode === 'PERSONAL_ASSISTANT'
                      ? 'border-purple-600 bg-purple-50/50 shadow-sm ring-2 ring-purple-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white shadow-sm">
                        <UserCheck className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Personal Assistant / Sekretaris</h4>
                        <p className="text-[10px] text-slate-500">Mewakili Pemilik Pribadi</p>
                      </div>
                    </div>
                    {formData.botMode === 'PERSONAL_ASSISTANT' && (
                      <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    )}
                  </div>
                  <p className="mt-3 text-[11px] text-slate-600 leading-relaxed">
                    AI bertindak seperti sekretaris pribadi Anda: menjelaskan ketersediaan Anda, mencatat pesan/keperluan tamu, dan menjawab ramah atas nama Anda.
                  </p>
                </div>
              </div>

              {/* Conditional Fields based on Mode */}
              {formData.botMode === 'CUSTOMER_SERVICE' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Bisnis / Brand Anda
                  </label>
                  <Input
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Contoh: Toko Online Barokah / PT Solusi Digital"
                    className="text-xs"
                  />
                </div>
              ) : (
                <div className="space-y-4 rounded-xl border border-purple-200 bg-purple-50/30 p-4">
                  <div>
                    <label className="block text-xs font-semibold text-purple-900 mb-1">
                      Nama Pemilik / Atasan yang Diwakili *
                    </label>
                    <Input
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      placeholder="Contoh: Bpk. Budi Santoso / dr. Amanda Sp.A / Ibu Rina"
                      className="text-xs bg-white"
                    />
                    <span className="text-[10px] text-purple-700 mt-1 block">
                      AI akan memperkenalkan diri sebagai asisten dari nama ini.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-purple-900 mb-1">
                      Instruksi Jadwal, Ketersediaan & Pesan Khusus Pemilik
                    </label>
                    <Textarea
                      rows={4}
                      value={formData.paInstructions}
                      onChange={(e) => setFormData({ ...formData, paInstructions: e.target.value })}
                      placeholder="Contoh: Beliau sedang ada workshop s.d jam 16:00. Tolong terima tamu dengan sopan, tanyakan nama dan urusan pentingnya. Untuk janji temu hanya tersedia hari Rabu atau Jumat."
                      className="text-xs bg-white font-mono"
                    />
                    <span className="text-[10px] text-purple-700 mt-1 block">
                      Instruksi ini akan selalu diingat AI saat menjawab orang yang mencari Anda di WhatsApp.
                    </span>
                  </div>
                </div>
              )}

              {/* System Prompt Instructions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tambahan Instruksi Gaya Bahasa & Aturan Khusus (Opsional)
                </label>
                <Textarea
                  rows={4}
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  placeholder="Gunakan bahasa formal/santai, akhiri pesan dengan emotikon sopan, jangan memberikan informasi di luar yang diketahui..."
                  className="font-mono text-xs leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>

          {/* Engine AI & API Keys - KHUSUS SUPER ADMIN */}
          {isAdmin && (
            <Card className="border-indigo-200 bg-indigo-50/10 shadow-sm">
              <CardHeader className="border-b border-indigo-100 bg-indigo-50/40">
                <div className="flex items-center space-x-2.5">
                  <div className="rounded-lg bg-indigo-600 p-2 text-white shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <CardTitle>Pengaturan Engine AI & API Keys</CardTitle>
                      <Badge variant="warning" className="text-[10px] py-0 px-2">Khusus Super Admin</Badge>
                      <Badge variant="success" className="text-[10px] py-0 px-2 bg-emerald-100 text-emerald-700 border-emerald-200">
                        {formData.aiProvider === 'DEEPSEEK' ? 'DeepSeek + MinerU + Jina AI' : 'Gemini Studio Murni'}
                      </Badge>
                    </div>
                    <CardDescription>
                      Pilih penyedia model AI dan masukkan API key Anda secara aman langsung di sini tanpa membagikannya ke publik.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                {/* Provider Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Pilihan Arsitektur AI (Penyedia Balasan Chat)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setFormData({ ...formData, aiProvider: 'DEEPSEEK' })}
                      className={`cursor-pointer rounded-lg border p-3 transition-all ${
                        formData.aiProvider === 'DEEPSEEK'
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">DeepSeek + MinerU + Jina AI</span>
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-700">
                          Hibrida Rekomendasi
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                        Balasan WA via <strong>DeepSeek-V3</strong> yang luwes, pembacaan PDF via <strong>MinerU</strong>, dan vektor RAG via <strong>Jina AI (jina-embeddings-v3)</strong>.
                      </p>
                    </div>

                    <div
                      onClick={() => setFormData({ ...formData, aiProvider: 'GEMINI' })}
                      className={`cursor-pointer rounded-lg border p-3 transition-all ${
                        formData.aiProvider === 'GEMINI'
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Google AI Studio Murni</span>
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">
                          Gemini All-in-One
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                        Seluruh pembalasan, pembacaan PDF native, dan vektor semantik diproses 100% oleh <strong>Google Gemini Flash Lite</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* API Key 1: DeepSeek API Key */}
                {formData.aiProvider === 'DEEPSEEK' && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">
                        1. DeepSeek API Key (Balasan Pesan WhatsApp)
                      </label>
                      <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        Model: {formData.deepseekModel || 'deepseek-flash'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        type={showDeepseekKey ? 'text' : 'password'}
                        value={formData.deepseekApiKey}
                        onChange={(e) => setFormData({ ...formData, deepseekApiKey: e.target.value })}
                        placeholder="sk-..."
                        className="font-mono text-xs flex-1 bg-slate-50"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeepseekKey(!showDeepseekKey)}
                        className="text-xs h-9"
                      >
                        {showDeepseekKey ? 'Sembunyikan' : 'Perlihatkan'}
                      </Button>
                    </div>

                    {/* Opsi Pilih Model DeepSeek */}
                    <div className="pt-2.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-slate-50/80 p-2.5 rounded-lg min-w-0">
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <Sliders className="h-3.5 w-3.5 text-indigo-600" />
                        <span className="text-xs font-semibold text-slate-700">Pilih Model DeepSeek:</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0 w-full md:max-w-md">
                        <select
                          value={customDeepseek ? 'custom' : formData.deepseekModel}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              setCustomDeepseek(true);
                            } else {
                              setCustomDeepseek(false);
                              setFormData({ ...formData, deepseekModel: val });
                            }
                          }}
                          className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full min-w-0 truncate"
                        >
                          {DEEPSEEK_PRESETS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                          <option value="custom">✏️ Model Kustom (Ketik Manual)...</option>
                        </select>
                        {customDeepseek && (
                          <Input
                            type="text"
                            placeholder="misal: deepseek-v4"
                            value={formData.deepseekModel}
                            onChange={(e) => setFormData({ ...formData, deepseekModel: e.target.value })}
                            className="font-mono text-xs h-8 w-full sm:w-44 bg-white shrink-0"
                          />
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-500 block">
                      Kunci API dari <a href="https://platform.deepseek.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline">platform.deepseek.com</a>. Cek dokumentasi di <a href="https://api-docs.deepseek.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-medium">api-docs.deepseek.com</a>. Jika kosong, bot otomatis fallback ke Gemini.
                    </span>
                  </div>
                )}

                {/* API Key 2: MinerU API Token */}
                {formData.aiProvider === 'DEEPSEEK' && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">
                        2. MinerU Cloud API Token (Ekstraksi Berkas PDF Presisi Tinggi)
                      </label>
                      <span className="text-[10px] text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Parser: MinerU v4 Cloud
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        type={showMineruToken ? 'text' : 'password'}
                        value={formData.mineruApiToken}
                        onChange={(e) => setFormData({ ...formData, mineruApiToken: e.target.value })}
                        placeholder="Masukkan token MinerU Anda..."
                        className="font-mono text-xs flex-1 bg-slate-50"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMineruToken(!showMineruToken)}
                        className="text-xs h-9"
                      >
                        {showMineruToken ? 'Sembunyikan' : 'Perlihatkan'}
                      </Button>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      Dapatkan token di <a href="https://mineru.net/apiManage" target="_blank" rel="noreferrer" className="text-indigo-600 underline">mineru.net/apiManage</a>. Jika belum diisi, ekstraksi otomatis menggunakan engine Google Multimodal.
                    </span>
                  </div>
                )}

                {/* API Key 3: Jina AI API Key (Khusus Mode DeepSeek) */}
                {formData.aiProvider === 'DEEPSEEK' && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">
                        3. Jina AI API Key (Engine Vektor RAG Embedding)
                      </label>
                      <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        Model: {formData.jinaModel || 'jina-embeddings-v4'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        type={showJinaKey ? 'text' : 'password'}
                        value={formData.jinaApiKey}
                        onChange={(e) => setFormData({ ...formData, jinaApiKey: e.target.value })}
                        placeholder="jina_..."
                        className="font-mono text-xs flex-1 bg-slate-50"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowJinaKey(!showJinaKey)}
                        className="text-xs h-9"
                      >
                        {showJinaKey ? 'Sembunyikan' : 'Perlihatkan'}
                      </Button>
                    </div>

                    {/* Opsi Pilih Model Jina AI */}
                    <div className="pt-2.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-slate-50/80 p-2.5 rounded-lg min-w-0">
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <Sliders className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-xs font-semibold text-slate-700">Pilih Model Embedding Jina:</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0 w-full md:max-w-md">
                        <select
                          value={customJina ? 'custom' : formData.jinaModel}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              setCustomJina(true);
                            } else {
                              setCustomJina(false);
                              setFormData({ ...formData, jinaModel: val });
                            }
                          }}
                          className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full min-w-0 truncate"
                        >
                          {JINA_PRESETS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                          <option value="custom">✏️ Model Kustom (Ketik Manual)...</option>
                        </select>
                        {customJina && (
                          <Input
                            type="text"
                            placeholder="misal: jina-embeddings-v4"
                            value={formData.jinaModel}
                            onChange={(e) => setFormData({ ...formData, jinaModel: e.target.value })}
                            className="font-mono text-xs h-8 w-full sm:w-44 bg-white shrink-0"
                          />
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-500 block">
                      Dapatkan API Key gratis di <a href="https://jina.ai" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">jina.ai</a> (Dapat <strong>10 Juta Token Gratis</strong> langsung, tanpa kartu kredit). Mendukung model terbaru <a href="https://jina.ai/models/jina-embeddings-v4" target="_blank" rel="noreferrer" className="text-blue-600 font-mono underline font-semibold">jina-embeddings-v4</a> (2048-dim, multimodal) & <code>jina-embeddings-v3</code> khusus akurasi RAG tinggi.
                    </span>
                  </div>
                )}

                {/* API Key 4 (atau Utama jika Gemini): Google AI Studio API Key */}
                <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800">
                      {formData.aiProvider === 'DEEPSEEK'
                        ? '4. Google AI Studio API Key (Cadangan Fallback Otomatis)'
                        : 'Google AI Studio API Key (Engine Utama Gemini)'}
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      Model: {formData.geminiModel || 'gemini-3.5-flash-lite'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={formData.geminiApiKey}
                      onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                      placeholder="AQ... atau AIza..."
                      className="font-mono text-xs flex-1 bg-slate-50"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="text-xs h-9"
                    >
                      {showGeminiKey ? 'Sembunyikan' : 'Perlihatkan'}
                    </Button>
                  </div>

                  {/* Opsi Pilih Model Gemini */}
                  <div className="pt-2.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-slate-50/80 p-2.5 rounded-lg min-w-0">
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <Sliders className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs font-semibold text-slate-700">Pilih Model Gemini:</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0 w-full md:max-w-md">
                      <select
                        value={customGemini ? 'custom' : formData.geminiModel}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setCustomGemini(true);
                          } else {
                            setCustomGemini(false);
                            setFormData({ ...formData, geminiModel: val });
                          }
                        }}
                        className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full min-w-0 truncate"
                      >
                        {GEMINI_PRESETS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                        <option value="custom">✏️ Model Kustom (Ketik Manual)...</option>
                      </select>
                      {customGemini && (
                        <Input
                          type="text"
                          placeholder="misal: gemini-2.5-pro"
                          value={formData.geminiModel}
                          onChange={(e) => setFormData({ ...formData, geminiModel: e.target.value })}
                          className="font-mono text-xs h-8 w-full sm:w-44 bg-white shrink-0"
                        />
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-500 block">
                    {formData.aiProvider === 'DEEPSEEK'
                      ? 'Digunakan sebagai fallback cadangan otomatis jika kuota DeepSeek/Jina habis atau server AI pihak ketiga mengalami kendala.'
                      : 'Diperlukan untuk komputasi balasan chat dan vektor semantik (gemini-embedding-001). Kredensial disimpan aman di database.'}
                  </span>
                </div>

                {/* Grid Parameter: Temperature & Max Tokens */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Temperature ({formData.temperature})
                      </label>
                      <span className="text-[10px] text-emerald-600 font-medium">
                        {formData.temperature <= 0.3 ? 'Akurat & Anti-Halusinasi' : formData.temperature <= 0.6 ? 'Seimbang' : 'Kreatif'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={formData.temperature}
                      onChange={(e) =>
                        setFormData({ ...formData, temperature: parseFloat(e.target.value) })
                      }
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0.0 (Presisi)</span>
                      <span className="text-indigo-600 font-semibold">0.2 (Rekomendasi CS)</span>
                      <span>1.0 (Kreatif)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Max Tokens (Panjang Balasan WhatsApp)
                    </label>
                    <Input
                      type="number"
                      value={formData.maxTokens}
                      onChange={(e) =>
                        setFormData({ ...formData, maxTokens: parseInt(e.target.value, 10) })
                      }
                      className="text-xs font-mono bg-white"
                    />
                    <span className="text-[10px] text-slate-400">Rekomendasi: 800 token (~200 - 400 kata per pesan)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Save Bar - Dapat diakses oleh semua pengguna (Admin & User) */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4">
              {savedSuccess ? (
                <div className="flex items-center space-x-1.5 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Pengaturan berhasil disimpan ke database Neon PostgreSQL!</span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">
                  Perubahan akan langsung diterapkan ke pesan WhatsApp berikutnya secara real-time.
                </div>
              )}

              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs px-6 py-2 shadow-sm shrink-0 w-full sm:w-auto"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Modal Pemberitahuan Error */}
      <ConfirmDialog
        open={Boolean(errorModalMsg)}
        onOpenChange={(open) => !open && setErrorModalMsg(null)}
        title="Gagal Menyimpan"
        variant="danger"
        isAlert
        confirmText="Mengerti"
        onConfirm={() => setErrorModalMsg(null)}
        description={<span className="text-red-700 font-medium">{errorModalMsg}</span>}
      />
    </div>
  );
};
