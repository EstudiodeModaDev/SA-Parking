import * as React from 'react';
import styles from './modalAgregarColaborador.module.css';
import type { NewCollaborator } from '../../Models/colaboradores';
import type { SlotUI } from '../../Models/Celdas';
import { useGroupMembers } from '../../Hooks/GraphUsers';
import type { newAccess } from '../../Models/GraphUsers';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (c: newAccess) => Promise<void> | void;
  slots?: SlotUI[];
  slotsLoading?: boolean;
  /** Nuevo: grupo desde donde leer miembros */
  groupId: string;
};

const initialForm: newAccess = {
  name:"",
  mail: ""
};

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());

const ModalOtorgarPermiso: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  groupId,
}) => {
  // ---- state
  const [form, setForm] = React.useState<newAccess>(initialForm);
  const [saving, setSaving] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');
  const firstInputRef = React.useRef<HTMLInputElement | null>(null);

  // Hook: miembros del grupo (paginado/filtrado en cliente)
  const {
    rows,          // AppUsers[]: { id, nombre, correo }
    loading,       // estado de carga Graph
    error,         // error del hook
    search, setSearch,
    refresh,
  } = useGroupMembers(groupId);

  // reset al abrir
  React.useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setSelectedUserId('');
      setLocalError(null);
      setSearch('');  // limpiar búsqueda del hook
      refresh();      // re-cargar miembros
      setTimeout(() => firstInputRef.current?.focus(), 0);
    }
  }, [isOpen, setSearch, refresh]);

  // cerrar con ESC
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, saving, onClose]);

  const onSelectUser = (id: string) => {
    setSelectedUserId(id);
    const u = rows.find(x => String(x.id) === String(id));
    if (!u) {
      setForm(f => ({ ...f, name: '', mail: '' }));
      return;
    }
    setForm(f => ({ ...f, name: u.nombre ?? '', mail: u.correo ?? '' }));
    setLocalError(null);
  };

  // validaciones
  const errors = React.useMemo(() => {
    const e: Partial<Record<keyof NewCollaborator, string>> = {};
    if (!form.name.trim()) e.nombre = 'El nombre es obligatorio.';
    if (!isEmail(form.mail)) e.correo = 'Correo inválido.';
    return e;
  }, [form]);

  const hasErrors = Object.keys(errors).length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || hasErrors) return;
    try {
      setSaving(true);
      setLocalError(null);
      await onSave?.(form);
      onClose();
    } catch (err: any) {
      setLocalError(err?.message ?? 'No se pudo guardar el colaborador.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !saving) onClose();
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      onMouseDown={onBackdrop}
    >
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>Otorgar permiso</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar"
            disabled={saving}
          >
            ×
          </button>
        </header>

        <form className={styles.body} onSubmit={handleSubmit} noValidate>
          {/* Colaborador con búsqueda + dropdown alimentado por useGroupMembers */}
          <fieldset className={styles.fieldset}>
            <label className={styles.label}>Colaborador</label>

            <div className={styles.comboColab}>
              <input
                ref={firstInputRef}
                className={styles.input}
                type="text"
                placeholder="Buscar por nombre o correo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={loading || saving}
                autoComplete="off"
              />

              <select
                className={styles.select}
                value={selectedUserId}
                onChange={(e) => onSelectUser(e.target.value)}
                disabled={loading || saving}
                aria-label="Selecciona un colaborador"
              >
                <option value="">
                  {loading
                    ? 'Cargando colaboradores…'
                    : rows.length === 0
                    ? 'Sin resultados'
                    : 'Selecciona un colaborador'}
                </option>
                {rows.map((u) => (
                  <option key={String(u.id)} value={String(u.id)}>
                    {u.nombre}{u.correo ? ` · ${u.correo}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <small className={styles.hint}>
              Al seleccionar del desplegable, se llenan Nombre y Correo (puedes editarlos).
            </small>

            {(error || localError) && (
              <div className={styles.error}>{error ?? localError}</div>
            )}
          </fieldset>

          {/* Datos editables */}
          <label className={styles.label}>
            Nombre
            <input
              className={styles.input}
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              required
              aria-invalid={!!errors.nombre}
              disabled={true}
            />
            {errors.nombre && <small className={styles.error}>{errors.nombre}</small>}
          </label>

          <label className={styles.label}>
            Correo electrónico
            <input
              className={styles.input}
              type="email"
              value={form.mail}
              onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
              required
              disabled={true}
              aria-invalid={!!errors.correo}
            />
            {errors.correo && <small className={styles.error}>{errors.correo}</small>}
          </label>


          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={onClose}
              disabled={saving}
              >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={saving || hasErrors}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalOtorgarPermiso;
