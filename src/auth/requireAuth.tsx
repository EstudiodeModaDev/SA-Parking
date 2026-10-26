import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import{InteractionStatus} from "@azure/msal-browser"
import PantallaCarga from "../components/pantallaCarga.component";
import { Navigate, Outlet } from "react-router-dom";

function RequireAuth() {
    const isAuthenticated = useIsAuthenticated()
    const {inProgress} = useMsal()

    if (inProgress !== InteractionStatus.None) 
        return <PantallaCarga/>
    if (!isAuthenticated)
        return <Navigate to="/login" replace/>
    return <Outlet/>
}

export default RequireAuth