// src/Services/Reservations.service.ts
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
    listName = 'Reservations' // ⚠️ usa el displayName EXACTO de la lista
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
      Date: f.Date ?? undefined,
      Turn: f.Turn ?? undefined,

      // Lookup SpotId
      SpotIdLookupId: typeof f.SpotIdLookupId === 'number' ? f.SpotIdLookupId : null,
      SpotId: f.SpotId ?? null,

      // ⚠️ Asegúrate que el internal name sea el mismo en tu lista.
      VehivleType: f.VehivleType ?? f.VehicleType ?? undefined,
      Status: f.Status ?? undefined,
      OData__ColorTag: f.OData__ColorTag ?? undefined,

      Modified: f.Modified ?? undefined,
      Created: f.Created ?? undefined,
      AuthorLookupId: typeof f.AuthorLookupId === 'number' ? f.AuthorLookupId : null,
      EditorLookupId: typeof f.EditorLookupId === 'number' ? f.EditorLookupId : null,
    };
  }

  // ---------- CRUD ----------
  async create(record: Omit<Reservations, 'ID'>) {
    await this.ensureIds();

    const fieldsPayload: any = {
      Title: record.Title,
      NombreUsuario: record.NombreUsuario,
      Date: record.Date,
      Turn: record.Turn,
      SpotIdLookupId: record.SpotIdLookupId ?? undefined,
      VehivleType: record.VehivleType, // o VehicleType si así se llama tu columna
      Status: record.Status,
      OData__ColorTag: record.OData__ColorTag,
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
    if (changed.SpotIdLookupId !== undefined) fieldsPatch.SpotIdLookupId = changed.SpotIdLookupId;
    if (changed.VehivleType !== undefined) fieldsPatch.VehivleType = changed.VehivleType;
    if (changed.Status !== undefined) fieldsPatch.Status = changed.Status;
    if (changed.OData__ColorTag !== undefined) fieldsPatch.OData__ColorTag = changed.OData__ColorTag;

    if (Object.keys(fieldsPatch).length > 0) {
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

  // ---------- LISTAR (corregido) ----------
  async getAll(opts?: GetAllOpts) {
    await this.ensureIds();

    // Selecciona solo lo que usas (puedes agregar más campos)
    const select = [
      'Title','NombreUsuario','Date','Turn',
      'SpotIdLookupId','SpotId','VehivleType','Status','OData__ColorTag',
      'Modified','Created','AuthorLookupId','EditorLookupId'
    ].join(',');

    const qs = new URLSearchParams();
    qs.set('$expand', `fields($select=${select})`);
    if (opts?.filter)  qs.set('$filter', opts.filter);
    if (opts?.orderby) qs.set('$orderby', opts.orderby);
    if (opts?.top != null) qs.set('$top', String(opts.top));

    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?${qs.toString()}`
    );
    const arr = Array.isArray(res?.value) ? res.value : [];
    return arr.map((x: any) => this.toModel(x));
  }

  // ---------- helpers de consulta ----------
  async findBySpotId(spotItemId: number, top = 100) {
    return this.getAll({
      filter: `fields/SpotIdLookupId eq ${spotItemId}`,
      orderby: 'fields/Date asc',
      top,
    });
  }

  async findByDateRange(fromIso: string, toIso: string, top = 200) {
    return this.getAll({
      filter: `(fields/Date ge '${this.esc(fromIso)}' and fields/Date le '${this.esc(toIso)}')`,
      orderby: 'fields/Date asc',
      top,
    });
  }

  async findByUser(emailOrUpn: string, top = 100) {
    return this.getAll({
      // usa la columna donde guardas el correo/nombre del usuario
      filter: `fields/NombreUsuario eq '${this.esc(emailOrUpn)}'`,
      orderby: 'fields/Date desc',
      top,
    });
  }
}
