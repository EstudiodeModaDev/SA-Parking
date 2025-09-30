import * as React from 'react';
import styles from './modalAgregarColaborador.module.css';
import type { Worker } from '../../Models/shared';
import type { RegistroVehicularSP } from '../../Models/RegistroVehicular';

export type VehicleType = 'Carro' | 'Moto';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (c: RegistroVehicularSP) => Promise<void> | void;
  workers?: Worker[];
  workersLoading?: boolean;
};

const initialForm: RegistroVehicularSP = {
  Title: '',
  Cedula: '',
  TipoVeh: '',
  PlacaVeh: '',
  CorreoReporte: ''
};

// normaliza para búsqueda (sin acentos / case-insensitive)
const norm = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const ModalNuevoRegistro: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  workers = [],
  workersLoading = false,
}) => {
  const [form, setForm] = React.useState<RegistroVehicularSP>(initialForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // selector de colaboradores (igual a #2)
  const [colabTerm, setColabTerm] = React.useState('');
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string>('');
  const firstInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setError(null);
      setColabTerm('');
      setSelectedWorkerId('');
      setTimeout(() => firstInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, saving, onClose]);

  // lista filtrada por término
  const filteredWorkers = React.useMemo(() => {
    if (!colabTerm) return workers;
    const q = norm(colabTerm);
    return workers.filter(w =>
      norm(`${w.displayName} ${w.mail ?? ''} ${w.jobTitle ?? ''}`).includes(q),
    );
  }, [workers, colabTerm]);

  // al elegir un colaborador, copia su nombre al formulario
  const onSelectWorker = (id: string) => {
    setSelectedWorkerId(id);
    const w = workers.find(x => String(x.id) === String(id));
    if (!w) {
      setForm(f => ({ ...f, Title: '' /*, CorreoReporte: ''*/ }));
      return;
    }
    setForm(f => ({
      ...f,
      Title: w.displayName || '',
      // CorreoReporte: w.mail || f.CorreoReporte, // ← descomenta si también quieres autollenar el correo
    }));
    setError(null);
  };

  // Validaciones simples
  const errors = React.useMemo(() => {
    const e: Partial<Record<keyof RegistroVehicularSP, string>> = {};
    if (!form.Title.trim()) e.Title = 'El nombre es obligatorio.';
    if (!form.Cedula.trim()) e.Cedula = 'La cédula es obligatoria.';
    if (!form.TipoVeh) e.TipoVeh = 'Selecciona el tipo de vehículo.';
    if (!form.PlacaVeh.trim()) e.PlacaVeh = 'La placa es obligatoria.';
    if (!form.CorreoReporte.trim()) e.CorreoReporte = 'El correo es obligatorio.';
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
      setError(err?.message ?? 'No se pudo guardar el registro.');
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
          <h2 className={styles.title}>Registrar vehículo</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar"
            disabled={saving}
          >
            ×
          </button>
        </header>

        <form className={styles.body} onSubmit={handleSubmit} noValidate>
          {/* Colaborador con búsqueda + dropdown (como #2) */}
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
              Al seleccionar un colaborador, se llena el Nombre (puedes editarlo).
            </small>
          </fieldset>

          {/* Datos editables */}
          <label className={styles.label}>
            Nombre del colaborador
            <input
              className={styles.input}
              type="text"
              value={form.Title}
              onChange={(e) => setForm((f) => ({ ...f, Title: e.target.value }))}
              required
              aria-invalid={!!errors.Title}
            />
            {errors.Title && <small className={styles.error}>{errors.Title}</small>}
          </label>

          <label className={styles.label}>
            Cédula del colaborador
            <input
              className={styles.input}
              type="text"
              value={form.Cedula}
              onChange={(e) => setForm((f) => ({ ...f, Cedula: e.target.value }))}
              required
              aria-invalid={!!errors.Cedula}
            />
            {errors.Cedula && <small className={styles.error}>{errors.Cedula}</small>}
          </label>

          <div className={styles.row2}>
            <label className={styles.label}>
              Tipo de vehículo
              <select
                className={styles.select}
                value={form.TipoVeh}
                onChange={(e) =>
                  setForm((f) => ({ ...f, TipoVeh: e.target.value as VehicleType }))
                }
                disabled={saving}
                required
                aria-invalid={!!errors.TipoVeh}
              >
                <option value="">Selecciona…</option>
                <option value="Carro">Carro</option>
                <option value="Moto">Moto</option>
              </select>
              {errors.TipoVeh && <small className={styles.error}>{errors.TipoVeh}</small>}
            </label>

            <label className={styles.label}>
              Placa del vehículo
              <input
                className={styles.input}
                type="text"
                value={form.PlacaVeh}
                onChange={(e) =>
                  setForm((f) => ({ ...f, PlacaVeh: e.target.value.toUpperCase() }))
                }
                placeholder="Ej: ABC123"
                required
                aria-invalid={!!errors.PlacaVeh}
              />
              {errors.PlacaVeh && <small className={styles.error}>{errors.PlacaVeh}</small>}
            </label>
          </div>

          <label className={styles.label}>
            Correo para solicitud de registro
            <input
              className={styles.input}
              type="email"
              value={form.CorreoReporte}
              onChange={(e) =>
                setForm((f) => ({ ...f, CorreoReporte: e.target.value }))
              }
              placeholder="correo@empresa.com"
              required
              aria-invalid={!!errors.CorreoReporte}
            />
            {errors.CorreoReporte && <small className={styles.error}>{errors.CorreoReporte}</small>}
          </label>

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

export default ModalNuevoRegistro;
