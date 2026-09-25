import React, { useState } from 'react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Dialog } from './ui/Dialog';
import { Bot, Lock, User, AlertCircle, ArrowRight, ShieldAlert, AlertTriangle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      if (res.data.success && res.data.data) {
        const { token, user } = res.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        onLoginSuccess(user);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (!err.response) {
        setError(
          'Tidak dapat terhubung ke server backend (Network / Timeout Error). Pastikan backend di Railway sudah aktif dan berjalan normal.'
        );
      } else {
        setError(
          err.response?.data?.error ||
            'Gagal masuk. Periksa kembali email/username dan password Anda.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/30">
            <Bot className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Artemis Agent</h1>
          <p className="text-xs text-slate-400">
            Platform Customer Service & Personal Assistant AI Multi-Tenant
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-700/80 bg-white/95 backdrop-blur shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1 pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Masuk ke Akun Anda</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Silakan masukkan email atau username beserta kata sandi akun Anda.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-5">
              {/* Error Alert */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start space-x-2 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email / Username */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Email atau Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="nama@perusahaan.com atau username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    autoComplete="username"
                    className="pl-9 h-10 text-xs bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Kata Sandi (Password)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pl-9 h-10 text-xs bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Disclaimer Notice Box */}
              <div className="rounded-xl bg-amber-50/90 border border-amber-200 p-3 text-left space-y-1.5">
                <div className="flex items-center space-x-1.5 text-amber-800 font-semibold text-xs">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Perhatian: Unofficial & Use At Your Own Risk</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Artemis Agent menggunakan otomasi WhatsApp tidak resmi (unofficial API). Penggunaan sistem memiliki potensi risiko nomor terblokir (banned) dan sepenuhnya menjadi tanggung jawab masing-masing pengguna (<em>own your risk</em>).
                </p>
                <button
                  type="button"
                  onClick={() => setShowDisclaimerModal(true)}
                  className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold underline cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Baca Penafian & Rincian Risiko Lengkap</span>
                </button>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-2 pb-6">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 shadow-md shadow-emerald-600/20"
              >
                {loading ? (
                  'Memverifikasi...'
                ) : (
                  <span className="flex items-center justify-center space-x-1.5">
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Disclaimer Popup Modal */}
        <Dialog open={showDisclaimerModal} onOpenChange={setShowDisclaimerModal}>
          <div className="space-y-4 py-1 text-left">
            <div className="flex items-start space-x-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Pemberitahuan & Penafian (Disclaimer)
                </h3>
                <p className="text-xs text-amber-700 font-semibold mt-0.5">
                  Layanan WhatsApp Unofficial — Use At Your Own Risk
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed border-y border-slate-100 py-3">
              <div className="rounded-lg bg-amber-50/80 border border-amber-200/90 p-3 space-y-1">
                <p className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  1. Layanan Tidak Resmi (Unofficial API)
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Artemis Agent beroperasi menggunakan protokol otomasi WhatsApp Web pihak ketiga (unofficial). Layanan ini <strong>TIDAK berafiliasi, didukung, disponsori, atau disetujui oleh WhatsApp LLC maupun Meta Platforms Inc.</strong>
                </p>
              </div>

              <div className="rounded-lg bg-rose-50/80 border border-rose-200/90 p-3 space-y-1">
                <p className="font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  2. Memiliki Risiko Pemblokiran Nomor (Risk of Ban)
                </p>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Penggunaan otomasi WhatsApp membawa potensi risiko nomor WhatsApp Anda terkena sanksi pemblokiran (<em>banned</em>) baik sementara maupun permanen oleh sistem keamanan Meta, khususnya jika disalahgunakan untuk spam, blast massal, atau dilaporkan oleh banyak penerima pesan.
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                  3. Tanggung Jawab Pengguna (Own Your Risk)
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Seluruh keputusan, operasional percakapan, serta risiko pemblokiran nomor WhatsApp sepenuhnya menjadi tanggung jawab dan pertimbangan pribadi Anda (<em>use at your own risk</em>). Sangat disarankan tidak memakai nomor pribadi utama yang krusial.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                onClick={() => setShowDisclaimerModal(false)}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 shadow-sm"
              >
                Saya Mengerti & Tanggung Risikonya
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    </div>
  );
};
