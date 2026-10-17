import React from 'react';
import { router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import {
  ShieldAlert,
  Ghost,
  Lock,
  Unlock,
  Trash2,
  Users,
  Terminal,
  Radio,
  EyeOff,
  Flame,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  status: {
    admin_stealth_mode: boolean;
    emergency_lockdown: boolean;
    active_sessions: number;
    audit_logs_count: number;
    security_events_count: number;
    ip_retention_policy: string;
    referrer_policy: string;
    anti_fingerprint_status: string;
    crypto_salts: string;
  };
}

export default function Stealth({ status }: Props) {
  const toggleStealthMode = () => {
    router.post('/admin/stealth/toggle-stealth-mode', {}, { preserveScroll: true });
  };

  const toggleLockdown = () => {
    const action = status.emergency_lockdown ? 'turn off' : 'turn on';
    if (confirm(`Are you sure you want to ${action} Emergency Lockdown? When active, ordinary users cannot create new posts or send messages.`)) {
      router.post('/admin/stealth/toggle-lockdown', {}, { preserveScroll: true });
    }
  };

  const purgeLogs = () => {
    if (confirm('Are you sure you want to permanently clear all activity and security logs? This cannot be undone.')) {
      router.post('/admin/stealth/purge-logs', {}, { preserveScroll: true });
    }
  };

  const terminateAllSessions = () => {
    if (confirm('Are you sure you want to log out all active users? You will stay logged in, but everyone else will be signed out.')) {
      router.post('/admin/stealth/terminate-sessions', {}, { preserveScroll: true });
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
              <h1 className="text-lg font-bold tracking-wider text-slate-100 flex items-center gap-2">
                <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span>SECURITY & PRIVACY CONTROLS</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Hide admin identity, manage emergency lockdown, and wipe activity logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${
                status.admin_stealth_mode
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <Ghost className="w-3.5 h-3.5" />
              <span>{status.admin_stealth_mode ? 'ADMIN HIDDEN' : 'ADMIN VISIBLE'}</span>
            </span>

            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${
                status.emergency_lockdown
                  ? 'bg-rose-950/90 border-rose-500 text-rose-300 animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{status.emergency_lockdown ? 'LOCKDOWN ON' : 'NORMAL MODE'}</span>
            </span>
          </div>
        </div>

        {/* HUD Diagnostics */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-950/80 border border-cyan-950/80 rounded-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400">IP ADDRESS PROTECTION</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-mono font-bold text-slate-100">{status.ip_retention_policy}</div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">No real user IP addresses are ever saved</p>
          </div>

          <div className="p-4 bg-slate-950/80 border border-cyan-950/80 rounded-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400">EXTERNAL LINK PRIVACY</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-mono font-bold text-slate-100">{status.referrer_policy}</div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Outside websites cannot see where visitors came from</p>
          </div>

          <div className="p-4 bg-slate-950/80 border border-cyan-950/80 rounded-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400">DEVICE SENSOR BLOCKING</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-mono font-bold text-emerald-400">14 SENSORS BLOCKED</div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Camera, microphone, bluetooth & location blocked</p>
          </div>

          <div className="p-4 bg-slate-950/80 border border-cyan-950/80 rounded-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400">LOGGED-IN USERS</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-sm font-mono font-bold text-slate-100">{status.active_sessions} Sessions</div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Active sessions currently online</p>
          </div>
        </div>

        {/* Master Control Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admin Identity Cloaking */}
          <div className="p-6 bg-slate-950/80 border border-cyan-900/50 rounded-xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-cyan-950/60 border border-cyan-800/60 rounded-lg text-cyan-400">
                  <EyeOff className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-mono">
                    HIDE ADMIN IDENTITY (GHOST MODE)
                  </h3>
                  <span className="text-xs text-slate-400">
                    Disguise your admin account so no one can tell you are the admin
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed mb-6">
                When enabled, your real username is completely hidden across the website and replaced with an anonymous system name (like <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300 font-mono">[CORE_OPERATOR]</code>). Regular users cannot tell when you are online or trace your actions.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleStealthMode}
              className={`w-full py-3 px-4 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition flex items-center justify-center gap-2 border shadow-lg ${
                status.admin_stealth_mode
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                  : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-400 text-slate-950'
              }`}
            >
              <Ghost className="w-4 h-4" />
              <span>{status.admin_stealth_mode ? 'Turn Off Ghost Mode (Show Normal Name)' : 'Turn On Ghost Mode (Hide Admin Identity)'}</span>
            </button>
          </div>

          {/* Emergency Platform Lockdown */}
          <div className="p-6 bg-slate-950/80 border border-rose-950/60 rounded-xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-rose-950/60 border border-rose-800/60 rounded-lg text-rose-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-mono">
                    EMERGENCY PLATFORM PAUSE (LOCKDOWN)
                  </h3>
                  <span className="text-xs text-slate-400">
                    Pause new posts and messages temporarily
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed mb-6">
                Quickly puts the site in read-only mode. Regular users will not be able to create new posts or send chat messages until you turn it off. Useful if you ever need to stop spam.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleLockdown}
              className={`w-full py-3 px-4 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition flex items-center justify-center gap-2 border shadow-lg ${
                status.emergency_lockdown
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                  : 'bg-rose-600 hover:bg-rose-500 border-rose-400 text-white'
              }`}
            >
              {status.emergency_lockdown ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{status.emergency_lockdown ? 'Turn Off Lockdown (Allow Posting)' : 'Turn On Lockdown (Pause All Posting)'}</span>
            </button>
          </div>

          {/* Zero-Trace Anti-Forensic Purge */}
          <div className="p-6 bg-slate-950/80 border border-amber-950/60 rounded-xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-amber-950/60 border border-amber-800/60 rounded-lg text-amber-400">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-mono">
                    CLEAR ACTIVITY & AUDIT LOGS
                  </h3>
                  <span className="text-xs text-slate-400">
                    Permanently erase all system history and moderation logs
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed mb-4">
                Permanently deletes all {status.audit_logs_count + status.security_events_count} recorded admin actions and security event logs. Once wiped, no history remains.
              </p>
            </div>

            <button
              type="button"
              onClick={purgeLogs}
              className="w-full py-3 px-4 bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-200 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete All Logs ({status.audit_logs_count + status.security_events_count} records)</span>
            </button>
          </div>

          {/* Mass Session Nuke */}
          <div className="p-6 bg-slate-950/80 border border-indigo-950/60 rounded-xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-indigo-950/60 border border-indigo-800/60 rounded-lg text-indigo-400">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-mono">
                    LOG OUT ALL USERS
                  </h3>
                  <span className="text-xs text-slate-400">
                    Instantly sign out everyone on the site except you
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed mb-4">
                Immediately logs out all active users. They will need to log back in to use their accounts. Your admin session will stay active and logged in.
              </p>
            </div>

            <button
              type="button"
              onClick={terminateAllSessions}
              className="w-full py-3 px-4 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Log Out All {status.active_sessions} Active Users</span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
