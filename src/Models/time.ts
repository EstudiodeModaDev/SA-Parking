export type Hours = {
  InicioManana?: number;
  FinalManana?: number;
  InicioTarde?: number;
  FinalTarde?: number;
};

const clampHour = (n?: number) => {
  const x = Number.isFinite(n) ? Math.floor(Number(n as number)) : 0;
  return Math.min(23, Math.max(0, x));
};

export const fmtHour = (n?: number) => `${String(clampHour(n)).padStart(2,'0')}:00`;

export function deriveHoursLabels(hours?: Hours) {
  return {
    amStart: fmtHour(hours?.InicioManana ?? 6),
    amEnd:   fmtHour(hours?.FinalManana  ?? 12),
    pmStart: fmtHour(hours?.InicioTarde  ?? 13),
    pmEnd:   fmtHour(hours?.FinalTarde   ?? 19),
  };
}

export function getCurrentTurnFromHours(hours?: Hours): 'Manana' | 'Tarde' | null {
  const amStart = { h: clampHour(hours?.InicioManana ?? 6),  m: 0 };
  const amEnd   = { h: clampHour(hours?.FinalManana  ?? 12), m: 59 };
  const pmStart = { h: clampHour(hours?.InicioTarde  ?? 13), m: 0 };
  const pmEnd   = { h: clampHour(hours?.FinalTarde   ?? 19), m: 0 };

  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const inRange = (a:{h:number;m:number}, b:{h:number;m:number}) =>
    mins >= (a.h*60+a.m) && mins <= (b.h*60+b.m);

  if (inRange(amStart, amEnd)) return 'Manana';
  if (inRange(pmStart, pmEnd)) return 'Tarde';
  return null;
}