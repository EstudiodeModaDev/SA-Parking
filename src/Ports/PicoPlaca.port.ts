// ports/PicoPlaca.port.ts
import { PicoYPlacaService } from '../Services/PicoPlaca';

export type PicoPlacaRow = {
  ID: string;        // string por consistencia con Graph item.id
  Title: string;     // "1".."5" (Lun..Vie)
  Moto: string;      // "6,9" etc.
  Carro: string;     // "6,9" etc.
};

export type PicoPlacaPort = {
  getAll: () => Promise<PicoPlacaRow[]>;
  update: (id: string, changes: Partial<Pick<PicoPlacaRow, 'Moto' | 'Carro'>>) => Promise<void>;
};

export function makePicoPlacaPort(svc: PicoYPlacaService): PicoPlacaPort {
  if (!svc) throw new Error('PicoyPlacaService no inicializado');

  const toRow = (i: any): PicoPlacaRow => ({
    ID: String(i.ID ?? i.Id ?? i.id ?? ''),
    Title: String(i.Title ?? i.title ?? ''),
    Moto: String(i.Moto ?? i.moto ?? ''),
    Carro: String(i.Carro ?? i.carro ?? ''),
  });

  return {
    async getAll() {
      // Graph service devuelve array directo
      const items = await svc.getAll({ top: 2000, orderby: 'fields/Title asc' });
      const rows = (Array.isArray(items) ? items : []).map(toRow);
      // Asegura orden numérico por Title por si el display es string
      rows.sort((a, b) => Number(a.Title) - Number(b.Title));
      return rows;
    },

    async update(id, changes) {
      const payload: any = {};
      if (changes.Moto !== undefined)  payload.Moto  = changes.Moto;
      if (changes.Carro !== undefined) payload.Carro = changes.Carro;
      await svc.update(String(id), payload);
    },
  };
}
