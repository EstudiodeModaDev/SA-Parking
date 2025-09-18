import * as React from 'react';
import styles from './AdminSettings.module.css';
import type { SettingsService } from '../../Services/Setting.service';

// ---------- Tipos de formulario (normalizado en la UI) ----------
type FormState = {
  VisibleDays: number;
  TyC: string;                 // Términos y Condiciones (HTML)
  InicioHorarioMa_x00f1_ana: number;        // 0..23
  FinalMa_x00f1_ana: number;         // 0..23
  InicioTarde: number;         // 0..23
  FinalTarde: number;          // 0..23
};

// Props: recibes el servicio desde App via contexto
type Props = {
  settingsSvc: SettingsService;
  // Opcional: id del item de settings (por defecto '1')
  settingsItemId?: string;
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));

const clampHour = (n: number) => clamp(Math.floor(n), 0, 23);

const toHH = (n: number) => String(clampHour(n)).padStart(2, '0') + ':00';

const fromHH = (s: string | number | null | undefined, fallback = 0) => {
  if (typeof s === 'number') return clampHour(s);
  const str = String(s ?? '').trim();
  const [hh] = str.split(':');
  const n = Number(hh);
  return Number.isFinite(n) ? clampHour(n) : clampHour(fallback);
};

const AdminSettings: React.FC<Props> = ({ settingsSvc, settingsItemId = '1' }) => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<FormState>({
    VisibleDays: 7,
    TyC: '',
    InicioHorarioMa_x00f1_ana: 7,
    FinalMa_x00f1_ana: 12,
    InicioTarde: 12,
    FinalTarde: 18,
  });

  // Cargar settings (item '1')
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setOk(null);

        const row: any = await settingsSvc.get(settingsItemId);

        const next: FormState = {
          VisibleDays: Number(row?.VisibleDays ?? 7),
          TyC: String(row?.TerminosyCondiciones ?? row?.TyC ?? ''),
          InicioHorarioMa_x00f1_ana: fromHH(row?.InicioHorarioMa_x00f1_ana, 7),
          FinalMa_x00f1_ana: fromHH(row?.FinalMa_x00f1_ana, 12),
          InicioTarde: fromHH(row?.InicioTarde, 12),
          FinalTarde: fromHH(row?.FinalTarde, 18),
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

  // Handlers de cambio
  const onNum = (key: keyof FormState, min = 1, max = 60) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = Number(e.target.value);
      setForm(f => ({ ...f, [key]: clamp(n, min, max) as any }));
      setOk(null);
      setError(null);
    };

  const onText = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }));
      setOk(null);
      setError(null);
    };

  // Validaciones simples
  const horariosInvalid =
    !(form.InicioHorarioMa_x00f1_ana < form.FinalMa_x00f1_ana) ||
    !(form.InicioTarde < form.FinalTarde);

  const canSave = !loading && !saving && !horariosInvalid;

  // Guardar
  const save = async () => {
    try {
      if (!canSave) return;
      setSaving(true);
      setOk(null);
      setError(null);

      const payload: any = {
        VisibleDays: Number(form.VisibleDays) || 0,
        // En tu lista el campo es 'TerminosyCondiciones'
        TerminosyCondiciones: form.TyC,
        InicioHorarioMa_x00f1_ana: toHH(form.InicioHorarioMa_x00f1_ana),
        FinalMa_x00f1_ana: toHH(form.FinalMa_x00f1_ana),
        InicioTarde: toHH(form.InicioTarde),
        FinalTarde: toHH(form.FinalTarde),
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
                  value={toHH(form.InicioHorarioMa_x00f1_ana)}
                  onChange={(e) => {
                    const v = clamp(fromHH(e.target.value, form.InicioHorarioMa_x00f1_ana), 1, 12);
                    setForm(f => ({ ...f, InicioHorarioMa_x00f1_ana: v }));
                  }}
                />

                <span className={styles.sep}>–</span>

                <input
                  id="FinalManana"
                  type="time"
                  className={styles.time}
                  step={3600}
                  value={toHH(form.FinalMa_x00f1_ana)}
                  onChange={(e) => {
                    const v = clamp(fromHH(e.target.value, form.FinalMa_x00f1_ana), 1, 12);
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
                    const v = clamp(fromHH(e.target.value, form.InicioTarde), 12, 23);
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
                    const v = clamp(fromHH(e.target.value, form.FinalTarde), 12, 23);
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



