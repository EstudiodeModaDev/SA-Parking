//Nombre sin mayusculas o tildes
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");

// Lista base 
const NO_NAMES = ["practicante","aprendiz","auxiliar","admin","administrativa","administrativo","callcenter","facturas","cedi","facturacion"];

// Precalcula normalizados
const NO_NAMES_NORM = NO_NAMES.map(normalize);

export async function nameProve(name: string): Promise<boolean> {
  const raw = (name ?? "").trim();
  if (!raw) return false;


  const n = normalize(raw);

  // 1) Coincidencia por palabra completa (tokens)
  const tokens = n.split(/[^\p{L}\d]+/u).filter(Boolean);
  const tokenSet = new Set(tokens);

  for (const bad of NO_NAMES_NORM) {
    if (tokenSet.has(bad)) return false; // palabra exacta
  }

  // 2) Fallback por substring (por si viene pegado: "facturascorreo")
  for (const bad of NO_NAMES_NORM) {
    if (n.includes(bad)) return false;
  }

  return true;
}
