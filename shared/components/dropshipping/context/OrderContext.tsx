import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { Order, OrderStats, OrderFilters, sampleOrders } from '../types/order';

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  filters: OrderFilters;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  pagination: {
    page: number;
    pageSize: number;
  };
}

type OrderAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: { id: string; updates: Partial<Order> } }
  | { type: 'DELETE_ORDER'; payload: string }
  | { type: 'SET_FILTERS'; payload: Partial<OrderFilters> }
  | { type: 'SET_SORTING'; payload: { sortBy: string; sortOrder: 'asc' | 'desc' } }
  | { type: 'SET_PAGINATION'; payload: { page?: number; pageSize?: number } }
  | { type: 'RESET_FILTERS' };

const initialState: OrderState = {
  orders: sampleOrders,
  loading: false,
  error: null,
  filters: {
    status: [],
    dateRange: {
      start: '',
      end: ''
    },
    search: '',
    sellerId: '',
    partnerId: ''
  },
  sortBy: 'createdAt',
  sortOrder: 'desc',
  pagination: {
    page: 1,
    pageSize: 20
  }
};

const orderReducer = (state: OrderState, action: OrderAction): OrderState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_ORDERS':
      return { ...state, orders: action.payload, loading: false, error: null };
    
    case 'ADD_ORDER':
      return {
        ...state,
        orders: [action.payload, ...state.orders],
        loading: false,
        error: null
      };
    
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === action.payload.id
            ? { ...order, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : order
        ),
        loading: false,
        error: null
      };
    
    case 'DELETE_ORDER':
      return {
        ...state,
        orders: state.orders.filter(order => order.id !== action.payload),
        loading: false,
        error: null
      };
    
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        pagination: { ...state.pagination, page: 1 } // Reset to first page when filtering
      };
    
    case 'SET_SORTING':
      return {
        ...state,
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder
      };
    
    case 'SET_PAGINATION':
      return {
        ...state,
        pagination: { ...state.pagination, ...action.payload }
      };
    
    case 'RESET_FILTERS':
      return {
        ...state,
        filters: initialState.filters,
        pagination: { ...state.pagination, page: 1 }
      };
    
    default:
      return state;
  }
};

interface OrderContextType {
  state: OrderState;
  // Actions
  loadOrders: () => Promise<void>;
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  applyFilters: (filters: Partial<OrderFilters>) => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  setPagination: (page?: number, pageSize?: number) => void;
  resetFilters: () => void;
  // Computed values
  getOrderStats: () => OrderStats;
  getFilteredOrders: () => Order[];
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

export const useOrderFilters = () => {
  const { state, applyFilters, resetFilters } = useOrders();
  
  const hasActiveFilters = useMemo(() => {
    const { filters } = state;
    return (
      filters.status.length > 0 ||
      filters.search.trim() !== '' ||
      filters.dateRange.start !== '' ||
      filters.dateRange.end !== '' ||
      filters.sellerId !== '' ||
      filters.partnerId !== ''
    );
  }, [state.filters]);

  const clearFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  return {
    filters: state.filters,
    hasActiveFilters,
    applyFilters,
    clearFilters
  };
};

export const useOrderPagination = () => {
  const { state, setPagination, getFilteredOrders } = useOrders();
  const orders = getFilteredOrders();
  
  const totalItems = orders.length;
  const totalPages = Math.ceil(totalItems / state.pagination.pageSize);
  const startIndex = (state.pagination.page - 1) * state.pagination.pageSize;
  const endIndex = Math.min(startIndex + state.pagination.pageSize, totalItems);
  const paginatedOrders = orders.slice(startIndex, endIndex);

  const setPage = useCallback((page: number) => {
    setPagination(page, undefined);
  }, [setPagination]);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination(1, pageSize);
  }, [setPagination]);

  return {
    orders: paginatedOrders,
    pagination: state.pagination,
    totalItems,
    totalPages,
    setPage,
    setPageSize
  };
};

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(orderReducer, initialState);

  const loadOrders = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      dispatch({ type: 'SET_ORDERS', payload: sampleOrders });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load orders' });
    }
  }, []);

  const addOrder = useCallback(async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const newOrder: Order = {
        ...orderData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      dispatch({ type: 'ADD_ORDER', payload: newOrder });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add order' });
    }
  }, []);

  const updateOrder = useCallback(async (id: string, updates: Partial<Order>) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      dispatch({ type: 'UPDATE_ORDER', payload: { id, updates } });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update order' });
    }
  }, []);

  const deleteOrder = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      dispatch({ type: 'DELETE_ORDER', payload: id });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete order' });
    }
  }, []);

  const applyFilters = useCallback((filters: Partial<OrderFilters>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const setSorting = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    dispatch({ type: 'SET_SORTING', payload: { sortBy, sortOrder } });
  }, []);

  const setPagination = useCallback((page?: number, pageSize?: number) => {
    dispatch({ type: 'SET_PAGINATION', payload: { page, pageSize } });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  const getOrderStats = useCallback((): OrderStats => {
    const { orders } = state;
    
    const totalOrders = orders.length;
    const newOrders = orders.filter(order => order.status === 'new').length;
    const processingOrders = orders.filter(order => order.status === 'processing').length;
    const shippingOrders = orders.filter(order => order.status === 'shipping').length;
    const deliveredOrders = orders.filter(order => order.status === 'delivered').length;
    const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;
    
    const totalRevenue = orders
      .filter(order => order.status !== 'cancelled')
      .reduce((sum, order) => sum + order.totalAmount, 0);
    
    const totalMargin = orders
      .filter(order => order.status !== 'cancelled')
      .reduce((sum, order) => sum + order.margin, 0);
    
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalOrders,
      newOrders,
      processingOrders,
      shippingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      totalMargin,
      averageOrderValue
    };
  }, [state]);

  const getFilteredOrders = useCallback((): Order[] => {
    let filtered = [...state.orders];
    const { filters, sortBy, sortOrder } = state;

    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(order => filters.status.includes(order.status));
    }

    // Apply search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchTerm) ||
        order.productName.toLowerCase().includes(searchTerm) ||
        order.customerName.toLowerCase().includes(searchTerm) ||
        order.recipientName.toLowerCase().includes(searchTerm) ||
        order.sellerName.toLowerCase().includes(searchTerm) ||
        (order.partnerName && order.partnerName.toLowerCase().includes(searchTerm))
      );
    }

    // Apply date range filter
    if (filters.dateRange.start) {
      filtered = filtered.filter(order => order.createdAt >= filters.dateRange.start);
    }
    if (filters.dateRange.end) {
      filtered = filtered.filter(order => order.createdAt <= filters.dateRange.end);
    }

    // Apply seller filter
    if (filters.sellerId) {
      filtered = filtered.filter(order => order.sellerId === filters.sellerId);
    }

    // Apply partner filter
    if (filters.partnerId) {
      filtered = filtered.filter(order => order.partnerId === filters.partnerId);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Order];
      let bValue: any = b[sortBy as keyof Order];

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [state]);

  const value: OrderContextType = {
    state,
    loadOrders,
    addOrder,
    updateOrder,
    deleteOrder,
    applyFilters,
    setSorting,
    setPagination,
    resetFilters,
    getOrderStats,
    getFilteredOrders
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};