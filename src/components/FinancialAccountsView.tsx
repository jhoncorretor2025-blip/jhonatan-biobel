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

export const FinancialAccountsView = ({ 
  financialAccounts, 
  setFinancialAccounts, 
  formatCurrency, 
  addNotification, 
  settings, 
  formatDate 
}: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'payable' | 'receivable'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newAccount, setNewAccount] = useState({
    type: 'payable',
    category: 'Boleto de Fornecedor',
    description: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'pending',
    supplierId: ''
  });

  const categories = ['Boleto de Fornecedor', 'Energia', 'Água', 'Internet', 'Impostos', 'Marketing', 'Aluguel', 'Salários', 'Outros'];

  const handleAddAccount = () => {
    if (!newAccount.description || !newAccount.amount || !newAccount.dueDate) {
      addNotification('Por favor, preencha os campos obrigatórios!', 'warning');
      return;
    }

    const account: FinancialAccount = {
      id: 'fa_' + Math.random().toString(36).substr(2, 9),
      type: newAccount.type as 'payable' | 'receivable',
      category: newAccount.category,
      description: newAccount.description,
      amount: Number(newAccount.amount),
      dueDate: newAccount.dueDate,
      status: newAccount.status as 'paid' | 'pending',
      paymentDate: newAccount.status === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
      supplierId: newAccount.supplierId || undefined
    };

    setFinancialAccounts([...financialAccounts, account]);
    addNotification('Conta cadastrada com sucesso!', 'success');
    setIsModalOpen(false);
    setNewAccount({
      type: 'payable',
      category: 'Boleto de Fornecedor',
      description: '',
      amount: '',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      supplierId: ''
    });
  };

  const toggleStatus = (id: string) => {
    const account = financialAccounts.find((a: any) => a.id === id);
    if (!account) return;

    const updated = {
      ...account,
      status: account.status === 'paid' ? 'pending' : 'paid',
      paymentDate: account.status === 'paid' ? undefined : new Date().toISOString().split('T')[0]
    };

    setFinancialAccounts(financialAccounts.map((a: any) => a.id === id ? updated : a));
    addNotification(updated.status === 'paid' ? 'Conta marcada como liquidada!' : 'Conta marcada como pendente!', 'info');
  };

  const removeAccount = (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta?')) return;
    setFinancialAccounts(financialAccounts.filter((a: any) => a.id !== id));
    addNotification('Conta excluída.', 'info');
  };

  // Filter accounts
  const filteredAccounts = financialAccounts.filter((acc: any) => {
    const matchesType = filterType === 'all' || acc.type === filterType;
    const matchesStatus = filterStatus === 'all' || acc.status === filterStatus;
    const matchesSearch = acc.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          acc.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  // Calculate Metrics
  const totalPayablePending = financialAccounts
    .filter((a: any) => a.type === 'payable' && a.status === 'pending')
    .reduce((sum: number, a: any) => sum + a.amount, 0);

  const totalReceivablePending = financialAccounts
    .filter((a: any) => a.type === 'receivable' && a.status === 'pending')
    .reduce((sum: number, a: any) => sum + a.amount, 0);

  const totalPaidMonth = financialAccounts
    .filter((a: any) => a.status === 'paid')
    .reduce((sum: number, a: any) => sum + a.amount, 0);

  return (
    <div className="space-y-6" id="financial-accounts-container">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Contas a Pagar & Receber</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lançamentos de contas variáveis e recorrentes</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
          id="btn-add-account"
        >
          <Plus size={16} /> Novo Lançamento
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="financial-metrics">
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl">
            <ArrowDownRight size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contas a Pagar (Aberto)</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(totalPayablePending)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contas a Receber (Aberto)</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(totalReceivablePending)}</h3>
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex items-center gap-4">
          <div className="p-4 bg-white/10 text-white rounded-2xl">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Liquidado (Pago/Recebido)</p>
            <h3 className="text-2xl font-black">{formatCurrency(totalPaidMonth)}</h3>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4" id="financial-filters-box">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                filterType === 'all' ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              )}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('payable')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                filterType === 'payable' ? "bg-rose-500 text-white" : "bg-rose-50 text-rose-600 hover:bg-rose-100/50"
              )}
            >
              <ArrowDownRight size={14} /> Contas a Pagar
            </button>
            <button
              onClick={() => setFilterType('receivable')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                filterType === 'receivable' ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100/50"
              )}
            >
              <ArrowUpRight size={14} /> Contas a Receber
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                filterStatus === 'all' ? "bg-slate-200 text-slate-800" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Todos Status
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                filterStatus === 'pending' ? "bg-amber-100 text-amber-800" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Pendentes
            </button>
            <button
              onClick={() => setFilterStatus('paid')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                filterStatus === 'paid' ? "bg-emerald-100 text-emerald-800" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Pagas/Recebidas
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição, fornecedor ou categoria..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          />
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
        </div>
      </div>

      {/* Main Ledger List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6" id="accounts-ledger-list">
        {filteredAccounts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-bold uppercase text-xs tracking-wider">
            Nenhuma conta encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAccounts.map((account: any) => {
              const isPayable = account.type === 'payable';
              const isPaid = account.status === 'paid';
              return (
                <div 
                  key={account.id} 
                  className={cn(
                    "flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all group gap-4",
                    isPaid ? "bg-slate-50 border-slate-100 opacity-75" : "bg-white border-slate-100 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Status Toggle Button */}
                    <button 
                      onClick={() => toggleStatus(account.id)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-sm shrink-0",
                        isPaid 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : isPayable 
                            ? "border-rose-300 hover:bg-rose-50" 
                            : "border-emerald-300 hover:bg-emerald-50"
                      )}
                    >
                      {isPaid ? <CheckCircle size={18} /> : <Clock size={16} className="text-slate-400" />}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 uppercase text-xs tracking-wide">
                          {account.description}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                          isPayable ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {isPayable ? "A Pagar" : "A Receber"}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold uppercase">
                          {account.category}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span>Vence em: {formatDate(account.dueDate)}</span>
                        {isPaid && account.paymentDate && (
                          <span className="text-emerald-600">Pago em: {formatDate(account.paymentDate)}</span>
                        )}
                        {account.supplierId && (
                          <span className="text-blue-500">
                            Fornecedor: {settings.officialProviders?.find((p: any) => p.id === account.supplierId)?.name || 'Desconhecido'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6">
                    <span className={cn(
                      "text-base font-black tracking-tight",
                      isPaid ? "text-slate-400 line-through" : isPayable ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {isPayable ? "-" : "+"} {formatCurrency(account.amount)}
                    </span>
                    <button 
                      onClick={() => removeAccount(account.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Novo Lançamento Financeiro</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>

              <div className="p-6 space-y-4">
                {/* Type Selection Tabs */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setNewAccount({ ...newAccount, type: 'payable' })}
                    className={cn(
                      "py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                      newAccount.type === 'payable' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    A Pagar (Saída)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAccount({ ...newAccount, type: 'receivable' })}
                    className={cn(
                      "py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                      newAccount.type === 'receivable' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    A Receber (Entrada)
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição *</label>
                  <input 
                    type="text" 
                    value={newAccount.description}
                    onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                    placeholder="Ex: Boleto Fornecedor de Esmaltes"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
                    <select
                      value={newAccount.category}
                      onChange={(e) => setNewAccount({ ...newAccount, category: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor (R$) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={newAccount.amount}
                      onChange={(e) => setNewAccount({ ...newAccount, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento *</label>
                    <input 
                      type="date" 
                      value={newAccount.dueDate}
                      onChange={(e) => setNewAccount({ ...newAccount, dueDate: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Inicial</label>
                    <select
                      value={newAccount.status}
                      onChange={(e) => setNewAccount({ ...newAccount, status: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                    >
                      <option value="pending">Pendente (Em aberto)</option>
                      <option value="paid">Confirmado (Pago/Recebido)</option>
                    </select>
                  </div>
                </div>

                {newAccount.type === 'payable' && settings.officialProviders && settings.officialProviders.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vincular Fornecedor</label>
                    <select
                      value={newAccount.supplierId}
                      onChange={(e) => setNewAccount({ ...newAccount, supplierId: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                    >
                      <option value="">Nenhum fornecedor vinculado</option>
                      {settings.officialProviders.map((provider: any) => (
                        <option key={provider.id} value={provider.id}>{provider.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleAddAccount}
                  className="flex-1 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] transition-all"
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
