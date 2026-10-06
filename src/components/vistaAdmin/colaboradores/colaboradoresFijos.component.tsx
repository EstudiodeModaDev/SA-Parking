import { useState } from "react";
import { FiUserMinus, FiUserPlus } from "react-icons/fi";
import { MdDirectionsCar, MdLocalParking } from "react-icons/md";
import {
  useColaboradores,
  useCreateColaborador,
  useDeleteColaborador,
} from "../../../hooks/useColaboradores";
import type { colaboradoresFijos } from "../../../types/colaboradores";
import { FaMotorcycle } from "react-icons/fa";
import { AiOutlineLoading } from "react-icons/ai";

type NuevoColaboradorFijo = Omit<colaboradoresFijos, "ID">;

const formInicial: NuevoColaboradorFijo = {
  Title: "",
  Correo: "",
  TipoVehiculo: "Carro",
  Placa: "",
  CodigoCelda: "",
  SpotAsignado: "",
};

function FormNuevoColaboradorFijo() {
  const [form, setForm] = useState<NuevoColaboradorFijo>(formInicial);
  const useCreateColaboradorFijo = useCreateColaborador();

  const setCampo = <K extends keyof NuevoColaboradorFijo>(
    campo: K,
    valor: NuevoColaboradorFijo[K],
  ) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const inputClass =
    "bg-slate-50 rounded-xl px-5 py-3 outline-none w-full placeholder:text-slate-400 focus:ring-2 focus:ring-sky-200";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        useCreateColaboradorFijo.mutate(
          {
            ...form,
            Placa: form.Placa.trim().toUpperCase(),
            Correo: form.Correo.trim(),
          },
          { onSuccess: () => setForm(formInicial) },
        );
      }}
      className="bg-white w-full rounded-2xl shadow-sm p-6 flex flex-col gap-4"
    >
      <h2 className="text-slate-900 font-semibold">Agregar colaborador fijo</h2>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4">
        <input
          type="text"
          required
          placeholder="Nombre"
          className={inputClass}
          value={form.Title}
          onChange={(e) => setCampo("Title", e.target.value)}
        />
        <input
          type="email"
          required
          placeholder="Correo"
          className={inputClass}
          value={form.Correo}
          onChange={(e) => setCampo("Correo", e.target.value)}
        />
        <select
          className={inputClass}
          value={form.TipoVehiculo}
          onChange={(e) =>
            setCampo(
              "TipoVehiculo",
              e.target.value as NuevoColaboradorFijo["TipoVehiculo"],
            )
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
          value={form.Placa}
          onChange={(e) => setCampo("Placa", e.target.value)}
        />
        <input
          type="text"
          placeholder="Celda asignada"
          className={`${inputClass} font-mono`}
          value={form.SpotAsignado}
          onChange={(e) => setCampo("SpotAsignado", e.target.value)}
        />
        <button
          type="submit"
          disabled={useCreateColaboradorFijo.isPending}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-5 py-3 cursor-pointer disabled:opacity-60"
        >
          {useCreateColaboradorFijo.isPending ? (
            <AiOutlineLoading className="animate-spin" size={18} />
          ) : (
            <FiUserPlus size={18} />
          )}
          Agregar
        </button>
      </div>
      {useCreateColaboradorFijo.isError && (
        <p className="text-sm text-red-600">
          No se pudo agregar el colaborador. Intenta de nuevo.
        </p>
      )}
    </form>
  );
}

interface Props {}

function ColaboradoresFijos(props: Props) {
  const {} = props;
  const useColaboradoresFijos = useColaboradores();
  const useDelColaboradorFijo = useDeleteColaborador();
  return (
    <>
      <FormNuevoColaboradorFijo />
      <div className="bg-white w-full rounded-2xl shadow-sm overflow-x-auto">
        {useColaboradoresFijos.isLoading ? (
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
                <th className="px-6 py-4 font-semibold">Colaborador</th>
                <th className="px-6 py-4 font-semibold">Correo</th>
                <th className="px-6 py-4 font-semibold">Tipo de vehiculo</th>
                <th className="px-6 py-4 font-semibold">Placa</th>
                <th className="px-6 py-4 font-semibold">Celda asignada</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!useColaboradoresFijos.data?.length && (
                <tr className="border-t border-slate-100">
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No hay colaboradores fijos registrados o no se encontraron.
                  </td>
                </tr>
              )}
              {useColaboradoresFijos.data?.map((value: colaboradoresFijos) => {
                return (
                  <tr className="border-t border-slate-100">
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{value.Title}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        {value.Correo}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-sm bg-slate-100 flex items-center justify-center">
                          {value.TipoVehiculo === "Carro" ? (
                            <MdDirectionsCar
                              className="text-slate-600"
                              size={20}
                            />
                          ) : (
                            <FaMotorcycle
                              className="text-slate-600"
                              size={20}
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-slate-900">{value.TipoVehiculo}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-1 py-4 ">
                      <span className="bg-slate-100 font-mono font-bold text-sm px-3 py-1.5 rounded-md">
                        {value.Placa}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 bg-sky-100 text-blue-700 px-3 py-1.5 rounded-md">
                        <MdLocalParking size={20} />
                        <span className="font-mono font-bold text-sm">
                          {value.SpotAsignado}
                        </span>
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-5 text-slate-600">
                        <button
                          className="bg-red-100 p-2 rounded-lg cursor-pointer"
                          onClick={() => useDelColaboradorFijo.mutate(value.ID)}
                        >
                          {useDelColaboradorFijo.isPending &&
                          useDelColaboradorFijo.variables === value.ID ? (
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
                );
              })}
              <tr className="border-t border-slate-100"></tr>
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export default ColaboradoresFijos;
