import { useId, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Maximize2, Minimize2, ArrowUpRight, Radio } from 'lucide-react';
import type { ChatRoomSummary } from '@/types';

const positions = [[166, 160], [438, 115], [482, 310], [196, 354], [330, 390], [332, 64]];
const colors = ['#38bdf8', '#34d399', '#818cf8', '#22d3ee', '#a78bfa', '#4ade80'];

export default function UniverseMap({ rooms, compact = false }: { rooms: ChatRoomSummary[]; compact?: boolean }) {
  const id = useId().replaceAll(':', '');
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`universe-map ${compact ? 'compact' : ''} ${expanded ? 'expanded' : ''}`}>
      <div className="map-heading">
        <span className="flex items-center gap-2 font-mono text-[11px] text-cyan-400">
          <span className="status-dot animate-ping" />
          <Radio className="w-3.5 h-3.5" />
          <span>LIVE CHAT ROOMS · CLICK TO JOIN</span>
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label={expanded ? 'Collapse room map' : 'Expand room map'}
          aria-pressed={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>

      <svg viewBox="0 0 640 460" role="img" aria-label="A futuristic decentralized mesh network of anonymous chat relays">
        <defs>
          <radialGradient id={`${id}-glow`}>
            <stop stopColor="#0284c7" stopOpacity=".22" />
            <stop offset="1" stopColor="#082f49" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-core`} cx="30%" cy="20%">
            <stop stopColor="#38bdf8" />
            <stop offset=".4" stopColor="#0284c7" />
            <stop offset=".8" stopColor="#032541" />
            <stop offset="1" stopColor="#020d18" />
          </radialGradient>
          <linearGradient id={`${id}-line`}>
            <stop stopColor="#38bdf8" stopOpacity=".7" />
            <stop offset="1" stopColor="#34d399" stopOpacity=".25" />
          </linearGradient>
        </defs>

        {/* Radar Background & Sweeps */}
        <circle cx="320" cy="230" r="223" fill={`url(#${id}-glow)`} />
        
        {/* Concentric Cyber Rings */}
        <g className="orbit-globe" fill="none" stroke="#0284c7" strokeWidth=".7" opacity=".4">
          <circle cx="320" cy="230" r="70" strokeDasharray="3 4" />
          <circle cx="320" cy="230" r="145" />
          <circle cx="320" cy="230" r="215" strokeDasharray="2 6" />
          {/* Crosshair Lines */}
          <line x1="105" y1="230" x2="535" y2="230" stroke="#0369a1" strokeWidth=".5" opacity=".3" />
          <line x1="320" y1="15" x2="320" y2="445" stroke="#0369a1" strokeWidth=".5" opacity=".3" />
        </g>

        {/* Constellation Grid Points */}
        {Array.from({ length: 64 }, (_, i) => {
          const angle = i * 2.39996;
          const radius = Math.sqrt(i / 64) * 165;
          return (
            <circle
              key={i}
              cx={320 + Math.cos(angle) * radius}
              cy={230 + Math.sin(angle) * radius}
              r={i % 6 === 0 ? 1.5 : 0.7}
              fill={i % 3 === 0 ? '#38bdf8' : '#34d399'}
              opacity={i % 6 === 0 ? 0.7 : 0.25}
              className="map-star"
              style={{ animationDelay: `${i % 8}s` }}
            />
          );
        })}

        {/* Mesh Data Channels */}
        <g fill="none" stroke={`url(#${id}-line)`} strokeWidth="1">
          {rooms.slice(0, 6).map((room, i) => (
            <path
              key={room.public_id}
              d={`M 320 230 Q ${(positions[i][0] + 320) / 2 + 15} ${(positions[i][1] + 230) / 2 - 20} ${positions[i][0]} ${positions[i][1]}`}
              className="connection-line"
            />
          ))}
          {rooms.length >= 3 && (
            <path d="M 166 160 Q 312 40 438 115 L 482 310 Q 298 349 166 160" opacity=".35" strokeDasharray="3 5" />
          )}
        </g>

        {/* Core Node Hub */}
        <g className="universe-heart">
          <circle cx="320" cy="230" r="32" fill="#38bdf8" opacity=".1" className="orbit-pulse" />
          <circle cx="320" cy="230" r="19" fill={`url(#${id}-core)`} />
          <circle cx="320" cy="230" r="23" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity=".6" />
        </g>

        {/* Peripheral Chat Nodes */}
        {rooms.slice(0, 6).map((room, i) => (
          <g
            key={room.public_id}
            onClick={() => router.visit(`/chat/${room.slug}`)}
            onKeyDown={(e) => { if (e.key === 'Enter') router.visit(`/chat/${room.slug}`); }}
            className="room-node group"
            role="link"
            tabIndex={0}
            aria-label={`Connect to ${room.name}`}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={positions[i][0]}
              cy={positions[i][1]}
              r="26"
              fill={colors[i]}
              opacity=".08"
              className="orbit-pulse"
              style={{ animationDelay: `${i * -1.8}s` }}
            />
            <circle
              cx={positions[i][0]}
              cy={positions[i][1]}
              r="16"
              fill="#060c18"
              stroke={colors[i]}
              strokeWidth="1.2"
              strokeOpacity=".8"
            />
            <circle cx={positions[i][0]} cy={positions[i][1]} r="4" fill={colors[i]} />
            <text
              x={positions[i][0]}
              y={positions[i][1] + 35}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {room.name.length > 20 ? `${room.name.slice(0, 18)}…` : room.name}
            </text>
          </g>
        ))}

        <text x="320" y="278" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" letterSpacing="3">
          SAFE & ANONYMOUS HUB
        </text>
      </svg>

      <div className="map-caption font-mono text-[10px] text-slate-400">
        <span>Private & anonymous. No personal tracking.</span>
        <Link href="/chat" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1" aria-label="Explore chat rooms">
          <span>Browse All Rooms</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  );
}
