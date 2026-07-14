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

export const CampaignsView = ({ 
  campaigns, 
  setCampaigns, 
  customers, 
  sales, 
  addNotification, 
  handleFirestoreError, 
  user, 
  ensureAuthSession,
  products = [],
  routines = [],
  monthlyGoals = []
}: CampaignsViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<Partial<Campaign>>({
    name: '', message: '', type: 'custom'
  });

  // State for sub-tabs inside campaigns
  const [activeCampTab, setActiveCampTab] = useState<'ativos' | 'calendario' | 'pos-venda' | 'notificacoes'>('notificacoes');

  // New Notification States and Effects
  const [selectedNotifCustId, setSelectedNotifCustId] = useState<string>('');
  const [selectedNotifTemplate, setSelectedNotifTemplate] = useState<'agradece' | 'retorno' | 'cobranca' | 'promocao'>('agradece');
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<'boasvindas' | 'lancamento' | 'promocional'>('boasvindas');
  const [notifSearchQuery, setNotifSearchQuery] = useState<string>('');
  const [customEmailSubject, setCustomEmailSubject] = useState<string>('');
  const [customEmailBody, setCustomEmailBody] = useState<string>('');
  const [notifCustomMessage, setNotifCustomMessage] = useState<string>('');

  const currentNotifCust = useMemo(() => {
    return customers.find(c => c.id === selectedNotifCustId);
  }, [selectedNotifCustId, customers]);

  const currentNotifCustLastSale = useMemo(() => {
    if (!selectedNotifCustId) return null;
    const custSales = sales.filter(s => s.customerId === selectedNotifCustId);
    if (custSales.length === 0) return null;
    return custSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [selectedNotifCustId, sales]);

  useEffect(() => {
    const nome = currentNotifCust ? currentNotifCust.name.split(' ')[0] : '[Nome do Cliente]';
    const mimos = currentNotifCustLastSale 
      ? currentNotifCustLastSale.items.map(i => i.name).join(', ') 
      : 'seus mimos favoritos';
    const vendedora = currentNotifCustLastSale?.vendedora || 'nossa equipe';
    const dataVenda = currentNotifCustLastSale?.date 
      ? currentNotifCustLastSale.date.split('T')[0].split('-').reverse().join('/')
      : 'sua última compra';

    let msg = '';
    if (selectedNotifTemplate === 'agradece') {
      msg = `Olá ${nome}! Passando para agradecer imensamente pela sua confiança em nosso atendimento na Biobel! 🌟 Esperamos que adore seus mimos: ${mimos}. Qualquer dúvida sobre a aplicação ou sua rotina, nossa consultora ${vendedora} estará sempre à disposição. Um super beijo! 🥰`;
    } else if (selectedNotifTemplate === 'retorno') {
      msg = `Oi ${nome}, tudo bem com você? Já faz cerca de 30 dias desde a sua comprinha de ${mimos} na Biobel! 🌸 Passando para lembrar de repor sua rotina e te convidar para conhecer as novidades especiais que chegaram essa semana. Que tal um cafezinho conosco? Beijos!`;
    } else if (selectedNotifTemplate === 'cobranca') {
      msg = `Olá ${nome}, tudo bem? Gostaríamos de lembrar que o seu acerto agendado referente aos mimos adquiridos em ${dataVenda} vence na data de hoje. 🌸 Caso queira efetuar o acerto via PIX, nosso código está pronto. Fale com ${vendedora} para qualquer dúvida. Agradecemos muito pela parceria!`;
    } else if (selectedNotifTemplate === 'promocao') {
      msg = `Surpresa para você, ${nome}! 🌟 Preparamos uma condição super exclusiva de incentivo e fidelização: Cupom CLIENTEVIP10 para você resgatar 10% OFF extras nos seus mimos ou no seu próximo kit corporativo na Biobel. Aproveite!`;
    }
    setNotifCustomMessage(msg);
  }, [currentNotifCust, currentNotifCustLastSale, selectedNotifTemplate]);

  useEffect(() => {
    const nome = currentNotifCust ? currentNotifCust.name.split(' ')[0] : '[Nome do Cliente]';
    const vendedora = currentNotifCustLastSale?.vendedora || 'nossa consultora';

    let subject = '';
    let body = '';

    if (selectedEmailTemplate === 'boasvindas') {
      subject = `Seja muito bem-vinda ao Clube de Vantagens Biobel! 🌸`;
      body = `Olá ${nome},\n\nÉ com muita alegria que recebemos você em nosso Clube de Vantagens e Fidelidade Biobel.\n\nA partir de hoje, você terá acesso prioritário aos lançamentos, convites para nossos chás da tarde de demonstração e ofertas exclusivas.\n\nComo presente especial de boas-vindas, geramos para você o cupom "BEMVINDA15" com 15% de desconto válido até o final do mês.\n\nQualquer dúvida, conte sempre com ${vendedora}.\n\nCom carinho,\nEquipe Biobel`;
    } else if (selectedEmailTemplate === 'lancamento') {
      subject = `✨ LANÇAMENTO: A nova Coleção de Autocuidado chegou!`;
      body = `Querida ${nome},\n\nO momento que todas esperávamos chegou! Nossa nova coleção exclusiva de mimos e ativos de alta performance já está disponível em nosso estoque.\n\nSeparamos com exclusividade para você os melhores itens com texturas leves e aromas surpreendentes para seu ritual diário de bem-estar.\n\nFale com ${vendedora} para receber as fotos da coleção no seu WhatsApp ou venha nos visitar para experimentar!\n\nAtenciosamente,\nEquipe Biobel`;
    } else if (selectedEmailTemplate === 'promocional') {
      subject = `🔥 Campanha de Renovação: Aproveite até 25% OFF!`;
      body = `Olá ${nome},\n\nDeseja dar aquele UP na sua autoestima sem sair do orçamento?\n\nSelecionamos vários mimos queridinhos da marca para uma campanha relâmpago de incentivo. Os itens participantes estão com descontos diretos de 15% a 25%!\n\nAproveite para renovar seus produtos favoritos ou garantir aquele presente impecável.\n\nConsulte o estoque promocional agora mesmo.\n\nAbraços,\nEquipe Biobel`;
    }

    setCustomEmailSubject(subject);
    setCustomEmailBody(body);
  }, [currentNotifCust, currentNotifCustLastSale, selectedEmailTemplate]);

  // Calendar states
  const currentMonthIndex = new Date().getMonth();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(currentMonthIndex);

  // Post-sale States
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedRule, setSelectedRule] = useState<'t1' | 't7' | 't15' | 't30'>('t1');
  const [discountCoupon, setDiscountCoupon] = useState('MIMO10');
  const [customizedMessage, setCustomizedMessage] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const monthlyCelebrations = useMemo(() => [
    {
      month: "Janeiro",
      theme: "Detox, Planejamento & Renovação de Verão",
      events: [
        {
          day: "01",
          title: "Ano Novo (Confraternização Universal)",
          opportunity: "Perfeito para vender tratamentos detox, pacotes de skincare corporal de início de ano e rotinas renovadas.",
          message: "Oi [nome], feliz Ano Novo! 🌟 Que tal começar 2026 investindo no seu bem-estar e autoestima? Temos mimos e sessões de massagens detox exclusivas na Biobel esperando por você neste recomeço!"
        },
        {
          day: "06",
          title: "Dia de Reis / Queima de Verão",
          opportunity: "Gatilho para queima de estoque festivo com descontos promocionais para iniciar o mês vendendo.",
          message: "Olá [nome]! A nossa queima especial de Reis começou! Aproveite descontos fantásticos de até 20% em itens selecionados para rechear sua nécessaire de Verão."
        },
        {
          day: "18",
          title: "Dia do Esteticista",
          opportunity: "Excelente para focar em limpezas de pele profunda, rituais faciais personalizados e combos estéticos.",
          message: "Parabéns a quem cuida da saúde da sua pele! 🌸 No Dia do Esteticista, preparamos uma avaliação facial computadorizada gratuita e 15% OFF em qualquer protocolo de estética!"
        }
      ]
    },
    {
      month: "Fevereiro",
      theme: "Carnaval, Brilho & Hidratação Avançada",
      events: [
        {
          day: "Carnaval",
          title: "Temporada de Carnaval",
          opportunity: "Maquiagens vibrantes, glitter de alta absorção, protetor solar toque seco e pós-sol revitalizante.",
          message: "Pronta para brilhar na folia? 🎭 Garanta seu kit de maquiagem e proteção extrema para curtir os blocos sem descuidar da hidratação corporal. Use o cupom FOLIA10!"
        },
        {
          day: "14",
          title: "Valentine's Day (Dia de São Valentim)",
          opportunity: "Atração de casais com rituais de massagem relaxante dupla e pacotes românticos expressos.",
          message: "Celebre a amizade e o amor no estilo global! ❤️ Traga seu par ou sua melhor amiga para um spa relaxante duplo e ganhem duas taças de espumante e mimos aromáticos!"
        },
        {
          day: "19",
          title: "Dia do Esportista",
          opportunity: "Foco em cosméticos pós-treino, relaxantes musculares, ampolas de refrescância e hidratantes leves.",
          message: "Oi [nome], para quem ama cuidar do corpo e manter a rotina active! Nossos géis refrescantes e loções relaxantes musculares estão em promoção especial hoje!"
        }
      ]
    },
    {
      month: "Março",
      theme: "Semana da Mulher & Direitos do Consumidor",
      events: [
        {
          day: "08",
          title: "Dia Internacional da Mulher",
          opportunity: "Homenagem com brindes exclusivos nas sacolas, descontos especiais em serviços ou mimos.",
          message: "Feliz Dia da Mulher, [nome]! 🌸 Você é foda e merece tirar um tempinho só para você. Compre hoje qualquer cosmético facial e ganhe uma massagem facial cortesia em nosso espaço físico!"
        },
        {
          day: "12",
          title: "Dia do Cabeleireiro / Terapia Capilar",
          opportunity: "Foco em cronogramas capilares de alta performance, hidratação profunda e tratamentos pós-química.",
          message: "Seu cabelo merece brilho de estrela! ✨ Comemore o Dia do Cabeleireiro agendando uma Terapia Capilar Kérastase e ganhe 50% de desconto na escova finalizadora!"
        },
        {
          day: "15",
          title: "Dia do Consumidor",
          opportunity: "Uma das maiores datas comerciais. Ótimo para incentivos como frete grátis ou cupom de cashback.",
          message: "Olá! No Dia do Consumidor, nosso maior presente é agradecer a sua preferência. Preparamos um cupom de 15% de desconto exclusivo para você em todo o nosso catálogo hoje: CLIENTE15!"
        }
      ]
    },
    {
      month: "Abril",
      theme: "Páscoa Real & Nutrição de Cacau",
      events: [
        {
          day: "Páscoa",
          title: "Páscoa e Semanas Santas",
          opportunity: "Promover cosméticos com manteiga de cacau, argilas nutritivas ou combos corporais deliciosos.",
          message: "Nesta Páscoa, troque o chocolate comum por momentos incomparáveis de beleza! Conheça nosso tratamento nutritivo à base de manteiga de cacau e argiloterapia para uma pele sedosa!"
        },
        {
          day: "13",
          title: "Dia do Beijo / Cuidados Labiais",
          opportunity: "Ótimo para batons, regeneradores labiais, hidratantes labiais potentes e esfoliantes.",
          message: "Um beijo inesquecível começa com lábios macios e hidratados! 💋 Conheça nossa linha de Lip Balms nutritivos e batons matte de longa duração com 20% OFF apenas hoje!"
        },
        {
          day: "13",
          title: "Dia da Autoestima Jovem",
          opportunity: "Rotinas de skincare simplificadas, prevenção de manchinhas e tratamentos fáceis de aplicar em casa.",
          message: "Ei! Skincare descomplicado e prevenção para manter sua pele radiante todos os dias. Conheça nossos kits de tratamento diário com 10% OFF essa semana!"
        }
      ]
    },
    {
      month: "Maio",
      theme: "Mês das Mães, Família & Afeto",
      events: [
        {
          day: "01",
          title: "Dia do Trabalhador / Spa Relax",
          opportunity: "Incentivo a tratamentos de descompressão, escalda-pés, massagem de pedras quentes e antiestresse.",
          message: "Você trabalha duro o ano todo, agora é hora de relaxar! 🧘‍♀️ Presenteie-se com o nosso Combo Spa Antiestresse com massagem corporal e escalda-pés com 25% de desconto especial."
        },
        {
          day: "2º Dom",
          title: "Dia das Mães",
          opportunity: "Excelente oportunidade. Cestas montadas sob medida, cartões presente de autocuidado e combos familiares.",
          message: "Seja o motivo do sorriso da sua rainha neste Dia das Mães! 👑 Ofereça um Vale-Presente Relaxamento Biobel completo ou monte uma cesta estilizada conosco. Fale com a gente!"
        },
        {
          day: "25",
          title: "Dia do Orgulho Geek / Cosméticos Divertidos",
          opportunity: "Maquiagens criativas, paletas coloridas, tratamentos divertidos e máscaras argilosas instagramáveis.",
          message: "Quer deixar sua rotina de cuidados mais divertida? Confira nossas máscaras faciais coloridas de superfoods para um skincare super funcional e divertido! 🦄"
        }
      ]
    },
    {
      month: "Junho",
      theme: "Dia dos Namorados, Romantismo & Inverno",
      events: [
        {
          day: "12",
          title: "Dia dos Namorados",
          opportunity: "Kits de massagem a dois, óleos corporais perfumados, hidratantes reconfortantes e velas perfumadas.",
          message: "Celebre o amor com momentos marcantes de cumplicidade! Nossos kits exclusivos para o Dia dos Namorados acompanham óleos essenciais e hidratantes corporais perfumados. Surpreenda!"
        },
        {
          day: "20",
          title: "Dia da Consultora de Beleza",
          opportunity: "Fortalecer o consultor de beleza interno, diagnósticos personalizados e fidelização assistida.",
          message: "Que tal um diagnóstico de pele e cabelo gratuito realizado pela sua consultora Biobel favorita? 👩‍⚕️ Agende um horário e ganhe uma receita de autocuidado montada especialmente para você."
        },
        {
          day: "24",
          title: "Festa de São João (Arraiá da Beleza)",
          opportunity: "Gatilho de arraiá temático. Jogos virtuais de raspadinha de cupons ou brindes de doce típico no pedido.",
          message: "Olha a beleza junina passando! É verdade! 🎉 Nosso Arraiá de Ofertas tem descontos de até 25% para proteger seus lábios e rosto das baixas temperaturas deste mês."
        }
      ]
    },
    {
      month: "Julho",
      theme: "Frio de Inverno, Hidratação Facial & Amizade",
      events: [
        {
          day: "20",
          title: "Dia do Amigo",
          opportunity: "Promoções do tipo 'Indique um amigo e ganhem 15% OFF'. Brindes duplos para compras compartilhadas.",
          message: "Amigas que fazem skincare juntas, permanecem juntas! 💖 Neste Dia do Amigo, compre um tratamento e leve o segundo para presentear quem está sempre com você com 50% de desconto!"
        },
        {
          day: "26",
          title: "Dia dos Avós",
          opportunity: "Cuidados voltados a peles maduras, cremes de toque luxuoso para as mãos, óleos de banho clássicos.",
          message: "Surpreenda quem te dá os melhores conselhos! Dê carinho em forma de produtos hidratantes ideais para peles maduras para mãos e pernas. Fale conosco!"
        },
        {
          day: "29",
          title: "Dia Mundial do Batom",
          opportunity: "Incentivo de maquiagem, compre um batom e ganhe lápis de boca, workshops rápidos de make.",
          message: "O clássico que nunca sai de moda! 💄 Comemore o Dia Mundial do Batom com batons das melhores marcas com descontos progressivos: leve 2, pague 1,5 ou leve 3 e pague apenas 2!"
        }
      ]
    },
    {
      month: "Agosto",
      theme: "Dia dos Pais, Campanhas Especiais de Inverno & Ofertas",
      events: [
        {
          day: "2º Dom",
          title: "Dia dos Pais",
          opportunity: "Gama masculina: sprays antiqueda, hidratantes pós-barba nutritivos e sabonetes refrescantes.",
          message: "Seu herói também merece cuidado diário! Neste Dia dos Pais, dê de presente colônias clássicas e loções pós-barba suavizantes para modernizar a rotina dele. Peça nosso catálogo!"
        },
        {
          day: "09",
          title: "Especial 9 de Agosto (Venda Express)",
          opportunity: "Gatilho e campanha fantástica de meio de mês. Ideal para aquecer o caixa em agosto com descontos rápidos.",
          message: "🔥 CAMPANHA EXCLUSIVA DO DIA 9 DE AGOSTO! Só hoje na Biobel: leve o combo completo de renovação facial, e ganhe inteiramente de brinde um óleo iluminador corporal! Não perca!"
        },
        {
          day: "31",
          title: "Dia do Nutricionista / Beleza de Dentro para Fora",
          opportunity: "Combos de colágeno, nutricosméticos, chás desintoxicantes e rotinas saudáveis integradas.",
          message: "Sua beleza começa de dentro! 🍏 No Dia do Nutricionista, venha conhecer nossa seleção exclusiva de colágenos hidrolisados e suplementos de beleza interna com 15% OFF especial."
        }
      ]
    },
    {
      month: "Setembro",
      theme: "Dia do Cliente & Chegada da Primavera",
      events: [
        {
          day: "15",
          title: "Dia do Cliente (Semana Inteira)",
          opportunity: "Uma das datas cruciais do varejo. Distribuição de flores, bombons, amostras grátis e cashback real.",
          message: "Oi [nome], hoje o dia é inteiro dedicado a você! Como forma de agradecer seu carinho e amizade, todas as compras de hoje ganham frete grátis e um brinde surpresa ultra cheiroso na sacola!"
        },
        {
          day: "22",
          title: "Início da Primavera",
          opportunity: "Trabalhar perfumes florais, hidratantes levíssimos, tônicos refrescantes e cores radiantes.",
          message: "A época mais florida e colorida do ano chegou! 💐 Perfume sua vida e sua pele com os extratos florais e águas termais queridinhos da nossa curadoria. Venha ver nossas novidades de Primavera!"
        },
        {
          day: "30",
          title: "Dia da Secretária",
          opportunity: "Parcerias de vale-presente corporativos e mimos rápidos para equipe administrativa.",
          message: "Quem cuida de tudo com tanta dedicação merece um dia especial de mimos! 💼 Surpreenda as secretárias e assistentes da sua empresa com vales-massagem relaxantes Biobel."
        }
      ]
    },
    {
      month: "Outubro",
      theme: "Prevenção Outubro Rosa & Dia das Crianças",
      events: [
        {
          day: "Outubro",
          title: "Outubro Rosa (Mês Inteiro)",
          opportunity: "Apoio social e incentivo ao autocuidado integral feminino. Ofereça cupons temáticos e guias informativos.",
          message: "Se amar é se cuidar diariamente! 💗 A Biobel apoia a conscientização do Outubro Rosa. Escolha qualquer loção corporal neste mês e 10% do valor será revertido para parcerias de saúde feminina."
        },
        {
          day: "12",
          title: "Dia das Crianças / Família unida",
          opportunity: "Kit mãe/filha de bem-estar suave, cosméticos infantis hipoalergênicos dermatologicamente testados.",
          message: "Neste Dia das Crianças, que tal criar momentos de conexão com os pequenos? Descubra colônias suaves e espumas divertidas hipoalergênicas livres de parabenos!"
        }
      ]
    },
    {
      month: "Novembro",
      theme: "Black Friday Extrema & Saúde Masculina",
      events: [
        {
          day: "Novembro",
          title: "Novembro Azul",
          opportunity: "Conscientização masculina, higiene pessoal gourmet, ceras modeladoras e óleos para barba.",
          message: "Homens modernos cuidam da saúde e do visual! Conheça nossa seleção de séruns de crescimento, tônicos purificantes e fragrâncias marcantes com condições especiais de incentivo neste mês!"
        },
        {
          day: "Fim do Mês",
          title: "Black Friday",
          opportunity: "Época de maior faturamento do ano. Planeje ofertas transparentes, queima de estoque e cupons relâmpago.",
          message: "🔥 A BLACK FRIDAY REAL CHEGOU! Prepare-se para os descontos mais arrebatadores do ano: até 50% OFF em tratamentos e produtos campeões de vendas Biobel. Clique para garantir a sua sacola!"
        }
      ]
    },
    {
      month: "Dezembro",
      theme: "Natal Encantado, Amigo Secreto & Festas de Fim de Ano",
      events: [
        {
          day: "Dezembro",
          title: "Festividades de Natal / Presentes",
          opportunity: "Pico absoluto no ano. Kits prontos com embalagens especiais, sacolas refinadas e laços elegantes.",
          message: "Natal é momento de espalhar carinho e autoestima! 🎄 Evite shoppings lotados e compre belíssimos kits de presente originais na Biobel, embalados à mão com fitas luxuosas. Reserve já os seus!"
        },
        {
          day: "31",
          title: "Ano Novo / Pele Iluminada",
          opportunity: "Iluminadores dourados, sprays fixadores de maquiagem para a virada e ampolas detox pós-festa.",
          message: "Pronta para brilhar na chegada de 2026? 🥂 Garanta seu hidratante corporal iluminador de rápida absorção e arrase na festa da virada com uma pele naturalmente iluminada e cheia de glamour!"
        }
      ]
    }
  ], []);

  const postSaleRules = useMemo(() => ({
    t1: {
      title: "Mimo & Gratidão (1 dia após)",
      desc: "Agradecer a preferência e colher feedback imediato.",
      emoji: "💖",
      template: "Oi [nome_cliente]! Tudo bem? Passando para te agradecer de coração pela visita ontem na Biobel! Tomara que você ame muito os mimos que levou: [produtos]. Se tiver qualquer dúvida sobre a ordem de aplicação ou modo de usar, pode me mandar mensagem por aqui, viu? Tenha um dia lindo! Beijos, [vendedora]."
    },
    t7: {
      title: "Feedback de Uso (7 dias após)",
      desc: "Analisar adaptação com os produtos e demonstrar cuidado real.",
      emoji: "✨",
      template: "Olá [nome_cliente], como você está? Faz uma semana que você garantiu os produtos [produtos] conosco na Biobel! Passando para saber se você já adicionou eles na sua rotina de pele e o que está achando dos resultados? Conta para mim se deu tudo certinho no uso diário!"
    },
    t15: {
      title: "Novidades Complementares (15 dias após)",
      desc: "Gatilho de nova compra baseado nos mimos anteriores.",
      emoji: "🌸",
      template: "Oi [nome_cliente]! Tudo certinho por aí? Estava arrumando os novos itens da loja e na hora lembrei de você! Como faz uns 15 dias que você comprou [produtos], queria te contar que recebemos novidades que combinam super bem para criar um tratamento ainda mais potente. Topa agendar uma visita essa semana para conhecer antes de acabar?"
    },
    t30: {
      title: "Reativação & Cupom de Saudade (30 dias após)",
      desc: "Recuperar clientes inativos há 30 dias com cupom personalizado.",
      emoji: "⭐",
      template: "Oi [nome_cliente], que saudade! Tudo bem com você? Faz um mês que você levou os seus mimos na sua última comprinha em [data_compra]. Para deixar seu dia ainda mais feliz, liberei um benefício exclusivo de 10% OFF em qualquer item do nosso site ou loja física essa semana: o cupom [cupom]. O que acha de passar aqui e fazer um detox maravilhoso?"
    }
  }), []);

  // Pre-select most recent customer with a sale on mount
  useEffect(() => {
    if (sales.length > 0 && !selectedCustomerId) {
      const recentSalesWithCustomer = [...sales]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .filter(s => s.customerId);
      if (recentSalesWithCustomer.length > 0 && recentSalesWithCustomer[0].customerId) {
        setSelectedCustomerId(recentSalesWithCustomer[0].customerId);
      } else if (customers.length > 0) {
        setSelectedCustomerId(customers[0].id);
      }
    }
  }, [sales, customers, selectedCustomerId]);

  // Find last sale details for selected customer
  const customerLastSale = useMemo(() => {
    if (!selectedCustomerId) return null;
    const customerSales = sales
      .filter(s => s.customerId === selectedCustomerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return customerSales[0] || null;
  }, [selectedCustomerId, sales]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  // Handle variable replacement in post-sale customizedMessage
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomizedMessage('');
      return;
    }
    const ruleObj = postSaleRules[selectedRule];
    let msg = ruleObj.template;
    
    const names = selectedCustomer.name.split(' ');
    const firstName = names[0] ? names[0].charAt(0).toUpperCase() + names[0].slice(1).toLowerCase() : 'Cliente';
    const fullName = selectedCustomer.name.toUpperCase();

    const productsList = customerLastSale 
      ? customerLastSale.items.map(i => i.name).join(', ')
      : 'seus itens queridinhos de autocuidado';

    const dateFormatted = customerLastSale 
      ? customerLastSale.date.split('T')[0].split('-').reverse().join('/')
      : 'sua última visita';

    const vendedoraName = customerLastSale?.vendedora 
      ? customerLastSale.vendedora.toUpperCase() 
      : 'SUA CONSULTORA BIOBEL';

    msg = msg
      .replace(/\[nome_cliente\]/g, firstName)
      .replace(/\[produtos\]/g, productsList)
      .replace(/\[data_compra\]/g, dateFormatted)
      .replace(/\[vendedora\]/g, vendedoraName)
      .replace(/\[cupom\]/g, discountCoupon);

    setCustomizedMessage(msg);
  }, [selectedCustomerId, selectedRule, discountCoupon, customerLastSale, selectedCustomer, postSaleRules]);

  const handleOpenModal = (c?: Campaign) => {
    if (c) {
      setEditingCampaign(c);
      setFormData(c);
    } else {
      setEditingCampaign(null);
      setFormData({ name: '', message: '', type: 'custom' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.message) {
      addNotification('Preencha nome e mensagem.', 'warning');
      return;
    }

    const campaignData = {
      ...formData,
      id: editingCampaign?.id || `C${Date.now()}`,
      createdAt: editingCampaign?.createdAt || new Date().toISOString()
    } as Campaign;

    try {
      if (editingCampaign) {
        setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? campaignData : c));
      } else {
        setCampaigns(prev => [...prev, campaignData]);
      }
      addNotification('Campanha salva com sucesso!', 'success');
      setIsModalOpen(false);
    } catch (error: any) {
      addNotification('Erro ao salvar campanha.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta campanha?')) return;
    try {
      setCampaigns(prev => prev.filter(c => c.id !== id));
      addNotification('Campanha removida com sucesso.', 'info');
    } catch (error: any) {
      addNotification('Erro ao remover campanha.', 'error');
    }
  };

  const getTargetCount = (type: Campaign['type']) => {
    const today = new Date();
    
    if (type === 'new_customers') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      return customers.filter(c => c.createdAt && new Date(c.createdAt) >= sevenDaysAgo).length;
    }
    
    if (type === 'retention_30d') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      return customers.filter(customer => {
        const customerSales = sales.filter(s => s.customerId === customer.id);
        if (customerSales.length === 0) return true;
        
        const lastSaleDate = new Date(Math.max(...customerSales.map(s => new Date(s.date).getTime())));
        return lastSaleDate < thirtyDaysAgo;
      }).length;
    }
    
    return customers.length;
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    addNotification('Copiado para a área de transferência!', 'success');
  };

  const handleCreateCampaignFromCelebration = (title: string, message: string) => {
    setFormData({
      name: `Campanha: ${title}`,
      message: message,
      type: 'custom'
    });
    setEditingCampaign(null);
    setIsModalOpen(true);
    setActiveCampTab('ativos');
    addNotification('Abrimos o formulário com o rascunho de campanha pronto! 🚀', 'info');
  };

  const handleSendWhatsAppPostSale = (phone: string, text: string) => {
    if (!phone) {
      addNotification('Esse cliente não possui telefone cadastrado!', 'warning');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    addNotification('WhatsApp aberto com a mensagem carregada!', 'success');
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const query = customerSearch.toLowerCase();
      return c.name.toLowerCase().includes(query) || c.phone.replace(/\D/g, '').includes(query);
    }).slice(0, 5); // top 5 matches
  }, [customerSearch, customers]);

  return (
    <div className="space-y-8">
      {/* Explanation Section */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-600 rounded-[40px] p-8 text-white shadow-xl shadow-blue-100 dark:shadow-none relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/15">
                <Sparkles size={24} className="text-amber-300" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Posto de Marketing Biobel</h2>
                <p className="text-xs font-bold text-blue-100 mt-0.5 tracking-wide uppercase">Campanhas Rápidas, Calendário de Vendas Sazonais & Pós-Venda WhatsApp</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex gap-3">
              <span className="text-2xl">📣</span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-200">Campanhas Ativas</h4>
                <p className="text-[11px] font-medium leading-relaxed text-blue-50 mt-1">Gere mensagens em massa integradas com seu CRM e segmentações.</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-200">Calendário de Festas</h4>
                <p className="text-[11px] font-medium leading-relaxed text-blue-50 mt-1">Consulte o que comemorar em cada mês do ano, como Dia dos Namorados ou 9 de Agosto.</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-200">Pós-venda Inteligente</h4>
                <p className="text-[11px] font-medium leading-relaxed text-blue-50 mt-1">Dispare mensagens de pós-venda personalizadas para fidelizar suas clientes.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Elegant Sub-Tab Switcher */}
      <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[24px] max-w-4xl mx-auto border border-slate-200/40 dark:border-slate-800 gap-1 md:gap-0">
        <button 
          onClick={() => setActiveCampTab('notificacoes')}
          className={cn(
            "flex-1 py-3 px-4 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-2",
            activeCampTab === 'notificacoes' 
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md animate-fade-in" 
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          <Bell size={14} className="text-yellow-500 animate-bounce" />
          Central de Notificações
        </button>
        <button 
          onClick={() => setActiveCampTab('ativos')}
          className={cn(
            "flex-1 py-3 px-4 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-2",
            activeCampTab === 'ativos' 
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md" 
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          <Megaphone size={14} />
          Campanhas Ativas
        </button>
        <button 
          onClick={() => setActiveCampTab('calendario')}
          className={cn(
            "flex-1 py-3 px-4 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-2",
            activeCampTab === 'calendario' 
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md" 
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          <Calendar size={14} />
          Calendário Festivos
        </button>
        <button 
          onClick={() => setActiveCampTab('pos-venda')}
          className={cn(
            "flex-1 py-3 px-4 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-2",
            activeCampTab === 'pos-venda' 
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md" 
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          <MessageCircle size={14} />
          Pós-Venda WhatsApp
        </button>
      </div>

      {/* Contents based on Subtab */}
      {activeCampTab === 'notificacoes' && (
        <div className="space-y-8 animate-fade-in p-1">
          {/* Header Dashboard section */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-650 to-indigo-800 rounded-[35px] p-8 text-white relative overflow-hidden shadow-xl border border-blue-500/10">
            <div className="relative z-10 space-y-3">
              <span className="bg-blue-500/30 text-blue-100 text-[9px] font-black tracking-widest px-3 py-1 rounded-full uppercase border border-white/10">
                🔔 CENTRAL COGNITIVA & CRONOGRAMAS
              </span>
              <h3 className="text-3xl font-black uppercase tracking-tight">Central de Notificações & Alertas</h3>
              <p className="text-xs font-semibold text-blue-100 max-w-xl leading-relaxed">
                Gerencie réguas de relacionamento com o cliente em tempo real, configure e copie e-mails e mensagens de WhatsApp, e monitore alertas corporativos cruciais de estoque, metas e aniversários de forma automatizada.
              </p>
              
              {/* Quick stats ribbon */}
              <div className="flex flex-wrap gap-4 pt-3">
                <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-3 border border-white/10">
                  <div className="text-lg">🎂</div>
                  <div>
                    <p className="text-[9px] font-extrabold text-blue-200 uppercase tracking-wider">Aniversariantes Hoje</p>
                    <p className="text-sm font-black">{customers.filter(c => {
                      if (!c.birthDate) return false;
                      const parts = c.birthDate.split('-');
                      if (parts.length < 2) return false;
                      const today = new Date();
                      const currentMonthStr = String(today.getMonth() + 1).padStart(2, '0');
                      const currentDayStr = String(today.getDate()).padStart(2, '0');
                      return parts[1] === currentMonthStr && parts[2] === currentDayStr;
                    }).length} Clientes</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-3 border border-white/10">
                  <div className="text-lg">🚨</div>
                  <div>
                    <p className="text-[9px] font-extrabold text-blue-200 uppercase tracking-wider">Estoque Crítico</p>
                    <p className="text-sm font-black">{products.filter(p => p.stock <= (p.minStock || 3)).length} Itens</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-3 border border-white/10">
                  <div className="text-lg">💰</div>
                  <div>
                    <p className="text-[9px] font-extrabold text-blue-200 uppercase tracking-wider">Faturamento Mês</p>
                    <p className="text-sm font-black">{formatCurrency(
                      sales.filter(s => {
                        if (!s.date || s.status === 'cancelled') return false;
                        const d = new Date(s.date);
                        return d.getFullYear() === new Date().getFullYear() && d.getMonth() === new Date().getMonth();
                      }).reduce((acc, s) => acc + (s.total || 0), 0)
                    )}</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Visual ambient graphic */}
            <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: System Bulletins & Alerts */}
            <div className="lg:col-span-5 space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
                📌 Alertas do Sistema & Lembretes
              </h4>

              {/* 1. Monthly Goals Tracker Card */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[30px] border border-slate-150 dark:border-slate-800 space-y-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded uppercase tracking-wider">
                      Metas Mensais
                    </span>
                    <h5 className="text-sm font-black text-slate-800 dark:text-white uppercase">Alerta de Faturamento</h5>
                  </div>
                  <Target size={20} className="text-blue-500" />
                </div>

                {(() => {
                  const totalCurrentMonthSales = sales.filter(s => {
                    if (!s.date || s.status === 'cancelled') return false;
                    const d = new Date(s.date);
                    return d.getFullYear() === new Date().getFullYear() && d.getMonth() === new Date().getMonth();
                  }).reduce((acc, s) => acc + (s.total || 0), 0);

                  const activeMonthGoal = (() => {
                    const currentMonthNum = new Date().getMonth() + 1;
                    const currentYear = new Date().getFullYear();
                    const targetId = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
                    const found = monthlyGoals.find(g => g.id === targetId || String(g.month) === String(currentMonthNum));
                    return found ? found.storeGoal : 15000;
                  })();

                  const goalPercent = Math.min(100, Math.round((totalCurrentMonthSales / activeMonthGoal) * 100)) || 0;
                  const isSafe = goalPercent >= 75;
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>Progresso do Mês</span>
                        <span className={cn("font-black", isSafe ? "text-emerald-500" : "text-amber-500")}>
                          {goalPercent}% ({formatCurrency(totalCurrentMonthSales)} / {formatCurrency(activeMonthGoal)})
                        </span>
                      </div>
                      
                      {/* Custom visual progress bar */}
                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            isSafe ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-amber-400 to-orange-500"
                          )}
                          style={{ width: `${goalPercent}%` }}
                        />
                      </div>

                      <div className={cn(
                        "p-3 rounded-2xl text-[10px] font-bold uppercase tracking-tight flex items-start gap-2.5 border border-dashed",
                        isSafe 
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-emerald-250" 
                          : "bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border-amber-250"
                      )}>
                        <span className="text-base leading-none">💡</span>
                        <p className="leading-relaxed font-semibold">
                          {isSafe 
                            ? "Ótimo engajamento e ritmo comercial! Mantendo o fluxo o faturamento superará o mínimo configurado." 
                            : `O ritmo de vendas está abaixo do ideal. Faltam ${formatCurrency(activeMonthGoal - totalCurrentMonthSales)} para bater a meta. Estimule de forma proativa novas coleções com seus clientes.`}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 2. Today's Birthdays Alerts Card */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[30px] border border-slate-150 dark:border-slate-800 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded uppercase tracking-wider">
                      CRM Aniversariantes
                    </span>
                    <h5 className="text-sm font-black text-slate-800 dark:text-white uppercase">Aniversários de Hoje</h5>
                  </div>
                  <Gift size={20} className="text-amber-500" />
                </div>

                {(() => {
                  const today = new Date();
                  const currentMonthStr = String(today.getMonth() + 1).padStart(2, '0');
                  const currentDayStr = String(today.getDate()).padStart(2, '0');
                  
                  const todayBirthdays = customers.filter(c => {
                    if (!c.birthDate) return false;
                    const parts = c.birthDate.split('-');
                    if (parts.length < 2) return false;
                    return parts[1] === currentMonthStr && parts[2] === currentDayStr;
                  });

                  if (todayBirthdays.length === 0) {
                    return (
                      <div className="p-4 bg-slate-50 dark:bg-slate-850/50 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">🌸 NENHUM ANIVERSIÁRIO HOJE</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1">Nenhum cliente assinalado com data de nascimento hoje.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {todayBirthdays.map(c => (
                        <div 
                          key={c.id} 
                          className="p-3 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/10 rounded-2xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-slate-800 dark:text-slate-200 uppercase truncate">{c.name}</p>
                            <span className="text-[9px] font-mono text-slate-400 mt-0.5 block">{c.phone || "Celular não cadastrado"}</span>
                          </div>
                          
                          <button
                            onClick={() => {
                              setSelectedNotifCustId(c.id);
                              setSelectedNotifTemplate('promocao');
                              addNotification(`Modelo de parabéns carregado para ${c.name}! Ajuste no painel lateral.`, 'success');
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 shrink-0"
                          >
                            <Send size={10} />
                            Parabenizar
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* 3. Critical Stock Alertas Card */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[30px] border border-slate-150 dark:border-slate-800 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded uppercase tracking-wider">
                      Estoque Ativo
                    </span>
                    <h5 className="text-sm font-black text-slate-800 dark:text-white uppercase">Alerta de Estoque Crítico</h5>
                  </div>
                  <AlertTriangle size={20} className="text-rose-600 animate-pulse" />
                </div>

                {(() => {
                  const criticalStockProducts = products.filter(p => p.stock <= (p.minStock || 3)).slice(0, 5);

                  if (criticalStockProducts.length === 0) {
                    return (
                      <div className="p-4 bg-slate-50 dark:bg-slate-850/50 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">✔️ ESTOQUE SEGURO & COMPLETO</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1 block">Todos os mimos com níveis superiores ao estoque mínimo.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {criticalStockProducts.map(p => (
                        <div 
                          key={p.id} 
                          className="p-3 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100/55 dark:border-rose-900/10 rounded-2xl flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-extrabold text-slate-850 dark:text-slate-200 truncate uppercase">{p.name}</p>
                            <p className="text-[9px] font-mono text-slate-400 mt-0.5">Mínimo ideal: {p.minStock || 3} un</p>
                          </div>
                          <span className={cn(
                            "px-2 py-1 text-[10px] font-mono font-bold rounded-lg shrink-0",
                            p.stock <= 0 
                              ? "bg-rose-200 text-rose-800 dark:bg-rose-950 dark:text-rose-400" 
                              : "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
                          )}>
                            Atual: {p.stock} un
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* 4. Automated Reminders Activities */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[30px] border border-slate-150 dark:border-slate-800 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded uppercase tracking-wider">
                      Lembretes Diários
                    </span>
                    <h5 className="text-sm font-black text-slate-800 dark:text-white uppercase">Checklist & CRM Clientes Inativos</h5>
                  </div>
                  <Clock size={20} className="text-indigo-500" />
                </div>

                <div className="space-y-3">
                  {/* Checklist indicator */}
                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const todayRoutines = routines.filter(r => r.date === todayStr);
                    let totalActivities = 0;
                    let completedActivities = 0;
                    
                    todayRoutines.forEach(r => {
                      if (r.activities) {
                        totalActivities += r.activities.length;
                        completedActivities += r.activities.filter(a => a.completed).length;
                      }
                    });

                    return (
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-850/50 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <p className="font-extrabold text-slate-800 dark:text-slate-200 uppercase">📋 Checklist Diário das Vendedoras</p>
                          <p className="text-[10px] font-semibold text-slate-500 leading-snug">
                            {totalActivities > 0 
                              ? `Atividades de hoje: ${completedActivities} de ${totalActivities} concluídas pelas consultoras.`
                              : "A rotina checklist diária da equipe operacional no PDV ainda não foi iniciada hoje."}
                          </p>
                        </div>
                        {totalActivities > 0 && completedActivities < totalActivities && (
                          <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-750 text-[8px] font-black uppercase rounded shrink-0">
                            Pendente
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Absent Customer list */}
                  {(() => {
                    const today = new Date();
                    const inactiveCustomers = customers.filter(c => {
                      const custSales = sales.filter(s => s.customerId === c.id);
                      if (custSales.length === 0) return true;
                      const lastSale = custSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                      const daysSince = (today.getTime() - new Date(lastSale.date).getTime()) / (1000 * 60 * 60 * 24);
                      return daysSince > 60;
                    }).slice(0, 3);

                    if (inactiveCustomers.length === 0) return null;

                    return (
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-850/50 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-xs">
                        <p className="font-extrabold text-slate-800 dark:text-slate-200 uppercase">👤 Reativação: Clientes Ausentes (&gt;60 dias)</p>
                        <p className="text-[10px] font-semibold text-slate-500 leading-snug pb-2">
                          Clientes cadastrados no CRM que não efetuam compras há mais de dois meses:
                        </p>
                        
                        <div className="space-y-1.5 pt-2 border-t border-slate-150 dark:border-slate-800">
                          {inactiveCustomers.map(c => (
                            <div key={c.id} className="flex justify-between items-center py-0.5">
                              <span className="font-bold text-[10px] text-slate-700 dark:text-slate-350 uppercase truncate max-w-[150px]">{c.name}</span>
                              <button
                                onClick={() => {
                                  setSelectedNotifCustId(c.id);
                                  setSelectedNotifTemplate('retorno');
                                  addNotification(`Mensagem de reativação carregada para ${c.name}!`, 'info');
                                }}
                                className="text-[8px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                Carregar Modelo WhatsApp
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive trigger interface for Whatsapp & Email */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[35px] border border-slate-150 dark:border-slate-800 flex flex-col justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-6">
                
                {/* Channel Selector Tab inside the widget */}
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h4 className="text-md font-black text-slate-950 dark:text-white uppercase tracking-tight">Estúdio de Comunicação & Disparos</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Selecione o canal para construir e customizar notificações</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-850 p-1 rounded-2xl border border-slate-150 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setSelectedNotifTemplate('agradece');
                    }}
                    className={cn(
                      "py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                      selectedNotifTemplate ? "bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <MessageCircle size={12} className="text-emerald-500" />
                    Canal WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNotifTemplate(null as any);
                    }}
                    className={cn(
                      "py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                      !selectedNotifTemplate ? "bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Mail size={12} className="text-blue-500" />
                    Canal E-mail Marketing
                  </button>
                </div>

                {/* WHATSAPP LAYOUT FORM */}
                {selectedNotifTemplate && (
                  <div className="space-y-4 animate-fade-in">
                    
                    {/* Customer Selection Block */}
                    <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">1. Escolher Cliente do CRM</label>
                        {currentNotifCust && (
                          <span className="text-[8px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                            Selecionado
                          </span>
                        )}
                      </div>

                      {/* Dropdown with filter */}
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                          <input
                            type="text"
                            className="w-full bg-white dark:bg-slate-900 pl-9 pr-4 py-2 rounded-xl border border-slate-150 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-bold"
                            placeholder="Pesquisar por nome ou celular para carregar..."
                            value={notifSearchQuery}
                            onChange={(e) => setNotifSearchQuery(e.target.value)}
                          />
                        </div>

                        {notifSearchQuery && (
                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-150 dark:border-slate-800 max-h-32 overflow-y-auto space-y-0.5 shadow-md">
                            {customers.filter(c => c.name.toLowerCase().includes(notifSearchQuery.toLowerCase())).slice(0, 5).map(c => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setSelectedNotifCustId(c.id);
                                  setNotifSearchQuery('');
                                }}
                                className="w-full text-left p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold uppercase transition-colors flex justify-between"
                              >
                                <span>{c.name}</span>
                                <span className="font-mono text-[9px] text-slate-400 mt-0.5">{c.phone || "S/ Celular"}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        <select
                          value={selectedNotifCustId}
                          onChange={(e) => setSelectedNotifCustId(e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-155 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-xs uppercase"
                        >
                          <option value="">-- Selecione o Cliente Principal --</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      {/* Quick history card widget */}
                      {currentNotifCust && (
                        <div className="p-3 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/30 rounded-xl space-y-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          <p className="font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                            👤 Cadastro de CRM: {currentNotifCust.name.toUpperCase()}
                          </p>
                          <p>📱 Whatsapp de Contato: <span className="font-mono text-slate-800 dark:text-white">{currentNotifCust.phone || "Não informado"}</span></p>
                          {currentNotifCustLastSale ? (
                            <p>🛍️ Comprado em {currentNotifCustLastSale.date.split('T')[0].split('-').reverse().join('/')}: {currentNotifCustLastSale.items.map(i => i.name).join(', ')} (Vendedora: {currentNotifCustLastSale.vendedora})</p>
                          ) : (
                            <p className="italic text-slate-405">Nenhum histórico comercial localizado. Variáveis padrão serão inseridas.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Template Choice selection rows */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">2. Selecionar Modelo de Notificação</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'agradece', emoji: '🌟', title: 'Boas-Vindas / Agradecer', desc: 'Pós-Compra imediata' },
                          { id: 'retorno', emoji: '🌸', title: 'Aviso de Retorno', desc: 'Reativação de 30 dias' },
                          { id: 'cobranca', emoji: '💰', title: 'Lembrete de Cobrança', desc: 'Sinalizar faturas' },
                          { id: 'promocao', emoji: '🎉', title: 'Parabéns & Cupom', desc: 'Aniversariantes & Brindes' }
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => setSelectedNotifTemplate(t.id as any)}
                            className={cn(
                              "p-2.5 rounded-xl text-left border text-xs font-bold transition-all flex gap-2 items-start",
                              selectedNotifTemplate === t.id 
                                ? "bg-slate-900 dark:bg-slate-800 border-slate-900 text-white shadow-md"
                                : "bg-white dark:bg-slate-900 hover:bg-slate-50 border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-350"
                            )}
                          >
                            <span className="text-lg">{t.emoji}</span>
                            <div>
                              <p className="font-extrabold uppercase text-[10px]">{t.title}</p>
                              <p className="text-[8px] font-semibold text-slate-400 mt-0.5">{t.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview message card */}
                    <div className="space-y-2.5 pt-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                        <span>3. Visualização Inteligente & Edição Manual</span>
                        <span className="font-mono text-slate-400 font-medium text-[9px]">{notifCustomMessage.length} caracteres</span>
                      </label>
                      <textarea
                        rows={5}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={notifCustomMessage}
                        onChange={(e) => setNotifCustomMessage(e.target.value)}
                      />
                    </div>

                    {/* Actions bar Trigger */}
                    {selectedNotifCustId ? (
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          onClick={() => {
                            if (!currentNotifCust?.phone) {
                              addNotification('Este cliente não possui um telefone celular válido cadastrado.', 'warning');
                              return;
                            }
                            const cleanedPhone = currentNotifCust.phone.replace(/\D/g, '');
                            const encodedText = encodeURIComponent(notifCustomMessage);
                            const url = `https://api.whatsapp.com/send?phone=55${cleanedPhone}&text=${encodedText}`;
                            window.open(url, '_blank');
                            addNotification(`Direcionando para o WhatsApp Web/App de ${currentNotifCust.name}!`, 'success');
                          }}
                          className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 dark:shadow-none"
                        >
                          <MessageCircle size={15} />
                          Abrir Canal WhatsApp (Envio Automático)
                        </button>
                        
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(notifCustomMessage);
                            addNotification('Texto copiado com sucesso! Pronto para colar.', 'success');
                          }}
                          className="px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-205 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-black uppercase text-[10px] tracking-wider transition-colors flex items-center justify-center gap-1.5"
                        >
                          <ClipboardList size={12} />
                          Copiar Texto
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-center text-[10px] font-black text-amber-600 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-900/30 uppercase tracking-wider">
                        ⚠️ Escolha um cliente destinatário acima para autorizar o envio personalizado
                      </div>
                    )}
                  </div>
                )}

                {/* EMAIL MARKETING LAYOUT FORM */}
                {!selectedNotifTemplate && (
                  <div className="space-y-4 animate-fade-in">
                    
                    {/* Template Choice selection rows */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">1. Selecionar Modelo de E-mail Corporativo</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'boasvindas', emoji: '💌', title: 'Boas-Vindas Club' },
                          { id: 'lancamento', emoji: '✨', title: 'Novo Lançamento' },
                          { id: 'promocional', emoji: '🔥', title: 'Campanha Outlet' }
                        ].map(m => (
                          <button
                            key={m.id}
                            onClick={() => setSelectedEmailTemplate(m.id as any)}
                            className={cn(
                              "p-2 py-3 rounded-xl border text-center text-xs font-black transition-all flex flex-col items-center gap-1 justify-center",
                              selectedEmailTemplate === m.id 
                                ? "bg-slate-900 dark:bg-slate-800 border-slate-900 text-white shadow-md"
                                : "bg-white dark:bg-slate-900 hover:bg-slate-50 border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                            )}
                          >
                            <span className="text-xl">{m.emoji}</span>
                            <span className="uppercase text-[9px] tracking-wider block mt-1">{m.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subject input */}
                    <div className="space-y-1.55">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Assunto do E-mail</label>
                      <input
                        type="text"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                        value={customEmailSubject}
                        onChange={(e) => setCustomEmailSubject(e.target.value)}
                      />
                    </div>

                    {/* Text block editor */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Corpo do E-mail (Texto Editável)</label>
                      <textarea
                        rows={6}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl font-bold font-sans text-xs leading-relaxed focus:outline-none"
                        value={customEmailBody}
                        onChange={(e) => setCustomEmailBody(e.target.value)}
                      />
                    </div>

                    {/* INTERACTIVE NEWSLETTER MOCKUP PREVIEW */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">📰 Visualização Responsiva do E-mail</label>
                      
                      <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 font-sans max-w-sm mx-auto shadow-inner">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-850 overflow-hidden text-slate-750 dark:text-slate-300">
                          
                          {/* Banner Header */}
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-center text-white space-y-1">
                            <span className="text-[8px] font-black tracking-widest bg-white/20 px-2 py-0.5 rounded-full uppercase">BIOBEL COSMÉTICOS</span>
                            <h6 className="text-[10px] font-black uppercase tracking-tight">Clube de Vantagens Luxo</h6>
                          </div>

                          {/* Content Area */}
                          <div className="p-4 space-y-3 text-[10px]">
                            <p className="font-extrabold text-slate-800 dark:text-white uppercase border-b border-slate-100 dark:border-slate-800 pb-1">{customEmailSubject}</p>
                            <div className="whitespace-pre-line text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                              {customEmailBody}
                            </div>
                            
                            {/* Decorative Promo Tag */}
                            <div className="bg-blue-50 dark:bg-blue-950/25 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40 border-dashed text-center text-blue-700 dark:text-blue-400 font-extrabold text-[9px] uppercase tracking-wider space-y-1">
                              <p>🎁 CUPOM VIP IDENTIFICADO</p>
                              <p className="text-xs font-black tracking-widest bg-white dark:bg-slate-900 border border-blue-200/50 dark:border-blue-800 py-1 rounded">CLIENTEVIP10</p>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="bg-slate-50 dark:bg-slate-850 p-3 text-center text-[7px] font-semibold text-slate-400 border-t border-slate-100 dark:border-slate-800/40">
                            <p>© 2026 Biobel Cosméticos. Todos os direitos reservados.</p>
                            <p className="mt-0.5">Deseja cancelar a inscrição? Clique para remover o e-mail.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Copy and share buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        onClick={() => {
                          const clipboardContent = `Assunto: ${customEmailSubject}\n\n${customEmailBody}`;
                          navigator.clipboard.writeText(clipboardContent);
                          addNotification('Conteúdo do e-mail (Assunto + Corpo) copiado para clipboard!', 'success');
                        }}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-xs tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <ClipboardList size={13} />
                        Copiar Completo
                      </button>

                      <button
                        onClick={() => {
                          const htmlTemplate = `
<div style="background-color: #f8fafc; padding: 20px; font-family: system-ui, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <div style="background: linear-gradient(to right, #2563eb, #4f46e5); padding: 25px; text-align: center; color: #ffffff;">
      <span style="font-size: 10px; font-weight: 800; letter-spacing: 2px;">BIOBEL COSMÉTICOS</span>
      <h2 style="margin: 5px 0 0 0; font-size: 18px; font-weight: 950; text-transform: uppercase;">Clube de Vantagens Luxo</h2>
    </div>
    <div style="padding: 25px;">
      <h3 style="margin-top: 0; font-size: 14px; font-weight: 900; color: #1e293b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">${customEmailSubject}</h3>
      <p style="font-size: 12px; color: #475569; line-height: 1.6; white-space: pre-line;">${customEmailBody}</p>
      
      <div style="background-color: #eff6ff; border: 1px dashed #3b82f6; padding: 15px; border-radius: 12px; text-align: center; margin-top: 20px;">
        <span style="font-size: 9px; font-weight: 800; color: #1d4ed8; letter-spacing: 1px; display: block; margin-bottom: 5px;">🎁 CUPOM VIP CONFIGURADO</span>
        <strong style="font-size: 14px; font-weight: 900; color: #1d4ed8; letter-spacing: 2px;">CLIENTEVIP10</strong>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
      <p>© 2026 Biobel Cosméticos. Todos os direitos reservados.</p>
    </div>
  </div>
</div>`;
                          navigator.clipboard.writeText(htmlTemplate);
                          addNotification('E-mail em HTML copiado! Perfeito para colar no Mailchimp, Gmail, Resend ou Brevo.', 'success');
                        }}
                        className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-black uppercase text-[10px] tracking-wider transition-colors flex items-center justify-center gap-1.5"
                      >
                        <FileText size={13} />
                        Copiar Layout HTML
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeCampTab === 'ativos' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                <Megaphone size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Campanhas Customizadas</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelos salvos no banco para CRM</p>
              </div>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg"
            >
              <Plus size={20} />
              Nova Campanha
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="bg-white dark:bg-slate-900 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col hover:border-blue-100 dark:hover:border-slate-700 transition-all">
                <div className="p-6 space-y-4 flex-1">
                  <div className="flex justify-between items-start">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                      campaign.type === 'new_customers' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-400" :
                      campaign.type === 'retention_30d' ? "bg-rose-100 text-rose-700 dark:bg-rose-950/25 dark:text-rose-400" : "bg-blue-100 text-blue-700 dark:bg-blue-950/25 dark:text-blue-400"
                    )}>
                      {campaign.type === 'new_customers' ? 'Novos Clientes' :
                       campaign.type === 'retention_30d' ? 'Retenção' : 'Geral'}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => handleOpenModal(campaign)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(campaign.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">{campaign.name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mt-1.5 leading-relaxed font-medium">{campaign.message}</p>
                  </div>
                  <div className="pt-4 flex items-center justify-between border-t border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{getTargetCount(campaign.type)} Clientes Alvo</span>
                    </div>
                    <button 
                      onClick={() => handleCopyText(campaign.message)}
                      className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1"
                    >
                      Copiar Mensagem
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    handleCopyText(campaign.message);
                    addNotification('Copiado! Acesse a aba Clientes (CRM) para colar diretamente no WhatsApp de qualquer cliente.', 'info');
                  }}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  Copiar e Disparar no CRM
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendário de Temas Festivos / Comemorações */}
      {activeCampTab === 'calendario' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">O que engajar em cada mês?</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ideias de marketing sazonais para impulsionar suas vendas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Months sidebar selectors */}
            <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-[30px] border border-slate-100 dark:border-slate-800 space-y-1">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-3">Selecione o Mês do Ano</h4>
              <div className="grid grid-cols-3 lg:grid-cols-1 gap-1.5">
                {monthlyCelebrations.map((m, idx) => (
                  <button
                    key={m.month}
                    onClick={() => setSelectedMonthIndex(idx)}
                    className={cn(
                      "py-2.5 px-4 rounded-xl text-left font-bold text-xs uppercase tracking-tight flex items-center justify-between transition-all",
                      selectedMonthIndex === idx 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-100 dark:shadow-none"
                        : "bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <span>{m.month}</span>
                    <span className={cn("text-[9px] font-black uppercase tracking-wide rounded-full px-2 py-0.5", selectedMonthIndex === idx ? "bg-white/25 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500")}>
                      {m.events.length} {m.events.length === 1 ? 'Data' : 'Datas'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Month celebrations */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[35px] border border-slate-150 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-4 mb-4">
                  <div>
                    <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">{monthlyCelebrations[selectedMonthIndex].month}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Tema Principal das Campanhas</p>
                  </div>
                  <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-extrabold text-[10px] uppercase rounded-full tracking-wider border border-blue-100/40 dark:border-blue-900/30">
                    {monthlyCelebrations[selectedMonthIndex].theme}
                  </span>
                </div>

                <div className="space-y-6">
                  {monthlyCelebrations[selectedMonthIndex].events.map((e) => (
                    <div key={e.title} className="p-5 bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/80 rounded-3xl space-y-4 hover:border-rose-100 transition-all relative overflow-hidden group">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-2xl flex flex-col items-center justify-center font-black relative shadow-sm">
                          <span className="text-xs uppercase font-light leading-none">Dia</span>
                          <span className="text-lg leading-tight mt-0.5">{e.day}</span>
                        </div>
                        <div className="flex-1 space-y-1">
                          <h4 className="font-extrabold text-slate-950 dark:text-white text-base leading-snug">{e.title}</h4>
                          <p className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                            Gatilho de Vendas: {e.opportunity}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/60 rounded-2xl space-y-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Sugestão de Cópia Pronta:</span>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 italicLeading leading-relaxed">"{e.message}"</p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1 justify-end">
                        <button
                          onClick={() => handleCopyText(e.message)}
                          className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                        >
                          <Check size={14} className="text-emerald-500" />
                          Copiar Texto
                        </button>
                        <button
                          onClick={() => handleCreateCampaignFromCelebration(e.title, e.message)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md"
                        >
                          <Sparkles size={14} className="text-amber-300" />
                          Criar Projeto de Campanha
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pós-Venda Inteligente WhatsApp */}
      {activeCampTab === 'pos-venda' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                <MessageCircle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Pós-Venda Inteligente</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Régua de relacionamento automatizada via WhatsApp</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black rounded-full border border-emerald-100/50 dark:border-emerald-900/30 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-emerald-500  rounded-full animate-pulse" />
              Conexão Fidelizada
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Control Panel (left) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Customer Selector with Search */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[30px] border border-slate-150 dark:border-slate-800 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">1. Selecionar Cliente do CRM</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
                    <input 
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-800/50 pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                      placeholder="Pesquisar por nome ou celular..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                  </div>
                </div>

                {customerSearch && (
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1">
                    {filteredCustomers.length === 0 ? (
                      <p className="text-[10px] text-slate-400 font-bold text-center py-2">Nenhum cliente correspondente.</p>
                    ) : (
                      filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setCustomerSearch('');
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-900 text-xs font-bold uppercase transition-all flex items-center justify-between text-slate-700 dark:text-slate-300"
                        >
                          <span>{c.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{c.phone}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Dropdown containing all customers */}
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs uppercase"
                >
                  <option value="">-- Escolher Cliente --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                  ))}
                </select>

                {/* Selected customer quick details */}
                {selectedCustomer && (
                  <div className="p-4 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 rounded-2xl space-y-2 text-xs">
                    <p className="font-extrabold text-blue-800 dark:text-blue-400 uppercase tracking-tight flex items-center gap-1">
                      <UserCircle size={14} /> Detalhes da Compra Recente
                    </p>
                    {customerLastSale ? (
                      <div className="space-y-1 text-slate-600 dark:text-slate-400">
                        <p>🛒 <strong>Última Compra:</strong> {customerLastSale.date.split('T')[0].split('-').reverse().join('/')}</p>
                        <p>🛍️ <strong>Mimos Levados:</strong> {customerLastSale.items.map(i => i.name).join(', ')}</p>
                        <p>📍 <strong>Vendedora:</strong> {customerLastSale.vendedora || 'Não Informada'}</p>
                        <p>💰 <strong>Valor Total:</strong> {formatCurrency(customerLastSale.total)}</p>
                      </div>
                    ) : (
                      <p className="text-slate-500 font-bold italic">Nenhum histórico de venda associado a este cliente no sistema. Exibindo mimos genéricos.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Rules and template selectors */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[30px] border border-slate-150 dark:border-slate-800 space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">2. Escolher Régua / Tipo de Retenção</label>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-snug">Selecione o melhor momento pós-compras para entrar em contato:</p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {(Object.keys(postSaleRules) as Array<keyof typeof postSaleRules>).map((key) => {
                    const rule = postSaleRules[key];
                    const isSelected = selectedRule === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedRule(key)}
                        className={cn(
                          "p-3.5 rounded-2xl text-left border transition-all flex items-start gap-3",
                          isSelected 
                            ? "bg-slate-900 border-slate-900 text-white dark:bg-slate-800 dark:border-slate-700 shadow-md"
                            : "bg-slate-50 border-slate-150 hover:bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-300"
                        )}
                      >
                        <span className="text-xl mt-0.5">{rule.emoji}</span>
                        <div>
                          <h4 className={cn("text-xs font-black uppercase tracking-tight", isSelected ? "text-amber-300" : "text-slate-800 dark:text-white")}>{rule.title}</h4>
                          <p className={cn("text-[10px] font-semibold mt-0.5 leading-snug", isSelected ? "text-slate-300" : "text-slate-500")}>{rule.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Coupon option for T30 */}
                {selectedRule === 't30' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Cupom Promocional (Variável):</label>
                    <input
                      type="text"
                      value={discountCoupon}
                      onChange={(e) => setDiscountCoupon(e.target.value.toUpperCase())}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-extrabold text-xs tracking-wider"
                      placeholder="Ex: VOLTAMAIS10"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Preview and Text Editor (right) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-[35px] border border-slate-150 dark:border-slate-800 flex flex-col h-full justify-between gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Painel Inteligente de Geração de Texto</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold">O texto é atualizado automaticamente com as tags do cliente.</p>
                  </div>
                  <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md uppercase text-slate-500 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    Completo
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                    <span>Edição Manual da Mensagem</span>
                    <span className="font-semibold text-[9px] text-slate-400 font-mono">{customizedMessage.length} caracteres</span>
                  </label>
                  <textarea
                    rows={8}
                    value={customizedMessage}
                    onChange={(e) => setCustomizedMessage(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-750 rounded-2xl font-bold text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Selecione um cliente acima para montar a mensagem automatizada..."
                  />
                </div>

                {/* Variable reference list tags */}
                <div className="p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl flex flex-wrap gap-2 text-[9px] font-bold text-slate-500">
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200/50 dark:border-slate-750">Nome do Cliente: Próprio</span>
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200/50 dark:border-slate-750">Mimos: Produtos Comprados</span>
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200/50 dark:border-slate-750">Consultora: Vendedora do Pedido</span>
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200/50 dark:border-slate-750">Data da Venda: Reversora</span>
                </div>
              </div>

              {/* Action buttons */}
              {selectedCustomer ? (
                <div className="space-y-3">
                  <button
                    onClick={() => handleSendWhatsAppPostSale(selectedCustomer.phone, customizedMessage)}
                    className="w-full py-4.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={18} />
                    Disparar via WhatsApp Cliente ({selectedCustomer.name.toUpperCase()})
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyText(customizedMessage)}
                      className="flex-1 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      Copiar Texto Final
                    </button>
                    <button
                      onClick={() => {
                        setFormData({
                          name: `Pós-Venda (${selectedCustomer.name.toUpperCase()})`,
                          message: customizedMessage,
                          type: 'custom'
                        });
                        setEditingCampaign(null);
                        setIsModalOpen(true);
                        setActiveCampTab('ativos');
                        addNotification('Mensagem de pós-venda carregada como Campanha!', 'success');
                      }}
                      className="flex-1 py-3 bg-slate-950 hover:bg-slate-850 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={14} />
                      Salvar em Campanhas
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-center text-xs font-black text-amber-700 dark:text-amber-400 rounded-2xl uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">
                  ⚠️ Cadastre Clientes com Celular para Liberar o Disparo
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500"><X size={24} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título da Campanha</label>
                  <input 
                    type="text" 
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Boas-vindas 10% OFF"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Público</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs uppercase"
                  >
                    <option value="new_customers">Novos Clientes (7 dias)</option>
                    <option value="retention_30d">Retenção (30 dias sem compra)</option>
                    <option value="custom">Público Geral</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensagem da Campanha</label>
                  <textarea 
                    value={formData.message || ''}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Escreva a mensagem que será enviada..."
                    rows={4}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-xs leading-relaxed"
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-850 flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-black uppercase tracking-widest font-bold">Cancelar</button>
                <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest font-bold h-12">Salvar Campanha</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

