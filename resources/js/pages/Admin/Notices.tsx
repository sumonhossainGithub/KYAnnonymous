import React from 'react';
import { useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Bell, Plus } from 'lucide-react';

interface NoticeItem {
  public_id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
}

interface OrgOption {
  public_id: string;
  name: string;
}

interface Props {
  notices: NoticeItem[];
  organizations: OrgOption[];
}

export default function Notices({ notices, organizations }: Props) {
  const { data, setData, post, processing, reset, errors } = useForm({
    title: '',
    body: '',
    pinned: false,
    organization_public_id: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/admin/notices', {
      onSuccess: () => reset(),
    });
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Publish Notice Form */}
        <div className="p-5 bg-gray-900/60 border border-indigo-950/70 rounded-2xl backdrop-blur-md">
          <h2 className="text-base font-bold text-gray-100 mb-4 flex items-center space-x-1.5">
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Publish Notice</span>
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Title</label>
              <input
                type="text"
                required
                value={data.title}
                onChange={(e) => setData('title', e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-950 border border-indigo-950 rounded-xl text-xs text-gray-100"
              />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
            </div>

            {organizations.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Target Organization</label>
                <select
                  value={data.organization_public_id}
                  onChange={(e) => setData('organization_public_id', e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-950 border border-indigo-950 rounded-xl text-xs text-gray-100"
                >
                  <option value="">Global Notice</option>
                  {organizations.map((org) => (
                    <option key={org.public_id} value={org.public_id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Notice Body</label>
              <textarea
                rows={4}
                required
                value={data.body}
                onChange={(e) => setData('body', e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-950 border border-indigo-950 rounded-xl text-xs text-gray-100"
              />
              {errors.body && <p className="text-red-400 text-xs mt-1">{errors.body}</p>}
            </div>

            <label className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={data.pinned}
                onChange={(e) => setData('pinned', e.target.checked)}
                className="accent-indigo-500 rounded"
              />
              <span>Pin to top of feed</span>
            </label>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
            >
              Publish Notice
            </button>
          </form>
        </div>

        {/* Existing Notices */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-lg pb-3 border-b border-indigo-950/50">
            <Bell className="w-5 h-5" />
            <h1>Published Notices</h1>
          </div>

          {notices.length === 0 ? (
            <p className="text-xs text-gray-500 py-6">No notices published yet.</p>
          ) : (
            notices.map((n) => (
              <div
                key={n.public_id}
                className="p-4 bg-gray-900/60 border border-indigo-950/60 rounded-xl space-y-1 backdrop-blur-md"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-200 text-sm">{n.title}</h3>
                  {n.pinned && (
                    <span className="text-[10px] bg-indigo-900 text-indigo-200 px-2 py-0.5 rounded font-semibold">
                      Pinned
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{n.body}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
