// src/hooks/useMisReservas.ts (versión Graph)
import * as React from 'react';
import type { ReservationUI } from '../Models/Reservation';
import type { FilterMode } from '../Models/misReservas';
import { last30Days } from '../utils/date';
import { ReservationsService } from '../Services/Reservations.service'; // <-- tu servicio 100% Graph

// Normalizar para mostrar (ajusta a tu mapeo real si difiere)
const mapToUI = (r: any): ReservationUI => {
  // r viene mapeado por tu ReservationsService.toModel()
  const dateStr = String(r.Date ?? '').slice(0, 10);
  const spotId = Number(r.SpotIdLookupId ?? r.SpotId ?? 0);
  const spotTitle = String(r.SpotId ?? (spotId ? String(spotId) : ''));

  const ui: ReservationUI & { __UserMail?: string } = {
    Id: Number(r.ID ?? r.Id ?? r.id ?? 0),
    Date: /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : '',
    Turn: String(r.Turn ?? ''),
    SpotId: spotId,
    Spot: spotTitle,
    VehicleType: String((r.VehicleType ?? r.VehivleType) ?? ''), // por si tu internal tuvo el typo
    Status: String(r.Status ?? ''),
    User: String(r.NombreUsuario ?? ''),
  };

  // Para admins: mostrar dueño si el servicio lo mapea en Title/Correo
  const mail = r.Title ?? r.Usuario ?? r.UserMail ?? r.Correo ?? null;
  if (mail) ui.__UserMail = String(mail);

  return ui;
};

export type UseMisReservasReturn = {
  rows: ReservationUI[];
  loading: boolean;
  error: string | null;

  range: { from: string; to: string };
  setRange: React.Dispatch<React.SetStateAction<{ from: string; to: string }>>;
  rangeInvalid: boolean;
  applyRange: () => void;

  pageSize: number;
  setPageSize: (n: number) => void;
  pageIndex: number;
  hasNext: boolean;
  nextPage: () => void;
  prevPage: () => void;

  reload: () => void;
  cancelReservation: (id: number) => Promise<void>;

  filterMode: FilterMode;
  setFilterMode: (m: FilterMode) => void;
};

/**
 * Hook adaptado a Microsoft Graph.
 * Pásale tu instancia de ReservationsService (Graph) + mail del usuario y si es admin.
 */
export function useMisReservas(
  svc: ReservationsService,
  userMail: string,
  isAdmin = false
): UseMisReservasReturn {
  const [allRows, setAllRows] = React.useState<ReservationUI[]>([]);
  const [filteredRows, setFilteredRows] = React.useState<ReservationUI[]>([]);
  const [rows, setRows] = React.useState<ReservationUI[]>([]);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [range, setRange] = React.useState(last30Days);
  const rangeInvalid = !range.from || !range.to || range.from > range.to;

  const [pageSize, _setPageSize] = React.useState(20);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [hasNext, setHasNext] = React.useState(false);

  const [filterMode, setFilterMode] = React.useState<FilterMode>('upcoming-active');

  const mailSafe = (userMail ?? '').replace(/'/g, "''");
  const todayLocal = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const applyClientFilter = React.useCallback((source: ReservationUI[]) => {
    let data = source;

    if (filterMode === 'upcoming-active') {
      data = source.filter(r => r.Status === 'Activa' && r.Date >= todayLocal);
    } else if (filterMode === 'history') {
      data = source.filter(r => r.Status !== 'Activa');
    }

    setFilteredRows(data);
    const firstSlice = data.slice(0, pageSize);
    setRows(firstSlice);
    setPageIndex(0);
    setHasNext(data.length > pageSize);
  }, [filterMode, pageSize, todayLocal]);

  const fetchAllForRange = React.useCallback(async () => {
    if (!svc) return;

    if (!isAdmin && !mailSafe) {
      setAllRows([]);
      setFilteredRows([]);
      setRows([]);
      setError('No hay email de usuario para cargar las reservas.');
      return;
    }
    if (rangeInvalid) {
      setError('Rango de fechas inválido.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const MAX_FETCH = 2000;
      const parts: string[] = [];

      // Filtro por dueño (no admin)
      if (!isAdmin) {
        // si guardas el correo en Title:
        parts.push(`fields/Title eq '${mailSafe}'`);
        // si usas otra columna (p.ej., NombreUsuario o Correo), cámbiala aquí
        // parts.push(`fields/NombreUsuario eq '${mailSafe}'`);
      }

      // Filtro de fechas (Date es DateOnly? deja 'YYYY-MM-DD'; si es DateTime usa T00:00:00Z)
      if (filterMode === 'upcoming-active') {
        parts.push(`fields/Date ge '${todayLocal}'`);
      } else {
        parts.push(`fields/Date ge '${range.from}'`);
        parts.push(`fields/Date le '${range.to}'`);
      }

      const filter = parts.join(' and ');

      const items = await svc.getAll({
        filter,
        orderby: 'fields/Date desc',
        top: MAX_FETCH,
      });

      const ui = items.map(mapToUI);

      setAllRows(ui);
      applyClientFilter(ui);
    } catch (e: any) {
      console.error('[useMisReservas] fetchAllForRange error:', e);
      setAllRows([]);
      setFilteredRows([]);
      setRows([]);
      setError(e?.message ?? 'Error al cargar');
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  }, [svc, isAdmin, mailSafe, range.from, range.to, rangeInvalid, filterMode, todayLocal, applyClientFilter]);

  const applyRange = React.useCallback(() => {
    if (rangeInvalid) {
      setError('El rango seleccionado es inválido. "Desde" no puede ser mayor que "Hasta".');
      return;
    }
    fetchAllForRange();
  }, [rangeInvalid, fetchAllForRange]);

  const setPageSize = React.useCallback((n: number) => {
    const size = Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
    _setPageSize(size);

    const slice = filteredRows.slice(0, size);
    setRows(slice);
    setPageIndex(0);
    setHasNext(filteredRows.length > size);
  }, [filteredRows]);

  const nextPage = React.useCallback(() => {
    if (loading) return;
    const next = pageIndex + 1;
    const start = next * pageSize;
    const end = start + pageSize;
    if (start >= filteredRows.length) return;
    setRows(filteredRows.slice(start, end));
    setPageIndex(next);
    setHasNext(end < filteredRows.length);
  }, [loading, pageIndex, pageSize, filteredRows]);

  const prevPage = React.useCallback(() => {
    if (loading || pageIndex === 0) return;
    const prev = pageIndex - 1;
    const start = prev * pageSize;
    const end = start + pageSize;
    setRows(filteredRows.slice(start, end));
    setPageIndex(prev);
    setHasNext(filteredRows.length > end);
  }, [loading, pageIndex, pageSize, filteredRows]);

  const reload = React.useCallback(() => {
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    setRows(filteredRows.slice(start, end));
    setHasNext(end < filteredRows.length);
  }, [filteredRows, pageIndex, pageSize]);

  const cancelReservation = React.useCallback(async (id: number) => {
    if (!id) {
      alert('ID de reserva inválido');
      return;
    }
    try {
      setLoading(true);
      await svc.update(String(id), { Status: 'Cancelada' } as any);
      await fetchAllForRange();
    } catch (e: any) {
      console.error('[useMisReservas] cancelReservation error:', e);
      alert('No se pudo cancelar la reserva: ' + (e?.message ?? 'error desconocido'));
    } finally {
      setLoading(false);
    }
  }, [svc, fetchAllForRange]);

  // re-filtrar cuando cambie el modo
  React.useEffect(() => {
    applyClientFilter(allRows);
  }, [filterMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // si cambia isAdmin en caliente, ajusta modo por UX (opcional)
  React.useEffect(() => {
    setFilterMode('upcoming-active');
  }, [isAdmin]);

  // Carga inicial
  React.useEffect(() => {
    let cancel = false;
    (async () => { if (!cancel) await fetchAllForRange(); })();
    return () => { cancel = true; };
  }, [fetchAllForRange]);

  // Recarga cada 5 minutos (solo cuando la pestaña está visible)
  React.useEffect(() => {
    const T = 5 * 60 * 1000; // 5 min
    let id: number | null = null;

    const tick = () => { fetchAllForRange(); };
    const start = () => { if (id == null) id = window.setInterval(tick, T); };
    const stop = () => { if (id != null) { window.clearInterval(id); id = null; } };

    if (!document.hidden) start();
    const onVis = () => { if (document.hidden) stop(); else { tick(); start(); } };
    document.addEventListener('visibilitychange', onVis);

    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [fetchAllForRange]);

  return {
    rows,
    loading,
    error,

    range,
    setRange,
    rangeInvalid,
    applyRange,

    pageSize,
    setPageSize,
    pageIndex,
    hasNext,
    nextPage,
    prevPage,

    reload,
    cancelReservation,

    filterMode,
    setFilterMode,
  };
}
