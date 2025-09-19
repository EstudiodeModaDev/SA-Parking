import type { VehicleType } from '../Models/shared';
import type { Assignee } from '../Models/Celdas';
import { ColaboradoresFijosService } from '../Services/Colaboradoresfijos.service'; // 100% Graph

const MAX = 2000;
const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

/**
 * QUIÉN tiene asignado un slot específico
 */
export async function fetchAssignee(
  svc: ColaboradoresFijosService,
  slotId: number
): Promise<Assignee> {
  if (!slotId) return null;

  const rows = await svc.getAll({
    // SpotAsignado es numérico (ajusta si es texto)
    filter: `fields/SpotAsignado eq ${Number(slotId)}`,
    top: 1,
    orderby: 'fields/Title asc',
  });

  const r = rows?.[0];
  if (!r) return null;

  return {
    id: Number((r as any).ID ?? ''),              // el mapper ya te dio ID
    name: String((r as any).Title ?? ''),
    email: (r as any).Correo ?? undefined,        // fallback si tu internal es otro
    slotAsignado: (r as any).SpotAsignado ?? null
  };
}

/**
 * ASIGNAR un slot a un colaborador
 */
export async function assignSlotToCollaborator(
  svc: ColaboradoresFijosService,
  slotId: number,
  collaboratorItemId: string | number,  // id del item en la lista
  slotTitle: string
): Promise<void> {
  if (!slotId || !collaboratorItemId) {
    throw new Error('Parámetros inválidos para asignación.');
  }
  await svc.update(String(collaboratorItemId), {
    SpotAsignado: Number(slotId),
    CodigoCelda: slotTitle,
  } as any);
}

/**
 * DESASIGNAR una celda (por slot)
 */
export async function unassignSlotFromCollaborator(
  svc: ColaboradoresFijosService,
  slotId: number
): Promise<void> {
  if (!slotId) throw new Error('ID de celda inválido.');
  const current = await fetchAssignee(svc, slotId);
  if (!current) return;

  await svc.update(String(current.id), {
    SpotAsignado: null,
    CodigoCelda: null,
  } as any);
}

/**
 * Buscar colaboradores SIN asignación, con búsqueda opcional y filtro por tipo de vehículo
 * term: busca en Title o Correo (case-insensitive)
 */
export async function searchUnassignedCollaborators(
  svc: ColaboradoresFijosService,
  term: string,
  vehicleType?: VehicleType
): Promise<Assignee[]> {
  const termSafe = (term || '').replace(/'/g, "''").toLowerCase();
  const filters: string[] = [];

  // Sin asignación
  filters.push('(fields/SpotAsignado eq null)');

  // Búsqueda por texto
  if (termSafe) {
    // OData v4 en Graph usa contains() y tolower()
    filters.push(
      `(startswith(fields/Title,'${termSafe}'))`
    );
  }

  // Filtro por tipo de vehículo
  if (vehicleType) {
    const vt = String(vehicleType).replace(/'/g, "''");
    filters.push(`fields/Tipodevehiculo eq '${vt}'`);
  }

  const filterStr = filters.join(' and ');

  const rows = await svc.getAll({
    filter: filterStr,
    top: MAX,
    orderby: 'fields/Title asc',
  });

  // Defensa extra en cliente por si el backend no filtró el tipo de vehículo
  const filtered = vehicleType
    ? rows.filter((r: any) => norm(r.Tipodevehiculo) === norm(vehicleType))
    : rows;

  return filtered.map((r: any) => ({
    id: String(r.ID ?? ''),
    name: String(r.Title ?? ''),
    email: r.Correo ?? undefined,
    slotAsignado: r.SpotAsignado ?? null,
  }));
}
