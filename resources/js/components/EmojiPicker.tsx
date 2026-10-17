import { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Smile, Ghost, ThumbsUp } from 'lucide-react';

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  className?: string;
}

const CATEGORIES = [
  {
    id: 'garden',
    label: 'Garden & Night',
    icon: Sparkles,
    emojis: [
      '🌙', '⭐', '✨', '🌟', '🌸', '🌺', '🌹', '🌷',
      '🌿', '🍃', '🍀', '🍄', '🪴', '🎋', '🌾', '🪷',
      '🦋', '🐝', '🦉', '🪲', '🐸', '🌌', '🪐', '🌲',
      '🌳', '🌴', '🪵', '🌊', '☁️', '🌧️', '⚡', '🍂',
    ],
  },
  {
    id: 'smileys',
    label: 'Faces',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
      '🥲', '☺️', '😊', '😇', '🙂', '😉', '😌', '😍',
      '🥰', '😘', '😋', '😛', '😜', '🤪', '😎', '🤩',
      '🥳', '🥺', '😭', '😱', '🤯', '😴', '🤫', '🤔',
      '🫡', '😈', '💀', '🤡', '🤠', '🥱', '🫠', '🥶',
    ],
  },
  {
    id: 'ghost',
    label: 'Mystery',
    icon: Ghost,
    emojis: [
      '👻', '🎭', '🕵️', '🔒', '🗝️', '👁️', '🛸', '🔮',
      '🕯️', '🕸️', '🦇', '🕷️', '🖤', '🪙', '🧪', '🛡️',
      '⚔️', '🪄', '🏰', '🗺️', '📜', '🧭', '🗝️', '🚪',
    ],
  },
  {
    id: 'gestures',
    label: 'Signals',
    icon: ThumbsUp,
    emojis: [
      '👍', '👎', '👏', '🙌', '🫶', '🤝', '✌️', '🤞',
      '🤙', '💖', '❤️', '💔', '🔥', '💯', '⚡', '🎉',
      '🚀', '💎', '💡', '🎯', '⏳', '☕', '🍻', '🥂',
    ],
  },
];

export default function EmojiPicker({ onSelect, onClose, className = '' }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const activeCategory = CATEGORIES[activeTab];

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Emoji Picker"
      className={`absolute bottom-full right-0 mb-2 w-72 sm:w-80 rounded-2xl bg-[#061b18]/95 border border-emerald-500/30 p-2.5 shadow-[0_-10px_35px_rgba(0,0,0,0.65)] backdrop-blur-xl z-50 text-slate-200 select-none ${className}`}
    >
      {/* Header with category tabs & close button */}
      <div className="flex items-center justify-between gap-1 pb-2 mb-2 border-b border-emerald-500/20">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
          {CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            const isActive = activeTab === idx;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                title={cat.label}
                className={`p-1.5 rounded-lg flex items-center gap-1 text-[11px] font-mono transition-colors ${
                  isActive
                    ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                    : 'text-slate-400 hover:text-emerald-200 hover:bg-emerald-950/40'
                }`}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{cat.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-emerald-400/70 hover:text-emerald-100 hover:bg-emerald-900/50 transition-colors ml-1 flex-shrink-0"
          title="Close emoji picker"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-emerald-700/50">
        {activeCategory.emojis.map((emoji, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(emoji)}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-lg hover:bg-emerald-800/40 hover:scale-115 active:scale-95 transition-transform duration-100 cursor-pointer"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div className="pt-2 mt-1 border-t border-emerald-500/15 flex items-center justify-between text-[10px] font-mono text-emerald-400/70 px-1">
        <span>Click to insert</span>
        <span>{activeCategory.label}</span>
      </div>
    </div>
  );
}
