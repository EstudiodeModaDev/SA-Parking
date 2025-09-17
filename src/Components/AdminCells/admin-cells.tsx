import * as React from 'react';
import styles from './AdminCells.module.css';
import { useAdminCells } from './useAdminCells';
import SlotDetailsModal from './slotDetailsModal';

import { toISODate } from '../../utils/date';
import { useSettingsHours } from '../../Hooks/useSettingHour';
import { useReservar } from '../../Hooks/useReservar';
import type { TurnType, VehicleType } from '../../Models/shared';
import { useGraphServices } from '../../graph/GraphServicesContext';

const AdminCells: React.FC = () => {
  const {
    // estado base
    loading, error,
    rows, pageIndex, hasNext,

    // filtros y paginación
    search, setSearch, onSearchEnter,
    tipo, setTipo,
    itinerancia, setItinerancia,
    pageSize, setPageSize,
    nextPage, prevPage,

    // modales (crear)
    createOpen, createSaving, createError, createForm, canCreate,
    openModal, closeModal, setCreateForm, create,

    // ocupación/capacidad/turnos
    occLoading, capacidadAhora, currentTurn, hoursLabel,

    // detalles
    openDetails, closeDetails, open, selected,

    // colaboradores
    workers, workersLoading,

    // acciones
    actionsDisabled,
  } = useAdminCells();

  // Servicios para reservar (mismo flujo que Availability)
  const { reservations, settings, parkingSlots } = useGraphServices();
  const { minDate, maxDate, reservar, loading: reservarLoading, error: reservarError } =
    useReservar(reservations, parkingSlots, settings, '', '');
  const { hours, loading: hoursLoading, error: hoursError } = useSettingsHours();

  const minISO = React.useMemo(() => toISODate(minDate), [minDate]);
  const maxISO = React.useMemo(() => toISODate(maxDate), [maxDate]);

  // Estado reserva rápida
  const [qrDate, setQrDate] = React.useState<string>('');
  const [qrTurn, setQrTurn] = React.useState<TurnType>('Manana');
  const [qrVehicle, setQrVehicle] = React.useState<VehicleType>('Carro');
  const [qrUserEmail, setQrUserEmail] = React.useState<string>('');
  const [qrUserName, setQrUserName] = React.useState<string>('');
  const [qrSaving, setQrSaving] = React.useState(false);
  const [qrMsg, setQrMsg] = React.useState<string | null>(null);
  const [qrErr, setQrErr] = React.useState<string | null>(null);

  // Combobox de colaboradores
  const [qrQuery, setQrQuery] = React.useState('');
  const [showList, setShowList] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(-1);

  const workerOptions = React.useMemo(
    () => (workers || []).map((w: any) => ({
      mail: String(w.mail || '').trim(),
      name: String(w.displayName || w.mail || '').trim(),
    })),
    [workers]
  );

  const filteredWorkers = React.useMemo(() => {
    const q = qrQuery.trim().toLowerCase();
    if (!q) return workerOptions.slice(0, 10);
    return workerOptions
      .filter(w => w.name.toLowerCase().includes(q) || w.mail.toLowerCase().includes(q))
      .slice(0, 10);
  }, [qrQuery, workerOptions]);

  function chooseWorker(w: { mail: string; name: string }) {
    setQrUserEmail(w.mail);
    setQrUserName(w.name);
    setQrQuery(w.name || w.mail);
    setShowList(false);
    setActiveIdx(-1);
  }

  // Fecha por defecto dentro de rango
  React.useEffect(() => {
    if (!minISO || !maxISO) return;
    const today = new Date().toISOString().slice(0, 10);
    const clamp = (iso: string, a: string, b: string) => (iso < a ? a : iso > b ? b : iso);
    setQrDate(prev => prev || clamp(today, minISO, maxISO));
  }, [minISO, maxISO]);

  // Helper de horas
  const fmt = (n?: number) => {
    if (n == null || Number.isNaN(n)) return '--:--';
    const h = Math.max(0, Math.min(23, Math.floor(n)));
    return `${String(h).padStart(2, '0')}:00`;
  };

  // Turno actual normalizado
  const turnNow = React.useMemo<'Manana' | 'Tarde' | 'Fuera'>(() => {
    const t = String(currentTurn ?? '').toLowerCase();
    if (t === 'manana' || t === 'mañana') return 'Manana';
    if (t === 'tarde') return 'Tarde';
    return 'Fuera';
  }, [currentTurn]);

  // Submit reserva rápida (corregido)
  async function submitQuickReserve() {
    console.log('submitQuickReserve()', {
      qrUserEmail, qrUserName, qrDate, qrTurn, qrVehicle
    });

    if (!qrUserEmail || !qrUserName) {
      setQrErr('Selecciona un colaborador válido.');
      return;
    }

    try {
      setQrSaving(true);
      setQrMsg(null);
      setQrErr(null);

      const payload: any = {
        vehicle: qrVehicle,
        turn: qrTurn,
        dateISO: qrDate,

        // claves que usa el hook
        userEmail: qrUserEmail,
        userName: qrUserName,

        // y si además persistes así en SP:
        Title: qrUserEmail,
        NombreUsuario: qrUserName,
      };

      const res = await reservar(payload);

      if (res.ok) setQrMsg(res.message);
      else setQrErr(res.message);
    } catch (e: any) {
      console.error('submitQuickReserve error', e);
      setQrErr(e?.message ?? 'No se pudo crear la reserva.');
    } finally {
      setQrSaving(false);
    }
  }

  const emailOk = /\S+@\S+\.\S+/.test(qrUserEmail);
  const quickDisabled =
    !qrDate || !emailOk || reservarLoading || hoursLoading || !!hoursError || !hours;

  const renderTurnBadge = (
    activa: boolean,
    reserved: boolean,
    turnLabel: 'AM' | 'PM',
    isCurrentTurn: boolean,
    who?: string | null
  ) => {
    let cls = styles.badge;
    let text = 'Disponible';

    if (!activa) {
      cls = `${styles.badge} ${styles.badgeInactive}`;
      text = 'Inactiva';
    } else if (reserved) {
      if (isCurrentTurn) {
        cls = `${styles.badge} ${styles.badgeInUse}`;
        text = 'En uso';
      } else {
        cls = `${styles.badge} ${styles.badgeReserved}`;
        text = 'Reservada';
      }
    } else {
      cls = `${styles.badge} ${styles.badgeFree}`;
      text = 'Disponible';
    }

    return (
      <span className={cls} aria-label={`${turnLabel}: ${text}${who ? ` por ${who}` : ''}`}>
        <span className={styles.badgeLine}>{turnLabel}: {text}</span>
        <br />
        {who && <small className={styles.badgeWho}>{who}</small>}
      </span>
    );
  };

  if (loading) return <section className={styles.wrapper}><div>Cargando…</div></section>;

  return (
    <section className={styles.wrapper}>
      {error && <div className={styles.error} role="alert">Error: {error}</div>}
      <h3 className={styles.h3}>Listado de celdas</h3>

      {/* Capacidad hoy + Reserva rápida (simétricas) */}
      <div className={styles.twoCards}>
        {/* ---- Capacidad hoy ---- */}
        <div className={styles.capacityCard}>
          <div className={styles.capacityHeader}>
            <span className={styles.cardTitle}>Capacidad hoy</span>
            <span className={styles.turnPill}>
              {turnNow === 'Manana'
                ? 'Turno actual: AM'
                : turnNow === 'Tarde'
                ? 'Turno actual: PM'
                : 'Fuera de horario'}
            </span>
          </div>

          <div className={styles.capacityGrid}>
            <div className={styles.capacityItem}>
              <div className={styles.capacityLabel}>Carros disponibles</div>
              <div className={styles.capacityValue}>
                {capacidadAhora.libresCarros}
                <span className={styles.capacityTotal}>/ {capacidadAhora.totalCarros}</span>
              </div>
            </div>
            <div className={styles.capacityItem}>
              <div className={styles.capacityLabel}>Motos disponibles</div>
              <div className={styles.capacityValue}>
                {capacidadAhora.libresMotos}
                <span className={styles.capacityTotal}>/ {capacidadAhora.totalMotos}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 6 }}>
            <small>{hoursLabel}</small>
          </div>
        </div>

        {/* ---- Reserva rápida ---- */}
        <div
          className={styles.quickCard}
          aria-busy={qrSaving || reservarLoading || hoursLoading}
        >
          <div className={styles.quickHeader}>
            <span className={styles.cardTitle}>Reserva rápida</span>
          </div>

          {(reservarError || hoursError) && (
            <div className={styles.error}>
              {reservarError || hoursError}
            </div>
          )}
          {qrMsg && <div className={styles.ok} aria-live="polite">{qrMsg}</div>}
          {qrErr && <div className={styles.error} aria-live="assertive">{qrErr}</div>}

          <div className={styles.quickGrid}>
            <label className={styles.field}>
              <span>Fecha</span>
              <input
                className={styles.searchInput}
                type="date"
                min={minISO || undefined}
                max={maxISO || undefined}
                value={qrDate}
                onChange={(e) => setQrDate(e.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>Turno</span>
              <select
                className={styles.pageSizeSelect}
                value={qrTurn}
                onChange={(e) => setQrTurn(e.target.value as TurnType)}
              >
                <option value="Manana">Mañana ({fmt(hours?.InicioManana)}–{fmt(hours?.FinalManana)})</option>
                <option value="Tarde">Tarde ({fmt(hours?.InicioTarde)}–{fmt(hours?.FinalTarde)})</option>
                <option value="Dia">Día completo</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Tipo de vehículo</span>
              <select
                className={styles.pageSizeSelect}
                value={qrVehicle}
                onChange={(e) => setQrVehicle(e.target.value as VehicleType)}
              >
                <option value="Carro">Carro</option>
                <option value="Moto">Moto</option>
              </select>
            </label>

            {/* Combobox de colaborador */}
            <label className={styles.field}>
              <span>Colaborador</span>
              <div className={styles.combo}>
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder={workersLoading ? 'Cargando colaboradores…' : 'Buscar por nombre o correo…'}
                  value={qrQuery}
                  onChange={(e) => { setQrQuery(e.target.value); setShowList(true); }}
                  onFocus={() => setShowList(true)}
                  onBlur={() => setTimeout(() => setShowList(false), 120)}
                  onKeyDown={(e) => {
                    if (!showList) return;
                    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filteredWorkers.length - 1)); }
                    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
                    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); chooseWorker(filteredWorkers[activeIdx]); }
                    if (e.key === 'Escape') setShowList(false);
                  }}
                  disabled={workersLoading}
                  aria-autocomplete="list"
                  aria-expanded={showList}
                  aria-controls="combo-workers-list"
                  aria-activedescendant={activeIdx >= 0 ? `cw-${activeIdx}` : undefined}
                />
                {qrUserEmail && (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => { setQrQuery(''); setQrUserEmail(''); setQrUserName(''); setShowList(true); }}
                    title="Limpiar selección"
                  >×</button>
                )}

                {showList && filteredWorkers.length > 0 && (
                  <ul id="combo-workers-list" className={styles.comboList} role="listbox">
                    {filteredWorkers.map((w, i) => (
                      <li
                        key={w.mail}
                        id={`cw-${i}`}
                        role="option"
                        aria-selected={i === activeIdx}
                        className={`${styles.comboItem} ${i === activeIdx ? styles.comboItemActive : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => chooseWorker(w)}
                      >
                        <div className={styles.comboName}>{w.name}</div>
                        <div className={styles.comboMail}>{w.mail}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {qrUserEmail && (
                <small className={styles.comboSelected}>
                  Seleccionado: {qrUserName} · {qrUserEmail}
                </small>
              )}
            </label>
          </div>

          <div className={styles.quickActions}>
            <button
              type="button"
              className={styles.btn}
              onClick={submitQuickReserve}
              disabled={quickDisabled || qrSaving}
              title={quickDisabled ? 'Completa los campos' : 'Crear reserva'}
            >
              {qrSaving ? 'Reservando…' : 'Reservar'}
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtersBar}>
        <div className={styles.pageSizeBox}>
          <span>Tipo de celda</span>
          <select
            className={styles.pageSizeSelect}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as 'all' | 'Carro' | 'Moto')}
          >
            <option value="all">Todas</option>
            <option value="Carro">Carro</option>
            <option value="Moto">Moto</option>
          </select>
        </div>

        <div className={styles.pageSizeBox}>
          <span>Itinerancia</span>
          <select
            className={styles.pageSizeSelect}
            value={itinerancia}
            onChange={(e) => setItinerancia(e.target.value as 'all' | 'Empleado Fijo' | 'Empleado Itinerante' | 'Directivo')}
          >
            <option value="all">Todas</option>
            <option value="Empleado Fijo">Empleado Fijo</option>
            <option value="Empleado Itinerante">Empleado Itinerante</option>
            <option value="Directivo">Directivo</option>
          </select>
        </div>

        <div className={styles.searchBox}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Buscar por código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchEnter}
            aria-label="Buscar celda por código"
          />
        </div>

        <div className={styles.pageSizeBox}>
          <span>Registros por página</span>
          <select
            className={styles.pageSizeSelect}
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value) || 50)}
          >
            <option value={6}>6</option>
            <option value={12}>12</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className={styles.actionsRight}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAdd}`}
            onClick={openModal}
            disabled={actionsDisabled}
          >
            Añadir celda
          </button>
        </div>
      </div>

      {/* Grid */}
      {rows.length === 0 ? (
        <div className={styles.emptyGrid}>Sin resultados.</div>
      ) : (
        <ul className={styles.cardGrid}>
          {rows.map(r => {
            const activa = r.Activa === 'Activa';
            const occ = r.__occ || {};
            const amReserved = !!occ.Manana;
            const pmReserved = !!occ.Tarde;

            const amBadge = renderTurnBadge(
              activa, amReserved, 'AM', turnNow === 'Manana' && amReserved, occ.PorManana
            );
            const pmBadge = renderTurnBadge(
              activa, pmReserved, 'PM', turnNow === 'Tarde' && pmReserved, occ.PorTarde
            );

            return (
              <li key={r.Id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.celdaTitle}>
                    <span className={styles.cardCode}>{r.Title}</span>
                    <br />
                    <span className={styles.metaLabel}>Tipo: {r.TipoCelda}</span>
                    <br />
                    <span className={styles.metaLabel}>Itinerancia: {r.Itinerancia}</span>
                  </div>

                  <button
                    type="button"
                    className={styles.btnLink}
                    onClick={() => openDetails(r)}
                    disabled={occLoading}
                    aria-disabled={occLoading}
                  >
                    Detalles
                  </button>

                  <div className={styles.badgeGroup}>
                    {amBadge}
                    {pmBadge}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Paginación */}
      <div className={styles.paginationBar}>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={prevPage}
          disabled={pageIndex === 0}
        >
          ← Anterior
        </button>
        <span className={styles.pageInfo}>Página {pageIndex + 1}</span>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={nextPage}
          disabled={!hasNext}
        >
          Siguiente →
        </button>
      </div>

      {/* Modal de creación */}
      {createOpen && (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h4>Nueva celda</h4>
            {createError && <div className={styles.error}>{createError}</div>}

            <label className={styles.field}>
              <span>Código</span>
              <input
                className={styles.searchInput}
                value={createForm.Title}
                onChange={(e) => setCreateForm(f => ({ ...f, Title: e.target.value }))}
                placeholder="Ej: A-02"
              />
            </label>

            <label className={styles.field}>
              <span>Tipo</span>
              <select
                className={styles.pageSizeSelect}
                value={createForm.TipoCelda}
                onChange={(e) => setCreateForm(f => ({ ...f, TipoCelda: e.target.value as any }))}
              >
                <option value="Carro">Carro</option>
                <option value="Moto">Moto</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Estado</span>
              <select
                className={styles.pageSizeSelect}
                value={createForm.Activa}
                onChange={(e) => setCreateForm(f => ({ ...f, Activa: e.target.value as any }))}
              >
                <option value="Activa">Activa</option>
                <option value="Inactiva">Inactiva</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Itinerancia</span>
              <select
                className={styles.pageSizeSelect}
                value={createForm.Itinerancia}
                onChange={(e) => setCreateForm(f => ({ ...f, Itinerancia: e.target.value as any }))}
              >
                <option value="Empleado Fijo">Empleado Fijo</option>
                <option value="Empleado Itinerante">Empleado Itinerante</option>
                <option value="Directivo">Directivo</option>
              </select>
            </label>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={closeModal}
                disabled={createSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btn}
                onClick={create}
                disabled={!canCreate || createSaving}
              >
                {createSaving ? 'Creando…' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {open && selected && (
        <SlotDetailsModal
          open={open}
          slot={selected}
          onClose={closeDetails}
          workers={workers}
          workersLoading={workersLoading}
        />
      )}
    </section>
  );
};

export default AdminCells;
