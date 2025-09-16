// src/auth/AuthContext.tsx
import * as React from "react";
import {PublicClientApplication, LogLevel,} from "@azure/msal-browser";
import type {  Configuration,   AccountInfo,   SilentRequest,   RedirectRequest,} from "@azure/msal-browser"
// =====================
// Tipos expuestos
// =====================
export type AuthCtx = {
  ready: boolean;                 // MSAL listo para emitir tokens
  account: AccountInfo | null;    // Cuenta activa (si hay)
  getToken: (scopes?: string[]) => Promise<string>;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthCtx | null>(null);

export const useAuth = (): AuthCtx => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};

// =====================
// Configuración MSAL
// =====================
// Usa variables de entorno o pon valores directos
const TENANT_ID = import.meta.env.VITE_AAD_TENANT_ID as string | undefined;
const CLIENT_ID = import.meta.env.VITE_AAD_CLIENT_ID as string | undefined;
const REDIRECT_URI =
  (import.meta.env.VITE_AAD_REDIRECT_URI as string | undefined) ||
  window.location.origin;

// Scopes por defecto para Graph (ajústalos a tu app/consentimiento)
const DEFAULT_SCOPES = [
  "User.Read",
  "Sites.Read.All",
  "Sites.ReadWrite.All",
  // agrega otros si tu app los requiere:
  // "Mail.Send",
] as const;

const msalConfig: Configuration = {
  auth: {
    clientId: CLIENT_ID || "<AAD_APP_CLIENT_ID>",
    authority: TENANT_ID
      ? `https://login.microsoftonline.com/${TENANT_ID}`
      : "https://login.microsoftonline.com/common",
    redirectUri: REDIRECT_URI,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: "localStorage", // o "sessionStorage"
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Error,
      loggerCallback: () => {},
    },
  },
};

// =====================
// Provider
// =====================
type Props = { children: React.ReactNode; scopes?: string[] };

export const AuthProvider: React.FC<Props> = ({ children, scopes }) => {
  const [ready, setReady] = React.useState(false);
  const [account, setAccount] = React.useState<AccountInfo | null>(null);

  // Instancia MSAL singleton (memo)
  const pca = React.useMemo(() => new PublicClientApplication(msalConfig), []);

  // Elegir/guardar la cuenta activa
  const pickActiveAccount = React.useCallback(() => {
    const accounts = pca.getAllAccounts();
    if (accounts.length > 0) {
      pca.setActiveAccount(accounts[0]);
      setAccount(accounts[0]);
      return accounts[0];
    }
    setAccount(null);
    return null;
  }, [pca]);

  // Inicialización + manejo de redirect
  React.useEffect(() => {
    let disposed = false;
    (async () => {
      await pca.initialize();

      // Procesa posibles respuestas de redirect
      await pca.handleRedirectPromise().catch(() => {});

      // Selecciona cuenta si ya había sesión
      const acc = pickActiveAccount();

      // Si no hay sesión → auto-login (redirect)
      if (!acc) {
        const loginReq: RedirectRequest = {
          scopes: scopes && scopes.length ? scopes : Array.from(DEFAULT_SCOPES),
        };
        // No bloquea render, pero redirige inmediatamente
        pca.loginRedirect(loginReq).catch(() => {});
      }

      if (!disposed) setReady(true);
    })();

    return () => {
      disposed = true;
    };
  }, [pca, pickActiveAccount, scopes]);

  // Helper: adquirir token
  const getToken = React.useCallback(
    async (customScopes?: string[]) => {
      const active = pca.getActiveAccount() || pickActiveAccount();
      const reqScopes = customScopes && customScopes.length
        ? customScopes
        : Array.from(DEFAULT_SCOPES);

      const silentReq: SilentRequest = {
        account: active ?? undefined,
        scopes: reqScopes,
      };

      try {
        const res = await pca.acquireTokenSilent(silentReq);
        return res.accessToken;
      } catch {
        // Si falla silent (p.ej. primer login o expiró refresh), redirige a login
        await pca.acquireTokenRedirect({ scopes: reqScopes });
        // la app regresará por redirect; aquí devolvemos cadena vacía para
        // conformidad del tipo (no se usará).
        return "";
      }
    },
    [pca, pickActiveAccount]
  );

  // Helper: logout
  const logout = React.useCallback(async () => {
    const acc = pca.getActiveAccount() || undefined;
    await pca.logoutRedirect({ account: acc });
  }, [pca]);

  const value: AuthCtx = React.useMemo(
    () => ({ ready, account, getToken, logout }),
    [ready, account, getToken, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
