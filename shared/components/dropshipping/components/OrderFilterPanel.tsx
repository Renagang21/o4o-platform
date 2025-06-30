import React, { useState, useEffect } from 'react';
import { X, Calendar, Filter, RotateCcw } from 'lucide-react';
import { OrderStatus, getStatusText, getStatusColor } from '../types/order';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from '../ui/Modal';
import { useOrderFilters } from '../context/OrderContext';

interface OrderFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderFilterPanel: React.FC<OrderFilterPanelProps> = ({
  isOpen,
  onClose
}) => {
  const { filters, applyFilters, clearFilters } = useOrderFilters();
  
  // Local state for form inputs
  const [localFilters, setLocalFilters] = useState({
    status: filters.status,
    dateRange: filters.dateRange,
    sellerId: filters.sellerId || '',
    partnerId: filters.partnerId || ''
  });

  // Update local state when filters change
  useEffect(() => {
    setLocalFilters({
      status: filters.status,
      dateRange: filters.dateRange,
      sellerId: filters.sellerId || '',
      partnerId: filters.partnerId || ''
    });
  }, [filters]);

  const statusOptions: { value: OrderStatus; label: string; color: string }[] = [
    { value: 'new', label: getStatusText('new'), color: getStatusColor('new') },
    { value: 'processing', label: getStatusText('processing'), color: getStatusColor('processing') },
    { value: 'shipping', label: getStatusText('shipping'), color: getStatusColor('shipping') },
    { value: 'delivered', label: getStatusText('delivered'), color: getStatusColor('delivered') },
    { value: 'cancelled', label: getStatusText('cancelled'), color: getStatusColor('cancelled') }
  ];

  // Sample sellers and partners for filtering
  const sellers = [
    { id: 'SELL001', name: '스마트몰' },
    { id: 'SELL002', name: '액세서리마트' },
    { id: 'SELL003', name: '게이밍스토어' }
  ];

  const partners = [
    { id: 'PART001', name: '마케팅파트너' },
    { id: 'PART002', name: '블로그파트너' },
    { id: 'PART003', name: 'SNS파트너' }
  ];

  const handleStatusChange = (status: OrderStatus, checked: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      status: checked 
        ? [...prev.status, status]
        : prev.status.filter(s => s !== status)
    }));
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }));
  };

  const handleSellerChange = (sellerId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      sellerId
    }));
  };

  const handlePartnerChange = (partnerId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      partnerId
    }));
  };

  const handleApply = () => {
    applyFilters({
      status: localFilters.status,
      dateRange: localFilters.dateRange,
      sellerId: localFilters.sellerId || undefined,
      partnerId: localFilters.partnerId || undefined
    });
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({
      status: [],
      dateRange: { start: '', end: '' },
      sellerId: '',
      partnerId: ''
    });
    clearFilters();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.status.length > 0) count++;
    if (localFilters.dateRange.start || localFilters.dateRange.end) count++;
    if (localFilters.sellerId) count++;
    if (localFilters.partnerId) count++;
    return count;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="주문 필터"
    >
      <ModalHeader>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Filter className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">주문 필터</h3>
            <p className="text-sm text-gray-500">원하는 조건으로 주문을 필터링하세요</p>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-6">
          {/* Order Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              주문 상태
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.status.includes(option.value)}
                    onChange={(e) => handleStatusChange(option.value, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-${option.color}-500`}></div>
                    <span className="text-sm font-medium text-gray-900">
                      {option.label}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              주문 기간
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-2">시작일</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={localFilters.dateRange.start}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">종료일</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={localFilters.dateRange.end}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seller Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              판매자
            </label>
            <select
              value={localFilters.sellerId}
              onChange={(e) => handleSellerChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">모든 판매자</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
          </div>

          {/* Partner Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              파트너
            </label>
            <select
              value={localFilters.partnerId}
              onChange={(e) => handlePartnerChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">모든 파트너</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filter Summary */}
          {getActiveFilterCount() > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {getActiveFilterCount()}개의 필터가 적용됩니다
                </span>
              </div>
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <ModalButton 
          variant="secondary" 
          onClick={handleReset}
          disabled={getActiveFilterCount() === 0}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          초기화
        </ModalButton>
        <ModalButton 
          variant="primary"
          onClick={handleApply}
        >
          필터 적용
        </ModalButton>
      </ModalFooter>
    </Modal>
  );
};