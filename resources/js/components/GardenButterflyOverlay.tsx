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
  colorScheme: string;
  onLanded?: () => void;
}

export interface GardenButterflyRef {
  flyTo: (targetRect: DOMRect, onLanded?: () => void) => void;
}

const BUTTERFLY_PALETTES = [
  { primary: '#34d399', secondary: '#10b981', glow: 'rgba(52, 211, 153, 0.8)' }, // Emerald Moon
  { primary: '#38bdf8', secondary: '#0284c7', glow: 'rgba(56, 189, 248, 0.8)' }, // Celestial Cyan
  { primary: '#facc15', secondary: '#eab308', glow: 'rgba(250, 204, 21, 0.8)' }, // Golden Firefly
  { primary: '#c084fc', secondary: '#9333ea', glow: 'rgba(192, 132, 252, 0.8)' }, // Night Orchid
];

export const GardenButterflyOverlay = forwardRef<GardenButterflyRef>((_, ref) => {
  const [flights, setFlights] = useState<ButterflyFlightInstance[]>([]);

  const flyTo = useCallback((targetRect: DOMRect, onLanded?: () => void) => {
    // Spawn from outside/behind the chatbox in the garden (below or side of screen)
    const fromBottom = Math.random() > 0.3;
    const startX = fromBottom
      ? Math.max(20, Math.min(window.innerWidth - 20, targetRect.left + (Math.random() - 0.5) * 300))
      : Math.random() < 0.5 ? -50 : window.innerWidth + 50;
    const startY = fromBottom ? window.innerHeight + 40 : window.innerHeight * 0.7;

    const targetX = targetRect.left + (targetRect.width > 60 ? targetRect.width - 24 : targetRect.width / 2);
    const targetY = targetRect.top - 8;

    // Organic curving bezier flight path from garden to message
    const midX = (startX + targetX) / 2 + (Math.random() - 0.5) * 160;
    const midY = (startY + targetY) / 2 + (Math.random() - 0.5) * 100;

    const controlX1 = startX + (midX - startX) * 0.6 + (Math.random() - 0.5) * 80;
    const controlY1 = startY - 120;
    const controlX2 = midX + (targetX - midX) * 0.6 + (Math.random() - 0.5) * 80;
    const controlY2 = targetY + 60;

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
      colorScheme: palette.glow,
      onLanded,
    };

    setFlights((prev) => [...prev, instance]);

    // Automatically remove after flight completes (~1400ms)
    setTimeout(() => {
      onLanded?.();
      setFlights((prev) => prev.filter((f) => f.id !== flightId));
    }, 1450);
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
        <AnimatedFlyingButterfly key={flight.id} flight={flight} />
      ))}
    </div>
  );
});

GardenButterflyOverlay.displayName = 'GardenButterflyOverlay';

// Individual flying butterfly with flight curve and stardust trail
function AnimatedFlyingButterfly({ flight }: { flight: ButterflyFlightInstance }) {
  const [coords, setCoords] = useState({ x: flight.startX, y: flight.startY, angle: -45, scale: 0.6 });
  const [trail, setTrail] = useState<Array<{ x: number; y: number; id: number }>>([]);

  useEffect(() => {
    const startTime = performance.now();
    const duration = 1350; // ms flight duration

    let frameId: number;

    // Cubic Bezier curve calculation
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
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 2.5);

      const p0 = getBezierPoint(Math.max(0, eased - 0.02));
      const p1 = getBezierPoint(eased);

      // Calculate flight heading angle
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

      // Scale up as it flies from background garden into view, then settle
      const scale = progress < 0.2 ? 0.6 + progress * 2 : progress > 0.85 ? 1.0 - (progress - 0.85) * 0.4 : 1.0;

      setCoords({ x: p1.x, y: p1.y, angle, scale });

      // Add sparkling stardust trail
      if (Math.random() > 0.4 && progress < 0.9) {
        setTrail((prev) => [
          ...prev.slice(-8),
          { x: p1.x + (Math.random() - 0.5) * 8, y: p1.y + (Math.random() - 0.5) * 8, id: now },
        ]);
      }

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [flight]);

  return (
    <>
      {/* Stardust particles trailing behind */}
      {trail.map((mote) => (
        <span
          key={mote.id}
          className="absolute w-1.5 h-1.5 rounded-full bg-emerald-300 pointer-events-none animate-ping"
          style={{
            left: `${mote.x}px`,
            top: `${mote.y}px`,
            boxShadow: `0 0 8px ${flight.colorScheme}`,
            opacity: 0.6,
          }}
        />
      ))}

      {/* Butterfly Sprite */}
      <div
        className="absolute pointer-events-none transition-transform will-change-transform"
        style={{
          left: `${coords.x}px`,
          top: `${coords.y}px`,
          transform: `translate(-50%, -50%) rotate(${coords.angle}deg) scale(${coords.scale})`,
          filter: `drop-shadow(0 0 12px ${flight.colorScheme})`,
        }}
      >
        <div className="butterfly-flight-wings relative flex items-center justify-center">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="overflow-visible">
            {/* Left Wing */}
            <path
              d="M12 12 C10 6, 2 4, 3 10 C3.5 13, 8 13.5, 12 12 Z"
              fill="url(#bfGradientLeft)"
              className="origin-right animate-wingFlapLeft"
            />
            <path
              d="M12 12 C9 15, 4 17, 5 20 C6 21.5, 10 18, 12 12 Z"
              fill="url(#bfGradientLowerLeft)"
              className="origin-right animate-wingFlapLeft"
            />

            {/* Right Wing */}
            <path
              d="M12 12 C14 6, 22 4, 21 10 C20.5 13, 16 13.5, 12 12 Z"
              fill="url(#bfGradientRight)"
              className="origin-left animate-wingFlapRight"
            />
            <path
              d="M12 12 C15 15, 20 17, 19 20 C18 21.5, 14 18, 12 12 Z"
              fill="url(#bfGradientLowerRight)"
              className="origin-left animate-wingFlapRight"
            />

            {/* Body & Antennae */}
            <ellipse cx="12" cy="12" rx="1" ry="4.5" fill="#f0fdf4" />
            <path d="M12 8 Q10 4 9 3" stroke="#f0fdf4" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M12 8 Q14 4 15 3" stroke="#f0fdf4" strokeWidth="0.8" strokeLinecap="round" />

            <defs>
              <linearGradient id="bfGradientLeft" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="bfGradientLowerLeft" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <linearGradient id="bfGradientRight" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="bfGradientLowerRight" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </>
  );
}

export default GardenButterflyOverlay;
