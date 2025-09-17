// src/Models/Reservation.ts
export interface Reservations {
  ID: string;
  Title: string;
  NombreUsuario?: string;
  Date?: string;
  Turn?: string;

  // Lookup a la celda (ID numérico del ítem referenciado)
  SpotIdLookupId?: number | null;

  // Texto visible opcional (si lo materializas en un campo aparte)
  SpotCode?: string | null;

  VehicleType?: string;
  Status?: string;
  OData__ColorTag?: string;

  Modified?: string;
  Created?: string;
  AuthorLookupId?: number | null;
  EditorLookupId?: number | null;
}

export type ReservationUI = {
  Id: number;
  Date: string;
  Turn: string;
  SpotId: number;
  Spot: string;
  VehicleType: string;
  Status: string;
  User: string;
};

// Para Graph (items -> { id, fields })
export const mapReservationToUI = (item: any): ReservationUI => {
  const f = item?.fields ?? {};
  const dateStr = String(f.Date ?? '').slice(0, 10);

  const spotId = Number.isFinite(f.SpotIdLookupId) ? Number(f.SpotIdLookupId) : 0;
  const spotTitle = String(f.SpotCode ?? '') || (spotId ? String(spotId) : '');

  return {
    Id: Number(item?.id ?? 0),
    Date: /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : '',
    Turn: String(f.Turn ?? ''),
    SpotId: spotId,
    Spot: spotTitle,
    VehicleType: String(f.VehicleType ?? ''),
    Status: String(f.Status ?? ''),
    User: String(f.NombreUsuario ?? ''),
  };
};

export type ReserveArgs = {
  vehicle: VehicleType;
  turn: TurnType;
  dateISO: string;     // 'YYYY-MM-DD'
  userEmail: string;
};

export type ReserveResult =
  | { ok: true; message: string; reservation: any }
  | { ok: false; message: string };
