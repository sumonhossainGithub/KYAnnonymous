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
  CornerDownRight,
  X,
} from 'lucide-react';

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
    if (!form.data.message.trim() || !live.policy.can_send || live.sending) return;
    nearBottom.current = true;
    if (await live.send({ ...form.data, is_ghost: live.policy.anonymous_enabled && form.data.is_ghost })) {
      form.reset('message');
      setUnread(false);
    }
  };

  const sendSubChat = (parentPublicId: string) => async (event: FormEvent) => {
    event.preventDefault();
    if (!subChatForm.data.message.trim() || !live.policy.can_send || live.sending) return;
    if (await live.send({ ...subChatForm.data, is_ghost: live.policy.anonymous_enabled && subChatForm.data.is_ghost, parent_public_id: parentPublicId })) subChatForm.reset('message');
  };

  const removeMessage = (publicId: string) => {
    if (window.confirm('Remove this message and its replies from the room?')) void live.remove(publicId);
  };

  return (
    <AppLayout>
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

            {messages.filter(message => !searchTerm || [message.message, message.sender.display_name, ...(message.sub_chats || []).map(reply => reply.message)].some(text => text.toLowerCase().includes(searchTerm.toLowerCase()))).map((message) => {
              const own = message.sender.public_id === auth.user?.public_id;
              const isGhost = message.is_ghost || message.sender.is_ghost;
              const isSubChatOpen = activeSubChatId === message.public_id;
              const subCount = message.sub_chats?.length || message.sub_chats_count || 0;

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
                      <strong className={isGhost ? 'text-cyan-300' : ''}>
                        {own ? 'You' : message.sender.display_name}
                      </strong>
                      <span className="text-slate-500">@{message.sender.username}</span>
                      {isGhost && (
                        <span className="text-[9px] px-1 bg-cyan-950/80 border border-cyan-800 text-cyan-300 rounded">
                          ANONYMOUS
                        </span>
                      )}
                      {message.is_guest && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-600/40 text-cyan-300 font-mono inline-flex items-center gap-1" title="Ghost message · Chat history will not remain">
                          <Ghost size={10} className="text-cyan-400" />
                          <span>GHOST · EPHEMERAL</span>
                        </span>
                      )}
                    </div>

                    <div className="message-bubble font-sans">
                      <p>{message.message}</p>
                      <time className="font-mono text-[10px]">{message.created_at}</time>
                    </div>

                    {auth.user?.role === 'SUPER_ADMIN' && <button type="button" className="text-xs text-rose-300 mt-2" disabled={live.sending} onClick={() => removeMessage(message.public_id)}>Remove message</button>}
                    {/* Sub-chat Button */}
                    <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px]">
                      <button
                        type="button"
                        onClick={() => setActiveSubChatId(isSubChatOpen ? null : message.public_id)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md transition ${
                          isSubChatOpen
                            ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-300'
                            : 'bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <MessageSquare size={11} className={subCount > 0 ? 'text-cyan-400' : ''} />
                        <span>{subCount > 0 ? `Sub-chat (${subCount})` : 'Reply in Sub-chat'}</span>
                        <CornerDownRight size={10} className="text-slate-500" />
                      </button>

                      {subCount > 0 && !isSubChatOpen && (
                        <span className="text-[10px] text-slate-500">
                          {subCount} {subCount === 1 ? 'reply' : 'replies'}
                        </span>
                      )}
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
                              const isSubGhost = sub.is_ghost || sub.sender.is_ghost;
                              const isSubOwn = sub.sender.public_id === auth.user?.public_id;
                              return (
                                <div
                                  key={sub.public_id}
                                  className={`p-2 rounded-lg text-xs ${
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
                                      <span>{isSubOwn ? 'You' : sub.sender.display_name}</span>
                                      {isSubGhost && (
                                        <span className="text-[8px] px-1 bg-cyan-950 border border-cyan-800 text-cyan-300 rounded">
                                          GHOST
                                        </span>
                                      )}
                                      {sub.is_guest && (
                                        <span className="text-[8px] px-1 bg-cyan-950/80 border border-cyan-600/40 text-cyan-300 rounded inline-flex items-center gap-0.5" title="Ghost sub-reply · Ephemeral">
                                          <Ghost size={9} className="text-cyan-400" />
                                          <span>GHOST</span>
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-slate-500">{sub.created_at}</span>
                                  </div>
                                  <p className="text-slate-200 font-sans">{sub.message}</p>
                                  {auth.user?.role === 'SUPER_ADMIN' && <button type="button" className="text-xs text-rose-300 mt-2" disabled={live.sending} onClick={() => removeMessage(sub.public_id)}>Remove reply</button>}
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
              <form onSubmit={send}>
                <input
                  aria-label="Your message"
                  required
                  maxLength={live.policy.message_max_length} readOnly={live.sending}
                  autoComplete="off"
                  placeholder={
                    form.data.is_ghost
                      ? '[ANONYMOUS DISGUISE ACTIVE] Type a secret message...'
                      : 'Type your message...'
                  }
                  value={form.data.message}
                  onChange={(e) => form.setData('message', e.target.value)}
                  className="font-sans"
                />

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
                  disabled={live.sending || !form.data.message.trim()}
                  aria-label="Send message"
                >
                  <Send size={15} />
                  <span>{live.sending ? 'Sending…' : 'Send'}</span>
                </button>
              </form>
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
