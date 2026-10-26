import { FiCalendar, FiClock, FiZap } from "react-icons/fi";
import { MdDirectionsCar } from "react-icons/md";
import { useSettings } from "../../hooks/useSettings";
import { useCreateReserva } from "../../hooks/useReserva";
import type { createReserva } from "../../types/reservas";
import { useState } from "react";
import Popup from "../popup.component";
import { sumarDias } from "../../utils/fechas";
import { useNotificacion } from "../../hooks/useNotificacion";

interface Props {}

function QuickReserv(props: Props) {
  const {} = props;
  const settings = useSettings().data;
  // Los hooks deben llamarse antes de cualquier return
  const crearReserva = useCreateReserva();
  const { notificar } = useNotificacion();
  const [verTerminos, setVerTerminos] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  if (settings === undefined) return null;
  const setting = settings[0];
  const fechamin = sumarDias(1);
  const fechamax = sumarDias(Number(setting.VisibleDays));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); // evita que el navegador recargue la página
    if (!aceptaTerminos) return;
    // FormData lee los valores de los inputs usando su atributo `name`
    const form = new FormData(e.currentTarget);
    const data: createReserva = {
      Date: String(form.get("fechaReserv")),
      Turn: String(form.get("Turno")),
      VehicleType: String(form.get("VehType")),
      Codigo: "",
      Notify: false,
    };
    crearReserva.mutate(data, {
      onSuccess: () => notificar("Reserva creada", "exito"),
      onError: (err) => notificar(err.message, "error"),
    });
  }

  return (
    <div className="bg-white w-full rounded-2xl shadow-sm p-6 flex flex-col gap-6">
      <form onSubmit={onSubmit}>
        <div className="flex items-center gap-4">
          <div className="bg-sky-100 w-10 h-10 rounded-xl flex items-center justify-center">
            <FiZap className="text-blue-700" size={20} />
          </div>
          <p className="font-bold text-lg text-slate-900">Reserva rápida</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <FiCalendar className="text-blue-700" />
              Fecha de la reserva
            </label>
            <input
              name="fechaReserv"
              type="date"
              className=" items-center bg-slate-50 rounded-xl px-4 py-3"
              min={fechamin}
              max={fechamax}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <FiClock className="text-blue-700" />
              Turno horario
            </label>
            <select
              className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"
              name="Turno"
            >
              <option value="Manana">
                Mañana ({setting.InicioHorarioMa_x00f1_ana} -{" "}
                {setting.FinalMa_x00f1_ana})
              </option>
              <option value="Tarde">
                Tarde ({setting.InicioTarde} - {setting.FinalTarde})
              </option>
              <option value="Día completo">
                Dia Completo ({setting.InicioHorarioMa_x00f1_ana} -{" "}
                {setting.FinalTarde})
              </option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <MdDirectionsCar className="text-blue-700" />
              Tipo del vehiculo
            </label>
            <select
              className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"
              name="VehType"
            >
              <option value={"Carro"}>Carro</option>
              <option value={"Moto"}>Moto</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-2">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                name="terminos"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
                required
                className="w-4 h-4 accent-blue-700"
              />
              He leído y acepto los
              <a
                className="font-bold text-blue-700 -mx-1 underline underline cursor-pointer"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setVerTerminos(true);
                }}
              >
                Términos y condiciones
              </a>{" "}
              del parqueadero.
            </label>
          </div>
          <Popup
            isOpen={verTerminos}
            onClose={() => setVerTerminos(false)}
            titulo="Terminos y condiciones"
          >
            <p>{setting.TerminosyCondiciones}</p>
          </Popup>
          <button
            type="submit"
            disabled={crearReserva.isPending || !aceptaTerminos}
            className="flex items-center justify-center gap-3 bg-blue-700 text-white font-bold rounded-lg px-6 py-2.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MdDirectionsCar size={20} />
            {crearReserva.isPending ? "Reservando..." : "Reservar cupo"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default QuickReserv;
