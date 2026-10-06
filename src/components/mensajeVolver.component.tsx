import { useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { FiArrowLeft } from "react-icons/fi";
import edmLogo from "../assets/edmLogo.png";

interface Props {
  mensaje: string;
  detalle?: string;
  // cierra la sesion de Microsoft antes de volver al login (evita el bucle login -> / -> sin-acceso)
  cerrarSesion?: boolean;
}

function MensajeVolver(props: Props) {
  const navigate = useNavigate();
  const { instance } = useMsal();
  const cuenta = instance.getActiveAccount() ?? instance.getAllAccounts()[0];

  const handleVolver = () => {
    if (props.cerrarSesion) {
      instance.logoutRedirect({
        account: cuenta,
        postLogoutRedirectUri: `${window.location.origin}/login`,
      });
      return;
    }
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center p-6 text-slate-800">
      <div className="w-full max-w-md flex flex-col items-center gap-6 bg-white rounded-2xl shadow-sm p-10 text-center">
        <img
          alt="Parking App EDM Logo"
          className="h-8 w-auto object-contain"
          src={edmLogo}
        />
        <div className="flex flex-col gap-2">
          <p className="font-bold text-2xl text-slate-900">{props.mensaje}</p>
          {props.detalle && (
            <p className="font-light text-slate-500">{props.detalle}</p>
          )}
          {props.cerrarSesion && cuenta && (
            <p className="text-sm text-slate-500">
              Cuenta: <span className="font-semibold">{cuenta.username}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 rounded-xl px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          onClick={handleVolver}
        >
          <FiArrowLeft size={18} />
          Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
}

export default MensajeVolver;
