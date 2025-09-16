// src/auth/AuthProvider.tsx
import * as React from 'react';
import type { AccountInfo } from '@azure/msal-browser';
import { initMSAL, ensureLogin, getAccessToken, logout } from './msal';

type AuthCtx = {
  ready: boolean;
  account: AccountInfo | null;
  getToken: () => Promise<string>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = React.createContext<AuthCtx | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = React.useState(false);
  const [account, setAccount] = React.useState<AccountInfo | null>(null);

  // Solo inicializa MSAL (no forza login)
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        await initMSAL();
        if (!cancel) {
          // si ya había sesión previa, refléjala
          const acc = (window as any)._skip_auto_login
            ? (null)
            : (/* opcional: intentar “rehidratar” sesión */ null);
          if (acc) setAccount(acc);
          setReady(true);
        }
      } catch (err) {
        console.error('[AuthProvider] auto-login error:', err);
        if (!cancel) setReady(true);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const signIn = React.useCallback(async () => {
    const acc = await ensureLogin(); // popup
    setAccount(acc);
    setReady(true);
  }, []);

  const signOut = React.useCallback(async () => {
    await logout();
    setAccount(null);
    setReady(true);
  }, []);

  const getToken = React.useCallback(async () => {
    return getAccessToken();
  }, []);

  const value = React.useMemo<AuthCtx>(() => ({
    ready,
    account,
    getToken,
    signIn,
    signOut,
  }), [ready, account, getToken, signIn, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAuth(): AuthCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
