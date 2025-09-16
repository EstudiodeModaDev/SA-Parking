// src/hooks/useCollaborators.ts
import * as React from 'react';
import type { Collaborator, NewCollaborator } from '../Models/colaboradores';
import type { Colaboradoresfijos } from '../Models/Colaboradoresfijos';
import { ColaboradoresFijosService } from '../Services/Colaboradoresfijos.service'; // 100% Graph

// Mapeo simple desde el item (mapeado por tu servicio) hacia el UI
const mapToCollaborator = (r: any): Collaborator => ({
  id: Number(r.ID ?? r.Id ?? r.id ?? 0),
  nombre: String(r.Title ?? r.title ?? ''),
  correo: String(r.Correo ?? r.correo ?? '-'),
  tipoVehiculo: (r.Tipodevehiculo ?? r.tipoVehiculo) as any,
  placa: String(r.Placa ?? r.placa ?? ''),
  CodigoCelda: String(r.CodigoCelda ?? ''),
});

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

  reloadAll: () => Promise<void>;
  addCollaborator: (c: NewCollaborator) => Promise<void>;
  deleteCollaborator: (id: string | number) => Promise<void>;
};

/**
 * Hook adaptado a Microsoft Graph.
 * Recomendado: pasar una instancia de ColaboradoresFijosService (Graph) ya configurada.
 * Si prefieres, puedes crearla adentro, pero inyectarla facilita test y reutilización.
 */
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

  const deleteCollaborator = React.useCallback(async (id: string | number) => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      await svc.delete(String(id));

      setAllRows(prevAll => {
        const nextAll = prevAll.filter(r => String(r.id) !== String(id));
        // recalcular la página actual de forma segura
        const start = Math.min(pageIndex * pageSize, Math.max(0, nextAll.length - 1));
        const clampedStart = Math.floor(start / pageSize) * pageSize;
        setRows(nextAll.slice(clampedStart, clampedStart + pageSize));
        setPageIndex(clampedStart / pageSize);
        setHasNext(clampedStart + pageSize < nextAll.length);
        return nextAll;
      });
    } catch (e: any) {
      console.error('[useCollaborators] deleteCollaborator error:', e);
      setError(e?.message ?? 'Error al eliminar colaborador');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [svc, pageIndex, pageSize]);

  const addCollaborator = React.useCallback(async (c: NewCollaborator) => {
    try {
      setLoading(true);
      setError(null);

      const newCollab: Partial<Colaboradoresfijos> = {
        Title: c.nombre,
        Correo: c.correo,
        Tipodevehiculo: c.tipoVehiculo,
        Placa: c.placa,
        CodigoCelda: c.codigoCelda,
        // SpotAsignado: c.IdSpot, // si aplica
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

      setAllRows(prev => {
        const nextAll = [ui, ...prev];
        setRows(nextAll.slice(0, pageSize));
        setHasNext(nextAll.length > pageSize);
        setPageIndex(0);
        return nextAll;
      });
    } catch (e: any) {
      console.error('[useCollaborators] addCollaborator error:', e);
      setError(e?.message ?? 'No se pudo agregar el colaborador');
    } finally {
      setLoading(false);
    }
  }, [svc, pageSize]);

  const reloadAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const MAX_FETCH = 2000;
      const term = search.trim().toLowerCase().replace(/'/g, "''");

      const filters: string[] = [];
      if (term) {
        // Graph OData v4: contains + tolower
        filters.push(
          `(contains(tolower(fields/Title),'${term}') or contains(tolower(fields/Correo),'${term}'))`
        );
      }

      const items = await svc.getAll({
        top: MAX_FETCH,
        orderby: 'fields/Title asc',
        ...(filters.length ? { filter: filters.join(' and ') } : {}),
      });

      const ui = items.map(mapToCollaborator);
      setAllRows(ui);
      setRows(ui.slice(0, pageSize));
      setPageIndex(0);
      setHasNext(ui.length > pageSize);
    } catch (e: any) {
      console.error('[useCollaborators] reloadAll error:', e);
      setAllRows([]);
      setRows([]);
      setError(e?.message ?? 'Error al cargar colaboradores');
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  }, [svc, search, pageSize]);

  const setPageSize = React.useCallback((n: number) => {
    const size = Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
    _setPageSize(size);
    const slice = allRows.slice(0, size);
    setRows(slice);
    setPageIndex(0);
    setHasNext(allRows.length > size);
  }, [allRows]);

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

  React.useEffect(() => {
    let cancel = false;
    (async () => { if (!cancel) await reloadAll(); })();
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
