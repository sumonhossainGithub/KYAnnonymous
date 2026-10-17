import React from 'react';
import { usePage } from '@inertiajs/react';
import type { SharedProps } from '@/types';
import AppLayout from '@/layouts/AppLayout';
import { ShieldCheck, EyeOff, Lock, Server } from 'lucide-react';

export default function Privacy() {
  const { site } = usePage<SharedProps>().props;
  if (site.privacy_text) return <AppLayout><article className="custom-policy"><h1>Privacy policy</h1><div>{site.privacy_text}</div></article></AppLayout>;
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="p-6 bg-slate-950/80 border border-slate-800/80 rounded-2xl backdrop-blur-md">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xl mb-4">
            <ShieldCheck className="w-6 h-6" />
            <h1 className="text-slate-100 font-sans">Privacy & Security</h1>
          </div>

          <div className="space-y-4 text-sm text-slate-300 leading-relaxed font-sans">
            <p>
              <strong>KYAnonymous</strong> is built from the ground up on principles of zero data collection and complete user anonymity.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs uppercase font-mono">
                  <EyeOff className="w-4 h-4" />
                  <span>What We NEVER Collect</span>
                </div>
                <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                  <li>No Email Addresses</li>
                  <li>No Phone Numbers</li>
                  <li>No Real Names or Student IDs</li>
                  <li>No GPS or Geolocation</li>
                  <li>No Third-Party Analytics or Trackers</li>
                  <li>No Advertising or Device Fingerprinting</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs uppercase font-mono">
                  <Lock className="w-4 h-4" />
                  <span>What Is Stored</span>
                </div>
                <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                  <li>Chosen Display Name & Username</li>
                  <li>Gender (optional, can be hidden)</li>
                  <li>Securely Salted Password Hash</li>
                  <li>One-Time Password Recovery Code</li>
                  <li>Public Posts & Discussion Comments</li>
                  <li>Live Chat Room Messages</li>
                </ul>
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2 pt-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>IP Address & Privacy Policy</span>
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Our database <strong>never stores real user IP addresses</strong> in sessions or user accounts.
              We enforce strict privacy headers that prevent outside websites or trackers from identifying you.
            </p>
            <p className="text-xs text-amber-300/80 p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl">
              <strong>Honest Limitation Notice:</strong> KYAnonymous provides pseudonymity between community members.
              It does not and cannot guarantee cryptographic invisibility against internet service providers, network-level routing logs, or hosting infrastructure operating outside the application.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
