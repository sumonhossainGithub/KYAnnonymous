import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import {
  Camera,
  Upload,
  Trash2,
  Check,
  User as UserIcon,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';

interface ProfileUser {
  public_id: string;
  display_name: string;
  username: string;
  gender: string;
  show_gender: boolean;
  avatar_url: string | null;
  role: string;
  status: string;
  created_at: string | null;
}

interface ProfileEditProps {
  user: ProfileUser;
}

// 8 stylish, lightweight SVG avatar presets for users who want cool identities without personal photos
const AVATAR_PRESETS = [
  {
    name: 'Cosmic Voyager',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230284c7"/><stop offset="100%" stop-color="%236366f1"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g)"/><circle cx="50" cy="38" r="18" fill="%23ffffff" opacity="0.9"/><circle cx="50" cy="85" r="30" fill="%23ffffff" opacity="0.85"/><circle cx="35" cy="30" r="4" fill="%2338bdf8"/></svg>',
  },
  {
    name: 'Cyber Phantom',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%238b5cf6"/><stop offset="100%" stop-color="%23ec4899"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23g)"/><polygon points="50,20 80,75 20,75" fill="%23ffffff" opacity="0.9"/><circle cx="50" cy="52" r="8" fill="%238b5cf6"/></svg>',
  },
  {
    name: 'Neon Sentinel',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310b981"/><stop offset="100%" stop-color="%2306b6d4"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g)"/><circle cx="50" cy="50" r="28" fill="none" stroke="%23ffffff" stroke-width="6"/><circle cx="50" cy="50" r="10" fill="%23ffffff"/></svg>',
  },
  {
    name: 'Solar Pulse',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23f59e0b"/><stop offset="100%" stop-color="%23ef4444"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g)"/><polygon points="50,15 62,38 88,40 68,58 74,83 50,70 26,83 32,58 12,40 38,38" fill="%23ffffff" opacity="0.95"/></svg>',
  },
  {
    name: 'Stellar Ghost',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233b82f6"/><stop offset="100%" stop-color="%231e1b4b"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g)"/><path d="M50 22 C35 22 26 35 26 52 C26 68 32 78 40 78 C45 78 47 72 50 72 C53 72 55 78 60 78 C68 78 74 68 74 52 C74 35 65 22 50 22 Z" fill="%2338bdf8"/><circle cx="42" cy="45" r="4" fill="%230f172a"/><circle cx="58" cy="45" r="4" fill="%230f172a"/></svg>',
  },
  {
    name: 'Deep Abyss',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23064e3b"/><stop offset="100%" stop-color="%230284c7"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g)"/><circle cx="50" cy="50" r="22" fill="%23ffffff" opacity="0.2"/><circle cx="50" cy="50" r="14" fill="%23ffffff" opacity="0.85"/></svg>',
  },
  {
    name: 'Hyper Nova',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23d946ef"/><stop offset="100%" stop-color="%236366f1"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g)"/><circle cx="50" cy="50" r="32" fill="none" stroke="%23f472b6" stroke-width="4" stroke-dasharray="8 6"/><circle cx="50" cy="50" r="16" fill="%23ffffff"/></svg>',
  },
  {
    name: 'Dark Emerald',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23059669"/><stop offset="100%" stop-color="%23047857"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g)"/><path d="M50 25 L75 50 L50 75 L25 50 Z" fill="%2334d399"/><circle cx="50" cy="50" r="7" fill="%23ffffff"/></svg>',
  },
];

export default function ProfileEdit({ user }: ProfileEditProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatar_url);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Details Form
  const detailsForm = useForm({
    display_name: user.display_name,
    show_gender: user.show_gender,
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2MB limit. Please choose a smaller image.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUploadCustomImage = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const data = new FormData();
    data.append('avatar_file', selectedFile);

    setUploading(true);
    router.post('/profile/avatar', data, {
      preserveScroll: true,
      onSuccess: () => {
        setSelectedFile(null);
        setUploading(false);
      },
      onError: () => {
        setUploading(false);
      },
    });
  };

  const handleSelectPreset = (presetUrl: string) => {
    setPreviewUrl(presetUrl);
    setSelectedFile(null);
    setUploading(true);
    router.post(
      '/profile/avatar',
      { avatar_preset: presetUrl },
      {
        preserveScroll: true,
        onSuccess: () => setUploading(false),
        onError: () => setUploading(false),
      }
    );
  };

  const handleRemoveAvatar = () => {
    if (!confirm('Remove profile photo and restore default letter avatar?')) return;
    setUploading(true);
    router.delete('/profile/avatar', {
      preserveScroll: true,
      onSuccess: () => {
        setPreviewUrl(null);
        setSelectedFile(null);
        setUploading(false);
      },
      onError: () => setUploading(false),
    });
  };

  const submitDetails = (e: FormEvent) => {
    e.preventDefault();
    detailsForm.post('/profile', {
      preserveScroll: true,
    });
  };

  return (
    <AppLayout>
      <Head title="Profile & Avatar Settings" />

      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        {/* Header Title */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-cyan-400">Account Customization</span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
              <UserIcon className="text-cyan-400" size={24} />
              <span>Profile & Avatar</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Add an attractive image avatar to stand out in chats and discussions.
            </p>
          </div>
        </div>

        {/* 1. AVATAR UPLOAD & SELECTION PANEL */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-[0_0_25px_rgba(2,132,199,0.06)] space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
            <Camera size={18} className="text-cyan-400" />
            <h2 className="font-bold text-slate-200 text-sm sm:text-base">Profile Image / Avatar</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Live Avatar Preview */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl p-1 bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-500 shadow-[0_0_25px_rgba(6,182,212,0.3)]">
                  <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center overflow-hidden">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={user.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-bold font-mono text-cyan-400">
                        {user.display_name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {user.avatar_url && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploading}
                    className="absolute -top-2 -right-2 p-1.5 rounded-full bg-rose-950 border border-rose-600/70 text-rose-300 hover:bg-rose-900 hover:text-white transition shadow-md"
                    title="Remove avatar"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <span className="font-mono text-[11px] text-slate-400">Live Preview</span>
            </div>

            {/* Custom Upload Controls */}
            <div className="flex-1 space-y-4 w-full text-left">
              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                  Upload Custom Image
                </label>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                  Upload any JPG, PNG, WEBP, GIF, or SVG photo up to 2MB. Your profile image will appear next to your chat messages.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center gap-2 transition"
                  >
                    <Upload size={14} className="text-cyan-400" />
                    <span>{selectedFile ? 'Change File…' : 'Choose Image File'}</span>
                  </button>

                  {selectedFile && (
                    <button
                      type="button"
                      onClick={handleUploadCustomImage}
                      disabled={uploading}
                      className="button button-small !py-2 !px-4 !text-xs font-mono"
                    >
                      {uploading ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Saving…</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>Save Uploaded Photo</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {selectedFile && (
                  <p className="text-[11px] font-mono text-cyan-300 mt-2 flex items-center gap-1.5">
                    <ImageIcon size={12} />
                    <span>Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2. PRESET CELESTIAL AVATARS */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-amber-400" />
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-300">
                Or Pick an Anonymous Celestial Avatar (1-Click)
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Don't want to use personal photos? Pick one of our curated futuristic avatars:
            </p>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 pt-2">
              {AVATAR_PRESETS.map((preset, index) => {
                const isSelected = previewUrl === preset.url;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectPreset(preset.url)}
                    disabled={uploading}
                    className={`relative p-1 rounded-xl transition flex flex-col items-center gap-1.5 group ${
                      isSelected
                        ? 'ring-2 ring-cyan-400 bg-cyan-950/60 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                        : 'bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800 hover:border-cyan-500/50'
                    }`}
                    title={`Select ${preset.name}`}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center">
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 group-hover:text-slate-200 truncate w-full text-center">
                      {preset.name.split(' ')[0]}
                    </span>
                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. ACCOUNT PROFILE DETAILS */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.3)] space-y-5 text-left">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
            <UserIcon size={18} className="text-cyan-400" />
            <h2 className="font-bold text-slate-200 text-sm sm:text-base">Profile Details</h2>
          </div>

          <form onSubmit={submitDetails} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={detailsForm.data.display_name}
                  onChange={(e) => detailsForm.setData('display_name', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  maxLength={50}
                  required
                />
                {detailsForm.errors.display_name && (
                  <p className="text-xs text-rose-400 font-mono mt-1">{detailsForm.errors.display_name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Username (Permanent ID)
                </label>
                <input
                  type="text"
                  value={`@${user.username}`}
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-slate-800 text-slate-500 font-mono text-xs cursor-not-allowed"
                />
                <span className="text-[10px] font-mono text-slate-500">Usernames cannot be changed for security.</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <span className="text-xs font-mono text-slate-200 block">Show Gender Badge</span>
                <span className="text-[11px] font-mono text-slate-500 block">
                  Currently registered as: <strong className="text-slate-300">{user.gender}</strong>
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={detailsForm.data.show_gender}
                  onChange={(e) => detailsForm.setData('show_gender', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-end pt-3">
              <button
                type="submit"
                disabled={detailsForm.processing}
                className="button !py-2 !px-5 text-xs font-mono"
              >
                {detailsForm.processing ? 'Saving Changes…' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* 4. PRIVACY & SAFETY CARD */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 font-mono text-xs text-slate-400 flex items-start gap-3">
          <ShieldCheck size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-slate-200 font-bold">Privacy & Anonymity Note</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your profile picture is visible in public chats and comments when you post with your username. If you activate <strong>Anonymous Ghost Disguise</strong> in chat, your real profile image and username are completely hidden behind a ghost avatar.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
