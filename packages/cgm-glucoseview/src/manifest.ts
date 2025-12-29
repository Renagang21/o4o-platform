/**
 * CGM GlucoseView - Standalone App Manifest
 *
 * 약사용 CGM 혈당 분석 서비스
 * - 환자 혈당 요약 정보 제공
 * - 패턴 분석 및 인사이트 제공
 * - 기간별 비교 및 트렌드 모니터링
 *
 * @type Standalone App
 * @serviceGroup health (temporary - pending policy decision)
 * @roles pharmacist, patient
 */

export const cgmGlucoseviewManifest = {
    // ===== Required Basic Information =====
    id: 'cgm-glucoseview',
    appId: 'cgm-glucoseview',
    displayName: 'CGM GlucoseView',
    name: 'CGM GlucoseView - Pharmacist Glucose Analysis',
    version: '1.0.0',
    type: 'standalone' as const,
    appType: 'standalone' as const,
    category: 'health' as const,
    description: '약사용 CGM 혈당 분석 서비스 - 환자 혈당 패턴 모니터링 및 인사이트 제공',

    // ===== Dependencies =====
    dependencies: {
        core: ['auth-core', 'organization-core'], // Use existing auth and org structure
        apps: [],
    },

    // ===== Owned Tables =====
    ownsTables: [
        'cgm_patients',
        'cgm_patient_summaries',
        'cgm_glucose_insights',
    ],

    // ===== Uninstall Policy =====
    uninstallPolicy: {
        defaultMode: 'keep-data' as const,
        allowPurge: true,
        autoBackup: true,
    },

    // ===== Backend =====
    backend: {
        entities: [
            'CGMPatient',
            'PatientSummary',
            'GlucoseInsight',
        ],
        services: [
            'PatientSummaryService',
            'GlucoseInsightService',
        ],
        controllers: [
            'GlucoseViewController',
        ],
        routesExport: 'createRoutes',
        routePrefix: '/api/v1/glucoseview',
    },

    // ===== Frontend =====
    frontend: {
        admin: {
            pages: [
                { path: '/glucoseview', component: 'GlucoseViewHome' },
                { path: '/glucoseview/patients', component: 'PatientList' },
                { path: '/glucoseview/patients/:id', component: 'PatientDetail' },
            ],
        },
    },

    // ===== Lifecycle =====
    lifecycle: {
        install: './lifecycle/install.js',
        activate: './lifecycle/activate.js',
        deactivate: './lifecycle/deactivate.js',
        uninstall: './lifecycle/uninstall.js',
    },

    // ===== Permissions =====
    permissions: [
        {
            id: 'glucoseview.patients.view',
            name: '환자 혈당 데이터 조회',
            description: '환자 혈당 요약 및 인사이트 조회',
            category: 'glucoseview',
        },
        {
            id: 'glucoseview.patients.manage',
            name: '환자 관리',
            description: '환자 등록 및 관리',
            category: 'glucoseview',
        },
        {
            id: 'glucoseview.insights.manage',
            name: '인사이트 관리',
            description: '약사 코멘트 및 인사이트 추가',
            category: 'glucoseview',
        },
    ],

    // ===== Admin Menus =====
    menus: {
        admin: [
            {
                id: 'glucoseview',
                label: 'CGM 혈당 분석',
                icon: 'activity',
                order: 50,
                children: [
                    {
                        id: 'glucoseview-home',
                        label: '홈',
                        path: '/glucoseview',
                        icon: 'home',
                    },
                    {
                        id: 'glucoseview-patients',
                        label: '환자 목록',
                        path: '/glucoseview/patients',
                        icon: 'users',
                        permission: 'glucoseview.patients.view',
                    },
                ],
            },
        ],
        member: [],
    },

    // ===== Exposes =====
    exposes: {
        entities: ['CGMPatient', 'PatientSummary', 'GlucoseInsight'],
        services: ['PatientSummaryService', 'GlucoseInsightService'],
        types: ['PatientStatus', 'InsightType'],
        events: [
            'glucoseview.patient.registered',
            'glucoseview.summary.generated',
            'glucoseview.insight.created',
        ],
    },

    // ===== Default Config =====
    defaultConfig: {
        // Summary generation
        defaultSummaryPeriodDays: 7,
        warningThresholdGlucose: 180,
        riskThresholdGlucose: 250,

        // Time in range targets
        targetTimeInRangePercent: 70,

        // Insight generation
        enableAutomaticInsights: true,
    },

    // ===== Service Group (temporary) =====
    serviceGroup: 'health',

    // ===== Roles (string-based domain roles) =====
    defaultRoles: ['pharmacist', 'patient'],
};

export default cgmGlucoseviewManifest;
