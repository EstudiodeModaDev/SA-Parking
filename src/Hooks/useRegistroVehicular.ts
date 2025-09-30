// src/hooks/useCollaborators.ts
import * as React from 'react';
import type { RegistroVehicularMail, RegistroVehicularSP } from '../Models/RegistroVehicular';
import type { RegistroVehicularService } from '../Services/RegistroVehicular.service';

// ---- Mapeo item → UI ----
const mapToCollaborator = (r: any): RegistroVehicularSP => ({
  id: Number(r.ID ?? r.Id ?? r.id ?? 0),
  Title: String(r.Title ?? r.title ?? ''),
  TipoVeh: (r.TipoVeh ?? r.tipoVehiculo) as any,
  PlacaVeh: String(r.PlacaVeh ?? r.placa ?? ''),
  CorreoReporte: String(r.CorreoReporte ?? ''),
  Cedula: String(r.Cedula ?? '')
});

// ---- Normalización: sin acentos, case-insensitive ----
const normalize = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

// ---- Filtro CLIENTE: SOLO nombre y correo ----
function filterLocal(items: RegistroVehicularSP[], term: string): RegistroVehicularSP[] {
  const q = normalize(term).trim();
  if (!q) return items;
  const parts = q.split(/\s+/).filter(Boolean);
  if (!parts.length) return items;

  return items.filter((it: RegistroVehicularSP) => {
    const name = normalize(it.Title);
    const mail = normalize(it.CorreoReporte);
    // todas las palabras del término deben aparecer en nombre O correo
    return parts.every((p) => name.includes(p) || mail.includes(p));
  });
}

export type useRegistroVehicularReturn = {
  rows: RegistroVehicularSP[];
  loading: boolean;
  error: string | null;

  search: string;
  setSearch: (s: string) => void;

  pageSize: number;
  setPageSize: (n: number) => void;
  pageIndex: number;
  hasNext: boolean;
  nextPage: () => void;
  prevPage: () => void;

  reloadAll: (termArg?: string) => Promise<void>;
  addVeh: (c: RegistroVehicularSP) => Promise<void>;
  deleteVeh: (id: string | number) => Promise<void>;
};

export function useRegistroVehicular(
  svc: RegistroVehicularService
): useRegistroVehicularReturn {
  const [allRows, setAllRows] = React.useState<RegistroVehicularSP[]>([]);
  const [rows, setRows] = React.useState<RegistroVehicularSP[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState('');
  const [pageSize, _setPageSize] = React.useState(5);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [hasNext, setHasNext] = React.useState(false);

  // Maestro en memoria para filtrar en cliente
  const masterRef = React.useRef<RegistroVehicularSP[]>([]);

  // ---------- CRUD ----------
  const deleteVeh = React.useCallback(
    async (id: string | number) => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);

        await svc.delete(String(id));
        reloadAll()
      } catch (e: any) {
        console.error('[useCollaborators] deleteCollaborator error:', e);
        setError(e?.message ?? 'Error al eliminar colaborador');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [svc, pageIndex, pageSize, search]
  );

  const addVeh = React.useCallback(
    async (c: RegistroVehicularSP) => {
      try {
        setLoading(true);
        setError(null);

        const newRegister: Partial<RegistroVehicularSP> = {
          Title: c.Title,
          CorreoReporte: c.CorreoReporte,
          TipoVeh: c.TipoVeh,
          PlacaVeh: c.PlacaVeh
        };

        const created = await svc.create(newRegister as any);

        const ui: RegistroVehicularSP = created
          ? {
              id: Number((created as any).ID ?? Date.now()),
              Title: String((created as any).Title ?? c.Title),
              CorreoReporte: String((created as any).Correo ?? c.CorreoReporte),
              TipoVeh: ((created as any).Tipodevehiculo ?? c.TipoVeh) as any,
              PlacaVeh: String((created as any).Placa ?? c.PlacaVeh),
              Cedula: String((created as any).Placa ?? c.Cedula),
            }
          : {
              id: Date.now(),
              Title: c.TipoVeh,
              CorreoReporte: c.CorreoReporte,
              TipoVeh: c.TipoVeh as any,
              PlacaVeh: c.PlacaVeh,
              Cedula: String((created as any).Placa ?? c.Cedula),
            };

        masterRef.current = [ui, ...masterRef.current];

        const filtered = filterLocal(masterRef.current, search);
        setAllRows(filtered);
        setRows(filtered.slice(0, pageSize));
        setHasNext(filtered.length > pageSize);
        setPageIndex(0);
      } catch (e: any) {
        console.error('[useCollaborators] addCollaborator error:', e);
        setError(e?.message ?? 'No se pudo agregar el colaborador');
      } finally {
        setLoading(false);
      }
    },
    [svc, pageSize, search]
  );

  // ---------- Carga (SIN $filter; todo el filtro en cliente) ----------
  const reloadAll = React.useCallback(
    async (termArg?: string) => {
      setLoading(true);
      setError(null);
      try {
        const MAX_FETCH = 2000;
        const items = await svc.getAll({
          top: MAX_FETCH,
          orderby: 'fields/Title asc', // opcional
        });

        console.log("Registro ", items)
        const master: RegistroVehicularSP[] = (items as any[]).map(mapToCollaborator);
        masterRef.current = master;

        const term = typeof termArg === 'string' ? termArg : search;
        const filtered = filterLocal(master, term);

        setAllRows(filtered);
        setRows(filtered.slice(0, pageSize));
        setPageIndex(0);
        setHasNext(filtered.length > pageSize);
      } catch (e: any) {
        console.error('[useCollaborators] reloadAll error:', e);
        setAllRows([]);
        setRows([]);
        setError(e?.message ?? 'Error al cargar colaboradores');
        setHasNext(false);
      } finally {
        setLoading(false);
      }
    },
    [svc, pageSize]
  );

  // ---------- Paginación ----------
  const setPageSize = React.useCallback(
    (n: number) => {
      const size = Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
      _setPageSize(size);
      const slice = allRows.slice(0, size);
      setRows(slice);
      setPageIndex(0);
      setHasNext(allRows.length > size);
    },
    [allRows]
  );

  const nextPage = React.useCallback(() => {
    if (loading) return;
    const next = pageIndex + 1;
    const start = next * pageSize;
    const end = start + pageSize;
    if (start >= allRows.length) return;
    setRows(allRows.slice(start, end));
    setPageIndex(next);
    setHasNext(end < allRows.length);
  }, [loading, pageIndex, pageSize, allRows]);

  const prevPage = React.useCallback(() => {
    if (loading || pageIndex === 0) return;
    const prev = pageIndex - 1;
    const start = prev * pageSize;
    const end = start + pageSize;
    setRows(allRows.slice(start, end));
    setPageIndex(prev);
    setHasNext(allRows.length > end);
  }, [loading, pageIndex, pageSize, allRows]);

  // ---------- Búsqueda con debounce (no bloquea escritura) ----------
  const debounceRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const filtered = filterLocal(masterRef.current, search);
      setAllRows(filtered);
      setRows(filtered.slice(0, pageSize));
      setPageIndex(0);
      setHasNext(filtered.length > pageSize);
    }, 250) as unknown as number;

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [search, pageSize]);

  // ---------- Carga inicial ----------
  React.useEffect(() => {
    let cancel = false;
    (async () => { if (!cancel) await reloadAll(''); })();
    return () => { cancel = true; };
  }, [reloadAll]);

  return {
    rows,
    loading,
    error,

    search,
    setSearch,

    pageSize,
    setPageSize,
    pageIndex,
    hasNext,
    nextPage,
    prevPage,

    reloadAll,
    addVeh,
    deleteVeh,
  };
}

export async function sendRegistroVehicularEmail(
  graph: any, // MicrosoftGraph.Client
  data: RegistroVehicularMail
): Promise<void> {
  const {
    correo,
    nombre,
    tipoVehiculo,
    placa,
    cedula,
    cc = [],
    solicitanteNombre,
    solicitanteCorreo,
  } = data;

  // Asunto
  const subject = `Solicitud de inscripción de vehículo — ${nombre} (${placa})`;

  // Cuerpo HTML (formal)
  const html = buildHtml({
    nombre,
    tipoVehiculo,
    placa,
    cedula,
    solicitanteNombre,
    solicitanteCorreo,
  });

  // Armar destinatarios
  const toRecipients = [{ emailAddress: { address: correo } }];
  const ccRecipients =
    cc?.length ? cc.map((c) => ({ emailAddress: { address: c } })) : [];

  // Enviar usando /me/sendMail (permiso delegado)
  // Si tu app envía como buzón de servicio, usa `/users/{id|upn}/sendMail`.
  await graph.api('/me/sendMail').post({
    message: {
      subject,
      body: { contentType: 'HTML', content: html },
      toRecipients,
      ccRecipients,
    },
    saveToSentItems: true,
  });
}

/* ==================== Helper HTML ==================== */

function esc(s?: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml(p: {
  nombre: string;
  tipoVehiculo: string;
  placa: string;
  cedula: string;
  solicitanteNombre?: string;
  solicitanteCorreo?: string;
}): string {
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#0f172a;line-height:1.6">
    <p>Estimado(a),</p>

    <p>
      Muy respetuosamente solicito la <strong>inscripción del vehículo</strong> del colaborador
      <strong>${esc(p.nombre)}</strong>, con la siguiente información:
    </p>

    <table style="border-collapse:collapse;margin:12px 0;border:1px solid #e2e8f0">
      <tbody>
        <tr>
          <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0">Tipo de vehículo</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${esc(p.tipoVehiculo)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0">Placa</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${esc(p.placa.toUpperCase())}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0">Cédula</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${esc(p.cedula)}</td>
        </tr>
      </tbody>
    </table>

    <p>
      Agradezco confirmar la actualización correspondiente o indicarnos si se requiere información adicional.
    </p>

    <p>Cordialmente,</p>
  </div>
  `;
}
