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
function durationToSeconds(value) {
  const parts = value.split(':').map(Number);
  return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
}
function durationText(value) {
  const parts = value.trim().split(':').map(Number);
  if (parts.length === 2) parts.unshift(0);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return value || '0:00:00';
  const [hours, minutes, seconds] = parts;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
function excelDuration(value) { const seconds = durationToSeconds(value); const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const remaining = seconds % 60; return `${hours ? `${hours} hour${hours === 1 ? '' : 's'} ` : ''}${minutes ? `${minutes} minute${minutes === 1 ? '' : 's'} ` : ''}${remaining ? `${remaining} second${remaining === 1 ? '' : 's'}` : ''}`.trim() || '0 seconds'; }

function activityForAux(breakType, breakNumber) {
  const normalized = breakType.trim().toLowerCase();
  if (normalized === 'break') {
    if (breakNumber === 1) return ['15.', 'Break 1', 'NBNP', 'No'];
    if (breakNumber === 2) return ['16.', 'Break 2', 'NBNP', 'No'];
    return ['bb', 'Bath Break', 'NBNP', 'No'];
  }
  const activityMap = {
    huddle: ['huddle', 'Huddle', 'NBNP', 'No'],
    lunch: ['10.', 'Lunch', 'NBNP', 'No'],
    outbound: ['17.', 'Outbound', 'NBNP', 'No'],
    training: ['19.', 'Training', 'NBNP', 'No'],
    backoffice: ['13.', 'Backoffice', 'BNP', 'Yes'],
    'supervisor approval pause': ['25.', 'Supervisor Approval Pause', 'NBNP', 'No'],
    'chat team': ['39.', 'Chat Team', 'NBNP', 'No'],
    ticketteam: ['ticketteam', 'Ticket Team', 'NBNP', 'No'],
    email: ['12.', 'Email', 'BNP', 'Yes'],
    'coaching(performance)': ['18.', 'Coaching', 'NBNP', 'No'],
    coaching: ['18.', 'Coaching', 'NBNP', 'No'],
    'technical issues': ['23.', 'Technical Issues', 'NBNP', 'No'],
    teammeeting: ['teammeeting', 'Team Meeting', 'NBNP', 'No'],
    'team meeting': ['teammeeting', 'Team Meeting', 'NBNP', 'No'],
    'bo team': ['40.', 'BO Team', 'NBNP', 'No'],
    'master team': ['42.', 'Master Team', 'NBNP', 'No'],
    '-': ['-', '-', 'NBNP', 'No'],
    meeting: ['36.', 'Meeting', 'NBNP', 'No'],
    'ticket team': ['38.', 'Ticket team', 'NBNP', 'No'],
    nesting: ['nesting', 'Training', 'NBNP', 'No'],
    'sdr team': ['41.', 'SDR Team', 'NBNP', 'No']
  };
  return activityMap[normalized] || ['', breakType.trim(), 'NBNP', 'No'];
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
      const [code, activity, pauseType, billable] = activityForAux(row.breaktype, breakNumber);
      return [agent.agent, `sip/${agent.extension}`, code, activity, pauseType, billable, reportDateTime(row.pnchin), reportDateTime(row.pnchout), durationText(row.totalaux)];
    });
}
function escapeCsv(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function makeCsv(rows) { return [OUTPUT_HEADERS, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n'); }
function reportStamp() {
  return new Date().toLocaleString('en-US', { month: 'long', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}
function makeExcelFile(rows) {
  if (!window.XLSX) throw new Error('No se pudo cargar el exportador de Excel. Recarga la página e inténtalo de nuevo.');
  const now = new Date();
  const stamp = reportStamp();
  const periodDate = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
  const sheetRows = [
    [`Produced by QueueMetrics. - ${stamp}`],
    [],
    ['Report Details'],
    ['Report generated on:', stamp],
    ['Atomic queue(s) considered:', 'Gen Mobile'],
    ['Period start date:', `${periodDate} 00:00`],
    ['Period end date:', `${periodDate} 23:59`],
    ['Total calls processed:', `${rows.length} Auxs`],
    ['Ratio:', '0.0% Unanswered'],
    [],
    ['Detail of agent pauses'],
    ['AD02 - DetailsDO.AgentPauses'],
    [],
    OUTPUT_HEADERS,
    ...rows
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const baseStyle = { font: { name: 'Arial', sz: 10 }, alignment: { vertical: 'center' } };
  const sectionStyle = { ...baseStyle, font: { name: 'Arial', sz: 10, bold: true }, fill: { fgColor: { rgb: 'C6C6C6' } } };
  const titleStyle = { ...baseStyle, font: { name: 'Times New Roman', sz: 20, bold: true } };
  const subtitleStyle = { ...baseStyle, font: { name: 'Times New Roman', sz: 16, bold: true } };
  const headerStyle = { ...baseStyle, font: { name: 'Arial', sz: 10, bold: true }, fill: { fgColor: { rgb: 'C6C6C6' } } };
  for (let rowIndex = 0; rowIndex < sheetRows.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < sheetRows[rowIndex].length; columnIndex += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
      if (cell) cell.s = baseStyle;
    }
  }
  for (let columnIndex = 0; columnIndex <= 4; columnIndex += 1) {
    worksheet[XLSX.utils.encode_cell({ r: 2, c: columnIndex })] = { v: columnIndex === 0 ? 'Report Details' : '', t: 's', s: sectionStyle };
  }
  for (let columnIndex = 0; columnIndex <= 8; columnIndex += 1) {
    worksheet[XLSX.utils.encode_cell({ r: 10, c: columnIndex })] = { v: columnIndex === 0 ? 'Detail of agent pauses' : '', t: 's', s: titleStyle };
    worksheet[XLSX.utils.encode_cell({ r: 11, c: columnIndex })] = { v: columnIndex === 0 ? 'AD02 - DetailsDO.AgentPauses' : '', t: 's', s: subtitleStyle };
  }
  for (let columnIndex = 0; columnIndex < OUTPUT_HEADERS.length; columnIndex += 1) {
    worksheet[XLSX.utils.encode_cell({ r: 13, c: columnIndex })].s = headerStyle;
  }
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
    { s: { r: 10, c: 0 }, e: { r: 10, c: 8 } },
    { s: { r: 11, c: 0 }, e: { r: 11, c: 8 } }
  ];
  worksheet['!cols'] = [
    { wch: 42 }, { wch: 14 }, { wch: 12 }, { wch: 24 }, { wch: 13 },
    { wch: 12 }, { wch: 23 }, { wch: 23 }, { wch: 12 }
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pause Details');
  XLSX.writeFile(workbook, `pause-details-${now.toISOString().slice(0, 10)}.xlsx`);
}
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
document.querySelector('#downloadButton').addEventListener('click', () => { try { makeExcelFile(outputRows); } catch (error) { showError(error.message); } });
renderAgents();