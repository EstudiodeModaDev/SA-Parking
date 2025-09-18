// src/hooks/useCeldas.ts
import * as React from 'react';
import { mapSlotToUI, type CreateForm, type SlotUI } from '../Models/Celdas';
import type { ParkingSlot } from '../Models/Parkingslot';
import { ParkingSlotsService } from '../Services/ParkingSlot.service';

// --- Normalización: sin acentos + minúsculas
const normalize = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, ''); // si tu TS no soporta \p{…}: usa .replace(/[\u0300-\u036f]/g, '')

// Item mínimo compatible Graph/REST para leer Title
type ListItemMin = { fields?: { Title?: string; TipoCelda?: string; Itinerancia?: string; Activa?: string }; Title?: string; TipoCelda?: string; Itinerancia?: string; Activa?: string; Id?: number | string; ID?: number | string; id?: number | string };
const getTitle = (it: ListItemMin) => String(it?.fields?.Title ?? it?.Title ?? '');
const getTipo  = (it: ListItemMin) => String(it?.fields?.TipoCelda ?? it?.TipoCelda ?? '');
const getItin  = (it: ListItemMin) => String(it?.fields?.Itinerancia ?? it?.Itinerancia ?? '');

// ---- Filtro local (contains real) por Title + filtros de tipo/itinerancia
function filterLocal(items: ListItemMin[], term: string, tipo: 'all'|'Carro'|'Moto', itinerancia: 'all'|'Empleado Fijo'|'Empleado Itinerante'|'Directivo') {
  const q = normalize(term).trim();
  const parts = q ? q.split(/\s+/).filter(Boolean) : [];

  return items.filter((it) => {
    // filtros por choice
    if (tipo !== 'all' && getTipo(it) !== tipo) return false;
    if (itinerancia !== 'all' && getItin(it) !== itinerancia) return false;

    // texto (Title)
    if (!parts.length) return true;
    const haystack = normalize(getTitle(it));
    return parts.every((p) => haystack.includes(p));
  });
}

export type UseParkingSlotsReturn = {
  rows: SlotUI[];
  loading: boolean;
  error: string | null;

  search: string;
  setSearch: (s: string) => void;
  onSearchEnter: (e: React.KeyboardEvent<HTMLInputElement>) => void;

  tipo: 'all' | 'Carro' | 'Moto';
  setTipo: (t: 'all' | 'Carro' | 'Moto') => void;

  itinerancia: 'all' | 'Empleado Fijo' | 'Empleado Itinerante' | 'Directivo';
  setItinerancia: (i: 'all' | 'Empleado Fijo' | 'Empleado Itinerante' | 'Directivo') => void;

  pageSize: number;
  setPageSize: (n: number) => void;
  pageIndex: number;
  hasNext: boolean;
  nextPage: () => void;
  prevPage: () => void;

  reloadAll: (termArg?: string) => Promise<void>;
  toggleEstado: (slotId: string | number, currentStatus: 'Activa' | 'No Activa' | string) => Promise<void>;

  createOpen: boolean;
  createSaving: boolean;
  createError: string | null;
  createForm: CreateForm;
  setCreateForm: React.Dispatch<React.SetStateAction<CreateForm>>;
  canCreate: boolean;
  openModal: () => void;
  closeModal: () => void;
  create: () => Promise<void>;
};

export function useCeldas(svc: ParkingSlotsService): UseParkingSlotsReturn {
  const [allRows, setAllRows] = React.useState<SlotUI[]>([]);
  const [rows, setRows] = React.useState<SlotUI[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState('');
  const [tipo, setTipo] = React.useState<'all' | 'Carro' | 'Moto'>('all');
  const [itinerancia, setItinerancia] = React.useState<'all' | 'Empleado Fijo' | 'Empleado Itinerante' | 'Directivo'>('all');

  const [pageSize, _setPageSize] = React.useState(50);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [hasNext, setHasNext] = React.useState(false);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSaving, setCreateSaving] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [createForm, setCreateForm] = React.useState<CreateForm>({
    Title: '',
    TipoCelda: 'Carro',
    Activa: 'Activa',
    Itinerancia: 'Empleado Fijo',
  });

  // Maestro en memoria (items crudos) para filtrar en cliente
  const masterRef = React.useRef<ListItemMin[]>([]);

  const canCreate =
    createForm.Title.trim().length > 0 &&
    (createForm.TipoCelda === 'Carro' || createForm.TipoCelda === 'Moto') &&
    (createForm.Activa === 'Activa' || createForm.Activa === 'Inactiva') &&
    (createForm.Itinerancia === 'Empleado Itinerante' || createForm.Itinerancia === 'Directivo' || createForm.Itinerancia === 'Empleado Fijo');

  const openCreate = () => {
    setCreateForm({ Title: '', TipoCelda: 'Carro', Activa: 'Activa', Itinerancia: 'Empleado Fijo' });
    setCreateError(null);
    setCreateOpen(true);
  };
  const closeCreate = () => { setCreateOpen(false); setCreateError(null); };

  // -------- acciones ----------
  const toggleEstado = React.useCallback(async (slotId: string | number, currentStatus: 'Activa' | 'No Activa' | string) => {
    if (!slotId) { alert('ID inválido'); return; }
    try {
      setLoading(true);
      const nuevo: 'Activa' | 'No Activa' = currentStatus === 'Activa' ? 'No Activa' : 'Activa';
      await svc.update(String(slotId), { Activa: nuevo } as any);
      // refleja en memoria + UI
      const apply = (arr: SlotUI[]) => arr.map(r => r.Id === Number(slotId) ? { ...r, Activa: nuevo } : r);
      setAllRows(prev => apply(prev));
      setRows(prev => apply(prev));
    } catch (e: any) {
      console.error('[useCeldas] toggleEstado error:', e);
      alert(e?.message ?? 'No se pudo actualizar el estado');
    } finally {
      setLoading(false);
    }
  }, [svc]);

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreateSaving(true);
    setCreateError(null);
    try {
      const baseTitle = createForm.Title.trim();
      const payloadBase = { TipoCelda: createForm.TipoCelda, Activa: createForm.Activa, Itinerancia: createForm.Itinerancia } as const;

      if (createForm.TipoCelda === 'Moto') {
        const motosCells = ['A', 'B', 'C', 'D', 'E'];
        const payloads: Partial<ParkingSlot>[] = motosCells.map((suf) => ({ Title: `${baseTitle}${suf}`, ...payloadBase }));
        const results = await Promise.allSettled(payloads.map((p) => svc.create(p as any)));
        const failed = results.map((r, i) => ({ r, i })).filter(({ r }) => r.status === 'rejected');
        if (failed.length > 0) {
          const failedTitles = failed.map(({ i }) => String(payloads[i].Title)).join(', ');
          throw new Error(`No se pudieron crear estas celdas: ${failedTitles}. Verifica duplicados o permisos.`);
        }
      } else {
        const newSlot: Partial<ParkingSlot> = { Title: baseTitle, ...payloadBase };
        await svc.create(newSlot as any);
      }

      closeCreate();
      await reloadAll();
    } catch (e: any) {
      setCreateError(e?.message ?? 'No se pudo crear la celda');
    } finally {
      setCreateSaving(false);
    }
  };

  // -------- carga (sin $filter; todo se filtra localmente) ----------
  const reloadAll = React.useCallback(async (termArg?: string) => {
    setLoading(true);
    setError(null);
    try {
      const MAX_FETCH = 2000;
      const items = await svc.getAll({
        top: MAX_FETCH,
        orderby: 'fields/Title asc', // opcional
        // sin $filter: reducimos acoplamiento con Graph
      });

      masterRef.current = items as unknown as ListItemMin[];

      // aplica filtro local + mapeo
      const term = typeof termArg === 'string' ? termArg : search;
      const filtered = filterLocal(masterRef.current, term, tipo, itinerancia);
      const ui = filtered.map(mapSlotToUI);

      setAllRows(ui);
      setRows(ui.slice(0, pageSize));
      setPageIndex(0);
      setHasNext(ui.length > pageSize);
    } catch (e: any) {
      console.error('[useCeldas] reloadAll error:', e);
      setAllRows([]); setRows([]);
      setError(e?.message ?? 'Error al cargar celdas');
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  }, [svc, pageSize, search, tipo, itinerancia]);

  // -------- paginación ----------
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

  // -------- búsqueda ----------
  // Enter explícito (opcional)
  const onSearchEnter = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const value = (e.currentTarget?.value ?? '').trim();
    setSearch(value);
    // re-filtra localmente (sin pedir a Graph)
    const filtered = filterLocal(masterRef.current, value, tipo, itinerancia);
    const ui = filtered.map(mapSlotToUI);
    setAllRows(ui);
    setRows(ui.slice(0, pageSize));
    setPageIndex(0);
    setHasNext(ui.length > pageSize);
  }, [pageSize, tipo, itinerancia]);

  // Debounce mientras escribes → no bloquea la UI
  const debounceRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const filtered = filterLocal(masterRef.current, search, tipo, itinerancia);
      const ui = filtered.map(mapSlotToUI);
      setAllRows(ui);
      setRows(ui.slice(0, pageSize));
      setPageIndex(0);
      setHasNext(ui.length > pageSize);
    }, 250) as unknown as number;

    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [search, tipo, itinerancia, pageSize]);

  // Carga inicial
  React.useEffect(() => { reloadAll(''); }, [reloadAll]);

  return {
    rows,
    loading,
    error,

    search,
    setSearch,
    onSearchEnter,

    tipo,
    setTipo,

    itinerancia,
    setItinerancia,

    pageSize,
    setPageSize,
    pageIndex,
    hasNext,
    nextPage,
    prevPage,

    reloadAll,
    toggleEstado,

    createOpen,
    createSaving,
    createError,
    createForm,
    setCreateForm,
    canCreate,
    openModal: openCreate,
    closeModal: closeCreate,
    create: handleCreate,
  };
}
