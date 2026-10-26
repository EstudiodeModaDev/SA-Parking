import { useMsal } from "@azure/msal-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { colaboradoresFijosService, registroVeh, usuariosApp } from "../services/colaboradores.service"
import type { colaboradoresFijos, registroVehicular } from "../types/colaboradores"

export function useColaboradores(){
    const {accounts} = useMsal()

    return useQuery({
        queryKey : [ "colaboradores", "fijos"], 
        queryFn : colaboradoresFijosService.getColaboradores,
        enabled : accounts.length>0,
        staleTime : 1000 * 60 * 30 // se pide cada 30 min
    })
}

export function useCreateColaborador(){
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn : (data : Omit<colaboradoresFijos, "ID">) => colaboradoresFijosService.createFijo(data),
        mutationKey : [ 'colaboradores', "fijos", "create"],
        onSuccess : () => queryClient.invalidateQueries({ queryKey : ['colaboradores', 'fijos'] })
    })
}

export function useDeleteColaborador(){
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn : (id : string) => colaboradoresFijosService.deleteFijo(id),
        mutationKey : [ 'colaboradores', "fijos"],
        onSuccess : () => queryClient.invalidateQueries({ queryKey : ['colaboradores', 'fijos'] })
    })
}

export function useUserMailList(){
    const {accounts} = useMsal()

    return useQuery({
        queryKey : ["colaboradores", "mail"], 
        queryFn : usuariosApp.getMailList,
        enabled : accounts.length>0,
        staleTime : 1000 * 60 * 30 // se pide cada 30 min
    })
}

export function useRemoveFromMail(){
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn : (mail : string) => usuariosApp.deleteMail(mail),
        mutationKey : ['colaboradores', "mail", "create"],
        onSuccess : () => queryClient.invalidateQueries({ queryKey : ['colaboradores', 'mail'] })
    })
}

export function useAddToMail(){
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn : (mail : string) => usuariosApp.addMail(mail),
        mutationKey : ['colaboradores', "mail", "delete"],
        onSuccess : () => queryClient.invalidateQueries({ queryKey : ['colaboradores', 'mail'] })
    })
}

export function useGetVehiculos(){
    const {accounts} = useMsal()

    return useQuery({
        queryKey : ["colaboradores", "registro"], 
        queryFn : registroVeh.getRegistro,
        enabled : accounts.length>0,
        staleTime : 1000 * 60 * 30 // se pide cada 30 min
    })

}
export function useCreateVehiculo(){
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn : (data : Omit<registroVehicular, "ID">) => registroVeh.createRegistro(data),
        mutationKey : ['colaboradores', "registro", "create"],
        onSuccess : () => queryClient.invalidateQueries({ queryKey : ['colaboradores', 'registro'] })
    })
}
export function useDeleteVehiculo(){
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn : (id : string) => registroVeh.deleteRegistro(id),
        mutationKey : ['colaboradores', "registro", "delete"],
        onSuccess : () => queryClient.invalidateQueries({ queryKey : ['colaboradores', 'registro'] })
    })
}