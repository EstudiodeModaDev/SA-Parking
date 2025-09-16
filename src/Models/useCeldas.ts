// src/hooks/useCeldas.ts
import * as React from 'react';
import { mapSlotToUI, type CreateForm, type SlotUI } from '../Models/Celdas';
import type { ParkingSlot } from '../Models/Parkingslot';
import { ParkingSlotsService } from '../Services/ParkingSlot.service'; // 100% Graph

export type UseParkingSlotsReturn = {
  rows: SlotUI[];
  loading: boolean;
  error: string | null;

  search: string;
  setSearch: (s: string) => void;

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

  reloadAll: () => Promise<void>;
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

/**
 * Hook adaptado a Microsoft Graph.
 * Pásale una instancia de ParkingSlotsService (Graph) ya configurada.
 */
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

  // ======= creación =======
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSaving, setCreateSaving] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [createForm, setCreateForm] = React.useState<CreateForm>({
    Title: '',
    TipoCelda: 'Carro',
    Activa: 'Activa',
    Itinerancia: 'Empleado Fijo',
  });

  const canCreate =
    createForm.Title.trim().length > 0 &&
    (createForm.TipoCelda === 'Carro' || createForm.TipoCelda === 'Moto') &&
    (createForm.Activa === 'Activa' || createForm.Activa === 'Inactiva') &&
    (createForm.Itinerancia === 'Empleado Itinerante' || createForm.Itinerancia === 'Directivo' || createForm.Itinerancia === 'Empleado Fijo');

  // =================== MODALES =================== //
  const openCreate = () => {
    setCreateForm({ Title: '', TipoCelda: 'Carro', Activa: 'Activa', Itinerancia: 'Empleado Fijo' });
    setCreateError(null);
    setCreateOpen(true);
  };
  const closeCreate = () => {
    setCreateOpen(false);
    setCreateError(null);
  };

  // =================== MANEJO DE CELDAS =================== //
  const toggleEstado = React.useCallback(async (slotId: string | number, currentStatus: 'Activa' | 'No Activa' | string) => {
    if (!slotId) { alert('ID inválido'); return; }
    try {
      setLoading(true);
      const nuevo: 'Activa' | 'No Activa' = currentStatus === 'Activa' ? 'No Activa' : 'Activa';
      await svc.update(String(slotId), { Activa: nuevo } as any);

      setAllRows(prev => prev.map(r => r.Id === Number(slotId) ? { ...r, Activa: nuevo } : r));
      setRows(prev => prev.map(r => r.Id === Number(slotId) ? { ...r, Activa: nuevo } : r));
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
      const payloadBase = {
        TipoCelda: createForm.TipoCelda,
        Activa: createForm.Activa,
        Itinerancia: createForm.Itinerancia,
      } as const;

      if (createForm.TipoCelda === 'Moto') {
        // crea varias celdas para motos con sufijos A..E
        const motosCells = ['A', 'B', 'C', 'D', 'E'];
        const payloads: Partial<ParkingSlot>[] = motosCells.map((suf) => ({
          Title: `${baseTitle}${suf}`,
          ...payloadBase,
        }));

        const results = await Promise.allSettled(
          payloads.map((p) => svc.create(p as any))
        );
        const failed = results.map((r, i) => ({ r, i })).filter(({ r }) => r.status === 'rejected');
        if (failed.length > 0) {
          const failedTitles = failed.map(({ i }) => String(payloads[i].Title)).join(', ');
          throw new Error(`No se pudieron crear estas celdas: ${failedTitles}. Verifica duplicados o permisos.`);
        }
      } else {
        // Carro: una sola
        const newSlot: Partial<ParkingSlot> = {
          Title: baseTitle,
          ...payloadBase,
        };
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

  // =================== RECARGA =================== //
  const reloadAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const MAX_FETCH = 2000;
      const term = search.trim().toLowerCase().replace(/'/g, "''");

      const filters: string[] = [];
      if (term) {
        // Graph usa OData v4: contains + tolower
        filters.push(`(contains(tolower(fields/Title),'${term}'))`);
      }
      if (tipo !== 'all') {
        filters.push(`fields/TipoCelda eq '${tipo}'`);
      }
      if (itinerancia !== 'all') {
        filters.push(`fields/Itinerancia eq '${itinerancia}'`);
      }

      const filterStr = filters.join(' and ');
      const items = await svc.getAll({
        orderby: 'fields/Title asc',
        top: MAX_FETCH,
        ...(filterStr ? { filter: filterStr } : {}),
      });

      const ui = items.map(mapSlotToUI);
      setAllRows(ui);
      setRows(ui.slice(0, pageSize));
      setPageIndex(0);
      setHasNext(ui.length > pageSize);
    } catch (e: any) {
      console.error('[useCeldas] reloadAll error:', e);
      setAllRows([]);
      setRows([]);
      setError(e?.message ?? 'Error al cargar celdas');
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  }, [svc, search, pageSize, tipo, itinerancia]);

  // =================== PAGINACIÓN =================== //
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

  // =================== EFECTOS =================== //
  React.useEffect(() => {
    let cancel = false;
    (async () => { if (!cancel) await reloadAll(); })();
    return () => { cancel = true; };
  }, [reloadAll]);

  React.useEffect(() => {
    reloadAll();
  }, [tipo, itinerancia]);

  // =================== RETURN =================== //
  return {
    rows,
    loading,
    error,

    search,
    setSearch,

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
