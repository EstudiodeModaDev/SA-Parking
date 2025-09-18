// src/utils/timeText.ts
// Soporta "07:00", "7:00", "7", "7.30", "07:00 AM", "12:00 PM", etc.
// Devuelve Date (solo hora) o null si inválido.
const AMPM = /\b(am|pm|a\.m\.|p\.m\.)\b/i;

export function parseTextTimeToDate(input?: string | null): Date | null {
  if (!input) return null;
  let s = String(input).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return null;

  // Normaliza separadores
  s = s.replace(/\./g, ':');

  // Detecta AM/PM
  const hasAmPm = AMPM.test(s);
  let isPM = /p/.test(s);
  s = s.replace(AMPM, '').trim();

  // Extrae hh:mm
  const m = s.match(/^(\d{1,2})(?::?(\d{1,2}))?$/);
  if (!m) return null;

  let h = Number(m[1]);
  let min = Number(m[2] ?? 0);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  if (min < 0 || min > 59) return null;

  if (hasAmPm) {
    // 12 AM -> 0h, 12 PM -> 12h
    if (isPM) h = h % 12 + 12;
    else h = h % 12; // AM
  }
  if (h < 0 || h > 23) return null;

  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d;
}

// Formatea Date -> "HH:mm" (24h) para guardar en texto
export function formatDateToHHmm(d?: Date | null): string {
  if (!(d instanceof Date)) return '';
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Validación: a < b (mismo día)
export function isTimeRangeValid(start?: Date | null, end?: Date | null): boolean {
  if (!(start instanceof Date) || !(end instanceof Date)) return false;
  return start.getHours() * 60 + start.getMinutes() < end.getHours() * 60 + end.getMinutes();
}
