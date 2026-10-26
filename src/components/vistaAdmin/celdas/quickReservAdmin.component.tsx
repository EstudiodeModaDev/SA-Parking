import { useState } from "react";
import { FiBookmark } from "react-icons/fi";
import { AiOutlineLoading } from "react-icons/ai";
import { useSettings } from "../../../hooks/useSettings";
import { useCompanyUsers } from "../../../hooks/useCompanyUsers";
import type { companyUsers } from "../../../types/companyUsers";
import type { createReservaAdmin } from "../../../types/reservas";
import { sumarDias } from "../../../utils/fechas";
import SelectColaborador from "./selectColaborador.component";
import { useCreateReservaAdmin } from "../../../hooks/useReserva";
import { useNotificacion } from "../../../hooks/useNotificacion";

type NuevaReserva = Omit<createReservaAdmin, "NombreUsuario" | "Title">;

const formInicial: NuevaReserva = {
  Date: "",
  Turn: "Manana",
  VehicleType: "Carro",
  Codigo: "",
  Notify: false,
};

const inputClass =
  "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";

function QuickReservAdmin() {
  const settings = useSettings();
  const usercompany = useCompanyUsers();
  const [form, setForm] = useState<NuevaReserva>(formInicial);
  const [colaborador, setColaborador] = useState<companyUsers | null>(null);
  const createReserva = useCreateReservaAdmin();
  const { notificar } = useNotificacion();
  const isPending = createReserva.isPending;

  const setCampo = <K extends keyof NuevaReserva>(
    campo: K,
    valor: NuevaReserva[K],
  ) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const setting = settings.data?.[0];
  const fechamin = sumarDias(1);
  const fechamax = sumarDias(Number(setting?.VisibleDays ?? 0));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!colaborador) return;
    const data: createReservaAdmin = {
      ...form,
      NombreUsuario: colaborador.displayName,
      Title: colaborador.mail ?? "",
    };
    createReserva.mutate(data, {
      // Solo se limpia el formulario si la reserva se creo
      onSuccess: () => {
        setForm(formInicial);
        setColaborador(null);
        notificar("Reserva creada", "exito");
      },
      onError: (error) =>
        notificar(`No se pudo realizar la reserva: ${error.message}`, "error"),
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4"
    >
      <div className="flex-column md:flex items-center justify-between">
        <div className="flex-column md:flex  items-center gap-2">
          <p className="font-bold text-lg text-slate-900">Reserva rápida</p>
          <span className="bg-slate-100 border border-slate-200 text-xs text-slate-700 px-2.5 py-0.5 rounded-full">
            Administrador
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Asignación a nombre de un tercero
        </p>
      </div>

      {!setting ? (
        <div className="flex justify-center m-6">
          <AiOutlineLoading
            className="animate-spin text-blue-500 text-3xl"
            size={18}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm">Fecha *</label>
            <input
              type="date"
              required
              className={inputClass}
              min={fechamin}
              max={fechamax}
              value={form.Date}
              onChange={(e) => setCampo("Date", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm">Turno *</label>
            <select
              className={inputClass}
              value={form.Turn}
              onChange={(e) => setCampo("Turn", e.target.value)}
            >
              <option value="Manana">
                Mañana ({setting.InicioHorarioMa_x00f1_ana} -{" "}
                {setting.FinalMa_x00f1_ana})
              </option>
              <option value="Tarde">
                Tarde ({setting.InicioTarde} - {setting.FinalTarde})
              </option>
              <option value="Día completo">
                Día completo ({setting.InicioHorarioMa_x00f1_ana} -{" "}
                {setting.FinalTarde})
              </option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm">Tipo de vehículo *</label>
            <select
              className={inputClass}
              value={form.VehicleType}
              onChange={(e) => setCampo("VehicleType", e.target.value)}
            >
              <option value="Carro">Carro</option>
              <option value="Moto">Moto</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm">Colaborador beneficiario *</label>
            <SelectColaborador
              usuarios={usercompany.data ?? []}
              value={colaborador}
              onChange={setColaborador}
              isLoading={usercompany.isLoading}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        <button
          type="submit"
          disabled={!setting || !colaborador || isPending}
          className="flex items-center gap-2 h-11 px-6 rounded-lg bg-blue-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <AiOutlineLoading className="animate-spin" size={18} />
          ) : (
            <FiBookmark />
          )}
          Reservar para {colaborador?.displayName ?? "..."}
        </button>
      </div>
    </form>
  );
}

export default QuickReservAdmin;
