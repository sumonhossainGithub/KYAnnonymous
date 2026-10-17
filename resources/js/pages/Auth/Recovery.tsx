import React from 'react';
import { useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { KeyRound, ArrowRight } from 'lucide-react';

export default function Recovery() {
  const { data, setData, post, processing, errors } = useForm({
    username: '',
    recovery_code: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/recovery');
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto mt-8 p-6 bg-gray-900/60 border border-indigo-950/70 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="text-center mb-6">
          <KeyRound className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-100">Account Recovery</h1>
          <p className="text-sm text-gray-400 mt-1">
            Enter your username and saved recovery code to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={data.username}
              onChange={(e) => setData('username', e.target.value)}
              placeholder="e.g. nightowl27"
              className="w-full px-3 py-2 bg-gray-950/80 border border-indigo-950 rounded-xl text-gray-100 focus:outline-none focus:border-indigo-500 text-sm"
            />
            {errors.username && (
              <p className="text-red-400 text-xs mt-1">{errors.username}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Recovery Code
            </label>
            <input
              type="text"
              required
              value={data.recovery_code}
              onChange={(e) => setData('recovery_code', e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              className="w-full px-3 py-2 bg-gray-950/80 border border-indigo-950 rounded-xl text-gray-100 font-mono tracking-wider focus:outline-none focus:border-indigo-500 text-sm"
            />
            {errors.recovery_code && (
              <p className="text-red-400 text-xs mt-1">{errors.recovery_code}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              New Password (min 8 characters)
            </label>
            <input
              type="password"
              required
              value={data.password}
              onChange={(e) => setData('password', e.target.value)}
              className="w-full px-3 py-2 bg-gray-950/80 border border-indigo-950 rounded-xl text-gray-100 focus:outline-none focus:border-indigo-500 text-sm"
            />
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full mt-4 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-950/50"
          >
            <span>Reset Password</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500 border-t border-indigo-950/40 pt-4">
          Remembered your password?{' '}
          <Link href="/login" className="text-indigo-400 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
