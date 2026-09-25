import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Bot,
  BookOpen,
  FileText,
  QrCode,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Users,
  User as UserIcon,
  ChevronDown,
  UserCheck,
  LifeBuoy,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export type NavTab =
  | 'chats'
  | 'documents'
  | 'knowledge'
  | 'ai-config'
  | 'users'
  | 'tickets'
  | 'user-documents'
  | 'user-knowledge';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentUser: {
    id: string;
    name: string;
    username?: string | null;
    email: string;
    role: 'ADMIN' | 'USER';
    activeUntil?: string | null;
    isExpired?: boolean;
  } | null;
  waStatus: {
    status: string;
    qrCode: string | null;
    connectedNumber: string | null;
  };
  impersonatedFrom?: any;
  onOpenQrModal: () => void;
  onRestartWa: () => void;
  onLogoutWa: () => void;
  onLogoutUser: () => void;
  onOpenProfileModal: () => void;
  onOpenTicketModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  waStatus,
  impersonatedFrom,
  onOpenQrModal,
  onRestartWa,
  onLogoutWa,
  onLogoutUser,
  onOpenProfileModal,
  onOpenTicketModal,
}) => {
  const isConnected = waStatus.status === 'CONNECTED';
  const isAdmin = currentUser?.role === 'ADMIN' && !impersonatedFrom;
  const showWaControl = currentUser?.role === 'USER' || Boolean(impersonatedFrom);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const userInitials = (currentUser?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 gap-2">
        {/* Brand */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Artemis Agent
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 truncate max-w-[140px] md:max-w-none">
              {currentUser?.name || 'Sesi Mandiri'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 overflow-x-auto rounded-lg bg-slate-100 p-1 py-1 text-xs">
          {isAdmin ? (
            <>
              {/* Tab Admin: Tiket Bantuan */}
              <button
                onClick={() => setActiveTab('tickets')}
                className={`flex items-center space-x-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === 'tickets'
                    ? 'bg-white text-indigo-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LifeBuoy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600" />
                <span>Tiket Bantuan</span>
              </button>

              {/* Tab Admin: Kelola Dokumen Klien */}
              <button
                onClick={() => setActiveTab('user-documents')}
                className={`flex items-center space-x-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === 'user-documents'
                    ? 'bg-white text-indigo-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600" />
                <span className="hidden md:inline">Kelola Dokumen Klien</span>
                <span className="md:hidden">Dokumen</span>
              </button>

              {/* Tab Admin: Kelola FAQ Klien */}
              <button
                onClick={() => setActiveTab('user-knowledge')}
                className={`flex items-center space-x-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === 'user-knowledge'
                    ? 'bg-white text-indigo-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                <span className="hidden md:inline">Kelola FAQ Klien</span>
                <span className="md:hidden">FAQ</span>
              </button>

              {/* Tab Admin: Kelola User */}
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center space-x-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === 'users'
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50'
                }`}
              >
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Kelola User</span>
              </button>

              {/* Tab Admin: Pengaturan AI Master */}
              <button
                onClick={() => setActiveTab('ai-config')}
                className={`flex items-center space-x-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === 'ai-config'
                    ? 'bg-white text-slate-950 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
                <span className="hidden md:inline">Pengaturan AI</span>
                <span className="md:hidden">AI</span>
              </button>
            </>
          ) : (
            <>
              {/* Tab User: Obrolan WhatsApp */}
              <button
                onClick={() => setActiveTab('chats')}
                className={`flex items-center space-x-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === 'chats'
                    ? 'bg-white text-slate-950 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
                <span className="hidden md:inline">Obrolan</span>
                <span className="md:hidden">Chat</span>
              </button>

              {/* Tab User: Dokumen & Brosur */}
              <button
                onClick={() => setActiveTab('documents')}
                className={`flex items-center space-x-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === 'documents'
                    ? 'bg-white text-slate-950 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600" />
                <span className="hidden md:inline">Dokumen & Brosur</span>
                <span className="md:hidden">Berkas</span>
              </button>

              {/* Tab User: FAQ */}
              <button
                onClick={() => setActiveTab('knowledge')}
                className={`flex items-center space-x-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === 'knowledge'
                    ? 'bg-white text-slate-950 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                <span>FAQ</span>
              </button>

              {/* Tab User: Pengaturan AI */}
              <button
                onClick={() => setActiveTab('ai-config')}
                className={`flex items-center space-x-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === 'ai-config'
                    ? 'bg-white text-slate-950 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
                <span className="hidden md:inline">Pengaturan AI</span>
                <span className="md:hidden">AI</span>
              </button>
            </>
          )}
        </nav>

        {/* Right Section: WhatsApp Status & User Profile */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* WhatsApp Status (Hanya untuk User atau impersonasi) */}
          {showWaControl && (
            isConnected ? (
              <div className="flex items-center space-x-1.5">
                <Badge variant="success" className="flex items-center space-x-1 py-1 px-2 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">{waStatus.connectedNumber || 'WA Terhubung'}</span>
                  <span className="sm:hidden">WA Aktif</span>
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRestartWa}
                  title="Muat Ulang WhatsApp"
                  className="text-xs h-8 px-2 text-slate-600"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onLogoutWa}
                  title="Putuskan WhatsApp"
                  className="text-xs h-8 px-2"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <Badge variant="warning" className="hidden sm:flex items-center space-x-1 py-1 px-2 text-[11px]">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>
                    {waStatus.status === 'QR_READY'
                      ? 'QR Siap'
                      : waStatus.status === 'INITIALIZING'
                      ? 'Memuat...'
                      : 'Belum Terhubung'}
                  </span>
                </Badge>
                <Button
                  variant="default"
                  size="sm"
                  onClick={onOpenQrModal}
                  className="text-xs h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
                >
                  <QrCode className="h-3.5 w-3.5 mr-1" />
                  <span>Scan WA</span>
                </Button>
              </div>
            )
          )}

          {/* User Profile Avatar & Dropdown */}
          <div className="relative border-l border-slate-200 pl-2 sm:pl-3" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              type="button"
              aria-expanded={dropdownOpen}
              className="flex items-center space-x-2 rounded-xl p-1 sm:px-2 sm:py-1 hover:bg-slate-100/80 transition-all border border-transparent hover:border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 group cursor-pointer"
            >
              {/* Avatar Bulat Bergradien dengan Inisial Foto/Icon */}
              <div className="relative shrink-0">
                <div
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-white font-bold text-xs shadow-sm transition-all duration-200 group-hover:scale-105 ${
                    isAdmin
                      ? 'bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 shadow-indigo-500/25 ring-2 ring-indigo-500/20'
                      : 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-700 shadow-emerald-500/25 ring-2 ring-emerald-500/20'
                  }`}
                >
                  {userInitials}
                </div>
                {/* Indikator Online Status */}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              {/* Teks Nama & Role (Desktop) */}
              <div className="hidden md:flex flex-col text-left max-w-[130px] lg:max-w-[160px]">
                <span className="text-xs font-bold text-slate-800 leading-tight truncate">
                  {currentUser?.name || 'Pengguna'}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                  {currentUser?.role === 'ADMIN' ? 'Admin' : 'Pengguna'}
                </span>
              </div>

              {/* Panah Dropdown Chevron */}
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-hover:text-slate-600 ${
                  dropdownOpen ? 'rotate-180 text-slate-700' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Box */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                {/* Ringkasan Profil Pengguna */}
                <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-50/90 border border-slate-100">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold text-sm shadow-xs ${
                      isAdmin
                        ? 'bg-gradient-to-tr from-indigo-600 to-purple-600'
                        : 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                    }`}
                  >
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser?.name}
                    </p>
                    {currentUser?.username && (
                      <p className="text-[11px] font-semibold text-emerald-600 truncate">
                        @{currentUser.username}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 truncate">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>

                {/* Badge Tipe Akun & Masa Aktif */}
                <div className="px-2.5 pt-2 pb-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Tipe Akun</span>
                    <Badge
                      variant={isAdmin ? 'default' : 'success'}
                      className={`text-[10px] font-semibold py-0.5 px-2 ${
                        isAdmin ? 'bg-indigo-600 text-white border-transparent' : ''
                      }`}
                    >
                      {isAdmin ? 'Super Admin' : 'Klien Pengguna'}
                    </Badge>
                  </div>
                  {!isAdmin && currentUser?.activeUntil && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[10px] text-slate-400">Masa Aktif:</span>
                      <span className={`font-semibold ${currentUser.isExpired ? 'text-red-600' : 'text-emerald-600'}`}>
                        {new Date(currentUser.activeUntil).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 my-1" />

                {/* Pilihan Menu Dropdown */}
                <div className="space-y-0.5">
                  {/* Bantuan / Kirim Tiket untuk User */}
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenTicketModal();
                    }}
                    className="w-full flex items-center space-x-2.5 px-2.5 py-2 text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-xl transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 transition-colors shrink-0">
                      <LifeBuoy className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-emerald-950">Kirim Tiket / Bantuan</div>
                      <div className="text-[10px] text-emerald-600 font-normal truncate">
                        Tanya admin atau minta perpanjang
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenProfileModal();
                    }}
                    className="w-full flex items-center space-x-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors shrink-0">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800">Edit Profil</div>
                      <div className="text-[10px] text-slate-400 font-normal truncate">
                        Nama, username & kata sandi
                      </div>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogoutUser();
                    }}
                    className="w-full flex items-center space-x-2.5 px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 group-hover:bg-red-100 transition-colors shrink-0">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">Keluar Akun</div>
                      <div className="text-[10px] text-red-400 font-normal truncate">
                        Akhiri sesi akun di browser ini
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
