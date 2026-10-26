import { useMsal } from "@azure/msal-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { settingsService } from "../services/settings.service"
import type { settings } from "../types/settings"

export function useSettings() {
    const {accounts} = useMsal()
    return useQuery({
        queryKey : ['settings', 'get'],
        queryFn : settingsService.getSettings,
        enabled : accounts.length>0,
        staleTime: 1000*60*30
    })
}

export function useEditSettings(){
    const queryClient = useQueryClient()
    return useMutation({
        mutationKey : ["settings", "put"],
        mutationFn :(data:settings) => settingsService.putSettings(data),
        //invalidar las listas de settings
        onMutate : () => queryClient.invalidateQueries({queryKey : ["settings"]})
    })
}