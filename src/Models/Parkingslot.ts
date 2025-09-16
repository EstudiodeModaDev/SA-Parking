export type ParkingSlot = {
  ID: string;            
  Title?: string;        // Codigo
  TipoCelda?: 'Carro' | 'Moto' | string;       
  Itinerancia?: 'Directivo' | 'Empleado Fijo' | 'Empleado Itinerante';
  Activa?: string;
};