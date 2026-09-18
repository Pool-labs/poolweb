import type { StatsData } from '@/lib/admin/stats';

/**
 * What every Stats tab receives. One shared fetch, one shared range — a tab
 * NEVER fetches for itself: eight tabs each polling their own window is how a
 * dashboard ends up showing two different answers to the same question.
 */
export interface StatsTabProps {
  data: StatsData;
  /** The selected window in days — the one control that scopes every panel. */
  days: number;
}
