import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order, CartItem, CreateOrderRequest, OrderFilters, OrderSummary, OrderStatus, PaymentStatus } from '../types/order';
import { mockOrders, mockCartItems, getOrdersByBuyer, getOrdersBySupplier, getOrdersByStatus, generateOrderNumber } from '../mocks/orders';
import { mockProducts } from '../mocks/products';
import { useAuthStore } from './authStore';

interface OrderState {
  orders: Order[];
  cartItems: CartItem[];
  currentOrder: Order | null;
  filters: OrderFilters;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  error: string | null;
}

interface OrderActions {
  // 주문 조회
  fetchOrders: (filters?: Partial<OrderFilters>) => Promise<void>;
  fetchOrdersByUser: (userId: string) => Promise<void>;
  fetchOrdersBySupplier: (supplierId: string) => Promise<void>;
  fetchOrder: (id: string) => Promise<void>;
  
  // 장바구니 관리
  fetchCartItems: (userId: string) => Promise<void>;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  updateCartItem: (cartItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  
  // 주문 생성 및 관리
  createOrder: (data: CreateOrderRequest) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updatePaymentStatus: (orderId: string, status: PaymentStatus) => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
  
  // 계산 유틸리티
  calculateCartSummary: () => OrderSummary;
  calculateOrderSummary: (items: CartItem[]) => OrderSummary;
  
  // 필터 및 검색
  setFilters: (filters: Partial<OrderFilters>) => void;
  clearFilters: () => void;
  
  // 기타
  clearError: () => void;
  setCurrentOrder: (order: Order | null) => void;
}

export const useOrderStore = create<OrderState & OrderActions>()(
  persist(
    (set, get) => ({
      // State
      orders: [],
      cartItems: [],
      currentOrder: null,
      filters: {
        status: '',
        paymentStatus: '',
        dateFrom: '',
        dateTo: '',
        supplierId: '',
        minAmount: 0,
        maxAmount: 0,
      },
      pagination: {
        current: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
      isLoading: false,
      error: null,

      // Actions
      fetchOrders: async (newFilters) => {
        set({ isLoading: true, error: null });
        
        try {
          const { filters } = get();
          const mergedFilters = { ...filters, ...newFilters };
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          let filteredOrders = [...mockOrders];
          
          // 필터링 로직
          if (mergedFilters.status) {
            filteredOrders = getOrdersByStatus(mergedFilters.status);
          }
          
          if (mergedFilters.paymentStatus) {
            filteredOrders = filteredOrders.filter(order => 
              order.paymentStatus === mergedFilters.paymentStatus
            );
          }
          
          if (mergedFilters.supplierId) {
            filteredOrders = getOrdersBySupplier(mergedFilters.supplierId);
          }
          
          if (mergedFilters.dateFrom) {
            filteredOrders = filteredOrders.filter(order =>
              order.orderDate >= mergedFilters.dateFrom
            );
          }
          
          if (mergedFilters.dateTo) {
            filteredOrders = filteredOrders.filter(order =>
              order.orderDate <= mergedFilters.dateTo
            );
          }
          
          if (mergedFilters.minAmount > 0) {
            filteredOrders = filteredOrders.filter(order =>
              order.totalAmount >= mergedFilters.minAmount
            );
          }
          
          if (mergedFilters.maxAmount > 0) {
            filteredOrders = filteredOrders.filter(order =>
              order.totalAmount <= mergedFilters.maxAmount
            );
          }
          
          // 정렬 (최신순)
          filteredOrders.sort((a, b) => 
            new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
          );
          
          const { pagination } = get();
          const total = filteredOrders.length;
          const totalPages = Math.ceil(total / pagination.pageSize);
          const startIndex = (pagination.current - 1) * pagination.pageSize;
          const endIndex = startIndex + pagination.pageSize;
          const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
          
          set({
            orders: paginatedOrders,
            filters: mergedFilters,
            pagination: {
              ...pagination,
              total,
              totalPages,
            },
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '주문을 불러오는 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      fetchOrdersByUser: async (userId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const userOrders = getOrdersByBuyer(userId);
          
          set({
            orders: userOrders,
            pagination: {
              ...get().pagination,
              total: userOrders.length,
              totalPages: Math.ceil(userOrders.length / get().pagination.pageSize),
            },
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '사용자 주문을 불러오는 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      fetchOrdersBySupplier: async (supplierId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const supplierOrders = getOrdersBySupplier(supplierId);
          
          set({
            orders: supplierOrders,
            pagination: {
              ...get().pagination,
              total: supplierOrders.length,
              totalPages: Math.ceil(supplierOrders.length / get().pagination.pageSize),
            },
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '공급자 주문을 불러오는 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      fetchOrder: async (id: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const order = mockOrders.find(o => o.id === id);
          if (!order) {
            throw new Error('주문을 찾을 수 없습니다.');
          }
          
          set({
            currentOrder: order,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '주문을 불러오는 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      fetchCartItems: async (userId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const userCartItems = mockCartItems[userId] || [];
          
          set({
            cartItems: userCartItems,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '장바구니를 불러오는 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      addToCart: async (productId: string, quantity: number) => {
        set({ isLoading: true, error: null });
        
        try {
          const user = useAuthStore.getState().user;
          if (!user) {
            throw new Error('로그인이 필요합니다.');
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const product = mockProducts.find(p => p.id === productId);
          if (!product) {
            throw new Error('상품을 찾을 수 없습니다.');
          }
          
          const { cartItems } = get();
          const existingItem = cartItems.find(item => item.productId === productId);
          
          let updatedCartItems: CartItem[];
          
          if (existingItem) {
            // 기존 아이템 수량 업데이트
            updatedCartItems = cartItems.map(item =>
              item.productId === productId
                ? { ...item, quantity: item.quantity + quantity }
                : item
            );
          } else {
            // 새 아이템 추가
            const userGrade = user.userType === 'retailer' && 'grade' in user ? user.grade || 'gold' : 'gold';
            const unitPrice = product.pricing[userGrade as keyof typeof product.pricing];
            
            const newCartItem: CartItem = {
              id: `cart_${Date.now()}`,
              productId: product.id,
              productName: product.name,
              productImage: product.images[0] || '/images/placeholder.jpg',
              productBrand: product.brand,
              unitPrice,
              quantity,
              supplierId: product.supplierId,
              supplierName: 'Supplier', // Mock data에서 supplier name 조회 필요
              maxOrderQuantity: product.maxOrderQuantity,
              stockQuantity: product.stockQuantity,
              addedAt: new Date().toISOString(),
            };
            
            updatedCartItems = [...cartItems, newCartItem];
          }
          
          set({
            cartItems: updatedCartItems,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '장바구니 추가 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      updateCartItem: async (cartItemId: string, quantity: number) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const { cartItems } = get();
          const updatedCartItems = cartItems.map(item =>
            item.id === cartItemId
              ? { ...item, quantity }
              : item
          );
          
          set({
            cartItems: updatedCartItems,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '장바구니 수정 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      removeFromCart: async (cartItemId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const { cartItems } = get();
          const updatedCartItems = cartItems.filter(item => item.id !== cartItemId);
          
          set({
            cartItems: updatedCartItems,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '장바구니 삭제 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      clearCart: async () => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          
          set({
            cartItems: [],
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '장바구니 비우기 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      createOrder: async (data: CreateOrderRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const user = useAuthStore.getState().user;
          if (!user) {
            throw new Error('로그인이 필요합니다.');
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { cartItems } = get();
          const summary = get().calculateOrderSummary(cartItems);
          
          const orderItems = cartItems.map(item => ({
            id: `item_${Date.now()}_${Math.random()}`,
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            productBrand: item.productBrand,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            supplierId: item.supplierId,
            supplierName: item.supplierName,
          }));
          
          const newOrder: Order = {
            id: Date.now().toString(),
            orderNumber: generateOrderNumber(),
            buyerId: user.id,
            buyerType: user.userType === 'customer' ? 'customer' : 'retailer',
            buyerName: user.name,
            buyerGrade: user.userType === 'retailer' && 'grade' in user ? user.grade : undefined,
            items: orderItems,
            subtotalAmount: summary.subtotal,
            discountAmount: summary.discount,
            shippingAmount: summary.shipping,
            taxAmount: summary.tax,
            totalAmount: summary.total,
            status: 'pending',
            paymentStatus: 'pending',
            paymentMethod: data.paymentMethod,
            shippingAddress: data.shippingAddress,
            orderDate: new Date().toISOString(),
            notes: data.notes,
          };
          
          // Mock 데이터에 추가
          mockOrders.unshift(newOrder);
          
          // 장바구니 비우기
          set({
            cartItems: [],
            currentOrder: newOrder,
            isLoading: false,
          });
          
          return newOrder;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '주문 생성 중 오류가 발생했습니다.',
            isLoading: false,
          });
          throw error;
        }
      },

      updateOrderStatus: async (orderId: string, status: OrderStatus) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const orderIndex = mockOrders.findIndex(o => o.id === orderId);
          if (orderIndex === -1) {
            throw new Error('주문을 찾을 수 없습니다.');
          }
          
          const updatedOrder = {
            ...mockOrders[orderIndex],
            status,
          };
          
          if (status === 'shipped') {
            updatedOrder.shippingDate = new Date().toISOString();
            updatedOrder.trackingNumber = `TRK${Date.now()}`;
          } else if (status === 'delivered') {
            updatedOrder.deliveryDate = new Date().toISOString();
          }
          
          mockOrders[orderIndex] = updatedOrder;
          
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '주문 상태 변경 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      updatePaymentStatus: async (orderId: string, status: PaymentStatus) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const orderIndex = mockOrders.findIndex(o => o.id === orderId);
          if (orderIndex === -1) {
            throw new Error('주문을 찾을 수 없습니다.');
          }
          
          const updatedOrder = {
            ...mockOrders[orderIndex],
            paymentStatus: status,
          };
          
          if (status === 'completed') {
            updatedOrder.paymentDate = new Date().toISOString();
            updatedOrder.status = 'confirmed';
          }
          
          mockOrders[orderIndex] = updatedOrder;
          
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '결제 상태 변경 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      cancelOrder: async (orderId: string, reason: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const orderIndex = mockOrders.findIndex(o => o.id === orderId);
          if (orderIndex === -1) {
            throw new Error('주문을 찾을 수 없습니다.');
          }
          
          mockOrders[orderIndex] = {
            ...mockOrders[orderIndex],
            status: 'cancelled',
            cancellationReason: reason,
          };
          
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '주문 취소 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      calculateCartSummary: () => {
        const { cartItems } = get();
        return get().calculateOrderSummary(cartItems);
      },

      calculateOrderSummary: (items: CartItem[]) => {
        const user = useAuthStore.getState().user;
        const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        
        // 등급별 할인 계산
        let discountRate = 0;
        if (user?.userType === 'retailer' && 'grade' in user) {
          const grade = user.grade;
          switch (grade) {
            case 'vip':
              discountRate = 0.05; // 5% 추가 할인
              break;
            case 'premium':
              discountRate = 0.03; // 3% 추가 할인
              break;
            case 'gold':
            default:
              discountRate = 0; // 할인 없음
              break;
          }
        }
        
        const discount = Math.floor(subtotal * discountRate);
        
        // 배송비 계산 (5만원 이상 무료배송 또는 VIP 무료배송)
        const isVip = user?.userType === 'retailer' && 'grade' in user && user.grade === 'vip';
        const shipping = (subtotal >= 50000 || isVip) ? 0 : 3000;
        
        // 부가세 (10%)
        const tax = Math.floor((subtotal - discount + shipping) * 0.1);
        
        const total = subtotal - discount + shipping + tax;
        
        return {
          subtotal,
          discount,
          shipping,
          tax,
          total,
        };
      },

      setFilters: (newFilters: Partial<OrderFilters>) => {
        set(state => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },

      clearFilters: () => {
        set({
          filters: {
            status: '',
            paymentStatus: '',
            dateFrom: '',
            dateTo: '',
            supplierId: '',
            minAmount: 0,
            maxAmount: 0,
          },
        });
      },

      clearError: () => {
        set({ error: null });
      },

      setCurrentOrder: (order: Order | null) => {
        set({ currentOrder: order });
      },
    }),
    {
      name: 'order-storage',
      partialize: (state) => ({
        cartItems: state.cartItems,
      }),
    }
  )
);