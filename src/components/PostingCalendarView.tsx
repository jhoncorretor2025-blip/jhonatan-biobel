import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, ExternalLink, FolderOpen, Save, CheckCircle2, Clock3, Instagram, Link2, Download } from 'lucide-react';

type PostStatus = 'Pendente' | 'Publicado' | 'Adiado';
type PostItem = {
  id: string;
  date: string;
  time: string;
  type: string;
  title: string;
  notes: string;
  link: string;
  status: PostStatus;
};

const STORAGE_KEY = 'biobel_posting_calendar_v1';
const DRIVE_KEY = 'biobel_posting_drive_url_v1';
const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const postTypes = ['Bom dia', 'Story', 'Feed', 'Reels', 'Campanha', 'Oferta', 'Dica de beleza', 'Outro'];
const statuses: PostStatus[] = ['Pendente', 'Publicado', 'Adiado'];

function localDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function mondayOf(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}
function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function formatShort(date: Date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function PostingCalendarView() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [driveUrl, setDriveUrl] = useState('');
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [saved, setSaved] = useState(true);
  const [showDriveSettings, setShowDriveSettings] = useState(false);
  const [driveDraft, setDriveDraft] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPosts(JSON.parse(raw));
      const savedDrive = localStorage.getItem(DRIVE_KEY) || '';
      setDriveUrl(savedDrive);
      setDriveDraft(savedDrive);
    } catch (error) {
      console.error('Não foi possível carregar o calendário local da Biobel.', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
      setSaved(true);
    } catch (error) {
      setSaved(false);
      console.error('Não foi possível salvar o calendário local da Biobel.', error);
    }
  }, [posts]);

  const weekDates = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);

  const dayPosts = useMemo(() => posts
    .filter(post => post.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time)), [posts, selectedDate]);

  const updatePost = (id: string, field: keyof PostItem, value: string) => {
    setPosts(current => current.map(post => post.id === id ? { ...post, [field]: value } as PostItem : post));
    setSaved(false);
  };
  const addPost = () => {
    setPosts(current => [...current, {
      id: makeId(), date: selectedDate, time: '09:00', type: 'Story',
      title: '', notes: '', link: '', status: 'Pendente'
    }]);
    setSaved(false);
  };
  const removePost = (id: string) => {
    if (window.confirm('Deseja excluir esta postagem?')) {
      setPosts(current => current.filter(post => post.id !== id));
    }
  };
  const changeWeek = (amount: number) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + amount * 7);
    setWeekStart(next);
    setSelectedDate(localDateKey(next));
  };
  const saveDriveUrl = () => {
    const cleaned = driveDraft.trim();
    if (cleaned && !/^https?:\/\//i.test(cleaned)) {
      alert('Cole um link válido do Google Drive começando com https://');
      return;
    }
    localStorage.setItem(DRIVE_KEY, cleaned);
    setDriveUrl(cleaned);
    setShowDriveSettings(false);
  };
  const exportCsv = () => {
    const header = ['Data', 'Dia', 'Horário', 'Tipo', 'Postagem/Campanha', 'Observações', 'Link do material', 'Status'];
    const rows = posts.slice().sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).map(post => [
      post.date, weekDays[new Date(post.date + 'T12:00:00').getDay()], post.time, post.type, post.title, post.notes, post.link, post.status
    ]);
    const csv = [header, ...rows].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'calendario-postagens-biobel.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-3 sm:p-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-rose-700 to-pink-600 p-5 text-white shadow-lg sm:flex-row sm:items-center sm:p-7">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-100"><CalendarDays size={18} /> MARKETING & ORGANIZAÇÃO</div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Calendário de Postagens</h1>
          <p className="mt-2 max-w-2xl text-sm text-rose-50 sm:text-base">Organize os Stories, campanhas e ofertas da Biobel por dia e horário.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/20"><Download size={17}/> Exportar Excel/CSV</button>
          <button onClick={() => { setDriveDraft(driveUrl); setShowDriveSettings(v => !v); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50"><FolderOpen size={17}/> Configurar Drive</button>
        </div>
      </div>

      {showDriveSettings && <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">Link da pasta compartilhada do Google Drive</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={driveDraft} onChange={e => setDriveDraft(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 dark:border-slate-600 dark:bg-slate-800" />
          <button onClick={saveDriveUrl} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"><Save size={16}/> Salvar link</button>
        </div>
        <p className="mt-2 text-xs text-slate-500">O link fica salvo neste navegador. Compartilhe a pasta com as pessoas que precisam acessar os materiais.</p>
      </div>}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Semana selecionada</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatShort(weekDates[0])} – {formatShort(weekDates[5])}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { const today = new Date(); setWeekStart(mondayOf(today)); setSelectedDate(localDateKey(today)); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Hoje</button>
          <button onClick={() => changeWeek(-1)} aria-label="Semana anterior" className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><ChevronLeft size={19}/></button>
          <button onClick={() => changeWeek(1)} aria-label="Próxima semana" className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><ChevronRight size={19}/></button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {weekDates.map(date => {
          const key = localDateKey(date);
          const count = posts.filter(post => post.date === key).length;
          const active = selectedDate === key;
          const today = key === localDateKey(new Date());
          return <button key={key} onClick={() => setSelectedDate(key)} className={`rounded-2xl border p-3 text-left transition ${active ? 'border-rose-600 bg-rose-50 ring-2 ring-rose-200 dark:bg-rose-950/40 dark:ring-rose-900' : 'border-slate-200 bg-white hover:border-rose-300 dark:border-slate-700 dark:bg-slate-900'}`}>
            <span className={`block text-xs font-semibold ${active ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500'}`}>{weekDays[date.getDay()]}</span>
            <span className="mt-1 block text-xl font-extrabold text-slate-900 dark:text-white">{formatShort(date)}</span>
            <span className="mt-2 flex items-center justify-between gap-1 text-xs text-slate-500"><span>{count} postagem(ns)</span>{today && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-white">Hoje</span>}</span>
          </button>;
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</h2>
            <p className="mt-1 text-sm text-slate-500">Adicione uma linha para cada publicação planejada.</p>
          </div>
          <button onClick={addPost} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"><Plus size={17}/> Adicionar postagem</button>
        </div>

        {dayPosts.length === 0 ? <div className="p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40"><Instagram size={24}/></div>
          <h3 className="font-bold text-slate-800 dark:text-white">Nenhuma postagem planejada</h3>
          <p className="mt-1 text-sm text-slate-500">Comece adicionando o primeiro horário deste dia.</p>
          <button onClick={addPost} className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700">+ Nova postagem</button>
        </div> : <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70">
              <tr><th className="px-3 py-3">Horário</th><th className="px-3 py-3">Tipo</th><th className="px-3 py-3">Postagem / campanha</th><th className="px-3 py-3">Link do material</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Excluir</th></tr>
            </thead>
            <tbody>
              {dayPosts.map(post => <tr key={post.id} className="border-t border-slate-100 align-top dark:border-slate-800">
                <td className="px-3 py-3"><input type="time" value={post.time} onChange={e => updatePost(post.id, 'time', e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 dark:border-slate-700 dark:bg-slate-800"/></td>
                <td className="px-3 py-3"><select value={post.type} onChange={e => updatePost(post.id, 'type', e.target.value)} className="max-w-36 rounded-lg border border-slate-200 px-2 py-2 dark:border-slate-700 dark:bg-slate-800">{postTypes.map(type => <option key={type}>{type}</option>)}</select></td>
                <td className="min-w-64 px-3 py-3"><input value={post.title} onChange={e => updatePost(post.id, 'title', e.target.value)} placeholder="Ex.: Campanha de hidratação" className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"/><textarea value={post.notes} onChange={e => updatePost(post.id, 'notes', e.target.value)} placeholder="Legenda ou observações (opcional)" rows={2} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"/></td>
                <td className="min-w-48 px-3 py-3"><input value={post.link} onChange={e => updatePost(post.id, 'link', e.target.value)} placeholder="Link da arte (opcional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"/>{post.link && /^https?:\/\//i.test(post.link) && <a href={post.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline">Abrir material <ExternalLink size={12}/></a>}</td>
                <td className="px-3 py-3"><select value={post.status} onChange={e => updatePost(post.id, 'status', e.target.value)} className={`rounded-lg border px-2 py-2 text-xs font-bold ${post.status === 'Publicado' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : post.status === 'Adiado' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>{statuses.map(status => <option key={status}>{status}</option>)}</select></td>
                <td className="px-3 py-3"><button onClick={() => removePost(post.id)} title="Excluir postagem" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17}/></button></td>
              </tr>)}
            </tbody>
          </table>
        </div>}
        <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5">{saved ? <CheckCircle2 size={14} className="text-emerald-600"/> : <Save size={14}/>} {saved ? 'Salvo neste navegador' : 'Salvando alterações…'}</span>
          <span>{dayPosts.filter(post => post.status === 'Publicado').length} publicado(s) · {dayPosts.filter(post => post.status === 'Pendente').length} pendente(s)</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-white p-2 text-blue-700 shadow-sm dark:bg-slate-900"><FolderOpen size={22}/></div><div><h3 className="font-bold text-slate-900 dark:text-white">Materiais de divulgação da Biobel</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{driveUrl ? 'Abra a pasta compartilhada para localizar artes, fotos e campanhas.' : 'Configure uma vez o link da pasta do Drive para acesso rápido.'}</p></div></div>
        {driveUrl ? <a href={driveUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800"><FolderOpen size={17}/> Abrir pasta de postagens <ExternalLink size={15}/></a> : <button onClick={() => { setDriveDraft(driveUrl); setShowDriveSettings(true); }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800"><Link2 size={17}/> Adicionar link do Drive</button>}
      </div>
      <p className="text-xs leading-relaxed text-slate-500">Observação: as postagens e o link do Drive ficam salvos neste navegador/dispositivo. Para compartilhar o mesmo calendário entre várias vendedoras e aparelhos, será necessário ativar o armazenamento compartilhado da equipe.</p>
    </div>
  );
}
