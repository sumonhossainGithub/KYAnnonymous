import React from 'react';
import { Link } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { KeyRound, AlertTriangle, ArrowRight } from 'lucide-react';

export default function RecoveryDisplay({ recoveryCode }: { recoveryCode: string }) {
  return (
    <AppLayout>
      <div className="max-w-md mx-auto mt-8 p-6 bg-gray-900/60 border border-amber-950/70 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="text-center mb-6">
          <KeyRound className="w-12 h-12 text-amber-500 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-100">Save Your Recovery Code</h1>
          <p className="text-sm text-gray-400 mt-2">
            This application does not collect your email or phone number.
          </p>
        </div>

        <div className="p-4 bg-amber-950/30 border border-amber-600/40 rounded-xl mb-6">
          <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs uppercase tracking-wider mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Important Warning</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            This code is displayed <strong>ONLY ONCE</strong> and will never be shown again. If you lose your password, this recovery code is the <strong>ONLY</strong> way to recover your account.
          </p>
        </div>

        <div className="text-center py-4 px-6 bg-gray-950 border border-indigo-950/80 rounded-xl mb-6 font-mono text-xl tracking-widest text-indigo-300 font-bold select-all">
          {recoveryCode}
        </div>

        <Link
          href="/"
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-950/50"
        >
          <span>I Have Saved My Code — Continue to Feed</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </AppLayout>
  );
}
