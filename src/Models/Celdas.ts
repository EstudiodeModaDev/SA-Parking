export type Assignee = {
  id: number;          
  name: string;
  email?: string;
  slotAsignado: number | null; 
} | null;

import type { VehicleType } from "./shared"

export type SlotUI = {
  Id: number;
  Title: string;
  TipoCelda: 'Carro' | 'Moto' | string;
  Activa: 'Activa' | 'No Activa' | string;
  Raw: any; // por si necesitas más campos luego
  Itinerancia: string
};

export type TurnFlags = { Manana?: boolean; Tarde?: boolean };

export type CreateForm = { Title: string; TipoCelda: VehicleType; Activa: 'Activa' | 'Inactiva'; Itinerancia: 'Empleado Fijo' | 'Empleado Itinerante' | 'Directivo' };

export type Mode = 'fijar' | 'reserva'

export const mapSlotToUI = (r: any): SlotUI => ({
    Id: Number(r.ID ?? r.Id ?? r.id ?? 0),
    Title: String(r.Title ?? r.title ?? ''),
    TipoCelda: (r.TipoCelda ?? r.tipoCelda ?? '-') as any,
    Activa: (r.Activa ?? r.estado ?? '-') as any,
    Raw: r,
    Itinerancia: r.Itinerancia
  });