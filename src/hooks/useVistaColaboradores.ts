import { useState } from "react";

export type vista = "Fijos"| "UsuariosApp" | "Registrovehicular"

export function useVistaColaboradores( vistaInicial: vista = "Fijos"){
    const [vista , setVista ] = useState<vista>(vistaInicial)

    const esFijos = vista === "Fijos"
    const esRegistro = vista === "Registrovehicular"
    const esUsuarios = vista === "UsuariosApp"

    const mostrarFijos = () => setVista("Fijos")
    const mostrarUsuarios = () => setVista("UsuariosApp")
    const mostrarRegistro = () => setVista("Registrovehicular")

    return {esFijos, esUsuarios, esRegistro, mostrarFijos, mostrarRegistro, mostrarUsuarios}
}