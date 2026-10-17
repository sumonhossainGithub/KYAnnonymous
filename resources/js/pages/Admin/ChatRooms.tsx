import React from 'react';
import { router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { MessageSquare, Lock, Unlock, Trash2, ArrowLeft } from 'lucide-react';

interface ChatRoomItem {
  public_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  messages_count: number;
  created_at: string;
}

interface Props {
  rooms: ChatRoomItem[];
}

export default function ChatRooms({ rooms }: Props) {
  const handleToggleStatus = (publicId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'close' : 'open';
    if (confirm(`Are you sure you want to ${action} this chat room?`)) {
      router.post(`/admin/chat-rooms/${publicId}/toggle-status`, {}, { preserveScroll: true });
    }
  };

  const handlePurgeMessages = (publicId: string, name: string) => {
    if (confirm(`Warning: This will permanently delete ALL messages in room "${name}". Proceed?`)) {
      router.post(`/admin/chat-rooms/${publicId}/purge`, {}, { preserveScroll: true });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cyan-950/40">
          <div className="flex items-center space-x-3">
            <Link href="/admin/dashboard" className="p-2 bg-slate-900 border border-cyan-900/50 hover:border-cyan-400 rounded-lg text-cyan-400 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-wider text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                <span>MANAGE CHAT ROOMS</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Close or open chat rooms, view conversations, and delete room messages
              </p>
            </div>
          </div>
        </div>

        {/* Chat Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div
              key={room.public_id}
              className={`p-5 rounded-xl border backdrop-blur-md transition flex flex-col justify-between ${
                room.is_active
                  ? 'bg-slate-950/80 border-cyan-950/80 hover:border-cyan-500/40'
                  : 'bg-rose-950/20 border-rose-900/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      room.is_active
                        ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                        : 'bg-rose-950 border border-rose-800 text-rose-300'
                    }`}
                  >
                    {room.is_active ? '● ACTIVE ROOM' : '■ CLOSED / PAUSED'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {room.messages_count} msgs
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-100 tracking-wide mb-1">
                  {room.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 font-sans">
                  {room.description || 'Public chat room.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-900 flex items-center justify-between gap-2">
                <Link
                  href={`/chat/${room.slug}`}
                  className="text-xs font-mono text-cyan-400 hover:underline"
                >
                  Open Room →
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(room.public_id, room.is_active)}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-white transition"
                    title={room.is_active ? 'Close room' : 'Open room'}
                  >
                    {room.is_active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePurgeMessages(room.public_id, room.name)}
                    className="px-2 py-1.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 rounded text-rose-300 text-xs font-mono transition flex items-center gap-1"
                    title="Delete all messages in this room"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Messages</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
