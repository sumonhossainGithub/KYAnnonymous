import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format message timestamp in 12-hour format with AM/PM.
 * If 24 hours or older: Date and 12-hour time (e.g. "Oct 18, 4:30 PM").
 * If within 24 hours: 12-hour time only (e.g. "4:30 PM").
 */
export function formatMessageTime(rawTimestamp?: number, fallbackStr?: string): string {
  if (!rawTimestamp) {
    return fallbackStr || '';
  }

  const date = new Date(rawTimestamp * 1000);
  const now = Date.now();
  const diffHours = (now - date.getTime()) / (1000 * 60 * 60);

  const timeStr = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (diffHours < 24) {
    return timeStr;
  }

  const isCurrentYear = date.getFullYear() === new Date().getFullYear();
  const dateStr = date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    ...(isCurrentYear ? {} : { year: 'numeric' }),
  });

  return `${dateStr}, ${timeStr}`;
}
