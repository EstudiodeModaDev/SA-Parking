type GraphGet = { get: (path: string) => Promise<any> };

type UserLite = { id: string; userPrincipalName: string; mail?: string };

export async function resolveUserUpnOrId(
  graph: GraphGet,
  opts?: { email?: string; useCurrent?: boolean }
): Promise<{ upn?: string; id?: string }> {
  if (opts?.useCurrent) {
    const me = await graph.get('/me');
    return { upn: me?.userPrincipalName, id: me?.id };
  }
  if (opts?.email) {
    const email = opts.email.replace(/'/g, "''");
    const res = await graph.get(`/users?$select=id,userPrincipalName,mail&$filter=mail eq '${email}'`);
    const u: UserLite | undefined = res?.value?.[0];
    if (u) return { upn: u.userPrincipalName, id: u.id };
  }
  return {};
}
