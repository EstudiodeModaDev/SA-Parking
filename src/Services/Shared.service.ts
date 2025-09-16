// src/services/SharedServices.ts
import { UsuariosParkingService } from './UsuariosParking.service';

export const norm = (s: unknown) => String(s ?? '').trim().toUpperCase();

export class SharedServices {
  private usuariosSvc: UsuariosParkingService;

  constructor(usuariosSvc: UsuariosParkingService) {
    this.usuariosSvc = usuariosSvc;
  }

  /**
   * Devuelve el rol del usuario según la lista 'usuariosparking'.
   * Prioriza buscar por la columna 'Correo' (Internal Name).
   * Fallback: intenta por Title si así guardaron el correo.
   */
  public async getRole(userEmail: string): Promise<string> {
    if (!userEmail) return 'Usuario';

    // Escapa comillas (OData)
    const emailSafe = String(userEmail).replace(/'/g, "''");
    const emailLower = emailSafe.toLowerCase();

    try {
      // 1) intenta por Correo (recomendado)
      const porCorreo = await this.usuariosSvc.getAll({
        filter: `tolower(fields/Correo) eq '${emailLower}'`,
        orderby: 'fields/Title asc',
        top: 1,
      });

      const first = porCorreo[0];
      if (first?.Rol) return first.Rol;

      // 2) fallback: si el correo lo guardan en Title
      const porTitle = await this.usuariosSvc.getAll({
        filter: `tolower(fields/Title) eq '${emailLower}'`,
        orderby: 'fields/Title asc',
        top: 1,
      });

      const alt = porTitle[0];
      if (alt?.Rol) return alt.Rol;

      return 'Usuario';
    } catch (err) {
      console.error('[SharedServices.getRole] error:', err);
      return 'Usuario';
    }
  }
}
