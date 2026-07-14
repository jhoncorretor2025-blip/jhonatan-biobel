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

export const AdminProfileView = ({ settings, setSettings, addNotification, handleFirestoreError, user, setUser }: any) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState(settings.adminPhoto || '');
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || '#2563eb');
  const [theme, setTheme] = useState(settings.theme || 'light');
  const [keyboardShortcutsEnabled, setKeyboardShortcutsEnabled] = useState(settings.keyboardShortcutsEnabled ?? true);
  const [emailPrefs, setEmailPrefs] = useState(settings.emailNotifications || {
    salesSummary: true,
    lowStock: true,
    dailyBackup: true
  });

  const handleSaveProfile = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      addNotification('As senhas não coincidem.', 'error');
      return;
    }

    const updatedSettings = {
      ...settings,
      adminPhoto: photoUrl || null,
      adminPassword: newPassword || settings.adminPassword || 'admin',
      primaryColor,
      theme,
      keyboardShortcutsEnabled,
      emailNotifications: emailPrefs
    };

    try {
      setSettings(updatedSettings);
      localStorage.setItem('biobel_settings', JSON.stringify(updatedSettings));
      
      // Update current user state to reflect photo change immediately
      if (user) {
        setUser({
          ...user,
          photoURL: photoUrl || null
        });
      }

      addNotification('Perfil e preferências salvos com sucesso!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      addNotification('Erro ao atualizar perfil.', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit for base64
        addNotification('A imagem é muito grande. Escolha uma imagem menor que 500KB.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg">
          <UserIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Perfil do Administrador</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gerencie sua foto e senha de acesso</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm p-8 space-y-8">
        <div className="flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-slate-50 dark:border-slate-800 overflow-hidden shadow-xl bg-slate-100 dark:bg-slate-800">
              {photoUrl && photoUrl.length > 5 ? (
                <img src={photoUrl} alt="Admin" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <UserCircle size={64} />
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-all hover:scale-110 active:scale-95">
              <Camera size={18} />
              <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
            </label>
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Foto do Perfil</p>
            <p className="text-[10px] text-slate-500">Clique no ícone da câmera para alterar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Deixe em branco para manter a atual"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Palette size={18} className="text-blue-600" />
            Cores e Estilo do Sistema
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cor Principal</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-12 w-12 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                />
                <input 
                  type="text" 
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900 dark:text-white transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tema do Sistema</label>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl transition-colors h-12">
                <button 
                  onClick={() => setTheme('light')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all",
                    theme === 'light' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  <Sun size={14} /> Claro
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all",
                    theme === 'dark' ? "bg-slate-800 dark:bg-slate-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  <Moon size={14} /> Escuro
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Novas Preferências de Segurança e Atalhos */}
        <div className="grid grid-cols-1 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Lock size={18} className="text-blue-600" />
            Preferências, Segurança & Atalhos
          </h3>

          <div className="space-y-4">
            {/* Atalhos de Teclado */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
              <div className="space-y-0.5 pr-4 text-left">
                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Atalhos Rápidos de Teclado (PDV)</p>
                <p className="text-[10px] text-slate-400 font-bold leading-normal">
                  Habilita teclas de navegação rápida: **F2** abre o caixa/PDV imediatamente, **F8** aceita ou finaliza a venda corrente e **F9** limpa o carrinho.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={keyboardShortcutsEnabled}
                  onChange={(e) => setKeyboardShortcutsEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Notificações por E-mail */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50 space-y-4 text-left">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Mail size={16} className="text-blue-600" />
                <span className="text-xs font-black uppercase tracking-wider">Configuração de Notificação por E-mail</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { key: 'salesSummary', label: 'Resumo Diário', desc: 'Receba faturamento diário consolidado.' },
                  { key: 'lowStock', label: 'Estoque Baixo', desc: 'Alertas de reposição de cosméticos.' },
                  { key: 'dailyBackup', label: 'Backup Diário', desc: 'Envio seguro dos dados consolidados.' }
                ].map((item) => (
                  <label key={item.key} className="flex flex-col justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{item.label}</span>
                      <input 
                        type="checkbox" 
                        checked={emailPrefs[item.key as keyof typeof emailPrefs]}
                        onChange={(e) => setEmailPrefs({
                          ...emailPrefs,
                          [item.key]: e.target.checked
                        })}
                        className="w-4 h-4 rounded text-blue-600 border-none bg-slate-100 dark:bg-slate-850"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold leading-normal">{item.desc}</p>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSaveProfile}
          className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Salvar Alterações
        </button>
      </div>
    </div>
  );
};
