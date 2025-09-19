// src/hooks/useCollaborators.ts
import * as React from 'react';
import type { Collaborator, NewCollaborator } from '../Models/colaboradores';
import type { Colaboradoresfijos } from '../Models/Colaboradoresfijos';
import { ColaboradoresFijosService } from '../Services/Colaboradoresfijos.service';

// ---- Mapeo item → UI ----
const mapToCollaborator = (r: any): Collaborator => ({
  id: Number(r.ID ?? r.Id ?? r.id ?? 0),
  nombre: String(r.Title ?? r.title ?? ''),
  correo: String(r.Correo ?? r.correo ?? '-'),
  tipoVehiculo: (r.Tipodevehiculo ?? r.tipoVehiculo) as any,
  placa: String(r.Placa ?? r.placa ?? ''),
  CodigoCelda: String(r.CodigoCelda ?? ''),
});

// ---- Normalización: sin acentos, case-insensitive ----
const normalize = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    // Si tu TS/target no soporta \p{Diacritic}, cambia por /[\u0300-\u036f]/g
    .replace(/\p{Diacritic}/gu, '');

// ---- Filtro CLIENTE: SOLO nombre y correo ----
function filterLocal(items: Collaborator[], term: string): Collaborator[] {
  const q = normalize(term).trim();
  if (!q) return items;
  const parts = q.split(/\s+/).filter(Boolean);
  if (!parts.length) return items;

  return items.filter((it: Collaborator) => {
    const name = normalize(it.nombre);
    const mail = normalize(it.correo);
    // todas las palabras del término deben aparecer en nombre O correo
    return parts.every((p) => name.includes(p) || mail.includes(p));
  });
}

export type UseCollaboratorsReturn = {
  rows: Collaborator[];
  loading: boolean;
  error: string | null;

  search: string;
  setSearch: (s: string) => void;

  pageSize: number;
  setPageSize: (n: number) => void;
  pageIndex: number;
  hasNext: boolean;
  nextPage: () => void;
  prevPage: () => void;

  reloadAll: (termArg?: string) => Promise<void>;
  addCollaborator: (c: NewCollaborator) => Promise<void>;
  deleteCollaborator: (id: string | number) => Promise<void>;
};

export function useCollaborators(
  svc: ColaboradoresFijosService
): UseCollaboratorsReturn {
  const [allRows, setAllRows] = React.useState<Collaborator[]>([]);
  const [rows, setRows] = React.useState<Collaborator[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState('');
  const [pageSize, _setPageSize] = React.useState(20);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [hasNext, setHasNext] = React.useState(false);

  // Maestro en memoria para filtrar en cliente
  const masterRef = React.useRef<Collaborator[]>([]);

  // ---------- CRUD ----------
  const deleteCollaborator = React.useCallback(
    async (id: string | number) => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);

        await svc.delete(String(id));
        reloadAll()
      } catch (e: any) {
        console.error('[useCollaborators] deleteCollaborator error:', e);
        setError(e?.message ?? 'Error al eliminar colaborador');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [svc, pageIndex, pageSize, search]
  );

  const addCollaborator = React.useCallback(
    async (c: NewCollaborator) => {
      try {
        setLoading(true);
        setError(null);

        const newCollab: Partial<Colaboradoresfijos> = {
          Title: c.nombre,
          Correo: c.correo,
          Tipodevehiculo: c.tipoVehiculo,
          Placa: c.placa,
          CodigoCelda: c.codigoCelda,
        };

        const created = await svc.create(newCollab as any);

        const ui: Collaborator = created
          ? {
              id: Number((created as any).ID ?? Date.now()),
              nombre: String((created as any).Title ?? c.nombre),
              correo: String((created as any).Correo ?? c.correo),
              tipoVehiculo: ((created as any).Tipodevehiculo ?? c.tipoVehiculo) as any,
              placa: String((created as any).Placa ?? c.placa),
              CodigoCelda: String((created as any).CodigoCelda ?? c.codigoCelda ?? ''),
            }
          : {
              id: Date.now(),
              nombre: c.nombre,
              correo: c.correo,
              tipoVehiculo: c.tipoVehiculo as any,
              placa: c.placa,
              CodigoCelda: String(c.codigoCelda ?? ''),
            };

        masterRef.current = [ui, ...masterRef.current];

        const filtered = filterLocal(masterRef.current, search);
        setAllRows(filtered);
        setRows(filtered.slice(0, pageSize));
        setHasNext(filtered.length > pageSize);
        setPageIndex(0);
      } catch (e: any) {
        console.error('[useCollaborators] addCollaborator error:', e);
        setError(e?.message ?? 'No se pudo agregar el colaborador');
      } finally {
        setLoading(false);
      }
    },
    [svc, pageSize, search]
  );

  // ---------- Carga (SIN $filter; todo el filtro en cliente) ----------
  const reloadAll = React.useCallback(
    async (termArg?: string) => {
      setLoading(true);
      setError(null);
      try {
        const MAX_FETCH = 2000;
        const items = await svc.getAll({
          top: MAX_FETCH,
          orderby: 'fields/Title asc', // opcional
        });

        const master: Collaborator[] = (items as any[]).map(mapToCollaborator);
        masterRef.current = master;

        const term = typeof termArg === 'string' ? termArg : search;
        const filtered = filterLocal(master, term);

        setAllRows(filtered);
        setRows(filtered.slice(0, pageSize));
        setPageIndex(0);
        setHasNext(filtered.length > pageSize);
      } catch (e: any) {
        console.error('[useCollaborators] reloadAll error:', e);
        setAllRows([]);
        setRows([]);
        setError(e?.message ?? 'Error al cargar colaboradores');
        setHasNext(false);
      } finally {
        setLoading(false);
      }
    },
    [svc, pageSize]
  );

  // ---------- Paginación ----------
  const setPageSize = React.useCallback(
    (n: number) => {
      const size = Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
      _setPageSize(size);
      const slice = allRows.slice(0, size);
      setRows(slice);
      setPageIndex(0);
      setHasNext(allRows.length > size);
    },
    [allRows]
  );

  const nextPage = React.useCallback(() => {
    if (loading) return;
    const next = pageIndex + 1;
    const start = next * pageSize;
    const end = start + pageSize;
    if (start >= allRows.length) return;
    setRows(allRows.slice(start, end));
    setPageIndex(next);
    setHasNext(end < allRows.length);
  }, [loading, pageIndex, pageSize, allRows]);

  const prevPage = React.useCallback(() => {
    if (loading || pageIndex === 0) return;
    const prev = pageIndex - 1;
    const start = prev * pageSize;
    const end = start + pageSize;
    setRows(allRows.slice(start, end));
    setPageIndex(prev);
    setHasNext(allRows.length > end);
  }, [loading, pageIndex, pageSize, allRows]);

  // ---------- Búsqueda con debounce (no bloquea escritura) ----------
  const debounceRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const filtered = filterLocal(masterRef.current, search);
      setAllRows(filtered);
      setRows(filtered.slice(0, pageSize));
      setPageIndex(0);
      setHasNext(filtered.length > pageSize);
    }, 250) as unknown as number;

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [search, pageSize]);

  // ---------- Carga inicial ----------
  React.useEffect(() => {
    let cancel = false;
    (async () => { if (!cancel) await reloadAll(''); })();
    return () => { cancel = true; };
  }, [reloadAll]);

  return {
    rows,
    loading,
    error,

    search,
    setSearch,

    pageSize,
    setPageSize,
    pageIndex,
    hasNext,
    nextPage,
    prevPage,

    reloadAll,
    addCollaborator,
    deleteCollaborator,
  };
}
