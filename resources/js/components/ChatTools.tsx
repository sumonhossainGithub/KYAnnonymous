import React, { useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import NotificationToggle from '@/components/NotificationToggle';

interface Props {
  search: string;
  onSearch: (value: string) => void;
  onRefresh: () => void;
  connected: boolean;
  onToggleNotifications?: (enabled: boolean) => void;
}

export default function ChatTools({
  search,
  onSearch,
  onRefresh,
  connected,
  onToggleNotifications,
}: Props) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  return (
    <header className="conversation-header chat-unified-bar flex items-center justify-between gap-1.5 px-2 py-1 bg-slate-950/90 border-b border-emerald-500/20 flex-nowrap min-w-0 flex-shrink-0 z-10">
      {isSearchExpanded ? (
        <div className="flex items-center gap-1.5 w-full animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-slate-900/90 border border-cyan-500/70 rounded-md px-2 py-0.5">
            <Search size={12} className="text-cyan-400 flex-shrink-0 pointer-events-none" />
            <input
              autoFocus
              aria-label="Search loaded messages"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search messages..."
              type="search"
              className="w-full min-w-0 bg-transparent border-0 p-0 text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-sans"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearch('')}
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X size={11} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSearchExpanded(false)}
            className="text-[10px] font-mono text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {/* Left: Compact Notify Toggle */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {onToggleNotifications && (
              <NotificationToggle onToggle={onToggleNotifications} />
            )}
          </div>

          {/* Middle: Connected / Reconnecting status in smaller text */}
          <div className="flex items-center justify-center gap-1.5 font-mono select-none flex-1 truncate px-1">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                connected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400 animate-ping'
              }`}
            />
            <span
              className={`truncate font-medium tracking-wide text-[9.5px] sm:text-[10px] ${
                connected ? 'text-emerald-400/90' : 'text-amber-400/90'
              }`}
            >
              {connected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>

          {/* Right: Search & Refresh */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Desktop inline search */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 border border-slate-800 focus-within:border-cyan-500/70 rounded-md px-1.5 py-0.5 w-28 md:w-36 transition">
              <Search size={11} className="text-slate-400 flex-shrink-0 pointer-events-none" />
              <input
                aria-label="Search loaded messages"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search..."
                type="search"
                className="w-full min-w-0 bg-transparent border-0 p-0 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none font-sans"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearch('')}
                  className="text-slate-500 hover:text-white p-0.5 cursor-pointer"
                  title="Clear"
                >
                  <X size={10} />
                </button>
              )}
            </div>

            {/* Mobile search toggle icon */}
            <button
              type="button"
              onClick={() => setIsSearchExpanded(true)}
              aria-label="Search messages"
              className={`sm:hidden p-1 rounded text-slate-400 hover:text-cyan-300 transition flex-shrink-0 cursor-pointer ${
                search ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-500/40' : ''
              }`}
              title={search ? `Filtering: "${search}"` : 'Search messages'}
            >
              <Search size={12} />
            </button>

            {/* Refresh button */}
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh messages"
              title={connected ? 'Refresh messages' : 'Reconnect'}
              className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition flex-shrink-0 cursor-pointer"
            >
              <RefreshCw size={12} className={!connected ? 'animate-spin text-amber-400' : ''} />
            </button>
          </div>
        </>
      )}
    </header>
  );
}
