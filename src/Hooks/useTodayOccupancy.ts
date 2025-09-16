// src/hooks/useTodayOccupancy.ts (versión Graph)
import * as React from 'react';
import { ReservationsService } from '../Services/Reservations.service';

type TurnFlags = { Manana?: boolean; Tarde?: boolean; PorManana?: string; PorTarde?: string };

export function useTodayOccupancy(reservationsSvc: ReservationsService) {
  const [occByTurn, setOccByTurn] = React.useState<Record<number, TurnFlags>>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const d = new Date();
      const todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

      // OData v4 para Graph (ajusta si tu columna Date es DateTime: usa T00:00:00Z)
      const items = await reservationsSvc.getAll({
        filter: `fields/Date eq '${todayISO}' and (fields/Status ne 'Cancelada')`,
        top: 5000,
        orderby: 'fields/Turn asc'
      });

      const map: Record<number, TurnFlags> = {};

      for (const r of items as any[]) {
        // Preferimos el ID del lookup que expone el service
        const spotId = Number(r.SpotIdLookupId ?? r.SpotId ?? NaN);
        if (!Number.isFinite(spotId)) continue;

        const turnRaw = String(r.Turn ?? '').toLowerCase();
        const nombre = r.NombreUsuario ?? '';

        if (!map[spotId]) map[spotId] = {};

        if (turnRaw === 'manana' || turnRaw === 'mañana') {
          map[spotId].Manana = true;
          map[spotId].PorManana = nombre;
        } else if (turnRaw === 'tarde') {
          map[spotId].Tarde = true;
          map[spotId].PorTarde = nombre;
        } else {
          // por si llega “Día” u otro valor: ocupa ambos turnos
          map[spotId].Manana = true;
          map[spotId].Tarde = true;
          map[spotId].PorManana = nombre;
          map[spotId].PorTarde = nombre;
        }
      }

      setOccByTurn(map);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar ocupación');
      setOccByTurn({});
    } finally {
      setLoading(false);
    }
  }, [reservationsSvc]);

  React.useEffect(() => { reload(); }, [reload]);

  return { occByTurn, loading, error, reload };
}
