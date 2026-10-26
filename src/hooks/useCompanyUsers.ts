import { useMsal } from "@azure/msal-react"
import { useQuery } from "@tanstack/react-query"
import { companyUsersService } from "../services/companyUsers.service"

export function useCompanyUsers(){
    const {accounts} = useMsal()

    return useQuery({
        queryKey : ['reserva', "companyUsers"], // al cambiar la vista cambia la key y se hace otra peticion
        queryFn : companyUsersService.getall,
        enabled : accounts.length>0,
        staleTime : 1000 * 60 * 30
    })
}