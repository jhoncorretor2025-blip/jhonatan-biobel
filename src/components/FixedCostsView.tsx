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

export const FixedCostsView = ({ fixedCosts, setFixedCosts, formatCurrency, addNotification, handleFirestoreError, user, ensureAuthSession }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCost, setNewCost] = useState({ description: '', amount: 0, dueDate: 1 });

  const totalCosts = fixedCosts.reduce((acc: number, cost: any) => acc + cost.amount, 0);

  const handleAddCost = async () => {
    const cost: FixedCost = {
      id: Math.random().toString(36).substr(2, 9),
      description: newCost.description,
      amount: Number(newCost.amount),
      dueDate: Number(newCost.dueDate),
      status: 'pending'
    };

    try {
      setFixedCosts([...fixedCosts, cost]);
      addNotification('Custo fixo adicionado!', 'success');
      setIsModalOpen(false);
      setNewCost({ description: '', amount: 0, dueDate: 1 });
    } catch (error: any) {
      addNotification('Erro ao adicionar custo fixo.', 'error');
    }
  };

  const toggleStatus = async (id: string) => {
    const cost = fixedCosts.find((c: any) => c.id === id);
    if (!cost) return;

    const updatedCost = { ...cost, status: cost.status === 'paid' ? 'pending' : 'paid' };

    try {
      setFixedCosts(fixedCosts.map((c: any) => c.id === id ? updatedCost : c));
    } catch (error: any) {
      addNotification('Erro ao atualizar status.', 'error');
    }
  };

  const removeCost = async (id: string) => {
    if (!window.confirm('Excluir este custo fixo?')) return;
    try {
      setFixedCosts(fixedCosts.filter((c: any) => c.id !== id));
      addNotification('Custo fixo removido.', 'info');
    } catch (error: any) {
      addNotification('Erro ao remover custo fixo.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Custos Fixos</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all"
        >
          <Plus size={18} /> Adicionar Custo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 col-span-2">
          <div className="space-y-4">
            {fixedCosts.map((cost: any) => (
              <div key={cost.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleStatus(cost.id)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      cost.status === 'paid' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                    )}
                  >
                    {cost.status === 'paid' && <Check size={14} />}
                  </button>
                  <div>
                    <p className="font-black text-slate-900 uppercase text-xs">{cost.description}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vencimento: Dia {cost.dueDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <p className="font-black text-slate-900">{formatCurrency(cost.amount)}</p>
                  <button 
                    onClick={() => removeCost(cost.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl space-y-6">
            <div className="space-y-1">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Mensal Estimado</p>
              <h3 className="text-4xl font-black tracking-tight">{formatCurrency(totalCosts)}</h3>
            </div>
            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Pagos</span>
                <span className="text-sm font-black text-emerald-400">
                  {formatCurrency(fixedCosts.filter((c: any) => c.status === 'paid').reduce((acc: number, c: any) => acc + c.amount, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Pendentes</span>
                <span className="text-sm font-black text-rose-400">
                  {formatCurrency(fixedCosts.filter((c: any) => c.status === 'pending').reduce((acc: number, c: any) => acc + c.amount, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Novo Custo Fixo</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</label>
                  <input 
                    type="text" 
                    value={newCost.description}
                    onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                    placeholder="Ex: Aluguel"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor (R$)</label>
                    <input 
                      type="number" 
                      value={newCost.amount}
                      onChange={(e) => setNewCost({ ...newCost, amount: Number(e.target.value) })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dia Vencimento</label>
                    <input 
                      type="number" 
                      min="1"
                      max="31"
                      value={newCost.dueDate}
                      onChange={(e) => setNewCost({ ...newCost, dueDate: Number(e.target.value) })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                <button 
                  onClick={handleAddCost}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
