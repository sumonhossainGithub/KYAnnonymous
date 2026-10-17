import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  speed: number;
  driftX: number;
  driftY: number;
  color: string;
  twinkleSpeed: number;
  twinklePhase: number;
  layer: number; // 0: distant, 1: mid, 2: bright
}

interface Firefly {
  x: number;
  y: number;
  radius: number;
  color: string;
  glowColor: string;
  vx: number;
  vy: number;
  pulseSpeed: number;
  pulsePhase: number;
  hoverAmp: number;
}

interface FoliageBlade {
  xRatio: number;
  heightRatio: number;
  width: number;
  curve: number;
  swaySpeed: number;
  swayPhase: number;
  color: string;
}

export default function Starfield({ paused }: { paused: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext('2d', { alpha: true });
    if (!context) return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let width = 0;
    let height = 0;
    let previous = 0;
    let time = 0;

    // Palette of serene night garden stars
    const starColors = [
      'rgba(240, 253, 250, ', // Pristine starlight mint-white
      'rgba(167, 243, 208, ', // Soft emerald glow
      'rgba(110, 231, 183, ', // Ethereal jade
      'rgba(253, 230, 138, ', // Warm starlight gold
      'rgba(196, 181, 253, ', // Night orchid lilac
      'rgba(147, 197, 253, ', // Moonlit periwinkle
    ];

    // Firefly colors: bioluminescent warm gold & chartreuse
    const fireflyColors = [
      { core: 'rgba(254, 240, 138, 0.95)', glow: 'rgba(234, 179, 8, ' },
      { core: 'rgba(187, 247, 208, 0.95)', glow: 'rgba(52, 211, 153, ' },
      { core: 'rgba(217, 249, 157, 0.95)', glow: 'rgba(163, 230, 53, ' },
      { core: 'rgba(167, 243, 208, 0.95)', glow: 'rgba(45, 212, 191, ' },
    ];

    // 160 stars moving slowly across the night sky
    const starCount = 160;
    const stars: Star[] = Array.from({ length: starCount }, (_, i) => {
      const layer = i % 8 === 0 ? 2 : i % 3 === 0 ? 1 : 0;
      const speedMultiplier = layer === 2 ? 0.35 : layer === 1 ? 0.22 : 0.12;

      return {
        x: Math.random(),
        y: Math.random(),
        baseX: Math.random(),
        baseY: Math.random(),
        size: layer === 2 ? 2.0 + Math.random() * 0.8 : layer === 1 ? 1.2 + Math.random() * 0.6 : 0.7 + Math.random() * 0.5,
        speed: speedMultiplier,
        // Drift slowly towards lower-left (peaceful cosmic orbit)
        driftX: -(0.02 + Math.random() * 0.03) * speedMultiplier,
        driftY: (0.015 + Math.random() * 0.025) * speedMultiplier,
        color: starColors[i % starColors.length],
        twinkleSpeed: 0.0015 + Math.random() * 0.0025,
        twinklePhase: Math.random() * Math.PI * 2,
        layer,
      };
    });

    // 24 wandering garden fireflies
    const fireflies: Firefly[] = Array.from({ length: 24 }, (_, i) => {
      const colorScheme = fireflyColors[i % fireflyColors.length];
      return {
        x: Math.random(),
        y: 0.45 + Math.random() * 0.52, // Mostly in mid-to-lower garden atmosphere
        radius: 1.5 + Math.random() * 1.5,
        color: colorScheme.core,
        glowColor: colorScheme.glow,
        vx: (Math.random() - 0.5) * 0.00018,
        vy: (Math.random() - 0.5) * 0.00015,
        pulseSpeed: 0.002 + Math.random() * 0.003,
        pulsePhase: Math.random() * Math.PI * 2,
        hoverAmp: 8 + Math.random() * 14,
      };
    });

    // Night Garden foliage silhouettes along bottom edge
    const foliageBlades: FoliageBlade[] = Array.from({ length: 48 }, (_, i) => {
      const isBack = i % 2 === 0;
      return {
        xRatio: (i / 48) + (Math.random() - 0.5) * 0.03,
        heightRatio: isBack ? 0.08 + Math.random() * 0.06 : 0.05 + Math.random() * 0.05,
        width: 3 + Math.random() * 5,
        curve: (Math.random() - 0.5) * 24,
        swaySpeed: 0.0008 + Math.random() * 0.0008,
        swayPhase: Math.random() * Math.PI * 2,
        color: isBack ? 'rgba(3, 24, 20, 0.75)' : 'rgba(2, 14, 11, 0.92)',
      };
    });

    const paint = () => {
      context.clearRect(0, 0, width, height);

      // 1. Soft nocturnal garden atmosphere & moonlight gradient
      const ambientSky = context.createLinearGradient(0, 0, 0, height);
      ambientSky.addColorStop(0, 'rgba(2, 10, 12, 0.15)');
      ambientSky.addColorStop(0.5, 'rgba(4, 20, 18, 0.2)');
      ambientSky.addColorStop(1, 'rgba(2, 16, 13, 0.45)');
      context.fillStyle = ambientSky;
      context.fillRect(0, 0, width, height);

      // Moon glow in top right
      const moonGlow = context.createRadialGradient(
        width * 0.88,
        height * 0.12,
        4,
        width * 0.88,
        height * 0.12,
        width * 0.45
      );
      moonGlow.addColorStop(0, 'rgba(167, 243, 208, 0.08)');
      moonGlow.addColorStop(0.3, 'rgba(52, 211, 153, 0.03)');
      moonGlow.addColorStop(1, 'transparent');
      context.fillStyle = moonGlow;
      context.fillRect(0, 0, width, height);

      // 2. Render Slowly Moving Stars (serene, slow celestial motion)
      stars.forEach((star, i) => {
        let currentX = (star.x + star.driftX * time * 0.008) % 1;
        let currentY = (star.y + star.driftY * time * 0.008) % 1;
        if (currentX < 0) currentX += 1;
        if (currentY > 1) currentY -= 1;

        const sx = currentX * width;
        const sy = currentY * height;

        // Gentle twinkling
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        const alpha = star.layer === 2
          ? 0.65 + twinkle * 0.35
          : star.layer === 1
          ? 0.45 + twinkle * 0.35
          : 0.25 + twinkle * 0.25;

        context.fillStyle = `${star.color}${Math.max(0.08, alpha)})`;
        context.beginPath();
        context.arc(sx, sy, star.size, 0, Math.PI * 2);
        context.fill();

        // Bright foreground stars have a soft luminous halo & sparkle
        if (star.layer === 2) {
          const halo = context.createRadialGradient(sx, sy, 0, sx, sy, star.size * 4);
          halo.addColorStop(0, `${star.color}${alpha * 0.45})`);
          halo.addColorStop(1, 'transparent');
          context.fillStyle = halo;
          context.beginPath();
          context.arc(sx, sy, star.size * 4, 0, Math.PI * 2);
          context.fill();

          // Delicate 4-point sparkle cross on key stars
          if (i % 16 === 0) {
            context.strokeStyle = `${star.color}${alpha * 0.35})`;
            context.lineWidth = 0.7;
            const flare = star.size * 3.5;
            context.beginPath();
            context.moveTo(sx - flare, sy);
            context.lineTo(sx + flare, sy);
            context.moveTo(sx, sy - flare);
            context.lineTo(sx, sy + flare);
            context.stroke();
          }
        }
      });

      // 3. Render Wandering Bioluminescent Fireflies
      fireflies.forEach((fly) => {
        // Natural hovering & drifting in garden
        const swayX = Math.sin(time * 0.0007 + fly.pulsePhase) * fly.hoverAmp;
        const swayY = Math.cos(time * 0.0006 + fly.pulsePhase) * (fly.hoverAmp * 0.6);

        let fx = ((fly.x + fly.vx * time) % 1) * width + swayX;
        let fy = ((fly.y + fly.vy * time) % 1) * height + swayY;

        if (fx < 0) fx += width;
        if (fx > width) fx -= width;
        if (fy < 0) fy += height;
        if (fy > height) fy -= height;

        // Pulsing glow
        const pulse = (Math.sin(time * fly.pulseSpeed + fly.pulsePhase) + 1) * 0.5;
        const glowRadius = fly.radius * (4 + pulse * 6);
        const glowAlpha = 0.2 + pulse * 0.45;

        // Radial firefly aura
        const glow = context.createRadialGradient(fx, fy, 0, fx, fy, glowRadius);
        glow.addColorStop(0, `${fly.glowColor}${glowAlpha})`);
        glow.addColorStop(0.5, `${fly.glowColor}${glowAlpha * 0.35})`);
        glow.addColorStop(1, 'transparent');

        context.fillStyle = glow;
        context.beginPath();
        context.arc(fx, fy, glowRadius, 0, Math.PI * 2);
        context.fill();

        // Firefly radiant core
        context.fillStyle = fly.color;
        context.beginPath();
        context.arc(fx, fy, fly.radius * (0.8 + pulse * 0.4), 0, Math.PI * 2);
        context.fill();
      });

      // 4. Night Garden Foliage Silhouettes at the bottom edge
      foliageBlades.forEach((blade) => {
        const rootX = blade.xRatio * width;
        const rootY = height;
        const bladeHeight = blade.heightRatio * height;
        const sway = Math.sin(time * blade.swaySpeed + blade.swayPhase) * 12;
        const tipX = rootX + blade.curve + sway;
        const tipY = height - bladeHeight;
        const ctrlX = rootX + (blade.curve * 0.5) + (sway * 0.4);
        const ctrlY = height - (bladeHeight * 0.6);

        context.fillStyle = blade.color;
        context.beginPath();
        context.moveTo(rootX - blade.width, rootY);
        context.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
        context.quadraticCurveTo(ctrlX + blade.width * 0.5, ctrlY, rootX + blade.width, rootY);
        context.closePath();
        context.fill();
      });

      // Bottom ground mist
      const groundMist = context.createLinearGradient(0, height - 70, 0, height);
      groundMist.addColorStop(0, 'transparent');
      groundMist.addColorStop(1, 'rgba(2, 12, 10, 0.7)');
      context.fillStyle = groundMist;
      context.fillRect(0, height - 70, width, 70);
    };

    const resize = () => {
      const rect = element.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      element.width = width;
      element.height = height;
      paint();
    };

    const loop = (timestamp: number) => {
      if (!previous) previous = timestamp;
      const delta = Math.min(32, timestamp - previous);
      previous = timestamp;

      if (!paused && !preference.matches) {
        time += delta;
        paint();
      }
      frame = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [paused]);

  return (
    <canvas
      ref={canvas}
      className="starfield"
      aria-hidden="true"
    />
  );
}
