import { Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/mainLayout";
import Reservas from "./pages/Reservas";
import Colaboradores from "./pages/Colaboradores";
import Login from "./pages/Login";
import RequireRole from "./auth/requireRole";
import ReservaUsuario from "./pages/ReservaUsuario";
import RedirectByRole from "./auth/redirectByRole";
import RequireAuth from "./auth/requireAuth";
import Configuration from "./pages/Configuration";
import Celdas from "./pages/Celdas";
import MensajeVolver from "./components/mensajeVolver.component";

function AppRouter() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route
        path="sin-acceso"
        element={
          <MensajeVolver
            mensaje="No tienes acceso a esta aplicación"
            detalle="Tu cuenta no tiene permisos para usar Parking EDM. Si crees que es un error, comunícate con el administrador."
            cerrarSesion
          />
        }
      />

      <Route element={<RequireAuth />}>
        <Route index element={<RedirectByRole />} />

        <Route element={<RequireRole roles={["Admin"]} />}>
          <Route element={<MainLayout />}>
            <Route path="reserva" element={<Reservas />} />
            <Route path="colaboradores" element={<Colaboradores />} />
            <Route path="celdas" element={<Celdas/>}/>
            <Route path="configuraciones" element={<Configuration/>} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={["Usuario"]} />}>
          <Route path="mi-reserva" element={<ReservaUsuario/>} />
        </Route>
      </Route>

      <Route path="*" element={<MensajeVolver mensaje="Página no encontrada" />} />
    </Routes>
  );
}

export default AppRouter;
