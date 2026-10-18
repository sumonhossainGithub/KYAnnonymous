import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessageItem, PollItem, ButterflyEvent, SiteSettings } from '@/types';

interface Policy {
  can_send: boolean;
  reason: string;
  replies_enabled: boolean;
  anonymous_enabled: boolean;
  message_max_length: number;
  poll_interval: number;
}
interface Snapshot {
  messages: ChatMessageItem[];
  policy: Policy;
  typing?: string[];
  polls?: PollItem[];
  butterfly_events?: ButterflyEvent[];
}

export function useLiveChat(slug: string, initialMessages: ChatMessageItem[], site: SiteSettings, canSend: boolean) {
  const initialPolicy: Policy = { can_send: canSend, reason: canSend ? '' : 'Chat is paused or requires sign-in.', ...site };
  const [state, setState] = useState<{ slug: string; snapshot: Snapshot }>({ slug, snapshot: { messages: initialMessages, policy: initialPolicy, typing: [], polls: [], butterfly_events: [] } });
  const [connected, setConnected] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const activeRead = useRef<AbortController | null>(null);
  const activeWrite = useRef<AbortController | null>(null);
  const lastTypingPing = useRef(0);
  const currentSlug = useRef(slug);
  const prevMessageCount = useRef(initialMessages.length);
  const notificationsEnabled = useRef(false);
  const seenButterflyEvents = useRef<Set<string>>(new Set());
  const butterflyCallbacks = useRef<Array<(msgPublicId: string) => void>>([]);
  const snapshot = state.slug === slug ? state.snapshot : { messages: initialMessages, policy: initialPolicy, typing: [], polls: [], butterfly_events: [] };

  const accept = useCallback((value: Snapshot) => {
    if (currentSlug.current !== slug) return;
    setState(previous => previous.slug === slug && JSON.stringify(previous.snapshot) === JSON.stringify(value) ? previous : { slug, snapshot: value });
    setConnected(true);

    // Browser notification for new messages when tab is hidden
    if (document.hidden && notificationsEnabled.current && value.messages.length > prevMessageCount.current) {
      const newMsgs = value.messages.slice(prevMessageCount.current);
      for (const msg of newMsgs) {
        if (msg.is_own) continue;
        try {
          const notif = new Notification(msg.sender.display_name, {
            body: msg.message || '📎 Sent an attachment',
            icon: msg.sender.avatar_url || undefined,
            tag: `chat-${slug}-${msg.public_id}`,
            silent: false,
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch {}
      }
    }
    prevMessageCount.current = value.messages.length;

    // Process butterfly events for broadcast animation
    if (value.butterfly_events && value.butterfly_events.length > 0) {
      for (const evt of value.butterfly_events) {
        const key = `${evt.message_public_id}_${evt.timestamp}`;
        if (!seenButterflyEvents.current.has(key)) {
          seenButterflyEvents.current.add(key);
          for (const cb of butterflyCallbacks.current) {
            cb(evt.message_public_id);
          }
        }
      }
      // Keep set from growing unbounded
      if (seenButterflyEvents.current.size > 200) {
        const arr = [...seenButterflyEvents.current];
        seenButterflyEvents.current = new Set(arr.slice(-100));
      }
    }
  }, [slug]);

  const refresh = useCallback(async () => {
    if (busy.current || document.hidden || activeRead.current) return;
    const controller = new AbortController();
    activeRead.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`/chat/${encodeURIComponent(slug)}/messages`, { headers: { Accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
      if (!response.ok) {
        if ([401, 403, 404].includes(response.status)) {
          setError('This room is unavailable or your session no longer has access.');
          setState(previous => ({ slug, snapshot: { ...previous.snapshot, policy: { ...previous.snapshot.policy, can_send: false, reason: 'This room is unavailable.' } } }));
        }
        throw new Error('Unable to refresh messages');
      }
      const value = await response.json();
      if (!controller.signal.aborted && !busy.current) accept(value);
    } catch {
      if (!controller.signal.aborted) setConnected(false);
    } finally {
      window.clearTimeout(timeout);
      if (activeRead.current === controller) activeRead.current = null;
    }
  }, [slug, accept]);

  useEffect(() => {
    currentSlug.current = slug;
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), snapshot.policy.poll_interval);
    const resume = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
      activeRead.current?.abort();
      activeRead.current = null;
    };
  }, [slug, refresh, snapshot.policy.poll_interval]);

  useEffect(() => () => { activeWrite.current?.abort(); }, [slug]);

  const write = async (url: string, method: string, data?: object | FormData) => {
    if (busy.current) return false;
    busy.current = true;
    setSending(true);
    setError('');
    activeRead.current?.abort();
    activeRead.current = null;
    const controller = new AbortController();
    activeWrite.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 35000);
    try {
      const token = document.cookie.split('; ').find(cookie => cookie.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length);
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
      };
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }
      const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        signal: controller.signal,
        headers,
        body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
      });
      if (response.status === 419) throw new Error('Your session expired. Refresh this page before sending again. Your draft is still here.');
      const value = await response.json();
      if (!response.ok) throw new Error(Object.values(value.errors || {}).flat().join(' ') || value.message || 'Unable to send. Please try again.');
      accept(value);
      return true;
    } catch (failure) {
      if (currentSlug.current === slug) {
        setError(failure instanceof Error && failure.name !== 'AbortError' ? failure.message : 'Could not confirm delivery. Check the conversation before retrying. Your draft was kept.');
        setConnected(false);
      }
      return false;
    } finally {
      window.clearTimeout(timeout);
      busy.current = false;
      setSending(false);
    }
  };

  const sendTyping = useCallback(async (isGhost = false) => {
    const now = Date.now();
    if (now - lastTypingPing.current < 2500) return;
    lastTypingPing.current = now;
    try {
      const token = document.cookie.split('; ').find(cookie => cookie.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length);
      await fetch(`/chat/${encodeURIComponent(slug)}/typing`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
        },
        body: JSON.stringify({ is_ghost: isGhost }),
      });
    } catch {}
  }, [slug]);

  const setNotifications = useCallback((enabled: boolean) => {
    notificationsEnabled.current = enabled;
  }, []);

  const onButterflyBroadcast = useCallback((cb: (msgPublicId: string) => void) => {
    butterflyCallbacks.current.push(cb);
    return () => {
      butterflyCallbacks.current = butterflyCallbacks.current.filter(fn => fn !== cb);
    };
  }, []);

  return { ...snapshot, typing: snapshot.typing || [], polls: snapshot.polls || [], connected, sending, error, refresh, sendTyping,
    setNotifications, onButterflyBroadcast,
    send: (data: object | FormData) => write(`/chat/${encodeURIComponent(slug)}/message`, 'POST', data),
    reactButterfly: (publicId: string) => write(`/chat/${encodeURIComponent(slug)}/messages/${publicId}/butterfly`, 'POST'),
    remove: (publicId: string) => write(`/admin/chat/${encodeURIComponent(slug)}/messages/${publicId}`, 'DELETE'),
    createPoll: (data: { question: string; options: string[] }) => write(`/chat/${encodeURIComponent(slug)}/polls`, 'POST', data),
    votePoll: (pollPublicId: string, optionIndex: number) => write(`/chat/${encodeURIComponent(slug)}/polls/${pollPublicId}/vote`, 'POST', { option_index: optionIndex }),
    retractPollVote: (pollPublicId: string) => write(`/chat/${encodeURIComponent(slug)}/polls/${pollPublicId}/retract`, 'POST'),
    deletePoll: (pollPublicId: string) => write(`/chat/${encodeURIComponent(slug)}/polls/${pollPublicId}`, 'DELETE'),
  };
}
