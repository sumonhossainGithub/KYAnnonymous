import React from 'react';
import { useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Building2, Plus } from 'lucide-react';

interface OrgItem {
  public_id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
}

interface Props {
  organizations: OrgItem[];
}

export default function Organizations({ organizations }: Props) {
  const { data, setData, post, processing, reset, errors } = useForm({
    name: '',
    slug: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/admin/organizations', {
      onSuccess: () => reset(),
    });
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Create Organization Form */}
        <div className="p-5 bg-gray-900/60 border border-indigo-950/70 rounded-2xl backdrop-blur-md">
          <h2 className="text-base font-bold text-gray-100 mb-4 flex items-center space-x-1.5">
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Create Organization</span>
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Name</label>
              <input
                type="text"
                required
                value={data.name}
                onChange={(e) => {
                  setData('name', e.target.value);
                  setData('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                }}
                className="w-full px-3 py-1.5 bg-gray-950 border border-indigo-950 rounded-xl text-xs text-gray-100"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Slug</label>
              <input
                type="text"
                required
                value={data.slug}
                onChange={(e) => setData('slug', e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-950 border border-indigo-950 rounded-xl text-xs text-gray-100 font-mono"
              />
              {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Description</label>
              <textarea
                rows={3}
                value={data.description}
                onChange={(e) => setData('description', e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-950 border border-indigo-950 rounded-xl text-xs text-gray-100"
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
            >
              Add Organization
            </button>
          </form>
        </div>

        {/* Existing Organizations */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-lg pb-3 border-b border-indigo-950/50">
            <Building2 className="w-5 h-5" />
            <h1>Configured Organizations</h1>
          </div>

          {organizations.length === 0 ? (
            <p className="text-xs text-gray-500 py-6">No organizations created yet. Global feed operates seamlessly without them (§12).</p>
          ) : (
            organizations.map((org) => (
              <div
                key={org.public_id}
                className="p-4 bg-gray-900/60 border border-indigo-950/60 rounded-xl flex items-center justify-between backdrop-blur-md"
              >
                <div>
                  <h3 className="font-bold text-gray-200 text-sm">{org.name}</h3>
                  <p className="text-xs text-gray-400">{org.description || 'No description provided.'}</p>
                </div>
                <span className="font-mono text-xs text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/60">
                  /{org.slug}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
