import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  TrendingDown, 
  Clock, 
  Users, 
  ShoppingBag, 
  Calendar, 
  TrendingUp, 
  Sparkles,
  ChevronRight,
  Info,
  DollarSign,
  CloudRain,
  HelpCircle,
  FolderMinus,
  MessageSquare,
  ArrowRight,
  UserX,
  Store,
  ChevronDown,
  MessageCircle,
  Send,
  Percent,
  ShieldCheck,
  Target,
  Activity,
  Shuffle
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
}

interface Sale {
  id: string;
  date: string;
  customerId?: string;
  customerName?: string;
  vendedora?: string;
  total: number;
  discount: number;
  status: string;
  items: SaleItem[];
  type?: 'Presencial' | 'Digital';
}

interface StaffMember {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: string;
}

interface CustomEvent {
  id: string;
  date: string;
  name: string;
  description?: string;
}

interface MonthlyGoal {
  month: string;
  storeGoal: number;
  customEvents?: CustomEvent[];
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  gender?: string;
  city?: string;
  address?: string;
  birthDate?: string;
  email?: string;
  notes?: string;
  points?: number;
  debt?: number;
  tier?: string;
  createdAt?: string;
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

interface ImprovementViewProps {
  sales: Sale[];
  products: Product[];
  staff: StaffMember[];
  weatherObservations: {[dateStr: string]: { condition: string; notes: string }};
  formatCurrency: (value: number) => string;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  monthlyGoals?: MonthlyGoal[];
  customers?: Customer[];
}

export const ImprovementView: React.FC<ImprovementViewProps> = ({
  sales,
  products,
  staff,
  weatherObservations,
  formatCurrency,
  selectedMonth,
  setSelectedMonth,
  monthlyGoals = [],
  customers = [],
}) => {
  // Use a centralized state for timeframe selection. Let it default to 'todos' as requested
  // ("tem que ter um campo que tenha todos, exemplo todos pega maio e junho, e posso ver as estatistica so de maio tambem")
  const [selectedPeriod, setSelectedPeriod] = useState<string>('todos');

  // ==================== NEW CRM CAMPAIGN STATES ====================
  const [activeCampaignType, setActiveCampaignType] = useState<'birthdays' | 'inactive' | 'pending' | 'vips' | 'followup'>('birthdays');
  const [crmSearchQuery, setCrmSearchQuery] = useState('');
  
  // Custom templates mapped for each type
  const [campaignTemplates, setCampaignTemplates] = useState<{ [key: string]: string }>({
    birthdays: "Olá [nome]! 🎉 Desejamos um aniversário espetacular e cheio de paz! Como forma de comemorar seu dia especial, temos um presente exclusivo para você na Biobel: R$ 20,00 de desconto adicional em qualquer serviço ou compra de cosméticos esta semana! Vamos agendar sua visita? ❤️",
    inactive: "Oi [nome], tudo bem? Estamos morrendo de saudade de você aqui na Biobel! Faz algum tempo que você não nos visita para renovar seus autocuidados. Para te receber de volta, que tal ganhar uma aplicação de máscara de tratamento facial de cortesia na sua próxima hidratação? Vamos marcar para esta semana? 😊",
    pending: "Olá [nome], tudo bem? Esperamos que sim! Passando de forma amigável para lembrar que temos em aberto em nosso sistema o valor de [valor] referente às suas últimas comprinhas. Posso gerar sua chave PIX de pagamento para facilitar por aqui? Muito obrigado pela atenção! 🙏",
    vips: "Olá [nome]! Passando para te agradecer de coração pela sua parceria e fidelidade com a Biobel! Você é uma das nossas clientes mais especiais. Por isso, preparamos em primeira mão um lançamento exclusivo com desconto de 15% reservado apenas para nossas VIPs. Quer receber a foto das novidades? ✨",
    followup: "Oi [nome], tudo bem? Faz alguns dias que você fez sua comprinha correspondente ao valor de [valor]. Estamos passando para saber se você está gostando do resultado e se o produto deu super certo na sua rotina! Qualquer dúvida sobre o modo de usar, estamos à total disposição. Um super beijo! 💕"
  });
  
  const [crmCopiedContactId, setCrmCopiedContactId] = useState<string | null>(null);

  // ==================== COMPARATIVO DIA A DIA (01 a 07) ====================
  const [comparisonDate, setComparisonDate] = useState<string>('2026-07-03');
  const [worstDaysPage, setWorstDaysPage] = useState<number>(1);
  const [worstDaysWeekdayFilter, setWorstDaysWeekdayFilter] = useState<string>('todos');

  const worst30DaysStats = useMemo(() => {
    const dailyTotals: { [dateStr: string]: { total: number; count: number; dateObj: Date } } = {};
    
    sales.forEach(s => {
      const statusLower = (s.status || 'completed').toLowerCase();
      if (statusLower === 'returned' || statusLower === 'cancelled' || statusLower === 'devolvida' || statusLower === 'cancelada') return;
      try {
        const d = getSafeDate(s.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        
        if (!dailyTotals[key]) {
          dailyTotals[key] = { total: 0, count: 0, dateObj: d };
        }
        dailyTotals[key].total += s.total;
        dailyTotals[key].count += 1;
      } catch (e) {}
    });

    const daysList = Object.keys(dailyTotals).map(key => {
      const dObj = dailyTotals[key].dateObj;
      const daysOfWeekPt = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
      const dayOfWeekName = daysOfWeekPt[dObj.getDay()];
      
      return {
        dateStr: key,
        dateObj: dObj,
        total: dailyTotals[key].total,
        count: dailyTotals[key].count,
        dayOfWeekName
      };
    });

    // Calculate company daily average faturamento
    const totalDaysCount = daysList.length;
    const grandTotalSales = daysList.reduce((sum, d) => sum + d.total, 0);
    const companyDailyAverage = totalDaysCount > 0 ? grandTotalSales / totalDaysCount : 0;

    // Sort by total ascending (worst first)
    daysList.sort((a, b) => a.total - b.total);

    // Take top 30
    const top30Worst = daysList.slice(0, 30);

    // Analyze pattern in top 30 worst
    const weekdayCounts: { [key: string]: number } = {};
    top30Worst.forEach(d => {
      const wDay = d.dayOfWeekName;
      weekdayCounts[wDay] = (weekdayCounts[wDay] || 0) + 1;
    });

    let mostFrequentWorstWeekday = '';
    let maxCount = 0;
    Object.keys(weekdayCounts).forEach(w => {
      if (weekdayCounts[w] > maxCount) {
        maxCount = weekdayCounts[w];
        mostFrequentWorstWeekday = w;
      }
    });

    return {
      top30Worst,
      companyDailyAverage,
      mostFrequentWorstWeekday,
      maxCount,
      totalDaysWithSales: totalDaysCount
    };
  }, [sales]);

  const filteredWorstDays = useMemo(() => {
    if (worstDaysWeekdayFilter === 'todos') {
      return worst30DaysStats.top30Worst;
    }
    return worst30DaysStats.top30Worst.filter(
      d => d.dayOfWeekName.toLowerCase() === worstDaysWeekdayFilter.toLowerCase()
    );
  }, [worst30DaysStats.top30Worst, worstDaysWeekdayFilter]);

  const itemsPerPage = 10;
  const totalWorstDaysPages = useMemo(() => {
    return Math.ceil(filteredWorstDays.length / itemsPerPage);
  }, [filteredWorstDays]);

  const paginatedWorstDays = useMemo(() => {
    const activePage = Math.min(worstDaysPage, Math.max(1, totalWorstDaysPages));
    const startIndex = (activePage - 1) * itemsPerPage;
    return filteredWorstDays.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredWorstDays, worstDaysPage, totalWorstDaysPages]);

  const parsedCompDate = useMemo(() => {
    try {
      const parts = comparisonDate.split('-');
      const year = Number(parts[0]);
      const month = Number(parts[1]) - 1; // 0-indexed
      const day = Number(parts[2]);
      return { year, month, day };
    } catch {
      return { year: 2026, month: 6, day: 3 }; // default to July 3rd, 2026 (6 is July)
    }
  }, [comparisonDate]);

  const comparisonStats = useMemo(() => {
    const { year, month, day: refDay } = parsedCompDate;

    // Current month info
    const currentMonthDate = new Date(year, month, 15);
    const currentMonthLabel = currentMonthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    // Previous month info
    let prevMonth = month - 1;
    let prevMonthYear = year;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevMonthYear = year - 1;
    }
    const prevMonthDate = new Date(prevMonthYear, prevMonth, 15);
    const prevMonthLabel = prevMonthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    const currentDays = Array.from({ length: 7 }, (_, i) => {
      const dNum = i + 1;
      return {
        dayNum: dNum,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`,
        total: 0,
        count: 0
      };
    });

    const prevDays = Array.from({ length: 7 }, (_, i) => {
      const dNum = i + 1;
      return {
        dayNum: dNum,
        dateStr: `${prevMonthYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`,
        total: 0,
        count: 0
      };
    });

    sales.forEach(s => {
      if (s.status !== 'completed' && s.status !== 'Concluída') return;
      try {
        const sd = getSafeDate(s.date);
        const sYear = sd.getFullYear();
        const sMonth = sd.getMonth();
        const sDay = sd.getDate();

        if (sYear === year && sMonth === month && sDay >= 1 && sDay <= 7) {
          currentDays[sDay - 1].total += s.total;
          currentDays[sDay - 1].count += 1;
        } else if (sYear === prevMonthYear && sMonth === prevMonth && sDay >= 1 && sDay <= 7) {
          prevDays[sDay - 1].total += s.total;
          prevDays[sDay - 1].count += 1;
        }
      } catch (e) {}
    });

    const currentSum = currentDays.reduce((sum, d) => sum + d.total, 0);
    const prevSum = prevDays.reduce((sum, d) => sum + d.total, 0);

    let periodGrowth = 0;
    if (prevSum > 0) {
      periodGrowth = ((currentSum - prevSum) / prevSum) * 100;
    } else if (currentSum > 0) {
      periodGrowth = 100;
    }

    // Rank current days (1 to 7) by their faturamento
    const rankedDays = [...currentDays]
      .map(d => ({ ...d }))
      .sort((a, b) => b.total - a.total);

    // Find the rank of the reference day (e.g. Day 3)
    const refDayInfo = currentDays[refDay - 1] || { dayNum: refDay, total: 0, count: 0 };
    const refDayRankIndex = rankedDays.findIndex(d => d.dayNum === refDay);
    const refDayRank = refDayRankIndex !== -1 ? refDayRankIndex + 1 : 0;

    // Day over day comparison for the reference day
    const refDayPrevInfo = prevDays[refDay - 1] || { dayNum: refDay, total: 0, count: 0 };
    let refDayGrowth = 0;
    if (refDayPrevInfo && refDayPrevInfo.total > 0) {
      refDayGrowth = ((refDayInfo.total - refDayPrevInfo.total) / refDayPrevInfo.total) * 100;
    } else if (refDayInfo && refDayInfo.total > 0) {
      refDayGrowth = 100;
    }

    return {
      currentMonthLabel,
      prevMonthLabel,
      currentDays,
      prevDays,
      currentSum,
      prevSum,
      periodGrowth,
      rankedDays,
      refDay,
      refDayInfo,
      refDayRank,
      refDayPrevInfo,
      refDayGrowth
    };
  }, [sales, parsedCompDate]);

  // ==================== NEW SMART SHIFTS STATES ====================
  // Initialize shifts map (day -> list of staff names)
  const [smartShifts, setSmartShifts] = useState<{ [day: string]: string[] }>({
    segunda: [],
    terça: [],
    quarta: [],
    quinta: [],
    sexta: [],
    sábado: [],
    domingo: [],
  });

  // Dynamically populate smartShifts based on the actual registered staff members of the store
  React.useEffect(() => {
    if (staff && staff.length > 0) {
      const names = staff.map(s => s.name.toUpperCase());
      const p1 = names[1] || names[0]; // e.g., GABRIELA CLT
      const p2 = names[2] || names[0]; // e.g., DAY
      const p3 = names[3] || names[0]; // e.g., BIBI
      
      setSmartShifts({
        segunda: p1 ? [p1] : [],
        terça: p2 ? [p2] : [],
        quarta: p1 ? [p1] : [],
        quinta: p1 && p2 ? [p1, p2] : (p1 ? [p1] : []),
        sexta: [p1, p2, p3].filter(Boolean),
        sábado: [p1, p2, p3].filter(Boolean),
        domingo: [],
      });
    }
  }, [staff]);

  // ==================== NEW FORECASTING STATES ====================
  const [ticketSlider, setTicketSlider] = useState<number>(240); // target ticket value
  const [retentionSlider, setRetentionSlider] = useState<number>(15); // target retention rate growth (%)
  const [marketingSlider, setMarketingSlider] = useState<number>(20); // target new leads growth (%)
  const [paSlider, setPaSlider] = useState<number>(1.8); // target items average (PA)


  // Parse Month and Year map for selectedPeriod
  const monthsMap: { [key: string]: number } = {
    janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
    julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
  };

  const currentPeriodMonthIndex = useMemo(() => {
    if (!selectedPeriod || selectedPeriod === 'todos') return -1;
    const part = selectedPeriod.split(' de ')[0]?.toLowerCase();
    return monthsMap[part] !== undefined ? monthsMap[part] : -1;
  }, [selectedPeriod]);

  const currentPeriodYear = useMemo(() => {
    if (!selectedPeriod || selectedPeriod === 'todos') return -1;
    const part = selectedPeriod.split(' de ')[1];
    return part ? Number(part) : -1;
  }, [selectedPeriod]);

  // Filter Completed Sales based on selected timeframe
  const filteredSales = useMemo(() => {
    const validSales = sales.filter(s => {
      const statusLower = (s.status || 'completed').toLowerCase();
      return statusLower !== 'returned' && statusLower !== 'cancelled' && statusLower !== 'devolvida' && statusLower !== 'cancelada';
    });
    if (selectedPeriod === 'todos') return validSales;

    return validSales.filter(s => {
      const d = getSafeDate(s.date);
      return d.getMonth() === currentPeriodMonthIndex && d.getFullYear() === currentPeriodYear;
    });
  }, [sales, selectedPeriod, currentPeriodMonthIndex, currentPeriodYear]);

  // Unique list of months for drop-down selection
  const availableMonths = useMemo(() => {
    const list = new Set<string>();
    sales.forEach(s => {
      const d = getSafeDate(s.date);
      const mStr = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      list.add(mStr);
    });
    // Ensure current month is in there
    const todayStr = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    list.add(todayStr);
    return Array.from(list).sort((a, b) => {
      const parseDate = (str: string) => {
        const parts = str.split(' de ');
        const m = monthsMap[parts[0].toLowerCase()] || 0;
        const y = Number(parts[1]) || 0;
        return new Date(y, m, 1);
      };
      return parseDate(b).getTime() - parseDate(a).getTime();
    });
  }, [sales]);

  // Extract all events from all monthly goals
  const allEvents = useMemo(() => {
    const events: CustomEvent[] = [];
    monthlyGoals.forEach(g => {
      if (g.customEvents) {
        g.customEvents.forEach(ev => {
          // Avoid duplicate IDs
          if (!events.some(e => e.id === ev.id)) {
            events.push(ev);
          }
        });
      }
    });

    // Fallback support if there is a known event of company on 05/06/2026
    const has05_06Event = events.some(e => e.date === '2026-06-05');
    if (!has05_06Event) {
      events.push({
        id: 'ev-salvatore-loja',
        date: '2026-06-05',
        name: 'Evento Salvatore (Loja)',
        description: 'Evento da empresa parceira que atraiu muitas clientes.'
      });
    }

    return events;
  }, [monthlyGoals]);

  const eventsByDate = useMemo(() => {
    const map: { [dateStr: string]: CustomEvent } = {};
    allEvents.forEach(ev => {
      if (ev.date) {
        map[ev.date] = ev;
      }
    });
    return map;
  }, [allEvents]);

  // ==================== 1. PIORES DIAS (Worst Days) ====================
  const worstDays = useMemo(() => {
    const totalsByDay: { [dateStr: string]: { total: number; count: number; dateStr: string } } = {};
    
    // Aggregate completed sales
    filteredSales.forEach(s => {
      const d = getSafeDate(s.date);
      if (d.getDay() === 0) return; // Skip Sundays since the company does not work on Sundays
      const dateKey = s.date.split('T')[0];
      if (!totalsByDay[dateKey]) {
        totalsByDay[dateKey] = { total: 0, count: 0, dateStr: dateKey };
      }
      totalsByDay[dateKey].total += s.total;
      totalsByDay[dateKey].count += 1;
    });

    const list = Object.values(totalsByDay);
    list.sort((a, b) => a.total - b.total);
    return list.slice(0, 5);
  }, [filteredSales]);


  // ==================== 2. PIORES DIAS DE ATENDIMENTO / SEMANA ====================
  const weekdayStats = useMemo(() => {
    const workDays = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const fullWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    
    const totals = workDays.reduce((acc, current) => {
      acc[current] = { total: 0, count: 0, avgTicket: 0, name: current };
      return acc;
    }, {} as { [key: string]: { total: number; count: number; avgTicket: number; name: string } });

    filteredSales.forEach(s => {
      const d = getSafeDate(s.date);
      const weekdayName = fullWeek[d.getDay()];
      if (totals[weekdayName]) {
        totals[weekdayName].total += s.total;
        totals[weekdayName].count += 1;
      }
    });

    const result = Object.values(totals).map(it => {
      it.avgTicket = it.count > 0 ? it.total / it.count : 0;
      return it;
    });

    const sortedByTotal = [...result].sort((a, b) => a.total - b.total);
    const sortedByTicket = [...result].sort((a, b) => (a.count > 0 ? a.avgTicket : Infinity) - (b.count > 0 ? b.avgTicket : Infinity));

    return {
      all: result,
      worstByTotal: sortedByTotal[0]?.total === 0 && sortedByTotal.every(w => w.total === 0) ? null : sortedByTotal[0],
      worstByTicket: sortedByTicket[0]?.count === 0 && sortedByTicket.every(w => w.count === 0) ? null : sortedByTicket[0]
    };
  }, [filteredSales]);


  // ==================== 3. PIORES SEMANAS (Worst Weeks) ====================
  const weeklyStats = useMemo(() => {
    const weeks = [
      { name: 'Semana 1 (Dias 1-7)', total: 0, count: 0, index: 1 },
      { name: 'Semana 2 (Dias 8-14)', total: 0, count: 0, index: 2 },
      { name: 'Semana 3 (Dias 15-21)', total: 0, count: 0, index: 3 },
      { name: 'Semana 4 (Dias 22-28)', total: 0, count: 0, index: 4 },
      { name: 'Semana 5 (Dias 29-31)', total: 0, count: 0, index: 5 }
    ];

    filteredSales.forEach(s => {
      const d = getSafeDate(s.date);
      const day = d.getDate();
      let weekIndex = 0;
      if (day <= 7) weekIndex = 0;
      else if (day <= 14) weekIndex = 1;
      else if (day <= 21) weekIndex = 2;
      else if (day <= 28) weekIndex = 3;
      else weekIndex = 4;

      if (weeks[weekIndex]) {
        weeks[weekIndex].total += s.total;
        weeks[weekIndex].count += 1;
      }
    });

    const activeWeeks = weeks.filter(w => w.total > 0 || selectedPeriod === 'todos');
    const sortedWeeks = [...weeks].sort((a, b) => a.total - b.total);
    const worstWeek = activeWeeks.length > 0 ? [...activeWeeks].sort((a, b) => a.total - b.total)[0] : sortedWeeks[0];

    return {
      all: weeks,
      worst: worstWeek
    };
  }, [filteredSales, selectedPeriod]);


  // ==================== 4. PIORES VENDEDORAS (Low Performing Sellers) ====================
  // Excluding partner "Bibi" completely and anyone who only worked 1 day
  const sellerStats = useMemo(() => {
    const totals: { 
      [name: string]: { 
        name: string; 
        total: number; 
        count: number; 
        avgTicket: number; 
        dates: Set<string>;
      } 
    } = {};

    filteredSales.forEach(s => {
      const name = s.vendedora || 'Não especificada';
      if (!totals[name]) {
        totals[name] = { name, total: 0, count: 0, avgTicket: 0, dates: new Set<string>() };
      }
      totals[name].total += s.total;
      totals[name].count += 1;
      const dateKey = s.date.split('T')[0];
      totals[name].dates.add(dateKey);
    });

    const list = Object.values(totals).map(it => {
      it.avgTicket = it.count > 0 ? it.total / it.count : 0;
      return {
        ...it,
        dailyAvg: it.dates.size > 0 ? it.total / it.dates.size : 0
      };
    });

    // Exclude system accounts/unspecified
    // Exclude "BIBI" (since she is a partner / sócia and can't be listed as underperforming)
    // Exclude anyone with dates.size <= 1 (only 1 day worked, not statistically relevant)
    const activeSellers = list.filter(it => {
      const isSystemOrUnknown = it.name === 'Não especificada' || it.name === 'SISTEMA';
      const isBibi = it.name.toUpperCase() === 'BIBI';
      const workedOnlyOneDay = it.dates.size <= 1;
      return !isSystemOrUnknown && !isBibi && !workedOnlyOneDay && it.total > 0;
    });

    const sortedBySales = [...activeSellers].sort((a, b) => a.dailyAvg - b.dailyAvg);
    const sortedByTicket = [...activeSellers].sort((a, b) => a.avgTicket - b.avgTicket);

    return {
      all: activeSellers,
      worstSales: sortedBySales[0] || null,
      worstTicket: sortedByTicket[0] || null
    };
  }, [filteredSales]);


  // ==================== 5. PIOR TURNO DE VENDA (Worst Sales Shift) ====================
  const shiftStats = useMemo(() => {
    const shifts = [
      { name: 'Manhã (08h - 11h59)', id: 'manha', total: 0, count: 0, avgTicket: 0, label: 'Manhã ☀️' },
      { name: 'Almoço (12h - 13h59)', id: 'almoco', total: 0, count: 0, avgTicket: 0, label: 'Almoço 🍽️' },
      { name: 'Tarde (14h - 18h)', id: 'tarde', total: 0, count: 0, avgTicket: 0, label: 'Tarde 🌤️' }
    ];

    filteredSales.forEach(s => {
      const d = getSafeDate(s.date);
      const hour = d.getHours();
      let idx = 1;
      if (hour < 12) {
        idx = 0; // Manhã (and early entries)
      } else if (hour >= 12 && hour < 14) {
        idx = 1; // Almoço
      } else {
        idx = 2; // Tarde (afternoon and late entries)
      }

      shifts[idx].total += s.total;
      shifts[idx].count += 1;
    });

    shifts.forEach(sh => {
      sh.avgTicket = sh.count > 0 ? sh.total / sh.count : 0;
    });

    const activeShifts = shifts.filter(sh => sh.count > 0);
    const worstShift = activeShifts.length > 0 ? [...activeShifts].sort((a, b) => a.total - b.total)[0] : shifts[0];

    return {
      all: shifts,
      worst: worstShift
    };
  }, [filteredSales]);


  // ==================== 6. PIOR TICKET MÉDIO NO GERAL ====================
  const averageTicketGlobal = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const totalCount = filteredSales.length;
    return totalCount > 0 ? totalRevenue / totalCount : 0;
  }, [filteredSales]);


  // ==================== 6.5. ANÁLISE DETALHADA DE PIORES MANHÃS E TARDES ====================
  const worstMorningsAndAfternoons = useMemo(() => {
    const uniqueDatesByWeekday: { [weekday: number]: Set<string> } = {
      0: new Set<string>(),
      1: new Set<string>(),
      2: new Set<string>(),
      3: new Set<string>(),
      4: new Set<string>(),
      5: new Set<string>(),
      6: new Set<string>(),
    };

    filteredSales.forEach(s => {
      const d = getSafeDate(s.date);
      const weekday = d.getDay();
      const dateStr = s.date.split('T')[0];
      uniqueDatesByWeekday[weekday].add(dateStr);
    });

    const weekdayGroup = {
      0: { weekdayName: 'Domingo', morningTotal: 0, morningCount: 0, afternoonTotal: 0, afternoonCount: 0 },
      1: { weekdayName: 'Segunda-feira', morningTotal: 0, morningCount: 0, afternoonTotal: 0, afternoonCount: 0 },
      2: { weekdayName: 'Terça-feira', morningTotal: 0, morningCount: 0, afternoonTotal: 0, afternoonCount: 0 },
      3: { weekdayName: 'Quarta-feira', morningTotal: 0, morningCount: 0, afternoonTotal: 0, afternoonCount: 0 },
      4: { weekdayName: 'Quinta-feira', morningTotal: 0, morningCount: 0, afternoonTotal: 0, afternoonCount: 0 },
      5: { weekdayName: 'Sexta-feira', morningTotal: 0, morningCount: 0, afternoonTotal: 0, afternoonCount: 0 },
      6: { weekdayName: 'Sábado', morningTotal: 0, morningCount: 0, afternoonTotal: 0, afternoonCount: 0 },
    };

    filteredSales.forEach(s => {
      const d = getSafeDate(s.date);
      const weekday = d.getDay();
      const hour = d.getHours();
      const group = weekdayGroup[weekday as keyof typeof weekdayGroup];
      if (group) {
        if (hour < 12) {
          group.morningTotal += s.total;
          group.morningCount += 1;
        } else {
          group.afternoonTotal += s.total;
          group.afternoonCount += 1;
        }
      }
    });

    // Exclude Sunday (0) and any day that had zero sales overall in the period (could mean store was closed)
    const activeWeekdays = [1, 2, 3, 4, 5, 6].filter(w => uniqueDatesByWeekday[w].size > 0);

    const morningResults = activeWeekdays.map(w => {
      const daysCount = uniqueDatesByWeekday[w].size || 1;
      const data = weekdayGroup[w as keyof typeof weekdayGroup];
      return {
        weekdayNum: w,
        weekdayName: data.weekdayName,
        avgCount: data.morningCount / daysCount,
        avgRevenue: data.morningTotal / daysCount,
      };
    });

    const afternoonResults = activeWeekdays.map(w => {
      const daysCount = uniqueDatesByWeekday[w].size || 1;
      const data = weekdayGroup[w as keyof typeof weekdayGroup];
      return {
        weekdayNum: w,
        weekdayName: data.weekdayName,
        avgCount: data.afternoonCount / daysCount,
        avgRevenue: data.afternoonTotal / daysCount,
      };
    });

    // Sort ascending by average revenue to find the worst ones
    const sortedMornings = [...morningResults].sort((a, b) => a.avgRevenue - b.avgRevenue).slice(0, 3);
    const sortedAfternoons = [...afternoonResults].sort((a, b) => a.avgRevenue - b.avgRevenue).slice(0, 3);

    return {
      worstMornings: sortedMornings,
      worstAfternoons: sortedAfternoons,
    };
  }, [filteredSales]);


  // ==================== 7. CRITICAL CATEGORIES (Underperforming Categories) ====================
  const categoryStats = useMemo(() => {
    const totals: { [cat: string]: { name: string; total: number; count: number } } = {};

    filteredSales.forEach(s => {
      s.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId || p.name === item.name);
        const catName = prod?.category || s.category || 'Outros';

        if (!totals[catName]) {
          totals[catName] = { name: catName, total: 0, count: 0 };
        }
        totals[catName].total += item.price * item.quantity;
        totals[catName].count += item.quantity;
      });
    });

    const list = Object.values(totals).filter(it => it.total > 0);
    list.sort((a, b) => a.total - b.total);

    return {
      all: list,
      worst: list[0] || null
    };
  }, [filteredSales, products]);

  // ==================== 8. ANALYTICS OF EVENTS ====================
  const eventDaysPerformance = useMemo(() => {
    const filteredEvents = allEvents.filter(ev => {
      if (selectedPeriod === 'todos') return true;
      const d = getSafeDate(ev.date);
      return d.getMonth() === currentPeriodMonthIndex && d.getFullYear() === currentPeriodYear;
    });

    return filteredEvents.map(ev => {
      const eventSales = sales.filter(s => {
        const isCompleted = s.status === 'completed' || s.status === 'Concluída';
        return isCompleted && s.date.split('T')[0] === ev.date;
      });

      const totalRevenue = eventSales.reduce((sum, s) => sum + s.total, 0);
      const salesCount = eventSales.length;
      const avgTicket = salesCount > 0 ? totalRevenue / salesCount : 0;
      const weatherObs = weatherObservations[ev.date];

      return {
        ...ev,
        totalRevenue,
        salesCount,
        avgTicket,
        weatherObs
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [allEvents, sales, selectedPeriod, currentPeriodMonthIndex, currentPeriodYear, weatherObservations]);


  // ==================== NEW HELPER ANALYTICS CALCULATIONS ====================

  // 1. CRM MATCHED CONTACTS
  const matchedCrmContacts = useMemo(() => {
    let list: { id: string; name: string; phone: string; reason: string; placeholderValue: string; diffDays?: number }[] = [];
    
    if (activeCampaignType === 'birthdays') {
      const currentMonthIndex = currentPeriodMonthIndex !== -1 ? currentPeriodMonthIndex : new Date().getMonth();
      list = customers.filter(c => {
        if (!c.birthDate) return false;
        const parts = c.birthDate.split('-');
        const m = parts[1] ? parseInt(parts[1], 10) - 1 : -1;
        if (m !== -1) return m === currentMonthIndex;
        const altParts = c.birthDate.split('/');
        const mAlt = altParts[1] ? parseInt(altParts[1], 10) - 1 : -1;
        return mAlt === currentMonthIndex;
      }).map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        reason: "Faz aniversário neste mês de faturamento",
        placeholderValue: "Aniversariante"
      }));
    } else if (activeCampaignType === 'inactive') {
      const completedSales = sales.filter(s => s.status === 'completed' || s.status === 'Concluída');
      const customerLastSale: { [key: string]: Date } = {};
      completedSales.forEach(s => {
        if (s.customerId) {
          const d = getSafeDate(s.date);
          if (!customerLastSale[s.customerId] || d > customerLastSale[s.customerId]) {
            customerLastSale[s.customerId] = d;
          }
        }
      });

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 45);

      list = customers.filter(c => {
        const lastD = customerLastSale[c.id];
        return !lastD || lastD < cutoff;
      }).map(c => {
        const lastD = customerLastSale[c.id];
        const diffDays = lastD ? Math.floor((Date.now() - lastD.getTime()) / (1000 * 60 * 60 * 24)) : 999;
        return {
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          diffDays,
          reason: lastD ? `Inativa há ${diffDays} dias` : 'Ainda não realizou compras',
          placeholderValue: lastD ? `sem visitar há ${diffDays} dias` : 'cliente cadastrado há tempos'
        };
      });
    } else if (activeCampaignType === 'pending') {
      const pendingSales = sales.filter(s => s.status?.toLowerCase() === 'pending' || s.status?.toLowerCase() === 'pendente' || s.status?.toLowerCase() === 'aberto');
      const salesMap: { [cust: string]: number } = {};
      pendingSales.forEach(s => {
        if (s.customerId) {
          salesMap[s.customerId] = (salesMap[s.customerId] || 0) + s.total;
        }
      });

      list = customers.filter(c => (c.debt && c.debt > 0) || salesMap[c.id] > 0).map(c => {
        const debtAmount = c.debt || salesMap[c.id] || 0;
        return {
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          reason: `Contas a receber pendentes de: ${formatCurrency(debtAmount)}`,
          placeholderValue: formatCurrency(debtAmount)
        };
      });

      pendingSales.forEach(s => {
        if (!s.customerId && s.customerName) {
          const exists = list.some(item => item.name === s.customerName);
          if (!exists) {
            list.push({
              id: s.id,
              name: s.customerName,
              phone: s.customerPhone || '',
              reason: `Venda pendente avulsa no valor de ${formatCurrency(s.total)}`,
              placeholderValue: formatCurrency(s.total)
            });
          }
        }
      });
    } else if (activeCampaignType === 'vips') {
      const completedSales = sales.filter(s => s.status === 'completed' || s.status === 'Concluída');
      const customerSpending: { [key: string]: { total: number, count: number } } = {};
      completedSales.forEach(s => {
        if (s.customerId) {
          if (!customerSpending[s.customerId]) customerSpending[s.customerId] = { total: 0, count: 0 };
          customerSpending[s.customerId].total += s.total;
          customerSpending[s.customerId].count += 1;
        }
      });

      list = customers.filter(c => {
        const spending = customerSpending[c.id];
        return spending && (spending.count >= 2 || spending.total >= 300);
      }).map(c => {
        const spending = customerSpending[c.id];
        return {
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          reason: `VIP: ${spending.count} compras, investiu total de ${formatCurrency(spending.total)}`,
          placeholderValue: formatCurrency(spending.total)
        };
      });
    } else {
      const completedSales = sales.filter(s => s.status === 'completed' || s.status === 'Concluída');
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 20);

      const recentCustomers: { [key: string]: { date: string, total: number } } = {};
      completedSales.forEach(s => {
        const d = getSafeDate(s.date);
        if (d >= cutoff && s.customerId) {
          recentCustomers[s.customerId] = { date: s.date, total: s.total };
        }
      });

      list = customers.filter(c => recentCustomers[c.id]).map(c => {
        const rs = recentCustomers[c.id];
        return {
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          reason: `Última compra de ${formatCurrency(rs.total)} em ${rs.date.split('-').reverse().join('/')}`,
          placeholderValue: formatCurrency(rs.total)
        };
      });
    }

    if (crmSearchQuery.trim()) {
      const sq = crmSearchQuery.toLowerCase();
      return list.filter(item => item.name.toLowerCase().includes(sq) || item.phone.includes(sq));
    }

    return list;
  }, [customers, activeCampaignType, sales, currentPeriodMonthIndex, crmSearchQuery, formatCurrency]);

  const getSubstitutedMessage = (template: string, name: string, val: string) => {
    return template
      .replace(/\[nome\]/gi, name)
      .replace(/\[valor\]/gi, val)
      .replace(/\[vendedora\]/gi, "Biobel")
      .replace(/\[dias_atraso\]/gi, val);
  };

  // 2. SMART SHIFTS EVALUATION
  const weekDaysList = [
    { key: 'segunda', label: 'Segunda-feira', rushHour: '17:00 - 19:30', rushLevel: 'Médio', weight: 1.3, recommendation: 'Recomenda-se 1 consultora focalizada no fechamento e disparo.' },
    { key: 'terça', label: 'Terça-feira', rushHour: '10:00 - 12:30', rushLevel: 'Baixo', weight: 1.0, recommendation: 'Dia normalmente ocioso; 1 vendedora é suficiente.' },
    { key: 'quarta', label: 'Quarta-feira', rushHour: '14:00 - 16:30', rushLevel: 'Baixo', weight: 1.1, recommendation: 'Fluxo estável; focar em reposição de estoque silenciosa.' },
    { key: 'quinta', label: 'Quinta-feira', rushHour: '15:30 - 19:00', rushLevel: 'Médio', weight: 1.6, recommendation: 'Tráfego aquecendo. Escalar 1 a 2 consultoras.' },
    { key: 'sexta', label: 'Sexta-feira', rushHour: '11:00 - 15:00', rushLevel: 'Alto', weight: 2.1, recommendation: 'Forte pico de almoço e serviços. Escalar equipe completa!' },
    { key: 'sábado', label: 'Sábado', rushHour: '09:00 - 14:00', rushLevel: 'Crítico', weight: 3.0, recommendation: 'Pico crítico absoluto! Mantenha reforço e sem horários vagos.' },
    { key: 'domingo', label: 'Domingo', rushHour: 'Inativo', rushLevel: 'Inativo', weight: 0.1, recommendation: 'Domingo sem atividades externas.' },
  ];

  const coverageAnalysis = useMemo(() => {
    let dayResults = weekDaysList.map(d => {
      const scheduledVal = smartShifts[d.key] || [];
      const staffCount = scheduledVal.length;
      let status: 'ideal' | 'no-staff' | 'understaffed' | 'overstaffed' = 'ideal';
      let score = 100;
      let message = '';

      if (d.key === 'domingo') {
        if (staffCount > 0) {
          status = 'overstaffed';
          score = 50;
          message = "⚠️ Distribuição desnecessária. Domingo a loja se mantém inativa.";
        } else {
          status = 'ideal';
          score = 100;
          message = "✅ Fechado corretamente. Escala de folga ativada.";
        }
      } else {
        if (d.weight >= 2.5) { // Sábado
          if (staffCount === 0) {
            status = 'no-staff';
            score = 0;
            message = "🚨 Gravíssimo! Sábado é pico crítico absoluto e não há ninguém escalado!";
          } else if (staffCount < 2) {
            status = 'understaffed';
            score = 55;
            message = "⚠️ Alerta de Gargalo! Apenas 1 vendedora escalada. Alto risco de perda de vendas por filas.";
          } else {
            status = 'ideal';
            score = 100;
            message = "🎉 Excelente! Cobertura robusta ideal para o pico máximo de vendas.";
          }
        } else if (d.weight >= 1.5) { // Sexta, Quinta
          if (staffCount === 0) {
            status = 'no-staff';
            score = 0;
            message = "🚨 Gravíssimo! Dia de faturamento acelerado sem equipe de atendimento.";
          } else if (smartShifts[d.key]?.length < 2) {
            status = 'understaffed';
            score = 70;
            message = "⚠️ Recomendamos escalar pelo menos 2 consultoras para equilibrar o fluxo.";
          } else {
            status = 'ideal';
            score = 100;
            message = "✅ Escala em harmonia com os picos de tráfego do dia.";
          }
        } else { // Segunda, Terça, Quarta
          if (staffCount === 0) {
            status = 'no-staff';
            score = 25;
            message = "🚨 Loja e atendimento oclusos sem nenhuma vendedora escalada.";
          } else if (staffCount > 2) {
            status = 'overstaffed';
            score = 70;
            message = "⚠️ Excesso de pessoal! Dia de baixo fluxo, alto custo de ociosidade operacional.";
          } else {
            status = 'ideal';
            score = 100;
            message = "✅ Escala otimizada e eficiente para tráfego brando.";
          }
        }
      }

      return {
        ...d,
        staffCount,
        status,
        score,
        message
      };
    });

    const averageScore = Math.round(dayResults.reduce((sum, r) => sum + r.score, 0) / dayResults.length);

    return {
      results: dayResults,
      averageScore
    };
  }, [smartShifts, staff]);

  // Handle toggling salesperson on a given day's shift
  const handleToggleShiftMember = (day: string, staffName: string) => {
    setSmartShifts(prev => {
      const current = prev[day] || [];
      const updated = current.includes(staffName)
        ? current.filter(x => x !== staffName)
        : [...current, staffName];
      return {
        ...prev,
        [day]: updated
      };
    });
  };

  // 3. REVENUE FORECASTING MODEL calculations
  const forecastingData = useMemo(() => {
    // Collect historical totals
    const completedSales = sales.filter(s => s.status === 'completed' || s.status === 'Concluída');
    const totalRev = completedSales.reduce((acc, s) => acc + s.total, 0);
    const countSales = completedSales.length;
    const currentTicket = countSales > 0 ? totalRev / countSales : 180;
    
    // Default baseline monthly revenue approximation
    const baselineMonthly = totalRev > 0 ? totalRev : 22000;

    // Simulation math from sliders
    // ticket multiplier: relative change compared to baseline approximation (say, 180)
    const ticketImpact = (ticketSlider - currentTicket) / currentTicket;
    
    // retention increase: each 10% adds around 5% to revenue
    const retentionImpact = (retentionSlider / 100) * 0.45;
    
    // marketing multiplier: each 10% adds around 7% to faturamento
    const marketingImpact = (marketingSlider / 100) * 0.8;
    
    // Items Average (PA): historical average of items in sales.
    // Let's check how PA is matched compared to the target (paSlider)
    const paImpact = (paSlider - 1.5) * 0.2; // roughly 20% growth per 1 additional item on average

    const totalMulti = 1 + (ticketImpact > 0 ? ticketImpact * 0.5 : 0) + retentionImpact + marketingImpact + (paImpact > 0 ? paImpact : 0);
    
    const projectedMonth1 = baselineMonthly * totalMulti;
    const projectedMonth2 = projectedMonth1 * 1.05; // compounding trend
    const projectedMonth3 = projectedMonth1 * 1.12;

    const formattedHistory = [
      { name: 'Mês Anterior (Real)', faturamento: baselineMonthly * 0.85, type: 'hist' },
      { name: 'Mês Atual (Estimado)', faturamento: baselineMonthly, type: 'hist' },
      { name: 'Projeção M+1', faturamento: projectedMonth1, type: 'proj' },
      { name: 'Projeção M+2', faturamento: projectedMonth2, type: 'proj' },
      { name: 'Projeção M+3', faturamento: projectedMonth3, type: 'proj' },
    ];

    return {
      historyAndProjections: formattedHistory,
      baselineMonthly,
      projectedMonth1,
      projectedMonth3,
      totalGrowthPercent: Math.round((projectedMonth1 - baselineMonthly) / baselineMonthly * 100)
    };
  }, [sales, ticketSlider, retentionSlider, marketingSlider, paSlider]);


  const weathersMap: {[key: string]: { label: string, icon: string, bg: string, text: string }} = {
    ensolarado: { label: 'Ensolarado', icon: '☀️', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400', text: 'text-amber-600' },
    nublado: { label: 'Nublado', icon: '☁️', bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300', text: 'text-slate-500' },
    chuvoso: { label: 'Chuvoso', icon: '🌧️', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400', text: 'text-blue-500' },
    chuva_forte: { label: 'Chuva Forte', icon: '⛈️', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400', text: 'text-rose-500' }
  };

  const handlePeriodChangeLocal = (val: string) => {
    setSelectedPeriod(val);
    if (val !== 'todos') {
      setSelectedMonth(val);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-[1400px] mx-auto p-1 sm:p-6 pb-24">
      {/* 🚀 EXCLUSIVE BANNER */}
      <div className="bg-gradient-to-r from-red-500/10 via-amber-500/10 to-indigo-500/5 dark:from-red-950/40 dark:via-amber-950/30 dark:to-slate-900 border border-amber-500/20 dark:border-amber-500/10 p-8 rounded-[36px] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-red-500 animate-pulse">
          <AlertTriangle size={150} />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900/40 text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-widest leading-none">
              <AlertTriangle size={12} className="animate-bounce" />
              Painel de Atenção & Melhorias
            </span>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Onde Focar Hoje?
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs max-w-2xl leading-relaxed">
              Diferente dos relatórios comuns que mostram apenas os pontos fortes, esta visão analisa os gargalos, as lacunas de faturamento, pior ticket médio, turnos ociosos e vendedoras que precisam de capacitação. Use esses dados para criar melhorias estratégicas em seu negócio.
            </p>
          </div>

          {/* New Clean Unified Selector with "Todos os Meses" */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-950 p-3 border border-slate-150 dark:border-slate-800 rounded-3xl shrink-0 shadow-xs">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 shrink-0 select-none pl-1">Filtrar Período:</label>
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => handlePeriodChangeLocal(e.target.value)}
                className="pl-3 pr-9 py-2 bg-slate-50/60 dark:bg-slate-900/60 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-2xl appearance-none outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer min-w-[210px]"
              >
                <option value="todos">Todos os Meses (Geral Acumulado)</option>
                {availableMonths.map(mon => (
                  <option key={mon} value={mon}>{mon.toUpperCase()}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ChevronDown size={12} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 DIAGNÓSTICO E RANKING DA PRIMEIRA SEMANA (DIAS 01 A 07) */}
      <div className="bg-white dark:bg-slate-900 rounded-[36px] border border-slate-150 dark:border-slate-800 shadow-xs overflow-hidden text-left relative group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-indigo-500 pointer-events-none">
          <Sparkles size={160} />
        </div>
        <div className="absolute bottom-0 left-0 p-8 opacity-[0.01] text-teal-500 pointer-events-none">
          <Activity size={160} />
        </div>

        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              <Sparkles size={12} className="animate-pulse text-indigo-500" />
              Análise de Comparativo Semanal e Ranking do Dia (01 a 07)
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Acompanhamento Especial de Início de Mês
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Compare o faturamento da primeira semana do mês (Dias 01 a 07) contra o mês anterior e veja a posição do seu dia de faturamento.
            </p>
          </div>

          {/* Interactive Date Selector starting on 2026-07-03 as requested */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2 border border-slate-100 dark:border-slate-800 rounded-2xl shrink-0">
            <span className="text-[9px] font-black uppercase text-slate-400 px-2">Data de Referência:</span>
            <input 
              type="date"
              value={comparisonDate}
              onChange={(e) => setComparisonDate(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
            />
            {/* Quick buttons */}
            <button 
              onClick={() => setComparisonDate('2026-07-03')}
              className={`px-2.5 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${
                comparisonDate === '2026-07-03' 
                  ? "bg-indigo-600 text-white shadow-2xs" 
                  : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              03/07/2026 (Exemplo)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800/80">
          
          {/* LEFT COLUMN: Cumulative Comparison */}
          <div className="p-6 md:p-8 lg:col-span-4 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Faturamento Acumulado (Dias 01 a 07)
              </span>
              <p className="text-[10px] text-slate-400 font-bold uppercase">
                Período fechado de comparação comercial
              </p>
            </div>

            <div className="space-y-4 py-2">
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                <span className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block mb-1">
                  MÊS ATUAL ({comparisonStats.currentMonthLabel})
                </span>
                <p className="text-2xl font-black text-slate-950 dark:text-white font-mono leading-none">
                  {formatCurrency(comparisonStats.currentSum)}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                  MÊS ANTERIOR ({comparisonStats.prevMonthLabel})
                </span>
                <p className="text-xl font-black text-slate-500 dark:text-slate-400 font-mono leading-none">
                  {formatCurrency(comparisonStats.prevSum)}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-50 dark:border-slate-850 flex items-center justify-between">
              <span className="text-[9px] text-slate-400 font-black uppercase">Variação no Período:</span>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-md font-mono flex items-center gap-0.5 ${
                comparisonStats.periodGrowth >= 0 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}>
                {comparisonStats.periodGrowth >= 0 ? '▲ +' : '▼ '}
                {Math.abs(comparisonStats.periodGrowth).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* MIDDLE COLUMN: Reference Day Deep-Dive */}
          <div className="p-6 md:p-8 lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                Destaque do Dia {String(parsedCompDate.day).padStart(2, '0')} de {comparisonStats.currentMonthLabel.split(' de ')[0]}
              </span>
              <p className="text-[10px] text-slate-400 font-bold uppercase">
                Ranking e desempenho do seu dia selecionado
              </p>
            </div>

            <div className="space-y-4 py-1">
              <div className="bg-indigo-50/40 dark:bg-indigo-950/10 p-5 rounded-2xl border border-indigo-100/30 dark:border-indigo-900/15 flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none block mb-1">RANKING DO DIA</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white uppercase leading-none">
                    {comparisonStats.refDayRank ? `${comparisonStats.refDayRank}º Lugar` : 'Sem Vendas'}
                  </p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">
                    Entre os dias 1 a 7 do mês
                  </p>
                </div>
                <div className="text-3xl shrink-0">
                  {comparisonStats.refDayRank === 1 ? '🥇' : comparisonStats.refDayRank === 2 ? '🥈' : comparisonStats.refDayRank === 3 ? '🥉' : '📊'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-800/50">
                  <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block font-sans">Faturamento Dia {parsedCompDate.day}</span>
                  <p className="text-sm font-black text-slate-800 dark:text-white font-mono mt-1">
                    {formatCurrency(comparisonStats.refDayInfo.total)}
                  </p>
                  <span className="text-[8px] text-slate-400 font-bold uppercase block mt-0.5 font-sans">
                    {comparisonStats.refDayInfo.count} {comparisonStats.refDayInfo.count === 1 ? 'venda' : 'vendas'}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-800/50 font-sans">
                  <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block font-sans">Mesmo Dia Mês Ant.</span>
                  <p className="text-sm font-black text-slate-500 dark:text-slate-400 font-mono mt-1">
                    {formatCurrency(comparisonStats.refDayPrevInfo.total)}
                  </p>
                  <span className={`text-[8px] font-mono font-black uppercase mt-0.5 block ${
                    comparisonStats.refDayGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}>
                    {comparisonStats.refDayGrowth >= 0 ? '▲ +' : '▼ '}
                    {Math.abs(comparisonStats.refDayGrowth).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-500/[0.04] border border-amber-500/10 rounded-xl text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed font-sans">
              <strong>💡 Alerta Decisão:</strong> {comparisonStats.refDayRank === 1 
                ? `O dia ${parsedCompDate.day} foi o melhor dia de vendas da primeira semana de ${comparisonStats.currentMonthLabel.split(' de ')[0]}! Parabéns à equipe.`
                : `O dia ${parsedCompDate.day} está no ${comparisonStats.refDayRank}º lugar de faturamento na semana. ${comparisonStats.refDayRank > 4 ? 'Abaixo do esperado. Que tal programar um disparo ativo no WhatsApp CRM hoje para aquecer as vendas?' : 'Desempenho estável, aproveite para consolidar metas!'}`
              }
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Day Track (01-07) with ranking placement */}
          <div className="p-6 md:p-8 lg:col-span-3 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Visualização do Top-7
              </span>
              <p className="text-[10px] text-slate-400 font-bold uppercase">
                Faturamento diário ordenado do dia 01 ao dia 07
              </p>
            </div>

            <div className="space-y-1.5 py-1">
              {comparisonStats.currentDays.map((d) => {
                const isSelected = d.dayNum === parsedCompDate.day;
                const dRank = comparisonStats.rankedDays.findIndex(rd => rd.dayNum === d.dayNum) + 1;
                return (
                  <div 
                    key={d.dayNum}
                    onClick={() => setComparisonDate(`${parsedCompDate.year}-${String(parsedCompDate.month + 1).padStart(2, '0')}-${String(d.dayNum).padStart(2, '0')}`)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isSelected 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-2xs scale-[1.02]" 
                        : "bg-slate-50/50 dark:bg-slate-850/20 border-slate-100 dark:border-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isSelected ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>
                        Dia {String(d.dayNum).padStart(2, '0')}
                      </span>
                      {d.total > 0 && (
                        <span className={`text-[8px] font-bold uppercase ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                          Rank #{dRank}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold font-mono">
                      {formatCurrency(d.total)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* 🚨 ANÁLISE COMPLETA: OS 30 PIORES DIAS DE FATURAMENTO DA EMPRESA */}
      <div className="bg-white dark:bg-slate-900 rounded-[36px] border border-slate-150 dark:border-slate-800 shadow-xs overflow-hidden text-left relative group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-rose-500 pointer-events-none">
          <TrendingDown size={160} />
        </div>

        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
              <AlertTriangle size={12} className="animate-pulse text-rose-500" />
              Diagnóstico Histórico de Receita
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Os 30 Piores Dias de Faturamento da Empresa 📉
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Mapeamento completo dos dias com menor faturamento em toda a história para identificar gargalos e sazonalidades críticas de vendas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-rose-500/[0.04] border border-rose-500/10 px-4 py-2 rounded-2xl shrink-0">
              <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest block">MÉDIA DIÁRIA GERAL</span>
              <p className="text-base font-black text-slate-950 dark:text-white font-mono leading-none mt-1">
                {formatCurrency(worst30DaysStats.companyDailyAverage)}
              </p>
            </div>
            {worst30DaysStats.mostFrequentWorstWeekday && (
              <div className="bg-amber-500/[0.04] border border-amber-500/10 px-4 py-2 rounded-2xl shrink-0">
                <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block">DIA MAIS RECORRENTE</span>
                <p className="text-xs font-extrabold text-slate-805 dark:text-slate-200 uppercase mt-1">
                  {worst30DaysStats.mostFrequentWorstWeekday} <span className="text-[10px] text-amber-500 font-black">({worst30DaysStats.maxCount}x)</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Table Area */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Weekday Quick Filter */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[9px] font-black uppercase text-slate-400 mr-2">Filtrar por dia:</span>
            {['todos', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'].map((wDay) => {
              const isSelected = worstDaysWeekdayFilter === wDay;
              return (
                <button
                  key={wDay}
                  onClick={() => {
                    setWorstDaysWeekdayFilter(wDay);
                    setWorstDaysPage(1); // reset to page 1 on filter change
                  }}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-xl transition-all ${
                    isSelected
                      ? "bg-rose-600 text-white shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/85"
                  }`}
                >
                  {wDay === 'todos' ? 'Todos os Dias' : wDay.split('-')[0]}
                </button>
              );
            })}
          </div>

          {/* Table representing Worst Days */}
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-3xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-16">Posição</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data & Dia da Semana</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Faturamento</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Vendas Concluídas</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Desvio vs Média</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                {paginatedWorstDays.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400 uppercase font-black tracking-wider">
                      Nenhum registro encontrado para o filtro selecionado.
                    </td>
                  </tr>
                ) : (
                  paginatedWorstDays.map((d) => {
                    // Find global index/rank
                    const globalRank = worst30DaysStats.top30Worst.findIndex(item => item.dateStr === d.dateStr) + 1;
                    const deviationPct = worst30DaysStats.companyDailyAverage > 0
                      ? ((d.total - worst30DaysStats.companyDailyAverage) / worst30DaysStats.companyDailyAverage) * 100
                      : 0;

                    return (
                      <tr 
                        key={d.dateStr} 
                        className="hover:bg-slate-50/[0.4] dark:hover:bg-slate-950/[0.15] transition-all"
                      >
                        {/* Position Rank Badge */}
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center justify-center font-mono font-black text-[10px] w-7 h-7 rounded-lg ${
                            globalRank <= 3
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : globalRank <= 10
                              ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}>
                            {globalRank}º
                          </span>
                        </td>

                        {/* Date & Weekday */}
                        <td className="px-6 py-3.5">
                          <div>
                            <p className="text-xs font-black text-slate-805 dark:text-slate-205 uppercase">
                              {d.dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </p>
                            <p className="text-[8.5px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider">
                              {d.dayOfWeekName}
                            </p>
                          </div>
                        </td>

                        {/* Faturamento */}
                        <td className="px-6 py-3.5 text-right font-mono text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(d.total)}
                        </td>

                        {/* Sales Count */}
                        <td className="px-6 py-3.5 text-center text-xs font-bold text-slate-600 dark:text-slate-350 font-mono">
                          {d.count} {d.count === 1 ? 'pedido' : 'pedidos'}
                        </td>

                        {/* Deviation % from daily average */}
                        <td className="px-6 py-3.5 text-right">
                          <span className="text-[10px] font-mono font-black text-rose-500 dark:text-rose-400">
                            {deviationPct.toFixed(1)}% vs média
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalWorstDaysPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-[9px] text-slate-400 font-black uppercase">
                Exibindo página {worstDaysPage} de {totalWorstDaysPages} ({filteredWorstDays.length} dias listados)
              </span>
              <div className="flex gap-1">
                <button
                  disabled={worstDaysPage === 1}
                  onClick={() => setWorstDaysPage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1.5 text-[9px] font-black uppercase rounded-lg border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950 disabled:opacity-40 transition-all"
                >
                  ◄ Anterior
                </button>
                {Array.from({ length: totalWorstDaysPages }, (_, i) => i + 1).map((pNum) => (
                  <button
                    key={pNum}
                    disabled={worstDaysPage === pNum}
                    onClick={() => setWorstDaysPage(pNum)}
                    className={`px-2.5 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${
                      worstDaysPage === pNum
                        ? "bg-rose-600 text-white"
                        : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50"
                    }`}
                  >
                    {pNum}
                  </button>
                ))}
                <button
                  disabled={worstDaysPage === totalWorstDaysPages}
                  onClick={() => setWorstDaysPage(prev => Math.min(totalWorstDaysPages, prev + 1))}
                  className="px-2.5 py-1.5 text-[9px] font-black uppercase rounded-lg border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950 disabled:opacity-40 transition-all"
                >
                  Próxima ►
                </button>
              </div>
            </div>
          )}

          {/* Warning pattern insight banner */}
          <div className="p-4 bg-amber-500/[0.04] border border-amber-500/10 rounded-2xl text-xs text-amber-800 dark:text-amber-400 font-sans leading-relaxed flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div className="space-y-1">
              <p className="font-bold uppercase tracking-wider text-[10px]">
                Insight Comercial de Prevenção de Perdas & Decisão:
              </p>
              <p className="text-slate-600 dark:text-slate-350">
                {worst30DaysStats.mostFrequentWorstWeekday 
                  ? `Os registros mostram que as maiores baixas históricas de receita ocorrem frequentemente às ${worst30DaysStats.mostFrequentWorstWeekday}s. Para blindar esses dias fracos, recomendamos programar ofertas relâmpago, cupons exclusivos com validade curta de 24h e disparos direcionados para clientes inativos usando seu CRM Biobel no dia anterior.` 
                  : "Muitos dos dias listados acima estão com faturamento muito abaixo da média devido a quedas sazonais ou operacionais. Considere criar campanhas exclusivas ou bonificações agressivas para consultoras nesses dias lentos."
                }
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 📉 DETALHAMENTO: AS 3 PIORES MANHÃS E AS 3 PIORES TARDES */}
      <div className="bg-white dark:bg-slate-900 rounded-[36px] border border-slate-150 dark:border-slate-800 shadow-xs overflow-hidden text-left relative group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-amber-500 pointer-events-none">
          <Clock size={160} />
        </div>

        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
              <Clock size={12} className="animate-pulse text-amber-500" />
              Gargalos por Período do Dia (Média de Atendimentos & Valor)
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              As 3 Piores Manhãs & As 3 Piores Tardes 📊
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Análise média do desempenho matutino (antes das 12h) e vespertino (a partir das 12h) por dia de semana.
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* COL 1: AS 3 PIORES MANHÃS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 font-sans">
              <span className="p-2.5 bg-amber-500/10 dark:bg-amber-950/30 text-amber-600 dark:text-amber-450 rounded-xl">
                <Clock size={18} />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  ☀️ As 3 Piores Manhãs (Turno Matutino)
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  Dias com menor média de faturamento antes do meio-dia
                </p>
              </div>
            </div>

            <div className="space-y-3 font-sans">
              {worstMorningsAndAfternoons.worstMornings.map((d, index) => (
                <div 
                  key={d.weekdayName}
                  className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/60 p-4 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center font-mono font-black text-xs w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {index + 1}º
                    </span>
                    <div>
                      <p className="text-xs font-black text-slate-805 dark:text-slate-205 uppercase">
                        {d.weekdayName}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                        Média de {d.avgCount.toFixed(1)} {d.avgCount === 1 ? 'atendimento' : 'atendimentos'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 dark:text-white font-mono">
                      {formatCurrency(d.avgRevenue)}
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">
                      por manhã
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COL 2: AS 3 PIORES TARDES */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 font-sans">
              <span className="p-2.5 bg-indigo-500/10 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-450 rounded-xl">
                <Clock size={18} />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  🌤️ As 3 Piores Tardes (Turno Vespertino)
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  Dias com menor média de faturamento pós meio-dia
                </p>
              </div>
            </div>

            <div className="space-y-3 font-sans">
              {worstMorningsAndAfternoons.worstAfternoons.map((d, index) => (
                <div 
                  key={d.weekdayName}
                  className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/60 p-4 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center font-mono font-black text-xs w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-450 border border-indigo-550/20">
                      {index + 1}º
                    </span>
                    <div>
                      <p className="text-xs font-black text-slate-850 dark:text-slate-205 uppercase">
                        {d.weekdayName}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                        Média de {d.avgCount.toFixed(1)} {d.avgCount === 1 ? 'atendimento' : 'atendimentos'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 dark:text-white font-mono">
                      {formatCurrency(d.avgRevenue)}
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">
                      por tarde
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actionable insight card */}
        <div className="mx-6 md:mx-8 mb-6 md:mb-8 p-4 bg-amber-500/[0.04] border border-amber-500/10 rounded-2xl text-xs text-amber-800 dark:text-amber-400 font-sans leading-relaxed flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div className="space-y-1">
            <p className="font-bold uppercase tracking-wider text-[10px]">
              Estratégia de Equilíbrio Comercial Matutino/Vespertino:
            </p>
            <p className="text-slate-600 dark:text-slate-350">
              Para as manhãs com menor faturamento (por exemplo, {worstMorningsAndAfternoons.worstMornings[0]?.weekdayName || 'segunda-feira'}), lance campanhas promocionais de "Happy Hour Matinal" com mimos e descontos nas faturas até 12h. Para as tardes lentas, faça pacotes combinados e ofertas relâmpago exclusivas para agendamentos rápidos de última hora.
            </p>
          </div>
        </div>
      </div>

      {/* ⚠️ CORE GRID OF BOTTLENECK DIAGNOSTICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* CARD 1: PIOR DIA DA SEMANA */}
        <div className="bg-white dark:bg-slate-900 p-6 border border-slate-100 dark:border-slate-800 rounded-[32px] shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="p-3 bg-red-500/10 dark:bg-red-950/30 text-red-500 dark:text-red-400 rounded-2xl">
                <Calendar size={20} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Pior Dia da Semana</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                {weekdayStats.worstByTotal ? weekdayStats.worstByTotal.name : 'N/A'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Dia da semana com o menor volume de faturamento acumulado. Geralmente indica tráfego de clientes reduzido ou falta de engajamento promocional.
              </p>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-end border-b border-slate-50 dark:border-slate-850 pb-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">Faturamento total</span>
                <span className="text-sm font-black font-mono text-red-500 dark:text-red-400 leading-none">
                  {weekdayStats.worstByTotal ? formatCurrency(weekdayStats.worstByTotal.total) : 'R$ 0,00'}
                </span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">Qtd de atendimentos</span>
                <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 leading-none">
                  {weekdayStats.worstByTotal ? `${weekdayStats.worstByTotal.count} vendas` : '0 vendas'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/10 rounded-2xl">
            <h4 className="text-[10px] font-black text-amber-800 dark:text-amber-450 uppercase tracking-widest flex items-center gap-1 mb-1 font-sans">
              <Sparkles size={11} className="shrink-0" /> Ação Recomendada
            </h4>
            <p className="text-[10.5px] font-medium leading-relaxed text-amber-700/90 dark:text-amber-400">
              Faça campanhas exclusivas ou mimos em dobro neste dia (ex: "Terça do Autocuidado" com brindes especiais em faturas acima de R$100).
            </p>
          </div>
        </div>

        {/* CARD 2: PIOR TURNO DE VENDA */}
        <div className="bg-white dark:bg-slate-900 p-6 border border-slate-100 dark:border-slate-800 rounded-[32px] shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="p-3 bg-indigo-500/10 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 rounded-2xl">
                <Clock size={20} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Pior Turno Comercial</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                {shiftStats.worst ? shiftStats.worst.name.split(' (')[0] : 'N/A'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Análise das faixas de horário com o menor giro de vendas. Indica ociosidade ou falta de ações de conversão em horários específicos.
              </p>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-end border-b border-slate-50 dark:border-slate-850 pb-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">Total no turno</span>
                <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 leading-none">
                  {shiftStats.worst ? formatCurrency(shiftStats.worst.total) : 'R$ 0,00'}
                </span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">Ticket médio do turno</span>
                <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 leading-none">
                  {shiftStats.worst ? formatCurrency(shiftStats.worst.avgTicket) : 'R$ 0,00'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/10 rounded-2xl">
            <h4 className="text-[10px] font-black text-indigo-800 dark:text-indigo-450 uppercase tracking-widest flex items-center gap-1 mb-1 font-sans">
              <Sparkles size={11} className="shrink-0" /> Ação Recomendada
            </h4>
            <p className="text-[10.5px] font-medium leading-relaxed text-indigo-700/90 dark:text-indigo-400">
              {shiftStats.worst?.id === 'manha' 
                ? 'Estimule o disparo de mensagens para clientes nas primeiras horas do dia (9h às 10h30) com agendamentos ou mimos matinais.'
                : shiftStats.worst?.id === 'almoco'
                ? 'Aproveite o funcionamento ininterrupto ao meio-dia para lançar campanhas rápidas direcionadas a profissionais do comércio local.'
                : 'Crie ofertas relâmpago de fim de tarde (16h às 17h30) para atrair clientes em trânsito no final do expediente.'}
            </p>
          </div>
        </div>

        {/* CARD 3: PIOR TICKET MÉDIO (POR VENDEDORA) */}
        {/* Note that active sellers list excludes partner Bibi who only worked 1 day */}
        <div className="bg-white dark:bg-slate-900 p-6 border border-slate-100 dark:border-slate-800 rounded-[32px] shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="p-3 bg-amber-500/10 dark:bg-amber-950/30 text-amber-500 dark:text-amber-450 rounded-2xl">
                <ShoppingBag size={20} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Pior Ticket Médio</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                {sellerStats.worstTicket ? sellerStats.worstTicket.name : 'N/A'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Colaboradora da equipe que registra o menor valor médio por transação. Mostra oportunidade de treinamento em vendas adicionais (cross-selling). (Sócia e vendedoras eventuais de 1 dia excluídas).
              </p>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-end border-b border-slate-50 dark:border-slate-850 pb-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">Ticket médio registrado</span>
                <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-450 leading-none">
                  {sellerStats.worstTicket ? formatCurrency(sellerStats.worstTicket.avgTicket) : 'R$ 0,00'}
                </span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">Média global da loja</span>
                <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-none">
                  {formatCurrency(averageTicketGlobal)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/10 rounded-2xl">
            <h4 className="text-[10px] font-black text-amber-800 dark:text-amber-450 uppercase tracking-widest flex items-center gap-1 mb-1 font-sans">
              <Sparkles size={11} className="shrink-0" /> Ação Recomendada
            </h4>
            <p className="text-[10.5px] font-medium leading-relaxed text-amber-700/90 dark:text-amber-450">
              Ofereça treinamento rápido de produtos casados. Ensine-a a motivar o cliente a adicionar pelo menos um produto menor ou acessório no checkout.
            </p>
          </div>
        </div>

      </div>

      {/* 📊 DEEP DIVE ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN - PIORES DIAS GERAIS & LISTINGS */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <TrendingDown size={20} className="text-rose-500 shrink-0" />
              Top 5 Dias mais Críticos de Faturamento
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
              Veja as datas exatas que registraram os menores faturamentos. Se houver clima ou eventos cadastrados para o dia, nós os associamos para ajudar a diagnosticar o impacto ambiental e comercial.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {worstDays.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 italic">
                Nenhum faturamento registrado para mensurar os piores dias.
              </div>
            ) : (
              worstDays.map((item, index) => {
                const obs = weatherObservations[item.dateStr];
                const weatherInfo = obs ? weathersMap[obs.condition] : null;
                const formattedDate = item.dateStr.split('-').reverse().join('/');
                const parsedDate = new Date(item.dateStr + "T12:00:00");
                const weekdayStr = parsedDate.toLocaleDateString('pt-BR', { weekday: 'long' });
                
                // Event checking
                const dayEvent = eventsByDate[item.dateStr];

                return (
                  <div 
                    key={item.dateStr} 
                    className="p-4 bg-slate-50/50 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800/80 hover:border-red-200/50 transition-all rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-black flex items-center justify-center font-mono">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">{formattedDate}</span>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 capitalize">({weekdayStr})</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Faturamento de apenas <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(item.total)}</strong> em <strong className="font-mono">{item.count} venda(s)</strong>.
                        </p>
                        
                        {/* Day Event tag */}
                        {dayEvent && (
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-550/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-extrabold uppercase tracking-wide border border-indigo-200/40">
                            <span>🎉</span> {dayEvent.name} (Dia com Evento)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1 shrink-0">
                      {/* Associated weather */}
                      {weatherInfo ? (
                        <div 
                          className={`px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider font-extrabold flex items-center gap-1 ${weatherInfo.bg} cursor-help border border-current/10`}
                          title={`Clima do dia: ${weatherInfo.label}\nObservação: ${obs.notes}`}
                        >
                          <span>{weatherInfo.icon}</span>
                          <span>{weatherInfo.label}</span>
                        </div>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-350 dark:text-slate-600 italic">Sem clima cadastrado</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* COACHING INFO */}
          <div className="p-5 bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/10 rounded-2xl flex gap-3.5 items-start">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-900/10 text-blue-600 rounded-xl shrink-0">
              <Info size={16} />
            </div>
            <div className="space-y-1">
              <h5 className="font-sans font-black text-blue-800 dark:text-blue-450 uppercase text-[10px] tracking-wider leading-none">Fórmula de Recuperação de Dias Baixos</h5>
              <p className="text-[11px] text-blue-700/80 dark:text-blue-400 leading-relaxed">
                Quando perceber no calendário que o faturamento de determinado dia do mês está caindo abaixo de sua média mínima sustentável, mande o gatilho "Disparador de Emergência" (um cupom Pix de curta validade, ex: 10% OFF apenas até as 18h) nos canais de transmissão.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - SALESWOMEN (EQUIPE) RANKING & PERFORMANCE DE TICKET */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-1">
            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Users size={20} className="text-amber-500 shrink-0" />
              Equipe: Faturamento de Vendedoras (Atenção)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
              Identifique as consultoras que estão mais distantes das metas de faturamento individuais neste período para prestar acompanhamento customizado. (Exclui Bibi por ser sócia e consultoras com apenas 1 dia de venda).
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {sellerStats.all.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 italic">
                Nenhum dado de equipe disponível para o período selecionado.
              </div>
            ) : (
              [...sellerStats.all].sort((a,b) => a.dailyAvg - b.dailyAvg).map((sel, idx) => {
                const maxAvg = Math.max(...sellerStats.all.map(it => it.dailyAvg), 1);
                const percent = Math.min((sel.dailyAvg / maxAvg) * 100, 100);

                return (
                  <div key={sel.name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 text-[10px] font-black flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span className="font-black text-slate-700 dark:text-slate-300 uppercase truncate max-w-[130px]">{sel.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-[10px] font-bold text-slate-400">({sel.count} vend. em {sel.dates.size} dias)</span>
                          <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(sel.total)}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-450 dark:text-slate-500 font-mono uppercase tracking-wider">
                          Média: {formatCurrency(sel.dailyAvg)} / dia ativo
                        </span>
                      </div>
                    </div>

                    {/* Beautiful Progress Bar */}
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 0 
                            ? "bg-gradient-to-r from-red-500 to-rose-500 animate-pulse" 
                            : idx === 1 
                              ? "bg-gradient-to-r from-amber-500 to-orange-500" 
                              : "bg-gradient-to-r from-blue-500 to-indigo-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/10 rounded-2xl space-y-1">
            <h5 className="font-sans font-black text-amber-800 dark:text-amber-450 uppercase text-[10px] tracking-wider leading-none">Feedback 1-on-1 Construtivo</h5>
            <p className="text-[10.5px] text-amber-700/80 dark:text-amber-400 leading-relaxed font-sans">
              <strong>Como apoiar {sellerStats.worstSales?.name || 'sua equipe'}?</strong> Não fale sobre "falta de vendas", foque em "processo". Sente-se junto na próxima venda, analise sua abordagem ao oferecer produtos adicionais e ajude-a a encontrar confiança em argumentos de valor.
            </p>
          </div>
        </div>

      </div>

      {/* 🎉 PARTNERSHIPS & SPECIAL EVENTS ENGAGEMENT REPORT */}
      {/* Specifically registers company events (such as 05/06) which attracted clients */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-500 shrink-0" />
            Impacto de Eventos Especiais & Parcerias Comerciais
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
            Acompanhe o faturamento e a atração de clientes nos dias com ações diferenciadas (ex: coquetéis parceiros, campanhas presenciais). Isso ajuda a medir o retorno dessas colaborações e comprova como atraiu as clientes!
          </p>
        </div>

        {eventDaysPerformance.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic bg-slate-50/50 dark:bg-slate-850/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            Nenhum evento customizado ativo ou cadastrado para o período selecionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventDaysPerformance.map((ev) => {
              const formattedDate = ev.date.split('-').reverse().join('/');
              const parsedDate = new Date(ev.date + "T12:00:00");
              const weekdayStr = parsedDate.toLocaleDateString('pt-BR', { weekday: 'long' });
              
              const weatherInfo = ev.weatherObs ? weathersMap[ev.weatherObs.condition] : null;

              return (
                <div 
                  key={ev.id} 
                  className="p-5 bg-gradient-to-br from-indigo-50/45 to-slate-50/15 dark:from-indigo-950/20 dark:to-slate-900/50 border border-indigo-100/60 dark:border-indigo-950/40 rounded-3xl space-y-4 shadow-xs relative overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-all flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none text-indigo-500 group-hover:scale-110 transition-transform">
                    <Sparkles size={64} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[9px] font-black uppercase tracking-wider">
                        📅 {formattedDate}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 capitalize">({weekdayStr})</span>
                    </div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{ev.name}</h4>
                    {ev.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-sans">
                        {ev.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-indigo-100/30 dark:border-slate-800/60 font-mono">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faturamento</span>
                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(ev.totalRevenue)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atendimentos</span>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">{ev.salesCount} clientes</p>
                      </div>
                      <div className="space-y-0.5 col-span-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ticket Médio no Período</span>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-450">{formatCurrency(ev.avgTicket)}</p>
                      </div>
                    </div>

                    {/* Weather on event day */}
                    {weatherInfo ? (
                      <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850/80 text-[10px]">
                        <span className="text-xs">{weatherInfo.icon}</span>
                        <div className="leading-tight text-slate-600 dark:text-slate-400">
                          <strong className="text-slate-700 dark:text-slate-300">{weatherInfo.label}</strong>
                          {ev.weatherObs?.notes && <span className="block text-[8.5px] text-slate-400 mt-0.5">Obs: {ev.weatherObs.notes}</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[9px] font-bold text-slate-350 dark:text-slate-600 italic">
                        Sem observação de clima registrada.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 📊 CHART COMPARISON: WORST WEEK VISUALS */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <TrendingDown size={20} className="text-red-500" />
              Análise Semanal de Oscilação de Ganhos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
              Identifique qual semana do calendário registra maior depressão de lucros para orientar reforços no estoque e no time de marketing.
            </p>
          </div>

          {weeklyStats.worst && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-900/40 rounded-2xl flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0 animate-ping" />
              <div className="text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400">Pior Semana: </span>
                <strong className="font-black text-rose-600 dark:text-rose-400 uppercase">{weeklyStats.worst.name.split(' (')[0]}</strong>
                <span className="font-bold text-slate-500 dark:text-slate-400 font-mono font-black italic"> ({formatCurrency(weeklyStats.worst.total)})</span>
              </div>
            </div>
          )}
        </div>

        {/* Recharts Week bar comparisons */}
        <div className="h-[260px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyStats.all}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 9, fontWeight: 900, fill: '#64748B' }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} 
                tickFormatter={(value) => `R$ ${value}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(239, 68, 68, 0.04)' }}
                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
              />
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {weeklyStats.all.map((entry, index) => {
                  const isWorst = weeklyStats.worst && entry.index === weeklyStats.worst.index;
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={isWorst ? '#EF4444' : '#3B82F6'} 
                      opacity={isWorst ? 1.0 : 0.6}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* 🚀 ADVANCED CRM & OPERATIONS SANDBOX */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-12 mt-12 space-y-12">
        <div className="space-y-1.5 text-center max-w-3xl mx-auto">
          <span className="px-4 py-1.5 rounded-full bg-indigo-550/10 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest leading-none">
            ⚡ Decisões em Tempo Real
          </span>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Ferramentas Avançadas de Crescimento
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-sans">
            Coloque seus diagnósticos em ação com os três motores de alavancagem comercial. Dispare campanhas personalizadas, equilibre as escalas por tráfego de bico e projete seus resultados futuros.
          </p>
        </div>

        {/* SECTION 1: WHATSAPP ACTIVE CRM MESSAGES */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-805 rounded-[40px] p-8 shadow-sm space-y-6" id="crm-active-panel">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1 flex-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <MessageCircle size={20} className="text-emerald-500 animate-pulse" />
                1. Automação de Mensagens Ativas via WhatsApp CRM
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                Filtre grupos específicos de clientes frias, devedores ou aniversariantes, edite o texto do script e faça envios automáticos e ativos em um clique.
              </p>
            </div>
            <div className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3.5 py-1.5 rounded-full font-black uppercase tracking-widest border border-emerald-500/10">
              Contatos Identificados: {matchedCrmContacts.length}
            </div>
          </div>

          {/* Selector pills for campaign types */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { type: 'birthdays', label: 'Aniversariantes', desc: 'Ativar aniversariantes do mês', color: 'border-rose-200 hover:border-rose-450 text-rose-600 bg-rose-500/5' },
              { type: 'inactive', label: 'Inativos (>45 dias)', desc: 'Reativar clientes sumidos', color: 'border-amber-200 hover:border-amber-450 text-amber-600 bg-amber-500/5' },
              { type: 'pending', label: 'Fiado / Pendente', desc: 'Lembretes de contas a pagar', color: 'border-red-200 hover:border-red-450 text-red-600 bg-red-500/5' },
              { type: 'vips', label: 'Clientes VIPs', desc: 'Oferecer novidades exclusivas', color: 'border-purple-200 hover:border-purple-450 text-purple-600 bg-purple-500/5' },
              { type: 'followup', label: 'Pós-Venda (20 dias)', desc: 'Colher avaliações de compras', color: 'border-blue-200 hover:border-blue-450 text-blue-600 bg-blue-500/5' },
            ].map(pill => {
              const active = activeCampaignType === pill.type;
              return (
                <button
                  key={pill.type}
                  onClick={() => setActiveCampaignType(pill.type as any)}
                  className={`p-3.5 border rounded-2xl text-left transition-all relative flex flex-col justify-between select-none cursor-pointer min-h-[95px] ${
                    active 
                      ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200" 
                      : `border-slate-150 text-slate-700 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-850/30`
                  }`}
                >
                  <span className="text-xs font-black uppercase leading-tight">{pill.label}</span>
                  <span className="text-[9px] text-slate-450 font-semibold leading-normal mt-1 block">{pill.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Template message editor and Live Client listing */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Template Editor */}
            <div className="lg:col-span-5 space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block font-sans">
                    Template de Roteiro Recorrente
                  </label>
                  <span className="text-[8.5px] font-bold text-slate-400 font-mono">Suporta [nome], [valor]</span>
                </div>
                <textarea
                  value={campaignTemplates[activeCampaignType]}
                  onChange={(e) => {
                    const txt = e.target.value;
                    setCampaignTemplates(prev => ({ ...prev, [activeCampaignType]: txt }));
                  }}
                  rows={6}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-semibold leading-relaxed focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 outline-none antialiased text-slate-700 dark:text-slate-300"
                  placeholder="Digita ou formata o modelo de mensagem..."
                />
              </div>

              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-[10.5px] leading-relaxed rounded-2xl font-sans">
                💡 <strong>Por que mensagens ativas importam?</strong> Vender para uma cliente da sua lista custa até 5x menos do que captar novos compradores na internet. Fazer de 2 a 3 contatos de relacionamento semanalmente blinda seu caixa.
              </div>
            </div>

            {/* Live Client search and actions */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2 border border-slate-200 dark:border-slate-800 rounded-3xl">
                  <input
                    type="text"
                    value={crmSearchQuery}
                    onChange={(e) => setCrmSearchQuery(e.target.value)}
                    placeholder="Filtrar clientes por nome ou telefone..."
                    className="w-full bg-transparent pl-3 py-1.5 text-xs font-bold outline-none focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 text-slate-700 dark:text-slate-300"
                  />
                  {crmSearchQuery && (
                    <button 
                      onClick={() => setCrmSearchQuery('')} 
                      className="px-2.5 text-slate-400 hover:text-slate-600 text-xs font-black shrink-0 cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Listing region */}
                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                  {matchedCrmContacts.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-450 italic bg-slate-50/50 dark:bg-slate-850/20 border rounded-2xl">
                      Nenhuma cliente com esses critérios foi identificada no bando de dados selecionado.
                    </div>
                  ) : (
                    matchedCrmContacts.map(contact => {
                      const cleanPhone = (contact.phone || "").replace(/\D/g, '');
                      const formattedMsg = getSubstitutedMessage(campaignTemplates[activeCampaignType], contact.name, contact.placeholderValue);
                      const waUrl = cleanPhone ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(formattedMsg)}` : '#';
                      const isCopied = crmCopiedContactId === contact.id;

                      return (
                        <div 
                          key={contact.id} 
                          className="p-3 bg-slate-50/50 dark:bg-slate-850/50 border border-slate-150 dark:border-slate-800/80 hover:border-emerald-250 transition-all rounded-xl flex items-center justify-between gap-3 font-sans"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase text-slate-850 dark:text-slate-100 truncate block max-w-[140px] sm:max-w-[200px]">
                                {contact.name}
                              </span>
                              <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 rounded-md font-extrabold uppercase">
                                {contact.phone ? contact.phone : "Sem telefone"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{contact.reason}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Copy button */}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(formattedMsg);
                                setCrmCopiedContactId(contact.id);
                                setTimeout(() => setCrmCopiedContactId(null), 2500);
                              }}
                              className={`p-1.5 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                                isCopied 
                                  ? "text-emerald-500 border-emerald-500 bg-emerald-50/20" 
                                  : "text-slate-500 border-slate-200 dark:border-slate-800"
                              }`}
                              title="Copiar texto substituído"
                            >
                              {isCopied ? "Copiado!" : "Copiar"}
                            </button>

                            {/* Disparar WhatsApp button */}
                            {contact.phone ? (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition flex items-center justify-center cursor-pointer"
                                title="Fazer envio ativo via WhatsApp"
                              >
                                <Send size={12} />
                              </a>
                            ) : (
                              <button 
                                disabled
                                className="p-1.5 bg-slate-200 text-slate-400 rounded-lg cursor-not-allowed opacity-50"
                                title="Cliente sem telefone cadastrado"
                              >
                                <Send size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Preview block of first match */}
              {matchedCrmContacts.length > 0 && (
                <div className="p-4 bg-slate-50/80 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1.5">Visualização de Amostra de Mensagem:</p>
                  <p className="text-[10.5px] font-semibold text-slate-500 italic leading-relaxed break-words antialiased">
                    "{getSubstitutedMessage(campaignTemplates[activeCampaignType], matchedCrmContacts[0].name, matchedCrmContacts[0].placeholderValue)}"
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* SECTION 2: SMART STAFFING BASED ON PEAK HOURS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-805 rounded-[40px] p-8 shadow-sm space-y-6" id="smart-shifts-panel">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Shuffle size={20} className="text-indigo-500" />
                2. Escalas Inteligentes Baseadas em Horários de Pico
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                Seu caixa histórico aponta fluxo crítico às sextas e sábados. Monte a escala de consultoras abaixo e veja o Índice de Cobertura atualizar em tempo real!
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Índice de Cobertura</span>
                <p className={`text-base font-black font-mono leading-none mt-0.5 ${
                  coverageAnalysis.averageScore >= 85 
                    ? "text-emerald-500" 
                    : coverageAnalysis.averageScore >= 60 
                      ? "text-amber-500" 
                      : "text-red-500"
                }`}>
                  {coverageAnalysis.averageScore}% - {
                    coverageAnalysis.averageScore >= 85 
                      ? "Excelente" 
                      : coverageAnalysis.averageScore >= 60 
                        ? "Apropriado" 
                        : "Gargalo Crítico"
                  }
                </p>
              </div>
              <div className={`w-3.5 h-3.5 rounded-full ${
                coverageAnalysis.averageScore >= 85 
                  ? "bg-emerald-500" 
                  : coverageAnalysis.averageScore >= 60 
                    ? "bg-amber-500" 
                    : "bg-red-500 text-white"
              } animate-pulse`} />
            </div>
          </div>

          {/* Weekday interactive layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            {coverageAnalysis.results.map(day => {
              const borderStyles = day.status === 'no-staff' 
                ? 'border-red-200 bg-red-50/5 hover:border-red-300' 
                : day.status === 'understaffed'
                  ? 'border-amber-200 bg-amber-50/5 hover:border-amber-300'
                  : 'border-slate-150 hover:border-slate-350 dark:border-slate-800';

              return (
                <div 
                  key={day.key}
                  className={`border p-4 rounded-3xl flex flex-col justify-between space-y-4 transition-all hover:shadow-xs min-h-[210px] ${borderStyles}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">{day.label}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${
                        day.rushLevel === 'Crítico' 
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/10' 
                          : day.rushLevel === 'Alto'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : day.rushLevel === 'Médio'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {day.rushLevel}
                      </span>
                    </div>

                    <div className="space-y-0.5 font-sans">
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase">Rush de Faturamento:</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{day.rushHour}</p>
                    </div>

                    {/* Checkbox-pill staff allocator */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase block mb-1">Escalar Consultoras:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(staff && staff.length > 0 ? staff.map(s => s.name.toUpperCase()) : ['ALESSANDRA', 'GABRIELA CLT', 'DAY', 'BIBI']).map(name => {
                          const active = (smartShifts[day.key] || []).includes(name);
                          return (
                            <button
                              key={name}
                              onClick={() => handleToggleShiftMember(day.key, name)}
                              className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                                active
                                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                              }`}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Status alert line */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-850/60 font-sans">
                    <p className={`text-[9.5px] font-semibold leading-relaxed ${
                      day.status === 'no-staff'
                        ? 'text-red-500'
                        : day.status === 'understaffed'
                          ? 'text-amber-500'
                          : day.status === 'overstaffed'
                            ? 'text-purple-500'
                            : 'text-emerald-500'
                    }`}>
                      {day.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-amber-500/5 border border-amber-500/10 text-amber-800 dark:text-amber-400 text-xs rounded-2xl leading-relaxed flex items-start gap-2 font-sans">
            {(() => {
              const names = staff && staff.length > 0 ? staff.map(s => s.name.toUpperCase()) : ['ALESSANDRA', 'GABRIELA CLT', 'DAY', 'BIBI'];
              const p1 = names[1] || names[0] || 'GABRIELA CLT';
              const p2 = names[2] || names[0] || 'DAY';
              const p3 = names[3] || names[0] || 'BIBI';
              return (
                <span>
                  💡 <strong>Roteiro Tático de Escala</strong>: Mantenha a <strong>{p2}</strong> focalizada na Terça e Quarta, pois o fluxo é baixo. Reforce a sexta e o sábado com <strong>{p3}</strong> e <strong>{p1}</strong> juntas. Isso eleva seu faturamento pelo aproveitamento integral de tráfego, mantendo o custo fixo de horas extras o mais baixo possível!
                </span>
              );
            })()}
          </div>
        </div>

        {/* SECTION 3: TREND-BASED REVENUE FORECASTING */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-805 rounded-[40px] p-8 shadow-sm space-y-6" id="forecasting-panel">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Activity size={20} className="text-blue-500 animate-pulse" />
                3. Previsão de Faturamento Baseada em Tendências (Forecasting)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                Simule cenários e objetivos futuros ajustando os indicadores de vendas. Nossa IA projeta os faturamentos dos próximos 90 dias baseando-se em equações de tendências.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 font-mono">
              <div className="text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Aceleração Simulada</span>
                <p className="text-base font-black text-emerald-500 leading-none mt-0.5">
                  +{forecastingData.totalGrowthPercent}% faturamento
                </p>
              </div>
            </div>
          </div>

          {/* Chart & Sliders grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Visual Sliders block */}
            <div className="lg:col-span-5 space-y-6">
              <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest font-sans">
                Ajustar Indicadores Comercial & Marketing:
              </p>

              <div className="space-y-4">
                {/* Slider 1: Ticket Medio */}
                <div className="space-y-1.5 font-sans">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Meta de Ticket Médio (R$)</span>
                    <span className="font-black text-indigo-600">{formatCurrency(ticketSlider)}</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="350"
                    value={ticketSlider}
                    onChange={(e) => setTicketSlider(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                  />
                  <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase">
                    <span>Mínimo (R$ 150)</span>
                    <span>Meta Atual Lucrativa (R$ 350)</span>
                  </div>
                </div>

                {/* Slider 2: PA (Items average) */}
                <div className="space-y-1.5 font-sans">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Peças por Atendimento (P.A. Alvo)</span>
                    <span className="font-black text-indigo-600">{paSlider.toFixed(1)} itens/venda</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.1"
                    value={paSlider}
                    onChange={(e) => setPaSlider(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                  />
                  <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase">
                    <span>1.0 itens</span>
                    <span>Meta Alta (3.0 itens)</span>
                  </div>
                </div>

                {/* Slider 3: CRM Retention customer returned */}
                <div className="space-y-1.5 font-sans">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Retorno/Recompra de Clientes Sumidos</span>
                    <span className="font-black text-indigo-600">+{retentionSlider}% Recompra</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={retentionSlider}
                    onChange={(e) => setRetentionSlider(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                  />
                  <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase">
                    <span>Cenário Comum (+0%)</span>
                    <span>Captação CRM alta (+40%)</span>
                  </div>
                </div>

                {/* Slider 4: Marketing Multiplier scale */}
                <div className="space-y-1.5 font-sans">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Alcançar Novas Clientes / Campanhas</span>
                    <span className="font-black text-indigo-600">+{marketingSlider}% Novos Leads</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={marketingSlider}
                    onChange={(e) => setMarketingSlider(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                  />
                  <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase">
                    <span>Faturamento Estável (+0%)</span>
                    <span>Meta arrojada (+50%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Forecast Chart block */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest font-sans">
                Curva de Tendência Histórica & Projeção Simulada (R$):
              </span>

              {/* Chart */}
              <div className="h-[220px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastingData.historyAndProjections}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 9, fontWeight: 900, fill: '#64748B' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} 
                      tickFormatter={(value) => `R$ ${Math.round(value/1000)}k`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(59, 130, 246, 0.04)' }}
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                    />
                    <Bar dataKey="faturamento" radius={[8, 8, 0, 0]}>
                      {forecastingData.historyAndProjections.map((entry, index) => {
                        const isProj = entry.type === 'proj';
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={isProj ? '#10B981' : '#3B82F6'} 
                            opacity={isProj ? 0.95 : 0.65}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Forecast Insight Summary box */}
              <div className="p-4 bg-slate-50/80 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl flex items-start gap-3.5">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0">
                  <Target size={18} />
                </div>
                <div className="space-y-1 font-sans">
                  <h5 className="font-extrabold uppercase text-[10px] text-slate-450 tracking-wider leading-none">Cenário Projetado M+3:</h5>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Faturamento estimado de <strong className="text-emerald-500 font-mono font-black">{formatCurrency(forecastingData.projectedMonth3)}</strong> no faturamento composto do 3º mês simulado!
                  </p>
                  <p className="text-[10.5px] font-medium text-slate-500 leading-relaxed mt-1">
                    Para consolidar este faturamento, oriente a equipe a elevar o P.A. para <strong className="text-indigo-600">{paSlider.toFixed(1)} itens</strong> via combos decorados de checkout, e garanta que sua taxa de retenção interna cresça <strong className="text-indigo-600">{retentionSlider}%</strong>.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};
