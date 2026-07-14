import React, { useState, useMemo } from 'react';
import {
  FileText, Search, Plus, Trash2, Edit2, Check, X, ShieldAlert, 
  Globe, Hash, Calculator, AlertCircle, Play, CheckCircle2, 
  Settings, RefreshCw, Upload, Download, FileSpreadsheet, Building2,
  Percent, FileCode, CheckSquare, Sparkles, Filter, Info, Eye
} from 'lucide-react';

interface CFOP {
  code: string;
  description: string;
  type: 'entrada' | 'saida';
  application: string;
}

interface ObsRule {
  id: string;
  title: string;
  text: string;
  active: boolean;
}

interface IBPTItem {
  ncm: string;
  description: string;
  federal: number;
  state: number;
  municipal: number;
}

interface NFeItem {
  id: string;
  number: string;
  series: string;
  recipient: string;
  date: string;
  value: number;
  status: 'autorizada' | 'cancelada' | 'rejeitada' | 'contingencia';
  key: string;
}

interface CNAEItem {
  code: string;
  description: string;
  type: 'principal' | 'secundario';
  taxRegime: string;
}

interface FiscalViewProps {
  formatCurrency: (value: number) => string;
  addNotification: (message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
  activeSubTab?: string;
}

export const FiscalView = ({
  formatCurrency,
  addNotification,
  activeSubTab = 'cfop'
}: FiscalViewProps) => {
  const [currentTab, setCurrentTab] = useState<string>(activeSubTab);

  // CFOP State
  const [cfops, setCfops] = useState<CFOP[]>([
    { code: '5.102', description: 'Venda de mercadoria adquirida ou recebida de terceiros', type: 'saida', application: 'Venda de cosméticos em geral para cliente final' },
    { code: '5.405', description: 'Venda de mercadoria adquirida de terceiros sujeita a substituição tributária', type: 'saida', application: 'Venda de cosméticos com ST recolhido' },
    { code: '5.933', description: 'Prestação de serviço tributado pelo ISSQN', type: 'saida', application: 'Serviços de estética, massagem e beleza' },
    { code: '1.102', description: 'Compra para comercialização', type: 'entrada', application: 'Compra de cosméticos para revenda' },
    { code: '1.556', description: 'Compra de material para uso ou consumo', type: 'entrada', application: 'Compra de insumos de estética (gel, agulhas, toalhas)' },
  ]);
  const [cfopSearch, setCfopSearch] = useState('');
  const [isAddCfopOpen, setIsAddCfopOpen] = useState(false);
  const [newCfop, setNewCfop] = useState<CFOP>({ code: '', description: '', type: 'saida', application: '' });

  // Emissão Online State
  const [sefazStatus, setSefazStatus] = useState<'idle' | 'testing' | 'online' | 'offline'>('online');
  const [certUploaded, setCertUploaded] = useState(true);
  const [certPassword, setCertPassword] = useState('******');
  const [autoEmit, setAutoEmit] = useState(true);
  const [selectedEnv, setSelectedEnv] = useState<'homologacao' | 'producao'>('homologacao');

  // Regras de Observação State
  const [obsRules, setObsRules] = useState<ObsRule[]>([
    { id: '1', title: 'MEI (Microempreendedor)', text: 'DOCUMENTO EMITIDO POR MEI - MICROEMPREENDEDOR INDIVIDUAL. OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE ICMS, ISS OU IPI.', active: true },
    { id: '2', title: 'Simples Nacional (ME/EPP)', text: 'DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE IPI.', active: false },
    { id: '3', title: 'Lei da Transparência', text: 'Valor aprox. dos tributos: R$ {VALOR_TRIB} ({PCT_TRIB}%) Fonte: IBPT.', active: true },
    { id: '4', title: 'Substituição Tributária', text: 'ICMS pago por Substituição Tributária conforme legislação estadual vigente.', active: false },
  ]);
  const [isAddObsOpen, setIsAddObsOpen] = useState(false);
  const [newObs, setNewObs] = useState({ title: '', text: '' });

  // Série Fiscal State
  const [serieNfce, setSerieNfce] = useState('1');
  const [nextNfce, setNextNfce] = useState('1085');
  const [serieNfe, setSerieNfe] = useState('1');
  const [nextNfe, setNextNfe] = useState('412');

  // IBPT State
  const [ibptItems, setIbptItems] = useState<IBPTItem[]>([
    { ncm: '3304.99.90', description: 'Outros produtos de beleza ou de maquilagem e preparações para conservação ou cuidados da pele', federal: 12.5, state: 18.0, municipal: 0.0 },
    { ncm: '3305.10.00', description: 'Xampus para os cabelos', federal: 9.25, state: 17.0, municipal: 0.0 },
    { ncm: '3401.11.90', description: 'Outros sabões, produtos de toucador, em barra/moldados', federal: 8.5, state: 18.0, municipal: 0.0 },
    { ncm: '9615.11.00', description: 'Pentes, travessas para cabelo e artigos semelhantes de borracha endurecida ou de plástico', federal: 15.0, state: 18.0, municipal: 0.0 },
    { ncm: '9602.50.02', description: 'Serviço de tratamento de beleza, estética e assemelhados', federal: 0.0, state: 0.0, municipal: 5.0 },
  ]);
  const [ibptSearch, setIbptSearch] = useState('');
  const [editingIbpt, setEditingIbpt] = useState<IBPTItem | null>(null);

  // NF-e State
  const [nfes, setNfes] = useState<NFeItem[]>([
    { id: '1', number: '00000411', series: '1', recipient: 'Lúcia Ferreira de Souza', date: '2026-07-10T14:30:00', value: 345.90, status: 'autorizada', key: '35260712345678901234550010000004111234567890' },
    { id: '2', number: '00000410', series: '1', recipient: 'Biobel Cosméticos Ltda (Devolução)', date: '2026-07-08T09:15:00', value: 1200.00, status: 'autorizada', key: '35260712345678901234550010000004101234567891' },
    { id: '3', number: '00000409', series: '1', recipient: 'Carlos Eduardo Oliveira', date: '2026-07-05T17:45:00', value: 180.00, status: 'cancelada', key: '35260712345678901234550010000004091234567892' },
    { id: '4', number: '00000408', series: '1', recipient: 'Juliana Pires de Lima', date: '2026-07-02T11:20:00', value: 520.00, status: 'contingencia', key: '35260712345678901234550010000004081234567893' },
  ]);
  const [nfeSearch, setNfeSearch] = useState('');

  // CNAE State
  const [cnaes, setCnaes] = useState<CNAEItem[]>([
    { code: '9602-5/02', description: 'Atividades de estética e outros serviços de cuidados com a beleza', type: 'principal', taxRegime: 'Anexo III - Simples Nacional' },
    { code: '4772-5/00', description: 'Comércio varejista de cosméticos, produtos de perfumaria e de higiene pessoal', type: 'secundario', taxRegime: 'Anexo I - Simples Nacional' },
    { code: '8599-6/04', description: 'Treinamento em desenvolvimento profissional e gerencial (Cursos e Workshops)', type: 'secundario', taxRegime: 'Anexo V - Simples Nacional' },
  ]);

  // CFOP Handlers
  const handleAddCfop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCfop.code || !newCfop.description) {
      addNotification('Preencha o código e a descrição do CFOP.', 'warning');
      return;
    }
    setCfops(prev => [newCfop, ...prev]);
    addNotification(`CFOP ${newCfop.code} cadastrado com sucesso!`, 'success');
    setNewCfop({ code: '', description: '', type: 'saida', application: '' });
    setIsAddCfopOpen(false);
  };

  const handleDeleteCfop = (code: string) => {
    if (confirm(`Deseja remover o CFOP ${code}?`)) {
      setCfops(prev => prev.filter(c => c.code !== code));
      addNotification('CFOP removido com sucesso.', 'success');
    }
  };

  // Sefaz Connectivity Test Simulation
  const handleTestSefazConnection = () => {
    setSefazStatus('testing');
    setTimeout(() => {
      const isOnline = Math.random() > 0.15; // 85% chance of being online
      setSefazStatus(isOnline ? 'online' : 'offline');
      if (isOnline) {
        addNotification('Conexão ativa com o Servidor SEFAZ! Autorizador operando normalmente.', 'success');
      } else {
        addNotification('Falha ao comunicar com SEFAZ. Servidor indisponível ou sem resposta.', 'error');
      }
    }, 1500);
  };

  // Obs Rules Handlers
  const toggleObsRule = (id: string) => {
    setObsRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    addNotification('Status da regra atualizado.', 'info');
  };

  const handleAddObs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObs.title || !newObs.text) {
      addNotification('Preencha todos os campos.', 'warning');
      return;
    }
    const created = {
      id: Date.now().toString(),
      title: newObs.title,
      text: newObs.text,
      active: true
    };
    setObsRules(prev => [...prev, created]);
    addNotification('Nova regra fiscal adicionada!', 'success');
    setNewObs({ title: '', text: '' });
    setIsAddObsOpen(false);
  };

  const handleDeleteObs = (id: string) => {
    setObsRules(prev => prev.filter(r => r.id !== id));
    addNotification('Regra fiscal excluída.', 'success');
  };

  // IBPT Handlers
  const handleEditIbpt = (item: IBPTItem) => {
    setEditingIbpt({ ...item });
  };

  const handleSaveIbpt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIbpt) return;
    setIbptItems(prev => prev.map(item => item.ncm === editingIbpt.ncm ? editingIbpt : item));
    addNotification(`Alíquotas do NCM ${editingIbpt.ncm} atualizadas.`, 'success');
    setEditingIbpt(null);
  };

  // XML Import Simulation
  const handleSimulateXmlImport = () => {
    addNotification('Simulando leitura de arquivo XML...', 'info');
    setTimeout(() => {
      const randomId = Math.floor(1000 + Math.random() * 9000).toString();
      const randomValue = parseFloat((100 + Math.random() * 2000).toFixed(2));
      const newNfe: NFeItem = {
        id: randomId,
        number: '00000' + randomId,
        series: '1',
        recipient: 'Fornecedor Cosméticos Brasil Ltda',
        date: new Date().toISOString(),
        value: randomValue,
        status: 'autorizada',
        key: '352607' + Math.floor(Math.random() * 100000000000000000).toString()
      };
      setNfes(prev => [newNfe, ...prev]);
      addNotification(`Nota Fiscal #${newNfe.number} importada com sucesso via XML! Valor: ${formatCurrency(randomValue)}`, 'success');
    }, 1000);
  };

  // Filter CFOP
  const filteredCfops = useMemo(() => {
    return cfops.filter(c =>
      c.code.includes(cfopSearch) ||
      c.description.toLowerCase().includes(cfopSearch.toLowerCase()) ||
      c.application.toLowerCase().includes(cfopSearch.toLowerCase())
    );
  }, [cfops, cfopSearch]);

  // Filter IBPT
  const filteredIbpt = useMemo(() => {
    return ibptItems.filter(i =>
      i.ncm.includes(ibptSearch) ||
      i.description.toLowerCase().includes(ibptSearch.toLowerCase())
    );
  }, [ibptItems, ibptSearch]);

  // Filter NF-e
  const filteredNfes = useMemo(() => {
    return nfes.filter(n =>
      n.number.includes(nfeSearch) ||
      n.recipient.toLowerCase().includes(nfeSearch.toLowerCase()) ||
      n.key.includes(nfeSearch)
    );
  }, [nfes, nfeSearch]);

  return (
    <div className="space-y-8 text-left">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-8 rounded-[40px] border border-indigo-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <FileText size={140} className="text-white" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-lime-400 text-indigo-950 rounded-full text-[10px] font-black uppercase tracking-widest">
              NOVO • EM TESTES 🧪
            </span>
            <span className="px-3 py-1 bg-white/10 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-300">
              Módulo Fiscal Integrado
            </span>
          </div>
          <h2 className="text-3xl font-display font-black uppercase tracking-tight">Painel Tributário & Notas Fiscais</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Consulte e configure as diretrizes de faturamento, regras tributárias municipais e estaduais, tabelas IBPT, série fiscal e homologação de transmissão direta para a SEFAZ.
          </p>
        </div>
      </div>

      {/* Experimental Feature Warning Banner */}
      <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex gap-4 items-start shadow-sm">
        <AlertCircle className="text-amber-500 shrink-0 mt-0.5 animate-pulse" size={24} />
        <div className="space-y-1.5">
          <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
            Recurso Experimental • Necessário Realizar Testes
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wide leading-relaxed">
            Atenção: Este módulo fiscal é um recurso totalmente NOVO e está em fase EXPERIMENTAL de testes e homologação direta com a SEFAZ. Solicitamos que você realize testes e valide todas as configurações junto ao seu escritório de contabilidade para garantir que as alíquotas (IBPT), CFOP e demais regras tributárias estejam em total conformidade com o enquadramento da sua empresa.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
        {[
          { id: 'cfop', label: 'CFOP', icon: Hash },
          { id: 'emissao', label: 'Emissão Online', icon: Globe, badge: 'NOVO' },
          { id: 'observacoes', label: 'Observações Complementares', icon: FileText },
          { id: 'serie', label: 'Séries Fiscais', icon: Calculator },
          { id: 'ibpt', label: 'Tabela IBPT', icon: Percent },
          { id: 'nfe', label: 'Notas Emitidas (NF-e)', icon: FileCode },
          { id: 'cnae', label: 'CNAEs da Empresa', icon: Building2 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer ${
              currentTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-100 dark:border-slate-800'
            }`}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="text-[8px] font-black bg-lime-400 text-indigo-950 px-1 py-0.2 rounded uppercase">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: CFOP */}
      {currentTab === 'cfop' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">Códigos Fiscais de Operações (CFOP)</h3>
              <p className="text-xs text-slate-400 mt-1">Lista de CFOPs homologados para faturamento de mercadorias e prestação de serviços na clínica.</p>
            </div>
            <button
              onClick={() => setIsAddCfopOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm cursor-pointer transition-all"
            >
              <Plus size={14} /> Novo CFOP
            </button>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por código, descrição ou aplicação..."
              value={cfopSearch}
              onChange={(e) => setCfopSearch(e.target.value)}
              className="bg-transparent text-xs w-full focus:outline-hidden text-slate-800 dark:text-white"
            />
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Código</th>
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Tipo</th>
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Descrição</th>
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Aplicação Prática</th>
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCfops.map(cfop => (
                  <tr key={cfop.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/25">
                    <td className="p-4 font-mono font-black text-indigo-600 dark:text-indigo-400">{cfop.code}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                        cfop.type === 'saida' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                      }`}>
                        {cfop.type === 'saida' ? 'Saída (Prestação/Venda)' : 'Entrada (Compra/Devolução)'}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{cfop.description}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">{cfop.application}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteCfop(cfop.code)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                        title="Remover CFOP"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add CFOP Modal */}
          {isAddCfopOpen && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-black uppercase text-slate-900 dark:text-white">Adicionar Novo CFOP</h4>
                  <button onClick={() => setIsAddCfopOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>
                <form onSubmit={handleAddCfop} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Código CFOP</label>
                      <input
                        type="text"
                        placeholder="Ex: 5.102"
                        value={newCfop.code}
                        onChange={(e) => setNewCfop({ ...newCfop, code: e.target.value })}
                        className="w-full bg-slate-550/10 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-white font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tipo de Operação</label>
                      <select
                        value={newCfop.type}
                        onChange={(e) => setNewCfop({ ...newCfop, type: e.target.value as 'entrada' | 'saida' })}
                        className="w-full bg-slate-550/10 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-white"
                      >
                        <option value="saida">Saída (Faturamento)</option>
                        <option value="entrada">Entrada (Compras)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Descrição Oficial (SEFAZ)</label>
                    <input
                      type="text"
                      placeholder="Descrição técnica"
                      value={newCfop.description}
                      onChange={(e) => setNewCfop({ ...newCfop, description: e.target.value })}
                      className="w-full bg-slate-550/10 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Aplicação Prática (Clínica)</label>
                    <input
                      type="text"
                      placeholder="Ex: Utilizar em vendas de batons e cremes"
                      value={newCfop.application}
                      onChange={(e) => setNewCfop({ ...newCfop, application: e.target.value })}
                      className="w-full bg-slate-550/10 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddCfopOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black"
                    >
                      Confirmar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Emissão Online */}
      {currentTab === 'emissao' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Certificate and Credentials Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-tight text-slate-400">🔑 Certificado Digital & SEFAZ</h3>
              
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-850 dark:text-white">Certificado Biobel A1</p>
                    <p className="text-[10px] text-slate-400">Validade: 12/03/2027 (Ativo)</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-all">
                    Alterar Certificado
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">CSC (Código Segurança Contribuinte)</label>
                  <input
                    type="text"
                    value="000002-CSC-EMISSAO-HOMOLOGACAO"
                    className="w-full bg-slate-550/10 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-white"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Id do CSC</label>
                  <input
                    type="text"
                    value="000001"
                    className="w-full bg-slate-550/10 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-white"
                    disabled
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Ambiente SEFAZ</span>
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => { setSelectedEnv('homologacao'); addNotification('Alterado para ambiente de testes/homologação.', 'info'); }}
                      className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                        selectedEnv === 'homologacao' ? 'bg-indigo-600 text-white' : 'text-slate-500'
                      }`}
                    >
                      Homologação (Testes)
                    </button>
                    <button
                      onClick={() => { setSelectedEnv('producao'); addNotification('Atenção: Mudança para ambiente de faturamento real! Requer certificado ativo.', 'warning'); }}
                      className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                        selectedEnv === 'producao' ? 'bg-rose-600 text-white' : 'text-slate-500'
                      }`}
                    >
                      Produção
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Integration Status Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-tight text-slate-400">🌐 Comunicação com a SEFAZ</h3>

              <div className="flex flex-col items-center justify-center p-6 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-center space-y-3">
                <div className="relative">
                  {sefazStatus === 'testing' ? (
                    <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-indigo-600 animate-spin flex items-center justify-center" />
                  ) : (
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      sefazStatus === 'online' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950' : 'bg-rose-100 text-rose-600 dark:bg-rose-950'
                    }`}>
                      <Globe size={32} className={sefazStatus === 'online' ? 'animate-pulse' : ''} />
                    </div>
                  )}
                  {sefazStatus !== 'testing' && (
                    <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-950 ${
                      sefazStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />
                  )}
                </div>

                <div>
                  <p className="text-sm font-black uppercase">
                    {sefazStatus === 'testing' ? 'Testando Servidor...' : sefazStatus === 'online' ? 'SEFAZ Ativa e Online' : 'SEFAZ Indisponível'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {sefazStatus === 'online' ? 'Tempo de resposta médio: 145ms' : 'Clique no botão abaixo para re-testar'}
                  </p>
                </div>

                <button
                  onClick={handleTestSefazConnection}
                  disabled={sefazStatus === 'testing'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
                >
                  <RefreshCw size={12} className={sefazStatus === 'testing' ? 'animate-spin' : ''} />
                  Pingar Autorizador
                </button>
              </div>

              {/* Autopost Configuration */}
              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-850 dark:text-white">Emissão Automática</p>
                  <p className="text-[9px] text-slate-400">Transmitir nota logo após fechar a venda</p>
                </div>
                <button
                  onClick={() => { setAutoEmit(!autoEmit); addNotification(autoEmit ? 'Auto-emissão desativada.' : 'Auto-emissão ativada.', 'info'); }}
                  className={`w-11 h-6 rounded-full transition-all relative ${autoEmit ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-800'}`}
                >
                  <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-all ${autoEmit ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Help / Warnings Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-tight text-slate-400">💡 Novas Instruções de Emissão</h3>
              <div className="space-y-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                <p>
                  O módulo de <strong className="text-indigo-600 dark:text-indigo-400 font-bold">Emissão Online NFC-e/NF-e</strong> é um recurso em teste 🧪. Ele realiza o faturamento e gera o arquivo tributário XML que pode ser baixado ou transmitido diretamente para validação da SEFAZ.
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-[10px] space-y-1">
                  <p className="font-bold flex items-center gap-1"><AlertCircle size={12} /> ALERTA DE HOMOLOGAÇÃO</p>
                  <p>As notas emitidas no ambiente de homologação não possuem validade fiscal real, ideal para simulações e auditoria de erros.</p>
                </div>
                <div className="pt-1">
                  <button
                    onClick={() => addNotification('Manual tributário baixado para sua área de trabalho.', 'success')}
                    className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                  >
                    Ler Manual Tributário do Simples Nacional →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Observações Complementares */}
      {currentTab === 'observacoes' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-6 text-left">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">Observações Fiscais Automáticas</h3>
              <p className="text-xs text-slate-400 mt-1">Configure as observações obrigatórias adicionadas no campo "Dados Adicionais" ou "Informações Complementares" de suas Notas.</p>
            </div>
            <button
              onClick={() => setIsAddObsOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all"
            >
              <Plus size={14} /> Nova Observação
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {obsRules.map(rule => (
              <div
                key={rule.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  rule.active
                    ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/20'
                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xs uppercase text-slate-950 dark:text-white">{rule.title}</span>
                    <button
                      onClick={() => toggleObsRule(rule.id)}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-md transition-all ${
                        rule.active
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {rule.active ? 'Ativa' : 'Inativa'}
                    </button>
                  </div>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                    {rule.text}
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  <button
                    onClick={() => handleDeleteObs(rule.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                    title="Excluir regra"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Obs Modal */}
          {isAddObsOpen && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-black uppercase text-slate-900 dark:text-white">Criar Nova Observação Fiscal</h4>
                  <button onClick={() => setIsAddObsOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>
                <form onSubmit={handleAddObs} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Título / Identificador</label>
                    <input
                      type="text"
                      placeholder="Ex: Simples Nacional Estética"
                      value={newObs.title}
                      onChange={(e) => setNewObs({ ...newObs, title: e.target.value })}
                      className="w-full bg-slate-550/10 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Texto da Observação (Letras Maiúsculas)</label>
                    <textarea
                      placeholder="Ex: ISENTO DE TRIBUTACAO CONFORME ARTIGO..."
                      value={newObs.text}
                      onChange={(e) => setNewObs({ ...newObs, text: e.target.value.toUpperCase() })}
                      rows={4}
                      className="w-full bg-slate-550/10 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-white font-mono"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddObsOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black"
                    >
                      Salvar Observação
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Séries Fiscais */}
      {currentTab === 'serie' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-6 text-left">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">Numerações & Séries de Faturamento</h3>
            <p className="text-xs text-slate-400 mt-1">Gerencie a sequência de numeração do seu Ponto de Venda (NFC-e) e faturamento de lote (NF-e) para evitar pulos de notas ou duplicidades na Receita.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* NFC-e Config */}
            <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/60 rounded-xl text-indigo-600">
                  <Calculator size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase">Sequência NFC-e (Cupom de Venda)</h4>
                  <p className="text-[10px] text-slate-400">Modelo 65 - Emissão Direta no PDV</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Série Ativa</label>
                  <input
                    type="number"
                    value={serieNfce}
                    onChange={(e) => { setSerieNfce(e.target.value); addNotification('Série fiscal de NFC-e atualizada.', 'info'); }}
                    className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Próxima Nota</label>
                  <input
                    type="number"
                    value={nextNfce}
                    onChange={(e) => { setNextNfce(e.target.value); addNotification('Contador de NFC-e atualizado.', 'info'); }}
                    className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed italic">Certifique-se de que a série coincide com a definida na SEFAZ de sua região (ex: Série 1 é o padrão).</p>
            </div>

            {/* NF-e Config */}
            <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 rounded-xl text-blue-600">
                  <FileCode size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase">Sequência NF-e (Nota de Lote/Serviço)</h4>
                  <p className="text-[10px] text-slate-400">Modelo 55 - Emissão Geral de Devoluções/Remessa</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Série Ativa</label>
                  <input
                    type="number"
                    value={serieNfe}
                    onChange={(e) => { setSerieNfe(e.target.value); addNotification('Série fiscal de NF-e atualizada.', 'info'); }}
                    className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Próxima Nota</label>
                  <input
                    type="number"
                    value={nextNfe}
                    onChange={(e) => { setNextNfe(e.target.value); addNotification('Contador de NF-e atualizado.', 'info'); }}
                    className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed italic">Geralmente, notas em lote utilizam séries específicas ou começam do número 1.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: IBPT */}
      {currentTab === 'ibpt' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-6 text-left">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">Alíquotas IBPT (Lei de Transparência de Impostos)</h3>
              <p className="text-xs text-slate-400 mt-1">Configure o percentual aproximado de impostos calculados sobre cada NCM ou Código de Serviço, impressos no cupom fiscal conforme a Lei 12.741/12.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => addNotification('Tabela IBPT 2026 atualizada com sucesso no banco local!', 'success')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all"
              >
                <RefreshCw size={14} /> Atualizar IBPT 2026
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por NCM ou descrição técnica..."
              value={ibptSearch}
              onChange={(e) => setIbptSearch(e.target.value)}
              className="bg-transparent text-xs w-full focus:outline-hidden text-slate-800 dark:text-white"
            />
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Código NCM/Serviço</th>
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Descrição Técnica</th>
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Fed. Aproximado (%)</th>
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Est. Aproximado (%)</th>
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Mun. Aproximado (%)</th>
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredIbpt.map(item => (
                  <tr key={item.ncm} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/25">
                    <td className="p-4 font-mono font-black text-slate-900 dark:text-white">{item.ncm}</td>
                    <td className="p-4 font-semibold text-slate-600 dark:text-slate-350">{item.description}</td>
                    <td className="p-4 text-slate-750 dark:text-slate-300 font-mono font-bold text-amber-600">{item.federal}%</td>
                    <td className="p-4 text-slate-750 dark:text-slate-300 font-mono font-bold text-indigo-600">{item.state}%</td>
                    <td className="p-4 text-slate-750 dark:text-slate-300 font-mono font-bold text-emerald-600">{item.municipal}%</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleEditIbpt(item)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg cursor-pointer"
                        title="Editar Alíquotas"
                      >
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Edit IBPT Modal */}
          {editingIbpt && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-black uppercase text-slate-900 dark:text-white">Ajustar Alíquotas IBPT</h4>
                  <button onClick={() => setEditingIbpt(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>
                <form onSubmit={handleSaveIbpt} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">NCM / Código</label>
                    <input
                      type="text"
                      value={editingIbpt.ncm}
                      className="w-full bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-500"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Descrição</label>
                    <input
                      type="text"
                      value={editingIbpt.description}
                      className="w-full bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500"
                      disabled
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Federal (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingIbpt.federal}
                        onChange={(e) => setEditingIbpt({ ...editingIbpt, federal: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-550/10 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Estadual (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingIbpt.state}
                        onChange={(e) => setEditingIbpt({ ...editingIbpt, state: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-550/10 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Municipal (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingIbpt.municipal}
                        onChange={(e) => setEditingIbpt({ ...editingIbpt, municipal: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-550/10 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingIbpt(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: NF-e */}
      {currentTab === 'nfe' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-6 text-left">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">Gestão de Notas Fiscais Eletrônicas (NF-e)</h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">Controle geral de notas fiscais de vendas de mercadorias, devoluções de fornecedores e faturamento de lote.</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={handleSimulateXmlImport}
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <Upload size={14} /> Importar XML NFe
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por número da nota, destinatário ou chave de acesso..."
              value={nfeSearch}
              onChange={(e) => setNfeSearch(e.target.value)}
              className="bg-transparent text-xs w-full focus:outline-hidden text-slate-800 dark:text-white"
            />
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Número/Série</th>
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Destinatário/Emitente</th>
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Data de Emissão</th>
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Valor Total</th>
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Status SEFAZ</th>
                  <th className="p-4 font-black uppercase text-slate-400 tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredNfes.map(nfe => (
                  <tr key={nfe.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/25">
                    <td className="p-4">
                      <p className="font-mono font-black text-slate-900 dark:text-white">#{nfe.number}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Série {nfe.series}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-850 dark:text-white">{nfe.recipient}</p>
                      <p className="text-[9px] text-slate-400 font-mono">{nfe.key}</p>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">{new Date(nfe.date).toLocaleString('pt-BR')}</td>
                    <td className="p-4 font-mono font-black text-slate-900 dark:text-white">{formatCurrency(nfe.value)}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1 ${
                        nfe.status === 'autorizada' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' :
                        nfe.status === 'cancelada' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400' :
                        nfe.status === 'rejeitada' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400' :
                        'bg-slate-100 text-slate-850 dark:bg-slate-800 dark:text-slate-300 animate-pulse'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          nfe.status === 'autorizada' ? 'bg-emerald-500' :
                          nfe.status === 'cancelada' ? 'bg-rose-500' :
                          nfe.status === 'rejeitada' ? 'bg-amber-500' :
                          'bg-slate-400'
                        }`} />
                        {nfe.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => addNotification(`Baixando XML da nota ${nfe.number}...`, 'success')}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                          title="Baixar XML"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          onClick={() => addNotification(`Imprimindo DANFE auxiliar da nota ${nfe.number}...`, 'success')}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                          title="Imprimir DANFE"
                        >
                          <FileText size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: CNAE */}
      {currentTab === 'cnae' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-6 text-left">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">CNAEs Cadastrados (Atividades Econômicas)</h3>
            <p className="text-xs text-slate-400 mt-1 font-sans font-medium">Estes códigos categorizam as atividades tributárias autorizadas em seu CNPJ, vinculando automaticamente alíquotas do Simples Nacional.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cnaes.map(cnae => (
              <div
                key={cnae.code}
                className={`p-5 rounded-2xl border ${
                  cnae.type === 'principal'
                    ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/20'
                    : 'border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900'
                } space-y-3 text-left`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">{cnae.code}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                    cnae.type === 'principal' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {cnae.type === 'principal' ? 'Atividade Principal' : 'Secundária'}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-850 dark:text-white leading-relaxed">{cnae.description}</p>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Regime Tributário:</span>
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">{cnae.taxRegime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl space-y-2">
            <h4 className="font-black text-slate-900 dark:text-white uppercase flex items-center gap-1.5"><Building2 size={14} /> ATENÇÃO AOS CNAES</h4>
            <p>Os CNAEs informados devem coincidir rigorosamente com a consulta do cartão CNPJ da Receita Federal. O faturamento de serviços estéticos (9602-5/02) é gerido de forma municipal (ISS) enquanto a venda de cosméticos (4772-5/00) é estadual (ICMS).</p>
          </div>
        </div>
      )}
    </div>
  );
};
