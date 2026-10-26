import type { VehicleType } from "./reservas"

export type Itinerancia = "Empleado Itinerante" | "Directivo" | "Empleado Fijo"
export type Activa = "Activa" | "Inactiva"
export type ocupacion = {
    Manana : boolean
    Tarde : boolean
}
export interface celda {
    ID : string
    Title : string
    TipoCelda : VehicleType
    Itinerancia : Itinerancia
    Activa : Activa
    Ocupacion : ocupacion
}
// Solo columnas de la lista: ID y Ocupacion no existen en SharePoint y Graph responde 400
export type createCelda = Omit<celda, "ID" | "Ocupacion">;