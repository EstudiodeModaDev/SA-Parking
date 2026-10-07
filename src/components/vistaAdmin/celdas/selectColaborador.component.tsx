import { useEffect, useMemo, useRef, useState } from "react";
import type { companyUsers } from "../../../types/companyUsers";

interface Props {
  usuarios: companyUsers[];
  value: companyUsers | null;
  onChange: (usuario: companyUsers | null) => void;
  isLoading?: boolean;
}

// Minusculas y sin tildes para comparar nombres
const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function SelectColaborador({ usuarios, value, onChange, isLoading }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [activo, setActivo] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  const filtrados = useMemo(() => {
    const termino = normalizar(busqueda);
    if (!termino) return usuarios;
    return usuarios.filter(
      (u) =>
        normalizar(u.displayName ?? "").includes(termino) ||
        normalizar(u.mail ?? "").includes(termino),
    );
  }, [usuarios, busqueda]);

  // Cierra la lista al hacer clic por fuera
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) {
        setAbierto(false);
        setBusqueda("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Mantiene visible la opcion resaltada al navegar con el teclado
  useEffect(() => {
    listaRef.current?.children[activo]?.scrollIntoView({ block: "nearest" });
  }, [activo]);

  const seleccionar = (usuario: companyUsers) => {
    onChange(usuario);
    setBusqueda("");
    setAbierto(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAbierto(true);
      setActivo((i) => Math.min(i + 1, filtrados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && abierto && filtrados[activo]) {
      e.preventDefault();
      seleccionar(filtrados[activo]);
    } else if (e.key === "Escape") {
      setAbierto(false);
      setBusqueda("");
    }
  };

  return (
    <div ref={contenedorRef} className="relative">
      <input
        type="text"
        value={abierto ? busqueda : (value?.displayName ?? "")}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setActivo(0);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onKeyDown={handleKeyDown}
        placeholder={
          isLoading ? "Cargando colaboradores..." : "Buscar por nombre o correo..."
        }
        className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
      />

      {abierto && (
        <ul
          ref={listaRef}
          className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1"
        >
          {filtrados.length === 0 ? (
            <li className="px-3 py-3 text-sm text-slate-500">
              {isLoading ? "Cargando..." : "Sin resultados"}
            </li>
          ) : (
            filtrados.map((usuario, i) => (
              <li
                key={usuario.mail ?? usuario.displayName}
                // onMouseDown evita que el input pierda el foco antes de seleccionar
                onMouseDown={(e) => {
                  e.preventDefault();
                  seleccionar(usuario);
                }}
                onMouseEnter={() => setActivo(i)}
                className={`px-3 py-2 cursor-pointer ${
                  i === activo ? "bg-slate-100" : ""
                }`}
              >
                <p className="text-sm text-slate-900">{usuario.displayName}</p>
                <p className="text-xs text-slate-500">{usuario.mail}</p>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default SelectColaborador;
