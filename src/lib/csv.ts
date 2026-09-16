/** RFC 4180 fields, including quoted commas, escaped quotes, CRLF and multiline text. */
export function parseCSV(source: string): string[][] {
  const text = source.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false, closed = false;
  const pushField = () => { row.push(field); field = ''; closed = false; };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closed = true; }
      } else field += char;
    } else if (char === ',') pushField();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      pushField(); rows.push(row); row = [];
    } else if (char === '"' && !field && !closed) quoted = true;
    else {
      if (closed || char === '"') throw new Error('CSV inválido: revisa las comillas.');
      field += char;
    }
  }
  if (quoted) throw new Error('CSV incompleto: falta cerrar una comilla.');
  if (field || row.length || closed) { pushField(); rows.push(row); }
  return rows.filter(r => r.some(value => value !== ''));
}

export function encodeCSV(rows: (string | number | undefined)[][]): string {
  return rows.map(row => row.map(value => {
    let text = String(value ?? '');
    // Prevent spreadsheet programs from interpreting user text as a formula.
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
}

export function decodeCSVField(value: string): string {
  return /^'[=+\-@\t\r]/.test(value) ? value.slice(1) : value;
}
