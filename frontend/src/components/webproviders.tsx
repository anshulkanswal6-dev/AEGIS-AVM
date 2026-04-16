import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useMemo } from 'react';
import { AlgorandProvider } from './AlgorandProvider';
import { useThemeStore } from '../hooks/useTheme';

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <AlgorandProvider>
        {children}
      </AlgorandProvider>
    </QueryClientProvider>
  );
};