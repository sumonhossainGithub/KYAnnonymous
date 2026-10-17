import React from 'react';
import AppLayout from '@/layouts/AppLayout';
import { ShieldAlert } from 'lucide-react';

interface SecurityItem {
  id: number;
  event_type: string;
  pseudonymous_digest?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

interface Props {
  events: {
    data: SecurityItem[];
  };
}

export default function SecurityEvents({ events }: Props) {
  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-lg pb-3 border-b border-indigo-950/50">
          <ShieldAlert className="w-5 h-5" />
          <h1>Security Events (Rate Limits & Throttling)</h1>
        </div>

        <p className="text-xs text-gray-400 md:hidden">Swipe the table to see all columns.</p>
        <div role="region" aria-label="Security events table" tabIndex={0} className="overflow-x-auto bg-gray-900/60 border border-indigo-950/70 rounded-2xl backdrop-blur-md">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-950/80 text-gray-400 uppercase font-semibold border-b border-indigo-950/50">
              <tr>
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Event</th>
                <th className="p-3.5">Pseudonymous HMAC Digest (No Raw IP)</th>
                <th className="p-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-950/40">
              {events.data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-500">
                    No security anomalies or rate-limit violations recorded.
                  </td>
                </tr>
              ) : (
                events.data.map((e) => (
                  <tr key={e.id} className="hover:bg-indigo-950/20 transition">
                    <td className="p-3.5 text-gray-500">#{e.id}</td>
                    <td className="p-3.5 font-mono text-amber-400">{e.event_type}</td>
                    <td className="p-3.5 font-mono text-[10px] text-gray-400 select-all">
                      {e.pseudonymous_digest || 'n/a'}
                    </td>
                    <td className="p-3.5 text-gray-400">{e.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
