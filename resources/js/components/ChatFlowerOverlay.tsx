import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useId, useRef } from 'react';

export interface ChatFlowerRef {
  bloomAt: (x: number, y: number) => void;
}

interface AmbientFlower {
  id: number;
  left: number; // 0 to 100%
  top: number; // 0 to 100%
  size: number;
  type: 'sakura' | 'petal' | 'lotus' | 'jasmine';
  color: string;
  glow: string;
  duration: number; // seconds
  delay: number; // seconds
}

interface BloomFlowerInstance {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  type: 'sakura' | 'petal' | 'lotus' | 'jasmine';
  color: string;
  glow: string;
  rotation: number;
}

const FLOWER_PALETTES = [
  { color: '#f472b6', glow: 'rgba(244, 114, 182, 0.65)' }, // Sakura Pink
  { color: '#fb7185', glow: 'rgba(251, 113, 133, 0.65)' }, // Rose Blossom
  { color: '#c084fc', glow: 'rgba(192, 132, 252, 0.65)' }, // Lavender Violet
  { color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.65)' },  // Cyan Starlight
  { color: '#34d399', glow: 'rgba(52, 211, 153, 0.65)' },  // Emerald Mint
  { color: '#facc15', glow: 'rgba(250, 204, 21, 0.65)' },  // Golden Jasmine
];

const FLOWER_TYPES: Array<'sakura' | 'petal' | 'lotus' | 'jasmine'> = ['sakura', 'petal', 'lotus', 'jasmine'];

export const ChatFlowerOverlay = forwardRef<ChatFlowerRef>((_, ref) => {
  const uid = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [ambientFlowers, setAmbientFlowers] = useState<AmbientFlower[]>([]);
  const [blooms, setBlooms] = useState<BloomFlowerInstance[]>([]);

  // Generate ambient floating & fading flowers on mount
  useEffect(() => {
    const list: AmbientFlower[] = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const palette = FLOWER_PALETTES[i % FLOWER_PALETTES.length];
      const type = FLOWER_TYPES[i % FLOWER_TYPES.length];
      list.push({
        id: i,
        left: Math.random() * 92 + 4,
        top: Math.random() * 90 + 5,
        size: Math.floor(Math.random() * 14) + 14, // 14px to 28px
        type,
        color: palette.color,
        glow: palette.glow,
        duration: Math.random() * 6 + 9, // 9s to 15s gentle float
        delay: Math.random() * 8, // staggered entrance
      });
    }
    setAmbientFlowers(list);
  }, []);

  const bloomAt = useCallback((screenX: number, screenY: number) => {
    let x = screenX;
    let y = screenY;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      x = screenX - rect.left;
      y = screenY - rect.top;
    }

    const newBlooms: BloomFlowerInstance[] = [];
    const count = Math.floor(Math.random() * 3) + 4; // 4 to 6 blooming flowers

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const dist = Math.random() * 45 + 25;
      const palette = FLOWER_PALETTES[Math.floor(Math.random() * FLOWER_PALETTES.length)];
      const type = FLOWER_TYPES[Math.floor(Math.random() * FLOWER_TYPES.length)];

      newBlooms.push({
        id: 'flw_' + Math.random().toString(36).substring(2, 9),
        x,
        y,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 15,
        size: Math.random() * 12 + 16,
        type,
        color: palette.color,
        glow: palette.glow,
        rotation: Math.random() * 360,
      });
    }

    setBlooms((prev) => [...prev, ...newBlooms]);

    setTimeout(() => {
      const idsToRemove = new Set(newBlooms.map((b) => b.id));
      setBlooms((prev) => prev.filter((b) => !idsToRemove.has(b.id)));
    }, 2800);
  }, []);

  useImperativeHandle(ref, () => ({
    bloomAt,
  }));

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden z-0"
      style={{ contain: 'paint' }}
      aria-hidden="true"
    >
      {/* SVG Definitions for Gradients & Petal Patterns */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>

      {/* Ambient background fading flowers drifting in the chatbox */}
      {ambientFlowers.map((flower) => (
        <div
          key={flower.id}
          className="absolute chat-flower-ambient"
          style={{
            left: `${flower.left}%`,
            top: `${flower.top}%`,
            width: `${flower.size}px`,
            height: `${flower.size}px`,
            animation: `chatFlowerFadeDrift ${flower.duration}s ease-in-out infinite`,
            animationDelay: `${flower.delay}s`,
            filter: `drop-shadow(0 0 8px ${flower.glow})`,
          }}
        >
          <FlowerSVG type={flower.type} color={flower.color} size={flower.size} />
        </div>
      ))}

      {/* Interactive blossoming flowers that bloom and fade */}
      {blooms.map((bloom) => (
        <div
          key={bloom.id}
          className="absolute chat-flower-bloom"
          style={{
            left: `${bloom.x}px`,
            top: `${bloom.y}px`,
            width: `${bloom.size}px`,
            height: `${bloom.size}px`,
            '--bloom-dx': `${bloom.dx}px`,
            '--bloom-dy': `${bloom.dy}px`,
            '--bloom-rot': `${bloom.rotation}deg`,
            filter: `drop-shadow(0 0 10px ${bloom.glow})`,
          } as React.CSSProperties}
        >
          <FlowerSVG type={bloom.type} color={bloom.color} size={bloom.size} />
        </div>
      ))}
    </div>
  );
});

ChatFlowerOverlay.displayName = 'ChatFlowerOverlay';

function FlowerSVG({
  type,
  color,
  size,
}: {
  type: 'sakura' | 'petal' | 'lotus' | 'jasmine';
  color: string;
  size: number;
}) {
  switch (type) {
    case 'sakura':
      // 5-Petal Japanese Cherry Blossom with central stamen
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
          <g transform="translate(20,20)">
            {[0, 72, 144, 216, 288].map((rot, i) => (
              <path
                key={i}
                d="M 0 0 C -5 -9 -8 -16 0 -19 C 8 -16 5 -9 0 0 Z"
                fill={color}
                opacity="0.88"
                transform={`rotate(${rot})`}
              />
            ))}
            {/* Center Core */}
            <circle cx="0" cy="0" r="3.2" fill="#fff" opacity="0.9" />
            <circle cx="0" cy="0" r="1.8" fill="#fde047" />
          </g>
        </svg>
      );

    case 'lotus':
      // Graceful pointed Lotus flower
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
          <g transform="translate(20,20)">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((rot, i) => (
              <path
                key={i}
                d="M 0 0 C -4 -7 -7 -14 0 -18 C 7 -14 4 -7 0 0 Z"
                fill={color}
                opacity={i % 2 === 0 ? '0.9' : '0.65'}
                transform={`rotate(${rot})`}
              />
            ))}
            <circle cx="0" cy="0" r="3" fill="#ffffff" />
            <circle cx="0" cy="0" r="1.5" fill="#fef08a" />
          </g>
        </svg>
      );

    case 'jasmine':
      // 4-star delicate Jasmine blossom
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
          <g transform="translate(20,20)">
            {[0, 90, 180, 270].map((rot, i) => (
              <path
                key={i}
                d="M 0 0 C -6 -6 -8 -13 0 -17 C 8 -13 6 -6 0 0 Z"
                fill={color}
                opacity="0.85"
                transform={`rotate(${rot})`}
              />
            ))}
            <circle cx="0" cy="0" r="2.8" fill="#fff" />
            <circle cx="0" cy="0" r="1.4" fill="#f59e0b" />
          </g>
        </svg>
      );

    case 'petal':
    default:
      // Single curved floating petal with gentle fold
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
          <path
            d="M 8 26 C 6 12 16 4 28 6 C 36 18 28 32 14 34 C 10 33 8 30 8 26 Z"
            fill={color}
            opacity="0.82"
          />
          <path
            d="M 12 24 C 14 16 22 10 26 8"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export default ChatFlowerOverlay;
