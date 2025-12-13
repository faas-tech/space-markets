'use client';

import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { useSidebar } from '@/components/layout/sidebar-context';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { collapsed, toggle } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      <Navbar />
      <div className="flex">
        <Sidebar collapsed={collapsed} onToggle={toggle} />
        <main className="flex-1 p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}

