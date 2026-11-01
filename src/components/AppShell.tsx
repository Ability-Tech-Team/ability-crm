'use client';

import type { ReactNode } from 'react';
import Header from '@/src/components/Header';
import Sidebar from '@/src/components/Sidebar';
import SessionGate from '@/src/components/SessionGate';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <SessionGate>
      <div className="grid grid-rows-[auto_1fr] grid-cols-1 sm:grid-cols-[auto_1fr] h-screen bg-gray-50">
        <Header />
        <Sidebar />
        <main className="row-start-2 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </SessionGate>
  );
}
