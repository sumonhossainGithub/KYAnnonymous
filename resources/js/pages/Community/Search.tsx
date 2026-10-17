import React, { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Search as SearchIcon } from 'lucide-react';

interface Props {
  query: string;
  posts: { public_id: string; title: string; created_at: string; author: string }[];
  notices: { public_id: string; title: string; created_at: string }[];
}

export default function Search({ query, posts, notices }: Props) {
  const [searchTerm, setSearchTerm] = useState(query);
  const { get, processing } = useForm();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    get(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Search Community</h1>
          <p className="text-xs text-slate-400 mt-1">Search discussions, posts, and topics anonymously.</p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            required
            minLength={2}
            aria-label="Search the community"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keywords, topics, thoughts..."
            className="flex-1 px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs font-mono"
          />
          <button
            type="submit"
            disabled={processing}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1.5"
          >
            <SearchIcon className="w-4 h-4" />
            <span>Search</span>
          </button>
        </form>

        {!query && (
          <div className="p-10 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl">
            <SearchIcon size={24} className="text-cyan-400 mx-auto mb-2 opacity-60" />
            <h2 className="text-sm font-bold text-slate-200">Find What You're Looking For</h2>
            <p className="text-xs text-slate-500 mt-1">
              Type at least two characters to search through community posts and notices.
            </p>
          </div>
        )}

        {query && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">Posts Found</h2>
              {posts.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono">No posts matched your search.</p>
              ) : (
                <div className="space-y-2">
                  {posts.map((p) => (
                    <Link
                      key={p.public_id}
                      href={`/posts/${p.public_id}`}
                      className="block p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl hover:border-slate-700 transition"
                    >
                      <h3 className="font-semibold text-slate-200 text-sm">{p.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        By {p.author} • {p.created_at}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {notices.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Notices Found</h2>
                <div className="space-y-2">
                  {notices.map((n) => (
                    <div key={n.public_id} className="p-4 bg-gray-900/50 border border-indigo-950/60 rounded-xl">
                      <h3 className="font-semibold text-gray-200 text-sm">{n.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{n.created_at}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
