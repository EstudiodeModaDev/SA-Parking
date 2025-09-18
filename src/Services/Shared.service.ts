// src/services/SharedServices.ts
import { UsuariosParkingService } from './UsuariosParking.service';

export const norm = (s: unknown) => String(s ?? '').trim().toUpperCase();

export class SharedServices {
  private usuariosSvc: UsuariosParkingService;

  constructor(usuariosSvc: UsuariosParkingService) {
    this.usuariosSvc = usuariosSvc;
  }

  public async getRole(userEmail: string): Promise<string> {
    const started = performance.now();
    const raw = String(userEmail ?? '');
    if (!raw) {
      return 'Usuario';
    }

    // Escapa comillas (OData)
    const emailSafe = raw.replace(/'/g, "''");
    const emailLower = emailSafe.toLowerCase();
    try {
      // 1) intenta por Correo (recomendado)
      const filterCorreo = `fields/Title eq '${emailLower}'`;
      const porCorreo = await this.usuariosSvc.getAll({
        filter: filterCorreo,
        top: 1,
      }) as any[];

      const first = Array.isArray(porCorreo) ? porCorreo[0] : null;

      if (first?.Rol) {
        const rol = String(first.Rol);
        return rol;
      }

      // 2) fallback: si el correo lo guardan en Title
      const filterTitle = `tolower(fields/Title) eq '${emailLower}'`;

      const porTitle = await this.usuariosSvc.getAll({
        filter: filterTitle,
        top: 1,
      }) as any[];

      const alt = Array.isArray(porTitle) ? porTitle[0] : null;

      if (alt?.Rol) {
        const rol = String(alt.Rol);
        return rol;
      }

      return 'Usuario';
    } catch (err) {
      console.log('ms:', Math.round(performance.now() - started));
      return 'Usuario';
    }
  }

  public async getPermitted(userEmail: string): Promise<boolean> {
    const started = performance.now();
    const raw = String(userEmail ?? '');
    if (!raw) {
      console.warn('[SharedServices.getPermitted] userEmail vacío -> "Usuario"');
      return false;
    }

    // Escapa comillas (OData)
    const emailSafe = raw.replace(/'/g, "''");
    const emailLower = emailSafe.toLowerCase();

    console.groupCollapsed('[SharedServices.getPermitted] start');
    console.log('input userEmail:', raw);
    console.log('emailSafe:', emailSafe);
    console.log('emailLower:', emailLower);

    try {
      // 1) intenta por Correo (recomendado)
      const filterCorreo = `fields/Title eq '${emailLower}'`;
      console.log('-> query por Correo:', { filter: filterCorreo, orderby: 'fields/Title asc', top: 1 });

      const porCorreo = await this.usuariosSvc.getAll({
        filter: filterCorreo,
        top: 1,
      }) as any[];

      console.log('respuesta por Correo:', porCorreo);
      const first = Array.isArray(porCorreo) ? porCorreo[0] : null;
      console.log('first (Correo):', first);

      if (first?.Permitidos) {
        const Permitidos = first.Permitidos;
        console.log('Permitidos encontrado por Correo:', Permitidos);
        console.log('ms:', Math.round(performance.now() - started));
        console.groupEnd();
        return Permitidos;
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

      if (alt?.Permitidos) {
        const Permitidos = alt.Permitidos;
        console.log('ROL encontrado por Title:', Permitidos);
        console.log('ms:', Math.round(performance.now() - started));
        console.groupEnd();
        return Permitidos;
      }

      console.warn('No se encontró rol. Devolviendo "Usuario".');
      console.log('ms:', Math.round(performance.now() - started));
      console.groupEnd();
      return false;
    } catch (err) {
      console.error('[SharedServices.getPermitted] error:', err);
      console.log('ms:', Math.round(performance.now() - started));
      console.groupEnd();
      return false;
    }
  }
}





