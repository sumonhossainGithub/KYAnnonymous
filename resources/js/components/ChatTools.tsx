import { RefreshCw, Search } from 'lucide-react';

interface Props {
  search: string;
  onSearch: (value: string) => void;
  autoScroll: boolean;
  onAutoScroll: (value: boolean) => void;
  onRefresh: () => void;
  connected: boolean;
}

export default function ChatTools({ search, onSearch, autoScroll, onAutoScroll, onRefresh, connected }: Props) {
  return (
    <div className="chat-tools flex items-center justify-between gap-3 px-3.5 py-1.5 bg-slate-950/60 border-b border-slate-800/60">
      <div className="chat-search relative flex-1 max-w-[220px] min-w-0">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          aria-label="Search loaded messages"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search messages..."
          type="search"
          className="w-full bg-slate-900/80 border border-slate-800 focus:border-cyan-500/70 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition font-sans"
        />
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <label className="chat-follow flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer select-none">
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
