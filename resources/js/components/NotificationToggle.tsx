import { useState, useCallback, useEffect } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';

interface NotificationToggleProps {
  onToggle: (enabled: boolean) => void;
}

export default function NotificationToggle({ onToggle }: NotificationToggleProps) {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('ky_notifications_enabled') === '1';
    } catch {
      return false;
    }
  });
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof Notification === 'undefined') return 'denied';
    return Notification.permission;
  });

  // Sync notification state on mount
  useEffect(() => {
    if (enabled && permission === 'granted') {
      onToggle(true);
    }
  }, []);

  const handleToggle = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      alert('Your browser does not support notifications.');
      return;
    }

    if (!enabled) {
      // Turning ON
      let perm = Notification.permission;
      if (perm === 'default') {
        perm = await Notification.requestPermission();
        setPermission(perm);
      }
      if (perm === 'granted') {
        setEnabled(true);
        onToggle(true);
        try { localStorage.setItem('ky_notifications_enabled', '1'); } catch {}
        // Show a test notification
        try {
          const notif = new Notification('Notifications Enabled 🔔', {
            body: 'You will receive message alerts even when minimized.',
            tag: 'ky-notif-test',
            silent: true,
          });
          setTimeout(() => notif.close(), 3000);
        } catch {}
      } else if (perm === 'denied') {
        alert('Notification permission was denied. Please allow notifications in your browser settings.');
      }
    } else {
      // Turning OFF
      setEnabled(false);
      onToggle(false);
      try { localStorage.setItem('ky_notifications_enabled', '0'); } catch {}
    }
  }, [enabled, onToggle]);

  const Icon = enabled ? BellRing : permission === 'denied' ? BellOff : Bell;

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono transition border flex-shrink-0 whitespace-nowrap cursor-pointer ${
        enabled
          ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
          : permission === 'denied'
          ? 'bg-slate-900/60 border-rose-500/30 text-rose-400 cursor-not-allowed'
          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-emerald-300 hover:border-emerald-500/40'
      }`}
      title={
        enabled
          ? 'Notifications ON – Click to turn off'
          : permission === 'denied'
          ? 'Notifications blocked – Allow in browser settings'
          : 'Turn on notifications to receive alerts even when minimized'
      }
    >
      <Icon size={11} className="flex-shrink-0" />
      <span className="text-[9px]">{enabled ? 'ON' : 'Notify'}</span>
    </button>
  );
}
