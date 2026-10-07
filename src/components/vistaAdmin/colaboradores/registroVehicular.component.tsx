import { useState } from "react";
import { FiUserMinus, FiUserPlus } from "react-icons/fi";
import { MdDirectionsCar } from "react-icons/md";
import { FaMotorcycle } from "react-icons/fa";
import { AiOutlineLoading } from "react-icons/ai";
import {
  useCreateVehiculo,
  useDeleteVehiculo,
  useGetVehiculos,
} from "../../../hooks/useColaboradores";
import type { registroVehicular } from "../../../types/colaboradores";

type NuevoRegistroVehicular = Omit<registroVehicular, "ID">;

const formInicial: NuevoRegistroVehicular = {
  Title: "",
  Cedula: "",
  TipoVeh: "Carro",
  PlacaVeh: "",
  CorreoReporte: "",
};

function FormNuevoRegistro() {
  const [form, setForm] = useState<NuevoRegistroVehicular>(formInicial);
  const createReg = useCreateVehiculo();

  const setCampo = <K extends keyof NuevoRegistroVehicular>(
    campo: K,
    valor: NuevoRegistroVehicular[K],
  ) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const inputClass =
    "bg-slate-50 rounded-xl px-5 py-3 outline-none w-full placeholder:text-slate-400 focus:ring-2 focus:ring-sky-200";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createReg.mutate(
          {
            ...form,
            Title: form.Title.trim(),
            Cedula: form.Cedula.trim(),
            PlacaVeh: form.PlacaVeh.trim().toUpperCase(),
            CorreoReporte: form.CorreoReporte.trim().toLowerCase(),
          },
          { onSuccess: () => setForm(formInicial) },
        );
      }}
      className="bg-white w-full rounded-2xl shadow-sm p-6 flex flex-col gap-4"
    >
      <h2 className="text-slate-900 font-semibold">Agregar registro vehicular</h2>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_2fr_1fr_1fr_auto] gap-4">
        <input
          type="text"
          required
          placeholder="Nombre"
          className={inputClass}
          value={form.Title}
          onChange={(e) => setCampo("Title", e.target.value)}
        />
        <input
          type="text"
          required
          placeholder="Cédula"
          className={inputClass}
          value={form.Cedula}
          onChange={(e) => setCampo("Cedula", e.target.value)}
        />
        <input
          type="email"
          required
          placeholder="Correo reporte"
          className={inputClass}
          value={form.CorreoReporte}
          onChange={(e) => setCampo("CorreoReporte", e.target.value)}
        />
        <select
          className={inputClass}
          value={form.TipoVeh}
          onChange={(e) =>
            setCampo("TipoVeh", e.target.value as NuevoRegistroVehicular["TipoVeh"])
          }
        >
          <option value="Carro">Carro</option>
          <option value="Moto">Moto</option>
        </select>
        <input
          type="text"
          required
          placeholder="Placa"
          className={`${inputClass} font-mono uppercase`}
          value={form.PlacaVeh}
          onChange={(e) => setCampo("PlacaVeh", e.target.value)}
        />
        <button
          type="submit"
          disabled={createReg.isPending}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-5 py-3 cursor-pointer disabled:opacity-60"
        >
          {createReg.isPending ? (
            <AiOutlineLoading className="animate-spin" size={18} />
          ) : (
            <FiUserPlus size={18} />
          )}
          Agregar
        </button>
      </div>
      {createReg.isError && (
        <p className="text-sm text-red-600">
          No se pudo agregar el registro. Intenta de nuevo.
        </p>
      )}
    </form>
  );
}

interface Props {}

function RegistroVehicular(props: Props) {
  const {} = props;
  const registros = useGetVehiculos();
  const deleteReg = useDeleteVehiculo();

  return (
    <>
      <FormNuevoRegistro />
      <div className="bg-white w-full rounded-2xl shadow-sm overflow-x-auto">
        {registros.isLoading ? (
          <div className="flex justify-center m-10">
            <AiOutlineLoading
              className="animate-spin text-blue-500 text-3xl"
              size={18}
            />
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr className="uppercase text-sm tracking-wide text-slate-500">
                <th className="px-6 py-4 font-semibold">Nombre</th>
                <th className="px-6 py-4 font-semibold">Cédula</th>
                <th className="px-6 py-4 font-semibold">Correo reporte</th>
                <th className="px-6 py-4 font-semibold">Tipo de vehículo</th>
                <th className="px-6 py-4 font-semibold">Placa</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.data?.map((value: registroVehicular) => (
                <tr key={value.ID} className="border-t border-slate-100">
                  <td className="px-6 py-4">
                    <p className="text-slate-900">{value.Title}</p>
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-mono text-sm">{value.Cedula}</span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2">
                      {value.CorreoReporte}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-slate-100 flex items-center justify-center">
                        {value.TipoVeh === "Carro" ? (
                          <MdDirectionsCar className="text-slate-600" size={20} />
                        ) : (
                          <FaMotorcycle className="text-slate-600" size={20} />
                        )}
                      </div>
                      <p className="text-slate-900">{value.TipoVeh}</p>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="bg-slate-100 font-mono font-bold text-sm px-3 py-1.5 rounded-md">
                      {value.PlacaVeh}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-5 text-slate-600">
                      <button
                        className="bg-red-100 p-2 rounded-lg cursor-pointer"
                        onClick={() => deleteReg.mutate(value.ID)}
                      >
                        {deleteReg.isPending && deleteReg.variables === value.ID ? (
                          <AiOutlineLoading
                            className="animate-spin text-blue-500 text-3xl"
                            size={18}
                          />
                        ) : (
                          <FiUserMinus size={18} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {registros.data?.length === 0 && (
                <tr className="border-t border-slate-100">
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No hay registros vehiculares
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export default RegistroVehicular;
