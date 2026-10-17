import React, { useState, useRef } from 'react';
import { useForm, Link, usePage } from '@inertiajs/react';
import type { SharedProps } from '@/types';
import AppLayout from '@/layouts/AppLayout';
import { ArrowLeft, Send, Ghost, ShieldCheck, AlertTriangle, Image as ImageIcon, X } from 'lucide-react';

interface Props {
  organizations: { public_id: string; name: string }[];
  emergencyLockdown?: boolean;
}

export default function CreatePost({ organizations, emergencyLockdown }: Props) {
  const { site, auth } = usePage<SharedProps>().props;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const { data, setData, post, processing, errors } = useForm<{
    title: string;
    body: string;
    organization_public_id: string;
    is_ghost: boolean;
    image: File | null;
  }>({
    title: '',
    body: '',
    organization_public_id: '',
    is_ghost: false,
    image: null,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFileError('Please select a valid image file (JPG, PNG, WebP, GIF, SVG).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError('Image size must be less than 10 MB.');
      return;
    }

    setData('image', file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setData('image', null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/posts', {
      forceFormData: true,
    });
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Feed</span>
        </Link>

        {emergencyLockdown && (
          <div className="p-4 bg-rose-950/80 border border-rose-600 rounded-xl text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse flex-shrink-0" />
            <span>Lockdown is active. New posts are temporarily paused by admin.</span>
          </div>
        )}

        <div className="p-4 sm:p-8 bg-slate-950/80 border border-cyan-950/70 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px] mb-2">
            <span className="status-dot animate-ping" />
            <span>NEW ANONYMOUS POST</span>
          </div>
          <h1 className="text-xl font-bold tracking-wide text-slate-100 mb-2">
            Share Your Thoughts
          </h1>
          <p className="text-xs text-slate-400 font-mono mb-6">
            Safe, private, and anonymous · No personal data stored
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {organizations.length > 0 && (
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Category / Group (Optional)
                </label>
                <select
                  value={data.organization_public_id}
                  onChange={(e) => setData('organization_public_id', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-cyan-950 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400 text-xs font-mono"
                >
                  <option value="">General Community (Default)</option>
                  {organizations.map((org) => (
                    <option key={org.public_id} value={org.public_id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Post Title
              </label>
              <input
                type="text"
                required
                value={data.title}
                onChange={(e) => setData('title', e.target.value)}
                placeholder="Give your post a title..."
                className="w-full px-3 py-2.5 bg-slate-900 border border-cyan-950 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400 text-sm placeholder-slate-600 font-sans"
              />
              {errors.title && <p className="text-rose-400 text-xs font-mono mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Post Content
              </label>
              <textarea
                required
                rows={6}
                value={data.body}
                onChange={(e) => setData('body', e.target.value)}
                placeholder="Write what's on your mind. Your identity is completely safe..."
                className="w-full px-3 py-2.5 bg-slate-900 border border-cyan-950 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400 text-sm placeholder-slate-600 font-sans"
              />
              {errors.body && <p className="text-rose-400 text-xs font-mono mt-1">{errors.body}</p>}
            </div>

            {/* Post Picture Upload */}
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  <span>Attach Picture (Optional &lt; 10 MB)</span>
                </label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-mono"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                onChange={handleImageChange}
                className="hidden"
                id="post-image-file-input"
              />

              {!imagePreview ? (
                <label
                  htmlFor="post-image-file-input"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-cyan-500/60 rounded-xl p-5 cursor-pointer bg-slate-950/40 hover:bg-slate-900/60 transition group"
                >
                  <ImageIcon className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 transition mb-2" />
                  <span className="text-xs font-mono text-slate-300 group-hover:text-cyan-300">
                    Click to select an image from your device
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 mt-1">
                    Supports JPG, PNG, WEBP, GIF, SVG up to 10 MB
                  </span>
                </label>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 max-h-64 flex items-center justify-center p-2">
                  <img
                    src={imagePreview}
                    alt="Selected preview"
                    className="max-h-60 w-auto object-contain rounded-lg"
                  />
                </div>
              )}

              {fileError && <p className="text-rose-400 text-xs font-mono mt-1.5">{fileError}</p>}
              {errors.image && <p className="text-rose-400 text-xs font-mono mt-1.5">{errors.image}</p>}
            </div>

            {/* Ghost Mode Burner Alias Toggle */}
            <div className="p-4 bg-slate-900/90 border border-cyan-900/50 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!site.anonymous_enabled}
                  checked={data.is_ghost}
                  onChange={(e) => setData('is_ghost', e.target.checked)}
                  className="mt-1 w-4 h-4 rounded bg-slate-950 border-cyan-700 text-cyan-400 focus:ring-0 accent-cyan-400 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Ghost className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-cyan-300 tracking-wider">
                      POST ANONYMOUSLY (HIDE MY USERNAME)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-sans">
                    Publish with a one-time random disguise name (e.g.{' '}
                    <code className="text-cyan-300 font-mono">Ghost-7A3F</code>). Nobody will be able to
                    see your real username or connect this post to your account.
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-2 flex flex-col items-stretch sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>100% Private · No tracking</span>
              </div>

              <button
                type="submit"
                disabled={processing || emergencyLockdown || (!site.posts_enabled && auth.user?.role !== 'SUPER_ADMIN')}
                className="py-2.5 px-6 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center space-x-2 shadow-lg shadow-cyan-950/60"
              >
                <span>Publish Post</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
