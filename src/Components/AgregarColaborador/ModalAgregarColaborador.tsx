import * as React from 'react';
import styles from './modalAgregarColaborador.module.css';
import type { NewCollaborator } from '../../Models/colaboradores';
import type { SlotUI } from '../../Models/Celdas';
import type { Worker } from '../../Models/shared';
import { nameProve } from '../../Services/Name.Service'

export type VehicleType = 'Carro' | 'Moto';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (c: NewCollaborator) => Promise<void> | void;
  slots?: SlotUI[];
  slotsLoading?: boolean;
  workers?: Worker[];
  workersLoading?: boolean;
};

const initialForm: NewCollaborator = {
  nombre: '',
  correo: '',
  tipoVehiculo: 'Carro',
  placa: '',
  codigoCelda: '',
  IdSpot: '',
};

const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
// Ejemplo simple de placa: 3 letras + 3 números (ajústalo a tu realidad)

const ModalAgregarColaborador: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  workers = [],
  workersLoading = false,
}) => {
  // ---- state
  const [form, setForm] = React.useState<NewCollaborator>(initialForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // búsqueda/selección de colaboradores
  const [colabTerm, setColabTerm] = React.useState('');
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string>('');
  const firstInputRef = React.useRef<HTMLInputElement | null>(null);

  // reset al abrir
  React.useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setColabTerm('');
      setSelectedWorkerId('');
      setError(null);
      // foco al primer input tras pintar
      setTimeout(() => firstInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // cerrar con ESC
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, saving, onClose]);

  const filteredWorkers = React.useMemo(() => {
    if (!colabTerm) return workers;
    const q = norm(colabTerm);
    return workers.filter(w =>
      norm(`${w.displayName} ${w.mail ?? ''} ${w.jobTitle ?? ''}`).includes(q),
    );
  }, [workers, colabTerm]);

  // para evitar condiciones de carrera si el usuario cambia rápido
  const lastPickRef = React.useRef<symbol | null>(null);

  const onSelectWorker = async (id: string) => {
    setSelectedWorkerId(id);
    const w = workers.find(x => String(x.id) === String(id));
    if (!w) {
      setForm(f => ({ ...f, nombre: '', correo: '' }));
      return;
    }
    // marca petición
    const req = Symbol();
    lastPickRef.current = req;

    let nombre = w.displayName || '';
    try {
      const ok = await nameProve(nombre);
      if (lastPickRef.current !== req) return; // selección cambió
      if (!ok) nombre = ''; // invalida si no pasó la verificación
    } catch {
      if (lastPickRef.current !== req) return;
      nombre = '';
    }
    setForm(f => ({
      ...f,
      nombre,
      correo: w.mail || '',
    }));
    setError(null);
  };

  // validaciones
  const errors = React.useMemo(() => {
    const e: Partial<Record<keyof NewCollaborator, string>> = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    if (!isEmail(form.correo)) e.correo = 'Correo inválido.';
    return e;
  }, [form]);

  const hasErrors = Object.keys(errors).length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || hasErrors) return;

    try {
      setSaving(true);
      setError(null);
      await onSave?.(form);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo guardar el colaborador.');
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
          <h2 className={styles.title}>Agregar colaborador</h2>
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
          {/* Colaborador con búsqueda + dropdown */}
          <fieldset className={styles.fieldset}>
            <label className={styles.label}>Colaborador</label>

            <div className={styles.comboColab}>
              <input
                ref={firstInputRef}
                className={styles.input}
                type="text"
                placeholder="Buscar por nombre, correo o cargo…"
                value={colabTerm}
                onChange={(e) => setColabTerm(e.target.value)}
                disabled={workersLoading || saving}
                autoComplete="off"
              />

              <select
                className={styles.select}
                value={selectedWorkerId}
                onChange={(e) => onSelectWorker(e.target.value)}
                disabled={workersLoading || saving}
              >
                <option value="">
                  {workersLoading
                    ? 'Cargando colaboradores…'
                    : filteredWorkers.length === 0
                    ? 'Sin resultados'
                    : 'Selecciona un colaborador (opcional)'}
                </option>
                {filteredWorkers.map((w) => (
                  <option key={String(w.id)} value={String(w.id)}>
                    {w.displayName}
                    {w.mail ? ` · ${w.mail}` : ''}
                    {w.jobTitle ? ` · ${w.jobTitle}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <small className={styles.hint}>
              Al seleccionar un colaborador, se llenan Nombre y Correo (puedes editarlos).
            </small>
          </fieldset>

          {/* Datos editables */}
          <label className={styles.label}>
            Nombre
            <input
              className={styles.input}
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              required
              aria-invalid={!!errors.nombre}
            />
            {errors.nombre && <small className={styles.error}>{errors.nombre}</small>}
          </label>

          <label className={styles.label}>
            Correo electrónico
            <input
              className={styles.input}
              type="email"
              value={form.correo}
              onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
              required
              aria-invalid={!!errors.correo}
            />
            {errors.correo && <small className={styles.error}>{errors.correo}</small>}
          </label>

          <div className={styles.row2}>
            <label className={styles.label}>
              Tipo de vehículo
              <select
                className={styles.select}
                value={form.tipoVehiculo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipoVehiculo: e.target.value as VehicleType }))
                }
                disabled={saving}
              >
                <option value="Carro">Carro</option>
                <option value="Moto">Moto</option>
              </select>
            </label>

            <label className={styles.label}>
              Placa del vehículo
              <input
                className={styles.input}
                type="text"
                value={form.placa}
                onChange={(e) =>
                  setForm((f) => ({ ...f, placa: e.target.value.toUpperCase() }))
                }
                placeholder="Ej: ABC123"
                required
                aria-invalid={!!errors.placa}
              />
              {errors.placa && <small className={styles.error}>{errors.placa}</small>}
            </label>
          </div>

          {error && <div className={styles.error}>{error}</div>}

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

export default ModalAgregarColaborador;
