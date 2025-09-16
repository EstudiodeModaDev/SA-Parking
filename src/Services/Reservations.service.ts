// src/services/Reservations.service.ts
import { GraphRest } from '../graph/GraphRest';
import type { GetAllOpts } from '../Models/Commons';
import type { Reservations } from '../Models/Reservation';



export class ReservationsService {
  private graph!: GraphRest;
  private hostname!: string;
  private sitePath!: string;
  private listName!: string;

  private siteId?: string;
  private listId?: string;

  constructor(
    graph: GraphRest,
    hostname = 'estudiodemoda.sharepoint.com',
    sitePath = '/sites/TransformacionDigital/IN/SA',
    listName = 'Reservations'
  ) {
    this.graph = graph;
    this.hostname = hostname;
    this.sitePath = sitePath.startsWith('/') ? sitePath : `/${sitePath}`;
    this.listName = listName;
  }

  // ---------- helpers ----------
  private esc(s: string) { return String(s).replace(/'/g, "''"); }

  private loadCache() {
    try {
      const k = `sp:${this.hostname}${this.sitePath}:${this.listName}`;
      const raw = localStorage.getItem(k);
      if (raw) {
        const { siteId, listId } = JSON.parse(raw);
        this.siteId = siteId || this.siteId;
        this.listId = listId || this.listId;
      }
    } catch {}
  }
  private saveCache() {
    try {
      const k = `sp:${this.hostname}${this.sitePath}:${this.listName}`;
      localStorage.setItem(k, JSON.stringify({ siteId: this.siteId, listId: this.listId }));
    } catch {}
  }

  private async ensureIds() {
    if (!this.siteId || !this.listId) this.loadCache();

    if (!this.siteId) {
      const site = await this.graph.get<any>(`/sites/${this.hostname}:${this.sitePath}`);
      this.siteId = site?.id;
      if (!this.siteId) throw new Error('No se pudo resolver siteId');
      this.saveCache();
    }

    if (!this.listId) {
      const lists = await this.graph.get<any>(
        `/sites/${this.siteId}/lists?$filter=displayName eq '${this.esc(this.listName)}'`
      );
      const list = lists?.value?.[0];
      if (!list?.id) throw new Error(`Lista no encontrada: ${this.listName}`);
      this.listId = list.id;
      this.saveCache();
    }
  }

  // ---------- mapping (Graph -> Modelo) ----------
  private toModel(item: any): Reservations {
    const f = item?.fields ?? {};
    return {
      ID: String(item?.id ?? ''),
      Title: f.Title ?? '',
      NombreUsuario: f.NombreUsuario ?? undefined,
      Date: f.Date ?? undefined,              // Graph entrega ISO
      Turn: f.Turn ?? undefined,

      // Lookup SpotId: Graph expone SpotIdLookupId y a veces SpotId (texto)
      SpotIdLookupId: typeof f.SpotIdLookupId === 'number' ? f.SpotIdLookupId : null,
      SpotId: f.SpotId ?? null,

      VehivleType: f.VehivleType ?? undefined,
      Status: f.Status ?? undefined,
      OData__ColorTag: f.OData__ColorTag ?? undefined,

      Modified: f.Modified ?? undefined,
      Created: f.Created ?? undefined,
      // Nota: los user fields “Author/Editor” suelen venir como AuthorLookupId/EditorLookupId
      AuthorLookupId: typeof f.AuthorLookupId === 'number' ? f.AuthorLookupId : null,
      EditorLookupId: typeof f.EditorLookupId === 'number' ? f.EditorLookupId : null,
    };
  }

  // ---------- CRUD ----------
  async create(record: Omit<Reservations, 'ID'>) {
    await this.ensureIds();

    // Payload hacia Graph: usar nombres de columna (Internal Names).
    // Para el lookup, asegúrate de enviar SpotIdLookupId (número).
    const fieldsPayload: any = {
      Title: record.Title,
      NombreUsuario: record.NombreUsuario,
      Date: record.Date,               // ISO
      Turn: record.Turn,
      SpotIdLookupId: record.SpotIdLookupId ?? undefined, // 👈 CLAVE para lookup
      VehivleType: record.VehivleType,
      Status: record.Status,
      OData__ColorTag: record.OData__ColorTag,
      // otros campos si los necesitas...
    };

    const res = await this.graph.post<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items`,
      { fields: fieldsPayload }
    );
    return this.toModel(res);
  }

  async update(id: string, changed: Partial<Omit<Reservations, 'ID'>>) {
    await this.ensureIds();

    const fieldsPatch: any = {};
    if (changed.Title !== undefined) fieldsPatch.Title = changed.Title;
    if (changed.NombreUsuario !== undefined) fieldsPatch.NombreUsuario = changed.NombreUsuario;
    if (changed.Date !== undefined) fieldsPatch.Date = changed.Date;
    if (changed.Turn !== undefined) fieldsPatch.Turn = changed.Turn;

    // lookup:
    if (changed.SpotIdLookupId !== undefined) fieldsPatch.SpotIdLookupId = changed.SpotIdLookupId;

    if (changed.VehivleType !== undefined) fieldsPatch.VehivleType = changed.VehivleType;
    if (changed.Status !== undefined) fieldsPatch.Status = changed.Status;
    if (changed.OData__ColorTag !== undefined) fieldsPatch.OData__ColorTag = changed.OData__ColorTag;

    const hasAny = Object.keys(fieldsPatch).length > 0;
    if (hasAny) {
      await this.graph.patch<any>(
        `/sites/${this.siteId}/lists/${this.listId}/items/${id}/fields`,
        fieldsPatch
      );
    }

    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items/${id}?$expand=fields`
    );
    return this.toModel(res);
  }

  async delete(id: string) {
    await this.ensureIds();
    await this.graph.delete(`/sites/${this.siteId}/lists/${this.listId}/items/${id}`);
  }

  async get(id: string) {
    await this.ensureIds();
    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items/${id}?$expand=fields`
    );
    return this.toModel(res);
  }

  async getAll(opts?: GetAllOpts) {
    await this.ensureIds();
    const qs = new URLSearchParams({ $expand: 'fields' });
    if (opts?.filter) qs.set('$filter', opts.filter);
    if (opts?.orderby) qs.set('$orderby', opts.orderby);
    if (opts?.top != null) qs.set('$top', String(opts.top));

    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?${qs.toString()}`
    );
    const arr = Array.isArray(res?.value) ? res.value : [];
    return arr.map((x: any) => this.toModel(x));
  }

  // ---------- helpers de consulta (opcionales) ----------

  /** Busca reservas de un slot por ID de lookup */
  async findBySpotId(spotItemId: number, top = 100) {
    return this.getAll({
      filter: `fields/SpotIdLookupId eq ${spotItemId}`,
      orderby: 'fields/Date asc',
      top,
    });
  }

  /** Rango de fecha (UTC ISO) — ambos inclusive */
  async findByDateRange(fromIso: string, toIso: string, top = 200) {
    const f = this.esc(fromIso);
    const t = this.esc(toIso);
    return this.getAll({
      filter: `(fields/Date ge '${f}' and fields/Date le '${t}')`,
      orderby: 'fields/Date asc',
      top,
    });
  }

  /** Por usuario (UPN/correo guardado en NombreUsuario) */
  async findByUser(emailOrUpn: string, top = 100) {
    return this.getAll({
      filter: `fields/NombreUsuario eq '${this.esc(emailOrUpn)}'`,
      orderby: 'fields/Date desc',
      top,
    });
  }
}
