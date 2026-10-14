import { useState, useEffect, useCallback, useRef } from 'react';
import { supplierApi, type OrderSummaryResponse } from '../../../lib/api';
import type { UnifiedSupplierOrder } from '../../../lib/api/supplier';

export function useSupplierOrders() {
  const unifiedRequest = useRef(0);
  useEffect(() => () => {
    unifiedRequest.current += 1;
  }, []);
  const [data, setData] = useState<OrderSummaryResponse>({
    services: [],
    totalApprovedSellers: 0,
    totalPendingRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [unifiedError, setUnifiedError] = useState(false);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  // WO-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1: 통합 주문(읽기) 상태
  const [unifiedOrders, setUnifiedOrders] = useState<UnifiedSupplierOrder[]>(
    [],
  );
  const [unifiedLoading, setUnifiedLoading] = useState(true);
  const [unifiedTotal, setUnifiedTotal] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<
    'all' | 'neture' | 'checkout'
  >('all');

  // WO-O4O-NETURE-SUPPLIER-ORDER-INVENTORY-SETTLEMENT-LOAD-ERROR-CONTRACT-V1:
  //   두 조회는 실패 시 throw 한다. 요약과 통합 목록은 서로 독립 영역이므로 각각 오류 상태를 가진다.
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setSummaryError(false);
    try {
      setData(await supplierApi.getOrdersSummary());
    } catch {
      setData({
        services: [],
        totalApprovedSellers: 0,
        totalPendingRequests: 0,
      });
      setSummaryError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnified = useCallback(async () => {
    const request = ++unifiedRequest.current;
    setUnifiedLoading(true);
    setUnifiedError(false);
    try {
      const result = await supplierApi.getUnifiedOrders({
        page: 1,
        limit: 20,
        source: sourceFilter,
      });
      if (request !== unifiedRequest.current) return;
      setUnifiedOrders(result.data);
      setUnifiedTotal(result.meta.total);
    } catch {
      if (request !== unifiedRequest.current) return;
      setUnifiedOrders([]);
      setUnifiedTotal(0);
      setUnifiedError(true);
    } finally {
      if (request === unifiedRequest.current) setUnifiedLoading(false);
    }
  }, [sourceFilter]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);
  useEffect(() => {
    fetchUnified();
  }, [fetchUnified]);

  const toggleExpand = (serviceId: string) => {
    setExpandedService(expandedService === serviceId ? null : serviceId);
  };

  return {
    data,
    loading,
    summaryError,
    unifiedError,
    expandedService,
    unifiedOrders,
    unifiedLoading,
    unifiedTotal,
    sourceFilter,
    setSourceFilter,
    fetchSummary,
    fetchUnified,
    toggleExpand,
  };
}
