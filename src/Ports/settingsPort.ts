// adapters/settingsPort.ts (PORT para Graph)
import { SettingsService } from '../Services/Setting.service';

// UI model
export type SettingsForm = {
  VisibleDays: number;
  TyC: string;
  InicioManana: number;
  FinalManana: number;
  InicioTarde: number;
  FinalTarde: number;
  PicoPlaca: boolean;
};

// UI + ID
export type SettingsRecord = SettingsForm & { ID: string };

export type SettingsPort = {
  getOne: () => Promise<SettingsRecord>;
  update: (id: string, changes: Partial<SettingsForm>) => Promise<void>;
};

// OJO: este port depende de que tu SettingsService (Graph) ya
// haga el mapeo de internal names => nombres limpios en `toModel`
export function makeSettingsPortSingle(svc?: SettingsService): SettingsPort {
  // si prefieres, inyecta el service por fuera; si no, importa tu singleton aquí
  if (!svc) throw new Error('SettingsService no inicializado');

  return {
    async getOne() {
      // 1) intenta traer el primer registro
      const rows = await svc.getAll({ top: 1, orderby: 'fields/ID asc' });
      if (!rows || rows.length === 0) {
        // 2) si no existe, crea uno con defaults
        const created = await svc.create({
          VisibleDays: 7,
          TyC: '',
          InicioManana: 7,
          FinalManana: 12,
          InicioTarde: 12,
          FinalTarde: 18,
          PicoPlaca: false,
        } as any);
        return {
          ID: String(created.ID),
          VisibleDays: Number(created.VisibleDays ?? 7),
          TyC: String((created as any).TyC ?? (created as any).TerminosyCondiciones ?? ''),
          InicioManana: Number(created.InicioManana ?? 7),
          FinalManana: Number(created.FinalManana ?? 12),
          InicioTarde: Number(created.InicioTarde ?? 12),
          FinalTarde: Number(created.FinalTarde ?? 18),
          PicoPlaca: Boolean(created.PicoPlaca ?? false),
        };
      }

      const rec: any = rows[0];
      return {
        ID: String(rec.ID),
        VisibleDays: Number(rec.VisibleDays ?? 7),
        TyC: String(rec.TyC ?? rec.TerminosyCondiciones ?? ''),
        InicioManana: Number(rec.InicioManana ?? 7),
        FinalManana: Number(rec.FinalManana ?? 12),
        InicioTarde: Number(rec.InicioTarde ?? 12),
        FinalTarde: Number(rec.FinalTarde ?? 18),
        PicoPlaca: Boolean(rec.PicoPlaca ?? false),
      };
    },

    async update(id, changes) {
      // El service Graph acepta nombres limpios (mapeados internamente)
      const payload: any = {};
      if (changes.VisibleDays !== undefined) payload.VisibleDays = changes.VisibleDays;
      if (changes.TyC !== undefined) payload.TyC = changes.TyC; // o TerminosyCondiciones, según tu mapper
      if (changes.InicioManana !== undefined) payload.InicioManana = changes.InicioManana;
      if (changes.FinalManana !== undefined) payload.FinalManana = changes.FinalManana;
      if (changes.InicioTarde !== undefined) payload.InicioTarde = changes.InicioTarde;
      if (changes.FinalTarde !== undefined) payload.FinalTarde = changes.FinalTarde;
      if (changes.PicoPlaca !== undefined) payload.PicoPlaca = changes.PicoPlaca;

      await svc.update(id, payload);
    },
  };
}
