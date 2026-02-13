/**
 * GlycoPharmOperatorDashboard - Signal 기반 운영자 대시보드
 *
 * WO-GLYCOPHARM-OPERATOR-DASHBOARD-UX-V1
 * WO-OPERATOR-CORE-PHASE3-GLYCOPHARM: Core Shell + GlycoPharm Config 전환
 * WO-OPERATOR-AI-ACTION-LAYER-V1: AI 행동 제안 패널 추가
 *
 * 구조:
 *  [ Hero Summary ]     — 서비스 상태 배지 (3초 판단)
 *  [ Action Panel ]     — AI 행동 제안 (alert/warning 기반)
 *  [ Action Signals ]   — 행동 유도 카드 3장
 *  [ Status Feed ]      — 주요 운영 지표 5건 (children)
 *  [ Analytics Link ]   — 상세 분석 링크 (children)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  MessageSquare,
  Store,
  Package,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { OperatorLayout, generateOperatorActions } from '@o4o/operator-core';
import { glycopharmApi, type OperatorDashboardData } from '@/api/glycopharm';
import { buildGlycoPharmOperatorConfig } from './operatorConfig';

// ─── Status Feed (GlycoPharm 고유 — KPI 지표 목록) ───

interface StatusItem {
  id: string;
  icon: typeof Store;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}

function buildStatusFeed(data: OperatorDashboardData): StatusItem[] {
  return [
    {
      id: 'pharmacies',
      icon: Store,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      label: '활성 약국',
      value: `${data.serviceStatus.activePharmacies}개`,
    },
    {
      id: 'stores',
      icon: ShoppingBag,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      label: '운영 중 스토어',
      value: `${data.storeStatus.activeStores}개`,
    },
    {
      id: 'products',
      icon: Package,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-500',
      label: '등록 상품',
      value: `${data.productStats.total}개 (활성 ${data.productStats.active}개)`,
    },
    {
      id: 'orders',
      icon: FileText,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      label: '총 주문',
      value: `${data.orderStats.totalOrders}건`,
    },
    {
      id: 'forums',
      icon: MessageSquare,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-500',
      label: '포럼 게시물',
      value: `${data.forumStatus.totalPosts}개`,
    },
  ];
}

// ─── Main component ───

export default function GlycoPharmOperatorDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<OperatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await glycopharmApi.getOperatorDashboard();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch operator dashboard:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const config = buildGlycoPharmOperatorConfig(data);
  const feed = data ? buildStatusFeed(data) : [];
  const actions = useMemo(
    () => (config ? generateOperatorActions(config.signalCards) : []),
    [config],
  );

  return (
    <OperatorLayout
      config={config}
      loading={loading}
      error={error}
      onRefresh={fetchData}
      actions={actions}
      onActionNavigate={(route) => navigate(route)}
    >
      {/* Status Feed — GlycoPharm 고유 KPI 지표 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">주요 운영 지표</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-500">로딩 중...</div>
        ) : feed.length === 0 ? (
          <div className="text-center py-10">
            <AlertCircle size={40} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-400 text-sm">운영 데이터가 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {feed.map((item) => {
              const ItemIcon = item.icon;
              return (
                <div key={item.id} className="p-4 flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.iconBg}`}
                  >
                    <ItemIcon className={`w-4 h-4 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-600 flex-shrink-0">{item.value}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Link to detailed cockpit */}
      <div className="text-center">
        <Link
          to="/operator/analytics"
          className="text-sm text-slate-500 hover:text-primary-600 transition-colors"
        >
          상세 분석 보기 →
        </Link>
      </div>
    </OperatorLayout>
  );
}
