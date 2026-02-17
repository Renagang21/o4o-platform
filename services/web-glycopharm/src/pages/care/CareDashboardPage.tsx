/**
 * CareDashboardPage - Care 중심 대시보드
 *
 * WO-MENU-REALIGN-V1 Phase 1
 *
 * 약국 주인(pharmacy)이 로그인 후 가장 먼저 보는 화면.
 * Care 모듈(GlucoseView)의 핵심 지표를 요약하여 표시.
 *
 * 구조:
 * 1. Care 요약 카드 (환자 현황)
 * 2. 위험도별 환자 분포
 * 3. 빠른 액션 (환자관리, 매장허브 이동)
 */

import { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  MessageCircle,
  Activity,
  ArrowRight,
  Loader2,
  Store,
  Heart,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { pharmacyApi, type CareDashboardSummary } from '@/api/pharmacy';

export default function CareDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<CareDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await pharmacyApi.getCareDashboardSummary();
      setData(res);
    } catch (err: any) {
      console.error('Care dashboard load error:', err);
      // API 없는 경우 fallback 데이터 사용
      setData({
        totalPatients: 0,
        highRiskCount: 0,
        moderateRiskCount: 0,
        lowRiskCount: 0,
        recentCoachingCount: 0,
        improvingCount: 0,
      });
      setError('Care 데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  const stats = data || {
    totalPatients: 0,
    highRiskCount: 0,
    moderateRiskCount: 0,
    lowRiskCount: 0,
    recentCoachingCount: 0,
    improvingCount: 0,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                안녕하세요, {user?.name || '약사'}님
              </h1>
              <p className="text-primary-100">
                오늘도 환자분들의 건강을 돌봐주셔서 감사합니다
              </p>
            </div>
            <button
              onClick={() => fetchData()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              title="새로고침"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">{error}</p>
          </div>
        )}

        {/* Care Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <span className="text-sm text-slate-500">전체 환자</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats.totalPatients}</p>
            <p className="text-xs text-slate-400 mt-1">등록된 관리 환자</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-sm text-slate-500">고위험</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.highRiskCount}</p>
            <p className="text-xs text-slate-400 mt-1">즉시 관리 필요</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm text-slate-500">주의 필요</span>
            </div>
            <p className="text-3xl font-bold text-amber-600">{stats.moderateRiskCount}</p>
            <p className="text-xs text-slate-400 mt-1">정기 모니터링</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-slate-500">양호</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.lowRiskCount}</p>
            <p className="text-xs text-slate-400 mt-1">안정적인 관리</p>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className="w-5 h-5 text-violet-600" />
              <h3 className="font-semibold text-slate-800">최근 상담</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-slate-800">{stats.recentCoachingCount}</p>
                <p className="text-sm text-slate-500">지난 7일간 상담 세션</p>
              </div>
              <NavLink
                to="/patients"
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                상세보기 <ArrowRight className="w-4 h-4" />
              </NavLink>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-800">개선 중</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-slate-800">{stats.improvingCount}</p>
                <p className="text-sm text-slate-500">혈당 조절 개선 환자</p>
              </div>
              <NavLink
                to="/patients"
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                상세보기 <ArrowRight className="w-4 h-4" />
              </NavLink>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4">빠른 이동</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <NavLink
              to="/patients"
              className="group p-4 bg-slate-50 rounded-xl hover:bg-primary-50 transition-colors text-center"
            >
              <Users className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-primary-700">환자 관리</span>
            </NavLink>

            <NavLink
              to="/store"
              className="group p-4 bg-slate-50 rounded-xl hover:bg-primary-50 transition-colors text-center"
            >
              <Store className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-primary-700">매장 허브</span>
            </NavLink>

            <NavLink
              to="/store/products"
              className="group p-4 bg-slate-50 rounded-xl hover:bg-primary-50 transition-colors text-center"
            >
              <Activity className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-primary-700">상품 관리</span>
            </NavLink>

            <NavLink
              to="/mypage"
              className="group p-4 bg-slate-50 rounded-xl hover:bg-primary-50 transition-colors text-center"
            >
              <Heart className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-primary-700">내 정보</span>
            </NavLink>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-primary-50 to-violet-50 border border-primary-100 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">GlycoPharm Care</h3>
              <p className="text-sm text-slate-600">
                환자 혈당 관리 전문 약국으로서 지속적인 케어를 제공하세요.
                고위험 환자를 우선으로 관리하고, 정기적인 상담을 통해 건강 개선을 도와주세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
