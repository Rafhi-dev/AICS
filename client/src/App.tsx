import React, { useState, useEffect } from 'react';
import { Header, NavTab } from './components/Header';
import { QrModal } from './components/QrModal';
import { QrNoticeModal } from './components/QrNoticeModal';
import { ChatInbox } from './components/ChatInbox';
import { AiConfig } from './components/AiConfig';
import { KnowledgeBase } from './components/KnowledgeBase';
import { DocumentKnowledge } from './components/DocumentKnowledge';
import { UserManagement } from './components/UserManagement';
import { AdminTicketDesk } from './components/AdminTicketDesk';
import { AdminUserDocuments } from './components/AdminUserDocuments';
import { AdminUserKnowledge } from './components/AdminUserKnowledge';
import { SupportTicketModal } from './components/SupportTicketModal';
import { LogoutModal } from './components/LogoutModal';
import { WaDisconnectModal } from './components/WaDisconnectModal';
import { Login } from './components/Login';
import { ProfileModal } from './components/ProfileModal';
import { Button } from './components/ui/Button';
import { api } from './lib/api';
import { socket } from './lib/socket';
import { Eye, LogOut, AlertCircle, QrCode, LifeBuoy } from 'lucide-react';

const TAB_NAMES: Record<NavTab, string> = {
  chats: 'Obrolan WhatsApp',
  documents: 'Dokumen & Brosur',
  knowledge: 'FAQ / Knowledge Base',
  'ai-config': 'Pengaturan AI',
  users: 'Kelola Pengguna',
  tickets: 'Tiket Bantuan',
  'user-documents': 'Kelola Dokumen Klien',
  'user-knowledge': 'Kelola FAQ Klien',
};

export interface CurrentUser {
  id: string;
  name: string;
  username?: string | null;
  email: string;
  role: 'ADMIN' | 'USER';
  activeUntil?: string | null;
  isExpired?: boolean;
}

export function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [impersonatedFrom, setImpersonatedFrom] = useState<CurrentUser | null>(() => {
    const saved = localStorage.getItem('impersonatedFrom');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.role === 'ADMIN' && !localStorage.getItem('impersonatedFrom')) {
          return 'tickets';
        }
      } catch {}
    }
    return 'chats';
  });
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrNoticeOpen, setQrNoticeOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [waDisconnectModalOpen, setWaDisconnectModalOpen] = useState(false);
  const [disconnectingWa, setDisconnectingWa] = useState(false);
  const [selectedMenuName, setSelectedMenuName] = useState('fitur ini');
  const [waStatus, setWaStatus] = useState<{
    status: string;
    qrCode: string | null;
    connectedNumber: string | null;
  }>({
    status: 'INITIALIZING',
    qrCode: null,
    connectedNumber: null,
  });

  // Ambil status WhatsApp milik user yang sedang aktif
  const fetchStatus = async () => {
    if (!currentUser) return;
    try {
      const res = await api.get('/wa/status');
      if (res.data.success && res.data.data) {
        setWaStatus(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching WA status:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchStatus();

      // Sinkronisasi data profil & masa aktif terbaru dari database
      api.get('/auth/me').then((res) => {
        if (res.data.success && res.data.data) {
          const fresh = res.data.data;
          setCurrentUser((prev) => (prev ? { ...prev, ...fresh } : fresh));
          localStorage.setItem('user', JSON.stringify({ ...currentUser, ...fresh }));
        }
      }).catch(() => {});

      // Gabung ke Socket.io room khusus user ini
      socket.emit('join_user', currentUser.id);

      // Dengarkan status WhatsApp khusus user ini
      const handleWaStatus = (status: any) => {
        setWaStatus(status);
      };

      socket.on('wa_status', handleWaStatus);

      return () => {
        socket.off('wa_status', handleWaStatus);
      };
    }
  }, [currentUser?.id, impersonatedFrom]);

  // Tangani logout otomatis jika token kedaluwarsa atau diputus oleh Admin
  useEffect(() => {
    const handleAuthLogout = () => {
      setCurrentUser(null);
      setImpersonatedFrom(null);
    };

    window.addEventListener('auth_logout', handleAuthLogout);
    return () => {
      window.removeEventListener('auth_logout', handleAuthLogout);
    };
  }, []);

  const handleRestartWa = async () => {
    try {
      setQrModalOpen(true);
      await api.post('/wa/restart');
    } catch (err) {
      console.error('Error restarting WA:', err);
    }
  };

  const handleOpenLogoutWa = () => {
    setWaDisconnectModalOpen(true);
  };

  const handleConfirmLogoutWa = async () => {
    try {
      setDisconnectingWa(true);
      await api.post('/wa/logout');
      setWaDisconnectModalOpen(false);
    } catch (err) {
      console.error('Error logging out WA:', err);
    } finally {
      setDisconnectingWa(false);
    }
  };

  const handleOpenLogoutUser = () => {
    setLogoutModalOpen(true);
  };

  const handleConfirmLogoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('impersonatedFrom');
    setCurrentUser(null);
    setImpersonatedFrom(null);
    setLogoutModalOpen(false);
  };

  const handleProfileUpdated = (updatedUser: CurrentUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Handler saat Admin meng-impersonate akun klien
  const handleImpersonate = (token: string, targetUser: CurrentUser) => {
    const currentToken = localStorage.getItem('token');
    localStorage.setItem('adminToken', currentToken || '');
    localStorage.setItem('impersonatedFrom', JSON.stringify(currentUser));
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(targetUser));

    setImpersonatedFrom(currentUser);
    setCurrentUser(targetUser);
    setActiveTab('chats');
    setQrModalOpen(false);
    setWaStatus({ status: 'INITIALIZING', qrCode: null, connectedNumber: null });
  };

  // Handler saat Admin berhenti meng-impersonate dan kembali ke akun Admin
  const handleStopImpersonating = () => {
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('impersonatedFrom');
    if (adminToken && adminUser) {
      localStorage.setItem('token', adminToken);
      localStorage.setItem('user', adminUser);
      localStorage.removeItem('adminToken');
      localStorage.removeItem('impersonatedFrom');

      const parsedAdmin = JSON.parse(adminUser);
      setImpersonatedFrom(null);
      setCurrentUser(parsedAdmin);
      setActiveTab('users');
      setQrModalOpen(false);
      setWaStatus({ status: 'INITIALIZING', qrCode: null, connectedNumber: null });
    }
  };

  const handleOpenQrModal = () => {
    setQrModalOpen(true);
    if (waStatus.status === 'DISCONNECTED') {
      api.post('/wa/init').catch(() => {});
    }
  };

  const handleTabChange = (tab: NavTab) => {
    const isConnected = waStatus.status === 'CONNECTED';
    const isCurrentlyImpersonated = Boolean(impersonatedFrom || localStorage.getItem('impersonatedFrom'));
    const isRegularUser = currentUser?.role === 'USER' && !isCurrentlyImpersonated;

    if (isRegularUser && !isConnected) {
      setSelectedMenuName(TAB_NAMES[tab] || 'menu ini');
      setQrNoticeOpen(true);
    }
    setActiveTab(tab);
  };

  // Jika belum login, tampilkan halaman Login
  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Sticky Banner jika Sedang Mode Impersonate */}
      {impersonatedFrom && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-md">
          <div className="flex items-center space-x-2 text-xs">
            <Eye className="h-4 w-4 shrink-0 animate-pulse text-amber-200" />
            <span>
              <strong>Mode Impersonasi Aktif:</strong> Anda sedang melihat & mengelola dashboard sebagai{' '}
              <strong>{currentUser.name}</strong> ({currentUser.email}).
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleStopImpersonating}
            className="bg-white text-orange-800 hover:bg-amber-50 text-xs h-7 px-3 font-bold shadow-xs whitespace-nowrap self-end sm:self-auto"
          >
            <LogOut className="h-3 w-3 mr-1 text-orange-700" />
            Kembali ke Akun Admin
          </Button>
        </div>
      )}

      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        currentUser={currentUser}
        waStatus={waStatus}
        impersonatedFrom={impersonatedFrom}
        onOpenQrModal={handleOpenQrModal}
        onRestartWa={handleRestartWa}
        onLogoutWa={handleOpenLogoutWa}
        onLogoutUser={handleOpenLogoutUser}
        onOpenProfileModal={() => setProfileModalOpen(true)}
        onOpenTicketModal={() => setTicketModalOpen(true)}
      />

      {/* Banner Peringatan Akun Kedaluwarsa untuk User */}
      {currentUser.role === 'USER' && currentUser.isExpired && (
        <div className="bg-red-600 text-white px-4 py-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="h-5 w-5 text-red-200 shrink-0" />
            <div>
              <p className="font-bold text-white text-sm">
                Masa Aktif Akun Anda Telah Habis
              </p>
              <p className="text-red-100 text-[11px] mt-0.5">
                Fitur operasional (WhatsApp, balas pesan AI, upload dokumen, dan FAQ) terkunci sementara. Silakan hubungi Admin atau ajukan tiket bantuan.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setTicketModalOpen(true)}
            className="bg-white text-red-700 hover:bg-red-50 text-xs h-8 px-3.5 font-bold whitespace-nowrap self-start sm:self-auto shadow-xs cursor-pointer"
          >
            <LifeBuoy className="h-4 w-4 mr-1.5 text-red-600" />
            Kirim Tiket Perpanjangan
          </Button>
        </div>
      )}

      {/* Banner Peringatan jika WhatsApp Belum Terhubung untuk User Biasa (Belum Expired) */}
      {waStatus.status !== 'CONNECTED' && currentUser.role === 'USER' && !impersonatedFrom && !currentUser.isExpired && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>WhatsApp Belum Terhubung:</strong> Scan QR Code WhatsApp Anda sekarang untuk mengaktifkan bot AI Artemis dan sinkronisasi pesan.
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleOpenQrModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3 font-semibold whitespace-nowrap self-start sm:self-auto shadow-xs"
          >
            <QrCode className="h-3.5 w-3.5 mr-1" />
            Scan QR Sekarang
          </Button>
        </div>
      )}

      <main className="flex-1">
        {/* Tab-tab untuk User */}
        {activeTab === 'chats' && <ChatInbox />}
        {activeTab === 'documents' && <DocumentKnowledge />}
        {activeTab === 'knowledge' && <KnowledgeBase />}
        {activeTab === 'ai-config' && <AiConfig currentUser={currentUser} />}

        {/* Tab-tab untuk Admin */}
        {activeTab === 'tickets' && currentUser.role === 'ADMIN' && <AdminTicketDesk />}
        {activeTab === 'user-documents' && currentUser.role === 'ADMIN' && <AdminUserDocuments />}
        {activeTab === 'user-knowledge' && currentUser.role === 'ADMIN' && <AdminUserKnowledge />}
        {activeTab === 'users' && currentUser.role === 'ADMIN' && (
          <UserManagement onImpersonate={handleImpersonate} />
        )}
      </main>

      <QrModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        waStatus={waStatus}
        onRestart={handleRestartWa}
      />

      <QrNoticeModal
        open={qrNoticeOpen}
        onOpenChange={setQrNoticeOpen}
        onScanNow={handleOpenQrModal}
        menuName={selectedMenuName}
      />

      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        currentUser={currentUser}
        onProfileUpdated={handleProfileUpdated}
      />

      <SupportTicketModal
        open={ticketModalOpen}
        onOpenChange={setTicketModalOpen}
        currentUser={currentUser}
      />

      <LogoutModal
        open={logoutModalOpen}
        onOpenChange={setLogoutModalOpen}
        onConfirm={handleConfirmLogoutUser}
        userName={currentUser?.name}
      />

      <WaDisconnectModal
        open={waDisconnectModalOpen}
        onOpenChange={setWaDisconnectModalOpen}
        onConfirm={handleConfirmLogoutWa}
        connectedNumber={waStatus.connectedNumber}
        loading={disconnectingWa}
      />
    </div>
  );
}

export default App;
