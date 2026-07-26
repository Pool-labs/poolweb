'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Users, Layers, ClipboardList, ShieldCheck, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { adminLogout } from '@/lib/admin/adminApi';

const NAV_ITEMS = [
  { href: '/admin/overview', label: 'Overview', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/pools', label: 'Pools', icon: Layers },
  { href: '/admin/admins', label: 'Admins', icon: ShieldCheck },
  { href: '/admin/dashboard', label: 'Waitlist', icon: ClipboardList },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="mr-2 font-bold">Pool Admin</span>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void adminLogout()}
          className="self-end text-muted-foreground hover:text-destructive sm:self-auto"
        >
          <LogOut className="mr-1 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
