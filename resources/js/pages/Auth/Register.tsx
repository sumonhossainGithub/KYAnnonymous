import type { FormEvent } from 'react';
import { useForm, Link, usePage } from '@inertiajs/react';
import type { SharedProps } from '@/types';
import AuthFrame from '@/components/AuthFrame';
import { ArrowUpRight, AlertCircle, AlertTriangle } from 'lucide-react';

export default function Register() {
  const { site } = usePage<SharedProps>().props;
  const form = useForm({
    display_name: '',
    username: '',
    gender: 'Male',
    show_gender: false,
    password: '',
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    form.post('/register', {
      onSuccess: () => {
        window.location.href = '/';
      },
    });
  };

  if (!site.registration_enabled) {
    return (
      <AuthFrame>
        <h2>Registration is closed</h2>
        <p>New accounts are currently paused. Existing members can still sign in.</p>
        <Link href="/login" className="button">
          Log in
        </Link>
      </AuthFrame>
    );
  }

  const hasErrors = form.hasErrors || Object.keys(form.errors).length > 0;
  const primaryError = hasErrors ? Object.values(form.errors)[0] : null;

  return (
    <AuthFrame>
      <h2>Create Your Account</h2>
      <p>Pick a nickname and username. No email or phone needed.</p>

      {/* Prominent Warning Alert */}
      {primaryError && (
        <div
          className="mb-4 p-3.5 rounded-xl bg-rose-950/80 border-2 border-rose-500 text-rose-200 text-xs font-mono flex items-start gap-2.5 shadow-xl shadow-rose-950/60 animate-shake"
          role="alert"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0 animate-bounce" />
          <div className="flex-1">
            <span className="font-bold text-rose-300 block mb-0.5">Registration Warning:</span>
            <span>{primaryError}</span>
          </div>
        </div>
      )}

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="display_name">Display Name (Nickname)</label>
          <input
            id="display_name"
            required
            minLength={2}
            maxLength={50}
            value={form.data.display_name}
            onChange={(e) => {
              form.clearErrors('display_name');
              form.setData('display_name', e.target.value);
            }}
            placeholder="e.g. Wandering Moon"
            className={form.errors.display_name ? '!border-rose-500 !bg-rose-950/20 !shadow-[0_0_12px_rgba(244,63,94,0.35)]' : ''}
          />
          {form.errors.display_name && (
            <p className="field-error !text-rose-400 font-mono text-xs mt-1.5 flex items-center gap-1.5" role="alert">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{form.errors.display_name}</span>
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="username">Unique Username</label>
          <input
            id="username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_]+"
            value={form.data.username}
            onChange={(e) => {
              form.clearErrors('username');
              form.setData('username', e.target.value);
            }}
            placeholder="e.g. wandering_moon"
            className={form.errors.username ? '!border-rose-500 !bg-rose-950/20 !shadow-[0_0_12px_rgba(244,63,94,0.35)]' : ''}
          />
          {form.errors.username && (
            <p className="field-error !text-rose-400 font-mono text-xs mt-1.5 flex items-center gap-1.5" role="alert">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{form.errors.username}</span>
            </p>
          )}
        </div>

        <fieldset>
          <legend className="field-heading">Gender</legend>
          <div className="gender-options">
            {['Male', 'Female'].map((gender) => (
              <label key={gender}>
                <input
                  type="radio"
                  name="gender"
                  value={gender}
                  checked={form.data.gender === gender}
                  onChange={(e) => form.setData('gender', e.target.value)}
                />
                {gender}
              </label>
            ))}
          </div>
          {form.errors.gender && <p className="field-error !text-rose-400">{form.errors.gender}</p>}
        </fieldset>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={form.data.show_gender}
            onChange={(e) => form.setData('show_gender', e.target.checked)}
          />
          Show gender on my public profile
        </label>

        <div className="field">
          <label htmlFor="password">
            Password <span>At least 6 characters</span>
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={form.data.password}
            onChange={(e) => {
              form.clearErrors('password');
              form.setData('password', e.target.value);
            }}
            placeholder="Create a secure password"
            className={form.errors.password ? '!border-rose-500 !bg-rose-950/20 !shadow-[0_0_12px_rgba(244,63,94,0.35)]' : ''}
          />
          {form.errors.password && (
            <p className="field-error !text-rose-400 font-mono text-xs mt-1.5 flex items-center gap-1.5" role="alert">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{form.errors.password}</span>
            </p>
          )}
        </div>

        <button className="button" disabled={form.processing}>
          {form.processing ? 'Creating account…' : 'Create Account'}
          <ArrowUpRight size={16} />
        </button>
      </form>

      <div className="auth-card-footer">
        Already have an account? <Link href="/login">Log In</Link>
      </div>
    </AuthFrame>
  );
}
