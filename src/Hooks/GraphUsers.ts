// src/Hooks/useGroupMembers.ts
import * as React from "react";
import type { GraphListResponse, GraphUser } from "../Models/GraphUsers";
import { useAuth } from "../auth/AuthProvider";


// === Helper: GET tipado
async function graphGet<T>(url: string, getToken: () => Promise<string>): Promise<T> {
  const token = await getToken();
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "ConsistencyLevel": "eventual",
    },
  });
  if (!res.ok) throw new Error(`Graph ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

// === Lista miembros (transitivos por defecto)
async function fetchGroupMembers(
  groupId: string,
  getToken: () => Promise<string>,
  transitive = true
): Promise<GraphUser[]> {
  let url =
    `https://graph.microsoft.com/v1.0/groups/${groupId}/` +
    `${transitive ? "transitiveMembers" : "members"}` +
    `?$select=id,displayName,mail,userPrincipalName,jobTitle&$top=999`;

  const all: GraphUser[] = [];
  while (url) {
    const data = await graphGet<GraphListResponse<GraphUser>>(url, getToken);
    console.log("Data obtenida", data)
    all.push(...(data.value ?? []));
    url = data["@odata.nextLink"] ?? "";
  }
  // Solo usuarios (cuando es transitive puede venir group/device)
  return all
}

export type AppUsers = {
  id: string;
  nombre: string;
  correo: string;
};

export function useGroupMembers(groupId: string) {
  const { getToken } = useAuth()
  const [rows, setRows] = React.useState<AppUsers[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // estado de búsqueda/paginación para “API compatible” con tu tabla
  const [search, setSearch] = React.useState("");
  const [pageSize, setPageSize] = React.useState(10);
  const [pageIndex, setPageIndex] = React.useState(0);

  const refresh = React.useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const users = await fetchGroupMembers(groupId, getToken);
      const mapped: AppUsers[] = users.map((u) => ({
        id: u.id,
        nombre: u.displayName ?? u.userPrincipalName ?? "(Sin nombre)",
        correo: u.mail ?? u.userPrincipalName ?? "",
      }));
      setRows(mapped);
      setPageIndex(0);
    } catch (e: any) {
      setError(e?.message ?? "Error al consultar miembros del grupo");
    } finally {
      setLoading(false);
    }
  }, [groupId, getToken]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // filtro en cliente por nombre/correo
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.nombre?.toLowerCase() ?? "").includes(q) ||
      (r.correo?.toLowerCase() ?? "").includes(q)
    );
  }, [rows, search]);

  // paginación en cliente
  const start = pageIndex * pageSize;
  const end = start + pageSize;
  const pageRows = React.useMemo(() => filtered.slice(start, end), [filtered, start, end]);
  const hasNext = end < filtered.length;

  const nextPage = () => hasNext && setPageIndex((i) => i + 1);
  const prevPage = () => setPageIndex((i) => Math.max(0, i - 1));

  // Como venías usando add/delete en SharePoint, aquí no aplica (grupo es solo lectura desde Graph).
  // Exponemos no-ops para no romper el contrato si tu UI los llama:
  const addCollaborator = async () => { throw new Error("No soportado: miembros vienen de Graph"); };
  const deleteCollaborator = async () => { throw new Error("No soportado: miembros vienen de Graph"); };

  return {
    rows: pageRows,
    loading,
    error,

    search, setSearch,

    pageSize, setPageSize,
    pageIndex, hasNext, nextPage, prevPage,

    refresh,
    addCollaborator,
    deleteCollaborator,
  };
}
