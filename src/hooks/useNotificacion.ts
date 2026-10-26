import { createContext, useContext } from "react";

export type TipoNotificacion = "exito" | "error";

export interface NotificacionContextValue {
  notificar: (mensaje: string, tipo: TipoNotificacion) => void;
}

export const NotificacionContext =
  createContext<NotificacionContextValue | null>(null);

// Uso: const { notificar } = useNotificacion(); notificar("Reserva creada", "exito");
export function useNotificacion() {
  const ctx = useContext(NotificacionContext);
  if (!ctx)
    throw new Error("useNotificacion debe usarse dentro de NotificacionProvider");
  return ctx;
}
