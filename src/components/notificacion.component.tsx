import React, { useCallback, useMemo, useRef, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiX } from "react-icons/fi";
import {
  NotificacionContext,
  type TipoNotificacion,
} from "../hooks/useNotificacion";

interface Notificacion {
  id: number;
  mensaje: string;
  tipo: TipoNotificacion;
}

interface Props {
  children: React.ReactNode;
  duracion?: number; // milisegundos que dura visible cada notificacion
}

const estilos: Record<TipoNotificacion, string> = {
  exito: "bg-green-50 border-green-500 text-green-800",
  error: "bg-red-50 border-red-500 text-red-800",
};

function NotificacionProvider(props: Props) {
  const duracion = props.duracion ?? 4000;
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const siguienteId = useRef(0);

  const cerrar = useCallback((id: number) => {
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notificar = useCallback(
    (mensaje: string, tipo: TipoNotificacion) => {
      const id = siguienteId.current++;
      setNotificaciones((prev) => [...prev, { id, mensaje, tipo }]);
      setTimeout(() => cerrar(id), duracion);
    },
    [cerrar, duracion],
  );

  // useMemo evita que todos los consumidores se re-rendericen en cada notificacion
  const value = useMemo(() => ({ notificar }), [notificar]);

  return (
    <NotificacionContext.Provider value={value}>
      {props.children}
      {/* Pila de notificaciones en la esquina superior derecha */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {notificaciones.map((n) => (
          <div
            key={n.id}
            role={n.tipo === "error" ? "alert" : "status"}
            className={`flex items-start gap-3 border-l-4 rounded-xl shadow-lg p-4 text-sm ${estilos[n.tipo]}`}
          >
            {n.tipo === "exito" ? (
              <FiCheckCircle size={20} className="shrink-0 text-green-600" />
            ) : (
              <FiAlertCircle size={20} className="shrink-0 text-red-600" />
            )}
            <p className="flex-1 break-words">{n.mensaje}</p>
            <button
              type="button"
              onClick={() => cerrar(n.id)}
              className="cursor-pointer shrink-0"
            >
              <FiX size={16} />
            </button>
          </div>
        ))}
      </div>
    </NotificacionContext.Provider>
  );
}

export default NotificacionProvider;
