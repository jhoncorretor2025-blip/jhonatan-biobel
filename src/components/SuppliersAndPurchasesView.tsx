import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Plus, Trash2, Calendar, ShoppingBag, Landmark, 
  Check, Info, Sparkles, Receipt, DollarSign, ArrowRight,
  Filter, Search, Clock, FileText, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  phone: string;
  brand: string;
  offersGift?: boolean;
  giftDescription?: string;
}

interface FinancialAccount {
  id: string;
  type: 'payable' | 'receivable';
  category: string;
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: 'paid' | 'pending';
  paymentDate?: string;
  supplierId?: string;
}

interface Brand {
  id: string;
  name: string;
}

interface SupplierPurchase {
  id: string;
  supplierId: string;
  supplierName: string;
  brand: string;
  itemsCount: number;
  totalAmount: number;
  purchaseDate: string; // YYYY-MM-DD
  paymentTerms: string; // Ex: "30, 60, 90" ou "À Vista"
  notes?: string;
  installments: {
    id: string; // references financialAccounts id
    installmentNumber: number;
    amount: number;
    dueDate: string; // YYYY-MM-DD
    status: 'paid' | 'pending';
  }[];
}

interface SuppliersAndPurchasesViewProps {
  settings: any;
  setSettings: (settings: any) => void;
  financialAccounts: FinancialAccount[];
  setFinancialAccounts: (accounts: FinancialAccount[]) => void;
  brands: Brand[];
  addNotification: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
}

export function SuppliersAndPurchasesView({
  settings,
  setSettings,
  financialAccounts,
  setFinancialAccounts,
  brands,
  addNotification,
  formatCurrency,
  formatDate
}: SuppliersAndPurchasesViewProps) {
  // Tabs: 'directory' | 'new_purchase' | 'purchases_history'
  const [currentSubTab, setCurrentSubTab] = useState<'directory' | 'new_purchase' | 'purchases_history'>('directory');

  const suppliers: Supplier[] = settings.officialProviders || [];
  const purchases: SupplierPurchase[] = settings.supplierPurchases || [];

  // =========================================================================
  // 1. SUPPLIER DIRECTORY LOGIC
  // =========================================================================
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    cnpj: '',
    phone: '',
    brand: '',
    offersGift: false,
    giftDescription: ''
  });
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(query) || 
      s.cnpj.includes(query) || 
      s.brand.toLowerCase().includes(query)
    );
  }, [suppliers, searchQuery]);

  const handleAddSupplier = () => {
    if (!newSupplier.name) {
      addNotification('O nome do fornecedor é obrigatório!', 'warning');
      return;
    }

    const updated = [
      ...suppliers,
      {
        id: Date.now().toString(),
        name: newSupplier.name.toUpperCase(),
        cnpj: newSupplier.cnpj || '00.000.000/0001-00',
        phone: newSupplier.phone || '(51) 99999-9999',
        brand: newSupplier.brand.toUpperCase() || 'MARCA',
        offersGift: newSupplier.offersGift,
        giftDescription: newSupplier.giftDescription
      }
    ];

    setSettings({ ...settings, officialProviders: updated });
    addNotification('Fornecedor cadastrado!', 'success');
    setIsSupplierModalOpen(false);
    setNewSupplier({ name: '', cnpj: '', phone: '', brand: '', offersGift: false, giftDescription: '' });
  };

  const handleRemoveSupplier = (id: string) => {
    if (!window.confirm('Excluir este fornecedor?')) return;
    const updated = suppliers.filter((s: any) => s.id !== id);
    setSettings({ ...settings, officialProviders: updated });
    addNotification('Fornecedor removido.', 'info');
  };

  const handleUpdateSupplierField = (index: number, field: string, value: any) => {
    const updated = [...suppliers];
    updated[index] = { ...updated[index], [field]: value };
    setSettings({ ...settings, officialProviders: updated });
  };


  // =========================================================================
  // 2. NEW PURCHASE LOGIC
  // =========================================================================
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: '',
    brand: '',
    itemsCount: 1,
    totalAmount: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    termsPreset: '30_60_90', // 'vista' | '30' | '30_60' | '30_60_90' | 'custom'
    customInstallmentsCount: 3,
    notes: ''
  });

  // Calculate suggested installments
  const computedInstallments = useMemo(() => {
    const total = purchaseForm.totalAmount;
    if (total <= 0) return [];

    let intervals: number[] = [];
    if (purchaseForm.termsPreset === 'vista') {
      intervals = [0];
    } else if (purchaseForm.termsPreset === '30') {
      intervals = [30];
    } else if (purchaseForm.termsPreset === '30_60') {
      intervals = [30, 60];
    } else if (purchaseForm.termsPreset === '30_60_90') {
      intervals = [30, 60, 90];
    } else {
      // custom
      const count = Math.max(1, purchaseForm.customInstallmentsCount);
      for (let i = 1; i <= count; i++) {
        intervals.push(i * 30);
      }
    }

    const count = intervals.length;
    const baseValue = Math.floor((total / count) * 100) / 100;
    const difference = Math.round((total - baseValue * count) * 100) / 100;

    return intervals.map((days, idx) => {
      // Distribute the decimal rounding difference to the first installment
      const installmentAmount = idx === 0 ? baseValue + difference : baseValue;
      
      // Calculate due date
      const baseDate = new Date(purchaseForm.purchaseDate + 'T12:00:00');
      baseDate.setDate(baseDate.getDate() + days);
      const y = baseDate.getFullYear();
      const m = String(baseDate.getMonth() + 1).padStart(2, '0');
      const d = String(baseDate.getDate()).padStart(2, '0');
      const dueDateStr = `${y}-${m}-${d}`;

      return {
        installmentNumber: idx + 1,
        amount: Number(installmentAmount.toFixed(2)),
        dueDate: dueDateStr
      };
    });
  }, [purchaseForm.totalAmount, purchaseForm.termsPreset, purchaseForm.purchaseDate, purchaseForm.customInstallmentsCount]);

  // Handle preset changes to auto-select brand if linked
  useEffect(() => {
    if (purchaseForm.supplierId) {
      const selectedSup = suppliers.find(s => s.id === purchaseForm.supplierId);
      if (selectedSup && selectedSup.brand) {
        setPurchaseForm(prev => ({ ...prev, brand: selectedSup.brand }));
      }
    }
  }, [purchaseForm.supplierId, suppliers]);

  const handleConfirmPurchase = (e: React.FormEvent) => {
    e.preventDefault();

    if (!purchaseForm.supplierId) {
      addNotification('Selecione um fornecedor!', 'warning');
      return;
    }
    if (purchaseForm.totalAmount <= 0) {
      addNotification('O valor total deve ser maior que zero!', 'warning');
      return;
    }

    const selectedSup = suppliers.find(s => s.id === purchaseForm.supplierId);
    const supplierName = selectedSup ? selectedSup.name : 'FORNECEDOR DESCONHECIDO';

    const purchaseId = 'pur_' + Date.now().toString();

    // Create financial accounts and installments
    const generatedInstallments = computedInstallments.map((inst, index) => {
      const financialAccountId = `fin_pur_${Date.now()}_${index}`;
      return {
        id: financialAccountId,
        installmentNumber: inst.installmentNumber,
        amount: inst.amount,
        dueDate: inst.dueDate,
        status: 'pending' as const
      };
    });

    const presetLabelMap: Record<string, string> = {
      'vista': 'À Vista',
      '30': '30 dias',
      '30_60': '30 / 60 dias',
      '30_60_90': '30 / 60 / 90 dias',
      'custom': `${purchaseForm.customInstallmentsCount} parcelas`
    };

    const newPurchaseRecord: SupplierPurchase = {
      id: purchaseId,
      supplierId: purchaseForm.supplierId,
      supplierName,
      brand: purchaseForm.brand || 'DIVERSAS',
      itemsCount: purchaseForm.itemsCount,
      totalAmount: purchaseForm.totalAmount,
      purchaseDate: purchaseForm.purchaseDate,
      paymentTerms: presetLabelMap[purchaseForm.termsPreset] || 'Custom',
      notes: purchaseForm.notes,
      installments: generatedInstallments
    };

    // Save to settings
    const updatedPurchases = [newPurchaseRecord, ...purchases];
    setSettings({
      ...settings,
      supplierPurchases: updatedPurchases
    });

    // Generate matching accounts payable in financialAccounts
    const newFinancialAccounts = generatedInstallments.map(inst => ({
      id: inst.id,
      type: 'payable' as const,
      category: 'Boleto de Fornecedor',
      description: `Boleto ${inst.installmentNumber}/${generatedInstallments.length} - ${supplierName} (${purchaseForm.brand || 'DIVERSAS'})`,
      amount: inst.amount,
      dueDate: inst.dueDate,
      status: 'pending' as const,
      supplierId: purchaseForm.supplierId
    }));

    setFinancialAccounts([...financialAccounts, ...newFinancialAccounts]);

    addNotification('Compra e boletos registrados com sucesso!', 'success');
    
    // Reset form and go to history tab
    setPurchaseForm({
      supplierId: '',
      brand: '',
      itemsCount: 1,
      totalAmount: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      termsPreset: '30_60_90',
      customInstallmentsCount: 3,
      notes: ''
    });
    setCurrentSubTab('purchases_history');
  };


  // =========================================================================
  // 3. PURCHASES HISTORY LOGIC
  // =========================================================================
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

  // Sync / derive live installment status from financialAccounts
  const getInstallmentLiveStatus = (instId: string, fallbackStatus: 'paid' | 'pending') => {
    const match = financialAccounts.find(fa => fa.id === instId);
    return match ? match.status : fallbackStatus;
  };

  const filteredHistory = useMemo(() => {
    let list = purchases;
    if (historySearchQuery) {
      const q = historySearchQuery.toLowerCase();
      list = list.filter(p => 
        p.supplierName.toLowerCase().includes(q) || 
        p.brand.toLowerCase().includes(q) ||
        p.paymentTerms.toLowerCase().includes(q)
      );
    }
    return list;
  }, [purchases, historySearchQuery]);

  const handleToggleInstallment = (purchaseId: string, installmentId: string) => {
    // Locate the current status of the financial account
    const matchedFA = financialAccounts.find(fa => fa.id === installmentId);
    if (!matchedFA) {
      addNotification('Lançamento financeiro não encontrado.', 'error');
      return;
    }

    const nextStatus = (matchedFA.status === 'paid' ? 'pending' : 'paid') as 'paid' | 'pending';

    // 1. Update in financialAccounts
    const updatedFAs = financialAccounts.map(fa => {
      if (fa.id === installmentId) {
        return {
          ...fa,
          status: nextStatus,
          paymentDate: nextStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return fa;
    });
    setFinancialAccounts(updatedFAs);

    // 2. Update status embedded inside settings.supplierPurchases as a fallback
    const updatedPurchases = purchases.map(pur => {
      if (pur.id === purchaseId) {
        const updatedInst = pur.installments.map(inst => {
          if (inst.id === installmentId) {
            return { ...inst, status: nextStatus };
          }
          return inst;
        });
        return { ...pur, installments: updatedInst };
      }
      return pur;
    });
    setSettings({
      ...settings,
      supplierPurchases: updatedPurchases
    });

    addNotification(`Parcela marcada como ${nextStatus === 'paid' ? 'Paga' : 'Pendente'}!`, 'success');
  };

  const handleDeletePurchase = (purchaseId: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir o registro de compra? Isso removerá todos os boletos correspondentes que estiverem no Contas a Pagar.')) return;

    const pur = purchases.find(p => p.id === purchaseId);
    if (!pur) return;

    // Get all installment IDs
    const installmentIds = pur.installments.map(inst => inst.id);

    // 1. Filter out from financialAccounts
    const updatedFAs = financialAccounts.filter(fa => !installmentIds.includes(fa.id));
    setFinancialAccounts(updatedFAs);

    // 2. Filter out from purchases
    const updatedPurchases = purchases.filter(p => p.id !== purchaseId);
    setSettings({
      ...settings,
      supplierPurchases: updatedPurchases
    });

    addNotification('Registro de compra e boletos excluídos.', 'info');
  };

  // Helper stats for history
  const historyStats = useMemo(() => {
    let totalSpent = 0;
    let pendingBoletosCount = 0;
    let pendingBoletosAmount = 0;

    purchases.forEach(p => {
      totalSpent += p.totalAmount;
      p.installments.forEach(inst => {
        const liveStatus = getInstallmentLiveStatus(inst.id, inst.status);
        if (liveStatus === 'pending') {
          pendingBoletosCount++;
          pendingBoletosAmount += inst.amount;
        }
      });
    });

    return {
      totalSpent,
      pendingBoletosCount,
      pendingBoletosAmount
    };
  }, [purchases, financialAccounts]);


  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-indigo-800 dark:from-slate-900 dark:to-slate-950 rounded-[36px] p-6 md:p-8 text-white shadow-lg relative overflow-hidden text-left">
        <div className="absolute right-0 top-0 p-8 opacity-[0.06] text-white pointer-events-none transform translate-x-4 -translate-y-4">
          <Landmark size={200} />
        </div>
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black tracking-wider uppercase">
            <Sparkles size={12} className="text-blue-300" />
            Módulo de Compras & Boletos
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            📦 Gestão de Compras e Fornecedores
          </h1>
          <p className="text-xs md:text-sm text-indigo-100 max-w-3xl font-medium leading-relaxed">
            Cadastre seus distribuidores parceiros, lance as notas de compra especificando quantidade de produtos e marcas, e gere boletos parcelados (30, 60, 90 dias) integrados automaticamente no seu Contas a Pagar.
          </p>
        </div>
      </div>

      {/* VIEW SUB-TABS */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 pb-px gap-2 justify-start">
        <button
          onClick={() => setCurrentSubTab('directory')}
          className={`pb-3 px-4 text-xs uppercase font-black tracking-wider border-b-2 transition-all ${
            currentSubTab === 'directory' 
              ? 'border-indigo-600 text-indigo-600 dark:border-blue-500 dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          📇 Lista de Fornecedores ({suppliers.length})
        </button>
        <button
          onClick={() => setCurrentSubTab('new_purchase')}
          className={`pb-3 px-4 text-xs uppercase font-black tracking-wider border-b-2 transition-all ${
            currentSubTab === 'new_purchase' 
              ? 'border-indigo-600 text-indigo-600 dark:border-blue-500 dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          ➕ Lançar Compra / Entrada
        </button>
        <button
          onClick={() => setCurrentSubTab('purchases_history')}
          className={`pb-3 px-4 text-xs uppercase font-black tracking-wider border-b-2 transition-all ${
            currentSubTab === 'purchases_history' 
              ? 'border-indigo-600 text-indigo-600 dark:border-blue-500 dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          📜 Histórico de Notas & Boletos ({purchases.length})
        </button>
      </div>

      {/* CONTENT PANELS WITH ANIMATION */}
      <div>
        
        {/* TAB 1: SUPPLIER DIRECTORY */}
        {currentSubTab === 'directory' && (
          <div className="space-y-6">
            
            {/* STATS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs text-left">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Total de Distribuidores</span>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white font-mono">{suppliers.length}</h3>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs text-left">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Principais Marcas Compradas</span>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 truncate mt-1.5 uppercase">
                  {Array.from(new Set(suppliers.map((s: any) => s.brand).filter(Boolean))).slice(0, 3).join(', ') || 'Nenhuma registrada'}
                </h3>
              </div>
              <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-3xl p-6 shadow-md text-left flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fluxo de Compras</span>
                  <p className="text-xs font-bold text-slate-300 mt-1 uppercase">Sincronizado ao Fluxo de Caixa</p>
                </div>
                <button 
                  onClick={() => setIsSupplierModalOpen(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  Novo Fornecedor
                </button>
              </div>
            </div>

            {/* SEARCH AND DIRECTORY LIST */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-xs p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
                <div className="text-left">
                  <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm">Contatos de Fornecedores</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Pesquise e gerencie informações cadastrais e comerciais dos distribuidores</p>
                </div>
                
                {/* Search */}
                <div className="relative w-full md:max-w-xs">
                  <span className="absolute left-3 top-3 text-slate-400"><Search size={14} /></span>
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar fornecedor ou marca..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Providers Inputs list */}
              <div className="space-y-3">
                {filteredSuppliers.map((prov: any, index: number) => (
                  <div key={prov.id} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-4 text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Fornecedor / Distribuidor</label>
                        <input 
                          type="text" 
                          value={prov.name} 
                          onChange={(e) => handleUpdateSupplierField(index, 'name', e.target.value.toUpperCase())}
                          className="w-full bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-2.5 text-xs font-bold rounded-lg text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">CNPJ</label>
                        <input 
                          type="text" 
                          value={prov.cnpj} 
                          onChange={(e) => handleUpdateSupplierField(index, 'cnpj', e.target.value)}
                          className="w-full bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-2.5 text-xs font-bold rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">WhatsApp / Comercial</label>
                        <input 
                          type="text" 
                          value={prov.phone} 
                          onChange={(e) => handleUpdateSupplierField(index, 'phone', e.target.value)}
                          className="w-full bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-2.5 text-xs font-bold rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Marca Comercial</label>
                        <input 
                          type="text" 
                          value={prov.brand} 
                          onChange={(e) => handleUpdateSupplierField(index, 'brand', e.target.value.toUpperCase())}
                          className="w-full bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-2.5 text-xs font-bold rounded-lg text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Gifts tracking row */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 items-center">
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">🎁 Oferece Brinde?</label>
                        <select
                          value={prov.offersGift ? "sim" : "nao"}
                          onChange={(e) => handleUpdateSupplierField(index, 'offersGift', e.target.value === "sim")}
                          className="w-full bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-2 text-xs font-bold rounded-lg text-slate-900 dark:text-white focus:outline-none"
                        >
                          <option value="nao">❌ Não Oferece Brinde</option>
                          <option value="sim">🎁 Oferece Brinde / Campanha</option>
                        </select>
                      </div>

                      <div className="sm:col-span-6 space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Regra / Descrição do Brinde (Para a lojista não se perder)</label>
                        <input 
                          type="text" 
                          value={prov.giftDescription || ''} 
                          disabled={!prov.offersGift}
                          onChange={(e) => handleUpdateSupplierField(index, 'giftDescription', e.target.value)}
                          placeholder={prov.offersGift ? "Ex: A cada 10 tinturas ganha 1 OX ou brinde surpresa acima de R$500" : "Habilite 'Oferece Brinde' para registrar..."}
                          className="w-full bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-2 text-xs font-bold rounded-lg text-slate-900 dark:text-white focus:outline-none disabled:opacity-40"
                        />
                      </div>

                      <div className="sm:col-span-3 pt-2 sm:pt-0 flex justify-end">
                        <button 
                          onClick={() => handleRemoveSupplier(prov.id)}
                          className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 rounded-lg text-[10px] font-black uppercase text-center cursor-pointer transition-colors"
                        >
                          Excluir Fornecedor
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredSuppliers.length === 0 && (
                  <div className="text-center py-16 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    {searchQuery ? 'Nenhum fornecedor corresponde à pesquisa.' : 'Nenhum fornecedor registrado. Cadastre um clicando em Novo Fornecedor.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTER NEW PURCHASE */}
        {currentSubTab === 'new_purchase' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Purchase Form (7 Cols) */}
            <form onSubmit={handleConfirmPurchase} className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 p-6 shadow-xs text-left space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm">Lançar Nova Nota / Compra</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Cadastre uma compra de mercadoria e divida o valor em boletos</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Supplier Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                      Fornecedor / Distribuidor *
                    </label>
                    <select
                      required
                      value={purchaseForm.supplierId}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- SELECIONE O FORNECEDOR --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.brand})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                      Marca dos Produtos
                    </label>
                    <input 
                      type="text"
                      value={purchaseForm.brand}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, brand: e.target.value.toUpperCase() })}
                      placeholder="Ex: WELLA, L'OREAL, BIOBEL"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none uppercase"
                    />
                  </div>

                  {(() => {
                    const selSup = suppliers.find(s => s.id === purchaseForm.supplierId);
                    if (selSup?.offersGift) {
                      return (
                        <div className="md:col-span-2 p-4.5 bg-blue-500/[0.04] border border-blue-500/10 dark:border-blue-500/20 rounded-2xl flex items-start gap-3 text-xs text-blue-700 dark:text-blue-300">
                          <span className="text-xl shrink-0 mt-0.5">🎁</span>
                          <div className="space-y-1">
                            <span className="font-black text-[9px] uppercase tracking-wider text-blue-600 dark:text-blue-400 block">Campanha de Brinde Ativa</span>
                            <p className="font-medium leading-relaxed">
                              Este distribuidor tem a regra registrada: <strong className="text-blue-900 dark:text-blue-200">"{selSup.giftDescription || 'Regra não descrita'}"</strong>. Verifique se o pedido atual cumpre os requisitos e cobre o brinde do vendedor!
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Items quantity and Total Value */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                      Qtd de Itens / Produtos
                    </label>
                    <input 
                      type="number"
                      min="1"
                      value={purchaseForm.itemsCount}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, itemsCount: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none text-center font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                      Valor Total da Nota (R$) *
                    </label>
                    <div className="relative">
                      <input 
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={purchaseForm.totalAmount || ''}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, totalAmount: Number(e.target.value) })}
                        placeholder="0.00"
                        className="w-full px-3.5 py-2.5 pl-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-805 dark:text-slate-205 focus:outline-none text-left font-mono"
                      />
                      <span className="absolute left-3 top-3 text-[10px] font-black text-slate-400">R$</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                      Data de Compra
                    </label>
                    <input 
                      type="date"
                      required
                      value={purchaseForm.purchaseDate}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-805 dark:text-slate-205 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Installments & Payment terms options */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">
                    Condição de Parcelamento / Boletos
                  </label>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'vista', label: 'À Vista' },
                      { id: '30', label: '30 dias' },
                      { id: '30_60', label: '30 / 60 d' },
                      { id: '30_60_90', label: '30 / 60 / 90 d' },
                      { id: 'custom', label: 'Outro' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPurchaseForm({ ...purchaseForm, termsPreset: opt.id })}
                        className={`py-2 px-1 text-[10px] font-black uppercase rounded-xl border text-center transition-all ${
                          purchaseForm.termsPreset === opt.id
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {purchaseForm.termsPreset === 'custom' && (
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 mt-2 max-w-xs">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Qtd de Boletos:</span>
                      <input 
                        type="number"
                        min="1"
                        max="12"
                        value={purchaseForm.customInstallmentsCount}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, customInstallmentsCount: Math.min(12, Math.max(1, Number(e.target.value))) })}
                        className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-center bg-white dark:bg-slate-900 rounded-lg text-slate-800 dark:text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Observações / Informações Adicionais
                  </label>
                  <textarea
                    rows={2}
                    value={purchaseForm.notes}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                    placeholder="Ex: Referente à reposição de tinturas de cabelo e cremes hidratantes, nota fiscal nº 4859"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-800 dark:text-slate-205 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPurchaseForm({
                      supplierId: '',
                      brand: '',
                      itemsCount: 1,
                      totalAmount: 0,
                      purchaseDate: new Date().toISOString().split('T')[0],
                      termsPreset: '30_60_90',
                      customInstallmentsCount: 3,
                      notes: ''
                    });
                    setCurrentSubTab('directory');
                  }}
                  className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-1.5"
                >
                  Confirmar Compra & Gerar Parcelas <ArrowRight size={14} />
                </button>
              </div>
            </form>

            {/* Installment Simulation / Preview (5 Cols) */}
            <div className="lg:col-span-5 space-y-4 text-left">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-8 h-8 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center rounded-lg shrink-0">
                    <Receipt size={16} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs">Simulador de Boletos</h4>
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase">Previsão das parcelas a serem geradas</p>
                  </div>
                </div>

                {computedInstallments.length === 0 ? (
                  <div className="py-12 text-center text-[10px] text-slate-400 font-black uppercase tracking-wider">
                    Insira o valor total da nota para ver a simulação dos vencimentos.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Resumo da Nota:</span>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-800 dark:text-white font-mono">{formatCurrency(purchaseForm.totalAmount)}</p>
                        <p className="text-[8px] text-slate-400 font-black uppercase">{computedInstallments.length} boletos gerados</p>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {computedInstallments.map((inst) => (
                        <div 
                          key={inst.installmentNumber}
                          className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 rounded-md">
                              {inst.installmentNumber}
                            </span>
                            <div>
                              <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">Boleto {inst.installmentNumber}ª Parcela</p>
                              <p className="text-[9px] text-slate-400 font-mono">📅 Vencimento: {inst.dueDate.split('-').reverse().join('/')}</p>
                            </div>
                          </div>

                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">
                            {formatCurrency(inst.amount)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase flex items-start gap-2">
                      <Check size={14} className="shrink-0 mt-0.5" />
                      <span>Os boletos simulados serão gerados como obrigações pendentes de pagamento vinculadas ao fornecedor no seu fluxo de caixa.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: PURCHASES HISTORY & BOLETOS LIST */}
        {currentSubTab === 'purchases_history' && (
          <div className="space-y-6">
            
            {/* STATS OVERVIEW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs text-left">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Total Comprado (Histórico)</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono">{formatCurrency(historyStats.totalSpent)}</h3>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs text-left">
                <span className="text-[10px] font-black text-amber-505 dark:text-amber-500 uppercase tracking-widest block mb-1">Boletos de Fornecedores Pendentes</span>
                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{formatCurrency(historyStats.pendingBoletosAmount)}</h3>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs text-left">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Quantidade de Boletos em Aberto</span>
                <h3 className="text-2xl font-black text-slate-850 dark:text-slate-100 font-mono">{historyStats.pendingBoletosCount} boletos</h3>
              </div>
            </div>

            {/* SEARCH AND PURSCHASES DIRECTORY */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-xs p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
                <div className="text-left">
                  <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm">Registro Cronológico de Entradas</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Consulte faturamentos, notas e gerencie o vencimento de cada boleto emitido por fornecedores</p>
                </div>
                
                <div className="relative w-full md:max-w-xs">
                  <span className="absolute left-3 top-3 text-slate-400"><Search size={14} /></span>
                  <input 
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Buscar por fornecedor ou marca..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Purchase History Accordion list */}
              <div className="space-y-3">
                {filteredHistory.map((pur) => {
                  const isExpanded = expandedPurchaseId === pur.id;
                  
                  // Calculate paid and total boletos count
                  const liveInstallments = pur.installments.map(inst => ({
                    ...inst,
                    status: getInstallmentLiveStatus(inst.id, inst.status)
                  }));

                  const totalInstallmentsCount = liveInstallments.length;
                  const paidInstallmentsCount = liveInstallments.filter(i => i.status === 'paid').length;
                  const isFullyPaid = paidInstallmentsCount === totalInstallmentsCount;

                  return (
                    <div 
                      key={pur.id} 
                      className={`border rounded-2xl transition-all overflow-hidden ${
                        isExpanded 
                          ? 'border-indigo-600/30 bg-slate-50/40 dark:bg-slate-950/20 shadow-xs' 
                          : 'border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {/* Accordion Header */}
                      <div 
                        onClick={() => setExpandedPurchaseId(isExpanded ? null : pur.id)}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-950/10 text-left"
                      >
                        {/* Provider and Brand */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 flex items-center justify-center rounded-xl shrink-0 ${
                            isFullyPaid 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10' 
                              : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                          }`}>
                            <FileText size={16} />
                          </div>
                          
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs truncate">
                              {pur.supplierName}
                            </h4>
                            <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5">
                              Marca: <span className="text-slate-600 dark:text-slate-300 font-black">{pur.brand}</span> • {pur.itemsCount} itens • Compra em {pur.purchaseDate.split('-').reverse().join('/')}
                            </p>
                          </div>
                        </div>

                        {/* Status indicators */}
                        <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                          <div className="text-right">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">VALOR TOTAL</span>
                            <span className="text-sm font-black text-slate-900 dark:text-white font-mono leading-none mt-1 inline-block">
                              {formatCurrency(pur.totalAmount)}
                            </span>
                          </div>

                          {/* Installments Progress Bar badge */}
                          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-center min-w-[100px]">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block leading-none">PAGO</span>
                            <span className={`text-[10px] font-black font-mono leading-none mt-1 inline-block ${
                              isFullyPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              {paidInstallmentsCount}/{totalInstallmentsCount}
                            </span>
                          </div>

                          {/* Chevron icon */}
                          <div className="text-slate-400">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {/* Accordion Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-100 dark:border-slate-850 p-4 bg-slate-50/50 dark:bg-slate-950/10 space-y-4 text-left"
                          >
                            {pur.notes && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <strong>📝 Obs:</strong> {pur.notes}
                              </div>
                            )}

                            {/* List of boletos */}
                            <div className="space-y-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Obrigações e Boletos Gerados</span>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {liveInstallments.map((inst) => (
                                  <div 
                                    key={inst.id}
                                    className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3 text-xs"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <p className="font-black text-slate-700 dark:text-slate-300 uppercase text-[10px]">Boleto {inst.installmentNumber}ª Parcela</p>
                                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">📅 Vencimento: {inst.dueDate.split('-').reverse().join('/')}</p>
                                      </div>
                                      
                                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                                        inst.status === 'paid' 
                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                      }`}>
                                        {inst.status === 'paid' ? 'PAGO' : 'PENDENTE'}
                                      </span>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-2.5">
                                      <span className="font-black font-mono text-slate-900 dark:text-white">
                                        {formatCurrency(inst.amount)}
                                      </span>

                                      <button
                                        onClick={() => handleToggleInstallment(pur.id, inst.id)}
                                        className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 shrink-0 ${
                                          inst.status === 'paid'
                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                            : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600'
                                        }`}
                                      >
                                        {inst.status === 'paid' ? (
                                          <>Marcar Aberto</>
                                        ) : (
                                          <><Check size={10} /> Quitar Boleto</>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Footer actions inside expanded purchase */}
                            <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-850 pt-3">
                              <span className="text-[9px] text-slate-400 font-black uppercase font-mono">ID COMPRA: #{pur.id.slice(-8).toUpperCase()}</span>
                              <button
                                onClick={() => handleDeletePurchase(pur.id)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 rounded-lg text-[9px] font-black uppercase flex items-center gap-1"
                              >
                                <Trash2 size={10} /> Excluir Registro de Compra
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {filteredHistory.length === 0 && (
                  <div className="text-center py-16 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-850">
                    {historySearchQuery ? 'Nenhuma nota corresponde à pesquisa.' : 'Nenhuma nota de compra lançada no histórico ainda.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Add Supplier Modal */}
      <AnimatePresence>
        {isSupplierModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-left"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Novo Fornecedor</h3>
                <button onClick={() => setIsSupplierModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-extrabold">✕</button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Fornecedor *</label>
                  <input 
                    type="text" 
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    placeholder="Ex: Distribuidora Sul Cosméticos"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CNPJ</label>
                  <input 
                    type="text" 
                    value={newSupplier.cnpj}
                    onChange={(e) => setNewSupplier({ ...newSupplier, cnpj: e.target.value })}
                    placeholder="Ex: 12.345.678/0001-99"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp Comercial</label>
                  <input 
                    type="text" 
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="Ex: (51) 98765-4321"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca Representada</label>
                  <input 
                    type="text" 
                    value={newSupplier.brand}
                    onChange={(e) => setNewSupplier({ ...newSupplier, brand: e.target.value })}
                    placeholder="Ex: WELLA"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">🎁 Oferece Brinde?</label>
                  <select
                    value={newSupplier.offersGift ? "sim" : "nao"}
                    onChange={(e) => setNewSupplier({ ...newSupplier, offersGift: e.target.value === "sim" })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                  >
                    <option value="nao">❌ Não oferece brinde</option>
                    <option value="sim">🎁 Oferece Brinde / Campanha</option>
                  </select>
                </div>

                {newSupplier.offersGift && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1"
                  >
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Regra / Descrição do Brinde *</label>
                    <input 
                      type="text" 
                      value={newSupplier.giftDescription}
                      required
                      onChange={(e) => setNewSupplier({ ...newSupplier, giftDescription: e.target.value })}
                      placeholder="Ex: A cada 10 unidades ganha 1 grátis"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                    />
                  </motion.div>
                )}
              </div>

              <div className="p-6 bg-slate-550/[0.02] border-t border-slate-100 flex justify-end gap-2">
                <button 
                  onClick={() => setIsSupplierModalOpen(false)} 
                  className="px-4 py-2 text-[10px] font-black uppercase text-slate-550"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddSupplier} 
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                >
                  Salvar Fornecedor
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
