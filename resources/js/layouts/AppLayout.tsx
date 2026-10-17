import { useEffect, useState, type ReactNode, useRef } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import type { SharedProps } from '@/types';
import {
  Telescope,
  MessageSquare,
  Search,
  Bell,
  ArrowUpRight,
  Plus,
  LogOut,
  ShieldCheck,
  Radio,
  Pause,
  Play,
  Menu,
  X,
  FileText,
  Ghost,
  ShieldAlert,
  Terminal,
  Activity,
  Cpu,
  User as UserIcon,
} from 'lucide-react';
import Starfield from '@/components/Starfield';
import { siteThemeStyle } from '@/lib/siteTheme';

const navigation = [
  { href: '/', label: 'Public Chat', icon: MessageSquare },
  { href: '/feed', label: 'Discussion Feed', icon: Activity },
  { href: '/chat', label: 'Chat Rooms', icon: Radio },
  { href: '/search', label: 'Search', icon: Telescope },
  { href: '/notices', label: 'Notices', icon: Bell },
  { href: '/rules', label: 'Rules & Safety', icon: ShieldCheck },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { auth, flash, site } = usePage<SharedProps>().props;
  const { url } = usePage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [smallScreen, setSmallScreen] = useState(() => typeof window !== 'undefined' ? window.matchMedia('(max-width: 1024px)').matches : false);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const returnMenuFocus = useRef(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)');
    const changed = () => {
      setSmallScreen(media.matches);
      if (!media.matches) setMobileOpen(false);
    };
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);

  const closeNavigation = () => {
    setMobileOpen(false);
  };

  useEffect(() => {
    if (!mobileOpen || !smallScreen) {
      if (returnMenuFocus.current && smallScreen) menuButton.current?.focus();
      returnMenuFocus.current = false;
      return;
    }
    returnMenuFocus.current = true;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebar.current?.querySelector<HTMLElement>('a, button')?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
      if (event.key !== 'Tab') return;
      const items = sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!items?.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keys);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', keys);
    };
  }, [mobileOpen, smallScreen]);

  const [paused, setPaused] = useState(() => {
    try {
      return localStorage.getItem('ky-calm-motion') === 'paused';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ky-calm-motion', paused ? 'paused' : 'moving');
    } catch {
      /* Storage is optional. */
    }
  }, [paused]);

  const current = navigation.find((item) =>
    item.href === '/' ? url.split('?')[0] === '/' : url.startsWith(item.href)
  );

  return (
    <div style={siteThemeStyle(site)} className={`cosmos-shell site-theme density-${site.density} ${paused || !site.animations_enabled ? 'is-still' : ''}`}>
      <Head title={`${current?.label || 'Community'} · ${site.site_name}`} />
      {site.animations_enabled && <Starfield paused={paused} />}
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <button className="sidebar-backdrop" onClick={closeNavigation} aria-label="Close navigation" tabIndex={-1} />
      )}

      {/* Slide-out Drawer for Mobile & Tablet (Contains all upper side functionalities) */}
      <aside
        ref={sidebar}
        id="main-navigation"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a[href]')) closeNavigation();
        }}
        className={`cosmos-sidebar ${mobileOpen ? 'open' : ''}`}
        aria-label="Main navigation"
        inert={!mobileOpen}
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? true : undefined}
      >
        {/* Mobile Header with Logo & Close button */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-base shadow-[0_0_12px_rgba(6,182,212,0.3)] select-none">
              {site.logo_text}
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-mono font-bold tracking-wider text-sm text-slate-100">{site.site_name}</span>
              <span className="font-mono text-[7px] tracking-[1.5px] text-cyan-400 mt-0.5">{site.tagline}</span>
            </div>
          </Link>

          <button className="icon-button text-slate-400 hover:text-white" onClick={closeNavigation} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        {/* User Status Card inside Mobile Drawer */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 mb-4">
          {auth.user ? (
            <div className="space-y-2">
              <Link
                href="/profile"
                onClick={closeNavigation}
                className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-800/60 transition group"
              >
                <span className="user-avatar !w-9 !h-9 text-xs font-mono font-bold overflow-hidden border border-cyan-500/40 group-hover:border-cyan-400 transition flex items-center justify-center flex-shrink-0">
                  {auth.user.avatar_url ? (
                    <img
                      src={auth.user.avatar_url}
                      alt={auth.user.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    auth.user.display_name.slice(0, 1).toUpperCase()
                  )}
                </span>
                <div className="flex flex-col text-left min-w-0">
                  <span className="user-name text-xs text-slate-100 font-medium truncate group-hover:text-cyan-300 transition">
                    {auth.user.display_name}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">@{auth.user.username} · Edit Profile</span>
                </div>
                {auth.user.role === 'SUPER_ADMIN' && (
                  <span className="ml-auto px-1.5 py-0.5 bg-cyan-950 border border-cyan-500 rounded text-[8px] font-mono font-bold text-cyan-300">
                    ADMIN
                  </span>
                )}
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Ghost size={14} className="text-cyan-400" />
                <span>Browsing in Ghost Mode</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link href="/login" className="py-1.5 px-3 rounded-lg bg-slate-800 text-slate-200 text-center font-mono text-xs hover:bg-slate-700">
                  Log In
                </Link>
                <Link href="/register" className="py-1.5 px-3 rounded-lg bg-cyan-600 text-white text-center font-mono text-xs font-semibold hover:bg-cyan-500">
                  Join Free
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Quick Action Button for Mobile */}
        {auth.user && (
          <Link
            href="/posts/create"
            className="w-full mb-4 py-2 px-3 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/70 border border-cyan-800/80 text-cyan-300 text-xs font-mono font-medium flex items-center justify-center gap-2 transition"
          >
            <Plus size={14} />
            <span>Create New Post</span>
          </Link>
        )}

        {/* All Upper Side Navigation Items */}
        <div className="sidebar-label">NAVIGATION</div>
        <nav className="sidebar-nav">
          {navigation.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/' ? url === '/' : url.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
                {href === '/' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-auto" />}
                {isActive && href !== '/' && <span className="nav-star text-cyan-400">●</span>}
              </Link>
            );
          })}
          <Link className={`nav-item subtle ${url.startsWith('/privacy') ? 'active' : ''}`} href="/privacy">
            <ShieldAlert size={16} strokeWidth={1.5} />
            <span>Privacy & Security</span>
          </Link>
        </nav>

        {/* Super Admin Links (if super admin) */}
        {auth.user?.role === 'SUPER_ADMIN' && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-label text-cyan-400 flex items-center gap-1">
              <Terminal size={12} />
              <span>ADMIN CONTROLS</span>
            </div>
            <Link className={`nav-item subtle ${url.startsWith('/admin/settings') ? 'active' : ''}`} href="/admin/settings"><Cpu size={15} /><span>Website customization</span></Link>
            <Link className={`nav-item subtle ${url === '/admin/dashboard' ? 'active' : ''}`} href="/admin/dashboard">
              <Cpu size={15} />
              <span>Dashboard</span>
            </Link>
            <Link className={`nav-item subtle ${url === '/admin/stealth' ? 'active' : ''}`} href="/admin/stealth">
              <Ghost size={15} className="text-cyan-400" />
              <span>Stealth & Privacy Tools</span>
            </Link>
            <Link className={`nav-item subtle ${url === '/admin/posts' ? 'active' : ''}`} href="/admin/posts">
              <FileText size={15} />
              <span>Manage Posts</span>
            </Link>
            <Link className={`nav-item subtle ${url === '/admin/chat-rooms' ? 'active' : ''}`} href="/admin/chat-rooms">
              <MessageSquare size={15} />
              <span>Manage Chat Rooms</span>
            </Link>
          </>
        )}

        {/* Bottom Ambient Stars Toggle & Logout */}
        <div className="sidebar-bottom pt-4 mt-auto space-y-2">
          <button
            onClick={() => setPaused(!paused)}
            aria-pressed={paused}
            className="w-full py-2 px-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-[11px] text-slate-400 hover:text-slate-200 flex items-center justify-center gap-2 transition font-mono"
          >
            {paused ? <Play size={12} className="text-cyan-400" /> : <Pause size={12} />}
            <span>{paused ? 'Resume Background Stars' : 'Pause Background Stars'}</span>
          </button>

          {auth.user && (
            <Link
              href="/logout"
              method="post"
              as="button"
              className="w-full py-2 px-3 rounded-xl bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 text-rose-300 text-xs font-mono flex items-center justify-center gap-2 transition"
            >
              <LogOut size={13} />
              <span>Log Out</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Main Full-Width Workspace Area (No desktop sidebar) */}
      <div className="cosmos-workspace" inert={smallScreen && mobileOpen}>
        <header className="cosmos-topbar">
          <div className="cosmos-topbar-inner">
            <div className="topbar-left flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Mobile Hamburger Menu button (shown on <= 1024px) */}
              <button
                ref={menuButton}
                className="mobile-menu icon-button lg:!hidden flex-shrink-0"
                onClick={() => setMobileOpen(true)}
                aria-label="Open mobile navigation"
                aria-expanded={mobileOpen}
                aria-controls="main-navigation"
              >
                <Menu size={20} />
              </button>

              {/* Topbar Brand Logo */}
              <Link href="/" className="flex items-center gap-2 mr-1 sm:mr-3 group flex-shrink-0">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-950 via-slate-900 to-indigo-950 border border-cyan-500/40 flex items-center justify-center text-base sm:text-lg shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition select-none">
                  {site.logo_text}
                </span>
                <div className="flex flex-col leading-none">
                  <span className="font-mono font-bold tracking-wider text-xs sm:text-sm text-slate-100 group-hover:text-white transition">
                    {site.site_name}
                  </span>
                  <span className="font-mono text-[7px] tracking-[1.5px] text-cyan-400 mt-0.5 font-semibold hidden sm:inline">
                    {site.tagline}
                  </span>
                </div>
              </Link>

              {/* Desktop Upper Navigation Links (hidden on mobile <= 1024px) */}
              <nav className="hidden lg:flex items-center gap-1 font-mono text-xs">
                <Link
                  href="/"
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    url === '/'
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <MessageSquare size={13} className={url === '/' ? 'text-cyan-400' : ''} />
                  <span>Public Chat</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                </Link>

                <Link
                  href="/feed"
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    url.startsWith('/feed')
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Activity size={13} />
                  <span>Feed</span>
                </Link>

                <Link
                  href="/chat"
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    url.startsWith('/chat') && url !== '/'
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Radio size={13} />
                  <span>Rooms</span>
                </Link>

                <Link
                  href="/notices"
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    url.startsWith('/notices')
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Bell size={13} />
                  <span>Notices</span>
                </Link>

                <Link
                  href="/rules"
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    url.startsWith('/rules')
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <ShieldCheck size={13} />
                  <span>Rules & Safety</span>
                </Link>
              </nav>
            </div>

            <div className="topbar-actions flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              {/* Stars animation toggle button (desktop) */}
              <button
                onClick={() => setPaused(!paused)}
                className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition"
                title={paused ? 'Resume moving background stars' : 'Pause moving background stars'}
              >
                {paused ? <Play size={11} className="text-cyan-400" /> : <Pause size={11} />}
                <span>{paused ? 'Stars: Paused' : 'Stars: On'}</span>
              </button>

              {/* Quick Search */}
              <Link href="/search" className="icon-button !w-8 !h-8" aria-label="Search the community" title="Search discussions and notices">
                <Search size={16} />
              </Link>

              {/* New Post quick button for logged-in users (desktop) */}
              {auth.user && (
                <Link
                  href="/posts/create"
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-[11px] font-mono font-medium transition"
                >
                  <Plus size={13} />
                  <span>New Post</span>
                </Link>
              )}

              <span className="topbar-separator hidden sm:inline-block" />

              {auth.user ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 group p-1 -m-1 rounded-xl hover:bg-slate-800/40 transition"
                    title="Profile & Avatar Settings"
                  >
                    <span className="user-avatar !w-7 !h-7 sm:!w-8 sm:!h-8 text-xs font-mono font-bold overflow-hidden border border-cyan-500/30 group-hover:border-cyan-400 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.4)] transition flex items-center justify-center">
                      {auth.user.avatar_url ? (
                        <img
                          src={auth.user.avatar_url}
                          alt={auth.user.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        auth.user.display_name.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <div className="hidden md:flex flex-col text-left">
                      <span className="user-name group-hover:text-cyan-300 transition">{auth.user.display_name}</span>
                      <span className="text-[10px] font-mono text-cyan-400">@{auth.user.username}</span>
                    </div>
                  </Link>

                  {auth.user.role === 'SUPER_ADMIN' && (
                    <Link
                      href="/admin/dashboard"
                      className="hidden sm:inline-block px-2 py-0.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500 rounded text-[10px] font-mono font-bold text-cyan-300 transition"
                    >
                      ADMIN
                    </Link>
                  )}

                  <Link
                    href="/profile"
                    className="icon-button !w-8 !h-8 text-slate-400 hover:text-cyan-400 transition"
                    aria-label="Profile"
                    title="Profile & Avatar Settings"
                  >
                    <UserIcon size={15} />
                  </Link>

                  <Link
                    href="/logout"
                    method="post"
                    as="button"
                    className="icon-button !w-8 !h-8 text-slate-400 hover:text-rose-400 transition"
                    aria-label="Log out"
                    title="Log out"
                  >
                    <LogOut size={16} />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Link href="/login" className="login-link text-xs px-1.5 py-1">
                    Log In
                  </Link>
                  <Link href="/register" className="button button-small !py-1 !px-2.5 !text-[10px] sm:!text-[11px] sm:!py-1.5 sm:!px-3">
                    <span>Join Free</span>
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="main-content" className={`cosmos-main ${url.startsWith('/admin/') ? 'admin-page' : ''}`}>
          {site.announcement_enabled && site.announcement_text && <div className="site-announcement" role="status">{site.announcement_text}</div>}
          {flash?.success && (
            <div role="status" className="flash success">
              {flash.success}
            </div>
          )}
          {flash?.error && (
            <div role="alert" className="flash error">
              {flash.error}
            </div>
          )}
          {children}
        </main>

        <footer className="cosmos-footer">
          <div className="cosmos-footer-inner">
            <span className="flex items-center gap-2">
              <span className="text-sm select-none">{site.logo_text}</span>
              <span>{site.footer_text}</span>
            </span>
            <div>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/rules">Community Rules</Link>
              <span>© {new Date().getFullYear()} {site.site_name}</span>
            </div>
          </div>
        </footer>
      </div>

      {!mobileOpen && (
        <Link
          href={auth.user ? '/posts/create' : '/login'}
          className="mobile-compose md:!hidden"
          aria-label="Share a thought"
        >
          <Plus size={22} />
        </Link>
      )}
    </div>
  );
}
