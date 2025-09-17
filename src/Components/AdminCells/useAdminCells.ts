// src/pages/admin/useAdminCells.ts
import * as React from 'react';

// Hooks propios
import { useCeldas } from '../../Hooks/useCeldas';
import { useSettingsHours } from '../../Hooks/useSettingHour';
import { useTodayOccupancy } from '../../Hooks/useTodayOccupancy';
import { useWorkers } from '../../Hooks/useWorkers';

// Adapters / tipos
import { deriveHoursLabels, getCurrentTurnFromHours } from '../../Models/time';
import type { SlotUI } from '../../Models/Celdas';

// Auth + Graph + Services (Graph)
import { useAuth } from '../../auth/AuthProvider';
import { GraphRest } from '../../graph/GraphRest';
import { ParkingSlotsService } from '../../Services/ParkingSlot.service';
import { ReservationsService } from '../../Services/Reservations.service';

export const useAdminCells = () => {
  // ====== construir services Graph con MSAL ======
  const { ready, getToken } = useAuth();

  const slotsSvc = React.useMemo(() => {
    if (!ready) return null;
    const graph = new GraphRest(getToken);
    return new ParkingSlotsService(
      graph,
      'estudiodemoda.sharepoint.com',
      '/sites/TransformacionDigital/IN/SA',
      'parkingslots'
    );
  }, [ready, getToken]);

  const reservationsSvc = React.useMemo(() => {
    if (!ready) return null;
    const graph = new GraphRest(getToken);
    return new ReservationsService(
      graph,
      'estudiodemoda.sharepoint.com',
      '/sites/TransformacionDigital/IN/SA',
      'reservations'
    );
  }, [ready, getToken]);

  // ====== hooks de datos (siempre, sin condicional) ======
  // Asegúrate de que useCeldas acepte svc: ParkingSlotsService | null
  const c = useCeldas(slotsSvc);

  // Asegúrate de que useTodayOccupancy acepte svc: ReservationsService | null
  const occ = useTodayOccupancy(reservationsSvc);

  const s = useSettingsHours();
  const { workers, loading: workersLoading } = useWorkers();

  // ====== mix: filas + ocupación por turno ======
  const rowsWithOcc: (SlotUI & { __occ?: ReturnType<typeof useTodayOccupancy>['occByTurn'][number] })[] =
    React.useMemo(() => c.rows.map(r => ({ ...r, __occ: occ.occByTurn[r.Id] })), [c.rows, occ.occByTurn]);

  // Turno actual según settings (puede ser null si fuera de horario)
  const currentTurn = React.useMemo(
    () => (s.hours ? getCurrentTurnFromHours(s.hours) : null),
    [s.hours]
  );

  // Etiqueta legible de horarios
  const hoursLabel = React.useMemo(() => {
    if (!s.hours) return 'Cargando horarios…';
    const h = deriveHoursLabels(s.hours);
    return `Mañana: ${h.amStart}–${h.amEnd} · Tarde: ${h.pmStart}–${h.pmEnd}`;
  }, [s.hours]);

  // Capacidad/ocupación “ahora”
  const capacidadAhora = React.useMemo(() => {
    const activas = rowsWithOcc.filter(r => r.Activa === 'Activa');

    const isReservedNow = (slotId: number) => {
      const f = occ.occByTurn[slotId] || {};
      if (!currentTurn) return !!(f?.Manana || f?.Tarde);
      return currentTurn === 'Manana' ? !!f?.Manana : !!f?.Tarde;
    };

    const totalCarros = activas.filter(s => s.TipoCelda === 'Carro').length;
    const ocupadosCarros = activas.filter(s => s.TipoCelda === 'Carro' && isReservedNow(s.Id)).length;
    const libresCarros = Math.max(0, totalCarros - ocupadosCarros);

    const totalMotos = activas.filter(s => s.TipoCelda === 'Moto').length;
    const ocupadosMotos = activas.filter(s => s.TipoCelda === 'Moto' && isReservedNow(s.Id)).length;
    const libresMotos = Math.max(0, totalMotos - ocupadosMotos);

    return { turno: currentTurn, totalCarros, libresCarros, totalMotos, libresMotos };
  }, [rowsWithOcc, occ.occByTurn, currentTurn]);

  // ====== modal de detalles ======
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<SlotUI | null>(null);
  const openDetails = (row: SlotUI) => { setSelected(row); setOpen(true); };
  const closeDetails = () => { setSelected(null); setOpen(false); };

  // ====== auto-refresh (5 min) y al volver a la pestaña ======
  React.useEffect(() => {
    const T = 5 * 60 * 1000;
    let id: number | null = null;

    const tick = () => {
      c.reloadAll();
      occ.reload();
    };

    const start = () => { if (id == null) id = window.setInterval(tick, T); };
    const stop  = () => { if (id != null) { window.clearInterval(id); id = null; } };

    if (!document.hidden) start();
    const onVis = () => (document.hidden ? stop() : (tick(), start()));
    document.addEventListener('visibilitychange', onVis);

    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [c.reloadAll, occ.reload]);

  // Enter en el buscador → recarga
  const onSearchEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); c.reloadAll(); }
  };

  // Loading global para banners (no bloquea render)
  const loading = c.loading || s.loading || occ.loading;

  // “Añadir celda” solo se desactiva mientras guarda
  const actionsDisabled = c.createSaving;

  return {
    // estado base
    loading,
    error: c.error || s.error || null,

    // filas ya mezcladas con ocupación
    rows: rowsWithOcc,

    // filtros y paginación
    search: c.search, setSearch: c.setSearch, onSearchEnter,
    tipo: c.tipo, setTipo: c.setTipo,
    itinerancia: c.itinerancia, setItinerancia: c.setItinerancia,
    pageSize: c.pageSize, setPageSize: c.setPageSize,
    pageIndex: c.pageIndex, hasNext: c.hasNext,
    nextPage: c.nextPage, prevPage: c.prevPage,

    // creación
    createOpen: c.createOpen,
    createSaving: c.createSaving,
    createError: c.createError,
    createForm: c.createForm,
    canCreate: c.canCreate,
    openModal: c.openModal,
    closeModal: c.closeModal,
    setCreateForm: c.setCreateForm,
    create: c.create,

    // ocupación/capacidad/turnos
    occLoading: occ.loading,
    capacidadAhora,
    currentTurn,
    hoursLabel,

    // detalles
    open, selected, openDetails, closeDetails,

    // colaboradores (para el modal de detalles)
    workers,
    workersLoading,

    // acciones UI
    actionsDisabled,
  };
};
