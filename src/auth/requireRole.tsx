import { Navigate, Outlet } from "react-router-dom";
import { useRol } from "../hooks/useUsuario";
import PantallaCarga from "../components/pantallaCarga.component";
import type { Rol } from "../types/usuario";

const HOME_BY_ROLE: Record<Rol, string> = {
  Admin: "/reserva",
  Usuario: "/mi-reserva",
};

function RequireRole({ roles }: { roles: Rol[] }) {
  const { data: rol, isPending, isError } = useRol();

  if (isError) return <Navigate to="/sin-acceso" replace />;
  if (isPending) return <PantallaCarga />;
  // rol desconocido: sin-acceso en vez de volver a "/" (evita bucle de redirecciones)
  if (!rol || !(rol in HOME_BY_ROLE)) return <Navigate to="/sin-acceso" replace />;
  if (!roles.includes(rol)) return <Navigate to={HOME_BY_ROLE[rol]} replace />;

  return <Outlet />;
}
export default RequireRole
