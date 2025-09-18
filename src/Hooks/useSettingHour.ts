// src/Hooks/useSettingHour.ts
import * as React from 'react';

/** ==== Tipos que puedes ajustar a tu servicio real ==== */
export type SettingsTextFields = {
  InicioManana?: string; // "07:00"
  FinManana?: string;    // "11:00"
  InicioTarde?: string;  // "12:00"
  FinTarde?: string;     // "18:00"
  // agrega otros campos si los tienes (PicoPlaca, etc.)
};

export interface SettingsService {
  /** Debe devolver un objeto con los campos de texto */
  get(): Promise<{ fields?: SettingsTextFields } | SettingsTextFields>;
  /** Debe aceptar los campos en texto HH:mm */
  update(payload: SettingsTextFields): Promise<any>;
}

/** ==== Utils de parseo/format ==== */
const AMPM = /\b(am|pm|a\.m\.|p\.m\.)\b/i;

function parseTextTimeToDate(input?: string | null): Date | null {
  if (!input) return null;
  let s = String(input).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return null;

  // Normaliza separadores (permite "7.30")
  s = s.replace(/\./g, ':');

  // Detecta AM/PM
  const hasAmPm = AMPM.test(s);
  const isPM = /p/.test(s);
  s = s.replace(AMPM, '').trim();

  // Extrae hh(:mm)?
  const m = s.match(/^(\d{1,2})(?::?(\d{1,2}))?$/);
  if (!m) return null;

  let h = Number(m[1]);
  let min = Number(m[2] ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (min < 0 || min > 59) return null;

  if (hasAmPm) {
    // 12 AM -> 0h, 12 PM -> 12h
    if (isPM) h = (h % 12) + 12;
    else h = h % 12;
  }
  if (h < 0 || h > 23) return null;

  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d;
}

function formatDateToHHmm(d?: Date | null): string {
  if (!(d instanceof Date)) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function minutesOf(d?: Date | null): number {
  if (!(d instanceof Date)) return NaN;
  return d.getHours() * 60 + d.getMinutes();
}

function isTimeRangeValid(a?: Date | null, b?: Date | null): boolean {
  const ma = minutesOf(a);
  const mb = minutesOf(b);
  if (!Number.isFinite(ma) || !Number.isFinite(mb)) return false;
  return ma < mb;
}

/** ==== Hook ==== */
export function useSettingHour(settingsSvc: SettingsService) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Estado en Date para el UI
  const [inicioAM, setInicioAM] = React.useState<Date | null>(null);
  const [finAM, setFinAM]       = React.useState<Date | null>(null);
  const [inicioPM, setInicioPM] = React.useState<Date | null>(null);
  const [finPM, setFinPM]       = React.useState<Date | null>(null);

  // Copia original para dirty check / reset
  const originalRef = React.useRef<{
    inicioAM: Date | null;
    finAM: Date | null;
    inicioPM: Date | null;
    finPM: Date | null;
  } | null>(null);

  // Carga inicial
  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const raw = await settingsSvc.get();
        const f = (raw as any)?.fields ?? raw;

        const amStart = parseTextTimeToDate(f?.InicioManana);
        const amEnd   = parseTextTimeToDate(f?.FinManana);
        const pmStart = parseTextTimeToDate(f?.InicioTarde);
        const pmEnd   = parseTextTimeToDate(f?.FinTarde);

        if (!alive) return;
        setInicioAM(amStart);
        setFinAM(amEnd);
        setInicioPM(pmStart);
        setFinPM(pmEnd);

        originalRef.current = {
          inicioAM: amStart, finAM: amEnd, inicioPM: pmStart, finPM: pmEnd,
        };
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        console.error(e);
        setError('No se pudieron cargar los horarios.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [settingsSvc]);

  // Validación y estado derivado
  const validation: string | null = React.useMemo(() => {
    if (!(inicioAM && finAM && inicioPM && finPM)) return 'Completa todos los horarios.';
    if (!isTimeRangeValid(inicioAM, finAM))
      return 'Revisa los horarios de la mañana: el inicio debe ser menor que el fin.';
    if (!isTimeRangeValid(inicioPM, finPM))
      return 'Revisa los horarios de la tarde: el inicio debe ser menor que el fin.';
    return null;
  }, [inicioAM, finAM, inicioPM, finPM]);

  const dirty = React.useMemo(() => {
    const o = originalRef.current;
    if (!o) return false;
    return (
      minutesOf(inicioAM) !== minutesOf(o.inicioAM) ||
      minutesOf(finAM)    !== minutesOf(o.finAM)    ||
      minutesOf(inicioPM) !== minutesOf(o.inicioPM) ||
      minutesOf(finPM)    !== minutesOf(o.finPM)
    );
  }, [inicioAM, finAM, inicioPM, finPM]);

  // Guardar
  const save = React.useCallback(async () => {
    if (validation) {
      setError(validation);
      return false;
    }
    try {
      setSaving(true);
      setError(null);

      const payload: SettingsTextFields = {
        InicioManana: formatDateToHHmm(inicioAM),
        FinManana:    formatDateToHHmm(finAM),
        InicioTarde:  formatDateToHHmm(inicioPM),
        FinTarde:     formatDateToHHmm(finPM),
      };

      await settingsSvc.update(payload);

      // Actualiza “original” después de guardar
      originalRef.current = {
        inicioAM, finAM, inicioPM, finPM,
      };
      return true;
    } catch (e: any) {
      console.error(e);
      setError('No se pudieron guardar los horarios.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [settingsSvc, inicioAM, finAM, inicioPM, finPM, validation]);

  // Reset a originales
  const reset = React.useCallback(() => {
    const o = originalRef.current;
    if (!o) return;
    setInicioAM(o.inicioAM);
    setFinAM(o.finAM);
    setInicioPM(o.inicioPM);
    setFinPM(o.finPM);
    setError(null);
  }, []);

  // Helpers para setear con strings (por si usas inputs text)
  const setInicioAMText = React.useCallback((s: string) => setInicioAM(parseTextTimeToDate(s)), []);
  const setFinAMText    = React.useCallback((s: string) => setFinAM(parseTextTimeToDate(s)), []);
  const setInicioPMText = React.useCallback((s: string) => setInicioPM(parseTextTimeToDate(s)), []);
  const setFinPMText    = React.useCallback((s: string) => setFinPM(parseTextTimeToDate(s)), []);

  return {
    // state
    inicioAM, finAM, inicioPM, finPM,
    setInicioAM, setFinAM, setInicioPM, setFinPM,
    setInicioAMText, setFinAMText, setInicioPMText, setFinPMText,

    // status
    loading, saving, error, validation, dirty,

    // actions
    save, reset,
  };
}
