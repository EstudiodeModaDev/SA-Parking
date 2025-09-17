// src/components/Mis-Reservas/MisReservas.tsx
import * as React from 'react';
import styles from './mis-reservas.module.css';
import { useMisReservas } from '../../Hooks/useMisReservas';
import { statusColor } from '../../utils/status';
import { useGraphServices } from '../../graph/GraphServicesContext';

type Props = { userMail: string; isAdmin: boolean };

const MisReservas: React.FC<Props> = ({ userMail, isAdmin = false }) => {
  const { reservations,  parkingSlots} = useGraphServices();

  const [spotNames, setSpotNames] = React.useState<Record<string, string>>({});

  // 👇 servicio primero, luego mail, luego flag
  const {
    rows, loading, error,
    range, setRange, applyRange,
    pageSize, setPageSize, pageIndex, hasNext, nextPage, prevPage,
    cancelReservation,
    filterMode, setFilterMode, reloadAll
  } = useMisReservas(reservations, userMail, isAdmin);

    React.useEffect(() => {
    console.groupCollapsed('[MisReservas] debug');
    console.log('userMail:', userMail);
    console.log('rows.length:', rows?.length ?? 0);
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('rows[0]:', rows[0]);
    }
    console.groupEnd();
  }, [rows, userMail]);

  React.useEffect(() => {
    reloadAll();
  }, [userMail, filterMode, range.from, range.to, pageIndex, pageSize]);

    React.useEffect(() => {
    const fetchSpots = async () => {
      if (!rows || rows.length === 0) return;

      const missing = rows
        .map(r => r.Spot)
        .filter(id => id && !spotNames[id]);

      if (missing.length === 0) return;

      const updates: Record<string, string> = {};
      for (const id of missing) {
        try {
          // 👇 aquí usas tu servicio real
          const spot = await parkingSlots.get(id); 
          updates[id] = spot?.Title ?? `Celda ${id}`;
        } catch (e) {
          updates[id] = `Celda ${id}`;
        }
      }
      setSpotNames(prev => ({ ...prev, ...updates }));
    };

    void fetchSpots();
  }, [rows, spotNames, parkingSlots]);
  
  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <h1 className={styles.title}>Mis reservas</h1>

        <div className={styles.topBar}>
          <div className={styles.segmented}>
            <button
              type="button"
              className={`${styles.segmentBtn} ${filterMode === 'upcoming-active' ? styles.segmentBtnActive : ''}`}
              onClick={() => setFilterMode('upcoming-active')}
              disabled={loading}
              title="Mostrar próximas con estado Activa"
            >
              Próximas activas
            </button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${filterMode === 'history' ? styles.segmentBtnActive : ''}`}
              onClick={() => setFilterMode('history')}
              disabled={loading}
              title="Ver pasadas y canceladas (con rango de fechas)"
            >
              Historial
            </button>
          </div>
        </div>

        {filterMode === 'history' && (
          <form className={styles.form} onSubmit={(e) => { e.preventDefault(); applyRange(); }}>
            <label className={styles.label}>
              Desde
              <input
                className={styles.input}
                type="date"
                value={range.from}
                max={range.to || undefined}
                onChange={(e) => setRange(r => ({ ...r, from: e.target.value }))}
              />
            </label>

            <label className={styles.label}>
              Hasta
              <input
                className={styles.input}
                type="date"
                value={range.to}
                min={range.from || undefined}
                onChange={(e) => setRange(r => ({ ...r, to: e.target.value }))}
              />
            </label>
          </form>
        )}

        {loading && <div className={styles.info}>Cargando…</div>}
        {error && <div className={styles.error}>{error}</div>}

        {!loading && !error && rows.length > 0 && (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.theadRow}>
                    {isAdmin ? <th className={styles.th}>Usuario</th> : null}
                    <th className={styles.th}>Fecha</th>
                    <th className={styles.th}>Turno</th>
                    <th className={styles.th}>Celda</th>
                    <th className={styles.th}>Vehículo</th>
                    <th className={styles.th}>Estado</th>
                    <th className={styles.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.Id}>
                      {isAdmin ? <td className={styles.td}>{r.User}</td> : null}
                      <td className={styles.td}>{r.Date}</td>
                      <td className={styles.td}>{r.Turn}</td>
                      <td className={styles.td}>{spotNames[r.Spot] ?? 'Cargando…'}</td>
                      <td className={styles.td}>{r.VehicleType}</td>
                      <td className={styles.td}>
                        <span className={styles.pill} style={{ background: statusColor(r.Status) }}>
                          {r.Status}
                        </span>
                      </td>
                      <td className={styles.td}>
                        {r.Status === 'Activa' ? (
                          <button
                            className={styles.cancelBtn}
                            onClick={() => { void cancelReservation(r.Id); }}
                            disabled={loading}
                            title="Cancelar esta reserva"
                          >
                            Cancelar
                          </button>
                        ) : (
                          <p>No hay acciones disponibles</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.paginationBar}>
              <div className={styles.paginationLeft}>
                <button className={styles.pageBtn} onClick={prevPage} disabled={loading || pageIndex === 0}>
                  ← Anterior
                </button>
                <button className={styles.pageBtn} onClick={nextPage} disabled={loading || !hasNext}>
                  Siguiente →
                </button>
                <span className={styles.pageInfo}>Página {pageIndex + 1}</span>
              </div>

              <div className={styles.paginationRight}>
                <label className={styles.pageSizeLabel}>
                  Filas por página
                  <select
                    className={styles.pageSizeSelect}
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value) || 20)}
                    disabled={loading}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>
            </div>
          </>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className={styles.info}>
            {userMail
              ? 'No hay reservas para los filtros seleccionados.'
              : 'Proporciona un email para ver reservas.'}
          </div>
        )}
      </div>
    </section>
  );
};

export default MisReservas;
