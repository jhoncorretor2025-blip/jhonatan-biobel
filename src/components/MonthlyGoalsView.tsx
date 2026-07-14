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

export const MonthlyGoalsView = ({ monthlyGoals, setMonthlyGoals, staff, formatCurrency }: any) => {
  const currentGoal = monthlyGoals[0]; // For simplicity, use the first one
  const [holidayDate, setHolidayDate] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  const updateGoal = (field: string, value: any) => {
    setMonthlyGoals(monthlyGoals.map((g: any) => 
      g.id === currentGoal.id ? { ...g, [field]: value } : g
    ));
  };

  const addCustomEvent = () => {
    if (!eventName || !eventDate) return;
    const newEvent = {
      id: `ev-${Date.now()}`,
      date: eventDate,
      name: eventName,
      description: eventDesc
    };
    const eventsList = currentGoal.customEvents || [];
    updateGoal('customEvents', [...eventsList, newEvent]);
    setEventName('');
    setEventDate('');
    setEventDesc('');
  };

  const removeCustomEvent = (id: string) => {
    const eventsList = currentGoal.customEvents || [];
    updateGoal('customEvents', eventsList.filter((ev: any) => ev.id !== id));
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

  // Calculate Saturdays dynamically based on currentGoal Month/Year
  const [goalYear, goalMonth] = useMemo(() => {
    if (!currentGoal?.id || !currentGoal.id.includes('-')) {
      const now = new Date();
      return [now.getFullYear(), now.getMonth()];
    }
    const [yStr, mStr] = currentGoal.id.split('-');
    return [parseInt(yStr) || new Date().getFullYear(), (parseInt(mStr) || 1) - 1];
  }, [currentGoal?.id]);

  const monthSaturdays = useMemo(() => {
    const dates: Date[] = [];
    const daysInMonth = new Date(goalYear, goalMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(goalYear, goalMonth, d);
      if (date.getDay() === 6) { // Saturday
        dates.push(date);
      }
    }
    return dates;
  }, [goalYear, goalMonth]);

  const saturdayShort = currentGoal.saturdayGoalShort || 0;
  const saturdayShortCount = currentGoal.saturdayGoalShortCount !== undefined ? currentGoal.saturdayGoalShortCount : 2;
  const saturdayLong = currentGoal.saturdayGoalLong || 0;
  const saturdayLongCount = currentGoal.saturdayGoalLongCount !== undefined ? currentGoal.saturdayGoalLongCount : 2;

  const totalSaturdayGoal = useMemo(() => {
    if (currentGoal.saturdayGoalType === 'individual') {
      return monthSaturdays.reduce((acc, sat) => {
        const key = sat.toISOString().split('T')[0];
        const sched = currentGoal.saturdaySchedules?.[key];
        return acc + (sched?.goal !== undefined ? Number(sched.goal) : (currentGoal.saturdayGoal || 0));
      }, 0);
    } else if (currentGoal.saturdayGoalType === 'split') {
      return (saturdayShort * saturdayShortCount) + (saturdayLong * saturdayLongCount);
    } else {
      return (currentGoal.saturdayGoal || 0) * monthSaturdays.length;
    }
  }, [currentGoal, monthSaturdays, saturdayShort, saturdayShortCount, saturdayLong, saturdayLongCount]);

  const updateSaturdaySchedule = (dateKey: string, updatedField: any) => {
    const schedules = { ...(currentGoal.saturdaySchedules || {}) };
    if (!schedules[dateKey]) {
      schedules[dateKey] = { openTime: '09:00', closeTime: '13:00', goal: currentGoal.saturdayGoal || 1500 };
    }
    schedules[dateKey] = {
      ...schedules[dateKey],
      ...updatedField
    };
    
    if (updatedField.closeTime !== undefined) {
      const open = schedules[dateKey].openTime;
      const close = updatedField.closeTime;
      let targetGoal = currentGoal.saturdayGoal || 1500;
      
      if (close === '16:00') {
        targetGoal = currentGoal.saturdayGoalLong || 3000;
      } else if (close === '13:00') {
        targetGoal = currentGoal.saturdayGoalShort || 1500;
      } else {
        const openH = parseInt(open.split(':')[0]) || 9;
        const closeH = parseInt(close.split(':')[0]) || 13;
        const hours = Math.max(0, closeH - openH);
        targetGoal = Math.round((hours / 4) * (currentGoal.saturdayGoalShort || 1500));
      }
      schedules[dateKey].goal = targetGoal;
    }
    updateGoal('saturdaySchedules', schedules);
  };

  const remainingGoal = Math.max(0, currentGoal.storeGoal - totalSaturdayGoal);
  const dailyGoal = remainingGoal / effectiveWorkingDays;
  const weeklyGoal = dailyGoal * 5;

  const generateGoalsPDF = () => {
    const doc = new jsPDF();
    
    // Header Stripe
    doc.setFillColor(30, 41, 59); // Indigo/Slate dark gray
    doc.rect(0, 0, 210, 45, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('BIOBEL - SISTEMA DE GESTAO', 15, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`PLANEJAMENTO & OBJETIVOS MENSAIS — REFERÊNCIA: ${currentGoal.month.toUpperCase()}`, 15, 29);
    
    // Border or bottom thin line
    doc.setFillColor(79, 70, 229); // Royal Indigo color accent
    doc.rect(0, 42, 210, 3, 'F');
    
    // Meta Geral Section
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('1. METAS GERAIS DA LOJA', 15, 60);
    
    // Draw summary box
    doc.setFillColor(248, 250, 252); // soft slate background
    doc.rect(15, 65, 180, 45, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, 65, 180, 45, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('META GERAL DA LOJA:', 20, 75);
    doc.text('COMISSÃO / BÔNUS EXTRA:', 20, 83);
    doc.text('DIAS ÚTEIS EFETIVOS:', 20, 91);
    doc.text('SOMA DAS METAS INDIVIDUAIS:', 20, 99);
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(currentGoal.storeGoal), 80, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(currentGoal.extraBonus ? `${currentGoal.extraBonus}% (Se bater meta geral)` : 'Não configurado', 80, 83);
    doc.text(`${effectiveWorkingDays} dias (22 dias padrão - ${currentGoal.holidays.length} feriados)`, 80, 91);
    doc.text(formatCurrency(totalStaffGoals), 80, 99);
    
    // Daily / Saturday goals column
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('META DIÁRIA (SEG-SEX):', 125, 75);
    doc.text('META SEMANAL (SEG-SEX):', 125, 83);
    doc.text('SÁBADOS (TOTAL):', 125, 91);
    
    doc.setTextColor(79, 70, 229); // Royal Indigo
    doc.text(formatCurrency(dailyGoal), 165, 75);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(weeklyGoal), 165, 83);
    doc.text(formatCurrency(totalSaturdayGoal), 165, 91);
    
    // Section 2: Individual goals autoTable
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('2. OBJETIVOS E METAS DAS CONSULTORAS', 15, 122);
    
    const activeStaff = staff.filter((s: any) => s.status !== 'inactive');
    const tableData = activeStaff.map((s: any) => {
      const sGoal = currentGoal.staffGoals[s.name]?.monthlyGoal || 0;
      const sComm = currentGoal.staffGoals[s.name]?.commission || 3;
      const dailyEst = effectiveWorkingDays > 0 ? (sGoal / effectiveWorkingDays) : 0;
      return [
        s.name.toUpperCase(),
        formatCurrency(sGoal),
        `${sComm}%`,
        formatCurrency(dailyEst),
        'Ativa'
      ];
    });
    
    autoTable(doc, {
      startY: 127,
      head: [['CONSULTORA', 'META MENSAL', 'COMISSÃO BASE', 'EST. DIÁRIA (SEG-SEX)', 'STATUS']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, font: 'helvetica' },
      margin: { left: 15, right: 15 }
    });
    
    let currentY = (doc as any).lastAutoTable.finalY + 15;
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }
    
    // Section 3: Saturdays and Calendar
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('3. DETALHAMENTO DE EVENTOS E SÁBADOS', 15, currentY);
    
    currentY += 6;
    
    // Split into left and right boxes: Left for Holidays/Events, Right for Saturdays Detail
    const boxHeight = 45;
    // Left: Holidays and Events
    doc.setFillColor(248, 250, 252);
    doc.rect(15, currentY, 86, boxHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, currentY, 86, boxHeight, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(220, 38, 38); // red/orange
    doc.text('FERIADOS / BLOQUEIOS:', 20, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    
    if (currentGoal.holidays.length === 0) {
      doc.text('Nenhum feriado registrado.', 20, currentY + 12);
    } else {
      const holidayList = currentGoal.holidays.map((h: string) => {
        try {
          return new Date(h + 'T00:00:00').toLocaleDateString('pt-BR');
        } catch(e) {
          return h;
        }
      }).join(', ');
      const splitHolidays = doc.splitTextToSize(holidayList, 76);
      doc.text(splitHolidays, 20, currentY + 12);
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229); // indigo
    doc.text('EVENTOS ESPECIAIS:', 20, currentY + 23);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    
    const customEvents = currentGoal.customEvents || [];
    if (customEvents.length === 0) {
      doc.text('Nenhum evento customizado neste mês.', 20, currentY + 29);
    } else {
      const eventLines = customEvents.map((ev: any) => {
        try {
          return `- ${new Date(ev.date + 'T00:00:00').toLocaleDateString('pt-BR')}: ${ev.name}`;
        } catch(e) {
          return `- ${ev.date}: ${ev.name}`;
        }
      }).join('\n');
      const splitEvents = doc.splitTextToSize(eventLines, 76);
      doc.text(splitEvents, 20, currentY + 29);
    }
    
    // Right: Saturdays
    doc.setFillColor(248, 250, 252);
    doc.rect(109, currentY, 86, boxHeight, 'F');
    doc.rect(109, currentY, 86, boxHeight, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(194, 65, 12); // Orange/Amber
    doc.text('DISTRIBUIÇÃO DOS SÁBADOS:', 114, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    
    let satTypeLabel = 'Único';
    if (currentGoal.saturdayGoalType === 'split') satTypeLabel = 'Divisão de Expediente';
    else if (currentGoal.saturdayGoalType === 'individual') satTypeLabel = 'Personalizado';
    
    doc.text(`Tipo de Meta: ${satTypeLabel}`, 114, currentY + 12);
    doc.text(`Sábados no mês: ${monthSaturdays.length}`, 114, currentY + 18);
    doc.text(`Valor total sábados: ${formatCurrency(totalSaturdayGoal)}`, 114, currentY + 24);
    
    if (currentGoal.saturdayGoalType === 'split') {
      doc.text(`Sábados Curtos (13h): ${saturdayShortCount}x de ${formatCurrency(saturdayShort)}`, 114, currentY + 30);
      doc.text(`Sábados Longos (16h): ${saturdayLongCount}x de ${formatCurrency(saturdayLong)}`, 114, currentY + 36);
    } else if (currentGoal.saturdayGoalType === 'single' || !currentGoal.saturdayGoalType) {
      doc.text(`Meta por Sábado: ${formatCurrency(currentGoal.saturdayGoal || 0)}`, 114, currentY + 30);
    } else {
      doc.text('Schedules customizadas salvas na plataforma.', 114, currentY + 30);
    }
    
    // Motivational Banner
    currentY += boxHeight + 15;
    if (currentY > 260) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFillColor(79, 70, 229); // Royal Indigo background
    doc.rect(15, currentY, 180, 22, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('O SUCESSO DO NOSSO TIME DEPENDE DE CADA ATENDIMENTO!', 105, currentY + 8, { align: 'center' });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Exiba este painel na área de convivência e vamos juntos atingir todos os objetivos!', 105, currentY + 15, { align: 'center' });
    
    // Save PDF
    doc.save(`metas_planejamento_biobel_${currentGoal.month.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase transition-colors">Metas e Planejamento</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planejamento mensal de vendas Biobel</p>
        </div>
        <button 
          onClick={generateGoalsPDF}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-650/15 cursor-pointer"
        >
          <Printer size={16} /> Relatório Impresso (PDF)
        </button>
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

            {/* Seção de Eventos do Calendário */}
            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-3 text-rose-500">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 font-extrabold text-sm">
                  ✨
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest">Eventos Especiais no Mês</h4>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                Adicione eventos corporativos, parcerias ou datas comerciais importantes (ex. Eventos com bebidas, Dia dos Namorados). Estes eventos serão mostrados no calendário e no dashboard principal.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50/50 dark:bg-slate-800/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data do Evento</label>
                  <input 
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-xs text-slate-900 dark:text-white transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome do Evento</label>
                  <input 
                    type="text"
                    value={eventName}
                    placeholder="Ex: Evento Salvatore (bebida)"
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-xs text-slate-900 dark:text-white transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição (Opcional)</label>
                    <input 
                      type="text"
                      value={eventDesc}
                      placeholder="Ex: Chamou mais pessoas"
                      onChange={(e) => setEventDesc(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-xs text-slate-900 dark:text-white transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                  <button 
                    onClick={addCustomEvent}
                    className="p-3 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md mt-auto h-[42px] hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center min-w-[70px]"
                  >
                    OK
                  </button>
                </div>
              </div>

              {/* Lista dos eventos cadastrados */}
              <div className="space-y-2.5">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Eventos Ativos</div>
                {(!currentGoal.customEvents || currentGoal.customEvents.length === 0) ? (
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide leading-none py-2">Nenhum evento customizado para este mês.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentGoal.customEvents.map((ev: any) => (
                      <div key={ev.id} className="px-3 py-2 bg-rose-50/50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 border border-rose-100/70 dark:border-rose-900/10 rounded-xl text-[10px] font-black flex items-center gap-2.5 shadow-xs">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                        <div className="flex flex-col text-left">
                          <span className="uppercase tracking-tight leading-normal font-sans text-[10px] font-black">{ev.name}</span>
                          <span className="text-[8px] opacity-60 uppercase tracking-widest font-sans font-extrabold leading-none mt-0.5">
                            {new Date(ev.date + 'T00:00:00').toLocaleDateString('pt-BR')} 
                            {ev.description && ` — ${ev.description}`}
                          </span>
                        </div>
                        <X 
                          size={12} 
                          className="cursor-pointer hover:text-rose-850 dark:hover:text-rose-200 transition-colors ml-1" 
                          onClick={() => removeCustomEvent(ev.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
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
              <div className="p-8 bg-orange-50 dark:bg-orange-900/20 rounded-[32px] border border-orange-100 dark:border-orange-900/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <Target size={16} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Conf. do Sábado</p>
                  </div>
                  
                  {/* Selector of Saturday Type */}
                  <div className="flex bg-orange-100/60 dark:bg-orange-950/40 p-0.5 rounded-lg border border-orange-200/40 dark:border-orange-900/30">
                    <button 
                      onClick={() => updateGoal('saturdayGoalType', 'single')}
                      className={cn(
                        "px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
                        (!currentGoal.saturdayGoalType || currentGoal.saturdayGoalType === 'single')
                          ? "bg-white dark:bg-slate-850 text-orange-600 dark:text-orange-400 shadow-xs"
                          : "text-orange-500/70 hover:text-orange-600 dark:text-orange-400/60"
                      )}
                    >
                      Único
                    </button>
                    <button 
                      onClick={() => updateGoal('saturdayGoalType', 'split')}
                      className={cn(
                        "px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
                        (currentGoal.saturdayGoalType === 'split')
                          ? "bg-white dark:bg-slate-850 text-orange-600 dark:text-orange-400 shadow-xs"
                          : "text-orange-500/70 hover:text-orange-600 dark:text-orange-400/60"
                      )}
                    >
                      Expediente
                    </button>
                    <button 
                      onClick={() => updateGoal('saturdayGoalType', 'individual')}
                      className={cn(
                        "px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
                        (currentGoal.saturdayGoalType === 'individual')
                          ? "bg-white dark:bg-slate-850 text-orange-600 dark:text-orange-400 shadow-xs"
                          : "text-orange-500/70 hover:text-orange-600 dark:text-orange-400/60"
                      )}
                    >
                      Personalizado
                    </button>
                  </div>
                </div>

                {currentGoal.saturdayGoalType === 'individual' ? (
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                    <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest">Abertura e Fechamento de cada Sábado</p>
                    {monthSaturdays.map((sat, index) => {
                      const key = sat.toISOString().split('T')[0];
                      const sched = currentGoal.saturdaySchedules?.[key] || {
                        openTime: '09:00',
                        closeTime: '13:00',
                        goal: currentGoal.saturdayGoal || 1500
                      };
                      const satLabel = sat.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                      return (
                        <div key={key} className="p-3 bg-white/40 dark:bg-slate-900/30 rounded-2xl border border-orange-100/30 dark:border-orange-900/10 space-y-2 text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                              Sab {index + 1} ({satLabel})
                            </span>
                            <div className="flex bg-slate-150 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/20">
                              <button
                                type="button"
                                onClick={() => updateSaturdaySchedule(key, { closeTime: '13:00' })}
                                className={cn(
                                  "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md transition-all",
                                  sched.closeTime === '13:00'
                                    ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs"
                                    : "text-slate-500 hover:text-slate-700"
                                )}
                              >
                                Até 13h
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSaturdaySchedule(key, { closeTime: '16:00' })}
                                className={cn(
                                  "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md transition-all",
                                  sched.closeTime === '16:00'
                                    ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs"
                                    : "text-slate-500 hover:text-slate-700"
                                )}
                              >
                                Até 16h
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Entrada</span>
                              <input
                                type="text"
                                value={sched.openTime}
                                onChange={(e) => updateSaturdaySchedule(key, { openTime: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800 p-1.5 rounded-lg text-xs font-bold text-center text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-orange-300"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Saída</span>
                              <input
                                type="text"
                                value={sched.closeTime}
                                onChange={(e) => updateSaturdaySchedule(key, { closeTime: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800 p-1.5 rounded-lg text-xs font-bold text-center text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-orange-300"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Meta</span>
                              <div className="relative">
                                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-orange-400 font-bold">R$</span>
                                <input
                                  type="number"
                                  value={sched.goal}
                                  onChange={(e) => updateSaturdaySchedule(key, { goal: Number(e.target.value) })}
                                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800 p-1.5 pl-4 rounded-lg text-xs font-bold text-center text-orange-600 dark:text-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-300 pointer-events-auto"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="text-[9px] font-bold text-orange-500 uppercase tracking-widest pt-2 border-t border-orange-200/20 flex justify-between items-center">
                      <span>Total Sábados:</span>
                      <span className="font-black text-orange-700 dark:text-orange-400">
                        {formatCurrency(totalSaturdayGoal)}
                      </span>
                    </div>
                  </div>
                ) : (!currentGoal.saturdayGoalType || currentGoal.saturdayGoalType === 'single') ? (
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest">Meta Física Única por Sábado</p>
                    <div className="relative">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-orange-400 font-black text-xl">R$</span>
                      <input 
                        type="number"
                        value={currentGoal.saturdayGoal}
                        onChange={(e) => updateGoal('saturdayGoal', Number(e.target.value))}
                        className="w-full bg-transparent border-none p-0 pl-8 text-3xl font-black text-orange-700 dark:text-orange-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <p className="text-[9px] font-black text-orange-400 dark:text-orange-500 uppercase tracking-widest">Calculado sobre {monthSaturdays.length} sábados no mês (Total {formatCurrency(currentGoal.saturdayGoal * monthSaturdays.length)})</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2 bg-white/40 dark:bg-slate-900/30 p-3 rounded-2xl border border-orange-100/30 dark:border-orange-900/10">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Sábados Curtos (Até 13h)</span>
                        <div className="flex items-center gap-1 bg-orange-100/30 dark:bg-orange-950/20 px-2 py-0.5 rounded-lg border border-orange-200/20">
                          <span className="text-[8px] font-black text-orange-500">Qtd:</span>
                          <input 
                            type="number"
                            min="0"
                            max="5"
                            value={currentGoal.saturdayGoalShortCount !== undefined ? currentGoal.saturdayGoalShortCount : 2}
                            onChange={(e) => updateGoal('saturdayGoalShortCount', Number(e.target.value))}
                            className="w-8 text-center bg-transparent border-none p-0 font-black text-xs text-orange-700 dark:text-orange-300 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-sm">R$</span>
                        <input 
                          type="number"
                          value={currentGoal.saturdayGoalShort || 0}
                          onChange={(e) => updateGoal('saturdayGoalShort', Number(e.target.value))}
                          className="w-full bg-transparent border-none p-0 pl-7 text-xl font-black text-orange-700 dark:text-orange-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 bg-white/40 dark:bg-slate-900/30 p-3 rounded-2xl border border-orange-100/30 dark:border-orange-900/10">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Sábados Longos (Até 16h)</span>
                        <div className="flex items-center gap-1 bg-orange-100/30 dark:bg-orange-950/20 px-2 py-0.5 rounded-lg border border-orange-200/20">
                          <span className="text-[8px] font-black text-orange-500">Qtd:</span>
                          <input 
                            type="number"
                            min="0"
                            max="5"
                            value={currentGoal.saturdayGoalLongCount !== undefined ? currentGoal.saturdayGoalLongCount : 2}
                            onChange={(e) => updateGoal('saturdayGoalLongCount', Number(e.target.value))}
                            className="w-8 text-center bg-transparent border-none p-0 font-black text-xs text-orange-700 dark:text-orange-300 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-sm">R$</span>
                        <input 
                          type="number"
                          value={currentGoal.saturdayGoalLong || 0}
                          onChange={(e) => updateGoal('saturdayGoalLong', Number(e.target.value))}
                          className="w-full bg-transparent border-none p-0 pl-7 text-xl font-black text-orange-700 dark:text-orange-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>

                    <div className="text-[9px] font-bold text-orange-500 uppercase tracking-widest pt-1 border-t border-orange-200/20 flex justify-between items-center">
                      <span>Total Sábados:</span>
                      <span className="font-black text-orange-700 dark:text-orange-400">
                        {formatCurrency(totalSaturdayGoal)}
                      </span>
                    </div>
                  </div>
                )}
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
            {staff.filter(s => s.status !== 'inactive').map((s: Staff) => (
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

export const PerformanceView = ({ sales, staff, formatCurrency, monthlyGoals, selectedMonth, setSelectedMonth }: any) => {
  const [selectedStaff, setSelectedStaff] = useState(staff[0]?.name || 'ALESSANDRA');
  const [timeframeFilter, setTimeframeFilter] = useState<'week' | 'fortnight' | 'month' | 'all'>('month');
  const [showProjectionDetails, setShowProjectionDetails] = useState(true);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    monthlyGoals.forEach((g: any) => {
      if (g.month) months.add(g.month.toLowerCase().trim());
    });
    sales.forEach((s: any) => {
      try {
        const d = getSafeDate(s.date);
        const mName = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toLowerCase().trim();
        if (mName) months.add(mName);
      } catch (e) {}
    });
    if (selectedMonth && selectedMonth.toLowerCase() !== 'todos') {
      months.add(selectedMonth.toLowerCase().trim());
    }
    const list = Array.from(months).map(m => m.charAt(0).toUpperCase() + m.slice(1));
    return ['Todos', ...list];
  }, [monthlyGoals, sales, selectedMonth]);

  // Month-to-date sales data for ranking (adapted for timeframeFilter)
  const salesRankingData = useMemo(() => {
    const currentMonthStr = selectedMonth; 
    const isAll = !currentMonthStr || currentMonthStr.toLowerCase() === 'todos';
    const ranking: { [name: string]: number } = {};
    staff.forEach((s: any) => ranking[s.name] = 0);
    const now = new Date();
    
    sales.forEach(sale => {
      if (!sale.vendedora) return;
      
      // Filter by timeframe first
      if (timeframeFilter === 'week') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        if (getSafeDate(sale.date) < sevenDaysAgo) return;
      } else if (timeframeFilter === 'fortnight') {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(now.getDate() - 15);
        if (getSafeDate(sale.date) < fifteenDaysAgo) return;
      } else if (timeframeFilter === 'all') {
        // no time restriction
      } else {
        // 'month' filter
        const saleMonth = getSafeDate(sale.date).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        if (!isAll && saleMonth.toLowerCase() !== currentMonthStr.toLowerCase()) return;
      }
      
      ranking[sale.vendedora] = (ranking[sale.vendedora] || 0) + sale.total;
    });

    return Object.entries(ranking)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [sales, staff, selectedMonth, timeframeFilter]);

  const currentGoal = useMemo(() => {
    const isAll = !selectedMonth || selectedMonth.toLowerCase() === 'todos';
    if (isAll) {
      const totalStoreGoal = monthlyGoals.reduce((sum: number, g: any) => sum + (g.storeGoal || 0), 0);
      const consolidatedStaffGoals: { [key: string]: any } = {};
      staff.forEach((st: any) => {
        let sumGoal = 0;
        monthlyGoals.forEach((g: any) => {
          if (g.staffGoals && g.staffGoals[st.name]) {
            sumGoal += g.staffGoals[st.name].monthlyGoal || 0;
          }
        });
        consolidatedStaffGoals[st.name] = { monthlyGoal: sumGoal };
      });
      return {
        month: 'Todos',
        storeGoal: totalStoreGoal,
        staffGoals: consolidatedStaffGoals,
      };
    }
    return monthlyGoals.find((g: any) => g.month?.toLowerCase() === selectedMonth?.toLowerCase()) || monthlyGoals[0];
  }, [monthlyGoals, selectedMonth, staff]);

  const staffSales = useMemo(() => {
    const isAll = !selectedMonth || selectedMonth.toLowerCase() === 'todos';
    const now = new Date();
    
    return sales.filter(s => {
      if (s.vendedora !== selectedStaff) return false;
      
      // Filter by timeframe first
      if (timeframeFilter === 'week') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        if (getSafeDate(s.date) < sevenDaysAgo) return false;
      } else if (timeframeFilter === 'fortnight') {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(now.getDate() - 15);
        if (getSafeDate(s.date) < fifteenDaysAgo) return false;
      } else if (timeframeFilter === 'all') {
        // no time restriction
      } else {
        // 'month' filter
        const saleMonth = getSafeDate(s.date).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        if (!isAll && saleMonth.toLowerCase() !== selectedMonth.toLowerCase()) return false;
      }
      return true;
    });
  }, [sales, selectedStaff, selectedMonth, timeframeFilter]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const salesToday = useMemo(() => 
    staffSales.filter(s => getSafeDate(s.date) >= today).reduce((acc, s) => acc + s.total, 0)
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

  // 1. Total Store Sales for selected Month or timeframe
  const storeSalesForPeriod = useMemo(() => {
    const isAllMonth = !selectedMonth || selectedMonth.toLowerCase() === 'todos';
    const completedSales = sales.filter((s: any) => s.status === 'completed' || s.status === 'Concluída');
    const now = new Date();
    
    return completedSales.filter((s: any) => {
      if (timeframeFilter === 'week') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return getSafeDate(s.date) >= sevenDaysAgo;
      }
      if (timeframeFilter === 'fortnight') {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(now.getDate() - 15);
        return getSafeDate(s.date) >= fifteenDaysAgo;
      }
      if (timeframeFilter === 'all') {
        return true;
      }
      const saleMonth = getSafeDate(s.date).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      return isAllMonth || saleMonth.toLowerCase() === selectedMonth.toLowerCase();
    }).reduce((acc: number, s: any) => acc + s.total, 0);
  }, [sales, selectedMonth, timeframeFilter]);

  // 2. Store Goal for the selected month (adjust if timeframes are shorter)
  const storeGoalForPeriod = useMemo(() => {
    const isAll = !selectedMonth || selectedMonth.toLowerCase() === 'todos';
    let baseGoal = 0;
    if (isAll) {
      baseGoal = monthlyGoals.reduce((sum: number, g: any) => sum + (g.storeGoal || 0), 0);
    } else {
      const goal = monthlyGoals.find((g: any) => g.month?.toLowerCase() === selectedMonth?.toLowerCase());
      baseGoal = goal ? (goal.storeGoal || 0) : 0;
    }
    
    // Scale goal if timeframe filter is active
    if (timeframeFilter === 'week') {
      return baseGoal > 0 ? (baseGoal / 30) * 7 : 0; // scaled for 7 days
    }
    if (timeframeFilter === 'fortnight') {
      return baseGoal > 0 ? (baseGoal / 30) * 15 : 0; // scaled for 15 days
    }
    return baseGoal;
  }, [monthlyGoals, selectedMonth, timeframeFilter]);

  // 3. Store Progress %
  const storeProgressPercent = useMemo(() => {
    return storeGoalForPeriod > 0 ? (storeSalesForPeriod / storeGoalForPeriod) * 100 : 0;
  }, [storeSalesForPeriod, storeGoalForPeriod]);

  // 4. Calendar info for projection
  const calendarInfo = useMemo(() => {
    const now = new Date();
    let year = now.getFullYear();
    let monthIdx = now.getMonth();
    
    if (selectedMonth && selectedMonth.toLowerCase() !== 'todos') {
      const parts = selectedMonth.split(' de ');
      if (parts.length === 2) {
        const mName = parts[0].toLowerCase().trim();
        const yNum = parseInt(parts[1], 10);
        if (!isNaN(yNum)) year = yNum;
        const monthsPt = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
        const mIndex = monthsPt.indexOf(mName);
        if (mIndex !== -1) monthIdx = mIndex;
      }
    }
    
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const isCurrentMonth = year === now.getFullYear() && monthIdx === now.getMonth();
    const currentDay = isCurrentMonth ? now.getDate() : daysInMonth;
    const remainingDays = daysInMonth - currentDay;
    
    return { daysInMonth, currentDay, remainingDays, isCurrentMonth };
  }, [selectedMonth]);

  // 5. Mathematical Projection
  const projection = useMemo(() => {
    const { currentDay, daysInMonth, remainingDays } = calendarInfo;
    const averageDaily = currentDay > 0 ? storeSalesForPeriod / currentDay : 0;
    const projectedTotal = averageDaily * daysInMonth;
    const willBeatGoal = projectedTotal >= storeGoalForPeriod;
    const missingAmount = Math.max(0, storeGoalForPeriod - storeSalesForPeriod);
    const necessaryDailyRate = remainingDays > 0 ? missingAmount / remainingDays : 0;
    const dayToReachGoal = averageDaily > 0 ? Math.ceil(storeGoalForPeriod / averageDaily) : null;
    
    return {
      averageDaily,
      projectedTotal,
      willBeatGoal,
      missingAmount,
      necessaryDailyRate,
      dayToReachGoal
    };
  }, [storeSalesForPeriod, storeGoalForPeriod, calendarInfo]);

  const salesThisMonth = staffSales.length;

  // Analisar quais semanas venderam mais (Quais semanas as vendedoras venderam mais?)
  const weeklySalesRanking = useMemo(() => {
    const weeksMap: { [key: string]: { total: number; count: number; start: Date; end: Date } } = {};
    
    staffSales.forEach(sale => {
      try {
        const d = getSafeDate(sale.date);
        
        // Encontrar a segunda-feira da semana
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 1 = Segunda-feira
        const monday = new Date(d.getFullYear(), d.getMonth(), diff);
        monday.setHours(0, 0, 0, 0);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        
        const key = monday.toISOString().split('T')[0];
        
        if (!weeksMap[key]) {
          weeksMap[key] = {
            total: 0,
            count: 0,
            start: monday,
            end: sunday
          };
        }
        weeksMap[key].total += sale.total;
        weeksMap[key].count += 1;
      } catch (e) {}
    });
    
    return Object.entries(weeksMap)
      .map(([key, val]) => {
        const fmt = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return {
          key,
          label: `Semana de ${fmt(val.start)} a ${fmt(val.end)}`,
          total: val.total,
          count: val.count,
          start: val.start,
          end: val.end
        };
      })
      .sort((a, b) => b.total - a.total); // Ordena por faturamento decrescente (qual vendeu mais)
  }, [staffSales]);

  // Analisar qual produto vende mais (Qual produto essa vendedora vende mais?)
  const productSalesRanking = useMemo(() => {
    const prodMap: { [productId: string]: { name: string; quantity: number; totalValue: number; brand?: string; category?: string } } = {};
    
    staffSales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          const key = item.productId || item.name;
          if (!key) return;
          if (!prodMap[key]) {
            prodMap[key] = {
              name: item.name || 'Produto Sem Nome',
              quantity: 0,
              totalValue: 0,
              brand: item.brand,
              category: item.category
            };
          }
          prodMap[key].quantity += (item.quantity || 1);
          prodMap[key].totalValue += (item.total || item.price * (item.quantity || 1) || 0);
        });
      }
    });
    
    return Object.values(prodMap).sort((a, b) => b.quantity - a.quantity); // Ordena por quantidade vendida
  }, [staffSales]);

  // Quantos dias de trabalho essa vendedora teve? (Dias com pelo menos uma venda registrada)
  const workingDaysCount = useMemo(() => {
    const uniqueDates = new Set<string>();
    staffSales.forEach(sale => {
      try {
        const d = getSafeDate(sale.date);
        const ymd = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        uniqueDates.add(ymd);
      } catch (e) {}
    });
    return uniqueDates.size;
  }, [staffSales]);

  // Outros parâmetros inteligentes para enriquecer a análise
  const categoryRanking = useMemo(() => {
    const catMap: { [category: string]: number } = {};
    staffSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const cat = item.category || 'Sem Categoria';
          catMap[cat] = (catMap[cat] || 0) + (item.quantity || 1);
        });
      }
    });
    return Object.entries(catMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);
  }, [staffSales]);

  const brandRanking = useMemo(() => {
    const brandMap: { [brand: string]: number } = {};
    staffSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const brand = item.brand || 'Sem Marca';
          brandMap[brand] = (brandMap[brand] || 0) + (item.quantity || 1);
        });
      }
    });
    return Object.entries(brandMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);
  }, [staffSales]);

  const periodRanking = useMemo(() => {
    const periods = { morning: 0, afternoon: 0, night: 0 };
    staffSales.forEach(sale => {
      try {
        const hrs = getSaleLocalHours(sale);
        if (hrs < 12) periods.morning += 1;
        else if (hrs < 18) periods.afternoon += 1;
        else periods.night += 1;
      } catch (e) {}
    });
    return periods;
  }, [staffSales]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase transition-colors flex items-center gap-2">
            <Smartphone className="text-blue-500 shrink-0" size={30} />
            Espelho da Vendedora
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acompanhe seu desempenho de forma rápida e individual</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400" size={16} />
            <select 
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[160px] transition-colors"
            >
              {staff.map(member => (
                <option key={member.id} value={member.name}>
                  {member.name.charAt(0) + member.name.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          {timeframeFilter === 'month' && (
            <div className="relative animate-fadeIn">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[160px] transition-colors"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Filtros Rápidos de Período (Atalhos Claros) */}
      <div className="bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto self-start border border-slate-200/50 dark:border-slate-800 max-w-max">
        <button
          onClick={() => setTimeframeFilter('week')}
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
            timeframeFilter === 'week'
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          )}
        >
          📅 Esta Semana
        </button>
        <button
          onClick={() => setTimeframeFilter('fortnight')}
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
            timeframeFilter === 'fortnight'
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          )}
        >
          📅 Esta Quinzena
        </button>
        <button
          onClick={() => setTimeframeFilter('month')}
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
            timeframeFilter === 'month'
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          )}
        >
          📅 Mês Selecionado
        </button>
        <button
          onClick={() => setTimeframeFilter('all')}
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
            timeframeFilter === 'all'
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          )}
        >
          📅 Geral Acumulado
        </button>
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

      {/* PAINEL DE INTELIGÊNCIA E ANÁLISE DE DESEMPENHO DA VENDEDORA */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 transition-colors">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                Análise de Desempenho
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Inteligência de Vendas de {selectedStaff}
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              Análise detalhada e estruturada com base no histórico de atendimentos e produtos vendidos
            </p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 px-3.5 py-2 rounded-2xl">
            <Users size={16} className="text-blue-500" />
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              {staffSales.length} Atendimentos no Período
            </span>
          </div>
        </div>

        {/* 1. Atendimentos, Dias de Trabalho e Produtividade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-3">
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Total de Atendimentos</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono leading-none">{staffSales.length}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">atendimentos</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-snug">
              Quantidade de vendas finalizadas por esta vendedora.
            </p>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-3">
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Dias de Trabalho Ativos</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono leading-none">{workingDaysCount}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">{workingDaysCount === 1 ? 'dia' : 'dias'}</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-snug">
              Dias com pelo menos 1 venda registrada no sistema.
            </p>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-3">
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Média de Atendimentos/Dia</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono leading-none">
                {workingDaysCount > 0 ? (staffSales.length / workingDaysCount).toFixed(1) : '0'}
              </span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">vendas/dia</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-snug">
              Frequência de conversão diária nos dias ativos.
            </p>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-3">
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Faturamento Médio Diário</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900 dark:text-white leading-none">
                {formatCurrency(workingDaysCount > 0 ? staffSalesTotal / workingDaysCount : 0)}
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-snug">
              Volume financeiro médio que a vendedora traz a cada dia ativo.
            </p>
          </div>
        </div>

        {/* 2. Top Weeks & Top Products (Quais semanas venderam mais? Qual produto vende mais?) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Quais semanas as vendedoras venderam mais? */}
          <div className="border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none">Histórico Semanal</p>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Semanas de Maior Venda</h4>
              </div>
              <TrendingUp size={20} className="text-indigo-500" />
            </div>

            {weeklySalesRanking.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 font-bold uppercase italic">
                Nenhuma venda registrada para analisar semanas.
              </div>
            ) : (
              <div className="space-y-3.5">
                {weeklySalesRanking.slice(0, 5).map((wk, idx) => {
                  const maxWeekly = Math.max(...weeklySalesRanking.map(w => w.total)) || 1;
                  const pct = (wk.total / maxWeekly) * 100;
                  return (
                    <div key={wk.key} className="space-y-1.5 p-3 bg-slate-50/50 dark:bg-slate-850/20 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                          {wk.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-indigo-550/10 text-indigo-600 dark:text-indigo-400 rounded-md uppercase">
                            #{idx + 1}º
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {formatCurrency(wk.total)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] text-slate-400 uppercase font-bold">
                        <span>{wk.count} {wk.count === 1 ? 'Venda' : 'Vendas'}</span>
                        <span>Média: {formatCurrency(wk.total / wk.count)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Qual produto essa vendedora vende mais? */}
          <div className="border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">Mix de Produtos</p>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Produtos Mais Vendidos</h4>
              </div>
              <Award size={20} className="text-emerald-500" />
            </div>

            {productSalesRanking.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 font-bold uppercase italic">
                Nenhum item vendido registrado por esta vendedora.
              </div>
            ) : (
              <div className="space-y-3">
                {productSalesRanking.slice(0, 5).map((prod, idx) => {
                  const maxQty = Math.max(...productSalesRanking.map(p => p.quantity)) || 1;
                  const pct = (prod.quantity / maxQty) * 100;
                  return (
                    <div key={prod.name} className="flex items-center justify-between gap-4 p-3 bg-slate-50/50 dark:bg-slate-850/20 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                            idx === 0 ? "bg-amber-100 text-amber-705 dark:bg-amber-950 dark:text-amber-400" :
                            idx === 1 ? "bg-slate-100 text-slate-705 dark:bg-slate-800 dark:text-slate-300" : "bg-orange-50 text-orange-705 dark:bg-orange-950 dark:text-orange-400"
                          )}>
                            {idx + 1}
                          </span>
                          <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase truncate">
                            {prod.name}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-slate-900 dark:text-white leading-none">
                          {prod.quantity} {prod.quantity === 1 ? 'unidade' : 'unidades'}
                        </p>
                        <p className="text-[8px] text-slate-400 uppercase font-bold mt-1 leading-none">
                          Total: {formatCurrency(prod.totalValue)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* 3. Outros Parâmetros Extra (Marca mais vendida, Categoria mais vendida, Recordes e Períodos) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          {/* Categoria & Marca Favorita */}
          <div className="bg-slate-50/40 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Favoritos do Mix</h5>
            <div className="space-y-3.5">
              <div>
                <p className="text-[8.5px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Categoria Mais Vendida</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  <p className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase leading-none">
                    {categoryRanking[0]?.name || 'N/A'}
                  </p>
                  {categoryRanking[0] && (
                    <span className="text-[8px] font-bold text-slate-400 uppercase">
                      ({categoryRanking[0].qty} itens)
                    </span>
                  )}
                </div>
              </div>
              <div className="h-[1px] bg-slate-100 dark:bg-slate-800" />
              <div>
                <p className="text-[8.5px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Marca Mais Vendida</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <p className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase leading-none">
                    {brandRanking[0]?.name || 'N/A'}
                  </p>
                  {brandRanking[0] && (
                    <span className="text-[8px] font-bold text-slate-400 uppercase">
                      ({brandRanking[0].qty} itens)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recordes Financeiros */}
          <div className="bg-slate-50/40 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recordes e Limites</h5>
            <div className="space-y-3.5">
              <div>
                <p className="text-[8.5px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Maior Atendimento Único</p>
                <p className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1.5 leading-none">
                  {formatCurrency(staffSales.length > 0 ? Math.max(...staffSales.map(s => s.total)) : 0)}
                </p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 leading-none">
                  Melhor cupom individual gerado pela vendedora.
                </p>
              </div>
            </div>
          </div>

          {/* Período de Maior Atividade */}
          <div className="bg-slate-50/40 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pico de Horário</h5>
            <div className="space-y-3">
              <div>
                <p className="text-[8.5px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider">Atendimentos por Turno</p>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="p-2 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl text-center">
                    <p className="text-[7.5px] font-black text-slate-400 uppercase leading-none">Manhã</p>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 mt-1 leading-none">{periodRanking.morning}</p>
                    <p className="text-[7px] text-slate-400 uppercase mt-0.5 leading-none">vendas</p>
                  </div>
                  <div className="p-2 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl text-center border border-indigo-200/20">
                    <p className="text-[7.5px] font-black text-indigo-500 uppercase leading-none">Tarde</p>
                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1 leading-none">{periodRanking.afternoon}</p>
                    <p className="text-[7px] text-slate-400 uppercase mt-0.5 leading-none">vendas</p>
                  </div>
                  <div className="p-2 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl text-center">
                    <p className="text-[7.5px] font-black text-slate-400 uppercase leading-none">Noite</p>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 mt-1 leading-none">{periodRanking.night}</p>
                    <p className="text-[7px] text-slate-400 uppercase mt-0.5 leading-none">vendas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Goal Progress Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 transition-colors">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Progresso da Meta de {selectedStaff.charAt(0) + selectedStaff.slice(1).toLowerCase()}</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              {individualGoal > 0 
                ? `Meta Individual para o período: ${formatCurrency(individualGoal)}` 
                : "Nenhuma meta individual definida para este período."}
            </p>
          </div>
          <div className="flex gap-8">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Meta</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(individualGoal)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atingido</p>
              <p className="text-lg font-black text-emerald-500 dark:text-emerald-400">{formatCurrency(staffSalesTotal)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faltam</p>
              <p className="text-lg font-black text-rose-500 dark:text-rose-400">
                {formatCurrency(Math.max(0, individualGoal - staffSalesTotal))}
              </p>
            </div>
          </div>
        </div>
        <div className="relative h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden">
          <div 
            className={cn(
              "absolute inset-y-0 left-0 flex items-center justify-center text-white text-[10px] font-black transition-all duration-500",
              progressPercent >= 100 
                ? "bg-emerald-500" 
                : progressPercent >= 50 
                ? "bg-blue-500" 
                : "bg-amber-500"
            )}
            style={{ width: `${Math.max(12, Math.min(100, progressPercent))}%` }}
          >
            {progressPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 transition-colors">
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

        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 transition-colors">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Meta da Loja</h3>
            <button 
              onClick={() => setShowProjectionDetails(!showProjectionDetails)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors"
            >
              <Activity size={12} /> {showProjectionDetails ? "Ocultar Projeção" : "Ver Projeção Matemática"}
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso Geral</p>
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                  {storeProgressPercent.toFixed(1)}%
                </p>
              </div>
              <div className="h-2 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500" 
                  style={{ width: `${Math.min(100, storeProgressPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-1">
                <span>Realizado: {formatCurrency(storeSalesForPeriod)}</span>
                <span>Objetivo: {formatCurrency(storeGoalForPeriod)}</span>
              </div>
            </div>

            {showProjectionDetails && storeGoalForPeriod > 0 && (
              <div className="p-5 bg-slate-50 dark:bg-slate-850/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Projeção Baseada no Ritmo Comercial</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                    projection.willBeatGoal 
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" 
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  )}>
                    {projection.willBeatGoal ? "Meta Garantida 🎉" : "Meta Ameaçada ⚠️"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Média Diária Atual</p>
                    <p className="font-mono font-black text-slate-700 dark:text-slate-300">{formatCurrency(projection.averageDaily)}/dia</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Projeção Fim do Mês</p>
                    <p className="font-mono font-black text-slate-700 dark:text-slate-300">{formatCurrency(projection.projectedTotal)}</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {projection.willBeatGoal ? (
                    <span>
                      Parabéns! No ritmo atual, a meta de faturamento geral será atingida por volta do dia <strong>{projection.dayToReachGoal}</strong> deste mês. Mantendo o ritmo, a loja superará a meta em <strong>{formatCurrency(Math.max(0, projection.projectedTotal - storeGoalForPeriod))}</strong>!
                    </span>
                  ) : (
                    <span>
                      Atenção: No ritmo atual, a loja não alcançará a meta, faturando cerca de <strong>{formatCurrency(projection.projectedTotal)}</strong> até o final do período. Para bater a meta, faltam <strong>{formatCurrency(projection.missingAmount)}</strong>, sendo necessário vender em média <strong>{formatCurrency(projection.necessaryDailyRate)}</strong> por dia nos próximos <strong>{calendarInfo.remainingDays}</strong> dias.
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
