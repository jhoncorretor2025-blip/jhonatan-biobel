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
    User, Brand, Category, Product, StockBatch, Staff, StoreSettings, Withdrawal, FixedCost, FinancialAccount, CashierSession, Campaign, Giveaway, RaffleTicket, Raffle, RoutineActivity, Routine, Customer, SaleItem, Payment, Sale, MonthlyGoal, DashboardViewProps, ProductsViewProps, StaffViewProps, RoutineViewProps, BackupViewProps, CustomersViewProps, SalesViewProps, CashierViewProps, CampaignsViewProps, AtendimentoViewProps, Notification, ConfigViewProps 
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

export const ConfigView = ({ 
  settings, 
  setSettings, 
  addNotification, 
  setActiveDashboardTab, 
  setActiveTab,
  driveToken,
  setDriveToken,
  isSyncingSheets = false,
  isExportingSheets = false,
  handleSyncGoogleSheetsLive,
  handleExportToGoogleSheetsLive,
  handleConnectGoogleDrive,
  isSignInDriveLoading = false,
  googleUser,
  sales = [],
  formatCurrency = (val) => String(val)
}: ConfigViewProps) => {
  const [activeSubTab, setActiveSubTab] = useState<'geral' | 'taxas' | 'planilha'>('geral');
  const cleanPixKey = (settings.pixKey || '').replace(/\D/g, '');
  const isPixKeyValid = (() => {
    if (!settings.pixKey) return true;
    const type = settings.pixKeyType;
    if (type === 'CPF') return cleanPixKey.length === 11;
    if (type === 'CNPJ') return cleanPixKey.length === 14;
    if (type === 'PHONE') return cleanPixKey.length >= 10;
    if (type === 'EMAIL') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.pixKey);
    return true;
  })();

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Configurações da Empresa</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Settings size={12} className="animate-spin-slow" />
            Gerencie as informações da sua loja, parâmetros do PDV, taxas administrativas e tributação.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl max-w-full md:max-w-md transition-colors">
          <button 
            onClick={() => setActiveSubTab('geral')}
            className={cn(
              "flex-1 py-2 px-4 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all whitespace-nowrap",
              activeSubTab === 'geral' 
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            Dados da Empresa & Recibo
          </button>
          <button 
            onClick={() => setActiveSubTab('taxas')}
            className={cn(
              "flex-1 py-2 px-4 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all whitespace-nowrap",
              activeSubTab === 'taxas' 
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            Taxas & PDV
          </button>
          <button 
            onClick={() => setActiveSubTab('planilha')}
            className={cn(
              "flex-1 py-2 px-4 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all whitespace-nowrap",
              activeSubTab === 'planilha' 
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            Planilha Google Sheets
          </button>
        </div>
      </div>

      {activeSubTab === 'geral' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Guia PIX Dinâmico */}
          <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/60 dark:from-slate-800/40 dark:to-indigo-950/20 rounded-[32px] p-8 border border-blue-100/40 dark:border-slate-800 shadow-sm transition-all">
            <div className="flex items-center gap-3 text-blue-900 dark:text-blue-100 mb-6">
              <QrCode size={24} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-black uppercase tracking-tight">Guia de Configuração PIX Dinâmico</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-blue-50/50 dark:border-slate-800/50 space-y-3">
                <span className="inline-flex w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black items-center justify-center text-xs">1</span>
                <h4 className="font-black text-[11px] uppercase tracking-wider text-slate-800 dark:text-white">Escolha o Tipo de Chave</h4>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                  Dentre as opções abaixo, selecione se prefere usar o seu **CPF**, **CNPJ**, **Celular**, **E-mail** ou uma **Chave Aleatória**.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-blue-50/50 dark:border-slate-800/50 space-y-3">
                <span className="inline-flex w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black items-center justify-center text-xs">2</span>
                <h4 className="font-black text-[11px] uppercase tracking-wider text-slate-800 dark:text-white">Configure o Valor da Chave</h4>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                  Insira a sua chave PIX no campo correspondente. O sistema está preparado para limpar pontos, hífens ou caracteres especiais que não sejam números de forma totalmente automática.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-blue-50/50 dark:border-slate-800/50 space-y-3">
                <span className="inline-flex w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black items-center justify-center text-xs">3</span>
                <h4 className="font-black text-[11px] uppercase tracking-wider text-slate-800 dark:text-white">Atenção às Validações</h4>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                  O sistema exige estritamente:
                  <br />
                  • **CPF**: Exatamente 11 números.
                  <br />
                  • **CNPJ**: Exatamente 14 números.
                  <br />
                  O sistema sinalizará caso algum formato seja inválido.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-blue-50/50 dark:border-slate-800/50 space-y-3">
                <span className="inline-flex w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black items-center justify-center text-xs">4</span>
                <h4 className="font-black text-[11px] uppercase tracking-wider text-slate-800 dark:text-white">Habilite o QR Code</h4>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                  Ative o botão "Ativar QR Code PIX Dinâmico". Ao finalizar as vendas no Carrinho, o QR Code de pagamento imediato será gerado automaticamente.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Dados da Empresa */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Store size={24} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Dados de Identificação</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome da Loja</label>
                    <input 
                      type="text"
                      value={settings.name}
                      onChange={(e) => setSettings({...settings, name: e.target.value.toUpperCase()})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone / WhatsApp</label>
                    <input 
                      type="text"
                      value={settings.phone}
                      onChange={(e) => setSettings({...settings, phone: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Chave PIX</label>
                      <div className="flex flex-wrap gap-2">
                        {['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM'].map((type) => (
                          <button
                            key={type}
                            onClick={() => setSettings({...settings, pixKeyType: type as any})}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all",
                              settings.pixKeyType === type 
                                ? "bg-blue-600 text-white" 
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {type === 'PHONE' ? 'CELULAR' : type === 'RANDOM' ? 'ALEATÓRIA' : type}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Chave PIX</label>
                      <input 
                        type="text"
                        placeholder={
                          settings.pixKeyType === 'PHONE' ? '(51) 99999-8888' :
                          settings.pixKeyType === 'CPF' ? '000.000.000-00' :
                          settings.pixKeyType === 'CNPJ' ? '00.000.000/0000-00' :
                          'Insira sua chave correspondente'
                        }
                        value={settings.pixKey || ''}
                        onChange={(e) => setSettings({...settings, pixKey: e.target.value})}
                        className={`w-full bg-white dark:bg-slate-900 border rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                          settings.pixKey && !isPixKeyValid 
                            ? 'border-rose-400 focus:ring-rose-500/20 text-rose-600' 
                            : settings.pixKey && isPixKeyValid 
                              ? 'border-emerald-400 focus:ring-emerald-500/20 text-slate-900 dark:text-white'
                              : 'border-transparent text-slate-900 dark:text-white'
                        }`}
                      />
                      {settings.pixKey && !isPixKeyValid && (
                        <p className="px-1 text-[9px] font-black text-rose-500 uppercase tracking-tight flex items-center gap-1 mt-1 animate-in fade-in duration-300">
                          <AlertTriangle size={10} /> Chave {settings.pixKeyType} inválida. {settings.pixKeyType === 'CPF' ? 'Requer exatamente 11 números.' : settings.pixKeyType === 'CNPJ' ? 'Requer exatamente 14 números.' : 'Formato incorreto para este tipo.'}
                        </p>
                      )}
                      {settings.pixKey && isPixKeyValid && (
                        <p className="px-1 text-[9px] font-black text-emerald-500 uppercase tracking-tight flex items-center gap-1 mt-1 animate-in fade-in duration-300">
                          <CheckCircle size={10} /> Chave {settings.pixKeyType} preenchida no formato correto!
                        </p>
                      )}
                      <p className="px-1 text-[8px] font-bold text-slate-400 uppercase tracking-tight">
                        <Settings size={10} className="inline mr-1" />
                        {settings.pixKeyType === 'PHONE' 
                          ? 'Não precisa pôr o +55, o sistema adiciona para você.' 
                          : 'O sistema removerá pontos e traços automaticamente.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settings.pixEnabled || false}
                        onChange={(e) => setSettings({...settings, pixEnabled: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                    <div>
                      <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Ativar QR Code PIX Dinâmico</p>
                      <p className="text-[9px] text-blue-400 font-bold uppercase mt-0.5">Gera o QR Code automático no carrinho</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Endereço Completo</label>
                    <textarea 
                      value={settings.address}
                      onChange={(e) => setSettings({...settings, address: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 h-24 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Loja & Recibo */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                    <Smartphone size={24} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Personalização de Cupom</h3>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settings.couponEnabled || false}
                        onChange={(e) => setSettings({...settings, couponEnabled: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                    <div>
                      <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Habilitar Cupons no Caixa</p>
                      <p className="text-[9px] text-purple-400 font-bold uppercase mt-0.5">Permite aplicar cupons de desconto ao finalizar venda</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'showLogo', label: 'Logo' },
                      { key: 'showAddress', label: 'Endereço' },
                      { key: 'showPhone', label: 'Telefone' },
                      { key: 'showInstagram', label: 'Instagram' },
                      { key: 'showSeller', label: 'Vendedora' },
                      { key: 'showDiscount', label: 'Descontos' }
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-100 dark:border-slate-700">
                        <input 
                          type="checkbox"
                          checked={settings.receiptConfig?.[item.key as keyof typeof settings.receiptConfig] as boolean}
                          onChange={(e) => setSettings({
                            ...settings, 
                            receiptConfig: {
                              ...(settings.receiptConfig || { showLogo: true, showAddress: true, showPhone: true, showInstagram: true, showDiscount: true, showSeller: true, customMessage: '' }), 
                              [item.key]: e.target.checked
                            }
                          })}
                          className="w-5 h-5 rounded bg-blue-100 border-none text-blue-600 focus:ring-0"
                        />
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mensagem do Rodapé</label>
                    <textarea 
                      placeholder="Ex: Obrigado pela preferência! Volte sempre."
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none h-24"
                      value={settings.receiptConfig?.customMessage}
                      onChange={(e) => setSettings({
                        ...settings, 
                        receiptConfig: {
                          ...(settings.receiptConfig || { showLogo: true, showAddress: true, showPhone: true, showInstagram: true, showDiscount: true, showSeller: true, customMessage: '' }), 
                          customMessage: e.target.value
                        }
                      })}
                    />
                  </div>

                  {/* Opções Visuais de Gráficos */}
                  <div className="space-y-4 pt-6 mt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-700">
                    <div className="flex items-center gap-3 px-1">
                       <div className="w-10 h-10 bg-rose-500/10 text-rose-600 rounded-xl flex items-center justify-center">
                         <Palette size={20} />
                       </div>
                       <div>
                         <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.1em]">Paleta do Painel</h4>
                         <p className="text-[9px] font-bold text-slate-400 uppercase">Personalize as cores dos gráficos</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                      {((settings.chartColors && settings.chartColors.length === 7) ? settings.chartColors : ['#be123c', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#eab308', '#16a34a']).map((color, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2 group">
                           <div className="relative w-full aspect-square rounded-xl overflow-hidden ring-2 ring-transparent group-hover:ring-rose-500/20 transition-all">
                             <input 
                               type="color" 
                               value={color}
                               onChange={(e) => {
                                 const currentColors = (settings.chartColors && settings.chartColors.length === 7) 
                                   ? settings.chartColors 
                                   : ['#be123c', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#eab308', '#16a34a'];
                                 const newColors = [...currentColors];
                                 newColors[idx] = e.target.value;
                                 setSettings({...settings, chartColors: newColors});
                               }}
                               className="absolute inset-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] border-none bg-transparent cursor-pointer"
                             />
                           </div>
                           <span className="text-[8px] font-black text-slate-400 uppercase">C{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* NOVO: Configuração de Backup Diário por E-mail */}
            <div className="mt-8 p-8 bg-slate-50 dark:bg-slate-800/40 rounded-[32px] border border-slate-100/60 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Backup Diário Automático por E-mail</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Receba o backup com todos os dados da Biobel diariamente por e-mail no horário programado (sugerido após as 18h)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail de Destino</label>
                  <input 
                    type="email"
                    placeholder="exemplo@gmail.com"
                    value={settings.backupEmail || ''}
                    onChange={(e) => setSettings({...settings, backupEmail: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Horário do Backup Diário</label>
                  <input 
                    type="time"
                    value={settings.backupTime || '18:00'}
                    onChange={(e) => setSettings({...settings, backupTime: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.backupEnabled ?? true}
                      onChange={(e) => setSettings({...settings, backupEnabled: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                  <div>
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Ativar Envio Diário</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Disparar backup às {settings.backupTime || '18:00'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 🚀 Customização do Menu Principal */}
            <div className="pt-10 mt-10 border-t border-slate-100 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                  <span className="text-xl">🚀</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Atalhos do Menu Principal</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                    Selecione quais seções do sistema você deseja fixar na guia "Principal" do menu lateral.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { id: 'home', label: 'Início / Home' },
                  { id: 'atendimento', label: 'Atendimento (Nova Venda)' },
                  { id: 'products', label: 'Produtos' },
                  { id: 'brands', label: 'Marcas' },
                  { id: 'staff', label: 'Usuários & Equipe' },
                  { id: 'customers', label: 'Clientes' },
                  { id: 'combos', label: 'Combos de Produtos' },
                  { id: 'kits', label: 'Kits de Presente' },
                  { id: 'peks', label: 'Peks (Packs)' },
                  { id: 'suppliers', label: 'Fornecedores' },
                  { id: 'sales', label: 'Vendas' },
                  { id: 'reports', label: 'Relatórios & Histórico' },
                  { id: 'dashboard', label: 'Painel em Tempo Real' },
                  { id: 'improvement', label: 'Alertas & Decisões' },
                  { id: 'costs', label: 'Custos Fixos' },
                  { id: 'financial_accounts', label: 'Contas a Pagar/Receber' },
                  { id: 'cash_flow', label: 'Fluxo de Caixa' },
                  { id: 'cashier', label: 'Caixa / Turnos' },
                  { id: 'campaigns', label: 'Campanhas' },
                  { id: 'giveaways', label: 'Sorteios' },
                  { id: 'raffles', label: 'Campanhas de Rifas' },
                  { id: 'manager_campaign', label: 'Campanha das Vendedoras' },
                  { id: 'performance', label: 'Espelho da Vendedora' },
                  { id: 'routine', label: 'Checklist Diário' },
                  { id: 'funcao_rotina', label: 'Função & Rotina' },
                  { id: 'agenda', label: 'Agenda de Eventos' },
                  { id: 'fiscal_cfop', label: 'CFOP Fiscal' },
                  { id: 'fiscal_emissao', label: 'Emissão online' },
                  { id: 'fiscal_observacoes', label: 'Regras para observações' },
                  { id: 'fiscal_serie', label: 'Série fiscal' },
                  { id: 'fiscal_ibpt', label: 'Tabela de tributos IBPT' },
                  { id: 'fiscal_nfe', label: 'NF-e' },
                  { id: 'fiscal_cnae', label: 'CNAE' }
                ].map((item) => {
                  const currentPrincipal = settings.principalMenus || ['home', 'atendimento'];
                  const isChecked = currentPrincipal.includes(item.id);
                  return (
                    <label 
                      key={item.id} 
                      className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all border ${
                        isChecked 
                          ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40" 
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          let nextPrincipal = [...currentPrincipal];
                          if (e.target.checked) {
                            if (!nextPrincipal.includes(item.id)) {
                              nextPrincipal.push(item.id);
                            }
                          } else {
                            nextPrincipal = nextPrincipal.filter(id => id !== item.id);
                          }
                          setSettings({
                            ...settings,
                            principalMenus: nextPrincipal
                          });
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0 border-slate-300 dark:border-slate-700 cursor-pointer"
                      />
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        isChecked ? "text-blue-700 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                      }`}>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-right">
              <button 
                onClick={() => addNotification('Configurações salvas com sucesso!', 'success')}
                className="px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-100 dark:shadow-none"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'taxas' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors space-y-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center">
                <WalletIcon size={20} />
              </div>
              Parâmetros de Gestão Financeira & PDV
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Trava de Desconto */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-xl flex items-center justify-center">
                    <Percent size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Trava de Desconto Máximo no PDV</h4>
                    <p className="text-[10px] text-slate-400 font-bold">Impede descontos superiores ao limite estipulado no carrinho</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={settings.maxDiscountLimit ?? 20}
                    onChange={(e) => setSettings({...settings, maxDiscountLimit: Number(e.target.value)})}
                    className="w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">% Desconto Máximo</span>
                </div>
              </div>

              {/* Taxas Administrativas */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center">
                    <WalletIcon size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Taxas das Maquininhas</h4>
                    <p className="text-[10px] text-slate-400 font-bold">Configure as taxas cobradas pelo intermediador financeiro</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Débito (%)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={settings.cardRates?.debit ?? 1.5}
                      onChange={(e) => setSettings({
                        ...settings, 
                        cardRates: { ...(settings.cardRates || { debit: 1.5, credit1x: 3.0, creditInstallment: 4.5 }), debit: Number(e.target.value) }
                      })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Crédito à Vista (%)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={settings.cardRates?.credit1x ?? 3.0}
                      onChange={(e) => setSettings({
                        ...settings, 
                        cardRates: { ...(settings.cardRates || { debit: 1.5, credit1x: 3.0, creditInstallment: 4.5 }), credit1x: Number(e.target.value) }
                      })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Crédito Parcelado (%)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={settings.cardRates?.creditInstallment ?? 4.5}
                      onChange={(e) => setSettings({
                        ...settings, 
                        cardRates: { ...(settings.cardRates || { debit: 1.5, credit1x: 3.0, creditInstallment: 4.5 }), creditInstallment: Number(e.target.value) }
                      })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contas Bancárias de Destino */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                    <Settings size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Contas Bancárias de Destino</h4>
                    <p className="text-[10px] text-slate-400 font-bold">Registre as contas bancárias para depósitos e conciliação de faturamento</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const accounts = settings.bankAccounts || [];
                    const newAccount = { id: Date.now().toString(), bankName: 'Novo Banco', agency: '0001', account: '123456-7', type: 'Corrente' };
                    setSettings({ ...settings, bankAccounts: [...accounts, newAccount] });
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all self-start sm:self-auto"
                >
                  Adicionar Conta
                </button>
              </div>

              <div className="space-y-3">
                {(settings.bankAccounts || []).map((acc: any, index: number) => (
                  <div key={acc.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Nome do Banco</label>
                      <input 
                        type="text" 
                        value={acc.bankName} 
                        onChange={(e) => {
                          const updated = [...(settings.bankAccounts || [])];
                          updated[index] = { ...updated[index], bankName: e.target.value.toUpperCase() };
                          setSettings({ ...settings, bankAccounts: updated });
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none p-2.5 text-xs font-bold rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Agência</label>
                      <input 
                        type="text" 
                        value={acc.agency} 
                        onChange={(e) => {
                          const updated = [...(settings.bankAccounts || [])];
                          updated[index] = { ...updated[index], agency: e.target.value };
                          setSettings({ ...settings, bankAccounts: updated });
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none p-2.5 text-xs font-bold rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Número de Conta</label>
                      <input 
                        type="text" 
                        value={acc.account} 
                        onChange={(e) => {
                          const updated = [...(settings.bankAccounts || [])];
                          updated[index] = { ...updated[index], account: e.target.value };
                          setSettings({ ...settings, bankAccounts: updated });
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none p-2.5 text-xs font-bold rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Tipo de Conta</label>
                      <select 
                        value={acc.type} 
                        onChange={(e) => {
                          const updated = [...(settings.bankAccounts || [])];
                          updated[index] = { ...updated[index], type: e.target.value };
                          setSettings({ ...settings, bankAccounts: updated });
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none p-2.5 text-[11px] font-bold rounded-lg text-slate-900 dark:text-white"
                      >
                        <option value="Corrente">Conta Corrente</option>
                        <option value="Poupança">Conta Poupança</option>
                        <option value="Pagamentos">Conta de Pagamentos</option>
                      </select>
                    </div>
                    <button 
                      onClick={() => {
                        const updated = (settings.bankAccounts || []).filter((a: any) => a.id !== acc.id);
                        setSettings({ ...settings, bankAccounts: updated });
                      }}
                      className="w-full p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 rounded-lg text-[10px] font-black uppercase text-center"
                    >
                      Remover
                    </button>
                  </div>
                ))}
                {(settings.bankAccounts || []).length === 0 && (
                  <div className="text-center py-6 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    Nenhuma conta cadastrada. Clique em "Adicionar Conta" acima
                  </div>
                )}
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-right">
              <button 
                onClick={() => addNotification('Informações de faturamento salvas!', 'success')}
                className="px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-100 dark:shadow-none"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'parametros' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors space-y-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center">
                <FileSpreadsheet size={20} />
              </div>
              Parâmetros do Negócio & Informações Fiscais
            </h3>

            {/* Opções de Exibição & Diferenciais */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center">
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Preferências de Interface & Visores</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Configure quais elementos analíticos ou comparativos estarão visíveis no painel</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Histórico de Faturamento (Semana Comparativa)</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">Mostra o faturamento dos mesmos dias de semanas anteriores para analisar desempenho e metas reais</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.showPastWeekdayTracker ?? true}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          showPastWeekdayTracker: e.target.checked
                        });
                      }}
                    />
                    <div className="w-8 h-4.5 bg-slate-250 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Horário de Funcionamento */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Horário de Funcionamento Oficial</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Defina as horas oficiais da loja para balanço de produtividade e relatórios</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[
                  { name: 'Segunda-feira', prefix: 'seg', openKey: 'segOpen' as const, closeKey: 'segClose' as const, closedKey: 'segClosed' as const, defaultOpen: '09:00', defaultClose: '19:00' },
                  { name: 'Terça-feira', prefix: 'ter', openKey: 'terOpen' as const, closeKey: 'terClose' as const, closedKey: 'terClosed' as const, defaultOpen: '09:00', defaultClose: '19:00' },
                  { name: 'Quarta-feira', prefix: 'qua', openKey: 'quaOpen' as const, closeKey: 'quaClose' as const, closedKey: 'quaClosed' as const, defaultOpen: '09:00', defaultClose: '19:00' },
                  { name: 'Quinta-feira', prefix: 'qui', openKey: 'quiOpen' as const, closeKey: 'quiClose' as const, closedKey: 'quiClosed' as const, defaultOpen: '09:00', defaultClose: '19:00' },
                  { name: 'Sexta-feira', prefix: 'sex', openKey: 'sexOpen' as const, closeKey: 'sexClose' as const, closedKey: 'sexClosed' as const, defaultOpen: '09:00', defaultClose: '19:00' },
                  { name: 'Sábado', prefix: 'sab', openKey: 'sabOpenDetail' as const, closeKey: 'sabCloseDetail' as const, closedKey: 'sabClosed' as const, defaultOpen: '09:00', defaultClose: '17:05' },
                  { name: 'Domingo', prefix: 'dom', openKey: 'domOpen' as const, closeKey: 'domClose' as const, closedKey: 'domClosed' as const, defaultOpen: '09:00', defaultClose: '13:00' }
                ].map((day) => {
                  const isClosed = settings.operatingHours?.[day.closedKey] ?? (day.prefix === 'dom');
                  const openTime = settings.operatingHours?.[day.openKey] ?? (day.prefix === 'sab' ? (settings.operatingHours?.saturdayOpen ?? day.defaultOpen) : (day.prefix === 'dom' ? day.defaultOpen : (settings.operatingHours?.weekdayOpen ?? day.defaultOpen)));
                  const closeTime = settings.operatingHours?.[day.closeKey] ?? (day.prefix === 'sab' ? (settings.operatingHours?.saturdayClose ?? day.defaultClose) : (day.prefix === 'dom' ? day.defaultClose : (settings.operatingHours?.weekdayClose ?? day.defaultClose)));
                  
                  return (
                    <div key={day.prefix} className={cn(
                      "p-4 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 min-y-[135px]",
                      isClosed 
                        ? "bg-slate-100/40 dark:bg-slate-800/10 border-slate-200/60 dark:border-slate-800/40 opacity-75" 
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md hover:scale-[1.01]"
                    )}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-3 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase font-sans truncate">{day.name}</span>
                        </div>
                        
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={!isClosed}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSettings({
                                ...settings,
                                operatingHours: {
                                  ...(settings.operatingHours || { weekdayOpen: '09:00', weekdayClose: '19:00', saturdayOpen: '09:00', saturdayClose: '17:00' }),
                                  [day.closedKey]: !checked
                                }
                              });
                            }}
                          />
                          <div className="w-8 h-4.5 bg-slate-250 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-550"></div>
                        </label>
                      </div>

                      {!isClosed ? (
                        <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Início</label>
                            <input 
                              type="time" 
                              value={openTime}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSettings({
                                  ...settings,
                                  operatingHours: {
                                    ...(settings.operatingHours || { weekdayOpen: '09:00', weekdayClose: '19:00', saturdayOpen: '09:00', saturdayClose: '17:00' }),
                                    [day.openKey]: val,
                                    ...(day.prefix !== 'sab' && day.prefix !== 'dom' ? { weekdayOpen: val } : {}),
                                    ...(day.prefix === 'sab' ? { saturdayOpen: val } : {})
                                  }
                                });
                              }}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-none p-1.5 px-2 text-xs font-mono font-bold rounded-xl text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500/20"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Fim</label>
                            <input 
                              type="time" 
                              value={closeTime}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSettings({
                                  ...settings,
                                  operatingHours: {
                                    ...(settings.operatingHours || { weekdayOpen: '09:00', weekdayClose: '19:00', saturdayOpen: '09:00', saturdayClose: '17:00' }),
                                    [day.closeKey]: val,
                                    ...(day.prefix !== 'sab' && day.prefix !== 'dom' ? { weekdayClose: val } : {}),
                                    ...(day.prefix === 'sab' ? { saturdayClose: val } : {})
                                  }
                                });
                              }}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-none p-1.5 px-2 text-xs font-mono font-bold rounded-xl text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500/20"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-2.5 bg-slate-100/50 dark:bg-slate-850/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/60">
                          <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Fechado</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Visual Efficiency Tip Card for layout parity */}
                <div className="p-4 rounded-3xl border border-dashed border-blue-200/50 dark:border-slate-800 bg-blue-50/10 dark:bg-slate-900/10 flex flex-col justify-between space-y-3 min-y-[135px]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-[10px] font-black text-blue-900 dark:text-blue-400 uppercase font-sans">Análise Operacional</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold leading-relaxed uppercase">
                    Configurar horários individuais aprimora os relatórios semanais e mensalidades, deduzindo perfeitamente os dias inativos da contagem de faturamento médio diário.
                  </p>
                  <div className="text-[8px] font-black text-blue-600 uppercase tracking-widest">
                    ⚙️ Produtividade Avançada
                  </div>
                </div>
              </div>
            </div>

            {/* Dias Úteis & Gestão de Calendário */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Dias Úteis Oficiais de Faturamento</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Defina quais dias entram nos cálculos de faturamento médio diário, projeções e metas</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 pl-1">Selecione os dias da semana produtivos:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { num: 1, name: 'Seg', desc: 'Segunda-feira' },
                      { num: 2, name: 'Ter', desc: 'Terça-feira' },
                      { num: 3, name: 'Qua', desc: 'Quarta-feira' },
                      { num: 4, name: 'Qui', desc: 'Quinta-feira' },
                      { num: 5, name: 'Sex', desc: 'Sexta-feira' },
                      { num: 6, name: 'Sáb', desc: 'Sábado' },
                      { num: 0, name: 'Dom', desc: 'Domingo' }
                    ].map((d) => {
                      const isActive = (settings.workingWeekdays || [1, 2, 3, 4, 5, 6]).includes(d.num);
                      return (
                        <button
                          key={d.num}
                          type="button"
                          onClick={() => {
                            const current = settings.workingWeekdays || [1, 2, 3, 4, 5, 6];
                            const updated = current.includes(d.num) 
                              ? current.filter(val => val !== d.num) 
                              : [...current, d.num].sort();
                            setSettings({ ...settings, workingWeekdays: updated });
                          }}
                          className={cn(
                            "px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer border",
                            isActive 
                              ? "bg-indigo-600 text-white border-transparent shadow-xs shadow-indigo-200 dark:shadow-none font-black" 
                              : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750"
                          )}
                          title={d.desc}
                        >
                          {d.desc}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Excluir Feriados Automaticamente</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">Exclui automaticamente os feriados locais ou nacionais dos dias úteis para balanço diário</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.excludeHolidaysFromCalculations !== false}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          excludeHolidaysFromCalculations: e.target.checked
                        });
                      }}
                    />
                    <div className="w-8 h-4.5 bg-slate-250 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Regime Tributário */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Regime Tributário & Impostos</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Configure o enquadramento fiscal e as alíquotas para projeção de deduções fiscais</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Regime Fiscal</label>
                  <select 
                    value={settings.taxRegime ?? 'MEI'}
                    onChange={(e) => setSettings({...settings, taxRegime: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="MEI">MEI (Microempreendedor Individual)</option>
                    <option value="Simples Nacional">Simples Nacional (ME ou EPP)</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Lucro Real">Lucro Real</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">DAS / Alíquota Base (%)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={settings.taxesAndRates?.simplesNacional ?? 6.0}
                    disabled={(settings.taxRegime ?? 'MEI') === 'MEI'}
                    onChange={(e) => setSettings({
                      ...settings, 
                      taxesAndRates: { ...(settings.taxesAndRates || { simplesNacional: 6.0, icms: 18.0, iss: 2.0 }), simplesNacional: Number(e.target.value) }
                    })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-950"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">ICMS / ISS Médio (%)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={settings.taxesAndRates?.icms ?? 18.0}
                    disabled={(settings.taxRegime ?? 'MEI') === 'MEI'}
                    onChange={(e) => setSettings({
                      ...settings, 
                      taxesAndRates: { ...(settings.taxesAndRates || { simplesNacional: 6.0, icms: 18.0, iss: 2.0 }), icms: Number(e.target.value) }
                    })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-950"
                  />
                </div>
              </div>

              {/* Painel Informativo de Transição MEI -> Simples Nacional */}
              {(settings.taxRegime ?? 'MEI') === 'MEI' ? (
                <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle size={14} />
                      Enquadramento Ativo: MEI (Configuração Padrão Atual)
                    </p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase leading-relaxed">
                      Como MEI, o imposto é fixado em um valor mensal fixo (DAS-MEI de aprox. R$ 80,00) pago de forma unificada. As alíquotas percentuais de vendas não afetam as despesas operacionais no sistema. O limite de faturamento anual MEI recomendado é de <strong className="text-slate-800 dark:text-white">R$ 81.000,00</strong>.
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-right self-stretch md:self-auto flex md:flex-col justify-between md:justify-center items-center md:items-end shrink-0">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Acumulado no Ano</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {formatCurrency(sales.reduce((acc, sale) => {
                        const saleDate = new Date(sale.date);
                        const currentYear = new Date().getFullYear();
                        if (saleDate.getFullYear() === currentYear) {
                          return acc + sale.total;
                        }
                        return acc;
                      }, 0))} / R$ 81k
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-600/5 dark:bg-blue-600/10 border border-blue-600/20 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info size={14} />
                    Enquadramento Ativo: {settings.taxRegime} (Simples Nacional)
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase leading-relaxed mt-1">
                    Como Simples Nacional, os impostos são proporcionais ao seu faturamento (conforme anexo CNAE). As alíquotas base e ICMS/ISS configuradas acima são aplicadas sobre o faturamento total em relatórios de rentabilidade líquida.
                  </p>
                </div>
              )}
            </div>

            {/* Fornecedores Oficiais */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center">
                    <PackageCheck size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Diretório de Fornecedores Oficiais</h4>
                    <p className="text-[10px] text-slate-400 font-bold">Gerencie os fornecedores cadastrados para cotações e reposição rápida de estoque</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const suppliers = settings.officialProviders || [];
                    const newSupp = { 
                      id: Date.now().toString(), 
                      name: 'DISTRIBUIDOR NOVO', 
                      cnpj: '00.000.000/0001-00', 
                      phone: '(51) 99999-9999', 
                      brand: 'MARCA',
                      offersGift: false,
                      giftDescription: ''
                    };
                    setSettings({ ...settings, officialProviders: [...suppliers, newSupp] });
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all self-start sm:self-auto cursor-pointer"
                >
                  Adicionar Fornecedor
                </button>
              </div>

              <div className="space-y-3">
                {(settings.officialProviders || []).map((prov: any, index: number) => (
                  <div key={prov.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Distribuidor / Fornecedor</label>
                        <input 
                          type="text" 
                          value={prov.name} 
                          onChange={(e) => {
                            const updated = [...(settings.officialProviders || [])];
                            updated[index] = { ...updated[index], name: e.target.value.toUpperCase() };
                            setSettings({ ...settings, officialProviders: updated });
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 p-2.5 text-xs font-bold rounded-lg text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">CNPJ do Fornecedor</label>
                        <input 
                          type="text" 
                          value={prov.cnpj} 
                          onChange={(e) => {
                            const updated = [...(settings.officialProviders || [])];
                            updated[index] = { ...updated[index], cnpj: e.target.value };
                            setSettings({ ...settings, officialProviders: updated });
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 p-2.5 text-xs font-bold rounded-lg text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">WhatsApp / Comercial</label>
                        <input 
                          type="text" 
                          value={prov.phone} 
                          onChange={(e) => {
                            const updated = [...(settings.officialProviders || [])];
                            updated[index] = { ...updated[index], phone: e.target.value };
                            setSettings({ ...settings, officialProviders: updated });
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 p-2.5 text-xs font-bold rounded-lg text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Marca Principal</label>
                        <input 
                          type="text" 
                          value={prov.brand} 
                          onChange={(e) => {
                            const updated = [...(settings.officialProviders || [])];
                            updated[index] = { ...updated[index], brand: e.target.value.toUpperCase() };
                            setSettings({ ...settings, officialProviders: updated });
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 p-2.5 text-xs font-bold rounded-lg text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Gifts Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 items-center">
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">🎁 Oferece Brinde?</label>
                        <select
                          value={prov.offersGift ? "sim" : "nao"}
                          onChange={(e) => {
                            const updated = [...(settings.officialProviders || [])];
                            updated[index] = { ...updated[index], offersGift: e.target.value === "sim" };
                            setSettings({ ...settings, officialProviders: updated });
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 p-2 text-xs font-bold rounded-lg text-slate-900 dark:text-white focus:outline-none"
                        >
                          <option value="nao">❌ Não Oferece Brinde</option>
                          <option value="sim">🎁 Oferece Brinde / Regra</option>
                        </select>
                      </div>

                      <div className="sm:col-span-6 space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Regra / Descrição do Brinde (Para a lojista não se perder)</label>
                        <input 
                          type="text" 
                          value={prov.giftDescription || ''} 
                          disabled={!prov.offersGift}
                          onChange={(e) => {
                            const updated = [...(settings.officialProviders || [])];
                            updated[index] = { ...updated[index], giftDescription: e.target.value };
                            setSettings({ ...settings, officialProviders: updated });
                          }}
                          placeholder={prov.offersGift ? "Ex: A cada 10 tinturas ganha 1 OX" : "Habilite 'Oferece Brinde' para registrar..."}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 p-2 text-xs font-bold rounded-lg text-slate-900 dark:text-white focus:outline-none disabled:opacity-40"
                        />
                      </div>

                      <div className="sm:col-span-3 pt-2 sm:pt-0 flex justify-end">
                        <button 
                          onClick={() => {
                            const updated = (settings.officialProviders || []).filter((s: any) => s.id !== prov.id);
                            setSettings({ ...settings, officialProviders: updated });
                          }}
                          className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 rounded-lg text-[10px] font-black uppercase text-center cursor-pointer transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {(settings.officialProviders || []).length === 0 && (
                  <div className="text-center py-6 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    Nenhum fornecedor registrado. Clique em "Adicionar Fornecedor" acima
                  </div>
                )}
              </div>
            </div>

            {/* Marca d'água */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Marca D'água para Documentos Oficiais em PDF</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Adicione uma inscrição de autenticidade no rodapé dos relatórios do sistema</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Texto de Segurança / Autenticidade</label>
                <input 
                  type="text"
                  value={settings.watermarkText ?? 'BIOBEL ESTÉTICA & COSMÉTICOS'}
                  onChange={(e) => setSettings({...settings, watermarkText: e.target.value})}
                  placeholder="EX: BIOBEL ESTÉTICA - DOCUMENTO OFICIAL DO GESTOR"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-right">
              <button 
                onClick={() => addNotification('Configurações de relatórios e impostos salvas!', 'success')}
                className="px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-100 dark:shadow-none"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'planilha' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet size={20} />
                </div>
                Integração & Sincronização Google Sheets
              </h3>
              
              {/* Status Badge */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  settings.googleSheetsUrl ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                )} />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {settings.googleSheetsUrl ? 'Sincronização Ativa' : 'Não Configurado'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-bold leading-relaxed uppercase">
              Gerencie a sincronização bidirecional em tempo real entre o sistema e sua planilha do Google Sheets. Todos os seus dados de vendas, produtos, clientes, marcas e custos podem ser mantidos atualizados na nuvem automaticamente.
            </p>

            {/* 1. Google Account Connection Card */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                  <UserIcon size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Conexão com Conta Google</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Necessário para permitir que o sistema escreva e salve dados de volta na sua planilha</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {driveToken ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-center text-emerald-600">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase">Conta Google Conectada</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Sincronização em tempo real habilitada</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/30 rounded-xl flex items-center justify-center text-amber-500">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase">Google Drive Desconectado</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Você ainda pode ler planilhas públicas, mas precisa conectar para gravar</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {driveToken ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (setDriveToken) setDriveToken(null);
                        addNotification('Conta Google desconectada.', 'info');
                      }}
                      className="px-4 py-2.5 border border-slate-100 dark:border-slate-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Desconectar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectGoogleDrive}
                      disabled={isSignInDriveLoading}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {isSignInDriveLoading ? <RefreshCw className="animate-spin" size={12} /> : <UserIcon size={12} />}
                      {isSignInDriveLoading ? 'Conectando...' : 'Conectar Conta Google'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Google Sheets Link Input */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center">
                    <LinkIcon size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">URL / Link da Planilha Google Sheets</h4>
                    <p className="text-[10px] text-slate-400 font-bold">Insira o link completo da planilha do seu navegador para sincronização</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentUrls = settings.additionalGoogleSheetsUrls || [];
                    setSettings(prev => ({
                      ...prev,
                      additionalGoogleSheetsUrls: [...currentUrls, '']
                    }));
                  }}
                  className="flex items-center gap-1 text-[9px] font-black text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/40 px-2 py-1.5 rounded-lg transition-all"
                >
                  <Plus size={10} />
                  Novo Link / Mês
                </button>
              </div>

              <div className="space-y-4">
                <input 
                  type="text"
                  value={settings.googleSheetsUrl || ''}
                  onChange={(e) => setSettings({ ...settings, googleSheetsUrl: e.target.value })}
                  placeholder="Ex: https://docs.google.com/spreadsheets/d/sua-planilha-id/edit"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                />

                {/* Additional Google Sheets URLs */}
                {(settings.additionalGoogleSheetsUrls || []).map((url, idx) => (
                  <div key={idx} className="space-y-2 animate-fadeIn pt-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest">Link Adicional #{idx + 1}</label>
                      <button
                        type="button"
                        onClick={() => {
                          const currentUrls = [...(settings.additionalGoogleSheetsUrls || [])];
                          currentUrls.splice(idx, 1);
                          setSettings(prev => ({
                            ...prev,
                            additionalGoogleSheetsUrls: currentUrls
                          }));
                        }}
                        className="text-rose-500 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest"
                      >
                        Remover
                      </button>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Ex: https://docs.google.com/spreadsheets/d/sua-planilha-id/edit"
                      value={url}
                      onChange={(e) => {
                        const currentUrls = [...(settings.additionalGoogleSheetsUrls || [])];
                        currentUrls[idx] = e.target.value;
                        setSettings(prev => ({
                          ...prev,
                          additionalGoogleSheetsUrls: currentUrls
                        }));
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                ))}

                <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 space-y-1">
                  <p className="text-[9px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info size={12} /> Dica de Compartilhamento
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase leading-relaxed">
                    Certifique-se de que a planilha possui as abas com nomes correspondentes em português: <strong className="text-slate-700 dark:text-slate-200">"Vendas"</strong>, <strong className="text-slate-700 dark:text-slate-200">"Produtos"</strong>, <strong className="text-slate-700 dark:text-slate-200">"Clientes"</strong>, <strong className="text-slate-700 dark:text-slate-200">"Marcas"</strong> e <strong className="text-slate-700 dark:text-slate-200">"Custos Fixos"</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Bidirectional Sync Options */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center">
                  <RefreshCw size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Opções de Sincronização Automática</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Habilite as atualizações instantâneas automáticas e de segundo plano</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* 3a. Auto-sync Toggle */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Sincronização Bidirecional em Tempo Real</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">
                      Lê atualizações da planilha a cada 30 segundos e grava alterações locais automaticamente na nuvem após 5 segundos.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.autoSyncSheetsEnabled !== false}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          autoSyncSheetsEnabled: e.target.checked
                        });
                      }}
                    />
                    <div className="w-8 h-4.5 bg-slate-250 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* 4. Manual Sync Trigger Buttons */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Activity size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Ações de Sincronização Manual</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Forçar leitura ou gravação de dados instantaneamente</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pull Button */}
                <button
                  type="button"
                  onClick={() => handleSyncGoogleSheetsLive && handleSyncGoogleSheetsLive(false)}
                  disabled={isSyncingSheets || !settings.googleSheetsUrl}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-4 text-left hover:border-emerald-500 hover:shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center shrink-0">
                    {isSyncingSheets ? <RefreshCw className="animate-spin" size={20} /> : <Download size={20} />}
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black uppercase tracking-wide text-slate-800 dark:text-white">Puxar Dados da Planilha</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Carrega e importa produtos, vendas e clientes para este dispositivo</p>
                  </div>
                </button>

                {/* Push Button */}
                <button
                  type="button"
                  onClick={() => handleExportToGoogleSheetsLive && handleExportToGoogleSheetsLive(false)}
                  disabled={isExportingSheets || !settings.googleSheetsUrl || !driveToken}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-4 text-left hover:border-blue-500 hover:shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center shrink-0">
                    {isExportingSheets ? <RefreshCw className="animate-spin" size={20} /> : <Upload size={20} />}
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black uppercase tracking-wide text-slate-800 dark:text-white">Enviar Dados para a Planilha</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Sobrescreve e atualiza a planilha na nuvem com os dados locais</p>
                  </div>
                </button>
              </div>

              {!driveToken && settings.googleSheetsUrl && (
                <p className="text-[9px] text-amber-500 font-bold uppercase text-center bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                  ⚠️ Para enviar dados do sistema para a planilha Google Sheets, você precisa primeiro clicar no botão "Conectar Conta Google" acima para autorizar a gravação de arquivos no seu Google Drive.
                </p>
              )}
            </div>
            
            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-right">
              <button 
                onClick={() => addNotification('Opções de sincronização salvas com sucesso!', 'success')}
                className="px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-100 dark:shadow-none"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛠️ Painel de Auditoria do Sistema Link */}
      <div className="bg-slate-50 dark:bg-slate-850/40 p-6 rounded-[28px] border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl flex items-center justify-center">
            <ClipboardList size={22} className="text-slate-500" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
              🛠️ Auditoria do Sistema
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
              Acesse as ferramentas de integridade, diagnósticos de fuso horário e controle técnico de planilhas.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (setActiveDashboardTab && setActiveTab) {
              setActiveDashboardTab('operacoes');
              setActiveTab('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-3xs cursor-pointer shrink-0"
        >
          Acessar Auditoria
        </button>
      </div>
    </div>
  );
};
