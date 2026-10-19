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
    <div className="chat-tools flex items-center justify-between gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 bg-slate-950/70 border-b border-slate-800/60 flex-nowrap min-w-0">
      {/* Search Input Box */}
      <div className="chat-search flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 max-w-none sm:max-w-[220px] bg-slate-900/80 border border-slate-800 focus-within:border-cyan-500/70 rounded-lg px-2 sm:px-2.5 py-1 transition">
        <Search size={13} className="text-slate-400 flex-shrink-0 pointer-events-none" />
        <input
          aria-label="Search loaded messages"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search..."
          type="search"
          className="w-full min-w-0 bg-transparent border-0 p-0 text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-sans"
        />
      </div>

      {/* Action Controls in the SAME bar */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {onToggleNotifications && (
          <NotificationToggle onToggle={onToggleNotifications} />
        )}

        <label className="chat-follow flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer select-none flex-shrink-0">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(event) => onAutoScroll(event.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer accent-cyan-500"
          />
          <span className="hidden sm:inline">Follow new messages</span>
          <span className="sm:hidden">Follow</span>
        </label>

        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh messages"
          title={connected ? 'Refresh messages' : 'Reconnect'}
          className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition flex-shrink-0"
        >
          <RefreshCw size={13} className={!connected ? 'animate-spin text-amber-400' : ''} />
        </button>
      </div>
    </div>
  );
}
