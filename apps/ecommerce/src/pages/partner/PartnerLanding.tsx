/**
 * Partner Landing Page
 *
 * 파트너 프로그램 소개 및 가입 유도
 * /partner, /business/partner 에서 동일하게 사용
 *
 * @package Phase K - Partner Flow
 */

import { useNavigate } from 'react-router-dom';
import { usePartner } from '../../hooks/usePartner';
import { authClient } from '@o4o/auth-client';

export function PartnerLanding() {
  const navigate = useNavigate();
  const { isPartner, isLoading } = usePartner();
  const user = authClient.getCurrentUser();

  const handleJoinClick = () => {
    if (!user) {
      // 로그인 필요
      navigate('/login?redirect=/partner/signup');
      return;
    }

    if (isPartner) {
      // 이미 파트너면 대시보드로
      navigate('/partner/dashboard');
      return;
    }

    // 가입 페이지로
    navigate('/partner/signup');
  };

  const handleDashboardClick = () => {
    navigate('/partner/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          파트너가 되어
          <br />
          <span className="text-blue-600">수익을 창출하세요</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          좋아하는 제품을 추천하고, 판매가 이루어질 때마다 커미션을 받으세요.
          SNS, 블로그, 유튜브 어디서든 시작할 수 있습니다.
        </p>

        {isLoading ? (
          <div className="inline-block px-8 py-4 bg-gray-200 rounded-lg animate-pulse">
            로딩 중...
          </div>
        ) : isPartner ? (
          <button
            onClick={handleDashboardClick}
            className="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            대시보드로 이동
          </button>
        ) : (
          <button
            onClick={handleJoinClick}
            className="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            {user ? '파트너 가입하기' : '로그인하고 시작하기'}
          </button>
        )}
      </section>

      {/* Benefits Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          파트너가 되면
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <BenefitCard
            icon="link"
            title="추천 링크 생성"
            description="제품, 카테고리, 캠페인별로 고유한 추천 링크를 생성하세요."
          />
          <BenefitCard
            icon="chart"
            title="실시간 추적"
            description="클릭, 전환, 수익을 실시간으로 확인하고 분석하세요."
          />
          <BenefitCard
            icon="wallet"
            title="정기 정산"
            description="매월 정해진 날짜에 누적된 커미션이 지급됩니다."
          />
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            이렇게 작동해요
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <StepCard
              step={1}
              title="가입"
              description="간단한 정보 입력으로 파트너 등록"
            />
            <StepCard
              step={2}
              title="링크 생성"
              description="추천하고 싶은 제품의 링크 생성"
            />
            <StepCard
              step={3}
              title="공유"
              description="SNS, 블로그, 유튜브 등에 공유"
            />
            <StepCard
              step={4}
              title="수익"
              description="판매 발생 시 커미션 적립"
            />
          </div>
        </div>
      </section>

      {/* Commission Info */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          커미션 안내
        </h2>
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">기본 커미션율</span>
              <span className="text-2xl font-bold text-blue-600">5%</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">쿠키 유효기간</span>
              <span className="font-semibold">30일</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">최소 정산 금액</span>
              <span className="font-semibold">50,000원</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600">정산 주기</span>
              <span className="font-semibold">월 1회</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-blue-100 mb-8">
            가입비 없이, 누구나 파트너가 될 수 있습니다.
          </p>
          {!isLoading && !isPartner && (
            <button
              onClick={handleJoinClick}
              className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              {user ? '파트너 가입하기' : '로그인하고 시작하기'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  const iconMap: Record<string, string> = {
    link: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
    chart:
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    wallet:
      'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={iconMap[icon] || iconMap.link}
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
