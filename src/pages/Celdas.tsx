import { FiPlus, FiSave } from "react-icons/fi";
import Celda from "../components/vistaAdmin/celdas/celda.component";
import QuickReservAdmin from "../components/vistaAdmin/celdas/quickReservAdmin.component";
import type { celda, createCelda, Itinerancia } from "../types/celdas";
import type { VehicleType } from "../types/reservas";
import { useCeldas, useCreateCelda } from "../hooks/useCeldas";
import { useNotificacion } from "../hooks/useNotificacion";
import { AiOutlineLoading } from "react-icons/ai";
import { useState } from "react";
import Popup from "../components/popup.component";

const formInicial: createCelda = {
  Title: "",
  TipoCelda: "Carro",
  Itinerancia: "Empleado Itinerante",
  Activa: "Activa",
};

const inputClass =
  "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";

function Celdas() {
  const celdas = useCeldas();
  const crearCelda = useCreateCelda();
  const { notificar } = useNotificacion();
  const [crear, setCrear] = useState(false);
  const [form, setForm] = useState<createCelda>(formInicial);

  const setCampo = <K extends keyof createCelda>(
    campo: K,
    valor: createCelda[K],
  ) => setForm((prev) => ({ ...prev, [campo]: valor }));

  // Evita crear dos celdas con el mismo nombre (las reservas apuntan a la celda por su Title)
  const titulo = form.Title.trim();
  const duplicada = celdas.data?.some(
    (c: celda) => c.Title.toLowerCase() === titulo.toLowerCase(),
  );

  function abrirCrear() {
    setForm(formInicial);
    setCrear(true);
  }
  function closeCrear() {
    setCrear(false);
  }

  function guardarCrear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!titulo || duplicada) return;
    crearCelda.mutate(
      { ...form, Title: titulo },
      {
        onSuccess: () => {
          notificar(`Celda ${titulo} creada`, "exito");
          closeCrear();
        },
        onError: (err) =>
          notificar(`No se pudo crear la celda: ${err.message}`, "error"),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6 text-slate-800">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-2xl text-slate-900 mt-1">Celdas</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 h-11 px-5 rounded-lg bg-blue-700 text-white text-sm font-semibold" onClick={abrirCrear}>
            <FiPlus /> Añadir celda
          </button>
        </div>
      </div>

      {/* Reserva rápida */}
      <QuickReservAdmin />

      {/* Grilla de celdas */}
      {celdas.isPending ? (
        <div className="flex justify-center m-10">
          <AiOutlineLoading
            className="animate-spin text-blue-500 text-3xl"
            size={18}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {celdas.data?.map((celda: celda) => (
            <Celda key={celda.ID} celda={celda}></Celda>
          ))}
        </div>
      )}
      {/*ventana emergente para crear un slot */}
      <Popup isOpen={crear} onClose={closeCrear} titulo="Crear nueva celda">
        <form onSubmit={guardarCrear} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm">Nombre de la celda *</label>
            <input
              type="text"
              required
              className={inputClass}
              value={form.Title}
              onChange={(e) => setCampo("Title", e.target.value)}
            />
            {duplicada && (
              <span className="text-xs text-red-600">
                Ya existe una celda con ese nombre
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm">Tipo de vehículo *</label>
            <select
              className={inputClass}
              value={form.TipoCelda}
              onChange={(e) =>
                setCampo("TipoCelda", e.target.value as VehicleType)
              }
            >
              <option value="Carro">Carro</option>
              <option value="Moto">Moto</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm">Itinerancia *</label>
            <select
              className={inputClass}
              value={form.Itinerancia}
              onChange={(e) =>
                setCampo("Itinerancia", e.target.value as Itinerancia)
              }
            >
              <option value="Empleado Itinerante">Empleado Itinerante</option>
              <option value="Empleado Fijo">Empleado Fijo</option>
              <option value="Directivo">Directivo</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.Activa === "Activa"}
              onChange={(e) =>
                setCampo("Activa", e.target.checked ? "Activa" : "Inactiva")
              }
            />
            Crear la celda activa
          </label>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={closeCrear}
              className="h-11 px-5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold cursor-pointer hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!titulo || duplicada || crearCelda.isPending}
              className="flex items-center gap-2 h-11 px-6 rounded-lg bg-blue-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {crearCelda.isPending ? (
                <AiOutlineLoading className="animate-spin" size={18} />
              ) : (
                <FiSave />
              )}
              Crear celda
            </button>
          </div>
        </form>
      </Popup>
    </div>
  );
}

export default Celdas;
