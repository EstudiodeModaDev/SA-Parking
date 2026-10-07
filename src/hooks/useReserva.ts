import { useMsal } from "@azure/msal-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reservasService } from "../services/reservas.service";
import type { Vista } from "./useVistaReservas";
import type { createReserva, createReservaAdmin, createReservaPuntualAdmin } from "../types/reservas";

export function useReservas(vista : Vista = "Proximas"){
    const {accounts} = useMsal()

    return useQuery({
        queryKey : ['reserva', vista], // al cambiar la vista cambia la key y se hace otra peticion
        queryFn : vista === "Historial" ? reservasService.getReservasHistory : reservasService.getReserva,
        enabled : accounts.length>0,
        staleTime : 0 // siempre se vuelve a pedir al cambiar de vista
    })
}

export function useCancelReserva(){
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn : (id : string) => reservasService.cancelReserva(id),
        mutationKey : ['reserva', 'cancel'],
        // invalida todas las listas ['reserva', ...]: la cancelada sale de proximas y entra a historial
        onSuccess : () => queryClient.invalidateQueries({ queryKey : ['reserva'] })
    })
}

export function useCreateReserva(){
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn : (data : createReserva) => reservasService.createReservaQuick(data),
        mutationKey : ['reserva', 'create'],
        // invalida todas las listas ['reserva', ...]: y agrega el nuevo registro
        onSuccess : () => queryClient.invalidateQueries({ queryKey : ['reserva'] })
    })
}

export function useCreateReservaAdmin(){
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn : (data : createReservaAdmin) => reservasService.createReservaAdminQuick(data),
        mutationKey : ['reserva', 'admin', 'quick'],
        // invalida todas las listas ['reserva', ...]: la cancelada sale de proximas y entra a historial
        onSuccess : () => queryClient.invalidateQueries({ queryKey : ['reserva'] })
    })
}

export function useCreateReservaPuntualAdmin(){
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn : (data : createReservaPuntualAdmin) => reservasService.createReservaAdminPuntual(data),
        mutationKey : ['reserva', 'admin', 'puntual'],
        // refresca las reservas y la ocupacion de las celdas
        onSuccess : () => {
            queryClient.invalidateQueries({ queryKey : ['reserva'] })
            queryClient.invalidateQueries({ queryKey : ['celdas', 'get'] })
        }
    })
}
