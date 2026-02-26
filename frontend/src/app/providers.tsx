'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { SidebarProvider } from '@/components/layout/sidebar-context';

const WalletProviders = dynamic(
  () => import('./wallet-providers').then(mod => mod.WalletProviders),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProviders>
      <SidebarProvider>
        {children}
      </SidebarProvider>
    </WalletProviders>
  );
}
