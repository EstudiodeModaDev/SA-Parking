// src/Components/RegistroVehicular/RegistroVehicular.tsx
import * as React from 'react';
import styles from './RegistroVehicular.module.css';
import type { RegistroVehicularSP } from '../../Models/RegistroVehicular';
import { useRegistroVehicular } from '../../Hooks/useRegistroVehicular';
import { useWorkers } from '../../Hooks/useWorkers';
import { useGraphServices } from '../../graph/GraphServicesContext';
import ModalNuevoRegistro from '../AgregarRegistroVehicular/ModalAgregarRegistro';
import { sendRegistroVehicularEmail } from '../../utils/SendEmail';

const RegistroVehicular: React.FC = () => {
  const { registroVeh: registrosVehSvc, graph } = useGraphServices();

  const {
    rows, loading, error,
    search, setSearch,
    pageSize, setPageSize,
    pageIndex, hasNext, nextPage, prevPage,
    addVeh, deleteVeh,
  } = useRegistroVehicular(registrosVehSvc);

  const { workers, refresh, loading: workersLoading = false } = useWorkers() as any;

  const [isOpenAdd, setIsOpenAdd] = React.useState(false);
  const openAddModal = async () => {
    try { if (!workers || workers.length === 0) await refresh(); }
    finally { setIsOpenAdd(true); }
  };
  const closeAddModal = () => setIsOpenAdd(false);

  const [vehicleFilter, setVehicleFilter] = React.useState<'all' | string>('all');

  const viewRows = React.useMemo(
    () => vehicleFilter === 'all' ? rows : rows.filter(r => r.TipoVeh === vehicleFilter),
    [rows, vehicleFilter]
  );

  const onDelete = async (c: RegistroVehicularSP) => {
    if (!c?.id) return;
    if (!window.confirm(`¿Eliminar a "${c.Title}"? Esta acción no se puede deshacer.`)) return;
    await deleteVeh(String(c.id));
  };

  const errMsg =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : (error ? String(error) : '');

  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <h1 className={styles.title}>Registro Vehicular</h1>

        <div className={styles.topBarGrid}>
          <div className={styles.groupLeft}>
            <div className={styles.segmented}>
              <button type="button" className={`${styles.segmentBtn} ${vehicleFilter === 'all' ? styles.segmentBtnActive : ''}`}
                      onClick={() => setVehicleFilter('all')} disabled={loading} title="Ver todos">Todos</button>
              <button type="button" className={`${styles.segmentBtn} ${vehicleFilter === 'Carro' ? styles.segmentBtnActive : ''}`}
                      onClick={() => setVehicleFilter('Carro')} disabled={loading} title="Solo Carro">Carro</button>
              <button type="button" className={`${styles.segmentBtn} ${vehicleFilter === 'Moto' ? styles.segmentBtnActive : ''}`}
                      onClick={() => setVehicleFilter('Moto')} disabled={loading} title="Solo Moto">Moto</button>
            </div>
          </div>

          <div className={styles.groupCenter}>
            <div className={styles.searchForm}>
              <input className={styles.searchInput} type="text" placeholder="Buscar por nombre, correo o placa…"
                     value={search} onChange={(e) => setSearch(e.target.value)} disabled={loading} />
              {search && (
                <button type="button" className={styles.searchClear} onClick={() => setSearch('')}
                        aria-label="Limpiar búsqueda" disabled={loading}>✕</button>
              )}
            </div>
          </div>

          <div className={styles.groupRight}>
            <button className={styles.button} type="button" onClick={openAddModal} disabled={loading}>
              Registrar Vehiculo
            </button>
          </div>
        </div>

        {loading && <div className={styles.info}>Cargando…</div>}
        {!loading && errMsg && <div className={styles.error}>{errMsg}</div>}

        {!loading && !errMsg && (
          <>
            {viewRows.length === 0 ? (
              <div className={styles.empty}>No hay registros que coincidan.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.theadRow}>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Cédula</th>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Nombre</th>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Tipo de vehículo</th>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Placa</th>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Registro solicitado a</th>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Acciones</th>
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
                          <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                  title="Eliminar registro" aria-label={`Eliminar ${c.Title}`}
                                  onClick={() => onDelete(c)} disabled={loading}>
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

            <div className={styles.paginationBar}>
              <div className={styles.paginationLeft}>
                <button className={styles.pageBtn} onClick={prevPage} disabled={pageIndex === 0 || loading}>← Anterior</button>
                <button className={styles.pageBtn} onClick={nextPage} disabled={!hasNext || loading}>Siguiente →</button>
                <span className={styles.pageInfo}>Página {pageIndex + 1}</span>
              </div>
              <div className={styles.paginationRight}>
                <label className={styles.pageSizeLabel}>
                  Filas por página
                  <select className={styles.pageSizeSelect} value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value) || 10)} disabled={loading}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </label>
              </div>
            </div>
          </>
        )}

        <ModalNuevoRegistro
          isOpen={isOpenAdd}
          onClose={closeAddModal}
          onSave={async (c) => {
            try {
              // Opción 1 (usuario actual): requiere Mail.Send delegado y mailbox del usuario
              await sendRegistroVehicularEmail(graph, {
                correo: c.CorreoReporte,
                nombre: c.Title,
                tipoVehiculo: c.TipoVeh,
                placa: c.PlacaVeh,
                cedula: c.Cedula,
              });

              // Opción 2 (buzón específico: compartido/servicio). Descomenta si quieres enviar desde otro buzón:
              /*
              const { upn, id } = await resolveUserUpnOrId(graph, { email: 'registro.vehicular@tuempresa.com' });
              const userKey = upn ?? id;
              if (!userKey) throw new Error('No se pudo resolver el buzón de servicio');
              await sendRegistroVehicularEmailFrom(graph, userKey, {
                correo: c.CorreoReporte,
                nombre: c.Title,
                tipoVehiculo: c.TipoVeh,
                placa: c.PlacaVeh,
                cedula: c.Cedula,
              });
              */
            } catch (e) {
              console.error('Fallo enviando correo de registro:', e);
              // TIP: mostrar toast de advertencia pero no bloquear el alta
            }
            await addVeh?.(c);
            closeAddModal();
          }}
          workers={workers}
          workersLoading={workersLoading}
        />
      </div>
    </section>
  );
};

export default RegistroVehicular;
