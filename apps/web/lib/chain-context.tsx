'use client';

import { createContext, useContext, useState } from 'react';
import type { Chain } from './api';

interface ChainContextValue {
  chain: Chain;
  setChain: (c: Chain) => void;
}

const ChainContext = createContext<ChainContextValue>({
  chain: 'xmr',
  setChain: () => {},
});

export function ChainProvider({ children }: { children: React.ReactNode }) {
  const [chain, setChain] = useState<Chain>('xmr');
  return (
    <ChainContext.Provider value={{ chain, setChain }}>
      {children}
    </ChainContext.Provider>
  );
}

export function useChain() {
  return useContext(ChainContext);
}
