import * as React from 'react';
import type { Filtros } from '../Models/Reportes';
import { todayISO } from '../utils/date';  
import type { RegistroVehicularSP } from '../Models/RegistroVehicular';
import type { RegistroVehicularService } from '../Services/RegistroVehicular.service';


export function useReporteria(
  registros: RegistroVehicularService
) {
  const [load, setLoad] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // datos
  const [rows, setRows] = React.useState<RegistroVehicularSP[]>([]);

  // filtros
  const [filters, setFilters] = React.useState<Filtros>({
    desde: todayISO(),
    hasta: todayISO(),
    persona: '',
    tipoVehiculo: '',
  });

  const onChange = (patch: Partial<Filtros>) =>
    setFilters(prev => ({ ...prev, ...patch }));

  // ---------- Carga reservas según filtros ----------
  const loadRegistros = React.useCallback(async () => {
    const { desde, hasta, persona, tipoVehiculo } = filters;

    const parts: string[] = [
      `fields/Created ge '${desde}'`,
      `fields/Created le '${hasta}'`,
    ];

    if (tipoVehiculo) {
      parts.push(`fields/TipeVeh eq '${String(tipoVehiculo).replace(/'/g, "''")}'`);
    }

    if (persona?.trim()) {
      const p = persona.trim().toLowerCase().replace(/'/g, "''");
      parts.push(
        `contains(tolower(fields/Title),'${p}')`
      );
    }

    const items = await registros.getAll({
      filter: parts.join(' and '),
      orderby: 'fields/Created',
      top: 2000,
    });

    // map a tu UI (usa las propiedades que tu servicio ya mapea)
    const mapped: RegistroVehicularSP[] = items.map((r: any) => ({
      id: Number(r.ID ?? r.Id ?? 0),
      Title: String(r.Title ?? '').slice(0, 10),
      CorreoReporte: String(r.CorreoReporte ?? ''),
      TipoVeh: r.TipoVeh,
      PlacaVeh: String(r.PlacaVeh),
      Cedula: (r.Cedula),
    }));

    setRows(mapped);
  }, [filters, registros]);


  // ---------- Carga inicial ----------
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoad(true);
        setError(null);
        await loadRegistros();
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? 'Error cargando reportería');
      } finally {
        if (!cancel) setLoad(false);
      }
    })();
    return () => { cancel = true; };
  }, [loadRegistros]);

  // ---------- Re-carga al cambiar filtros ----------
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoad(true);
        setError(null);
        await loadRegistros();
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? 'Error cargando reservas');
      } finally {
        if (!cancel) setLoad(false);
      }
    })();
    return () => { cancel = true; };
  }, [loadRegistros]);

  return {
    // estado
    load, error, rows, 
    // filtros
    filters, setFilters, onChange,
    // loaders expuestos
    loadRegistros
  };
}
