'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartridgeWalletProvider } from './CartridgeWalletProvider';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CartridgeWalletProvider>{children}</CartridgeWalletProvider>
    </QueryClientProvider>
  );
}
