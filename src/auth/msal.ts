import { PublicClientApplication, InteractionRequiredAuthError, type AccountInfo } from '@azure/msal-browser';

export const msal = new PublicClientApplication({
  auth: {
    clientId: '<APP_CLIENT_ID>',
    authority: 'https://login.microsoftonline.com/<TENANT_ID>',
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: 'localStorage' }, //persistir sesión
});

const SCOPES = ['User.Read', 'Sites.ReadWrite.All']; 


//Metodo para asegurar que siempre se inicie sesion
export async function ensureLogin(): Promise<AccountInfo> {
  let account = msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;

  if (!account) {
    
    await msal.loginPopup({
      scopes: SCOPES,
      prompt: 'select_account', 
    });
    account = msal.getAllAccounts()[0]!;
    msal.setActiveAccount(account);
  } else {
    msal.setActiveAccount(account);
  }

  return account;
}

//Obtener el token del usuaruio
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

//Logout
export async function logout() {
  const account = msal.getActiveAccount() ?? msal.getAllAccounts()[0];
  await msal.logoutPopup({ account });
}
