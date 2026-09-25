import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Loader2, RefreshCw, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';

interface QrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  waStatus: {
    status: string;
    qrCode: string | null;
    connectedNumber: string | null;
  };
  onRestart: () => void;
}

export const QrModal: React.FC<QrModalProps> = ({
  open,
  onOpenChange,
  waStatus,
  onRestart,
}) => {
  const isQrReady = waStatus.status === 'QR_READY' && !!waStatus.qrCode;
  const isConnected = waStatus.status === 'CONNECTED';
  const isError = waStatus.status === 'ERROR';
  const isInitializing = waStatus.status === 'INITIALIZING' || waStatus.status === 'AUTHENTICATING';

  // Check if qrCode is already a data URL (image) or raw text
  const isImageData = waStatus.qrCode?.startsWith('data:image');

  // Otomatis menutup popup saat scan berhasil di HP
  useEffect(() => {
    if (open && isConnected) {
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, 1200); // Memberikan feedback visual 1.2 detik sebelum auto-close
      return () => clearTimeout(timer);
    }
  }, [open, isConnected, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="text-center">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">Hubungkan WhatsApp</h3>
        <p className="mt-1 text-xs text-slate-500">
          Scan QR Code menggunakan aplikasi WhatsApp di ponsel Anda untuk mengaktifkan AI Customer Service.
        </p>

        {/* QR Code Container */}
        <div className="my-4 sm:my-6 flex min-h-[240px] sm:min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
          {isError ? (
            <div className="flex flex-col items-center space-y-3 text-red-600 py-3 animate-in fade-in">
              <div className="rounded-full bg-red-100 p-3 text-red-600">
                <AlertCircle className="h-10 w-10" />
              </div>
              <div className="text-sm font-bold text-slate-800">
                Gagal Menghubungkan WhatsApp
              </div>
              <p className="text-xs text-slate-600 text-center max-w-xs leading-relaxed">
                Sesi WhatsApp mengalami kendala inisialisasi. Klik tombol di bawah untuk memuat ulang sesi browser.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onRestart}
                className="mt-1 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Muat Ulang Sesi Sekarang
              </Button>
            </div>
          ) : isConnected ? (
            <div className="flex flex-col items-center space-y-3 text-emerald-600 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="h-14 w-14 text-emerald-600" />
              <div className="text-sm font-bold">WhatsApp Berhasil Terhubung!</div>
              <div className="text-xs text-slate-600 font-mono">{waStatus.connectedNumber}</div>
              <span className="text-[11px] text-slate-400">Jendela ini akan otomatis menutup...</span>
            </div>
          ) : waStatus.status === 'AUTHENTICATING' ? (
            <div className="flex flex-col items-center space-y-3 text-indigo-700 animate-in fade-in py-4">
              <div className="rounded-full bg-indigo-100 p-3 text-indigo-600 animate-pulse">
                <Smartphone className="h-10 w-10" />
              </div>
              <div className="text-sm font-bold text-slate-800">
                ✅ QR Code Terbaca di HP!
              </div>
              <p className="text-xs text-slate-600 text-center max-w-xs leading-relaxed">
                Sedang menyinkronkan kunci enkripsi dan pesan WhatsApp dengan server...
              </p>
              <div className="flex items-center space-x-2 text-[11px] text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Menyelesaikan proses sinkronisasi</span>
              </div>
            </div>
          ) : isQrReady ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-xl bg-white p-2.5 sm:p-3 shadow-md border border-slate-100">
                {isImageData ? (
                  <img
                    src={waStatus.qrCode!}
                    alt="WhatsApp QR Code"
                    className="h-44 w-44 sm:h-52 sm:w-52 object-contain"
                  />
                ) : (
                  <QRCodeSVG
                    value={waStatus.qrCode!}
                    size={180}
                    level="M"
                    includeMargin={false}
                  />
                )}
              </div>
              <div className="flex items-center space-x-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>QR Code aktif, siap dipindai di WhatsApp HP</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3 text-slate-500 py-4">
              <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-emerald-600" />
              <p className="text-xs font-medium">
                {isInitializing
                  ? 'Sedang menyiapkan peramban & sesi WhatsApp...'
                  : 'Menunggu QR Code dari WhatsApp Web...'}
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Proses ini memerlukan beberapa detik saat browser pertama kali diluncurkan.
              </p>
              <button
                type="button"
                onClick={onRestart}
                className="mt-2 text-[11px] text-emerald-600 hover:text-emerald-700 underline font-medium"
              >
                Muat ulang sesi jika tidak kunjung muncul
              </button>
            </div>
          )}
        </div>

        {/* Petunjuk Langkah */}
        <div className="rounded-lg bg-slate-100 p-3 text-left text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
            <Smartphone className="h-4 w-4 text-slate-700" />
            <span>Cara Menghubungkan di HP:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 pl-1">
            <li>Buka aplikasi WhatsApp di ponsel Anda</li>
            <li>Ketuk ikon titik tiga di sudut kanan atas (atau Pengaturan di iPhone)</li>
            <li>Pilih <strong>Perangkat Tertaut (Linked Devices)</strong></li>
            <li>Ketuk tombol <strong>Tautkan Perangkat</strong> dan arahkan kamera ke QR Code di atas</li>
          </ol>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRestart}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Muat Ulang QR
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Tutup
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
