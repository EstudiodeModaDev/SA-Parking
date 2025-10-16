import { GraphRest } from '../graph/GraphRest';
import type { Colaboradoresfijos } from '../Models/Colaboradoresfijos';
import type { GetAllOpts } from '../Models/Commons';

export class ColaboradoresFijosService {
  private graph!: GraphRest;
  private hostname!: string;
  private sitePath!: string;
  private listName!: string;

  private siteId?: string;
  private listId?: string;

  constructor(graph: GraphRest, hostname: string = 'estudiodemoda.sharepoint.com', sitePath: string = '/sites/TransformacionDigital/IN/SA', listName: string= 'Colaboradores fijos') {
    this.graph = graph;
    this.hostname = hostname;
    this.sitePath = sitePath.startsWith('/') ? sitePath : `/${sitePath}`;
    this.listName = listName;
  }

  // ---------- helpers ----------
  private esc(s: string) { return String(s).replace(/'/g, "''"); }

  // cache (mem + localStorage opcional)
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

    //Parsear todo al modelo
    private toModel(item: any): Colaboradoresfijos {
        const f = item?.fields ?? {};
        return {
            ID: Number(item?.id ?? NaN),
            Title: f.Title,
            Correo: f.Correo,
            Tipodevehiculo: f.Tipodevehiculo,
            Placa: f.Placa,
            CodigoCelda: f.CodigoCelda,
            SpotAsignado: f.SpotAsignado
        };
    }

    // ---------- CRUD ----------
    async create(record: Omit<Colaboradoresfijos, 'ID'>) {
        await this.ensureIds();
        const res = await this.graph.post<any>(
        `/sites/${this.siteId}/lists/${this.listId}/items`,
        { fields: record }
        );
        return this.toModel(res);
    }

    async update(id: string, changed: Partial<Omit<Colaboradoresfijos, 'ID'>>) {
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

  // -------- PAGINACION --------
    async getAllPaged(opts?: GetAllOpts) {
        await this.ensureIds();
        const qs = new URLSearchParams({ $expand: 'fields' });
        if (opts?.filter) qs.set('$filter', opts.filter);
        if (opts?.orderby) qs.set('$orderby', opts.orderby);
        if (opts?.top != null) qs.set('$top', String(opts.top));

        const first = await this.graph.get<any>(
            `/sites/${this.siteId}/lists/${this.listId}/items?${qs.toString()}`
        );
        return {
            data: (first.value ?? []).map((x: any) => this.toModel(x)),
            nextLink: first['@odata.nextLink'] as string | undefined,
        };
    }

    async getNextPage(nextLink: string) {
    const res = await this.graph.get<any>(nextLink.replace('https://graph.microsoft.com/v1.0', ''));
    return {
        data: (res.value ?? []).map((x: any) => this.toModel(x)),
        nextLink: res['@odata.nextLink'] as string | undefined,
    };
    }
}


