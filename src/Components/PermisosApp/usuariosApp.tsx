// src/Components/Colaboradores/UsuariosApp.tsx
import * as React from 'react';
import styles from './colaboradores.module.css';

import { addMemberByUserId, useGroupMembers } from '../../Hooks/GraphUsers';
import { useWorkers } from '../../Hooks/useWorkers';
import ModalOtorgarPermiso from '../AddGraphUsers/ModalAgregarPermiso';
import { getAccessToken } from '../../auth/msal';

// ⬇️ Importa el remove desde tu servicio Graph
import { removeMemberByUserId, removeMemberByEmail } from '../../Services/GraphUsers.service';

const UsuariosApp: React.FC = () => {
  const GroupID = '79012669-3208-412c-bae2-97d79f5f5f15';

  const {
    rows,
    loading,
    error,
    search, setSearch,
    pageSize, setPageSize,
    pageIndex, hasNext, nextPage, prevPage,
    refresh,
  } = useGroupMembers(GroupID);

  const { workers, loading: workersLoading, refresh: refreshWorkers } = useWorkers();

  const viewRows = rows;
  const [isOpenAdd, setIsOpenAdd] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const openAddModal = async () => {
    try {
      if (!workers || workers.length === 0) {
        await refreshWorkers();
      }
    } finally {
      setIsOpenAdd(true);
    }
  };

  const closeAddModal = () => setIsOpenAdd(false);

  // Guardar desde modal (agregar al grupo)
  const handleSaveFromModal = async (c: { userId: string; mail: string }) => {
    if (!c?.mail || !c?.userId) return;
    try {
      await addMemberByUserId(GroupID, c.userId, getAccessToken);
      await refresh();
    } catch (e) {
      console.error('No se pudo otorgar acceso:', e);
    } finally {
      closeAddModal();
    }
  };

  // 🗑️ Eliminar del grupo
  const handleDelete = async (user: { id: string; correo: string; nombre: string }) => {
    if (!user?.id && !user?.correo) return;
    const ok = window.confirm(`¿Eliminar a "${user.nombre}" del grupo?`);
    if (!ok) return;

    try {
      setDeletingId(user.id);
      if (user.id) {
        await removeMemberByUserId(GroupID, user.id, getAccessToken);
      } else if (user.correo) {
        await removeMemberByEmail(GroupID, user.correo, getAccessToken);
      }
      await refresh();
    } catch (e) {
      console.error('No se pudo eliminar del grupo:', e);
      alert('No se pudo eliminar del grupo. Revisa permisos Group.ReadWrite.All y que sea miembro directo.');
    } finally {
      setDeletingId(null);
    }
  };

  const errMsg =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : (error ? String(error) : '');

  return (
    <section>
      <div className={styles.card}>
        <h1 className={styles.title}>Usuarios APP</h1>

        <div className={styles.topBarGrid}>
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

          <div className={styles.groupRight}>
            <button className={styles.button} type="button" onClick={openAddModal}>
              Otorgar accesos
            </button>
          </div>
        </div>

        {loading && <div className={styles.info}>Cargando…</div>}
        {errMsg && !loading && <div className={styles.error}>{errMsg}</div>}

        {!loading && !errMsg && (
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
                    {viewRows.map((c) => {
                      const isDeleting = deletingId === c.id;
                      return (
                        <tr key={c.id}>
                          <td className={styles.td}>{c.nombre}</td>
                          <td className={styles.td}>{c.correo}</td>
                          <td className={styles.td} style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                              title="Eliminar"
                              aria-label={`Eliminar ${c.nombre}`}
                              onClick={() => handleDelete(c)}
                              disabled={loading || isDeleting}
                            >
                              {isDeleting ? (
                                <span style={{ padding: '0 4px' }}>…</span>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2H4V5h4V4a1 1 0 0 1 1-1zm2 0v1h2V3h-2zM6 9h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9zm4 2v8h2v-8h-2zm-4 0h2v8H8v-8zm8 0h2v8h-2v-8z"/>
                                </svg>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className={styles.paginationBar}>
              <div className={styles.paginationLeft}>
                <button className={styles.pageBtn} onClick={prevPage} disabled={pageIndex === 0}>
                  ← Anterior
                </button>
                <button className={styles.pageBtn} onClick={nextPage} disabled={!hasNext}>
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
                    onChange={(e) => setPageSize(Number(e.target.value) || 10)}
                  >
                    <option value={5}>5</option>
                  </select>
                </label>
              </div>
            </div>
          </>
        )}

        {/* Modal: alimentado con TODOS los colaboradores */}
        <ModalOtorgarPermiso
          isOpen={isOpenAdd}
          onClose={closeAddModal}
          onSave={handleSaveFromModal}
          slotsLoading={false}
          workers={workers}
          workersLoading={workersLoading}
        />
      </div>
    </section>
  );
};

export default UsuariosApp;
