const fs = require('fs');
const os = require('os');
const path = require('path');

const csv = '\ufeffDATE;CUSTOMER NAME;CUSTOMER PO;COLOR;PO QTY;DEST\n2026-08-22;"ABC; Fashion";PO-7788;BLACK;50;France\n2026-08-22;"ABC; Fashion";PO-7788;BLACK;50;France\n2026-08-23;ABC Fashion;PO-7788;WHITE;25;Belgique\n';
const fixture = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ruba-csv-')), 'Delivery plan.csv');
fs.writeFileSync(fixture, csv, 'utf8');

function parseLine(line, delimiter) {
  const values = []; let value = ''; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { value += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === delimiter && !quoted) { values.push(value.trim()); value = ''; continue; }
    value += char;
  }
  values.push(value.trim()); return values;
}
const text = fs.readFileSync(fixture, 'utf8').replace(/^\uFEFF/, '');
const lines = text.split(/\r?\n/).filter(line => line.trim());
const delimiters = [';', ',', '\t'];
const delimiter = delimiters.map(candidate => ({ candidate, count: parseLine(lines[0], candidate).length })).sort((a, b) => b.count - a.count)[0].candidate;
const matrix = lines.map(line => parseLine(line, delimiter));
const headers = matrix[0].map(value => value.toLowerCase().replace(/\s+/g, ' ').trim());
const data = matrix.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
const unique = new Set(data.map(row => JSON.stringify(row)));
if (delimiter !== ';' || data.length !== 3 || unique.size !== 2 || data[0]['customer name'] !== 'ABC; Fashion' || data[2]['color'] !== 'WHITE') {
  throw new Error(`CSV smoke test failed: delimiter=${delimiter}, rows=${data.length}, unique=${unique.size}`);
}
console.log(JSON.stringify({ ok: true, delimiter, parsedRows: data.length, uniqueRows: unique.size, quotedField: data[0]['customer name'] }));
fs.rmSync(path.dirname(fixture), { recursive: true, force: true });
