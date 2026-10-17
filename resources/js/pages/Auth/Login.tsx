import type { FormEvent } from 'react';
import { useForm, Link } from '@inertiajs/react';
import AuthFrame from '@/components/AuthFrame';
import { ArrowUpRight, AlertCircle } from 'lucide-react';

export default function Login() {
  const form = useForm({ username: '', password: '' });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    form.post('/login', {
      onFinish: () => form.reset('password'),
    });
  };
  return (
    <AuthFrame returning>
      <h2>Welcome Back</h2>
      <p>Log in to continue your private conversations.</p>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            autoComplete="username"
            required
            value={form.data.username}
            onChange={(e) => form.setData('username', e.target.value)}
            placeholder="e.g. nightowl27"
            className={form.errors.username ? '!border-rose-500 !shadow-[0_0_10px_rgba(244,63,94,0.3)]' : ''}
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
            onChange={(e) => form.setData('password', e.target.value)}
            placeholder="Enter your password"
            className={form.errors.password ? '!border-rose-500 !shadow-[0_0_12px_rgba(244,63,94,0.35)]' : ''}
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
