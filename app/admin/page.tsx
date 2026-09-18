import { redirect } from 'next/navigation';

/** /admin → the platform-admin Stats page (middleware enforces the session gate). */
export default function AdminIndexPage() {
  redirect('/admin/stats');
}
