import React, { useState, useMemo } from 'react';
import { 
  Calendar, Search, Filter, Trash2, ArrowUpRight, 
  ArrowDownRight, AlertTriangle, CheckCircle, Clock, Edit2, X, Plus
} from 'lucide-react';

interface StockBatch {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  supplierId: string;
  supplierName: string;
  arrivalDate: string;
  quantity: number;
  cost: number;
  expiryDate: string;
  paymentDate: string;
  paymentStatus: 'paid' | 'pending';
  batchNumber?: string;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  barcode?: string;
  expiryDate?: string;
}

interface ValidadesControlViewProps {
  stockBatches: StockBatch[];
  setStockBatches: React.Dispatch<React.SetStateAction<StockBatch[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  addNotification: (message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
  formatCurrency: (value: number) => string;
}

export const ValidadesControlView = ({
  stockBatches = [],
  setStockBatches,
  products = [],
  setProducts,
  addNotification,
  formatCurrency
}: ValidadesControlViewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'expired' | 'expiring_30' | 'expiring_90' | 'valid'>('all');
  
  // Edit batch local state
  const [editingBatch, setEditingBatch] = useState<StockBatch | null>(null);
  const [editLote, setEditLote] = useState('');
  const [editValidade, setEditValidade] = useState('');

  // Calculate days remaining helper
  const getDaysRemaining = (expiryDateStr: string) => {
    if (!expiryDateStr) return 0;
    const expiry = new Date(expiryDateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Metrics
  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let total = 0;
    let expired = 0;
    let expiring30 = 0;
    let expiring90 = 0;
    let valid = 0;

    stockBatches.forEach(batch => {
      total++;
      const days = getDaysRemaining(batch.expiryDate);
      if (days < 0) {
        expired++;
      } else if (days <= 30) {
        expiring30++;
      } else if (days <= 90) {
        expiring90++;
      } else {
        valid++;
      }
    });

    return { total, expired, expiring30, expiring90, valid };
  }, [stockBatches]);

  // Filter and Search batches
  const filteredBatches = useMemo(() => {
    return stockBatches
      .filter(batch => {
        const matchesSearch = 
          batch.productName.toUpperCase().includes(searchTerm.toUpperCase()) ||
          batch.supplierName.toUpperCase().includes(searchTerm.toUpperCase()) ||
          (batch.batchNumber && batch.batchNumber.toUpperCase().includes(searchTerm.toUpperCase()));

        if (!matchesSearch) return false;

        const days = getDaysRemaining(batch.expiryDate);

        if (statusFilter === 'expired') return days < 0;
        if (statusFilter === 'expiring_30') return days >= 0 && days <= 30;
        if (statusFilter === 'expiring_90') return days > 30 && days <= 90;
        if (statusFilter === 'valid') return days > 90;

        return true;
      })
      .sort((a, b) => {
        // Sort by expiry date ascending
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
  }, [stockBatches, searchTerm, statusFilter]);

  // Handle Delete Batch
  const handleDeleteBatch = (batchId: string, productId: string, quantity: number) => {
    if (!window.confirm('Deseja realmente excluir este lote? O estoque do produto correspondente será reduzido.')) {
      return;
    }

    // Deduct stock from product
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          stock: Math.max(0, p.stock - quantity)
        };
      }
      return p;
    }));

    // Remove batch
    setStockBatches(prev => prev.filter(b => b.id !== batchId));
    addNotification('Lote excluído e estoque do produto ajustado com sucesso!', 'success');
  };

  // Handle Edit Click
  const handleEditClick = (batch: StockBatch) => {
    setEditingBatch(batch);
    setEditLote(batch.batchNumber || '');
    setEditValidade(batch.expiryDate);
  };

  // Handle Save Edit
  const handleSaveEdit = () => {
    if (!editValidade) {
      addNotification('A data de validade é obrigatória.', 'warning');
      return;
    }

    if (!editingBatch) return;

    // Update batch
    setStockBatches(prev => prev.map(b => {
      if (b.id === editingBatch.id) {
        return {
          ...b,
          batchNumber: editLote.toUpperCase(),
          expiryDate: editValidade
        };
      }
      return b;
    }));

    // Update product expiryDate if this is the newest/only batch or update it anyway
    setProducts(prev => prev.map(p => {
      if (p.id === editingBatch.productId) {
        return {
          ...p,
          expiryDate: editValidade
        };
      }
      return p;
    }));

    addNotification('Informações do lote atualizadas com sucesso!', 'success');
    setEditingBatch(null);
  };

  return (
    <div className="space-y-8 text-left">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-950 text-white p-8 rounded-[40px] border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <Calendar size={140} className="text-white" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <span className="px-3 py-1 bg-amber-500/10 border border-amber-400/20 rounded-full text-[10px] font-black uppercase tracking-widest text-amber-300">
            📦 Logística & Cosméticos Inteligentes
          </span>
          <h2 className="text-3xl font-display font-black uppercase tracking-tight">Controle Inteligente de Lotes e Validades</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Monitore a validade de todos os lotes de produtos em tempo real. Evite prejuízos e desperdícios com alertas visuais automáticos de vencimento próximo (amarelo para 3 meses, vermelho para 1 mês).
          </p>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Lotes */}
        <div 
          onClick={() => setStatusFilter('all')}
          className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border ${statusFilter === 'all' ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20' : 'border-slate-100 dark:border-slate-800'} shadow-xs cursor-pointer hover:border-indigo-300 transition-all text-left space-y-2`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total de Lotes</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-350"><Calendar size={16} /></div>
          </div>
          <h4 className="text-2xl font-black text-slate-900 dark:text-white font-mono">{metrics.total}</h4>
          <p className="text-[9px] text-slate-400 font-bold uppercase">Cadastrados no sistema</p>
        </div>

        {/* Vencidos */}
        <div 
          onClick={() => setStatusFilter('expired')}
          className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border ${statusFilter === 'expired' ? 'border-rose-500 shadow-md ring-2 ring-rose-500/20' : 'border-slate-100 dark:border-slate-800'} shadow-xs cursor-pointer hover:border-rose-300 transition-all text-left space-y-2`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Lotes Vencidos 🚨</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600"><AlertTriangle size={16} /></div>
          </div>
          <h4 className="text-2xl font-black text-rose-600 font-mono">{metrics.expired}</h4>
          <p className="text-[9px] text-slate-400 font-bold uppercase">Atenção! Retirar de circulação</p>
        </div>

        {/* Vencer em 30 Dias */}
        <div 
          onClick={() => setStatusFilter('expiring_30')}
          className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border ${statusFilter === 'expiring_30' ? 'border-orange-500 shadow-md ring-2 ring-orange-500/20' : 'border-slate-100 dark:border-slate-800'} shadow-xs cursor-pointer hover:border-orange-300 transition-all text-left space-y-2`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-wider">Vence em 30 dias ⏳</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600"><Clock size={16} /></div>
          </div>
          <h4 className="text-2xl font-black text-orange-600 font-mono">{metrics.expiring30}</h4>
          <p className="text-[9px] text-slate-400 font-bold uppercase">Campanhas rápidas ou queima</p>
        </div>

        {/* Vence em 90 Dias */}
        <div 
          onClick={() => setStatusFilter('expiring_90')}
          className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border ${statusFilter === 'expiring_90' ? 'border-amber-500 shadow-md ring-2 ring-amber-500/20' : 'border-slate-100 dark:border-slate-800'} shadow-xs cursor-pointer hover:border-amber-300 transition-all text-left space-y-2`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider">Vence em 90 dias ⚠️</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500"><AlertTriangle size={16} /></div>
          </div>
          <h4 className="text-2xl font-black text-amber-600 font-mono">{metrics.expiring90}</h4>
          <p className="text-[9px] text-slate-400 font-bold uppercase">Planejar ações promocionais</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por produto, fornecedor ou número do lote..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-950 dark:text-white text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'expired', label: 'Vencidos' },
            { id: 'expiring_30', label: 'Até 30 dias' },
            { id: 'expiring_90', label: '30 a 90 dias' },
            { id: 'valid', label: 'Dentro do Prazo' }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setStatusFilter(btn.id as any)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === btn.id 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs' 
                  : 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 hover:text-slate-950 dark:hover:text-white border border-slate-100 dark:border-slate-800'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Produto / Item</th>
                <th className="px-6 py-4">Lote</th>
                <th className="px-6 py-4">Fornecedor</th>
                <th className="px-6 py-4 text-center">Qtd Atual</th>
                <th className="px-6 py-4">Validade</th>
                <th className="px-6 py-4">Dias Restantes</th>
                <th className="px-6 py-4">Chegada</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-slate-600 dark:text-slate-350">
              {filteredBatches.map((batch) => {
                const days = getDaysRemaining(batch.expiryDate);
                
                // Expiry Visual Alert Styling
                let badgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400';
                let alertLabel = 'Em Dia';
                if (days < 0) {
                  badgeClass = 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 animate-pulse';
                  alertLabel = 'VENCIDO! 🚨';
                } else if (days <= 30) {
                  badgeClass = 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-300';
                  alertLabel = 'Crítico (<30d) ⏳';
                } else if (days <= 90) {
                  badgeClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400';
                  alertLabel = 'Alerta (<90d) ⚠️';
                }

                return (
                  <tr key={batch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/25 transition-all">
                    <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase max-w-[200px] truncate">
                      {batch.productName}
                      <span className="block text-[8px] text-slate-400 font-bold mt-0.5 tracking-wider">{batch.brand}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-500 font-black">{batch.batchNumber || '-'}</td>
                    <td className="px-6 py-4 font-bold text-[10px] text-slate-700 dark:text-slate-300 uppercase truncate max-w-[120px]">
                      {batch.supplierName}
                    </td>
                    <td className="px-6 py-4 text-center font-extrabold text-slate-800 dark:text-white font-mono">
                      {batch.quantity} un
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${badgeClass}`}>
                        {new Date(batch.expiryDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {days < 0 ? (
                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase">Vencido</span>
                      ) : (
                        <span className={`text-[10px] font-extrabold ${days <= 30 ? 'text-rose-500' : days <= 90 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {days} dias
                        </span>
                      )}
                      <span className="block text-[8px] text-slate-400 font-bold uppercase mt-0.5">{alertLabel}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-bold">
                      {new Date(batch.arrivalDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditClick(batch)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-all cursor-pointer"
                          title="Editar lote ou validade"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteBatch(batch.id, batch.productId, batch.quantity)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                          title="Excluir lote"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredBatches.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/10">
                    <span className="text-3xl">🎉</span>
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase mt-3">Tudo limpo!</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Nenhum lote corresponde ao filtro ou busca selecionada.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Batch Modal */}
      {editingBatch && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in scale-in duration-200">
            <div className="p-6 border-b border-slate-150 dark:border-slate-850 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/20">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Editar Lote</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{editingBatch.productName}</p>
              </div>
              <button 
                onClick={() => setEditingBatch(null)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Número do Lote</label>
                <input
                  type="text"
                  placeholder="Ex: L1024"
                  value={editLote}
                  onChange={(e) => setEditLote(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-950 dark:text-white text-xs uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data de Validade</label>
                <input
                  type="date"
                  value={editValidade}
                  onChange={(e) => setEditValidade(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-950 dark:text-white text-xs"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-850/40 border-t border-slate-150 dark:border-slate-850 flex gap-3">
              <button
                type="button"
                onClick={() => setEditingBatch(null)}
                className="flex-1 py-3 bg-white dark:bg-slate-700 text-slate-600 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl font-black uppercase text-xs tracking-widest cursor-pointer hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-black uppercase text-xs tracking-widest cursor-pointer hover:bg-amber-700 transition-all shadow-md shadow-amber-100 dark:shadow-none"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
