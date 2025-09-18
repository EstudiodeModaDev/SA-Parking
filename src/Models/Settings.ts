import type { SettingsService } from "../Services/Setting.service";

export type FormState = {
  VisibleDays: number;
  TyC: string;                         // Términos y Condiciones (HTML)
  InicioHorarioMa_x00f1_ana: number;   // 0..11 (AM)
  FinalMa_x00f1_ana: number;           // 1..12 (AM fin)
  InicioTarde: number;                 // 12..23 (PM)
  FinalTarde: number;                  // 12..23 (PM fin)
};

// Props: recibes el servicio desde App via contexto
export type Props = {
  settingsSvc: SettingsService;
  // Opcional: id del item de settings (por defecto '1')
  settingsItemId?: string;
};