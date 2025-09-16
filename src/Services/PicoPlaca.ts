// src/services/PicoYPlaca.service.ts
import { GraphRest } from '../graph/GraphRest';
import type { GetAllOpts } from '../Models/Commons';
import type { PicoYPlaca } from '../Models/PicoPlaca';

export class PicoYPlacaService {
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
    listName = 'Pico y Placa'  
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

  private toModel(item: any): PicoYPlaca {
    const f = item?.fields ?? {};
    return {
      ID: String(item?.id ?? ''),
      Title: f.Title,
      Moto: f.Moto,
      Carro: f.Carro,
    };
  }

  // ---------- CRUD ----------
  async create(record: Omit<PicoYPlaca, 'ID'>) {
    await this.ensureIds();
    const res = await this.graph.post<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items`,
      { fields: record }
    );
    return this.toModel(res);
  }

  async update(id: string, changed: Partial<Omit<PicoYPlaca, 'ID'>>) {
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

  // ---------- helpers de negocio (opcionales) ----------

  /**
   * Busca reglas por día (ej: 'Lunes') y tipo de vehículo (opcional).
   * Usa Internal Names exactos.
   */
  async findByDia(dia: string, tipoVehiculo?: string, onlyActive = true) {
    await this.ensureIds();
    const conds = [`fields/Dia eq '${this.esc(dia)}'`];
    if (tipoVehiculo) conds.push(`fields/TipoVehiculo eq '${this.esc(tipoVehiculo)}'`);
    if (onlyActive) conds.push(`(fields/Activo eq true or not(fields/Activo))`);
    const qs = new URLSearchParams({
      $expand: 'fields',
      $filter: conds.join(' and '),
      $orderby: 'fields/Inicio asc',
      $top: '100',
    });
    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?${qs.toString()}`
    );
    return (res.value ?? []).map((x: any) => this.toModel(x));
  }

  /**
   * Valida si una placa está restringida para una fecha/hora dada.
   * - Asume `Digitos` con lista de terminaciones (ej: "1,2,3") o rangos simples ("0-1").
   * - Asume `Dia` con nombre del día (Lunes..Domingo) y opcionalmente `Inicio`/`Fin` en "HH:mm".
   * Ajusta a tu formato real si es distinto.
   */
  async isRestringido(placa: string, fecha: Date, tipoVehiculo?: string) {
    const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const dia = dayNames[fecha.getDay()];
    const hora = `${String(fecha.getHours()).padStart(2,'0')}:${String(fecha.getMinutes()).padStart(2,'0')}`;
    const reglas = await this.findByDia(dia, tipoVehiculo, true);

    const lastDigit = placa.replace(/\D/g, '').slice(-1); // último dígito
    if (!lastDigit) return false;

    const toMinutes = (hhmm?: string) => {
      if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
      const [h,m] = hhmm.split(':').map(Number);
      return h*60 + m;
    };
    const nowM = toMinutes(hora);

    for (const r of reglas) {
      // Comparar dígitos
      const piezas = String(r.Digitos ?? '').split(/[,\s]+/).filter(Boolean);
      const matchDigit = piezas.some(p => {
        if (/^\d$/.test(p)) return p === lastDigit;
        if (/^\d-\d$/.test(p)) {
          const [a,b] = p.split('-').map(Number);
          return Number(lastDigit) >= a && Number(lastDigit) <= b;
        }
        return false;
      });
      if (!matchDigit) continue;

      // Si no hay horario, considerar restringido todo el día
      const iniM = toMinutes(r.Inicio);
      const finM = toMinutes(r.Fin);
      if (iniM == null || finM == null || nowM == null) return true;

      if (nowM >= iniM && nowM <= finM) return true;
    }
    return false;
  }
}
