import React from 'react';
import { usePage } from '@inertiajs/react';
import type { SharedProps } from '@/types';
import AppLayout from '@/layouts/AppLayout';
import { BookOpen, AlertOctagon, UserX, Flag, CheckCircle } from 'lucide-react';

export default function Rules() {
  const { site } = usePage<SharedProps>().props;
  if (site.rules_text) return <AppLayout><article className="custom-policy"><h1>Community rules</h1><div>{site.rules_text}</div></article></AppLayout>;
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="p-6 bg-slate-950/80 border border-slate-800/80 rounded-2xl backdrop-blur-md">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xl mb-4">
            <BookOpen className="w-6 h-6" />
            <h1 className="text-slate-100 font-sans">Community Guidelines</h1>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-6 font-sans">
            KYAnonymous exists to provide a space where people can speak candidly without exposing their real-life identity.
            To maintain safety, all participants must observe the following community standards.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-slate-900/60 border border-rose-950/80 rounded-xl space-y-1">
              <h3 className="text-sm font-bold text-rose-400 flex items-center space-x-2">
                <UserX className="w-4 h-4" />
                <span>1. Zero Tolerance for Doxxing & Personal Info</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Never publish real names, phone numbers, home addresses, private photos, or personally identifying details of any individual.
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-rose-950/80 rounded-xl space-y-1">
              <h3 className="text-sm font-bold text-rose-400 flex items-center space-x-2">
                <AlertOctagon className="w-4 h-4" />
                <span>2. No Threats, Harassment or Extortion</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Direct threats of violence, coordinated harassment campaigns, stalking, and extortion result in immediate permanent account termination.
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
              <h3 className="text-sm font-bold text-cyan-400 flex items-center space-x-2">
                <Flag className="w-4 h-4" />
                <span>3. Spam & Bot Protection</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Automated posting, repetitive commercial spam, and flooding chat rooms or comment trees will trigger automated rate limiting and account removal.
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>4. Constructive Anonymity</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Use your pseudonym to share honest perspectives, seek advice, discuss ideas, and speak freely without fear of tracking or retaliation.
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-cyan-950/80 rounded-xl space-y-1">
              <h3 className="text-sm font-bold text-cyan-400 flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span>5. Zero-Trace Privacy Standard</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                No tracking cookies, zero IP address storage, and no browser fingerprinting. Guest chat sessions are ephemeral and purged automatically so your digital footprint remains completely private.
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
              <h3 className="text-sm font-bold text-slate-300 flex items-center space-x-2">
                <Flag className="w-4 h-4" />
                <span>6. Real-Time Chat & Thread Etiquette</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Keep conversations relevant and respectful. Use message sub-chats for deep discussions and reply threads. If you see harmful behavior, submit an anonymous report to administrators immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
