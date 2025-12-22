/**
 * CGM Pharmacist App Manifest
 *
 * 약사용 CGM 관리 앱
 * - 환자 CGM 데이터 요약 및 관리
 * - 상담/코칭 도구
 * - 다수 CGM 업체 연동 대비 구조
 *
 * @package @o4o/cgm-pharmacist-app
 */

export const cgmPharmacistAppManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'cgm-pharmacist-app',
  name: 'CGM Pharmacist App',
  displayName: 'CGM 관리',
  version: '0.1.0',
  type: 'feature' as const,
  description: '약사용 CGM 환자 관리 앱 - 데이터 요약, 상담/코칭, 위험 모니터링',

  // ===== 의존성 =====
  dependencies: {
    core: ['organization-core'],
    optional: ['pharmacy-ai-insight'],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'cgm_patient_summaries',
    'cgm_coaching_sessions',
    'cgm_coaching_notes',
    'cgm_risk_alerts',
  ],

  // ===== 권한 =====
  permissions: [
    'cgm-pharmacist.patients.read',
    'cgm-pharmacist.patients.manage',
    'cgm-pharmacist.coaching.read',
    'cgm-pharmacist.coaching.write',
    'cgm-pharmacist.insights.read',
    'cgm-pharmacist.alerts.read',
  ],

  // ===== Lifecycle =====
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // ===== Features =====
  features: [
    'patient-risk-list',
    'cgm-summary-view',
    'coaching-notes',
    'lifestyle-suggestions',
    'next-appointment',
    'cgm-adapter-interface',
  ],

  // ===== Configuration =====
  config: {
    enableRiskAlerts: {
      type: 'boolean',
      default: true,
      description: '위험 알림 활성화',
    },
    riskThresholdHigh: {
      type: 'number',
      default: 180,
      description: '고혈당 임계값 (mg/dL)',
    },
    riskThresholdLow: {
      type: 'number',
      default: 70,
      description: '저혈당 임계값 (mg/dL)',
    },
    defaultCoachingInterval: {
      type: 'number',
      default: 7,
      description: '기본 상담 주기 (일)',
    },
  },

  // ===== API Routes =====
  apiRoutes: [
    '/api/v1/cgm-pharmacist/patients',
    '/api/v1/cgm-pharmacist/patients/:id',
    '/api/v1/cgm-pharmacist/patients/:id/summary',
    '/api/v1/cgm-pharmacist/patients/:id/insights',
    '/api/v1/cgm-pharmacist/patients/:id/coaching',
    '/api/v1/cgm-pharmacist/alerts',
  ],

  // ===== Frontend Routes =====
  frontendRoutes: [
    '/cgm-pharmacist',
    '/cgm-pharmacist/patients',
    '/cgm-pharmacist/patients/:id',
    '/cgm-pharmacist/patients/:id/coaching',
    '/cgm-pharmacist/alerts',
  ],

  // ===== Navigation Menus =====
  navigation: {
    menus: [
      {
        id: 'cgm-pharmacist-main',
        label: 'CGM 관리',
        path: '/cgm-pharmacist',
        icon: 'monitor_heart',
        roles: ['pharmacist', 'admin'],
        children: [
          {
            id: 'cgm-pharmacist-patients',
            label: '환자 목록',
            path: '/cgm-pharmacist/patients',
            icon: 'people',
          },
          {
            id: 'cgm-pharmacist-alerts',
            label: '위험 알림',
            path: '/cgm-pharmacist/alerts',
            icon: 'warning',
          },
        ],
      },
    ],
    adminRoutes: [
      '/cgm-pharmacist',
      '/cgm-pharmacist/patients',
      '/cgm-pharmacist/patients/:id',
      '/cgm-pharmacist/patients/:id/coaching',
      '/cgm-pharmacist/alerts',
    ],
  },

  // ===== Backend =====
  backend: {
    entities: [],
    services: ['PatientService', 'CoachingService', 'CGMAdapterService'],
    controllers: ['PatientController', 'CoachingController', 'AlertController'],
    routesExport: 'createRoutes',
  },

  // ===== 원칙 (코드에 명시) =====
  principles: {
    // 의료 행위 금지
    noMedicalDiagnosis: true,
    noMedicalPrescription: true,
    // 데이터 원칙
    noRawDataStorage: true,
    summaryOnlyView: true,
    // 업체 중립
    vendorNeutral: true,
    multiVendorSupport: true,
    // 개인정보
    consentByVendor: true,
    apiIntegrationOnly: true,
  },
};

export default cgmPharmacistAppManifest;
