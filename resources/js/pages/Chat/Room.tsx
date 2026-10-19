import { useEffect, useRef, useState, useMemo, type FormEvent } from 'react';
import { useForm, Link, usePage } from '@inertiajs/react';
import { useLiveChat } from '@/hooks/useLiveChat';
import ChatTools from '@/components/ChatTools';
import AppLayout from '@/layouts/AppLayout';
import type { ChatRoomSummary, ChatMessageItem, PollItem, SharedProps } from '@/types';
import {
  ArrowLeft,
  ArrowUpRight,
  Send,
  Radio,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  Ghost,
  Lock,
  Plus,
  CornerDownRight,
  X,
  Smile,
  Trash2,
  FileText,
  Download,
  BarChart3,
  Paperclip,
} from 'lucide-react';
import EmojiPicker from '@/components/EmojiPicker';
import GardenButterflyOverlay, { type GardenButterflyRef } from '@/components/GardenButterflyOverlay';
import ChatFlowerOverlay, { type ChatFlowerRef } from '@/components/ChatFlowerOverlay';
import { PollCard, PollCreateModal, ActivePollBanner } from '@/components/PollSection';

interface Props {
  room: ChatRoomSummary;
  initialMessages: ChatMessageItem[];
  rooms: ChatRoomSummary[];
  emergencyLockdown?: boolean;
  isLocked?: boolean;
}

export default function ChatRoom({ room, initialMessages, rooms, emergencyLockdown, isLocked }: Props) {
  const { auth, site } = usePage<SharedProps>().props;
  const form = useForm({ message: '', is_ghost: false });
  const subChatForm = useForm({ message: '', is_ghost: false, parent_public_id: '' });
  const unlockForm = useForm({ password: '' });
  
  const stream = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const lastMessage = useRef<string | undefined>(undefined);
  const [unread, setUnread] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const live = useLiveChat(room.slug, initialMessages, site, !isLocked && site.chat_enabled && (!emergencyLockdown || auth.user?.role === 'SUPER_ADMIN') && (!!auth.user || site.guest_chat_enabled));
  const { messages, connected } = live;
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubChatId, setActiveSubChatId] = useState<string | null>(null);
  const [touchedMessageId, setTouchedMessageId] = useState<string | null>(null);
  const [mySentIds, setMySentIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('ky_my_sent_messages');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isPollCreateOpen, setIsPollCreateOpen] = useState(false);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreviewUrl, setAttachedPreviewUrl] = useState<string | null>(null);

  const adjustInputHeight = () => {
    const el = messageInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 34), 110)}px`;
  };

  useEffect(() => {
    if (!showPlusMenu) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPlusMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPlusMenu]);

  const clearAttachment = () => {
    setAttachedFile(null);
    if (attachedPreviewUrl) {
      URL.revokeObjectURL(attachedPreviewUrl);
      setAttachedPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB limit
    if (file.size > MAX_SIZE) {
      alert('File size exceeds the 10 MB limit. Please select a smaller file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setAttachedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setAttachedPreviewUrl(url);
    } else {
      setAttachedPreviewUrl(null);
    }
  };

  const insertEmoji = (emoji: string) => {
    const input = messageInputRef.current;
    if (!input) {
      form.setData('message', form.data.message + emoji);
      return;
    }
    const start = input.selectionStart ?? form.data.message.length;
    const end = input.selectionEnd ?? form.data.message.length;
    const text = form.data.message;
    const next = text.slice(0, start) + emoji + text.slice(end);
    form.setData('message', next);
    setTimeout(() => {
      input.focus();
      const pos = start + emoji.length;
      input.setSelectionRange(pos, pos);
      adjustInputHeight();
    }, 0);
  };

  const butterflyRef = useRef<GardenButterflyRef>(null);
  const flowerRef = useRef<ChatFlowerRef>(null);

  // Listen for butterfly reactions from any active user in the room!
  useEffect(() => {
    return live.onButterflyBroadcast((msgPublicId) => {
      const el = document.querySelector(`[data-message-id="${msgPublicId}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        butterflyRef.current?.flyTo(rect);
        flowerRef.current?.bloomAt(rect.left + rect.width / 2, rect.top);
      } else {
        const fallbackRect = new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 60, 30);
        butterflyRef.current?.flyTo(fallbackRect);
        flowerRef.current?.bloomAt(window.innerWidth / 2, window.innerHeight / 2);
      }
    });
  }, [live.onButterflyBroadcast]);

  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });

  const handleButterflyReact = async (msg: ChatMessageItem, targetEl: HTMLElement) => {
    const rect = targetEl.getBoundingClientRect();
    butterflyRef.current?.flyTo(rect);
    flowerRef.current?.bloomAt(rect.left + rect.width / 2, rect.top);
    await live.reactButterfly(msg.public_id);
  };

  const handleMessageTapOrClick = (msg: ChatMessageItem, targetEl: HTMLElement) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current.time;

    if (lastTapRef.current.id === msg.public_id && timeSinceLastTap < 380) {
      // Double tap / double click detected -> butterfly reaction!
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      lastTapRef.current = { id: '', time: 0 };
      void handleButterflyReact(msg, targetEl);
    } else {
      // Single tap / click -> immediately toggle timestamp!
      lastTapRef.current = { id: msg.public_id, time: now };
      setTouchedMessageId(prev => prev === msg.public_id ? null : msg.public_id);
    }
  };

  const unlockSubmit = (e: FormEvent) => {
    e.preventDefault();
    unlockForm.post(`/chat/${room.slug}/unlock`, {
      preserveScroll: true,
    });
  };

  if (isLocked) {
    return (
      <AppLayout>
        <div className="chat-page-heading font-mono text-xs">
          <Link href="/chat" className="text-link text-cyan-400 hover:text-cyan-300">
            <ArrowLeft size={14} />
            <span>BACK TO CHAT ROOMS</span>
          </Link>
          <span className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>PASSWORD PROTECTED ROOM</span>
          </span>
        </div>

        <div className="max-w-md mx-auto my-12 p-8 rounded-xl bg-slate-800/90 border border-slate-700/80 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lock size={30} />
            </div>
            <div>
              <span className="text-[11px] font-mono tracking-wider text-amber-400 uppercase">Room Locked</span>
              <h1 className="text-2xl font-bold text-slate-100 mt-1">{room.name}</h1>
              {room.description && <p className="text-sm text-slate-400 mt-1">{room.description}</p>}
            </div>
            <p className="text-xs text-slate-300 font-mono">
              This room requires a password. Enter the password below to access the live conversation.
            </p>

            <form onSubmit={unlockSubmit} className="w-full space-y-4 text-left mt-3">
              <div className="field">
                <label htmlFor="unlock-password" className="font-mono text-xs text-slate-300">
                  Room Password
                </label>
                <input
                  id="unlock-password"
                  type="password"
                  autoFocus
                  required
                  placeholder="Enter room password..."
                  value={unlockForm.data.password}
                  onChange={(e) => unlockForm.setData('password', e.target.value)}
                  className="font-sans w-full"
                />
                {unlockForm.errors.password && (
                  <p className="field-error font-mono text-xs mt-1" role="alert">
                    {unlockForm.errors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={unlockForm.processing}
                className="button w-full justify-center py-2.5 text-sm"
              >
                <span>{unlockForm.processing ? 'Verifying…' : 'Unlock & Join Room'}</span>
                <ArrowUpRight size={16} />
              </button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-[11px] font-mono text-slate-500">
                Inactive rooms are automatically removed after 7 days of inactivity.
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }


  type StreamItem =
    | { type: 'message'; key: string; timestamp: number; message: ChatMessageItem }
    | { type: 'poll'; key: string; timestamp: number; poll: PollItem };

  const streamItems = useMemo<StreamItem[]>(() => {
    const items: StreamItem[] = [];

    const filteredMessages = messages.filter((message) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return [
        message.message,
        message.sender.display_name,
        ...(message.sub_chats || []).map((reply) => reply.message),
      ].some((text) => text.toLowerCase().includes(term));
    });

    filteredMessages.forEach((msg) => {
      items.push({
        type: 'message',
        key: `msg-${msg.public_id}`,
        timestamp: msg.raw_created_at ?? 0,
        message: msg,
      });
    });

    const filteredPolls = live.polls.filter((poll) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        poll.question.toLowerCase().includes(term) ||
        poll.creator.display_name.toLowerCase().includes(term) ||
        poll.options.some((o) => o.toLowerCase().includes(term))
      );
    });

    filteredPolls.forEach((poll) => {
      // Sort timestamp is raw_updated_at (so any vote bumps it to the latest position!)
      const ts = poll.raw_updated_at || poll.raw_created_at || (Date.now() / 1000);
      items.push({
        type: 'poll',
        key: `poll-${poll.public_id}-${poll.total_votes}`,
        timestamp: ts,
        poll: poll,
      });
    });

    // Chronological sort: oldest first, newest or recently bumped poll at the bottom
    items.sort((a, b) => a.timestamp - b.timestamp);

    return items;
  }, [messages, live.polls, searchTerm]);

  const latest = streamItems.at(-1)?.key;

  useEffect(() => {
    if (latest === lastMessage.current) return;
    lastMessage.current = latest;
    if (nearBottom.current && stream.current) {
      stream.current.scrollTop = stream.current.scrollHeight;
    } else if (latest) {
      setUnread(true);
      setUnreadCount((c) => c + 1);
    }
  }, [latest]);

  const scrollToBottom = (smooth = true) => {
    if (stream.current) {
      if (smooth) {
        stream.current.scrollTo({ top: stream.current.scrollHeight, behavior: 'smooth' });
      } else {
        stream.current.scrollTop = stream.current.scrollHeight;
      }
    }
    nearBottom.current = true;
    setIsScrolledUp(false);
    setUnread(false);
    setUnreadCount(0);
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if ((!form.data.message.trim() && !attachedFile) || !live.policy.can_send || live.sending) return;
    nearBottom.current = true;
    setIsScrolledUp(false);
    setUnread(false);
    setUnreadCount(0);

    let payload: object | FormData;
    if (attachedFile) {
      const formData = new FormData();
      if (form.data.message.trim()) {
        formData.append('message', form.data.message.trim());
      }
      formData.append('file', attachedFile);
      if (live.policy.anonymous_enabled && form.data.is_ghost) {
        formData.append('is_ghost', '1');
      }
      payload = formData;
    } else {
      payload = { ...form.data, is_ghost: live.policy.anonymous_enabled && form.data.is_ghost };
    }

    if (await live.send(payload)) {
      form.reset('message');
      clearAttachment();
      setUnread(false);
      if (messageInputRef.current) {
        messageInputRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(e as unknown as FormEvent);
    }
  };

  const sendSubChat = (parentPublicId: string) => async (event: FormEvent) => {
    event.preventDefault();
    if (!subChatForm.data.message.trim() || !live.policy.can_send || live.sending) return;
    if (await live.send({ ...subChatForm.data, is_ghost: live.policy.anonymous_enabled && subChatForm.data.is_ghost, parent_public_id: parentPublicId })) subChatForm.reset('message');
  };

  const removeMessage = (publicId: string) => {
    void live.remove(publicId);
  };

  return (
    <AppLayout hideFooter>
      <GardenButterflyOverlay ref={butterflyRef} />
      <div className="chat-page-heading font-mono text-xs">
        <Link href="/chat" className="text-link text-cyan-400 hover:text-cyan-300">
          <ArrowLeft size={14} />
          <span>BACK TO CHAT ROOMS</span>
        </Link>
        <span className="flex items-center gap-1.5 text-slate-400">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>PRIVATE ROOM · ZERO TRACKING</span>
        </span>
      </div>

      <div className="chat-layout">
        <section className="conversation-panel" aria-label={`${room.name} conversation`}>
          <ChatFlowerOverlay ref={flowerRef} />
          <ChatTools
            search={searchTerm}
            onSearch={setSearchTerm}
            onRefresh={() => void live.refresh()}
            connected={connected}
            onToggleNotifications={live.setNotifications}
          />

          {/* Active Poll Slim Top Banner */}
          <ActivePollBanner
            polls={live.polls}
            onJumpToPoll={(id) => {
              const el = document.getElementById(`poll-${id}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          />

          {/* Telegram Poll Creation Modal */}
          <PollCreateModal
            isOpen={isPollCreateOpen}
            onClose={() => setIsPollCreateOpen(false)}
            onCreatePoll={live.createPoll}
            sending={live.sending}
          />

          <div
            className="conversation-stream"
            ref={stream}
            onScroll={() => {
              const el = stream.current;
              if (el) {
                const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                const isNear = distanceToBottom < 75;
                nearBottom.current = isNear;
                setIsScrolledUp(!isNear);
                if (isNear) {
                  setUnread(false);
                  setUnreadCount(0);
                }
              }
            }}
            role="log"
            aria-label="Chat messages"
            aria-live="polite"
            aria-relevant="additions"
          >
            {streamItems.length === 0 && (
              <div className="conversation-start">
                <div className="empty-orbit">
                  <Radio size={24} className="text-cyan-400" />
                </div>
                <h2 className="font-mono text-sm tracking-wider uppercase text-slate-200">
                  Welcome to: {room.name}
                </h2>
                <p className="font-sans text-xs text-slate-400">
                  Chat freely and anonymously with others in this room.
                </p>
              </div>
            )}

            {streamItems.map((item, index, arr) => {
              if (item.type === 'poll') {
                return (
                  <PollCard
                    key={item.key}
                    poll={item.poll}
                    onVote={live.votePoll}
                    onRetract={live.retractPollVote}
                    onDelete={live.deletePoll}
                    sending={live.sending}
                  />
                );
              }

              const message = item.message;
              const own = Boolean(message.is_own || mySentIds.has(message.public_id) || (auth.user && message.sender.public_id === auth.user?.public_id));
              const isGhost = message.is_ghost || message.sender.is_ghost || message.is_guest;
              const isSubChatOpen = activeSubChatId === message.public_id;
              const subCount = message.sub_chats?.length || message.sub_chats_count || 0;
              const isLastMessage = index === arr.length - 1;

              return (
                <article
                  className={`chat-message group/msg ${own ? 'own' : ''}`}
                  key={message.public_id}
                >
                  <span className="message-avatar font-mono overflow-hidden">
                    {isGhost ? (
                      <Ghost size={13} className="text-cyan-400" />
                    ) : message.sender.avatar_url ? (
                      <img src={message.sender.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      message.sender.display_name.slice(0, 1).toUpperCase()
                    )}
                  </span>

                  <div className="chat-message-content">
                    <div className="message-meta font-mono text-[11px]">
                      <strong className={isGhost ? 'text-cyan-300' : 'text-slate-200'}>
                        {own ? 'You' : message.sender.display_name}
                      </strong>
                      {!isGhost && !message.is_guest && (
                        <span className="text-slate-500">@{message.sender.username}</span>
                      )}
                    </div>

                    {/* Bubble and Action buttons placed side-by-side */}
                    <div className={`flex items-start gap-1.5 ${own ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
                        <div
                          data-message-id={message.public_id}
                          className={`message-bubble relative font-sans cursor-pointer transition select-none ${touchedMessageId === message.public_id ? 'show-time' : ''}`}
                          onClick={(e) => handleMessageTapOrClick(message, e.currentTarget)}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
                            void handleButterflyReact(message, e.currentTarget);
                          }}
                          title="Double-tap to magic butterfly · Click to view timestamp"
                        >

                          {/* Message Attachment (Image or File) */}
                          {message.file_url && (
                            (() => {
                              const isImg = message.file_type === 'image' || (message.file_url && /\.(jpe?g|png|gif|webp|svg|avif|bmp)$/i.test(message.file_url));
                              if (isImg) {
                                return (
                                  <div className="mb-2 overflow-hidden rounded-xl border border-emerald-500/25 bg-black/40 max-w-[280px] sm:max-w-xs shadow-md">
                                    <a
                                      href={message.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="block overflow-hidden group/img"
                                      title="Click to view full image"
                                    >
                                      <img
                                        src={message.file_url}
                                        alt={message.file_name || 'Attached image'}
                                        className="max-h-60 w-auto max-w-full object-contain rounded-xl group-hover/img:scale-[1.02] transition-transform duration-200"
                                        loading="lazy"
                                      />
                                    </a>
                                  </div>
                                );
                              }
                              return (
                                <a
                                  href={message.file_url}
                                  download={message.file_name || 'download'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="mb-2 flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-emerald-500/30 text-emerald-300 hover:text-white transition group/file shadow-md"
                                  title="Click to download file"
                                >
                                  <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400 group-hover/file:text-emerald-200">
                                    <FileText size={18} />
                                  </div>
                                  <div className="min-w-0 flex-1 text-left">
                                    <p className="text-xs font-semibold truncate text-slate-200 group-hover/file:text-white max-w-[170px] sm:max-w-[220px]">
                                      {message.file_name || 'Attached File'}
                                    </p>
                                    {message.file_size && (
                                      <span className="text-[10px] font-mono text-emerald-400/80">
                                        {message.file_size >= 1048576
                                          ? `${(message.file_size / 1048576).toFixed(2)} MB`
                                          : `${Math.round(message.file_size / 1024)} KB`}
                                      </span>
                                    )}
                                  </div>
                                  <Download size={16} className="text-slate-400 group-hover/file:text-emerald-300 flex-shrink-0" />
                                </a>
                              );
                            })()
                          )}

                          {message.message ? <p className="whitespace-pre-wrap break-words">{message.message}</p> : null}
                          <time className="font-mono text-[10px]">{message.created_at}</time>
                        </div>

                        {/* Hint just under the last message */}
                        {isLastMessage && (
                          <span className={`text-[10px] font-mono text-cyan-400/80 select-none mt-0.5 px-0.5 ${own ? 'text-right' : 'text-left'}`}>
                            double tap to magic
                          </span>
                        )}
                      </div>

                      {/* Action buttons on the side of the message - aligned with 1st line */}
                      <div className={`flex items-center gap-1.5 self-start pt-1 flex-shrink-0 ${own ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Butterfly React on right side of message - aligned with 1st line */}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleButterflyReact(message, e.currentTarget);
                          }}
                          className={`butterfly-react-corner select-none cursor-pointer inline-flex items-center gap-0.5 transition-all transform active:scale-125 ${
                            (message.butterfly_count ?? 0) > 0
                              ? 'opacity-100 scale-100 filter drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]'
                              : `opacity-0 group-hover/msg:opacity-90 hover:!opacity-100 scale-95 hover:scale-110 ${
                                  message.public_id === touchedMessageId ? '!opacity-90' : ''
                                }`
                          }`}
                          style={{ minHeight: 'unset', minWidth: 'unset', background: 'transparent', border: 'none' }}
                          title="Butterfly React (click to react)"
                        >
                          <span className="text-[13px] leading-none animate-butterflyBreathe">🦋</span>
                          {(message.butterfly_count ?? 0) > 0 && (
                            <span className="text-[9px] font-mono font-bold text-emerald-300 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                              {message.butterfly_count}
                            </span>
                          )}
                        </span>

                        {/* Ultra-compact Reply button on the side of the message */}
                        <button
                          type="button"
                          onClick={() => setActiveSubChatId(isSubChatOpen ? null : message.public_id)}
                          className={`chat-reply-btn inline-flex items-center gap-0.5 px-1 py-0 rounded transition text-[8px] font-mono flex-shrink-0 cursor-pointer ${
                            isSubChatOpen
                              ? 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-300'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                          }`}
                          style={{ minHeight: 'unset', minWidth: 'unset', height: '16px', lineHeight: '16px' }}
                          title="Reply in Sub-chat"
                        >
                          <MessageSquare size={8} className={subCount > 0 ? 'text-cyan-400' : ''} />
                          <span>{subCount > 0 ? `${subCount}` : 'Reply'}</span>
                        </button>

                        {/* Admin Delete Button */}
                        {auth.user?.role === 'SUPER_ADMIN' && (
                          <button
                            type="button"
                            onClick={() => removeMessage(message.public_id)}
                            disabled={live.sending}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono transition flex-shrink-0 bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white"
                            title="Delete message immediately"
                          >
                            <Trash2 size={11} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sub-chat Drawer / Nested Thread */}
                    {isSubChatOpen && (
                      <div className="mt-1.5 p-2 rounded-xl bg-slate-950/90 border border-emerald-500/20 shadow-lg backdrop-blur-md max-w-sm">
                        <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-emerald-500/15 text-[10px] font-mono text-emerald-300">
                          <span className="flex items-center gap-1.5">
                            <CornerDownRight size={11} className="text-emerald-400" />
                            <span className="font-semibold tracking-wide">Thread ({subCount})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveSubChatId(null)}
                            className="text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer transition"
                            style={{ minHeight: 'unset', minWidth: 'unset' }}
                            title="Close thread"
                          >
                            <X size={11} />
                          </button>
                        </div>

                        {message.sub_chats && message.sub_chats.length > 0 ? (
                          <div className="space-y-1.5 mb-2 max-h-48 overflow-y-auto pr-1">
                            {message.sub_chats.map((sub) => {
                              const isSubGhost = sub.is_ghost || sub.sender.is_ghost || sub.is_guest;
                              const isSubOwn = Boolean(sub.is_own || mySentIds.has(sub.public_id) || (auth.user && sub.sender.public_id === auth.user?.public_id));
                              return (
                                <div
                                  key={sub.public_id}
                                  className={`p-1.5 rounded-lg text-[10.5px] group transition ${
                                    isSubOwn ? 'bg-cyan-950/40 border border-cyan-800/40' : 'bg-slate-900/60 border border-slate-800/60'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[9px] font-mono mb-0.5">
                                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                                      <span className="w-3.5 h-3.5 rounded-full overflow-hidden flex items-center justify-center bg-slate-800 flex-shrink-0">
                                        {isSubGhost ? (
                                          <Ghost size={9} className="text-cyan-400" />
                                        ) : sub.sender.avatar_url ? (
                                          <img src={sub.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <span className="text-[8px] text-cyan-300 font-bold">{sub.sender.display_name.slice(0, 1).toUpperCase()}</span>
                                        )}
                                      </span>
                                      <span className={isSubGhost ? 'text-cyan-300' : ''}>{isSubOwn ? 'You' : sub.sender.display_name}</span>
                                    </span>
                                    <span className="text-slate-500 opacity-60 group-hover:opacity-100 transition text-[8.5px]">{sub.created_at}</span>
                                  </div>
                                  {sub.file_url && (
                                    (() => {
                                      const isSubImg = sub.file_type === 'image' || (sub.file_url && /\.(jpe?g|png|gif|webp|svg|avif|bmp)$/i.test(sub.file_url));
                                      if (isSubImg) {
                                        return (
                                          <div className="my-1 ml-4 overflow-hidden rounded-md border border-emerald-500/25 max-w-[200px]">
                                            <a href={sub.file_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                              <img src={sub.file_url} alt={sub.file_name || 'Attached image'} className="max-h-36 w-auto rounded-md object-contain" loading="lazy" />
                                            </a>
                                          </div>
                                        );
                                      }
                                      return (
                                        <a
                                          href={sub.file_url}
                                          download={sub.file_name || 'download'}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="my-1 ml-4 inline-flex items-center gap-1.5 p-1 rounded-md bg-slate-950/80 border border-slate-700 text-[10px] text-emerald-300 hover:text-white"
                                        >
                                          <FileText size={12} className="text-emerald-400 flex-shrink-0" />
                                          <span className="truncate max-w-[120px] text-[10px]">{sub.file_name || 'File'}</span>
                                          <Download size={11} className="text-slate-400 flex-shrink-0" />
                                        </a>
                                      );
                                    })()
                                  )}
                                  {sub.message ? <p className="text-slate-200 font-sans pl-4 whitespace-pre-wrap break-words leading-relaxed text-[11px]">{sub.message}</p> : null}
                                  {auth.user?.role === 'SUPER_ADMIN' && (
                                    <button
                                      type="button"
                                      onClick={() => removeMessage(sub.public_id)}
                                      disabled={live.sending}
                                      className="inline-flex items-center gap-0.5 px-1 py-0 mt-1 rounded text-[8.5px] font-mono transition bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white"
                                      style={{ minHeight: 'unset', minWidth: 'unset', height: '15px' }}
                                      title="Delete reply immediately"
                                    >
                                      <Trash2 size={9} />
                                      <span>Del</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 font-mono py-1">
                            No replies yet. Start this thread...
                          </p>
                        )}

                        <form aria-label="Reply thread" onSubmit={sendSubChat(message.public_id)} className="flex items-center gap-1.5 pt-0.5">
                          <input
                            type="text"
                            required
                            maxLength={live.policy.message_max_length} readOnly={live.sending}
                            value={subChatForm.data.message}
                            onChange={(e) => subChatForm.setData('message', e.target.value)}
                            placeholder={
                              subChatForm.data.is_ghost
                                ? '[Ghost] Write reply...'
                                : `Reply to ${isGhost ? 'Anonymous' : message.sender.display_name}...`
                            }
                            className="flex-1 bg-slate-900/90 border border-emerald-500/25 focus:border-emerald-400/60 rounded-md px-2 py-0 h-[26px] min-h-[26px] text-[11px] text-slate-100 placeholder-slate-500 focus:outline-none transition leading-none"
                            style={{ fontSize: '11px' }}
                          />

                          <button
                            type="button"
                            onClick={() => subChatForm.setData('is_ghost', !subChatForm.data.is_ghost)}
                            hidden={!live.policy.anonymous_enabled}
                            className={`h-[26px] w-[26px] p-0 rounded-md border flex items-center justify-center flex-shrink-0 transition cursor-pointer ${
                              subChatForm.data.is_ghost
                                ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                            style={{ minHeight: 'unset', minWidth: 'unset' }}
                            title={
                              subChatForm.data.is_ghost
                                ? 'Ghost disguise active'
                                : 'Enable Ghost disguise'
                            }
                          >
                            <Ghost size={12} />
                          </button>

                          <button
                            type="submit"
                            disabled={!live.policy.can_send || !live.policy.replies_enabled || live.sending || !subChatForm.data.message.trim()}
                            className="subchat-submit-btn inline-flex items-center justify-center gap-1 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-mono font-semibold text-[9.5px] transition shadow-[0_0_8px_rgba(52,211,153,0.3)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0 h-[26px] select-none"
                            style={{ minHeight: 'unset', minWidth: 'unset', height: '26px' }}
                          >
                            <span>Reply</span>
                            <Send size={9.5} />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

          </div>

          {/* Floating Down Arrow button to get back to newest messages when scrolled up */}
          {isScrolledUp && (
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              aria-label="Back to newest messages"
              className="scroll-to-bottom-btn absolute bottom-16 right-4 z-30 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-900/95 border border-cyan-500/60 text-cyan-300 shadow-[0_4px_20px_rgba(0,0,0,0.7)] backdrop-blur-md hover:bg-cyan-950 hover:text-white transition-all transform hover:scale-105 active:scale-95 cursor-pointer select-none"
              title="Jump to newest message"
            >
              <ChevronDown size={14} className="animate-bounce" />
              {unreadCount > 0 ? (
                <span className="text-[10px] font-mono font-bold bg-cyan-500 text-slate-950 px-1.5 py-0.2 rounded-full leading-tight">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : (
                <span className="text-[10px] font-mono font-medium">Newest</span>
              )}
            </button>
          )}

          {/* Message Composer */}
          <div className="conversation-compose">
            {live.error && <p className="field-error mb-2" role="alert">{live.error}</p>}
            {live.sending && <p className="text-xs text-cyan-300 mb-2" role="status">Sending…</p>}
            {!live.policy.can_send ? (
              <div className="p-3 bg-rose-950/80 border border-rose-600 rounded-xl text-rose-300 font-mono text-xs flex items-center justify-center gap-2">
                <Lock size={14} />
                <span>{live.policy.reason}</span>
              </div>
            ) : (
              <div>
                {live.typing && live.typing.length > 0 && (
                  <div className="typing-indicator flex items-center gap-2 px-3 py-1 mb-2 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] w-fit shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span>
                      {live.typing.length === 1
                        ? `${live.typing[0]} is typing…`
                        : `${live.typing.join(', ')} are typing…`}
                    </span>
                  </div>
                )}

                {/* File / Image Attachment Preview (if selected) */}
                {attachedFile && (
                  <div className="mb-2 flex items-center justify-between gap-3 px-3 py-2 bg-slate-900/90 border border-emerald-500/40 rounded-xl shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {attachedPreviewUrl ? (
                        <img src={attachedPreviewUrl} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-emerald-500/40 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-300">
                          <FileText size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-emerald-200 truncate max-w-[190px] sm:max-w-xs">{attachedFile.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">
                          {attachedFile.size >= 1048576
                            ? `${(attachedFile.size / 1048576).toFixed(2)} MB`
                            : `${Math.round(attachedFile.size / 1024)} KB`}{' '}
                          · <span className="text-emerald-400">&lt; 10 MB</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearAttachment}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition"
                      title="Remove attachment"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                <form onSubmit={send}>
                  {/* Plus icon / action menu for registered users (USER and SUPER_ADMIN) */}
                  {auth.user && (
                    <div className="relative flex items-center" ref={plusMenuRef}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.tar,.gz,.7z,.mp3,.mp4,.wav,.json"
                        onChange={handleFileSelect}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPlusMenu((prev) => !prev)}
                        className={`icon-button transition ${
                          showPlusMenu || attachedFile
                            ? 'bg-emerald-950 border border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                            : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                        }`}
                        title="Add attachment or poll"
                        aria-label="Add attachment or poll"
                        aria-expanded={showPlusMenu}
                      >
                        <Plus size={18} className={`transition-transform duration-200 ${showPlusMenu ? 'rotate-45' : ''}`} />
                      </button>

                      {showPlusMenu && (
                        <div
                          role="menu"
                          className="absolute bottom-full left-0 mb-2 w-56 sm:w-64 rounded-2xl bg-[#061b18]/95 border border-emerald-500/30 p-2 shadow-[0_-10px_35px_rgba(0,0,0,0.65)] backdrop-blur-xl z-50 text-slate-200 select-none animate-in fade-in slide-in-from-bottom-2 duration-150"
                        >
                          <div className="px-2.5 py-1 text-[10px] font-mono text-emerald-400/80 uppercase tracking-wider border-b border-emerald-500/20 mb-1.5 flex items-center justify-between">
                            <span>Options</span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {auth.user.role === 'SUPER_ADMIN' ? 'ADMIN' : 'MEMBER'}
                            </span>
                          </div>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setShowPlusMenu(false);
                              fileInputRef.current?.click();
                            }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-emerald-900/40 hover:text-emerald-200 transition-colors group cursor-pointer"
                          >
                            <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 group-hover:border-emerald-400/60 transition-colors">
                              <Paperclip size={15} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-100 group-hover:text-emerald-300">
                                Attach File / Image
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                Photos, docs (&lt; 10 MB)
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setShowPlusMenu(false);
                              setIsPollCreateOpen(true);
                              const el = document.querySelector('.poll-section-container');
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              }
                            }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-emerald-900/40 hover:text-emerald-200 transition-colors group cursor-pointer"
                          >
                            <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 group-hover:border-emerald-400/60 transition-colors">
                              <BarChart3 size={15} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-100 group-hover:text-emerald-300">
                                Create a Poll
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                Ask room with voting options
                              </div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <textarea
                    ref={messageInputRef}
                    rows={1}
                    aria-label="Your message"
                    required={!attachedFile}
                    maxLength={live.policy.message_max_length}
                    readOnly={live.sending}
                    placeholder={
                      form.data.is_ghost
                        ? '[ANONYMOUS DISGUISE ACTIVE] Type a secret message...'
                        : attachedFile
                        ? 'Add caption or send... (Enter to send)'
                        : 'Type your message... (Enter to send)'
                    }
                    value={form.data.message}
                    onChange={(e) => {
                      form.setData('message', e.target.value);
                      if (e.target.value.trim()) {
                        live.sendTyping(form.data.is_ghost);
                      }
                      adjustInputHeight();
                    }}
                    onKeyDown={handleKeyDown}
                    className="composer-textarea font-sans"
                  />

                {/* Emoji Button & Picker */}
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className={`icon-button ${
                      showEmojiPicker
                        ? 'bg-emerald-950 border border-emerald-400 text-emerald-300'
                        : 'text-slate-400 hover:text-emerald-300'
                    }`}
                    title="Insert emoji"
                    aria-label="Choose emoji"
                  >
                    <Smile size={17} />
                  </button>
                  {showEmojiPicker && (
                    <EmojiPicker
                      onSelect={insertEmoji}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => form.setData('is_ghost', !form.data.is_ghost)}
                            hidden={!live.policy.anonymous_enabled}
                  className={`icon-button ${
                    form.data.is_ghost ? 'bg-cyan-950 border border-cyan-400 text-cyan-300' : 'text-slate-400'
                  }`}
                  title={
                    form.data.is_ghost
                      ? 'Anonymous Disguise Active: Sending with random name'
                      : 'Enable Anonymous Disguise: Hide my username'
                  }
                >
                  <Ghost size={16} />
                </button>

                <button
                  className="button"
                  type="submit"
                  disabled={!live.policy.can_send || live.sending || (!form.data.message.trim() && !attachedFile)}
                  aria-label="Send message"
                >
                  <Send size={15} />
                  <span>{live.sending ? 'Sending…' : 'Send'}</span>
                </button>
              </form>
            </div>
          )}

            {form.errors.message && (
              <p className="field-error font-mono text-xs" role="alert">
                {form.errors.message}
              </p>
            )}

            <div className="composer-hint font-mono text-[10px] flex items-center justify-between">
              {auth.user ? (
                <span className="flex items-center gap-1.5 flex-wrap">
                  {form.data.is_ghost ? (
                    <span className="text-cyan-300 flex items-center gap-1">
                      <Ghost size={11} /> Anonymous Ghost Disguise Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      {auth.user.avatar_url && (
                        <img src={auth.user.avatar_url} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                      )}
                      <span>Posting as @{auth.user.username}</span>
                      <Link href="/profile" className="text-cyan-400 hover:underline">
                        (Profile Image)
                      </Link>
                    </span>
                  )}
                  · Press Enter to send
                </span>
              ) : (
                <span className="text-cyan-400/90 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-600/50 text-[9px] text-cyan-300 inline-flex items-center gap-1 font-mono">
                    <Ghost size={10} />
                    <span>GHOST</span>
                  </span>
                  <span>Ephemeral Ghost Session · Chat history will not remain</span>
                </span>
              )}
              <span>{form.data.message.length}/{live.policy.message_max_length}</span>
            </div>
          </div>
        </section>

        {/* Room Sidebar */}
        <aside className="conversation-sidebar">
          <div className="room-connection-art" key={latest || 'empty'} aria-hidden="true">
            <span className="connection-ring one" />
            <span className="connection-ring two" />
            <span className="connection-ring three" />
            <Radio size={32} className="text-cyan-400" />
            <i />
            <i />
            <i />
          </div>

          <span className="eyebrow font-mono text-cyan-400">CURRENT ROOM</span>
          <h3 className="font-bold text-slate-100">{room.name}</h3>
          <p className="font-mono text-xs text-slate-400">
            Messages are private and never linked to your real identity or devices.
          </p>

          <div className="sidebar-divider" />

          <h4 className="font-mono text-xs uppercase text-slate-300">Other Rooms</h4>
          <div className="other-rooms font-mono text-xs">
            {rooms
              .filter((other) => other.slug !== room.slug)
              .map((other) => (
                <Link href={`/chat/${other.slug}`} key={other.public_id} className="hover:text-cyan-300">
                  <MessageSquare size={14} />
                  <span>{other.name}</span>
                  <ArrowUpRight size={12} className="ml-auto" />
                </Link>
              ))}
          </div>

          <Link href="/chat" className="text-link font-mono text-xs mt-3">
            <span>Browse all rooms</span>
            <ArrowUpRight size={13} />
          </Link>

          <div className="room-kindness font-mono text-xs">
            <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
            <span>Safety tip: Never share real names, phone numbers, or passwords in public chat.</span>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
