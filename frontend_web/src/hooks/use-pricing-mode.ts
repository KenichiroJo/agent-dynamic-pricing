import { createContext, useContext, useState, useCallback } from 'react';

export type PricingMode = 'demo' | 'production';

export interface PricingModeContextType {
  mode: PricingMode;
  setMode: (mode: PricingMode) => void;
  toggleMode: () => void;
  isDemo: boolean;
}

const STORAGE_KEY = 'pgm-pricing-mode';

function getInitialMode(): PricingMode {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'demo' || saved === 'production') {
      return saved;
    }
  }
  return 'demo';
}

export const PricingModeContext = createContext<PricingModeContextType>({
  mode: 'demo',
  setMode: () => {},
  toggleMode: () => {},
  isDemo: true,
});

export function usePricingModeState(): PricingModeContextType {
  const [mode, setModeState] = useState<PricingMode>(getInitialMode);

  const setMode = useCallback((newMode: PricingMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'demo' ? 'production' : 'demo');
  }, [mode, setMode]);

  return { mode, setMode, toggleMode, isDemo: mode === 'demo' };
}

export function usePricingMode() {
  return useContext(PricingModeContext);
}
