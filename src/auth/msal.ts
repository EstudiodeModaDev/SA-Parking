// src/auth/msal.ts
import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  AccountInfo,
} from '@azure/msal-browser';

let initialized = false;

export const msal = new PublicClientApplication({
  auth: {
    clientId: '60d9a880-0f6c-4e14-b17a-1cc06ea9ba8a',
    authority: 'https://login.microsoftonline.com/cd48ecd9-7e15-4f4b-97d9-ec813ee42b2c', // tenant fijo = ok
    redirectUri: window.location.origin,
    navigateToLoginRequestUrl: false, // evita rebote post-login
  },
  cache: { cacheLocation: 'localStorage' },
  system: { allowNativeBroker: false },
});

export async function initMSAL() {
  if (initialized) return;
  await msal.initialize(); // IMPORTANTE en Code Apps
  initialized = true;
}

const SCOPES_LOGIN = ['openid', 'profile', 'email', 'User.Read']; // mínimos

// Scopes por funcionalidad (pídelos solo cuando los necesites)
export const Scopes = {
  GraphUsersBasic: ['User.Read.All'],          // listar usuarios (sin accountEnabled)
  GraphDirectory:  ['Directory.Read.All'],     // leer accountEnabled/prop. de directorio (requiere admin consent)
  GraphSitesRW:    ['Sites.ReadWrite.All'],    // SPO por Graph (listas/biblios)
  // Ejemplo SPO directo por recurso (si lo usas):
  // SharePointRead: [`https://{tu-tenant}.sharepoint.com/AllSites.Read`],
};

// ———————————————————————————————————————————————————————————

function ensureActiveAccount(): AccountInfo | null {
  const acc = msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;
  if (acc) msal.setActiveAccount(acc);
  return acc;
}

// Login con scopes mínimos
export async function ensureLogin(): Promise<AccountInfo> {
  await initMSAL();
  let account = ensureActiveAccount();
  if (!account) {
    const res = await msal.loginPopup({ scopes: SCOPES_LOGIN, prompt: 'select_account' });
    account = res.account ?? msal.getAllAccounts()[0]!;
    msal.setActiveAccount(account);
  }
  return account;
}

// Token por conjunto de scopes (consent incremental)
export async function getAccessToken(scopes: string[]): Promise<string> {
  await initMSAL();
  const account = ensureActiveAccount();
  if (!account) throw new Error('No hay sesión. Llama a ensureLogin() primero.');

  try {
    const res = await msal.acquireTokenSilent({ scopes, account });
    return res.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      const res = await msal.acquireTokenPopup({ scopes, account });
      return res.accessToken;
    }
    throw e; // AADSTS65001 falta consentimiento; AADSTS65004 requiere admin consent
  }
}

export async function logout() {
  await initMSAL();
  const account = ensureActiveAccount();
  await msal.logoutPopup({ account });
}
