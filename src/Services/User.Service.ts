// src/services/UserService.ts
import { GraphRest } from '../graph/GraphRest';
import type { UserMe } from '../Models/users';

export class UserService {
  private graph!: GraphRest;

  constructor(graph: GraphRest) {
    this.graph = graph;
  }

  /**
   * Trae información básica del usuario autenticado
   * GET /me?$select=...
   */
  async getMeBasic(): Promise<UserMe> {
    const select = [
      'id',
      'displayName',
      'givenName',
      'surname',
      'mail',
      'userPrincipalName',
      'jobTitle',
      'department',
      'officeLocation',
      'businessPhones',
      'mobilePhone',
    ].join(',');

    const me = await this.graph.get<any>(`/me?$select=${encodeURIComponent(select)}`);
    const u: UserMe = {
      id: String(me?.id ?? ''),
      displayName: me?.displayName,
      givenName: me?.givenName,
      surname: me?.surname,
      mail: me?.mail ?? null,
      userPrincipalName: me?.userPrincipalName,
      jobTitle: me?.jobTitle ?? null,
      department: me?.department ?? null,
      officeLocation: me?.officeLocation ?? null,
      businessPhones: Array.isArray(me?.businessPhones) ? me.businessPhones : [],
      mobilePhone: me?.mobilePhone ?? null,
    };
    return u;
  }

  /**
   * Foto del usuario en data URL (puede ser null si no tiene)
   * GET /me/photo/$value
   */
  async getMyPhotoDataUrl(): Promise<string | null> {
    try {
      // Llamada binaria sin JSON:
      const token = await (this.graph as any).getToken(); // hack simple: accede al token
      const res = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const blob = await res.blob();
      const buf = await blob.arrayBuffer();
      const b64 = this.arrayBufferToBase64(buf);
      // contentType típico: image/jpeg; Graph no lo expone aquí, asumimos jpeg
      return `data:image/jpeg;base64,${b64}`;
    } catch {
      return null;
    }
  }

  private arrayBufferToBase64(buf: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buf);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
}
