import { 
    cn, formatCurrency, getWhatsAppUrl, cleanData, normalizeVendedoraName, getSafeDate, getSaleLocalHours, formatDate, getLocalISOString, isSameLocalDay, formatDateWithDayOfWeek, formatPhone, APP_VERSION, formatCpfCnpj 
  } from './utils';;
import { PerformanceView } from './components/MonthlyGoalsView';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SefazMockPortal, NewCustomerForm } from './components/SuppliersView';
import { FuncaoRotinaView } from './components/StaffView';
import { CashierView } from './components/SalesView';
import { MonthlyGoalsView } from './components/MonthlyGoalsView';
import { GiveawaysView } from './components/GiveawaysView';
import { RafflesView } from './components/RafflesView';
import { ReportsView } from './components/ReportsView';
import { HomeView } from './components/HomeView';
import { DashboardView } from './components/DashboardView';
import { ProductsView } from './components/ProductsView';
import { CustomersView } from './components/CustomersView';
import { StaffView } from './components/StaffView';
import { RoutineView } from './components/RoutineView';
import { CampaignsView } from './components/CampaignsView';
import { ConfigView } from './components/ConfigView';
import { HelpView } from './components/HelpView';
import { BackupView } from './components/BackupView';
import { SalesView } from './components/SalesView';
import { BrandsView } from './components/BrandsView';
import { AdminProfileView } from './components/AdminProfileView';
import { FixedCostsView } from './components/FixedCostsView';
import { FinancialAccountsView } from './components/FinancialAccountsView';
import { CashFlowView } from './components/CashFlowView';
import { SuppliersView } from './components/SuppliersView';
import { 
  GoogleAuthProvider, signInWithPopup
} from 'firebase/auth';
import { 
  auth, db, signInAnonymously, signOut, onAuthStateChanged 
} from './firebase';
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, 
  onSnapshot, query, orderBy, increment, writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { 
  Store, Home, RefreshCw, CheckCircle2, AlertCircle, Info, X, 
  AlertTriangle, Calendar, UserCircle, ShoppingCart, 
  History, Wallet, Package, Target, LayoutDashboard, 
  ClipboardList, User as UserIcon, Sparkles, ReceiptText, Settings, Link as LinkIcon, 
  Database, LogOut, Search, Plus, Trash2, Edit2, List, 
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Download, Upload, Filter, Layers, Box, PlusCircle,
  ArrowUpRight, ArrowDownRight, TrendingUp, Users,
  DollarSign, ShoppingBag, Clock, MoreVertical,
  Menu, Bell, Moon, Sun, Laptop, QrCode, Disc, FileText, FileBarChart, FileSpreadsheet,
  BarChart3, Check, MessageCircle, CheckCircle, ClipboardList as ClipboardListIcon, ShoppingBag as ShoppingBagIcon, Package as PackageIcon, Trash2 as Trash2Icon, X as XIcon, Plus as PlusIcon, Search as SearchIcon, Wallet as WalletIcon,
  Megaphone, Send, Zap, Trophy, Eye, EyeOff, Tag, Gift, MapPin, Pencil, Star, StickyNote,
  Coffee, Instagram, Smartphone, LayoutGrid, BookOpen, Heart, Camera, MessageSquare, Mail, Palette, Printer, Lock, Unlock, PackageCheck, Repeat, PieChart as PieChartIcon, Percent,
  CloudRain, Umbrella, Trash, Award, Activity, Minus, Ticket, Copy, Truck,
  Globe, Hash, Calculator, FileCode, Building2, Handshake
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { InteractiveTips } from './components/interactivetips';
import { GestaoView } from './components/GestaoView';
import { ImprovementView } from './components/ImprovementView';
import { IncentiveCampaignView } from './components/IncentiveCampaignView';
import { SuppliersAndPurchasesView } from './components/SuppliersAndPurchasesView';
import { AgendaView, AgendaEvent } from './components/AgendaView';
import { ValidadesControlView } from './components/ValidadesControlView';
import { FiscalView } from './components/FiscalView';


// Silence harmless Recharts ResponsiveContainer console warnings about width/height during initial render
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (
      args[0] &&
      typeof args[0] === 'string' &&
      (args[0].includes('should be greater than 0') || args[0].includes('width(-1) and height(-1)'))
    ) {
      return;
    }
    originalWarn(...args);
  };
}

// --- Utilities ---
const normalizeHeaderStr = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

const findColIdx = (row: any[], keywords: string[]) => {
  if (!Array.isArray(row)) return -1;
  const normalizedKeywords = keywords.map(normalizeHeaderStr);
  return row.findIndex(cell => {
    const normCell = normalizeHeaderStr(String(cell || ''));
    return normalizedKeywords.some(k => normCell.includes(k));
  });
};

const PT_MONTHS_MAP: { [key: string]: string } = {
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

const parseImportedVendor = (rawVendor: string): string => {
  if (!rawVendor) return 'SISTEMA';
  const vendor = String(rawVendor).trim().toUpperCase();
  if (vendor.includes('ALESAN') || vendor.includes('ALESA')) return 'ALESSANDRA';
  if (vendor.includes('LETICIA') || vendor.includes('LETIC')) return 'LETICIA';
  if (vendor.includes('GABRIELA') || vendor.includes('GABRI')) return 'GABRIELA CLT';
  if (vendor.includes('DAY')) return 'DAY';
  return vendor;
};

const parseImportedProductAndBrand = (
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
      product = rawProduct; // Wella
      brand = rawProduct; // Wella is the brand
      category = rawBrand.toUpperCase(); // Cabelo
    } else {
      product = rawProduct;
      brand = rawBrand;
    }
  } else if (rawProduct) {
    product = rawProduct;
    brand = 'BIOBEL';
  } else if (rawBrand) {
    product = rawBrand; // Perume
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

const getMonthFromText = (text: string): string | null => {
  if (!text) return null;
  const normalized = text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // removes accents
  
  // Try exact Portuguese/English month name match with custom word boundaries supporting underscores
  for (const [key, val] of Object.entries(PT_MONTHS_MAP)) {
    const cleanKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const regex = new RegExp(`(?:^|[^a-zçãõáéíóú])${cleanKey}(?:[^a-zçãõáéíóú]|$)`, 'i');
    if (regex.test(normalized)) {
      return val;
    }
  }
  
  // Try pattern like "- 04 -" or "04_2026" or "04 - Biobel" or "05_financeiro" - supporting underscores and non-digit boundaries
  const mMatch = normalized.match(/(?:^|[^0-9])(0[1-9]|1[0-2])(?:[^0-9]|$)/);
  if (mMatch) {
    return mMatch[1];
  }
  
  return null;
};

const getYearFromText = (text: string): string | null => {
  if (!text) return null;
  // Match 4-digit years like 2026 bounded by non-digits or start/end of string (robust to underscores)
  const match = text.match(/(?:^|[^0-9])(20\d{2})(?:[^0-9]|$)/);
  return match ? match[1] : null;
};

const detectWorkbookContext = (fileNameOrUrl: string, sheetNames: string[]) => {
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

const coerceDateToContext = (dateStr: string, contextMonth: string, contextYear: string, originalVal?: any): string => {
  if (!dateStr) return '';
  
  // If the cell contains an explicit date (like an Excel serial number or a string with day and month), preserve it!
  if (originalVal !== undefined && originalVal !== null && originalVal !== '') {
    const sVal = String(originalVal).trim();
    if (typeof originalVal === 'number' && originalVal > 30000) {
      return dateStr; // Excel serial date: preserve the exact parsed date!
    }
    if (sVal.includes('/') || sVal.includes('-') || sVal.includes('.')) {
      const parts = sVal.split(/[./-]/).filter(Boolean);
      if (parts.length >= 2) {
        return dateStr; // Day and month (or year) explicitly specified: preserve!
      }
    }
    if (sVal.toLowerCase().includes(' de ')) {
      return dateStr;
    }
  }

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [_, y, m, d] = match;
    // Only coerce if the month or year doesn't match the context
    if (m !== contextMonth || y !== contextYear) {
      return `${contextYear}-${contextMonth}-${d}`;
    }
  }
  return dateStr;
};

const parseImportedDate = (val: any, fallbackStr: string = '', contextYearStr?: string, contextMonthStr?: string) => {
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
  
  // dd/mm/yyyy or dd.mm.yyyy
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (dmy) {
    let [_, d, m, y] = dmy;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // dd/mm or dd.mm (exactly 2 parts, no year)
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

  // Try parsing in format "dd de mmmm" or "dd de mmmm de yyyy"
  const ptDateMatch = s.toLowerCase().match(/^(\d{1,2})\s+de\s+([a-zçãõáéíóú]+)(?:\s+de\s+(\d{2,4}))?/i);
  if (ptDateMatch) {
    const [_, d, monthName, yearStr] = ptDateMatch;
    const cleanMonth = monthName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const m = PT_MONTHS_MAP[cleanMonth] || '01';
    let y = yearStr || contextYearStr || String(new Date().getFullYear());
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // try standard Date parsing
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

  return fallbackStr || new Date().toISOString().split('T')[0];
};

const isSalesSheet = (sheetName: string): boolean => {
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

const parseSheetNameDate = (sheetName: string, contextMonth: string, contextYear: string): string => {
  const trimmed = sheetName.trim();
  
  // 1. Try matching dd.mm.yyyy or dd/mm/yyyy or dd-mm-yyyy or dd.mm or dd/mm
  const dmyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/);
  if (dmyMatch) {
    const [_, day, month, year] = dmyMatch;
    const m = month.padStart(2, '0');
    let y = year || contextYear || String(new Date().getFullYear());
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m}-${day.padStart(2, '0')}`;
  }
  
  // 2. Try matching dd-maio-yyyy or dd de maio etc.
  const ptMatch = trimmed.match(/^(\d{1,2})(?:\s+de\s+|\s*[-./]\s*| de )([a-zçãõáéíóú]+)(?:\s+de\s+|\s*[-./]\s*| de )?(\d{2,4})?/i);
  if (ptMatch) {
    const [_, day, monthName, year] = ptMatch;
    const cleanMonth = monthName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const m = PT_MONTHS_MAP[cleanMonth] || contextMonth;
    let y = year || contextYear || String(new Date().getFullYear());
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // 3. Try matching just a single digit (like "01", "02", "1", "2")
  const dayOnlyMatch = trimmed.match(/^(\d{1,2})$/);
  if (dayOnlyMatch) {
    const day = dayOnlyMatch[1].padStart(2, '0');
    return `${contextYear}-${contextMonth}-${day}`;
  }

  // 4. Try matching compact 4-digit date without separators (like "1804" for 18/04)
  const numericMatch = trimmed.match(/^(\d{2})(\d{2})$/);
  if (numericMatch) {
    const [_, day, month] = numericMatch;
    const m = month.padStart(2, '0');
    const y = contextYear || String(new Date().getFullYear());
    return `${y}-${m}-${day.padStart(2, '0')}`;
  }
  
  // Default fallback: return first day of context month/year
  return `${contextYear}-${contextMonth}-01`;
};

const parseImportedTime = (val: any): string => {
  if (val === undefined || val === null || val === '') return '12:00';
  if (typeof val === 'number') {
    // Excel time value (fraction of a 24-hour day, e.g. 0.5 is 12:00)
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

const parseNumericValue = (val: any): number => {
  if (val === undefined || val === null || val === '') return NaN;
  if (typeof val === 'number') return val;
  
  let s = String(val).trim().toUpperCase();
  // Remove currency symbol, spaces, etc.
  s = s.replace(/R\$/g, '').replace(/\s/g, '');
  
  const commaIdx = s.indexOf(',');
  const dotIdx = s.indexOf('.');
  
  if (commaIdx !== -1 && dotIdx !== -1) {
    if (commaIdx < dotIdx) {
      // US format: 1,250.55 -> remove comma
      s = s.replace(/,/g, '');
    } else {
      // BR format: 1.250,55 -> remove dot, replace comma with dot
      s = s.replace(/\./g, '').replace(',', '.');
    }
  } else if (commaIdx !== -1) {
    // BR simple format: 150,00 -> replace comma with dot
    s = s.replace(',', '.');
  } else {
    // Standard format or plain number: do nothing
  }
  
  return Number(s);
};

const inferCategory = (productName: string, existingCategory?: string): string => {
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

const crc16ccitt = (data: string) => {
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

const generatePixPayload = (key: string, type: string = 'CPF', amount: number, name: string = 'BIOBEL', city: string = 'GRAVATAI') => {
  if (!key) return '';
  
  // Clean key based on type
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
  
  const amountStr = amount.toFixed(2);
  
  // Normalize strings for PIX (No accents, uppercase)
  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9 ]/gi, "").toUpperCase();
  const normalizedName = normalize(name || 'BIOBEL').substring(0, 25);
  const normalizedCity = normalize(city || 'GRAVATAI').substring(0, 15);
  
  // Tag 26: Merchant Account Information
  const gui = "br.gov.bcb.pix";
  const part00 = `00${gui.length.toString().padStart(2, '0')}${gui}`;
  const part01 = `01${cleanKey.length.toString().padStart(2, '0')}${cleanKey}`;
  const merchantAccount = part00 + part01;
  
  const payload = [
    '000201', // Payload Format Indicator
    '26', merchantAccount.length.toString().padStart(2, '0'), merchantAccount,
    '52040000', // Merchant Category Code
    '5303986', // Transaction Currency (986 = BRL)
    '54', amountStr.length.toString().padStart(2, '0'), amountStr,
    '5802BR', // Country Code
    '59', normalizedName.length.toString().padStart(2, '0'), normalizedName,
    '60', normalizedCity.length.toString().padStart(2, '0'), normalizedCity,
    '62070503***', // Additional Data Field
    '6304' // CRC prefix
  ].join('');

  return payload + crc16ccitt(payload);
};


// Helper to clean objects for Firestore (removes undefined)


// --- Types ---
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role: 'admin' | 'user';
  isLocal?: boolean;
}

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  isService?: boolean;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  barcode?: string;
  lastSoldAt?: string;
  image?: string;
  description?: string;
  expiryDate?: string;
  type: 'avulso' | 'combo' | 'kit' | 'pack';
  kitMode?: 'montar' | 'pronto';
  comboItems?: { productId: string; quantity: number }[];
  isFavorite?: boolean;
  status?: 'active' | 'inactive' | 'discontinued';
  createdAt?: string;
  promoPixPrice?: number;
  promoCardPrice?: number;
  promoMoneyPrice?: number;
  packContents?: string;
  isRaffle?: boolean;
}

interface StockBatch {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  supplierId: string;
  supplierName: string;
  arrivalDate: string; // YYYY-MM-DD
  quantity: number;
  cost: number;
  expiryDate: string; // YYYY-MM-DD
  paymentDate: string; // YYYY-MM-DD
  paymentStatus: 'paid' | 'pending';
  batchNumber?: string;
}

interface Staff {
  id: string;
  name: string;
  role: 'Estagiária' | 'CLT' | 'Dona' | 'Sócia';
  startDate: string;
  phone: string;
  commission?: number; // % commission (base commission rate)
  commissionService?: number; // % commission for services
  commissionProduct?: number; // % commission for products
  goal?: number; // Monthly goal
  activities?: string[]; 
  status?: 'active' | 'inactive';
  dismissalDate?: string;
}

interface StoreSettings {
  name: string;
  logo?: string;
  phone: string;
  email: string;
  address: string;
  instagram?: string;
  website?: string;
  primaryColor: string;
  theme: 'light' | 'dark';
  principalMenus?: string[];
  googleSheetsUrl?: string;
  additionalGoogleSheetsUrls?: string[];
  adminPassword?: string;
  adminPhoto?: string;
  pixKey?: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM';
  pixEnabled?: boolean;
   couponEnabled?: boolean;
   chartColors?: string[];
   hasSeenPixPromo?: boolean;
   showPastWeekdayTracker?: boolean;
   backupEmail?: string;
   backupTime?: string;
   backupEnabled?: boolean;
   dashboardConfig?: {
    showQuickActions: boolean;
    showWeeklyChart: boolean;
    showAverageTicket: boolean;
    showCashierStatus: boolean;
    showGoalProgress: boolean;
    showLowStockAlerts: boolean;
    showPendingBills: boolean;
    showBirthdays: boolean;
  };
  receiptConfig?: {
    showLogo: boolean;
    showAddress: boolean;
    showPhone: boolean;
    showInstagram: boolean;
    showDiscount: boolean;
    showSeller: boolean;
    customMessage: string;
  };
  maxDiscountLimit?: number;
  operatingHours?: {
    weekdayOpen: string;
    weekdayClose: string;
    saturdayOpen: string;
    saturdayClose: string;
    segOpen?: string;
    segClose?: string;
    segClosed?: boolean;
    terOpen?: string;
    terClose?: string;
    terClosed?: boolean;
    quaOpen?: string;
    quaClose?: string;
    quaClosed?: boolean;
    quiOpen?: string;
    quiClose?: string;
    quiClosed?: boolean;
    sexOpen?: string;
    sexClose?: string;
    sexClosed?: boolean;
    sabOpenDetail?: string;
    sabCloseDetail?: string;
    sabClosed?: boolean;
    domOpen?: string;
    domClose?: string;
    domClosed?: boolean;
  };
  workingWeekdays?: number[];
  excludeHolidaysFromCalculations?: boolean;
  taxRegime?: string;
  bankAccounts?: {
    id: string;
    bankName: string;
    agency: string;
    account: string;
    type: string;
  }[];
  officialProviders?: {
    id: string;
    name: string;
    cnpj?: string;
    phone?: string;
    brand?: string;
    offersGift?: boolean;
    giftDescription?: string;
  }[];
  cardRates?: {
    debit: number;
    credit1x: number;
    creditInstallment: number;
  };
  taxesAndRates?: {
    simplesNacional: number;
    icms: number;
    iss: number;
  };
  watermarkText?: string;
  keyboardShortcutsEnabled?: boolean;
  emailNotifications?: {
    dailyCashierChange: boolean;
    lowStock: boolean;
    goalsAchieved: boolean;
  };
}

interface Withdrawal {
  id: string;
  amount: number;
  time: string;
  reason: string;
  type: 'withdrawal' | 'reinforcement';
}

interface FixedCost {
  id: string;
  description: string;
  amount: number;
  dueDate: number; // Day of the month
  status: 'paid' | 'pending';
}

interface FinancialAccount {
  id: string;
  type: 'payable' | 'receivable'; // Pagar ou Receber
  category: string; // Ex: boleto de fornecedor, energia, água, outros
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: 'paid' | 'pending';
  paymentDate?: string;
  supplierId?: string; // Optional reference to a supplier
}

interface CashierSession {
  id: string;
  openingTime: string;
  closingTime?: string;
  openingBalance: number;
  closingBalance?: number;
  withdrawals: Withdrawal[];
  payments: {
    pix: number;
    dinheiro: number;
    debito: number;
    credito: number;
    outros: number;
  };
  status: 'open' | 'closed';
}

interface Campaign {
  id: string;
  name: string;
  type: 'new_customers' | 'retention_30d' | 'custom';
  message: string;
  createdAt: string;
}

interface Giveaway {
  id: string;
  name: string;
  description: string;
  date: string;
  winnerId?: string;
  winnerName?: string;
  status: 'pending' | 'completed';
  participants: string[];
  eligibilityType?: 'spend_threshold' | 'any_sale' | 'custom';
  eligibilityValue?: number;
  eligibilityCustomText?: string;
}

interface RaffleTicket {
  number: number;
  buyerName: string;
  buyerPhone: string;
  status: 'available' | 'reserved' | 'paid';
  soldAt?: string;
  vendedora?: string;
}

interface Raffle {
  id: string;
  title: string;
  prizeDescription: string;
  prizeValue: number;
  ticketPrice: number;
  totalNumbers: number;
  deadlineDate: string;
  drawDate: string;
  status: 'active' | 'drawn' | 'cancelled';
  tickets: RaffleTicket[];
  winnerNumber?: number;
  winnerName?: string;
  winnerPhone?: string;
  winnerVendedora?: string;
  createdAt: string;
  eligibilityType?: 'spend_threshold' | 'any_sale' | 'custom';
  eligibilityValue?: number;
  eligibilityCustomText?: string;
}

interface RoutineActivity {
  id: string;
  description: string;
  completed: boolean;
  startedAt?: string;
  completedAt?: string;
}

interface Routine {
  id: string;
  staffId: string;
  staffName: string;
  activities: RoutineActivity[];
  date: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  gender?: string;
  city?: string;
  address?: string;
  birthDate?: string;
  email?: string;
  cpf?: string;
  notes?: string;
  points?: number;
  debt?: number;
  tier?: 'BRONZE' | 'PRATA' | 'OURO';
  tags?: string[];
  crmStatus?: 'novo' | 'negociacao' | 'pos_venda' | 'fidelizado' | 'resgatar';
  createdAt: string;
}

interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  brand?: string;
  category?: string;
  isRaffle?: boolean;
  raffleId?: string;
  raffleTicketNumber?: number;
}

interface Payment {
  method: string;
  amount: number;
}

interface Sale {
  id: string;
  date: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  vendedora?: string;
  total: number;
  discount: number;
  paymentMethod: string; // Keep for backward compatibility or primary method
  payments?: Payment[]; // New field for split payments
  status: string;
  items: SaleItem[];
  type?: 'Presencial' | 'Digital';
  category?: string;
  commission?: number;
  sessionId?: string;
  notes?: string;
}

interface MonthlyGoal {
  id: string; // YYYY-MM
  month: string;
  storeGoal: number;
  extraBonus: number;
  workingDays: number;
  holidays: string[];
  workHoursWeekday: number;
  workHoursSaturday: number;
  saturdayGoal: number;
  saturdayGoalType?: 'single' | 'split' | 'individual';
  saturdayGoalShort?: number;
  saturdayGoalShortCount?: number;
  saturdayGoalLong?: number;
  saturdayGoalLongCount?: number;
  saturdaySchedules?: {
    [dateStr: string]: {
      openTime: string;
      closeTime: string;
      goal: number;
    }
  };
  staffGoals: {
    [staffName: string]: {
      monthlyGoal: number;
      commission: number;
    }
  };
  customEvents?: { id: string; date: string; name: string; description?: string }[];
}

interface DashboardViewProps {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  products: Product[];
  customers: Customer[];
  staff: Staff[];
  settings: StoreSettings;
  monthlyGoals: MonthlyGoal[];
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  ensureAuthSession: () => Promise<boolean>;
  addNotification: (message: string, type: Notification['type']) => void;
  isCashierOpen: boolean;
  setActiveTab: (tab: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  weatherObservations: {[dateStr: string]: { condition: string; notes: string }};
  setWeatherObservations: React.Dispatch<React.SetStateAction<{[dateStr: string]: { condition: string; notes: string }}>>;
  activeDashboardTab?: any;
  setActiveDashboardTab?: (tab: any) => void;
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>;
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  cashierSessions?: CashierSession[];
  setCashierSessions?: React.Dispatch<React.SetStateAction<CashierSession[]>>;
  currentCashierSession?: CashierSession | null;
  setCurrentCashierSession?: React.Dispatch<React.SetStateAction<CashierSession | null>>;
  handleWhatsAppShare?: (sale?: Sale) => void;
  handlePrintReceipt?: (sale?: Sale) => void;
  handleCopyText?: (sale?: Sale) => void;
  handleDownloadPDF?: (sale?: Sale) => void;
  raffles?: Raffle[];
  setRaffles?: React.Dispatch<React.SetStateAction<Raffle[]>>;
  stockBatches?: StockBatch[];
  setStockBatches?: React.Dispatch<React.SetStateAction<StockBatch[]>>;
}

interface ProductsViewProps {
  products: Product[];
  sales: Sale[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  brands: Brand[];
  productCategories: Category[];
  setProductCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  addNotification: (message: string, type?: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: any;
  formatCurrency: (value: number) => string;
  typeFilter?: 'avulso' | 'combo' | 'kit' | 'pack';
  ensureAuthSession: () => Promise<boolean>;
  stockBatches?: StockBatch[];
  setStockBatches?: React.Dispatch<React.SetStateAction<StockBatch[]>>;
  settings?: StoreSettings;
  setSettings?: React.Dispatch<React.SetStateAction<StoreSettings>>;
  financialAccounts?: FinancialAccount[];
  setFinancialAccounts?: React.Dispatch<React.SetStateAction<FinancialAccount[]>>;
}

interface StaffViewProps {
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  addNotification: (message: string, type?: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  formatDate: (date: string) => string;
  ensureAuthSession: () => Promise<boolean>;
  sales?: Sale[];
  productCategories?: Category[];
  formatCurrency?: (val: number) => string;
}

interface RoutineViewProps {
  routines: Routine[];
  setRoutines: React.Dispatch<React.SetStateAction<Routine[]>>;
  staff: Staff[];
  addNotification: (message: string, type?: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  formatDate: (date: string) => string;
  ensureAuthSession: () => Promise<boolean>;
}

interface BackupViewProps {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  brands: Brand[];
  setBrands: React.Dispatch<React.SetStateAction<Brand[]>>;
  fixedCosts: FixedCost[];
  setFixedCosts: React.Dispatch<React.SetStateAction<FixedCost[]>>;
  financialAccounts?: FinancialAccount[];
  setFinancialAccounts?: React.Dispatch<React.SetStateAction<FinancialAccount[]>>;
  monthlyGoals: MonthlyGoal[];
  setMonthlyGoals: React.Dispatch<React.SetStateAction<MonthlyGoal[]>>;
  productCategories: Category[];
  setProductCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  addNotification: (message: string, type?: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  driveToken: string | null;
  setDriveToken: React.Dispatch<React.SetStateAction<string | null>>;
  isSyncingSheets: boolean;
  setIsSyncingSheets: React.Dispatch<React.SetStateAction<boolean>>;
  handleSyncGoogleSheetsLive: (silent?: boolean) => Promise<void>;
  setSelectedMonth?: (month: string) => void;
  cloudSyncEnabled?: boolean;
  cloudSyncing?: boolean;
  storeId?: string;
  setStoreId?: React.Dispatch<React.SetStateAction<string>>;
  lastCloudSyncTime?: string | null;
  enableCloudSync?: () => Promise<void>;
  disableCloudSync?: () => void;
}

interface CustomersViewProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  sales: Sale[];
  products: Product[];
  campaigns: Campaign[];
  addNotification: (message: string, type: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  formatDate: (date: string) => string;
  formatCurrency: (value: number) => string;
  setSelectedCustomer: (customer: Customer | null) => void;
  setActiveTab: (tab: string) => void;
  ensureAuthSession: () => Promise<boolean>;
}

interface SalesViewProps {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  customers: Customer[];
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>;
  products?: Product[];
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  cashierSessions?: CashierSession[];
  setCashierSessions?: React.Dispatch<React.SetStateAction<CashierSession[]>>;
  currentCashierSession?: CashierSession | null;
  setCurrentCashierSession?: React.Dispatch<React.SetStateAction<CashierSession | null>>;
  formatDate: (date: string) => string;
  formatCurrency: (value: number) => string;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  ensureAuthSession: () => Promise<boolean>;
  addNotification: (message: string, type: Notification['type']) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  monthlyGoals: any[];
  staff?: Staff[];
  handleWhatsAppShare?: (sale?: Sale) => void;
  handlePrintReceipt?: (sale?: Sale) => void;
  handleCopyText?: (sale?: Sale) => void;
  handleDownloadPDF?: (sale?: Sale) => void;
  weatherObservations?: {[dateStr: string]: { condition: string; notes: string }};
  raffles?: Raffle[];
  setRaffles?: React.Dispatch<React.SetStateAction<Raffle[]>>;
}

interface CashierViewProps {
  formatCurrency: (value: number) => string;
  isCashierOpen: boolean;
  currentSession: CashierSession | null;
  sessions: CashierSession[];
  sales: Sale[];
  onOpenCashier: (balance: number) => void;
  onCloseCashier: (balance: number) => void;
  onAddWithdrawal: (amount: number, reason: string, type?: 'withdrawal' | 'reinforcement') => void;
  formatDate: (date: string) => string;
}

interface CampaignsViewProps {
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  customers: Customer[];
  sales: Sale[];
  addNotification: (message: string, type?: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  formatDate: (date: string) => string;
  ensureAuthSession: () => Promise<boolean>;
  products?: Product[];
  routines?: Routine[];
  monthlyGoals?: MonthlyGoal[];
}

interface AtendimentoViewProps {
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  cart: SaleItem[];
  setCart: React.Dispatch<React.SetStateAction<SaleItem[]>>;
  products: Product[];
  customers: Customer[];
  selectedCustomer: Customer | null;
  setSelectedCustomer: React.Dispatch<React.SetStateAction<Customer | null>>;
  vendedora: string;
  setVendedora: React.Dispatch<React.SetStateAction<string>>;
  paymentMethod: string;
  setPaymentMethod: React.Dispatch<React.SetStateAction<string>>;
  atendimentoProductSearch: string;
  setAtendimentoProductSearch: React.Dispatch<React.SetStateAction<string>>;
  atendimentoCustomerSearch: string;
  setAtendimentoCustomerSearch: React.Dispatch<React.SetStateAction<string>>;
  newCustomer: { name: string; phone: string };
  setNewCustomer: React.Dispatch<React.SetStateAction<{ name: string; phone: string }>>;
  isAddingCustomer: boolean;
  setIsAddingCustomer: React.Dispatch<React.SetStateAction<boolean>>;
  viewMode: 'Presencial' | 'Digital';
  setViewMode: React.Dispatch<React.SetStateAction<'Presencial' | 'Digital'>>;
  discount: number;
  setDiscount: React.Dispatch<React.SetStateAction<number>>;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  handleQuickAddCustomer: () => Promise<void>;
  handleFinalizeSale: () => Promise<void>;
  handleDownloadPDF: () => void;
  handleCopyText: () => void;
  handleWhatsAppShare: () => void;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
  addNotification: (message: string, type?: Notification['type']) => void;
  prevStep: () => void;
  nextStep: () => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

// --- Components ---

const NotificationToast = ({ notifications, removeNotification }: { 
  notifications: Notification[], 
  removeNotification: (id: string) => void 
}) => (
  <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    <AnimatePresence>
      {notifications.map((n) => (
        <motion.div
          key={n.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px]",
            n.type === 'success' && "bg-emerald-500 text-white",
            n.type === 'error' && "bg-rose-500 text-white",
            n.type === 'info' && "bg-blue-500 text-white",
            n.type === 'warning' && "bg-amber-500 text-white"
          )}
        >
          {n.type === 'success' && <CheckCircle2 size={20} />}
          {n.type === 'error' && <AlertCircle size={20} />}
          {n.type === 'info' && <Info size={20} />}
          {n.type === 'warning' && <AlertTriangle size={20} />}
          <span className="flex-1 text-sm font-medium">{n.message}</span>
          <button onClick={() => removeNotification(n.id)} className="hover:opacity-80">
            <X size={18} />
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

const LocalModeBadge = () => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className="fixed top-4 right-4 z-[60]"
  >
    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-200 text-amber-700 rounded-full shadow-sm animate-pulse">
      <Database size={14} />
      <span className="text-xs font-bold uppercase tracking-wider">Modo Local (Offline)</span>
    </div>
  </motion.div>
);

// --- Main App Component ---

// --- Views ---






















export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isSignInDriveLoading, setIsSignInDriveLoading] = useState(false);
  const [isExportingSheets, setIsExportingSheets] = useState(false);

  const [cloudSyncEnabled, setCloudSyncEnabled] = useState<boolean>(() => localStorage.getItem('biobel_cloud_sync') === 'true');
  const [cloudSyncing, setCloudSyncing] = useState<boolean>(false);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(() => localStorage.getItem('biobel_last_cloud_sync'));
  const [storeId, setStoreId] = useState<string>(() => localStorage.getItem('biobel_store_id') || 'biobel');
  const lastCloudData = useRef<Record<string, string>>({});



  const handleSyncGoogleSheetsLive = async (silent: boolean = false) => {
    const mainUrl = settings?.googleSheetsUrl;
    const additionalUrls = settings?.additionalGoogleSheetsUrls || [];
    const allUrls = [mainUrl, ...additionalUrls].filter(Boolean) as string[];

    if (allUrls.length === 0) {
      if (!silent) addNotification('Por favor, defina a URL da planilha Google Sheets nas configurações.', 'warning');
      return;
    }

    setIsSyncingSheets(true);
    if (!silent) {
      addNotification(`Sincronizando dados com ${allUrls.length} planilha(s) na nuvem...`, 'info');
    }

    let overallSuccess = false;
    let totalImportedSales: Sale[] = [];
    let totalImportedProducts: Product[] = [];
    let totalImportedCustomers: Customer[] = [];

    for (const sheetUrl of allUrls) {
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const spreadsheetId = match ? match[1] : null;

      if (!spreadsheetId) {
        if (!silent) addNotification(`Link do Google Sheets inválido: ${sheetUrl}. Certifique-se de usar a URL completa do navegador.`, 'error');
        continue;
      }

      try {
        let arrayBuffer: ArrayBuffer;

        if (driveToken) {
          // Authenticated Google Drive API
          const exportUrl = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
          const res = await fetch(exportUrl, {
            headers: { Authorization: `Bearer ${driveToken}` }
          });

          if (!res.ok) {
            throw new Error('Erro ao baixar planilha do Google Sheets pela API do Drive.');
          }
          arrayBuffer = await res.arrayBuffer();
        } else {
          // Public/shared Google Sheet format with CORS bypass proxy fallback
          const publicUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(publicUrl)}`;
          
          let res: Response;
          try {
            res = await fetch(publicUrl);
            if (!res.ok) throw new Error();
          } catch (e) {
            res = await fetch(proxyUrl);
          }

          if (!res.ok) {
            throw new Error('Não foi possível sincronizar com a planilha na nuvem de forma automática. Certifique-se de que a planilha está com acesso público configurado como "Qualquer pessoa com o link pode ver".');
          }
          arrayBuffer = await res.arrayBuffer();
        }

        const arrayData = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(arrayData, { type: 'array' });

        let foundData = false;

        // 1. Products
        const productsSheetName = workbook.SheetNames.find(n => 
          ['Produtos', 'PRODUTOS', 'Products', 'Estoque', 'ESTOQUE'].includes(n)
        );

        if (productsSheetName) {
          const sheet = workbook.Sheets[productsSheetName];
          const imported = XLSX.utils.sheet_to_json(sheet) as any[];
          const formatted: Product[] = imported.map((p, idx) => {
            const stableId = p.ID || p.id || `P-${String(p.Nome || p.nome || p.Produto || p.produto || idx).trim().toLowerCase().replace(/\s+/g, '-')}`;
            return {
              id: String(stableId),
              name: String(p.Nome || p.nome || p.Name || p.name || p.Produto || p.produto || ''),
              brand: String(p.Marca || p.marca || p.Brand || p.brand || ''),
              category: String(p.Categoria || p.categoria || p.Category || p.category || ''),
              price: Number(p.Preco || p.preço || p.Price || p.price || p.Valor || p.valor) || 0,
              cost: Number(p.Custo || p.custo || p.Cost || p.cost) || 0,
              stock: Number(p.Estoque || p.estoque || p.Stock || p.stock || p.Quantidade || p.quantidade) || 0,
              minStock: Number(p.Minimo || p.minimo || p.MinStock || p.min_stock) || 0,
              type: 'avulso'
            };
          });
          if (formatted.length > 0) {
            totalImportedProducts.push(...formatted);
            foundData = true;
          }
        }

        // 2. Customers
        const customersSheetName = workbook.SheetNames.find(n => 
          ['Clientes', 'CLIENTES', 'Customers', 'Contatos', 'CONTATOS'].includes(n)
        );

        if (customersSheetName) {
          const sheet = workbook.Sheets[customersSheetName];
          const imported = XLSX.utils.sheet_to_json(sheet) as any[];
          const formatted: Customer[] = imported.map((c, idx) => {
            const stableId = c.ID || c.id || `C-${String(c.Nome || c.nome || idx).trim().toLowerCase().replace(/\s+/g, '-')}`;
            return {
              id: String(stableId),
              name: String(c.Nome || c.nome || c.Name || c.name || ''),
              phone: String(c.Telefone || c.telefone || c.Phone || c.phone || c.Celular || c.celular || ''),
              email: String(c.Email || c.email || ''),
              cpf: String(c.CPF || c.cpf || ''),
              lastVisit: c.UltimaVisita || c.last_visit || '',
              notes: String(c.Observacoes || c.observações || c.notes || ''),
              totalSpent: Number(c.TotalGasto || c.total_spent) || 0,
              points: Number(c.Pontos || c.points) || 0,
              createdAt: new Date().toISOString()
            };
          });
          if (formatted.length > 0) {
            totalImportedCustomers.push(...formatted);
            foundData = true;
          }
        }

        // 3. Sales
        const workbookContext = detectWorkbookContext(sheetUrl || '', workbook.SheetNames);
        const syncContextYear = workbookContext.year;
        const syncContextMonth = workbookContext.month;

        workbook.SheetNames.forEach(sheetName => {
          if (!isSalesSheet(sheetName)) return;

          const sheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          if (rawData.length === 0) return;

          let sheetDate = parseSheetNameDate(sheetName, syncContextMonth, syncContextYear);
          const firstCell = String(rawData[0] ? rawData[0][0] : '');
          
          if (/^\d{1,2}[./-]\d{1,2}/.test(firstCell)) {
            sheetDate = parseImportedDate(firstCell.split(/\s/)[0], '', syncContextYear, syncContextMonth);
          }

          sheetDate = coerceDateToContext(sheetDate, syncContextMonth, syncContextYear);

          // Detect Header with flexible scoring
          let headerIdx = -1;
          let colMap: { [key: string]: number } = {};
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
            const qtyIdx = findColIdx(row, ['quantidade', 'itens vendidos', 'n de itens', 'itens', 'peças', 'pecas', 'items', 'qt', 'qtd', 'qty', 'quantity']);
            const horaIdx = findColIdx(row, ['hora', 'horário', 'horario', 'time']);

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
                marca: brandIdx,
                quantidade: qtyIdx !== -1 ? qtyIdx : (row.length > 8 ? 8 : -1),
                hora: horaIdx !== -1 ? horaIdx : (row.length > 11 ? 11 : -1)
              };
            }
          }

          if (headerIdx !== -1) {
            // Priority 1: Grid Mode (Multiple payment columns)
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
                if (String(row[0] || '').toLowerCase().includes('total')) continue;

                pMethods.forEach(pm => {
                  const colIdx = colMap[pm.key];
                  if (colIdx === -1 || colIdx === undefined) return;

                  const val = row[colIdx];
                  if (val === undefined || val === null || val === '') return;
                  
                  const numVal = parseNumericValue(val);
                  
                  if (!isNaN(numVal) && numVal > 0) {
                    const vendor = parseImportedVendor(colMap.vendedora !== -1 ? String(row[colMap.vendedora] || '') : '');
                    const { product, brand: itemBrand, category: itemCategory } = parseImportedProductAndBrand(row, colMap);
                    
                    const rawRowDate = colMap.data !== -1 ? parseImportedDate(row[colMap.data], sheetDate, syncContextYear, syncContextMonth) : sheetDate;
                    const rowDate = coerceDateToContext(rawRowDate, syncContextMonth, syncContextYear, colMap.data !== -1 ? row[colMap.data] : undefined);

                    const inferredCategory = inferCategory(product, itemCategory);

                    let qty = 1;
                    if (colMap.quantidade !== undefined && colMap.quantidade !== -1) {
                      const valQty = row[colMap.quantidade];
                      if (valQty !== undefined && valQty !== null && valQty !== '') {
                        qty = Math.max(1, parseInt(String(valQty)) || 1);
                      }
                    }

                    let saleTime = '12:00';
                    if (colMap.hora !== undefined && colMap.hora !== -1) {
                      const valTime = row[colMap.hora];
                      if (valTime !== undefined && valTime !== null && valTime !== '') {
                        saleTime = parseImportedTime(valTime);
                      }
                    }

                    const stableId = `S-GRID-${sheetName}-${i}-${pm.key}`;

                    totalImportedSales.push({
                      id: stableId,
                      date: `${rowDate}T${saleTime}:00Z`,
                      vendedora: vendor,
                      total: numVal,
                      discount: 0,
                      paymentMethod: pm.label as any,
                      status: 'completed',
                      category: inferredCategory,
                      items: [{ productId: `imported-${product.toLowerCase().replace(/\s+/g, '-')}`, name: product, quantity: qty, price: numVal / qty, total: numVal, brand: itemBrand, category: inferredCategory }],
                      customerId: '',
                      customerName: 'Cliente Importado',
                      commission: 0
                    });
                  }
                });
              }
            } 
            // Priority 2: Standard Table Mode (One sale per row)
            else if (colMap.total !== -1) {
              for (let i = headerIdx + 1; i < rawData.length; i++) {
                const row = rawData[i];
                if (!row || !Array.isArray(row)) continue;
                if (String(row[colMap.total] || '').toLowerCase().includes('total')) continue;

                const total = parseNumericValue(row[colMap.total]);
                
                if (!isNaN(total) && total > 0) {
                  const vendor = parseImportedVendor(colMap.vendedora !== -1 ? String(row[colMap.vendedora] || '') : '');
                  const { product, brand: itemBrand, category: itemCategory } = parseImportedProductAndBrand(row, colMap);
                  
                  const rawRowDate = colMap.data !== -1 ? parseImportedDate(row[colMap.data], sheetDate, syncContextYear, syncContextMonth) : sheetDate;
                  const rowDate = coerceDateToContext(rawRowDate, syncContextMonth, syncContextYear, colMap.data !== -1 ? row[colMap.data] : undefined);
                  let method = colMap.pagamento !== -1 ? String(row[colMap.pagamento] || 'Outros') : 'Outros';
                  
                  const pm = method.toUpperCase();
                  let paymentMethod = 'OUTROS';
                  if (pm.includes('PIX')) paymentMethod = 'PIX';
                  else if (pm.includes('DINHEIRO') || pm.includes('ESP')) paymentMethod = 'DINHEIRO';
                  else if (pm.includes('CRED') || pm.includes('CART')) paymentMethod = 'CRÉDITO';
                  else if (pm.includes('DEB')) paymentMethod = 'DÉBITO';

                  const discount = colMap.desconto !== -1 ? (Number(row[colMap.desconto]) || 0) : 0;

                  const inferredCategory = inferCategory(product, itemCategory);

                  let qty = 1;
                  if (colMap.quantidade !== undefined && colMap.quantidade !== -1) {
                    const valQty = row[colMap.quantidade];
                    if (valQty !== undefined && valQty !== null && valQty !== '') {
                      qty = Math.max(1, parseInt(String(valQty)) || 1);
                    }
                  }

                  let saleTime = '12:00';
                  if (colMap.hora !== undefined && colMap.hora !== -1) {
                    const valTime = row[colMap.hora];
                    if (valTime !== undefined && valTime !== null && valTime !== '') {
                      saleTime = parseImportedTime(valTime);
                    }
                  }

                  const stableId = `S-ROW-${sheetName}-${i}`;

                  totalImportedSales.push({
                    id: stableId,
                    date: `${rowDate}T${saleTime}:00Z`,
                    vendedora: vendor,
                    total,
                    discount,
                    paymentMethod: paymentMethod as any,
                    status: 'completed',
                    category: inferredCategory,
                    items: [{ productId: `imported-${product.toLowerCase().replace(/\s+/g, '-')}`, name: product, quantity: qty, price: total / qty, total: total, brand: itemBrand, category: inferredCategory }],
                    customerId: '',
                    customerName: 'Cliente Importado',
                    commission: 0
                  });
                }
              }
            }
          }
        });

        if (foundData || totalImportedSales.length > 0) {
          foundData = true;
        }

        if (foundData) {
          overallSuccess = true;
        }
      } catch (e: any) {
        console.error(`Falha ao sincronizar planilha individual ${sheetUrl}:`, e);
        if (!silent) addNotification(`Falha ao sincronizar planilha individual: ` + (e.message || ''), 'error');
      }
    }

    if (totalImportedProducts.length > 0) {
      setProducts(prev => {
        const map = new Map(prev.map(p => [p.id, p]));
        totalImportedProducts.forEach(p => map.set(p.id, p));
        return Array.from(map.values());
      });
      addNotification(`${totalImportedProducts.length} produtos sincronizados da nuvem!`, 'success');
    }

    if (totalImportedCustomers.length > 0) {
      setCustomers(prev => {
        const map = new Map(prev.map(c => [c.id, c]));
        totalImportedCustomers.forEach(c => map.set(c.id, c));
        return Array.from(map.values());
      });
      addNotification(`${totalImportedCustomers.length} clientes sincronizados da nuvem!`, 'success');
    }

    if (totalImportedSales.length > 0) {
      setSales(prev => {
        const manualSales = prev.filter(s => !s.id.startsWith('S-GRID-') && !s.id.startsWith('S-ROW-'));
        const map = new Map(manualSales.map(s => [s.id, s]));
        totalImportedSales.forEach(s => map.set(s.id, s));
        return Array.from(map.values());
      });
      addNotification(`${totalImportedSales.length} registros de vendas sincronizados do Google Sheets em tempo real!`, 'success');
    }

    if (overallSuccess) {
      if (!silent) addNotification('Sincronização em tempo real concluída com sucesso!', 'success');
    } else {
      if (!silent) addNotification('Nenhum dado compatível (Produtos, Clientes ou Vendas) foi identificado nas planilhas.', 'warning');
    }

    setIsSyncingSheets(false);
  };

  const handleConnectGoogleDrive = async () => {
    setIsSignInDriveLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setDriveToken(credential.accessToken);
        setGoogleUser(result.user);
        addNotification('Conta Google conectada com sucesso!', 'success');
      } else {
        throw new Error('Falha ao obter token de acesso do Google.');
      }
    } catch (e: any) {
      console.error(e);
      addNotification('Erro ao conectar à Conta Google: ' + (e.message || ''), 'error');
    } finally {
      setIsSignInDriveLoading(false);
    }
  };

  const handleExportToGoogleSheetsLive = async (silent: boolean = false) => {
    const sheetUrl = settings?.googleSheetsUrl;
    if (!sheetUrl) {
      if (!silent) addNotification('URL da planilha não configurada.', 'warning');
      return;
    }

    if (!driveToken) {
      if (!silent) addNotification('Sua conta Google precisa estar conectada para atualizar a planilha na nuvem.', 'warning');
      return;
    }

    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = match ? match[1] : null;

    if (!spreadsheetId) {
      if (!silent) addNotification('ID de planilha inválido.', 'error');
      return;
    }

    setIsExportingSheets(true);
    if (!silent) {
      addNotification('Enviando e atualizando dados na sua planilha Google Sheets...', 'info');
    }

    try {
      const wb = XLSX.utils.book_new();

      // Sales Sheet
      const salesData = sales.map(s => ({
        ID: s.id,
        Data: s.date,
        Vendedora: s.vendedora,
        Total: s.total,
        Metodo: s.paymentMethod,
        Status: s.status,
        Itens: s.items ? s.items.map(i => `${i.name} (${i.quantity}x)`).join(', ') : ''
      }));
      const wsSales = XLSX.utils.json_to_sheet(salesData);
      XLSX.utils.book_append_sheet(wb, wsSales, "Vendas");

      // Products Sheet
      const productsData = products.map(p => ({
        ID: p.id,
        Nome: p.name,
        Marca: p.brand,
        Categoria: p.category,
        Preco: p.price,
        Custo: p.cost,
        Estoque: p.stock,
        Minimo: p.minStock
      }));
      const wsProducts = XLSX.utils.json_to_sheet(productsData);
      XLSX.utils.book_append_sheet(wb, wsProducts, "Produtos");

      // Customers Sheet
      const customersData = customers.map(c => ({
        ID: c.id,
        Nome: c.name,
        Telefone: c.phone,
        CriadoEm: c.createdAt
      }));
      const wsCustomers = XLSX.utils.json_to_sheet(customersData);
      XLSX.utils.book_append_sheet(wb, wsCustomers, "Clientes");

      // Brands Sheet
      const brandsData = brands.map(b => ({
        ID: b.id,
        Nome: b.name
      }));
      const wsBrands = XLSX.utils.json_to_sheet(brandsData);
      XLSX.utils.book_append_sheet(wb, wsBrands, "Marcas");

      // Fixed Costs Sheet
      const costsData = fixedCosts.map(c => ({
        ID: c.id,
        Descricao: c.description,
        Valor: c.amount,
        Vencimento: c.dueDate,
        Status: c.status
      }));
      const wsCosts = XLSX.utils.json_to_sheet(costsData);
      XLSX.utils.book_append_sheet(wb, wsCosts, "Custos Fixos");

      // Generate excel buffer
      const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      // Google Drive API Media Update PUT/PATCH
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${spreadsheetId}?uploadType=media`;
      const response = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${driveToken}`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        },
        body: excelBuffer
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar arquivo no Google Drive.');
      }

      if (!silent) {
        addNotification('Planilha Google Sheets atualizada com sucesso na nuvem!', 'success');
      }
    } catch (error: any) {
      console.error(error);
      if (!silent) {
        addNotification('Não foi possível salvar na nuvem: ' + (error.message || ''), 'error');
      }
    } finally {
      setIsExportingSheets(false);
    }
  };

  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    time: string;
    read: boolean;
  }[]>([
    {
      id: 'init-1',
      message: 'Sistema BIOBEL carregado com sucesso. Banco de dados ativo.',
      type: 'success',
      time: new Date().toISOString(),
      read: false
    }
  ]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [vendedora, setVendedora] = useState('SISTEMA');
  const [atendimentoProductSearch, setAtendimentoProductSearch] = useState('');
  
  const [atendimentoProductType, setAtendimentoProductType] = useState<'avulso' | 'combo' | 'kit' | 'pack'>('avulso');
  const [atendimentoCustomerSearch, setAtendimentoCustomerSearch] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', notes: '' });
  const [atendimentoRaffleId, setAtendimentoRaffleId] = useState<string>('');
  const [atendimentoTicketNumber, setAtendimentoTicketNumber] = useState<number | null>(null);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState('1');
  const [isAtendimentoSummaryOpen, setIsAtendimentoSummaryOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('isSidebarCollapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleStartEmptyVenda = () => {
    setCart([]);
    setSelectedProduct(null);
    setCurrentStep(1);
    setActiveTab('atendimento');
  };

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('isSidebarCollapsed', String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const [activeTab, setActiveTab] = useState<string>('home');
  const [activeDashboardTab, setActiveDashboardTab] = useState<string>('gestao');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cpfNaNota, setCpfNaNota] = useState(false);
  const [cpfNaNotaValue, setCpfNaNotaValue] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [showPixQrCode, setShowPixQrCode] = useState(false);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<Payment[]>([]);
  const [viewMode, setViewMode] = useState<'Presencial' | 'Digital'>('Presencial');
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [isNfceModalOpen, setIsNfceModalOpen] = useState(false);
  const [nfceEmissionStep, setNfceEmissionStep] = useState<'idle' | 'connecting' | 'validating' | 'transmitting' | 'authorized'>('idle');
  const [saleNotes, setSaleNotes] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [vouchers] = useState([
    { code: 'BIOBEL10', discount: 10, type: 'percent' },
    { code: 'BEMVINDA', discount: 20, type: 'fixed' },
    { code: 'VIP50', discount: 50, type: 'fixed' }
  ]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const mStr = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    return mStr.charAt(0).toUpperCase() + mStr.slice(1);
  });
  const [showMonthChangePrompt, setShowMonthChangePrompt] = useState(false);
  const [detectedOtherMonthName, setDetectedOtherMonthName] = useState('');
  const [hasPromptedMonthChange, setHasPromptedMonthChange] = useState(() => {
    try {
      return sessionStorage.getItem('hasPromptedMonthChange') === 'true';
    } catch {
      return false;
    }
  });
  const [currentCashierSession, setCurrentCashierSession] = useState<CashierSession | null>(null);

  // States for Sidebar Search Filter and collapsible categories query
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'FAVORITOS': false,
    'PRINCIPAL': false,
    'CADASTROS': true,
    'CONSULTA': true,
    'FINANCEIRO': true,
    'FISCAL': true,
    'MARKETING_CRM': false,
    'TAREFAS_AGENDA': true,
    'CONFIGURACOES': true,
  });

  const [favoriteMenus, setFavoriteMenus] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('favorite_menus');
      return saved ? JSON.parse(saved) : ['atendimento', 'cashier', 'sales', 'products', 'customers'];
    } catch {
      return ['atendimento', 'cashier', 'sales', 'products', 'customers'];
    }
  });

  const toggleFavoriteMenu = (menuId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setFavoriteMenus(prev => {
      const next = prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId];
      try {
        localStorage.setItem('favorite_menus', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  useEffect(() => {
    if (selectedCustomer) {
      if (selectedCustomer.cpf) {
        setCpfNaNotaValue(selectedCustomer.cpf);
        setCpfNaNota(true);
      } else {
        setCpfNaNotaValue('');
        setCpfNaNota(false);
      }
    } else {
      setCpfNaNotaValue('');
      setCpfNaNota(false);
    }
  }, [selectedCustomer]);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Automatically expand parent section when activeTab changes
  useEffect(() => {
    const sectionsConfig = [
      { id: 'PRINCIPAL', items: ['home', 'atendimento'] },
      { id: 'CADASTROS', items: ['products', 'brands', 'staff', 'customers', 'combos', 'kits', 'peks', 'suppliers'] },
      { id: 'CONSULTA', items: ['sales', 'reports', 'dashboard', 'improvement'] },
      { id: 'FINANCEIRO', items: ['costs', 'financial_accounts', 'cash_flow', 'cashier'] },
      { id: 'FISCAL', items: ['fiscal_cfop', 'fiscal_emissao', 'fiscal_observacoes', 'fiscal_serie', 'fiscal_ibpt', 'fiscal_nfe', 'fiscal_cnae'] },
      { id: 'MARKETING_CRM', items: ['customers', 'campaigns', 'giveaways', 'raffles', 'manager_campaign', 'performance'] },
      { id: 'TAREFAS_AGENDA', items: ['routine', 'funcao_rotina', 'agenda'] },
      { id: 'CONFIGURACOES', items: ['admin_profile', 'goals', 'config', 'backup', 'help'] }
    ];
    const found = sectionsConfig.find(sec => sec.items.includes(activeTab));
    if (found) {
      setCollapsedSections(prev => {
        if (prev[found.id] === false) return prev; // Avoid setting if already open
        return { ...prev, [found.id]: false };
      });
    }
  }, [activeTab]);

  const handlePrintReceipt = useCallback((saleParam?: any) => {
    const isSale = saleParam && typeof saleParam === 'object' && 'items' in saleParam;
    const saleToUse = isSale ? saleParam : lastCompletedSale;
    if (!saleToUse) {
      addNotification('Erro: Nenhuma venda foi selecionada para impressão.', 'error');
      return;
    }
    if (isSale) {
      setLastCompletedSale(saleParam);
    }
    addNotification('Enviando cupom para a janela de impressão do sistema...', 'info');
    // Pequeno delay para garantir que o DOM está pronto se chamado vindo de um clique rápido ou mudança de tela
    setTimeout(() => {
      try {
        window.print();
        addNotification('Comando de impressão enviado com sucesso! Se a janela não abrir, verifique se há bloqueador de popups.', 'success');
      } catch (err) {
        console.error("Print failed", err);
        addNotification('Não foi possível abrir o diálogo de impressão. Você pode baixar o PDF como alternativa!', 'warning');
      }
    }, 300);
  }, [lastCompletedSale]);

  const handleEmitNfce = () => {
    setIsNfceModalOpen(true);
    setNfceEmissionStep('connecting');
    
    setTimeout(() => {
      setNfceEmissionStep('validating');
      setTimeout(() => {
        setNfceEmissionStep('transmitting');
        setTimeout(() => {
          setNfceEmissionStep('authorized');
          addNotification('Nota Fiscal (NFC-e) emitida e autorizada com sucesso na SEFAZ!', 'success');
        }, 1200);
      }, 1000);
    }, 800);
  };

  const handleDownloadXml = () => {
    const cpf = lastCompletedSale?.cpfNaNota || "00000000000";
    const cleanCpf = cpf.replace(/\D/g, "");
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe43260642123456000189650010000541231018765432" versao="4.00">
      <ide>
        <cUF>43</cUF>
        <natOp>Venda de mercadoria</natOp>
        <mod>65</mod>
        <serie>1</serie>
        <nNF>54123</nNF>
        <dhEmi>${new Date().toISOString()}</dhEmi>
        <tpNF>1</tpNF>
        <cMunFG>4309209</cMunFG>
      </ide>
      <emit>
        <CNPJ>42123456000189</CNPJ>
        <xNome>BIOBEL ESTETICA E BEM ESTAR LTDA</xNome>
        <enderEmit>
          <xLgr>Av. Principal</xLgr>
          <nro>100</nro>
          <xBairro>Centro</xBairro>
          <xMun>GRAVATAI</xMun>
          <UF>RS</UF>
        </enderEmit>
      </emit>
      <dest>
        <CPF>${cleanCpf}</CPF>
      </dest>
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vProd>${lastCompletedSale?.total.toFixed(2) || "0.00"}</vProd>
          <vNF>${lastCompletedSale?.total.toFixed(2) || "0.00"}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

    const blob = new Blob([xmlContent], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NFCe-BIOBEL-${lastCompletedSale?.id || 'venda'}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // Se acabamos de completar uma venda (estamos no passo 5 e temos o lastCompletedSale), dispara o print
    if (currentStep === 5 && lastCompletedSale) {
      handlePrintReceipt();
    }
  }, [currentStep, lastCompletedSale, handlePrintReceipt]);

  const [isCashierOpen, setIsCashierOpen] = useState(false);
  const [isFinalizeConfirmationOpen, setIsFinalizeConfirmationOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Saved Carts (Multiple Sessions)
  const [savedCarts, setSavedCarts] = useState<{ id: string; name: string; cart: SaleItem[]; customer: Customer | null }[]>([]);
  
  // Shortcut Support (Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    
    const handleOnline = () => {
      setIsOffline(false);
      addNotification('Conexão restabelecida! Sincronizando dados...', 'success');
    };
    const handleOffline = () => {
      setIsOffline(true);
      addNotification('Você está offline. O sistema salvará localmente até a volta da conexão.', 'warning');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveCurrentCart = () => {
    if (cart.length === 0) return;
    const cartName = selectedCustomer?.name || `Cliente ${savedCarts.length + 1}`;
    setSavedCarts(prev => [...prev, {
      id: Date.now().toString(),
      name: cartName,
      cart: [...cart],
      customer: selectedCustomer
    }]);
    setCart([]);
    setSelectedCustomer(null);
    setCurrentStep(1);
    addNotification(`Carrinho de ${cartName} salvo para depois.`, 'success');
  };

  const resumeSavedCart = (saved: any) => {
    // If current cart is not empty, save it first? 
    // For simplicity, we just swap
    const currentCartData = cart.length > 0 ? {
      id: Date.now().toString(),
      name: selectedCustomer?.name || 'Cliente Atual',
      cart: [...cart],
      customer: selectedCustomer
    } : null;

    setCart(saved.cart);
    setSelectedCustomer(saved.customer);
    setSavedCarts(prev => {
      let filtered = prev.filter(c => c.id !== saved.id);
      if (currentCartData) filtered = [...filtered, currentCartData];
      return filtered;
    });
    setCurrentStep(1);
    addNotification(`Carrinho de ${saved.name} retomado.`, 'success');
  };

  const handleGlobalClick = (type: string, id: string) => {
    if (type === 'product') {
      setActiveTab('products');
      // Potential to open detail modal here
    } else if (type === 'customer') {
      setActiveTab('customers');
    } else if (type === 'sale') {
      setActiveTab('sales');
    }
    setGlobalSearch('');
    setIsSearchOpen(false);
  };

  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: 'SHAMPOO TRUSS EQUILIBRIUM', brand: 'TRUSS', category: 'Cabelos', price: 129.90, cost: 80, stock: 15, minStock: 5, type: 'avulso', status: 'active', barcode: '7891234567891', lastSoldAt: '2026-05-01' },
    { id: '2', name: 'BASE MELU MATTE', brand: 'MELU', category: 'Maquiagem', price: 39.90, cost: 20, stock: 24, minStock: 10, type: 'avulso', status: 'active', barcode: '7891234567892', lastSoldAt: '2026-04-15' },
    { id: '3', name: 'BATOM NINA SECRETS', brand: 'NINA SECRETS', category: 'Maquiagem', price: 45.00, cost: 25, stock: 18, minStock: 8, type: 'avulso', status: 'active', barcode: '7891234567893', lastSoldAt: '2026-05-05' },
    { id: '4', name: 'MÁSCARA WELLA INVIGO', brand: 'WELLA', category: 'Cabelos', price: 159.90, cost: 100, stock: 12, minStock: 5, type: 'avulso', status: 'active', barcode: '7891234567894', lastSoldAt: '2026-02-10' },
    { id: '5', name: 'CORRETIVO VIZZELA', brand: 'VIZZELA', category: 'Maquiagem', price: 35.90, cost: 18, stock: 30, minStock: 10, type: 'avulso', status: 'active', barcode: '7891234567895', lastSoldAt: '2026-01-20' },
    { id: '6', name: 'MÁSCARA LÍQUIDA USO OBRIGATÓRIO TRUSS', brand: 'TRUSS', category: 'Cabelos', price: 159.99, cost: 100, stock: 10, minStock: 3, type: 'avulso', status: 'active', barcode: '7891234567896', lastSoldAt: '2026-05-08' },
    { id: '7', name: 'SHAMPOO HAIR PLASTIA SIÀGE', brand: 'EUDORA', category: 'Cabelos', price: 42.00, cost: 25, stock: 20, minStock: 5, type: 'avulso', status: 'active', barcode: '7891234567897', lastSoldAt: '2026-05-09' },
    { id: '8', name: 'CONDICIONADOR HAIR PLASTIA SIÀGE', brand: 'EUDORA', category: 'Cabelos', price: 42.00, cost: 25, stock: 20, minStock: 5, type: 'avulso', status: 'active', barcode: '7891234567898', lastSoldAt: '2026-05-09' },
    { id: '9', name: 'KIT SIÀGE HAIR PLASTIA (SH+COND)', brand: 'EUDORA', category: 'Kits', price: 79.99, cost: 50, stock: 10, minStock: 2, type: 'kit', comboItems: [{ productId: '7', quantity: 1 }, { productId: '8', quantity: 1 }], status: 'active', barcode: '7891234567899', lastSoldAt: '2026-05-04' },
    { id: '10', name: 'MÁSCARA PLATTELLI MATIZE', brand: 'PIATTELLI', category: 'Cabelos', price: 69.99, cost: 40, stock: 8, minStock: 2, type: 'avulso', status: 'active', barcode: '7891234567810', lastSoldAt: '2025-12-01' },
    { id: '11', name: 'COMBO CRONOGRAMA TRUSS', brand: 'TRUSS', category: 'Combos', price: 299.90, cost: 180, stock: 5, minStock: 1, type: 'combo', comboItems: [{ productId: '1', quantity: 1 }, { productId: '6', quantity: 1 }], status: 'active', barcode: '7891234567811', lastSoldAt: '2026-05-02' },
  ]);
  const [customers, setCustomers] = useState<Customer[]>([
    { id: '1', name: 'JHONATAN SILVA', phone: '5551988887777', createdAt: new Date().toISOString(), notes: 'Prefere perfumes florais', points: 150, debt: 0 },
    { id: '2', name: 'MARIA OLIVEIRA', phone: '5551977776666', createdAt: new Date().toISOString(), notes: 'Cabelos quimicamente tratados', points: 300, debt: 50.00 },
    { id: '3', name: 'CARLOS SANTOS', phone: '5551966665555', createdAt: new Date().toISOString(), points: 50, debt: 0 },
  ]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stockBatches, setStockBatches] = useState<StockBatch[]>([]);
  const [weatherObservations, setWeatherObservations] = useState<{[dateStr: string]: { condition: string; notes: string }}>({});

  // Global search results
  const globalResults = useMemo(() => {
    if (!globalSearch.trim()) return { products: [], customers: [], sales: [] };
    const q = globalSearch.toLowerCase();
    return {
      products: products.filter(p => p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q)).slice(0, 5),
      customers: customers.filter(c => c.name.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 5),
      sales: sales.filter(s => s.id.toLowerCase().includes(q) || s.customerName?.toLowerCase().includes(q)).slice(0, 5)
    };
  }, [globalSearch, products, customers, sales]);
  const [staff, setStaff] = useState<Staff[]>([
    { id: '1', name: 'ALESSANDRA', role: 'Dona', startDate: '2023-01-01', phone: '(51) 99999-8888', activities: ['Gestão Geral', 'Compras', 'Marketing'] },
    { id: '2', name: 'GABRIELA CLT', role: 'CLT', startDate: '2026-06-15', phone: '(51) 98888-7777', activities: ['Atendimento', 'Limpeza', 'Reposição', 'Vendas'] },
    { id: '3', name: 'DAY', role: 'Estagiária', startDate: '2026-06-15', phone: '(51) 97777-6666', activities: ['Auxílio Vendas', 'Organização'] },
    { id: '4', name: 'BIBI', role: 'Sócia', startDate: '2025-01-01', phone: '(51) 99999-5555', activities: ['Cobertura de Vendas (Eventos Externos)', 'Apoio de Vendas'] },
  ]);
  const [routines, setRoutines] = useState<Routine[]>([
    {
      id: 'R1',
      staffId: '2',
      staffName: 'GABRIELA CLT',
      date: new Date().toISOString().split('T')[0],
      activities: [
        { id: '1', description: '☀️ Dar bom dia no grupo do WhatsApp', completed: false },
        { id: '2', description: '💬 Responder clientes no WhatsApp', completed: false },
        { id: '3', description: '📸 Postar ofertas no Grupo e Status', completed: false },
        { id: '4', description: '🚀 Disparar campanhas no privado', completed: false },
        { id: '5', description: '🧹 Organizar a loja e vitrine', completed: false },
        { id: '6', description: '🧽 Tirar pó dos móveis e produtos', completed: false },
        { id: '7', description: '📦 Reposição de produtos nas prateleiras', completed: false },
      ]
    },
    {
      id: 'R2',
      staffId: '3',
      staffName: 'DAY',
      date: new Date().toISOString().split('T')[0],
      activities: [
        { id: '1', description: '🧹 Apoiar na limpeza e reposição', completed: false },
        { id: '2', description: '💬 Auxiliar no suporte de vendas e atendimento de clientes', completed: false }
      ]
    }
  ]);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([
    {
      id: 'ev-initial-biobel',
      title: 'Evento da Biobel Noite',
      date: '2026-07-08',
      time: '20:00',
      description: 'Evento Biobel e Ana Maria na pizzaria.',
      category: 'evento'
    }
  ]);
  const [settings, setSettings] = useState<StoreSettings>({
    name: 'BIOBEL ESTÉTICA & COSMÉTICOS',
    phone: '(51) 3488-2810',
    email: 'biobel@gmail.com',
    address: 'Rua Anápio Gomes, 1601 - Centro, Gravataí - RS, 94010-011',
    website: 'www.biobel.com.br',
    primaryColor: '#be123c',
    theme: 'light',
    principalMenus: ['home', 'atendimento'],
    googleSheetsUrl: 'https://docs.google.com/spreadsheets/d/103CPTz5ueFBFO26GTbNco6tWhv51TqQNYLUPG-gDgVs/edit?usp=sharing',
    additionalGoogleSheetsUrls: [
      'https://docs.google.com/spreadsheets/d/1gVNbt3_KKj3qvh0TNw0_Y4pUaX97drpaW_7V7aidix0/edit?usp=sharing'
    ],
    pixKey: '',
    pixKeyType: 'CPF',
    pixEnabled: false,
    couponEnabled: true,
    workingWeekdays: [1, 2, 3, 4, 5, 6],
    excludeHolidaysFromCalculations: true,
    chartColors: ['#be123c', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#eab308', '#16a34a'],
    hasSeenPixPromo: false,
    showPastWeekdayTracker: true,
    dashboardConfig: {
      showQuickActions: true,
      showWeeklyChart: true,
      showAverageTicket: true,
      showCashierStatus: true,
      showGoalProgress: true,
      showLowStockAlerts: true,
      showPendingBills: true,
      showBirthdays: true
    },
    receiptConfig: {
      showLogo: true,
      showAddress: true,
      showPhone: true,
      showInstagram: true,
      showDiscount: true,
      showSeller: true,
      customMessage: 'Obrigado pela preferência! Biobel cuidando de você.'
    },
    maxDiscountLimit: 20,
    operatingHours: {
      weekdayOpen: '09:00',
      weekdayClose: '19:00',
      saturdayOpen: '09:00',
      saturdayClose: '17:00',
      segOpen: '09:00',
      segClose: '19:00',
      segClosed: false,
      terOpen: '09:00',
      terClose: '19:00',
      terClosed: false,
      quaOpen: '09:00',
      quaClose: '19:00',
      quaClosed: false,
      quiOpen: '09:00',
      quiClose: '19:00',
      quiClosed: false,
      sexOpen: '09:00',
      sexClose: '19:00',
      sexClosed: false,
      sabOpenDetail: '09:00',
      sabCloseDetail: '17:00',
      sabClosed: false,
      domOpen: '09:00',
      domClose: '13:00',
      domClosed: true
    },
    taxRegime: 'MEI',
    bankAccounts: [
      { id: '1', bankName: 'Banco do Brasil', agency: '1234-5', account: '98765-4', type: 'Corrente' },
      { id: '2', bankName: 'Nubank', agency: '0001', account: '1234567-8', type: 'Pagamentos' }
    ],
    officialProviders: [
      { id: '1', name: 'Truss Cosméticos Ltda', cnpj: '11.222.333/0001-44', phone: '(11) 98765-4321', brand: 'TRUSS' },
      { id: '2', name: 'Wella Cosméticos S.A.', cnpj: '44.333.222/0001-11', phone: '(11) 4004-9999', brand: 'WELLA' }
    ],
    cardRates: {
      debit: 1.5,
      credit1x: 3.0,
      creditInstallment: 4.5
    },
    taxesAndRates: {
      simplesNacional: 6.0,
      icms: 18.0,
      iss: 2.0
    },
    watermarkText: 'BIOBEL ESTÉTICA',
    keyboardShortcutsEnabled: true,
    emailNotifications: {
      dailyCashierChange: true,
      lowStock: true,
      goalsAchieved: true
    }
  });
  const [cashierSessions, setCashierSessions] = useState<CashierSession[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    { id: '1', name: 'Boas-vindas', type: 'new_customers', message: 'Olá! Seja bem-vinda à BIOBEL. Temos um cupom de 10% para sua primeira compra!', createdAt: new Date().toISOString() },
    { id: '2', name: 'Saudades', type: 'retention_30d', message: 'Oi! Faz tempo que não nos vemos. Que tal conferir as novidades da semana?', createdAt: new Date().toISOString() },
    { id: '3', name: 'Lançamento Truss', type: 'custom', message: 'Novidades da TRUSS chegaram! Venha conferir a nova linha Equilibrium.', createdAt: new Date().toISOString() },
    { id: '4', name: 'Dia das Mães', type: 'custom', message: 'Presenteie quem você ama com os kits exclusivos BIOBEL!', createdAt: new Date().toISOString() },
    { id: '5', name: 'Aniversariantes', type: 'custom', message: 'Parabéns! No seu mês de aniversário, você tem 15% de desconto em qualquer produto!', createdAt: new Date().toISOString() },
    { id: '6', name: 'Reativação', type: 'retention_30d', message: 'Sentimos sua falta! Que tal um brinde especial na sua próxima visita?', createdAt: new Date().toISOString() },
    { id: '7', name: 'VIP Biobel', type: 'custom', message: 'Você é uma de nossas clientes VIP! Venha conhecer nossa nova coleção em primeira mão.', createdAt: new Date().toISOString() },
  ]);
  const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoal[]>(() => {
    const now = new Date();
    const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rawMonthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const monthName = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1);
    return [
      {
        id,
        month: monthName,
        storeGoal: 45000,
        extraBonus: 0,
        workingDays: 22,
        holidays: [],
        workHoursWeekday: 8,
        workHoursSaturday: 4,
        saturdayGoal: 0,
        staffGoals: {
          'ALESSANDRA': { monthlyGoal: 15000, commission: 3 },
          'GABRIELA CLT': { monthlyGoal: 15000, commission: 3 },
          'DAY': { monthlyGoal: 5000, commission: 2 },
          'SISTEMA': { monthlyGoal: 15000, commission: 3 },
          'BIBI': { monthlyGoal: 15000, commission: 3 }
        },
        customEvents: [
          { id: 'ev-salvatore-loja', date: '2026-06-05', name: 'Evento Salvatore (Loja)', description: 'Evento presencial na loja com coquetel e bebidas Salvatore.' },
          { id: 'ev-fora-corporativo', date: '2026-06-08', name: 'Evento Externo (Fora)', description: 'Alessandra em evento externo. Sócia Bibi vendendo na loja.' }
        ]
      }
    ];
  });
  const [productCategories, setProductCategories] = useState<Category[]>([
    { id: 'C1', name: 'Cabelos' },
    { id: 'C2', name: 'Maquiagem' },
    { id: 'C3', name: 'Skincare' },
    { id: 'C4', name: 'Unhas' },
    { id: 'C5', name: 'Perfumes' },
    { id: 'C6', name: 'Acessórios' },
    { id: 'C7', name: 'Outros' },
    { id: 'C8', name: 'Diversos' },
    { id: 'C9', name: 'Combos' },
    { id: 'C10', name: 'Kits' },
  ]);
  const [brands, setBrands] = useState<Brand[]>([
    { id: 'B1', name: 'PIATTELLI' },
    { id: 'B2', name: 'OH MY' },
    { id: 'B3', name: 'TRUSS' },
    { id: 'B4', name: 'ALFAPARF' },
    { id: 'B5', name: 'HASKELL' },
    { id: 'B6', name: 'SCHWARZKOPF' },
    { id: 'B7', name: 'EUDORA' },
    { id: 'B8', name: 'WELLA' },
    { id: 'B9', name: 'NATURA' },
    { id: 'B10', name: 'O BOTICÁRIO' },
    { id: 'B11', name: 'BIOBEL' },
    { id: 'B12', name: 'MELU' },
    { id: 'B13', name: 'NINA SECRETS' },
    { id: 'B14', name: 'VIZZELA' }
  ]);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([
    { id: '1', description: 'Aluguel', amount: 7000, dueDate: 10, status: 'pending' },
    { id: '2', description: 'Água', amount: 150, dueDate: 15, status: 'pending' },
    { id: '3', description: 'Luz', amount: 450, dueDate: 20, status: 'pending' },
    { id: '4', description: 'Internet', amount: 120, dueDate: 5, status: 'pending' },
    { id: '5', description: 'Salário Funcionária', amount: 2500, dueDate: 5, status: 'pending' },
    { id: '6', description: 'Bolsa Estagiária', amount: 1200, dueDate: 5, status: 'pending' },
  ]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([
    { id: 'fa1', type: 'payable', category: 'Boleto de Fornecedor', description: 'Fornecedor Wella Cosméticos', amount: 1250.00, dueDate: '2026-07-15', status: 'pending' },
    { id: 'fa2', type: 'payable', category: 'Energia', description: 'CEEE Equatorial Energia', amount: 345.80, dueDate: '2026-07-10', status: 'pending' },
    { id: 'fa3', type: 'payable', category: 'Água', description: 'Taxa Consumo - CORSAN', amount: 95.40, dueDate: '2026-07-05', status: 'paid', paymentDate: '2026-06-28' },
    { id: 'fa4', type: 'receivable', category: 'Outros', description: 'Cadeira Alugada Estética', amount: 600.00, dueDate: '2026-07-05', status: 'pending' },
    { id: 'fa5', type: 'payable', category: 'Internet', description: 'Mensalidade Fibra Óptica Claro', amount: 120.00, dueDate: '2026-07-05', status: 'pending' },
  ]);
  const [giveaways, setGiveaways] = useState<Giveaway[]>([
    { id: '1', name: 'Sorteio de Páscoa', description: 'Cesta de chocolates e produtos Biobel', date: '2026-04-05', status: 'pending', participants: [] },
    { id: '2', name: 'Dia das Mães', description: 'Kit Luxo Wella Invigo', date: '2026-05-10', status: 'pending', participants: [] },
  ]);

  const [raffles, setRaffles] = useState<Raffle[]>(() => {
    const generateRaffleTickets = (total: number, sold: { [key: number]: { name: string; phone: string; status: 'reserved' | 'paid'; vendedora?: string } }) => {
      const tickets: RaffleTicket[] = [];
      for (let i = 1; i <= total; i++) {
        if (sold[i]) {
          tickets.push({
            number: i,
            buyerName: sold[i].name,
            buyerPhone: sold[i].phone,
            status: sold[i].status,
            vendedora: sold[i].vendedora,
            soldAt: new Date().toISOString().split('T')[0]
          });
        } else {
          tickets.push({
            number: i,
            buyerName: '',
            buyerPhone: '',
            status: 'available'
          });
        }
      }
      return tickets;
    };

    const demoSold: { [key: number]: { name: string; phone: string; status: 'reserved' | 'paid'; vendedora?: string } } = {
      7: { name: 'Mariana Silva', phone: '(51) 98888-7777', status: 'paid', vendedora: 'ALESSANDRA' },
      14: { name: 'Carla Souza', phone: '(51) 97777-6666', status: 'paid', vendedora: 'ALESSANDRA' },
      25: { name: 'Juliana Dias', phone: '(51) 96666-5555', status: 'paid', vendedora: 'GABRIELA CLT' },
      44: { name: 'Beatriz Costa', phone: '(51) 95555-4444', status: 'reserved', vendedora: 'ALESSANDRA' },
      77: { name: 'Fernanda Lima', phone: '(51) 94444-3333', status: 'paid', vendedora: 'GABRIELA CLT' }
    };

    return [
      {
        id: 'r1',
        title: 'Cesta Especial de Inverno ☕✨',
        prizeDescription: 'Cesta Premium contendo 12 itens selecionados: 1 Perfume Eudora, 1 Creme Wella Invigo, 1 Óleo Capilar Sebastian, 1 Batom Matte Melu, 1 Paleta de Sombras Vizzela, 1 Hidratante Facial, e mimos artesanais (caneca, chocolates finos, etc.)',
        prizeValue: 400.00,
        ticketPrice: 25.00,
        totalNumbers: 100,
        deadlineDate: '2026-07-28',
        drawDate: '2026-07-31',
        status: 'active',
        tickets: generateRaffleTickets(100, demoSold),
        createdAt: '2026-07-01'
      }
    ];
  });
  const [showEmailBackupNotification, setShowEmailBackupNotification] = useState<{
    enabled: boolean;
    backupData: any;
    email: string;
    dateStr: string;
  } | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const enableCloudSync = async () => {
    setCloudSyncing(true);
    setCloudSyncError(null);
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const storePath = `stores/${storeId}`;
      const productsDocRef = doc(db, storePath, 'data', 'products');
      const productsSnap = await getDocFromServer(productsDocRef).catch(() => null);

      if (productsSnap && productsSnap.exists()) {
        const choice = window.confirm(
          `Sincronização em Nuvem: Encontramos dados existentes na nuvem para a loja "${storeId}".\n\n` +
          `• Clique em [OK] para CARREGAR os dados da nuvem (isso substituirá seus dados locais atuais).\n` +
          `• Clique em [Cancelar] para ENVIAR seus dados locais atuais para a nuvem.`
        );
        
        if (choice) {
          setCloudSyncEnabled(true);
          localStorage.setItem('biobel_cloud_sync', 'true');
          addNotification('Sincronização ativada! Carregando dados da nuvem...', 'success');
        } else {
          addNotification('Preparando dados locais para envio à nuvem...', 'info');
          
          await setDoc(doc(db, storePath, 'data', 'products'), { list: products });
          await setDoc(doc(db, storePath, 'data', 'customers'), { list: customers });
          await setDoc(doc(db, storePath, 'data', 'sales'), { list: sales });
          await setDoc(doc(db, storePath, 'data', 'others'), {
            staff, routines, settings, cashierSessions, currentCashierSession, isCashierOpen, 
            brands, productCategories, fixedCosts, financialAccounts, giveaways, raffles, 
            agendaEvents, stockBatches, weatherObservations
          });

          lastCloudData.current['products'] = JSON.stringify(products);
          lastCloudData.current['customers'] = JSON.stringify(customers);
          lastCloudData.current['sales'] = JSON.stringify(sales);
          lastCloudData.current['others'] = JSON.stringify({
            staff, routines, settings, cashierSessions, currentCashierSession, isCashierOpen, 
            brands, productCategories, fixedCosts, financialAccounts, giveaways, raffles, 
            agendaEvents, stockBatches, weatherObservations
          });

          setCloudSyncEnabled(true);
          localStorage.setItem('biobel_cloud_sync', 'true');
          addNotification('Dados locais enviados com sucesso! Sincronização ativada.', 'success');
        }
      } else {
        addNotification('Enviando dados iniciais para a nuvem...', 'info');
        
        await setDoc(doc(db, storePath, 'data', 'products'), { list: products });
        await setDoc(doc(db, storePath, 'data', 'customers'), { list: customers });
        await setDoc(doc(db, storePath, 'data', 'sales'), { list: sales });
        await setDoc(doc(db, storePath, 'data', 'others'), {
          staff, routines, settings, cashierSessions, currentCashierSession, isCashierOpen, 
          brands, productCategories, fixedCosts, financialAccounts, giveaways, raffles, 
          agendaEvents, stockBatches, weatherObservations
        });

        lastCloudData.current['products'] = JSON.stringify(products);
        lastCloudData.current['customers'] = JSON.stringify(customers);
        lastCloudData.current['sales'] = JSON.stringify(sales);
        lastCloudData.current['others'] = JSON.stringify({
          staff, routines, settings, cashierSessions, currentCashierSession, isCashierOpen, 
          brands, productCategories, fixedCosts, financialAccounts, giveaways, raffles, 
          agendaEvents, stockBatches, weatherObservations
        });

        setCloudSyncEnabled(true);
        localStorage.setItem('biobel_cloud_sync', 'true');
        addNotification('Sincronização em Nuvem ativada com sucesso!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      setCloudSyncError(err.message || String(err));
      addNotification('Erro ao ativar sincronização: ' + (err.message || ''), 'error');
    } finally {
      setCloudSyncing(false);
    }
  };

  const disableCloudSync = () => {
    setCloudSyncEnabled(false);
    localStorage.setItem('biobel_cloud_sync', 'false');
    addNotification('Sincronização em Nuvem desativada.', 'info');
  };

  // 1. Listening to changes from Firestore (Real-time download)
  useEffect(() => {
    if (!cloudSyncEnabled) return;

    let unsubscribes: (() => void)[] = [];
    const storePath = `stores/${storeId}`;

    const setupListeners = async () => {
      setCloudSyncing(true);
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }

        const subDoc = (docId: string, callback: (data: any) => void) => {
          const docRef = doc(db, storePath, 'data', docId);
          const unsub = onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              callback(data);
            }
          }, (error) => {
            console.error(`Error syncing ${docId}:`, error);
            handleFirestoreError(error, 'get' as any, `${storePath}/data/${docId}`);
          });
          unsubscribes.push(unsub);
        };

        subDoc('products', (data) => {
          if (data && Array.isArray(data.list)) {
            const jsonStr = JSON.stringify(data.list);
            lastCloudData.current['products'] = jsonStr;
            setProducts(data.list);
          }
        });

        subDoc('customers', (data) => {
          if (data && Array.isArray(data.list)) {
            const jsonStr = JSON.stringify(data.list);
            lastCloudData.current['customers'] = jsonStr;
            setCustomers(data.list);
          }
        });

        subDoc('sales', (data) => {
          if (data && Array.isArray(data.list)) {
            const jsonStr = JSON.stringify(data.list);
            lastCloudData.current['sales'] = jsonStr;
            setSales(data.list);
          }
        });

        subDoc('others', (data) => {
          if (data) {
            const jsonStr = JSON.stringify(data);
            lastCloudData.current['others'] = jsonStr;
            
            if (Array.isArray(data.staff)) setStaff(data.staff);
            if (Array.isArray(data.routines)) setRoutines(data.routines);
            if (data.settings) setSettings(data.settings);
            if (Array.isArray(data.cashierSessions)) setCashierSessions(data.cashierSessions);
            if (data.currentCashierSession !== undefined) setCurrentCashierSession(data.currentCashierSession);
            if (data.isCashierOpen !== undefined) setIsCashierOpen(data.isCashierOpen);
            if (Array.isArray(data.brands)) setBrands(data.brands);
            if (Array.isArray(data.productCategories)) setProductCategories(data.productCategories);
            if (Array.isArray(data.fixedCosts)) setFixedCosts(data.fixedCosts);
            if (Array.isArray(data.financialAccounts)) setFinancialAccounts(data.financialAccounts);
            if (Array.isArray(data.giveaways)) setGiveaways(data.giveaways);
            if (Array.isArray(data.raffles)) setRaffles(data.raffles);
            if (Array.isArray(data.agendaEvents)) setAgendaEvents(data.agendaEvents);
            if (Array.isArray(data.stockBatches)) setStockBatches(data.stockBatches);
            if (data.weatherObservations) setWeatherObservations(data.weatherObservations);
          }
        });

        setLastCloudSyncTime(new Date().toISOString());
        localStorage.setItem('biobel_last_cloud_sync', new Date().toISOString());
      } catch (err: any) {
        console.error("Error setting up listeners:", err);
        setCloudSyncError(err.message || String(err));
      } finally {
        setCloudSyncing(false);
      }
    };

    setupListeners();

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [cloudSyncEnabled, storeId]);

  // 2. Upload changes to Firestore (Real-time upload)
  useEffect(() => {
    if (!cloudSyncEnabled) return;
    const jsonStr = JSON.stringify(products);
    if (jsonStr !== lastCloudData.current['products']) {
      lastCloudData.current['products'] = jsonStr;
      const docRef = doc(db, `stores/${storeId}`, 'data', 'products');
      setDoc(docRef, { list: products }).catch(err => {
        console.error("Error saving products:", err);
      });
    }
  }, [products, cloudSyncEnabled, storeId]);

  useEffect(() => {
    if (!cloudSyncEnabled) return;
    const jsonStr = JSON.stringify(customers);
    if (jsonStr !== lastCloudData.current['customers']) {
      lastCloudData.current['customers'] = jsonStr;
      const docRef = doc(db, `stores/${storeId}`, 'data', 'customers');
      setDoc(docRef, { list: customers }).catch(err => {
        console.error("Error saving customers:", err);
      });
    }
  }, [customers, cloudSyncEnabled, storeId]);

  useEffect(() => {
    if (!cloudSyncEnabled) return;
    const jsonStr = JSON.stringify(sales);
    if (jsonStr !== lastCloudData.current['sales']) {
      lastCloudData.current['sales'] = jsonStr;
      const docRef = doc(db, `stores/${storeId}`, 'data', 'sales');
      setDoc(docRef, { list: sales }).catch(err => {
        console.error("Error saving sales:", err);
      });
    }
  }, [sales, cloudSyncEnabled, storeId]);

  useEffect(() => {
    if (!cloudSyncEnabled) return;
    
    const othersPayload = {
      staff,
      routines,
      settings,
      cashierSessions,
      currentCashierSession,
      isCashierOpen,
      brands,
      productCategories,
      fixedCosts,
      financialAccounts,
      giveaways,
      raffles,
      agendaEvents,
      stockBatches,
      weatherObservations
    };

    const jsonStr = JSON.stringify(othersPayload);
    if (jsonStr !== lastCloudData.current['others']) {
      lastCloudData.current['others'] = jsonStr;
      
      const timer = setTimeout(() => {
        const docRef = doc(db, `stores/${storeId}`, 'data', 'others');
        setDoc(docRef, othersPayload).catch(err => {
          console.error("Error saving other configurations:", err);
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [
    staff, routines, settings, cashierSessions, currentCashierSession, isCashierOpen, 
    brands, productCategories, fixedCosts, financialAccounts, giveaways, raffles, 
    agendaEvents, stockBatches, weatherObservations, cloudSyncEnabled, storeId
  ]);


  // Automatic Backup Logic (10h, 17h, and Custom Email Backup)
  useEffect(() => {
    if (!isDataLoaded) return;

    const checkBackupTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Trigger at 10:00 and 17:00
      if ((hours === 10 || hours === 17) && minutes === 0) {
        const dateStr = now.toISOString().split('T')[0];
        const backupTriggerKey = `biobel_autobackup_triggered_${dateStr}_${hours}`;
        
        if (!localStorage.getItem(backupTriggerKey)) {
          console.log(`[AutoBackup] Triggering backup for ${hours}h`);
          const data = { sales, products, customers, brands, productCategories, fixedCosts, monthlyGoals, settings };
          
          try {
            const currentBackups = JSON.parse(localStorage.getItem('biobel_system_backups') || '[]');
            const newBackup = {
              id: `AUTO-${Date.now()}`,
              timestamp: now.toISOString(),
              hour: hours,
              type: 'AUTO',
              data
            };
            
            const updatedBackups = [newBackup, ...currentBackups].slice(0, 6);
            localStorage.setItem('biobel_system_backups', JSON.stringify(updatedBackups));
            localStorage.setItem(backupTriggerKey, 'true');
            
            addNotification(`Sistema: Backup automático das ${hours}h realizado.`, 'success');
          } catch (e) {
            console.error("Auto backup failed", e);
          }
        }
      }

      // Check for Email Daily Backup (pre-configured time, e.g., 18:00)
      const isBackupEnabled = settings.backupEnabled ?? true;
      if (isBackupEnabled) {
        const backupTimeStr = settings.backupTime || '18:00';
        const [bHours, bMinutes] = backupTimeStr.split(':').map(Number);

        if (hours === bHours && minutes === bMinutes) {
          const dateStr = now.toISOString().split('T')[0];
          const emailBackupTriggerKey = `biobel_emailbackup_triggered_${dateStr}`;

          if (!localStorage.getItem(emailBackupTriggerKey)) {
            const data = { sales, products, customers, brands, productCategories, fixedCosts, financialAccounts, monthlyGoals, settings };
            
            try {
              const currentBackups = JSON.parse(localStorage.getItem('biobel_system_backups') || '[]');
              const newBackup = {
                id: `EMAIL-AUTO-${Date.now()}`,
                timestamp: now.toISOString(),
                hour: hours,
                type: 'EMAIL_AUTO',
                data
              };
              const updatedBackups = [newBackup, ...currentBackups].slice(0, 10);
              localStorage.setItem('biobel_system_backups', JSON.stringify(updatedBackups));
              localStorage.setItem(emailBackupTriggerKey, 'true');

              setShowEmailBackupNotification({
                enabled: true,
                backupData: data,
                email: settings.backupEmail || 'jhoncorretor2025@gmail.com',
                dateStr
              });

              addNotification(`Sistema: Backup Diário das ${backupTimeStr}h gerado e pronto para envio por e-mail!`, 'success');
            } catch (e) {
              console.error("Email backup failed", e);
            }
          }
        }
      }
    };

    const interval = setInterval(checkBackupTime, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [isDataLoaded, sales, products, customers, brands, productCategories, fixedCosts, monthlyGoals, settings]);

  // POS Custom Filtering
  const [atendimentoCategoryFilter, setAtendimentoCategoryFilter] = useState<string>('');
  const [atendimentoBrandFilter, setAtendimentoBrandFilter] = useState<string>('');
  
  const posCategories = useMemo(() => {
    const relevantProducts = products.filter(p => (p.type === atendimentoProductType || (!p.type && atendimentoProductType === 'avulso')));
    const dynamicCats = Array.from(new Set(relevantProducts.map(p => p.category).filter(Boolean))) as string[];
    const defaults = ['Cabelos', 'Maquiagem', 'Perfumes', 'Unhas', 'Outros'];
    return Array.from(new Set([...defaults, ...dynamicCats])) as string[];
  }, [products, atendimentoProductType]);

  const posBrands = useMemo(() => {
    const relevantProducts = products.filter(p => (p.type === atendimentoProductType || (!p.type && atendimentoProductType === 'avulso')));
    return Array.from(new Set(relevantProducts.map(p => p.brand).filter(Boolean))) as string[];
  }, [products, atendimentoProductType]);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
  }, [settings.theme, settings.primaryColor]);

  // LocalStorage Persistence for Local Mode
  useEffect(() => {
    if (user?.isLocal && isDataLoaded) {
      const localData = {
        products,
        customers,
        sales,
        staff,
        routines,
        settings,
        cashierSessions,
        campaigns,
        currentCashierSession,
        isCashierOpen,
        brands,
        productCategories,
        fixedCosts,
        financialAccounts,
        giveaways,
        raffles,
        weatherObservations,
        agendaEvents,
        stockBatches
      };
      localStorage.setItem('biobel_local_data', JSON.stringify(localData));
    }
  }, [products, customers, sales, staff, routines, agendaEvents, settings, cashierSessions, campaigns, currentCashierSession, isCashierOpen, user?.isLocal, isDataLoaded, brands, productCategories, fixedCosts, financialAccounts, giveaways, raffles, weatherObservations, stockBatches]);

  const [showPixPromo, setShowPixPromo] = useState(false);
  const [dismissedEvents, setDismissedEvents] = useState<string[]>([]);

  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    if (offsetDays !== 0) {
      d.setDate(d.getDate() + offsetDays);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const bannerEvents = useMemo(() => {
    if (!isDataLoaded) return [];
    const todayStr = getLocalDateString(0);
    const tomorrowStr = getLocalDateString(1);
    
    return agendaEvents.filter(ev => {
      const matchesDate = ev.date === todayStr || ev.date === tomorrowStr;
      const isNotDismissed = !dismissedEvents.includes(ev.id);
      return matchesDate && isNotDismissed;
    });
  }, [agendaEvents, dismissedEvents, isDataLoaded]);

  // Automated Event Notification Alert Effect
  useEffect(() => {
    if (isDataLoaded && agendaEvents.length > 0) {
      const todayStr = getLocalDateString(0);
      const tomorrowStr = getLocalDateString(1);
      
      agendaEvents.forEach(ev => {
        const isToday = ev.date === todayStr;
        const isTomorrow = ev.date === tomorrowStr;
        
        if (isToday || isTomorrow) {
          const sessionKey = `notified-event-${ev.id}-${ev.date}`;
          if (!sessionStorage.getItem(sessionKey)) {
            const when = isToday ? 'HOJE' : 'AMANHÃ';
            const alertMsg = `📅 EVENTO ${when}: ${ev.title} (${ev.time || 'Sem hora'}). ${ev.description || ''}`;
            addNotification(alertMsg, isToday ? 'warning' : 'info');
            sessionStorage.setItem(sessionKey, 'true');
          }
        }
      });
    }
  }, [isDataLoaded, agendaEvents]);

  // Load LocalStorage Data on Mount
  useEffect(() => {
    const savedData = localStorage.getItem('biobel_local_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.products) setProducts(parsed.products);
        if (parsed.customers) setCustomers(parsed.customers);
        if (parsed.sales) {
          const normalizedSales = parsed.sales.map((s: any) => {
            if (s && s.status === 'finalizada') {
              return { ...s, status: 'completed' };
            }
            return s;
          });
          setSales(normalizedSales);
        }
        if (parsed.staff) setStaff(parsed.staff);
        if (parsed.routines) setRoutines(parsed.routines);
        if (parsed.settings) {
          const loadedSettings = { ...parsed.settings };
          
          // Forçar endereço e telefone padrão da Biobel solicitados pelo usuário
          if (!loadedSettings.address || loadedSettings.address.trim() === '' || loadedSettings.address.includes('Av. Paulista') || loadedSettings.address.includes('Endereço Padrão')) {
            loadedSettings.address = 'Rua Anápio Gomes, 1601 - Centro, Gravataí - RS, 94010-011';
          }
          if (!loadedSettings.phone || loadedSettings.phone.trim() === '' || loadedSettings.phone === '(11) 99999-9999' || loadedSettings.phone === '(51) 99999-9999') {
            loadedSettings.phone = '(51) 3488-2810';
          }

          // Forçar nova URL de planilha do Google Sheets que o usuário atualizou
          if (
            !loadedSettings.googleSheetsUrl || 
            loadedSettings.googleSheetsUrl === 'https://docs.google.com/spreadsheets/d/103CPTz5ueFBFO26GTbNco6tWhv51TqQNYLUPG-gDgVs/edit'
          ) {
            loadedSettings.googleSheetsUrl = 'https://docs.google.com/spreadsheets/d/103CPTz5ueFBFO26GTbNco6tWhv51TqQNYLUPG-gDgVs/edit?usp=sharing';
          }
          
          // Garantir que a lista de URLs adicionais seja um array
          if (!Array.isArray(loadedSettings.additionalGoogleSheetsUrls)) {
            loadedSettings.additionalGoogleSheetsUrls = [];
          }
          
          // Inserir automaticamente a planilha de abril enviada pelo usuário, caso não esteja na lista
          const aprilUrl = 'https://docs.google.com/spreadsheets/d/1gVNbt3_KKj3qvh0TNw0_Y4pUaX97drpaW_7V7aidix0/edit?usp=sharing';
          const hasApril = (loadedSettings.googleSheetsUrl && loadedSettings.googleSheetsUrl.includes('1gVNbt3_KKj3qvh0TNw0_Y4pUaX97drpaW_7V7aidix0')) ||
                           loadedSettings.additionalGoogleSheetsUrls.some((url: string) => url && url.includes('1gVNbt3_KKj3qvh0TNw0_Y4pUaX97drpaW_7V7aidix0'));
          
          if (!hasApril) {
            loadedSettings.additionalGoogleSheetsUrls.push(aprilUrl);
          }
          
          setSettings(loadedSettings);
          // Show promo if not enabled and not seen yet
          if (!parsed.settings.pixEnabled && !parsed.settings.hasSeenPixPromo) {
            setTimeout(() => setShowPixPromo(true), 1500);
          }
        }
        if (parsed.cashierSessions) setCashierSessions(parsed.cashierSessions);
        if (parsed.campaigns) setCampaigns(parsed.campaigns);
        if (parsed.currentCashierSession) setCurrentCashierSession(parsed.currentCashierSession);
        if (parsed.isCashierOpen !== undefined) setIsCashierOpen(parsed.isCashierOpen);
        if (parsed.brands) {
          const migratedBrands = parsed.brands.map((b: any, index: number) => 
            typeof b === 'string' ? { id: `B${Date.now()}${index}`, name: b } : b
          );
          setBrands(migratedBrands);
        }
        if (parsed.productCategories) setProductCategories(parsed.productCategories);
        if (parsed.fixedCosts) setFixedCosts(parsed.fixedCosts);
        if (parsed.financialAccounts) setFinancialAccounts(parsed.financialAccounts);
        if (parsed.giveaways) setGiveaways(parsed.giveaways);
        if (parsed.raffles) setRaffles(parsed.raffles);
        if (parsed.weatherObservations) setWeatherObservations(parsed.weatherObservations);
        if (parsed.agendaEvents) setAgendaEvents(parsed.agendaEvents);
        if (parsed.stockBatches) setStockBatches(parsed.stockBatches);
      } catch (e) {
        console.error("Failed to load local data", e);
      }
    } else {
       // First time? Show promo after a delay
       setTimeout(() => setShowPixPromo(true), 3000);
    }
    setIsDataLoaded(true);
  }, []);

  // Automatic Google Sheets Sync on App Startup
  useEffect(() => {
    if (isDataLoaded && settings.googleSheetsUrl) {
      const syncOnLoad = async () => {
        try {
          await handleSyncGoogleSheetsLive(true);
        } catch (e) {
          console.error("Auto background sync failed", e);
        }
      };
      // Delay slightly for a smoother app loading transition
      const timer = setTimeout(syncOnLoad, 1800);
      return () => clearTimeout(timer);
    }
  }, [isDataLoaded, settings.googleSheetsUrl]);

  // Check for month change and prompt user to filter/display only current month's data
  useEffect(() => {
    if (isDataLoaded && sales.length > 0 && !hasPromptedMonthChange) {
      const currentMonthYearStr = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toLowerCase().trim();
      
      const otherMonths = new Set<string>();
      sales.forEach(s => {
        try {
          const saleMonth = getSafeDate(s.date).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toLowerCase().trim();
          if (saleMonth !== currentMonthYearStr) {
            const displayMonth = getSafeDate(s.date).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
            otherMonths.add(displayMonth.charAt(0).toUpperCase() + displayMonth.slice(1));
          }
        } catch (e) {
          console.error(e);
        }
      });

      if (otherMonths.size > 0) {
        const monthsList = Array.from(otherMonths).join(', ');
        setDetectedOtherMonthName(monthsList);
        setShowMonthChangePrompt(true);
        setHasPromptedMonthChange(true);
        try {
          sessionStorage.setItem('hasPromptedMonthChange', 'true');
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [isDataLoaded, sales, hasPromptedMonthChange]);

  // Periodic Background Pull Sync from Google Sheets (every 30s)
  useEffect(() => {
    if (isDataLoaded && settings.googleSheetsUrl && settings.autoSyncSheetsEnabled !== false) {
      const interval = setInterval(async () => {
        try {
          await handleSyncGoogleSheetsLive(true);
        } catch (e) {
          console.error("Periodic Google Sheets background pull failed", e);
        }
      }, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isDataLoaded, settings.googleSheetsUrl, settings.autoSyncSheetsEnabled]);

  // Debounced Auto-Upload Push to Google Sheets (5s delay after changes)
  useEffect(() => {
    if (isDataLoaded && driveToken && settings.googleSheetsUrl && settings.autoSyncSheetsEnabled !== false) {
      const timer = setTimeout(() => {
        handleExportToGoogleSheetsLive(true);
      }, 5000); // Wait 5 seconds after any change to batch upload and avoid rate limits
      return () => clearTimeout(timer);
    }
  }, [sales, products, customers, fixedCosts, brands, driveToken, settings.googleSheetsUrl, settings.autoSyncSheetsEnabled]);

  const addNotification = (message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, message, type }]);
    setNotificationHistory(prev => [
      { id, message, type, time: new Date().toISOString(), read: false },
      ...prev
    ].slice(0, 50));
    setTimeout(() => removeNotification(id), 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const ensureAuthSession = async () => {
    return true;
  };

  // Settings Listener
  useEffect(() => {
    // Disabled in local mode
  }, []);

  // Auth Listener
  useEffect(() => {
    setAuthLoading(false);
  }, []);

  const handleOpenCashier = async (openingBalance: number) => {
    const newSession: CashierSession = {
      id: `CS${Date.now()}`,
      openingTime: new Date().toISOString(),
      openingBalance,
      withdrawals: [],
      payments: {
        pix: 0,
        dinheiro: 0,
        debito: 0,
        credito: 0,
        outros: 0
      },
      status: 'open'
    };
    setCurrentCashierSession(newSession);
    setIsCashierOpen(true);
    setCashierSessions(prev => [newSession, ...prev]);
    addNotification('Caixa aberto com sucesso!', 'success');
  };

  const handleCloseCashier = async (closingBalance: number) => {
    if (!currentCashierSession) return;
    
    const closedSession: CashierSession = {
      ...currentCashierSession,
      closingTime: new Date().toISOString(),
      closingBalance,
      status: 'closed'
    };

    // Auto-generate report on close
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(20);
      doc.text('Relatório de Fechamento de Caixa', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Sessão ID: ${closedSession.id}`, 20, 35);
      doc.text(`Abertura: ${new Date(closedSession.openingTime).toLocaleString('pt-BR')}`, 20, 42);
      doc.text(`Fechamento: ${new Date(closedSession.closingTime).toLocaleString('pt-BR')}`, 20, 49);
      
      const totalWithdrawals = closedSession.withdrawals.filter(w => w.type === 'withdrawal').reduce((acc, w) => acc + w.amount, 0);
      const totalReinforcements = closedSession.withdrawals.filter(w => w.type === 'reinforcement').reduce((acc, w) => acc + w.amount, 0);
      
      doc.setFontSize(12);
      doc.text('Resumo Financeiro', 20, 65);
      doc.setFontSize(10);
      doc.text(`Saldo Inicial: ${formatCurrency(closedSession.openingBalance)}`, 25, 75);
      doc.text(`Total Dinheiro (Vendas): ${formatCurrency(closedSession.payments.dinheiro)}`, 25, 82);
      doc.text(`Total Reforços (+): ${formatCurrency(totalReinforcements)}`, 25, 89);
      doc.text(`Total Sangrias (-): ${formatCurrency(totalWithdrawals)}`, 25, 96);
      doc.text(`Saldo Final em Dinheiro: ${formatCurrency(closedSession.closingBalance)}`, 25, 103);
      
      doc.text('Outros Métodos (Não alteram o caixa físico):', 20, 115);
      doc.text(`PIX: ${formatCurrency(closedSession.payments.pix)}`, 25, 125);
      doc.text(`Débito: ${formatCurrency(closedSession.payments.debito)}`, 25, 132);
      doc.text(`Crédito: ${formatCurrency(closedSession.payments.credito)}`, 25, 139);
      doc.text(`Outros: ${formatCurrency(closedSession.payments.outros)}`, 25, 146);

      const sessionSales = sales.filter(s => s.sessionId === closedSession.id);
      const allMovs = [
        ...closedSession.withdrawals.map(w => ({ 
          data: new Date(w.time).toLocaleTimeString('pt-BR'),
          tipo: w.type === 'withdrawal' ? 'Sangria (-)' : 'Reforço (+)',
          valor: formatCurrency(w.amount),
          motivo: w.reason
        })),
        ...sessionSales.map(s => ({
          data: new Date(s.date).toLocaleTimeString('pt-BR'),
          tipo: 'Venda (+)',
          valor: formatCurrency(s.total),
          motivo: `Cliente: ${s.customerName || 'N/A'} (${s.paymentMethod})`
        }))
      ].sort((a, b) => a.data.localeCompare(b.data));

      autoTable(doc, {
        startY: 160,
        head: [['Horário', 'Operação', 'Valor', 'Detalhes']],
        body: allMovs.map(m => [m.data, m.tipo, m.valor, m.motivo]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`fechamento_caixa_${closedSession.id}_${new Date().toISOString().split('T')[0]}.pdf`);
      addNotification('Relatório de fechamento gerado!', 'success');
    } catch (reportError) {
      console.error('Erro ao gerar relatório:', reportError);
      addNotification('Erro ao gerar relatório de fechamento.', 'warning');
    }

    setCashierSessions(prev => prev.map(s => s.id === closedSession.id ? closedSession : s));
    setCurrentCashierSession(null);
    setIsCashierOpen(false);
    addNotification('Caixa fechado com sucesso!', 'success');
  };

  const handleAddWithdrawal = async (amount: number, reason: string, type: 'withdrawal' | 'reinforcement' = 'withdrawal') => {
    if (!currentCashierSession) return;
    const withdrawal: Withdrawal = {
      id: `W${Date.now()}`,
      amount,
      reason,
      time: new Date().toISOString(),
      type
    };
    const updatedSession = {
      ...currentCashierSession,
      withdrawals: [...currentCashierSession.withdrawals, withdrawal]
    };
    setCurrentCashierSession(updatedSession);
    setCashierSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    addNotification(type === 'withdrawal' ? 'Sangria realizada!' : 'Reforço realizado!', 'info');
  };

  // Proactive Reconnect Effect - Disabled
  useEffect(() => {
  }, []);

  // Data Sync Listener - Disabled
  useEffect(() => {
  }, []);

  const [notifiedLowStock, setNotifiedLowStock] = useState<Set<string>>(new Set());

  // Local Storage Persistence
  useEffect(() => {
    if (user?.isLocal) {
      localStorage.setItem('pos_products', JSON.stringify(products));
      localStorage.setItem('pos_customers', JSON.stringify(customers));
      localStorage.setItem('pos_sales', JSON.stringify(sales));
      localStorage.setItem('pos_brands', JSON.stringify(brands));
      localStorage.setItem('pos_staff', JSON.stringify(staff));
      localStorage.setItem('pos_settings', JSON.stringify(settings));
      localStorage.setItem('pos_monthlyGoals', JSON.stringify(monthlyGoals));
      localStorage.setItem('pos_campaigns', JSON.stringify(campaigns));
      localStorage.setItem('pos_giveaways', JSON.stringify(giveaways));
      localStorage.setItem('pos_raffles', JSON.stringify(raffles));
      localStorage.setItem('pos_routines', JSON.stringify(routines));
      localStorage.setItem('pos_fixedCosts', JSON.stringify(fixedCosts));
      localStorage.setItem('pos_financialAccounts', JSON.stringify(financialAccounts));
      localStorage.setItem('pos_cashier_sessions', JSON.stringify(cashierSessions));
    }
  }, [user?.isLocal, products, customers, sales, brands, staff, settings, monthlyGoals, campaigns, giveaways, raffles, routines, fixedCosts, financialAccounts, cashierSessions]);

  // Low Stock Notification Check
  useEffect(() => {
    const lowStockProducts = products.filter(p => p.stock <= p.minStock);
    const newLowStock = lowStockProducts.filter(p => !notifiedLowStock.has(p.id));
    
    if (newLowStock.length > 0) {
      newLowStock.forEach(p => {
        addNotification(`Estoque baixo: ${p.name} (${p.stock} un)`, 'warning');
      });
      setNotifiedLowStock(prev => {
        const next = new Set(prev);
        newLowStock.forEach(p => next.add(p.id));
        return next;
      });
    }
  }, [products, notifiedLowStock, addNotification]);

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const isLogged = !!auth.currentUser;
    const userEmail = auth.currentUser?.email || 'Anônimo';
    console.error(`Firestore Error [${operation}] on ${path}. Logged: ${isLogged} (${userEmail}):`, error);
    
    const errorCode = error.code || '';
    const errorMessage = error.message || '';

    if (errorCode === 'unavailable' || errorCode === 'deadline-exceeded' || errorMessage.includes('offline') || errorMessage.includes('network')) {
      addNotification(`Conexão instável ou offline. Verifique sua internet para sincronizar ${path}.`, 'warning');
    } else if (errorCode === 'permission-denied') {
      addNotification(`Acesso negado a ${path}. Verifique seu login ou permissões.`, 'error');
    } else if (errorCode === 'not-found') {
      addNotification(`Dados de ${path} não encontrados no servidor.`, 'warning');
    } else {
      addNotification(`Erro ao acessar ${path}: ${errorMessage.substring(0, 50)}...`, 'error');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    // Simulate small delay for loading spinner and feedback transition
    await new Promise(resolve => setTimeout(resolve, 850));

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedUsername) {
      setLoginError('O campo Usuário é obrigatório.');
      setLoginLoading(false);
      return;
    }

    if (!normalizedPassword) {
      setLoginError('O campo Senha é obrigatório.');
      setLoginLoading(false);
      return;
    }

    const storedAdminPassword = settings.adminPassword || 'admin';

    if (normalizedUsername === 'admin' && normalizedPassword === storedAdminPassword) {
      setUser({
        uid: 'local-admin',
        email: 'admin@local.system',
        displayName: 'Administrador',
        photoURL: settings.adminPhoto || null,
        role: 'admin',
        isLocal: true
      });
      addNotification('Login realizado com sucesso!', 'success');
      setLoginError('');
    } else {
      setLoginError('Usuário ou senha incorretos. Por favor, revise as suas credenciais de acesso.');
      addNotification('Usuário ou senha incorretos.', 'error');
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    setUser(null);
    addNotification('Sessão encerrada.', 'info');
  };

  const requestFinalizeConfirmation = async () => {
    if (cart.length === 0) {
      addNotification('O carrinho está vazio.', 'warning');
      return;
    }

    if (!isCashierOpen) {
      addNotification('O caixa está fechado! Abra o caixa para registrar esta venda.', 'warning');
      return;
    }

    const total = cart.reduce((acc, item) => acc + item.total, 0);
    const saleTotal = total - discount;

    if (isSplitPayment) {
      const splitTotal = splitPayments.reduce((acc, p) => acc + p.amount, 0);
      if (Math.abs(splitTotal - saleTotal) > 0.01) {
        addNotification(`O total dos pagamentos (${formatCurrency(splitTotal)}) deve ser igual ao total da venda (${formatCurrency(saleTotal)}).`, 'warning');
        return;
      }
    }
    
    setIsFinalizeConfirmationOpen(true);
  };

  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      addNotification('O carrinho está vazio.', 'warning');
      return;
    }

    if (!isCashierOpen) {
      addNotification('O caixa está fechado! Abra o caixa para registrar esta venda.', 'warning');
      return;
    }

    const total = cart.reduce((acc, item) => acc + item.total, 0);
    const saleTotal = total - discount;

    if (isSplitPayment) {
      const splitTotal = splitPayments.reduce((acc, p) => acc + p.amount, 0);
      if (Math.abs(splitTotal - saleTotal) > 0.01) {
        addNotification(`O total dos pagamentos (${formatCurrency(splitTotal)}) deve ser igual ao total da venda (${formatCurrency(saleTotal)}).`, 'warning');
        return;
      }
    }

    const staffMember = staff.find(s => s.name === vendedora);
    const commissionRate = (staffMember?.commission || 0) / 100;
    const commissionValue = saleTotal * commissionRate;
    const sale: any = {
      id: `V${Date.now()}`,
      date: getLocalISOString(),
      customerId: selectedCustomer?.id || 'consumidor-final',
      customerName: selectedCustomer?.name || 'Consumidor Final',
      customerPhone: selectedCustomer?.phone || '',
      total: saleTotal,
      discount,
      paymentMethod: isSplitPayment ? 'Múltiplo' : paymentMethod,
      vendedora,
      status: 'completed',
      items: cart.map(item => {
        if (item.isRaffle) {
          return {
            ...item,
            raffleId: atendimentoRaffleId || undefined,
            raffleTicketNumber: atendimentoTicketNumber || undefined
          };
        }
        return { ...item };
      }),
      type: viewMode,
      category: 'Atendimento',
      commission: commissionValue,
      notes: saleNotes,
      cpfNaNota: cpfNaNota && cpfNaNotaValue ? cpfNaNotaValue : undefined,
    };

    if (isSplitPayment) sale.payments = splitPayments;
    if (currentCashierSession?.id) sale.sessionId = currentCashierSession.id;

    setIsFinalizeConfirmationOpen(false);

    // Update Raffle state if applicable
    const hasRaffle = cart.some(item => item.isRaffle);
    if (hasRaffle && atendimentoRaffleId && atendimentoTicketNumber !== null) {
      setRaffles(prev => prev.map(r => {
        if (r.id === atendimentoRaffleId) {
          return {
            ...r,
            tickets: r.tickets.map(t => {
              if (t.number === atendimentoTicketNumber) {
                return {
                  ...t,
                  buyerName: selectedCustomer ? selectedCustomer.name : 'Consumidor Final',
                  buyerPhone: selectedCustomer ? selectedCustomer.phone : '',
                  status: 'paid',
                  vendedora: vendedora,
                  soldAt: new Date().toISOString().split('T')[0]
                };
              }
              return t;
            })
          };
        }
        return r;
      }));
    }

    setSales(prev => [sale, ...prev]);

    // Update Customer points and debt
    if (selectedCustomer && selectedCustomer.id !== 'consumidor-final') {
      setCustomers(prev => prev.map(c => {
        if (c.id === selectedCustomer.id) {
          const newPoints = (c.points || 0) + Math.floor(saleTotal);
          let newDebt = c.debt || 0;
          if (paymentMethod === 'FIADO' && !isSplitPayment) {
            newDebt += saleTotal;
          } else if (isSplitPayment) {
            const fiadoAmount = splitPayments.filter(p => p.method === 'FIADO').reduce((acc, p) => acc + p.amount, 0);
            newDebt += fiadoAmount;
          }
          return { ...c, points: newPoints, debt: newDebt };
        }
        return c;
      }));
    }

    // Update local stock
    setProducts(prev => {
      const newProducts = [...prev];
      cart.forEach(item => {
        const product = newProducts.find(p => p.id === item.productId);
        if (product) {
          const isKitOrCombo = product.type === 'combo' || product.type === 'kit';
          const isMontar = isKitOrCombo && (product.kitMode === 'montar' || !product.kitMode);
          if (isMontar && product.comboItems && product.comboItems.length > 0) {
            product.comboItems.forEach(comboItem => {
              const component = newProducts.find(p => p.id === comboItem.productId);
              if (component) {
                component.stock -= comboItem.quantity * item.quantity;
              }
            });
          } else {
            product.stock -= item.quantity;
          }
        }
      });
      return newProducts;
    });

    // Update local cashier session
    if (currentCashierSession && currentCashierSession.status === 'open') {
      const updatedPayments = { ...currentCashierSession.payments };
      
      const processPayment = (method: string, amount: number) => {
        const normalizedMethod = method.toLowerCase();
        let field: keyof CashierSession['payments'] = 'outros';
        if (normalizedMethod === 'pix') field = 'pix';
        else if (normalizedMethod === 'dinheiro') field = 'dinheiro';
        else if (normalizedMethod === 'débito') field = 'debito';
        else if (normalizedMethod === 'crédito' || normalizedMethod === 'parcelado' || normalizedMethod === 'link') field = 'credito';
        updatedPayments[field] += amount;
      };

      if (isSplitPayment && splitPayments.length > 0) {
        splitPayments.forEach(p => processPayment(p.method, p.amount));
      } else {
        processPayment(paymentMethod, sale.total);
      }

      const updatedSession = {
        ...currentCashierSession,
        payments: updatedPayments
      };
      setCurrentCashierSession(updatedSession);
      setCashierSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    }

    addNotification('Venda finalizada com sucesso!', 'success');
    setLastCompletedSale(sale);
    setCurrentStep(3);
  };

  const getProductPriceForPaymentMethod = (product: Product, method: string): number => {
    const uppercaseMethod = (method || '').toUpperCase();
    if (uppercaseMethod === 'PIX') {
      if (product.promoPixPrice !== undefined && product.promoPixPrice > 0) {
        return product.promoPixPrice;
      }
    } else if (['CRÉDITO', 'DÉBITO', 'LINK', 'PARCELADO'].includes(uppercaseMethod)) {
      if (product.promoCardPrice !== undefined && product.promoCardPrice > 0) {
        return product.promoCardPrice;
      }
    } else if (uppercaseMethod === 'DINHEIRO') {
      if (product.promoMoneyPrice !== undefined && product.promoMoneyPrice > 0) {
        return product.promoMoneyPrice;
      }
    }
    return product.price;
  };

  const recalculateCartPrices = (method: string, isSplit: boolean = isSplitPayment, splits: Payment[] = splitPayments) => {
    const activeMethod = (() => {
      if (isSplit && splits && splits.length > 0) {
        let bestMethod = splits[0].method;
        let maxAmount = splits[0].amount;
        for (let i = 1; i < splits.length; i++) {
          if (splits[i].amount > maxAmount) {
            maxAmount = splits[i].amount;
            bestMethod = splits[i].method;
          }
        }
        return bestMethod;
      }
      return method;
    })();

    setCart(prev => prev.map(item => {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) return item;

      const targetPrice = getProductPriceForPaymentMethod(prod, activeMethod);

      return {
        ...item,
        price: targetPrice,
        total: targetPrice * item.quantity
      };
    }));
  };

  const addToCart = (product: Product) => {
    const isKitOrCombo = product.type === 'kit' || product.type === 'combo';
    const isMontar = isKitOrCombo && (product.kitMode === 'montar' || !product.kitMode);
    
    if (product.stock <= 0 && !isMontar) {
      addNotification('Produto sem estoque.', 'warning');
      return;
    }

    const activeMethod = (() => {
      if (isSplitPayment && splitPayments && splitPayments.length > 0) {
        let bestMethod = splitPayments[0].method;
        let maxAmount = splitPayments[0].amount;
        for (let i = 1; i < splitPayments.length; i++) {
          if (splitPayments[i].amount > maxAmount) {
            maxAmount = splitPayments[i].amount;
            bestMethod = splitPayments[i].method;
          }
        }
        return bestMethod;
      }
      return paymentMethod;
    })();

    const priceToUse = getProductPriceForPaymentMethod(product, activeMethod);

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, price: priceToUse, quantity: item.quantity + 1, total: (item.quantity + 1) * priceToUse }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: priceToUse,
        total: priceToUse
      }];
    });
    addNotification(`${product.name} adicionado ao carrinho.`, 'success');
  };

  // Barcode Auto-detection
  useEffect(() => {
    const q = atendimentoProductSearch.trim();
    if (q.length >= 8) { // Length of a barcode
      const product = products.find(p => p.barcode === q);
      if (product) {
        addToCart(product);
        setAtendimentoProductSearch('');
        addNotification(`Produto ${product.name} bipado!`, 'success');
      }
    }
  }, [atendimentoProductSearch, products, addToCart]);

  const addCustomItemToCart = () => {
    if (!customItemName || !customItemPrice || !customItemQuantity) {
      addNotification('Preencha o nome, valor e quantidade do item.', 'warning');
      return;
    }

    const price = Number(customItemPrice);
    const quantity = Number(customItemQuantity);
    const item: SaleItem = {
      productId: `custom-${Date.now()}`,
      name: customItemName.toUpperCase(),
      quantity: quantity,
      price: price,
      total: price * quantity
    };

    setCart(prev => [...prev, item]);
    setIsCustomItemModalOpen(false);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQuantity('1');
    addNotification('Item avulso adicionado.', 'success');
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // --- Atendimento View Logic ---
  const totalCart = cart.reduce((acc, item) => acc + item.total, 0);

  const handleQuickAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      addNotification('O nome do cliente é obrigatório.', 'warning');
      return;
    }
    if (!newCustomer.phone.trim()) {
      addNotification('O telefone do cliente é obrigatório.', 'warning');
      return;
    }
    
    // Basic phone validation: 10 or 11 digits
    const phoneDigits = newCustomer.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      addNotification('Telefone inválido. Informe o DDD e o número (10 ou 11 dígitos).', 'warning');
      return;
    }

    const customer: Customer = {
      id: `C${Date.now()}`,
      name: newCustomer.name.trim().toUpperCase(),
      phone: newCustomer.phone.trim(),
      notes: newCustomer.notes,
      createdAt: new Date().toISOString()
    };

    setCustomers(prev => [...prev, customer]);
    setSelectedCustomer(customer);
    setIsAddingCustomer(false);
    setNewCustomer({ name: '', phone: '', notes: '' });
    addNotification('Cliente cadastrado com sucesso!', 'success');
  };

  const handleWhatsAppShare = (saleParam?: any) => {
    const sale = (saleParam && typeof saleParam === 'object' && 'id' in saleParam && typeof saleParam.id === 'string') 
      ? saleParam 
      : lastCompletedSale;
      
    if (!sale) {
      addNotification('Nenhuma venda encontrada para compartilhar no WhatsApp.', 'error');
      return;
    }

    const customerSales = sales.filter(s => s.customerId === sale.customerId && s.id !== sale.id);
    const lastSale = customerSales.length > 0 
      ? [...customerSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;
    
    const purchaseInfo = sale.customerId 
      ? (lastSale 
          ? `Última compra: ${new Date(lastSale.date).toLocaleDateString()}`
          : "Primeira Compra! 🎉")
      : "";

    const location = settings.address.includes('-') 
      ? settings.address.split('-').pop()?.trim() 
      : '';
    const fullDate = location ? `${location}, ${new Date(sale.date).toLocaleString()}` : new Date(sale.date).toLocaleString();

    const paymentInfo = sale.payments && sale.payments.length > 0
      ? sale.payments.map(p => `${p.method}: ${formatCurrency(p.amount)}`).join('\n')
      : sale.paymentMethod;

    const subtotalText = sale.discount > 0 ? `Subtotal: ${formatCurrency(sale.total + sale.discount)}\nDesconto: -${formatCurrency(sale.discount)}\n` : '';
    const summary = `
Olá ${sale.customerName || 'cliente'}, tudo bem? Segue o seu comprovante de compra na ${settings.name || 'Biobel'}:

*Venda Finalizada - ${settings.name || 'BIOBEL'}*
Data: ${fullDate}
Cliente: *${sale.customerName || 'Consumidor'}*
${purchaseInfo ? purchaseInfo + '\n' : ''}Vendedora: ${sale.vendedora}
${subtotalText}Total: *${formatCurrency(sale.total)}*
Pagamento:
${paymentInfo}
_Pagamento referente à compra de produtos cosméticos_

*Itens:*
${(sale.items || []).map(item => {
  let itemText = `• ${item.name} (${item.quantity}x) - ${formatCurrency(item.price)}`;
  const product = products.find(p => p.id === item.productId);
  if ((product?.type === 'kit' || product?.type === 'combo') && product.comboItems) {
    const details = product.comboItems.map(subItem => {
      const p = products.find(prod => prod.id === subItem.productId);
      return `    └── ${subItem.quantity}x ${p?.name || 'Item'}`;
    }).join('\n');
    itemText += '\n' + details;
  } else if (product?.type === 'pack' && product.packContents) {
    itemText += `\n    └── Conteúdo: ${product.packContents}`;
  }
  return itemText;
}).join('\n')}
    `.trim();
    
    const targetPhone = sale.customerPhone || customers.find(c => c.id === sale.customerId)?.phone || '';
    const url = getWhatsAppUrl(targetPhone, summary);
    
    try {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addNotification('Enviando para o WhatsApp...', 'success');
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      return false;
    }
  };

  const handleCopyText = (saleParam?: any) => {
    const sale = (saleParam && typeof saleParam === 'object' && 'id' in saleParam && typeof saleParam.id === 'string') 
      ? saleParam 
      : lastCompletedSale;
      
    if (!sale) {
      addNotification('Nenhuma venda encontrada para copiar o resumo.', 'error');
      return;
    }

    const customerSales = sales.filter(s => s.customerId === sale.customerId && s.id !== sale.id);
    const lastSale = customerSales.length > 0 
      ? [...customerSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;
    
    const purchaseInfo = sale.customerId 
      ? (lastSale 
          ? `Última compra: ${new Date(lastSale.date).toLocaleDateString()}`
          : "Primeira Compra! 🎉")
      : "";

    const addressStr = settings?.address || '';
    const location = addressStr.includes('-') 
      ? addressStr.split('-').pop()?.trim() 
      : '';
    const fullDate = location ? `${location}, ${new Date(sale.date).toLocaleString()}` : new Date(sale.date).toLocaleString();

    const paymentInfo = sale.payments && sale.payments.length > 0
      ? sale.payments.map(p => `${p.method}: ${formatCurrency(p.amount)}`).join('\n')
      : sale.paymentMethod;

    const subtotalText = sale.discount > 0 ? `Subtotal: ${formatCurrency(sale.total + sale.discount)}\nDesconto: -${formatCurrency(sale.discount)}\n` : '';
    const summary = `
Olá ${sale.customerName || 'cliente'}, tudo bem? Segue o seu comprovante de compra na ${settings?.name || 'Biobel'}:

*Venda Finalizada - ${settings?.name || 'BIOBEL'}*
Data: ${fullDate}
Cliente: *${sale.customerName || 'Consumidor'}*
${purchaseInfo ? purchaseInfo + '\n' : ''}Vendedora: ${sale.vendedora}
${subtotalText}Total: *${formatCurrency(sale.total)}*
Pagamento:
${paymentInfo}
_Pagamento referente à compra de produtos cosméticos_

*Itens:*
${(sale.items || []).map(item => {
  let itemText = `• ${item.name} (${item.quantity}x) - ${formatCurrency(item.price)}`;
  const product = products.find(p => p.id === item.productId);
  if ((product?.type === 'kit' || product?.type === 'combo') && Array.isArray(product.comboItems)) {
    const details = product.comboItems.map(subItem => {
      const p = products.find(prod => prod.id === subItem.productId);
      return `    └── ${subItem.quantity}x ${p?.name || 'Item'}`;
    }).join('\n');
    itemText += '\n' + details;
  } else if (product?.type === 'pack' && product.packContents) {
    itemText += `\n    └── Conteúdo: ${product.packContents}`;
  }
  return itemText;
}).join('\n')}
    `.trim();
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(summary).then(() => {
        addNotification('Resumo copiado para a área de transferência!', 'success');
      }).catch(() => {
        const ok = fallbackCopyText(summary);
        if (ok) {
          addNotification('Resumo copiado para a área de transferência!', 'success');
        } else {
          addNotification('Erro ao copiar texto.', 'error');
        }
      });
    } else {
      const ok = fallbackCopyText(summary);
      if (ok) {
        addNotification('Resumo copiado para a área de transferência!', 'success');
      } else {
        addNotification('Erro ao copiar texto.', 'error');
      }
    }
  };

  const handleDownloadPDF = (saleParam?: any) => {
    const sale = (saleParam && typeof saleParam === 'object' && 'id' in saleParam && typeof saleParam.id === 'string') 
      ? saleParam 
      : lastCompletedSale;
      
    console.log('Iniciando geração de PDF para venda:', sale?.id);
    if (!sale) {
      addNotification('Nenhuma venda encontrada para gerar PDF.', 'error');
      return;
    }

    try {
      console.log('Criando instância jsPDF');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text('BIOBEL', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('RECIBO DE VENDA', pageWidth / 2, 28, { align: 'center' });
      
      // Company Info
      doc.setFontSize(9);
      doc.text(settings?.name || 'BIOBEL COSMÉTICOS', 20, 40);
      doc.text(settings?.address || 'Endereço não configurado', 20, 45);
      doc.text(`WhatsApp: ${settings?.phone || '(00) 00000-0000'}`, 20, 50);
      
      // Sale Info
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(20, 55, pageWidth - 20, 55);
      
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      const addressStr = settings?.address || '';
      const location = addressStr.includes('-') 
        ? addressStr.split('-').pop()?.trim() 
        : '';
      const fullDate = location 
        ? `${location}, ${new Date(sale.date || sale.createdAt).toLocaleString()}` 
        : new Date(sale.date || sale.createdAt).toLocaleString();

      doc.text(`Data: ${fullDate}`, 20, 65);
      doc.text(`Cliente: ${sale.customerName || 'Consumidor Final'}`, 20, 70);
      
      const customerSales = sales.filter(s => s.customerId === sale.customerId && s.id !== sale.id);
      const lastSale = customerSales.length > 0 
        ? [...customerSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null;
      
      const purchaseInfo = sale.customerId 
        ? (lastSale 
            ? `Última compra: ${new Date(lastSale.date).toLocaleDateString()}`
            : "Primeira Compra! 🎉")
        : "";

      let currentY = 75;
      if (purchaseInfo) {
        doc.text(purchaseInfo, 20, currentY);
        currentY += 5;
      }

      doc.text(`Vendedora: ${sale.vendedora || 'N/A'}`, 20, currentY);
      currentY += 5;
      
      if (sale.payments && sale.payments.length > 0) {
        doc.text('Pagamento:', 20, currentY);
        currentY += 5;
        doc.setFontSize(9);
        sale.payments.forEach(p => {
          doc.text(`- ${p.method}: ${formatCurrency(p.amount)}`, 25, currentY);
          currentY += 5;
        });
        doc.setFontSize(10);
      } else {
        doc.text(`Pagamento: ${sale.paymentMethod}`, 20, currentY);
        currentY += 5;
      }

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Pagamento referente à compra de produtos cosméticos', 20, currentY);
      currentY += 10;
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      
      // Items Table
      const tableData = (sale.items || []).flatMap(item => {
        if (!item) return [];
        const row = [
          item.name || 'Produto',
          (item.quantity || 1).toString(),
          formatCurrency(item.price || 0),
          formatCurrency((item.price || 0) * (item.quantity || 1))
        ];
        
        const product = products.find(p => p.id === item.productId);
        if ((product?.type === 'kit' || product?.type === 'combo') && Array.isArray(product.comboItems)) {
          const detailRows = product.comboItems.map(subItem => {
            const p = products.find(prod => prod.id === subItem.productId);
            return [
              `   > ${subItem.quantity}x ${p?.name || 'Item'}`,
              "",
              "",
              ""
            ];
          });
          return [row, ...detailRows];
        } else if (product?.type === 'pack' && product.packContents) {
          const detailRow = [
            `   > Conteúdo: ${product.packContents}`,
            "",
            "",
            ""
          ];
          return [row, detailRow];
        }
        
        return [row];
      });
      
      console.log('Chamando autoTable');
      autoTable(doc, {
        startY: currentY,
        head: [['Produto', 'Qtd', 'Preço Un.', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' }, // blue-600
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: 'center', cellWidth: 20 },
          2: { halign: 'right', cellWidth: 35 },
          3: { halign: 'right', cellWidth: 35 }
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.cell.text[0]?.startsWith('   >')) {
            data.cell.styles.fontSize = 7;
            data.cell.styles.fontStyle = 'italic';
            data.cell.styles.textColor = [100, 116, 139];
          }
        }
      });
      
      console.log('autoTable concluído');
      // Get final Y position after table
      const finalY = (doc as any).lastAutoTable?.finalY || 95;
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Totals starting Y coordinate with safe page height wrap detection
      let totalsY = finalY;
      if (totalsY + 60 > pageHeight) {
        doc.addPage();
        totalsY = 20; // reset to the top of the next page
      }
      
      const sTotal = Number(sale.total || 0);
      const sDiscount = Number(sale.discount || 0);
      const subtotal = sTotal + sDiscount;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Subtotal:', pageWidth - 60, totalsY + 15);
      doc.setFont('helvetica', 'normal');
      doc.text(formatCurrency(subtotal), pageWidth - 20, totalsY + 15, { align: 'right' });
      
      doc.setFont('helvetica', 'bold');
      doc.text('Desconto:', pageWidth - 60, totalsY + 20);
      doc.setFont('helvetica', 'normal');
      doc.text(`- ${formatCurrency(sDiscount)}`, pageWidth - 20, totalsY + 20, { align: 'right' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL:', pageWidth - 60, totalsY + 30);
      doc.text(formatCurrency(sTotal), pageWidth - 20, totalsY + 30, { align: 'right' });
      
      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Obrigado pela preferência!', pageWidth / 2, totalsY + 50, { align: 'center' });
      
      console.log('Salvando PDF');
      doc.save(`recibo_biobel_${sale.id}.pdf`);
      addNotification('Recibo PDF gerado com sucesso!', 'success');
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      addNotification('Erro ao gerar PDF. Verifique o console.', 'error');
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const search = atendimentoProductSearch.trim().toLowerCase();
      
      // Check type first
      const matchesType = (p.type === atendimentoProductType || (!p.type && atendimentoProductType === 'avulso'));
      if (!matchesType) return false;

      // Filter by category if selected
      if (atendimentoCategoryFilter && p.category !== atendimentoCategoryFilter) return false;

      // Filter by brand if selected
      if (atendimentoBrandFilter && p.brand !== atendimentoBrandFilter) return false;
      
      if (!search) return true;

      // Fuzzy Search Logic: Split search into terms
      const searchTerms = search.split(' ');
      const pName = p.name.toLowerCase();
      const pBrand = p.brand.toLowerCase();
      const pBarcode = p.barcode?.toLowerCase() || '';
      
      return searchTerms.every(term => pName.includes(term) || pBrand.includes(term) || pBarcode.includes(term));
    }).sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    }).slice(0, 50);
  }, [products, atendimentoProductSearch, atendimentoProductType, atendimentoCategoryFilter, atendimentoBrandFilter]);

  const filteredCustomers = useMemo(() => {
    const search = atendimentoCustomerSearch.trim().toLowerCase();
    if (!search) return [];
    return customers.filter(c => {
      return c.name.toLowerCase().includes(search) || 
             c.phone.includes(search) ||
             (c.email && c.email.toLowerCase().includes(search));
    }).slice(0, 20); // Limit to 20 for performance
  }, [customers, atendimentoCustomerSearch]);

  const nextStep = () => {
    if (!isCashierOpen) {
      addNotification('Abra o caixa para prosseguir com o atendimento.', 'warning');
      return;
    }
    if (currentStep === 1 && cart.length === 0) {
      addNotification('Adicione itens ao carrinho para continuar.', 'warning');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // --- Render Logic ---

  // Check for SEFAZ RS QR Code query parameter (Mock Sefaz Portal)
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const pParam = urlParams ? urlParams.get('p') : null;

  if (pParam) {
    try {
      const decodedData = JSON.parse(decodeURIComponent(escape(atob(pParam))));
      return <SefazMockPortal data={decodedData} />;
    } catch (e) {
      console.error("Failed to parse NFC-e data", e);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="text-blue-600"
        >
          <RefreshCw size={40} />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <NotificationToast notifications={notifications} removeNotification={removeNotification} />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-200"
        >
          <div className="text-center mb-6">
            <div className="inline-flex p-4 bg-blue-600 rounded-2xl text-white mb-4 shadow-lg shadow-blue-200 overflow-hidden w-20 h-20 items-center justify-center">
              {settings.logo ? (
                <img 
                  src={settings.logo} 
                  alt={settings.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Store size={32} />
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{settings.name || 'BIOBEL'}</h1>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">SISTEMA GESTÃO • VERSÃO {APP_VERSION}</p>
            <p className="text-slate-500 mt-4 font-medium">Acesse sua conta administrativa</p>
          </div>

          <AnimatePresence>
            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-5 p-4 bg-rose-50 border border-rose-100/85 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-3 text-left shadow-sm"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-500" />
                <div className="space-y-0.5">
                  <p className="font-black uppercase tracking-wider text-[9px] text-rose-800">Erro de Acesso</p>
                  <p className="leading-relaxed">{loginError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Usuário</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={username}
                  disabled={loginLoading}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Ex: admin"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Senha</label>
              <div className="relative">
                <Database className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  disabled={loginLoading}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  disabled={loginLoading}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors p-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-100 hover:bg-brand-600 disabled:bg-brand-400 disabled:opacity-85 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2.5 mt-6"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="animate-spin text-white" size={18} />
                  <span>Verificando credenciais...</span>
                </>
              ) : (
                <span>Entrar no Sistema</span>
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <Info size={16} className="text-blue-600" />
              <p className="text-[10px] font-black uppercase tracking-widest">Informação de Acesso</p>
            </div>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
              O sistema opera em <span className="text-blue-600">Modo Navegador</span>, onde todos os seus dados ficam salvos de forma segura apenas neste dispositivo.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-1.5">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">
              &copy; 2026 BIOBEL SISTEMA GESTÃO. Todos os direitos reservados.
            </p>
            <p className="text-[9px] text-blue-500 font-extrabold uppercase tracking-widest leading-none">
              Versão {APP_VERSION}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
      <NotificationToast notifications={notifications} removeNotification={removeNotification} />

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col shrink-0 transition-all duration-300 z-50 lg:relative",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isSidebarCollapsed 
          ? "lg:w-0 lg:opacity-0 lg:pointer-events-none lg:overflow-hidden lg:-translate-x-full border-r-0" 
          : "w-64 lg:translate-x-0"
      )}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100 overflow-hidden">
              {settings.logo ? (
                <img 
                  src={settings.logo} 
                  alt={settings.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Store size={24} />
              )}
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 dark:text-white leading-none tracking-tight uppercase text-sm">{settings.name || 'BIOBEL'}</h2>
              <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-1">SISTEMA GESTÃO</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleToggleSidebarCollapse}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg hidden lg:flex items-center justify-center transition-colors border border-slate-100 dark:border-slate-800 shadow-xs cursor-pointer"
              title="Recolher Menu"
            >
              <ChevronLeft size={14} />
            </button>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600 lg:hidden"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto scrollbar-hide">
          {/* Menu Search Filter */}
          <div className="px-2 mb-4">
            <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/80 focus-within:ring-1 focus-within:ring-blue-500/35 transition-all">
              <Search className="absolute left-3 text-slate-400" size={14} />
              <input 
                type="text"
                placeholder="Buscar no menu..."
                value={sidebarSearchQuery}
                onChange={(e) => setSidebarSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
              />
              {sidebarSearchQuery && (
                <button 
                  onClick={() => setSidebarSearchQuery('')}
                  className="absolute right-2 text-slate-450 hover:text-slate-605 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {(() => {
            const allPossibleItems = [
              { id: 'home', label: 'Início', icon: Home },
              { id: 'atendimento', label: 'Atendimento (Nova Venda)', icon: ShoppingCart },
              { id: 'products', label: 'Produtos', icon: Package },
              { id: 'brands', label: 'Marcas', icon: Disc },
              { id: 'staff', label: 'Usuários & Equipe', icon: Megaphone },
              { id: 'customers', label: 'Clientes', icon: UserIcon },
              { id: 'combos', label: 'Combos de Produtos', icon: Layers },
              { id: 'kits', label: 'Kits de Presente', icon: Box },
              { id: 'peks', label: 'Peks (Packs)', icon: PackageCheck },
              { id: 'suppliers', label: 'Fornecedores', icon: Users },
              { id: 'sales', label: 'Vendas', icon: History },
              { id: 'reports', label: 'Relatórios & Histórico', icon: FileBarChart },
              { id: 'dashboard', label: 'Painel em Tempo Real', icon: LayoutDashboard },
              { id: 'improvement', label: 'Alertas & Decisões', icon: AlertTriangle },
              { id: 'costs', label: 'Custos Fixos', icon: FileText },
              { id: 'financial_accounts', label: 'Contas a Pagar/Receber', icon: ClipboardListIcon },
              { id: 'cash_flow', label: 'Fluxo de Caixa', icon: TrendingUp },
              { id: 'cashier', label: 'Caixa / Turnos', icon: Wallet },
              { id: 'campaigns', label: 'Campanhas', icon: Sparkles },
              { id: 'giveaways', label: 'Sorteios', icon: Gift },
              { id: 'raffles', label: 'Campanhas de Rifas', icon: Ticket },
              { id: 'manager_campaign', label: 'Campanha das Vendedoras', icon: Award },
              { id: 'performance', label: 'Espelho da Vendedora', icon: Smartphone },
              { id: 'routine', label: 'Checklist Diário', icon: CheckCircle },
              { id: 'funcao_rotina', label: 'Função & Rotina', icon: ClipboardList },
              { id: 'agenda', label: 'Agenda de Eventos', icon: Calendar },
              { id: 'admin_profile', label: 'Perfil & Senha', icon: UserIcon },
              { id: 'goals', label: 'Metas Mensais', icon: Target },
              { id: 'config', label: 'Dados da Empresa & Recibo', icon: Settings },
              { id: 'backup', label: 'Backup & Importação', icon: Database },
              { id: 'help', label: 'Ajuda & Novidades', icon: Zap },
              { id: 'fiscal_cfop', label: 'CFOP', icon: Hash },
              { id: 'fiscal_emissao', label: 'Emissão online', icon: Globe, badge: 'NOVO' },
              { id: 'fiscal_observacoes', label: 'Regras para observações', icon: FileText },
              { id: 'fiscal_serie', label: 'Série fiscal', icon: Calculator },
              { id: 'fiscal_ibpt', label: 'Tabela de tributos IBPT', icon: Percent },
              { id: 'fiscal_nfe', label: 'NF-e', icon: FileCode },
              { id: 'fiscal_cnae', label: 'CNAE', icon: Building2 },
            ];

            const favoriteItemsList = favoriteMenus
              .map(favId => allPossibleItems.find(item => item.id === favId))
              .filter((item): item is typeof allPossibleItems[0] => !!item);

            const principalIds = settings.principalMenus && settings.principalMenus.length > 0
              ? settings.principalMenus
              : ['home', 'atendimento'];

            const principalItemsList = principalIds
              .map(pId => allPossibleItems.find(item => item.id === pId))
              .filter((item): item is typeof allPossibleItems[0] => !!item);

            const menuSections = [
              {
                id: 'PRINCIPAL',
                title: '🚀 Principal',
                colorClass: 'text-indigo-650 dark:text-indigo-400',
                items: principalItemsList
              },
              ...(favoriteItemsList.length > 0 ? [{
                id: 'FAVORITOS',
                title: '⭐ Seus Favoritos',
                colorClass: 'text-amber-500/95 dark:text-amber-400',
                items: favoriteItemsList
              }] : []),
              {
                id: 'CADASTROS',
                title: '📋 Cadastros',
                colorClass: 'text-blue-600 dark:text-blue-400',
                items: [
                  { id: 'products', label: 'Produtos', icon: Package },
                  { id: 'brands', label: 'Marcas', icon: Disc },
                  { id: 'staff', label: 'Usuários & Equipe', icon: Megaphone },
                  { id: 'customers', label: 'Clientes', icon: UserIcon },
                  { id: 'combos', label: 'Combos de Produtos', icon: Layers },
                  { id: 'kits', label: 'Kits de Presente', icon: Box },
                  { id: 'peks', label: 'Peks (Packs)', icon: PackageCheck },
                  { id: 'suppliers', label: 'Fornecedores', icon: Users },
                ]
              },
              {
                id: 'CONSULTA',
                title: '🔍 Consultas',
                colorClass: 'text-emerald-600 dark:text-emerald-400',
                items: [
                  { id: 'sales', label: 'Vendas', icon: History },
                  { id: 'reports', label: 'Relatórios & Histórico', icon: FileBarChart },
                  { id: 'dashboard', label: 'Painel em Tempo Real', icon: LayoutDashboard },
                  { id: 'improvement', label: 'Alertas & Decisões', icon: AlertTriangle },
                ]
              },
              {
                id: 'FINANCEIRO',
                title: '💵 Financeiro',
                colorClass: 'text-rose-600 dark:text-rose-400',
                items: [
                  { id: 'costs', label: 'Custos Fixos', icon: FileText },
                  { id: 'financial_accounts', label: 'Contas a Pagar/Receber', icon: ClipboardListIcon },
                  { id: 'cash_flow', label: 'Fluxo de Caixa', icon: TrendingUp },
                  { id: 'cashier', label: 'Caixa / Turnos', icon: Wallet },
                ]
              },
              {
                id: 'FISCAL',
                title: '⚖️ Fiscal',
                colorClass: 'text-slate-650 dark:text-slate-400',
                items: [
                  { id: 'fiscal_cfop', label: 'CFOP', icon: Hash },
                  { id: 'fiscal_emissao', label: 'Emissão online', icon: Globe, badge: 'NOVO' },
                  { id: 'fiscal_observacoes', label: 'Regras para observações', icon: FileText },
                  { id: 'fiscal_serie', label: 'Série fiscal', icon: Calculator },
                  { id: 'fiscal_ibpt', label: 'Tabela de tributos IBPT', icon: Percent },
                  { id: 'fiscal_nfe', label: 'NF-e', icon: FileCode },
                  { id: 'fiscal_cnae', label: 'CNAE', icon: Building2 },
                ]
              },
              {
                id: 'MARKETING_CRM',
                title: '🎯 Marketing & CRM',
                colorClass: 'text-purple-600 dark:text-purple-400',
                items: [
                  { id: 'customers', label: 'Clientes (CRM)', icon: UserIcon },
                  { id: 'campaigns', label: 'Campanhas', icon: Sparkles },
                  { id: 'giveaways', label: 'Sorteios', icon: Gift },
                  { id: 'raffles', label: 'Campanhas de Rifas', icon: Ticket },
                  { id: 'manager_campaign', label: 'Campanha das Vendedoras', icon: Award },
                  { id: 'performance', label: 'Espelho da Vendedora', icon: Smartphone },
                ]
              },
              {
                id: 'TAREFAS_AGENDA',
                title: '📅 Tarefas & Agenda',
                colorClass: 'text-yellow-650 dark:text-yellow-500',
                items: [
                  { id: 'routine', label: 'Checklist Diário', icon: CheckCircle },
                  { id: 'funcao_rotina', label: 'Função & Rotina', icon: ClipboardList },
                  { id: 'agenda', label: 'Agenda de Eventos', icon: Calendar },
                ]
              },
              {
                id: 'CONFIGURACOES',
                title: '⚙️ Configurações',
                colorClass: 'text-slate-500 dark:text-slate-400',
                items: [
                  { id: 'admin_profile', label: 'Perfil & Senha', icon: UserIcon },
                  { id: 'goals', label: 'Metas Mensais', icon: Target },
                  { id: 'config', label: 'Dados da Empresa & Recibo', icon: Settings },
                  { id: 'backup', label: 'Backup & Importação', icon: Database },
                  { id: 'help', label: 'Ajuda & Novidades', icon: Zap },
                ]
              }
            ];

            const isSearching = sidebarSearchQuery.trim().length > 0;
            const searchNormalized = sidebarSearchQuery.toLowerCase().trim();

            if (isSearching) {
              const matchedItems = menuSections.flatMap(sec => 
                sec.items.filter(item => item.label.toLowerCase().includes(searchNormalized))
                  .map(item => ({ ...item, sectionTitle: sec.title, secId: sec.id }))
              );

              const seen = new Set();
              const uniqueMatches = matchedItems.filter(el => {
                const duplicate = seen.has(el.id);
                seen.add(el.id);
                return !duplicate;
              });

              if (uniqueMatches.length === 0) {
                return (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    Nenhum item localizado.
                  </div>
                );
              }

              return (
                <div className="space-y-1">
                  <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Resultados da Busca</p>
                  {uniqueMatches.map((item) => (
                    <div
                      key={item.id}
                      className="group/item flex items-center justify-between w-full rounded-xl transition-all"
                    >
                      <button
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsSidebarOpen(false);
                        }}
                        className={cn(
                          "flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all text-left",
                          activeTab === item.id 
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30" 
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        )}
                      >
                        <item.icon size={16} className="text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs font-bold">{item.label}</p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-medium">{item.sectionTitle.replace(/[0-9*🔵🟢⭐🚀🟣🟠🟡⚙️🔧. ]/g, '')}</p>
                        </div>
                        {item.id === 'cashier' && (
                          <span className={cn(
                            "text-[8px] font-black px-1.5 py-0.5 rounded tracking-tighter shrink-0 mr-1",
                            isCashierOpen ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" : "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                          )}>
                            {isCashierOpen ? 'ABERTO' : 'FECHADO'}
                          </span>
                        )}
                        {activeTab === item.id && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0 mr-1" />}
                      </button>

                      {/* Favorite Toggle Button in Search */}
                      {item.id !== 'home' && (
                        <button
                          onClick={(e) => toggleFavoriteMenu(item.id, e)}
                          className={cn(
                            "p-2 rounded-lg transition-all hover:bg-slate-100 dark:hover:bg-slate-800/60 shrink-0 cursor-pointer ml-0.5 mr-1",
                            favoriteMenus.includes(item.id)
                              ? "text-amber-500 hover:text-amber-650"
                              : "text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 opacity-0 group-hover/item:opacity-100 focus:opacity-100"
                          )}
                          title={favoriteMenus.includes(item.id) ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                        >
                          <Star size={13} fill={favoriteMenus.includes(item.id) ? "currentColor" : "none"} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            }

            return menuSections.map((sec) => {
              const isCollapsed = collapsedSections[sec.id];
              const isSectionActive = sec.items.some(item => item.id === activeTab);
              return (
                <div key={sec.id} className="space-y-1.5">
                  {/* Category Header Bar - Collapsible Accordion Parent */}
                  <button 
                    onClick={() => toggleSection(sec.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all border group cursor-pointer",
                      isSectionActive
                        ? "bg-slate-550/10 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-800 shadow-xs"
                        : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30 font-medium"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isSectionActive && <div className="w-1.5 h-3.5 bg-blue-600 dark:bg-blue-500 rounded-full shrink-0 animate-pulse" />}
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest transition-colors", 
                        isSectionActive ? "text-slate-900 dark:text-white" : sec.colorClass
                      )}>
                        {sec.title}
                      </span>
                      {sec.id === 'FISCAL' && (
                        <span className="text-[8px] font-black bg-lime-400 text-slate-900 px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wide">
                          NOVO
                        </span>
                      )}
                    </div>
                    <ChevronRight 
                      size={14} 
                      className={cn(
                        "text-slate-400 transition-transform group-hover:text-slate-600 dark:group-hover:text-slate-350", 
                        !isCollapsed && "rotate-90",
                        isSectionActive && "text-slate-800 dark:text-white"
                      )} 
                    />
                  </button>

                  {/* Category Items */}
                  {!isCollapsed && (
                    <div className="space-y-0.5 pl-1.5 border-l border-slate-100 dark:border-slate-800/60 ml-3 pt-0.5">
                      {sec.items.map((item) => (
                        <div
                          key={item.id}
                          className="group/item flex items-center justify-between w-full rounded-xl transition-all"
                        >
                          <button
                            onClick={() => {
                              setActiveTab(item.id);
                              setIsSidebarOpen(false);
                            }}
                            className={cn(
                              "flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left",
                              activeTab === item.id 
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30" 
                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            )}
                          >
                            <item.icon size={16} className={cn("shrink-0", activeTab === item.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400")} />
                            <span className="flex-1 text-left truncate">{item.label}</span>
                            {item.id === 'cashier' && (
                              <span className={cn(
                                "text-[8px] font-black px-1.5 py-0.5 rounded tracking-tighter shrink-0 mr-1",
                                isCashierOpen ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                              )}>
                                {isCashierOpen ? 'ABERTO' : 'FECHADO'}
                              </span>
                            )}
                            {item.badge && (
                              <span className="text-[8px] font-black bg-lime-400 text-slate-900 px-1.5 py-0.5 rounded shrink-0 mr-1 uppercase">
                                {item.badge}
                              </span>
                            )}
                            {activeTab === item.id && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0 mr-1" />}
                          </button>

                          {/* Favorite Toggle Button */}
                          {item.id !== 'home' && (
                            <button
                              onClick={(e) => toggleFavoriteMenu(item.id, e)}
                              className={cn(
                                "p-2 rounded-lg transition-all hover:bg-slate-100 dark:hover:bg-slate-800/60 shrink-0 cursor-pointer ml-0.5 mr-1",
                                favoriteMenus.includes(item.id)
                                  ? "text-amber-500 hover:text-amber-650 opacity-100"
                                  : "text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 opacity-0 group-hover/item:opacity-100 focus:opacity-100"
                              )}
                              title={favoriteMenus.includes(item.id) ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                            >
                              <Star size={13} fill={favoriteMenus.includes(item.id) ? "currentColor" : "none"} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 overflow-hidden shadow-lg border-2 border-white dark:border-slate-800">
              {settings.adminPhoto && settings.adminPhoto.length > 5 ? (
                <img src={settings.adminPhoto} alt="Admin" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <UserCircle size={24} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                {user?.displayName || 'Administrador'}
              </p>
              <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-widest">
                Modo Navegador • v{APP_VERSION}
              </p>
            </div>
            <button 
              onClick={() => {
                setActiveTab('admin_profile');
                setIsSidebarOpen(false);
              }}
              className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
              title="Editar Perfil"
            >
              <Settings size={16} />
            </button>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl text-sm font-bold transition-all"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 transition-colors duration-300 sticky top-0 z-[60]">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden"
            >
              <Menu size={24} />
            </button>

            {isSidebarCollapsed && (
              <button 
                onClick={handleToggleSidebarCollapse}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl hidden lg:flex items-center justify-center transition-all border border-slate-100 dark:border-slate-800 shrink-0 shadow-xs cursor-pointer"
                title="Expandir Menu"
              >
                <ChevronRight size={20} className="text-blue-600 dark:text-blue-400" />
              </button>
            )}
            
            <div className="relative w-full group hidden md:block">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input 
                type="text"
                placeholder="Busca rápida (Ctrl + K)..."
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-2.5 pl-12 pr-4 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
              />
              
              <AnimatePresence>
                {isSearchOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110]"
                      onClick={() => setIsSearchOpen(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: -20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -20 }}
                      className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden z-[120]"
                    >
                      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="relative group">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={20} />
                          <input 
                            autoFocus
                            type="text"
                            placeholder="O que você está procurando?"
                            className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl py-4 pl-12 pr-4 text-lg font-black text-slate-900 dark:text-white placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                        {!globalSearch ? (
                          <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-4">
                              <Sparkles size={32} />
                            </div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Busca Inteligente</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Digite algo para pesquisar em todo o sistema</p>
                          </div>
                        ) : (
                          <>
                            {globalResults.products.length > 0 && (
                              <div className="mb-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3">📦 Produtos</p>
                                <div className="grid grid-cols-1 gap-2">
                                  {globalResults.products.map(p => (
                                    <button 
                                      key={p.id}
                                      onClick={() => handleGlobalClick('product', p.id)}
                                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-[24px] border border-slate-100 dark:border-slate-800 transition-all group"
                                    >
                                      <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-blue-600 shadow-sm">
                                          <PackageIcon size={20} />
                                        </div>
                                        <div className="text-left">
                                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{p.name}</p>
                                          <p className="text-[10px] text-slate-400 font-bold uppercase">{p.brand} • {formatCurrency(p.price)}</p>
                                        </div>
                                      </div>
                                      <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {globalResults.customers.length > 0 && (
                              <div className="mb-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3">👥 Clientes</p>
                                <div className="grid grid-cols-1 gap-2">
                                  {globalResults.customers.map(c => (
                                    <button 
                                      key={c.id}
                                      onClick={() => handleGlobalClick('customer', c.id)}
                                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-[24px] border border-slate-100 dark:border-slate-800 transition-all group"
                                    >
                                      <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-emerald-600 shadow-sm">
                                          <Users size={20} />
                                        </div>
                                        <div className="text-left">
                                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{c.name}</p>
                                          <p className="text-[10px] text-slate-400 font-bold uppercase">{c.phone}</p>
                                        </div>
                                      </div>
                                      <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500 transform group-hover:translate-x-1 transition-all" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {globalResults.products.length === 0 && globalResults.customers.length === 0 && (
                              <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-4">
                                  <AlertCircle size={32} />
                                </div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Nenhum resultado</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Tente buscar por termos diferentes</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-500 shadow-sm">ESC</kbd>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fechar</span>
                          </div>
                        </div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Atalho: Ctrl + K</p>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-6">
            {isOffline && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600 animate-pulse">
                <AlertCircle size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Offline</span>
              </div>
            )}
            
            {savedCarts.length > 0 && (
              <button 
                onClick={() => setActiveTab('atendimento')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 hover:shadow-md transition-all"
                title="Carrinhos Salvos"
              >
                <ShoppingCart size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">{savedCarts.length} Salvos</span>
              </button>
            )}

            <button 
              onClick={() => setActiveTab('cashier')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:shadow-md",
                isCashierOpen ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full", isCashierOpen ? "bg-emerald-500" : "bg-rose-500 animate-pulse")} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{isCashierOpen ? 'Caixa Aberto' : 'Caixa Fechado'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-800" title={`Versão do Sistema: ${APP_VERSION}`}>
              v{APP_VERSION}
            </span>
            <button 
              onClick={() => setSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })}
              className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
              title={settings.theme === 'dark' ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            >
              {settings.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg relative transition-all cursor-pointer flex items-center justify-center text-left"
                title="Notificações"
              >
                <Bell size={20} className={cn(notificationHistory.some(n => !n.read) ? "text-slate-700 dark:text-slate-200 animate-pulse" : "")} />
                {notificationHistory.some(n => !n.read) && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
                )}
              </button>
              
              <AnimatePresence>
                {showNotificationDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotificationDropdown(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden"
                    >
                      {/* Cabeçalho */}
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            Notificações
                          </h4>
                          {notificationHistory.some(n => !n.read) && (
                            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                              {notificationHistory.filter(n => !n.read).length}
                            </span>
                          )}
                        </div>
                        {notificationHistory.some(n => !n.read) && (
                          <button
                            onClick={() => {
                              setNotificationHistory(prev => prev.map(n => ({ ...n, read: true })));
                              addNotification('Todas as notificações foram marcadas como lidas.', 'info');
                            }}
                            className="text-[10px] font-black text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-350 uppercase tracking-widest cursor-pointer"
                          >
                            Marcar lidas
                          </button>
                        )}
                      </div>

                      {/* Lista de Notificações */}
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850 scrollbar-hide">
                        {notificationHistory.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
                            <span className="text-4xl">📭</span>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                              Nenhuma notificação por aqui
                            </p>
                          </div>
                        ) : (
                          notificationHistory.map((n) => (
                            <div 
                              key={n.id} 
                              className={cn(
                                "p-4 flex items-start gap-3 transition-all hover:bg-slate-50/60 dark:hover:bg-slate-800/40 relative",
                                !n.read ? "bg-blue-500/5 dark:bg-blue-500/5 border-l-4 border-blue-500" : "border-l-4 border-transparent"
                              )}
                            >
                              <div className="mt-0.5 shrink-0">
                                {n.type === 'success' && <CheckCircle2 className="text-emerald-500" size={16} />}
                                {n.type === 'error' && <AlertCircle className="text-rose-500" size={16} />}
                                {n.type === 'info' && <Info className="text-blue-500" size={16} />}
                                {n.type === 'warning' && <AlertTriangle className="text-amber-500" size={16} />}
                              </div>
                              <div className="flex-1 space-y-1 text-left">
                                <p className={cn("text-xs leading-relaxed", !n.read ? "text-slate-900 dark:text-slate-100 font-bold" : "text-slate-500 dark:text-slate-400 font-medium")}>
                                  {n.message}
                                </p>
                                <span className="text-[9px] font-mono text-slate-400 block pb-0.5">
                                  {new Date(n.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setNotificationHistory(prev => prev.filter(item => item.id !== n.id));
                                }}
                                className="text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 p-1 rounded-sm cursor-pointer shrink-0 transition-colors"
                                title="Remover"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Rodapé */}
                      {notificationHistory.length > 0 && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 text-center">
                          <button
                            onClick={() => {
                              setNotificationHistory([]);
                              addNotification('Histórico de notificações limpo.', 'info');
                            }}
                            className="w-full py-1 text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest transition-all cursor-pointer align-middle"
                          >
                            ⚠️ Limpar Histórico
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-1 lg:mx-2" />
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-black text-slate-900 dark:text-white">{user.displayName}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{user.role}</p>
              </div>
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={18} />
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-hide">
          {/* Banner de Eventos Próximos (Hoje/Amanhã) */}
          {bannerEvents.length > 0 && (
            <div className="mb-6 space-y-3">
              {bannerEvents.map(ev => {
                const isToday = ev.date === getLocalDateString(0);
                return (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    key={`banner-ev-${ev.id}`}
                    className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-3xl border text-left gap-4 shadow-lg ${
                      isToday 
                        ? 'bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30' 
                        : 'bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                        isToday 
                          ? 'bg-rose-200/50 text-rose-600 dark:bg-rose-950 dark:text-rose-400' 
                          : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                      }`}>
                        <Calendar size={20} className={isToday ? 'animate-bounce' : ''} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest ${
                            isToday ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {isToday ? 'Evento HOJE' : 'Evento AMANHÃ'}
                          </span>
                          {ev.time && (
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 font-mono">
                              ⏰ {ev.time}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                          {ev.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold max-w-2xl leading-normal">
                          {ev.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      <button
                        onClick={() => {
                          setActiveTab('agenda');
                        }}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm border ${
                          isToday 
                            ? 'bg-rose-600 hover:bg-rose-700 text-white border-transparent' 
                            : 'bg-amber-500 hover:bg-amber-600 text-white border-transparent'
                        }`}
                      >
                        Ver Agenda
                      </button>
                      <button
                        onClick={() => {
                          setDismissedEvents(prev => [...prev, ev.id]);
                        }}
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-all"
                        title="Dispensar aviso"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {activeTab === 'home' && (
            <HomeView
              sales={sales}
              customers={customers}
              products={products}
              fixedCosts={fixedCosts}
              isCashierOpen={isCashierOpen}
              currentCashierSession={currentCashierSession}
              monthlyGoals={monthlyGoals}
              setActiveTab={setActiveTab}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              setCart={setCart}
              setSelectedProduct={setSelectedProduct}
              setCurrentStep={setCurrentStep}
              brands={brands}
              settings={settings}
              staff={staff}
            />
          )}
          {activeTab === 'funcao_rotina' && <FuncaoRotinaView setActiveTab={setActiveTab} />}
          {activeTab === 'atendimento' && (
            <div className="space-y-6 relative min-h-[600px]">
              {!isCashierOpen && (
                <div className="absolute inset-x-0 top-0 bottom-0 z-50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[40px] flex flex-col items-center justify-center text-center p-8 lg:p-12 transition-all border-2 border-rose-100/50 dark:border-rose-900/20">
                  <div className="w-24 h-24 bg-white dark:bg-slate-800 text-rose-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse mb-8 border-4 border-rose-50 dark:border-rose-900/30">
                    <Lock size={48} />
                  </div>
                  <div className="space-y-4 max-w-md mb-8">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Caixa Fechado</h2>
                    <p className="text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                      Para iniciar uma venda ou atendimento, é necessário que o caixa esteja aberto. Isso garante que o controle financeiro seja registrado corretamente.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('cashier')}
                    className="flex items-center gap-4 px-10 py-5 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-2xl shadow-rose-200 dark:shadow-none group scale-110"
                  >
                    <Unlock size={24} className="group-hover:rotate-12 transition-transform" />
                    Abrir Caixa Agora
                  </button>
                </div>
              )}
              {/* Header with Steps */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                {currentStep > 1 && currentStep < 5 && (
                  <button 
                    onClick={prevStep}
                    className="flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl lg:rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm group"
                  >
                    <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest">Voltar</span>
                  </button>
                )}
                <div>
                  <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Atendimento</h1>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inicie um novo atendimento ou venda</p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:gap-4 overflow-x-auto scrollbar-hide pb-2 lg:pb-0">
                {currentStep < 5 && (
                  <>
                    <button 
                      onClick={() => setIsAtendimentoSummaryOpen(!isAtendimentoSummaryOpen)}
                      className={cn(
                        "p-2 rounded-xl border transition-all shrink-0",
                        isAtendimentoSummaryOpen 
                          ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100" 
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                    >
                      <BarChart3 size={20} />
                    </button>
                    <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
                      <span className="px-3 py-1 text-[10px] font-black text-rose-500 dark:text-rose-400 flex items-center gap-1.5 font-display">
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                        PASSO {currentStep} DE 3
                      </span>
                    </div>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
                      <button 
                        onClick={() => setViewMode('Presencial')}
                        className={cn(
                          "px-3 lg:px-4 py-1.5 rounded-md text-[10px] lg:text-xs font-bold transition-all",
                          viewMode === 'Presencial' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400"
                        )}
                      >
                        Presencial
                      </button>
                      <button 
                        onClick={() => setViewMode('Digital')}
                        className={cn(
                          "px-3 lg:px-4 py-1.5 rounded-md text-[10px] lg:text-xs font-bold transition-all",
                          viewMode === 'Digital' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400"
                        )}
                      >
                        Digital
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8">
              <div className="flex-1 space-y-4 lg:space-y-6">
                {currentStep === 3 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="min-h-[70vh] flex flex-col items-center justify-center py-10 px-6 text-center space-y-12"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-rose-500 blur-3xl opacity-20 rounded-full animate-pulse" />
                      <div className="relative w-32 h-32 bg-white dark:bg-slate-900 border-4 border-emerald-500 text-emerald-500 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-100 dark:shadow-none group transition-transform hover:scale-110">
                        <Check size={64} strokeWidth={3} />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h2 className="text-5xl font-black text-slate-900 dark:text-white font-display tracking-tight leading-tight uppercase">Venda Finalizada!</h2>
                      <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Obrigada por cuidar da Biobel hoje</p>
                    </div>

                    {/* Nota Fiscal & CPF Card */}
                    <div className="w-full max-w-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 p-6 rounded-[28px] space-y-4 shadow-sm flex flex-col items-center">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 text-left">
                          <span className="text-2xl">🧾</span>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Nota Fiscal de Consumidor</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                              {lastCompletedSale?.cpfNaNota ? `CPF/CNPJ na Nota: ${lastCompletedSale.cpfNaNota}` : 'Nenhum CPF/CNPJ solicitado'}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase rounded-full tracking-wider">
                          Pendente SEFAZ
                        </span>
                      </div>

                      <div className="w-full flex gap-3 mt-1">
                        <button
                          onClick={handleEmitNfce}
                          className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          ⚡ Emitir NFC-e Oficial (SEFAZ)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
                       <button 
                         onClick={() => handlePrintReceipt()}
                         className="p-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] hover:border-blue-500 hover:text-blue-500 transition-all group flex flex-col items-center gap-3 shadow-sm hover:shadow-xl"
                       >
                          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-500 transition-all">
                            <Printer size={24} />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest leading-tight">Imprimir Cupom</span>
                       </button>

                       <button 
                         onClick={handleWhatsAppShare}
                         className="p-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] hover:border-emerald-500 hover:text-emerald-500 transition-all group flex flex-col items-center gap-3 shadow-sm hover:shadow-xl"
                       >
                          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-500 transition-all">
                            <MessageCircle size={24} />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest leading-tight">WhatsApp</span>
                       </button>

                       <button 
                         onClick={handleCopyText}
                         className="p-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] hover:border-rose-500 hover:text-rose-500 transition-all group flex flex-col items-center gap-3 shadow-sm hover:shadow-xl"
                       >
                          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-rose-50 dark:group-hover:bg-rose-900/20 group-hover:text-rose-500 transition-all">
                            <ClipboardList size={24} />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest leading-tight">Copiar Resumo</span>
                       </button>

                       <button 
                         onClick={handleDownloadPDF}
                         className="p-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] hover:border-indigo-500 hover:text-indigo-500 transition-all group flex flex-col items-center gap-3 shadow-sm hover:shadow-xl"
                       >
                          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:text-indigo-500 transition-all">
                            <Download size={24} />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest leading-tight">Baixar PDF</span>
                       </button>
                    </div>

                    <div className="pt-6">
                      <button 
                        onClick={() => {
                          setCart([]);
                          setDiscount(0);
                          setVendedora('SISTEMA');
                          setSelectedCustomer(null);
                          setAtendimentoCustomerSearch('');
                          setCpfNaNotaValue('');
                          setCpfNaNota(false);
                          setIsSplitPayment(false);
                          setSplitPayments([]);
                          setCurrentStep(1);
                        }}
                        className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
                      >
                        <Plus size={18} /> Novo Atendimento
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="glass-card p-10 rounded-[40px] border-white/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:rotate-12 transition-transform duration-1000">
                         <Package size={140} />
                      </div>
                      
                      <div className="relative z-10 space-y-8">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-rose-600 text-white rounded-[24px] flex items-center justify-center text-2xl font-black shadow-2xl shadow-rose-200 dark:shadow-none font-display">1</div>
                            <div>
                              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-2xl font-display">Seleção de Produtos</h3>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Biobel Estética & Bem Estar</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 bg-white/20 backdrop-blur-md p-2 rounded-[24px] border border-white/30">
                            {[
                              { id: 'avulso', label: 'AVULSOS' },
                              { id: 'combo', label: 'COMBOS' },
                              { id: 'kit', label: 'KITS' }
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => {
                                  setAtendimentoProductType(tab.id as any);
                                  setAtendimentoCategoryFilter('');
                                  setAtendimentoBrandFilter('');
                                }}
                                className={cn(
                                  "px-8 py-3 rounded-[18px] text-[10px] font-black tracking-[0.1em] transition-all duration-300",
                                  atendimentoProductType === tab.id 
                                    ? "bg-rose-600 text-white shadow-xl shadow-rose-200/50" 
                                    : "text-slate-500 hover:text-rose-500 hover:bg-white/40"
                                )}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                          <div className="lg:col-span-9 relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-500 transition-colors duration-300" size={24} />
                            <input 
                              type="text" 
                              placeholder="O que você está procurando hoje?" 
                              value={atendimentoProductSearch}
                              onChange={(e) => setAtendimentoProductSearch(e.target.value)}
                              className="w-full pl-16 pr-24 py-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500/30 transition-all font-display text-lg shadow-sm placeholder:text-slate-300"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                              {atendimentoProductSearch && (
                                <button 
                                  onClick={() => setAtendimentoProductSearch('')}
                                  className="w-10 h-10 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl flex items-center justify-center transition-all"
                                >
                                  <X size={18} />
                                </button>
                              )}
                              <div className="w-[1px] h-8 bg-slate-100 mx-2" />
                              <button className="w-10 h-10 text-rose-500 hover:bg-rose-50 rounded-xl flex items-center justify-center transition-all bg-white dark:bg-slate-800 shadow-sm">
                                <QrCode size={22} />
                              </button>
                            </div>
                          </div>

                          <div className="lg:col-span-3">
                             <button 
                               onClick={() => isCashierOpen && setIsCustomItemModalOpen(true)}
                               className={cn(
                                 "w-full h-full flex items-center justify-center gap-3 px-6 py-4 rounded-[32px] font-black uppercase tracking-widest text-[11px] transition-all border-2",
                                 isCashierOpen 
                                   ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:scale-[1.02] shadow-xl" 
                                   : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                               )}
                             >
                               <Plus size={20} /> Item Avulso
                             </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-5">
                          {posCategories.length > 0 && (
                            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
                              <button
                                onClick={() => setAtendimentoCategoryFilter('')}
                                className={cn(
                                  "whitespace-nowrap px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all border-2 shrink-0 h-11",
                                  atendimentoCategoryFilter === ''
                                    ? "bg-white border-rose-500 text-rose-600 shadow-lg shadow-rose-100"
                                    : "bg-white/40 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-rose-200 hover:text-rose-600"
                                )}
                              >
                                TODAS CATEGORIAS
                              </button>
                              {posCategories.sort().map(cat => (
                                <button
                                  key={cat}
                                  onClick={() => setAtendimentoCategoryFilter(atendimentoCategoryFilter === cat ? '' : cat)}
                                  className={cn(
                                    "whitespace-nowrap px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all border-2 shrink-0 h-11",
                                    atendimentoCategoryFilter === cat
                                      ? "bg-white border-rose-500 text-rose-600 shadow-lg shadow-rose-100"
                                      : "bg-white/40 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-rose-200 hover:text-rose-600"
                                  )}
                                >
                                  {cat.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          )}

                          {posBrands.length > 0 && (
                            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
                              <button
                                onClick={() => setAtendimentoBrandFilter('')}
                                className={cn(
                                  "whitespace-nowrap px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all border-2 shrink-0 h-11",
                                  atendimentoBrandFilter === ''
                                    ? "bg-white border-amber-500 text-amber-600 shadow-lg shadow-amber-100"
                                    : "bg-white/40 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-amber-200 hover:text-amber-600"
                                )}
                              >
                                TODAS MARCAS
                              </button>
                              {posBrands.sort().map(brand => (
                                <button
                                  key={brand}
                                  onClick={() => setAtendimentoBrandFilter(atendimentoBrandFilter === brand ? '' : brand)}
                                  className={cn(
                                    "whitespace-nowrap px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all border-2 shrink-0 h-11",
                                    atendimentoBrandFilter === brand
                                      ? "bg-white border-amber-500 text-amber-600 shadow-lg shadow-amber-100"
                                      : "bg-white/40 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-amber-200 hover:text-amber-600"
                                  )}
                                >
                                  {brand.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Saved Rascunhos */}
                    {savedCarts.length > 0 && (
                      <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
                        <div className="flex items-center gap-2 text-slate-400 shrink-0">
                           <History size={16} />
                           <span className="text-[10px] font-black uppercase tracking-widest leading-none">Rascunhos</span>
                        </div>
                        {savedCarts.map(saved => (
                          <button
                            key={saved.id}
                            onClick={() => resumeSavedCart(saved)}
                            className="bg-white dark:bg-slate-900 px-5 py-3 rounded-[24px] border border-slate-100 dark:border-slate-800 flex items-center gap-4 hover:border-rose-400 transition-all shrink-0 hover:scale-[1.02] group shadow-sm"
                          >
                            <div className="w-9 h-9 rounded-[14px] bg-rose-50 text-rose-500 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all">
                              <ShoppingCart size={16} />
                            </div>
                            <div className="text-left">
                              <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none">{saved.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{saved.cart.length} itens</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {filteredProducts.length === 0 ? (
                        <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-400 gap-6 glass-card rounded-[40px] border-dashed border-slate-200">
                          <Package size={80} className="opacity-10" />
                          <div className="text-center">
                            <h4 className="font-black uppercase tracking-widest text-lg font-display text-slate-900">Oops! Nada por aqui</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase mt-2 max-w-[250px]">Tente ajustar seus filtros para encontrar o produto que deseja.</p>
                            <button 
                              onClick={() => {
                                setAtendimentoProductSearch('');
                                setAtendimentoCategoryFilter('');
                                setAtendimentoBrandFilter('');
                              }}
                              className="mt-8 px-10 py-4 bg-rose-600 text-white rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all font-display"
                            >
                              Limpar Tudo
                            </button>
                          </div>
                        </div>
                      ) : (
                        filteredProducts.map((product) => (
                          <motion.div
                            key={product.id}
                            whileHover={{ y: -8, scale: 1.02 }}
                            className="bg-white dark:bg-slate-900 rounded-[35px] border border-slate-100 dark:border-slate-800 overflow-hidden group flex flex-col transition-all hover:shadow-2xl hover:shadow-rose-100/50"
                          >
                            <div className="aspect-square bg-slate-50 dark:bg-slate-800 relative overflow-hidden shrink-0 flex items-center justify-center">
                              {product.image ? (
                                <img 
                                  src={product.image} 
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="text-5xl group-hover:scale-125 transition-transform duration-500 ease-out grayscale-[0.3] group-hover:grayscale-0">
                                  {product.category === 'Maquiagem' ? '💄' : 
                                   product.category === 'Cabelo' ? '💇‍♀️' : 
                                   product.category === 'Perfume' ? '✨' : '🧴'}
                                </div>
                              )}
                              
                              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              
                              <button 
                                onClick={() => addToCart(product)}
                                className="absolute bottom-4 left-4 right-4 py-3.5 bg-white/90 backdrop-blur-md rounded-2xl text-rose-600 font-black text-[11px] uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl"
                              >
                                ADICIONAR +
                              </button>

                              {product.isFavorite && (
                                <div className="absolute top-4 left-4 p-2.5 bg-rose-500 text-white rounded-2xl shadow-lg z-10 rotate-[-12deg]">
                                  <Star size={16} fill="currentColor" />
                                </div>
                              )}
                            </div>

                            <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{product.brand || 'Biobel'}</p>
                                <h4 className="font-black text-slate-800 dark:text-white uppercase text-[12px] font-display leading-snug line-clamp-2 min-h-[2.5rem]">
                                  {product.name}
                                </h4>
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                                 <div className="flex flex-col">
                                   <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Valor un.</span>
                                   <span className="text-xl font-black text-slate-900 dark:text-white font-display tracking-tight leading-none">{formatCurrency(product.price)}</span>
                                 </div>
                                 {(() => {
                                   const isKitOrCombo = product.type === 'kit' || product.type === 'combo';
                                   const isMontar = isKitOrCombo && (product.kitMode === 'montar' || !product.kitMode);
                                   let displayStock = product.stock;
                                   if (isMontar && product.comboItems && product.comboItems.length > 0) {
                                     let minStock = Infinity;
                                     product.comboItems.forEach(ci => {
                                       const comp = products.find(p => p.id === ci.productId);
                                       if (comp) {
                                         const possibleKits = Math.floor(comp.stock / ci.quantity);
                                         if (possibleKits < minStock) {
                                           minStock = possibleKits;
                                         }
                                       } else {
                                         minStock = 0;
                                       }
                                     });
                                     displayStock = minStock === Infinity ? 0 : minStock;
                                   }
                                   
                                   return (
                                     <div className={cn(
                                       "w-10 h-10 rounded-2xl flex items-center justify-center text-[10px] font-black transition-all",
                                       displayStock > 10 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                                     )} title={isMontar ? "Estoque calculado baseado nos itens individuais" : "Estoque próprio"}>
                                       {displayStock}
                                     </div>
                                   );
                                 })()}
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>

                    {/* Floating Cart Bar (Simplified Step 1 version) */}
                    <AnimatePresence>
                      {cart.length > 0 && currentStep === 1 && (
                        <motion.div 
                          initial={{ y: 100 }}
                          animate={{ y: 0 }}
                          exit={{ y: 100 }}
                          className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-50"
                        >
                          <div className="bg-slate-900 dark:bg-white rounded-[32px] shadow-2xl p-3 flex items-center justify-between border-4 border-white/10 dark:border-slate-900/10">
                            <div className="flex items-center gap-6 pl-6">
                              <div className="relative">
                                <div className="w-14 h-14 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                  <ShoppingCart size={24} />
                                </div>
                                <span className="absolute -top-2 -right-2 w-6 h-6 bg-white text-rose-600 text-[11px] font-black rounded-full flex items-center justify-center shadow-md">
                                  {cart.reduce((acc, item) => acc + item.quantity, 0)}
                                </span>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total do Carrinho</p>
                                <p className="text-xl font-black text-white dark:text-slate-900 font-display">{formatCurrency(totalCart)}</p>
                              </div>
                            </div>
                            <button 
                              onClick={nextStep}
                              className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-5 rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl"
                            >
                              PAGAMENTO
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={prevStep}
                          className="w-11 h-11 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm"
                        >
                          <ChevronLeft size={22} />
                        </button>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">Pagamento & Identificação</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                             <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Confirme os dados para finalizar</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Total Final</span>
                         <span className="text-3xl font-black text-slate-900 dark:text-white font-display leading-none">{formatCurrency(totalCart - (discount || 0))}</span>
                      </div>
                    </div>

                    <div className="p-8 space-y-10">
                      {/* Identification Section */}
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border border-slate-100 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between px-2">
                           <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Quem está comprando?</h4>
                           {selectedCustomer && (
                             <button onClick={() => setSelectedCustomer(null)} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">Trocar Cliente</button>
                           )}
                        </div>

                        {!selectedCustomer ? (
                          isAddingCustomer ? (
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm animate-in fade-in duration-300">
                              <NewCustomerForm 
                                newCustomer={newCustomer}
                                setNewCustomer={setNewCustomer}
                                onCancel={() => {
                                  setIsAddingCustomer(false);
                                  setNewCustomer({ name: '', phone: '', notes: '' });
                                }}
                                onSave={handleQuickAddCustomer}
                              />
                            </div>
                          ) : (
                            <div className="space-y-4">
                               <div className="relative group">
                                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={20} />
                                  <input 
                                    type="text" 
                                    placeholder="Busque por nome ou telefone..." 
                                    value={atendimentoCustomerSearch}
                                    onChange={(e) => setAtendimentoCustomerSearch(e.target.value)}
                                    className="w-full pl-14 pr-6 py-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all font-medium shadow-sm"
                                  />
                               </div>

                               {atendimentoCustomerSearch && (
                                 <>
                                   {filteredCustomers.length > 0 ? (
                                     <div className="space-y-3">
                                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[180px] overflow-y-auto p-2">
                                          {filteredCustomers.map(customer => (
                                            <button
                                              key={customer.id}
                                              onClick={() => setSelectedCustomer(customer)}
                                              className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all text-left shadow-sm hover:shadow-md hover:scale-[1.02]"
                                            >
                                              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
                                                <UserIcon size={20} />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="font-black text-slate-900 dark:text-white uppercase text-xs truncate leading-tight">{customer.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">{customer.phone}</p>
                                              </div>
                                            </button>
                                          ))}
                                       </div>
                                       <div className="pt-1">
                                         <button 
                                           type="button"
                                           onClick={() => {
                                             setNewCustomer({ name: atendimentoCustomerSearch.trim().toUpperCase(), phone: '', notes: '' });
                                             setIsAddingCustomer(true);
                                           }}
                                           className="w-full py-3 bg-rose-50/80 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-900/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-rose-100/50 dark:border-rose-900/40 text-center"
                                         >
                                           + Cadastrar Novo Cliente: "{atendimentoCustomerSearch.trim().toUpperCase()}"
                                         </button>
                                       </div>
                                     </div>
                                   ) : (
                                     <div className="p-5 bg-rose-50/50 dark:bg-rose-950/10 border border-dashed border-rose-205 dark:border-rose-900/50 rounded-2xl text-center space-y-3 animate-in fade-in zoom-in duration-300">
                                       <p className="text-[10px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-widest">🚨 Nenhum cliente encontrado para "{atendimentoCustomerSearch.toUpperCase()}"</p>
                                       <button 
                                         type="button"
                                         onClick={() => {
                                           setNewCustomer({ name: atendimentoCustomerSearch.trim().toUpperCase(), phone: '', notes: '' });
                                           setIsAddingCustomer(true);
                                         }}
                                         className="px-5 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-rose-200 dark:shadow-none"
                                       >
                                         + Cadastrar "{atendimentoCustomerSearch.toUpperCase()}" Agora
                                       </button>
                                     </div>
                                   )}
                                 </>
                               )}

                               {!atendimentoCustomerSearch && (
                                 <button 
                                   onClick={() => setIsAddingCustomer(true)}
                                   className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:border-rose-300 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all"
                                 >
                                   + Cadastrar Novo Cliente Agora
                                 </button>
                               )}
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-5 p-6 bg-rose-50/50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-3xl group shadow-inner">
                             <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-rose-600 shadow-sm border border-rose-100 dark:border-rose-900">
                                <UserIcon size={28} />
                             </div>
                             <div className="flex-1">
                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none">{selectedCustomer.name}</p>
                                <p className="text-xs font-bold text-rose-600 mt-1.5">{selectedCustomer.phone}</p>
                             </div>
                             <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-100 dark:shadow-none animate-in zoom-in">
                               <Check size={20} />
                             </div>
                          </div>
                        )}
                      </div>

                        {/* Vendedora & Discount Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-4">
                              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Colaboradora</h4>
                              <select 
                                value={vendedora}
                                onChange={(e) => setVendedora(e.target.value)}
                                className="w-full p-4.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
                              >
                                <option value="SISTEMA">SISTEMA (BIOBEL)</option>
                                {staff.filter(s => s.status !== 'inactive').map(s => (
                                  <option key={s.id} value={s.name.toUpperCase()}>{s.name.toUpperCase()}</option>
                                ))}
                              </select>
                           </div>
                           <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                             <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Desconto (R$)</h4>
                             <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                                <input 
                                   type="number" 
                                   value={discount || ''}
                                   onChange={(e) => setDiscount(Number(e.target.value))}
                                   placeholder="0,00"
                                   className="w-full pl-12 pr-6 py-4.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
                                />
                             </div>
                           </div>
                        </div>

                        {/* CPF na Nota Fiscal */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xl font-display">🧾</span>
                              <div>
                                <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">CPF ou CNPJ na Nota?</h5>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Identifique o cliente no cupom fiscal</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setCpfNaNota(!cpfNaNota)}
                              className={cn(
                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                cpfNaNota ? "bg-rose-600" : "bg-slate-200 dark:bg-slate-700"
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                                  cpfNaNota ? "translate-x-5" : "translate-x-0"
                                )}
                              />
                            </button>
                          </div>

                          <AnimatePresence>
                            {cpfNaNota && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden space-y-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50"
                              >
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">CPF ou CNPJ do Cliente</label>
                                <input
                                  type="text"
                                  value={cpfNaNotaValue}
                                  onChange={(e) => setCpfNaNotaValue(formatCpfCnpj(e.target.value))}
                                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                                  className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                      {/* Payment Methods Section */}
                      <div className="space-y-6">
                         <div className="flex items-center justify-between px-2">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Método de Recebimento</h4>
                            <button 
                              onClick={() => {
                                const nextIsSplit = !isSplitPayment;
                                setIsSplitPayment(nextIsSplit);
                                if (nextIsSplit) {
                                  const nextPayments = [{ method: paymentMethod, amount: totalCart - (discount || 0) }];
                                  setSplitPayments(nextPayments);
                                  recalculateCartPrices(paymentMethod, true, nextPayments);
                                } else {
                                  recalculateCartPrices(paymentMethod, false, []);
                                }
                              }}
                              className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl border transition-all shadow-sm",
                                isSplitPayment 
                                  ? "bg-rose-600 text-white border-rose-600" 
                                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                              )}
                            >
                              {isSplitPayment ? "Usar Apenas Um" : "Dividir Pagamento"}
                            </button>
                         </div>

                         {isSplitPayment ? (
                           <div className="space-y-4 p-8 bg-slate-50 dark:bg-slate-800/30 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-inner">
                              {splitPayments.map((p, index) => (
                                <div key={`split-pay-${index}`} className="flex gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 relative group animate-in slide-in-from-top-2 duration-300">
                                   <div className="flex-1">
                                      <select 
                                        value={p.method}
                                        onChange={(e) => {
                                          const newPayments = [...splitPayments];
                                          newPayments[index].method = e.target.value;
                                          setSplitPayments(newPayments);
                                          recalculateCartPrices(paymentMethod, isSplitPayment, newPayments);
                                        }}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-rose-500 outline-none"
                                      >
                                        {['PIX', 'CRÉDITO', 'DÉBITO', 'DINHEIRO', 'FIADO', 'LINK', 'PARCELADO', 'OUTROS'].map(m => (
                                          <option key={m} value={m}>{m}</option>
                                        ))}
                                      </select>
                                   </div>
                                   <div className="flex-1 relative">
                                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-400">R$</span>
                                      <input 
                                        type="number"
                                        value={p.amount}
                                        onChange={(e) => {
                                          const newPayments = [...splitPayments];
                                          newPayments[index].amount = Number(e.target.value);
                                          setSplitPayments(newPayments);
                                          recalculateCartPrices(paymentMethod, isSplitPayment, newPayments);
                                        }}
                                        className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-black focus:ring-2 focus:ring-rose-500 outline-none"
                                      />
                                   </div>
                                   <button 
                                      onClick={() => {
                                        const newPayments = splitPayments.filter((_, i) => i !== index);
                                        setSplitPayments(newPayments);
                                        recalculateCartPrices(paymentMethod, isSplitPayment, newPayments);
                                      }}
                                      className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-2xl transition-all"
                                   >
                                      <Trash2 size={20} />
                                   </button>
                                </div>
                              ))}
                              <button 
                                onClick={() => {
                                  const totalSoFar = splitPayments.reduce((acc, p) => acc + p.amount, 0);
                                  const remaining = Math.max(0, (totalCart - (discount || 0)) - totalSoFar);
                                  const nextPayments = [...splitPayments, { method: 'DINHEIRO', amount: remaining }];
                                  setSplitPayments(nextPayments);
                                  recalculateCartPrices(paymentMethod, isSplitPayment, nextPayments);
                                }}
                                className="w-full py-5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 hover:border-rose-300 transition-all flex items-center justify-center gap-3 bg-white/50 dark:bg-transparent"
                              >
                                <Plus size={18} /> Adicionar Método
                              </button>

                              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center px-4">
                                 <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Falta Receber</p>
                                   <p className={cn("text-xl font-black font-display", Math.abs(splitPayments.reduce((acc, p) => acc + p.amount, 0) - (totalCart - (discount || 0))) < 0.01 ? "text-emerald-500" : "text-rose-500")}>
                                     {formatCurrency((totalCart - (discount || 0)) - splitPayments.reduce((acc, p) => acc + p.amount, 0))}
                                   </p>
                                 </div>
                                 <div className="text-right">
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Selecionado</p>
                                   <p className="text-xl font-black text-slate-900 dark:text-white font-display">
                                     {formatCurrency(splitPayments.reduce((acc, p) => acc + p.amount, 0))}
                                   </p>
                                 </div>
                              </div>

                              {/* Troco block for Split Payment if there's any DINHEIRO method */}
                              {splitPayments.some(p => p.method === 'DINHEIRO') && (
                                <div className="mt-4 p-5 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.01] rounded-2xl border border-emerald-500/10 dark:border-emerald-500/5 space-y-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Troco do Dinheiro</p>
                                      <p className="text-[8px] text-slate-400 uppercase font-bold">Para a parte de {formatCurrency(splitPayments.filter(p => p.method === 'DINHEIRO').reduce((acc, p) => acc + p.amount, 0))} em espécie</p>
                                    </div>
                                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                      {formatCurrency(Math.max(0, parseFloat(cashReceived || '0') - splitPayments.filter(p => p.method === 'DINHEIRO').reduce((acc, p) => acc + p.amount, 0)))}
                                    </p>
                                  </div>
                                  <div className="flex gap-3 items-center">
                                    <div className="relative flex-1">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                                      <input 
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Valor recebido"
                                        value={cashReceived}
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                                          setCashReceived(val);
                                        }}
                                        className="w-full p-2.5 pl-8 bg-white dark:bg-slate-900 border border-emerald-500/20 focus:border-emerald-500 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-mono"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cashTotal = splitPayments.filter(p => p.method === 'DINHEIRO').reduce((acc, p) => acc + p.amount, 0);
                                        setCashReceived(cashTotal.toFixed(2));
                                      }}
                                      className="px-3 py-2.5 bg-white dark:bg-slate-900 hover:border-emerald-300 border border-slate-200 dark:border-slate-800 rounded-xl text-[8.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-all"
                                    >
                                      Valor Exato
                                    </button>
                                  </div>
                                </div>
                              )}
                           </div>
                         ) : (
                           <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-4">
                              {[
                                { id: 'PIX', icon: QrCode, color: 'text-blue-500' },
                                { id: 'CRÉDITO', icon: Wallet, color: 'text-purple-500' },
                                { id: 'DÉBITO', icon: Wallet, color: 'text-indigo-500' },
                                { id: 'DINHEIRO', icon: DollarSign, color: 'text-emerald-500' },
                                { id: 'FIADO', icon: History, color: 'text-rose-500' },
                                { id: 'LINK', icon: ArrowUpRight, color: 'text-blue-400' },
                                { id: 'PARCELADO', icon: Clock, color: 'text-slate-400' },
                                { id: 'OUTROS', icon: Layers, color: 'text-slate-400' },
                              ].map(m => (
                                <button
                                  key={m.id}
                                  onClick={() => {
                                    setPaymentMethod(m.id);
                                    setShowPixQrCode(false);
                                    recalculateCartPrices(m.id, isSplitPayment, splitPayments);
                                  }}
                                  className={cn(
                                    "flex flex-col items-center justify-center p-6 rounded-[24px] border-2 transition-all gap-3 relative overflow-hidden group",
                                    paymentMethod === m.id 
                                      ? "border-rose-600 bg-rose-50 dark:bg-rose-900/20 text-rose-600" 
                                      : "border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 text-slate-400 hover:border-slate-200 shadow-sm"
                                  )}
                                >
                                  <div className={cn("p-3 rounded-2xl transition-all scale-110", paymentMethod === m.id ? "bg-rose-100 text-rose-600" : "bg-white dark:bg-slate-800")}>
                                     <m.icon size={24} />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-widest">{m.id}</span>
                                  {paymentMethod === m.id && (
                                    <div className="absolute top-3 right-3 flex gap-1">
                                      <div className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-ping" />
                                      <Check size={14} className="text-rose-600" />
                                    </div>
                                  )}
                                </button>
                              ))}
                           </div>
                         )}
                      </div>

                      {/* PIX SECTION */}
                      {paymentMethod === 'PIX' && !isSplitPayment && (
                         <motion.div 
                           initial={{ opacity: 0, scale: 0.95 }}
                           animate={{ opacity: 1, scale: 1 }}
                           className="p-10 bg-blue-50/50 dark:bg-blue-900/20 rounded-[48px] border border-blue-100 dark:border-blue-900/50 flex flex-col items-center gap-6 shadow-inner w-full max-w-lg mx-auto"
                         >
                            {!showPixQrCode ? (
                              <div className="text-center space-y-6 w-full">
                                <div className="p-4 bg-emerald-100 dark:bg-emerald-900/40 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle size={32} />
                                </div>
                                <div className="space-y-2">
                                  <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">Registrar Pagamento Pix</h4>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    O pagamento Pix é feito na maquininha física de cartões. O sistema apenas registrará para controle financeiro e fechamento de caixa.
                                  </p>
                                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-blue-100/50 dark:border-slate-700 shadow-sm inline-block mt-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Valor a Receber</span>
                                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{formatCurrency(totalCart - (discount || 0))}</span>
                                  </div>
                                </div>

                                <button 
                                  type="button"
                                  onClick={requestFinalizeConfirmation}
                                  className="w-full px-12 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[24px] font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-emerald-200 dark:shadow-none"
                                >
                                  Confirmar Pix e Finalizar Venda ✅
                                </button>

                                {settings.pixEnabled && settings.pixKey && (
                                  <button 
                                    type="button"
                                    onClick={() => setShowPixQrCode(true)}
                                    className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline flex items-center justify-center gap-1.5 mx-auto pt-2"
                                  >
                                    <QrCode size={14} /> Mostrar QR Code Pix Dinâmico
                                  </button>
                                )}
                              </div>
                            ) : (
                              <>
                                <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-blue-200/50 relative group">
                                    <QRCodeSVG 
                                      value={generatePixPayload(
                                        settings.pixKey || '', 
                                        settings.pixKeyType || 'CPF',
                                        totalCart - (discount || 0),
                                        settings.name || 'BIOBEL'
                                      )} 
                                      size={180}
                                      level="H"
                                    />
                                </div>
                                <div className="text-center space-y-3 w-full">
                                  <h4 className="text-lg font-black text-blue-900 dark:text-blue-200 uppercase tracking-tight font-display">Aguardando Pagamento</h4>
                                  <p className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em]">
                                    Valor a Receber: {formatCurrency(totalCart - (discount || 0))}
                                  </p>
                                  <div className="mt-6 flex flex-col items-center gap-3">
                                     <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 rounded-full border border-blue-100 shadow-sm">
                                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Confirme o recebimento no seu banco</span>
                                     </div>
                                     <button 
                                       type="button"
                                       onClick={requestFinalizeConfirmation}
                                       className="w-full px-12 py-5 bg-emerald-600 text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 dark:shadow-none"
                                     >
                                       Já recebi o PIX ✅
                                     </button>

                                     <button 
                                       type="button"
                                       onClick={() => setShowPixQrCode(false)}
                                       className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:underline pt-2"
                                     >
                                       Voltar para modo sem QR Code
                                     </button>
                                  </div>
                                </div>
                              </>
                            )}
                         </motion.div>
                      )}

                      {/* DINHEIRO SECTION */}
                      {paymentMethod === 'DINHEIRO' && !isSplitPayment && (
                         <motion.div 
                           initial={{ opacity: 0, scale: 0.95 }}
                           animate={{ opacity: 1, scale: 1 }}
                           className="p-8 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-[40px] border border-emerald-100 dark:border-emerald-900/50 flex flex-col gap-6 shadow-inner w-full max-w-xl mx-auto"
                         >
                            <div className="text-center space-y-4 w-full">
                              <div className="p-4 bg-emerald-100 dark:bg-emerald-900/40 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                                <DollarSign size={28} />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">Calculadora de Troco 💵</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Insira o valor pago pelo cliente para calcular o troco de forma rápida.
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-2">
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-left">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Total a Pagar</span>
                                  <span className="text-lg font-black text-slate-900 dark:text-white font-mono">{formatCurrency(totalCart - (discount || 0))}</span>
                                </div>
                                <div className="bg-emerald-500/10 dark:bg-emerald-500/5 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 text-left">
                                  <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-0.5">Troco</span>
                                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                    {formatCurrency(Math.max(0, parseFloat(cashReceived || '0') - (totalCart - (discount || 0))))}
                                  </span>
                                </div>
                              </div>

                              {/* Input for Amount Received */}
                              <div className="max-w-md mx-auto pt-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-left mb-2">Valor Recebido</label>
                                <div className="relative">
                                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">R$</span>
                                  <input 
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Ex: 50,00"
                                    value={cashReceived}
                                    onChange={(e) => {
                                      // Allow only numbers and comma/dot
                                      const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                                      setCashReceived(val);
                                    }}
                                    className="w-full py-4 pl-12 pr-6 bg-white dark:bg-slate-900 border-2 border-emerald-500/30 focus:border-emerald-500 rounded-[20px] text-lg font-black focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white font-mono shadow-sm"
                                  />
                                </div>
                              </div>

                              {/* Quick Cash Options */}
                              <div className="max-w-md mx-auto space-y-2 pt-2">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-left">Valores Rápidos</span>
                                <div className="flex flex-wrap gap-2 justify-start">
                                  {[
                                    totalCart - (discount || 0),
                                    ...[2, 5, 10, 20, 50, 100, 200].filter(b => b > (totalCart - (discount || 0))),
                                    Math.ceil((totalCart - (discount || 0)) / 10) * 10,
                                    Math.ceil((totalCart - (discount || 0)) / 50) * 50
                                  ].filter((v, idx, arr) => arr.indexOf(v) === idx && v >= (totalCart - (discount || 0)))
                                   .sort((a, b) => a - b)
                                   .slice(0, 5)
                                   .map((val) => (
                                     <button
                                       key={`quick-cash-${val}`}
                                       type="button"
                                       onClick={() => setCashReceived(val.toFixed(2))}
                                       className={cn(
                                         "px-4 py-2.5 rounded-xl border text-[10px] font-black tracking-wider transition-all",
                                         Math.abs(parseFloat(cashReceived || '0') - val) < 0.01
                                           ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                           : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-300"
                                       )}
                                     >
                                       {val === totalCart - (discount || 0) ? "Valor Exato" : formatCurrency(val)}
                                     </button>
                                   ))}
                                </div>
                              </div>
                            </div>
                         </motion.div>
                      )}

                      <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex gap-5">
                        <button 
                          onClick={prevStep}
                          className="flex-1 py-5.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-3xl font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-display border border-slate-200 dark:border-slate-700"
                        >
                          Voltar para Itens
                        </button>
                        <button 
                          onClick={requestFinalizeConfirmation}
                          className="flex-[2.5] py-5.5 bg-rose-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-200 dark:shadow-none hover:bg-rose-700 transition-all flex items-center justify-center gap-4 font-display"
                        >
                          FINALIZAR VENDA AGORA
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </>
            )}
          </div>

              {/* Order Summary Sidebar */}
              {currentStep < 5 && (
                <div className="w-full lg:w-80 shrink-0 sticky top-8 space-y-6">
                  <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
                      <ShoppingBagIcon size={18} className="text-blue-600" />
                      Resumo do Pedido
                    </h3>
                    
                    <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                      {cart.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-4 italic">Carrinho vazio</p>
                      ) : (
                        cart.map(item => (
                          <div key={item.productId} className="flex flex-col gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800/50 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1">
                                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase leading-tight">{item.name}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{formatCurrency(item.price)} cada</p>
                              </div>
                              <span className="text-[10px] font-black text-slate-900 dark:text-white">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-850 p-0.5 rounded-lg border border-slate-150 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.quantity > 1) {
                                      setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity - 1, total: (i.quantity - 1) * i.price } : i));
                                    } else {
                                      removeFromCart(item.productId);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                  <Minus size={10} />
                                </button>
                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 w-6 text-center">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const product = products.find(p => p.id === item.productId);
                                    const isKitOrCombo = product?.type === 'kit' || product?.type === 'combo';
                                    const isMontar = isKitOrCombo && (product?.kitMode === 'montar' || !product?.kitMode);
                                    if (product && !isMontar && product.stock <= item.quantity) {
                                      addNotification('Quantidade máxima em estoque atingida.', 'warning');
                                      return;
                                    }
                                    setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i));
                                  }}
                                  className="p-1 text-slate-400 hover:text-emerald-500 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.productId)}
                                className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
                                title="Remover do carrinho"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                        <span>Subtotal</span>
                        <span>{formatCurrency(totalCart)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-[10px] font-bold text-rose-500 uppercase">
                          <span>Desconto</span>
                          <span>-{formatCurrency(discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white uppercase pt-2">
                        <span>Total</span>
                        <span className="text-blue-600">{formatCurrency(totalCart - discount)}</span>
                      </div>
                    </div>

                    {selectedCustomer && (
                      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente</p>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center text-[10px] font-black">
                            {selectedCustomer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{selectedCustomer.name}</p>
                            <p className="text-slate-400 font-mono text-[9px]">{selectedCustomer.phone}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

          {activeTab === "products" && (
            <ProductsView
              products={products}
              sales={sales}
              setProducts={setProducts}
              brands={brands}
              productCategories={productCategories}
              setProductCategories={setProductCategories}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              formatCurrency={formatCurrency}
              ensureAuthSession={ensureAuthSession}
              stockBatches={stockBatches}
              setStockBatches={setStockBatches}
              settings={settings}
              setSettings={setSettings}
              financialAccounts={financialAccounts}
              setFinancialAccounts={setFinancialAccounts}
            />
          )}

          {activeTab === "brands" && (
            <BrandsView
              brands={brands}
              setBrands={setBrands}
              sales={sales}
              products={products}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              ensureAuthSession={ensureAuthSession}
            />
          )}

          {activeTab === "staff" && (
            <StaffView
              staff={staff}
              setStaff={setStaff}
              settings={settings}
              setSettings={setSettings}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              formatDate={formatDate}
              ensureAuthSession={ensureAuthSession}
              sales={sales}
              productCategories={productCategories}
              formatCurrency={formatCurrency}
            />
          )}

          {activeTab === "customers" && (
            <CustomersView
              customers={customers}
              setCustomers={setCustomers}
              sales={sales}
              products={products}
              campaigns={campaigns}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
              setSelectedCustomer={setSelectedCustomer}
              setActiveTab={setActiveTab}
              ensureAuthSession={ensureAuthSession}
            />
          )}

          {activeTab === "combos" && (
            <ProductsView
              products={products}
              sales={sales}
              setProducts={setProducts}
              brands={brands}
              productCategories={productCategories}
              setProductCategories={setProductCategories}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              formatCurrency={formatCurrency}
              ensureAuthSession={ensureAuthSession}
              stockBatches={stockBatches}
              setStockBatches={setStockBatches}
              settings={settings}
              setSettings={setSettings}
              financialAccounts={financialAccounts}
              setFinancialAccounts={setFinancialAccounts}
              typeFilter="combo"
            />
          )}

          {activeTab === "kits" && (
            <ProductsView
              products={products}
              sales={sales}
              setProducts={setProducts}
              brands={brands}
              productCategories={productCategories}
              setProductCategories={setProductCategories}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              formatCurrency={formatCurrency}
              ensureAuthSession={ensureAuthSession}
              stockBatches={stockBatches}
              setStockBatches={setStockBatches}
              settings={settings}
              setSettings={setSettings}
              financialAccounts={financialAccounts}
              setFinancialAccounts={setFinancialAccounts}
              typeFilter="kit"
            />
          )}

          {activeTab === "peks" && (
            <ProductsView
              products={products}
              sales={sales}
              setProducts={setProducts}
              brands={brands}
              productCategories={productCategories}
              setProductCategories={setProductCategories}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              formatCurrency={formatCurrency}
              ensureAuthSession={ensureAuthSession}
              stockBatches={stockBatches}
              setStockBatches={setStockBatches}
              settings={settings}
              setSettings={setSettings}
              financialAccounts={financialAccounts}
              setFinancialAccounts={setFinancialAccounts}
              typeFilter="pack"
            />
          )}

          {activeTab === "suppliers" && (
            <SuppliersView
              settings={settings}
              setSettings={setSettings}
              financialAccounts={financialAccounts}
              setFinancialAccounts={setFinancialAccounts}
              brands={brands}
              addNotification={addNotification}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          )}

          {activeTab === "sales" && (
            <SalesView
              sales={sales}
              setSales={setSales}
              customers={customers}
              setCustomers={setCustomers}
              products={products}
              setProducts={setProducts}
              cashierSessions={cashierSessions}
              setCashierSessions={setCashierSessions}
              currentCashierSession={currentCashierSession}
              setCurrentCashierSession={setCurrentCashierSession}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
              handleFirestoreError={handleFirestoreError}
              user={user}
              ensureAuthSession={ensureAuthSession}
              addNotification={addNotification}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              monthlyGoals={monthlyGoals}
              staff={staff}
              handleWhatsAppShare={handleWhatsAppShare}
              handlePrintReceipt={handlePrintReceipt}
              handleCopyText={handleCopyText}
              handleDownloadPDF={handleDownloadPDF}
              weatherObservations={weatherObservations}
              raffles={raffles}
              setRaffles={setRaffles}
              isCashierOpen={isCashierOpen}
              setCurrentView={setActiveTab}
            />
          )}

          {activeTab === "reports" && (
            <ReportsView
              sales={sales}
              staff={staff}
              products={products}
              formatCurrency={formatCurrency}
            />
          )}

          {activeTab === "dashboard" && (
            <DashboardView
              sales={sales}
              setSales={setSales}
              products={products}
              customers={customers}
              staff={staff}
              settings={settings}
              monthlyGoals={monthlyGoals}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              handleFirestoreError={handleFirestoreError}
              user={user}
              ensureAuthSession={ensureAuthSession}
              addNotification={addNotification}
              isCashierOpen={isCashierOpen}
              setActiveTab={setActiveTab}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              weatherObservations={weatherObservations}
              setWeatherObservations={setWeatherObservations}
              activeDashboardTab={activeDashboardTab}
              setActiveDashboardTab={setActiveDashboardTab}
              setCustomers={setCustomers}
              setProducts={setProducts}
              cashierSessions={cashierSessions}
              setCashierSessions={setCashierSessions}
              currentCashierSession={currentCashierSession}
              setCurrentCashierSession={setCurrentCashierSession}
              handleWhatsAppShare={handleWhatsAppShare}
              handlePrintReceipt={handlePrintReceipt}
              handleCopyText={handleCopyText}
              handleDownloadPDF={handleDownloadPDF}
              raffles={raffles}
              setRaffles={setRaffles}
              stockBatches={stockBatches}
              setStockBatches={setStockBatches}
            />
          )}

          {activeTab === "improvement" && (
            <ImprovementView />
          )}

          {activeTab === "costs" && (
            <FixedCostsView
              fixedCosts={fixedCosts}
              setFixedCosts={setFixedCosts}
              formatCurrency={formatCurrency}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              ensureAuthSession={ensureAuthSession}
            />
          )}

          {activeTab === "financial_accounts" && (
            <FinancialAccountsView
              financialAccounts={financialAccounts}
              setFinancialAccounts={setFinancialAccounts}
              formatCurrency={formatCurrency}
              addNotification={addNotification}
              settings={settings}
              formatDate={formatDate}
            />
          )}

          {activeTab === "cash_flow" && (
            <CashFlowView
              sales={sales}
              financialAccounts={financialAccounts}
              cashierSessions={cashierSessions}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          )}

          {activeTab === "cashier" && (
            <CashierView
              formatCurrency={formatCurrency}
              isCashierOpen={isCashierOpen}
              currentSession={currentCashierSession}
              sessions={cashierSessions}
              sales={sales}
              onOpenCashier={handleOpenCashier}
              onCloseCashier={handleCloseCashier}
              onAddWithdrawal={handleAddWithdrawal}
              formatDate={formatDate}
            />
          )}

          {activeTab.startsWith("fiscal_") && (
            <FiscalView
              formatCurrency={formatCurrency}
              addNotification={addNotification}
              activeSubTab={
                activeTab === "fiscal_cfop" ? "cfop" :
                activeTab === "fiscal_emissao" ? "emissao" :
                activeTab === "fiscal_observacoes" ? "observacoes" :
                activeTab === "fiscal_serie" ? "serie" :
                activeTab === "fiscal_ibpt" ? "ibpt" :
                activeTab === "fiscal_nfe" ? "nfe" : "cnae"
              }
            />
          )}

          {activeTab === "campaigns" && (
            <CampaignsView
              campaigns={campaigns}
              setCampaigns={setCampaigns}
              customers={customers}
              sales={sales}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              ensureAuthSession={ensureAuthSession}
              products={products}
              routines={routines}
              monthlyGoals={monthlyGoals}
              formatDate={formatDate}
            />
          )}

          {activeTab === "giveaways" && (
            <GiveawaysView
              giveaways={giveaways}
              setGiveaways={setGiveaways}
              customers={customers}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              ensureAuthSession={ensureAuthSession}
              sales={sales}
            />
          )}

          {activeTab === "raffles" && (
            <RafflesView
              raffles={raffles}
              setRaffles={setRaffles}
              customers={customers}
              staff={staff}
              addNotification={addNotification}
              formatCurrency={formatCurrency}
              user={user}
              sales={sales}
            />
          )}

          {activeTab === "manager_campaign" && (
            <IncentiveCampaignView
              sales={sales}
              products={products}
              brands={brands}
              setBrands={setBrands}
              staff={staff}
              formatCurrency={formatCurrency}
            />
          )}

          {activeTab === "performance" && (
            <PerformanceView
              sales={sales}
              staff={staff}
              formatCurrency={formatCurrency}
              monthlyGoals={monthlyGoals}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          )}

          {activeTab === "routine" && (
            <RoutineView
              routines={routines}
              setRoutines={setRoutines}
              staff={staff}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              formatDate={formatDate}
              ensureAuthSession={ensureAuthSession}
            />
          )}

          {activeTab === "agenda" && (
            <AgendaView
              agendaEvents={agendaEvents}
              setAgendaEvents={setAgendaEvents}
              addNotification={addNotification}
            />
          )}

          {activeTab === "admin_profile" && (
            <AdminProfileView
              settings={settings}
              setSettings={setSettings}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              setUser={setUser}
            />
          )}

          {activeTab === "goals" && (
            <MonthlyGoalsView
              monthlyGoals={monthlyGoals}
              setMonthlyGoals={setMonthlyGoals}
              staff={staff}
              formatCurrency={formatCurrency}
            />
          )}

          {activeTab === "config" && (
            <ConfigView
              settings={settings}
              setSettings={setSettings}
              addNotification={addNotification}
              setActiveDashboardTab={setActiveDashboardTab}
              setActiveTab={setActiveTab}
              driveToken={driveToken}
              setDriveToken={setDriveToken}
              isSyncingSheets={isSyncingSheets}
              isExportingSheets={isExportingSheets}
              handleSyncGoogleSheetsLive={handleSyncGoogleSheetsLive}
              handleExportToGoogleSheetsLive={handleExportToGoogleSheetsLive}
              handleConnectGoogleDrive={handleConnectGoogleDrive}
              isSignInDriveLoading={isSignInDriveLoading}
              googleUser={googleUser}
              sales={sales}
              formatCurrency={formatCurrency}
            />
          )}

          {activeTab === "backup" && (
            <BackupView
              sales={sales}
              setSales={setSales}
              products={products}
              setProducts={setProducts}
              customers={customers}
              setCustomers={setCustomers}
              brands={brands}
              setBrands={setBrands}
              productCategories={productCategories}
              setProductCategories={setProductCategories}
              fixedCosts={fixedCosts}
              setFixedCosts={setFixedCosts}
              financialAccounts={financialAccounts}
              setFinancialAccounts={setFinancialAccounts}
              monthlyGoals={monthlyGoals}
              setMonthlyGoals={setMonthlyGoals}
              settings={settings}
              setSettings={setSettings}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              driveToken={driveToken}
              setDriveToken={setDriveToken}
              isSyncingSheets={isSyncingSheets}
              setIsSyncingSheets={setIsSyncingSheets}
              handleSyncGoogleSheetsLive={handleSyncGoogleSheetsLive}
              setSelectedMonth={setSelectedMonth}
              cloudSyncEnabled={cloudSyncEnabled}
              cloudSyncing={cloudSyncing}
              storeId={storeId}
              setStoreId={setStoreId}
              lastCloudSyncTime={lastCloudSyncTime}
              enableCloudSync={enableCloudSync}
              disableCloudSync={disableCloudSync}
            />
          )}

          {activeTab === "help" && (
            <HelpView />
          )}

        </div>
      </main>
    </div>
  );
}
