import React from 'react';
import { useForm, router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Users as UsersIcon, Ban, CheckCircle, ArrowLeft, Search, LogOut, Trash2 } from 'lucide-react';

interface UserItem {
  public_id: string;
  display_name: string;
  username: string;
  gender: string;
  role: string;
  status: string;
  is_online?: boolean;
  created_at: string;
}

interface Props {
  users: {
    data: UserItem[];
  };
  query?: string;
}

export default function Users({ users, query }: Props) {
  const { data, setData, get } = useForm({
    q: query || '',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    get('/admin/users');
  };

  const handleToggleBan = (publicId: string, currentStatus: string) => {
    if (confirm(`Are you sure you want to ${currentStatus === 'BANNED' ? 'unban' : 'ban'} this user?`)) {
      router.post(`/admin/users/${publicId}/toggle-ban`);
    }
  };

  const handleTerminateSessions = (publicId: string, username: string) => {
    if (confirm(`Log out @${username} from all devices?`)) {
      router.post(`/admin/users/${publicId}/terminate-sessions`);
    }
  };

  const handleDeleteUser = (publicId: string, username: string) => {
    if (confirm(`Are you sure you want to PERMANENTLY DELETE @${username} from the database? All their posts, comments, and messages will also be removed. This cannot be undone.`)) {
      router.delete(`/admin/users/${publicId}`);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cyan-950/40">
          <div className="flex items-center space-x-3">
            <Link href="/admin/dashboard" className="p-2 bg-slate-900 border border-cyan-900/50 hover:border-cyan-400 rounded-lg text-cyan-400 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-wider text-slate-100 flex items-center space-x-2">
                <UsersIcon className="w-5 h-5 text-cyan-400" />
                <span>MANAGE USERS</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                View registered users, manage accounts, ban or log out users
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
            <div className="relative min-w-0 flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={data.q}
                onChange={(e) => setData('q', e.target.value)}
                placeholder="Search name or username..."
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-cyan-900/40 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono w-full sm:w-48"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-cyan-600/30 border border-cyan-500/50 hover:bg-cyan-500/40 text-cyan-200 text-xs font-semibold rounded-lg transition"
            >
              Filter
            </button>
          </form>
        </div>

        {/* User Table */}
        <p className="text-xs text-slate-400 md:hidden">Swipe the table to see all columns and actions.</p>
        <div role="region" aria-label="User management table" tabIndex={0} className="overflow-x-auto bg-slate-950/80 border border-cyan-950/60 rounded-xl backdrop-blur-md shadow-2xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-cyan-400 uppercase font-mono tracking-wider border-b border-cyan-950/60">
              <tr>
                <th className="p-3.5">Display Name</th>
                <th className="p-3.5">Username</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Registered</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 font-sans">
              {users.data.map((u) => (
                <tr key={u.public_id} className="hover:bg-cyan-950/20 transition">
                  <td className="p-3.5 font-medium text-slate-100">{u.display_name}</td>
                  <td className="p-3.5 font-mono text-cyan-300">@{u.username}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        u.role === 'SUPER_ADMIN'
                          ? 'bg-violet-950 border border-violet-700 text-violet-300'
                          : 'bg-slate-900 border border-slate-700 text-slate-400'
                      }`}
                    >
                      {u.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : u.role}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                            : 'bg-rose-950 border border-rose-800 text-rose-300'
                        }`}
                      >
                        {u.status}
                      </span>
                      {u.is_online ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-950 border border-emerald-500/50 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>ONLINE</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-500 bg-slate-900 border border-slate-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          <span>OFFLINE</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-500 font-mono text-[11px]">{u.created_at}</td>
                  <td className="p-3.5 text-right">
                    {u.role !== 'SUPER_ADMIN' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleTerminateSessions(u.public_id, u.username)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-white text-[11px] font-mono transition flex items-center gap-1"
                          title="Log out user from all devices"
                        >
                          <LogOut className="w-3 h-3 text-amber-400" />
                          <span>Log Out User</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleBan(u.public_id, u.status)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition flex items-center gap-1 border ${
                            u.status === 'BANNED'
                              ? 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-800 text-emerald-300'
                              : 'bg-rose-950/70 hover:bg-rose-900 border-rose-800 text-rose-300'
                          }`}
                        >
                          {u.status === 'BANNED' ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>Unban</span>
                            </>
                          ) : (
                            <>
                              <Ban className="w-3 h-3" />
                              <span>Ban User</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.public_id, u.username)}
                          className="px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition flex items-center gap-1 border bg-red-950/60 hover:bg-red-900 border-red-800 hover:border-red-600 text-red-300 hover:text-white"
                          title="Permanently delete user from database"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                          <span>Delete</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-cyan-400 italic">Super Admin</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
