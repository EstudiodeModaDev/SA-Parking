

// src/services/ParkingSlots.service.ts
import { GraphRest } from '../graph/GraphRest';
import type { GetAllOpts } from '../Models/Commons';
import type { ParkingSlot } from '../Models/Parkingslot';

export class ParkingSlotsService {
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
    listName = 'ParkingSlots'     
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
      const site = await this.graph.get<any>(`/sites/${this.hostname}:${this.sitePath}:`);
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

  // ---------- mapping ----------
  private toModel(item: any): ParkingSlot {
    const f = item?.fields ?? {};
    return {
      ID: String(item?.id ?? ''),
      Title: f.Title,
      TipoCelda: f.TipoCelda,
      Itinerancia: f.Itinerancia,
      Activa: f.Activa,
    };
  }

  // ---------- CRUD ----------
  async create(record: Omit<ParkingSlot, 'ID'>) {
    await this.ensureIds();
    const res = await this.graph.post<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items`,
      { fields: record }
    );
    return this.toModel(res);
  }

  async update(id: string, changed: Partial<Omit<ParkingSlot, 'ID'>>) {
    await this.ensureIds();
    await this.graph.patch<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items/${id}/fields`,
      changed
    );
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
    await this.ensureIds(); // debe fijar this.siteId y this.listId

    const normalizeOrder = (s: string) =>
      s.replace(/\bID\b/g, 'id').replace(/(^|[^/])\bTitle\b/g, '$1fields/Title');

    const qs = new URLSearchParams();
    qs.set('$expand', 'fields'); // si quieres: fields($select=Title,TipoCelda,Itinerancia,Activa)
    qs.set('$select', 'id,webUrl'); // opcional
    if (opts?.orderby) qs.set('$orderby', normalizeOrder(opts.orderby));
    if (opts?.top != null) qs.set('$top', String(opts.top));
    if (opts?.filter) qs.set('$filter', opts.filter); // ← tal cual

    const query = qs.toString().replace(/\+/g, '%20');

    const url = `/sites/${this.siteId}/lists/${this.listId}/items?${query}`;

    try {
      return (await this.graph.get<any>(url)).value.map((x: any) => this.toModel(x));
    } catch (e: any) {
      // Diagnóstico: si es itemNotFound, prueba sin filtro para ver si el problema es ruta o $filter
      const code = e?.error?.code ?? e?.code;
      if (code === 'itemNotFound' && opts?.filter) {
        const qs2 = new URLSearchParams(qs);
        qs2.delete('$filter');
        const url2 = `/sites/${this.siteId}/lists/${this.listId}/items?${qs2.toString()}`;
        const res2 = await this.graph.get<any>(url2);
        return (res2.value ?? []).map((x: any) => this.toModel(x));
      }
      throw e;
    }
  }

  // ---------- helpers de consulta (opcionales) ----------
  async findByCodigo(codigo: string, top = 1) {
    await this.ensureIds();
    const qs = new URLSearchParams({
      $expand: 'fields',
      $filter: `fields/Codigo eq '${this.esc(codigo)}'`,
      $top: String(top),
    });
    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?${qs.toString()}`
    );
    return (res.value ?? []).map((x: any) => this.toModel(x));
  }

  async getDisponibles(top = 100) {
    return this.getAll({ filter: 'fields/Disponible eq true', orderby: 'fields/Codigo asc', top });
  }
}






