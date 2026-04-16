export type VehicleType = 'Carro' | 'Moto' | 'Otro';
export type TurnType = 'Manana' | 'Tarde' | 'Día completo';
export type Worker = {
    id?: string | number,
    displayName: string;
    mail?: string;
    jobTitle?: string;
};