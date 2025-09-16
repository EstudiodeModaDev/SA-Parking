import type { TurnType } from "./shared";

export type Filtros = {
  desde: string;        
  hasta: string;          
  persona: string;        
  tipoVehiculo: '' | 'Carro' | 'Moto';
};

export type Row = {
  date: string;       
  turn: TurnType;
  tipo: TurnType;
  activos: number;
  ocupados: number;   
  reservas: number;   
  aforo: number;  
};

export type ReservaUI = {
  Id: number;
  Fecha: string;          // yyyy-mm-dd
  Turno: string;          // Manana | Tarde | Dia
  Celda: string;          // Title de la celda
  SpotId: number;
  TipoVehiculo: 'Carro' | 'Moto' | string;
  Usuario: string;        // Title o correo
  Estado: string;         // Activa/Cancelada/etc.
};