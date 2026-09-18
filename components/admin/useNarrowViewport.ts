'use client';

import { useEffect, useState } from 'react';

/** Tailwind's `sm` breakpoint — the width below which the admin tables shed columns. */
const NARROW_QUERY = '(max-width: 639px)';

/**
 * True on a phone-width viewport.
 *
 * ⚠️ FOR SIZES A CLASS CANNOT EXPRESS, NOT FOR LAYOUT. Anything that can be a
 * responsive Tailwind class should be one — this exists because recharts takes
 * its axis width as a NUMBER prop, and a 180px category axis on a 390px screen
 * leaves the bars less than half the card.
 *
 * Starts `false` and updates after mount, deliberately: the server has no
 * viewport, so any other initial value would render one thing on the server and
 * another on the client and trip a hydration mismatch. The first paint is the
 * wide layout for a few milliseconds, which is the harmless direction.
 */
export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(NARROW_QUERY);
    const sync = () => setNarrow(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  return narrow;
}
