import type { FormEvent } from 'react';
import { useForm, Link } from '@inertiajs/react';
import AuthFrame from '@/components/AuthFrame';
import { ArrowUpRight, AlertCircle, AlertTriangle } from 'lucide-react';

export default function Login() {
  const form = useForm({ username: '', password: '' });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    form.post('/login', {
      onSuccess: (page) => {
        const role = (page.props as any)?.auth?.user?.role;
        if (role === 'SUPER_ADMIN') {
          window.location.href = '/admin/dashboard';
        } else {
          window.location.href = '/';
        }
      },
      onFinish: () => form.reset('password'),
    });
  };

  const hasErrors = form.hasErrors || Object.keys(form.errors).length > 0;
  const primaryError = form.errors.password || form.errors.username || (hasErrors ? Object.values(form.errors)[0] : null);

  return (
    <AuthFrame returning>
      <h2>Welcome Back</h2>
      <p>Log in to continue your private conversations.</p>

      {/* Prominent Warning Box on Wrong Password / Error */}
      {primaryError && (
        <div
          className="mb-4 p-3.5 rounded-xl bg-rose-950/80 border-2 border-rose-500 text-rose-200 text-xs font-mono flex items-start gap-2.5 shadow-xl shadow-rose-950/60 animate-shake"
          role="alert"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0 animate-bounce" />
          <div className="flex-1">
            <span className="font-bold text-rose-300 block mb-0.5">Authentication Warning:</span>
            <span>{primaryError}</span>
          </div>
        </div>
      )}

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            autoComplete="username"
            required
            value={form.data.username}
            onChange={(e) => {
              form.clearErrors('username');
              form.setData('username', e.target.value);
            }}
            placeholder="e.g. nightowl27"
            className={form.errors.username ? '!border-rose-500 !bg-rose-950/20 !shadow-[0_0_12px_rgba(244,63,94,0.35)]' : ''}
          />
          {form.errors.username && (
            <p className="field-error !text-rose-400 font-mono text-xs mt-1.5 flex items-center gap-1.5" role="alert">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{form.errors.username}</span>
            </p>
          )}
        </div>

        <div className="field">
          <div className="field-heading">
            <label htmlFor="password">Password</label>
            <Link href="/recovery">Forgot your password?</Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.data.password}
            onChange={(e) => {
              form.clearErrors('password');
              form.setData('password', e.target.value);
            }}
            placeholder="Enter your password"
            className={form.errors.password ? '!border-rose-500 !bg-rose-950/20 !shadow-[0_0_14px_rgba(244,63,94,0.4)]' : ''}
          />
          {form.errors.password && (
            <p className="field-error !text-rose-400 font-mono text-xs mt-1.5 flex items-center gap-1.5" role="alert">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{form.errors.password}</span>
            </p>
          )}
        </div>

        <button className="button" disabled={form.processing}>
          {form.processing ? 'Logging in…' : 'Log In'}
          <ArrowUpRight size={16} />
        </button>
      </form>
      <div className="auth-card-footer">
        New to KYAnonymous? <Link href="/register">Create an account</Link>
      </div>
    </AuthFrame>
  );
}
