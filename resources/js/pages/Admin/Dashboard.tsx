import React from 'react';
import { Link } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import {
  ShieldAlert,
  Users,
  Flag,
  Building2,
  Bell,
  ArrowRight,
  MessageSquare,
  FileText,
  Radio,
  Ghost,
  Lock,
  Cpu,
} from 'lucide-react';

interface Props {
  stats: {
    users_count: number;
    posts_count: number;
    comments_count: number;
    reports_pending: number;
    organizations_count: number;
    notices_count: number;
    chat_rooms_count: number;
    chat_messages_count: number;
    active_sessions_count: number;
    emergency_lockdown: boolean;
    admin_stealth_mode: boolean;
  };
  recentLogs: {
    id: number;
    action: string;
    target_type: string;
    created_at: string;
    admin: { username: string };
  }[];
}

export default function Dashboard({ stats, recentLogs }: Props) {
  const statCards = [
    { title: 'Registered Users', value: stats.users_count, icon: Users, href: '/admin/users' },
    { title: 'Community Posts', value: stats.posts_count, icon: FileText, href: '/admin/posts' },
    { title: 'Chat Rooms', value: stats.chat_rooms_count, icon: MessageSquare, href: '/admin/chat-rooms' },
    { title: 'Online Users', value: stats.active_sessions_count, icon: Cpu, href: '/admin/stealth' },
    { title: 'Ghost AI', value: 'Qwen3 4B', icon: Ghost, href: '/admin/ghost' },
    {
      title: 'Reports',
      value: stats.reports_pending,
      icon: Flag,
      href: '/admin/reports',
      alert: stats.reports_pending > 0,
    },
    { title: 'Groups & Circles', value: stats.organizations_count, icon: Building2, href: '/admin/organizations' },
    { title: 'Announcements', value: stats.notices_count, icon: Bell, href: '/admin/notices' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cyan-950/40">
          <div>
            <h1 className="text-lg font-bold tracking-wider text-slate-100 flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
              <span>ADMIN DASHBOARD</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Moderate content, manage rooms, and control site privacy
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/ghost" className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 border bg-cyan-950/80 border-cyan-500 text-cyan-300 hover:bg-cyan-900/60">
              <Ghost className="w-3.5 h-3.5 text-cyan-400" />
              <span>GHOST AI</span>
            </Link>
            <Link href="/admin/settings" className="button">Customize website</Link>
            <Link
              href="/admin/stealth"
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 border ${
                stats.admin_stealth_mode
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                  : 'bg-cyan-950/40 border-cyan-800 text-cyan-300 hover:border-cyan-400'
              }`}
            >
              <Ghost className="w-3.5 h-3.5" />
              <span>{stats.admin_stealth_mode ? 'ADMIN HIDDEN' : 'SECURITY & PRIVACY'}</span>
            </Link>

            <Link
              href="/admin/posts"
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-cyan-700 rounded-lg text-slate-300 text-xs font-mono transition"
            >
              Manage Posts
            </Link>
            <Link
              href="/admin/chat-rooms"
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-cyan-700 rounded-lg text-slate-300 text-xs font-mono transition"
            >
              Manage Rooms
            </Link>
            <Link
              href="/admin/audit-logs"
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-cyan-700 rounded-lg text-slate-300 text-xs font-mono transition"
            >
              Activity Logs
            </Link>
            <Link
              href="/admin/system-health"
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-cyan-700 rounded-lg text-slate-300 text-xs font-mono transition"
            >
              System Health
            </Link>
          </div>
        </div>

        {/* Status Callouts if Lockdown or Cloak active */}
        {(stats.emergency_lockdown || stats.admin_stealth_mode) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            {stats.emergency_lockdown && (
              <div className="p-3 bg-rose-950/60 border border-rose-600/70 rounded-xl text-rose-300 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-400 animate-pulse" />
                  LOCKDOWN ACTIVE: POSTING IS CURRENTLY PAUSED FOR USERS
                </span>
                <Link href="/admin/stealth" className="text-white underline text-[11px]">
                  Manage
                </Link>
              </div>
            )}
            {stats.admin_stealth_mode && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-600/70 rounded-xl text-emerald-300 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Ghost className="w-4 h-4 text-emerald-400" />
                  GHOST MODE ACTIVE: ADMIN USERNAME IS HIDDEN ACROSS SITE
                </span>
                <Link href="/admin/stealth" className="text-white underline text-[11px]">
                  Config
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className={`p-4 rounded-xl border backdrop-blur-md transition group flex flex-col justify-between ${
                  card.alert
                    ? 'border-amber-500/50 bg-amber-950/30'
                    : 'bg-slate-950/80 border-cyan-950/70 hover:border-cyan-500/50 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-semibold uppercase text-slate-400">
                    {card.title}
                  </span>
                  <Icon className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-bold font-mono text-slate-100">{card.value}</div>
              </Link>
            );
          })}
        </div>

        {/* Quick Action Hub */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Link
            href="/admin/stealth"
            className="p-4 bg-gradient-to-br from-slate-950 to-cyan-950/30 border border-cyan-900/60 hover:border-cyan-400 rounded-xl transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-cyan-400" />
                SECURITY & STEALTH TOOLS
              </span>
              <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Hide admin identity, activate emergency pause, clear activity logs, or log out users.
            </p>
          </Link>

          <Link
            href="/admin/posts"
            className="p-4 bg-gradient-to-br from-slate-950 to-indigo-950/30 border border-indigo-900/60 hover:border-indigo-400 rounded-xl transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-indigo-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                MANAGE POSTS & COMMENTS
              </span>
              <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Hide unwanted posts, lock discussion comments, or view anonymous posts.
            </p>
          </Link>

          <Link
            href="/admin/chat-rooms"
            className="p-4 bg-gradient-to-br from-slate-950 to-emerald-950/30 border border-emerald-900/60 hover:border-emerald-400 rounded-xl transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                MANAGE CHAT ROOMS
              </span>
              <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-slate-400 font-sans">
              View all chat rooms, close inactive rooms, or clear room messages.
            </p>
          </Link>
        </div>

        {/* Recent Audit Activities */}
        <div className="p-5 bg-slate-950/80 border border-cyan-950/70 rounded-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Recent Admin Actions
            </h2>
            <Link
              href="/admin/audit-logs"
              className="text-xs font-mono text-cyan-400 hover:underline flex items-center space-x-1"
            >
              <span>View All Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentLogs.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono">No recent admin actions recorded.</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-900/70 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-cyan-950/80 border border-cyan-800/80 rounded font-mono text-[10px] text-cyan-300 font-bold">
                      {log.action}
                    </span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      Target: {log.target_type || 'system'}
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">
                    Operator: @{stats.admin_stealth_mode ? '[REDACTED]' : log.admin?.username || 'system'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
