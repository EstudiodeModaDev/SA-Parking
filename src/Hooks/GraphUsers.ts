// src/Hooks/useGroupMembers.ts
import * as React from "react";
import type { GraphListResponse, GraphUser } from "../Models/GraphUsers";
import { useAuth } from "../auth/AuthProvider";

/* ============================
   Utilidades HTTP contra Graph
   ============================ */
type GetTokenFn = () => Promise<string>;

async function graphGet<T>(url: string, getToken: GetTokenFn): Promise<T> {
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

async function graphPost(url: string, body: any, getToken: GetTokenFn) {
  const token = await getToken();
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Graph ${res.status}: ${await res.text()}`);
  return res.status; // 204 esperado
}

async function graphDelete(url: string, getToken: GetTokenFn): Promise<number> {
  const token = await getToken();
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph ${res.status}: ${text || res.statusText}`);
  }
  return res.status; // 204
}

/* ============================
   Endpoints específicos
   ============================ */

// === Listar miembros (transitivos o directos). Ojo: /transitiveMembers puede devolver grupos/devices
async function fetchGroupMembers(
  groupId: string,
  getToken: GetTokenFn,
  transitive = true
): Promise<GraphUser[]> {
  let url =
    `https://graph.microsoft.com/v1.0/groups/${groupId}/` +
    `${transitive ? "transitiveMembers" : "members"}` +
    `?$select=id,displayName,mail,userPrincipalName,jobTitle&$top=999`;

  const all: any[] = [];
  while (url) {
    const data = await graphGet<GraphListResponse<any>>(url, getToken);
    all.push(...(data.value ?? []));
    url = data["@odata.nextLink"] ?? "";
  }

  // Filtrar solo usuarios (en transitive pueden venir grupos o devices)
  // Heurística: odata.type termina con "user" o tiene userPrincipalName
  const users = all.filter(
    (it) =>
      (typeof it?.["@odata.type"] === "string" &&
        it["@odata.type"].toLowerCase().endsWith("user")) ||
      !!it?.userPrincipalName
  );

  return users as GraphUser[];
}

// === Agregar miembro por userId
export async function addMemberByUserId(
  groupId: string,
  userId: string,
  getToken: GetTokenFn
) {
  const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members/$ref`;
  const body = { "@odata.id": `https://graph.microsoft.com/v1.0/users/${userId}` };
  try {
    const status = await graphPost(url, body, getToken); // 204 No Content si OK
    console.log("[addMemberByUserId] OK status:", status, "userId:", userId);
    return { ok: true as const };
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    // Ya existe
    if (msg.includes("added object references already exist") || msg.includes("ObjectReferencesAlreadyExist")) {
      return { ok: true as const, already: true as const };
    }
    throw e;
  }
}

// === Buscar userId por correo
export async function getUserIdByEmail(email: string, getToken: GetTokenFn): Promise<string | null> {
  const q = email.replace(/'/g, "''");
  const url =
    `https://graph.microsoft.com/v1.0/users` +
    `?$select=id,mail,userPrincipalName` +
    `&$filter=mail eq '${q}' or userPrincipalName eq '${q}'`;

  const token = await getToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Graph ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const user = (data?.value ?? [])[0];
  return user?.id ?? null;
}

// === Quitar miembro directo por userId
export async function removeMemberByUserId(
  groupId: string,
  userId: string,
  getToken: GetTokenFn
): Promise<{ ok: true; already?: true }> {
  const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members/${userId}/$ref`;
  try {
    await graphDelete(url, getToken); // 204 No Content si se elimina
    return { ok: true };
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    // No es miembro directo o ya no existe la referencia
    if (msg.includes("404") || msg.includes("ObjectReferencesDoNotExist") || msg.includes("removed object references")) {
      return { ok: true, already: true };
    }
    throw e;
  }
}

// === Quitar miembro por email (resuelve userId primero)
export async function removeMemberByEmail(
  groupId: string,
  email: string,
  getToken: GetTokenFn
): Promise<{ ok: true; already?: true }> {
  const userId = await getUserIdByEmail(email, getToken);
  if (!userId) {
    // Usuario no existe en el tenant: trátalo como "ya no miembro directo"
    return { ok: true, already: true };
  }
  return removeMemberByUserId(groupId, userId, getToken);
}

// === Bulk remove (útil para UX)
export async function removeMembersBulk(
  groupId: string,
  userIdsOrEmails: string[],
  getToken: GetTokenFn
): Promise<{ removed: string[]; already: string[]; errors: { id: string; error: string }[] }> {
  const removed: string[] = [];
  const already: string[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const idOrEmail of userIdsOrEmails) {
    try {
      const looksLikeGuid = /^[0-9a-f-]{36}$/i.test(idOrEmail);
      const result = looksLikeGuid
        ? await removeMemberByUserId(groupId, idOrEmail, getToken)
        : await removeMemberByEmail(groupId, idOrEmail, getToken);

      if (result.already) already.push(idOrEmail);
      else removed.push(idOrEmail);
    } catch (e: any) {
      errors.push({ id: idOrEmail, error: String(e?.message ?? e) });
    }
  }

  return { removed, already, errors };
}

/* ============================
   Tipos de la app/UI
   ============================ */
export type AppUsers = {
  id: string;
  nombre: string;
  correo: string;
};

/* ============================
   Hook principal
   ============================ */
export function useGroupMembers(groupId: string) {
  const { getToken } = useAuth();

  const [rows, setRows] = React.useState<AppUsers[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // búsqueda/paginación en cliente
  const [search, setSearch] = React.useState("");
  const [pageSize, setPageSize] = React.useState(10);
  const [pageIndex, setPageIndex] = React.useState(0);

  // Cargar miembros
  const refresh = React.useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const users = await fetchGroupMembers(groupId, getToken, true); // transitivos
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

  // Filtro en cliente por nombre/correo
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.nombre?.toLowerCase() ?? "").includes(q) ||
      (r.correo?.toLowerCase() ?? "").includes(q)
    );
  }, [rows, search]);

  // Paginación en cliente
  const start = pageIndex * pageSize;
  const end = start + pageSize;
  const pageRows = React.useMemo(() => filtered.slice(start, end), [filtered, start, end]);
  const hasNext = end < filtered.length;
  const nextPage = () => hasNext && setPageIndex((i) => i + 1);
  const prevPage = () => setPageIndex((i) => Math.max(0, i - 1));

  /* ===========
     Acciones
     =========== */

  // Agregar por userId (si tu UI lo necesita)
  const addCollaboratorByUserId = React.useCallback(
    async (userId: string) => {
      if (!groupId || !userId) return;
      await addMemberByUserId(groupId, userId, getToken);
      await refresh();
    },
    [groupId, getToken, refresh]
  );

  // Eliminar por userId (preferido si la tabla tiene id)
  const deleteByUserId = React.useCallback(
    async (userId: string) => {
      if (!groupId || !userId) return;
      await removeMemberByUserId(groupId, userId, getToken);
      await refresh();
    },
    [groupId, getToken, refresh]
  );

  // Eliminar por correo (si tu tabla se maneja por email)
  const deleteByEmail = React.useCallback(
    async (email: string) => {
      if (!groupId || !email) return;
      await removeMemberByEmail(groupId, email, getToken);
      await refresh();
    },
    [groupId, getToken, refresh]
  );

  // API unificada para UI (acepta id o email)
  const deleteCollaborator = React.useCallback(
    async (idOrEmail: string) => {
      const looksLikeGuid = /^[0-9a-f-]{36}$/i.test(idOrEmail);
      if (looksLikeGuid) return deleteByUserId(idOrEmail);
      return deleteByEmail(idOrEmail);
    },
    [deleteByEmail, deleteByUserId]
  );

  return {
    // datos
    rows: pageRows,
    loading,
    error,

    // búsqueda/paginación
    search, setSearch,
    pageSize, setPageSize,
    pageIndex, hasNext, nextPage, prevPage,

    // control
    refresh,

    // acciones
    addCollaboratorByUserId,
    deleteByUserId,
    deleteByEmail,
    deleteCollaborator,
  };
}
