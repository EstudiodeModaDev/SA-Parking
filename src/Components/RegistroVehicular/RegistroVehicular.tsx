import * as React from 'react';
import styles from './RegistroVehicular.module.css';
import type { RegistroVehicularSP } from '../../Models/RegistroVehicular';
import { useRegistroVehicular } from '../../Hooks/useRegistroVehicular';
// ⬇️ Hook de personas (Graph / Office 365)
import { useWorkers } from '../../Hooks/useWorkers';

// ⬇️ Context donde expones las instancias de servicios (Graph)
import { useGraphServices } from '../../graph/GraphServicesContext';

const RegistroVehicular: React.FC = () => {
  // ====== servicios Graph
  const {  registroVeh: registrosVehSvc } = useGraphServices();

  // ====== hook de colaboradores (inyectando el servicio)
  const {
    rows, loading, error,
    search, setSearch,
    pageSize, setPageSize,
    pageIndex, hasNext, nextPage, prevPage,
     //addVeh, 
     deleteVeh,
  } = useRegistroVehicular(registrosVehSvc);
3
  // ====== hook de workers (Graph users)
  const { workers,  refresh } = useWorkers();

  // ====== modales
  const [isOpenAdd, setIsOpenAdd] = React.useState(false);
  console.log(isOpenAdd)
 // const [isOpenDetails, setIsOpenDetails] = React.useState(false);
 // const [selected, setSelected] = React.useState<RegistroVehicularSP | null>(null);
 // const [slotsLoading] = React.useState(false);

  // filtro en cliente por tipo de vehículo
  const [vehicleFilter, setVehicleFilter] = React.useState<'all' | string>('all');

  const openAddModal = async () => {
    // asegúrate de tener lista la gente para el combo
    try {
      if (!workers || workers.length === 0) {
        await refresh();
      }
    } finally {
      setIsOpenAdd(true);
    }
  };

 // const closeAddModal = () => setIsOpenAdd(false);
 // const closeDetails = () => { setIsOpenDetails(false); setSelected(null); };

  // vista filtrada por tipo
  const viewRows = React.useMemo(
    () => vehicleFilter === 'all'
      ? rows
      : rows.filter(r => r.TipoVeh === vehicleFilter),
    [rows, vehicleFilter]
  );


  const onDelete = async (c: RegistroVehicularSP) => {
    if (!c?.id) return;
    const ok = window.confirm(`¿Eliminar a "${c.Title}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    await deleteVeh(String(c.id));
  };

  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <h1 className={styles.title}>Colaboradores fijos</h1>

        <div className={styles.topBarGrid}>
          {/* IZQUIERDA: segmentación por vehículo */}
          <div className={styles.groupLeft}>
            <div className={styles.segmented}>
              <button
                type="button"
                className={`${styles.segmentBtn} ${vehicleFilter === 'all' ? styles.segmentBtnActive : ''}`}
                onClick={() => setVehicleFilter('all')}
                disabled={loading}
                title="Ver todos"
              >
                Todos
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${vehicleFilter === 'Carro' ? styles.segmentBtnActive : ''}`}
                onClick={() => setVehicleFilter('Carro')}
                disabled={loading}
                title="Solo Carro"
              >
                Carro
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${vehicleFilter === 'Moto' ? styles.segmentBtnActive : ''}`}
                onClick={() => setVehicleFilter('Moto')}
                disabled={loading}
                title="Solo Moto"
              >
                Moto
              </button>
            </div>
          </div>

          {/* CENTRO: búsqueda */}
          <div className={styles.groupCenter}>
            <div className={styles.searchForm}>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Buscar por nombre, correo o placa…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={() => setSearch('')}
                  aria-label="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* DERECHA: acción primaria */}
          <div className={styles.groupRight}>
            <button className={styles.button} type="button" onClick={openAddModal}>
              Agregar colaborador
            </button>
          </div>
        </div>

        {/* Estados */}
        {loading && <div className={styles.info}>Cargando…</div>}
        {error && <div className={styles.error}>{error}</div>}

        {/* Tabla */}
        {!loading && !error && (
          <>
            {viewRows.length === 0 ? (
              <div className={styles.empty}>No hay colaboradores que coincidan.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.theadRow}>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Cedula</th>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Nombre</th>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Tipo de vehiculo</th>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Placa</th>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Registro solicitado a:</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewRows.map((c) => (
                      <tr key={c.id}>
                        <td className={styles.td}>{c.Cedula}</td>
                        <td className={styles.td}>{c.Title}</td>
                        <td className={styles.td}>{c.TipoVeh}</td>
                        <td className={styles.td}>{c.PlacaVeh}</td>
                        <td className={styles.td}>{c.CorreoReporte}</td>
                        <td className={styles.td}>
                          {/* Eliminar */}
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            title="Eliminar colaborador"
                            aria-label={`Eliminar ${c.Title}`}
                            onClick={() => onDelete(c)}
                            disabled={loading}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2H4V5h4V4a1 1 0 0 1 1-1zm2 0v1h2V3h-2zM6 9h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9zm4 2v8h2v-8h-2zm-4 0h2v8H8v-8zm8 0h2v8h-2v-8z"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            <div className={styles.paginationBar}>
              <div className={styles.paginationLeft}>
                <button
                  className={styles.pageBtn}
                  onClick={prevPage}
                  disabled={pageIndex === 0}
                >
                  ← Anterior
                </button>
                <button
                  className={styles.pageBtn}
                  onClick={nextPage}
                  disabled={!hasNext}
                >
                  Siguiente →
                </button>
                <span className={styles.pageInfo}>
                  Página {pageIndex + 1}
                </span>
              </div>

              <div className={styles.paginationRight}>
                <label className={styles.pageSizeLabel}>
                  Filas por página
                  <select
                    className={styles.pageSizeSelect}
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value) || 10)}
                  >
                    <option value={5}>5</option>
                  </select>
                </label>
              </div>
            </div>
          </>
        )}

        {/* MODAL: Agregar colaborador 
        <ModalAgregarColaborador
          isOpen={isOpenAdd}
          onClose={closeAddModal}
          onSave={async (c) => { await addVeh(c); closeAddModal(); }}
          slotsLoading={slotsLoading}
          workers={workers}
          workersLoading={workersLoading}
        />
        */}
      </div>
    </section>
  );
};

export default RegistroVehicular;
