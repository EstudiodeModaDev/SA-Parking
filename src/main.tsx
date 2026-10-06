import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import AppRouter from "./router";
import { MsalProvider } from "@azure/msal-react";
import { pca } from "./auth/msal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NotificacionProvider from "./components/notificacion.component";

import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })
const queryClient = new QueryClient();

const AppProvider = () => (
  <MsalProvider instance={pca}>
    <QueryClientProvider client={queryClient}>
      <StrictMode>
        <NotificacionProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </NotificacionProvider>
      </StrictMode>
    </QueryClientProvider>
  </MsalProvider>
);

async function iniciarApp() {
  await pca.initialize();

  // Si venimos de Microsoft, aquí llega la cuenta
  const result = await pca.handleRedirectPromise();

  if (result) {
    pca.setActiveAccount(result.account);
  } else if (!pca.getActiveAccount() && pca.getAllAccounts().length > 0) {
    // Ya había sesión guardada (por ejemplo, el usuario recargó la página)
    pca.setActiveAccount(pca.getAllAccounts()[0]);
  }

  createRoot(document.getElementById("root")!).render(<AppProvider />);
}

iniciarApp();
