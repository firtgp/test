import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

/**
 * Тема проекта. Сайт только тёмный, поэтому обе позиции кортежа [light, dark]
 * совпадают. Чтобы сменить палитру под другой проект, меняйте значения здесь
 * и пересобирайте тему: pnpm theme:build
 */
const same = (value: string): [string, string] => [value, value];

export const mcprojectTheme = defineTheme({
  name: 'mcproject',
  extends: neutralTheme,
  typography: {
    scale: {base: 16, ratio: 1.2},
    body: {family: 'Manrope', fallbacks: 'system-ui, -apple-system, "Segoe UI", sans-serif'},
    heading: {family: 'Unbounded', fallbacks: 'Manrope, system-ui, sans-serif'},
  },
  radius: {base: 6, multiplier: 1},
  tokens: {
    '--color-background-body': same('#0F1115'),
    '--color-background-surface': same('#171B22'),
    '--color-background-card': same('#171B22'),
    '--color-background-popover': same('#222833'),
    '--color-background-muted': same('#222833'),
    '--color-text-primary': same('#F2F4F8'),
    '--color-text-secondary': same('#A9B4C4'),
    '--color-icon-primary': same('#F2F4F8'),
    '--color-icon-secondary': same('#A9B4C4'),
    '--color-accent': same('#F2B544'),
    '--color-on-accent': same('#1A1406'),
    '--color-accent-muted': same('#F2B54433'),
    '--color-text-accent': same('#F2B544'),
    '--color-icon-accent': same('#F2B544'),
    '--color-border': same('#F2F4F81F'),
    '--color-border-emphasized': same('#4A5466'),
    '--color-success': same('#3FBF7F'),
    '--color-on-success': same('#06150D'),
    '--color-text-success': same('#5FD79A'),
    '--color-error': same('#E5484D'),
    '--color-on-error': same('#FFFFFF'),
    '--color-text-error': same('#FF8A8E'),
    '--color-warning': same('#F5A524'),
    '--color-on-warning': same('#1A1406'),
    '--color-text-warning': same('#F7BC5C'),
  },
  localTokens: {
    '--mc-focus': '#4690FF',
    '--mc-status-online': '#3FBF7F',
    '--mc-status-offline': '#E5484D',
    '--mc-status-maintenance': '#F5A524',
    '--mc-surface-raised': '#222833',
    '--mc-cta-top': '#FFD071',
    '--mc-cta-face': '#F2B544',
    '--mc-cta-bottom': '#A8741A',
    '--mc-cta-text': '#1A1406',
    '--mc-accent-techno': '#4FD1E0',
    '--mc-accent-magic': '#A78BFA',
    '--mc-accent-survival': '#7CC96B',
    // «Стекло и свет»: полупрозрачные поверхности, тонкие светлые линии, скругления.
    '--mc-night': '#0B0D12',
    '--mc-glass': 'rgba(255, 255, 255, 0.045)',
    '--mc-glass-2': 'rgba(255, 255, 255, 0.08)',
    '--mc-line': 'rgba(255, 255, 255, 0.10)',
    '--mc-line-2': 'rgba(255, 255, 255, 0.2)',
    '--mc-r-xl': '28px',
    '--mc-r-card': '20px',
    '--mc-r-tile': '14px',
    '--mc-r-btn': '12px',
  },
});
