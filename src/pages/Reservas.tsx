

import ReservActive from "../components/vistaAdmin/reservas/reserv.component";

interface Props {}

function Reservas(props: Props) {
  const {} = props;

  return (
    <>
      <div className="gap-6 flex flex-col text-slate-800">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-bold text-3xl text-slate-900">
              Gestión de Reservas
            </p>
            <p className="font-light text-slate-500 mt-2">
              Supervisión integral de cupos asignados y  auditoría en tiempo real.
            </p>
          </div>
        </div>

        {/* Tabla */}
        <ReservActive/>
      </div>
    </>
  );
}

export default Reservas;
