import AdminAppBar from "../layouts/adminAppBar";
import ReservTable from "../components/vistaUsuario/reservTable.component";
import QuickReserv from "../components/vistaUsuario/quickReserv.component";

interface Props {}

function ReservaUsuario(props: Props) {
  const {} = props;

  return (
    <div className="min-h-screen bg-slate-50 bg-bg-app px-4 pt-24 pb-6">
      {/* pt-24: compensa el header fijo (h-16) + separación */}
      <AdminAppBar />
      <div className="max-w-6xl mx-auto gap-6 flex flex-col text-slate-800">
        {/* Reserva rápida */}
        <QuickReserv/>
        {/* Mis reservas */}
        <ReservTable/>
      </div>
    </div>
  );
}

export default ReservaUsuario;
