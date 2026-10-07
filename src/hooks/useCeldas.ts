import { useMsal } from "@azure/msal-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { celdas } from "../services/celdas.service"
import type { celda, createCelda } from "../types/celdas"

export function useCeldas(){
    const {accounts} = useMsal()
    
    return useQuery({
        queryKey : [ "celdas", "get"], 
        queryFn : celdas.getCeldas,
        enabled : accounts.length>0,
        staleTime : 1000 * 60 * 30 // se pide cada 30 min
    })
}

export function useActivateCelda(){
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn : (id : string) => celdas.activateCelda(id),
        mutationKey : [ 'celdas', "activate"],
        onSuccess : () => queryClient.invalidateQueries({ queryKey : ['celdas', 'get'] })
    })
}

export function useDeactivateCelda(){
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn : (id : string) => celdas.deactivateCelda(id),
        mutationKey : [ 'celdas', "deactivate"],
        onSuccess : () => queryClient.invalidateQueries({ queryKey : ['celdas', 'get'] })
    })
}

export function useEditCelda(){
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn : ( data:celda) => celdas.editCelda(data),
        mutationKey : [ 'celdas', "edit"],
        onSuccess : () => queryClient.invalidateQueries({ queryKey : ['celdas', 'get'] })
    })
}

export function useCreateCelda(){
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn : (data:createCelda) => celdas.createCelda(data),
        mutationKey : [ 'celdas', "create"],
        onSuccess : () => queryClient.invalidateQueries({ queryKey : ['celdas', 'get'] })
    })
}