import React, { useState, useEffect } from 'react';
import { 
  Package, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign,
  Truck,
  Edit,
  Save,
  X,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { Order, OrderStatus, OrderFormData, getStatusText, getStatusColor, shippingCompanies } from '../types/order';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';
import { useOrders } from '../context/OrderContext';
import { useSuccessToast, useErrorToast } from '../ui/ToastNotification';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  const { updateOrder } = useOrders();
  const showSuccess = useSuccessToast();
  const showError = useErrorToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<OrderFormData>({
    status: 'new',
    shippingCompany: undefined,
    trackingNumber: '',
    adminMemo: ''
  });

  useEffect(() => {
    if (order) {
      setEditData({
        status: order.status,
        shippingCompany: order.shippingCompany,
        trackingNumber: order.trackingNumber || '',
        adminMemo: order.adminMemo || ''
      });
    }
  }, [order]);

  if (!order) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getShippingCompanyName = (companyId?: string) => {
    if (!companyId) return '';
    const company = shippingCompanies.find(c => c.id === companyId);
    return company ? company.name : companyId;
  };

  const getTrackingUrl = (companyId?: string, trackingNumber?: string) => {
    if (!companyId || !trackingNumber) return '';
    const company = shippingCompanies.find(c => c.id === companyId);
    return company ? `${company.trackingUrl}?tracking=${trackingNumber}` : '';
  };

  const statusOptions: { value: OrderStatus; label: string; color: string }[] = [
    { value: 'new', label: getStatusText('new'), color: getStatusColor('new') },
    { value: 'processing', label: getStatusText('processing'), color: getStatusColor('processing') },
    { value: 'shipping', label: getStatusText('shipping'), color: getStatusColor('shipping') },
    { value: 'delivered', label: getStatusText('delivered'), color: getStatusColor('delivered') },
    { value: 'cancelled', label: getStatusText('cancelled'), color: getStatusColor('cancelled') }
  ];

  const handleSave = async () => {
    try {
      await updateOrder(order.id, {
        status: editData.status,
        shippingCompany: editData.shippingCompany,
        trackingNumber: editData.trackingNumber || undefined,
        adminMemo: editData.adminMemo || undefined,
        ...(editData.status === 'shipping' && editData.trackingNumber && {
          shippedAt: new Date().toISOString()
        }),
        ...(editData.status === 'delivered' && {
          deliveredAt: new Date().toISOString()
        })
      });
      setIsEditing(false);
      showSuccess('주문 업데이트', '주문 정보가 성공적으로 업데이트되었습니다.');
    } catch (error) {
      showError('업데이트 실패', '주문 정보 업데이트 중 오류가 발생했습니다.');
    }
  };

  const handleCancel = () => {
    setEditData({
      status: order.status,
      shippingCompany: order.shippingCompany,
      trackingNumber: order.trackingNumber || '',
      adminMemo: order.adminMemo || ''
    });
    setIsEditing(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="주문 상세 정보"
    >
      <ModalHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{order.orderNumber}</h3>
            <div className="flex items-center gap-3 mb-3">
              <StatusBadge status={getStatusText(order.status)} size="sm" />
              <span className="text-sm text-gray-500">
                주문일시: {formatDate(order.createdAt)}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              총 주문금액: <span className="text-lg font-bold text-gray-900">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-6">
          {/* Order Status Management */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900">주문 처리 상태</h4>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  수정
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                {/* Status Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    주문 상태
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as OrderStatus })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shipping Information */}
                {(editData.status === 'processing' || editData.status === 'shipping' || editData.status === 'delivered') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        택배사
                      </label>
                      <select
                        value={editData.shippingCompany || ''}
                        onChange={(e) => setEditData({ ...editData, shippingCompany: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">택배사 선택</option>
                        {shippingCompanies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        송장번호
                      </label>
                      <input
                        type="text"
                        value={editData.trackingNumber}
                        onChange={(e) => setEditData({ ...editData, trackingNumber: e.target.value })}
                        placeholder="송장번호를 입력하세요"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                {/* Admin Memo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    관리자 메모
                  </label>
                  <textarea
                    value={editData.adminMemo}
                    onChange={(e) => setEditData({ ...editData, adminMemo: e.target.value })}
                    placeholder="관리자 메모를 입력하세요"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Edit Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    저장
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">현재 상태:</span>
                  <StatusBadge status={getStatusText(order.status)} size="sm" />
                </div>
                
                {order.shippingCompany && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">택배사:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {getShippingCompanyName(order.shippingCompany)}
                    </span>
                  </div>
                )}

                {order.trackingNumber && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">송장번호:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {order.trackingNumber}
                    </span>
                    {getTrackingUrl(order.shippingCompany, order.trackingNumber) && (
                      <a
                        href={getTrackingUrl(order.shippingCompany, order.trackingNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                        배송 조회
                      </a>
                    )}
                  </div>
                )}

                {order.adminMemo && (
                  <div>
                    <span className="text-sm text-gray-600">관리자 메모:</span>
                    <p className="text-sm text-gray-900 mt-1 p-2 bg-yellow-50 rounded border border-yellow-200">
                      {order.adminMemo}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-blue-500" />
              <h4 className="text-sm font-semibold text-gray-900">상품 정보</h4>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                {order.productImage ? (
                  <img
                    src={order.productImage}
                    alt={order.productName}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                ) : (
                  <Package className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-900">{order.productName}</div>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-gray-600">수량:</span>
                    <span className="font-medium text-gray-900 ml-2">{order.quantity}개</span>
                  </div>
                  <div>
                    <span className="text-gray-600">단가:</span>
                    <span className="font-medium text-gray-900 ml-2">{formatCurrency(order.unitPrice)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">총액:</span>
                    <span className="font-medium text-gray-900 ml-2">{formatCurrency(order.totalAmount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">마진:</span>
                    <span className="font-medium text-green-600 ml-2">{formatCurrency(order.margin)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-green-500" />
                <h4 className="text-sm font-semibold text-gray-900">고객 정보</h4>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">주문자</span>
                  <span className="text-sm font-medium text-gray-900">{order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">연락처</span>
                  <span className="text-sm font-medium text-gray-900">{order.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">이메일</span>
                  <span className="text-sm font-medium text-gray-900">{order.customerEmail}</span>
                </div>
              </div>
            </div>

            {/* Shipping Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-purple-500" />
                <h4 className="text-sm font-semibold text-gray-900">배송 정보</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">수령인</span>
                  <div className="text-sm font-medium text-gray-900 mt-1">{order.recipientName}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">연락처</span>
                  <div className="text-sm font-medium text-gray-900 mt-1">{order.recipientPhone}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">배송지</span>
                  <div className="text-sm text-gray-900 mt-1">
                    <div>[{order.shippingAddress.zipCode}]</div>
                    <div>{order.shippingAddress.address}</div>
                    <div>{order.shippingAddress.detailAddress}</div>
                  </div>
                </div>
                {order.shippingMemo && (
                  <div>
                    <span className="text-sm text-gray-600">배송 메모</span>
                    <div className="text-sm text-gray-900 mt-1 p-2 bg-blue-50 rounded border border-blue-200">
                      {order.shippingMemo}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seller and Partner Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Seller Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-yellow-500" />
                <h4 className="text-sm font-semibold text-gray-900">판매자 정보</h4>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">판매자명</span>
                  <span className="text-sm font-medium text-gray-900">{order.sellerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">판매자 마진</span>
                  <span className="text-sm font-medium text-green-600">{formatCurrency(order.sellerMargin)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">공급가</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(order.supplierPrice)}</span>
                </div>
              </div>
            </div>

            {/* Partner Info */}
            {order.partnerId && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-orange-500" />
                  <h4 className="text-sm font-semibold text-gray-900">파트너 정보</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">파트너명</span>
                    <span className="text-sm font-medium text-gray-900">{order.partnerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">커미션</span>
                    <span className="text-sm font-medium text-orange-600">{formatCurrency(order.partnerCommission || 0)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Special Request */}
          {order.specialRequest && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                <h4 className="text-sm font-semibold text-amber-900">특별 요청사항</h4>
              </div>
              <p className="text-sm text-amber-800">{order.specialRequest}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-900">주문 처리 이력</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="text-sm">
                  <span className="font-medium text-gray-900">주문 생성</span>
                  <span className="text-gray-500 ml-2">{formatDate(order.createdAt)}</span>
                </div>
              </div>
              
              {order.shippedAt && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-900">배송 시작</span>
                    <span className="text-gray-500 ml-2">{formatDate(order.shippedAt)}</span>
                  </div>
                </div>
              )}
              
              {order.deliveredAt && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-900">배송 완료</span>
                    <span className="text-gray-500 ml-2">{formatDate(order.deliveredAt)}</span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <div className="text-sm">
                  <span className="font-medium text-gray-900">최종 수정</span>
                  <span className="text-gray-500 ml-2">{formatDate(order.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>주문: {formatDate(order.createdAt)}</span>
          </div>
          
          <div className="flex gap-2">
            <ModalButton variant="secondary" onClick={onClose}>
              닫기
            </ModalButton>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
};