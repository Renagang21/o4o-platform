import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { orderService } from '../api/services/orderService';
import { Order } from '../types/order';

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  error: string | null;
  createOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => Promise<Order>;
  cancelOrder: (id: string) => Promise<void>;
  getOrderById: (id: string) => Promise<Order>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadUserOrders();
    }
  }, [user]);

  const loadUserOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const userOrders = await orderService.getOrdersByUser(user!.id.toString());
      setOrders(userOrders);
    } catch (err) {
      setError('주문 내역을 불러오는 중 오류가 발생했습니다.');
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => {
    try {
      setLoading(true);
      setError(null);
      const newOrder = await orderService.createOrder(order);
      setOrders(prev => [...prev, newOrder]);
      return newOrder;
    } catch (err) {
      setError('주문을 생성하는 중 오류가 발생했습니다.');
      console.error('Error creating order:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const cancelledOrder = await orderService.cancelOrder(id);
      setOrders(prev => prev.map(order => order.id === id ? cancelledOrder : order));
    } catch (err) {
      setError('주문을 취소하는 중 오류가 발생했습니다.');
      console.error('Error cancelling order:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getOrderById = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      return await orderService.getOrderById(id);
    } catch (err) {
      setError('주문 정보를 불러오는 중 오류가 발생했습니다.');
      console.error('Error getting order:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        loading,
        error,
        createOrder,
        cancelOrder,
        getOrderById,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}; 