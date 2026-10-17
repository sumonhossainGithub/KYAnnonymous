import React from 'react';
import { router } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Flag, CheckCircle } from 'lucide-react';

interface ReportItem {
  public_id: string;
  target_type: string;
  target_public_id: string;
  reason: string;
  notes?: string;
  status: string;
  reporter: string;
  created_at: string;
}

interface Props {
  reports: {
    data: ReportItem[];
  };
}

export default function Reports({ reports }: Props) {
  const handleResolve = (publicId: string) => {
    router.post(`/admin/reports/${publicId}/resolve`);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-lg pb-3 border-b border-indigo-950/50">
          <Flag className="w-5 h-5" />
          <h1>Abuse Reports & Moderation Queue</h1>
        </div>

        {reports.data.length === 0 ? (
          <div className="p-8 bg-gray-900/40 border border-indigo-950/50 rounded-2xl text-center text-gray-400 text-sm">
            All reports have been addressed. The moderation queue is clear.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.data.map((r) => (
              <div
                key={r.public_id}
                className={`p-4 bg-gray-900/60 border rounded-2xl flex items-center justify-between backdrop-blur-md ${
                  r.status === 'PENDING' ? 'border-amber-500/40 bg-amber-950/10' : 'border-indigo-950/60'
                }`}
              >
                <div>
                  <div className="flex items-center space-x-2 text-xs text-gray-400 mb-1">
                    <span className="px-2 py-0.5 bg-red-950/80 text-red-300 font-semibold rounded text-[10px]">
                      {r.reason}
                    </span>
                    <span>Target: {r.target_type} ({r.target_public_id})</span>
                    <span>•</span>
                    <span>Reported by @{r.reporter}</span>
                    <span>•</span>
                    <span>{r.created_at}</span>
                  </div>
                  {r.notes && <p className="text-xs text-gray-300 mt-1 italic">"{r.notes}"</p>}
                </div>

                {r.status === 'PENDING' && (
                  <button
                    onClick={() => handleResolve(r.public_id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition flex items-center space-x-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark Resolved</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
