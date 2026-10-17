import type { ReactNode } from 'react';
import { Radio, ShieldCheck } from 'lucide-react';
import AppLayout from '@/layouts/AppLayout';

export default function AuthFrame({ children, returning = false }: { children: ReactNode; returning?: boolean }) {
  return (
    <AppLayout>
      <div className="auth-scene">
        <section className="auth-story font-mono">
          <span className="eyebrow text-cyan-400">
            <span className="status-dot animate-ping" />
            <span>100% PRIVATE & UNTRACEABLE</span>
          </span>
          <h1 className="text-slate-100 font-sans">
            {returning ? (
              <>
                Welcome back to<br />the <em>Community.</em>
              </>
            ) : (
              <>
                Create your free<br />anonymous<br /><em>account.</em>
              </>
            )}
          </h1>
          <p className="font-sans text-slate-400 text-xs">
            No email, no phone number, and no real name required. You are completely private and untraceable.
          </p>
          <div className="auth-art text-cyan-400">
            <Radio size={80} strokeWidth={0.8} className="animate-pulse" />
          </div>
          <div className="auth-trust text-xs text-slate-400 font-mono">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>No personal tracking · No IP addresses logged</span>
          </div>
        </section>
        <section className="auth-card bg-slate-950/85 border border-cyan-950/70 shadow-2xl backdrop-blur-md">
          {children}
        </section>
      </div>
    </AppLayout>
  );
}
