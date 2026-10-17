import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useForm, Link, usePage } from '@inertiajs/react';
import { useLiveChat } from '@/hooks/useLiveChat';
import ChatTools from '@/components/ChatTools';
import AppLayout from '@/layouts/AppLayout';
import type { ChatRoomSummary, ChatMessageItem, SharedProps } from '@/types';
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
} from 'lucide-react';
import EmojiPicker from '@/components/EmojiPicker';
import GardenButterflyOverlay, { type GardenButterflyRef } from '@/components/GardenButterflyOverlay';

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
  const live = useLiveChat(room.slug, initialMessages, site, !isLocked && site.chat_enabled && (!emergencyLockdown || auth.user?.role === 'SUPER_ADMIN') && (!!auth.user || site.guest_chat_enabled));
  const { messages, connected } = live;
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
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
  const messageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreviewUrl, setAttachedPreviewUrl] = useState<string | null>(null);

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
    }, 0);
  };

  const butterflyRef = useRef<GardenButterflyRef>(null);

  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });

  const handleButterflyReact = async (msg: ChatMessageItem, targetEl: HTMLElement) => {
    const rect = targetEl.getBoundingClientRect();
    butterflyRef.current?.flyTo(rect);
    await live.reactButterfly(msg.public_id);
  };

  const handleMessageTapOrClick = (msg: ChatMessageItem, targetEl: HTMLElement) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current.time;

    if (lastTapRef.current.id === msg.public_id && timeSinceLastTap < 380) {
      // Double tap detected!
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      lastTapRef.current = { id: '', time: 0 };
      void handleButterflyReact(msg, targetEl);
    } else {
      // First tap: set timer to toggle timestamp if not double tapped
      lastTapRef.current = { id: msg.public_id, time: now };
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = setTimeout(() => {
        setTouchedMessageId(prev => prev === msg.public_id ? null : msg.public_id);
      }, 260);
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


  const latest = messages.at(-1)?.public_id;

  useEffect(() => {
    if (latest === lastMessage.current) return;
    lastMessage.current = latest;
    if (autoScroll && nearBottom.current && stream.current) {
      stream.current.scrollTop = stream.current.scrollHeight;
    } else if (latest) {
      queueMicrotask(() => setUnread(true));
    }
  }, [latest, autoScroll]);

  const jump = () => {
    if (stream.current) stream.current.scrollTop = stream.current.scrollHeight;
    nearBottom.current = true;
    setUnread(false);
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if ((!form.data.message.trim() && !attachedFile) || !live.policy.can_send || live.sending) return;
    nearBottom.current = true;

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
          <ChatTools search={searchTerm} onSearch={setSearchTerm} autoScroll={autoScroll} onAutoScroll={setAutoScroll} onRefresh={() => void live.refresh()} connected={connected} />
          <header className="conversation-header">
            <span className="room-symbol flex items-center justify-center text-xl select-none animate-pulse">
              👻
            </span>
            <div>
              <h1 className="font-bold tracking-wide text-slate-100">{room.name}</h1>
              <p className="font-mono text-xs text-slate-400">{room.description || 'Live anonymous chat.'}</p>
            </div>
            <span className={`chat-status font-mono text-[10px] ${connected ? '' : 'offline'}`}>
              <i className="status-dot animate-ping" />
              {connected ? 'CONNECTED' : 'RECONNECTING…'}
            </span>
          </header>

          <div
            className="conversation-stream"
            ref={stream}
            onScroll={() => {
              const el = stream.current;
              if (el) {
                nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
                if (nearBottom.current) setUnread(false);
              }
            }}
            role="log"
            aria-label="Chat messages"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.length === 0 && (
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

            {messages.filter(message => !searchTerm || [message.message, message.sender.display_name, ...(message.sub_chats || []).map(reply => reply.message)].some(text => text.toLowerCase().includes(searchTerm.toLowerCase()))).map((message, index, arr) => {
              const own = Boolean(message.is_own || mySentIds.has(message.public_id) || (auth.user && message.sender.public_id === auth.user?.public_id));
              const isGhost = message.is_ghost || message.sender.is_ghost || message.is_guest;
              const isSubChatOpen = activeSubChatId === message.public_id;
              const subCount = message.sub_chats?.length || message.sub_chats_count || 0;
              const isLastMessage = index === arr.length - 1;

              return (
                <article
                  className={`chat-message ${own ? 'own' : ''}`}
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
                    <div className={`flex items-end gap-2 ${own ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`message-bubble relative font-sans cursor-pointer transition select-none ${touchedMessageId === message.public_id ? 'show-time' : ''}`}
                          onClick={(e) => handleMessageTapOrClick(message, e.currentTarget)}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
                            void handleButterflyReact(message, e.currentTarget);
                          }}
                          title="Double-tap to magic butterfly · Tap to view timestamp"
                        >
                          {/* Perched Garden Butterfly sitting on the message */}
                          {(message.butterfly_count ?? 0) > 0 && (
                            <span
                              className="perched-butterfly absolute -top-2.5 -right-2 px-1.5 py-0.5 rounded-full bg-emerald-950/95 border border-emerald-400/50 text-[10px] font-mono text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.5)] flex items-center gap-1 z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleButterflyReact(message, e.currentTarget);
                              }}
                              title="A garden butterfly is resting here! Double-tap message to magic another"
                            >
                              <span className="text-xs">🦋</span>
                              <span>{message.butterfly_count}</span>
                            </span>
                          )}

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

                      {/* Action buttons on the side of the message */}
                      <div className="flex items-center gap-1">

                        {/* Reply button on the right side of the message */}
                        <button
                          type="button"
                          onClick={() => setActiveSubChatId(isSubChatOpen ? null : message.public_id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md transition text-[11px] font-mono flex-shrink-0 ${
                            isSubChatOpen
                              ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-300'
                              : 'bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                          title="Reply in Sub-chat"
                        >
                          <MessageSquare size={11} className={subCount > 0 ? 'text-cyan-400' : ''} />
                          <span>{subCount > 0 ? `Reply (${subCount})` : 'Reply'}</span>
                          <CornerDownRight size={10} className="text-slate-500" />
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
                      <div className="mt-3 p-3 rounded-xl bg-slate-900/70 border border-cyan-900/50 shadow-inner">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-mono text-cyan-300">
                          <span className="flex items-center gap-1.5">
                            <CornerDownRight size={13} className="text-cyan-400" />
                            <span>Sub-chat Thread ({subCount} messages)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveSubChatId(null)}
                            className="text-slate-500 hover:text-slate-300 p-0.5 rounded"
                            title="Close thread"
                          >
                            <X size={13} />
                          </button>
                        </div>

                        {message.sub_chats && message.sub_chats.length > 0 ? (
                          <div className="space-y-2 mb-3 max-h-56 overflow-y-auto pr-1">
                            {message.sub_chats.map((sub) => {
                              const isSubGhost = sub.is_ghost || sub.sender.is_ghost || sub.is_guest;
                              const isSubOwn = Boolean(sub.is_own || mySentIds.has(sub.public_id) || (auth.user && sub.sender.public_id === auth.user?.public_id));
                              return (
                                <div
                                  key={sub.public_id}
                                  className={`p-2 rounded-lg text-xs group transition ${
                                    isSubOwn ? 'bg-cyan-950/40 border border-cyan-800/40' : 'bg-slate-950/60 border border-slate-800/60'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                                      <span className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-slate-800 flex-shrink-0">
                                        {isSubGhost ? (
                                          <Ghost size={10} className="text-cyan-400" />
                                        ) : sub.sender.avatar_url ? (
                                          <img src={sub.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <span className="text-[9px] text-cyan-300 font-bold">{sub.sender.display_name.slice(0, 1).toUpperCase()}</span>
                                        )}
                                      </span>
                                      <span className={isSubGhost ? 'text-cyan-300' : ''}>{isSubOwn ? 'You' : sub.sender.display_name}</span>
                                    </span>
                                    <span className="text-slate-500 opacity-60 group-hover:opacity-100 transition">{sub.created_at}</span>
                                  </div>
                                  {sub.file_url && (
                                    (() => {
                                      const isSubImg = sub.file_type === 'image' || (sub.file_url && /\.(jpe?g|png|gif|webp|svg|avif|bmp)$/i.test(sub.file_url));
                                      if (isSubImg) {
                                        return (
                                          <div className="my-1.5 ml-5 overflow-hidden rounded-lg border border-emerald-500/25 max-w-[220px]">
                                            <a href={sub.file_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                              <img src={sub.file_url} alt={sub.file_name || 'Attached image'} className="max-h-40 w-auto rounded-lg object-contain" loading="lazy" />
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
                                          className="my-1.5 ml-5 inline-flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/80 border border-slate-700 text-xs text-emerald-300 hover:text-white"
                                        >
                                          <FileText size={14} className="text-emerald-400 flex-shrink-0" />
                                          <span className="truncate max-w-[140px] text-[11px]">{sub.file_name || 'File'}</span>
                                          <Download size={12} className="text-slate-400 flex-shrink-0" />
                                        </a>
                                      );
                                    })()
                                  )}
                                  {sub.message ? <p className="text-slate-200 font-sans pl-5 whitespace-pre-wrap break-words">{sub.message}</p> : null}
                                  {auth.user?.role === 'SUPER_ADMIN' && (
                                    <button
                                      type="button"
                                      onClick={() => removeMessage(sub.public_id)}
                                      disabled={live.sending}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1.5 rounded text-[10px] font-mono transition bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white"
                                      title="Delete reply immediately"
                                    >
                                      <Trash2 size={10} />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 font-mono py-2">
                            No sub-messages yet. Be the first to reply in this thread!
                          </p>
                        )}

                        <form aria-label="Reply thread" onSubmit={sendSubChat(message.public_id)} className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            maxLength={live.policy.message_max_length} readOnly={live.sending}
                            value={subChatForm.data.message}
                            onChange={(e) => subChatForm.setData('message', e.target.value)}
                            placeholder={
                              subChatForm.data.is_ghost
                                ? '[GHOST DISGUISE ACTIVE] Write anonymous sub-reply...'
                                : `Reply to ${isGhost ? 'Anonymous' : message.sender.display_name}...`
                            }
                            className="flex-1 bg-slate-950/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                          />

                          <button
                            type="button"
                            onClick={() => subChatForm.setData('is_ghost', !subChatForm.data.is_ghost)}
                            hidden={!live.policy.anonymous_enabled}
                            className={`p-1.5 rounded-lg border transition ${
                              subChatForm.data.is_ghost
                                ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                            title={
                              subChatForm.data.is_ghost
                                ? 'Ghost disguise active: Hiding your username in this sub-reply'
                                : 'Enable Ghost disguise: Reply anonymously'
                            }
                          >
                            <Ghost size={14} />
                          </button>

                          <button
                            type="submit"
                            disabled={!live.policy.can_send || !live.policy.replies_enabled || live.sending || !subChatForm.data.message.trim()}
                            className="button button-small !py-1 !px-2.5 !text-[10px]"
                          >
                            <span>Reply</span>
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

          </div>

          {unread && (
            <button className="new-messages font-mono text-xs" onClick={jump}>
              New messages <ChevronDown size={14} />
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
                  {/* Plus icon for registered users */}
                  {auth.user && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.tar,.gz,.7z,.mp3,.mp4,.wav,.json"
                        onChange={handleFileSelect}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`icon-button transition ${
                          attachedFile
                            ? 'bg-emerald-950 border border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                            : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                        }`}
                        title="Add image or file (< 10 MB)"
                        aria-label="Add image or file"
                      >
                        <Plus size={18} />
                      </button>
                    </>
                  )}

                  <input
                    ref={messageInputRef}
                    aria-label="Your message"
                    required={!attachedFile}
                    maxLength={live.policy.message_max_length} readOnly={live.sending}
                    autoComplete="off"
                    placeholder={
                      form.data.is_ghost
                        ? '[ANONYMOUS DISGUISE ACTIVE] Type a secret message...'
                        : attachedFile
                        ? 'Add a caption or send file... (press Enter to send)'
                        : 'Type your message...'
                    }
                    value={form.data.message}
                    onChange={(e) => {
                      form.setData('message', e.target.value);
                      if (e.target.value.trim()) {
                        live.sendTyping(form.data.is_ghost);
                      }
                    }}
                    className="font-sans"
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
