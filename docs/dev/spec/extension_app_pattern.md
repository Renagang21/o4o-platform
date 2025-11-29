# Extension App Pattern 규약

## 개요

O4O 플랫폼의 앱 시스템은 **Core + Extension** 구조를 지원합니다.
- **Core App**: 데이터 테이블을 소유하고 핵심 비즈니스 로직을 제공하는 앱
- **Extension App**: Core App을 확장하여 서비스별 UI/설정/ACF만 담당하는 앱

## 핵심 원칙

### 1. 데이터 소유권 분리
- **Core App만** 데이터 테이블을 소유합니다
- Extension App은 **절대** 코어 테이블을 수정하지 않습니다
- Extension App은 ACF(Additional Custom Fields) 또는 확장 테이블만 사용합니다

### 2. 역할 분리

#### Core App 역할:
- DB 테이블 소유 (`ownsTables`)
- 엔티티 정의
- 핵심 비즈니스 로직
- 기본 API 엔드포인트
- 기본 권한 정의

#### Extension App 역할:
- UI 레이아웃/텍스트/스타일 커스터마이징
- 서비스별 기본 설정 (카테고리, 정책 등)
- ACF를 통한 추가 데이터 필드
- 확장 테이블 (선택사항)

### 3. 의존성 관리
- Extension App은 Core App에 **명시적 의존성**을 선언합니다
- AppManager는 설치 시 의존성 그래프를 생성하고 순서를 보장합니다
- Core App 제거 시 의존하는 Extension App이 있으면 차단합니다

---

## Extension App Manifest 규약

### 필수 필드

```typescript
{
  appId: string;              // 앱 고유 ID (예: "forum-neture")
  type: "extension";          // 반드시 "extension"으로 설정
  version: string;            // 시맨틱 버저닝

  dependencies: {             // Core App 의존성
    [coreAppId: string]: string;  // 예: { "forum-core": ">=1.0.0" }
  };
}
```

### 선택 필드

```typescript
{
  extendsCPT?: Array<{        // 확장할 CPT 목록
    name: string;             // CPT 이름 (예: "forum_post")
    acfGroup?: string;        // 연결할 ACF 그룹 ID
  }>;

  acf?: Array<{               // ACF 그룹 정의
    groupId: string;
    fields: Array<{
      key: string;
      type: string;
      label?: string;
      required?: boolean;
    }>;
  }>;

  adminRoutes?: Array<{       // Admin UI 라우트 (Core를 오버라이드)
    path: string;
    component: string;
  }>;

  defaultConfig?: object;     // 기본 설정 (카테고리, 스킨 등)
}
```

---

## 예시: forum-neture (화장품 매장 전용 포럼)

### Manifest

\`\`\`typescript
// packages/forum-neture/src/manifest.ts
export const forumNetureManifest = {
  appId: "forum-neture",
  name: "Forum for Neture Cosmetics",
  type: "extension" as const,
  version: "1.0.0",
  description: "화장품 매장 특화 포럼 (피부타입, 루틴, 제품 연동)",

  // Core 의존성
  dependencies: {
    "forum-core": ">=1.0.0"
  },

  // forum_post CPT 확장
  extendsCPT: [
    {
      name: "forum_post",
      acfGroup: "cosmetic_meta"
    }
  ],

  // ACF 그룹 정의
  acf: [
    {
      groupId: "cosmetic_meta",
      label: "화장품 메타데이터",
      fields: [
        {
          key: "skinType",
          type: "select",
          label: "피부 타입",
          options: ["건성", "지성", "복합성", "민감성"]
        },
        {
          key: "concerns",
          type: "multiselect",
          label: "피부 고민",
          options: ["여드름", "주름", "미백", "모공", "탄력"]
        },
        {
          key: "routine",
          type: "array",
          label: "루틴 단계"
        },
        {
          key: "productIds",
          type: "array",
          label: "관련 제품 ID"
        }
      ]
    }
  ],

  // Admin UI (Core UI 오버라이드)
  adminRoutes: [
    {
      path: "/admin/forum",
      component: "./admin-ui/ForumNetureApp.js"
    }
  ],

  // 기본 설정
  defaultConfig: {
    categories: [
      { name: "공지사항", slug: "announcements", color: "#FF6B6B" },
      { name: "사용후기", slug: "reviews", color: "#4ECDC4" },
      { name: "질문답변", slug: "qna", color: "#95E1D3" },
      { name: "이벤트", slug: "events", color: "#FFD93D" }
    ],
    skin: "neture",
    brandColor: "#8B7355",
    accentColor: "#E8B4B8"
  }
};
\`\`\`

### 패키지 구조

\`\`\`
packages/forum-neture/
├── package.json
├── tsconfig.json
├── src/
│   ├── manifest.ts                   # Extension manifest
│   ├── admin-ui/
│   │   ├── ForumNetureApp.tsx       # Custom Admin UI
│   │   ├── components/
│   │   │   ├── SkinTypeFilter.tsx
│   │   │   └── RoutineBuilder.tsx
│   │   └── styles/
│   │       └── neture-theme.css
│   ├── lifecycle/
│   │   ├── install.ts               # Extension 설치 로직
│   │   └── activate.ts              # Extension 활성화 로직
│   └── config/
│       └── default-categories.ts
└── dist/                             # 빌드 출력
\`\`\`

---

## 예시: forum-yaksa (약사 조직 전용 포럼)

### Manifest

\`\`\`typescript
// packages/forum-yaksa/src/manifest.ts
export const forumYaksaManifest = {
  appId: "forum-yaksa",
  name: "Forum for Yaksa Organization",
  type: "extension" as const,
  version: "1.0.0",
  description: "약사 조직 특화 포럼 (복약지도, 약물 정보, 케이스 스터디)",

  dependencies: {
    "forum-core": ">=1.0.0"
  },

  extendsCPT: [
    {
      name: "forum_post",
      acfGroup: "pharmacy_meta"
    }
  ],

  acf: [
    {
      groupId: "pharmacy_meta",
      label: "약물 메타데이터",
      fields: [
        {
          key: "drugName",
          type: "string",
          label: "약물명"
        },
        {
          key: "drugCode",
          type: "string",
          label: "약물 코드 (EDI)"
        },
        {
          key: "category",
          type: "select",
          label: "카테고리",
          options: ["복약지도", "부작용", "상호작용", "조제"]
        },
        {
          key: "severity",
          type: "select",
          label: "중요도",
          options: ["일반", "주의", "경고"]
        },
        {
          key: "caseStudy",
          type: "boolean",
          label: "케이스 스터디"
        }
      ]
    }
  ],

  adminRoutes: [
    {
      path: "/admin/forum",
      component: "./admin-ui/ForumYaksaApp.js"
    }
  ],

  defaultConfig: {
    categories: [
      { name: "복약지도", slug: "medication-guidance" },
      { name: "부작용 공유", slug: "side-effects" },
      { name: "약물 상호작용", slug: "drug-interactions" },
      { name: "조제 노하우", slug: "dispensing-tips" }
    ],
    skin: "yaksa",
    requireApproval: true  // 약사 전용 - 승인 필요
  }
};
\`\`\`

---

## ACF/확장 테이블 패턴

### 방식 A: JSONB 메타 구조 사용 (권장)

Forum Core의 ForumPost 엔티티에 metadata 필드가 있다고 가정:

\`\`\`typescript
// ForumPost entity
@Column({ type: 'jsonb', nullable: true })
metadata?: {
  neture?: {
    skinType: string;
    concerns: string[];
    routine: string[];
    productIds: string[];
  };
  yaksa?: {
    drugName: string;
    drugCode: string;
    category: string;
    severity: string;
    caseStudy: boolean;
  };
};
\`\`\`

Extension App은 자기 namespace만 사용:
\`\`\`typescript
// forum-neture에서 데이터 저장
post.metadata.neture = {
  skinType: "지성",
  concerns: ["여드름", "모공"],
  routine: ["클렌징", "토너", "세럼"],
  productIds: ["prod-123", "prod-456"]
};
\`\`\`

### 방식 B: 확장 테이블 규칙

테이블 명명 규칙: `{core_table}__{extension_app}`

\`\`\`sql
-- forum-neture 확장 테이블
CREATE TABLE forum_post__neture (
  post_id UUID PRIMARY KEY REFERENCES forum_post(id) ON DELETE CASCADE,
  skin_type VARCHAR(50),
  concerns TEXT[],
  routine JSONB,
  product_ids TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- forum-yaksa 확장 테이블
CREATE TABLE forum_post__yaksa (
  post_id UUID PRIMARY KEY REFERENCES forum_post(id) ON DELETE CASCADE,
  drug_name VARCHAR(200),
  drug_code VARCHAR(50),
  category VARCHAR(100),
  severity VARCHAR(50),
  case_study BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

---

## AppManager 의존성 처리

### 설치 순서

\`\`\`typescript
// 사용자가 forum-neture를 설치 요청
await appManager.install("forum-neture");

// AppManager 내부 동작:
// 1. Dependency graph 생성
const graph = {
  "forum-core": [],
  "forum-neture": ["forum-core"]
};

// 2. Topological sort
const installOrder = ["forum-core", "forum-neture"];

// 3. 순차 설치
for (const appId of installOrder) {
  await installApp(appId);
}
\`\`\`

### 제거 순서

\`\`\`typescript
// 사용자가 forum-core를 제거 요청
await appManager.uninstall("forum-core");

// AppManager 내부 동작:
// 1. 의존성 확인
const dependents = await appManager.findDependentApps("forum-core");
// → ["forum-neture", "forum-yaksa"]

// 2. 의존성이 있으면 차단
if (dependents.length > 0) {
  throw new Error(
    `Cannot uninstall forum-core: ` +
    `The following apps depend on it: forum-neture, forum-yaksa. ` +
    `Please uninstall these apps first.`
  );
}
\`\`\`

---

## 서비스 번들 조합

각 서비스는 Core + Extension 조합으로 구성됩니다.

### Neture 서비스 번들

\`\`\`json
{
  "profileId": "neture-cosmetics",
  "name": "Neture 화장품 매장",
  "apps": [
    { "appId": "catalog-core", "version": ">=2.0.0" },
    { "appId": "catalog-neture", "version": ">=1.0.0" },
    { "appId": "forum-core", "version": ">=1.0.0" },
    { "appId": "forum-neture", "version": ">=1.0.0" }
  ]
}
\`\`\`

### Yaksa 서비스 번들

\`\`\`json
{
  "profileId": "yaksa-branch",
  "name": "약사 조직 관리",
  "apps": [
    { "appId": "b2b-core", "version": ">=3.0.0" },
    { "appId": "b2b-yaksa", "version": ">=1.0.0" },
    { "appId": "forum-core", "version": ">=1.0.0" },
    { "appId": "forum-yaksa", "version": ">=1.0.0" }
  ]
}
\`\`\`

---

## 정리

Extension App 패턴의 핵심:
1. **Core는 데이터 소유자**, Extension은 UI/설정 전담
2. Extension은 ACF 또는 확장 테이블로만 데이터 추가
3. 명시적 의존성 선언으로 AppManager가 순서 보장
4. 서비스별 번들로 Core + Extension 조합 관리

이 패턴을 통해:
- 코어 엔진 리팩토링/업데이트를 한 곳에서 관리
- 서비스별 특화 기능을 분리하여 유지보수 향상
- 다중 서비스 환경에서 코드 재사용성 극대화
