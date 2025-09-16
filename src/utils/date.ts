const pad2 = (n: number) => ('0' + n).slice(-2);

export const ymdLocal = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const last30Days = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { from: ymdLocal(start), to: ymdLocal(end) };
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const toISODate = (d: Date | null) => d ? d.toISOString().slice(0, 10) : '';
export const todayISO = () => new Date().toISOString().slice(0, 10)