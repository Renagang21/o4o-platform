/**
 * GlucoseView Dashboard Page
 *
 * Phase C-4: 대시보드 (읽기 전용)
 * enabledServices 기반으로 CGM View 노출
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { GlucoseViewPharmacy } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const [pharmacy, setPharmacy] = useState<GlucoseViewPharmacy | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadPharmacy();
    }
  }, [isAuthenticated]);

  const loadPharmacy = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getMyPharmacy();
      setPharmacy(response.pharmacy);
      setMessage(response.message || null);
      if (response.application) {
        setApplicationStatus(response.application.status);
      }
    } catch (err: any) {
      if (err.message?.includes('PHARMACY_NOT_FOUND') || err.message?.includes('404')) {
        setError('등록된 약국이 없습니다. 서비스를 신청해주세요.');
      } else {
        setError(err.message || '정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">대시보드를 이용하려면 로그인해주세요.</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">불러오는 중...</p>
        </div>
      </div>
    );
  }

  // No pharmacy - redirect to apply
  if (error || !pharmacy) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {applicationStatus === 'submitted' ? '신청 심사 중' : '서비스 신청 필요'}
          </h2>
          <p className="text-gray-600 mb-6">
            {applicationStatus === 'submitted'
              ? '신청이 심사 중입니다. 승인 후 대시보드를 이용할 수 있습니다.'
              : message || 'GlucoseView 서비스를 신청해주세요.'}
          </p>
          <div className="space-y-3">
            {applicationStatus !== 'submitted' && (
              <Link
                to="/apply"
                className="block w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                서비스 신청하기
              </Link>
            )}
            <Link
              to="/apply/my-applications"
              className="block w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              내 신청 현황 보기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Has pharmacy - show dashboard
  const hasCgmView = pharmacy.enabledServices?.includes('cgm_view');

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{pharmacy.name}</h1>
              <p className="text-gray-500">GlucoseView 대시보드</p>
            </div>
            <div className="ml-auto">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                pharmacy.status === 'active'
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {pharmacy.status === 'active' ? '활성' : pharmacy.status}
              </span>
            </div>
          </div>
        </div>

        {/* Pharmacy Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">약국 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">약국명</p>
              <p className="font-medium text-gray-800">{pharmacy.name}</p>
            </div>
            {pharmacy.businessNumber && (
              <div>
                <p className="text-sm text-gray-500">사업자번호</p>
                <p className="font-medium text-gray-800">{pharmacy.businessNumber}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">등록일</p>
              <p className="font-medium text-gray-800">
                {new Date(pharmacy.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
        </div>

        {/* Enabled Services */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">활성화된 서비스</h2>
          <div className="space-y-3">
            {hasCgmView ? (
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">CGM View</h3>
                  <p className="text-sm text-slate-600">연속혈당측정(CGM) 데이터 조회 서비스</p>
                </div>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full">
                  활성
                </span>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>활성화된 서비스가 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        {hasCgmView && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">빠른 접근</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Link
                to="/patients"
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">환자 목록</span>
              </Link>
              <Link
                to="/insights"
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">인사이트</span>
              </Link>
              <Link
                to="/settings"
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">설정</span>
              </Link>
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
