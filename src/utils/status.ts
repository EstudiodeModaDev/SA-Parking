export const statusColor = (status: string) => {
  const t = (status || '').toLowerCase();
  if (t.includes('cancel')) return '#f87171'; // rojo suave
  if (t.includes('termin')) return '#a3a3a3'; // gris
  if (t.includes('act')) return '#34d399';    // verde
  return '#60a5fa';                            // azul
};
