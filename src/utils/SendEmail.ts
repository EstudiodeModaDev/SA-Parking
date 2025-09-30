// src/utils/sendRegistroVehicularEmail.ts
import type { RegistroVehicularMail } from '../Models/RegistroVehicular';

// Soporta tanto tu GraphRest (con .post) como el SDK (con .api().post())
type GraphLike =
  | { post: (path: string, body: any, init?: RequestInit) => Promise<any> } // GraphRest
  | { api: (path: string) => { post: (body: any) => Promise<any> } };       // SDK oficial

function isGraphRest(g: GraphLike): g is { post: (p: string, b: any, i?: RequestInit) => Promise<any> } {
  return typeof (g as any)?.post === 'function';
}

function esc(s?: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildHtml(p: {
  nombre: string;
  tipoVehiculo: string;
  placa: string;
  cedula: string;
  solicitanteNombre?: string;
  solicitanteCorreo?: string;
}): string {
  const firmaNombre = p.solicitanteNombre ?? 'Solicitante';
  const firmaCorreo = p.solicitanteCorreo ?? '';
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#0f172a;line-height:1.6">
    <p>Estimado(a),</p>
    <p>Muy respetuosamente solicito la <strong>inscripción del vehículo</strong> del colaborador
      <strong>${esc(p.nombre)}</strong>, con la siguiente información:</p>
    <table style="border-collapse:collapse;margin:12px 0;border:1px solid #e2e8f0">
      <tbody>
        <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0">Tipo de vehículo</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0">${esc(p.tipoVehiculo)}</td></tr>
        <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0">Placa</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0">${esc(p.placa.toUpperCase())}</td></tr>
        <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0">Cédula</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0">${esc(p.cedula)}</td></tr>
      </tbody>
    </table>
    <p>Agradezco confirmar la actualización correspondiente o indicarnos si se requiere información adicional.</p>
    <p>Cordialmente,</p>
    <p><strong>${esc(firmaNombre)}</strong><br/>${firmaCorreo ? `<span style="color:#334155">${esc(firmaCorreo)}</span>` : ''}</p>
  </div>`;
}

export async function sendRegistroVehicularEmail(
  graph: GraphLike, // pásale useGraphServices().graph
  data: RegistroVehicularMail
): Promise<void> {
  const {
    correo, nombre, tipoVehiculo, placa, cedula,
    cc = [], solicitanteNombre, solicitanteCorreo,
  } = data;

  const payload = {
    message: {
      subject: `Solicitud de inscripción de vehículo — ${nombre} (${placa})`,
      body: { contentType: 'HTML', content: buildHtml({ nombre, tipoVehiculo, placa, cedula, solicitanteNombre, solicitanteCorreo }) },
      toRecipients: [{ emailAddress: { address: correo } }],
      ccRecipients: cc.map(c => ({ emailAddress: { address: c } })),
    },
    saveToSentItems: true,
  };

  // Si es GraphRest (tu wrapper)
  if (isGraphRest(graph)) {
    await graph.post('/me/sendMail', payload);
    return;
  }
  // Si es SDK oficial
  await (graph as any).api('/me/sendMail').post(payload);
}
