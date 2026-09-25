import React from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { QrCode, AlertCircle, ArrowRight } from 'lucide-react';

interface QrNoticeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanNow: () => void;
  menuName?: string;
}

export const QrNoticeModal: React.FC<QrNoticeModalProps> = ({
  open,
  onOpenChange,
  onScanNow,
  menuName = 'fitur ini',
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="text-center py-2 space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertCircle className="h-6 w-6" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-900">
            Perlu Scan QR WhatsApp
          </h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            WhatsApp Anda saat ini belum terhubung. Anda harus melakukan scan QR Code WhatsApp terlebih dahulu untuk mengaktifkan dan menggunakan menu <strong>{menuName}</strong>.
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-left text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">Kenapa harus scan QR?</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Bot AI Artemis memerlukan nomor WhatsApp aktif agar dapat menerima pesan pelanggan dan mengirimkan jawaban otomatis secara real-time.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs order-2 sm:order-1"
          >
            Tutup
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onScanNow();
            }}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs order-1 sm:order-2 shadow-sm"
          >
            <QrCode className="h-3.5 w-3.5 mr-1.5" />
            <span>Scan QR Sekarang</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
