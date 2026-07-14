import { 
    cn, formatCurrency, getWhatsAppUrl, cleanData, normalizeVendedoraName, getSafeDate, getSaleLocalHours, formatDate, getLocalISOString, isSameLocalDay, formatDateWithDayOfWeek, formatPhone, APP_VERSION, formatCpfCnpj 
  } from '../utils';;
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

export const CustomersView = ({ 
  customers, 
  setCustomers, 
  sales, 
  products,
  campaigns, 
  addNotification, 
  handleFirestoreError, 
  user, 
  formatDate, 
  formatCurrency,
  setSelectedCustomer,
  setActiveTab,
  ensureAuthSession
}: CustomersViewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS' | 'VIPS'>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCustomerForView, setSelectedCustomerForView] = useState<Customer | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'timeline'>('info');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [crmViewMode, setCrmViewMode] = useState<'pipeline' | 'tabela'>('pipeline');
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => setIsFiltering(false), 250);
    return () => clearTimeout(timer);
  }, [searchTerm, filter, crmViewMode]);
  
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppModalCustomer, setWhatsAppModalCustomer] = useState<Customer | null>(null);
  const [whatsAppMessageText, setWhatsAppMessageText] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [editingNoteCustomerId, setEditingNoteCustomerId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');

  const DEFAULT_TEMPLATES = {
    novo: "Olá {nome}, seja muito bem-vinda à Biobel! 🌸 É um prazer ter você conosco. Se precisar de qualquer atendimento ou produto, conte com a gente!",
    negociacao: "Oi {nome}! Tudo bem? Passando para saber se ficou alguma dúvida sobre as opções que conversamos. Estamos prontas para agendar seu momento! 💖",
    pos_venda: "Olá {nome}! Tudo bem? Esperamos que tenha amado seu último procedimento ou produto Biobel. Como está se sentindo? Seu feedback é muito importante! ✨",
    fidelizado: "Olá nossa cliente VIP {nome}! 💎 Preparamos mimos e novidades exclusivas para você esta semana. Venha nos visitar para um café e um momento especial!",
    resgatar: "Oi {nome}, sentimos sua falta por aqui! 😔 Preparamos um presente especial para sua próxima visita. Que tal agendarmos um horário esta semana? 🌸",
  };

  const [messageTemplates, setMessageTemplates] = useState<{ [key: string]: string }>(() => {
    const saved = localStorage.getItem('biobel_crm_message_templates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_TEMPLATES;
  });

  const saveMessageTemplates = (newTemplates: { [key: string]: string }) => {
    setMessageTemplates(newTemplates);
    localStorage.setItem('biobel_crm_message_templates', JSON.stringify(newTemplates));
  };

  const handleOpenWhatsAppModal = (customer: Customer) => {
    setWhatsAppModalCustomer(customer);
    const stageId = customer.crmStatus || 'novo';
    const templateText = messageTemplates[stageId] || messageTemplates['novo'] || '';
    const prefilled = templateText.replace(/{nome}/g, customer.name);
    setWhatsAppMessageText(prefilled);
    setSelectedTemplateId(stageId);
    setIsWhatsAppModalOpen(true);
  };

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    address: '',
    email: '',
    cpf: '',
    birthDate: '',
    notes: '',
    tags: [] as string[],
    crmStatus: 'novo' as 'novo' | 'negociacao' | 'pos_venda' | 'fidelizado' | 'resgatar'
  });

  const CRM_STAGES = [
    { id: 'novo', name: 'Leads / Novos', color: 'bg-blue-500', text: 'text-blue-500' },
    { id: 'negociacao', name: 'Em Negociação', color: 'bg-amber-500', text: 'text-amber-500' },
    { id: 'pos_venda', name: 'Pós-Venda', color: 'bg-indigo-500', text: 'text-indigo-500' },
    { id: 'fidelizado', name: 'Fidelizados VIP', color: 'bg-emerald-500', text: 'text-emerald-500' },
    { id: 'resgatar', name: 'Recuperar / Inativo', color: 'bg-rose-500', text: 'text-rose-500' }
  ] as const;

  const CRM_STAGES_LIST = ['novo', 'negociacao', 'pos_venda', 'fidelizado', 'resgatar'] as const;

  const handleMoveCRM = async (customer: Customer, direction: 'left' | 'right') => {
    const currentIdx = CRM_STAGES_LIST.indexOf(customer.crmStatus || 'novo');
    let nextIdx = currentIdx;
    if (direction === 'left' && currentIdx > 0) nextIdx--;
    if (direction === 'right' && currentIdx < CRM_STAGES_LIST.length - 1) nextIdx++;
    
    if (nextIdx === currentIdx) return;
    
    const updated: Customer = {
      ...customer,
      crmStatus: CRM_STAGES_LIST[nextIdx]
    };
    
    try {
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
      addNotification(`CRM: Fase de ${customer.name} alterada!`, 'success');
    } catch (e) {
      addNotification('Erro ao mover cliente no CRM.', 'error');
    }
  };

  // Helper to get customer stats
  const getCustomerStats = (customerId: string) => {
    const customerSales = sales.filter(s => s.customerId === customerId && s.status === 'completed');
    const totalSpent = customerSales.reduce((acc, s) => acc + s.total, 0);
    const ticketMedioValue = customerSales.length > 0 ? totalSpent / customerSales.length : 0;
    
    const productFrequency: { [key: string]: { name: string, count: number } } = {};
    customerSales.forEach(s => {
      s.items.forEach(item => {
        if (!productFrequency[item.productId]) {
          productFrequency[item.productId] = { name: item.name, count: 0 };
        }
        productFrequency[item.productId].count += item.quantity;
      });
    });

    const preferredProductsValue = Object.values(productFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    const totalProfit = customerSales.reduce((acc, s) => {
      const saleCost = s.items.reduce((saleAcc, item) => {
        const product = products.find(p => p.id === item.productId);
        return saleAcc + ((product?.cost || 0) * item.quantity);
      }, 0);
      return acc + (s.total - saleCost);
    }, 0);

    const lastSale = customerSales.length > 0 
      ? new Date(Math.max(...customerSales.map(s => new Date(s.date).getTime())))
      : null;
    
    return { totalSpent, totalProfit, lastSale, ticketMedioValue, preferredProductsValue };
  };

  // Global Stats
  const totalProfitCRM = sales.reduce((acc, s) => acc + (s.commission || 0), 0);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const inactiveCount = customers.filter(c => {
    const { lastSale } = getCustomerStats(c.id);
    return !lastSale || lastSale < thirtyDaysAgo;
  }).length;

  const averageTicket = sales.length > 0 
    ? sales.reduce((acc, s) => acc + s.total, 0) / sales.length 
    : 0;

  const getCustomerTierBadge = (totalSpent: number) => {
    if (totalSpent >= 2000) return { label: 'OURO', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30', icon: <Trophy size={10} /> };
    if (totalSpent >= 800) return { label: 'PRATA', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/20', icon: <Star size={10} /> };
    return { label: 'BRONZE', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: <Target size={10} /> };
  };

  const filteredCustomers = customers.filter(c => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(search) || 
                         c.phone.includes(search) ||
                         (c.email && c.email.toLowerCase().includes(search));
    if (!matchesSearch) return false;

    const { lastSale, totalSpent } = getCustomerStats(c.id);
    const isActive = lastSale && lastSale >= thirtyDaysAgo;

    if (filter === 'ATIVOS') return isActive;
    if (filter === 'INATIVOS') return !isActive;
    if (filter === 'VIPS') return totalSpent >= 800; // PRATA or higher
    return true;
  });

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        city: customer.city || '',
        address: customer.address || '',
        email: customer.email || '',
        cpf: customer.cpf || '',
        birthDate: customer.birthDate || '',
        notes: customer.notes || '',
        tags: customer.tags || [],
        crmStatus: customer.crmStatus || 'novo'
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', city: '', address: '', email: '', cpf: '', birthDate: '', notes: '', tags: [], crmStatus: 'novo' });
    }
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (customer: Customer) => {
    setSelectedCustomerForView(customer);
    setIsViewModalOpen(true);
  };

  const handleQuickSale = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveTab('atendimento');
    addNotification(`Iniciando atendimento para ${customer.name}`, 'info');
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      addNotification('Nome e telefone são obrigatórios.', 'warning');
      return;
    }

    // Auto format before counting
    const formatted = formatPhone(formData.phone);
    const phoneDigits = formatted.replace(/\D/g, '');
    
    if (phoneDigits.length < 10) {
      addNotification('Telefone inválido. Insira pelo menos 10 dígitos.', 'warning');
      return;
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      addNotification('E-mail inválido. Verifique o formato.', 'warning');
      return;
    }

    const customerData: Customer = {
      id: editingCustomer?.id || `C${Date.now()}`,
      ...formData,
      createdAt: editingCustomer?.createdAt || new Date().toISOString()
    };

    try {
      if (editingCustomer) {
        setCustomers(prev => prev.map(c => c.id === customerData.id ? customerData : c));
      } else {
        setCustomers(prev => [...prev, customerData]);
      }
      setIsModalOpen(false);
      addNotification(editingCustomer ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'success');
    } catch (error: any) {
      addNotification('Erro ao salvar cliente.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      setCustomers(prev => prev.filter(c => c.id !== id));
      addNotification('Cliente excluído.', 'info');
    } catch (error: any) {
      addNotification('Erro ao excluir cliente.', 'error');
    }
  };

  const sendWhatsAppCampaign = (customer: Customer, campaign: Campaign) => {
    const message = campaign.message.replace('{nome}', customer.name);
    const url = getWhatsAppUrl(customer.phone, message);
    window.open(url, '_blank');
    setIsCampaignModalOpen(false);
  };

  const handleExportCustomersCSV = () => {
    const headers = ['ID', 'Nome', 'Telefone', 'Cidade', 'Endereco', 'Email', 'Total Gasto (R$)', 'Ultima Compra', 'Criado Em'];
    const rows = customers.map(c => {
      const stats = getCustomerStats(c.id);
      const lastSaleDate = stats.lastSale ? stats.lastSale.toISOString().split('T')[0] : 'Nunca';
      const totalSpent = stats.totalSpent.toFixed(2);
      
      return [
        c.id,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.city || '').replace(/"/g, '""')}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        totalSpent,
        lastSaleDate,
        c.createdAt ? c.createdAt.split('T')[0] : ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_biobel_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    addNotification('Base de clientes exportada para CSV!', 'success');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Gestão de Clientes (CRM)</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acompanhe o comportamento e fidelize seus clientes.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleExportCustomersCSV}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-3xl font-black uppercase text-xs tracking-widest transition-all"
          >
            <FileSpreadsheet size={18} />
            Exportar CSV
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
          >
            <Plus size={20} />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Clientes</p>
          <h4 className="text-3xl font-black text-slate-900 dark:text-white">{customers.length}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Lucro Total (CRM)</p>
          <h4 className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(totalProfitCRM)}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Inativos (+30D)</p>
          <h4 className="text-3xl font-black text-slate-900 dark:text-white">{inactiveCount}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Ticket Médio Geral</p>
          <h4 className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(averageTicket)}</h4>
        </div>
      </div>

      {/* CRM Actions & Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
            <Zap size={20} className="text-amber-500" />
            Sugestões de Ativação
          </h3>
          <div className="space-y-4">
            {customers
              .filter(c => {
                const { lastSale } = getCustomerStats(c.id);
                return !lastSale || lastSale < thirtyDaysAgo;
              })
              .slice(0, 5)
              .map(customer => {
                const { lastSale } = getCustomerStats(customer.id);
                const daysInactive = lastSale ? Math.floor((new Date().getTime() - new Date(lastSale).getTime()) / (1000 * 60 * 60 * 24)) : 'N/A';
                return (
                  <div key={customer.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 group hover:border-amber-200 transition-all">
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{customer.name}</p>
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{daysInactive} dias sem comprar</p>
                    </div>
                    <button 
                      onClick={() => {
                        const msg = `Olá ${customer.name}, sentimos sua falta aqui na Biobel! Preparamos um cupom especial de 10% para sua próxima visita: BIOBEL10. Esperamos você!`;
                        window.open(getWhatsAppUrl(customer.phone, msg), '_blank');
                      }}
                      className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl hover:bg-emerald-100 transition-all"
                      title="Enviar Oferta Recuperação"
                    >
                      <MessageCircle size={18} />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
            <Sparkles size={20} className="text-blue-500" />
            Aniversariantes do Mês
          </h3>
          <div className="space-y-4">
            {customers
              .filter(c => {
                   if (!c.birthDate) return false;
                   const birthMonth = new Date(c.birthDate).getMonth();
                   const currentMonth = new Date().getMonth();
                   return birthMonth === currentMonth;
              })
              .map(customer => (
                <div key={customer.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{customer.name}</p>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Aniversário em {new Date(customer.birthDate!).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                  </div>
                  <button 
                    onClick={() => {
                      const msg = `Parabéns ${customer.name}! 🎉 A Biobel deseja um feliz aniversário! Passe aqui para retirar um presente especial que preparamos para você hoje.`;
                      window.open(getWhatsAppUrl(customer.phone, msg), '_blank');
                    }}
                    className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-100 transition-all"
                  >
                    <Gift size={18} />
                  </button>
                </div>
              ))}
            {customers.filter(c => c.birthDate && new Date(c.birthDate).getMonth() === new Date().getMonth()).length === 0 && (
                <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-8 italic">Nenhum aniversariante este mês</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Filters & Search */}
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou telefone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm transition-all text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* View Switcher */}
            <div className="flex bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setCrmViewMode('pipeline')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  crmViewMode === 'pipeline' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                📊 Funil CRM
              </button>
              <button
                onClick={() => setCrmViewMode('tabela')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  crmViewMode === 'tabela' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                📋 Tabela
              </button>
            </div>

            {/* Filtering */}
            <div className="flex bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              {(['TODOS', 'ATIVOS', 'INATIVOS', 'VIPS'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === f 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isFiltering ? (
          <div className="p-8 space-y-6">
            <div className="flex gap-4 items-center mb-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-1/4 animate-pulse" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-1/2 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-150 dark:border-slate-800/60 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2 animate-pulse" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-8 animate-pulse" />
                  </div>
                  <div className="h-20 bg-slate-150 dark:bg-slate-800 rounded-2xl animate-pulse" />
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-xl w-3/4 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : crmViewMode === 'pipeline' ? (
          <div className="p-8 overflow-x-auto scrollbar-hide">
            <div className="flex gap-6 min-w-[1000px] align-stretch pb-4">
              {CRM_STAGES.map((stage) => {
                const stageCustomers = filteredCustomers.filter(c => (c.crmStatus || 'novo') === stage.id);
                return (
                  <div key={stage.id} className="flex-1 min-w-[220px] flex flex-col bg-slate-50/50 dark:bg-slate-800/20 rounded-[32px] p-5 border border-slate-100/60 dark:border-slate-800/40 min-h-[500px]">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                        <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{stage.name}</span>
                      </div>
                      <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                        {stageCustomers.length}
                      </span>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[560px] scrollbar-hide pr-0.5">
                      {stageCustomers.map((c) => {
                        const stats = getCustomerStats(c.id);
                        
                        // Calculate days since last purchase
                        const lastSaleDate = stats.lastSale;
                        let daysText = '';
                        let dotColor = 'bg-slate-400';

                        if (lastSaleDate) {
                          const days = Math.floor((new Date().getTime() - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24));
                          if (days <= 7) {
                            daysText = `Atendido há ${days} ${days === 1 ? 'dia' : 'dias'}`;
                            dotColor = 'bg-emerald-500';
                          } else if (days <= 30) {
                            daysText = `Atendido há ${days} dias`;
                            dotColor = 'bg-blue-500';
                          } else {
                            daysText = `${days} dias sem comprar`;
                            dotColor = 'bg-rose-500';
                          }
                        } else {
                          const daysReg = Math.floor((new Date().getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                          daysText = `Novo • Cadastrado há ${daysReg}d`;
                          dotColor = 'bg-amber-500';
                        }

                        return (
                          <div 
                            key={c.id} 
                            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all space-y-3 cursor-default group animate-in fade-in zoom-in-95 duration-200"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex items-center gap-2 truncate">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white flex items-center justify-center font-black text-xs uppercase shrink-0">
                                  {c.name.charAt(0)}
                                </div>
                                <div className="truncate text-left">
                                  <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase truncate group-hover:text-blue-600 transition-colors">
                                    {c.name}
                                  </h5>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatPhone(c.phone)}</p>
                                  
                                  {/* Days Since Last Contact Badge */}
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
                                    <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter truncate">{daysText}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Interaction Notes (Quick Edit Inline) */}
                            {editingNoteCustomerId === c.id ? (
                              <div className="space-y-1 p-2 bg-slate-50 dark:bg-slate-850 rounded-xl border border-blue-200 dark:border-blue-900 text-left">
                                <span className="font-black text-blue-500 uppercase text-[7.5px] tracking-wider block">Editar Observação:</span>
                                <textarea
                                  value={tempNoteText}
                                  onChange={(e) => setTempNoteText(e.target.value)}
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-[10px] text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                                  rows={2}
                                  placeholder="Ex: Aguardando resposta, Gosta de esmalte vermelho..."
                                  autoFocus
                                />
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => setEditingNoteCustomerId(null)}
                                    className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-[8px] font-black uppercase rounded"
                                  >
                                    Canc
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const updated = { ...c, notes: tempNoteText };
                                      setCustomers(prev => prev.map(item => item.id === c.id ? updated : item));
                                      setEditingNoteCustomerId(null);
                                      addNotification('Nota atualizada!', 'success');
                                    }}
                                    className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[8px] font-black uppercase rounded"
                                  >
                                    Salvar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="bg-slate-50 dark:bg-slate-855 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-600 dark:text-slate-300 font-medium group/note relative cursor-pointer hover:border-blue-200 dark:hover:border-blue-800 text-left"
                                onClick={() => {
                                  setEditingNoteCustomerId(c.id);
                                  setTempNoteText(c.notes || '');
                                }}
                                title="Clique para editar observação rápida"
                              >
                                <span className="font-black text-slate-400 uppercase text-[7.5px] tracking-wider flex justify-between items-center mb-0.5">
                                  <span>Histórico / Notas:</span>
                                  <span className="text-blue-500 opacity-0 group-hover/note:opacity-100 transition-opacity text-[7.5px] font-black uppercase">Editar</span>
                                </span>
                                <p className="line-clamp-2 text-[9.5px] leading-snug">
                                  {c.notes || <span className="text-slate-400 italic">Clique para anotar histórico...</span>}
                                </p>
                              </div>
                            )}

                            <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1 font-bold">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Total Gasto:</span>
                                <span className="font-extrabold text-slate-800 dark:text-white">{formatCurrency(stats.totalSpent)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-medium">Última Compra:</span>
                                <span className="font-extrabold text-slate-850 dark:text-white">
                                  {stats.lastSale 
                                    ? stats.lastSale.toLocaleDateString('pt-BR')
                                    : 'Nunca'}
                                </span>
                              </div>
                            </div>

                            {/* Mini Action footer bar */}
                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800">
                              {/* Left Arrow */}
                              <button
                                disabled={stage.id === 'novo'}
                                onClick={() => handleMoveCRM(c, 'left')}
                                className={cn(
                                  "p-1 rounded-lg border text-slate-400",
                                  stage.id === 'novo' 
                                    ? "opacity-30 cursor-not-allowed border-transparent" 
                                    : "border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white"
                                )}
                                title="Recuar fase"
                              >
                                <ChevronLeft size={12} />
                              </button>

                              {/* Details button */}
                              <div className="flex gap-1 items-center">
                                <button
                                  onClick={() => handleOpenViewModal(c)}
                                  className="px-2 py-1 text-[9px] font-black uppercase text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg"
                                >
                                  Ver
                                </button>
                                <button
                                  onClick={() => handleOpenModal(c)}
                                  className="px-2 py-1 text-[9px] font-black uppercase text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                                >
                                  Edt
                                </button>
                              </div>

                              {/* Right Arrow */}
                              <button
                                disabled={stage.id === 'resgatar'}
                                onClick={() => handleMoveCRM(c, 'right')}
                                className={cn(
                                  "p-1 rounded-lg border text-slate-400",
                                  stage.id === 'resgatar' 
                                    ? "opacity-30 cursor-not-allowed border-transparent" 
                                    : "border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white"
                                )}
                                title="Avançar fase"
                              >
                                <ChevronRight size={12} />
                              </button>
                            </div>

                            {/* Green WhatsApp Shortcut Button */}
                            <button
                              onClick={() => handleOpenWhatsAppModal(c)}
                              className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md"
                              title="Iniciar conversa com mensagens prontas"
                            >
                              <MessageCircle size={14} />
                              Atalho WhatsApp
                            </button>
                          </div>
                        );
                      })}

                      {stageCustomers.length === 0 && (
                        <div className="py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800/60 rounded-2xl flex flex-col items-center justify-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic">Sem Clientes</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto hidden lg:block">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-6">Cliente</th>
                <th className="px-8 py-6">Contato & Local</th>
                <th className="px-8 py-6">Financeiro</th>
                <th className="px-8 py-6">Última Compra</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredCustomers.map((customer) => {
                const { totalSpent, totalProfit, lastSale } = getCustomerStats(customer.id);
                const isActive = lastSale && lastSale >= thirtyDaysAgo;
                const isVIP = totalSpent > 1000;

                return (
                  <tr key={customer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black uppercase text-lg">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight">{customer.name}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Desde {formatDate(customer.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate max-w-[200px]">{customer.phone}</p>
                      {customer.email && <p className="text-[9px] font-bold text-blue-500 uppercase truncate max-w-[200px]">{customer.email}</p>}
                      {customer.address && <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{customer.address}, {customer.city}</p>}
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-black text-slate-900 dark:text-white text-sm">{formatCurrency(totalSpent)}</p>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Lucro: {formatCurrency(totalProfit)}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        {lastSale ? lastSale.toLocaleDateString('pt-BR') : 'Nunca comprou'}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      {(() => {
                        const tier = getCustomerTierBadge(totalSpent);
                        return (
                          <div className="flex flex-col gap-1">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-fit",
                              tier.bg, tier.color, "border border-current opacity-80"
                            )}>
                              {tier.icon}
                              {tier.label}
                            </span>
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit",
                              isActive ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50' : 
                              'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            )}>
                              {isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleOpenModal(customer)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleOpenViewModal(customer)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                          title="Ver Detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleQuickSale(customer)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all"
                          title="Venda Rápida"
                        >
                          <Zap size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            window.open(getWhatsAppUrl(customer.phone), '_blank');
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                          title="WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Customers Cards */}
        <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredCustomers.map((customer) => {
            const { totalSpent, totalProfit, lastSale } = getCustomerStats(customer.id);
            const isActive = lastSale && lastSale >= thirtyDaysAgo;
            const isVIP = totalSpent > 1000;

            return (
              <div key={customer.id} className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-black uppercase text-base">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight">{customer.name}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{customer.phone}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    isVIP ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50' :
                    isActive ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50' : 
                    'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}>
                    {isVIP ? 'VIP' : isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Gasto</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(totalSpent)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Lucro Gerado</p>
                    <p className="text-sm font-black text-emerald-600">{formatCurrency(totalProfit)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {lastSale ? `Última compra: ${lastSale.toLocaleDateString('pt-BR')}` : 'Sem compras'}
                  </p>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleQuickSale(customer)}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all"
                    >
                      <Zap size={18} />
                    </button>
                    <button 
                      onClick={() => handleOpenViewModal(customer)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => handleOpenModal(customer)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
          </>
        )}
      </div>

      {/* Modal for Add/Edit Customer */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preencha os dados cadastrais</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar text-slate-900 dark:text-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome Completo</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ex: Maria Silva"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp / Telefone</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="(51) 98524-2850"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF ou CNPJ</label>
                  <input 
                    type="text" 
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCpfCnpj(e.target.value) })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cidade</label>
                  <input 
                    type="text" 
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ex: Porto Alegre"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço Físico / Bairro</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ex: Rua das Flores, 123 - Centro"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Nascimento</label>
                  <input 
                    type="date" 
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações / Notas</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  placeholder="Preferências, alergias, etc..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Etapa no CRM / Funil de Vendas</label>
                <select
                  value={formData.crmStatus}
                  onChange={(e) => setFormData({ ...formData, crmStatus: e.target.value as any })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900"
                >
                  <option value="novo">Leads / Novos</option>
                  <option value="negociacao">Em Negociação</option>
                  <option value="pos_venda">Pós-Venda</option>
                  <option value="fidelizado">Fidelizados VIP</option>
                  <option value="resgatar">Recuperar / Inativo</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Modal for View Customer Details */}
      <AnimatePresence>
        {isViewModalOpen && selectedCustomerForView && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl">
                    {selectedCustomerForView.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {selectedCustomerForView.name}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ficha Cadastral do Cliente</p>
                  </div>
                </div>
                <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Tabs for Details vs Timeline */}
                <div className="col-span-full mb-2">
                  <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => setActiveDetailTab('info')}
                      className={cn(
                        "pb-4 px-2 text-[10px] font-black uppercase tracking-widest transition-all relative",
                        activeDetailTab === 'info' ? "text-blue-600" : "text-slate-400"
                      )}
                    >
                      Informações
                      {activeDetailTab === 'info' && <motion.div layoutId="activeDetailTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
                    </button>
                    <button 
                      onClick={() => setActiveDetailTab('timeline')}
                      className={cn(
                        "pb-4 px-2 text-[10px] font-black uppercase tracking-widest transition-all relative",
                        activeDetailTab === 'timeline' ? "text-blue-600" : "text-slate-400"
                      )}
                    >
                      Linha do Tempo
                      {activeDetailTab === 'timeline' && <motion.div layoutId="activeDetailTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
                    </button>
                  </div>
                </div>

                {activeDetailTab === 'info' ? (
                  <>
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp / Telefone</p>
                        <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase">
                          <MessageCircle size={16} className="text-emerald-500" />
                          {selectedCustomerForView.phone}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                        <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase">
                          <Mail size={16} className="text-blue-500" />
                          {selectedCustomerForView.email || 'Não informado'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF ou CNPJ</p>
                        <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase">
                          <FileText size={16} className="text-purple-500" />
                          {selectedCustomerForView.cpf || 'Não informado'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço</p>
                        <p className="font-bold text-slate-900 dark:text-white text-sm uppercase">
                          {selectedCustomerForView.address || 'Não informado'}
                          {selectedCustomerForView.city ? ` - ${selectedCustomerForView.city}` : ''}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic font-medium">
                          {selectedCustomerForView.notes || 'Sem observações cadastradas.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-2xl border border-blue-100">
                          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Ticket Médio</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            {formatCurrency(getCustomerStats(selectedCustomerForView.id).ticketMedioValue)}
                          </p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-2xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Total Gasto</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            {formatCurrency(getCustomerStats(selectedCustomerForView.id).totalSpent)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Top Produtos</p>
                        <div className="flex flex-wrap gap-2">
                          {getCustomerStats(selectedCustomerForView.id).preferredProductsValue.length > 0 ? (
                            getCustomerStats(selectedCustomerForView.id).preferredProductsValue.map((p) => (
                              <span key={p.name} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-tight border border-slate-200 dark:border-slate-700">
                                {p.name} ({p.count}x)
                              </span>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-400 italic font-bold uppercase tracking-widest px-1">Sem histórico</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="col-span-full max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                      {/* Customer Birthday / Start */}
                      <div className="relative">
                        <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 border-2 border-white dark:border-slate-900 flex items-center justify-center text-blue-600 z-10">
                          <Users size={12} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(selectedCustomerForView.createdAt)}</p>
                          <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase mt-1">Cadastro Realizado</h5>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-1">Bem-vinda à família Biobel!</p>
                        </div>
                      </div>

                      {/* Sales as Timeline Events */}
                      {sales
                        .filter(s => s.customerId === selectedCustomerForView.id)
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map(sale => (
                          <div key={sale.id} className="relative">
                            <div className={cn(
                              "absolute -left-8 top-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center z-10",
                              sale.status === 'completed' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                            )}>
                              {sale.status === 'completed' ? <ShoppingBag size={12} /> : <X size={12} />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(sale.date)}</p>
                                <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase mt-1">
                                  {sale.status === 'completed' ? `Compra Realizada: ${formatCurrency(sale.total)}` : 'Venda Devolvida'}
                                </h5>
                                <p className="text-[9px] font-medium text-slate-500 uppercase tracking-tight mt-1 truncate max-w-md">
                                  {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                </p>
                                {sale.paymentMethod && (
                                  <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                    Pago via {sale.paymentMethod}
                                  </span>
                                )}
                            </div>
                          </div>
                        ))
                      }
                      
                      {/* Future Anniversary Indicator */}
                      {selectedCustomerForView.birthDate && (
                         <div className="relative">
                            <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 border-2 border-white dark:border-slate-900 flex items-center justify-center text-purple-600 z-10 animate-bounce">
                              <Gift size={12} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Todo ano • {new Date(selectedCustomerForView.birthDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                              <h5 className="text-xs font-black text-purple-900 dark:text-purple-200 uppercase mt-1">Dia Especial: Aniversário!</h5>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-1">Momento ideal para envio de mimos e cupons.</p>
                            </div>
                          </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Purchase History Section */}
              <div className="px-8 pb-8">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-4">
                    <History size={16} className="text-blue-600" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Histórico de Compras</h4>
                  </div>
                  
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                    {sales.filter(s => s.customerId === selectedCustomerForView.id).length > 0 ? (
                      sales
                        .filter(s => s.customerId === selectedCustomerForView.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(sale => (
                          <div key={sale.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
                            <div>
                              <p className="text-xs font-black text-slate-900 dark:text-white">{formatDateWithDayOfWeek(sale.date)}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                              </p>
                              <p className="text-[9px] text-slate-500 truncate max-w-[200px]">
                                {sale.items.map(i => i.name).join(', ')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-blue-600">{formatCurrency(sale.total)}</p>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                sale.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {sale.status === 'completed' ? 'Concluída' : 'Devolvida'}
                              </span>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center py-4">Nenhuma compra registrada.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
                <button 
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleOpenModal(selectedCustomerForView);
                  }}
                  className="flex-1 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Editar Cadastro
                </button>
                <button 
                  onClick={() => handleQuickSale(selectedCustomerForView)}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Zap size={16} />
                  Nova Venda
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal for WhatsApp Quick Templates & Dispatches */}
      <AnimatePresence>
        {isWhatsAppModalOpen && whatsAppModalCustomer && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-black text-2xl">
                    <MessageCircle size={32} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Mensagem para {whatsAppModalCustomer.name}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Selecione um modelo, ajuste e envie pelo WhatsApp ({formatPhone(whatsAppModalCustomer.phone)})
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsWhatsAppModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                {/* Templates Selector Grid */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-left">Escolha um Modelo de Mensagem:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {CRM_STAGES.map((stg) => {
                      const isSelected = selectedTemplateId === stg.id;
                      return (
                        <button
                          key={stg.id}
                          onClick={() => {
                            setSelectedTemplateId(stg.id);
                            const tpl = messageTemplates[stg.id] || DEFAULT_TEMPLATES[stg.id as keyof typeof DEFAULT_TEMPLATES] || '';
                            setWhatsAppMessageText(tpl.replace(/{nome}/g, whatsAppModalCustomer.name));
                          }}
                          className={cn(
                            "p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-24",
                            isSelected 
                              ? "bg-emerald-50 dark:bg-emerald-900/25 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-sm"
                              : "bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          )}
                        >
                          <div>
                            <span className={cn("w-2 h-2 rounded-full inline-block mr-1.5", stg.color)} />
                            <span className="text-[10px] font-black uppercase tracking-wider">{stg.name}</span>
                          </div>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 line-clamp-2 mt-1 leading-snug">
                            {messageTemplates[stg.id] || DEFAULT_TEMPLATES[stg.id as keyof typeof DEFAULT_TEMPLATES]}
                          </p>
                          {isSelected && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full" />
                          )}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => {
                        setSelectedTemplateId('custom');
                        setWhatsAppMessageText('');
                      }}
                      className={cn(
                        "p-3.5 rounded-2xl border text-left transition-all h-24 flex flex-col justify-between",
                        selectedTemplateId === 'custom'
                          ? "bg-emerald-50 dark:bg-emerald-900/25 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      )}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">✍️ Customizada</span>
                      <p className="text-[9px] text-slate-400 italic">Mensagem em branco para escrever livremente.</p>
                    </button>
                  </div>
                </div>

                {/* Message Textarea */}
                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Texto Final da Mensagem (Ajuste antes de enviar):</label>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Tag automática: {'{nome}'}</span>
                  </div>
                  <textarea
                    value={whatsAppMessageText}
                    onChange={(e) => setWhatsAppMessageText(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                    rows={5}
                    placeholder="Escreva a mensagem aqui..."
                  />
                </div>

                {/* Collapsible Config Section */}
                <details className="group border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden transition-all text-left">
                  <summary className="p-4 bg-slate-50 dark:bg-slate-850/60 font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-300 cursor-pointer list-none flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800">
                    <span>⚙️ Configurar Mensagens Padrão (Editar Modelos)</span>
                    <span className="transition-transform group-open:rotate-180">▼</span>
                  </summary>
                  <div className="p-6 space-y-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 max-h-[250px] overflow-y-auto custom-scrollbar">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                      Edite as mensagens padrão de cada funil abaixo. Elas serão salvas no seu navegador para uso contínuo:
                    </p>
                    {CRM_STAGES.map((stg) => {
                      const templateKey = stg.id;
                      return (
                        <div key={stg.id} className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <span className={cn("w-2 h-2 rounded-full", stg.color)} />
                            {stg.name}
                          </label>
                          <textarea
                            value={messageTemplates[templateKey] || ''}
                            onChange={(e) => {
                              const updated = { ...messageTemplates, [templateKey]: e.target.value };
                              saveMessageTemplates(updated);
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-855 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-[10px] text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            rows={2}
                            placeholder="Mensagem..."
                          />
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>

              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
                <button 
                  onClick={() => setIsWhatsAppModalOpen(false)}
                  className="flex-1 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    const encodedMsg = encodeURIComponent(whatsAppMessageText);
                    const formattedPhone = whatsAppModalCustomer.phone.replace(/\D/g, '');
                    // Format prefix if it doesn't start with country code
                    const cleanPhone = formattedPhone.length === 10 || formattedPhone.length === 11 
                      ? '55' + formattedPhone 
                      : formattedPhone;
                    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`, '_blank');
                    setIsWhatsAppModalOpen(false);
                    addNotification('WhatsApp iniciado com sucesso!', 'success');
                  }}
                  className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle size={16} />
                  Disparar WhatsApp
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
