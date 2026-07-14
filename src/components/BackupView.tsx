import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { 
    cn, formatCurrency, getWhatsAppUrl, cleanData, normalizeVendedoraName, getSafeDate, getSaleLocalHours, formatDate, getLocalISOString, isSameLocalDay, formatDateWithDayOfWeek, formatPhone, APP_VERSION, detectWorkbookContext, isSalesSheet, parseSheetNameDate, parseImportedDate, coerceDateToContext, findColIdx, parseNumericValue, parseImportedVendor, parseImportedProductAndBrand, parseImportedTime 
  } from '../utils';;
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

export const BackupView = ({ 
  sales, setSales, 
  products, setProducts, 
  customers, setCustomers, 
  brands, setBrands, 
  productCategories, setProductCategories,
  fixedCosts, setFixedCosts, 
  financialAccounts = [], setFinancialAccounts = () => {},
  monthlyGoals, setMonthlyGoals, 
  settings, setSettings,
  addNotification, handleFirestoreError, user,
  driveToken, setDriveToken,
  isSyncingSheets, setIsSyncingSheets,
  handleSyncGoogleSheetsLive,
  setSelectedMonth,
  cloudSyncEnabled = false,
  cloudSyncing = false,
  storeId = 'biobel',
  setStoreId = () => {},
  lastCloudSyncTime = null,
  enableCloudSync = async () => {},
  disableCloudSync = () => {}
}: BackupViewProps) => {
  const [activeTab, setActiveTab] = useState<'simple' | 'advanced'>('simple');
  const [isDangerZoneChecked, setIsDangerZoneChecked] = useState(false);
  const [showClearSalesConfirm, setShowClearSalesConfirm] = useState(false);
  const [showResetSystemConfirm, setShowResetSystemConfirm] = useState(false);
  const [showRestoreDefaultsConfirm, setShowRestoreDefaultsConfirm] = useState(false);
  const [autoBackups, setAutoBackups] = useState<any[]>([]);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isListingFiles, setIsListingFiles] = useState(false);
  const [isSignInDriveLoading, setIsSignInDriveLoading] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [searchTermDrive, setSearchTermDrive] = useState('');
  const [importingFileId, setImportingFileId] = useState<string | null>(null);

  const [selectedMonthToDelete, setSelectedMonthToDelete] = useState('');
  const [showDeleteMonthConfirm, setShowDeleteMonthConfirm] = useState(false);

  const availableSalesMonths = useMemo(() => {
    const months = new Set<string>();
    sales.forEach(sale => {
      if (sale.date) {
        months.add(sale.date.substring(0, 7)); // "YYYY-MM"
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [sales]);

  const handleConnectGoogleDrive = async () => {
    setIsSignInDriveLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setDriveToken(credential.accessToken);
        setGoogleUser(result.user);
        addNotification('Google Drive conectado com sucesso!', 'success');
        fetchDriveFiles(credential.accessToken);
      } else {
        throw new Error('Falha ao obter token de acesso do Google.');
      }
    } catch (e: any) {
      console.error(e);
      addNotification('Erro ao conectar ao Google Drive: ' + (e.message || ''), 'error');
    } finally {
      setIsSignInDriveLoading(false);
    }
  };

  const fetchDriveFiles = async (token: string) => {
    setIsListingFiles(true);
    try {
      const queryStr = encodeURIComponent("(mimeType = 'application/json' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType = 'application/vnd.ms-excel') and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${queryStr}&orderBy=modifiedTime desc&fields=files(id,name,mimeType,size,modifiedTime)&pageSize=30`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao listar arquivos do Google Drive.');
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (e: any) {
      console.error(e);
      addNotification('Erro ao buscar arquivos: ' + (e.message || ''), 'error');
    } finally {
      setIsListingFiles(false);
    }
  };

  const handleImportDriveFile = async (file: any) => {
    if (!driveToken) return;
    if (!window.confirm(`Deseja importar o arquivo "${file.name}" do Google Drive?`)) return;

    setImportingFileId(file.id);
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${driveToken}` }
      });
      if (!res.ok) throw new Error('Erro ao baixar arquivo do Google Drive.');

      if (file.name.endsWith('.json') || file.mimeType === 'application/json') {
        const text = await res.text();
        const data = JSON.parse(text);
        if (data.sales) setSales(data.sales);
        if (data.products) setProducts(data.products);
        if (data.customers) setCustomers(data.customers);
        if (data.brands) {
          const migratedBrands = data.brands.map((b: any, index: number) => 
            typeof b === 'string' ? { id: `B${Date.now()}${index}`, name: b } : b
          );
          setBrands(migratedBrands);
        }
        if (data.productCategories) setProductCategories(data.productCategories);
        if (data.fixedCosts) setFixedCosts(data.fixedCosts);
        if (data.financialAccounts && setFinancialAccounts) setFinancialAccounts(data.financialAccounts);
        if (data.monthlyGoals) setMonthlyGoals(data.monthlyGoals);
        addNotification(`Backup "${file.name}" restaurado com sucesso do Google Drive!`, 'success');
      } else {
        const arrayBuffer = await res.arrayBuffer();
        const arrayData = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(arrayData, { type: 'array' });
        
        let foundData = false;

        // 1. Products
        const productsSheetName = workbook.SheetNames.find(n => 
          ['Produtos', 'PRODUTOS', 'Products', 'Estoque', 'ESTOQUE'].includes(n)
        );

        if (productsSheetName) {
          const sheet = workbook.Sheets[productsSheetName];
          const imported = XLSX.utils.sheet_to_json(sheet) as any[];
          const formatted: Product[] = imported.map(p => ({
            id: String(p.ID || p.id || Math.random().toString(36).substr(2, 9)),
            name: String(p.Nome || p.nome || p.Name || p.name || p.Produto || p.produto || ''),
            brand: String(p.Marca || p.marca || p.Brand || p.brand || ''),
            category: String(p.Categoria || p.categoria || p.Category || p.category || ''),
            price: Number(p.Preco || p.preço || p.Price || p.price || p.Valor || p.valor) || 0,
            cost: Number(p.Custo || p.custo || p.Cost || p.cost) || 0,
            stock: Number(p.Estoque || p.estoque || p.Stock || p.stock || p.Quantidade || p.quantidade) || 0,
            minStock: Number(p.Minimo || p.minimo || p.MinStock || p.min_stock) || 0,
            type: 'avulso'
          }));
          if (formatted.length > 0) {
            setProducts(formatted);
            addNotification(`${formatted.length} produtos importados!`, 'success');
            foundData = true;
          }
        }

        // 2. Sales
        const workbookContext = detectWorkbookContext(file?.name || '', workbook.SheetNames);
        const contextYear = workbookContext.year;
        const contextMonth = workbookContext.month;

        const dateSheets = workbook.SheetNames.filter(isSalesSheet);

        if (dateSheets.length > 0) {
          let allImportedSales: Sale[] = [];

          dateSheets.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            
            let sheetDate = parseSheetNameDate(sheetName, contextMonth, contextYear);
            const firstCell = String(rawData[0] ? rawData[0][0] : '');
            
            if (/^\d{1,2}[./-]\d{1,2}/.test(firstCell)) {
              sheetDate = parseImportedDate(firstCell.split(/\s/)[0], '', contextYear, contextMonth);
            }

            sheetDate = coerceDateToContext(sheetDate, contextMonth, contextYear);

            // Detect Header
            let headerIdx = -1;
            let colMap: { [key: string]: number } = {};
            let maxScore = -1;

            for (let i = 0; i < Math.min(rawData.length, 25); i++) {
              const row = rawData[i];
              if (!row || !Array.isArray(row)) continue;

              const dIdx = findColIdx(row, ['dinheiro', 'espécie']);
              const debIdx = findColIdx(row, ['débito', 'debito']);
              const credIdx = findColIdx(row, ['crédito', 'credito']);
              const pixIdx = findColIdx(row, ['pix']);
              const linkIdx = findColIdx(row, ['link']);
              const vIdx = findColIdx(row, ['vendedora', 'vendedor', 'vendedoras', 'staff', 'responsável', 'responsavel', 'colaborador', 'colaboradora', 'atendente', 'profissional', 'funcionário', 'funcionario']);
              const pIdx = findColIdx(row, ['produto', 'item', 'descrição', 'descricao', 'serviço', 'servico', 'atendimento', 'procedimento', 'produto/serviço']);
              const tIdx = findColIdx(row, ['total', 'valor', 'preço', 'price', 'amount']);
              const dataIdx = findColIdx(row, ['data', 'date']);
              const pagIdx = findColIdx(row, ['pagamento', 'metodo', 'meio', 'forma']);
              const descIdx = findColIdx(row, ['desconto', 'desc', 'off']);
              const catIdx = findColIdx(row, ['categoria', 'category', 'tipo produto', 'tipo produtop']);
              const brandIdx = findColIdx(row, ['marca', 'brand']);
              const qtyIdx = findColIdx(row, ['quantidade', 'itens vendidos', 'n de itens', 'itens', 'peças', 'pecas', 'items', 'qt', 'qtd', 'qty', 'quantity']);
              const horaIdx = findColIdx(row, ['hora', 'horário', 'horario', 'time']);

              let score = 0;
              if (dIdx !== -1) score += 3;
              if (debIdx !== -1) score += 3;
              if (credIdx !== -1) score += 3;
              if (pixIdx !== -1) score += 3;
              if (linkIdx !== -1) score += 1;
              if (tIdx !== -1) score += 2;
              if (vIdx !== -1) score += 2;
              if (pIdx !== -1) score += 2;
              if (dataIdx !== -1) score += 1;
              if (pagIdx !== -1) score += 1;

              if (score > maxScore && score >= 2) {
                maxScore = score;
                headerIdx = i;
                colMap = {
                  dinheiro: dIdx,
                  debito: debIdx,
                  credito: credIdx,
                  pix: pixIdx,
                  link: linkIdx,
                  vendedora: vIdx,
                  produto: pIdx,
                  total: tIdx,
                  data: dataIdx,
                  pagamento: pagIdx,
                  desconto: descIdx,
                  categoria: catIdx,
                  marca: brandIdx,
                  quantidade: qtyIdx !== -1 ? qtyIdx : (row.length > 8 ? 8 : -1),
                  hora: horaIdx !== -1 ? horaIdx : (row.length > 11 ? 11 : -1)
                };
              }
            }

            if (headerIdx !== -1) {
              if (colMap.dinheiro !== -1 || colMap.debito !== -1 || colMap.credito !== -1 || colMap.pix !== -1 || colMap.link !== -1) {
                const pMethods = [
                  { key: 'dinheiro', label: 'Dinheiro' },
                  { key: 'debito', label: 'Débito' },
                  { key: 'credito', label: 'Crédito' },
                  { key: 'pix', label: 'Pix' },
                  { key: 'link', label: 'Link' }
                ];

                for (let i = headerIdx + 1; i < rawData.length; i++) {
                  const row = rawData[i];
                  if (!row || !Array.isArray(row)) continue;
                  if (String(row[0] || '').toLowerCase().includes('total')) continue;

                  pMethods.forEach(pm => {
                    const colIdx = colMap[pm.key];
                    if (colIdx === -1 || colIdx === undefined) return;

                    const val = row[colIdx];
                    if (val === undefined || val === null || val === '') return;
                    
                    const numVal = parseNumericValue(val);
                    
                    if (!isNaN(numVal) && numVal > 0) {
                      const vendor = parseImportedVendor(colMap.vendedora !== -1 ? String(row[colMap.vendedora] || '') : '');
                      const { product, brand: itemBrand, category: itemCategory } = parseImportedProductAndBrand(row, colMap);
                      
                      const rawRowDate = colMap.data !== -1 ? parseImportedDate(row[colMap.data], sheetDate) : sheetDate;
                      const rowDate = coerceDateToContext(rawRowDate, contextMonth, contextYear, colMap.data !== -1 ? row[colMap.data] : undefined);

                      let qty = 1;
                      if (colMap.quantidade !== undefined && colMap.quantidade !== -1) {
                        const valQty = row[colMap.quantidade];
                        if (valQty !== undefined && valQty !== null && valQty !== '') {
                          qty = Math.max(1, parseInt(String(valQty)) || 1);
                        }
                      }

                      let saleTime = '12:00';
                      if (colMap.hora !== undefined && colMap.hora !== -1) {
                        const valTime = row[colMap.hora];
                        if (valTime !== undefined && valTime !== null && valTime !== '') {
                          saleTime = parseImportedTime(valTime);
                        }
                      }

                      allImportedSales.push({
                        id: `S-GRID-${sheetName}-${i}-${pm.key}-${Date.now()}`,
                        date: `${rowDate}T${saleTime}:00Z`,
                        vendedora: vendor,
                        total: numVal,
                        discount: 0,
                        paymentMethod: pm.label as any,
                        status: 'completed',
                        category: itemCategory,
                        items: [{ productId: 'imported', name: product, quantity: qty, price: numVal / qty, total: numVal, brand: itemBrand, category: itemCategory }]
                      });
                    }
                  });
                }
              } 
              else if (colMap.total !== -1) {
                for (let i = headerIdx + 1; i < rawData.length; i++) {
                  const row = rawData[i];
                  if (!row || !Array.isArray(row)) continue;
                  if (String(row[colMap.total] || '').toLowerCase().includes('total')) continue;

                  const total = parseNumericValue(row[colMap.total]);
                  
                  if (!isNaN(total) && total > 0) {
                    const vendor = parseImportedVendor(colMap.vendedora !== -1 ? String(row[colMap.vendedora] || '') : '');
                    const { product, brand: itemBrand, category: itemCategory } = parseImportedProductAndBrand(row, colMap);
                    
                    const rawRowDate = colMap.data !== -1 ? parseImportedDate(row[colMap.data], sheetDate) : sheetDate;
                    const rowDate = coerceDateToContext(rawRowDate, contextMonth, contextYear, colMap.data !== -1 ? row[colMap.data] : undefined);
                    const method = colMap.pagamento !== -1 ? String(row[colMap.pagamento] || 'Outros') : 'Outros';
                    const discount = colMap.desconto !== -1 ? (Number(row[colMap.desconto]) || 0) : 0;

                    let qty = 1;
                    if (colMap.quantidade !== undefined && colMap.quantidade !== -1) {
                      const valQty = row[colMap.quantidade];
                      if (valQty !== undefined && valQty !== null && valQty !== '') {
                        qty = Math.max(1, parseInt(String(valQty)) || 1);
                      }
                    }

                    let saleTime = '12:00';
                    if (colMap.hora !== undefined && colMap.hora !== -1) {
                      const valTime = row[colMap.hora];
                      if (valTime !== undefined && valTime !== null && valTime !== '') {
                        saleTime = parseImportedTime(valTime);
                      }
                    }

                    allImportedSales.push({
                      id: `S-ROW-${sheetName}-${i}-${Date.now()}`,
                      date: `${rowDate}T${saleTime}:00Z`,
                      vendedora: vendor,
                      total,
                      discount,
                      paymentMethod: method as any,
                      status: 'completed',
                      category: itemCategory,
                      items: [{ productId: 'imported', name: product, quantity: qty, price: total / qty, total: total, brand: itemBrand, category: itemCategory }]
                    });
                  }
                }
              }
            }
          });

          if (allImportedSales.length > 0) {
            setSales(prev => [...prev, ...allImportedSales]);
            addNotification(`${allImportedSales.length} registros de venda importados!`, 'success');
            foundData = true;

            // Automatically switch selectedMonth to the imported month so the user can see the data immediately
            try {
              const dateObj = new Date(parseInt(workbookContext.year), parseInt(workbookContext.month) - 1, 15);
              const mName = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
              const capitalizedMonth = mName.charAt(0).toUpperCase() + mName.slice(1);
              setSelectedMonth?.(capitalizedMonth);
            } catch (err) {
              console.error(err);
            }
          }
        }

        // 3. Try to find Customers sheet
        const customersSheetName = workbook.SheetNames.find(n => 
          ['Clientes', 'CLIENTES', 'Customers', 'Contatos', 'CONTATOS'].includes(n)
        );

        if (customersSheetName) {
          const sheet = workbook.Sheets[customersSheetName];
          const imported = XLSX.utils.sheet_to_json(sheet) as any[];
          const formatted: Customer[] = imported.map(c => ({
            id: String(c.ID || c.id || Math.random().toString(36).substr(2, 9)),
            name: String(c.Nome || c.nome || c.Name || c.name || ''),
            phone: String(c.Telefone || c.telefone || c.Phone || c.phone || c.Celular || c.celular || ''),
            createdAt: c.CriadoEm || c.criado_em || new Date().toISOString()
          }));
          if (formatted.length > 0) {
            setCustomers(formatted);
            addNotification(`${formatted.length} clientes importados da planilha do Drive!`, 'success');
            foundData = true;
          }
        }

        // 4. Fallback: Try first sheet
        if (!foundData && workbook.SheetNames.length > 0) {
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const imported = XLSX.utils.sheet_to_json(firstSheet) as any[];
          
          if (imported.length > 0) {
            const firstRow = imported[0];
            const hasProductHeaders = ['Nome', 'nome', 'Produto', 'produto', 'Marca', 'marca'].some(h => h in firstRow);
            
            if (hasProductHeaders) {
              const formatted: Product[] = imported.map(p => ({
                id: String(p.ID || p.id || Math.random().toString(36).substr(2, 9)),
                name: String(p.Nome || p.nome || p.Produto || p.produto || ''),
                brand: String(p.Marca || p.marca || ''),
                category: String(p.Categoria || p.categoria || ''),
                price: Number(p.Preco || p.preço || p.Valor || p.valor) || 0,
                cost: Number(p.Custo || p.custo) || 0,
                stock: Number(p.Estoque || p.estoque) || 0,
                minStock: Number(p.Minimo || p.minimo) || 0,
                type: 'avulso'
              }));
              setProducts(formatted);
              addNotification(`${formatted.length} produtos importados do Google Drive!`, 'success');
              foundData = true;
            }
          }
        }

        if (!foundData) {
          addNotification('Nenhum dado reconhecido neste arquivo Excel do Drive.', 'warning');
        }
      }
    } catch (e: any) {
      console.error(e);
      addNotification('Erro ao importar arquivo do Google Drive: ' + (e.message || ''), 'error');
    } finally {
      setImportingFileId(null);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('biobel_system_backups');
    if (saved) {
      const parsed = JSON.parse(saved);
      setAutoBackups(parsed.slice(0, 6));
    }
  }, []);

  const handleRestoreAutoBackup = (backup: any) => {
    if (!window.confirm(`Deseja restaurar o backup automático de ${new Date(backup.timestamp).toLocaleString()}? Isso substituirá todos os dados atuais.`)) return;
    
    const { data } = backup;
    if (data.sales) setSales(data.sales);
    if (data.products) setProducts(data.products);
    if (data.customers) setCustomers(data.customers);
    if (data.brands) setBrands(data.brands);
    if (data.productCategories) setProductCategories(data.productCategories);
    if (data.fixedCosts) setFixedCosts(data.fixedCosts);
    if (data.financialAccounts && setFinancialAccounts) setFinancialAccounts(data.financialAccounts);
    if (data.monthlyGoals) setMonthlyGoals(data.monthlyGoals);
    if (data.settings) setSettings(data.settings);
    
    addNotification('Backup restaurado com success!', 'success');
  };

  const handleExportJSON = (mode: 'complete' | 'customers' | 'products' = 'complete') => {
    let data: any = {};
    let filename = '';
    
    if (mode === 'complete') {
      data = { sales, products, customers, brands, productCategories, fixedCosts, financialAccounts, monthlyGoals };
      filename = `backup_completo_biobel_${new Date().toISOString().split('T')[0]}.json`;
    } else if (mode === 'customers') {
      data = { customers };
      filename = `backup_clientes_biobel_${new Date().toISOString().split('T')[0]}.json`;
    } else if (mode === 'products') {
      data = { products, brands, productCategories };
      filename = `backup_produtos_biobel_${new Date().toISOString().split('T')[0]}.json`;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    addNotification(`Backup em JSON (${mode === 'complete' ? 'Completo' : mode === 'customers' ? 'Clientes' : 'Produtos'}) gerado com sucesso!`, 'success');
  };

  const handleRestoreJSON = (event: React.ChangeEvent<HTMLInputElement>, mode: 'complete' | 'customers' | 'products' = 'complete') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (mode === 'complete') {
          if (!data.sales && !data.products && !data.customers) {
            addNotification('Este arquivo não parece ser um backup completo válido.', 'error');
            return;
          }
          if (data.sales) setSales(data.sales);
          if (data.products) setProducts(data.products);
          if (data.customers) setCustomers(data.customers);
          if (data.brands) {
            const migratedBrands = data.brands.map((b: any, index: number) => 
              typeof b === 'string' ? { id: `B${Date.now()}${index}`, name: b } : b
            );
            setBrands(migratedBrands);
          }
          if (data.productCategories) setProductCategories(data.productCategories);
          if (data.fixedCosts) setFixedCosts(data.fixedCosts);
          if (data.financialAccounts && setFinancialAccounts) setFinancialAccounts(data.financialAccounts);
          if (data.monthlyGoals) setMonthlyGoals(data.monthlyGoals);
          addNotification('Backup completo restaurado com sucesso!', 'success');
        } else if (mode === 'customers') {
          if (!data.customers) {
            addNotification('Este arquivo não contém dados de clientes para restaurar.', 'error');
            return;
          }
          setCustomers(data.customers);
          addNotification('Backup de clientes restaurado com sucesso!', 'success');
        } else if (mode === 'products') {
          if (!data.products) {
            addNotification('Este arquivo não contém dados de produtos para restaurar.', 'error');
            return;
          }
          setProducts(data.products);
          if (data.brands) {
            const migratedBrands = data.brands.map((b: any, index: number) => 
              typeof b === 'string' ? { id: `B${Date.now()}${index}`, name: b } : b
            );
            setBrands(migratedBrands);
          }
          if (data.productCategories) setProductCategories(data.productCategories);
          addNotification('Backup de produtos restaurado com sucesso!', 'success');
        }
      } catch (error) {
        addNotification('Erro ao ler o arquivo de backup.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleExportExcel = (mode: 'complete' | 'customers' | 'products' = 'complete') => {
    const wb = XLSX.utils.book_new();
    let filename = '';

    if (mode === 'complete' || mode === 'products') {
      // Products Sheet
      const productsData = products.map(p => ({
        ID: p.id,
        Nome: p.name,
        Marca: p.brand,
        Categoria: p.category,
        Preco: p.price,
        Custo: p.cost,
        Estoque: p.stock,
        Minimo: p.minStock
      }));
      const wsProducts = XLSX.utils.json_to_sheet(productsData);
      XLSX.utils.book_append_sheet(wb, wsProducts, "Produtos");

      // Brands Sheet
      const brandsData = brands.map(b => ({
        ID: b.id,
        Nome: b.name
      }));
      const wsBrands = XLSX.utils.json_to_sheet(brandsData);
      XLSX.utils.book_append_sheet(wb, wsBrands, "Marcas");
    }

    if (mode === 'complete' || mode === 'customers') {
      // Customers Sheet
      const customersData = customers.map(c => ({
        ID: c.id,
        Nome: c.name,
        Telefone: c.phone,
        CriadoEm: c.createdAt
      }));
      const wsCustomers = XLSX.utils.json_to_sheet(customersData);
      XLSX.utils.book_append_sheet(wb, wsCustomers, "Clientes");
    }

    if (mode === 'complete') {
      // Sales Sheet
      const salesData = sales.map(s => ({
        ID: s.id,
        Data: s.date,
        Vendedora: s.vendedora,
        Total: s.total,
        Metodo: s.paymentMethod,
        Status: s.status,
        Itens: s.items.map(i => `${i.name} (${i.quantity}x)`).join(', ')
      }));
      const wsSales = XLSX.utils.json_to_sheet(salesData);
      XLSX.utils.book_append_sheet(wb, wsSales, "Vendas");

      // Fixed Costs Sheet
      const costsData = fixedCosts.map(c => ({
        ID: c.id,
        Descricao: c.description,
        Valor: c.amount,
        Vencimento: c.dueDate,
        Status: c.status
      }));
      const wsCosts = XLSX.utils.json_to_sheet(costsData);
      XLSX.utils.book_append_sheet(wb, wsCosts, "Custos Fixos");
    }

    if (mode === 'complete') {
      filename = `dados_biobel_completo_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (mode === 'customers') {
      filename = `dados_biobel_clientes_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else {
      filename = `dados_biobel_produtos_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    XLSX.writeFile(wb, filename);
    addNotification(`Planilha Excel de ${mode === 'complete' ? 'dados completos' : mode === 'customers' ? 'clientes' : 'produtos'} gerada com sucesso!`, 'success');
  };

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>, mode: 'complete' | 'customers' | 'products' = 'complete') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const workbookContext = detectWorkbookContext(file.name, workbook.SheetNames);
        const contextYear = workbookContext.year;
        const contextMonth = workbookContext.month;

        let foundData = false;

        // 1. Products
        const productsSheetName = workbook.SheetNames.find(n => 
          ['Produtos', 'PRODUTOS', 'Products', 'Estoque', 'ESTOQUE'].includes(n)
        );

        if (productsSheetName) {
          const sheet = workbook.Sheets[productsSheetName];
          const imported = XLSX.utils.sheet_to_json(sheet) as any[];
          const formatted: Product[] = imported.map(p => ({
            id: String(p.ID || p.id || Math.random().toString(36).substr(2, 9)),
            name: String(p.Nome || p.nome || p.Name || p.name || p.Produto || p.produto || ''),
            brand: String(p.Marca || p.marca || p.Brand || p.brand || ''),
            category: String(p.Categoria || p.categoria || p.Category || p.category || ''),
            price: Number(p.Preco || p.preço || p.Price || p.price || p.Valor || p.valor) || 0,
            cost: Number(p.Custo || p.custo || p.Cost || p.cost) || 0,
            stock: Number(p.Estoque || p.estoque || p.Stock || p.stock || p.Quantidade || p.quantidade) || 0,
            minStock: Number(p.Minimo || p.minimo || p.MinStock || p.min_stock) || 0,
            type: 'avulso'
          }));
          if (formatted.length > 0) {
            setProducts(formatted);
            addNotification(`${formatted.length} produtos importados!`, 'success');
            foundData = true;
          }
        }

        // 2. Sales
        const dateSheets = workbook.SheetNames.filter(isSalesSheet);

        if (dateSheets.length > 0) {
          let allImportedSales: Sale[] = [];

          dateSheets.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            
            let sheetDate = parseSheetNameDate(sheetName, contextMonth, contextYear);
            const firstCell = String(rawData[0] ? rawData[0][0] : '');
            
            if (/^\d{1,2}[./-]\d{1,2}/.test(firstCell)) {
              sheetDate = parseImportedDate(firstCell.split(/\s/)[0], '', contextYear, contextMonth);
            }

            sheetDate = coerceDateToContext(sheetDate, contextMonth, contextYear);

            // Detect Header
            let headerIdx = -1;
            let colMap: { [key: string]: number } = {};
            let maxScore = -1;

            for (let i = 0; i < Math.min(rawData.length, 25); i++) {
              const row = rawData[i];
              if (!row || !Array.isArray(row)) continue;

              const dIdx = findColIdx(row, ['dinheiro', 'espécie']);
              const debIdx = findColIdx(row, ['débito', 'debito']);
              const credIdx = findColIdx(row, ['crédito', 'credito']);
              const pixIdx = findColIdx(row, ['pix']);
              const linkIdx = findColIdx(row, ['link']);
              const vIdx = findColIdx(row, ['vendedora', 'vendedor', 'vendedoras', 'staff', 'responsável', 'responsavel', 'colaborador', 'colaboradora', 'atendente', 'profissional', 'funcionário', 'funcionario']);
              const pIdx = findColIdx(row, ['produto', 'item', 'descrição', 'descricao', 'serviço', 'servico', 'atendimento', 'procedimento', 'produto/serviço']);
              const tIdx = findColIdx(row, ['total', 'valor', 'preço', 'price', 'amount']);
              const dataIdx = findColIdx(row, ['data', 'date']);
              const pagIdx = findColIdx(row, ['pagamento', 'metodo', 'meio', 'forma']);
              const descIdx = findColIdx(row, ['desconto', 'desc', 'off']);
              const catIdx = findColIdx(row, ['categoria', 'category', 'tipo produto', 'tipo produtop']);
              const brandIdx = findColIdx(row, ['marca', 'brand']);
              const qtyIdx = findColIdx(row, ['quantidade', 'itens vendidos', 'n de itens', 'itens', 'peças', 'pecas', 'items', 'qt', 'qtd', 'qty', 'quantity']);
              const horaIdx = findColIdx(row, ['hora', 'horário', 'horario', 'time']);

              let score = 0;
              if (dIdx !== -1) score += 3;
              if (debIdx !== -1) score += 3;
              if (credIdx !== -1) score += 3;
              if (pixIdx !== -1) score += 3;
              if (linkIdx !== -1) score += 1;
              if (tIdx !== -1) score += 2;
              if (vIdx !== -1) score += 2;
              if (pIdx !== -1) score += 2;
              if (dataIdx !== -1) score += 1;
              if (pagIdx !== -1) score += 1;

              if (score > maxScore && score >= 2) {
                maxScore = score;
                headerIdx = i;
                colMap = {
                  dinheiro: dIdx,
                  debito: debIdx,
                  credito: credIdx,
                  pix: pixIdx,
                  link: linkIdx,
                  vendedora: vIdx,
                  produto: pIdx,
                  total: tIdx,
                  data: dataIdx,
                  pagamento: pagIdx,
                  desconto: descIdx,
                  categoria: catIdx,
                  marca: brandIdx,
                  quantidade: qtyIdx !== -1 ? qtyIdx : (row.length > 8 ? 8 : -1),
                  hora: horaIdx !== -1 ? horaIdx : (row.length > 11 ? 11 : -1)
                };
              }
            }

            if (headerIdx !== -1) {
              // Priority 1: Grid Mode (Multiple payment columns)
              if (colMap.dinheiro !== -1 || colMap.debito !== -1 || colMap.credito !== -1 || colMap.pix !== -1 || colMap.link !== -1) {
                const pMethods = [
                  { key: 'dinheiro', label: 'Dinheiro' },
                  { key: 'debito', label: 'Débito' },
                  { key: 'credito', label: 'Crédito' },
                  { key: 'pix', label: 'Pix' },
                  { key: 'link', label: 'Link' }
                ];

                for (let i = headerIdx + 1; i < rawData.length; i++) {
                  const row = rawData[i];
                  if (!row || !Array.isArray(row)) continue;
                  if (String(row[0] || '').toLowerCase().includes('total')) continue;

                  pMethods.forEach(pm => {
                    const colIdx = colMap[pm.key];
                    if (colIdx === -1 || colIdx === undefined) return;

                    const val = row[colIdx];
                    if (val === undefined || val === null || val === '') return;
                    
                    const numVal = parseNumericValue(val);
                    
                    if (!isNaN(numVal) && numVal > 0) {
                      const vendor = parseImportedVendor(colMap.vendedora !== -1 ? String(row[colMap.vendedora] || '') : '');
                      const { product, brand: itemBrand, category: itemCategory } = parseImportedProductAndBrand(row, colMap);
                      
                      const rawRowDate = colMap.data !== -1 ? parseImportedDate(row[colMap.data], sheetDate, contextYear, contextMonth) : sheetDate;
                      const rowDate = coerceDateToContext(rawRowDate, contextMonth, contextYear, colMap.data !== -1 ? row[colMap.data] : undefined);

                      let qty = 1;
                      if (colMap.quantidade !== undefined && colMap.quantidade !== -1) {
                        const valQty = row[colMap.quantidade];
                        if (valQty !== undefined && valQty !== null && valQty !== '') {
                          qty = Math.max(1, parseInt(String(valQty)) || 1);
                        }
                      }

                      let saleTime = '12:00';
                      if (colMap.hora !== undefined && colMap.hora !== -1) {
                        const valTime = row[colMap.hora];
                        if (valTime !== undefined && valTime !== null && valTime !== '') {
                          saleTime = parseImportedTime(valTime);
                        }
                      }

                      allImportedSales.push({
                        id: `S-GRID-${sheetName}-${i}-${pm.key}-${Date.now()}`,
                        date: `${rowDate}T${saleTime}:00Z`,
                        vendedora: vendor,
                        total: numVal,
                        discount: 0,
                        paymentMethod: pm.label as any,
                        status: 'completed',
                        category: itemCategory,
                        items: [{ productId: 'imported', name: product, quantity: qty, price: numVal / qty, total: numVal, brand: itemBrand, category: itemCategory }]
                      });
                    }
                  });
                }
              } 
              // Priority 2: Standard Table Mode (One sale per row)
              else if (colMap.total !== -1) {
                for (let i = headerIdx + 1; i < rawData.length; i++) {
                  const row = rawData[i];
                  if (!row || !Array.isArray(row)) continue;
                  if (String(row[colMap.total] || '').toLowerCase().includes('total')) continue;

                  const total = parseNumericValue(row[colMap.total]);
                  
                  if (!isNaN(total) && total > 0) {
                    const vendor = parseImportedVendor(colMap.vendedora !== -1 ? String(row[colMap.vendedora] || '') : '');
                    const { product, brand: itemBrand, category: itemCategory } = parseImportedProductAndBrand(row, colMap);
                    
                    const rawRowDate = colMap.data !== -1 ? parseImportedDate(row[colMap.data], sheetDate, contextYear, contextMonth) : sheetDate;
                    const rowDate = coerceDateToContext(rawRowDate, contextMonth, contextYear, colMap.data !== -1 ? row[colMap.data] : undefined);
                    const method = colMap.pagamento !== -1 ? String(row[colMap.pagamento] || 'Outros') : 'Outros';
                    const discount = colMap.desconto !== -1 ? (Number(row[colMap.desconto]) || 0) : 0;

                    let qty = 1;
                    if (colMap.quantidade !== undefined && colMap.quantidade !== -1) {
                      const valQty = row[colMap.quantidade];
                      if (valQty !== undefined && valQty !== null && valQty !== '') {
                        qty = Math.max(1, parseInt(String(valQty)) || 1);
                      }
                    }

                    let saleTime = '12:00';
                    if (colMap.hora !== undefined && colMap.hora !== -1) {
                      const valTime = row[colMap.hora];
                      if (valTime !== undefined && valTime !== null && valTime !== '') {
                        saleTime = parseImportedTime(valTime);
                      }
                    }

                    allImportedSales.push({
                      id: `S-ROW-${sheetName}-${i}-${Date.now()}`,
                      date: `${rowDate}T${saleTime}:00Z`,
                      vendedora: vendor,
                      total,
                      discount,
                      paymentMethod: method as any,
                      status: 'completed',
                      category: itemCategory,
                      items: [{ productId: 'imported', name: product, quantity: qty, price: total / qty, total: total, brand: itemBrand, category: itemCategory }]
                    });
                  }
                }
              }
            }
          });

          if (allImportedSales.length > 0) {
            setSales(prev => [...prev, ...allImportedSales]);
            addNotification(`${allImportedSales.length} registros de venda importados!`, 'success');
            foundData = true;

            // Automatically switch selectedMonth to the imported month so the user can see the data immediately
            try {
              const dateObj = new Date(parseInt(workbookContext.year), parseInt(workbookContext.month) - 1, 15);
              const mName = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
              const capitalizedMonth = mName.charAt(0).toUpperCase() + mName.slice(1);
              setSelectedMonth?.(capitalizedMonth);
            } catch (err) {
              console.error(err);
            }
          }
        }

        // 3. Try to find Customers sheet
        const customersSheetName = workbook.SheetNames.find(n => 
          ['Clientes', 'CLIENTES', 'Customers', 'Contatos', 'CONTATOS'].includes(n)
        );

        if (customersSheetName) {
          const sheet = workbook.Sheets[customersSheetName];
          const imported = XLSX.utils.sheet_to_json(sheet) as any[];
          const formatted: Customer[] = imported.map(c => ({
            id: String(c.ID || c.id || Math.random().toString(36).substr(2, 9)),
            name: String(c.Nome || c.nome || c.Name || c.name || ''),
            phone: String(c.Telefone || c.telefone || c.Phone || c.phone || c.Celular || c.celular || ''),
            createdAt: c.CriadoEm || c.criado_em || new Date().toISOString()
          }));
          if (formatted.length > 0) {
            setCustomers(formatted);
            addNotification(`${formatted.length} clientes importados!`, 'success');
            foundData = true;
          }
        }

        // 4. Fallback: If nothing found yet, try the first sheet
        if (!foundData && workbook.SheetNames.length > 0) {
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const imported = XLSX.utils.sheet_to_json(firstSheet) as any[];
          
          if (imported.length > 0) {
            const firstRow = imported[0];
            const hasProductHeaders = ['Nome', 'nome', 'Produto', 'produto', 'Marca', 'marca'].some(h => h in firstRow);
            
            if (hasProductHeaders) {
              const formatted: Product[] = imported.map(p => ({
                id: String(p.ID || p.id || Math.random().toString(36).substr(2, 9)),
                name: String(p.Nome || p.nome || p.Produto || p.produto || ''),
                brand: String(p.Marca || p.marca || ''),
                category: String(p.Categoria || p.categoria || ''),
                price: Number(p.Preco || p.preço || p.Valor || p.valor) || 0,
                cost: Number(p.Custo || p.custo) || 0,
                stock: Number(p.Estoque || p.estoque) || 0,
                minStock: Number(p.Minimo || p.minimo) || 0,
                type: 'avulso'
              }));
              setProducts(formatted);
              addNotification(`${formatted.length} produtos importados da aba "${workbook.SheetNames[0]}"!`, 'success');
              foundData = true;
            }
          }
        }

        if (!foundData) {
          addNotification('Não foi possível identificar os dados na planilha. Verifique se os nomes das abas ou colunas estão corretos.', 'warning');
        }
      } catch (error) {
        addNotification('Erro ao importar planilha. Verifique o formato do arquivo.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearSales = async () => {
    if (!isDangerZoneChecked) return;
    setShowClearSalesConfirm(true);
  };

  const confirmClearSales = async () => {
    setShowClearSalesConfirm(false);
    try {
      setSales([]);
      addNotification('Histórico de vendas limpo!', 'success');
    } catch (error: any) {
      addNotification('Erro ao limpar histórico.', 'error');
    }
  };

  const handleResetSystem = () => {
    if (!isDangerZoneChecked) return;
    setShowResetSystemConfirm(true);
  };

  const confirmResetSystem = () => {
    setShowResetSystemConfirm(false);
    setSales([]);
    setProducts([]);
    setCustomers([]);
    setBrands([]);
    setFixedCosts([]);
    setMonthlyGoals([]);
    addNotification('Sistema resetado com sucesso!', 'success');
  };

  const handleRestoreDefaults = () => {
    if (!isDangerZoneChecked) return;
    setShowRestoreDefaultsConfirm(true);
  };

  const confirmRestoreDefaults = () => {
    setShowRestoreDefaultsConfirm(false);
    // Restore initial data
    setProducts([
      { id: '1', name: 'SHAMPOO TRUSS EQUILIBRIUM', brand: 'TRUSS', category: 'Cabelos', price: 129.90, cost: 80, stock: 15, minStock: 5 },
      { id: '2', name: 'BASE MELU MATTE', brand: 'MELU', category: 'Maquiagem', price: 39.90, cost: 20, stock: 24, minStock: 10 },
      { id: '3', name: 'BATOM NINA SECRETS', brand: 'NINA SECRETS', category: 'Maquiagem', price: 45.00, cost: 25, stock: 18, minStock: 8 },
      { id: '4', name: 'MÁSCARA WELLA INVIGO', brand: 'WELLA', category: 'Cabelos', price: 159.90, cost: 100, stock: 12, minStock: 5 },
      { id: '5', name: 'CORRETIVO VIZZELA', brand: 'VIZZELA', category: 'Maquiagem', price: 35.90, cost: 18, stock: 30, minStock: 10 },
    ]);
    setCustomers([
      { id: '1', name: 'JHONATAN SILVA', phone: '(11) 98888-7777', createdAt: new Date().toISOString() },
      { id: '2', name: 'MARIA OLIVEIRA', phone: '(11) 97777-6666', createdAt: new Date().toISOString() },
      { id: '3', name: 'CARLOS SANTOS', phone: '(11) 96666-5555', createdAt: new Date().toISOString() },
    ]);
    setBrands([
      { id: 'B1', name: 'PIATTELLI' },
      { id: 'B2', name: 'OH MY' },
      { id: 'B3', name: 'TRUSS' },
      { id: 'B4', name: 'ALFAPARF' },
      { id: 'B5', name: 'HASKELL' },
      { id: 'B6', name: 'SCHWARZKOPF' },
      { id: 'B7', name: 'EUDORA' },
      { id: 'B8', name: 'WELLA' },
      { id: 'B9', name: 'NATURA' },
      { id: 'B10', name: 'O BOTICÁRIO' },
      { id: 'B11', name: 'BIOBEL' },
      { id: 'B12', name: 'MELU' },
      { id: 'B13', name: 'NINA SECRETS' },
      { id: 'B14', name: 'VIZZELA' }
    ]);
    addNotification('Dados padrão restaurados!', 'success');
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Cópia de Segurança & Dados</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Aqui você pode salvar seus dados, restaurar informações e importar planilhas com segurança.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-xl font-black uppercase text-[10px] tracking-widest border border-brand-100">
          <Info size={14} /> Não entendi — me explica
        </button>
      </div>

      {/* Seletor de Abas Premium */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl max-w-md border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('simple')}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer",
            activeTab === 'simple'
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          ✨ Backup Simples (Fácil)
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer",
            activeTab === 'advanced'
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          ⚙️ Backup Avançado
        </button>
      </div>

      {activeTab === 'simple' ? (
        <div className="space-y-8 transition-all animate-in fade-in duration-300">
          
          {/* Apresentação Didática Gigante */}
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 text-white rounded-[40px] p-8 md:p-12 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 space-y-6 max-w-3xl">
              <span className="text-5xl md:text-6xl block">👵👴✨</span>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
                Olá! Quer guardar ou recuperar os dados da sua loja?
              </h2>
              <p className="text-lg md:text-xl text-indigo-100 font-bold leading-relaxed">
                Nós criamos esta tela com **letras grandes, botões coloridos e explicações simples** para que você possa salvar suas informações sem complicação nenhuma! Pense nisso como uma gaveta trancada a chave onde nada se perde. 📂🔒
              </p>
              
              <div className="flex flex-wrap gap-4 text-xs font-black uppercase tracking-wider bg-white/10 backdrop-blur-md p-4 rounded-2xl w-fit">
                <span className="flex items-center gap-2">🟢 Muito Seguro</span>
                <span className="flex items-center gap-2">📄 Formato do Excel</span>
                <span className="flex items-center gap-2">⭐ Passo a Passo Didático</span>
              </div>
            </div>
          </div>

          {/* Grandes Opções de Ação */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Quadrante A: Exportar (Salvar) */}
            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 md:p-10 border border-slate-150 dark:border-slate-800 shadow-md flex flex-col justify-between space-y-8 text-left">
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <span className="text-5xl md:text-6xl select-none">📥</span>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                      Opção 1: Baixar / Backup / Salvar no Computador
                    </h3>
                    <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mt-1">Gera uma planilha do Excel de segurança</p>
                  </div>
                </div>
                
                <p className="text-sm md:text-base text-slate-700 dark:text-slate-305 font-bold leading-relaxed">
                  O sistema vai pegar suas vendas, clientes ou produtos e criar um arquivo do Excel. Ele ficará guardado com segurança na sua pasta de **"Downloads"**!
                </p>

                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-5 rounded-3xl border border-emerald-100/60 dark:border-emerald-900/30 flex items-start gap-3">
                  <span className="text-2xl mt-0.5">💡</span>
                  <div>
                    <p className="text-xs md:text-sm text-emerald-800 dark:text-emerald-300 font-black uppercase">Conselho Importante</p>
                    <p className="text-xs md:text-sm text-emerald-750 dark:text-emerald-400 font-semibold leading-relaxed mt-1">
                      Salve seus dados uma vez por semana! Assim, se o computador quebrar ou acontecer qualquer imprevisto, você não perde nada. 💾
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleExportExcel('complete')}
                  className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[20px] font-black text-base uppercase tracking-wider transition-all shadow-md hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 cursor-pointer text-center"
                >
                  📥 BAIXAR / CRIAR BACKUP / SALVAR MEUS DADOS NO COMPUTADOR (EXCEL)
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleExportExcel('customers')}
                    className="py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] font-black text-sm uppercase tracking-wider transition-all shadow-sm hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    👥 SÓ CLIENTES
                  </button>
                  <button
                    onClick={() => handleExportExcel('products')}
                    className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[16px] font-black text-sm uppercase tracking-wider transition-all shadow-sm hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    🏷️ SÓ PRODUTOS
                  </button>
                </div>
              </div>
            </div>

            {/* Quadrante B: Importar (Trazer de volta) */}
            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 md:p-10 border border-slate-150 dark:border-slate-800 shadow-md flex flex-col justify-between space-y-8 text-left">
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <span className="text-5xl md:text-6xl select-none">📤</span>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                      Opção 2: Trazer de Volta (Restaurar)
                    </h3>
                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest mt-1">Envia seus dados salvos de volta</p>
                  </div>
                </div>
                
                <p className="text-sm md:text-base text-slate-700 dark:text-slate-305 font-bold leading-relaxed">
                  Se você trocou de computador, formatou o antigo ou quer recuperar dados de clientes e produtos, envie as planilhas aqui!
                </p>

                <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-3xl border border-amber-100/60 dark:border-amber-900/30 flex items-start gap-3">
                  <span className="text-2xl mt-0.5">⚠️</span>
                  <div>
                    <p className="text-xs md:text-sm text-amber-800 dark:text-amber-300 font-black uppercase">Preste Atenção</p>
                    <p className="text-xs md:text-sm text-amber-705 dark:text-amber-400 font-semibold leading-relaxed mt-1">
                      Ao carregar uma planilha, as informações serão importadas e adicionadas com segurança ao sistema!
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-white rounded-[20px] font-black text-base uppercase tracking-wider transition-all shadow-md hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 cursor-pointer text-center">
                  📤 ENVIAR PLANILHA COMPLETA
                  <input type="file" accept=".xlsx, .xls" onChange={(e) => handleImportExcel(e, 'complete')} className="hidden" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-[16px] font-black text-sm uppercase tracking-wider transition-all shadow-sm hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-center">
                    👥 CLIENTES
                    <input type="file" accept=".xlsx, .xls" onChange={(e) => handleImportExcel(e, 'customers')} className="hidden" />
                  </label>
                  <label className="py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-[16px] font-black text-sm uppercase tracking-wider transition-all shadow-sm hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-center">
                    🏷️ PRODUTOS
                    <input type="file" accept=".xlsx, .xls" onChange={(e) => handleImportExcel(e, 'products')} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

          </div>

          {/* Opção 3: Sincronização em Nuvem */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-900 rounded-[40px] p-8 md:p-10 border-2 border-indigo-200 dark:border-indigo-900/40 shadow-lg flex flex-col md:flex-row justify-between items-center gap-8 text-left">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-4">
                <span className="text-5xl md:text-6xl select-none">☁️</span>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight uppercase">
                    Opção 3: Sincronização em Nuvem (Tempo Real)
                  </h3>
                  <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">
                    Conecte e compartilhe todos os aparelhos em tempo real
                  </p>
                </div>
              </div>
              
              <p className="text-sm md:text-base text-slate-750 dark:text-slate-300 font-bold leading-relaxed max-w-3xl">
                Diga adeus ao trabalho manual de baixar planilhas! Ative a **Sincronização em Nuvem** e o sistema enviará e receberá automaticamente todas as vendas, produtos e clientes em tempo real. Qualquer celular, computador ou tablet acessando a sua loja no <strong>vercel.app</strong> estará 100% atualizado instantaneamente! 🚀✨
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-950/40 rounded-xl text-indigo-700 dark:text-indigo-300 text-xs font-black uppercase tracking-wider">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                  Sincronização Ativa em Segundos
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-950/40 rounded-xl text-indigo-700 dark:text-indigo-300 text-xs font-black uppercase tracking-wider">
                  🔒 Criptografia Firebase Segura
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto shrink-0 bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 min-w-[280px]">
              <div className="space-y-1 text-center md:text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificador da Loja</p>
                <input 
                  type="text"
                  value={storeId}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                    setStoreId(val);
                    localStorage.setItem('biobel_store_id', val);
                  }}
                  disabled={cloudSyncEnabled}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-black text-center text-sm uppercase transition-all disabled:opacity-60 text-slate-900 dark:text-white"
                  placeholder="EX: BIOBEL"
                />
              </div>

              <div className="space-y-2">
                {cloudSyncEnabled ? (
                  <>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center gap-3">
                      <span className="text-xl">🟢</span>
                      <div>
                        <p className="text-xs text-emerald-800 dark:text-emerald-300 font-black uppercase tracking-wide">Nuvem Conectada</p>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-450 font-bold">
                          {lastCloudSyncTime ? `Sincronizado: ${new Date(lastCloudSyncTime).toLocaleTimeString()}` : 'Pronto e ativo!'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={disableCloudSync}
                      className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      🛑 DESATIVAR SINCRONIZAÇÃO
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center gap-3">
                      <span className="text-xl">⚪</span>
                      <div>
                        <p className="text-xs text-slate-500 font-black uppercase tracking-wide">Nuvem Desconectada</p>
                        <p className="text-[10px] text-slate-400 font-bold">Os dados estão apenas locais</p>
                      </div>
                    </div>
                    <button
                      onClick={enableCloudSync}
                      disabled={cloudSyncing}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-2"
                    >
                      {cloudSyncing ? (
                        <>
                          <RefreshCw className="animate-spin" size={14} /> CONECTANDO...
                        </>
                      ) : (
                        <>
                          ☁️ ATIVAR SINCRONIZAÇÃO EM NUVEM
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Guia Visual Inteligente Step-by-Step */}
          <div className="bg-slate-50 dark:bg-slate-805/40 rounded-[40px] p-8 md:p-12 border border-slate-100 dark:border-slate-800 space-y-10 text-left font-sans">
            <div className="text-center md:text-left space-y-2">
              <span className="text-5xl block md:inline md:mr-3">📖</span>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                Como usar em 3 passos bem fáceis
              </h3>
              <p className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Guia ilustrado passo a passo com carinho para você</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-150 dark:border-slate-800 space-y-4 shadow-sm">
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-3xl font-sans font-black">
                  1️⃣
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight">Baixar / Salvar Backup</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  Clique no **botão verde grande** chamado "BAIXAR / CRIAR BACKUP / SALVAR MEUS DADOS NO COMPUTADOR (EXCEL)". Um arquivo com seus dados será gerado e guardado automaticamente no seu computador.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-150 dark:border-slate-800 space-y-4 shadow-sm">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-3xl font-sans font-black">
                  2️⃣
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight">Guarde com Carinho</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  O arquivo ficará guardado com segurança na pasta do seu computador. Você pode colocá-lo em um pen drive ou enviá-lo por e-mail para maior proteção.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-150 dark:border-slate-800 space-y-4 shadow-sm">
                <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center text-3xl font-sans font-black">
                  3️⃣
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight">Traga de Volta</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  Se você trocar de computador ou perder os dados antigos, clique no **botão laranja grande** e selecione o arquivo gerado no Passo 1! Prontinho! 🎉
                </p>
              </div>

            </div>
          </div>

        </div>
      ) : (
        <div className="space-y-8 transition-all animate-in fade-in duration-300">
          
          {/* How to use correctly */}
      <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-3 text-slate-900">
            <Sparkles size={24} className="text-brand-600" />
            <h2 className="text-lg font-black uppercase tracking-tight">Entenda como seus dados são salvos:</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-brand-50 rounded-3xl border border-brand-100 space-y-4 col-span-2">
              <div className="flex items-center gap-3 text-brand-600">
                <Laptop size={24} />
                <h3 className="font-black uppercase tracking-widest text-sm">Modo Navegador (Local)</h3>
              </div>
              <p className="text-[11px] text-brand-800 font-bold leading-relaxed">
                Neste modo, os dados são salvos <strong>APENAS NESTE NAVEGADOR</strong>. 
                <br /><br />
                O sistema utiliza o armazenamento interno do seu navegador para manter suas informações seguras. 
                No entanto, se você limpar o histórico do navegador ou trocar de computador, os dados <strong>não aparecerão</strong>. 
                <strong>É fundamental realizar backups periódicos</strong> usando as ferramentas abaixo para garantir que você nunca perca suas informações.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-black">1</div>
              <h4 className="font-black text-xs uppercase tracking-widest">Salvar Backup</h4>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed">Crie uma cópia de segurança para garantir que não perderá nada.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-black">2</div>
              <h4 className="font-black text-xs uppercase tracking-widest">Fazer Alterações</h4>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed">Trabalhe no sistema, cadastre produtos ou importe planilhas.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-black">3</div>
              <h4 className="font-black text-xs uppercase tracking-widest">Restaurar se precisar</h4>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed">Se algo der errado ou quiser voltar atrás, use o arquivo salvo no passo 1.</p>
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 -right-10 -translate-y-1/2 opacity-5">
          <Database size={200} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm transition-all animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
              <History size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Histórico de Backups Automáticos</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">O sistema salva automaticamente às 10h e 17h para sua segurança</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
            <Zap size={10} className="animate-pulse" /> Ativo
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {autoBackups.length > 0 ? autoBackups.map((b) => (
            <div key={b.id} className="flex flex-col p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:border-blue-200 dark:hover:border-blue-900 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center font-black">
                  {b.hour}H
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {new Date(b.timestamp).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="mb-6">
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase">
                  Snapshot do Sistema
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                  {new Date(b.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Auto
                </p>
              </div>
              <button 
                onClick={() => handleRestoreAutoBackup(b)}
                className="w-full py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
              >
                Restaurar este ponto
              </button>
            </div>
          )) : (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
              <Database size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum backup automático disponível ainda</p>
            </div>
          )}
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Segurança Card */}
          <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Segurança</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proteja suas informações</p>
            </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Download size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Salvar cópia de segurança</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Guarde todos os seus dados para não perder nada. Recomendado fazer semanalmente.</p>
                </div>
              </div>
              <button 
                onClick={() => handleExportJSON('complete')}
                className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
              >
                <Download size={20} /> Salvar Backup Completo (.JSON)
              </button>
              <button 
                onClick={() => {
                  const data = { sales, products, customers, brands, productCategories, fixedCosts, financialAccounts, monthlyGoals, settings };
                  const dataStr = JSON.stringify(data);
                  const email = settings.backupEmail || 'jhoncorretor2025@gmail.com';
                  const dateStr = new Date().toISOString().split('T')[0];
                  const subject = encodeURIComponent(`Backup Biobel Manual - ${dateStr}`);
                  
                  const shortSummary = `Olá! Segue o backup de segurança manual do sistema Biobel Estética & Cosméticos.\n\n` +
                    `• Data de Envio: ${dateStr}\n` +
                    `• Vendas registradas: ${sales?.length || 0}\n` +
                    `• Produtos cadastrados: ${products?.length || 0}\n` +
                    `• Clientes cadastrados: ${customers?.length || 0}\n\n` +
                    `O payload de dados foi copiado para sua área de transferência (Clipboard). ` +
                    `Basta colar (Ctrl+V) no corpo do e-mail ou importar diretamente no sistema.\n\n` +
                    `--- PAYLOAD DO BACKUP ---\n` +
                    `${dataStr.substring(0, 1000)}... (payload completo copiado no Clipboard)`;

                  navigator.clipboard.writeText(dataStr);
                  window.location.href = `mailto:${email}?subject=${subject}&body=${encodeURIComponent(shortSummary)}`;
                  addNotification('Sucesso: Backup copiado para o Clipboard e e-mail aberto!', 'success');
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg transition-all"
              >
                <Mail size={18} /> Enviar Backup por E-mail 📬
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleExportJSON('customers')}
                  className="py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
                >
                  👥 Só Clientes (.JSON)
                </button>
                <button 
                  onClick={() => handleExportJSON('products')}
                  className="py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                >
                  🏷️ Só Produtos (.JSON)
                </button>
              </div>
              <p className="text-center text-[9px] text-slate-400 font-bold italic">
                <Info size={10} className="inline mr-1" /> Use "Salvar Backup" antes de fazer grandes mudanças no sistema.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Restaurar do arquivo</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Use um arquivo que você salvou anteriormente para recuperar seus dados.</p>
                </div>
              </div>
              <label className="w-full py-5 bg-white text-brand-600 border-2 border-brand-100 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 cursor-pointer hover:bg-brand-50 transition-all">
                <RefreshCw size={20} /> Restaurar Backup Completo (.JSON)
                <input type="file" accept=".json" onChange={(e) => handleRestoreJSON(e, 'complete')} className="hidden" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="py-3 bg-white text-blue-600 border border-blue-200 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-50 transition-all">
                  👥 Clientes (.JSON)
                  <input type="file" accept=".json" onChange={(e) => handleRestoreJSON(e, 'customers')} className="hidden" />
                </label>
                <label className="py-3 bg-white text-indigo-600 border border-indigo-200 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 cursor-pointer hover:bg-indigo-50 transition-all">
                  🏷️ Produtos (.JSON)
                  <input type="file" accept=".json" onChange={(e) => handleRestoreJSON(e, 'products')} className="hidden" />
                </label>
              </div>
              <p className="text-center text-[9px] text-slate-400 font-bold italic">
                <Info size={10} className="inline mr-1" /> Use "Restaurar" se algo der errado ou se trocar de computador.
              </p>
            </div>
          </div>
        </div>

        {/* Relatórios Card */}
        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Relatórios</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trabalhe com planilhas</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Exportar para Excel</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Gere uma planilha para ver seus dados no Excel ou enviar para o contador.</p>
                </div>
              </div>
              <button 
                onClick={() => handleExportExcel('complete')}
                className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-brand-100 hover:bg-brand-700 transition-all"
              >
                <FileText size={20} /> Baixar Planilha Completa (Excel)
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleExportExcel('customers')}
                  className="py-3 bg-teal-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-teal-700 transition-all"
                >
                  👥 Só Clientes (Excel)
                </button>
                <button 
                  onClick={() => handleExportExcel('products')}
                  className="py-3 bg-cyan-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-cyan-700 transition-all"
                >
                  🏷️ Só Produtos (Excel)
                </button>
              </div>
              <p className="text-center text-[9px] text-slate-400 font-bold italic">
                <Info size={10} className="inline mr-1" /> Exemplo: Use "Exportar Excel" para conferir os dados ou enviar ao contador.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 text-slate-600 rounded-xl">
                  <Database size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Importar Planilha</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Envie uma planilha de vendas externa para dentro do sistema.</p>
                </div>
              </div>
              <label className="w-full py-5 bg-white text-slate-900 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all font-sans">
                <Database size={20} /> Enviar Planilha Completa (Excel)
                <input type="file" accept=".xlsx, .xls" onChange={(e) => handleImportExcel(e, 'complete')} className="hidden" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="py-3 bg-white text-teal-600 border border-teal-200 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 cursor-pointer hover:bg-teal-50 transition-all">
                  👥 Importar Clientes
                  <input type="file" accept=".xlsx, .xls" onChange={(e) => handleImportExcel(e, 'customers')} className="hidden" />
                </label>
                <label className="py-3 bg-white text-cyan-600 border border-cyan-200 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 cursor-pointer hover:bg-cyan-50 transition-all">
                  🏷️ Importar Produtos
                  <input type="file" accept=".xlsx, .xls" onChange={(e) => handleImportExcel(e, 'products')} className="hidden" />
                </label>
              </div>
              <p className="text-center text-[9px] text-slate-400 font-bold italic">
                <Sparkles size={10} className="inline mr-1 text-amber-500" /> Não sabe o que escolher? Comece salvando um backup.
              </p>
            </div>

            {/* Google Sheets Real-Time Sync */}
            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800/60 font-sans">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase font-sans">Google Sheets em Tempo Real</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Importe e sincronize dados da sua planilha na nuvem instantaneamente.</p>
                </div>
              </div>

              <div className="space-y-4 bg-emerald-500/5 dark:bg-emerald-500/5 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm font-sans text-left">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-black text-emerald-800 dark:text-emerald-350 uppercase tracking-widest">Link da Planilha (Principal)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const currentUrls = settings.additionalGoogleSheetsUrls || [];
                        setSettings(prev => ({
                          ...prev,
                          additionalGoogleSheetsUrls: [...currentUrls, '']
                        }));
                      }}
                      className="flex items-center gap-1 text-[9px] font-black text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/40 px-2 py-1 rounded-lg transition-all"
                    >
                      <Plus size={10} />
                      Novo Link / Mês
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    value={settings.googleSheetsUrl || ''}
                    onChange={(e) => {
                      const newUrl = e.target.value;
                      setSettings(prev => ({ ...prev, googleSheetsUrl: newUrl }));
                    }}
                    className="w-full text-xs font-black px-4 py-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                  />
                </div>

                {/* Additional Google Sheets URLs */}
                {(settings.additionalGoogleSheetsUrls || []).map((url, idx) => (
                  <div key={idx} className="space-y-2 animate-fadeIn pt-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black text-emerald-800 dark:text-emerald-350 uppercase tracking-widest">Link Adicional #{idx + 1}</label>
                      <button
                        type="button"
                        onClick={() => {
                          const currentUrls = [...(settings.additionalGoogleSheetsUrls || [])];
                          currentUrls.splice(idx, 1);
                          setSettings(prev => ({
                            ...prev,
                            additionalGoogleSheetsUrls: currentUrls
                          }));
                        }}
                        className="text-rose-500 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest"
                      >
                        Remover
                      </button>
                    </div>
                    <input 
                      type="text" 
                      placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                      value={url}
                      onChange={(e) => {
                        const currentUrls = [...(settings.additionalGoogleSheetsUrls || [])];
                        currentUrls[idx] = e.target.value;
                        setSettings(prev => ({
                          ...prev,
                          additionalGoogleSheetsUrls: currentUrls
                        }));
                      }}
                      className="w-full text-xs font-black px-4 py-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                    />
                  </div>
                ))}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSyncGoogleSheetsLive(false)}
                    disabled={isSyncingSheets || !settings.googleSheetsUrl}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-md shadow-emerald-600/15 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                  >
                    {isSyncingSheets ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                    {isSyncingSheets ? 'Sincronizando...' : 'Sincronizar Nuvem Agora'}
                  </button>

                  {!driveToken ? (
                    <button
                      type="button"
                      onClick={handleConnectGoogleDrive}
                      disabled={isSignInDriveLoading}
                      className="w-full py-4 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-750 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                    >
                      {isSignInDriveLoading ? <RefreshCw className="animate-spin" size={14} /> : <FileSpreadsheet size={14} />}
                      {isSignInDriveLoading ? 'Conectando...' : 'Conectar Conta Google'}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-750 rounded-xl px-3 py-2 text-[10px] font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[120px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Conta Conectada
                      </span>
                      <button 
                        onClick={() => { setDriveToken(null); setDriveFiles([]); }}
                        className="text-rose-500 hover:underline uppercase text-[9px] font-black tracking-widest"
                      >
                        Desconectar
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-white/70 dark:bg-slate-900/10 rounded-2xl border border-emerald-100/30 dark:border-emerald-900/20 text-[10px] font-medium text-emerald-800 dark:text-emerald-300 leading-normal flex items-start gap-2">
                  <span className="text-base leading-none">💡</span>
                  <div>
                    <strong className="block uppercase font-black tracking-wider text-[9px] mb-0.5">Conexão Automática Ativada:</strong>
                    Como seu link da planilha já está salvo, o sistema atualizará seus dados da nuvem **automaticamente** ao abrir a aplicação, sem cliques necessários!
                  </div>
                </div>

                {settings.googleSheetsUrl && (
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 leading-normal">
                    📌 *Fuso horário de Gravataí (RS) e Tabelas:* Os produtos e vendas importados serão mesclados de forma inteligente com os atuais, prevenindo duplicados.
                  </p>
                )}
              </div>
            </div>

            {/* Google Drive Integration */}
            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase font-sans">Google Drive</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Importe planilhas ou backups .json direto da nuvem com 1 clique.</p>
                </div>
              </div>

              {!driveToken ? (
                <button
                  type="button"
                  onClick={handleConnectGoogleDrive}
                  disabled={isSignInDriveLoading}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 transition-all disabled:opacity-50 font-sans"
                >
                  {isSignInDriveLoading ? (
                    <RefreshCw className="animate-spin" size={20} />
                  ) : (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                    </svg>
                  )}
                  {isSignInDriveLoading ? 'Conectando...' : 'Conectar Google Drive'}
                </button>
              ) : (
                <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 font-sans">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Conectado como {googleUser?.displayName || 'Usuário Google'}
                    </span>
                    <button 
                      onClick={() => { setDriveToken(null); setDriveFiles([]); }}
                      className="text-rose-500 hover:underline uppercase text-[9px] font-black tracking-widest"
                    >
                      Desconectar
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Buscar nos arquivos listados..."
                      value={searchTermDrive}
                      onChange={(e) => setSearchTermDrive(e.target.value)}
                      className="flex-1 text-[11px] font-bold px-3 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:border-blue-400 dark:text-white"
                    />
                    <button 
                      onClick={() => fetchDriveFiles(driveToken)}
                      disabled={isListingFiles}
                      className="px-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-500 hover:text-blue-500 transition-colors flex items-center justify-center placeholder:text-slate-400"
                      title="Atualizar lista"
                    >
                      <RefreshCw size={14} className={isListingFiles ? "animate-spin" : ""} />
                    </button>
                  </div>

                  {isListingFiles ? (
                    <div className="py-6 text-center space-y-2">
                      <RefreshCw className="animate-spin mx-auto text-blue-500" size={18} />
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Buscando arquivos na sua nuvem...</p>
                    </div>
                  ) : driveFiles.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 pr-1 select-none">
                      {driveFiles
                        .filter(f => f.name.toLowerCase().includes(searchTermDrive.toLowerCase()))
                        .map(file => {
                          const isExcel = file.mimeType.includes('sheet') || file.mimeType.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
                          const dateStr = new Date(file.modifiedTime).toLocaleDateString('pt-BR');
                          const isCurrentlyImporting = importingFileId === file.id;

                          return (
                            <div key={file.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5" title={file.name}>
                                  {isExcel ? <FileSpreadsheet size={12} className="text-emerald-500 shrink-0" /> : <FileText size={12} className="text-blue-500 shrink-0" />}
                                  {file.name}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                  Modificado em: {dateStr} {file.size ? `• ${(file.size / 1024).toFixed(1)} KB` : ''}
                                </p>
                              </div>
                              <button
                                onClick={() => handleImportDriveFile(file)}
                                disabled={isCurrentlyImporting || !!importingFileId}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 transition-all ${
                                  isCurrentlyImporting 
                                    ? 'bg-amber-100 text-amber-700' 
                                    : 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white'
                                }`}
                              >
                                {isCurrentlyImporting ? 'Importando...' : 'Importar'}
                              </button>
                            </div>
                          );
                      })}
                      {driveFiles.filter(f => f.name.toLowerCase().includes(searchTermDrive.toLowerCase())).length === 0 && (
                        <p className="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum arquivo correspondente encontrado.</p>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400 space-y-1">
                      <Info size={16} className="mx-auto" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Nenhum arquivo compatível encontrado (.xlsx, .xls, .json)</p>
                      <p className="text-[9px] font-bold mt-1">Os backups ou planilhas de vendas precisam estar na sua conta do Google Drive para que o sistema possa listá-los.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EXCLUIR VENDAS DE UM MÊS ESPECÍFICO */}
      <div className="bg-slate-900 rounded-[40px] p-10 border border-slate-800 shadow-2xl space-y-6 text-left">
        <div className="flex items-center gap-4 text-rose-500">
          <Trash2 size={32} />
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Excluir Período Específico</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remova as vendas de um mês inteiro do seu banco de faturamento</p>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium leading-relaxed font-sans">
          Deseja reimportar uma planilha de vendas ou limpar erros de um mês específico? 
          Selecione o mês desejado abaixo para remover as vendas daquele período sem afetar outros meses de faturamento já salvos no sistema.
        </div>

        {availableSalesMonths.length > 0 ? (
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-850 p-6 rounded-3xl border border-slate-800/80 font-sans">
            <div className="w-full sm:w-auto">
              <label className="block text-[9px] font-black text-rose-450 text-rose-400 uppercase tracking-widest mb-1.5 font-sans">Selecione o Mês para Remover</label>
              <select
                value={selectedMonthToDelete}
                onChange={(e) => setSelectedMonthToDelete(e.target.value)}
                className="w-full sm:w-64 px-4 py-3 bg-slate-900 border border-slate-705 border-slate-700 rounded-xl outline-none text-xs font-bold text-white focus:border-rose-500 font-sans"
              >
                <option value="">Selecione um mês...</option>
                {availableSalesMonths.map(m => {
                  const [year, month] = m.split('-');
                  const dateObj = new Date(parseInt(year), parseInt(month) - 1, 15);
                  const formatted = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  return (
                    <option key={m} value={m}>
                      {formatted.toUpperCase()} ({m})
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!selectedMonthToDelete) {
                  addNotification('Selecione um mês para poder remover.', 'warning');
                  return;
                }
                setShowDeleteMonthConfirm(true);
              }}
              disabled={!selectedMonthToDelete}
              className={cn(
                "w-full sm:w-auto sm:self-end px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg font-sans cursor-pointer",
                selectedMonthToDelete 
                  ? "bg-rose-600 hover:bg-rose-750 hover:bg-rose-700 text-white shadow-rose-950/40" 
                  : "bg-slate-800 text-slate-500 border border-slate-750 cursor-not-allowed opacity-50"
              )}
            >
              <Trash2 size={14} /> Excluir Vendas do Mês
            </button>
          </div>
        ) : (
          <div className="p-6 text-center bg-slate-850 rounded-2xl text-xs text-slate-505 text-slate-500 font-bold font-sans border border-slate-800/40">
            Nenhuma venda registrada no sistema para identificar os meses disponíveis. (Comece importando alguma planilha!).
          </div>
        )}
      </div>

      {/* Avançado (Perigo) */}
      <div className="bg-slate-900 rounded-[40px] p-10 space-y-10 border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-4 text-rose-500">
          <AlertTriangle size={32} />
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Avançado (Perigo)</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações que não podem ser desfeitas</p>
          </div>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-500 text-white rounded-2xl">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-2">
              <h4 className="text-rose-500 font-black uppercase tracking-widest text-xs">Antes de clicar, leia:</h4>
              <ul className="text-[10px] text-rose-400 font-bold space-y-1 list-disc list-inside">
                <li>Isso vai apagar TODOS os dados do sistema</li>
                <li>Não pode ser desfeito (sem volta)</li>
                <li>Recomendamos salvar um backup antes</li>
              </ul>
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 bg-rose-500/5 rounded-2xl cursor-pointer group">
            <input 
              type="checkbox" 
              checked={isDangerZoneChecked}
              onChange={(e) => setIsDangerZoneChecked(e.target.checked)}
              className="w-6 h-6 rounded-lg border-2 border-rose-500/30 bg-transparent text-rose-500 focus:ring-0"
            />
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest group-hover:text-rose-400 transition-colors">
              Eu entendo que isso não tem volta
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button 
            onClick={handleClearSales}
            disabled={!isDangerZoneChecked}
            className={cn(
              "py-6 rounded-3xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-3 transition-all",
              isDangerZoneChecked ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20" : "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50"
            )}
          >
            <Trash2 size={24} /> Limpar Histórico de Vendas
          </button>
          <button 
            onClick={handleResetSystem}
            disabled={!isDangerZoneChecked}
            className={cn(
              "py-6 rounded-3xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-3 transition-all",
              isDangerZoneChecked ? "bg-rose-600 text-white shadow-lg shadow-rose-900/50 hover:bg-rose-700" : "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50"
            )}
          >
            <AlertTriangle size={24} /> Resetar Todo o Sistema
          </button>
          <button 
            onClick={handleRestoreDefaults}
            disabled={!isDangerZoneChecked}
            className={cn(
              "py-6 rounded-3xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-3 transition-all",
              isDangerZoneChecked ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50"
            )}
          >
            <RefreshCw size={24} /> Restaurar Dados Padrão
          </button>
        </div>
      </div>
    </div>
  )}

      <AnimatePresence>
        {showClearSalesConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-rose-50/55 dark:bg-rose-950/10">
                <div className="flex items-center gap-3">
                  <Trash2 className="text-rose-500 animate-pulse" size={24} />
                  <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">
                    Confirmar Limpeza
                  </h3>
                </div>
                <button onClick={() => setShowClearSalesConfirm(false)} className="p-2 hover:bg-slate-150 dark:hover:bg-slate-80 rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-305 leading-relaxed">
                  Você tem certeza que deseja **apagar TODO o histórico de vendas** permanentemente? Esta ação não pode ser desfeita e todas as vendas da tela serão excluídas.
                </p>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
                <button 
                  onClick={() => setShowClearSalesConfirm(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmClearSales}
                  className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/30 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Confirmar e Limpar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showDeleteMonthConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-rose-50/55 dark:bg-rose-950/10">
                <div className="flex items-center gap-3">
                  <Trash2 className="text-rose-505 text-rose-550 text-rose-500 animate-pulse" size={24} />
                  <h3 className="text-lg font-black text-rose-600 dark:text-rose-450 uppercase tracking-tight font-sans">
                    Confirmar Exclusão
                  </h3>
                </div>
                <button onClick={() => setShowDeleteMonthConfirm(false)} className="p-2 hover:bg-slate-150 dark:hover:bg-slate-80 rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-left font-sans">
                <p className="text-xs sm:text-sm font-medium text-slate-655 text-slate-600 dark:text-slate-300 leading-relaxed">
                  Você tem certeza absoluta que deseja <span className="text-rose-500 font-extrabold">deletar permanentemente todas as vendas</span> de <strong className="text-slate-900 dark:text-white uppercase font-black">{(() => {
                    try {
                      const [year, month] = selectedMonthToDelete.split('-');
                      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 15);
                      return dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
                    } catch (e) {
                      return selectedMonthToDelete;
                    }
                  })()} ({selectedMonthToDelete})</strong>?
                </p>
                <p className="text-[11px] text-rose-505 text-rose-450 font-bold bg-rose-500/5 p-4 rounded-xl border border-rose-500/10">
                  ⚠️ Esta ação é irreversível. Todas as transações e o faturamento histórico deste mês de vendas serão excluídos do sistema. Os produtos cadastrados e as vendas dos demais meses (como Junho) permanecerão intocados.
                </p>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4 font-sans">
                <button 
                  onClick={() => setShowDeleteMonthConfirm(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    try {
                      setShowDeleteMonthConfirm(false);
                      const updatedSales = sales.filter(sale => !sale.date.startsWith(selectedMonthToDelete));
                      
                      // Também persistir no Firestore se estiver integrado, senão o setSales cuida da persistência local
                      setSales(updatedSales);
                      addNotification(`Todas as vendas de ${selectedMonthToDelete} foram excluídas permanentemente!`, 'success');
                      setSelectedMonthToDelete('');
                    } catch (err) {
                      addNotification('Erro ao excluir vendas do período.', 'error');
                    }
                  }}
                  className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/40 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all cursor-pointer"
                >
                  Confirmar e Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showResetSystemConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-rose-100/30 dark:bg-rose-950/20">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-rose-600" size={24} />
                  <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">
                    Resetar Todo o Sistema
                  </h3>
                </div>
                <button onClick={() => setShowResetSystemConfirm(false)} className="p-2 hover:bg-slate-150 dark:hover:bg-slate-80 rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-305 leading-relaxed">
                  Você tem certeza que deseja **resetar TODO o sistema para o estado inicial (vazio)**? Isso restaurará o banco interno, zerando suas vendas, produtos, dados de clientes, comissões, metas e histórico completo.
                </p>
                <div className="p-4 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl">
                  <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">Aviso de Segurança</p>
                  <p className="text-xs text-rose-700 dark:text-rose-300 font-medium font-bold">Esta é uma ação destrutiva que remove todos os produtos cadastrados e histórico local. Ela é irreversível!</p>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
                <button 
                  onClick={() => setShowResetSystemConfirm(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmResetSystem}
                  className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/30 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Confirmar e Resetar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showRestoreDefaultsConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-blue-50/55 dark:bg-blue-950/10">
                <div className="flex items-center gap-3">
                  <RefreshCw className="text-blue-500" size={24} />
                  <h3 className="text-lg font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                    Restaurar Dados Padrão
                  </h3>
                </div>
                <button onClick={() => setShowRestoreDefaultsConfirm(false)} className="p-2 hover:bg-slate-150 dark:hover:bg-slate-80 rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-305 leading-relaxed">
                  Deseja realmente **restaurar as configurações e produtos de fábrica** do sistema? Isso reescreverá a grade padrão de itens e marcas de demonstração.
                </p>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
                <button 
                  onClick={() => setShowRestoreDefaultsConfirm(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmRestoreDefaults}
                  className="flex-1 py-4 bg-blue-605 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/30 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Restaurar Padrão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SaleRow = React.memo(({ 
  sale, 
  formatCurrency, 
  handleStatusChange, 
  setSelectedSale,
  handleWhatsAppShare,
  handlePrintReceipt,
  isMaxVolume,
  weatherObservations,
  handleEditSale,
  handleDeleteSale
}: { 
  sale: Sale, 
  formatCurrency: (v: number) => string, 
  handleStatusChange: (id: string, s: string) => void,
  setSelectedSale: (s: Sale) => void,
  handleWhatsAppShare?: (sale?: Sale) => void,
  handlePrintReceipt?: (sale?: Sale) => void,
  isMaxVolume?: boolean,
  weatherObservations?: {[dateStr: string]: { condition: string; notes: string }},
  handleEditSale?: (s: Sale) => void,
  handleDeleteSale?: (id: string) => void
}) => {
  const isKit = sale.category?.toLowerCase().includes('kit') || sale.items.some(i => i.name.toLowerCase().includes('kit'));
  const isCombo = sale.category?.toLowerCase().includes('combo') || sale.items.some(i => i.name.toLowerCase().includes('combo'));

  const dateKey = sale.date.split('T')[0];
  const weatherObs = weatherObservations?.[dateKey];
  const weathersMap: {[key: string]: { label: string, icon: string, color: string }} = {
    ensolarado: { label: 'Ensolarado', icon: '☀️', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
    nublado: { label: 'Nublado', icon: '☁️', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400' },
    chuvoso: { label: 'Chuvoso', icon: '🌧️', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
    chuva_forte: { label: 'Chuva Forte', icon: '⛈️', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-455' }
  };

  return (
    <tr className={cn(
      "hover:bg-slate-50 transition-colors",
      isKit ? "bg-purple-50/40 dark:bg-purple-900/10" : 
      isCombo ? "bg-indigo-50/40 dark:bg-indigo-900/10" : ""
    )}>
    <td className="px-6 py-4">
      <div className="flex flex-col">
        <span className="text-xs font-black text-slate-900">{formatDateWithDayOfWeek(sale.date)}</span>
        <span className="text-[10px] font-bold text-slate-400 mb-0.5">{new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        {weatherObs && (
          <div className="flex items-center gap-1 text-[9px] font-bold mt-1 max-w-[120px]" title={`Clima: ${weathersMap[weatherObs.condition]?.label}\nObservação: ${weatherObs.notes}`}>
            <span className={cn("px-1.5 py-0.5 rounded-full select-none cursor-help flex items-center gap-0.5", weathersMap[weatherObs.condition]?.color || 'bg-slate-150')}>
              {weathersMap[weatherObs.condition]?.icon || '🌤️'} {weathersMap[weatherObs.condition]?.label || weatherObs.condition}
            </span>
          </div>
        )}
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black">
          {sale.vendedora?.charAt(0)}
        </div>
        <span className="text-xs font-bold text-slate-700">{sale.vendedora}</span>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-700">
            {sale.items.reduce((acc, item) => acc + (item.quantity || 1), 0)} {sale.items.reduce((acc, item) => acc + (item.quantity || 1), 0) === 1 ? 'item' : 'itens'}
          </span>
          {isMaxVolume && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[8px] font-black rounded-lg uppercase tracking-widest border border-amber-200/50" title="Maior volume de produtos vendidos no mês!">
              <Star size={9} className="fill-amber-500 text-amber-500 animate-pulse" />
              Volume Máx
            </span>
          )}
        </div>
        <span className="text-[9px] text-slate-400 font-medium truncate max-w-[120px]">
          {sale.items.map(i => i.name).join(', ')}
        </span>
      </div>
    </td>
    <td className="px-6 py-4">
      <span className={cn(
        "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
        isKit ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
        isCombo ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" :
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      )}>
        {sale.category || 'VENDA À VISTA'}
      </span>
    </td>
    <td className="px-6 py-4">
      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
        {sale.paymentMethod}
      </span>
    </td>
    <td className="px-6 py-4 text-center">
      <select
        value={sale.status}
        onChange={(e) => handleStatusChange(sale.id, e.target.value)}
        className={cn(
          "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border-none focus:ring-2 focus:ring-blue-500 cursor-pointer",
          sale.status === 'completed' || sale.status === 'Concluída' ? "bg-emerald-100 text-emerald-700" : 
          sale.status === 'returned' || sale.status === 'Devolvida' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
        )}
      >
        <option value="Concluída">Concluída</option>
        <option value="Devolvida">Devolvida</option>
        <option value="Pendente">Pendente</option>
      </select>
    </td>
    <td className="px-6 py-4 text-center">
      <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">
        {sale.type || 'Presencial'}
      </span>
    </td>
    <td className="px-6 py-4 text-right">
      <span className="text-xs font-black text-emerald-600">{formatCurrency(sale.commission || 0)}</span>
    </td>
    <td className="px-6 py-4 text-right">
      <span className="text-sm font-black text-slate-900">{formatCurrency(sale.total)}</span>
    </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button 
                      onClick={() => setSelectedSale(sale)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Ver Detalhes e Cupom"
                    >
                      <Eye size={16} />
                    </button>
                    {handlePrintReceipt && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintReceipt(sale);
                        }}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Imprimir Cupom"
                      >
                        <Printer size={16} />
                      </button>
                    )}
                    {handleWhatsAppShare && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWhatsAppShare(sale);
                        }}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="WhatsApp Comprovante"
                      >
                        <MessageCircle size={16} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const msg = `Olá ${sale.customerName}! 🌸 Aqui é da Biobel. Gostaríamos de saber o que achou da sua compra. De 0 a 10, como você avalia sua experiência conosco?`;
                        window.open(getWhatsAppUrl(sale.customerPhone || '', msg), '_blank');
                      }}
                      className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                      title="Enviar NPS (Satisfação)"
                    >
                      <MessageSquare size={16} />
                    </button>
                    {handleEditSale && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSale(sale);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar Venda"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {handleDeleteSale && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSale(sale.id);
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Excluir Venda"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
  </tr>
  );
});

export const SaleMobileCard = React.memo(({ 
  sale, 
  formatCurrency, 
  handleStatusChange, 
  setSelectedSale,
  handleWhatsAppShare,
  handlePrintReceipt,
  isMaxVolume,
  weatherObservations,
  handleEditSale,
  handleDeleteSale
}: { 
  sale: Sale, 
  formatCurrency: (v: number) => string, 
  handleStatusChange: (id: string, s: string) => void,
  setSelectedSale: (s: Sale) => void,
  handleWhatsAppShare?: (sale?: Sale) => void,
  handlePrintReceipt?: (sale?: Sale) => void,
  isMaxVolume?: boolean,
  weatherObservations?: {[dateStr: string]: { condition: string; notes: string }},
  handleEditSale?: (s: Sale) => void,
  handleDeleteSale?: (id: string) => void
}) => {
  const isKit = sale.category?.toLowerCase().includes('kit') || sale.items.some(i => i.name.toLowerCase().includes('kit'));
  const isCombo = sale.category?.toLowerCase().includes('combo') || sale.items.some(i => i.name.toLowerCase().includes('combo'));

  const dateKey = sale.date.split('T')[0];
  const weatherObs = weatherObservations?.[dateKey];
  const weathersMap: {[key: string]: { label: string, icon: string, color: string }} = {
    ensolarado: { label: 'Ensolarado', icon: '☀️', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
    nublado: { label: 'Nublado', icon: '☁️', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400' },
    chuvoso: { label: 'Chuvoso', icon: '🌧️', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
    chuva_forte: { label: 'Chuva Forte', icon: '⛈️', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-455' }
  };

  return (
    <div className={cn(
      "p-4 space-y-3",
      isKit ? "bg-purple-50/40 dark:bg-purple-900/10" : 
      isCombo ? "bg-indigo-50/40 dark:bg-indigo-900/10" : ""
    )}>
    <div className="flex justify-between items-start">
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-black text-slate-900">{formatDateWithDayOfWeek(sale.date)}</span>
          {isMaxVolume && (
            <span className="inline-flex items-center gap-0.5 px-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[8px] font-black rounded-lg uppercase tracking-widest border border-amber-200/50" title="Maior volume de produtos vendidos no mês!">
              <Star size={8} className="fill-amber-500 text-amber-500 animate-pulse" />
              Volume Máx
            </span>
          )}
          {weatherObs && (
            <span className={cn("inline-flex items-center gap-0.5 px-1 text-[8px] rounded-lg tracking-widest font-bold", weathersMap[weatherObs.condition]?.color || 'bg-slate-150')} title={`Clima: ${weathersMap[weatherObs.condition]?.label}\nObservação: ${weatherObs.notes}`}>
              {weathersMap[weatherObs.condition]?.icon} {weathersMap[weatherObs.condition]?.label}
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold text-slate-400">{new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <span className="text-sm font-black text-slate-900">{formatCurrency(sale.total)}</span>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black">
          {sale.vendedora?.charAt(0)}
        </div>
        <span className="text-xs font-bold text-slate-700">{sale.vendedora}</span>
      </div>
      <select
        value={sale.status}
        onChange={(e) => handleStatusChange(sale.id, e.target.value)}
        className={cn(
          "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border-none focus:ring-2 focus:ring-blue-500 cursor-pointer",
          sale.status === 'completed' || sale.status === 'Concluída' ? "bg-emerald-100 text-emerald-700" : 
          sale.status === 'returned' || sale.status === 'Devolvida' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
        )}
      >
        <option value="Concluída">Concluída</option>
        <option value="Devolvida">Devolvida</option>
        <option value="Pendente">Pendente</option>
      </select>
    </div>
    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
      <div className="flex gap-2">
        <span className={cn(
          "px-2 py-1 rounded-lg",
          isKit ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
          isCombo ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" :
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
        )}>
          {sale.category || 'VENDA À VISTA'}
        </span>
        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">
          {sale.paymentMethod}
        </span>
      </div>
      <div className="flex gap-1.5">
        <button 
          onClick={() => setSelectedSale(sale)}
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          title="Ver Detalhes"
        >
          <Eye size={16} />
        </button>
        {handlePrintReceipt && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handlePrintReceipt(sale);
            }}
            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title="Imprimir Cupom"
          >
            <Printer size={16} />
          </button>
        )}
        {handleWhatsAppShare && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleWhatsAppShare(sale);
            }}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
            title="WhatsApp Comprovante"
          >
            <MessageCircle size={16} />
          </button>
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            const msg = `Olá ${sale.customerName}! 🌸 Aqui é da Biobel. Gostaríamos de saber o que achou da sua compra. De 0 a 10, como você avalia sua experiência conosco?`;
            window.open(getWhatsAppUrl(sale.customerPhone || '', msg), '_blank');
          }}
          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
          title="Enviar NPS (Satisfação)"
        >
          <MessageSquare size={16} />
        </button>
        {handleEditSale && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleEditSale(sale);
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="Editar Venda"
          >
            <Edit2 size={16} />
          </button>
        )}
        {handleDeleteSale && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteSale(sale.id);
            }}
            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            title="Excluir Venda"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
    </div>
  );
});
