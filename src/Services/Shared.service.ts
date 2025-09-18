// src/services/SharedServices.ts
import { UsuariosParkingService } from './UsuariosParking.service';

export const norm = (s: unknown) => String(s ?? '').trim().toUpperCase();

// Helpers mínimos para no cambiar tu flujo
const rowsFrom = (res: any): any[] =>
  (res?.data ?? res?.value ?? (Array.isArray(res) ? res : [])) as any[];

const firstRecord = (res: any) => {
  const rows = rowsFrom(res);
  const r = rows[0];
  // Si la API expandió fields, úsalo; si no, usa el objeto directo
  return (r?.fields ?? r ?? null) as any | null;
};

export class SharedServices {
  private usuariosSvc: UsuariosParkingService;

  constructor(usuariosSvc: UsuariosParkingService) {
    this.usuariosSvc = usuariosSvc;
  }


  public async getRole(userEmail: string): Promise<string> {
    const started = performance.now();
    const raw = String(userEmail ?? '');
    if (!raw) return 'Usuario';

    const emailLower = raw.replace(/'/g, "''").toLowerCase();

    try {
      // 1) "Correo": mantenemos tu primer intento, pero robusto al casing
      const filterCorreo = `tolower(fields/Title) eq '${emailLower}'`; // FIX: tolower(...)
      const porCorreo = await this.usuariosSvc.getAll({
        filter: filterCorreo,
        top: 1,
      });

      const first = firstRecord(porCorreo); // FIX: normaliza fields/value
      if (first && typeof first.Rol !== 'undefined') {
        return String(first.Rol);
      }

      // 2) Fallback por Title (queda igual, pero mismo filtro robusto)
      const filterTitle = `tolower(fields/Title) eq '${emailLower}'`;
      const porTitle = await this.usuariosSvc.getAll({
        filter: filterTitle,
        top: 1,
      });

      const alt = firstRecord(porTitle); // FIX
      if (alt && typeof alt.Rol !== 'undefined') {
        return String(alt.Rol);
      }

      return 'Usuario';
    } catch (err) {
      console.log('ms:', Math.round(performance.now() - started));
      return 'Usuario';
    }
  }

  /**
   * Devuelve si el usuario está permitido (manteniendo tu lógica).
   */
  public async getPermitted(userEmail: string): Promise<boolean> {
    const started = performance.now();
    const raw = String(userEmail ?? '');
    if (!raw) {
      console.warn('[SharedServices.getPermitted] userEmail vacío -> false');
      return false;
    }

    const emailLower = raw.replace(/'/g, "''").toLowerCase();

    console.groupCollapsed('[SharedServices.getPermitted] start');
    console.log('input userEmail:', raw);
    console.log('emailLower:', emailLower);

    try {
      // 1) "Correo": mismo filtro robusto
      const filterCorreo = `tolower(fields/Title) eq '${emailLower}'`;
      console.log('-> query por Correo:', { filter: filterCorreo, top: 1 });

      const porCorreo = await this.usuariosSvc.getAll({
        filter: filterCorreo,
        top: 1,
      });

      const first = firstRecord(porCorreo); // FIX
      console.log('first (Correo):', first);

      // FIX: no uses truthiness (false es válido)
      if (first && ('Permitidos' in first || 'permitidos' in first || 'Permitido' in first)) {
        const v = first.Permitidos ?? first.permitidos ?? first.Permitido;
        const ok = v === true || v === 1 || String(v).toLowerCase() === 'true';
        console.log('Permitidos (Correo):', ok);
        console.log('ms:', Math.round(performance.now() - started));
        console.groupEnd();
        return ok;
      }

      // 2) Fallback por Title (mismo filtro)
      const filterTitle = `tolower(fields/Title) eq '${emailLower}'`;
      console.log('-> query por Title:', { filter: filterTitle, top: 1 });

      const porTitle = await this.usuariosSvc.getAll({
        filter: filterTitle,
        top: 1,
      });

      const alt = firstRecord(porTitle); // FIX
      console.log('first (Title):', alt);

      if (alt && ('Permitidos' in alt || 'permitidos' in alt || 'Permitido' in alt)) {
        const v = alt.Permitidos ?? alt.permitidos ?? alt.Permitido;
        const ok = v === true || v === 1 || String(v).toLowerCase() === 'true';
        console.log('Permitidos (Title):', ok);
        console.log('ms:', Math.round(performance.now() - started));
        console.groupEnd();
        return ok;
      }

      console.warn('No se encontró campo Permitidos. Devolviendo false.');
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
