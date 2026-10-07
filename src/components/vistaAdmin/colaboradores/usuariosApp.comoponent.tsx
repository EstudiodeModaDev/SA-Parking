import { useMemo, useState } from "react";
import { FiMail, FiSearch, FiUserMinus, FiUserPlus } from "react-icons/fi";
import {
  useAddToMail,
  useRemoveFromMail,
  useUserMailList,
} from "../../../hooks/useColaboradores";
import type { usermailList } from "../../../types/colaboradores";
import { AiOutlineLoading } from "react-icons/ai";
import { BiSearch } from "react-icons/bi";
import Popup from "../../popup.component";

interface Props {}

// Minusculas y sin tildes para comparar nombres
const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function UsuariosApp(props: Props) {
  const {} = props;
  const userMailList = useUserMailList();
  const removeFromMail = useRemoveFromMail();
  const createToMail = useAddToMail();

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoCorreo, setNuevoCorreo] = useState("");

  const usuariosFiltrados = useMemo(() => {
    const lista: usermailList[] = userMailList.data ?? [];
    const termino = normalizar(filtro);
    if (!termino) return lista;
    return lista.filter((usuario) =>
      normalizar(usuario.displayName ?? "").includes(termino),
    );
  }, [userMailList.data, filtro]);

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFiltro(busqueda);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusqueda(e.target.value);
    // Al vaciar el input se restablece la lista completa
    if (e.target.value === "") setFiltro("");
  };

  const handleEliminar = (mail: string) => {
    // Al eliminar se limpia el filtro para mostrar la lista completa actualizada
    removeFromMail.mutate(mail, {
      onSuccess: () => {
        setBusqueda("");
        setFiltro("");
      },
    });
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setNuevoCorreo("");
  };

  const handleAgregar = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const correo = nuevoCorreo.trim().toLowerCase();
    if (!correo) return;
    createToMail.mutate(correo, { onSuccess: cerrarModal });
  };

  return (
    <>
      <div className="bg-white w-full rounded-2xl shadow-sm p-6">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex flex-1 items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
            <FiSearch className="text-slate-500 shrink-0" size={18} />
            <input
              type="text"
              value={busqueda}
              onChange={handleChange}
              placeholder="Buscar por nombre"
              className="bg-transparent outline-none w-full placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl px-6 py-3 w-full sm:w-auto shrink-0 cursor-pointer transition disabled:opacity-60"
          >
            <span>Buscar</span>
            <BiSearch size={18} />
          </button>
          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="flex items-center justify-center gap-2 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium rounded-xl px-6 py-3 w-full sm:w-auto shrink-0 cursor-pointer transition"
          >
            <FiUserPlus size={18} />
            <span>Agregar</span>
          </button>
        </form>
      </div>

      <Popup
        isOpen={modalAbierto}
        onClose={cerrarModal}
        titulo="Agregar Usuario App"
      >
        <form onSubmit={handleAgregar} className="flex flex-col gap-5 p-1">
          <label className="flex flex-col gap-2">
            <span className="font-medium text-slate-700">
              Correo Corporativo
            </span>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
              <FiMail className="text-slate-500 shrink-0" size={18} />
              <input
                type="email"
                required
                autoFocus
                value={nuevoCorreo}
                onChange={(e) => setNuevoCorreo(e.target.value)}
                placeholder="usuario@estudiodemoda.com.co"
                className="bg-transparent outline-none w-full placeholder:text-slate-400"
              />
            </div>
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={cerrarModal}
              className="rounded-xl px-6 py-3 font-medium text-slate-600 hover:bg-slate-100 cursor-pointer transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createToMail.isPending}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl px-6 py-3 cursor-pointer transition disabled:opacity-60 disabled:opacity-60"
            >
              {createToMail.isPending ? (
                <AiOutlineLoading
                  className="animate-spin text-blue-500 text-3xl"
                  size={18}
                />
              ) : (
                <FiUserPlus size={18} />
              )}
              <span>Agregar</span>
            </button>
          </div>
        </form>
      </Popup>
      <div className="bg-white w-full rounded-2xl shadow-sm overflow-x-auto max-h-100">
        {userMailList.isLoading ? (
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
                <th className="px-6 py-4 font-semibold">
                  Correo corporativo
                </th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!userMailList.isLoading &&
                usuariosFiltrados.map((value: usermailList) => (
                  <tr key={value.id} className="border-t border-slate-100">
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{value.displayName}</p>
                      <p className="text-sm text-slate-500">{value.jobTitle}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        {value.mail}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-5 text-slate-600">
                        <button
                          className="bg-red-100 p-2 rounded-lg cursor-pointer"
                          onClick={() => handleEliminar(value.mail)}
                        >
                          {removeFromMail.isPending &&
                          removeFromMail.variables === value.mail ? (
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
              {!userMailList.isLoading &&
                filtro &&
                usuariosFiltrados.length === 0 && (
                  <tr className="border-t border-slate-100">
                    <td
                      colSpan={3}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      No se encontraron colaboradores con "{filtro}"
                    </td>
                  </tr>
                )}
              {!userMailList.isLoading &&
                !filtro &&
                usuariosFiltrados.length === 0 && (
                  <tr className="border-t border-slate-100">
                    <td
                      colSpan={3}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      No hay colaboradores registrados
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

export default UsuariosApp;
