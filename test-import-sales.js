import XLSX from 'xlsx';
import fetch from 'node-fetch';

const parseImportedDate = (val, fallbackStr = '') => {
  if (!val) return fallbackStr || new Date().toISOString().split('T')[0];
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  
  // dd/mm/yyyy or dd.mm.yyyy
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (dmy) {
    let [_, d, m, y] = dmy;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // try standard Date parsing
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

  return fallbackStr || new Date().toISOString().split('T')[0];
};

const findColIdx = (row, words) => {
  if (!row || !Array.isArray(row)) return -1;
  return row.findIndex(cell => {
    if (cell === undefined || cell === null) return false;
    const str = String(cell).toLowerCase().trim();
    return words.some(w => str === w || str.includes(w));
  });
};

const parseNumericValue = (val) => {
  if (val === undefined || val === null || val === '') return NaN;
  if (typeof val === 'number') return val;
  const clean = String(val)
    .replace('R$', '')
    .replace(/\s/g, '')
    .trim();
  
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.indexOf('.') < clean.indexOf(',')) {
      const standard = clean.replace(/\./g, '').replace(',', '.');
      return parseFloat(standard);
    } else {
      const standard = clean.replace(/,/g, '');
      return parseFloat(standard);
    }
  } else if (clean.includes(',')) {
    const standard = clean.replace(',', '.');
    return parseFloat(standard);
  }
  return parseFloat(clean);
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

    const allImportedSales = [];

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
          let y = year || '2026'; // current computer year
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
        const pagIdx = findColIdx(row, ['pagamento', 'metodo', 'meio', 'forma']);
        const descIdx = findColIdx(row, ['desconto', 'desc', 'off']);
        const catIdx = findColIdx(row, ['categoria', 'category', 'tipo produto', 'tipo produtop']);
        const brandIdx = findColIdx(row, ['marca', 'brand']);

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
        if (pagIdx !== -1) score += 1;

        if (score > maxScore && score >= 2) {
          maxScore = score;
          headerIdx = i;
          colMap = {
            dinheiro: dIdx,
            debito: debIdx,
            credito: credIdx,
            pix: pixIdx,
            link: linkIdx,
            vendedora: vIdx,
            produto: pIdx,
            total: tIdx,
            data: dataIdx,
            pagamento: pagIdx,
            desconto: descIdx,
            categoria: catIdx,
            marca: brandIdx
          };
        }
      }

      if (headerIdx !== -1) {
        let sheetSalesCount = 0;
        let sheetSalesSum = 0;
        if (colMap.dinheiro !== -1 || colMap.debito !== -1 || colMap.credito !== -1 || colMap.pix !== -1 || colMap.link !== -1) {
          const pMethods = [
            { key: 'dinheiro', label: 'Dinheiro' },
            { key: 'debito', label: 'Débito' },
            { key: 'credito', label: 'Crédito' },
            { key: 'pix', label: 'Pix' },
            { key: 'link', label: 'Link' }
          ];

          for (let i = headerIdx + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || !Array.isArray(row)) continue;
            const numberCell = String(row[0] || '').trim();
            if (numberCell.toLowerCase().includes('total') || numberCell.toLowerCase().includes('resumo')) continue;

            pMethods.forEach(pm => {
              const colIdx = colMap[pm.key];
              if (colIdx === -1 || colIdx === undefined) return;

              const val = row[colIdx];
              if (val === undefined || val === null || val === '') return;
              
              const numVal = parseNumericValue(val);
              
              if (!isNaN(numVal) && numVal > 0) {
                let vendor = colMap.vendedora !== -1 ? String(row[colMap.vendedora] || 'SISTEMA').toUpperCase() : 'SISTEMA';
                const product = colMap.produto !== -1 ? String(row[colMap.produto] || 'VENDA IMPORTADA') : 'VENDA IMPORTADA';
                const rowDate = colMap.data !== -1 ? parseImportedDate(row[colMap.data], sheetDate) : sheetDate;

                sheetSalesCount++;
                sheetSalesSum += numVal;
                
                allImportedSales.push({
                  sheetName,
                  rowIdx: i,
                  date: rowDate,
                  vendor,
                  product,
                  total: numVal,
                  paymentMethod: pm.label
                });
              }
            });
          }
        } else if (colMap.total !== -1) {
          for (let i = headerIdx + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || !Array.isArray(row)) continue;
            if (String(row[colMap.total] || '').toLowerCase().includes('total')) continue;

            const total = parseNumericValue(row[colMap.total]);
            if (!isNaN(total) && total > 0) {
              const vendor = colMap.vendedora !== -1 ? String(row[colMap.vendedora] || 'SISTEMA').toUpperCase() : 'SISTEMA';
              const product = colMap.produto !== -1 ? String(row[colMap.produto] || 'VENDA IMPORTADA') : 'VENDA IMPORTADA';
              const rowDate = colMap.data !== -1 ? parseImportedDate(row[colMap.data], sheetDate) : sheetDate;
              
              sheetSalesCount++;
              sheetSalesSum += total;

              allImportedSales.push({
                sheetName,
                rowIdx: i,
                date: rowDate,
                vendor,
                product,
                total,
                paymentMethod: 'Outros'
              });
            }
          }
        }
        console.log(`Sheet "${sheetName}": date = ${sheetDate}, recognized header on row ${headerIdx + 1}, found ${sheetSalesCount} transactions, sum = ${sheetSalesSum.toFixed(2)}`);
      } else {
        console.log(`Sheet "${sheetName}": date = ${sheetDate}, NO HEADER DETECTED`);
      }
    });

    console.log(`Total parsed sales: ${allImportedSales.length}`);
    // Print details of Wednesday "17.06"
    console.log("\n--- DETALHES DE 17.06 ---");
    allImportedSales.filter(s => s.sheetName === '17.06').forEach(s => {
      console.log(`Row ${s.rowIdx+1} - Vendor: ${s.vendor}, Product: ${s.product}, Payment: ${s.paymentMethod}, Total: ${s.total}`);
    });
  });
