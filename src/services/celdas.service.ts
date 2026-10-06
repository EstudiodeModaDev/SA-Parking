import type { celda, createCelda } from "../types/celdas"
import { api } from "./api"


export const celdas = {
    getCeldas : () => api<Array<celda>>("/ParkingSlots/getSlots"),
    createCelda : (data : createCelda ) => api<Array<celda>>("/parkingSlots/createSlot", {method : "POST", body: JSON.stringify(data)}),
    // Solo se envian columnas de la lista: ID va en la URL y Ocupacion es calculada
    editCelda : ({ ID, Title, TipoCelda, Itinerancia, Activa }: celda) => api<Array<celda>>(`/parkingSlots/editSlot/${ID}`, {method:"PUT", body:JSON.stringify({ Title, TipoCelda, Itinerancia, Activa })}),
    deactivateCelda : (id:string) => api <Array<celda>>(`/parkingSlots/inactiveSlot/${id}`, {method : "PUT"}),
    activateCelda : (id:string) => api<Array<celda>>(`/parkingSlots/activeSlot/${id}`, {method:"PUT"})
}