/**
 * PharmacyDispatchListPage v2
 *
 * 약국 배송 목록 - 배송 상세 관리 기능 (Task 5)
 *
 * @package @o4o/pharmacyops
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LoadingSpinner,
  EmptyState,
  StatusBadge,
  TemperatureBadge,
  NarcoticsBadge,
  DispatchTimeline,
  type TimelineEvent,
} from '../components/index.js';
import type { PharmacyDispatchListItemDto } from '../../dto/index.js';

// Mock data
const mockDispatches: PharmacyDispatchListItemDto[] = [
  {
    id: 'dispatch-001',
    orderId: 'order-001',
    orderNumber: 'PO-2024-001234',
    dispatchNumber: 'DS-2024-001234',
    productName: '타이레놀 500mg',
    quantity: 100,
    status: 'in_transit',
    carrierName: 'CJ대한통운',
    trackingNumber: '123456789012',
    temperatureControl: 'none',
    requiresColdChain: false,
    isNarcotics: false,
    estimatedDeliveryAt: new Date(Date.now() + 86400000),
    dispatchedAt: new Date(Date.now() - 43200000),
    currentLocation: '서울 송파 HUB',
  },
  {
    id: 'dispatch-002',
    orderId: 'order-003',
    orderNumber: 'PO-2024-001232',
    dispatchNumber: 'DS-2024-001232',
    productName: '인슐린 노보래피드',
    quantity: 10,
    status: 'out_for_delivery',
    carrierName: '한진콜드',
    trackingNumber: '987654321098',
    temperatureControl: 'refrigerated',
    requiresColdChain: true,
    isNarcotics: false,
    estimatedDeliveryAt: new Date(Date.now() + 3600000 * 2),
    dispatchedAt: new Date(Date.now() - 86400000),
    currentLocation: '서울 강남구 배송차량',
    currentTemperature: 4.2,
  },
  {
    id: 'dispatch-003',
    orderId: 'order-006',
    orderNumber: 'PO-2024-001229',
    dispatchNumber: 'DS-2024-001229',
    productName: '모르핀황산염주사',
    quantity: 20,
    status: 'pending',
    carrierName: '의약품전문택배',
    trackingNumber: '',
    temperatureControl: 'controlled',
    requiresColdChain: false,
    isNarcotics: true,
    estimatedDeliveryAt: new Date(Date.now() + 86400000 * 2),
    dispatchedAt: undefined,
    currentLocation: '출고 대기',
    narcoticsVerificationRequired: true,
  },
  {
    id: 'dispatch-004',
    orderId: 'order-002',
    orderNumber: 'PO-2024-001233',
    dispatchNumber: 'DS-2024-001233',
    productName: '아목시실린캡슐 500mg',
    quantity: 200,
    status: 'delivered',
    carrierName: 'CJ대한통운',
    trackingNumber: '111222333444',
    temperatureControl: 'none',
    requiresColdChain: false,
    isNarcotics: false,
    estimatedDeliveryAt: new Date(Date.now() - 86400000),
    dispatchedAt: new Date(Date.now() - 86400000 * 2),
    deliveredAt: new Date(Date.now() - 86400000),
    currentLocation: '배송 완료',
    receiverName: '김약사',
    receiverSignature: true,
  },
];

// Mock timeline events for detail view
const mockTimelineEvents: Record<string, TimelineEvent[]> = {
  'dispatch-001': [
    { timestamp: new Date(Date.now() - 43200000), status: '배송 시작', location: '인천 물류센터', description: '출고 완료' },
    { timestamp: new Date(Date.now() - 21600000), status: '중간 경유', location: '서울 송파 HUB', description: '분류 작업 완료' },
  ],
  'dispatch-002': [
    { timestamp: new Date(Date.now() - 86400000), status: '배송 시작', location: '서울 냉장물류센터', description: '콜드체인 출고' },
    { timestamp: new Date(Date.now() - 43200000), status: '중간 경유', location: '서울 강남 HUB', description: '온도 유지 확인: 4.0°C' },
    { timestamp: new Date(Date.now() - 7200000), status: '배송 출발', location: '서울 강남구 배송차량', description: '배송 기사 배정 완료' },
  ],
  'dispatch-004': [
    { timestamp: new Date(Date.now() - 86400000 * 2), status: '배송 시작', location: '대전 물류센터', description: '출고 완료' },
    { timestamp: new Date(Date.now() - 86400000 * 1.5), status: '중간 경유', location: '서울 용산 HUB', description: '분류 작업 완료' },
    { timestamp: new Date(Date.now() - 86400000), status: '배송 완료', location: '건강약국', description: '수령인: 김약사 (서명 확인)' },
  ],
};

interface DispatchFilters {
  status: string;
  temperatureControl: string;
  isNarcotics: boolean;
  dateRange: 'all' | 'today' | 'week' | 'month';
  trackingNumber: string;
}

export const PharmacyDispatchListPage: React.FC = () => {
  const [dispatches, setDispatches] = useState<PharmacyDispatchListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DispatchFilters>({
    status: '',
    temperatureControl: '',
    isNarcotics: false,
    dateRange: 'all',
    trackingNumber: '',
  });

  // Detail view
  const [selectedDispatch, setSelectedDispatch] = useState<PharmacyDispatchListItemDto | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadDispatches = useCallback(async () => {
    setLoading(true);
    // TODO: Replace with actual API call
    setTimeout(() => {
      let filtered = [...mockDispatches];

      // Apply status filter
      if (filters.status) {
        filtered = filtered.filter((d) => d.status === filters.status);
      }

      // Apply temperature control filter
      if (filters.temperatureControl) {
        filtered = filtered.filter(
          (d) => d.temperatureControl === filters.temperatureControl
        );
      }

      // Apply narcotics filter
      if (filters.isNarcotics) {
        filtered = filtered.filter((d) => d.isNarcotics);
      }

      // Apply tracking number search
      if (filters.trackingNumber) {
        filtered = filtered.filter((d) =>
          d.trackingNumber?.includes(filters.trackingNumber) ?? false
        );
      }

      // Sort by estimated delivery (soonest first for active, most recent for completed)
      filtered.sort((a, b) => {
        if (a.status === 'delivered' && b.status !== 'delivered') return 1;
        if (a.status !== 'delivered' && b.status === 'delivered') return -1;
        const aTime = a.estimatedDeliveryAt
          ? new Date(a.estimatedDeliveryAt).getTime()
          : 0;
        const bTime = b.estimatedDeliveryAt
          ? new Date(b.estimatedDeliveryAt).getTime()
          : 0;
        return aTime - bTime;
      });

      setDispatches(filtered);
      setLoading(false);
    }, 300);
  }, [filters]);

  useEffect(() => {
    loadDispatches();
  }, [loadDispatches]);

  // Parse URL params for orderId filter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) {
      const dispatch = mockDispatches.find((d) => d.orderId === orderId);
      if (dispatch) {
        setSelectedDispatch(dispatch);
        setShowDetail(true);
      }
    }
  }, []);

  const formatDate = (date: Date | null | undefined) =>
    date
      ? new Intl.DateTimeFormat('ko-KR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(date))
      : '-';

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'text-yellow-600',
      preparing: 'text-purple-600',
      shipped: 'text-indigo-600',
      in_transit: 'text-blue-600',
      out_for_delivery: 'text-cyan-600',
      delivered: 'text-green-600',
      failed: 'text-red-600',
    };
    return colors[status] || 'text-gray-600';
  };

  // Calculate summary stats
  const stats = {
    total: mockDispatches.length,
    inTransit: mockDispatches.filter((d) =>
      ['in_transit', 'out_for_delivery'].includes(d.status)
    ).length,
    todayDelivery: mockDispatches.filter((d) => {
      if (!d.estimatedDeliveryAt) return false;
      const today = new Date();
      const delivery = new Date(d.estimatedDeliveryAt);
      return (
        delivery.getDate() === today.getDate() &&
        delivery.getMonth() === today.getMonth() &&
        delivery.getFullYear() === today.getFullYear()
      );
    }).length,
    coldChain: mockDispatches.filter((d) => d.requiresColdChain).length,
    narcotics: mockDispatches.filter((d) => d.isNarcotics).length,
  };

  return (
    <div className="pharmacy-dispatch-list-page p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">배송 조회</h1>
        <p className="text-sm text-gray-500 mt-1">
          배송 현황을 확인하고 추적하세요
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">전체 배송</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-blue-50 border-blue-200 rounded-lg border p-4">
          <p className="text-sm text-blue-700">배송 중</p>
          <p className="text-2xl font-bold text-blue-700">{stats.inTransit}</p>
        </div>
        <div className="bg-green-50 border-green-200 rounded-lg border p-4">
          <p className="text-sm text-green-700">오늘 도착 예정</p>
          <p className="text-2xl font-bold text-green-700">{stats.todayDelivery}</p>
        </div>
        <div className="bg-cyan-50 border-cyan-200 rounded-lg border p-4">
          <p className="text-sm text-cyan-700">❄️ 콜드체인</p>
          <p className="text-2xl font-bold text-cyan-700">{stats.coldChain}</p>
        </div>
        <div className="bg-red-50 border-red-200 rounded-lg border p-4">
          <p className="text-sm text-red-700">⚠️ 마약류</p>
          <p className="text-2xl font-bold text-red-700">{stats.narcotics}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              배송 상태
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">전체</option>
              <option value="pending">대기</option>
              <option value="preparing">준비중</option>
              <option value="shipped">출고</option>
              <option value="in_transit">배송중</option>
              <option value="out_for_delivery">배송출발</option>
              <option value="delivered">완료</option>
              <option value="failed">실패</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              온도 관리
            </label>
            <select
              value={filters.temperatureControl}
              onChange={(e) =>
                setFilters((f) => ({ ...f, temperatureControl: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">전체</option>
              <option value="none">상온</option>
              <option value="refrigerated">냉장</option>
              <option value="frozen">냉동</option>
              <option value="controlled">온도관리</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              운송장 번호
            </label>
            <input
              type="text"
              value={filters.trackingNumber}
              onChange={(e) =>
                setFilters((f) => ({ ...f, trackingNumber: e.target.value }))
              }
              placeholder="운송장 번호 검색"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.isNarcotics}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, isNarcotics: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">⚠️ 마약류만</span>
            </label>
          </div>

          <div className="flex items-end">
            <button
              onClick={() =>
                setFilters({
                  status: '',
                  temperatureControl: '',
                  isNarcotics: false,
                  dateRange: 'all',
                  trackingNumber: '',
                })
              }
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && selectedDispatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">배송 상세</h2>
                <button
                  onClick={() => setShowDetail(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              {/* Dispatch Info */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <TemperatureBadge
                    control={selectedDispatch.temperatureControl as any}
                  />
                  {selectedDispatch.isNarcotics && <NarcoticsBadge />}
                  <StatusBadge status={selectedDispatch.status} type="dispatch" />
                </div>
                <h3 className="text-lg font-medium">{selectedDispatch.productName}</h3>
                <p className="text-sm text-gray-500">
                  주문번호: {selectedDispatch.orderNumber} · 수량: {selectedDispatch.quantity}개
                </p>
              </div>

              {/* Carrier Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">택배사</p>
                    <p className="font-medium">{selectedDispatch.carrierName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">운송장 번호</p>
                    <p className="font-medium font-mono">
                      {selectedDispatch.trackingNumber || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">현재 위치</p>
                    <p className="font-medium">{selectedDispatch.currentLocation}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">도착 예정</p>
                    <p className="font-medium">
                      {formatDate(selectedDispatch.estimatedDeliveryAt)}
                    </p>
                  </div>
                </div>
                {selectedDispatch.currentTemperature !== undefined && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500">현재 온도</p>
                    <p className="text-lg font-bold text-blue-600">
                      {selectedDispatch.currentTemperature}°C
                    </p>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div>
                <h4 className="font-medium mb-4">배송 이력</h4>
                <DispatchTimeline
                  events={mockTimelineEvents[selectedDispatch.id] || []}
                />
              </div>

              {/* Narcotics Warning */}
              {selectedDispatch.isNarcotics &&
                selectedDispatch.narcoticsVerificationRequired && (
                  <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700 font-medium">
                      ⚠️ 마약류 의약품 - 수령 시 본인확인 필수
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      약사 면허증 확인 및 서명이 필요합니다.
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : dispatches.length === 0 ? (
        <EmptyState message="배송 내역이 없습니다." icon="🚚" />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <span className="text-sm text-gray-600">
              총 <strong>{dispatches.length}</strong>건
            </span>
          </div>
          <div className="divide-y">
            {dispatches.map((dispatch) => (
              <div
                key={dispatch.id}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedDispatch(dispatch);
                  setShowDetail(true);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <TemperatureBadge
                        control={dispatch.temperatureControl as any}
                      />
                      {dispatch.isNarcotics && <NarcoticsBadge />}
                      <span className="text-sm font-mono text-gray-500">
                        {dispatch.dispatchNumber}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900">
                      {dispatch.productName}
                    </h3>
                    <div className="text-sm text-gray-500 mt-1">
                      <span>{dispatch.carrierName}</span>
                      {dispatch.trackingNumber && (
                        <>
                          <span className="mx-2">·</span>
                          <span className="font-mono">{dispatch.trackingNumber}</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      📍 {dispatch.currentLocation}
                      {dispatch.currentTemperature !== undefined && (
                        <span className="ml-2 text-blue-600">
                          🌡️ {dispatch.currentTemperature}°C
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <StatusBadge status={dispatch.status} type="dispatch" />
                    <p className="text-sm text-gray-500 mt-2">
                      {dispatch.status === 'delivered'
                        ? `완료: ${formatDate(dispatch.deliveredAt)}`
                        : `예정: ${formatDate(dispatch.estimatedDeliveryAt)}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyDispatchListPage;
