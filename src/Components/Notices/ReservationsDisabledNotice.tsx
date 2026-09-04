import * as React from 'react';

export const RESERVATIONS_DISABLED = true;
export const RESERVATIONS_DISABLED_SINCE = '4 de septiembre';

type Props = { compact?: boolean };

const ReservationsDisabledNotice: React.FC<Props> = ({ compact = false }) => (
  <div className="noticeBanner">
    <div className="noticeIcon" aria-hidden>🚧</div>
    <div className="noticeText">
      <h2 className="noticeTitle">Reservas nuevas deshabilitadas temporalmente por cambio de sede</h2>
      <p className="noticeMessage">
        Desde hoy <strong>{RESERVATIONS_DISABLED_SINCE}</strong> y hasta nuevo aviso, la app no
        permite crear reservas nuevas
        {compact ? '.' : '.'}
      </p>
    </div>
  </div>
);

export default ReservationsDisabledNotice;
