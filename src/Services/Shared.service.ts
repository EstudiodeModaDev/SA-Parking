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
    const started = performance.now();
    const raw = String(userEmail ?? '');
    if (!raw) {
      console.warn('[SharedServices.getRole] userEmail vacío -> "Usuario"');
      return 'Usuario';
    }

    // Escapa comillas (OData)
    const emailSafe = raw.replace(/'/g, "''");
    const emailLower = emailSafe.toLowerCase();

    console.groupCollapsed('[SharedServices.getRole] start');
    console.log('input userEmail:', raw);
    console.log('emailSafe:', emailSafe);
    console.log('emailLower:', emailLower);

    try {
      // 1) intenta por Correo (recomendado)
      const filterCorreo = `tolower(fields/Title) eq '${emailLower}'`;
      console.log('-> query por Correo:', { filter: filterCorreo, orderby: 'fields/Title asc', top: 1 });

      const porCorreo = await this.usuariosSvc.getAll({
        filter: filterCorreo,
        top: 1,
      }) as any[];

      console.log('respuesta por Correo:', porCorreo);
      const first = Array.isArray(porCorreo) ? porCorreo[0] : null;
      console.log('first (Correo):', first);

      if (first?.Rol) {
        const rol = String(first.Rol);
        console.log('ROL encontrado por Correo:', rol);
        console.log('ms:', Math.round(performance.now() - started));
        console.groupEnd();
        return rol;
      }

      // 2) fallback: si el correo lo guardan en Title
      const filterTitle = `tolower(fields/Title) eq '${emailLower}'`;
      console.log('-> query por Title:', { filter: filterTitle, top: 1 });

      const porTitle = await this.usuariosSvc.getAll({
        filter: filterTitle,
        top: 1,
      }) as any[];

      console.log('respuesta por Title:', porTitle);
      const alt = Array.isArray(porTitle) ? porTitle[0] : null;
      console.log('first (Title):', alt);

      if (alt?.Rol) {
        const rol = String(alt.Rol);
        console.log('ROL encontrado por Title:', rol);
        console.log('ms:', Math.round(performance.now() - started));
        console.groupEnd();
        return rol;
      }

      console.warn('No se encontró rol. Devolviendo "Usuario".');
      console.log('ms:', Math.round(performance.now() - started));
      console.groupEnd();
      return 'Usuario';
    } catch (err) {
      console.error('[SharedServices.getRole] error:', err);
      console.log('ms:', Math.round(performance.now() - started));
      console.groupEnd();
      return 'Usuario';
    }
  }
}


