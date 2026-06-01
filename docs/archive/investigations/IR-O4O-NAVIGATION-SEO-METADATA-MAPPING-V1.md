# IR-O4O-NAVIGATION-SEO-METADATA-MAPPING-V1

**조사 일자**: 2026-05-12  
**조사 범위**: O4O 전 서비스 navigation 구조 조사 + SEO metadata mapping 설계 기준 수립  
**목적**: 메뉴 구조 안정화 이후 SEO 적용을 위한 canonical 연결 구조 판단  
**선행 IR**: [IR-O4O-SEO-CANONICAL-STRUCTURE-AUDIT-V1](IR-O4O-SEO-CANONICAL-STRUCTURE-AUDIT-V1.md)  
**구현 작업**: 포함하지 않음 (구조 판단만)

---

## 1. 현재 navigation.ts 구조 조사

### 1-1. 공통 타입 (`GlobalHeaderNavItem`)

모든 서비스가 `@o4o/ui`의 `GlobalHeaderNavItem`을 사용.

```typescript
// 현재 구조 (추정)
interface GlobalHeaderNavItem {
  label: string;
  href: string;
  // SEO 필드 없음
}
```

서비스별 확장 인터페이스:

```typescript
// KPA-Society
interface KpaContextualNavItem extends GlobalHeaderNavItem {
  visibleWhen: 'pharmacyRelated' | 'storeOwner' | 'operator' | 'admin';
}

// GlycoPharm / K-Cosmetics / Neture — 동일 패턴
interface XxxContextualNavItem extends GlobalHeaderNavItem {
  visibleWhen: '...' | '...';
}
```

**결론**: `label` + `href` + `visibleWhen` 3개 필드만 존재. SEO 관련 필드 없음. 전 서비스 동일.

---

### 1-2. 서비스별 public nav 구조

| 서비스 | public nav 항목 | 비고 |
|--------|----------------|------|
| **KPA-Society** | 커뮤니티(`/`) | 1개만, 나머지 contextual |
| **GlycoPharm** | 홈(`/`) · 포럼(`/forum`) · 강의(`/lms`) | 3개 고정 |
| **K-Cosmetics** | 홈(`/`) · 포럼(`/forum`) · 강의(`/lms`) | GlycoPharm과 동일 구조 |
| **Neture** | Home(`/`) · 유통참여형펀딩 · Supplier · Partner · Contact · O4O소개 · 이용가이드 | 7개, B2B 중심 |

**관찰**: KPA-Society는 public nav가 `커뮤니티` 1개뿐이고 나머지를 role-based contextual로 처리. GlycoPharm/K-Cosmetics는 공통 3개 + contextual 패턴.

---

### 1-3. 서비스별 contextual nav (role-based)

| 서비스 | contextual nav | visibleWhen 조건 |
|--------|---------------|----------------|
| **KPA-Society** | 내 매장(`/store`) · 매장 HUB(`/store-hub`) | storeOwner / pharmacyRelated |
| **GlycoPharm** | 매장 HUB(`/store-hub`) · 내 매장(`/store`) | pharmacyRelated / storeOwner |
| **K-Cosmetics** | 매장 HUB · 내 매장 · 파트너(`/partner`) | storeManager / partner |
| **Neture** | contextual 없음 (빈 배열) | — |

---

## 2. 메뉴 ↔ URL ↔ 페이지 역할 매핑표

### 2-1. KPA-Society (canonical baseline)

| nav label | path | 현재 역할 | SEO identity 분류 |
|-----------|------|----------|-----------------|
| 커뮤니티 | `/` | 커뮤니티 홈 (게시판 목록) | community-home |
| (contextual) | `/forum` | 포럼 허브 | forum-hub |
| (contextual) | `/lms` | 강의 허브 | lms-hub |
| (contextual) | `/content` | 콘텐츠 허브 | content-hub |
| (contextual) | `/resources` | 자료실 | resources-hub |
| 내 매장 | `/store` | 매장 운영 대시보드 | store-dashboard |
| 매장 HUB | `/store-hub` | 약국 허브 | pharmacy-hub |
| — | `/about` | 서비스 소개 | about |
| — | `/contact` | 연락처 | contact |

**미노출 경로 (SEO 대상 아님)**:
- `/admin/*`, `/operator/*` — 인증 필요, 크롤 제외
- `/tablet/*`, `/qr/*` — 물리 채널용, 크롤 제외
- `/pharmacy` — 내부 프로필 페이지

**블로그 (동적)**:
- `/store/content/blog` — 블로그 목록
- `/store/content/blog/:id` — 게시물 상세 (최고 SEO 우선순위)

---

### 2-2. GlycoPharm

| nav label | path | SEO identity |
|-----------|------|-------------|
| 홈 | `/` | service-home |
| 포럼 | `/forum` | forum-hub |
| 강의 | `/lms` | lms-hub |
| (contextual) | `/store` | store-dashboard |
| (contextual) | `/store-hub` | pharmacy-hub |

동적 SEO 대상:
- `/store/:slug/blog/:postSlug` — 가장 높은 외부 검색 노출 가능성

---

### 2-3. K-Cosmetics

| nav label | path | SEO identity |
|-----------|------|-------------|
| 홈 | `/` | service-home |
| 포럼 | `/forum` | forum-hub |
| 강의 | `/lms` | lms-hub |
| (contextual) | `/store` | store-dashboard |
| (contextual) | `/store-hub` | store-hub |
| (contextual) | `/partner` | partner-hub |

---

### 2-4. Neture

| nav label | path | SEO identity |
|-----------|------|-------------|
| Home | `/` | service-home |
| 유통 참여형 펀딩 | `/market-trial` | market-trial-hub |
| Supplier | `/supplier` | supplier-hub |
| Partner | `/partner` | partner-hub |
| Contact Us | `/contact` | contact |
| O4O 플랫폼 소개 | `/o4o` | platform-about |
| 이용 가이드 | `/guide` | guide-hub |

Neture는 **퍼블릭 공개 페이지 비중이 가장 높음** — SEO 효과 직결.

---

## 3. 공통화 가능 SEO identity 분류

### 3-1. 공통 identity (전 서비스 공유 가능)

| identity key | 공통 path | 서비스별 title 패턴 |
|-------------|----------|-----------------|
| `service-home` | `/` | `{서비스명} — {한 줄 설명}` |
| `forum-hub` | `/forum` | `포럼 — {서비스명}` |
| `lms-hub` | `/lms` | `강의/교육 — {서비스명}` |
| `content-hub` | `/content` | `콘텐츠 — {서비스명}` |
| `store-dashboard` | `/store` | N/A (인증 필요 — 색인 제외 권장) |
| `pharmacy-hub` / `store-hub` | `/store-hub` | N/A (인증 필요 — 색인 제외 권장) |
| `about` | `/about` | `소개 — {서비스명}` |
| `contact` | `/contact` | `연락처 — {서비스명}` |
| `blog-list` | `/store/content/blog` | `블로그 — {서비스명}` |
| `blog-post` | `/store/content/blog/:id` | `{게시물 제목} — {서비스명}` ← 동적 |

### 3-2. 서비스 전용 identity

| identity key | 서비스 | path |
|-------------|--------|------|
| `market-trial-hub` | Neture | `/market-trial` |
| `supplier-hub` | Neture | `/supplier` |
| `partner-hub` | Neture, K-Cosmetics | `/partner` |
| `platform-about` | Neture | `/o4o` |
| `guide-hub` | Neture | `/guide` |
| `resources-hub` | KPA-Society | `/resources` |

---

## 4. SEO identity field 설계 — 구조 옵션 비교

### 옵션 A: navigation.ts 내부 `seo` 필드 포함

```typescript
interface GlobalHeaderNavItem {
  label: string;
  href: string;
  seo?: {
    title?: string;
    description?: string;
    canonicalPath?: string;
    noIndex?: boolean;
  };
}
```

**장점**:
- 메뉴 ↔ SEO가 한 파일에서 관리
- 새 메뉴 추가 시 SEO 자동 연동

**단점**:
- contextual nav (role-based) 항목도 SEO 필드를 갖게 됨 (불필요)
- `GlobalHeaderNavItem`이 `@o4o/ui` 공통 타입 — 변경 시 전 서비스 영향
- 메뉴에 없는 페이지(블로그 게시물 등)는 별도 관리 필요

**적합도**: ⚠️ 제한적 — header nav 항목만 커버, 동적 페이지 불가

---

### 옵션 B: 독립 SEO Registry (별도 파일)

```typescript
// services/web-kpa-society/src/config/seoRegistry.ts
export const SEO_REGISTRY: Record<string, PageSeoConfig> = {
  '/': {
    title: 'KPA Society — 대한약사회 약사 커뮤니티',
    description: '약사를 위한 전문 커뮤니티. 포럼, 강의, 자료실, 매장 운영 지원.',
    ogType: 'website',
    noIndex: false,
  },
  '/forum': {
    title: '포럼 — KPA Society',
    description: '약사 전문가 토론 및 정보 공유 공간',
    noIndex: false,
  },
  '/store': {
    noIndex: true, // 인증 필요 페이지
  },
  // ...
};
```

**장점**:
- navigation.ts와 완전히 분리 — 상호 영향 없음
- 동적 경로(블로그 게시물 등) 별도 처리 용이
- `@o4o/ui` 공통 타입 변경 불필요
- noIndex 정책 명시 가능

**단점**:
- navigation.ts와 sync 필요 (메뉴 추가 시 registry도 업데이트)
- 두 파일 관리

**적합도**: ✅ 권장 — 유지보수성과 확장성 모두 우수

---

### 옵션 C: Route module co-location

```typescript
// src/pages/forum/ForumHomePage.tsx
export const SEO_META = {
  title: '포럼 — KPA Society',
  description: '...',
};
```

**장점**:
- 페이지 파일과 메타가 함께 위치 — locality 높음

**단점**:
- sitemap 생성 시 모든 페이지 파일을 import해야 함
- 서비스 간 공통화 어려움
- 공통 registry가 없어 전체 SEO 관리 어려움

**적합도**: ⚠️ 단일 페이지 특수 메타에 보조적으로 사용 가능, 기본 구조로는 부적합

---

## 5. 권장 구조: 옵션 B (독립 SEO Registry)

### 5-1. 타입 정의

```typescript
// packages/shared-space-ui/src/seo/types.ts (또는 서비스별 로컬)

export interface PageSeoConfig {
  /** <title> */
  title: string;
  /** <meta name="description"> */
  description?: string;
  /** <meta property="og:type"> — 기본 'website' */
  ogType?: 'website' | 'article' | 'profile';
  /** <meta property="og:image"> URL */
  ogImage?: string;
  /** canonical href — 미지정 시 현재 URL 사용 */
  canonicalPath?: string;
  /** robots noindex — 인증 필요 페이지에 true */
  noIndex?: boolean;
  /** breadcrumb 구조 */
  breadcrumb?: Array<{ label: string; href: string }>;
}

export type SeoRegistry = Record<string, PageSeoConfig>;
```

### 5-2. 서비스별 registry 위치

```
services/web-kpa-society/src/config/seoRegistry.ts
services/web-glycopharm/src/config/seoRegistry.ts
services/web-k-cosmetics/src/config/seoRegistry.ts
services/web-neture/src/config/seoRegistry.ts
```

### 5-3. 공통 hook (packages/shared-space-ui)

```typescript
// packages/shared-space-ui/src/seo/usePageSeo.ts

export function usePageSeo(registry: SeoRegistry, pathname: string) {
  const config = registry[pathname] ?? null;
  useEffect(() => {
    if (!config) return;
    document.title = config.title;
    // description, og:*, canonical 처리
    // cleanup: 언마운트 시 index.html 기본값으로 복원
    return () => { /* cleanup */ };
  }, [config, pathname]);
}
```

---

## 6. 공통 vs 서비스별 override 범위

### 공통 적용 가능

| 경로 패턴 | 처리 방식 |
|-----------|---------|
| `/forum`, `/forum/all`, `/forum/post/:id` | 공통 template title ("포럼") + 서비스별 suffix |
| `/lms`, `/lms/course/:id` | 공통 template ("강의") |
| `/content`, `/content/:id` | 공통 template ("콘텐츠") |
| `/about`, `/contact` | 서비스별 직접 정의 |

### 서비스별 override 필요

| 경로 패턴 | 이유 |
|-----------|------|
| `/` (홈) | 서비스별 identity 완전히 다름 |
| `/store`, `/store-hub` | 서비스별 용어 다름, noIndex 정책 다를 수 있음 |
| 블로그 게시물 | 동적 — registry 아닌 API 기반 처리 필요 |
| Neture 전용 (`/market-trial`, `/supplier`, `/guide`) | KPA/Glyco에 없음 |

### noIndex 권장 대상

```
/admin/*         → noIndex: true (인증 필요)
/operator/*      → noIndex: true (인증 필요)
/store           → noIndex: true (인증 필요, 개인 데이터)
/store-hub       → noIndex: true (인증 필요)
/mypage/*        → noIndex: true (개인 정보)
/tablet/*        → noIndex: true (물리 채널 전용)
```

---

## 7. 메뉴 안정화 이후 SEO 적용 순서

```
Phase 0 (선행 조건)
  └── 메뉴 구조 freeze (navigation.ts 안정화)
  └── URL 구조 freeze (route 변경 없음 확인)

Phase 1 — index.html 기본 강화 (각 서비스 독립 적용, 즉시 가능)
  ├── <meta name="description"> 추가
  ├── <meta property="og:title/description/type/url"> 추가
  └── 서비스별 배포

Phase 2 — 정적 파일 추가 (각 서비스, 즉시 가능)
  ├── public/robots.txt 추가 (noIndex 경로 Disallow 포함)
  └── public/sitemap.xml 추가 (고정 라우트만, 빌드 스크립트)

Phase 3 — SEO Registry 구현 (공통 패키지 작업)
  ├── PageSeoConfig 타입 정의 (shared-space-ui)
  ├── usePageSeo 훅 구현 (shared-space-ui)
  ├── 서비스별 seoRegistry.ts 작성
  └── App.tsx에서 usePageSeo 호출 연결

Phase 4 — 동적 메타 강화
  ├── useBlogSeo cleanup 추가
  ├── useBlogSeo twitter:* 추가
  ├── 블로그 게시물 canonical 추가
  └── 블로그 게시물 JSON-LD Article 추가

Phase 5 — 구조적 SEO (서비스 성숙도 기준 결정)
  ├── Vite SSG (빌드타임 prerender) 도입 검토
  ├── 동적 sitemap 생성 (블로그 게시물 포함)
  └── JSON-LD Organization / Person (약사 프로필)
```

---

## 8. GlobalHeaderNavItem 변경 권고

현재 `@o4o/ui`의 `GlobalHeaderNavItem`은 변경하지 않는다.

**근거**:
- SEO 필드는 navigation과 1:1 매핑이 아님 (메뉴 없는 페이지도 SEO 대상)
- `@o4o/ui`는 전 서비스 공유 — SEO 목적으로 변경 시 scope 초과
- 독립 registry가 더 유연하고 관리 용이

**예외**: `noIndex` 힌트를 nav 항목에 두면 관리 편의성이 높아짐 — Phase 3에서 재검토 가능.

---

## 9. PASS / ISSUE / RECOMMEND

### PASS

| ID | 항목 |
|----|------|
| NAV-PASS-01 | 전 서비스 navigation.ts가 `GlobalHeaderNavItem` 표준 타입 준수 — 확장 기반 확보 |
| NAV-PASS-02 | `visibleWhen` 조건 기반 노출 제어로 admin/operator 경로가 헤더에 미노출 — noIndex 대상 명확 |

### ISSUE

| ID | 항목 | 심각도 |
|----|------|--------|
| NAV-01 | SEO 필드 미존재 — navigation과 SEO가 완전히 단절 | 높음 |
| NAV-02 | noIndex 정책 미정의 — 인증 필요 경로(store, admin, mypage)가 크롤 차단 설정 없음 | 중 |
| NAV-03 | KPA-Society 헤더 public nav가 `커뮤니티` 1개뿐 — 포럼/LMS/자료실 등 공개 콘텐츠가 헤더 진입점 없음 (SEO 연결 단절) | 중 |
| NAV-04 | 동적 경로(블로그 게시물 등)는 registry 구조 없이는 SEO 처리 불가 | 중 |
| NAV-05 | breadcrumb 구조 미정의 — 계층적 페이지에서 검색 결과 breadcrumb 표시 불가 | 낮음 |

### RECOMMEND

| ID | 권장 사항 | 우선순위 |
|----|---------|---------|
| NAV-R01 | **독립 seoRegistry.ts** 도입 (옵션 B) — navigation과 분리된 SEO 설정 파일 | Phase 3 |
| NAV-R02 | **PageSeoConfig 타입** + **usePageSeo 훅** → `shared-space-ui` 공통화 | Phase 3 |
| NAV-R03 | **noIndex 경로 목록** 확정 후 robots.txt Disallow 반영 | Phase 2 |
| NAV-R04 | KPA-Society nav에 `/forum`, `/lms`, `/resources` public 항목 추가 검토 (SEO 진입점 확보) | 메뉴 freeze 후 |
| NAV-R05 | 블로그 게시물은 registry 아닌 API 기반 동적 처리 — `useBlogSeo` 강화로 대응 | Phase 4 |
| NAV-R06 | breadcrumb은 Phase 4 이후 JSON-LD BreadcrumbList와 함께 설계 | Phase 5 |

---

## 10. 최종 판단: canonical SEO-navigation 연결 구조

```
[navigation.ts]         [seoRegistry.ts]
  label + href    →→→   path → PageSeoConfig
  visibleWhen     (독립)  title, description, og:*, canonical, noIndex
                          ↓
                  [usePageSeo(registry, location.pathname)]
                          ↓
                  document.title, <meta>, <link rel="canonical">
                  (App.tsx 또는 Layout 최상단에서 호출)
                          ↓
                  동적 페이지는 useBlogSeo 등 page-level 훅으로 override
```

**핵심 원칙**:
1. navigation.ts는 SEO 정보를 갖지 않는다 — 역할 분리
2. seoRegistry.ts가 path → SEO config의 단일 소스
3. 동적 페이지(블로그 게시물)는 page-level override로 처리
4. noIndex 정책은 registry에 명시 → robots.txt와 이중 보호

---

*Status: INVESTIGATION COMPLETE — 구현 작업 미포함*  
*후속 WO 선행 조건: Phase 0 (메뉴 구조 freeze) 완료*  
*후속 WO 예상: WO-O4O-SEO-REGISTRY-FOUNDATION-V1 (Phase 1~3 통합)*
