import React from 'react';
import { motion } from 'motion/react';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Trophy, 
  Calendar, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  FileSpreadsheet,
  Clock,
  Package
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import * as XLSX from 'xlsx';

// Utility helper to copy classnames cn function conditionally if needed
const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

interface GestaoViewProps {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: string[];
  dashboardMetrics: {
    goalStats: {
      monthly: {
        reached: number;
        goal: number;
        percent: number;
        salesCount: number;
      };
    };
    advancedStats: {
      avgTicket: number;
      growth: number;
      repurchaseRate?: number;
    };
    staff: Array<{
      name: string;
      total: number;
      count: number;
      commission: number;
    }>;
    dayTrends: Array<{
      name: string;
      total: number;
      workedDays: number;
      salesCount: number;
      average: number;
    }>;
  };
  formatCurrency: (value: number) => string;
  sales: any[];
  products: any[];
  settings: any;
}

export const GestaoView: React.FC<GestaoViewProps> = ({
  selectedMonth,
  setSelectedMonth,
  availableMonths,
  dashboardMetrics,
  formatCurrency,
  sales,
  products,
  settings
}) => {
  const { goalStats, advancedStats, staff: salesByStaff, dayTrends: salesByDay } = dashboardMetrics;

  const totalFaturamento = goalStats.monthly.reached;
  const totalCount = goalStats.monthly.salesCount;
  const avgTicket = advancedStats.avgTicket;

  // Find the top consultant
  const topConsultant = salesByStaff.length > 0 ? salesByStaff[0] : null;

  // Filter worked days that have sales
  const activeDays = salesByDay.filter(d => d.total > 0);
  const bestDayOfWeek = activeDays.length > 0 ? [...activeDays].sort((a, b) => b.total - a.total)[0] : null;

  const inactiveProducts = React.useMemo(() => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    return products.filter(p => {
      const lastSold = p.lastSoldAt ? new Date(p.lastSoldAt) : new Date(p.createdAt || Date.now());
      return lastSold < sixtyDaysAgo && p.stock > 0;
    });
  }, [products]);

  const smartManagementTips = React.useMemo(() => {
    const tips = [];

    // Tip 1: Promoção de produto parado (Slow-moving product)
    if (inactiveProducts && inactiveProducts.length > 0) {
      const stagnantCount = inactiveProducts.length;
      const sampleProducts = inactiveProducts.slice(0, 2).map(p => p.name).join(', ');
      tips.push({
        id: 'stagnant_promotion',
        title: 'Promoção de Estoque Parado',
        badge: 'Giro de Estoque',
        color: 'rose',
        icon: 'Package',
        metric: `${stagnantCount} itens parados`,
        description: `Existem itens com estoque parado sem saídas registradas há mais de 60 dias (ex: ${sampleProducts}).`,
        action: `Sugerimos estruturar uma promoção de preço ou pacote combo ("Leve 2, Ganhe desconto de ${settings?.maxDiscountLimit || 20}%") para liberar espaço no estoque e reverter o produto parado em capital ativo de giro.`
      });
    }

    // Tip 2: Reforço de vendas em dias de baixo fluxo (Low-flow day)
    if (salesByDay && salesByDay.length > 0) {
      const sortedBySales = [...salesByDay].sort((a, b) => a.total - b.total);
      // The lowest day that actually has a name and belongs to standard days
      const lowestDay = sortedBySales.find(d => d.total > 0 && d.name !== 'Domingo') || sortedBySales[0];
      if (lowestDay && lowestDay.name) {
        tips.push({
          id: 'low_flow_sales',
          title: `Reforço de Vendas: ${lowestDay.name}`,
          badge: 'Fluxo Semanal',
          color: 'amber',
          icon: 'Clock',
          metric: `Menor fluxo registrado`,
          description: `Os relatórios mostram que as ${lowestDay.name}s concentram o menor fluxo de faturamento.`,
          action: `Crie a campanha "${lowestDay.name} de Descontos" ou lance pontuação em dobro no programa de fidelidade para atrair clientes neste dia estratégico de baixo fluxo.`
        });
      }
    }

    // Tip 3: Upselling / ticket médio
    if (advancedStats && advancedStats.avgTicket) {
      const ticketVal = advancedStats.avgTicket;
      if (ticketVal < 100) {
        tips.push({
          id: 'upselling_strategy',
          title: 'Alavancagem de Ticket Médio',
          badge: 'Faturamento',
          color: 'emerald',
          icon: 'TrendingUp',
          metric: `Ticket médio: ${formatCurrency(ticketVal)}`,
          description: `Seu ticket médio atual está abaixo de R$ 100. Há excelente margem de crescimento nas vendas por cliente.`,
          action: `Promova o upselling de cosméticos ou acessórios secundários na boca do caixa, oferecendo descontos progressivos em kits ou combos de autocuidado.`
        });
      }
    }

    // Tip 4: Recompra e campanhas de CRM
    const repurchase = advancedStats.repurchaseRate || 18.5; // fallback
    if (repurchase < 40) {
      tips.push({
        id: 'crm_repurchase',
        title: 'Reativação de Contatos',
        badge: 'Fidelização',
        color: 'indigo',
        icon: 'Users',
        metric: `${repurchase.toFixed(1)}% taxa de retorno`,
        description: `Uma fatia considerável de clientes fizeram apenas uma compra isolada no último mês.`,
        action: `Selecione no CRM clientes inativos há mais de 45 dias e dispare mensagens personalizadas com carinho ou um cupom especial de retorno para motivar a recompra.`
      });
    }

    return tips;
  }, [salesByDay, inactiveProducts, advancedStats, settings, formatCurrency]);

  // Year over Year (YoY) Performance Comparison
  const selectedYear = React.useMemo(() => {
    if (!selectedMonth) return new Date().getFullYear();
    const match = selectedMonth.match(/\d{4}/);
    return match ? parseInt(match[0]) : new Date().getFullYear();
  }, [selectedMonth]);

  const previousYear = selectedYear - 1;

  const yoyData = React.useMemo(() => {
    const monthsBR = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    const currentYearSales = Array(12).fill(0);
    const prevYearSales = Array(12).fill(0);

    sales.forEach(s => {
      if (s.status !== 'completed' && s.status !== 'Pago') {
        // Some systems might have varying status strings
        if (s.status && s.status.toLowerCase() === 'cancelled') return;
      }
      try {
        const dObj = s.date ? new Date(s.date) : null;
        if (!dObj || isNaN(dObj.getTime())) return;
        const year = dObj.getFullYear();
        const monthIndex = dObj.getMonth();

        if (year === selectedYear) {
          currentYearSales[monthIndex] += s.total || 0;
        } else if (year === previousYear) {
          prevYearSales[monthIndex] += s.total || 0;
        }
      } catch (e) {
        console.error("Error parsing date for YoY", e);
      }
    });

    let accCurrent = 0;
    let accPrev = 0;

    return monthsBR.map((month, idx) => {
      accCurrent += currentYearSales[idx];
      accPrev += prevYearSales[idx];

      return {
        name: month,
        [selectedYear.toString()]: Number(accCurrent.toFixed(2)),
        [previousYear.toString()]: Number(accPrev.toFixed(2))
      };
    });
  }, [sales, selectedYear, previousYear]);

  const totalCurrentYear = yoyData[11]?.[selectedYear.toString()] || 0;
  const totalPrevYear = yoyData[11]?.[previousYear.toString()] || 0;
  const yoyGrowthPercent = totalPrevYear > 0 ? ((totalCurrentYear - totalPrevYear) / totalPrevYear) * 100 : 0;

  const handleExportExcel = () => {
    // Tab 1: Resumo Executivo
    const summaryData = [
      { Métrica: "Mês de Referência", Valor: selectedMonth },
      { Métrica: "Faturamento Total", Valor: formatCurrency(totalFaturamento) },
      { Métrica: "Quantidade de Vendas", Valor: totalCount },
      { Métrica: "Ticket Médio", Valor: formatCurrency(avgTicket) },
      { Métrica: "Crescimento vs Mês Anterior", Valor: `${advancedStats.growth.toFixed(2)}%` }
    ];

    // Tab 2: Desempenho por Consultora
    const staffExport = salesByStaff.map((st, idx) => ({
      Posição: idx + 1,
      Consultora: st.name,
      "Faturamento Total (R$)": st.total,
      "Atendimentos (Vendas)": st.count,
      "Comissão Estimada (R$)": st.commission || 0,
      "Ticket Médio (R$)": st.count > 0 ? (st.total / st.count) : 0
    }));

    // Tab 3: Sazonalidade Semanal
    const weekdayExport = salesByDay.map((d, idx) => ({
      Posição: idx + 1,
      "Dia de Semana": `${d.name}-feira`,
      "Faturamento Direto (R$)": d.total,
      "Vendas Efetuadas": d.salesCount,
      "Dias Trabalhados": d.workedDays,
      "Média Diária (R$)": d.average
    }));

    // Tab 4: Lista Completa de Vendas do Mês
    const monthlySales = sales.filter(s => {
      try {
        const dObj = s.date ? new Date(s.date) : null;
        if (!dObj || isNaN(dObj.getTime())) return false;
        const mLabel = dObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        return mLabel === selectedMonth;
      } catch (e) {
        return false;
      }
    });

    const salesListExport = monthlySales.map((s, idx) => ({
      "Índice": idx + 1,
      "ID Venda": s.id || '',
      "Data": s.date ? new Date(s.date).toLocaleDateString('pt-BR') : '',
      "Cliente": s.customerName || 'Cliente Avulso',
      "Vendedora": s.vendedora || 'Avulsa',
      "Método de Pagamento": s.paymentMethod || 'Outro',
      "Faturamento Bruto (R$)": s.total || 0,
      "Desconto (R$)": s.discount || 0,
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Convert datasets to sheets
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsStaff = XLSX.utils.json_to_sheet(staffExport);
    const wsWeekday = XLSX.utils.json_to_sheet(weekdayExport);
    const wsSalesList = XLSX.utils.json_to_sheet(salesListExport);

    // Append sheets to workbook
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo Executivo");
    XLSX.utils.book_append_sheet(wb, wsStaff, "Desempenho Equipe");
    XLSX.utils.book_append_sheet(wb, wsWeekday, "Sazonalidade Semanal");
    XLSX.utils.book_append_sheet(wb, wsSalesList, "Vendas Detalhadas");

    // Save workbook
    XLSX.writeFile(wb, `Consolidado_Gestao_Biobel_${selectedMonth.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <motion.div 
      key="gestao-view"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 animate-in fade-in duration-300"
    >
      {/* 1. Portal Executive Entry Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[32px] border border-slate-800 shadow-xl relative overflow-hidden text-left">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 bottom-0 w-48 h-48 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="space-y-2.5 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500 text-white px-2.5 py-1 rounded-lg">Visão de Gestão</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">Análise Consolidada</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans text-white">
            Portal de Gestão Direta <span className="text-indigo-400 capitalize">{selectedMonth}</span>
          </h2>
          <p className="text-xs text-slate-300 font-medium max-w-2xl leading-relaxed">
            Painel simplificado projetado para tomadas de decisão gerenciais. Veja as principais métricas de faturamento, monitore o ranking por vendedora e analise a sazonalidade semanal dos atendimentos.
          </p>
        </div>

        {/* Actions Row: Month Filter & Excel Export */}
        <div className="flex flex-wrap items-center gap-3 z-10 self-start xl:self-center shrink-0">
          <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
            <Calendar className="text-indigo-400 shrink-0 ml-1" size={16} />
            <div className="flex flex-col">
              <span className="text-[8px] font-bold uppercase text-indigo-300 tracking-wider">Mês sob Avaliação</span>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-4 uppercase tracking-wider"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m} className="bg-slate-900 text-white font-medium">{m}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2.5 rounded-2xl border border-emerald-500/20 text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer hover:shadow-emerald-950/20"
          >
            <FileSpreadsheet size={16} /> Exportar Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Componente de Dicas de Gestão Inteligente */}
      <div className="bg-gradient-to-br from-indigo-500/10 via-slate-50 to-indigo-50/10 dark:from-indigo-950/20 dark:via-slate-905/60 dark:to-slate-900 p-8 rounded-[36px] border border-indigo-100/50 dark:border-indigo-950/40 shadow-xs space-y-6 text-left relative overflow-hidden mb-6">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-100/30 dark:border-indigo-950/30">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-500 animate-pulse" />
              💡 Central de Gestão Inteligente & Recomendações
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              Análise automática de faturamento, estoque de produtos e desempenho comercial
            </p>
          </div>
          <div className="text-[9px] bg-indigo-500/10 dark:bg-indigo-950/50 px-3.5 py-1.5 rounded-full font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border border-indigo-500/10">
            Inteligência Comercial 🧠
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {smartManagementTips.map((tip, idx) => {
            const Icon = tip.icon === 'Package' ? Package : tip.icon === 'Clock' ? Clock : tip.icon === 'TrendingUp' ? TrendingUp : Users;
            const borderColors = {
              rose: 'border-rose-100 dark:border-rose-950/40 hover:border-rose-300 dark:hover:border-rose-900/60',
              amber: 'border-amber-100 dark:border-amber-950/40 hover:border-amber-300 dark:hover:border-amber-900/60',
              emerald: 'border-emerald-100 dark:border-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-900/60',
              indigo: 'border-indigo-100 dark:border-indigo-950/40 hover:border-indigo-350 dark:hover:border-indigo-900/60',
            }[tip.color as 'rose'|'amber'|'emerald'|'indigo'] || 'border-slate-100 dark:border-slate-800';
            
            const badgeBg = {
              rose: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400',
              amber: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
              emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
              indigo: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400',
            }[tip.color as 'rose'|'amber'|'emerald'|'indigo'] || 'bg-slate-50 dark:bg-slate-800 text-slate-600';

            return (
              <motion.div
                key={tip.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.08 }}
                className={cn(
                  "bg-white dark:bg-slate-900 p-5 rounded-3xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-xs flex flex-col justify-between space-y-4 shadow-2xs cursor-default",
                  borderColors
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={cn("px-2.5 py-1 rounded-xl text-[8.5px] font-black uppercase tracking-wider shrink-0", badgeBg)}>
                      {tip.badge}
                    </span>
                    <span className="text-[9px] font-mono font-black text-slate-400 dark:text-slate-500 uppercase">
                      {tip.metric}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-xl shrink-0", badgeBg)}>
                      <Icon size={14} />
                    </div>
                    <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {tip.title}
                    </h5>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                    {tip.description}
                  </p>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-dashed border-slate-100 dark:border-slate-800/40">
                  <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 leading-snug">
                    <strong className="text-slate-800 dark:text-indigo-400 font-black tracking-wide">AÇÃO PRÁTICA:</strong> {tip.action}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 2. Key Executive Big Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Faturamento do Mês */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:shadow-md transition-all duration-350">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-20 h-20 bg-rose-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform" />
          
          <div className="flex justify-between items-start">
            <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl">
              <DollarSign size={22} />
            </div>
            {advancedStats.growth !== 0 && (
              <span className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                advancedStats.growth > 0 
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-450' 
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-450'
              }`}>
                {advancedStats.growth > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {advancedStats.growth > 0 ? '+' : ''}{advancedStats.growth.toFixed(1)}%
              </span>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-sans">Faturamento Mensal</p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white font-sans tracking-tight">
              {formatCurrency(totalFaturamento)}
            </h3>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
            <div className="flex justify-between text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">
              <span>Metas e Objetivos</span>
              <span>{Math.round(goalStats.monthly.percent)}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(goalStats.monthly.percent, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-555 dark:text-slate-400 font-medium">
              Meta estabelecida: <strong className="text-slate-700 dark:text-slate-350 font-bold">{formatCurrency(goalStats.monthly.goal)}</strong>
            </p>
          </div>
        </div>

        {/* Card 2: Total Atendimentos */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:shadow-md transition-all duration-350">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform" />

          <div className="flex justify-between items-start">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Users size={22} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/5 text-indigo-700 dark:text-indigo-400 border border-indigo-500/10 px-2.5 py-1 rounded-lg">
              Fluxo Ativo
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-sans">Total de Atendimentos</p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white font-sans tracking-tight">
              {totalCount} <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">vendas</span>
            </h3>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
            {totalCount > 0 ? (
              <p>
                Representa uma frequência sólida de atendimentos faturados. Invista em ações de cross-selling para maximizar o retorno por cliente.
              </p>
            ) : (
              <p>
                Sem fluxo de atendimentos registrado neste período. Organize promoções no WhatsApp ou envie cupons especiais de retorno.
              </p>
            )}
          </div>
        </div>

        {/* Card 3: Ticket Médio */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6 text-left relative overflow-hidden group hover:shadow-md transition-all duration-350">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-20 h-20 bg-amber-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform" />

          <div className="flex justify-between items-start">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <TrendingUp size={22} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/5 text-amber-700 dark:text-amber-400 border border-amber-500/10 px-2.5 py-1 rounded-lg">
              Gastos Médios
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-sans">Ticket Médio das Vendas</p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white font-sans tracking-tight">
              {formatCurrency(avgTicket)}
            </h3>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
            {avgTicket > 0 ? (
              <p>
                Cada visita gera faturamento médio de <strong className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(avgTicket)}</strong>. Experimente combos de produtos e serviços para expandir este índice.
              </p>
            ) : (
              <p>
                Aguardando lançamentos no período selecionado para calcular o indicador de ticket médio de vendas.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* 2.5. YoY Performance Comparison Chart (Ano Atual vs Anterior) */}
      <div className="bg-white dark:bg-slate-900 rounded-[28px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 text-left transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400">
              <TrendingUp size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Análise de Crescimento Anual</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-sans">
              Comparativo de Desempenho (YoY)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Comparação do faturamento acumulado mês a mês entre {selectedYear} e o ano anterior {previousYear}
            </p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-850 px-4 py-2.5 rounded-xl border border-slate-150 dark:border-slate-750 font-sans text-left">
            <span className="text-[10px] font-bold text-slate-505 dark:text-slate-400 block uppercase tracking-wider">Crescimento Acumulado Atual ({selectedYear})</span>
            <span className="text-lg font-black font-mono text-indigo-650 dark:text-indigo-400">
              {formatCurrency(totalCurrentYear)}
            </span>
            <span className={cn(
              "text-[10px] font-black block mt-0.5",
              yoyGrowthPercent >= 0 ? "text-emerald-600 dark:text-emerald-450" : "text-rose-600 dark:text-rose-450"
            )}>
              {yoyGrowthPercent >= 0 ? '+' : ''}{yoyGrowthPercent.toFixed(1)}% vs {previousYear} ({formatCurrency(totalPrevYear)})
            </span>
          </div>
        </div>

        <div className="h-[320px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={yoyData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCurrentYear" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPrevYear" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#94A3B8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }}
                tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000) + 'k' : value}`}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip 
                formatter={(value: any) => [formatCurrency(value), 'Faturamento Acumulado']}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Area 
                type="monotone" 
                dataKey={selectedYear.toString()} 
                stroke="#4F46E5" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCurrentYear)" 
                name={`Faturamento Acumulado ${selectedYear}`}
              />
              <Area 
                type="monotone" 
                dataKey={previousYear.toString()} 
                stroke="#94A3B8" 
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1} 
                fill="url(#colorPrevYear)" 
                name={`Faturamento Acumulado ${previousYear}`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Duo Column Leaderboard Ranking Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEADERBOARD ranking of TOP sellers */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy size={18} className="text-amber-500 shrink-0" />
                Melhores Vendedoras por Faturamento
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Soma de faturamento focado no desempenho individual
              </p>
            </div>
            <span className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full uppercase font-bold tracking-wider border border-slate-100 dark:border-slate-800 self-start sm:self-center">
              Ranking
            </span>
          </div>

          {salesByStaff.length > 0 ? (
            <div className="space-y-3.5">
              {salesByStaff.map((st, idx) => {
                const maxVal = salesByStaff[0].total || 1;
                const widthPct = (st.total / maxVal) * 100;
                
                return (
                  <div key={st.name} className="p-4 bg-slate-50/50 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/80 rounded-[16px] transition-all duration-200">
                    <div className="flex justify-between items-center gap-4 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{st.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{st.count} atendimentos feitos</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">{formatCurrency(st.total)}</p>
                        {st.count > 0 && (
                          <span className="text-[9px] text-slate-450 font-bold uppercase">Média: {formatCurrency(st.total / st.count)}</span>
                        )}
                      </div>
                    </div>

                    {/* Progress indicator comparative bar */}
                    <div className="h-1.5 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          idx === 0 ? 'bg-amber-400' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-[16px]">
              <p className="text-xs text-slate-500 italic">Nenhum dado das consultoras cadastrado para este período.</p>
            </div>
          )}

          {topConsultant && topConsultant.total > 0 && (
            <div className="p-4 bg-amber-500/5 text-amber-805 dark:text-amber-400 rounded-2xl border border-amber-500/10 text-xs leading-relaxed flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-xs uppercase flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <Star size={14} className="fill-amber-400 text-amber-500" /> Destaque Comercial
                </h4>
                <p className="font-medium text-slate-600 dark:text-slate-300">
                  A consultora <strong className="font-bold">{topConsultant.name}</strong> lidera o período atual com <strong className="font-bold">{formatCurrency(topConsultant.total)}</strong> de faturamento direto! Compartilhe o roteiro de abordagem dela com a equipe.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RANKING of BEST sales days of the week */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar size={18} className="text-indigo-500 shrink-0" />
                Rank de Dias da Semana mais Lucrativos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Pico de faturamento segmentado por sazonalidade semanal
              </p>
            </div>
            <span className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full uppercase font-bold tracking-wider border border-slate-100 dark:border-slate-800 self-start sm:self-center">
              Total Líquido
            </span>
          </div>

          {activeDays.length > 0 ? (
            <div className="space-y-3.5">
              {activeDays.map((day, idx) => {
                const maxDayVal = activeDays[0].total || 1;
                const widthPct = (day.total / maxDayVal) * 100;
                
                return (
                  <div key={day.name} className="p-4 bg-slate-50/50 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/80 rounded-[16px] transition-all duration-200">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-900 dark:text-white">{day.name}-feira</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{day.salesCount} vendas • média diária {formatCurrency(day.average)}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-white font-mono">{formatCurrency(day.total)}</span>
                      </div>
                    </div>

                    <div className="h-1.5 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-[16px]">
              <p className="text-xs text-slate-500 italic">Aguardando lançamentos para compor o gráfico comparativo semanal.</p>
            </div>
          )}

          {bestDayOfWeek && (
            <div className="p-4 bg-indigo-500/5 text-indigo-850 dark:text-indigo-400 rounded-2xl border border-indigo-500/10 text-xs leading-relaxed">
              💡 <strong>Inteligência de Escala</strong>: O seu melhor fluxo registrado ocorre às <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{bestDayOfWeek.name}-feira</strong> com média de <strong className="font-bold">{formatCurrency(bestDayOfWeek.total)}</strong>. Aproveite este dia para promover ações rápidas e lançamentos de produtos adicionais de beleza.
            </div>
          )}
        </div>

      </div>

      {/* 4. Smart Business Suggestion & Advisory Section */}
      <div className="p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-[24px] border border-slate-800 text-xs text-left space-y-4 shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 font-sans">
          <Sparkles size={14} className="text-amber-300 animate-pulse" />
          Insight Inteligente de Gestão Comercial
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed font-sans text-slate-200 text-xs">
          <p>
            Com faturamento consolidado de <strong className="text-white">{formatCurrency(totalFaturamento)}</strong> em <strong className="text-white">{totalCount} atendimentos</strong>, seu ticket médio está em <strong className="text-white">{formatCurrency(avgTicket)}</strong>.
            Aumentar este ticket médio em apenas 10% oferecendo kits domésticos complementares gerará um incremento livre estimado de <strong className="text-emerald-400 font-bold">{formatCurrency(totalFaturamento * 0.1)}</strong> sem despesas extras com captação!
          </p>
          <p className="border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 text-slate-300">
            📌 <strong>Tática de Alavancagem</strong>: Oriente a força de vendas a fazer sugestões cruzadas inteligentes (ex: indicar sempre shampoos e leave-in correspondentes). Montar pequenos kits temáticos decorativos na vitrine também agiliza as decisões por impulso dos clientes.
          </p>
        </div>
      </div>

    </motion.div>
  );
};
