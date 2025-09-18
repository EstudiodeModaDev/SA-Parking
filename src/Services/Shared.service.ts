// src/Services/Shared.service.ts
// Servicio central para leer/escribir acceso de usuarios en la lista de SharePoint
// Requiere un GraphRest con .get(url) y .patch(url, body)

export type Role = 'admin' | 'usuario';

export type SharedServiceOpts = {
  hostname: string;     // ej: "estudiodemoda.sharepoint.com"
  sitePath?: string;    // ej: "ti/parking" (modo path)
  siteId?: string;      // si prefieres modo ids
  webId?: string;
  listName?: string;    // ej: "UsuariosParking"
  listId?: string;      // alternativa a listName
};

export type UserAccess = {
  permitted: boolean;
  role: Role;
  itemId?: string;
  fields?: Record<string, any>;
};

type GraphRest = {
  get: (url: string) => Promise<any>;
  patch: (url: string, body: any) => Promise<any>;
};

function toBool(raw: any): boolean {
  if (raw === true || raw === 1) return true;
  const s = String(raw ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'sí' || s === 'si';
}

export class SharedService {
  private graph: GraphRest;
  private hostname: string;
  private sitePath?: string;
  private siteId?: string;
  private webId?: string;
  private listName?: string;
  private listId?: string;

  constructor(graph: GraphRest, opts: SharedServiceOpts) {
    this.graph = graph;
    this.hostname = opts.hostname;
    this.sitePath = opts.sitePath;
    this.siteId = opts.siteId;
    this.webId = opts.webId;
    this.listName = opts.listName ?? 'UsuariosParking';
    this.listId = opts.listId;
  }

  // Base /sites/... en modo path o ids
  private getSiteBase(): string {
    if (this.siteId && this.webId) {
      return `/sites/${this.hostname},${this.siteId},${this.webId}`;
    }
    if (!this.sitePath) throw new Error('SharedService: sitePath requerido si no usas ids.');
    return `/sites/${this.hostname}:/sites/${this.sitePath}:`;
  }

  private getListSeg(): string {
    if (this.listId) return `/lists/${this.listId}`;
    if (!this.listName) throw new Error('SharedService: listName requerido si no usas listId.');
    return `/lists/${encodeURIComponent(this.listName)}`;
  }

  /**
   * Lee { permitted, role } de un usuario (por Title=email) en UNA sola llamada
   */
  async getUserAccess(email: string): Promise<UserAccess> {
    const emailSafe = (email ?? '').trim().replace(/'/g, "''");
    if (!emailSafe) return { permitted: false, role: 'usuario' };

    const url =
      `${this.getSiteBase()}${this.getListSeg()}/items` +
      `?$expand=fields($select=Title,Permitidos,Rol)` +
      `&$top=1` +
      `&$filter=fields/Title eq '${emailSafe}'`;

    const res = await this.graph.get(url);
    const items: any[] = (res?.data ?? res?.value ?? []);
    const item = items[0];
    const fields = item?.fields ?? null;

    if (!fields) return { permitted: false, role: 'usuario' };

    const permitted = toBool(fields.Permitidos ?? fields.permitidos ?? fields.Permitido);
    const role: Role = String(fields.Rol ?? 'usuario').toLowerCase() === 'admin' ? 'admin' : 'usuario';

    return { permitted, role, itemId: String(item?.id ?? ''), fields };
  }

  /**
   * Cambia el rol por itemId
   */
  async setRoleByItemId(itemId: string, nextRole: Role): Promise<void> {
    if (!itemId) throw new Error('itemId requerido');
    const url = `${this.getSiteBase()}${this.getListSeg()}/items/${itemId}/fields`;
    await this.graph.patch(url, { Rol: nextRole });
  }

  /**
   * Cambia el rol buscando por email
   */
  async setRoleByEmail(email: string, nextRole: Role): Promise<{ before: Role; after: Role }> {
    const access = await this.getUserAccess(email);
    const before = access.role;
    if (!access.itemId) throw new Error(`No existe item para ${email}`);
    if (before === nextRole) return { before, after: nextRole };
    await this.setRoleByItemId(access.itemId, nextRole);
    return { before, after: nextRole };
  }

  /**
   * Alterna admin/usuario por email
   */
  async toggleRole(email: string): Promise<{ before: Role; after: Role }> {
    const { role, itemId } = await this.getUserAccess(email);
    if (!itemId) throw new Error(`No existe item para ${email}`);
    const next: Role = role === 'admin' ? 'usuario' : 'admin';
    await this.setRoleByItemId(itemId, next);
    return { before: role, after: next };
  }
}
