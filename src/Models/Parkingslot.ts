export type ParkingSlot = {
  ID: string;            
  Title?: string;        // Codigo
  TipoCelda?: 'Carro' | 'Moto' | string;       
  Itinerancia?: string;
  Activa?: string;
};