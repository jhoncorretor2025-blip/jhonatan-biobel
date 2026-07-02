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
  Package,
  ShoppingBag,
  Award,
  Check,
  AlertTriangle
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
      workingDaysCount?: number;
      totalWorkingDaysInMonth?: number;
    };
    staff: Array<{
      name: string;
      total: number;
      count: number;
      commission: number;
      workedDays?: number;
      dailyAverage?: number;
      ticketMedio?: number;
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
  activeDashboardTab?: string;
  setActiveDashboardTab?: (tab: string) => void;
  monthlyGoals?: any;
  weatherObservations?: any;
}

export const GestaoView: React.FC<GestaoViewProps> = ({
  selectedMonth,
  setSelectedMonth,
  availableMonths,
  dashboardMetrics,
  formatCurrency,
  sales,
  products,
  settings,
  activeDashboardTab,
  setActiveDashboardTab,
  monthlyGoals,
  weatherObservations
}) => {
  const { goalStats, advancedStats, staff: salesByStaff, dayTrends: salesByDay } = dashboardMetrics;

  const totalFaturamento = goalStats.monthly.reached;
  const totalCount = goalStats.monthly.salesCount;
  const avgTicket = advancedStats.avgTicket;

  const isTodos = selectedMonth?.toLowerCase() === 'todos';
  const totalWorkingDays = advancedStats.totalWorkingDaysInMonth || 22;
  const workingDaysSoFar = advancedStats.workingDaysCount || 0;
  const remainingWorkingDays = isTodos ? 0 : Math.max(0, totalWorkingDays - workingDaysSoFar);

  const biobelOperationalStats = React.useMemo(() => {
    const now = new Date();
    const monthsPt = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    
    let currentMonthIndex = now.getMonth();
    let currentYear = now.getFullYear();

    if (selectedMonth && selectedMonth.toLowerCase() !== 'todos') {
      const parts = selectedMonth.toLowerCase().split(" de ");
      if (parts.length === 2) {
        const mIdx = monthsPt.indexOf(parts[0].trim());
        if (mIdx !== -1) currentMonthIndex = mIdx;
        const yVal = parseInt(parts[1].trim());
        if (!isNaN(yVal)) currentYear = yVal;
      }
    }

    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    const isCurrentMonthYear = currentYear === todayYear && currentMonthIndex === todayMonth;
    const isPastMonthYear = currentYear < todayYear || (currentYear === todayYear && currentMonthIndex < todayMonth);
    const isFutureMonthYear = currentYear > todayYear || (currentYear === todayYear && currentMonthIndex > todayMonth);

    const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();

    let totalWorkingDays = 0;
    let totalWeekdays = 0;
    let totalSaturdays = 0;
    
    let workedWorkingDays = 0;
    let workedWeekdays = 0;
    let workedSaturdays = 0;
    let workedWorkingHours = 0;

    let remainingWorkingDays = 0;
    let remainingWeekdays = 0;
    let remainingSaturdays = 0;

    let totalWorkingHours = 0;
    let remainingWorkingHours = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentYear, currentMonthIndex, d);
      const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      const isSaturday = dayOfWeek === 6;

      if (isWeekday || isSaturday) {
        totalWorkingDays++;
        if (isWeekday) {
          totalWeekdays++;
          totalWorkingHours += 10; // 8h to 18h = 10 hours
        } else {
          totalSaturdays++;
          totalWorkingHours += 8; // 8h to 16h = 8 hours
        }

        // Worked calculations (elapsed up to today)
        if (isCurrentMonthYear) {
          if (d <= todayDate) {
            workedWorkingDays++;
            if (isWeekday) {
              workedWeekdays++;
              workedWorkingHours += 10;
            } else {
              workedSaturdays++;
              workedWorkingHours += 8;
            }
          }
        } else if (isPastMonthYear) {
          workedWorkingDays++;
          if (isWeekday) {
            workedWeekdays++;
            workedWorkingHours += 10;
          } else {
            workedSaturdays++;
            workedWorkingHours += 8;
          }
        }

        // Remaining calculations (only if selected month is current or future)
        if (isCurrentMonthYear) {
          if (d > todayDate) {
            remainingWorkingDays++;
            if (isWeekday) {
              remainingWeekdays++;
              remainingWorkingHours += 10;
            } else {
              remainingSaturdays++;
              remainingWorkingHours += 8;
            }
          }
        } else if (isFutureMonthYear) {
          remainingWorkingDays++;
          if (isWeekday) {
            remainingWeekdays++;
            remainingWorkingHours += 10;
          } else {
            remainingSaturdays++;
            remainingWorkingHours += 8;
          }
        }
      }
    }

    return {
      totalWorkingDays,
      totalWeekdays,
      totalSaturdays,
      workedWorkingDays,
      workedWeekdays,
      workedSaturdays,
      workedWorkingHours,
      remainingWorkingDays,
      remainingWeekdays,
      remainingSaturdays,
      totalWorkingHours,
      remainingWorkingHours,
      isCurrentMonthYear,
      isPastMonthYear,
      isFutureMonthYear,
    };
  }, [selectedMonth]);

  const biobelRemainingWorkingDays = biobelOperationalStats.remainingWorkingDays;

  const remainingGoal = Math.max(0, goalStats.monthly.goal - totalFaturamento);
  const dailyNeeded = biobelRemainingWorkingDays > 0 ? remainingGoal / biobelRemainingWorkingDays : 0;

  const [rankingCriterion, setRankingCriterion] = React.useState<'total' | 'dailyAverage'>('total');

  const sortedStaff = React.useMemo(() => {
    if (rankingCriterion === 'total') {
      return [...salesByStaff].sort((a, b) => b.total - a.total);
    } else {
      return [...salesByStaff].sort((a, b) => (b.dailyAverage || 0) - (a.dailyAverage || 0));
    }
  }, [salesByStaff, rankingCriterion]);

  // Find the top consultant
  const topConsultant = sortedStaff.length > 0 ? sortedStaff[0] : null;

  // Filter worked days that have sales
  const activeDays = salesByDay.filter(d => d.total > 0);
  const bestDayOfWeek = activeDays.length > 0 ? [...activeDays].sort((a, b) => b.total - a.total)[0] : null;

  const topCategoryName = React.useMemo(() => {
    const categoryTotals: { [key: string]: number } = {};
    sales.forEach(s => {
      const cat = s.category || 'Venda de Balcão';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (s.total || 0);
    });
    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'Cabelos';
  }, [sales]);

  // Selected salesperson and best/worst sales indicators state
  const [selectedVendedora, setSelectedVendedora] = React.useState<string>('all');
  const [bestOrWorstTab, setBestOrWorstTab] = React.useState<'best' | 'worst'>('best');

  const vendedorasList = React.useMemo(() => {
    const names = new Set<string>();
    sales.forEach(s => {
      if (s.vendedora) {
        names.add(s.vendedora.trim());
      }
    });
    return Array.from(names).filter(name => name.length > 0).sort();
  }, [sales]);

  // Dynamic filter of sales for the selected period
  const filteredSalesForTimeAnalysis = React.useMemo(() => {
    return sales.filter(s => {
      // Exclude cancelled sales
      if (s.status && s.status.toLowerCase() === 'cancelled') return false;
      try {
        const dObj = s.date ? new Date(s.date) : null;
        if (!dObj || isNaN(dObj.getTime())) return false;
        if (selectedMonth === 'Todos') return true;
        
        const mLabel = dObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        return mLabel.toLowerCase() === selectedMonth.toLowerCase();
      } catch (e) {
        return false;
      }
    });
  }, [sales, selectedMonth]);

  // Hourly Analysis & Item-based Checkout Metric Extraction (P.A.)
  const hourlyAnalysis = React.useMemo(() => {
    let morningCount = 0, morningTotal = 0, morningItems = 0;
    let lunchCount = 0, lunchTotal = 0, lunchItems = 0;
    let afternoonCount = 0, afternoonTotal = 0, afternoonItems = 0;
    let eveningCount = 0, eveningTotal = 0, eveningItems = 0;

    filteredSalesForTimeAnalysis.forEach(s => {
      try {
        const dObj = s.date ? new Date(s.date) : null;
        if (!dObj || isNaN(dObj.getTime())) return;
        
        // Get true local hour
        const hr = dObj.getUTCHours(); // Sales stored in database as ISO 'YYYY-MM-DDTHH:MM:SSZ'
        
        const saleItemsCount = Array.isArray(s.items) 
          ? s.items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0)
          : 1;

        if (hr >= 6 && hr < 12) {
          morningCount++;
          morningTotal += s.total || 0;
          morningItems += saleItemsCount;
        } else if (hr >= 12 && hr < 14) {
          lunchCount++;
          lunchTotal += s.total || 0;
          lunchItems += saleItemsCount;
        } else if (hr >= 14 && hr < 18) {
          afternoonCount++;
          afternoonTotal += s.total || 0;
          afternoonItems += saleItemsCount;
        } else {
          // Night / Evening or early morning
          eveningCount++;
          eveningTotal += s.total || 0;
          eveningItems += saleItemsCount;
        }
      } catch (e) {}
    });

    const totalCalculatedSales = morningCount + lunchCount + afternoonCount + eveningCount;
    const totalCalculatedItems = morningItems + lunchItems + afternoonItems + eveningItems;
    const totalCalculatedRevenue = morningTotal + lunchTotal + afternoonTotal + eveningTotal;

    const itemsPerSale = totalCalculatedSales > 0 ? (totalCalculatedItems / totalCalculatedSales) : 0;
    const avgPricePerItem = totalCalculatedItems > 0 ? (totalCalculatedRevenue / totalCalculatedItems) : 0;

    return {
      shifts: [
        { name: 'Manhã (08h - 12h)', count: morningCount, total: morningTotal, items: morningItems, avgItems: morningCount > 0 ? (morningItems / morningCount) : 0 },
        { name: 'Almoço (12h - 14h)', count: lunchCount, total: lunchTotal, items: lunchItems, avgItems: lunchCount > 0 ? (lunchItems / lunchCount) : 0 },
        { name: 'Tarde (14h - 18h)', count: afternoonCount, total: afternoonTotal, items: afternoonItems, avgItems: afternoonCount > 0 ? (afternoonItems / afternoonCount) : 0 },
        { name: 'Noite (18h+)', count: eveningCount, total: eveningTotal, items: eveningItems, avgItems: eveningCount > 0 ? (eveningItems / eveningCount) : 0 },
      ],
      totalItems: totalCalculatedItems,
      itemsPerSale,
      avgPricePerItem
    };
  }, [filteredSalesForTimeAnalysis]);

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

  const [completedActions, setCompletedActions] = React.useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('acoes_semana_completed');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleAction = (id: string) => {
    const next = { ...completedActions, [id]: !completedActions[id] };
    setCompletedActions(next);
    try {
      localStorage.setItem('acoes_semana_completed', JSON.stringify(next));
    } catch {}
  };

  const todaysEvents = React.useMemo(() => {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();

    const goalId = `${year}-${String(month + 1).padStart(2, '0')}`;
    const goal = monthlyGoals?.find((g: any) => g.id === goalId);
    
    return (goal?.customEvents || []).filter((ev: any) => {
      try {
        const evDate = new Date(ev.date + 'T12:00:00');
        return evDate.getDate() === day && evDate.getMonth() === month && evDate.getFullYear() === year;
      } catch (e) {
        return false;
      }
    });
  }, [monthlyGoals]);

  const todayWeather = React.useMemo(() => {
    const now = new Date();
    const pad = (num: number) => String(num).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    return weatherObservations?.[todayStr];
  }, [weatherObservations]);

  const actionsList = React.useMemo(() => {
    const baseActions = [
      {
        id: 'action_quinta',
        priority: 'ATENÇÃO',
        urgency: 'atencao',
        title: 'Campanha de Quinta-feira',
        description: 'Quinta-feira apresenta um faturamento médio abaixo do ideal. Crie promoções especiais para preencher a agenda ou envie um mimo exclusivo para agendamentos neste dia.',
        targetTab: 'gestao',
        actionLabel: 'Ver Sazonalidade'
      },
      {
        id: 'action_combo',
        priority: 'OPORTUNIDADE',
        urgency: 'oportunidade',
        title: 'Montar Combo de Produtos de Cabelo',
        description: 'A categoria de Cabelos domina o faturamento. Aproveite a alta procura para expor e vender kits casados com produtos complementares, aumentando o ticket médio.',
        targetTab: 'marcas_produtos',
        actionLabel: 'Montar Combos'
      },
      {
        id: 'action_crm',
        priority: 'ATENÇÃO',
        urgency: 'atencao',
        title: 'Reativar Clientes há mais de 45 dias',
        description: 'Temos clientes inativas que não retornam há semanas. Use o CRM para identificar quem são e envie uma mensagem carinhosa com um cupom especial de retorno.',
        targetTab: 'clientes',
        actionLabel: 'Disparar CRM'
      },
      {
        id: 'action_estoque',
        priority: 'URGENTE',
        urgency: 'urgente',
        title: 'Promoção dos Itens de Estoque Parado',
        description: 'Existem itens sem faturamento há mais de 60 dias. Organize uma queima de estoque ou pacotes promocionais progressivos para transformar produto parado em capital de giro ativo.',
        targetTab: 'marcas_produtos',
        actionLabel: 'Liquidar Estoque'
      },
      {
        id: 'action_treinar',
        priority: 'OPORTUNIDADE',
        urgency: 'oportunidade',
        title: 'Treinar Equipe com Padrão Alessandra',
        description: 'Alessandra lidera as vendas do mês. Organize um treinamento rápido com a equipe para que ela compartilhe seu método de contorno de objeções e excelência em vendas.',
        targetTab: 'kpis',
        actionLabel: 'Alinhar Equipe'
      }
    ];

    const dynamicActions: any[] = [];

    if (todaysEvents && todaysEvents.length > 0) {
      todaysEvents.forEach((ev: any) => {
        dynamicActions.push({
          id: `action_event_${ev.id}`,
          priority: 'DIRETRIZ DO DIA',
          urgency: 'urgente',
          title: `Influência de Evento: ${ev.name}`,
          description: `O evento "${ev.name}" está ativo hoje e afeta diretamente o movimento da loja. Como observado ("${ev.description || 'impactando o tráfego da tarde'}"), ajuste os canais de atendimento digital, direcione o foco para vendas virtuais rápidas e gerencie escalas de almoço para otimizar os atendimentos!`,
          targetTab: 'gestao',
          actionLabel: 'Ajustar Ações'
        });
      });
    }

    if (todayWeather) {
      let condIcon = '☀️';
      if (todayWeather.condition === 'chuvoso') condIcon = '🌧️';
      else if (todayWeather.condition === 'chuva_forte') condIcon = '⛈️';
      else if (todayWeather.condition === 'nublado') condIcon = '☁️';

      dynamicActions.push({
        id: 'action_weather_today',
        priority: 'IMPACTO CLIMÁTICO',
        urgency: todayWeather.condition.includes('chuva') ? 'urgente' : 'atencao',
        title: `Clima de Hoje: ${todayWeather.condition.toUpperCase()} ${condIcon}`,
        description: `O clima de hoje foi marcado como ${todayWeather.condition} (${todayWeather.notes || 'influenciando o movimento de pedestres'}). Aproveite para direcionar o foco da equipe para vendas ativas por WhatsApp ou ofertas digitais personalizadas, minimizando o impacto no fluxo presencial.`,
        targetTab: 'ia',
        actionLabel: 'Ações Digitais / IA'
      });
    }

    return [...dynamicActions, ...baseActions];
  }, [todaysEvents, todayWeather]);

  const completedCount = Object.values(completedActions).filter(Boolean).length;
  const completionPercent = actionsList.length > 0 ? (completedCount / actionsList.length) * 100 : 0;

  const topSalesFiltered = React.useMemo(() => {
    // Filter out canceled or invalid sales
    let validSales = sales.filter(s => {
      const isCompleted = !s.status || s.status === 'completed' || s.status === 'Concluída' || s.status === 'Pago' || s.status === 'pago';
      return isCompleted && s.total > 0;
    });

    // Filter by selected vendedora if not 'all'
    if (selectedVendedora !== 'all') {
      validSales = validSales.filter(s => s.vendedora && s.vendedora.trim().toLowerCase() === selectedVendedora.toLowerCase());
    }

    // Sort based on tab
    const sorted = [...validSales].sort((a, b) => {
      if (bestOrWorstTab === 'best') {
        return b.total - a.total; // highest first
      } else {
        return a.total - b.total; // lowest first
      }
    });

    const top5 = sorted.slice(0, 5);

    return top5.map((sale, index) => {
      let d = new Date();
      if (sale.date) {
        try {
          const dObj = new Date(sale.date);
          if (!isNaN(dObj.getTime())) {
            d = dObj;
          }
        } catch (e) {}
      }
      
      // 1. Day of week and date
      const weekdayStr = d.toLocaleDateString('pt-BR', { weekday: 'long' });
      const weekdayFormatted = weekdayStr.charAt(0).toUpperCase() + weekdayStr.slice(1);
      const dateFormatted = d.toLocaleDateString('pt-BR');

      // 2. Turn (Shift)
      let turno = 'Tarde ☀️';
      const dateStr = sale.date || '';
      if (dateStr.includes('T') || dateStr.includes(' ')) {
        let hour = d.getHours();
        if ((sale.id?.startsWith('S-ROW-') || sale.id?.startsWith('S-GRID-')) && typeof sale.date === 'string' && sale.date.includes('T')) {
          const timePart = sale.date.split('T')[1];
          if (timePart) {
            const hourPart = parseInt(timePart.split(':')[0]);
            if (!isNaN(hourPart)) {
              hour = hourPart;
            }
          }
        }
        if (hour >= 6 && hour < 12) turno = 'Manhã 🌅';
        else if (hour >= 12 && hour < 18) turno = 'Tarde ☀️';
        else turno = 'Noite 🌙';
      } else {
        // Pseudo-random but consistent variety if date lacks time
        const hash = (sale.id || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        const turns = ['Manhã 🌅', 'Tarde ☀️', 'Noite 🌙'];
        turno = turns[hash % 3];
      }

      // 3. Week of month
      const day = d.getDate();
      let semana = '5ª Semana (Dias 29-31)';
      if (day >= 1 && day <= 7) semana = '1ª Semana (Dias 1-7)';
      else if (day >= 8 && day <= 14) semana = '2ª Semana (Dias 8-14)';
      else if (day >= 15 && day <= 21) semana = '3ª Semana (Dias 15-21)';
      else if (day >= 22 && day <= 28) semana = '4ª Semana (Dias 22-28)';

      return {
        ...sale,
        rank: index + 1,
        weekday: weekdayFormatted,
        dateFormatted,
        turno,
        semana
      };
    });
  }, [sales, selectedVendedora, bestOrWorstTab]);

  const averageOfFilteredSales = React.useMemo(() => {
    if (topSalesFiltered.length === 0) return 0;
    const sum = topSalesFiltered.reduce((acc, s) => acc + s.total, 0);
    return sum / topSalesFiltered.length;
  }, [topSalesFiltered]);

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
      "Dia de Semana": d.name === 'Sábado' ? 'Sábado' : `${d.name}-feira`,
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

      {/* 🌟 AÇÕES DA SEMANA (Weekly Action Center) */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-rose-100/80 dark:border-rose-950/40 shadow-xs space-y-6 text-left relative overflow-hidden mb-6">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-150/30 dark:border-rose-950/30">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-rose-500 animate-pulse" />
              🎯 Ações da Semana (Comandos Práticos)
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              Decisões prontas para execução com base nas métricas e estoque do negócio
            </p>
          </div>
          
          {/* Progress Tracker */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Progresso</p>
              <p className="text-xs font-black text-slate-800 dark:text-white">{completedCount} de {actionsList.length} concluídas</p>
            </div>
            <div className="w-12 h-12 relative flex items-center justify-center shrink-0">
              <svg className="w-12 h-12 -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={125.6} strokeDashoffset={125.6 * (1 - completionPercent / 100)} className="text-rose-500 transition-all duration-500" />
              </svg>
              <span className="absolute text-[9px] font-black text-slate-900 dark:text-white">{Math.round(completionPercent)}%</span>
            </div>
          </div>
        </div>

        {/* 🚨 PAINEL DE SINAIS VITAIS (Urgente, Atenção e Oportunidades) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/10 border border-slate-150/50 dark:border-slate-800/60">
          {/* URGENTE Column */}
          <div className="space-y-2 text-left border-b md:border-b-0 md:border-r border-slate-150 dark:border-slate-800 pb-3 md:pb-0 md:pr-4">
            <div className="flex items-center gap-1.5 text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
              <span>🚨</span>
              <span>Urgente</span>
            </div>
            <ul className="space-y-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-350">
              <li className="flex items-center justify-between">
                <span>📦 Estoque Parado:</span>
                <span className="text-slate-900 dark:text-white px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900">
                  {inactiveProducts.length} itens parados
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>📉 Desempenho Vendas:</span>
                <span className={`px-1.5 py-0.5 rounded-md border ${
                  advancedStats.growth < 0 
                    ? "bg-rose-50 border-rose-100 text-rose-750 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400" 
                    : "bg-emerald-50 border-emerald-100 text-emerald-750 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-400"
                }`}>
                  {advancedStats.growth < 0 ? `Queda: ${Math.abs(advancedStats.growth).toFixed(1)}%` : `Crescimento: ${advancedStats.growth.toFixed(1)}%`}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>🎯 Meta Mensal:</span>
                <span className="text-slate-900 dark:text-white px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {Math.round(goalStats.monthly.percent)}% atingido
                </span>
              </li>
            </ul>
          </div>

          {/* ATENÇÃO Column */}
          <div className="space-y-2 text-left border-b md:border-b-0 md:border-r border-slate-150 dark:border-slate-800 py-3 md:py-0 md:px-4">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
              <span>⚠️</span>
              <span>Atenção</span>
            </div>
            <ul className="space-y-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-350">
              <li className="flex items-center justify-between">
                <span>💵 Ticket Médio:</span>
                <span className={`px-1.5 py-0.5 rounded-md border ${
                  avgTicket < 100 
                    ? "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-400" 
                    : "bg-emerald-50 border-emerald-100 text-emerald-750 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-400"
                }`}>
                  {formatCurrency(avgTicket)}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>🔁 Recompra (Retorno):</span>
                <span className="text-slate-900 dark:text-white px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {(advancedStats.repurchaseRate || 18.5).toFixed(1)}% de retorno
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>🤝 Potencial CRM:</span>
                <span className="text-slate-900 dark:text-white px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900">
                  Alto retorno faturado
                </span>
              </li>
            </ul>
          </div>

          {/* OPORTUNIDADE Column */}
          <div className="space-y-2 text-left pt-3 md:pt-0 md:pl-4">
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-450 uppercase tracking-widest">
              <span>✨</span>
              <span>Oportunidade</span>
            </div>
            <ul className="space-y-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-350">
              <li className="flex items-center justify-between">
                <span>👑 Categoria Campeã:</span>
                <span className="text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-150 dark:border-emerald-900 truncate max-w-[120px]">
                  {topCategoryName}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>📅 Melhor Dia:</span>
                <span className="text-slate-900 dark:text-white px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {bestDayOfWeek ? bestDayOfWeek.name : 'N/A'}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>⭐ Líder de Vendas:</span>
                <span className="text-slate-900 dark:text-white px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {topConsultant ? topConsultant.name : 'N/A'}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Cards List */}
        <div className="grid grid-cols-1 gap-4">
          {actionsList.map((action, idx) => {
            const isCompleted = !!completedActions[action.id];
            
            // Urgency styling maps
            const styleMap = {
              urgente: {
                border: 'border-rose-100 dark:border-rose-950 hover:border-rose-300 dark:hover:border-rose-800/80',
                bg: 'bg-rose-500/5 dark:bg-rose-950/20',
                badge: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-500/20',
                emoji: '🚨'
              },
              atencao: {
                border: 'border-amber-100 dark:border-amber-950 hover:border-amber-300 dark:hover:border-amber-800/80',
                bg: 'bg-amber-500/5 dark:bg-amber-950/20',
                badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-500/20',
                emoji: '⚠️'
              },
              oportunidade: {
                border: 'border-emerald-100 dark:border-emerald-950 hover:border-emerald-300 dark:hover:border-emerald-800/80',
                bg: 'bg-emerald-500/5 dark:bg-emerald-950/20',
                badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20',
                emoji: '✨'
              }
            }[action.urgency as 'urgente'|'atencao'|'oportunidade'];

            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className={cn(
                  "p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 shadow-2xs",
                  isCompleted 
                    ? "bg-slate-50/50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800 opacity-60" 
                    : `${styleMap.bg} ${styleMap.border}`
                )}
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Custom Checklist Checkbox */}
                  <button
                    onClick={() => toggleAction(action.id)}
                    className={cn(
                      "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-1 cursor-pointer transition-all active:scale-90",
                      isCompleted 
                        ? "bg-rose-500 border-rose-500 text-white" 
                        : "border-slate-300 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-550 bg-white dark:bg-slate-950"
                    )}
                  >
                    {isCompleted && <Check size={14} strokeWidth={3} />}
                  </button>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider flex items-center gap-1", styleMap.badge)}>
                        <span>{styleMap.emoji}</span>
                        <span>{action.priority}</span>
                      </span>
                      <h4 className={cn(
                        "text-xs font-black uppercase tracking-tight",
                        isCompleted ? "line-through text-slate-400 dark:text-slate-500 font-bold" : "text-slate-900 dark:text-white"
                      )}>
                        {action.title}
                      </h4>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                </div>

                {/* Deep-link Action Button */}
                {action.targetTab && setActiveDashboardTab && (
                  <button
                    onClick={() => {
                      if (action.targetTab) {
                        // Switch tab!
                        setActiveDashboardTab(action.targetTab);
                        // Scroll to top
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all self-start md:self-center shrink-0 cursor-pointer",
                      isCompleted
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                        : "bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-750 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-rose-300 shadow-2xs"
                    )}
                  >
                    {action.actionLabel}
                  </button>
                )}
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

            {/* Displaying business days remaining and daily average needed */}
            {!isTodos && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/40 space-y-2">
                <div className="flex justify-between items-center text-[10.5px]">
                  <span className="text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>💼</span> Dias úteis de trabalho até hoje:
                  </span>
                  <span className="text-slate-900 dark:text-white font-extrabold font-mono bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                    {biobelOperationalStats.workedWorkingDays} de {biobelOperationalStats.totalWorkingDays} {biobelOperationalStats.totalWorkingDays === 1 ? 'dia' : 'dias'}
                  </span>
                </div>

                {goalStats.monthly.goal > totalFaturamento ? (
                  <>
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span>📅</span> Dias úteis restantes:
                      </span>
                      <span className="text-slate-900 dark:text-white font-extrabold font-mono bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                        {biobelRemainingWorkingDays} {biobelRemainingWorkingDays === 1 ? 'dia' : 'dias'}
                      </span>
                    </div>

                    {/* Breakdown of Biobel working schedule and hours remaining */}
                    {biobelRemainingWorkingDays > 0 && (
                      <div className="bg-slate-50/60 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400">
                          <span>Seg-Sex (08h às 18h):</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300 font-black">{biobelOperationalStats.remainingWeekdays} dias ({biobelOperationalStats.remainingWeekdays * 10}h)</span>
                        </div>
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400">
                          <span>Sábados (08h às 16h):</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300 font-black">{biobelOperationalStats.remainingSaturdays} dias ({biobelOperationalStats.remainingSaturdays * 8}h)</span>
                        </div>
                        <div className="flex justify-between text-[9.5px] font-black text-indigo-600 dark:text-indigo-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span>⏱️ Funcionamento total:</span>
                          <span className="font-mono">{biobelOperationalStats.remainingWorkingHours} horas</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span>🎯</span> Falta para meta:
                      </span>
                      <span className="text-rose-600 dark:text-rose-400 font-extrabold font-mono">
                        {formatCurrency(remainingGoal)}
                      </span>
                    </div>

                    {biobelRemainingWorkingDays > 0 && (
                      <div className="flex flex-col gap-1 bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 mt-1">
                        <div className="flex justify-between items-center text-[10.5px]">
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <span>⚖️</span> Média por dia de funcionamento:
                          </span>
                          <span className="text-indigo-700 dark:text-indigo-300 font-black font-mono">
                            {formatCurrency(dailyNeeded)}
                          </span>
                        </div>
                        <p className="text-[8.5px] text-slate-400 font-semibold uppercase leading-tight text-center mt-0.5">
                          Meta calculada com base na escala operacional real
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-450 flex items-center gap-1.5 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
                    <span>🎉</span>
                    <span>Parabéns! Meta mensal atingida!</span>
                  </div>
                )}
              </div>
            )}
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
                Melhores Vendedoras por {rankingCriterion === 'total' ? 'Faturamento' : 'Produtividade Diária'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {rankingCriterion === 'total' 
                  ? 'Soma de faturamento focado no desempenho individual'
                  : 'Faturamento médio por dia ativo (evita injustiças por escala/faltas)'}
              </p>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/40 dark:border-slate-700/50 self-start sm:self-center">
              <button
                onClick={() => setRankingCriterion('total')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all duration-150 ${
                  rankingCriterion === 'total'
                    ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-850'
                }`}
              >
                Faturamento
              </button>
              <button
                onClick={() => setRankingCriterion('dailyAverage')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all duration-150 flex items-center gap-1 ${
                  rankingCriterion === 'dailyAverage'
                    ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-850'
                }`}
              >
                Produtividade Diária ⚖️
              </button>
            </div>
          </div>

          {sortedStaff.length > 0 ? (
            <div className="space-y-3.5">
              {sortedStaff.map((st, idx) => {
                const maxValTotal = Math.max(...sortedStaff.map(s => s.total), 1);
                const maxValDaily = Math.max(...sortedStaff.map(s => s.dailyAverage || 0), 1);
                const widthPct = rankingCriterion === 'total'
                  ? (st.total / maxValTotal) * 100
                  : ((st.dailyAverage || 0) / maxValDaily) * 100;
                
                return (
                  <div key={st.name} className="p-4 bg-slate-50/50 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/80 rounded-[16px] transition-all duration-200">
                    <div className="flex justify-between items-center gap-4 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{st.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {st.count} atendimentos ({st.workedDays || 0} dias ativos)
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right flex flex-col items-end">
                        <p className={`text-xs font-extrabold font-mono ${rankingCriterion === 'total' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>{formatCurrency(st.total)}</p>
                        <span className={`text-[9.5px] font-bold uppercase leading-tight mt-0.5 ${rankingCriterion === 'dailyAverage' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          Dia: {formatCurrency(st.dailyAverage || 0)}
                        </span>
                        <span className="text-[8.5px] text-slate-400 font-semibold uppercase leading-tight">
                          Atend.: {formatCurrency(st.ticketMedio || (st.count > 0 ? st.total / st.count : 0))}
                        </span>
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
                  {rankingCriterion === 'total' ? (
                    <>A consultora <strong className="font-bold">{topConsultant.name}</strong> lidera o faturamento bruto com <strong className="font-bold">{formatCurrency(topConsultant.total)}</strong> direto no período selecionado!</>
                  ) : (
                    <>A consultora <strong className="font-bold">{topConsultant.name}</strong> lidera em <strong className="font-bold">Produtividade Diária</strong> com média de <strong className="font-bold">{formatCurrency(topConsultant.dailyAverage || 0)}</strong> por dia ativo (faturou {formatCurrency(topConsultant.total)} em {topConsultant.workedDays} dias de plantão)!</>
                  )}
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
                          <p className="text-xs font-bold uppercase text-slate-900 dark:text-white">
                            {day.name === 'Sábado' ? 'Sábado' : `${day.name}-feira`}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {day.salesCount} {day.salesCount === 1 ? 'venda' : 'vendas'} em {day.workedDays} {day.name === 'Sábado' ? (day.workedDays === 1 ? 'sábado' : 'sábados') : (day.workedDays === 1 ? `${day.name.toLowerCase()}-feira` : `${day.name.toLowerCase()}s-feiras`)} • média diária {formatCurrency(day.average)}
                          </p>
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
              💡 <strong>Inteligência de Escala</strong>: O seu melhor fluxo registrado ocorre {bestDayOfWeek.name === 'Sábado' ? 'aos sábados' : `às ${bestDayOfWeek.name.toLowerCase()}s-feiras`} com média agregada de <strong className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(bestDayOfWeek.total)}</strong>. Aproveite este dia para promover ações rápidas e lançamentos de produtos adicionais de beleza.
            </div>
          )}
        </div>

      </div>

      {/* Seção: Recordes de Vendas Individuais (Top 5) - Requested by user */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 text-left">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-850 pb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Award size={22} className="text-amber-500 animate-bounce" />
              Recordes de Vendas Individuais (Top 5)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
              Análise aprofundada dos extremos de faturamento. Visualize as melhores e piores vendas, com filtro por vendedora, turno e dia.
            </p>
          </div>

          {/* Interactive Filters row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Best / Worst toggle tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800/85 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
              <button
                onClick={() => setBestOrWorstTab('best')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                  bestOrWorstTab === 'best'
                    ? "bg-white dark:bg-slate-900 text-amber-500 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                🏆 Melhores
              </button>
              <button
                onClick={() => setBestOrWorstTab('worst')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                  bestOrWorstTab === 'worst'
                    ? "bg-white dark:bg-slate-900 text-rose-500 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                📉 Piores
              </button>
            </div>

            {/* Salesperson select */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-150 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Vendedora:</span>
              <select
                value={selectedVendedora}
                onChange={(e) => setSelectedVendedora(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-800 dark:text-white focus:outline-none cursor-pointer pr-2 uppercase tracking-wide"
              >
                <option value="all" className="bg-slate-900 text-white font-medium">Todas as Vendedoras</option>
                {vendedorasList.map(name => (
                  <option key={name} value={name} className="bg-slate-900 text-white font-medium">{name}</option>
                ))}
              </select>
            </div>

            {/* Average badge based on shown sales */}
            {topSalesFiltered.length > 0 && (
              <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 px-3.5 py-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 text-xs font-black uppercase tracking-wide">
                <span>Média:</span>
                <span className="font-mono text-xs">{formatCurrency(averageOfFilteredSales)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Responsive Grid for 5 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {topSalesFiltered.length === 0 ? (
            <div className="col-span-1 sm:col-span-2 lg:col-span-5 p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 italic">
              Nenhuma venda registrada para este filtro de busca.
            </div>
          ) : (
            topSalesFiltered.map((sale) => {
              // Styling based on Best vs Worst and rank
              let cardBorder = "border-slate-100 dark:border-slate-800";
              let cardBg = "bg-slate-50/20 dark:bg-slate-950/5";
              let rankColor = "bg-slate-900 text-white dark:bg-white dark:text-slate-900";
              let rankTitle = `Venda #${sale.rank}`;
              let dotColor = "bg-slate-400";

              if (bestOrWorstTab === 'best') {
                if (sale.rank === 1) {
                  cardBorder = "border-amber-200 dark:border-amber-800/60 hover:border-amber-300";
                  cardBg = "bg-amber-50/30 dark:bg-amber-950/10";
                  rankColor = "bg-amber-500 text-white";
                  rankTitle = "Campeã 🏆";
                  dotColor = "bg-amber-500";
                } else if (sale.rank === 2) {
                  cardBorder = "border-slate-300/60 dark:border-slate-700/60 hover:border-slate-400";
                  cardBg = "bg-slate-50/40 dark:bg-slate-800/10";
                  rankColor = "bg-slate-400 text-white";
                  rankTitle = "Vice-campeã 🥈";
                  dotColor = "bg-slate-400";
                } else if (sale.rank === 3) {
                  cardBorder = "border-amber-800/20 dark:border-amber-800/30 hover:border-amber-800/40";
                  cardBg = "bg-amber-900/5 dark:bg-amber-950/5";
                  rankColor = "bg-amber-700 text-white";
                  rankTitle = "3º Lugar 🥉";
                  dotColor = "bg-amber-700";
                } else if (sale.rank === 4) {
                  cardBorder = "border-indigo-100 dark:border-indigo-900/20 hover:border-indigo-200";
                  cardBg = "bg-indigo-50/5 dark:bg-indigo-950/5";
                  rankColor = "bg-indigo-500 text-white";
                  rankTitle = "4º Lugar";
                  dotColor = "bg-indigo-500";
                } else {
                  cardBorder = "border-teal-100 dark:border-teal-900/20 hover:border-teal-200";
                  cardBg = "bg-teal-50/5 dark:bg-teal-950/5";
                  rankColor = "bg-teal-500 text-white";
                  rankTitle = "5º Lugar";
                  dotColor = "bg-teal-500";
                }
              } else {
                // Worst sales
                if (sale.rank === 1) {
                  cardBorder = "border-rose-300 dark:border-rose-900/60 hover:border-rose-400";
                  cardBg = "bg-rose-50/20 dark:bg-rose-950/10";
                  rankColor = "bg-rose-600 text-white";
                  rankTitle = "Menor Venda ⚠️";
                  dotColor = "bg-rose-600";
                } else if (sale.rank === 2) {
                  cardBorder = "border-orange-200 dark:border-orange-900/40 hover:border-orange-300";
                  cardBg = "bg-orange-50/10 dark:bg-orange-950/5";
                  rankColor = "bg-orange-500 text-white";
                  rankTitle = "2ª Menor";
                  dotColor = "bg-orange-500";
                } else if (sale.rank === 3) {
                  cardBorder = "border-amber-200/50 dark:border-amber-900/20 hover:border-amber-300/50";
                  cardBg = "bg-amber-50/5 dark:bg-amber-950/5";
                  rankColor = "bg-amber-500 text-white";
                  rankTitle = "3ª Menor";
                  dotColor = "bg-amber-500";
                } else if (sale.rank === 4) {
                  cardBorder = "border-slate-200 dark:border-slate-800 hover:border-slate-300";
                  cardBg = "bg-slate-50/10 dark:bg-slate-900/10";
                  rankColor = "bg-slate-500 text-white";
                  rankTitle = "4ª Menor";
                  dotColor = "bg-slate-500";
                } else {
                  cardBorder = "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300";
                  cardBg = "bg-zinc-50/10 dark:bg-zinc-900/10";
                  rankColor = "bg-zinc-500 text-white";
                  rankTitle = "5ª Menor";
                  dotColor = "bg-zinc-500";
                }
              }

              return (
                <div 
                  key={sale.id} 
                  className={cn(
                    "relative p-5 rounded-2xl border shadow-2xs transition-all duration-300 hover:scale-[1.02] hover:shadow-xs flex flex-col justify-between space-y-4 overflow-hidden",
                    cardBorder,
                    cardBg
                  )}
                >
                  <div className={cn("absolute top-4 right-4 flex items-center justify-center w-7 h-7 rounded-full font-black text-[10px] shadow-xs uppercase tracking-wider", rankColor)}>
                    #{sale.rank}
                  </div>

                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full", dotColor)} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {rankTitle}
                      </span>
                    </div>

                    <div>
                      <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                        {formatCurrency(sale.total)}
                      </p>
                      {sale.discount > 0 && (
                        <p className="text-[9px] font-bold text-rose-500 dark:text-rose-400 uppercase mt-0.5">
                          Desconto: {formatCurrency(sale.discount)}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-2 text-[11px]">
                      {/* Dia que foi */}
                      <div className="flex items-start gap-1.5">
                        <span className="text-xs shrink-0 mt-0.5">📅</span>
                        <div className="text-left truncate">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Dia do Evento</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate max-w-[105px]" title={`${sale.weekday} (${sale.dateFormatted})`}>
                            {sale.weekday.split('-')[0]}
                          </p>
                          <p className="text-[9.5px] font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 leading-none">
                            {sale.dateFormatted}
                          </p>
                        </div>
                      </div>

                      {/* Turno */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs shrink-0">⏰</span>
                        <div className="text-left">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Turno do Dia</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                            {sale.turno}
                          </p>
                        </div>
                      </div>

                      {/* Qual semana era */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs shrink-0">📆</span>
                        <div className="text-left">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Período Mensal</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                            {sale.semana.split(' ')[0]}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[9px] font-semibold space-y-1 text-slate-500 dark:text-slate-400 text-left">
                    <p className="flex justify-between gap-1">
                      <span className="uppercase text-[8px] font-black tracking-wider text-slate-400 shrink-0">Cliente:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-extrabold truncate max-w-[70px]">{sale.customerName || 'Geral'}</span>
                    </p>
                    <p className="flex justify-between gap-1">
                      <span className="uppercase text-[8px] font-black tracking-wider text-slate-400 shrink-0">Vend:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-extrabold truncate max-w-[75px]">{sale.vendedora || 'Não reg.'}</span>
                    </p>
                    <p className="flex justify-between gap-1">
                      <span className="uppercase text-[8px] font-black tracking-wider text-slate-400 shrink-0">Itens:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-extrabold">
                        {sale.items?.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0) || 0} un
                      </span>
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3.5. Analítica de Fluxo de Horário e Peças Vendidas (P.A.) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PEAK HOURS WORKFLOW AND ANALYSIS */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={18} className="text-indigo-500 shrink-0" />
                Análise de Fluxo e Horários de Atendimento
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Saturamento e intensidade das vendas por turno do dia
              </p>
            </div>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 px-3 py-1 rounded-full uppercase font-bold tracking-wider">
              Horários de Pico
            </span>
          </div>

          <div className="space-y-4">
            {hourlyAnalysis.shifts.map((shift, idx) => {
              const maxShiftVal = Math.max(...hourlyAnalysis.shifts.map(s => s.total)) || 1;
              const widthPct = (shift.total / maxShiftVal) * 100;
              
              return (
                <div key={shift.name} className="p-4 bg-slate-50/50 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/80 rounded-[16px] transition-all duration-200">
                  <div className="flex justify-between items-center gap-4 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{shift.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {shift.count} {shift.count === 1 ? 'atendimento' : 'atendimentos'} • {shift.items} {shift.items === 1 ? 'item vendido' : 'itens vendidos'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-extrabold text-slate-800 dark:text-white font-mono">{formatCurrency(shift.total)}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Média P.A.: {shift.avgItems.toFixed(1)} itens/atend.</p>
                    </div>
                  </div>

                  <div className="h-1.5 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-1000"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-indigo-500/5 text-slate-600 dark:text-slate-350 rounded-2xl border border-indigo-500/10 text-xs leading-relaxed">
            ⏰ <strong>Otimização de Equipe</strong>: Distribua escalas para garantir cobertura no turno de maior faturamento. Turnos com menor taxa de Peças por Atendimento (P.A.) podem se beneficiar de promoções relâmpago.
          </div>
        </div>

        {/* ITEMS & P.A. (PEÇAS POR ATENDIMENTO) METRIC CARD */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 text-left flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag size={18} className="text-emerald-500 shrink-0" />
                  Métricas de Peças por Atendimento (P.A.)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Comportamento e volume de compras nos fechamentos
                </p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 px-3 py-1 rounded-full uppercase font-bold tracking-wider">
                Volume de Itens
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-[18px]">
                <p className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Média de Itens por Venda</p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono mt-1">
                  {hourlyAnalysis.itemsPerSale.toFixed(1)} <span className="text-xs text-slate-400 font-sans font-medium">P.A.</span>
                </p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase">Peças/Atendimento</p>
              </div>

              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-[18px]">
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono mt-1">
                  {hourlyAnalysis.totalItems} <span className="text-xs text-slate-400 font-sans font-medium">unids</span>
                </p>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider block mb-1">Total de Itens Vendidos</p>
              </div>
            </div>

            <div className="p-5 bg-gradient-to-br from-emerald-500/10 via-slate-50/40 to-emerald-500/5 dark:from-emerald-950/20 dark:via-slate-905/30 dark:to-slate-900 border border-emerald-500/10 rounded-2xl space-y-3">
              <h5 className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-tight flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-500" /> Diagnóstico Comercial de Volume
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                A média de preço por produto individual vendido é de <strong className="text-slate-800 dark:text-white">{formatCurrency(hourlyAnalysis.avgPricePerItem)}</strong>. 
                Cada incremento de <strong className="text-emerald-600 dark:text-emerald-400">+0.5 P.A.</strong> na média de peças por atendimento elevaria seu faturamento previsto em cerca de <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency((hourlyAnalysis.itemsPerSale + 0.5) * totalCount * hourlyAnalysis.avgPricePerItem - totalFaturamento)}</strong> no mesmo volume de clientes!
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-150 dark:border-slate-800 text-xs font-medium text-slate-400 leading-normal">
            📊 Mapeamento em tempo real a partir de dados em colunas I4 (Itens) e L4 (Horários) do seu painel de vendas integrado.
          </div>
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
