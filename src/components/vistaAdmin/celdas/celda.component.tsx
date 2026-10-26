import { useState } from "react";
import { FiBookmark, FiMoreHorizontal, FiPower, FiSave } from "react-icons/fi";
import { AiOutlineLoading } from "react-icons/ai";
import type { celda, Itinerancia } from "../../../types/celdas";
import type {
  createReservaPuntualAdmin,
  VehicleType,
} from "../../../types/reservas";
import type { companyUsers } from "../../../types/companyUsers";
import { useSettings } from "../../../hooks/useSettings";
import { useCompanyUsers } from "../../../hooks/useCompanyUsers";
import { useCreateReservaPuntualAdmin } from "../../../hooks/useReserva";
import { sumarDias } from "../../../utils/fechas";
import SelectColaborador from "./selectColaborador.component";
import { MdDirectionsCar } from "react-icons/md";
import { FaCalendarCheck, FaMotorcycle } from "react-icons/fa";
import MenuContextual, {
  type OpcionMenu,
} from "../../menuContextual.component";
import {
  useActivateCelda,
  useDeactivateCelda,
  useEditCelda,
} from "../../../hooks/useCeldas";
import { useNotificacion } from "../../../hooks/useNotificacion";
import { BiEdit } from "react-icons/bi";
import Popup from "../../popup.component";

interface Props {
  celda: celda;
}

type FormEdit = Pick<celda, "Title" | "TipoCelda" | "Itinerancia">;
// El tipo de vehiculo y la celda salen de la propia celda
type FormPuntual = Pick<createReservaPuntualAdmin, "Date" | "Turn">;

const puntualInicial: FormPuntual = { Date: "", Turn: "Manana" };

const inputClass =
  "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";

function Celda(props: Props) {
  const { celda } = props;
  const Icono = celda.TipoCelda === "Carro" ? MdDirectionsCar : FaMotorcycle;
  const activa = celda.Activa === "Activa";
  const enUso = activa && (celda.Ocupacion.Manana || celda.Ocupacion.Tarde);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [edit, setEdit] = useState(false);
  const [puntual, setPuntual] = useState(false);
  const activar = useActivateCelda();
  const desactivar = useDeactivateCelda();
  const editar = useEditCelda();
  const reservar = useCreateReservaPuntualAdmin();
  const settings = useSettings();
  const usercompany = useCompanyUsers();
  const [formPuntual, setFormPuntual] = useState<FormPuntual>(puntualInicial);
  const [colaborador, setColaborador] = useState<companyUsers | null>(null);
  const { notificar } = useNotificacion();
  const setting = settings.data?.[0];
  const fechamin = sumarDias(1);
  const fechamax = sumarDias(Number(setting?.VisibleDays ?? 0));
  const [form, setForm] = useState<FormEdit>({
    Title: celda.Title,
    TipoCelda: celda.TipoCelda,
    Itinerancia: celda.Itinerancia,
  });

  const setCampo = <K extends keyof FormEdit>(campo: K, valor: FormEdit[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  function abrirMenu(e: React.MouseEvent<HTMLButtonElement>) {
    if (menu) return setMenu(null);
    // El menu se abre debajo del boton, alineado a su borde derecho
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({ x: rect.right, y: rect.bottom + 4 });
  }

  function cambiarEstado() {
    const mutacion = activa ? desactivar : activar;
    mutacion.mutate(celda.ID, {
      onSuccess: () =>
        notificar(
          `Celda ${celda.Title} ${activa ? "desactivada" : "activada"}`,
          "exito",
        ),
      onError: (err) => notificar(err.message, "error"),
    });
  }

  function abrirEdit() {
    // Se cargan los valores actuales de la celda cada vez que se abre
    setForm({
      Title: celda.Title,
      TipoCelda: celda.TipoCelda,
      Itinerancia: celda.Itinerancia,
    });
    setEdit(true);
  }
  function closeEdit() {
    setEdit(false);
  }

  function guardarEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    editar.mutate(
      { ...celda, ...form, Title: form.Title.trim() },
      {
        onSuccess: () => {
          notificar(`Celda ${form.Title.trim()} actualizada`, "exito");
          closeEdit();
        },
        onError: (err) =>
          notificar(`No se pudo editar la celda: ${err.message}`, "error"),
      },
    );
  }

  function abrirPuntual() {
    setFormPuntual(puntualInicial);
    setColaborador(null);
    setPuntual(true);
  }
  function closePuntual() {
    setPuntual(false);
  }

  function guardarPuntual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!colaborador) return;
    const data: createReservaPuntualAdmin = {
      ...formPuntual,
      VehicleType: celda.TipoCelda,
      Codigo: "",
      Notify: false,
      NombreUsuario: colaborador.displayName,
      Title: colaborador.mail ?? "",
      SpotId: celda.Title,
    };
    reservar.mutate(data, {
      onSuccess: () => {
        notificar(`Celda ${celda.Title} reservada`, "exito");
        closePuntual();
      },
      onError: (err) =>
        notificar(`No se pudo realizar la reserva: ${err.message}`, "error"),
    });
  }

  const opciones: OpcionMenu[] = [
    {
      label: activa ? "Desactivar celda" : "Activar celda",
      icono: <FiPower />,
      onClick: cambiarEstado,
      peligro: activa,
      deshabilitado: activar.isPending || desactivar.isPending,
    },
    {
      label: "Editar",
      icono: <BiEdit />,
      onClick: abrirEdit,
      peligro: false,
    },
    {
      label: "Reservar",
      icono: <FaCalendarCheck />,
      onClick: abrirPuntual,
      peligro: false,
    },
  ];
  const borde = !activa
    ? "border-dashed border-slate-300 bg-slate-50"
    : enUso
      ? "border-blue-200 bg-white shadow-sm"
      : "border-slate-200 bg-white";
  const turnos = [
    { etiqueta: "AM", ocupado: celda.Ocupacion.Manana },
    { etiqueta: "PM", ocupado: celda.Ocupacion.Tarde },
  ];
  return (
    <>
      <div className={`rounded-xl border p-3.5 ${borde}`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <p
            className={`font-bold flex items-center gap-1.5 ${activa ? "text-slate-900" : "text-slate-400"}`}
          >
            {celda.Title}
            {enUso && <span className="w-2 h-2 rounded-full bg-blue-500" />}
          </p>
          <button
            type="button"
            onClick={abrirMenu}
            // Evita que el clic "fuera del menu" lo cierre y se vuelva a abrir enseguida
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <FiMoreHorizontal />
          </button>
          <MenuContextual
            posicion={menu}
            onClose={() => setMenu(null)}
            opciones={opciones}
            alinear="derecha"
          />
        </div>
        <div className="flex items-center justify-between py-3 border-b border-slate-200 text-xs">
          <span
            className={`flex items-center gap-1.5 mx-4 ${activa ? "text-slate-700" : "text-slate-400"}`}
          >
            <Icono className="text-blue-700" size={16} />
            {celda.TipoCelda}
          </span>
          {!activa ? (
            <span className="text-slate-400">Desactivada</span>
          ) : (
            <span className="bg-slate-100 text-slate-800 font-semibold px-1.5 py-0.5 rounded">
              {celda.Itinerancia}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 pt-2.5">
          {turnos.map(({ etiqueta, ocupado }) => (
            <div
              key={etiqueta}
              className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs ${
                !activa
                  ? "bg-slate-50 text-slate-400"
                  : ocupado
                    ? "bg-blue-50 text-blue-800"
                    : "bg-green-50 text-green-800"
              }`}
            >
              <span className="font-semibold">{etiqueta}</span>
              <span>{ocupado ? "Ocupada" : "Disponible"}</span>
            </div>
          ))}
        </div>
        {/*ventana emergente para editar */}
        <Popup isOpen={edit} onClose={closeEdit} titulo="Editar la celda">
          <form onSubmit={guardarEdit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm">Nombre de la celda *</label>
              <input
                type="text"
                required
                className={inputClass}
                value={form.Title}
                onChange={(e) => setCampo("Title", e.target.value)}
              />
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
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={closeEdit}
                className="h-11 px-5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold cursor-pointer hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!form.Title.trim() || editar.isPending}
                className="flex items-center gap-2 h-11 px-6 rounded-lg bg-blue-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editar.isPending ? (
                  <AiOutlineLoading className="animate-spin" size={18} />
                ) : (
                  <FiSave />
                )}
                Guardar
              </button>
            </div>
          </form>
        </Popup>

        {/*ventana emergente para reserva puntual */}
        <Popup
          isOpen={puntual}
          onClose={closePuntual}
          titulo={`Reservar la celda ${celda.Title}`}
        >
          {!setting ? (
            <div className="flex justify-center m-6">
              <AiOutlineLoading
                className="animate-spin text-blue-500 text-3xl"
                size={18}
              />
            </div>
          ) : (
            <form onSubmit={guardarPuntual} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm">Fecha *</label>
                <input
                  type="date"
                  required
                  className={inputClass}
                  min={fechamin}
                  max={fechamax}
                  value={formPuntual.Date}
                  onChange={(e) =>
                    setFormPuntual((prev) => ({ ...prev, Date: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm">Turno *</label>
                <select
                  className={inputClass}
                  value={formPuntual.Turn}
                  onChange={(e) =>
                    setFormPuntual((prev) => ({ ...prev, Turn: e.target.value }))
                  }
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
                <label className="text-sm">Tipo de vehículo</label>
                <input
                  type="text"
                  disabled
                  className={`${inputClass} bg-slate-50 text-slate-500`}
                  value={celda.TipoCelda}
                />
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
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closePuntual}
                  className="h-11 px-5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!colaborador || reservar.isPending}
                  className="flex items-center gap-2 h-11 px-6 rounded-lg bg-blue-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reservar.isPending ? (
                    <AiOutlineLoading className="animate-spin" size={18} />
                  ) : (
                    <FiBookmark />
                  )}
                  Reservar para {colaborador?.displayName ?? "..."}
                </button>
              </div>
            </form>
          )}
        </Popup>
      </div>
    </>
  );
}

export default Celda;
