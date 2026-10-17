import type { FormEvent } from 'react';
import { useForm, Link } from '@inertiajs/react';
import AuthFrame from '@/components/AuthFrame';
import { ArrowUpRight } from 'lucide-react';

export default function Login() {
  const form = useForm({ username: '', password: '' });
  const submit = (e: FormEvent) => { e.preventDefault(); form.post('/login'); };
  return <AuthFrame returning><h2>Welcome Back</h2><p>Log in to continue your private conversations.</p><form onSubmit={submit}>
    <div className="field"><label htmlFor="username">Username</label><input id="username" autoComplete="username" required value={form.data.username} onChange={e => form.setData('username', e.target.value)} placeholder="e.g. nightowl27" />{form.errors.username && <p className="field-error" role="alert">{form.errors.username}</p>}</div>
    <div className="field"><div className="field-heading"><label htmlFor="password">Password</label><Link href="/recovery">Forgot your password?</Link></div><input id="password" type="password" autoComplete="current-password" required value={form.data.password} onChange={e => form.setData('password', e.target.value)} placeholder="Enter your password" />{form.errors.password && <p className="field-error" role="alert">{form.errors.password}</p>}</div>
    <button className="button" disabled={form.processing}>{form.processing ? 'Logging in…' : 'Log In'}<ArrowUpRight size={16} /></button>
  </form><div className="auth-card-footer">New to KYAnonymous? <Link href="/register">Create an account</Link></div></AuthFrame>;
}
