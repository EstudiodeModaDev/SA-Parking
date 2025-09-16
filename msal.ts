import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  type AccountInfo,
} from '@azure/msal-browser';

export const msal = new PublicClientApplication({
  auth: {
    clientId: '60d9a880-0f6c-4e14-b17a-1cc06ea9ba8a',
    authority: 'https://login.microsoftonline.com/cd48ecd9-7e15-4f4b-97d9-ec813ee42b2c',
    redirectUri: 'https://parking.estudiodemoda.com.co/', // Debe estar registrada en Azure (SPA)
  },
  cache: { cacheLocation: 'localStorage' },
});

const SCOPES = ['User.Read', 'Sites.ReadWrite.All'];

/** Llama SIEMPRE antes de cualquier otra API de MSAL */
export async function initMsalOnce(): Promise<void> {
  // idempotente
  await msal.initialize();

  // Si por cualquier motivo se hizo redirect y volvimos con #code,
  // esto completa el flujo y setea la cuenta del resultado.
  const result = await msal.handleRedirectPromise();
  if (result?.account) {
    msal.setActiveAccount(result.account);
  }
}

/** Login con POPUP (preferido). */
export async function ensureLogin(): Promise<AccountInfo> {
  await initMsalOnce();

  let account = msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;
  if (!account) {
    const res = await msal.loginPopup({
      scopes: SCOPES,
      prompt: 'select_account',
    });
    account = res.account!;
    msal.setActiveAccount(account);
  } else {
    msal.setActiveAccount(account);
  }
  return account;
}

/** Token con POPUP como fallback si no hay silent. */
export async function getAccessToken(): Promise<string> {
  await initMsalOnce();

  const account = msal.getActiveAccount() ?? msal.getAllAccounts()[0];
  if (!account) throw new Error('No hay sesión. Llama a ensureLogin/ensureLoginAuto primero.');

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
  await initMsalOnce();
  const account = msal.getActiveAccount() ?? msal.getAllAccounts()[0];
  if (account) {
    await msal.logoutPopup({ account });
  }
}
