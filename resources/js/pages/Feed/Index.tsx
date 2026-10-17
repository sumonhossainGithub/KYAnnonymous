import { Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import type { Post, Organization, Notice, SharedProps, ChatRoomSummary } from '@/types';
import {
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Plus,
  ShieldCheck,
  Ghost,
  Clock,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Radio,
  Sparkles,
  Lock,
} from 'lucide-react';

interface Props {
  posts: { data: Post[]; links: { url: string | null; label: string; active: boolean }[] };
  organizations: Organization[];
  notices: Notice[];
  currentSort: string;
  currentOrg: string | null;
  rooms: ChatRoomSummary[];
  emergencyLockdown?: boolean;
}

export default function Index({
  posts,
  organizations,
  notices,
  currentSort,
  currentOrg,
  rooms,
  emergencyLockdown,
}: Props) {
  const { auth, site } = usePage<SharedProps>().props;

  const filterUrl = (sort: string, organization = currentOrg) =>
    `/feed?${new URLSearchParams({ sort, ...(organization ? { organization } : {}) })}`;

  const vote = (post: Post, direction: number) =>
    auth.user
      ? router.post(
          `/posts/${post.public_id}/vote`,
          { vote: post.user_vote === direction ? 0 : direction },
          { preserveScroll: true }
        )
      : router.visit('/login');

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Emergency Lockdown Notice */}
        {emergencyLockdown && (
          <div className="p-4 bg-rose-950/80 border border-rose-500 rounded-xl text-rose-300 font-mono text-xs flex items-center justify-between shadow-2xl">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse flex-shrink-0" />
              <span>TEMPORARY LOCKDOWN: New posts and chat messages are paused by admin.</span>
            </span>
            <span className="text-[10px] text-slate-400">READ-ONLY</span>
          </div>
        )}

        {/* Minimal Hero / Guest Greeting */}
        {!auth.user ? (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-950/90 border border-slate-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-md">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>100% PRIVATE · ZERO TRACKING</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
                {site.homepage_title}
              </h1>
              {site.homepage_description ? (
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                  {site.homepage_description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-cyan-950/50"
              >
                Create Free Account
              </Link>
              <Link
                href="/login"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition"
              >
                Log In
              </Link>
            </div>
          </div>
        ) : (
          /* Logged In Quick Composer */
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800/80 shadow-lg flex items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="user-avatar flex-shrink-0">
                {auth.user.display_name.slice(0, 1).toUpperCase()}
              </span>
              <Link
                href="/posts/create"
                className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-400 hover:text-slate-300 transition text-left"
              >
                What is on your mind? Share anonymously...
              </Link>
            </div>
            <Link
              href="/posts/create"
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 flex-shrink-0 shadow"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">New Post</span>
            </Link>
          </div>
        )}

        {/* Feed & Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Feed Column */}
          <main className="lg:col-span-8 space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-950/60 border border-slate-800/60 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-1">
                {[
                  { key: 'new', label: 'Newest', icon: Clock },
                  { key: 'top', label: 'Top Rated', icon: TrendingUp },
                  { key: 'discussed', label: 'Most Discussed', icon: MessageSquare },
                ].map(({ key, label, icon: Icon }) => (
                  <Link
                    key={key}
                    href={filterUrl(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 ${
                      currentSort === key
                        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>

              {currentOrg && (
                <Link
                  href={filterUrl(currentSort, null)}
                  className="text-rose-400 hover:text-rose-300 text-xs font-mono pr-2"
                >
                  [Clear group filter]
                </Link>
              )}
            </div>

            {/* Posts List */}
            {posts.data.length > 0 ? (
              <div className="space-y-3">
                {posts.data.map((post) => (
                  <article
                    key={post.public_id}
                    className="p-5 bg-slate-950/80 border border-slate-800/70 hover:border-slate-700/80 rounded-2xl transition shadow-lg group backdrop-blur-sm"
                  >
                    {/* Author Meta */}
                    <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="user-avatar text-xs w-7 h-7 overflow-hidden flex items-center justify-center">
                          {post.is_ghost ? (
                            <Ghost size={13} className="text-cyan-400" />
                          ) : post.author.avatar_url ? (
                            <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            post.author.display_name.slice(0, 1).toUpperCase()
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <strong className={post.is_ghost ? 'text-cyan-300 font-mono' : 'text-slate-200'}>
                            {post.author.display_name}
                          </strong>
                          <span className="text-slate-500 font-mono text-[11px]">@{post.author.username}</span>
                          {post.is_ghost && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950/80 border border-cyan-800 text-cyan-300">
                              ANONYMOUS
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                        <span>{post.created_at}</span>
                        {post.organization && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                            {post.organization.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Post Content */}
                    <Link href={`/posts/${post.public_id}`} className="block group-hover:text-cyan-300 transition">
                      <h2 className="text-base font-bold text-slate-100 group-hover:text-cyan-200 transition">
                        {post.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed line-clamp-3 font-sans">
                        {post.body}
                      </p>
                    </Link>

                    {/* Action Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400 font-mono">
                      <div className="flex items-center gap-4">
                        {/* Upvote / Downvote */}
                        <div className="flex items-center bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                          <button
                            onClick={() => vote(post, 1)}
                            aria-label="Upvote"
                            aria-pressed={post.user_vote === 1}
                            className={`p-0.5 transition ${post.user_vote === 1 ? 'text-cyan-400' : 'hover:text-cyan-400'}`}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <span
                            className={`px-1.5 font-bold ${
                              post.score > 0
                                ? 'text-cyan-400'
                                : post.score < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {post.score}
                          </span>
                          <button
                            onClick={() => vote(post, -1)}
                            aria-label="Downvote"
                            aria-pressed={post.user_vote === -1}
                            className={`p-0.5 transition ${post.user_vote === -1 ? 'text-rose-400' : 'hover:text-rose-400'}`}
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>

                        {/* Comments link */}
                        <Link
                          href={`/posts/${post.public_id}`}
                          className="flex items-center gap-1.5 hover:text-cyan-300 transition"
                        >
                          <MessageSquare size={14} />
                          <span>{post.comments_count} replies</span>
                        </Link>
                      </div>

                      {post.comments_locked && (
                        <span className="text-[11px] text-amber-400 flex items-center gap-1">
                          <Lock size={12} />
                          <span>Locked</span>
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-3 opacity-60" />
                <h3 className="text-sm font-bold text-slate-200">No posts found yet</h3>
                <p className="text-xs text-slate-500 mt-1">Be the first to share an anonymous thought.</p>
                <Link
                  href={auth.user ? '/posts/create' : '/register'}
                  className="mt-4 inline-block px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl transition"
                >
                  Write First Post
                </Link>
              </div>
            )}

            {/* Pagination */}
            {posts.links.length > 3 && (
              <nav className="flex items-center justify-center gap-2 pt-4 font-mono text-xs">
                {posts.links.map((link, i) =>
                  link.url ? (
                    <Link
                      key={i}
                      href={link.url}
                      className={`px-3 py-1.5 rounded-lg border transition ${
                        link.active
                          ? 'bg-cyan-950 border-cyan-800 text-cyan-300 font-bold'
                          : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      {link.label.replace(/&laquo;/g, '←').replace(/&raquo;/g, '→')}
                    </Link>
                  ) : (
                    <span key={i} className="px-3 py-1.5 text-slate-600">
                      {link.label.replace(/&laquo;/g, '←').replace(/&raquo;/g, '→')}
                    </span>
                  )
                )}
              </nav>
            )}
          </main>

          {/* Minimal Clean Sidebar */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Live Chat Rooms Card */}
            <div className="p-5 bg-slate-950/80 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
                  <Radio size={14} className="text-cyan-400 animate-pulse" />
                  <span>LIVE CHAT ROOMS</span>
                </span>
                <Link href="/chat" className="text-[11px] text-cyan-400 hover:underline font-mono">
                  All Rooms →
                </Link>
              </div>
              <div className="divide-y divide-slate-900">
                {rooms.slice(0, 4).map((room) => (
                  <Link
                    key={room.public_id}
                    href={`/chat/${room.slug}`}
                    className="py-2.5 flex items-center justify-between group text-xs transition"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 group-hover:text-cyan-300 transition block">
                        {room.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {room.messages_count || 0} messages
                      </span>
                    </div>
                    <ArrowRight size={13} className="text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Organizations / Topic Circles */}
            {organizations.length > 0 && (
              <div className="p-5 bg-slate-950/80 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm">
                <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-3">
                  Topic Circles
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {organizations.map((org) => (
                    <Link
                      key={org.public_id}
                      href={filterUrl(currentSort, org.slug)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition ${
                        org.slug === currentOrg
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {org.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Notices */}
            {notices.length > 0 && (
              <div className="p-5 bg-slate-950/80 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm">
                <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-2">
                  Notices
                </h3>
                <div className="space-y-2">
                  {notices.slice(0, 2).map((notice) => (
                    <Link href="/notices" key={notice.public_id} className="block text-xs group">
                      <strong className="text-slate-200 group-hover:text-cyan-300 transition block">
                        {notice.title}
                      </strong>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{notice.body}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy Promise Pill */}
            <div className="p-5 bg-gradient-to-br from-slate-950/90 to-cyan-950/20 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span className="text-xs font-mono font-bold text-slate-200">PRIVACY PROMISE</span>
              </div>
              <ul className="text-xs text-slate-400 space-y-1.5 font-sans">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> No email or phone needed
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> No IP address logs stored
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Random ghost names available
                </li>
              </ul>
              <Link href="/rules" className="text-cyan-400 hover:underline text-[11px] font-mono mt-3 inline-block">
                Read Community Rules →
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
