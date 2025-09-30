export type RegistroVehicularSP = {
  id?: string | number;
  Title: string;
  CorreoReporte: string;
  TipoVeh: string;
  PlacaVeh: string;
  Cedula: string
};

export type RegistroVehicularMail = {
  correo: string;            // destinatario
  nombre: string;            // nombre del colaborador
  tipoVehiculo: string;      // "Carro" | "Moto" | etc.
  placa: string;             // p.ej. ABC123
  cedula: string;            // documento
  cc?: string[];             // opcional: copias
  solicitanteNombre?: string;// opcional: quien solicita (para firma)
  solicitanteCorreo?: string;// opcional
};
