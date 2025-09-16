import * as React from 'react';
import styles from './AdminSettings.module.css';
import type { SettingsPort, SettingsForm, SettingsRecord } from '../../Ports/settingsPort';

// ================== helpers de módulo (deben ir antes de usarse) ==================
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));

const toTime = (h: number) => String(clamp(h, 0, 23)).padStart(2, '0') + ':00';

const fromTime = (t: string, fallback: number) => {
  if (!t) return fallback;
  const [hh] = t.split(':');
  const n = Number(hh);
  return Number.isFinite(n) ? n : fallback;
};

const s = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

// ================== defaults ==================
const DEFAULTS: SettingsForm = {
  VisibleDays: 3,
  TyC: '',
  InicioManana: 7,
  FinalManana: 12,
  InicioTarde: 12,
  FinalTarde: 18,
  PicoPlaca: false,
};

type Props = {
  port: SettingsPort;
  initial?: Partial<SettingsForm>;
};

const AdminSettings: React.FC<Props> = ({ port, initial }) => {
  // estado del form
  const [form, setForm] = React.useState<SettingsForm>({
    VisibleDays: initial?.VisibleDays ?? DEFAULTS.VisibleDays,
    TyC: s(initial?.TyC ?? DEFAULTS.TyC),
    InicioManana: initial?.InicioManana ?? DEFAULTS.InicioManana,
    FinalManana: initial?.FinalManana ?? DEFAULTS.FinalManana,
    InicioTarde: initial?.InicioTarde ?? DEFAULTS.InicioTarde,
    FinalTarde: initial?.FinalTarde ?? DEFAULTS.FinalTarde,
    PicoPlaca: initial?.PicoPlaca ?? DEFAULTS.PicoPlaca,
  });

  // base backend
  const [base, setBase] = React.useState<SettingsRecord | null>(null);

  // UI
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);

  const loadedRef = React.useRef(false);

  // cargar una sola vez
  React.useEffect(() => {
    if (loadedRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const rec = await port.getOne();
        if (cancelled) return;

        setBase(rec);
        setForm(prev => ({
          VisibleDays: rec.VisibleDays ?? prev.VisibleDays ?? DEFAULTS.VisibleDays,
          TyC: prev.TyC && prev.TyC !== DEFAULTS.TyC ? prev.TyC : s(rec.TyC ?? DEFAULTS.TyC),
          InicioManana: rec.InicioManana ?? prev.InicioManana ?? DEFAULTS.InicioManana,
          FinalManana:  rec.FinalManana  ?? prev.FinalManana  ?? DEFAULTS.FinalManana,
          InicioTarde:  rec.InicioTarde  ?? prev.InicioTarde  ?? DEFAULTS.InicioTarde,
          FinalTarde:   rec.FinalTarde   ?? prev.FinalTarde   ?? DEFAULTS.FinalTarde,
          PicoPlaca:    rec.PicoPlaca    ?? prev.PicoPlaca    ?? DEFAULTS.PicoPlaca,
        }));
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'No se pudieron cargar los ajustes.');
      } finally {
        if (!cancelled) {
          loadedRef.current = true;
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [port]);

  // validaciones
  const errors = React.useMemo(() => {
    const e: Partial<Record<keyof SettingsForm, string>> = {};

    if (form.VisibleDays < 1) e.VisibleDays = 'Debe ser ≥ 1 día.';

    // AM: 0-12
    if (form.InicioManana < 0 || form.InicioManana > 12) e.InicioManana = 'Debe estar entre 0 y 12.';
    if (form.FinalManana  < 0 || form.FinalManana  > 12) e.FinalManana  = 'Debe estar entre 0 y 12.';
    if (!e.InicioManana && !e.FinalManana && form.InicioManana >= form.FinalManana) {
      e.FinalManana = 'Debe ser mayor que el inicio AM.';
    }

    // PM: 12-23
    if (form.InicioTarde < 12 || form.InicioTarde > 23) e.InicioTarde = 'Debe estar entre 12 y 23.';
    if (form.FinalTarde  < 12 || form.FinalTarde  > 23) e.FinalTarde  = 'Debe estar entre 12 y 23.';
    if (!e.InicioTarde && !e.FinalTarde && form.InicioTarde >= form.FinalTarde) {
      e.FinalTarde = 'Debe ser mayor que el inicio PM.';
    }

    // continuidad: fin AM <= inicio PM
    if (!e.FinalManana && !e.InicioTarde && form.FinalManana > form.InicioTarde) {
      e.InicioTarde = 'El inicio PM debe ser ≥ al final AM.';
    }

    return e;
  }, [form]);

  const hasErrors = Object.keys(errors).length > 0;

  // handlers
  const onChangeNumber =
    (key: keyof SettingsForm, min: number, max: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      setForm(f => ({ ...f, [key]: clamp(v, min, max) }));
      setOkMsg(null); setError(null);
    };

  const onChangeText =
    (key: 'TyC') =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value ?? '' }));
      setOkMsg(null); setError(null);
    };

  const onChangeBool =
    (key: 'PicoPlaca') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(f => ({ ...f, [key]: e.target.checked }));
      setOkMsg(null); setError(null);
    };

  const save = async () => {
    if (!base || hasErrors) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);

    try {
      const prev: SettingsForm = {
        VisibleDays: base.VisibleDays ?? DEFAULTS.VisibleDays,
        TyC: s(base.TyC ?? DEFAULTS.TyC),
        InicioManana: base.InicioManana ?? DEFAULTS.InicioManana,
        FinalManana: base.FinalManana ?? DEFAULTS.FinalManana,
        InicioTarde: base.InicioTarde ?? DEFAULTS.InicioTarde,
        FinalTarde: base.FinalTarde ?? DEFAULTS.FinalTarde,
        PicoPlaca: base.PicoPlaca ?? DEFAULTS.PicoPlaca,
      };

      const changes: Partial<SettingsForm> = {};
      if (form.VisibleDays !== prev.VisibleDays) changes.VisibleDays = form.VisibleDays;
      if (form.TyC !== prev.TyC) changes.TyC = form.TyC;
      if (form.InicioManana !== prev.InicioManana) changes.InicioManana = form.InicioManana;
      if (form.FinalManana !== prev.FinalManana) changes.FinalManana = form.FinalManana;
      if (form.InicioTarde !== prev.InicioTarde) changes.InicioTarde = form.InicioTarde;
      if (form.FinalTarde !== prev.FinalTarde) changes.FinalTarde = form.FinalTarde;
      if (form.PicoPlaca !== prev.PicoPlaca) changes.PicoPlaca = form.PicoPlaca;

      if (Object.keys(changes).length === 0) {
        setOkMsg('No hay cambios por guardar.');
        return;
      }

      await port.update(base.ID, changes);
      setBase({ ...base, ...changes });
      setOkMsg('Ajustes guardados correctamente.');
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'No se pudo guardar los ajustes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Cargando ajustes…</div>;

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h2 className={styles.title}>Parámetros de Reservas</h2>

        {/* VisibleDays */}
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="VisibleDays">
              Días máximos visibles
              <span title="Con cuánto tiempo de antelación permite reservar la aplicación" style={{cursor:'help'}}> ℹ️</span>
            </label>
            <input
              id="VisibleDays"
              className={styles.input}
              type="number"
              min={1}
              max={60}
              value={form.VisibleDays}
              onChange={onChangeNumber('VisibleDays', 1, 60)}
            />
            {errors.VisibleDays && <div className={styles.error}>{errors.VisibleDays}</div>}
          </div>
        </div>

        {/* TyC */}
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="TyC">
              Términos y condiciones
              <span title="Términos y condiciones del parqueadero." style={{cursor:'help'}}> ℹ️</span>
            </label>
            <textarea
              id="TyC"
              className={styles.textarea}
              value={form.TyC}
              onChange={onChangeText('TyC')}
              rows={12}
              placeholder="Escribe los términos y condiciones…"
            />
          </div>
        </div>

        {/* Horarios */}
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="Horarios">
              Horarios Parqueaderos
              <span title="A qué hora inician y finalizan los turnos del parqueadero" style={{ cursor: 'help' }}> ℹ️</span>
            </label>

            <div className={styles.horarioswrap}>
              {/* AM */}
              <div className={styles.horInline}>
                <span className={styles.horBadge}>AM</span>

                <input
                  id="InicioManana"
                  type="time"
                  className={styles.time}
                  step={3600}
                  min="00:00" max="12:00"
                  value={toTime(form.InicioManana)}
                  onChange={(e) => {
                    const v = clamp(fromTime(e.target.value, form.InicioManana), 0, 12);
                    setForm(f => ({ ...f, InicioManana: v }));
                    setOkMsg(null); setError(null);
                  }}
                />

                <span className={styles.sep}>–</span>

                <input
                  id="FinalManana"
                  type="time"
                  className={styles.time}
                  step={3600}
                  min="00:00" max="12:00"
                  value={toTime(form.FinalManana)}
                  onChange={(e) => {
                    const v = clamp(fromTime(e.target.value, form.FinalManana), 0, 12);
                    setForm(f => ({ ...f, FinalManana: v }));
                    setOkMsg(null); setError(null);
                  }}
                />
              </div>

              {/* PM */}
              <div className={styles.horInline}>
                <span className={styles.horBadge}>PM</span>

                <input
                  id="InicioTarde"
                  type="time"
                  className={styles.time}
                  step={3600}
                  min="12:00" max="23:00"
                  value={toTime(form.InicioTarde)}
                  onChange={(e) => {
                    const v = clamp(fromTime(e.target.value, form.InicioTarde), 12, 23);
                    setForm(f => ({ ...f, InicioTarde: v }));
                    setOkMsg(null); setError(null);
                  }}
                />

                <span className={styles.sep}>–</span>

                <input
                  id="FinalTarde"
                  type="time"
                  className={styles.time}
                  step={3600}
                  min="12:00" max="23:00"
                  value={toTime(form.FinalTarde)}
                  onChange={(e) => {
                    const v = clamp(fromTime(e.target.value, form.FinalTarde), 12, 23);
                    setForm(f => ({ ...f, FinalTarde: v }));
                    setOkMsg(null); setError(null);
                  }}
                />
              </div>
            </div>

            {/* errores horarios */}
            <div>
              {errors.InicioManana && <div className={styles.error}>Inicio AM: {errors.InicioManana}</div>}
              {errors.FinalManana  && <div className={styles.error}>Final AM: {errors.FinalManana}</div>}
              {errors.InicioTarde  && <div className={styles.error}>Inicio PM: {errors.InicioTarde}</div>}
              {errors.FinalTarde   && <div className={styles.error}>Final PM: {errors.FinalTarde}</div>}
            </div>
          </div>
        </div>

        {/* Pico y Placa */}
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="PicoPlaca">
              Pico y Placa activo
              <span title="Si está activo, se aplican las exclusiones de pico y placa en reservas." style={{ cursor: 'help' }}> ℹ️</span>
            </label>
            <input
              id="PicoPlaca"
              className={styles.checkbox}
              type="checkbox"
              checked={!!form.PicoPlaca}
              onChange={onChangeBool('PicoPlaca')}
            />
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {okMsg && <div className={styles.ok}>{okMsg}</div>}

        <div className={styles.actions}>
          <button className={styles.button} onClick={save} disabled={saving || hasErrors}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
