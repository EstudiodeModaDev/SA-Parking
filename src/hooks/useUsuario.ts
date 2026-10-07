import {useQuery} from "@tanstack/react-query"
import { useMsal } from "@azure/msal-react"
import { usuarioService } from "../services/usuarios.service"

export function useInfoMe() {
    const {accounts} = useMsal()

    return useQuery({
        queryKey: ["usuario", "infoMe"],
        queryFn: usuarioService.getInfoMe,
        enabled : accounts.length > 0, // no pedir nada si no hay una sesion activa
        staleTime: 1000*60*30 // dura 30 min para volver a pedirla 
    })
}

export function useRol() {
    const {accounts} = useMsal()

    return useQuery({
        queryKey: ["usuario","rol"],
        queryFn:  usuarioService.getRole,
        enabled : accounts.length > 0,
        staleTime : Infinity,
        retry: false
    })
}

export function useUsuarioActual(){
    const info = useInfoMe()
    const rol = useRol()

    return {
        info : info.data,
        rol : rol.data,
        isLoading : info.isLoading || rol.isLoading,
        isError : info.isError || rol.isError
    }
}