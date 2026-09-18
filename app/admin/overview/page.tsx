import { redirect } from 'next/navigation';

/**
 * The Overview is now Stats (poolweb #33).
 *
 * The route is KEPT as a redirect rather than deleted: it was the admin's
 * landing page for months, so it is in bookmarks, in older docs and in the
 * login flow's muscle memory. A 404 there would read as "the dashboard is
 * broken", which is the one impression an ops surface cannot afford.
 */
export default function AdminOverviewPage() {
  redirect('/admin/stats');
}
