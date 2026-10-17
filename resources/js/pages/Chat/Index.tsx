import { useState, type FormEvent } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import UniverseMap from '@/components/UniverseMap';
import type { ChatRoomSummary, SharedProps } from '@/types';
import {
  ArrowUpRight,
  Plus,
  Search,
  Radio,
  X,
  Grid2X2,
  MessageSquare,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

export default function ChatIndex({ rooms }: { rooms: ChatRoomSummary[] }) {
  const { auth, site } = usePage<SharedProps>().props;
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<'rooms' | 'universe'>('rooms');
  const form = useForm({ name: '', description: '' });

  const filtered = rooms.filter((room) =>
    `${room.name} ${room.description || ''}`.toLowerCase().includes(query.toLowerCase())
  );

  const create = (e: FormEvent) => {
    e.preventDefault();
    form.post('/chat', { preserveScroll: true, onSuccess: () => setCreating(false) });
  };

  return (
    <AppLayout>
      <div className="page-intro">
        <div>
          <span className="eyebrow font-mono text-cyan-400">
            <span className="status-dot animate-ping" />
            <span>LIVE CHAT ROOMS · 100% PRIVATE</span>
          </span>
          <h1 className="text-slate-100">
            Live Anonymous <em>Chat.</em>
          </h1>
          <p className="font-mono text-xs text-slate-400">
            Join topic rooms, chat in real time, and protect your privacy without logs.
          </p>
        </div>
        <div className="intro-orbit" aria-hidden="true">
          <Radio size={80} className="text-cyan-500/20" strokeWidth={0.8} />
        </div>
      </div>

      <div className="chat-welcome font-mono text-xs">
        <div>
          <span className="status-dot animate-ping" />
          <p className="text-slate-300">
            All chat rooms are open.
            <span className="text-slate-500"> Send messages freely without being tracked.</span>
          </p>
        </div>
        {auth.user ? (
          <button
            className="button"
            onClick={() => setCreating(!creating)}
            aria-expanded={creating}
            aria-controls="create-room-form"
            disabled={!site.member_rooms_enabled && auth.user?.role !== 'SUPER_ADMIN'}
          >
            <Plus size={15} />
            <span>Create New Room</span>
          </button>
        ) : (
          <Link className="button" href="/login">
            <Plus size={15} />
            <span>Sign In to Create Room</span>
          </Link>
        )}
      </div>

      {creating && auth.user && (
        <section className="create-room-panel" id="create-room-form">
          <div className="section-heading">
            <div>
              <span className="eyebrow font-mono text-cyan-400">NEW CHAT ROOM</span>
              <h2 className="text-slate-100 font-bold">Create a Topic Room</h2>
            </div>
            <button className="icon-button" onClick={() => setCreating(false)} aria-label="Close form">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={create} className="space-y-4">
            <div className="field">
              <label htmlFor="room-name" className="font-mono text-xs text-slate-300">
                Room Name
              </label>
              <input
                id="room-name"
                autoFocus
                required
                minLength={3}
                maxLength={60}
                placeholder="e.g. General Discussion, Gaming, Privacy Advice"
                value={form.data.name}
                onChange={(e) => form.setData('name', e.target.value)}
                className="font-sans"
              />
              {form.errors.name && (
                <p id="room-name-error" className="field-error font-mono text-xs" role="alert">
                  {form.errors.name}
                </p>
              )}
            </div>
            <div className="field">
              <label htmlFor="room-description" className="font-mono text-xs text-slate-300">
                Room Description <span>(Optional)</span>
              </label>
              <textarea
                id="room-description"
                rows={2}
                maxLength={240}
                placeholder="What is this room about?…"
                value={form.data.description}
                onChange={(e) => form.setData('description', e.target.value)}
                className="font-sans"
              />
              {form.errors.description && (
                <p className="field-error font-mono text-xs">{form.errors.description}</p>
              )}
            </div>
            <div className="form-bottom font-mono text-xs">
              <p className="text-slate-500">Public room · Everyone can join and chat.</p>
              <button className="button" disabled={form.processing}>
                <span>{form.processing ? 'Creating Room…' : 'Create Room'}</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Directory Search & View Switcher */}
      <div className="directory-toolbar font-mono">
        <label className="search-field">
          <Search size={16} className="text-slate-500" />
          <input
            aria-label="Search chat rooms"
            placeholder="Search rooms..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="font-mono text-xs"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </label>
        <div className="view-switch" aria-label="Room view">
          <button aria-pressed={view === 'rooms'} onClick={() => setView('rooms')} className="font-mono text-xs">
            <Grid2X2 size={14} />
            <span>Rooms</span>
          </button>
          <button
            aria-pressed={view === 'universe'}
            onClick={() => setView('universe')}
            className="font-mono text-xs"
          >
            <Radio size={14} />
            <span>Room Map</span>
          </button>
        </div>
      </div>

      <div className="directory-count font-mono text-xs">
        <span>{filtered.length} active rooms</span>
        <span>100% Private · Zero logs</span>
      </div>

      {view === 'universe' && filtered.length > 0 && (
        <div className="directory-universe">
          <UniverseMap rooms={filtered} />
          <p className="font-mono text-[11px] text-slate-500 mt-2">
            Click any circle to jump directly into the room.
          </p>
        </div>
      )}

      <div className="room-directory">
        {filtered.map((room, i) => (
          <Link href={`/chat/${room.slug}`} key={room.public_id} className={`room-preview room-tone-${i % 3}`}>
            <div className="room-preview-top font-mono">
              <span className="room-symbol">
                <Radio size={20} className="text-cyan-400" />
              </span>
              <span className="room-label">ROOM 0{i + 1}</span>
              <ArrowUpRight size={16} />
            </div>
            <h2>{room.name}</h2>
            <p>{room.description || 'Public discussion room.'}</p>
            <div className="room-preview-bottom font-mono">
              <span>
                <MessageSquare size={13} className="text-cyan-400" />
                {room.messages_count || 0} messages
              </span>
              <span>
                Join Chat <ArrowUpRight size={13} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="journal-empty font-mono">
          <Terminal size={32} className="text-cyan-400 mb-2" />
          <h2 className="text-sm uppercase tracking-wider text-slate-200">
            {query ? 'No matching rooms found' : 'No rooms created yet'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {query ? 'Try searching something else or clear the search.' : 'Be the first to create a room.'}
          </p>
          {query && (
            <button className="text-link mt-3" onClick={() => setQuery('')}>
              Show all rooms
            </button>
          )}
        </div>
      )}

      {!auth.user && (
        <div className="guest-invitation font-mono text-xs">
          <ShieldCheck size={18} className="text-emerald-400" />
          <p>No email or phone required. Complete privacy.</p>
          <Link href="/register" className="text-link text-cyan-400">
            <span>Create Free Account</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
    </AppLayout>
  );
}
