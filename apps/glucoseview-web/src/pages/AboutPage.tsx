// 기능 상태 타입
type FeatureStatus = 'done' | 'planned' | 'not-planned';

interface Feature {
  name: string;
  description: string;
  status: FeatureStatus;
  category: 'core' | 'data' | 'analysis' | 'sharing' | 'admin';
}

// 기능 목록
const features: Feature[] = [
  // 핵심 기능 (Core)
  { name: '약사 회원 시스템', description: '회원가입, 로그인, 승인제 가입', status: 'done', category: 'core' },
  { name: '지부/분회 관리', description: '약사회 조직 구조 기반 소속 관리', status: 'done', category: 'core' },
  { name: '관리자 승인 시스템', description: '회원 가입 승인/거절 관리', status: 'done', category: 'core' },
  { name: '테스트 계정', description: '약사/관리자 테스트 계정 제공', status: 'done', category: 'core' },

  // 고객/데이터 관리 (Data)
  { name: '고객 등록/관리', description: '이름, 출생연도, 연락처 등 기본 정보', status: 'done', category: 'data' },
  { name: '방문 이력 관리', description: '방문 횟수, 최근 방문일 추적', status: 'done', category: 'data' },
  { name: 'CGM 데이터 연동', description: 'LibreView, Dexcom 등 연동', status: 'planned', category: 'data' },
  { name: 'CGM 데이터 파일 업로드', description: 'CSV, Excel 파일 업로드', status: 'planned', category: 'data' },
  { name: '고객 조제데이터 연동', description: '고객 승인하에 약국 조제 이력 연동', status: 'planned', category: 'data' },

  // 분석 기능 (Analysis)
  { name: '혈당 패턴 요약', description: '일별/주별 혈당 추이 요약', status: 'planned', category: 'analysis' },
  { name: 'TIR (Time in Range)', description: '목표 범위 내 시간 비율', status: 'planned', category: 'analysis' },
  { name: '평균 혈당/변동성', description: 'GMI, CV% 등 통계 지표', status: 'planned', category: 'analysis' },
  { name: 'AGP 리포트', description: 'Ambulatory Glucose Profile', status: 'planned', category: 'analysis' },
  { name: '야간 저혈당 감지', description: '수면 중 저혈당 패턴 분석', status: 'planned', category: 'analysis' },
  { name: '식후 혈당 분석', description: '식사 후 혈당 상승 패턴', status: 'planned', category: 'analysis' },
  { name: 'AI 기반 인사이트', description: 'AI가 분석한 상담 참고사항', status: 'planned', category: 'analysis' },
  { name: '약물-혈당 상관 분석', description: '복용 약물과 혈당 패턴 연관성', status: 'not-planned', category: 'analysis' },

  // 공유/리포트 (Sharing)
  { name: '카카오톡 공유', description: '리포트 카카오톡 전송', status: 'done', category: 'sharing' },
  { name: '리포트 인쇄', description: '환자용 리포트 출력', status: 'done', category: 'sharing' },
  { name: '이메일 전송', description: '리포트 이메일 발송', status: 'done', category: 'sharing' },
  { name: 'PDF 리포트 생성', description: 'PDF 파일 다운로드', status: 'planned', category: 'sharing' },
  { name: '환자 앱 연동', description: '환자가 직접 데이터 확인', status: 'not-planned', category: 'sharing' },

  // 관리 기능 (Admin)
  { name: '회원 목록 조회', description: '전체 약사 회원 관리', status: 'done', category: 'admin' },
  { name: '통계 대시보드', description: '이용 현황 통계', status: 'planned', category: 'admin' },
];

const categoryLabels: Record<Feature['category'], string> = {
  core: '핵심 시스템',
  data: '데이터 관리',
  analysis: '분석 기능',
  sharing: '공유/리포트',
  admin: '관리 기능',
};

const statusLabels: Record<FeatureStatus, { label: string; className: string }> = {
  done: { label: '구현 완료', className: 'bg-green-100 text-green-700' },
  planned: { label: '개발 예정', className: 'bg-blue-100 text-blue-700' },
  'not-planned': { label: '미정', className: 'bg-slate-100 text-slate-500' },
};

export default function AboutPage() {
  const categories: Feature['category'][] = ['core', 'data', 'analysis', 'sharing', 'admin'];

  const doneCount = features.filter(f => f.status === 'done').length;
  const plannedCount = features.filter(f => f.status === 'planned').length;

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-1">About</h1>
          <p className="text-slate-500">GlucoseView 서비스 안내 및 기능 현황</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Definition */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <p className="text-slate-700 leading-relaxed">
            GlucoseView는 약국에서 CGM 데이터를 정리하여 확인할 수 있도록 돕는 도구입니다.
          </p>
        </div>

        {/* What we do / don't do */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {/* Don't */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-medium text-slate-400 mb-4">하지 않는 것</h2>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-slate-300 mt-0.5">×</span>
                <span>원본 CGM 데이터 저장</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-300 mt-0.5">×</span>
                <span>의료 진단 또는 치료 제공</span>
              </li>
            </ul>
          </div>

          {/* Do */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-medium text-slate-700 mb-4">하는 것</h2>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">○</span>
                <span>연동된 데이터를 정리하여 표시</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">○</span>
                <span>약사의 설명을 보조</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">○</span>
                <span>경향 파악을 위한 요약 제공</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">개발 현황</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-sm text-slate-600">구현 완료: {doneCount}개</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-sm text-slate-600">개발 예정: {plannedCount}개</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-300"></span>
              <span className="text-sm text-slate-600">미정: {features.length - doneCount - plannedCount}개</span>
            </div>
          </div>
          <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500"
              style={{ width: `${(doneCount / features.length) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            전체 {features.length}개 기능 중 {doneCount}개 완료 ({Math.round((doneCount / features.length) * 100)}%)
          </p>
        </div>

        {/* Feature List by Category */}
        <div className="space-y-6">
          {categories.map(category => {
            const categoryFeatures = features.filter(f => f.category === category);
            return (
              <div key={category} className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-4">{categoryLabels[category]}</h2>
                <div className="space-y-3">
                  {categoryFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">{feature.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{feature.description}</p>
                      </div>
                      <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded ${statusLabels[feature.status].className}`}>
                        {statusLabels[feature.status].label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Data Flow */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mt-6">
          <h2 className="text-sm font-medium text-slate-700 mb-4">데이터 흐름</h2>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-4">
            <span className="px-3 py-1.5 bg-slate-100 rounded">CGM 앱</span>
            <span className="text-slate-300">→</span>
            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded border border-blue-100">GlucoseView</span>
            <span className="text-slate-300">→</span>
            <span className="px-3 py-1.5 bg-slate-100 rounded">정리된 화면</span>
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">
            GlucoseView는 해석 결과만 표시하며, 원본 데이터를 보관하지 않습니다
          </p>
        </div>

        {/* Note */}
        <p className="text-xs text-slate-400 text-center mt-6">
          기능 요청이나 피드백이 있으시면 관리자에게 문의해 주세요.
        </p>
      </div>
    </div>
  );
}
