# O4O 공통 Guide 시스템 v1 최종 보고서

> **WO-O4O-GUIDE-SYSTEM-FINAL-REPORT-V1**
>
> O4O Platform의 공통 Guide 시스템(GuideBlock + GuideEditableSection)이 v1 완성 상태에 도달함을 선언하고,
> 전체 아키텍처·적용 현황·정책·운영 가이드를 단일 문서로 통합한다.

---

## 1. 시스템 개요

O4O 공통 Guide 시스템은 운영자가 각 서비스 페이지에 노출될 안내 문구를 DB에서 관리하고,
사용자 화면에서 GuideBlock 컴포넌트가 이를 읽어 표시하는 **콘텐츠 override 아키텍처**다.

### 구성 요소

| 구성 요소 | 패키지 | 역할 |
|-----------|--------|------|
| `GuideBlock` | `@o4o/shared-space-ui` | 읽기 전용 단계형 안내 카드 (사용자 화면) |
| `GuideEditableSection` | `@o4o/shared-space-ui` | 인라인 편집 가능한 텍스트 블록 (레거시) |
| `GuideContentsManager` | `@o4o/operator-core-ui` | 운영자가 안내 문구를 저장하는 공통 관리 UI |
| `fetchGuidePageContent` | 각 서비스 `api/guideContent.ts` | DB에서 페이지별 섹션 콘텐츠를 가져오는 API 클라이언트 |
| `guide_contents` | DB 테이블 | 모든 안내 콘텐츠의 단일 출처 |
| `validateGuideContent` | `@o4o/operator-core-ui` | GuideBlock JSON 저장 전 스키마 검증 |

---

## 2. 아키텍처 흐름

### 사용자 화면 (GuideBlock 읽기 흐름)

```
페이지 마운트
  → fetchGuidePageContent(serviceKey, pageKey)
  → GET /api/v1/guide/contents/{serviceKey}/{pageKey}
  → sections['guideblock-page-help'] 존재 여부 확인
  → JSON.parse(raw) → title / description / steps 추출
  → 성공: GuideBlock에 DB 값 표시
  → 실패(없음 또는 파싱 오류): fallback 정적 텍스트 표시
```

### 운영자 관리 흐름

```
/operator/guide-contents
  → GuideContentsManager
  → serviceKey + pageKey 선택
  → 편집 (title, description, steps[])
  → validateGuideContent() 검증
  → JSON.stringify → POST /api/v1/guide/contents
  → guide_contents 테이블 upsert
```

### DB 3-tuple 격리 정책

```
(service_key, page_key, section_key) → UNIQUE
```

| 필드 | 설명 | 예시 |
|------|------|------|
| `service_key` | 서비스 식별자 | `neture`, `kpa-society` |
| `page_key` | 화면 식별자 | `supplier.library.list` |
| `section_key` | 섹션 namespace | `guideblock-page-help`, `page-help` |

---

## 3. sectionKey 네임스페이스 정책

### 충돌 방지 원칙

GuideBlock과 GuideEditableSection은 **별도 sectionKey namespace**를 사용한다.

| namespace | 컴포넌트 | 콘텐츠 형식 |
|-----------|----------|------------|
| `guideblock-page-help` | `GuideBlock` | JSON: `{title, description, steps[]}` |
| `page-help` | `GuideEditableSection` | Plain text |

동일 3-tuple로 서로 다른 형식을 저장하면 `JSON.parse` 실패 → 무음 fallback 발생.

### Neture BrandManagementPage 충돌 사례 (WO-O4O-GUIDE-SECTIONKEY-MIGRATION-V1)

- **문제**: BrandManagementPage에 `GuideEditableSection(sectionKey="page-help")`와 static fallback GuideBlock이 공존
- **해결**: GuideBlock을 DB override 패턴으로 변환, `guideblock-page-help` namespace 사용
- `GuideEditableSection`의 `page-help` row는 유지 (별개 기능)

> 📄 상세: `docs/architecture/O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1.md`

---

## 4. Schema Validation 정책

GuideContentsManager 저장 시 `validateGuideContent(payload)` 가 실행된다.

| 필드 | 규칙 |
|------|------|
| `title` | 필수, 1자 이상, 200자 이하 |
| `description` | 선택, 2000자 이하 |
| `steps` | 배열 필수, 1개 이상, 최대 10개, 빈 항목 금지 |

오류 발생 시 저장 차단 + 한국어 오류 메시지 표시. fallback 없음 (저장 자체를 막음).

> 📄 상세: `docs/architecture/O4O-GUIDE-SCHEMA-VALIDATION-V1.md`

---

## 5. DB 상태 기준선

WO-O4O-GUIDE-CONTENT-RESEED-GUIDEBLOCK-V1 조사 결과 (2026-05-06):

- **guide_contents 테이블: 0 rows** (완전 빈 상태)
- sectionKey migration 이전에도 DB에 저장된 데이터가 없었음
- 모든 GuideBlock은 항상 fallback 정적 텍스트를 표시했음
- 운영자가 `/operator/guide-contents`에서 저장할 때부터 DB override 활성화됨

> 📄 상세: `docs/architecture/O4O-GUIDE-CONTENT-RESEED-GUIDEBLOCK-V1.md`

---

## 6. WO 진행 이력 (14개 WO)

| # | WO | 내용 | 결과 |
|---|----|------|------|
| 1 | WO-O4O-GUIDE-BLOCK-KPA-INITIAL-V1 | KPA-Society 1차 적용 | PASS |
| 2 | WO-O4O-GUIDE-BLOCK-GLYCOPHARM-V1 | GlycoPharm 적용 | PASS |
| 3 | WO-O4O-GUIDE-BLOCK-K-COSMETICS-V1 | K-Cosmetics 적용 | PASS |
| 4 | WO-O4O-GUIDE-BLOCK-NETURE-V1 | Neture 1차 적용 | PASS |
| 5 | WO-O4O-GUIDE-BLOCK-1ST-WAVE-REPORT-V1 | 1차 적용 보고서 작성 | PASS |
| 6 | WO-O4O-GUIDE-BLOCK-SERVICE-WIDE-V1 | 서비스 전체 확장 적용 | PASS |
| 7 | WO-O4O-GUIDE-BLOCK-SERVICE-WIDE-REPORT-V1 | 서비스 전체 적용 보고서 | PASS |
| 8 | WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1 | GuideContentsManager 공통화 | PASS |
| 9 | WO-O4O-GUIDE-SCHEMA-VALIDATION-V1 | JSON 저장 스키마 검증 추가 | PASS |
| 10 | WO-O4O-GUIDE-SECTIONKEY-MIGRATION-V1 | sectionKey `page-help` → `guideblock-page-help` 마이그레이션 | PASS |
| 11 | WO-O4O-GUIDE-CONTENT-RESEED-GUIDEBLOCK-V1 | DB reseed 조사 → 0 rows 확인 | PASS |
| 12 | WO-O4O-GUIDE-BLOCK-SECOND-WAVE-APPLY-V1 | 사용자 화면 2차 적용 (5개) | PASS |
| 13 | WO-O4O-GUIDE-BLOCK-SECOND-WAVE-REPORT-V1 | 2차 적용 보고서 작성 | PASS |
| 14 | WO-O4O-GUIDE-SYSTEM-FINAL-REPORT-V1 | 최종 통합 보고서 (이 문서) | PASS |

---

## 7. 적용 현황 (v1 최종 — 25 pageKey)

### KPA-Society (8개)

| pageKey | 파일 | sectionKey |
|---------|------|-----------|
| `lms.course.editor` | CourseEditPage.tsx | `guideblock-page-help` |
| `lms.lesson.editor` | PlaylistEditorPage.tsx | `guideblock-page-help` |
| `content.document.editor` | ContentWritePage.tsx | `guideblock-page-help` |
| `content.resource.editor` | ResourceWritePage.tsx | `guideblock-page-help` |
| `forum.request.management` | ForumDeleteRequestsPage.tsx | `guideblock-page-help` |
| `store.channel.editor` | StoreChannelsPage.tsx (pharmacy) | `guideblock-page-help` |
| `signage.playlist.manager` | (HQ Playlist) | `guideblock-page-help` |
| `user.application.status` | MyApplicationsPage.tsx | `guideblock-page-help` |

### GlycoPharm (5개)

| pageKey | 파일 | sectionKey |
|---------|------|-----------|
| `store.channel.editor` | StoreChannelsPage.tsx | `guideblock-page-help` |
| `forum.request.management` | ForumDeleteRequestsPage.tsx | `guideblock-page-help` |
| `store.product.management` | PharmacyProducts.tsx | `guideblock-page-help` |
| `signage.playlist.manager` | HqPlaylistDetailPage.tsx | `guideblock-page-help` |
| `user.application.status` | apply/MyApplicationsPage.tsx | `guideblock-page-help` |

### K-Cosmetics (4개)

| pageKey | 파일 | sectionKey |
|---------|------|-----------|
| `store.channel.editor` | StoreChannelsPage.tsx | `guideblock-page-help` |
| `store.product.management` | StoreProductsPage.tsx | `guideblock-page-help` |
| `event.offer.management` | EventOfferApprovalsPage.tsx | `guideblock-page-help` |
| `forum.request.management` | ForumDeleteRequestsPage.tsx | `guideblock-page-help` |

### Neture (8개)

| pageKey | 파일 | sectionKey |
|---------|------|-----------|
| `supplier.product.editor` | SupplierProductCreatePage.tsx | `guideblock-page-help` |
| `supplier.event-offer.editor` | SupplierEventOfferPage.tsx | `guideblock-page-help` |
| `operator.brand.management` | BrandManagementPage.tsx | `guideblock-page-help` |
| `operator.event-offer.management` | OperatorProductApprovalPage.tsx | `guideblock-page-help` |
| `forum.request.management` | ForumDeleteRequestsPage.tsx | `guideblock-page-help` |
| `supplier.library.list` | SupplierLibraryPage.tsx | `guideblock-page-help` |
| `market-trial.participation.status` | MyParticipationsPage.tsx | `guideblock-page-help` |
| `store.order.list` | StoreOrdersPage.tsx | `guideblock-page-help` |

### 합계

| 서비스 | pageKey 수 |
|--------|-----------|
| KPA-Society | 8 |
| GlycoPharm | 5 |
| K-Cosmetics | 4 |
| Neture | 8 |
| **합계** | **25** |

---

## 8. pageKey 명명 규칙

```
{domain}.{screen}.{purpose}
```

| domain | 의미 |
|--------|------|
| `lms` | LMS 관련 (과정/레슨 편집) |
| `content` | 콘텐츠 편집 (문서/자료) |
| `forum` | 포럼 관련 |
| `store` | 스토어/채널 관련 |
| `signage` | 디지털 사이니지 |
| `supplier` | 공급자 전용 |
| `operator` | 운영자 전용 |
| `event` | 이벤트 오퍼 |
| `market-trial` | 마켓 트라이얼 |
| `user` | 일반 사용자 |

---

## 9. 코드 적용 패턴

모든 GuideBlock 화면은 아래 패턴을 따른다.

```tsx
const GUIDE_PAGE_KEY = '{domain}.{screen}.{purpose}';
const GUIDEBLOCK_SECTION_KEY = 'guideblock-page-help';
const SERVICE_KEY = '{serviceKey}';

// state
const [guideTitle, setGuideTitle] = useState<string | null>(null);
const [guideDesc, setGuideDesc] = useState<string | null>(null);
const [guideSteps, setGuideSteps] = useState<string[] | null>(null);

// effect
useEffect(() => {
  let cancelled = false;
  fetchGuidePageContent(SERVICE_KEY, GUIDE_PAGE_KEY)
    .then(sections => {
      if (cancelled) return;
      const raw = sections[GUIDEBLOCK_SECTION_KEY];
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

// JSX
<GuideBlock
  variant="info"
  title={guideTitle ?? '(fallback 제목)'}
  description={guideDesc ?? '(fallback 설명)'}
  steps={guideSteps ?? ['(fallback 단계 1)', '(fallback 단계 2)']}
  compact
/>
```

---

## 10. 운영자 Override 활성화

운영자가 `/operator/guide-contents`에서 해당 pageKey에 콘텐츠를 저장하면 즉시 적용된다.

DB row 구조:
```json
{
  "serviceKey": "{service}",
  "pageKey": "{pageKey}",
  "sectionKey": "guideblock-page-help",
  "content": "{\"title\":\"...\",\"description\":\"...\",\"steps\":[\"...\",\"...\"]}"
}
```

현재 DB 상태: **0 rows** — 전 페이지 fallback 표시 (정상)

---

## 11. GuideEditableSection 공존 화면

GuideEditableSection은 별도 `page-help` namespace를 사용한다. 동일 화면에 공존 가능.

현재 공존 화면:
- `services/web-neture/src/pages/operator/BrandManagementPage.tsx`
  - GuideBlock: `guideblock-page-help` (pageKey: `operator.brand.management`)
  - GuideEditableSection: `page-help` (별개 섹션)

---

## 12. 향후 WO 후보 (3차 이후)

| 후보 | 설명 |
|------|------|
| **3차 적용 (user.mypage.hub)** | 마이페이지 허브 — 현재 skip (요약·네비게이션 목적). 단계형 안내 재검토 필요 |
| **store.application.status** | 스토어 신청 상태 페이지 — 파일 미존재. 화면 개발 후 적용 |
| **supplier.application.status** | 공급자 신청 상태 — 파일 미존재 |
| **AI 요약 통합** | GuideBlock에 AI-generated summary 연동 |
| **다국어 지원** | sectionKey에 locale suffix 추가 (`guideblock-page-help.en`) |
| **풍부한 콘텐츠** | steps에 link/icon 지원 (schema 확장 필요) |
| **analytics** | GuideBlock 클릭/열람률 추적 |

---

## 13. 관련 문서 전체 목록

| 문서 | 위치 |
|------|------|
| GuideBlock 1차 적용 보고서 | `docs/architecture/O4O-GUIDE-BLOCK-1ST-WAVE-REPORT-V1.md` |
| GuideBlock 서비스 전체 적용 보고서 | `docs/architecture/O4O-GUIDE-BLOCK-SERVICE-WIDE-REPORT-V1.md` |
| Guide sectionKey 충돌 정책 | `docs/architecture/O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1.md` |
| Guide Schema Validation | `docs/architecture/O4O-GUIDE-SCHEMA-VALIDATION-V1.md` |
| Guide sectionKey Migration | `docs/architecture/O4O-GUIDE-SECTIONKEY-MIGRATION-V1.md` |
| Guide Content Reseed (0-row 확인) | `docs/architecture/O4O-GUIDE-CONTENT-RESEED-GUIDEBLOCK-V1.md` |
| GuideBlock 2차 적용 보고서 | `docs/architecture/O4O-GUIDE-BLOCK-SECOND-WAVE-REPORT-V1.md` |
| **O4O 공통 Guide 시스템 v1 최종 보고서** | `docs/architecture/O4O-GUIDE-SYSTEM-FINAL-REPORT-V1.md` (이 문서) |

---

## 상태 선언

> **O4O 공통 Guide 시스템 v1 완료**
>
> - 4개 서비스 25개 pageKey에 GuideBlock 적용 완료
> - `guideblock-page-help` sectionKey namespace 확립
> - GuideContentsManager 운영자 공통 UI 완비
> - validateGuideContent 스키마 검증 적용
> - DB override / fallback 2계층 구조 완성
> - 2026-05-06 기준 모든 화면 fallback 정상 동작, DB override 대기 중

---

*작성일: 2026-05-06*
*WO: WO-O4O-GUIDE-SYSTEM-FINAL-REPORT-V1*
*상태: PASS*
