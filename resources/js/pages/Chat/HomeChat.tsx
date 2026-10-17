import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useForm, Link, usePage } from '@inertiajs/react';
import { useLiveChat } from '@/hooks/useLiveChat';
import ChatTools from '@/components/ChatTools';
import AppLayout from '@/layouts/AppLayout';
import type { ChatRoomSummary, ChatMessageItem, SharedProps } from '@/types';
import {
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
  ArrowRight,
  MessageCircle,
} from 'lucide-react';

interface Props {
  room: ChatRoomSummary;
  initialMessages: ChatMessageItem[];
  rooms: ChatRoomSummary[];
  emergencyLockdown?: boolean;
}

export default function HomeChat({ room, initialMessages, rooms, emergencyLockdown }: Props) {
  const { auth, site } = usePage<SharedProps>().props;
  const form = useForm({ message: '', is_ghost: false, guest_name: '' });
  const subChatForm = useForm({ message: '', is_ghost: false, guest_name: '', parent_public_id: '' });
  
  const stream = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const lastMessage = useRef<string | undefined>(undefined);
  const [unread, setUnread] = useState(false);
  const live = useLiveChat(room.slug, initialMessages, site, site.chat_enabled && (!emergencyLockdown || auth.user?.role === 'SUPER_ADMIN') && (!!auth.user || site.guest_chat_enabled));
  const { messages, connected } = live;
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  // Track which message has its sub-chat open
  const [activeSubChatId, setActiveSubChatId] = useState<string | null>(null);


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
      {site.homepage_title ? (
        <section className="site-home-intro"><h1>{site.homepage_title}</h1>{site.homepage_description ? <p>{site.homepage_description}</p> : null}</section>
      ) : null}
      {/* Top Banner */}
      <div className="mb-4 flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80 w-full min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(6,182,212,0.25)] flex-shrink-0 select-none animate-pulse">
            👻
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-100 truncate">{room.name}</h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 flex items-center gap-1.5 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                PUBLIC CHAT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Public Chat Layout */}
      <div className="chat-layout">
        <section className="conversation-panel" aria-label="Public Chatbox">
          <ChatTools search={searchTerm} onSearch={setSearchTerm} autoScroll={autoScroll} onAutoScroll={setAutoScroll} onRefresh={() => void live.refresh()} connected={connected} />
          <header className="conversation-header">
            <span className="room-symbol">
              <MessageCircle size={20} className="text-cyan-400" />
            </span>
            <div>
              <h2 className="font-bold tracking-wide text-slate-100 text-sm">{room.name} · Live Chatbox</h2>
              <p className="font-mono text-[11px] text-slate-400">
                Each message has its own dedicated sub-chat. Click "Sub-chat" on any message to join the thread.
              </p>
            </div>
            <span className={`chat-status font-mono text-[10px] ${connected ? '' : 'offline'}`}>
              <i className="status-dot animate-ping" />
              {connected ? 'LIVE FEED' : 'RECONNECTING…'}
            </span>
          </header>

          <p className="chat-welcome-message">{site.welcome_message}</p>
          {/* Conversation Messages Stream */}
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
            aria-label="Public chat messages"
            aria-live="polite"
            aria-relevant="additions"
          >
            <div className="conversation-start">
              <div className="empty-orbit">
                <Radio size={24} className="text-cyan-400" />
              </div>
              <h3 className="font-mono text-sm tracking-wider uppercase text-slate-200">
                Public Anonymous Chatbox
              </h3>
              <p className="font-sans text-xs text-slate-400">
                Welcome! Everyone can read messages. Start a conversation or reply in any message's sub-chat.
              </p>
              <span className="font-mono text-[10px] text-slate-500">
                100% private · Zero IP logging · Ghost aliases supported
              </span>
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

                  <div className="flex-1 min-w-0">
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
                    {/* Sub-chat Action Button */}
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
                          {subCount} {subCount === 1 ? 'reply' : 'replies'} in thread
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

                        {/* List of sub-chat messages */}
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
                            No sub-messages yet. Be the first to start this thread!
                          </p>
                        )}

                        {/* Sub-chat Composer */}
                        <form aria-label="Reply thread" onSubmit={sendSubChat(message.public_id)} className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            maxLength={live.policy.message_max_length} readOnly={live.sending}
                            value={subChatForm.data.message}
                            onChange={(e) => subChatForm.setData('message', e.target.value)}
                            placeholder={
                              auth.user
                                ? subChatForm.data.is_ghost
                                  ? '[GHOST DISGUISE ACTIVE] Write anonymous sub-reply...'
                                  : `Reply to ${isGhost ? 'Anonymous' : message.sender.display_name}...`
                                : `Reply as Ghost Node to ${isGhost ? 'Anonymous' : message.sender.display_name}...`
                            }
                            className="flex-1 bg-slate-950/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                          />

                          {auth.user && (
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
                          )}

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

          {/* Main Message Composer */}
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
                {!auth.user && (
                  <div className="mb-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] font-mono text-cyan-200">
                    <div className="flex items-center gap-2">
                      <Ghost size={14} className="text-cyan-400 animate-pulse flex-shrink-0" />
                      <span>
                        <strong>Ghost Chat Active:</strong> You can chat freely without logging in! (Note: Ghost chat history will not remain).
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                      <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold underline">
                        Join to Save History & Add Photo
                      </Link>
                    </div>
                  </div>
                )}

                <form onSubmit={send}>
                  <input
                    aria-label="Your public chat message"
                    required
                    maxLength={live.policy.message_max_length} readOnly={live.sending}
                    autoComplete="off"
                    placeholder={
                      auth.user
                        ? form.data.is_ghost
                          ? '[ANONYMOUS DISGUISE ACTIVE] Type a secret message in public chat...'
                          : 'Message public chat... (press Enter to send)'
                        : 'Chat freely as Ghost... (Chat history will not remain · Enter to send)'
                    }
                    value={form.data.message}
                    onChange={(e) => form.setData('message', e.target.value)}
                    className="font-sans"
                  />

                  {auth.user && (
                    <button
                      type="button"
                      onClick={() => form.setData('is_ghost', !form.data.is_ghost)}
                            hidden={!live.policy.anonymous_enabled}
                      className={`icon-button ${
                        form.data.is_ghost ? 'bg-cyan-950 border border-cyan-400 text-cyan-300' : 'text-slate-400'
                      }`}
                      title={
                        form.data.is_ghost
                          ? 'Anonymous Disguise Active: Sending with random ghost name'
                          : 'Enable Anonymous Disguise: Hide my username'
                      }
                    >
                      <Ghost size={16} />
                    </button>
                  )}

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
              </div>
            )}

            {form.errors.message && (
              <p className="field-error font-mono text-xs" role="alert">
                {form.errors.message}
              </p>
            )}

            <div className="composer-hint font-mono text-[10px] mt-1.5 flex items-center justify-between">
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

        {/* Sidebar Info */}
        <aside className="conversation-sidebar">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-left mb-4">
            <span className="eyebrow font-mono text-cyan-400 mb-2">PUBLIC STREAM</span>
            <h3 className="font-bold text-slate-100 text-base mb-1">Untraceable & Live</h3>
            <p className="font-mono text-xs text-slate-400 leading-relaxed">
              Welcome to the public homepage chat. All conversations are private, non-indexed, and never tied to your real identity.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-left mb-4">
            <h4 className="font-mono text-xs uppercase text-slate-300 mb-2 flex items-center justify-between">
              <span>Other Rooms</span>
              <Link href="/chat" className="text-cyan-400 text-[10px] hover:underline">View All</Link>
            </h4>
            <div className="space-y-1.5 font-mono text-xs">
              {rooms
                .filter((r) => r.slug !== room.slug)
                .slice(0, 4)
                .map((r) => (
                  <Link
                    key={r.public_id}
                    href={`/chat/${r.slug}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/60 text-slate-300 hover:text-cyan-300 transition"
                  >
                    <span>#{r.name}</span>
                    <ArrowRight size={12} className="text-slate-600" />
                  </Link>
                ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-left font-mono text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck size={14} />
              <span>Zero-Trace Guarantee</span>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-500">
              No cookies, no IP address storage, and zero browser fingerprinting. Your voice is completely anonymous.
            </p>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
