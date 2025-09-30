import * as React from 'react';
import styles from './modalAgregarColaborador.module.css';
import type { newAccess } from '../../Models/GraphUsers';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (c: newAccess) => Promise<void> | void;
  slotsLoading?: boolean;
  /** Lista completa de colaboradores para alimentar el combo */
  workers: any[];
  workersLoading?: boolean;
};

const initialForm: newAccess = { name: '', mail: '' };
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

const ModalOtorgarPermiso: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  workers = [],
  workersLoading = false,
}) => {
  const [form, setForm] = React.useState<newAccess>(initialForm);
  const [saving, setSaving] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');
  const [term, setTerm] = React.useState('');
  const firstInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setSelectedUserId('');
      setLocalError(null);
      setTerm('');
      setTimeout(() => firstInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, saving, onClose]);

  const filteredWorkers = React.useMemo(() => {
    if (!term) return workers;
    const q = norm(term);
    return workers.filter(w =>
      norm(`${w.displayName ?? ''} ${w.mail ?? ''} ${w.jobTitle ?? ''}`).includes(q),
    );
  }, [workers, term]);

  const onSelectUser = (id: string) => {
    setSelectedUserId(id);
    const u = workers.find(x => String(x.id) === String(id));
    if (!u) {
      setForm({ name: '', mail: '' });
      return;
    }
    setForm({ name: u.displayName ?? '', mail: u.mail ?? '' });
    setLocalError(null);
  };

  const errors = React.useMemo(() => {
    const e: Partial<Record<keyof newAccess, string>> = {};
    if (!form.name.trim()) e.name = 'El nombre es obligatorio.';
    if (!isEmail(form.mail)) e.mail = 'Correo inválido.';
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
      setLocalError(err?.message ?? 'No se pudo otorgar el permiso.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !saving) onClose();
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onMouseDown={onBackdrop}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>Otorgar permiso</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar" disabled={saving}>×</button>
        </header>

        <form className={styles.body} onSubmit={handleSubmit} noValidate>
          <fieldset className={styles.fieldset}>
            <label className={styles.label}>Colaborador</label>

            <div className={styles.comboColab}>
              <input
                ref={firstInputRef}
                className={styles.input}
                type="text"
                placeholder="Buscar por nombre o correo…"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                disabled={workersLoading || saving}
                autoComplete="off"
              />

              <select
                className={styles.select}
                value={selectedUserId}
                onChange={(e) => onSelectUser(e.target.value)}
                disabled={workersLoading || saving}
                aria-label="Selecciona un colaborador"
              >
                <option value="">
                  {workersLoading
                    ? 'Cargando colaboradores…'
                    : filteredWorkers.length === 0
                    ? 'Sin resultados'
                    : 'Selecciona un colaborador'}
                </option>
                {filteredWorkers.map((w) => (
                  <option key={String(w.id)} value={String(w.id)}>
                    {w.displayName ?? '(Sin nombre)'}{w.mail ? ` · ${w.mail}` : ''}{w.jobTitle ? ` · ${w.jobTitle}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <small className={styles.hint}>
              Al seleccionar del desplegable, se llenan Nombre y Correo.
            </small>

            {localError && <div className={styles.error}>{localError}</div>}
          </fieldset>

          <label className={styles.label}>
            Nombre
            <input
              className={styles.input}
              type="text"
              value={form.name}
              readOnly
              aria-invalid={!!errors.name}
            />
            {errors.name && <small className={styles.error}>{errors.name}</small>}
          </label>

          <label className={styles.label}>
            Correo electrónico
            <input
              className={styles.input}
              type="email"
              value={form.mail}
              readOnly
              aria-invalid={!!errors.mail}
            />
            {errors.mail && <small className={styles.error}>{errors.mail}</small>}
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={saving || hasErrors}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalOtorgarPermiso;
