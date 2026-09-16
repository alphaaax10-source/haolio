import { useLayoutEffect, useRef } from 'react';

/**
 * Reports the rendered size of the referenced element whenever `deps` change.
 * Used to auto-size text objects and mind map nodes to their content.
 */
export function useElementAutoSize(
  enabled: boolean,
  onSize: (width: number, height: number) => void,
  deps: React.DependencyList,
): React.RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (w > 0 && h > 0) onSize(w, h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref as React.RefObject<HTMLDivElement>;
}
