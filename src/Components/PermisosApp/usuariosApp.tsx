import * as React from 'react';
import styles from './colaboradores.module.css';

// Hook que lista miembros del grupo destino
import { useGroupMembers, addGroupMembersByEmails } from '../../Hooks/GraphUsers';

// Hook que trae TODOS los colaboradores/personas (para alimentar el combo del modal)
import { useWorkers } from '../../Hooks/useWorkers';
import { useAuth } from '../../auth/AuthProvider';
import ModalOtorgarPermiso from '../AddGraphUsers/ModalAgregarPermiso';

const UsuariosApp: React.FC = () => {
  const GroupID = '79012669-3208-412c-bae2-97d79f5f5f15';

  const { getToken } = useAuth();

  const {
    rows,
    loading,
    error,
    search, setSearch,
    pageSize, setPageSize,
    pageIndex, hasNext, nextPage, prevPage,
    refresh, // <- lo usamos para recargar tras añadir
  } = useGroupMembers(GroupID);

  // Todos los colaboradores (para llenar el desplegable del modal)
  const { workers, loading: workersLoading, refresh: refreshWorkers } = useWorkers();

  // Vista (lo que se muestra en la tabla)
  const viewRows = rows;

  // ====== modal otorgar accesos
  const [isOpenAdd, setIsOpenAdd] = React.useState(false);

  const openAddModal = async () => {
    try {
      // Garantiza que el combo tenga data
      if (!workers || workers.length === 0) {
        await refreshWorkers();
      }
    } finally {
      setIsOpenAdd(true);
    }
  };

  const closeAddModal = () => setIsOpenAdd(false);

  // Guardado desde el modal: añade el correo al grupo y refresca la lista
  const handleSaveFromModal = async (c: { nombre: string; correo: string }) => {
    if (!c?.correo) return;
    try {
      await addGroupMembersByEmails(GroupID, [c.correo], getToken);
      await refresh(); // recargar miembros del grupo
      // UX opcional: filtra por el correo añadido
      setSearch(c.correo);
    } catch (e) {
      console.error('No se pudo otorgar acceso:', e);
      // Aquí podrías mostrar un toast/notificación
    } finally {
      closeAddModal();
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <h1 className={styles.title}>Usuarios App</h1>

        <div className={styles.topBarGrid}>
          {/* CENTRO: búsqueda */}
          <div className={styles.groupCenter}>
            <div className={styles.searchForm}>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Buscar por nombre o correo"
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
              Otorgar accesos
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
              <div className={styles.empty}>No hay usuarios que coincidan.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.theadRow}>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Nombre</th>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Correo electrónico</th>
                      <th className={styles.th} />
                    </tr>
                  </thead>
                  <tbody>
                    {viewRows.map((c) => (
                      <tr key={c.id}>
                        <td className={styles.td}>{c.nombre}</td>
                        <td className={styles.td}>{c.correo}</td>
                        <td className={styles.td} style={{ textAlign: 'right' }}>
                          {/* Acciones futuras (deshabilitadas por ahora) */}
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            title="Eliminar"
                            aria-label={`Eliminar ${c.nombre}`}
                            disabled
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
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL: el desplegable se alimenta con TODOS los colaboradores (useWorkers) */}
      <ModalOtorgarPermiso
        isOpen={isOpenAdd}
        onClose={closeAddModal}
        onSave={async (c) => { await handleSaveFromModal({ nombre: c.name, correo: c.mail }); }}           // si no usas celdas, envía vacío
        slotsLoading={false}
        workers={workers}       // <- AQUÍ va la lista para el combo
        workersLoading={workersLoading}
      />
    </section>
  );
};

export default UsuariosApp;
