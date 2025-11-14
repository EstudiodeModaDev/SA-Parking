// src/hooks/useReservar.ts
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

// ---------- Tipos auxiliares (ajusta si en tu modelo son distintos) ----------
type VehicleType = 'Carro' | 'Moto';
type TurnDb = 'Manana' | 'Tarde' | 'Día completo';

type ReservationCreate = {
  Title: string;           
  Date: string;             
  Turn: TurnDb;             
  SpotIdLookupId: number;   
  VehicleType: VehicleType; 
  Status: 'Activa' | 'Cancelada' | 'Rechazada' | 'Pendiente';
  NombreUsuario: string;
};

// ---------- Hook ----------
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
        const all = await reservationsSvc.getAll({ top: 2000 });
        if (Array.isArray(all) && all.length > 0) {
          console.log('[DEBUG] First reservation (mapped):', all[0]);
        }
        console.log('%c— fin dump inicial —', 'color:#999;');
      } catch (e) {
        console.error('[DEBUG] Error dump getAll Reservations:', e);
      }
    })();
  }, [reservationsSvc]);

  // ============== Settings.VisibleDays =============
  React.useEffect(() => {
    const hoy = new Date();

    // type-guard para VisibleDays
    const hasVisibleDays = (v: unknown): v is { VisibleDays?: number } => {
      if (typeof v !== 'object' || v === null) return false;
      const o = v as Record<string, unknown>;
      return !('VisibleDays' in o) || typeof (o as any).VisibleDays === 'number';
    };

    (async () => {
      try {
        setLoading(true);

        const settings: unknown = await settingsSvc.get('1');
        const days: number =
          hasVisibleDays(settings) && typeof (settings as any).VisibleDays === 'number'
            ? (settings as any).VisibleDays
            : 3;

        setMaxDate(addDays(hoy, days));
        setMinDate(hoy);
      } catch (err: unknown) {
        const msg =
          typeof err === 'object' && err !== null && 'message' in (err as Record<string, unknown>)
            ? String((err as { message?: unknown }).message)
            : 'Error cargando configuración';
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [settingsSvc]);

  // ───────────────── Helpers ─────────────────
  const sanitizeForOdata = (s: string) => s.replace(/'/g, "''");

  // Cuenta reservas para un slot/fecha/turnos (capacidad por turno = 1)
  const countReservations = React.useCallback(
    async (
      slotId: number | string,
      dateISO: string,
      turns: Array<'Manana' | 'Tarde' | 'Día completo'>
    ) => {
      const sid = Number(slotId);
      const turnFilter = `(${turns.map(t => `fields/Turn eq '${t}'`).join(' or ')})`;

      const filter = [
        `fields/SpotIdLookupId eq ${sid}`,   // cambia si tu lookup se llama distinto
        `fields/Date eq '${dateISO}'`,
        turnFilter,
        `(fields/Status ne 'Cancelada')`,
      ].join(' and ');

      const items = await reservationsSvc.getAll({ filter, top: 1000 });
      return Array.isArray(items) ? items.length : 0;
    },
    [reservationsSvc]
  );

  // ¿ya tiene una reserva activa el mismo día y turno (o día completo)?
  const hasActiveReservationSameDay = React.useCallback(
    async (email: string, dateISO: string, turn: string): Promise<boolean> => {
      if (!email?.trim() || !dateISO) return false;
      const emailSafe = sanitizeForOdata(email);

      const filter = [
        `fields/Title eq '${emailSafe}'`,
        `fields/Date eq '${dateISO}'`,
        `(fields/Status ne 'Cancelada')`,
        `(fields/Turn eq '${turn}' or fields/Turn eq 'Día completo')`, // si tiene 'Día completo' también bloquea
      ].join(' and ');

      const items = await reservationsSvc.getAll({ filter, top: 1, orderby: 'ID asc' });
      return Array.isArray(items) && items.length > 0;
    },
    [reservationsSvc]
  );

  // ¿ya tiene alguna reserva activa ese día (cualquier turno)?
  const hasActiveReservationAnyTurnSameDay = React.useCallback(
    async (email: string, dateISO: string): Promise<boolean> => {
      if (!email?.trim() || !dateISO) return false;
      const emailSafe = sanitizeForOdata(email);

      const filter = [
        `fields/Title eq '${emailSafe}'`,
        `fields/Date eq '${dateISO}'`,
        `(fields/Status ne 'Cancelada')`,
      ].join(' and ');

      const items = await reservationsSvc.getAll({ filter, top: 1, orderby: 'ID asc' });
      return Array.isArray(items) && items.length > 0;
    },
    [reservationsSvc]
  );

const reservar = React.useCallback(
  async ({ vehicle, turn, dateISO }: ReserveArgs): Promise<ReserveResult> => {
    if (turn === 'Dia') {
      if (await hasActiveReservationAnyTurnSameDay(userMail, dateISO)) {
        return {
          ok: false,
          message: `No puedes reservar día completo: ya tienes una reserva activa para el ${dateISO}.`,
        };
      }
    } else {
      if (await hasActiveReservationSameDay(userMail, dateISO, turn)) {
        return {
          ok: false,
          message: `No puedes reservar: ya tienes una reserva activa para el ${dateISO} en el turno de la ${turn}.`,
        };
      }
    }

    const slotsFilter = [
      `(fields/Activa eq 'Activa')`,
      `fields/TipoCelda eq '${vehicle}'`,
      `fields/Itinerancia eq 'Empleado Itinerante'`,
    ].join(' and ');

    const slots = await slotsSvc.getAll({ filter: slotsFilter, top: 2000 });
    if (!Array.isArray(slots) || slots.length === 0) {
      return { ok: false, message: `No existen celdas activas para ${vehicle}.` };
    }

    //IDs de celdas que van siempre al final
    const LAST_GROUP_IDS = new Set<number>([5]);

    const getSlotId = (slot: unknown): number | null => {
      const rslot = slot as Record<string, unknown>;
      const raw =
        (rslot['ID'] as number | string | undefined) ??
        (rslot['Id'] as number | string | undefined) ??
        (rslot['id'] as number | string | undefined);
      return raw == null ? null : Number(raw);
    };

    // 🔹 Particionamos: primero normales, luego “último grupo”
    const primarySlots: unknown[] = [];
    const lastGroupSlots: unknown[] = [];

    for (const s of slots) {
      const id = getSlotId(s);
      if (id == null) continue;

      if (LAST_GROUP_IDS.has(id)) lastGroupSlots.push(s);
      else primarySlots.push(s);
    }

    const orderedSlots = [...primarySlots, ...lastGroupSlots];

    console.log('[useReservar] Slots ordenados: ', orderedSlots);

    // 2) Turnos a validar capacidad
    const turnsToCheck: Exclude<TurnType, 'Dia'>[] =
      turn === 'Dia' ? ['Manana', 'Tarde'] : [turn as Exclude<TurnType, 'Dia'>];

    // 👉 Ahora iteramos sobre orderedSlots en vez de slots
    for (const slot of orderedSlots) {
      const rslot = slot as Record<string, unknown>;
      const slotId =
        (rslot['ID'] as number | string | undefined) ??
        (rslot['Id'] as number | string | undefined) ??
        (rslot['id'] as number | string | undefined);
      const code =
        (rslot['Title'] as string | undefined) ??
        (rslot['Code'] as string | undefined) ??
        (rslot['Name'] as string | undefined) ??
        slotId;

      if (slotId == null) continue;

      let available = true;

      if (turn === 'Dia') {
        const any = await countReservations(slotId, dateISO, ['Manana', 'Tarde', 'Día completo']);
        if (any > 0) available = false;
      } else {
        for (const t of turnsToCheck) {
          const count = await countReservations(slotId, dateISO, [t, 'Día completo']);
          if (count >= 1) {
            available = false;
            break;
          }
        }
      }

      if (!available) continue;

      const turnValue: TurnDb = turn === 'Dia' ? 'Día completo' : (turn as TurnDb);

      try {
        const payload = {
          Title: userMail,
          Date: dateISO,
          Turn: turnValue,
          SpotIdLookupId: Number(slotId),
          VehicleType: vehicle as VehicleType,
          Status: 'Activa',
          NombreUsuario: userName,
        } satisfies ReservationCreate;

        const created = await reservationsSvc.create(payload);
        await opts?.onAfterReserve?.();

        const successMsg =
          turn === 'Dia'
            ? `Reserva de día completo creada en celda ${code} para ${dateISO}.`
            : `Reserva creada en celda ${code} para ${dateISO} (${turn}).`;

        return { ok: true, message: successMsg, reservation: created };
      } catch (e) {
        console.warn('[useReservar] Falló crear en celda', code, e);
        continue;
      }
    }

    const turnoTexto = turn === 'Dia' ? 'día completo' : String(turn).toLowerCase();
    const msg = `No hay parqueaderos disponibles para ${vehicle} el ${dateISO} en ${turnoTexto}.`;
    return { ok: false, message: msg };
  },
  [
    reservationsSvc,
    slotsSvc,
    hasActiveReservationAnyTurnSameDay,
    hasActiveReservationSameDay,
    countReservations,
    userMail,
    userName,
    opts,
  ]
);

  return {
    minDate,
    maxDate,
    loading,
    error,
    reservar,
  };
}
