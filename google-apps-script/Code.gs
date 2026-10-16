// Backend da lista de presentes (Google Apps Script vinculado à planilha).
// Instalação: ver README.md, seção "Planilha Google".

const SHEET_NAME = 'Presentes';
const HEADERS = ['ID', 'Seção', 'Presente', 'Status', 'Nome', 'E-mail', 'WhatsApp', 'Data/hora'];
const COL = { id: 0, section: 1, name: 2, status: 3 };
const AVAILABLE = 'disponível';
const TAKEN = 'escolhido';

// Cria a aba "Presentes" com os itens. Executar uma única vez pelo editor do Apps Script.
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() > 1) throw new Error('A aba "' + SHEET_NAME + '" já contém dados; nada foi alterado.');
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  const rows = CATALOG.map((g, i) => [i + 1, g[0], g[1], AVAILABLE, '', '', '', '']);
  sh.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  sh.getRange(2, COL.status + 1, rows.length, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList([AVAILABLE, TAKEN], true).build());
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, HEADERS.length);
}

// GET: itens disponíveis (sem dados de convidados).
function doGet() {
  const items = readRows()
    .filter(r => isAvailable(r[COL.status]) && r[COL.id] !== '' && r[COL.name] !== '')
    .map(r => ({ id: Number(r[COL.id]), section: String(r[COL.section]), name: String(r[COL.name]) }));
  return json({ ok: true, items: items });
}

// POST (text/plain com JSON): { id, name, email, whatsapp } -> { ok, claimed }.
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'invalid_json' }); }
  const id = Number(body.id);
  const name = clean(body.name, 120);
  const email = clean(body.email, 254);
  const whats = clean(body.whatsapp, 30);
  if (!id || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || whats.replace(/\D/g, '').length < 10) {
    return json({ ok: false, error: 'invalid_data' });
  }

  // O lock serializa as reservas: duas pessoas não conseguem escolher o mesmo item.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json({ ok: false, error: 'busy' });
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const rows = readRows();
    const idx = rows.findIndex(r => Number(r[COL.id]) === id);
    if (idx < 0 || !isAvailable(rows[idx][COL.status])) return json({ ok: true, claimed: false });
    sh.getRange(idx + 2, COL.status + 1, 1, 5).setValues([[TAKEN, asText(name), asText(email), asText(whats), new Date()]]);
    SpreadsheetApp.flush();
    return json({ ok: true, claimed: true });
  } finally {
    lock.releaseLock();
  }
}

function readRows() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).getValues();
}

function isAvailable(v) { return String(v).trim().toLowerCase() === AVAILABLE; }
function clean(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }
// Impede que textos iniciados por = + - @ sejam interpretados como fórmula.
function asText(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

// [Seção, Presente] — mesma lista de itens.js.
const CATALOG = [
  ["Eletroportáteis e Outros", "Liquidificador"],
  ["Eletroportáteis e Outros", "Cafeteira Elétrica"],
  ["Eletroportáteis e Outros", "Batedeira"],
  ["Eletroportáteis e Outros", "Fritadeira Elétrica (Airfryer)"],
  ["Eletroportáteis e Outros", "Faqueiro Inox"],
  ["Eletroportáteis e Outros", "Sanduicheira"],
  ["Eletroportáteis e Outros", "Mixer"],
  ["Eletroportáteis e Outros", "Chaleira elétrica"],
  ["Eletroportáteis e Outros", "Aspirador de pó"],
  ["Eletroportáteis e Outros", "Ventilador"],
  ["Eletroportáteis e Outros", "Purificador/filtro de água"],
  ["Eletroportáteis e Outros", "Tanquinho"],
  ["Eletroportáteis e Outros", "Espelho"],
  ["Eletroportáteis e Outros", "Multiprocessador"],
  ["Quarto", "Jogo de cama casal"],
  ["Quarto", "Edredom"],
  ["Quarto", "Cobertor/manta"],
  ["Quarto", "Travesseiros (par)"],
  ["Quarto", "Protetor de colchão"],
  ["Quarto", "Colcha"],
  ["Quarto", "Cabides"],
  ["Quarto", "Abajur"],
  ["Quarto", "Espelho de corpo"],
  ["Banheiro", "Jogo de Toalhas de Banho"],
  ["Banheiro", "Toalhas de rosto"],
  ["Banheiro", "Kit Banheiro"],
  ["Banheiro", "Tapete de banheiro"],
  ["Banheiro", "Cesto de roupa suja"],
  ["Banheiro", "Lixeira de banheiro"],
  ["Eletrodoméstico", "Fogão"],
  ["Eletrodoméstico", "Geladeira"],
  ["Eletrodoméstico", "Micro-ondas"],
  ["Eletrodoméstico", "Lava-louças"],
  ["Eletrodoméstico", "Ar condicionado"],
  ["Cozinha", "Jogo de panelas"],
  ["Cozinha", "Panela de pressão"],
  ["Cozinha", "Frigideira antiaderente"],
  ["Cozinha", "Jogo de facas"],
  ["Cozinha", "Tábua de corte"],
  ["Cozinha", "Kit de utensílios de silicone"],
  ["Cozinha", "Escorredor de louça"],
  ["Cozinha", "Potes herméticos"],
  ["Cozinha", "Assadeiras/formas"],
  ["Cozinha", "Jogo de copos"],
  ["Cozinha", "Jogo de xícaras"],
  ["Cozinha", "Garrafa térmica"],
  ["Cozinha", "Panos de prato"],
  ["Lavanderia", "Ferro de passar"],
  ["Lavanderia", "Tábua de passar"],
  ["Lavanderia", "Máquina de lavar"],
  ["Lavanderia", "Varal de chão"],
  ["Lavanderia", "Kit de limpeza"],
  ["Lavanderia", "Mop"],
  ["Lavanderia", "Prendedores e cesto"],
  ["Mesa e Jantar", "Jogo de pratos de sobremesa (6 peças)"],
  ["Mesa e Jantar", "Travessa oval de porcelana"],
  ["Mesa e Jantar", "Travessa redonda de vidro"],
  ["Mesa e Jantar", "Saladeira de cerâmica ou vidro"],
  ["Mesa e Jantar", "Molheira com tampa"],
  ["Mesa e Jantar", "Jogo de taças para vinho tinto (6 peças)"],
  ["Mesa e Jantar", "Jogo de taças para vinho branco (6 peças)"],
  ["Mesa e Jantar", "Jarra de vidro com tampa"],
  ["Mesa e Jantar", "Faqueiro de aço inox (24 ou 36 peças)"],
  ["Mesa e Jantar", "Jogo de talheres para sobremesa (6 peças)"],
  ["Mesa e Jantar", "Conjunto de talheres para servir (colher, garfo e concha)"],
  ["Mesa e Jantar", "Pegador de salada"],
  ["Mesa e Jantar", "Pegador de massa"],
  ["Mesa e Jantar", "Concha para sopa"],
  ["Mesa e Jantar", "Jogo americano (4 ou 6 peças)"],
  ["Mesa e Jantar", "Descanso de panela em silicone ou madeira"],
  ["Mesa e Jantar", "Porta-guardanapos (6 peças)"],
  ["Mesa e Jantar", "Jogo de guardanapos de tecido (6 peças)"],
  ["Mesa e Jantar", "Toalha de mesa retangular com porta-pratos"],
  ["Mesa e Jantar", "Caminho de mesa"],
  ["Mesa e Jantar", "Sousplat (4 ou 6 peças)"],
  ["Mesa e Jantar", "Vaso ou centro de mesa"],
  ["Mesa e Jantar", "Saleiro e pimenteiro"],
  ["Mesa e Jantar", "Manteigueira com tampa"],
  ["Mesa e Jantar", "Porta-pão ou cesta para pães"],
  ["Mesa e Jantar", "Cuscuzeira ou panela para arroz"],
  ["Mesa e Jantar", "Cafeteira elétrica ou prensa francesa"]
];
