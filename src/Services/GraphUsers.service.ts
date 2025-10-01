// src/Services/GroupMembers.service.ts
export type GetTokenFn = () => Promise<string>;

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
  return res.status; // 204 esperado
}

/** Elimina un miembro DIRECTO del grupo por su userId */
export async function removeMemberByUserId(
  groupId: string,
  userId: string,
  getToken: GetTokenFn
): Promise<{ ok: true; already?: true }> {
  const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members/${userId}/$ref`;
  try {
    await graphDelete(url, getToken); // 204 No Content
    return { ok: true };
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    // Si no es miembro directo o ya fue eliminado, Graph suele responder 404
    if (msg.includes("404")) return { ok: true, already: true };
    // Algunas tenants devuelven "One or more removed object references do not exist"
    if (msg.includes("ObjectReferencesDoNotExist") || msg.includes("removed object references")) {
      return { ok: true, already: true };
    }
    throw e;
  }
}

/** Helper opcional: buscar userId por correo */
export async function getUserIdByEmail(
  email: string,
  getToken: GetTokenFn
): Promise<string | null> {
  const token = await getToken();
  const url =
    `https://graph.microsoft.com/v1.0/users` +
    `?$select=id,mail,userPrincipalName` +
    `&$filter=mail eq '${email}' or userPrincipalName eq '${email}'`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Graph ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const user = (data?.value ?? [])[0];
  return user?.id ?? null;
}

/** Elimina por email (resolve userId primero). Retorna ok/ya-no-directo */
export async function removeMemberByEmail(
  groupId: string,
  email: string,
  getToken: GetTokenFn
): Promise<{ ok: true; already?: true }> {
  const userId = await getUserIdByEmail(email, getToken);
  if (!userId) {
    // No existe el usuario en el tenant → para efectos prácticos, trátalo como ya no miembro
    return { ok: true, already: true };
  }
  return removeMemberByUserId(groupId, userId, getToken);
}

/** Bulk (mejor UX cuando quitas varios de una) */
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
