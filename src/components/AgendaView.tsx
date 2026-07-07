import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit2, 
  AlertCircle, 
  X, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Info
} from 'lucide-react';

export interface AgendaEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  description: string;
  category?: 'evento' | 'reuniao' | 'externo' | 'outro';
}

interface AgendaViewProps {
  agendaEvents: AgendaEvent[];
  setAgendaEvents: React.Dispatch<React.SetStateAction<AgendaEvent[]>>;
  addNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AgendaView = ({
  agendaEvents,
  setAgendaEvents,
  addNotification
}: AgendaViewProps) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'evento' | 'reuniao' | 'externo' | 'outro'>('evento');

  // Month navigation states for calendar display
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    if (offsetDays !== 0) {
      d.setDate(d.getDate() + offsetDays);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(0);
  const tomorrowStr = getLocalDateString(1);

  const resetForm = () => {
    setTitle('');
    setDate('');
    setTime('');
    setDescription('');
    setCategory('evento');
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) {
      addNotification('Por favor, preencha o título e a data do evento.', 'error');
      return;
    }

    const newEvent: AgendaEvent = {
      id: `ev-${Date.now()}`,
      title: title.trim(),
      date,
      time: time || undefined,
      description: description.trim(),
      category
    };

    setAgendaEvents(prev => [newEvent, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    addNotification('Evento adicionado à agenda com sucesso!', 'success');
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleStartEdit = (event: AgendaEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDate(event.date);
    setTime(event.time || '');
    setDescription(event.description);
    setCategory(event.category || 'evento');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    if (!title || !date) {
      addNotification('Por favor, preencha o título e a data do evento.', 'error');
      return;
    }

    setAgendaEvents(prev => prev.map(ev => 
      ev.id === editingEvent.id 
        ? { ...ev, title: title.trim(), date, time: time || undefined, description: description.trim(), category }
        : ev
    ));

    addNotification('Evento atualizado com sucesso!', 'success');
    setEditingEvent(null);
    resetForm();
  };

  const handleDeleteEvent = (id: string) => {
    if (window.confirm('Deseja realmente remover este evento da agenda?')) {
      setAgendaEvents(prev => prev.filter(ev => ev.id !== id));
      addNotification('Evento removido da agenda.', 'success');
    }
  };

  // Calendar rendering math
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayIndex(year, month);

    const days: Array<{ day: number; dateStr: string; isCurrentMonth: boolean }> = [];

    // Fill preceding empty slots
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevTotalDays = daysInMonth(prevYear, prevMonth);
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevTotalDays - i;
      const mStr = String(prevMonth + 1).padStart(2, '0');
      days.push({
        day: d,
        dateStr: `${prevYear}-${mStr}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      days.push({
        day: d,
        dateStr: `${year}-${mStr}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: true
      });
    }

    // Fill succeeding empty slots to make full grid rows
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const remainingSlots = 42 - days.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const mStr = String(nextMonth + 1).padStart(2, '0');
      days.push({
        day: d,
        dateStr: `${nextYear}-${mStr}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentMonthDate]);

  const changeMonth = (offset: number) => {
    const d = new Date(currentMonthDate);
    d.setMonth(d.getMonth() + offset);
    setCurrentMonthDate(d);
  };

  // Format date readable
  const formatReadableDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Get weekday name from date string
  const getWeekdayName = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      return days[d.getDay()];
    } catch {
      return '';
    }
  };

  // Group events by day to show in list
  const sortedEvents = useMemo(() => {
    return [...agendaEvents].sort((a, b) => a.date.localeCompare(b.date));
  }, [agendaEvents]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[32px] p-6 lg:p-8 text-white shadow-xl shadow-blue-500/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute left-1/3 bottom-0 translate-y-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-black tracking-widest uppercase">
              <Sparkles size={12} className="text-amber-300 animate-pulse" />
              Gestão de Eventos
            </div>
            <h1 className="text-3xl lg:text-4xl font-black uppercase tracking-tight">Agenda de Eventos</h1>
            <p className="text-blue-100 font-bold text-sm max-w-xl">
              Organize os eventos, reuniões e programações externas da loja. O sistema avisará automaticamente um dia antes e no dia do evento!
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="px-6 py-4 bg-white text-blue-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-50 transition-all shadow-lg flex items-center justify-center gap-2 shrink-0 self-start md:self-auto"
          >
            <Plus size={16} />
            Novo Evento
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar on Left (if desktop), Upcoming events on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Calendar Card (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Calendar size={18} className="text-blue-500" />
              Calendário Mensal
            </h2>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-2xl">
              <button 
                onClick={() => changeMonth(-1)}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all text-slate-500 dark:text-slate-400"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-black uppercase tracking-wider px-3 text-slate-700 dark:text-slate-300 min-w-[120px] text-center font-mono">
                {currentMonthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                onClick={() => changeMonth(1)}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all text-slate-500 dark:text-slate-400"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map(({ day, dateStr, isCurrentMonth }, idx) => {
              const dayEvents = agendaEvents.filter(e => e.date === dateStr);
              const isToday = dateStr === todayStr;
              const isTomorrow = dateStr === tomorrowStr;

              return (
                <div 
                  key={`${dateStr}-${idx}`}
                  className={`min-h-[70px] lg:min-h-[85px] p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                    isCurrentMonth 
                      ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' 
                      : 'bg-slate-50/50 dark:bg-slate-950/20 border-transparent text-slate-400 dark:text-slate-600'
                  } ${
                    isToday 
                      ? 'ring-2 ring-blue-500/80 bg-blue-50/10' 
                      : isTomorrow 
                        ? 'ring-2 ring-amber-500/50 bg-amber-50/10' 
                        : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-xs font-black font-mono leading-none ${
                      isToday 
                        ? 'bg-blue-600 text-white w-5 h-5 rounded-lg flex items-center justify-center -m-1 shadow-sm shadow-blue-500/20' 
                        : isTomorrow
                          ? 'bg-amber-500 text-white w-5 h-5 rounded-lg flex items-center justify-center -m-1 shadow-sm shadow-amber-500/20'
                          : isCurrentMonth
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-400'
                    }`}>
                      {day}
                    </span>
                    {(isToday || isTomorrow) && (
                      <span className={`text-[8px] font-black px-1 rounded tracking-tighter leading-normal ${
                        isToday ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {isToday ? 'HOJE' : 'AMANHÃ'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-2 flex-1 overflow-y-auto scrollbar-hide max-h-[45px]">
                    {dayEvents.map(e => {
                      let catColor = 'bg-blue-500';
                      if (e.category === 'reuniao') catColor = 'bg-purple-500';
                      else if (e.category === 'externo') catColor = 'bg-emerald-500';
                      else if (e.category === 'outro') catColor = 'bg-slate-500';

                      return (
                        <div 
                          key={e.id}
                          className="flex items-center gap-1 group relative cursor-pointer"
                          title={`${e.title} ${e.time ? `(${e.time})` : ''}`}
                          onClick={() => handleStartEdit(e)}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${catColor}`} />
                          <span className="text-[9px] font-bold truncate text-slate-600 dark:text-slate-400 max-w-full leading-tight">
                            {e.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* List of Events (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-full transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Clock size={18} className="text-indigo-500" />
              Lista de Programações
            </h2>
            <span className="text-[10px] font-mono font-black px-2.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
              Total: {agendaEvents.length}
            </span>
          </div>

          {/* Quick Warnings section */}
          {agendaEvents.some(e => e.date === todayStr || e.date === tomorrowStr) && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-left">
              <h3 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <AlertCircle size={14} className="text-amber-500 animate-bounce" />
                Alertas Próximos
              </h3>
              <div className="space-y-1.5">
                {agendaEvents.filter(e => e.date === todayStr || e.date === tomorrowStr).map(e => (
                  <p key={e.id} className="text-xs text-amber-700 dark:text-amber-300 font-bold">
                    • <span className="uppercase text-[10px] font-black bg-amber-200 dark:bg-amber-900 px-1 py-0.5 rounded mr-1">
                      {e.date === todayStr ? 'Hoje' : 'Amanhã'}
                    </span>
                    {e.title} {e.time ? `às ${e.time}` : ''}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[400px] lg:max-h-[500px]">
            {sortedEvents.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400">
                <Calendar size={48} className="text-slate-200 dark:text-slate-800 mb-3" />
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Agenda Vazia</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Nenhum evento agendado. Clique em "Novo Evento" para começar.</p>
              </div>
            ) : (
              sortedEvents.map(event => {
                const isToday = event.date === todayStr;
                const isTomorrow = event.date === tomorrowStr;

                let categoryLabel = 'Evento';
                let categoryColor = 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400';
                if (event.category === 'reuniao') {
                  categoryLabel = 'Reunião';
                  categoryColor = 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400';
                } else if (event.category === 'externo') {
                  categoryLabel = 'Externo';
                  categoryColor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400';
                } else if (event.category === 'outro') {
                  categoryLabel = 'Outro';
                  categoryColor = 'bg-slate-50 text-slate-600 dark:bg-slate-850 dark:text-slate-400';
                }

                return (
                  <div 
                    key={event.id}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      isToday 
                        ? 'border-blue-200 dark:border-blue-900 bg-blue-50/10 shadow-sm' 
                        : isTomorrow
                          ? 'border-amber-200 dark:border-amber-900 bg-amber-50/10 shadow-sm'
                          : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-850/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest ${categoryColor}`}>
                            {categoryLabel}
                          </span>
                          {isToday && (
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest bg-rose-600 text-white animate-pulse">
                              HOJE!
                            </span>
                          )}
                          {isTomorrow && (
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest bg-amber-500 text-white">
                              AMANHÃ
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                          {event.title}
                        </h3>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleStartEdit(event)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-all"
                          title="Editar"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all"
                          title="Remover"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Description & Details */}
                    {event.description && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 font-medium bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-800/50">
                        {event.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        {formatReadableDate(event.date)}
                      </span>
                      {event.time && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          {event.time}
                        </span>
                      )}
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span className="text-slate-400 lowercase italic">
                        {getWeekdayName(event.date)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {(isAddModalOpen || editingEvent) && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingEvent ? 'Editar Evento' : 'Novo Agendamento'}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                    {editingEvent ? 'Modifique os detalhes da programação' : 'Adicione uma nova programação à agenda'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingEvent(null);
                  }} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition-all text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={editingEvent ? handleSaveEdit : handleAddEvent} className="p-6 space-y-4 text-left">
                {/* Título */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Título do Evento *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Evento da Biobel Noite"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Data */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Data *
                    </label>
                    <input 
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Hora */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Hora (Opcional)
                    </label>
                    <input 
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Categoria / Tipo
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'evento', label: 'Evento', color: 'border-blue-300 dark:border-blue-900 text-blue-600 bg-blue-50/10' },
                      { id: 'reuniao', label: 'Reunião', color: 'border-purple-300 dark:border-purple-900 text-purple-600 bg-purple-50/10' },
                      { id: 'externo', label: 'Externo', color: 'border-emerald-300 dark:border-emerald-900 text-emerald-600 bg-emerald-50/10' },
                      { id: 'outro', label: 'Outro', color: 'border-slate-300 dark:border-slate-700 text-slate-600 bg-slate-50/10' },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id as any)}
                        className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase text-center border-2 transition-all cursor-pointer ${
                          category === cat.id 
                            ? `${cat.color} ring-2 ring-blue-500/40`
                            : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Descrição / Detalhes
                  </label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Evento Biobel e Ana Maria na pizzaria."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    rows={3}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingEvent(null);
                    }}
                    className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 rounded-2xl font-black uppercase text-xs tracking-widest transition-all cursor-pointer text-center"
                  >
                    {editingEvent ? 'Salvar Alterações' : 'Agendar Evento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
