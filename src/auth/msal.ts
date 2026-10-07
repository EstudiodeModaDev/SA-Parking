import { PublicClientApplication, type Configuration } from "@azure/msal-browser";

const configuration: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: import.meta.env.VITE_AZURE_AUTHORITY,
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: "localStorage" },
};

export const pca = new PublicClientApplication(configuration);