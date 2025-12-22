// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const manifest: any = {
  meta: {
    appId: 'diabetes-core',
    name: 'DiabetesCare Core',
    version: '0.1.0',
    type: 'core',
    description: '혈당관리 지원약국 서비스의 Core Logic Layer - CGM/BGM 데이터 처리, 분석, 코칭, 리포트 생성',
    author: 'O4O Platform',
    license: 'proprietary',
  },
  dependencies: {
    core: '',
    extension: '',
  },
  cms: {
    cpt: [],
    acf: [],
    viewTemplates: [],
  },
  backend: {
    entities: [
      'CGMSession',
      'CGMReading',
      'CGMEvent',
      'UserNote',
      'DailyMetrics',
      'PatternAnalysis',
      'CoachingSession',
      'CoachingMessage',
      'DiabetesReport',
    ],
    services: [
      'CGMIngestService',
      'MetricsCalculatorService',
      'PatternDetectorService',
      'ReportGeneratorService',
      'CoachingService',
    ],
    routes: ['/diabetes'],
  },
  navigation: {
    menus: [],
    adminRoutes: [],
  },
  settings: {
    configurable: true,
    defaults: {
      // TIR (Time in Range) 기준값
      tirLowThreshold: 70,      // mg/dL - 저혈당 기준
      tirHighThreshold: 180,    // mg/dL - 고혈당 기준
      tirTargetMin: 70,         // mg/dL - 목표 범위 최소
      tirTargetMax: 180,        // mg/dL - 목표 범위 최대

      // 이벤트 탐지 설정
      hyperglycemiaThreshold: 180,  // mg/dL
      hypoglycemiaThreshold: 70,    // mg/dL
      severeHypoThreshold: 54,      // mg/dL

      // 분석 설정
      mealResponseWindowMinutes: 120,  // 식후 반응 분석 윈도우
      patternMinOccurrences: 3,        // 패턴 인식 최소 발생 횟수
    },
  },
};

export default manifest;
