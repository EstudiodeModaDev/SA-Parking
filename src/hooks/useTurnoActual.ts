import { useEffect, useState } from "react";
import { useSettings } from "./useSettings";

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const minutosBogota = () => {
  const [h, m] = new Date()
    .toLocaleTimeString("en-GB", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" })
    .split(":").map(Number);
  return h * 60 + m;
};

export function useTurnoActual() {
  const { data, isLoading } = useSettings();
  const [ahora, setAhora] = useState(minutosBogota);

  useEffect(() => {
    const id = setInterval(() => setAhora(minutosBogota()), 60_000);
    return () => clearInterval(id);
  }, []);

  const s = data?.[0];
  if (!s) return { turno: null, isLoading };

  const turnos = [
    { key: "Manana", label: "AM · Mañana", inicio: s.InicioHorarioMa_x00f1_ana, fin: s.FinalMa_x00f1_ana },
    { key: "Tarde",  label: "PM · Tarde",  inicio: s.InicioTarde,               fin: s.FinalTarde },
  ] as const;

  // [inicio, fin): a las 12:00 ya cuenta como Tarde
  const turno = turnos.find(t => ahora >= aMinutos(t.inicio) && ahora < aMinutos(t.fin)) ?? null;
  return { turno, isLoading };
}