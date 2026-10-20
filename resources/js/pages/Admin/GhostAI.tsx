import React from 'react';
import { useForm, router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import {
  Ghost,
  Cpu,
  Activity,
  Zap,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Server,
  Layers,
  Users,
  MessageSquare,
} from 'lucide-react';

interface Props {
  env_master_enabled: boolean;
  effective_enabled: boolean;
  settings: {
    ghost_ai_enabled: boolean;
    ghost_ai_endpoint: string;
    ghost_auto_reply_enabled: boolean;
    ghost_command_reply_enabled: boolean;
    ghost_auto_reply_max_active_users: number;
    ghost_auto_reply_cooldown_seconds: number;
    ghost_max_output_tokens: number;
    ghost_request_timeout: number;
  };
  presence: {
    total_active: number;
    authenticated: number;
    guests: number;
    window_seconds: number;
    timestamp: string;
  };
  health: {
    status: 'ONLINE' | 'OFFLINE' | 'ERROR';
    status_code: number;
    latency_ms: number | null;
    endpoint: string;
    checked_at: string;
    error: string | null;
  };
  queue: {
    connection: string;
    pending_commands: number;
    pending_auto: number;
    total_pending: number;
    failed_count: number;
    is_locked: boolean;
  };
  last_success?: {
    snippet: string;
    timestamp: string;
  } | null;
  last_error?: {
    message: string;
    timestamp: string;
  } | null;
  recentLogs: {
    id: number;
    action: string;
    target_type: string;
    created_at: string;
    admin?: { username: string };
  }[];
}

export default function GhostAI({
  env_master_enabled,
  effective_enabled,
  settings,
  presence,
  health,
  queue,
  last_success,
  last_error,
  recentLogs,
}: Props) {
  const form = useForm({
    ghost_ai_enabled: settings.ghost_ai_enabled,
    ghost_ai_endpoint: settings.ghost_ai_endpoint,
    ghost_auto_reply_enabled: settings.ghost_auto_reply_enabled,
    ghost_command_reply_enabled: settings.ghost_command_reply_enabled,
    ghost_auto_reply_max_active_users: settings.ghost_auto_reply_max_active_users,
    ghost_auto_reply_cooldown_seconds: settings.ghost_auto_reply_cooldown_seconds,
    ghost_max_output_tokens: settings.ghost_max_output_tokens,
    ghost_request_timeout: settings.ghost_request_timeout,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    form.post('/admin/ghost/settings', { preserveScroll: true });
  };

  const handleTestConnection = () => {
    router.post('/admin/ghost/test-connection', {}, { preserveScroll: true });
  };

  const handleCancelQueue = () => {
    if (confirm('Cancel all pending Ghost AI jobs and release the concurrency lock?')) {
      router.post('/admin/ghost/cancel-queue', {}, { preserveScroll: true });
    }
  };

  const isModeA = presence.total_active <= settings.ghost_auto_reply_max_active_users;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cyan-950/40">
          <div>
            <div className="flex items-center space-x-2">
              <Link href="/admin/dashboard" className="text-xs font-mono text-cyan-400 hover:underline">
                &larr; Admin Dashboard
              </Link>
            </div>
            <h1 className="text-xl font-bold tracking-wider text-slate-100 flex items-center space-x-2 mt-1">
              <Ghost className="w-6 h-6 text-cyan-400" />
              <span>GHOST AI CONTROL CENTER</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Local ARM64 Qwen3 Inference &bull; Mode A/B Active User Gating &bull; Max Concurrency: 1
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 border bg-cyan-950/80 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/60"
            >
              <RefreshCw size={13} />
              <span>Test AI Connection</span>
            </button>
            <button
              type="button"
              onClick={handleCancelQueue}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 border bg-rose-950/80 border-rose-500/50 text-rose-300 hover:bg-rose-900/60"
            >
              <Trash2 size={13} />
              <span>Cancel Queue ({queue.total_pending})</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Engine Health */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Server size={14} className="text-cyan-400" />
                AI ENGINE
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  health.status === 'ONLINE'
                    ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-400'
                    : 'bg-rose-950 border border-rose-500/50 text-rose-400'
                }`}
              >
                {health.status}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-bold text-slate-100">
                {health.latency_ms !== null ? `${health.latency_ms} ms` : 'Unreachable'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate" title={health.endpoint}>
                {health.endpoint}
              </div>
            </div>
          </div>

          {/* Active Users & Current Mode */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-cyan-400" />
                ACTIVE PRESENCE
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isModeA
                    ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-300'
                    : 'bg-amber-950 border border-amber-500/50 text-amber-300'
                }`}
              >
                {isModeA ? 'MODE A (0-3)' : 'MODE B (4+)'}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-bold text-slate-100 flex items-baseline gap-2">
                <span>{presence.total_active} active</span>
                <span className="text-[11px] font-mono text-slate-500 font-normal">
                  (limit: {settings.ghost_auto_reply_max_active_users})
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {presence.authenticated} members &bull; {presence.guests} guests (120s window)
              </div>
            </div>
          </div>

          {/* Queue & Worker Status */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Layers size={14} className="text-cyan-400" />
                QUEUE JOBS
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                driver: {queue.connection}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-bold text-slate-100 flex items-baseline gap-2">
                <span>{queue.total_pending} pending</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {queue.pending_commands} commands (/ai) &bull; {queue.pending_auto} auto
              </div>
            </div>
          </div>

          {/* Concurrency Lock Status */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Cpu size={14} className="text-cyan-400" />
                INFERENCE LOCK
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                max conc: 1
              </span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-bold">
                {queue.is_locked ? (
                  <span className="text-amber-400 flex items-center gap-1.5">
                    <Activity size={16} className="animate-pulse" /> Generating...
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> Idle / Available
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Prevents concurrent OOM on ARM64
              </div>
            </div>
          </div>
        </div>

        {/* Operating Rules Explainer Banner */}
        <div className={`p-4 rounded-xl border text-xs font-mono flex items-start gap-3 ${
          isModeA
            ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
            : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
        }`}>
          <Ghost className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold tracking-wide">
              {isModeA ? 'MODE A ACTIVE (Low Traffic: 0 to 3 Users)' : 'MODE B ACTIVE (Busy Community: 4+ Users)'}
            </div>
            <p className="opacity-90">
              {isModeA
                ? `Ghost is allowed to reply automatically to normal conversation (subject to a ${settings.ghost_auto_reply_cooldown_seconds}s cooldown). Explicit /ai commands remain fully functional.`
                : 'Ghost has completely paused unsolicited automatic chatter so members can speak freely. Explicit /ai and /AI commands remain 100% active and available.'}
            </p>
          </div>
        </div>

        {/* Main Settings Form */}
        <form onSubmit={handleSave} className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold tracking-wider text-slate-200 flex items-center gap-2">
              <Zap size={16} className="text-cyan-400" />
              <span>GHOST ENGINE CONFIGURATION</span>
            </h2>
            <button
              type="submit"
              disabled={form.processing}
              className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-50"
            >
              {form.processing ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Toggles */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Feature Switches
              </h3>

              {/* Master Toggle */}
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/50 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.data.ghost_ai_enabled}
                    onChange={(e) => form.setData('ghost_ai_enabled', e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-200">Database Ghost Toggle (Admin Control)</div>
                    <div className="text-[11px] text-slate-500">
                      Enables or disables Ghost AI at runtime. Both this setting and GHOST_AI_ENABLED in .env must be ON for Ghost to run.
                    </div>
                  </div>
                </label>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Environment Switch (.env):</span>
                  <span className={`px-1.5 py-0.5 rounded font-bold ${
                    env_master_enabled
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                  }`}>
                    GHOST_AI_ENABLED={env_master_enabled ? 'true' : 'false'}
                  </span>
                </div>
                {!env_master_enabled && (
                  <div className="text-[10px] text-amber-400 bg-amber-950/30 border border-amber-500/30 rounded p-1.5">
                    Notice: GHOST_AI_ENABLED is currently false in .env. Ghost is hard-disabled at the infrastructure level. Set GHOST_AI_ENABLED=true in .env on the server to permit activation.
                  </div>
                )}
              </div>

              {/* Auto Reply Toggle */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.data.ghost_auto_reply_enabled}
                  onChange={(e) => form.setData('ghost_auto_reply_enabled', e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-200">Automatic Replies in Chat</div>
                  <div className="text-[11px] text-slate-500">
                    Allows Ghost to join normal chatter when 0 to 3 active users are present.
                  </div>
                </div>
              </label>

              {/* Slash Command Toggle */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.data.ghost_command_reply_enabled}
                  onChange={(e) => form.setData('ghost_command_reply_enabled', e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-200">Slash Command (/ai) Replies</div>
                  <div className="text-[11px] text-slate-500">
                    Enables users to explicitly ask Ghost questions via /ai, /AI, /Ai. Works across both Mode A & B.
                  </div>
                </div>
              </label>
            </div>

            {/* Thresholds & Performance */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Gating & Performance Bounds
              </h3>

              {/* Auto-reply Max Active Users */}
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Max Active Users for Auto-Reply (default: 3)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={form.data.ghost_auto_reply_max_active_users}
                  onChange={(e) => form.setData('ghost_auto_reply_max_active_users', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-500"
                />
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  When active user count is &gt; this number, unsolicited auto-replies immediately stop.
                </p>
              </div>

              {/* Auto-reply Cooldown */}
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Auto-Reply Room Cooldown (seconds, default: 300)
                </label>
                <input
                  type="number"
                  min="10"
                  max="3600"
                  value={form.data.ghost_auto_reply_cooldown_seconds}
                  onChange={(e) => form.setData('ghost_auto_reply_cooldown_seconds', parseInt(e.target.value) || 60)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-500"
                />
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Minimum wait time between consecutive auto-replies in the same room.
                </p>
              </div>

              {/* Max Tokens */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Max Tokens (default: 32)
                  </label>
                  <input
                    type="number"
                    min="8"
                    max="128"
                    value={form.data.ghost_max_output_tokens}
                    onChange={(e) => form.setData('ghost_max_output_tokens', parseInt(e.target.value) || 32)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    ~0.1 tok/s speed requires tight output bounds.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Timeout (seconds: 120)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="600"
                    value={form.data.ghost_request_timeout}
                    onChange={(e) => form.setData('ghost_request_timeout', parseInt(e.target.value) || 120)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    HTTP client socket timeout.
                  </p>
                </div>
              </div>

              {/* Endpoint */}
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  AI Endpoint URL
                </label>
                <input
                  type="text"
                  value={form.data.ghost_ai_endpoint}
                  onChange={(e) => form.setData('ghost_ai_endpoint', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Operational Telemetry & Last Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Last Successful Output */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 size={14} />
                LAST SUCCESSFUL RESPONSE
              </span>
              <span>{last_success ? last_success.timestamp : 'None recorded'}</span>
            </div>
            {last_success ? (
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs font-mono text-slate-200">
                &ldquo;{last_success.snippet}&rdquo;
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono italic">
                No completions generated since last reboot.
              </p>
            )}
          </div>

          {/* Last Error Message */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-rose-400">
                <AlertTriangle size={14} />
                LAST ERROR STATUS
              </span>
              <span>{last_error ? last_error.timestamp : 'Zero errors'}</span>
            </div>
            {last_error ? (
              <div className="p-3 bg-rose-950/30 rounded-lg border border-rose-900/50 text-xs font-mono text-rose-300">
                {last_error.message}
              </div>
            ) : (
              <p className="text-xs text-emerald-400/80 font-mono">
                No recent errors recorded. AI subsystem running clean.
              </p>
            )}
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold tracking-wider text-slate-200 flex items-center gap-2 mb-3">
            <Clock size={15} className="text-cyan-400" />
            <span>RECENT GHOST AI AUDIT LOGS</span>
          </h2>
          {recentLogs.length > 0 ? (
            <div className="divide-y divide-slate-800/60 font-mono text-xs">
              {recentLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-cyan-400 font-semibold">{log.action}</span>
                    <span className="text-slate-500 text-[11px] ml-2">
                      by @{log.admin?.username || 'system'}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px]">{log.created_at}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 font-mono italic">
              No audit entries recorded yet.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
