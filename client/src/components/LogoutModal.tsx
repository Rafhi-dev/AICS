import React from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { LogOut } from 'lucide-react';

interface LogoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  userName?: string;
  loading?: boolean;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  userName,
  loading = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4 text-center sm:text-left">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-xs ring-4 ring-red-50">
            <LogOut className="h-6 w-6 ml-0.5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Konfirmasi Keluar Akun
            </h3>
            <p className="text-xs text-slate-500">
              Akhiri sesi akun di browser ini
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-600 leading-relaxed">
          Apakah Anda yakin ingin keluar dari akun{' '}
          <strong className="text-slate-900 font-semibold">{userName || 'ini'}</strong>?
          <p className="mt-1.5 text-[11px] text-slate-500">
            Untuk mengakses kembali dasbor dan mengelola layanan, Anda perlu memasukkan email/username dan kata sandi Anda kembali.
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
            <span>Ya, Keluar Akun</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
