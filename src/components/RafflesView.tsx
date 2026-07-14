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

export const RafflesView = ({ 
  raffles, 
  setRaffles, 
  customers, 
  staff, 
  addNotification, 
  formatCurrency, 
  user,
  sales
}: any) => {
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState<Raffle | null>(null);
  
  // Ticket modal state
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<number | null>(null);
  const [ticketForm, setTicketForm] = useState({
    buyerName: '',
    buyerPhone: '',
    status: 'paid' as 'reserved' | 'paid',
    vendedora: ''
  });

  // Draw state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawNumber, setDrawNumber] = useState<number | null>(null);
  const [finalWinner, setFinalWinner] = useState<RaffleTicket | null>(null);

  // Raffle Form state
  const [raffleForm, setRaffleForm] = useState({
    title: '',
    prizeDescription: '',
    prizeValue: 400.00,
    ticketPrice: 25.00,
    totalNumbers: 100,
    deadlineDate: '',
    drawDate: '',
    eligibilityType: 'spend_threshold' as 'spend_threshold' | 'any_sale' | 'custom',
    eligibilityValue: 80,
    eligibilityCustomText: 'Ganha 1 cupom a cada R$ 80 em compras'
  });

  const handleOpenCreateModal = (raffle?: Raffle) => {
    if (raffle) {
      setEditingRaffle(raffle);
      setRaffleForm({
        title: raffle.title,
        prizeDescription: raffle.prizeDescription,
        prizeValue: raffle.prizeValue,
        ticketPrice: raffle.ticketPrice,
        totalNumbers: raffle.totalNumbers,
        deadlineDate: raffle.deadlineDate,
        drawDate: raffle.drawDate,
        eligibilityType: raffle.eligibilityType || 'spend_threshold',
        eligibilityValue: raffle.eligibilityValue || 80,
        eligibilityCustomText: raffle.eligibilityCustomText || 'Ganha 1 cupom a cada R$ 80 em compras'
      });
    } else {
      setEditingRaffle(null);
      // set some default dates (deadline is in 10 days, draw is in 15 days)
      const now = new Date();
      const deadline = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const draw = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setRaffleForm({
        title: '',
        prizeDescription: '',
        prizeValue: 400.00,
        ticketPrice: 25.00,
        totalNumbers: 100,
        deadlineDate: deadline,
        drawDate: draw,
        eligibilityType: 'spend_threshold',
        eligibilityValue: 80,
        eligibilityCustomText: 'Ganha 1 cupom a cada R$ 80 em compras'
      });
    }
    setIsCreateModalOpen(true);
  };

  const saveRaffle = () => {
    if (!raffleForm.title || !raffleForm.prizeDescription || !raffleForm.deadlineDate || !raffleForm.drawDate) {
      addNotification('Preencha todos os campos obrigatórios.', 'error');
      return;
    }

    if (editingRaffle) {
      const updated = raffles.map((r: Raffle) => {
        if (r.id === editingRaffle.id) {
          // Adjust ticket length if totalNumbers changed (unlikely, but let's support safely)
          let currentTickets = [...r.tickets];
          if (raffleForm.totalNumbers !== r.totalNumbers) {
            if (raffleForm.totalNumbers > r.totalNumbers) {
              for (let i = r.totalNumbers + 1; i <= raffleForm.totalNumbers; i++) {
                currentTickets.push({ number: i, buyerName: '', buyerPhone: '', status: 'available' });
              }
            } else {
              currentTickets = currentTickets.slice(0, raffleForm.totalNumbers);
            }
          }
          return {
            ...r,
            title: raffleForm.title,
            prizeDescription: raffleForm.prizeDescription,
            prizeValue: Number(raffleForm.prizeValue),
            ticketPrice: Number(raffleForm.ticketPrice),
            totalNumbers: Number(raffleForm.totalNumbers),
            deadlineDate: raffleForm.deadlineDate,
            drawDate: raffleForm.drawDate,
            eligibilityType: raffleForm.eligibilityType,
            eligibilityValue: Number(raffleForm.eligibilityValue),
            eligibilityCustomText: raffleForm.eligibilityCustomText,
            tickets: currentTickets
          };
        }
        return r;
      });
      setRaffles(updated);
      addNotification('Rifa atualizada com sucesso!', 'success');
    } else {
      // create new tickets array
      const tickets: RaffleTicket[] = [];
      for (let i = 1; i <= raffleForm.totalNumbers; i++) {
        tickets.push({
          number: i,
          buyerName: '',
          buyerPhone: '',
          status: 'available'
        });
      }

      const newRaffle: Raffle = {
        id: 'r_' + Math.random().toString(36).substr(2, 9),
        title: raffleForm.title,
        prizeDescription: raffleForm.prizeDescription,
        prizeValue: Number(raffleForm.prizeValue),
        ticketPrice: Number(raffleForm.ticketPrice),
        totalNumbers: Number(raffleForm.totalNumbers),
        deadlineDate: raffleForm.deadlineDate,
        drawDate: raffleForm.drawDate,
        status: 'active',
        tickets,
        createdAt: new Date().toISOString().split('T')[0],
        eligibilityType: raffleForm.eligibilityType,
        eligibilityValue: Number(raffleForm.eligibilityValue),
        eligibilityCustomText: raffleForm.eligibilityCustomText
      };
      setRaffles([...raffles, newRaffle]);
      addNotification('Nova rifa criada com sucesso!', 'success');
    }
    setIsCreateModalOpen(false);
  };

  const removeRaffle = (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta rifa? Os dados de vendas serão perdidos.')) return;
    setRaffles(raffles.filter((r: Raffle) => r.id !== id));
    if (selectedRaffle?.id === id) {
      setSelectedRaffle(null);
    }
    addNotification('Rifa excluída.', 'info');
  };

  // Ticket Operations
  const handleOpenTicketModal = (ticketNum: number) => {
    if (!selectedRaffle) return;
    const ticket = selectedRaffle.tickets.find((t: RaffleTicket) => t.number === ticketNum);
    setSelectedTicketNumber(ticketNum);
    
    if (ticket && ticket.status !== 'available') {
      setTicketForm({
        buyerName: ticket.buyerName,
        buyerPhone: ticket.buyerPhone,
        status: ticket.status,
        vendedora: ticket.vendedora || ''
      });
    } else {
      setTicketForm({
        buyerName: '',
        buyerPhone: '',
        status: 'paid',
        vendedora: ''
      });
    }
    setIsTicketModalOpen(true);
  };

  const saveTicket = () => {
    if (!selectedRaffle || selectedTicketNumber === null) return;
    if (!ticketForm.buyerName) {
      addNotification('Por favor, informe o nome do comprador.', 'error');
      return;
    }

    const updatedTickets = selectedRaffle.tickets.map((t: RaffleTicket) => {
      if (t.number === selectedTicketNumber) {
        return {
          ...t,
          buyerName: ticketForm.buyerName,
          buyerPhone: ticketForm.buyerPhone,
          status: ticketForm.status,
          vendedora: ticketForm.vendedora || undefined,
          soldAt: t.soldAt || new Date().toISOString().split('T')[0]
        };
      }
      return t;
    });

    const updatedRaffle: Raffle = {
      ...selectedRaffle,
      tickets: updatedTickets
    };

    setRaffles(raffles.map((r: Raffle) => r.id === selectedRaffle.id ? updatedRaffle : r));
    setSelectedRaffle(updatedRaffle);
    setIsTicketModalOpen(false);
    addNotification(`Número ${selectedTicketNumber} atualizado com sucesso!`, 'success');
  };

  const clearTicket = () => {
    if (!selectedRaffle || selectedTicketNumber === null) return;
    if (!window.confirm(`Liberar o número ${selectedTicketNumber}? O comprador atual será removido.`)) return;

    const updatedTickets = selectedRaffle.tickets.map((t: RaffleTicket) => {
      if (t.number === selectedTicketNumber) {
        return {
          number: selectedTicketNumber,
          buyerName: '',
          buyerPhone: '',
          status: 'available' as const
        };
      }
      return t;
    });

    const updatedRaffle: Raffle = {
      ...selectedRaffle,
      tickets: updatedTickets
    };

    setRaffles(raffles.map((r: Raffle) => r.id === selectedRaffle.id ? updatedRaffle : r));
    setSelectedRaffle(updatedRaffle);
    setIsTicketModalOpen(false);
    addNotification(`Número ${selectedTicketNumber} está disponível novamente!`, 'info');
  };

  // Live Draw animation
  const startDraw = () => {
    if (!selectedRaffle) return;
    
    // Pick eligible tickets (paid or reserved)
    const eligibleTickets = selectedRaffle.tickets.filter((t: RaffleTicket) => t.status === 'paid' || t.status === 'reserved');
    
    if (eligibleTickets.length === 0) {
      addNotification('Não há nenhum número vendido/reservado para realizar o sorteio.', 'error');
      return;
    }

    setIsDrawing(true);
    setFinalWinner(null);
    
    let counter = 0;
    const intervalTime = 80; // speed of rolling
    const totalDuration = 3000; // 3 seconds of rolling
    
    const interval = setInterval(() => {
      // Pick a random sold ticket to show as preview rolling
      const randIdx = Math.floor(Math.random() * eligibleTickets.length);
      setDrawNumber(eligibleTickets[randIdx].number);
      counter += intervalTime;
      
      if (counter >= totalDuration) {
        clearInterval(interval);
        
        // Final draw!
        const finalWinnerTicket = eligibleTickets[Math.floor(Math.random() * eligibleTickets.length)];
        setDrawNumber(finalWinnerTicket.number);
        setFinalWinner(finalWinnerTicket);
        
        // Persist the winner
        const updatedRaffle: Raffle = {
          ...selectedRaffle,
          status: 'drawn',
          winnerNumber: finalWinnerTicket.number,
          winnerName: finalWinnerTicket.buyerName,
          winnerPhone: finalWinnerTicket.buyerPhone,
          winnerVendedora: finalWinnerTicket.vendedora,
        };

        setRaffles(raffles.map((r: Raffle) => r.id === selectedRaffle.id ? updatedRaffle : r));
        setSelectedRaffle(updatedRaffle);
        setIsDrawing(false);
        addNotification(`Ganhador(a) sorteado(a)! Parabéns ao Nº ${finalWinnerTicket.number} - ${finalWinnerTicket.buyerName}!`, 'success');
      }
    }, intervalTime);
  };

  const resetRaffleDraw = () => {
    if (!selectedRaffle) return;
    if (!window.confirm('Deseja anular o sorteio e reabrir as vendas? O ganhador atual será desmarcado.')) return;

    const updatedRaffle: Raffle = {
      ...selectedRaffle,
      status: 'active',
      winnerNumber: undefined,
      winnerName: undefined,
      winnerPhone: undefined,
      winnerVendedora: undefined
    };

    setRaffles(raffles.map((r: Raffle) => r.id === selectedRaffle.id ? updatedRaffle : r));
    setSelectedRaffle(updatedRaffle);
    setFinalWinner(null);
    setDrawNumber(null);
    addNotification('Sorteio resetado. Rifa reaberta para vendas!', 'info');
  };

  // Pre-calculated stats
  const getRaffleStats = (raffle: Raffle) => {
    const total = raffle.totalNumbers;
    const paidTickets = raffle.tickets.filter((t: RaffleTicket) => t.status === 'paid');
    const reservedTickets = raffle.tickets.filter((t: RaffleTicket) => t.status === 'reserved');
    
    const paidCount = paidTickets.length;
    const reservedCount = reservedTickets.length;
    const availableCount = total - paidCount - reservedCount;
    
    const totalRevenuePotential = total * raffle.ticketPrice;
    const realizedRevenue = paidCount * raffle.ticketPrice;
    const pendingRevenue = reservedCount * raffle.ticketPrice;
    
    const soldPercentage = Math.round(((paidCount + reservedCount) / total) * 100);

    return {
      paidCount,
      reservedCount,
      availableCount,
      totalRevenuePotential,
      realizedRevenue,
      pendingRevenue,
      soldPercentage
    };
  };

  const getDaysRemaining = (deadlineStr: string) => {
    if (!deadlineStr) return '';
    const today = new Date();
    today.setHours(0,0,0,0);
    const deadline = new Date(deadlineStr + 'T00:00:00');
    deadline.setHours(0,0,0,0);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Finalizado';
    if (diffDays === 0) return 'Hoje!';
    if (diffDays === 1) return 'Amanhã!';
    return `${diffDays} dias restantes`;
  };

  const handleAutoDistribute = () => {
    if (!selectedRaffle) return;
    if (!sales || sales.length === 0) {
      addNotification('Nenhuma venda cadastrada no sistema para fazer a distribuição.', 'error');
      return;
    }

    // Filter sales in raffle's active range: between createdAt and deadlineDate
    const start = selectedRaffle.createdAt || new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = selectedRaffle.deadlineDate;

    const raffleSales = sales.filter((s: Sale) => {
      return s.date >= start && s.date <= end && s.status !== 'cancelled';
    });

    if (raffleSales.length === 0) {
      addNotification(`Nenhuma venda realizada no período de ${new Date(start + 'T00:00:00').toLocaleDateString('pt-BR')} até ${new Date(end + 'T00:00:00').toLocaleDateString('pt-BR')}.`, 'info');
      return;
    }

    // Group sales total and count by customer
    const customerTotals: { [key: string]: { name: string; phone: string; totalSpent: number; salesCount: number; vendedora?: string } } = {};

    raffleSales.forEach((s: Sale) => {
      if (!s.customerName) return;
      const key = `${s.customerName.trim()}__${s.customerPhone?.trim() || ''}`;
      if (!customerTotals[key]) {
        customerTotals[key] = {
          name: s.customerName.trim(),
          phone: s.customerPhone?.trim() || '',
          totalSpent: 0,
          salesCount: 0,
          vendedora: s.vendedora
        };
      }
      customerTotals[key].totalSpent += s.total;
      customerTotals[key].salesCount += 1;
      if (s.vendedora && !customerTotals[key].vendedora) {
        customerTotals[key].vendedora = s.vendedora;
      }
    });

    // Calculate how many coupons each customer is eligible for
    const type = selectedRaffle.eligibilityType || 'spend_threshold';
    const threshold = selectedRaffle.eligibilityValue || 80;

    const eligibleCustomers: Array<{ name: string; phone: string; count: number; vendedora?: string }> = [];

    Object.values(customerTotals).forEach((c) => {
      let count = 0;
      if (type === 'spend_threshold') {
        count = Math.floor(c.totalSpent / threshold);
      } else if (type === 'any_sale') {
        count = c.salesCount;
      }
      if (count > 0) {
        eligibleCustomers.push({
          name: c.name,
          phone: c.phone,
          count,
          vendedora: c.vendedora
        });
      }
    });

    if (eligibleCustomers.length === 0) {
      addNotification('Nenhum cliente atingiu os critérios de elegibilidade para este sorteio.', 'info');
      return;
    }

    // Get available numbers
    let availableTickets = selectedRaffle.tickets.filter((t: RaffleTicket) => t.status === 'available');

    if (availableTickets.length === 0) {
      addNotification('Todos os bilhetes desta campanha já foram vendidos ou reservados.', 'error');
      return;
    }

    let distributedCount = 0;
    let customersCount = 0;

    const updatedTickets = [...selectedRaffle.tickets];

    eligibleCustomers.forEach((cust) => {
      // check if customer already has tickets in this raffle, to avoid duplicate distributions of the same sales
      const alreadyHasTickets = selectedRaffle.tickets.some((t: RaffleTicket) => t.buyerName === cust.name);
      if (alreadyHasTickets) return; // Skip if they already got their tickets

      let needed = cust.count;
      let assigned = 0;

      for (let i = 0; i < updatedTickets.length; i++) {
        if (updatedTickets[i].status === 'available' && assigned < needed) {
          updatedTickets[i] = {
            ...updatedTickets[i],
            buyerName: cust.name,
            buyerPhone: cust.phone,
            status: 'paid', // Mark as paid for automatic eligibility
            soldAt: new Date().toISOString().split('T')[0],
            vendedora: cust.vendedora
          };
          assigned++;
          distributedCount++;
        }
      }
      if (assigned > 0) {
        customersCount++;
      }
    });

    if (distributedCount === 0) {
      addNotification('Nenhum novo bilhete pôde ser distribuído (clientes elegíveis já possuem bilhetes associados ou números esgotados).', 'info');
      return;
    }

    const updatedRaffle: Raffle = {
      ...selectedRaffle,
      tickets: updatedTickets
    };

    setRaffles(raffles.map((r: Raffle) => r.id === selectedRaffle.id ? updatedRaffle : r));
    setSelectedRaffle(updatedRaffle);
    addNotification(`Sucesso! Distribuídos ${distributedCount} bilhetes para ${customersCount} clientes com base nas vendas do período.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            🎟️ Gestão de Rifas
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {selectedRaffle ? `Visualizando: ${selectedRaffle.title}` : 'Campanhas de Rifas, Prêmios e Bilhetes'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {selectedRaffle && (
            <button
              onClick={() => setSelectedRaffle(null)}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all"
            >
              Voltar à Lista
            </button>
          )}
          <button 
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all"
          >
            <Plus size={18} />
            Nova Rifa
          </button>
        </div>
      </div>

      {/* RAFFLE DETAIL VIEW */}
      {selectedRaffle ? (
        <div className="space-y-6 animate-fade-in">
          {/* STATS HEADER */}
          {(() => {
            const stats = getRaffleStats(selectedRaffle);
            return (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Prize Info */}
                <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-6 rounded-[24px] space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-extrabold uppercase tracking-wider rounded-lg border border-indigo-100/40">
                        🎁 Prêmio Cadastrado
                      </span>
                      <span className="text-xs font-black font-mono text-emerald-500">
                        Custo: {formatCurrency(selectedRaffle.prizeValue)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                        {selectedRaffle.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                        {selectedRaffle.prizeDescription}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-850">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Data Limite</p>
                        <p className="font-extrabold text-slate-700 dark:text-slate-300">{new Date(selectedRaffle.deadlineDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Sorteio Previsto</p>
                        <p className="font-extrabold text-slate-700 dark:text-slate-300">{new Date(selectedRaffle.drawDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-50 dark:border-slate-850/50 flex items-center gap-1.5 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      <span>🎯 Critério de Participação:</span>
                      <span className="text-slate-600 dark:text-slate-300 normal-case font-bold">{selectedRaffle.eligibilityCustomText || 'Ganha 1 cupom a cada R$ 80 em compras'}</span>
                    </div>
                  </div>
                </div>

                {/* Sales Progress & Revenue */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-6 rounded-[24px] flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bilhetes Vendidos</span>
                      <span className="font-black font-mono text-indigo-500">{stats.paidCount + stats.reservedCount} / {selectedRaffle.totalNumbers} ({stats.soldPercentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${stats.soldPercentage}%` }}
                      />
                    </div>
                  </div>

                  {selectedRaffle.status !== 'drawn' && (
                    <button
                      onClick={handleAutoDistribute}
                      className="mt-2 w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-100/40 dark:border-indigo-900/20 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      title="Distribuir bilhetes automaticamente para os clientes com base nas compras realizadas"
                    >
                      <span>⚡ Auto-Distribuir por Vendas</span>
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-850">
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase block">Arrecadado</span>
                      <span className="text-xs font-black font-mono text-emerald-500">{formatCurrency(stats.realizedRevenue)}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase block">Reservas</span>
                      <span className="text-xs font-black font-mono text-amber-500">{formatCurrency(stats.pendingRevenue)}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-950/20 py-1 rounded-lg border border-slate-100 dark:border-slate-850">
                    Valor: <span className="text-indigo-500 font-mono font-black">{formatCurrency(selectedRaffle.ticketPrice)} por número</span>
                  </div>
                </div>

                {/* Draw & Winner Box */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-6 rounded-[24px] flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status do Sorteio</span>
                    {selectedRaffle.status === 'drawn' ? (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-center space-y-1">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">🏆 Sorteado!</span>
                        <p className="text-sm font-black text-slate-800 dark:text-white font-mono leading-none">
                          Nº {selectedRaffle.winnerNumber?.toString().padStart(2, '0')}
                        </p>
                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase truncate">
                          {selectedRaffle.winnerName}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-center">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block">🎟️ Vendas Abertas</span>
                        <p className="text-xs font-bold text-slate-500 mt-1">Sorteio ainda não realizado</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    {selectedRaffle.status === 'drawn' ? (
                      <button
                        onClick={resetRaffleDraw}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                      >
                        Anular & Reabrir
                      </button>
                    ) : (
                      <button
                        onClick={startDraw}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-amber-100 dark:shadow-none transition-all flex items-center justify-center gap-1.5"
                      >
                        <Trophy size={14} />
                        Realizar Sorteio
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* INTERACTIVE NUMBER BOARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-8 rounded-[32px] space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Tabela de Números</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clique em um número para vender ou editar</p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 block" />
                  <span className="text-slate-400">Disponível</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-amber-400/20 border border-amber-400/30 block" />
                  <span className="text-amber-500">Reservado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500/30 block" />
                  <span className="text-emerald-500">Pago</span>
                </div>
                {selectedRaffle.status === 'drawn' && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] block animate-pulse" />
                    <span className="text-amber-400">Ganhador 👑</span>
                  </div>
                )}
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3.5">
              {selectedRaffle.tickets.map((ticket: RaffleTicket) => {
                const isWinner = selectedRaffle.status === 'drawn' && selectedRaffle.winnerNumber === ticket.number;
                
                let tileClass = "bg-slate-50 dark:bg-slate-850/50 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300";
                
                if (ticket.status === 'reserved') {
                  tileClass = "bg-amber-400/10 dark:bg-amber-500/5 border-amber-400/30 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-400/20";
                } else if (ticket.status === 'paid') {
                  tileClass = "bg-emerald-500/10 dark:bg-emerald-500/5 border-emerald-500/30 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20";
                }

                if (isWinner) {
                  tileClass = "bg-amber-500 border-amber-500 text-slate-950 font-black shadow-lg shadow-amber-200 dark:shadow-none animate-pulse scale-105 z-10";
                }

                return (
                  <button
                    key={ticket.number}
                    onClick={() => handleOpenTicketModal(ticket.number)}
                    className={cn(
                      "aspect-square rounded-2xl border flex flex-col items-center justify-center p-1 transition-all cursor-pointer relative",
                      tileClass
                    )}
                  >
                    <span className="text-xs font-black font-mono">
                      {ticket.number.toString().padStart(2, '0')}
                    </span>
                    {ticket.buyerName && !isWinner && (
                      <span className="text-[7.5px] font-black uppercase tracking-tight truncate max-w-full px-1 block mt-0.5 opacity-80">
                        {ticket.buyerName.split(' ')[0]}
                      </span>
                    )}
                    {isWinner && (
                      <span className="text-[6.5px] font-black uppercase tracking-wider block mt-0.5 animate-bounce">
                        GANHOU 👑
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* RAFFLES LIST VIEW */
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {raffles.map((r: Raffle) => {
            const stats = getRaffleStats(r);
            return (
              <div 
                key={r.id} 
                className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-850 shadow-sm overflow-hidden group hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="p-8 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "p-4 rounded-2xl shadow-lg",
                      r.status === 'drawn' ? "bg-amber-500 text-slate-950" : "bg-indigo-600 text-white"
                    )}>
                      <Ticket size={24} />
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenCreateModal(r)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all" title="Editar Configurações"><Settings size={16} /></button>
                      <button onClick={() => removeRaffle(r.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-all" title="Excluir"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn(
                        "px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-lg border",
                        r.status === 'drawn' 
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" 
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      )}>
                        {r.status === 'drawn' ? 'Finalizado 🏆' : 'Ativo ⚡'}
                      </span>
                      {r.status !== 'drawn' && (
                        <span className="px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                          ⏳ {getDaysRemaining(r.deadlineDate)}
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-slate-400">{r.totalNumbers} Números</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all">
                        {r.title}
                      </h2>
                      <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed mt-1">
                        {r.prizeDescription}
                      </p>
                    </div>

                    {/* Eligibility Rule Text */}
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight bg-indigo-50/50 dark:bg-indigo-950/25 px-3 py-1.5 rounded-xl border border-indigo-100/30 dark:border-indigo-900/15">
                      <span>🎯</span>
                      <span className="truncate">{r.eligibilityCustomText || 'Ganha 1 cupom a cada R$ 80 em compras'}</span>
                    </div>

                    {/* Chances / Coupons generated */}
                    <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <span className="flex items-center gap-1">🎟️ Chances Geradas:</span>
                      <span className="font-mono font-black text-indigo-500">{stats.paidCount + stats.reservedCount} cupons</span>
                    </div>
                  </div>

                  {/* Micro stats bar */}
                  <div className="space-y-1.5 pt-4 border-t border-slate-50 dark:border-slate-850">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                      <span>Vendas</span>
                      <span>{stats.paidCount + stats.reservedCount} / {r.totalNumbers} ({stats.soldPercentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full" 
                        style={{ width: `${stats.soldPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-50 dark:border-slate-850">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Preço por Número</p>
                      <p className="font-extrabold text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(r.ticketPrice)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Prêmio (Custo)</p>
                      <p className="font-extrabold text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(r.prizeValue)}</p>
                    </div>
                  </div>

                  {r.status === 'drawn' && (
                    <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[7.5px] font-black text-amber-500 uppercase tracking-widest block leading-none mb-1">Ganhador(a) Sorteado(a)</span>
                        <p className="text-xs font-black text-slate-800 dark:text-white truncate uppercase max-w-[140px]">
                          {r.winnerName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[7.5px] text-slate-400 font-bold block uppercase leading-none mb-1">Número</span>
                        <p className="text-sm font-black font-mono text-amber-500 leading-none">
                          Nº {r.winnerNumber?.toString().padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-8 pb-8">
                  <button 
                    onClick={() => setSelectedRaffle(r)}
                    className="w-full py-4.5 bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-slate-100 dark:border-slate-800/60 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 dark:hover:bg-indigo-600 dark:hover:text-white dark:hover:border-indigo-600 transition-all flex items-center justify-center gap-2"
                  >
                    Gerenciar Bilhetes & Sorteio
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* HISTÓRICO DE SORTEIOS / GANHADORES */}
        {raffles.some((r: Raffle) => r.status === 'drawn') && (
          <div className="mt-12 space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                🏆 Últimos Sorteios Realizados
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Ganhadores e campanhas finalizadas com sucesso
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              {raffles.filter((r: Raffle) => r.status === 'drawn').map((r: Raffle) => {
                const stats = getRaffleStats(r);
                return (
                  <div 
                    key={r.id} 
                    className="bg-slate-50 dark:bg-slate-900/60 border border-slate-150/50 dark:border-slate-850 p-6 rounded-[28px] relative overflow-hidden flex flex-col justify-between hover:shadow-sm transition-all"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-wider rounded-lg">
                          Finalizado 👑
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Sorteado em: {new Date(r.drawDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                          {r.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          Prêmio: {r.prizeDescription}
                        </p>
                      </div>

                      <div className="p-4 bg-white dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850/60 flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center font-mono font-black text-lg shadow-sm shrink-0">
                          {r.winnerNumber?.toString().padStart(2, '0')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block">Ganhador(a)</span>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate uppercase">
                            {r.winnerName || 'Cliente'}
                          </p>
                          {r.winnerVendedora && (
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                              Vendedora: {r.winnerVendedora}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {r.winnerPhone && (
                      <div className="mt-4 pt-4 border-t border-slate-150/40 dark:border-slate-850 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 font-mono">
                          📞 {r.winnerPhone}
                        </span>
                        <a
                          href={`https://wa.me/${r.winnerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá, ${r.winnerName}! Passando para parabenizar novamente pelo sorteio '${r.title}' na Biobel! Foi maravilhoso ter você como vencedor(a) do prêmio: ${r.prizeDescription}. ✨`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100/40 dark:border-emerald-900/10 transition-all flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.588 1.977 14.13 1.05 11.5 1.05c-5.44 0-9.866 4.372-9.87 9.802 0 1.63.45 3.22 1.302 4.634L1.9 20.9l5.516-1.43c1.56.849 3.09 1.3 4.79 1.3z" />
                          </svg>
                          Contato
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
      )}

      {/* MODAL: CREATE OR EDIT RAFFLE */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-50 dark:border-slate-850 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingRaffle ? 'Editar Configurações da Rifa' : 'Cadastrar Nova Rifa'}
                  </h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Preencha as informações do prêmio e valores</p>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-8 space-y-5">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Título da Rifa</label>
                  <input 
                    type="text" 
                    value={raffleForm.title}
                    onChange={(e) => setRaffleForm({ ...raffleForm, title: e.target.value })}
                    placeholder="Ex: Rifa de Inverno - Cesta de Beleza"
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Prize Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Descrição Detalhada do Prêmio (Basket / Items)</label>
                  <textarea 
                    value={raffleForm.prizeDescription}
                    onChange={(e) => setRaffleForm({ ...raffleForm, prizeDescription: e.target.value })}
                    placeholder="Ex: Cesta luxuosa avaliada em R$ 400 contendo mais de 10 produtos de beleza selecionados, incluindo perfumes, hidratantes e batons..."
                    rows={3}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all resize-none"
                  />
                </div>

                {/* Values and Numbers Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Custo do Prêmio</label>
                    <input 
                      type="number" 
                      value={raffleForm.prizeValue}
                      onChange={(e) => setRaffleForm({ ...raffleForm, prizeValue: Number(e.target.value) })}
                      placeholder="400"
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-black font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Valor do Bilhete</label>
                    <input 
                      type="number" 
                      value={raffleForm.ticketPrice}
                      onChange={(e) => setRaffleForm({ ...raffleForm, ticketPrice: Number(e.target.value) })}
                      placeholder="25"
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-black font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total de Bilhetes</label>
                    <select 
                      value={raffleForm.totalNumbers}
                      onChange={(e) => setRaffleForm({ ...raffleForm, totalNumbers: Number(e.target.value) })}
                      disabled={!!editingRaffle}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-black text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value={25}>25 Números</option>
                      <option value={50}>50 Números</option>
                      <option value={100}>100 Números</option>
                      <option value={200}>200 Números</option>
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Data Limite de Compra</label>
                    <input 
                      type="date" 
                      value={raffleForm.deadlineDate}
                      onChange={(e) => setRaffleForm({ ...raffleForm, deadlineDate: e.target.value })}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-extrabold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dia do Sorteio</label>
                    <input 
                      type="date" 
                      value={raffleForm.drawDate}
                      onChange={(e) => setRaffleForm({ ...raffleForm, drawDate: e.target.value })}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-extrabold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all cursor-pointer"
                    />
                  </div>
                </div>

                {/* Eligibility Rules */}
                <div className="p-5 bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl space-y-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">🎯</span>
                    <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Regra de Elegibilidade do Sorteio</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Tipo de Gatilho</label>
                      <select 
                        value={raffleForm.eligibilityType}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          let txt = raffleForm.eligibilityCustomText;
                          if (val === 'spend_threshold') {
                            txt = `Ganha 1 cupom a cada R$ ${raffleForm.eligibilityValue} em compras`;
                          } else if (val === 'any_sale') {
                            txt = 'Ganha 1 cupom por qualquer compra no período';
                          } else {
                            txt = 'Exclusivo para serviços selecionados';
                          }
                          setRaffleForm({ 
                            ...raffleForm, 
                            eligibilityType: val,
                            eligibilityCustomText: txt
                          });
                        }}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-black text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="spend_threshold">Valor Gasto</option>
                        <option value="any_sale">Qualquer Venda</option>
                        <option value="custom">Critério Personalizado</option>
                      </select>
                    </div>

                    {raffleForm.eligibilityType === 'spend_threshold' && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Valor Mínimo (R$)</label>
                        <input 
                          type="number" 
                          value={raffleForm.eligibilityValue}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setRaffleForm({ 
                              ...raffleForm, 
                              eligibilityValue: val,
                              eligibilityCustomText: `Ganha 1 cupom a cada R$ ${val} em compras`
                            });
                          }}
                          placeholder="80"
                          className="w-full px-4 py-3 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-black font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Texto Explicativo no Card</label>
                    <input 
                      type="text" 
                      value={raffleForm.eligibilityCustomText}
                      onChange={(e) => setRaffleForm({ ...raffleForm, eligibilityCustomText: e.target.value })}
                      placeholder="Ex: Ganha 1 cupom a cada R$ 80 em compras"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-50 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 flex gap-4">
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-slate-750 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveRaffle}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all"
                >
                  {editingRaffle ? 'Salvar Alterações' : 'Criar Rifa'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: SELL/RESERVE TICKET */}
      <AnimatePresence>
        {isTicketModalOpen && selectedTicketNumber !== null && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-50 dark:border-slate-850 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                    🎟️ Bilhete Número <span className="text-indigo-600 font-mono text-xl">#{selectedTicketNumber.toString().padStart(2, '0')}</span>
                  </h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    Vender ou Reservar para Comprador
                  </p>
                </div>
                <button 
                  onClick={() => setIsTicketModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-8 space-y-4">
                {/* Buyer Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nome do Comprador</label>
                  <input 
                    type="text" 
                    value={ticketForm.buyerName}
                    onChange={(e) => setTicketForm({ ...ticketForm, buyerName: e.target.value })}
                    placeholder="Digite o nome do comprador"
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Buyer Phone */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Telefone de Contato</label>
                  <input 
                    type="text" 
                    value={ticketForm.buyerPhone}
                    onChange={(e) => setTicketForm({ ...ticketForm, buyerPhone: e.target.value })}
                    placeholder="Ex: (51) 99999-9999"
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Seller Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Vendedora Responsável</label>
                  <select 
                    value={ticketForm.vendedora}
                    onChange={(e) => setTicketForm({ ...ticketForm, vendedora: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-black text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="">Nenhuma / Gerência</option>
                    {staff.map((member: any) => (
                      <option key={member.id} value={member.name.toUpperCase()}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Status do Pagamento</label>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-850 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTicketForm({ ...ticketForm, status: 'reserved' })}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
                        ticketForm.status === 'reserved'
                          ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      Reservado
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketForm({ ...ticketForm, status: 'paid' })}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
                        ticketForm.status === 'paid'
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      Pago
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-50 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col gap-2">
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsTicketModalOpen(false)}
                    className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-slate-750 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={saveTicket}
                    className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all"
                  >
                    Confirmar
                  </button>
                </div>
                
                {selectedRaffle.tickets.find((t: RaffleTicket) => t.number === selectedTicketNumber)?.status !== 'available' && (
                  <button 
                    onClick={clearTicket}
                    className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/15 text-rose-500 rounded-xl font-black uppercase text-[9px] tracking-widest border border-rose-500/20 transition-all"
                  >
                    Liberar Número / Cancelar Venda
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY DRAW ANIMATION (ROLLING SUSPENSE / MODO TELÃO) */}
      <AnimatePresence>
        {(isDrawing || finalWinner !== null) && (
          <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-xl flex items-center justify-center p-4 z-[99999] animate-fade-in overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="text-center space-y-8 max-w-2xl w-full py-12 px-6"
            >
              {isDrawing ? (
                <div className="space-y-8 animate-pulse">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest animate-bounce">
                      🎬 Modo Telão Ativado
                    </span>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tight">
                      Sorteio em Andamento!
                    </h1>
                    <p className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-widest">
                      {selectedRaffle?.title}
                    </p>
                  </div>
                  
                  {/* Giant Rolling Number display */}
                  <div className="w-64 h-64 mx-auto bg-slate-900 border-8 border-indigo-500 rounded-full flex flex-col items-center justify-center shadow-[0_0_80px_rgba(99,102,241,0.6)] border-t-indigo-400 border-b-indigo-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-radial-gradient from-indigo-500/10 to-transparent pointer-events-none" />
                    
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Número</span>
                    <span className="text-8xl font-black font-mono text-white select-none leading-none my-1">
                      {drawNumber?.toString().padStart(2, '0') || '00'}
                    </span>
                    
                    {/* Display rolling buyer name inside the circle */}
                    <div className="h-6 w-full px-4 overflow-hidden">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block truncate">
                        {selectedRaffle?.tickets.find((t: RaffleTicket) => t.number === drawNumber)?.buyerName || '---'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-black uppercase tracking-wider">
                      Analisando bilhetes e auditando transações...
                    </p>
                    <div className="w-48 h-1 bg-slate-800 mx-auto rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full w-2/3 rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>
              ) : (
                /* Winner Reveal! */
                finalWinner && selectedRaffle && (
                  <div className="space-y-8 animate-scale-up">
                    <div className="space-y-3">
                      <span className="text-amber-400 text-7xl block animate-bounce">🏆</span>
                      <h1 className="text-5xl font-black text-white uppercase tracking-tight">
                        Temos um Ganhador(a)!
                      </h1>
                      <span className="inline-block px-4 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                        {selectedRaffle.title}
                      </span>
                    </div>

                    {/* Winning ticket card (Premium Boardroom style) */}
                    <div className="bg-slate-900 border-4 border-amber-400 p-10 rounded-[48px] shadow-[0_0_100px_rgba(245,158,11,0.4)] relative overflow-hidden space-y-6 max-w-md mx-auto">
                      <div className="absolute top-0 right-0 p-4">
                        <span className="text-amber-400/20 text-8xl font-mono font-black select-none pointer-events-none">
                          Nº{finalWinner.number.toString().padStart(2, '0')}
                        </span>
                      </div>
                      
                      <div className="text-left space-y-4">
                        <div>
                          <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">CUPOM DA SORTE</span>
                          <h2 className="text-6xl font-black text-white font-mono leading-none">
                            Nº {finalWinner.number.toString().padStart(2, '0')}
                          </h2>
                        </div>

                        <div className="pt-6 border-t border-slate-800 space-y-3">
                          <div>
                            <span className="text-[8px] text-slate-500 font-bold uppercase block">Nome do Cliente</span>
                            <p className="text-2xl font-black text-amber-400 uppercase tracking-tight">
                              {finalWinner.buyerName}
                            </p>
                          </div>
                          
                          {finalWinner.buyerPhone && (
                            <div>
                              <span className="text-[8px] text-slate-500 font-bold uppercase block">Telefone</span>
                              <p className="text-sm font-bold text-slate-300 font-mono">
                                📞 {finalWinner.buyerPhone}
                              </p>
                            </div>
                          )}

                          {finalWinner.vendedora && (
                            <div className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border border-indigo-500/20">
                              Vendedora: {finalWinner.vendedora}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick WhatsApp Notification & Close Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
                      {finalWinner.buyerPhone && (
                        <a
                          href={`https://wa.me/${finalWinner.buyerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá, ${finalWinner.buyerName}! Parabéns! 🥳 Você foi o(a) grande ganhador(a) do sorteio '${selectedRaffle.title}' na Biobel com o número ${finalWinner.number.toString().padStart(2, '0')}! Entre em contato conosco para retirar seu prêmio: ${selectedRaffle.prizeDescription}. ✨`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full sm:flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.588 1.977 14.13 1.05 11.5 1.05c-5.44 0-9.866 4.372-9.87 9.802 0 1.63.45 3.22 1.302 4.634L1.9 20.9l5.516-1.43c1.56.849 3.09 1.3 4.79 1.3z" />
                          </svg>
                          Notificar Ganhador
                        </a>
                      )}
                      
                      <button
                        onClick={() => {
                          setFinalWinner(null);
                          setDrawNumber(null);
                        }}
                        className="w-full sm:flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all cursor-pointer border border-slate-700"
                      >
                        Fechar Janela
                      </button>
                    </div>
                  </div>
                )
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
