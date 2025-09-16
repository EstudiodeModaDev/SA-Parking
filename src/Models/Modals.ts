import type { SlotUI } from "./Celdas";
import type { Collaborator, NewCollaborator } from "./colaboradores";

export type Props = {
  isOpen: boolean;
  onClose: () => void;
  collaborator?: Collaborator | null; // si viene null/undefined, no se muestra contenido
  onSave?: (c: NewCollaborator & { celda?: string }) => void; // <-- string
  slots?: SlotUI[];
  slotsLoading?: boolean;

};