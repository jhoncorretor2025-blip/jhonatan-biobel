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

export const StaffView = ({ 
  staff, setStaff, settings, setSettings, addNotification, handleFirestoreError, user, formatDate, ensureAuthSession,
  sales = [], productCategories = [], formatCurrency = (v) => `R$ ${v.toFixed(2)}`
}: StaffViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<Partial<Staff>>({
    name: '', role: 'CLT', startDate: new Date().toISOString().split('T')[0], phone: '', activities: []
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [dismissalDate, setDismissalDate] = useState(new Date().toISOString().split('T')[0]);

  // Sub Tabs
  const [activeSubTab, setActiveSubTab] = useState<'staff_list' | 'commissions'>('staff_list');
  const [commissionMonth, setCommissionMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Calculate commissions for all staff
  const staffCommissions = useMemo(() => {
    return staff.map(member => {
      let servicesTotal = 0;
      let productsTotal = 0;
      let servicesCommission = 0;
      let productsCommission = 0;

      // Commission rates: use member's custom rates or default fallback (30% services, 10% products)
      const serviceRate = member.commissionService !== undefined ? member.commissionService / 100 : 0.3;
      const productRate = member.commissionProduct !== undefined ? member.commissionProduct / 100 : 0.1;

      // Filter sales for this member in the selected month
      const memberSales = sales.filter(sale => {
        if (!sale.vendedora || sale.status === 'cancelled') return false;
        const matchesMember = sale.vendedora.toUpperCase() === member.name.toUpperCase();
        const matchesMonth = sale.date.startsWith(commissionMonth);
        return matchesMember && matchesMonth;
      });

      memberSales.forEach(sale => {
        if (!sale.items) return;
        sale.items.forEach(item => {
          // Identify if product or service
          const categoryName = item.category || '';
          const matchedCat = productCategories.find(c => c.name.toUpperCase() === categoryName.toUpperCase());
          const isService = matchedCat ? !!matchedCat.isService : false;

          const itemTotal = Number(item.total || (item.quantity * item.price) || 0);

          if (isService) {
            servicesTotal += itemTotal;
            servicesCommission += itemTotal * serviceRate;
          } else {
            productsTotal += itemTotal;
            productsCommission += itemTotal * productRate;
          }
        });
      });

      const totalFaturamento = servicesTotal + productsTotal;
      const totalCommission = servicesCommission + productsCommission;
      const goal = member.goal || 0;
      const percentGoal = goal > 0 ? (totalFaturamento / goal) * 100 : 0;

      return {
        member,
        servicesTotal,
        productsTotal,
        servicesCommission,
        productsCommission,
        totalFaturamento,
        totalCommission,
        goal,
        percentGoal,
        salesCount: memberSales.length
      };
    });
  }, [staff, sales, productCategories, commissionMonth]);

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
      status: editingStaff?.status || 'active',
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

  const handleDeleteClick = (s: Staff) => {
    setStaffToDelete(s);
    setDismissalDate(new Date().toISOString().split('T')[0]);
    setIsDeleteModalOpen(true);
  };

  const handlePermanentDelete = async () => {
    if (!staffToDelete) return;
    try {
      setStaff(prev => prev.filter(s => s.id !== staffToDelete.id));
      addNotification('Colaboradora excluída permanentemente.', 'info');
      setIsDeleteModalOpen(false);
      setStaffToDelete(null);
    } catch (error: any) {
      addNotification('Erro ao remover funcionário.', 'error');
    }
  };

  const handleDismissStaff = async () => {
    if (!staffToDelete) return;
    try {
      setStaff(prev => prev.map(s => s.id === staffToDelete.id ? {
        ...s,
        status: 'inactive',
        dismissalDate: dismissalDate
      } : s));
      addNotification(`Desligamento da colaboradora ${staffToDelete.name} registrado com sucesso em ${dismissalDate.split('-').reverse().join('/')}.`, 'success');
      setIsDeleteModalOpen(false);
      setStaffToDelete(null);
    } catch (error: any) {
      addNotification('Erro ao desativar funcionário.', 'error');
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

      {/* Sub-Tabs selection */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit mx-auto border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveSubTab('staff_list')}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
            activeSubTab === 'staff_list' 
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
          )}
        >
          👥 Cadastro da Equipe
        </button>
        <button
          onClick={() => setActiveSubTab('commissions')}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
            activeSubTab === 'commissions' 
              ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
          )}
        >
          💸 Fechamento de Comissões
        </button>
      </div>

      {activeSubTab === 'staff_list' && (
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
                <th className="px-6 py-4">Comissão (Serv / Prod)</th>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((s) => {
                const isInactive = s.status === 'inactive';
                return (
                  <tr key={s.id} className={cn("hover:bg-slate-50 transition-colors", isInactive && "opacity-60 bg-rose-50/10")}>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{s.name}</span>
                        {isInactive && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[8px] font-black uppercase rounded-full tracking-widest">
                            Desligada
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        s.role === 'Dona' ? "bg-purple-100 text-purple-700" : 
                        s.role === 'CLT' ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                      )}>
                        {s.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div>
                        <div>{s.startDate?.split('-').reverse().join('/')}</div>
                        {isInactive && s.dismissalDate && (
                          <div className="text-[9px] text-rose-500 font-bold uppercase mt-0.5">
                            Fim: {s.dismissalDate.split('-').reverse().join('/')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-black text-slate-700 dark:text-slate-350">
                        S: <span className="text-emerald-600 dark:text-emerald-400 font-mono font-extrabold">{s.commissionService !== undefined ? `${s.commissionService}%` : '30%'}</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                        P: <span className="text-blue-600 dark:text-blue-400 font-mono font-extrabold">{s.commissionProduct !== undefined ? `${s.commissionProduct}%` : '10%'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{s.phone}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(s)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar Cadastro"><Edit2 size={18} /></button>
                        {isInactive ? (
                          <button 
                            type="button"
                            onClick={() => {
                              setStaff(prev => prev.map(item => item.id === s.id ? { ...item, status: 'active', dismissalDate: undefined } : item));
                              addNotification(`Funcionária ${s.name} reativada com sucesso!`, 'success');
                            }} 
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all animate-pulse"
                            title="Reativar Colaboradora"
                          >
                            <RefreshCw size={18} />
                          </button>
                        ) : (
                          <button onClick={() => handleDeleteClick(s)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Excluir ou Desligar"><Trash2 size={18} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
                        <option value="Sócia">Sócia</option>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comissão em Serviços (%)</label>
                      <input 
                        type="number" 
                        placeholder="Ex: 30"
                        value={formData.commissionService || ''}
                        onChange={(e) => setFormData({ ...formData, commissionService: Number(e.target.value) })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comissão em Produtos (%)</label>
                      <input 
                        type="number" 
                        placeholder="Ex: 10"
                        value={formData.commissionProduct || ''}
                        onChange={(e) => setFormData({ ...formData, commissionProduct: Number(e.target.value) })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      />
                    </div>
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
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl font-black uppercase tracking-widest font-bold">Cancelar</button>
                  <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest font-bold">Salvar</button>
                </div>
              </motion.div>
            </div>
          )}

          {isDeleteModalOpen && staffToDelete && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-rose-50/40">
                  <div className="flex items-center gap-2">
                    <Trash2 className="text-rose-600" size={20} />
                    <h3 className="text-sm font-black text-rose-800 uppercase tracking-tight">
                      Desligar ou Excluir Colaboradora?
                    </h3>
                  </div>
                  <button onClick={() => setIsDeleteModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-5">
                  <p className="text-xs font-bold text-slate-600 leading-relaxed">
                    Você deseja remover a colaboradora <span className="font-extrabold text-slate-900 uppercase">{staffToDelete.name}</span>. 
                    Escolha se deseja excluir permanentemente ou apenas inativar com a data de término das atividades:
                  </p>

                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                      Data de Desligamento / Saída:
                    </label>
                    <input 
                      type="date" 
                      value={dismissalDate}
                      onChange={(e) => setDismissalDate(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                    />
                  </div>

                  <div className="space-y-2.5">
                    {/* Option 1: Just Dismiss / Deactivate */}
                    <button 
                      onClick={handleDismissStaff}
                      className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={14} />
                      Registrar Desligamento (Inativar)
                    </button>
                    
                    {/* Option 2: Permanent Delete (Only Delete) */}
                    <button 
                      onClick={handlePermanentDelete}
                      className="w-full py-3.5 px-4 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      <AlertCircle size={14} />
                      Excluir Definitivamente do Sistema
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 flex justify-end">
                  <button 
                    onClick={() => setIsDeleteModalOpen(false)} 
                    className="px-5 py-2.5 bg-white text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg font-black uppercase tracking-wider text-[9px]"
                  >
                    Voltar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
      )}

      {activeSubTab === 'commissions' && (
        <div className="space-y-6">
          {/* Top selection bar */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 text-left">
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={18} className="text-emerald-500" />
                Competência de Cálculo
              </h4>
              <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase">Selecione o mês desejado para apurar os números de comissões da equipe.</p>
            </div>
            <input 
              type="month" 
              value={commissionMonth} 
              onChange={(e) => setCommissionMonth(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Store-wide summary card */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Faturamento Apurado</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                {formatCurrency(staffCommissions.reduce((acc, c) => acc + c.totalFaturamento, 0))}
              </h3>
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Total Comissões</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                {formatCurrency(staffCommissions.reduce((acc, c) => acc + c.totalCommission, 0))}
              </h3>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Faturamento em Serviços</p>
              <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200 font-mono mt-1">
                {formatCurrency(staffCommissions.reduce((acc, c) => acc + c.servicesTotal, 0))}
              </h4>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Faturamento em Produtos</p>
              <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200 font-mono mt-1">
                {formatCurrency(staffCommissions.reduce((acc, c) => acc + c.productsTotal, 0))}
              </h4>
            </div>
          </div>

          {/* Individual list cards */}
          <div className="space-y-6">
            {staffCommissions.map((data) => {
              if (data.member.status === 'inactive' && data.totalFaturamento === 0) return null;
              
              // Define PDF printing callback
              const handleGenerateCommissionPDF = () => {
                try {
                  const doc = new jsPDF();
                  
                  // Header Banner
                  doc.setFillColor(30, 41, 59); // Slate-800
                  doc.rect(0, 0, 210, 40, 'F');
                  
                  doc.setTextColor(255, 255, 255);
                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(20);
                  doc.text("BIOBEL COSMETICOS", 15, 18);
                  
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(10);
                  doc.text("Relatorio de Comissao de Colaboradora", 15, 25);
                  doc.text(`Competencia: ${commissionMonth.split('-').reverse().join('/')}`, 15, 30);
                  
                  // Default Company Info
                  doc.text("Gravatai - RS, Rua Anapio Gomes, 1601 - Centro", 130, 18);
                  doc.text("Fone: (51) 3488-2810", 130, 25);
                  
                  // Member Details
                  doc.setTextColor(30, 41, 59);
                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(14);
                  doc.text(`Colaboradora: ${data.member.name.toUpperCase()}`, 15, 55);
                  
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(10);
                  doc.text(`Funcao: ${data.member.role}`, 15, 62);
                  doc.text(`Iniciou em: ${data.member.startDate?.split('-').reverse().join('/') || '-'}`, 15, 67);
                  doc.text(`Telefone: ${data.member.phone || '-'}`, 15, 72);
                  
                  // Goal Progress
                  if (data.goal > 0) {
                    doc.text(`Meta Individual do Mes: ${formatCurrency(data.goal)}`, 130, 62);
                    doc.text(`Realizado: ${formatCurrency(data.totalFaturamento)} (${data.percentGoal.toFixed(1)}%)`, 130, 67);
                  }

                  // Financials Table
                  autoTable(doc, {
                    startY: 85,
                    head: [['Tipo de Faturamento', 'Valor Vendido', '% Comissao', 'Comissao Calculada']],
                    body: [
                      [
                        'Servicos realizados (Lavatorio, Cabine)', 
                        formatCurrency(data.servicesTotal), 
                        `${data.member.commissionService !== undefined ? data.member.commissionService : 30}%`, 
                        formatCurrency(data.servicesCommission)
                      ],
                      [
                        'Produtos de Manutencao (Home-Care)', 
                        formatCurrency(data.productsTotal), 
                        `${data.member.commissionProduct !== undefined ? data.member.commissionProduct : 10}%`, 
                        formatCurrency(data.productsCommission)
                      ],
                      [
                        'TOTAL GERAL', 
                        formatCurrency(data.totalFaturamento), 
                        '-', 
                        formatCurrency(data.totalCommission)
                      ]
                    ],
                    theme: 'striped',
                    headStyles: { fillColor: [15, 118, 110] }, // Teal-700
                    styles: { fontSize: 9, font: 'helvetica' },
                    columnStyles: {
                      1: { halign: 'right' },
                      2: { halign: 'center' },
                      3: { halign: 'right', fontStyle: 'bold' }
                    }
                  });
                  
                  // Signature Section
                  const finalY = (doc as any).lastAutoTable.finalY + 30;
                  doc.setDrawColor(200, 200, 200);
                  doc.line(15, finalY, 90, finalY);
                  doc.line(120, finalY, 195, finalY);
                  
                  doc.setFontSize(9);
                  doc.setTextColor(100, 100, 100);
                  doc.text("Assinatura da Colaboradora", 15, finalY + 5);
                  doc.text("Assinatura da Gerencia", 120, finalY + 5);
                  
                  doc.save(`Comissao_${data.member.name.replace(/\s+/g, '_')}_${commissionMonth}.pdf`);
                  addNotification('Relatório de comissão gerado e pronto para impressão!', 'success');
                } catch (err) {
                  console.error(err);
                  addNotification('Erro ao gerar relatório de comissão.', 'error');
                }
              };

              return (
                <div key={data.member.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-left space-y-4">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">{data.member.name}</h4>
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[8px] font-black uppercase tracking-widest rounded-lg">
                          {data.member.role}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Faturamento individual gerado no mês: {data.salesCount} vendas finalizadas</p>
                    </div>
                    
                    <button
                      onClick={handleGenerateCommissionPDF}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <Printer size={12} />
                      Comprovante de Comissão
                    </button>
                  </div>

                  {/* Goal progress */}
                  {data.goal > 0 && (
                    <div className="space-y-1 bg-slate-50 dark:bg-slate-850/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Meta do Mês: {formatCurrency(data.goal)}</span>
                        <span>{data.percentGoal.toFixed(1)}% Batida</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            data.percentGoal >= 100 ? "bg-emerald-500" : "bg-blue-500"
                          )}
                          style={{ width: `${Math.min(100, data.percentGoal)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Columns breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Services Column */}
                    <div className="p-4 rounded-2xl bg-emerald-50/10 dark:bg-emerald-950/5 border border-emerald-100/50 dark:border-emerald-900/20 space-y-2">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Serviços Executados (Comissão: {data.member.commissionService !== undefined ? data.member.commissionService : 30}%)</p>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-500 uppercase font-bold">Total Serviços:</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-white font-mono">{formatCurrency(data.servicesTotal)}</span>
                      </div>
                      <div className="flex justify-between items-baseline pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 uppercase font-extrabold">Comissão Serviços:</span>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(data.servicesCommission)}</span>
                      </div>
                    </div>

                    {/* Products Column */}
                    <div className="p-4 rounded-2xl bg-blue-50/10 dark:bg-blue-950/5 border border-blue-100/50 dark:border-blue-900/20 space-y-2">
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Produtos de Revenda (Comissão: {data.member.commissionProduct !== undefined ? data.member.commissionProduct : 10}%)</p>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-500 uppercase font-bold">Total Produtos:</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-white font-mono">{formatCurrency(data.productsTotal)}</span>
                      </div>
                      <div className="flex justify-between items-baseline pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 uppercase font-extrabold">Comissão Produtos:</span>
                        <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">{formatCurrency(data.productsCommission)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Totals Footer inside Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-850/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Comissão do Mês</span>
                      <p className="text-[9.5px] text-slate-400 font-medium uppercase mt-0.5">Soma calculada proporcionalmente</p>
                    </div>
                    <div className="text-right">
                      <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(data.totalCommission)}
                      </h4>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const FuncaoRotinaView = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
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
