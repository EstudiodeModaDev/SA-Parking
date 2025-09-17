// src/Hooks/useMisReservas.ts
import * as React from 'react';
import type { Reservations, ReservationUI } from '../Models/Reservation';
import type { GetAllOpts } from '../Models/Commons';
import { ReservationsService } from '../Services/Reservations.service';

// ===== Helpers =====
const toISODate = (d: Date) => d.toISOString().slice(0, 10);

// Mapea del modelo (ya “toModel” del service) a la fila UI
const mapModelToUI = (m: Reservations): ReservationUI => ({
  Id: Number(m.ID ?? 0),
  Date: String(m.Date ?? '').slice(0, 10),
  Turn: String(m.Turn ?? ''),
  SpotId: Number(m.SpotIdLookupId ?? 0),
  Spot: String(m.SpotCode ?? (m.SpotIdLookupId ?? '')),
  VehicleType: String(m.VehicleType ?? ''),
  Status: String(m.Status ?? ''),
  User: String(m.NombreUsuario ?? m.Title ?? ''),
});

export type FilterMode = 'upcoming-active' | 'history';

export type Range = {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
};

export function useMisReservas(
  reservationsSvc: ReservationsService,
  userMail: string,
  isAdmin: boolean
) {
  // UI state
  const [rows, setRows] = React.useState<ReservationUI[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const [filterMode, setFilterMode] = React.useState<FilterMode>('upcoming-active');

  const today = React.useMemo(() => toISODate(new Date()), []);
  const [range, setRange] = React.useState<Range>({ from: today, to: today });

  const [pageSize, setPageSize] = React.useState<number>(10);
  const [pageIndex, setPageIndex] = React.useState<number>(0);

  // “tick” para forzar recargas controladas (applyRange / reloadAll)
  const [reloadTick, setReloadTick] = React.useState(0);

  // ===== construir filtro OData según modo =====
  const buildFilter = React.useCallback((): GetAllOpts => {
    const filters: string[] = [];
    if (!isAdmin && userMail?.trim()) {
      const emailSafe = userMail.replace(/'/g, "''");
      filters.push(`fields/Title eq '${emailSafe}'`);
    }

    if (filterMode === 'upcoming-active') {
      // Próximas ACTIVAS (>= hoy)
      filters.push(`fields/Date ge '${today}'`);
      filters.push(`fields/Status eq 'Activa'`);
    } else {
      // Historial dentro del rango (cualquier estado)
      if (range.from) filters.push(`fields/Date ge '${range.from}'`);
      if (range.to)   filters.push(`fields/Date le '${range.to}'`);
    }

    const orderby = 'fields/Date asc,fields/Turn asc,fields/ID asc';
    const filter = filters.join(' and ');

    return { filter, orderby, top: 2000 };
  }, [isAdmin, userMail, filterMode, range.from, range.to, today]);

  // ===== cargar datos =====
  const fetchRows = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const opts = buildFilter();
      // DEBUG opcional
      // console.log('[MisReservas] getAll opts ->', opts);

      const list = await reservationsSvc.getAll(opts);
      const mapped = (Array.isArray(list) ? list : []).map(mapModelToUI);

      setRows(mapped);
      setPageIndex(0); // reset paginación en cada recarga
    } catch (e: any) {
      console.error('[MisReservas] fetchRows error:', e);
      setError(e?.message ?? 'Error cargando reservas');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [buildFilter, reservationsSvc]);

  // Primer load + recargas controladas
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      await fetchRows();
      if (cancel) return;
    })();
    return () => { cancel = true; };
    // reloadTick asegura que sólo apliquemos rango cuando el usuario pulse “Buscar”
  }, [fetchRows, reloadTick]);

  // ===== acciones públicas =====
  const nextPage = React.useCallback(() => {
    setPageIndex(i => i + 1);
  }, []);
  const prevPage = React.useCallback(() => {
    setPageIndex(i => Math.max(0, i - 1));
  }, []);

  const hasNext = React.useMemo(() => {
    const total = rows.length;
    return (pageIndex + 1) * pageSize < total;
  }, [rows.length, pageIndex, pageSize]);

  const applyRange = React.useCallback(() => {
    // Sólo tiene efecto en modo historial; en “upcoming-active” igual recarga.
    setReloadTick(x => x + 1);
  }, []);

  const reloadAll = React.useCallback(() => {
    // Recarga general (úsalo después de reservar/cancelar)
    setReloadTick(x => x + 1);
  }, []);

  const cancelReservation = React.useCallback(async (id: number) => {
    try {
      setLoading(true);
      await reservationsSvc.update(String(id), { Status: 'Cancelada' });
      await fetchRows();
    } catch (e: any) {
      console.error('[MisReservas] cancelReservation error:', e);
      setError(e?.message ?? 'No se pudo cancelar la reserva');
    } finally {
      setLoading(false);
    }
  }, [reservationsSvc, fetchRows]);

  // ===== depuración opcional =====
  React.useEffect(() => {
    console.log('[MisReservas] debug');
    console.log('userMail:', userMail);
    console.log('rows.length:', rows.length);
  }, [rows, userMail]);

  return {
    // datos
    rows,
    loading,
    error,

    // filtros
    filterMode,
    setFilterMode,

    // rango (para “Historial”)
    range,
    setRange,
    applyRange,

    // paginación
    pageSize,
    setPageSize,
    pageIndex,
    hasNext,
    nextPage,
    prevPage,

    // acciones
    cancelReservation,
    reloadAll, // 👈 expuesto
  };
}
