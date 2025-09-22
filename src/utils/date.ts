const pad2 = (n: number) => ('0' + n).slice(-2);

export const ymdLocal = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const last30Days = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { from: ymdLocal(start), to: ymdLocal(end) };
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const toISODate = (d: Date | null) => d ? d.toISOString().slice(0, 10) : '';
export const todayISO = () => new Date().toISOString().slice(0, 10)
const TZ_CO = 'America/Bogota';

// Fecha + hora local (Bogotá) → "18 sept 2025, 8:38 a. m."
export function formatDateTime(iso: string, locale = 'es-CO') {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TZ_CO,
  }).format(d);
}

// Solo fecha local → "18 de septiembre de 2025"
export function formatDateLocal(iso: string, locale = 'es-CO') {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: TZ_CO,
  }).format(d);
}

// Si tu campo es "fecha de la reserva" y viene con 'T00:00:00Z',
// usa UTC para NO correr de día por huso horario
export function formatDateUTC(iso: string, locale = 'es-CO') {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(d);
}

// Opcional: relativo tipo "hace 3 horas"
export function formatRelative(iso: string, locale = 'es') {
  const d = new Date(iso).getTime();
  const now = Date.now();
  let diff = Math.round((d - now) / 1000); // segundos

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year',   60 * 60 * 24 * 365],
    ['month',  60 * 60 * 24 * 30],
    ['day',    60 * 60 * 24],
    ['hour',   60 * 60],
    ['minute', 60],
    ['second', 1],
  ];

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs || unit === 'second') {
      const value = Math.round(diff / secs);
      return rtf.format(value, unit);
    }
  }
  return '';
}
