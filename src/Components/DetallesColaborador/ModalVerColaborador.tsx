import * as React from 'react';
import styles from './modal.module.css';
import type { Props } from '../../Models/Modals';



const ModalVerColaborador: React.FC<Props> = ({ isOpen, onClose, collaborator }) => {
  if (!isOpen || !collaborator) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2 className={styles.title}>Detalle del colaborador</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className={styles.body}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <div className={styles.label}>Nombre</div>
              <div className={styles.value}>{collaborator.nombre}</div>
            </div>

            <div>
              <div className={styles.label}>Correo electrónico</div>
              <div className={styles.value}>{collaborator.correo}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className={styles.label}>Tipo de vehículo</div>
                <div className={styles.value}>
                  <span className="pill">{collaborator.tipoVehiculo}</span>
                </div>
              </div>
              <div>
                <div className={styles.label}>Placa</div>
                <div className={styles.value}>{collaborator.placa || '-'}</div>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalVerColaborador;
