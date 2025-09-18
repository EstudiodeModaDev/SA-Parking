import * as React from 'react';
import styles from './AdminSettings.module.css';
import type { FormState, Props } from '../../Models/Settings';

/* ================= Utils ================= */

// clamp genérico
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));

// horas enteras 0..23
const clampHour = (n: number) => clamp(Math.floor(n), 0, 23);

// "HH:mm" para input time / guardar
const toHH = (n: number) => String(clampHour(n)).padStart(2, '0') + ':00';

// parsea texto de hora → número de hora 0..23
// soporta: "07:00", "7", "7:30" (toma la hora), "7am", "7:00 PM", "12 PM"
const AMPM = /\b(am|pm|a\.m\.|p\.m\.)\b/i;
const parseHourText = (s: string | number | null | undefined, fallback = 0): number => {
  if (typeof s === 'number' && Number.isFinite(s)) return clampHour(s);
  const raw = String(s ?? '').trim().toLowerCase();
  if (!raw) return clampHour(fallback);

  // normaliza separadores y espacios
  let txt = raw.replace(/\s+/g, ' ').replace(/\./g, ':');

  const hasAmPm = AMPM.test(txt);
  const isPM = /p/.test(txt);
  txt = txt.replace(AMPM, '').trim();

  // extrae hh(:mm)?
  const m = txt.match(/^(\d{1,2})(?::?(\d{1,2}))?$/);
  if (!m) return clampHour(fallback);

  let h = Number(m[1]);
  // minutos no los usamos para la hora entera, pero validamos rango
  const min = Number(m[2] ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(min) || min < 0 || min > 59) return clampHour(fallback);

  if (hasAmPm) {
    // 12 AM -> 0, 12 PM -> 12
    h = isPM ? (h % 12) + 12 : (h % 12);
  }
  return clampHour(h);
};

// lee una propiedad probando múltiples nombres (en fields y raíz)
const pick = (row: any, keys: string[], fallback?: any) => {
  const srcs = [row?.fields ?? {}, row ?? {}];
  for (const src of srcs) {
    for (const k of keys) {
      if (src?.[k] !== undefined && src?.[k] !== null && String(src?.[k]).trim() !== '') {
        return src[k];
      }
    }
  }
  return fallback;
};

/* ================= Componente ================= */

const AdminSettings: React.FC<Props> = ({ settingsSvc, settingsItemId = '1' }) => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<FormState>({
    VisibleDays: 7,
    TyC: '',
    InicioHorarioMa_x00f1_ana: 7,
    FinalMa_x00f1_ana: 11,
    InicioTarde: 12,
    FinalTarde: 18,
  });

  // Cargar settings
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setOk(null);

        const row: any = await settingsSvc.get(settingsItemId);
        const r = row?.fields ?? row;

        // Mapea con tolerancia a nombres internos
        const VisibleDays = Number(pick(r, ['VisibleDays'], 7));
        const TyC = String(pick(r, ['TerminosyCondiciones', 'TyC', 'Tyc'], ''));

        // AM: permite variantes con espacios y _x00f1_
        const inicioAMtxt = pick(r, [
          'InicioHorarioMa_x00f1_ana',
          'InicioHorarioManana',
          'Inicio Manana',
          'Inicio Horario Mañana',
          'Inicio Horario Manana',
          'Inicio_Ma_x00f1_ana',
        ]);
        const finAMtxt = pick(r, [
          'FinalMa_x00f1_ana',
          'FinalManana',
          'FinManana',
          'Final Manana',
          'Final Horario Mañana',
          'Final Horario Manana',
          'Final_Ma_x00f1_ana',
        ]);

        // PM
        const inicioPMtxt = pick(r, ['InicioTarde', 'Inicio Tarde', 'InicioHorarioTarde', 'Inicio_Tarde']);
        const finPMtxt = pick(r, ['FinalTarde', 'FinTarde', 'Final Tarde', 'Final_Tarde']);

        const next: FormState = {
          VisibleDays,
          TyC,
          InicioHorarioMa_x00f1_ana: clamp(parseHourText(inicioAMtxt, 7), 0, 11),
          FinalMa_x00f1_ana: clamp(parseHourText(finAMtxt, 11), 1, 12),
          InicioTarde: clamp(parseHourText(inicioPMtxt, 12), 12, 23),
          FinalTarde: clamp(parseHourText(finPMtxt, 18), 12, 23),
        };

        if (!cancel) setForm(next);
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? 'No se pudo cargar la configuración.');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [settingsSvc, settingsItemId]);

  // Handlers
  const onNum = (key: keyof FormState, min = 1, max = 60) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = Number(e.target.value);
      setForm(f => ({ ...f, [key]: clamp(n, min, max) as any }));
      setOk(null); setError(null);
    };

  const onText = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }));
      setOk(null); setError(null);
    };

  // Validaciones (inicio < fin)
  const horariosInvalid =
    !(form.InicioHorarioMa_x00f1_ana < form.FinalMa_x00f1_ana) ||
    !(form.InicioTarde < form.FinalTarde);

  const canSave = !loading && !saving && !horariosInvalid;

  // Guardar siempre como texto "HH:mm" (24h)
  const save = async () => {
    try {
      if (!canSave) return;
      setSaving(true);
      setOk(null);
      setError(null);

      const payload: any = {
        VisibleDays: Number(form.VisibleDays) || 0,
        TerminosyCondiciones: form.TyC,

        InicioHorarioMa_x00f1_ana: toHH(form.InicioHorarioMa_x00f1_ana),
        FinalMa_x00f1_ana:        toHH(form.FinalMa_x00f1_ana),
        InicioTarde:              toHH(form.InicioTarde),
        FinalTarde:               toHH(form.FinalTarde),
      };

      await settingsSvc.update(settingsItemId, payload);
      setOk('Ajustes guardados correctamente.');
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.card}>Cargando ajustes…</div>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h2 className={styles.title}>Parámetros de Reservas</h2>

        {/* VisibleDays */}
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="VisibleDays">
              Días máximos visibles
              <span title="Con cuánto tiempo de antelación permite reservar la aplicación" style={{ cursor: 'help' }}> ℹ️</span>
            </label>
            <input
              id="VisibleDays"
              className={styles.input}
              type="number"
              min={1}
              max={60}
              value={form.VisibleDays}
              onChange={onNum('VisibleDays', 1, 60)}
            />
          </div>
        </div>

        {/* TyC */}
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="TyC">
              Términos y condiciones
              <span title="Términos y condiciones del parqueadero de Estudio de Moda." style={{ cursor: 'help' }}> ℹ️</span>
            </label>
            <textarea
              id="TyC"
              className={styles.textarea}
              value={form.TyC}
              onChange={onText('TyC')}
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
              <span title="A qué hora (exacta) inician y finalizan los turnos del parqueadero" style={{ cursor: 'help' }}> ℹ️</span>
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
                  min="00:00" max="11:00"
                  value={toHH(form.InicioHorarioMa_x00f1_ana)}
                  onChange={(e) => {
                    const v = clamp(parseHourText(e.target.value, form.InicioHorarioMa_x00f1_ana), 0, 11);
                    setForm(f => ({ ...f, InicioHorarioMa_x00f1_ana: v }));
                  }}
                />

                <span className={styles.sep}>–</span>

                <input
                  id="FinalManana"
                  type="time"
                  className={styles.time}
                  step={3600}
                  min="01:00" max="12:00"
                  value={toHH(form.FinalMa_x00f1_ana)}
                  onChange={(e) => {
                    const v = clamp(parseHourText(e.target.value, form.FinalMa_x00f1_ana), 1, 12);
                    setForm(f => ({ ...f, FinalMa_x00f1_ana: v }));
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
                  value={toHH(form.InicioTarde)}
                  onChange={(e) => {
                    const v = clamp(parseHourText(e.target.value, form.InicioTarde), 12, 23);
                    setForm(f => ({ ...f, InicioTarde: v }));
                  }}
                />

                <span className={styles.sep}>–</span>

                <input
                  id="FinalTarde"
                  type="time"
                  className={styles.time}
                  step={3600}
                  min="12:00" max="23:00"
                  value={toHH(form.FinalTarde)}
                  onChange={(e) => {
                    const v = clamp(parseHourText(e.target.value, form.FinalTarde), 12, 23);
                    setForm(f => ({ ...f, FinalTarde: v }));
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {horariosInvalid && (
          <div className={styles.error}>
            Revisa los horarios: el inicio debe ser menor que el fin en cada turno.
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}
        {ok && <div className={styles.ok}>{ok}</div>}

        {/* Acciones */}
        <div className={styles.actions}>
          <button
            className={styles.button}
            onClick={save}
            disabled={!canSave}
            aria-busy={saving || undefined}
            title={!canSave && horariosInvalid ? 'Corrige los horarios' : undefined}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
