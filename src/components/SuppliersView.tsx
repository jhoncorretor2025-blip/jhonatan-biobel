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

export const SuppliersView = ({ 
  settings, 
  setSettings, 
  financialAccounts, 
  setFinancialAccounts, 
  brands, 
  addNotification, 
  formatCurrency, 
  formatDate 
}: any) => {
  return (
    <SuppliersAndPurchasesView 
      settings={settings}
      setSettings={setSettings}
      financialAccounts={financialAccounts}
      setFinancialAccounts={setFinancialAccounts}
      brands={brands}
      addNotification={addNotification}
      formatCurrency={formatCurrency}
      formatDate={formatDate}
    />
  );
};

const ConfigLayout = ({ children, activeTab, setActiveTab }: any) => {
  const categories = [
    { id: 'minha_conta', tabId: 'admin_profile', label: 'Minha Conta', subtitle: 'Perfil & Alterar Senha', icon: UserIcon },
    { id: 'equipe_metas', tabId: 'staff', label: 'Equipe & Metas', subtitle: 'Vendedoras & Metas da Loja', icon: Users },
    { id: 'estrutura', tabId: 'config', label: 'Estrutura do Negócio', subtitle: 'Dados, Recibo & Regras', icon: Store },
    { id: 'seguranca', tabId: 'backup', label: 'Segurança & Sistema', subtitle: 'Backup & Importação', icon: Database },
    { id: 'suporte', tabId: 'help', label: 'Suporte', subtitle: 'Ajuda, Tutoriais & Novidades', icon: Zap }
  ];

  const getActiveCategoryId = () => {
    if (activeTab === 'admin_profile') return 'minha_conta';
    if (activeTab === 'staff' || activeTab === 'goals') return 'equipe_metas';
    if (activeTab === 'config') return 'estrutura';
    if (activeTab === 'backup') return 'seguranca';
    if (activeTab === 'help') return 'suporte';
    return 'estrutura';
  };

  const currentCategory = getActiveCategoryId();

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Top Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Settings size={28} className="text-indigo-600 dark:text-indigo-400" />
          Painel de Configurações
        </h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
          Gerencie sua conta, equipe, metas, estrutura física do negócio e parâmetros operacionais.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-[32px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2 lg:sticky lg:top-24">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 mb-3">Categorias de Ajustes</p>
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
            {categories.map((cat) => {
              const isActive = currentCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveTab(cat.tabId);
                  }}
                  className={cn(
                    "flex items-center gap-3.5 px-4 py-3 rounded-2xl text-left transition-all duration-300 min-w-[180px] lg:w-full border cursor-pointer shrink-0",
                    isActive
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-transparent shadow-md font-black"
                      : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 border-slate-100 dark:border-slate-800/40 text-slate-600 dark:text-slate-400"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl transition-colors",
                    isActive 
                      ? "bg-white/15 dark:bg-slate-900/10 text-white dark:text-slate-950" 
                      : "bg-white dark:bg-slate-900 text-slate-500"
                  )}>
                    <cat.icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-tight leading-tight">{cat.label}</p>
                    <p className={cn(
                      "text-[9px] truncate font-medium mt-0.5",
                      isActive ? "text-slate-300 dark:text-slate-500" : "text-slate-400"
                    )}>{cat.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Inner Content Column */}
        <div className="lg:col-span-3 space-y-8 bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
          {['staff', 'goals'].includes(activeTab) && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl max-w-sm mb-6 transition-colors">
              <button 
                onClick={() => setActiveTab('staff')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-2",
                  activeTab === 'staff' 
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <Users size={14} />
                Vendedoras & Comissões
              </button>
              <button 
                onClick={() => setActiveTab('goals')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-2",
                  activeTab === 'goals' 
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <Target size={14} />
                Metas Mensais
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export const NewCustomerForm = ({ newCustomer, setNewCustomer, onCancel, onSave }: any) => (
  <div className="w-full max-w-sm space-y-4">
    <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Novo Cliente</h4>
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo *</label>
        <input 
          type="text" 
          placeholder="Ex: Maria Silva" 
          value={newCustomer.name}
          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-900 dark:text-white text-xs"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp *</label>
        <input 
          type="text" 
          placeholder="(00) 00000-0000" 
          value={newCustomer.phone}
          onChange={(e) => setNewCustomer({ ...newCustomer, phone: formatPhone(e.target.value) })}
          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-900 dark:text-white text-xs"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações (Opcional)</label>
        <textarea 
          placeholder="Notas sobre o cliente..." 
          value={newCustomer.notes}
          onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
          rows={2}
          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium resize-none text-slate-900 dark:text-white text-xs"
        />
      </div>
    </div>
    <div className="flex gap-2">
      <button 
        onClick={onCancel}
        className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
      >
        Cancelar
      </button>
      <button 
        onClick={onSave}
        className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all"
      >
        Salvar
      </button>
    </div>
  </div>
);

const getNfceQrCodeUrl = (sale: any, settings: any) => {
  if (!sale) return '';
  try {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({
      id: sale.id,
      date: sale.date,
      customerName: sale.customerName || 'Consumidor Final',
      total: sale.total,
      discount: sale.discount || 0,
      paymentMethod: sale.paymentMethod,
      items: (sale.items || []).map((it: any) => ({
        name: it.name,
        quantity: it.quantity,
        price: it.price || (it.total / (it.quantity || 1)),
        total: it.total
      })),
      cpfNaNota: sale.cpfNaNota || '',
      settingsName: settings?.name || 'BIOBEL COSMÉTICOS',
      settingsCnpj: settings?.cnpj || '42.123.456/0001-89',
      settingsAddress: settings?.address || 'Av. das Indústrias, 1234 - Porto Alegre - RS'
    }))));
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    return `${origin}${path}?p=${payload}`;
  } catch (e) {
    console.error("Error creating QR payload", e);
    return `https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?chNFe=43260642123456000189650010000541231018765432`;
  }
};

export const SefazMockPortal = ({ data }: { data: any }) => {
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'details'>('items');

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-12">
      {/* SEFAZ Top Navigation */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        {/* RS Flag Color Strip */}
        <div className="h-1.5 w-full flex">
          <div className="bg-emerald-600 flex-1" />
          <div className="bg-yellow-500 flex-1" />
          <div className="bg-red-600 flex-1" />
        </div>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 font-black text-slate-700 text-xs tracking-tight text-center leading-none uppercase">
              RS
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none mb-0.5">Receita Estadual</h1>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Secretaria da Fazenda do Rio Grande do Sul</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" /> Servidor Online
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        {/* Status Box */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm shadow-emerald-50 text-center space-y-3">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
            <CheckCircle2 size={28} />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-950 uppercase tracking-tight">Consulta de NFC-e Autorizada</h2>
            <p className="text-xs text-slate-500 font-semibold">Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</p>
          </div>
          <div className="inline-flex gap-4 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-600 uppercase">
            <span>Ambiente: <strong className="text-slate-900">1 - Produção</strong></span>
            <span>Versão QR: <strong className="text-slate-900">2.00</strong></span>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Emitente (Store) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <Store size={18} className="text-blue-600" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Identificação do Emitente</h3>
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Razão Social / Nome</p>
                <p className="font-black text-slate-900 uppercase">{data.settingsName}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">CNPJ</p>
                  <p className="font-bold text-slate-800">{data.settingsCnpj}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Inscrição Estadual</p>
                  <p className="font-bold text-slate-800">123/4567890</p>
                </div>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Endereço</p>
                <p className="font-semibold text-slate-700 leading-normal uppercase">{data.settingsAddress}</p>
              </div>
            </div>
          </div>

          {/* Destinatário (Customer) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <UserIcon size={18} className="text-blue-600" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Identificação do Destinatário</h3>
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Nome / Razão Social</p>
                <p className="font-black text-slate-900 uppercase">{data.customerName || 'Consumidor Final'}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">CPF / CNPJ</p>
                <p className="font-bold text-slate-800">{data.cpfNaNota || 'Não identificado (Consumidor Final)'}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Destino da Operação</p>
                <p className="font-semibold text-slate-700 uppercase">1 - Operação Interna (RS)</p>
              </div>
            </div>
          </div>
        </div>

        {/* NFC-e Metadata Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <FileText size={18} className="text-blue-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Informações Gerais da Chave de Acesso</h3>
          </div>
          <div className="space-y-4 text-xs">
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Chave de Acesso Oficial (SEFAZ)</p>
              <p className="font-mono font-black text-[11px] tracking-widest text-slate-900 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center select-all whitespace-normal break-all">
                4326 0642 1234 5600 0189 6500 1000 0541 2310 1876 5432
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Número</p>
                <p className="font-bold text-slate-800 text-sm">54123</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Série</p>
                <p className="font-bold text-slate-800 text-sm">1</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Processo</p>
                <p className="font-bold text-slate-800 text-sm uppercase">Contingência</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tipo Emissão</p>
                <p className="font-bold text-slate-800 text-sm uppercase">Normal</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Data e Hora de Emissão</p>
                <p className="font-bold text-slate-800">{new Date(data.date).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Protocolo de Autorização</p>
                <p className="font-bold text-slate-800">143260023456123 - {new Date(data.date).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection for Items vs Totals */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveSubTab('items')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
              activeSubTab === 'items'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Produtos / Serviços ({data.items?.length || 0})
          </button>
          <button
            onClick={() => setActiveSubTab('details')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
              activeSubTab === 'details'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Totais / Tributos
          </button>
        </div>

        {/* Tab Content: Items Table */}
        {activeSubTab === 'items' && (
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4 text-center">Quant.</th>
                    <th className="px-6 py-4 text-right">Valor Unit.</th>
                    <th className="px-6 py-4 text-right">Total Bruto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items?.map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 uppercase leading-snug">{item.name}</p>
                        <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">CÓD: {100000 + index}</p>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-800">{item.quantity}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-600">{formatCurrency(item.price || (item.total / item.quantity))}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Totals & Tax Details */}
        {activeSubTab === 'details' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-xs pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Valor Total Bruto dos Itens:</span>
                <span className="font-bold text-slate-800">{formatCurrency(data.total + data.discount)}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between text-xs pb-3 border-b border-slate-100">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Total de Descontos:</span>
                  <span className="font-bold text-rose-600">- {formatCurrency(data.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 pb-2">
                <span className="text-slate-900 font-black uppercase tracking-widest text-xs">VALOR TOTAL DA NOTA (R$):</span>
                <span className="font-black text-slate-950 text-base">{formatCurrency(data.total)}</span>
              </div>
              <div className="flex justify-between text-xs pt-3 border-t border-slate-100">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Forma de Pagamento Principal:</span>
                <span className="font-black text-slate-900 uppercase">{data.paymentMethod}</span>
              </div>
            </div>

            {/* Taxes and Tributos simulated detail box */}
            <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-yellow-600 animate-pulse" />
                <h4 className="text-[10px] font-black text-yellow-800 uppercase tracking-widest">Informação de Tributos Federais e Estaduais</h4>
              </div>
              <p className="text-[10.5px] text-yellow-700 leading-relaxed font-semibold">
                Tributos Totais Incidentes (Lei Federal 12.741/2012): <strong className="font-black">{formatCurrency(data.total * 0.1345)}</strong> (13,45% de carga aproximada de impostos federais e estaduais sobre esta operação de venda).
              </p>
            </div>
          </div>
        )}

        {/* Back and Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={() => window.print()}
            className="flex-1 py-4.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[11px] tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 cursor-pointer"
          >
            <Printer size={16} /> Imprimir Nota Auxiliar
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = window.location.origin;
              }
            }}
            className="py-4.5 px-6 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-2xl font-black uppercase text-[11px] tracking-wider transition-all flex items-center justify-center gap-2 border border-slate-300 cursor-pointer"
          >
            Acessar o Painel BIOBEL
          </button>
        </div>

        {/* Government Footer */}
        <footer className="text-center space-y-2 pt-6 border-t border-slate-250 text-[10px] text-slate-400 font-semibold leading-relaxed">
          <p className="uppercase font-black tracking-wider text-slate-500">Secretaria da Fazenda do Estado do Rio Grande do Sul</p>
          <p className="max-w-xl mx-auto">
            Este é um ambiente de consulta de via auxiliar de NFC-e autorizada em contingência e simulação fiscal integrada ao sistema local de Ponto de Venda (PDV).
          </p>
        </footer>
      </main>
    </div>
  );
};
