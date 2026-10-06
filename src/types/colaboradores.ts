import type { VehicleType } from "./reservas"

export interface colaboradoresFijos{
    ID : string
    Title : string //nombre
    Correo : string
    TipoVehiculo : VehicleType
    Placa : string
    CodigoCelda : string
    SpotAsignado : string //codigo real de la celda
}

export interface usermailList{
    id : string 
    displayName : string
    jobTitle : string
    mail : string
}

export interface registroVehicular{
    ID : string
    Title : string //nombre
    Cedula : string
    TipoVeh : VehicleType
    PlacaVeh : string
    CorreoReporte : string
}