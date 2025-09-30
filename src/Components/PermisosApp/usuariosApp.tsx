import * as React from 'react';
import styles from './colaboradores.module.css';
import { useGroupMembers} from '../../Hooks/GraphUsers';


const UsuariosApp: React.FC = () => {
  const GroupID = "79012669-3208-412c-bae2-97d79f5f5f15"

  const{
    rows,
    loading,
    error,
    search, setSearch,
    pageSize, setPageSize,
    pageIndex, hasNext, nextPage, prevPage,
    //refresh
  } = useGroupMembers(GroupID)

  const viewRows = rows



  // ====== modales
  //const [isOpenAdd, setIsOpenAdd] = React.useState(false);
  //const [isOpenDetails, setIsOpenDetails] = React.useState(false);
  //const [selected, setSelected] = React.useState<AppUsers | null>(null);


  /*
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

  const closeAddModal = () => setIsOpenAdd(false);
  const closeDetails = () => { setIsOpenDetails(false); setSelected(null); }; 



  const onDelete = async (c: Collaborator) => {
    if (!c?.id) return;
    const ok = window.confirm(`¿Eliminar a "${c.nombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    await deleteCollaborator(String(c.id));
  };*/

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
            <button className={styles.button} type="button">
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
                    </tr>
                  </thead>
                  <tbody>
                    {viewRows.map((c) => (
                      <tr key={c.id}>
                        <td className={styles.td}>{c.nombre}</td>
                        <td className={styles.td}>{c.correo}</td>
                        <td>
                          {/* Eliminar */}
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            title="Eliminar colaborador"
                            aria-label={`Eliminar ${c.nombre}`}
                            //onClick={() => onDelete(c)}
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
    </section>
  );
};

export default UsuariosApp;
