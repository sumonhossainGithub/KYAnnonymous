import React, { useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import NotificationToggle from '@/components/NotificationToggle';

interface Props {
  roomName?: string;
  roomSymbol?: React.ReactNode;
  roomDescription?: string;
  search: string;
  onSearch: (value: string) => void;
  autoScroll: boolean;
  onAutoScroll: (value: boolean) => void;
  onRefresh: () => void;
  connected: boolean;
  onToggleNotifications?: (enabled: boolean) => void;
}

export default function ChatTools({
  roomName = 'Chatbox',
  roomSymbol,
  roomDescription,
  search,
  onSearch,
  autoScroll,
  onAutoScroll,
  onRefresh,
  connected,
  onToggleNotifications,
}: Props) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  return (
    <header className="conversation-header chat-unified-bar flex items-center justify-between gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 bg-slate-950/85 border-b border-emerald-500/20 flex-nowrap min-w-0 flex-shrink-0 z-10 backdrop-blur-md">
      {isSearchExpanded ? (
        <div className="flex items-center gap-1.5 w-full animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-slate-900/90 border border-cyan-500/70 rounded-lg px-2.5 py-1">
            <Search size={13} className="text-cyan-400 flex-shrink-0 pointer-events-none" />
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
                className="text-slate-400 hover:text-white p-0.5"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSearchExpanded(false)}
            className="text-xs font-mono text-slate-400 hover:text-slate-200 px-2 py-1 rounded cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {/* Left: Room Icon + Name + Live Indicator in ONE line */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 min-w-0">
            {roomSymbol && (
              <span className="room-symbol flex-shrink-0 flex items-center justify-center">
                {roomSymbol}
              </span>
            )}
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="font-bold tracking-wide text-slate-100 text-xs sm:text-sm truncate max-w-[85px] xs:max-w-[120px] sm:max-w-[180px]">
                {roomName}
              </h2>
              <span
                className={`chat-status font-mono text-[9px] sm:text-[10px] flex items-center gap-1 flex-shrink-0 ${
                  connected ? 'text-emerald-400' : 'text-amber-400 offline'
                }`}
                title={connected ? (roomDescription ? `${roomDescription} · Live Feed` : 'Live Feed') : 'Reconnecting...'}
              >
                <i className="status-dot animate-ping" />
                <span className="hidden sm:inline uppercase text-[9px] tracking-wider font-semibold">
                  {connected ? 'LIVE FEED' : 'RECONNECTING'}
                </span>
              </span>
            </div>
          </div>

          {/* Right: Integrated Tools in the SAME row */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 min-w-0">
            {/* Desktop Inline Search Bar */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 focus-within:border-cyan-500/70 rounded-lg px-2 py-0.5 w-28 md:w-40 transition">
              <Search size={12} className="text-slate-400 flex-shrink-0 pointer-events-none" />
              <input
                aria-label="Search loaded messages"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search..."
                type="search"
                className="w-full min-w-0 bg-transparent border-0 p-0 text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-sans"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearch('')}
                  className="text-slate-500 hover:text-white p-0.5"
                  title="Clear"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Mobile Search Toggle Icon */}
            <button
              type="button"
              onClick={() => setIsSearchExpanded(true)}
              aria-label="Search messages"
              className={`sm:hidden p-1 rounded-md text-slate-400 hover:text-cyan-300 transition flex-shrink-0 ${
                search ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-500/40' : ''
              }`}
              title={search ? `Filtering: "${search}"` : 'Search messages'}
            >
              <Search size={13} />
            </button>

            {/* Notification Toggle */}
            {onToggleNotifications && (
              <NotificationToggle onToggle={onToggleNotifications} />
            )}

            {/* Auto-scroll / Follow toggle */}
            <label className="chat-follow flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer select-none flex-shrink-0">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(event) => onAutoScroll(event.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer accent-cyan-500"
              />
              <span className="hidden md:inline">Follow</span>
            </label>

            {/* Refresh button */}
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
        </>
      )}
    </header>
  );
}
