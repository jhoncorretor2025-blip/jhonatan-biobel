import XLSX from 'xlsx';
import fetch from 'node-fetch';

const spreadsheetId = '103CPTz5ueFBFO26GTbNco6tWhv51TqQNYLUPG-gDgVs';
const publicUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

fetch(publicUrl)
  .then(res => res.arrayBuffer())
  .then(buffer => {
    const arrayData = new Uint8Array(buffer);
    const workbook = XLSX.read(arrayData, { type: 'array' });
    
    ['15.06', '16.06'].forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        console.log(`Sheet "${sheetName}" not found!`);
        return;
      }
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`\n=== Sheet "${sheetName}" ===`);
      for (let i = 0; i < Math.min(rawData.length, 5); i++) {
        console.log(`Row ${i + 1}:`, rawData[i]);
      }
    });
  });
