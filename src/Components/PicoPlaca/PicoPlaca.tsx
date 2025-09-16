// src/Components/PicoPlaca/PicoPlaca.tsx
import * as React from 'react';
import { useGraphServices } from '../../graph/GraphServicesContext';

// ---------- Tipos que esperamos del servicio ----------
type PicoPlacaRow = {
  ID: string;        // item.id en SharePoint/Graph
  Title: string;     // día (Lunes, Martes, ... o 1..7)
  Moto: string;      // ej: "1,3,5,7,9"
  Carro: string;     // ej: "0,2,4,6,8"
};

// ---------- Helpers locales ----------
const isValidPattern = (s: string) =>
  /^\s*\d(?:\s*,\s*\d)*\s*$/.test(String(s ?? '').trim());

const dayLabel = (title: string) => {
  // Acepta "1..7" o nombres
  const t = String(title ?? '').trim();
  const map = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const n = Number(t);
  if (Number.isFinite(n) && n >= 1 && n <= 7) return map[n - 1];
  // Normaliza capitalización
  const cap = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  return map.includes(cap) ? cap : t;
};

// Pequeño switch sin dependencias
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      style={{
        padding: 6,
        borderRadius: 999,
        width: 56,
        background: checked ? '#22c55e' : '#cbd5e1',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
      }}
      title={checked ? 'Desactivar Pico y Placa' : 'Activar Pico y Placa'}
    >
      <span
        style={{
          display: 'inline-block',
          width: 22,
          height: 22,
          borderRadius: '999px',
          background: '#fff',
          transition: 'transform 150ms',
          transform: `translateX(${checked ? 28 : 0}px)`,
          boxShadow: '0 1px 4px rgba(0,0,0,.2)',
        }}
      />
    </button>
  );
}

// Simulación de notificación (cámbialo si ya tienes un hook real)
async function NotifyPicoPlaca() {
  alert('Se enviará una notificación de cambio de Pico y Placa.');
}

const PicoPlacaAdmin: React.FC = () => {
  const { picoYPlaca, settings } = useGraphServices();

  const [rows, setRows] = React.useState<PicoPlacaRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const [pypEnabled, setPypEnabled] = React.useState(false);
  const disabled = !pypEnabled;

  // --------- Carga inicial (tabla + flag Settings.PicoPlaca) ----------
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setOk(null);

        const [pp, cfg] = await Promise.all([
          picoYPlaca.getAll({ orderby: 'fields/Title asc', top: 100 }),
          settings.get('1'),
        ]);

        if (cancel) return;
        const list = (Array.isArray(pp) ? pp : []).map((x: any) => ({
          ID: String(x?.ID ?? x?.Id ?? x?.id),
          Title: String(x?.Title ?? ''),
          Moto: String(x?.Moto ?? ''),
          Carro: String(x?.Carro ?? ''),
        }));
        setRows(list);
        setPypEnabled(Boolean((cfg as any)?.PicoPlaca ?? false));
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? 'No se pudo cargar Pico y Placa.');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [picoYPlaca, settings]);

  // --------- Cambiar switch con debounce ----------
  const onToggle = React.useMemo(() => {
    let t: any;
    return (next: boolean) => {
      setPypEnabled(next);
      setOk(null);
      setError(null);
      clearTimeout(t);
      t = setTimeout(async () => {
        try {
          await settings.update('1', { PicoPlaca: next } as any);
          setOk(`Pico y Placa ${next ? 'activado' : 'desactivado'}.`);
        } catch (e: any) {
          setError(e?.message ?? 'No se pudo guardar el estado de Pico y Placa.');
          // revertir si falla
          setPypEnabled((v) => !v);
        }
      }, 400);
    };
  }, [settings]);

  // --------- Editar celdas en memoria ----------
  const editCell = (id: string, key: 'Moto' | 'Carro', value: string) => {
    if (disabled) return;
    setRows(prev => prev.map(r => (r.ID === id ? { ...r, [key]: value } : r)));
    setOk(null);
    setError(null);
  };

  // --------- Guardar una fila ----------
  const saveRow = async (row: PicoPlacaRow) => {
    if (disabled) return;
    const { Moto, Carro } = row;
    if (!isValidPattern(Moto) || !isValidPattern(Carro)) {
      setError('Formato inválido. Usa dígitos separados por comas. Ej: "6,9" o "0,2,4,6,8".');
      return;
    }
    setSavingId(row.ID);
    setOk(null);
    setError(null);
    try {
      await picoYPlaca.update(row.ID, { Moto, Carro } as any);
      setOk(`Fila ${dayLabel(row.Title)} guardada.`);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo guardar la fila.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div style={{ padding: 12 }}>Cargando Pico y Placa…</div>;

  return (
    <section style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 12 }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 10px rgba(0,0,0,.08)',
          padding: 16,
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Pico y Placa Medellín</h2>
          <Toggle checked={pypEnabled} onChange={onToggle} />
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {pypEnabled ? 'Habilitado' : 'Deshabilitado'}
          </span>
        </div>

        {error && (
          <div style={{ color: '#b91c1c', background: '#fee2e2', padding: 8, borderRadius: 8 }}>
            {error}
          </div>
        )}
        {ok && (
          <div style={{ color: '#065f46', background: '#d1fae5', padding: 8, borderRadius: 8 }}>
            {ok}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e2e8f0' }}>
                  Día
                </th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e2e8f0' }}>
                  Moto
                </th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e2e8f0' }}>
                  Carro
                </th>
                <th style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const motoBad = !isValidPattern(r.Moto);
                const carroBad = !isValidPattern(r.Carro);
                return (
                  <tr key={r.ID}>
                    <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
                      {dayLabel(r.Title)}
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
                      <input
                        value={r.Moto}
                        onChange={e => editCell(r.ID, 'Moto', e.target.value)}
                        placeholder="ej: 6,9"
                        disabled={disabled}
                        readOnly={disabled}
                        style={{
                          width: '100%',
                          borderRadius: 8,
                          border: `1px solid ${motoBad ? '#ef4444' : '#cbd5e1'}`,
                          padding: '6px 8px',
                          outline: 'none',
                        }}
                      />
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
                      <input
                        value={r.Carro}
                        onChange={e => editCell(r.ID, 'Carro', e.target.value)}
                        placeholder="ej: 0,2,4,6,8"
                        disabled={disabled}
                        readOnly={disabled}
                        style={{
                          width: '100%',
                          borderRadius: 8,
                          border: `1px solid ${carroBad ? '#ef4444' : '#cbd5e1'}`,
                          padding: '6px 8px',
                          outline: 'none',
                        }}
                      />
                    </td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      <button
                        onClick={() => saveRow(r)}
                        disabled={disabled || savingId === r.ID || motoBad || carroBad}
                        title={
                          disabled
                            ? 'Pico y Placa está deshabilitado'
                            : motoBad || carroBad
                            ? 'Formato inválido'
                            : 'Guardar cambios'
                        }
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: 'none',
                          background:
                            disabled || motoBad || carroBad
                              ? '#cbd5e1'
                              : savingId === r.ID
                              ? '#38bdf8'
                              : '#0ea5e9',
                          color: '#fff',
                          cursor:
                            disabled || motoBad || carroBad || savingId === r.ID
                              ? 'default'
                              : 'pointer',
                        }}
                      >
                        {savingId === r.ID ? 'Guardando…' : 'Guardar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {disabled && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(248,250,252,.7)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 14,
                color: '#334155',
              }}
              aria-hidden="true"
            >
              Pico y Placa está deshabilitado
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={NotifyPicoPlaca}
            disabled={disabled}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #0ea5e9',
              background: disabled ? '#f1f5f9' : '#fff',
              color: disabled ? '#94a3b8' : '#0ea5e9',
              cursor: disabled ? 'default' : 'pointer',
            }}
            title={disabled ? 'Habilita Pico y Placa para notificar' : 'Enviar notificación'}
          >
            Notificar cambio de pico y placa
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
          Formato: dígitos 0–9 separados por comas. Ejemplos: <code>6,9</code>,{' '}
          <code>0,2,4,6,8</code>.
        </p>
      </div>
    </section>
  );
};

export default PicoPlacaAdmin;