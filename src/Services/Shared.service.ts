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
    const raw = String(userEmail ?? '');
    if (!raw) {
      return null;
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
        const objeto = first;
        return objeto;
      }

      // 2) fallback: si el correo lo guardan en Title
      const filterTitle = `tolower(fields/Title) eq '${emailLower}'`;

      const porTitle = await this.usuariosSvc.getAll({
        filter: filterTitle,
        top: 1,
      }) as any[];

      const alt = Array.isArray(porTitle) ? porTitle[0] : null;

      if (alt?.Rol) {
        const objeto = alt;
        return objeto;
      }
      return null;
    } catch (err) {
      return null;
    }
  }
}








