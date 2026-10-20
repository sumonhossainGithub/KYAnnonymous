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
    <header className="conversation-header chat-unified-bar flex items-center justify-between gap-1 px-2 py-0 bg-slate-950/95 border-b border-emerald-500/20 flex-nowrap min-w-0 flex-shrink-0 z-10 h-[22px] min-h-[22px] max-h-[22px]">
      {isSearchExpanded ? (
        <div className="flex items-center gap-1 w-full animate-in fade-in duration-150 h-[20px]">
          <div className="flex items-center gap-1 flex-1 min-w-0 bg-slate-900/90 border border-cyan-500/70 rounded px-1.5 py-0 h-[17px]">
            <Search size={10} className="text-cyan-400 flex-shrink-0 pointer-events-none" />
            <input
              autoFocus
              aria-label="Search loaded messages"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search..."
              type="search"
              className="w-full min-w-0 bg-transparent border-0 p-0 text-[10px] text-slate-200 placeholder-slate-500 focus:outline-none font-sans leading-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearch('')}
                className="text-slate-400 hover:text-white p-0 cursor-pointer"
                style={{ minHeight: 'unset', minWidth: 'unset' }}
                title="Clear search"
              >
                <X size={9} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSearchExpanded(false)}
            className="text-[9px] font-mono text-slate-400 hover:text-slate-200 px-1 py-0 rounded cursor-pointer leading-none"
            style={{ minHeight: 'unset', minWidth: 'unset' }}
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
          <div className="flex items-center justify-center gap-1 font-mono select-none flex-1 truncate px-1">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                connected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400 animate-ping'
              }`}
            />
            <span
              className={`truncate font-medium tracking-wide text-[8.5px] sm:text-[9px] leading-none ${
                connected ? 'text-emerald-400/90' : 'text-amber-400/90'
              }`}
            >
              {connected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>

          {/* Right: Search & Refresh */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Desktop inline search */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 border border-slate-800/80 focus-within:border-cyan-500/70 rounded px-1.5 py-0 h-[17px] w-24 md:w-32 transition">
              <Search size={10} className="text-slate-400 flex-shrink-0 pointer-events-none" />
              <input
                aria-label="Search loaded messages"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search..."
                type="search"
                className="w-full min-w-0 bg-transparent border-0 p-0 text-[10px] text-slate-200 placeholder-slate-500 focus:outline-none font-sans leading-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearch('')}
                  className="text-slate-500 hover:text-white p-0 cursor-pointer"
                  style={{ minHeight: 'unset', minWidth: 'unset' }}
                  title="Clear"
                >
                  <X size={9} />
                </button>
              )}
            </div>

            {/* Mobile search toggle icon */}
            <button
              type="button"
              onClick={() => setIsSearchExpanded(true)}
              aria-label="Search messages"
              className={`sm:hidden p-0.5 rounded text-slate-400 hover:text-cyan-300 transition flex-shrink-0 cursor-pointer ${
                search ? 'text-cyan-300' : ''
              }`}
              style={{ minHeight: 'unset', minWidth: 'unset', height: '18px', width: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              title={search ? `Filtering: "${search}"` : 'Search messages'}
            >
              <Search size={11} />
            </button>

            {/* Refresh button */}
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh messages"
              title={connected ? 'Refresh messages' : 'Reconnect'}
              className="p-0.5 rounded text-slate-400 hover:text-cyan-300 transition flex-shrink-0 cursor-pointer"
              style={{ minHeight: 'unset', minWidth: 'unset', height: '18px', width: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <RefreshCw size={11} className={!connected ? 'animate-spin text-amber-400' : ''} />
            </button>
          </div>
        </>
      )}
    </header>
  );
}
