# O4O Guide sectionKey 충돌 정책

> **WO-O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1**
>
> GuideBlock(JSON)과 GuideEditableSection(plain text)이 동일한
> `serviceKey + pageKey + sectionKey` 3-tuple을 공유할 때 발생하는 충돌을 분석하고,
> 향후 표준 sectionKey 규칙을 확정한다.

---

## 1. 배경 — 두 가지 Guide 컴포넌트 공존

O4O Guide 시스템에는 현재 두 종류의 컴포넌트가 공존한다.

### GuideBlock

```
저장 형식: JSON string
구조: { title: string, description: string, steps: string[] }
역할: read-only 단계별 안내 카드 (운영자가 /operator/guide-contents에서 수정)
사용처: 페이지 상단 사용법 안내
```

### GuideEditableSection

```
저장 형식: plain text string
구조: 임의 텍스트 (줄바꿈 포함 가능)
역할: 운영자가 페이지 내 특정 문구를 inline 직접 편집
사용처: 페이지 설명, 채널 부제목 등 특정 위치 문구 커스텀
```

---

## 2. 충돌 메커니즘

두 컴포넌트 모두 동일한 API와 동일한 DB 테이블(`guide_contents`)을 사용한다.

```
guide_contents 테이블
  serviceKey  — 서비스 격리
  pageKey     — 페이지 격리
  sectionKey  — 섹션 격리
  content     — 실제 저장 값 (TEXT)
```

**충돌 조건:** 동일한 `(serviceKey, pageKey, sectionKey)` 3-tuple에 두 컴포넌트가 모두 접근할 때.

```
GuideEditableSection이 plain text 저장
→ content = '중복 브랜드를 검색하고 병합하여...'

GuideBlock이 동일 row 조회
→ JSON.parse('중복 브랜드를 검색하고 병합하여...')
→ SyntaxError: Unexpected token
→ catch 절 진입 → fallback 사용
```

GuideEditableSection은 반대로 JSON을 plain text로 그대로 노출한다.

```
GuideBlock이 JSON 저장
→ content = '{"title":"...", "description":"...", "steps":["..."]}'

GuideEditableSection이 동일 row 읽기
→ 화면에 JSON string 그대로 표시
→ UX 파괴
```

---

## 3. 실제 충돌 사례 — Neture `operator.brand.management`

```
파일: services/web-neture/src/pages/operator/BrandManagementPage.tsx

기존 GuideEditableSection:
  pageKey    = "operator.brand.management"
  sectionKey = "page-help"
  저장값     = "중복 브랜드를 검색하고 병합하여 데이터 품질을 관리합니다"  (plain text)

신규 GuideBlock (WO-O4O-GUIDE-BLOCK-NETURE-APPLY-V1 적용):
  pageKey    = "operator.brand.management"
  sectionKey = "page-help"  ← 동일 key 사용 시 충돌
```

**충돌 흐름:**

```
1. GuideEditableSection → 운영자가 문구 수정 → plain text 저장
2. GuideBlock → 동일 row 조회 → JSON.parse 실패 → static fallback 표시
3. 운영자가 /operator/guide-contents에서 JSON 저장
   → GuideBlock 정상 표시
   → GuideEditableSection이 JSON string을 raw 표시 (UX 파괴)
```

**현재 조치 (WO-O4O-GUIDE-BLOCK-NETURE-APPLY-V1):**

```
GuideBlock을 static fallback 전용으로 처리
→ fetchGuidePageContent 호출 없음
→ 항상 하드코딩 fallback 사용
→ GuideEditableSection 동작에 영향 없음
```

---

## 4. 신규 표준 sectionKey 규칙

### 4-1. GuideBlock 전용 namespace

신규 GuideBlock은 아래 prefix를 가진 sectionKey를 사용한다.

| sectionKey | 용도 |
|------------|------|
| `guideblock-page-help` | 페이지 전체 사용법 안내 (기본) |
| `guideblock-form-help` | 폼 작성 안내 |
| `guideblock-list-help` | 목록/테이블 안내 |
| `guideblock-action-help` | 특정 액션(승인/반려 등) 안내 |

### 4-2. GuideEditableSection legacy namespace

기존 GuideEditableSection은 기존 sectionKey를 그대로 유지한다.

| sectionKey | 용도 |
|------------|------|
| `page-help` | 페이지 설명 문구 |
| `hero-description` | 채널 헤더 부제목 |
| `form-help` | 폼 설명 |
| 기타 임의 key | 각 화면별 inline 편집 위치 |

### 4-3. Namespace 분리 원칙

```
GuideBlock     → guideblock-* prefix 사용
GuideEditable  → prefix 없는 key 사용 (legacy 호환)
```

두 namespace는 절대 교차하지 않는다.

---

## 5. 정책 원칙

### 5-1. 신규 GuideBlock

```
원칙: guideblock-page-help를 기본 sectionKey로 사용

예외: 특수 용도별 guideblock-form-help 등 사용 가능

금지: page-help, hero-description 등 GuideEditableSection legacy key와 동일 sectionKey 사용
```

### 5-2. 기존 GuideEditableSection

```
원칙: 현재 sectionKey 유지 (강제 변경 금지)
이유: legacy row 호환성 유지
```

### 5-3. 이미 충돌 발생한 화면

```
현재 static fallback 전용으로 운영 중인 화면은 유지 가능
이후 guideblock-page-help로 전환 시 DB override 활성화 가능

전환 조건:
1. guideblock-page-help sectionKey로 코드 변경
2. 기존 page-help row는 GuideEditableSection이 계속 사용
3. /operator/guide-contents에서 guideblock-page-help용 JSON row 별도 생성
```

### 5-4. 신규 화면 (GuideBlock 신규 적용)

```
처음부터 guideblock-page-help 사용
→ GuideEditableSection과 충돌 없음
→ DB override 활성화 가능
```

---

## 6. 현재 서비스 영향 범위

### 6-1. 실제 충돌 확인

| 서비스 | pageKey | sectionKey | 현재 상태 |
|--------|---------|------------|---------|
| Neture | `operator.brand.management` | `page-help` | static fallback 전용 (조치 완료) |

### 6-2. 잠재 충돌 후보

`GuideEditableSection`이 `sectionKey='page-help'` 또는 `sectionKey='hero-description'`을 사용하는 화면에 GuideBlock이 동일 key로 추가될 경우 충돌 가능.

현재 GuideEditableSection이 사용 중인 주요 위치:

| 서비스 | pageKey 추정 | sectionKey | 파일 |
|--------|-------------|------------|------|
| Neture | `operator.brand.management` | `page-help` | `BrandManagementPage.tsx` |
| KPA / Glyco / K-Cos | `store.channel.editor` | `hero-description` | `StoreChannelsPage.tsx` 각 서비스 |

**현재 조치 상태:**
- `store.channel.editor`: GuideBlock이 `sectionKey='page-help'`를 사용하고 `GuideEditableSection`은 `sectionKey='hero-description'`을 사용 → **충돌 없음** (다른 key)
- `operator.brand.management`: GuideBlock static fallback → **충돌 회피 완료**

---

## 7. Migration 정책

### 7-1. 이번 WO에서 미수행 항목

```
- DB row 수정 없음
- 기존 sectionKey 강제 변경 없음
- 기존 코드 대규모 변경 없음
- guide_contents schema 변경 없음
```

### 7-2. 향후 Migration 방향 후보

**방향 A — GuideBlock sectionKey 전환** (권장)

```
대상: static fallback 전용 GuideBlock 화면
작업:
  1. fetchGuidePageContent 호출 시 sectionKey='guideblock-page-help' 사용
  2. /operator/guide-contents에서 해당 sectionKey로 JSON 등록
  3. DB override 활성화
영향: 기존 GuideEditableSection 동작에 영향 없음 (다른 key 사용)
```

**방향 B — GuideEditableSection JSON 구조화** (대형 마이그레이션)

```
작업:
  1. GuideEditableSection이 JSON 저장/읽기를 지원하도록 변경
  2. 기존 plain text row를 JSON으로 마이그레이션
  3. sectionKey 통합 가능
리스크: 전사 영향도 높음, 전체 레거시 데이터 마이그레이션 필요
```

**방향 C — GuideContentType 컬럼 추가** (스키마 변경)

```
작업:
  1. guide_contents 테이블에 content_type 컬럼 추가 ('json' | 'text')
  2. GuideBlock → content_type='json' 조회
  3. GuideEditableSection → content_type='text' 조회
리스크: DB 스키마 변경, API 변경, 전체 컴포넌트 업데이트 필요
```

**권장:** 방향 A부터 적용. 방향 B/C는 전사 정책 합의 후 결정.

---

## 8. 권장 구현 패턴

### 8-1. 신규 GuideBlock (guideblock-* 사용)

```tsx
const GUIDE_PAGE_KEY = 'store.product.management';
const SERVICE_KEY = 'neture';

useEffect(() => {
  let cancelled = false;
  fetchGuidePageContent(SERVICE_KEY, GUIDE_PAGE_KEY)
    .then(sections => {
      if (cancelled) return;
      // ✅ guideblock-page-help 전용 key 사용
      const raw = sections['guideblock-page-help'];
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
  steps={guideSteps ?? ['step1', 'step2']}
  compact
/>
```

### 8-2. GuideEditableSection (기존 유지)

```tsx
// ✅ legacy key 그대로 유지 — guideblock-* prefix 사용 금지
<GuideEditableSection
  pageKey="store.channel.editor"
  sectionKey="hero-description"
  defaultContent="각 채널의 제품 진열과 콘텐츠 노출을 관리합니다"
/>
```

### 8-3. 충돌 회피 전략 (같은 페이지에 두 컴포넌트 공존 시)

```tsx
// ✅ 각자 다른 sectionKey 사용
<GuideBlock
  ...
  // fetchGuidePageContent → sections['guideblock-page-help']
/>

<GuideEditableSection
  pageKey="store.channel.editor"
  sectionKey="hero-description"  // ← 별도 key
/>
```

---

## 9. 1차 적용 서비스 현황 및 정책 적용 계획

| 서비스 | pageKey | 현재 sectionKey | 상태 | 권장 전환 |
|--------|---------|----------------|------|---------|
| KPA | 전체 10개 | `page-help` | DB override 정상 | `guideblock-page-help`로 전환 권장 |
| GlycoPharm | 전체 4개 | `page-help` | DB override 정상 | `guideblock-page-help`로 전환 권장 |
| K-Cosmetics | 전체 4개 | `page-help` | DB override 정상 | `guideblock-page-help`로 전환 권장 |
| Neture | 4개 | `page-help` | DB override 정상 | `guideblock-page-help`로 전환 권장 |
| **Neture** | `operator.brand.management` | (없음) | **static fallback** | `guideblock-page-help` 추가 후 DB override 활성화 |

> 현재 1차 적용 서비스들이 `page-help`를 사용하지만 GuideEditableSection과 실제로 충돌하지 않는 이유:
> 해당 pageKey에 GuideEditableSection이 없거나, GuideEditableSection은 `hero-description` 등 다른 sectionKey를 사용하기 때문.

---

## 10. 후속 WO 정의

### WO-O4O-GUIDE-SECTIONKEY-MIGRATION-V1

**목적:** 1차 적용된 GuideBlock들의 sectionKey를 `page-help` → `guideblock-page-help`로 일괄 전환.

**작업:**
1. 각 서비스 GuideBlock에서 `sections['page-help']` → `sections['guideblock-page-help']`로 변경
2. Neture `operator.brand.management` GuideBlock DB override 활성화
3. /operator/guide-contents에 `guideblock-page-help` 기준으로 JSON 재등록

**범위:** 4개 서비스 × 23 pageKey = 최대 23개 파일 수정

**선행 조건:** 이 정책 문서 확정 후 진행

---

## 관련 문서

| 문서 | 위치 |
|------|------|
| GuideBlock 서비스 전체 적용 보고서 | `docs/architecture/O4O-GUIDE-BLOCK-SERVICE-WIDE-REPORT-V1.md` |
| GuideBlock 1차 적용 보고서 (KPA) | `docs/architecture/O4O-GUIDE-BLOCK-1ST-WAVE-REPORT-V1.md` |
| O4O 공통 구조 원칙 | `docs/o4o-common-structure.md` |

---

*작성일: 2026-05-06*
*WO: WO-O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1*
*상태: PASS*
