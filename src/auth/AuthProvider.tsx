// src/auth/AuthProvider.tsx
import * as React from 'react';

type AuthCtx = {
  getToken: () => Promise<string>;
  ready: boolean;
};
const Ctx = React.createContext<AuthCtx | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // tu lógica real aquí:
  const getToken = React.useCallback(async () => {
    // obtiene y retorna el token MSAL/Entra
    return '...access_token...';
  }, []);

  const value = React.useMemo(() => ({ getToken, ready: true }), [getToken]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

// 👇 exporta el hook desde el mismo archivo
export function useAuth(): AuthCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
