// src/hooks/useReservar.ts (versión Graph)
import * as React from 'react';
import { addDays } from '../utils/date';
import type { ReserveArgs, ReserveResult } from '../Models/Reservation';
import type { TurnType } from '../Models/shared';
import { ReservationsService } from '../Services/Reservations.service';     // 100% Graph
import { ParkingSlotsService } from '../Services/ParkingSlot.service';     // 100% Graph
import { SettingsService } from '../Services/Setting.service';             // 100% Graph

export type UseReservarReturn = {
  maxDate: Date | null;
  minDate: Date | null;
  loading: boolean;
  error: string | null;
  reservar: (args: ReserveArgs) => Promise<ReserveResult>;
};

type UseReservarOptions = {
  /** Se ejecuta tras crear la(s) reserva(s) con éxito (útil para recargar Mis Reservas) */
  onAfterReserve?: () => void | Promise<void>;
};

const MOTO_CAPACITY = 4 as const;

/**
 * Hook para reservar usando Microsoft Graph.
 * Inyecta servicios Graph para configuración, reservas y celdas.
 */
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

  // Ventana de fechas visibles (Settings.VisibleDays)
  React.useEffect(() => {
    const hoy = new Date();
    (async () => {
      try {
        setLoading(true);
        // asumo que tu SettingsService.get(id) devuelve { VisibleDays: number }
        const settings = await settingsSvc.get('1');
        const days: number = (settings as any)?.VisibleDays ?? 3;
        setMaxDate(addDays(hoy, days));
        setMinDate(hoy);
      } catch (err: any) {
        setError(err?.message ?? 'Error cargando configuración');
      } finally {
        setLoading(false);
      }
    })();
  }, [settingsSvc]);

  // Cuenta reservas para un slot/fecha/turno
  const countReservations = React.useCallback(async (
    slotId: number | string,
    dateISO: string,
    turn: Exclude<TurnType, 'Dia'>
  ) => {
    const items = await reservationsSvc.getAll({
      filter: [
        // 👇 ajusta si tu lookup interno NO es SpotIdLookupId
        `fields/SpotIdLookupId eq ${Number(slotId)}`,
        `fields/Date eq '${dateISO}'`,
        `fields/Turn eq '${turn}'`,
        `(fields/Status ne 'Cancelada')`,
      ].join(' and '),
      top: 1_000, // margen de seguridad
      orderby: 'fields/ID asc',
    });
    return Array.isArray(items) ? items.length : 0;
  }, [reservationsSvc]);

  // ¿ya tiene una reserva activa el mismo día y turno?
  const hasActiveReservationSameDay = React.useCallback(
    async (email: string, dateISO: string, turn: string): Promise<boolean> => {
      if (!email?.trim() || !dateISO) return false;
      const emailSafe = email.replace(/'/g, "''");

      const items = await reservationsSvc.getAll({
        filter: [
          // si guardas el correo en otra columna, cámbiala aquí
          `fields/Title eq '${emailSafe}'`,
          `fields/Date eq '${dateISO}'`,
          `(fields/Status ne 'Cancelada')`,
          `fields/Turn eq '${turn}'`,
        ].join(' and '),
        top: 1,
        orderby: 'fields/ID asc',
      });

      return Array.isArray(items) && items.length > 0;
    },
    [reservationsSvc]
  );

  const reservar = React.useCallback(async ({ vehicle, turn, dateISO }: ReserveArgs): Promise<ReserveResult> => {
    // 0) Validación: ¿ya tiene reserva ese día?
    if (await hasActiveReservationSameDay(userMail, dateISO, turn)) {
      return {
        ok: false,
        message: `No puedes reservar: ya tienes una reserva activa para el ${dateISO} en el turno de la ${turn}.`,
      };
    }

    // 1) Traer celdas activas del tipo solicitado (itinerantes)
    const slots = await slotsSvc.getAll({
      filter: [
        `(fields/Activa eq 'Activa')`,
        `fields/TipoCelda eq '${vehicle}'`,
        `fields/Itinerancia eq 'Empleado Itinerante'`,
      ].join(' and '),
      top: 2000,
      orderby: 'fields/Title asc',
    });

    if (!Array.isArray(slots) || slots.length === 0) {
      return { ok: false, message: `No existen celdas activas para ${vehicle}.` };
    }

    // 2) Turnos a validar
    const turnsToCheck: Exclude<TurnType, 'Dia'>[] =
      turn === 'Dia' ? ['Manana', 'Tarde'] : [turn as Exclude<TurnType, 'Dia'>];

    for (const slot of slots) {
      const slotId = (slot as any).ID ?? (slot as any).Id ?? (slot as any).id;
      if (slotId == null) continue;

      // 3) Validar cupo por turno
      let available = true;
      for (const t of turnsToCheck) {
        const count = await countReservations(slotId, dateISO, t);
        if (vehicle === 'Carro') {
          if (count >= 1) { available = false; break; }
        } else {
          if (count >= MOTO_CAPACITY) { available = false; break; }
        }
      }
      if (!available) continue;

      // 4) Crear la(s) reserva(s)
      const turnsToCreate =
        (turn === 'Dia' ? (['Manana', 'Tarde'] as const) : [turn]) as readonly Exclude<TurnType, 'Dia'>[];

      try {
        let lastCreated: any = null;

        for (const t of turnsToCreate) {
          // 👇 En Graph, para escribir un lookup se usa <NombreLookupId>
          // Cambia 'SpotIdLookupId' si tu internal name real es otro
          const payload = {
            Title: userMail,
            Date: dateISO,
            Turn: t,
            SpotIdLookupId: Number(slotId),
            VehicleType: vehicle,         // si tu internal es 'VehivleType', cámbialo
            Status: 'Activa',
            NombreUsuario: userName,
          };

          lastCreated = await reservationsSvc.create(payload as any);
        }

        // 5) Refrescar listas/estado externo
        await opts?.onAfterReserve?.();

        // Código/Nombre de la celda para mensaje
        const code =
          (slot as any).Title ??
          (slot as any).Code ??
          (slot as any).Name ??
          slotId;

        const successMsg =
          turn === 'Dia'
            ? `Reserva de día completo creada en celda ${code} para ${dateISO}.`
            : `Reserva creada en celda ${code} para ${dateISO} (${turn}).`;

        return { ok: true, message: successMsg, reservation: lastCreated };
      } catch {
        // Si falla con esta celda, intenta con la siguiente
        continue;
      }
    }

    // 6) Si ninguna celda tuvo cupo
    const turnoTexto = turn === 'Dia' ? 'día completo' : String(turn).toLowerCase();
    return { ok: false, message: `No hay parqueaderos disponibles para ${vehicle} el ${dateISO} en ${turnoTexto}.` };
  }, [reservationsSvc, slotsSvc, hasActiveReservationSameDay, countReservations, userMail, userName, opts]);

  return {
    minDate,
    maxDate,
    loading,
    error,
    reservar,
  };
}
