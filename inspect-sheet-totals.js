import XLSX from 'xlsx';
import fetch from 'node-fetch';

const parseNumericValue = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val)
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const parseImportedDate = (val, fallbackStr = '') => {
  if (!val) return fallbackStr || new Date().toISOString().split('T')[0];
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (dmy) {
    let [_, d, m, y] = dmy;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return fallbackStr || new Date().toISOString().split('T')[0];
};

const findColIdx = (row, keywords) => {
  if (!Array.isArray(row)) return -1;
  return row.findIndex(cell => 
    keywords.some(k => String(cell || '').toLowerCase().includes(k.toLowerCase()))
  );
};

const spreadsheetId = '103CPTz5ueFBFO26GTbNco6tWhv51TqQNYLUPG-gDgVs';
const publicUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

fetch(publicUrl)
  .then(res => res.arrayBuffer())
  .then(buffer => {
    const arrayData = new Uint8Array(buffer);
    const workbook = XLSX.read(arrayData, { type: 'array' });
    const nonSalesSheetsLower = [
      'produtos', 'products', 'estoque', 'estoquet', 'estoques',
      'clientes', 'customers', 'contatos',
      'marcas', 'brands',
      'custos', 'costs', 'custos fixos',
      'metas', 'goals',
      'config', 'configurações', 'settings', 'resumo', 'painel', 'dashboard'
    ];

    workbook.SheetNames.forEach(sheetName => {
      const trimmedLower = sheetName.trim().toLowerCase();
      if (nonSalesSheetsLower.some(systemSheet => trimmedLower.includes(systemSheet))) {
        return;
      }
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (rawData.length === 0) return;

      let sheetDate = new Date().toISOString().split('T')[0];
      const firstCell = String(rawData[0] ? rawData[0][0] : '');
      if (/^\d{1,2}[./-]\d{1,2}/.test(firstCell)) {
        sheetDate = parseImportedDate(firstCell.split(/\s/)[0]);
      } else {
        const trimmedName = sheetName.trim();
        const dateMatch = trimmedName.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/);
        if (dateMatch) {
          const [_, day, month, year] = dateMatch;
          let y = year || String(new Date().getFullYear());
          if (y.length === 2) y = `20${y}`;
          sheetDate = `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

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

      if (headerIdx !== -1) {
        let count = 0;
        let sum = 0;
        let pMethods = [
          { key: 'dinheiro', label: 'Dinheiro' },
          { key: 'debito', label: 'Débito' },
          { key: 'credito', label: 'Crédito' },
          { key: 'pix', label: 'Pix' },
          { key: 'link', label: 'Link' }
        ];

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
              count++;
              sum += numVal;
            }
          });
        }
        console.log(`Sheet: ${sheetName} | Date: ${sheetDate} | Trans: ${count} | Total: ${sum.toFixed(2)}`);
      } else {
        console.log(`Sheet: ${sheetName} | NO HEADER FOUND`);
      }
    });
  });
