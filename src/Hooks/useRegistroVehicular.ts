// src/Hooks/useRegistroVehicular.ts
import * as React from 'react';
import type { RegistroVehicularSP } from '../Models/RegistroVehicular';
import type { RegistroVehicularService } from '../Services/RegistroVehicular.service';

const mapToCollaborator = (r: any): RegistroVehicularSP => ({
  id: Number(r.ID ?? r.Id ?? r.id ?? 0),
  Title: String(r.Title ?? r.title ?? ''),
  Cedula: String(r.Cedula ?? r.cedula ?? ''),
  TipoVeh: String(r.TipoVeh ?? r.tipoVehiculo ?? ''),
  PlacaVeh: String(r.PlacaVeh ?? r.placa ?? ''),
  CorreoReporte: String(r.CorreoReporte ?? r.correo ?? ''),
});

const normalize = (s: unknown) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

function filterLocal(items: RegistroVehicularSP[], term: string): RegistroVehicularSP[] {
  const q = normalize(term).trim();
  if (!q) return items;
  const parts = q.split(/\s+/).filter(Boolean);
  if (!parts.length) return items;
  return items.filter((it) => {
    const name = normalize(it.Title);
    const mail = normalize(it.CorreoReporte);
    return parts.every((p) => name.includes(p) || mail.includes(p));
  });
}

export type useRegistroVehicularReturn = {
  rows: RegistroVehicularSP[];
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
  addVeh: (c: RegistroVehicularSP) => Promise<void>;
  deleteVeh: (id: string | number) => Promise<void>;
};

export function useRegistroVehicular(svc: RegistroVehicularService): useRegistroVehicularReturn {
  const [allRows, setAllRows] = React.useState<RegistroVehicularSP[]>([]);
  const [rows, setRows] = React.useState<RegistroVehicularSP[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState('');
  const [pageSize, _setPageSize] = React.useState(5);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [hasNext, setHasNext] = React.useState(false);

  const masterRef = React.useRef<RegistroVehicularSP[]>([]);

  const reloadAll = React.useCallback(async (termArg?: string) => {
    setLoading(true);
    setError(null);
    try {
      const items = await svc.getAll({ top: 2000, orderby: 'fields/Title asc' });
      const master: RegistroVehicularSP[] = (items as any[]).map(mapToCollaborator);
      masterRef.current = master;

      const term = typeof termArg === 'string' ? termArg : search;
      const filtered = filterLocal(master, term);

      setAllRows(filtered);
      setRows(filtered.slice(0, pageSize));
      setPageIndex(0);
      setHasNext(filtered.length > pageSize);
    } catch (e: any) {
      console.error('[useRegistroVehicular] reloadAll error:', e);
      setAllRows([]); setRows([]);
      setError(e?.message ?? 'Error al cargar registros');
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  }, [svc, pageSize, search]);

  const addVeh = React.useCallback(async (c: RegistroVehicularSP) => {
    try {
      setLoading(true);
      setError(null);
      const payload: Partial<RegistroVehicularSP> = {
        Title: c.Title,
        Cedula: c.Cedula,
        TipoVeh: c.TipoVeh,
        PlacaVeh: c.PlacaVeh,
        CorreoReporte: c.CorreoReporte,
      };
      await svc.create(payload as any);
      await reloadAll();
    } catch (e: any) {
      console.error('[useRegistroVehicular] addVeh error:', e);
      setError(e?.message ?? 'No se pudo agregar el registro');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [svc, reloadAll]);

  const deleteVeh = React.useCallback(async (id: string | number) => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      await svc.delete(String(id));
      await reloadAll();
    } catch (e: any) {
      console.error('[useRegistroVehicular] deleteVeh error:', e);
      setError(e?.message ?? 'Error al eliminar registro');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [svc, reloadAll]);

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

  // Debounce de búsqueda
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

    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [search, pageSize]);

  // Carga inicial
  React.useEffect(() => {
    let cancel = false;
    (async () => { if (!cancel) await reloadAll(''); })();
    return () => { cancel = true; };
  }, [reloadAll]);

  return {
    rows, loading, error,
    search, setSearch,
    pageSize, setPageSize, pageIndex, hasNext, nextPage, prevPage,
    reloadAll, addVeh, deleteVeh,
  };
}
