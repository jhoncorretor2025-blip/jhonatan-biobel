import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  auth, db, signInAnonymously, signOut, onAuthStateChanged 
} from './firebase';
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, 
  onSnapshot, query, orderBy, increment, writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { 
  Store, RefreshCw, CheckCircle2, AlertCircle, Info, X, 
  AlertTriangle, Calendar, UserCircle, ShoppingCart, 
  History, Wallet, Package, Target, LayoutDashboard, 
  ClipboardList, User as UserIcon, Sparkles, ReceiptText, Settings, 
  Database, LogOut, Search, Plus, Trash2, Edit2, 
  ChevronRight, ChevronLeft, Download, Upload, Filter, Layers, Box, PlusCircle,
  ArrowUpRight, ArrowDownRight, TrendingUp, Users,
  DollarSign, ShoppingBag, Clock, MoreVertical,
  Menu, Bell, Moon, Sun, Laptop, QrCode, Disc, FileText, FileBarChart, FileSpreadsheet,
  BarChart3, Check, MessageCircle, CheckCircle, ClipboardList as ClipboardListIcon, ShoppingBag as ShoppingBagIcon, Package as PackageIcon, Trash2 as Trash2Icon, X as XIcon, Plus as PlusIcon, Search as SearchIcon, Wallet as WalletIcon,
  Megaphone, Send, Zap, Trophy, Eye, Tag, Gift, MapPin, Pencil, Star, StickyNote,
  Coffee, Instagram, Smartphone, LayoutGrid, BookOpen, Heart, Camera, MessageSquare, Mail, Palette, Printer, Lock, Unlock, PackageCheck
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

// --- Utilities ---
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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

const getWhatsAppUrl = (phone: string, text?: string) => {
  let cleaned = phone.replace(/\D/g, '');
  
  // If number is just the local part (8 or 9 digits), add default DDD 51
  if (cleaned.length === 8 || cleaned.length === 9) {
    cleaned = '51' + cleaned;
  }
  
  // If it's a Brazilian number (10 or 11 digits) without the country code, add 55
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  return `https://wa.me/${cleaned}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

// Helper to clean objects for Firestore (removes undefined)
function cleanData(obj: any): any {
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

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
}

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  // Formato: (51) 9-8524-2850
  return numbers.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, "($1) $2-$3-$4").substring(0, 16);
};

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
  type: 'avulso' | 'combo' | 'kit';
  comboItems?: { productId: string; quantity: number }[];
  isFavorite?: boolean;
  status?: 'active' | 'inactive' | 'discontinued';
  createdAt?: string;
}

interface Staff {
  id: string;
  name: string;
  role: 'Estagiária' | 'CLT' | 'Dona';
  startDate: string;
  phone: string;
  commission?: number; // % commission
  goal?: number; // Monthly goal
  activities?: string[]; 
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
  adminPassword?: string;
  adminPhoto?: string;
  pixKey?: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM';
  pixEnabled?: boolean;
  receiptConfig?: {
    showLogo: boolean;
    showAddress: boolean;
    showPhone: boolean;
    showInstagram: boolean;
    showDiscount: boolean;
    showSeller: boolean;
    customMessage: string;
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
  notes?: string;
  points?: number;
  debt?: number;
  tier?: 'BRONZE' | 'PRATA' | 'OURO';
  tags?: string[];
  createdAt: string;
}

interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
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
  staffGoals: {
    [staffName: string]: {
      monthlyGoal: number;
      commission: number;
    }
  };
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
  typeFilter?: 'avulso' | 'combo' | 'kit';
  ensureAuthSession: () => Promise<boolean>;
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
  monthlyGoals: MonthlyGoal[];
  setMonthlyGoals: React.Dispatch<React.SetStateAction<MonthlyGoal[]>>;
  productCategories: Category[];
  setProductCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  addNotification: (message: string, type?: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
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
  formatDate: (date: string) => string;
  formatCurrency: (value: number) => string;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  ensureAuthSession: () => Promise<boolean>;
  addNotification: (message: string, type: Notification['type']) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  monthlyGoals: any[];
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
const MonthlyGoalsView = ({ monthlyGoals, setMonthlyGoals, staff, formatCurrency }: any) => {
  const currentGoal = monthlyGoals[0]; // For simplicity, use the first one
  const [holidayDate, setHolidayDate] = useState('');

  const updateGoal = (field: string, value: any) => {
    setMonthlyGoals(monthlyGoals.map((g: any) => 
      g.id === currentGoal.id ? { ...g, [field]: value } : g
    ));
  };

  const addHoliday = () => {
    if (!holidayDate) return;
    if (currentGoal.holidays.includes(holidayDate)) return;
    updateGoal('holidays', [...currentGoal.holidays, holidayDate]);
    setHolidayDate('');
  };

  const removeHoliday = (date: string) => {
    updateGoal('holidays', currentGoal.holidays.filter((h: string) => h !== date));
  };

  const updateStaffGoal = (staffName: string, field: string, value: any) => {
    setMonthlyGoals(monthlyGoals.map((g: any) => 
      g.id === currentGoal.id ? { 
        ...g, 
        staffGoals: { 
          ...g.staffGoals, 
          [staffName]: { ...g.staffGoals[staffName], [field]: value } 
        } 
      } : g
    ));
  };

  const totalStaffGoals = Object.values(currentGoal.staffGoals).reduce((acc: number, g: any) => acc + Number(g.monthlyGoal), 0);
  
  // Calculate effective working days (subtracting holidays)
  // Standard working days are 22 (Mon-Fri). If a holiday is added, it should reduce this count.
  const baseWorkingDays = 22;
  const effectiveWorkingDays = Math.max(1, baseWorkingDays - currentGoal.holidays.length);

  // Calculate daily goal (Seg-Sex)
  // We subtract the total Saturday goals from the store goal first
  const totalSaturdayGoal = currentGoal.saturdayGoal * 4;
  const remainingGoal = Math.max(0, currentGoal.storeGoal - totalSaturdayGoal);
  const dailyGoal = remainingGoal / effectiveWorkingDays;
  const weeklyGoal = dailyGoal * 5;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase transition-colors">Metas e Planejamento</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planejamento mensal de vendas Biobel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Store Goal */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-10 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Meta Geral da Loja</h3>
              </div>
              <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
                <button className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Simples</button>
                <button className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-lg shadow-sm border border-blue-100 dark:border-blue-900/30">Avançado</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês de Referência</label>
                <div className="relative">
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    value={currentGoal.month}
                    readOnly
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white uppercase transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta de Vendas da Loja (R$)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">R$</span>
                  <input 
                    type="number" 
                    value={currentGoal.storeGoal}
                    onChange={(e) => updateGoal('storeGoal', Number(e.target.value))}
                    className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bonificação Extra Loja</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={currentGoal.extraBonus}
                    onChange={(e) => updateGoal('extraBonus', Number(e.target.value))}
                    className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white transition-colors"
                  />
                  <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button className="px-3 py-1 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-700 rounded-lg shadow-sm">%</button>
                    <button className="px-3 py-1 text-[10px] font-black text-slate-400">R$</button>
                  </div>
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bônus para vendedoras se a meta da loja for batida</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dias Úteis (Seg-Sex)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="number" 
                    value={currentGoal.workingDays}
                    onChange={(e) => updateGoal('workingDays', Number(e.target.value))}
                    className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white transition-colors"
                  />
                  <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efetivos</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{effectiveWorkingDays} dias</p>
                  </div>
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total de dias Seg-Sex no mês (Holidays serão subtraídos)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-500">
                  <Calendar size={18} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Feriados e Bloqueios</h4>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-900 dark:text-white transition-colors" 
                  />
                  <button 
                    onClick={addHoliday}
                    className="p-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentGoal.holidays.map((h: string) => (
                    <div key={h} className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30 rounded-lg text-[10px] font-black flex items-center gap-2">
                      {new Date(h + 'T00:00:00').toLocaleDateString('pt-BR')}
                      <X 
                        size={12} 
                        className="cursor-pointer hover:text-rose-500 transition-colors" 
                        onClick={() => removeHoliday(h)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-500">
                  <Clock size={18} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Carga Horária</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seg-Sex (Horas)</label>
                    <input 
                      type="number" 
                      value={currentGoal.workHoursWeekday}
                      onChange={(e) => updateGoal('workHoursWeekday', Number(e.target.value))}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sábado (Horas)</label>
                    <input 
                      type="number" 
                      value={currentGoal.workHoursSaturday}
                      onChange={(e) => updateGoal('workHoursSaturday', Number(e.target.value))}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="p-8 bg-blue-50 dark:bg-blue-900/20 rounded-[32px] border border-blue-100 dark:border-blue-900/30 space-y-2">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <TrendingUp size={16} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Meta Diária (Seg-Sex)</p>
                </div>
                <h4 className="text-3xl font-black text-blue-700 dark:text-blue-300">{formatCurrency(dailyGoal)}</h4>
                <p className="text-[9px] font-black text-blue-400 dark:text-blue-500 uppercase tracking-widest">Total Semanal: {formatCurrency(weeklyGoal)}</p>
              </div>
              <div className="p-8 bg-orange-50 dark:bg-orange-900/20 rounded-[32px] border border-orange-100 dark:border-orange-900/30 space-y-2">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <Target size={16} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Meta de Sábado</p>
                </div>
                <div className="relative">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-orange-400 font-black text-xl">R$</span>
                  <input 
                    type="number"
                    value={currentGoal.saturdayGoal}
                    onChange={(e) => updateGoal('saturdayGoal', Number(e.target.value))}
                    className="w-full bg-transparent border-none p-0 pl-8 text-3xl font-black text-orange-700 dark:text-orange-300 focus:outline-none"
                  />
                </div>
                <p className="text-[9px] font-black text-orange-400 dark:text-orange-500 uppercase tracking-widest">4 Sábados no mês (Total {formatCurrency(currentGoal.saturdayGoal * 4)})</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Individual Goals */}
        <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full transition-colors">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Metas Individuais</h3>
          </div>

          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Ajuste a meta de cada vendedora para este mês</p>

          <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
            {staff.map((s: Staff) => (
              <div key={s.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{s.name}</h4>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendedora</span>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Meta Mensal</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">R$</span>
                      <input 
                        type="number" 
                        value={currentGoal.staffGoals[s.name]?.monthlyGoal || 0}
                        onChange={(e) => updateStaffGoal(s.name, 'monthlyGoal', Number(e.target.value))}
                        className="w-full p-3 pl-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-900 dark:text-white transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Comissão Padrão</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={currentGoal.staffGoals[s.name]?.commission || 3}
                        onChange={(e) => updateStaffGoal(s.name, 'commission', Number(e.target.value))}
                        className="flex-1 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-900 dark:text-white transition-colors"
                      />
                      <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button className="px-2 py-1 text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg shadow-sm">%</button>
                        <button className="px-2 py-1 text-[9px] font-black text-slate-400">R$</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Soma das Metas:</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(totalStaffGoals)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PerformanceView = ({ sales, staff, formatCurrency, monthlyGoals, selectedMonth, setSelectedMonth }: any) => {
  const [selectedStaff, setSelectedStaff] = useState(staff[0]?.name || 'ALESSANDRA');

  // Month-to-date sales data for ranking
  const salesRankingData = useMemo(() => {
    const currentMonthStr = selectedMonth; 
    // Filter sales that match the selectedMonth string (e.g. 'maio de 2026')
    const ranking: { [name: string]: number } = {};
    staff.forEach((s: any) => ranking[s.name] = 0);
    
    sales.forEach(sale => {
      const saleMonth = new Date(sale.date).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      if (saleMonth === currentMonthStr && sale.vendedora) {
        ranking[sale.vendedora] = (ranking[sale.vendedora] || 0) + sale.total;
      }
    });

    return Object.entries(ranking)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [sales, staff, selectedMonth]);

  const currentGoal = useMemo(() => monthlyGoals.find((g: any) => g.month === selectedMonth) || monthlyGoals[0], [monthlyGoals, selectedMonth]);

  const staffSales = useMemo(() => {
    return sales.filter(s => {
      const saleMonth = new Date(s.date).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      return s.vendedora === selectedStaff && saleMonth === selectedMonth;
    });
  }, [sales, selectedStaff, selectedMonth]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const salesToday = useMemo(() => 
    staffSales.filter(s => new Date(s.date) >= today).reduce((acc, s) => acc + s.total, 0)
  , [staffSales, today]);

  const totalCommission = useMemo(() => 
    staffSales.reduce((acc, s) => acc + (s.commission || 0), 0)
  , [staffSales]);
  
  const staffSalesTotal = useMemo(() => staffSales.reduce((acc, s) => acc + s.total, 0), [staffSales]);

  const ticketMedio = useMemo(() => 
    staffSales.length > 0 ? staffSalesTotal / staffSales.length : 0
  , [staffSales, staffSalesTotal]);

  const individualGoal = currentGoal?.staffGoals?.[selectedStaff]?.monthlyGoal || 0;
  const progressPercent = individualGoal > 0 ? (staffSalesTotal / individualGoal) * 100 : 0;

  const salesThisMonth = staffSales.length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase transition-colors">Meu Desempenho</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acompanhe suas vendas e comissões</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400" size={16} />
            <select 
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[160px] transition-colors"
            >
              <option value="ALESANDRA">Alessandra</option>
              <option value="LETICIA">Leticia</option>
              <option value="ESTAGIÁRIA">Estagiária</option>
            </select>
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[160px] transition-colors"
            >
              <option key={selectedMonth} value={selectedMonth}>{selectedMonth}</option>
              {monthlyGoals.filter(g => g.month !== selectedMonth).map(g => (
                <option key={g.id} value={g.month}>{g.month}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ranking Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Ranking de Vendas do Mês</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comparativo de faturamento entre vendedoras</p>
          </div>
          <Trophy size={32} className="text-amber-500" />
        </div>
                <div className="h-[300px] w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesRankingData} layout="vertical" margin={{ left: 40, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={{ fontSize: 10, fontWeight: 900, fill: '#64748B' }} 
                width={80}
              />
              <RechartsTooltip 
                cursor={{ fill: '#F1F5F9' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [formatCurrency(value), 'Total']}
              />
              <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                {salesRankingData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? '#3B82F6' : index === 1 ? '#60A5FA' : '#93C5FD'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-500 dark:from-brand-700 dark:to-brand-600 rounded-[32px] p-10 text-white shadow-xl shadow-brand-100 dark:shadow-none relative overflow-hidden transition-all">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Sparkles size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight uppercase">Olá, {selectedStaff}!</h2>
              <p className="text-brand-50 text-sm font-medium mt-1">Cada venda conta! Foque no ticket médio para acelerar seu progresso.</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 flex items-center gap-4 min-w-[240px]">
            <div className="w-12 h-12 bg-white text-brand-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Target size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-50">Nível Atual</p>
              <p className="text-xl font-black uppercase tracking-tight">Iniciante</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          { [
            { label: 'Vendas Mês', value: formatCurrency(staffSalesTotal), sub: `HOJE: ${formatCurrency(salesToday)}`, icon: TrendingUp, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-900/20' },
            { label: 'Comissão Mês', value: formatCurrency(totalCommission), sub: `META: ${formatCurrency(individualGoal)}`, icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Ticket Médio', value: formatCurrency(ticketMedio), sub: `${staffSales.length} VENDAS NO MÊS`, icon: ShoppingCart, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Meta Individual', value: `${progressPercent.toFixed(1)}%`, sub: `${formatCurrency(staffSalesTotal)} / ${formatCurrency(individualGoal)}`, icon: Target, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          ].map((metric) => (
          <div key={metric.label} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", metric.bg, metric.color)}>
              <metric.icon size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{metric.label}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{metric.value}</p>
              <p className={cn("text-[10px] font-black uppercase tracking-widest", metric.color)}>{metric.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Goal Progress Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 transition-colors">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Progresso da Meta</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Meta não definida para este período.</p>
          </div>
          <div className="flex gap-8">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Meta</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">R$ 0</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atingido</p>
              <p className="text-lg font-black text-emerald-500 dark:text-emerald-400">R$ 404</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faltam</p>
              <p className="text-lg font-black text-rose-500 dark:text-rose-400">R$ 0</p>
            </div>
          </div>
        </div>
        <div className="relative h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-rose-500 w-[5%] flex items-center justify-center text-white text-[10px] font-black">
            0%
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 transition-colors">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Próximo Nível de Comissão</h3>
            <Zap size={24} className="text-blue-400" />
          </div>
          <div className="p-12 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
              <Trophy size={32} />
            </div>
            <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Nível Máximo Atingido!</h4>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 transition-colors">
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Meta da Loja</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso Geral</p>
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">0.0%</p>
              </div>
              <div className="h-2 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-0" />
              </div>
            </div>
            <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Bônus Coletivo</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Atingir meta para liberar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GiveawaysView = ({ giveaways, setGiveaways, customers, addNotification, handleFirestoreError, user, ensureAuthSession }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGiveaway, setEditingGiveaway] = useState<Giveaway | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', date: '' });

  const handleOpenModal = (giveaway?: Giveaway) => {
    if (giveaway) {
      setEditingGiveaway(giveaway);
      setFormData({ name: giveaway.name, description: giveaway.description, date: giveaway.date });
    } else {
      setEditingGiveaway(null);
      setFormData({ name: '', description: '', date: '' });
    }
    setIsModalOpen(true);
  };

  const saveGiveaway = async () => {
    if (!formData.name || !formData.date) {
      addNotification('Preencha o nome e a data.', 'error');
      return;
    }

    const giveawayData: Giveaway = {
      id: editingGiveaway?.id || Math.random().toString(36).substr(2, 9),
      name: formData.name,
      description: formData.description,
      date: formData.date,
      status: editingGiveaway?.status || 'pending',
      participants: editingGiveaway?.participants || [],
      winnerId: editingGiveaway?.winnerId,
      winnerName: editingGiveaway?.winnerName
    };

    try {
      if (editingGiveaway) {
        setGiveaways(giveaways.map((g: Giveaway) => g.id === giveawayData.id ? giveawayData : g));
      } else {
        setGiveaways([...giveaways, giveawayData]);
      }
      addNotification(editingGiveaway ? 'Sorteio atualizado!' : 'Sorteio criado!', 'success');
      setIsModalOpen(false);
    } catch (error: any) {
      addNotification('Erro ao salvar sorteio.', 'error');
    }
  };

  const drawWinner = async (giveaway: Giveaway) => {
    if (giveaway.status === 'completed') {
      addNotification('Este sorteio já foi realizado.', 'error');
      return;
    }

    // For demo purposes, we'll pick from all customers if participants list is empty
    const pool = giveaway.participants.length > 0 ? giveaway.participants : customers.map((c: any) => c.id);
    
    if (pool.length === 0) {
      addNotification('Nenhum participante encontrado.', 'error');
      return;
    }

    const winnerId = pool[Math.floor(Math.random() * pool.length)];
    const winner = customers.find((c: any) => c.id === winnerId);

    const updatedGiveaway: Giveaway = {
      ...giveaway,
      status: 'completed',
      winnerId: winnerId,
      winnerName: winner?.name || 'Desconhecido'
    };

    try {
      setGiveaways(giveaways.map((g: Giveaway) => g.id === giveaway.id ? updatedGiveaway : g));
      addNotification(`Vencedor(a) sorteado(a): ${updatedGiveaway.winnerName}!`, 'success');
    } catch (error: any) {
      addNotification('Erro ao realizar sorteio.', 'error');
    }
  };

  const removeGiveaway = async (id: string) => {
    if (!window.confirm('Excluir este sorteio?')) return;
    try {
      setGiveaways(giveaways.filter((g: Giveaway) => g.id !== id));
      addNotification('Sorteio removido.', 'info');
    } catch (error: any) {
      addNotification('Erro ao remover sorteio.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sorteios</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engajamento e Fidelização</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          Novo Sorteio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {giveaways.map((g: Giveaway) => (
          <div key={g.id} className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden group">
            <div className="p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div className={cn(
                  "p-4 rounded-2xl shadow-lg",
                  g.status === 'completed' ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"
                )}>
                  <Gift size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleOpenModal(g)} className="p-2 text-slate-300 hover:text-blue-600 transition-all"><Settings size={18} /></button>
                  <button onClick={() => removeGiveaway(g.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={18} /></button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{g.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{g.description}</p>
              </div>

              <div className="flex items-center gap-4 py-4 border-y border-slate-50 dark:border-slate-800">
                <div className="flex-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data do Sorteio</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{new Date(g.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex-1 text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                    g.status === 'completed' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {g.status === 'completed' ? 'Realizado' : 'Pendente'}
                  </span>
                </div>
              </div>

              {g.status === 'completed' ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Vencedor(a)</p>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase">{g.winnerName}</p>
                </div>
              ) : (
                <button 
                  onClick={() => drawWinner(g)}
                  className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-lg shadow-slate-200 dark:shadow-none"
                >
                  Realizar Sorteio
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {editingGiveaway ? 'Editar Sorteio' : 'Novo Sorteio'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Sorteio</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                    placeholder="Ex: Sorteio de Natal"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição / Prêmio</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white h-24"
                    placeholder="Descreva o prêmio e as regras..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data do Sorteio</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={saveGiveaway}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                  >
                    {editingGiveaway ? 'Salvar' : 'Adicionar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ReportsView = ({ sales, staff, products, formatCurrency }: { sales: Sale[], staff: Staff[], products: Product[], formatCurrency: (v: number) => string }) => {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredSales = sales.filter(sale => {
    const saleDate = sale.date.split('T')[0];
    const matchesDate = saleDate >= startDate && saleDate <= endDate;
    const matchesStaff = selectedStaff === 'all' || sale.vendedora === selectedStaff;
    const matchesCategory = selectedCategory === 'all' || sale.items.some(item => {
      const product = products.find(p => p.id === item.productId);
      return product?.category === selectedCategory;
    });
    return matchesDate && matchesStaff && matchesCategory;
  });

  const categories = Array.from(new Set(products.map(p => p.category)));

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Relatório de Vendas - Biobel', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Período: ${new Date(startDate).toLocaleDateString()} até ${new Date(endDate).toLocaleDateString()}`, 105, 22, { align: 'center' });
    
    const tableData = filteredSales.map(sale => [
      new Date(sale.date).toLocaleDateString(),
      sale.customerName,
      sale.vendedora,
      sale.paymentMethod,
      formatCurrency(sale.total)
    ]);

    (doc as any).autoTable({
      startY: 30,
      head: [['Data', 'Cliente', 'Vendedora', 'Pagamento', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    const total = filteredSales.reduce((acc, s) => acc + s.total, 0);
    doc.text(`Total do Período: ${formatCurrency(total)}`, 140, (doc as any).lastAutoTable.finalY + 10);
    
    doc.save(`relatorio_vendas_${startDate}_${endDate}.pdf`);
  };

  const generateExcel = () => {
    const data = filteredSales.map(sale => ({
      Data: new Date(sale.date).toLocaleDateString(),
      Cliente: sale.customerName,
      Vendedora: sale.vendedora,
      Pagamento: sale.paymentMethod,
      Total: sale.total,
      Desconto: sale.discount,
      Comissao: sale.commission || 0,
      Itens: sale.items.map(i => `${i.name} (${i.quantity})`).join(', ')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, `relatorio_vendas_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Relatórios de Vendas</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gere relatórios detalhados em PDF ou Excel</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={generateExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
          >
            <FileText size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Inicial</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Final</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendedora</label>
          <select 
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
          >
            <option value="all">Todas</option>
            {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
          >
            <option value="all">Todas</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Prévia dos Resultados</h3>
          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase">
            {filteredSales.length} Vendas Encontradas
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendedora</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-400">{new Date(sale.date).toLocaleDateString()}</td>
                  <td className="p-4 text-xs font-black text-slate-900 dark:text-white uppercase">{sale.customerName}</td>
                  <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-400">{sale.vendedora}</td>
                  <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-400">{sale.paymentMethod}</td>
                  <td className="p-4 text-xs font-black text-blue-600 text-right">{formatCurrency(sale.total)}</td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Search size={32} className="opacity-20" />
                      <p className="text-xs font-black uppercase tracking-widest">Nenhuma venda encontrada para os filtros selecionados</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {filteredSales.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                  <td colSpan={4} className="p-4 text-[10px] text-slate-400 uppercase tracking-widest text-right">Total Acumulado:</td>
                  <td className="p-4 text-sm text-blue-600 text-right">{formatCurrency(filteredSales.reduce((acc, s) => acc + s.total, 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ 
  sales, 
  setSales,
  products, 
  customers, 
  staff, 
  settings, 
  monthlyGoals, 
  formatCurrency, 
  formatDate,
  handleFirestoreError,
  user,
  ensureAuthSession,
  addNotification,
  isCashierOpen,
  setActiveTab,
  selectedMonth,
  setSelectedMonth
}: DashboardViewProps) => {
  const inactiveProducts = useMemo(() => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    return products.filter(p => {
      const lastSold = p.lastSoldAt ? new Date(p.lastSoldAt) : new Date(p.createdAt || Date.now());
      return lastSold < sixtyDaysAgo && p.stock > 0;
    });
  }, [products]);

  const getCustomerTier = (totalSpent: number) => {
    if (totalSpent >= 2000) return { label: 'OURO', color: 'text-amber-500', bg: 'bg-amber-50', icon: <Trophy size={12} /> };
    if (totalSpent >= 800) return { label: 'PRATA', color: 'text-slate-400', bg: 'bg-slate-50', icon: <Star size={12} /> };
    return { label: 'BRONZE', color: 'text-orange-600', bg: 'bg-orange-50', icon: <Target size={12} /> };
  };

  const getCustomerStats = (customerId: string) => {
    const customerSales = sales.filter(s => s.customerId === customerId && s.status === 'completed');
    const totalSpent = customerSales.reduce((acc, s) => acc + s.total, 0);
    const purchaseCount = customerSales.length;
    const lastSale = customerSales.length > 0 
      ? new Date(Math.max(...customerSales.map(s => new Date(s.date).getTime())))
      : null;
    return { totalSpent, purchaseCount, lastSale };
  };

  const [activeDashboardTab, setActiveDashboardTab] = useState<'geral' | 'marcas_produtos' | 'financeiro' | 'clientes' | 'historico' | 'crm' | 'estoque_parado' | 'inteligencia'>('geral');

  const inventoryAlerts = useMemo(() => {
    const lowStock = products.filter(p => (p.stock <= (p.minStock || 5)) && p.status === 'active');
    const expiringSoon = products.filter(p => {
      if (!p.expiryDate) return false;
      const expiry = new Date(p.expiryDate);
      const today = new Date();
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30;
    });
    const stagnant = products.filter(p => {
      const pSales = sales.filter(s => s.items.some(i => i.productId === p.id));
      if (pSales.length === 0) return true;
      const lastSaleDate = new Date(Math.max(...pSales.map(s => new Date(s.date).getTime())));
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return lastSaleDate < thirtyDaysAgo;
    });
    return { lowStock, expiringSoon, stagnant };
  }, [products, sales]);

  const dashboardMetrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayStr = now.toISOString().split('T')[0];
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    let todaySales = 0;
    let weekSales = 0;
    let thisMonthSales = 0;
    let lastMonthSales = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    let thisMonthProfit = 0;
    let monthlySalesCount = 0;
    
    const customerSalesCount: { [key: string]: number } = {};
    const customerSaleDates: { [key: string]: number[] } = {};
    const productSales: { [key: string]: { name: string, quantity: number, total: number } } = {};
    const brandSales: { [key: string]: number } = {};
    const methodBreakdown: { [key: string]: number } = { 'DINHEIRO': 0, 'PIX': 0, 'CRÉDITO': 0, 'DÉBITO': 0, 'OUTROS': 0 };
    const dayTotals: { [key: string]: number } = { 'Segunda': 0, 'Terça': 0, 'Quarta': 0, 'Quinta': 0, 'Sexta': 0, 'Sábado': 0, 'Domingo': 0 };
    const daysMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const categoryTotals: { [key: string]: number } = {};
    const staffTotals: { [key: string]: { total: number, count: number, commission: number } } = {};

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const trend = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, total: 0 }));

    const currentGoal = monthlyGoals.find(g => {
      const [year, month] = g.id.split('-').map(Number);
      return month === now.getMonth() + 1 && year === now.getFullYear();
    });

    sales.forEach(s => {
      const saleDate = new Date(s.date);
      const isThisMonth = saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
      const isLastMonth = saleDate.getMonth() === lastMonth && saleDate.getFullYear() === lastMonthYear;
      const isToday = s.date.startsWith(todayStr);
      const isThisWeek = saleDate >= startOfWeek;

      totalRevenue += s.total;
      
      const saleCost = s.items.reduce((acc, item) => {
        const product = products.find(p => p.id === item.productId);
        return acc + ((product?.cost || 0) * item.quantity);
      }, 0);
      
      const saleProfit = s.total - saleCost;
      totalProfit += saleProfit;

      if (isToday) todaySales += s.total;
      if (isThisWeek) weekSales += s.total;
      
      if (isThisMonth) {
        thisMonthSales += s.total;
        thisMonthProfit += saleProfit;
        monthlySalesCount++;
        trend[saleDate.getDate() - 1].total += s.total;
        
        const dayName = daysMap[saleDate.getDay()];
        dayTotals[dayName] += s.total;

        const category = s.category || 'VENDA À VISTA';
        categoryTotals[category] = (categoryTotals[category] || 0) + s.total;

        const staffName = s.vendedora || 'Não Informado';
        if (!staffTotals[staffName]) staffTotals[staffName] = { total: 0, count: 0, commission: 0 };
        staffTotals[staffName].total += s.total;
        staffTotals[staffName].count += 1;
        const rate = currentGoal?.staffGoals[staffName]?.commission || 3;
        staffTotals[staffName].commission += (s.total * (rate / 100));
      }

      if (isLastMonth) lastMonthSales += s.total;

      if (s.customerId) {
        customerSalesCount[s.customerId] = (customerSalesCount[s.customerId] || 0) + 1;
        if (!customerSaleDates[s.customerId]) customerSaleDates[s.customerId] = [];
        customerSaleDates[s.customerId].push(saleDate.getTime());
      }

      s.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.name, quantity: 0, total: 0 };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].total += item.total;

        const product = products.find(p => p.id === item.productId);
        const brand = product?.brand || 'Outros';
        brandSales[brand] = (brandSales[brand] || 0) + item.total;
      });

      const method = (s.paymentMethod || 'OUTROS').toUpperCase();
      if (methodBreakdown.hasOwnProperty(method)) methodBreakdown[method] += s.total;
      else methodBreakdown['OUTROS'] += s.total;
    });

    const monthlyGoalValue = currentGoal?.storeGoal || 0;
    const calculatePercent = (reached: number, goal: number) => goal > 0 ? Math.min(Math.round((reached / goal) * 100), 100) : 0;

    const totalCustomersWithSales = Object.keys(customerSalesCount).length;
    const recurringCustomers = Object.values(customerSalesCount).filter(count => count > 1).length;
    
    let totalIntervals = 0;
    let intervalCount = 0;
    Object.values(customerSaleDates).forEach(dates => {
      if (dates.length > 1) {
        dates.sort((a, b) => a - b);
        for (let i = 1; i < dates.length; i++) {
          totalIntervals += (dates[i] - dates[i-1]);
          intervalCount++;
        }
      }
    });

    const bestSeller = Object.entries(staffTotals).sort((a,b) => b[1].total - a[1].total)[0];
    const bestProduct = Object.values(productSales).sort((a,b) => b.quantity - a.quantity)[0];

    return {
      goalStats: {
        daily: { reached: todaySales, goal: monthlyGoalValue / 22, percent: calculatePercent(todaySales, monthlyGoalValue / 22) },
        weekly: { reached: weekSales, goal: monthlyGoalValue / 4, percent: calculatePercent(weekSales, monthlyGoalValue / 4) },
        monthly: { reached: thisMonthSales, goal: monthlyGoalValue, percent: calculatePercent(thisMonthSales, monthlyGoalValue) }
      },
      advancedStats: {
        growth: lastMonthSales > 0 ? ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100 : 0,
        repurchaseRate: totalCustomersWithSales > 0 ? (recurringCustomers / totalCustomersWithSales) * 100 : 0,
        avgTicketPerCustomer: totalCustomersWithSales > 0 ? totalRevenue / totalCustomersWithSales : 0,
        avgReturnDays: intervalCount > 0 ? Math.round(totalIntervals / (intervalCount * 1000 * 60 * 60 * 24)) : 0,
        totalRevenue,
        totalProfit,
        margin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        avgTicket: monthlySalesCount > 0 ? thisMonthSales / monthlySalesCount : 0,
        topSeller: bestSeller ? { name: bestSeller[0], total: bestSeller[1].total } : null,
        topProduct: bestProduct ? { name: bestProduct.name, quantity: bestProduct.quantity } : null
      },
      topProducts: Object.values(productSales).sort((a, b) => b.quantity - a.quantity).slice(0, 5),
      topBrands: Object.entries(brandSales).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5),
      financial: { 
        breakdown: methodBreakdown, 
        bestDay: Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0] || ['-', 0] 
      },
      staff: Object.entries(staffTotals).sort((a, b) => b[1].total - a[1].total).map(([name, data]) => ({ name, ...data })),
      dayTrends: Object.entries(dayTotals).sort((a, b) => b[1] - a[1]),
      categoryTrends: Object.entries(categoryTotals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      trend
    };
  }, [sales, products, monthlyGoals]);

  const { goalStats, advancedStats, topProducts, topBrands, financial, staff: salesByStaff, dayTrends: salesByDay, categoryTrends: salesByCategory, trend: salesTrend } = dashboardMetrics;

  const stats = useMemo(() => [
    { label: 'Hoje', value: formatCurrency(goalStats.daily.reached), subValue: `Meta: ${formatCurrency(goalStats.daily.goal)}`, icon: Calendar, color: 'bg-blue-600', percent: goalStats.daily.percent },
    { label: 'Lucro Estimado', value: formatCurrency(advancedStats.totalProfit), subValue: `Margem: ${advancedStats.margin.toFixed(1)}%`, icon: TrendingUp, color: 'bg-emerald-600' },
    { label: 'Melhor Vendedora', value: advancedStats.topSeller?.name || 'N/A', subValue: advancedStats.topSeller ? formatCurrency(advancedStats.topSeller.total) : 'Sem vendas', icon: Trophy, color: 'bg-amber-600' },
    { label: 'Produto #1', value: (advancedStats.topProduct?.name || 'N/A').split(' ')[0], subValue: `${advancedStats.topProduct?.quantity || 0} vendidos`, icon: ShoppingBag, color: 'bg-indigo-600' },
  ], [formatCurrency, goalStats.daily, advancedStats]);

  const customerStats = useMemo(() => {
    const customerSpending: { [key: string]: { name: string, total: number, count: number } } = {};
    sales.forEach(sale => {
      if (sale.customerId && sale.customerName) {
        if (!customerSpending[sale.customerId]) {
          customerSpending[sale.customerId] = { name: sale.customerName, total: 0, count: 0 };
        }
        customerSpending[sale.customerId].total += sale.total;
        customerSpending[sale.customerId].count += 1;
      }
    });

    const topCustomers = Object.values(customerSpending)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const genderDist: { [key: string]: number } = {};
    customers.forEach(c => {
      const gender = c.gender || 'Não Informado';
      genderDist[gender] = (genderDist[gender] || 0) + 1;
    });

    const cityDist: { [key: string]: number } = {};
    customers.forEach(c => {
      const city = c.city || 'Não Informado';
      cityDist[city] = (cityDist[city] || 0) + 1;
    });

    return { topCustomers, genderDist, cityDist };
  }, [sales, customers]);


  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 overflow-hidden">
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
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight transition-colors">{settings.name || 'Painel de Controle'}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Métricas principais do mês atual</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm w-fit max-w-full overflow-x-auto scrollbar-hide">
        {[
          { id: 'geral', label: 'Geral', icon: LayoutDashboard },
          { id: 'marcas_produtos', label: 'Marcas & Produtos', icon: Package },
          { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
          { id: 'clientes', label: 'Clientes', icon: Users },
          { id: 'historico', label: 'Histórico', icon: History },
          { id: 'crm', label: 'CRM', icon: TrendingUp },
          { id: 'estoque_parado', label: 'Inativos', icon: PackageIcon },
          { id: 'inteligencia', label: 'Inteligência', icon: Sparkles },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveDashboardTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 lg:px-6 py-2.5 rounded-xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
              activeDashboardTab === tab.id 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeDashboardTab === 'geral' && (
        <div className="space-y-6">
          {/* Alertas Críticos de Inventário */}
          {(inventoryAlerts.lowStock.length > 0 || inventoryAlerts.expiringSoon.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inventoryAlerts.lowStock.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/20 p-5 rounded-[24px] border border-rose-100 dark:border-rose-900/30 flex items-center gap-4">
                  <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse shrink-0">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-rose-900 dark:text-rose-100 uppercase tracking-tight">Estoque Crítico</h4>
                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest">{inventoryAlerts.lowStock.length} produtos em baixa</p>
                  </div>
                </div>
              )}
              {inventoryAlerts.expiringSoon.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-[24px] border border-amber-100 dark:border-amber-900/30 flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-lg shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">Próximos do Vencimento</h4>
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">{inventoryAlerts.expiringSoon.length} produtos vencendo logo</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 hover:shadow-xl hover:shadow-blue-500/5 transition-all group">
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform", stat.color)}>
                    <stat.icon size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{stat.label}</p>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</h4>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">{stat.subValue}</span>
                    {stat.percent !== undefined && (
                      <span className={cn("font-black", stat.percent >= 100 ? "text-emerald-500" : "text-amber-500")}>
                        {stat.percent}%
                      </span>
                    )}
                  </div>
                  {stat.percent !== undefined && (
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, stat.percent)}%` }}
                        className={cn("h-full rounded-full transition-all", stat.percent >= 100 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-blue-500")}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trend (Bigger) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <TrendingUp size={20} className="text-blue-600" />
                    Evolução do Faturamento
                  </h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Acompanhamento diário das vendas</p>
                </div>
              </div>
              <div className="h-[300px] w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `R$${v}`} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(v: number) => [formatCurrency(v), 'Total']}
                    />
                    <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Methods (Quick view) */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
                <Wallet size={20} className="text-purple-600" />
                Pagamentos
              </h3>
                      <div className="h-[200px] w-full mb-6 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(financial.breakdown).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {Object.entries(financial.breakdown).map(([method], index) => (
                        <Cell key={`cell-${method}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {Object.entries(financial.breakdown).slice(0, 4).map(([method, value], i) => (
                  <div key={method} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] font-black text-slate-500 uppercase">{method}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-900 dark:text-white">{formatCurrency(value as number)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Package size={20} className="text-blue-600" />
                  Mais Vendidos
                </h3>
                <Target size={20} className="text-slate-200" />
              </div>
              <div className="space-y-4">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center font-black text-blue-600 text-[10px] shadow-sm">
                        {i + 1}º
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate max-w-[150px]">{p.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{p.quantity} vendidos</p>
                      </div>
                    </div>
                    <p className="font-black text-blue-600 text-sm">{formatCurrency(p.total)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Staff */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Trophy size={20} className="text-amber-500" />
                  Performance Vendedoras
                </h3>
                <Users size={20} className="text-slate-200" />
              </div>
              <div className="space-y-4">
                {salesByStaff.slice(0, 5).map((staff, i) => (
                  <div key={staff.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center font-black text-amber-500 text-[10px] shadow-sm">
                        {i + 1}º
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{staff.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{staff.count} vendas</p>
                          <div className="w-1 h-1 bg-slate-300 rounded-full" />
                          <p className="text-[9px] font-bold text-emerald-500 uppercase">Comissão: {formatCurrency(staff.commission || 0)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-amber-600 text-sm">{formatCurrency(staff.total)}</p>
                      <div className="w-24 h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${(staff.total / salesByStaff[0].total) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeDashboardTab === 'historico' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <History size={20} className="text-blue-600" />
              Histórico de Vendas
            </h3>
          </div>
          <SalesView 
            sales={sales} 
            setSales={setSales} 
            customers={customers} 
            formatDate={formatDate} 
            formatCurrency={formatCurrency} 
            handleFirestoreError={handleFirestoreError} 
            user={user} 
            ensureAuthSession={ensureAuthSession}
            addNotification={addNotification}
            isCashierOpen={isCashierOpen}
            setCurrentView={setActiveTab}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            monthlyGoals={monthlyGoals}
          />
        </div>
      )}

      {activeDashboardTab === 'crm' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-600" />
              Performance CRM
            </h3>
          </div>
          <PerformanceView 
            sales={sales} 
            staff={staff} 
            formatCurrency={formatCurrency} 
            monthlyGoals={monthlyGoals}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        </div>
      )}

      {activeDashboardTab === 'inteligencia' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all animate-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-500" />
                Curva ABC de Estoque
              </h3>
              <div className="space-y-4">
                {(() => {
                  const items = products.map(p => {
                    const totalRevenue = sales.filter(s => s.status === 'completed').reduce((acc, s) => {
                      const item = s.items.find(i => i.productId === p.id);
                      return acc + (item?.total || 0);
                    }, 0);
                    return { ...p, totalRevenue };
                  }).sort((a, b) => b.totalRevenue - a.totalRevenue);

                  const totalAllRevenue = items.reduce((acc, i) => acc + i.totalRevenue, 0);
                  let cumulativeRevenue = 0;

                  return items.slice(0, 10).map((p, idx) => {
                    cumulativeRevenue += p.totalRevenue;
                    const percent = totalAllRevenue > 0 ? (cumulativeRevenue / totalAllRevenue) * 100 : 0;
                    const grade = percent <= 80 ? 'A' : percent <= 95 ? 'B' : 'C';
                    
                    return (
                      <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs",
                            grade === 'A' ? "bg-emerald-500 text-white" : grade === 'B' ? "bg-amber-500 text-white" : "bg-slate-400 text-white"
                          )}>
                            {grade}
                          </span>
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate max-w-[200px]">{p.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Receita: {formatCurrency(p.totalRevenue)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{totalAllRevenue > 0 ? ((p.totalRevenue / totalAllRevenue) * 100).toFixed(1) : 0}%</p>
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${totalAllRevenue > 0 ? (p.totalRevenue / totalAllRevenue) * 100 : 0}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all animate-in slide-in-from-bottom-4 duration-700">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
                <PackageIcon size={20} className="text-emerald-500" />
                Sugestões de Compra & Reposição
              </h3>
              <div className="space-y-4">
                {products
                  .filter(p => p.stock <= (p.minStock || 5) && p.status === 'active')
                  .slice(0, 8)
                  .map(p => {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    const salesVolume = sales
                      .filter(s => s.status === 'completed' && new Date(s.date) >= thirtyDaysAgo)
                      .reduce((acc, s) => acc + (s.items.find(i => i.productId === p.id)?.quantity || 0), 0);
                    
                    const suggestedRefill = Math.max(salesVolume * 1.5, (p.minStock || 5) * 2);

                    return (
                      <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate max-w-[200px]">{p.name}</p>
                          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Estoque: {p.stock} un | Mín: {p.minStock || 5}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Sugestão de Reposição</p>
                          <p className="text-sm font-black text-emerald-600">+{suggestedRefill.toFixed(0)} un</p>
                        </div>
                      </div>
                    );
                  })}
                {products.filter(p => p.stock <= (p.minStock || 5) && p.status === 'active').length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4">
                      <PackageCheck size={32} />
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase">Estoque Nível Saudável</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Nenhum produto em nível crítico no momento</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeDashboardTab === 'estoque_parado' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <PackageIcon size={20} className="text-rose-600" />
                Estoque Parado & Giro
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Produtos que não vendem há mais de 30 dias</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Sugestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {products
                  .filter(p => p.stock > 0 && !sales.some(s => {
                    const saleDate = new Date(s.date);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return s.items.some(i => i.productId === p.id) && saleDate >= thirtyDaysAgo;
                  }))
                  .map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                      <td className="px-6 py-4 text-xs font-black text-slate-900 dark:text-white uppercase">{p.name}</td>
                      <td className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.brand}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400">{p.stock} un</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-[9px] font-black px-3 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full uppercase tracking-tighter">
                          Sugestão: 20% OFF
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeDashboardTab === 'marcas_produtos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
              <Package size={20} className="text-blue-600" />
              Produtos Mais Vendidos
            </h3>
            <div className="space-y-4">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-blue-600 shadow-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{p.name}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.quantity} Unidades Vendidas</p>
                    </div>
                  </div>
                  <p className="font-black text-blue-600">{formatCurrency(p.total)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
              <Disc size={20} className="text-purple-600" />
              Marcas em Destaque
            </h3>
            <div className="space-y-4">
              {topBrands.map((b, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-purple-600 shadow-sm">
                      {b.name.charAt(0)}
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{b.name}</p>
                  </div>
                  <p className="font-black text-purple-600">{formatCurrency(b.total)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Metrics Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Zap size={20} className="text-amber-500" />
                <h3 className="text-sm font-black uppercase tracking-tight">Métricas Avançadas</h3>
              </div>

              <div className="space-y-4">
                {[
                  { 
                    label: 'Crescimento Mensal', 
                    value: `${advancedStats.growth >= 0 ? '+' : ''}${advancedStats.growth.toFixed(1)}%`,
                    sub: advancedStats.growth >= 0 ? 'Subindo' : 'Caindo',
                    color: advancedStats.growth >= 0 ? 'blue' : 'rose'
                  },
                  { 
                    label: 'Taxa de Recompra', 
                    value: `${advancedStats.repurchaseRate.toFixed(1)}%`,
                    sub: 'Fidelidade',
                    color: 'emerald'
                  },
                  { 
                    label: 'Ticket Médio / Cliente', 
                    value: formatCurrency(advancedStats.avgTicketPerCustomer),
                    sub: 'Por pessoa',
                    color: 'purple'
                  },
                  { 
                    label: 'Frequência de Retorno', 
                    value: `${advancedStats.avgReturnDays} dias`,
                    sub: 'Intervalo',
                    color: 'orange'
                  }
                ].map((metric) => (
                  <div key={metric.label} className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between",
                    metric.color === 'blue' ? "bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/20" :
                    metric.color === 'rose' ? "bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/20" :
                    metric.color === 'emerald' ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20" :
                    metric.color === 'purple' ? "bg-purple-50/50 border-purple-100 dark:bg-purple-900/10 dark:border-purple-900/20" :
                    "bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/20"
                  )}>
                    <div>
                      <p className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        metric.color === 'blue' ? "text-blue-600" :
                        metric.color === 'rose' ? "text-rose-600" :
                        metric.color === 'emerald' ? "text-emerald-600" :
                        metric.color === 'purple' ? "text-purple-600" :
                        "text-orange-600"
                      )}>{metric.label}</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">{metric.value}</p>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded-lg flex items-center gap-1.5",
                      metric.color === 'blue' ? "bg-blue-100 text-blue-700" :
                      metric.color === 'rose' ? "bg-rose-100 text-rose-700" :
                      metric.color === 'emerald' ? "bg-emerald-100 text-emerald-700" :
                      metric.color === 'purple' ? "bg-purple-100 text-purple-700" :
                      "bg-orange-100 text-orange-700"
                    )}>
                      {metric.color === 'rose' ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                      <span className="text-[8px] font-black uppercase">{metric.sub}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Novos vs Recorrentes</h4>
                <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${100 - advancedStats.repurchaseRate}%` }} 
                  />
                  <div 
                    className="h-full bg-emerald-500" 
                    style={{ width: `${advancedStats.repurchaseRate}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-slate-600 dark:text-slate-400">Novos: {advancedStats.totalCustomersWithSales - advancedStats.recurringCustomers}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-slate-600 dark:text-slate-400">Recorrentes: {advancedStats.recurringCustomers}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeDashboardTab === 'financeiro' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Trophy size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dia Mais Vendido</p>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{financial.bestDay[0]}</h4>
                </div>
              </div>
              <p className="text-sm font-bold text-emerald-600">Total: {formatCurrency(financial.bestDay[1] as number)}</p>
            </div>

            <div className="md:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
                <Wallet size={20} className="text-blue-600" />
                Resumo por Forma de Pagamento
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Object.entries(financial.breakdown).map(([method, value]) => (
                  <div key={method} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{method}</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(value as number)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600" />
              Distribuição Financeira
            </h3>
            <div className="h-[300px] w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(financial.breakdown).map(([name, value]) => ({ name, value }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Total']}
                  />
                  <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeDashboardTab === 'clientes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
                <Trophy size={20} className="text-yellow-500" />
                Top Clientes (Faturamento)
              </h3>
              <div className="space-y-4">
                {customerStats.topCustomers.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-yellow-500 shadow-sm">
                        {i + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{c.name}</p>
                          {(() => {
                            const tier = getCustomerTier(c.total);
                            return (
                              <span className={cn("px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-0.5", tier.bg, tier.color)}>
                                {tier.icon}
                                {tier.label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.count} Compras Realizadas</p>
                      </div>
                    </div>
                    <p className="font-black text-emerald-600">{formatCurrency(c.total)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
                <Users size={20} className="text-blue-600" />
                Distribuição por Gênero
              </h3>
            <div className="h-[250px] w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(customerStats.genderDist).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {Object.entries(customerStats.genderDist).map(([gender], index) => (
                        <Cell key={`cell-${gender}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
              <MapPin size={20} className="text-rose-600" />
              Clientes por Cidade
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(customerStats.cityDist).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 8).map(([city, count]) => (
                <div key={city} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{city}</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff Comparison */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Trophy size={20} className="text-amber-500" />
              Ranking Vendedoras
            </h3>
            <button className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline">Ver Tudo</button>
          </div>
          <div className="space-y-6">
            {salesByStaff.length === 0 ? (
              <p className="text-center py-8 text-slate-400 font-bold italic">Sem vendas no mês.</p>
            ) : (
              salesByStaff.map((item, i) => (
                <div key={item.name} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black",
                        i === 0 ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : 
                        i === 1 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" : "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                      )}>
                        {i + 1}º
                      </div>
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-blue-600 dark:text-blue-400">{formatCurrency(item.total)}</p>
                      <p className="text-[9px] text-emerald-500 font-bold uppercase">Comissão {formatCurrency(item.commission || 0)}</p>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.total / salesByStaff[0].total) * 100}%` }}
                      className={cn(
                        "h-full rounded-full",
                        i === 0 ? "bg-blue-600" : i === 1 ? "bg-blue-400" : "bg-slate-400"
                      )}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Tag size={20} className="text-purple-500" />
              Categorias
            </h3>
          </div>
          <div className="h-[250px] w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {salesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Total']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {salesByCategory.slice(0, 4).map((item, i) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Best Selling Days */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-500 dark:text-blue-400" />
              Dias que mais Vende
            </h3>
          </div>
          <div className="h-[250px] w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByDay.map(([name, total]) => ({ name, total }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                />
                <YAxis hide />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Total']}
                />
                <Bar 
                  dataKey="total" 
                  fill="#2563eb" 
                  radius={[4, 4, 0, 0]} 
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductsView = ({ 
  products, 
  sales,
  setProducts, 
  brands, 
  productCategories,
  setProductCategories,
  addNotification, 
  handleFirestoreError, 
  user, 
  formatCurrency, 
  typeFilter, 
  ensureAuthSession 
}: ProductsViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', brand: '', category: 'Cabelos', price: 0, cost: 0, stock: 0, minStock: 5, expiryDate: '', type: typeFilter || 'avulso', comboItems: []
  });

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'price' | 'cost') => {
    // Remove tudo que não for dígito
    const value = e.target.value.replace(/\D/g, '');
    const amount = Number(value) / 100;
    setFormData(prev => ({ ...prev, [field]: amount }));
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = brandFilter ? p.brand === brandFilter : true;
    const matchesCategory = categoryFilter ? p.category === categoryFilter : true;
    const matchesType = typeFilter 
      ? (p.type === typeFilter || (!p.type && typeFilter === 'avulso')) 
      : true;
    const matchesLowStock = showLowStockOnly ? p.stock <= p.minStock : true;
    return matchesSearch && matchesBrand && matchesCategory && matchesType && matchesLowStock;
  });

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  // Advanced Stock Intelligence & Suggestions
  const stockSuggestions = useMemo(() => {
    return products
      .filter(p => !p.type || p.type === 'avulso') // Only for base products
      .map(product => {
        // Calculate sales growth (simplified: last 30 days vs prev 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
        
        const recentSales = sales.filter(s => s.date >= thirtyDaysAgo.toISOString() && s.status === 'completed');
        const prevSales = sales.filter(s => s.date >= sixtyDaysAgo.toISOString() && s.date < thirtyDaysAgo.toISOString() && s.status === 'completed');
        
        const countRecent = recentSales.reduce((acc, s) => acc + (s.items.find(i => i.productId === product.id)?.quantity || 0), 0);
        const countPrev = prevSales.reduce((acc, s) => acc + (s.items.find(i => i.productId === product.id)?.quantity || 0), 0);
        
        const growth = countPrev > 0 ? ((countRecent - countPrev) / countPrev) : (countRecent > 0 ? 1 : 0);
        
        // Suggestion logic: Stock is low OR growth is high and stock is moderate
        const needsRestock = product.stock <= (product.minStock * 1.5) || (growth > 0.1 && product.stock <= (product.minStock * 2));
        
        // Recommended buy amount: (Average monthly sale * 1.2) - Current Stock
        const recommendedAmount = Math.max(0, Math.ceil((countRecent * 1.2) - product.stock)) || (product.minStock * 2);

        return {
           ...product,
           growth: growth * 100,
           recentSales: countRecent,
           needsRestock,
           recommendedAmount
        };
      })
      .filter(p => p.needsRestock)
      .sort((a, b) => b.growth - a.growth);
  }, [products, sales]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        ...product,
        type: product.type || typeFilter || 'avulso',
        comboItems: product.comboItems || [],
        expiryDate: product.expiryDate || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', brand: '', category: typeFilter === 'combo' ? 'Combos' : typeFilter === 'kit' ? 'Kits' : 'Cabelos', price: 0, cost: 0, stock: 0, minStock: 5, expiryDate: '', type: typeFilter || 'avulso', comboItems: [] });
    }
    setIsModalOpen(true);
  };

  const updateComboItemQuantity = (productId: string, quantity: number) => {
    setFormData(prev => {
      const newItems = (prev.comboItems || []).map(item => 
        item.productId === productId ? { ...item, quantity } : item
      );
      
      let totalCost = 0;
      newItems.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        if (p) totalCost += p.cost * item.quantity;
      });

      return {
        ...prev,
        comboItems: newItems,
        cost: totalCost
      };
    });
  };

  const addComboItem = (productId: string) => {
    setFormData(prev => {
      const currentItems = prev.comboItems || [];
      if (currentItems.some(item => item.productId === productId)) return prev;
      
      const newItems = [...currentItems, { productId, quantity: 1 }];
      
      let totalCost = 0;
      newItems.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        if (p) totalCost += p.cost * item.quantity;
      });

      return {
        ...prev,
        comboItems: newItems,
        cost: totalCost
      };
    });
  };

  const removeComboItem = (productId: string) => {
    setFormData(prev => {
      const newItems = (prev.comboItems || []).filter(item => item.productId !== productId);
      
      let totalCost = 0;
      newItems.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        if (p) totalCost += p.cost * item.quantity;
      });

      return {
        ...prev,
        comboItems: newItems,
        cost: totalCost
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        addNotification('A imagem deve ter no máximo 500KB.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePlaceholderImage = () => {
    const emojis: any = {
      'Maquiagem': '💄',
      'Cabelo': '💇‍♀️',
      'Perfume': '✨',
      'Kits': '🎁',
      'Combos': '📦',
      'default': '🧴'
    };
    const emoji = emojis[formData.category || 'default'] || emojis.default;
    setFormData({ ...formData, image: `https://placehold.co/400x300/f8fafc/64748b?text=${encodeURIComponent(emoji)}` });
  };

  const handleAddCategory = () => {
    if (!newCategoryName) return;
    if (productCategories.some(c => c.name.toLowerCase() === newCategoryName.toLowerCase())) {
      addNotification('Esta categoria já existe.', 'warning');
      return;
    }
    const newCat = { id: `C${Date.now()}`, name: newCategoryName.trim() };
    setProductCategories(prev => [...prev, newCat]);
    setNewCategoryName('');
    addNotification('Categoria adicionada!', 'success');
  };

  const handleDeleteCategory = (id: string, name: string) => {
    if (products.some(p => p.category === name)) {
      addNotification('Não é possível excluir uma categoria em uso.', 'error');
      return;
    }
    setProductCategories(prev => prev.filter(c => c.id !== id));
    addNotification('Categoria removida.', 'info');
  };

  const toggleFavorite = (product: Product) => {
    setProducts(prev => prev.map(p => 
      p.id === product.id ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  };

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleSave = async () => {
    const errors = [];
    if (!formData.name) errors.push('name');
    if (!formData.brand) errors.push('brand');
    if (!formData.category) errors.push('category');
    if ((formData.type === 'kit' || formData.type === 'combo') && (!formData.comboItems || formData.comboItems.length === 0)) {
      errors.push('items');
    }

    setValidationErrors(errors);

    if (errors.length > 0) {
      if (errors.includes('items')) {
        addNotification(`Adicione pelo menos um item ao ${formData.type === 'kit' ? 'kit' : 'combo'}.`, 'warning');
      } else {
        addNotification('Preencha os campos obrigatórios destacados em vermelho.', 'warning');
      }
      return;
    }

    if (Number(formData.price) < 0) {
      addNotification('O preço não pode ser negativo.', 'warning');
      return;
    }
    if (Number(formData.cost) < 0) {
      addNotification('O custo não pode ser negativo.', 'warning');
      return;
    }
    if (Number(formData.stock) < 0) {
      addNotification('O estoque não pode ser negativo.', 'warning');
      return;
    }
    if (Number(formData.minStock) < 0) {
      addNotification('O estoque mínimo não pode ser negativo.', 'warning');
      return;
    }

    if (formData.price <= 0) {
      addNotification('O preço de venda deve ser maior que zero.', 'warning');
      return;
    }

    if ((formData.type === 'kit' || formData.type === 'combo') && formData.price < formData.cost) {
      addNotification(`O preço do ${formData.type} não pode ser menor que o seu custo total (${formatCurrency(formData.cost)}).`, 'warning');
      return;
    }

    const productData = {
      ...formData,
      id: editingProduct?.id || `P${Date.now()}`,
      price: Number(formData.price),
      cost: Number(formData.cost),
      stock: Number(formData.stock),
      minStock: Number(formData.minStock)
    } as Product;

    try {
      if (editingProduct) {
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? productData : p));
      } else {
        setProducts(prev => [...prev, productData]);
      }
      
      const typeLabel = productData.type === 'kit' ? 'Kit' : productData.type === 'combo' ? 'Combo' : 'Produto';
      addNotification(`${typeLabel} salvo com sucesso! No atendimento, você o encontrará na aba de ${typeLabel}s.`, 'success');
      setIsModalOpen(false);
    } catch (error: any) {
      addNotification('Erro ao salvar produto.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      setProducts(prev => prev.filter(p => p.id !== id));
      addNotification('Produto excluído!', 'info');
    } catch (error: any) {
      addNotification('Erro ao excluir produto.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Buy Suggestions / Stock Intelligence */}
      {stockSuggestions.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-[40px] border border-amber-100 dark:border-amber-900/30 p-8 shadow-sm">
          <h3 className="text-lg font-black text-amber-900 dark:text-amber-200 uppercase tracking-tight mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-orange-500" />
            Inteligência de Compra
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stockSuggestions.slice(0, 3).map(suggestion => (
              <div key={suggestion.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/50 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600">
                  <Package size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{suggestion.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-[10px] font-black uppercase",
                      suggestion.growth > 0 ? "text-emerald-600" : "text-slate-400"
                    )}>
                      {suggestion.growth > 0 ? `+${suggestion.growth.toFixed(0)}% Giro` : 'Giro Estável'}
                    </span>
                    <span className="text-[10px] text-slate-300">•</span>
                    <span className="text-[10px] font-black text-amber-600 uppercase">Sugestão: {suggestion.recommendedAmount} un</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenModal(suggestion)}
                  className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl hover:bg-amber-100 transition-all shrink-0"
                >
                  <PlusCircle size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {lowStockProducts.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-900 dark:text-rose-100 uppercase tracking-tight">Alerta de Estoque Baixo</h4>
              <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                {lowStockProducts.length} {lowStockProducts.length === 1 ? 'produto atingiu' : 'produtos atingiram'} o estoque mínimo
              </p>
            </div>
          </div>
          <div className="flex -space-x-2">
            {lowStockProducts.slice(0, 5).map(p => (
              <div key={p.id} className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-rose-50 dark:border-rose-900/30 flex items-center justify-center text-[10px] font-black text-rose-600 dark:text-rose-400" title={p.name}>
                {p.name.charAt(0)}
              </div>
            ))}
            {lowStockProducts.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 border-2 border-rose-50 dark:border-rose-900/30 flex items-center justify-center text-[10px] font-black text-rose-600 dark:text-rose-400">
                +{lowStockProducts.length - 5}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-1 items-center gap-4 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar produtos..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl shrink-0 text-blue-600 dark:text-blue-400">
              <input 
                type="checkbox"
                id="lowStockFilter"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="lowStockFilter" className="text-[10px] font-black uppercase tracking-widest cursor-pointer select-none">Estoque Baixo</label>
            </div>
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl shrink-0">
              <Filter size={14} className="text-blue-600 dark:text-blue-400" />
              <select 
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 focus:ring-0 cursor-pointer outline-none"
              >
                <option value="" className="bg-white dark:bg-slate-900">Todas as Marcas</option>
                {brands.map(b => (
                  <option key={b.id} value={b.name} className="bg-white dark:bg-slate-900">{b.name}</option>
                ))}
              </select>
            </div>
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl shrink-0">
              <Layers size={14} className="text-blue-600 dark:text-blue-400" />
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 focus:ring-0 cursor-pointer outline-none"
              >
                <option value="" className="bg-white dark:bg-slate-900">Todas as Categorias</option>
                {productCategories.map(c => (
                  <option key={c.id} value={c.name} className="bg-white dark:bg-slate-900">{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs"
            >
              <Layers size={18} />
              Categorias
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Novo Produto
            </button>
          </div>
        </div>
      <div className="overflow-x-auto hidden lg:block">
        <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Produto</th>
              <th className="px-6 py-4">Marca</th>
              <th className="px-6 py-4">Preço</th>
              <th className="px-6 py-4">Estoque</th>
              <th className="px-6 py-4">Previsão Esgotamento</th>
              <th className="px-6 py-4">Validade</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredProducts.map((product) => (
              <tr key={product.id} className={cn(
                "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                product.type === 'kit' ? "bg-purple-50/40 dark:bg-purple-900/10" : 
                product.type === 'combo' ? "bg-blue-50/40 dark:bg-blue-900/10" : ""
              )}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleFavorite(product)}
                      className={cn(
                        "p-1 rounded-lg transition-all",
                        product.isFavorite ? "text-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-sm" : "text-slate-300 hover:text-amber-500"
                      )}
                    >
                      <Star size={16} fill={product.isFavorite ? "currentColor" : "none"} />
                    </button>
                    <div className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit",
                      product.type === 'avulso' ? "bg-slate-100 text-slate-600" : 
                      product.type === 'combo' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                    )}>
                      {product.type}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => product.image && setPreviewImage(product.image)}
                      className={cn(
                        "w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 overflow-hidden",
                        product.image && "cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                      )}
                    >
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Package size={20} />
                      )}
                    </button>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white">{product.name}</span>
                      {(product.type === 'combo' || product.type === 'kit') && (
                        <div className="flex flex-col mt-0.5">
                          <span className="text-[9px] text-blue-500 font-black uppercase tracking-tighter">
                            {product.comboItems?.length} itens inclusos
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {product.comboItems?.slice(0, 2).map((ci) => {
                              const comp = products.find(p => p.id === ci.productId);
                              return (
                                <span key={ci.productId} className="text-[8px] bg-blue-50 dark:bg-blue-900/20 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-bold">
                                  {ci.quantity}x {comp?.name.split(' ')[0]}
                                </span>
                              );
                            })}
                            {(product.comboItems?.length || 0) > 2 && <span className="text-[8px] text-slate-400 font-bold">+{(product.comboItems?.length || 0) - 2}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{product.brand}</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-500 text-sm">{product.category}</td>
                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{formatCurrency(product.price)}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className={cn(
                      "font-bold text-sm",
                      product.stock <= product.minStock ? "text-rose-600" : "text-slate-900 dark:text-white"
                    )}>
                      {product.stock} un
                    </span>
                    <span className="text-[9px] font-black uppercase text-slate-400">Min: {product.minStock}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                   {(() => {
                      const now = new Date();
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(now.getDate() - 30);
                      
                      const totalSold = sales
                        .filter(s => s.status === 'completed' && new Date(s.date) >= thirtyDaysAgo)
                        .reduce((acc, s) => {
                          const item = s.items.find(i => i.productId === product.id);
                          return acc + (item?.quantity || 0);
                        }, 0);
                      
                      if (totalSold === 0) return <span className="text-[10px] text-slate-400 font-bold uppercase italic">Sem giro</span>;
                      
                      const dailyRate = totalSold / 30;
                      const daysLeft = Math.floor(product.stock / dailyRate);
                      
                      return (
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-[10px] font-black uppercase",
                            daysLeft < 7 ? "text-rose-600" : daysLeft < 15 ? "text-amber-600" : "text-emerald-600"
                          )}>
                            {daysLeft} dias restantes
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Giro: {dailyRate.toFixed(2)}/dia</span>
                        </div>
                      );
                   })()}
                </td>
                <td className="px-6 py-4">
                  {product.expiryDate ? (() => {
                    const expiry = new Date(product.expiryDate + 'T00:00:00');
                    const today = new Date();
                    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div className="flex flex-col">
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit",
                          diffDays < 30 ? "bg-rose-100 text-rose-700" : diffDays < 90 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {expiry.toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                          {diffDays < 0 ? 'Vencido!' : `${diffDays} dias`}
                        </span>
                      </div>
                    );
                  })() : <span className="text-slate-400">-</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleOpenModal(product)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

       {/* Mobile Products Cards */}
      <div className="lg:hidden p-4 space-y-4">
        {filteredProducts.map((product) => (
          <motion.div 
            key={product.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden",
              product.type === 'kit' ? "bg-purple-50/40 dark:bg-purple-900/10" : 
              product.type === 'combo' ? "bg-blue-50/40 dark:bg-blue-900/10" : ""
            )}
          >
            <div className="flex">
              {/* Product Image or Icon */}
              <div 
                onClick={() => product.image && setPreviewImage(product.image)}
                className={cn(
                  "w-24 sm:w-32 aspect-square bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 border-r border-slate-100 dark:border-slate-800",
                  product.image && "cursor-pointer"
                )}
              >
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Package className="text-slate-300" size={32} />
                )}
              </div>
              
              <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest truncate">{product.brand}</span>
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0",
                      product.type === 'avulso' ? "bg-slate-100 text-slate-600" : 
                      product.type === 'combo' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                    )}>
                      {product.type}
                    </div>
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs sm:text-sm line-clamp-2 tracking-tight flex items-center gap-1.5">
                    {product.name}
                    {product.isFavorite && <Star size={14} fill="currentColor" className="text-amber-500 shrink-0" />}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{product.category}</p>
                </div>

                <div className="flex items-end justify-between pt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preço de Venda</span>
                    <span className="font-black text-slate-900 dark:text-white text-base">{formatCurrency(product.price)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estoque</span>
                    <span className={cn(
                      "text-xs font-black",
                      product.stock <= product.minStock ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {product.stock} un
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
              {(product.type === 'combo' || product.type === 'kit') && (
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
                  <Layers size={12} />
                  {product.comboItems?.length} itens
                </span>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button 
                  onClick={() => toggleFavorite(product)}
                  className={cn(
                    "p-2 rounded-xl border transition-all shadow-sm",
                    product.isFavorite 
                      ? "bg-amber-50 border-amber-200 text-amber-500" 
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400"
                  )}
                >
                  <Star size={18} fill={product.isFavorite ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={() => handleOpenModal(product)}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest shadow-sm"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
                <button 
                  onClick={() => handleDelete(product.id)}
                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {previewImage && (
          <div 
            className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <X size={24} />
              </button>
              <img 
                src={previewImage} 
                alt="Preview" 
                className="max-h-[80vh] w-auto rounded-2xl shadow-2xl object-contain bg-white"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-blue-600"
                    title="Voltar"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {validationErrors.length > 0 && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-600">
                    <AlertCircle size={20} className="shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">Erros encontrados:</p>
                      <p className="text-[10px] font-bold uppercase">{validationErrors.includes('items') ? `Adicione itens ao ${formData.type}` : 'Preencha todos os campos obrigatórios'}</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Produto</label>
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      {[
                        { id: 'avulso', label: 'Avulso' },
                        { id: 'combo', label: 'Combo' },
                        { id: 'kit', label: 'Kit' }
                      ].map((t) => (
                        <button 
                          key={t.id}
                          type="button"
                          onClick={() => {
                            const newType = t.id as any;
                            const newCategory = newType === 'combo' ? 'Combos' : newType === 'kit' ? 'Kits' : (formData.category === 'Combos' || formData.category === 'Kits' ? 'Cabelos' : formData.category);
                            setFormData({ 
                              ...formData, 
                              type: newType, 
                              category: newCategory
                            });
                          }}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            formData.type === t.id ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400"
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(formData.type === 'combo' || formData.type === 'kit') && (
                    <div className={cn(
                      "col-span-2 space-y-3 p-4 rounded-2xl border transition-all",
                      validationErrors.includes('items') 
                        ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/30 ring-2 ring-rose-500/20" 
                        : "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30"
                    )}>
                      <label className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        validationErrors.includes('items') ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
                      )}>
                        Itens do {formData.type === 'combo' ? 'Combo' : 'Kit'}
                      </label>
                      
                      <div className="space-y-2">
                        {formData.comboItems?.map((item, idx) => {
                          const p = products.find(prod => prod.id === item.productId);
                          return (
                            <div key={idx} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-blue-100 dark:border-blue-900/30">
                              <div className="flex-1">
                                <p className="text-xs font-bold text-slate-900 dark:text-white">{p?.name || 'Produto não encontrado'}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{p?.brand}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateComboItemQuantity(item.productId, Number(e.target.value))}
                                  className="w-12 p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center text-xs font-bold"
                                  min="1"
                                />
                                <button 
                                  onClick={() => removeComboItem(item.productId)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Adicionar Item ao {formData.type === 'combo' ? 'Combo' : 'Kit'}:</p>
                        <select 
                          onChange={(e) => {
                            if (e.target.value) {
                              addComboItem(e.target.value);
                              if (validationErrors.includes('items')) setValidationErrors(prev => prev.filter(err => err !== 'items'));
                              e.target.value = "";
                            }
                          }}
                          className="w-full p-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/30 rounded-xl text-xs font-bold"
                        >
                          <option value="">Selecione um produto...</option>
                          {products.filter(p => (p.type === 'avulso' || !p.type) && !formData.comboItems?.some(ci => ci.productId === p.id)).map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.brand})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Imagem do Produto</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group">
                        {formData.image ? (
                          <>
                            <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => setFormData({ ...formData, image: '' })}
                              className="absolute inset-0 bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                            >
                              <XIcon size={20} />
                            </button>
                          </>
                        ) : (
                          <Camera size={24} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all cursor-pointer">
                            <Upload size={14} /> Upload
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                          </label>
                          <button 
                            onClick={generatePlaceholderImage}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                          >
                            <Sparkles size={14} /> Gerar
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">PNG, JPG ou WEBP (Máx. 500KB)</p>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Produto</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (validationErrors.includes('name')) setValidationErrors(prev => prev.filter(e => e !== 'name'));
                      }}
                      className={cn(
                        "w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 font-bold text-slate-900 dark:text-white transition-all",
                        validationErrors.includes('name') ? "border-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-blue-500"
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca</label>
                    <select 
                      value={formData.brand}
                      onChange={(e) => {
                        setFormData({ ...formData, brand: e.target.value });
                        if (validationErrors.includes('brand')) setValidationErrors(prev => prev.filter(e => e !== 'brand'));
                      }}
                      className={cn(
                        "w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 font-bold text-slate-900 dark:text-white transition-all",
                        validationErrors.includes('brand') ? "border-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-blue-500"
                      )}
                    >
                      <option value="">Selecione uma marca</option>
                      {brands.map(brand => (
                        <option key={brand.id} value={brand.name}>{brand.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => {
                        setFormData({ ...formData, category: e.target.value });
                        if (validationErrors.includes('category')) setValidationErrors(prev => prev.filter(e => e !== 'category'));
                      }}
                      className={cn(
                        "w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 font-bold text-slate-900 dark:text-white transition-all",
                        validationErrors.includes('category') ? "border-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-blue-500"
                      )}
                    >
                      {productCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name === 'Combos' ? '📦 ' : cat.name === 'Kits' ? '🎁 ' : ''}{cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Venda</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={formatCurrency(formData.price || 0)}
                      onChange={(e) => handleCurrencyChange(e, 'price')}
                      className={cn(
                        "w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 font-bold text-slate-900 dark:text-white transition-all",
                        Number(formData.price) < 0 ? "border-rose-500 focus:ring-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-blue-500"
                      )}
                    />
                    {Number(formData.price) < 0 && (
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                        <AlertTriangle size={10} /> O preço não pode ser negativo
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo</label>
                      {(formData.type === 'combo' || formData.type === 'kit') && (
                        <button 
                          type="button"
                          onClick={() => {
                            let totalCost = 0;
                            (formData.comboItems || []).forEach(item => {
                              const p = products.find(prod => prod.id === item.productId);
                              if (p) totalCost += p.cost * item.quantity;
                            });
                            setFormData({ ...formData, cost: totalCost });
                            addNotification('Custo recalculado com base nos itens.', 'info');
                          }}
                          className="text-[8px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                        >
                          Recalcular
                        </button>
                      )}
                    </div>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={formatCurrency(formData.cost || 0)}
                      onChange={(e) => handleCurrencyChange(e, 'cost')}
                      className={cn(
                        "w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 font-bold text-slate-900 dark:text-white transition-all",
                        Number(formData.cost) < 0 ? "border-rose-500 focus:ring-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-blue-500"
                      )}
                    />
                    {Number(formData.cost) < 0 && (
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                        <AlertTriangle size={10} /> O custo não pode ser negativo
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque Atual</label>
                    <input 
                      type="number" 
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Validade</label>
                    <input 
                      type="date" 
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque Mínimo</label>
                    <input 
                      type="number" 
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                      className={cn(
                        "w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 font-bold text-slate-900 dark:text-white transition-all",
                        Number(formData.minStock) > Number(formData.stock) ? "border-rose-500 focus:ring-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-blue-500"
                      )}
                    />
                    {Number(formData.minStock) > Number(formData.stock) && (
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                        <AlertTriangle size={10} /> Não pode ser maior que o estoque atual
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3 shrink-0">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
                >
                  Salvar Produto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gerenciar Categorias</h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nova Categoria</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ex: Cabelos"
                      className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                    />
                    <button 
                      onClick={handleAddCategory}
                      className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categorias Existentes</label>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                    {productCategories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 group hover:border-blue-200 transition-all">
                        <span className="font-bold text-slate-900 dark:text-white">{cat.name}</span>
                        <button 
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/40 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50">
                <button onClick={() => setIsCategoryModalOpen(false)} className="w-full py-3 bg-white dark:bg-slate-700 text-slate-600 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl font-black uppercase text-xs tracking-widest">Fechar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};

const CustomersView = ({ 
  customers, 
  setCustomers, 
  sales, 
  products,
  campaigns, 
  addNotification, 
  handleFirestoreError, 
  user, 
  formatDate, 
  formatCurrency,
  setSelectedCustomer,
  setActiveTab,
  ensureAuthSession
}: CustomersViewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS' | 'VIPS'>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCustomerForView, setSelectedCustomerForView] = useState<Customer | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'timeline'>('info');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    address: '',
    email: '',
    birthDate: '',
    notes: '',
    tags: [] as string[]
  });

  // Helper to get customer stats
  const getCustomerStats = (customerId: string) => {
    const customerSales = sales.filter(s => s.customerId === customerId && s.status === 'completed');
    const totalSpent = customerSales.reduce((acc, s) => acc + s.total, 0);
    const ticketMedioValue = customerSales.length > 0 ? totalSpent / customerSales.length : 0;
    
    const productFrequency: { [key: string]: { name: string, count: number } } = {};
    customerSales.forEach(s => {
      s.items.forEach(item => {
        if (!productFrequency[item.productId]) {
          productFrequency[item.productId] = { name: item.name, count: 0 };
        }
        productFrequency[item.productId].count += item.quantity;
      });
    });

    const preferredProductsValue = Object.values(productFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    const totalProfit = customerSales.reduce((acc, s) => {
      const saleCost = s.items.reduce((saleAcc, item) => {
        const product = products.find(p => p.id === item.productId);
        return saleAcc + ((product?.cost || 0) * item.quantity);
      }, 0);
      return acc + (s.total - saleCost);
    }, 0);

    const lastSale = customerSales.length > 0 
      ? new Date(Math.max(...customerSales.map(s => new Date(s.date).getTime())))
      : null;
    
    return { totalSpent, totalProfit, lastSale, ticketMedioValue, preferredProductsValue };
  };

  // Global Stats
  const totalProfitCRM = sales.reduce((acc, s) => acc + (s.commission || 0), 0);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const inactiveCount = customers.filter(c => {
    const { lastSale } = getCustomerStats(c.id);
    return !lastSale || lastSale < thirtyDaysAgo;
  }).length;

  const averageTicket = sales.length > 0 
    ? sales.reduce((acc, s) => acc + s.total, 0) / sales.length 
    : 0;

  const getCustomerTierBadge = (totalSpent: number) => {
    if (totalSpent >= 2000) return { label: 'OURO', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30', icon: <Trophy size={10} /> };
    if (totalSpent >= 800) return { label: 'PRATA', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/20', icon: <Star size={10} /> };
    return { label: 'BRONZE', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: <Target size={10} /> };
  };

  const filteredCustomers = customers.filter(c => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(search) || 
                         c.phone.includes(search) ||
                         (c.email && c.email.toLowerCase().includes(search));
    if (!matchesSearch) return false;

    const { lastSale, totalSpent } = getCustomerStats(c.id);
    const isActive = lastSale && lastSale >= thirtyDaysAgo;

    if (filter === 'ATIVOS') return isActive;
    if (filter === 'INATIVOS') return !isActive;
    if (filter === 'VIPS') return totalSpent >= 800; // PRATA or higher
    return true;
  });

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        city: customer.city || '',
        address: customer.address || '',
        email: customer.email || '',
        birthDate: customer.birthDate || '',
        notes: customer.notes || '',
        tags: customer.tags || []
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', city: '', address: '', email: '', birthDate: '', notes: '', tags: [] });
    }
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (customer: Customer) => {
    setSelectedCustomerForView(customer);
    setIsViewModalOpen(true);
  };

  const handleQuickSale = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveTab('atendimento');
    addNotification(`Iniciando atendimento para ${customer.name}`, 'info');
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      addNotification('Nome e telefone são obrigatórios.', 'warning');
      return;
    }

    // Auto format before counting
    const formatted = formatPhone(formData.phone);
    const phoneDigits = formatted.replace(/\D/g, '');
    
    if (phoneDigits.length < 10) {
      addNotification('Telefone inválido. Insira pelo menos 10 dígitos.', 'warning');
      return;
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      addNotification('E-mail inválido. Verifique o formato.', 'warning');
      return;
    }

    const customerData: Customer = {
      id: editingCustomer?.id || `C${Date.now()}`,
      ...formData,
      createdAt: editingCustomer?.createdAt || new Date().toISOString()
    };

    try {
      if (editingCustomer) {
        setCustomers(prev => prev.map(c => c.id === customerData.id ? customerData : c));
      } else {
        setCustomers(prev => [...prev, customerData]);
      }
      setIsModalOpen(false);
      addNotification(editingCustomer ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'success');
    } catch (error: any) {
      addNotification('Erro ao salvar cliente.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      setCustomers(prev => prev.filter(c => c.id !== id));
      addNotification('Cliente excluído.', 'info');
    } catch (error: any) {
      addNotification('Erro ao excluir cliente.', 'error');
    }
  };

  const sendWhatsAppCampaign = (customer: Customer, campaign: Campaign) => {
    const message = campaign.message.replace('{nome}', customer.name);
    const url = getWhatsAppUrl(customer.phone, message);
    window.open(url, '_blank');
    setIsCampaignModalOpen(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Gestão de Clientes (CRM)</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acompanhe o comportamento e fidelize seus clientes.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Clientes</p>
          <h4 className="text-3xl font-black text-slate-900 dark:text-white">{customers.length}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Lucro Total (CRM)</p>
          <h4 className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(totalProfitCRM)}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Inativos (+30D)</p>
          <h4 className="text-3xl font-black text-slate-900 dark:text-white">{inactiveCount}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Ticket Médio Geral</p>
          <h4 className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(averageTicket)}</h4>
        </div>
      </div>

      {/* CRM Actions & Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
            <Zap size={20} className="text-amber-500" />
            Sugestões de Ativação
          </h3>
          <div className="space-y-4">
            {customers
              .filter(c => {
                const { lastSale } = getCustomerStats(c.id);
                return !lastSale || lastSale < thirtyDaysAgo;
              })
              .slice(0, 5)
              .map(customer => {
                const { lastSale } = getCustomerStats(customer.id);
                const daysInactive = lastSale ? Math.floor((new Date().getTime() - new Date(lastSale).getTime()) / (1000 * 60 * 60 * 24)) : 'N/A';
                return (
                  <div key={customer.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 group hover:border-amber-200 transition-all">
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{customer.name}</p>
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{daysInactive} dias sem comprar</p>
                    </div>
                    <button 
                      onClick={() => {
                        const msg = `Olá ${customer.name}, sentimos sua falta aqui na Biobel! Preparamos um cupom especial de 10% para sua próxima visita: BIOBEL10. Esperamos você!`;
                        window.open(getWhatsAppUrl(customer.phone, msg), '_blank');
                      }}
                      className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl hover:bg-emerald-100 transition-all"
                      title="Enviar Oferta Recuperação"
                    >
                      <MessageCircle size={18} />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
            <Sparkles size={20} className="text-blue-500" />
            Aniversariantes do Mês
          </h3>
          <div className="space-y-4">
            {customers
              .filter(c => {
                   if (!c.birthDate) return false;
                   const birthMonth = new Date(c.birthDate).getMonth();
                   const currentMonth = new Date().getMonth();
                   return birthMonth === currentMonth;
              })
              .map(customer => (
                <div key={customer.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{customer.name}</p>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Aniversário em {new Date(customer.birthDate!).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                  </div>
                  <button 
                    onClick={() => {
                      const msg = `Parabéns ${customer.name}! 🎉 A Biobel deseja um feliz aniversário! Passe aqui para retirar um presente especial que preparamos para você hoje.`;
                      window.open(getWhatsAppUrl(customer.phone, msg), '_blank');
                    }}
                    className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-100 transition-all"
                  >
                    <Gift size={18} />
                  </button>
                </div>
              ))}
            {customers.filter(c => c.birthDate && new Date(c.birthDate).getMonth() === new Date().getMonth()).length === 0 && (
                <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-8 italic">Nenhum aniversariante este mês</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Filters & Search */}
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou telefone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm transition-all text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
            {(['TODOS', 'ATIVOS', 'INATIVOS', 'VIPS'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto hidden lg:block">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-6">Cliente</th>
                <th className="px-8 py-6">Contato & Local</th>
                <th className="px-8 py-6">Financeiro</th>
                <th className="px-8 py-6">Última Compra</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredCustomers.map((customer) => {
                const { totalSpent, totalProfit, lastSale } = getCustomerStats(customer.id);
                const isActive = lastSale && lastSale >= thirtyDaysAgo;
                const isVIP = totalSpent > 1000;

                return (
                  <tr key={customer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black uppercase text-lg">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight">{customer.name}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Desde {formatDate(customer.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate max-w-[200px]">{customer.phone}</p>
                      {customer.email && <p className="text-[9px] font-bold text-blue-500 uppercase truncate max-w-[200px]">{customer.email}</p>}
                      {customer.address && <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{customer.address}, {customer.city}</p>}
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-black text-slate-900 dark:text-white text-sm">{formatCurrency(totalSpent)}</p>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Lucro: {formatCurrency(totalProfit)}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        {lastSale ? lastSale.toLocaleDateString('pt-BR') : 'Nunca comprou'}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      {(() => {
                        const tier = getCustomerTierBadge(totalSpent);
                        return (
                          <div className="flex flex-col gap-1">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-fit",
                              tier.bg, tier.color, "border border-current opacity-80"
                            )}>
                              {tier.icon}
                              {tier.label}
                            </span>
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit",
                              isActive ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50' : 
                              'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            )}>
                              {isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleOpenModal(customer)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleOpenViewModal(customer)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                          title="Ver Detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleQuickSale(customer)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all"
                          title="Venda Rápida"
                        >
                          <Zap size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            window.open(getWhatsAppUrl(customer.phone), '_blank');
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                          title="WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Customers Cards */}
        <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredCustomers.map((customer) => {
            const { totalSpent, totalProfit, lastSale } = getCustomerStats(customer.id);
            const isActive = lastSale && lastSale >= thirtyDaysAgo;
            const isVIP = totalSpent > 1000;

            return (
              <div key={customer.id} className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-black uppercase text-base">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight">{customer.name}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{customer.phone}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    isVIP ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50' :
                    isActive ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50' : 
                    'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}>
                    {isVIP ? 'VIP' : isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Gasto</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(totalSpent)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Lucro Gerado</p>
                    <p className="text-sm font-black text-emerald-600">{formatCurrency(totalProfit)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {lastSale ? `Última compra: ${lastSale.toLocaleDateString('pt-BR')}` : 'Sem compras'}
                  </p>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleQuickSale(customer)}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all"
                    >
                      <Zap size={18} />
                    </button>
                    <button 
                      onClick={() => handleOpenViewModal(customer)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => handleOpenModal(customer)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for Add/Edit Customer */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preencha os dados cadastrais</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar text-slate-900 dark:text-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome Completo</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ex: Maria Silva"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp / Telefone</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="(51) 98524-2850"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cidade</label>
                  <input 
                    type="text" 
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ex: Porto Alegre"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço Físico / Bairro</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ex: Rua das Flores, 123 - Centro"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Nascimento</label>
                  <input 
                    type="date" 
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações / Notas</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  placeholder="Preferências, alergias, etc..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Modal for View Customer Details */}
      <AnimatePresence>
        {isViewModalOpen && selectedCustomerForView && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl">
                    {selectedCustomerForView.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {selectedCustomerForView.name}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ficha Cadastral do Cliente</p>
                  </div>
                </div>
                <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Tabs for Details vs Timeline */}
                <div className="col-span-full mb-2">
                  <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => setActiveDetailTab('info')}
                      className={cn(
                        "pb-4 px-2 text-[10px] font-black uppercase tracking-widest transition-all relative",
                        activeDetailTab === 'info' ? "text-blue-600" : "text-slate-400"
                      )}
                    >
                      Informações
                      {activeDetailTab === 'info' && <motion.div layoutId="activeDetailTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
                    </button>
                    <button 
                      onClick={() => setActiveDetailTab('timeline')}
                      className={cn(
                        "pb-4 px-2 text-[10px] font-black uppercase tracking-widest transition-all relative",
                        activeDetailTab === 'timeline' ? "text-blue-600" : "text-slate-400"
                      )}
                    >
                      Linha do Tempo
                      {activeDetailTab === 'timeline' && <motion.div layoutId="activeDetailTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
                    </button>
                  </div>
                </div>

                {activeDetailTab === 'info' ? (
                  <>
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp / Telefone</p>
                        <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase">
                          <MessageCircle size={16} className="text-emerald-500" />
                          {selectedCustomerForView.phone}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                        <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase">
                          <Mail size={16} className="text-blue-500" />
                          {selectedCustomerForView.email || 'Não informado'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço</p>
                        <p className="font-bold text-slate-900 dark:text-white text-sm uppercase">
                          {selectedCustomerForView.address || 'Não informado'}
                          {selectedCustomerForView.city ? ` - ${selectedCustomerForView.city}` : ''}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic font-medium">
                          {selectedCustomerForView.notes || 'Sem observações cadastradas.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-2xl border border-blue-100">
                          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Ticket Médio</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            {formatCurrency(getCustomerStats(selectedCustomerForView.id).ticketMedioValue)}
                          </p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-2xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Total Gasto</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            {formatCurrency(getCustomerStats(selectedCustomerForView.id).totalSpent)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Top Produtos</p>
                        <div className="flex flex-wrap gap-2">
                          {getCustomerStats(selectedCustomerForView.id).preferredProductsValue.length > 0 ? (
                            getCustomerStats(selectedCustomerForView.id).preferredProductsValue.map((p) => (
                              <span key={p.name} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-tight border border-slate-200 dark:border-slate-700">
                                {p.name} ({p.count}x)
                              </span>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-400 italic font-bold uppercase tracking-widest px-1">Sem histórico</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="col-span-full max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                      {/* Customer Birthday / Start */}
                      <div className="relative">
                        <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 border-2 border-white dark:border-slate-900 flex items-center justify-center text-blue-600 z-10">
                          <Users size={12} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(selectedCustomerForView.createdAt)}</p>
                          <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase mt-1">Cadastro Realizado</h5>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-1">Bem-vinda à família Biobel!</p>
                        </div>
                      </div>

                      {/* Sales as Timeline Events */}
                      {sales
                        .filter(s => s.customerId === selectedCustomerForView.id)
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map(sale => (
                          <div key={sale.id} className="relative">
                            <div className={cn(
                              "absolute -left-8 top-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center z-10",
                              sale.status === 'completed' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                            )}>
                              {sale.status === 'completed' ? <ShoppingBag size={12} /> : <X size={12} />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(sale.date)}</p>
                                <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase mt-1">
                                  {sale.status === 'completed' ? `Compra Realizada: ${formatCurrency(sale.total)}` : 'Venda Devolvida'}
                                </h5>
                                <p className="text-[9px] font-medium text-slate-500 uppercase tracking-tight mt-1 truncate max-w-md">
                                  {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                </p>
                                {sale.paymentMethod && (
                                  <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                    Pago via {sale.paymentMethod}
                                  </span>
                                )}
                            </div>
                          </div>
                        ))
                      }
                      
                      {/* Future Anniversary Indicator */}
                      {selectedCustomerForView.birthDate && (
                         <div className="relative">
                            <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 border-2 border-white dark:border-slate-900 flex items-center justify-center text-purple-600 z-10 animate-bounce">
                              <Gift size={12} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Todo ano • {new Date(selectedCustomerForView.birthDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                              <h5 className="text-xs font-black text-purple-900 dark:text-purple-200 uppercase mt-1">Dia Especial: Aniversário!</h5>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-1">Momento ideal para envio de mimos e cupons.</p>
                            </div>
                          </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Purchase History Section */}
              <div className="px-8 pb-8">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-4">
                    <History size={16} className="text-blue-600" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Histórico de Compras</h4>
                  </div>
                  
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                    {sales.filter(s => s.customerId === selectedCustomerForView.id).length > 0 ? (
                      sales
                        .filter(s => s.customerId === selectedCustomerForView.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(sale => (
                          <div key={sale.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
                            <div>
                              <p className="text-xs font-black text-slate-900 dark:text-white">{new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                              </p>
                              <p className="text-[9px] text-slate-500 truncate max-w-[200px]">
                                {sale.items.map(i => i.name).join(', ')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-blue-600">{formatCurrency(sale.total)}</p>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                sale.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {sale.status === 'completed' ? 'Concluída' : 'Devolvida'}
                              </span>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center py-4">Nenhuma compra registrada.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
                <button 
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleOpenModal(selectedCustomerForView);
                  }}
                  className="flex-1 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Editar Cadastro
                </button>
                <button 
                  onClick={() => handleQuickSale(selectedCustomerForView)}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Zap size={16} />
                  Nova Venda
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StaffView = ({ staff, setStaff, settings, setSettings, addNotification, handleFirestoreError, user, formatDate, ensureAuthSession }: StaffViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<Partial<Staff>>({
    name: '', role: 'CLT', startDate: new Date().toISOString().split('T')[0], phone: '', activities: []
  });

  const handleOpenModal = (s?: Staff) => {
    if (s) {
      setEditingStaff(s);
      setFormData(s);
    } else {
      setEditingStaff(null);
      setFormData({ name: '', role: 'CLT', startDate: new Date().toISOString().split('T')[0], phone: '', activities: [] });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      addNotification('Preencha nome e telefone.', 'warning');
      return;
    }

    const staffData = {
      ...formData,
      id: editingStaff?.id || `S${Date.now()}`
    } as Staff;

    try {
      if (editingStaff) {
        setStaff(prev => prev.map(s => s.id === editingStaff.id ? staffData : s));
      } else {
        setStaff(prev => [...prev, staffData]);
      }
      addNotification('Funcionário salvo com sucesso!', 'success');
      setIsModalOpen(false);
    } catch (error: any) {
      addNotification('Erro ao salvar funcionário.', 'error');
    }
  };

  const handleSaveSettings = async () => {
    try {
      addNotification('Configurações da loja salvas com sucesso!', 'success');
    } catch (error: any) {
      addNotification('Erro ao salvar configurações.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este funcionário?')) return;
    try {
      setStaff(prev => prev.filter(s => s.id !== id));
      addNotification('Funcionário removido.', 'info');
    } catch (error: any) {
      addNotification('Erro ao remover funcionário.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Staff Management Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors text-center space-y-4">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
          <Users size={32} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Equipe & Comissões</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">Controle de vendedoras, metas individuais e pagamentos.</p>
        </div>
      </div>

      {/* Staff List Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-900 uppercase tracking-tight">Equipe / Vendedoras</h3>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Novo Funcionário
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Função</th>
                <th className="px-6 py-4">Início</th>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      s.role === 'Dona' ? "bg-purple-100 text-purple-700" : 
                      s.role === 'CLT' ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{s.startDate.split('-').reverse().join('/')}</td>
                  <td className="px-6 py-4 text-slate-600">{s.phone}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleOpenModal(s)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {editingStaff ? 'Editar Funcionário' : 'Novo Funcionário'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome Completo</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Função / Contrato</label>
                      <select 
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      >
                        <option value="CLT">CLT</option>
                        <option value="Estagiária">Estagiária</option>
                        <option value="Dona">Dona</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Início</label>
                      <input 
                        type="date" 
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone / WhatsApp</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atividades / Funções</label>
                    <div className="space-y-2">
                      {formData.activities?.map((activity, index) => (
                        <div key={index} className="flex gap-2">
                          <input 
                            type="text" 
                            value={activity}
                            onChange={(e) => {
                              const newActs = [...(formData.activities || [])];
                              newActs[index] = e.target.value;
                              setFormData({ ...formData, activities: newActs });
                            }}
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                          />
                          <button 
                            onClick={() => {
                              const newActs = formData.activities?.filter((_, i) => i !== index);
                              setFormData({ ...formData, activities: newActs });
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const newActs = [...(formData.activities || []), ''];
                          setFormData({ ...formData, activities: newActs });
                        }}
                        className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest mt-2"
                      >
                        <Plus size={14} /> Adicionar Atividade
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 flex gap-3">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl font-black uppercase tracking-widest">Cancelar</button>
                  <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest">Salvar</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const FuncaoRotinaView = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const categories = [
    {
      title: "ROTINA DIÁRIA - CHECKLIST",
      icon: <ClipboardListIcon className="text-amber-600" size={20} />,
      bgColor: "bg-amber-50/50",
      borderColor: "border-amber-100",
      items: [
        { icon: <MessageCircle size={14} />, text: "☀️ Dar bom dia no grupo do WhatsApp" },
        { icon: <MessageSquare size={14} />, text: "💬 Responder clientes no WhatsApp" },
        { icon: <Smartphone size={14} />, text: "📸 Postar ofertas no Grupo e Status" },
        { icon: <Send size={14} />, text: "🚀 Disparar campanhas no privado" },
      ]
    },
    {
      title: "ORGANIZAÇÃO DA LOJA",
      icon: <LayoutGrid className="text-blue-600" size={20} />,
      bgColor: "bg-blue-50/50",
      borderColor: "border-blue-100",
      items: [
        { icon: <Sparkles size={14} />, text: "🧽 Tirar pó dos móveis e produtos" },
        { icon: <Package size={14} />, text: "📦 Reposição de produtos nas prateleiras" },
        { icon: <Store size={14} />, text: "🧹 Organizar a loja e vitrine" },
      ]
    },
    {
      title: "TREINO RÁPIDO (15 MIN)",
      subtitle: "ESCOLHER 1 PRODUTO E ESTUDAR: BENEFÍCIO, INDICAÇÃO, CONTRA INDICAÇÃO, ARGUMENTO DE VENDA.",
      icon: <BookOpen className="text-emerald-600" size={20} />,
      bgColor: "bg-emerald-50/50",
      borderColor: "border-emerald-100",
      items: [
        { icon: <TrendingUp size={14} />, text: "Conhecimento aumenta conversão" },
      ]
    },
    {
      title: "AÇÃO DE RELACIONAMENTO",
      subtitle: "REATIVAR CLIENTES QUE COMPRARAM HÁ 30-60 DIAS (LISTA DE CLIENTES NO WHATSAPP).",
      icon: <Users className="text-indigo-600" size={20} />,
      bgColor: "bg-indigo-50/50",
      borderColor: "border-indigo-100",
      items: [
        { icon: <Heart size={14} />, text: "Foco em retenção" },
      ]
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Função & Rotina</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atividades diárias da equipe Biobel</p>
        </div>
        <button 
          onClick={() => setActiveTab('routine')}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
        >
          <Edit2 size={16} />
          Editar Rotina
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors"
          >
            <div className={cn("p-6 flex items-center gap-4", cat.bgColor)}>
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm">
                {cat.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{cat.title}</h3>
                {cat.subtitle && (
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight mt-0.5">{cat.subtitle}</p>
                )}
              </div>
            </div>
            <div className="p-6 space-y-4 flex-1">
              {cat.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                  <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-tight">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const RoutineView = ({ routines, setRoutines, staff, addNotification, handleFirestoreError, user, formatDate, ensureAuthSession }: RoutineViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [formData, setFormData] = useState<Partial<Routine>>({
    staffId: '', staffName: '', date: new Date().toISOString().split('T')[0],
    activities: [
      { id: '1', description: '☀️ Dar bom dia no grupo do WhatsApp', completed: false },
      { id: '2', description: '💬 Responder clientes no WhatsApp', completed: false },
      { id: '3', description: '📸 Postar ofertas no Grupo e Status', completed: false },
      { id: '4', description: '🚀 Disparar campanhas no privado', completed: false },
      { id: '5', description: '🧹 Organizar a loja e vitrine', completed: false },
      { id: '6', description: '🧽 Tirar pó dos móveis e produtos', completed: false },
      { id: '7', description: '📦 Reposição de produtos nas prateleiras', completed: false },
    ]
  });

  const handleOpenModal = (r?: Routine) => {
    if (r) {
      setEditingRoutine(r);
      setFormData(r);
    } else {
      setEditingRoutine(null);
      setFormData({
        staffId: '', staffName: '', date: new Date().toISOString().split('T')[0],
        activities: [
          { id: '1', description: '☀️ Dar bom dia no grupo do WhatsApp', completed: false },
          { id: '2', description: '💬 Responder clientes no WhatsApp', completed: false },
          { id: '3', description: '📸 Postar ofertas no Grupo e Status', completed: false },
          { id: '4', description: '🚀 Disparar campanhas no privado', completed: false },
          { id: '5', description: '🧹 Organizar a loja e vitrine', completed: false },
          { id: '6', description: '🧽 Tirar pó dos móveis e produtos', completed: false },
          { id: '7', description: '📦 Reposição de produtos nas prateleiras', completed: false },
        ]
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.staffId) {
      addNotification('Selecione um funcionário.', 'warning');
      return;
    }

    const routineData = {
      ...formData,
      id: editingRoutine?.id || `R${Date.now()}`
    } as Routine;

    try {
      if (editingRoutine) {
        setRoutines(prev => prev.map(r => r.id === editingRoutine.id ? routineData : r));
      } else {
        setRoutines(prev => [routineData, ...prev]);
      }
      addNotification('Rotina salva com sucesso!', 'success');
      setIsModalOpen(false);
    } catch (error: any) {
      addNotification('Erro ao salvar rotina.', 'error');
    }
  };

  const updateActivityStatus = async (routineId: string, activityId: string, status: 'start' | 'complete' | 'reset') => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;

    const updatedActivities = routine.activities.map(a => {
      if (a.id === activityId) {
        if (status === 'start') {
          return { ...a, startedAt: new Date().toISOString(), completed: false };
        } else if (status === 'complete') {
          return { ...a, completedAt: new Date().toISOString(), completed: true };
        } else {
          return { ...a, startedAt: undefined, completedAt: undefined, completed: false };
        }
      }
      return a;
    });

    try {
      setRoutines(prev => prev.map(r => r.id === routineId ? { ...r, activities: updatedActivities } : r));
    } catch (error: any) {
      addNotification('Erro ao atualizar atividade.', 'error');
    }
  };

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return '';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diff = e - s;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const calculateTotalTime = (activities: RoutineActivity[]) => {
    let totalMs = 0;
    activities.forEach(a => {
      if (a.startedAt && a.completedAt) {
        totalMs += (new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime());
      }
    });
    if (totalMs === 0) return null;
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const [routineToDelete, setRoutineToDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      console.log('Excluindo rotina com ID:', id);
      setRoutines(prev => prev.filter(r => r.id !== id));
      addNotification('Rotina removida com sucesso.', 'info');
      setRoutineToDelete(null);
    } catch (error: any) {
      console.error('Erro ao excluir rotina:', error);
      addNotification('Erro ao remover rotina.', 'error');
    }
  };

  const [routineToReset, setRoutineToReset] = useState<string | null>(null);

  const resetAllActivities = (routineId: string) => {
    setRoutines(prev => prev.map(r => r.id === routineId ? {
      ...r,
      activities: r.activities.map(a => ({ ...a, startedAt: undefined, completedAt: undefined, completed: false }))
    } : r));
    addNotification('Rotina reiniciada com sucesso.', 'info');
    setRoutineToReset(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Rotinas Diárias</h3>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Nova Rotina
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routines.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
            <ClipboardListIcon size={48} className="mb-4 opacity-20" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Nenhum checklist iniciado hoje</h4>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1">Clique em "Nova Rotina" para começar o acompanhamento</p>
            <button 
              onClick={() => handleOpenModal()}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
            >
              Iniciar Primeiro Checklist
            </button>
          </div>
        )}
        {routines.map(routine => {
          const completedCount = routine.activities.filter(a => a.completed).length;
          const totalCount = routine.activities.length;
          const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

          return (
            <div key={routine.id} className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 p-8 space-y-6 transition-all hover:shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{routine.staffName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={12} className="text-blue-600" />
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{routine.date.split('-').reverse().join('/')}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoutineToReset(routine.id);
                    }} 
                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all" 
                    title="Reiniciar Tudo"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button onClick={() => handleOpenModal(routine)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"><Edit2 size={16} /></button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoutineToDelete(routine.id);
                    }} 
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                    title="Excluir Rotina"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {calculateTotalTime(routine.activities) && (
                <div className="bg-blue-600 dark:bg-blue-500 p-6 rounded-[24px] shadow-lg shadow-blue-100 dark:shadow-none text-white relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Clock size={24} className="animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest leading-none mb-1 opacity-80">Tempo Total Investido</p>
                      <p className="text-2xl font-black uppercase tracking-tight flex items-baseline gap-1">
                        {calculateTotalTime(routine.activities)}
                        <span className="text-[10px] font-bold opacity-60">Acumulado</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Progresso</span>
                  <span className={cn(percentage === 100 ? "text-emerald-500" : "text-blue-600")}>
                    {completedCount}/{totalCount} ({Math.round(percentage)}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className={cn("h-full rounded-full transition-all duration-500", percentage === 100 ? "bg-emerald-500" : "bg-blue-600")}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {routine.activities.map(activity => (
                  <div 
                    key={activity.id}
                    className={cn(
                      "w-full p-4 rounded-2xl border transition-all space-y-3",
                      activity.completed 
                        ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20" 
                        : activity.startedAt 
                          ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20"
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                        activity.completed 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      )}>
                        {activity.completed && <Check size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn("text-xs font-bold uppercase tracking-tight block truncate", activity.completed && "line-through opacity-60")}>
                          {activity.description}
                        </span>
                        {activity.completed && activity.startedAt && activity.completedAt && (
                          <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                            <Clock size={10} />
                            Tempo: {calculateDuration(activity.startedAt, activity.completedAt)}
                          </span>
                        )}
                        {activity.startedAt && !activity.completed && (
                          <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                            <Clock size={10} />
                            Em andamento...
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!activity.startedAt && !activity.completed && (
                        <button 
                          onClick={() => updateActivityStatus(routine.id, activity.id, 'start')}
                          className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-1"
                        >
                          <Zap size={10} />
                          Iniciar
                        </button>
                      )}
                      {activity.startedAt && !activity.completed && (
                        <button 
                          onClick={() => updateActivityStatus(routine.id, activity.id, 'complete')}
                          className="flex-1 py-1.5 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-1"
                        >
                          <CheckCircle size={10} />
                          Finalizar
                        </button>
                      )}
                      {(activity.startedAt || activity.completed) && (
                        <button 
                          onClick={() => updateActivityStatus(routine.id, activity.id, 'reset')}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-rose-500 transition-all"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {percentage === 100 && (
                <div className="pt-2 animate-in fade-in zoom-in duration-500">
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                    <CheckCircle size={16} className="text-emerald-500" />
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Todas as tarefas pagas!</p>
                  </div>
                </div>
              )}
            </div>
        );
        })}
      </div>

      {routines.length > 0 && (
        <div className="mt-12 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Análise de Produtividade</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo médio gasto por atividade</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-4">Ranking de Tempo (Média)</h4>
              <div className="space-y-4">
                {Array.from(new Set(routines.flatMap(r => r.activities.map(a => a.description)))).map(desc => {
                  const tasks = routines.flatMap(r => r.activities).filter(a => a.description === desc && a.startedAt && a.completedAt);
                  if (tasks.length === 0) return null;
                  
                  const totalMs = tasks.reduce((acc, t) => acc + (new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime()), 0);
                  const avgMs = totalMs / tasks.length;
                  const avgMin = Math.floor(avgMs / 60000);
                  const avgSec = Math.round((avgMs % 60000) / 1000);
                  
                  return (
                    <div key={desc} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[200px]">{desc}</span>
                        <span className="text-indigo-600">{avgMin}m {avgSec}s</span>
                      </div>
                      <div className="h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (avgMs / (10 * 60 * 1000)) * 100)}%` }}
                          className="h-full bg-indigo-500 rounded-full" 
                        />
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
                {routines.every(r => r.activities.every(a => !a.completedAt)) && (
                  <p className="text-[10px] text-slate-400 font-bold uppercase py-10 text-center">Aguardando conclusão de atividades para gerar estatísticas...</p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                <Trophy size={32} />
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Destaque de Agilidade</h4>
              {(() => {
                const completedTasks = routines.flatMap(r => r.activities).filter(a => a.startedAt && a.completedAt);
                if (completedTasks.length === 0) return <p className="text-[10px] text-slate-400 font-bold uppercase">Nenhuma atividade concluída ainda</p>;
                
                const fastest = completedTasks.reduce((prev, curr) => {
                  const currDiff = new Date(curr.completedAt!).getTime() - new Date(curr.startedAt!).getTime();
                  const prevDiff = new Date(prev.completedAt!).getTime() - new Date(prev.startedAt!).getTime();
                  return currDiff < prevDiff ? curr : prev;
                });

                return (
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full inline-block mb-2">Execução Recorde:</p>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">{fastest.description}</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{calculateDuration(fastest.startedAt, fastest.completedAt)}</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {routineToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Excluir Rotina?</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-tight">
                  Tem certeza que deseja remover este checklist? Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setRoutineToDelete(null)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => handleDelete(routineToDelete)}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-200 dark:shadow-none"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {routineToReset && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <RefreshCw size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Reiniciar Rotina?</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-tight">
                  Tem certeza que deseja zerar todos os tempos deste checklist? A ação não poderá ser desfeita.
                </p>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setRoutineToReset(null)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => resetAllActivities(routineToReset)}
                    className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-200 dark:shadow-none"
                  >
                    Reiniciar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {editingRoutine ? 'Editar Rotina' : 'Nova Rotina'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionário</label>
                  <select 
                    value={formData.staffId}
                    onChange={(e) => {
                      const s = staff.find(st => st.id === e.target.value);
                      setFormData({ ...formData, staffId: e.target.value, staffName: s?.name || '' });
                    }}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="">Selecione...</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atividades</label>
                  {formData.activities?.map((activity, index) => (
                    <div key={activity.id} className="flex gap-2">
                      <input 
                        type="text" 
                        value={activity.description}
                        onChange={(e) => {
                          const newActs = [...(formData.activities || [])];
                          newActs[index].description = e.target.value;
                          setFormData({ ...formData, activities: newActs });
                        }}
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                      />
                      <button 
                        onClick={() => {
                          const newActs = formData.activities?.filter((_, i) => i !== index);
                          setFormData({ ...formData, activities: newActs });
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-between items-center mt-2">
                    <button 
                      onClick={() => {
                        const newActs = [...(formData.activities || []), { id: Date.now().toString(), description: '', completed: false }];
                        setFormData({ ...formData, activities: newActs });
                      }}
                      className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest"
                    >
                      <Plus size={14} /> Adicionar Atividade
                    </button>
                    <button 
                      onClick={() => {
                        setFormData({
                          ...formData,
                          activities: [
                            { id: '1', description: '☀️ Dar bom dia no grupo do WhatsApp', completed: false },
                            { id: '2', description: '💬 Responder clientes no WhatsApp', completed: false },
                            { id: '3', description: '📸 Postar ofertas no Grupo e Status', completed: false },
                            { id: '4', description: '🚀 Disparar campanhas no privado', completed: false },
                            { id: '5', description: '🧹 Organizar a loja e vitrine', completed: false },
                            { id: '6', description: '🧽 Tirar pó dos móveis e produtos', completed: false },
                            { id: '7', description: '📦 Reposição de produtos nas prateleiras', completed: false },
                          ]
                        });
                      }}
                      className="flex items-center gap-2 text-amber-600 font-black uppercase text-[10px] tracking-widest"
                    >
                      <RefreshCw size={14} /> Modelo Padrão
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl font-black uppercase tracking-widest">Cancelar</button>
                <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest">Salvar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CampaignsView = ({ campaigns, setCampaigns, customers, sales, addNotification, handleFirestoreError, user, ensureAuthSession }: CampaignsViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<Partial<Campaign>>({
    name: '', message: '', type: 'custom'
  });

  const handleOpenModal = (c?: Campaign) => {
    if (c) {
      setEditingCampaign(c);
      setFormData(c);
    } else {
      setEditingCampaign(null);
      setFormData({ name: '', message: '', type: 'custom' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.message) {
      addNotification('Preencha nome e mensagem.', 'warning');
      return;
    }

    const campaignData = {
      ...formData,
      id: editingCampaign?.id || `C${Date.now()}`,
      createdAt: editingCampaign?.createdAt || new Date().toISOString()
    } as Campaign;

    try {
      if (editingCampaign) {
        setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? campaignData : c));
      } else {
        setCampaigns(prev => [...prev, campaignData]);
      }
      addNotification('Campanha salva com sucesso!', 'success');
      setIsModalOpen(false);
    } catch (error: any) {
      addNotification('Erro ao salvar campanha.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta campanha?')) return;
    try {
      setCampaigns(prev => prev.filter(c => c.id !== id));
      addNotification('Campanha removida.', 'info');
    } catch (error: any) {
      addNotification('Erro ao remover campanha.', 'error');
    }
  };

  const getTargetCount = (type: Campaign['type']) => {
    const today = new Date();
    
    if (type === 'new_customers') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      return customers.filter(c => c.createdAt && new Date(c.createdAt) >= sevenDaysAgo).length;
    }
    
    if (type === 'retention_30d') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      return customers.filter(customer => {
        const customerSales = sales.filter(s => s.customerId === customer.id);
        if (customerSales.length === 0) return true;
        
        const lastSaleDate = new Date(Math.max(...customerSales.map(s => new Date(s.date).getTime())));
        return lastSaleDate < thirtyDaysAgo;
      }).length;
    }
    
    return customers.length;
  };

  return (
    <div className="space-y-6">
      {/* Explanation Section */}
      <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Sparkles size={24} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Como usar as Campanhas?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div className="w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-black mb-2">1</div>
              <p className="text-xs font-bold leading-relaxed">Crie modelos de mensagens personalizados para diferentes ocasiões e públicos.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div className="w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-black mb-2">2</div>
              <p className="text-xs font-bold leading-relaxed">Vá até a aba "Clientes (CRM)" e clique no ícone do WhatsApp ao lado do cliente desejado.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div className="w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-black mb-2">3</div>
              <p className="text-xs font-bold leading-relaxed">Escolha a campanha e o sistema abrirá o WhatsApp com a mensagem pronta para enviar!</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
            <Megaphone size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Campanhas de Vendas</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engajamento e Fidelização</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={20} />
          Nova Campanha
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map(campaign => (
          <div key={campaign.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-6 space-y-4 flex-1">
              <div className="flex justify-between items-start">
                <span className={cn(
                  "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                  campaign.type === 'new_customers' ? "bg-emerald-100 text-emerald-700" :
                  campaign.type === 'retention_30d' ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                )}>
                  {campaign.type === 'new_customers' ? 'Novos Clientes' :
                   campaign.type === 'retention_30d' ? 'Retenção 30d' : 'Geral'}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => handleOpenModal(campaign)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(campaign.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                </div>
              </div>
              <div>
                <h4 className="font-black text-slate-900 uppercase tracking-tight line-clamp-1">{campaign.name}</h4>
                <p className="text-sm text-slate-500 line-clamp-2 mt-1 leading-relaxed">{campaign.message}</p>
              </div>
              <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">{getTargetCount(campaign.type)} Clientes Alvo</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Ativa</span>
                </div>
              </div>
            </div>
            <button className="w-full py-4 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
              <Send size={14} />
              Disparar via WhatsApp
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título da Campanha</label>
                  <input 
                    type="text" 
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Boas-vindas 10% OFF"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Público</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="new_customers">Novos Clientes (7 dias)</option>
                    <option value="retention_30d">Retenção (30 dias sem compra)</option>
                    <option value="custom">Público Geral</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensagem da Campanha</label>
                  <textarea 
                    value={formData.message || ''}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Escreva a mensagem que será enviada..."
                    rows={4}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl font-black uppercase tracking-widest">Cancelar</button>
                <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest">Salvar Campanha</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ConfigViewProps {
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  addNotification: (message: string, type?: Notification['type']) => void;
}

const ConfigView = ({ settings, setSettings, addNotification }: ConfigViewProps) => {
  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Configurações da Empresa</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Settings size={12} className="animate-spin-slow" />
            Gerencie as informações da sua loja e o estilo do recibo.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Dados da Empresa */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Store size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Dados da Empresa</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome da Loja</label>
                <input 
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({...settings, name: e.target.value.toUpperCase()})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone / WhatsApp</label>
                <input 
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({...settings, phone: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Chave</label>
                  <div className="flex flex-wrap gap-2">
                    {['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setSettings({...settings, pixKeyType: type as any})}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all",
                          settings.pixKeyType === type 
                            ? "bg-blue-600 text-white" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {type === 'PHONE' ? 'CELULAR' : type === 'RANDOM' ? 'ALEATÓRIA' : type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Chave PIX</label>
                  <input 
                    type="text"
                    placeholder={
                      settings.pixKeyType === 'PHONE' ? '(51) 99999-8888' :
                      settings.pixKeyType === 'CPF' ? '000.000.000-00' :
                      settings.pixKeyType === 'CNPJ' ? '00.000.000/0000-00' :
                      'Insira sua chave correspondente'
                    }
                    value={settings.pixKey || ''}
                    onChange={(e) => setSettings({...settings, pixKey: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="px-1 text-[8px] font-bold text-slate-400 uppercase tracking-tight">
                    <Info size={10} className="inline mr-1" />
                    {settings.pixKeyType === 'PHONE' 
                      ? 'Não precisa pôr o +55, o sistema adiciona para você.' 
                      : 'O sistema removerá pontos e traços automaticamente.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.pixEnabled || false}
                    onChange={(e) => setSettings({...settings, pixEnabled: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
                <div>
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Ativar QR Code PIX Dinâmico</p>
                  <p className="text-[9px] text-blue-400 font-bold uppercase mt-0.5">Gera o QR Code automático no carrinho</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Endereço Completo</label>
                <textarea 
                  value={settings.address}
                  onChange={(e) => setSettings({...settings, address: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 h-24 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Loja & Recibo */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center">
                <Smartphone size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Recibo e Cupom</h3>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'showLogo', label: 'Logo' },
                  { key: 'showAddress', label: 'Endereço' },
                  { key: 'showPhone', label: 'Telefone' },
                  { key: 'showInstagram', label: 'Instagram' },
                  { key: 'showSeller', label: 'Vendedora' },
                  { key: 'showDiscount', label: 'Descontos' }
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-100 dark:border-slate-700">
                    <input 
                      type="checkbox"
                      checked={settings.receiptConfig?.[item.key as keyof typeof settings.receiptConfig] as boolean}
                      onChange={(e) => setSettings({
                        ...settings, 
                        receiptConfig: {
                          ...(settings.receiptConfig || { showLogo: true, showAddress: true, showPhone: true, showInstagram: true, showDiscount: true, showSeller: true, customMessage: '' }), 
                          [item.key]: e.target.checked
                        }
                      })}
                      className="w-5 h-5 rounded bg-blue-100 border-none text-blue-600 focus:ring-0"
                    />
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase">{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mensagem do Rodapé</label>
                <textarea 
                  placeholder="Ex: Obrigado pela preferência! Volte sempre."
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none h-24"
                  value={settings.receiptConfig?.customMessage}
                  onChange={(e) => setSettings({
                    ...settings, 
                    receiptConfig: {
                      ...(settings.receiptConfig || { showLogo: true, showAddress: true, showPhone: true, showInstagram: true, showDiscount: true, showSeller: true, customMessage: '' }), 
                      customMessage: e.target.value
                    }
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-right">
          <button 
            onClick={() => addNotification('Configurações salvas com sucesso!', 'success')}
            className="px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-100 dark:shadow-none"
          >
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};

const BackupView = ({ 
  sales, setSales, 
  products, setProducts, 
  customers, setCustomers, 
  brands, setBrands, 
  productCategories, setProductCategories,
  fixedCosts, setFixedCosts, 
  monthlyGoals, setMonthlyGoals, 
  settings, setSettings,
  addNotification, handleFirestoreError, user 
}: BackupViewProps) => {
  const [isDangerZoneChecked, setIsDangerZoneChecked] = useState(false);
  const [autoBackups, setAutoBackups] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('biobel_system_backups');
    if (saved) setAutoBackups(JSON.parse(saved));
  }, []);

  const handleRestoreAutoBackup = (backup: any) => {
    if (!window.confirm(`Deseja restaurar o backup automático de ${new Date(backup.timestamp).toLocaleString()}? Isso substituirá todos os dados atuais.`)) return;
    
    const { data } = backup;
    if (data.sales) setSales(data.sales);
    if (data.products) setProducts(data.products);
    if (data.customers) setCustomers(data.customers);
    if (data.brands) setBrands(data.brands);
    if (data.productCategories) setProductCategories(data.productCategories);
    if (data.fixedCosts) setFixedCosts(data.fixedCosts);
    if (data.monthlyGoals) setMonthlyGoals(data.monthlyGoals);
    if (data.settings) setSettings(data.settings);
    
    addNotification('Backup restaurado com sucesso!', 'success');
  };

  const handleExportJSON = () => {
    const data = { sales, products, customers, brands, productCategories, fixedCosts, monthlyGoals };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_biobel_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    addNotification('Backup JSON gerado com sucesso!', 'success');
  };

  const handleRestoreJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.sales) setSales(data.sales);
        if (data.products) setProducts(data.products);
        if (data.customers) setCustomers(data.customers);
        if (data.brands) {
          const migratedBrands = data.brands.map((b: any, index: number) => 
            typeof b === 'string' ? { id: `B${Date.now()}${index}`, name: b } : b
          );
          setBrands(migratedBrands);
        }
        if (data.productCategories) setProductCategories(data.productCategories);
        if (data.fixedCosts) setFixedCosts(data.fixedCosts);
        if (data.monthlyGoals) setMonthlyGoals(data.monthlyGoals);
        addNotification('Dados restaurados com sucesso!', 'success');
      } catch (error) {
        addNotification('Erro ao ler o arquivo de backup.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sales Sheet
    const salesData = sales.map(s => ({
      ID: s.id,
      Data: s.date,
      Vendedora: s.vendedora,
      Total: s.total,
      Metodo: s.paymentMethod,
      Status: s.status,
      Itens: s.items.map(i => `${i.name} (${i.quantity}x)`).join(', ')
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

    XLSX.writeFile(wb, `dados_biobel_${new Date().toISOString().split('T')[0]}.xlsx`);
    addNotification('Planilha Excel gerada com sucesso!', 'success');
  };

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const findColIdx = (row: any[], keywords: string[]) => {
      if (!Array.isArray(row)) return -1;
      return row.findIndex(cell => 
        keywords.some(k => String(cell || '').toLowerCase().includes(k.toLowerCase()))
      );
    };

    const parseImportedDate = (val: any, fallbackStr: string = '') => {
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

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let foundData = false;

        // 1. Products
        const productsSheetName = workbook.SheetNames.find(n => 
          ['Produtos', 'PRODUTOS', 'Products', 'Estoque', 'ESTOQUE'].includes(n)
        );

        if (productsSheetName) {
          const sheet = workbook.Sheets[productsSheetName];
          const imported = XLSX.utils.sheet_to_json(sheet) as any[];
          const formatted: Product[] = imported.map(p => ({
            id: String(p.ID || p.id || Math.random().toString(36).substr(2, 9)),
            name: String(p.Nome || p.nome || p.Name || p.name || p.Produto || p.produto || ''),
            brand: String(p.Marca || p.marca || p.Brand || p.brand || ''),
            category: String(p.Categoria || p.categoria || p.Category || p.category || ''),
            price: Number(p.Preco || p.preço || p.Price || p.price || p.Valor || p.valor) || 0,
            cost: Number(p.Custo || p.custo || p.Cost || p.cost) || 0,
            stock: Number(p.Estoque || p.estoque || p.Stock || p.stock || p.Quantidade || p.quantidade) || 0,
            minStock: Number(p.Minimo || p.minimo || p.MinStock || p.min_stock) || 0,
            type: 'avulso'
          }));
          if (formatted.length > 0) {
            setProducts(formatted);
            addNotification(`${formatted.length} produtos importados!`, 'success');
            foundData = true;
          }
        }

        // 2. Sales
        const salesSheetName = workbook.SheetNames.find(n => 
          ['Vendas', 'VENDAS', 'Sales', 'Relatorio', 'RELATORIO'].includes(n)
        );
        const dateSheets = workbook.SheetNames.filter(name => /^\d{2}[./]\d{2}$/.test(name));

        if (salesSheetName || dateSheets.length > 0) {
          let allImportedSales: Sale[] = [];
          const sheetsToProcess = salesSheetName ? [salesSheetName] : dateSheets;

          sheetsToProcess.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            
            let sheetDate = new Date().toISOString().split('T')[0];
            const firstCell = String(rawData[0] ? rawData[0][0] : '');
            
            if (/^\d{1,2}[./-]\d{1,2}/.test(firstCell)) {
              sheetDate = parseImportedDate(firstCell.split(/\s/)[0]);
            } else if (/^\d{2}[./]\d{2}$/.test(sheetName)) {
              const [day, month] = sheetName.split(/[./]/);
              sheetDate = `${new Date().getFullYear()}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            // Detect Header
            let headerIdx = -1;
            let colMap: { [key: string]: number } = {};

            for (let i = 0; i < Math.min(rawData.length, 15); i++) {
              const row = rawData[i];
              const dIdx = findColIdx(row, ['dinheiro', 'espécie']);
              const tIdx = findColIdx(row, ['total', 'valor', 'preço', 'price', 'amount']);
              
              if (dIdx !== -1 || tIdx !== -1) {
                headerIdx = i;
                colMap = {
                  dinheiro: dIdx,
                  debito: findColIdx(row, ['débito', 'debito']),
                  credito: findColIdx(row, ['crédito', 'credito']),
                  pix: findColIdx(row, ['pix']),
                  link: findColIdx(row, ['link']),
                  vendedora: findColIdx(row, ['vendedora', 'vendedor', 'venda', 'staff', 'responsável']),
                  produto: findColIdx(row, ['produto', 'item', 'descrição', 'service']),
                  total: tIdx,
                  data: findColIdx(row, ['data', 'date']),
                  pagamento: findColIdx(row, ['pagamento', 'metodo', 'meio', 'forma']),
                  desconto: findColIdx(row, ['desconto', 'desc', 'off'])
                };
                break;
              }
            }

            if (headerIdx !== -1) {
              // Priority 1: Grid Mode (Multiple payment columns)
              if (colMap.dinheiro !== -1 || colMap.debito !== -1 || colMap.credito !== -1) {
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
                  if (String(row[0] || '').toLowerCase().includes('total')) break;

                  pMethods.forEach(pm => {
                    const colIdx = colMap[pm.key];
                    if (colIdx === -1 || colIdx === undefined) return;

                    const val = row[colIdx];
                    if (val === undefined || val === null || val === '') return;
                    
                    const numVal = typeof val === 'number' ? val : 
                      Number(String(val).replace(/[R$\s.]/g, '').replace(',', '.'));
                    
                    if (!isNaN(numVal) && numVal > 0) {
                      let vendor = colMap.vendedora !== -1 ? String(row[colMap.vendedora] || 'SISTEMA').toUpperCase() : 'SISTEMA';
                      if (vendor.includes('ALESAN')) vendor = 'ALESSANDRA';
                      else if (vendor.includes('LETICIA')) vendor = 'LETICIA';

                      const product = colMap.produto !== -1 ? String(row[colMap.produto] || 'VENDA IMPORTADA') : 'VENDA IMPORTADA';
                      const rowDate = colMap.data !== -1 ? parseImportedDate(row[colMap.data], sheetDate) : sheetDate;

                      allImportedSales.push({
                        id: `S-GRID-${sheetName}-${i}-${pm.key}-${Date.now()}`,
                        date: rowDate,
                        vendedora: vendor,
                        total: numVal,
                        discount: 0,
                        paymentMethod: pm.label,
                        status: 'completed',
                        items: [{ productId: 'imported', name: product, quantity: 1, price: numVal, total: numVal }]
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
                  if (String(row[colMap.total] || '').toLowerCase().includes('total')) break;

                  const total = typeof row[colMap.total] === 'number' ? row[colMap.total] : 
                    Number(String(row[colMap.total]).replace(/[R$\s.]/g, '').replace(',', '.'));
                  
                  if (!isNaN(total) && total > 0) {
                    const vendor = colMap.vendedora !== -1 ? String(row[colMap.vendedora] || 'SISTEMA').toUpperCase() : 'SISTEMA';
                    const product = colMap.produto !== -1 ? String(row[colMap.produto] || 'VENDA IMPORTADA') : 'VENDA IMPORTADA';
                    const rowDate = colMap.data !== -1 ? parseImportedDate(row[colMap.data], sheetDate) : sheetDate;
                    const method = colMap.pagamento !== -1 ? String(row[colMap.pagamento] || 'Outros') : 'Outros';
                    const discount = colMap.desconto !== -1 ? (Number(row[colMap.desconto]) || 0) : 0;

                    allImportedSales.push({
                      id: `S-ROW-${sheetName}-${i}-${Date.now()}`,
                      date: rowDate,
                      vendedora: vendor,
                      total,
                      discount,
                      paymentMethod: method,
                      status: 'completed',
                      items: [{ productId: 'imported', name: product, quantity: 1, price: total, total: total }]
                    });
                  }
                }
              }
            }
          });

          if (allImportedSales.length > 0) {
            setSales(prev => [...prev, ...allImportedSales]);
            addNotification(`${allImportedSales.length} registros de venda importados!`, 'success');
            foundData = true;
          }
        }

        // 3. Try to find Customers sheet
        const customersSheetName = workbook.SheetNames.find(n => 
          ['Clientes', 'CLIENTES', 'Customers', 'Contatos', 'CONTATOS'].includes(n)
        );

        if (customersSheetName) {
          const sheet = workbook.Sheets[customersSheetName];
          const imported = XLSX.utils.sheet_to_json(sheet) as any[];
          const formatted: Customer[] = imported.map(c => ({
            id: String(c.ID || c.id || Math.random().toString(36).substr(2, 9)),
            name: String(c.Nome || c.nome || c.Name || c.name || ''),
            phone: String(c.Telefone || c.telefone || c.Phone || c.phone || c.Celular || c.celular || ''),
            createdAt: c.CriadoEm || c.criado_em || new Date().toISOString()
          }));
          if (formatted.length > 0) {
            setCustomers(formatted);
            addNotification(`${formatted.length} clientes importados!`, 'success');
            foundData = true;
          }
        }

        // 4. Fallback: If nothing found yet, try the first sheet
        if (!foundData && workbook.SheetNames.length > 0) {
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const imported = XLSX.utils.sheet_to_json(firstSheet) as any[];
          
          if (imported.length > 0) {
            const firstRow = imported[0];
            const hasProductHeaders = ['Nome', 'nome', 'Produto', 'produto', 'Marca', 'marca'].some(h => h in firstRow);
            
            if (hasProductHeaders) {
              const formatted: Product[] = imported.map(p => ({
                id: String(p.ID || p.id || Math.random().toString(36).substr(2, 9)),
                name: String(p.Nome || p.nome || p.Produto || p.produto || ''),
                brand: String(p.Marca || p.marca || ''),
                category: String(p.Categoria || p.categoria || ''),
                price: Number(p.Preco || p.preço || p.Valor || p.valor) || 0,
                cost: Number(p.Custo || p.custo) || 0,
                stock: Number(p.Estoque || p.estoque) || 0,
                minStock: Number(p.Minimo || p.minimo) || 0,
                type: 'avulso'
              }));
              setProducts(formatted);
              addNotification(`${formatted.length} produtos importados da aba "${workbook.SheetNames[0]}"!`, 'success');
              foundData = true;
            }
          }
        }

        if (!foundData) {
          addNotification('Não foi possível identificar os dados na planilha. Verifique se os nomes das abas ou colunas estão corretos.', 'warning');
        }
      } catch (error) {
        addNotification('Erro ao importar planilha. Verifique o formato do arquivo.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearSales = async () => {
    if (!isDangerZoneChecked) return;
    if (!window.confirm('ATENÇÃO: Isso irá apagar TODO o histórico de vendas permanentemente. Deseja continuar?')) return;

    try {
      setSales([]);
      addNotification('Histórico de vendas limpo!', 'success');
    } catch (error: any) {
      addNotification('Erro ao limpar histórico.', 'error');
    }
  };

  const handleResetSystem = () => {
    if (!isDangerZoneChecked) return;
    if (!window.confirm('PERIGO: Isso irá resetar TODO o sistema para o estado inicial (vazio). Tem certeza?')) return;
    setSales([]);
    setProducts([]);
    setCustomers([]);
    setBrands([]);
    setFixedCosts([]);
    setMonthlyGoals([]);
    addNotification('Sistema resetado com sucesso!', 'success');
  };

  const handleRestoreDefaults = () => {
    if (!isDangerZoneChecked) return;
    if (!window.confirm('Isso irá restaurar os dados padrão do sistema. Deseja continuar?')) return;
    // Restore initial data
    setProducts([
      { id: '1', name: 'SHAMPOO TRUSS EQUILIBRIUM', brand: 'TRUSS', category: 'Cabelos', price: 129.90, cost: 80, stock: 15, minStock: 5 },
      { id: '2', name: 'BASE MELU MATTE', brand: 'MELU', category: 'Maquiagem', price: 39.90, cost: 20, stock: 24, minStock: 10 },
      { id: '3', name: 'BATOM NINA SECRETS', brand: 'NINA SECRETS', category: 'Maquiagem', price: 45.00, cost: 25, stock: 18, minStock: 8 },
      { id: '4', name: 'MÁSCARA WELLA INVIGO', brand: 'WELLA', category: 'Cabelos', price: 159.90, cost: 100, stock: 12, minStock: 5 },
      { id: '5', name: 'CORRETIVO VIZZELA', brand: 'VIZZELA', category: 'Maquiagem', price: 35.90, cost: 18, stock: 30, minStock: 10 },
    ]);
    setCustomers([
      { id: '1', name: 'JHONATAN SILVA', phone: '(11) 98888-7777', createdAt: new Date().toISOString() },
      { id: '2', name: 'MARIA OLIVEIRA', phone: '(11) 97777-6666', createdAt: new Date().toISOString() },
      { id: '3', name: 'CARLOS SANTOS', phone: '(11) 96666-5555', createdAt: new Date().toISOString() },
    ]);
    setBrands([
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
    addNotification('Dados padrão restaurados!', 'success');
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Cópia de Segurança & Dados</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Aqui você pode salvar seus dados, restaurar informações e importar planilhas com segurança.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-xl font-black uppercase text-[10px] tracking-widest border border-brand-100">
          <Info size={14} /> Não entendi — me explica
        </button>
      </div>

      {/* How to use correctly */}
      <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-3 text-slate-900">
            <Sparkles size={24} className="text-brand-600" />
            <h2 className="text-lg font-black uppercase tracking-tight">Entenda como seus dados são salvos:</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-brand-50 rounded-3xl border border-brand-100 space-y-4 col-span-2">
              <div className="flex items-center gap-3 text-brand-600">
                <Laptop size={24} />
                <h3 className="font-black uppercase tracking-widest text-sm">Modo Navegador (Local)</h3>
              </div>
              <p className="text-[11px] text-brand-800 font-bold leading-relaxed">
                Neste modo, os dados são salvos <strong>APENAS NESTE NAVEGADOR</strong>. 
                <br /><br />
                O sistema utiliza o armazenamento interno do seu navegador para manter suas informações seguras. 
                No entanto, se você limpar o histórico do navegador ou trocar de computador, os dados <strong>não aparecerão</strong>. 
                <strong>É fundamental realizar backups periódicos</strong> usando as ferramentas abaixo para garantir que você nunca perca suas informações.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-black">1</div>
              <h4 className="font-black text-xs uppercase tracking-widest">Salvar Backup</h4>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed">Crie uma cópia de segurança para garantir que não perderá nada.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-black">2</div>
              <h4 className="font-black text-xs uppercase tracking-widest">Fazer Alterações</h4>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed">Trabalhe no sistema, cadastre produtos ou importe planilhas.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-black">3</div>
              <h4 className="font-black text-xs uppercase tracking-widest">Restaurar se precisar</h4>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed">Se algo der errado ou quiser voltar atrás, use o arquivo salvo no passo 1.</p>
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 -right-10 -translate-y-1/2 opacity-5">
          <Database size={200} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm transition-all animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
              <History size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Histórico de Backups Automáticos</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">O sistema salva automaticamente às 10h e 17h para sua segurança</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
            <Zap size={10} className="animate-pulse" /> Ativo
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {autoBackups.length > 0 ? autoBackups.map((b) => (
            <div key={b.id} className="flex flex-col p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:border-blue-200 dark:hover:border-blue-900 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center font-black">
                  {b.hour}H
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {new Date(b.timestamp).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="mb-6">
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase">
                  Snapshot do Sistema
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                  {new Date(b.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Auto
                </p>
              </div>
              <button 
                onClick={() => handleRestoreAutoBackup(b)}
                className="w-full py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
              >
                Restaurar este ponto
              </button>
            </div>
          )) : (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
              <Database size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum backup automático disponível ainda</p>
            </div>
          )}
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Segurança Card */}
          <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Segurança</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proteja suas informações</p>
            </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Download size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Salvar cópia de segurança</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Guarde todos os seus dados para não perder nada. Recomendado fazer semanalmente.</p>
                </div>
              </div>
              <button 
                onClick={handleExportJSON}
                className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
              >
                <Download size={20} /> Salvar Backup no Computador
              </button>
              <p className="text-center text-[9px] text-slate-400 font-bold italic">
                <Info size={10} className="inline mr-1" /> Use "Salvar Backup" antes de fazer grandes mudanças no sistema.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Restaurar do arquivo</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Use um arquivo que você salvou anteriormente para recuperar seus dados.</p>
                </div>
              </div>
              <label className="w-full py-5 bg-white text-brand-600 border-2 border-brand-100 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 cursor-pointer hover:bg-brand-50 transition-all">
                <RefreshCw size={20} /> Selecionar arquivo de backup
                <input type="file" accept=".json" onChange={handleRestoreJSON} className="hidden" />
              </label>
              <p className="text-center text-[9px] text-slate-400 font-bold italic">
                <Info size={10} className="inline mr-1" /> Use "Restaurar" se algo der errado ou se trocar de computador.
              </p>
            </div>
          </div>
        </div>

        {/* Relatórios Card */}
        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Relatórios</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trabalhe com planilhas</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Exportar para Excel</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Gere uma planilha para ver seus dados no Excel ou enviar para o contador.</p>
                </div>
              </div>
              <button 
                onClick={handleExportExcel}
                className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-brand-100 hover:bg-brand-700 transition-all"
              >
                <FileText size={20} /> Baixar Dados em Excel
              </button>
              <p className="text-center text-[9px] text-slate-400 font-bold italic">
                <Info size={10} className="inline mr-1" /> Exemplo: Use "Exportar Excel" para conferir os dados ou enviar ao contador.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 text-slate-600 rounded-xl">
                  <Database size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Importar Planilha</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Envie uma planilha de vendas externa para dentro do sistema.</p>
                </div>
              </div>
              <label className="w-full py-5 bg-white text-slate-900 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all">
                <Database size={20} /> Enviar Planilha para o Sistema
                <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
              </label>
              <p className="text-center text-[9px] text-slate-400 font-bold italic">
                <Sparkles size={10} className="inline mr-1 text-amber-500" /> Não sabe o que escolher? Comece salvando um backup.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Avançado (Perigo) */}
      <div className="bg-slate-900 rounded-[40px] p-10 space-y-10 border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-4 text-rose-500">
          <AlertTriangle size={32} />
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Avançado (Perigo)</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações que não podem ser desfeitas</p>
          </div>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-500 text-white rounded-2xl">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-2">
              <h4 className="text-rose-500 font-black uppercase tracking-widest text-xs">Antes de clicar, leia:</h4>
              <ul className="text-[10px] text-rose-400 font-bold space-y-1 list-disc list-inside">
                <li>Isso vai apagar TODOS os dados do sistema</li>
                <li>Não pode ser desfeito (sem volta)</li>
                <li>Recomendamos salvar um backup antes</li>
              </ul>
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 bg-rose-500/5 rounded-2xl cursor-pointer group">
            <input 
              type="checkbox" 
              checked={isDangerZoneChecked}
              onChange={(e) => setIsDangerZoneChecked(e.target.checked)}
              className="w-6 h-6 rounded-lg border-2 border-rose-500/30 bg-transparent text-rose-500 focus:ring-0"
            />
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest group-hover:text-rose-400 transition-colors">
              Eu entendo que isso não tem volta
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button 
            onClick={handleClearSales}
            disabled={!isDangerZoneChecked}
            className={cn(
              "py-6 rounded-3xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-3 transition-all",
              isDangerZoneChecked ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20" : "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50"
            )}
          >
            <Trash2 size={24} /> Limpar Histórico de Vendas
          </button>
          <button 
            onClick={handleResetSystem}
            disabled={!isDangerZoneChecked}
            className={cn(
              "py-6 rounded-3xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-3 transition-all",
              isDangerZoneChecked ? "bg-rose-600 text-white shadow-lg shadow-rose-900/50 hover:bg-rose-700" : "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50"
            )}
          >
            <AlertTriangle size={24} /> Resetar Todo o Sistema
          </button>
          <button 
            onClick={handleRestoreDefaults}
            disabled={!isDangerZoneChecked}
            className={cn(
              "py-6 rounded-3xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-3 transition-all",
              isDangerZoneChecked ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50"
            )}
          >
            <RefreshCw size={24} /> Restaurar Dados Padrão
          </button>
        </div>
      </div>
    </div>
  );
};

const SaleRow = React.memo(({ sale, formatCurrency, handleStatusChange, setSelectedSale }: { 
  sale: Sale, 
  formatCurrency: (v: number) => string, 
  handleStatusChange: (id: string, s: string) => void,
  setSelectedSale: (s: Sale) => void
}) => {
  const isKit = sale.category?.toLowerCase().includes('kit') || sale.items.some(i => i.name.toLowerCase().includes('kit'));
  const isCombo = sale.category?.toLowerCase().includes('combo') || sale.items.some(i => i.name.toLowerCase().includes('combo'));

  return (
    <tr className={cn(
      "hover:bg-slate-50 transition-colors",
      isKit ? "bg-purple-50/40 dark:bg-purple-900/10" : 
      isCombo ? "bg-indigo-50/40 dark:bg-indigo-900/10" : ""
    )}>
    <td className="px-6 py-4">
      <div className="flex flex-col">
        <span className="text-xs font-black text-slate-900">{new Date(sale.date).toLocaleDateString('pt-BR')}</span>
        <span className="text-[10px] font-bold text-slate-400">{new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black">
          {sale.vendedora?.charAt(0)}
        </div>
        <span className="text-xs font-bold text-slate-700">{sale.vendedora}</span>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="flex flex-col">
        <span className="text-xs font-bold text-slate-700">{sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}</span>
        <span className="text-[9px] text-slate-400 font-medium truncate max-w-[120px]">
          {sale.items.map(i => i.name).join(', ')}
        </span>
      </div>
    </td>
    <td className="px-6 py-4">
      <span className={cn(
        "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
        isKit ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
        isCombo ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" :
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      )}>
        {sale.category || 'VENDA À VISTA'}
      </span>
    </td>
    <td className="px-6 py-4">
      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
        {sale.paymentMethod}
      </span>
    </td>
    <td className="px-6 py-4 text-center">
      <select
        value={sale.status}
        onChange={(e) => handleStatusChange(sale.id, e.target.value)}
        className={cn(
          "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border-none focus:ring-2 focus:ring-blue-500 cursor-pointer",
          sale.status === 'completed' || sale.status === 'Concluída' ? "bg-emerald-100 text-emerald-700" : 
          sale.status === 'returned' || sale.status === 'Devolvida' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
        )}
      >
        <option value="Concluída">Concluída</option>
        <option value="Devolvida">Devolvida</option>
        <option value="Pendente">Pendente</option>
      </select>
    </td>
    <td className="px-6 py-4 text-center">
      <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">
        {sale.type || 'Presencial'}
      </span>
    </td>
    <td className="px-6 py-4 text-right">
      <span className="text-xs font-black text-emerald-600">{formatCurrency(sale.commission || 0)}</span>
    </td>
    <td className="px-6 py-4 text-right">
      <span className="text-sm font-black text-slate-900">{formatCurrency(sale.total)}</span>
    </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button 
                      onClick={() => setSelectedSale(sale)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Ver Detalhes"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const msg = `Olá ${sale.customerName}! 🌸 Aqui é da Biobel. Gostaríamos de saber o que achou da sua compra. De 0 a 10, como você avalia sua experiência conosco?`;
                        window.open(getWhatsAppUrl(sale.customerPhone || '', msg), '_blank');
                      }}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      title="Enviar NPS (Satisfação)"
                    >
                      <MessageSquare size={18} />
                    </button>
                  </div>
                </td>
  </tr>
  );
});

const SaleMobileCard = React.memo(({ sale, formatCurrency, handleStatusChange, setSelectedSale }: { 
  sale: Sale, 
  formatCurrency: (v: number) => string, 
  handleStatusChange: (id: string, s: string) => void,
  setSelectedSale: (s: Sale) => void
}) => {
  const isKit = sale.category?.toLowerCase().includes('kit') || sale.items.some(i => i.name.toLowerCase().includes('kit'));
  const isCombo = sale.category?.toLowerCase().includes('combo') || sale.items.some(i => i.name.toLowerCase().includes('combo'));

  return (
    <div className={cn(
      "p-4 space-y-3",
      isKit ? "bg-purple-50/40 dark:bg-purple-900/10" : 
      isCombo ? "bg-indigo-50/40 dark:bg-indigo-900/10" : ""
    )}>
    <div className="flex justify-between items-start">
      <div className="flex flex-col">
        <span className="text-xs font-black text-slate-900">{new Date(sale.date).toLocaleDateString('pt-BR')}</span>
        <span className="text-[10px] font-bold text-slate-400">{new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <span className="text-sm font-black text-slate-900">{formatCurrency(sale.total)}</span>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black">
          {sale.vendedora?.charAt(0)}
        </div>
        <span className="text-xs font-bold text-slate-700">{sale.vendedora}</span>
      </div>
      <select
        value={sale.status}
        onChange={(e) => handleStatusChange(sale.id, e.target.value)}
        className={cn(
          "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border-none focus:ring-2 focus:ring-blue-500 cursor-pointer",
          sale.status === 'completed' || sale.status === 'Concluída' ? "bg-emerald-100 text-emerald-700" : 
          sale.status === 'returned' || sale.status === 'Devolvida' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
        )}
      >
        <option value="Concluída">Concluída</option>
        <option value="Devolvida">Devolvida</option>
        <option value="Pendente">Pendente</option>
      </select>
    </div>
    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
      <div className="flex gap-2">
        <span className={cn(
          "px-2 py-1 rounded-lg",
          isKit ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
          isCombo ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" :
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
        )}>
          {sale.category || 'VENDA À VISTA'}
        </span>
        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">
          {sale.paymentMethod}
        </span>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => setSelectedSale(sale)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
        >
          <Eye size={18} />
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            const msg = `Olá ${sale.customerName}! 🌸 Aqui é da Biobel. Gostaríamos de saber o que achou da sua compra. De 0 a 10, como você avalia sua experiência conosco?`;
            window.open(getWhatsAppUrl(sale.customerPhone || '', msg), '_blank');
          }}
          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
          title="Enviar NPS (Satisfação)"
        >
          <MessageSquare size={18} />
        </button>
      </div>
    </div>
    </div>
  );
});

const SalesView = ({ 
  sales, 
  setSales, 
  customers, 
  formatDate, 
  formatCurrency, 
  handleFirestoreError, 
  user, 
  ensureAuthSession, 
  addNotification,
  isCashierOpen,
  setCurrentView,
  selectedMonth,
  setSelectedMonth,
  monthlyGoals
}: SalesViewProps & { isCashierOpen: boolean, setCurrentView: (v: string) => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState<'this_month' | 'last_30_days' | 'last_90_days' | 'all' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'timeline'>('info');

  useEffect(() => {
    if (selectedSale) {
      setEditingNotes(selectedSale.notes || '');
    }
  }, [selectedSale]);

  const handleUpdateNotes = async () => {
    if (!selectedSale) return;
    try {
      setSales(prev => prev.map(s => s.id === selectedSale.id ? { ...s, notes: editingNotes } : s));
      addNotification('Observações da venda atualizadas!', 'success');
      setSelectedSale(prev => prev ? { ...prev, notes: editingNotes } : null);
    } catch (error: any) {
      addNotification('Erro ao atualizar observações.', 'error');
    }
  };

  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    let result = sales.filter(s => {
      const matchesSearch = s.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.vendedora?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusValue = s.status === 'completed' ? 'Concluída' : 
                          s.status === 'returned' ? 'Devolvida' : 
                          s.status === 'pending' ? 'Pendente' : s.status;

      const matchesStatus = statusFilter ? statusValue === statusFilter : true;
      
      const saleDate = new Date(s.date);
      const saleMonth = saleDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      
      let matchesTime = true;
      if (timeFilter === 'this_month') {
        matchesTime = saleMonth === selectedMonth;
      } else if (timeFilter === 'last_30_days') {
        matchesTime = saleDate >= thirtyDaysAgo;
      } else if (timeFilter === 'last_90_days') {
        matchesTime = saleDate >= ninetyDaysAgo;
      } else if (timeFilter === 'custom') {
        const matchesStartDate = startDate ? saleDate >= new Date(startDate + 'T00:00:00') : true;
        const matchesEndDate = endDate ? saleDate <= new Date(endDate + 'T23:59:59') : true;
        matchesTime = matchesStartDate && matchesEndDate;
      }
      
      return matchesSearch && matchesStatus && matchesTime;
    });

    // Default sort by date descending
    result = [...result].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sortOrder) {
      result = [...result].sort((a, b) => {
        if (sortOrder === 'asc') return a.total - b.total;
        return b.total - a.total;
      });
    }

    return result;
  }, [sales, searchTerm, statusFilter, sortOrder, timeFilter, startDate, endDate, selectedMonth]);

  const handleStatusChange = useCallback(async (saleId: string, newStatus: string) => {
    try {
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: newStatus } : s));
      addNotification('Status da venda atualizado!', 'success');
    } catch (error: any) {
      addNotification('Erro ao atualizar status.', 'error');
    }
  }, [setSales, addNotification]);

  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>();
    sales.forEach(s => {
      const statusValue = s.status === 'completed' ? 'Concluída' : 
                          s.status === 'returned' ? 'Devolvida' : 
                          s.status === 'pending' ? 'Pendente' : s.status;
      if (statusValue) statuses.add(statusValue);
    });
    return Array.from(statuses).sort();
  }, [sales]);

  const salesSummary = useMemo(() => {
    return {
      count: filteredSales.length,
      total: filteredSales.reduce((acc, s) => acc + s.total, 0)
    };
  }, [filteredSales]);

  return (
    <div className="space-y-4">
      {/* Sales Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Vendas</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{salesSummary.count}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ShoppingCart size={24} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento Total</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{formatCurrency(salesSummary.total)}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar vendas..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            {[
              { id: 'this_month', label: 'Este Mês' },
              { id: 'last_30_days', label: '30 Dias' },
              { id: 'last_90_days', label: '90 Dias' },
              { id: 'all', label: 'Tudo' },
              { id: 'custom', label: 'Personalizado' },
            ].map((period) => (
              <button
                key={period.id}
                onClick={() => setTimeFilter(period.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  timeFilter === period.id 
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {period.label}
              </button>
            ))}
          </div>

          {timeFilter === 'this_month' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <Calendar size={16} className="text-slate-400" />
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-0 cursor-pointer p-0"
              >
                <option key={selectedMonth} value={selectedMonth}>{selectedMonth}</option>
                {monthlyGoals.filter(g => g.month !== selectedMonth).map(g => (
                  <option key={g.id} value={g.month}>{g.month}</option>
                ))}
              </select>
            </div>
          )}

          {timeFilter === 'custom' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <Calendar size={16} className="text-slate-400" />
              <div className="flex items-center gap-1">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-0 cursor-pointer p-0 w-24"
                />
                <span className="text-slate-300 font-bold">ATÉ</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-0 cursor-pointer p-0 w-24"
                />
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <Filter size={16} className="text-slate-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-0 cursor-pointer"
            >
              <option value="">Todos os Status</option>
              {availableStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200">
            <Download size={20} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto hidden lg:block">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Data / Hora</th>
              <th className="px-6 py-4">Vendedora</th>
              <th className="px-6 py-4">Itens</th>
              <th className="px-6 py-4">Categoria</th>
              <th className="px-6 py-4">Pagamento</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center">Tipo</th>
              <th className="px-6 py-4 text-right">Comissão</th>
              <th 
                className="px-6 py-4 text-right cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              >
                <div className="flex items-center justify-end gap-1">
                  Total
                  <TrendingUp size={12} className={cn(sortOrder === 'asc' && "rotate-180", !sortOrder && "opacity-0")} />
                </div>
              </th>
              <th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.slice(0, visibleCount).map((sale) => (
              <SaleRow key={sale.id} sale={sale} formatCurrency={formatCurrency} handleStatusChange={handleStatusChange} setSelectedSale={setSelectedSale} />
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredSales.length > visibleCount && (
        <div className="p-6 text-center border-t border-slate-100">
          <button 
            onClick={() => setVisibleCount(prev => prev + 20)}
            className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Carregar Mais ({filteredSales.length - visibleCount} restantes)
          </button>
        </div>
      )}

      {/* Mobile Sales Cards */}
      <div className="lg:hidden divide-y divide-slate-100">
        {filteredSales.slice(0, visibleCount).map((sale) => (
          <SaleMobileCard key={sale.id} sale={sale} formatCurrency={formatCurrency} handleStatusChange={handleStatusChange} setSelectedSale={setSelectedSale} />
        ))}
        {filteredSales.length > visibleCount && (
          <div className="p-4 text-center">
            <button 
              onClick={() => setVisibleCount(prev => prev + 20)}
              className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Carregar Mais
            </button>
          </div>
        )}
      </div>

      {/* Sale Details Modal */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Detalhes da Venda</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {selectedSale.id}</p>
                </div>
                <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                    <p className="text-sm font-bold text-slate-900">{selectedSale.customerName}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vendedora</p>
                    <p className="text-sm font-bold text-slate-900">{selectedSale.vendedora}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data / Hora</p>
                    <p className="text-sm font-bold text-slate-900">{new Date(selectedSale.date).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pagamento</p>
                    <p className="text-sm font-bold text-slate-900">{selectedSale.paymentMethod}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens da Venda</h4>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest">
                        <tr>
                          <th className="px-4 py-3">Produto</th>
                          <th className="px-4 py-3 text-center">Qtd</th>
                          <th className="px-4 py-3 text-right">Preço</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedSale.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 font-bold text-slate-700">{item.name}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-500">{item.quantity}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-500">{formatCurrency(item.price)}</td>
                            <td className="px-4 py-3 text-right font-black text-slate-900">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações da Venda</h4>
                    <MessageSquare size={14} className="text-slate-300" />
                  </div>
                  <div className="space-y-3">
                    <textarea 
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      rows={3}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                      placeholder="Adicione observações sobre esta venda..."
                    />
                    <button 
                      onClick={handleUpdateNotes}
                      className="w-full py-2 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all"
                    >
                      Salvar Observações
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      selectedSale.status === 'Concluída' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {selectedSale.status}
                    </span>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total da Venda</p>
                    <p className="text-2xl font-black text-blue-600">{formatCurrency(selectedSale.total)}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={async () => {
                    if (!confirm('Deseja realmente registrar a devolução desta venda?')) return;
                    try {
                      setSales(prev => prev.map(s => s.id === selectedSale.id ? { ...s, status: 'returned' } : s));
                      addNotification('Devolução registrada com sucesso!', 'success');
                      setSelectedSale(null);
                    } catch (error) {
                      addNotification('Erro ao processar devolução.', 'error');
                    }
                  }}
                  disabled={selectedSale.status === 'returned'}
                  className={cn(
                    "flex-1 py-4 border border-rose-200 text-rose-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-50 transition-all",
                    selectedSale.status === 'returned' && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Devolução
                </button>
                <button 
                  onClick={() => setSelectedSale(null)}
                  className="flex-[2] py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-100 transition-all"
                >
                  Fechar Detalhes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};

const CashierView = ({ formatCurrency, isCashierOpen, currentSession, sessions, sales, onOpenCashier, onCloseCashier, onAddWithdrawal, formatDate }: CashierViewProps) => {
  const [openingBalance, setOpeningBalance] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [transactionType, setTransactionType] = useState<'withdrawal' | 'reinforcement'>('withdrawal');
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);

  const totalWithdrawals = currentSession?.withdrawals.filter(w => w.type === 'withdrawal').reduce((acc, w) => acc + w.amount, 0) || 0;
  const totalReinforcements = currentSession?.withdrawals.filter(w => w.type === 'reinforcement').reduce((acc, w) => acc + w.amount, 0) || 0;
  const estimatedCash = currentSession ? (currentSession.openingBalance + currentSession.payments.dinheiro + totalReinforcements - totalWithdrawals) : 0;
  
  const pix = currentSession?.payments.pix || 0;
  const debito = currentSession?.payments.debito || 0;
  const credito = currentSession?.payments.credito || 0;
  const dinheiro = currentSession?.payments.dinheiro || 0;
  const outros = currentSession?.payments.outros || 0;

  const sessionSales = sales.filter(s => s.sessionId === currentSession?.id);
  const allTransactions = [
    ...(currentSession?.withdrawals.map(w => ({ ...w, isSale: false })) || []),
    ...sessionSales.map(s => ({
      id: s.id,
      amount: s.total,
      reason: `Venda: ${s.customerName}`,
      time: s.date,
      type: 'reinforcement' as const,
      isSale: true,
      paymentMethod: s.paymentMethod
    }))
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Controle de Caixa</h2>
          <span className={cn(
            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
            isCashierOpen ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
          )}>
            {isCashierOpen ? 'ABERTO' : 'FECHADO'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <History size={16} />
            Histórico
          </button>
          {isCashierOpen ? (
            <button 
              onClick={() => setIsCloseModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
            >
              <X size={16} />
              Fechar Caixa
            </button>
          ) : (
            <button 
              onClick={() => setIsOpeningModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              <Plus size={16} />
              Abrir Caixa
            </button>
          )}
        </div>
      </div>

      {/* Main Balance Card */}
      <div className="bg-white rounded-2xl lg:rounded-[40px] p-6 lg:p-10 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none hidden lg:block">
          <DollarSign size={240} className="text-slate-900" />
        </div>
        
        <div className="relative z-10 space-y-6 lg:space-y-8">
          <div className="space-y-2">
            <p className="text-slate-400 text-[10px] lg:text-xs font-black uppercase tracking-widest">TOTAL EM CAIXA (DINHEIRO)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl lg:text-3xl font-black text-slate-400">R$</span>
              <h3 className="text-4xl lg:text-7xl font-black text-slate-900 tracking-tighter">
                {estimatedCash.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
            <button 
              disabled={!isCashierOpen}
              onClick={() => {
                setTransactionType('reinforcement');
                setWithdrawalReason('');
                setWithdrawalAmount('');
                setIsWithdrawalModalOpen(true);
              }}
              className="flex items-center justify-center gap-3 px-6 lg:px-8 py-3 lg:py-4 bg-blue-600 text-white rounded-xl lg:rounded-2xl font-black uppercase text-[10px] lg:text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={18} />
              Reforço de Caixa
            </button>
            <button 
              disabled={!isCashierOpen}
              onClick={() => {
                setTransactionType('withdrawal');
                setWithdrawalReason('');
                setWithdrawalAmount('');
                setIsWithdrawalModalOpen(true);
              }}
              className="flex items-center justify-center gap-3 px-6 lg:px-8 py-3 lg:py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-xl lg:rounded-2xl font-black uppercase text-[10px] lg:text-xs tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={18} />
              Sangria / Saída
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DINHEIRO</p>
          <p className="text-xl font-black text-emerald-500">
            {formatCurrency(dinheiro)}
          </p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PIX</p>
          <p className="text-xl font-black text-blue-500">
            {formatCurrency(pix)}
          </p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DÉBITO</p>
          <p className="text-xl font-black text-amber-500">
            {formatCurrency(debito)}
          </p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CRÉDITO</p>
          <p className="text-xl font-black text-purple-500">
            {formatCurrency(credito)}
          </p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OUTROS</p>
          <p className="text-xl font-black text-slate-500">
            {formatCurrency(outros)}
          </p>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Movimentações Recentes</h3>
          <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Ver todas</button>
        </div>
        <div className="p-0">
          {allTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">Nenhuma movimentação registrada hoje.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Horário</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo / Detalhe</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allTransactions.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{formatDate(t.time)}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest",
                          t.isSale ? "bg-emerald-50 text-emerald-600" :
                          t.type === 'withdrawal' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {t.isSale ? 'Venda' : (t.type === 'withdrawal' ? 'Sangria' : 'Reforço')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 uppercase">{t.reason}</span>
                          {t.isSale && <span className="text-[9px] text-slate-400 font-bold uppercase">{t.paymentMethod}</span>}
                        </div>
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-sm font-black text-right",
                        t.type === 'withdrawal' ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {t.type === 'withdrawal' ? '-' : '+'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Opening Modal */}
      <AnimatePresence>
        {isOpeningModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-8 bg-blue-600 text-white text-center space-y-2">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet size={32} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Abertura de Caixa</h3>
                <p className="text-blue-100 text-sm font-bold uppercase tracking-widest">Inicie o expediente</p>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Inicial em Caixa (R$)</label>
                  <input 
                    type="number" 
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="0,00"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-black text-2xl text-center"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsOpeningModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest">Cancelar</button>
                  <button 
                    onClick={() => {
                      onOpenCashier(Number(openingBalance) || 0);
                      setIsOpeningModalOpen(false);
                      setOpeningBalance('');
                    }}
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100"
                  >
                    Abrir Caixa
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sangria/Reforço Modal */}
      <AnimatePresence>
        {isWithdrawalModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Realizar {transactionType === 'withdrawal' ? 'Sangria' : 'Reforço'}</h3>
                <button onClick={() => setIsWithdrawalModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor do {transactionType === 'withdrawal' ? 'Sangria' : 'Reforço'} (R$)</label>
                  <input 
                    type="number" 
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    className={cn(
                      "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 font-bold",
                      transactionType === 'withdrawal' ? "focus:ring-rose-500" : "focus:ring-blue-500"
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo / Destino</label>
                  <input 
                    type="text" 
                    value={withdrawalReason}
                    onChange={(e) => setWithdrawalReason(e.target.value)}
                    placeholder={transactionType === 'withdrawal' ? "Ex: Pagamento fornecedor" : "Ex: Troco inicial"}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button onClick={() => setIsWithdrawalModalOpen(false)} className="flex-1 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                <button 
                  onClick={() => {
                    onAddWithdrawal(Number(withdrawalAmount), withdrawalReason, transactionType);
                    setIsWithdrawalModalOpen(false);
                    setWithdrawalAmount('');
                    setWithdrawalReason('');
                  }}
                  className={cn(
                    "flex-1 py-3 text-white rounded-xl font-black uppercase text-[10px] tracking-widest",
                    transactionType === 'withdrawal' ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fechamento Modal */}
      <AnimatePresence>
        {isCloseModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Fechar Caixa?</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">O saldo final será registrado</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl text-left space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>Saldo em Dinheiro</span>
                    <span>{formatCurrency(estimatedCash)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>Total em Outros Métodos</span>
                    <span>{formatCurrency(currentSession?.payments.pix + currentSession?.payments.debito + currentSession?.payments.credito + currentSession?.payments.outros || 0)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-[10px] font-black uppercase text-slate-900">
                    <span>Total Geral</span>
                    <span>{formatCurrency(estimatedCash + (currentSession?.payments.pix + currentSession?.payments.debito + currentSession?.payments.credito + currentSession?.payments.outros || 0))}</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setIsCloseModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                  <button 
                    onClick={() => {
                      onCloseCashier(estimatedCash);
                      setIsCloseModalOpen(false);
                    }}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest"
                  >
                    Fechar Agora
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface BrandsViewProps {
  brands: Brand[];
  setBrands: React.Dispatch<React.SetStateAction<Brand[]>>;
  sales: Sale[];
  products: Product[];
  addNotification: (message: string, type?: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  ensureAuthSession: () => Promise<boolean>;
}

const BrandsView = ({ brands, setBrands, sales, products, addNotification, handleFirestoreError, user, ensureAuthSession }: BrandsViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState('');

  const brandStats = useMemo(() => {
    const stats: { [key: string]: { totalSales: number, unitsSold: number, bestProduct: string } } = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product && product.brand) {
          const brand = product.brand.toUpperCase();
          if (!stats[brand]) stats[brand] = { totalSales: 0, unitsSold: 0, bestProduct: '' };
          stats[brand].totalSales += item.total;
          stats[brand].unitsSold += item.quantity;
        }
      });
    });

    // Find best product for each brand
    brands.forEach(brand => {
      const bName = brand.name.toUpperCase();
      const brandProducts = products.filter(p => p.brand.toUpperCase() === bName);
      let maxUnits = 0;
      let bestP = 'Nenhum';

      brandProducts.forEach(p => {
        const units = sales.reduce((acc, sale) => {
          const item = sale.items.find(i => i.productId === p.id);
          return acc + (item ? item.quantity : 0);
        }, 0);
        if (units > maxUnits) {
          maxUnits = units;
          bestP = p.name;
        }
      });
      if (stats[bName]) stats[bName].bestProduct = bestP;
    });

    return stats;
  }, [sales, products, brands]);

  const handleOpenModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandName(brand.name);
    } else {
      setEditingBrand(null);
      setBrandName('');
    }
    setIsModalOpen(true);
  };

  const addBrand = async () => {
    if (!brandName) return;
    
    const brandData: Brand = {
      id: editingBrand?.id || `B${Date.now()}`,
      name: brandName.toUpperCase()
    };

    try {
      if (editingBrand) {
        setBrands(brands.map(b => b.id === brandData.id ? brandData : b));
      } else {
        setBrands([...brands, brandData]);
      }
      addNotification(editingBrand ? 'Marca atualizada!' : 'Marca adicionada!', 'success');
      setIsModalOpen(false);
      setBrandName('');
    } catch (error: any) {
      addNotification('Erro ao salvar marca.', 'error');
    }
  };

  const removeBrand = async (id: string) => {
    if (!window.confirm('Excluir esta marca?')) return;
    try {
      setBrands(brands.filter((b: Brand) => b.id !== id));
      addNotification('Marca removida.', 'info');
    } catch (error: any) {
      addNotification('Erro ao remover marca.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Marcas</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total: {brands.length} Marcas</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          Nova Marca
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Lista de Marcas</h3>
        </div>
        
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {brands.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Tag size={32} />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhuma marca cadastrada</p>
            </div>
          ) : (
            brands.map((brand: Brand) => (
              <div key={brand.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-black uppercase">
                    {brand.name ? brand.name.charAt(0) : '?'}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white uppercase text-sm tracking-tight block">{brand.name || 'Sem Nome'}</span>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Mais Vendido: <span className="text-blue-500">{brandStats[brand.name.toUpperCase()]?.bestProduct || 'Nenhum'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="hidden sm:flex flex-col items-end">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendas</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      R$ {brandStats[brand.name.toUpperCase()]?.totalSales.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-2 text-slate-300 hover:text-blue-600 transition-all"
                      onClick={() => handleOpenModal(brand)}
                      title="Editar Marca"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => removeBrand(brand.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal for Add/Edit Brand */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {editingBrand ? 'Editar Marca' : 'Nova Marca'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Marca</label>
                  <input 
                    type="text" 
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                    placeholder="Ex: TRUSS"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={addBrand}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                  >
                    {editingBrand ? 'Salvar' : 'Adicionar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminProfileView = ({ settings, setSettings, addNotification, handleFirestoreError, user, setUser }: any) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState(settings.adminPhoto || '');
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || '#2563eb');
  const [theme, setTheme] = useState(settings.theme || 'light');

  const handleSaveProfile = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      addNotification('As senhas não coincidem.', 'error');
      return;
    }

    const updatedSettings = {
      ...settings,
      adminPhoto: photoUrl || null,
      adminPassword: newPassword || settings.adminPassword || 'admin',
      primaryColor,
      theme
    };

    try {
      setSettings(updatedSettings);
      localStorage.setItem('biobel_settings', JSON.stringify(updatedSettings));
      
      // Update current user state to reflect photo change immediately
      if (user) {
        setUser({
          ...user,
          photoURL: photoUrl || null
        });
      }

      addNotification('Perfil atualizado com sucesso!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      addNotification('Erro ao atualizar perfil.', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit for base64
        addNotification('A imagem é muito grande. Escolha uma imagem menor que 500KB.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg">
          <UserIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Perfil do Administrador</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gerencie sua foto e senha de acesso</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm p-8 space-y-8">
        <div className="flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-slate-50 dark:border-slate-800 overflow-hidden shadow-xl bg-slate-100 dark:bg-slate-800">
              {photoUrl && photoUrl.length > 5 ? (
                <img src={photoUrl} alt="Admin" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <UserCircle size={64} />
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-all hover:scale-110 active:scale-95">
              <Camera size={18} />
              <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
            </label>
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Foto do Perfil</p>
            <p className="text-[10px] text-slate-500">Clique no ícone da câmera para alterar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Deixe em branco para manter a atual"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Palette size={18} className="text-blue-600" />
            Cores e Estilo do Sistema
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cor Principal</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-12 w-12 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                />
                <input 
                  type="text" 
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900 dark:text-white transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tema do Sistema</label>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl transition-colors h-12">
                <button 
                  onClick={() => setTheme('light')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all",
                    theme === 'light' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  <Sun size={14} /> Claro
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all",
                    theme === 'dark' ? "bg-slate-800 dark:bg-slate-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  <Moon size={14} /> Escuro
                </button>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSaveProfile}
          className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Salvar Alterações
        </button>
      </div>
    </div>
  );
};

const FixedCostsView = ({ fixedCosts, setFixedCosts, formatCurrency, addNotification, handleFirestoreError, user, ensureAuthSession }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCost, setNewCost] = useState({ description: '', amount: 0, dueDate: 1 });

  const totalCosts = fixedCosts.reduce((acc: number, cost: any) => acc + cost.amount, 0);

  const handleAddCost = async () => {
    const cost: FixedCost = {
      id: Math.random().toString(36).substr(2, 9),
      description: newCost.description,
      amount: Number(newCost.amount),
      dueDate: Number(newCost.dueDate),
      status: 'pending'
    };

    try {
      setFixedCosts([...fixedCosts, cost]);
      addNotification('Custo fixo adicionado!', 'success');
      setIsModalOpen(false);
      setNewCost({ description: '', amount: 0, dueDate: 1 });
    } catch (error: any) {
      addNotification('Erro ao adicionar custo fixo.', 'error');
    }
  };

  const toggleStatus = async (id: string) => {
    const cost = fixedCosts.find((c: any) => c.id === id);
    if (!cost) return;

    const updatedCost = { ...cost, status: cost.status === 'paid' ? 'pending' : 'paid' };

    try {
      setFixedCosts(fixedCosts.map((c: any) => c.id === id ? updatedCost : c));
    } catch (error: any) {
      addNotification('Erro ao atualizar status.', 'error');
    }
  };

  const removeCost = async (id: string) => {
    if (!window.confirm('Excluir este custo fixo?')) return;
    try {
      setFixedCosts(fixedCosts.filter((c: any) => c.id !== id));
      addNotification('Custo fixo removido.', 'info');
    } catch (error: any) {
      addNotification('Erro ao remover custo fixo.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Custos Fixos</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all"
        >
          <Plus size={18} /> Adicionar Custo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 col-span-2">
          <div className="space-y-4">
            {fixedCosts.map((cost: any) => (
              <div key={cost.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleStatus(cost.id)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      cost.status === 'paid' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                    )}
                  >
                    {cost.status === 'paid' && <Check size={14} />}
                  </button>
                  <div>
                    <p className="font-black text-slate-900 uppercase text-xs">{cost.description}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vencimento: Dia {cost.dueDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <p className="font-black text-slate-900">{formatCurrency(cost.amount)}</p>
                  <button 
                    onClick={() => removeCost(cost.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl space-y-6">
            <div className="space-y-1">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Mensal Estimado</p>
              <h3 className="text-4xl font-black tracking-tight">{formatCurrency(totalCosts)}</h3>
            </div>
            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Pagos</span>
                <span className="text-sm font-black text-emerald-400">
                  {formatCurrency(fixedCosts.filter((c: any) => c.status === 'paid').reduce((acc: number, c: any) => acc + c.amount, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Pendentes</span>
                <span className="text-sm font-black text-rose-400">
                  {formatCurrency(fixedCosts.filter((c: any) => c.status === 'pending').reduce((acc: number, c: any) => acc + c.amount, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Novo Custo Fixo</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</label>
                  <input 
                    type="text" 
                    value={newCost.description}
                    onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                    placeholder="Ex: Aluguel"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor (R$)</label>
                    <input 
                      type="number" 
                      value={newCost.amount}
                      onChange={(e) => setNewCost({ ...newCost, amount: Number(e.target.value) })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dia Vencimento</label>
                    <input 
                      type="number" 
                      min="1"
                      max="31"
                      value={newCost.dueDate}
                      onChange={(e) => setNewCost({ ...newCost, dueDate: Number(e.target.value) })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                <button 
                  onClick={handleAddCost}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NewCustomerForm = ({ newCustomer, setNewCustomer, onCancel, onSave }: any) => (
  <div className="w-full max-w-sm space-y-4">
    <h4 className="font-black text-slate-900 uppercase tracking-tight">Novo Cliente</h4>
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo *</label>
        <input 
          type="text" 
          placeholder="Ex: Maria Silva" 
          value={newCustomer.name}
          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp *</label>
        <input 
          type="text" 
          placeholder="(00) 00000-0000" 
          value={newCustomer.phone}
          onChange={(e) => setNewCustomer({ ...newCustomer, phone: formatPhone(e.target.value) })}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações (Opcional)</label>
        <textarea 
          placeholder="Notas sobre o cliente..." 
          value={newCustomer.notes}
          onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
          rows={2}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none"
        />
      </div>
    </div>
    <div className="flex gap-2">
      <button 
        onClick={onCancel}
        className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
      >
        Cancelar
      </button>
      <button 
        onClick={onSave}
        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all"
      >
        Salvar
      </button>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [vendedora, setVendedora] = useState('ALESANDRA');
  const [atendimentoProductSearch, setAtendimentoProductSearch] = useState('');
  
  const [atendimentoProductType, setAtendimentoProductType] = useState<'avulso' | 'combo' | 'kit'>('avulso');
  const [atendimentoCustomerSearch, setAtendimentoCustomerSearch] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', notes: '' });
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState('1');
  const [isAtendimentoSummaryOpen, setIsAtendimentoSummaryOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('atendimento');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<Payment[]>([]);
  const [viewMode, setViewMode] = useState<'Presencial' | 'Digital'>('Presencial');
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [saleNotes, setSaleNotes] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [vouchers] = useState([
    { code: 'BIOBEL10', discount: 10, type: 'percent' },
    { code: 'BEMVINDA', discount: 20, type: 'fixed' },
    { code: 'VIP50', discount: 50, type: 'fixed' }
  ]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }));
  const [currentCashierSession, setCurrentCashierSession] = useState<CashierSession | null>(null);

  const handlePrintReceipt = useCallback(() => {
    if (!lastCompletedSale) return;
    // Pequeno delay para garantir que o DOM está pronto se chamado vindo de um clique rápido ou mudança de tela
    setTimeout(() => {
      window.print();
    }, 150);
  }, [lastCompletedSale]);

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
    { id: '1', name: 'ALESANDRA', role: 'Dona', startDate: '2023-01-01', phone: '(51) 99999-8888', activities: ['Gestão Geral', 'Compras', 'Marketing'] },
    { id: '2', name: 'LETICIA', role: 'CLT', startDate: '2023-06-15', phone: '(51) 98888-7777', activities: ['Atendimento', 'Limpeza', 'Reposição'] },
    { id: '3', name: 'ESTAGIÁRIA', role: 'Estagiária', startDate: '2024-01-10', phone: '(51) 97777-6666', activities: ['Auxílio Vendas', 'Organização'] },
  ]);
  const [routines, setRoutines] = useState<Routine[]>([
    {
      id: 'R1',
      staffId: '2',
      staffName: 'LETICIA',
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
    pixKey: '',
    pixKeyType: 'CPF',
    pixEnabled: false,
    receiptConfig: {
      showLogo: true,
      showAddress: true,
      showPhone: true,
      showInstagram: true,
      showDiscount: true,
      showSeller: true,
      customMessage: 'Obrigado pela preferência! Biobel cuidando de você.'
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
    const monthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
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
          'LETICIA': { monthlyGoal: 15000, commission: 3 },
          'SISTEMA': { monthlyGoal: 15000, commission: 3 }
        }
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
  const [giveaways, setGiveaways] = useState<Giveaway[]>([
    { id: '1', name: 'Sorteio de Páscoa', description: 'Cesta de chocolates e produtos Biobel', date: '2026-04-05', status: 'pending', participants: [] },
    { id: '2', name: 'Dia das Mães', description: 'Kit Luxo Wella Invigo', date: '2026-05-10', status: 'pending', participants: [] },
  ]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Automatic Backup Logic (10h and 17h)
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
            
            const updatedBackups = [newBackup, ...currentBackups].slice(0, 10);
            localStorage.setItem('biobel_system_backups', JSON.stringify(updatedBackups));
            localStorage.setItem(backupTriggerKey, 'true');
            
            addNotification(`Sistema: Backup automático das ${hours}h realizado.`, 'success');
          } catch (e) {
            console.error("Auto backup failed", e);
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
    return Array.from(new Set(relevantProducts.map(p => p.category).filter(Boolean))) as string[];
  }, [products, atendimentoProductType]);

  const posBrands = useMemo(() => {
    const relevantProducts = products.filter(p => (p.type === atendimentoProductType || (!p.type && atendimentoProductType === 'avulso')));
    return Array.from(new Set(relevantProducts.map(p => p.brand).filter(Boolean))) as string[];
  }, [products, atendimentoProductType]);

  useEffect(() => {
    console.log('Tema alterado para:', settings.theme);
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      console.log('Classe dark adicionada ao html');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Classe dark removida do html');
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
        giveaways
      };
      localStorage.setItem('biobel_local_data', JSON.stringify(localData));
    }
  }, [products, customers, sales, staff, routines, settings, cashierSessions, campaigns, currentCashierSession, isCashierOpen, user?.isLocal, isDataLoaded, brands, productCategories, fixedCosts, giveaways]);

  // Load LocalStorage Data on Mount
  useEffect(() => {
    const savedData = localStorage.getItem('biobel_local_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.products) setProducts(parsed.products);
        if (parsed.customers) setCustomers(parsed.customers);
        if (parsed.sales) setSales(parsed.sales);
        if (parsed.staff) setStaff(parsed.staff);
        if (parsed.routines) setRoutines(parsed.routines);
        if (parsed.settings) setSettings(parsed.settings);
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
      } catch (e) {
        console.error("Failed to load local data", e);
      }
    }
    setIsDataLoaded(true);
  }, []);

  const addNotification = (message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, message, type }]);
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
      localStorage.setItem('pos_routines', JSON.stringify(routines));
      localStorage.setItem('pos_fixedCosts', JSON.stringify(fixedCosts));
      localStorage.setItem('pos_cashier_sessions', JSON.stringify(cashierSessions));
    }
  }, [user?.isLocal, products, customers, sales, brands, staff, settings, monthlyGoals, campaigns, giveaways, routines, fixedCosts, cashierSessions]);

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
    setLoginLoading(true);

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPassword = password.trim();

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
    } else {
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
      date: new Date().toISOString(),
      customerId: selectedCustomer?.id || 'consumidor-final',
      customerName: selectedCustomer?.name || 'Consumidor Final',
      customerPhone: selectedCustomer?.phone || '',
      total: saleTotal,
      discount,
      paymentMethod: isSplitPayment ? 'Múltiplo' : paymentMethod,
      vendedora,
      status: 'completed',
      items: cart.map(item => ({...item})),
      type: viewMode,
      category: 'Atendimento',
      commission: commissionValue,
      notes: saleNotes,
    };

    if (isSplitPayment) sale.payments = splitPayments;
    if (currentCashierSession?.id) sale.sessionId = currentCashierSession.id;

    setIsFinalizeConfirmationOpen(false);
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
          if ((product.type === 'combo' || product.type === 'kit') && product.comboItems) {
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
    setCurrentStep(5);
  };

  const addToCart = (product: Product) => {
    const isKitOrCombo = product.type === 'kit' || product.type === 'combo';
    
    if (product.stock <= 0 && !isKitOrCombo) {
      addNotification('Produto sem estoque.', 'warning');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: product.price,
        total: product.price
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

  const handleWhatsAppShare = () => {
    const sale = lastCompletedSale;
    if (!sale) return;

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
${sale.items.map(item => {
  let itemText = `• ${item.name} (${item.quantity}x) - ${formatCurrency(item.price)}`;
  const product = products.find(p => p.id === item.productId);
  if ((product?.type === 'kit' || product?.type === 'combo') && product.comboItems) {
    const details = product.comboItems.map(subItem => {
      const p = products.find(prod => prod.id === subItem.productId);
      return `    └── ${subItem.quantity}x ${p?.name || 'Item'}`;
    }).join('\n');
    itemText += '\n' + details;
  }
  return itemText;
}).join('\n')}
    `.trim();
    
    const url = getWhatsAppUrl(selectedCustomer?.phone || '', summary);
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    const sale = lastCompletedSale;
    if (!sale) return;

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
${sale.items.map(item => {
  let itemText = `• ${item.name} (${item.quantity}x) - ${formatCurrency(item.price)}`;
  const product = products.find(p => p.id === item.productId);
  if ((product?.type === 'kit' || product?.type === 'combo') && product.comboItems) {
    const details = product.comboItems.map(subItem => {
      const p = products.find(prod => prod.id === subItem.productId);
      return `    └── ${subItem.quantity}x ${p?.name || 'Item'}`;
    }).join('\n');
    itemText += '\n' + details;
  }
  return itemText;
}).join('\n')}
    `.trim();
    
    navigator.clipboard.writeText(summary).then(() => {
      addNotification('Resumo copiado para a área de transferência!', 'success');
    }).catch(() => {
      addNotification('Erro ao copiar texto.', 'error');
    });
  };

  const handleDownloadPDF = () => {
    const sale = lastCompletedSale;
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
      const location = settings.address.includes('-') 
        ? settings.address.split('-').pop()?.trim() 
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
      const tableData = sale.items.flatMap(item => {
        const row = [
          item.name,
          item.quantity.toString(),
          formatCurrency(item.price),
          formatCurrency(item.price * item.quantity)
        ];
        
        const product = products.find(p => p.id === item.productId);
        if ((product?.type === 'kit' || product?.type === 'combo') && product.comboItems) {
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
      
      // Totals
      doc.setFontSize(10);
      doc.text('Subtotal:', pageWidth - 60, finalY + 15);
      doc.text(formatCurrency(sale.total + sale.discount), pageWidth - 20, finalY + 15, { align: 'right' });
      
      doc.text('Desconto:', pageWidth - 60, finalY + 20);
      doc.text(`- ${formatCurrency(sale.discount)}`, pageWidth - 20, finalY + 20, { align: 'right' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL:', pageWidth - 60, finalY + 30);
      doc.text(formatCurrency(sale.total), pageWidth - 20, finalY + 30, { align: 'right' });
      
      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Obrigado pela preferência!', pageWidth / 2, finalY + 50, { align: 'center' });
      
      console.log('Salvando PDF');
      doc.save(`recibo_biobel_${sale.id}.pdf`);
      addNotification('Recibo PDF gerado com sucesso!', 'success');
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      addNotification('Erro ao gerar PDF. Verifique o console.', 'error');
    }
  };

  const filteredProducts = products.filter(p => {
    const search = atendimentoProductSearch.trim().toLowerCase();
    
    // Check type first
    const matchesType = (p.type === atendimentoProductType || (!p.type && atendimentoProductType === 'avulso'));
    if (!matchesType) return false;

    // Filter by category if selected
    if (atendimentoCategoryFilter && p.category !== atendimentoCategoryFilter) return false;

    // Filter by brand if selected
    if (atendimentoBrandFilter && p.brand !== atendimentoBrandFilter) return false;
    
    if (!search) return true;

    return p.name.toLowerCase().includes(search) || 
           p.brand.toLowerCase().includes(search) ||
           p.barcode === search ||
           (p.category && p.category.toLowerCase().includes(search)) ||
           (p.type && p.type.toLowerCase().includes(search));
  }).sort((a, b) => {
    // Favorites first
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return 0;
  });

  const filteredCustomers = customers.filter(c => {
    const search = atendimentoCustomerSearch.trim().toLowerCase();
    if (!search) return true;
    return c.name.toLowerCase().includes(search) || 
           c.phone.includes(search) ||
           (c.email && c.email.toLowerCase().includes(search));
  });

  const nextStep = () => {
    if (!isCashierOpen) {
      addNotification('Abra o caixa para prosseguir com o atendimento.', 'warning');
      return;
    }
    if (currentStep === 1 && cart.length === 0) {
      addNotification('Adicione itens ao carrinho para continuar.', 'warning');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // --- Render Logic ---

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
          <div className="text-center mb-8">
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
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">SISTEMA GESTÃO</p>
            <p className="text-slate-500 mt-4 font-medium">Acesse sua conta administrativa</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Usuário</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="admin"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Senha</label>
              <div className="relative">
                <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-100 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <RefreshCw className="animate-spin" size={20} />
              ) : (
                <>Entrar no Sistema</>
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

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              &copy; 2026 BIOBEL SISTEMA GESTÃO. Todos os direitos reservados.
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
        "fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col shrink-0 transition-all duration-300 z-50 lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
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
              <h2 className="font-black text-slate-900 dark:text-white leading-none tracking-tight uppercase">{settings.name || 'BIOBEL'}</h2>
              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">SISTEMA GESTÃO</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-8 overflow-y-auto scrollbar-hide">
          {/* Section: 🔵 1. OPERAÇÃO */}
          <div className="space-y-2">
            <p className="px-4 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">🔵 1. OPERAÇÃO</p>
            {[
              { id: 'atendimento', label: 'Atendimento', icon: ShoppingCart },
              { id: 'sales', label: 'Vendas', icon: History },
              { id: 'cashier', label: 'Caixa', icon: Wallet },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === item.id 
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                <item.icon size={18} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'cashier' && (
                  <span className={cn(
                    "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                    isCashierOpen ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                  )}>
                    {isCashierOpen ? 'ABERTO' : 'FECHADO'}
                  </span>
                )}
                {activeTab === item.id && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>

          {/* Section: 🟢 2. DESEMPENHO & CONTROLE */}
          <div className="space-y-2">
            <p className="px-4 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">🟢 2. DESEMPENHO & CONTROLE</p>
            {[
              { id: 'performance', label: 'Meu Desempenho', icon: UserCircle },
              { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
              { id: 'reports', label: 'Relatórios', icon: FileBarChart },
              { id: 'goals', label: 'Metas Mensais', icon: Target },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === item.id 
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                <item.icon size={18} />
                {item.label}
                {activeTab === item.id && <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>

          {/* Section: 🟣 3. CRM & RELACIONAMENTO */}
          <div className="space-y-2">
            <p className="px-4 text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">🟣 3. CRM & RELACIONAMENTO</p>
            {[
              { id: 'customers', label: 'Clientes (CRM)', icon: UserIcon },
              { id: 'campaigns', label: 'Campanhas', icon: Sparkles },
              { id: 'giveaways', label: 'Sorteios', icon: Gift },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === item.id 
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                <item.icon size={18} />
                {item.label}
                {activeTab === item.id && <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>

          {/* Section: 🟠 4. PRODUTOS & ESTRUTURA */}
          <div className="space-y-2">
            <p className="px-4 text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">🟠 4. PRODUTOS & ESTRUTURA</p>
            {[
              { id: 'products', label: 'Produtos', icon: Package },
              { id: 'combos', label: 'Combos', icon: Layers },
              { id: 'kits', label: 'Kits', icon: Box },
              { id: 'brands', label: 'Marcas', icon: Disc },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === item.id 
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                <item.icon size={18} />
                {item.label}
                {activeTab === item.id && <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>

          {/* Section: 🟡 5. ROTINAS & EQUIPE */}
          <div className="space-y-2">
            <p className="px-4 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">🟡 5. ROTINAS & EQUIPE</p>
            {[
              { id: 'funcao_rotina', label: 'Função & Rotina', icon: ClipboardList },
              { id: 'routine', label: 'Checklist Diário', icon: CheckCircle },
            ].map((item: any) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === item.id 
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                <item.icon size={18} />
                {item.label}
                {activeTab === item.id && <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>

          {/* Section: ⚙️ 6. FINANCEIRO & ADMIN */}
          <div className="space-y-2">
            <p className="px-4 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">⚙️ 6. FINANCEIRO & ADMIN</p>
            {[
              { id: 'costs', label: 'Custos Fixos', icon: FileText },
              { id: 'cashier', label: 'Caixa', icon: Wallet },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === item.id 
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                <item.icon size={18} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'cashier' && (
                  <span className={cn(
                    "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                    isCashierOpen ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                  )}>
                    {isCashierOpen ? 'ABERTO' : 'FECHADO'}
                  </span>
                )}
                {activeTab === item.id && <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>

          {/* Section: 🔧 7. CONFIGURAÇÕES */}
          <div className="space-y-2">
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">🔧 7. CONFIGURAÇÕES</p>
            {[
              { id: 'admin_profile', label: 'Perfil & Senha', icon: UserIcon },
              { id: 'staff', label: 'Vendedoras & Comissões', icon: Megaphone },
              { id: 'config', label: 'Dados da Empresa & Recibo', icon: Settings },
              { id: 'backup', label: 'Backup & Importação', icon: Database },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === item.id 
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                <item.icon size={18} />
                {item.label}
                {activeTab === item.id && <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>
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
                Modo Navegador
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
            <button 
              onClick={() => setSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })}
              className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
              title={settings.theme === 'dark' ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            >
              {settings.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
            </button>
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
                      <span className="px-3 py-1 text-[10px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        PASSO {currentStep} DE 4
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
                {currentStep === 5 ? (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-8">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100">
                  <CheckCircle2 size={48} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-900">Venda Finalizada!</h2>
                  <p className="text-slate-500 font-bold">O registro foi salvo com sucesso no sistema.</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button 
                    onClick={handleWhatsAppShare}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                  >
                    <MessageCircle size={20} /> WhatsApp
                  </button>
                  <button 
                    onClick={handleCopyText}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl font-bold hover:bg-blue-100 transition-all"
                  >
                    <ClipboardList size={20} /> Copiar Texto
                  </button>
                  <button 
                    onClick={handlePrintReceipt}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                  >
                    <Printer size={20} /> Imprimir Recibo
                  </button>
                  <button 
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all"
                  >
                    <Download size={20} /> Baixar PDF
                  </button>
                  <button 
                    onClick={() => {
                      setCart([]);
                      setDiscount(0);
                      setSaleNotes('');
                      setSelectedCustomer(null);
                      setAtendimentoProductSearch('');
                      setAtendimentoCustomerSearch('');
                      setCurrentStep(1);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                  >
                    Novo Atendimento
                  </button>
                </div>
              </div>
            ) : (
              <>
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black">1</div>
                        <div>
                          <h3 className="font-black text-slate-900 uppercase tracking-tight">Seleção de Produtos</h3>
                          {cart.length === 0 && currentStep === 1 && (
                            <div className="flex flex-col items-center gap-2">
                              <p className="text-xs text-slate-400 font-bold uppercase">Seu carrinho está vazio</p>
                              <p className="text-[10px] text-slate-300 font-bold uppercase">Adicione itens para começar</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                          <input 
                            type="text" 
                            placeholder="Pesquisar produto ou marca..." 
                            value={atendimentoProductSearch}
                            onChange={(e) => setAtendimentoProductSearch(e.target.value)}
                            className="w-full pl-12 pr-20 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {atendimentoProductSearch && (
                              <button 
                                onClick={() => setAtendimentoProductSearch('')}
                                className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                                title="Limpar busca"
                              >
                                <X size={16} />
                              </button>
                            )}
                            <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Escanear QR Code">
                              <QrCode size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              if (!isCashierOpen) {
                                addNotification('Abra o caixa para iniciar vendas.', 'warning');
                                return;
                              }
                              setIsCustomItemModalOpen(true);
                            }}
                            className={cn(
                              "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border",
                              isCashierOpen 
                                ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50" 
                                : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                            )}
                          >
                            <Plus size={20} /> Item Avulso
                          </button>
                          
                          {cart.length > 0 && (
                            <button 
                              onClick={saveCurrentCart}
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold border border-blue-100 hover:bg-blue-100 transition-all"
                              title="Salvar carrinho e abrir outro"
                            >
                              <History size={20} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Saved Carts Carousel */}
                      {savedCarts.length > 0 && (
                        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Em aberto:</p>
                          {savedCarts.map(saved => (
                            <button
                              key={saved.id}
                              onClick={() => resumeSavedCart(saved)}
                              className="px-4 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2 hover:border-blue-500 hover:shadow-sm transition-all shrink-0"
                            >
                              <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <ShoppingCart size={12} />
                              </div>
                              <div className="text-left">
                                <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{saved.name}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">{saved.cart.length} itens</p>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSavedCarts(prev => prev.filter(c => c.id !== saved.id));
                                }}
                                className="ml-2 text-slate-300 hover:text-rose-500"
                              >
                                <X size={12} />
                              </button>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Product Type Tabs */}
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center bg-slate-100 p-1 rounded-2xl w-fit">
                            {[
                              { id: 'avulso', label: 'Avulsos', icon: Package },
                              { id: 'combo', label: 'Combos', icon: Layers },
                              { id: 'kit', label: 'Kits', icon: Box }
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => {
                                  setAtendimentoProductType(tab.id as any);
                                  setAtendimentoCategoryFilter('');
                                  setAtendimentoBrandFilter('');
                                }}
                                className={cn(
                                  "flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                  atendimentoProductType === tab.id 
                                    ? "bg-white text-blue-600 shadow-sm" 
                                    : "text-slate-400 hover:text-slate-600"
                                )}
                              >
                                <tab.icon size={14} />
                                {tab.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {posCategories.length > 0 && (
                          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar no-scrollbar scroll-smooth">
                            <button
                              onClick={() => setAtendimentoCategoryFilter('')}
                              className={cn(
                                "whitespace-nowrap px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border shrink-0",
                                atendimentoCategoryFilter === ''
                                  ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100"
                                  : "bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500"
                              )}
                            >
                              Todas Categorias
                            </button>
                            {posCategories.sort().map(cat => (
                              <button
                                key={cat}
                                onClick={() => setAtendimentoCategoryFilter(atendimentoCategoryFilter === cat ? '' : cat)}
                                className={cn(
                                  "whitespace-nowrap px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border shrink-0",
                                  atendimentoCategoryFilter === cat
                                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100"
                                    : "bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500"
                                )}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        )}

                        {posBrands.length > 0 && (
                          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar scroll-smooth">
                            <button
                              onClick={() => setAtendimentoBrandFilter('')}
                              className={cn(
                                "whitespace-nowrap px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border shrink-0",
                                atendimentoBrandFilter === ''
                                  ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100"
                                  : "bg-white border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-500"
                              )}
                            >
                              Todas Marcas
                            </button>
                            {posBrands.sort().map(brand => (
                              <button
                                key={brand}
                                onClick={() => setAtendimentoBrandFilter(atendimentoBrandFilter === brand ? '' : brand)}
                                className={cn(
                                  "whitespace-nowrap px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border shrink-0",
                                  atendimentoBrandFilter === brand
                                    ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100"
                                    : "bg-white border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-500"
                                )}
                              >
                                {brand}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                      {filteredProducts.length === 0 ? (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
                          <Package size={48} className="opacity-20" />
                          <div className="text-center">
                            <p className="font-black uppercase tracking-widest text-xs">Nenhum produto encontrado</p>
                            <p className="text-[10px] font-bold">Tente mudar o filtro ou a busca</p>
                            {(atendimentoProductSearch || atendimentoCategoryFilter || atendimentoBrandFilter) && (
                              <button 
                                onClick={() => {
                                  setAtendimentoProductSearch('');
                                  setAtendimentoCategoryFilter('');
                                  setAtendimentoBrandFilter('');
                                }}
                                className="mt-4 text-blue-600 font-black text-[10px] uppercase underline"
                              >
                                Limpar filtros
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        filteredProducts.map((product) => (
                          <motion.div
                            key={product.id}
                            whileHover={{ y: -4 }}
                            className="bg-white dark:bg-slate-900 rounded-xl lg:rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden group flex flex-col"
                          >
                            <div className="aspect-square sm:aspect-[4/3] bg-slate-100 dark:bg-slate-800 relative overflow-hidden shrink-0 flex items-center justify-center">
                              {product.image ? (
                                <img 
                                  src={product.image} 
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="text-3xl lg:text-4xl group-hover:scale-110 transition-transform duration-500">
                                  {product.category === 'Maquiagem' ? '💄' : 
                                   product.category === 'Cabelo' ? '💇‍♀️' : 
                                   product.category === 'Perfume' ? '✨' : '🧴'}
                                </div>
                              )}
                              {product.isFavorite && (
                                <div className="absolute top-2 right-2 p-1.5 bg-yellow-400 text-white rounded-full shadow-lg z-10">
                                  <Star size={12} fill="currentColor" />
                                </div>
                              )}
                            </div>
                            <div className="p-3 lg:p-4 flex-1 flex flex-col justify-between space-y-2 lg:space-y-3">
                              <div className="flex-1 space-y-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 min-h-[1.5rem]">
                                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-[10px] lg:text-[11px] line-clamp-2 leading-tight flex-1">{product.name}</h4>
                                  </div>
                                  <div className="flex items-center gap-1.5 opacity-70">
                                    <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-wider">{product.brand}</span>
                                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                    <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-wider">{product.category}</span>
                                  </div>
                                  {product.expiryDate && (
                                    <div className="flex items-center gap-1 opacity-50">
                                      <Calendar size={8} />
                                      <span className="text-[7px] lg:text-[8px] font-bold uppercase">Val: {new Date(product.expiryDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                <div className="space-y-0">
                                  <p className="text-xs lg:text-sm font-black text-blue-600 tracking-tight">{formatCurrency(product.price)}</p>
                                  {product.stock <= product.minStock && (
                                    <p className="text-[7px] font-black text-rose-500 uppercase tracking-widest">Estoque Baixo</p>
                                  )}
                                </div>
                                <button 
                                  onClick={() => {
                                    if (!isCashierOpen) {
                                      addNotification('Abra o caixa para iniciar vendas.', 'warning');
                                      return;
                                    }
                                    addToCart(product);
                                  }}
                                  className={cn(
                                    "w-8 h-8 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center transition-all shadow-md",
                                    isCashierOpen 
                                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100 hover:shadow-blue-200" 
                                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                  )}
                                  disabled={!isCashierOpen}
                                >
                                  <Plus size={18} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>

                    {/* Floating Cart Bar */}
                    <AnimatePresence>
                      {cart.length > 0 && (
                        <motion.div 
                          initial={{ y: 100 }}
                          animate={{ y: 0 }}
                          exit={{ y: 100 }}
                          className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50"
                        >
                          <div className="bg-blue-600 rounded-2xl shadow-2xl shadow-blue-200 p-2 flex items-center justify-between">
                            <div className="flex items-center gap-4 pl-4">
                              <div className="relative">
                                <ShoppingCart className="text-white" size={24} />
                                <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-blue-600">
                                  {cart.reduce((acc, item) => acc + item.quantity, 0)}
                                </span>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Ver Carrinho</p>
                                <p className="text-lg font-black text-white">{formatCurrency(totalCart)}</p>
                              </div>
                            </div>
                            <button 
                              onClick={nextStep}
                              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2"
                            >
                              Próximo
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button onClick={prevStep} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <ChevronLeft size={20} />
                        </button>
                        <div>
                          <h3 className="font-black text-slate-900 uppercase tracking-tight">Confirmação do Carrinho</h3>
                          <p className="text-[10px] text-slate-400 font-black uppercase">{cart.length} itens</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setCart([])}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    
                     {/* Upselling Suggestions */}
                    {cart.length > 0 && currentStep === 2 && (
                      <div className="px-6 py-4 bg-blue-50/50 dark:bg-blue-900/10 border-y border-blue-100 dark:border-blue-900/50">
                        <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <PlusCircle size={14} />
                          Frequentemente Comprados Juntos
                        </h4>
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                          {products
                            .filter(p => {
                              // Simple logic: if has Shampoo, suggest Conditioner
                              const hasShampoo = cart.some(item => item.name.toLowerCase().includes('shampoo'));
                              const isConditioner = p.name.toLowerCase().includes('condicionador');
                              
                              // If has Perfume, suggest Creme
                              const hasPerfume = cart.some(item => item.name.toLowerCase().includes('perfume'));
                              const isCream = p.name.toLowerCase().includes('creme') || p.name.toLowerCase().includes('hidratante');

                              const inCart = cart.some(item => item.productId === p.id);
                              
                              return !inCart && p.stock > 0 && (
                                (hasShampoo && isConditioner) || 
                                (hasPerfume && isCream) ||
                                (cart.length > 0 && Math.random() > 0.8) // Random suggestion for variety
                              );
                            })
                            .slice(0, 4)
                            .map(suggestion => (
                              <button 
                                key={suggestion.id}
                                onClick={() => addToCart(suggestion)}
                                className="shrink-0 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 hover:border-blue-300 transition-all shadow-sm group"
                              >
                                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-lg">
                                  {suggestion.category === 'Maquiagem' ? '💄' : '🧴'}
                                </div>
                                <div className="text-left">
                                  <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase leading-tight group-hover:text-blue-600 transition-colors">{suggestion.name}</p>
                                  <p className="text-[9px] font-black text-blue-600">{formatCurrency(suggestion.price)}</p>
                                </div>
                                <Plus size={14} className="text-blue-600" />
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="p-4 lg:p-6 space-y-3 lg:space-y-4 max-h-[50vh] lg:max-h-[60vh] overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.productId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 lg:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl lg:rounded-2xl border border-slate-100 dark:border-slate-800 gap-4">
                          <div className="flex items-center gap-3 lg:gap-4">
                            <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white dark:bg-slate-900 rounded-lg lg:rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                              {products.find(p => p.id === item.productId)?.image ? (
                                <img src={products.find(p => p.id === item.productId)?.image} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-xl lg:text-2xl">
                                  {products.find(p => p.id === item.productId)?.category === 'Maquiagem' ? '💄' : 
                                   products.find(p => p.id === item.productId)?.category === 'Cabelo' ? '💇‍♀️' : 
                                   products.find(p => p.id === item.productId)?.category === 'Perfume' ? '✨' : '🧴'}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs lg:text-sm flex items-center flex-wrap gap-2">
                                {item.name}
                                {(products.find(p => p.id === item.productId)?.type === 'combo' || products.find(p => p.id === item.productId)?.type === 'kit') && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] rounded font-black">
                                    {products.find(p => p.id === item.productId)?.type?.toUpperCase()}
                                  </span>
                                )}
                              </h4>
                              <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase">{item.brand}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-4 lg:gap-8">
                            <div className="flex items-center gap-2 lg:gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg lg:rounded-xl p-1">
                              <button 
                                onClick={() => {
                                  if (item.quantity > 1) {
                                    setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity - 1, total: (i.quantity - 1) * i.price } : i));
                                  }
                                }}
                                className="w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              >
                                <ChevronLeft size={14} />
                              </button>
                              <span className="w-6 lg:w-8 text-center font-black text-slate-900 dark:text-white text-xs lg:text-sm">{item.quantity}</span>
                              <button 
                                onClick={() => {
                                  setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i));
                                }}
                                className="w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <p className="font-black text-slate-900 dark:text-white text-sm lg:text-base w-20 lg:w-24 text-right">{formatCurrency(item.total)}</p>
                            <button onClick={() => removeFromCart(item.productId)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-6">
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center gap-8">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Subtotal</span>
                          <span className="font-bold text-slate-600">{formatCurrency(totalCart)}</span>
                        </div>
                        <div className="flex items-center gap-8">
                          <span className="text-sm font-black text-slate-900 uppercase">Total</span>
                          <span className="text-3xl font-black text-blue-600">{formatCurrency(totalCart - discount)}</span>
                        </div>
                      </div>
                      <button 
                        onClick={nextStep}
                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                      >
                        Próximo: Identificar Cliente
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                      <button onClick={prevStep} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <ChevronLeft size={20} />
                      </button>
                      <div>
                        <h3 className="font-black text-slate-900 uppercase tracking-tight">Identificação do Cliente</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase">Vincule a venda a um cliente cadastrado</p>
                      </div>
                    </div>

                    <div className="p-8 space-y-8">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                          type="text" 
                          placeholder="Buscar por nome ou telefone..." 
                          value={atendimentoCustomerSearch}
                          onChange={(e) => setAtendimentoCustomerSearch(e.target.value)}
                          className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        />
                        {atendimentoCustomerSearch && (
                          <button 
                            onClick={() => setAtendimentoCustomerSearch('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <X size={20} />
                          </button>
                        )}
                      </div>

                      <div className="min-h-[300px] border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-6">
                        {!selectedCustomer ? (
                          isAddingCustomer ? (
                            <NewCustomerForm 
                              newCustomer={newCustomer} 
                              setNewCustomer={setNewCustomer} 
                              onCancel={() => setIsAddingCustomer(false)} 
                              onSave={handleQuickAddCustomer} 
                            />
                          ) : (
                            <div className="w-full space-y-4">
                              {atendimentoCustomerSearch.length > 0 && filteredCustomers.length > 0 ? (
                                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto p-2">
                                  {filteredCustomers.map(customer => (
                                    <button
                                      key={customer.id}
                                      onClick={() => setSelectedCustomer(customer)}
                                      className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-2xl transition-all text-left"
                                    >
                                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                                        <UserIcon size={20} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-black text-slate-900 uppercase text-xs truncate">{customer.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{customer.phone}</p>
                                      </div>
                                      <ChevronRight size={16} className="text-slate-300" />
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <>
                                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto">
                                    <UserIcon size={32} />
                                  </div>
                                  <div className="space-y-1">
                                    <h4 className="font-black text-slate-900 uppercase tracking-tight">Nenhum Cliente Selecionado</h4>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Busque acima ou continue sem identificar</p>
                                  </div>
                                  <button 
                                    onClick={() => setIsAddingCustomer(true)}
                                    className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all"
                                  >
                                    Novo Cliente
                                  </button>
                                </>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="w-full max-w-md space-y-6">
                            <div className="flex items-center gap-4 p-6 bg-blue-50 border border-blue-100 rounded-2xl w-full">
                              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white">
                                <UserIcon size={24} />
                              </div>
                              <div className="text-left flex-1">
                                <p className="font-black text-slate-900 uppercase">{selectedCustomer.name}</p>
                                <p className="text-xs text-blue-600 font-bold">{selectedCustomer.phone}</p>
                              </div>
                              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-rose-500">
                                <X size={20} />
                              </button>
                            </div>

                             <div className="space-y-3">
                              <div className="flex items-center justify-between px-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações & Preferências</h4>
                                <StickyNote size={14} className="text-slate-300" />
                              </div>
                              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                <p className="text-xs text-amber-900 italic">
                                  {selectedCustomer.notes || "Sem preferências registradas para este cliente."}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between px-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Últimas Compras</h4>
                                <History size={14} className="text-slate-300" />
                              </div>
                              <div className="space-y-2">
                                {sales
                                  .filter(s => s.customerId === selectedCustomer.id)
                                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                  .slice(0, 3)
                                  .map(sale => (
                                    <div key={sale.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-blue-200 transition-all">
                                      <div>
                                        <p className="text-[10px] font-black text-slate-900 uppercase">{new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{sale.items.length} itens • {sale.paymentMethod}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs font-black text-blue-600">{formatCurrency(sale.total)}</p>
                                        <p className="text-[8px] font-black text-emerald-500 uppercase">{sale.status === 'Concluída' || sale.status === 'completed' ? 'Concluída' : 'Cancelada'}</p>
                                      </div>
                                    </div>
                                  ))}
                                {sales.filter(s => s.customerId === selectedCustomer.id).length === 0 && (
                                  <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Nenhuma compra anterior</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={nextStep}
                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                      >
                        {selectedCustomer ? 'Continuar com Cliente' : 'Continuar sem Identificar'}
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                      <button onClick={prevStep} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <ChevronLeft size={20} />
                      </button>
                      <div>
                        <h3 className="font-black text-slate-900 uppercase tracking-tight">Finalização da Venda</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase">Escolha a vendedora e forma de pagamento</p>
                      </div>
                    </div>

                    <div className="p-8 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendedora</label>
                          <select 
                            value={vendedora}
                            onChange={(e) => setVendedora(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                          >
                            <option value="ALESANDRA">ALESANDRA</option>
                            <option value="LETICIA">LETICIA</option>
                            <option value="ESTAGIÁRIA">ESTAGIÁRIA</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desconto (R$)</label>
                          <input 
                            type="number" 
                            value={discount || ''}
                            onChange={(e) => setDiscount(Number(e.target.value))}
                            placeholder="0,00"
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                       <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cupom de Desconto</label>
                           <Tag size={16} className="text-slate-300" />
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                            className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            placeholder="BIOBEL10"
                          />
                          <button 
                            onClick={() => {
                              const v = vouchers.find(v => v.code === couponInput);
                              if (v) {
                                let discAmount = v.discount;
                                if (v.type === 'percent') {
                                  discAmount = (cart.reduce((acc, i) => acc + i.total, 0) * v.discount) / 100;
                                }
                                setDiscount(discAmount);
                                addNotification(`Cupom ${v.code} aplicado: ${formatCurrency(discAmount)} de desconto!`, 'success');
                              } else {
                                addNotification('Cupom inválido.', 'warning');
                              }
                            }}
                            className="px-6 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all"
                          >
                            Aplicar
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formas de Pagamento</label>
                          <button 
                            onClick={() => {
                              setIsSplitPayment(!isSplitPayment);
                              if (!isSplitPayment) {
                                setSplitPayments([{ method: paymentMethod, amount: cart.reduce((acc, item) => acc + item.total, 0) - discount }]);
                              }
                            }}
                            className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2",
                              isSplitPayment 
                                ? "bg-blue-600 text-white hover:bg-blue-700" 
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                            )}
                          >
                            <Layers size={14} />
                            {isSplitPayment ? "Usar Apenas Um Método" : "Dividir Pagamento (Múltiplos)"}
                          </button>
                        </div>

                        {!isCashierOpen && (
                          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 animate-pulse">
                            <AlertTriangle size={20} className="shrink-0" />
                            <p className="text-[10px] font-black uppercase tracking-widest leading-tight">
                              O caixa está fechado. Abra o caixa para que esta venda seja registrada no financeiro.
                            </p>
                          </div>
                        )}

                        {isSplitPayment ? (
                          <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                            {/* Pix Help in Split Payment */}
                            {splitPayments.some(p => p.method === 'PIX') && (
                              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-900 border-dashed rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                                    <QrCode size={20} />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">Pagamento via PIX</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Aguardando recebimento no celular/máquina</p>
                                  </div>
                                </div>
                                <div className="p-2 bg-blue-600 text-white rounded-lg">
                                  <Check size={16} />
                                </div>
                              </div>
                            )}

                            <div className="space-y-3">
                              {splitPayments.map((p, index) => (
                                <div key={`split-pay-${index}`} className="flex gap-3 items-end bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                                  <div className="flex-1 space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Método de Pagamento</label>
                                    <select 
                                      value={p.method}
                                      onChange={(e) => {
                                        const newPayments = [...splitPayments];
                                        newPayments[index].method = e.target.value;
                                        setSplitPayments(newPayments);
                                      }}
                                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                    >
                                      {['PIX', 'CRÉDITO', 'DÉBITO', 'DINHEIRO', 'FIADO', 'LINK', 'PARCELADO', 'OUTROS'].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex-1 space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Recebido (R$)</label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                                      <input 
                                        type="number"
                                        value={p.amount}
                                        onChange={(e) => {
                                          const newPayments = [...splitPayments];
                                          newPayments[index].amount = Number(e.target.value);
                                          setSplitPayments(newPayments);
                                        }}
                                        className="w-full p-3 pl-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                      />
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== index))}
                                    className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              ))}
                            </div>
                            
                            <button 
                              onClick={() => {
                                const totalAlreadySet = splitPayments.reduce((acc, p) => acc + p.amount, 0);
                                const totalRemaining = Math.max(0, (cart.reduce((acc, item) => acc + item.total, 0) - discount) - totalAlreadySet);
                                setSplitPayments([...splitPayments, { method: 'PIX', amount: totalRemaining }]);
                              }}
                              className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
                            >
                              <Plus size={14} />
                              Adicionar Outra Forma de Pagamento
                            </button>
                            
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                              <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Falta Receber:</span>
                                <p className={cn(
                                  "text-lg font-black",
                                  Math.abs(splitPayments.reduce((acc, p) => acc + p.amount, 0) - (cart.reduce((acc, item) => acc + item.total, 0) - discount)) < 0.01 
                                    ? "text-emerald-500" 
                                    : "text-rose-500"
                                )}>
                                  {formatCurrency((cart.reduce((acc, item) => acc + item.total, 0) - discount) - splitPayments.reduce((acc, p) => acc + p.amount, 0))}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total da Venda:</span>
                                <p className="text-lg font-black text-slate-900 dark:text-white">
                                  {formatCurrency(cart.reduce((acc, item) => acc + item.total, 0) - discount)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {[
                                { id: 'PIX', icon: QrCode, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { id: 'CRÉDITO', icon: Wallet, color: 'text-purple-600', bg: 'bg-purple-50' },
                                { id: 'DÉBITO', icon: Wallet, color: 'text-orange-600', bg: 'bg-orange-50' },
                                { id: 'DINHEIRO', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { id: 'FIADO', icon: WalletIcon, color: 'text-rose-700', bg: 'bg-rose-50' },
                                { id: 'LINK', icon: ArrowUpRight, color: 'text-rose-600', bg: 'bg-rose-50' },
                                { id: 'PARCELADO', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-50' },
                              ].map(method => (
                                <button 
                                  key={method.id}
                                  onClick={() => setPaymentMethod(method.id)}
                                  className={cn(
                                    "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-2 relative group",
                                    paymentMethod === method.id 
                                      ? "border-blue-600 text-blue-600 bg-blue-50/50" 
                                      : "border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                  )}
                                >
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                    paymentMethod === method.id ? "bg-blue-600 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600"
                                  )}>
                                    <method.icon size={20} />
                                  </div>
                                  <span className="font-black uppercase text-[10px] tracking-widest">{method.id}</span>
                                  {paymentMethod === method.id && (
                                    <div className="absolute top-2 right-2">
                                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>

                            {/* Pix QR Prompt */}
                            {paymentMethod === 'PIX' && !isSplitPayment && settings.pixKey && settings.pixEnabled && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-6 p-8 bg-blue-50 dark:bg-blue-900/30 rounded-[40px] border border-blue-100 dark:border-blue-900 flex flex-col items-center text-center gap-6"
                              >
                                <div className="bg-white p-6 rounded-[32px] shadow-xl shadow-blue-200/50">
                                  <QRCodeSVG 
                                    value={generatePixPayload(
                                      settings.pixKey, 
                                      settings.pixKeyType || 'CPF',
                                      cart.reduce((acc, item) => acc + item.total, 0) - discount,
                                      settings.name || 'BIOBEL'
                                    )} 
                                    size={180}
                                    level="H"
                                    includeMargin={false}
                                  />
                                </div>
                                
                                <div>
                                  <h4 className="text-sm font-black text-blue-900 dark:text-blue-200 uppercase tracking-tight">Escaneie para Pagar</h4>
                                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">
                                    VALOR: {formatCurrency(cart.reduce((acc, item) => acc + item.total, 0) - discount)}
                                  </p>
                                </div>

                                <div className="flex flex-col items-center gap-3 w-full">
                                  <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full border border-blue-100">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                                    <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Confirme o Recebimento no seu Banco</span>
                                  </div>

                                  <button 
                                    onClick={requestFinalizeConfirmation}
                                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 dark:shadow-none animate-pulse"
                                  >
                                    Confirmar Recebimento ✅
                                  </button>
                                </div>
                              </motion.div>
                            )}

                            {paymentMethod === 'PIX' && !isSplitPayment && (!settings.pixKey || !settings.pixEnabled) && (
                              <div className="mt-6 p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center text-blue-600 shadow-sm">
                                  <QrCode size={32} />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Pagamento via PIX</p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-1 max-w-[200px]">Peça para a cliente escanear o QR Code da máquina ou da loja.</p>
                                </div>
                                <div className="w-full space-y-3">
                                  <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-full border border-slate-100">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aguardando Recebimento</span>
                                  </div>
                                  <button 
                                    onClick={requestFinalizeConfirmation}
                                    className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 dark:hover:bg-blue-700 transition-all"
                                  >
                                    Confirmar e Finalizar
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações da Venda</label>
                        <textarea 
                          value={saleNotes}
                          onChange={(e) => setSaleNotes(e.target.value)}
                          rows={3}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                          placeholder="Alguma observação importante sobre esta venda?"
                        />
                      </div>

                      <div className="pt-8 border-t border-slate-100 flex gap-4">
                        <button 
                          onClick={prevStep}
                          className="flex-1 py-5 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                        >
                          Voltar
                        </button>
                        <button 
                          onClick={requestFinalizeConfirmation}
                          className="flex-[2] py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={20} />
                          Finalizar Venda
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
                <div className="w-full lg:w-80 shrink-0">
                  <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 p-6 sticky top-8 transition-colors">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
                      <ShoppingBagIcon size={18} className="text-blue-600" />
                      Resumo do Pedido
                    </h3>
                    
                    <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                      {cart.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-4 italic">Carrinho vazio</p>
                      ) : (
                        cart.map(item => (
                          <div key={item.productId} className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase leading-tight">{item.name}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{item.quantity}x {formatCurrency(item.price)}</p>
                            </div>
                            <span className="text-[10px] font-black text-slate-900 dark:text-white">{formatCurrency(item.price * item.quantity)}</span>
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
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{selectedCustomer.phone}</p>
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
          {activeTab === 'dashboard' && (
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
            />
          )}
            {activeTab === 'performance' && (
              <PerformanceView 
                sales={sales} 
                staff={staff} 
                formatCurrency={formatCurrency} 
                monthlyGoals={monthlyGoals}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
              />
            )}
          {activeTab === 'admin_profile' && <AdminProfileView settings={settings} setSettings={setSettings} addNotification={addNotification} handleFirestoreError={handleFirestoreError} user={user} setUser={setUser} />}
          {activeTab === 'goals' && <MonthlyGoalsView monthlyGoals={monthlyGoals} setMonthlyGoals={setMonthlyGoals} staff={staff} formatCurrency={formatCurrency} />}
          {activeTab === 'reports' && <ReportsView sales={sales} staff={staff} products={products} formatCurrency={formatCurrency} />}
          {activeTab === 'products' && <ProductsView products={products} sales={sales} setProducts={setProducts} brands={brands} productCategories={productCategories} setProductCategories={setProductCategories} addNotification={addNotification} handleFirestoreError={handleFirestoreError} user={user} formatCurrency={formatCurrency} typeFilter="avulso" ensureAuthSession={ensureAuthSession} />}
          {activeTab === 'combos' && <ProductsView products={products} sales={sales} setProducts={setProducts} brands={brands} productCategories={productCategories} setProductCategories={setProductCategories} addNotification={addNotification} handleFirestoreError={handleFirestoreError} user={user} formatCurrency={formatCurrency} typeFilter="combo" ensureAuthSession={ensureAuthSession} />}
          {activeTab === 'kits' && <ProductsView products={products} sales={sales} setProducts={setProducts} brands={brands} productCategories={productCategories} setProductCategories={setProductCategories} addNotification={addNotification} handleFirestoreError={handleFirestoreError} user={user} formatCurrency={formatCurrency} typeFilter="kit" ensureAuthSession={ensureAuthSession} />}
          {activeTab === 'brands' && <BrandsView brands={brands} setBrands={setBrands} sales={sales} products={products} addNotification={addNotification} handleFirestoreError={handleFirestoreError} user={user} ensureAuthSession={ensureAuthSession} />}
          {activeTab === 'customers' && (
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
          {activeTab === 'sales' && (
            <SalesView 
              sales={sales} 
              setSales={setSales} 
              customers={customers} 
              formatDate={formatDate} 
              formatCurrency={formatCurrency} 
              handleFirestoreError={handleFirestoreError} 
              user={user} 
              ensureAuthSession={ensureAuthSession}
              addNotification={addNotification}
              isCashierOpen={isCashierOpen}
              setCurrentView={setActiveTab}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              monthlyGoals={monthlyGoals}
            />
          )}
          {activeTab === 'cashier' && (
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
          {activeTab === 'costs' && <FixedCostsView fixedCosts={fixedCosts} setFixedCosts={setFixedCosts} addNotification={addNotification} handleFirestoreError={handleFirestoreError} user={user} formatCurrency={formatCurrency} formatDate={formatDate} ensureAuthSession={ensureAuthSession} />}
          {activeTab === 'config' && (
            <ConfigView 
              settings={settings} 
              setSettings={setSettings} 
              addNotification={addNotification} 
            />
          )}
          {activeTab === 'backup' && (
            <BackupView 
              sales={sales} setSales={setSales}
              products={products} setProducts={setProducts}
              customers={customers} setCustomers={setCustomers}
              brands={brands} setBrands={setBrands}
              productCategories={productCategories} setProductCategories={setProductCategories}
              fixedCosts={fixedCosts} setFixedCosts={setFixedCosts}
              monthlyGoals={monthlyGoals} setMonthlyGoals={setMonthlyGoals}
              settings={settings} setSettings={setSettings}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
            />
          )}
          {activeTab === 'campaigns' && (
            <CampaignsView 
              campaigns={campaigns}
              setCampaigns={setCampaigns}
              customers={customers}
              sales={sales}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              formatDate={formatDate}
              ensureAuthSession={ensureAuthSession}
            />
          )}
          {activeTab === 'giveaways' && (
            <GiveawaysView 
              giveaways={giveaways}
              setGiveaways={setGiveaways}
              customers={customers}
              addNotification={addNotification}
              handleFirestoreError={handleFirestoreError}
              user={user}
              ensureAuthSession={ensureAuthSession}
            />
          )}
          {activeTab === 'routine' && <RoutineView routines={routines} setRoutines={setRoutines} staff={staff} addNotification={addNotification} handleFirestoreError={handleFirestoreError} user={user} formatDate={formatDate} ensureAuthSession={ensureAuthSession} />}
          {activeTab === 'staff' && (
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
            />
          )}
          
          {/* Placeholder for other tabs */}
          {!['atendimento', 'dashboard', 'products', 'combos', 'kits', 'brands', 'customers', 'sales', 'cashier', 'costs', 'routine', 'staff', 'backup', 'campaigns', 'performance', 'goals', 'giveaways', 'funcao_rotina', 'reports', 'admin_profile'].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Sparkles size={48} className="mb-4 text-blue-500 animate-pulse" />
              <h3 className="text-xl font-black text-slate-900 mb-2">Em Desenvolvimento</h3>
              <p className="text-slate-500 max-w-sm text-center font-bold">
                Esta funcionalidade está sendo preparada com todo carinho para você.
              </p>
            </div>
          )}
        </div>
        {/* Item Avulso Modal */}
        <AnimatePresence>
          {isCustomItemModalOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-800"
              >
                <div className="p-8 bg-gradient-to-br from-blue-600 to-blue-700 text-white text-center space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20 shadow-xl">
                    <Plus size={32} />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Item Avulso</h3>
                  <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Adicione um item personalizado ao carrinho</p>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Item / Serviço</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        placeholder="Ex: SERVIÇO DE CORTE"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold uppercase text-sm transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Quantidade</label>
                      <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                        <button 
                          onClick={() => setCustomItemQuantity(prev => Math.max(1, Number(prev) - 1).toString())}
                          className="p-4 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <input 
                          type="number" 
                          value={customItemQuantity}
                          onChange={(e) => setCustomItemQuantity(e.target.value)}
                          min="1"
                          className="w-full bg-transparent border-none focus:ring-0 font-black text-xl text-center p-0"
                        />
                        <button 
                          onClick={() => setCustomItemQuantity(prev => (Number(prev) + 1).toString())}
                          className="p-4 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Valor Unit. (R$)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="number" 
                          value={customItemPrice}
                          onChange={(e) => setCustomItemPrice(e.target.value)}
                          placeholder="0,00"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-black text-xl text-center transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setIsCustomItemModalOpen(false)}
                      className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={addCustomItemToCart}
                      className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Check size={18} />
                      Adicionar ao Carrinho
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Finalize Confirmation Modal */}
        <AnimatePresence>
          {isFinalizeConfirmationOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800"
              >
                <div className="p-8 bg-emerald-600 text-white text-center space-y-2">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Confirmar Venda</h3>
                  <p className="text-emerald-100 text-sm font-bold uppercase tracking-widest">Revise os itens antes de finalizar</p>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens no Carrinho</span>
                      <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{cart.length} itens</span>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                      {cart.map((item, idx) => (
                        <div key={item.productId || idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{item.name}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase">{item.quantity} UN x {formatCurrency(item.price)}</p>
                          </div>
                          <p className="text-[10px] font-black text-slate-900 dark:text-white ml-4">{formatCurrency(item.total)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{formatCurrency(cart.reduce((acc, i) => acc + i.total, 0))}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Desconto</span>
                        <span className="text-xs font-bold text-rose-500">-{formatCurrency(discount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Total Final</span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(cart.reduce((acc, i) => acc + i.total, 0) - discount)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setIsFinalizeConfirmationOpen(false)} 
                      className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest"
                    >
                      Revisar
                    </button>
                    <button 
                      onClick={handleFinalizeSale}
                      className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                    >
                      Confirmar e Finalizar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Atendimento Summary Modal */}
        <AnimatePresence>
          {isAtendimentoSummaryOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800"
              >
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                      <BarChart3 size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Resumo do Dia</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase">Vendas realizadas hoje</p>
                    </div>
                  </div>
                  <button onClick={() => setIsAtendimentoSummaryOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl">
                      <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Total Vendido</p>
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(sales.filter(s => s.date.startsWith(new Date().toISOString().split('T')[0])).reduce((acc, s) => acc + s.total, 0))}
                      </p>
                    </div>
                    <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl">
                      <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Vendas Hoje</p>
                      <p className="text-2xl font-black text-blue-700 dark:text-blue-300">
                        {sales.filter(s => s.date.startsWith(new Date().toISOString().split('T')[0])).length}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendas por Vendedora (Hoje)</h4>
                    <div className="space-y-2">
                      {['ALESANDRA', 'LETICIA', 'ESTAGIÁRIA'].map(v => {
                        const vSales = sales.filter(s => s.vendedora === v && s.date.startsWith(new Date().toISOString().split('T')[0]));
                        const vTotal = vSales.reduce((acc, s) => acc + s.total, 0);
                        return (
                          <div key={v} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{v}</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency(vTotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => setIsAtendimentoSummaryOpen(false)}
                    className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 dark:hover:bg-slate-600 transition-all"
                  >
                    Fechar Resumo
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Thermal Receipt (Hidden for UI, Visible for Print) */}
      {lastCompletedSale && (
        <div id="thermal-receipt" className="fixed top-0 left-0 w-full z-[-1] pointer-events-none print:z-[9999] print:pointer-events-auto print:bg-white">
          <div className="font-mono text-[10px] p-2 text-black bg-white w-[80mm] mx-auto">
            <div className="text-center space-y-1 mb-4">
              {settings.receiptConfig?.showLogo && settings.logo && (
                <div className="flex justify-center mb-2">
                  <img src={settings.logo} alt="Logo" className="w-12 h-12 object-contain" />
                </div>
              )}
              <h2 className="text-xs font-black uppercase tracking-tighter">{settings.name}</h2>
              {settings.receiptConfig?.showAddress && <p className="text-[9px] leading-tight">{settings.address}</p>}
              <div className="flex justify-center gap-2">
                {settings.receiptConfig?.showPhone && <p className="text-[9px]">WhatsApp: {settings.phone}</p>}
                {settings.receiptConfig?.showInstagram && settings.instagram && <p className="text-[9px]">Insta: @{settings.instagram}</p>}
              </div>
              <div className="border-b border-dashed border-black my-2" />
              <p className="font-black">CUPOM NÃO FISCAL</p>
              <div className="border-b border-dashed border-black my-2" />
            </div>
            
            <div className="space-y-1 mb-2 text-[9px]">
              <p>Data: {new Date(lastCompletedSale.date).toLocaleString('pt-BR')}</p>
              <p>Venda: {lastCompletedSale.id}</p>
              <p>Cliente: {lastCompletedSale.customerName}</p>
              {settings.receiptConfig?.showSeller && <p>Vendedora: {lastCompletedSale.vendedora}</p>}
            </div>

            <div className="border-b border-dashed border-black my-2" />
            
            <table className="w-full text-left text-[9px] border-collapse">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1">ITEM</th>
                  <th className="py-1 text-center">QT</th>
                  <th className="py-1 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {lastCompletedSale.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-1 uppercase pr-2">{item.name}</td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-b border-dashed border-black my-2" />
            
            <div className="space-y-1 text-[9px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(lastCompletedSale.total + (lastCompletedSale.discount || 0))}</span>
              </div>
              {lastCompletedSale.discount > 0 && (
                <div className="flex justify-between">
                  <span>Desconto:</span>
                  <span>- {formatCurrency(lastCompletedSale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-[11px] pt-1">
                <span>TOTAL:</span>
                <span>{formatCurrency(lastCompletedSale.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pagamento:</span>
                <span className="uppercase">{lastCompletedSale.paymentMethod}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-black my-4" />
            
            <div className="text-center space-y-1 text-[9px]">
              <p className="font-black uppercase">{settings.receiptConfig?.customMessage || 'OBRIGADO PELA PREFERÊNCIA!'}</p>
              {!settings.receiptConfig?.customMessage && <p>VOLTE SEMPRE</p>}
            </div>
            <div className="h-8" />
          </div>
        </div>
      )}
    </div>
  );
};
