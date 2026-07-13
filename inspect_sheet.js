import fetch from 'node-fetch';
import * as XLSX from 'xlsx';

const PT_MONTHS_MAP = {
  janeiro: '01', jan: '01',
  fevereiro: '02', fev: '02',
  marco: '03', mar: '03', marco: '03', março: '03',
  abril: '04', abr: '04',
  maio: '05', mai: '05', may: '05',
  junho: '06', jun: '06',
  julho: '07', jul: '07',
  agosto: '08', ago: '08',
  setembro: '09', set: '09',
  outubro: '10', out: '10',
  novembro: '11', nov: '11',
  dezembro: '12', dez: '12'
};

const normalizeHeaderStr = (s) => {
  return String(s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const findColIdx = (row, keywords) => {
  if (!Array.isArray(row)) return -1;
  const normalizedKeywords = keywords.map(normalizeHeaderStr);
  return row.findIndex(cell => {
    const normCell = normalizeHeaderStr(String(cell || ''));
    return normalizedKeywords.some(k => normCell.includes(k));
  });
};

const isSalesSheet = (sheetName) => {
  const trimmed = sheetName.trim();
  const lower = trimmed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const blackList = [
    'produto', 'product', 'estoque', 'cliente', 'customer', 
    'contato', 'marca', 'brand', 'custo', 'cost', 'meta', 'goal', 
    'config', 'setting', 'resumo', 'painel', 'dashboard'
  ];
  if (blackList.some(item => lower.includes(item))) return false;
  
  const startsWithDigit = /^\d+/.test(trimmed);
  if (startsWithDigit) return true;
  
  const monthNames = [
    'janeiro', 'fevereiro', 'marco', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'
  ];
  if (monthNames.some(m => new RegExp(`(?:^|[^a-zçãõáéíóú])${m}(?:[^a-zçãõáéíóú]|$)`, 'i').test(lower))) return true;
  
  const salesKeywords = ['venda', 'sale', 'relatorio', 'relatorio', 'faturamento', 'transacao', 'movimentacao'];
  if (salesKeywords.some(kw => lower.includes(kw))) return true;
  
  return false;
};

const getMonthFromText = (text) => {
  if (!text) return null;
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [key, val] of Object.entries(PT_MONTHS_MAP)) {
    const cleanKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const regex = new RegExp(`(?:^|[^a-zçãõáéíóú])${cleanKey}(?:[^a-zçãõáéíóú]|$)`, 'i');
    if (regex.test(normalized)) return val;
  }
  const mMatch = normalized.match(/(?:^|[^0-9])(0[1-9]|1[0-2])(?:[^0-9]|$)/);
  if (mMatch) return mMatch[1];
  return null;
};

const getYearFromText = (text) => {
  if (!text) return null;
  const match = text.match(/(?:^|[^0-9])(20\d{2})(?:[^0-9]|$)/);
  return match ? match[1] : null;
};

const detectWorkbookContext = (fileNameOrUrl, sheetNames) => {
  let fileMonth = getMonthFromText(fileNameOrUrl);
  let fileYear = getYearFromText(fileNameOrUrl);
  
  let monthCounts = {};
  let yearCounts = {};
  
  sheetNames.forEach(name => {
    const trimmed = name.trim();
    const match = trimmed.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/);
    if (match) {
      const [_, day, month, year] = match;
      const m = month.padStart(2, '0');
      if (parseInt(m) >= 1 && parseInt(m) <= 12) {
        monthCounts[m] = (monthCounts[m] || 0) + 1;
      }
      if (year) {
        let y = year;
        if (y.length === 2) y = `20${y}`;
        yearCounts[y] = (yearCounts[y] || 0) + 1;
      }
    } else {
      const ptMatch = trimmed.match(/^(\d{1,2})(?:\s+de\s+|\s*[-./]\s*| de )([a-zçãõáéíóú]+)(?:\s+de\s+|\s*[-./]\s*| de )?(\d{2,4})?/i);
      if (ptMatch) {
        const [_, day, monthName, year] = ptMatch;
        const cleanMonth = monthName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const m = PT_MONTHS_MAP[cleanMonth];
        if (m) monthCounts[m] = (monthCounts[m] || 0) + 1;
        if (year) {
          let y = year;
          if (y.length === 2) y = `20${y}`;
          yearCounts[y] = (yearCounts[y] || 0) + 1;
        }
      }
    }
  });
  
  let sheetConsensusMonth = '';
  let maxMonthCount = 0;
  for (const [m, count] of Object.entries(monthCounts)) {
    if (count > maxMonthCount) {
      maxMonthCount = count;
      sheetConsensusMonth = m;
    }
  }
  
  let sheetConsensusYear = '';
  let maxYearCount = 0;
  for (const [y, count] of Object.entries(yearCounts)) {
    if (count > maxYearCount) {
      maxYearCount = count;
      sheetConsensusYear = y;
    }
  }
  
  const finalMonth = fileMonth || sheetConsensusMonth || String(new Date().getMonth() + 1).padStart(2, '0');
  const finalYear = fileYear || sheetConsensusYear || String(new Date().getFullYear());
  
  return { month: finalMonth.padStart(2, '0'), year: finalYear };
};

const parseSheetNameDate = (sheetName, contextMonth, contextYear) => {
  const trimmed = sheetName.trim();
  const dmyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/);
  if (dmyMatch) {
    const [_, day, month, year] = dmyMatch;
    const m = month.padStart(2, '0');
    let y = year || contextYear || String(new Date().getFullYear());
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m}-${day.padStart(2, '0')}`;
  }
  return `${contextYear}-${contextMonth}-01`;
};

const parseImportedDate = (val, fallbackStr, contextYearStr, contextMonthStr) => {
  return fallbackStr;
};

const coerceDateToContext = (dateStr, contextMonth, contextYear) => {
  return dateStr;
};

const parseNumericValue = (val) => {
  if (val === undefined || val === null || val === '') return NaN;
  if (typeof val === 'number') return val;
  let s = String(val).trim().toUpperCase();
  s = s.replace('R$', '').replace(/\s/g, '');
  if (s.includes(',') && s.includes('.')) {
    if (s.indexOf('.') < s.indexOf(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  return parseFloat(s);
};

async function inspect() {
  const sheetId = '1gVNbt3_KKj3qvh0TNw0_Y4pUaX97drpaW_7V7aidix0';
  const publicUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

  console.log('Downloading May spreadsheet...');
  try {
    const res = await fetch(publicUrl);
    const arrayBuffer = await res.arrayBuffer();
    const arrayData = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(arrayData, { type: 'array' });

    const workbookContext = detectWorkbookContext(publicUrl, workbook.SheetNames);
    console.log('Workbook context:', workbookContext);

    let totalImportedSales = [];

    workbook.SheetNames.forEach(sheetName => {
      if (!isSalesSheet(sheetName)) return;

      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (rawData.length === 0) return;

      let sheetDate = parseSheetNameDate(sheetName, workbookContext.month, workbookContext.year);
      
      let headerIdx = -1;
      let colMap = {};
      let maxScore = -1;

      for (let i = 0; i < Math.min(rawData.length, 25); i++) {
        const row = rawData[i];
        if (!row || !Array.isArray(row)) continue;

        const dIdx = findColIdx(row, ['dinheiro', 'espécie', 'especie']);
        const debIdx = findColIdx(row, ['débito', 'debito']);
        const credIdx = findColIdx(row, ['crédito', 'credito']);
        const pixIdx = findColIdx(row, ['pix']);
        const linkIdx = findColIdx(row, ['link']);
        const vIdx = findColIdx(row, ['vendedora', 'vendedor', 'vendedoras', 'staff', 'responsável', 'responsavel', 'colaborador', 'colaboradora', 'atendente', 'profissional', 'funcionário', 'funcionario']);
        const pIdx = findColIdx(row, ['produto', 'item', 'descrição', 'descricao', 'serviço', 'servico', 'atendimento', 'procedimento', 'produto/serviço']);
        const tIdx = findColIdx(row, ['total', 'valor', 'preço', 'price', 'amount']);
        const dataIdx = findColIdx(row, ['data', 'date']);

        let score = 0;
        if (dIdx !== -1) score += 3;
        if (debIdx !== -1) score += 3;
        if (credIdx !== -1) score += 3;
        if (pixIdx !== -1) score += 3;
        if (linkIdx !== -1) score += 1;
        if (tIdx !== -1) score += 2;
        if (vIdx !== -1) score += 2;
        if (pIdx !== -1) score += 2;
        if (dataIdx !== -1) score += 1;

        if (score > maxScore && score >= 2) {
          maxScore = score;
          headerIdx = i;
          colMap = { dinheiro: dIdx, debito: debIdx, credito: credIdx, pix: pixIdx, link: linkIdx, vendedora: vIdx, produto: pIdx, total: tIdx, data: dataIdx };
        }
      }

      console.log(`Sheet: "${sheetName}" -> headerIdx: ${headerIdx}, maxScore: ${maxScore}`);
      if (headerIdx !== -1) {
        const pMethods = [
          { key: 'dinheiro', label: 'Dinheiro' },
          { key: 'debito', label: 'Débito' },
          { key: 'credito', label: 'Crédito' },
          { key: 'pix', label: 'Pix' },
          { key: 'link', label: 'Link' }
        ];

        let salesCountInSheet = 0;
        for (let i = headerIdx + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || !Array.isArray(row)) continue;
          if (String(row[0] || '').toLowerCase().includes('total')) continue;

          pMethods.forEach(pm => {
            const colIdx = colMap[pm.key];
            if (colIdx === -1 || colIdx === undefined) return;

            const val = row[colIdx];
            if (val === undefined || val === null || val === '') return;

            const numVal = parseNumericValue(val);
            if (!isNaN(numVal) && numVal > 0) {
              salesCountInSheet++;
              totalImportedSales.push({
                sheetName,
                rowIdx: i,
                method: pm.label,
                val: numVal,
                vendedora: row[colMap.vendedora] || '',
                product: row[colMap.produto] || ''
              });
            }
          });
        }
        console.log(`   Imported ${salesCountInSheet} sales from "${sheetName}"`);
      }
    });

    console.log(`\nTotal imported sales across workbook: ${totalImportedSales.length}`);
    if (totalImportedSales.length > 0) {
      console.log('Sample sales:');
      console.log(totalImportedSales.slice(0, 5));
    }

  } catch (err) {
    console.error('Error during dry-run:', err);
  }
}

inspect();
