# Creating a New Service Group

> Phase 10 - Service Evolution Layer

이 문서는 O4O Platform에서 새로운 Service Group을 생성하는 방법을 설명합니다.

---

## 1. 개요

Service Group은 특정 산업이나 용도에 맞는 서비스 구성의 표준입니다.

### 기존 Service Groups

| ID | 이름 | 카테고리 | 상태 |
|----|------|----------|------|
| `cosmetics` | 화장품 드롭쉬핑 | commerce | Active |
| `yaksa` | 약사 인트라넷 | organization | Active |
| `hospital` | 병원 서비스 | health | Planned |
| `b2b-education` | B2B 교육 | education | Planned |

---

## 2. Service Group 구성 요소

새 Service Group을 생성하려면 다음 7가지 요소가 필요합니다:

### 필수 구성 요소

1. **Service Group Definition** - 기본 정의
2. **Navigation Keys** - 네비게이션 구성
3. **Views** - 뷰 템플릿 정의
4. **Theme** - 테마 설정
5. **InitPack** - 초기 데이터
6. **Template** - 서비스 템플릿
7. **Extension Rules** - 확장 호환성 규칙

---

## 3. 단계별 생성 가이드

### Step 1: Service Group ID 정의

고유한 식별자를 정의합니다.

```typescript
const serviceGroupId = 'diabetes-care';
```

**명명 규칙:**
- 소문자와 하이픈만 사용
- 산업/목적을 명확히 표현
- 2-3 단어로 제한

### Step 2: Navigation Keys 추가

```typescript
navigation: {
  // 이 서비스 그룹에 필수인 네비게이션 키
  requiredKeys: ['patients', 'devices', 'reports', 'alerts'],

  // 다른 서비스 그룹의 키 (금지)
  forbiddenKeys: ['products', 'orders', 'forum', 'cosmetics'],

  // 기본 메뉴 구조
  defaultMenus: [
    {
      key: 'patients',
      label: '환자 관리',
      icon: 'users',
      path: '/patients',
      order: 1,
      children: [
        { key: 'patient-list', label: '환자 목록', path: '/patients/list' },
        { key: 'patient-add', label: '환자 등록', path: '/patients/add' }
      ]
    },
    {
      key: 'devices',
      label: 'CGM 기기',
      icon: 'cpu',
      path: '/devices',
      order: 2
    },
    {
      key: 'reports',
      label: '리포트',
      icon: 'bar-chart',
      path: '/reports',
      order: 3
    }
  ],

  // 관리자 네비게이션
  adminNavItems: [
    { key: 'settings', label: '설정', path: '/admin/settings', icon: 'settings' }
  ]
}
```

### Step 3: Views 정의

```typescript
views: {
  // 예상되는 뷰 템플릿
  expectedViews: [
    'PatientList',
    'PatientDetail',
    'DeviceList',
    'CGMReport',
    'AlertDashboard'
  ],

  // 금지된 뷰 (다른 서비스 그룹용)
  forbiddenViews: [
    'ProductList',
    'OrderList',
    'ForumList',
    'CosmeticsRecommendation'
  ],

  // CPT → View 매핑
  defaultViewMappings: {
    'cpt:patient': 'PatientList',
    'cpt:device': 'DeviceList',
    'cpt:cgm_report': 'CGMReport'
  }
}
```

### Step 4: Theme 설정

```typescript
theme: {
  // 허용된 테마 프리셋
  allowedPresets: [
    'diabetes-care-default',
    'diabetes-care-professional',
    'diabetes-care-clinical'
  ],

  // 기본 프리셋
  defaultPreset: 'diabetes-care-default',

  // 기본 색상
  defaultColors: {
    primary: '#0EA5E9',    // Sky blue - 의료/헬스케어 느낌
    secondary: '#38BDF8',
    accent: '#0284C7'
  },

  // CSS 변수
  cssVariables: {
    '--card-radius': '8px',
    '--font-family': '"Pretendard", sans-serif'
  }
}
```

### Step 5: InitPack 생성

```typescript
initPack: {
  // InitPack ID 패턴
  initPackIdPattern: 'diabetes-care-*-init',

  // 기본 카테고리
  defaultCategories: [
    { slug: 'type1', name: '1형 당뇨' },
    { slug: 'type2', name: '2형 당뇨' },
    { slug: 'gestational', name: '임신성 당뇨' }
  ],

  // 기본 페이지
  defaultPages: [
    { slug: 'home', title: '홈', template: 'home' },
    { slug: 'patients', title: '환자 관리', template: 'patient-list' },
    { slug: 'reports', title: '리포트', template: 'report-dashboard' }
  ],

  // 기본 역할
  defaultRoles: ['admin', 'doctor', 'nurse', 'patient'],

  // 시드 데이터 설정
  seedDataConfig: {
    includeSampleData: true,
    sampleDataTypes: ['patients', 'devices', 'sample-readings']
  }
}
```

### Step 6: Template 생성

```typescript
template: {
  // Template ID 패턴
  templateIdPattern: 'diabetes-care-*-template',

  // 기본 버전
  defaultVersion: '1.0.0',

  // 자동 설치
  autoInstall: true,

  // 기본 설정
  defaultSettings: {
    glucoseUnit: 'mg/dL',
    targetRange: { min: 70, max: 180 },
    alertThresholds: {
      low: 70,
      high: 250,
      veryHigh: 400
    }
  }
}
```

### Step 7: Extension Rules 설정

```typescript
extensionRules: {
  // 필수 확장
  required: [],

  // 권장 확장
  recommended: [
    'analytics-core',
    'notification-core',
    'export-core'
  ],

  // 비호환 확장
  incompatible: [
    'dropshipping-cosmetics',
    'forum-yaksa',
    'membership-yaksa',
    'ecommerce-core'
  ],

  // 버전 제약
  versionConstraints: {
    'analytics-core': '>=1.0.0',
    'notification-core': '>=1.2.0'
  }
}
```

---

## 4. App Configuration

### 필수 Core Apps 정의

```typescript
apps: {
  // 항상 설치되어야 하는 Core Apps
  requiredCoreApps: [
    'cms-core',              // 필수 - 모든 서비스 그룹
    'organization-core',     // 필수 - 모든 서비스 그룹
    'diabetes-care-core'     // 서비스 그룹 전용 Core
  ],

  // 권장 Extension Apps
  recommendedExtensions: [
    'cgm-integration',       // CGM 기기 연동
    'glucose-analytics',     // 혈당 분석
    'alert-system'           // 알림 시스템
  ],

  // 비호환 Apps
  incompatibleApps: [
    'dropshipping-cosmetics',
    'forum-yaksa',
    'ecommerce-core'
  ]
}
```

---

## 5. 전체 예시: diabetes-care Service Group

```typescript
import { ServiceGroupDefinition } from '../service-groups';

const diabetesCareServiceGroup: ServiceGroupDefinition = {
  id: 'diabetes-care',
  name: '당뇨 케어 서비스',
  description: 'CGM 기반 당뇨 관리 서비스를 위한 서비스 그룹',
  category: 'health',
  icon: 'activity',
  primaryColor: '#0EA5E9',

  navigation: {
    requiredKeys: ['patients', 'devices', 'reports', 'alerts'],
    forbiddenKeys: ['products', 'orders', 'forum', 'cosmetics'],
    defaultMenus: [
      { key: 'patients', label: '환자 관리', path: '/patients', order: 1 },
      { key: 'devices', label: 'CGM 기기', path: '/devices', order: 2 },
      { key: 'reports', label: '리포트', path: '/reports', order: 3 },
      { key: 'alerts', label: '알림', path: '/alerts', order: 4 }
    ]
  },

  views: {
    expectedViews: ['PatientList', 'DeviceList', 'CGMReport', 'AlertDashboard'],
    forbiddenViews: ['ProductList', 'OrderList', 'ForumList'],
    defaultViewMappings: {
      'cpt:patient': 'PatientList',
      'cpt:device': 'DeviceList'
    }
  },

  theme: {
    allowedPresets: ['diabetes-care-default', 'diabetes-care-clinical'],
    defaultPreset: 'diabetes-care-default',
    defaultColors: { primary: '#0EA5E9', secondary: '#38BDF8' }
  },

  apps: {
    requiredCoreApps: ['cms-core', 'organization-core'],
    recommendedExtensions: ['cgm-integration', 'glucose-analytics'],
    incompatibleApps: ['dropshipping-cosmetics', 'forum-yaksa']
  },

  initPack: {
    initPackIdPattern: 'diabetes-care-*-init',
    defaultCategories: [
      { slug: 'type1', name: '1형 당뇨' },
      { slug: 'type2', name: '2형 당뇨' }
    ],
    defaultRoles: ['admin', 'doctor', 'nurse', 'patient']
  },

  template: {
    templateIdPattern: 'diabetes-care-*-template',
    defaultVersion: '1.0.0',
    autoInstall: true
  },

  extensionRules: {
    required: [],
    recommended: ['analytics-core', 'notification-core'],
    incompatible: ['dropshipping-cosmetics', 'forum-yaksa']
  },

  isActive: false,  // 개발 중

  metadata: {
    author: 'O4O Platform Team',
    version: '1.0.0',
    createdAt: new Date('2025-12-11'),
    documentation: '/docs/services/diabetes-care.md'
  }
};

// Registry에 등록
serviceGroupRegistry.register(diabetesCareServiceGroup);
```

---

## 6. 등록 체크리스트

Service Group 등록 전 확인사항:

```typescript
const checklist = serviceGroupRegistry.getRegistrationChecklist('diabetes-care');

// 출력:
// [
//   { step: 1, task: 'Define serviceGroup id', completed: true },
//   { step: 2, task: 'Add navigation keys', completed: true },
//   { step: 3, task: 'Add views', completed: true },
//   { step: 4, task: 'Add default theme', completed: true },
//   { step: 5, task: 'Add InitPack', completed: true },
//   { step: 6, task: 'Add Template', completed: true },
//   { step: 7, task: 'Add extension compatibility', completed: true }
// ]
```

---

## 7. 기존 Service Group 기반 생성

기존 Service Group을 복제하여 새로 생성할 수 있습니다:

```typescript
const newGroup = serviceGroupRegistry.create({
  id: 'pharmacy-cgm',
  name: '약국 CGM 서비스',
  description: '약국 기반 CGM 관리 서비스',
  category: 'health',
  basedOn: 'diabetes-care',  // 기존 그룹 복제
  customization: {
    apps: {
      requiredCoreApps: ['cms-core', 'organization-core', 'pharmacy-core'],
      recommendedExtensions: ['cgm-integration', 'pharmacy-inventory'],
      incompatibleApps: ['dropshipping-cosmetics']
    }
  }
});
```

---

## 8. Validation

Service Group 정의 검증:

```typescript
const validation = serviceGroupRegistry.validate(diabetesCareServiceGroup);

// 결과:
// {
//   isValid: true,
//   errors: [],
//   warnings: ['Consider adding more default categories'],
//   score: 95
// }
```

### 필수 검증 항목

| 항목 | 설명 |
|------|------|
| `cms-core` in requiredCoreApps | 필수 |
| `organization-core` in requiredCoreApps | 필수 |
| defaultPreset 정의 | 필수 |
| initPackIdPattern 정의 | 필수 |
| templateIdPattern 정의 | 필수 |

---

## 9. API Reference

```typescript
// Service Group 등록
serviceGroupRegistry.register(definition);

// Service Group 조회
serviceGroupRegistry.get('diabetes-care');

// 모든 Service Groups 조회
serviceGroupRegistry.getAll();

// 활성 Service Groups만 조회
serviceGroupRegistry.getActive();

// 카테고리별 조회
serviceGroupRegistry.getByCategory('health');

// 검증
serviceGroupRegistry.validate(definition);

// 체크리스트
serviceGroupRegistry.getRegistrationChecklist('diabetes-care');

// 기존 그룹 기반 생성
serviceGroupRegistry.create(request);

// 통계
serviceGroupRegistry.getStats();
```

---

*최종 업데이트: 2025-12-11*
