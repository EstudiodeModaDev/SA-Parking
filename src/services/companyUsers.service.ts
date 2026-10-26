import type { companyUsers } from "../types/companyUsers";
import { api } from "./api";

export const companyUsersService = {
    getall : () => api<Array<companyUsers>>("/colaboradores/all")
}