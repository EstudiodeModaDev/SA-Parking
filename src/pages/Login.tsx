import { MdLocalParking, MdDirectionsCar, MdTwoWheeler, MdLockOutline } from "react-icons/md";
import edmLogo from "../assets/edmLogo.png";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { Navigate } from "react-router-dom";
import {InteractionStatus} from "@azure/msal-browser"

interface Props {}

function MicrosoftLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function Login(props: Props) {
  const {} = props;

  const {instance, inProgress} = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const handleLogin = () => {
    instance.loginRedirect({
      scopes : [import.meta.env.VITE_AZURE_API_SCOPE]
    })
  }
  if (isAuthenticated) return <Navigate to="/" replace/>
  return (
    <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center p-6 text-slate-800">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Panel informativo */}
        <div className="hidden lg:flex flex-col justify-between gap-10 p-10 bg-sky-100">
          <div className="flex items-center gap-3">
            <img
              alt="Parking App EDM Logo"
              className="h-8 w-auto object-contain"
              src={edmLogo}
            />
            <span className="font-bold text-slate-900 tracking-tight">
              Parking EDM
            </span>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white w-14 h-14 rounded-xl flex items-center justify-center shadow-sm">
              <MdLocalParking className="text-blue-700" size={36} />
            </div>
            <p className="font-bold text-3xl text-slate-900">
              Gestión de parqueaderos institucional
            </p>
            <p className="font-light text-slate-600">
              Reserva tu celda, consulta tus turnos y administra los cupos de
              carros y motos en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 bg-white text-blue-700 px-3 py-1.5 rounded-full">
              <MdDirectionsCar size={18} />
              Carros
            </span>
            <span className="inline-flex items-center gap-2 bg-white text-slate-700 px-3 py-1.5 rounded-full">
              <MdTwoWheeler size={18} />
              Motos
            </span>
          </div>
        </div>

        {/* Formulario de acceso */}
        <div className="flex flex-col justify-center gap-8 p-10">
          <div className="flex items-center gap-3 lg:hidden">
            <img
              alt="Parking App EDM Logo"
              className="h-8 w-auto object-contain"
              src={edmLogo}
            />
            <span className="font-bold text-slate-900 tracking-tight">
              Parking EDM
            </span>
          </div>

          <div>
            <p className="font-bold text-3xl text-slate-900">Iniciar sesión</p>
            <p className="font-light text-slate-500 mt-2">
              Accede con tu cuenta corporativa de Estudio de Moda.
            </p>
          </div>

          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 rounded-xl px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
            onClick={handleLogin}
            disabled={inProgress !== InteractionStatus.None}
          >
            <MicrosoftLogo />
            Iniciar sesión con Microsoft
          </button>

          <div className="flex items-start gap-3 bg-slate-50 rounded-xl px-5 py-4 text-sm text-slate-500">
            <MdLockOutline className="text-slate-500 shrink-0 mt-0.5" size={18} />
            <span>
              Solo los colaboradores con correo institucional
              (@estudiodemoda.com.co) pueden acceder a la aplicación.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
