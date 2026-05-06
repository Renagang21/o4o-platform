# O4O Guide sectionKey Migration

> **WO-O4O-GUIDE-SECTIONKEY-MIGRATION-V1**
>
> GuideBlock JSON 저장 영역을 `page-help`에서 전용 namespace `guideblock-page-help`로 전환.
> GuideEditableSection의 plain text 영역과 GuideBlock의 JSON 영역을 명확히 분리한다.

---

## 1. 변경 개요

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| GuideBlock DB override sectionKey | `page-help` | `guideblock-page-help` |
| GuideEditableSection sectionKey | `page-help` | `page-help` (유지) |
| 운영자 관리 화면 sectionKey | (관련 없음 — 레슨 타입 key 사용) | (변경 없음) |

---

## 2. 변경 파일 목록 (19개)

### KPA-Society (6개)

| 파일 | pageKey |
|------|---------|
| `web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx` | `lms.course.editor` |
| `web-kpa-society/src/pages/signage/PlaylistEditorPage.tsx` | `signage.playlist.manager` |
| `web-kpa-society/src/pages/contents/ContentWritePage.tsx` | `content.document.editor` |
| `web-kpa-society/src/pages/resources/ResourceWritePage.tsx` | `content.resource.editor` |
| `web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx` | `store.channel.editor` |
| `web-kpa-society/src/pages/operator/ForumDeleteRequestsPage.tsx` | `forum.request.management` |

### GlycoPharm (4개)

| 파일 | pageKey |
|------|---------|
| `web-glycopharm/src/pages/store/StoreChannelsPage.tsx` | `store.channel.editor` |
| `web-glycopharm/src/pages/operator/ForumDeleteRequestsPage.tsx` | `forum.request.management` |
| `web-glycopharm/src/pages/store-management/PharmacyProducts.tsx` | `store.product.management` |
| `web-glycopharm/src/pages/operator/signage/HqPlaylistDetailPage.tsx` | `signage.playlist.manager` |

### K-Cosmetics (4개)

| 파일 | pageKey |
|------|---------|
| `web-k-cosmetics/src/pages/store/StoreChannelsPage.tsx` | `store.channel.editor` |
| `web-k-cosmetics/src/pages/store/StoreProductsPage.tsx` | `store.product.management` |
| `web-k-cosmetics/src/pages/operator/EventOfferApprovalsPage.tsx` | `event.offer.management` |
| `web-k-cosmetics/src/pages/operator/ForumDeleteRequestsPage.tsx` | `forum.request.management` |

### Neture (5개)

| 파일 | pageKey | 비고 |
|------|---------|------|
| `web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` | `supplier.product.editor` | |
| `web-neture/src/pages/supplier/SupplierEventOfferPage.tsx` | `supplier.event-offer.editor` | |
| `web-neture/src/pages/operator/BrandManagementPage.tsx` | `operator.brand.management` | **static fallback → DB override 전환** |
| `web-neture/src/pages/operator/OperatorProductApprovalPage.tsx` | `operator.event-offer.management` | |
| `web-neture/src/pages/operator/ForumDeleteRequestsPage.tsx` | `forum.request.management` | |

---

## 3. Neture operator.brand.management 전환 상세

### 전환 전 (static fallback 전용)

```
문제: GuideEditableSection(sectionKey='page-help')과 GuideBlock이 동일 key 공유
→ GuideBlock은 JSON.parse 실패 시 static fallback만 표시
→ fetchGuidePageContent 호출 없음
```

### 전환 후 (DB override 가능)

```
GuideEditableSection: sectionKey='page-help'  (변경 없음)
GuideBlock: sectionKey='guideblock-page-help' (신규 — DB override 활성화)

두 sectionKey가 분리되어 충돌 없음.
/operator/guide-contents에서 guideblock-page-help JSON row 등록 후 운영자 override 가능.
```

---

## 4. GuideEditableSection legacy 유지

```text
변경 금지 목록:
- services/web-neture/src/pages/operator/BrandManagementPage.tsx
  GuideEditableSection sectionKey="page-help"  ← 유지
```

모든 `GuideEditableSection`의 `page-help` sectionKey는 변경하지 않았다.

---

## 5. 기존 DB row 미이동 정책

| 결정 | 이유 |
|------|------|
| 기존 `page-help` JSON row 유지 | migration 수행 없음 |
| 신규 저장부터 `guideblock-page-help` 사용 | 코드 변경으로 적용 |
| 기존 `page-help` row 삭제 금지 | GuideEditableSection 영역 보존 |

**전환 직후 영향:**
- 기존 운영자가 `page-help`에 저장한 GuideBlock JSON은 더 이상 읽히지 않음
- `guideblock-page-help` row가 없으면 fallback 표시 (정상 동작)
- 운영자가 `/operator/guide-contents`에서 `guideblock-page-help`용 JSON을 새로 등록하면 override 활성화됨

---

## 6. 운영자 관리 화면 (`/operator/guide-contents`) 상태

현재 각 서비스의 `OperatorGuideContentsPage`는 `lms.lesson.editor` pageKey에 대해 레슨 타입별 section keys(`article/video/quiz/assignment/live`)를 관리한다.

이 sectionKey들은 `page-help`와 무관하여 이번 WO 변경 대상 외.

페이지별 `guideblock-page-help` 관리 UI는 별도 WO에서 확장 예정.

---

## 7. fallback 동작

`guideblock-page-help` row가 없거나 JSON parse 실패 시 기존 정적 fallback 텍스트가 그대로 표시된다.

```tsx
// fallback 유지 패턴
title={guideTitle ?? '정적 fallback 제목'}
description={guideDesc ?? '정적 fallback 설명'}
steps={guideSteps ?? ['step1', 'step2']}
```

---

## 8. 검증 결과

### 코드 검증

```bash
grep -rn "sections\['page-help'\]" services/ --include="*.tsx"
# 결과: 없음 (0건)
```

GuideBlock DB override 코드에서 `page-help` 완전 제거 확인.

### GuideEditableSection 보존 확인

```bash
grep -rn "sectionKey.*page-help" services/ --include="*.tsx"
# 결과: BrandManagementPage.tsx 1건 (GuideEditableSection 정상 유지)
```

---

## 관련 문서

| 문서 | 위치 |
|------|------|
| sectionKey 충돌 정책 | `docs/architecture/O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1.md` |
| GuideBlock 서비스 전체 적용 보고서 | `docs/architecture/O4O-GUIDE-BLOCK-SERVICE-WIDE-REPORT-V1.md` |
| Guide Schema Validation | `docs/architecture/O4O-GUIDE-SCHEMA-VALIDATION-V1.md` |

---

*작성일: 2026-05-06*
*WO: WO-O4O-GUIDE-SECTIONKEY-MIGRATION-V1*
*상태: PASS*
