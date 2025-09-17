// src/hooks/useReservar.ts (versión Graph con DEBUG)
import * as React from 'react';
import { addDays } from '../utils/date';
import type { ReserveArgs, ReserveResult } from '../Models/Reservation';
import type { TurnType } from '../Models/shared';
import { ReservationsService } from '../Services/Reservations.service';
import { ParkingSlotsService } from '../Services/ParkingSlot.service';
import { SettingsService } from '../Services/Setting.service';

export type UseReservarReturn = {
  maxDate: Date | null;
  minDate: Date | null;
  loading: boolean;
  error: string | null;
  reservar: (args: ReserveArgs) => Promise<ReserveResult>;
};

type UseReservarOptions = {
  onAfterReserve?: () => void | Promise<void>;
};

const MOTO_CAPACITY = 4 as const;

// Helpers de debug
function dbgLabel(label: string) {
  return `%c${label}`;
}
const dbgStyle = 'background:#111;color:#7CFC00;padding:2px 4px;border-radius:3px;';

export function useReservar(
  reservationsSvc: ReservationsService,
  slotsSvc: ParkingSlotsService,
  settingsSvc: SettingsService,
  userMail: string,
  userName: string,
  opts?: UseReservarOptions
): UseReservarReturn {
  const [maxDate, setMaxDate] = React.useState<Date | null>(null);
  const [minDate, setMinDate] = React.useState<Date | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // ============== DEBUG: primer dump sin filtros de Reservations ==============
  React.useEffect(() => {
    (async () => {
      try {
        console.log(dbgLabel('[DEBUG] Reservations: getAll (no filter, top 2000)'), dbgStyle);
        const all = await reservationsSvc.getAll({
          top: 2000,
        });
        // Esto es el modelo mapeado por tu service (no el raw de Graph).
        console.log('[DEBUG] Reservations getAll (mapped) length:', Array.isArray(all) ? all.length : 0);
        console.table(all);

        if (Array.isArray(all) && all.length > 0) {
          console.log('[DEBUG] First reservation (mapped):', all[0]);
        }
        console.log('%c— fin dump inicial —', 'color:#999;');
      } catch (e) {
        console.error('[DEBUG] Error dump getAll Reservations:', e);
      }
    })();
  }, [reservationsSvc]);

  // ============== Settings.VisibleDays ============
  React.useEffect(() => {
    const hoy = new Date();
    (async () => {
      try {
        setLoading(true);
        console.log(dbgLabel('[DEBUG] Settings.get("1")'), dbgStyle);
        const settings = await settingsSvc.get('1');
        console.log('[DEBUG] Settings.get ->', settings);
        const days: number = (settings as any)?.VisibleDays ?? 3;
        setMaxDate(addDays(hoy, days));
        setMinDate(hoy);
        console.log('[DEBUG] minDate:', hoy.toISOString(), 'maxDate:', addDays(hoy, days).toISOString());
      } catch (err: any) {
        console.error('[DEBUG] Settings error:', err);
        setError(err?.message ?? 'Error cargando configuración');
      } finally {
        setLoading(false);
      }
    })();
  }, [settingsSvc]);

  // Cuenta reservas para un slot/fecha/turno
  const countReservations = React.useCallback(
    async (slotId: number | string, dateISO: string, turn: Exclude<TurnType, 'Dia'>) => {
      // ⚠️ IMPORTANTE: en Graph el lookup usualmente se filtra por <NombreLookupId>
      // Ajusta si tu internal name no es SpotIdLookupId
      const sid = Number(slotId);
      const filter = [
        `SpotIdLookupId eq ${sid}`,          // <= si tu columna lookup se llama distinto, cámbiala aquí
        `Date eq '${dateISO}'`,
        `Turn eq '${turn}'`,
        `(Status ne 'Cancelada')`,
      ].join(' and ');

      console.log(dbgLabel('[DEBUG] countReservations filter'), dbgStyle, filter);

      const items = await reservationsSvc.getAll({
        filter,
        top: 1000
      });

      console.log('[DEBUG] countReservations -> items length:', Array.isArray(items) ? items.length : 0);
      if (Array.isArray(items)) {
        console.table(items);
      }
      return Array.isArray(items) ? items.length : 0;
    },
    [reservationsSvc]
  );

  // ¿ya tiene una reserva activa el mismo día y turno?
  const hasActiveReservationSameDay = React.useCallback(
    async (email: string, dateISO: string, turn: string): Promise<boolean> => {
      if (!email?.trim() || !dateISO) return false;
      const emailSafe = email.replace(/'/g, "''");

      const filter = [
        `Title eq '${emailSafe}'`,
        `Date eq '${dateISO}'`,
        `(Status ne 'Cancelada')`,
        `Turn eq '${turn}'`,
      ].join(' and ');

      console.log(dbgLabel('[DEBUG] hasActiveReservationSameDay filter'), dbgStyle, filter);

      const items = await reservationsSvc.getAll({
        filter,
        top: 1,
        orderby: 'ID asc',
      });

      const exists = Array.isArray(items) && items.length > 0;
      console.log('[DEBUG] hasActiveReservationSameDay ->', exists, items);
      return exists;
    },
    [reservationsSvc]
  );

  const reservar = React.useCallback(
    async ({ vehicle, turn, dateISO }: ReserveArgs): Promise<ReserveResult> => {
      console.log(dbgLabel('[DEBUG] reservar() args'), dbgStyle, { vehicle, turn, dateISO, userMail, userName });

      // 0) Validación: ¿ya tiene reserva ese día?
      if (await hasActiveReservationSameDay(userMail, dateISO, turn)) {
        const msg = `No puedes reservar: ya tienes una reserva activa para el ${dateISO} en el turno de la ${turn}.`;
        console.warn('[DEBUG] bloquear por reserva existente:', msg);
        return { ok: false, message: msg };
      }

      // 1) Traer celdas activas del tipo solicitado (itinerantes)
      const slotsFilter = [
        `(Activa eq 'Activa')`,
        `TipoCelda eq '${vehicle}'`,
        `Itinerancia eq 'Empleado Itinerante'`,
      ].join(' and ');

      console.log(dbgLabel('[DEBUG] slots getAll filter'), dbgStyle, slotsFilter);

      const slots = await slotsSvc.getAll({
        filter: slotsFilter,
        top: 2000,
        orderby: 'Title asc',
      });

      console.log('[DEBUG] slots count:', Array.isArray(slots) ? slots.length : 0);
      if (!Array.isArray(slots) || slots.length === 0) {
        return { ok: false, message: `No existen celdas activas para ${vehicle}.` };
      }

      // 2) Turnos a validar
      const turnsToCheck: Exclude<TurnType, 'Dia'>[] = turn === 'Dia' ? ['Manana', 'Tarde'] : [turn as Exclude<TurnType, 'Dia'>];
      console.log('[DEBUG] turnsToCheck:', turnsToCheck);

      for (const slot of slots) {
        const slotId = (slot as any).ID ?? (slot as any).Id ?? (slot as any).id;
        const code = (slot as any).Title ?? (slot as any).Code ?? (slot as any).Name ?? slotId;
        console.log('[DEBUG] Evaluando slot:', { slotId, code, slot });

        if (slotId == null) continue;

        // 3) Validar cupo por turno
        let available = true;
        for (const t of turnsToCheck) {
          const count = await countReservations(slotId, dateISO, t);
          console.log('[DEBUG] cupo', { t, count, vehicle });
          if (vehicle === 'Carro') {
            if (count >= 1) { available = false; break; }
          } else {
            if (count >= MOTO_CAPACITY) { available = false; break; }
          }
        }
        if (!available) {
          console.log('[DEBUG] slot sin cupo, sigo con el siguiente ->', code);
          continue;
        }

        // 4) Crear la(s) reserva(s)
        const turnsToCreate = (turn === 'Dia' ? (['Manana', 'Tarde'] as const) : [turn]) as readonly Exclude<TurnType, 'Dia'>[];
        console.log('[DEBUG] turnsToCreate:', turnsToCreate);

        try {
          let lastCreated: any = null;

          for (const t of turnsToCreate) {
            const payload: any = {
              Title: userMail,
              Date: dateISO,
              Turn: t,
              SpotIdLookupId: Number(slotId),   // <= revisar nombre de lookup interno
              // OJO: tu lista tiene 'VehivleType' (typo) o 'VehicleType'? Ajusta el internal name real:
              VehivleType: vehicle,             // si el internal correcto es VehicleType, cámbialo
              Status: 'Activa',
              NombreUsuario: userName,
            };

            console.log(dbgLabel('[DEBUG] create payload'), dbgStyle, payload);
            lastCreated = await reservationsSvc.create(payload);
            console.log('[DEBUG] create OK ->', lastCreated);
          }

          // 5) Refrescar listas/estado externo
          await opts?.onAfterReserve?.();

          const successMsg =
            turn === 'Dia'
              ? `Reserva de día completo creada en celda ${code} para ${dateISO}.`
              : `Reserva creada en celda ${code} para ${dateISO} (${turn}).`;

          console.log('[DEBUG] SUCCESS:', successMsg);
          return { ok: true, message: successMsg, reservation: lastCreated };
        } catch (e: any) {
          console.error('[DEBUG] create FAILED para slot', slotId, e?.message ?? e, e);
          // Si falla con esta celda, intenta con la siguiente
          continue;
        }
      }

      // 6) Si ninguna celda tuvo cupo
      const turnoTexto = turn === 'Dia' ? 'día completo' : String(turn).toLowerCase();
      const msg = `No hay parqueaderos disponibles para ${vehicle} el ${dateISO} en ${turnoTexto}.`;
      console.warn('[DEBUG] sin cupo en todos los slots:', msg);
      return { ok: false, message: msg };
    },
    [reservationsSvc, slotsSvc, hasActiveReservationSameDay, countReservations, userMail, userName, opts]
  );

  return {
    minDate,
    maxDate,
    loading,
    error,
    reservar,
  };
}




