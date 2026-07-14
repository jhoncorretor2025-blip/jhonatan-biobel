import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role: 'admin' | 'user';
  isLocal?: boolean;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  isService?: boolean;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  barcode?: string;
  lastSoldAt?: string;
  image?: string;
  description?: string;
  expiryDate?: string;
  type: 'avulso' | 'combo' | 'kit' | 'pack';
  kitMode?: 'montar' | 'pronto';
  comboItems?: { productId: string; quantity: number }[];
  isFavorite?: boolean;
  status?: 'active' | 'inactive' | 'discontinued';
  createdAt?: string;
  promoPixPrice?: number;
  promoCardPrice?: number;
  promoMoneyPrice?: number;
  packContents?: string;
  isRaffle?: boolean;
}

export interface StockBatch {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  supplierId: string;
  supplierName: string;
  arrivalDate: string; // YYYY-MM-DD
  quantity: number;
  cost: number;
  expiryDate: string; // YYYY-MM-DD
  paymentDate: string; // YYYY-MM-DD
  paymentStatus: 'paid' | 'pending';
  batchNumber?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: 'Estagiária' | 'CLT' | 'Dona' | 'Sócia';
  startDate: string;
  phone: string;
  commission?: number; // % commission (base commission rate)
  commissionService?: number; // % commission for services
  commissionProduct?: number; // % commission for products
  goal?: number; // Monthly goal
  activities?: string[]; 
  status?: 'active' | 'inactive';
  dismissalDate?: string;
}

export interface StoreSettings {
  name: string;
  logo?: string;
  phone: string;
  email: string;
  address: string;
  instagram?: string;
  website?: string;
  primaryColor: string;
  theme: 'light' | 'dark';
  principalMenus?: string[];
  googleSheetsUrl?: string;
  additionalGoogleSheetsUrls?: string[];
  adminPassword?: string;
  adminPhoto?: string;
  pixKey?: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM';
  pixEnabled?: boolean;
  couponEnabled?: boolean;
  chartColors?: string[];
  hasSeenPixPromo?: boolean;
  showPastWeekdayTracker?: boolean;
  backupEmail?: string;
  backupTime?: string;
  backupEnabled?: boolean;
  dashboardConfig?: {
    showQuickActions: boolean;
    showWeeklyChart: boolean;
    showAverageTicket: boolean;
    showCashierStatus: boolean;
    showGoalProgress: boolean;
    showLowStockAlerts: boolean;
    showPendingBills: boolean;
    showBirthdays: boolean;
  };
  receiptConfig?: {
    showLogo: boolean;
    showAddress: boolean;
    showPhone: boolean;
    showInstagram: boolean;
    showDiscount: boolean;
    showSeller: boolean;
    customMessage: string;
  };
  maxDiscountLimit?: number;
  operatingHours?: {
    weekdayOpen: string;
    weekdayClose: string;
    saturdayOpen: string;
    saturdayClose: string;
    segOpen?: string;
    segClose?: string;
    segClosed?: boolean;
    terOpen?: string;
    terClose?: string;
    terClosed?: boolean;
    quaOpen?: string;
    quaClose?: string;
    quaClosed?: boolean;
    quiOpen?: string;
    quiClose?: string;
    quiClosed?: boolean;
    sexOpen?: string;
    sexClose?: string;
    sexClosed?: boolean;
    sabOpenDetail?: string;
    sabCloseDetail?: string;
    sabClosed?: boolean;
    domOpen?: string;
    domClose?: string;
    domClosed?: boolean;
  };
  workingWeekdays?: number[];
  excludeHolidaysFromCalculations?: boolean;
  taxRegime?: string;
  bankAccounts?: {
    id: string;
    bankName: string;
    agency: string;
    account: string;
    type: string;
  }[];
  officialProviders?: {
    id: string;
    name: string;
    cnpj?: string;
    phone?: string;
    brand?: string;
    offersGift?: boolean;
    giftDescription?: string;
  }[];
  cardRates?: {
    debit: number;
    credit1x: number;
    creditInstallment: number;
  };
  taxesAndRates?: {
    simplesNacional: number;
    icms: number;
    iss: number;
  };
  watermarkText?: string;
  keyboardShortcutsEnabled?: boolean;
  emailNotifications?: {
    dailyCashierChange: boolean;
    lowStock: boolean;
    goalsAchieved: boolean;
  };
}

export interface Withdrawal {
  id: string;
  amount: number;
  time: string;
  reason: string;
  type: 'withdrawal' | 'reinforcement';
}

export interface FixedCost {
  id: string;
  description: string;
  amount: number;
  dueDate: number; // Day of the month
  status: 'paid' | 'pending';
}

export interface FinancialAccount {
  id: string;
  type: 'payable' | 'receivable'; // Pagar ou Receber
  category: string; // Ex: boleto de fornecedor, energia, água, outros
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: 'paid' | 'pending';
  paymentDate?: string;
  supplierId?: string; // Optional reference to a supplier
}

export interface CashierSession {
  id: string;
  openingTime: string;
  closingTime?: string;
  openingBalance: number;
  closingBalance?: number;
  withdrawals: Withdrawal[];
  payments: {
    pix: number;
    dinheiro: number;
    debito: number;
    credito: number;
    outros: number;
  };
  status: 'open' | 'closed';
}

export interface Campaign {
  id: string;
  name: string;
  type: 'new_customers' | 'retention_30d' | 'custom';
  message: string;
  createdAt: string;
}

export interface Giveaway {
  id: string;
  name: string;
  description: string;
  date: string;
  winnerId?: string;
  winnerName?: string;
  status: 'pending' | 'completed';
  participants: string[];
  eligibilityType?: 'spend_threshold' | 'any_sale' | 'custom';
  eligibilityValue?: number;
  eligibilityCustomText?: string;
}

export interface RaffleTicket {
  number: number;
  buyerName: string;
  buyerPhone: string;
  status: 'available' | 'reserved' | 'paid';
  soldAt?: string;
  vendedora?: string;
}

export interface Raffle {
  id: string;
  title: string;
  prizeDescription: string;
  prizeValue: number;
  ticketPrice: number;
  totalNumbers: number;
  deadlineDate: string;
  drawDate: string;
  status: 'active' | 'drawn' | 'cancelled';
  tickets: RaffleTicket[];
  winnerNumber?: number;
  winnerName?: string;
  winnerPhone?: string;
  winnerVendedora?: string;
  createdAt: string;
  eligibilityType?: 'spend_threshold' | 'any_sale' | 'custom';
  eligibilityValue?: number;
  eligibilityCustomText?: string;
}

export interface RoutineActivity {
  id: string;
  description: string;
  completed: boolean;
  startedAt?: string;
  completedAt?: string;
}

export interface Routine {
  id: string;
  staffId: string;
  staffName: string;
  activities: RoutineActivity[];
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  gender?: string;
  city?: string;
  address?: string;
  birthDate?: string;
  email?: string;
  cpf?: string;
  notes?: string;
  points?: number;
  debt?: number;
  tier?: 'BRONZE' | 'PRATA' | 'OURO';
  tags?: string[];
  crmStatus?: 'novo' | 'negociacao' | 'pos_venda' | 'fidelizado' | 'resgatar';
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  brand?: string;
  category?: string;
  isRaffle?: boolean;
  raffleId?: string;
  raffleTicketNumber?: number;
}

export interface Payment {
  method: string;
  amount: number;
}

export interface Sale {
  id: string;
  date: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  vendedora?: string;
  total: number;
  discount: number;
  paymentMethod: string; // Keep for backward compatibility or primary method
  payments?: Payment[]; // New field for split payments
  status: string;
  items: SaleItem[];
  type?: 'Presencial' | 'Digital';
  category?: string;
  commission?: number;
  sessionId?: string;
  notes?: string;
}

export interface MonthlyGoal {
  id: string; // YYYY-MM
  month: string;
  storeGoal: number;
  extraBonus: number;
  workingDays: number;
  holidays: string[];
  workHoursWeekday: number;
  workHoursSaturday: number;
  saturdayGoal: number;
  saturdayGoalType?: 'single' | 'split' | 'individual';
  saturdayGoalShort?: number;
  saturdayGoalShortCount?: number;
  saturdayGoalLong?: number;
  saturdayGoalLongCount?: number;
  saturdaySchedules?: {
    [dateStr: string]: {
      openTime: string;
      closeTime: string;
      goal: number;
    }
  };
  staffGoals: {
    [staffName: string]: {
      monthlyGoal: number;
      commission: number;
    }
  };
  customEvents?: { id: string; date: string; name: string; description?: string }[];
}

export interface DashboardViewProps {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  products: Product[];
  customers: Customer[];
  staff: Staff[];
  settings: StoreSettings;
  monthlyGoals: MonthlyGoal[];
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  ensureAuthSession: () => Promise<boolean>;
  addNotification: (message: string, type: Notification['type']) => void;
  isCashierOpen: boolean;
  setActiveTab: (tab: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  weatherObservations: {[dateStr: string]: { condition: string; notes: string }};
  setWeatherObservations: React.Dispatch<React.SetStateAction<{[dateStr: string]: { condition: string; notes: string }}>>;
  activeDashboardTab?: any;
  setActiveDashboardTab?: (tab: any) => void;
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>;
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  cashierSessions?: CashierSession[];
  setCashierSessions?: React.Dispatch<React.SetStateAction<CashierSession[]>>;
  currentCashierSession?: CashierSession | null;
  setCurrentCashierSession?: React.Dispatch<React.SetStateAction<CashierSession | null>>;
  handleWhatsAppShare?: (sale?: Sale) => void;
  handlePrintReceipt?: (sale?: Sale) => void;
  handleCopyText?: (sale?: Sale) => void;
  handleDownloadPDF?: (sale?: Sale) => void;
  raffles?: Raffle[];
  setRaffles?: React.Dispatch<React.SetStateAction<Raffle[]>>;
  stockBatches?: StockBatch[];
  setStockBatches?: React.Dispatch<React.SetStateAction<StockBatch[]>>;
}

export interface ProductsViewProps {
  products: Product[];
  sales: Sale[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  brands: Brand[];
  productCategories: Category[];
  setProductCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  addNotification: (message: string, type?: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: any;
  formatCurrency: (value: number) => string;
  typeFilter?: 'avulso' | 'combo' | 'kit' | 'pack';
  ensureAuthSession: () => Promise<boolean>;
  stockBatches?: StockBatch[];
  setStockBatches?: React.Dispatch<React.SetStateAction<StockBatch[]>>;
  settings?: StoreSettings;
  setSettings?: React.Dispatch<React.SetStateAction<StoreSettings>>;
  financialAccounts?: FinancialAccount[];
  setFinancialAccounts?: React.Dispatch<React.SetStateAction<FinancialAccount[]>>;
}

export interface StaffViewProps {
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  addNotification: (message: string, type?: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  formatDate: (date: string) => string;
  ensureAuthSession: () => Promise<boolean>;
  sales?: Sale[];
  productCategories?: Category[];
  formatCurrency?: (val: number) => string;
}

export interface RoutineViewProps {
  routines: Routine[];
  setRoutines: React.Dispatch<React.SetStateAction<Routine[]>>;
  staff: Staff[];
  addNotification: (message: string, type?: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  formatDate: (date: string) => string;
  ensureAuthSession: () => Promise<boolean>;
}

export interface BackupViewProps {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  brands: Brand[];
  setBrands: React.Dispatch<React.SetStateAction<Brand[]>>;
  fixedCosts: FixedCost[];
  setFixedCosts: React.Dispatch<React.SetStateAction<FixedCost[]>>;
  financialAccounts?: FinancialAccount[];
  setFinancialAccounts?: React.Dispatch<React.SetStateAction<FinancialAccount[]>>;
  monthlyGoals: MonthlyGoal[];
  setMonthlyGoals: React.Dispatch<React.SetStateAction<MonthlyGoal[]>>;
  productCategories: Category[];
  setProductCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  addNotification: (message: string, type?: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  driveToken: string | null;
  setDriveToken: React.Dispatch<React.SetStateAction<string | null>>;
  isSyncingSheets: boolean;
  setIsSyncingSheets: React.Dispatch<React.SetStateAction<boolean>>;
  handleSyncGoogleSheetsLive: (silent?: boolean) => Promise<void>;
  setSelectedMonth?: (month: string) => void;
  cloudSyncEnabled?: boolean;
  cloudSyncing?: boolean;
  storeId?: string;
  setStoreId?: React.Dispatch<React.SetStateAction<string>>;
  lastCloudSyncTime?: string | null;
  enableCloudSync?: () => Promise<void>;
  disableCloudSync?: () => void;
}

export interface CustomersViewProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  sales: Sale[];
  products: Product[];
  campaigns: Campaign[];
  addNotification: (message: string, type: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  formatDate: (date: string) => string;
  formatCurrency: (value: number) => string;
  setSelectedCustomer: (customer: Customer | null) => void;
  setActiveTab: (tab: string) => void;
  ensureAuthSession: () => Promise<boolean>;
}

export interface SalesViewProps {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  customers: Customer[];
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>;
  products?: Product[];
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  cashierSessions?: CashierSession[];
  setCashierSessions?: React.Dispatch<React.SetStateAction<CashierSession[]>>;
  currentCashierSession?: CashierSession | null;
  setCurrentCashierSession?: React.Dispatch<React.SetStateAction<CashierSession | null>>;
  formatDate: (date: string) => string;
  formatCurrency: (value: number) => string;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  ensureAuthSession: () => Promise<boolean>;
  addNotification: (message: string, type: Notification['type']) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  monthlyGoals: any[];
  staff?: Staff[];
  handleWhatsAppShare?: (sale?: Sale) => void;
  handlePrintReceipt?: (sale?: Sale) => void;
  handleCopyText?: (sale?: Sale) => void;
  handleDownloadPDF?: (sale?: Sale) => void;
  weatherObservations?: {[dateStr: string]: { condition: string; notes: string }};
  raffles?: Raffle[];
  setRaffles?: React.Dispatch<React.SetStateAction<Raffle[]>>;
}

export interface CashierViewProps {
  formatCurrency: (value: number) => string;
  isCashierOpen: boolean;
  currentSession: CashierSession | null;
  sessions: CashierSession[];
  sales: Sale[];
  onOpenCashier: (balance: number) => void;
  onCloseCashier: (balance: number) => void;
  onAddWithdrawal: (amount: number, reason: string, type?: 'withdrawal' | 'reinforcement') => void;
  formatDate: (date: string) => string;
}

export interface CampaignsViewProps {
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  customers: Customer[];
  sales: Sale[];
  addNotification: (message: string, type?: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  formatDate: (date: string) => string;
  ensureAuthSession: () => Promise<boolean>;
  products?: Product[];
  routines?: Routine[];
  monthlyGoals?: MonthlyGoal[];
}

export interface AtendimentoViewProps {
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  cart: SaleItem[];
  setCart: React.Dispatch<React.SetStateAction<SaleItem[]>>;
  products: Product[];
  customers: Customer[];
  selectedCustomer: Customer | null;
  setSelectedCustomer: React.Dispatch<React.SetStateAction<Customer | null>>;
  vendedora: string;
  setVendedora: React.Dispatch<React.SetStateAction<string>>;
  paymentMethod: string;
  setPaymentMethod: React.Dispatch<React.SetStateAction<string>>;
  atendimentoProductSearch: string;
  setAtendimentoProductSearch: React.Dispatch<React.SetStateAction<string>>;
  atendimentoCustomerSearch: string;
  setAtendimentoCustomerSearch: React.Dispatch<React.SetStateAction<string>>;
  newCustomer: { name: string; phone: string };
  setNewCustomer: React.Dispatch<React.SetStateAction<{ name: string; phone: string }>>;
  isAddingCustomer: boolean;
  setIsAddingCustomer: React.Dispatch<React.SetStateAction<boolean>>;
  viewMode: 'Presencial' | 'Digital';
  setViewMode: React.Dispatch<React.SetStateAction<'Presencial' | 'Digital'>>;
  discount: number;
  setDiscount: React.Dispatch<React.SetStateAction<number>>;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  handleQuickAddCustomer: () => Promise<void>;
  handleFinalizeSale: () => Promise<void>;
  handleDownloadPDF: () => void;
  handleCopyText: () => void;
  handleWhatsAppShare: () => void;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
  addNotification: (message: string, type?: Notification['type']) => void;
  prevStep: () => void;
  nextStep: () => void;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface HomeViewProps {
  sales: any[];
  customers: any[];
  products: any[];
  fixedCosts: any[];
  isCashierOpen: boolean;
  currentCashierSession: any;
  monthlyGoals: any[];
  setActiveTab: (tab: string) => void;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
  setCart: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedProduct: (product: any | null) => void;
  setCurrentStep: (step: number) => void;
  brands: any[];
  settings: StoreSettings;
  staff: any[];
}

export interface ConfigViewProps {
  settings: any;
  setSettings: (settings: any) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  setActiveDashboardTab?: (tab: any) => void;
  setActiveTab?: (tab: any) => void;
  driveToken?: string | null;
  setDriveToken?: (token: string | null) => void;
  isSyncingSheets?: boolean;
  isExportingSheets?: boolean;
  handleSyncGoogleSheetsLive?: (silent?: boolean) => Promise<void>;
  handleExportToGoogleSheetsLive?: (silent?: boolean) => Promise<void>;
  handleConnectGoogleDrive?: () => Promise<void>;
  isSignInDriveLoading?: boolean;
  googleUser?: any;
  sales?: any[];
  formatCurrency?: (value: number) => string;
}

export interface BrandsViewProps {
  brands: Brand[];
  setBrands: React.Dispatch<React.SetStateAction<Brand[]>>;
  sales: Sale[];
  products: Product[];
  addNotification: (message: string, type?: Notification['type']) => void;
  handleFirestoreError: (error: any, operation: string, path: string) => void;
  user: User | null;
  ensureAuthSession: () => Promise<boolean>;
}

