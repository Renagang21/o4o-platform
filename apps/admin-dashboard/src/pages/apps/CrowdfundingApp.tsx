import { DollarSign, Target, Users, TrendingUp, Clock, CheckCircle, AlertCircle, Gift } from 'lucide-react';

const CrowdfundingApp = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-modern-primary" />
            크라우드펀딩 관리
          </h1>
          <p className="text-modern-text-secondary mt-1">
            크라우드펀딩 프로젝트를 관리하고 후원자를 관리하세요.
          </p>
        </div>
        <button className="px-4 py-2 bg-modern-primary text-white rounded-lg hover:bg-modern-primary-hover transition-colors">
          새 프로젝트 생성
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">진행 중 프로젝트</p>
                <p className="text-2xl font-bold text-modern-text-primary">5</p>
                <p className="text-xs text-modern-text-secondary mt-1">2개 곧 종료</p>
              </div>
              <Target className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">총 모금액</p>
                <p className="text-2xl font-bold text-modern-success">₩127.5M</p>
                <p className="text-xs text-modern-success mt-1">목표 대비 85%</p>
              </div>
              <DollarSign className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">후원자 수</p>
                <p className="text-2xl font-bold text-modern-warning">1,234</p>
                <p className="text-xs text-modern-text-secondary mt-1">평균 ₩103,400</p>
              </div>
              <Users className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">성공률</p>
                <p className="text-2xl font-bold text-modern-accent">78%</p>
                <p className="text-xs text-modern-success mt-1">업계 평균 대비 +18%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-modern-accent opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Active Projects */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h2 className="text-lg font-semibold">진행 중인 프로젝트</h2>
        </div>
        <div className="wp-card-body">
          <div className="space-y-4">
            {/* Project 1 */}
            <div className="border border-modern-border-primary rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-modern-text-primary">스마트 건강 모니터링 기기</h3>
                  <p className="text-sm text-modern-text-secondary">헬스케어 | D-15</p>
                </div>
                <span className="px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  진행 중
                </span>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-modern-text-secondary">목표 금액: ₩50,000,000</span>
                  <span className="font-medium text-modern-text-primary">92% 달성</span>
                </div>
                <div className="w-full bg-modern-bg-tertiary rounded-full h-2">
                  <div className="bg-modern-success h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-modern-text-primary">₩46M</p>
                  <p className="text-xs text-modern-text-secondary">모금액</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-modern-text-primary">523</p>
                  <p className="text-xs text-modern-text-secondary">후원자</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-modern-text-primary">15일</p>
                  <p className="text-xs text-modern-text-secondary">남은 기간</p>
                </div>
              </div>
            </div>

            {/* Project 2 */}
            <div className="border border-modern-border-primary rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-modern-text-primary">친환경 요가 매트</h3>
                  <p className="text-sm text-modern-text-secondary">라이프스타일 | D-5</p>
                </div>
                <span className="px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                  곧 종료
                </span>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-modern-text-secondary">목표 금액: ₩20,000,000</span>
                  <span className="font-medium text-modern-text-primary">156% 달성</span>
                </div>
                <div className="w-full bg-modern-bg-tertiary rounded-full h-2">
                  <div className="bg-modern-primary h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-modern-text-primary">₩31.2M</p>
                  <p className="text-xs text-modern-text-secondary">모금액</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-modern-text-primary">412</p>
                  <p className="text-xs text-modern-text-secondary">후원자</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-modern-text-primary">5일</p>
                  <p className="text-xs text-modern-text-secondary">남은 기간</p>
                </div>
              </div>
            </div>

            {/* Project 3 */}
            <div className="border border-modern-border-primary rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-modern-text-primary">슈퍼푸드 에너지바</h3>
                  <p className="text-sm text-modern-text-secondary">식품 | D-30</p>
                </div>
                <span className="px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  진행 중
                </span>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-modern-text-secondary">목표 금액: ₩30,000,000</span>
                  <span className="font-medium text-modern-text-primary">67% 달성</span>
                </div>
                <div className="w-full bg-modern-bg-tertiary rounded-full h-2">
                  <div className="bg-modern-warning h-2 rounded-full" style={{ width: '67%' }}></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-modern-text-primary">₩20.1M</p>
                  <p className="text-xs text-modern-text-secondary">모금액</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-modern-text-primary">299</p>
                  <p className="text-xs text-modern-text-secondary">후원자</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-modern-text-primary">30일</p>
                  <p className="text-xs text-modern-text-secondary">남은 기간</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Backers */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h2 className="text-lg font-semibold">최근 후원자</h2>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-modern-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                    김철수
                  </div>
                  <div>
                    <p className="font-medium text-modern-text-primary">김철수</p>
                    <p className="text-sm text-modern-text-secondary">스마트 건강 모니터링</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-modern-text-primary">₩150,000</p>
                  <p className="text-xs text-modern-text-secondary">5분 전</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-modern-success text-white rounded-full flex items-center justify-center text-sm font-medium">
                    이영희
                  </div>
                  <div>
                    <p className="font-medium text-modern-text-primary">이영희</p>
                    <p className="text-sm text-modern-text-secondary">친환경 요가 매트</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-modern-text-primary">₩89,000</p>
                  <p className="text-xs text-modern-text-secondary">15분 전</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-modern-warning text-white rounded-full flex items-center justify-center text-sm font-medium">
                    박민수
                  </div>
                  <div>
                    <p className="font-medium text-modern-text-primary">박민수</p>
                    <p className="text-sm text-modern-text-secondary">슈퍼푸드 에너지바</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-modern-text-primary">₩45,000</p>
                  <p className="text-xs text-modern-text-secondary">1시간 전</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reward Status */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h2 className="text-lg font-semibold">리워드 현황</h2>
          </div>
          <div className="wp-card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-modern-primary" />
                  <span className="text-sm text-modern-text-primary">발송 대기</span>
                </div>
                <span className="text-lg font-bold text-modern-text-primary">234</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-modern-warning" />
                  <span className="text-sm text-modern-text-primary">제작 중</span>
                </div>
                <span className="text-lg font-bold text-modern-text-primary">156</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-modern-success" />
                  <span className="text-sm text-modern-text-primary">발송 완료</span>
                </div>
                <span className="text-lg font-bold text-modern-text-primary">892</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-modern-danger" />
                  <span className="text-sm text-modern-text-primary">문의 사항</span>
                </div>
                <span className="text-lg font-bold text-modern-text-primary">12</span>
              </div>
            </div>
            <button className="mt-4 w-full py-2 bg-modern-primary text-white rounded-lg hover:bg-modern-primary-hover transition-colors">
              리워드 관리
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Performance */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h2 className="text-lg font-semibold">캠페인 성과 분석</h2>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
              <p className="text-3xl font-bold text-modern-text-primary mb-1">3.2%</p>
              <p className="text-sm text-modern-text-secondary">평균 전환율</p>
              <p className="text-xs text-modern-success mt-2">+0.5%p 향상</p>
            </div>
            <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
              <p className="text-3xl font-bold text-modern-text-primary mb-1">₩87,400</p>
              <p className="text-sm text-modern-text-secondary">평균 후원 금액</p>
              <p className="text-xs text-modern-success mt-2">+12% 증가</p>
            </div>
            <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
              <p className="text-3xl font-bold text-modern-text-primary mb-1">42%</p>
              <p className="text-sm text-modern-text-secondary">재후원율</p>
              <p className="text-xs text-modern-text-secondary mt-2">전월 동일</p>
            </div>
            <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
              <p className="text-3xl font-bold text-modern-text-primary mb-1">4.8</p>
              <p className="text-sm text-modern-text-secondary">만족도 점수</p>
              <p className="text-xs text-modern-success mt-2">매우 우수</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrowdfundingApp;