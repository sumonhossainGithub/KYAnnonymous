import type { CSSProperties } from 'react';
import type { SiteSettings } from '@/types';

export function siteThemeStyle(site: SiteSettings): CSSProperties {
  return {
    '--site-accent': site.primary_color, '--site-background': site.background_color,
    '--site-surface': site.surface_color, '--site-radius': `${site.corner_radius}px`,
    '--color-slate-950': site.background_color, '--color-gray-950': site.background_color,
    '--color-slate-900': site.surface_color, '--color-gray-900': site.surface_color,
    '--serif': 'var(--site-font)',
    '--site-font': site.font_family === 'mono' ? 'ui-monospace, monospace' : site.font_family === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif',
    '--color-cyan-400': site.primary_color, '--color-cyan-300': `color-mix(in srgb, ${site.primary_color}, white 25%)`,
    '--color-cyan-500': site.primary_color, '--color-cyan-600': `color-mix(in srgb, ${site.primary_color}, black 30%)`,
    '--color-cyan-950': `color-mix(in srgb, ${site.primary_color}, black 85%)`,
    '--lavender': site.primary_color, '--line': `color-mix(in srgb, ${site.primary_color}, transparent 80%)`,
  } as CSSProperties;
}
