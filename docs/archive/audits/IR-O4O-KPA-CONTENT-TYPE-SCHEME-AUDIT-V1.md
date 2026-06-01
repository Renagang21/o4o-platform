# IR-O4O-KPA-CONTENT-TYPE-SCHEME-AUDIT-V1

> CMS 콘텐츠 type 체계 현황 조사 및 사용 중심 분류 재매핑 타당성 분석

**작성일**: 2026-04-11
**상태**: Complete

---

## 1. Executive Summary

현재 O4O 플랫폼 CMS는 **8가지 콘텐츠 타입을 정의**하지만, **백엔드 API 생성 시에는 4가지만 허용**하며, **실제 프로덕션 데이터는 3가지 타입에만 존재**한다. 프론트엔드 Hub 페이지는 7가지 탭 필터를 제공하지만 대부분 빈 결과를 반환한다.

**핵심 결론**: 기존 CMS 타입을 유지하면서 **프론트엔드에서 display-only 매핑**으로 Hub UX를 개선하는 것이 최적. 백엔드 변경 불필요.

---

## 2. Phase A — 현재 콘텐츠 type 정의

### 2.1 3-Layer Type 정의 불일치

| Layer | 위치 | 허용 타입 | 개수 |
|-------|------|----------|------|
| **Entity (cms-core)** | `packages/cms-core/src/entities/CmsContent.entity.ts:22` | `hero` `notice` `news` `featured` `promo` `event` `guide` `knowledge` | **8** |
| **Shared Types** | `packages/types/src/content.ts:15` | 위와 동일 | **8** |
| **Backend Validation** | `apps/api-server/src/routes/cms-content/cms-content-utils.ts:13` | `hero` `notice` `guide` `knowledge` | **4** |
| **Frontend Hub Tabs** | `services/web-kpa-society/.../HubContentLibraryPage.tsx:34-42` | `all` `notice` `news` `guide` `knowledge` `event` `promo` | **7** (all 제외 6) |

### 2.2 타입별 정의 상세

| DB Type | Entity ✓ | Backend Create ✓ | Frontend Tab ✓ | UI Label |
|---------|:--------:|:-----------------:|:--------------:|----------|
| `hero` | ✓ | ✓ | ✗ (배너, Hub 미노출) | 배너 |
| `notice` | ✓ | ✓ | ✓ | 공지사항 |
| `news` | ✓ | ✗ | ✓ | 뉴스 |
| `featured` | ✓ | ✗ | ✗ | 추천 |
| `promo` | ✓ | ✗ | ✓ | 프로모션 (혜택/쿠폰) |
| `event` | ✓ | ✗ | ✓ | 이벤트 |
| `guide` | ✓ | ✓ | ✓ | 가이드 |
| `knowledge` | ✓ | ✓ | ✓ | 지식자료 |

### 2.3 Backend Query vs. Mutation 비대칭

- **GET /cms/contents**: `type` 파라미터에 **아무 값이나** 전달 가능 (validation 없음)
- **POST/PUT /cms/contents**: `VALID_CONTENT_TYPES` (`hero`, `notice`, `guide`, `knowledge`) 외 거부
- **GET /cms/stats**: `hero`, `notice`, `news`, `featured`, `promo`, `event` 6가지만 하드코딩 집계 (`guide`, `knowledge` 누락)

### 2.4 서비스별 프론트엔드 Tab 비교

| 서비스 | 탭 구성 |
|--------|---------|
| **KPA Society** | all, notice, news, guide, knowledge, event, promo (7개) |
| **GlycoPharm** | all, notice, guide, knowledge, promo, news (6개) |
| **Neture** | all, notice, guide, knowledge, promo, news (6개) |

KPA만 `event` 탭이 추가되어 있다. GlycoPharm/Neture는 동일 구성.

---

## 3. Phase B — 실제 데이터 분포

### 3.1 글로벌 (전체 serviceKey)

| Type | Total (draft 포함) | Published | Draft/Archived |
|------|:---------:|:---------:|:--------------:|
| `hero` | 30 | 30 | 0 |
| `notice` | 10 | 5 | 5 |
| `news` | 2 | 0 | 2 |
| `featured` | 0 | 0 | 0 |
| `promo` | 24 | 24 | 0 |
| `event` | 0 | 0 | 0 |
| `guide` | 0 | 0 | 0 |
| `knowledge` | 0 | 0 | 0 |
| **합계** | **66** | **59** | **7** |

### 3.2 serviceKey별 분포

| serviceKey | hero | notice | news | promo | guide | knowledge | event | featured |
|------------|:----:|:------:|:----:|:-----:|:-----:|:---------:|:-----:|:--------:|
| `kpa` | 1 | 3 (1 pub) | 0 | 0 | 0 | 0 | 0 | 0 |
| `glycopharm` | 1 | 2 (1 pub) | 0 | 0 | 0 | 0 | 0 | 0 |
| `neture` | 0 | 5 (3 pub) | 0 | 0 | 0 | 0 | 0 | 0 |
| `cosmetics` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `glucoseview` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| (null/global) | 30 | 5 | 2 | 24 | 0 | 0 | 0 | 0 |

### 3.3 핵심 발견

1. **데이터가 존재하는 타입은 3개뿐**: `hero`(30), `notice`(10), `promo`(24)
2. **`news`는 2건 있지만 모두 미발행** (draft/archived)
3. **`guide`, `knowledge`, `event`, `featured`는 데이터 0건**
4. **대부분 데이터가 serviceKey=null** (글로벌 플랫폼 레벨)
5. 서비스별 콘텐츠는 극소수 (KPA: 4건, GlycoPharm: 3건, Neture: 5건)

---

## 4. Phase C — 콘텐츠 성격 분석

### 4.1 hero (30건) — 배너/히어로 슬라이드

```
- 종로중앙약국 야간 영업 안내 [admin/platform/PINNED]
- 대한약사회 디지털 전환 프로젝트 [admin/platform/PINNED]
- 2026년 보수교육 온라인 신청 안내 [admin/platform/PINNED]
- [녹십자] 2026 독감 백신 사전 예약 [admin/platform/PINNED]
- 대한약사회에 오신 것을 환영합니다 [admin/platform]
```

**성격**: 메인 페이지 배너, 프로모션 배너, 공지 배너 혼합. Hub에 노출하지 않는 internal display 타입.

### 4.2 notice (10건, 5 published) — 공지사항

```
- 서비스 이용 안내 [admin/platform/PINNED]
- 인트라넷 이용 안내 [admin/platform/PINNED]
- 네뚜레 플랫폼 오픈 안내 [admin/platform/PINNED]
- 공급자 등록 가이드 [admin/platform]
- 파트너십 신청 안내 [admin/platform]
```

**성격**: 플랫폼 운영 공지, 서비스 안내, 가이드 성격 혼합. "공급자 등록 가이드"처럼 `guide` 타입이 더 적합한 콘텐츠도 `notice`로 분류됨.

### 4.3 promo (24건) — 프로모션/혜택

```
- 첫 방문 고객 건강검진 무료 [admin/platform/PINNED]
- 신규 가입 약사 보수교육비 지원 [admin/platform/PINNED]
- 약국 디지털 사이니지 설치비 50% 지원 [admin/platform/PINNED]
- [녹십자] 독감 백신 조기 예약 할인 [admin/platform]
- [한미약품] 신규 거래 약국 첫 주문 10% 할인 [admin/platform]
```

**성격**: B2B 할인, 제약사 프로모션, 교육비 지원 등. 이벤트성과 상시 혜택이 혼합.

### 4.4 news (2건, 미발행) — 뉴스

발행된 뉴스 콘텐츠 없음. Draft 상태의 2건만 존재.

---

## 5. Phase D — 사용 중심 type 재매핑 제안

### 5.1 현재 문제

| 문제 | 설명 |
|------|------|
| **빈 탭 과다** | Hub 7개 탭 중 실제 데이터가 있는 탭은 notice + promo = 2개 (hero는 Hub 미노출) |
| **타입 경계 모호** | "공급자 등록 가이드"가 notice에, 교육 지원이 promo에 분류 |
| **Backend 제한 불일치** | Entity는 8타입이지만 생성은 4타입만 허용 → `promo`, `news`, `event`는 생성 불가 |
| **stats 누락** | `/cms/stats`에서 `guide`, `knowledge` 집계 없음 |

### 5.2 Hub Display 매핑 제안

**원칙**: DB type 유지, 프론트엔드에서 display category로 리매핑

| DB Type | Hub Display Category | 한글 | 비고 |
|---------|---------------------|------|------|
| `hero` | — | — | Hub 미노출 유지 (배너 전용) |
| `notice` | 공지/소식 | 공지/소식 | notice + news 통합 표시 |
| `news` | 공지/소식 | 공지/소식 | notice와 병합 |
| `guide` | 가이드 | 가이드 | 단독 유지 |
| `knowledge` | 지식자료 | 지식자료 | 단독 유지 |
| `promo` | 혜택/이벤트 | 혜택/이벤트 | promo + event 통합 표시 |
| `event` | 혜택/이벤트 | 혜택/이벤트 | promo와 병합 |
| `featured` | — | — | Hub 미노출 (운영자 추천 플래그 역할) |

### 5.3 재매핑 후 Hub Tab 구성

```
전체 | 공지/소식 | 가이드 | 지식자료 | 혜택/이벤트
```

5개 탭 (현재 7개 → 5개). 빈 탭 없이 의미있는 분류.

### 5.4 대안: 데이터 현황 기반 최소 탭

현재 데이터가 존재하는 타입만 노출:

```
전체 | 공지사항 | 프로모션
```

3개 탭. 데이터 없는 탭 완전 제거. 콘텐츠 확장 시 탭 동적 추가.

---

## 6. Phase E — 구현 난이도 평가

### 6.1 Option A: Frontend-only 매핑 (권장)

| 항목 | 내용 |
|------|------|
| **변경 범위** | 프론트엔드 Hub 페이지만 (KPA, GlycoPharm, Neture) |
| **Backend 변경** | 없음 |
| **DB 변경** | 없음 |
| **구현 시간** | 0.5일 |
| **위험도** | 매우 낮음 |

```typescript
// 매핑 상수 (packages/types 또는 각 서비스)
const HUB_DISPLAY_MAP: Record<ContentType, string> = {
  notice: '공지/소식',
  news: '공지/소식',
  guide: '가이드',
  knowledge: '지식자료',
  promo: '혜택/이벤트',
  event: '혜택/이벤트',
};

const HUB_DISPLAY_TABS = [
  { key: 'all', label: '전체', dbTypes: null },
  { key: 'notice-news', label: '공지/소식', dbTypes: ['notice', 'news'] },
  { key: 'guide', label: '가이드', dbTypes: ['guide'] },
  { key: 'knowledge', label: '지식자료', dbTypes: ['knowledge'] },
  { key: 'promo-event', label: '혜택/이벤트', dbTypes: ['promo', 'event'] },
];
```

탭 선택 시 DB type 배열로 API 호출 (현재 API는 단일 type만 지원하므로 2회 호출 후 merge, 또는 client-side filter).

### 6.2 Option B: Backend type[] 파라미터 추가

| 항목 | 내용 |
|------|------|
| **변경 범위** | Backend query handler + Frontend |
| **구현 시간** | 1일 |
| **위험도** | 낮음 (query 로직만 변경) |

```typescript
// Backend: type 파라미터를 배열로 확장
if (type) {
  const types = (type as string).split(',');
  where.type = types.length === 1 ? types[0] : In(types);
}
```

### 6.3 Option C: VALID_CONTENT_TYPES 확장

Backend `VALID_CONTENT_TYPES`에 나머지 4타입 추가:

```typescript
export const VALID_CONTENT_TYPES = [
  'hero', 'notice', 'guide', 'knowledge',
  'news', 'featured', 'promo', 'event'
] as const;
```

이는 운영자가 모든 타입의 콘텐츠를 생성할 수 있게 하지만, 현재 운영 규모로는 불필요. cms-core Frozen 정책과는 무관 (utils 파일은 core 외부).

---

## 7. Phase F — 미래 확장 고려

### 7.1 신규 타입 추가 가능성

| 후보 타입 | 용도 | 추가 방식 |
|-----------|------|----------|
| `faq` | 자주 묻는 질문 | Entity 타입 추가 + VALID_CONTENT_TYPES 확장 |
| `regulation` | 규정/법률 안내 | 위와 동일 |
| `education` | 보수교육 자료 | 위와 동일, 또는 LMS Core 활용 |
| `product-guide` | 상품 가이드 | `guide` + metadata로 구분 가능 |

### 7.2 확장 전략

1. **DB 타입 추가**: `cms_contents.type`은 `VARCHAR(50)` — CHECK constraint 없으므로 DB 마이그레이션 불필요
2. **Entity 타입 확장**: `ContentType` union에 추가 (cms-core Frozen → WO 필요)
3. **프론트엔드 매핑만으로 충분한 경우**: 기존 타입 활용 + `metadata` JSONB로 세부 구분

### 7.3 권장 확장 패턴

```
신규 콘텐츠 필요 → 기존 8타입으로 커버 가능?
  → YES: metadata로 세부 분류 (예: guide + metadata.target='patient')
  → NO:  WO 작성 → Entity 타입 추가 → VALID_CONTENT_TYPES 추가 → Hub 매핑 추가
```

---

## 8. 최종 권장사항

### 즉시 조치 (Low-effort, High-impact)

1. **Hub Tab 재구성**: 7탭 → 5탭 (공지/소식, 가이드, 지식자료, 혜택/이벤트) — Frontend-only
2. **빈 탭 동적 숨김**: 데이터 0건 탭은 자동 비노출 (progressive disclosure)
3. **stats 엔드포인트 보완**: `guide`, `knowledge` 집계 추가 (하드코딩 확장)

### 중기 조치 (선택)

4. **Backend type[] 파라미터**: 복합 타입 탭 (공지/소식=notice+news) API 효율화
5. **VALID_CONTENT_TYPES 확장**: `news`, `promo`, `event` 생성 허용 (운영 필요 시)

### 원칙

- **기존 DB type 유지**: 리매핑은 프론트엔드 display layer에서만
- **cms-core 변경 불가**: Frozen 정책 준수 (§3, F5)
- **서비스별 독립 매핑**: KPA/GlycoPharm/Neture 각자 Hub Tab 구성 가능

---

## 부록: 파일 참조

| 파일 | 역할 |
|------|------|
| `packages/cms-core/src/entities/CmsContent.entity.ts:22` | ContentType 정의 (8타입) |
| `packages/types/src/content.ts:15` | 프론트엔드 ContentType (8타입) |
| `packages/types/src/content.ts:108-117` | CONTENT_TYPE_LABELS |
| `apps/api-server/src/routes/cms-content/cms-content-utils.ts:13` | VALID_CONTENT_TYPES (4타입) |
| `apps/api-server/src/routes/cms-content/cms-content-query.handler.ts:133-239` | GET /contents (type 무검증) |
| `apps/api-server/src/routes/cms-content/cms-content-query.handler.ts:32-116` | GET /stats (6타입 하드코딩) |
| `apps/api-server/src/routes/cms-content/cms-content-mutation.handler.ts:141-148` | POST validation |
| `services/web-kpa-society/src/pages/pharmacy/HubContentLibraryPage.tsx:32-42` | KPA Hub TYPE_TABS (7탭) |
| `services/web-glycopharm/src/pages/hub/HubContentListPage.tsx:47-54` | GlycoPharm TYPE_FILTERS (6탭) |
| `services/web-neture/src/pages/library/ContentLibraryPage.tsx:18-25` | Neture TYPE_FILTERS (6탭) |
