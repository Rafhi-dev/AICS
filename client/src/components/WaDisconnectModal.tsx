import React from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Smartphone, LogOut, AlertCircle } from 'lucide-react';

interface WaDisconnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  connectedNumber?: string | null;
  loading?: boolean;
}

export const WaDisconnectModal: React.FC<WaDisconnectModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  connectedNumber,
  loading = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4 text-center sm:text-left">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-xs ring-4 ring-amber-50">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Putuskan Sambungan WhatsApp
            </h3>
            <p className="text-xs text-slate-500">
              {connectedNumber ? `Nomor: +${connectedNumber}` : 'Sesi WhatsApp Web'}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3.5 text-xs text-amber-900 leading-relaxed space-y-1.5">
          <div className="flex items-center space-x-1.5 font-semibold text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Pemberitahuan:</span>
          </div>
          <p className="text-[11px] text-amber-800">
            Memutuskan WhatsApp akan menghentikan bot AI Artemis dari membalas pesan pelanggan secara otomatis. Anda harus melakukan <strong>Scan QR ulang</strong> untuk mengaktifkannya kembali.
          </p>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs h-9 px-4 text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="bg-red-600 hover:bg-red-700 text-xs h-9 px-4 font-semibold text-white shadow-sm flex items-center space-x-1.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{loading ? 'Memutuskan...' : 'Ya, Putuskan Sesi WA'}</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
