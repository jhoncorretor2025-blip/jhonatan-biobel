import { 
    cn, formatCurrency, getWhatsAppUrl, cleanData, normalizeVendedoraName, 
    getSafeDate, getSaleLocalHours, formatDate, getLocalISOString, 
    isSameLocalDay, formatDateWithDayOfWeek, formatPhone, APP_VERSION 
  } from '../utils';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';
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
import { User, Brand, Category, Product, StockBatch, Staff, StoreSettings, 
  Withdrawal, FixedCost, FinancialAccount, CashierSession, Campaign, 
  Giveaway, RaffleTicket, Raffle, RoutineActivity, Routine, Customer, 
  SaleItem, Payment, Sale, MonthlyGoal, DashboardViewProps, ProductsViewProps, 
  StaffViewProps, RoutineViewProps, BackupViewProps, CustomersViewProps, 
  SalesViewProps, CashierViewProps, CampaignsViewProps, AtendimentoViewProps, 
  Notification } from '../types';;
import { db, auth } from '../firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy, increment } from 'firebase/firestore';

// Sub-component sibling imports inside src/components
import { InteractiveTips } from './interactivetips';
import { GestaoView } from './GestaoView';
import { ImprovementView } from './ImprovementView';
import { IncentiveCampaignView } from './IncentiveCampaignView';
import { SuppliersAndPurchasesView } from './SuppliersAndPurchasesView';
import { AgendaView, AgendaEvent } from './AgendaView';
import { ValidadesControlView } from './ValidadesControlView';
import { FiscalView } from './FiscalView';

export const ReportsView = ({ sales, staff, products, productMap, formatCurrency }: { sales: Sale[], staff: Staff[], products: Product[], productMap?: Map<string, any>, formatCurrency: (v: number) => string }) => {
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('all');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [reportsTab, setReportsTab] = useState<'list' | 'records' | 'ranges' | 'commercial'>('list');
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => setIsFiltering(false), 300);
    return () => clearTimeout(timer);
  }, [startDate, endDate, selectedStaff, selectedCategory, selectedMonthFilter, reportsTab]);

  const setQuickPeriod = (period: 'thisMonth' | 'last30' | 'prevMonth' | 'thisYear') => {
    const today = new Date();
    if (period === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
      setSelectedMonthFilter('all');
    } else if (period === 'last30') {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
      setSelectedMonthFilter('all');
    } else if (period === 'prevMonth') {
      const firstDayPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayPrev = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(firstDayPrev.toISOString().split('T')[0]);
      setEndDate(lastDayPrev.toISOString().split('T')[0]);
      setSelectedMonthFilter('all');
    } else if (period === 'thisYear') {
      const firstDayYear = new Date(today.getFullYear(), 0, 1);
      setStartDate(firstDayYear.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
      setSelectedMonthFilter('all');
    }
  };

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    sales.forEach((s: any) => {
      try {
        const d = getSafeDate(s.date);
        const mName = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toLowerCase().trim();
        if (mName) months.add(mName);
      } catch (e) {}
    });
    const list = Array.from(months).map(m => m.charAt(0).toUpperCase() + m.slice(1));
    const monthsMap: { [key: string]: number } = {
      janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
      julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
    };
    return list.sort((a, b) => {
      const partsA = a.split(' de ');
      const partsB = b.split(' de ');
      const mA = monthsMap[partsA[0].toLowerCase()] || 0;
      const yA = Number(partsA[1]) || 0;
      const mB = monthsMap[partsB[0].toLowerCase()] || 0;
      const yB = Number(partsB[1]) || 0;
      return new Date(yB, mB, 1).getTime() - new Date(yA, mA, 1).getTime();
    });
  }, [sales]);

  const handleMonthFilterChange = (val: string) => {
    setSelectedMonthFilter(val);
    if (val === 'all') {
      if (sales.length > 0) {
        const sortedDates = [...sales]
          .map(s => getSafeDate(s.date).getTime())
          .sort((a, b) => a - b);
        const first = new Date(sortedDates[0]);
        const last = new Date(sortedDates[sortedDates.length - 1]);
        setStartDate(first.toISOString().split('T')[0]);
        setEndDate(last.toISOString().split('T')[0]);
      } else {
        setStartDate('2025-01-01');
        setEndDate(new Date().toISOString().split('T')[0]);
      }
    } else {
      const monthsPt = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      const parts = val.toLowerCase().split(" de ");
      if (parts.length === 2) {
        const monthIdx = monthsPt.indexOf(parts[0].trim());
        const year = Number(parts[1].trim());
        if (monthIdx !== -1 && !isNaN(year)) {
          const firstDay = new Date(year, monthIdx, 1);
          const lastDay = new Date(year, monthIdx + 1, 0);
          setStartDate(firstDay.toISOString().split('T')[0]);
          setEndDate(lastDay.toISOString().split('T')[0]);
        }
      }
    }
  };

  const localProductMap = useMemo(() => {
    if (productMap) return productMap;
    const map = new Map<string, any>();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products, productMap]);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const sDateObj = getSafeDate(sale.date);
      const sStart = getSafeDate(startDate);
      sStart.setHours(0, 0, 0, 0);
      const sEnd = getSafeDate(endDate);
      sEnd.setHours(23, 59, 59, 999);
      const matchesDate = sDateObj >= sStart && sDateObj <= sEnd;
      const matchesStaff = selectedStaff === 'all' || sale.vendedora === selectedStaff;
      const matchesCategory = selectedCategory === 'all' || sale.items.some(item => {
        const product = localProductMap.get(item.productId);
        return product?.category === selectedCategory;
      });
      return matchesDate && matchesStaff && matchesCategory;
    });
  }, [sales, startDate, endDate, selectedStaff, selectedCategory, localProductMap]);

  const categories = Array.from(new Set(products.map(p => p.category)));

  const monthlyHighlights = useMemo(() => {
    const groups: { [key: string]: Sale[] } = {};
    
    filteredSales.forEach(sale => {
      if (sale.total <= 0) return;
      try {
        const d = getSafeDate(sale.date);
        const mName = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const capitalized = mName.charAt(0).toUpperCase() + mName.slice(1);
        
        if (!groups[capitalized]) {
          groups[capitalized] = [];
        }
        groups[capitalized].push(sale);
      } catch (e) {}
    });

    const monthsList = Object.entries(groups).map(([monthName, monthSales]) => {
      const sorted = [...monthSales].sort((a, b) => b.total - a.total);
      const bestSale = sorted[0] || null;
      const lowestSale = sorted[sorted.length - 1] || null;
      
      const totalRevenue = monthSales.reduce((acc, s) => acc + s.total, 0);
      const avgSale = monthSales.length > 0 ? totalRevenue / monthSales.length : 0;
      
      return {
        monthName,
        bestSale,
        lowestSale,
        totalRevenue,
        avgSale,
        count: monthSales.length
      };
    });

    const monthsMap: { [key: string]: number } = {
      janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
      julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
    };
    
    return monthsList.sort((a, b) => {
      const partsA = a.monthName.split(' de ');
      const partsB = b.monthName.split(' de ');
      const mA = monthsMap[partsA[0].toLowerCase()] || 0;
      const yA = Number(partsA[1]) || 0;
      const mB = monthsMap[partsB[0].toLowerCase()] || 0;
      const yB = Number(partsB[1]) || 0;
      return new Date(yB, mB, 1).getTime() - new Date(yA, mA, 1).getTime();
    });
  }, [filteredSales]);

  const priceBracketsAnalysis = useMemo(() => {
    const brackets = [
      { id: 'under_10', label: 'Até R$ 10', min: 0, max: 10, count: 0, totalValue: 0 },
      { id: '10_50', label: 'R$ 10 a R$ 50', min: 10.01, max: 50, count: 0, totalValue: 0 },
      { id: '51_100', label: 'R$ 51 a R$ 100', min: 50.01, max: 100, count: 0, totalValue: 0 },
      { id: '101_150', label: 'R$ 101 a R$ 150', min: 100.01, max: 150, count: 0, totalValue: 0 },
      { id: '151_200', label: 'R$ 151 a R$ 200', min: 150.01, max: 200, count: 0, totalValue: 0 },
      { id: '201_300', label: 'R$ 201 a R$ 300', min: 200.01, max: 300, count: 0, totalValue: 0 },
      { id: '301_500', label: 'R$ 301 a R$ 500', min: 300.01, max: 500, count: 0, totalValue: 0 },
      { id: 'over_500', label: 'Acima de R$ 500', min: 500.01, max: Infinity, count: 0, totalValue: 0 },
    ];

    filteredSales.forEach(sale => {
      const value = sale.total;
      const matchedBracket = brackets.find(b => value >= b.min && value <= b.max);
      if (matchedBracket) {
        matchedBracket.count++;
        matchedBracket.totalValue += value;
      }
    });

    const totalCount = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);

    return brackets.map(b => ({
      ...b,
      percentageCount: totalCount > 0 ? (b.count / totalCount) * 100 : 0,
      percentageRevenue: totalRevenue > 0 ? (b.totalValue / totalRevenue) * 100 : 0,
    }));
  }, [filteredSales]);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Relatório de Vendas - Biobel', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Período: ${new Date(startDate).toLocaleDateString()} até ${new Date(endDate).toLocaleDateString()}`, 105, 22, { align: 'center' });
    
    const tableData = filteredSales.map(sale => [
      formatDateWithDayOfWeek(sale.date),
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
      Data: formatDateWithDayOfWeek(sale.date),
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês Referência</label>
          <select 
            value={selectedMonthFilter}
            onChange={(e) => handleMonthFilterChange(e.target.value)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            <option value="all">TODOS (CONSOLIDADO)</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{m.toUpperCase()}</option>
            ))}
          </select>
        </div>
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

      {/* Atalhos Rápidos de Período */}
      <div className="flex flex-wrap gap-2 items-center bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1">
          <Clock size={12} className="text-blue-500" /> Períodos Rápidos:
        </span>
        <button
          onClick={() => setQuickPeriod('thisMonth')}
          className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded-xl shadow-xs transition-all border border-slate-200 dark:border-slate-700 uppercase tracking-wider"
        >
          Este Mês
        </button>
        <button
          onClick={() => setQuickPeriod('last30')}
          className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded-xl shadow-xs transition-all border border-slate-200 dark:border-slate-700 uppercase tracking-wider"
        >
          Últimos 30 Dias
        </button>
        <button
          onClick={() => setQuickPeriod('prevMonth')}
          className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded-xl shadow-xs transition-all border border-slate-200 dark:border-slate-700 uppercase tracking-wider"
        >
          Mês Anterior
        </button>
        <button
          onClick={() => setQuickPeriod('thisYear')}
          className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded-xl shadow-xs transition-all border border-slate-200 dark:border-slate-700 uppercase tracking-wider"
        >
          Este Ano
        </button>
      </div>

      {/* Navegação de Abas do Relatório */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setReportsTab('list')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap",
            reportsTab === 'list'
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          )}
        >
          <ClipboardList size={14} /> Lista de Vendas
        </button>
        <button
          onClick={() => setReportsTab('records')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap",
            reportsTab === 'records'
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          )}
        >
          <Trophy size={14} /> Recordes por Mês (Maiores/Menores)
        </button>
        <button
          onClick={() => setReportsTab('ranges')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap",
            reportsTab === 'ranges'
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          )}
        >
          <BarChart3 size={14} /> Faixas de Preço (Distribuição)
        </button>
        <button
          onClick={() => setReportsTab('commercial')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap",
            reportsTab === 'commercial'
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          )}
        >
          <TrendingUp size={14} /> Análise Comercial & Histórico
        </button>
      </div>

      {reportsTab === 'list' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Prévia dos Resultados</h3>
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase">
              {filteredSales.length} Vendas Encontradas
            </span>
          </div>

          {isFiltering ? (
            <div className="p-12 space-y-4">
              <div className="flex items-center gap-3 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/6"></div>
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-800"></div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2 animate-pulse">
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/5"></div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/3"></div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/6"></div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/12"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Desktop View Table */}
              <div className="overflow-x-auto hidden md:block">
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
                        <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-400">{formatDateWithDayOfWeek(sale.date)}</td>
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

              {/* Mobile View Card List */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSales.map(sale => (
                  <div key={sale.id} className="p-4 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate max-w-[200px]">{sale.customerName || 'Cliente não identificado'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{formatDateWithDayOfWeek(sale.date)}</p>
                      </div>
                      <span className="text-sm font-black text-blue-600 dark:text-blue-400">{formatCurrency(sale.total)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-1 border-t border-slate-50 dark:border-slate-800/50">
                      <span>Vend: <strong className="font-bold text-slate-700 dark:text-slate-300">{sale.vendedora}</strong></span>
                      <span>Pagamento: <strong className="font-bold text-slate-700 dark:text-slate-300">{sale.paymentMethod}</strong></span>
                    </div>
                  </div>
                ))}
                {filteredSales.length === 0 && (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                    <Search size={32} className="opacity-20" />
                    <p className="text-xs font-black uppercase tracking-widest">Nenhuma venda encontrada para os filtros selecionados</p>
                  </div>
                )}
                {filteredSales.length > 0 && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Acumulado:</span>
                    <span className="text-base font-black text-blue-600">{formatCurrency(filteredSales.reduce((acc, s) => acc + s.total, 0))}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {reportsTab === 'records' && (
        <div className="space-y-6">
          {monthlyHighlights.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-3">
              <Trophy size={32} className="opacity-20 text-slate-400" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nenhum dado de recordes para o filtro atual</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {monthlyHighlights.map(({ monthName, bestSale, lowestSale, totalRevenue, avgSale, count }) => (
                <div key={monthName} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">{monthName}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Faturamento: {formatCurrency(totalRevenue)} • {count} {count === 1 ? 'venda' : 'vendas'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-black uppercase">
                      Méd: {formatCurrency(avgSale)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Best Sale */}
                    {bestSale ? (
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden">
                        <div className="absolute right-0 top-0 translate-x-1 translate-y-1 opacity-10">
                          <ArrowUpRight size={56} className="text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Maior Venda (Recorde)</p>
                          </div>
                          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            {formatCurrency(bestSale.total)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase leading-tight truncate">
                            {bestSale.customerName || 'Cliente não identificado'}
                          </p>
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase mt-1">
                            <span className="truncate">Vend: {bestSale.vendedora}</span>
                            <span>{getSafeDate(bestSale.date).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-center text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sem dados de venda</p>
                      </div>
                    )}

                    {/* Lowest Sale */}
                    {lowestSale ? (
                      <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden">
                        <div className="absolute right-0 top-0 translate-x-1 translate-y-1 opacity-10">
                          <ArrowDownRight size={56} className="text-rose-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                            <p className="text-[9px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest">Menor Venda</p>
                          </div>
                          <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                            {formatCurrency(lowestSale.total)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase leading-tight truncate">
                            {lowestSale.customerName || 'Cliente não identificado'}
                          </p>
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase mt-1">
                            <span className="truncate">Vend: {lowestSale.vendedora}</span>
                            <span>{getSafeDate(lowestSale.date).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-center text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sem dados de venda</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {reportsTab === 'ranges' && (
        <div className="space-y-6">
          {filteredSales.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-3">
              <BarChart3 size={32} className="opacity-20 text-slate-400" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nenhum dado para o filtro atual</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Progress bars list */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Análise de Faixas de Preço</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Participação de cada faixa no volume de vendas</p>
                </div>
                <div className="space-y-4">
                  {priceBracketsAnalysis.map(bracket => (
                    <div key={bracket.id} className="space-y-1.5 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md text-[9px] font-black uppercase">
                            {bracket.label}
                          </span>
                          <span className="text-slate-400 font-medium">({bracket.count} {bracket.count === 1 ? 'venda' : 'vendas'})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-900 dark:text-white font-black">{formatCurrency(bracket.totalValue)}</span>
                          <span className="text-slate-400 font-medium text-[10px] ml-1">({bracket.percentageCount.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="relative h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                          style={{ width: `${bracket.percentageCount}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart representation */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Visualização Gráfica</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Distribuição do volume de vendas</p>
                    </div>
                  </div>
                  <div className="h-[280px] w-full mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priceBracketsAnalysis} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 8, fontWeight: 900, fill: '#64748B' }} />
                        <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} />
                        <RechartsTooltip 
                          cursor={{ fill: '#F8FAFC' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                          formatter={(value: any, name: any) => {
                            if (name === 'count') return [value, 'Vendas (Qtd)'];
                            if (name === 'totalValue') return [formatCurrency(Number(value)), 'Faturamento'];
                            return [value, name];
                          }}
                        />
                        <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="count">
                          {priceBracketsAnalysis.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#60a5fa'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mt-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Info size={16} />
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 leading-normal">
                    Dica: Use as faixas de preço para entender a faixa de ticket que mais atrai seus clientes e planejar campanhas ou combos de produtos nessa faixa!
                  </p>
                </div>
              </div>
            </div>
          )}

          {reportsTab === 'commercial' && (
            <CommercialAnalysisSection sales={filteredSales} formatCurrency={formatCurrency} />
          )}
        </div>
      )}
    </div>
  );
};

const CommercialAnalysisSection = ({ sales, formatCurrency }: { sales: any[], formatCurrency: (v: number) => string }) => {
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(5); // Friday by default
  const weekdayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  const weekdaySales = useMemo(() => {
    const datesMap: { [dateStr: string]: { dateStr: string; total: number; count: number } } = {};
    
    sales.forEach(sale => {
      if (sale.status !== 'completed' && sale.status !== 'Concluída') return;
      try {
        const d = getSafeDate(sale.date);
        if (d.getDay() === selectedDayOfWeek) {
          const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          const fullDateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
          if (!datesMap[fullDateStr]) {
            datesMap[fullDateStr] = { dateStr, total: 0, count: 0 };
          }
          datesMap[fullDateStr].total += sale.total;
          datesMap[fullDateStr].count += 1;
        }
      } catch (e) {}
    });

    return Object.entries(datesMap).map(([fullDateStr, value]) => {
      const parts = fullDateStr.split('/');
      return {
        sortKey: new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime(),
        dateStr: value.dateStr,
        total: value.total,
        count: value.count
      };
    }).sort((a, b) => a.sortKey - b.sortKey)
      .slice(-8); // show last 8 weeks
  }, [sales, selectedDayOfWeek]);

  const weekdayStats = useMemo(() => {
    if (weekdaySales.length === 0) return { avg: 0, max: 0, total: 0 };
    const totals = weekdaySales.map(d => d.total);
    const sum = totals.reduce((a, b) => a + b, 0);
    return {
      avg: sum / weekdaySales.length,
      max: Math.max(...totals),
      total: sum
    };
  }, [weekdaySales]);

  const hourlyAnalysis = useMemo(() => {
    const hoursMap: { [hour: number]: { hour: number; hourLabel: string; total: number; count: number } } = {};
    for (let h = 8; h <= 21; h++) {
      hoursMap[h] = { hour: h, hourLabel: `${h}h`, total: 0, count: 0 };
    }

    sales.forEach(sale => {
      if (sale.status !== 'completed' && sale.status !== 'Concluída') return;
      try {
        const h = getSaleLocalHours(sale);
        if (h >= 8 && h <= 21) {
          hoursMap[h].total += sale.total;
          hoursMap[h].count += 1;
        }
      } catch (e) {}
    });

    const hourlyData = Object.values(hoursMap);
    const activeHours = hourlyData.filter(d => d.total > 0);
    const peakHour = activeHours.length > 0 ? [...activeHours].sort((a, b) => b.total - a.total)[0] : null;
    const bottleneckHour = activeHours.length > 0 ? [...activeHours].sort((a, b) => a.total - b.total)[0] : null;

    return {
      hourlyData,
      peakHour,
      bottleneckHour,
      averageHourRevenue: activeHours.length > 0 ? activeHours.reduce((sum, d) => sum + d.total, 0) / activeHours.length : 0
    };
  }, [sales]);

  return (
    <div className="space-y-8 animate-fadeIn p-6">
      {/* Overview Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Widget: Weekday Comparison */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-150 dark:border-slate-800 p-8 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Calendar size={18} className="text-blue-500" />
                  Histórico Comparativo ({weekdayNames[selectedDayOfWeek]}s)
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Analise a evolução de faturamento de dias específicos</p>
              </div>
              
              {/* Selector */}
              <div className="flex bg-slate-100/60 dark:bg-slate-800 p-1 rounded-xl gap-0.5 overflow-x-auto">
                {[1, 2, 3, 4, 5, 6].map(dayIdx => (
                  <button
                    key={dayIdx}
                    onClick={() => setSelectedDayOfWeek(dayIdx)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors",
                      selectedDayOfWeek === dayIdx 
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs" 
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    )}
                  >
                    {weekdayNames[dayIdx].substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Weekday Stats cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none block mb-1">Média de Faturamento</span>
                <p className="text-sm font-black text-slate-800 dark:text-white font-mono">{formatCurrency(weekdayStats.avg)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none block mb-1">Faturamento Recorde</span>
                <p className="text-sm font-black text-emerald-500 font-mono">{formatCurrency(weekdayStats.max)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Faturado Total</span>
                <p className="text-sm font-black text-blue-500 font-mono">{formatCurrency(weekdayStats.total)}</p>
              </div>
            </div>

            {/* Line Chart */}
            {weekdaySales.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 italic">
                Nenhum faturamento registrado para {weekdayNames[selectedDayOfWeek]}s no período.
              </div>
            ) : (
              <div className="h-[240px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weekdaySales} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="dateStr" tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                      formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#3B82F6" 
                      strokeWidth={3} 
                      activeDot={{ r: 6 }} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-950/40 text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest leading-normal">
            💡 Dica Comercial: Use o histórico comparativo para entender se ações em dias específicos (ex: Sextas do coquetel) geram crescimento real ou sazonalidade comum.
          </div>
        </div>

        {/* Right Widget: Hourly & Peak Auditor */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-150 dark:border-slate-800 p-8 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Clock size={18} className="text-amber-500 animate-pulse" />
                Auditoria de Gargalos & Horários de Pico
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Mapeamento de tráfego e ociosidade de vendas</p>
            </div>

            {/* Hour Chart */}
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyAnalysis.hourlyData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="hourLabel" tick={{ fontSize: 8, fontWeight: 900, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                    formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                  />
                  <Bar dataKey="total" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Realtime Callouts */}
            <div className="space-y-3 pt-2">
              {hourlyAnalysis.peakHour && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">🔥 Horário Nobre (Pico)</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      O maior movimento ocorre às <strong>{hourlyAnalysis.peakHour.hour}h</strong>, acumulando <strong>{formatCurrency(hourlyAnalysis.peakHour.total)}</strong>. Garanta escalas cheias nesse período!
                    </p>
                  </div>
                </div>
              )}

              {hourlyAnalysis.bottleneckHour && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">⚠️ Gargalo de Ociosidade</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      O menor movimento foi às <strong>{hourlyAnalysis.bottleneckHour.hour}h</strong> ({formatCurrency(hourlyAnalysis.bottleneckHour.total)}). Ideal para pausas ou campanhas relâmpago!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-[10px] text-slate-500 leading-relaxed font-sans">
            📋 <strong>Plano de Ajuste de Escalas</strong>: Organize os horários de pausa para almoço e café entre 12h e 14h, e garanta que 100% da equipe de vendas esteja ativa no pico das {hourlyAnalysis.peakHour ? hourlyAnalysis.peakHour.hour : '17'}h às {hourlyAnalysis.peakHour ? hourlyAnalysis.peakHour.hour + 2 : '19'}h para elevar a conversão de vendas!
          </div>
        </div>

      </div>
    </div>
  );
};

const getWeatherForDate = (dateStr: string, override?: string) => {
  if (override) {
    if (override === 'sunny') return { type: 'sunny', label: 'Ensolarado', icon: '☀️', color: 'text-amber-600 bg-amber-500/5 border-amber-500/10 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30' };
    if (override === 'cloudy') return { type: 'cloudy', label: 'Nublado', icon: '☁️', color: 'text-slate-600 bg-slate-500/5 border-slate-500/10 dark:text-slate-400 dark:bg-slate-800/30 dark:border-slate-800' };
    if (override === 'rainy') return { type: 'rainy', label: 'Chuvoso', icon: '🌧️', color: 'text-blue-600 bg-blue-500/5 border-blue-500/10 dark:text-blue-400 dark:bg-blue-950/20 dark:border-blue-900/30' };
    if (override === 'partly_cloudy') return { type: 'partly_cloudy', label: 'Sol c/ Nuvens', icon: '⛅', color: 'text-orange-600 bg-orange-500/5 border-orange-500/10 dark:text-orange-400 dark:bg-orange-950/20 dark:border-orange-900/30' };
  }
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 4;
  const weathers = [
    { type: 'sunny', label: 'Ensolarado', icon: '☀️', color: 'text-amber-650 bg-amber-500/5 border-amber-500/10 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30' },
    { type: 'cloudy', label: 'Nublado', icon: '☁️', color: 'text-slate-600 bg-slate-500/5 border-slate-500/10 dark:text-slate-400 dark:bg-slate-800/30 dark:border-slate-800' },
    { type: 'rainy', label: 'Chuvoso', icon: '🌧️', color: 'text-blue-650 bg-blue-500/5 border-blue-500/10 dark:text-blue-400 dark:bg-blue-950/20 dark:border-blue-900/30' },
    { type: 'partly_cloudy', label: 'Sol c/ Nuvens', icon: '⛅', color: 'text-orange-650 bg-orange-500/5 border-orange-500/10 dark:text-orange-400 dark:bg-orange-950/20 dark:border-orange-900/30' }
  ];
  return weathers[index];
};

const getMonthTheme = (monthNum: number | null) => {
  const defaults = {
    cardClass: "bg-slate-50/50 dark:bg-slate-850/30 border-slate-100 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700",
    badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
    indicatorClass: "text-slate-450 dark:text-slate-500",
    bgBarClass: "bg-indigo-500"
  };

  if (!monthNum) return defaults;

  const themes: Record<number, typeof defaults> = {
    1: { // January: Rose/Red
      cardClass: "bg-rose-500/[0.02] dark:bg-rose-500/[0.01] border-rose-100 dark:border-rose-950/60 hover:border-rose-400 dark:hover:border-rose-800",
      badgeClass: "bg-rose-100/85 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/40",
      indicatorClass: "text-rose-550 dark:text-rose-400 font-extrabold",
      bgBarClass: "bg-rose-500"
    },
    2: { // February: Orange
      cardClass: "bg-orange-500/[0.02] dark:bg-orange-500/[0.01] border-orange-100 dark:border-orange-950/60 hover:border-orange-400 dark:hover:border-orange-800",
      badgeClass: "bg-orange-100/85 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200/50 dark:border-orange-900/40",
      indicatorClass: "text-orange-550 dark:text-orange-400 font-extrabold",
      bgBarClass: "bg-orange-500"
    },
    3: { // March: Amber
      cardClass: "bg-amber-500/[0.02] dark:bg-amber-500/[0.01] border-amber-100 dark:border-amber-950/60 hover:border-amber-400 dark:hover:border-amber-800",
      badgeClass: "bg-amber-100/85 dark:bg-amber-950/60 text-amber-700 dark:text-amber-350 border border-amber-200/50 dark:border-amber-900/40",
      indicatorClass: "text-amber-600 dark:text-amber-450 font-extrabold",
      bgBarClass: "bg-amber-500"
    },
    4: { // April: Yellow
      cardClass: "bg-yellow-500/[0.01] dark:bg-yellow-500/[0.01] border-yellow-100 dark:border-yellow-950/40 hover:border-yellow-300 dark:hover:border-yellow-700",
      badgeClass: "bg-yellow-100/80 dark:bg-yellow-950/50 text-yellow-850 dark:text-yellow-300 border border-yellow-200/40 dark:border-yellow-900/30",
      indicatorClass: "text-yellow-650 dark:text-yellow-400 font-extrabold",
      bgBarClass: "bg-yellow-500"
    },
    5: { // May: Lime
      cardClass: "bg-lime-500/[0.02] dark:bg-lime-500/[0.01] border-lime-100 dark:border-lime-950/60 hover:border-lime-400 dark:hover:border-lime-800",
      badgeClass: "bg-lime-100/85 dark:bg-lime-950/60 text-lime-700 dark:text-lime-350 border border-lime-200/50 dark:border-lime-900/40",
      indicatorClass: "text-lime-600 dark:text-lime-450 font-extrabold",
      bgBarClass: "bg-lime-500"
    },
    6: { // June: Green
      cardClass: "bg-green-500/[0.02] dark:bg-green-500/[0.01] border-green-100 dark:border-green-950/60 hover:border-green-400 dark:hover:border-green-800",
      badgeClass: "bg-green-100/85 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-200/50 dark:border-green-900/40",
      indicatorClass: "text-green-650 dark:text-green-400 font-extrabold",
      bgBarClass: "bg-green-500"
    },
    7: { // July: Sky Blue (Mês 07)
      cardClass: "bg-sky-500/[0.03] dark:bg-sky-500/[0.01] border-sky-200 dark:border-sky-900/50 hover:border-sky-450 dark:hover:border-sky-700",
      badgeClass: "bg-sky-100/95 dark:bg-sky-950/90 text-sky-750 dark:text-sky-300 border border-sky-200 dark:border-sky-900/50 shadow-3xs",
      indicatorClass: "text-sky-650 dark:text-sky-400 font-extrabold",
      bgBarClass: "bg-sky-500"
    },
    8: { // August: Emerald (Mês 08)
      cardClass: "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.01] border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-450 dark:hover:border-emerald-700",
      badgeClass: "bg-emerald-100/95 dark:bg-emerald-950/90 text-emerald-750 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 shadow-3xs",
      indicatorClass: "text-emerald-650 dark:text-emerald-400 font-extrabold",
      bgBarClass: "bg-emerald-500"
    },
    9: { // September: Teal
      cardClass: "bg-teal-500/[0.02] dark:bg-teal-500/[0.01] border-teal-100 dark:border-teal-950/60 hover:border-teal-400 dark:hover:border-teal-800",
      badgeClass: "bg-teal-100/85 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-900/40",
      indicatorClass: "text-teal-650 dark:text-teal-400 font-extrabold",
      bgBarClass: "bg-teal-500"
    },
    10: { // October: Indigo
      cardClass: "bg-indigo-500/[0.02] dark:bg-indigo-500/[0.01] border-indigo-100 dark:border-indigo-950/60 hover:border-indigo-400 dark:hover:border-indigo-800",
      badgeClass: "bg-indigo-100/85 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/40",
      indicatorClass: "text-indigo-650 dark:text-indigo-400 font-extrabold",
      bgBarClass: "bg-indigo-500"
    },
    11: { // November: Purple
      cardClass: "bg-purple-500/[0.02] dark:bg-purple-500/[0.01] border-purple-100 dark:border-purple-950/60 hover:border-purple-400 dark:hover:border-purple-800",
      badgeClass: "bg-purple-100/85 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-900/40",
      indicatorClass: "text-purple-650 dark:text-purple-400 font-extrabold",
      bgBarClass: "bg-purple-500"
    },
    12: { // December: Fuchsia
      cardClass: "bg-fuchsia-500/[0.02] dark:bg-fuchsia-500/[0.01] border-fuchsia-100 dark:border-fuchsia-950/60 hover:border-fuchsia-400 dark:hover:border-fuchsia-800",
      badgeClass: "bg-fuchsia-100/85 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200/50 dark:border-fuchsia-900/40",
      indicatorClass: "text-fuchsia-650 dark:text-fuchsia-400 font-extrabold",
      bgBarClass: "bg-fuchsia-500"
    }
  };

  return themes[monthNum] || defaults;
};

interface PastWeekdaySalesTrackerProps {
  sales: any[];
  formatCurrency: (value: number) => string;
  isCompact?: boolean;
  setActiveTab?: (tab: string) => void;
  handleStartEmptyVenda?: () => void;
}

export const PastWeekdaySalesTracker = ({ 
  sales, 
  formatCurrency, 
  isCompact = false,
  setActiveTab,
  handleStartEmptyVenda
}: PastWeekdaySalesTrackerProps) => {
  const today = new Date();
  const todayDow = today.getDay();
  const [selectedDow, setSelectedDow] = useState<number>(todayDow === 0 ? 1 : todayDow);
  const [weatherOverrides, setWeatherOverrides] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('biobel_weather_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [chartViewMode, setChartViewMode] = useState<'cumulative' | 'hourly'>('cumulative');

  const toggleWeatherForDate = (dateStr: string) => {
    const current = weatherOverrides[dateStr] || getWeatherForDate(dateStr).type;
    const order = ['sunny', 'partly_cloudy', 'cloudy', 'rainy'];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    const nextWeather = order[nextIdx];
    
    const updated = { ...weatherOverrides, [dateStr]: nextWeather };
    setWeatherOverrides(updated);
    try {
      localStorage.setItem('biobel_weather_overrides', JSON.stringify(updated));
    } catch (e) {}
  };

  const stats = useMemo(() => {
    const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    const getLocalYMD = (dateObj: Date): string => {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const todayStr = getLocalYMD(today);

    const group: { 
      [dateStr: string]: { 
        total: number; 
        count: number; 
        dateObj: Date;
        morningCount: number;
        morningTotal: number;
        afternoonCount: number;
        afternoonTotal: number;
        salesList: { dateObj: Date; total: number; vendedora: string }[];
        sellers: {
          [name: string]: {
            total: number;
            count: number;
            morningTotal: number;
            morningCount: number;
            afternoonTotal: number;
            afternoonCount: number;
          }
        }
      } 
    } = {};

    const sellerWeekdayStats: {
      [name: string]: {
        total: number;
        count: number;
        morningTotal: number;
        morningCount: number;
        afternoonTotal: number;
        afternoonCount: number;
      }
    } = {};

    sales.forEach(s => {
      if (!s.date || s.status !== 'completed' || s.total <= 0) return;
      try {
        const saleDate = getSafeDate(s.date);
        const exactDateStr = getLocalYMD(saleDate);

        if (saleDate.getDay() === selectedDow) {
          if (!group[exactDateStr]) {
            group[exactDateStr] = { 
              total: 0, 
              count: 0, 
              dateObj: saleDate,
              morningCount: 0,
              morningTotal: 0,
              afternoonCount: 0,
              afternoonTotal: 0,
              salesList: [],
              sellers: {}
            };
          }
          group[exactDateStr].total += s.total;
          group[exactDateStr].count += 1;
          const normalizedSellerName = normalizeVendedoraName(s.vendedora);
          group[exactDateStr].salesList.push({
            dateObj: saleDate,
            total: s.total,
            vendedora: normalizedSellerName
          });

          const hrs = getSaleLocalHours(s);
          const isMorning = hrs < 12;

          if (isMorning) {
            group[exactDateStr].morningCount += 1;
            group[exactDateStr].morningTotal += s.total;
          } else {
            group[exactDateStr].afternoonCount += 1;
            group[exactDateStr].afternoonTotal += s.total;
          }

          const sellerName = normalizedSellerName;
          
          // Per day sellers
          if (!group[exactDateStr].sellers[sellerName]) {
            group[exactDateStr].sellers[sellerName] = {
              total: 0,
              count: 0,
              morningTotal: 0,
              morningCount: 0,
              afternoonTotal: 0,
              afternoonCount: 0
            };
          }
          const sDayData = group[exactDateStr].sellers[sellerName];
          sDayData.total += s.total;
          sDayData.count += 1;
          if (isMorning) {
            sDayData.morningTotal += s.total;
            sDayData.morningCount += 1;
          } else {
            sDayData.afternoonTotal += s.total;
            sDayData.afternoonCount += 1;
          }

          // Cumulative weekday sellers
          if (!sellerWeekdayStats[sellerName]) {
            sellerWeekdayStats[sellerName] = {
              total: 0,
              count: 0,
              morningTotal: 0,
              morningCount: 0,
              afternoonTotal: 0,
              afternoonCount: 0
            };
          }
          const sWkData = sellerWeekdayStats[sellerName];
          sWkData.total += s.total;
          sWkData.count += 1;
          if (isMorning) {
            sWkData.morningTotal += s.total;
            sWkData.morningCount += 1;
          } else {
            sWkData.afternoonTotal += s.total;
            sWkData.afternoonCount += 1;
          }
        }
      } catch (e) {
        // safe guard
      }
    });

    const list = Object.entries(group)
      .map(([dateStr, data]) => {
        const isToday = dateStr === todayStr;

        // Find top seller for this specific day overall
        let topSellerName = '';
        let topSellerTotal = 0;
        let topSellerCount = 0;
        let topSellerMorningTotal = 0;
        let topSellerMorningCount = 0;
        let topSellerAfternoonTotal = 0;
        let topSellerAfternoonCount = 0;

        // Find top seller for Morning specifically
        let morningTopSellerName = '';
        let morningTopSellerTotal = 0;
        let morningTopSellerCount = 0;

        // Find top seller for Afternoon specifically
        let afternoonTopSellerName = '';
        let afternoonTopSellerTotal = 0;
        let afternoonTopSellerCount = 0;

        Object.entries(data.sellers).forEach(([name, sData]) => {
          if (sData.total > topSellerTotal) {
            topSellerName = name;
            topSellerTotal = sData.total;
            topSellerCount = sData.count;
            topSellerMorningTotal = sData.morningTotal;
            topSellerMorningCount = sData.morningCount;
            topSellerAfternoonTotal = sData.afternoonTotal;
            topSellerAfternoonCount = sData.afternoonCount;
          }

          if (sData.morningTotal > morningTopSellerTotal) {
            morningTopSellerName = name;
            morningTopSellerTotal = sData.morningTotal;
            morningTopSellerCount = sData.morningCount;
          }

          if (sData.afternoonTotal > afternoonTopSellerTotal) {
            afternoonTopSellerName = name;
            afternoonTopSellerTotal = sData.afternoonTotal;
            afternoonTopSellerCount = sData.afternoonCount;
          }
        });

        const sortedSales = [...data.salesList].sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
        const pauses: { from: string; to: string; duration: number }[] = [];
        for (let i = 1; i < sortedSales.length; i++) {
          const prev = sortedSales[i - 1].dateObj;
          const curr = sortedSales[i].dateObj;
          const diffMs = curr.getTime() - prev.getTime();
          const diffMin = Math.round(diffMs / (1000 * 60));
          if (diffMin >= 45) {
            const formatTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            pauses.push({
              from: formatTime(prev),
              to: formatTime(curr),
              duration: diffMin
            });
          }
        }
        pauses.sort((a, b) => b.duration - a.duration);

        return {
          dateStr,
          isToday,
          formattedDate: isToday ? "Hoje (Atual)" : data.dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          total: data.total,
          count: data.count,
          dateObj: data.dateObj,
          morningCount: data.morningCount,
          morningTotal: data.morningTotal,
          afternoonCount: data.afternoonCount,
          afternoonTotal: data.afternoonTotal,
          pauses,
          topSeller: topSellerTotal > 0 ? {
            name: topSellerName,
            total: topSellerTotal,
            count: topSellerCount,
            morningTotal: topSellerMorningTotal,
            morningCount: topSellerMorningCount,
            afternoonTotal: topSellerAfternoonTotal,
            afternoonCount: topSellerAfternoonCount
          } : null,
          morningTopSeller: morningTopSellerTotal > 0 ? {
            name: morningTopSellerName,
            total: morningTopSellerTotal,
            count: morningTopSellerCount
          } : null,
          afternoonTopSeller: afternoonTopSellerTotal > 0 ? {
            name: afternoonTopSellerName,
            total: afternoonTopSellerTotal,
            count: afternoonTopSellerCount
          } : null
        };
      });

    // Separate today from past history to avoid skewing past averages
    const todayItem = list.find(item => item.isToday);
    const pastItems = list.filter(item => !item.isToday).sort((a, b) => b.dateStr.localeCompare(a.dateStr)); // Most recent first

    const totalSum = pastItems.reduce((acc, curr) => acc + curr.total, 0);
    const average = pastItems.length > 0 ? totalSum / pastItems.length : 0;

    const pastCounts = pastItems.map(item => item.count);
    const minAtendimentos = pastCounts.length > 0 ? Math.min(...pastCounts) : 0;
    const maxAtendimentos = pastCounts.length > 0 ? Math.max(...pastCounts) : 0;

    const pastMorningCounts = pastItems.map(item => item.morningCount);
    const minAtendimentosManha = pastMorningCounts.length > 0 ? Math.min(...pastMorningCounts) : 0;
    const maxAtendimentosManha = pastMorningCounts.length > 0 ? Math.max(...pastMorningCounts) : 0;

    const pastAfternoonCounts = pastItems.map(item => item.afternoonCount);
    const minAtendimentosTarde = pastAfternoonCounts.length > 0 ? Math.min(...pastAfternoonCounts) : 0;
    const maxAtendimentosTarde = pastAfternoonCounts.length > 0 ? Math.max(...pastAfternoonCounts) : 0;

    // Determine general weekday highlights (cumulative)
    let queenSeller = { name: 'Sem registros', total: 0, count: 0 };
    let morningStar = { name: 'Sem registros', total: 0, count: 0 };
    let afternoonStar = { name: 'Sem registros', total: 0, count: 0 };

    Object.entries(sellerWeekdayStats).forEach(([name, sWkData]) => {
      if (sWkData.total > queenSeller.total) {
        queenSeller = { name, total: sWkData.total, count: sWkData.count };
      }
      if (sWkData.morningTotal > morningStar.total) {
        morningStar = { name, total: sWkData.morningTotal, count: sWkData.morningCount };
      }
      if (sWkData.afternoonTotal > afternoonStar.total) {
        afternoonStar = { name, total: sWkData.afternoonTotal, count: sWkData.afternoonCount };
      }
    });

    // Label past weeks so we retain their chronological label even when sorted by faturamento ranking!
    const pastItemsMapped = pastItems.slice(0, 4).map((item, idx) => ({
      ...item,
      label: `${idx + 1}ª sem. atrás`
    }));

    // If selectedDow is today's day of week, inject today
    let combinedList = [...pastItemsMapped];
    if (selectedDow === todayDow) {
      const todayMapped = todayItem ? {
        ...todayItem,
        label: "Hoje (Atual) ⚡"
      } : {
        dateStr: todayStr,
        isToday: true,
        formattedDate: "Hoje (Atual)",
        total: 0,
        count: 0,
        dateObj: today,
        label: "Hoje (Atual) ⚡",
        morningCount: 0,
        morningTotal: 0,
        afternoonCount: 0,
        afternoonTotal: 0,
        topSeller: null,
        morningTopSeller: null,
        afternoonTopSeller: null,
        pauses: []
      };
      combinedList = [todayMapped, ...pastItemsMapped];
    }

    // Sort by revenue descending (highest first) to show the daily climbing rank!
    const rankedRecentHistory = [...combinedList].sort((a, b) => b.total - a.total);

    return {
      weekdayName: daysOfWeek[selectedDow],
      weekdayNameFull: selectedDow === 0 || selectedDow === 6 ? daysOfWeek[selectedDow] : `${daysOfWeek[selectedDow]}-feira`,
      history: list,
      recentHistory: rankedRecentHistory,
      average,
      totalSum,
      occurrencesCount: pastItems.length,
      minAtendimentos,
      maxAtendimentos,
      minAtendimentosManha,
      maxAtendimentosManha,
      minAtendimentosTarde,
      maxAtendimentosTarde,
      queenSeller,
      morningStar,
      afternoonStar
    };
  }, [sales, selectedDow]);

  const getLineColor = (label: string, isToday: boolean, isChampion: boolean) => {
    if (isChampion) return '#eab308'; // Amber/Gold (matches CAMPEÃO color palette)
    if (isToday) return '#6366f1'; // Indigo
    if (label.includes('1ª')) return '#06b6d4'; // Cyan/Blue
    if (label.includes('2ª')) return '#10b981'; // Emerald/Green
    if (label.includes('3ª')) return '#ec4899'; // Pink/Rose
    if (label.includes('4ª')) return '#8b5cf6'; // Violet/Purple
    return '#64748b'; // Slate gray
  };

  const chartData = useMemo(() => {
    const startHour = 9;
    const endHour = 19;
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
    
    const dataPoints = hours.map(h => {
      const hourLabel = `${String(h).padStart(2, '0')}h`;
      return { hour: h, hourLabel };
    });

    stats.recentHistory.forEach((day) => {
      const daySales = sales.filter(s => {
        if (!s.date || s.status !== 'completed' || s.total <= 0) return false;
        try {
          const saleDate = getSafeDate(s.date);
          const y = saleDate.getFullYear();
          const m = String(saleDate.getMonth() + 1).padStart(2, '0');
          const d = String(saleDate.getDate()).padStart(2, '0');
          const exactDateStr = `${y}-${m}-${d}`;
          return exactDateStr === day.dateStr;
        } catch (e) {
          return false;
        }
      });

      const salesByHour: Record<number, number> = {};
      hours.forEach(h => {
        salesByHour[h] = 0;
      });

      daySales.forEach(s => {
        const hr = getSaleLocalHours(s);
        if (hr >= startHour && hr <= endHour) {
          salesByHour[hr] = (salesByHour[hr] || 0) + s.total;
        } else if (hr < startHour) {
          salesByHour[startHour] = (salesByHour[startHour] || 0) + s.total;
        }
      });

      let cumulative = 0;
      hours.forEach((h, idx) => {
        const hourlyValue = salesByHour[h] || 0;
        cumulative += hourlyValue;
        
        const pt = dataPoints[idx] as any;
        pt[`${day.label}_hourly`] = hourlyValue;
        pt[`${day.label}_cumulative`] = cumulative;
      });
    });

    return dataPoints;
  }, [sales, stats.recentHistory]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xl backdrop-blur-xs text-left text-xs space-y-2 max-w-sm">
          <p className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-850 pb-1.5 flex items-center justify-between gap-4">
            <span>📅 Comparativo Horário</span>
            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded text-[9px]">{label}</span>
          </p>
          <div className="space-y-1.5">
            {sortedPayload.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.stroke }} />
                  <span className="text-slate-600 dark:text-slate-400 font-bold truncate">
                    {item.name}
                  </span>
                </div>
                <span className="font-mono font-black text-slate-900 dark:text-white shrink-0">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const weeklyStats = useMemo(() => {
    const todayVal = new Date();
    const todayDowVal = todayVal.getDay();
    
    // Monday of this week (00:00:00)
    const mondayThisWeek = new Date(todayVal);
    const diffThis = todayDowVal === 0 ? -6 : 1 - todayDowVal;
    mondayThisWeek.setDate(todayVal.getDate() + diffThis);
    mondayThisWeek.setHours(0, 0, 0, 0);

    // Sunday of this week (23:59:59)
    const sundayThisWeek = new Date(mondayThisWeek);
    sundayThisWeek.setDate(mondayThisWeek.getDate() + 6);
    sundayThisWeek.setHours(23, 59, 59, 999);

    // Monday of last week
    const mondayLastWeek = new Date(mondayThisWeek);
    mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);
    mondayLastWeek.setHours(0, 0, 0, 0);

    // Sunday of last week
    const sundayLastWeek = new Date(mondayThisWeek);
    sundayLastWeek.setDate(mondayThisWeek.getDate() - 1);
    sundayLastWeek.setHours(23, 59, 59, 999);

    let thisWeekSum = 0;
    let thisWeekCount = 0;
    let lastWeekSum = 0;
    let lastWeekCount = 0;

    sales.forEach(s => {
      if (s.status !== 'completed' || s.total <= 0) return;
      try {
        const sd = getSafeDate(s.date);
        const sdTime = sd.getTime();
        if (sdTime >= mondayThisWeek.getTime() && sdTime <= sundayThisWeek.getTime()) {
          thisWeekSum += s.total;
          thisWeekCount += 1;
        } else if (sdTime >= mondayLastWeek.getTime() && sdTime <= sundayLastWeek.getTime()) {
          lastWeekSum += s.total;
          lastWeekCount += 1;
        }
      } catch (e) {}
    });

    let growth = 0;
    if (lastWeekSum > 0) {
      growth = ((thisWeekSum - lastWeekSum) / lastWeekSum) * 100;
    } else if (thisWeekSum > 0) {
      growth = 100;
    }

    return {
      thisWeekSum,
      thisWeekCount,
      lastWeekSum,
      lastWeekCount,
      growth,
      mondayThisWeek,
      sundayThisWeek
    };
  }, [sales]);

  const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  if (!sales || sales.length === 0) return null;

  if (isCompact) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 p-4 space-y-4 text-left relative overflow-hidden transition-colors">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 p-4 opacity-[0.01] text-indigo-500 pointer-events-none">
          <Calendar size={60} />
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 relative z-10 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar size={14} className="text-indigo-500 shrink-0" />
            <h3 className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest font-sans truncate">
              Histórico das {stats.weekdayName}s
            </h3>
          </div>
          <select
            value={selectedDow}
            onChange={(e) => setSelectedDow(Number(e.target.value))}
            className="text-[9px] font-black bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-350 focus:outline-none uppercase cursor-pointer"
          >
            {daysOfWeek.map((day, idx) => {
              if (idx === 0) return null;
              return (
                <option key={day} value={idx}>{day}{idx === todayDow ? ' (Hoje)' : ''}</option>
              );
            })}
          </select>
        </div>

        <div className="flex justify-between items-center bg-indigo-500/[0.04] dark:bg-indigo-950/20 px-4 py-2.5 rounded-xl border border-indigo-100/30 dark:border-indigo-900/10 gap-2">
          <div>
            <p className="text-[7.5px] font-black text-indigo-500 dark:text-indigo-455 uppercase tracking-widest text-left leading-none">Fat. Médio</p>
            <p className="text-[12px] font-black text-indigo-600 dark:text-indigo-400 font-display mt-1 leading-none">{formatCurrency(stats.average)}</p>
          </div>
          <div className="text-right">
            <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none">Amostra</p>
            <p className="text-[10px] font-black text-slate-700 dark:text-slate-350 mt-1 leading-none">{stats.occurrencesCount} {stats.occurrencesCount === 1 ? 'dia' : 'dias'}</p>
          </div>
        </div>

        {stats.history.length > 0 ? (
          <div className="space-y-3 relative z-10">
            <div className="space-y-2 col-span-1">
              {stats.recentHistory.map((item, index) => {
                const maxVal = Math.max(...stats.recentHistory.map(d => d.total), 1);
                const widthPct = (item.total / maxVal) * 100;
                const isAboveAverage = item.total >= stats.average;

                const dObj = item.dateObj;
                let monthNum: number | null = null;
                let monthName = '';
                if (dObj instanceof Date && !isNaN(dObj.getTime())) {
                  monthNum = dObj.getMonth() + 1;
                  monthName = dObj.toLocaleString('pt-BR', { month: 'long' });
                } else if (typeof item.dateStr === 'string' && item.dateStr.includes('-')) {
                  const parts = item.dateStr.split('-');
                  monthNum = parseInt(parts[1], 10);
                  const tempDate = new Date(2026, monthNum - 1, 15);
                  monthName = tempDate.toLocaleString('pt-BR', { month: 'long' });
                }
                const mTheme = getMonthTheme(monthNum);

                return (
                  <div 
                    key={item.dateStr} 
                    className={cn(
                      "p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-3 hover:scale-[1.01] hover:shadow-2xs",
                      item.isToday
                        ? "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-500/40 shadow-2xs"
                        : index === 0
                          ? "bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-yellow-500/10 dark:from-amber-950/40 dark:to-yellow-950/20 border-amber-400 ring-2 ring-amber-400/50 shadow-md"
                          : isAboveAverage 
                            ? `${mTheme.cardClass} border-emerald-550/15` 
                            : mTheme.cardClass
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={cn(
                          "text-[8px] font-black uppercase tracking-wide leading-none",
                          item.isToday ? "text-indigo-600 dark:text-indigo-400" : index === 0 ? "text-amber-700 dark:text-amber-400 font-black" : mTheme.indicatorClass
                        )}>
                          {item.label} ({item.isToday ? 'Hoje' : `${item.formattedDate.slice(0, 5)} • Mês ${String(monthNum).padStart(2, '0')}`})
                        </p>
                        <span className={cn(
                          "text-[7px] font-black px-1 py-0.2 rounded-xs uppercase tracking-wider",
                          index === 0 ? "bg-amber-400 text-amber-950 shadow-3xs" :
                          item.isToday ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 animate-pulse" :
                          "bg-slate-150 dark:bg-slate-800 text-slate-500"
                        )}>
                          {index === 0 ? "🏆 MELHOR" : `#${index + 1}º`}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            item.isToday ? "bg-indigo-500" : mTheme.bgBarClass
                          )}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      {item.morningTopSeller && item.afternoonTopSeller && item.morningTopSeller.name === item.afternoonTopSeller.name ? (
                        <div className="mt-1.5 flex items-center gap-1 text-[7.5px] font-black text-amber-600 dark:text-amber-450 uppercase tracking-tight leading-none">
                          <Trophy size={8} className="text-amber-500 shrink-0" />
                          <span className="truncate">🏆 M+T: <strong className="text-slate-750 dark:text-slate-300 font-extrabold">{item.morningTopSeller.name}</strong> ({formatCurrency(item.morningTopSeller.total + item.afternoonTopSeller.total)})</span>
                        </div>
                      ) : (
                        <div className="mt-1.5 space-y-0.5">
                          {item.morningTopSeller && (
                            <div className="flex items-center gap-1 text-[7.2px] font-black text-amber-600 dark:text-amber-450 uppercase tracking-tight leading-none">
                              <span>☀️ M:</span>
                              <span className="truncate"><strong className="text-slate-750 dark:text-slate-300 font-extrabold">{item.morningTopSeller.name}</strong> ({formatCurrency(item.morningTopSeller.total)})</span>
                            </div>
                          )}
                          {item.afternoonTopSeller && (
                            <div className="flex items-center gap-1 text-[7.2px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight leading-none">
                              <span>🌙 T:</span>
                              <span className="truncate"><strong className="text-slate-750 dark:text-slate-300 font-extrabold">{item.afternoonTopSeller.name}</strong> ({formatCurrency(item.afternoonTopSeller.total)})</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <p className="text-xs font-black text-slate-900 dark:text-white font-display leading-none">
                        {formatCurrency(item.total)}
                      </p>
                      <p className="text-[7.5px] font-bold text-slate-455 uppercase mt-1 leading-none">
                        {item.count} {item.count === 1 ? 'venda' : 'vendas'}
                      </p>
                      <div className="text-[6.5px] font-black text-slate-400 mt-1 flex flex-col items-end gap-0.5 leading-none uppercase">
                        <span>☀️ M: {item.morningCount}v ({formatCurrency(item.morningTotal)})</span>
                        <span>🌙 T: {item.afternoonCount}v ({formatCurrency(item.afternoonTotal)})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 bg-gradient-to-r from-indigo-500/[0.03] to-indigo-600/[0.05] border border-indigo-500/10 rounded-xl text-center">
              <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                🎯 Meta recomendada: {formatCurrency(stats.average)}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center bg-slate-50 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/50">
            <p className="text-[9px] font-black text-slate-400 uppercase">Sem histórico suficiente</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-805 shadow-sm p-6 md:p-8 space-y-6 text-left relative overflow-hidden",
      isCompact && "p-5 md:p-6 rounded-[28px]"
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-indigo-500 pointer-events-none">
        <Calendar size={120} />
      </div>

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-slate-100 dark:border-slate-800/80 pb-6 relative z-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500 animate-pulse" />
            <h3 className="text-xs font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest font-sans">
              Histórico Comparativo das {stats.weekdayName}s
            </h3>
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight font-sans mt-1">
            Como foi seu faturamento nas últimas {stats.weekdayName}s?
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase">
            Compare o faturamento de hoje com os mesmos dias das semanas anteriores
          </p>
        </div>

        {/* Info stats block */}
        <div className="dashboard-header-stats flex flex-wrap items-center gap-3 self-stretch sm:self-auto">
          {/* Faturamento Médio */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-950/20 px-4 py-2 rounded-2xl flex items-center gap-3 shrink-0">
            <div>
              <p className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest text-left leading-none">Faturamento Médio</p>
              <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-display mt-1 leading-none">{formatCurrency(stats.average)}</p>
            </div>
          </div>

          {/* Amostra */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 px-4 py-2 rounded-2xl flex flex-col justify-center">
            <p className="text-[8px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest leading-none">Amostra</p>
            <p className="text-xs font-black text-slate-750 dark:text-slate-300 leading-none mt-1">{stats.occurrencesCount} {stats.occurrencesCount === 1 ? 'dia' : 'dias'}</p>
          </div>
        </div>
      </div>

      {/* 📈 RESUMO DE DESEMPENHO DA SEMANA ATUAL ("COMO ESTÁ A SEMANA") */}
      <div className="bg-gradient-to-r from-emerald-500/[0.04] via-teal-500/[0.02] to-transparent border border-emerald-500/15 dark:border-emerald-500/10 rounded-3xl p-5 relative overflow-hidden group hover:shadow-xs transition-all relative z-10 space-y-4">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-emerald-500 pointer-events-none">
          <Sparkles size={100} />
        </div>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Como está a semana atual? 📈
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-extrabold uppercase">
              Acompanhamento semanal de faturamento de Segunda a Sábado
            </p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">
              De {weeklyStats.mondayThisWeek.toLocaleDateString('pt-BR')} até {weeklyStats.sundayThisWeek.toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 px-4 py-2.5 rounded-2xl flex-1 sm:flex-none">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Faturamento Esta Semana</p>
              <p className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {formatCurrency(weeklyStats.thisWeekSum)}
              </p>
              <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{weeklyStats.thisWeekCount} vendas</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 px-4 py-2.5 rounded-2xl flex-1 sm:flex-none">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Semana Anterior</p>
              <p className="text-sm font-black text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {formatCurrency(weeklyStats.lastWeekSum)}
              </p>
              <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{weeklyStats.lastWeekCount} vendas</p>
            </div>

            <div className={cn(
              "px-4 py-2.5 rounded-2xl border font-mono flex flex-col justify-center flex-1 sm:flex-none min-w-[100px]",
              weeklyStats.growth >= 0
                ? "bg-emerald-500/10 border-emerald-200/30 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-200/30 text-rose-600 dark:text-rose-400"
            )}>
              <p className="text-[8px] font-black uppercase tracking-widest leading-none">Variação</p>
              <p className="text-sm font-black mt-1 leading-none">
                {weeklyStats.growth >= 0 ? '▲ +' : '▼ '}
                {Math.abs(weeklyStats.growth).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* ALERTA EDUCACIONAL SOBRE VALORES ZERADOS */}
        {weeklyStats.thisWeekSum === 0 && (
          <div className="mt-4 p-4.5 bg-amber-500/[0.04] dark:bg-amber-500/[0.02] border border-amber-500/20 rounded-2xl text-left space-y-3 relative z-20">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-450 tracking-wider">
                  Nenhum faturamento registrado na SEMANA CORRENTE (atual)
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                  Não se preocupe! Seus dados de faturamento histórico importados de meses anteriores estão <strong>totalmente salvos</strong> no sistema. Este aviso apenas indica que, para a semana atual (de {weeklyStats.mondayThisWeek.toLocaleDateString('pt-BR')} a {weeklyStats.sundayThisWeek.toLocaleDateString('pt-BR')}), ainda não há novas vendas lançadas.
                </p>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-500 font-semibold leading-relaxed">
                  Para começar a ver dados de faturamento nesta semana atual ou lançar novas vendas, escolha uma das ações a seguir:
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1 pl-0 sm:pl-7">
              <button
                onClick={() => {
                  if (handleStartEmptyVenda) {
                    handleStartEmptyVenda();
                  } else {
                    const btn = document.querySelector('[class*="bg-emerald-600"]');
                    if (btn instanceof HTMLButtonElement) btn.click();
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Plus size={11} /> Preencher Manualmente (Nova Venda)
              </button>

              <button
                onClick={() => {
                  if (setActiveTab) {
                    setActiveTab('backup');
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Database size={11} /> Ir em Backup e Subir Planilha
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Weekday Selector Buttons */}
      <div className="flex flex-wrap gap-2 relative z-10 border-b border-slate-50 dark:border-slate-800/30 pb-4">
        {daysOfWeek.map((day, dIdx) => {
          if (dIdx === 0) return null;
          const isSelected = selectedDow === dIdx;
          const isToday = dIdx === todayDow;
          return (
            <button
              key={day}
              onClick={() => setSelectedDow(dIdx)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5 hover:scale-[1.02] cursor-pointer",
                isSelected
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs scale-102"
                  : isToday
                    ? "bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/30 font-extrabold"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750"
              )}
            >
              {day} {isToday && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" title="Hoje" />}
            </button>
          );
        })}
      </div>

      {stats.history.length > 0 ? (
        <div className="space-y-6 relative z-10">
          {/* Quadro de Honra / Motivational Highlights of the Weekday */}
          <div className="bg-gradient-to-r from-amber-500/[0.04] via-indigo-500/[0.03] to-purple-500/[0.04] border border-amber-500/15 dark:border-amber-500/10 rounded-[30px] p-5 relative overflow-hidden grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Main Queen */}
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xs p-4 rounded-2xl border border-amber-200/50 dark:border-amber-900/20 flex items-center gap-3.5 relative overflow-hidden group hover:scale-[1.01] hover:shadow-xs transition-all text-left">
              <div className="absolute top-0 right-0 p-1 opacity-10 text-amber-500 group-hover:scale-110 transition-transform">
                <Trophy size={48} />
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-650 dark:text-amber-400 shrink-0 shadow-xs">
                <Trophy size={20} className="animate-bounce" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 block">
                  Rainha das {stats.weekdayName}s 👑
                </span>
                <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase mt-0.5">
                  {stats.queenSeller.name}
                </p>
                <div className="flex justify-between text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                  <span>Total: {formatCurrency(stats.queenSeller.total)}</span>
                  <span>({stats.queenSeller.count} v)</span>
                </div>
              </div>
            </div>

            {/* Morning Star */}
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xs p-4 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 flex items-center gap-3.5 relative overflow-hidden group hover:scale-[1.01] hover:shadow-xs transition-all text-left">
              <div className="absolute top-0 right-0 p-1 opacity-10 text-sky-500 group-hover:scale-110 transition-transform">
                <Sun size={48} />
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 shadow-xs">
                <Sun size={20} className="animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[8px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-450 block">
                  Estrela da Manhã (☀️)
                </span>
                <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase mt-0.5">
                  {stats.morningStar.name}
                </p>
                <div className="flex justify-between text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                  <span>Manhã: {formatCurrency(stats.morningStar.total)}</span>
                  <span>({stats.morningStar.count} v)</span>
                </div>
              </div>
            </div>

            {/* Afternoon Star */}
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xs p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20 flex items-center gap-3.5 relative overflow-hidden group hover:scale-[1.01] hover:shadow-xs transition-all text-left">
              <div className="absolute top-0 right-0 p-1 opacity-10 text-indigo-500 group-hover:scale-110 transition-transform">
                <Moon size={48} />
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
                <Moon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block">
                  Estrela da Tarde (🌙)
                </span>
                <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase mt-0.5">
                  {stats.afternoonStar.name}
                </p>
                <div className="flex justify-between text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                  <span>Tarde: {formatCurrency(stats.afternoonStar.total)}</span>
                  <span>({stats.afternoonStar.count} v)</span>
                </div>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {stats.recentHistory.map((item, index) => {
              const maxVal = Math.max(...stats.recentHistory.map(d => d.total), 1);
              const widthPct = (item.total / maxVal) * 100;
              const isAboveAverage = item.total >= stats.average;
              
              const dObj = item.dateObj;
              let monthNum: number | null = null;
              let monthName = '';
              if (dObj instanceof Date && !isNaN(dObj.getTime())) {
                monthNum = dObj.getMonth() + 1;
                monthName = dObj.toLocaleString('pt-BR', { month: 'long' });
              } else if (typeof item.dateStr === 'string' && item.dateStr.includes('-')) {
                const parts = item.dateStr.split('-');
                monthNum = parseInt(parts[1], 10);
                const tempDate = new Date(2026, monthNum - 1, 15);
                monthName = tempDate.toLocaleString('pt-BR', { month: 'long' });
              }
              const capitalizedMonthName = monthName ? monthName.charAt(0).toUpperCase() + monthName.slice(1) : '';
              const mTheme = getMonthTheme(monthNum);

              return (
                <div 
                  key={item.dateStr} 
                  className={cn(
                    "p-4 rounded-2xl border transition-all text-left flex flex-col justify-between min-h-[490px] hover:scale-[1.01] hover:shadow-md relative overflow-hidden",
                    item.isToday
                      ? "bg-indigo-50/75 dark:bg-indigo-950/20 border-indigo-500/50 shadow-md ring-2 ring-indigo-500/5 animate-pulse-slow"
                      : index === 0
                        ? "bg-gradient-to-b from-amber-500/15 via-yellow-500/5 to-amber-500/[0.02] dark:from-amber-950/45 dark:via-yellow-950/20 dark:to-slate-900 border-amber-400 ring-3 ring-amber-400 dark:ring-amber-500 shadow-xl"
                        : mTheme.cardClass
                  )}
                >
                  {/* Watermarked Month circle at top-right for visual scanning */}
                  {monthNum && (
                    <div className={cn(
                      "absolute top-0 right-0 -mr-2 -mt-2 w-14 h-14 rounded-full flex items-center justify-center border font-black text-lg pointer-events-none select-none z-0",
                      index === 0
                        ? "bg-amber-500/10 border-amber-400/25 text-amber-500 opacity-60"
                        : "bg-slate-100/50 dark:bg-slate-800/40 border-slate-250/20 dark:border-slate-700/30 text-slate-300 dark:text-slate-600 opacity-40"
                    )}>
                      {String(monthNum).padStart(2, '0')}
                    </div>
                  )}

                  <div className="relative z-10">
                    {/* Banner do Mês e Indicação de Melhor Semana */}
                    <div className="flex items-center justify-between gap-1 mb-3 pr-8">
                      {monthNum && (
                        <div className={cn(
                          "flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border",
                          index === 0
                            ? "bg-amber-500/20 border-amber-400/30 text-amber-700 dark:text-amber-300"
                            : mTheme.badgeClass
                        )}>
                          <Calendar size={10} className="shrink-0" />
                          <span>{capitalizedMonthName} • Mês {String(monthNum).padStart(2, '0')}</span>
                        </div>
                      )}
                      
                      {index === 0 && (
                        <span className="flex items-center gap-0.5 text-[8.5px] font-black text-amber-950 dark:text-amber-350 bg-amber-400 dark:bg-amber-500/30 px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-500/50 animate-pulse">
                          👑 MELHOR
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <p className={cn(
                          "text-[9px] font-black uppercase tracking-widest leading-none",
                          item.isToday ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : index === 0 ? "text-amber-700 dark:text-amber-400 font-extrabold" : mTheme.indicatorClass
                        )}>
                          {item.label}
                        </p>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1">
                          {item.formattedDate}
                        </h4>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span className={cn(
                          "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide",
                          index === 0 ? "bg-amber-450 text-amber-950 shadow-3xs" :
                          item.isToday ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-355 animate-pulse" :
                          "bg-slate-100 dark:bg-slate-850 text-slate-550 dark:text-slate-400"
                        )}>
                          {index === 0 ? "🏆 CAMPEÃO" : `#${index + 1}º Lugar`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-2">
                    <p className="text-sm font-black text-slate-900 dark:text-white font-display">
                      {formatCurrency(item.total)}
                    </p>
                    <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          item.isToday ? "bg-indigo-600 dark:bg-indigo-400" : mTheme.bgBarClass
                        )}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[7.5px] font-bold text-slate-400 uppercase">
                      <span>{item.count} {item.count === 1 ? 'venda' : 'vendas'}</span>
                      <span>{Math.round(widthPct)}% do pico</span>
                    </div>
                  </div>

                  {/* Clima do Dia */}
                  {(() => {
                    const weather = getWeatherForDate(item.dateStr, weatherOverrides[item.dateStr]);
                    return (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[7.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Clima do Dia</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWeatherForDate(item.dateStr);
                          }}
                          title="Clique para alterar o clima deste dia"
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xs",
                            weather.color
                          )}
                        >
                          <span>{weather.icon}</span>
                          <span>{weather.label}</span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* Divisor */}
                  <div className="h-[1px] bg-slate-100 dark:bg-slate-800/80 my-2" />

                  {/* Morning vs Afternoon split */}
                  <div className="grid grid-cols-2 gap-1.5 text-[8px] font-black uppercase text-slate-500 dark:text-slate-400">
                    <div className="space-y-0.5 bg-slate-100/40 dark:bg-slate-800/20 p-2 rounded-xl border border-slate-100/50 dark:border-slate-800/40">
                      <div className="flex items-center gap-1 text-amber-650 dark:text-amber-400">
                        <span>☀️</span>
                        <span>Manhã</span>
                      </div>
                      <p className="text-[10px] font-mono font-black text-slate-800 dark:text-slate-200 mt-1 leading-none">
                        {formatCurrency(item.morningTotal)}
                      </p>
                      <p className="text-[7.5px] text-slate-450 dark:text-slate-550 font-extrabold leading-none mt-1">
                        {item.morningCount} {item.morningCount === 1 ? 'v' : 'v'}
                      </p>
                    </div>

                    <div className="space-y-0.5 bg-slate-100/40 dark:bg-slate-800/20 p-2 rounded-xl border border-slate-100/50 dark:border-slate-800/40">
                      <div className="flex items-center gap-1 text-indigo-550 dark:text-indigo-400">
                        <span>🌙</span>
                        <span>Tarde</span>
                      </div>
                      <p className="text-[10px] font-mono font-black text-slate-800 dark:text-slate-200 mt-1 leading-none">
                        {formatCurrency(item.afternoonTotal)}
                      </p>
                      <p className="text-[7.5px] text-slate-450 dark:text-slate-550 font-extrabold leading-none mt-1">
                        {item.afternoonCount} {item.afternoonCount === 1 ? 'v' : 'v'}
                      </p>
                    </div>
                  </div>

                  {/* Shift top seller highlights inside card */}
                  {item.morningTopSeller && item.afternoonTopSeller && item.morningTopSeller.name === item.afternoonTopSeller.name ? (
                    <div className="mt-2.5 bg-gradient-to-r from-amber-500/[0.04] to-indigo-500/[0.04] dark:bg-indigo-950/20 p-2 rounded-xl border border-amber-500/15 text-left">
                      <div className="flex items-center gap-1 text-[7.5px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-none">
                        <Trophy size={8} className="text-amber-500 shrink-0" />
                        <span>☀️🌙 Destaque Manhã e Tarde</span>
                      </div>
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-[9.5px] font-black text-slate-850 dark:text-slate-200 truncate pr-1 uppercase">
                          {item.morningTopSeller.name}
                        </span>
                        <span className="text-[9.5px] font-mono font-black text-slate-900 dark:text-white leading-none shrink-0">
                          {formatCurrency(item.morningTopSeller.total + item.afternoonTopSeller.total)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[7px] text-slate-450 dark:text-slate-500 uppercase mt-1.5 leading-none font-extrabold border-t border-slate-150 dark:border-slate-800/50 pt-1.5">
                        <span>☀️ M: {formatCurrency(item.morningTopSeller.total)}</span>
                        <span>🌙 T: {formatCurrency(item.afternoonTopSeller.total)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2.5 space-y-1.5">
                      {item.morningTopSeller && (
                        <div className="bg-amber-500/[0.03] dark:bg-amber-950/20 p-2 rounded-xl border border-amber-500/10 text-left">
                          <div className="flex items-center gap-1 text-[7px] font-black text-amber-650 dark:text-amber-400 uppercase tracking-widest leading-none">
                            <Sun size={8} className="text-amber-500 shrink-0" />
                            <span>☀️ Destaque Manhã</span>
                          </div>
                          <div className="flex justify-between items-center mt-1.5">
                            <span className="text-[9.5px] font-black text-slate-850 dark:text-slate-200 truncate pr-1 uppercase">
                              {item.morningTopSeller.name}
                            </span>
                            <span className="text-[9.5px] font-mono font-black text-slate-900 dark:text-white leading-none shrink-0">
                              {formatCurrency(item.morningTopSeller.total)}
                            </span>
                          </div>
                          <p className="text-[7px] text-slate-450 dark:text-slate-550 font-extrabold leading-none mt-1">
                            {item.morningTopSeller.count} {item.morningTopSeller.count === 1 ? 'v' : 'v'}
                          </p>
                        </div>
                      )}

                      {item.afternoonTopSeller && (
                        <div className="bg-indigo-500/[0.03] dark:bg-indigo-950/20 p-2 rounded-xl border border-indigo-500/10 text-left">
                          <div className="flex items-center gap-1 text-[7px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none">
                            <Moon size={8} className="text-indigo-500 shrink-0" />
                            <span>🌙 Destaque Tarde</span>
                          </div>
                          <div className="flex justify-between items-center mt-1.5">
                            <span className="text-[9.5px] font-black text-slate-850 dark:text-slate-200 truncate pr-1 uppercase">
                              {item.afternoonTopSeller.name}
                            </span>
                            <span className="text-[9.5px] font-mono font-black text-slate-900 dark:text-white leading-none shrink-0">
                              {formatCurrency(item.afternoonTopSeller.total)}
                            </span>
                          </div>
                          <p className="text-[7px] text-slate-450 dark:text-slate-550 font-extrabold leading-none mt-1">
                            {item.afternoonTopSeller.count} {item.afternoonTopSeller.count === 1 ? 'v' : 'v'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pausas Longas (Ociosidade) */}
                  <div className="mt-2.5 bg-slate-100/30 dark:bg-slate-800/20 p-2 rounded-xl border border-slate-150 dark:border-slate-800/60 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[7.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                        <Clock size={8} className="text-indigo-500 shrink-0" />
                        <span>Intervalos sem Vendas</span>
                      </div>
                      {item.pauses && item.pauses.length > 0 && (
                        <span className="text-[7px] font-black bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded leading-none">
                          {item.pauses.length} {item.pauses.length === 1 ? 'longa' : 'longas'}
                        </span>
                      )}
                    </div>
                    {item.pauses && item.pauses.length > 0 ? (
                      <div className="mt-1.5 space-y-1 max-h-[75px] overflow-y-auto pr-0.5 custom-scrollbar">
                        {item.pauses.slice(0, 3).map((pause: any, pIdx: number) => (
                          <div key={pIdx} className="flex justify-between items-center text-[7.5px] font-bold text-slate-600 dark:text-slate-400">
                            <span className="font-mono text-slate-500 dark:text-slate-400">{pause.from} ➔ {pause.to}</span>
                            <span className="font-black text-rose-600 dark:text-rose-400 bg-rose-500/[0.04] dark:bg-rose-950/20 px-1 py-0.5 rounded-sm">
                              {pause.duration >= 60 ? `${Math.floor(pause.duration / 60)}h${pause.duration % 60 > 0 ? `${pause.duration % 60}m` : ''}` : `${pause.duration} min`}
                            </span>
                          </div>
                        ))}
                        {item.pauses.length > 3 && (
                          <p className="text-[6.5px] text-slate-450 dark:text-slate-550 text-center font-bold mt-1">
                            + {item.pauses.length - 3} outros intervalos
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[7.5px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-1.5 text-center leading-none">
                        ✨ Ritmo constante de atendimento!
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-slate-50/50 dark:bg-slate-850/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center shrink-0">
                <TrendingUp size={16} />
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-normal">
                No faturamento histórico de {stats.weekdayNameFull}, a sua melhor performance foi de <strong className="text-slate-900 dark:text-white">{formatCurrency(Math.max(...stats.history.map(d => d.total)) || 0)}</strong>.
                {stats.average > 0 && ` A meta diária recomendada com base nas semanas anteriores é de ${formatCurrency(stats.average)}.`}
              </p>
            </div>
            
            <div className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-500/5 to-indigo-600/10 rounded-xl border border-indigo-500/10 shrink-0 text-center md:text-right">
              <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
                🎯 Meta recomendada para hoje: {formatCurrency(stats.average)}
              </span>
            </div>
          </div>

          {/* 📊 GRÁFICO DE EVOLUÇÃO TEMPORAL DE VENDAS (ACOMPANHAMENTO DE RITMO) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-[30px] p-6 shadow-sm space-y-6 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 text-left">
                <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  <Activity size={12} className="text-indigo-500 shrink-0" />
                  Evolução Temporal e Ritmo de Vendas 📊
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Como as vendas se comportam ao longo do dia?
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Acompanhe o faturamento hora a hora para planejar o pico de atendimento
                </p>
              </div>

              {/* Toggle controls */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/30 self-start sm:self-auto">
                <button
                  onClick={() => setChartViewMode('cumulative')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    chartViewMode === 'cumulative'
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-3xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                  )}
                >
                  Faturamento Acumulado 📈
                </button>
                <button
                  onClick={() => setChartViewMode('hourly')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    chartViewMode === 'hourly'
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-3xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                  )}
                >
                  Vendas por Hora 📊
                </button>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="flex flex-wrap items-center gap-4 text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800/60 pb-3">
              {stats.recentHistory.map((day) => {
                const isChampion = stats.recentHistory[0]?.dateStr === day.dateStr;
                const isToday = day.isToday;
                const color = getLineColor(day.label, isToday, isChampion);
                return (
                  <div key={day.dateStr} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-slate-850 dark:text-slate-200">
                      {day.label} <strong className="text-slate-400">({day.formattedDate})</strong>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Chart Area */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800/50" />
                  <XAxis 
                    dataKey="hourLabel" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    fontWeight="bold"
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => formatCurrency(val).split(',')[0]} // Show compact currency
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  {stats.recentHistory.map((day) => {
                    const isChampion = stats.recentHistory[0]?.dateStr === day.dateStr;
                    const isToday = day.isToday;
                    const color = getLineColor(day.label, isToday, isChampion);
                    const dataKey = chartViewMode === 'cumulative' ? `${day.label}_cumulative` : `${day.label}_hourly`;
                    
                    return (
                      <Line
                        key={day.dateStr}
                        type="monotone"
                        dataKey={dataKey}
                        name={day.label}
                        stroke={color}
                        strokeWidth={day.isToday ? 4 : 2.5}
                        dot={{ r: 3, strokeWidth: 1 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Insights Footer */}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-850/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center shrink-0">
                <Info size={16} />
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold leading-normal text-left">
                {chartViewMode === 'cumulative' ? (
                  <span>
                    O gráfico de faturamento <strong>Acumulado</strong> mostra o ritmo constante de subida das vendas no decorrer do expediente. Compare a inclinação da linha atual com os dias anteriores para saber se o ritmo de hoje está acima ou abaixo do padrão.
                  </span>
                ) : (
                  <span>
                    O gráfico de <strong>Vendas por Hora</strong> exibe picos individuais de atividade de faturamento em cada horário. Use essa informação para avaliar se o horário atual é historicamente mais ou menos movimentado.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-850">
          <span className="text-xl">📅</span>
          <p className="text-xs font-black text-slate-900 dark:text-white uppercase mt-2">Sem histórico suficiente</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            As vendas completadas de {stats.weekdayNameFull}s anteriores aparecerão aqui quando você tiver mais dias cadastrados!
          </p>
        </div>
      )}
    </div>
  );
};
