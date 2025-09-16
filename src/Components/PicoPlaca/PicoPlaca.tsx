// src/components/PicoPlaca/PicoPlacaAdmin.tsx
import * as React from 'react';
import styles from './PicoPlacaAdmin.module.css';
import ToggleSwitch from '../ToggleSwitch/ToggleSwitch';

import { useGraphServices } from '../../graph/GraphServicesContext';
import type { Settings } from '../../Services/Setting.service'
import { dayLabel, isValidPattern } from '../../Hooks/utils';

// Modelo local para filas de Pico y Placa (lo que muestra la UI)
type PicoPlacaRow = {
  ID: string;
  Title: string; // 1..5 (lunes..viernes)
  Moto: string;
  Carro: string;
};

const DEFAULT_SETTINGS = {
  VisibleDays: 7,
  TyC: '',
  InicioManana: '07:00',
  FinalManana: '12:00',
  InicioTarde: '12:00',
  FinalTarde: '18:00',
  PicoPlaca: false,
} as const;

const PicoPlacaAdmin: React.FC = () => {
  const { picoYPlaca: ppSvc, settings: settingsSvc } = useGraphServices();

  const [rows, setRows] = React.useState<PicoPlacaRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  // settings
  const [settingsItem, setSettingsItem] = React.useState<Settings | null>(null);
  const [picoPlacaEnabled, setPicoPlacaEnabled] = React.useState<boolean>(false);

  // ======= Carga inicial =======
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Cargar filas de pico y placa
        const pp = await ppSvc.getAll();
        if (!cancel) {
          setRows(
            (pp as any[]).map(i => ({
              ID: String(i.ID),
              Title: String(i.Title ?? ''),
              Moto: String(i.Moto ?? ''),
              Carro: String(i.Carro ?? ''),
            }))
            .sort((a, b) => Number(a.Title) - Number(b.Title))
          );
        }

        // 2) Cargar/crear settings (primer registro)
        const list = await settingsSvc.getAll({ top: 1 });
        let s: Settings;
        if (!list.length) {
          s = await settingsSvc.create({
            VisibleDays: DEFAULT_SETTINGS.VisibleDays,
            TerminosyCondiciones: DEFAULT_SETTINGS.TyC,
            InicioManana: DEFAULT_SETTINGS.InicioManana,
            FinalManana: DEFAULT_SETTINGS.FinalManana,
            InicioTarde: DEFAULT_SETTINGS.InicioTarde,
            FinalTarde: DEFAULT_SETTINGS.FinalTarde,
            PicoPlaca: DEFAULT_SETTINGS.PicoPlaca,
          });
        } else {
          s = list[0];
        }
        if (!cancel) {
          setSettingsItem(s);
          setPicoPlacaEnabled(!!s.PicoPlaca);
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? 'No se pudieron cargar los datos.');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [ppSvc, settingsSvc]);

  // ======= Cambiar switch (debounced save) =======
  const onTogglePicoPlaca = React.useMemo(() => {
    let t: any;
    return (next: boolean) => {
      setPicoPlacaEnabled(next);
      setOk(null);
      setError(null);
      if (!settingsItem) return;

      clearTimeout(t);
      t = setTimeout(async () => {
        try {
          const updated = await settingsSvc.update(settingsItem.ID, { PicoPlaca: next });
          setSettingsItem(updated);
          setOk(`Pico y Placa ${next ? 'activado' : 'desactivado'}.`);
        } catch (e: any) {
          setError(e?.message ?? 'No se pudo guardar el ajuste Pico y Placa.');
        }
      }, 400);
    };
  }, [settingsItem, settingsSvc]);

  // ======= Editar inputs de una fila (solo UI) =======
  const editCell = (id: string, key: 'Moto' | 'Carro', value: string) => {
    if (!picoPlacaEnabled) return;
    setRows(prev => prev.map(r => (r.ID === id ? { ...r, [key]: value } : r)));
    setOk(null);
    setError(null);
  };

  // ======= Guardar fila =======
  const saveRow = async (row: PicoPlacaRow) => {
    if (!picoPlacaEnabled) return;

    const { Moto, Carro } = row;
    if (!isValidPattern(Moto) || !isValidPattern(Carro)) {
      setError('Formato inválido. Usa dígitos separados por comas. Ej: "6,9" o "0,2,4,6,8".');
      return;
    }

    setSavingId(row.ID);
    setOk(null);
    setError(null);
    try {
      await ppSvc.update(row.ID, { Moto, Carro } as any);
      setRows(prev => prev.map(r => (r.ID === row.ID ? { ...r, Moto, Carro } : r)));
      setOk(`Fila ${row.Title} guardada.`);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo guardar la fila.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div>Cargando Pico y Placa…</div>;

  const ppDisabled = !picoPlacaEnabled;

  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <h2 className={styles.title}>Pico y Placa Medellín</h2>

        <div className={styles.switchRow}>
          <ToggleSwitch checked={picoPlacaEnabled} onChange={onTogglePicoPlaca} />
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {ok && <div className={styles.ok}>{ok}</div>}

        <div
          className={`${styles.tableWrap} ${ppDisabled ? styles.isDisabled : ''}`}
          aria-disabled={ppDisabled}
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Día</th>
                <th>Moto</th>
                <th>Carro</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const motoBad = !isValidPattern(r.Moto);
                const carroBad = !isValidPattern(r.Carro);
                return (
                  <tr key={r.ID}>
                    <td className={styles.day}>{dayLabel(r.Title)}</td>
                    <td>
                      <input
                        className={`${styles.input} ${motoBad ? styles.bad : ''}`}
                        value={r.Moto}
                        onChange={e => editCell(r.ID, 'Moto', e.target.value)}
                        placeholder="ej: 6,9"
                        disabled={ppDisabled}
                        readOnly={ppDisabled}
                        tabIndex={ppDisabled ? -1 : 0}
                      />
                    </td>
                    <td>
                      <input
                        className={`${styles.input} ${carroBad ? styles.bad : ''}`}
                        value={r.Carro}
                        onChange={e => editCell(r.ID, 'Carro', e.target.value)}
                        placeholder="ej: 6,9"
                        disabled={ppDisabled}
                        readOnly={ppDisabled}
                        tabIndex={ppDisabled ? -1 : 0}
                      />
                    </td>
                    <td>
                      <button
                        className={styles.button}
                        onClick={() => saveRow(r)}
                        disabled={ppDisabled || savingId === r.ID || motoBad || carroBad}
                        title={ppDisabled ? 'Pico y Placa está deshabilitado' : 'Guardar cambios de esta fila'}
                      >
                        {savingId === r.ID ? 'Guardando…' : 'Guardar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {ppDisabled && (
            <div className={styles.overlayMsg}>
              Pico y Placa está deshabilitado
            </div>
          )}
        </div>

        <p className={styles.hint}>
          Formato: dígitos 0–9 separados por comas. Ejemplos: <code>6,9</code>, <code>0,2,4,6,8</code>.
        </p>

        {/* Botón de notificación eliminado a petición: sin Notify */}
      </div>
    </section>
  );
};

export default PicoPlacaAdmin;
