import {
  MdOutlineSchedule,
  MdOutlineEditCalendar,
  MdOutlineGavel,
} from "react-icons/md";
import { FiMinus, FiPlus, FiSave } from "react-icons/fi";
import { useEditSettings, useSettings } from "../hooks/useSettings";
import { useEffect, useState } from "react";
import type { settings } from "../types/settings";
import { AiOutlineLoading } from "react-icons/ai";
import { useNotificacion } from "../hooks/useNotificacion";

interface Props {}

function Configuration(props: Props) {
  const {} = props;
  const { data: settings, isPending, isError, error } = useSettings();
  const [visibleDays, setVisibleDays] = useState(0);
  const editarUsuarios = useEditSettings();
  const { notificar } = useNotificacion();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); // evita que el navegador recargue la página
    // FormData lee los valores de los inputs usando su atributo `name`
    const form = new FormData(e.currentTarget);
    const data: settings = {
      VisibleDays: String(visibleDays),
      InicioHorarioMa_x00f1_ana: String(form.get("inicioManana")),
      FinalMa_x00f1_ana: String(form.get("finalManana")),
      InicioTarde: String(form.get("inicioTarde")),
      FinalTarde: String(form.get("finalTarde")),
      TerminosyCondiciones: String(form.get("TyC")),
      PicoPlaca: false,
    };
    editarUsuarios.mutate(data, {
      onSuccess: () => notificar("Configuraciones guardadas", "exito"),
      onError: (err) => notificar(err.message, "error"),
    });
  }

  useEffect(() => {
    if (settings?.[0]) setVisibleDays(Number(settings[0].VisibleDays));
  }, [settings]);

  if (isPending)
    return (
      <div className="flex justify-center m-10">
        <AiOutlineLoading
          className="animate-spin text-blue-500 text-3xl"
          size={18}
        />
      </div>
    );
  if (isError) return <p>Error al cargar configuraciones: {error.message}</p>;
  if (!settings?.[0]) return <p>No se encontraron configuraciones</p>;

  return (
    <>
      <form onSubmit={onSubmit}>
        <div className="gap-6 flex flex-col text-slate-800">
          {/* Encabezado */}
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div>
                  <p className="font-bold text-3xl text-slate-900">
                    Configuración del Sistema
                  </p>
                  <p className="font-light text-slate-500 mt-2 max-w-3xl">
                    Ajustes globales de reserva, ventanas horarias operativas y
                    políticas de uso institucional.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={editarUsuarios.isPending}
                  className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl shadow-sm px-5 py-3 cursor-pointer"
                >
                  <FiSave size={18} />
                  {editarUsuarios.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>

          {/* Parámetros de Reserva */}
          <div className="bg-white w-full rounded-2xl shadow-sm p-7 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-slate-50 text-blue-900 rounded-xl p-2">
                  <MdOutlineEditCalendar size={22} />
                </div>
                <div>
                  <p className="text-xl text-slate-900">
                    Parámetros de Reserva
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-slate-900">
                Días máximos visibles para reserva
              </p>
              <p className="text-sm text-slate-500">
                Establece con cuánta antelación el usuario final puede explorar
                y bloquear espacios.
              </p>
            </div>
            <div className="flex-column md:flex items-center gap-3 pt-2">
              <div className="flex items-center bg-slate-50 rounded-xl">
                <button
                  type="button"
                  className="px-5 py-3 text-slate-700"
                  onClick={() => {
                    setVisibleDays(visibleDays - 1);
                  }}
                >
                  <FiMinus />
                </button>
                <span className="w-10 text-center text-lg">{visibleDays}</span>
                <button
                  type="button"
                  className="px-5 py-3 text-slate-700"
                  onClick={() => {
                    setVisibleDays(visibleDays + 1);
                  }}
                >
                  <FiPlus />
                </button>
              </div>
              <span className="text-slate-500">días</span>
            </div>
          </div>

          {/* Términos y Condiciones */}
          <div className="bg-white w-full rounded-2xl shadow-sm p-7 flex flex-col gap-2">
            <div className="flex items-start gap-4">
              <div className="bg-slate-50 text-blue-900 rounded-xl p-2">
                <MdOutlineGavel size={22} />
              </div>
              <div>
                <p className="text-xl text-slate-900">Términos y Condiciones</p>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-slate-900">Texto de términos y condiciones</p>
              <p className="text-sm text-slate-500">
                Estas son las condiciones de uso del parqueadero que el
                colaborador debe aceptar antes de confirmar una reserva.
              </p>
            </div>
            <div className="pt-2">
              <textarea
                rows={6}
                name="TyC"
                placeholder="Escribe aquí los términos y condiciones de uso del parqueadero..."
                defaultValue={settings[0].TerminosyCondiciones}
                className="w-full bg-slate-50 rounded-xl px-5 py-3 outline-none resize-y placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Horarios y Turnos Operativos */}
          <div className="bg-white w-full rounded-2xl shadow-sm p-7 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-slate-50 text-blue-900 rounded-xl p-2">
                <MdOutlineSchedule size={22} />
              </div>
              <div>
                <p className="text-xl text-slate-900">
                  Horarios y Turnos Operativos
                </p>
                <p className="text-sm text-slate-500">
                  Define las franjas horarias disponibles para reserva de carros
                  y motos
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Turno Mañana */}
              <div className="bg-slate-50 rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-56">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg hidden md:flex">
                    AM
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-slate-900">
                      Turno Mañana
                      <span className="w-2 h-2 rounded-full bg-green-600" />
                    </p>
                    <p className="text-sm text-slate-500">
                      Turno matutino regular
                    </p>
                  </div>
                </div>
                <div className="flex-column md:flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-500">Inicio:</span>
                    <input
                      className="w-30 text-center"
                      type="time"
                      name="inicioManana"
                      defaultValue={settings[0].InicioHorarioMa_x00f1_ana}
                    />
                  </div>
                  <span className="text-slate-300 hidden md:flex">—</span>
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-500">Fin:</span>
                    <input
                      className="w-30 text-center"
                      type="time"
                      name="finalManana"
                      defaultValue={settings[0].FinalMa_x00f1_ana}
                    />
                  </div>
                </div>
              </div>

              {/* Turno Tarde */}
              <div className="bg-slate-50 rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-56">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg hidden md:flex">
                    PM
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-slate-900">
                      Turno Tarde
                      <span className="w-2 h-2 rounded-full bg-green-600" />
                    </p>
                    <p className="text-sm text-slate-500">
                      Turno vespertino regular
                    </p>
                  </div>
                </div>
                <div className="flex-column md:flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-500">Inicio:</span>
                    <input
                      className="w-30 text-center"
                      type="time"
                      name="inicioTarde"
                      defaultValue={settings[0].InicioTarde}
                    />
                  </div>
                  <span className="text-slate-300 hidden md:flex">—</span>
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-500">Fin:</span>
                    <input
                      className="w-30 text-center"
                      type="time"
                      name="finalTarde"
                      defaultValue={settings[0].FinalTarde}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}

export default Configuration;
