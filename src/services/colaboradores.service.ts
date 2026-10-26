import{ type usermailList,type colaboradoresFijos, type registroVehicular } from "../types/colaboradores";
import { api } from "./api";

export const colaboradoresFijosService = {
    getColaboradores : () => api<Array<colaboradoresFijos>>("/colaboradores/fijos"),
    createFijo : (data: Omit<colaboradoresFijos, "ID">) => api<colaboradoresFijos>("/colaboradores/createFijo", { method: "POST", body: JSON.stringify(data) }),
    deleteFijo : (id:string) => api(`/colaboradores/deleteFijo/${id}`, { method: "DELETE" })
}

export const usuariosApp = {
    getMailList: () => api<Array<usermailList>>("/colaboradores/mailList"),
    deleteMail : (email:string) => api(`/colaboradores/remove?email=${email}`, { method: "DELETE" }),
    addMail : (email:string ) => api(`/colaboradores/addUser?email=${email}`, {method : "POST"})
}

export const registroVeh = {
    getRegistro : () => api<Array<registroVehicular>>("/registro-vehicular"),
    createRegistro : (data:Omit<registroVehicular, "ID">) => api<Array<registroVehicular>>("/registro-vehicular/create", {method:"POST", body: JSON.stringify(data)}),
    deleteRegistro : (id:string) => api <Array<registroVehicular>>(`/registro-vehicular/delete/${id}`, {method : "DELETE"}),
}