// Devuelve la fecha de hoy + `dias` en formato YYYY-MM-DD (hora local), como lo espera <input type="date">
export function sumarDias(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}
