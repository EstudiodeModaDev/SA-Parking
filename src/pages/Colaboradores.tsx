import { useVistaColaboradores } from "../hooks/useVistaColaboradores";
import UsuariosApp from "../components/vistaAdmin/colaboradores/usuariosApp.comoponent";
import ColaboradoresFijos from "../components/vistaAdmin/colaboradores/colaboradoresFijos.component";
import RegistroVehicular from "../components/vistaAdmin/colaboradores/registroVehicular.component";

interface Props {}

function Colaboradores(props: Props) {
  const {} = props;
  const {esFijos, esUsuarios, esRegistro, mostrarFijos, mostrarRegistro, mostrarUsuarios} = useVistaColaboradores()
  const active = 'flex items-center gap-3 text-blue-700 pb-3 border-b-[3px] border-blue-700'
  const inactive = 'flex items-center gap-3 text-slate-500 pb-3 border-b-[3px] border-transparent cursor-pointer'


  return (
    <>
      <div className="gap-6 flex flex-col text-slate-800">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-4">
              <p className="font-bold text-3xl text-slate-900">
                Gestión de Colaboradores
              </p>
            </div>
            <p className="font-light text-slate-500 mt-2 max-w-3xl">
              Administra usuarios autorizados, cupos fijos asignados y el
              registro vehicular institucional con control en tiempo real.
            </p>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex items-center gap-8">
          <button
            type="button"
            className={esFijos? active : inactive}
            onClick={mostrarFijos}
          >
            Colaboradores fijos
          </button>
          <button
            type="button"
            className={esUsuarios? active : inactive}
            onClick={mostrarUsuarios}
          >
            Usuarios app
          </button>
          <button
            type="button"
            className= {esRegistro? active : inactive}
            onClick={mostrarRegistro}
          >
            Registro vehicular
          </button>
        </div>

        {/* Filtros Y tablas*/}
        {
          esFijos && <ColaboradoresFijos/>||
          esRegistro &&  <RegistroVehicular/> ||
          esUsuarios && <UsuariosApp/>
        }
      </div>
    </>
  );
}

export default Colaboradores;
