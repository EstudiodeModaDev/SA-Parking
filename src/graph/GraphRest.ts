// src/graph/GraphRest.ts
export class GraphRest {
  private getToken: () => Promise<string>;
  private base = 'https://graph.microsoft.com/v1.0';

  constructor(getToken: () => Promise<string>, baseUrl?: string) {
    this.getToken = getToken;
    if (baseUrl) this.base = baseUrl;
  }

  private async call<T>(
    method: 'GET'|'POST'|'PATCH'|'DELETE',
    path: string,
    body?: any,
    init?: RequestInit
  ): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(this.base + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        // ⬇️ permite consultas sin índice (parche)
        Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly',
        ...(init?.headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      ...init,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Graph error ${res.status}`);
    }
    return (await res.json()) as T;
  }

  get<T>(path: string, init?: RequestInit)    { return this.call<T>('GET', path, undefined, init); }
  post<T>(path: string, body: any, init?: RequestInit)  { return this.call<T>('POST', path, body, init); }
  patch<T>(path: string, body: any, init?: RequestInit) { return this.call<T>('PATCH', path, body, init); }
  delete(path: string, init?: RequestInit)     { return this.call('DELETE', path, undefined, init); }
}
