// src/components/Modals/Modal.tsx
import * as React from 'react';
import styles from './modal.module.css';
import type { reserveModal } from '../../Models/ModalModel';

// ⬇️ usa los servicios Graph ya inyectados en la app
import { useGraphServices } from '../../graph/GraphServicesContext';

type ModalProps = reserveModal & {
  showTerms?: boolean;
  settingsItemId?: string;
  termsField?: string; // nombre del campo HTML en tu lista Settings (p.ej. "TerminosyCondiciones")
};

export const Modal: React.FC<ModalProps> = ({
  open,
  title = 'Confirmar',
  children,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onClose,

  showTerms = false,
  settingsItemId = '1',
  termsField = 'TerminosyCondiciones',
}) => {
  const { settings } = useGraphServices(); // <- servicio Graph para Settings

  const [termsHtml, setTermsHtml] = React.useState<string>('');
  const [termsLoading, setTermsLoading] = React.useState<boolean>(false);
  const [termsError, setTermsError] = React.useState<string | null>(null);
  const [accepted, setAccepted] = React.useState<boolean>(false);

  // Reset al abrir
  React.useEffect(() => {
    if (!open) return;
    setAccepted(false);
    setTermsHtml('');
    setTermsError(null);
  }, [open]);

  // Cargar TyC desde Settings (Graph)
  React.useEffect(() => {
    if (!open || !showTerms) return;
    let cancel = false;

    (async () => {
      try {
        setTermsLoading(true);
        setTermsError(null);

        // get() de tu Settings.service (Graph) ya devuelve el modelo mapeado
        // con campos como: TerminosyCondiciones, InicioManana, etc.
        const rec = await settings.get(String(settingsItemId));

        // lectura flexible: intenta por termsField y, si no, prueba TerminosyCondiciones
        const raw = (rec as any)?.[termsField] ?? (rec as any)?.TerminosyCondiciones ?? '';

        if (cancel) return;

        if (!raw || typeof raw !== 'string') {
          throw new Error(`No se encontró contenido en Settings.${termsField}`);
        }
        setTermsHtml(raw);
      } catch (e: any) {
        if (!cancel) setTermsError(e?.message ?? 'Error al cargar Términos y Condiciones.');
      } finally {
        if (!cancel) setTermsLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [open, showTerms, settingsItemId, termsField, settings]);

  if (!open) return null;

  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const canConfirm = !showTerms || (accepted && !termsLoading && !termsError);

  return (
    <div
      className={styles.backdrop}
      onMouseDown={onBackdrop}
      aria-modal="true"
      role="dialog"
      aria-label={title}
    >
      <div className={styles.modal} role="document">
        <header className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.close} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          {children}

          {showTerms && (
            <section style={{ marginTop: 12 }}>
              <h4 style={{ margin: '8px 0' }}>Términos y Condiciones</h4>

              {termsLoading && (
                <div className="muted" style={{ fontSize: 12 }}>
                  Cargando Términos y Condiciones…
                </div>
              )}
              {termsError && (
                <div style={{ color: 'crimson', fontSize: 12 }}>{termsError}</div>
              )}

              {!termsLoading && !termsError && (
                <div
                  className={styles.termsBox}
                  // El contenido proviene de tu lista Settings (HTML almacenado)
                  dangerouslySetInnerHTML={{ __html: termsHtml }}
                />
              )}

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 10,
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  disabled={termsLoading || !!termsError}
                />
                Acepto los Términos y Condiciones
              </label>
            </section>
          )}
        </div>

        <footer className={styles.footer}>
          <button className={styles.btnGhost} onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={styles.btnPrimary}
            onClick={onConfirm}
            disabled={!canConfirm}
            title={!canConfirm ? 'Debes aceptar los Términos y Condiciones' : undefined}
          >
            {confirmText}
          </button>
        </footer>
      </div>
    </div>
  );
};
