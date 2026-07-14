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
    User, Brand, Category, Product, StockBatch, Staff, StoreSettings, Withdrawal, FixedCost, FinancialAccount, CashierSession, Campaign, Giveaway, RaffleTicket, Raffle, RoutineActivity, Routine, Customer, SaleItem, Payment, Sale, MonthlyGoal, DashboardViewProps, ProductsViewProps, StaffViewProps, RoutineViewProps, BackupViewProps, CustomersViewProps, SalesViewProps, CashierViewProps, CampaignsViewProps, AtendimentoViewProps, Notification, BrandsViewProps 
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

export const BrandsView = ({ brands, setBrands, sales, products, addNotification, handleFirestoreError, user, ensureAuthSession }: BrandsViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState('');

  const brandStats = useMemo(() => {
    const stats: { [key: string]: { totalSales: number, unitsSold: number, bestProduct: string } } = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product && product.brand) {
          const brand = product.brand.toUpperCase();
          if (!stats[brand]) stats[brand] = { totalSales: 0, unitsSold: 0, bestProduct: '' };
          stats[brand].totalSales += item.total;
          stats[brand].unitsSold += item.quantity;
        }
      });
    });

    // Find best product for each brand
    brands.forEach(brand => {
      const bName = brand.name.toUpperCase();
      const brandProducts = products.filter(p => p.brand.toUpperCase() === bName);
      let maxUnits = 0;
      let bestP = 'Nenhum';

      brandProducts.forEach(p => {
        const units = sales.reduce((acc, sale) => {
          const item = sale.items.find(i => i.productId === p.id);
          return acc + (item ? item.quantity : 0);
        }, 0);
        if (units > maxUnits) {
          maxUnits = units;
          bestP = p.name;
        }
      });
      if (stats[bName]) stats[bName].bestProduct = bestP;
    });

    return stats;
  }, [sales, products, brands]);

  const handleOpenModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandName(brand.name);
    } else {
      setEditingBrand(null);
      setBrandName('');
    }
    setIsModalOpen(true);
  };

  const addBrand = async () => {
    if (!brandName) return;
    
    const brandData: Brand = {
      id: editingBrand?.id || `B${Date.now()}`,
      name: brandName.toUpperCase()
    };

    try {
      if (editingBrand) {
        setBrands(brands.map(b => b.id === brandData.id ? brandData : b));
      } else {
        setBrands([...brands, brandData]);
      }
      addNotification(editingBrand ? 'Marca atualizada!' : 'Marca adicionada!', 'success');
      setIsModalOpen(false);
      setBrandName('');
    } catch (error: any) {
      addNotification('Erro ao salvar marca.', 'error');
    }
  };

  const removeBrand = async (id: string) => {
    if (!window.confirm('Excluir esta marca?')) return;
    try {
      setBrands(brands.filter((b: Brand) => b.id !== id));
      addNotification('Marca removida.', 'info');
    } catch (error: any) {
      addNotification('Erro ao remover marca.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Marcas</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total: {brands.length} Marcas</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          Nova Marca
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Lista de Marcas</h3>
        </div>
        
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {brands.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Tag size={32} />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhuma marca cadastrada</p>
            </div>
          ) : (
            brands.map((brand: Brand) => (
              <div key={brand.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-black uppercase">
                    {brand.name ? brand.name.charAt(0) : '?'}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white uppercase text-sm tracking-tight block">{brand.name || 'Sem Nome'}</span>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Mais Vendido: <span className="text-blue-500">{brandStats[brand.name.toUpperCase()]?.bestProduct || 'Nenhum'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="hidden sm:flex flex-col items-end">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendas</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      R$ {brandStats[brand.name.toUpperCase()]?.totalSales.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-2 text-slate-300 hover:text-blue-600 transition-all"
                      onClick={() => handleOpenModal(brand)}
                      title="Editar Marca"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => removeBrand(brand.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal for Add/Edit Brand */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {editingBrand ? 'Editar Marca' : 'Nova Marca'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Marca</label>
                  <input 
                    type="text" 
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                    placeholder="Ex: TRUSS"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={addBrand}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                  >
                    {editingBrand ? 'Salvar' : 'Adicionar'}
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

