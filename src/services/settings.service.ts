import type { settings } from "../types/settings";
import { api } from "./api";

export const settingsService = {
    getSettings :  () => api<Array<settings>>('/settings/get'),
    putSettings : (data : settings) => api<settings>("/settings/put", {method: "PUT", body: JSON.stringify(data)})
}