import type { VehicleType } from "./shared";


export type Collaborator = {
  id?: string | number;
  nombre: string;
  correo: string;
  tipoVehiculo: VehicleType;
  placa: string;
  CodigoCelda?: string
};

export type NewCollaborator = {
  nombre: string;
  correo: string;
  tipoVehiculo: VehicleType;
  placa: string;
  IdSpot?: string,
  codigoCelda?: string
};