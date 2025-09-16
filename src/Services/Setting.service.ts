import { GraphRest } from '../graph/GraphRest';

// Ajusta este modelo a tu schema real (coherente con tu UI)
export interface Settings {
  ID: string;               // item.id de Graph (string)
  VisibleDays?: number;
  TerminosyCondiciones: string;
  InicioManana: string;     // "07:00"
  FinalManana: string;      // "12:00"
  InicioTarde: string;      // "12:00"
  FinalTarde: string;       // "18:00"
  PicoPlaca: boolean;
}

export type GetAllOpts = {
  filter?: string;   // OData v4: usa fields/<InternalName>
  orderby?: string;  // p.ej. 'fields/Title asc'
  top?: number;      // límite
};

export class SettingsService {
  private graph: GraphRest;
  private hostname: string;
  private sitePath: string;
  private listName: string;

  private siteId?: string;
  private listId?: string;

  constructor(
    graph: GraphRest,
    hostname = 'estudiodemoda.sharepoint.com',
    sitePath = '/sites/TransformacionDigital/IN/SA',
    listName = 'Settings' // 👈 revisa el nombre real de la lista
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

  private toModel(item: any): Settings {
    const f = item?.fields ?? {};
    return {
      ID: String(item?.id ?? ''),
      VisibleDays: (f.VisibleDays != null) ? Number(f.VisibleDays) : undefined,
      InicioManana: (f.InicioManana != null) ? String(f.InicioManana) : '07:00',
      FinalManana: (f.FinalManana != null) ? String(f.FinalManana) : '12:00',
      InicioTarde: (f.InicioTarde != null) ? String(f.InicioTarde) : '12:00',
      FinalTarde: (f.FinalTarde != null) ? String(f.FinalTarde) : '18:00',
      TerminosyCondiciones: (f.TerminosyCondiciones != null) ? String(f.TerminosyCondiciones) : '',
      PicoPlaca: Boolean(f.PicoPlaca),
    };
  }

  // ---------- CRUD ----------
  async create(record: Omit<Settings, 'ID'>): Promise<Settings> {
    await this.ensureIds();
    const res = await this.graph.post<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items`,
      { fields: record }
    );
    const full = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items/${res?.id}?$expand=fields`
    );
    return this.toModel(full);
  }

  async update(id: string, changed: Partial<Omit<Settings, 'ID'>>): Promise<Settings> {
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

  async delete(id: string): Promise<void> {
    await this.ensureIds();
    await this.graph.delete(`/sites/${this.siteId}/lists/${this.listId}/items/${id}`);
  }

  async get(id: string): Promise<Settings> {
    await this.ensureIds();
    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items/${id}?$expand=fields`
    );
    return this.toModel(res);
  }

  async getById(id: string | number): Promise<Settings> {
    await this.ensureIds();
    const item = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items/${id}?$expand=fields`
    );
    return this.toModel(item);
  }

  async getAll(opts?: GetAllOpts): Promise<Settings[]> {
    await this.ensureIds();
    const qs = new URLSearchParams({ $expand: 'fields' });
    if (opts?.filter)  qs.set('$filter', opts.filter);
    if (opts?.orderby) qs.set('$orderby', opts.orderby);
    if (opts?.top != null) qs.set('$top', String(opts.top));

    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?${qs.toString()}`
    );
    const arr = Array.isArray(res?.value) ? res.value : [];
    return arr.map((x: any) => this.toModel(x));
  }

  // ---------- helpers de conveniencia ----------
  /** Obtiene un único registro por Title (si guardas la config como "Title = default") */
  async getByTitle(title: string): Promise<Settings | null> {
    const rows = await this.getAll({
      filter: `fields/Title eq '${this.esc(title)}'`,
      top: 1,
    });
    return rows[0] ?? null;
  }

  /** Ejemplo de helper: VisibleDays desde item con ID '1' */
  async getVisibleDaysFromId1(): Promise<number> {
    const item = await this.get('1');
    return Number(item.VisibleDays ?? 0);
  }
}
