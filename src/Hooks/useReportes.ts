// src/hooks/useReporteria.ts (versión Graph)
import * as React from 'react';
import type { Filtros, ReservaUI } from '../Models/Reportes';
import { todayISO } from '../utils/date';
import { ReservationsService } from '../Services/Reservations.service';     // 100% Graph
import { ParkingSlotsService } from '../Services/ParkingSlot.service';     // 100% Graph

const MOTO_CAPACITY = 1;

export function useReporteria(
  reservationsSvc: ReservationsService,
  slotsSvc: ParkingSlotsService
) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // datos
  const [rows, setRows] = React.useState<ReservaUI[]>([]);

  // aforo
  const [capacidadTotal, setCapacidadTotal] = React.useState<number>(0);
  const [aforoPct, setAforoPct] = React.useState<number>(0);

  // filtros
  const [filters, setFilters] = React.useState<Filtros>({
    desde: todayISO(),
    hasta: todayISO(),
    persona: '',
    tipoVehiculo: '',
  });

  const onChange = (patch: Partial<Filtros>) =>
    setFilters(prev => ({ ...prev, ...patch }));

  // ---------- Capacidad total (carros=1, motos=1 por celda, ajusta si cambia la regla) ----------
  const loadCapacidad = React.useCallback(async () => {
    // Activas
    const items = await slotsSvc.getAll({
      filter: `fields/Activa eq 'Activa'`,
      top: 2000,
      orderby: 'fields/Title asc',
    });

    let carros = 0;
    let motos = 0;
    for (const r of items) {
      const tipo = String((r as any).TipoCelda ?? '').toLowerCase();
      if (tipo === 'carro') carros += 1;
      else if (tipo === 'moto') motos += 1;
    }
    const capacidad = carros * 1 + motos * MOTO_CAPACITY;
    setCapacidadTotal(capacidad);
  }, [slotsSvc]);

  // ---------- Carga reservas según filtros ----------
  const loadReservas = React.useCallback(async () => {
    const { desde, hasta, persona, tipoVehiculo } = filters;

    const parts: string[] = [
      `(fields/Status ne 'Cancelada')`,
      `fields/Date ge '${desde}'`,
      `fields/Date le '${hasta}'`,
    ];

    if (tipoVehiculo) {
      parts.push(`fields/VehicleType eq '${String(tipoVehiculo).replace(/'/g, "''")}'`);
      // Si tu internal name es "VehivleType" en la lista, usa ese:
      // parts.push(`fields/VehivleType eq '${...}'`);
    }

    if (persona?.trim()) {
      const p = persona.trim().toLowerCase().replace(/'/g, "''");
      // filtra por correo (Title) o por NombreUsuario
      parts.push(
        `(contains(tolower(fields/Title),'${p}') or contains(tolower(fields/NombreUsuario),'${p}'))`
      );
    }

    const items = await reservationsSvc.getAll({
      filter: parts.join(' and '),
      orderby: 'fields/Date asc,fields/Turn asc',
      top: 2000,
    });

    // map a tu UI (usa las propiedades que tu servicio ya mapea)
    const mapped: ReservaUI[] = items.map((r: any) => ({
      Id: Number(r.ID ?? r.Id ?? 0),
      Fecha: String(r.Date ?? '').slice(0, 10),
      Turno: String(r.Turn ?? ''),
      Celda:
        r.SpotId /* texto si lo expones */ ??
        String(r.SpotIdLookupId ?? r.SpotId ?? ''), // fallback al ID
      SpotId: Number(r.SpotIdLookupId ?? r.SpotId ?? 0),
      TipoVehiculo: (r.VehicleType ?? r.VehivleType ?? '') as any,
      Usuario: String(r.NombreUsuario ?? r.Title ?? ''), // muestra nombre; fallback correo
      Estado: String(r.Status ?? ''),
    }));

    setRows(mapped);
  }, [filters, reservationsSvc]);

  // ---------- Aforo ----------
  React.useEffect(() => {
    if (!capacidadTotal || capacidadTotal <= 0) {
      setAforoPct(0);
      return;
    }
    let unidades = 0;
    for (const r of rows) {
      const tv = String(r.TipoVehiculo).toLowerCase();
      if (tv === 'carro') unidades += 1;
      else if (tv === 'moto') unidades += 1;
      else unidades += 1;
    }
    const pct = Math.min(100, Math.round((unidades / capacidadTotal) * 100));
    setAforoPct(Number.isFinite(pct) ? pct : 0);
  }, [rows, capacidadTotal]);

  // ---------- Carga inicial ----------
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await loadCapacidad();
        await loadReservas();
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? 'Error cargando reportería');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [loadCapacidad, loadReservas]);

  // ---------- Re-carga al cambiar filtros ----------
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await loadReservas();
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? 'Error cargando reservas');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [loadReservas]);

  return {
    // estado
    loading, error, rows, aforoPct, capacidadTotal,
    // filtros
    filters, setFilters, onChange,
    // loaders expuestos
    loadReservas, loadCapacidad,
  };
}
