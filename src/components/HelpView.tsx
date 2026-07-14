import { 
    cn, formatCurrency, getWhatsAppUrl, cleanData, normalizeVendedoraName, 
    getSafeDate, getSaleLocalHours, formatDate, getLocalISOString, 
    isSameLocalDay, formatDateWithDayOfWeek, formatPhone, APP_VERSION 
  } from '../utils';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Store, Home, RefreshCw, CheckCircle2, AlertCircle, Info, X, 
  AlertTriangle, Calendar, UserCircle, ShoppingCart, 
  History, Wallet, Package, Target, LayoutDashboard, 
  ClipboardList, User as UserIcon, Sparkles, ReceiptText, Settings, Link as LinkIcon, 
  Database, LogOut, Search, Plus, Trash2, Edit2, List, 
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Download, Upload, Filter, Layers, Box, PlusCircle,
  ArrowUpRight, ArrowDownRight, TrendingUp, Users,
  DollarSign, ShoppingBag, Clock, MoreVertical,
  Menu, Bell, Moon, Sun, Laptop, QrCode, Disc, FileText, FileBarChart, FileSpreadsheet,
  BarChart3, Check, MessageCircle, CheckCircle, ClipboardList as ClipboardListIcon, ShoppingBag as ShoppingBagIcon, Package as PackageIcon, Trash2 as Trash2Icon, X as XIcon, Plus as PlusIcon, Search as SearchIcon, Wallet as WalletIcon,
  Megaphone, Send, Zap, Trophy, Eye, EyeOff, Tag, Gift, MapPin, Pencil, Star, StickyNote,
  Coffee, Instagram, Smartphone, LayoutGrid, BookOpen, Heart, Camera, MessageSquare, Mail, Palette, Printer, Lock, Unlock, PackageCheck, Repeat, PieChart as PieChartIcon, Percent,
  CloudRain, Umbrella, Trash, Award, Activity, Minus, Ticket, Copy, Truck,
  Globe, Hash, Calculator, FileCode, Building2, Handshake
} from 'lucide-react';
import { User, Brand, Category, Product, StockBatch, Staff, StoreSettings, 
  Withdrawal, FixedCost, FinancialAccount, CashierSession, Campaign, 
  Giveaway, RaffleTicket, Raffle, RoutineActivity, Routine, Customer, 
  SaleItem, Payment, Sale, MonthlyGoal, DashboardViewProps, ProductsViewProps, 
  StaffViewProps, RoutineViewProps, BackupViewProps, CustomersViewProps, 
  SalesViewProps, CashierViewProps, CampaignsViewProps, AtendimentoViewProps, 
  Notification } from '../types';;
import { db, auth } from '../firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy, increment } from 'firebase/firestore';

// Sub-component sibling imports inside src/components
import { InteractiveTips } from './interactivetips';
import { GestaoView } from './GestaoView';
import { ImprovementView } from './ImprovementView';
import { IncentiveCampaignView } from './IncentiveCampaignView';
import { SuppliersAndPurchasesView } from './SuppliersAndPurchasesView';
import { AgendaView, AgendaEvent } from './AgendaView';
import { ValidadesControlView } from './ValidadesControlView';
import { FiscalView } from './FiscalView';

export const HelpView = () => {
  const changelog = [
    {
      version: '3.5.0',
      date: 'Julho 2026',
      type: 'Major',
      title: 'Módulo Fiscal Experimental & Homologação',
      items: [
        'Novo Módulo Fiscal integrado (com suporte experimental para emissão direta SEFAZ)',
        'Suporte completo a CFOP, Observações Complementares, Séries Fiscais e CNAEs da empresa',
        'Tabelas de alíquotas tributárias IBPT atualizadas por NCM de produtos e serviços',
        'Aviso visível destacando o caráter experimental dos recursos fiscais e orientando a realização de testes junto ao contador',
        'Bloqueio inteligente de alíquotas percentuais para empresas enquadradas como MEI',
        'Acompanhamento do teto de faturamento anual recomendado para MEI (R$ 81.000,00) com simulação do acumulado'
      ]
    },
    {
      version: '3.0.0',
      date: 'Junho 2026',
      type: 'Major',
      title: 'Nota Fiscal & CPF na Nota (Serviços e Produtos)',
      items: [
        'Emissão de Nota Fiscal de Consumidor Eletrônica (NFC-e) oficial SEFAZ',
        'Inclusão automática de CPF ou CNPJ na Nota Fiscal do cliente',
        'Compatibilidade de Nota Fiscal para Produtos e Serviços',
        'Download instantâneo de arquivo fiscal XML regulamentado',
        'Impressão de DANFE térmico com QR Code de consulta estadual',
        'Guia Passo a Passo ultra-simples para emissão rápida'
      ]
    },
    {
      version: '2.5.0',
      date: 'Maio 2024',
      type: 'Improvement',
      title: 'Ajustes de Configuração & Estabilidade',
      items: [
        'Correção de exibição do PIX quando desativado nas configurações',
        'Opção para ocultar campo de Cupons/Descontos no carrinho',
        'Refinamento visual do pop-up informativo de novas funções',
        'Melhoria na estabilidade do Dashboard e carregamento de dados',
        'Sincronização de versão do sistema em tempo real'
      ]
    },
    {
      version: '2.4.0',
      date: 'Maio 2024',
      type: 'Feature',
      title: 'PIX Dinâmico & Inteligência de Estoque',
      items: [
        'Implementação de QR Code PIX automático com CRC16 (Copia e Cola compatível)',
        'Novo seletor de tipo de chave PIX (CPF, CNPJ, Celular, etc)',
        'Relatório ABC de compras para inteligência de reposição',
        'Filtros avançados no histórico de vendas (Busca global por cliente/produto)',
        'Sistema de versões e changelog para acompanhamento de melhorias'
      ]
    },
    {
      version: '2.3.0',
      date: 'Abril 2024',
      type: 'Improvement',
      title: 'Gestão Financeira & Comissões',
      items: [
        'Divisão de telas: Menu Vendedoras separado dos Dados da Empresa',
        'Configurações de recibo customizáveis (mostrar/esconder campos)',
        'Cálculo automático de comissões por vendedora',
        'Dashboard de despesas fixas para controle de custos'
      ]
    },
    {
      version: '2.2.0',
      date: 'Março 2024',
      type: 'UI/UX',
      title: 'Review Visual & Dark Mode',
      items: [
        'Novo layout bento-grid para o Dashboard',
        'Aprimoramento do Dark Mode em todas as telas',
        'Animações de transição suaves entre abas',
        'Otimização de performance no carregamento de tabelas longas'
      ]
    }
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Ajuda & Novidades</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Zap size={12} className="text-blue-500" />
            Acompanhe a evolução do sistema Biobel.
          </p>
        </div>
        <div className="bg-blue-600 text-white px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100">
          v{APP_VERSION}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Support Section */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
              <MessageSquare size={18} className="text-emerald-500" />
              Suporte Técnico
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-6">
              Precisa de ajuda com alguma funcionalidade ou encontrou um erro? Entre em contato com o desenvolvedor.
            </p>
            <a 
              href="https://wa.me/5551999998888" 
              target="_blank" 
              className="flex items-center justify-center gap-3 w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100"
            >
              Falar no WhatsApp
            </a>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] p-8 shadow-xl shadow-blue-100 dark:shadow-none text-white">
            <BookOpen size={32} className="mb-4 opacity-50" />
            <h3 className="text-sm font-black uppercase tracking-tight mb-2">Manual Rápido</h3>
            <p className="text-[10px] font-bold opacity-80 uppercase leading-relaxed">
              Dica: O sistema salva tudo automaticamente no servidor. Use o menu de Backup apenas para exportar relatórios externos.
            </p>
          </div>

          {/* Guia Prático da Vovó */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-amber-950/20 rounded-[40px] p-8 border border-amber-100 dark:border-amber-950/30 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👵</span>
              <div>
                <h3 className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-tight leading-none">Manual de Nota da Vovó</h3>
                <p className="text-[9px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider mt-1">Como emitir a Nota com muito amor</p>
              </div>
            </div>
            
            <div className="space-y-4 pt-2 text-xs text-amber-900/90 dark:text-slate-300 font-medium">
              <div className="bg-white/80 dark:bg-slate-900/60 p-4 rounded-2xl space-y-1.5 shadow-2xs">
                <span className="font-black text-amber-700 dark:text-amber-400 text-[10px] uppercase block tracking-wider">👵 Passo 1: Chame o Cliente</span>
                <p className="leading-relaxed">Na hora do pagamento, pergunte com carinho: <em className="not-italic font-bold text-amber-900 dark:text-white">"Quer o CPF na nota, meu bem?"</em>. Se sim, digite o CPF ou CNPJ no quadradinho novo.</p>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/60 p-4 rounded-2xl space-y-1.5 shadow-2xs">
                <span className="font-black text-amber-700 dark:text-amber-400 text-[10px] uppercase block tracking-wider">🛍️ Passo 2: Faça a Vendinha</span>
                <p className="leading-relaxed">Escolha os produtos ou serviços no carrinho, escolha como ele vai pagar (PIX, dinheiro ou cartão) e clique no botãozão verde de finalizar venda.</p>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/60 p-4 rounded-2xl space-y-1.5 shadow-2xs">
                <span className="font-black text-amber-700 dark:text-amber-400 text-[10px] uppercase block tracking-wider">⚡ Passo 3: O Botão Vermelho</span>
                <p className="leading-relaxed">Assim que a venda terminar, vai aparecer um quadrinho escrito <em className="not-italic font-bold text-slate-950 dark:text-white">"Nota Fiscal"</em>. Clique no botão vermelho escrito <strong className="font-black text-rose-600">"⚡ Emitir NFC-e Oficial"</strong>.</p>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/60 p-4 rounded-2xl space-y-1.5 shadow-2xs">
                <span className="font-black text-amber-700 dark:text-amber-400 text-[10px] uppercase block tracking-wider">☁️ Passo 4: Conversa com a Receita</span>
                <p className="leading-relaxed">O sistema vai piscar conversando com o computador da Receita do Estado (SEFAZ). Em menos de 3 segundinhos, o papelzinho oficial aparece pronto na tela!</p>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/60 p-4 rounded-2xl space-y-1.5 shadow-2xs">
                <span className="font-black text-amber-700 dark:text-amber-400 text-[10px] uppercase block tracking-wider">🖨️ Passo 5: Entregar ao Cliente</span>
                <p className="leading-relaxed">Pronto! Agora clique em <em className="not-italic font-bold text-emerald-600">"Imprimir DANFE"</em> para sair na maquininha, ou em <em className="not-italic font-bold text-slate-600">"Baixar XML"</em> para salvar no computador. Você arrasou!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Changelog Section */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-10 flex items-center gap-3">
              <History size={24} className="text-blue-500" />
              Histórico de Atualizações
            </h3>

            <div className="space-y-12">
              {changelog.map((log) => (
                <div key={log.version} className="relative pl-12 border-l-2 border-slate-50 dark:border-slate-800 pb-2">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-slate-900 shadow-sm" />
                  
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg">
                      v{log.version}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {log.date}
                    </span>
                  </div>

                  <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">
                    {log.title}
                  </h4>

                  <ul className="space-y-3">
                    {log.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs text-slate-500 dark:text-slate-400 font-bold">
                        <div className="w-1.5 h-1.5 bg-blue-500/20 rounded-full mt-1.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
