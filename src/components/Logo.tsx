import { useId } from 'react';

/**
 * Minimalist Haolio mark: a seed idea sprouting two branches — a mind map
 * reduced to three dots and two strokes. Inherits color via currentColor.
 */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth={5.5} strokeLinecap="round" fill="none">
        <path d="M 50 67 L 31 45" />
        <path d="M 50 67 L 69 45" />
      </g>
      <circle cx="50" cy="67" r="8.5" fill="currentColor" />
      <circle cx="31" cy="45" r="6.5" fill="currentColor" />
      <circle cx="69" cy="45" r="6.5" fill="currentColor" />
    </svg>
  );
}

/** The mark on the brand gradient tile — used wherever the app icon appears. */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  const raw = useId();
  const gid = `haolio-g-${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill={`url(#${gid})`} />
      <g stroke="#fff" strokeWidth={5.5} strokeLinecap="round" fill="none">
        <path d="M 50 67 L 31 45" />
        <path d="M 50 67 L 69 45" />
      </g>
      <circle cx="50" cy="67" r="8.5" fill="#fff" />
      <circle cx="31" cy="45" r="6.5" fill="#fff" />
      <circle cx="69" cy="45" r="6.5" fill="#fff" />
    </svg>
  );
}
