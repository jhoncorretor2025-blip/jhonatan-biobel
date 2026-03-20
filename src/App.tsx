import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  LogOut, 
  Search, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  User, 
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
  Store,
  ReceiptText,
  CheckCircle2,
  Target,
  Download,
  Database,
  ArrowUpDown,
  Calendar,
  Sparkles,
  Beaker,
  Edit,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type View = 'atendimento' | 'dashboard' | 'products' | 'brands' | 'sales' | 'cash' | 'fixed-costs' | 'settings';

interface Salesperson {
  id: string;
  name: string;
  isActive: boolean;
}

interface MonthlyGoal {
  month: string;
  targetAmount: number;
  workingDays: number;
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
  date: string;
  salesperson: string;
  items: { product: Product, qty: number }[];
  total: number;
  paymentMethod: 'pix' | 'credit_card' | 'debit_card' | 'cash';
  shift: 'Manhã' | 'Tarde';
  type: 'Presencial' | 'Online';
}

// --- Mock Data ---
const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Shampoo Truss Equilibrium', brand: 'Truss', price: 129.90, category: 'Cabelo', stock: 25, image: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&q=80&w=400' },
  { id: '2', name: 'Base Melu Matte', brand: 'Melu', price: 39.90, category: 'Maquiagem', stock: 50, image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=400' },
  { id: '3', name: 'Batom Nina Secrets', brand: 'Nina Secrets', price: 45.00, category: 'Maquiagem', stock: 30, image: 'https://images.unsplash.com/photo-1586776977607-310e9c725c37?auto=format&fit=crop&q=80&w=400' },
  { id: '4', name: 'Máscara Wella Invigo', brand: 'Wella', price: 159.90, category: 'Cabelo', stock: 15, image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=400' },
  { id: '5', name: 'Corretivo Vizzela', brand: 'Vizzela', price: 35.90, category: 'Maquiagem', stock: 40, image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=400' },
  { id: '6', name: 'Shampoo e condicionador uso obrigatório', brand: 'Truss', price: 189.90, category: 'Cabelo', stock: 20, image: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&q=80&w=400' },
  { id: '7', name: 'Amino 210', brand: 'Truss', price: 200.00, category: 'Cabelo', stock: 15, image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=400' },
  { id: '8', name: 'Óleo Nutri Infusion', brand: 'Truss', price: 75.00, category: 'Cabelo', stock: 20, image: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&q=80&w=400' },
  { id: '9', name: 'Máscara Uso Obrigatório', brand: 'Truss', price: 159.99, category: 'Cabelo', stock: 15, image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=400' },
  { id: '10', name: 'Impassable', brand: 'Truss', price: 159.99, category: 'Cabelo', stock: 10, image: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&q=80&w=400' },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'in', description: 'Reforço de Caixa', amount: 200.00, time: 'Hoje, 08:15' },
  { id: '2', type: 'sale', description: 'Venda PDV #4502', amount: 85.90, time: 'Hoje, 09:42', method: 'Dinheiro' },
  { id: '3', type: 'out', description: 'Sangria de Caixa', amount: -45.00, time: 'Hoje, 10:15' },
  { id: '4', type: 'sale', description: 'Venda PDV #4503', amount: 124.50, time: 'Hoje, 11:20', method: 'Dinheiro' },
];

// --- Components ---

const Sidebar = ({ currentView, setView }: { currentView: View, setView: (v: View) => void }) => {
  const sections = [
    {
      title: 'OPERAÇÃO / VENDAS',
      items: [
        { id: 'atendimento', label: 'Atendimento', icon: ShoppingCart },
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
        { id: 'fixed-costs', label: 'Custos Fixos', icon: ReceiptText },
      ]
    },
    {
      title: 'CONFIGURAÇÕES',
      items: [
        { id: 'settings', label: 'Configurações', icon: Settings },
      ]
    }
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex-col h-screen sticky top-0 hidden lg:flex">
      <div className="p-8 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Store className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-black text-slate-900 tracking-tight leading-none">BEAUTY</h1>
            <p className="text-[10px] font-bold text-blue-600 tracking-[0.2em] mt-1 uppercase">Manager Pro</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase px-4">{section.title}</p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as View)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200",
                    currentView === item.id 
                      ? "bg-blue-50 text-blue-600 shadow-sm" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon size={20} className={cn(currentView === item.id ? "text-blue-600" : "text-slate-400")} />
                  <span className="text-sm">{item.label}</span>
                  {currentView === item.id && (
                    <motion.div 
                      layoutId="active-nav"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-100">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-600 font-bold transition-colors">
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
    { id: 'sales', label: 'Histórico', icon: History },
    { id: 'cash', label: 'Caixa', icon: Wallet },
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'settings', label: 'Menu', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-around items-center z-50 pb-safe">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setView(item.id as View)}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all relative",
            currentView === item.id ? "text-blue-600" : "text-slate-400"
          )}
        >
          <item.icon size={24} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          {currentView === item.id && (
            <motion.div 
              layoutId="active-bottom-nav"
              className="absolute -top-2 w-8 h-1 bg-blue-600 rounded-full"
            />
          )}
        </button>
      ))}
    </nav>
  );
};

const Dashboard = ({ salespersons, sales, monthlyGoal }: { salespersons: Salesperson[], sales: Sale[], monthlyGoal: MonthlyGoal }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [range, setRange] = useState<'day' | '7days' | '30days'>('day');
  
  const activeSalespersons = salespersons.filter(s => s.isActive);
  
  const formattedSelectedDate = useMemo(() => {
    const [year, month, day] = selectedDate.split('-');
    return `${day}/${month}/${year}`;
  }, [selectedDate]);

  const filteredSales = useMemo(() => {
    if (range === 'day') {
      return sales.filter(s => s.date === formattedSelectedDate);
    }
    
    const [year, month, day] = selectedDate.split('-');
    const baseDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    baseDate.setHours(0, 0, 0, 0);

    const daysToSubtract = range === '7days' ? 7 : 30;
    const startDate = new Date(baseDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return sales.filter(s => {
      const [sDay, sMonth, sYear] = s.date.split('/');
      const saleDate = new Date(parseInt(sYear), parseInt(sMonth) - 1, parseInt(sDay));
      saleDate.setHours(0, 0, 0, 0);
      return saleDate >= startDate && saleDate <= baseDate;
    });
  }, [sales, formattedSelectedDate, range, selectedDate]);

  const totalSold = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const salesCount = filteredSales.length;
  const avgTicket = salesCount > 0 ? totalSold / salesCount : 0;

  // Monthly stats (always relative to the selected date's month)
  const [selYear, selMonth] = selectedDate.split('-').map(Number);
  const monthlySales = sales.filter(s => {
    const [day, month, year] = s.date.split('/');
    const saleDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return saleDate.getMonth() === (selMonth - 1) && saleDate.getFullYear() === selYear;
  });
  const totalMonthlySold = monthlySales.reduce((acc, s) => acc + s.total, 0);

  // Weekly stats (relative to selected date)
  const baseDateObj = new Date(selYear, selMonth - 1, parseInt(selectedDate.split('-')[2]));
  const startOfWeek = new Date(baseDateObj);
  startOfWeek.setDate(baseDateObj.getDate() - baseDateObj.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const weeklySales = sales.filter(s => {
    const [day, month, year] = s.date.split('/');
    const saleDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    saleDate.setHours(0, 0, 0, 0);
    return saleDate >= startOfWeek && saleDate <= baseDateObj;
  });
  const totalWeeklySold = weeklySales.reduce((acc, s) => acc + s.total, 0);

  // Goals calculations
  const daysInMonth = new Date(selYear, selMonth, 0).getDate();
  const currentDayOfMonth = parseInt(selectedDate.split('-')[2]);
  const expectedMonthlyProgress = (currentDayOfMonth / daysInMonth) * 100;
  
  const dailyGoal = monthlyGoal.targetAmount / (monthlyGoal.workingDays || 1);
  const weeklyGoal = monthlyGoal.targetAmount / 4; 
  const monthlyProgress = (totalMonthlySold / (monthlyGoal.targetAmount || 1)) * 100;
  const weeklyProgress = (totalWeeklySold / (weeklyGoal || 1)) * 100;
  const dailyProgress = (totalSold / (dailyGoal || 1)) * 100;

  const isMonthlyBelow = monthlyProgress < expectedMonthlyProgress * 0.9; 
  const isDailyBelow = dailyProgress < 100 && range === 'day' && new Date().toISOString().split('T')[0] === selectedDate && new Date().getHours() > 17;
  
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
  }, { pix: 0, credit_card: 0, debit_card: 0, cash: 0 });

  const totalPayment = (Object.values(paymentStats) as number[]).reduce((a: number, b: number) => a + b, 0) || 1;

  // Shifts for the selected range
  const shiftStats = filteredSales.reduce((acc: Record<string, number>, s) => {
    acc[s.shift] = (acc[s.shift] || 0) + 1;
    return acc;
  }, { 'Manhã': 0, 'Tarde': 0 });

  const totalShifts = (Object.values(shiftStats) as number[]).reduce((a: number, b: number) => a + b, 0) || 1;

  // Top Product and Brand for the selected range
  interface ProductStat { name: string; total: number; qty: number; }
  const productStats = filteredSales.reduce((acc: { products: Record<string, ProductStat>, brands: Record<string, number> }, sale) => {
    sale.items.forEach(item => {
      const productId = item.product.id;
      const productName = item.product.name;
      const brandName = item.product.brand;
      const amount = item.product.price * item.qty;
      
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

  // Best day of the week (All time)
  const dayOfWeekStats = sales.reduce((acc: Record<number, number>, sale) => {
    const [day, month, year] = sale.date.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dayIndex = date.getDay();
    acc[dayIndex] = (acc[dayIndex] || 0) + sale.total;
    return acc;
  }, {});

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const sortedDays = Object.entries(dayOfWeekStats)
    .map(([index, amount]) => ({ name: dayNames[parseInt(index)], amount }))
    .sort((a, b) => b.amount - a.amount);
    
  const bestDay = sortedDays[0]?.name || '-';

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-24 lg:pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-slate-50/90 backdrop-blur-md z-20 py-4 -mx-4 px-4 lg:static lg:bg-transparent lg:p-0 lg:m-0">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Resumo Geral</h2>
          <p className="text-xs lg:text-sm text-slate-500">Bem-vindo de volta! Aqui está o resumo das suas atividades.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <Calendar size={16} className="text-slate-400" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs lg:text-sm font-bold text-slate-700 outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setRange('day')}
              className={cn(
                "px-3 py-1.5 lg:px-4 lg:py-2 text-[10px] lg:text-sm font-bold rounded-lg transition-all",
                range === 'day' ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              Dia
            </button>
            <button 
              onClick={() => setRange('7days')}
              className={cn(
                "px-3 py-1.5 lg:px-4 lg:py-2 text-[10px] lg:text-sm font-bold rounded-lg transition-all",
                range === '7days' ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              7 dias
            </button>
            <button 
              onClick={() => setRange('30days')}
              className={cn(
                "px-3 py-1.5 lg:px-4 lg:py-2 text-[10px] lg:text-sm font-bold rounded-lg transition-all",
                range === '30days' ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              30 dias
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {[
          { label: 'Meta Diária', current: totalSold, target: dailyGoal, progress: dailyProgress, isBelow: isDailyBelow },
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
              <h3 className="font-bold text-slate-900 text-sm lg:text-base">{goal.label}</h3>
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
                {goal.isBelow && (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    <TrendingDown size={10} /> Atenção!
                  </span>
                )}
                {goal.progress >= 100 && (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={10} /> Meta batida!
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        {[
          { label: 'Total Vendido', value: `R$ ${totalSold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, trend: null, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Vendas', value: salesCount.toString(), trend: null, icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Melhor Vendedora', value: bestPerson, trend: null, icon: User, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Ticket Médio', value: `R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, trend: null, icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3 lg:mb-4">
              <div className={cn("p-2 lg:p-2.5 rounded-xl", kpi.bg, kpi.color)}>
                <kpi.icon size={20} className="lg:w-6 lg:h-6" />
              </div>
            </div>
            <p className="text-slate-500 text-[10px] lg:text-sm font-bold uppercase tracking-widest mb-1">{kpi.label}</p>
            <h3 className="text-base lg:text-2xl font-black text-slate-900 truncate" title={kpi.value}>{kpi.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        {[
          { label: 'Produto +Vendido', value: topProduct.name, icon: Package, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Marca +Vendida', value: topBrand[0], icon: Target, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Melhor Dia', value: bestDay, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((kpi, i) => (
          <div key={i} className={cn("bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow", i === 2 && "col-span-2 lg:col-span-1")}>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <h3 className="font-bold text-base lg:text-lg text-slate-900">Últimos 7 Dias</h3>
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
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendas</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bruto</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedHistory.map(([date, data], i) => (
                    <tr key={i} className={cn("hover:bg-slate-50 transition-colors", date === formattedSelectedDate && "bg-blue-50/30")}>
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
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {date} {date === formattedSelectedDate && <span className="ml-1 text-[8px] bg-blue-600 text-white px-1 py-0.5 rounded uppercase">Selecionado</span>}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{data.count} vendas · R$ {(data.count > 0 ? data.total / data.count : 0).toLocaleString('pt-BR')} ticket</p>
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
          <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-base lg:text-lg text-slate-900 mb-6">Meio de Pagamento</h3>
            <div className="space-y-5 lg:space-y-6">
              {[
                { label: 'PIX', value: Math.round(((paymentStats.pix || 0) / totalPayment) * 100), amount: `R$ ${(paymentStats.pix || 0).toLocaleString('pt-BR')}`, color: 'bg-blue-600' },
                { label: 'C. Crédito', value: Math.round(((paymentStats.credit_card || 0) / totalPayment) * 100), amount: `R$ ${(paymentStats.credit_card || 0).toLocaleString('pt-BR')}`, color: 'bg-indigo-600' },
                { label: 'C. Débito', value: Math.round(((paymentStats.debit_card || 0) / totalPayment) * 100), amount: `R$ ${(paymentStats.debit_card || 0).toLocaleString('pt-BR')}`, color: 'bg-violet-500' },
                { label: 'Dinheiro', value: Math.round(((paymentStats.cash || 0) / totalPayment) * 100), amount: `R$ ${(paymentStats.cash || 0).toLocaleString('pt-BR')}`, color: 'bg-emerald-500' },
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

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Ranking de Vendedores</h3>
            </div>
            <div className="p-5 lg:p-6 space-y-6 lg:space-y-8">
              {activeSalespersons.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Nenhuma vendedora ativa.</p>
              ) : (
                activeSalespersons
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
                            <span className="text-[10px] font-bold text-slate-400">
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
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-[0.2em]">Ver ranking completo</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CATEGORY_IMAGES: Record<string, string> = {
  'Maquiagem': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=400',
  'Cremes': 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=400',
  'Perfumes': 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=400',
  'Cabelo': 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&q=80&w=400',
  'Skincare': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=400',
  'Avulso': 'https://images.unsplash.com/photo-1584949091598-c31daaaa4aa9?auto=format&fit=crop&q=80&w=400'
};

const Products = ({ 
  products, 
  brands,
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct 
}: { 
  products: Product[], 
  brands: Brand[],
  onAddProduct: (p: Omit<Product, 'id'>) => void,
  onUpdateProduct: (id: string, p: Partial<Product>) => void,
  onDeleteProduct: (id: string) => void
}) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !brand || !price || !category || !stock) return;

    const productData = {
      name,
      brand,
      price: parseFloat(price),
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
    setCategory('');
    setStock('');
    setImage('');
    setShowForm(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20 lg:pb-0">
      <header className="flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md z-10 py-4 -mx-4 px-4 lg:static lg:bg-transparent lg:p-0 lg:m-0">
        <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Produtos</h2>
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
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                  <select 
                    className="w-full px-5 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all text-lg font-medium outline-none appearance-none"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    <option value="Maquiagem">Maquiagem</option>
                    <option value="Cremes">Cremes</option>
                    <option value="Perfumes">Perfumes</option>
                    <option value="Cabelo">Cabelo</option>
                    <option value="Skincare">Skincare</option>
                  </select>
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
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-slate-900 truncate">{product.name}</h4>
                  <span className="text-sm font-black text-blue-600 whitespace-nowrap ml-2">R$ {product.price.toFixed(2)}</span>
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
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(product)} className="p-2 text-slate-400 active:text-blue-600"><Settings size={18} /></button>
                    <button onClick={() => onDeleteProduct(product.id)} className="p-2 text-slate-400 active:text-rose-600"><Trash2 size={18} /></button>
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
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{product.brand}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">R$ {product.price.toFixed(2)}</td>
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
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Settings size={18} />
                      </button>
                      <button 
                        onClick={() => onDeleteProduct(product.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
        <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Marcas</h2>
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
  onUpdateTransaction
}: { 
  transactions: Transaction[], 
  sales: Sale[],
  onAddTransaction: (t: Omit<Transaction, 'id' | 'time'>) => void,
  onUpdateTransaction: (id: string, amount: number) => void
}) => {
  const [showModal, setShowModal] = useState<'in' | 'out' | 'edit' | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const cashSales = sales.filter(s => s.paymentMethod === 'cash');
  const totalCashSales = cashSales.reduce((acc, s) => acc + s.total, 0);
  
  const inTransactions = transactions.filter(t => t.type === 'in');
  const outTransactions = transactions.filter(t => t.type === 'out');
  
  const totalIn = inTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalOut = outTransactions.reduce((acc, t) => acc + t.amount, 0);
  
  const totalInCash = totalIn + totalCashSales;
  const currentBalance = totalInCash + totalOut;

  const cardPixSales = sales.filter(s => s.paymentMethod !== 'cash');
  const totalCardPix = cardPixSales.reduce((acc, s) => acc + s.total, 0);

  const handleAction = () => {
    const val = parseFloat(amount);
    if (isNaN(val)) return;

    if (showModal === 'edit' && editingId) {
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
    ...transactions.map(t => ({ ...t, isEditable: true })),
    ...sales.map(s => ({
      id: s.id,
      type: 'sale' as const,
      description: `Venda ${s.type} - ${s.salesperson}`,
      amount: s.total,
      time: `Hoje, ${new Date().getHours()}:${new Date().getMinutes().toString().padStart(2, '0')}`,
      method: s.paymentMethod === 'pix' ? 'PIX' : (s.paymentMethod === 'credit_card' || s.paymentMethod === 'debit_card') ? 'Cartão' : 'Dinheiro',
      isEditable: false
    }))
  ].sort((a, b) => b.id.localeCompare(a.id));

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-500 pb-24 lg:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-slate-50/90 backdrop-blur-md z-20 py-4 -mx-4 px-4 lg:static lg:bg-transparent lg:p-0 lg:m-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Controle de Caixa</h2>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 shadow-sm">Aberto</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border-2 border-slate-100 text-slate-700 active:bg-slate-50 text-sm font-bold transition-all">
            <History size={20} />
            <span className="hidden sm:inline">Histórico</span>
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-900 text-white active:bg-slate-800 text-sm font-bold shadow-lg transition-all">
            <Lock size={20} />
            <span>Fechar Caixa</span>
          </button>
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
                      {showModal === 'in' ? 'Reforço de Caixa' : 
                       showModal === 'out' ? 'Sangria / Saída' : 'Editar Valor'}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">Informe os detalhes da operação.</p>
                  </div>
                </div>

                <div className="space-y-6">
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
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor (R$)</label>
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
                      showModal === 'in' ? "bg-emerald-600 active:bg-emerald-700 shadow-emerald-100" : 
                      showModal === 'out' ? "bg-rose-600 active:bg-rose-700 shadow-rose-100" : "bg-blue-600 active:bg-blue-700 shadow-blue-100"
                    )}
                  >
                    Confirmar Operação
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
  onFinalizeSale, 
  editingSale,
  onCancelEdit,
  todaySalesTotal, 
  weeklySalesTotal,
  monthlySalesTotal,
  monthlyGoal,
  dailyGoal, 
  salesByPerson 
}: { 
  salespersons: Salesperson[], 
  products: Product[],
  sales: Sale[],
  onFinalizeSale: (sale: Sale) => void, 
  editingSale?: Sale | null,
  onCancelEdit?: () => void,
  todaySalesTotal: number,
  weeklySalesTotal: number,
  monthlySalesTotal: number,
  monthlyGoal: MonthlyGoal,
  dailyGoal: number,
  salesByPerson: Record<string, { total: number, count: number, avg: number }>
}) => {
  const [cart, setCart] = useState<{ product: Product, qty: number }[]>([]);
  const [shift, setShift] = useState<'Manhã' | 'Tarde'>('Manhã');
  const [saleType, setSaleType] = useState<'Presencial' | 'Online'>('Presencial');
  const [avulsoName, setAvulsoName] = useState('');
  const [avulsoPrice, setAvulsoPrice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'debit_card' | 'cash'>('pix');
  const [selectedSalesperson, setSelectedSalesperson] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showQuickStats, setShowQuickStats] = useState(false);

  const activeSalespersons = salespersons.filter(s => s.isActive);
  const total = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
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
      setSelectedSalesperson(editingSale.salesperson);
    } else if (activeSalespersons.length > 0 && !selectedSalesperson) {
      setSelectedSalesperson(activeSalespersons[0].name);
    }
  }, [editingSale, activeSalespersons, selectedSalesperson]);

  const [showCartMobile, setShowCartMobile] = useState(false);

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

  const handleFinalizeSale = () => {
    if (cart.length === 0) return;
    
    const newSale: Sale = {
      id: editingSale ? editingSale.id : `sale-${Date.now()}`,
      date: editingSale ? editingSale.date : new Date().toLocaleDateString('pt-BR'),
      salesperson: selectedSalesperson,
      items: [...cart],
      total: total,
      paymentMethod: paymentMethod,
      shift: shift,
      type: saleType
    };

    onFinalizeSale(newSale);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setCart([]);
    }, 3000);
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
        <button 
          onClick={() => setIsSuccess(false)}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          Novo Atendimento
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 lg:gap-6 animate-in slide-in-from-right-4 duration-500">
      <header className="flex items-center justify-between sticky top-0 bg-slate-50 z-20 py-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Atendimento</h2>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">
            <TrendingUp size={14} />
            R$ {todaySalesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editingSale && (
            <button 
              onClick={onCancelEdit}
              className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 hover:bg-rose-100 transition-all"
            >
              Cancelar Edição
            </button>
          )}
          <button 
            onClick={() => setShowCartMobile(true)}
            className="lg:hidden relative p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200"
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
              onClick={() => setShift('Manhã')}
              className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", shift === 'Manhã' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
            >
              Manhã
            </button>
            <button 
              onClick={() => setShift('Tarde')}
              className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", shift === 'Tarde' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
            >
              Tarde
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

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Left: Product Selection */}
        <div className="flex-1 flex flex-col gap-4 lg:gap-6 overflow-hidden">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                className="w-full pl-12 pr-14 py-4 lg:py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none shadow-sm text-base" 
                placeholder="Pesquisar produto ou marca..." 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 p-2 hover:bg-blue-50 rounded-xl transition-colors">
                <QrCode size={24} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Venda Avulsa (Rápida)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={avulsoName}
                    onChange={(e) => setAvulsoName(e.target.value)}
                    placeholder="Nome do item..."
                    className="flex-1 px-4 py-4 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base font-medium"
                  />
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                    <input 
                      type="number" 
                      value={avulsoPrice}
                      onChange={(e) => setAvulsoPrice(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-8 pr-4 py-4 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base font-bold"
                    />
                  </div>
                  <button 
                    onClick={addAvulsoToCart}
                    className="px-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center active:scale-95"
                  >
                    <Plus size={28} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
            {bestSellers.length > 0 && !searchTerm && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="text-amber-500" size={18} />
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mais Vendidos</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {bestSellers.map(product => (
                    <button 
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="bg-white p-3 rounded-2xl border border-slate-200 hover:border-blue-500 transition-all shadow-sm flex flex-col items-center text-center group active:scale-95"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-50 overflow-hidden mb-2 border border-slate-100">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-900 line-clamp-1 w-full">{product.name}</p>
                      <p className="text-[10px] font-black text-blue-600 mt-1">R$ {product.price.toFixed(0)}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 pb-20">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  onClick={() => addToCart(product)}
                  className="bg-white p-3 lg:p-4 rounded-2xl border border-slate-200 hover:border-blue-500 transition-all group cursor-pointer shadow-sm hover:shadow-md flex flex-col"
                >
                  <div className="aspect-square bg-slate-50 rounded-2xl mb-3 overflow-hidden relative">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/0 group-active:bg-black/10 transition-colors lg:hidden" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm lg:text-base mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors h-10 lg:h-12 leading-tight">{product.name}</h4>
                  <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{product.brand}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-blue-600 font-black text-base lg:text-xl">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                      <Plus size={24} />
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

        {/* Right: Cart & Checkout */}
        <AnimatePresence>
          {(showCartMobile || window.innerWidth >= 1024) && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "fixed inset-0 z-[60] lg:relative lg:inset-auto lg:z-0 lg:flex lg:w-[400px] flex flex-col gap-6 bg-slate-50 lg:bg-transparent",
                !showCartMobile && "hidden lg:flex"
              )}
            >
              <div className="flex-1 bg-white lg:rounded-2xl border-b lg:border border-slate-200 flex flex-col overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowCartMobile(false)}
                      className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-slate-900"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <h3 className="font-bold flex items-center gap-2 text-slate-900">
                      <ShoppingCart size={20} className="text-blue-600" />
                      Carrinho ({cart.length})
                    </h3>
                  </div>
                  <div className="flex bg-slate-50 p-1 rounded-lg">
                    <button 
                      onClick={() => setSaleType('Presencial')}
                      className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all", saleType === 'Presencial' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
                    >
                      Presencial
                    </button>
                    <button 
                      onClick={() => setSaleType('Online')}
                      className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all", saleType === 'Online' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
                    >
                      Online
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                      <ShoppingCart size={48} />
                      <p className="text-sm font-bold uppercase tracking-widest">Carrinho Vazio</p>
                    </div>
                  ) : (
                    cart.map((item, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-50 rounded-xl overflow-hidden shrink-0">
                          <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{item.product.name}</p>
                          <p className="text-xs text-slate-500 font-medium">{item.product.brand}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2">
                          <button 
                            onClick={() => updateQty(item.product.id, -1)}
                            className="text-slate-400 hover:text-slate-900 font-bold p-1"
                          >
                            <MinusCircle size={18} />
                          </button>
                          <span className="text-sm font-black w-4 text-center">{item.qty}</span>
                          <button 
                            onClick={() => updateQty(item.product.id, 1)}
                            className="text-slate-400 hover:text-slate-900 font-bold p-1"
                          >
                            <PlusCircle size={18} />
                          </button>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors p-2"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="text-slate-900 font-bold">R$ {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <span className="font-black text-slate-900">Total</span>
                    <span className="text-3xl font-black text-blue-600 tracking-tight">R$ {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white lg:rounded-2xl border-t lg:border border-slate-200 p-6 space-y-6 shadow-sm pb-safe-bottom">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Vendedora</label>
                    <select 
                      value={selectedSalesperson}
                      onChange={(e) => setSelectedSalesperson(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      {activeSalespersons.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                      {activeSalespersons.length === 0 && <option>Nenhuma vendedora ativa</option>}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Forma de Pagamento</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'pix', label: 'PIX', icon: QrCode, activeClass: "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-emerald-100", iconColor: "text-emerald-600" },
                        { id: 'cash', label: 'Dinheiro', icon: DollarSign, activeClass: "border-amber-500 bg-amber-50 text-amber-700 shadow-amber-100", iconColor: "text-amber-600" },
                        { id: 'credit_card', label: 'Crédito', icon: CreditCard, activeClass: "border-blue-500 bg-blue-50 text-blue-700 shadow-blue-100", iconColor: "text-blue-600" },
                        { id: 'debit_card', label: 'Débito', icon: CreditCard, activeClass: "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-indigo-100", iconColor: "text-indigo-600" },
                      ].map((method) => (
                        <button 
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id as any)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all shadow-sm active:scale-95",
                            paymentMethod === method.id 
                              ? cn("ring-2 ring-offset-2 ring-transparent", method.activeClass) 
                              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <method.icon size={28} className={paymentMethod === method.id ? method.iconColor : "text-slate-400"} />
                          <span className="text-xs font-black uppercase tracking-wider">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => {
                      setCart([]);
                      setShowCartMobile(false);
                    }}
                    className="flex-1 px-4 py-5 text-xs font-black text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all tracking-widest"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={() => {
                      handleFinalizeSale();
                      setShowCartMobile(false);
                    }}
                    disabled={cart.length === 0}
                    className={cn(
                      "flex-[2] px-4 py-6 text-sm font-black text-white rounded-2xl transition-all tracking-widest shadow-xl active:scale-95",
                      cart.length > 0 ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200" : "bg-slate-300 cursor-not-allowed shadow-none"
                    )}
                  >
                    FINALIZAR VENDA
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const SettingsView = ({ 
  salespersons, 
  setSalespersons, 
  monthlyGoal, 
  setMonthlyGoal,
  sales,
  products,
  brands,
  transactions,
  fixedCosts
}: { 
  salespersons: Salesperson[], 
  setSalespersons: React.Dispatch<React.SetStateAction<Salesperson[]>>,
  monthlyGoal: MonthlyGoal,
  setMonthlyGoal: React.Dispatch<React.SetStateAction<MonthlyGoal>>,
  sales: Sale[],
  products: Product[],
  brands: Brand[],
  transactions: Transaction[],
  fixedCosts: FixedCost[]
}) => {
  const [newName, setNewName] = useState('');

  const addSalesperson = () => {
    if (!newName.trim()) return;
    const newS: Salesperson = {
      id: Date.now().toString(),
      name: newName,
      isActive: true
    };
    setSalespersons([...salespersons, newS]);
    setNewName('');
  };

  const toggleStatus = (id: string) => {
    setSalespersons(salespersons.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Configurações</h2>
          <p className="text-slate-500">Gerencie sua equipe, metas e backups do sistema.</p>
        </div>
        <button 
          onClick={handleExportData}
          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 active:scale-95"
        >
          <Download size={20} />
          Backup Completo
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Salespersons Management */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-2 text-blue-600">
            <Users size={20} />
            <h3 className="font-bold text-lg text-slate-900">Gerenciar Vendedores</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da vendedora..."
                className="flex-1 px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all text-base font-medium outline-none"
              />
              <button 
                onClick={addSalesperson}
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95"
              >
                <Plus size={20} />
                Adicionar
              </button>
            </div>

            <div className="space-y-3">
              {salespersons.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-full", s.isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300")} />
                    <span className={cn("text-base font-bold", !s.isActive ? "text-slate-400 line-through" : "text-slate-900")}>{s.name}</span>
                  </div>
                  <button 
                    onClick={() => toggleStatus(s.id)}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-sm",
                      s.isActive ? "text-rose-600 bg-white hover:bg-rose-50 border border-rose-100" : "text-emerald-600 bg-white hover:bg-emerald-50 border border-emerald-100"
                    )}
                  >
                    {s.isActive ? "Desativar" : "Ativar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Monthly Goals */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-2 text-blue-600">
            <BarChart3 size={20} />
            <h3 className="font-bold text-lg text-slate-900">Metas do Mês</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Meta de Vendas (R$)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  <input 
                    type="number" 
                    value={monthlyGoal.targetAmount}
                    onChange={(e) => setMonthlyGoal({ ...monthlyGoal, targetAmount: Number(e.target.value) })}
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Dias de Trabalho no Mês</label>
                <input 
                  type="number" 
                  value={monthlyGoal.workingDays}
                  onChange={(e) => setMonthlyGoal({ ...monthlyGoal, workingDays: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Ex: 22"
                />
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-3 text-blue-600 mb-2">
                <TrendingUp size={18} />
                <span className="font-bold text-sm">Meta Diária Sugerida</span>
              </div>
              <p className="text-2xl font-black text-blue-900">
                R$ {(monthlyGoal.targetAmount / (monthlyGoal.workingDays || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-blue-600 mt-1 font-medium">Baseado em {monthlyGoal.workingDays} dias úteis.</p>
            </div>
          </div>
        </section>

        {/* Backup & Data Section */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
          <div className="p-6 border-b border-slate-100 flex items-center gap-2 text-blue-600">
            <Database size={20} />
            <h3 className="font-bold text-lg text-slate-900">Backup e Segurança</h3>
          </div>
          <div className="p-6">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 mb-1">Exportar Base de Dados</h4>
                <p className="text-sm text-slate-500">Baixe um arquivo contendo todas as vendas, produtos, vendedoras e movimentações financeiras do sistema.</p>
              </div>
              <button 
                onClick={handleExportData}
                className="w-full md:w-auto bg-white text-slate-900 border-2 border-slate-200 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Download size={20} />
                Baixar Backup (.json)
              </button>
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
  onDeleteSale 
}: { 
  sales: Sale[], 
  onEditSale: (sale: Sale) => void, 
  onDeleteSale: (saleId: string) => void 
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    salesperson: '',
    paymentMethod: '',
    type: '',
    search: '',
    startDate: '',
    endDate: ''
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
      const matchesSearch = !filters.search || 
        sale.salesperson.toLowerCase().includes(filters.search.toLowerCase()) ||
        sale.items.some(item => item.product.name.toLowerCase().includes(filters.search.toLowerCase()));
      
      const saleDate = new Date(sale.date);
      const matchesStartDate = !filters.startDate || saleDate >= new Date(filters.startDate);
      const matchesEndDate = !filters.endDate || saleDate <= new Date(filters.endDate);
      
      return matchesSalesperson && matchesPayment && matchesType && matchesSearch && matchesStartDate && matchesEndDate;
    }).sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Sale];
      let bValue: any = b[sortConfig.key as keyof Sale];

      if (sortConfig.key === 'date_obj') {
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sales, filters, sortConfig]);

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
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
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
                      <p className="text-sm font-bold text-slate-900">{new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{sale.shift}</p>
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
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                        sale.paymentMethod === 'pix' ? "bg-emerald-100 text-emerald-700" :
                        sale.paymentMethod === 'credit_card' ? "bg-blue-100 text-blue-700" :
                        sale.paymentMethod === 'debit_card' ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {sale.paymentMethod === 'pix' ? 'PIX' : 
                         sale.paymentMethod === 'credit_card' ? 'Crédito' : 
                         sale.paymentMethod === 'debit_card' ? 'Débito' : 'Dinheiro'}
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
                      <span className="text-sm font-black text-slate-900">
                        R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEditSale(sale); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar Venda"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(sale.id); }}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Venda"
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {new Date(sale.date).toLocaleDateString('pt-BR')} · {sale.items.length} itens
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right" onClick={() => setSelectedSale(sale)}>
                    <p className="text-sm font-black text-slate-900">R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md",
                      sale.paymentMethod === 'pix' ? "bg-emerald-100 text-emerald-700" :
                      sale.paymentMethod === 'credit_card' ? "bg-blue-100 text-blue-700" :
                      sale.paymentMethod === 'debit_card' ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {sale.paymentMethod === 'pix' ? 'PIX' : 
                       sale.paymentMethod === 'credit_card' ? 'Crédito' : 
                       sale.paymentMethod === 'debit_card' ? 'Débito' : 'Dinheiro'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEditSale(sale); }}
                      className="p-2 text-blue-600 bg-blue-50 rounded-lg"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(sale.id); }}
                      className="p-2 text-rose-600 bg-rose-50 rounded-lg"
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
                    <p className="font-bold text-slate-900">{new Date(selectedSale.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens Vendidos</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {selectedSale.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden flex-shrink-0">
                            {item.product.image ? (
                              <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Package size={16} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.product.name}</p>
                            <p className="text-xs text-slate-500">{item.qty}x R$ {item.product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-slate-900">
                          R$ {(item.qty * item.product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-500">Método de Pagamento</span>
                    <span className="text-sm font-black text-slate-900 uppercase">{selectedSale.paymentMethod}</span>
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
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<View>('atendimento');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([
    { id: '1', name: 'Alessandra', isActive: true },
    { id: '2', name: 'Letícia', isActive: true },
  ]);

  const [sales, setSales] = useState<Sale[]>([]);
  const [brands, setBrands] = useState<Brand[]>([
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
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: '1', type: 'in', description: 'Abertura de Caixa', amount: 200.00, time: 'Hoje, 08:00' },
  ]);

  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([
    { id: '1', description: 'Aluguel', amount: 2500, dueDate: '10', isPaid: true },
    { id: '2', description: 'Energia', amount: 450, dueDate: '15', isPaid: false },
    { id: '3', description: 'Internet', amount: 120, dueDate: '05', isPaid: true },
  ]);

  const [monthlyGoal, setMonthlyGoal] = useState<MonthlyGoal>({
    month: '2026-03',
    targetAmount: 50000,
    workingDays: 22
  });

  const handleFinalizeSale = (sale: Sale) => {
    if (editingSale) {
      setSales(prev => prev.map(s => s.id === editingSale.id ? sale : s));
      setEditingSale(null);
    } else {
      setSales(prev => [...prev, sale]);
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

  const handleAddTransaction = (t: Omit<Transaction, 'id' | 'time'>) => {
    const newT: Transaction = {
      ...t,
      id: Date.now().toString(),
      time: `Hoje, ${new Date().getHours()}:${new Date().getMinutes().toString().padStart(2, '0')}`
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

  const today = new Date().toLocaleDateString('pt-BR');
  const todaySales = sales.filter(s => s.date === today);
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.total, 0);

  // Monthly stats for POS
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlySales = sales.filter(s => {
    const [day, month, year] = s.date.split('/');
    const saleDate = new Date(`${year}-${month}-${day}T12:00:00`);
    return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
  });
  const totalMonthlySold = monthlySales.reduce((acc, s) => acc + s.total, 0);

  // Weekly stats for POS
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  startOfWeek.setHours(0, 0, 0, 0);
  const weeklySales = sales.filter(s => {
    const [day, month, year] = s.date.split('/');
    const saleDate = new Date(`${year}-${month}-${day}T12:00:00`);
    return saleDate >= startOfWeek;
  });
  const totalWeeklySold = weeklySales.reduce((acc, s) => acc + s.total, 0);
  
  const dailyGoal = monthlyGoal.targetAmount / (monthlyGoal.workingDays || 1);
  
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-900">
      <Sidebar currentView={view} setView={setView} />
      
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-h-screen custom-scrollbar pb-24 lg:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto h-full"
          >
            {view === 'atendimento' && (
              <NewSale 
                salespersons={salespersons} 
                products={products}
                sales={sales}
                onFinalizeSale={handleFinalizeSale}
                editingSale={editingSale}
                onCancelEdit={() => setEditingSale(null)}
                todaySalesTotal={todaySalesTotal}
                weeklySalesTotal={totalWeeklySold}
                monthlySalesTotal={totalMonthlySold}
                monthlyGoal={monthlyGoal}
                dailyGoal={dailyGoal}
                salesByPerson={salesByPerson}
              />
            )}
            {view === 'dashboard' && <Dashboard salespersons={salespersons} sales={sales} monthlyGoal={monthlyGoal} />}
            {view === 'products' && (
              <Products 
                products={products}
                brands={brands}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
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
              />
            )}
            {view === 'cash' && (
              <CashControl 
                transactions={transactions} 
                sales={sales} 
                onAddTransaction={handleAddTransaction}
                onUpdateTransaction={handleUpdateTransaction}
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
            {view === 'settings' && (
              <SettingsView 
                salespersons={salespersons} 
                setSalespersons={setSalespersons}
                monthlyGoal={monthlyGoal}
                setMonthlyGoal={setMonthlyGoal}
                sales={sales}
                products={products}
                brands={brands}
                transactions={transactions}
                fixedCosts={fixedCosts}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav currentView={view} setView={setView} />

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
