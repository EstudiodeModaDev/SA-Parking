// src/Components/Admin-Settings/AdminSettings.tsx
import * as React from 'react';
import styles from './AdminSettings.module.css';
import type { SettingsService } from '../../Services/Setting.service';

// ---------- Tipos de formulario (normalizado en la UI) ----------
type FormState = {
  VisibleDays: number;
  TyC: string;                 // Términos y Condiciones (HTML)
  InicioManana: number;        // 0..23
  FinalManana: number;         // 0..23
  InicioTarde: number;         // 0..23
  FinalTarde: number;          // 0..23
  PicoPlaca: boolean;
};

// Props: recibes el servicio desde App via contexto
type Props = {
  settingsSvc: SettingsService;
  // Opcional: id del item de settings (por defecto '1')
  settingsItemId?: string;
};

const clampHour = (n: number) => {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(23, Math.floor(n)));
};

const toHH = (n: number) => String(clampHour(n)).padStart(2, '0') + ':00';

const fromHH = (s: string | number | null | undefined, fallback = 0) => {
  if (typeof s === 'number') return clampHour(s);
  const str = String(s ?? '').trim();
  const m = /^(\d{1,2})/.exec(str);
  if (!m) return clampHour(fallback);
  return clampHour(Number(m[1]));
};

const AdminSettings: React.FC<Props> = ({ settingsSvc, settingsItemId = '1' }) => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<FormState>({
    VisibleDays: 7,
    TyC: '',
    InicioManana: 7,
    FinalManana: 12,
    InicioTarde: 12,
    FinalTarde: 18,
    PicoPlaca: false,
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
          InicioManana: fromHH(row?.InicioManana, 7),
          FinalManana: fromHH(row?.FinalManana, 12),
          InicioTarde: fromHH(row?.InicioTarde, 12),
          FinalTarde: fromHH(row?.FinalTarde, 18),
          PicoPlaca: Boolean(row?.PicoPlaca ?? false),
        };

        if (!cancel) setForm(next);
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? 'No se pudo cargar la configuración.');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [settingsSvc, settingsItemId]);

  // Handlers de cambio
  const onNum = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const n = Number(v);
    setForm(f => ({ ...f, [key]: Number.isFinite(n) ? n : (f as any)[key] }));
    setOk(null);
    setError(null);
  };

  const onBool = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [key]: e.target.checked }));
    setOk(null);
    setError(null);
  };

  const onText = (key: keyof FormState) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setOk(null);
    setError(null);
  };

  // Validaciones simples
  const horariosInvalid =
    !(form.InicioManana < form.FinalManana) ||
    !(form.InicioTarde < form.FinalTarde);

  const canSave = !loading && !saving && !horariosInvalid;

  // Guardar
  const save = async () => {
    try {
      if (!canSave) return;
      setSaving(true);
      setOk(null);
      setError(null);

      // Mapear a modelo del SP list (Graph)
      const payload: any = {
        VisibleDays: Number(form.VisibleDays) || 0,
        // En tu lista el campo es 'TerminosyCondiciones'
        TerminosyCondiciones: form.TyC,
        InicioManana: toHH(form.InicioManana),
        FinalManana: toHH(form.FinalManana),
        InicioTarde: toHH(form.InicioTarde),
        FinalTarde: toHH(form.FinalTarde),
        PicoPlaca: !!form.PicoPlaca,
      };

      await settingsSvc.update(settingsItemId, payload);
      setOk('Configuración guardada.');
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.card}>Cargando configuración…</div>;
  }

  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <h3 className={styles.title}>Ajustes de Parqueadero</h3>

        {error && <div className={styles.error}>{error}</div>}
        {ok && <div className={styles.ok}>{ok}</div>}

        <div className={styles.grid}>
          {/* VisibleDays */}
          <label className={styles.field}>
            <span>Días visibles para reservar</span>
            <input
              type="number"
              min={1}
              max={60}
              value={form.VisibleDays}
              onChange={onNum('VisibleDays')}
            />
          </label>

          {/* Pico y Placa */}
          <label className={styles.field} style={{ alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.PicoPlaca}
              onChange={onBool('PicoPlaca')}
            />
            <span>Activar Pico y Placa</span>
          </label>

          {/* Horarios */}
          <fieldset className={styles.fieldset}>
            <legend>Horario de Mañana</legend>
            <div className={styles.row}>
              <label className={styles.inlineField}>
                Inicio
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={form.InicioManana}
                  onChange={onNum('InicioManana')}
                />
              </label>
              <label className={styles.inlineField}>
                Fin
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={form.FinalManana}
                  onChange={onNum('FinalManana')}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Horario de Tarde</legend>
            <div className={styles.row}>
              <label className={styles.inlineField}>
                Inicio
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={form.InicioTarde}
                  onChange={onNum('InicioTarde')}
                />
              </label>
              <label className={styles.inlineField}>
                Fin
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={form.FinalTarde}
                  onChange={onNum('FinalTarde')}
                />
              </label>
            </div>
          </fieldset>

          {horariosInvalid && (
            <div className={styles.warn}>
              Revisa los horarios: el inicio debe ser menor que el fin en cada turno.
            </div>
          )}

          {/* TyC */}
          <label className={styles.field} style={{ gridColumn: '1 / -1' }}>
            <span>Términos y Condiciones (HTML)</span>
            <textarea
              className={styles.textarea}
              rows={10}
              value={form.TyC}
              onChange={onText('TyC')}
              placeholder="<p>Contenido HTML de Términos y Condiciones…</p>"
            />
          </label>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={save}
            disabled={!canSave}
            aria-busy={saving || undefined}
            title={!canSave && horariosInvalid ? 'Corrige los horarios' : undefined}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default AdminSettings;