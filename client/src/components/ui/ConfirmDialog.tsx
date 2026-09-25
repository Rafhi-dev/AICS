import React from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  HelpCircle,
  LucideIcon,
} from 'lucide-react';

export type ConfirmVariant = 'primary' | 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: LucideIcon | React.ReactNode;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  isAlert?: boolean; // Jika true, hanya ada 1 tombol (OK / Mengerti)
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'primary',
  icon,
  loading = false,
  onConfirm,
  isAlert = false,
}) => {
  const getTheme = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-100 text-red-600 ring-red-50',
          btnClass: 'bg-red-600 hover:bg-red-700 text-white',
          DefaultIcon: AlertTriangle,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 text-amber-600 ring-amber-50',
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
          DefaultIcon: AlertCircle,
        };
      case 'success':
        return {
          iconBg: 'bg-emerald-100 text-emerald-600 ring-emerald-50',
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          DefaultIcon: CheckCircle2,
        };
      case 'info':
        return {
          iconBg: 'bg-sky-100 text-sky-600 ring-sky-50',
          btnClass: 'bg-sky-600 hover:bg-sky-700 text-white',
          DefaultIcon: Info,
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-indigo-100 text-indigo-600 ring-indigo-50',
          btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
          DefaultIcon: HelpCircle,
        };
    }
  };

  const theme = getTheme();

  const renderIcon = () => {
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function') {
      const CustomIcon = icon as LucideIcon;
      return <CustomIcon className="h-6 w-6" />;
    }
    const Default = theme.DefaultIcon;
    return <Default className="h-6 w-6" />;
  };

  const handleConfirmClick = async () => {
    await onConfirm();
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4 text-center sm:text-left">
        <div className="flex items-center space-x-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs ring-4 ${theme.iconBg}`}
          >
            {renderIcon()}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-600 leading-relaxed">
          {description}
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
          {!isAlert && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 px-4 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="button"
            disabled={loading}
            onClick={handleConfirmClick}
            className={`text-xs h-9 px-4 font-semibold shadow-sm cursor-pointer ${theme.btnClass}`}
          >
            {loading ? 'Memproses...' : confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
