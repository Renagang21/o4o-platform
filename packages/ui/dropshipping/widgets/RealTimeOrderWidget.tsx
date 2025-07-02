import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Package,
  User,
  MapPin,
  Star,
  TrendingUp
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

interface Order {
  id: string;
  customerName: string;
  productName: string;
  amount: number;
  status: 'new' | 'processing' | 'urgent' | 'high-value';
  timestamp: Date;
  location?: string;
  priority: 'normal' | 'high' | 'urgent';
  isNew?: boolean;
}

interface RealTimeOrderWidgetProps {
  className?: string;
  maxOrders?: number;
  updateInterval?: number;
}

// Order generation scenarios
const orderScenarios = [
  {
    type: 'regular' as const,
    probability: 0.7,
    products: ['무선 이어폰', 'USB 케이블', '스마트폰 케이스', '무선 충전기', '블루투스 스피커'],
    customers: ['김민수', '이지영', '박정호', '최서연', '정다현'],
    amounts: [15000, 25000, 35000, 45000, 55000],
    locations: ['서울', '부산', '대구', '인천', '광주']
  },
  {
    type: 'high-value' as const,
    probability: 0.2,
    products: ['노트북', '태블릿', '스마트워치', '무선청소기', '에어프라이어'],
    customers: ['김기업', '이대표', '박사장', '최투자', '정부자'],
    amounts: [200000, 350000, 500000, 750000, 1000000],
    locations: ['강남구', '서초구', '송파구', '분당구', '판교']
  },
  {
    type: 'urgent' as const,
    probability: 0.1,
    products: ['긴급 배송 상품', '당일 배송 필요', '선물용 포장', '급한 주문'],
    customers: ['응급고객', '급한분', '선물준비', '마감임박'],
    amounts: [50000, 100000, 150000, 200000],
    locations: ['당일배송지역', '긴급배송', '익일배송']
  }
];

const getRandomElement = <T,>(array: T[]): T => array[Math.floor(Math.random() * array.length)];

const generateRandomOrder = (): Order => {
  const scenario = orderScenarios.find(s => Math.random() < s.probability) || orderScenarios[0];
  const orderId = 'ORD-' + Date.now().toString().slice(-6);
  
  return {
    id: orderId,
    customerName: getRandomElement(scenario.customers),
    productName: getRandomElement(scenario.products),
    amount: getRandomElement(scenario.amounts),
    status: scenario.type === 'urgent' ? 'urgent' : scenario.type === 'high-value' ? 'high-value' : 'new',
    timestamp: new Date(),
    location: getRandomElement(scenario.locations),
    priority: scenario.type === 'urgent' ? 'urgent' : scenario.type === 'high-value' ? 'high' : 'normal',
    isNew: true
  };
};

export const RealTimeOrderWidget: React.FC<RealTimeOrderWidgetProps> = ({
  className = '',
  maxOrders = 10,
  updateInterval = 5000
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalAmount: 0,
    averageOrder: 0,
    urgentOrders: 0
  });
  const intervalRef = useRef<NodeJS.Timeout>();
  const soundRef = useRef<HTMLAudioElement>();

  // Initialize with some orders
  useEffect(() => {
    const initialOrders = Array.from({ length: 5 }, () => {
      const order = generateRandomOrder();
      order.isNew = false;
      order.timestamp = new Date(Date.now() - Math.random() * 3600000); // Random time in last hour
      return order;
    });
    setOrders(initialOrders);
  }, []);

  // Real-time order generation
  useEffect(() => {
    if (!isLive) return;

    intervalRef.current = setInterval(() => {
      const newOrder = generateRandomOrder();
      
      setOrders(prev => {
        const updated = [newOrder, ...prev].slice(0, maxOrders);
        
        // Play notification sound for high priority orders
        if ((newOrder.priority === 'urgent' || newOrder.priority === 'high') && soundRef.current) {
          soundRef.current.play().catch(() => {}); // Ignore audio play errors
        }
        
        return updated;
      });

      // Remove "new" flag after animation
      setTimeout(() => {
        setOrders(prev => prev.map(order => 
          order.id === newOrder.id ? { ...order, isNew: false } : order
        ));
      }, 2000);
    }, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLive, updateInterval, maxOrders]);

  // Update stats
  useEffect(() => {
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0);
    const averageOrder = totalOrders > 0 ? totalAmount / totalOrders : 0;
    const urgentOrders = orders.filter(order => order.priority === 'urgent').length;

    setStats({
      totalOrders,
      totalAmount,
      averageOrder,
      urgentOrders
    });
  }, [orders]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getRelativeTime = (date: Date) => {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}초 전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    return `${Math.floor(diff / 3600)}시간 전`;
  };

  const getPriorityIcon = (priority: string, status: string) => {
    if (status === 'urgent') return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (status === 'high-value') return <Star className="w-4 h-4 text-yellow-500" />;
    return <ShoppingCart className="w-4 h-4 text-blue-500" />;
  };

  const getPriorityColor = (priority: string, status: string) => {
    if (status === 'urgent') return 'border-red-200 bg-red-50';
    if (status === 'high-value') return 'border-yellow-200 bg-yellow-50';
    return 'border-gray-200 bg-white';
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* Audio element for notifications */}
      <audio
        ref={soundRef}
        preload="auto"
        className="hidden"
      >
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmkfCFOl1+e5cCEFZKvl96xXFAg+ltztxXkpBSl6yO7eizmEGW7A7eKWQw0MUKXh8bllHgg2jdXzzn8vBSF8xe/eliEIGGS57+GeUBALTKXe8btqFglNpZvl9bORSQ0DOXvI9N+6FgoTFqnl9bCSURAFSZvd8sNsQg0FR5nU9d1UFRQBX6q65dq9iQ==" type="audio/wav" />
      </audio>

      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">실시간 주문</h3>
              <p className="text-sm text-gray-500">최신 주문 현황</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-xs text-gray-600 font-medium">
                {isLive ? '실시간' : '일시정지'}
              </span>
            </div>
            
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isLive 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isLive ? '일시정지' : '재개'}
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {[
            {
              label: '총 주문',
              value: stats.totalOrders.toString(),
              icon: ShoppingCart,
              color: 'text-blue-600'
            },
            {
              label: '총 금액',
              value: formatCurrency(stats.totalAmount),
              icon: DollarSign,
              color: 'text-green-600'
            },
            {
              label: '평균 주문액',
              value: formatCurrency(stats.averageOrder),
              icon: TrendingUp,
              color: 'text-purple-600'
            },
            {
              label: '긴급 주문',
              value: stats.urgentOrders.toString(),
              icon: AlertCircle,
              color: 'text-red-600'
            }
          ].map((stat, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-gray-600 font-medium">{stat.label}</span>
              </div>
              <div className="text-lg font-bold text-gray-900">{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4 sm:p-6">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>주문을 기다리는 중...</p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className={`
                  p-4 rounded-lg border transition-all duration-500 hover:shadow-md cursor-pointer
                  ${getPriorityColor(order.priority, order.status)}
                  ${order.isNew ? 'animate-pulse shadow-lg scale-105' : ''}
                `}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getPriorityIcon(order.priority, order.status)}
                    <div>
                      <div className="font-semibold text-gray-900">#{order.id}</div>
                      <div className="text-sm text-gray-600">{order.customerName}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status === 'new' ? '신규' : order.status === 'urgent' ? '긴급' : '고액'} size="sm" />
                    {order.isNew && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full animate-bounce">
                        NEW
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{order.productName}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold text-gray-900">{formatCurrency(order.amount)}</span>
                  </div>
                  
                  {order.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">{order.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(order.timestamp)}</span>
                    </div>
                    <span>{getRelativeTime(order.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        {orders.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              <button className="flex-1 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
                모든 주문 보기
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                필터
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};