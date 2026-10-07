
import { Navigate } from "react-router-dom";
import PantallaCarga from "../components/pantallaCarga.component";
import { useRol } from "../hooks/useUsuario";

function RedirectByRole(){
    const { isPending, isError, data} = useRol()

    if(isError)
        return (<Navigate to="/sin-acceso" replace/>)
    if(isPending)
        return <PantallaCarga/>
    if(!data)
        return (<Navigate to="/sin-acceso" replace/>)

    if(data === "Admin")
        return <Navigate to="/reserva" replace/>
    if(data === "Usuario")
        return <Navigate to="/mi-reserva" replace/>
    return <Navigate to="/sin-acceso" replace/>
}

export default RedirectByRole