import React from 'react';
import { useForm, router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { FileText, Lock, Unlock, EyeOff, Eye, Search, ArrowLeft, Ghost } from 'lucide-react';

interface PostItem {
  public_id: string;
  title: string;
  body: string;
  author: string;
  author_username: string;
  score: number;
  comments_count: number;
  comments_locked: boolean;
  status: string;
  is_ghost: boolean;
  created_at: string;
}

interface Props {
  posts: {
    data: PostItem[];
    links?: { url: string | null; label: string; active: boolean }[];
  };
  query?: string;
}

export default function Posts({ posts, query }: Props) {
  const { data, setData, get } = useForm({
    q: query || '',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    get('/admin/posts');
  };

  const handleToggleStatus = (publicId: string, currentStatus: string) => {
    const action = currentStatus === 'ACTIVE' ? 'remove/hide' : 'restore';
    if (confirm(`Are you sure you want to ${action} this post?`)) {
      router.post(`/admin/posts/${publicId}/toggle-status`, {}, { preserveScroll: true });
    }
  };

  const handleToggleLock = (publicId: string) => {
    router.post(`/admin/posts/${publicId}/toggle-lock`, {}, { preserveScroll: true });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cyan-950/40">
          <div className="flex items-center space-x-3">
            <Link href="/admin/dashboard" className="p-2 bg-slate-900 border border-cyan-900/50 hover:border-cyan-400 rounded-lg text-cyan-400 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-wider text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <span>MANAGE POSTS</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Moderate posts, lock comments, or hide inappropriate content
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
            <div className="relative min-w-0 flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={data.q}
                onChange={(e) => setData('q', e.target.value)}
                placeholder="Search posts..."
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-cyan-900/40 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono w-full sm:w-48"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-cyan-600/30 border border-cyan-500/50 hover:bg-cyan-500/40 text-cyan-200 text-xs font-semibold rounded-lg transition"
            >
              Filter
            </button>
          </form>
        </div>

        {/* Posts Table */}
        <p className="text-xs text-slate-400 md:hidden">Swipe the table to see all columns and actions.</p>
        <div role="region" aria-label="Post moderation table" tabIndex={0} className="overflow-x-auto bg-slate-950/80 border border-cyan-950/60 rounded-xl backdrop-blur-md shadow-2xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-cyan-400 uppercase font-mono tracking-wider border-b border-cyan-950/60">
              <tr>
                <th className="p-3.5">Post Details</th>
                <th className="p-3.5">Author</th>
                <th className="p-3.5">Metrics</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Lock</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 font-sans">
              {posts.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500 font-mono">
                    No posts found matching your search.
                  </td>
                </tr>
              ) : (
                posts.data.map((p) => (
                  <tr key={p.public_id} className="hover:bg-cyan-950/20 transition">
                    <td className="p-3.5 max-w-xs">
                      <Link href={`/posts/${p.public_id}`} className="font-semibold text-slate-100 hover:text-cyan-300 transition line-clamp-1">
                        {p.title}
                      </Link>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-mono">{p.body}</p>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        {p.is_ghost && <Ghost className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />}
                        <span className={`font-mono text-xs ${p.is_ghost ? 'text-cyan-300 font-semibold' : 'text-slate-300'}`}>
                          {p.author}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">@{p.author_username}</span>
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className="text-cyan-400 font-semibold">{p.score}</span> pts ·{' '}
                      <span className="text-slate-400">{p.comments_count}</span> comm
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          p.status === 'ACTIVE'
                            ? 'bg-emerald-950/80 border border-emerald-800/60 text-emerald-300'
                            : 'bg-rose-950/80 border border-rose-800/60 text-rose-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {p.comments_locked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500">
                          <Unlock className="w-3 h-3" /> Open
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">{p.created_at}</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleLock(p.public_id)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-slate-100 text-[11px] font-mono transition flex items-center gap-1"
                          title={p.comments_locked ? 'Unlock comments' : 'Lock comments'}
                        >
                          {p.comments_locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{p.comments_locked ? 'Unlock' : 'Lock'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p.public_id, p.status)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono transition flex items-center gap-1 border ${
                            p.status === 'ACTIVE'
                              ? 'bg-rose-950/60 hover:bg-rose-900/60 border-rose-800/60 text-rose-300'
                              : 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-800/60 text-emerald-300'
                          }`}
                        >
                          {p.status === 'ACTIVE' ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{p.status === 'ACTIVE' ? 'Hide' : 'Unhide'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
