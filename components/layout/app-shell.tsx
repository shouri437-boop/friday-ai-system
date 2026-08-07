'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalonePage = pathname === '/login' || pathname === '/friday';

  if (isStandalonePage) {
    return <div className="w-full h-full min-h-screen overflow-hidden relative z-50">{children}</div>;
  }

  return (
    <div className="h-full bg-[#080b11] text-slate-100 flex overflow-hidden w-full">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        <Header />
        <main className="flex-1 min-h-0 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}
