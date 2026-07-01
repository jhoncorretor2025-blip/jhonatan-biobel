import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  Users, 
  ShoppingBag, 
  Flame, 
  TrendingUp, 
  ShieldAlert, 
  DollarSign, 
  UserCheck, 
  Calendar, 
  BookmarkCheck,
  CheckCircle,
  Clock,
  ArrowRight,
  MessageSquare,
  Percent,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Gift,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Calculator,
  RefreshCw
} from 'lucide-react';

interface InteractiveTipsProps {
  sales: any[];
  products: any[];
  customers: any[];
  staff: any[];
  formatCurrency: (value: number) => string;
}

export const InteractiveTips: React.FC<InteractiveTipsProps> = ({
  sales,
  products,
  customers,
  staff,
  formatCurrency,
}) => {
  const [activeTip, setActiveTip] = useState<number | null>(0);
  const [completedTips, setCompletedTips] = useState<number[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Load completed tips from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dashboard_completed_tips');
    if (saved) {
      try {
        setCompletedTips(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const toggleCompleted = (index: number) => {
    const newVal = completedTips.includes(index)
      ? completedTips.filter(i => i !== index)
      : [...completedTips, index];
    setCompletedTips(newVal);
    localStorage.setItem('dashboard_completed_tips', JSON.stringify(newVal));
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const getSafeDate = (dateStr: any) => {
    if (!dateStr) return new Date();
    try {
      if (typeof dateStr === 'string' && dateStr.includes('T')) {
        return new Date(dateStr);
      }
      return new Date(dateStr + 'T12:00:00');
    } catch {
      return new Date();
    }
  };

  // ==================== DYNAMIC DATA EXTRACTS FOR THE 10 TIPS ====================

  // TIP 1: Inactive Customers (CRM CRM CRM)
  const inactiveCustomersData = useMemo(() => {
    const completedSales = sales.filter(s => s.status === 'completed');
    const customerLastSale: { [key: string]: Date } = {};
    completedSales.forEach(s => {
      if (s.customerId) {
        const saleDate = getSafeDate(s.date);
        const prev = customerLastSale[s.customerId];
        if (!prev || saleDate > prev) {
          customerLastSale[s.customerId] = saleDate;
        }
      }
    });

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 45);

    const list = customers.filter(c => {
      const lastSale = customerLastSale[c.id];
      if (!lastSale) {
        // Customer never bought, or has no recorded sales but was registered over 45 days ago
        const regDate = c.createdAt ? getSafeDate(c.createdAt) : new Date();
        return regDate < sixtyDaysAgo;
      }
      return lastSale < sixtyDaysAgo;
    }).map(c => {
      const lastSale = customerLastSale[c.id];
      return {
        ...c,
        daysAway: lastSale ? Math.floor((Date.now() - lastSale.getTime()) / (1000 * 60 * 60 * 24)) : 999,
        lastSaleDate: lastSale ? lastSale.toLocaleDateString('pt-BR') : 'Sem Compras'
      };
    }).sort((a, b) => b.daysAway - a.daysAway);

    return {
      count: list.length,
      list: list.slice(0, 4)
    };
  }, [sales, customers]);

  // TIP 2: Stagnant Stock Products
  const stagnantStockData = useMemo(() => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const list = products.filter(p => {
      if (p.stock <= 0 || p.status === 'inactive') return false;
      const lastSold = p.lastSoldAt ? getSafeDate(p.lastSoldAt) : p.createdAt ? getSafeDate(p.createdAt) : new Date();
      return lastSold < sixtyDaysAgo;
    }).map(p => {
      const lastSold = p.lastSoldAt ? getSafeDate(p.lastSoldAt) : p.createdAt ? getSafeDate(p.createdAt) : new Date();
      const daysSince = Math.floor((Date.now() - lastSold.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...p,
        daysSince,
        valueStuck: p.stock * (p.cost || p.price * 0.5)
      };
    }).sort((a, b) => b.valueStuck - a.valueStuck);

    const totalStuckValue = list.reduce((sum, item) => sum + item.valueStuck, 0);

    return {
      count: list.length,
      totalStuckValue,
      list: list.slice(0, 4)
    };
  }, [products]);

  // TIP 3: Team Sales & Ticket Médio Performance
  const staffPerformanceData = useMemo(() => {
    const staffSales: { [key: string]: { total: number; count: number; salesList: any[] } } = {};
    
    // Initialize active staff
    staff.filter(st => st.status !== 'inactive').forEach(st => {
      staffSales[st.name] = { total: 0, count: 0, salesList: [] };
    });

    const activeMates = staff.filter(st => st.status !== 'inactive').map(s => s.name);

    sales.filter(s => s.status === 'completed').forEach(s => {
      const seller = s.vendedora;
      if (seller) {
        if (!staffSales[seller]) {
          staffSales[seller] = { total: 0, count: 0, salesList: [] };
        }
        staffSales[seller].total += s.total;
        staffSales[seller].count += 1;
        staffSales[seller].salesList.push(s);
      }
    });

    const metrics = Object.entries(staffSales).map(([name, data]) => {
      const avgTicket = data.count > 0 ? data.total / data.count : 0;
      return {
        name,
        totalRevenue: data.total,
        salesCount: data.count,
        avgTicket
      };
    }).sort((a, b) => b.avgTicket - a.avgTicket);

    const bestTicket = metrics.length > 0 ? metrics[0] : null;
    const lowestTicket = metrics.length > 0 ? [...metrics].sort((a, b) => a.avgTicket - b.avgTicket)[0] : null;

    return {
      metrics,
      bestTicket,
      lowestTicket
    };
  }, [sales, staff]);

  // TIP 4: Low profit markup alert
  const lowMarginProductsData = useMemo(() => {
    const list = products.filter(p => {
      if (p.status === 'inactive' || !p.cost || p.cost <= 0) return false;
      const markup = p.price / p.cost;
      return markup < 1.3; // markup under 30%
    }).map(p => {
      const currentMarkup = p.cost > 0 ? ((p.price - p.cost) / p.cost) * 100 : 0;
      const suggestedPrice = p.cost * 1.4; // 40% standard mark up
      return {
        ...p,
        currentMarkup,
        suggestedPrice
      };
    });

    return {
      count: list.length,
      list: list.slice(0, 4)
    };
  }, [products]);

  // TIP 5: Outstanding defaults (Fiado / Pendente)
  const outstandingDebtData = useMemo(() => {
    const pendingSales = sales.filter(s => s.status === 'pending' || s.status === 'pago_parcial');
    const totalPendingAmount = pendingSales.reduce((acc, s) => acc + (s.total || 0), 0);
    
    const list = pendingSales.map(s => {
      const sDate = getSafeDate(s.date);
      const daysAgo = Math.floor((Date.now() - sDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...s,
        daysAgo
      };
    }).sort((a, b) => b.total - a.total);

    return {
      count: list.length,
      totalPendingAmount,
      list: list.slice(0, 4)
    };
  }, [sales]);

  // TIP 6: Customer repurchase rate
  const loyaltyMetrics = useMemo(() => {
    const activeCustomersList = customers.map(c => {
      const cSales = sales.filter(s => s.status === 'completed' && s.customerId === c.id);
      return {
        ...c,
        salesCount: cSales.length,
        totalBought: cSales.reduce((sum, s) => sum + s.total, 0)
      };
    });

    const totalInDB = customers.length || 1;
    const loyalCount = activeCustomersList.filter(c => c.salesCount > 1).length;
    const rate = (loyalCount / totalInDB) * 100;

    const vipCustomer = [...activeCustomersList].sort((a, b) => b.totalBought - a.totalBought)[0];

    return {
      loyalCount,
      totalInDB,
      rate,
      vipCustomer
    };
  }, [sales, customers]);

  // TIP 7: Operations by Day of the Week
  const weedaysMetrics = useMemo(() => {
    const dayOfWeekTotal: { [key: number]: { total: number; count: number } } = {
      0: { total: 0, count: 0 }, // Sun
      1: { total: 0, count: 0 }, // Mon
      2: { total: 0, count: 0 }, // Tue
      3: { total: 0, count: 0 }, // Wed
      4: { total: 0, count: 0 }, // Thu
      5: { total: 0, count: 0 }, // Fri
      6: { total: 0, count: 0 }, // Sat
    };

    sales.filter(s => s.status === 'completed').forEach(s => {
      try {
        const d = getSafeDate(s.date);
        const dayIdx = d.getDay();
        dayOfWeekTotal[dayIdx].total += s.total;
        dayOfWeekTotal[dayIdx].count += 1;
      } catch (e) {}
    });

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const averages = Object.entries(dayOfWeekTotal).map(([dayIdx, metrics]) => {
      const idx = parseInt(dayIdx);
      return {
        dayIdx: idx,
        dayName: dayNames[idx],
        average: metrics.count > 0 ? metrics.total / metrics.count : 0,
        count: metrics.count
      };
    }).filter(d => d.count > 0);

    const sortedByAvg = [...averages].sort((a, b) => a.average - b.average);
    const weakestDay = sortedByAvg[0];
    const strongestDay = sortedByAvg[sortedByAvg.length - 1];

    return {
      weakestDay,
      strongestDay
    };
  }, [sales]);

  // TIP 8: Cross Selling Suggestion Engine
  const crossSellingCombo = useMemo(() => {
    // 1st: Find the ultimate best seller product
    const productQuantities: { [key: string]: { name: string; brand: string; count: number } } = {};
    sales.filter(s => s.status === 'completed').forEach(s => {
      s.items?.forEach((i: any) => {
        if (!productQuantities[i.productId]) {
          productQuantities[i.productId] = { name: i.name, brand: i.brand || 'Marca', count: 0 };
        }
        productQuantities[i.productId].count += (i.quantity || 1);
      });
    });

    const sortedProducts = Object.entries(productQuantities)
      .map(([id, info]) => ({ id, ...info }))
      .sort((a, b) => b.count - a.count);

    const starProduct = sortedProducts[0] || null;

    // 2nd: Find a slow moving beauty product from stagnant inventory (category cosmetics/perfumes preferred)
    const stagnantItems = products.filter(p => {
      if (p.stock <= 0) return false;
      const lastSoldDate = p.lastSoldAt ? getSafeDate(p.lastSoldAt) : p.createdAt ? getSafeDate(p.createdAt) : new Date(0);
      const days = Math.floor((Date.now() - lastSoldDate.getTime()) / (1000 * 60 * 60 * 24));
      return days > 45 && p.id !== starProduct?.id;
    });

    const quietProduct = stagnantItems[0] || null;

    return {
      starProduct,
      quietProduct
    };
  }, [sales, products]);

  // TIP 9: Upcoming Birthday Celebrators
  const upcomingBirthdays = useMemo(() => {
    const activeMonth = new Date().getMonth() + 1; // 1-12
    const celebrators = customers.filter(c => {
      if (!c.birthDate) return false;
      try {
        const parts = c.birthDate.split('-'); // YYYY-MM-DD
        const bMonth = parseInt(parts[1]);
        return bMonth === activeMonth;
      } catch {
        return false;
      }
    }).map(c => {
      const parts = c.birthDate!.split('-');
      const day = parts[2];
      return {
        ...c,
        day: parseInt(day),
        formattedBirthday: `${day}/${parts[1]}`
      };
    }).sort((a, b) => a.day - b.day);

    return {
      celebrators,
      count: celebrators.length
    };
  }, [customers]);

  // TIP 10: Financial Audit (Despesas x Faturamento)
  const financialRatios = useMemo(() => {
    const completedSales = sales.filter(s => s.status === 'completed');
    const totalRev = completedSales.reduce((acc, s) => acc + (s.total || 0), 0);

    // Let's count costs if there are any recorded cost parameters or expense logs
    // In this panel, cost values of products are mapped to calculate profit
    const totalCOGS = completedSales.reduce((acc, s) => {
      return acc + s.items.reduce((sum: number, item: any) => {
        const prod = products.find(p => p.id === item.productId);
        const costPrice = prod?.cost || item.price * 0.5; // fallback
        return sum + (costPrice * item.quantity);
      }, 0);
    }, 0);

    const grossProfit = totalRev - totalCOGS;
    const profitMarginPercent = totalRev > 0 ? (grossProfit / totalRev) * 100 : 0;

    return {
      totalRev,
      totalCOGS,
      grossProfit,
      profitMarginPercent
    };
  }, [sales, products]);

  // ==================== 10 TIPS DEFINITION OBJECT ====================

  const tipsArray = [
    {
      title: "Recupere Clientes Inativos (CRM)",
      subtitle: "Clientes ausentes por mais de 45 dias representam dinheiro de vendas futuras escorrendo pelos dedos.",
      icon: Users,
      badge: `${inactiveCustomersData.count} Inativos`,
      badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Identificamos que <strong>{inactiveCustomersData.count} clientes cadastrados</strong> estão há mais de 45 dias sem fazer nenhuma compra comercializável. Reativar um cliente antigo custa 5x menos do que atrair um novo!
          </p>

          {inactiveCustomersData.list.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Clientes mais afunilados:</p>
              <div className="overflow-x-auto bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-2">
                <table className="w-full text-[11px] text-left">
                  <thead>
                    <tr className="text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-1 font-black">Cliente</th>
                      <th className="pb-1 font-black">Última Venda</th>
                      <th className="pb-1 font-black text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveCustomersData.list.map(c => {
                      const msgTemplate = `Oi ${c.name}, tudo bem? Sentimos sua falta aqui no salão! Preparamos um presente especial de 10% de desconto na sua próxima visita para matar a saudade ❤️ Posso agendar seu horário para esta semana?`;
                      const waUrl = `https://api.whatsapp.com/send?phone=55${c.phone.replace(/\D/g, '')}&text=${encodeURIComponent(msgTemplate)}`;
                      return (
                        <tr key={c.id} className="border-b border-slate-50 dark:border-slate-850/50 last:border-0">
                          <td className="py-2.5 font-bold uppercase text-slate-800 dark:text-slate-200">{c.name}</td>
                          <td className="py-2.5 text-slate-500 font-semibold">{c.daysAway} dias atrás</td>
                          <td className="py-2.5 text-right">
                            <a 
                              href={waUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg tracking-wide uppercase transition-all shadow-sm"
                            >
                              <MessageSquare size={10} /> Chamar
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-150/40 rounded-xl text-indigo-700 dark:text-indigo-300 text-[11px] leading-relaxed font-medium">
            💡 <strong>Plano Tático</strong>: Disparar um prompt de remarketing a cada segunda-feira de manhã. Ofereça um serviço de brinde rápido (ex: hidratação rápida) ao comprar qualquer produto com valor acima de R$ 90,00.
          </div>
        </div>
      )
    },
    {
      title: "Liquide o Estoque Parado",
      subtitle: "Produto parado no estoque é capital de giro de fluxo de caixa congelado sem rendimentos.",
      icon: ShoppingBag,
      badge: `${stagnantStockData.count} Produtos`,
      badgeColor: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Há um total de <strong>{stagnantStockData.count} referências de cosméticos</strong> que possuem quantidade no estoque, porém estão sem nenhuma venda há mais de 60 dias. Isso soma um total de <strong className="text-red-500">{formatCurrency(stagnantStockData.totalStuckValue)} em custo travado</strong>.
          </p>

          {stagnantStockData.list.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Principais Gargalos de Estoque:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {stagnantStockData.list.map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="text-[11px] font-black uppercase text-slate-850 dark:text-slate-100 truncate max-w-[140px]">{p.name}</p>
                      <p className="text-[10px] font-semibold text-slate-450">{p.stock} unidades • sem giro há {p.daysSince} dias</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-red-500">{formatCurrency(p.valueStuck)}</p>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Val. Custo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-rose-500/10 text-rose-800 dark:text-rose-300 rounded-xl border border-rose-500/10 text-[11px] leading-relaxed">
            🚀 <strong>DICA DE LIQUIDAÇÃO</strong>: Faça combos casando o item parado com serviços recorrentes, ou venda pelo preço de custo facilitando a eliminação rápida e use os recursos para reforçar a verba de marketing!
          </div>
        </div>
      )
    },
    {
      title: "Treine e Alavanque sua Vendedora",
      subtitle: "A diferença entre vendedoras de alto e baixo desempenho reflete em margens de faturamento bruto.",
      icon: Flame,
      badge: "Vendas por Consultora",
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Acompanhar o <strong>Ticket Médio</strong> de vendas de cada vendedora ajuda a identificar gaps de habilidades de cross-selling (venda casada) ou de negociação.
          </p>

          {staffPerformanceData.metrics.length > 0 ? (
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ranking de Ticket Médio por Consultora:</p>
              <div className="space-y-2">
                {staffPerformanceData.metrics.map((st, idx) => (
                  <div key={st.name} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-indigo-500">#{idx + 1}</span>
                      <div>
                        <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">{st.name}</p>
                        <p className="text-[10px] font-medium text-slate-500">{st.salesCount} vendas fechadas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">{formatCurrency(st.avgTicket)}</p>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Média Ticket</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Cadastre colaboradoras e feche vendas para liberar comparações reais.</p>
          )}

          {staffPerformanceData.bestTicket && staffPerformanceData.lowestTicket && staffPerformanceData.bestTicket.name !== staffPerformanceData.lowestTicket.name && (
            <div className="p-3 bg-emerald-500/10 text-emerald-850 dark:text-emerald-300 rounded-xl border border-emerald-500/20 text-[11px] leading-relaxed">
              💡 <strong>Análise de Otimização</strong>: A consultora <strong>{staffPerformanceData.bestTicket.name}</strong> possui o melhor ticket médio de <strong>{formatCurrency(staffPerformanceData.bestTicket.avgTicket)}</strong>! Use o script de abordagem dela para dar um mini-treinamento rápido de vendas para <strong>{staffPerformanceData.lowestTicket.name}</strong> comercializar kits de maior valor.
            </div>
          )}
        </div>
      )
    },
    {
      title: "Defenda a Margem de Lucro",
      subtitle: "Vender muito com margem muito baixa é um erro grave que pode quebrar qualquer caixa operacional.",
      icon: ShieldAlert,
      badge: `${lowMarginProductsData.count} Baixos`,
      badgeColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Identificamos <strong>{lowMarginProductsData.count} produtos ativos</strong> cujo preço de venda final faturado está muito próximo do seu preço de custo cadastrado (markup geral menor que 30%). Isso reduz severamente seu faturamento livre.
          </p>

          {lowMarginProductsData.list.length > 0 ? (
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Produtos com Baixa Margem Identificados:</p>
              <div className="space-y-2">
                {lowMarginProductsData.list.map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase text-slate-950 dark:text-white truncate max-w-[160px]">{p.name}</p>
                      <p className="text-[10px] font-bold text-red-500">Markup: {p.currentMarkup.toFixed(1)}% (Custo: {formatCurrency(p.cost)})</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900 dark:text-white font-mono">{formatCurrency(p.price)}</p>
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-600 font-bold px-1.5 py-0.5 rounded-full uppercase">Sugerido: {formatCurrency(p.suggestedPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-500/15 text-[11px] font-semibold text-center uppercase tracking-wider">
              🎉 Ótimo! Todos os produtos cadastrados com custo possuem margem saudável!
            </div>
          )}

          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 rounded-xl text-indigo-700 dark:text-indigo-300 text-[11px] leading-relaxed">
            💡 <strong>Plano Corretivo</strong>: Acesse a tela de <strong>Estoque/Produtos</strong> e faça um reajuste imediato de preços. Sempre defina um preço de venda de pelo menos 1.4x o valor de custo de aquisição para cobrir taxas de cartão de crédito e perdas.
          </div>
        </div>
      )
    },
    {
      title: "Acabe com a Inadimplência do Fiado",
      subtitle: "Venda a prazo não recebida desequilibra e desfalca as contas a pagar imediatas do negócio.",
      icon: DollarSign,
      badge: `${outstandingDebtData.count} Pendentes`,
      badgeColor: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Existem atualmente <strong>{outstandingDebtData.count} contas/vendas marcadas como pendentes de pagamento</strong>, totalizando <strong className="text-red-500 font-bold">{formatCurrency(outstandingDebtData.totalPendingAmount)}</strong> que ainda não entraram em caixa real comercial.
          </p>

          {outstandingDebtData.list.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Contas a Receber Críticas:</p>
              <div className="space-y-2">
                {outstandingDebtData.list.map(s => {
                  const clientName = s.customerName || "Consumidor";
                  const phone = s.customerPhone || "";
                  const cText = `Olá ${clientName}, tudo bem? Passando para te lembrar que temos em aberto a sua comprinha de cosméticos em nosso sistema de ${formatCurrency(s.total)}. Posso liberar a chave PIX para você quitar hoje? Muito obrigado!`;
                  const waUrl = phone ? `https://api.whatsapp.com/send?phone=55${phone.replace(/\D/g, '')}&text=${encodeURIComponent(cText)}` : '#';

                  return (
                    <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{clientName}</p>
                        <p className="text-[10px] font-semibold text-slate-450">{s.daysAgo} dias de atraso • data {new Date(s.date + 'T12:00:00Z').toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-red-500 font-mono">{formatCurrency(s.total)}</span>
                        {phone && (
                          <a 
                            href={waUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
                            title="Enviar lembrete amigável no Whatsapp"
                          >
                            <MessageSquare size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-3 bg-amber-500/10 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-500/20 text-[11px]">
            🚫 <strong>REGRA DE OURO</strong>: Nunca marque vendas como pendentes ou conceda prazos sem que o cliente tenha cadastro completo no painel (incluindo CPF e telefone atualizado). Incentive sempre o pagamento via PIX ou link de cartão de crédito.
          </div>
        </div>
      )
    },
    {
      title: "Alavanque a Taxa de Recorrência",
      subtitle: "Sua taxa atual de clientes recorrentes é de suma importância para a estabilização de caixa.",
      icon: UserCheck,
      badge: `${loyaltyMetrics.rate.toFixed(0)}% Recorrência`,
      badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Seu salão possui <strong>{loyaltyMetrics.totalInDB} clientes integrados</strong>. Destes, <strong>{loyaltyMetrics.loyalCount} fizeram mais de uma compra</strong>. Isso resulta em uma taxa de recompra de <strong className="text-purple-600">{loyaltyMetrics.rate.toFixed(1)}%</strong>.
          </p>

          {loyaltyMetrics.vipCustomer && (
            <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/20 rounded-2xl border border-purple-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase text-purple-500 tracking-wider">🌟 Sua Cliente VIP Nº 1:</p>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase mt-1 leading-none">{loyaltyMetrics.vipCustomer.name}</h4>
                <p className="text-[10px] font-semibold text-slate-500 mt-1">Total investido em compras: {formatCurrency(loyaltyMetrics.vipCustomer.totalBought)}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="p-2 bg-amber-500 text-white rounded-xl text-lg font-bold">🥇</span>
              </div>
            </div>
          )}

          <div className="p-3 bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded-md text-[11px] leading-relaxed">
            🎁 <strong>AÇÃO IMEDIATA</strong>: Envie uma mensagem personalizada agradecendo o apoio da sua melhor cliente. Ofereça um voucher presente para ela presentear uma amiga próxima — isso capta novos clientes de forma totalmente natural e barata!
          </div>
        </div>
      )
    },
    {
      title: "Aqueça Dias de Baixo Fluxo",
      subtitle: "Aproveite os dias tradicionalmente frios da semana para rodar promoções exclusivas das vendedoras.",
      icon: Calendar,
      badge: "Planejamento Diário",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      content: (
        <div className="space-y-4 text-left">
          {weedaysMetrics.weakestDay && weedaysMetrics.strongestDay ? (
            <p className="text-xs text-slate-605 dark:text-slate-400 leading-relaxed">
              O dia de maior giro em seu salão é <strong>{weedaysMetrics.strongestDay.dayName}-feira</strong> com média de <strong className="text-indigo-600">{formatCurrency(weedaysMetrics.strongestDay.average)}</strong> faturados. 
              Por outro lado, o dia mais frio de todos é <strong>{weedaysMetrics.weakestDay.dayName}-feira</strong>, registrando uma média de faturamento diário bem inferior: <strong className="text-rose-500">{formatCurrency(weedaysMetrics.weakestDay.average)}</strong>.
            </p>
          ) : (
            <p className="text-xs text-slate-500">Aguardando mais vendas finalizadas para apontar sazonalidades semanais exatas.</p>
          )}

          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 rounded-xl space-y-2">
            <h5 className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Ação para {weedaysMetrics.weakestDay?.dayName || "Segunda"}-feiras:</h5>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Crie a campanha <strong>"Dia das Amigas"</strong> e envie aos domingos à noite. Diga que agendando serviços em dupla para {weedaysMetrics.weakestDay?.dayName || "Segunda"}-feira, ambas as clientes ganham uma revitalização fácil de cortesia.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Formule Combos / Kits Inteligentes",
      subtitle: "A melhor forma de acelerar vendas de itens lentos é casando-o com seu campeão de vendas histórico.",
      icon: BookmarkCheck,
      badge: "Venda Cruzada (Cross-Sell)",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Casar o principal item de maior procura do seu salão com algum item lento de cosméticos que está empacado no estoque cria valor instantâneo e reduz custos de depreciação.
          </p>

          {crossSellingCombo.starProduct && crossSellingCombo.quietProduct ? (
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-850 dark:to-teal-900/10 border border-emerald-150 rounded-2xl space-y-3">
              <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">🛠️ Ideia de Combo Casado Automatizado:</h5>
              <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{crossSellingCombo.starProduct.name}</span>
                <span className="text-slate-300 font-bold">+</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{crossSellingCombo.quietProduct.name}</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-normal">
                Anunciar um combo exclusivo das duas peças juntas com 15% de desconto de bônus estimula o cliente a expandir a cesta de compras!
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Cadastre mais itens e registre faturas para que a IA formule seus combos personalizados.</p>
          )}
        </div>
      )
    },
    {
      title: "Campanha Ativa de Aniversários",
      subtitle: "Aniversário é a oportunidade mais poderosa que existe para ativação de lembrança de marca no varejo.",
      icon: Gift,
      badge: `${upcomingBirthdays.count} Aniversariantes`,
      badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-500/20",
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Temos um total de <strong>{upcomingBirthdays.count} clientes cadastrados</strong> que fazem aniversário durante o mês vigente de operação.
          </p>

          {upcomingBirthdays.celebrators.length > 0 ? (
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Aniversariantes do Mês:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {upcomingBirthdays.celebrators.slice(0, 4).map(c => {
                  const bMsg = `Parabéns ${c.name}! 🎉 Desejamos muitas felicidades e anos de vida! Para celebrar, preparamos um presente especial para você: R$ 20,00 de desconto adicional na sua próxima hidratação ou compra de produto esta semana! Espero você ❤️`;
                  const waUrl = `https://api.whatsapp.com/send?phone=55${c.phone.replace(/\D/g, '')}&text=${encodeURIComponent(bMsg)}`;

                  return (
                    <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{c.name}</p>
                        <p className="text-[10px] font-semibold text-rose-500">Dia {c.formattedBirthday}</p>
                      </div>
                      <a 
                        href={waUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1 px-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 uppercase tracking-wide tracking-wider cursor-pointer"
                        title="Enviar Parabéns!"
                      >
                        <Gift size={10} /> Parabenizar
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 dark:bg-slate-950/20 text-slate-400 italic text-xs rounded-xl">Nenhum aniversariante registrado neste mês corrente.</div>
          )}
        </div>
      )
    },
    {
      title: "Auditoria Ativa e Despesas Rigorosas",
      subtitle: "Um dashboard inteligente só mostra o lucro correto quando as saídas estão lançadas rigorosamente.",
      icon: Calculator,
      badge: "Saneamento de Caixa",
      badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      content: (
        <div className="space-y-4 text-left">
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Receita Bruta:</span>
              <span className="font-mono font-black text-slate-800 dark:text-slate-100">{formatCurrency(financialRatios.totalRev)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Custo de Produtos (COGS):</span>
              <span className="font-mono font-bold text-rose-500">-{formatCurrency(financialRatios.totalCOGS)}</span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 pt-1.5 flex justify-between items-center text-xs">
              <span className="font-black text-slate-650 dark:text-slate-300">Lucro Bruto Estimado:</span>
              <span className="font-mono font-black text-emerald-500">{formatCurrency(financialRatios.grossProfit)} ({financialRatios.profitMarginPercent.toFixed(1)}%)</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-indigo-700 dark:text-indigo-300">
            📝 <strong>RECOMENDAÇÃO OPERACIONAL</strong>: Use a seção Financeira / Controle de Categoria para registrar custos fixos, como aluguel, energia e insumos descartáveis. Manter despesas integradas garante um DRE real e evita surpresas fiscais no fim das contas!
          </p>
        </div>
      )
    }
  ];

  // Calculte completion statistics
  const completionPercent = Math.round((completedTips.length / tipsArray.length) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-805 rounded-[40px] p-8 shadow-md space-y-6 text-left transition-all relative overflow-hidden" id="interactive-tips-panel">
      <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-50 dark:border-slate-850">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-sans">
            <Sparkles size={18} className="text-amber-500 animate-pulse" />
            Central de Saúde e Gestão Comercial • 10 Dicas Reais
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            10 ferramentas inteligentes e diagnósticos analíticos extraídos em tempo real do seu banco de dados.
          </p>
        </div>
        <div className="text-[10px] bg-indigo-50 dark:bg-indigo-950/30 px-3.5 py-1.5 rounded-full font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border border-indigo-100/30">
          Diagnóstico do Painel Ativo 🩺
        </div>
      </div>

      {/* Gamified progress tracker */}
      <div className="bg-slate-50/50 dark:bg-slate-850/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Status de Implementação:</p>
          <p className="text-[11px] font-bold text-slate-450 uppercase">{completedTips.length} de {tipsArray.length} táticas recomendadas lidas e auditadas</p>
        </div>
        <div className="flex-1 max-w-xs space-y-1.5">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-indigo-500">{completionPercent}% Concluído</span>
            <span className="text-slate-400">Objetivo: 100%</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-850 rounded-full border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-1000 rounded-full"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Interactive 10 Tips Accordions */}
      <div className="space-y-3">
        {tipsArray.map((tip, idx) => {
          const IconComponent = tip.icon;
          const isOpened = activeTip === idx;
          const isDone = completedTips.includes(idx);

          return (
            <div 
              key={`tip-${idx}`}
              className={`border rounded-[24px] overflow-hidden transition-all duration-300 ${
                isOpened 
                  ? "border-indigo-200/60 dark:border-indigo-900/60 shadow-lg bg-indigo-50/5 dark:bg-indigo-950/2 opacity-100" 
                  : isDone 
                    ? "border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/40 opacity-80" 
                    : "border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
              }`}
            >
              <div 
                onClick={() => setActiveTip(isOpened ? null : idx)}
                className="flex items-center justify-between p-4 sm:p-5 cursor-pointer select-none transition-all duration-200"
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 pr-2">
                  <div className={`p-2.5 rounded-xl ${
                    isOpened 
                      ? "bg-indigo-500 text-white shadow-md shadow-indigo-100 dark:shadow-none" 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}>
                    <IconComponent size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <span className="text-xs font-black text-slate-450 uppercase shrink-0 font-display">Tática {idx + 1}</span>
                      {isDone && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500 tracking-wider">
                          <CheckCircle size={10} className="fill-emerald-500 text-white" /> Auditada
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase truncate mt-0.5 leading-tight">{tip.title}</h4>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[9.5px] font-black uppercase tracking-wider px-2.5 py-1 border rounded-lg hidden sm:block ${tip.badgeColor}`}>
                    {tip.badge}
                  </span>
                  
                  {isOpened ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>

              {/* Accordion Content */}
              {isOpened && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-50 dark:border-slate-850 space-y-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 leading-normal">
                    {tip.subtitle}
                  </p>
                  
                  {/* Dynamic calculation rendering depending on tip details */}
                  <div className="pt-2">
                    {tip.content}
                  </div>

                  {/* Mark as complete checkbox */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-805 flex-col sm:flex-row gap-3">
                    <div className="text-[10px] font-bold text-slate-400">
                      Entendeu e arrumou o painel de acordo com a dica? Marque ao lado!
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCompleted(idx);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer ${
                        isDone 
                          ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                          : "bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm"
                      }`}
                    >
                      {isDone ? (
                        <>
                          <CheckCircle size={14} className="fill-emerald-500 text-white" /> Conclído! Reativar
                        </>
                      ) : (
                        <>
                          <BookmarkCheck size={14} /> Marcar como Auditada
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {copiedText && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 z-50 animate-in fade-in-50 duration-200">
          <CheckCircle size={14} className="text-emerald-400" /> Copiado! Texto para: "{copiedText}"
        </div>
      )}
    </div>
  );
};
