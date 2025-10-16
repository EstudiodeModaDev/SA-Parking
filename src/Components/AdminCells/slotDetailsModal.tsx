import * as React from 'react';
import type { Assignee, SlotUI } from '../../Models/Celdas';
import {
  fetchAssignee,
  searchUnassignedCollaborators,
  assignSlotToCollaborator,
  unassignSlotFromCollaborator,
} from '../../Hooks/useAsignarCeldas';
import type { Worker } from '../../Models/shared'
import { nameProve } from '../../Services/Name.Service'

// Auth + Graph + Services (Graph)
import { useAuth } from '../../auth/AuthProvider';
import { GraphRest } from '../../graph/GraphRest';
import { ReservationsService } from '../../Services/Reservations.service';
import { ColaboradoresFijosService } from '../../Services/Colaboradoresfijos.service';
import { ParkingSlotsService } from '../../Services/ParkingSlot.service';
import type { Reservations } from '../../Models/Reservation';

type Props = {open: boolean; slot: SlotUI | null; onClose: () => void; onChanged?: () => void;workers?: Worker[]; workersLoading?: boolean;};

// ===== estilos inline para abreviar
const S = {
  backdrop: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,.45)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  } as React.CSSProperties,
  row3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 12,
  } as React.CSSProperties,
  modal: {
    background: '#fff',
    width: 'min(900px, 96vw)',
    maxHeight: '90vh',
    overflow: 'auto',
    borderRadius: 12,
    boxShadow: '0 10px 30px rgba(0,0,0,.2)',
    border: '1px solid #e5e7eb',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    position: 'relative'
  } as React.CSSProperties,

headerActions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginRight: 8
  } as React.CSSProperties,

  iconBtn: {
    width: 28,
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    border: '1px solid #d4d4d4',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1
  } as React.CSSProperties,

  iconBtnDanger: {
    width: 28,
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    border: '1px solid #ef4444',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
    color: '#b91c1c'
  } as React.CSSProperties,
  title: { margin: 0, fontSize: 18, fontWeight: 700 as const },
  closeBtn: {
    background: 'transparent',
    border: 0,
    fontSize: 20,
    lineHeight: 1,
    cursor: 'pointer',
  },
  body: { padding: '12px 16px', display: 'grid', gap: 10, fontSize: 14 },
  footer: {
    padding: '12px 16px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },
  muted: { color: '#6b7280' },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 12,
    display: 'grid',
    gap: 10,
  },
  rowBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  btnPrimary: {
    background: '#2563eb',
    color: '#fff',
    border: 0,
    padding: '8px 12px',
    borderRadius: 8,
    cursor: 'pointer',
  },
  btnGhost: {
    background: 'transparent',
    border: '1px solid #e5e7eb',
    padding: '8px 12px',
    borderRadius: 8,
    cursor: 'pointer',
  },
  btnDanger: {
    background: '#dc2626',
    color: '#fff',
    border: 0,
    padding: '8px 12px',
    borderRadius: 8,
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 14,
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 14,
    background: '#fff',
  },
  pickerPanel: {
    marginTop: 8,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 10,
    display: 'grid',
    gap: 10,
  },
  list: { listStyle: 'none', margin: 0, padding: 0 },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderTop: '1px solid #f3f4f6',
  },
  labelCol: { display: 'grid', gap: 6 },
};

const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export default function SlotDetailsModal({open, slot, workers = [], workersLoading = false,onClose, onChanged,}: Props) {
  const { ready, getToken } = useAuth();
  const reservationsSvc = React.useMemo(() => {
    if (!ready) return null;
    const graph = new GraphRest(getToken);
    return new ReservationsService(
      graph,
      'estudiodemoda.sharepoint.com',
      '/sites/TransformacionDigital/IN/SA',
      'reservations'
    );
  }, [ready, getToken]);

  const colaboradoresSvc = React.useMemo(() => {
    if (!ready) return null;
    const graph = new GraphRest(getToken);
    return new ColaboradoresFijosService(
      graph,
      'estudiodemoda.sharepoint.com',
      '/sites/TransformacionDigital/IN/SA',
      'Colaboradores fijos'
    );
  }, [ready, getToken]);

  const cellsScv = React.useMemo(() => {
  if (!ready) return null;
  const graph = new GraphRest(getToken);
  return new ParkingSlotsService(
    graph,
    'estudiodemoda.sharepoint.com',
    '/sites/TransformacionDigital/IN/SA',
    'ParkingSlots'
  );
}, [ready, getToken]);

  // ===== Estado asignación fija =====
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [assignee, setAssignee] = React.useState<Assignee>(null);

  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [term, setTerm] = React.useState('');
  const [results, setResults] = React.useState<Assignee[]>([]);
  const [searching, setSearching] = React.useState(false);

  // ===== Reserva puntual =====
  const todayISO = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [rvDate, setRvDate] = React.useState<string>(todayISO);
  const [rvTurn, setRvTurn] = React.useState<'Manana' | 'Tarde' | 'Dia completo'>('Manana');
  const [rvSaving, setRvSaving] = React.useState(false);
  const [rvError, setRvError] = React.useState<string | null>(null);
  const [rvName, setRvName] = React.useState('');
  const [rvMail, setRvMail] = React.useState('');
  const [editTouched, setEditTouched] = React.useState(false);
  const [editText, setEditText] = React.useState<string>("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editOption, setEditOption] = React.useState<string>("");

  // === Validación Reserva (Nombre y Correo obligatorios)
  const [rvTouched, setRvTouched] = React.useState<{ name: boolean; mail: boolean }>({
    name: false,
    mail: false,
  });
  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
  const nameError = !rvName.trim() ? 'El nombre es obligatorio.' : null;
  const mailError = !rvMail.trim()
    ? 'El correo es obligatorio.'
    : !isEmail(rvMail)
    ? 'El correo no tiene un formato válido.'
    : null;
  const canSubmitReservation = !rvSaving && !nameError && !mailError;

  // Filtro/selección de colaboradores SOLO para reserva
  const selectableWorkers = React.useMemo(() => {
    return (workers ?? []).map((w, idx) => ({
      key: String(w.id ?? w.mail ?? w.displayName ?? idx),
      id: w.id,
      name: w.displayName ?? '',
      email: w.mail ?? '',
      job: w.jobTitle ?? '',
    }));
  }, [workers]);

  const [colabTerm, setColabTerm] = React.useState('');
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string>('');

  const filteredWorkers = React.useMemo(() => {
    if (!colabTerm) return selectableWorkers;
    const q = norm(colabTerm);
    return selectableWorkers.filter((w) => norm(`${w.name} ${w.email} ${w.job}`).includes(q));
  }, [selectableWorkers, colabTerm]);



  function handleEditSave() {
    onEditCell(editText, editOption)
    // Limpia y cierra
    setEditOpen(false);
    setEditOption("");
    setEditText("");
    setEditTouched(false);
}

  const lastPickRef = React.useRef<symbol | null>(null);
  const onSelectWorker = React.useCallback(
    async (key: string) => {
      setSelectedWorkerId(key);
      const w = selectableWorkers.find((x) => x.key === key);
      if (!w) return;

      const req = Symbol();
      lastPickRef.current = req;

      try {
        const ok = await nameProve(w.name); // validación async
        if (lastPickRef.current !== req) return;

        if (ok) setRvName(w.name ?? '');
        else setRvName('');

        setRvMail(w.email ?? '');
        setRvError(null);
        setRvTouched((t) => ({ ...t, name: true, mail: !!w.email || t.mail }));
      } catch (err) {
        console.error('[onSelectWorker] nameProve error:', err);
        setRvName('');
        setRvMail(w.email ?? '');
      }
    },
    [selectableWorkers]
  );

  // Derivar modo de la celda
  const mode: 'fijar' | 'reserva' = React.useMemo(() => {
    const iti = String(slot?.Itinerancia ?? '').toLowerCase();
    return iti.includes('itinerante') ? 'reserva' : 'fijar';
  }, [slot?.Itinerancia]);

  // Cargar asignado actual (fijo) al abrir
  React.useEffect(() => {
    if (!open || !slot || !colaboradoresSvc) return;
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const a = await fetchAssignee(colaboradoresSvc, slot.Id);
        if (!cancel) setAssignee(a);
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? 'Error al cargar asignación');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [open, slot?.Id, colaboradoresSvc]);

  // Reset de campos de reserva al abrir (y cuando cambia el asignado)
  React.useEffect(() => {
    if (!open) return;
    if (assignee) {
      setRvName(assignee.name ?? '');
      setRvMail(assignee.email ?? '');
    } else {
      setRvName('');
      setRvMail('');
    }
    setRvDate(todayISO);
    setRvTurn('Manana');
    setRvError(null);
    setRvTouched({ name: false, mail: false });
    setColabTerm('');
    setSelectedWorkerId('');
  }, [open, assignee, todayISO]);

  // Buscar candidatos (para **asignación fija**)
  const doSearch = React.useCallback(async () => {
    if (!colaboradoresSvc) return;
    setSearching(true);
    setError(null);
    try {
      const res = await searchUnassignedCollaborators(colaboradoresSvc, term);
      setResults(res);
    } catch (e: any) {
      setError(e?.message ?? 'Error buscando colaboradores');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [term, colaboradoresSvc]);

  // Asignar fijo
  const onAssign = React.useCallback(
    async (candidate: Assignee) => {
      if (!candidate || !slot || !colaboradoresSvc) return;
      setLoading(true);
      setError(null);
      try {
        await assignSlotToCollaborator(colaboradoresSvc, slot.Id, candidate.id, slot.Title);
        setAssignee(candidate);
        setPickerOpen(false);
        setTerm('');
        setResults([]);
        await onChanged?.();
      } catch (e: any) {
        setError(e?.message ?? 'No se pudo asignar la celda');
      } finally {
        setLoading(false);
      }
    },
    [slot, onChanged, colaboradoresSvc]
  );

  // Desasignar fijo
  const onUnassign = React.useCallback(async () => {
    if (!assignee || !colaboradoresSvc) return;
    if (!assignee.slotAsignado) {
      console.warn('[onUnassign] assignee sin slot', assignee);
      setError('Asignado inválido: falta ID de la celda.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await unassignSlotFromCollaborator(colaboradoresSvc, Number(assignee.slotAsignado));
      setAssignee(null);
      await onChanged?.();
    } catch (e: any) {
      console.error('[onUnassign] error', e);
      setError(e?.message ?? 'No se pudo desasignar la celda');
    } finally {
      setLoading(false);
    }
  }, [assignee, onChanged, colaboradoresSvc]);

  // Chequear choque (reserva) con Graph
  const isBusy = React.useCallback(
    async (spotId: number, dateISO: string, turn: 'Manana' | 'Tarde' | 'Dia completo') => {
      if (!reservationsSvc) return false;
      const res: any = await reservationsSvc.getAll({
        select: ['ID'] as any,
        top: 1 as any,
        filter: `fields/SpotId eq ${spotId} and fields/Date eq '${dateISO}' and fields/Turn eq '${turn}' and (fields/Status ne 'Cancelada')`,
      } as any);
      const arr = (res?.data ?? res?.value ?? []) as any[];
      return Array.isArray(arr) && arr.length > 0;
    },
    [reservationsSvc]
  );

  // Crear reserva puntual (usa rvName/rvMail — obligatorios)
  const onCreateReservation = React.useCallback(
    async () => {
      if (!slot || !reservationsSvc) return;

      // Validación hard-stop
      setRvTouched({ name: true, mail: true });
      if (nameError || mailError) {
        setRvError(nameError || mailError);
        return;
      }

      setRvSaving(true);
      setRvError(null);
      try {
        const busy = await isBusy(slot.Id, rvDate, rvTurn);
        if (busy) {
          setRvError('Ya existe una reserva para esa fecha y turno en esta celda.');
          setRvSaving(false);
          return;
        }

        await reservationsSvc.create({
          SpotIdLookupId: Number(slot.Id),
          Date: rvDate,
          Turn: rvTurn,
          Status: 'Activa',
          NombreUsuario: rvName,
          Title: rvMail,
          VehicleType: slot.TipoCelda,
        } as any);

        await onChanged?.(); // refresca la lista
        alert('Reserva creada correctamente.');
        onClose(); // cerrar modal
      } catch (e: any) {
        setRvError(e?.message ?? 'No fue posible crear la reserva.');
      } finally {
        setRvSaving(false);
      }
    },
    [slot, rvDate, rvTurn, rvName, rvMail, isBusy, onChanged, onClose, nameError, mailError, reservationsSvc]
  );

  const onDeleteCell = React.useCallback(
    async () => {
      if (!slot || !reservationsSvc) return;
      try {
        const reserves = await reservationsSvc.getAll({
          filter: `fields/SpotId eq ${slot.Id} and (fields/Status ne 'Cancelada')`
        });
        const toDelete = reserves?.items ?? [];
        if (toDelete.length > 0) {
          const results = await Promise.allSettled(
            toDelete.map((r:  Reservations ) =>
              reservationsSvc.delete(String((r).ID ?? (r as any).id))
            )
          );

          const failed = results.filter(r => r.status === "rejected");
          if (failed.length > 0) {
            console.warn(`No se pudieron eliminar ${failed.length} reservas de ${toDelete.length}.`);
          }
        }
        await cellsScv!.delete(String(slot.Id));

        await onChanged?.();
        alert("Celda y reservas asociadas eliminadas correctamente");
        onClose();
      } catch (e: any) {
        setRvError(e?.message ?? "No fue posible eliminar la celda y sus reservas.");
      } finally {
        setRvSaving(false);
      }
    },
    // Dependencias reales (quita lo que no usas: rvDate, rvTurn, rvName, rvMail, isBusy)
    [slot, onChanged, onClose, nameError, mailError, reservationsSvc, cellsScv]
  );

  const onEditCell = React.useCallback(
    async (name: string, itinerancia: string) => {
      if (!slot || !cellsScv) return;                 // ← usa el servicio correcto
      try {
        await cellsScv.update(String(slot.Id), { Itinerancia: itinerancia, Title: name });  // ← await
        await onChanged?.();
        alert("Celda editada con exito");
        onClose();
      } catch (e: any) {
        setRvError(e?.message ?? "No fue posible editar la celda.");
      } finally {
        setRvSaving(false);
      }
    },
    [slot, onChanged, onClose, cellsScv]              // ← dependencias mínimas y correctas
  );
  // ===== Render =====
  if (!open || !slot) return null;

  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div style={S.backdrop} onMouseDown={onBackdrop} data-force-light>
      <div style={S.modal}>
        <header style={S.header}>
          <h3 style={S.title}>Celda {slot.Title}</h3>
          <div style={S.headerActions}>
            <button type="button" style={S.iconBtnDanger} onClick={() => onDeleteCell()} title="Eliminar celda" aria-label="Eliminar celda">
              Eliminar
            </button>
            <button type="button" style={S.iconBtn} onClick={() => setEditOpen(true)} title="Editar celda" aria-label="Editar celda">
              Editar
            </button>
            
          </div>
          <button style={S.closeBtn} onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div style={S.body}>
          <div><strong>Tipo:</strong> {slot.TipoCelda}</div>
          <div><strong>Estado:</strong> {slot.Activa}</div>
          <div style={S.muted as React.CSSProperties}>
            <strong>Tipo de usuario:</strong> {slot.Itinerancia ?? '—'} &nbsp;→&nbsp;
            <strong>{mode === 'reserva' ? 'Modo Reserva (turno)' : 'Modo Asignación fija'}</strong>
          </div>

          {/* ===== Asignación fija ===== */}
          {mode === 'fijar' && (
            <div style={S.card}>
              <h4 style={{ margin: 0 }}>Asignación fija</h4>
              {loading && <div style={S.muted}>Cargando…</div>}
              {error && <div style={{ color: 'crimson' }}>{error}</div>}

              {!loading && (
                <>
                  {assignee ? (
                    <div style={S.rowBetween}>
                      <div>
                        <div><strong>Asignado a:</strong> {assignee.name}</div>
                        {assignee.email && <div style={S.muted}>{assignee.email}</div>}
                      </div>
                      <button type="button" style={S.btnDanger} onClick={() => onUnassign()}>
                        Desasignar
                      </button>
                    </div>
                  ) : (
                    <div style={S.rowBetween}>
                      <div style={S.muted}>Sin asignación</div>
                      <button style={S.btnPrimary} onClick={() => setPickerOpen(true)}>
                        Asignar
                      </button>
                    </div>
                  )}
                </>
              )}

              {pickerOpen && (
                <div style={S.pickerPanel}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={S.input}
                      placeholder="Buscar colaborador (nombre o correo)…"
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                    />
                    <button style={S.btnPrimary} onClick={doSearch} disabled={searching || !colaboradoresSvc}>
                      {searching ? 'Buscando…' : 'Buscar'}
                    </button>
                    <button
                      style={S.btnGhost}
                      onClick={() => { setPickerOpen(false); setTerm(''); setResults([]); }}
                    >
                      Cerrar
                    </button>
                  </div>

                  <ul style={S.list}>
                    {results.length === 0 && !searching && (
                      <li style={S.muted}>Sin resultados</li>
                    )}
                    {results.map((c) => (
                      <li key={c?.id} style={S.listItem}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c?.name}</div>
                          {c?.email && <div style={S.muted}>{c.email}</div>}
                        </div>
                        <button style={S.btnPrimary} onClick={() => onAssign(c)}>
                          Asignar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ===== Reserva puntual (con selector de colaboradores) ===== */}
          {mode === 'reserva' && (
            <div style={S.card}>
              <h4 style={{ margin: 0 }}>Reserva puntual por turno</h4>
              <div style={{ ...S.muted, marginBottom: 8 }}>
                Crea una reserva para un <strong>día</strong> y <strong>turno</strong> (AM/PM).
              </div>

              {/* Selector de colaborador SOLO para reserva */}
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <div style={S.row2}>
                  <label style={{ ...S.labelCol, marginBottom: 0 }}>
                    <span><strong>Colaborador</strong></span>
                    <input
                      style={S.input}
                      type="text"
                      placeholder="Buscar por nombre/correo/cargo…"
                      value={colabTerm}
                      onChange={(e) => setColabTerm(e.target.value)}
                      disabled={workersLoading}
                    />
                  </label>

                  <label style={{ ...S.labelCol, marginBottom: 0 }}>
                    <span><strong>&nbsp;</strong></span>
                    <select
                      style={S.select}
                      value={selectedWorkerId}
                      onChange={(e) => onSelectWorker(e.target.value)}
                      disabled={workersLoading}
                    >
                      <option value="">
                        {workersLoading
                          ? 'Cargando colaboradores…'
                          : filteredWorkers.length === 0
                          ? 'Sin resultados'
                          : 'Selecciona un colaborador (opcional)'}
                      </option>

                      {filteredWorkers.map((w) => (
                        <option key={w.key} value={w.key}>
                          {w.name}{w.job ? ` · ${w.job}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <small style={S.muted}>
                  Al seleccionar, se rellenan Nombre y Correo (puedes editarlos).
                </small>
              </fieldset>

              {rvError && <div style={{ color: 'crimson' }}>{rvError}</div>}

              <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
                {/* Fila: Fecha + Turno */}
                <div style={S.row2}>
                  <label style={S.labelCol}>
                    <span><strong>Fecha</strong></span>
                    <input
                      type="date"
                      style={S.input}
                      value={rvDate}
                      onChange={(e) => setRvDate(e.target.value)}
                      min={todayISO}
                    />
                  </label>

                  <label style={S.labelCol}>
                    <span><strong>Turno</strong></span>
                    <select
                      style={S.select}
                      value={rvTurn}
                      onChange={(e) => setRvTurn(e.target.value as 'Manana' | 'Tarde' | 'Dia completo')}
                    >
                      <option value="Manana">AM (06:00–12:59)</option>
                      <option value="Tarde">PM (13:00–19:00)</option>
                      <option value="Dia completo">Día completo</option>
                    </select>
                  </label>
                </div>

                {/* Fila: Nombre + Correo */}
                <div style={S.row2}>
                  <label style={S.labelCol}>
                    <span><strong>Nombre</strong></span>
                    <input
                      style={{
                        ...S.input,
                        borderColor: rvTouched.name && nameError ? '#dc2626' : (S.input as any).borderColor,
                        outlineColor: rvTouched.name && nameError ? '#dc2626' : undefined,
                      }}
                      value={rvName}
                      onChange={(e) => { setRvName(e.target.value); if (rvError) setRvError(null); }}
                      onBlur={() => setRvTouched((t) => ({ ...t, name: true }))}
                      placeholder="Nombre del usuario"
                      required
                      aria-required="true"
                      aria-invalid={!!(rvTouched.name && nameError)}
                    />
                    {rvTouched.name && nameError && (
                      <small style={{ color: '#dc2626' }}>{nameError}</small>
                    )}
                  </label>

                  <label style={S.labelCol}>
                    <span><strong>Correo</strong></span>
                    <input
                      style={{
                        ...S.input,
                        borderColor: rvTouched.mail && mailError ? '#dc2626' : (S.input as any).borderColor,
                        outlineColor: rvTouched.mail && mailError ? '#dc2626' : undefined,
                      }}
                      type="email"
                      value={rvMail}
                      onChange={(e) => { setRvMail(e.target.value); if (rvError) setRvError(null); }}
                      onBlur={() => setRvTouched((t) => ({ ...t, mail: true }))}
                      placeholder="correo@empresa.com"
                      required
                      aria-required="true"
                      aria-invalid={!!(rvTouched.mail && mailError)}
                    />
                    {rvTouched.mail && mailError && (
                      <small style={{ color: '#dc2626' }}>{mailError}</small>
                    )}
                  </label>
                </div>

                {/* Botonera */}
                <br />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    style={S.btnGhost}
                    type="button"
                    onClick={() => {
                      setRvDate(todayISO);
                      setRvTurn('Manana');
                      setRvName(assignee?.name ?? '');
                      setRvMail(assignee?.email ?? '');
                      setRvError(null);
                      setRvTouched({ name: false, mail: false });
                      setColabTerm('');
                      setSelectedWorkerId('');
                    }}
                  >
                    Limpiar
                  </button>
                  <button
                    style={S.btnPrimary}
                    type="button"
                    onClick={onCreateReservation}
                    disabled={!canSubmitReservation || !reservationsSvc}
                  >
                    {rvSaving ? 'Creando…' : 'Crear reserva'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {editOpen && (
          <div role="dialog" aria-modal="true" aria-labelledby="edit-title" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditOpen(false);}}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 9999, }}>
            <div
              style={{
                width: 520,
                maxWidth: "92vw",
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 10px 30px rgba(0,0,0,.25)",
                overflow: "hidden",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <h4 id="edit-title" style={{ margin: 0 }}>Editar celda</h4>
                <button
                  type="button"
                  style={S.closeBtn}
                  onClick={() => setEditOpen(false)}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </header>

              <div style={{ padding: 16, display: "grid", gap: 12 }}>
                {/* Desplegable: 3 opciones */}
                <label style={{ display: "grid", gap: 6 }}>
                  <span><strong>Cambiar tipo de usuario:</strong></span>
                  <select
                    style={S.select}
                    value={editOption}
                    onChange={(e) => setEditOption(e.target.value)}
                  >
                    <option value="">Selecciona…</option>
                    <option value="Directico">Directivo</option>
                    <option value="Empleado Fijo">Empleado Fijo</option>
                    <option value="Empleado Itinerante">Empleado Itinerante</option>
                  </select>
                </label>

                {/* Texto con validación AA - xxxxx… */}
                <label style={{ display: "grid", gap: 6 }}>
                  <span><strong>Nuevo identificador de celda</strong> <small style={S.muted}>Formato: AA - mínimo 5 caracteres</small></span>
                  <input
                    type="text"
                    style={{
                      ...S.input,
                      borderColor: editTouched  ? "#dc2626" : (S.input as any).borderColor,
                      outlineColor: editTouched  ? "#dc2626" : undefined,
                    }}
                    placeholder="AB - descripción..."
                    value={editText}
                    onChange={(e) => {
                      setEditText(e.target.value);
                    }}
                    onBlur={() => setEditTouched(true)}
                    // Validación nativa del navegador (opcional)
                    pattern="^[A-Za-z]{2} - .{5,}$"
                    title="Usa 'AA - (mínimo 5 caracteres)'"
                    required
                    aria-invalid={!!(editTouched )}
                  />
                </label>
              </div>

              <footer
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  padding: 16,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <button type="button" style={S.btnGhost} onClick={() => setEditOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  style={S.btnPrimary}
                  onClick={handleEditSave}
                >
                  Guardar
                </button>
              </footer>
            </div>
          </div>
        )}

        <footer style={S.footer}>
          <button style={S.btnGhost} onClick={onClose}>Cerrar</button>
        </footer>
      </div>
    </div>
  );
}