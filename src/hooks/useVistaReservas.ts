import { useState } from "react";

export type Vista = "Proximas" | "Historial";

export function useVistaReservas(vistaInicial:Vista = 'Proximas'){
    const[ vista, setVista] = useState<Vista>(vistaInicial);

    const esHistorial = vista === "Historial"

    const mostrarProximas = () => setVista("Proximas")
    const mostrarHistorial = () => setVista("Historial")

    return { vista, esHistorial, mostrarHistorial, mostrarProximas}
}