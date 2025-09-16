// src/hooks/useWorkers.ts (100% Graph)
import * as React from 'react';
import { useAuth } from '../auth/AuthProvider';
import { GraphRest } from '../graph/GraphRest';
import type { Worker } from '../Models/shared';

type Options = {
  /** Solo cuentas habilitadas (por defecto: true) */
  onlyEnabled?: boolean;
  /** Filtra por dominio (ej: "estudiodemoda.com") */
  domainFilter?: string;
  /** Máx usuarios por página UI al inicio (no afecta carga Graph) */
  previewLimit?: number;
};

const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

// --- Caché por combinación de opciones (para evitar refetch innecesario)
type CacheKey = string;
const cache: Record<CacheKey, { data: Worker[] | null; promise: Promise<Worker[]> | null }> = {};

function cacheKey(opts: Options) {
  return JSON.stringify({
    onlyEnabled: opts.onlyEnabled ?? true,
    domainFilter: (opts.domainFilter ?? '').toLowerCase(),
  });
}

function mapRaw(u: any, i: number): Worker {
  const id = u.id ?? u.userPrincipalName ?? u.mail ?? i;
  return {
    id: String(id),
    displayName: String(u.displayName ?? '—'),
    mail: String(u.mail ?? u.userPrincipalName ?? ''),
    jobTitle: String(u.jobTitle ?? ''),
  };
}

async function fetchUsersFromGraph(graph: GraphRest, opts: Options): Promise<Worker[]> {
  const key = cacheKey(opts);
  if (cache[key]?.data) return cache[key]!.data as Worker[];
  if (!cache[key]) cache[key] = { data: null, promise: null };

  if (!cache[key]!.promise) {
    const onlyEnabled = opts.onlyEnabled ?? true;
    const domain = (opts.domainFilter ?? '').toLowerCase();

    const select = encodeURIComponent('id,displayName,mail,userPrincipalName,jobTitle,accountEnabled');
    const top = 999;
    const filters: string[] = [];
    if (onlyEnabled) filters.push('accountEnabled eq true');

    let url = `/users?$select=${select}&$top=${top}` + (filters.length ? `&$filter=${encodeURIComponent(filters.join(' and '))}` : '');
    const acc: any[] = [];

    async function pageLoop() {
      while (url) {
        const page = await graph.get<any>(url);
        const rows: any[] = Array.isArray(page?.value) ? page.value : [];
        acc.push(...rows);
        const next = page?.['@odata.nextLink'] as string | undefined;
        url = next ? next.replace('https://graph.microsoft.com/v1.0', '') : '';
      }
    }

    cache[key]!.promise = pageLoop()
      .then(() => {
        // dedupe por email (mail || UPN)
        const emailToUser = new Map<string, any>();
        for (const u of acc) {
          const email = String(u.mail || u.userPrincipalName || '').trim().toLowerCase();
          if (!email) continue;
          if (domain && !email.endsWith(`@${domain}`)) continue;
          if (!emailToUser.has(email)) emailToUser.set(email, u);
        }
        const mapped = Array.from(emailToUser.values()).map(mapRaw);
        cache[key]!.data = mapped;
        return mapped;
      })
      .finally(() => {
        cache[key]!.promise = null;
      });
  }

  return cache[key]!.promise as Promise<Worker[]>;
}

export function useWorkers(options: Options = {}) {
  const { ready, getToken } = useAuth();
  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const key = cacheKey(options);

  const load = React.useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    try {
      const graph = new GraphRest(getToken);
      const data = await fetchUsersFromGraph(graph, options);
      setWorkers(typeof options.previewLimit === 'number' ? data.slice(0, options.previewLimit) : data);
    } catch (e: any) {
      setWorkers([]);
      setError(e?.message ?? 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  }, [ready, getToken, options]);

  React.useEffect(() => { load(); }, [load, key]);

  const filter = React.useCallback((term: string) => {
    if (!term) return workers;
    const q = norm(term);
    return workers.filter(w => norm(`${w.displayName} ${w.jobTitle ?? ''} ${w.mail ?? ''}`).includes(q));
  }, [workers]);

  const refresh = React.useCallback(async () => {
    if (!ready) return;
    // invalida cache para estas opciones y recarga
    cache[key] = { data: null, promise: null };
    await load();
  }, [ready, load, key]);

  return { workers, loading, error, filter, refresh };
}
