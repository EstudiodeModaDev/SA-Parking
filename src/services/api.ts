import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { pca } from "../auth/msal";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function getToken(){
    const request = {
        scopes:[import.meta.env.VITE_AZURE_API_SCOPE],
        account: pca.getActiveAccount()!
    }
    try{
        const {accessToken} = await pca.acquireTokenSilent(request)
        return accessToken
    }catch (error){
        if (error instanceof InteractionRequiredAuthError)
            await pca.acquireTokenRedirect(request)
        throw error;
    }
}

export async function api<T>(path:string, init?:RequestInit) : Promise<T> {
    const token = await getToken()

    const res = await fetch(`${BASE_URL}${path}`,
        {
            ...init,
            headers:{
                "Content-Type" : "application/json",
                ...init?.headers,
                Authorization: `Bearer ${token}`,
            }
        }
    );
    if (!res.ok){
        throw new Error(`Error ${res.status}: ${await res.text()}`)
    }
    const contentType = res.headers.get("content-type") ?? "";
    return (contentType.includes("application/json") ? res.json() : res.text()) as Promise<T>;
}