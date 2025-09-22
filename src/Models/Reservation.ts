export interface Reservations {
  ID: string;
  Title: string;
  NombreUsuario?: string;
  Date?: string;
  Turn?: string;
  codigo?: string;

  // Lookup a la celda
  SpotIdLookupId?: number | null;
  SpotCode?: string | null; // opcional (texto visible)

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
  User: string,
  created: string,
  codigo?: string
};

export const mapReservationToUI = (r: any): ReservationUI => {
  const dateStr = String(r.Date ?? r.date ?? r.Fecha ?? r.fecha ?? '').slice(0, 10);

  const spotId = Number(
    r['SpotId#Id'] ??
    r.SpotId?.Id ??
    r.SpotId ??
    0
  );

  const spotTitle = String(
    r.SpotId?.Value      // si el lookup “muestra” Title, aquí vendrá el texto visible
    ?? r['SpotId/Title'] // fallback si usas $expand
    ?? r.Spot            // algún aplanado
    ?? (spotId ? String(spotId) : '')
  );



  return {
    Id: Number(r.ID ?? r.Id ?? r.id ?? 0),
    Date: /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : '',
    Turn: String(r.Turn ?? r.Turno ?? r.turn ?? ''),
    SpotId: spotId,
    Spot: spotTitle,
    VehicleType: String(r.VehicleType ?? r.Vehiculo ?? r.vehicleType ?? ''),
    Status: String(r.Status ?? r.Estado ?? r.status ?? ''),
    User: String(r.NombreUsuario),
    created: String(r.Created ?? r.created ?? ''),
  };
};

import type { TurnType, VehicleType } from "./shared";


export type ReserveArgs = {
  vehicle: VehicleType;
  turn: TurnType;        // 'Dia' => valida ambos horarios
  dateISO: string;       // 'YYYY-MM-DD'
  userEmail: string;
};

export type ReserveResult =
    |{ ok: true; message: string; reservation: any }
    |{ ok: false; message: string };



