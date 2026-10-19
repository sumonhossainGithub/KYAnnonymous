import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

export interface ButterflyFlightInstance {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  controlX1: number;
  controlY1: number;
  controlX2: number;
  controlY2: number;
  palette: ButterflyPalette;
  onLanded?: () => void;
}

export interface GardenButterflyRef {
  flyTo: (targetRect: DOMRect, onLanded?: () => void) => void;
}

interface ButterflyPalette {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  darkBorder: string;
  glow: string;
  trailColor: string;
}

const BUTTERFLY_PALETTES: ButterflyPalette[] = [
  {
    name: 'Emerald Swallowtail',
    primary: '#10b981',
    secondary: '#047857',
    accent: '#6ee7b7',
    darkBorder: '#022c22',
    glow: 'rgba(52, 211, 153, 0.95)',
    trailColor: '#6ee7b7',
  },
  {
    name: 'Blue Morpho',
    primary: '#0ea5e9',
    secondary: '#0369a1',
    accent: '#7dd3fc',
    darkBorder: '#082f49',
    glow: 'rgba(56, 189, 248, 0.95)',
    trailColor: '#7dd3fc',
  },
  {
    name: 'Sunset Monarch',
    primary: '#f59e0b',
    secondary: '#b45309',
    accent: '#fde68a',
    darkBorder: '#451a03',
    glow: 'rgba(251, 191, 36, 0.95)',
    trailColor: '#fde68a',
  },
  {
    name: 'Night Velvet Orchid',
    primary: '#a855f7',
    secondary: '#6b21a8',
    accent: '#e9d5ff',
    darkBorder: '#3b0764',
    glow: 'rgba(192, 132, 252, 0.95)',
    trailColor: '#d8b4fe',
  },
  {
    name: 'Rose Starlight',
    primary: '#f43f5e',
    secondary: '#9f1239',
    accent: '#fecdd3',
    darkBorder: '#4c0519',
    glow: 'rgba(251, 113, 133, 0.95)',
    trailColor: '#fda4af',
  },
];

export const GardenButterflyOverlay = forwardRef<GardenButterflyRef>((_, ref) => {
  const [flights, setFlights] = useState<ButterflyFlightInstance[]>([]);

  const flyTo = useCallback((targetRect: DOMRect, onLanded?: () => void) => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    // Emerge from a random place in the background garden / starry sky
    const spawnModes = ['top', 'bottom', 'left', 'right', 'deep_bg', 'deep_bg'];
    const mode = spawnModes[Math.floor(Math.random() * spawnModes.length)];

    let startX: number;
    let startY: number;

    switch (mode) {
      case 'top':
        startX = Math.random() * screenW;
        startY = -50;
        break;
      case 'bottom':
        startX = Math.random() * screenW;
        startY = screenH + 50;
        break;
      case 'left':
        startX = -50;
        startY = Math.random() * screenH;
        break;
      case 'right':
        startX = screenW + 50;
        startY = Math.random() * screenH;
        break;
      case 'deep_bg':
      default:
        // Deep within the starry background garden
        startX = Math.random() * (screenW * 0.9) + screenW * 0.05;
        startY = Math.random() * (screenH * 0.65) + screenH * 0.1;
        break;
    }

    // Fly to above the message corner, never blocking the text
    const targetX = targetRect.right - 8;
    const targetY = Math.max(10, targetRect.top - 28);

    // Organic curving bezier flight path across the sky with natural swoops
    const midX = (startX + targetX) / 2 + (Math.random() - 0.5) * 200;
    const midY = (startY + targetY) / 2 + (Math.random() - 0.5) * 140;

    const controlX1 = startX + (midX - startX) * 0.55 + (Math.random() - 0.5) * 100;
    const controlY1 = startY + (midY - startY) * 0.25 - (Math.random() * 80 + 30);
    const controlX2 = midX + (targetX - midX) * 0.65 + (Math.random() - 0.5) * 100;
    const controlY2 = targetY + (Math.random() * 60 + 20);

    const flightId = 'bf_' + Math.random().toString(36).substring(2, 9);
    const palette = BUTTERFLY_PALETTES[Math.floor(Math.random() * BUTTERFLY_PALETTES.length)];

    const instance: ButterflyFlightInstance = {
      id: flightId,
      startX,
      startY,
      targetX,
      targetY,
      controlX1,
      controlY1,
      controlX2,
      controlY2,
      palette,
      onLanded,
    };

    setFlights((prev) => [...prev, instance]);

    // Quick, smooth flight (~1600ms) that doesn't linger over the text
    setTimeout(() => {
      onLanded?.();
      setFlights((prev) => prev.filter((f) => f.id !== flightId));
    }, 1650);
  }, []);

  useImperativeHandle(ref, () => ({
    flyTo,
  }));

  if (flights.length === 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      aria-hidden="true"
    >
      {flights.map((flight) => (
        <AnimatedRealisticButterfly key={flight.id} flight={flight} />
      ))}
    </div>
  );
});

GardenButterflyOverlay.displayName = 'GardenButterflyOverlay';

// Realistic Butterfly Sprite with 3D wing-folding and organic biological flutter
function AnimatedRealisticButterfly({ flight }: { flight: ButterflyFlightInstance }) {
  const [coords, setCoords] = useState({
    x: flight.startX,
    y: flight.startY,
    angle: -45,
    scale: 0.22,
    opacity: 0,
  });
  const [trail, setTrail] = useState<Array<{ x: number; y: number; id: number; color: string }>>([]);

  useEffect(() => {
    const startTime = performance.now();
    const duration = 1600;

    let frameId: number;

    const getBezierPoint = (t: number) => {
      const u = 1 - t;
      const tt = t * t;
      const uu = u * u;
      const uuu = uu * u;
      const ttt = tt * t;

      const x = uuu * flight.startX + 3 * uu * t * flight.controlX1 + 3 * u * tt * flight.controlX2 + ttt * flight.targetX;
      const y = uuu * flight.startY + 3 * uu * t * flight.controlY1 + 3 * u * tt * flight.controlY2 + ttt * flight.targetY;
      return { x, y };
    };

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Natural ease: smooth take-off, graceful mid-flight, gentle landing
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2.2) / 2;

      const p0 = getBezierPoint(Math.max(0, eased - 0.015));
      const p1 = getBezierPoint(eased);

      // Wing flutter bobbing
      const flutterFreq = 16;
      const flapWave = Math.sin(progress * Math.PI * flutterFreq);
      const flutterAmp = (1 - progress * 0.75) * 8;
      const bobY = flapWave * flutterAmp;

      // Heading angle
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      const bankAngle = flapWave * 4;
      const angle = rawAngle + bankAngle;

      // Scale: start small, flutter around 0.9, then gracefully shrink and fade so message is never hidden
      const scale = progress < 0.2
        ? 0.22 + (progress / 0.2) * 0.68
        : progress > 0.75
          ? 0.9 - ((progress - 0.75) / 0.25) * 0.45
          : 0.9;

      // Fade in smoothly at start, fade out gracefully at landing so text remains 100% visible
      const opacity = progress < 0.12
        ? progress / 0.12
        : progress > 0.75
          ? Math.max(0, 1 - (progress - 0.75) / 0.25)
          : 1;

      setCoords({
        x: p1.x,
        y: p1.y + bobY,
        angle,
        scale,
        opacity,
      });

      // Shed glowing stardust motes behind fluttering wings
      if (Math.random() > 0.45 && progress < 0.94) {
        setTrail((prev) => [
          ...prev.slice(-14),
          {
            x: p1.x + (Math.random() - 0.5) * 16,
            y: p1.y + bobY + (Math.random() - 0.5) * 16,
            id: now,
            color: flight.palette.accent,
          },
        ]);
      }

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [flight]);

  const p = flight.palette;

  return (
    <>
      {/* Luminous stardust trail left in the night air */}
      {trail.map((mote) => (
        <span
          key={mote.id}
          className="absolute w-2 h-2 rounded-full pointer-events-none animate-ping"
          style={{
            left: `${mote.x}px`,
            top: `${mote.y}px`,
            backgroundColor: mote.color,
            boxShadow: `0 0 10px ${p.glow}`,
            opacity: 0.75,
          }}
        />
      ))}

      {/* Realistic 3D Butterfly Container */}
      <div
        className="absolute pointer-events-none transition-transform will-change-transform"
        style={{
          left: `${coords.x}px`,
          top: `${coords.y}px`,
          transform: `translate(-50%, -50%) rotate(${coords.angle}deg) scale(${coords.scale})`,
          filter: `drop-shadow(0 0 16px ${p.glow}) drop-shadow(0 0 6px ${p.primary})`,
          opacity: coords.opacity,
          perspective: '800px',
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          <svg
            width="64"
            height="56"
            viewBox="-52 -45 104 90"
            fill="none"
            className="overflow-visible select-none"
          >
            <defs>
              {/* Forewing Gradient - Rich velvet sheen */}
              <linearGradient id={`gradFW_${flight.id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={p.accent} />
                <stop offset="45%" stopColor={p.primary} />
                <stop offset="90%" stopColor={p.secondary} />
                <stop offset="100%" stopColor={p.darkBorder} />
              </linearGradient>

              {/* Hindwing Gradient */}
              <linearGradient id={`gradHW_${flight.id}`} x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor={p.accent} stopOpacity="0.95" />
                <stop offset="50%" stopColor={p.primary} />
                <stop offset="85%" stopColor={p.secondary} />
                <stop offset="100%" stopColor={p.darkBorder} />
              </linearGradient>

              {/* Body Gradient */}
              <linearGradient id={`gradBody_${flight.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="35%" stopColor="#0f172a" />
                <stop offset="70%" stopColor="#020617" />
                <stop offset="100%" stopColor="#000000" />
              </linearGradient>
            </defs>

            {/* LEFT WINGS GROUP - Realistic 3D Flap */}
            <g className="animate-realWingFlapLeft">
              {/* Left Forewing (Upper Wing) */}
              <path
                d="M 0 -6 C -10 -24, -30 -35, -46 -27 C -50 -17, -46 -3, -33 5 C -20 8, -6 2, 0 -2 Z"
                fill={`url(#gradFW_${flight.id})`}
                stroke={p.darkBorder}
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              {/* Left Hindwing (Lower Wing with delicate swallowtail curve) */}
              <path
                d="M 0 -2 C -14 3, -34 10, -30 24 C -26 34, -13 36, -3 24 C -1 18, -0.5 8, 0 4 Z"
                fill={`url(#gradHW_${flight.id})`}
                stroke={p.darkBorder}
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {/* Left Wing Delicate Vein Pattern */}
              <path d="M 0 -5 Q -22 -15 -42 -22" stroke={p.darkBorder} strokeWidth="1.2" strokeOpacity="0.75" fill="none" />
              <path d="M -18 -12 Q -30 -6 -40 -3" stroke={p.darkBorder} strokeWidth="1" strokeOpacity="0.7" fill="none" />
              <path d="M -14 -6 Q -24 3 -30 5" stroke={p.darkBorder} strokeWidth="0.9" strokeOpacity="0.7" fill="none" />
              <path d="M 0 0 Q -16 12 -25 24" stroke={p.darkBorder} strokeWidth="1.1" strokeOpacity="0.75" fill="none" />
              <path d="M -12 10 Q -18 20 -15 28" stroke={p.darkBorder} strokeWidth="0.9" strokeOpacity="0.7" fill="none" />

              {/* Left Wing Starlight Marginal Dots */}
              <circle cx="-44" cy="-24" r="1.2" fill="#ffffff" opacity="0.9" />
              <circle cx="-48" cy="-17" r="1.2" fill="#ffffff" opacity="0.9" />
              <circle cx="-47" cy="-9" r="1.1" fill="#ffffff" opacity="0.85" />
              <circle cx="-42" cy="-2" r="1.1" fill="#ffffff" opacity="0.85" />
              <circle cx="-28" cy="24" r="1.1" fill="#ffffff" opacity="0.9" />
              <circle cx="-22" cy="30" r="1.1" fill="#ffffff" opacity="0.9" />
              <circle cx="-13" cy="32" r="1" fill="#ffffff" opacity="0.85" />
            </g>

            {/* RIGHT WINGS GROUP - Realistic 3D Flap */}
            <g className="animate-realWingFlapRight">
              {/* Right Forewing (Upper Wing) */}
              <path
                d="M 0 -6 C 10 -24, 30 -35, 46 -27 C 50 -17, 46 -3, 33 5 C 20 8, 6 2, 0 -2 Z"
                fill={`url(#gradFW_${flight.id})`}
                stroke={p.darkBorder}
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              {/* Right Hindwing (Lower Wing) */}
              <path
                d="M 0 -2 C 14 3, 34 10, 30 24 C 26 34, 13 36, 3 24 C 1 18, 0.5 8, 0 4 Z"
                fill={`url(#gradHW_${flight.id})`}
                stroke={p.darkBorder}
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {/* Right Wing Delicate Vein Pattern */}
              <path d="M 0 -5 Q 22 -15 42 -22" stroke={p.darkBorder} strokeWidth="1.2" strokeOpacity="0.75" fill="none" />
              <path d="M 18 -12 Q 30 -6 40 -3" stroke={p.darkBorder} strokeWidth="1" strokeOpacity="0.7" fill="none" />
              <path d="M 14 -6 Q 24 3 30 5" stroke={p.darkBorder} strokeWidth="0.9" strokeOpacity="0.7" fill="none" />
              <path d="M 0 0 Q 16 12 25 24" stroke={p.darkBorder} strokeWidth="1.1" strokeOpacity="0.75" fill="none" />
              <path d="M 12 10 Q 18 20 15 28" stroke={p.darkBorder} strokeWidth="0.9" strokeOpacity="0.7" fill="none" />

              {/* Right Wing Starlight Marginal Dots */}
              <circle cx="44" cy="-24" r="1.2" fill="#ffffff" opacity="0.9" />
              <circle cx="48" cy="-17" r="1.2" fill="#ffffff" opacity="0.9" />
              <circle cx="47" cy="-9" r="1.1" fill="#ffffff" opacity="0.85" />
              <circle cx="42" cy="-2" r="1.1" fill="#ffffff" opacity="0.85" />
              <circle cx="28" cy="24" r="1.1" fill="#ffffff" opacity="0.9" />
              <circle cx="22" cy="30" r="1.1" fill="#ffffff" opacity="0.9" />
              <circle cx="13" cy="32" r="1" fill="#ffffff" opacity="0.85" />
            </g>

            {/* REALISTIC BUTTERFLY BODY & ANTENNAE */}
            <g id="butterflyBody">
              {/* Segmented Abdomen */}
              <path
                d="M -2.2 -4 C -2.5 5, -2 15, 0 22 C 2 15, 2.5 5, 2.2 -4 Z"
                fill={`url(#gradBody_${flight.id})`}
                stroke="#0f172a"
                strokeWidth="0.5"
              />
              {/* Abdominal segments highlights */}
              <line x1="-1.8" y1="2" x2="1.8" y2="2" stroke="#475569" strokeWidth="0.6" strokeLinecap="round" />
              <line x1="-1.6" y1="7" x2="1.6" y2="7" stroke="#475569" strokeWidth="0.6" strokeLinecap="round" />
              <line x1="-1.3" y1="12" x2="1.3" y2="12" stroke="#475569" strokeWidth="0.6" strokeLinecap="round" />
              <line x1="-0.9" y1="17" x2="0.9" y2="17" stroke="#475569" strokeWidth="0.6" strokeLinecap="round" />

              {/* Thorax */}
              <ellipse cx="0" cy="-6" rx="3.2" ry="5.5" fill="#0f172a" />
              <ellipse cx="0" cy="-6" rx="2.4" ry="4.2" fill="#1e293b" />

              {/* Head with compound eyes */}
              <circle cx="0" cy="-13" r="2.8" fill="#0f172a" />
              <circle cx="-1.8" cy="-13.5" r="1" fill="#020617" />
              <circle cx="1.8" cy="-13.5" r="1" fill="#020617" />

              {/* Antennae with delicate curved tips */}
              <path
                d="M -0.8 -14.5 Q -6 -24 -13 -27"
                stroke="#cbd5e1"
                strokeWidth="0.9"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="-13.5" cy="-27.5" r="1.3" fill="#f8fafc" />

              <path
                d="M 0.8 -14.5 Q 6 -24 13 -27"
                stroke="#cbd5e1"
                strokeWidth="0.9"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="13.5" cy="-27.5" r="1.3" fill="#f8fafc" />
            </g>
          </svg>
        </div>
      </div>
    </>
  );
}

export default GardenButterflyOverlay;
