import { redirect } from 'next/navigation';

/** /admin → the platform-admin overview (middleware enforces the session gate). */
export default function AdminIndexPage() {
  redirect('/admin/overview');
}
