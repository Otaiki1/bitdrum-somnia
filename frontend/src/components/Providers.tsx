'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { sepolia } from '@starknet-react/chains';
import {
  StarknetConfig,
  jsonRpcProvider,
  argent,
  braavos,
  useInjectedConnectors,
  voyager
} from '@starknet-react/core';
import { PrivyProvider } from '@privy-io/react-auth';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const { connectors } = useInjectedConnectors({
    recommended: [argent(), braavos()],
    includeRecommended: "onlyIfNoConnectors",
    order: "random"
  });

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cltxk9z7b0453d5a2b0e7y5e'}
        config={{
          loginMethods: ['email', 'wallet'],
          appearance: {
            theme: 'dark',
            accentColor: '#f97316', // orange-500
          },
        }}
      >
        <StarknetConfig
          chains={[sepolia]}
          provider={jsonRpcProvider({ 
            rpc: () => ({ nodeUrl: 'https://starknet-sepolia.public.blastapi.io' }) 
          })}
          connectors={connectors}
          explorer={voyager}
        >
          {children}
        </StarknetConfig>
      </PrivyProvider>
    </QueryClientProvider>
  );
}
