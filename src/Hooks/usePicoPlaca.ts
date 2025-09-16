// src/hooks/useRecipients.ts
import * as React from 'react';
import { useAuth } from '../auth/AuthProvider';   // tu provider MSAL
import { GraphRest } from '../graph/GraphRest';   // tu wrapper fetch -> Graph

type GraphUser = {
  id: string;
  displayName?: string;
  mail?: string | null;
  userPrincipalName?: string;
  accountEnabled?: boolean;
};

export type Recipient = { email: string; name?: string; id?: string };

export type UseRecipients = {
  // estado
  loading: boolean;
  error: string | null;
  recipients: Recipient[];
  totalFetched: number;   // total traído desde Graph antes de filtros locales
  totalDeduped: number;   // únicos por email

  // filtros/config
  onlyEnabledAccounts: boolean;
  setOnlyEnabledAccounts: (v: boolean) => void;

  search: string; // filtra por displayName / UPN (lado servidor cuando posible)
  setSearch: (s: string) => void;

  domainFilter: string; // p.ej. "estudiodemoda.com"
  setDomainFilter: (s: string) => void;

  previewLimit?: number; // recorta la lista resultante para pruebas
  setPreviewLimit: (n?: number) => void;

  // acciones
  loadRecipients: () => Promise<void>;
  reset: () => void;
};

/**
 * Hook que obtiene usuarios de Microsoft Graph:
 * - /users (paginado) con $select y filtros opcionales
 * - dedupe por email (mail || userPrincipalName)
 * - filtros locales por dominio y preview
 *
 * Permisos (delegated): User.Read.All (admin consent).
 */
export function useRecipients(): UseRecipients {
  const { ready, getToken } = useAuth();
  const graphRef = React.useRef<GraphRest | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [recipients, setRecipients] = React.useState<Recipient[]>([]);
  const [totalFetched, setTotalFetched] = React.useState(0);
  const [totalDeduped, setTotalDeduped] = React.useState(0);

  // filtros
  const [onlyEnabledAccounts, setOnlyEnabledAccounts] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [domainFilter, setDomainFilter] = React.useState(''); // ej: "estudiodemoda.com"
  const [previewLimit, setPreviewLimit] = React.useState<number | undefined>(undefined);

  // inicializa GraphRest cuando MSAL esté listo
  React.useEffect(() => {
    if (ready) graphRef.current = new GraphRest(getToken);
  }, [ready, getToken]);

  const buildUsersUrl = React.useCallback(() => {
    const select = encodeURIComponent('id,displayName,mail,userPrincipalName,accountEnabled');
    const top = 999; // máximo permitido por página
    const filters: string[] = [];

    // Filtro por estado de cuenta
    if (onlyEnabledAccounts) filters.push(`accountEnabled eq true`);

    // Búsqueda simple (servidor): contains tolower(displayName|userPrincipalName)
    const q = search.trim().toLowerCase().replace(/'/g, "''");
    if (q) {
      filters.push(
        `(contains(tolower(displayName),'${q}') or contains(tolower(userPrincipalName),'${q}'))`
      );
    }

    const base = `/users?$select=${select}&$top=${top}`;
    if (filters.length) {
      const filterExpr = encodeURIComponent(filters.join(' and '));
      return `${base}&$filter=${filterExpr}`;
    }
    return base;
  }, [onlyEnabledAccounts, search]);

  const loadRecipients = React.useCallback(async () => {
    if (!graphRef.current) {
      setError('Graph no inicializado.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const graph = graphRef.current;
      let url = buildUsersUrl();
      const acc: GraphUser[] = [];

      while (url) {
        const page = await graph.get<any>(url);
        const rows: any[] = Array.isArray(page?.value) ? page.value : [];
        for (const u of rows) {
          acc.push({
            id: u.id,
            displayName: u.displayName,
            mail: u.mail ?? null,
            userPrincipalName: u.userPrincipalName,
            accountEnabled: u.accountEnabled,
          });
        }
        const next = page?.['@odata.nextLink'] as string | undefined;
        url = next ? next.replace('https://graph.microsoft.com/v1.0', '') : '';
      }

      setTotalFetched(acc.length);

      // Dedupe por email (mail || upn)
      const emailToUser = new Map<string, GraphUser>();
      for (const u of acc) {
        const email = String(u.mail || u.userPrincipalName || '').trim().toLowerCase();
        if (!email) continue;
        // filtro por dominio (local)
        if (domainFilter) {
          const dom = domainFilter.trim().toLowerCase();
          if (!email.endsWith(`@${dom}`)) continue;
        }
        if (!emailToUser.has(email)) emailToUser.set(email, u);
      }

      const list = Array.from(emailToUser.entries()).map(([email, u]) => ({
        email,
        name: u.displayName,
        id: u.id,
      }));

      setTotalDeduped(list.length);

      // preview local
      setRecipients(typeof previewLimit === 'number' ? list.slice(0, previewLimit) : list);
    } catch (e: any) {
      console.error('[useRecipients] loadRecipients error:', e);
      setRecipients([]);
      setTotalFetched(0);
      setTotalDeduped(0);
      setError(e?.message ?? 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [buildUsersUrl, domainFilter, previewLimit]);

  const reset = React.useCallback(() => {
    setRecipients([]);
    setTotalFetched(0);
    setTotalDeduped(0);
    setError(null);
  }, []);

  return {
    loading,
    error,
    recipients,
    totalFetched,
    totalDeduped,

    onlyEnabledAccounts,
    setOnlyEnabledAccounts,

    search,
    setSearch,

    domainFilter,
    setDomainFilter,

    previewLimit,
    setPreviewLimit,

    loadRecipients,
    reset,
  };
}
