export type VehicleType = "Carro" | "Moto"
export type Status = "Cancelada" | "Activa" | "Terminada"
export type Turno ="Manana" | "Tarde" | "Día completo"
export interface reserva{
    ID :string
    Title : string
    NombreUsuario : string
    Turn: Turno
    SpotId : string
    Status : Status
    VehicleType :VehicleType
    Date: Date
    Codigo : string
    Notify:string
}

export interface createReserva{
    Turn : string
    VehicleType : string
    Date : string
    Codigo : string
    Notify : boolean
}
// Reserva creada por un administrador a nombre de un tercero
export interface createReservaAdmin extends createReserva{
    NombreUsuario : string
    Title : string
}
// Reserva de un administrador sobre una celda especifica (SpotId = Title de la celda)
export interface createReservaPuntualAdmin extends createReservaAdmin{
    SpotId : string
}
