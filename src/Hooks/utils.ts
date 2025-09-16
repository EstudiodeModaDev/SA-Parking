const DAY_LABEL: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

const VALID_PLATE_PATTERN = /^(\s*[0-9]\s*(,\s*[0-9]\s*)*)?$/;

export const normalizeResult = (res: any) => {
  const ok = ('ok' in res) ? res.ok : (('success' in res) ? res.success : true);
  const data = ('value' in res) ? res.value : (('data' in res) ? res.data : res);
  return { ok, data, errorMessage: res?.errorMessage ?? res?.error?.message };
};

export function dayLabel(title: string){
  const n = Number(title);
  return Number.isFinite(n) && DAY_LABEL[n] ? DAY_LABEL[n] : `Día ${title}`;
}

//Validar patron (numero , numero)
export function isValidPattern(v: string) {
  return VALID_PLATE_PATTERN.test(v);
}