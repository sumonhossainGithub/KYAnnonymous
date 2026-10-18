import { RefreshCw, Search } from 'lucide-react';
import NotificationToggle from '@/components/NotificationToggle';

interface Props {
  search: string;
  onSearch: (value: string) => void;
  autoScroll: boolean;
  onAutoScroll: (value: boolean) => void;
  onRefresh: () => void;
  connected: boolean;
  onToggleNotifications?: (enabled: boolean) => void;
}

export default function ChatTools({ search, onSearch, autoScroll, onAutoScroll, onRefresh, connected, onToggleNotifications }: Props) {
  return (
    <div className="chat-tools flex items-center justify-between gap-3 px-3.5 py-1.5 bg-slate-950/60 border-b border-slate-800/60 flex-wrap">
      <div className="chat-search flex items-center gap-2 max-w-[220px] flex-1 min-w-0 bg-slate-900/80 border border-slate-800 focus-within:border-cyan-500/70 rounded-lg px-2.5 py-1 transition">
        <Search size={14} className="text-slate-400 flex-shrink-0 pointer-events-none" />
        <input
          aria-label="Search loaded messages"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search messages..."
          type="search"
          className="w-full bg-transparent border-0 p-0 text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-sans"
        />
      </div>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        {onToggleNotifications && (
          <NotificationToggle onToggle={onToggleNotifications} />
        )}

        <label className="chat-follow hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(event) => onAutoScroll(event.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer accent-cyan-500"
          />
          <span>Follow new messages</span>
        </label>

        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh messages"
          title={connected ? 'Refresh messages' : 'Reconnect'}
          className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition"
        >
          <RefreshCw size={13} className={!connected ? 'animate-spin text-amber-400' : ''} />
        </button>
      </div>
    </div>
  );
}
