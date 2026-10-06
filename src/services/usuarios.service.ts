import type { Rol, InfoMe } from "../types/usuario";
import { api } from "./api";


export const usuarioService = {
    getInfoMe: () => api<InfoMe>("/usuarios/infoMe"),
    getRole : () => api<Rol>("/usuarios/getRole")
}