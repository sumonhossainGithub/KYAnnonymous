import type { FormEvent } from 'react';
import { useForm, Link, usePage } from '@inertiajs/react';
import type { SharedProps } from '@/types';
import AuthFrame from '@/components/AuthFrame';
import { ArrowUpRight } from 'lucide-react';

export default function Register() {
  const { site } = usePage<SharedProps>().props;
  const form = useForm({ display_name: '', username: '', gender: 'Male', show_gender: false, password: '' });
  const submit = (e: FormEvent) => { e.preventDefault(); form.post('/register'); };
  if (!site.registration_enabled) return <AuthFrame><h2>Registration is closed</h2><p>New accounts are currently paused. Existing members can still sign in.</p><Link href="/login" className="button">Log in</Link></AuthFrame>;
  return <AuthFrame><h2>Create Your Account</h2><p>Pick a nickname and username. No email or phone needed.</p><form onSubmit={submit}>
    <div className="field"><label htmlFor="display_name">Display Name (Nickname)</label><input id="display_name" required minLength={2} maxLength={50} value={form.data.display_name} onChange={e => form.setData('display_name', e.target.value)} placeholder="e.g. Wandering Moon" />{form.errors.display_name && <p className="field-error" role="alert">{form.errors.display_name}</p>}</div>
    <div className="field"><label htmlFor="username">Unique Username</label><input id="username" autoComplete="username" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+" value={form.data.username} onChange={e => form.setData('username', e.target.value)} placeholder="e.g. wandering_moon" />{form.errors.username && <p className="field-error" role="alert">{form.errors.username}</p>}</div>
    <fieldset><legend className="field-heading">Gender</legend><div className="gender-options">{['Male', 'Female'].map(gender => <label key={gender}><input type="radio" name="gender" value={gender} checked={form.data.gender === gender} onChange={e => form.setData('gender', e.target.value)} />{gender}</label>)}</div>{form.errors.gender && <p className="field-error">{form.errors.gender}</p>}</fieldset>
    <label className="checkbox-field"><input type="checkbox" checked={form.data.show_gender} onChange={e => form.setData('show_gender', e.target.checked)} />Show gender on my public profile</label>
    <div className="field"><label htmlFor="password">Password <span>At least 8 characters</span></label><input id="password" type="password" autoComplete="new-password" required minLength={8} value={form.data.password} onChange={e => form.setData('password', e.target.value)} placeholder="Create a secure password" />{form.errors.password && <p className="field-error" role="alert">{form.errors.password}</p>}</div>
    <button className="button" disabled={form.processing}>{form.processing ? 'Creating account…' : 'Create Account'}<ArrowUpRight size={16} /></button>
  </form><div className="auth-card-footer">Already have an account? <Link href="/login">Log In</Link></div></AuthFrame>;
}
