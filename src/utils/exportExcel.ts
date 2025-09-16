import * as XLSX from 'xlsx';

export function exportRowsToExcel<T extends Record<string, any>>(rows: T[], filename = 'reporte.xlsx') {
  const data = rows.map(r => ({ ...r }));

  const ws = XLSX.utils.json_to_sheet(data);

  // Auto width simple
  const colWidths = Object.keys(data[0] ?? {}).map((key) => {
    const maxLen = data.reduce((acc, row) => {
      const v = row?.[key];
      const len = (v === null || v === undefined) ? 0 : String(v).length;
      return Math.max(acc, len, key.length);
    }, 10);
    return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
  });
  (ws as any)['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  XLSX.writeFile(wb, filename);
}
