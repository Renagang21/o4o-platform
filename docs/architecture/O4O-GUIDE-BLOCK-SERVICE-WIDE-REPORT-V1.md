# O4O GuideBlock 서비스 전체 1차 적용 보고서

> **WO-O4O-GUIDE-BLOCK-SERVICE-WIDE-REPORT-V1**
>
> O4O 4개 서비스 GuideBlock 1차 적용 완료 현황 정리.
> 패턴 분류 / 충돌 사례 / skip 갭 / 향후 후속 후보를 기록한다.

---

## 1. 적용 완료 현황

| 서비스 | 상태 | 커밋 |
|--------|------|------|
| **KPA-Society** | ✅ 완료 | `8215e94dd` |
| **GlycoPharm** | ✅ 완료 | `8fa5a7c65` |
| **K-Cosmetics** | ✅ 완료 | `774b6f60a` |
| **Neture** | ✅ 완료 | `c8e4df477` |

---

## 2. Guide 시스템 구성

```
[운영자]
  → /operator/guide-contents (OperatorGuideContentsPage)
  → GuideContentsManager (서비스별)
  → API: POST /api/v1/guide/contents
        { serviceKey, pageKey, sectionKey, content: JSON string }

[페이지]
  → fetchGuidePageContent(serviceKey, pageKey)
  → API: GET /api/v1/guide/contents?serviceKey=...&pageKey=...
  → 반환: sections map { [sectionKey]: string }

[화면 표시]
  GuideBlock (read-only 안내 카드, @o4o/shared-space-ui)
  + DB override: sections['page-help'] → JSON.parse → title/description/steps 주입
  + fallback: 하드코딩 한국어 안내

[인라인 편집]
  GuideEditableSection (운영자 inline 직접 편집, @o4o/shared-space-ui)
  → plain text 저장
  → 페이지 내 특정 문구를 운영자가 바로 수정 가능

[격리 키]
  serviceKey + pageKey + sectionKey 3-tuple
  → 서비스 간 / 페이지 간 / 섹션 간 완전 격리
```

---

## 3. 서비스별 적용 현황

### 3-1. KPA-Society (10 pages)

| pageKey | 파일 | 패턴 |
|---------|------|------|
| `lms.course.editor` | `instructor/courses/CourseEditPage.tsx` | A (DB override) |
| `lms.lesson.editor` | `instructor/courses/CourseEditPage.tsx` | A (기존 적용) |
| `lms.quiz.editor` | `instructor/courses/QuizBuilder.tsx` | B (static fallback) |
| `lms.assignment.editor` | `instructor/courses/AssignmentEditor.tsx` | B (static fallback) |
| `lms.live.editor` | `instructor/courses/LiveEditor.tsx` | B (static fallback) |
| `content.document.editor` | `contents/ContentWritePage.tsx` | A (DB override) |
| `content.resource.editor` | `resources/ResourceWritePage.tsx` | A (DB override) |
| `forum.request.management` | `operator/ForumDeleteRequestsPage.tsx` | A (DB override) |
| `store.channel.editor` | `pharmacy/StoreChannelsPage.tsx` | A (DB override, GuideEditableSection 공존) |
| `signage.playlist.manager` | `signage/PlaylistEditorPage.tsx` | A (DB override) |

> `lms.quiz.editor`, `lms.assignment.editor`, `lms.live.editor`: 모달 내 마운트 구조로 독립 fetch 복잡 → static fallback 채택

### 3-2. GlycoPharm (4 pages)

| pageKey | 파일 | 패턴 |
|---------|------|------|
| `store.channel.editor` | `store/StoreChannelsPage.tsx` | A (DB override, GuideEditableSection 공존) |
| `forum.request.management` | `operator/ForumDeleteRequestsPage.tsx` | A (DB override) |
| `store.product.management` | `store-management/PharmacyProducts.tsx` | A (DB override) |
| `signage.playlist.manager` | `operator/signage/HqPlaylistDetailPage.tsx` | A (DB override) |

**Skip:**

| pageKey | 사유 |
|---------|------|
| `content.document.editor` | GlycoPharm에 콘텐츠 작성/편집 페이지 없음 |
| `content.resource.editor` | `ResourcesPage.tsx`는 목록 전용, 편집 페이지 없음 |

### 3-3. K-Cosmetics (4 pages)

| pageKey | 파일 | 패턴 |
|---------|------|------|
| `store.channel.editor` | `store/StoreChannelsPage.tsx` | A (DB override, GuideEditableSection 공존) |
| `store.product.management` | `store/StoreProductsPage.tsx` | A (DB override) |
| `event.offer.management` | `operator/EventOfferApprovalsPage.tsx` | A (DB override) |
| `forum.request.management` | `operator/ForumDeleteRequestsPage.tsx` | A (DB override) |

**Skip:**

| pageKey | 사유 |
|---------|------|
| `content.document.editor` | K-Cosmetics에 콘텐츠 작성/편집 페이지 없음 |
| `content.resource.editor` | K-Cosmetics에 리소스 편집 페이지 없음 |

### 3-4. Neture (5 pages)

| pageKey | 파일 | 패턴 |
|---------|------|------|
| `supplier.product.editor` | `supplier/SupplierProductCreatePage.tsx` | A (DB override) |
| `supplier.event-offer.editor` | `supplier/SupplierEventOfferPage.tsx` | A (DB override) |
| `operator.brand.management` | `operator/BrandManagementPage.tsx` | B★ (static fallback 전용 — 충돌 방지) |
| `operator.event-offer.management` | `operator/OperatorProductApprovalPage.tsx` | A (DB override) |
| `forum.request.management` | `operator/ForumDeleteRequestsPage.tsx` | A (DB override) |

**Skip:**

| pageKey | 사유 |
|---------|------|
| `content.document.editor` | Neture에 콘텐츠 작성/편집 페이지 없음 |
| `content.resource.editor` | Neture에 리소스 편집 페이지 없음 |

---

## 4. 적용 패턴 분류

### 패턴 A — DB Override 지원형

가장 일반적인 패턴. 운영자가 `/operator/guide-contents`에서 JSON을 저장하면 실화면에 반영된다.

```
GuideBlock 마운트
→ fetchGuidePageContent(serviceKey, pageKey) 호출
→ sections['page-help'] 조회
→ JSON.parse({ title, description, steps })
→ 성공: state 주입 → GuideBlock에 반영
→ 실패/없음: 하드코딩 fallback 사용
```

**적용 범위:** 전체 23개 pageKey 중 19개

**코드 구조 (공통):**

```tsx
const [guideTitle, setGuideTitle] = useState<string | null>(null);
const [guideDesc, setGuideDesc] = useState<string | null>(null);
const [guideSteps, setGuideSteps] = useState<string[] | null>(null);

useEffect(() => {
  let cancelled = false;
  fetchGuidePageContent(SERVICE_KEY, GUIDE_PAGE_KEY)
    .then(sections => {
      if (cancelled) return;
      const raw = sections['page-help'];
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.title) setGuideTitle(parsed.title);
        if (parsed.description) setGuideDesc(parsed.description);
        if (Array.isArray(parsed.steps)) setGuideSteps(parsed.steps);
      } catch { /* use fallback */ }
    })
    .catch(() => { /* use fallback */ });
  return () => { cancelled = true; };
}, []);

<GuideBlock
  variant="info"
  title={guideTitle ?? '...fallback title...'}
  description={guideDesc ?? '...fallback desc...'}
  steps={guideSteps ?? ['step1', 'step2', 'step3']}
  compact
/>
```

### 패턴 B — Static Fallback 전용

DB override를 사용하지 않고 항상 하드코딩 fallback을 표시한다.

**사용 조건:**
- 모달 내 마운트 구조로 독립 API fetch가 복잡한 경우
- 같은 pageKey + sectionKey에 GuideEditableSection plain text가 이미 존재하여 JSON 충돌이 발생할 수 있는 경우

**적용 범위:** 4개 pageKey (KPA `lms.quiz.editor`, `lms.assignment.editor`, `lms.live.editor` + Neture `operator.brand.management`)

```tsx
<GuideBlock
  variant="info"
  title="...static title..."
  description="...static desc..."
  steps={['step1', 'step2', 'step3']}
  compact
/>
```

### 패턴 C — Legacy 공존형

기존 `GuideEditableSection`을 유지하면서 `GuideBlock`을 추가한다.

**책임 분리:**
- `GuideBlock` (상단): 단계별 사용법 안내 (read-only 카드)
- `GuideEditableSection` (본문): 운영자가 특정 문구를 inline 직접 편집

**대표 사례:**

| 서비스 | 파일 | pageKey |
|--------|------|---------|
| KPA | `pharmacy/StoreChannelsPage.tsx` | `store.channel.editor` |
| GlycoPharm | `store/StoreChannelsPage.tsx` | `store.channel.editor` |
| K-Cosmetics | `store/StoreChannelsPage.tsx` | `store.channel.editor` |
| Neture | `operator/BrandManagementPage.tsx` | `operator.brand.management` |

---

## 5. pageKey / sectionKey 충돌 사례

### 5-1. Neture `operator.brand.management` — 충돌 발생 및 조치

**상황:**

```
BrandManagementPage.tsx
pageKey  = "operator.brand.management"
sectionKey = "page-help"

기존 GuideEditableSection:
  → plain text 저장 ("중복 브랜드를 검색하고 병합하여...")
  → DB row: { serviceKey:'neture', pageKey:'operator.brand.management', sectionKey:'page-help', content:'중복 브랜드...' }

GuideBlock (신규):
  → 동일 3-tuple 조회 시 JSON.parse 시도
  → plain text가 있으므로 JSON.parse 실패 → fallback 사용
```

**조치:** GuideBlock을 static fallback 전용으로 설정 (DB override useEffect 제거). 기존 GuideEditableSection의 plain text 콘텐츠는 그대로 유지.

**현재 상태:**
- `GuideEditableSection`: 페이지 설명 문구 inline 편집 (`sectionKey='page-help'`)
- `GuideBlock`: 단계 안내 카드 (static fallback, DB 조회 없음)

**미래 해결 방향 (이번 WO에서 미적용):**

```
방법 1: GuideBlock 전용 sectionKey 사용
  예: sectionKey='guideblock-page-help'
  → GuideEditableSection plain text와 키 분리

방법 2: GuideEditableSection을 JSON 구조로 마이그레이션
  → 전사적 정책 확정 필요
```

---

## 6. pageKey / sectionKey 보강 규칙

```
원칙:
GuideBlock의 DB override는 기본적으로 sectionKey='page-help' 사용.

충돌 조건:
같은 (serviceKey, pageKey, sectionKey) 3-tuple에 GuideEditableSection이
plain text를 이미 저장하고 있는 경우.

대응 방법:
1. GuideBlock은 static fallback 전용으로 사용 (현재 조치)
2. 또는 GuideBlock 전용 sectionKey를 새로 지정
   예: sectionKey='guideblock-page-help'
3. GuideEditableSection plain text의 JSON 마이그레이션은 전사 정책 확정 후 적용

이번 1차 적용에서는 방법 1(static fallback)만 적용.
```

---

## 7. Skip 항목 해석

`content.document.editor` / `content.resource.editor`가 GlycoPharm, K-Cosmetics, Neture에서 skip된 것은 **Guide 시스템 실패가 아니라, 해당 서비스에 작성/편집 화면 자체가 없기 때문이다.**

| 서비스 | content.document.editor | content.resource.editor |
|--------|:------------------------:|:-----------------------:|
| KPA-Society | ✅ 적용 | ✅ 적용 |
| GlycoPharm | ❌ 편집 페이지 없음 | ❌ 목록 전용 |
| K-Cosmetics | ❌ 편집 페이지 없음 | ❌ 편집 페이지 없음 |
| Neture | ❌ 편집 페이지 없음 | ❌ 편집 페이지 없음 |

이는 향후 **서비스 기능 갭 조사 후보**로 관리한다.

KPA-Society가 content/resource 편집 화면을 가진 reference implementation이다.

---

## 8. 전체 적용 집계

| 구분 | 수량 |
|------|------|
| 적용 서비스 | 4개 |
| 적용 pageKey (총) | 23개 |
| 패턴 A (DB Override) | 19개 |
| 패턴 B (Static Fallback) | 4개 |
| 패턴 C (Legacy 공존) | 4개 (A와 중복 가능) |
| Skip pageKey | 6개 (3서비스 × 2 content pageKey) |

---

## 9. Smoke Verify 요약

| 항목 | 결과 |
|------|------|
| fallback 표시 | ✅ DB 없을 때 한국어 fallback 정상 표시 |
| 운영자 override 반영 | ✅ `/operator/guide-contents` → JSON 저장 → 실화면 반영 |
| pageKey dot notation | ✅ 전 서비스 카탈로그 기준 사용 |
| GuideEditableSection 공존 | ✅ 제거 없이 GuideBlock 추가 |
| 신규 API/DB 변경 | ✅ 없음 (기존 guide_contents API 사용) |
| 신규 TS 에러 | ✅ 없음 (pre-existing 에러 외 신규 없음) |

---

## 10. 향후 후속 WO 후보

### WO-O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1

**목적:** GuideBlock JSON / GuideEditableSection plain text의 sectionKey 충돌 방지 정책 확정.

**배경:** Neture `operator.brand.management` 사례. GuideBlock 전용 sectionKey(`guideblock-page-help`)를 표준화하거나, GuideEditableSection을 JSON 구조로 마이그레이션하는 방향 결정 필요.

---

### WO-O4O-GUIDE-BLOCK-SECOND-WAVE-APPLY-V1

**목적:** 1차 적용 범위 외 신청 상태 화면, 마이페이지, 일반 사용자 화면 확장.

**후보 pageKey:**
- `user.application.status` — 가입 신청 상태 확인 화면
- `user.mypage.hub` — 마이페이지 허브
- `store.order.list` — 매장 주문 목록
- `supplier.library.editor` — 공급자 라이브러리 편집

---

### WO-O4O-CONTENT-RESOURCE-EDITOR-GAP-AUDIT-V1

**목적:** GlycoPharm / K-Cosmetics / Neture에서 content/resource 편집 화면이 없는 이유와 필요성 조사.

**조사 항목:**
- 각 서비스에서 콘텐츠/리소스를 누가 작성하는가?
- HUB 구조로 KPA에서 복사해서 사용하는가?
- 독자 편집 화면이 필요한가?

---

### WO-O4O-GUIDE-SCHEMA-VALIDATION-V1

**목적:** 운영자가 `/operator/guide-contents`에서 저장하는 JSON에 대한 schema validation 보강.

**현재 구조:** `content` 컬럼에 JSON string을 저장. 저장 시 schema 검사 없음.

**개선 방향:**
- `{ title: string, description: string, steps: string[] }` schema 검사
- 저장 시 frontend validation + API 검증
- 잘못된 JSON 저장 시 에러 메시지 표시

---

## 관련 문서

| 문서 | 위치 |
|------|------|
| GuideBlock 1차 적용 보고서 (KPA) | `docs/architecture/O4O-GUIDE-BLOCK-1ST-WAVE-REPORT-V1.md` |
| O4O 공통 구조 원칙 | `docs/o4o-common-structure.md` |
| HUB Template Standard | `docs/platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md` |
| Operator Dashboard 표준 | `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md` |

---

*작성일: 2026-05-06*
*WO: WO-O4O-GUIDE-BLOCK-SERVICE-WIDE-REPORT-V1*
*상태: PASS*
