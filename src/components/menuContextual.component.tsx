import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface OpcionMenu {
  label: string;
  onClick: () => void;
  icono?: React.ReactNode;
  peligro?: boolean; // la marca en rojo (ej: eliminar)
  deshabilitado?: boolean;
}

interface Props {
  // null = menu cerrado. Normalmente viene de { x: e.clientX, y: e.clientY }
  posicion: { x: number; y: number } | null;
  onClose: () => void;
  opciones: OpcionMenu[];
  // "derecha": el borde derecho del menu queda en x (util para botones de 3 puntos)
  alinear?: "izquierda" | "derecha";
}

function MenuContextual(props: Props) {
  const { posicion, onClose, opciones, alinear = "izquierda" } = props;
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState(posicion);

  // Ajusta la posicion para que el menu no se salga de la pantalla
  useLayoutEffect(() => {
    if (!posicion || !menuRef.current) return;
    const { width, height } = menuRef.current.getBoundingClientRect();
    const x = alinear === "derecha" ? posicion.x - width : posicion.x;
    setCoords({
      x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      y: Math.min(posicion.y, window.innerHeight - height - 8),
    });
  }, [posicion, alinear]);

  useEffect(() => {
    if (!posicion) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Un clic fuera del menu lo cierra
    const alClicFuera = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", alPresionar);
    window.addEventListener("mousedown", alClicFuera);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      // limpieza
      window.removeEventListener("keydown", alPresionar);
      window.removeEventListener("mousedown", alClicFuera);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [posicion, onClose]);

  // Si no hay posicion, no se muestra nada
  if (!posicion) return null;
  const { x, y } = coords ?? posicion;
  return (
    <div
      ref={menuRef}
      role="menu"
      style={{ top: y, left: x }}
      className="fixed z-50 min-w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5"
      onContextMenu={(e) => e.preventDefault()}
    >
      {opciones.map((op) => (
        <button
          key={op.label}
          type="button"
          role="menuitem"
          disabled={op.deshabilitado}
          onClick={() => {
            op.onClick();
            onClose();
          }}
          className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            op.peligro
              ? "text-red-600 hover:bg-red-50"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {op.icono}
          {op.label}
        </button>
      ))}
    </div>
  );
}

export default MenuContextual;
