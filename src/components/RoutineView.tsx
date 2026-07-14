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

export const RoutineView = ({ routines, setRoutines, staff, addNotification, handleFirestoreError, user, formatDate, ensureAuthSession }: RoutineViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [formData, setFormData] = useState<Partial<Routine>>({
    staffId: '', staffName: '', date: new Date().toISOString().split('T')[0],
    activities: [
      { id: '1', description: '☀️ Dar bom dia no grupo do WhatsApp', completed: false },
      { id: '2', description: '💬 Responder clientes no WhatsApp', completed: false },
      { id: '3', description: '📸 Postar ofertas no Grupo e Status', completed: false },
      { id: '4', description: '🚀 Disparar campanhas no privado', completed: false },
      { id: '5', description: '🧹 Organizar a loja e vitrine', completed: false },
      { id: '6', description: '🧽 Tirar pó dos móveis e produtos', completed: false },
      { id: '7', description: '📦 Reposição de produtos nas prateleiras', completed: false },
    ]
  });

  const handleOpenModal = (r?: Routine) => {
    if (r) {
      setEditingRoutine(r);
      setFormData(r);
    } else {
      setEditingRoutine(null);
      setFormData({
        staffId: '', staffName: '', date: new Date().toISOString().split('T')[0],
        activities: [
          { id: '1', description: '☀️ Dar bom dia no grupo do WhatsApp', completed: false },
          { id: '2', description: '💬 Responder clientes no WhatsApp', completed: false },
          { id: '3', description: '📸 Postar ofertas no Grupo e Status', completed: false },
          { id: '4', description: '🚀 Disparar campanhas no privado', completed: false },
          { id: '5', description: '🧹 Organizar a loja e vitrine', completed: false },
          { id: '6', description: '🧽 Tirar pó dos móveis e produtos', completed: false },
          { id: '7', description: '📦 Reposição de produtos nas prateleiras', completed: false },
        ]
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.staffId) {
      addNotification('Selecione um funcionário.', 'warning');
      return;
    }

    const routineData = {
      ...formData,
      id: editingRoutine?.id || `R${Date.now()}`
    } as Routine;

    try {
      if (editingRoutine) {
        setRoutines(prev => prev.map(r => r.id === editingRoutine.id ? routineData : r));
      } else {
        setRoutines(prev => [routineData, ...prev]);
      }
      addNotification('Rotina salva com sucesso!', 'success');
      setIsModalOpen(false);
    } catch (error: any) {
      addNotification('Erro ao salvar rotina.', 'error');
    }
  };

  const updateActivityStatus = async (routineId: string, activityId: string, status: 'start' | 'complete' | 'reset') => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;

    const updatedActivities = routine.activities.map(a => {
      if (a.id === activityId) {
        if (status === 'start') {
          return { ...a, startedAt: new Date().toISOString(), completed: false };
        } else if (status === 'complete') {
          return { ...a, completedAt: new Date().toISOString(), completed: true };
        } else {
          return { ...a, startedAt: undefined, completedAt: undefined, completed: false };
        }
      }
      return a;
    });

    try {
      setRoutines(prev => prev.map(r => r.id === routineId ? { ...r, activities: updatedActivities } : r));
    } catch (error: any) {
      addNotification('Erro ao atualizar atividade.', 'error');
    }
  };

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return '';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diff = e - s;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const calculateTotalTime = (activities: RoutineActivity[]) => {
    let totalMs = 0;
    activities.forEach(a => {
      if (a.startedAt && a.completedAt) {
        totalMs += (new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime());
      }
    });
    if (totalMs === 0) return null;
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const [routineToDelete, setRoutineToDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      console.log('Excluindo rotina com ID:', id);
      setRoutines(prev => prev.filter(r => r.id !== id));
      addNotification('Rotina removida com sucesso.', 'info');
      setRoutineToDelete(null);
    } catch (error: any) {
      console.error('Erro ao excluir rotina:', error);
      addNotification('Erro ao remover rotina.', 'error');
    }
  };

  const [routineToReset, setRoutineToReset] = useState<string | null>(null);

  const resetAllActivities = (routineId: string) => {
    setRoutines(prev => prev.map(r => r.id === routineId ? {
      ...r,
      activities: r.activities.map(a => ({ ...a, startedAt: undefined, completedAt: undefined, completed: false }))
    } : r));
    addNotification('Rotina reiniciada com sucesso.', 'info');
    setRoutineToReset(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Rotinas Diárias</h3>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Nova Rotina
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routines.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
            <ClipboardListIcon size={48} className="mb-4 opacity-20" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Nenhum checklist iniciado hoje</h4>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1">Clique em "Nova Rotina" para começar o acompanhamento</p>
            <button 
              onClick={() => handleOpenModal()}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
            >
              Iniciar Primeiro Checklist
            </button>
          </div>
        )}
        {routines.map(routine => {
          const completedCount = routine.activities.filter(a => a.completed).length;
          const totalCount = routine.activities.length;
          const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

          return (
            <div key={routine.id} className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 p-8 space-y-6 transition-all hover:shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{routine.staffName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={12} className="text-blue-600" />
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{routine.date.split('-').reverse().join('/')}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoutineToReset(routine.id);
                    }} 
                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all" 
                    title="Reiniciar Tudo"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button onClick={() => handleOpenModal(routine)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"><Edit2 size={16} /></button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoutineToDelete(routine.id);
                    }} 
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                    title="Excluir Rotina"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {calculateTotalTime(routine.activities) && (
                <div className="bg-blue-600 dark:bg-blue-500 p-6 rounded-[24px] shadow-lg shadow-blue-100 dark:shadow-none text-white relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Clock size={24} className="animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest leading-none mb-1 opacity-80">Tempo Total Investido</p>
                      <p className="text-2xl font-black uppercase tracking-tight flex items-baseline gap-1">
                        {calculateTotalTime(routine.activities)}
                        <span className="text-[10px] font-bold opacity-60">Acumulado</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Progresso</span>
                  <span className={cn(percentage === 100 ? "text-emerald-500" : "text-blue-600")}>
                    {completedCount}/{totalCount} ({Math.round(percentage)}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className={cn("h-full rounded-full transition-all duration-500", percentage === 100 ? "bg-emerald-500" : "bg-blue-600")}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {routine.activities.map(activity => (
                  <div 
                    key={activity.id}
                    className={cn(
                      "w-full p-4 rounded-2xl border transition-all space-y-3",
                      activity.completed 
                        ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20" 
                        : activity.startedAt 
                          ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20"
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                        activity.completed 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      )}>
                        {activity.completed && <Check size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn("text-xs font-bold uppercase tracking-tight block truncate", activity.completed && "line-through opacity-60")}>
                          {activity.description}
                        </span>
                        {activity.completed && activity.startedAt && activity.completedAt && (
                          <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                            <Clock size={10} />
                            Tempo: {calculateDuration(activity.startedAt, activity.completedAt)}
                          </span>
                        )}
                        {activity.startedAt && !activity.completed && (
                          <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                            <Clock size={10} />
                            Em andamento...
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!activity.startedAt && !activity.completed && (
                        <button 
                          onClick={() => updateActivityStatus(routine.id, activity.id, 'start')}
                          className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-1"
                        >
                          <Zap size={10} />
                          Iniciar
                        </button>
                      )}
                      {activity.startedAt && !activity.completed && (
                        <button 
                          onClick={() => updateActivityStatus(routine.id, activity.id, 'complete')}
                          className="flex-1 py-1.5 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-1"
                        >
                          <CheckCircle size={10} />
                          Finalizar
                        </button>
                      )}
                      {(activity.startedAt || activity.completed) && (
                        <button 
                          onClick={() => updateActivityStatus(routine.id, activity.id, 'reset')}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-rose-500 transition-all"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {percentage === 100 && (
                <div className="pt-2 animate-in fade-in zoom-in duration-500">
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                    <CheckCircle size={16} className="text-emerald-500" />
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Todas as tarefas pagas!</p>
                  </div>
                </div>
              )}
            </div>
        );
        })}
      </div>

      {routines.length > 0 && (
        <div className="mt-12 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Análise de Produtividade</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo médio gasto por atividade</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-4">Ranking de Tempo (Média)</h4>
              <div className="space-y-4">
                {Array.from(new Set(routines.flatMap(r => r.activities.map(a => a.description)))).map(desc => {
                  const tasks = routines.flatMap(r => r.activities).filter(a => a.description === desc && a.startedAt && a.completedAt);
                  if (tasks.length === 0) return null;
                  
                  const totalMs = tasks.reduce((acc, t) => acc + (new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime()), 0);
                  const avgMs = totalMs / tasks.length;
                  const avgMin = Math.floor(avgMs / 60000);
                  const avgSec = Math.round((avgMs % 60000) / 1000);
                  
                  return (
                    <div key={desc} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[200px]">{desc}</span>
                        <span className="text-indigo-600">{avgMin}m {avgSec}s</span>
                      </div>
                      <div className="h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (avgMs / (10 * 60 * 1000)) * 100)}%` }}
                          className="h-full bg-indigo-500 rounded-full" 
                        />
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
                {routines.every(r => r.activities.every(a => !a.completedAt)) && (
                  <p className="text-[10px] text-slate-400 font-bold uppercase py-10 text-center">Aguardando conclusão de atividades para gerar estatísticas...</p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                <Trophy size={32} />
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Destaque de Agilidade</h4>
              {(() => {
                const completedTasks = routines.flatMap(r => r.activities).filter(a => a.startedAt && a.completedAt);
                if (completedTasks.length === 0) return <p className="text-[10px] text-slate-400 font-bold uppercase">Nenhuma atividade concluída ainda</p>;
                
                const fastest = completedTasks.reduce((prev, curr) => {
                  const currDiff = new Date(curr.completedAt!).getTime() - new Date(curr.startedAt!).getTime();
                  const prevDiff = new Date(prev.completedAt!).getTime() - new Date(prev.startedAt!).getTime();
                  return currDiff < prevDiff ? curr : prev;
                });

                return (
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full inline-block mb-2">Execução Recorde:</p>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">{fastest.description}</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{calculateDuration(fastest.startedAt, fastest.completedAt)}</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {routineToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Excluir Rotina?</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-tight">
                  Tem certeza que deseja remover este checklist? Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setRoutineToDelete(null)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => handleDelete(routineToDelete)}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-200 dark:shadow-none"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {routineToReset && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <RefreshCw size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Reiniciar Rotina?</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-tight">
                  Tem certeza que deseja zerar todos os tempos deste checklist? A ação não poderá ser desfeita.
                </p>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setRoutineToReset(null)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => resetAllActivities(routineToReset)}
                    className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-200 dark:shadow-none"
                  >
                    Reiniciar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  {editingRoutine ? 'Editar Rotina' : 'Nova Rotina'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionário</label>
                  <select 
                    value={formData.staffId}
                    onChange={(e) => {
                      const s = staff.find(st => st.id === e.target.value);
                      setFormData({ ...formData, staffId: e.target.value, staffName: s?.name || '' });
                    }}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="">Selecione...</option>
                    {staff.filter(s => s.status !== 'inactive').map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atividades</label>
                  {formData.activities?.map((activity, index) => (
                    <div key={activity.id} className="flex gap-2">
                      <input 
                        type="text" 
                        value={activity.description}
                        onChange={(e) => {
                          const newActs = [...(formData.activities || [])];
                          newActs[index].description = e.target.value;
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
                  <div className="flex justify-between items-center mt-2">
                    <button 
                      onClick={() => {
                        const newActs = [...(formData.activities || []), { id: Date.now().toString(), description: '', completed: false }];
                        setFormData({ ...formData, activities: newActs });
                      }}
                      className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest"
                    >
                      <Plus size={14} /> Adicionar Atividade
                    </button>
                    <button 
                      onClick={() => {
                        setFormData({
                          ...formData,
                          activities: [
                            { id: '1', description: '☀️ Dar bom dia no grupo do WhatsApp', completed: false },
                            { id: '2', description: '💬 Responder clientes no WhatsApp', completed: false },
                            { id: '3', description: '📸 Postar ofertas no Grupo e Status', completed: false },
                            { id: '4', description: '🚀 Disparar campanhas no privado', completed: false },
                            { id: '5', description: '🧹 Organizar a loja e vitrine', completed: false },
                            { id: '6', description: '🧽 Tirar pó dos móveis e produtos', completed: false },
                            { id: '7', description: '📦 Reposição de produtos nas prateleiras', completed: false },
                          ]
                        });
                      }}
                      className="flex items-center gap-2 text-amber-600 font-black uppercase text-[10px] tracking-widest"
                    >
                      <RefreshCw size={14} /> Modelo Padrão
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl font-black uppercase tracking-widest">Cancelar</button>
                <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest">Salvar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
