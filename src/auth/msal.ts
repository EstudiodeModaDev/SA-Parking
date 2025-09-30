// src/auth/msal.ts
import { PublicClientApplication, InteractionRequiredAuthError, type AccountInfo } from '@azure/msal-browser';

let initialized = false;

export const msal = new PublicClientApplication({
  auth: {
    clientId: '60d9a880-0f6c-4e14-b17a-1cc06ea9ba8a',
    authority: 'https://login.microsoftonline.com/cd48ecd9-7e15-4f4b-97d9-ec813ee42b2c',
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: 'localStorage' },
});

export async function initMSAL() {
  if (initialized) return;
  await msal.initialize();   // <- MUY IMPORTANTE
  initialized = true;
}

const SCOPES = [
  'openid', 'profile', 'email',
  'User.Read', 'Sites.ReadWrite.All', "Directory.Read.All"
];

// Garantiza que siempre haya “active account”
function ensureActiveAccount() {
  const acc = msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;
  if (acc) msal.setActiveAccount(acc);
  return acc;
}

// Login interactivo (popup)
export async function ensureLogin(): Promise<AccountInfo> {
  await initMSAL();
  let account = ensureActiveAccount();
  if (!account) {
    const res = await msal.loginPopup({ scopes: SCOPES, prompt: 'select_account' });
    account = res.account ?? msal.getAllAccounts()[0]!;
    msal.setActiveAccount(account);
  }
  return account;
}

// Token
export async function getAccessToken(): Promise<string> {
  await initMSAL();
  const account = ensureActiveAccount();
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

// Logout
export async function logout() {
  await initMSAL();
  const account = ensureActiveAccount();
  await msal.logoutPopup({ account });
}
