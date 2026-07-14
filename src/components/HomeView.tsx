import { PastWeekdaySalesTracker } from './ReportsView';
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
import { 
    User, Brand, Category, Product, StockBatch, Staff, StoreSettings, Withdrawal, FixedCost, FinancialAccount, CashierSession, Campaign, Giveaway, RaffleTicket, Raffle, RoutineActivity, Routine, Customer, SaleItem, Payment, Sale, MonthlyGoal, DashboardViewProps, ProductsViewProps, StaffViewProps, RoutineViewProps, BackupViewProps, CustomersViewProps, SalesViewProps, CashierViewProps, CampaignsViewProps, AtendimentoViewProps, Notification, HomeViewProps 
  } from '../types';;;
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

export const HomeView = ({
  sales,
  customers,
  products,
  fixedCosts,
  isCashierOpen,
  currentCashierSession,
  monthlyGoals,
  setActiveTab,
  formatCurrency,
  formatDate,
  setCart,
  setSelectedProduct,
  setCurrentStep,
  brands,
  settings,
  staff
}: HomeViewProps) => {
  const [vProductSearch, setVProductSearch] = useState('');
  
  const now = new Date();

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    sales.forEach(s => {
      try {
        const d = getSafeDate(s.date);
        const monthName = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const formatted = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        monthsSet.add(formatted);
      } catch (e) {
        console.error(e);
      }
    });
    const sorted = Array.from(monthsSet).sort((a, b) => {
      const monthsPt = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      const parse = (str: string) => {
        const parts = str.toLowerCase().split(" de ");
        if (parts.length === 2) {
          const mIdx = monthsPt.indexOf(parts[0].trim());
          const yNum = Number(parts[1].trim());
          return new Date(yNum, mIdx !== -1 ? mIdx : 0, 1).getTime();
        }
        return 0;
      };
      return parse(a) - parse(b);
    });
    return sorted;
  }, [sales]);

  // --- Mobile Performance Card States & Calculations ---
  const [selectedMobileVendedora, setSelectedMobileVendedora] = useState<string>(() => {
    return localStorage.getItem('mobile_vendedora_name') || '';
  });
  const [rankingTimeframe, setRankingTimeframe] = useState<'today' | 'month'>('month');

  const handleSelectMobileVendedora = (name: string) => {
    setSelectedMobileVendedora(name);
    localStorage.setItem('mobile_vendedora_name', name);
  };
  

  // 1. Calculations - Today's Cashier & Sales
  const todaySales = useMemo(() => {
    return sales.filter(s => {
      try {
        const d = getSafeDate(s.date);
        const t = new Date();
        return d.getFullYear() === t.getFullYear() &&
               d.getMonth() === t.getMonth() &&
               d.getDate() === t.getDate() &&
               s.status === 'completed';
      } catch (e) {
        return false;
      }
    });
  }, [sales]);

  const todayTotal = useMemo(() => {
    return todaySales.reduce((acc, s) => acc + s.total, 0);
  }, [todaySales]);

  const todayCount = todaySales.length;

  const monthComparisonStats = useMemo(() => {
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let lastMonth = currentMonth - 1;
    let lastMonthYear = currentYear;
    if (lastMonth < 0) {
      lastMonth = 11;
      lastMonthYear = currentYear - 1;
    }

    let currentMonthSum = 0;
    let lastMonthSum = 0;

    sales.forEach(s => {
      if (s.status !== 'completed') return;
      try {
        const d = getSafeDate(s.date);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          currentMonthSum += s.total;
        } else if (d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth) {
          lastMonthSum += s.total;
        }
      } catch (e) {}
    });

    let growthPct = 0;
    if (lastMonthSum > 0) {
      growthPct = ((currentMonthSum - lastMonthSum) / lastMonthSum) * 100;
    } else if (currentMonthSum > 0) {
      growthPct = 100;
    }

    return {
      currentMonthSum,
      lastMonthSum,
      growthPct,
      currentMonthLabel: now.toLocaleString('pt-BR', { month: 'long' }),
      lastMonthLabel: new Date(lastMonthYear, lastMonth, 15).toLocaleString('pt-BR', { month: 'long' })
    };
  }, [sales, now]);

  const todayStaffPerformance = useMemo(() => {
    const performance: {
      [name: string]: {
        name: string;
        total: number;
        count: number;
        morningTotal: number;
        morningCount: number;
        afternoonTotal: number;
        afternoonCount: number;
        items: Array<{ name: string; price: number; quantity: number; saleId: string; date: string }>;
      }
    } = {};

    todaySales.forEach(s => {
      const vendedoraName = normalizeVendedoraName(s.vendedora);
      if (!performance[vendedoraName]) {
        performance[vendedoraName] = {
          name: vendedoraName,
          total: 0,
          count: 0,
          morningTotal: 0,
          morningCount: 0,
          afternoonTotal: 0,
          afternoonCount: 0,
          items: []
        };
      }
      
      performance[vendedoraName].total += s.total;
      performance[vendedoraName].count += 1;
      
      const hrs = getSaleLocalHours(s);
      const isMorning = hrs < 12;

      if (isMorning) {
        performance[vendedoraName].morningTotal += s.total;
        performance[vendedoraName].morningCount += 1;
      } else {
        performance[vendedoraName].afternoonTotal += s.total;
        performance[vendedoraName].afternoonCount += 1;
      }
      
      if (s.items && Array.isArray(s.items)) {
        s.items.forEach(item => {
          performance[vendedoraName].items.push({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            saleId: s.id,
            date: s.date
          });
        });
      }
    });

    return Object.values(performance).sort((a, b) => b.total - a.total);
  }, [todaySales]);

  const monthStaffPerformance = useMemo(() => {
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const performance: { [name: string]: { name: string; total: number; count: number } } = {};

    sales.forEach(s => {
      try {
        if (s.status !== 'completed') return;
        const d = getSafeDate(s.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const vendedoraName = normalizeVendedoraName(s.vendedora);
          if (!performance[vendedoraName]) {
            performance[vendedoraName] = { name: vendedoraName, total: 0, count: 0 };
          }
          performance[vendedoraName].total += s.total;
          performance[vendedoraName].count += 1;
        }
      } catch (e) {}
    });

    return Object.values(performance).sort((a, b) => b.total - a.total);
  }, [sales, now]);

  const shiftHighlights = useMemo(() => {
    let morningMaxTotal = 0;
    let morningTotalName = '';
    
    let morningMaxCount = 0;
    let morningCountName = '';

    let afternoonMaxTotal = 0;
    let afternoonTotalName = '';

    let afternoonMaxCount = 0;
    let afternoonCountName = '';

    todayStaffPerformance.forEach(p => {
      if (p.morningTotal > morningMaxTotal) {
        morningMaxTotal = p.morningTotal;
        morningTotalName = p.name;
      }
      if (p.morningCount > morningMaxCount) {
        morningMaxCount = p.morningCount;
        morningCountName = p.name;
      }
      if (p.afternoonTotal > afternoonMaxTotal) {
        afternoonMaxTotal = p.afternoonTotal;
        afternoonTotalName = p.name;
      }
      if (p.afternoonCount > afternoonMaxCount) {
        afternoonMaxCount = p.afternoonCount;
        afternoonCountName = p.name;
      }
    });

    return {
      morningTotalName,
      morningMaxTotal,
      morningCountName,
      morningMaxCount,
      afternoonTotalName,
      afternoonMaxTotal,
      afternoonCountName,
      afternoonMaxCount
    };
  }, [todayStaffPerformance]);

  const todayMorningTopSellerName = shiftHighlights.morningTotalName;
  const todayAfternoonTopSellerName = shiftHighlights.afternoonTotalName;

  const paymentSplits = useMemo(() => {
    const splits = { PIX: 0, DINHEIRO: 0, CARD: 0, OUTROS: 0 };
    todaySales.forEach(s => {
      if (s.isSplitPayment && s.payments) {
        s.payments.forEach((p: any) => {
          const m = String(p.method).toUpperCase();
          if (m.includes('PIX')) splits.PIX += p.amount;
          else if (m.includes('DINHEIRO') || m.includes('ESP')) splits.DINHEIRO += p.amount;
          else if (m.includes('CRED') || m.includes('DEB') || m.includes('CARD')) splits.CARD += p.amount;
          else splits.OUTROS += p.amount;
        });
      } else {
        const m = String(s.paymentMethod || 'DINHEIRO').toUpperCase();
        if (m.includes('PIX')) splits.PIX += s.total;
        else if (m.includes('DINHEIRO') || m.includes('ESP')) splits.DINHEIRO += s.total;
        else if (m.includes('CRED') || m.includes('DEB') || m.includes('CARD')) splits.CARD += s.total;
        else splits.OUTROS += s.total;
      }
    });
    return splits;
  }, [todaySales]);

  const allVendedoraNames = useMemo(() => {
    const names = new Set<string>();
    if (staff && Array.isArray(staff)) {
      staff.forEach(st => {
        if (st.name) names.add(st.name.trim().toUpperCase());
      });
    }
    sales.forEach(s => {
      if (s.vendedora) {
        names.add(s.vendedora.trim().toUpperCase());
      }
    });
    return Array.from(names).sort();
  }, [sales, staff]);

  const mobileVendedoraStats = useMemo(() => {
    if (!selectedMobileVendedora) return null;
    const targetName = selectedMobileVendedora.trim().toUpperCase();

    const todaySellerSales = todaySales.filter(s => (s.vendedora || '').trim().toUpperCase() === targetName);
    const todayTotalVal = todaySellerSales.reduce((acc, s) => acc + s.total, 0);
    const todayCountVal = todaySellerSales.length;
    const todayTicketVal = todayCountVal > 0 ? todayTotalVal / todayCountVal : 0;

    const todayRank = todayStaffPerformance.findIndex(p => p.name.trim().toUpperCase() === targetName) + 1;

    let gapToAboveToday = 0;
    let personAboveNameToday = '';
    const myIndexToday = todayStaffPerformance.findIndex(p => p.name.trim().toUpperCase() === targetName);
    if (myIndexToday > 0) {
      const abovePerson = todayStaffPerformance[myIndexToday - 1];
      gapToAboveToday = abovePerson.total - todayTotalVal;
      personAboveNameToday = abovePerson.name;
    }

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthSales = sales.filter(s => {
      try {
        if (s.status !== 'completed') return false;
        const d = getSafeDate(s.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      } catch (e) { return false; }
    });

    const monthSellerSales = monthSales.filter(s => (s.vendedora || '').trim().toUpperCase() === targetName);
    const monthTotalVal = monthSellerSales.reduce((acc, s) => acc + s.total, 0);
    const monthCountVal = monthSellerSales.length;
    const monthTicketVal = monthCountVal > 0 ? monthTotalVal / monthCountVal : 0;

    // Last Month calculations
    let lastMonth = currentMonth - 1;
    let lastMonthYear = currentYear;
    if (lastMonth < 0) {
      lastMonth = 11;
      lastMonthYear = currentYear - 1;
    }
    const lastMonthSales = sales.filter(s => {
      try {
        if (s.status !== 'completed') return false;
        const d = getSafeDate(s.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      } catch (e) { return false; }
    });

    const lastMonthSellerSales = lastMonthSales.filter(s => (s.vendedora || '').trim().toUpperCase() === targetName);
    const lastMonthTotalVal = lastMonthSellerSales.reduce((acc, s) => acc + s.total, 0);
    const lastMonthCountVal = lastMonthSellerSales.length;

    let growthPctVal = 0;
    if (lastMonthTotalVal > 0) {
      growthPctVal = ((monthTotalVal - lastMonthTotalVal) / lastMonthTotalVal) * 100;
    } else if (monthTotalVal > 0) {
      growthPctVal = 100;
    }

    const monthSellers: { [name: string]: number } = {};
    monthSales.forEach(s => {
      const vName = (s.vendedora || 'Não Informada').trim().toUpperCase();
      monthSellers[vName] = (monthSellers[vName] || 0) + s.total;
    });
    const sortedMonthSellers = Object.entries(monthSellers)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    const monthRank = sortedMonthSellers.findIndex(p => p.name === targetName) + 1;
    let gapToAboveMonth = 0;
    let personAboveNameMonth = '';
    const myIndexMonth = sortedMonthSellers.findIndex(p => p.name === targetName);
    if (myIndexMonth > 0) {
      const abovePerson = sortedMonthSellers[myIndexMonth - 1];
      gapToAboveMonth = abovePerson.total - monthTotalVal;
      personAboveNameMonth = abovePerson.name;
    }

    return {
      today: {
        total: todayTotalVal,
        count: todayCountVal,
        ticket: todayTicketVal,
        rank: todayRank,
        gapToAbove: gapToAboveToday,
        personAbove: personAboveNameToday
      },
      month: {
        total: monthTotalVal,
        count: monthCountVal,
        ticket: monthTicketVal,
        rank: monthRank,
        gapToAbove: gapToAboveMonth,
        personAbove: personAboveNameMonth,
        lastMonthTotal: lastMonthTotalVal,
        lastMonthCount: lastMonthCountVal,
        growthPct: growthPctVal
      }
    };
  }, [selectedMobileVendedora, todaySales, todayStaffPerformance, sales, now]);

  const peakHourStats = useMemo(() => {
    const hourlyCounts: { [hour: number]: number } = {};
    const hourlyRevenue: { [hour: number]: number } = {};
    
    sales.forEach(s => {
      if (s.status !== 'completed') return;
      try {
        const hr = getSaleLocalHours(s);
        hourlyCounts[hr] = (hourlyCounts[hr] || 0) + 1;
        hourlyRevenue[hr] = (hourlyRevenue[hr] || 0) + s.total;
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
    }).sort((a, b) => b.count - a.count);

    return {
      topHours: list.slice(0, 3),
      all: list,
      hasSales: list.length > 0
    };
  }, [sales]);

  const weekdaysAverages = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    const dayOfWeekTotal: { [key: string]: number } = { 'Segunda': 0, 'Terça': 0, 'Quarta': 0, 'Quinta': 0, 'Sexta': 0, 'Sábado': 0 };
    const dayOfWeekDates: { [key: string]: Set<string> } = {
      'Segunda': new Set(), 'Terça': new Set(), 'Quarta': new Set(), 'Quinta': new Set(), 'Sexta': new Set(), 'Sábado': new Set()
    };
    
    const daysMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    sales.forEach(s => {
      try {
        if (s.status !== 'completed' || s.total <= 0) return;
        const d = getSafeDate(s.date);
        const dowName = daysMap[d.getDay()];
        if (dowName === 'Domingo') return; // skip Sunday
        const exactDateStr = d.toISOString().split('T')[0];
        dayOfWeekTotal[dowName] = (dayOfWeekTotal[dowName] || 0) + s.total;
        dayOfWeekDates[dowName].add(exactDateStr);
      } catch (e) {}
    });

    return Object.entries(dayOfWeekTotal)
      .map(([dayName, total]) => {
        const activeDaysCount = dayOfWeekDates[dayName].size || 1;
        const average = total / activeDaysCount;
        return { dayName, total, average, activeDaysCount };
      })
      .sort((a, b) => a.average - b.average);
  }, [sales]);

  // 2. Mini Sales Chart - Last 7 Days (excluding Sundays and days with 0 billing)
  const chartData = useMemo(() => {
    const data = [];
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    // Scan back in time to collect up to 7 non-Sunday days with faturamento > 0
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = weekdays[d.getDay()];
      
      if (dayName === 'Dom') continue; // Do not count Sundays
      
      const daySales = sales.filter(s => {
        try {
          const sd = getSafeDate(s.date);
          return sd.getFullYear() === d.getFullYear() &&
                 sd.getMonth() === d.getMonth() &&
                 sd.getDate() === d.getDate() &&
                 s.status === 'completed';
        } catch (e) {
          return false;
        }
      });
      
      const total = daySales.reduce((acc, s) => acc + s.total, 0);
      
      if (total <= 0) continue; // Do not count 0 billing days
      
      data.push({
        name: `${dayName}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        total: total,
        formatted: formatCurrency(total)
      });
      
      if (data.length >= 7) {
        break;
      }
    }
    
    // Fallback if no active data is present to prevent blank chart
    if (data.length === 0) {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = weekdays[d.getDay()];
        if (dayName === 'Dom') continue;
        data.push({
          name: `${dayName}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
          total: 0,
          formatted: formatCurrency(0)
        });
      }
      return data;
    }
    
    return data.reverse();
  }, [sales, formatCurrency]);

  // 3. Upcoming Celebrations (Birthdays and Brand events)
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    return customers.filter(c => {
      if (!c.birthDate) return false;
      try {
        const bParts = c.birthDate.split('-');
        const bMonth = parseInt(bParts[1]) - 1;
        return bMonth === currentMonth;
      } catch (e) {
        return false;
      }
    }).map(c => {
      const bParts = c.birthDate!.split('-');
      const bDay = parseInt(bParts[2]);
      return { ...c, bDay };
    }).sort((a, b) => a.bDay - b.bDay);
  }, [customers]);

  const commemorativeEvents = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Core calendar of retail / historic / local celebratory dates in Brazil
    const items = [
      { id: 'sao_joao', name: 'Festa de São João 🌽', month: 5, day: 24, description: 'Tradição junina para celebrar na loja com chá, quentão e quitutes juninos!' },
      { id: 'dia_amigo', name: 'Dia do Amigo 🤝', month: 6, day: 20, description: 'Perfeito para campanhas "Traga uma amiga" e ganhar descontos especiaís em dobro.' },
      { id: 'dia_avos', name: 'Dia dos Avós 👵👴', month: 6, day: 26, description: 'Mencione cuidados de pele sênior, colágenos e presentes de afeto.' },
      { id: 'dia_namorados', name: 'Dia dos Namorados 💖', month: 5, day: 12, description: 'Excelente oportunidade para combos e mimos românticos bem elaborados.' },
      { id: 'dia_pais', name: 'Dia dos Pais 🧔', month: 7, day: 9, description: 'Foco em kits masculinos, perfumes marcantes e produtos de barba e cabelo.' },
      { id: 'dia_cliente', name: 'Dia do Cliente 🏆', month: 8, day: 15, description: 'Brindes no atendimento e descontos exclusivos para agradecer aos VIPs.' }
    ];

    return items.map(item => {
      let year = currentYear;
      let dateObj = new Date(year, item.month, item.day, 12, 0, 0);
      if (dateObj < today && (today.getMonth() !== item.month || today.getDate() > item.day)) {
        year += 1;
        dateObj = new Date(year, item.month, item.day, 12, 0, 0);
      }
      return { ...item, dateObj };
    })
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
    .slice(0, 3);
  }, []);

  const averageTicketData = useMemo(() => {
    const today = new Date();
    const monthSales = sales.filter(s => {
      try {
        const d = getSafeDate(s.date);
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && s.status === 'completed';
      } catch (e) {
        return false;
      }
    });

    const totalFaturado = monthSales.reduce((acc, s) => acc + s.total, 0);
    const totalVendas = monthSales.length;
    const ticketMedio = totalVendas > 0 ? totalFaturado / totalVendas : 0;
    
    const targetTicket = 180; // Ticket médio ideal para perfumaria/beleza
    const percentage = Math.min(100, Math.round((ticketMedio / targetTicket) * 100));

    let advice = '';
    let recommendation = '';
    let color = '';
    if (ticketMedio === 0) {
      advice = 'Abra o caixa e realize vendas para aferir o ticket médio do mês!';
      recommendation = 'Ofereça combos e kits de presentes para novos compradores.';
      color = 'from-slate-400 to-slate-500';
    } else if (ticketMedio < 100) {
      advice = 'Ticket médio abaixo da meta ideal de R$ 180,00.';
      recommendation = 'Ofereça itens de fechamento de carrinho (sachês de hidratação, cremes de cutícula ou sabonetes unitários).';
      color = 'from-rose-500 via-pink-500 to-amber-500';
    } else if (ticketMedio < 150) {
      advice = 'Ótimo progresso, mas podemos aumentar a retenção de valor!';
      recommendation = 'Incentive a venda de kits combinando Perfumaria + Rotina de Skincare para ganhar brindes.';
      color = 'from-amber-400 via-orange-500 to-emerald-500';
    } else if (ticketMedio < 200) {
      advice = 'Excelente! Ticket médio saudável e dentro da zona de alto rendimento!';
      recommendation = 'Continue capacitando a equipe no Upselling de fragrâncias premium e hidratantes corporais.';
      color = 'from-emerald-400 via-teal-500 to-green-600';
    } else {
      advice = 'Estelar! Ticket médio exuberante focado em vendas combinadas VIP!';
      recommendation = 'Fidelize esses clientes com o Clube de Vantagens e mimos exclusivos na próxima visita.';
      color = 'from-green-500 via-emerald-600 to-teal-600';
    }

    return {
      ticketMedio,
      totalVendas,
      targetTicket,
      percentage,
      advice,
      recommendation,
      color
    };
  }, [sales]);

  const upcomingEvents = useMemo(() => {
    const events: any[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    
    monthlyGoals.forEach(g => {
      if (g.customEvents) {
        g.customEvents.forEach((ev: any) => {
          const evDate = new Date(ev.date + 'T12:00:00Z');
          if (evDate >= today) {
            events.push({ ...ev, dateObj: evDate });
          }
        });
      }
    });
    return events.sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime()).slice(0, 3);
  }, [monthlyGoals]);

  // 4. Important Alerts
  const lowStockProducts = useMemo(() => {
    return products
      .filter(p => p.stock <= (p.minStock || 5) && p.status !== 'inactive')
      .slice(0, 3);
  }, [products]);

  const activeGoal = useMemo(() => {
    const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return monthlyGoals.find(g => g.id === id) || null;
  }, [monthlyGoals, now]);

  const goalProgress = useMemo(() => {
    if (!activeGoal) return { percent: 0, current: 0, target: 45000 };
    const monthSales = sales.filter(s => {
      try {
        const d = getSafeDate(s.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && s.status === 'completed';
      } catch (e) {
        return false;
      }
    });
    const current = monthSales.reduce((acc, s) => acc + s.total, 0);
    const target = activeGoal.storeGoal || 45000;
    return {
      current,
      target,
      percent: Math.min(100, Math.round((current / target) * 100))
    };
  }, [sales, activeGoal, now]);

  const upcomingBills = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    return fixedCosts
      .filter(c => c.status === 'pending' && c.dueDate >= currentDay && c.dueDate <= currentDay + 5)
      .slice(0, 3);
  }, [fixedCosts]);

  // 5. Novas Vendas Search Shortcut
  const filteredSearchProducts = useMemo(() => {
    if (!vProductSearch.trim()) return [];
    const term = vProductSearch.toLowerCase();
    return products
      .filter(p => (
        p.name.toLowerCase().includes(term) ||
        (p.brand && p.brand.toLowerCase().includes(term))
      ) && (p.stock > 0 || ((p.type === 'kit' || p.type === 'combo') && p.kitMode !== 'pronto')) && p.status !== 'inactive')
      .slice(0, 4);
  }, [vProductSearch, products]);

  const handleStartVendaWithProduct = (product: any) => {
    setCart([{
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      total: product.price
    }]);
    setSelectedProduct(product);
    setCurrentStep(1);
    setActiveTab('atendimento');
    setVProductSearch('');
  };

  const handleStartEmptyVenda = () => {
    setCart([]);
    setSelectedProduct(null);
    setCurrentStep(1);
    setActiveTab('atendimento');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Resumo de Caixa Diário</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Painel moderno com resumo do caixa, faturamento e calendário comercial.</p>
          </div>
          
          {availableMonths.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800/60 w-fit">
              <Calendar size={12} className="text-emerald-500 shrink-0" />
              <span className="uppercase tracking-wider">
                {availableMonths.length === 1 
                  ? '1 mês de faturamento importado:' 
                  : `${availableMonths.length} meses de faturamento importados:`}
              </span>
              <span className="text-slate-800 dark:text-slate-200 font-bold">
                {availableMonths.join(', ')}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={handleStartEmptyVenda}
          className="flex items-center justify-center gap-3 px-8 py-4.5 bg-emerald-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-100 dark:shadow-none hover:bg-emerald-700 hover:scale-[1.02] transition-all"
        >
          <Plus size={18} />
          Nova Venda
        </button>
      </div>

      {/* 📊 Histórico de Faturamento Recente do Mesmo Dia da Semana */}
      {(settings.showPastWeekdayTracker ?? true) && (
        <PastWeekdaySalesTracker 
          sales={sales} 
          formatCurrency={formatCurrency} 
          setActiveTab={setActiveTab}
          handleStartEmptyVenda={handleStartEmptyVenda}
        />
      )}

      {/* 🏆 CARD DE RESUMO MENSAL & RANKING DE VENDEDORAS */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden text-left relative group hover:shadow-sm transition-all">
        {/* Decorative background gradients */}
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-indigo-500 pointer-events-none">
          <Award size={160} />
        </div>
        <div className="absolute bottom-0 left-0 p-8 opacity-[0.01] text-amber-500 pointer-events-none">
          <Trophy size={160} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800/80">
          
          {/* LEFT SIDE: Small ranking (1st, 2nd, 3rd places) */}
          <div className="p-6 md:p-8 lg:col-span-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-amber-500 shrink-0" />
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Pódio do Mês de {monthComparisonStats.currentMonthLabel} 🏆
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                As vendedoras destaque que estão liderando as vendas acumuladas
              </p>
            </div>

            <div className="space-y-2.5">
              {(() => {
                const top3 = monthStaffPerformance.slice(0, 3);
                if (top3.length === 0) {
                  return (
                    <div className="text-center py-6 text-slate-400 text-[10px] font-bold uppercase border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                      Nenhuma venda registrada este mês
                    </div>
                  );
                }

                return top3.map((perf, index) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div 
                      key={perf.name}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-2xl border transition-all hover:scale-[1.01]",
                        index === 0 ? "bg-gradient-to-r from-amber-500/[0.05] to-transparent border-amber-400/30 shadow-2xs" : "bg-slate-50/50 dark:bg-slate-850/20 border-slate-100 dark:border-slate-800/60"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg shrink-0">{medals[index]}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">
                            {perf.name}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            {perf.count} {perf.count === 1 ? 'venda' : 'vendas'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn(
                          "text-xs font-black font-mono",
                          index === 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-300"
                        )}>
                          {formatCurrency(perf.total)}
                        </p>
                        {index === 0 && (
                          <span className="text-[7px] text-amber-500 uppercase tracking-widest font-black leading-none block mt-0.5">LÍDER</span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* RIGHT SIDE: Today, Month Total and comparison with last month */}
          <div className="p-6 md:p-8 lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Today KPI */}
            <div className="bg-gradient-to-b from-indigo-500/[0.02] to-transparent dark:from-indigo-950/10 p-5 rounded-3xl border border-indigo-100/30 dark:border-indigo-900/10 flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover:border-indigo-500/20 transition-all">
              <div>
                <span className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block mb-2">⚡ FATURAMENTO HOJE</span>
                <p className="text-[20px] font-black text-slate-950 dark:text-white leading-none font-display">
                  {formatCurrency(todayTotal)}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-4 flex items-center justify-between text-[9px] text-slate-450 dark:text-slate-400 font-bold uppercase">
                <span>{todayCount} {todayCount === 1 ? 'venda' : 'vendas'}</span>
                <span className="text-indigo-500 font-black">Hoje</span>
              </div>
            </div>

            {/* Current Month KPI */}
            <div className="bg-gradient-to-b from-emerald-500/[0.02] to-transparent dark:from-emerald-950/10 p-5 rounded-3xl border border-emerald-100/30 dark:border-emerald-900/10 flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover:border-emerald-500/20 transition-all">
              <div>
                <span className="text-[8px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest block mb-2">📅 TOTAL DO MÊS</span>
                <p className="text-[20px] font-black text-slate-950 dark:text-white leading-none font-display">
                  {formatCurrency(monthComparisonStats.currentMonthSum)}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-4 flex flex-col text-[8px] text-slate-455 dark:text-slate-400 font-bold uppercase">
                <span className="truncate">Competência: {monthComparisonStats.currentMonthLabel}</span>
              </div>
            </div>

            {/* Comparison to Last Month KPI */}
            <div className="bg-gradient-to-b from-amber-500/[0.02] to-transparent dark:from-amber-950/10 p-5 rounded-3xl border border-amber-100/30 dark:border-amber-900/10 flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover:border-amber-500/20 transition-all">
              <div>
                <span className="text-[8px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest block mb-2">📊 COMPARATIVO MÊS ANT.</span>
                <p className="text-xs font-black text-slate-500 dark:text-slate-400 leading-none">
                  Faturado: <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(monthComparisonStats.lastMonthSum)}</strong>
                </p>
                <p className="text-[7px] text-slate-400 font-bold uppercase mt-1">Ref: {monthComparisonStats.lastMonthLabel}</p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-4 flex items-center justify-between">
                <span className="text-[8px] text-slate-455 dark:text-slate-400 font-black uppercase">Variação</span>
                {monthComparisonStats.lastMonthSum > 0 || monthComparisonStats.currentMonthSum > 0 ? (
                  <span className={cn(
                    "text-[10px] font-black px-1.5 py-0.5 rounded-md font-mono flex items-center gap-0.5",
                    monthComparisonStats.growthPct >= 0 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}>
                    {monthComparisonStats.growthPct >= 0 ? '▲ +' : '▼ '}
                    {Math.abs(monthComparisonStats.growthPct).toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Sem dados</span>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ⚡ Painel de Ações Rápidas (Quick Actions) */}
      {(settings.dashboardConfig?.showQuickActions ?? true) && (
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-amber-500 fill-amber-500 animate-pulse" />
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ações Rápidas & Atalhos</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <button
              onClick={handleStartEmptyVenda}
              className="flex flex-col items-center justify-center gap-3 p-5 bg-gradient-to-b from-emerald-50/50 to-emerald-50/10 dark:from-emerald-950/20 dark:to-emerald-950/5 hover:from-emerald-50/80 hover:to-emerald-50/40 dark:hover:from-emerald-950/30 dark:hover:to-emerald-950/10 border border-emerald-100/40 dark:border-emerald-900/20 rounded-3xl transition-all hover:scale-[1.03] text-center group"
            >
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
                <ShoppingCart size={16} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-slate-800 dark:text-white uppercase">Iniciar Venda</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Carrinho Vázio</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className="flex flex-col items-center justify-center gap-3 p-5 bg-gradient-to-b from-blue-50/50 to-blue-50/10 dark:from-blue-950/20 dark:to-blue-950/5 hover:from-blue-50/80 hover:to-blue-50/40 dark:hover:from-blue-950/30 dark:hover:to-blue-950/10 border border-blue-100/40 dark:border-blue-900/20 rounded-3xl transition-all hover:scale-[1.03] text-center group"
            >
              <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
                <Users size={16} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-slate-800 dark:text-white uppercase">Clientes</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Gerenciar CRM</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className="flex flex-col items-center justify-center gap-3 p-5 bg-gradient-to-b from-amber-50/50 to-amber-50/10 dark:from-amber-950/20 dark:to-amber-950/5 hover:from-amber-50/80 hover:to-amber-50/40 dark:hover:from-amber-950/30 dark:hover:to-amber-950/10 border border-amber-100/40 dark:border-amber-900/20 rounded-3xl transition-all hover:scale-[1.03] text-center group"
            >
              <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl group-hover:scale-110 transition-transform">
                <Package size={16} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-slate-800 dark:text-white uppercase">Catálogo</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Estoque & Preço</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('cashier')}
              className="flex flex-col items-center justify-center gap-3 p-5 bg-gradient-to-b from-purple-50/50 to-purple-50/10 dark:from-purple-950/20 dark:to-purple-950/5 hover:from-purple-50/80 hover:to-purple-50/40 dark:hover:from-purple-950/30 dark:hover:to-purple-950/10 border border-purple-100/40 dark:border-purple-900/20 rounded-3xl transition-all hover:scale-[1.03] text-center group"
            >
              <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-2xl group-hover:scale-110 transition-transform">
                <Wallet size={16} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-slate-800 dark:text-white uppercase">Fluxo de Caixa</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Abertura / Fecho</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className="flex flex-col items-center justify-center gap-3 p-5 bg-gradient-to-b from-rose-50/50 to-rose-50/10 dark:from-rose-950/20 dark:to-rose-950/5 hover:from-rose-50/80 hover:to-rose-50/40 dark:hover:from-rose-950/30 dark:hover:to-rose-950/10 border border-rose-100/40 dark:border-rose-900/20 rounded-3xl transition-all hover:scale-[1.03] text-center group"
            >
              <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl group-hover:scale-110 transition-transform">
                <History size={16} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-slate-800 dark:text-white uppercase">Vendas</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Relatórios & PDF</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('funcao_rotina')}
              className="flex flex-col items-center justify-center gap-3 p-5 bg-gradient-to-b from-indigo-50/50 to-indigo-50/10 dark:from-indigo-950/20 dark:to-indigo-950/5 hover:from-indigo-50/80 hover:to-indigo-50/40 dark:hover:from-indigo-950/30 dark:hover:to-indigo-950/10 border border-indigo-100/40 dark:border-indigo-900/20 rounded-3xl transition-all hover:scale-[1.03] text-center group"
            >
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform">
                <Clock size={16} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-slate-800 dark:text-white uppercase">Rotina Diária</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Ações de Venda</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 📱 Cartão de Desempenho Compacto para Celular */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-500 text-white p-6 rounded-[32px] border border-indigo-400/20 shadow-2xl space-y-4 text-left relative overflow-hidden">
        {/* Subtle background graphics */}
        <div className="absolute top-0 right-0 p-6 opacity-[0.08] text-white pointer-events-none">
          <Smartphone size={100} />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-white/10 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] bg-white/20 text-white px-2.5 py-0.5 rounded-full uppercase font-black tracking-widest flex items-center gap-1">
                📱 Focado em Smartphone
              </span>
              <span className="text-[8px] bg-emerald-400/20 text-emerald-100 px-2.5 py-0.5 rounded-full uppercase font-black tracking-widest">
                Dinâmico
              </span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-tight font-sans mt-1.5 text-white">
              Espelho de Vendas da Vendedora 👤
            </h3>
            <p className="text-[8.5px] text-white/80 font-bold uppercase mt-0.5">
              Acompanhe seus resultados individuais de forma rápida e compacta entre atendimentos
            </p>
          </div>

          <div className="w-full sm:w-auto shrink-0">
            <select
              value={selectedMobileVendedora}
              onChange={(e) => handleSelectMobileVendedora(e.target.value)}
              className="w-full sm:w-48 text-[10px] font-black bg-white/15 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/50 uppercase cursor-pointer"
            >
              <option value="" className="text-slate-700 bg-white">🔍 Escolha seu nome...</option>
              {allVendedoraNames.map(name => (
                <option key={name} value={name} className="bg-white text-slate-800 font-bold">{name}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedMobileVendedora ? (
          mobileVendedoraStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              {/* Ranking Card */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5 mb-2.5">
                    <span className="text-[8.5px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1">
                      🏆 Ranking Geral
                    </span>
                    <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/10">
                      <button
                        type="button"
                        onClick={() => setRankingTimeframe('today')}
                        className={cn(
                          "px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-tight transition-all",
                          rankingTimeframe === 'today'
                            ? "bg-white text-indigo-700 font-black shadow-xs"
                            : "text-white/75 hover:text-white"
                        )}
                      >
                        Hoje
                      </button>
                      <button
                        type="button"
                        onClick={() => setRankingTimeframe('month')}
                        className={cn(
                          "px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-tight transition-all",
                          rankingTimeframe === 'month'
                            ? "bg-white text-indigo-700 font-black shadow-xs"
                            : "text-white/75 hover:text-white"
                        )}
                      >
                        Mês
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(() => {
                      const list = rankingTimeframe === 'today' ? todayStaffPerformance : monthStaffPerformance;
                      const top3 = list.slice(0, 3);
                      
                      if (top3.length === 0) {
                        return (
                          <div className="text-center py-6 text-white/60 text-[10px] font-bold uppercase">
                            Nenhum registro ainda
                          </div>
                        );
                      }

                      return top3.map((perf, index) => {
                        const isCurrent = perf.name.trim().toUpperCase() === selectedMobileVendedora.trim().toUpperCase();
                        const rankColors = [
                          'text-amber-300 bg-amber-500/20 border-amber-300/30',
                          'text-white bg-white/20 border-white/30',
                          'text-rose-300 bg-rose-500/20 border-rose-300/30'
                        ];

                        return (
                          <div
                            key={perf.name}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-xl border transition-all",
                              isCurrent 
                                ? "bg-white/20 border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.2)]" 
                                : "bg-black/10 border-white/5 hover:bg-black/15"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "w-5 h-5 flex items-center justify-center text-[9px] font-black rounded-lg border shrink-0 font-mono",
                                rankColors[index] || 'text-white/80 bg-white/10 border-white/10'
                              )}>
                                {index + 1}º
                              </span>
                              <div className="min-w-0">
                                <p className={cn(
                                  "text-[9.5px] font-black uppercase tracking-tight truncate",
                                  isCurrent ? "text-amber-300" : "text-white"
                                )}>
                                  {perf.name}
                                </p>
                                <p className="text-[7.5px] text-white/60 font-bold uppercase tracking-wider">
                                  {perf.count} {perf.count === 1 ? 'venda' : 'vendas'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={cn(
                                "text-[10px] font-black font-mono",
                                isCurrent ? "text-amber-300" : "text-white"
                              )}>
                                {formatCurrency(perf.total)}
                              </p>
                              {index === 0 && (
                                <span className="text-[6.5px] text-amber-300 uppercase tracking-widest font-black block leading-none">Líder 👑</span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="text-[7.5px] text-white/60 uppercase font-black tracking-widest text-center pt-2 border-t border-white/10">
                  {rankingTimeframe === 'today' ? '⚡ Corrida de Hoje' : '🌟 Corrida Mensal'}
                </div>
              </div>

              {/* Today Card */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-white flex items-center gap-1"><span>⚡</span> Hoje</span>
                  {mobileVendedoraStats.today.rank > 0 && (
                    <span className="text-[8.5px] bg-amber-400/20 border border-amber-300/30 text-amber-300 px-2 py-0.5 rounded-full font-black uppercase">
                      {mobileVendedoraStats.today.rank}º Lugar 🏆
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/15 p-2.5 rounded-xl border border-white/5">
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-white/65">Faturado</p>
                    <p className="text-base font-black text-white font-mono mt-0.5">
                      {formatCurrency(mobileVendedoraStats.today.total)}
                    </p>
                  </div>
                  <div className="bg-black/15 p-2.5 rounded-xl border border-white/5">
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-white/65">Ticket Médio</p>
                    <p className="text-base font-black text-emerald-300 font-mono mt-0.5">
                      {formatCurrency(mobileVendedoraStats.today.ticket)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] text-white/90 font-bold bg-black/20 p-2 rounded-xl">
                  <span>Vendas: <strong className="text-white">{mobileVendedoraStats.today.count}</strong></span>
                  {mobileVendedoraStats.today.gapToAbove > 0 ? (
                    <span className="text-amber-200 font-black">
                      🎯 Falta {formatCurrency(mobileVendedoraStats.today.gapToAbove)} para passar {mobileVendedoraStats.today.personAbove}!
                    </span>
                  ) : mobileVendedoraStats.today.count > 0 ? (
                    <span className="text-amber-300 font-black flex items-center gap-1">
                      👑 Líder de Hoje!
                    </span>
                  ) : (
                    <span className="text-white/60">Nenhuma venda hoje</span>
                  )}
                </div>
              </div>

              {/* Month Card */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-white flex items-center gap-1"><span>📅</span> Este Mês</span>
                  {mobileVendedoraStats.month.rank > 0 && (
                    <span className="text-[8.5px] bg-emerald-400/20 border border-emerald-300/30 text-emerald-300 px-2 py-0.5 rounded-full font-black uppercase">
                      {mobileVendedoraStats.month.rank}º No Mês 🌟
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/15 p-2.5 rounded-xl border border-white/5">
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-white/65">Total Acumulado</p>
                    <p className="text-base font-black text-white font-mono mt-0.5">
                      {formatCurrency(mobileVendedoraStats.month.total)}
                    </p>
                  </div>
                  <div className="bg-black/15 p-2.5 rounded-xl border border-white/5">
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-white/65">Ticket Médio Mensal</p>
                    <p className="text-base font-black text-emerald-300 font-mono mt-0.5">
                      {formatCurrency(mobileVendedoraStats.month.ticket)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] text-white/90 font-bold bg-black/20 p-2 rounded-xl">
                  <span>Vendas: <strong className="text-white">{mobileVendedoraStats.month.count}</strong></span>
                  {mobileVendedoraStats.month.gapToAbove > 0 ? (
                    <span className="text-rose-200 font-black">
                      Falta {formatCurrency(mobileVendedoraStats.month.gapToAbove)} para passar {mobileVendedoraStats.month.personAbove}!
                    </span>
                  ) : mobileVendedoraStats.month.count > 0 ? (
                    <span className="text-amber-300 font-black">
                      👑 Líder de Vendas do Mês!
                    </span>
                  ) : (
                    <span className="text-white/60">Nenhuma venda este mês</span>
                  )}
                </div>

                {/* Comparativo Mês Passado */}
                <div className="bg-black/25 p-2.5 rounded-xl border border-white/10 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-white/65">Faturado Mês Passado</p>
                    <p className="text-xs font-black text-white font-mono mt-0.5">
                      {formatCurrency(mobileVendedoraStats.month.lastMonthTotal)}
                    </p>
                    <p className="text-[7px] font-bold text-white/60 uppercase">
                      {mobileVendedoraStats.month.lastMonthCount} {mobileVendedoraStats.month.lastMonthCount === 1 ? 'venda' : 'vendas'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-white/65">Comparativo</p>
                    {mobileVendedoraStats.month.lastMonthTotal > 0 || mobileVendedoraStats.month.total > 0 ? (
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-lg inline-block mt-1 font-mono",
                        mobileVendedoraStats.month.growthPct >= 0 
                          ? "bg-emerald-400/20 text-emerald-100 border border-emerald-300/30" 
                          : "bg-rose-400/20 text-rose-100 border border-rose-300/30"
                      )}>
                        {mobileVendedoraStats.month.growthPct >= 0 ? '▲ +' : '▼ '}
                        {Math.abs(mobileVendedoraStats.month.growthPct).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-[9px] text-white/60 font-bold block mt-1">Sem histórico</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="py-6 text-center bg-black/20 rounded-2xl border border-dashed border-white/15">
            <span className="text-lg">📱</span>
            <p className="text-[10px] font-black text-white/80 uppercase tracking-wider mt-1">Selecione seu nome acima para carregar seu espelho de faturamento pessoal</p>
          </div>
        )}
      </div>

      {/* ⚡ Painel de Performance do Dia de Hoje */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 text-left relative overflow-hidden">
        {/* Decorative background badge */}
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-amber-500 pointer-events-none">
          <Sparkles size={140} />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full uppercase font-black tracking-widest flex items-center gap-1">
                <Sparkles size={11} className="animate-spin text-amber-500" /> Em Tempo Real
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-sans mt-2">
              ⚡ Painel Detalhado de Hoje
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Veja em tempo real o faturamento, ticket médio, quem está vendendo mais/menos e os produtos vendidos hoje!
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full uppercase font-bold tracking-wider border border-slate-100 dark:border-slate-800">
              {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Metric cards of today */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-indigo-50/10 dark:from-indigo-950/20 dark:to-indigo-950/5 border border-indigo-100/40 dark:border-indigo-900/20 rounded-3xl flex items-center gap-4">
            <div className="p-3.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Faturamento de Hoje</p>
              <p className="text-xl font-black text-slate-900 dark:text-white font-display mt-0.5">{formatCurrency(todayTotal)}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{todayCount} {todayCount === 1 ? 'venda' : 'vendas'} concluídas</p>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-emerald-50/50 to-emerald-50/10 dark:from-emerald-950/20 dark:to-emerald-950/5 border border-emerald-100/40 dark:border-emerald-900/20 rounded-3xl flex items-center gap-4">
            <div className="p-3.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <Award size={22} />
            </div>
            <div>
              <p className="text-[8px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest">Ticket Médio Diário</p>
              <p className="text-xl font-black text-slate-900 dark:text-white font-display mt-0.5">
                {formatCurrency(todayCount > 0 ? todayTotal / todayCount : 0)}
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Média de valor por venda hoje</p>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-amber-50/50 to-amber-50/10 dark:from-amber-950/20 dark:to-amber-950/5 border border-amber-100/40 dark:border-amber-900/20 rounded-3xl flex items-center gap-4">
            <div className="p-3.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Trophy size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest">Destaques de Hoje</p>
              {todayStaffPerformance.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {/* Faturamento leader */}
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate flex items-center gap-1.5 uppercase leading-none">
                    <span title="Destaque faturamento">💰</span>
                    <span className="truncate">{todayStaffPerformance[0].name}</span>
                    <span className="text-[10px] font-mono text-amber-655 dark:text-amber-400 shrink-0">({formatCurrency(todayStaffPerformance[0].total)})</span>
                  </div>
                  {/* Atendimentos leader */}
                  {(() => {
                    const sortedByCount = [...todayStaffPerformance].sort((a, b) => b.count - a.count);
                    if (sortedByCount[0] && sortedByCount[0].name !== todayStaffPerformance[0].name) {
                      return (
                        <div className="text-xs font-black text-slate-900 dark:text-white truncate flex items-center gap-1.5 uppercase leading-none border-t border-amber-500/10 pt-1 mt-1">
                          <span title="Destaque atendimentos">📦</span>
                          <span className="truncate">{sortedByCount[0].name}</span>
                          <span className="text-[10px] font-mono text-indigo-650 dark:text-indigo-400 shrink-0">({sortedByCount[0].count}v)</span>
                        </div>
                      );
                    }
                    return (
                      <p className="text-[7.5px] text-slate-450 dark:text-slate-500 uppercase font-black tracking-wider leading-none mt-1 border-t border-amber-500/10 pt-1">
                        Líder em valor e volume ({todayStaffPerformance[0].count}v)
                      </p>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Sem vendas hoje</p>
              )}
            </div>
          </div>
        </div>

        {todayCount === 0 ? (
          <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/10 rounded-[30px] border border-dashed border-slate-200 dark:border-slate-800/60 relative z-10">
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhuma venda realizada hoje ainda</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Abra o caixa e clique em "Nova Venda" para começar a faturar!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 pt-2">
            {/* Left Side: Salesperson Ranking of Today (who sold more vs less) */}
            <div className="lg:col-span-5 bg-slate-50/60 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 space-y-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Trophy size={14} className="text-amber-500" /> Ranking de Vendedoras (Hoje)
                </h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Quem está faturando mais no plantão de hoje</p>
              </div>

              {/* Placar da Amistosa Competição (Battleground) */}
              {(() => {
                const leader = todayStaffPerformance[0];
                const runnerUp = todayStaffPerformance[1];
                if (!leader) return null;

                return (
                  <div className="p-3.5 bg-gradient-to-r from-amber-500/[0.07] to-rose-500/[0.07] dark:from-amber-950/20 dark:to-rose-950/20 border border-amber-500/15 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs">⚔️</span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Battleground de Vendedoras
                      </span>
                    </div>
                    {runnerUp ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-snug">
                          <span className="font-extrabold text-amber-600 dark:text-amber-400 uppercase">{leader.name}</span> lidera, com <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase">{runnerUp.name}</span> na cola! Diferença de apenas <span className="font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-900/30 px-1 rounded">{formatCurrency(leader.total - runnerUp.total)}</span>.
                        </p>
                        <div className="h-1.5 w-full bg-slate-200/50 dark:bg-slate-700 rounded-full flex overflow-hidden">
                          <div 
                            className="bg-amber-500" 
                            style={{ width: `${(leader.total / (leader.total + runnerUp.total)) * 100}%` }}
                            title={`${leader.name}: ${Math.round((leader.total / (leader.total + runnerUp.total)) * 100)}%`}
                          />
                          <div 
                            className="bg-indigo-500" 
                            style={{ width: `${(runnerUp.total / (leader.total + runnerUp.total)) * 100}%` }}
                            title={`${runnerUp.name}: ${Math.round((runnerUp.total / (leader.total + runnerUp.total)) * 100)}%`}
                          />
                        </div>
                        <p className="text-[8px] text-slate-400 dark:text-slate-450 font-bold uppercase text-center mt-1">
                          Quem vai conquistar o topo de hoje? Faltam poucas vendas! 🚀
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-snug">
                          <span className="font-extrabold text-amber-600 dark:text-amber-400 uppercase">{leader.name}</span> abriu vantagem isolada com <span className="font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(leader.total)}</span>!
                        </p>
                        <p className="text-[8px] text-slate-400 dark:text-slate-450 font-bold uppercase mt-1">
                          Faça mais vendas para desafiar o topo! 🏁
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-2.5">
                {todayStaffPerformance.map((st, idx) => {
                  const maxVal = todayStaffPerformance[0]?.total || 1;
                  const widthPct = (st.total / maxVal) * 100;
                  const isFirst = idx === 0;
                  const isLast = idx === todayStaffPerformance.length - 1 && todayStaffPerformance.length > 1;

                  const nameUpper = st.name.trim().toUpperCase();
                  const isMorningValueDestaque = shiftHighlights.morningTotalName && nameUpper === shiftHighlights.morningTotalName.trim().toUpperCase();
                  const isMorningCountDestaque = shiftHighlights.morningCountName && nameUpper === shiftHighlights.morningCountName.trim().toUpperCase();
                  const isAfternoonValueDestaque = shiftHighlights.afternoonTotalName && nameUpper === shiftHighlights.afternoonTotalName.trim().toUpperCase();
                  const isAfternoonCountDestaque = shiftHighlights.afternoonCountName && nameUpper === shiftHighlights.afternoonCountName.trim().toUpperCase();

                  return (
                    <div key={st.name} className="dashboard-vendedoras-card p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-2xs flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                          isFirst ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                          isLast ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" :
                          "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-350"
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate flex items-center gap-1.5">
                            {st.name}
                            {isFirst && <span title="Melhor Vendedora Hoje">👑</span>}
                            {isLast && <span title="Menor Volume Hoje">⚠️</span>}
                          </p>

                          {/* Shift Highlights badges */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {isMorningValueDestaque && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-500/10">
                                <Sun size={8} className="text-amber-500" />
                                <span>Destaque Manhã (Valor: {formatCurrency(st.morningTotal)})</span>
                              </span>
                            )}
                            {isMorningCountDestaque && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider bg-amber-100/50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border border-amber-500/10">
                                <Sun size={8} className="text-amber-500" />
                                <span>Destaque Manhã (Vol: {st.morningCount}v)</span>
                              </span>
                            )}
                            {isAfternoonValueDestaque && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10">
                                <Moon size={8} className="text-indigo-500" />
                                <span>Destaque Tarde (Valor: {formatCurrency(st.afternoonTotal)})</span>
                              </span>
                            )}
                            {isAfternoonCountDestaque && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider bg-indigo-100/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/10">
                                <Moon size={8} className="text-indigo-500" />
                                <span>Destaque Tarde (Vol: {st.afternoonCount}v)</span>
                              </span>
                            )}
                          </div>

                          <div className="w-24 h-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isFirst ? "bg-amber-500" : isLast ? "bg-rose-400" : "bg-indigo-500"}`} 
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-slate-900 dark:text-white font-display">
                          {formatCurrency(st.total)}
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">
                          {st.count} {st.count === 1 ? 'venda' : 'vendas'} • TM {formatCurrency(st.total / st.count)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Detailed Item Breakdown per Active Salesperson (Who sold what products) */}
            <div className="lg:col-span-7 bg-slate-50/60 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 space-y-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag size={14} className="text-indigo-500" /> Itens Vendidos no Dia por Vendedora
                </h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Detalhamento exato de quais produtos cada profissional vendeu e seus respectivos valores</p>
              </div>

              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                {todayStaffPerformance.map((st) => (
                  <div key={st.name} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-4 space-y-3 shadow-2xs">
                    {/* Salesperson Header */}
                    <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-700/50 pb-2">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        👤 {st.name}
                      </span>
                      <div className="text-right">
                        <span className="text-[9px] bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-350 px-2 py-0.5 rounded-md font-bold uppercase border border-slate-100 dark:border-slate-750">
                          Total: {formatCurrency(st.total)}
                        </span>
                      </div>
                    </div>

                    {/* List of Products sold by this salesperson */}
                    <div className="space-y-1.5">
                      {st.items.map((item, itemIdx) => (
                        <div 
                          key={`${item.saleId}-${itemIdx}`} 
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-xl bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 font-bold font-mono">#{itemIdx + 1}</span>
                            <p className="font-extrabold text-slate-800 dark:text-slate-200 uppercase truncate">
                              {item.name}
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-2 shrink-0 ml-3">
                            {item.quantity > 1 && (
                              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded font-black font-mono">
                                {item.quantity}x
                              </span>
                            )}
                            <p className="font-black text-slate-900 dark:text-white font-mono text-[11px]">
                              {formatCurrency(item.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN (2 grids wide on desktop) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Mini Sales Chart (Últimos 7 dias) */}
          {(settings.dashboardConfig?.showWeeklyChart ?? true) && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Semanal</p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Vendas nos Últimos 7 Dias</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Acumulado</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(chartData.reduce((acc, d) => acc + d.total, 0))}
                  </p>
                </div>
              </div>

              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="homeRoseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" dark:stroke="#334155" />
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
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <RechartsTooltip 
                      formatter={(value: any) => [formatCurrency(Number(value)), 'Total Faturado']}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#homeRoseGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 🎯 Termômetro de Ticket Médio */}
          {(settings.dashboardConfig?.showAverageTicket ?? true) && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Target size={12} className="text-amber-500" />
                    Métrica de Performance
                  </p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">🎯 Termômetro de Ticket Médio</h3>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-850/40 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="text-left">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Valor do Mês</p>
                    <p className="text-xl font-black text-amber-500">{formatCurrency(averageTicketData.ticketMedio)}</p>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                  <div className="text-right hidden sm:block">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Meta Ideal</p>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">{formatCurrency(averageTicketData.targetTicket)}</p>
                  </div>
                </div>
              </div>

              {/* O Termômetro Visual */}
              <div className="space-y-4 bg-gradient-to-r from-slate-50 to-slate-50/50 dark:from-slate-850/40 dark:to-slate-850/10 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 relative overflow-hidden">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span>R$ 0</span>
                  <span>Alerta (R$ 100)</span>
                  <span className="hidden sm:inline">Saudável (R$ 150)</span>
                  <span className="text-amber-500 font-extrabold flex items-center gap-1">Meta ({formatCurrency(averageTicketData.targetTicket)}) 🔥</span>
                </div>

                {/* Corpo do Termômetro */}
                <div className="relative h-7 bg-slate-100 dark:bg-slate-950 rounded-full p-1 border border-slate-200 dark:border-slate-855 flex items-center shadow-inner">
                  {/* Mercúrio / Indicador de temperatura */}
                  <div 
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r transition-all duration-1000 relative shadow-sm min-w-[20px]",
                      averageTicketData.color
                    )}
                    style={{ width: `${averageTicketData.percentage}%` }}
                  >
                    {/* Glow effect at the tip of the thermometer */}
                    <span className="absolute -right-2 -top-1 w-7 h-7 bg-white dark:bg-slate-900 rounded-full border-4 border-amber-500 shadow-md flex items-center justify-center animate-pulse">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    </span>
                  </div>
                </div>

                {/* Informações adicionais do Ticket */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status Atual</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{averageTicketData.advice}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">💡 Sugestão para aumentar conversão</p>
                    <p className="text-xs font-bold text-slate-805 dark:text-slate-200 leading-relaxed">{averageTicketData.recommendation}</p>
                  </div>
                </div>

                {/* Volume de Vendas vs Ticket */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between sm:items-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 gap-1">
                  <span>Total de Pedidos Concluídos este mês: <strong className="text-slate-700 dark:text-white">{averageTicketData.totalVendas}</strong></span>
                  <span>Aproveitamento Geral: <strong className="text-amber-500 font-extrabold">{averageTicketData.percentage}%</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Caixa do Dia & Nova Venda */}
          {(settings.dashboardConfig?.showCashierStatus ?? true) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Caixa do Dia */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Caixa do Dia</h4>
                    <span className={cn(
                      "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                      isCashierOpen 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400" 
                        : "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-400"
                    )}>
                      {isCashierOpen ? '🟢 Aberto' : '🔴 Fechado'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(todayTotal)}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{todayCount} vendas realizadas hoje</p>
                  </div>

                  {/* Splits visually */}
                  {todayCount > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Meios de pagamento hoje:</p>
                      <div className="flex gap-1 h-2.5 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                        {paymentSplits.PIX > 0 && <div className="bg-blue-500" style={{ width: `${(paymentSplits.PIX / todayTotal) * 100}%` }} title="PIX" />}
                        {paymentSplits.DINHEIRO > 0 && <div className="bg-emerald-500" style={{ width: `${(paymentSplits.DINHEIRO / todayTotal) * 100}%` }} title="Dinheiro" />}
                        {paymentSplits.CARD > 0 && <div className="bg-purple-500" style={{ width: `${(paymentSplits.CARD / todayTotal) * 100}%` }} title="Cartões" />}
                        {paymentSplits.OUTROS > 0 && <div className="bg-slate-400" style={{ width: `${(paymentSplits.OUTROS / todayTotal) * 100}%` }} title="Outros" />}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500 dark:text-slate-400 font-bold">
                        {paymentSplits.PIX > 0 && <span className="flex items-center gap-1">🔷 PIX: {formatCurrency(paymentSplits.PIX)}</span>}
                        {paymentSplits.DINHEIRO > 0 && <span className="flex items-center gap-1">💵 Espécie: {formatCurrency(paymentSplits.DINHEIRO)}</span>}
                        {paymentSplits.CARD > 0 && <span className="flex items-center gap-1">💳 Cartões: {formatCurrency(paymentSplits.CARD)}</span>}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setActiveTab('cashier')}
                  className="w-full py-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-750 text-slate-700 dark:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 transition-all"
                >
                  <Wallet size={14} />
                  Acessar Caixa do Dia
                </button>
              </div>

              {/* Nova Venda Rápida Search/Shortcut */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Atalho de Venda Rápida</h4>
                  
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Buscar produto para adicionar e vender..."
                      value={vProductSearch}
                      onChange={(e) => setVProductSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-805 border border-slate-205 dark:border-slate-750 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  {vProductSearch.trim() && (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pt-1">
                      {filteredSearchProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 transition-all">
                          <div className="truncate pr-2">
                            <p className="text-xs font-black uppercase text-slate-805 dark:text-white truncate">{p.name}</p>
                            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Estoque: {p.stock} • {p.brand}</p>
                          </div>
                          <button
                            onClick={() => handleStartVendaWithProduct(p)}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-all shrink-0"
                          >
                            <ShoppingCart size={10} />
                            Vender
                          </button>
                        </div>
                      ))}
                      {filteredSearchProducts.length === 0 && (
                        <p className="text-[10px] text-slate-400 font-bold uppercase text-center mt-2 italic">Nenhum produto em estoque</p>
                      )}
                    </div>
                  )}
                </div>

                {!vProductSearch.trim() && (
                  <div className="p-4 bg-emerald-55/40 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl text-center">
                    <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold leading-relaxed">
                      Pesquise um produto para iniciar um atendimento com o carrinho preenchido imediatamente!
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN (1 grid wide: Celebrations, Events, Goals & Alerts) */}
        <div className="space-y-8">
                  {/* Informações Importantes (Meta, Alertas, Contas) */}
          {((settings.dashboardConfig?.showGoalProgress ?? true) || 
            (settings.dashboardConfig?.showLowStockAlerts ?? true) || 
            (settings.dashboardConfig?.showPendingBills ?? true)) && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight border-b border-slate-50 dark:border-slate-800 pb-3 flex items-center gap-2">
                <Info size={16} className="text-blue-500" />
                Informações Importantes
              </h3>

              {/* Goal progress block */}
              {activeGoal && (settings.dashboardConfig?.showGoalProgress ?? true) && (
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100/50 dark:border-slate-800">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <span>Meta de Vendas ({activeGoal.month})</span>
                    <span className="text-blue-600 dark:text-blue-400">{goalProgress.percent}%</span>
                  </div>
                  <div className="h-4 bg-slate-205 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-100 dark:border-slate-850 p-0.5">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000 flex items-center justify-end pr-2 text-[8px] font-black text-white"
                      style={{ width: `${goalProgress.percent}%` }}
                    >
                      {goalProgress.percent > 15 && `${goalProgress.percent}%`}
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {formatCurrency(goalProgress.current)} de {formatCurrency(goalProgress.target)}
                  </p>
                </div>
              )}

              {/* Low stock indicators */}
              {lowStockProducts.length > 0 && (settings.dashboardConfig?.showLowStockAlerts ?? true) && (
                <div className="space-y-3 pt-3 border-t border-slate-50 dark:border-slate-850/60">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle className="text-rose-500" size={14} />
                    <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Alerta de Estoque Crítico</p>
                  </div>
                  <div className="space-y-2">
                    {lowStockProducts.map(p => (
                      <div key={p.id} className="flex justify-between items-center text-xs p-2 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/40 dark:border-rose-900/10 rounded-xl">
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{p.name}</span>
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 rounded-md font-black text-[9px] uppercase shrink-0">
                          Restam {p.stock}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending bills block */}
              {upcomingBills.length > 0 && (settings.dashboardConfig?.showPendingBills ?? true) && (
                <div className="space-y-3 pt-3 border-t border-slate-50 dark:border-slate-850/60">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Contas à pagar próximamente</p>
                  <div className="space-y-2">
                    {upcomingBills.map(b => (
                      <div key={b.id} className="flex justify-between items-center text-xs p-2 bg-amber-50/50 dark:bg-amber-955/10 border border-amber-100/40 dark:border-amber-900/10 rounded-xl">
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{b.description}</span>
                        <span className="font-black text-slate-900 dark:text-white text-[10px]">
                          Dia {b.dueDate} • {formatCurrency(b.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO INFORMATIVA: DIA PURAMENTE OPERACIONAL (Task 2) */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 text-left">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight border-b border-slate-50 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Calendar size={16} className="text-amber-500" />
              Períodos Operacionais Sugeridos
            </h3>

            {weekdaysAverages && weekdaysAverages.length > 0 ? (() => {
              const opDay = weekdaysAverages[0]; // Lowest faturamento average
              return (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-500/10 text-amber-800 dark:text-amber-305 rounded-3xl border border-amber-500/20">
                    <span className="text-[8px] font-black uppercase tracking-wider bg-amber-500/15 px-2.5 py-1 rounded-full text-amber-605 dark:text-amber-400 block w-fit mb-2">
                      💡 Dia de Baixo Fluxo Detectado
                    </span>
                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Aproveite a {opDay.dayName}-feira!
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal mt-1 font-medium">
                      Análise histórica indica menor faturamento na **{opDay.dayName}-feira** com média de faturamento diário de **{formatCurrency(opDay.average)}**. Sugerimos aproveitar este período para organização interna.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2 font-sans">
                    <p className="font-extrabold text-slate-700 dark:text-slate-300 uppercase text-[9px] tracking-wider">🎯 Sugestão de Organização Interna:</p>
                    <ul className="list-disc pl-4 space-y-1 font-medium leading-relaxed">
                      <li>Executar contagem física de estoque de cosméticos.</li>
                      <li>Reorganizar a vitrine e prateleiras de destaque.</li>
                      <li>Cadastrar novas promoções e atualizar preços no sistema.</li>
                      <li>Realizar reuniões de alinhamento com a equipe de vendas.</li>
                    </ul>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ranking de Dias (Menor faturamento médio):</p>
                    <div className="space-y-1.5">
                      {weekdaysAverages.slice(0, 3).map((day, ix) => (
                        <div key={day.dayName} className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-600 dark:text-slate-400">{ix + 1}. {day.dayName}-feira</span>
                          <span className="font-black text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(day.average)}/dia</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })() : (
              <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-4 italic">Sem dados históricos suficientes para análise.</p>
            )}
          </div>

          {/* SESSÃO: Alerta de Horários de Pico Inteligentes (Gargalos de Vendas) */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 text-left">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight border-b border-slate-50 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Zap size={16} className="text-amber-500 animate-pulse" />
              Alerta de Horários de Pico
            </h3>

            {peakHourStats.hasSales ? (
              <div className="space-y-4">
                <div className="p-4 bg-indigo-500/10 text-indigo-800 dark:text-indigo-305 rounded-3xl border border-indigo-500/20">
                  <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-500/15 px-2.5 py-1 rounded-full text-indigo-605 dark:text-indigo-400 block w-fit mb-2">
                    🔥 Faixa Horária Mais Rentável
                  </span>
                  <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Pico histórico: {peakHourStats.topHours[0].label} às {String(peakHourStats.topHours[0].hour + 1).padStart(2, '0')}:00
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal mt-1 font-medium">
                    As vendas se concentram fortemente neste horário, com um acumulado de **{formatCurrency(peakHourStats.topHours[0].revenue)}** em faturamento histórico. Reforce a atenção!
                  </p>
                </div>

                {/* Mini graphical bar list representing traffic */}
                <div className="space-y-2.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tráfego de Vendas Histórico por Hora:</p>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {peakHourStats.all.slice(0, 5).map((item, index) => {
                      const maxCount = Math.max(...peakHourStats.all.map(i => i.count)) || 1;
                      const pct = (item.count / maxCount) * 105;
                      const isTop = index === 0;

                      return (
                        <div key={item.hour} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5 font-black uppercase">
                              ⏰ {item.label} às {String(item.hour + 1).padStart(2, '0')}:00
                              {isTop && <span className="text-[8px] bg-rose-500/15 text-rose-500 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">PICO</span>}
                            </span>
                            <span className="font-mono text-[9px] font-extrabold">{item.count} atendimentos • {formatCurrency(item.revenue)}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all",
                                isTop ? "bg-gradient-to-r from-rose-500 to-amber-500" : "bg-indigo-500"
                              )}
                              style={{ width: `${Math.min(100, Math.max(12, pct))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  💡 <strong>Recomendação de Fluxo:</strong> Evite agendar pausas, reposições de prateleiras ou lanchinhos durante as **{peakHourStats.topHours[0].label}**! Deixe a equipe 100% focada e com o balcão livre para maximizar as vendas.
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-4 italic">Faturamento histórico sem dados de horário suficientes.</p>
            )}
          </div>

          {/* SESSÃO: Datas Comemorativas & Aniversários */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight border-b border-slate-50 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Calendar size={16} className="text-purple-500" />
              Eventos & Aniversariantes
            </h3>

            {/* Birthdays celebrations */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-purple-55/15 dark:bg-purple-950/10 px-4.5 py-2 rounded-2xl">
                <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                  🎂 Aniversariantes de {now.toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}
                </p>
                <span className="bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                  {upcomingBirthdays.length}
                </span>
              </div>
              
              <div className="space-y-3 max-h-[280px] overflow-y-auto scrollbar-hide">
                {upcomingBirthdays.map(customer => {
                  const bParts = customer.birthDate!.split('-');
                  const bText = `${bParts[2]}/${bParts[1]}`;
                  const isBirthDayToday = customer.bDay === now.getDate();

                  return (
                    <div 
                      key={customer.id} 
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-2xl border transition-all",
                        isBirthDayToday 
                          ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/30 animate-pulse" 
                          : "bg-purple-50/40 dark:bg-purple-950/15 border-purple-100/45 dark:border-purple-900/20 group"
                      )}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{customer.name}</p>
                          {isBirthDayToday && (
                            <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest shrink-0">Hoje 🎉</span>
                          )}
                        </div>
                        <p className="text-[9px] font-extrabold text-slate-400 capitalize tracking-widest">Nascimento em {bText}</p>
                      </div>
                      <button
                        onClick={() => {
                          const msg = `Parabéns ${customer.name}! 🎉 Desejamos muito sucesso, saúde e felicidade! Venha comemorar conosco na Biobel, temos mimos para você! 💖`;
                          window.open(getWhatsAppUrl(customer.phone, msg), '_blank');
                        }}
                        className="p-2 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 transition-all shadow-sm shrink-0"
                        title="Enviar Parabéns WhatsApp"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  );
                })}

                {upcomingBirthdays.length === 0 && (
                  <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-4 italic">Sem aniversários neste mês</p>
                )}
              </div>
            </div>

            {/* Commemorative Dates Section */}
            <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-850/60">
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Gift size={13} className="text-amber-500" />
                🌟 Próximas Datas Comemorativas
              </p>
              
              <div className="space-y-3">
                {commemorativeEvents.map(ev => {
                  const day = String(ev.day).padStart(2, '0');
                  const monthName = new Date(2026, ev.month, 1).toLocaleString('pt-BR', { month: 'long' });
                  const dateFormatted = `${day} de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
                  
                  return (
                    <div key={ev.id} className="p-3.5 bg-amber-55/10 dark:bg-amber-955/5 rounded-2xl border border-amber-100/40 dark:border-amber-900/20">
                      <div className="flex justify-between items-start mb-1.5">
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate pr-1">{ev.name}</p>
                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-md uppercase tracking-widest shrink-0">{dateFormatted}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-450 font-bold leading-normal">{ev.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming custom calendar events */}
            {upcomingEvents.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-850/60">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">📅 Calendário de Eventos Comercial</p>
                <div className="space-y-3">
                  {upcomingEvents.map(ev => {
                    const dateFormatted = new Date(ev.date + 'T12:00:00Z').toLocaleDateString('pt-BR');
                    return (
                      <div key={ev.id} className="p-3 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate pr-1">{ev.name}</p>
                          <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-455 uppercase tracking-widest shrink-0">{dateFormatted}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-normal">{ev.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
