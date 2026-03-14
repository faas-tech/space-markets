'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const WalletProviders = dynamic(
  () => import('./wallet-providers').then(mod => mod.WalletProviders),
  { ssr: false }
);

// SSR-safe singleton: server always gets a fresh client,
// browser reuses a single instance across renders.
let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,       // 1 minute before refetch
        refetchOnWindowFocus: false, // avoid surprise refetches
      },
    },
  });
}

function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProviders>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </WalletProviders>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
