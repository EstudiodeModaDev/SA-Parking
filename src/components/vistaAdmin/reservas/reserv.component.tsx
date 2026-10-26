import { AiOutlineLoading } from "react-icons/ai";
import { useSettings } from "../../../hooks/useSettings";
import { useVistaReservas } from "../../../hooks/useVistaReservas";
import {useReservas } from "../../../hooks/useReserva";
import { FaMotorcycle } from "react-icons/fa";
import { MdDirectionsCar } from "react-icons/md";
import type { Turno } from "../../../types/reservas";
import type { settings } from "../../../types/settings";

interface Props {}

function SetHorarios(settings: settings, Turn: Turno) {
  switch (Turn) {
    case "Manana":
      return `${settings.InicioHorarioMa_x00f1_ana} - ${settings.FinalMa_x00f1_ana}`;
    case "Tarde":
      return `${settings.InicioTarde} - ${settings.FinalTarde}`;
    case "Día completo":
      return `${settings.InicioHorarioMa_x00f1_ana} - ${settings.FinalTarde}`;
  }
}

function ReservActive(props: Props) {
  const {} = props;
  const settings = useSettings().data;
  const { vista, esHistorial, mostrarProximas, mostrarHistorial } =
    useVistaReservas();
  const Reservations = useReservas(vista);
  // El return temprano va después de todos los hooks
  if (settings === undefined) return null;
  const setting = settings[0];
  const active =
    "bg-white text-blue-700 font-bold rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm";
  const inactive = "text-slate-500 px-3 py-1.5 cursor-pointer";
  return (
    <>
      <div className="bg-white w-full rounded-2xl shadow-sm p-6 flex flex-col gap-4 max-h-135">
        {Reservations.isLoading ? (
          <div className="flex justify-center m-10">
            <AiOutlineLoading
              className="animate-spin text-blue-500 text-3xl"
              size={18}
            />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="bg-slate-100 rounded-xl p-1 flex text-sm">
                <button
                  type="button"
                  className={!esHistorial ? active : inactive}
                  onClick={mostrarProximas}
                >
                  Próximas
                </button>
                <button
                  type="button"
                  className={esHistorial ? active : inactive}
                  onClick={mostrarHistorial}
                >
                  Historial
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100">
                  <tr className="uppercase text-sm tracking-wide text-slate-500">
                    <th className="px-3 py-2.5 font-semibold rounded-l-lg">
                      Fecha
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Turno</th>
                    <th className="px-3 py-2.5 font-semibold">Usuario</th>
                    <th className="px-3 py-2.5 font-semibold">
                      Tipo de Vehículo
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Celda</th>
                    <th className="px-3 py-2.5 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {Reservations.data?.map((value) => {
                    return (
                      <tr key={value.ID}>
                        <td className="px-3 py-4">
                          <p className="font-bold text-slate-900">
                            {String(value.Date)
                              .slice(0, 10)
                              .split("-")
                              .reverse()
                              .join("/")}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <p className="text-slate-900">
                            {value.Turn === "Manana" ? "Mañana" : value.Turn}
                          </p>
                          <p className="text-xs text-slate-500">
                            {SetHorarios(setting, value.Turn)}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <p className="text-slate-900">
                            {value.NombreUsuario}
                          </p>
                          <p className="text-xs text-slate-500">
                            {value.Title}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <span className="flex items-center gap-2 font-bold text-slate-900">
                            {value.VehicleType === "Carro" ? (
                              <MdDirectionsCar className="text-slate-500" />
                            ) : (
                              <FaMotorcycle className="text-slate-500" />
                            )}
                            <p>{value.VehicleType}</p>
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <span className="bg-sky-100 font-bold text-sm text-slate-800 px-2 py-1 rounded-md">
                            {value.SpotId}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          {value.Status === "Activa" ? (
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-800 font-bold text-xs px-3 py-1 rounded-full">
                              ● {value.Status}
                            </span>
                          ) : value.Status === "Terminada" ? (
                            <span className="inline-flex items-center gap-1 bg-grey-50 text-grey-800 font-bold text-xs px-3 py-1 rounded-full">
                              ● {value.Status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-800 font-bold text-xs px-3 py-1 rounded-full">
                              ● {value.Status}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default ReservActive;
