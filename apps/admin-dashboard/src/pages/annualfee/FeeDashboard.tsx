/**
 * FeeDashboard
 *
 * 회비 관리 대시보드
 *
 * Guarded by AppGuard to prevent API calls when app is not installed.
 */

import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { AppGuard } from '@/components/common/AppGuard';

interface FeeStats {
  totalInvoices: number;
  totalAmount: number;
  paidCount: number;
  paidAmount: number;
  unpaidCount: number;
  unpaidAmount: number;
  overdueCount: number;
  exemptedCount: number;
  collectionRate: number;
}

interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  byMonth: Array<{ month: number; count: number; amount: number }>;
}

function FeeDashboardContent() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [invoiceStats, setInvoiceStats] = useState<FeeStats | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [year]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [invoiceRes, paymentRes] = await Promise.all([
        authClient.api.get(`/api/annualfee/invoices/statistics?year=${year}`),
        authClient.api.get(`/api/annualfee/payments/statistics?year=${year}`),
      ]);

      if (invoiceRes.data?.success) {
        setInvoiceStats(invoiceRes.data.data);
      }
      if (paymentRes.data?.success) {
        setPaymentStats(paymentRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">회비 대시보드</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">연도:</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="border rounded px-3 py-2"
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        </div>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">총 청구액</h3>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(invoiceStats?.totalAmount || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {invoiceStats?.totalInvoices || 0}건
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">납부 완료</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(invoiceStats?.paidAmount || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {invoiceStats?.paidCount || 0}건
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">미납</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(invoiceStats?.unpaidAmount || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {invoiceStats?.unpaidCount || 0}건 (연체: {invoiceStats?.overdueCount || 0}건)
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">수금율</h3>
          <p className="text-2xl font-bold text-blue-600">
            {invoiceStats?.collectionRate?.toFixed(1) || 0}%
          </p>
          <p className="text-sm text-gray-500 mt-1">
            면제: {invoiceStats?.exemptedCount || 0}건
          </p>
        </div>
      </div>

      {/* 수금율 프로그레스 바 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">수금 현황</h3>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all duration-500"
            style={{ width: `${invoiceStats?.collectionRate || 0}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>납부 완료: {invoiceStats?.paidCount || 0}건</span>
          <span>목표: {invoiceStats?.totalInvoices || 0}건</span>
        </div>
      </div>

      {/* 월별 납부 현황 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">월별 납부 현황</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">월</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">납부 건수</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">납부 금액</th>
              </tr>
            </thead>
            <tbody>
              {paymentStats?.byMonth?.map((row) => (
                <tr key={row.month} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{row.month}월</td>
                  <td className="px-4 py-3 text-right">{row.count}건</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(row.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold bg-gray-50">
                <td className="px-4 py-3">합계</td>
                <td className="px-4 py-3 text-right">{paymentStats?.totalPayments || 0}건</td>
                <td className="px-4 py-3 text-right">{formatCurrency(paymentStats?.totalAmount || 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapped export with AppGuard
 * Only renders dashboard content if annualfee-yaksa app is installed
 */
export default function FeeDashboard() {
  return (
    <AppGuard appId="annualfee-yaksa" appName="연회비 관리">
      <FeeDashboardContent />
    </AppGuard>
  );
}
