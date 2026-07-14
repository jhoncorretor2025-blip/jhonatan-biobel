import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export function formatCurrency(value: number) {
  return currencyFormatter.format(value || 0);
}

export const getWhatsAppUrl = (phone: string, text?: string) => {
  if (!phone) {
    return text 
      ? `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send`;
  }
  let cleaned = String(phone).replace(/\D/g, '');
  if (!cleaned) {
    return text 
      ? `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send`;
  }
  
  // If number is just the local part (8 or 9 digits), add default DDD 51
  if (cleaned.length === 8 || cleaned.length === 9) {
    cleaned = '51' + cleaned;
  }
  
  // If Brazil number without country code
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  return `https://wa.me/${cleaned}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

export function cleanData(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => cleanData(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanData(v)])
    );
  }
  return obj;
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

export function normalizeVendedoraName(name: string): string {
  if (!name) return 'Não Informada';
  const upper = name.toUpperCase().trim();
  if (upper.includes('ALESAN') || upper.includes('ALESSAN')) return 'ALESSANDRA';
  if (upper.includes('GABRIELA') || upper.includes('GABI')) return 'GABRIELA CLT';
  if (upper.includes('DAY') || upper.includes('DAIANE')) return 'DAY';
  if (upper.includes('BIBI') || upper.includes('BEATRIZ')) return 'BIBI';
  return upper;
}

export function getSafeDate(dVal: any): Date {
  if (!dVal) return new Date();
  if (dVal instanceof Date) return dVal;
  
  try {
    const trimmed = String(dVal).trim();
    const isDateOnlyYMD = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    const isDateOnlyShort = trimmed.length <= 10 && trimmed.indexOf('T') === -1;
    
    if (isDateOnlyYMD || isDateOnlyShort) {
      const parts = trimmed.split(/[-/.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) { // YYYY-MM-DD
          return new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}T12:00:00`);
        } else { // DD-MM-YYYY or similar
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          return new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00:00`);
        }
      }
    }
    
    const dateObj = new Date(dVal);
    if (isNaN(dateObj.getTime())) {
      return new Date();
    }
    return dateObj;
  } catch (e) {
    return new Date();
  }
}

export function getSaleLocalHours(s: any): number {
  if (!s || !s.date) return 12;
  try {
    const saleDate = getSafeDate(s.date);
    let hrs = saleDate.getHours();
    
    if ((s.id?.startsWith('S-ROW-') || s.id?.startsWith('S-GRID-')) && typeof s.date === 'string' && s.date.includes('T')) {
      const timePart = s.date.split('T')[1];
      if (timePart) {
        const hourPart = parseInt(timePart.split(':')[0]);
        if (!isNaN(hourPart)) {
          hrs = hourPart;
        }
      }
    }
    return hrs;
  } catch (e) {
    return 12;
  }
}

export function formatDate(dateString: string) {
  if (!dateString) return '';
  try {
    return dateFormatter.format(new Date(dateString));
  } catch (e) {
    return dateString;
  }
}

export function getLocalISOString(date: Date = new Date()): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`;
}

export function isSameLocalDay(dateStr1: string, dateStr2: string | Date = new Date()): boolean {
  if (!dateStr1) return false;
  try {
    const d1 = getSafeDate(dateStr1);
    const d2 = typeof dateStr2 === 'string' ? getSafeDate(dateStr2) : dateStr2;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  } catch (e) {
    return false;
  }
}

export function formatDateWithDayOfWeek(dateString: string): string {
  if (!dateString) return '';
  try {
    const dateObj = getSafeDate(dateString);
    if (isNaN(dateObj.getTime())) return dateString;
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    
    const daysMap = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const dayName = daysMap[dateObj.getDay()];
    
    return `${day}.${month}.${year} ${dayName}`;
  } catch (e) {
    return dateString;
  }
}

export const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return numbers.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, "($1) $2-$3-$4").substring(0, 16);
};

export const APP_VERSION = '3.5.0';

// --- Excel/Spreadsheet Helpers ---

export const normalizeHeaderStr = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export const findColIdx = (row: any[], keywords: string[]) => {
  if (!Array.isArray(row)) return -1;
  const normalizedKeywords = keywords.map(normalizeHeaderStr);
  return row.findIndex(cell => {
    const normCell = normalizeHeaderStr(String(cell || ''));
    return normalizedKeywords.some(k => normCell.includes(k));
  });
};

export const PT_MONTHS_MAP: { [key: string]: string } = {
  janeiro: '01', jan: '01',
  fevereiro: '02', fev: '02',
  marco: '03', março: '03', mar: '03',
  abril: '04', abr: '04',
  maio: '05', mai: '05',
  junho: '06', jun: '06',
  julho: '07', jul: '07',
  agosto: '08', ago: '08',
  setembro: '09', set: '09',
  outubro: '10', out: '10',
  novembro: '11', nov: '11',
  dezembro: '12', dez: '12',
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12'
};

export const parseImportedVendor = (rawVendor: string): string => {
  if (!rawVendor) return 'SISTEMA';
  const vendor = String(rawVendor).trim().toUpperCase();
  if (vendor.includes('ALESAN') || vendor.includes('ALESA')) return 'ALESSANDRA';
  if (vendor.includes('LETICIA') || vendor.includes('LETIC')) return 'LETICIA';
  if (vendor.includes('GABRIELA') || vendor.includes('GABRI')) return 'GABRIELA CLT';
  if (vendor.includes('DAY')) return 'DAY';
  return vendor;
};

export const parseImportedProductAndBrand = (
  row: any[],
  colMap: { [key: string]: number }
): { product: string; brand: string; category: string } => {
  let rawProduct = colMap.produto !== -1 && colMap.produto !== undefined ? String(row[colMap.produto] || '').trim() : '';
  let rawBrand = colMap.marca !== -1 && colMap.marca !== undefined ? String(row[colMap.marca] || '').trim() : '';
  let rawCategory = colMap.categoria !== -1 && colMap.categoria !== undefined ? String(row[colMap.categoria] || '').trim().toUpperCase() : '';

  let product = 'VENDA IMPORTADA';
  let brand = 'BIOBEL';
  let category = rawCategory || 'VENDA À VISTA';

  if (rawProduct && rawBrand) {
    const brandLower = rawBrand.toLowerCase();
    const productLower = rawProduct.toLowerCase();
    
    const commonCategories = ['cabelo', 'perfume', 'perume', 'maquiagem', 'maqui', 'creme', 'skincare', 'unha', 'olhos', 'labios', 'corpo', 'rosto', 'shampoo', 'condicionador', 'mascara', 'oleo', 'boca', 'face', 'unhas', 'acessorio', 'servico', 'atendimento', 'presencial', 'digital'];
    const commonBrands = ['wella', 'truss', 'biobel', 'eudora', 'natura', 'boticario', 'loreal', 'kerastase', 'senscience', 'brae', 'schwarzkopf', 'sebastian', 'joico', 'redken', 'cadiveu', 'aneethun'];

    const brandIsCat = commonCategories.some(cat => brandLower.includes(cat));
    const productIsBrand = commonBrands.some(b => productLower.includes(b));

    if (brandIsCat || productIsBrand) {
      product = rawProduct;
      brand = rawProduct;
      category = rawBrand.toUpperCase();
    } else {
      product = rawProduct;
      brand = rawBrand;
    }
  } else if (rawProduct) {
    product = rawProduct;
    brand = 'BIOBEL';
  } else if (rawBrand) {
    product = rawBrand;
    brand = 'BIOBEL';
    const brandLower = rawBrand.toLowerCase();
    const commonCategories = ['cabelo', 'perfume', 'perume', 'maquiagem', 'maqui', 'creme', 'skincare', 'unha', 'olhos', 'labios', 'corpo', 'rosto', 'shampoo', 'condicionador', 'mascara', 'oleo', 'boca', 'face', 'unhas', 'acessorio'];
    if (commonCategories.some(cat => brandLower.includes(cat))) {
      category = rawBrand.toUpperCase();
    }
  }

  return {
    product: product || 'VENDA IMPORTADA',
    brand: brand || 'BIOBEL',
    category: category || 'VENDA À VISTA'
  };
};

export const getMonthFromText = (text: string): string | null => {
  if (!text) return null;
  const normalized = text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  for (const [key, val] of Object.entries(PT_MONTHS_MAP)) {
    const cleanKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const regex = new RegExp(`(?:^|[^a-zçãõáéíóú])${cleanKey}(?:[^a-zçãõáéíóú]|$)`, 'i');
    if (regex.test(normalized)) {
      return val;
    }
  }
  
  const mMatch = normalized.match(/(?:^|[^0-9])(0[1-9]|1[0-2])(?:[^0-9]|$)/);
  if (mMatch) {
    return mMatch[1];
  }
  
  return null;
};

export const getYearFromText = (text: string): string | null => {
  if (!text) return null;
  const match = text.match(/(?:^|[^0-9])(20\d{2})(?:[^0-9]|$)/);
  return match ? match[1] : null;
};

export const detectWorkbookContext = (fileNameOrUrl: string, sheetNames: string[]) => {
  let fileMonth = getMonthFromText(fileNameOrUrl);
  let fileYear = getYearFromText(fileNameOrUrl);
  
  let monthCounts: { [key: string]: number } = {};
  let yearCounts: { [key: string]: number } = {};
  
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
        if (m) {
          monthCounts[m] = (monthCounts[m] || 0) + 1;
        }
        if (year) {
          let y = year;
          if (y.length === 2) y = `20${y}`;
          yearCounts[y] = (yearCounts[y] || 0) + 1;
        }
      } else {
        const numericMatch = trimmed.match(/^(\d{2})(\d{2})$/);
        if (numericMatch) {
          const [_, day, month] = numericMatch;
          const m = month.padStart(2, '0');
          if (parseInt(m) >= 1 && parseInt(m) <= 12) {
            monthCounts[m] = (monthCounts[m] || 0) + 1;
          }
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

export const coerceDateToContext = (dateStr: string, contextMonth: string, contextYear: string, originalVal?: any): string => {
  if (!dateStr) return '';
  
  if (originalVal !== undefined && originalVal !== null && originalVal !== '') {
    const sVal = String(originalVal).trim();
    if (typeof originalVal === 'number' && originalVal > 30000) {
      return dateStr;
    }
    if (sVal.includes('/') || sVal.includes('-') || sVal.includes('.')) {
      const parts = sVal.split(/[./-]/).filter(Boolean);
      if (parts.length >= 2) {
        return dateStr;
      }
    }
    if (sVal.toLowerCase().includes(' de ')) {
      return dateStr;
    }
  }

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [_, y, m, d] = match;
    if (m !== contextMonth || y !== contextYear) {
      return `${contextYear}-${contextMonth}-${d}`;
    }
  }
  return dateStr;
};

export const parseImportedDate = (val: any, fallbackStr: string = '', contextYearStr?: string, contextMonthStr?: string) => {
  if (!val) return fallbackStr || new Date().toISOString().split('T')[0];
  if (typeof val === 'number') {
    if (val > 30000) {
      const date = XLSX.SSF.parse_date_code(val);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    } else if (val >= 1 && val <= 31) {
      const y = contextYearStr || String(new Date().getFullYear());
      const m = contextMonthStr || String(new Date().getMonth() + 1).padStart(2, '0');
      return `${y}-${m.padStart(2, '0')}-${String(val).padStart(2, '0')}`;
    }
  }
  const s = String(val).trim();
  
  if (/^\d{1,2}$/.test(s)) {
    const dayVal = parseInt(s);
    if (dayVal >= 1 && dayVal <= 31) {
      const y = contextYearStr || String(new Date().getFullYear());
      const m = contextMonthStr || String(new Date().getMonth() + 1).padStart(2, '0');
      return `${y}-${m.padStart(2, '0')}-${s.padStart(2, '0')}`;
    }
  }
  
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (dmy) {
    let [_, d, m, y] = dmy;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const dmMatch = s.match(/^(\d{1,2})[./-](\d{1,2})(?![./-]\d)/);
  if (dmMatch) {
    let [_, d, m] = dmMatch;
    let y = '';
    if (contextYearStr) {
      const cyMatch = String(contextYearStr).match(/\b(20\d{2})\b/);
      if (cyMatch) y = cyMatch[1];
      else if (/^\d{4}$/.test(String(contextYearStr))) y = String(contextYearStr);
    }
    if (!y) {
      y = String(new Date().getFullYear());
    }
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const ptDateMatch = s.toLowerCase().match(/^(\d{1,2})\s+de\s+([a-zçãõáéíóú]+)(?:\s+de\s+(\d{2,4}))?/i);
  if (ptDateMatch) {
    const [_, d, monthName, yearStr] = ptDateMatch;
    const cleanMonth = monthName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const m = PT_MONTHS_MAP[cleanMonth] || '01';
    let y = yearStr || contextYearStr || String(new Date().getFullYear());
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

  return fallbackStr || new Date().toISOString().split('T')[0];
};

export const isSalesSheet = (sheetName: string): boolean => {
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

export const parseSheetNameDate = (sheetName: string, contextMonth: string, contextYear: string): string => {
  const trimmed = sheetName.trim();
  
  const dmyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/);
  if (dmyMatch) {
    const [_, day, month, year] = dmyMatch;
    const m = month.padStart(2, '0');
    let y = year || contextYear || String(new Date().getFullYear());
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m}-${day.padStart(2, '0')}`;
  }
  
  const ptMatch = trimmed.match(/^(\d{1,2})(?:\s+de\s+|\s*[-./]\s*| de )([a-zçãõáéíóú]+)(?:\s+de\s+|\s*[-./]\s*| de )?(\d{2,4})?/i);
  if (ptMatch) {
    const [_, day, monthName, year] = ptMatch;
    const cleanMonth = monthName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const m = PT_MONTHS_MAP[cleanMonth] || contextMonth;
    let y = year || contextYear || String(new Date().getFullYear());
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  const dayOnlyMatch = trimmed.match(/^(\d{1,2})$/);
  if (dayOnlyMatch) {
    const day = dayOnlyMatch[1].padStart(2, '0');
    return `${contextYear}-${contextMonth}-${day}`;
  }

  const numericMatch = trimmed.match(/^(\d{2})(\d{2})$/);
  if (numericMatch) {
    const [_, day, month] = numericMatch;
    const m = month.padStart(2, '0');
    const y = contextYear || String(new Date().getFullYear());
    return `${y}-${m}-${day.padStart(2, '0')}`;
  }
  
  return `${contextYear}-${contextMonth}-01`;
};

export const parseImportedTime = (val: any): string => {
  if (val === undefined || val === null || val === '') return '12:00';
  if (typeof val === 'number') {
    const totalMinutes = Math.round(val * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  const match = s.match(/^(\d{1,2})[:.](\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return '12:00';
};

export const parseNumericValue = (val: any): number => {
  if (val === undefined || val === null || val === '') return NaN;
  if (typeof val === 'number') return val;
  
  let s = String(val).trim().toUpperCase();
  s = s.replace(/R\$/g, '').replace(/\s/g, '');
  
  const commaIdx = s.indexOf(',');
  const dotIdx = s.indexOf('.');
  
  if (commaIdx !== -1 && dotIdx !== -1) {
    if (commaIdx < dotIdx) {
      s = s.replace(/,/g, '');
    } else {
      s = s.replace(/\./g, '').replace(',', '.');
    }
  } else if (commaIdx !== -1) {
    s = s.replace(',', '.');
  }
  
  return Number(s);
};

export const inferCategory = (productName: string, existingCategory?: string): string => {
  if (existingCategory && existingCategory !== 'VENDA À VISTA' && existingCategory.trim() !== '') {
    const trimmedUpper = existingCategory.trim().toUpperCase();
    if (trimmedUpper.includes('CABELO')) return 'CABELOS';
    if (trimmedUpper.includes('MAQUIA')) return 'MAQUIAGEM';
    if (trimmedUpper.includes('PERFUM')) return 'PERFUMES';
    if (trimmedUpper.includes('CREME') || trimmedUpper.includes('SKIN')) return 'SKINCARE';
    return trimmedUpper;
  }
  const name = String(productName || '').toLowerCase();
  if (name.includes('cabelo') || name.includes('shampoo') || name.includes('condicionador') || name.includes('ampola') || name.includes('truss') || name.includes('loreal') || name.includes('wella') || name.includes('cronograma')) {
    return 'CABELOS';
  }
  if (name.includes('maquiagem') || name.includes('batom') || name.includes('rimel') || name.includes('base') || name.includes('pó') || name.includes('po') || name.includes('sombra') || name.includes('corretivo')) {
    return 'MAQUIAGEM';
  }
  if (name.includes('perfume') || name.includes('perume') || name.includes('colonia') || name.includes('olfat') || name.includes('fragranc') || name.includes('cheiro')) {
    return 'PERFUMES';
  }
  if (name.includes('creme') || name.includes('skincare') || name.includes('hidratante') || name.includes('serum') || name.includes('sabonete facial') || name.includes('protetor')) {
    return 'SKINCARE';
  }
  return 'OUTROS';
};

export const crc16ccitt = (data: string) => {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

export const generatePixPayload = (key: string, type: string = 'CPF', amount: number, name: string = 'BIOBEL', city: string = 'GRAVATAI') => {
  if (!key) return '';
  
  let cleanKey = key.trim();
  
  if (type === 'PHONE') {
    cleanKey = cleanKey.replace(/\D/g, '');
    if (cleanKey.length === 10 || cleanKey.length === 11) {
      cleanKey = `+55${cleanKey}`;
    } else if (!cleanKey.startsWith('+')) {
      cleanKey = `+${cleanKey}`;
    }
  } else if (type === 'CPF' || type === 'CNPJ') {
    cleanKey = cleanKey.replace(/\D/g, '');
  } else if (type === 'EMAIL' || type === 'RANDOM') {
    cleanKey = cleanKey.replace(/\s/g, '');
  }
  
  const merchantAccount = [
    '0014BR.GOV.BCB.PIX',
    '01', cleanKey.length.toString().padStart(2, '0'), cleanKey
  ].join('');

  const amountStr = amount.toFixed(2);
  const normalizedName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().substring(0, 25);
  const normalizedCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().substring(0, 15);

  const payload = [
    '000201',
    '26', merchantAccount.length.toString().padStart(2, '0'), merchantAccount,
    '52040000',
    '5303986',
    '54', amountStr.length.toString().padStart(2, '0'), amountStr,
    '5802BR',
    '59', normalizedName.length.toString().padStart(2, '0'), normalizedName,
    '60', normalizedCity.length.toString().padStart(2, '0'), normalizedCity,
    '62070503***',
    '6304'
  ].join('');

  return payload + crc16ccitt(payload);
};

export const formatCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .substring(0, 14);
  } else {
    return digits
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
      .substring(0, 18);
  }
};

