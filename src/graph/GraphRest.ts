// src/graph/GraphRest.ts
export class GraphRest {
  private getToken: () => Promise<string>;
  private baseUrl: string;

  // compatible con tu firma actual; puedes pasar baseUrl opcional
  constructor(getToken: () => Promise<string>, baseUrl = 'https://graph.microsoft.com/v1.0') {
    this.getToken = getToken;
    this.baseUrl = baseUrl;
  }

  private async call<T>(method: string, path: string, body?: any): Promise<T> {
    const token = await this.getToken();
    const url = `${this.baseUrl}${path}`;

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${method} ${path} -> ${res.status} ${res.statusText} ${text ? ':: ' + text : ''}`);
    }

    // 204 No Content o cuerpo vacío
    if (res.status === 204) return undefined as unknown as T;
    const ct = res.headers.get('content-type') || '';
    if (!ct || !ct.toLowerCase().includes('application/json')) {
      // puede ser vacío o binario
      const text = await res.text().catch(() => '');
      return (text ? (JSON.parse(text) as T) : (undefined as unknown as T));
    }

    return (await res.json()) as T;
  }

  get<T>(path: string)              { return this.call<T>('GET', path); }
  post<T>(path: string, body: any)  { return this.call<T>('POST', path, body); }
  patch<T>(path: string, body: any) { return this.call<T>('PATCH', path, body); }
  delete(path: string)              { return this.call<never>('DELETE', path) as any; }

  // -------- Opcionales útiles --------

  // Paginación: itera @odata.nextLink y concatena .value
  async getAllPages<T = any>(path: string): Promise<T[]> {
    let url = `${this.baseUrl}${path}`;
    const token = await this.getToken();
    const out: T[] = [];

    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${await res.text()}`);
      const json = await res.json();
      if (Array.isArray(json?.value)) out.push(...json.value);
      url = json['@odata.nextLink'] || '';
    }

    return out;
  }

  // Binarios (por si alguna vez los necesitas)
  async getBlob(path: string): Promise<Blob> {
    const token = await this.getToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`);
    return await res.blob();
  }
}
