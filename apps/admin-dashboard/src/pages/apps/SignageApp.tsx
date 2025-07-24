import { Monitor, Play, Calendar, MapPin, Settings, Power, AlertCircle } from 'lucide-react';

const SignageApp = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <Monitor className="w-8 h-8 text-modern-primary" />
            디지털 사이니지 관리
          </h1>
          <p className="text-modern-text-secondary mt-1">
            디지털 디스플레이를 관리하고 콘텐츠를 배포하세요.
          </p>
        </div>
        <button className="px-4 py-2 bg-modern-primary text-white rounded-lg hover:bg-modern-primary-hover transition-colors">
          새 디스플레이 추가
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">전체 디스플레이</p>
                <p className="text-2xl font-bold text-modern-text-primary">24</p>
                <p className="text-xs text-modern-text-secondary mt-1">12개 지점</p>
              </div>
              <Monitor className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">활성 디스플레이</p>
                <p className="text-2xl font-bold text-modern-success">22</p>
                <p className="text-xs text-modern-success mt-1">91.7% 가동률</p>
              </div>
              <Power className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">재생 중 콘텐츠</p>
                <p className="text-2xl font-bold text-modern-warning">45</p>
                <p className="text-xs text-modern-text-secondary mt-1">15개 플레이리스트</p>
              </div>
              <Play className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">오류 상태</p>
                <p className="text-2xl font-bold text-modern-danger">2</p>
                <p className="text-xs text-modern-danger mt-1">즉시 확인 필요</p>
              </div>
              <AlertCircle className="w-8 h-8 text-modern-danger opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Display List */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h2 className="text-lg font-semibold">디스플레이 현황</h2>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              <div className="p-4 border border-modern-border-primary rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-modern-success rounded-full mt-2"></div>
                    <div>
                      <h3 className="font-medium text-modern-text-primary">강남점 1층 메인</h3>
                      <p className="text-sm text-modern-text-secondary">55" LG OLED</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-modern-text-secondary flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> 강남점
                        </span>
                        <span className="text-xs text-modern-text-secondary flex items-center gap-1">
                          <Play className="w-3 h-3" /> 프로모션 A
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="p-1.5 hover:bg-modern-bg-hover rounded">
                    <Settings className="w-4 h-4 text-modern-text-secondary" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 border border-modern-border-primary rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-modern-success rounded-full mt-2"></div>
                    <div>
                      <h3 className="font-medium text-modern-text-primary">강남점 2층 대기실</h3>
                      <p className="text-sm text-modern-text-secondary">43" Samsung</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-modern-text-secondary flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> 강남점
                        </span>
                        <span className="text-xs text-modern-text-secondary flex items-center gap-1">
                          <Play className="w-3 h-3" /> 일반 콘텐츠
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="p-1.5 hover:bg-modern-bg-hover rounded">
                    <Settings className="w-4 h-4 text-modern-text-secondary" />
                  </button>
                </div>
              </div>

              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-modern-danger rounded-full mt-2"></div>
                    <div>
                      <h3 className="font-medium text-modern-text-primary">판교점 입구</h3>
                      <p className="text-sm text-modern-danger">연결 끊김</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-modern-text-secondary flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> 판교점
                        </span>
                        <span className="text-xs text-modern-danger flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> 오프라인 2시간
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="p-1.5 hover:bg-red-100 rounded">
                    <Settings className="w-4 h-4 text-modern-danger" />
                  </button>
                </div>
              </div>
            </div>
            <button className="mt-4 w-full py-2 border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
              모든 디스플레이 보기
            </button>
          </div>
        </div>

        {/* Content Management */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h2 className="text-lg font-semibold">콘텐츠 관리</h2>
          </div>
          <div className="wp-card-body">
            <div className="space-y-4 mb-4">
              <div className="p-3 bg-modern-bg-tertiary rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-modern-text-primary">프로모션 A</span>
                  <span className="text-xs px-2 py-1 bg-modern-success text-white rounded">재생 중</span>
                </div>
                <p className="text-sm text-modern-text-secondary mb-2">봄맞이 특별 할인 이벤트</p>
                <div className="flex items-center gap-4 text-xs text-modern-text-secondary">
                  <span>12개 디스플레이</span>
                  <span>30초 x 5개 슬라이드</span>
                </div>
              </div>

              <div className="p-3 bg-modern-bg-tertiary rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-modern-text-primary">일반 콘텐츠</span>
                  <span className="text-xs px-2 py-1 bg-modern-success text-white rounded">재생 중</span>
                </div>
                <p className="text-sm text-modern-text-secondary mb-2">브랜드 소개 및 제품 안내</p>
                <div className="flex items-center gap-4 text-xs text-modern-text-secondary">
                  <span>8개 디스플레이</span>
                  <span>60초 x 10개 슬라이드</span>
                </div>
              </div>

              <div className="p-3 bg-modern-bg-tertiary rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-modern-text-primary">시간대별 콘텐츠</span>
                  <span className="text-xs px-2 py-1 bg-gray-500 text-white rounded">예약됨</span>
                </div>
                <p className="text-sm text-modern-text-secondary mb-2">점심 시간 특별 메뉴</p>
                <div className="flex items-center gap-4 text-xs text-modern-text-secondary">
                  <span>4개 디스플레이</span>
                  <span>11:30 - 13:30</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button className="py-2 border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                콘텐츠 업로드
              </button>
              <button className="py-2 border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                플레이리스트 관리
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Calendar */}
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">콘텐츠 스케줄</h2>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-modern-bg-hover rounded">
                <Calendar className="w-5 h-5 text-modern-text-secondary" />
              </button>
            </div>
          </div>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-modern-text-secondary py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((date) => (
              <div
                key={date}
                className={`aspect-square flex items-center justify-center rounded-lg text-sm 
                  ${date === 15 ? 'bg-modern-primary text-white' : 'hover:bg-modern-bg-hover'}
                  ${[8, 12, 15, 22, 28].includes(date) ? 'border border-modern-primary' : ''}
                `}
              >
                {date}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-modern-border-primary">
            <p className="text-sm text-modern-text-secondary">
              <span className="inline-block w-3 h-3 bg-modern-primary rounded mr-2"></span>
              오늘: 3개 캠페인 진행 중
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignageApp;