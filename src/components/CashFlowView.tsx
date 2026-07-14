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

export const CashFlowView = ({ 
  sales, 
  financialAccounts = [], 
  cashierSessions = [], 
  formatCurrency, 
  formatDate 
}: any) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [customInitialBalances, setCustomInitialBalances] = useState<Record<string, number>>({});

  // Peak Hour Analysis for the selected date or day of the week
  const peakHourRecommendation = useMemo(() => {
    if (!sales || sales.length === 0) return null;

    try {
      // Get the name of the weekday for the selectedDate
      // selectedDate is 'YYYY-MM-DD'
      const targetDateObj = new Date(selectedDate + 'T12:00:00');
      const dayOfWeekIndex = targetDateObj.getDay();
      const daysMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const currentWeekdayName = daysMap[dayOfWeekIndex];

      // Analyze historical sales for this specific weekday (e.g. all Saturdays, or all Wednesdays)
      const weekdaySales = sales.filter((s: any) => {
        if (s.status !== 'completed' && s.status !== 'Concluída') return false;
        try {
          const d = getSafeDate(s.date);
          return d.getDay() === dayOfWeekIndex;
        } catch (e) {
          return false;
        }
      });

      const hourlyCounts: { [hour: number]: number } = {};
      const hourlyRevenue: { [hour: number]: number } = {};

      weekdaySales.forEach((s: any) => {
        try {
          const hr = getSaleLocalHours(s);
          if (hr >= 8 && hr <= 20) {
            hourlyCounts[hr] = (hourlyCounts[hr] || 0) + 1;
            hourlyRevenue[hr] = (hourlyRevenue[hr] || 0) + s.total;
          }
        } catch (e) {}
      });

      const list = Object.keys(hourlyCounts).map(hStr => {
        const hr = Number(hStr);
        return {
          hour: hr,
          count: hourlyCounts[hr],
          revenue: hourlyRevenue[hr],
          label: `${String(hr).padStart(2, '0')}:00`
        };
      }).sort((a, b) => b.revenue - a.revenue);

      if (list.length === 0) {
        // Fallback to general historical peak hour
        const allHourlyCounts: { [hour: number]: number } = {};
        const allHourlyRevenue: { [hour: number]: number } = {};
        sales.forEach((s: any) => {
          if (s.status !== 'completed' && s.status !== 'Concluída') return;
          try {
            const hr = getSaleLocalHours(s);
            if (hr >= 8 && hr <= 20) {
              allHourlyCounts[hr] = (allHourlyCounts[hr] || 0) + 1;
              allHourlyRevenue[hr] = (allHourlyRevenue[hr] || 0) + s.total;
            }
          } catch (e) {}
        });
        
        const allList = Object.keys(allHourlyCounts).map(hStr => {
          const hr = Number(hStr);
          return {
            hour: hr,
            count: allHourlyCounts[hr],
            revenue: allHourlyRevenue[hr],
            label: `${String(hr).padStart(2, '0')}:00`
          };
        }).sort((a, b) => b.revenue - a.revenue);

        if (allList.length > 0) {
          return {
            peakHour: allList[0].hour,
            peakHourStr: allList[0].label,
            endHourStr: `${String(allList[0].hour + 1).padStart(2, '0')}:00`,
            weekday: currentWeekdayName,
            isHistoricalFallback: true,
            revenue: allList[0].revenue
          };
        }
        return null;
      }

      return {
        peakHour: list[0].hour,
        peakHourStr: list[0].label,
        endHourStr: `${String(list[0].hour + 1).padStart(2, '0')}:00`,
        weekday: currentWeekdayName,
        isHistoricalFallback: false,
        revenue: list[0].revenue
      };
    } catch (e) {
      return null;
    }
  }, [sales, selectedDate]);

  const initialBalance = customInitialBalances[selectedDate] !== undefined ? customInitialBalances[selectedDate] : 1000.00;

  const handleUpdateInitialBalance = (val: number) => {
    setCustomInitialBalances(prev => ({
      ...prev,
      [selectedDate]: val
    }));
  };

  // 1. Entradas: Sales of this day + Receivables paid on this day
  const daySales = sales.filter((sale: any) => {
    if (!sale || !sale.date) return false;
    return sale.date.startsWith(selectedDate);
  });
  const salesTotal = daySales.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0);

  const dayReceivables = financialAccounts.filter((acc: any) => {
    return acc.type === 'receivable' && acc.status === 'paid' && acc.paymentDate === selectedDate;
  });
  const receivablesTotal = dayReceivables.reduce((sum: number, acc: any) => sum + acc.amount, 0);

  const totalInflows = salesTotal + receivablesTotal;

  // 2. Saídas: Payables paid on this day + Cashier withdrawals of this day
  const dayPayables = financialAccounts.filter((acc: any) => {
    return acc.type === 'payable' && acc.status === 'paid' && acc.paymentDate === selectedDate;
  });
  const payablesTotal = dayPayables.reduce((sum: number, acc: any) => sum + acc.amount, 0);

  // We should also find cashier withdrawals for the day
  const dayWithdrawals: any[] = [];
  const dayReinforcements: any[] = [];
  cashierSessions.forEach((session: any) => {
    if (!session || !session.openingTime) return;
    if (session.openingTime.startsWith(selectedDate)) {
      if (session.withdrawals) {
        session.withdrawals.forEach((w: any) => {
          if (w.type === 'withdrawal') {
            dayWithdrawals.push(w);
          } else if (w.type === 'reinforcement') {
            dayReinforcements.push(w);
          }
        });
      }
    }
  });

  const withdrawalsTotal = dayWithdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);
  const reinforcementsTotal = dayReinforcements.reduce((sum: number, r: any) => sum + r.amount, 0);

  const totalOutflows = payablesTotal + withdrawalsTotal;

  // Real cash balance
  const finalBalance = initialBalance + totalInflows + reinforcementsTotal - totalOutflows;

  // Compile timeline items
  const timelineItems: any[] = [];

  // Add Sales
  daySales.forEach((sale: any) => {
    timelineItems.push({
      id: sale.id,
      time: sale.date.includes('T') ? sale.date.split('T')[1].substr(0, 5) : 'Horário N/A',
      type: 'entrada',
      title: `Venda #${sale.id.slice(-4).toUpperCase()}`,
      description: `Cliente: ${sale.customerName || 'Consumidor Final'} (${sale.paymentMethod || 'Outros'})`,
      amount: sale.total,
      icon: 'sale'
    });
  });

  // Add Receivables Paid
  dayReceivables.forEach((acc: any) => {
    timelineItems.push({
      id: acc.id,
      time: 'Liquidado',
      type: 'entrada',
      title: `Conta Recebida: ${acc.description}`,
      description: `Categoria: ${acc.category}`,
      amount: acc.amount,
      icon: 'receivable'
    });
  });

  // Add Reinforcements
  dayReinforcements.forEach((r: any) => {
    timelineItems.push({
      id: r.id,
      time: r.time ? r.time.split('T')[1].substr(0, 5) : 'N/A',
      type: 'entrada',
      title: `Reforço de Caixa: ${r.reason || 'Troco'}`,
      description: 'Entrada física no caixa',
      amount: r.amount,
      icon: 'reinforcement'
    });
  });

  // Add Payables Paid
  dayPayables.forEach((acc: any) => {
    timelineItems.push({
      id: acc.id,
      time: 'Liquidado',
      type: 'saida',
      title: `Conta Paga: ${acc.description}`,
      description: `Categoria: ${acc.category}`,
      amount: acc.amount,
      icon: 'payable'
    });
  });

  // Add Withdrawals
  dayWithdrawals.forEach((w: any) => {
    timelineItems.push({
      id: w.id,
      time: w.time ? w.time.split('T')[1].substr(0, 5) : 'N/A',
      type: 'saida',
      title: `Sangria de Caixa: ${w.reason || 'Retirada'}`,
      description: 'Saída física do caixa',
      amount: w.amount,
      icon: 'withdrawal'
    });
  });

  return (
    <div className="space-y-6" id="cash-flow-container">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Fluxo de Caixa Diário</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acompanhamento de saldos, entradas e saídas consolidadas</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-wider shrink-0">Data do Relatório:</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs"
          />
        </div>
      </div>

      {peakHourRecommendation && (
        <div id="action-suggested-peak-hour" className="bg-indigo-50/70 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0 mt-1 md:mt-0">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest">
                💡 Ação Sugerida • Otimização de Escala
              </span>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Reforço de Equipe das {peakHourRecommendation.peakHourStr} às {peakHourRecommendation.endHourStr}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium max-w-3xl leading-relaxed">
                Com base no histórico operacional das <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{peakHourRecommendation.weekday}s</strong>, o horário de pico com maior volume financeiro de vendas ocorre das <strong>{peakHourRecommendation.peakHourStr} às {peakHourRecommendation.endHourStr}</strong>. Recomendamos alocar <strong>100% da equipe de vendas</strong> para atendimento ativo e suporte ao cliente neste período para maximizar a conversão e acelerar os resultados.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6" id="cash-flow-summary-cards">
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">1. Saldo Inicial</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">R$</span>
            <input 
              type="number" 
              value={initialBalance}
              onChange={(e) => handleUpdateInitialBalance(Number(e.target.value))}
              className="text-xl font-black text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-blue-500 w-28 p-0"
            />
          </div>
          <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 block">Ajuste o caixa de abertura</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">2. Entradas do Dia</p>
          <h3 className="text-xl font-black text-emerald-600">
            + {formatCurrency(totalInflows + reinforcementsTotal)}
          </h3>
          <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 block">
            Vendas: {formatCurrency(salesTotal)} | Outros: {formatCurrency(receivablesTotal + reinforcementsTotal)}
          </span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">3. Saídas do Dia</p>
          <h3 className="text-xl font-black text-rose-600">
            - {formatCurrency(totalOutflows)}
          </h3>
          <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 block">
            Contas: {formatCurrency(payablesTotal)} | Sangria: {formatCurrency(withdrawalsTotal)}
          </span>
        </div>

        <div className={cn(
          "rounded-3xl p-6 shadow-xl",
          finalBalance >= 0 ? "bg-slate-900 text-white" : "bg-rose-900 text-white"
        )}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">4. Saldo Real em Caixa</p>
          <h3 className="text-2xl font-black">
            {formatCurrency(finalBalance)}
          </h3>
          <span className="text-[9px] opacity-75 font-bold uppercase mt-1 block">
            Diferença: {formatCurrency((totalInflows + reinforcementsTotal) - totalOutflows)}
          </span>
        </div>
      </div>

      {/* Timeline of transactions */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6" id="cash-flow-timeline">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-6">Lançamentos de {formatDate(selectedDate)}</h2>
        
        {timelineItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-bold uppercase text-xs tracking-wider">
            Nenhuma movimentação financeira registrada para este dia.
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
            {timelineItems.map((item, index) => {
              const isEntrada = item.type === 'entrada';
              return (
                <div key={index} className="flex items-start gap-4 relative">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center z-10 shadow-sm shrink-0 font-bold text-xs",
                    isEntrada ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {isEntrada ? "+" : "-"}
                  </div>

                  <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide">{item.title}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">[{item.time}]</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{item.description}</p>
                    </div>
                    <span className={cn(
                      "text-sm font-black tracking-tight",
                      isEntrada ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {isEntrada ? "+" : "-"} {formatCurrency(item.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
