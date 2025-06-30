import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Types
export interface SalesData {
  date: string;
  sales: number;
  orders: number;
  avgOrder: number;
  lastYearSales?: number;
}

export interface CategoryData {
  name: string;
  value: number;
  sales: number;
  color: string;
  products: number;
  growth: number;
}

export interface KPIData {
  totalProducts: number;
  newOrders: number;
  monthlySales: number;
  pendingShipments: number;
  // Enhanced KPI data
  trends: {
    products: number;
    orders: number;
    sales: number;
    shipments: number;
  };
  comparisons: {
    products: { lastMonth: number; lastYear: number };
    orders: { lastMonth: number; lastYear: number };
    sales: { lastMonth: number; lastYear: number };
    shipments: { lastMonth: number; lastYear: number };
  };
}

export interface DateRange {
  start: Date;
  end: Date;
  preset: '7d' | '30d' | '3m' | 'custom';
}

export interface DashboardState {
  // Data
  salesData: SalesData[];
  categoryData: CategoryData[];
  kpiData: KPIData;
  
  // UI State
  dateRange: DateRange;
  isLoading: boolean;
  error: string | null;
  selectedChart: string | null;
  
  // Cache
  dataCache: Map<string, { data: any; timestamp: number }>;
  lastUpdated: Date;
  
  // Settings
  autoRefresh: boolean;
  refreshInterval: number;
}

// Actions
type DashboardAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SALES_DATA'; payload: SalesData[] }
  | { type: 'SET_CATEGORY_DATA'; payload: CategoryData[] }
  | { type: 'SET_KPI_DATA'; payload: KPIData }
  | { type: 'SET_DATE_RANGE'; payload: DateRange }
  | { type: 'SET_SELECTED_CHART'; payload: string | null }
  | { type: 'UPDATE_CACHE'; payload: { key: string; data: any } }
  | { type: 'CLEAR_CACHE' }
  | { type: 'SET_AUTO_REFRESH'; payload: boolean }
  | { type: 'SET_REFRESH_INTERVAL'; payload: number }
  | { type: 'SET_LAST_UPDATED'; payload: Date };

// Initial state
const initialState: DashboardState = {
  salesData: [],
  categoryData: [],
  kpiData: {
    totalProducts: 0,
    newOrders: 0,
    monthlySales: 0,
    pendingShipments: 0,
    trends: { products: 0, orders: 0, sales: 0, shipments: 0 },
    comparisons: {
      products: { lastMonth: 0, lastYear: 0 },
      orders: { lastMonth: 0, lastYear: 0 },
      sales: { lastMonth: 0, lastYear: 0 },
      shipments: { lastMonth: 0, lastYear: 0 }
    }
  },
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
    preset: '30d'
  },
  isLoading: false,
  error: null,
  selectedChart: null,
  dataCache: new Map(),
  lastUpdated: new Date(),
  autoRefresh: true,
  refreshInterval: 30000
};

// Reducer
const dashboardReducer = (state: DashboardState, action: DashboardAction): DashboardState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_SALES_DATA':
      return { ...state, salesData: action.payload, lastUpdated: new Date() };
    
    case 'SET_CATEGORY_DATA':
      return { ...state, categoryData: action.payload, lastUpdated: new Date() };
    
    case 'SET_KPI_DATA':
      return { ...state, kpiData: action.payload, lastUpdated: new Date() };
    
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload };
    
    case 'SET_SELECTED_CHART':
      return { ...state, selectedChart: action.payload };
    
    case 'UPDATE_CACHE':
      const newCache = new Map(state.dataCache);
      newCache.set(action.payload.key, {
        data: action.payload.data,
        timestamp: Date.now()
      });
      return { ...state, dataCache: newCache };
    
    case 'CLEAR_CACHE':
      return { ...state, dataCache: new Map() };
    
    case 'SET_AUTO_REFRESH':
      return { ...state, autoRefresh: action.payload };
    
    case 'SET_REFRESH_INTERVAL':
      return { ...state, refreshInterval: action.payload };
    
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.payload };
    
    default:
      return state;
  }
};

// Context
interface DashboardContextType {
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;
  // Helper functions
  refreshData: () => Promise<void>;
  setDateRange: (range: DateRange) => void;
  getCachedData: (key: string, maxAge?: number) => any | null;
  setCachedData: (key: string, data: any) => void;
  clearError: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Provider component
interface DashboardProviderProps {
  children: ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  // Mock data generators
  const generateSalesData = (dateRange: DateRange): SalesData[] => {
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const data: SalesData[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(dateRange.start.getTime() + i * 24 * 60 * 60 * 1000);
      const baseOrders = 30 + Math.sin(i * 0.2) * 10 + Math.random() * 20;
      const avgOrder = 25000 + Math.random() * 15000;
      const sales = baseOrders * avgOrder;
      const lastYearSales = sales * (0.8 + Math.random() * 0.4); // ±20% variation
      
      data.push({
        date: date.toISOString().split('T')[0],
        sales: Math.floor(sales),
        orders: Math.floor(baseOrders),
        avgOrder: Math.floor(avgOrder),
        lastYearSales: Math.floor(lastYearSales)
      });
    }
    
    return data;
  };

  const generateCategoryData = (): CategoryData[] => {
    return [
      { name: '전자기기', value: 45, sales: 12000000, color: '#3b82f6', products: 156, growth: 12.5 },
      { name: '의류', value: 30, sales: 8000000, color: '#10b981', products: 89, growth: -2.3 },
      { name: '가전제품', value: 15, sales: 4500000, color: '#f59e0b', products: 67, growth: 8.7 },
      { name: '스포츠', value: 7, sales: 2100000, color: '#ef4444', products: 34, growth: 15.2 },
      { name: '기타', value: 3, sales: 900000, color: '#8b5cf6', products: 23, growth: -5.1 }
    ];
  };

  const generateKPIData = (): KPIData => {
    return {
      totalProducts: 1247,
      newOrders: 2892,
      monthlySales: 27450000,
      pendingShipments: 156,
      trends: {
        products: 12.5,
        orders: -2.3,
        sales: 8.7,
        shipments: 5.2
      },
      comparisons: {
        products: { lastMonth: 1124, lastYear: 1089 },
        orders: { lastMonth: 2963, lastYear: 2654 },
        sales: { lastMonth: 25230000, lastYear: 22890000 },
        shipments: { lastMonth: 148, lastYear: 134 }
      }
    };
  };

  // Helper functions
  const refreshData = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      // Simulate API calls with delays
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const salesData = generateSalesData(state.dateRange);
      const categoryData = generateCategoryData();
      const kpiData = generateKPIData();
      
      dispatch({ type: 'SET_SALES_DATA', payload: salesData });
      dispatch({ type: 'SET_CATEGORY_DATA', payload: categoryData });
      dispatch({ type: 'SET_KPI_DATA', payload: kpiData });
      
      // Cache the data
      setCachedData('salesData', salesData);
      setCachedData('categoryData', categoryData);
      setCachedData('kpiData', kpiData);
      
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load dashboard data' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const setDateRange = (range: DateRange) => {
    dispatch({ type: 'SET_DATE_RANGE', payload: range });
  };

  const getCachedData = (key: string, maxAge: number = 300000): any | null => { // 5 minutes default
    const cached = state.dataCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > maxAge) {
      return null;
    }
    
    return cached.data;
  };

  const setCachedData = (key: string, data: any) => {
    dispatch({ type: 'UPDATE_CACHE', payload: { key, data } });
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // Auto refresh effect
  useEffect(() => {
    if (!state.autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, state.refreshInterval);

    return () => clearInterval(interval);
  }, [state.autoRefresh, state.refreshInterval, state.dateRange]);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, [state.dateRange]);

  // Cache cleanup effect
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const maxAge = 600000; // 10 minutes
      
      const newCache = new Map();
      state.dataCache.forEach((value, key) => {
        if (now - value.timestamp <= maxAge) {
          newCache.set(key, value);
        }
      });
      
      if (newCache.size !== state.dataCache.size) {
        dispatch({ type: 'UPDATE_CACHE', payload: { key: '', data: newCache } });
      }
    }, 60000); // Check every minute

    return () => clearInterval(cleanup);
  }, [state.dataCache]);

  const contextValue: DashboardContextType = {
    state,
    dispatch,
    refreshData,
    setDateRange,
    getCachedData,
    setCachedData,
    clearError
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

// Hook to use dashboard context
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

// Additional helper hooks
export const useDashboardData = () => {
  const { state } = useDashboard();
  return {
    salesData: state.salesData,
    categoryData: state.categoryData,
    kpiData: state.kpiData,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated
  };
};

export const useDashboardSettings = () => {
  const { state, dispatch } = useDashboard();
  
  return {
    autoRefresh: state.autoRefresh,
    refreshInterval: state.refreshInterval,
    dateRange: state.dateRange,
    setAutoRefresh: (enabled: boolean) => 
      dispatch({ type: 'SET_AUTO_REFRESH', payload: enabled }),
    setRefreshInterval: (interval: number) => 
      dispatch({ type: 'SET_REFRESH_INTERVAL', payload: interval }),
    setDateRange: (range: DateRange) => 
      dispatch({ type: 'SET_DATE_RANGE', payload: range })
  };
};

export const useDashboardCache = () => {
  const { getCachedData, setCachedData, dispatch } = useDashboard();
  
  return {
    getCachedData,
    setCachedData,
    clearCache: () => dispatch({ type: 'CLEAR_CACHE' })
  };
};