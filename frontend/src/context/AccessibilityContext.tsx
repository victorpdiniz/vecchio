import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'vecchio.modoSimples';

interface AccessibilityContextValue {
  simpleMode: boolean;
  toggleSimpleMode: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [simpleMode, setSimpleMode] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');

  useEffect(() => {
    document.documentElement.classList.toggle('modo-simples', simpleMode);
    localStorage.setItem(STORAGE_KEY, simpleMode ? '1' : '0');
  }, [simpleMode]);

  const toggleSimpleMode = () => setSimpleMode((current) => !current);

  return (
    <AccessibilityContext.Provider value={{ simpleMode, toggleSimpleMode }}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility precisa ser usado dentro de um AccessibilityProvider.');
  }
  return context;
}
