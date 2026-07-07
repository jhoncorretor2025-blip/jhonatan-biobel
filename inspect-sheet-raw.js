import XLSX from 'xlsx';
import fetch from 'node-fetch';

const spreadsheetId = '103CPTz5ueFBFO26GTbNco6tWhv51TqQNYLUPG-gDgVs';
const publicUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

fetch(publicUrl)
  .then(res => res.arrayBuffer())
  .then(buffer => {
    const arrayData = new Uint8Array(buffer);
    const workbook = XLSX.read(arrayData, { type: 'array' });
    const sheet = workbook.Sheets['17.06'];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log("--- RAW ROWS ---");
    for (let i = 0; i < 35; i++) {
      console.log(`Row ${i + 1}:`, rawData[i]);
    }
  });
