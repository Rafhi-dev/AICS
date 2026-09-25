import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { KnowledgeBase } from './KnowledgeBase';
import { Users, BookOpen, Loader2, Sparkles } from 'lucide-react';

interface UserOption {
  id: string;
  name: string;
  username?: string | null;
  email: string;
  role: string;
  activeUntil?: string | null;
  isExpired?: boolean;
}

export const AdminUserKnowledge: React.FC = () => {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const res = await api.get('/users');
        if (res.data.success) {
          const clientUsers = res.data.data.filter((u: any) => u.role === 'USER');
          setUsers(clientUsers);
          if (clientUsers.length > 0 && !selectedUserId) {
            setSelectedUserId(clientUsers[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching users for knowledge:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-4">
      {/* Top Client Selector Bar */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md shadow-amber-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Kelola Basis Pengetahuan & FAQ Klien</h2>
              <p className="text-xs text-slate-500">
                Pilih akun klien untuk menambah, mengedit, atau menghapus item FAQ bot AI milik mereka
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Pilih Klien:</label>
            {loadingUsers ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
            ) : users.length === 0 ? (
              <span className="text-xs text-slate-400">Belum ada klien terdaftar</span>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.username ? `(@${u.username})` : `(${u.email})`}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Embedded KnowledgeBase Component */}
      {selectedUser ? (
        <KnowledgeBase
          targetUserId={selectedUser.id}
          targetUserName={`${selectedUser.name} (${selectedUser.email})`}
        />
      ) : (
        <div className="text-center py-20 text-slate-400 text-xs">
          Silakan pilih akun klien di atas untuk mengelola FAQ.
        </div>
      )}
    </div>
  );
};
