import React, { useState, useEffect } from 'react';
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
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type View = 'atendimento' | 'dashboard' | 'products' | 'sales' | 'cash' | 'fixed-costs' | 'settings';

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
  paymentMethod: 'pix' | 'card' | 'cash';
  shift: 'Manhã' | 'Tarde';
  type: 'Presencial' | 'Online';
}

// --- Mock Data ---
const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Base Matte', brand: 'Farm', price: 89.90, category: 'Maquiagem', stock: 80, image: 'https://picsum.photos/seed/makeup/400/300' },
  { id: '2', name: 'Perfume Floral', brand: 'Animale', price: 210.00, category: 'Perfumes', stock: 45, image: 'https://picsum.photos/seed/perfume/400/300' },
  { id: '3', name: 'Shampoo Argan', brand: 'Le Lis Blanc', price: 45.00, category: 'Cabelo', stock: 15, image: 'https://picsum.photos/seed/shampoo/400/300' },
  { id: '4', name: 'Creme Hidratante', brand: 'Zara', price: 59.90, category: 'Skincare', stock: 90, image: 'https://picsum.photos/seed/cream/400/300' },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'in', description: 'Reforço de Caixa', amount: 200.00, time: 'Hoje, 08:15' },
  { id: '2', type: 'sale', description: 'Venda PDV #4502', amount: 85.90, time: 'Hoje, 09:42', method: 'Dinheiro' },
  { id: '3', type: 'out', description: 'Sangria de Caixa', amount: -45.00, time: 'Hoje, 10:15' },
  { id: '4', type: 'sale', description: 'Venda PDV #4503', amount: 124.50, time: 'Hoje, 11:20', method: 'Dinheiro' },
];

// --- Components ---

const Sidebar = ({ currentView, setView }: { currentView: View, setView: (v: View) => void }) => {
  const menuItems = [
    { id: 'atendimento', label: 'Atendimento', icon: ShoppingCart },
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'sales', label: 'Vendas', icon: History },
    { id: 'cash', label: 'Caixa', icon: Wallet },
    { id: 'fixed-costs', label: 'Custos Fixos', icon: ReceiptText },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
          <Store size={24} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-slate-900 font-bold text-lg leading-tight">VendaPronta</h1>
          <p className="text-slate-500 text-xs">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
              currentView === item.id 
                ? "bg-blue-50 text-blue-600 font-semibold" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon size={20} className={cn(currentView === item.id ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 overflow-hidden">
            <img src="https://picsum.photos/seed/admin/100/100" alt="Admin" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">Admin User</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Loja Central</p>
          </div>
          <button className="text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

const Dashboard = ({ salespersons, sales }: { salespersons: Salesperson[], sales: Sale[] }) => {
  const activeSalespersons = salespersons.filter(s => s.isActive);
  
  const today = new Date().toLocaleDateString('pt-BR');
  const todaySales = sales.filter(s => s.date === today);
  const totalSold = todaySales.reduce((acc, s) => acc + s.total, 0);
  const salesCount = todaySales.length;
  const avgTicket = salesCount > 0 ? totalSold / salesCount : 0;

  // Weekly comparison logic
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toLocaleDateString('pt-BR');
  }).reverse();

  const weeklyData = last7Days.map(date => {
    const daySales = sales.filter(s => s.date === date);
    const total = daySales.reduce((acc, s) => acc + s.total, 0);
    const [day, month, year] = date.split('/');
    const dayName = new Date(`${year}-${month}-${day}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' });
    return {
      day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      amount: total,
      date: date
    };
  });

  const maxWeeklyAmount = Math.max(...weeklyData.map(d => d.amount), 1);

  // Daily history logic
  const dailyHistoryMap = sales.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = { count: 0, total: 0 };
    acc[s.date].count++;
    acc[s.date].total += s.total;
    return acc;
  }, {} as Record<string, { count: number, total: number }>);

  // Ensure today is in the list
  if (!dailyHistoryMap[today]) {
    dailyHistoryMap[today] = { count: 0, total: 0 };
  }

  const sortedHistory = Object.entries(dailyHistoryMap).sort((a, b) => {
    const [dayA, monthA, yearA] = a[0].split('/');
    const [dayB, monthB, yearB] = b[0].split('/');
    return `${yearB}-${monthB}-${dayB}`.localeCompare(`${yearA}-${monthA}-${dayA}`);
  });

  // Calculate best salesperson
  const salesByPerson = todaySales.reduce((acc, s) => {
    acc[s.salesperson] = (acc[s.salesperson] || 0) + s.total;
    return acc;
  }, {} as Record<string, number>);

  let bestPerson = '-';
  let maxAmount = 0;
  Object.entries(salesByPerson).forEach(([name, amount]) => {
    if (amount > maxAmount) {
      maxAmount = amount;
      bestPerson = name;
    }
  });

  // Payment methods
  const paymentStats = todaySales.reduce((acc, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total;
    return acc;
  }, { pix: 0, card: 0, cash: 0 } as Record<string, number>);

  const totalPayment = Object.values(paymentStats).reduce((a, b) => a + b, 0) || 1;

  // Shifts
  const shiftStats = todaySales.reduce((acc, s) => {
    acc[s.shift] = (acc[s.shift] || 0) + 1;
    return acc;
  }, { 'Manhã': 0, 'Tarde': 0 } as Record<string, number>);

  const totalShifts = Object.values(shiftStats).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Resumo Geral</h2>
          <p className="text-slate-500">Bem-vindo de volta! Aqui está o resumo das suas atividades.</p>
        </div>
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white shadow-sm">Hoje</button>
          <button className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50">7 dias</button>
          <button className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50">30 dias</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Vendido', value: `R$ ${totalSold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, trend: null, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total de Vendas', value: salesCount.toString(), trend: null, icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Melhor Vendedora', value: bestPerson, trend: null, icon: User, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Ticket Médio', value: `R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, trend: null, icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2.5 rounded-xl", kpi.bg, kpi.color)}>
                <kpi.icon size={24} />
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">{kpi.label}</p>
            <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-lg text-slate-900">Comparativo Semanal</h3>
              <span className="text-slate-400 bg-slate-50 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                {sales.length > 0 ? 'Dados atualizados' : 'Aguardando dados...'}
              </span>
            </div>
            
            <div className={cn("space-y-6", sales.length === 0 && "opacity-40")}>
              {weeklyData.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-500 w-24">{item.day.split('-')[0]}</span>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.amount / maxWeeklyAmount) * 100}%` }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                      className="h-full bg-blue-600 rounded-full" 
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-700">R$ {item.amount.toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Histórico Diário</h3>
              <button className="text-blue-600 text-sm font-bold hover:underline">Ver relatório completo</button>
            </div>
            <div className="overflow-x-auto">
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
                    <tr key={i} className={cn("hover:bg-slate-50 transition-colors", date === today && "bg-blue-50/30")}>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {date} {date === today && <span className="ml-2 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-md uppercase">Hoje</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{data.count}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">R$ {(data.count > 0 ? data.total / data.count : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg text-slate-900 mb-6">Meio de Pagamento</h3>
            <div className="space-y-6">
              {[
                { label: 'PIX', value: Math.round((paymentStats.pix / totalPayment) * 100), amount: `R$ ${paymentStats.pix.toLocaleString('pt-BR')}`, color: 'bg-blue-600' },
                { label: 'Cartão', value: Math.round((paymentStats.card / totalPayment) * 100), amount: `R$ ${paymentStats.card.toLocaleString('pt-BR')}`, color: 'bg-indigo-500' },
                { label: 'Dinheiro', value: Math.round((paymentStats.cash / totalPayment) * 100), amount: `R$ ${paymentStats.cash.toLocaleString('pt-BR')}`, color: 'bg-emerald-500' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">{item.label}</span>
                    <span className="text-sm font-bold text-slate-900">{item.amount} ({item.value}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
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
              <h4 className="text-xs font-bold mb-4 uppercase tracking-wider text-slate-400">Vendas por Turno</h4>
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Manhã</p>
                  <p className="font-bold text-slate-900">{Math.round((shiftStats['Manhã'] / totalShifts) * 100)}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Tarde</p>
                  <p className="font-bold text-slate-900">{Math.round((shiftStats['Tarde'] / totalShifts) * 100)}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Ranking de Vendedores</h3>
            </div>
            <div className="p-6 space-y-6">
              {activeSalespersons.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Nenhuma vendedora ativa.</p>
              ) : (
                activeSalespersons
                .map(seller => ({
                  ...seller,
                  amount: salesByPerson[seller.name] || 0
                }))
                .sort((a, b) => b.amount - a.amount)
                .map((seller, i) => (
                  <div key={seller.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-bold text-slate-900 truncate">{seller.name}</span>
                        <span className="text-xs font-bold text-slate-500">R$ {seller.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${maxAmount > 0 ? (seller.amount / maxAmount) * 100 : 0}%` }}
                          transition={{ duration: 1, delay: 0.8 + i * 0.1 }}
                          className="h-full bg-blue-600 rounded-full"
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

const Products = () => {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Cadastro de Produtos</h2>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-200">
          <Plus size={18} />
          Adicionar Novo Produto
        </button>
      </header>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2 text-blue-600">
          <PlusCircle size={20} />
          <h3 className="font-bold text-lg text-slate-900">Registrar Novo Produto</h3>
        </div>
        <form className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="col-span-full lg:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nome do Produto</label>
            <input className="w-full px-4 py-2.5 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Ex: Teclado Mecânico RGB" type="text"/>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Marca</label>
            <input className="w-full px-4 py-2.5 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Marca do produto" type="text"/>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Preço (R$)</label>
            <input className="w-full px-4 py-2.5 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="0,00" type="text"/>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Categoria</label>
            <select className="w-full px-4 py-2.5 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
              <option value="">Selecione...</option>
              <option value="maquiagem">Maquiagem</option>
              <option value="cremes">Cremes</option>
              <option value="perfumes">Perfumes</option>
              <option value="cabelo">Cabelo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Estoque Inicial</label>
            <input className="w-full px-4 py-2.5 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="0" type="number"/>
          </div>
          <div className="col-span-full flex justify-end gap-3 pt-4">
            <button type="button" className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all">Cancelar</button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">Salvar Produto</button>
          </div>
        </form>
      </section>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Lista de Produtos</h3>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Filter size={20} /></button>
            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><MoreVertical size={20} /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
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
              {MOCK_PRODUCTS.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
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
                    <button className="text-blue-600 hover:text-blue-800 font-bold text-xs tracking-wider">EDITAR</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">Mostrando {MOCK_PRODUCTS.length} de 42 produtos</p>
          <div className="flex gap-2">
            <button className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 disabled:opacity-50"><ChevronLeft size={16} /></button>
            <button className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ChevronRight size={16} /></button>
          </div>
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
      method: s.paymentMethod === 'pix' ? 'PIX' : s.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro',
      isEditable: false
    }))
  ].sort((a, b) => b.id.localeCompare(a.id));

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Controle de Caixa</h2>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">Caixa Aberto</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-bold">
            <History size={18} />
            Histórico
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm font-bold shadow-lg">
            <Lock size={18} />
            Fechar Caixa
          </button>
        </div>
      </header>

      <div className="bg-white rounded-3xl border border-slate-200 p-10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <DollarSign size={160} />
        </div>
        <div className="relative z-10">
          <p className="text-slate-500 font-semibold mb-2">Total em Caixa (Dinheiro)</p>
          <div className="flex items-baseline gap-2">
            <span className="text-slate-400 text-3xl font-medium tracking-tight">R$</span>
            <h3 className="text-6xl font-black text-slate-900 tracking-tight">
              {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            <button 
              onClick={() => { setShowModal('in'); setDescription('Reforço de Caixa'); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-blue-200"
            >
              <PlusCircle size={20} />
              Reforço de Caixa
            </button>
            <button 
              onClick={() => { setShowModal('out'); setDescription('Sangria de Caixa'); }}
              className="flex items-center gap-2 bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-bold transition-all"
            >
              <MinusCircle size={20} />
              Sangria / Saída
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Entradas (Dinheiro)', value: `R$ ${totalInCash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-emerald-600' },
          { label: 'Saídas', value: `R$ ${Math.abs(totalOut).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-rose-600' },
          { label: 'Vendas (Cartão/Pix)', value: `R$ ${totalCardPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-blue-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
            <span className={cn("text-2xl font-black mt-2", stat.color)}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
              <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    tx.type === 'in' ? "bg-emerald-50 text-emerald-600" : 
                    tx.type === 'out' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {tx.type === 'in' ? <TrendingUp size={24} /> : 
                     tx.type === 'out' ? <TrendingDown size={24} /> : <ShoppingCart size={24} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{tx.description}</p>
                    <p className="text-xs text-slate-500">{tx.method || 'Operação Interna'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-black",
                      tx.amount > 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {tx.amount > 0 ? '+' : ''} R$ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{tx.time}</p>
                  </div>
                  {tx.isEditable && (
                    <button 
                      onClick={() => openEdit(tx as Transaction)}
                      className="p-2 text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    showModal === 'in' ? "bg-emerald-100 text-emerald-600" : 
                    showModal === 'out' ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {showModal === 'in' ? <TrendingUp size={24} /> : 
                     showModal === 'out' ? <TrendingDown size={24} /> : <DollarSign size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {showModal === 'in' ? 'Reforço de Caixa' : 
                       showModal === 'out' ? 'Sangria / Saída' : 'Editar Valor'}
                    </h3>
                    <p className="text-sm text-slate-500">Informe os detalhes da operação.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição</label>
                    <input 
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Troco inicial, Pagamento fornecedor..."
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor (R$)</label>
                    <input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-lg font-black focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowModal(null)}
                    className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAction}
                    className={cn(
                      "flex-1 px-6 py-3 rounded-xl text-white font-bold transition-all shadow-lg",
                      showModal === 'in' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : 
                      showModal === 'out' ? "bg-rose-600 hover:bg-rose-700 shadow-rose-100" : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
                    )}
                  >
                    Confirmar
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
  };

  const startEdit = (cost: FixedCost) => {
    setEditingId(cost.id);
    setDescription(cost.description);
    setAmount(cost.amount.toString());
    setDueDate(cost.dueDate);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDescription('');
    setAmount('');
    setDueDate('');
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Custos Fixos</h2>
          <p className="text-slate-500">Gerencie as despesas recorrentes da sua loja.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Mensal</p>
            <p className="text-xl font-black text-slate-900">R$ {totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Geral', value: totalCosts, color: 'text-slate-900', bg: 'bg-white' },
          { label: 'Total Pago', value: paidCosts, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
          { label: 'Pendente', value: pendingCosts, color: 'text-rose-600', bg: 'bg-rose-50/50' },
        ].map((stat, i) => (
          <div key={i} className={cn("p-6 rounded-2xl border border-slate-200 shadow-sm", stat.bg)}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
            <p className={cn("text-2xl font-black mt-2", stat.color)}>R$ {stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-8">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              {editingId ? <Settings size={20} className="text-blue-600" /> : <PlusCircle size={20} className="text-blue-600" />}
              {editingId ? 'Editar Custo Fixo' : 'Novo Custo Fixo'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição</label>
                <input 
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Aluguel, Internet..."
                  className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor (R$)</label>
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vencimento (Dia)</label>
                <input 
                  type="number"
                  min="1"
                  max="31"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  placeholder="Ex: 10"
                  className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-2">
                {editingId && (
                  <button 
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                )}
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  {editingId ? 'Salvar Alterações' : 'Adicionar Custo'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
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
      </div>
    </div>
  );
};

const NewSale = ({ 
  salespersons, 
  onFinalizeSale, 
  todaySalesTotal, 
  dailyGoal, 
  salesByPerson 
}: { 
  salespersons: Salesperson[], 
  onFinalizeSale: (sale: Sale) => void, 
  todaySalesTotal: number,
  dailyGoal: number,
  salesByPerson: Record<string, { total: number, count: number, avg: number }>
}) => {
  const [cart, setCart] = useState<{ product: Product, qty: number }[]>([]);
  const [shift, setShift] = useState<'Manhã' | 'Tarde'>('Manhã');
  const [saleType, setSaleType] = useState<'Presencial' | 'Online'>('Presencial');
  const [avulsoName, setAvulsoName] = useState('');
  const [avulsoPrice, setAvulsoPrice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'cash'>('pix');
  const [selectedSalesperson, setSelectedSalesperson] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showQuickStats, setShowQuickStats] = useState(false);

  const activeSalespersons = salespersons.filter(s => s.isActive);
  const total = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
  const goalProgress = Math.min(100, (todaySalesTotal / (dailyGoal || 1)) * 100);

  useEffect(() => {
    if (activeSalespersons.length > 0 && !selectedSalesperson) {
      setSelectedSalesperson(activeSalespersons[0].name);
    }
  }, [activeSalespersons, selectedSalesperson]);

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
      id: `sale-${Date.now()}`,
      date: new Date().toLocaleDateString('pt-BR'),
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

  const filteredProducts = MOCK_PRODUCTS.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isSuccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-100">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900">Venda Finalizada!</h2>
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
    <div className="h-full flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Atendimento</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">
            <TrendingUp size={14} />
            Total Hoje: R$ {todaySalesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">
            <Target size={14} />
            Meta: {goalProgress.toFixed(0)}%
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
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
            className={cn("p-2 rounded-xl transition-all", showQuickStats ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900 hover:bg-slate-200")}
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
                className="h-full bg-blue-600 transition-all duration-1000" 
                style={{ width: `${goalProgress}%` }}
              />
            </div>
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

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left: Product Selection */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none shadow-sm" 
                placeholder="Pesquisar produto por nome ou marca..." 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Produto Avulso</label>
                <input 
                  type="text" 
                  value={avulsoName}
                  onChange={(e) => setAvulsoName(e.target.value)}
                  placeholder="Nome do produto não cadastrado"
                  className="w-full px-4 py-2 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>
              <div className="w-32">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Preço</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                  <input 
                    type="number" 
                    value={avulsoPrice}
                    onChange={(e) => setAvulsoPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-4 py-2 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>
              <button 
                onClick={addAvulsoToCart}
                className="mt-5 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  onClick={() => addToCart(product)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-500 transition-all group cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="h-40 bg-slate-50 rounded-xl mb-4 overflow-hidden">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{product.name}</h4>
                  <p className="text-xs text-slate-500 mb-3">Marca: {product.brand}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-600 font-black text-lg">R$ {product.price.toFixed(2)}</span>
                    <button className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                      <Plus size={20} />
                    </button>
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
        <div className="w-[400px] flex flex-col gap-6 overflow-hidden">
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-slate-900">
                <ShoppingCart size={20} className="text-blue-600" />
                Carrinho ({cart.length})
              </h3>
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
            
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
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
                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-1.5">
                      <button 
                        onClick={() => updateQty(item.product.id, -1)}
                        className="text-slate-400 hover:text-slate-900 font-bold"
                      >
                        -
                      </button>
                      <span className="text-sm font-black w-4 text-center">{item.qty}</span>
                      <button 
                        onClick={() => updateQty(item.product.id, 1)}
                        className="text-slate-400 hover:text-slate-900 font-bold"
                      >
                        +
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={18} />
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

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Vendedora</label>
              <select 
                value={selectedSalesperson}
                onChange={(e) => setSelectedSalesperson(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500"
              >
                {activeSalespersons.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
                {activeSalespersons.length === 0 && <option>Nenhuma vendedora ativa</option>}
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Forma de Pagamento</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'pix', label: 'PIX', icon: QrCode },
                  { id: 'card', label: 'Cartão', icon: CreditCard },
                  { id: 'cash', label: 'Dinheiro', icon: DollarSign },
                ].map((method) => (
                  <button 
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                      paymentMethod === method.id ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-50 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    <method.icon size={20} />
                    <span className="text-[10px] font-black uppercase">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setCart([])}
                className="flex-1 px-4 py-4 text-xs font-black text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all tracking-widest"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleFinalizeSale}
                disabled={cart.length === 0}
                className={cn(
                  "flex-[2] px-4 py-4 text-xs font-black text-white rounded-2xl transition-all tracking-widest shadow-xl",
                  cart.length > 0 ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200" : "bg-slate-300 cursor-not-allowed shadow-none"
                )}
              >
                FINALIZAR VENDA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsView = ({ 
  salespersons, 
  setSalespersons, 
  monthlyGoal, 
  setMonthlyGoal 
}: { 
  salespersons: Salesperson[], 
  setSalespersons: React.Dispatch<React.SetStateAction<Salesperson[]>>,
  monthlyGoal: MonthlyGoal,
  setMonthlyGoal: React.Dispatch<React.SetStateAction<MonthlyGoal>>
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Configurações</h2>
        <p className="text-slate-500">Gerencie sua equipe e metas de vendas.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Salespersons Management */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-2 text-blue-600">
            <Users size={20} />
            <h3 className="font-bold text-lg text-slate-900">Gerenciar Vendedores</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da nova vendedora"
                className="flex-1 px-4 py-2 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <button 
                onClick={addSalesperson}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                Adicionar
              </button>
            </div>

            <div className="space-y-3">
              {salespersons.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", s.isActive ? "bg-emerald-500" : "bg-slate-300")} />
                    <span className={cn("text-sm font-semibold", !s.isActive && "text-slate-400 line-through")}>{s.name}</span>
                  </div>
                  <button 
                    onClick={() => toggleStatus(s.id)}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all",
                      s.isActive ? "text-rose-600 bg-rose-50 hover:bg-rose-100" : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
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
      </div>
    </div>
  );
};

const SalesHistory = ({ sales }: { sales: Sale[] }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    salesperson: '',
    paymentMethod: '',
    type: '',
    search: ''
  });

  const filteredSales = sales.filter(sale => {
    const matchesSalesperson = !filters.salesperson || sale.salesperson === filters.salesperson;
    const matchesPayment = !filters.paymentMethod || sale.paymentMethod === filters.paymentMethod;
    const matchesType = !filters.type || sale.type === filters.type;
    const matchesSearch = !filters.search || 
      sale.salesperson.toLowerCase().includes(filters.search.toLowerCase()) ||
      sale.items.some(item => item.product.name.toLowerCase().includes(filters.search.toLowerCase()));
    
    return matchesSalesperson && matchesPayment && matchesType && matchesSearch;
  });

  const salespersons = Array.from(new Set(sales.map(s => s.salesperson)));

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
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
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
              <option value="card">Cartão</option>
              <option value="cash">Dinheiro</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
            <div className="flex gap-2">
              <select 
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="flex-1 px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Todos</option>
                <option value="Presencial">Presencial</option>
                <option value="Online">Online</option>
              </select>
              <button 
                onClick={() => setFilters({ salesperson: '', paymentMethod: '', type: '', search: '' })}
                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                title="Limpar Filtros"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendedora</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                    Nenhuma venda encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                [...filteredSales].reverse().map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{sale.date}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{sale.shift}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                          {sale.salesperson.charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{sale.salesperson}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">
                        {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {sale.items.map(i => i.product.name).join(', ')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                        sale.paymentMethod === 'pix' ? "bg-emerald-100 text-emerald-700" :
                        sale.paymentMethod === 'card' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {sale.paymentMethod === 'pix' ? 'PIX' : sale.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                        sale.type === 'Online' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"
                      )}>
                        {sale.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-slate-900">
                        R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
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

export default function App() {
  const [view, setView] = useState<View>('atendimento');
  const [salespersons, setSalespersons] = useState<Salesperson[]>([
    { id: '1', name: 'Alessandra', isActive: true },
    { id: '2', name: 'Letícia', isActive: true },
  ]);

  const [sales, setSales] = useState<Sale[]>([]);
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
    setSales(prev => [...prev, sale]);
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
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      <Sidebar currentView={view} setView={setView} />
      
      <main className="flex-1 p-8 overflow-y-auto max-h-screen custom-scrollbar">
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
                onFinalizeSale={handleFinalizeSale}
                todaySalesTotal={todaySalesTotal}
                dailyGoal={dailyGoal}
                salesByPerson={salesByPerson}
              />
            )}
            {view === 'dashboard' && <Dashboard salespersons={salespersons} sales={sales} />}
            {view === 'products' && <Products />}
            {view === 'sales' && <SalesHistory sales={sales} />}
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
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

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
