// src/Services/SharedServices.ts
import { UsuariosParkingService } from './UsuariosParking.service';

const norm = (s: unknown) => String(s ?? '').trim();

export class SharedServices {
  private usuariosSvc: UsuariosParkingService;

  constructor(usuariosSvc: UsuariosParkingService) {
    this.usuariosSvc = usuariosSvc;
  }

  /**
   * Devuelve el rol del usuario según la lista 'usuariosparking'.
   * Busca primero por la columna 'Correo' (internal name). Si no existe, hace fallback a 'Title'.
   * Retorna siempre 'admin' o 'usuario'.
   */
  public async getRole(userEmail: string): Promise<'admin' | 'usuario'> {
    const raw = norm(userEmail);
    if (!raw) return 'usuario';

    // escape OData + a minúsculas (para usar con tolower())
    const emailLower = raw.toLowerCase().replace(/'/g, "''");

    try {
      // 1) Por columna Correo
      const byCorreo = await this.usuariosSvc.getAll({
        filter: `tolower(fields/Correo) eq '${emailLower}'`,
        orderby: 'fields/Title asc',
        top: 1,
      });

      let row: any = Array.isArray(byCorreo) ? byCorreo[0] : null;

      // 2) Fallback por Title si no hubo match por Correo
      if (!row) {
        const byTitle = await this.usuariosSvc.getAll({
          filter: `tolower(fields/Title) eq '${emailLower}'`,
          orderby: 'fields/Title asc',
          top: 1,
        });
        row = Array.isArray(byTitle) ? byTitle[0] : null;
      }

      const rolRaw = norm(row?.Rol || row?.rol);
      const rol = rolRaw.toLowerCase();
      return (rol === 'admin') ? 'admin' : 'usuario';
    } catch (err) {
      console.error('[SharedServices.getRole] error:', err);
      return 'usuario';
    }
  }

  /**
   * ¿El usuario está marcado como permitido? (útil para mostrar botón 'Cambiar rol', etc.)
   * Acepta valores true/1/'true' en la columna 'Permitidos' (o variantes comunes).
   */
  public async isUserPermitted(userEmail: string): Promise<boolean> {
    const raw = norm(userEmail);
    if (!raw) return false;

    const emailLower = raw.toLowerCase().replace(/'/g, "''");
    try {
      const res = await this.usuariosSvc.getAll({
        filter: `tolower(fields/Correo) eq '${emailLower}' or tolower(fields/Title) eq '${emailLower}'`,
        top: 1,
      });
      const row: any = Array.isArray(res) ? res[0] : null;
      const v = row?.Permitidos ?? row?.Permitido ?? row?.permitidos ?? row?.permitido;
      return v === true || v === 1 || String(v).toLowerCase() === 'true';
    } catch {
      return false;
    }
  }
}
