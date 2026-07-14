import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, Award, Calendar, ChevronLeft, ChevronRight, Settings, 
  TrendingUp, AlertCircle, ShoppingBag, Coins, Check, Search, Filter, Sparkles, BookOpen,
  Lock, Unlock, Plus, X, Archive, Trash2, CheckCircle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  brand?: string;
  category?: string;
}

interface Sale {
  id: string;
  date: string;
  customerId?: string;
  customerName?: string;
  vendedora?: string;
  total: number;
  status: string;
  items: SaleItem[];
}

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  type: 'avulso' | 'combo' | 'kit' | 'pack';
}

interface Brand {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  name: string;
  status?: 'active' | 'inactive';
}

interface IncentiveCampaignViewProps {
  sales: Sale[];
  products: Product[];
  brands: Brand[];
  setBrands?: (brands: Brand[]) => void;
  staff: Staff[];
  formatCurrency: (value: number) => string;
}

const getSafeDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  try {
    if (dateStr.includes('T')) return new Date(dateStr);
    return new Date(dateStr + 'T12:00:00');
  } catch {
    return new Date();
  }
};

const getWeekRange = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust so Monday is 0, Sunday is 6
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { monday, sunday };
};

export function IncentiveCampaignView({
  sales,
  products,
  brands,
  setBrands,
  staff,
  formatCurrency
}: IncentiveCampaignViewProps) {
  // Define local storage keys
  const STORAGE_KEY_BRAND = 'incentive_campaign_brand_name';
  const STORAGE_KEY_UNIT_PTS = 'incentive_campaign_unit_points';
  const STORAGE_KEY_KIT_PTS = 'incentive_campaign_kit_points';
  const STORAGE_KEY_THRESHOLD = 'incentive_campaign_threshold';
  const STORAGE_KEY_BONUS_VAL = 'incentive_campaign_bonus_value';

  // 1. Campaign Settings with Persistence
  const [targetBrand, setTargetBrand] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_BRAND) || (brands[0]?.name || 'Biobel');
  });
  const [unitPoints, setUnitPoints] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_UNIT_PTS);
    return saved ? Number(saved) : 1;
  });
  const [kitPoints, setKitPoints] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_KIT_PTS);
    return saved ? Number(saved) : 3;
  });
  const [pointsThreshold, setPointsThreshold] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THRESHOLD);
    return saved ? Number(saved) : 10;
  });
  const [bonusValue, setBonusValue] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_BONUS_VAL);
    return saved ? Number(saved) : 50;
  });

  // Save changes to localStorage on edit
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BRAND, targetBrand);
    localStorage.setItem(STORAGE_KEY_UNIT_PTS, String(unitPoints));
    localStorage.setItem(STORAGE_KEY_KIT_PTS, String(kitPoints));
    localStorage.setItem(STORAGE_KEY_THRESHOLD, String(pointsThreshold));
    localStorage.setItem(STORAGE_KEY_BONUS_VAL, String(bonusValue));
  }, [targetBrand, unitPoints, kitPoints, pointsThreshold, bonusValue]);

  // 2. Reference Date for Weekly Scope
  const [referenceDate, setReferenceDate] = useState<string>('2026-07-03'); // default example matching system date

  // 3. Week boundaries
  const parsedRefDate = useMemo(() => {
    try {
      if (referenceDate.includes('T')) return new Date(referenceDate);
      return new Date(referenceDate + 'T12:00:00');
    } catch {
      return new Date();
    }
  }, [referenceDate]);

  const { monday, sunday } = useMemo(() => {
    return getWeekRange(parsedRefDate);
  }, [parsedRefDate]);

  // New States for 10 Improvements
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState<boolean>(false);
  const [archivedCampaigns, setArchivedCampaigns] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('incentive_campaign_archives');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Reset pagination on filter/seller change
  const [selectedSellerName, setSelectedSellerName] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSellerName, referenceDate, targetBrand]);

  // Skeleton loader effect trigger
  const triggerLoading = () => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  };

  // Navigation handlers with dynamic loaders
  const handlePrevWeek = () => {
    triggerLoading();
    const prev = new Date(monday);
    prev.setDate(prev.getDate() - 7);
    const y = prev.getFullYear();
    const m = String(prev.getMonth() + 1).padStart(2, '0');
    const d = String(prev.getDate()).padStart(2, '0');
    setReferenceDate(`${y}-${m}-${d}`);
  };

  const handleNextWeek = () => {
    triggerLoading();
    const next = new Date(monday);
    next.setDate(next.getDate() + 7);
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, '0');
    const d = String(next.getDate()).padStart(2, '0');
    setReferenceDate(`${y}-${m}-${d}`);
  };

  const handleCurrentWeek = () => {
    triggerLoading();
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setReferenceDate(`${y}-${m}-${d}`);
  };

  // Helper to identify item points and type
  const getItemDetails = (item: SaleItem) => {
    const prod = products.find(p => p.id === item.productId);
    const itemBrand = (item.brand || prod?.brand || '').trim();
    const cleanTarget = (targetBrand || '').trim();

    if (!itemBrand || !cleanTarget) {
      return { isQualifying: false, type: 'other' as const, pointsPerUnit: 0, totalPoints: 0 };
    }

    const isTargetBrand = itemBrand.toLowerCase() === cleanTarget.toLowerCase();

    if (!isTargetBrand) {
      return { isQualifying: false, type: 'other' as const, pointsPerUnit: 0, totalPoints: 0 };
    }

    const isKit = prod ? (prod.type === 'kit' || prod.type === 'combo' || prod.type === 'pack') : (
      item.name.toLowerCase().includes('kit') || 
      item.name.toLowerCase().includes('combo') || 
      item.name.toLowerCase().includes('pack') || 
      item.name.toLowerCase().includes('pek')
    );

    const ptsPerUnit = isKit ? kitPoints : unitPoints;
    const totalPts = ptsPerUnit * item.quantity;

    return {
      isQualifying: true,
      type: (isKit ? 'kit' : 'unit') as 'kit' | 'unit',
      pointsPerUnit: ptsPerUnit,
      totalPoints: totalPts
    };
  };

  // 4. Calculations: Process Sales for the Selected Week
  const weekIncentiveStats = useMemo(() => {
    const activeStaff = staff.filter(s => s.status !== 'inactive');
    const staffSummary: { 
      [name: string]: { 
        name: string;
        points: number;
        kitsCount: number;
        unitsCount: number;
        salesCount: number;
        earnedBonus: number;
        bonusCycles: number;
        qualifyingSalesList: {
          saleId: string;
          dateStr: string;
          total: number;
          customerName?: string;
          items: {
            name: string;
            quantity: number;
            type: 'kit' | 'unit';
            points: number;
          }[];
        }[];
      } 
    } = {};

    activeStaff.forEach(s => {
      staffSummary[s.name] = {
        name: s.name,
        points: 0,
        kitsCount: 0,
        unitsCount: 0,
        salesCount: 0,
        earnedBonus: 0,
        bonusCycles: 0,
        qualifyingSalesList: []
      };
    });

    sales.forEach(sale => {
      if (sale.status !== 'completed' && sale.status !== 'Concluída') return;
      
      const sDate = getSafeDate(sale.date);
      if (sDate < monday || sDate > sunday) return;

      const sellerName = sale.vendedora;
      if (!sellerName) return;

      if (!staffSummary[sellerName]) {
        staffSummary[sellerName] = {
          name: sellerName,
          points: 0,
          kitsCount: 0,
          unitsCount: 0,
          salesCount: 0,
          earnedBonus: 0,
          bonusCycles: 0,
          qualifyingSalesList: []
        };
      }

      const qualifyingItems: { name: string; quantity: number; type: 'kit' | 'unit'; points: number }[] = [];
      let salePoints = 0;

      sale.items.forEach(item => {
        const details = getItemDetails(item);
        if (details.isQualifying) {
          salePoints += details.totalPoints;
          qualifyingItems.push({
            name: item.name,
            quantity: item.quantity,
            type: details.type as 'kit' | 'unit',
            points: details.totalPoints
          });

          if (details.type === 'kit') {
            staffSummary[sellerName].kitsCount += item.quantity;
          } else {
            staffSummary[sellerName].unitsCount += item.quantity;
          }
        }
      });

      if (salePoints > 0) {
        staffSummary[sellerName].points += salePoints;
        staffSummary[sellerName].salesCount += 1;
        const localDate = sDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        staffSummary[sellerName].qualifyingSalesList.push({
          saleId: sale.id,
          dateStr: localDate,
          total: sale.total,
          customerName: sale.customerName,
          items: qualifyingItems
        });
      }
    });

    // Calculate bonuses based on threshold
    const leaderboard = Object.values(staffSummary).map(s => {
      const cycles = Math.floor(s.points / pointsThreshold);
      const bonus = cycles * bonusValue;
      return {
        ...s,
        bonusCycles: cycles,
        earnedBonus: bonus
      };
    }).sort((a, b) => b.points - a.points);

    const overallTotalPoints = leaderboard.reduce((sum, s) => sum + s.points, 0);
    const overallTotalKits = leaderboard.reduce((sum, s) => sum + s.kitsCount, 0);
    const overallTotalUnits = leaderboard.reduce((sum, s) => sum + s.unitsCount, 0);
    const overallTotalBonusPayable = leaderboard.reduce((sum, s) => sum + s.earnedBonus, 0);

    return {
      leaderboard,
      overallTotalPoints,
      overallTotalKits,
      overallTotalUnits,
      overallTotalBonusPayable
    };
  }, [sales, products, staff, targetBrand, unitPoints, kitPoints, pointsThreshold, bonusValue, monday, sunday]);

  const selectedSellerDetails = useMemo(() => {
    if (!selectedSellerName) return null;
    return weekIncentiveStats.leaderboard.find(s => s.name === selectedSellerName) || null;
  }, [weekIncentiveStats.leaderboard, selectedSellerName]);

  useEffect(() => {
    if (!selectedSellerName && weekIncentiveStats.leaderboard.length > 0) {
      setSelectedSellerName(weekIncentiveStats.leaderboard[0].name);
    }
  }, [weekIncentiveStats.leaderboard, selectedSellerName]);

  // Paginated Qualifying Sales
  const itemsPerPage = 5;
  const paginatedSales = useMemo(() => {
    if (!selectedSellerDetails) return [];
    const salesList = selectedSellerDetails.qualifyingSalesList;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return salesList.slice(startIndex, startIndex + itemsPerPage);
  }, [selectedSellerDetails, currentPage]);

  const totalPages = useMemo(() => {
    if (!selectedSellerDetails) return 0;
    return Math.ceil(selectedSellerDetails.qualifyingSalesList.length / itemsPerPage);
  }, [selectedSellerDetails]);

  return (
    <div className="space-y-6 w-full">
      
      {/* HEADER BANNER INTEGRATED WITH DATE SELECTOR */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 dark:from-rose-900 dark:to-slate-900 rounded-[36px] p-6 md:p-8 text-white shadow-lg relative overflow-hidden text-left">
        <div className="absolute right-0 top-0 p-8 opacity-[0.06] text-white pointer-events-none transform translate-x-4 -translate-y-4">
          <Trophy size={200} />
        </div>
        
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black tracking-wider uppercase">
              <Sparkles size={12} className="animate-pulse text-amber-300" />
              Campanha de Premiação Semanal
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              🏆 Campo da Gerência: Incentivos
            </h1>
            <p className="text-xs text-rose-100 font-medium leading-relaxed">
              Painel de Controle de Metas de Sazonalidade. Defina a marca foco da semana, bonifique as vendedoras por kit ou produtos avulsos e gerencie os bônus acumulados de forma automática.
            </p>
          </div>

          {/* Integrated Date Selector (Point 8) */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[28px] p-4 flex flex-col sm:flex-row items-center gap-4 shrink-0 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-white shrink-0">
                <Calendar size={18} />
              </div>
              <div className="text-left">
                <span className="text-[8px] font-black uppercase tracking-widest text-rose-200 block mb-0.5 whitespace-nowrap">Período Selecionado</span>
                <span className="text-xs font-black text-white uppercase whitespace-nowrap">
                  {monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a {sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Nav Arrow Buttons */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              <button 
                onClick={handlePrevWeek}
                className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl border border-white/10 text-white transition-all cursor-pointer"
                title="Semana Anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <button 
                onClick={handleCurrentWeek}
                className="px-3 py-2 bg-white hover:bg-white/95 active:scale-95 text-rose-700 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Esta Semana
              </button>

              <button 
                onClick={handleNextWeek}
                className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl border border-white/10 text-white transition-all cursor-pointer"
                title="Próxima Semana"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* INDEPENDENT SYSTEM GRID (Point 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        
        {/* LEFT COLUMN: Configuration & Totals (4 Cols) */}
        <div className="lg:col-span-4 space-y-6 w-full">
          
          {/* Campaign Configuration Card */}
          <div className="bg-white dark:bg-slate-900 rounded-[30px] border border-slate-150 dark:border-slate-800 shadow-xs p-6 space-y-6 text-left w-full">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Settings size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-wider">
                  Configurar Campanha
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Regras de Pontuação & Bônus</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Target Brand Selection with Tags (Point 7) */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">
                  Marcas Cadastradas (Clique para Ativar)
                </label>
                
                <div className="flex flex-wrap gap-2">
                  {brands.map(b => {
                    const isSelected = targetBrand.toLowerCase() === b.name.toLowerCase();
                    return (
                      <div 
                        key={b.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/25" 
                            : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 border border-slate-150 dark:border-slate-800"
                        }`}
                        onClick={() => setTargetBrand(b.name)}
                      >
                        {isSelected && <Check size={12} className="shrink-0" />}
                        <span>{b.name}</span>
                        {b.name.toLowerCase() !== 'biobel' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Deseja excluir a marca ${b.name} do sistema?`)) {
                                const updated = brands.filter(item => item.id !== b.id);
                                if (setBrands) setBrands(updated);
                                if (targetBrand.toLowerCase() === b.name.toLowerCase()) {
                                  setTargetBrand(updated[0]?.name || 'Biobel');
                                }
                              }
                            }}
                            className="ml-1 text-current opacity-60 hover:opacity-100 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
                            title="Remover Marca"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {brands.length === 0 && (
                    <div 
                      className="px-3 py-2 rounded-xl text-xs font-black uppercase bg-rose-600 text-white"
                      onClick={() => setTargetBrand('Biobel')}
                    >
                      <Check size={12} className="inline mr-1" /> Biobel
                    </div>
                  )}
                </div>

                {/* Inline Quick Add Brand */}
                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2 mt-2">
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">
                    ➕ Cadastrar Nova Marca:
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Ex: TRUSS, BIOBEL, LOREAL"
                      id="quick_new_brand_input"
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-bold rounded-xl text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('quick_new_brand_input') as HTMLInputElement;
                        const name = input?.value?.trim()?.toUpperCase();
                        if (name) {
                          const exists = brands.some(b => b.name.toUpperCase() === name);
                          if (exists) {
                            alert('Esta marca já está cadastrada!');
                            return;
                          }
                          const newBrand = { id: `B${Date.now()}`, name };
                          if (setBrands) {
                            setBrands([...brands, newBrand]);
                          }
                          setTargetBrand(name);
                          if (input) input.value = '';
                        }
                      }}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      Cadastrar
                    </button>
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Somente as vendas da marca marcada como ativa acumularão pontos.</p>
              </div>

              {/* Point Values Locked state wrapper (Point 9) */}
              <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Trava de Segurança</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        if (confirm('A alteração das regras no meio de uma campanha pode recalcular os pontos e bônus exibidos. Deseja desbloquear?')) {
                          setIsLocked(false);
                        }
                      } else {
                        setIsLocked(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isLocked 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200" 
                        : "bg-rose-600 hover:bg-rose-700 text-white border-transparent shadow-xs"
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <Lock size={12} /> Modificar Regra Atual
                      </>
                    ) : (
                      <>
                        <Unlock size={12} /> Travar Regras
                      </>
                    )}
                  </button>
                </div>

                <div className={`space-y-4 transition-all duration-300 ${isLocked ? "opacity-60 pointer-events-none select-none" : ""}`}>
                  {/* Point Values Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                        {isLocked && <Lock size={9} />} Pts Prod. Unitário
                      </label>
                      <input 
                        type="number"
                        min="1"
                        max="10"
                        value={unitPoints}
                        disabled={isLocked}
                        onChange={(e) => setUnitPoints(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold rounded-xl text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 text-center"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                        {isLocked && <Lock size={9} />} Pts Kit ou Combo
                      </label>
                      <input 
                        type="number"
                        min="1"
                        max="20"
                        value={kitPoints}
                        disabled={isLocked}
                        onChange={(e) => setKitPoints(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold rounded-xl text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 text-center"
                      />
                    </div>
                  </div>

                  {/* Trigger Threshold & Prize Value */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                        {isLocked && <Lock size={9} />} Ciclo de Pontos
                      </label>
                      <div className="relative">
                        <input 
                          type="number"
                          min="1"
                          value={pointsThreshold}
                          disabled={isLocked}
                          onChange={(e) => setPointsThreshold(Math.max(1, Number(e.target.value)))}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold rounded-xl text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 text-center pr-8"
                        />
                        <span className="absolute right-3 top-2.5 text-[9px] font-black text-rose-500 uppercase">Pts</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                        {isLocked && <Lock size={9} />} Bonificação (R$)
                      </label>
                      <div className="relative">
                        <input 
                          type="number"
                          min="0"
                          value={bonusValue}
                          disabled={isLocked}
                          onChange={(e) => setBonusValue(Math.max(0, Number(e.target.value)))}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold rounded-xl text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 text-center pl-6"
                        />
                        <span className="absolute left-2.5 top-2.5 text-[9px] font-black text-slate-400 uppercase">R$</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Config Summary Rules Banner */}
            <div className="p-4 bg-rose-500/[0.03] border border-rose-500/10 rounded-2xl text-[11px] text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              <strong>📢 Regra ativa:</strong> A cada venda da marca <strong className="text-rose-600 dark:text-rose-400">{targetBrand}</strong>, a vendedora acumula <strong className="font-mono">{unitPoints} pt(s)</strong> por produto avulso e <strong className="font-mono">{kitPoints} pts</strong> por kits/combos. Ao atingir <strong className="font-mono">{pointsThreshold} pontos</strong> na semana, ela fatura o bônus de <strong className="font-mono">{formatCurrency(bonusValue)}</strong>!
            </div>
          </div>

          {/* Quick Stats Summarizing Overall Performance (Point 3 padding adjustment) */}
          <div className="bg-white dark:bg-slate-900 rounded-[30px] border border-slate-150 dark:border-slate-800 shadow-xs p-6 text-left space-y-4 w-full">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Totalizadores da Semana</span>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col justify-between">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">PONTOS GERADOS</span>
                <p className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1.5 leading-none">
                  {isLoading ? '...' : weekIncentiveStats.overallTotalPoints}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col justify-between">
                <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest whitespace-nowrap">BÔNUS PAGÁVEL</span>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1.5 leading-none">
                  {isLoading ? '...' : formatCurrency(weekIncentiveStats.overallTotalBonusPayable)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col justify-between">
                <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest whitespace-nowrap">KITS VENDIDOS</span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1 font-mono">
                  {isLoading ? '...' : `${weekIncentiveStats.overallTotalKits} un`}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col justify-between">
                <span className="text-[8px] font-black text-slate-450 uppercase tracking-widest whitespace-nowrap">UNITÁRIOS VENDIDOS</span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1 font-mono">
                  {isLoading ? '...' : `${weekIncentiveStats.overallTotalUnits} un`}
                </p>
              </div>
            </div>
          </div>

          {/* HISTÓRICO DE CAMPANHAS ARQUIVADAS (Point 10) */}
          {archivedCampaigns.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-[30px] border border-slate-150 dark:border-slate-800 shadow-xs p-5 text-left space-y-3.5 w-full">
              <div className="flex items-center gap-2">
                <Archive size={15} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Semanas Arquivadas</span>
              </div>
              
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {archivedCampaigns.map((arc) => (
                  <div key={arc.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {arc.brand} ({arc.totalPoints} Pts)
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                        {arc.mondayStr} a {arc.sundayStr}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-mono font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                        {formatCurrency(arc.totalBonus)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Deseja excluir este registro do histórico permanentemente?')) {
                            const updated = archivedCampaigns.filter(item => item.id !== arc.id);
                            setArchivedCampaigns(updated);
                            localStorage.setItem('incentive_campaign_archives', JSON.stringify(updated));
                          }
                        }}
                        className="text-slate-350 hover:text-rose-500 transition-colors p-1 cursor-pointer shrink-0"
                        title="Excluir Registro"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Performance & Sales Audit (8 Cols) */}
        <div className="lg:col-span-8 space-y-6 w-full">
          
          {/* Leaderboard Table / Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-[30px] border border-slate-150 dark:border-slate-800 shadow-xs p-6 text-left space-y-4 w-full">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-wider">
                  Desempenho por Vendedora 🚀
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ranking de pontos e bônus acumulados no período</p>
              </div>
            </div>

            {/* Ranking List with Skeleton Loaders support (Point 2 & 6) */}
            <div className="space-y-4">
              {isLoading ? (
                // SKELETON LOADERS (Point 6)
                <div className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px] animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 flex-1">
                        <div className="w-9 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0" />
                        <div className="space-y-2 flex-1">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-24" />
                          <div className="h-2.5 bg-slate-150 dark:bg-slate-850 rounded-md w-32" />
                        </div>
                      </div>
                      <div className="flex-1 max-w-xs space-y-2 w-full">
                        <div className="h-2.5 bg-slate-150 dark:bg-slate-850 rounded-md w-16" />
                        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full w-full" />
                      </div>
                      <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                        <div className="space-y-1 text-right">
                          <div className="h-2 bg-slate-150 dark:bg-slate-850 rounded-md w-8" />
                          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-10" />
                        </div>
                        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-[125px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : weekIncentiveStats.leaderboard.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 uppercase font-black tracking-wider bg-slate-50 dark:bg-slate-950/30 rounded-2xl">
                  Nenhuma vendedora ativa cadastrada no sistema.
                </div>
              ) : (
                weekIncentiveStats.leaderboard.map((item, index) => {
                  const isSelected = selectedSellerName === item.name;
                  const earnedCycles = item.bonusCycles;
                  const remainderPoints = item.points % pointsThreshold;
                  const progressPct = Math.min(100, (remainderPoints / pointsThreshold) * 100);

                  return (
                    <div 
                      key={item.name}
                      onClick={() => setSelectedSellerName(item.name)}
                      className={`p-5 rounded-[24px] border transition-all duration-300 cursor-pointer ${
                        isSelected 
                          ? "bg-rose-500/[0.03] dark:bg-slate-800/25 border-rose-500/40 ring-1 ring-rose-500/10 shadow-md" 
                          : "bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/60 shadow-xs"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                        
                        {/* Left Info: Emblem & Name */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className={`inline-flex items-center justify-center font-mono font-black text-xs w-9 h-9 rounded-xl shrink-0 ${
                            index === 0 
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" 
                              : index === 1 
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-450 border border-slate-200/50 dark:border-slate-750"
                              : "bg-slate-50 dark:bg-slate-950 text-slate-400 border border-slate-100 dark:border-slate-850"
                          }`}>
                            {index === 0 ? "🏆" : index === 1 ? "🥈" : `${index + 1}º`}
                          </span>

                          <div className="min-w-0 text-left">
                            <h4 className="font-black text-slate-905 dark:text-white uppercase text-xs truncate whitespace-nowrap">
                              {item.name}
                            </h4>
                            <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-1 whitespace-nowrap">
                              {item.kitsCount} kit(s) • {item.unitsCount} un. • {item.salesCount} ped.
                            </p>
                          </div>
                        </div>

                        {/* Mid Progress to Next Threshold */}
                        <div className="flex-1 max-w-sm space-y-1.5 w-full text-left">
                          <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400">
                            <span>Progresso Próximo Bônus</span>
                            <span className="font-mono text-slate-600 dark:text-slate-350 whitespace-nowrap">
                              {remainderPoints}/{pointsThreshold} Pts
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-800">
                            <div 
                              className="h-full bg-rose-500 rounded-full transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Right: Points and Solid Highlight Box for Bonus (Point 2) */}
                        <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end w-full md:w-auto">
                          <div className="text-right">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">PONTOS</span>
                            <span className="text-base font-black text-slate-900 dark:text-white font-mono leading-none mt-1.5 inline-block">
                              {item.points}
                            </span>
                          </div>

                          <div className="px-4 py-2.5 bg-rose-600 text-white dark:bg-rose-700 rounded-2xl text-center min-w-[125px] shadow-xs shrink-0">
                            <span className="text-[8px] font-black text-rose-100 uppercase tracking-widest block leading-none">BÔNUS TOTAL</span>
                            <span className="text-xs font-black font-mono leading-none mt-1.5 inline-block whitespace-nowrap">
                              {formatCurrency(item.earnedBonus)}
                            </span>
                            {earnedCycles > 0 && (
                              <span className="text-[7.5px] text-rose-200 font-black uppercase tracking-wider block mt-1 leading-none whitespace-nowrap">
                                {earnedCycles}x de R$ {bonusValue}
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ARCHIVE/ZERAR BUTTON (Point 10) */}
            {!isLoading && weekIncentiveStats.leaderboard.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowArchiveDialog(true)}
                  className="px-5 py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-black uppercase tracking-wider rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-rose-600/10 cursor-pointer"
                >
                  <Archive size={14} /> Fechar Semana e Salvar Histórico
                </button>
              </div>
            )}
          </div>

          {/* Drill-down Qualifying Sales of Selected Salesperson with Pagination (Point 5) */}
          {selectedSellerDetails && (
            <div className="bg-white dark:bg-slate-900 rounded-[30px] border border-slate-150 dark:border-slate-800 shadow-xs p-6 text-left space-y-4 w-full">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">Auditabilidade e Conferência</span>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">
                    Vendas Qualificadas: {selectedSellerDetails.name}
                  </h3>
                </div>
                <div className="px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 text-[10px] text-slate-450 font-black uppercase rounded-lg">
                  {selectedSellerDetails.qualifyingSalesList.length} Pedidos
                </div>
              </div>

              {selectedSellerDetails.qualifyingSalesList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 uppercase font-black tracking-wider bg-slate-50/50 dark:bg-slate-950/10 rounded-2xl">
                  Nenhuma venda contendo a marca <span className="text-rose-500">{targetBrand}</span> foi realizada por esta vendedora na semana.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Paginated List */}
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {paginatedSales.map((sale) => (
                      <div 
                        key={sale.saleId}
                        className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl space-y-3 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="font-mono font-black text-[10px] text-slate-400">
                              #{sale.saleId.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded whitespace-nowrap">
                              {sale.dateStr}
                            </span>
                            {sale.customerName && (
                              <span className="text-slate-500 font-extrabold uppercase text-[10px] truncate max-w-[120px]">
                                👤 {sale.customerName}
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-black text-slate-800 dark:text-slate-200 shrink-0">
                            {formatCurrency(sale.total)}
                          </span>
                        </div>

                        {/* Items Sold details list */}
                        <div className="pl-4 border-l-2 border-rose-500/20 space-y-1.5 text-left">
                          {sale.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] gap-2">
                              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-350 min-w-0">
                                <span className="font-mono font-bold text-slate-400 text-[10px] shrink-0">
                                  {item.quantity}x
                                </span>
                                <span className="truncate font-medium">{item.name}</span>
                                <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase shrink-0 ${
                                  item.type === 'kit' 
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                }`}>
                                  {item.type === 'kit' ? 'Kit (3 Pts)' : 'Unitário (1 Pt)'}
                                </span>
                              </div>
                              <span className="font-mono font-black text-rose-505 shrink-0">
                                +{item.points} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Dynamic Pagination Controls (Point 5) */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-150 dark:border-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-all text-slate-600 dark:text-slate-300"
                      >
                        Anterior
                      </button>
                      <span className="font-bold text-slate-450 uppercase text-[10px] tracking-wider">
                        Página <span className="text-rose-500 font-black">{currentPage}</span> de <span className="font-black">{totalPages}</span>
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-150 dark:border-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-all text-slate-600 dark:text-slate-300"
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* ARCHIVE CONFIRMATION MODAL DIALOG (Point 10) */}
      <AnimatePresence>
        {showArchiveDialog && (
          <>
            <div 
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4"
              onClick={() => setShowArchiveDialog(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-150 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-6 text-left relative"
              >
                <button 
                  onClick={() => setShowArchiveDialog(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center">
                    <Archive size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Fechar e Arquivar Semana</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Metas de Sazonalidade</p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3 font-sans">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                    Você está prestes a fechar a apuração e salvar o histórico permanente desta semana de incentivo:
                  </p>
                  <div className="border-t border-slate-200/60 dark:border-slate-800 pt-2.5 text-xs space-y-1.5">
                    <p className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                      <span>Período:</span> 
                      <span className="font-mono text-slate-900 dark:text-white">
                        {monday.toLocaleDateString('pt-BR')} a {sunday.toLocaleDateString('pt-BR')}
                      </span>
                    </p>
                    <p className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                      <span>Marca Foco:</span> 
                      <span className="text-rose-600 font-black">{targetBrand}</span>
                    </p>
                    <p className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                      <span>Pontos Totais:</span> 
                      <span className="font-mono font-black">{weekIncentiveStats.overallTotalPoints} Pts</span>
                    </p>
                    <p className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                      <span>Bônus Acumulado:</span> 
                      <span className="font-mono font-black text-rose-600 dark:text-rose-400">{formatCurrency(weekIncentiveStats.overallTotalBonusPayable)}</span>
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-rose-500 font-black uppercase tracking-wider leading-relaxed">
                  ⚠️ Importante: Isto criará um registro permanente. O painel estará pronto e limpo para o próximo ciclo semanal.
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowArchiveDialog(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const archiveRecord = {
                        id: `ARC-${Date.now()}`,
                        mondayStr: monday.toLocaleDateString('pt-BR'),
                        sundayStr: sunday.toLocaleDateString('pt-BR'),
                        brand: targetBrand,
                        totalPoints: weekIncentiveStats.overallTotalPoints,
                        totalBonus: weekIncentiveStats.overallTotalBonusPayable,
                        results: weekIncentiveStats.leaderboard.map(item => ({
                          name: item.name,
                          points: item.points,
                          earnedBonus: item.earnedBonus
                        }))
                      };
                      const newArchives = [archiveRecord, ...archivedCampaigns];
                      setArchivedCampaigns(newArchives);
                      localStorage.setItem('incentive_campaign_archives', JSON.stringify(newArchives));
                      setShowArchiveDialog(false);
                      alert(`Campanha da semana fechada e arquivada com sucesso!\nPeríodo: ${archiveRecord.mondayStr} - ${archiveRecord.sundayStr}`);
                    }}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md shadow-rose-600/15"
                  >
                    Salvar e Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
