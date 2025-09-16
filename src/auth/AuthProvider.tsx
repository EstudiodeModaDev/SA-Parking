import * as React from 'react';
import type { AccountInfo } from '@azure/msal-browser';
import { initMsalOnce, ensureLogin, getAccessToken, logout, msal } from './msal';

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

  // Inicializa MSAL y procesa posible redirect (#code) al cargar la app.
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        await initMsalOnce();
        const acc = msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;
        if (!cancel) {
          setAccount(acc);
          setReady(true);
        }
      } catch (err) {
        console.error('[AuthProvider] auto-login error:', err);
        if (!cancel) setReady(true); // Listo para mostrar botón de login
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
    const token = await getAccessToken();
    return token;
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
