// src/services/SharedServices.ts
import type { UsuariosParking } from '../Models/UsuariosParking';
import { UsuariosParkingService } from './UsuariosParking.service';

export const norm = (s: unknown) => String(s ?? '').trim().toUpperCase();

export class SharedServices {
  private usuariosSvc: UsuariosParkingService;

  constructor(usuariosSvc: UsuariosParkingService) {
    this.usuariosSvc = usuariosSvc;
  }


  public async getRole(userEmail: string): Promise<UsuariosParking | null> {
    const started = performance.now();
    const raw = String(userEmail ?? '');
    if (!raw) {
      console.warn('[SharedServices.getRole] userEmail vacío -> "Usuario"');
      return null;
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
      const filterCorreo = `fields/Title eq '${emailLower}'`;
      console.log('-> query por Correo:', { filter: filterCorreo, orderby: 'fields/Title asc', top: 1 });

      const porCorreo = await this.usuariosSvc.getAll({
        filter: filterCorreo,
        top: 1,
      }) as any[];

      console.log('respuesta por Correo:', porCorreo);
      const first = Array.isArray(porCorreo) ? porCorreo[0] : null;
      console.log('first (Correo):', first);

      if (first?.Rol) {
        const objeto = first;
        console.log('objeto encontrado por Correo:', objeto);
        console.log('ms:', Math.round(performance.now() - started));
        console.groupEnd();
        return objeto;
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
        const objeto = alt;
        console.log('objeto encontrado por Title:', objeto);
        console.log('ms:', Math.round(performance.now() - started));
        console.groupEnd();
        return objeto;
      }

      console.warn('No se encontró rol. Devolviendo "Usuario".');
      console.log('ms:', Math.round(performance.now() - started));
      console.groupEnd();
      return null;
    } catch (err) {
      console.error('[SharedServices.getRole] error:', err);
      console.log('ms:', Math.round(performance.now() - started));
      console.groupEnd();
      return null;
    }
  }
}








