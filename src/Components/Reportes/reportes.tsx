// Reporteria.tsx
import React from 'react';
import styles from './reporteria.module.css';
import { useGraphServices } from '../../graph/GraphServicesContext';
import { useReporteria as useReporteriaAforo } from '../../Hooks/useReportes'; // Hook para AFORO
import ReporteriaRegistro from '../ReporteRegistros/reportes';               // Componente de "Registro vehicular"
import { exportRowsToExcel } from '../../utils/exportExcel';

type Reporte = 'celdas' | 'registro';

// Tipado opcional para las filas de AFORO (ajusta a tu modelo real)
export type RowAforo = {
  key?: string;
  Fecha: string;
  Turno: string;
  Ocupadas: number;
  Disponibles: number;
  Capacidad: number;
  AforoPct: number; // 0-100
};

// Filtros usados por la vista de AFORO (ajusta si tu hook expone otros)
type FiltrosAforo = {
  desde: string;
  hasta: string;
  persona: string;
  tipoVehiculo: string;
};

export default function Reporteria() {
  const { reservations, parkingSlots } = useGraphServices();
  const [reporte, setReporte] = React.useState<Reporte>('celdas');

  // Hook de AFORO (solo aplica cuando se ve "celdas")
  const {
    loading,
    error,
    rows,            // dataset que la vista de Aforo mostrará (si luego expones rowsAforo, cámbialo aquí)
    aforoPct,
    capacidadTotal,
    filters,
    onChange,
    loadReservas,
  } = useReporteriaAforo(reservations, parkingSlots);

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <h2 className={styles.title}>Reportería de Parqueadero</h2>

        {/* ÚNICO control compartido: selector del tipo de reporte */}
        <div className={styles.field} style={{ marginLeft: 'auto' }}>
          <label htmlFor="selector-reporte">Reporte requerido</label>
          <select
            id="selector-reporte"
            value={reporte}
            onChange={(e) => setReporte(e.target.value as Reporte)}
          >
            <option value="celdas">Aforo de celdas</option>
            <option value="registro">Vehículos registrados</option>
          </select>
        </div>
      </header>

      {/* Render condicional de vistas completas */}
      {reporte === 'registro' ? (
        // 👉 "Registro vehicular" maneja SUS propios filtros/acciones/tabla internamente
        <ReporteriaRegistro />
      ) : (
        // 👉 "Aforo": todo (filtros/acciones/tabla) vive dentro de esta subvista
        <AforoView
          loading={loading}
          error={error}
          rows={rows}
          aforoPct={aforoPct}
          capacidadTotal={capacidadTotal}
          filters={filters as FiltrosAforo}
          onChange={onChange as (p: Partial<FiltrosAforo>) => void}
          loadReservas={loadReservas}
          onExport={(data) => exportRowsToExcel(data, 'reporte-aforo.xlsx')}
        />
      )}
    </section>
  );
}

/* ------------------ Subcomponente: Vista de AFORO ------------------ */
function AforoView({
  loading,
  error,
  rows,
  aforoPct,
  capacidadTotal,
  filters,
  onChange,
  loadReservas,
  onExport,
}: {
  loading: boolean;
  error: string | null;
  rows: any[];
  aforoPct: number;
  capacidadTotal: number | null | undefined;
  filters: FiltrosAforo;
  onChange: (p: Partial<FiltrosAforo>) => void;
  loadReservas: () => void | Promise<void>;
  onExport: (rows: any[]) => void;
}) {
  const rowsParaExportar = rows; // Si en tu hook creas un dataset agregado distinto (rowsAforo), úsalo aquí.

  return (
    <>
      <div className={styles.aforo}>
        Aforo (periodo filtrado): <strong>{aforoPct}%</strong>
        {!!capacidadTotal && (
          <span className={styles.aforoCap}>
            (Capacidad total: {capacidadTotal} vehículos)
          </span>
        )}
      </div>

      {/* 🔹 Filtros exclusivos de Aforo */}
      <div className={styles.filters}>
        <div className={styles.field}>
          <label htmlFor="aforo-desde">Desde</label>
          <input
            id="aforo-desde"
            type="date"
            value={filters.desde}
            onChange={(e) => onChange({ desde: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="aforo-hasta">Hasta</label>
          <input
            id="aforo-hasta"
            type="date"
            value={filters.hasta}
            onChange={(e) => onChange({ hasta: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="aforo-persona">Persona (correo o nombre)</label>
          <input
            id="aforo-persona"
            type="text"
            placeholder="ej: juan@empresa.com"
            value={filters.persona}
            onChange={(e) => onChange({ persona: e.target.value })}
            autoComplete="off"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="aforo-tipo-vehiculo">Tipo de vehículo</label>
          <select
            id="aforo-tipo-vehiculo"
            value={filters.tipoVehiculo}
            onChange={(e) => onChange({ tipoVehiculo: e.target.value as string })}
          >
            <option value="">Todos</option>
            <option value="Carro">Carro</option>
            <option value="Moto">Moto</option>
          </select>
        </div>

        {/* 🔹 Acciones exclusivas de Aforo */}
        <div className={styles.actions}>
          <button className={styles.btn} onClick={loadReservas} disabled={loading}>
            Aplicar filtros
          </button>
          <button
            className={styles.btnPrimary}
            onClick={() => onExport(rowsParaExportar)}
            disabled={loading || rowsParaExportar.length === 0}
          >
            Exportar a Excel
          </button>
        </div>
      </div>

      {/* Estado */}
      {loading && <div className={styles.info}>Cargando…</div>}
      {error && <div className={styles.error}>{error}</div>}

      {/* Tabla Aforo */}
      {!loading && !error && (
        <div className={styles.tableWrap}>
          <ReporteAforoTabla rows={rows} />
        </div>
      )}
    </>
  );
}

/* ---------- Tabla AFORO ---------- */
function ReporteAforoTabla({ rows }: { rows: RowAforo[] }) {
  if (!rows?.length) {
    return <div className={styles.empty}>Sin resultados</div>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Turno</th>
          <th>Ocupadas</th>
          <th>Disponibles</th>
          <th>Capacidad</th>
          <th>% Aforo</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key ?? `${r.Fecha}-${r.Turno}`}>
            <td>{r.Fecha}</td>
            <td>{r.Turno}</td>
            <td>{r.Ocupadas}</td>
            <td>{r.Disponibles}</td>
            <td>{r.Capacidad}</td>
            <td>{r.AforoPct}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------- Tabla AFORO ---------- */
function ReporteLogAuditoria({ rows }: { rows: RowAforo[] }) {
  if (!rows?.length) {
    return <div className={styles.empty}>Sin resultados</div>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Turno</th>
          <th>Ocupadas</th>
          <th>Disponibles</th>
          <th>Capacidad</th>
          <th>% Aforo</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key ?? `${r.Fecha}-${r.Turno}`}>
            <td>{r.Fecha}</td>
            <td>{r.Turno}</td>
            <td>{r.Ocupadas}</td>
            <td>{r.Disponibles}</td>
            <td>{r.Capacidad}</td>
            <td>{r.AforoPct}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
