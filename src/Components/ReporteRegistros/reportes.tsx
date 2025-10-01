import styles from './reporteria.module.css';
import { exportRowsToExcel } from '../../utils/exportExcel';


import { useGraphServices } from '../../graph/GraphServicesContext';
import { useReporteria } from '../../Hooks/reporteRegistro';

export default function ReporteriaRegistro() {
  // Obtén los servicios necesarios desde el contexto
  const { registroVeh } = useGraphServices();

  // Pásalos al hook de reportería (versión Graph)
  const {
    load,
    error,
    rows,
    filters,
    onChange,
    loadRegistros
  } = useReporteria(registroVeh);

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <h2 className={styles.title}>Reportería del registro vehicular</h2>
      </header>

      {/* Filtros */}
      <div className={styles.filters}>
        <div className={styles.field}>
          <label>Desde</label>
          <input
            type="date"
            value={filters.desde}
            onChange={(e) => onChange({ desde: e.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label>Hasta</label>
          <input
            type="date"
            value={filters.hasta}
            onChange={(e) => onChange({ hasta: e.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label>Persona (correo o nombre)</label>
          <input
            type="text"
            placeholder="ej: juan@empresa.com"
            value={filters.persona}
            onChange={(e) => onChange({ persona: e.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label>Tipo de vehículo</label>
          <select
            value={filters.tipoVehiculo}
            onChange={(e) => onChange({ tipoVehiculo: e.target.value as any })}
          >
            <option value="">Todos</option>
            <option value="Carro">Carro</option>
            <option value="Moto">Moto</option>
          </select>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.btn}
            onClick={() => loadRegistros()}
            disabled={load}
          >
            Aplicar filtros
          </button>
          <button
            className={styles.btnPrimary}
            onClick={() => exportRowsToExcel(rows, 'reporte-parqueadero.xlsx')}
            disabled={load || rows.length === 0}
          >
            Exportar a Excel
          </button>
        </div>
      </div>

      {/* Estado */}
      {load && <div className={styles.info}>Cargando…</div>}
      {error && <div className={styles.error}>{error}</div>}

      {/* Tabla */}
      {!load && !error && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cedula</th>
                <th>Nombre</th>
                <th>Tipo de vehiculo</th>
                <th>Placa de vehiculo</th>
                <th>Correo al que se solicito</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    Sin resultados
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.Cedula}</td>
                    <td>{r.Title}</td>
                    <td>{r.TipoVeh}</td>
                    <td>{r.PlacaVeh}</td>
                    <td>{r.CorreoReporte}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}