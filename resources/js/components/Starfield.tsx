import { useEffect, useRef } from 'react';

export default function Starfield({ paused }: { paused: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let width = 0;
    let height = 0;
    let previous = 0;
    let time = 0;

    // Pleasant celestial nodes with gentle joyful colors
    const colors = [
      'rgba(56, 189, 248, ',  // Bright cyan
      'rgba(167, 139, 250, ', // Soft lavender
      'rgba(52, 211, 153, ',  // Fresh emerald
      'rgba(251, 191, 36, ',  // Warm golden amber
      'rgba(129, 140, 248, ', // Royal periwinkle
    ];

    const nodeCount = 65;
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
      x: ((i * 7919 + 173) % 1000) / 1000,
      y: ((i * 3571 + 311) % 1000) / 1000,
      speedX: (((i * 1337) % 40) - 20) * 0.0000018,
      speedY: (((i * 2477) % 40) - 20) * 0.0000018,
      size: i % 11 === 0 ? 2.4 : i % 4 === 0 ? 1.6 : 1.0,
      color: colors[i % colors.length],
      pulseSpeed: 0.0005 + (i % 6) * 0.0002,
    }));

    const paint = () => {
      context.clearRect(0, 0, width, height);

      // Soft radiant celestial gradient sweeps
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, 'rgba(14, 165, 233, 0.02)');
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.025)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.015)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      // Calculate node positions with slow, peaceful floating
      const currentNodes = nodes.map((node, i) => {
        const driftX = (node.x + node.speedX * time + Math.sin(time * 0.00015 + i) * 0.008) % 1;
        const driftY = (node.y + node.speedY * time + Math.cos(time * 0.00012 + i) * 0.008) % 1;
        const nx = driftX < 0 ? driftX + 1 : driftX;
        const ny = driftY < 0 ? driftY + 1 : driftY;
        return {
          x: nx * width,
          y: ny * height,
          size: node.size,
          color: node.color,
          pulse: Math.sin(time * node.pulseSpeed + i),
        };
      });

      // Draw faint luminous connection lines between nearby stars
      context.lineWidth = 0.6;
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const dx = currentNodes[i].x - currentNodes[j].x;
          const dy = currentNodes[i].y - currentNodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.16;
            context.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            context.beginPath();
            context.moveTo(currentNodes[i].x, currentNodes[i].y);
            context.lineTo(currentNodes[j].x, currentNodes[j].y);
            context.stroke();
          }
        }
      }

      // Draw bright, cheerful star nodes
      currentNodes.forEach((node, i) => {
        const glowAlpha = 0.35 + (node.pulse + 1) * 0.3;
        context.fillStyle = `${node.color}${glowAlpha})`;
        context.beginPath();
        context.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        context.fill();

        // Shimmering outer halo for major stars
        if (i % 7 === 0) {
          context.strokeStyle = `${node.color}${glowAlpha * 0.45})`;
          context.beginPath();
          context.arc(node.x, node.y, node.size * 3.2, 0, Math.PI * 2);
          context.stroke();
        }
      });
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
