'use client';

import type { ReactNode } from 'react';
import Header from '@/src/components/Header';
import Sidebar from '@/src/components/Sidebar';
import SessionGate from '@/src/components/SessionGate';
import AssistantWidget from '@/src/components/assistant/AssistantWidget';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <SessionGate>
      <div className="grid grid-rows-[auto_1fr] grid-cols-1 sm:grid-cols-[auto_1fr] h-screen bg-gray-50">
        <Header />
        <Sidebar />
        {/* The bottom padding lets the last rows scroll clear of the assistant button. */}
        <main className="row-start-2 overflow-auto p-4 pb-24 sm:p-6 sm:pb-24">{children}</main>
      </div>
      {/* Once, outside the pages, so the chat survives moving between them. */}
      <AssistantWidget />
    </SessionGate>
  );
}
