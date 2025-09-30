import type { GraphListResponse, GraphUser } from "../Models/GraphUsers";

async function graphGet<T>(url: string, getToken: () => Promise<string>): Promise<T> {
  const token = await getToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "ConsistencyLevel": "eventual" }
  });
  if (!res.ok) throw new Error(`Graph ${res.status}: ${await res.text()}`);
  return await res.json() as T;
}

export async function getGroupUsers(
  groupID: string,
  getToken: () => Promise<string>,
  transitive = true
): Promise<GraphUser[]> {
  let url =
    `https://graph.microsoft.com/v1.0/groups/${groupID}/` +
    `${transitive ? "transitiveMembers" : "members"}` +
    `?$select=id,displayName,mail,userPrincipalName,jobTitle,@odata.type&$top=999`;

  const all: GraphUser[] = [];
  while (url) {
    const data = await graphGet<GraphListResponse<GraphUser>>(url, getToken);
    all.push(...(data.value ?? []));
    url = data["@odata.nextLink"] ?? "";
  }
  return all.filter(m => (m["@odata.type"] ?? "").endsWith("user"));
}
