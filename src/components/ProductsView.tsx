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

export const ProductsView = ({ 
  products, 
  sales,
  setProducts, 
  brands, 
  productCategories,
  setProductCategories,
  addNotification, 
  handleFirestoreError, 
  user, 
  formatCurrency, 
  typeFilter, 
  ensureAuthSession,
  stockBatches = [],
  setStockBatches = () => {},
  settings = {} as any,
  setSettings = () => {},
  financialAccounts = [],
  setFinancialAccounts = () => {}
}: ProductsViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showZeroStockOnly, setShowZeroStockOnly] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isBuySuggestionsExpanded, setIsBuySuggestionsExpanded] = useState(false);
  const [isLowStockExpanded, setIsLowStockExpanded] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', brand: '', category: 'Cabelos', price: 0, cost: 0, stock: 0, minStock: 5, expiryDate: '', type: typeFilter || 'avulso', comboItems: [], barcode: '', promoPixPrice: 0, promoCardPrice: 0, promoMoneyPrice: 0, packContents: '', kitMode: 'montar'
  });

  // Merchandise Arrival state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entrySupplierId, setEntrySupplierId] = useState('');
  const [entryArrivalDate, setEntryArrivalDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryItems, setEntryItems] = useState<any[]>([]);
  const [isInlineSupplierModalOpen, setIsInlineSupplierModalOpen] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({ name: '', cnpj: '', phone: '', brand: '' });
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
  const [productsViewMode, setProductsViewMode] = useState<'table' | 'grid'>('table');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const handleAddEntryItem = () => {
    setEntryItems(prev => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        productId: '',
        isNewProduct: false,
        newProductName: '',
        newProductCategory: 'Cabelos',
        newProductMinStock: 5,
        quantity: 1,
        cost: 0,
        price: 0,
        expiryDate: '',
        paymentDate: '',
        batchNumber: ''
      }
    ]);
  };

  const handleRemoveEntryItem = (itemId: string) => {
    setEntryItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleXMLImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const xmlText = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        // Parse Emitente (Supplier)
        const emitNode = xmlDoc.getElementsByTagName("emit")?.[0];
        const emitName = emitNode?.getElementsByTagName("xNome")?.[0]?.textContent || '';
        const emitCNPJ = emitNode?.getElementsByTagName("CNPJ")?.[0]?.textContent || '';
        const emitPhone = emitNode?.getElementsByTagName("enderEmit")?.[0]?.getElementsByTagName("fone")?.[0]?.textContent || '';

        if (!emitName) {
          addNotification('Não foi possível identificar o emitente no XML de NFe.', 'warning');
          return;
        }

        // Try to find existing supplier matching CNPJ or Name
        const currentSuppliers = settings.officialProviders || [];
        let supplierId = '';
        const matchedSup = currentSuppliers.find((s: any) => 
          (s.cnpj && s.cnpj.replace(/\D/g, '') === emitCNPJ.replace(/\D/g, '')) || 
          s.name.toUpperCase().includes(emitName.toUpperCase()) || 
          emitName.toUpperCase().includes(s.name.toUpperCase())
        );

        if (matchedSup) {
          supplierId = matchedSup.id;
          addNotification(`Fornecedor ${matchedSup.name} identificado automaticamente!`, 'success');
        } else {
          // Add inline supplier
          const newSuppId = `sup_${Date.now()}`;
          const formattedCNPJ = emitCNPJ.length === 14 
            ? emitCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") 
            : emitCNPJ;
          const formattedPhone = emitPhone || '(51) 99999-9999';
          const newSupp = {
            id: newSuppId,
            name: emitName.toUpperCase(),
            cnpj: formattedCNPJ,
            phone: formattedPhone,
            brand: emitName.split(' ')[0].toUpperCase()
          };
          setSettings({
            ...settings,
            officialProviders: [...currentSuppliers, newSupp]
          });
          supplierId = newSuppId;
          addNotification(`Novo Fornecedor [${emitName.toUpperCase()}] cadastrado e selecionado via XML!`, 'success');
        }

        setEntrySupplierId(supplierId);

        // Parse items (det)
        const detElements = xmlDoc.getElementsByTagName("det");
        if (detElements.length === 0) {
          addNotification('Nenhum detalhe de produto (det) encontrado no XML.', 'warning');
          return;
        }

        const parsedItems: any[] = [];
        for (let i = 0; i < detElements.length; i++) {
          const det = detElements[i];
          const prodNode = det.getElementsByTagName("prod")?.[0];
          if (!prodNode) continue;

          const prodName = prodNode.getElementsByTagName("xProd")?.[0]?.textContent || '';
          const barcode = prodNode.getElementsByTagName("cEAN")?.[0]?.textContent || '';
          const quantity = Number(prodNode.getElementsByTagName("qCom")?.[0]?.textContent) || 1;
          const unitCost = Number(prodNode.getElementsByTagName("vUnCom")?.[0]?.textContent) || 0;

          // Parse batch number (nLote) and expiry (dVal) from rastro
          const rastroNode = det.getElementsByTagName("rastro")?.[0];
          let batchNum = '';
          let expDate = '';
          if (rastroNode) {
            batchNum = rastroNode.getElementsByTagName("nLote")?.[0]?.textContent || '';
            expDate = rastroNode.getElementsByTagName("dVal")?.[0]?.textContent || '';
          }

          // Search if product already exists (by exact name or barcode)
          const matchedProd = products.find(p => 
            (barcode && barcode !== 'SEM GTIN' && p.barcode === barcode) ||
            p.name.toUpperCase().trim() === prodName.toUpperCase().trim()
          );

          parsedItems.push({
            id: `item_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
            productId: matchedProd ? matchedProd.id : '',
            isNewProduct: !matchedProd,
            newProductName: matchedProd ? '' : prodName.toUpperCase(),
            newProductCategory: 'Cabelos',
            newProductMinStock: 5,
            quantity: quantity,
            cost: unitCost,
            price: matchedProd ? matchedProd.price : Math.round(unitCost * 1.8),
            expiryDate: expDate || '',
            paymentDate: '',
            batchNumber: batchNum.toUpperCase()
          });
        }

        setEntryItems(parsedItems);
        addNotification(`XML de NFe lido com sucesso! ${parsedItems.length} produtos importados para revisão.`, 'success');
      } catch (err) {
        console.error(err);
        addNotification('Erro ao processar arquivo XML. Certifique-se de que é uma NFe válida.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateEntryItem = (itemId: string, field: string, value: any) => {
    setEntryItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        // Auto fill price/cost/category if product is selected
        if (field === 'productId' && !item.isNewProduct) {
          const prod = products.find(p => p.id === value);
          if (prod) {
            updated.cost = prod.cost || 0;
            updated.price = prod.price || 0;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSaveInlineSupplier = () => {
    if (!newSupplierData.name) {
      addNotification('O nome do fornecedor é obrigatório!', 'warning');
      return;
    }
    const currentSuppliers = settings.officialProviders || [];
    const newSupp = {
      id: `sup_${Date.now()}`,
      name: newSupplierData.name.toUpperCase(),
      cnpj: newSupplierData.cnpj || '00.000.000/0001-00',
      phone: newSupplierData.phone || '(51) 99999-9999',
      brand: (newSupplierData.brand || newSupplierData.name).toUpperCase()
    };
    setSettings({
      ...settings,
      officialProviders: [...currentSuppliers, newSupp]
    });
    setEntrySupplierId(newSupp.id);
    setIsInlineSupplierModalOpen(false);
    setNewSupplierData({ name: '', cnpj: '', phone: '', brand: '' });
    addNotification('Fornecedor cadastrado e selecionado!', 'success');
  };

  const toggleBatchPaymentStatus = (batchId: string) => {
    const updatedBatches = stockBatches.map(b => {
      if (b.id === batchId) {
        const nextStatus = b.paymentStatus === 'paid' ? 'pending' : 'paid';
        
        // Update financial accounts in parent
        const updatedAccounts = financialAccounts.map(fa => {
          if (fa.id === `fin_payable_batch_${batchId}`) {
            return {
              ...fa,
              status: nextStatus as 'paid' | 'pending',
              paymentDate: nextStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined
            };
          }
          return fa;
        });
        setFinancialAccounts(updatedAccounts);
        
        return { ...b, paymentStatus: nextStatus };
      }
      return b;
    });
    setStockBatches(updatedBatches);
    addNotification('Status de pagamento do lote atualizado!', 'success');
  };

  const handleDeleteBatch = (batchId: string, pId: string, qty: number) => {
    if (!window.confirm(`Tem certeza que deseja remover este lote? Isso também irá subtrair ${qty} unidades do estoque do produto.`)) return;
    
    // Subtract stock from product
    setProducts(prev => prev.map(p => {
      if (p.id === pId) {
        return { ...p, stock: Math.max(0, p.stock - qty) };
      }
      return p;
    }));

    // Remove batch from stockBatches
    setStockBatches(prev => prev.filter(b => b.id !== batchId));

    // Remove financial account if any
    setFinancialAccounts(prev => prev.filter(fa => fa.id !== `fin_payable_batch_${batchId}`));

    addNotification('Lote removido e estoque ajustado com sucesso!', 'info');
  };

  const handleSaveMerchandiseEntry = () => {
    if (!entrySupplierId) {
      addNotification('Selecione um fornecedor para registrar a entrada!', 'warning');
      return;
    }
    if (entryItems.length === 0) {
      addNotification('Adicione pelo menos um produto ao lote!', 'warning');
      return;
    }

    // Validate items
    for (let i = 0; i < entryItems.length; i++) {
      const item = entryItems[i];
      if (item.isNewProduct) {
        if (!item.newProductName) {
          addNotification(`Preencha o nome para o novo produto na linha ${i + 1}!`, 'warning');
          return;
        }
      } else {
        if (!item.productId) {
          addNotification(`Selecione um produto existente na linha ${i + 1}!`, 'warning');
          return;
        }
      }
      if (item.quantity <= 0) {
        addNotification(`A quantidade deve ser maior que zero na linha ${i + 1}!`, 'warning');
        return;
      }
    }

    const selectedSup = (settings.officialProviders || []).find((s: any) => s.id === entrySupplierId);
    const supplierName = selectedSup ? selectedSup.name : 'FORNECEDOR';
    const supplierBrand = selectedSup ? selectedSup.brand : 'BIOBEL';

    let updatedProducts = [...products];
    const newBatches: StockBatch[] = [];
    const newFinancials: any[] = [];

    for (const item of entryItems) {
      let finalProductId = item.productId;
      let finalProductName = '';
      let finalProductBrand = supplierBrand;

      if (item.isNewProduct) {
        // Create new product
        const newProdId = `P_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newProd: Product = {
          id: newProdId,
          name: item.newProductName.toUpperCase(),
          brand: supplierBrand.toUpperCase(),
          category: item.newProductCategory || 'Cabelos',
          price: Number(item.price) || 0,
          cost: Number(item.cost) || 0,
          stock: Number(item.quantity),
          minStock: Number(item.newProductMinStock) || 5,
          expiryDate: item.expiryDate || '',
          type: 'avulso',
          comboItems: []
        };
        updatedProducts.push(newProd);
        finalProductId = newProdId;
        finalProductName = newProd.name;
      } else {
        // Update existing product
        updatedProducts = updatedProducts.map(p => {
          if (p.id === item.productId) {
            const nextStock = p.stock + Number(item.quantity);
            const nextPrice = Number(item.price) > 0 ? Number(item.price) : p.price;
            return {
              ...p,
              stock: nextStock,
              cost: Number(item.cost) > 0 ? Number(item.cost) : p.cost,
              price: nextPrice,
              expiryDate: item.expiryDate || p.expiryDate
            };
          }
          return p;
        });
        const existingP = products.find(p => p.id === item.productId);
        finalProductName = existingP ? existingP.name : 'PRODUTO';
        finalProductBrand = existingP ? existingP.brand : supplierBrand;
      }

      // Create Batch
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const batch: StockBatch = {
        id: batchId,
        productId: finalProductId,
        productName: finalProductName,
        brand: finalProductBrand.toUpperCase(),
        supplierId: entrySupplierId,
        supplierName: supplierName.toUpperCase(),
        arrivalDate: entryArrivalDate,
        quantity: Number(item.quantity),
        cost: Number(item.cost),
        expiryDate: item.expiryDate || entryArrivalDate,
        paymentDate: item.paymentDate || entryArrivalDate,
        paymentStatus: 'pending',
        batchNumber: item.batchNumber || ''
      };
      newBatches.push(batch);

      // Create Accounts Payable if paymentDate is filled and has positive cost
      if (item.paymentDate && item.cost > 0) {
        const totalCost = Number(item.quantity) * Number(item.cost);
        newFinancials.push({
          id: `fin_payable_batch_${batchId}`,
          type: 'payable' as const,
          category: 'Boleto de Fornecedor',
          description: `Boleto Lote: ${finalProductName} - Qtd ${item.quantity} (${supplierName.toUpperCase()})`,
          amount: totalCost,
          dueDate: item.paymentDate,
          status: 'pending' as const,
          supplierId: entrySupplierId
        });
      }
    }

    setProducts(updatedProducts);
    setStockBatches(prev => [...prev, ...newBatches]);
    if (newFinancials.length > 0) {
      setFinancialAccounts([...financialAccounts, ...newFinancials]);
    }

    addNotification('Registro de entrada efetuado e estoque abastecido!', 'success');
    setIsEntryModalOpen(false);
    setEntrySupplierId('');
    setEntryItems([]);
  };
  const abcClassification = useMemo(() => {
    const productSalesMap: Record<string, number> = {};
    products.forEach(p => {
      productSalesMap[p.id] = 0;
    });

    sales.forEach(sale => {
      if (sale.status === 'completed') {
        sale.items.forEach(item => {
          if (productSalesMap[item.productId] !== undefined) {
            productSalesMap[item.productId] += (item.quantity || 0);
          }
        });
      }
    });

    const sortedProducts = products
      .map(p => ({ id: p.id, salesQty: productSalesMap[p.id] || 0 }))
      .sort((a, b) => b.salesQty - a.salesQty);

    const totalProductsCount = sortedProducts.length;
    const classification: Record<string, 'A' | 'B' | 'C'> = {};
    
    sortedProducts.forEach((item, index) => {
      if (item.salesQty === 0) {
        classification[item.id] = 'C';
      } else {
        const percentile = (index / totalProductsCount) * 100;
        if (percentile <= 20) {
          classification[item.id] = 'A';
        } else if (percentile <= 50) {
          classification[item.id] = 'B';
        } else {
          classification[item.id] = 'C';
        }
      }
    });

    return classification;
  }, [products, sales]);

  const getGiroBadge = (productId: string) => {
    const cat = abcClassification[productId] || 'C';
    const label = cat === 'A' ? 'Alto Giro' : cat === 'B' ? 'Giro Médio' : 'Baixo Giro';
    if (cat === 'C') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-450 border border-yellow-200 dark:border-yellow-900/50 shadow-xs">
          🟡 {label}
        </span>
      );
    } else if (cat === 'B') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-150 dark:border-blue-900/40 shadow-xs">
          🔵 {label}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/40 shadow-xs">
          🔥 {label}
        </span>
      );
    }
  };

  const getStockBadge = (stock: number, minStock: number) => {
    if (stock === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-600 text-white border border-red-700 shadow-sm animate-pulse">
          🚨 ESTOQUE ZERADO
        </span>
      );
    } else if (stock <= minStock) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white border border-orange-600 shadow-sm">
          ⚠️ ESTOQUE BAIXO
        </span>
      );
    }
    return null;
  };

  const statsOverview = useMemo(() => {
    const totalCount = products.filter(p => !typeFilter || p.type === typeFilter || (!p.type && typeFilter === 'avulso')).length;
    const totalCats = productCategories.length;
    
    // Calculate unique brands from the actual products list instead of showing 0
    const relevantProducts = products.filter(p => !typeFilter || p.type === typeFilter || (!p.type && typeFilter === 'avulso'));
    const uniqueBrands = new Set(
      relevantProducts
        .map(p => p.brand?.trim()?.toUpperCase())
        .filter(b => b)
    );
    const totalBrs = uniqueBrands.size || brands.length;
    
    const avgPrice = relevantProducts.length > 0 ? relevantProducts.reduce((sum, p) => sum + (p.price || 0), 0) / relevantProducts.length : 0;
    const totalStock = relevantProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalStockValue = relevantProducts.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);

    return {
      totalCount,
      totalCats,
      totalBrs,
      avgPrice,
      totalStock,
      totalStockValue
    };
  }, [products, productCategories, brands, typeFilter]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'price' | 'cost' | 'promoPixPrice' | 'promoCardPrice' | 'promoMoneyPrice') => {
    // Remove tudo que não for dígito
    const value = e.target.value.replace(/\D/g, '');
    const amount = Number(value) / 100;
    setFormData(prev => ({ ...prev, [field]: amount }));
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesBrand = brandFilter ? p.brand === brandFilter : true;
      const matchesCategory = categoryFilter ? p.category === categoryFilter : true;
      const matchesType = typeFilter 
        ? (p.type === typeFilter || (!p.type && typeFilter === 'avulso')) 
        : true;
      const matchesLowStock = showLowStockOnly ? p.stock <= p.minStock : true;
      const matchesZeroStock = showZeroStockOnly ? p.stock <= 0 : true;
      return matchesSearch && matchesBrand && matchesCategory && matchesType && matchesLowStock && matchesZeroStock;
    });
  }, [products, searchTerm, brandFilter, categoryFilter, typeFilter, showLowStockOnly, showZeroStockOnly]);

  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(p => {
      const cat = p.category || 'Sem Categoria';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  // Advanced Stock Intelligence & Suggestions - OPTIMIZED
  const stockSuggestions = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();
    const sixtyDaysAgoISO = sixtyDaysAgo.toISOString();
    
    const recentSales = sales.filter(s => s.date >= thirtyDaysAgoISO && s.status === 'completed');
    const prevSales = sales.filter(s => s.date >= sixtyDaysAgoISO && s.date < thirtyDaysAgoISO && s.status === 'completed');

    // Pre-calculate sales count per product for constant time lookup
    const recentCountMap = new Map<string, number>();
    recentSales.forEach(s => {
      s.items.forEach(i => {
        recentCountMap.set(i.productId, (recentCountMap.get(i.productId) || 0) + i.quantity);
      });
    });

    const prevCountMap = new Map<string, number>();
    prevSales.forEach(s => {
      s.items.forEach(i => {
        prevCountMap.set(i.productId, (prevCountMap.get(i.productId) || 0) + i.quantity);
      });
    });

    return products
      .filter(p => !p.type || p.type === 'avulso') // Only for base products
      .map(product => {
        const countRecent = recentCountMap.get(product.id) || 0;
        const countPrev = prevCountMap.get(product.id) || 0;
        
        const growth = countPrev > 0 ? ((countRecent - countPrev) / countPrev) : (countRecent > 0 ? 1 : 0);
        
        // Suggestion logic: Stock is low OR growth is high and stock is moderate
        const needsRestock = product.stock <= (product.minStock * 1.5) || (growth > 0.1 && product.stock <= (product.minStock * 2));
        
        // Recommended buy amount: (Average monthly sale * 1.2) - Current Stock
        const recommendedAmount = Math.max(0, Math.ceil((countRecent * 1.2) - product.stock)) || (product.minStock * 2);

        return {
           ...product,
           growth: growth * 100,
           recentSales: countRecent,
           needsRestock,
           recommendedAmount
        };
      })
      .filter(p => p.needsRestock)
      .sort((a, b) => b.growth - a.growth);
  }, [products, sales]);

  const generateRestockPDF = () => {
    if (lowStockProducts.length === 0) {
      addNotification('Todos os produtos estão com estoque em dia! Nenhum item em falta para comprar.', 'info');
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Header Stripe
      doc.setFillColor(30, 41, 59); // Dark Slate header
      doc.rect(0, 0, 210, 45, 'F');
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('BIOBEL - GESTÃO DE ESTOQUE', 15, 20);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('SOLICITAÇÃO DE COMPRA E REPOSIÇÃO DE PRODUTOS', 15, 28);
      
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text('Destinatário: Compras / Diretoria (Dona da Loja) | Emissor: Gerente da Loja', 15, 34);
      doc.text(`Data do Relatório: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`, 15, 39);
      
      // Border
      doc.setFillColor(244, 63, 94); // Alert Rose accent color line
      doc.rect(0, 42, 210, 3, 'F');
      
      // Summary Cards/Data
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('1. RESUMO DA SOLICITAÇÃO', 15, 55);
      
      // Summary Box
      doc.setFillColor(248, 250, 252); // soft grey background
      doc.rect(15, 60, 180, 25, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, 60, 180, 25, 'S');
      
      // Calculate totals
      const totalItemsInShortage = lowStockProducts.length;
      let totalQtyToRestock = 0;
      let estimatedCost = 0;
      
      lowStockProducts.forEach(p => {
        const qty = Math.max(0, p.minStock - p.stock);
        totalQtyToRestock += qty;
        estimatedCost += qty * (p.cost || 0);
      });
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Total de Itens em Falta:', 20, 68);
      doc.setFont('helvetica', 'normal');
      doc.text(`${totalItemsInShortage} produtos`, 65, 68);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Total de Peças Necessárias:', 20, 74);
      doc.setFont('helvetica', 'normal');
      doc.text(`${totalQtyToRestock} unidades`, 65, 74);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Orçamento Est. de Reposição:', 20, 80);
      doc.setFont('helvetica', 'normal');
      doc.text(`${formatCurrency(estimatedCost)} (Custo Estimado)`, 65, 80);
      
      // Table Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('2. PLANILHA DE COMPRAS DETALHADA', 15, 95);
      
      const tableData = lowStockProducts.map(p => {
        const qtyToBuy = Math.max(0, p.minStock - p.stock);
        const costUnit = p.cost || 0;
        const totalCostItem = qtyToBuy * costUnit;
        
        return [
          p.name.toUpperCase(),
          p.brand.toUpperCase(),
          p.category.toUpperCase(),
          `${p.stock} un`,
          `${p.minStock} un`,
          `${qtyToBuy} un`,
          formatCurrency(costUnit),
          formatCurrency(totalCostItem)
        ];
      });
      
      autoTable(doc, {
        startY: 100,
        head: [['PRODUTO', 'MARCA', 'CATEGORIA', 'EST. ATUAL', 'EST. MÍN.', 'COMPRAR', 'CUSTO UNIT.', 'CUSTO TOTAL']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [244, 63, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, font: 'helvetica' },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 15 },
          4: { cellWidth: 15 },
          5: { cellWidth: 15 },
          6: { cellWidth: 18 },
          7: { cellWidth: 18 }
        },
        margin: { left: 15, right: 15 }
      });
      
      let currentY = (doc as any).lastAutoTable.finalY + 20;
      if (currentY > 240) {
        doc.addPage();
        currentY = 25;
      }
      
      // Footnote
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Este relatório foi extraído do Sistema de Gestão Inteligente Biobel.', 15, currentY);
      doc.text('Favor analisar o orçamento e autorizar a liberação financeira com o fornecedor correspondente.', 15, currentY + 4);
      
      // Signatures
      currentY += 15;
      if (currentY > 250) {
        doc.addPage();
        currentY = 30;
      }
      
      doc.setDrawColor(203, 213, 225);
      doc.line(15, currentY + 12, 95, currentY + 12);
      doc.line(115, currentY + 12, 195, currentY + 12);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text('ASSINATURA DA GERÊNCIA', 15, currentY + 16);
      doc.text('AUTORIZAÇÃO DA DIRETORIA', 115, currentY + 16);
      
      doc.save(`Relatorio_de_Compras_Faltando_${new Date().toISOString().split('T')[0]}.pdf`);
      addNotification('Relatório de Compras exportado em PDF com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      addNotification('Erro ao gerar PDF do relatório de compras.', 'error');
    }
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        ...product,
        type: product.type || typeFilter || 'avulso',
        comboItems: product.comboItems || [],
        expiryDate: product.expiryDate || '',
        barcode: product.barcode || '',
        promoPixPrice: product.promoPixPrice || 0,
        promoCardPrice: product.promoCardPrice || 0,
        promoMoneyPrice: product.promoMoneyPrice || 0,
        packContents: product.packContents || '',
        kitMode: product.kitMode || (product.comboItems && product.comboItems.length > 0 ? 'montar' : 'pronto'),
        isRaffle: product.isRaffle || false
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', brand: '', category: typeFilter === 'combo' ? 'Combos' : typeFilter === 'kit' ? 'Kits' : typeFilter === 'pack' ? 'Peks' : 'Cabelos', price: 0, cost: 0, stock: 0, minStock: 5, expiryDate: '', type: typeFilter || 'avulso', comboItems: [], barcode: '', promoPixPrice: 0, promoCardPrice: 0, promoMoneyPrice: 0, packContents: '', kitMode: 'montar', isRaffle: false });
    }
    setIsModalOpen(true);
  };

  const handleDuplicate = (product: Product) => {
    setEditingProduct(null); // Create new product on save
    setFormData({
      ...product,
      id: undefined,
      name: `${product.name} (Cópia)`,
      barcode: '', // Clear barcode for uniqueness
      stock: 0, // Default stock as requested
      type: product.type || typeFilter || 'avulso',
      comboItems: product.comboItems || [],
      expiryDate: product.expiryDate || '',
      promoPixPrice: product.promoPixPrice || 0,
      promoCardPrice: product.promoCardPrice || 0,
      promoMoneyPrice: product.promoMoneyPrice || 0,
      packContents: product.packContents || '',
      kitMode: product.kitMode || (product.comboItems && product.comboItems.length > 0 ? 'montar' : 'pronto'),
      isRaffle: product.isRaffle || false
    });
    setIsModalOpen(true);
    addNotification('Produto duplicado! Altere o nome e estoque para salvar o novo produto.', 'info');
  };

  const handleBulkPriceAdjustment = (percent: number) => {
    if (selectedProductIds.length === 0) return;
    if (isNaN(percent) || percent === 0) {
      addNotification('Por favor, informe uma porcentagem de reajuste válida.', 'error');
      return;
    }
    
    if (setProducts) {
      setProducts(prev => prev.map(p => {
        if (selectedProductIds.includes(p.id)) {
          const multiplier = 1 + (percent / 100);
          const newPrice = Math.max(0, parseFloat((p.price * multiplier).toFixed(2)));
          const newCost = p.cost ? parseFloat((p.cost * multiplier).toFixed(2)) : p.cost;
          const newPromoPix = p.promoPixPrice ? parseFloat((p.promoPixPrice * multiplier).toFixed(2)) : p.promoPixPrice;
          const newPromoCard = p.promoCardPrice ? parseFloat((p.promoCardPrice * multiplier).toFixed(2)) : p.promoCardPrice;
          const newPromoMoney = p.promoMoneyPrice ? parseFloat((p.promoMoneyPrice * multiplier).toFixed(2)) : p.promoMoneyPrice;
          
          return {
            ...p,
            price: newPrice,
            cost: newCost,
            promoPixPrice: newPromoPix,
            promoCardPrice: newPromoCard,
            promoMoneyPrice: newPromoMoney
          };
        }
        return p;
      }));
      addNotification(`Sucesso: Preço de ${selectedProductIds.length} produtos reajustado em ${percent}%!`, 'success');
      setSelectedProductIds([]);
    }
  };

  const handleBulkBrandChange = (targetBrandName: string) => {
    if (selectedProductIds.length === 0) return;
    if (!targetBrandName) return;
    
    if (setProducts) {
      setProducts(prev => prev.map(p => {
        if (selectedProductIds.includes(p.id)) {
          return {
            ...p,
            brand: targetBrandName
          };
        }
        return p;
      }));
      addNotification(`Sucesso: Marca de ${selectedProductIds.length} produtos alterada para ${targetBrandName}!`, 'success');
      setSelectedProductIds([]);
    }
  };

  const updateComboItemQuantity = (productId: string, quantity: number) => {
    setFormData(prev => {
      const newItems = (prev.comboItems || []).map(item => 
        item.productId === productId ? { ...item, quantity } : item
      );
      
      let totalCost = 0;
      newItems.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        if (p) totalCost += p.cost * item.quantity;
      });

      return {
        ...prev,
        comboItems: newItems,
        cost: totalCost
      };
    });
  };

  const addComboItem = (productId: string) => {
    setFormData(prev => {
      const currentItems = prev.comboItems || [];
      if (currentItems.some(item => item.productId === productId)) return prev;
      
      const newItems = [...currentItems, { productId, quantity: 1 }];
      
      let totalCost = 0;
      newItems.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        if (p) totalCost += p.cost * item.quantity;
      });

      return {
        ...prev,
        comboItems: newItems,
        cost: totalCost
      };
    });
  };

  const removeComboItem = (productId: string) => {
    setFormData(prev => {
      const newItems = (prev.comboItems || []).filter(item => item.productId !== productId);
      
      let totalCost = 0;
      newItems.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        if (p) totalCost += p.cost * item.quantity;
      });

      return {
        ...prev,
        comboItems: newItems,
        cost: totalCost
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        addNotification('A imagem deve ter no máximo 500KB.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePlaceholderImage = () => {
    const emojis: any = {
      'Maquiagem': '💄',
      'Cabelo': '💇‍♀️',
      'Perfume': '✨',
      'Kits': '🎁',
      'Combos': '📦',
      'Peks': '🛍️',
      'default': '🧴'
    };
    const emoji = emojis[formData.category || 'default'] || emojis.default;
    setFormData({ ...formData, image: `https://placehold.co/400x300/f8fafc/64748b?text=${encodeURIComponent(emoji)}` });
  };

  const handleAddCategory = () => {
    if (!newCategoryName) return;
    if (productCategories.some(c => c.name.toLowerCase() === newCategoryName.toLowerCase())) {
      addNotification('Esta categoria já existe.', 'warning');
      return;
    }
    const newCat = { id: `C${Date.now()}`, name: newCategoryName.trim() };
    setProductCategories(prev => [...prev, newCat]);
    setNewCategoryName('');
    addNotification('Categoria adicionada!', 'success');
  };

  const handleDeleteCategory = (id: string, name: string) => {
    if (products.some(p => p.category === name)) {
      addNotification('Não é possível excluir uma categoria em uso.', 'error');
      return;
    }
    setProductCategories(prev => prev.filter(c => c.id !== id));
    addNotification('Categoria removida.', 'info');
  };

  const toggleFavorite = (product: Product) => {
    setProducts(prev => prev.map(p => 
      p.id === product.id ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  };

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleSave = async () => {
    const errors = [];
    if (!formData.name) errors.push('name');
    if (!formData.brand) errors.push('brand');
    if (!formData.category) errors.push('category');
    
    const isKitOrCombo = formData.type === 'kit' || formData.type === 'combo';
    const isMontar = isKitOrCombo && (formData.kitMode === 'montar' || !formData.kitMode);
    
    if (isMontar && (!formData.comboItems || formData.comboItems.length === 0)) {
      errors.push('items');
    }

    setValidationErrors(errors);

    if (errors.length > 0) {
      if (errors.includes('items')) {
        addNotification(`Adicione pelo menos um item ao ${formData.type === 'kit' ? 'kit' : 'combo'}.`, 'warning');
      } else {
        addNotification('Preencha os campos obrigatórios destacados em vermelho.', 'warning');
      }
      return;
    }

    if (Number(formData.price) < 0) {
      addNotification('O preço não pode ser negativo.', 'warning');
      return;
    }
    if (Number(formData.cost) < 0) {
      addNotification('O custo não pode ser negativo.', 'warning');
      return;
    }
    if (Number(formData.stock) < 0) {
      addNotification('O estoque não pode ser negativo.', 'warning');
      return;
    }
    if (Number(formData.minStock) < 0) {
      addNotification('O estoque mínimo não pode ser negativo.', 'warning');
      return;
    }

    if (formData.price <= 0) {
      addNotification('O preço de venda deve ser maior que zero.', 'warning');
      return;
    }

    if (isMontar && formData.price < formData.cost) {
      addNotification(`O preço do ${formData.type} não pode ser menor que o seu custo total (${formatCurrency(formData.cost)}).`, 'warning');
      return;
    }

    const productData = {
      ...formData,
      id: editingProduct?.id || `P${Date.now()}`,
      price: Number(formData.price),
      cost: Number(formData.cost),
      stock: Number(formData.stock),
      minStock: Number(formData.minStock),
      kitMode: isKitOrCombo ? (formData.kitMode || 'montar') : undefined,
      comboItems: isKitOrCombo && formData.kitMode === 'pronto' ? [] : (formData.comboItems || []),
      promoPixPrice: formData.promoPixPrice !== undefined ? Number(formData.promoPixPrice) : 0,
      promoCardPrice: formData.promoCardPrice !== undefined ? Number(formData.promoCardPrice) : 0,
      promoMoneyPrice: formData.promoMoneyPrice !== undefined ? Number(formData.promoMoneyPrice) : 0
    } as Product;

    try {
      if (editingProduct) {
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? productData : p));
      } else {
        setProducts(prev => [...prev, productData]);
      }
      
      const typeLabel = productData.type === 'kit' ? 'Kit' : productData.type === 'combo' ? 'Combo' : productData.type === 'pack' ? 'Pek' : 'Produto';
      addNotification(`${typeLabel} salvo com sucesso! No atendimento, você o encontrará na aba de ${typeLabel}s.`, 'success');
      setIsModalOpen(false);
    } catch (error: any) {
      addNotification('Erro ao salvar produto.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      setProducts(prev => prev.filter(p => p.id !== id));
      addNotification('Produto excluído!', 'info');
    } catch (error: any) {
      addNotification('Erro ao excluir produto.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo de Métricas do Estoque de Produtos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Produtos */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
            <Package size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Total de Produtos</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1.5 leading-none">{statsOverview.totalCount}</h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 truncate">{statsOverview.totalStock} itens em estoque</p>
          </div>
        </div>

        {/* Categorias */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-2xl flex items-center justify-center shrink-0">
            <Layers size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Categorias</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1.5 leading-none">{statsOverview.totalCats}</h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 truncate">Seções organizadas</p>
          </div>
        </div>

        {/* Marcas */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
            <Award size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Total de Marcas</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1.5 leading-none">{statsOverview.totalBrs}</h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 truncate">Fabricantes ativos</p>
          </div>
        </div>

        {/* Média de Valores */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 col-span-2 lg:col-span-1">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Valor Médio</p>
            <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 leading-none">{formatCurrency(statsOverview.avgPrice)}</h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 truncate">Estoque total: {formatCurrency(statsOverview.totalStockValue)}</p>
          </div>
        </div>
      </div>

      {/* Buy Suggestions / Stock Intelligence */}
      {stockSuggestions.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-[40px] border border-amber-100 dark:border-amber-900/30 p-6 md:p-8 shadow-sm transition-all duration-300">
          <div 
            onClick={() => setIsBuySuggestionsExpanded(!isBuySuggestionsExpanded)}
            className="flex items-center justify-between cursor-pointer select-none group"
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-orange-500" />
              <h3 className="text-base md:text-lg font-black text-amber-900 dark:text-amber-200 uppercase tracking-tight">
                Inteligência de Compra
              </h3>
              <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-black uppercase tracking-wider ml-1">
                {stockSuggestions.length} {stockSuggestions.length === 1 ? 'sugestão' : 'sugestões'}
              </span>
            </div>
            <button className="p-2 bg-amber-100/60 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 rounded-xl hover:bg-amber-200/50 dark:hover:bg-amber-900/40 transition-all cursor-pointer">
              {isBuySuggestionsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {isBuySuggestionsExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 animate-fade-in">
              {stockSuggestions.slice(0, 3).map(suggestion => (
                <div key={suggestion.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/50 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                    <Package size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{suggestion.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "text-[10px] font-black uppercase",
                        suggestion.growth > 0 ? "text-emerald-600" : "text-slate-400"
                      )}>
                        {suggestion.growth > 0 ? `+${suggestion.growth.toFixed(0)}% Giro` : 'Giro Estável'}
                      </span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] font-black text-amber-600 uppercase">Sugestão: {suggestion.recommendedAmount} un</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenModal(suggestion);
                    }}
                    className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl hover:bg-amber-100 transition-all shrink-0 cursor-pointer"
                  >
                    <PlusCircle size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lowStockProducts.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl transition-all duration-300">
          <div 
            onClick={() => setIsLowStockExpanded(!isLowStockExpanded)}
            className="p-4 flex items-center justify-between cursor-pointer select-none group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-900 dark:text-rose-100 uppercase tracking-tight">Alerta de Estoque Baixo</h4>
                <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mt-0.5">
                  {lowStockProducts.length} {lowStockProducts.length === 1 ? 'produto atingiu' : 'produtos atingiram'} o estoque mínimo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isLowStockExpanded && (
                <div className="hidden sm:flex -space-x-2">
                  {lowStockProducts.slice(0, 5).map(p => (
                    <div key={p.id} className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-rose-50 dark:border-rose-900/30 flex items-center justify-center text-[10px] font-black text-rose-600 dark:text-rose-400" title={p.name}>
                      {p.name.charAt(0)}
                    </div>
                  ))}
                  {lowStockProducts.length > 5 && (
                    <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 border-2 border-rose-50 dark:border-rose-900/30 flex items-center justify-center text-[10px] font-black text-rose-600 dark:text-rose-400">
                      +{lowStockProducts.length - 5}
                    </div>
                  )}
                </div>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  generateRestockPDF();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold uppercase text-[9px] tracking-wider transition-all shadow-md shadow-rose-100 dark:shadow-none cursor-pointer shrink-0"
                title="Exportar PDF de compras dos itens em falta para enviar para a dona da loja"
              >
                <Printer size={12} />
                Gerar PDF Compras
              </button>
              <button className="p-2 bg-rose-100/50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 rounded-xl hover:bg-rose-150 transition-all shrink-0 cursor-pointer">
                {isLowStockExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
          </div>

          {isLowStockExpanded && (
            <div className="px-4 pb-4 border-t border-rose-100/50 dark:border-rose-900/30 pt-4 animate-fade-in space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Produtos com Estoque Crítico:</p>
                <button 
                  onClick={generateRestockPDF}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-wider transition-all shadow-md shadow-rose-200 dark:shadow-none cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Printer size={14} />
                  Imprimir / Gerar PDF de Compras
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {lowStockProducts.map(p => (
                  <div key={p.id} className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase truncate">{p.name}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Mínimo recomendado: {p.minStock} un</p>
                    </div>
                    <span className="text-xs font-black px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0">
                      {p.stock} un
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-1 items-center gap-4 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar produtos..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl shrink-0 text-blue-600 dark:text-blue-400">
              <input 
                type="checkbox"
                id="lowStockFilter"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="lowStockFilter" className="text-[10px] font-black uppercase tracking-widest cursor-pointer select-none">Estoque Baixo</label>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 rounded-xl shrink-0 text-rose-600 dark:text-rose-400">
              <input 
                type="checkbox"
                id="zeroStockFilter"
                checked={showZeroStockOnly}
                onChange={(e) => setShowZeroStockOnly(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <label htmlFor="zeroStockFilter" className="text-[10px] font-black uppercase tracking-widest cursor-pointer select-none">Estoque Zerado / Crítico</label>
            </div>
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl shrink-0">
              <Filter size={14} className="text-blue-600 dark:text-blue-400" />
              <select 
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 focus:ring-0 cursor-pointer outline-none"
              >
                <option value="" className="bg-white dark:bg-slate-900">Todas as Marcas</option>
                {brands.map(b => (
                  <option key={b.id} value={b.name} className="bg-white dark:bg-slate-900">{b.name}</option>
                ))}
              </select>
            </div>
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl shrink-0">
              <Layers size={14} className="text-blue-600 dark:text-blue-400" />
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 focus:ring-0 cursor-pointer outline-none"
              >
                <option value="" className="bg-white dark:bg-slate-900">Todas as Categorias</option>
                {productCategories.map(c => (
                  <option key={c.id} value={c.name} className="bg-white dark:bg-slate-900">{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle de Visualização (Tabela/Grade) */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mr-2 shrink-0">
              <button
                onClick={() => setProductsViewMode('table')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  productsViewMode === 'table'
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
                title="Visualização em Lista (Tabela)"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setProductsViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  productsViewMode === 'grid'
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
                title="Visualização em Grade (Cards)"
              >
                <LayoutGrid size={16} />
              </button>
            </div>

            <button 
              onClick={() => {
                setIsEntryModalOpen(true);
                setEntryArrivalDate(new Date().toISOString().split('T')[0]);
                setEntryItems([
                  {
                    id: `item_${Date.now()}_0`,
                    productId: '',
                    isNewProduct: false,
                    newProductName: '',
                    newProductCategory: 'Cabelos',
                    newProductMinStock: 5,
                    quantity: 1,
                    cost: 0,
                    price: 0,
                    expiryDate: '',
                    paymentDate: ''
                  }
                ]);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors text-xs"
              title="Registrar entrada de novos produtos ou lotes"
            >
              <Truck size={18} />
              Receber Mercadoria
            </button>
            <button 
              onClick={generateRestockPDF}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-colors text-xs cursor-pointer"
              title="Gerar PDF de compras com a lista de produtos em falta para a dona da loja"
            >
              <Printer size={18} />
              Imprimir Falta
            </button>
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs"
            >
              <Layers size={18} />
              Categorias
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors text-xs"
            >
              <Plus size={20} />
              Novo Produto
            </button>
          </div>
        </div>
      {productsViewMode === 'grid' ? (
        <div className="space-y-6">
          {Object.entries(groupedProducts).map(([categoryName, val]) => {
            const catProducts = val as Product[];
            const isCollapsed = collapsedCategories[categoryName];
            return (
              <div key={categoryName} className="space-y-4">
                {/* Accordion Category Header */}
                <div 
                  onClick={() => setCollapsedCategories(prev => ({ ...prev, [categoryName]: !prev[categoryName] }))}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl cursor-pointer select-none border border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      📂 {categoryName}
                    </span>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-black">
                      {catProducts.length} {catProducts.length === 1 ? 'produto' : 'produtos'}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </div>
                </div>

                {/* Grid Content */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
                    {catProducts.map((product) => (
                      <div 
                        key={product.id} 
                        className={cn(
                          "bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col justify-between group hover:shadow-md hover:border-blue-100 dark:hover:border-slate-700 transition-all duration-300 relative",
                          product.type === 'kit' ? "bg-purple-50/10 dark:bg-purple-900/5" : 
                          product.type === 'combo' ? "bg-blue-50/10 dark:bg-blue-900/5" : ""
                        )}
                      >
                        {/* Image Header with Absolute Badges */}
                        <div 
                          onClick={() => product.image && setPreviewImage(product.image)}
                          className={cn(
                            "relative aspect-square bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-b border-slate-50 dark:border-slate-850",
                            product.image && "cursor-pointer"
                          )}
                        >
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" referrerPolicy="no-referrer" />
                          ) : (
                            <Package size={36} className="text-slate-300 dark:text-slate-700" />
                          )}
                          
                          {/* Absolute Badges */}
                          <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                            {getStockBadge(product.stock, product.minStock)}
                            {getGiroBadge(product.id)}
                          </div>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(product);
                            }}
                            className={cn(
                              "absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all shadow-sm",
                              product.isFavorite 
                                ? "bg-amber-500 text-white" 
                                : "bg-white/80 dark:bg-slate-900/80 text-slate-400 hover:text-amber-500"
                            )}
                          >
                            <Star size={14} fill={product.isFavorite ? "currentColor" : "none"} />
                          </button>
                        </div>

                        {/* Product Info */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{product.brand}</span>
                            <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs line-clamp-2 tracking-tight">
                              {product.name}
                            </h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">{product.category}</p>

                            {/* Cost Price */}
                            {product.cost > 0 && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                                Custo: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(product.cost)}</span>
                                <span className="mx-1.5 text-slate-300 dark:text-slate-700">|</span>
                                Margem: <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1 rounded">
                                  {(((product.price - product.cost) / product.price) * 100).toFixed(0)}%
                                </span>
                              </div>
                            )}

                            {product.barcode && (
                              <div className="text-[9px] font-mono text-slate-400 mt-1">EAN: {product.barcode}</div>
                            )}
                          </div>

                          <div className="pt-3 mt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Preço</span>
                              <span className="font-black text-slate-900 dark:text-white text-sm">{formatCurrency(product.price)}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Estoque</span>
                              <span className={cn(
                                "font-black text-xs",
                                product.stock <= product.minStock ? "text-rose-600" : "text-emerald-600"
                              )}>
                                {product.stock} un
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Hover Actions in grid mode */}
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                          <button 
                            onClick={() => handleDuplicate(product)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                            title="Duplicar Produto"
                          >
                            <Copy size={14} />
                          </button>
                          <button 
                            onClick={() => handleOpenModal(product)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                            title="Editar Produto"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                            title="Excluir Produto"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 w-10">
                <input 
                  type="checkbox"
                  checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProductIds(filteredProducts.map(p => p.id));
                    } else {
                      setSelectedProductIds([]);
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Produto</th>
              <th className="px-6 py-4">Marca</th>
              <th className="px-6 py-4">Categoria</th>
              <th className="px-6 py-4">Preço</th>
              <th className="px-6 py-4">Estoque</th>
              <th className="px-6 py-4">Previsão Esgotamento</th>
              <th className="px-6 py-4">Validade</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {Object.entries(groupedProducts).map(([categoryName, val]) => {
              const catProducts = val as Product[];
              const isCollapsed = collapsedCategories[categoryName];
              return (
                <React.Fragment key={categoryName}>
                  {/* Category Header Row */}
                  <tr 
                    onClick={() => setCollapsedCategories(prev => ({ ...prev, [categoryName]: !prev[categoryName] }))}
                    className="bg-slate-50/70 dark:bg-slate-800/30 cursor-pointer select-none hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-all border-y border-slate-100 dark:border-slate-800/50"
                  >
                    <td colSpan={10} className="px-6 py-3 font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-350">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>📂 {categoryName}</span>
                          <span className="text-[10px] bg-slate-200/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                            {catProducts.length} {catProducts.length === 1 ? 'item' : 'itens'}
                          </span>
                        </div>
                        <div className="text-slate-400">
                          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Product Rows */}
                  {!isCollapsed && catProducts.map((product) => (
                    <React.Fragment key={product.id}>
                      <tr className={cn(
                        "group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                        product.type === 'kit' ? "bg-purple-50/40 dark:bg-purple-900/10" : 
                        product.type === 'combo' ? "bg-blue-50/40 dark:bg-blue-900/10" : ""
                      )}>
                <td className="px-6 py-4 w-10">
                  <input 
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProductIds(prev => [...prev, product.id]);
                      } else {
                        setSelectedProductIds(prev => prev.filter(id => id !== product.id));
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleFavorite(product)}
                      className={cn(
                        "p-1 rounded-lg transition-all",
                        product.isFavorite ? "text-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-sm" : "text-slate-300 hover:text-amber-500"
                      )}
                    >
                      <Star size={16} fill={product.isFavorite ? "currentColor" : "none"} />
                    </button>
                    <div className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit",
                      product.type === 'avulso' ? "bg-slate-100 text-slate-600" : 
                      product.type === 'combo' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                    )}>
                      {product.type}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => product.image && setPreviewImage(product.image)}
                      className={cn(
                        "w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 overflow-hidden",
                        product.image && "cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                      )}
                    >
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Package size={20} />
                      )}
                    </button>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white leading-tight">{product.name}</span>
                      
                      {/* Cost price and Profit margin display */}
                      {product.cost > 0 && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-none">
                          Custo: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(product.cost)}</span>
                          <span className="mx-1.5 text-slate-300 dark:text-slate-600">|</span>
                          Margem: <span className={cn(
                            "font-bold px-1.5 py-0.5 rounded text-[9px]",
                            ((product.price - product.cost) / product.price) * 100 > 40 ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20" :
                            ((product.price - product.cost) / product.price) * 100 > 20 ? "text-blue-700 bg-blue-50 dark:bg-blue-950/20" :
                            "text-amber-700 bg-amber-50 dark:bg-amber-950/20"
                          )}>
                            {(((product.price - product.cost) / product.price) * 100).toFixed(0)}%
                          </span>
                        </span>
                      )}

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {product.barcode && (
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">EAN: {product.barcode}</span>
                        )}
                        {getGiroBadge(product.id)}
                        {getStockBadge(product.stock, product.minStock)}
                      </div>

                      {(() => {
                        const productBatches = stockBatches.filter(b => b.productId === product.id);
                        if (productBatches.length > 0) {
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedProductIds(prev => ({
                                  ...prev,
                                  [product.id]: !prev[product.id]
                                }));
                              }}
                              className="flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/50 hover:bg-emerald-100/50 w-fit cursor-pointer transition-all shadow-sm"
                            >
                              <Box size={10} />
                              {productBatches.length} {productBatches.length === 1 ? 'Lote' : 'Lotes'} em estoque
                              {expandedProductIds[product.id] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>
                          );
                        }
                        return null;
                      })()}

                      {(product.type === 'combo' || product.type === 'kit') && (
                        <div className="flex flex-col mt-0.5">
                          {product.kitMode === 'pronto' ? (
                            product.packContents ? (
                              <div className="flex flex-col mt-1 bg-purple-50/50 dark:bg-purple-950/20 p-1.5 rounded-lg border border-purple-100/50 dark:border-purple-900/30 max-w-[240px]">
                                <span className="text-[8px] text-purple-600 dark:text-purple-400 font-black uppercase tracking-wider flex items-center gap-1">
                                  <Sparkles size={8} className="text-purple-500" />
                                  Kit Pronto (Manual):
                                </span>
                                <span className="text-[9px] text-slate-600 dark:text-slate-350 font-bold leading-tight mt-0.5 whitespace-pre-wrap">
                                  {product.packContents}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-purple-500 font-black uppercase tracking-tighter">
                                Kit Pronto Fechado
                              </span>
                            )
                          ) : (
                            <>
                              <span className="text-[9px] text-blue-500 font-black uppercase tracking-tighter">
                                {product.comboItems?.length || 0} itens inclusos
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {product.comboItems?.slice(0, 2).map((ci) => {
                                  const comp = products.find(p => p.id === ci.productId);
                                  return (
                                    <span key={ci.productId} className="text-[8px] bg-blue-50 dark:bg-blue-900/20 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-bold">
                                      {ci.quantity}x {comp?.name.split(' ')[0]}
                                    </span>
                                  );
                                })}
                                {(product.comboItems?.length || 0) > 2 && <span className="text-[8px] text-slate-400 font-bold">+{(product.comboItems?.length || 0) - 2}</span>}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {product.type === 'pack' && product.packContents && (
                        <div className="flex flex-col mt-1 bg-purple-50/50 dark:bg-purple-950/20 p-1.5 rounded-lg border border-purple-100/50 dark:border-purple-900/30 max-w-[240px]">
                          <span className="text-[8px] text-purple-600 dark:text-purple-400 font-black uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={8} className="text-purple-500" />
                            Conteúdo:
                          </span>
                          <span className="text-[9px] text-slate-600 dark:text-slate-350 font-bold leading-tight mt-0.5 whitespace-pre-wrap">
                            {product.packContents}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{product.brand}</td>
                <td className="px-6 py-4 text-slate-650 dark:text-slate-450">{product.category}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(product.price)}</span>
                    {(product.promoPixPrice || product.promoCardPrice || product.promoMoneyPrice) ? (
                      <div className="flex flex-col gap-0.5 mt-1">
                        {product.promoPixPrice !== undefined && product.promoPixPrice > 0 && (
                          <span className="text-[8px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider w-fit">
                            Pix: {formatCurrency(product.promoPixPrice)}
                          </span>
                        )}
                        {product.promoCardPrice !== undefined && product.promoCardPrice > 0 && (
                          <span className="text-[8px] bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider w-fit">
                            Cartão: {formatCurrency(product.promoCardPrice)}
                          </span>
                        )}
                        {product.promoMoneyPrice !== undefined && product.promoMoneyPrice > 0 && (
                          <span className="text-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider w-fit">
                            Money: {formatCurrency(product.promoMoneyPrice)}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className={cn(
                      "font-bold text-sm",
                      product.stock <= product.minStock ? "text-rose-600" : "text-slate-900 dark:text-white"
                    )}>
                      {product.stock} un
                    </span>
                    <span className="text-[9px] font-black uppercase text-slate-400">Min: {product.minStock}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                   {(() => {
                      const now = new Date();
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(now.getDate() - 30);
                      
                      const totalSold = sales
                        .filter(s => s.status === 'completed' && new Date(s.date) >= thirtyDaysAgo)
                        .reduce((acc, s) => {
                          const item = s.items.find(i => i.productId === product.id);
                          return acc + (item?.quantity || 0);
                        }, 0);
                      
                      if (totalSold === 0) return <span className="text-[10px] text-slate-400 font-bold uppercase italic">Sem giro</span>;
                      
                      const dailyRate = totalSold / 30;
                      const daysLeft = Math.floor(product.stock / dailyRate);
                      
                      return (
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-[10px] font-black uppercase",
                            daysLeft < 7 ? "text-rose-600" : daysLeft < 15 ? "text-amber-600" : "text-emerald-600"
                          )}>
                            {daysLeft} dias restantes
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Giro: {dailyRate.toFixed(2)}/dia</span>
                        </div>
                      );
                   })()}
                </td>
                <td className="px-6 py-4">
                  {product.expiryDate ? (() => {
                    const expiry = new Date(product.expiryDate + 'T00:00:00');
                    const today = new Date();
                    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div className="flex flex-col">
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit",
                          diffDays < 30 ? "bg-rose-100 text-rose-700" : diffDays < 90 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {expiry.toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                          {diffDays < 0 ? 'Vencido!' : `${diffDays} dias`}
                        </span>
                      </div>
                    );
                  })() : <span className="text-slate-400">-</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <button 
                      onClick={() => handleDuplicate(product)}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                      title="Duplicar Produto"
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      onClick={() => handleOpenModal(product)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                      title="Editar Produto"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                      title="Excluir Produto"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
              {(() => {
                const productBatches = stockBatches.filter(b => b.productId === product.id);
                if (expandedProductIds[product.id] && productBatches.length > 0) {
                  return (
                    <tr className="bg-slate-50/50 dark:bg-slate-800/10">
                      <td colSpan={10} className="px-6 py-4">
                        <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                              <Box size={12} className="text-emerald-500" />
                              Lotes Ativos do Produto ({productBatches.length})
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                              Cada lote possui sua própria validade e vencimento de boleto
                            </span>
                          </div>
                          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                                <tr>
                                  <th className="px-4 py-2 rounded-l-lg">Chegada</th>
                                  <th className="px-4 py-2">Lote</th>
                                  <th className="px-4 py-2">Fornecedor</th>
                                  <th className="px-4 py-2 text-center">Quantidade</th>
                                  <th className="px-4 py-2">Preço de Custo</th>
                                  <th className="px-4 py-2">Total Custo</th>
                                  <th className="px-4 py-2">Validade</th>
                                  <th className="px-4 py-2">Vcto Boleto</th>
                                  <th className="px-4 py-2">Pagto Fornecedor</th>
                                  <th className="px-4 py-2 text-right rounded-r-lg">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-350">
                                {productBatches.map((batch) => {
                                  const expiry = new Date(batch.expiryDate + 'T00:00:00');
                                  const today = new Date();
                                  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                  return (
                                    <tr key={batch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                      <td className="px-4 py-3 font-medium">{new Date(batch.arrivalDate + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500 font-extrabold">{batch.batchNumber || '-'}</td>
                                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 uppercase">{batch.supplierName}</td>
                                      <td className="px-4 py-3 text-center font-bold text-slate-950 dark:text-white">{batch.quantity} un</td>
                                      <td className="px-4 py-3">{formatCurrency(batch.cost)}</td>
                                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(batch.quantity * batch.cost)}</td>
                                      <td className="px-4 py-3">
                                        <span className={cn(
                                          "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider block w-fit",
                                          diffDays < 30 ? "bg-rose-100 text-rose-700" : diffDays < 90 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                        )}>
                                          {new Date(batch.expiryDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        </span>
                                        <span className="text-[8px] text-slate-400 block mt-0.5 uppercase font-semibold">
                                          {diffDays < 0 ? 'Vencido!' : `${diffDays} dias`}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                                        {batch.paymentDate ? new Date(batch.paymentDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                                      </td>
                                      <td className="px-4 py-3">
                                        <button
                                          onClick={() => toggleBatchPaymentStatus(batch.id)}
                                          className={cn(
                                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 w-fit",
                                            batch.paymentStatus === 'paid' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                          )}
                                        >
                                          <div className={cn("w-1.5 h-1.5 rounded-full", batch.paymentStatus === 'paid' ? "bg-emerald-500" : "bg-amber-500")} />
                                          {batch.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                                        </button>
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          onClick={() => handleDeleteBatch(batch.id, product.id, batch.quantity)}
                                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 rounded-lg transition-colors cursor-pointer"
                                          title="Excluir Lote (Reduz Estoque)"
                                        >
                                          <Trash2 size={15} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return null;
              })()}
              </React.Fragment>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

       {/* Mobile Products Cards */}
      <div className="lg:hidden p-4 space-y-4">
        {Object.entries(groupedProducts).map(([categoryName, val]) => {
          const catProducts = val as Product[];
          const isCollapsed = collapsedCategories[categoryName];
          return (
            <div key={categoryName} className="space-y-3">
              {/* Mobile Category Header */}
              <div 
                onClick={() => setCollapsedCategories(prev => ({ ...prev, [categoryName]: !prev[categoryName] }))}
                className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl cursor-pointer border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    📂 {categoryName}
                  </span>
                  <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                    {catProducts.length}
                  </span>
                </div>
                <div className="text-slate-400">
                  {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </div>
              </div>

              {/* Cards List */}
              {!isCollapsed && catProducts.map((product) => (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden",
                    product.type === 'kit' ? "bg-purple-50/40 dark:bg-purple-900/10" : 
                    product.type === 'combo' ? "bg-blue-50/40 dark:bg-blue-900/10" : ""
                  )}
                >
            {/* Mobile selection checkbox strip */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/60 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-850">
              <input 
                type="checkbox"
                checked={selectedProductIds.includes(product.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedProductIds(prev => [...prev, product.id]);
                  } else {
                    setSelectedProductIds(prev => prev.filter(id => id !== product.id));
                  }
                }}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Selecionar</span>
            </div>

            <div className="flex">
              {/* Product Image or Icon */}
              <div 
                onClick={() => product.image && setPreviewImage(product.image)}
                className={cn(
                  "w-24 sm:w-32 aspect-square bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 border-r border-slate-100 dark:border-slate-800",
                  product.image && "cursor-pointer"
                )}
              >
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Package className="text-slate-300" size={32} />
                )}
              </div>
              
              <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest truncate">{product.brand}</span>
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0",
                      product.type === 'avulso' ? "bg-slate-100 text-slate-600" : 
                      product.type === 'combo' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                    )}>
                      {product.type}
                    </div>
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs sm:text-sm line-clamp-2 tracking-tight flex items-center gap-1.5">
                    {product.name}
                    {product.isFavorite && <Star size={14} fill="currentColor" className="text-amber-500 shrink-0" />}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">{product.category}</p>
                  
                  {/* Cost Price & Profit Margin (Mobile Card) */}
                  {product.cost > 0 && (
                    <div className="text-[10px] text-slate-500 dark:text-slate-450 font-medium mt-1 leading-none">
                      Custo: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(product.cost)}</span>
                      <span className="mx-1.5 text-slate-300 dark:text-slate-700">|</span>
                      Margem: <span className={cn(
                        "font-bold px-1.5 py-0.5 rounded text-[9px]",
                        ((product.price - product.cost) / product.price) * 100 > 40 ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20" :
                        ((product.price - product.cost) / product.price) * 100 > 20 ? "text-blue-700 bg-blue-50 dark:bg-blue-950/20" :
                        "text-amber-700 bg-amber-50 dark:bg-amber-950/20"
                      )}>
                        {(((product.price - product.cost) / product.price) * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {product.barcode && (
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">EAN: {product.barcode}</span>
                    )}
                    {/* Curva ABC badge */}
                    {(() => {
                      const cat = abcClassification[product.id] || 'C';
                      const label = cat === 'A' ? 'Alto Giro' : cat === 'B' ? 'Giro Médio' : 'Baixo Giro';
                      const colorClass = cat === 'A' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                         cat === 'B' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                                         'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20';
                      return (
                        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border", colorClass)}>
                          [{cat}] {label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex items-end justify-between pt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preço de Venda</span>
                    <span className="font-black text-slate-900 dark:text-white text-base">{formatCurrency(product.price)}</span>
                    {(product.promoPixPrice || product.promoCardPrice || product.promoMoneyPrice) ? (
                      <div className="flex flex-col gap-0.5 mt-1">
                        {product.promoPixPrice !== undefined && product.promoPixPrice > 0 && (
                          <span className="text-[8px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider w-fit">
                            Pix: {formatCurrency(product.promoPixPrice)}
                          </span>
                        )}
                        {product.promoCardPrice !== undefined && product.promoCardPrice > 0 && (
                          <span className="text-[8px] bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider w-fit">
                            Card: {formatCurrency(product.promoCardPrice)}
                          </span>
                        )}
                        {product.promoMoneyPrice !== undefined && product.promoMoneyPrice > 0 && (
                          <span className="text-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider w-fit">
                            Money: {formatCurrency(product.promoMoneyPrice)}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estoque</span>
                    <span className={cn(
                      "text-xs font-black",
                      product.stock <= product.minStock ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {product.stock} un
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
              {(product.type === 'combo' || product.type === 'kit') && (
                product.kitMode === 'pronto' && product.packContents ? (
                  <span className="text-[9px] font-black text-purple-650 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1 max-w-[65%] truncate" title={product.packContents}>
                    <Sparkles size={11} className="text-purple-500 shrink-0 animate-pulse" />
                    {product.packContents}
                  </span>
                ) : (
                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
                    <Layers size={12} />
                    {product.comboItems?.length || 0} itens
                  </span>
                )
              )}
              {product.type === 'pack' && product.packContents && (
                <span className="text-[9px] font-black text-purple-650 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1 max-w-[65%] truncate" title={product.packContents}>
                  <Sparkles size={11} className="text-purple-500 animate-pulse shrink-0" />
                  {product.packContents}
                </span>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button 
                  onClick={() => toggleFavorite(product)}
                  className={cn(
                    "p-2 rounded-xl border transition-all shadow-sm",
                    product.isFavorite 
                      ? "bg-amber-50 border-amber-200 text-amber-500" 
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400"
                  )}
                >
                  <Star size={18} fill={product.isFavorite ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={() => handleDuplicate(product)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest shadow-sm"
                >
                  <Copy size={12} />
                  Duplicar
                </button>
                <button 
                  onClick={() => handleOpenModal(product)}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest shadow-sm"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
                <button 
                  onClick={() => handleDelete(product.id)}
                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </motion.div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  )}

      <AnimatePresence>
        {previewImage && (
          <div 
            className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <X size={24} />
              </button>
              <img 
                src={previewImage} 
                alt="Preview" 
                className="max-h-[80vh] w-auto rounded-2xl shadow-2xl object-contain bg-white"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-blue-600"
                    title="Voltar"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {validationErrors.length > 0 && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-600">
                    <AlertCircle size={20} className="shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">Erros encontrados:</p>
                      <p className="text-[10px] font-bold uppercase">{validationErrors.includes('items') ? `Adicione itens ao ${formData.type}` : 'Preencha todos os campos obrigatórios'}</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Produto</label>
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      {[
                        { id: 'avulso', label: 'Avulso' },
                        { id: 'combo', label: 'Combo' },
                        { id: 'kit', label: 'Kit' },
                        { id: 'pack', label: 'Pek' }
                      ].map((t) => (
                        <button 
                          key={t.id}
                          type="button"
                          onClick={() => {
                            const newType = t.id as any;
                            const newCategory = newType === 'combo' ? 'Combos' : newType === 'kit' ? 'Kits' : newType === 'pack' ? 'Peks' : (formData.category === 'Combos' || formData.category === 'Kits' || formData.category === 'Peks' ? 'Cabelos' : formData.category);
                            setFormData({ 
                              ...formData, 
                              type: newType, 
                              category: newCategory
                            });
                          }}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            formData.type === t.id ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400"
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(formData.type === 'combo' || formData.type === 'kit') && (
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Modo de Cadastro do {formData.type === 'kit' ? 'Kit' : 'Combo'}
                      </label>
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {[
                          { id: 'montar', label: `Montar Novo (Do Estoque)` },
                          { id: 'pronto', label: `${formData.type === 'kit' ? 'Kit Pronto Fechado' : 'Combo Pronto'} (Manual)` }
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                kitMode: m.id as 'montar' | 'pronto',
                                comboItems: m.id === 'pronto' ? [] : prev.comboItems
                              }));
                            }}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                              (formData.kitMode || 'montar') === m.id ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400"
                            )}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(formData.type === 'combo' || formData.type === 'kit') && (formData.kitMode || 'montar') === 'montar' && (
                    <div className={cn(
                      "col-span-2 space-y-3 p-4 rounded-2xl border transition-all",
                      validationErrors.includes('items') 
                        ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/30 ring-2 ring-rose-500/20" 
                        : "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30"
                    )}>
                      <label className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        validationErrors.includes('items') ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
                      )}>
                        Itens do {formData.type === 'combo' ? 'Combo' : 'Kit'}
                      </label>
                      
                      <div className="space-y-2">
                        {formData.comboItems?.map((item, idx) => {
                          const p = products.find(prod => prod.id === item.productId);
                          return (
                            <div key={idx} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-blue-100 dark:border-blue-900/30">
                              <div className="flex-1">
                                <p className="text-xs font-bold text-slate-900 dark:text-white">{p?.name || 'Produto não encontrado'}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{p?.brand}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateComboItemQuantity(item.productId, Number(e.target.value))}
                                  className="w-12 p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center text-xs font-bold"
                                  min="1"
                                />
                                <button 
                                  type="button"
                                  onClick={() => removeComboItem(item.productId)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Adicionar Item ao {formData.type === 'combo' ? 'Combo' : 'Kit'}:</p>
                        <select 
                          onChange={(e) => {
                            if (e.target.value) {
                              addComboItem(e.target.value);
                              if (validationErrors.includes('items')) setValidationErrors(prev => prev.filter(err => err !== 'items'));
                              e.target.value = "";
                            }
                          }}
                          className="w-full p-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/30 rounded-xl text-xs font-bold"
                        >
                          <option value="">Selecione um produto...</option>
                          {products.filter(p => (p.type === 'avulso' || !p.type) && !formData.comboItems?.some(ci => ci.productId === p.id)).map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.brand})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                   {(formData.type === 'pack' || ((formData.type === 'kit' || formData.type === 'combo') && formData.kitMode === 'pronto')) && (
                    <div className="col-span-2 space-y-3 p-4 rounded-2xl border bg-purple-50/50 dark:bg-purple-950/10 border-purple-100 dark:border-purple-900/30">
                      <label className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles size={12} className="text-purple-500 animate-pulse" />
                        Itens inclusos (Digitado Manualmente)
                      </label>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase leading-relaxed">
                        Descreva livremente o que vem neste {formData.type === 'combo' ? 'Combo' : formData.type === 'kit' ? 'Kit' : 'Pek'} pronto (ex: &quot;2 Kits Hair Plastia + 1 Kit Nutri Ouro&quot;). O controle de estoque será realizado no item completo.
                      </p>
                      <textarea
                        value={formData.packContents || ''}
                        onChange={(e) => setFormData({ ...formData, packContents: e.target.value })}
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-purple-250 dark:border-purple-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-xs text-slate-900 dark:text-white"
                        placeholder="Ex: 2x Kit Siàge Hair Plastia, 1x Kit Cronograma Truss"
                        rows={3}
                      />
                    </div>
                  )}

                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Imagem do Produto</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group">
                        {formData.image ? (
                          <>
                            <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => setFormData({ ...formData, image: '' })}
                              className="absolute inset-0 bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                            >
                              <XIcon size={20} />
                            </button>
                          </>
                        ) : (
                          <Camera size={24} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all cursor-pointer">
                            <Upload size={14} /> Upload
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                          </label>
                          <button 
                            onClick={generatePlaceholderImage}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                          >
                            <Sparkles size={14} /> Gerar
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">PNG, JPG ou WEBP (Máx. 500KB)</p>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Produto</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (validationErrors.includes('name')) setValidationErrors(prev => prev.filter(e => e !== 'name'));
                      }}
                      className={cn(
                        "w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 font-bold text-slate-900 dark:text-white transition-all",
                        validationErrors.includes('name') ? "border-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-blue-500"
                      )}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código de Barras ou Código Manual</label>
                    <input 
                      type="text" 
                      value={formData.barcode || ''}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Ex: 2026-07 ou 7891234567891"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white transition-all"
                    />
                    <p className="text-[8px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-tight">
                      Digite qualquer código manual (ex: 2026-07) para buscar no Caixa.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca</label>
                    <select 
                      value={formData.brand}
                      onChange={(e) => {
                        setFormData({ ...formData, brand: e.target.value });
                        if (validationErrors.includes('brand')) setValidationErrors(prev => prev.filter(e => e !== 'brand'));
                      }}
                      className={cn(
                        "w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 font-bold text-slate-900 dark:text-white transition-all",
                        validationErrors.includes('brand') ? "border-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-blue-500"
                      )}
                    >
                      <option value="">Selecione uma marca</option>
                      {brands.map(brand => (
                        <option key={brand.id} value={brand.name}>{brand.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => {
                        setFormData({ ...formData, category: e.target.value });
                        if (validationErrors.includes('category')) setValidationErrors(prev => prev.filter(e => e !== 'category'));
                      }}
                      className={cn(
                        "w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 font-bold text-slate-900 dark:text-white transition-all",
                        validationErrors.includes('category') ? "border-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-blue-500"
                      )}
                    >
                      {productCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name === 'Combos' ? '📦 ' : cat.name === 'Kits' ? '🎁 ' : ''}{cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Venda</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={formatCurrency(formData.price || 0)}
                      onChange={(e) => handleCurrencyChange(e, 'price')}
                      className={cn(
                        "w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 font-bold text-slate-900 dark:text-white transition-all",
                        Number(formData.price) < 0 ? "border-rose-500 focus:ring-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-blue-500"
                      )}
                    />
                    {Number(formData.price) < 0 && (
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                        <AlertTriangle size={10} /> O preço não pode ser negativo
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo</label>
                      {(formData.type === 'combo' || formData.type === 'kit' || formData.type === 'pack') && (
                        <button 
                          type="button"
                          onClick={() => {
                            let totalCost = 0;
                            (formData.comboItems || []).forEach(item => {
                              const p = products.find(prod => prod.id === item.productId);
                              if (p) totalCost += p.cost * item.quantity;
                            });
                            setFormData({ ...formData, cost: totalCost });
                            addNotification('Custo recalculado com base nos itens.', 'info');
                          }}
                          className="text-[8px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                        >
                          Recalcular
                        </button>
                      )}
                    </div>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={formatCurrency(formData.cost || 0)}
                      onChange={(e) => handleCurrencyChange(e, 'cost')}
                      className={cn(
                        "w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 font-bold text-slate-900 dark:text-white transition-all",
                        Number(formData.cost) < 0 ? "border-rose-500 focus:ring-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-blue-500"
                      )}
                    />
                    {Number(formData.cost) < 0 && (
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                        <AlertTriangle size={10} /> O custo não pode ser negativo
                      </p>
                    )}
                  </div>
                  
                  {/* Dynamic Promotional Pricing Block */}
                  <div className="col-span-2 p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl space-y-3">
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles size={12} className="text-blue-500 animate-pulse" />
                      Preços Promocionais por Forma de Pagamento (Opcional)
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase leading-relaxed">
                      Se configurado, o preço deste item mudará automaticamente no atendimento quando o respectivo método de recebimento for escolhido.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-wider">Pix</label>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={formatCurrency(formData.promoPixPrice || 0)}
                          onChange={(e) => handleCurrencyChange(e, 'promoPixPrice')}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs text-slate-900 dark:text-white"
                          placeholder="R$ 0,00"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-purple-500 dark:text-purple-400 uppercase tracking-wider">Cartão</label>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={formatCurrency(formData.promoCardPrice || 0)}
                          onChange={(e) => handleCurrencyChange(e, 'promoCardPrice')}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-xs text-slate-900 dark:text-white"
                          placeholder="R$ 0,00"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Dinheiro</label>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={formatCurrency(formData.promoMoneyPrice || 0)}
                          onChange={(e) => handleCurrencyChange(e, 'promoMoneyPrice')}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-xs text-slate-900 dark:text-white"
                          placeholder="R$ 0,00"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque Atual</label>
                    <input 
                      type="number" 
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Validade</label>
                    <input 
                      type="date" 
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque Mínimo</label>
                    <input 
                      type="number" 
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                      className={cn(
                        "w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 font-bold text-slate-900 dark:text-white transition-all",
                        Number(formData.minStock) > Number(formData.stock) ? "border-rose-500 focus:ring-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:ring-blue-500"
                      )}
                    />
                    {Number(formData.minStock) > Number(formData.stock) && (
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                        <AlertTriangle size={10} /> Não pode ser maior que o estoque atual
                      </p>
                    )}
                  </div>
                  
                  <div className="col-span-2 p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎟️</span>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Este produto é uma Rifa?</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Marque se este item representa um bilhete de rifa</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, isRaffle: !prev.isRaffle }))}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          formData.isRaffle ? "bg-amber-500" : "bg-slate-200 dark:bg-slate-700"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                            formData.isRaffle ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3 shrink-0">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
                >
                  Salvar Produto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gerenciar Categorias</h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nova Categoria</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ex: Cabelos"
                      className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                    />
                    <button 
                      onClick={handleAddCategory}
                      className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categorias Existentes</label>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                    {productCategories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 group hover:border-blue-200 transition-all">
                        <span className="font-bold text-slate-900 dark:text-white">{cat.name}</span>
                        <button 
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/40 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50">
                <button onClick={() => setIsCategoryModalOpen(false)} className="w-full py-3 bg-white dark:bg-slate-700 text-slate-600 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl font-black uppercase text-xs tracking-widest">Fechar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Action Bar */}
      {selectedProductIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white rounded-[24px] shadow-2xl p-4 flex flex-col md:flex-row items-center gap-4 border border-slate-800 w-[92%] max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-300">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              {selectedProductIds.length}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Itens Selecionados</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Ações em massa para aplicar</p>
            </div>
          </div>

          <div className="h-px md:h-8 w-full md:w-px bg-slate-800 shrink-0" />

          <div className="flex flex-wrap items-center gap-4 w-full justify-between">
            {/* Action 1: Price Readjustment */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reajustar Preço (%):</span>
              <input 
                type="number"
                placeholder="Ex: 10 ou -5"
                id="bulkPricePercent"
                className="w-20 px-2.5 py-1.5 bg-slate-800 border border-slate-750 rounded-lg text-xs font-bold text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('bulkPricePercent') as HTMLInputElement;
                  const percent = parseFloat(input?.value || '0');
                  handleBulkPriceAdjustment(percent);
                  if (input) input.value = '';
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-[10px] font-black uppercase tracking-wider text-white transition-all hover:scale-102 active:scale-95 cursor-pointer font-bold"
              >
                Aplicar
              </button>
            </div>

            {/* Action 2: Brand Binding */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Vincular Marca:</span>
              <select
                id="bulkBrandSelect"
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-750 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px]"
              >
                <option value="">Selecione...</option>
                {(() => {
                  const allBrandNames = Array.from(new Set([
                    ...brands.map(b => b.name),
                    ...products.map(p => p.brand).filter(Boolean)
                  ])).sort();
                  return allBrandNames.map(bName => (
                    <option key={bName} value={bName}>{bName}</option>
                  ));
                })()}
              </select>
              <button
                onClick={() => {
                  const select = document.getElementById('bulkBrandSelect') as HTMLSelectElement;
                  const bName = select?.value;
                  if (bName) {
                    handleBulkBrandChange(bName);
                    select.value = '';
                  } else {
                    addNotification('Por favor, selecione uma marca para vincular.', 'error');
                  }
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-[10px] font-black uppercase tracking-wider text-white transition-all hover:scale-102 active:scale-95 cursor-pointer font-bold"
              >
                Vincular
              </button>
            </div>

            {/* Clear/Cancel */}
            <button
              onClick={() => setSelectedProductIds([])}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ml-auto font-bold"
            >
              Desmarcar Todos
            </button>
          </div>
        </div>
      )}

      {/* MERCHANDISE ARRIVAL ENTRY MODAL */}
      <AnimatePresence>
        {isEntryModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-5xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50/20 dark:bg-emerald-950/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">🚚 Receber Mercadoria</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Abasteça seu estoque e automatize o financeiro e controle de validades em um único lugar.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (window.confirm('Deseja descartar este registro de entrada?')) {
                      setIsEntryModalOpen(false);
                    }
                  }} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
                {/* Supplier & Arrival Date Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fornecedor / Distribuidor</label>
                      <button
                        type="button"
                        onClick={() => setIsInlineSupplierModalOpen(true)}
                        className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-black uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle size={12} />
                        Novo Fornecedor
                      </button>
                    </div>
                    <select
                      value={entrySupplierId}
                      onChange={(e) => setEntrySupplierId(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white shadow-sm"
                    >
                      <option value="">-- Escolha o Fornecedor --</option>
                      {(settings.officialProviders || []).map((sup: any) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name.toUpperCase()} {sup.brand ? `(${sup.brand.toUpperCase()})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data de Recebimento (Chegada)</label>
                    <input
                      type="date"
                      value={entryArrivalDate}
                      onChange={(e) => setEntryArrivalDate(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white shadow-sm text-sm"
                    />
                  </div>
                </div>

                {/* Importação XML da Nota Fiscal (NFe) */}
                <div className="bg-blue-50/40 dark:bg-blue-950/15 p-6 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-900/60 flex flex-col items-center justify-center text-center space-y-3 relative hover:bg-blue-50/60 dark:hover:bg-blue-950/25 transition-all group">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shadow-md shadow-blue-100/50 dark:shadow-none group-hover:scale-105 transition-transform">
                    <FileText size={24} />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
                      🧾 Importar XML de Nota Fiscal (NFe)
                    </h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium max-w-lg mx-auto leading-relaxed">
                      Arraste seu arquivo <strong className="text-blue-600 dark:text-blue-400">.xml</strong> ou clique nesta área para ler a nota fiscal. O sistema preenche fornecedor, produtos, lote, quantidades, custos e validades na hora!
                    </p>
                  </div>
                  <input 
                    type="file" 
                    accept=".xml" 
                    onChange={handleXMLImport}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    title="Selecione o arquivo XML de Nota Fiscal (NFe)"
                  />
                </div>

                {/* Items Title */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                    <Box size={16} className="text-emerald-500" />
                    Produtos Recebidos neste Lote ({entryItems.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddEntryItem}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-emerald-100/50 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    Adicionar Produto
                  </button>
                </div>

                {/* Items Cards Grid */}
                <div className="space-y-4">
                  {entryItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="relative bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-emerald-200 dark:hover:border-emerald-900/40 transition-colors"
                    >
                      {/* Top ribbon containing delete and index */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider">
                          Item #{index + 1}
                        </span>
                        {entryItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEntryItem(item.id)}
                            className="text-slate-400 hover:text-rose-500 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-all cursor-pointer"
                            title="Remover produto da lista"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Is New Product Checkbox */}
                        <div className="flex items-center gap-2 md:col-span-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                          <input
                            type="checkbox"
                            id={`isNew-${item.id}`}
                            checked={item.isNewProduct}
                            onChange={(e) => handleUpdateEntryItem(item.id, 'isNewProduct', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <label htmlFor={`isNew-${item.id}`} className="text-xs font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider cursor-pointer select-none">
                            Este é um produto novo (não cadastrado ainda)
                          </label>
                        </div>

                        {item.isNewProduct ? (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nome do Novo Produto</label>
                              <input
                                type="text"
                                placeholder="Ex: Shampoo Nutritivo"
                                value={item.newProductName}
                                onChange={(e) => handleUpdateEntryItem(item.id, 'newProductName', e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Categoria</label>
                              <select
                                value={item.newProductCategory}
                                onChange={(e) => handleUpdateEntryItem(item.id, 'newProductCategory', e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white text-sm"
                              >
                                {productCategories.map(cat => (
                                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Selecionar Produto Existente</label>
                            <select
                              value={item.productId}
                              onChange={(e) => handleUpdateEntryItem(item.id, 'productId', e.target.value)}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white text-sm"
                            >
                              <option value="">-- Selecione o Produto --</option>
                              {products
                                .filter(p => !typeFilter || p.type === typeFilter || (!p.type && typeFilter === 'avulso'))
                                .map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name.toUpperCase()} {p.brand ? `[${p.brand.toUpperCase()}]` : ''} - Estoque: {p.stock} un
                                  </option>
                                ))
                              }
                            </select>
                          </div>
                        )}

                        {/* Quantity, Cost, Sale Price */}
                        <div className="grid grid-cols-3 gap-3 md:col-span-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Qtd Recebida</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateEntryItem(item.id, 'quantity', Number(e.target.value))}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Custo Unitário (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={item.cost || ''}
                              onChange={(e) => handleUpdateEntryItem(item.id, 'cost', Number(e.target.value))}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Preço Venda (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={item.price || ''}
                              onChange={(e) => handleUpdateEntryItem(item.id, 'price', Number(e.target.value))}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Lote, Expiry Date and Payment Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:col-span-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Número do Lote</label>
                            <input
                              type="text"
                              placeholder="Ex: L1024"
                              value={item.batchNumber || ''}
                              onChange={(e) => handleUpdateEntryItem(item.id, 'batchNumber', e.target.value.toUpperCase())}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data de Validade</label>
                            <input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) => handleUpdateEntryItem(item.id, 'expiryDate', e.target.value)}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vencimento do Boleto</label>
                            <input
                              type="date"
                              value={item.paymentDate}
                              onChange={(e) => handleUpdateEntryItem(item.id, 'paymentDate', e.target.value)}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals & Information Banner */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/45 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <h5 className="text-xs font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider">Totalização Financeira do Lote</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      Ao salvar, o estoque geral será atualizado e serão lançados boletos de contas a pagar para as respectivas datas de vencimento informadas.
                    </p>
                  </div>
                  <div className="text-center sm:text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total do Custo</p>
                    <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {formatCurrency(
                        entryItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.cost || 0)), 0)
                      )}
                    </h4>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => {
                    if (window.confirm('Deseja descartar este registro de entrada?')) {
                      setIsEntryModalOpen(false);
                    }
                  }} 
                  className="flex-1 py-3.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl font-black uppercase tracking-wider text-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveMerchandiseEntry}
                  className="flex-1 py-3.5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-wider text-xs hover:bg-emerald-700 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Truck size={16} />
                  Confirmar Entrada de Mercadoria
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INLINE SUPPLIER MODAL */}
      <AnimatePresence>
        {isInlineSupplierModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">🆕 Cadastrar Fornecedor</h3>
                <button 
                  onClick={() => setIsInlineSupplierModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Razão Social / Nome Fantasia</label>
                  <input 
                    type="text" 
                    value={newSupplierData.name}
                    onChange={(e) => setNewSupplierData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: L'Oréal Paris Ltda"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CNPJ (Opcional)</label>
                    <input 
                      type="text" 
                      value={newSupplierData.cnpj}
                      onChange={(e) => setNewSupplierData(prev => ({ ...prev, cnpj: e.target.value }))}
                      placeholder="00.000.000/0001-00"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca (Opcional)</label>
                    <input 
                      type="text" 
                      value={newSupplierData.brand}
                      onChange={(e) => setNewSupplierData(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Ex: L'Oréal"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    value={newSupplierData.phone}
                    onChange={(e) => setNewSupplierData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(51) 99999-9999"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button 
                  onClick={() => setIsInlineSupplierModalOpen(false)} 
                  className="flex-1 py-2.5 bg-white dark:bg-slate-700 text-slate-600 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveInlineSupplier}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-blue-700 transition-all shadow-md"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};
