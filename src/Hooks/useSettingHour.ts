// src/hooks/useSettingsHour.ts
import * as React from 'react';
import { useGraphServices } from '../graph/GraphServicesContext';

export type SettingsHours = {
  InicioManana: number; // 0..23
  FinalManana: number;  // 0..23
  InicioTarde: number;  // 0..23
  FinalTarde: number;   // 0..23
};

export type UseSettingsHoursReturn = {
  hours: SettingsHours | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/** Convierte valores tipo "07:00", "7", 7 a número de hora (0..23). */
function toHourNumber(v: any): number {
  if (v == null) return NaN;
  if (typeof v === 'number') return clampHour(v);
  const s = String(v).trim();
  // formato HH:mm
  const m = /^(\d{1,2})(?::\d{1,2})?$/.exec(s);
  if (m) return clampHour(parseInt(m[1], 10));
  // por si llega "07.00" o similar
  const n = parseInt(s, 10);
  return clampHour(isFinite(n) ? n : NaN);
}
function clampHour(n: number) {
  if (!isFinite(n)) return NaN;
  return Math.max(0, Math.min(23, Math.floor(n)));
}

/**
 * Lee las horas de la lista Settings (item "1") y normaliza a números (0..23).
 * Campos esperados: InicioManana, FinalManana, InicioTarde, FinalTarde
 */
export function useSettingsHours(): UseSettingsHoursReturn {
  const { settings } = useGraphServices();

  const [hours, setHours] = React.useState<SettingsHours | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const row: any = await settings.get('1'); // <- ajusta si tu ID es otro
      const h: SettingsHours = {
        InicioManana: toHourNumber(row?.InicioManana ?? '07:00'),
        FinalManana:  toHourNumber(row?.FinalManana  ?? '12:00'),
        InicioTarde:  toHourNumber(row?.InicioTarde  ?? '12:00'),
        FinalTarde:   toHourNumber(row?.FinalTarde   ?? '18:00'),
      };

      if (
        [h.InicioManana, h.FinalManana, h.InicioTarde, h.FinalTarde].some(Number.isNaN)
      ) {
        throw new Error('Los horarios en Settings no tienen un formato válido.');
      }

      setHours(h);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar los horarios.');
      setHours(null);
    } finally {
      setLoading(false);
    }
  }, [settings]);

  React.useEffect(() => { void load(); }, [load]);

  return { hours, loading, error, reload: load };
}

export default useSettingsHours;