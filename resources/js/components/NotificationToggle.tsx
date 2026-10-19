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
      className={`strip-notify-btn inline-flex items-center gap-1 px-1 py-0 rounded text-[8.5px] font-mono transition flex-shrink-0 whitespace-nowrap cursor-pointer ${
        enabled
          ? 'text-emerald-300 hover:text-emerald-200'
          : permission === 'denied'
          ? 'text-rose-400/80 cursor-not-allowed'
          : 'text-slate-400 hover:text-emerald-300'
      }`}
      style={{ minHeight: 'unset', minWidth: 'unset', height: '16px', lineHeight: '16px', background: 'transparent', border: 'none' }}
      title={
        enabled
          ? 'Notifications ON – Click to turn off'
          : permission === 'denied'
          ? 'Notifications blocked – Allow in browser settings'
          : 'Turn on notifications'
      }
    >
      <Icon size={10} className="flex-shrink-0" />
      <span className="text-[8.5px] leading-none tracking-tight">{enabled ? 'Notify ON' : 'Notify'}</span>
    </button>
  );
}
