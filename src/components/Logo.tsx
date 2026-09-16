import { useId } from 'react';

/**
 * Haolio brand mark: an "H" built from two gradient capsules tied together
 * by an S-wave — two ideas connected. Gradients follow the reference art.
 */

function HMark({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#617CF7" />
          <stop offset="1" stopColor="#8662F1" />
        </linearGradient>
        <linearGradient id={`${id}-sr`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4EC7F7" />
          <stop offset="1" stopColor="#6360F2" />
        </linearGradient>
        <linearGradient id={`${id}-w`} x1="0" y1="0.9" x2="1" y2="0.1">
          <stop offset="0" stopColor="#AC8BFA" />
          <stop offset="0.5" stopColor="#6E8AF9" />
          <stop offset="1" stopColor="#42BEF7" />
        </linearGradient>
      </defs>
      <rect x="29.5" y="28.5" width="15" height="44.5" rx="7.5" fill={`url(#${id}-sl)`} />
      <rect x="57.5" y="28.5" width="15" height="44.5" rx="7.5" fill={`url(#${id}-sr)`} />
      <path
        d="M 35.5 54.5 C 46.5 63.5, 56.5 39.5, 66 46"
        stroke={`url(#${id}-w)`}
        strokeWidth="12.5"
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
}

export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  const raw = useId();
  const id = `hm-${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <HMark id={id} />
    </svg>
  );
}

/** The mark on the soft lavender app tile — used wherever the app icon appears. */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  const raw = useId();
  const id = `lg-${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F5F6FC" />
          <stop offset="1" stopColor="#E3E6F4" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="18" fill={`url(#${id}-tile)`} />
      <HMark id={id} />
    </svg>
  );
}
