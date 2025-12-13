/**
 * PharmacyOps Shared UI Components v2
 *
 * @package @o4o/pharmacyops
 */

import React from 'react';

// ===== Stat Card =====
export interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  icon,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subValue && <p className="text-xs mt-1 opacity-70">{subValue}</p>}
        </div>
        <span className="text-3xl opacity-50">{icon}</span>
      </div>
    </div>
  );
};

// ===== Quick Action Button =====
export interface QuickActionButtonProps {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  label,
  icon,
  onClick,
  variant = 'secondary',
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${variants[variant]}`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
};

// ===== Status Badge =====
export interface StatusBadgeProps {
  status: string;
  type?: 'order' | 'dispatch' | 'payment' | 'settlement';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'order' }) => {
  const getStatusConfig = () => {
    const configs: Record<string, { label: string; color: string }> = {
      // Order status
      pending: { label: '대기', color: 'bg-yellow-100 text-yellow-700' },
      confirmed: { label: '확인', color: 'bg-blue-100 text-blue-700' },
      preparing: { label: '준비중', color: 'bg-purple-100 text-purple-700' },
      shipped: { label: '출고', color: 'bg-indigo-100 text-indigo-700' },
      in_transit: { label: '배송중', color: 'bg-blue-100 text-blue-700' },
      out_for_delivery: { label: '배송출발', color: 'bg-cyan-100 text-cyan-700' },
      delivered: { label: '완료', color: 'bg-green-100 text-green-700' },
      cancelled: { label: '취소', color: 'bg-red-100 text-red-700' },
      failed: { label: '실패', color: 'bg-red-100 text-red-700' },
      returned: { label: '반품', color: 'bg-gray-100 text-gray-700' },
      // Payment status
      awaiting_payment: { label: '결제대기', color: 'bg-orange-100 text-orange-700' },
      paid: { label: '결제완료', color: 'bg-green-100 text-green-700' },
      refunded: { label: '환불', color: 'bg-gray-100 text-gray-700' },
      // Settlement status
      open: { label: '진행중', color: 'bg-blue-100 text-blue-700' },
      closed: { label: '마감', color: 'bg-gray-100 text-gray-700' },
      pending_payment: { label: '결제대기', color: 'bg-orange-100 text-orange-700' },
      disputed: { label: '분쟁', color: 'bg-red-100 text-red-700' },
    };

    return configs[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  };

  const config = getStatusConfig();

  return (
    <span className={`text-xs px-2 py-1 rounded font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

// ===== Temperature Badge =====
export interface TemperatureBadgeProps {
  control: 'none' | 'refrigerated' | 'frozen' | 'controlled';
}

export const TemperatureBadge: React.FC<TemperatureBadgeProps> = ({ control }) => {
  const configs = {
    none: { icon: '📦', label: '상온', color: 'bg-gray-100 text-gray-700' },
    refrigerated: { icon: '❄️', label: '냉장', color: 'bg-blue-100 text-blue-700' },
    frozen: { icon: '🧊', label: '냉동', color: 'bg-cyan-100 text-cyan-700' },
    controlled: { icon: '🌡️', label: '온도관리', color: 'bg-yellow-100 text-yellow-700' },
  };

  const config = configs[control] || configs.none;

  return (
    <span className={`text-xs px-2 py-1 rounded font-medium ${config.color} inline-flex items-center gap-1`}>
      {config.icon} {config.label}
    </span>
  );
};

// ===== Narcotics Badge =====
export const NarcoticsBadge: React.FC = () => (
  <span className="text-xs px-2 py-1 rounded font-medium bg-red-100 text-red-700 inline-flex items-center gap-1">
    ⚠️ 마약류
  </span>
);

// ===== Loading Spinner =====
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex items-center justify-center h-64">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizes[size]}`} />
    </div>
  );
};

// ===== Empty State =====
export interface EmptyStateProps {
  message: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, icon = '📭', action }) => (
  <div className="text-center py-12">
    <span className="text-4xl mb-4 block">{icon}</span>
    <p className="text-gray-500 mb-4">{message}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        {action.label}
      </button>
    )}
  </div>
);

// ===== Price Display =====
export interface PriceDisplayProps {
  amount: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'primary' | 'success' | 'danger';
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  amount,
  currency = 'KRW',
  size = 'md',
  color = 'default',
}) => {
  const formatted = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

  const sizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const colors = {
    default: 'text-gray-900',
    primary: 'text-blue-600',
    success: 'text-green-600',
    danger: 'text-red-600',
  };

  return (
    <span className={`font-bold ${sizes[size]} ${colors[color]}`}>
      {formatted}
    </span>
  );
};

// ===== Supplier Price Comparison Table =====
export interface SupplierOffer {
  supplierId: string;
  supplierName: string;
  supplierType: 'wholesaler' | 'manufacturer';
  price: number;
  stock: number;
  leadTime: number;
  hasColdChain: boolean;
  isPreferred?: boolean;
}

export interface PriceComparisonTableProps {
  offers: SupplierOffer[];
  onSelect: (offer: SupplierOffer) => void;
}

export const PriceComparisonTable: React.FC<PriceComparisonTableProps> = ({
  offers,
  onSelect,
}) => {
  // Sort by price (lowest first)
  const sortedOffers = [...offers].sort((a, b) => a.price - b.price);
  const lowestPrice = sortedOffers[0]?.price || 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">공급자</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">공급가</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">재고</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">리드타임</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">콜드체인</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">선택</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sortedOffers.map((offer, index) => (
            <tr
              key={offer.supplierId}
              className={`hover:bg-gray-50 ${offer.isPreferred ? 'bg-yellow-50' : ''}`}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {offer.isPreferred && <span title="선호 공급자">⭐</span>}
                  <div>
                    <p className="font-medium">{offer.supplierName}</p>
                    <p className="text-xs text-gray-500">
                      {offer.supplierType === 'wholesaler' ? '도매상' : '제조사'}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className={`font-bold ${index === 0 ? 'text-green-600' : ''}`}>
                    {formatCurrency(offer.price)}
                  </span>
                  {index === 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-1 rounded">최저가</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={offer.stock > 100 ? 'text-green-600' : offer.stock > 0 ? 'text-yellow-600' : 'text-red-600'}>
                  {offer.stock > 0 ? `${offer.stock}개` : '품절'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                {offer.leadTime}일
              </td>
              <td className="px-4 py-3 text-center">
                {offer.hasColdChain ? (
                  <span className="text-blue-600">❄️</span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onSelect(offer)}
                  disabled={offer.stock === 0}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  선택
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ===== Reorder Button =====
export interface ReorderButtonProps {
  orderId: string;
  productName: string;
  onReorder: (orderId: string) => void;
  loading?: boolean;
}

export const ReorderButton: React.FC<ReorderButtonProps> = ({
  orderId,
  productName,
  onReorder,
  loading = false,
}) => (
  <button
    onClick={() => onReorder(orderId)}
    disabled={loading}
    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
    title={`${productName} 다시 주문`}
  >
    {loading ? (
      <span className="animate-spin">⏳</span>
    ) : (
      <span>🔄</span>
    )}
    다시 주문
  </button>
);

// ===== Dispatch Timeline =====
export interface TimelineEvent {
  timestamp: Date;
  status: string;
  location?: string;
  description?: string;
}

export interface DispatchTimelineProps {
  events: TimelineEvent[];
}

export const DispatchTimeline: React.FC<DispatchTimelineProps> = ({ events }) => {
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
      <ul className="space-y-4">
        {events.map((event, index) => (
          <li key={index} className="relative pl-10">
            <div className={`absolute left-2 w-4 h-4 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            <div className="bg-white p-3 rounded-lg border">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{event.status}</span>
                <span className="text-xs text-gray-500">{formatDate(event.timestamp)}</span>
              </div>
              {event.location && (
                <p className="text-xs text-gray-600">📍 {event.location}</p>
              )}
              {event.description && (
                <p className="text-xs text-gray-500 mt-1">{event.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
