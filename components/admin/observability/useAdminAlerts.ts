'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { observabilityApi } from '@/lib/admin/adminApi';
import { ALERT_POLL_INTERVAL_MS } from '@/lib/admin/observability';
import type { AdminAlertState } from '@/lib/admin/types';

export interface AdminAlertsState {
  state: AdminAlertState | null;
  /** True only until the FIRST resolution — a refresh keeps the last state up. */
  loading: boolean;
  /** The most recent failure, kept alongside the last good state, not instead of it. */
  error: string | null;
  refresh: () => void;
}

/**
 * The alerting poller, hoisted out of `AlertsPanel` (#14).
 *
 * #190 put the fetch inside the panel, which was right when the panel was its
 * only consumer. #14's health-summary strip derives its verdict from the SAME
 * alarm state, and two independent pollers would mean two payloads a few seconds
 * apart — so the tab could show "everything looks healthy" directly above a row
 * reading IN ALARM. One hook, one payload, passed down: the strip and the panel
 * are now incapable of disagreeing.
 *
 * Behaviour carried over from #190 verbatim, because each part earns its keep:
 *
 *  - **A failed poll never clears a known state.** The house asymmetry — only a
 *    definitive successful read may replace what is on screen. A network blip
 *    must not make an ongoing incident disappear.
 *  - **Polling pauses while the tab is hidden** and re-reads immediately on
 *    return, so a backgrounded dashboard costs nothing and a returning founder
 *    never reads a stale panel.
 *  - **60 seconds.** The alarms evaluate on a 5-minute period and the email
 *    dispatcher runs `rate(5 minutes)`, so polling faster cannot make the data
 *    fresher — it only burns requests.
 *
 * (The layout-level `CriticalAlertBanner` keeps its own poller: it is mounted on
 * every page, including ones that never render this hook, and its job is to
 * interrupt rather than to inform.)
 */
export function useAdminAlerts(): AdminAlertsState {
  const [state, setState] = useState<AdminAlertState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const next = await observabilityApi.alerts();
      if (!mounted.current) return;
      setState(next);
      setError(null);
    } catch (e) {
      if (!mounted.current) return;
      // Keep the last good state on screen — an unreachable API is not evidence
      // that the alarms are fine, and blanking the panel would replace real
      // information with none.
      setError(e instanceof Error ? e.message : 'Could not read alerting state');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, ALERT_POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  return { state, loading, error, refresh: () => void load() };
}
