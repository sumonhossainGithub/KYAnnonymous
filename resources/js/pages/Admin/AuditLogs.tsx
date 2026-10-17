import React from 'react';
import AppLayout from '@/layouts/AppLayout';
import { FileText } from 'lucide-react';

interface LogItem {
  id: number;
  action: string;
  target_type: string;
  target_public_id: string;
  safe_metadata?: Record<string, unknown>;
  admin: string;
  created_at: string;
}

interface Props {
  logs: {
    data: LogItem[];
  };
}

export default function AuditLogs({ logs }: Props) {
  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-lg pb-3 border-b border-indigo-950/50">
          <FileText className="w-5 h-5" />
          <h1>Administrative Audit Logs</h1>
        </div>

        <p className="text-xs text-gray-400">
          Immutable log of administrative operations. Contains zero sensitive application credentials or raw IP addresses (§27).
        </p>

        <p className="text-xs text-gray-400 md:hidden">Swipe the table to see all columns.</p>
        <div role="region" aria-label="Audit logs table" tabIndex={0} className="overflow-x-auto bg-gray-900/60 border border-indigo-950/70 rounded-2xl backdrop-blur-md">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-950/80 text-gray-400 uppercase font-semibold border-b border-indigo-950/50">
              <tr>
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Admin</th>
                <th className="p-3.5">Target</th>
                <th className="p-3.5">Metadata</th>
                <th className="p-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-950/40">
              {logs.data.map((l) => (
                <tr key={l.id} className="hover:bg-indigo-950/20 transition">
                  <td className="p-3.5 text-gray-500">#{l.id}</td>
                  <td className="p-3.5 font-mono text-indigo-300 font-bold">{l.action}</td>
                  <td className="p-3.5 text-gray-200">@{l.admin}</td>
                  <td className="p-3.5 text-gray-400">{l.target_type} ({l.target_public_id || 'n/a'})</td>
                  <td className="p-3.5 font-mono text-[10px] text-gray-500">
                    {l.safe_metadata ? JSON.stringify(l.safe_metadata) : '-'}
                  </td>
                  <td className="p-3.5 text-gray-400">{l.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
