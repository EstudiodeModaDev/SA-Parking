interface Props {}
import edmLogo from "../assets/edmLogo.png";
import { MdPerson } from "react-icons/md";
import { IoIosLogOut} from "react-icons/io";
import { useMsal } from "@azure/msal-react";
import { useUsuarioActual } from "../hooks/useUsuario";
import { useTurnoActual } from "../hooks/useTurnoActual";

function AdminAppBar(props: Props) {
  const {} = props;
  const {instance} = useMsal()
  const handleLogout = () => {
    instance.logoutRedirect({
      account: instance.getActiveAccount(),
      postLogoutRedirectUri: `${window.location.origin}/login`
    })
  }
  const {turno} = useTurnoActual()

  const {info, isLoading,} = useUsuarioActual()

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-gray-300 border-b z-50 px-space-2xl flex items-center justify-between">
      <div className="flex items-center gap-space-xl">
        <div className="flex items-center gap-space-md m-4">
          <img
            alt="Parking App EDM Logo"
            className="h-8 w-auto object-contain"
            src={edmLogo}
          />
          <span className="font-headline-h2 text-headline-h2 font-bold text-text-strong tracking-tight">
            Parking EDM
          </span>
        </div>
        <div className="hidden md:inline-flex items-center gap-space-xs bg-info-bg text-info px-space-md py-space-xs rounded-full border border-blue-200 bg-sky-100 ">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mx-1 "></span>
          <span className="font-caption-default text-caption-default font-semibold mx-1 ">
            {turno ? `Turno actual: ${turno.label} ${turno.inicio}–${turno.fin}` : "Fuera de horario"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-space-lg">
        <div className="h-6 w-px bg-border"></div>
        
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <MdPerson size={30}/>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-body-strong text-body-strong text-text-strong leading-none">
              {isLoading? "cargando..." : info?.displayName}
            </span>
            <span className="font-caption-default text-caption-default text-text-muted mt-0.5 text-xs font-light">
              {isLoading? "" : info?.jobTitle}
            </span>
          </div>
        <button
          className="flex items-center gap-space-md p-space-xs rounded-lg hover:bg-bg-subtle transition-colors text-left cursor-pointer hover:bg-red-100 h-10 mx-5"
          type="button"
          onClick={handleLogout}
        >
          <IoIosLogOut className="mx-4"/>
        </button>
      </div>
    </header>
  );
}

export default AdminAppBar;
