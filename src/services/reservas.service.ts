import type { reserva, createReserva, createReservaAdmin, createReservaPuntualAdmin } from "../types/reservas";
import { api } from "./api";

export const reservasService = {
    getReserva : () => api<Array<reserva>>('/reserva/'),
    getReservasHistory : () => api<Array<reserva>>('/reserva/history'),
    cancelReserva : (id:string) => api<reserva>(`/reserva/cancelReserv/${id}`, { method: "PUT" }),
    createReservaQuick : (data : createReserva) => api<reserva>("/reserva/createQuickUsr", { method: "POST", body: JSON.stringify(data) }),
    createReservaAdminQuick : (data : createReservaAdmin) => api<reserva>("/reserva/createQuickAdm", { method: "POST", body: JSON.stringify(data) }),
    createReservaAdminPuntual : (data : createReservaPuntualAdmin) => api<reserva>("/reserva/createPuntAdm", { method: "POST", body: JSON.stringify(data) })
}