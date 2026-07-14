import { SaleRow, SaleMobileCard } from './BackupView';
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

export const SalesView = ({ 
  sales, 
  setSales, 
  customers, 
  setCustomers,
  products,
  setProducts,
  cashierSessions = [],
  setCashierSessions,
  currentCashierSession,
  setCurrentCashierSession,
  formatDate, 
  formatCurrency, 
  handleFirestoreError, 
  user, 
  ensureAuthSession, 
  addNotification,
  isCashierOpen,
  setCurrentView,
  selectedMonth,
  setSelectedMonth,
  monthlyGoals,
  staff = [],
  handleWhatsAppShare,
  handlePrintReceipt,
  handleCopyText,
  handleDownloadPDF,
  weatherObservations,
  raffles,
  setRaffles
}: SalesViewProps & { isCashierOpen: boolean, setCurrentView: (v: string) => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vendedoraFilter, setVendedoraFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState<'today' | 'this_month' | 'last_30_days' | 'last_90_days' | 'all' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'timeline'>('info');

  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Sale>>({});

  const handleEditSaleClick = (sale: Sale) => {
    setEditingSale(sale);
    setEditFormData({
      ...sale,
      date: (() => {
        try {
          const d = new Date(sale.date);
          const tzOffset = d.getTimezoneOffset() * 60000;
          return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        } catch {
          return sale.date;
        }
      })()
    });
  };

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    monthlyGoals.forEach((g: any) => {
      if (g.month) months.add(g.month.toLowerCase().trim());
    });
    sales.forEach((s: any) => {
      try {
        const d = getSafeDate(s.date);
        const mName = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toLowerCase().trim();
        if (mName) months.add(mName);
      } catch (e) {}
    });
    if (selectedMonth) months.add(selectedMonth.toLowerCase().trim());
    return Array.from(months).map(m => m.charAt(0).toUpperCase() + m.slice(1));
  }, [monthlyGoals, sales, selectedMonth]);

  useEffect(() => {
    if (selectedSale) {
      setEditingNotes(selectedSale.notes || '');
    }
  }, [selectedSale]);

  const handleUpdateNotes = async () => {
    if (!selectedSale) return;
    try {
      setSales(prev => prev.map(s => s.id === selectedSale.id ? { ...s, notes: editingNotes } : s));
      addNotification('Observações da venda atualizadas!', 'success');
      setSelectedSale(prev => prev ? { ...prev, notes: editingNotes } : null);
    } catch (error: any) {
      addNotification('Erro ao atualizar observações.', 'error');
    }
  };

  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    let result = sales.filter(s => {
      const matchesSearch = s.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.vendedora?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusValue = s.status === 'completed' ? 'Concluída' : 
                          s.status === 'returned' ? 'Devolvida' : 
                          s.status === 'pending' ? 'Pendente' : s.status;

      const matchesStatus = statusFilter ? statusValue === statusFilter : true;
      const matchesVendedora = vendedoraFilter ? s.vendedora?.toUpperCase() === vendedoraFilter.toUpperCase() : true;
      
      const saleDate = getSafeDate(s.date);
      const saleMonth = saleDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      
      let matchesTime = true;
      if (timeFilter === 'today') {
        const today = new Date();
        matchesTime = saleDate.getDate() === today.getDate() &&
                      saleDate.getMonth() === today.getMonth() &&
                      saleDate.getFullYear() === today.getFullYear();
      } else if (timeFilter === 'this_month') {
        matchesTime = saleMonth.toLowerCase().trim() === selectedMonth.toLowerCase().trim();
      } else if (timeFilter === 'last_30_days') {
        matchesTime = saleDate >= thirtyDaysAgo;
      } else if (timeFilter === 'last_90_days') {
        matchesTime = saleDate >= ninetyDaysAgo;
      } else if (timeFilter === 'custom') {
        const matchesStartDate = startDate ? saleDate >= getSafeDate(startDate + 'T00:00:00') : true;
        const matchesEndDate = endDate ? saleDate <= getSafeDate(endDate + 'T23:59:59') : true;
        matchesTime = matchesStartDate && matchesEndDate;
      }
      
      return matchesSearch && matchesStatus && matchesTime && matchesVendedora;
    });

    // Default sort by date descending
    result = [...result].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sortOrder) {
      result = [...result].sort((a, b) => {
        if (sortOrder === 'asc') return a.total - b.total;
        return b.total - a.total;
      });
    }

    return result;
  }, [sales, searchTerm, statusFilter, vendedoraFilter, sortOrder, timeFilter, startDate, endDate, selectedMonth]);

  const handleStatusChange = useCallback(async (saleId: string, newStatus: string) => {
    try {
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: newStatus } : s));
      addNotification('Status da venda updated!', 'success');
    } catch (error: any) {
      addNotification('Erro ao atualizar status.', 'error');
    }
  }, [setSales, addNotification]);

  const handleDeleteSale = useCallback(async (saleId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta venda permanentemente? Esta ação não pode ser desfeita e reverterá o estoque e saldo dos clientes.')) return;
    try {
      const saleToDelete = sales.find(s => s.id === saleId);
      if (saleToDelete) {
        // 1. Restore product stock
        if (setProducts) {
          setProducts(prev => {
            const newProducts = [...prev];
            saleToDelete.items.forEach(item => {
              const product = newProducts.find(p => p.id === item.productId);
              if (product) {
                const isKitOrCombo = product.type === 'combo' || product.type === 'kit';
                const isMontar = isKitOrCombo && (product.kitMode === 'montar' || !product.kitMode);
                if (isMontar && product.comboItems && product.comboItems.length > 0) {
                  product.comboItems.forEach(comboItem => {
                    const component = newProducts.find(p => p.id === comboItem.productId);
                    if (component) {
                      component.stock += comboItem.quantity * item.quantity;
                    }
                  });
                } else {
                  product.stock += item.quantity;
                }
              }
            });
            return newProducts;
          });
        }

        // 2. Revert customer points and debt
        if (setCustomers && saleToDelete.customerId && saleToDelete.customerId !== 'consumidor-final') {
          setCustomers(prev => prev.map(c => {
            if (c.id === saleToDelete.customerId) {
              const pointsToSubtract = Math.floor(saleToDelete.total);
              const newPoints = Math.max(0, (c.points || 0) - pointsToSubtract);
              let newDebt = c.debt || 0;
              if (saleToDelete.paymentMethod === 'FIADO') {
                newDebt = Math.max(0, newDebt - saleToDelete.total);
              } else if (saleToDelete.payments) {
                const fiadoAmount = saleToDelete.payments.filter((p: any) => p.method === 'FIADO').reduce((acc: number, p: any) => acc + p.amount, 0);
                newDebt = Math.max(0, newDebt - fiadoAmount);
              }
              return { ...c, points: newPoints, debt: newDebt };
            }
            return c;
          }));
        }

        // 3. Revert cashier session payments if applicable
        if (setCashierSessions && saleToDelete.sessionId) {
          const targetSession = cashierSessions.find(s => s.id === saleToDelete.sessionId) || (currentCashierSession?.id === saleToDelete.sessionId ? currentCashierSession : null);
          if (targetSession) {
            const updatedPayments = { ...targetSession.payments };
            const subtractPayment = (method: string, amount: number) => {
              const normalizedMethod = method.toLowerCase();
              let field: keyof CashierSession['payments'] = 'outros';
              if (normalizedMethod === 'pix') field = 'pix';
              else if (normalizedMethod === 'dinheiro') field = 'dinheiro';
              else if (normalizedMethod === 'débito') field = 'debito';
              else if (normalizedMethod === 'crédito' || normalizedMethod === 'parcelado' || normalizedMethod === 'link') field = 'credito';
              updatedPayments[field] = Math.max(0, (updatedPayments[field] || 0) - amount);
            };

            if (saleToDelete.payments && saleToDelete.payments.length > 0) {
              saleToDelete.payments.forEach((p: any) => subtractPayment(p.method, p.amount));
            } else {
              subtractPayment(saleToDelete.paymentMethod, saleToDelete.total);
            }

            const updatedSession = {
              ...targetSession,
              payments: updatedPayments
            };

            if (setCurrentCashierSession && currentCashierSession?.id === updatedSession.id) {
              setCurrentCashierSession(updatedSession);
            }
            setCashierSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
          }
        }

        // 4. Revert raffle tickets
        if (setRaffles) {
          saleToDelete.items.forEach((item: any) => {
            if (item.isRaffle && item.raffleId && item.raffleTicketNumber) {
              setRaffles(prev => prev.map(r => {
                if (r.id === item.raffleId) {
                  return {
                    ...r,
                    tickets: r.tickets.map(t => {
                      if (t.number === item.raffleTicketNumber) {
                        return {
                          ...t,
                          buyerName: '',
                          buyerPhone: '',
                          status: 'available',
                          vendedora: undefined,
                          soldAt: undefined
                        };
                      }
                      return t;
                    })
                  };
                }
                return r;
              }));
            }
          });
        }
      }

      setSales(prev => prev.filter(s => s.id !== saleId));
      addNotification('Venda excluída com sucesso!', 'success');
      if (selectedSale?.id === saleId) {
        setSelectedSale(null);
      }
    } catch (error: any) {
      addNotification('Erro ao excluir venda.', 'error');
    }
  }, [sales, setSales, setProducts, setCustomers, setCashierSessions, cashierSessions, currentCashierSession, setCurrentCashierSession, addNotification, selectedSale, setSelectedSale, setRaffles]);

  const handleSaveEditedSale = () => {
    if (!editingSale) return;

    const selectedStaff = staff?.find(st => st.name === editFormData.vendedora);
    const commissionRate = (selectedStaff?.commission || 0) / 100;
    const newCommission = (editFormData.total || 0) * commissionRate;

    // 1. Revert previous customer debt
    if (setCustomers && editingSale.customerId && editingSale.customerId !== 'consumidor-final') {
      setCustomers(prev => prev.map(c => {
        if (c.id === editingSale.customerId) {
          const pointsToSubtract = Math.floor(editingSale.total);
          const newPoints = Math.max(0, (c.points || 0) - pointsToSubtract);
          let newDebt = c.debt || 0;
          if (editingSale.paymentMethod === 'FIADO') {
            newDebt = Math.max(0, newDebt - editingSale.total);
          } else if (editingSale.payments) {
            const fiadoAmount = editingSale.payments.filter((p: any) => p.method === 'FIADO').reduce((acc: number, p: any) => acc + p.amount, 0);
            newDebt = Math.max(0, newDebt - fiadoAmount);
          }
          return { ...c, points: newPoints, debt: newDebt };
        }
        return c;
      }));
    }

    // 2. Apply new customer debt
    if (setCustomers && editFormData.customerId && editFormData.customerId !== 'consumidor-final') {
      setCustomers(prev => prev.map(c => {
        if (c.id === editFormData.customerId) {
          const pointsToAdd = Math.floor(editFormData.total || 0);
          const newPoints = (c.points || 0) + pointsToAdd;
          let newDebt = c.debt || 0;
          if (editFormData.paymentMethod === 'FIADO') {
            newDebt += (editFormData.total || 0);
          } else if (editFormData.payments) {
            const fiadoAmount = editFormData.payments.filter((p: any) => p.method === 'FIADO').reduce((acc: number, p: any) => acc + p.amount, 0);
            newDebt += fiadoAmount;
          }
          return { ...c, points: newPoints, debt: newDebt };
        }
        return c;
      }));
    }

    // 3. Revert and apply to cashier session payments
    if (setCashierSessions && editingSale.sessionId) {
      const targetSession = cashierSessions.find(s => s.id === editingSale.sessionId) || (currentCashierSession?.id === editingSale.sessionId ? currentCashierSession : null);
      if (targetSession) {
        let updatedPayments = { ...targetSession.payments };
        
        const subtractPayment = (method: string, amount: number) => {
          const normalizedMethod = method.toLowerCase();
          let field: keyof CashierSession['payments'] = 'outros';
          if (normalizedMethod === 'pix') field = 'pix';
          else if (normalizedMethod === 'dinheiro') field = 'dinheiro';
          else if (normalizedMethod === 'débito') field = 'debito';
          else if (normalizedMethod === 'crédito' || normalizedMethod === 'parcelado' || normalizedMethod === 'link') field = 'credito';
          updatedPayments[field] = Math.max(0, (updatedPayments[field] || 0) - amount);
        };

        const addPayment = (method: string, amount: number) => {
          const normalizedMethod = method.toLowerCase();
          let field: keyof CashierSession['payments'] = 'outros';
          if (normalizedMethod === 'pix') field = 'pix';
          else if (normalizedMethod === 'dinheiro') field = 'dinheiro';
          else if (normalizedMethod === 'débito') field = 'debito';
          else if (normalizedMethod === 'crédito' || normalizedMethod === 'parcelado' || normalizedMethod === 'link') field = 'credito';
          updatedPayments[field] = (updatedPayments[field] || 0) + amount;
        };

        // Subtract old
        if (editingSale.payments && editingSale.payments.length > 0) {
          editingSale.payments.forEach((p: any) => subtractPayment(p.method, p.amount));
        } else {
          subtractPayment(editingSale.paymentMethod, editingSale.total);
        }

        // Add new
        if (editFormData.payments && editFormData.payments.length > 0) {
          editFormData.payments.forEach((p: any) => addPayment(p.method, p.amount));
        } else {
          addPayment(editFormData.paymentMethod || editingSale.paymentMethod, editFormData.total || editingSale.total);
        }

        const updatedSession = {
          ...targetSession,
          payments: updatedPayments
        };

        if (setCurrentCashierSession && currentCashierSession?.id === updatedSession.id) {
          setCurrentCashierSession(updatedSession);
        }
        setCashierSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
      }
    }

    setSales(prev => prev.map(s => {
      if (s.id === editingSale.id) {
        return {
          ...s,
          date: editFormData.date ? new Date(editFormData.date).toISOString() : s.date,
          customerId: editFormData.customerId || s.customerId,
          customerName: editFormData.customerName || s.customerName,
          customerPhone: editFormData.customerPhone || s.customerPhone,
          vendedora: editFormData.vendedora || s.vendedora,
          total: Number(editFormData.total) || s.total,
          discount: Number(editFormData.discount) || s.discount,
          paymentMethod: editFormData.paymentMethod || s.paymentMethod,
          type: editFormData.type || s.type,
          notes: editFormData.notes || s.notes,
          commission: newCommission,
          status: editFormData.status || s.status
        };
      }
      return s;
    }));

    addNotification('Registro de venda editado e atualizado com sucesso!', 'success');
    setEditingSale(null);
  };

  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>();
    sales.forEach(s => {
      const statusValue = s.status === 'completed' ? 'Concluída' : 
                          s.status === 'returned' ? 'Devolvida' : 
                          s.status === 'pending' ? 'Pendente' : s.status;
      if (statusValue) statuses.add(statusValue);
    });
    return Array.from(statuses).sort();
  }, [sales]);

  const availableVendedoras = useMemo(() => {
    const list = new Set<string>();
    sales.forEach(s => {
      if (s.vendedora) {
        list.add(s.vendedora.trim().toUpperCase());
      }
    });
    if (staff) {
      staff.forEach(item => {
        if (item.name) {
          list.add(item.name.trim().toUpperCase());
        }
      });
    }
    return Array.from(list).sort();
  }, [sales, staff]);

  const salesSummary = useMemo(() => {
    return {
      count: filteredSales.length,
      total: filteredSales.reduce((acc, s) => acc + s.total, 0)
    };
  }, [filteredSales]);

  const monthlyMaxItems = useMemo(() => {
    const maxMap: { [key: string]: number } = {};
    sales.forEach(s => {
      // ignore returned
      if (s.status === 'returned' || s.status === 'Devolvida') return;
      try {
        const d = getSafeDate(s.date);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const totalItems = s.items ? s.items.reduce((acc, item) => acc + (item.quantity || 1), 0) : 0;
        if (totalItems > 0) {
          if (!maxMap[mKey] || totalItems > maxMap[mKey]) {
            maxMap[mKey] = totalItems;
          }
        }
      } catch (e) {}
    });
    return maxMap;
  }, [sales]);

  const checkIsMaxVolume = useCallback((sale: Sale) => {
    if (sale.status === 'returned' || sale.status === 'Devolvida') return false;
    try {
      const d = getSafeDate(sale.date);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const totalItems = sale.items ? sale.items.reduce((acc, item) => acc + (item.quantity || 1), 0) : 0;
      return totalItems > 1 && totalItems === monthlyMaxItems[mKey];
    } catch (e) {
      return false;
    }
  }, [monthlyMaxItems]);

  return (
    <div className="space-y-4">
      {/* Sales Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Vendas</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{salesSummary.count}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ShoppingCart size={24} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento Total</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{formatCurrency(salesSummary.total)}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar vendas..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            {[
              { id: 'today', label: 'Hoje' },
              { id: 'this_month', label: 'Este Mês' },
              { id: 'last_30_days', label: '30 Dias' },
              { id: 'last_90_days', label: '90 Dias' },
              { id: 'all', label: 'Tudo' },
              { id: 'custom', label: 'Personalizado' },
            ].map((period) => (
              <button
                key={period.id}
                onClick={() => setTimeFilter(period.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  timeFilter === period.id 
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {period.label}
              </button>
            ))}
          </div>

          {timeFilter === 'this_month' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <Calendar size={16} className="text-slate-400" />
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-0 cursor-pointer p-0"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {timeFilter === 'custom' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <Calendar size={16} className="text-slate-400" />
              <div className="flex items-center gap-1">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-0 cursor-pointer p-0 w-24"
                />
                <span className="text-slate-300 font-bold">ATÉ</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-0 cursor-pointer p-0 w-24"
                />
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <Filter size={16} className="text-slate-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-0 cursor-pointer"
            >
              <option value="">Todos os Status</option>
              {availableStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <Users size={16} className="text-slate-400" />
            <select 
              value={vendedoraFilter}
              onChange={(e) => setVendedoraFilter(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-0 cursor-pointer"
            >
              <option value="">Todas Vendedoras</option>
              {availableVendedoras.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200">
            <Download size={20} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto hidden lg:block">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Data / Hora</th>
              <th className="px-6 py-4">Vendedora</th>
              <th className="px-6 py-4">Itens</th>
              <th className="px-6 py-4">Categoria</th>
              <th className="px-6 py-4">Pagamento</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center">Tipo</th>
              <th className="px-6 py-4 text-right">Comissão</th>
              <th 
                className="px-6 py-4 text-right cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              >
                <div className="flex items-center justify-end gap-1">
                  Total
                  <TrendingUp size={12} className={cn(sortOrder === 'asc' && "rotate-180", !sortOrder && "opacity-0")} />
                </div>
              </th>
              <th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.slice(0, visibleCount).map((sale) => (
              <SaleRow 
                key={sale.id} 
                sale={sale} 
                formatCurrency={formatCurrency} 
                handleStatusChange={handleStatusChange} 
                setSelectedSale={setSelectedSale} 
                handleWhatsAppShare={handleWhatsAppShare}
                handlePrintReceipt={handlePrintReceipt}
                isMaxVolume={checkIsMaxVolume(sale)}
                weatherObservations={weatherObservations}
                handleEditSale={handleEditSaleClick}
                handleDeleteSale={handleDeleteSale}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredSales.length > visibleCount && (
        <div className="p-6 text-center border-t border-slate-100">
          <button 
            onClick={() => setVisibleCount(prev => prev + 20)}
            className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Carregar Mais ({filteredSales.length - visibleCount} restantes)
          </button>
        </div>
      )}

      {/* Mobile Sales Cards */}
      <div className="lg:hidden divide-y divide-slate-100">
        {filteredSales.slice(0, visibleCount).map((sale) => (
          <SaleMobileCard 
            key={sale.id} 
            sale={sale} 
            formatCurrency={formatCurrency} 
            handleStatusChange={handleStatusChange} 
            setSelectedSale={setSelectedSale} 
            handleWhatsAppShare={handleWhatsAppShare}
            handlePrintReceipt={handlePrintReceipt}
            isMaxVolume={checkIsMaxVolume(sale)}
            weatherObservations={weatherObservations}
            handleEditSale={handleEditSaleClick}
            handleDeleteSale={handleDeleteSale}
          />
        ))}
        {filteredSales.length > visibleCount && (
          <div className="p-4 text-center">
            <button 
              onClick={() => setVisibleCount(prev => prev + 20)}
              className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Carregar Mais
            </button>
          </div>
        )}
      </div>

      {/* Sale Details Modal */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Detalhes da Venda</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {selectedSale.id}</p>
                </div>
                <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                    <p className="text-sm font-bold text-slate-900">{selectedSale.customerName}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vendedora</p>
                    <p className="text-sm font-bold text-slate-900">{selectedSale.vendedora}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data / Hora</p>
                    <p className="text-sm font-bold text-slate-900">{new Date(selectedSale.date).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pagamento</p>
                    <p className="text-sm font-bold text-slate-900">{selectedSale.paymentMethod}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens da Venda</h4>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest">
                        <tr>
                          <th className="px-4 py-3">Produto</th>
                          <th className="px-4 py-3 text-center">Qtd</th>
                          <th className="px-4 py-3 text-right">Preço</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedSale.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 font-bold text-slate-700">{item.name}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-500">{item.quantity}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-500">{formatCurrency(item.price)}</td>
                            <td className="px-4 py-3 text-right font-black text-slate-900">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações da Venda</h4>
                    <MessageSquare size={14} className="text-slate-300" />
                  </div>
                  <div className="space-y-3">
                    <textarea 
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      rows={3}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                      placeholder="Adicione observações sobre esta venda..."
                    />
                    <button 
                      onClick={handleUpdateNotes}
                      className="w-full py-2 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all"
                    >
                      Salvar Observações
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      selectedSale.status === 'Concluída' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {selectedSale.status}
                    </span>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total da Venda</p>
                    <p className="text-2xl font-black text-blue-600">{formatCurrency(selectedSale.total)}</p>
                  </div>
                </div>

                {/* Comprovantes e WhatsApp */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações do Comprovante</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {handlePrintReceipt && (
                      <button 
                        onClick={() => handlePrintReceipt(selectedSale)}
                        className="py-3 px-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2 text-xs font-bold text-slate-700 shadow-sm"
                        title="Imprimir Cupom Térmico"
                      >
                        <Printer size={16} className="text-blue-500" />
                        <span>Imprimir</span>
                      </button>
                    )}

                    {handleWhatsAppShare && (
                      <button 
                        onClick={() => handleWhatsAppShare(selectedSale)}
                        className="py-3 px-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-2 text-xs font-bold text-slate-700 shadow-sm"
                        title="Enviar via WhatsApp"
                      >
                        <MessageCircle size={16} className="text-emerald-500" />
                        <span>WhatsApp</span>
                      </button>
                    )}

                    {handleCopyText && (
                      <button 
                        onClick={() => handleCopyText(selectedSale)}
                        className="py-3 px-4 bg-white border border-slate-200 rounded-xl hover:border-rose-500 hover:text-rose-600 transition-all flex items-center justify-center gap-2 text-xs font-bold text-slate-700 shadow-sm"
                        title="Copiar Resumo"
                      >
                        <ClipboardList size={16} className="text-rose-500" />
                        <span>Copiar</span>
                      </button>
                    )}

                    {handleDownloadPDF && (
                      <button 
                        onClick={() => handleDownloadPDF(selectedSale)}
                        className="py-3 px-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 text-xs font-bold text-slate-700 shadow-sm"
                        title="Baixar Recibo em PDF"
                      >
                        <Download size={16} className="text-indigo-500" />
                        <span>PDF</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={async () => {
                    if (!confirm('Deseja realmente registrar a devolução desta venda?')) return;
                    try {
                      setSales(prev => prev.map(s => s.id === selectedSale.id ? { ...s, status: 'returned' } : s));
                      addNotification('Devolução registrada com sucesso!', 'success');
                      setSelectedSale(null);
                    } catch (error) {
                      addNotification('Erro ao processar devolução.', 'error');
                    }
                  }}
                  disabled={selectedSale.status === 'returned'}
                  className={cn(
                    "flex-1 py-4 border border-rose-200 text-rose-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-50 transition-all",
                    selectedSale.status === 'returned' && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Devolução
                </button>
                <button 
                  onClick={() => setSelectedSale(null)}
                  className="flex-[2] py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-100 transition-all"
                >
                  Fechar Detalhes
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {editingSale && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Editar Registro de Venda</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">ID: {editingSale.id}</p>
                </div>
                <button onClick={() => setEditingSale(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Data e Hora */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data / Hora</label>
                    <input 
                      type="datetime-local"
                      value={editFormData.date || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Vendedora */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Profissional / Vendedora</label>
                    <select
                      value={editFormData.vendedora || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, vendedora: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Selecione a Vendedora</option>
                      {staff?.map(st => (
                        <option key={st.id} value={st.name}>{st.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cliente */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</label>
                    <select
                      value={editFormData.customerId || 'consumidor-final'}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const cust = customers.find(c => c.id === selectedId);
                        setEditFormData(prev => ({
                          ...prev,
                          customerId: selectedId,
                          customerName: cust ? cust.name : 'Consumidor Final',
                          customerPhone: cust ? cust.phone || '' : ''
                        }));
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="consumidor-final">Consumidor Final</option>
                      {customers.filter(c => c.id !== 'consumidor-final').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Forma de Pagamento */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Forma de Pagamento</label>
                    <select
                      value={editFormData.paymentMethod || 'PIX'}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {['PIX', 'DINHEIRO', 'CARTÃO DE CRÉDITO', 'CARTÃO DE DÉBITO', 'FIADO', 'Múltiplo'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Valor Total */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Total (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editFormData.total || 0}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, total: Number(e.target.value) }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Desconto */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Desconto (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editFormData.discount || 0}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, discount: Number(e.target.value) }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Canal de Venda */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Canal de Venda</label>
                    <select
                      value={editFormData.type || 'Presencial'}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="Presencial">Presencial</option>
                      <option value="Digital">Digital</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status da Venda</label>
                    <select
                      value={editFormData.status || 'completed'}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="completed">Concluída</option>
                      <option value="pending">Pendente</option>
                      <option value="returned">Devolvida / Cancelada</option>
                    </select>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações</label>
                  <textarea 
                    value={editFormData.notes || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    rows={2}
                    placeholder="Notas ou observações adicionais..."
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setEditingSale(null)}
                  className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveEditedSale}
                  className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};

export const CashierView = ({ formatCurrency, isCashierOpen, currentSession, sessions, sales, onOpenCashier, onCloseCashier, onAddWithdrawal, formatDate }: CashierViewProps) => {
  const [openingBalance, setOpeningBalance] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [transactionType, setTransactionType] = useState<'withdrawal' | 'reinforcement'>('withdrawal');
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);

  const totalWithdrawals = currentSession?.withdrawals.filter(w => w.type === 'withdrawal').reduce((acc, w) => acc + w.amount, 0) || 0;
  const totalReinforcements = currentSession?.withdrawals.filter(w => w.type === 'reinforcement').reduce((acc, w) => acc + w.amount, 0) || 0;
  const estimatedCash = currentSession ? (currentSession.openingBalance + currentSession.payments.dinheiro + totalReinforcements - totalWithdrawals) : 0;
  
  const pix = currentSession?.payments.pix || 0;
  const debito = currentSession?.payments.debito || 0;
  const credito = currentSession?.payments.credito || 0;
  const dinheiro = currentSession?.payments.dinheiro || 0;
  const outros = currentSession?.payments.outros || 0;

  const sessionSales = sales.filter(s => s.sessionId === currentSession?.id);
  const allTransactions = [
    ...(currentSession?.withdrawals.map(w => ({ ...w, isSale: false })) || []),
    ...sessionSales.map(s => ({
      id: s.id,
      amount: s.total,
      reason: `Venda: ${s.customerName}`,
      time: s.date,
      type: 'reinforcement' as const,
      isSale: true,
      paymentMethod: s.paymentMethod
    }))
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Controle de Caixa</h2>
          <span className={cn(
            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
            isCashierOpen ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
          )}>
            {isCashierOpen ? 'ABERTO' : 'FECHADO'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <History size={16} />
            Histórico
          </button>
          {isCashierOpen ? (
            <button 
              onClick={() => setIsCloseModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
            >
              <X size={16} />
              Fechar Caixa
            </button>
          ) : (
            <button 
              onClick={() => setIsOpeningModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              <Plus size={16} />
              Abrir Caixa
            </button>
          )}
        </div>
      </div>

      {/* Main Balance Card */}
      <div className="bg-white rounded-2xl lg:rounded-[40px] p-6 lg:p-10 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none hidden lg:block">
          <DollarSign size={240} className="text-slate-900" />
        </div>
        
        <div className="relative z-10 space-y-6 lg:space-y-8">
          <div className="space-y-2">
            <p className="text-slate-400 text-[10px] lg:text-xs font-black uppercase tracking-widest">TOTAL EM CAIXA (DINHEIRO)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl lg:text-3xl font-black text-slate-400">R$</span>
              <h3 className="text-4xl lg:text-7xl font-black text-slate-900 tracking-tighter">
                {estimatedCash.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
            <button 
              disabled={!isCashierOpen}
              onClick={() => {
                setTransactionType('reinforcement');
                setWithdrawalReason('');
                setWithdrawalAmount('');
                setIsWithdrawalModalOpen(true);
              }}
              className="flex items-center justify-center gap-3 px-6 lg:px-8 py-3 lg:py-4 bg-blue-600 text-white rounded-xl lg:rounded-2xl font-black uppercase text-[10px] lg:text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={18} />
              Reforço de Caixa
            </button>
            <button 
              disabled={!isCashierOpen}
              onClick={() => {
                setTransactionType('withdrawal');
                setWithdrawalReason('');
                setWithdrawalAmount('');
                setIsWithdrawalModalOpen(true);
              }}
              className="flex items-center justify-center gap-3 px-6 lg:px-8 py-3 lg:py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-xl lg:rounded-2xl font-black uppercase text-[10px] lg:text-xs tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={18} />
              Sangria / Saída
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DINHEIRO</p>
          <p className="text-xl font-black text-emerald-500">
            {formatCurrency(dinheiro)}
          </p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PIX</p>
          <p className="text-xl font-black text-blue-500">
            {formatCurrency(pix)}
          </p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DÉBITO</p>
          <p className="text-xl font-black text-amber-500">
            {formatCurrency(debito)}
          </p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CRÉDITO</p>
          <p className="text-xl font-black text-purple-500">
            {formatCurrency(credito)}
          </p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OUTROS</p>
          <p className="text-xl font-black text-slate-500">
            {formatCurrency(outros)}
          </p>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Movimentações Recentes</h3>
          <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Ver todas</button>
        </div>
        <div className="p-0">
          {allTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">Nenhuma movimentação registrada hoje.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Horário</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo / Detalhe</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allTransactions.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{formatDate(t.time)}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest",
                          t.isSale ? "bg-emerald-50 text-emerald-600" :
                          t.type === 'withdrawal' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {t.isSale ? 'Venda' : (t.type === 'withdrawal' ? 'Sangria' : 'Reforço')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 uppercase">{t.reason}</span>
                          {t.isSale && <span className="text-[9px] text-slate-400 font-bold uppercase">{t.paymentMethod}</span>}
                        </div>
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-sm font-black text-right",
                        t.type === 'withdrawal' ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {t.type === 'withdrawal' ? '-' : '+'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Opening Modal */}
      <AnimatePresence>
        {isOpeningModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-8 bg-blue-600 text-white text-center space-y-2">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet size={32} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Abertura de Caixa</h3>
                <p className="text-blue-100 text-sm font-bold uppercase tracking-widest">Inicie o expediente</p>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Inicial em Caixa (R$)</label>
                  <input 
                    type="number" 
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="0,00"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-black text-2xl text-center"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsOpeningModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest">Cancelar</button>
                  <button 
                    onClick={() => {
                      onOpenCashier(Number(openingBalance) || 0);
                      setIsOpeningModalOpen(false);
                      setOpeningBalance('');
                    }}
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100"
                  >
                    Abrir Caixa
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sangria/Reforço Modal */}
      <AnimatePresence>
        {isWithdrawalModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Realizar {transactionType === 'withdrawal' ? 'Sangria' : 'Reforço'}</h3>
                <button onClick={() => setIsWithdrawalModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor do {transactionType === 'withdrawal' ? 'Sangria' : 'Reforço'} (R$)</label>
                  <input 
                    type="number" 
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    className={cn(
                      "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 font-bold",
                      transactionType === 'withdrawal' ? "focus:ring-rose-500" : "focus:ring-blue-500"
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo / Destino</label>
                  <input 
                    type="text" 
                    value={withdrawalReason}
                    onChange={(e) => setWithdrawalReason(e.target.value)}
                    placeholder={transactionType === 'withdrawal' ? "Ex: Pagamento fornecedor" : "Ex: Troco inicial"}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button onClick={() => setIsWithdrawalModalOpen(false)} className="flex-1 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                <button 
                  onClick={() => {
                    onAddWithdrawal(Number(withdrawalAmount), withdrawalReason, transactionType);
                    setIsWithdrawalModalOpen(false);
                    setWithdrawalAmount('');
                    setWithdrawalReason('');
                  }}
                  className={cn(
                    "flex-1 py-3 text-white rounded-xl font-black uppercase text-[10px] tracking-widest",
                    transactionType === 'withdrawal' ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fechamento Modal */}
      <AnimatePresence>
        {isCloseModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Fechar Caixa?</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">O saldo final será registrado</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl text-left space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>Saldo em Dinheiro</span>
                    <span>{formatCurrency(estimatedCash)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>Total em Outros Métodos</span>
                    <span>{formatCurrency(currentSession?.payments.pix + currentSession?.payments.debito + currentSession?.payments.credito + currentSession?.payments.outros || 0)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-[10px] font-black uppercase text-slate-900">
                    <span>Total Geral</span>
                    <span>{formatCurrency(estimatedCash + (currentSession?.payments.pix + currentSession?.payments.debito + currentSession?.payments.credito + currentSession?.payments.outros || 0))}</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setIsCloseModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                  <button 
                    onClick={() => {
                      onCloseCashier(estimatedCash);
                      setIsCloseModalOpen(false);
                    }}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest"
                  >
                    Fechar Agora
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
