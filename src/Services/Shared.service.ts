// src/services/SharedServices.ts
import { UsuariosParkingService } from './UsuariosParking.service';
import type { UsuariosParking } from '../Models/UsuariosParking';

export const norm = (s: unknown) => String(s ?? '').trim().toUpperCase();

export class SharedServices {
  private usuariosSvc: UsuariosParkingService;

  constructor(usuariosSvc: UsuariosParkingService) {
    this.usuariosSvc = usuariosSvc;
  }

  public async getRole(userEmail: string): Promise<UsuariosParking | null> {
    const started = performance.now();
    const raw = String(userEmail ?? '').trim();
    if (!raw) return null;

    // Escapar comillas y normalizar a lower para tolower(...)
    const emailLower = raw.replace(/'/g, "''").toLowerCase();

    try {
      // Un solo query por Title insensible a mayúsculas/minúsculas
      // (Tu servicio mapea a { ID, Title, Rol } en toModel)
      console.log("Iniciando busqueda")
      const users = await this.usuariosSvc.getAll({
        filter: `tolower(fields/Title) eq '${emailLower}'`,
        top: 1,
      });
      
      console.log("Objeto encontrado:", users)


      const u = Array.isArray(users) ? users[0] : null;
      return u ?? null;
    } catch (err) {
      console.log('getRole(ms):', Math.round(performance.now() - started), err);
      return null;
    }
  }
}
