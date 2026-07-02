import XLSX from 'xlsx';
import fetch from 'node-fetch';

const spreadsheetId = '103CPTz5ueFBFO26GTbNco6tWhv51TqQNYLUPG-gDgVs';
const publicUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

fetch(publicUrl)
  .then(res => res.arrayBuffer())
  .then(buffer => {
    const arrayData = new Uint8Array(buffer);
    const workbook = XLSX.read(arrayData, { type: 'array' });
    
    const sheetName = '17.06';
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`=== SHEET ${sheetName} ===`);
    for (let i = 24; i < Math.min(rawData.length, 60); i++) {
      if (rawData[i]) {
        console.log(`Row ${i + 1}:`, rawData[i]);
      }
    }
  });
