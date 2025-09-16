// src/auth/msal.ts
import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  EventType,
  type AccountInfo,
} from '@azure/msal-browser';

export const msal = new PublicClientApplication({
  auth: {
    clientId: '60d9a880-0f6c-4e14-b17a-1cc06ea9ba8a',
    authority: 'https://login.microsoftonline.com/cd48ecd9-7e15-4f4b-97d9-ec813ee42b2c',
    redirectUri: window.location.origin, // Debe estar en SPA redirect URIs
  },
  cache: { cacheLocation: 'localStorage' },
});

let initialized = false;

// ⚙️ inicializa y atiende eventos (login/acquireToken)
export async function initializeMsal() {
  if (initialized) return;
  await msal.initialize();                  // <- evita el error "uninitialized_public_client_application"
  await msal.handleRedirectPromise();       // <- por si algún flujo usa redirect
  msal.addEventCallback((e) => {
    if (e.eventType === EventType.LOGIN_SUCCESS || e.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) {
      const acc = e.payload && (e.payload as any).account as AccountInfo | undefined;
      if (acc) {
        msal.setActiveAccount(acc);
        // útil para depurar
        console.log('[MSAL] active account set from event:', acc.username);
      }
    }
  });
  initialized = true;
}

// Scopes: incluye login + Graph
const SCOPES = ['openid','profile','email','User.Read','Sites.ReadWrite.All'];

// Login popup garantizando cuenta activa
export async function ensureLogin(): Promise<AccountInfo> {
  let account = msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;
  if (!account) {
    const res = await msal.loginPopup({ scopes: SCOPES, prompt: 'select_account' });
    account = res.account ?? msal.getAllAccounts()[0]!;
    msal.setActiveAccount(account);
  } else {
    msal.setActiveAccount(account);
  }
  return account;
}

// Token
export async function getAccessToken(): Promise<string> {
  const account = msal.getActiveAccount() ?? msal.getAllAccounts()[0];
  if (!account) throw new Error('No hay sesión. Llama a ensureLogin() primero.');
  try {
    const res = await msal.acquireTokenSilent({ scopes: SCOPES, account });
    return res.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      const res = await msal.acquireTokenPopup({ scopes: SCOPES, account });
      return res.accessToken;
    }
    throw e;
  }
}

export async function logout() {
  const account = msal.getActiveAccount() ?? msal.getAllAccounts()[0];
  await msal.logoutPopup({ account });
}
