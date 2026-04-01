import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  LogOut, 
  Search, 
  Plus, 
  Minus,
  ArrowLeft,
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  User as UserIcon, 
  UserPlus,
  MessageSquare,
  Phone,
  BarChart3, 
  Wallet, 
  History, 
  Lock, 
  PlusCircle, 
  MinusCircle, 
  Eye, 
  Filter, 
  MoreVertical,
  QrCode,
  CreditCard,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Store,
  ReceiptText,
  CheckCircle2,
  Target,
  Tag,
  Download,
  Copy,
  FileSpreadsheet,
  Upload,
  Database,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Sparkles,
  Beaker,
  Edit,
  X,
  Bell,
  AlertTriangle,
  Clock,
  AlertCircle,
  ExternalLink,
  FileText,
  Printer,
  RefreshCw,
  MapPin,
  Trophy,
  Zap,
  Star,
  Globe,
  Activity,
  Moon,
  Sun,
  Palette,
  CheckSquare,
  ClipboardList,
  Coffee,
  Smartphone,
  Instagram,
  Briefcase,
  BookOpen,
  Users2,
  Heart,
  Check,
  HelpCircle,
  ShieldCheck,
  Info,
  UserCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { User } from './firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility to remove accents and normalize for comparison (Ex: "Letícia" -> "leticia", "Alessandra" -> "alessandra")
const getComparisonKey = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '') // Remove espaços
    .replace(/(.)\1+/g, '$1'); // Opcional: trata letras duplas como simples (Ex: "Alessandra" -> "alesandra")
};

// Utility to get month stats (saturdays and weekdays)
const getMonthStats = (monthStr: string, holidays: string[] = [], blockedDays: string[] = []) => {
  if (!monthStr) return { saturdays: 0, weekdays: 0 };
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  let saturdays = 0;
  let weekdays = 0;
  
  while (date.getMonth() === month - 1) {
    const dateStr = date.toISOString().split('T')[0];
    if (!holidays.includes(dateStr) && !blockedDays.includes(dateStr)) {
      const day = date.getDay();
      if (day === 6) { // Saturday
        saturdays++;
      } else if (day >= 1 && day <= 5) { // Mon-Fri
        weekdays++;
      }
    }
    date.setDate(date.getDate() + 1);
  }
  return { saturdays, weekdays };
};

// Utility for pretty name normalization (Ex: "alessandra" -> "Alessandra")
// --- Utilities ---
const parseSaleDate = (sale: Sale) => {
  if (sale.createdAt) return new Date(sale.createdAt);
  const parts = sale.date.split(/[\/\-\.]/).map(Number);
  if (parts.length !== 3) return new Date();
  // Assume DD/MM/YYYY if first part is <= 31
  if (parts[0] <= 31) return new Date(parts[2], parts[1] - 1, parts[0], 12);
  // Assume YYYY/MM/DD if first part is > 1000
  return new Date(parts[0], parts[1] - 1, parts[2], 12);
};

const formatRelativeDate = (dateStr: string) => {
  if (!dateStr) return 'Nunca';
  const date = dateStr.includes('T') ? new Date(dateStr) : parseSaleDate({ date: dateStr } as Sale);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Há ${Math.floor(diffDays / 30)} meses`;
  return `Há ${Math.floor(diffDays / 365)} anos`;
};

const normalizeName = (name: string) => {
  return name.trim().split(/\s+/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

const getProductEmoji = (name: string, category?: string) => {
  const n = name.toLowerCase();
  const c = (category || '').toLowerCase();
  
  if (n.includes('shampoo') || n.includes('condicionador') || n.includes('máscara') || n.includes('wella') || n.includes('truss') || c.includes('cabelo')) return '💇‍♀️';
  if (n.includes('batom') || n.includes('gloss') || n.includes('lip')) return '💄';
  if (n.includes('base') || n.includes('corretivo') || n.includes('pó') || n.includes('maquiagem') || c.includes('maquiagem')) return '✨';
  if (n.includes('óleo') || n.includes('oil') || n.includes('infusion')) return '💧';
  if (n.includes('perfume') || n.includes('fragrância')) return '🧴';
  if (n.includes('skincare') || n.includes('creme') || n.includes('facial') || c.includes('skincare')) return '🧴';
  if (n.includes('esmalte') || n.includes('unha')) return '💅';
  return '📦';
};

// --- Persistence Hook ---
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

// --- Types ---
type View = 'atendimento' | 'dashboard' | 'products' | 'brands' | 'sales' | 'cash' | 'fixed-costs' | 'settings' | 'backup' | 'customers' | 'salespersons' | 'routine' | 'campaigns' | 'goals' | 'performance';

interface Campaign {
  id: string;
  name: string;
  message: string;
  type: 'new_customer' | 'inactive_30d' | 'general';
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  gender?: 'Masculino' | 'Feminino' | 'Outro';
  city?: string;
  address?: string;
  birthDate?: string;
  notes?: string;
  createdAt: string;
}

interface Salesperson {
  id: string;
  name: string;
  isActive: boolean;
  status: 'active' | 'training' | 'inactive';
  startDate?: string;
  employmentType?: 'CLT' | 'Estagiária' | 'Dona';
  function?: string;
  individualGoal?: number;
  commissionRate?: number;
  commissionType?: 'percentage' | 'fixed';
  commissionSource?: 'individual' | 'store';
  commissionPeriod?: 'monthly' | 'weekly';
  tieredCommission?: {
    threshold: number;
    rate: number;
    bonus?: number;
  }[];
}

interface MonthlyGoal {
  month: string;
  targetAmount: number;
  workingDays: number;
  saturdayCount?: number;
  saturdayTarget?: number;
  holidays?: string[];
  blockedDays?: string[];
  workHours?: {
    weekday: number;
    saturday: number;
  };
  storeBonus?: number; // Bonus if store goal is hit
  storeBonusType?: 'percentage' | 'fixed';
  mode: 'simple' | 'advanced';
}

interface RoutineItem {
  text: string;
  icon: string; // Store icon name as string
}

interface RoutineSection {
  id: string;
  title: string;
  icon: string;
  color: string;
  bg: string;
  description?: string;
  warning?: string;
  items: RoutineItem[];
}

interface Brand {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  costPrice?: number; // Preço de custo para cálculo de lucro
  originalPrice?: number;
  category: string;
  stock: number;
  image?: string;
}

interface Transaction {
  id: string;
  type: 'in' | 'out' | 'sale';
  description: string;
  amount: number;
  time: string;
  date: string;
  method?: string;
}

interface FixedCost {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
}

interface Sale {
  id: string;
  date: string; // Keep for display/legacy
  createdAt?: string; // ISO string for better sorting/parsing
  salesperson: string;
  items: { product: Product, qty: number, priceOverride?: number }[];
  total: number;
  paymentMethod: 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'installments' | 'link';
  installments?: number;
  shift: 'Manhã' | 'Tarde' | 'Sábado';
  type: 'Presencial' | 'Online';
  saleCategory: 'Venda à vista' | 'Parcelado' | 'Locação' | 'Venda alta';
  discount?: number;
  status?: 'completed' | 'cancelled' | 'refunded';
  cancelReason?: string;
  customerId?: string;
  cost: number;
  commission?: number;
}

// --- Mock Data ---
const DEFAULT_ROUTINES: RoutineSection[] = [
  {
    id: '1',
    title: 'ROTINA DIÁRIA – BIOBEL',
    icon: 'Coffee',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    items: [
      { text: 'Fazer o café', icon: 'Coffee' },
      { text: 'WhatsApp: responder clientes', icon: 'Smartphone' },
    ]
  },
  {
    id: '2',
    title: 'POSTAGEM ESTRATÉGICA',
    icon: 'Instagram',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    description: 'Tipos: Antes e depois, Produto do dia, Combo especial, Bastidores da loja',
    items: [
      { text: 'Status no WhatsApp', icon: 'Smartphone' },
      { text: 'Postar campanha no grupo da loja', icon: 'MessageSquare' },
    ]
  },
  {
    id: '3',
    title: 'ORGANIZAÇÃO INTELIGENTE',
    icon: 'Briefcase',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    items: [
      { text: 'Limpar vitrine', icon: 'Eye' },
      { text: 'Ajustar etiquetas', icon: 'Tag' },
      { text: 'Conferir estoque da linha foco do dia', icon: 'Package' },
    ]
  },
  {
    id: '4',
    title: 'TREINO RÁPIDO (15 MIN)',
    icon: 'BookOpen',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    description: 'Escolher 1 produto e estudar: Benefício, Indicação, Contraindicação, Argumento de venda.',
    items: [
      { text: 'Conhecimento aumenta conversão', icon: 'TrendingUp' },
    ]
  },
  {
    id: '5',
    title: 'AÇÃO DE RELACIONAMENTO',
    icon: 'Users2',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    description: 'Reativar clientes que compraram há 30–60 dias (últimas clientes no WhatsApp).',
    items: [
      { text: 'Foco em retenção', icon: 'Heart' },
    ]
  },
  {
    id: '6',
    title: 'REVISÃO DA LOJA',
    icon: 'Eye',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    items: [
      { text: 'Conferir vitrine', icon: 'Eye' },
      { text: 'Conferir limpeza', icon: 'Sparkles' },
      { text: 'Conferir exposição', icon: 'LayoutDashboard' },
    ]
  },
  {
    id: '7',
    title: 'MERCADO',
    icon: 'Search',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    description: 'Pesquisar concorrentes (Sites, Instagram, Facebook, TikTok).',
    warning: 'Atenção: cuida para o concorrente não ver que você está seguindo eles.',
    items: [
      { text: 'Análise de tendências', icon: 'TrendingUp' },
    ]
  }
];

const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Shampoo Truss Equilibrium', brand: 'Truss', price: 129.90, costPrice: 65.00, originalPrice: 159.90, category: 'Cabelo', stock: 25, image: '💇‍♀️' },
  { id: '2', name: 'Base Melu Matte', brand: 'Melu', price: 39.90, costPrice: 20.00, originalPrice: 49.90, category: 'Maquiagem', stock: 50, image: '✨' },
  { id: '3', name: 'Batom Nina Secrets', brand: 'Nina Secrets', price: 45.00, costPrice: 22.50, category: 'Maquiagem', stock: 30, image: '💄' },
  { id: '4', name: 'Máscara Wella Invigo', brand: 'Wella', price: 159.90, costPrice: 80.00, originalPrice: 199.90, category: 'Cabelo', stock: 15, image: '💇‍♀️' },
  { id: '5', name: 'Corretivo Vizzela', brand: 'Vizzela', price: 35.90, costPrice: 18.00, category: 'Maquiagem', stock: 40, image: '✨' },
  { id: '6', name: 'Shampoo e condicionador uso obrigatório', brand: 'Truss', price: 189.90, costPrice: 95.00, originalPrice: 220.00, category: 'Cabelo', stock: 20, image: '💇‍♀️' },
  { id: '7', name: 'Amino 210', brand: 'Truss', price: 200.00, costPrice: 100.00, category: 'Cabelo', stock: 15, image: '💇‍♀️' },
  { id: '8', name: 'Óleo Nutri Infusion', brand: 'Truss', price: 75.00, costPrice: 37.50, originalPrice: 95.00, category: 'Cabelo', stock: 20, image: '💧' },
  { id: '9', name: 'Máscara Uso Obrigatório', brand: 'Truss', price: 159.99, costPrice: 80.00, category: 'Cabelo', stock: 15, image: '💇‍♀️' },
  { id: '10', name: 'Impassable', brand: 'Truss', price: 159.99, costPrice: 80.00, category: 'Cabelo', stock: 10, image: '💇‍♀️' },
  { id: '11', name: 'Shampoo e Condicionador Eldora', brand: 'Eldora', price: 89.90, costPrice: 45.00, category: 'Cabelo', stock: 15, image: '💇‍♀️' },
  { id: '12', name: 'Máscara de Tratamento Eldora', brand: 'Eldora', price: 69.90, costPrice: 35.00, category: 'Cabelo', stock: 10, image: '💇‍♀️' },
  { id: '13', name: 'Óleo Capilar Truss', brand: 'Truss', price: 119.90, costPrice: 60.00, category: 'Cabelo', stock: 12, image: '💧' },
  { id: '14', name: 'Óleo Capilar Vellan', brand: 'Vellan', price: 95.00, costPrice: 47.50, category: 'Cabelo', stock: 8, image: '💧' },
  { id: '15', name: 'Platele', brand: 'Platele', price: 150.00, costPrice: 75.00, category: 'Diversos', stock: 5, image: '📦' },
  { id: '16', name: 'Máscara Silver', brand: 'Diversos', price: 79.90, costPrice: 40.00, category: 'Cabelo', stock: 10, image: '💇‍♀️' },
  { id: '17', name: 'Coloração Truss', brand: 'Truss', price: 45.00, costPrice: 22.50, category: 'Cabelo', stock: 30, image: '🎨' },
  { id: '18', name: 'Coloração Igora', brand: 'Schwarzkopf', price: 55.00, costPrice: 27.50, category: 'Cabelo', stock: 25, image: '🎨' },
  { id: '19', name: 'Coloração Alfaparf', brand: 'Alfaparf', price: 39.90, costPrice: 20.00, category: 'Cabelo', stock: 40, image: '🎨' },
  { id: '20', name: 'Coloração Vizet', brand: 'Plattelli', price: 22.00, costPrice: 11.00, category: 'Cabelo', stock: 30, image: '🎨' },
  { id: '21', name: 'Mascara Jacques J Reparação', brand: 'Plattelli', price: 30.00, costPrice: 15.00, category: 'Cabelo', stock: 20, image: '💇‍♀️' },
  { id: '22', name: 'Mascara Blond Nutrimaxxi', brand: 'Plattelli', price: 40.00, costPrice: 20.00, category: 'Cabelo', stock: 15, image: '💇‍♀️' },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'in', description: 'Reforço de Caixa', amount: 200.00, time: '08:15', date: new Date().toLocaleDateString('pt-BR') },
  { id: '2', type: 'sale', description: 'Venda PDV #4502', amount: 85.90, time: '09:42', date: new Date().toLocaleDateString('pt-BR'), method: 'Dinheiro' },
  { id: '3', type: 'out', description: 'Sangria de Caixa', amount: -45.00, time: '10:15', date: new Date().toLocaleDateString('pt-BR') },
  { id: '4', type: 'sale', description: 'Venda PDV #4503', amount: 124.50, time: '11:20', date: new Date().toLocaleDateString('pt-BR'), method: 'Dinheiro' },
];

const MOCK_SALES: Sale[] = [];
const MOCK_BRANDS: Brand[] = [
  { id: '1', name: 'Truss' },
  { id: '2', name: 'Wella' },
  { id: '3', name: 'Melu' },
  { id: '4', name: 'Nina Secrets' },
  { id: '5', name: 'Vizzela' },
  { id: '6', name: 'Eudora' },
  { id: '7', name: 'Vellan' },
  { id: '8', name: 'Platele' },
  { id: '9', name: 'Schwarzkopf' },
  { id: '10', name: 'Alfaparf' },
  { id: '11', name: 'Plattelli' },
];

const MOCK_CATEGORIES = [
  'Maquiagem',
  'Cremes',
  'Perfumes',
  'Cabelo',
  'Skincare',
  'Outros',
  'Diversos'
];
const MOCK_SALESPERSONS: Salesperson[] = [
  { id: '1', name: 'Alessandra', isActive: true, status: 'active', commissionRate: 3 },
  { id: '2', name: 'Letícia', isActive: true, status: 'active', commissionRate: 3 },
  { id: '3', name: 'Estagiária', isActive: true, status: 'active', commissionRate: 3 },
];
const MOCK_FIXED_COSTS: FixedCost[] = [
  { id: '1', description: 'Aluguel', amount: 2500.00, dueDate: '10', isPaid: false },
  { id: '2', description: 'Energia', amount: 450.00, dueDate: '15', isPaid: true },
  { id: '3', description: 'Internet', amount: 120.00, dueDate: '05', isPaid: true },
];

// --- Components ---

const RoutineView = ({ routines, setRoutines }: { routines: RoutineSection[], setRoutines: React.Dispatch<React.SetStateAction<RoutineSection[]>> }) => {
  const [isEditing, setIsEditing] = useState(false);

  const availableIcons = [
    'Coffee', 'Smartphone', 'Instagram', 'MessageSquare', 'Briefcase', 
    'Eye', 'Tag', 'Package', 'BookOpen', 'TrendingUp', 'Users2', 
    'Heart', 'Sparkles', 'LayoutDashboard', 'Search', 'AlertTriangle', 
    'ClipboardList', 'Check'
  ];

  const sectionColors = [
    { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
    { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' },
  ];

  const addSection = () => {
    const newSection: RoutineSection = {
      id: Date.now().toString(),
      title: 'NOVA SEÇÃO',
      icon: 'ClipboardList',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      items: [{ text: 'Nova tarefa', icon: 'Check' }]
    };
    setRoutines([...routines, newSection]);
  };

  const updateSection = (id: string, updates: Partial<RoutineSection>) => {
    setRoutines(routines.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSection = (id: string) => {
    if (confirm('Excluir esta seção?')) {
      setRoutines(routines.filter(s => s.id !== id));
    }
  };

  const addItem = (sectionId: string) => {
    setRoutines(routines.map(s => s.id === sectionId ? {
      ...s,
      items: [...s.items, { text: 'Nova tarefa', icon: 'Check' }]
    } : s));
  };

  const updateItem = (sectionId: string, itemIdx: number, text: string) => {
    setRoutines(routines.map(s => s.id === sectionId ? {
      ...s,
      items: s.items.map((item, i) => i === itemIdx ? { ...item, text } : item)
    } : s));
  };

  const deleteItem = (sectionId: string, itemIdx: number) => {
    setRoutines(routines.map(s => s.id === sectionId ? {
      ...s,
      items: s.items.filter((_, i) => i !== itemIdx)
    } : s));
  };

  const getIconComponent = (name: string) => {
    const icons: any = { Coffee, Smartphone, Instagram, MessageSquare, Briefcase, Eye, Tag, Package, BookOpen, TrendingUp, Users2, Heart, Sparkles, LayoutDashboard, Search, AlertTriangle, ClipboardList, Check };
    return icons[name] || ClipboardList;
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Função & Rotina</h2>
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Atividades diárias da equipe Biobel</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <button 
              onClick={addSection}
              className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
            >
              <Plus size={18} />
              Nova Seção
            </button>
          )}
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg",
              isEditing ? "bg-blue-600 text-white shadow-blue-100" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-slate-100"
            )}
          >
            {isEditing ? <Check size={18} /> : <Edit size={18} />}
            {isEditing ? 'Salvar Alterações' : 'Editar Rotina'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {routines.map((section, idx) => {
          const Icon = getIconComponent(section.icon);
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col group"
            >
              <div className={cn("p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 relative", section.bg, "dark:bg-slate-800/50")}>
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-white dark:bg-slate-900", section.color)}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <div className="flex flex-col gap-2 w-full">
                      <input 
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value.toUpperCase() })}
                        className="w-full bg-white/50 dark:bg-slate-800/50 px-2 py-1 rounded font-black text-slate-900 dark:text-white uppercase tracking-tight outline-none focus:bg-white dark:focus:bg-slate-700"
                      />
                      <div className="flex flex-wrap gap-1">
                        {availableIcons.map(iconName => {
                          const IconComp = getIconComponent(iconName);
                          return (
                            <button 
                              key={iconName}
                              onClick={() => updateSection(section.id, { icon: iconName })}
                              className={cn(
                                "p-1.5 rounded-lg transition-all",
                                section.icon === iconName ? "bg-white dark:bg-slate-900 shadow-sm scale-110" : "opacity-40 hover:opacity-100"
                              )}
                            >
                              <IconComp size={14} className={section.color} />
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sectionColors.map(c => (
                          <button 
                            key={c.bg}
                            onClick={() => updateSection(section.id, { bg: c.bg, color: c.text })}
                            className={cn(
                              "w-5 h-5 rounded-full border transition-all",
                              c.bg,
                              section.bg === c.bg ? "scale-125 border-slate-900 dark:border-white" : "border-transparent"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{section.title}</h3>
                  )}
                  {isEditing ? (
                    <input 
                      value={section.description || ''}
                      onChange={(e) => updateSection(section.id, { description: e.target.value })}
                      placeholder="Descrição (opcional)"
                      className="w-full bg-transparent px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1 outline-none focus:bg-white/30 dark:focus:bg-slate-700/30"
                    />
                  ) : section.description && (
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">{section.description}</p>
                  )}
                </div>
                {isEditing && (
                  <button 
                    onClick={() => deleteSection(section.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <div className="p-6 space-y-4 flex-1">
                {section.items.map((item, i) => {
                  const ItemIcon = getIconComponent(item.icon);
                  return (
                    <div key={i} className="flex items-center gap-3 group/item">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover/item:bg-blue-50 dark:group-hover/item:bg-blue-900/20 group-hover/item:text-blue-600 transition-all">
                        <ItemIcon size={16} />
                      </div>
                      {isEditing ? (
                        <div className="flex-1 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <input 
                              value={item.text}
                              onChange={(e) => updateItem(section.id, i, e.target.value)}
                              className="flex-1 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 outline-none focus:bg-white dark:focus:bg-slate-700 border border-transparent focus:border-blue-200 dark:focus:border-blue-900"
                            />
                            <button 
                              onClick={() => deleteItem(section.id, i)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {['Check', 'Coffee', 'Smartphone', 'Instagram', 'MessageSquare', 'Briefcase', 'Tag', 'Package', 'Search'].map(iconName => {
                              const IconComp = getIconComponent(iconName);
                              return (
                                <button 
                                  key={iconName}
                                  onClick={() => {
                                    setRoutines(routines.map(s => s.id === section.id ? {
                                      ...s,
                                      items: s.items.map((it, idx) => idx === i ? { ...it, icon: iconName } : it)
                                    } : s));
                                  }}
                                  className={cn(
                                    "p-1 rounded-lg transition-all",
                                    item.icon === iconName ? "bg-blue-100 text-blue-600" : "text-slate-300 hover:text-slate-500"
                                  )}
                                >
                                  <IconComp size={12} />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors">{item.text}</span>
                      )}
                    </div>
                  );
                })}
                
                {isEditing && (
                  <button 
                    onClick={() => addItem(section.id)}
                    className="w-full py-3 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 dark:hover:border-blue-900 transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest"
                  >
                    <Plus size={14} />
                    Adicionar Item
                  </button>
                )}

                {isEditing ? (
                  <div className="mt-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Aviso / Atenção</label>
                    <textarea 
                      value={section.warning || ''}
                      onChange={(e) => updateSection(section.id, { warning: e.target.value })}
                      placeholder="Aviso importante para esta seção..."
                      className="w-full bg-rose-50/50 dark:bg-rose-900/5 p-3 rounded-2xl text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase leading-relaxed outline-none border border-rose-100 dark:border-rose-900/20 focus:bg-rose-50 dark:focus:bg-rose-900/10"
                      rows={2}
                    />
                  </div>
                ) : section.warning && (
                  <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/20 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase leading-relaxed">{section.warning}</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
const Sidebar = ({ 
  currentView, 
  setView, 
  onLogout,
  companyName,
  companyLogo
}: { 
  currentView: View, 
  setView: (v: View) => void, 
  onLogout: () => void,
  companyName: string,
  companyLogo: string
}) => {
  const sections = [
    {
      title: 'OPERAÇÃO / VENDAS',
      items: [
        { id: 'atendimento', label: 'Atendimento', icon: ShoppingCart },
        { id: 'performance', label: 'Meu Desempenho', icon: UserCircle },
        { id: 'sales', label: 'Vendas', icon: History },
        { id: 'cash', label: 'Caixa', icon: Wallet },
      ]
    },
    {
      title: 'CADASTROS',
      items: [
        { id: 'products', label: 'Produtos', icon: Package },
        { id: 'brands', label: 'Marcas', icon: Target },
      ]
    },
    {
      title: 'GESTÃO / MÉTRICAS',
      items: [
        { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
        { id: 'routine', label: 'Função (Rotina)', icon: ClipboardList },
        { id: 'customers', label: 'Clientes (CRM)', icon: UserIcon },
        { id: 'campaigns', label: 'Campanhas', icon: Sparkles },
        { id: 'fixed-costs', label: 'Custos Fixos', icon: ReceiptText },
      ]
    },
    {
      title: 'CONFIGURAÇÕES',
      items: [
        { id: 'goals', label: 'Metas Mensais', icon: Target },
        { id: 'settings', label: 'Vendedoras & Empresa', icon: Settings },
        { id: 'backup', label: 'Backup & Importação', icon: Database },
      ]
    }
  ];

  return (
    <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col h-screen sticky top-0 hidden lg:flex transition-colors duration-300">
      <div className="p-8 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden bg-white"
            style={{ backgroundColor: !companyLogo ? 'var(--primary-color)' : 'white' }}
          >
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <Store className="text-white" size={24} />
            )}
          </div>
          <div className="overflow-hidden">
            <h1 className="font-black text-slate-900 dark:text-white tracking-tight leading-none truncate uppercase">{companyName}</h1>
            <p className="text-[10px] font-bold tracking-[0.2em] mt-1 uppercase opacity-60" style={{ color: 'var(--primary-color)' }}>Sistema Gestão</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase px-4">{section.title}</p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as View)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 relative group",
                    currentView === item.id 
                      ? "bg-slate-50 dark:bg-slate-800 shadow-sm" 
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  )}
                  style={currentView === item.id ? { color: 'var(--primary-color)' } : {}}
                >
                  <item.icon size={20} className={cn(
                    "transition-transform group-hover:scale-110",
                    currentView === item.id ? "" : "text-slate-400 dark:text-slate-500"
                  )} style={currentView === item.id ? { color: 'var(--primary-color)' } : {}} />
                  <span className="text-sm">{item.label}</span>
                  {currentView === item.id && (
                    <motion.div 
                      layoutId="active-nav"
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: 'var(--primary-color)' }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-100">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-600 font-bold transition-colors"
        >
          <LogOut size={20} />
          <span className="text-sm">Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
};

const BottomNav = ({ currentView, setView }: { currentView: View, setView: (v: View) => void }) => {
  const items = [
    { id: 'atendimento', label: 'Venda', icon: ShoppingCart },
    { id: 'routine', label: 'Função', icon: ClipboardList },
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'customers', label: 'Clientes', icon: UserIcon },
    { id: 'settings', label: 'Menu', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex justify-around items-center z-50 pb-safe transition-colors duration-300">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setView(item.id as View)}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all relative",
            currentView === item.id ? "" : "text-slate-400 dark:text-slate-500"
          )}
          style={currentView === item.id ? { color: 'var(--primary-color)' } : {}}
        >
          <item.icon size={24} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          {currentView === item.id && (
            <motion.div 
              layoutId="active-bottom-nav"
              className="absolute -top-2 w-8 h-1 rounded-full"
              style={{ backgroundColor: 'var(--primary-color)' }}
            />
          )}
        </button>
      ))}
    </nav>
  );
};

const Dashboard = ({ salespersons, sales, monthlyGoal, products, customers }: { salespersons: Salesperson[], sales: Sale[], monthlyGoal: MonthlyGoal, products: Product[], customers: Customer[] }) => {
  const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [range, setRange] = useState<'day' | '7days' | '30days' | 'month' | 'custom' | 'compare'>('day');
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'products' | 'finance' | 'customers'>('overview');
  const [showClosingReport, setShowClosingReport] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(getLocalDateString());
  const [customEndDate, setCustomEndDate] = useState(getLocalDateString());
  
  // Comparison states
  const [compareStartDateA, setCompareStartDateA] = useState('');
  const [compareEndDateA, setCompareEndDateA] = useState('');
  const [compareStartDateB, setCompareStartDateB] = useState('');
  const [compareEndDateB, setCompareEndDateB] = useState('');
  
  const activeSalespersons = salespersons.filter(s => s.isActive);
  
  const formattedSelectedDate = useMemo(() => {
    const [year, month, day] = selectedDate.split('-');
    return `${day}/${month}/${year}`;
  }, [selectedDate]);

  const filteredSales = useMemo(() => {
    if (range === 'day') {
      return sales.filter(s => s.date === formattedSelectedDate);
    }
    
    if (range === 'custom') {
      const start = new Date(customStartDate + 'T00:00:00');
      const end = new Date(customEndDate + 'T23:59:59');
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

      return sales.filter(s => {
        const saleDate = parseSaleDate(s);
        return saleDate >= start && saleDate <= end;
      });
    }

    if (range === 'month') {
      const [year, month] = selectedDate.split('-').map(Number);
      return sales.filter(s => {
        const saleDate = parseSaleDate(s);
        return saleDate.getMonth() === (month - 1) && saleDate.getFullYear() === year;
      });
    }

    const [year, month, day] = selectedDate.split('-');
    const baseDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    baseDate.setHours(0, 0, 0, 0);

    const daysToSubtract = range === '7days' ? 6 : 29;
    const startDate = new Date(baseDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return sales.filter(s => {
      const saleDate = parseSaleDate(s);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate >= startDate && saleDate <= baseDate;
    });
  }, [sales, formattedSelectedDate, range, selectedDate, customStartDate, customEndDate]);

  const filteredSalesA = useMemo(() => {
    if (range !== 'compare' || !compareStartDateA || !compareEndDateA) return [];
    const start = new Date(compareStartDateA + 'T00:00:00');
    const end = new Date(compareEndDateA + 'T23:59:59');
    return sales.filter(s => {
      const saleDate = parseSaleDate(s);
      return saleDate >= start && saleDate <= end;
    });
  }, [sales, range, compareStartDateA, compareEndDateA]);

  const filteredSalesB = useMemo(() => {
    if (range !== 'compare' || !compareStartDateB || !compareEndDateB) return [];
    const start = new Date(compareStartDateB + 'T00:00:00');
    const end = new Date(compareEndDateB + 'T23:59:59');
    return sales.filter(s => {
      const saleDate = parseSaleDate(s);
      return saleDate >= start && saleDate <= end;
    });
  }, [sales, range, compareStartDateB, compareEndDateB]);

  const dateRangeLabel = useMemo(() => {
    if (range === 'day') {
      const [year, month, day] = selectedDate.split('-');
      return `${day}/${month}/${year}`;
    }
    if (range === '7days' || range === '30days') {
      const daysToSubtract = range === '7days' ? 6 : 29;
      const [year, month, day] = selectedDate.split('-').map(Number);
      const end = new Date(year, month - 1, day);
      const start = new Date(end);
      start.setDate(start.getDate() - daysToSubtract);
      return `${start.toLocaleDateString('pt-BR')} até ${end.toLocaleDateString('pt-BR')}`;
    }
    if (range === 'month') {
      const [year, month] = selectedDate.split('-');
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      return `${monthNames[parseInt(month) - 1]} de ${year}`;
    }
    if (range === 'custom') {
      const [sy, sm, sd] = customStartDate.split('-');
      const [ey, em, ed] = customEndDate.split('-');
      return `${sd}/${sm}/${sy} até ${ed}/${em}/${ey}`;
    }
    if (range === 'compare') return 'Comparação de Períodos';
    return '';
  }, [range, selectedDate, customStartDate, customEndDate]);

  const dayOfWeekNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const totalSold = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalCost = filteredSales.reduce((acc, s) => {
    const saleCost = s.items.reduce((itemAcc, item) => {
      return itemAcc + (item.product.costPrice || 0) * item.qty;
    }, 0);
    return acc + saleCost;
  }, 0);
  const totalProfit = totalSold - totalCost;
  const profitMargin = totalSold > 0 ? (totalProfit / totalSold) * 100 : 0;

  const salesCount = filteredSales.length;
  const avgTicket = salesCount > 0 ? totalSold / salesCount : 0;

  // Monthly stats (always relative to the selected date's month)
  const [selYear, selMonth] = selectedDate.split('-').map(Number);
  const monthlySales = sales.filter(s => {
    const saleDate = parseSaleDate(s);
    return saleDate.getMonth() === (selMonth - 1) && saleDate.getFullYear() === selYear;
  });
  const totalMonthlySold = monthlySales.reduce((acc, s) => acc + s.total, 0);

  // Weekly stats (relative to selected date)
  const baseDateObj = new Date(selYear, selMonth - 1, parseInt(selectedDate.split('-')[2]));
  const startOfWeek = new Date(baseDateObj);
  startOfWeek.setDate(baseDateObj.getDate() - baseDateObj.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const weeklySales = sales.filter(s => {
    const saleDate = parseSaleDate(s);
    saleDate.setHours(0, 0, 0, 0);
    return saleDate >= startOfWeek && saleDate <= baseDateObj;
  });
  const totalWeeklySold = weeklySales.reduce((acc, s) => acc + s.total, 0);

  // Goals calculations
  const daysInMonth = new Date(selYear, selMonth, 0).getDate();
  const currentDayOfMonth = parseInt(selectedDate.split('-')[2]);
  const expectedMonthlyProgress = (currentDayOfMonth / daysInMonth) * 100;
  
  const autoSaturdays = getMonthStats(monthlyGoal.month).saturdays;
  const monthSaturdays = monthlyGoal.saturdayCount ?? autoSaturdays;
  const totalSaturdayTarget = (monthlyGoal.saturdayTarget || 0) * monthSaturdays;
  const remainingTarget = monthlyGoal.targetAmount - totalSaturdayTarget;
  const weekdayDailyGoal = remainingTarget / (monthlyGoal.workingDays || 1);
  
  const isSelectedDateSaturday = new Date(selYear, selMonth - 1, currentDayOfMonth).getDay() === 6;
  const dailyGoal = isSelectedDateSaturday && monthlyGoal.saturdayTarget 
    ? monthlyGoal.saturdayTarget 
    : weekdayDailyGoal;

  const weeklyGoal = (weekdayDailyGoal * 5) + (monthlyGoal.saturdayTarget || 0); 
  const monthlyProgress = (totalMonthlySold / (monthlyGoal.targetAmount || 1)) * 100;
  const weeklyProgress = (totalWeeklySold / (weeklyGoal || 1)) * 100;
  const dailyProgress = (totalSold / (dailyGoal || 1)) * 100;

  const isMonthlyBelow = monthlyProgress < expectedMonthlyProgress * 0.9; 
  const isDailyBelow = dailyProgress < 100 && range === 'day' && new Date().toISOString().split('T')[0] === selectedDate && new Date().getHours() > 17;
  
  // Alerts logic
  const alerts = useMemo(() => {
    const list: { id: string, type: 'warning' | 'info' | 'error', title: string, description: string, icon: any }[] = [];

    // 1. Estoque Baixo
    const lowStock = products.filter(p => p.stock <= 5);
    if (lowStock.length > 0) {
      list.push({
        id: 'low-stock',
        type: 'warning',
        title: 'Estoque Crítico',
        description: `${lowStock.length} produtos estão com 5 ou menos unidades.`,
        icon: AlertTriangle
      });
    }

    // 2. Produtos Parados (sem venda nos últimos 15 dias)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    const soldProductIds = new Set();
    sales.forEach(s => {
      const [day, month, year] = s.date.split('/');
      const saleDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (saleDate >= fifteenDaysAgo) {
        s.items.forEach(item => soldProductIds.add(item.product.id));
      }
    });

    const staleProducts = products.filter(p => !soldProductIds.has(p.id));
    if (staleProducts.length > 0 && sales.length > 0) {
      list.push({
        id: 'stale-products',
        type: 'info',
        title: 'Produtos Parados',
        description: `${staleProducts.length} produtos sem saída nos últimos 15 dias.`,
        icon: Clock
      });
    }

    // 3. Meta não atingida (se estiver 20% abaixo do esperado para o dia do mês)
    if (monthlyProgress < expectedMonthlyProgress * 0.8 && monthlyGoal.targetAmount > 0) {
      list.push({
        id: 'goal-behind',
        type: 'error',
        title: 'Meta em Risco',
        description: `O desempenho mensal está ${(expectedMonthlyProgress - monthlyProgress).toFixed(1)}% abaixo do ritmo ideal.`,
        icon: Target
      });
    }

    // 4. Alerta de queda de vendas (Hoje vs Ontem)
    const todayStr = new Date().toLocaleDateString('pt-BR');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('pt-BR');

    const todayTotal = sales.filter(s => s.date === todayStr && s.status !== 'cancelled').reduce((acc, s) => acc + s.total, 0);
    const yesterdayTotal = sales.filter(s => s.date === yesterdayStr && s.status !== 'cancelled').reduce((acc, s) => acc + s.total, 0);

    if (yesterdayTotal > 0 && todayTotal < yesterdayTotal * 0.9) {
      const dropPercent = ((yesterdayTotal - todayTotal) / yesterdayTotal) * 100;
      if (dropPercent >= 10) {
        list.push({
          id: 'daily-drop',
          type: 'warning',
          title: 'Queda nas Vendas',
          description: `Hoje vendeu ${dropPercent.toFixed(0)}% menos que ontem.`,
          icon: TrendingDown
        });
      }
    }

    // 5. Alerta de queda de vendas (Esta Semana vs Semana Passada)
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(now.getDate() - 14);

    const thisWeekSales = sales.filter(s => {
      const saleDate = parseSaleDate(s);
      return saleDate >= sevenDaysAgo && saleDate <= now && s.status !== 'cancelled';
    });
    const lastWeekSales = sales.filter(s => {
      const saleDate = parseSaleDate(s);
      return saleDate >= fourteenDaysAgo && saleDate < sevenDaysAgo && s.status !== 'cancelled';
    });

    const thisWeekTotal = thisWeekSales.reduce((acc, s) => acc + s.total, 0);
    const lastWeekTotal = lastWeekSales.reduce((acc, s) => acc + s.total, 0);

    if (lastWeekTotal > 0 && thisWeekTotal < lastWeekTotal * 0.9) {
      const dropPercent = ((lastWeekTotal - thisWeekTotal) / lastWeekTotal) * 100;
      if (dropPercent >= 10) {
        list.push({
          id: 'weekly-drop',
          type: 'warning',
          title: 'Queda nas Vendas',
          description: `Essa semana caiu ${dropPercent.toFixed(0)}% em relação à passada.`,
          icon: TrendingDown
        });
      }
    }

    return list;
  }, [products, sales, monthlyGoal, monthlyProgress, expectedMonthlyProgress]);

  // Weekly comparison logic (7 days before selected date)
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date(selYear, selMonth - 1, parseInt(selectedDate.split('-')[2]));
    d.setDate(d.getDate() - i);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }).reverse();

  const weeklyData = last7Days.map(date => {
    const daySales = sales.filter(s => s.date === date);
    const total = daySales.reduce((acc, s) => acc + s.total, 0);
    const [day, month, year] = date.split('/');
    const dayName = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('pt-BR', { weekday: 'long' });
    return {
      day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      amount: total,
      date: date
    };
  });

  const maxWeeklyAmount = Math.max(...weeklyData.map(d => d.amount), 1);

  // Daily history logic (sorted by date)
  const dailyHistoryMap = sales.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = { count: 0, total: 0 };
    acc[s.date].count++;
    acc[s.date].total += s.total;
    return acc;
  }, {} as Record<string, { count: number, total: number }>);

  if (!dailyHistoryMap[formattedSelectedDate]) {
    dailyHistoryMap[formattedSelectedDate] = { count: 0, total: 0 };
  }

  const sortedHistory = Object.entries(dailyHistoryMap).sort((a, b) => {
    const [dayA, monthA, yearA] = a[0].split('/');
    const [dayB, monthB, yearB] = b[0].split('/');
    return `${yearB}-${monthB}-${dayB}`.localeCompare(`${yearA}-${monthA}-${dayA}`);
  });

  // Calculate best salesperson for the selected range
  // Advanced Dashboard Stats
  const advancedStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Growth vs Previous Month
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthSales = sales.filter(s => {
      const d = parseSaleDate(s);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && s.status !== 'cancelled';
    });
    const prevMonthSales = sales.filter(s => {
      const d = parseSaleDate(s);
      return d.getMonth() === prevMonth && d.getFullYear() === prevMonthYear && s.status !== 'cancelled';
    });

    const currentMonthTotal = currentMonthSales.reduce((acc, s) => acc + s.total, 0);
    const prevMonthTotal = prevMonthSales.reduce((acc, s) => acc + s.total, 0);
    const growthPercent = prevMonthTotal > 0 ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : (currentMonthTotal > 0 ? 100 : 0);

    // 2. Repurchase Rate & New vs Recurring
    const customerPurchaseCounts: Record<string, number> = {};
    const firstPurchaseDate: Record<string, number> = {};
    
    sales.filter(s => s.status !== 'cancelled' && s.customerId).forEach(s => {
      const cid = s.customerId!;
      customerPurchaseCounts[cid] = (customerPurchaseCounts[cid] || 0) + 1;
      const saleTime = parseSaleDate(s).getTime();
      if (!firstPurchaseDate[cid] || saleTime < firstPurchaseDate[cid]) {
        firstPurchaseDate[cid] = saleTime;
      }
    });

    const totalCustomersWithPurchases = Object.keys(customerPurchaseCounts).length;
    const recurringCustomersCount = Object.values(customerPurchaseCounts).filter(count => count > 1).length;
    const repurchaseRate = totalCustomersWithPurchases > 0 ? (recurringCustomersCount / totalCustomersWithPurchases) * 100 : 0;

    // New vs Recurring in current filtered range
    let newCustomersInRange = 0;
    let recurringCustomersInRange = 0;
    const seenInFiltered = new Set<string>();

    filteredSales.forEach(sale => {
      if (sale.customerId && !seenInFiltered.has(sale.customerId)) {
        seenInFiltered.add(sale.customerId);
        const firstTime = firstPurchaseDate[sale.customerId];
        const saleTime = parseSaleDate(sale).getTime();
        // If the first purchase ever was in this sale (or at the same time), they are "new"
        if (firstTime === saleTime) {
          newCustomersInRange++;
        } else {
          recurringCustomersInRange++;
        }
      }
    });

    // 3. Performance by Category
    const categoryStats: Record<string, { total: number, qty: number }> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const cat = item.product.category || 'Outros';
        if (!categoryStats[cat]) categoryStats[cat] = { total: 0, qty: 0 };
        categoryStats[cat].total += (item.priceOverride || item.product.price) * item.qty;
        categoryStats[cat].qty += item.qty;
      });
    });

    // 4. Average Time Between Purchases
    const purchaseDatesByCustomer: Record<string, number[]> = {};
    sales.filter(s => s.status !== 'cancelled' && s.customerId).forEach(s => {
      if (!purchaseDatesByCustomer[s.customerId!]) purchaseDatesByCustomer[s.customerId!] = [];
      purchaseDatesByCustomer[s.customerId!].push(parseSaleDate(s).getTime());
    });

    let totalDiffs = 0;
    let diffCount = 0;
    Object.values(purchaseDatesByCustomer).forEach(dates => {
      if (dates.length > 1) {
        const sortedDates = dates.sort((a, b) => a - b);
        for (let i = 1; i < sortedDates.length; i++) {
          totalDiffs += sortedDates[i] - sortedDates[i-1];
          diffCount++;
        }
      }
    });
    const avgTimeBetweenPurchasesDays = diffCount > 0 ? (totalDiffs / diffCount) / (1000 * 60 * 60 * 24) : 0;

    // 5. Ticket Médio por Cliente
    const totalSpentByCustomer: Record<string, number> = {};
    const totalSalesByCustomer: Record<string, number> = {};
    sales.filter(s => s.status !== 'cancelled' && s.customerId).forEach(s => {
      totalSpentByCustomer[s.customerId!] = (totalSpentByCustomer[s.customerId!] || 0) + s.total;
      totalSalesByCustomer[s.customerId!] = (totalSalesByCustomer[s.customerId!] || 0) + 1;
    });

    const avgTicketPerCustomer = totalCustomersWithPurchases > 0 
      ? Object.values(totalSpentByCustomer).reduce((a, b) => a + b, 0) / totalCustomersWithPurchases 
      : 0;

    // 6. Top Customers Ranking
    const topCustomersRanking = Object.entries(totalSpentByCustomer)
      .map(([id, total]) => {
        const customer = customers.find(c => c.id === id);
        return {
          name: customer?.name || 'Desconhecido',
          totalSpent: total,
          count: totalSalesByCustomer[id]
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    return {
      growthPercent,
      monthlyGrowth: growthPercent, // Alias for UI consistency
      repurchaseRate,
      categoryStats: Object.entries(categoryStats).sort((a, b) => b[1].total - a[1].total),
      newCustomersInRange,
      recurringCustomersInRange,
      avgTimeBetweenPurchasesDays,
      avgTicketPerCustomer,
      topCustomersRanking
    };
  }, [sales, filteredSales, customers]);

  // Customer Statistics
  const customerStats = useMemo(() => {
    const spendingByCustomer: Record<string, number> = {};
    const profitByCustomer: Record<string, number> = {};
    const lastPurchaseByCustomer: Record<string, Date> = {};
    const purchaseCountByCustomer: Record<string, number> = {};

    sales.forEach(sale => {
      if (sale.customerId && sale.status !== 'cancelled') {
        spendingByCustomer[sale.customerId] = (spendingByCustomer[sale.customerId] || 0) + sale.total;
        profitByCustomer[sale.customerId] = (profitByCustomer[sale.customerId] || 0) + (sale.total - sale.cost);
        purchaseCountByCustomer[sale.customerId] = (purchaseCountByCustomer[sale.customerId] || 0) + 1;
        
        const saleDate = parseSaleDate(sale);
        if (!lastPurchaseByCustomer[sale.customerId] || saleDate > lastPurchaseByCustomer[sale.customerId]) {
          lastPurchaseByCustomer[sale.customerId] = saleDate;
        }
      }
    });

    const topCustomerId = Object.entries(spendingByCustomer)
      .sort(([, a], [, b]) => b - a)[0]?.[0];
    
    const topCustomer = customers.find(c => c.id === topCustomerId);
    const topCustomerSpent = topCustomerId ? spendingByCustomer[topCustomerId] : 0;
    const topCustomerProfit = topCustomerId ? profitByCustomer[topCustomerId] : 0;

    const genderCounts = { Masculino: 0, Feminino: 0, Outro: 0, NaoInformado: 0 };
    const locationCounts: Record<string, number> = {};
    const ageGroups = { '0-18': 0, '19-30': 0, '31-45': 0, '46-60': 0, '60+': 0, NaoInformado: 0 };
    
    let vipCount = 0;
    let inactiveCount = 0;
    let newCount = 0;
    let activeCount = 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    customers.forEach(c => {
      // Gender
      if (c.gender) genderCounts[c.gender as keyof typeof genderCounts]++;
      else genderCounts.NaoInformado++;

      // Location
      const loc = c.city || (c.address ? c.address.trim().split(',')[0].trim() : null);
      if (loc) {
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      }

      // Age
      if (c.birthDate) {
        const birth = new Date(c.birthDate);
        const age = now.getFullYear() - birth.getFullYear();
        if (age <= 18) ageGroups['0-18']++;
        else if (age <= 30) ageGroups['19-30']++;
        else if (age <= 45) ageGroups['31-45']++;
        else if (age <= 60) ageGroups['46-60']++;
        else ageGroups['60+']++;
      } else {
        ageGroups.NaoInformado++;
      }

      // Status
      const lastPurchase = lastPurchaseByCustomer[c.id];
      const totalSpent = spendingByCustomer[c.id] || 0;
      const createdAt = c.createdAt ? new Date(c.createdAt) : new Date();

      if (totalSpent > 1000 || (purchaseCountByCustomer[c.id] || 0) > 5) vipCount++;
      if (lastPurchase && lastPurchase < thirtyDaysAgo) inactiveCount++;
      else if (lastPurchase) activeCount++;
      
      if (createdAt > sevenDaysAgo) newCount++;
    });

    return {
      topCustomer,
      topCustomerSpent,
      topCustomerProfit,
      genderCounts,
      locationCounts: Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
      ageGroups,
      vipCount,
      inactiveCount,
      newCount,
      activeCount,
      totalProfit: Object.values(profitByCustomer).reduce((a, b) => a + b, 0)
    };
  }, [sales, customers]);

  const salesByPersonStats = filteredSales.reduce((acc: Record<string, { total: number, count: number }>, s) => {
    if (!acc[s.salesperson]) acc[s.salesperson] = { total: 0, count: 0 };
    acc[s.salesperson].total += s.total;
    acc[s.salesperson].count += 1;
    return acc;
  }, {});

  let bestPerson = '-';
  let maxAmount = 0;
  (Object.entries(salesByPersonStats) as [string, { total: number, count: number }][]).forEach(([name, stats]) => {
    if (stats.total > maxAmount) {
      maxAmount = stats.total;
      bestPerson = name;
    }
  });

  // Payment methods for the selected range
  const paymentStats = filteredSales.reduce((acc: Record<string, number>, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total;
    return acc;
  }, { pix: 0, credit_card: 0, debit_card: 0, cash: 0, installments: 0, link: 0 });

  const totalPayment = (Object.values(paymentStats) as number[]).reduce((a: number, b: number) => a + b, 0) || 1;

  // Shifts for the selected range
  const shiftStats = filteredSales.reduce((acc: Record<string, number>, s) => {
    acc[s.shift] = (acc[s.shift] || 0) + 1;
    return acc;
  }, { 'Manhã': 0, 'Tarde': 0 });

  const totalShifts = (Object.values(shiftStats) as number[]).reduce((a: number, b: number) => a + b, 0) || 1;

  // Sales by Type for the selected range
  const typeStats = filteredSales.reduce((acc: Record<string, { total: number, count: number }>, s) => {
    if (!acc[s.type]) acc[s.type] = { total: 0, count: 0 };
    acc[s.type].total += s.total;
    acc[s.type].count += 1;
    return acc;
  }, { 'Presencial': { total: 0, count: 0 }, 'Online': { total: 0, count: 0 } });

  const totalTypeCount = (Object.values(typeStats) as { count: number }[]).reduce((a, b) => a + b.count, 0) || 1;

  // Top Product and Brand for the selected range
  interface ProductStat { name: string; total: number; qty: number; }
  const productStats = filteredSales.reduce((acc: { products: Record<string, ProductStat>, brands: Record<string, number> }, sale) => {
    sale.items.forEach(item => {
      const productId = item.product.id;
      const productName = item.product.name;
      const brandName = item.product.brand;
      const amount = (item.priceOverride || item.product.price) * item.qty;
      
      if (!acc.products[productId]) acc.products[productId] = { name: productName, total: 0, qty: 0 };
      acc.products[productId].total += amount;
      acc.products[productId].qty += item.qty;

      if (!acc.brands[brandName]) acc.brands[brandName] = 0;
      acc.brands[brandName] += amount;
    });
    return acc;
  }, { products: {}, brands: {} });

  const sortedProducts = (Object.values(productStats.products) as ProductStat[]).sort((a, b) => b.total - a.total);
  const topProduct = sortedProducts[0] || { name: '-', total: 0, qty: 0 };
  const top5Products = sortedProducts.slice(0, 5);

  const sortedBrands = (Object.entries(productStats.brands) as [string, number][]).sort((a, b) => b[1] - a[1]);
  const topBrand = sortedBrands[0] || ['-', 0];
  const top5Brands = sortedBrands.slice(0, 5);

  // Best day of the week (Range specific)
  const rangeDayOfWeekStats = filteredSales.reduce((acc: Record<number, { total: number, count: number }>, sale) => {
    const [day, month, year] = sale.date.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dayIndex = date.getDay();
    if (!acc[dayIndex]) acc[dayIndex] = { total: 0, count: 0 };
    acc[dayIndex].total += sale.total;
    acc[dayIndex].count += 1;
    return acc;
  }, {});

  const dayOfWeekStats = sales.reduce((acc: Record<string, { total: number, count: number }>, sale) => {
    const [day, month, year] = sale.date.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dayName = dayOfWeekNames[date.getDay()];
    if (!acc[dayName]) acc[dayName] = { total: 0, count: 0 };
    acc[dayName].total += sale.total;
    acc[dayName].count += 1;
    return acc;
  }, {});

  const sortedRangeDays = Object.entries(rangeDayOfWeekStats)
    .map(([index, stats]) => ({ 
      name: dayOfWeekNames[parseInt(index)], 
      amount: (stats as any).total,
      count: (stats as any).count
    }))
    .sort((a, b) => b.amount - a.amount);
    
  const bestDay = sortedRangeDays[0] ? `${sortedRangeDays[0].name} (R$ ${sortedRangeDays[0].amount.toLocaleString('pt-BR')} · ${sortedRangeDays[0].count} vendas)` : '-';

  // Revenue by specific date in range
  const revenueByDate = filteredSales.reduce((acc: Record<string, number>, sale) => {
    acc[sale.date] = (acc[sale.date] || 0) + sale.total;
    return acc;
  }, {});

  const sortedDates = Object.entries(revenueByDate)
    .map(([date, amount]) => {
      const [d, m, y] = date.split('/').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return {
        date,
        amount,
        dayName: dayOfWeekNames[dateObj.getDay()]
      };
    })
    .sort((a, b) => {
      const [da, ma, ya] = a.date.split('/').map(Number);
      const [db, mb, yb] = b.date.split('/').map(Number);
      return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
    });

  const sortedDays = Object.entries(dayOfWeekStats)
    .map(([name, data]) => ({
      name,
      amount: (data as any).total,
      count: (data as any).count
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-24 lg:pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md z-20 py-4 -mx-4 px-4 lg:static lg:bg-transparent lg:p-0 lg:m-0">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">
            Resumo Geral {range === 'month' && ` - ${new Date(selectedDate.substring(0, 7) + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}`}
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">Bem-vindo de volta! Aqui está o resumo das suas atividades.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Calendar size={16} className="text-slate-400" />
            <div className="flex flex-col">
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs lg:text-sm font-bold text-slate-700 dark:text-slate-200 outline-none bg-transparent"
              />
              {range !== 'day' && range !== 'custom' && (
                <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter -mt-0.5">{dateRangeLabel}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => { setRange('day'); setSelectedDate(getLocalDateString()); }}
              className={cn(
                "px-3 py-1.5 lg:px-4 lg:py-2 text-[10px] lg:text-sm font-bold rounded-lg transition-all",
                range === 'day' ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              📅 Dia
            </button>
            <button 
              onClick={() => { setRange('7days'); setSelectedDate(getLocalDateString()); }}
              className={cn(
                "px-3 py-1.5 lg:px-4 lg:py-2 text-[10px] lg:text-sm font-bold rounded-lg transition-all",
                range === '7days' ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              📊 7 dias
            </button>
            <button 
              onClick={() => { setRange('30days'); setSelectedDate(getLocalDateString()); }}
              className={cn(
                "px-3 py-1.5 lg:px-4 lg:py-2 text-[10px] lg:text-sm font-bold rounded-lg transition-all",
                range === '30days' ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              📈 30 dias
            </button>
            <button 
              onClick={() => { setRange('month'); setSelectedDate(getLocalDateString()); }}
              className={cn(
                "px-3 py-1.5 lg:px-4 lg:py-2 text-[10px] lg:text-sm font-bold rounded-lg transition-all",
                range === 'month' ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              Mês Inteiro
            </button>
            <button 
              onClick={() => setRange('custom')}
              className={cn(
                "px-3 py-1.5 lg:px-4 lg:py-2 text-[10px] lg:text-sm font-bold rounded-lg transition-all",
                range === 'custom' ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              Personalizado
            </button>
            <button 
              onClick={() => setRange('compare')}
              className={cn(
                "px-3 py-1.5 lg:px-4 lg:py-2 text-[10px] lg:text-sm font-bold rounded-lg transition-all",
                range === 'compare' ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              Comparativo
            </button>
          </div>
          <button 
            onClick={() => setShowClosingReport(true)}
            className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs lg:text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-lg shadow-slate-200 dark:shadow-none"
          >
            <FileText size={16} />
            Relatório de Fechamento
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
          { id: 'performance', label: 'Performance & CRM', icon: TrendingUp },
          { id: 'sales', label: 'Histórico de Vendas', icon: History },
          { id: 'products', label: 'Produtos & Marcas', icon: Package },
          { id: 'finance', label: 'Financeiro', icon: Wallet },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs lg:text-sm font-bold transition-all whitespace-nowrap flex-1 justify-center",
              activeTab === tab.id 
                ? "bg-blue-600 text-white shadow-md shadow-blue-100 dark:shadow-none" 
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Closing Report Modal */}
      <AnimatePresence>
        {showClosingReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClosingReport(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                    <FileText className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight">Relatório de Fechamento</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Biobel · Gestão de Operações</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowClosingReport(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Header Info */}
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Fechamento do Período</h2>
                  <p className="text-sm font-bold text-blue-600 bg-blue-50 inline-block px-4 py-1 rounded-full">
                    {dateRangeLabel}
                  </p>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 p-5 rounded-2xl text-white">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faturamento Bruto</p>
                    <p className="text-2xl font-black">R$ {totalSold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-blue-600 p-5 rounded-2xl text-white">
                    <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Ticket Médio</p>
                    <p className="text-2xl font-black">R$ {avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {/* Salespeople Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Desempenho por Vendedora</h4>
                  <div className="space-y-3">
                    {(Object.entries(salesByPersonStats) as [string, { total: number, count: number }][])
                      .sort((a, b) => b[1].total - a[1].total)
                      .map(([name, stats], i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">
                              {i + 1}º
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 uppercase">{name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{stats.count} atendimentos</p>
                            </div>
                          </div>
                          <p className="text-sm font-black text-slate-900">R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Profitability Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Rentabilidade</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Lucro Estimado</p>
                      <p className="text-base font-black text-emerald-700">R$ {totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Margem Média</p>
                      <p className="text-base font-black text-blue-700">{profitMargin.toFixed(1)}%</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium italic">* Lucro calculado com base no preço de custo cadastrado nos produtos.</p>
                </div>

                {/* Cash Flow Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Fluxo de Caixa (Consolidado)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Dinheiro', val: paymentStats.cash || 0, color: 'text-emerald-600' },
                      { label: 'PIX', val: paymentStats.pix || 0, color: 'text-blue-600' },
                      { label: 'Cartão (Débito/Crédito)', val: (paymentStats.debit_card || 0) + (paymentStats.credit_card || 0) + (paymentStats.installments || 0), color: 'text-indigo-600' },
                      { label: 'Link', val: paymentStats.link || 0, color: 'text-violet-600' },
                    ].map((item, i) => (
                      <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                        <p className={cn("text-base font-black", item.color)}>R$ {item.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Summary */}
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                    <Sparkles className="text-amber-600" size={24} />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-amber-900 uppercase">Resumo Operacional</h5>
                    <p className="text-xs font-medium text-amber-700 leading-tight mt-1">
                      Total de <strong>{salesCount} atendimentos</strong> realizados no período. 
                      A vendedora destaque foi <strong>{bestPerson}</strong>.
                      {range !== 'day' && (
                        <> O melhor dia de vendas foi <strong>{bestDay}</strong>.</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  Imprimir Relatório
                </button>
                <button 
                  onClick={() => setShowClosingReport(false)}
                  className="flex-1 bg-slate-900 text-white px-4 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all"
                >
                  Concluir Revisão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {range === 'compare' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Período A (Base)</h4>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">De:</span>
                  <input 
                    type="date" 
                    value={compareStartDateA}
                    onChange={(e) => setCompareStartDateA(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 outline-none bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Até:</span>
                  <input 
                    type="date" 
                    value={compareEndDateA}
                    onChange={(e) => setCompareEndDateA(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 outline-none bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Período B (Comparação)</h4>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">De:</span>
                  <input 
                    type="date" 
                    value={compareStartDateB}
                    onChange={(e) => setCompareStartDateB(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 outline-none bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100 focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Até:</span>
                  <input 
                    type="date" 
                    value={compareEndDateB}
                    onChange={(e) => setCompareEndDateB(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 outline-none bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100 focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {compareStartDateA && compareEndDateA && compareStartDateB && compareEndDateB && (
            <div className="pt-6 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { 
                    label: 'Faturamento', 
                    valA: filteredSalesA.reduce((acc, s) => acc + s.total, 0),
                    valB: filteredSalesB.reduce((acc, s) => acc + s.total, 0),
                    isCurrency: true
                  },
                  { 
                    label: 'Atendimentos', 
                    valA: filteredSalesA.length,
                    valB: filteredSalesB.length,
                    isCurrency: false
                  },
                  { 
                    label: 'Ticket Médio', 
                    valA: filteredSalesA.length > 0 ? filteredSalesA.reduce((acc, s) => acc + s.total, 0) / filteredSalesA.length : 0,
                    valB: filteredSalesB.length > 0 ? filteredSalesB.reduce((acc, s) => acc + s.total, 0) / filteredSalesB.length : 0,
                    isCurrency: true
                  }
                ].map((stat, i) => {
                  const diff = stat.valA > 0 ? ((stat.valB - stat.valA) / stat.valA) * 100 : (stat.valB > 0 ? 100 : 0);
                  const isPositive = diff >= 0;
                  
                  return (
                    <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{stat.label}</p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Período A</p>
                            <p className="text-sm font-black text-slate-700">
                              {stat.isCurrency ? `R$ ${stat.valA.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : stat.valA}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Período B</p>
                            <p className="text-sm font-black text-slate-900">
                              {stat.isCurrency ? `R$ ${stat.valB.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : stat.valB}
                            </p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500">Evolução</span>
                          <div className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black",
                            isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          )}>
                            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {isPositive ? '+' : ''}{diff.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Intelligent Alerts Section */}
      {activeTab === 'overview' && alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-2xl border flex gap-4 items-start shadow-sm",
                alert.type === 'warning' ? "bg-amber-50 border-amber-100 text-amber-900" :
                alert.type === 'error' ? "bg-rose-50 border-rose-100 text-rose-900" :
                "bg-blue-50 border-blue-100 text-blue-900"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl shrink-0",
                alert.type === 'warning' ? "bg-amber-100 text-amber-600" :
                alert.type === 'error' ? "bg-rose-100 text-rose-600" :
                "bg-blue-100 text-blue-600"
              )}>
                <alert.icon size={20} />
              </div>
              <div>
                <h4 className="font-black text-[10px] uppercase tracking-widest mb-1">{alert.title}</h4>
                <p className="text-sm font-medium opacity-80 leading-tight">{alert.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Vendas por Tipo</p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">{typeStats['Presencial'].count}</span>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Pres.</span>
                </div>
                <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
                <div className="flex flex-col">
                  <span className="text-xs font-black text-purple-600 dark:text-purple-400">{typeStats['Online'].count}</span>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Online</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase">no período</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Crescimento Mensal</p>
              <h3 className={cn(
                "text-2xl font-black tracking-tight",
                advancedStats.growthPercent >= 0 ? "text-emerald-600" : "text-rose-600"
              )}>
                {advancedStats.growthPercent >= 0 ? '+' : ''}{advancedStats.growthPercent.toFixed(1)}%
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase">vs. mês anterior</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Taxa de Recompra</p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                {advancedStats.repurchaseRate.toFixed(1)}%
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase">clientes que voltaram</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Novos vs Recorrentes</p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-emerald-600">{advancedStats.newCustomersInRange}</span>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Novos</span>
                </div>
                <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
                <div className="flex flex-col">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">{advancedStats.recurringCustomersInRange}</span>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Recorr.</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase">no período</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Frequência de Retorno</p>
              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {advancedStats.avgTimeBetweenPurchasesDays > 0 ? `${advancedStats.avgTimeBetweenPurchasesDays.toFixed(0)} dias` : 'N/A'}
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase">tempo médio entre compras</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total de Marcas</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {new Set(products.map(p => p.brand)).size}
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase">marcas ativas</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Estoque Total</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {products.reduce((acc, p) => acc + p.stock, 0)}
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase">unidades em loja</p>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Performance */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Tag size={16} className="text-blue-600" /> Desempenho por Categoria
              </h3>
              <div className="space-y-4">
                {advancedStats.categoryStats.map(([cat, stats]: [string, any], i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300 uppercase">{cat}</span>
                      <span className="text-slate-900 dark:text-white">R$ {stats.total.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full" 
                        style={{ width: `${(stats.total / (filteredSales.reduce((acc, s) => acc + s.total, 0) || 1)) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                      <span>{stats.qty} itens vendidos</span>
                      <span>{((stats.total / (filteredSales.reduce((acc, s) => acc + s.total, 0) || 1)) * 100).toFixed(1)}% do total</span>
                    </div>
                  </div>
                ))}
                {advancedStats.categoryStats.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">Sem dados de categorias no período.</p>
                )}
              </div>
            </div>

            {/* Top Customers */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Users size={16} className="text-emerald-600" /> Top Clientes (Faturamento)
              </h3>
              <div className="space-y-3">
                {advancedStats.topCustomersRanking.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400">
                        {i + 1}º
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{c.count} compras realizadas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900 dark:text-white">R$ {c.totalSpent.toLocaleString('pt-BR')}</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Ticket: R$ {(c.totalSpent / c.count).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
                {advancedStats.topCustomersRanking.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">Sem dados de clientes no período.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Ticket Médio p/ Cliente</p>
              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                R$ {advancedStats.avgTicketPerCustomer.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase">gasto médio por base de cliente</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Frequência de Retorno</p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                {advancedStats.avgTimeBetweenPurchasesDays > 0 ? `${advancedStats.avgTimeBetweenPurchasesDays.toFixed(0)} dias` : 'N/A'}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase">intervalo médio entre compras</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Taxa de Recompra</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {advancedStats.repurchaseRate.toFixed(1)}%
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase">clientes com + de 1 compra</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={16} className="text-blue-600 dark:text-blue-400" /> Desempenho Individual por Vendedora
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeSalespersons
              .filter(s => isNaN(Number(s.name)))
              .map(seller => {
                const stats = salesByPersonStats[seller.name] || { total: 0, count: 0 };
                const avg = stats.count > 0 ? stats.total / stats.count : 0;
                return (
                  <div key={seller.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-black text-slate-900 dark:text-white uppercase">{seller.name}</span>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                        {stats.count} vendas
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white">R$ {stats.total.toLocaleString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ticket Médio</p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">R$ {avg.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              {[
                { 
                  label: range === 'day' ? 'Meta Diária' : range === '7days' ? 'Meta 7 Dias' : 'Meta 30 Dias', 
                  current: totalSold, 
                  target: range === 'day' ? dailyGoal : range === '7days' ? weeklyGoal : monthlyGoal.targetAmount, 
                  progress: range === 'day' ? dailyProgress : range === '7days' ? weeklyProgress : monthlyProgress, 
                  isBelow: range === 'day' ? isDailyBelow : range === '7days' ? weeklyProgress < 75 : monthlyProgress < expectedMonthlyProgress * 0.9 
                },
                { label: 'Meta Semanal', current: totalWeeklySold, target: weeklyGoal, progress: weeklyProgress, isBelow: weeklyProgress < 75 && new Date().getDay() > 4 },
                { label: 'Meta Mensal', current: totalMonthlySold, target: monthlyGoal.targetAmount, progress: monthlyProgress, isBelow: isMonthlyBelow },
              ].map((goal, i) => (
                <div key={i} className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  {goal.isBelow && (
                    <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                      <div className="absolute top-2 right-[-24px] rotate-45 bg-rose-500 text-white text-[8px] font-black py-1 w-24 text-center uppercase tracking-tighter shadow-sm">
                        Abaixo
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex flex-col">
                      <h3 className="font-bold text-slate-900 text-sm lg:text-base">{goal.label}</h3>
                      {goal.label === 'Meta Mensal' && monthlyGoal.month && (
                        <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">
                          {new Date(monthlyGoal.month + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                      goal.progress >= 100 ? "bg-emerald-100 text-emerald-700" : 
                      goal.isBelow ? "bg-rose-100 text-rose-700 animate-pulse" : "bg-blue-100 text-blue-700"
                    )}>
                      {Math.round(goal.progress)}%
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs lg:text-sm">
                      <span className="text-slate-500">Atingido</span>
                      <span className="font-bold text-slate-900">R$ {goal.current.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 lg:h-2.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(goal.progress, 100)}%` }}
                        transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                        className={cn(
                          "h-full rounded-full",
                          goal.progress >= 100 ? "bg-emerald-500" : 
                          goal.isBelow ? "bg-rose-500" : "bg-blue-500"
                        )}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] lg:text-xs">
                      <span className="text-slate-400">Meta: R$ {goal.target.toLocaleString('pt-BR')}</span>
                      <span className="text-slate-400 font-bold">Falta: R$ {Math.max(0, goal.target - goal.current).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
              {[
                { label: 'Total Vendido', value: `R$ ${totalSold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Lucro Total', value: `R$ ${totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Margem', value: `${profitMargin.toFixed(1)}%`, icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50' },
                { label: 'Total Vendas', value: salesCount.toString(), icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Ticket Médio', value: `R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              ].map((kpi, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className={cn("p-2 rounded-xl w-fit mb-3", kpi.bg, kpi.color)}>
                    <kpi.icon size={18} />
                  </div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{kpi.label}</p>
                  <h3 className="text-sm lg:text-lg font-black text-slate-900 truncate">{kpi.value}</h3>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Zap size={16} className="text-amber-500" /> Métricas Avançadas
              </h3>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-y-auto max-h-[400px] lg:max-h-none">
              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Crescimento Mensal</p>
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-blue-700">{advancedStats.monthlyGrowth.toFixed(1)}%</h4>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      advancedStats.monthlyGrowth >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    )}>
                      {advancedStats.monthlyGrowth >= 0 ? '📈 Subindo' : '📉 Caindo'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Taxa de Recompra</p>
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-emerald-700">{advancedStats.repurchaseRate.toFixed(1)}%</h4>
                    <span className="text-[10px] font-bold text-emerald-600">🔄 Fidelidade</span>
                  </div>
                </div>
                <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
                  <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1">Ticket Médio / Cliente</p>
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-violet-700">R$ {advancedStats.avgTicketPerCustomer.toFixed(2)}</h4>
                    <span className="text-[10px] font-bold text-violet-600">👤 Por pessoa</span>
                  </div>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Frequência de Retorno</p>
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-orange-700">{advancedStats.avgTimeBetweenPurchasesDays.toFixed(0)} dias</h4>
                    <span className="text-[10px] font-bold text-orange-600">⏱️ Intervalo</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Novos vs Recorrentes</p>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-blue-500 h-full" 
                      style={{ width: `${(advancedStats.newCustomersCount / (advancedStats.newCustomersCount + advancedStats.recurringCustomersCount || 1)) * 100}%` }} 
                    />
                    <div 
                      className="bg-indigo-500 h-full" 
                      style={{ width: `${(advancedStats.recurringCustomersCount / (advancedStats.newCustomersCount + advancedStats.recurringCustomersCount || 1)) * 100}%` }} 
                    />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-blue-600">✨ Novos: {advancedStats.newCustomersCount}</span>
                  <span className="text-indigo-600">🔄 Recorrentes: {advancedStats.recurringCustomersCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        {[
          { label: 'Melhor Vendedora', value: bestPerson, icon: UserIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Produto +Vendido', value: topProduct.name, icon: Package, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Marca +Vendida', value: topBrand[0], icon: Target, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Melhor Dia', value: bestDay, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((kpi, i) => (
          <div key={i} className={cn("bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow", (i === 3 && range === 'day') && "col-span-2 lg:col-span-1")}>
            <div className="flex justify-between items-start mb-3 lg:mb-4">
              <div className={cn("p-2 lg:p-2.5 rounded-xl", kpi.bg, kpi.color)}>
                <kpi.icon size={20} className="lg:w-6 lg:h-6" />
              </div>
            </div>
            <p className="text-slate-500 text-[10px] lg:text-sm font-bold uppercase tracking-widest mb-1">{kpi.label}</p>
            <h3 className="text-base lg:text-xl font-black text-slate-900 truncate" title={kpi.value}>{kpi.value}</h3>
          </div>
        ))}
      </div>
    )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-5 lg:p-6 rounded-2xl text-white shadow-lg shadow-indigo-100 flex items-center gap-4 lg:gap-6">
          <div className="bg-white/20 p-3 lg:p-4 rounded-2xl backdrop-blur-sm shrink-0">
            <Sparkles size={24} className="text-white lg:w-8 lg:h-8" />
          </div>
          <div>
            <h3 className="text-base lg:text-lg font-bold mb-1">Melhores Colorações</h3>
            <p className="text-indigo-100 text-[10px] lg:text-sm font-medium">Contamos com as melhores colorações do mercado.</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 lg:p-6 rounded-2xl text-white shadow-lg shadow-emerald-100 flex items-center gap-4 lg:gap-6">
          <div className="bg-white/20 p-3 lg:p-4 rounded-2xl backdrop-blur-sm shrink-0">
            <Beaker size={24} className="text-white lg:w-8 lg:h-8" />
          </div>
          <div>
            <h3 className="text-base lg:text-lg font-bold mb-1">Testers em Loja</h3>
            <p className="text-emerald-100 text-[10px] lg:text-sm font-medium">Temos testers disponíveis de todas as linhas.</p>
          </div>
        </div>
      </div>
    )}

      {activeTab === 'sales' && range !== 'day' && range !== 'compare' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Relatório Detalhado do Período</h3>
              <p className="text-xs text-slate-500 font-bold uppercase mt-1">Análise completa das vendas selecionadas</p>
            </div>
            <FileSpreadsheet className="text-blue-600" size={24} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} /> Faturamento por Dia
              </h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {sortedDates.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-900 uppercase">{d.dayName}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{d.date}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">R$ {(d.amount as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {sortedDates.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Nenhuma venda no período.</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={14} /> Ranking dos Dias da Semana
              </h4>
              <div className="space-y-2">
                {sortedRangeDays.map((d, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-1",
                      i === 0 ? "bg-amber-400" : i === 1 ? "bg-slate-300" : i === 2 ? "bg-orange-300" : "bg-slate-100"
                    )} />
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-xs font-black text-slate-900">
                      {i + 1}º
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{d.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{d.count} atendimentos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">R$ {d.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Média: R$ {(d.amount / d.count).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ))}
                {sortedRangeDays.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Sem dados para o ranking.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Inventory Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Produtos</p>
                <h3 className="text-2xl font-black text-slate-900">{products.length}</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">itens cadastrados</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Marcas</p>
                <h3 className="text-2xl font-black text-blue-600">{new Set(products.map(p => p.brand)).size}</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">marcas ativas</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor em Estoque</p>
                <h3 className="text-2xl font-black text-emerald-600">
                  R$ {products.reduce((acc, p) => acc + (p.costPrice || 0) * p.stock, 0).toLocaleString('pt-BR')}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">investimento total</p>
              </div>
            </div>

            {/* Rankings Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-900">Ranking de Produtos</h3>
                  <Package className="text-violet-600" size={20} />
                </div>
                <div className="space-y-4">
                  {top5Products.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center text-[10px] font-black">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{p.qty} unidades vendidas</p>
                      </div>
                      <p className="text-sm font-black text-slate-900">R$ {p.total.toLocaleString('pt-BR')}</p>
                    </div>
                  ))}
                  {top5Products.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sem dados de produtos.</p>}
                </div>
              </div>

              <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-900">Ranking de Marcas</h3>
                  <Target className="text-rose-600" size={20} />
                </div>
                <div className="space-y-4">
                  {top5Brands.map((b, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-[10px] font-black">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{b[0]}</p>
                      </div>
                      <p className="text-sm font-black text-slate-900">R$ {b[1].toLocaleString('pt-BR')}</p>
                    </div>
                  ))}
                  {top5Brands.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sem dados de marcas.</p>}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6">Destaques</h3>
              <div className="space-y-4">
                <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
                  <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1">Produto +Vendido</p>
                  <p className="text-sm font-black text-slate-900">{topProduct.name}</p>
                </div>
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Marca +Vendida</p>
                  <p className="text-sm font-black text-slate-900">{topBrand[0]}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 p-5 lg:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6 lg:mb-8">
                  <h3 className="font-bold text-base lg:text-lg text-slate-900 dark:text-white">Vendas por Tipo</h3>
                  <Globe className="text-purple-600" size={20} />
                </div>
                <div className="space-y-6">
                  {(Object.entries(typeStats) as [string, { total: number, count: number }][]).map(([type, stats], i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-700 dark:text-slate-300 uppercase">{type}</span>
                        <span className="text-slate-900 dark:text-white">R$ {stats.total.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(stats.count / totalTypeCount) * 100}%` }}
                          className={cn("h-full rounded-full", type === 'Online' ? "bg-purple-500" : "bg-slate-500")}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                        <span>{stats.count} atendimentos</span>
                        <span>{((stats.count / totalTypeCount) * 100).toFixed(1)}% do volume</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 lg:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6 lg:mb-8">
                  <h3 className="font-bold text-base lg:text-lg text-slate-900 dark:text-white">Últimos 7 Dias</h3>
                  <span className="text-slate-400 bg-slate-50 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest">
                    Tendência
                  </span>
                </div>
                
                <div className={cn("space-y-4 lg:space-y-6", sales.length === 0 && "opacity-40")}>
                  {weeklyData.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 lg:gap-4">
                      <span className="text-[10px] lg:text-sm font-black text-slate-500 w-16 lg:w-24 uppercase tracking-tighter">{item.day.split('-')[0]}</span>
                      <div className="flex-1 h-2 lg:h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.amount / maxWeeklyAmount) * 100}%` }}
                          transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                          className="h-full bg-blue-600 rounded-full" 
                        />
                      </div>
                      <span className="text-[10px] lg:text-sm font-black text-slate-900">R$ {item.amount.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6 lg:mb-8">
                  <h3 className="font-bold text-base lg:text-lg text-slate-900">Melhores Dias (Geral)</h3>
                  <Calendar className="text-amber-600" size={20} />
                </div>
                
                <div className={cn("space-y-4 lg:space-y-6", sales.length === 0 && "opacity-40")}>
                  {sortedDays.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 lg:gap-4">
                      <span className="text-[10px] lg:text-sm font-black text-slate-500 w-16 lg:w-24 uppercase tracking-tighter">{item.name}</span>
                      <div className="flex-1 h-2 lg:h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.amount / (sortedDays[0]?.amount || 1)) * 100}%` }}
                          transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                          className="h-full bg-amber-500 rounded-full" 
                        />
                      </div>
                      <span className="text-[10px] lg:text-sm font-black text-slate-900">R$ {item.amount.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                  {sortedDays.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sem dados históricos.</p>}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Histórico Diário</h3>
                <button className="text-blue-600 text-[10px] lg:text-sm font-black uppercase tracking-widest hover:underline">Ver tudo</button>
              </div>
              
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">#</th>
                      <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                      <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendas</th>
                      <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bruto</th>
                      <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedHistory.map(([date, data], i) => (
                      <tr key={i} className={cn("hover:bg-slate-50 transition-colors", date === formattedSelectedDate && "bg-blue-50/30")}>
                        <td className="px-4 py-4 text-xs font-bold text-slate-400">{i + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          {date} {date === formattedSelectedDate && <span className="ml-2 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-md uppercase">Selecionado</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{data.count}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">R$ {(data.count > 0 ? data.total / data.count : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="block lg:hidden divide-y divide-slate-100">
                {sortedHistory.slice(0, 5).map(([date, data], i) => (
                  <div key={i} className={cn("p-4 flex items-center justify-between", date === formattedSelectedDate && "bg-blue-50/30")}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-300">{i + 1}</span>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {date} {date === formattedSelectedDate && <span className="ml-1 text-[8px] bg-blue-600 text-white px-1 py-0.5 rounded uppercase">Selecionado</span>}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{data.count} vendas · R$ {(data.count > 0 ? data.total / data.count : 0).toLocaleString('pt-BR')} ticket</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">Ranking de Vendedores</h3>
              </div>
              <div className="p-5 lg:p-6 space-y-6 lg:space-y-8">
                {activeSalespersons.filter(s => isNaN(Number(s.name))).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Nenhuma vendedora ativa.</p>
                ) : (
                  activeSalespersons
                  .filter(s => isNaN(Number(s.name)))
                  .map(seller => {
                    const stats = salesByPersonStats[seller.name] || { total: 0, count: 0 };
                    return {
                      ...seller,
                      amount: stats.total,
                      count: stats.count,
                      avg: stats.count > 0 ? stats.total / stats.count : 0,
                      percentage: totalSold > 0 ? (stats.total / totalSold) * 100 : 0
                    };
                  })
                  .sort((a, b) => b.amount - a.amount)
                  .map((seller, i) => (
                    <div key={seller.id} className="flex items-start gap-4">
                      <div className="mt-1 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <span className="block text-sm font-black text-slate-900 truncate">{seller.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {seller.percentage.toFixed(1)}% do total
                              </span>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                TM: R$ {seller.avg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="block text-sm font-black text-slate-900">R$ {seller.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{seller.count} {seller.count === 1 ? 'venda' : 'vendas'}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${maxAmount > 0 ? (seller.amount / maxAmount) * 100 : 0}%` }}
                            transition={{ duration: 1, delay: 0.8 + i * 0.1 }}
                            className="h-full bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6">Destaques</h3>
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Melhor Vendedora</p>
                  <p className="text-sm font-black text-slate-900">{bestPerson}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Melhor Dia</p>
                  <p className="text-sm font-black text-slate-900">{bestDay}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Trophy size={14} className="text-amber-500" />
                Top Clientes (Faturamento)
              </h4>
              <div className="space-y-4">
                {advancedStats.topCustomersRanking.length > 0 ? (
                  advancedStats.topCustomersRanking.map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase truncate w-32">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{c.count} compras</p>
                        </div>
                      </div>
                      <p className="text-xs font-black text-blue-600">R$ {c.totalSpent.toLocaleString('pt-BR')}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 font-bold uppercase text-center py-4">Sem dados de clientes.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart3 size={14} className="text-blue-500" />
                Desempenho por Categoria
              </h4>
              <div className="space-y-4">
                {advancedStats.categoryStats.length > 0 ? (
                  advancedStats.categoryStats.slice(0, 5).map(([cat, stats], i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold uppercase">
                        <span className="text-slate-600 truncate w-32">{cat}</span>
                        <span className="text-slate-900">R$ {stats.total.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(stats.total / (advancedStats.categoryStats[0]?.[1].total || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 font-bold uppercase text-center py-4">Sem dados de categorias.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center space-y-4">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                <TrendingUp size={32} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Médio por Cliente</p>
                <h3 className="text-3xl font-black text-slate-900">R$ {advancedStats.avgTicketPerCustomer.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase max-w-[200px]">Valor médio que cada cliente gasta na loja</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Demographic Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gender Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Users size={18} className="text-blue-600" />
                    Distribuição por Gênero
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Feminino', count: customerStats.genderCounts.Feminino, color: 'bg-pink-500' },
                      { label: 'Masculino', count: customerStats.genderCounts.Masculino, color: 'bg-blue-500' },
                      { label: 'Outro', count: customerStats.genderCounts.Outro, color: 'bg-purple-500' },
                      { label: 'Não Informado', count: customerStats.genderCounts.NaoInformado, color: 'bg-slate-300' },
                    ].map((item, i) => {
                      const percentage = customers.length > 0 ? Math.round((item.count / customers.length) * 100) : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{item.label}</span>
                            <span className="text-xs font-black text-slate-900">{item.count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className={cn("h-full rounded-full", item.color)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Age Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Calendar size={18} className="text-blue-600" />
                    Distribuição por Idade
                  </h3>
                  <div className="space-y-4">
                    {(Object.entries(customerStats.ageGroups) as [string, number][]).map(([label, count], i) => {
                      const percentage = customers.length > 0 ? Math.round((count / customers.length) * 100) : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                              {label === 'NaoInformado' ? 'Não Informado' : label + ' anos'}
                            </span>
                            <span className="text-xs font-black text-slate-900">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className="h-full bg-blue-600 rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Top Locations */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <MapPin size={18} className="text-blue-600" />
                  Principais Localizações
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customerStats.locationCounts.length > 0 ? (
                    customerStats.locationCounts.slice(0, 4).map(([loc, count], i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-400">
                            {i + 1}º
                          </div>
                          <span className="text-sm font-black text-slate-900 uppercase truncate w-32">{loc}</span>
                        </div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                          {count} clientes
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-slate-400 font-bold uppercase text-xs">
                      Nenhum dado de endereço cadastrado
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6">Fidelidade e Retenção</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Taxa de Recompra</p>
                    <p className="text-xl font-black text-slate-900">{advancedStats.repurchaseRate.toFixed(1)}%</p>
                    <p className="text-[10px] text-blue-500 font-bold uppercase mt-1">Clientes que compraram mais de uma vez</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Novos Clientes</p>
                    <p className="text-xl font-black text-slate-900">{advancedStats.newCustomersInRange}</p>
                    <p className="text-[10px] text-emerald-500 font-bold uppercase mt-1">Conquistados no período selecionado</p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Frequência de Retorno</p>
                    <p className="text-xl font-black text-slate-900">
                      {advancedStats.avgTimeBetweenPurchasesDays > 0 ? `${advancedStats.avgTimeBetweenPurchasesDays.toFixed(0)} dias` : 'N/A'}
                    </p>
                    <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">Tempo médio entre compras</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-base lg:text-lg text-slate-900 mb-6">Meio de Pagamento</h3>
              <div className="space-y-5 lg:space-y-6">
                {[
                  { label: 'PIX', value: Math.round(((paymentStats.pix || 0) / totalPayment) * 100), amount: `R$ ${(paymentStats.pix || 0).toLocaleString('pt-BR')}`, color: 'bg-blue-600' },
                  { label: 'C. Crédito', value: Math.round(((paymentStats.credit_card || 0) / totalPayment) * 100), amount: `R$ ${(paymentStats.credit_card || 0).toLocaleString('pt-BR')}`, color: 'bg-indigo-600' },
                  { label: 'C. Débito', value: Math.round(((paymentStats.debit_card || 0) / totalPayment) * 100), amount: `R$ ${(paymentStats.debit_card || 0).toLocaleString('pt-BR')}`, color: 'bg-violet-500' },
                  { label: 'Dinheiro', value: Math.round(((paymentStats.cash || 0) / totalPayment) * 100), amount: `R$ ${(paymentStats.cash || 0).toLocaleString('pt-BR')}`, color: 'bg-emerald-500' },
                  { label: 'Parcelado', value: Math.round(((paymentStats.installments || 0) / totalPayment) * 100), amount: `R$ ${(paymentStats.installments || 0).toLocaleString('pt-BR')}`, color: 'bg-purple-600' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-2">
                      <span className="text-[10px] lg:text-sm font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                      <span className="text-[10px] lg:text-sm font-black text-slate-900">{item.amount} ({item.value}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 lg:h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                        className={cn("h-full rounded-full", item.color)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-[10px] font-black mb-4 uppercase tracking-widest text-slate-400">Vendas por Turno</h4>
                <div className="flex justify-around text-center">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Manhã</p>
                    <p className="font-black text-slate-900 text-lg">{Math.round(((shiftStats['Manhã'] || 0) / totalShifts) * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Tarde</p>
                    <p className="font-black text-slate-900 text-lg">{Math.round(((shiftStats['Tarde'] || 0) / totalShifts) * 100)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6">Resumo Financeiro</h3>
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Lucro Estimado</p>
                  <p className="text-sm font-black text-slate-900">R$ {totalProfit.toLocaleString('pt-BR')}</p>
                </div>
                <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
                  <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1">Margem Média</p>
                  <p className="text-sm font-black text-slate-900">{profitMargin.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CATEGORY_IMAGES: Record<string, string> = {
  'Maquiagem': '💄',
  'Cremes': '🧴',
  'Perfumes': '✨',
  'Cabelo': '💇‍♀️',
  'Skincare': '🧼',
  'Avulso': '📦'
};

const ProductImage = ({ src, alt, className, category }: { src?: string, alt: string, className?: string, category?: string }) => {
  const isEmoji = !src || (!src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:'));
  
  if (isEmoji) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-50", className)}>
        <span className="text-4xl md:text-5xl lg:text-6xl">{getProductEmoji(alt, category)}</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      referrerPolicy="no-referrer" 
    />
  );
};

const Products = ({ 
  products, 
  brands,
  categories,
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}: { 
  products: Product[], 
  brands: Brand[],
  categories: string[],
  onAddProduct: (p: Omit<Product, 'id'>) => void,
  onUpdateProduct: (id: string, p: Partial<Product>) => void,
  onDeleteProduct: (id: string) => void,
  onAddCategory: (name: string) => void,
  onUpdateCategory: (oldName: string, newName: string) => void,
  onDeleteCategory: (name: string) => void
}) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !brand || !price || !category || !stock) return;

    const productData = {
      name,
      brand,
      price: parseFloat(price),
      costPrice: costPrice ? parseFloat(costPrice) : undefined,
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      category,
      stock: parseInt(stock),
      image: image || CATEGORY_IMAGES[category] || `https://picsum.photos/seed/${name}/400/300`
    };

    if (editingId) {
      onUpdateProduct(editingId, productData);
      setEditingId(null);
    } else {
      onAddProduct(productData);
    }

    setName('');
    setBrand('');
    setPrice('');
    setCostPrice('');
    setOriginalPrice('');
    setCategory('');
    setStock('');
    setImage('');
    setShowForm(false);
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setBrand(product.brand);
    setPrice(product.price.toString());
    setCostPrice(product.costPrice?.toString() || '');
    setOriginalPrice(product.originalPrice?.toString() || '');
    setCategory(product.category);
    setStock(product.stock.toString());
    setImage(product.image || '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setBrand('');
    setPrice('');
    setCostPrice('');
    setOriginalPrice('');
    setCategory('');
    setStock('');
    setImage('');
    setShowForm(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20 lg:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-slate-50/80 backdrop-blur-md z-10 py-4 -mx-4 px-4 lg:static lg:bg-transparent lg:p-0 lg:m-0">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Produtos</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm">
              Total Itens: {products.reduce((acc, p) => acc + p.stock, 0)}
            </span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm">
              Marcas: {new Set(products.map(p => p.brand)).size}
            </span>
          </div>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg",
            showForm ? "bg-slate-200 text-slate-700 shadow-none" : "bg-blue-600 text-white shadow-blue-200"
          )}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          <span className="hidden sm:inline">{showForm ? 'Fechar' : 'Novo Produto'}</span>
        </button>
      </header>

      <AnimatePresence>
        {showForm && (
          <motion.section 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between text-blue-600">
              <div className="flex items-center gap-2">
                {editingId ? <Settings size={20} /> : <PlusCircle size={20} />}
                <h3 className="font-bold text-slate-900">
                  {editingId ? 'Editar Produto' : 'Novo Produto'}
                </h3>
              </div>
              <button onClick={cancelEdit} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Produto</label>
                  <input 
                    className="w-full px-5 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all text-lg font-medium outline-none" 
                    placeholder="Ex: Batom Matte Vermelho" 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Marca</label>
                  <select 
                    className="w-full px-5 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all text-lg font-medium outline-none appearance-none"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Preço (R$)</label>
                  <input 
                    className="w-full px-5 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all text-lg font-bold outline-none" 
                    placeholder="0,00" 
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Preço de Custo (R$)</label>
                  <input 
                    className="w-full px-5 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all text-lg font-bold outline-none text-emerald-600" 
                    placeholder="0,00" 
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Preço Original (Opcional)</label>
                  <input 
                    className="w-full px-5 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all text-lg font-bold outline-none text-slate-400" 
                    placeholder="0,00" 
                    type="number"
                    step="0.01"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 px-5 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all text-lg font-medium outline-none appearance-none"
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      onClick={() => setShowCategoryManager(true)}
                      className="p-5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
                      title="Gerenciar Categorias"
                    >
                      <Settings size={20} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Estoque</label>
                  <input 
                    className="w-full px-5 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all text-lg font-medium outline-none" 
                    placeholder="0" 
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>
                <div className="md:col-span-full">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">URL da Imagem (Opcional)</label>
                  <input 
                    className="w-full px-5 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all text-lg font-medium outline-none" 
                    placeholder="https://exemplo.com/imagem.jpg" 
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button 
                  type="button" 
                  onClick={cancelEdit}
                  className="w-full py-5 rounded-2xl border-2 border-slate-200 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-50 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 text-sm active:scale-95"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCategoryManager && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <Tag size={20} />
                  </div>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight">Gerenciar Categorias</h3>
                </div>
                <button onClick={() => setShowCategoryManager(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex gap-2">
                  <input 
                    className="flex-1 px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold outline-none" 
                    placeholder="Nova categoria..." 
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <button 
                    onClick={() => {
                      if (newCategoryName) {
                        onAddCategory(newCategoryName);
                        setNewCategoryName('');
                      }
                    }}
                    className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                  >
                    <Plus size={24} />
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
                  {categories.map((cat) => (
                    <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">
                      {editingCategory === cat ? (
                        <input 
                          autoFocus
                          className="flex-1 bg-white px-3 py-1 rounded-lg border border-blue-200 outline-none font-bold"
                          value={editCategoryValue}
                          onChange={(e) => setEditCategoryValue(e.target.value)}
                          onBlur={() => {
                            if (editCategoryValue && editCategoryValue !== cat) {
                              onUpdateCategory(cat, editCategoryValue);
                            }
                            setEditingCategory(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editCategoryValue && editCategoryValue !== cat) {
                                onUpdateCategory(cat, editCategoryValue);
                              }
                              setEditingCategory(null);
                            }
                          }}
                        />
                      ) : (
                        <span className="font-bold text-slate-700">{cat}</span>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditCategoryValue(cat);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"
                        >
                          <Settings size={16} />
                        </button>
                        <button 
                          onClick={() => onDeleteCategory(cat)}
                          className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => setShowCategoryManager(false)}
                  className="w-full py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-100 transition-all text-sm"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Lista de Produtos</h3>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Filter size={20} /></button>
          </div>
        </div>
        
        {/* Mobile List View */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {products.map((product) => (
            <div key={product.id} className="p-4 flex gap-4 items-center group active:bg-slate-50 transition-colors">
              <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                <ProductImage src={product.image} alt={product.name} category={product.category} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-slate-900 truncate">{product.name}</h4>
                  <div className="flex flex-col items-end">
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-[10px] font-bold text-slate-400 line-through">R$ {product.originalPrice.toFixed(2)}</span>
                    )}
                    <span className="text-sm font-black text-blue-600 whitespace-nowrap ml-2">R$ {product.price.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{product.brand}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-bold text-blue-600 uppercase">{product.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          product.stock > 50 ? "bg-emerald-500" : product.stock > 20 ? "bg-amber-500" : "bg-rose-500"
                        )} 
                        style={{ width: `${Math.min(product.stock, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{product.stock} un</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); startEdit(product); }} 
                      className="p-3 bg-blue-50 text-blue-600 rounded-xl active:scale-95 transition-all"
                    >
                      <Settings size={20} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteProduct(product.id); }} 
                      className="p-3 bg-rose-50 text-rose-600 rounded-xl active:scale-95 transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Marca</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Preço</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estoque</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id} className={cn("hover:bg-slate-50 transition-colors group", editingId === product.id && "bg-blue-50/50")}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                        <ProductImage src={product.image} alt={product.name} category={product.category} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{product.brand}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    <div className="flex flex-col">
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-[10px] font-bold text-slate-400 line-through">R$ {product.originalPrice.toFixed(2)}</span>
                      )}
                      <span>R$ {product.price.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-blue-50 text-blue-600">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            product.stock > 50 ? "bg-emerald-500" : product.stock > 20 ? "bg-amber-500" : "bg-rose-500"
                          )} 
                          style={{ width: `${Math.min(product.stock, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-600">{product.stock}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => startEdit(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Settings size={18} />
                      </button>
                      <button 
                        onClick={() => onDeleteProduct(product.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">Mostrando {products.length} produtos</p>
          <div className="flex gap-2">
            <button className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 disabled:opacity-50"><ChevronLeft size={16} /></button>
            <button className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Brands = ({ 
  brands, 
  onAddBrand, 
  onUpdateBrand, 
  onDeleteBrand 
}: { 
  brands: Brand[], 
  onAddBrand: (name: string) => void,
  onUpdateBrand: (id: string, name: string) => void,
  onDeleteBrand: (id: string) => void
}) => {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (editingId) {
      onUpdateBrand(editingId, name);
      setEditingId(null);
    } else {
      onAddBrand(name);
    }

    setName('');
    setShowForm(false);
  };

  const startEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setName(brand.name);
    setShowForm(true);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20 lg:pb-0">
      <header className="flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md z-10 py-4 -mx-4 px-4 lg:static lg:bg-transparent lg:p-0 lg:m-0">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Marcas</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total: {brands.length} marcas</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg",
            showForm ? "bg-slate-200 text-slate-700 shadow-none" : "bg-blue-600 text-white shadow-blue-200"
          )}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          <span className="hidden sm:inline">{showForm ? 'Fechar' : 'Nova Marca'}</span>
        </button>
      </header>

      <AnimatePresence>
        {showForm && (
          <motion.section 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between text-blue-600">
              <div className="flex items-center gap-2">
                {editingId ? <Settings size={20} /> : <PlusCircle size={20} />}
                <h3 className="font-bold text-slate-900">
                  {editingId ? 'Editar Marca' : 'Nova Marca'}
                </h3>
              </div>
              <button onClick={() => { setEditingId(null); setName(''); setShowForm(false); }} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nome da Marca</label>
                <input 
                  className="w-full px-5 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all text-lg font-medium outline-none" 
                  placeholder="Ex: Farm, Animale, Zara..." 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  type="button" 
                  onClick={() => { setEditingId(null); setName(''); setShowForm(false); }}
                  className="w-full py-5 rounded-2xl border-2 border-slate-200 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-50 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 text-sm active:scale-95"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Marca'}
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>


      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Lista de Marcas</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {brands.length === 0 ? (
            <div className="p-10 text-center text-slate-400 italic">Nenhuma marca cadastrada.</div>
          ) : (
            brands.map((brand) => (
              <div key={brand.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black">
                    {brand.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-slate-900">{brand.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => startEdit(brand)}
                    className="p-2 text-slate-400 hover:text-blue-600 active:text-blue-600 transition-colors"
                  >
                    <Settings size={18} />
                  </button>
                  <button 
                    onClick={() => onDeleteBrand(brand.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 active:text-rose-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const CashControl = ({ 
  transactions, 
  sales,
  onAddTransaction,
  onUpdateTransaction,
  cashStatus,
  onOpenCash,
  onCloseCash
}: { 
  transactions: Transaction[], 
  sales: Sale[],
  onAddTransaction: (t: Omit<Transaction, 'id' | 'time' | 'date'>) => void,
  onUpdateTransaction: (id: string, amount: number) => void,
  cashStatus: { isOpen: boolean, openingBalance: number, openedAt: string | null },
  onOpenCash: (amount: number) => void,
  onCloseCash: () => void
}) => {
  const [showModal, setShowModal] = useState<'in' | 'out' | 'edit' | 'open' | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('pt-BR');
  const isCashOpenToday = cashStatus.isOpen && cashStatus.openedAt === today;

  const cashSales = sales.filter(s => s.date === today && s.paymentMethod === 'cash');
  const totalCashSales = cashSales.reduce((acc, s) => acc + s.total, 0);
  
  const todayTransactions = transactions.filter(t => t.date === today);

  const inTransactions = todayTransactions.filter(t => t.type === 'in');
  const outTransactions = todayTransactions.filter(t => t.type === 'out');
  
  const totalIn = inTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalOut = outTransactions.reduce((acc, t) => acc + t.amount, 0);
  
  const totalInCash = totalIn + totalCashSales;
  const currentBalance = totalInCash + totalOut;

  const cardPixSales = sales.filter(s => s.date === today && s.paymentMethod !== 'cash');
  const totalCardPix = cardPixSales.reduce((acc, s) => acc + s.total, 0);

  const handleAction = () => {
    const val = parseFloat(amount);
    if (isNaN(val)) return;

    if (showModal === 'open') {
      onOpenCash(val);
    } else if (showModal === 'edit' && editingId) {
      onUpdateTransaction(editingId, val);
    } else if (showModal === 'in') {
      onAddTransaction({ type: 'in', description: description || 'Reforço de Caixa', amount: val });
    } else if (showModal === 'out') {
      onAddTransaction({ type: 'out', description: description || 'Sangria de Caixa', amount: -val });
    }

    setShowModal(null);
    setAmount('');
    setDescription('');
    setEditingId(null);
  };

  const openEdit = (t: Transaction) => {
    setEditingId(t.id);
    setAmount(Math.abs(t.amount).toString());
    setDescription(t.description);
    setShowModal('edit');
  };

  // Combine transactions and sales for the list
  const allMovements = [
    ...todayTransactions.map(t => ({ ...t, isEditable: true })),
    ...cashSales.map(s => ({
      id: s.id,
      type: 'sale' as const,
      description: `Venda ${s.type} - ${s.salesperson}`,
      amount: s.total,
      time: s.createdAt ? new Date(s.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : s.date,
      method: s.paymentMethod === 'pix' ? 'PIX' : (s.paymentMethod === 'credit_card' || s.paymentMethod === 'debit_card') ? 'Cartão' : 'Dinheiro',
      isEditable: false
    }))
  ].sort((a, b) => {
    const getTime = (id: string) => {
      return Number(id);
    };
    return getTime(b.id) - getTime(a.id);
  });

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-500 pb-24 lg:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-slate-50/90 backdrop-blur-md z-20 py-4 -mx-4 px-4 lg:static lg:bg-transparent lg:p-0 lg:m-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Controle de Caixa</h2>
          <span className={cn(
            "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase shadow-sm",
            isCashOpenToday ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
          )}>
            {isCashOpenToday ? 'Aberto' : 'Fechado'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border-2 border-slate-100 text-slate-700 active:bg-slate-50 text-sm font-bold transition-all">
            <History size={20} />
            <span className="hidden sm:inline">Histórico</span>
          </button>
          {isCashOpenToday ? (
            <button 
              onClick={onCloseCash}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-900 text-white active:bg-slate-800 text-sm font-bold shadow-lg transition-all"
            >
              <Lock size={20} />
              <span>Fechar Caixa</span>
            </button>
          ) : (
            <button 
              onClick={() => setShowModal('open')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-600 text-white active:bg-emerald-700 text-sm font-bold shadow-lg transition-all"
            >
              <PlusCircle size={20} />
              <span>Abrir Caixa</span>
            </button>
          )}
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 lg:p-12 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none hidden sm:block">
          <DollarSign size={160} />
        </div>
        <div className="relative z-10">
          <p className="text-slate-500 font-bold text-sm lg:text-base mb-2 uppercase tracking-widest">Total em Caixa (Dinheiro)</p>
          <div className="flex items-baseline gap-2">
            <span className="text-slate-400 text-2xl lg:text-4xl font-medium tracking-tight">R$</span>
            <h3 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tight">
              {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="mt-8 lg:mt-12 flex flex-col sm:flex-row gap-3 lg:gap-4">
            <button 
              onClick={() => { setShowModal('in'); setDescription('Reforço de Caixa'); }}
              className="flex items-center justify-center gap-3 bg-blue-600 active:bg-blue-700 text-white px-8 py-4.5 rounded-2xl font-bold transition-all shadow-xl shadow-blue-100 text-base"
            >
              <PlusCircle size={22} />
              Reforço de Caixa
            </button>
            <button 
              onClick={() => { setShowModal('out'); setDescription('Sangria de Caixa'); }}
              className="flex items-center justify-center gap-3 bg-white border-2 border-slate-100 active:border-slate-200 text-slate-700 px-8 py-4.5 rounded-2xl font-bold transition-all text-base"
            >
              <MinusCircle size={22} />
              Sangria / Saída
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-6">
        {[
          { label: 'Entradas (Dinheiro)', value: `R$ ${totalInCash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-emerald-600', bg: 'bg-emerald-50/30' },
          { label: 'Saídas', value: `R$ ${Math.abs(totalOut).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-rose-600', bg: 'bg-rose-50/30' },
          { label: 'Vendas (Cartão/Pix)', value: `R$ ${totalCardPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-blue-600', bg: 'bg-blue-50/30' },
        ].map((stat, i) => (
          <div key={i} className={cn("bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 flex flex-col shadow-sm", stat.bg)}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
            <span className={cn("text-lg lg:text-2xl font-black mt-2", stat.color)}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <h4 className="font-bold text-slate-900">Movimentações Recentes</h4>
          <button className="text-blue-600 text-sm font-bold hover:underline">Ver todas</button>
        </div>
        <div className="divide-y divide-slate-100">
          {allMovements.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 italic text-sm">
              Nenhuma movimentação registrada hoje.
            </div>
          ) : (
            allMovements.map((tx) => (
              <div key={tx.id} className="px-5 py-5 flex items-center justify-between active:bg-slate-50 transition-all group">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                    tx.type === 'in' ? "bg-emerald-50 text-emerald-600" : 
                    tx.type === 'out' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {tx.type === 'in' ? <TrendingUp size={24} /> : 
                     tx.type === 'out' ? <TrendingDown size={24} /> : <ShoppingCart size={24} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{tx.description}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{tx.method || 'Operação Interna'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right pr-1">
                    <p className={cn(
                      "text-sm font-black",
                      tx.amount > 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {tx.amount > 0 ? '+' : ''} R$ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-slate-400 font-black uppercase mt-0.5 tracking-tighter">{tx.time}</p>
                  </div>
                  {tx.isEditable && (
                    <button 
                      onClick={() => openEdit(tx as Transaction)}
                      className="p-3 rounded-xl bg-slate-50 text-slate-400 active:bg-slate-100 transition-all"
                    >
                      <Settings size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden pb-safe"
            >
              <div className="p-8 lg:p-10 space-y-8">
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                    showModal === 'in' ? "bg-emerald-100 text-emerald-600 shadow-emerald-50" : 
                    showModal === 'out' ? "bg-rose-100 text-rose-600 shadow-rose-50" : "bg-blue-100 text-blue-600 shadow-blue-50"
                  )}>
                    {showModal === 'in' ? <TrendingUp size={28} /> : 
                     showModal === 'out' ? <TrendingDown size={28} /> : <DollarSign size={28} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {showModal === 'open' ? 'Abrir Caixa' :
                       showModal === 'in' ? 'Reforço de Caixa' : 
                       showModal === 'out' ? 'Sangria / Saída' : 'Editar Valor'}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                      {showModal === 'open' ? `Iniciando caixa para o dia ${today}` : 'Informe os detalhes da operação.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {showModal !== 'open' && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                      <input 
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ex: Troco inicial, Pagamento fornecedor..."
                        className="w-full px-5 py-4.5 bg-slate-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      {showModal === 'open' ? 'Valor Inicial (R$)' : 'Valor (R$)'}
                    </label>
                    <input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-5 py-5 bg-slate-50 border-none rounded-2xl text-2xl font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowModal(null)}
                    className="flex-1 px-6 py-4.5 rounded-2xl border-2 border-slate-100 text-slate-600 font-bold active:bg-slate-50 transition-all text-base"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAction}
                    className={cn(
                      "flex-[1.5] px-6 py-4.5 rounded-2xl text-white font-bold transition-all shadow-xl text-base active:scale-95",
                      showModal === 'open' ? "bg-emerald-600 active:bg-emerald-700 shadow-emerald-100" :
                      showModal === 'in' ? "bg-emerald-600 active:bg-emerald-700 shadow-emerald-100" : 
                      showModal === 'out' ? "bg-rose-600 active:bg-rose-700 shadow-rose-100" : "bg-blue-600 active:bg-blue-700 shadow-blue-100"
                    )}
                  >
                    {showModal === 'open' ? 'Abrir Caixa Agora' : 'Confirmar Operação'}
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

const FixedCosts = ({ 
  costs, 
  onAddCost, 
  onUpdateCost,
  onTogglePaid, 
  onDeleteCost 
}: { 
  costs: FixedCost[], 
  onAddCost: (c: Omit<FixedCost, 'id' | 'isPaid'>) => void,
  onUpdateCost: (id: string, c: Partial<FixedCost>) => void,
  onTogglePaid: (id: string) => void,
  onDeleteCost: (id: string) => void
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const totalCosts = costs.reduce((acc, c) => acc + c.amount, 0);
  const paidCosts = costs.filter(c => c.isPaid).reduce((acc, c) => acc + c.amount, 0);
  const pendingCosts = totalCosts - paidCosts;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !dueDate) return;
    
    if (editingId) {
      onUpdateCost(editingId, { description, amount: parseFloat(amount), dueDate });
      setEditingId(null);
    } else {
      onAddCost({ description, amount: parseFloat(amount), dueDate });
    }
    
    setDescription('');
    setAmount('');
    setDueDate('');
    setShowForm(false);
  };

  const startEdit = (cost: FixedCost) => {
    setEditingId(cost.id);
    setDescription(cost.description);
    setAmount(cost.amount.toString());
    setDueDate(cost.dueDate);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDescription('');
    setAmount('');
    setDueDate('');
    setShowForm(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-24 lg:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-slate-50/90 backdrop-blur-md z-20 py-4 -mx-4 px-4 lg:static lg:bg-transparent lg:p-0 lg:m-0">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Custos Fixos</h2>
          <p className="text-xs lg:text-sm text-slate-500">Gerencie as despesas recorrentes da sua loja.</p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Mensal</p>
            <p className="text-lg lg:text-xl font-black text-slate-900">R$ {totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-lg active:scale-95",
              showForm ? "bg-slate-200 text-slate-700 shadow-none" : "bg-blue-600 text-white shadow-blue-200"
            )}
          >
            {showForm ? <X size={20} /> : <Plus size={20} />}
            <span>{showForm ? 'Fechar' : 'Novo Custo'}</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-6">
        <div className="col-span-2 sm:col-span-1 p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm bg-white">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral</span>
          <p className="text-xl lg:text-2xl font-black mt-1 lg:mt-2 text-slate-900">R$ {totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        {[
          { label: 'Total Pago', value: paidCosts, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
          { label: 'Pendente', value: pendingCosts, color: 'text-rose-600', bg: 'bg-rose-50/50' },
        ].map((stat, i) => (
          <div key={i} className={cn("p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm", stat.bg)}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
            <p className={cn("text-lg lg:text-2xl font-black mt-1 lg:mt-2", stat.color)}>R$ {stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.section 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center gap-3 text-blue-600">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                {editingId ? <Settings size={22} /> : <PlusCircle size={22} />}
              </div>
              <h3 className="font-bold text-lg text-slate-900">
                {editingId ? 'Editar Custo' : 'Novo Custo'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                <input 
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Aluguel, Internet..."
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Vencimento (Dia)</label>
                  <input 
                    type="number"
                    min="1"
                    max="31"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    placeholder="Dia"
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 py-4.5 border-2 border-slate-100 text-slate-600 rounded-2xl font-bold active:bg-slate-50 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4.5 bg-blue-600 text-white rounded-2xl font-bold active:bg-blue-700 transition-all shadow-lg shadow-blue-100 text-sm"
                >
                  {editingId ? 'Salvar Alterações' : 'Adicionar Custo'}
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Custos Registrados</h3>
          <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md uppercase tracking-widest">{costs.length} itens</span>
        </div>
        
        {/* Mobile Card-based View */}
        <div className="block lg:hidden p-4 space-y-4">
          {costs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic bg-slate-50 rounded-2xl">Nenhum custo cadastrado.</div>
          ) : (
            costs.map((cost) => (
              <div key={cost.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm active:bg-slate-50 transition-all relative overflow-hidden group">
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1.5",
                  cost.isPaid ? "bg-emerald-500" : "bg-rose-500"
                )} />
                
                <div className="flex justify-between items-start mb-4">
                  <div className="min-w-0 flex-1 pr-2">
                    <h4 className="font-black text-slate-900 text-base truncate mb-1">{cost.description}</h4>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm",
                        cost.isPaid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {cost.isPaid ? 'Pago' : 'Pendente'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vence dia {cost.dueDate}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900">R$ {cost.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                  <button 
                    onClick={() => onTogglePaid(cost.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all active:scale-95",
                      cost.isPaid ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    <CheckCircle2 size={18} />
                    {cost.isPaid ? 'Pago' : 'Marcar Pago'}
                  </button>
                  <button 
                    onClick={() => startEdit(cost)} 
                    className="p-3 rounded-xl bg-slate-50 text-slate-400 active:bg-slate-100 transition-all"
                  >
                    <Settings size={20} />
                  </button>
                  <button 
                    onClick={() => onDeleteCost(cost.id)} 
                    className="p-3 rounded-xl bg-rose-50 text-rose-400 active:bg-rose-100 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                    Nenhum custo fixo cadastrado.
                  </td>
                </tr>
              ) : (
                costs.map((cost) => (
                  <tr key={cost.id} className={cn("hover:bg-slate-50 transition-colors group", editingId === cost.id && "bg-blue-50/50")}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{cost.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-500 font-medium">Dia {cost.dueDate}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-slate-900">R$ {cost.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => onTogglePaid(cost.id)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all",
                          cost.isPaid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        )}
                      >
                        {cost.isPaid ? 'Pago' : 'Pendente'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => startEdit(cost)}
                          className="p-2 text-slate-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Settings size={18} />
                        </button>
                        <button 
                          onClick={() => onDeleteCost(cost.id)}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const NewSale = ({ 
  salespersons, 
  products,
  sales,
  customers,
  onFinalizeSale, 
  onQuickAddCustomer,
  editingSale,
  onCancelEdit,
  todaySalesTotal, 
  weeklySalesTotal,
  monthlySalesTotal,
  monthlyGoal,
  dailyGoal, 
  salesByPerson,
  companyName,
  companyLogo,
  onDownloadPDF,
  showNotification
}: { 
  salespersons: Salesperson[], 
  products: Product[],
  sales: Sale[],
  customers: Customer[],
  onFinalizeSale: (sale: Sale) => void, 
  onQuickAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Customer,
  editingSale?: Sale | null,
  onCancelEdit?: () => void,
  todaySalesTotal: number,
  weeklySalesTotal: number,
  monthlySalesTotal: number,
  monthlyGoal: MonthlyGoal,
  dailyGoal: number,
  salesByPerson: Record<string, { total: number, count: number, avg: number }>,
  companyName: string,
  companyLogo: string,
  onDownloadPDF: (sale: Sale) => void,
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void
}) => {
  const [cart, setCart] = useState<{ product: Product, qty: number, priceOverride?: number }[]>([]);
  const [shift, setShift] = useState<'Manhã' | 'Tarde' | 'Sábado'>(() => {
    const now = new Date();
    if (now.getDay() === 6) return 'Sábado';
    return now.getHours() < 12 ? 'Manhã' : 'Tarde';
  });
  const [saleType, setSaleType] = useState<'Presencial' | 'Online'>('Presencial');
  const [saleCategory, setSaleCategory] = useState<'Venda à vista' | 'Parcelado' | 'Locação' | 'Venda alta'>('Venda à vista');
  const [avulsoName, setAvulsoName] = useState('');
  const [avulsoPrice, setAvulsoPrice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'debit_card' | 'cash' | 'installments' | 'link'>('pix');
  const [installments, setInstallments] = useState(1);
  const [selectedSalesperson, setSelectedSalesperson] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Auto-search customer by phone
  useEffect(() => {
    if (customerSearch.length >= 8) {
      const match = customers.find(c => c.phone.replace(/\D/g, '') === customerSearch.replace(/\D/g, ''));
      if (match && match.id !== selectedCustomerId) {
        setSelectedCustomerId(match.id);
        setCustomerSearch('');
      }
    }
  }, [customerSearch, customers, selectedCustomerId]);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
  [selectedCustomerId, customers]);

  const selectedCustomerStats = useMemo(() => {
    if (!selectedCustomer) return null;
    const cSales = sales.filter(s => s.customerId === selectedCustomer.id && s.status !== 'cancelled');
    const totalSpent = cSales.reduce((acc, s) => acc + s.total, 0);
    const lastSale = cSales.length > 0 
      ? cSales.sort((a, b) => parseSaleDate(b).getTime() - parseSaleDate(a).getTime())[0]
      : null;
    return {
      totalSpent,
      lastSaleDate: lastSale ? lastSale.date : 'Nunca',
      lastSaleRelative: lastSale ? formatRelativeDate(lastSale.date) : 'Nunca'
    };
  }, [selectedCustomer, sales]);

  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', gender: '', city: '' });
  const [currentStep, setCurrentStep] = useState<'products' | 'cart' | 'customer' | 'checkout'>('products');
  const steps = [
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'cart', label: 'Carrinho', icon: ShoppingCart },
    { id: 'customer', label: 'Cliente', icon: UserIcon },
    { id: 'checkout', label: 'Finalizar', icon: CheckCircle2 },
  ] as const;

  const nextStep = () => {
    if (currentStep === 'products') {
      setCurrentStep('cart');
      setIsCartExpanded(true);
      setIsCustomerExpanded(false);
      setIsFinalizationExpanded(false);
    }
    else if (currentStep === 'cart') {
      setCurrentStep('customer');
      setIsCartExpanded(false);
      setIsCustomerExpanded(true);
      setIsFinalizationExpanded(true);
    }
    else if (currentStep === 'customer') {
      setCurrentStep('checkout');
      setIsCartExpanded(false);
      setIsCustomerExpanded(false);
      setIsFinalizationExpanded(true);
    }
  };

  const prevStep = () => {
    if (currentStep === 'cart') {
      setCurrentStep('products');
      setIsCartExpanded(true);
      setIsCustomerExpanded(false);
      setIsFinalizationExpanded(false);
    }
    else if (currentStep === 'customer') {
      setCurrentStep('cart');
      setIsCartExpanded(true);
      setIsCustomerExpanded(false);
      setIsFinalizationExpanded(false);
    }
    else if (currentStep === 'checkout') {
      setCurrentStep('customer');
      setIsCartExpanded(false);
      setIsCustomerExpanded(true);
      setIsFinalizationExpanded(true);
    }
  };

  // Auto-expand/collapse based on step
  useEffect(() => {
    if (currentStep === 'products') {
      setIsCartExpanded(true);
      setIsCustomerExpanded(false);
      setIsFinalizationExpanded(false);
    } else if (currentStep === 'cart') {
      setIsCartExpanded(true);
      setIsCustomerExpanded(false);
      setIsFinalizationExpanded(false);
    } else if (currentStep === 'customer') {
      setIsCartExpanded(false);
      setIsCustomerExpanded(true);
      setIsFinalizationExpanded(false);
    } else if (currentStep === 'checkout') {
      setIsCartExpanded(false);
      setIsCustomerExpanded(false);
      setIsFinalizationExpanded(true);
    }
  }, [currentStep]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showQuickStats, setShowQuickStats] = useState(false);
  const [showAvulso, setShowAvulso] = useState(false);
  const [isCartExpanded, setIsCartExpanded] = useState(true);
  const [isCustomerExpanded, setIsCustomerExpanded] = useState(true);
  const [isFinalizationExpanded, setIsFinalizationExpanded] = useState(true);
  const [discount, setDiscount] = useState<string>('');

  const activeSalespersons = salespersons.filter(s => s.isActive);
  const subtotal = cart.reduce((acc, item) => acc + ((item.priceOverride ?? item.product.price) * item.qty), 0);
  const discountAmount = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);
  const goalProgress = Math.min(100, (todaySalesTotal / (dailyGoal || 1)) * 100);
  const weeklyGoal = monthlyGoal.targetAmount / 4;
  const weeklyProgress = Math.min(100, (weeklySalesTotal / (weeklyGoal || 1)) * 100);
  const monthlyProgress = Math.min(100, (monthlySalesTotal / (monthlyGoal.targetAmount || 1)) * 100);

  const isDailyBelow = goalProgress < 100 && new Date().getHours() > 17;
  const isWeeklyBelow = weeklyProgress < 75 && new Date().getDay() > 4;
  const isMonthlyBelow = monthlyProgress < 50 && new Date().getDate() > 15; // Simple check for mid-month

  useEffect(() => {
    if (editingSale) {
      setCart(editingSale.items);
      setShift(editingSale.shift);
      setSaleType(editingSale.type);
      setPaymentMethod(editingSale.paymentMethod);
      setInstallments(editingSale.installments || 1);
      setSelectedSalesperson(editingSale.salesperson);
      setSelectedCustomerId(editingSale.customerId || null);
    } else if (activeSalespersons.length > 0 && !selectedSalesperson) {
      setSelectedSalesperson(activeSalespersons[0].name);
    }
  }, [editingSale, activeSalespersons, selectedSalesperson]);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [showCartMobile, setShowCartMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const addAvulsoToCart = () => {
    if (!avulsoName || !avulsoPrice) return;
    const price = parseFloat(avulsoPrice);
    if (isNaN(price)) return;

    const newProduct: Product = {
      id: `avulso-${Date.now()}`,
      name: avulsoName,
      brand: 'Avulso',
      price: price,
      category: 'Avulso',
      stock: 1,
      image: 'https://picsum.photos/seed/avulso/400/300'
    };

    setCart([...cart, { product: newProduct, qty: 1 }]);
    setAvulsoName('');
    setAvulsoPrice('');
  };

  const updateItemPrice = (productId: string, newPrice: number) => {
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, priceOverride: newPrice } : item
    ));
  };

  const handleFinalizeSale = () => {
    if (cart.length === 0) return;
    
    const now = new Date();
    const totalCost = cart.reduce((acc, item) => acc + (item.product.costPrice || 0) * item.qty, 0);
    
    // Calculate commission
    const salespersonObj = salespersons.find(s => s.name === selectedSalesperson);
    const commissionRate = salespersonObj?.commissionRate || 3;
    const commissionType = salespersonObj?.commissionType || 'percentage';
    const commission = commissionType === 'fixed' ? commissionRate : (total * commissionRate) / 100;

    const newSale: Sale = {
      id: editingSale ? editingSale.id : `sale-${Date.now()}`,
      date: editingSale ? editingSale.date : now.toLocaleDateString('pt-BR'),
      createdAt: editingSale ? editingSale.createdAt : now.toISOString(),
      salesperson: selectedSalesperson,
      items: [...cart],
      total: total,
      cost: totalCost,
      discount: discountAmount > 0 ? discountAmount : undefined,
      paymentMethod: paymentMethod,
      installments: paymentMethod === 'installments' ? installments : undefined,
      shift: shift,
      type: saleType,
      customerId: selectedCustomerId || undefined,
      status: editingSale ? editingSale.status : 'completed',
      saleCategory: saleCategory,
      commission: commission
    };

    onFinalizeSale(newSale);
    setLastSale(newSale);
    setIsSuccess(true);
    setSelectedCustomerId(null);
    setCustomerSearch('');
    setCurrentStep('products');
    setTimeout(() => {
      setIsSuccess(false);
      setLastSale(null);
      setCart([]);
      setDiscount('');
    }, 30000); // Increased time to allow clicking WhatsApp button
  };

  const getReceiptMessage = (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customerId);
    
    const itemsList = sale.items.map(item => 
      `• ${item.qty}x ${item.product.name} - R$ ${(item.qty * (item.priceOverride ?? item.product.price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ).join('\n');

    return `Olá ${customer?.name || 'Cliente'}, tudo bem? Segue o seu comprovante de compra na *${companyName}*:\n\n` +
      `*Data:* ${sale.date}\n` +
      `*Vendedora:* ${sale.salesperson}\n\n` +
      `*Itens:*\n${itemsList}\n\n` +
      (sale.discount ? `*Desconto:* R$ ${sale.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` : '') +
      `*Total:* R$ ${sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `*Pagamento:* ${sale.paymentMethod === 'pix' ? 'PIX' : 
                       sale.paymentMethod === 'credit_card' ? 'Cartão de Crédito' : 
                       sale.paymentMethod === 'debit_card' ? 'Cartão de Débito' : 
                       sale.paymentMethod === 'installments' ? `Parcelado (${sale.installments}x)` : 
                       sale.paymentMethod === 'link' ? 'Link de Pagamento' : 'Dinheiro'}\n\n` +
      `Obrigado pela preferência! ✨`;
  };

  const sendWhatsAppReceipt = (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customerId);
    const phone = customer ? customer.phone.replace(/\D/g, '') : '';
    const message = getReceiptMessage(sale);
    const encodedMessage = encodeURIComponent(message);
    const waUrl = phone ? `https://api.whatsapp.com/send?phone=55${phone}&text=${encodedMessage}` : `https://api.whatsapp.com/send?text=${encodedMessage}`;
    window.open(waUrl, '_blank');
  };

  const copyReceiptToClipboard = (sale: Sale) => {
    const message = getReceiptMessage(sale);
    navigator.clipboard.writeText(message).then(() => {
      showNotification('Comprovante copiado com sucesso!', 'success');
    }).catch(err => {
      console.error('Erro ao copiar: ', err);
      showNotification('Erro ao copiar comprovante.', 'error');
    });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const bestSellers = useMemo(() => {
    const counts: Record<string, number> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.product.id) {
          counts[item.product.id] = (counts[item.product.id] || 0) + item.qty;
        }
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([id]) => products.find(p => p.id === id))
      .filter(Boolean) as Product[];
  }, [sales, products]);

  if (isSuccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-100">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900">{editingSale ? 'Venda Atualizada!' : 'Venda Finalizada!'}</h2>
          <p className="text-slate-500 font-medium">O registro foi salvo com sucesso no sistema.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {lastSale && (
            <>
              <button 
                onClick={() => sendWhatsAppReceipt(lastSale)}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
              >
                <MessageSquare size={20} />
                WhatsApp
              </button>
              <button 
                onClick={() => copyReceiptToClipboard(lastSale)}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold border border-blue-100 hover:bg-blue-100 transition-all"
              >
                <Copy size={20} />
                Copiar Texto
              </button>
              <button 
                onClick={() => onDownloadPDF(lastSale)}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-900 transition-all"
              >
                <Download size={20} />
                Baixar PDF
              </button>
            </>
          )}
          <button 
            onClick={() => { setIsSuccess(false); setLastSale(null); setCart([]); setDiscount(''); }}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            Novo Atendimento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 lg:gap-6 animate-in slide-in-from-right-4 duration-500">
      <header className="flex items-center justify-between sticky top-0 bg-slate-50 z-20 py-2">
        <div className="flex items-center gap-3">
          {currentStep !== 'products' && (
            <button 
              onClick={prevStep}
              className="p-2 bg-white text-slate-600 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Atendimento</h2>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">
            <TrendingUp size={14} />
            R$ {todaySalesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm mr-2">
            <div className={cn("w-2 h-2 rounded-full", currentStep !== 'products' ? "bg-emerald-500" : "bg-blue-500")} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter pr-1">
              Passo {steps.findIndex(s => s.id === currentStep) + 1} de 4
            </span>
          </div>
          {editingSale && (
            <button 
              onClick={onCancelEdit}
              className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 hover:bg-rose-100 transition-all"
            >
              Cancelar Edição
            </button>
          )}
          <button 
            onClick={() => nextStep()}
            disabled={cart.length === 0}
            className={cn(
              "md:hidden relative p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 transition-all",
              cart.length === 0 && "opacity-50 grayscale cursor-not-allowed",
              currentStep !== 'products' && "hidden"
            )}
          >
            <ShoppingCart size={24} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                {cart.length}
              </span>
            )}
          </button>
          <div className="hidden md:flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setSaleType('Presencial')}
              className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", saleType === 'Presencial' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
            >
              Presencial
            </button>
            <button 
              onClick={() => setSaleType('Online')}
              className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", saleType === 'Online' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
            >
              Online
            </button>
          </div>
          <button 
            onClick={() => setShowQuickStats(!showQuickStats)}
            className={cn("p-3 rounded-2xl transition-all", showQuickStats ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900 hover:bg-slate-200")}
          >
            <BarChart3 size={20} />
          </button>
        </div>
      </header>

      {showQuickStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Meta Diária</p>
            <div className="flex items-end justify-between mb-2">
              <span className="text-xl font-black text-slate-900">R$ {todaySalesTotal.toFixed(0)}</span>
              <span className="text-xs font-bold text-slate-400">/ R$ {dailyGoal.toFixed(0)}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-1000", isDailyBelow ? "bg-rose-500" : "bg-blue-600")}
                style={{ width: `${goalProgress}%` }}
              />
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Meta Semanal</p>
            <div className="flex items-end justify-between mb-2">
              <span className="text-xl font-black text-slate-900">R$ {weeklySalesTotal.toFixed(0)}</span>
              <span className="text-xs font-bold text-slate-400">/ R$ {weeklyGoal.toFixed(0)}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-1000", isWeeklyBelow ? "bg-rose-500" : "bg-indigo-600")}
                style={{ width: `${weeklyProgress}%` }}
              />
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Meta Mensal</p>
            <div className="flex items-end justify-between mb-2">
              <span className="text-xl font-black text-slate-900">R$ {monthlySalesTotal.toFixed(0)}</span>
              <span className="text-xs font-bold text-slate-400">/ R$ {monthlyGoal.targetAmount.toFixed(0)}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-1000", isMonthlyBelow ? "bg-rose-500" : "bg-violet-600")}
                style={{ width: `${monthlyProgress}%` }}
              />
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
            {isDailyBelow || isWeeklyBelow || isMonthlyBelow ? (
              <div className="text-center">
                <TrendingDown className="text-rose-500 mx-auto mb-1" size={20} />
                <p className="text-[10px] font-black text-rose-600 uppercase">Abaixo da Meta</p>
              </div>
            ) : (
              <div className="text-center">
                <TrendingUp className="text-emerald-500 mx-auto mb-1" size={20} />
                <p className="text-[10px] font-black text-emerald-600 uppercase">Ótimo Desempenho</p>
              </div>
            )}
          </div>
          {activeSalespersons.map(person => {
            const stats = salesByPerson[person.name] || { total: 0, count: 0, avg: 0 };
            return (
              <div key={person.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{person.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-slate-900">R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                  <span className="text-[10px] font-bold text-slate-400">({stats.count} vend.)</span>
                </div>
                <p className="text-[10px] text-blue-600 font-bold mt-1">Média: R$ {stats.avg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Left: Product Selection */}
        {(currentStep === 'products') && (
          <div className={cn(
            "flex-1 flex flex-col gap-4 md:gap-6 overflow-hidden",
            currentStep !== 'products' && "hidden md:hidden" // Hide on desktop if not products step
          )}>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm">1</div>
              <div>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">Seleção de Produtos</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Adicione itens ao carrinho para começar</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    className="w-full pl-12 pr-14 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all outline-none text-base font-medium" 
                    placeholder="Pesquisar produto ou marca..." 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 p-2 hover:bg-blue-100 rounded-xl transition-colors">
                    <QrCode size={24} />
                  </button>
                </div>
                <button 
                  onClick={() => setShowAvulso(!showAvulso)}
                  className={cn(
                    "px-4 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 border shadow-sm",
                    showAvulso ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <Plus size={20} />
                  <span className="hidden sm:inline">Item Avulso</span>
                </button>
              </div>

              <AnimatePresence>
                {showAvulso && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                      <div className="flex-1">
                        <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Venda Avulsa (Rápida)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={avulsoName}
                            onChange={(e) => setAvulsoName(e.target.value)}
                            placeholder="Nome do item..."
                            className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                          />
                          <div className="relative w-28">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                            <input 
                              type="number" 
                              value={avulsoPrice}
                              onChange={(e) => setAvulsoPrice(e.target.value)}
                              placeholder="0,00"
                              className="w-full pl-8 pr-3 py-3 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold"
                            />
                          </div>
                          <button 
                            onClick={addAvulsoToCart}
                            className="px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center active:scale-95"
                          >
                            <Plus size={24} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
            {bestSellers.length > 0 && !searchTerm && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="text-amber-500" size={18} />
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mais Vendidos</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {bestSellers.map(product => (
                    <button 
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="bg-white p-2 rounded-xl border border-slate-200 hover:border-blue-500 transition-all shadow-sm flex flex-col items-center text-center group active:scale-95"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-50 overflow-hidden mb-1.5 border border-slate-100">
                        <ProductImage src={product.image} alt={product.name} category={product.category} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[8px] font-bold text-slate-900 line-clamp-1 w-full leading-tight uppercase tracking-tight flex items-center justify-center gap-1">
                        <Sparkles size={8} className="text-amber-500" />
                        {product.name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-[7px] font-bold text-slate-400 line-through">R$ {product.price.toFixed(0)}</span>
                        )}
                        <p className="text-[8px] font-black text-blue-600 flex items-center gap-0.5">
                          <Tag size={8} />
                          R$ {product.price.toFixed(0)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-3 pb-20">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  onClick={() => addToCart(product)}
                  className="bg-white p-2 lg:p-3 rounded-xl border border-slate-200 hover:border-blue-500 transition-all group cursor-pointer shadow-sm hover:shadow-md flex flex-col"
                >
                  <div className="aspect-[4/3] bg-slate-50 rounded-lg mb-2 overflow-hidden relative">
                    <ProductImage src={product.image} alt={product.name} category={product.category} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/0 group-active:bg-black/10 transition-colors lg:hidden" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs lg:text-sm mb-0.5 line-clamp-2 group-hover:text-blue-600 transition-colors h-8 lg:h-10 leading-tight uppercase tracking-tight flex items-center gap-1">
                    <Package size={12} className="text-slate-400 shrink-0" />
                    {product.name}
                  </h4>
                  <p className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Store size={10} className="text-slate-300" />
                    {product.brand}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex flex-col">
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 line-through">R$ {product.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      )}
                      <span className="text-blue-600 font-black text-sm lg:text-base flex items-center gap-1">
                        <DollarSign size={14} />
                        R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="w-7 h-7 lg:w-8 lg:h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                      <Plus size={16} />
                    </div>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <p className="text-slate-400 font-medium">Nenhum produto encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* Right: Cart & Checkout */}
        <AnimatePresence mode="wait">
          {currentStep !== 'products' && (
            <motion.div 
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[60] md:relative md:inset-auto md:z-0 md:flex md:flex-1 md:h-full flex flex-col gap-6 bg-slate-50 md:bg-transparent p-4 md:p-0"
            >
              {currentStep === 'cart' && (
                <div className="bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm h-full">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={prevStep}
                        className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <div>
                        <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">Confirmação do Carrinho</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{cart.length} {cart.length === 1 ? 'item' : 'itens'}</p>
                      </div>
                    </div>
                    {cart.length > 0 && (
                      <button 
                        onClick={() => setCart([])}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                    {cart.map((item, i) => (
                      <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                            <ProductImage src={item.product.image} alt={item.product.name} category={item.product.category} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate leading-tight uppercase tracking-tight">{item.product.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{item.product.brand}</p>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                          <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1">
                            <button 
                              onClick={() => updateQty(item.product.id, -1)}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 active:scale-90 transition-all"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="text-sm font-black w-6 text-center text-slate-900">{item.qty}</span>
                            <button 
                              onClick={() => updateQty(item.product.id, 1)}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 active:scale-90 transition-all"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-900">
                              R$ {((item.priceOverride ?? item.product.price) * item.qty).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-white border-t border-slate-100 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span>Subtotal</span>
                        <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <span className="font-black text-slate-900 text-sm uppercase tracking-widest">Total</span>
                        <span className="text-2xl font-black text-blue-600 tracking-tight">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <button 
                      onClick={nextStep}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      Próximo: Identificar Cliente
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 'customer' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                    <button 
                      onClick={prevStep}
                      className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">Identificação do Cliente</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Vincule a venda a um cliente cadastrado</p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-6">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text"
                        placeholder="Buscar por nome ou telefone..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold shadow-inner"
                      />
                    </div>

                    {customerSearch && (
                      <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl bg-white shadow-xl animate-in fade-in slide-in-from-top-2">
                        {customers
                          .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch))
                          .map(c => (
                            <button
                              key={c.id}
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                setCustomerSearch('');
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors flex items-center justify-between"
                            >
                              <div>
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{c.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold">{c.phone}</p>
                              </div>
                              <ChevronRight size={16} className="text-slate-300" />
                            </button>
                          ))}
                        <button
                          onClick={() => {
                            setNewCustomer({ name: customerSearch, phone: '', gender: '', city: '' });
                            setShowAddCustomer(true);
                          }}
                          className="w-full text-left px-4 py-4 hover:bg-emerald-50 text-emerald-600 transition-colors flex items-center gap-3 border-t border-slate-50"
                        >
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Plus size={16} />
                          </div>
                          <span className="text-sm font-black uppercase tracking-widest">Cadastrar "{customerSearch}"</span>
                        </button>
                      </div>
                    )}

                    {selectedCustomerId && selectedCustomer ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-3xl shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-200 relative">
                              {selectedCustomer.name.charAt(0).toUpperCase()}
                              {selectedCustomerStats?.isVIP && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center border-2 border-blue-50 shadow-sm">
                                  <Trophy size={12} className="text-slate-900" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-black text-blue-900 uppercase tracking-tight">{selectedCustomer.name}</p>
                                {selectedCustomerStats?.isNew && (
                                  <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-widest">Novo</span>
                                )}
                              </div>
                              <p className="text-xs text-blue-600 font-bold">{selectedCustomer.phone}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setSelectedCustomerId(null)}
                            className="p-2 text-blue-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Gasto</p>
                            <p className="text-sm font-black text-slate-900">R$ {selectedCustomerStats?.totalSpent.toLocaleString('pt-BR')}</p>
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Compra</p>
                            <p className="text-sm font-black text-slate-900">{selectedCustomerStats?.lastSaleRelative}</p>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-3xl space-y-4">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                          <UserIcon size={32} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Nenhum Cliente Selecionado</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Busque acima ou continue sem identificar</p>
                        </div>
                        <button 
                          onClick={() => setShowAddCustomer(true)}
                          className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                        >
                          Novo Cliente
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 space-y-3">
                    <button 
                      onClick={nextStep}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      {selectedCustomerId ? 'Próximo: Pagamento' : 'Continuar sem identificar'}
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 'checkout' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                    <button 
                      onClick={prevStep}
                      className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">Finalização da Venda</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Escolha a vendedora e forma de pagamento</p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vendedora</label>
                        <div className="relative">
                          <select 
                            value={selectedSalesperson}
                            onChange={(e) => setSelectedSalesperson(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 text-sm font-black focus:ring-2 focus:ring-blue-500 appearance-none shadow-inner uppercase tracking-tight"
                          >
                            <option value="">Selecionar...</option>
                            {activeSalespersons.map(s => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Venda</label>
                        <div className="flex bg-slate-100 p-1 rounded-2xl h-[52px]">
                          <button 
                            onClick={() => setSaleType('Presencial')}
                            className={cn("flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", saleType === 'Presencial' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
                          >
                            Presencial
                          </button>
                          <button 
                            onClick={() => setSaleType('Online')}
                            className={cn("flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", saleType === 'Online' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
                          >
                            Online
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Desconto (R$)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">R$</span>
                          <input 
                            type="number" 
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                            placeholder="0,00"
                            className="w-full pl-10 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-black shadow-inner"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoria da Venda</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Venda à vista', 'Parcelado', 'Locação', 'Venda alta'].map((cat) => (
                          <button 
                            key={cat}
                            onClick={() => setSaleCategory(cat as any)}
                            className={cn(
                              "px-4 py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                              saleCategory === cat 
                                ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm" 
                                : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Forma de Pagamento</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { id: 'pix', label: 'PIX', icon: QrCode, activeClass: "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-emerald-100", iconColor: "text-emerald-600" },
                          { id: 'credit_card', label: 'Crédito', icon: CreditCard, activeClass: "border-blue-500 bg-blue-50 text-blue-700 shadow-blue-100", iconColor: "text-blue-600" },
                          { id: 'debit_card', label: 'Débito', icon: CreditCard, activeClass: "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-indigo-100", iconColor: "text-indigo-600" },
                          { id: 'cash', label: 'Dinheiro', icon: DollarSign, activeClass: "border-amber-500 bg-amber-50 text-amber-700 shadow-amber-100", iconColor: "text-amber-600" },
                          { id: 'link', label: 'Link', icon: ExternalLink, activeClass: "border-rose-500 bg-rose-50 text-rose-700 shadow-rose-100", iconColor: "text-rose-600" },
                          { id: 'installments', label: 'Parcelado', icon: History, activeClass: "border-purple-500 bg-purple-50 text-purple-700 shadow-purple-100", iconColor: "text-purple-600" },
                        ].map((method) => (
                          <button 
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id as any)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all shadow-sm active:scale-95 group",
                              paymentMethod === method.id 
                                ? cn("ring-1 ring-offset-2 ring-transparent", method.activeClass) 
                                : "border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50"
                            )}
                          >
                            <method.icon size={24} className={paymentMethod === method.id ? method.iconColor : "text-slate-300 group-hover:text-slate-400"} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-center">{method.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {paymentMethod === 'installments' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3 p-4 bg-purple-50/50 rounded-3xl border border-purple-100"
                      >
                        <label className="block text-[10px] font-black text-purple-700 uppercase tracking-widest ml-1">Número de Parcelas</label>
                        <div className="grid grid-cols-4 gap-2">
                          {[2, 3, 4, 5, 6, 10, 12].map(n => (
                            <button
                              key={n}
                              onClick={() => setInstallments(n)}
                              className={cn(
                                "py-3 rounded-xl border-2 font-black text-xs transition-all",
                                installments === n ? "border-purple-600 bg-purple-600 text-white shadow-md" : "border-white bg-white text-slate-400 hover:border-purple-200"
                              )}
                            >
                              {n}x
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    <div className="p-5 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-100 space-y-3">
                      <div className="flex justify-between items-center opacity-80">
                        <span className="text-[10px] font-black uppercase tracking-widest">Resumo Final</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{cart.length} Itens</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total a Pagar</p>
                          <p className="text-3xl font-black tracking-tighter">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Vendedora</p>
                          <p className="text-sm font-black uppercase truncate max-w-[120px]">{selectedSalesperson || '---'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setCurrentStep('products')}
                      className="flex-1 px-6 py-5 text-xs font-black text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all tracking-widest uppercase"
                    >
                      Voltar
                    </button>
                    <button 
                      onClick={handleFinalizeSale}
                      disabled={!selectedSalesperson || cart.length === 0}
                      className={cn(
                        "flex-[2] px-6 py-5 text-xs font-black text-white rounded-2xl transition-all tracking-widest uppercase shadow-lg flex items-center justify-center gap-2",
                        (!selectedSalesperson || cart.length === 0) 
                          ? "bg-slate-300 cursor-not-allowed shadow-none" 
                          : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                      )}
                    >
                      <CheckCircle2 size={18} />
                      Finalizar Venda
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Cart Summary (Only on Products Step) */}
        {currentStep === 'products' && cart.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md"
          >
            <button 
              onClick={nextStep}
              className="w-full bg-blue-600 text-white p-4 rounded-2xl shadow-2xl shadow-blue-200 flex items-center justify-between group active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center relative">
                  <ShoppingCart size={20} />
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-blue-600">
                    {cart.length}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Ver Carrinho</p>
                  <p className="text-lg font-black tracking-tight">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest">
                Próximo
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {cart.length > 0 && !showCartMobile && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="lg:hidden fixed bottom-20 left-4 right-4 z-40"
          >
            <button 
              onClick={() => setShowCartMobile(true)}
              className="w-full bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <ShoppingCart size={20} />
                </div>
                <span>Ver Carrinho</span>
              </div>
              <span className="bg-white/20 px-3 py-1 rounded-lg">R$ {total.toFixed(2)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Add Customer Modal */}
      <AnimatePresence>
        {showAddCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-widest">Novo Cliente</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Cadastro Rápido</p>
                  </div>
                </div>
                <button onClick={() => setShowAddCustomer(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-bold"
                    placeholder="Ex: Maria Silva"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Telefone (WhatsApp)</label>
                  <input 
                    type="tel" 
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-bold"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Gênero</label>
                    <select 
                      value={newCustomer.gender}
                      onChange={(e) => setNewCustomer({ ...newCustomer, gender: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-bold"
                    >
                      <option value="">Selecionar</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cidade</label>
                    <input 
                      type="text" 
                      value={newCustomer.city}
                      onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-bold"
                      placeholder="Ex: São Paulo"
                    />
                  </div>
                </div>
                <button 
                  disabled={!newCustomer.name || !newCustomer.phone}
                  onClick={() => {
                    const added = onQuickAddCustomer({ ...newCustomer, notes: '' });
                    setSelectedCustomerId(added.id);
                    setShowAddCustomer(false);
                    setNewCustomer({ name: '', phone: '', gender: '', city: '' });
                    setCustomerSearch('');
                  }}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar e Selecionar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BackupView = ({ 
  sales, setSales, 
  products, setProducts, 
  brands, setBrands, 
  salespersons, setSalespersons, 
  monthlyGoal, setMonthlyGoal,
  transactions, setTransactions,
  fixedCosts, setFixedCosts,
  customers, setCustomers,
  categories, setCategories,
  showNotification
}: { 
  sales: Sale[], setSales: React.Dispatch<React.SetStateAction<Sale[]>>,
  products: Product[], setProducts: React.Dispatch<React.SetStateAction<Product[]>>,
  brands: Brand[], setBrands: React.Dispatch<React.SetStateAction<Brand[]>>,
  salespersons: Salesperson[], setSalespersons: React.Dispatch<React.SetStateAction<Salesperson[]>>,
  monthlyGoal: MonthlyGoal, setMonthlyGoal: React.Dispatch<React.SetStateAction<MonthlyGoal>>,
  transactions: Transaction[], setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>,
  fixedCosts: FixedCost[], setFixedCosts: React.Dispatch<React.SetStateAction<FixedCost[]>>,
  customers: Customer[], setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>,
  categories: string[], setCategories: React.Dispatch<React.SetStateAction<string[]>>,
  showNotification: (message: string, type?: 'success' | 'error') => void
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRestoreDefaultsConfirm, setShowRestoreDefaultsConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [dangerZoneChecked, setDangerZoneChecked] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  const handleClearSales = () => {
    setShowClearSalesConfirm(true);
  };

  const [showClearSalesConfirm, setShowClearSalesConfirm] = useState(false);

  const confirmClearSales = () => {
    setSales([]);
    setShowClearSalesConfirm(false);
  };

  const handleResetSystem = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setSales([]);
    setProducts([]);
    setBrands([]);
    setSalespersons([]);
    setTransactions([]);
    setFixedCosts([]);
    setCustomers([]);
    setMonthlyGoal({ targetAmount: 0, workingDays: 22 });
    setShowResetConfirm(false);
    showNotification('Sistema resetado com sucesso.');
  };

  const handleRestoreDefaults = () => {
    setShowRestoreDefaultsConfirm(true);
  };

  const confirmRestoreDefaults = () => {
    setSales(MOCK_SALES);
    setProducts(MOCK_PRODUCTS);
    setBrands(MOCK_BRANDS);
    setSalespersons(MOCK_SALESPERSONS);
    setTransactions(MOCK_TRANSACTIONS);
    setFixedCosts(MOCK_FIXED_COSTS);
    setCustomers([]);
    setMonthlyGoal({ targetAmount: 15000, workingDays: 22 });
    setShowRestoreDefaultsConfirm(false);
    showNotification('Dados padrão restaurados com sucesso.');
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const salesData = sales.map(s => ({
      Data: s.date,
      Vendedora: s.salesperson,
      Total: s.total,
      Desconto: s.discount || 0,
      Metodo: s.paymentMethod,
      Itens: s.items.map(i => `${i.product.name} (${i.qty})`).join(', ')
    }));
    const wsSales = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, wsSales, "Vendas");
    const productsData = products.map(p => ({
      Nome: p.name,
      Preço: p.price,
      Marca: p.brand,
      Categoria: p.category,
      Estoque: p.stock
    }));
    const wsProducts = XLSX.utils.json_to_sheet(productsData);
    XLSX.utils.book_append_sheet(wb, wsProducts, "Produtos");
    const salespersonsData = salespersons.map(s => ({
      Nome: s.name,
      Ativo: s.isActive ? 'Sim' : 'Não'
    }));
    const wsSalespersons = XLSX.utils.json_to_sheet(salespersonsData);
    XLSX.utils.book_append_sheet(wb, wsSalespersons, "Vendedoras");
    XLSX.writeFile(wb, `sistema_vendas_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportData = () => {
    const data = {
      salespersons,
      monthlyGoal,
      sales,
      products,
      brands,
      transactions,
      fixedCosts,
      customers,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_sistema_vendas_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.salespersons && data.sales && data.products) {
          setPendingData(data);
          setShowImportConfirm(true);
        } else {
          showNotification('Arquivo de backup inválido.', 'error');
        }
      } catch (err) {
        showNotification('Erro ao ler o arquivo de backup.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const allSales: Sale[] = [];
        const newProducts: Product[] = [...products];
        const newBrands: Brand[] = [...brands];
        const newSalespersons: Salesperson[] = [...salespersons];
        workbook.SheetNames.forEach(sheetName => {
          // Be more flexible with sheet names: DD.MM, Vendas, or any sheet if only one exists
          const isDateSheet = /^\d{2}\.\d{2}/.test(sheetName);
          const isVendasSheet = sheetName.toLowerCase().includes('venda');
          const isOnlySheet = workbook.SheetNames.length === 1;
          
          if (!isDateSheet && !isVendasSheet && !isOnlySheet) return;

          const sheet = workbook.Sheets[sheetName];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          
          let day = 1, month = 1;
          if (isDateSheet) {
            [day, month] = sheetName.split('.').map(Number);
          } else {
            // Try to get date from sheet content or use current
            const now = new Date();
            day = now.getDate();
            month = now.getMonth() + 1;
          }
          const parseExcelValue = (val: any): number => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            const str = String(val).trim();
            if (!str) return 0;
            if (str.includes(',')) {
              return parseFloat(str.replace(/[R$\s.]/g, '').replace(',', '.'));
            }
            const cleaned = str.replace(/[R$\s]/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : num;
          };
          const hasCellLayout = rows[5] && rows[5][11] && rows[5][13];
          if (hasCellLayout) {
            let rowIndex = 5;
            let foundSales = false;
            while (rows[rowIndex] && rows[rowIndex][11] && rows[rowIndex][13]) {
              const vNameRaw = String(rows[rowIndex][11]);
              if (vNameRaw.toUpperCase().includes('TOTAL') || vNameRaw.toUpperCase().includes('SUBTOTAL')) {
                rowIndex++;
                continue;
              }
              const vName = normalizeName(vNameRaw);
              const vValue = parseExcelValue(rows[rowIndex][13]);
              if (!isNaN(vValue) && vValue > 0) {
                foundSales = true;
                const vKey = getComparisonKey(vName);
                let salesperson = newSalespersons.find(s => getComparisonKey(s.name) === vKey);
                if (!salesperson) {
                  salesperson = { id: `sp-${Date.now()}-${Math.random()}`, name: vName, isActive: true, status: 'active', commissionRate: 3 };
                  newSalespersons.push(salesperson);
                }
                allSales.push({
                  id: `sale-cell-${Date.now()}-${Math.random()}`,
                  date: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/2026`,
                  salesperson: salesperson.name,
                  items: [{ product: { id: 'legacy', name: 'Venda Importada', price: vValue, category: 'Geral', brand: 'Diversos', stock: 0 }, qty: 1 }],
                  total: vValue,
                  cost: vValue * 0.5,
                  paymentMethod: 'cash',
                  shift: 'Manhã',
                  type: 'Presencial',
                  saleCategory: 'Venda à vista',
                  commission: vValue * 0.03
                });
              }
              rowIndex++;
            }
            if (!foundSales) {
              const o2 = parseExcelValue(rows[1]?.[14]);
              const p2 = parseExcelValue(rows[1]?.[15]);
              const totalDay = o2 + p2;
              if (totalDay > 0) {
                allSales.push({
                  id: `sale-total-${Date.now()}-${Math.random()}`,
                  date: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/2026`,
                  salesperson: 'Importado',
                  items: [{ product: { id: 'legacy-total', name: 'Faturamento Total', price: totalDay, category: 'Geral', brand: 'Diversos', stock: 0 }, qty: 1 }],
                  total: totalDay,
                  cost: totalDay * 0.5,
                  paymentMethod: 'cash',
                  shift: 'Manhã',
                  type: 'Presencial',
                  saleCategory: 'Venda à vista',
                  commission: totalDay * 0.03
                });
              }
            }
            return; 
          }
          let headerRowIndex = -1;
          let headerRow: any[] = [];
          for (let r = 0; r < Math.min(rows.length, 10); r++) {
            const currentRow = rows[r] || [];
            if (currentRow.some((h: any) => ['vendedora', 'vendedor', 'func'].some(name => String(h || '').toLowerCase().includes(name)))) {
              headerRow = currentRow;
              headerRowIndex = r;
              break;
            }
          }
          if (headerRowIndex === -1) {
            headerRow = rows[2] || [];
            headerRowIndex = 2;
          }
          const findCol = (names: string[]) => headerRow.findIndex((h: any) => names.some(name => String(h || '').toLowerCase().includes(name.toLowerCase())));
          let dinheiroIdx = -1, debitoIdx = -1, creditoIdx = -1, pixIdx = -1, linkIdx = -1, vendedoraIdx = -1, tipoVendaIdx = -1, produtoIdx = -1, marcaIdx = -1, tipoProdutoIdx = -1;
          
          vendedoraIdx = findCol(['vendedora', 'vendedor', 'func', 'nome']);
          produtoIdx = findCol(['produto', 'item', 'descrição', 'serviço']);
          marcaIdx = findCol(['marca', 'fabricante']);
          tipoProdutoIdx = findCol(['tipo', 'categoria']);
          tipoVendaIdx = findCol(['tipo venda', 'origem', 'canal']);

          dinheiroIdx = findCol(['dinheiro', 'espécie', 'cash']);
          debitoIdx = findCol(['debito', 'débito', 'cartão débito']);
          creditoIdx = findCol(['credito', 'crédito', 'cartão crédito']);
          pixIdx = findCol(['pix']);
          linkIdx = findCol(['link', 'pagamento online']);

          // Fallback if not found
          if (vendedoraIdx === -1) vendedoraIdx = 0;
          if (produtoIdx === -1) produtoIdx = 1;
          
          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 2) continue;
            
            const vendedoraNameRawStr = String(row[vendedoraIdx] || '').trim();
            if (!vendedoraNameRawStr || !isNaN(Number(vendedoraNameRawStr)) || vendedoraNameRawStr.length < 2) continue;
            
            const vendedoraName = normalizeName(vendedoraNameRawStr);
            
            // Get value from any payment column
            const valDinheiro = dinheiroIdx !== -1 ? parseExcelValue(row[dinheiroIdx]) : 0;
            const valDebito = debitoIdx !== -1 ? parseExcelValue(row[debitoIdx]) : 0;
            const valCredito = creditoIdx !== -1 ? parseExcelValue(row[creditoIdx]) : 0;
            const valPix = pixIdx !== -1 ? parseExcelValue(row[pixIdx]) : 0;
            const valLink = linkIdx !== -1 ? parseExcelValue(row[linkIdx]) : 0;

            const total = valDinheiro + valDebito + valCredito + valPix + valLink;
            if (total <= 0) continue;

            const vKey = getComparisonKey(vendedoraName);
            let salesperson = newSalespersons.find(s => getComparisonKey(s.name) === vKey);
            if (!salesperson) {
              salesperson = { id: `sp-${Date.now()}-${Math.random()}`, name: vendedoraName, isActive: true, status: 'active', commissionRate: 3 };
              newSalespersons.push(salesperson);
            }

            let paymentMethod: Sale['paymentMethod'] = 'cash';
            if (valDebito > 0) paymentMethod = 'debit_card';
            else if (valCredito > 0) paymentMethod = 'credit_card';
            else if (valPix > 0) paymentMethod = 'pix';
            else if (valLink > 0) paymentMethod = 'link';

            const productName = produtoIdx !== -1 ? String(row[produtoIdx] || 'Produto Importado') : 'Produto Importado';
            const brandName = marcaIdx !== -1 ? String(row[marcaIdx] || 'Sem Marca') : 'Sem Marca';
            const categoryName = tipoProdutoIdx !== -1 ? String(row[tipoProdutoIdx] || 'Geral') : 'Geral';

            if (brandName !== 'Sem Marca') {
              if (!newBrands.some(b => b.name.toLowerCase() === brandName.toLowerCase())) {
                newBrands.push({ id: `br-${Date.now()}-${Math.random()}`, name: brandName });
              }
            }

            let product = newProducts.find(p => p.name.toLowerCase() === productName.toLowerCase());
            if (!product) {
              product = { 
                id: `pr-${Date.now()}-${Math.random()}`, 
                name: productName, 
                brand: brandName, 
                price: total, 
                category: categoryName, 
                stock: 0 
              };
              newProducts.push(product);
            }

            allSales.push({ 
              id: `sale-${Date.now()}-${Math.random()}`, 
              date: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/2026`, 
              salesperson: salesperson.name, 
              items: [{ product, qty: 1 }], 
              total, 
              cost: product.costPrice || (total * 0.5),
              paymentMethod, 
              shift: 'Manhã', 
              type: (tipoVendaIdx !== -1 && String(row[tipoVendaIdx] || '').toLowerCase().includes('online')) ? 'Online' : 'Presencial',
              saleCategory: 'Venda à vista',
              commission: (salesperson.commissionType || 'percentage') === 'fixed' 
                ? (salesperson.commissionRate || 3) 
                : total * (salesperson.commissionRate || 3) / 100
            });
          }
        });
        if (allSales.length > 0) {
          setPendingData({ sales: [...sales, ...allSales], products: newProducts, brands: newBrands, salespersons: newSalespersons });
          setShowImportConfirm(true);
          showNotification(`Sucesso! Encontramos ${allSales.length} vendas no arquivo.`);
        } else {
          showNotification('Nenhum dado de venda compatível encontrado.', 'error');
        }
      } catch (err) {
        console.error(err);
        showNotification('Erro ao processar o arquivo Excel.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    if (excelFileInputRef.current) excelFileInputRef.current.value = '';
  };

  const confirmImport = () => {
    if (!pendingData) return;
    if (pendingData.salespersons) setSalespersons(pendingData.salespersons);
    if (pendingData.monthlyGoal) setMonthlyGoal(pendingData.monthlyGoal);
    if (pendingData.sales) setSales(pendingData.sales);
    if (pendingData.products) setProducts(pendingData.products);
    if (pendingData.categories) setCategories(pendingData.categories);
    if (pendingData.customers) setCustomers(pendingData.customers);
    if (pendingData.transactions) setTransactions(pendingData.transactions);
    if (pendingData.fixedCosts) setFixedCosts(pendingData.fixedCosts);
    if (pendingData.brands) setBrands(pendingData.brands);
    
    setPendingData(null);
    setShowImportConfirm(false);
    showNotification('Backup restaurado com sucesso!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Cópia de Segurança & Dados</h2>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Aqui você pode salvar seus dados, restaurar informações e importar planilhas com segurança.
          </p>
        </div>
        <button 
          onClick={() => setShowHelpModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100"
        >
          <HelpCircle size={18} />
          Não entendi — me explica
        </button>
      </header>

      {/* Fluxo Visual Passo a Passo */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Info size={120} />
        </div>
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
          <Info size={20} className="text-blue-600" />
          📌 Como usar corretamente:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="flex flex-col items-center text-center space-y-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xl shadow-sm">1</div>
            <div>
              <p className="font-black text-slate-900 uppercase text-xs tracking-widest mb-1">Salvar Backup</p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Crie uma cópia de segurança para garantir que não perderá nada.</p>
            </div>
          </div>
          <div className="flex flex-col items-center text-center space-y-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xl shadow-sm">2</div>
            <div>
              <p className="font-black text-slate-900 uppercase text-xs tracking-widest mb-1">Fazer Alterações</p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Trabalhe no sistema, cadastre produtos ou importe planilhas.</p>
            </div>
          </div>
          <div className="flex flex-col items-center text-center space-y-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-black text-xl shadow-sm">3</div>
            <div>
              <p className="font-black text-slate-900 uppercase text-xs tracking-widest mb-1">Restaurar se precisar</p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Se algo der errado ou quiser voltar atrás, use o arquivo salvo no passo 1.</p>
            </div>
          </div>
          {/* Linhas conectoras (apenas desktop) */}
          <div className="hidden md:block absolute top-6 left-[16.6%] right-[16.6%] h-0.5 bg-slate-100 -z-0" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Segurança */}
        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 flex items-center gap-3 text-emerald-600 bg-emerald-50/30">
            <ShieldCheck size={24} />
            <div>
              <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">💾 Segurança</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proteja suas informações</p>
            </div>
          </div>
          <div className="p-8 space-y-8 flex-1">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Download size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase text-sm tracking-tight">Salvar cópia de segurança</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">Guarda todos os seus dados para não perder nada. Recomendado fazer semanalmente.</p>
                </div>
              </div>
              <button 
                onClick={handleExportData} 
                className="w-full bg-emerald-600 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 active:scale-95"
              >
                <Download size={20} /> 
                Salvar backup no computador
              </button>
              <p className="text-[10px] text-slate-400 font-bold italic text-center">🔄 Use "Salvar backup" antes de fazer grandes mudanças no sistema.</p>
            </div>

            <div className="pt-8 border-t border-slate-100 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Upload size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase text-sm tracking-tight">Restaurar do arquivo</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">Use um arquivo que você salvou anteriormente para recuperar seus dados.</p>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImportData} accept=".json" className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full bg-white text-blue-600 border-2 border-blue-100 px-8 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <Upload size={20} /> 
                Selecionar arquivo de backup
              </button>
              <p className="text-[10px] text-slate-400 font-bold italic text-center">🔄 Use "Restaurar" se algo der errado ou se trocar de computador.</p>
            </div>
          </div>
        </section>

        {/* Relatórios e Planilhas */}
        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 flex items-center gap-3 text-blue-600 bg-blue-50/30">
            <BarChart3 size={24} />
            <div>
              <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">📊 Relatórios</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trabalhe com planilhas</p>
            </div>
          </div>
          <div className="p-8 space-y-8 flex-1">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase text-sm tracking-tight">Exportar para Excel</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">Gere uma planilha para ver seus dados no Excel ou enviar para o contador.</p>
                </div>
              </div>
              <button 
                onClick={handleExportExcel} 
                className="w-full bg-blue-600 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-100 active:scale-95"
              >
                <FileSpreadsheet size={20} /> 
                Baixar dados em Excel
              </button>
              <p className="text-[10px] text-slate-400 font-bold italic text-center">📄 Exemplo: Use "Exportar Excel" para enviar os dados ao contador.</p>
            </div>

            <div className="pt-8 border-t border-slate-100 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Package size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase text-sm tracking-tight">Importar Planilha</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">Envie uma planilha de vendas externa para dentro do sistema.</p>
                </div>
              </div>
              <input type="file" ref={excelFileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
              <button 
                onClick={() => excelFileInputRef.current?.click()} 
                className="w-full bg-white text-slate-600 border-2 border-slate-200 px-8 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <Package size={20} /> 
                Enviar planilha para o sistema
              </button>
              <p className="text-[10px] text-slate-400 font-bold italic text-center">💡 Não sabe o que escolher? Comece salvando um backup.</p>
            </div>
          </div>
        </section>

        {/* Zona de Perigo */}
        <section className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden lg:col-span-2">
          <div className="p-8 border-b border-slate-800 flex items-center gap-3 text-rose-500 bg-rose-950/20">
            <AlertTriangle size={24} />
            <div>
              <h3 className="font-black text-xl text-white uppercase tracking-tight">⚠️ Avançado (Perigo)</h3>
              <p className="text-[10px] font-black text-rose-400/60 uppercase tracking-widest">Ações que não podem ser desfeitas</p>
            </div>
          </div>
          <div className="p-8">
            <div className="bg-rose-950/30 border border-rose-900/50 rounded-3xl p-8 mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 animate-pulse">
                  <AlertTriangle size={24} />
                </div>
                <h4 className="text-xl font-black text-white uppercase tracking-tight">👉 ANTES de clicar, leia:</h4>
              </div>
              <ul className="space-y-3 text-rose-200 font-bold text-sm mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Isso vai apagar TODOS os dados do sistema
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Não pode ser desfeito (sem volta)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Recomendamos salvar um backup antes
                </li>
              </ul>
              
              <label className="flex items-center gap-3 p-4 bg-rose-900/40 rounded-2xl cursor-pointer group transition-all hover:bg-rose-900/60">
                <input 
                  type="checkbox" 
                  checked={dangerZoneChecked}
                  onChange={(e) => setDangerZoneChecked(e.target.checked)}
                  className="w-6 h-6 rounded-lg border-2 border-rose-500 bg-transparent text-rose-500 focus:ring-rose-500"
                />
                <span className="text-rose-100 font-black uppercase text-xs tracking-widest select-none">
                  ✔️ Eu entendo que isso não tem volta
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button 
                disabled={!dangerZoneChecked}
                onClick={handleClearSales} 
                className={cn(
                  "p-8 rounded-3xl border-2 transition-all text-center space-y-3 group",
                  dangerZoneChecked 
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20" 
                    : "bg-slate-800/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50"
                )}
              >
                <Trash2 size={32} className="mx-auto" />
                <p className="font-black uppercase tracking-widest text-xs">Limpar Histórico de Vendas</p>
              </button>
              <button 
                disabled={!dangerZoneChecked}
                onClick={handleResetSystem} 
                className={cn(
                  "p-8 rounded-3xl border-2 transition-all text-center space-y-3 group",
                  dangerZoneChecked 
                    ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-950/50" 
                    : "bg-slate-800/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50"
                )}
              >
                <AlertTriangle size={32} className="mx-auto" />
                <p className="font-black uppercase tracking-widest text-xs">Resetar Todo o Sistema</p>
              </button>
              <button 
                disabled={!dangerZoneChecked}
                onClick={handleRestoreDefaults} 
                className={cn(
                  "p-8 rounded-3xl border-2 transition-all text-center space-y-3 group",
                  dangerZoneChecked 
                    ? "bg-white text-blue-600 border-white hover:bg-blue-50" 
                    : "bg-slate-800/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50"
                )}
              >
                <RefreshCw size={32} className="mx-auto" />
                <p className="font-black uppercase tracking-widest text-xs">Restaurar Dados Padrão</p>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Modal de Ajuda Rápida */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowHelpModal(false)} 
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <HelpCircle size={32} />
                  <h3 className="text-2xl font-black uppercase tracking-tight">Central de Ajuda: Dados</h3>
                </div>
                <button onClick={() => setShowHelpModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <h4 className="font-black text-blue-600 uppercase tracking-widest text-sm">O que é Backup?</h4>
                  <p className="text-slate-600 leading-relaxed">
                    Backup é uma <strong>cópia de segurança</strong> de tudo o que você fez no sistema: vendas, produtos, clientes e configurações. 
                    Pense nisso como tirar uma foto de como o sistema está agora. Se você perder o celular ou o computador der problema, você usa essa "foto" para recuperar tudo.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                    <h5 className="font-black text-emerald-700 uppercase text-xs tracking-widest mb-3">Quando usar?</h5>
                    <ul className="space-y-2 text-xs text-emerald-800 font-bold">
                      <li>• Toda sexta-feira (rotina)</li>
                      <li>• Antes de importar uma planilha</li>
                      <li>• Antes de resetar o sistema</li>
                      <li>• Quando for trocar de computador</li>
                    </ul>
                  </div>
                  <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100">
                    <h5 className="font-black text-rose-700 uppercase text-xs tracking-widest mb-3">Erros comuns</h5>
                    <ul className="space-y-2 text-xs text-rose-800 font-bold">
                      <li>• Tentar abrir o arquivo .json no celular</li>
                      <li>• Perder o arquivo de backup</li>
                      <li>• Importar planilha sem ter backup</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-blue-600 uppercase tracking-widest text-sm">JSON vs Excel</h4>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-black">JSON</div>
                      <p className="text-sm text-slate-600"><strong>Para o Sistema:</strong> É o arquivo que o sistema entende. Serve para restaurar tudo automaticamente.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-black">XLSX</div>
                      <p className="text-sm text-slate-600"><strong>Para Você:</strong> É o arquivo do Excel. Serve para você abrir, ver os números e enviar para o contador.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-center">
                <button 
                  onClick={() => setShowHelpModal(false)}
                  className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                >
                  Entendi, obrigado!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowResetConfirm(false)} className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-10 text-center">
              <div className="w-24 h-24 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-8 shadow-inner"><AlertTriangle size={48} /></div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">Apagar Tudo?</h3>
              <p className="text-slate-500 font-bold mb-10 leading-relaxed uppercase text-xs tracking-widest">Você está prestes a deletar permanentemente todos os dados. Esta ação é irreversível.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmReset} className="w-full py-5 rounded-2xl bg-rose-600 text-white font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-100">Sim, Apagar Tudo</button>
                <button onClick={() => setShowResetConfirm(false)} className="w-full py-5 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Não, Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showRestoreDefaultsConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRestoreDefaultsConfirm(false)} className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-10 text-center">
              <div className="w-24 h-24 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-8 shadow-inner"><RefreshCw size={48} /></div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">Restaurar Padrão?</h3>
              <p className="text-slate-500 font-bold mb-10 leading-relaxed uppercase text-xs tracking-widest">Seus dados atuais serão substituídos pelos dados de demonstração.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmRestoreDefaults} className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">Sim, Restaurar</button>
                <button onClick={() => setShowRestoreDefaultsConfirm(false)} className="w-full py-5 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Não, Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showImportConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-10 text-center">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner"><Upload size={48} /></div>
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-4">Confirmar Importação?</h3>
              <p className="text-slate-500 font-bold mb-10 leading-relaxed uppercase text-xs tracking-widest">Isso substituirá os dados atuais do sistema pelos dados contidos no arquivo.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmImport} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100">Sim, Confirmar</button>
                <button onClick={() => { setShowImportConfirm(false); setPendingData(null); }} className="w-full py-5 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Não, Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showClearSalesConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowClearSalesConfirm(false)} className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-10 text-center">
              <div className="w-24 h-24 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-8 shadow-inner"><Trash2 size={48} /></div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">Limpar Vendas?</h3>
              <p className="text-slate-500 font-bold mb-10 leading-relaxed uppercase text-xs tracking-widest">Você está prestes a deletar permanentemente todo o histórico de vendas. Esta ação é irreversível.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmClearSales} className="w-full py-5 rounded-2xl bg-rose-600 text-white font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-100">Sim, Limpar Vendas</button>
                <button onClick={() => setShowClearSalesConfirm(false)} className="w-full py-5 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Não, Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CustomersView = ({ 
  customers, 
  sales, 
  onAddCustomer, 
  onDeleteCustomer,
  onUpdateCustomer,
  campaigns,
  companyName
}: { 
  customers: Customer[], 
  sales: Sale[], 
  onAddCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => void,
  onDeleteCustomer: (id: string) => void,
  onUpdateCustomer: (id: string, updates: Partial<Customer>) => void,
  campaigns: Campaign[],
  companyName: string
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'vip'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerForCampaign, setCustomerForCampaign] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({ 
    name: '', 
    phone: '', 
    gender: 'Feminino' as 'Masculino' | 'Feminino' | 'Outro', 
    city: '', 
    address: '', 
    birthDate: '', 
    notes: '' 
  });

  const customerStats = useMemo(() => {
    return customers.map(c => {
      const cSales = sales.filter(s => s.customerId === c.id && s.status !== 'cancelled');
      const totalSpent = cSales.reduce((acc, s) => acc + s.total, 0);
      
      // Cálculo de lucro gerado pelo cliente
      const totalProfit = cSales.reduce((acc, s) => {
        const saleProfit = s.items.reduce((pAcc, item) => {
          const cost = item.product.costPrice || 0;
          const price = item.priceOverride || item.product.price;
          return pAcc + (price - cost) * item.qty;
        }, 0);
        return acc + saleProfit;
      }, 0);

      const lastSale = cSales.length > 0 
        ? cSales.sort((a, b) => parseSaleDate(b).getTime() - parseSaleDate(a).getTime())[0]
        : null;
      
      const daysSinceLastSale = lastSale 
        ? Math.floor((new Date().getTime() - parseSaleDate(lastSale).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const daysSinceCreated = Math.floor((new Date().getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...c,
        totalSpent,
        totalProfit,
        salesCount: cSales.length,
        avgTicket: cSales.length > 0 ? totalSpent / cSales.length : 0,
        lastSaleDate: lastSale ? lastSale.date : 'Nunca',
        daysSinceLastSale,
        isInactive: daysSinceLastSale > 30 && cSales.length > 0,
        isVIP: totalSpent > 1000 || cSales.length > 5,
        isNew: daysSinceCreated < 7
      };
    });
  }, [customers, sales]);

  const filteredCustomers = useMemo(() => {
    return customerStats.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
      const matchesFilter = 
        filter === 'all' ? true :
        filter === 'active' ? !c.isInactive && c.salesCount > 0 :
        filter === 'inactive' ? c.isInactive :
        filter === 'vip' ? c.isVIP : true;
      return matchesSearch && matchesFilter;
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [customerStats, search, filter]);

  const handleAdd = () => {
    if (!newCustomer.name || !newCustomer.phone) return;
    onAddCustomer(newCustomer);
    setNewCustomer({ 
      name: '', 
      phone: '', 
      gender: 'Feminino', 
      city: '', 
      address: '', 
      birthDate: '', 
      notes: '' 
    });
    setShowAddModal(false);
  };

  const handleEdit = () => {
    if (!editingCustomer || !editingCustomer.name || !editingCustomer.phone) return;
    onUpdateCustomer(editingCustomer.id, editingCustomer);
    setShowEditModal(false);
    setEditingCustomer(null);
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-24 lg:pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestão de Clientes (CRM)</h2>
          <p className="text-slate-500">Acompanhe o comportamento e fidelize seus clientes.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Clientes</p>
          <p className="text-2xl font-black text-slate-900">{customers.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1">Lucro Total (CRM)</p>
          <p className="text-2xl font-black text-slate-900">R$ {customerStats.reduce((acc, c) => acc + c.totalProfit, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-rose-500 uppercase tracking-widest mb-1">Inativos (+30d)</p>
          <p className="text-2xl font-black text-slate-900">{customerStats.filter(c => c.isInactive).length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Ticket Médio Geral</p>
          <p className="text-2xl font-black text-slate-900">
            R$ {(customerStats.reduce((acc, c) => acc + c.avgTicket, 0) / (customers.length || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Alertas Automáticos */}
      {customerStats.filter(c => c.isInactive).length > 0 && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="font-bold text-amber-900">{customerStats.filter(c => c.isInactive).length} clientes não compram há mais de 30 dias!</p>
              <p className="text-xs text-amber-700">Isso pode representar uma perda de receita. Que tal enviar uma promoção?</p>
            </div>
          </div>
          <button 
            onClick={() => setFilter('inactive')}
            className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-all"
          >
            Ver Clientes
          </button>
        </motion.div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {(['all', 'active', 'inactive', 'vip'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  filter === f ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : f === 'inactive' ? 'Inativos' : 'VIPs'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Financeiro</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Compra</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{customer.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Desde {new Date(customer.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">R$ {customer.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-emerald-600 font-bold">Lucro: R$ {customer.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-600">{formatRelativeDate(customer.lastSaleDate)}</p>
                    {customer.daysSinceLastSale < 999 && (
                      <p className="text-[10px] text-slate-400 font-bold">{customer.lastSaleDate}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {customer.isVIP && (
                        <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest border border-amber-100">VIP</span>
                      )}
                      {customer.isNew && (
                        <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-100">Novo</span>
                      )}
                      {customer.isInactive ? (
                        <span className="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest border border-rose-100">Inativo</span>
                      ) : (
                        <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">Ativo</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => {
                          setEditingCustomer(customer);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Editar Cliente"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => setSelectedCustomer(customer)}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Ver Perfil"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          setCustomerForCampaign(customer);
                          setShowCampaignModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                        title="Enviar Campanha WhatsApp"
                      >
                        <Zap size={18} />
                      </button>
                      <a 
                        href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                        title="WhatsApp Direto"
                      >
                        <MessageSquare size={18} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Selection Modal */}
      <AnimatePresence>
        {showCampaignModal && customerForCampaign && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCampaignModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8"
            >
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3 uppercase tracking-tight">
                <Zap className="text-emerald-500" />
                Enviar Campanha
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-bold uppercase tracking-widest">Selecione uma campanha para {customerForCampaign.name}</p>
              
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {campaigns.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 font-bold uppercase text-xs">Nenhuma campanha cadastrada.</p>
                ) : campaigns.map(campaign => (
                  <button
                    key={campaign.id}
                    onClick={() => {
                      const message = campaign.message
                        .replace('{cliente}', customerForCampaign.name.split(' ')[0])
                        .replace('{empresa}', companyName);
                      const url = `https://api.whatsapp.com/send?phone=55${customerForCampaign.phone.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
                      window.open(url, '_blank');
                      setShowCampaignModal(false);
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-black text-slate-900 dark:text-white uppercase text-sm group-hover:text-emerald-600">{campaign.name}</p>
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500">
                        {campaign.type === 'new_customer' ? 'Novo' : campaign.type === 'inactive_30d' ? 'Inativo' : 'Geral'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic leading-relaxed">
                      "{campaign.message.replace('{cliente}', customerForCampaign.name.split(' ')[0]).replace('{empresa}', companyName)}"
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-8">
                <button 
                  onClick={() => setShowCampaignModal(false)}
                  className="w-full py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase text-xs tracking-widest"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-8"
            >
              <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <UserIcon className="text-blue-600" />
                Novo Cliente
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                  <input 
                    type="text" 
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    placeholder="Ex: Maria Oliveira"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    placeholder="Ex: 11999999999"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Gênero</label>
                    <select 
                      value={newCustomer.gender}
                      onChange={(e) => setNewCustomer({ ...newCustomer, gender: e.target.value as any })}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    >
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cidade</label>
                    <input 
                      type="text" 
                      value={newCustomer.city}
                      onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                      placeholder="Ex: São Paulo"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Endereço Completo</label>
                  <input 
                    type="text" 
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    placeholder="Rua, número, bairro..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Data de Nascimento</label>
                  <input 
                    type="date" 
                    value={newCustomer.birthDate}
                    onChange={(e) => setNewCustomer({ ...newCustomer, birthDate: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Observações</label>
                  <textarea 
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium h-24 resize-none"
                    placeholder="Gostos, preferências, alergias..."
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAdd}
                  className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  Salvar Cliente
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Customer Modal */}
      <AnimatePresence>
        {showEditModal && editingCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <Edit className="text-blue-600" />
                Editar Cliente
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                  <input 
                    type="text" 
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Gênero</label>
                    <select 
                      value={editingCustomer.gender || 'Feminino'}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, gender: e.target.value as any })}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    >
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cidade</label>
                    <input 
                      type="text" 
                      value={editingCustomer.city || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Endereço Completo</label>
                  <input 
                    type="text" 
                    value={editingCustomer.address || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Data de Nascimento</label>
                  <input 
                    type="date" 
                    value={editingCustomer.birthDate || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, birthDate: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Observações</label>
                  <textarea 
                    value={editingCustomer.notes || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium h-24 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleEdit}
                  className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Profile Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedCustomer(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 bg-blue-600 text-white flex justify-between items-start">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-black">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black">{selectedCustomer.name}</h3>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <span className="flex items-center gap-1 text-sm font-bold opacity-80"><UserIcon size={16} /> {selectedCustomer.phone}</span>
                      {selectedCustomer.gender && (
                        <span className="flex items-center gap-1 text-sm font-bold opacity-80"><UserIcon size={16} /> {selectedCustomer.gender}</span>
                      )}
                      {selectedCustomer.birthDate && (
                        <span className="flex items-center gap-1 text-sm font-bold opacity-80"><Calendar size={16} /> {new Date(selectedCustomer.birthDate).toLocaleDateString()}</span>
                      )}
                      {selectedCustomer.city && (
                        <span className="flex items-center gap-1 text-sm font-bold opacity-80"><MapPin size={16} /> {selectedCustomer.city}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setEditingCustomer(selectedCustomer);
                      setShowEditModal(true);
                      setSelectedCustomer(null);
                    }}
                    className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors text-white"
                    title="Editar Cliente"
                  >
                    <Edit size={20} />
                  </button>
                  <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {selectedCustomer.address && (
                  <div className="mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-3">
                    <MapPin className="text-blue-600 mt-1 shrink-0" size={20} />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Endereço</p>
                      <p className="font-bold text-slate-900">{selectedCustomer.address}</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Gasto</p>
                    <p className="text-2xl font-black text-slate-900">R$ {customerStats.find(c => c.id === selectedCustomer.id)?.totalSpent.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Médio</p>
                    <p className="text-2xl font-black text-slate-900">R$ {customerStats.find(c => c.id === selectedCustomer.id)?.avgTicket.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Frequência</p>
                    <p className="text-2xl font-black text-slate-900">{customerStats.find(c => c.id === selectedCustomer.id)?.salesCount} Compras</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <History size={20} className="text-blue-600" />
                    Histórico de Compras
                  </h4>
                  <div className="space-y-3">
                    {sales.filter(s => s.customerId === selectedCustomer.id).sort((a, b) => parseSaleDate(b).getTime() - parseSaleDate(a).getTime()).map(sale => (
                      <div key={sale.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div>
                          <p className="font-bold text-slate-900">{sale.date} - {sale.items.length} itens</p>
                          <p className="text-xs text-slate-500">{sale.items.map(i => i.product.name).join(', ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900">R$ {sale.total.toLocaleString('pt-BR')}</p>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                            sale.status === 'cancelled' ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                          )}>
                            {sale.status === 'cancelled' ? 'Cancelada' : 'Concluída'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {sales.filter(s => s.customerId === selectedCustomer.id).length === 0 && (
                      <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium">Nenhuma compra realizada ainda.</p>
                      </div>
                    )}
                  </div>

                  {selectedCustomer.notes && (
                    <div className="mt-8">
                      <h4 className="font-black text-slate-900 uppercase tracking-tight mb-3">Observações</h4>
                      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 text-amber-900 font-medium">
                        {selectedCustomer.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-4">
                <a 
                  href={`https://wa.me/55${selectedCustomer.phone.replace(/\D/g, '')}?text=Olá ${selectedCustomer.name}, tudo bem? Sentimos sua falta aqui na Beauty Manager!`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 min-w-[200px] bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                >
                  <MessageSquare size={20} />
                  Chamar no WhatsApp
                </a>
                <a 
                  href={`https://wa.me/55${selectedCustomer.phone.replace(/\D/g, '')}?text=Olá ${selectedCustomer.name}! Temos uma promoção especial para você hoje: 20% de desconto em qualquer serviço!`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 min-w-[200px] bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                >
                  <Sparkles size={20} />
                  Enviar Promoção
                </a>
                <button 
                  onClick={() => {
                    const msg = `Olá ${selectedCustomer.name}, passando para lembrar da sua última visita há ${formatRelativeDate(customerStats.find(c => c.id === selectedCustomer.id)?.lastSaleDate || '')}. Esperamos você em breve!`;
                    window.open(`https://wa.me/55${selectedCustomer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="flex-1 min-w-[200px] bg-slate-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                >
                  <Clock size={20} />
                  Lembrar Cliente
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CampaignView = ({ 
  campaigns, 
  setCampaigns,
  companyName
}: { 
  campaigns: Campaign[], 
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>,
  companyName: string
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [newCampaign, setNewCampaign] = useState<Omit<Campaign, 'id'>>({
    name: '',
    message: '',
    type: 'general'
  });

  const handleAdd = () => {
    if (!newCampaign.name || !newCampaign.message) return;
    const campaign: Campaign = {
      ...newCampaign,
      id: Date.now().toString()
    };
    setCampaigns([...campaigns, campaign]);
    setNewCampaign({ name: '', message: '', type: 'general' });
    setShowAddModal(false);
  };

  const handleEdit = () => {
    if (!editingCampaign || !editingCampaign.name || !editingCampaign.message) return;
    setCampaigns(campaigns.map(c => c.id === editingCampaign.id ? editingCampaign : c));
    setEditingCampaign(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir esta campanha?')) {
      setCampaigns(campaigns.filter(c => c.id !== id));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Campanhas de Vendas</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Crie mensagens personalizadas para seus clientes</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95"
        >
          <Plus size={20} />
          Nova Campanha
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map(campaign => (
          <motion.div 
            key={campaign.id}
            layout
            className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                campaign.type === 'new_customer' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                campaign.type === 'inactive_30d' ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" :
                "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              )}>
                {campaign.type === 'new_customer' ? 'Novo Cliente' : 
                 campaign.type === 'inactive_30d' ? 'Inativo +30d' : 'Geral'}
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setEditingCampaign(campaign)}
                  className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(campaign.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h4 className="font-black text-slate-900 dark:text-white uppercase mb-2">{campaign.name}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-4 flex-1 mb-4 italic leading-relaxed">
              "{campaign.message}"
            </p>
            <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                <MessageSquare size={12} />
                WhatsApp Pronto
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8"
            >
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3 uppercase tracking-tight">
                <Sparkles className="text-blue-600" />
                Nova Campanha
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome da Campanha</label>
                  <input 
                    type="text" 
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                    placeholder="Ex: Promoção de Verão"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Campanha</label>
                  <select 
                    value={newCampaign.type}
                    onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value as any })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  >
                    <option value="general">Geral</option>
                    <option value="new_customer">Novo Cliente</option>
                    <option value="inactive_30d">Inativo +30 Dias</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mensagem (WhatsApp)</label>
                  <textarea 
                    value={newCampaign.message}
                    onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none dark:text-white"
                    placeholder="Use {cliente} para o nome do cliente e {empresa} para o nome da sua empresa."
                  />
                  <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">
                    Tags disponíveis: <span className="text-blue-600">{"{cliente}"}</span>, <span className="text-blue-600">{"{empresa}"}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase text-xs tracking-widest">Cancelar</button>
                <button onClick={handleAdd} className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none uppercase text-xs tracking-widest">Criar Campanha</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingCampaign && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingCampaign(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8"
            >
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3 uppercase tracking-tight">
                <Edit className="text-blue-600" />
                Editar Campanha
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome da Campanha</label>
                  <input 
                    type="text" 
                    value={editingCampaign.name}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Campanha</label>
                  <select 
                    value={editingCampaign.type}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, type: e.target.value as any })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  >
                    <option value="general">Geral</option>
                    <option value="new_customer">Novo Cliente</option>
                    <option value="inactive_30d">Inativo +30 Dias</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mensagem (WhatsApp)</label>
                  <textarea 
                    value={editingCampaign.message}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, message: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setEditingCampaign(null)} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase text-xs tracking-widest">Cancelar</button>
                <button onClick={handleEdit} className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none uppercase text-xs tracking-widest">Salvar Alterações</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PerformanceView = ({ 
  salespersons, 
  sales, 
  monthlyGoal 
}: { 
  salespersons: Salesperson[], 
  sales: Sale[], 
  monthlyGoal: MonthlyGoal 
}) => {
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const selectedPerson = useMemo(() => 
    salespersons.find(p => p.id === selectedPersonId), 
    [salespersons, selectedPersonId]
  );

  const filteredSales = useMemo(() => {
    if (!selectedPerson) return [];
    return sales.filter(s => {
      const saleDate = parseSaleDate(s);
      const saleMonth = saleDate.toISOString().slice(0, 7);
      return s.salesperson === selectedPerson.name && saleMonth === selectedMonth && s.status !== 'cancelled';
    });
  }, [sales, selectedPerson, selectedMonth]);

  const totalSold = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const averageTicket = filteredSales.length > 0 ? totalSold / filteredSales.length : 0;
  
  const storeTotal = useMemo(() => 
    sales.filter(s => s.date.startsWith(selectedMonth) && s.status !== 'cancelled').reduce((acc, s) => acc + s.total, 0),
    [sales, selectedMonth]
  );

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const commission = useMemo(() => {
    if (!selectedPerson) return 0;
    
    const source = selectedPerson.commissionSource || 'individual';
    const period = selectedPerson.commissionPeriod || 'monthly';
    
    const calculateForAmount = (amount: number, salesCount: number) => {
      if (selectedPerson.tieredCommission && selectedPerson.tieredCommission.length > 0) {
        const sortedTiers = [...selectedPerson.tieredCommission].sort((a, b) => b.threshold - a.threshold);
        const applicableTier = sortedTiers.find(t => amount >= t.threshold);
        if (applicableTier) {
          const baseComm = (amount * applicableTier.rate) / 100;
          return baseComm + (applicableTier.bonus || 0);
        }
      }
      
      if (selectedPerson.commissionType === 'fixed') {
        return source === 'individual' ? salesCount * (selectedPerson.commissionRate || 0) : (selectedPerson.commissionRate || 0);
      } else {
        return (amount * (selectedPerson.commissionRate || 0)) / 100;
      }
    };

    let totalComm = 0;

    if (period === 'weekly') {
      if (source === 'individual') {
        const salesByWeek: { [key: string]: Sale[] } = {};
        filteredSales.forEach(s => {
          const date = parseSaleDate(s);
          const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`;
          if (!salesByWeek[weekKey]) salesByWeek[weekKey] = [];
          salesByWeek[weekKey].push(s);
        });
        Object.values(salesByWeek).forEach(weekSales => {
          const weekTotal = weekSales.reduce((acc, s) => acc + s.total, 0);
          totalComm += calculateForAmount(weekTotal, weekSales.length);
        });
      } else {
        // Store sales by week for the selected month
        const storeSalesByWeek: { [key: string]: { total: number, count: number } } = {};
        sales.filter(s => s.date.startsWith(selectedMonth) && s.status !== 'cancelled').forEach(s => {
          const date = parseSaleDate(s);
          const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`;
          if (!storeSalesByWeek[weekKey]) storeSalesByWeek[weekKey] = { total: 0, count: 0 };
          storeSalesByWeek[weekKey].total += s.total;
          storeSalesByWeek[weekKey].count += 1;
        });
        Object.values(storeSalesByWeek).forEach(weekData => {
          totalComm += calculateForAmount(weekData.total, weekData.count);
        });
      }
    } else {
      const baseAmount = source === 'individual' ? totalSold : storeTotal;
      const salesCount = source === 'individual' ? filteredSales.length : sales.filter(s => s.date.startsWith(selectedMonth) && s.status !== 'cancelled').length;
      totalComm = calculateForAmount(baseAmount, salesCount);
    }

    // Apply store bonus if store goal is hit
    if (storeTotal >= monthlyGoal.targetAmount && monthlyGoal.storeBonus) {
      if (monthlyGoal.storeBonusType === 'fixed') {
        totalComm += monthlyGoal.storeBonus;
      } else {
        totalComm += (storeTotal * monthlyGoal.storeBonus) / 100;
      }
    }

    return totalComm;
  }, [selectedPerson, totalSold, storeTotal, filteredSales, sales, selectedMonth, monthlyGoal]);

  const nextTier = useMemo(() => {
    if (!selectedPerson || !selectedPerson.tieredCommission) return null;
    const source = selectedPerson.commissionSource || 'individual';
    const baseAmount = source === 'individual' ? totalSold : storeTotal;
    const sortedTiers = [...selectedPerson.tieredCommission].sort((a, b) => a.threshold - b.threshold);
    return sortedTiers.find(t => t.threshold > baseAmount);
  }, [selectedPerson, totalSold, storeTotal]);

  const goalProgress = selectedPerson
    ? (selectedPerson.individualGoal ? (totalSold / selectedPerson.individualGoal) * 100 : 0)
    : (monthlyGoal.targetAmount ? (storeTotal / monthlyGoal.targetAmount) * 100 : 0);

  const goalRemaining = selectedPerson
    ? Math.max(0, (selectedPerson.individualGoal || 0) - totalSold)
    : Math.max(0, monthlyGoal.targetAmount - storeTotal);

  const currentGoal = selectedPerson ? (selectedPerson.individualGoal || 0) : monthlyGoal.targetAmount;
  const currentAtingido = selectedPerson ? totalSold : storeTotal;

  // Comparison logic
  const comparisons = useMemo(() => {
    if (!selectedPerson) return null;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const todaySales = sales.filter(s => s.salesperson === selectedPerson.name && s.date === todayStr && s.status !== 'cancelled');
    const yesterdaySales = sales.filter(s => s.salesperson === selectedPerson.name && s.date === yesterdayStr && s.status !== 'cancelled');
    
    const todayTotal = todaySales.reduce((acc, s) => acc + s.total, 0);
    const yesterdayTotal = yesterdaySales.reduce((acc, s) => acc + s.total, 0);

    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().slice(0, 10);
    const lastWeekSales = sales.filter(s => s.salesperson === selectedPerson.name && s.date === lastWeekStr && s.status !== 'cancelled');
    const lastWeekTotal = lastWeekSales.reduce((acc, s) => acc + s.total, 0);

    const dailyDiff = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0;
    const weeklyDiff = lastWeekTotal > 0 ? ((todayTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0;

    // Pace calculation
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentDay = now.getMonth() + 1 === month && now.getFullYear() === year ? now.getDate() : daysInMonth;
    
    const expectedPace = (selectedPerson.individualGoal || 0) * (currentDay / daysInMonth);
    const isOnTrack = totalSold >= expectedPace;

    return { todayTotal, yesterdayTotal, lastWeekTotal, dailyDiff, weeklyDiff, isOnTrack, expectedPace };
  }, [sales, selectedPerson, selectedMonth, totalSold]);

  // Gamification Levels
  const level = useMemo(() => {
    if (goalProgress >= 100) return { name: 'Ouro', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: <Trophy className="text-amber-500" /> };
    if (goalProgress >= 70) return { name: 'Prata', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50', icon: <Trophy className="text-slate-400" /> };
    if (goalProgress >= 30) return { name: 'Bronze', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: <Trophy className="text-orange-500" /> };
    return { name: 'Iniciante', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: <Star className="text-blue-500" /> };
  }, [goalProgress]);

  // Mini Coach Insights
  const insight = useMemo(() => {
    if (!selectedPerson) return null;
    let msg = "";
    if (goalProgress >= 100) msg = "Incrível! Você bateu sua meta. Continue assim para maximizar seus bônus!";
    else if (goalProgress >= 80) msg = "Você está quase lá! Faltam poucos passos para atingir o objetivo principal.";
    else if (goalProgress >= 50) msg = "Metade do caminho percorrido. Mantenha o ritmo para fechar o mês com chave de ouro.";
    else if (totalSold === 0) msg = "Vamos começar? Suas primeiras vendas do mês estão esperando por você!";
    else msg = "Cada venda conta! Foque no ticket médio para acelerar seu progresso.";

    if (comparisons && !comparisons.isOnTrack && totalSold > 0) {
      msg += ` ⚠️ Atenção: Você está um pouco abaixo do ritmo esperado para atingir a meta (Alvo atual: R$ ${comparisons.expectedPace.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}).`;
    }

    return msg;
  }, [selectedPerson, goalProgress, totalSold, comparisons]);

  // Group sales by day
  const salesByDay = useMemo(() => {
    const groups: { [key: string]: Sale[] } = {};
    filteredSales.forEach(sale => {
      if (!groups[sale.date]) groups[sale.date] = [];
      groups[sale.date].push(sale);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredSales]);

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-emerald-500';
    if (progress >= 70) return 'bg-blue-500';
    if (progress >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Meu Desempenho</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Acompanhe suas vendas e comissões</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <select 
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 outline-none focus:border-blue-500 transition-all font-bold text-sm appearance-none min-w-[200px]"
            >
              <option value="">Selecionar Vendedora</option>
              {salespersons.filter(p => p.isActive).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          </div>
          <div className="relative">
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 outline-none focus:border-blue-500 transition-all font-bold text-sm"
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          </div>
        </div>
      </div>

      {!selectedPerson ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6">
            <UserCircle size={48} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Selecione seu perfil</h3>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm max-w-xs">Escolha seu nome na lista acima para visualizar seus resultados detalhados.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Insights Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-200 dark:shadow-none relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
                  <Sparkles size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Olá, {selectedPerson.name.split(' ')[0]}!</h3>
                  <p className="text-blue-100 font-bold text-sm">{insight}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white", level.color)}>
                  {level.icon}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Nível Atual</p>
                  <p className="text-lg font-black uppercase tracking-tight">{level.name}</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -left-20 -top-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          </motion.div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600">
                  <TrendingUp size={20} />
                </div>
                {comparisons && comparisons.dailyDiff !== 0 && (
                  <div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase", comparisons.dailyDiff > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                    {comparisons.dailyDiff > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(comparisons.dailyDiff).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vendas Hoje</p>
              <h3 className="text-2xl font-black tracking-tight dark:text-white">R$ {comparisons?.todayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ontem: R$ {comparisons?.yesterdayTotal.toLocaleString('pt-BR')}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
                <DollarSign size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Comissão Acumulada</p>
              <h3 className="text-2xl font-black tracking-tight dark:text-white">R$ {commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">
                {selectedPerson.commissionType === 'fixed' ? 'Valor Fixo' : 'Taxa'}: {selectedPerson.commissionType === 'fixed' ? 'R$ ' : ''}{selectedPerson.commissionRate || 0}{selectedPerson.commissionType === 'fixed' ? '' : '%'}
                {monthlyGoal.storeBonus && (sales.filter(s => s.date.startsWith(selectedMonth) && s.status !== 'cancelled').reduce((acc, s) => acc + s.total, 0) >= monthlyGoal.targetAmount) && (
                  <span className="text-amber-500 ml-1">+ Bônus Loja</span>
                )}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center text-purple-600 mb-4">
                <ShoppingCart size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Médio</p>
              <h3 className="text-2xl font-black tracking-tight dark:text-white">R$ {averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{filteredSales.length} Vendas no mês</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-600 mb-4">
                <Target size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {selectedPerson ? "Meta Individual" : "Meta da Loja"}
              </p>
              <h3 className="text-2xl font-black tracking-tight dark:text-white">{goalProgress.toFixed(1)}%</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                R$ {currentAtingido.toLocaleString('pt-BR')} / R$ {currentGoal?.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Goal Clarity & Progress Bar */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Progresso da Meta</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                  {currentGoal === 0 
                    ? "Meta não definida para este período."
                    : goalRemaining > 0 
                      ? `Faltam R$ ${goalRemaining.toLocaleString('pt-BR')} para atingir seu objetivo.` 
                      : "Parabéns! Meta atingida com sucesso."}
                </p>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Meta</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">R$ {currentGoal?.toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Atingido</p>
                  <p className="text-lg font-black text-emerald-600">R$ {currentAtingido.toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faltam</p>
                  <p className="text-lg font-black text-rose-500">R$ {goalRemaining.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>

            <div className="relative h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(goalProgress, 100)}%` }}
                className={cn("h-full transition-all duration-1000 flex items-center justify-end px-4", getProgressColor(goalProgress))}
              >
                <span className="text-white font-black text-sm drop-shadow-sm">{goalProgress.toFixed(1)}%</span>
              </motion.div>
            </div>
          </div>

          {/* Commission Forecast & Tiers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Próximo Nível de Comissão</h3>
                <Zap className="text-blue-500 animate-pulse" size={24} />
              </div>
              
              {nextTier ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Venda mais <span className="text-blue-600 font-black">R$ {(nextTier.threshold - totalSold).toLocaleString('pt-BR')}</span></p>
                      <p className="text-xs text-slate-400">Para subir sua taxa para <span className="font-bold text-slate-900 dark:text-white">{nextTier.rate}%</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Próximo Alvo</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">R$ {nextTier.threshold.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(totalSold / nextTier.threshold) * 100}%` }}
                      className="h-full bg-blue-500 rounded-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 text-center">
                  <Trophy className="text-emerald-500 mx-auto mb-3" size={32} />
                  <p className="text-emerald-900 dark:text-emerald-400 font-black uppercase tracking-tight">Nível Máximo Atingido!</p>
                  <p className="text-emerald-600 text-xs font-bold">Você está na maior faixa de comissão disponível.</p>
                </div>
              )}

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedPerson.tieredCommission?.map((tier, idx) => {
                  const isReached = totalSold >= tier.threshold;
                  return (
                    <div key={idx} className={cn(
                      "p-4 rounded-2xl border-2 transition-all",
                      isReached ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/50" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-60"
                    )}>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nível {idx + 1}</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{tier.rate}%</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">R$ {tier.threshold.toLocaleString('pt-BR')}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Meta da Loja</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Progresso Geral</p>
                  <p className="text-xs font-black text-blue-600">{( (sales.filter(s => s.date.startsWith(selectedMonth) && s.status !== 'cancelled').reduce((acc, s) => acc + s.total, 0) / monthlyGoal.targetAmount) * 100).toFixed(1)}%</p>
                </div>
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((sales.filter(s => s.date.startsWith(selectedMonth) && s.status !== 'cancelled').reduce((acc, s) => acc + s.total, 0) / monthlyGoal.targetAmount) * 100, 100)}%` }}
                    className="h-full bg-blue-600"
                  />
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="text-amber-600" size={16} />
                    <p className="text-[10px] font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest">Bônus Coletivo</p>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-bold">Se a loja bater a meta geral, todas as vendedoras ganham <span className="font-black">+{monthlyGoal.storeBonus || 0}% de comissão extra!</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Smart History */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Histórico Inteligente</h3>
              <div className="flex items-center gap-2 text-slate-400">
                <Filter size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Agrupado por dia</span>
              </div>
            </div>

            <div className="space-y-8 max-h-[600px] overflow-y-auto custom-scrollbar pr-4">
              {salesByDay.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4">
                    <History size={32} />
                  </div>
                  <p className="text-slate-400 font-bold">Nenhuma venda registrada neste período.</p>
                </div>
              ) : (
                salesByDay.map(([date, daySales]) => {
                  const dayTotal = daySales.reduce((acc, s) => acc + s.total, 0);
                  const dayComm = daySales.reduce((acc, s) => acc + (s.commission || 0), 0);
                  return (
                    <div key={date} className="space-y-3">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="text-blue-500" size={14} />
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase">{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-900 dark:text-white">Total: R$ {dayTotal.toLocaleString('pt-BR')}</p>
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Comissão: R$ {dayComm.toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {daySales.map((sale, idx) => (
                          <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400">
                                {sale.paymentMethod === 'pix' ? <QrCode size={18} /> : <CreditCard size={18} />}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{sale.paymentMethod.replace('_', ' ')}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sale.items.length} itens • {sale.shift}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-slate-900 dark:text-white">R$ {sale.total.toLocaleString('pt-BR')}</p>
                              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">R$ {(sale.commission || 0).toLocaleString('pt-BR')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GoalsView = ({ 
  monthlyGoal, 
  setMonthlyGoal, 
  companyName,
  salespersons,
  setSalespersons
}: { 
  monthlyGoal: MonthlyGoal, 
  setMonthlyGoal: React.Dispatch<React.SetStateAction<MonthlyGoal>>,
  companyName: string,
  salespersons: Salesperson[],
  setSalespersons: React.Dispatch<React.SetStateAction<Salesperson[]>>
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Metas e Planejamento</h2>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Planejamento mensal de vendas {companyName}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Meta Geral da Loja */}
        <section className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-blue-600">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} />
              <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">
                Meta Geral da Loja
              </h3>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button 
                onClick={() => setMonthlyGoal({ ...monthlyGoal, mode: 'simple' })}
                className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", monthlyGoal.mode === 'simple' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400")}
              >
                Simples
              </button>
              <button 
                onClick={() => setMonthlyGoal({ ...monthlyGoal, mode: 'advanced' })}
                className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", monthlyGoal.mode === 'advanced' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400")}
              >
                Avançado
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mês de Referência</label>
                <input 
                  type="month" 
                  value={monthlyGoal.month}
                  onChange={(e) => {
                    const newMonth = e.target.value;
                    const { saturdays, weekdays } = getMonthStats(newMonth, monthlyGoal.holidays, monthlyGoal.blockedDays);
                    setMonthlyGoal({ 
                      ...monthlyGoal, 
                      month: newMonth,
                      workingDays: weekdays,
                      saturdayCount: saturdays
                    });
                  }}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-base font-black outline-none dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Meta de Vendas da Loja (R$)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  <input 
                    type="number" 
                    value={monthlyGoal.targetAmount}
                    onChange={(e) => setMonthlyGoal({ ...monthlyGoal, targetAmount: Number(e.target.value) })}
                    className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-base font-black outline-none dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bonificação Extra Loja</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      {monthlyGoal.storeBonusType === 'fixed' ? 'R$' : '%'}
                    </span>
                    <input 
                      type="number" 
                      value={monthlyGoal.storeBonus || 0}
                      onChange={(e) => setMonthlyGoal({ ...monthlyGoal, storeBonus: Number(e.target.value) })}
                      className="w-full pr-12 pl-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-base font-black outline-none dark:text-white"
                      placeholder="Ex: 2"
                    />
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button 
                      onClick={() => setMonthlyGoal({ ...monthlyGoal, storeBonusType: 'percentage' })}
                      className={cn("px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", (monthlyGoal.storeBonusType || 'percentage') === 'percentage' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400")}
                    >
                      %
                    </button>
                    <button 
                      onClick={() => setMonthlyGoal({ ...monthlyGoal, storeBonusType: 'fixed' })}
                      className={cn("px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", monthlyGoal.storeBonusType === 'fixed' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400")}
                    >
                      R$
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">Bônus para vendedoras se a meta da loja for batida</p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dias Úteis (Seg-Sex)</label>
                <input 
                  type="number" 
                  value={monthlyGoal.workingDays}
                  onChange={(e) => setMonthlyGoal({ ...monthlyGoal, workingDays: Number(e.target.value) })}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-base font-black outline-none dark:text-white"
                />
              </div>
            </div>

            {monthlyGoal.mode === 'advanced' && (
              <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-amber-600">
                      <Calendar size={18} />
                      <h4 className="font-black text-xs uppercase tracking-widest">Feriados e Bloqueios</h4>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="date"
                        id="new-holiday-goals"
                        className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold outline-none dark:text-white"
                      />
                      <button 
                        onClick={() => {
                          const input = document.getElementById('new-holiday-goals') as HTMLInputElement;
                          if (input.value) {
                            const newHolidays = [...(monthlyGoal.holidays || []), input.value];
                            const { saturdays, weekdays } = getMonthStats(monthlyGoal.month, newHolidays, monthlyGoal.blockedDays);
                            setMonthlyGoal({ ...monthlyGoal, holidays: newHolidays, workingDays: weekdays, saturdayCount: saturdays });
                            input.value = '';
                          }
                        }}
                        className="bg-slate-900 dark:bg-slate-700 text-white p-3 rounded-xl hover:bg-slate-800 transition-all"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(monthlyGoal.holidays || []).map(h => (
                        <div key={h} className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">
                          {new Date(h + 'T00:00:00').toLocaleDateString('pt-BR')}
                          <button onClick={() => {
                            const newHolidays = monthlyGoal.holidays?.filter(x => x !== h);
                            const { saturdays, weekdays } = getMonthStats(monthlyGoal.month, newHolidays, monthlyGoal.blockedDays);
                            setMonthlyGoal({ ...monthlyGoal, holidays: newHolidays, workingDays: weekdays, saturdayCount: saturdays });
                          }}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Clock size={18} />
                      <h4 className="font-black text-xs uppercase tracking-widest">Carga Horária</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Seg-Sex (Horas)</label>
                        <input 
                          type="number"
                          value={monthlyGoal.workHours?.weekday || 8}
                          onChange={(e) => setMonthlyGoal({ ...monthlyGoal, workHours: { ...monthlyGoal.workHours!, weekday: Number(e.target.value) } })}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold outline-none dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Sábado (Horas)</label>
                        <input 
                          type="number"
                          value={monthlyGoal.workHours?.saturday || 4}
                          onChange={(e) => setMonthlyGoal({ ...monthlyGoal, workHours: { ...monthlyGoal.workHours!, saturday: Number(e.target.value) } })}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold outline-none dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {(() => {
              const saturdays = monthlyGoal.saturdayCount ?? getMonthStats(monthlyGoal.month, monthlyGoal.holidays, monthlyGoal.blockedDays).saturdays;
              const totalSaturdayTarget = (monthlyGoal.saturdayTarget || 0) * saturdays;
              const remainingTarget = monthlyGoal.targetAmount - totalSaturdayTarget;
              const dailyWeekdayGoal = remainingTarget / (monthlyGoal.workingDays || 1);

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-3 text-blue-600 mb-2">
                      <TrendingUp size={18} />
                      <span className="font-bold text-sm uppercase tracking-widest">Meta Diária (Seg-Sex)</span>
                    </div>
                    <p className="text-2xl font-black text-blue-900 dark:text-blue-400">
                      R$ {Math.max(0, dailyWeekdayGoal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-500 mt-1 font-bold uppercase">
                      Total Semanal: R$ {(dailyWeekdayGoal * 5 + (monthlyGoal.saturdayTarget || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                    <div className="flex items-center gap-3 text-amber-600 mb-2">
                      <Target size={18} />
                      <span className="font-bold text-sm uppercase tracking-widest">Meta de Sábado</span>
                    </div>
                    <p className="text-2xl font-black text-amber-900 dark:text-amber-400">
                      R$ {(monthlyGoal.saturdayTarget || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1 font-bold uppercase">
                      {saturdays} sábados no mês (Total: R$ {totalSaturdayTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* Metas Individuais */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 text-rose-600">
            <UserCircle size={20} />
            <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">
              Metas Individuais
            </h3>
          </div>
          <div className="p-6 space-y-4 overflow-y-auto max-h-[600px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Ajuste a meta de cada vendedora para este mês</p>
            {salespersons.filter(s => s.isActive).map(s => (
              <div key={s.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-slate-900 dark:text-white uppercase">{s.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{s.function || 'Vendedora'}</span>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Meta Mensal</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                      <input 
                        type="number"
                        value={s.individualGoal || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSalespersons(prev => prev.map(item => item.id === s.id ? { ...item, individualGoal: val } : item));
                        }}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-black outline-none focus:ring-2 focus:ring-rose-500 transition-all dark:text-white"
                        placeholder="Meta individual"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Comissão Padrão</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                          {s.commissionType === 'fixed' ? 'R$' : '%'}
                        </span>
                        <input 
                          type="number"
                          value={s.commissionRate || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSalespersons(prev => prev.map(item => item.id === s.id ? { ...item, commissionRate: val } : item));
                          }}
                          className="w-full pr-10 pl-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-black outline-none focus:ring-2 focus:ring-rose-500 transition-all dark:text-white"
                          placeholder="Valor"
                        />
                      </div>
                      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button 
                          onClick={() => setSalespersons(prev => prev.map(item => item.id === s.id ? { ...item, commissionType: 'percentage' } : item))}
                          className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all", (s.commissionType || 'percentage') === 'percentage' ? "bg-slate-100 dark:bg-slate-700 text-rose-600" : "text-slate-400")}
                        >
                          %
                        </button>
                        <button 
                          onClick={() => setSalespersons(prev => prev.map(item => item.id === s.id ? { ...item, commissionType: 'fixed' } : item))}
                          className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all", s.commissionType === 'fixed' ? "bg-slate-100 dark:bg-slate-700 text-rose-600" : "text-slate-400")}
                        >
                          R$
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {salespersons.filter(s => s.isActive).length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma vendedora ativa encontrada</p>
              </div>
            )}
          </div>
          <div className="p-6 mt-auto border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Soma das Metas:</span>
              <span className="text-slate-900 dark:text-white">
                R$ {salespersons.filter(s => s.isActive).reduce((acc, s) => acc + (s.individualGoal || 0), 0).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const SettingsView = ({ 
  salespersons, 
  setSalespersons, 
  darkMode,
  setDarkMode,
  themeColor,
  setThemeColor,
  companyName,
  setCompanyName,
  companyLogo,
  setCompanyLogo,
  companyPhone,
  setCompanyPhone,
  companyEmail,
  setCompanyEmail,
  companyAddress,
  setCompanyAddress,
  companyWebsite,
  setCompanyWebsite,
  showNotification
}: { 
  salespersons: Salesperson[], 
  setSalespersons: React.Dispatch<React.SetStateAction<Salesperson[]>>,
  darkMode: boolean,
  setDarkMode: (v: boolean) => void,
  themeColor: string,
  setThemeColor: (v: string) => void,
  companyName: string,
  setCompanyName: (v: string) => void,
  companyLogo: string,
  setCompanyLogo: (v: string) => void,
  companyPhone: string,
  setCompanyPhone: (v: string) => void,
  companyEmail: string,
  setCompanyEmail: (v: string) => void,
  companyAddress: string,
  setCompanyAddress: (v: string) => void,
  companyWebsite: string,
  setCompanyWebsite: (v: string) => void,
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void
}) => {
  const [newName, setNewName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEmploymentType, setNewEmploymentType] = useState<'CLT' | 'Estagiária' | 'Dona'>('CLT');
  const [newFunction, setNewFunction] = useState('');
  const [newCommissionRate, setNewCommissionRate] = useState<number>(3);
  const [newCommissionType, setNewCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCommissionSource, setNewCommissionSource] = useState<'individual' | 'store'>('individual');
  const [newCommissionPeriod, setNewCommissionPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingStartDate, setEditingStartDate] = useState('');
  const [editingEmploymentType, setEditingEmploymentType] = useState<'CLT' | 'Estagiária' | 'Dona'>('CLT');
  const [editingFunction, setEditingFunction] = useState('');
  const [editingStatus, setEditingStatus] = useState<'active' | 'training' | 'inactive'>('active');
  const [editingCommissionRate, setEditingCommissionRate] = useState<number>(0);
  const [editingCommissionType, setEditingCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [editingCommissionSource, setEditingCommissionSource] = useState<'individual' | 'store'>('individual');
  const [editingCommissionPeriod, setEditingCommissionPeriod] = useState<'monthly' | 'weekly'>('monthly');

  const colors = [
    { name: 'Azul Biobel', value: '#2563eb' },
    { name: 'Rosa Chic', value: '#db2777' },
    { name: 'Verde Esmeralda', value: '#059669' },
    { name: 'Laranja Vibrante', value: '#ea580c' },
    { name: 'Roxo Elegante', value: '#7c3aed' },
    { name: 'Preto Minimalista', value: '#0f172a' },
  ];

  const addSalesperson = () => {
    const name = normalizeName(newName);
    if (!name || name.length < 2) return;
    
    const newKey = getComparisonKey(name);
    if (salespersons.some(s => getComparisonKey(s.name) === newKey)) {
      showNotification('Esta vendedora já está cadastrada (verifique se o nome é similar).', 'error');
      return;
    }

    const newS: Salesperson = {
      id: Date.now().toString(),
      name: name,
      isActive: true,
      status: 'active',
      startDate: newStartDate,
      employmentType: newEmploymentType,
      function: newFunction,
      commissionRate: newCommissionRate,
      commissionType: newCommissionType,
      commissionSource: newCommissionSource,
      commissionPeriod: newCommissionPeriod
    };
    setSalespersons([...salespersons, newS]);
    setNewName('');
    setNewStartDate('');
    setNewEmploymentType('CLT');
    setNewFunction('');
    setNewCommissionRate(3);
    setNewCommissionType('percentage');
    setNewCommissionSource('individual');
    setNewCommissionPeriod('monthly');
    showNotification('Vendedora cadastrada com sucesso!', 'success');
  };

  const startEdit = (s: Salesperson) => {
    setEditingId(s.id);
    setEditingName(s.name);
    setEditingStartDate(s.startDate || '');
    setEditingEmploymentType(s.employmentType || 'CLT');
    setEditingFunction(s.function || '');
    setEditingStatus(s.status || 'active');
    setEditingCommissionRate(s.commissionRate || 0);
    setEditingCommissionType(s.commissionType || 'percentage');
    setEditingCommissionSource(s.commissionSource || 'individual');
    setEditingCommissionPeriod(s.commissionPeriod || 'monthly');
  };

  const saveEdit = () => {
    const name = normalizeName(editingName);
    if (!name || name.length < 2) return;
    setSalespersons(salespersons.map(s => s.id === editingId ? { 
      ...s, 
      name, 
      startDate: editingStartDate, 
      employmentType: editingEmploymentType,
      function: editingFunction,
      status: editingStatus,
      commissionRate: editingCommissionRate,
      commissionType: editingCommissionType,
      commissionSource: editingCommissionSource,
      commissionPeriod: editingCommissionPeriod
    } : s));
    setEditingId(null);
  };

  const toggleStatus = (id: string) => {
    setSalespersons(salespersons.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const deleteSalesperson = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta vendedora?')) {
      setSalespersons(salespersons.filter(s => s.id !== id));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Configurações da Empresa</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Gerencie vendedoras e dados da {companyName}</p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
          <button 
            onClick={() => setDarkMode(false)}
            className={cn(
              "p-3 rounded-xl transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest",
              !darkMode ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Sun size={16} />
            Claro
          </button>
          <button 
            onClick={() => setDarkMode(true)}
            className={cn(
              "p-3 rounded-xl transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest",
              darkMode ? "bg-slate-700 text-blue-400 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Moon size={16} />
            Escuro
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dados da Empresa */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Store size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Dados da Empresa</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Empresa</label>
              <input 
                type="text" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Biobel Cosméticos"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL da Logomarca (PNG/JPG)</label>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={companyLogo}
                  onChange={(e) => setCompanyLogo(e.target.value)}
                  className="flex-1 px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  placeholder="https://exemplo.com/logo.png"
                />
                {companyLogo && (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={companyLogo} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">A logo será exibida nos recibos em PDF.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone de Contato</label>
                <input 
                  type="text" 
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail da Empresa</label>
                <input 
                  type="email" 
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  placeholder="contato@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço Completo</label>
              <input 
                type="text" 
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                placeholder="Rua Exemplo, 123 - Bairro, Cidade - UF"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site / Redes Sociais</label>
              <input 
                type="text" 
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                placeholder="www.empresa.com.br"
              />
            </div>
          </div>
        </section>

        {/* Theme Customization */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 text-blue-600">
            <Palette size={20} />
            <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">Identidade Visual</h3>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Escolha a cor principal da sua marca:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setThemeColor(color.value)}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group",
                    themeColor === color.value 
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" 
                      : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                  )}
                >
                  <div 
                    className="w-8 h-8 rounded-full shadow-inner" 
                    style={{ backgroundColor: color.value }}
                  />
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-tighter text-center",
                    themeColor === color.value ? "text-blue-600" : "text-slate-500"
                  )}>
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Salespersons Management */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 text-blue-600">
            <Users size={20} />
            <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">Gerenciar Vendedoras</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome da vendedora..."
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-base font-medium outline-none dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data de Início</label>
                <input 
                  type="date" 
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-base font-medium outline-none dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Contrato</label>
                <select 
                  value={newEmploymentType}
                  onChange={(e) => setNewEmploymentType(e.target.value as any)}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-base font-medium outline-none dark:text-white"
                >
                  <option value="CLT">CLT</option>
                  <option value="Estagiária">Estagiária</option>
                  <option value="Dona">Dona</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Função / Cargo</label>
                <input 
                  type="text" 
                  value={newFunction}
                  onChange={(e) => setNewFunction(e.target.value)}
                  placeholder="Ex: Vendedora Sênior, Gerente..."
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-base font-medium outline-none dark:text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Comissão Padrão</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      {newCommissionType === 'fixed' ? 'R$' : '%'}
                    </span>
                    <input 
                      type="number" 
                      value={newCommissionRate}
                      onChange={(e) => setNewCommissionRate(Number(e.target.value))}
                      className="w-full pr-12 pl-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-base font-medium outline-none dark:text-white"
                    />
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button 
                      onClick={() => setNewCommissionType('percentage')}
                      className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all", newCommissionType === 'percentage' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400")}
                    >
                      %
                    </button>
                    <button 
                      onClick={() => setNewCommissionType('fixed')}
                      className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all", newCommissionType === 'fixed' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400")}
                    >
                      R$
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Base da Comissão</label>
                <select 
                  value={newCommissionSource}
                  onChange={(e) => setNewCommissionSource(e.target.value as any)}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-base font-medium outline-none dark:text-white"
                >
                  <option value="individual">Venda Individual</option>
                  <option value="store">Venda Total da Loja</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Período da Comissão</label>
                <select 
                  value={newCommissionPeriod}
                  onChange={(e) => setNewCommissionPeriod(e.target.value as any)}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-base font-medium outline-none dark:text-white"
                >
                  <option value="monthly">Mensal</option>
                  <option value="weekly">Semanal</option>
                </select>
              </div>
            </div>
            <button 
              onClick={addSalesperson}
              className="w-full bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95"
            >
              <Plus size={20} />
              Cadastrar Vendedora
            </button>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {salespersons.map(s => (
                <div key={s.id} className="flex flex-col p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={cn("w-3 h-3 rounded-full", s.isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300")} />
                      {editingId === s.id ? (
                        <input 
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-700 px-3 py-1 rounded-lg border border-blue-500 outline-none text-sm font-bold dark:text-white"
                          autoFocus
                        />
                      ) : (
                        <div className="flex flex-col">
                          <span className={cn("text-base font-bold", !s.isActive ? "text-slate-400 line-through" : "text-slate-900 dark:text-white")}>{s.name}</span>
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{s.function || 'Sem função definida'}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingId !== s.id ? (
                        <button 
                          onClick={() => startEdit(s)}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                      ) : (
                        <button 
                          onClick={saveEdit}
                          className="p-2 text-emerald-600 hover:text-emerald-700 transition-colors"
                          title="Salvar"
                        >
                          <Check size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => toggleStatus(s.id)}
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-sm",
                          s.isActive ? "text-rose-600 bg-white dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30" : "text-emerald-600 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30"
                        )}
                      >
                        {s.isActive ? "Desativar" : "Ativar"}
                      </button>
                      <button 
                        onClick={() => deleteSalesperson(s.id)}
                        className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {editingId === s.id && (
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Início</label>
                        <input 
                          type="date"
                          value={editingStartDate}
                          onChange={(e) => setEditingStartDate(e.target.value)}
                          className="w-full bg-white dark:bg-slate-700 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 outline-none text-xs font-bold dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Contrato</label>
                        <select 
                          value={editingEmploymentType}
                          onChange={(e) => setEditingEmploymentType(e.target.value as any)}
                          className="w-full bg-white dark:bg-slate-700 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 outline-none text-xs font-bold dark:text-white"
                        >
                          <option value="CLT">CLT</option>
                          <option value="Estagiária">Estagiária</option>
                          <option value="Dona">Dona</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Função</label>
                        <input 
                          type="text"
                          value={editingFunction}
                          onChange={(e) => setEditingFunction(e.target.value)}
                          placeholder="Função..."
                          className="w-full bg-white dark:bg-slate-700 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 outline-none text-xs font-bold dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</label>
                        <select 
                          value={editingStatus}
                          onChange={(e) => setEditingStatus(e.target.value as any)}
                          className="w-full bg-white dark:bg-slate-700 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 outline-none text-xs font-bold dark:text-white"
                        >
                          <option value="active">Ativo</option>
                          <option value="training">Em Treinamento</option>
                          <option value="inactive">Inativo</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Comissão Padrão</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">
                              {editingCommissionType === 'fixed' ? 'R$' : '%'}
                            </span>
                            <input 
                              type="number"
                              value={editingCommissionRate}
                              onChange={(e) => setEditingCommissionRate(Number(e.target.value))}
                              className="w-full bg-white dark:bg-slate-700 pr-10 pl-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 outline-none text-xs font-bold dark:text-white"
                            />
                          </div>
                          <div className="flex bg-white dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-600">
                            <button 
                              onClick={() => setEditingCommissionType('percentage')}
                              className={cn("px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all", editingCommissionType === 'percentage' ? "bg-slate-100 dark:bg-slate-600 text-blue-600" : "text-slate-400")}
                            >
                              %
                            </button>
                            <button 
                              onClick={() => setEditingCommissionType('fixed')}
                              className={cn("px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all", editingCommissionType === 'fixed' ? "bg-slate-100 dark:bg-slate-600 text-blue-600" : "text-slate-400")}
                            >
                              R$
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Base</label>
                        <select 
                          value={editingCommissionSource}
                          onChange={(e) => setEditingCommissionSource(e.target.value as any)}
                          className="w-full bg-white dark:bg-slate-700 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 outline-none text-xs font-bold dark:text-white"
                        >
                          <option value="individual">Individual</option>
                          <option value="store">Loja</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Período</label>
                        <select 
                          value={editingCommissionPeriod}
                          onChange={(e) => setEditingCommissionPeriod(e.target.value as any)}
                          className="w-full bg-white dark:bg-slate-700 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 outline-none text-xs font-bold dark:text-white"
                        >
                          <option value="monthly">Mensal</option>
                          <option value="weekly">Semanal</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {editingId !== s.id && (
                    <div className="flex flex-wrap gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        Início: {s.startDate ? new Date(s.startDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não inf.'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase size={12} className="text-slate-400" />
                        Tipo: {s.employmentType || 'CLT'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity size={12} className={cn(s.status === 'active' ? "text-emerald-500" : s.status === 'training' ? "text-amber-500" : "text-rose-500")} />
                        Status: {s.status === 'active' ? 'Ativo' : s.status === 'training' ? 'Treino' : 'Inativo'}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign size={12} className="text-blue-500" />
                        Comissão: {s.commissionType === 'fixed' ? 'R$ ' : ''}{s.commissionRate || 0}{s.commissionType === 'fixed' ? '' : '%'} ({s.commissionSource === 'store' ? 'Loja' : 'Indiv.'} / {s.commissionPeriod === 'weekly' ? 'Semanal' : 'Mensal'})
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const SalesHistory = ({ 
  sales, 
  onEditSale, 
  onDeleteSale,
  onUpdateSale,
  onDownloadPDF,
  showNotification
}: { 
  sales: Sale[], 
  onEditSale: (sale: Sale) => void, 
  onDeleteSale: (saleId: string) => void,
  onUpdateSale: (sale: Sale) => void,
  onDownloadPDF: (sale: Sale) => void,
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<Sale | null>(null);
  const [showRefundModal, setShowRefundModal] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [filters, setFilters] = useState({
    salesperson: '',
    paymentMethod: '',
    type: '',
    search: '',
    startDate: '',
    endDate: '',
    status: ''
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Sale | 'date_obj'; direction: 'asc' | 'desc' }>({
    key: 'date_obj',
    direction: 'desc'
  });

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSalesperson = !filters.salesperson || sale.salesperson === filters.salesperson;
      const matchesPayment = !filters.paymentMethod || sale.paymentMethod === filters.paymentMethod;
      const matchesType = !filters.type || sale.type === filters.type;
      const matchesStatus = !filters.status || sale.status === filters.status;
      const matchesSearch = !filters.search || 
        sale.salesperson.toLowerCase().includes(filters.search.toLowerCase()) ||
        sale.id.toLowerCase().includes(filters.search.toLowerCase()) ||
        sale.items.some(item => item.product.name.toLowerCase().includes(filters.search.toLowerCase()));
      
      const saleDate = parseSaleDate(sale);
      const matchesStartDate = !filters.startDate || saleDate >= new Date(filters.startDate + 'T00:00:00');
      const matchesEndDate = !filters.endDate || saleDate <= new Date(filters.endDate + 'T23:59:59');
      
      return matchesSalesperson && matchesPayment && matchesType && matchesSearch && matchesStartDate && matchesEndDate && matchesStatus;
    }).sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Sale];
      let bValue: any = b[sortConfig.key as keyof Sale];

      if (sortConfig.key === 'date_obj') {
        aValue = parseSaleDate(a).getTime();
        bValue = parseSaleDate(b).getTime();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sales, filters, sortConfig]);

  const handleCancelSale = () => {
    if (!showCancelModal || !cancelReason) return;
    onUpdateSale({
      ...showCancelModal,
      status: 'cancelled',
      cancelReason: cancelReason
    });
    setShowCancelModal(null);
    setCancelReason('');
  };

  const handleRefundSale = () => {
    if (!showRefundModal) return;
    onUpdateSale({
      ...showRefundModal,
      status: 'refunded'
    });
    setShowRefundModal(null);
  };

  const copyReceiptToClipboard = (sale: Sale) => {
    const itemsList = sale.items.map(item => 
      `• ${item.qty}x ${item.product.name}: R$ ${(item.qty * (item.priceOverride ?? item.product.price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ).join('\n');

    const receiptText = `
📄 *RECIBO DE VENDA*
--------------------------
🆔 ID: #${sale.id.split('-')[1] || sale.id}
📅 Data: ${sale.date}
👤 Vendedora: ${sale.salesperson}
🏷️ Categoria: ${sale.saleCategory || 'Venda à vista'}
--------------------------
📦 *ITENS:*
${itemsList}
--------------------------
💰 *TOTAL: R$ ${sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*
💳 Pagamento: ${
      sale.paymentMethod === 'pix' ? 'PIX' : 
      sale.paymentMethod === 'credit_card' ? 'Cartão de Crédito' : 
      sale.paymentMethod === 'debit_card' ? 'Cartão de Débito' : 
      sale.paymentMethod === 'installments' ? `Parcelado (${sale.installments}x)` : 
      sale.paymentMethod === 'link' ? 'Link de Pagamento' : 'Dinheiro'
    }
--------------------------
Obrigado pela preferência! ✨
    `.trim();

    navigator.clipboard.writeText(receiptText).then(() => {
      showNotification('Comprovante copiado com sucesso!', 'success');
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      showNotification('Erro ao copiar comprovante.', 'error');
    });
  };

  const salespersons = Array.from(new Set(sales.map(s => s.salesperson)));

  const handleSort = (key: keyof Sale | 'date_obj') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Data', 'Vendedora', 'Total', 'Pagamento', 'Tipo', 'Turno'];
    const rows = filteredSales.map(sale => [
      sale.id,
      sale.date,
      sale.salesperson,
      sale.total.toFixed(2),
      sale.paymentMethod,
      sale.type,
      sale.shift
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `vendas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Histórico de Vendas</h2>
          <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">
            {filteredSales.length} {filteredSales.length === 1 ? 'Venda Encontrada' : 'Vendas Encontradas'}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
          >
            <Download size={18} />
            Exportar
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all",
              showFilters 
                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
          >
            <Filter size={18} />
            {showFilters ? 'Fechar Filtros' : 'Filtrar'}
          </button>
        </div>
      </header>

      {showFilters && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pesquisar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Vendedora ou produto..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendedora</label>
              <select 
                value={filters.salesperson}
                onChange={(e) => setFilters({...filters, salesperson: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Todas</option>
                {salespersons.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</label>
              <select 
                value={filters.paymentMethod}
                onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Todos</option>
                <option value="pix">PIX</option>
                <option value="credit_card">Crédito</option>
                <option value="debit_card">Débito</option>
                <option value="cash">Dinheiro</option>
                <option value="installments">Parcelado</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
              <select 
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Todos</option>
                <option value="Presencial">Presencial</option>
                <option value="Online">Online</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
              <select 
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Todos</option>
                <option value="completed">Concluída</option>
                <option value="cancelled">Cancelada</option>
                <option value="refunded">Reembolsada</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Inicial</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Final</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2 flex items-end justify-end">
              <button 
                onClick={() => setFilters({ salesperson: '', paymentMethod: '', type: '', search: '', startDate: '', endDate: '' })}
                className="flex items-center gap-2 px-4 py-2 text-rose-500 font-bold text-sm hover:bg-rose-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
                Limpar Todos os Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th 
                  className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors"
                  onClick={() => handleSort('date_obj')}
                >
                  <div className="flex items-center gap-2">
                    Data / Hora
                    <ArrowUpDown size={12} className={sortConfig.key === 'date_obj' ? 'text-blue-600' : ''} />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors"
                  onClick={() => handleSort('salesperson')}
                >
                  <div className="flex items-center gap-2">
                    Vendedora
                    <ArrowUpDown size={12} className={sortConfig.key === 'salesperson' ? 'text-blue-600' : ''} />
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Comissão</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic">
                    Nenhuma venda encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr 
                    key={sale.id} 
                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4" onClick={() => setSelectedSale(sale)}>
                      <p className="text-sm font-bold text-slate-900">
                        {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('pt-BR') : sale.date}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        {sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : sale.shift}
                      </p>
                    </td>
                    <td className="px-6 py-4" onClick={() => setSelectedSale(sale)}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                          {sale.salesperson.charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{sale.salesperson}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={() => setSelectedSale(sale)}>
                      <p className="text-sm text-slate-600">
                        {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {sale.items.map(i => i.product.name).join(', ')}
                      </p>
                    </td>
                    <td className="px-6 py-4" onClick={() => setSelectedSale(sale)}>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">
                        {sale.saleCategory || 'Venda à vista'}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={() => setSelectedSale(sale)}>
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                        sale.paymentMethod === 'pix' ? "bg-emerald-100 text-emerald-700" :
                        sale.paymentMethod === 'credit_card' ? "bg-blue-100 text-blue-700" :
                        sale.paymentMethod === 'debit_card' ? "bg-indigo-100 text-indigo-700" : 
                        sale.paymentMethod === 'installments' ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {sale.paymentMethod === 'pix' ? 'PIX' : 
                         sale.paymentMethod === 'credit_card' ? 'Crédito' : 
                         sale.paymentMethod === 'debit_card' ? 'Débito' : 
                         sale.paymentMethod === 'installments' ? `Parcelado (${sale.installments}x)` : 'Dinheiro'}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={() => setSelectedSale(sale)}>
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                        sale.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                        sale.status === 'cancelled' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {sale.status === 'completed' ? 'Concluída' : 
                         sale.status === 'cancelled' ? 'Cancelada' : 'Reembolsada'}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={() => setSelectedSale(sale)}>
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                        sale.type === 'Online' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"
                      )}>
                        {sale.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={() => setSelectedSale(sale)}>
                      <span className="text-xs font-black text-emerald-600">
                        R$ {(sale.commission || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={() => setSelectedSale(sale)}>
                      <span className="text-sm font-black text-slate-900">
                        R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      {sale.discount && (
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">
                          Desc: R$ {sale.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); copyReceiptToClipboard(sale); }}
                          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Copiar Comprovante Texto"
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDownloadPDF(sale); }}
                          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Baixar Recibo PDF"
                        >
                          <FileText size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEditSale(sale); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar Venda"
                        >
                          <Edit size={16} />
                        </button>
                        {sale.status === 'completed' && (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setShowCancelModal(sale); }}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Cancelar Venda"
                            >
                              <X size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setShowRefundModal(sale); }}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Reembolsar Venda"
                            >
                              <RefreshCw size={16} />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(sale.id); }}
                          className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Excluir do Registro"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {filteredSales.length === 0 ? (
            <div className="p-10 text-center text-slate-400 italic">Nenhuma venda encontrada.</div>
          ) : (
            filteredSales.map((sale) => (
              <div 
                key={sale.id} 
                className="p-4 flex items-center justify-between active:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3" onClick={() => setSelectedSale(sale)}>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">
                    {sale.salesperson.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{sale.salesperson}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('pt-BR') : sale.date} · {sale.items.length} itens
                      </p>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md",
                        sale.type === 'Online' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"
                      )}>
                        {sale.type}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                        {sale.saleCategory || 'Venda à vista'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); copyReceiptToClipboard(sale); }}
                    className="p-2 text-slate-400 active:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Copy size={18} />
                  </button>
                  <div className="text-right" onClick={() => setSelectedSale(sale)}>
                    <p className="text-sm font-black text-slate-900">R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">
                      Comissão: R$ {(sale.commission || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {sale.discount && (
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">
                        Desc: R$ {sale.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    <div className="flex flex-col items-end gap-1 mt-1">
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md",
                        sale.paymentMethod === 'pix' ? "bg-emerald-100 text-emerald-700" :
                        sale.paymentMethod === 'credit_card' ? "bg-blue-100 text-blue-700" :
                        sale.paymentMethod === 'debit_card' ? "bg-indigo-100 text-indigo-700" : 
                        sale.paymentMethod === 'installments' ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {sale.paymentMethod === 'pix' ? 'PIX' : 
                         sale.paymentMethod === 'credit_card' ? 'Crédito' : 
                         sale.paymentMethod === 'debit_card' ? 'Débito' : 
                         sale.paymentMethod === 'installments' ? `Parcelado (${sale.installments}x)` : 'Dinheiro'}
                      </span>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md",
                        sale.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                        sale.status === 'cancelled' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {sale.status === 'completed' ? 'Concluída' : 
                         sale.status === 'cancelled' ? 'Cancelada' : 'Reembolsada'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDownloadPDF(sale); }}
                      className="p-2 text-slate-600 bg-slate-50 rounded-lg"
                      title="Baixar Recibo PDF"
                    >
                      <FileText size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEditSale(sale); }}
                      className="p-2 text-blue-600 bg-blue-50 rounded-lg"
                    >
                      <Edit size={14} />
                    </button>
                    {sale.status === 'completed' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowCancelModal(sale); }}
                        className="p-2 text-rose-600 bg-rose-50 rounded-lg"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(sale.id); }}
                      className="p-2 text-slate-400 bg-slate-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>


      {/* Modal de Detalhes da Venda */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Detalhes da Venda</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">#{selectedSale.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedSale(null)}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Plus className="rotate-45" size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Vendedora</p>
                    <p className="font-bold text-slate-900">{selectedSale.salesperson}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Data</p>
                    <p className="font-bold text-slate-900">
                      {selectedSale.createdAt ? new Date(selectedSale.createdAt).toLocaleDateString('pt-BR') : selectedSale.date}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status</p>
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase",
                      selectedSale.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                      selectedSale.status === 'cancelled' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {selectedSale.status === 'completed' ? 'Concluída' : 
                       selectedSale.status === 'cancelled' ? 'Cancelada' : 'Reembolsada'}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tipo / Turno</p>
                    <p className="font-bold text-slate-900">{selectedSale.type} · {selectedSale.shift}</p>
                  </div>
                </div>

                {selectedSale.status === 'cancelled' && selectedSale.cancelReason && (
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <p className="text-[10px] font-black text-rose-400 uppercase mb-1">Motivo do Cancelamento</p>
                    <p className="text-sm font-bold text-rose-700">{selectedSale.cancelReason}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens Vendidos</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {selectedSale.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden flex-shrink-0">
                            {item.product.image ? (
                              <ProductImage src={item.product.image} alt={item.product.name} category={item.product.category} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Package size={16} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.product.name}</p>
                            <p className="text-xs text-slate-500">{item.qty}x R$ {(item.priceOverride ?? item.product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-slate-900">
                          R$ {(item.qty * (item.priceOverride ?? item.product.price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500">Subtotal</span>
                    <span className="text-sm font-black text-slate-900">
                      R$ {(selectedSale.total + (selectedSale.discount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {selectedSale.discount && (
                    <div className="flex items-center justify-between text-rose-600">
                      <span className="text-sm font-bold">Desconto</span>
                      <span className="text-sm font-black">
                        - R$ {selectedSale.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2 pt-2 border-t border-slate-100">
                    <span className="text-sm font-bold text-slate-500">Método de Pagamento</span>
                    <span className="text-sm font-black text-slate-900 uppercase">
                      {selectedSale.paymentMethod === 'pix' ? 'PIX' : 
                       selectedSale.paymentMethod === 'credit_card' ? 'Crédito' : 
                       selectedSale.paymentMethod === 'debit_card' ? 'Débito' : 
                       selectedSale.paymentMethod === 'installments' ? `Parcelado (${selectedSale.installments}x)` : 'Dinheiro'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-slate-900">Total da Venda</span>
                    <span className="text-2xl font-black text-blue-600">
                      R$ {selectedSale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => { onEditSale(selectedSale); setSelectedSale(null); }}
                    className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                  >
                    <Edit size={18} />
                    Editar
                  </button>
                  <button 
                    onClick={() => { setShowDeleteConfirm(selectedSale.id); setSelectedSale(null); }}
                    className="flex items-center justify-center gap-2 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-sm hover:bg-rose-100 transition-all border border-rose-100"
                  >
                    <Trash2 size={18} />
                    Excluir
                  </button>
                </div>
                <button 
                  onClick={() => setSelectedSale(null)}
                  className="w-full py-3 bg-white text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all border border-slate-200"
                >
                  Fechar Detalhes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Excluir Venda?</h3>
              <p className="text-slate-500 text-sm mb-6">Esta ação não pode ser desfeita. O registro será removido permanentemente.</p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => { onDeleteSale(showDeleteConfirm); setShowDeleteConfirm(null); }}
                  className="py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Cancelamento */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6"
            >
              <div className="flex items-center gap-4 text-rose-600 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Cancelar Venda</h3>
                  <p className="text-sm text-slate-500">Esta ação não pode ser desfeita.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo do Cancelamento</label>
                  <textarea 
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Ex: Cliente desistiu da compra, erro no valor..."
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-rose-500 outline-none min-h-[100px] resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => { setShowCancelModal(null); setCancelReason(''); }}
                    className="flex-1 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Voltar
                  </button>
                  <button 
                    onClick={handleCancelSale}
                    disabled={!cancelReason}
                    className="flex-1 px-6 py-3 rounded-2xl font-black uppercase tracking-widest bg-rose-600 text-white shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Reembolso */}
      <AnimatePresence>
        {showRefundModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6"
            >
              <div className="flex items-center gap-4 text-amber-600 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <RefreshCw size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Reembolsar Venda</h3>
                  <p className="text-sm text-slate-500">Marcar esta venda como reembolsada.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Valor a ser reembolsado</p>
                <p className="text-xl font-black text-slate-900">R$ {showRefundModal.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRefundModal(null)}
                  className="flex-1 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleRefundSale}
                  className="flex-1 px-6 py-3 rounded-2xl font-black uppercase tracking-widest bg-amber-600 text-white shadow-lg shadow-amber-100 hover:bg-amber-700 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user exists in Firestore, if not create profile
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!userDoc.exists()) {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'user'
          });
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showNotification("Login realizado com sucesso!");
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        showNotification("Erro de Autenticação: O domínio atual não está autorizado no Console do Firebase.", "error");
      } else if (error.code === 'auth/popup-blocked') {
        showNotification("Erro de Autenticação: O pop-up de login foi bloqueado pelo seu navegador.", "error");
      } else {
        showNotification("Erro ao entrar com Google: " + (error.message || "Erro desconhecido"), "error");
      }
    }
  };

  const handleLogout = async () => {
    try {
      if (user?.isLocal) {
        setUser(null);
        return;
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername === 'admin' && adminPassword === 'admin') {
      const adminUser = {
        uid: 'admin-local',
        email: 'admin@biobel.com',
        displayName: 'Administrador Local',
        photoURL: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
        role: 'admin',
        isLocal: true
      };
      setUser(adminUser);
      setAdminUsername('');
      setAdminPassword('');
      showNotification("Login administrativo realizado!");
    } else {
      showNotification('Usuário ou senha incorretos.', 'error');
    }
  };

  const [view, setView] = useState<View>('atendimento');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  // --- Persistent State ---
  const [salespersons, setSalespersons] = useLocalStorage<Salesperson[]>('biobel_salespersons', [
    { id: '1', name: 'Alessandra', isActive: true, status: 'active', commissionRate: 3 },
    { id: '2', name: 'Letícia', isActive: true, status: 'active', commissionRate: 3 },
    { id: '3', name: 'Estagiária', isActive: true, status: 'training', commissionRate: 1 },
  ]);

  const [sales, setSales] = useLocalStorage<Sale[]>('biobel_sales', []);
  const [customers, setCustomers] = useLocalStorage<Customer[]>('biobel_customers', []);
  const [companyName, setCompanyName] = useLocalStorage<string>('biobel_company_name', 'Biobel');
  const [companyLogo, setCompanyLogo] = useLocalStorage<string>('biobel_company_logo', '');
  const [companyPhone, setCompanyPhone] = useLocalStorage<string>('biobel_company_phone', '');
  const [companyEmail, setCompanyEmail] = useLocalStorage<string>('biobel_company_email', '');
  const [companyAddress, setCompanyAddress] = useLocalStorage<string>('biobel_company_address', '');
  const [companyWebsite, setCompanyWebsite] = useLocalStorage<string>('biobel_company_website', '');

  const [campaigns, setCampaigns] = useLocalStorage<Campaign[]>('biobel_campaigns', [
    { id: '1', name: 'Boas-vindas', message: 'Olá {cliente}! Seja bem-vindo(a) à {empresa}. Temos um presente especial para sua primeira compra: use o cupom BEMVINDO10.', type: 'new_customer' },
    { id: '2', name: 'Saudades', message: 'Olá {cliente}! Faz tempo que não nos vemos na {empresa}. Preparamos uma oferta exclusiva para você voltar: 20% de desconto em qualquer item!', type: 'inactive_30d' }
  ]);

  const downloadPDFReceipt = (sale: Sale) => {
    const doc = new jsPDF();
    const customer = customers.find(c => c.id === sale.customerId);
    
    // Header
    if (companyLogo) {
      try {
        // Simple check if logo is a base64 or a valid URL
        doc.addImage(companyLogo, 'PNG', 10, 10, 30, 30);
      } catch (e) {
        console.error("Error adding logo to PDF", e);
      }
    }
    
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text(companyName, 50, 20);
    
    doc.setFontSize(8);
    doc.setTextColor(120);
    let headerY = 26;
    if (companyAddress) {
      doc.text(companyAddress, 50, headerY);
      headerY += 4;
    }
    if (companyPhone || companyEmail) {
      doc.text(`${companyPhone}${companyPhone && companyEmail ? ' | ' : ''}${companyEmail}`, 50, headerY);
      headerY += 4;
    }
    if (companyWebsite) {
      doc.text(companyWebsite, 50, headerY);
    }
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Recibo de Venda #${sale.id.split('-')[1] || sale.id}`, 50, 40);
    doc.text(`Data: ${sale.date}`, 50, 45);
    
    doc.line(10, 50, 200, 50);
    
    // Customer Info
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('Dados do Cliente', 10, 60);
    doc.setFontSize(10);
    doc.text(`Nome: ${customer?.name || 'Cliente'}`, 10, 67);
    if (customer?.phone) doc.text(`Telefone: ${customer.phone}`, 10, 73);
    
    // Salesperson Info
    doc.text(`Vendedora: ${sale.salesperson}`, 140, 67);
    doc.text(`Tipo: ${sale.type}`, 140, 73);
    
    // Items Table
    const tableData = sale.items.map(item => [
      item.product.name,
      item.qty.toString(),
      `R$ ${(item.priceOverride ?? item.product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${(item.qty * (item.priceOverride ?? item.product.price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);
    
    autoTable(doc, {
      startY: 80,
      head: [['Produto', 'Qtd', 'Preço Unit.', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { top: 80 }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    // Totals
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(`Subtotal: R$ ${(sale.total + (sale.discount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 140, finalY + 15);
    if (sale.discount) {
      doc.setTextColor(220, 38, 38);
      doc.text(`Desconto: R$ ${sale.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 140, finalY + 22);
    }
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text(`Total: R$ ${sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 140, finalY + 32);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Forma de Pagamento: ${
      sale.paymentMethod === 'pix' ? 'PIX' : 
      sale.paymentMethod === 'credit_card' ? 'Cartão de Crédito' : 
      sale.paymentMethod === 'debit_card' ? 'Cartão de Débito' : 
      sale.paymentMethod === 'installments' ? `Parcelado (${sale.installments}x)` : 
      sale.paymentMethod === 'link' ? 'Link de Pagamento' : 'Dinheiro'
    }`, 10, finalY + 32);
    
    doc.save(`recibo-${sale.id}.pdf`);
  };

  // Limpeza automática, normalização e unificação de vendedoras
  useEffect(() => {
    let changed = false;
    
    // 1. Normalizar nomes nas vendedoras e remover duplicatas/numéricos/acentos
    const seen = new Set<string>();
    const uniqueSalespersons: Salesperson[] = [];
    
    salespersons.forEach(curr => {
      const normalized = normalizeName(curr.name);
      const key = getComparisonKey(normalized);
      const isNumeric = !isNaN(Number(normalized)) && normalized !== '';
      
      if (!seen.has(key) && normalized !== '' && !isNumeric) {
        seen.add(key);
        if (curr.name !== normalized) changed = true;
        uniqueSalespersons.push({ ...curr, name: normalized });
      } else {
        changed = true;
      }
    });

    // 2. Normalizar nomes nas vendas para garantir que o ranking funcione corretamente
    const updatedSales = sales.map(s => {
      const normalized = normalizeName(s.salesperson);
      const key = getComparisonKey(normalized);
      
      // Encontra a vendedora correspondente na lista única para usar o nome "bonito" (com acento se houver)
      const canonical = uniqueSalespersons.find(sp => getComparisonKey(sp.name) === key);
      const finalName = canonical ? canonical.name : normalized;

      if (s.salesperson !== finalName) {
        changed = true;
        return { ...s, salesperson: finalName };
      }
      return s;
    });

    if (changed) {
      setSalespersons(uniqueSalespersons);
      setSales(updatedSales);
    }
  }, [salespersons, sales]);

  const [brands, setBrands] = useLocalStorage<Brand[]>('biobel_brands', [
    { id: '1', name: 'Truss' },
    { id: '2', name: 'Wella' },
    { id: '3', name: 'Schwarzkopf' },
    { id: '4', name: 'Eudora' },
    { id: '5', name: 'Vizzela' },
    { id: '6', name: 'Melu' },
    { id: '7', name: 'Nina Secrets' },
    { id: '8', name: 'Farm' },
    { id: '9', name: 'Animale' },
    { id: '10', name: 'Zara' },
    { id: '11', name: 'Natura' },
    { id: '12', name: 'Plattelli' },
  ]);

  const [products, setProducts] = useLocalStorage<Product[]>('biobel_products', MOCK_PRODUCTS);
  const [categories, setCategories] = useLocalStorage<string[]>('biobel_categories', MOCK_CATEGORIES);
  const [routines, setRoutines] = useLocalStorage<RoutineSection[]>('biobel_routines', DEFAULT_ROUTINES);

  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('biobel_transactions', [
    { id: '1', type: 'in', description: 'Abertura de Caixa', amount: 200.00, time: '08:00', date: new Date().toLocaleDateString('pt-BR') },
  ]);

  const [fixedCosts, setFixedCosts] = useLocalStorage<FixedCost[]>('biobel_fixed_costs', [
    { id: '1', description: 'Aluguel', amount: 2500, dueDate: '10', isPaid: true },
    { id: '2', description: 'Energia', amount: 450, dueDate: '15', isPaid: false },
    { id: '3', description: 'Internet', amount: 120, dueDate: '05', isPaid: true },
  ]);

  const [monthlyGoal, setMonthlyGoal] = useLocalStorage<MonthlyGoal>('biobel_monthly_goal', {
    month: '2026-03',
    targetAmount: 50000,
    workingDays: 22,
    saturdayCount: 4,
    holidays: [],
    blockedDays: [],
    workHours: { weekday: 8, saturday: 4 },
    mode: 'simple'
  });

  const [darkMode, setDarkMode] = useLocalStorage<boolean>('biobel_dark_mode', false);
  const [themeColor, setThemeColor] = useLocalStorage<string>('biobel_theme_color', '#2563eb'); // Default blue-600

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleFinalizeSale = (sale: Sale) => {
    if (editingSale) {
      // If editing, we should ideally revert old stock and apply new stock
      // For now, let's at least update the sale
      setSales(prev => prev.map(s => s.id === editingSale.id ? sale : s));
      setEditingSale(null);
    } else {
      setSales(prev => [...prev, sale]);
    }
    
    // Deduct stock for new sales or update stock for edited sales
    // To be safe, we always update stock based on the items in the sale
    // In a real app, we'd only deduct the difference if editing
    if (!editingSale) {
      setProducts(prev => prev.map(p => {
        const soldItem = sale.items.find(item => item.product.id === p.id);
        if (soldItem) {
          return { ...p, stock: Math.max(0, p.stock - soldItem.qty) };
        }
        return p;
      }));
    }
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setView('atendimento');
  };

  const handleDeleteSale = (id: string) => {
    setSales(prev => prev.filter(s => s.id !== id));
  };

  const handleAddProduct = (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
    };
    setProducts(prev => [...prev, newProduct]);
  };

  const handleAddBrand = (name: string) => {
    const newBrand: Brand = {
      id: Date.now().toString(),
      name
    };
    setBrands(prev => [...prev, newBrand]);
  };

  const handleUpdateBrand = (id: string, name: string) => {
    setBrands(prev => prev.map(b => b.id === id ? { ...b, name } : b));
  };

  const handleDeleteBrand = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta marca?')) {
      setBrands(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleUpdateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleAddCategory = (name: string) => {
    if (!categories.includes(name)) {
      setCategories(prev => [...prev, name]);
    }
  };

  const handleUpdateCategory = (oldName: string, newName: string) => {
    setCategories(prev => prev.map(c => c === oldName ? newName : c));
    setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: newName } : p));
  };

  const handleDeleteCategory = (name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) {
      setCategories(prev => prev.filter(c => c !== name));
      // Optionally reassign products to "Outros"
      setProducts(prev => prev.map(p => p.category === name ? { ...p, category: 'Outros' } : p));
    }
  };

  const [cashStatus, setCashStatus] = useLocalStorage<{ isOpen: boolean, openingBalance: number, openedAt: string | null }>('biobel_cash_status', {
    isOpen: false,
    openingBalance: 0,
    openedAt: null
  });

  const handleOpenCash = (amount: number) => {
    const today = new Date().toLocaleDateString('pt-BR');
    setCashStatus({
      isOpen: true,
      openingBalance: amount,
      openedAt: today
    });
    handleAddTransaction({
      type: 'in',
      description: 'Abertura de Caixa',
      amount: amount
    });
    showNotification(`Caixa aberto com R$ ${amount.toLocaleString('pt-BR')}`, 'success');
  };

  const handleCloseCash = () => {
    if (window.confirm('Deseja realmente fechar o caixa de hoje?')) {
      setCashStatus(prev => ({ ...prev, isOpen: false }));
      showNotification('Caixa fechado com sucesso', 'info');
    }
  };

  const handleAddTransaction = (t: Omit<Transaction, 'id' | 'time' | 'date'>) => {
    const now = new Date();
    const newT: Transaction = {
      ...t,
      id: Date.now().toString(),
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      date: now.toLocaleDateString('pt-BR')
    };
    setTransactions(prev => [...prev, newT]);
  };

  const handleUpdateTransaction = (id: string, amount: number) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, amount: t.type === 'out' ? -Math.abs(amount) : Math.abs(amount) } : t));
  };

  const handleAddFixedCost = (c: Omit<FixedCost, 'id' | 'isPaid'>) => {
    const newC: FixedCost = {
      ...c,
      id: Date.now().toString(),
      isPaid: false
    };
    setFixedCosts(prev => [...prev, newC]);
  };

  const handleUpdateFixedCost = (id: string, updates: Partial<FixedCost>) => {
    setFixedCosts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleToggleFixedCost = (id: string) => {
    setFixedCosts(prev => prev.map(c => c.id === id ? { ...c, isPaid: !c.isPaid } : c));
  };

  const handleDeleteFixedCost = (id: string) => {
    setFixedCosts(prev => prev.filter(c => c.id !== id));
  };

  const handleAddCustomer = (c: Omit<Customer, 'id' | 'createdAt'>) => {
    const newC: Customer = {
      ...c,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setCustomers(prev => [...prev, newC]);
    return newC;
  };

  const handleUpdateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleDeleteCustomer = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente? O histórico de compras não será apagado, mas o vínculo será perdido.')) {
      setCustomers(prev => prev.filter(c => c.id !== id));
    }
  };

  const today = new Date().toLocaleDateString('pt-BR');
  const todaySales = sales.filter(s => s.date === today);
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.total, 0);

  // Monthly stats for POS
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlySales = sales.filter(s => {
    const saleDate = parseSaleDate(s);
    return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
  });
  const totalMonthlySold = monthlySales.reduce((acc, s) => acc + s.total, 0);

  // Weekly stats for POS
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  startOfWeek.setHours(0, 0, 0, 0);
  const weeklySales = sales.filter(s => {
    const saleDate = parseSaleDate(s);
    return saleDate >= startOfWeek;
  });
  const totalWeeklySold = weeklySales.reduce((acc, s) => acc + s.total, 0);
  
  const autoSaturdays = getMonthStats(monthlyGoal.month).saturdays;
  const monthSaturdays = monthlyGoal.saturdayCount ?? autoSaturdays;
  const totalSaturdayTarget = (monthlyGoal.saturdayTarget || 0) * monthSaturdays;
  const remainingTarget = monthlyGoal.targetAmount - totalSaturdayTarget;
  const weekdayDailyGoal = remainingTarget / (monthlyGoal.workingDays || 1);
  
  const isTodaySaturday = new Date().getDay() === 6;
  const dailyGoal = isTodaySaturday && monthlyGoal.saturdayTarget 
    ? monthlyGoal.saturdayTarget 
    : weekdayDailyGoal;
  
  const salesByPerson = salespersons.reduce((acc, person) => {
    const personSales = todaySales.filter(s => s.salesperson === person.name);
    const total = personSales.reduce((sum, s) => sum + s.total, 0);
    const count = personSales.length;
    acc[person.name] = {
      total,
      count,
      avg: count > 0 ? total / count : 0
    };
    return acc;
  }, {} as Record<string, { total: number, count: number, avg: number }>);

  const totalSalesCount = sales.length;
  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
  const goalProgress = (totalMonthlySold / monthlyGoal.targetAmount) * 100;
  
  const salespersonTotals = sales.reduce((acc, s) => {
    acc[s.salesperson] = (acc[s.salesperson] || 0) + s.total;
    return acc;
  }, {} as Record<string, number>);
  
  const bestSalesperson = Object.entries(salespersonTotals).sort((a, b) => b[1] - a[1])[0];

  // Automated Alerts
  useEffect(() => {
    const lastAlertGoal = localStorage.getItem('biobel_last_alert_goal');
    const currentGoalMilestone = goalProgress >= 100 ? '100' : goalProgress >= 90 ? '90' : goalProgress >= 50 ? '50' : '0';
    
    if (currentGoalMilestone !== '0' && lastAlertGoal !== currentGoalMilestone) {
      if (currentGoalMilestone === '100') {
        showNotification('🎉 PARABÉNS! A meta mensal foi batida!', 'success');
      } else if (currentGoalMilestone === '90') {
        showNotification('🚀 Quase lá! 90% da meta alcançada!', 'info');
      } else if (currentGoalMilestone === '50') {
        showNotification('📈 Metade da meta batida! Continue assim!', 'info');
      }
      localStorage.setItem('biobel_last_alert_goal', currentGoalMilestone);
    }
  }, [goalProgress]);

  // Automatic Weekly Backup (Simulated/Notification)
  useEffect(() => {
    const lastBackup = localStorage.getItem('biobel_last_backup');
    const now = new Date();
    if (!lastBackup || (now.getTime() - new Date(lastBackup).getTime() > 7 * 24 * 60 * 60 * 1000)) {
      showNotification('📅 Lembrete: Realize um backup semanal dos seus dados na aba Backup.', 'info');
      localStorage.setItem('biobel_last_backup', now.toISOString());
    }
  }, []);

  const IntelligentSummary = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <TrendingUp size={20} />
          </div>
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
            +{((todaySalesTotal / (totalMonthlySold || 1)) * 100).toFixed(1)}% hoje
          </span>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Progresso da Meta</p>
          <h3 className="text-2xl font-black tracking-tight dark:text-white">{goalProgress.toFixed(1)}%</h3>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(goalProgress, 100)}%` }}
              className="h-full bg-blue-600 rounded-full"
            />
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Trophy size={20} />
          </div>
          <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg">
            Top Vendas
          </span>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Melhor Vendedora</p>
          <h3 className="text-xl font-black tracking-tight dark:text-white truncate">{bestSalesperson ? bestSalesperson[0] : 'Nenhuma'}</h3>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            R$ {bestSalesperson ? bestSalesperson[1].toLocaleString('pt-BR') : '0,00'} acumulado
          </p>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Zap size={20} />
          </div>
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
            Ticket Médio
          </span>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Valor Médio por Venda</p>
          <h3 className="text-2xl font-black tracking-tight dark:text-white">R$ {averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            Total de {totalSalesCount} vendas
          </p>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Calendar size={20} />
          </div>
          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg">
            Status Mensal
          </span>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Faltam para a Meta</p>
          <h3 className="text-2xl font-black tracking-tight dark:text-white">
            R$ {Math.max(0, monthlyGoal.targetAmount - totalMonthlySold).toLocaleString('pt-BR')}
          </h3>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            {monthlyGoal.workingDays} dias úteis restantes
          </p>
        </div>
      </motion.div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Carregando Biobel...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl shadow-blue-100 dark:shadow-none p-8 text-center border border-slate-100 dark:border-slate-800"
        >
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-200 dark:shadow-none mx-auto mb-8">
            <Store className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2 uppercase">VendaPronta Admin</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mb-10 uppercase tracking-widest text-xs">Gestão Inteligente para sua Loja</p>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-900 py-4 rounded-2xl transition-all group shadow-sm mb-6"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            <span className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest text-sm">Entrar com Google</span>
          </button>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-4 text-slate-400 font-bold tracking-widest">Ou use acesso local</span>
            </div>
          </div>

          {!showAdminLogin ? (
            <button 
              onClick={() => setShowAdminLogin(true)}
              className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline"
            >
              Entrar com Usuário e Senha
            </button>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Usuário</label>
                <input 
                  type="text" 
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 outline-none transition-all font-bold text-sm"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Senha</label>
                <input 
                  type="password" 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 outline-none transition-all font-bold text-sm"
                  placeholder="••••••"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className="flex-1 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Voltar
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-3 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none"
                >
                  Entrar
                </button>
              </div>
            </form>
          )}
          
          <p className="mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            Ao entrar, você concorda com nossos termos de uso e política de privacidade.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300"
      style={{ '--primary-color': themeColor } as React.CSSProperties}
    >
      <Sidebar 
        currentView={view} 
        setView={setView} 
        onLogout={handleLogout} 
        companyName={companyName}
        companyLogo={companyLogo}
      />
      
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-h-screen custom-scrollbar pb-24 lg:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={cn("mx-auto h-full", view === 'atendimento' ? "w-full" : "max-w-7xl")}
          >
            {view === 'atendimento' && (
              <NewSale 
                salespersons={salespersons} 
                products={products}
                sales={sales}
                customers={customers}
                onFinalizeSale={handleFinalizeSale}
                onQuickAddCustomer={handleAddCustomer}
                editingSale={editingSale}
                onCancelEdit={() => setEditingSale(null)}
                todaySalesTotal={todaySalesTotal}
                weeklySalesTotal={totalWeeklySold}
                monthlySalesTotal={totalMonthlySold}
                monthlyGoal={monthlyGoal}
                dailyGoal={dailyGoal}
                salesByPerson={salesByPerson}
                companyName={companyName}
                companyLogo={companyLogo}
                onDownloadPDF={downloadPDFReceipt}
                showNotification={showNotification}
              />
            )}
            {view === 'performance' && (
              <PerformanceView 
                salespersons={salespersons}
                sales={sales}
                monthlyGoal={monthlyGoal}
              />
            )}
            {view === 'dashboard' && (
              <div className="space-y-8">
                <IntelligentSummary />
                <Dashboard salespersons={salespersons} sales={sales} monthlyGoal={monthlyGoal} products={products} customers={customers} />
              </div>
            )}
            {view === 'customers' && (
              <CustomersView 
                customers={customers}
                sales={sales}
                onAddCustomer={handleAddCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                campaigns={campaigns}
                companyName={companyName}
              />
            )}
            {view === 'products' && (
              <Products 
                products={products}
                brands={brands}
                categories={categories}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onAddCategory={handleAddCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            )}
            {view === 'brands' && (
              <Brands 
                brands={brands}
                onAddBrand={handleAddBrand}
                onUpdateBrand={handleUpdateBrand}
                onDeleteBrand={handleDeleteBrand}
              />
            )}
            {view === 'sales' && (
              <SalesHistory 
                sales={sales} 
                onEditSale={handleEditSale}
                onDeleteSale={handleDeleteSale}
                onUpdateSale={(sale) => setSales(prev => prev.map(s => s.id === sale.id ? sale : s))}
                onDownloadPDF={downloadPDFReceipt}
                showNotification={showNotification}
              />
            )}
            {view === 'cash' && (
              <CashControl 
                transactions={transactions} 
                sales={sales} 
                onAddTransaction={handleAddTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                cashStatus={cashStatus}
                onOpenCash={handleOpenCash}
                onCloseCash={handleCloseCash}
              />
            )}
            {view === 'fixed-costs' && (
              <FixedCosts 
                costs={fixedCosts}
                onAddCost={handleAddFixedCost}
                onUpdateCost={handleUpdateFixedCost}
                onTogglePaid={handleToggleFixedCost}
                onDeleteCost={handleDeleteFixedCost}
              />
            )}
            {view === 'campaigns' && (
              <CampaignView 
                campaigns={campaigns}
                setCampaigns={setCampaigns}
                companyName={companyName}
              />
            )}
            {view === 'routine' && <RoutineView routines={routines} setRoutines={setRoutines} />}
            {view === 'backup' && (
              <BackupView 
                sales={sales} setSales={setSales}
                products={products} setProducts={setProducts}
                brands={brands} setBrands={setBrands}
                salespersons={salespersons} setSalespersons={setSalespersons}
                monthlyGoal={monthlyGoal} setMonthlyGoal={setMonthlyGoal}
                transactions={transactions} setTransactions={setTransactions}
                fixedCosts={fixedCosts} setFixedCosts={setFixedCosts}
                customers={customers} setCustomers={setCustomers}
                categories={categories} setCategories={setCategories}
                showNotification={showNotification}
              />
            )}
            {view === 'goals' && (
              <GoalsView 
                monthlyGoal={monthlyGoal}
                setMonthlyGoal={setMonthlyGoal}
                companyName={companyName}
                salespersons={salespersons}
                setSalespersons={setSalespersons}
              />
            )}
            {view === 'settings' && (
              <SettingsView 
                salespersons={salespersons} 
                setSalespersons={setSalespersons}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                themeColor={themeColor}
                setThemeColor={setThemeColor}
                companyName={companyName}
                setCompanyName={setCompanyName}
                companyLogo={companyLogo}
                setCompanyLogo={setCompanyLogo}
                companyPhone={companyPhone}
                setCompanyPhone={setCompanyPhone}
                companyEmail={companyEmail}
                setCompanyEmail={setCompanyEmail}
                companyAddress={companyAddress}
                setCompanyAddress={setCompanyAddress}
                companyWebsite={companyWebsite}
                setCompanyWebsite={setCompanyWebsite}
                showNotification={showNotification}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav currentView={view} setView={setView} />

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
          >
            <div className={cn(
              "p-4 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md",
              notification.type === 'success' ? "bg-emerald-500/90 border-emerald-400 text-white" :
              notification.type === 'error' ? "bg-rose-500/90 border-rose-400 text-white" :
              "bg-blue-500/90 border-blue-400 text-white"
            )}>
              {notification.type === 'success' ? <CheckCircle2 size={20} /> :
               notification.type === 'error' ? <AlertCircle size={20} /> :
               <Info size={20} />}
              <p className="font-bold text-sm">{notification.message}</p>
              <button 
                onClick={() => setNotification(null)}
                className="ml-auto p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
