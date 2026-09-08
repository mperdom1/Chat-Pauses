const OUTPUT_HEADERS = ['Agent', 'Ext.', 'Code', 'Activity', 'Pause Type', 'Billable?', 'Start hour', 'End hour', 'Duration'];
const SOURCE_HEADERS = ['schedulestart', 'buser', 'campaign', 'team', 'breaktype', 'schin', 'schout', 'auxscheduled', 'pnchin', 'pnchout', 'totalaux'];

const AGENTS = [
  ['5762', 'Erick Eduardo Gonzales Inestroza', 'Erick Gonzales', 'erick.gonzales', '5879', '(5879) HN-CS Erick Gonzales - Genmobile'],
  ['5990', 'Elkin Obed Lopez Padilla', 'Elkin Lopez', 'elkin.lopez', '4993', '(4993) HN-CS Elkin Lopez - Genmobile'],
  ['5921', 'Diana Clarissa Mencia Jose', 'Diana Mencia', 'diana.mencia', '4952', '(4952) HN-CS Diana Mencia - Genmobile'],
  ['5927', 'Milton Geovanny Orellana Matute', 'Milton Orellana', 'milton.orellana', '4959', '(4959) HN-CS Milton Orellana - Genmobile'],
  ['6801', 'Manoel Alejandro Silva Paredes', 'Manoel Silva', 'manoel.silva', '5906', '(5906) HN-CS Manoel Silva - Genmobile'],
  ['6688', 'Miguel Angel Velasquez Perez', 'Miguel Perez', 'miguel.perez', '5886', '(5886) HN-CS Miguel Velasquez - Genmobile'],
  ['5915', 'Angell Maybel Nuñez Maldonado', 'Angell Nunez', 'angell.nunez', '4946', '(4946) HN-CS Angell Nuñez - Genmobile'],
  ['6689', 'Keren Yireth Monroy Santiago', 'Keren Monroy', 'keren.monroy', '5888', '(5888) HN-CS Keren Monroy - Genmobile'],
  ['6499', 'Engel Joaquin Gutierrez Hernandez', 'Engel Gutierrez', 'engel.gutierrez', '5841', '(5841) HN-CS Engel Gutierrez - Genmobile'],
  ['6046', 'Rafael Alexander Fletes Padilla', 'Rafael Fletes', 'rafael.fletes', '5017', '(5017) HN-CS Rafael Fletes - Genmobile'],
  ['6118', 'Ana Paola Lezama Osorio', 'Ana Lezama', 'ana.lezama', '5045', '(5045) HN-CS Ana Lezama - Genmobile'],
  ['6850', 'Henry Yoel Rodriguez Sain', 'Henry Rodriguez', 'henry.sain', '7045', '(7045) Henry Rodriguez - Genmobile'],
  ['6843', 'Britany Gissel Amaya Lozano', 'Britany Amaya', 'britany.amaya', '7047', '(7047) Britany Amaya - Genmobile']
].map(([empId, fullName, shortName, username, extension, agent]) => ({ empId, fullName, shortName, username, extension, agent }));

const SAMPLE = `ScheduleStart\tBUser\tCampaign\tTeam\tBreakType\tSchIn\tSchOut\tAuxScheduled\tPnchIn\tPnchOut\tTotalAux
09-07-2026\terick.gonzales\tGen Mobile\tHN - Gen Mobile - 05\tLunch\t09-07-2026 12:00\t09-07-2026 12:40\t00:40\t09-07-2026 12:00\t09-07-2026 12:40\t00:40
09-07-2026\terick.gonzales\tGen Mobile\tHN - Gen Mobile - 05\tBreak\t09-07-2026 10:00\t09-07-2026 10:20\t00:20\t09-07-2026 10:02\t09-07-2026 10:22\t00:20`;

const sourceInput = document.querySelector('#sourceInput');
const resultsPanel = document.querySelector('#resultsPanel');
const fileInput = document.querySelector('#fileInput');
const dropzone = document.querySelector('#dropzone');
const fileName = document.querySelector('#fileName');
let reportRows = [];
let outputRows = [];

function normalizeHeader(value) { return value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''); }

function splitDelimited(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') { cell += '"'; index += 1; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (!quoted && character === '\t') { row.push(cell); cell = ''; continue; }
    if (!quoted && character === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; continue; }
    cell += character;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows.filter(candidate => candidate.some(value => value.trim()));
}

function parseReport(text) {
  const rawRows = splitDelimited(text.trim());
  if (!rawRows.length) throw new Error('Pega al menos una fila del reporte.');
  const firstRowHeaders = rawRows[0].map(normalizeHeader);
  const hasHeader = firstRowHeaders.includes('buser') && firstRowHeaders.includes('breaktype');
  const headers = hasHeader ? firstRowHeaders : SOURCE_HEADERS;
  if (rawRows[0].length === 1 && hasHeader === false) throw new Error('No se detectaron columnas separadas por tabulaciones. Pega el reporte completo, incluyendo sus columnas separadas por tabulaciones.');
  const required = ['buser', 'breaktype', 'pnchin', 'pnchout', 'totalaux'];
  const missing = required.filter(header => !headers.includes(header));
  if (missing.length) throw new Error(`Faltan columnas requeridas: ${missing.join(', ')}`);
  const dataRows = hasHeader ? rawRows.slice(1) : rawRows;
  return dataRows.map(values => Object.fromEntries(headers.map((header, index) => [header, (values[index] || '').trim()])));
}

function parseDate(value) {
  const match = value.match(/^(\d{1,2})[-\/]?(\d{1,2})[-\/]?(\d{4})/);
  if (!match) return null;
  const [, month, day, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateText(date) { return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`; }
function monthText(date) { return `${date.getMonth() + 1}/1/${date.getFullYear()}`; }
function weekText(date) {
  const monday = new Date(date);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  return dateText(monday);
}
function durationToSeconds(value) { const parts = value.split(':').map(Number); return (parts[0] * 3600) + (parts[1] * 60) + parts[2]; }
function durationText(value) { return value || '00:00:00'; }
function excelDuration(value) { const seconds = durationToSeconds(value); const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const remaining = seconds % 60; return `${hours ? `${hours} hour${hours === 1 ? '' : 's'} ` : ''}${minutes ? `${minutes} minute${minutes === 1 ? '' : 's'} ` : ''}${remaining ? `${remaining} second${remaining === 1 ? '' : 's'}` : ''}`.trim() || '0 seconds'; }

function activityForAux(breakType, breakNumber) {
  const normalized = breakType.trim().toLowerCase();
  if (normalized === 'break') {
    if (breakNumber === 1) return ['Break 1', '15'];
    if (breakNumber === 2) return ['Break 2', '16'];
    return ['Bath Break', 'bb'];
  }
  if (normalized === 'lunch') return ['Lunch', '10'];
  if (normalized === 'coaching(performance)') return ['Coaching', ''];
  if (normalized === 'team meeting') return ['Meeting', ''];
  return [breakType.trim(), ''];
}

function reportDateTime(value) { return value ? value.replace(/^(\d{2})-(\d{2})-(\d{4})\s+/, '$1/$2 - ') : ''; }

function buildRows(rows) {
  const byUsername = new Map(AGENTS.map(agent => [agent.username, agent]));
  const breakCounts = new Map();
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => byUsername.has(row.buser.trim().toLowerCase()) && row.breaktype.trim() && row.totalaux)
    .sort((left, right) => (left.row.pnchin || left.row.schin || '').localeCompare(right.row.pnchin || right.row.schin || '') || left.index - right.index)
    .map(({ row }) => {
      const agent = byUsername.get(row.buser.trim().toLowerCase());
      const dateKey = (row.pnchin || row.schin || row.schedulestart || '').slice(0, 10);
      const countKey = `${agent.username}|${dateKey}`;
      const breakNumber = row.breaktype.trim().toLowerCase() === 'break' ? (breakCounts.set(countKey, (breakCounts.get(countKey) || 0) + 1), breakCounts.get(countKey)) : 0;
      const [activity, code] = activityForAux(row.breaktype, breakNumber);
      return [agent.agent, `sip/${agent.extension}`, code, activity, 'NBNP', 'No', reportDateTime(row.pnchin), reportDateTime(row.pnchout), durationText(row.totalaux)];
    });
}
function escapeCsv(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function makeCsv(rows) { return [OUTPUT_HEADERS, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n'); }
function renderAgents() { document.querySelector('#agentList').innerHTML = AGENTS.map(agent => `<div class="agent-item" title="${agent.agent}"><strong>${agent.empId}</strong>${agent.shortName} · ${agent.extension}</div>`).join(''); }

function renderResults(rows) {
  outputRows = rows;
  resultsPanel.hidden = false;
  document.querySelector('#metrics').innerHTML = `<div class="metric"><strong>${rows.length}</strong><span>auxs generados</span></div><div class="metric"><strong>${new Set(rows.map(row => row[0])).size}</strong><span>agentes encontrados</span></div><div class="metric"><strong>${new Set(rows.map(row => row[3])).size}</strong><span>tipos de aux</span></div><div class="metric"><strong>${rows.filter(row => row[6] && row[7]).length}</strong><span>con horas reales</span></div>`;
  document.querySelector('#previewHead').innerHTML = `<tr>${OUTPUT_HEADERS.map(header => `<th>${header}</th>`).join('')}</tr>`;
  document.querySelector('#previewBody').innerHTML = rows.slice(0, 50).map(row => `<tr>${row.map(value => `<td title="${String(value).replaceAll('"', '&quot;')}">${value || '—'}</td>`).join('')}</tr>`).join('');
  document.querySelector('#tableNote').textContent = rows.length > 50 ? `Vista previa de 50 de ${rows.length} filas. La descarga incluye todas.` : `${rows.length} filas listas para descargar.`;
  resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showError(message) { document.querySelector('#tableNote').textContent = message; resultsPanel.hidden = false; document.querySelector('#metrics').innerHTML = ''; document.querySelector('#previewHead').innerHTML = ''; document.querySelector('#previewBody').innerHTML = ''; }

document.querySelector('#sampleButton').addEventListener('click', () => { sourceInput.value = SAMPLE; fileName.textContent = 'Ejemplo cargado'; });
fileInput.addEventListener('change', event => { const [file] = event.target.files; if (!file) return; fileName.textContent = file.name; const reader = new FileReader(); reader.onload = () => { sourceInput.value = reader.result; }; reader.readAsText(file); });
['dragenter', 'dragover'].forEach(eventName => dropzone.addEventListener(eventName, event => { event.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(eventName => dropzone.addEventListener(eventName, event => { event.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', event => { const [file] = event.dataTransfer.files; if (!file) return; fileName.textContent = file.name; const reader = new FileReader(); reader.onload = () => { sourceInput.value = reader.result; }; reader.readAsText(file); });
document.querySelector('#generateButton').addEventListener('click', () => { try { reportRows = parseReport(sourceInput.value); const rows = buildRows(reportRows); if (!rows.length) throw new Error('No hubo coincidencias entre BUser y Getty Username, o no hay pausas con PnchIn, PnchOut y TotalAux.'); renderResults(rows); } catch (error) { showError(error.message); } });
document.querySelector('#downloadButton').addEventListener('click', () => { const blob = new Blob([`\uFEFF${makeCsv(outputRows)}`], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `pause-report-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href); });
renderAgents();