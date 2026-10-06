import React, { useEffect } from "react";
import { FiX } from "react-icons/fi";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  children: React.ReactNode;
}

function Popup(props: Props) {
  const {} = props;
  useEffect(() => {
    if (!props.isOpen) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar); // limpieza
  }, [props.isOpen, props.onClose]);

  // Si no está abierto, no se muestra nada
  if (!props.isOpen) return null;
  return (
    //fondo oscuro
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={props.onClose}
    >
      {/* La caja blanca. stopPropagation evita que un clic ADENTRO la cierre */}
      <div
        className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-bold text-lg text-slate-900">{props.titulo}</p>
          <button type="button" onClick={props.onClose} className="cursor-pointer">
            <FiX size={20} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto text-sm text-slate-700">
          {props.children}
        </div>
      </div>
    </div>
  );
}

export default Popup;
