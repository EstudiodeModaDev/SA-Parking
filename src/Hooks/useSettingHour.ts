import * as React from "react";
import { makeSettingsPortSingle } from "../Ports/settingsPort"

export type Hours = {
  InicioManana: number;
  FinalManana: number;
  InicioTarde: number;
  FinalTarde: number;
};

export function useSettingsHours() {
  const [hours, setHours] = React.useState<Hours | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancel = false;
    const port = makeSettingsPortSingle();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const rec = await port.getOne();
        if (!cancel) {
          setHours({
            InicioManana: rec.InicioManana,
            FinalManana: rec.FinalManana,
            InicioTarde: rec.InicioTarde,
            FinalTarde: rec.FinalTarde,
          });
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? "No se pudieron cargar los horarios");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  return { hours, loading, error };
}
