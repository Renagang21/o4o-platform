import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePartnerStore } from '../../store/partnerStore';

const PartnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    partner, 
    stats, 
    loading, 
    error, 
    getPartnerProfile, 
    getPartnerStats,
    clearError 
  } = usePartnerStore();

  useEffect(() => {
    // URL에서 partnerCode 추출 또는 로컬 스토리지에서 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const partnerCode = urlParams.get('code') || partner?.partnerCode;
    
    if (!partnerCode) {
      navigate('/partner/apply');
      return;
    }

    // 파트너 정보와 통계 로드
    getPartnerProfile(partnerCode);
    getPartnerStats();
  }, []);

  // 에러 처리
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (loading.profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-8 bg-white rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">파트너 정보를 찾을 수 없습니다</h2>
        <p className="text-gray-600 mb-6">
          유효하지 않은 파트너 코드이거나 아직 승인되지 않은 신청입니다.
        </p>
        <Link
          to="/partner/apply"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          파트너 신청하기
        </Link>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">파트너 대시보드</h1>
              <p className="text-gray-600">안녕하세요, {partner.name}님!</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                partner.status === 'approved' ? 'bg-green-100 text-green-800' :
                partner.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                partner.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {partner.status === 'approved' ? '승인됨' :
                 partner.status === 'pending' ? '승인 대기' :
                 partner.status === 'rejected' ? '거절됨' :
                 '일시정지'}
              </span>
              <div className="text-sm text-gray-500">
                파트너 코드: <span className="font-mono font-medium">{partner.partnerCode}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 승인 대기 상태 안내 */}
        {partner.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex">
              <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-yellow-800">승인 대기 중</h3>
                <p className="text-yellow-700 mt-1">
                  파트너 신청이 검토 중입니다. 승인 완료 후 모든 기능을 사용하실 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}
        {/* 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 총 수익 카드 제거 - 오프라인 처리 */}

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 추천</p>
                <p className="text-2xl font-bold text-gray-900">
                  {partner.totalReferrals || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">수수료율</p>
                <p className="text-2xl font-bold text-gray-900">
                  {partner.commissionRate}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">전환율</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats ? `${stats.conversionRate.toFixed(1)}%` : '0%'}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* 빠른 액션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">빠른 액션</h3>
            <div className="space-y-3">
              <Link
                to="/partner/links"
                className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                <svg className="h-5 w-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">추천 링크 생성</p>
                  <p className="text-sm text-gray-600">새로운 제품 추천 링크 만들기</p>
                </div>
              </Link>
              
              <Link
                to="/partner/stats"
                className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition"
              >
                <svg className="h-5 w-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">상세 통계 보기</p>
                  <p className="text-sm text-gray-600">성과 분석 및 리포트</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">파트너 정보</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">이메일</span>
                <span className="font-medium">{partner.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">전화번호</span>
                <span className="font-medium">{partner.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">가입일</span>
                <span className="font-medium">
                  {new Date(partner.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
              {partner.description && (
                <div>
                  <span className="text-gray-600 block mb-1">소개</span>
                  <p className="text-sm text-gray-800">{partner.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 최근 활동 (승인된 파트너만) */}
        {partner.status === 'approved' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">최근 활동</h3>
              <Link 
                to="/partner/stats"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                전체 보기 →
              </Link>
            </div>
            
            {loading.stats ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : stats?.dailyStats?.length ? (
              <div className="space-y-3">
                {stats.dailyStats.slice(0, 5).map((day, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                    <div>
                      <p className="font-medium">{day.date}</p>
                      <p className="text-sm text-gray-600">클릭 {day.clicks}회 • 전환 {day.conversions}회</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-blue-600">성과 달성</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">아직 활동 내역이 없습니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerDashboard;