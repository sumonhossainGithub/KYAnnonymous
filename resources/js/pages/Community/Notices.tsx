import React from 'react';
import AppLayout from '@/layouts/AppLayout';
import type { Notice } from '@/types';
import { Bell } from 'lucide-react';

interface Props {
  notices: {
    data: Notice[];
  };
}

export default function Notices({ notices }: Props) {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Official Notices</h1>
          <p className="text-xs text-slate-400 mt-1">Platform updates, security notices, and community news.</p>
        </div>

        {notices.data.length === 0 ? (
          <div className="p-10 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl">
            <Bell size={24} className="text-cyan-400 mx-auto mb-2 opacity-60" />
            <h2 className="text-sm font-bold text-slate-200">No notices right now</h2>
            <p className="text-xs text-slate-500 mt-1">
              When there are announcements from admins or moderators, you will find them here.
            </p>
          </div>
        ) : (
          notices.data.map((notice) => (
            <div
              key={notice.public_id}
              className={`p-5 bg-slate-950/80 border rounded-2xl backdrop-blur-md ${
                notice.pinned ? 'border-cyan-500/50 bg-cyan-950/20' : 'border-slate-800/80'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {notice.pinned && (
                  <span className="px-2 py-0.5 bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded text-[10px] font-mono font-bold">
                    PINNED
                  </span>
                )}
                <h2 className="text-base font-bold text-slate-100">{notice.title}</h2>
                <span className="text-xs text-slate-500 font-mono">• {notice.created_at}</span>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed font-sans">{notice.body}</p>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
