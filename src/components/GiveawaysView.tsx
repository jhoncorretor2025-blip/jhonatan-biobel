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

export const GiveawaysView = ({ giveaways, setGiveaways, customers, addNotification, handleFirestoreError, user, ensureAuthSession, sales = [] }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGiveaway, setEditingGiveaway] = useState<Giveaway | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    date: '',
    eligibilityType: 'spend_threshold',
    eligibilityValue: 80,
    eligibilityCustomText: 'Ganha 1 cupom a cada R$ 80 em compras'
  });

  // Telão (Full Screen Draw) State
  const [activeTelaoGiveaway, setActiveTelaoGiveaway] = useState<Giveaway | null>(null);
  const [telaoPhase, setTelaoPhase] = useState<'ready' | 'rolling' | 'finished'>('ready');
  const [telaoCurrentRollName, setTelaoCurrentRollName] = useState('Pronto para iniciar!');
  const [telaoWinner, setTelaoWinner] = useState<any>(null);

  const handleOpenModal = (giveaway?: Giveaway) => {
    if (giveaway) {
      setEditingGiveaway(giveaway);
      setFormData({ 
        name: giveaway.name, 
        description: giveaway.description, 
        date: giveaway.date,
        eligibilityType: giveaway.eligibilityType || 'spend_threshold',
        eligibilityValue: giveaway.eligibilityValue || 80,
        eligibilityCustomText: giveaway.eligibilityCustomText || 'Ganha 1 cupom a cada R$ 80 em compras'
      });
    } else {
      setEditingGiveaway(null);
      setFormData({ 
        name: '', 
        description: '', 
        date: '',
        eligibilityType: 'spend_threshold',
        eligibilityValue: 80,
        eligibilityCustomText: 'Ganha 1 cupom a cada R$ 80 em compras'
      });
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
      winnerName: editingGiveaway?.winnerName,
      eligibilityType: formData.eligibilityType as any || 'spend_threshold',
      eligibilityValue: Number(formData.eligibilityValue) || 80,
      eligibilityCustomText: formData.eligibilityCustomText || 'Ganha 1 cupom a cada R$ 80 em compras'
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

  const handleAutoDistributeGiveaway = (giveaway: Giveaway) => {
    if (!sales || sales.length === 0) {
      addNotification('Nenhuma venda cadastrada no sistema para fazer a distribuição.', 'error');
      return;
    }

    const end = giveaway.date;
    // 30 days before draw date
    const start = new Date(new Date(end + 'T00:00:00').getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const giveawaySales = sales.filter((s: any) => {
      return s.date >= start && s.date <= end && s.status !== 'cancelled';
    });

    if (giveawaySales.length === 0) {
      addNotification(`Nenhuma venda realizada no período de ${new Date(start + 'T00:00:00').toLocaleDateString('pt-BR')} até ${new Date(end + 'T00:00:00').toLocaleDateString('pt-BR')}.`, 'info');
      return;
    }

    const customerTotals: { [key: string]: { id: string; name: string; phone: string; totalSpent: number; salesCount: number } } = {};

    giveawaySales.forEach((s: any) => {
      if (!s.customerName) return;
      const matchedCust = customers.find((c: any) => c.name.trim().toUpperCase() === s.customerName.trim().toUpperCase());
      const custId = matchedCust?.id || `cust_${Math.random().toString(36).substr(2, 5)}`;
      const key = custId;

      if (!customerTotals[key]) {
        customerTotals[key] = {
          id: custId,
          name: s.customerName.trim(),
          phone: s.customerPhone?.trim() || matchedCust?.phone || '',
          totalSpent: 0,
          salesCount: 0
        };
      }
      customerTotals[key].totalSpent += s.total;
      customerTotals[key].salesCount += 1;
    });

    const type = giveaway.eligibilityType || 'spend_threshold';
    const threshold = giveaway.eligibilityValue || 80;

    const newParticipants: string[] = [];

    Object.values(customerTotals).forEach((c) => {
      let count = 0;
      if (type === 'spend_threshold') {
        count = Math.floor(c.totalSpent / threshold);
      } else if (type === 'any_sale') {
        count = c.salesCount;
      } else {
        count = 1;
      }

      for (let i = 0; i < count; i++) {
        newParticipants.push(c.id);
      }
    });

    if (newParticipants.length === 0) {
      addNotification('Nenhum cliente atingiu os critérios de elegibilidade para este sorteio.', 'info');
      return;
    }

    const updatedGiveaway: Giveaway = {
      ...giveaway,
      participants: newParticipants
    };

    setGiveaways(giveaways.map((g: Giveaway) => g.id === giveaway.id ? updatedGiveaway : g));
    addNotification(`Sucesso! Distribuídos ${newParticipants.length} cupons/chances para clientes com base nas vendas do período.`, 'success');
  };

  const startTelaoDraw = (giveaway: Giveaway) => {
    const pool = giveaway.participants.length > 0 ? giveaway.participants : customers.map((c: any) => c.id);
    if (pool.length === 0) {
      addNotification('Nenhum participante elegível encontrado para realizar o sorteio.', 'error');
      return;
    }

    setActiveTelaoGiveaway(giveaway);
    setTelaoPhase('ready');
    setTelaoCurrentRollName('Pronto para Iniciar!');
    setTelaoWinner(null);
  };

  const runDeceleratingRoll = () => {
    if (!activeTelaoGiveaway) return;
    
    const pool = activeTelaoGiveaway.participants.length > 0 ? activeTelaoGiveaway.participants : customers.map((c: any) => c.id);
    if (pool.length === 0) return;

    setTelaoPhase('rolling');
    
    let currentDelay = 40; // Initial fast speed
    const maxDelay = 450;  // Threshold to stop
    
    const roll = () => {
      const randId = pool[Math.floor(Math.random() * pool.length)];
      const randCust = customers.find((c: any) => c.id === randId);
      const displayName = randCust ? randCust.name.toUpperCase() : 'CLIENTE ELEGÍVEL';
      setTelaoCurrentRollName(displayName);

      if (currentDelay < maxDelay) {
        // Slowly decelerate the rolling
        currentDelay = Math.floor(currentDelay * 1.09);
        setTimeout(roll, currentDelay);
      } else {
        // Pick absolute winner!
        const winnerId = pool[Math.floor(Math.random() * pool.length)];
        const winnerCust = customers.find((c: any) => c.id === winnerId);
        const finalWinnerObj = {
          id: winnerId,
          name: winnerCust?.name || 'Cliente da Biobel',
          phone: winnerCust?.phone || ''
        };

        const updatedGiveaway: Giveaway = {
          ...activeTelaoGiveaway,
          status: 'completed',
          winnerId: winnerId,
          winnerName: finalWinnerObj.name
        };

        setGiveaways(giveaways.map((g: Giveaway) => g.id === activeTelaoGiveaway.id ? updatedGiveaway : g));
        setTelaoWinner(finalWinnerObj);
        setTelaoCurrentRollName(finalWinnerObj.name.toUpperCase());
        setTelaoPhase('finished');
        addNotification(`Vencedor(a) sorteado(a): ${finalWinnerObj.name}!`, 'success');
      }
    };

    setTimeout(roll, currentDelay);
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
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            🎁 Sorteios & Campanhas
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engajamento e Fidelização de Clientes</p>
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
          <div key={g.id} className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden group flex flex-col justify-between">
            <div className="p-8 space-y-6 flex-1">
              <div className="flex items-start justify-between">
                <div className={cn(
                  "p-4 rounded-2xl shadow-lg",
                  g.status === 'completed' ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"
                )}>
                  <Gift size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleOpenModal(g)} className="p-2 text-slate-300 hover:text-blue-600 transition-all" title="Editar Sorteio"><Settings size={18} /></button>
                  <button onClick={() => removeGiveaway(g.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-all" title="Excluir"><Trash2 size={18} /></button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn(
                    "px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-lg border",
                    g.status === 'completed' 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                      : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                  )}>
                    {g.status === 'completed' ? 'Realizado 🏆' : 'Pendente ⚡'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{g.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">{g.description}</p>
                </div>

                {/* Eligibility Rule Informative Badge */}
                <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight bg-blue-50/50 dark:bg-blue-950/25 px-3 py-2 rounded-xl border border-blue-100/30 dark:border-blue-900/15">
                  <span>🎯 Critério:</span>
                  <span className="truncate">{g.eligibilityCustomText || 'Ganha 1 cupom a cada R$ 80 em compras'}</span>
                </div>

                {/* Coupon Counter Badge */}
                <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="flex items-center gap-1">🎟️ Cupons Distribuídos:</span>
                  <span className="font-mono font-black text-blue-500">{g.participants?.length || 0} cupons gerados</span>
                </div>
              </div>

              <div className="flex items-center gap-4 py-4 border-y border-slate-50 dark:border-slate-800/60 mt-4">
                <div className="flex-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data Prevista</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{new Date(g.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>

            <div className="p-8 pt-0 space-y-2">
              {g.status !== 'completed' && (
                <button
                  onClick={() => handleAutoDistributeGiveaway(g)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200/40 dark:border-slate-700/20 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  title="Varrer vendas e gerar cupons com base na regra de elegibilidade"
                >
                  ⚡ Auto-Distribuir por Vendas
                </button>
              )}

              {g.status === 'completed' ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Vencedor(a)</p>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase">{g.winnerName}</p>
                </div>
              ) : (
                <button 
                  onClick={() => startTelaoDraw(g)}
                  className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Trophy size={14} />
                  Realizar Sorteio
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CREATE OR EDIT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingGiveaway ? 'Editar Sorteio' : 'Novo Sorteio'}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Defina as regras e prêmios</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Sorteio</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                    placeholder="Ex: Sorteio de Páscoa"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição / Prêmio</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white h-24"
                    placeholder="Descreva o prêmio e as regras..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data do Sorteio</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>

                {/* AUTOMATIC ELIGIBILITY CRITERIA */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🎯 Regra de Elegibilidade Automática</label>
                  <select
                    value={formData.eligibilityType}
                    onChange={(e) => {
                      const type = e.target.value;
                      let text = 'Exclusivo para clientes elegíveis';
                      if (type === 'spend_threshold') {
                        text = `Ganha 1 cupom a cada R$ ${formData.eligibilityValue || 80} em compras`;
                      } else if (type === 'any_sale') {
                        text = 'Ganha 1 cupom a cada venda realizada';
                      }
                      setFormData({
                        ...formData,
                        eligibilityType: type,
                        eligibilityCustomText: text
                      });
                    }}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  >
                    <option value="spend_threshold">Valor Mínimo de Venda (Gatilho de R$)</option>
                    <option value="any_sale">Qualquer Atendimento/Venda</option>
                    <option value="custom">Regra Customizada (Apenas texto informativo)</option>
                  </select>
                </div>

                {formData.eligibilityType === 'spend_threshold' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor do Gatilho (R$)</label>
                    <input
                      type="number"
                      value={formData.eligibilityValue}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData({
                          ...formData,
                          eligibilityValue: val,
                          eligibilityCustomText: `Ganha 1 cupom a cada R$ ${val} em compras`
                        });
                      }}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Texto Informativo no Card</label>
                  <input
                    type="text"
                    value={formData.eligibilityCustomText}
                    onChange={(e) => setFormData({ ...formData, eligibilityCustomText: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    placeholder="Ex: Ganha 1 cupom a cada R$ 80 em compras"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-slate-750 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={saveGiveaway}
                    className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                  >
                    {editingGiveaway ? 'Salvar' : 'Adicionar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODO TELÃO (FULL SCREEN ANIMAÇÃO DO SORTEIO) OVERLAY */}
      <AnimatePresence>
        {activeTelaoGiveaway && (
          <div className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col items-center justify-center p-6 text-white select-none overflow-hidden font-sans">
            {/* Ambient Animated Glows */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />

            {/* Falling Confetti / Star Particles inside finished phase */}
            {telaoPhase === 'finished' && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
                {[...Array(60)].map((_, i) => {
                  const style = {
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 4}s`,
                    animationDuration: `${2 + Math.random() * 3}s`,
                    backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 5)]
                  };
                  return (
                    <div 
                      key={i} 
                      style={style}
                      className="absolute w-2.5 h-2.5 rounded-full animate-bounce opacity-80"
                    />
                  );
                })}
              </div>
            )}

            {/* TELÃO HEADER */}
            <div className="relative text-center space-y-2 max-w-2xl z-20">
              <span className="px-4 py-1.5 bg-indigo-600/30 border border-indigo-500/30 rounded-full text-xs font-black uppercase tracking-widest text-indigo-400">
                🎥 MODO TELÃO DE SORTEIO
              </span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 drop-shadow-md">
                {activeTelaoGiveaway.name}
              </h2>
              <p className="text-xs md:text-sm font-semibold text-slate-400 tracking-wider">
                Prêmio: {activeTelaoGiveaway.description}
              </p>
            </div>

            {/* SPINNING / WINNER CONTAINER */}
            <div className="relative w-full max-w-3xl my-12 z-20 flex flex-col items-center justify-center">
              <div className={cn(
                "w-full bg-slate-900/80 backdrop-blur-xl rounded-[40px] border p-8 md:p-12 text-center transition-all duration-500 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]",
                telaoPhase === 'finished' 
                  ? "border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.25)] bg-slate-900" 
                  : "border-slate-800 shadow-2xl"
              )}>
                
                {/* Visual Ring Spotlight */}
                <div className="absolute -inset-10 bg-gradient-to-tr from-blue-500/5 to-purple-500/5 rounded-[40px] pointer-events-none" />

                {telaoPhase === 'ready' && (
                  <div className="space-y-6">
                    <div className="p-6 rounded-full bg-slate-950/60 border border-slate-850 text-slate-400 w-24 h-24 flex items-center justify-center mx-auto shadow-inner animate-bounce">
                      <Trophy size={48} className="text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase text-slate-300">Sorteio Pronto</h3>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">
                        {activeTelaoGiveaway.participants?.length || 0} cupons válidos na urna virtual
                      </p>
                    </div>
                    <button
                      onClick={runDeceleratingRoll}
                      className="px-12 py-5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-amber-500/10 hover:scale-105 active:scale-95 transition-all"
                    >
                      Iniciar Sorteio ⚡
                    </button>
                  </div>
                )}

                {telaoPhase === 'rolling' && (
                  <div className="space-y-6">
                    <span className="px-3.5 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg animate-pulse">
                      🌀 RODANDO NOMES...
                    </span>
                    <div className="py-6 min-h-[100px] flex items-center justify-center">
                      <p className="text-2xl md:text-5xl font-black font-mono uppercase tracking-tight text-white animate-pulse">
                        {telaoCurrentRollName}
                      </p>
                    </div>
                    <div className="w-48 bg-slate-950/80 rounded-full h-1.5 overflow-hidden mx-auto border border-slate-850">
                      <div className="bg-blue-500 h-full w-1/2 rounded-full animate-[spin_2s_linear_infinite]" />
                    </div>
                  </div>
                )}

                {telaoPhase === 'finished' && telaoWinner && (
                  <div className="space-y-6 animate-[scaleIn_0.5s_ease-out_forwards]">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-black uppercase tracking-wider animate-bounce">
                      👑 PARABÉNS! VENCEDOR(A)
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="text-3xl md:text-6xl font-black uppercase tracking-tight text-amber-300 drop-shadow-lg">
                        {telaoWinner.name}
                      </h4>
                      {telaoWinner.phone && (
                        <p className="text-lg font-mono text-slate-400 tracking-wider">
                          📞 {telaoWinner.phone}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 justify-center pt-4">
                      {telaoWinner.phone && (
                        <a
                          href={`https://wa.me/${telaoWinner.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá, ${telaoWinner.name}! Parabéns! Você foi o(a) grande vencedor(a) do sorteio '${activeTelaoGiveaway.name}' na Biobel! Prêmio: ${activeTelaoGiveaway.description}. Entre em contato para resgatar! ✨`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.588 1.977 14.13 1.05 11.5 1.05c-5.44 0-9.866 4.372-9.87 9.802 0 1.63.45 3.22 1.302 4.634L1.9 20.9l5.516-1.43c1.56.849 3.09 1.3 4.79 1.3z" />
                          </svg>
                          Notificar Vencedor
                        </a>
                      )}
                      
                      <button
                        onClick={runDeceleratingRoll}
                        className="px-6 py-3.5 bg-slate-800 border border-slate-700 hover:bg-slate-755 text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                      >
                        Sortear Novamente 🌀
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* EXIT BUTTON */}
            <div className="relative z-20 pt-4">
              <button
                onClick={() => {
                  setActiveTelaoGiveaway(null);
                  setTelaoWinner(null);
                  setTelaoPhase('ready');
                }}
                disabled={telaoPhase === 'rolling'}
                className={cn(
                  "px-8 py-3 bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all",
                  telaoPhase === 'rolling' && "opacity-30 cursor-not-allowed"
                )}
              >
                Voltar / Fechar Telão
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
