'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Activity,
  FileText,
  Wallet,
  Settings,
  User,
  Menu,
  X,
} from 'lucide-react';
import { ChainProvider, useChain } from '@/lib/chain-context';
import type { Chain } from '@/lib/api';

const nav = [
  { href: '/', label: 'Overview', icon: Activity },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/profile', label: 'Profile', icon: User },
];

const chains: { value: Chain; label: string }[] = [
  { value: 'xmr', label: 'XMR' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChainProvider>
      <DashboardShell>{children}</DashboardShell>
    </ChainProvider>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { chain, setChain } = useChain();

  return (
    <div className="flex h-screen">
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col
          transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex
        `}
      >
        <div className="px-5 py-5 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-widest text-orange-400 uppercase">
            Payments Admin
          </span>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden text-zinc-400 hover:text-zinc-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Chain selector */}
        <div className="px-3 pt-4 pb-2">
          <p className="px-3 mb-1 text-xs text-zinc-500 uppercase tracking-wider">
            Chain
          </p>
          <div className="flex rounded-md overflow-hidden border border-zinc-700">
            {chains.map((c) => (
              <button
                key={c.value}
                onClick={() => setChain(c.value)}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                  chain === c.value
                    ? 'bg-orange-500 text-white'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-zinc-800">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <button
            onClick={() => setOpen(true)}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold tracking-widest text-orange-400 uppercase">
            Payments Admin
          </span>
        </header>
        <main className="flex-1 overflow-y-auto bg-zinc-950 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function LogoutButton() {
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-md transition-colors"
    >
      Sign out
    </button>
  );
}
