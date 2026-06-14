# CHECK-O4O-CONTENT-STANDARD-MODULE-EXTRACT-PHASE2-V1

> **유형:** WO 실행 결과 (CHECK)
> **WO:** WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-PHASE2-V1
> **선행:** WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-V1 (Phase 1 — write shell)
> **작성:** 2026-06-14 · 기준 HEAD `4027dd46e`
> **판정:** **PASS** (Phase 2 — 상세 표시 shell + 검색 primitive 추출. list-page shell 은 의도적 보류. GP/KCos 무변경)

---

## 1. 작업 개요

KPA `/content` 의 **상세 표시 구조 + 검색 입력**을 service-neutral 공통 부품으로 추출(`@o4o/shared-space-ui/community/`). Phase 1(write shell)에 이어 detail/search 정렬. **KPA 만 적용, GP/KCos route/화면 무변경, 제품 비종속 유지.**

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `4027dd46e` · origin 0/0 |
| 다른 세션 WIP | pnpm-lock · CHECK-CODEX — **미접촉** |
| 조사 기준 commit | `4027dd46e` |

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/shared-space-ui/src/community/CommunityContentDetailView.tsx` | **신규** — 상세 표시 shell(배지/제목/메타/요약/태그/본문 + slots) |
| `packages/shared-space-ui/src/community/CommunityContentSearchBar.tsx` | **신규** — 검색 입력 primitive(controlled, Search/X) |
| `packages/shared-space-ui/src/index.ts` | 두 부품 + 타입 export |
| `services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx` | 437줄 → **~190줄** thin wrapper(DetailView + slots) |
| `services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx` | 인라인 검색창 → `CommunityContentSearchBar`(import 정리: lucide 제거) |
| `docs/investigations/CHECK-...-V1.md` | 본 문서 |

**무변경:** backend / DB / migration / API / route / menu / GP / KCos / Neture / package.json / pnpm-lock / Dockerfile.

## 4. 추출한 부품

### 4.1 `CommunityContentDetailView` (상세 표시 shell)
- **순수 display** — `data{title, authorName, dateLabel, viewCount, summary, tags, bodyHtml, badges[]}` 표시. inline 스타일(KPA canonical 이식).
- **API/router/toast 미 import.** 데이터는 wrapper 가 조회·가공해 주입.
- **서비스 고유 = slot**: `backSlot`(목록 링크) · `actionsSlot`(추천/링크복사/수정) · `footerSlot`(KPA **AppreciationPanel**). shell 은 핸들러/내용 모름.
- 배지: `{text, tone:'primary'|'muted'|'warning'}[]` — wrapper 가 content_type/sub_type/status → 배지 매핑.

### 4.2 `CommunityContentSearchBar` (검색 primitive)
- controlled: `value/onChange/onClear/placeholder/maxWidth`. Search 아이콘 + X 초기화. 디바운스/조회/page 리셋은 소비처 책임.

```ts
CommunityContentDetailData { title; authorName?; dateLabel?; viewCount?; summary?; tags?; bodyHtml?; badges?: {text,tone}[] }
CommunityContentDetailViewProps { data; backSlot?; actionsSlot?; footerSlot?; emptyBodyText? }
CommunityContentSearchBarProps { value; onChange; onClear?; placeholder?; maxWidth?; ariaLabel? }
```

## 5. KPA wrapper 구조

- **ContentDetailPage**: contentApi(detail/trackView/recommend) + 소유권 + 배지·날짜 매핑 → `<CommunityContentDetailView data backSlot actionsSlot footerSlot/>`. 추천/링크복사 버튼·AppreciationPanel·toast·navigate 는 wrapper(slot 내부).
- **ContentDocumentsPage**: `searchInput` 상태·디바운스·`contentApi.list({search})` 그대로, 검색 **입력 UI 만** `CommunityContentSearchBar` 로 교체.

## 6. 추출하지 않은 항목 + 이유

| 항목 | 처리 | 이유 |
|------|------|------|
| **list-page shell**(ContentDocumentsPage 전체) | **보류**(Phase 3 / GP·KCos 적용 시) | `@o4o/ui` `BaseTable`(이미 공유) + columns(copy-to-store/소유권/restricted) + `BaseDetailDrawer` + bulk ActionBar + mobile 카드 + pagination 강결합. 전체 shell 화는 prop 과다·회귀 리스크 큼, 이득 적음(테이블 공통성은 BaseTable 이 이미 제공). WO §9.2 "무리한 추출보다 회귀 리스크 최소화 우선" 적용 |
| **CommunityContentTagList** | 미추출 | trivial(태그 chip map). 상세는 DetailView 내장, 목록 drawer 는 기존 유지 — 별도 부품 가치 낮음 |
| **CommunityContentActionBar/EmptyState** | 미추출 | actionsSlot 으로 충분(detail), empty 는 list 페이지 잔류(BaseTable emptyMessage) |

## 7. KPA 고유 요소 처리

| 고유 | 처리 |
|------|------|
| AppreciationPanel(감사 포인트) | **footerSlot 주입**(shell 미관여) |
| 추천/조회수/링크복사/수정 링크 | **actionsSlot**(wrapper 핸들러) |
| contentApi(detail/recommend/trackView) | wrapper |
| content_type/status 라벨·배지 매핑 | wrapper → badges[] |
| 소유권/인증/라우팅 | wrapper |

## 8. API / 제품 비종속 / GP·KCos

| 항목 | 결과 |
|------|------|
| API 통합 | ✅ 안 함 — 부품 API 미 import, KPA contentApi 그대로 |
| 제품 비종속 | ✅ productId/제품 탭/필터/B2B·B2C 0 |
| GP/KCos route/화면 | ✅ **무변경**(부품 미소비) |
| 신규 패키지/dep/Dockerfile | ✅ 없음 — 기존 `@o4o/shared-space-ui`(source-direct, content-editor/ui/lucide 이미 의존) |

## 9. 검증

| 항목 | 결과 |
|------|------|
| `@o4o/shared-space-ui` `tsc --noEmit` | ✅ PASS (exit 0) |
| `web-kpa-society` `tsc --noEmit` | ✅ PASS (exit 0) — wrapper + 부품(source) |
| GP/KCos/Neture | 부품 미 import → 영향 없음(추가-only export) |
| 기존 동작(상세 표시/추천/복사/수정/감사하기, 목록 검색/초기화) | shell+wrapper 로 보존(시각·동작 동일). 검색 UI 는 inline→공통 부품(동일 동작) |
| 제품 UI 미추가 | ✅ |
| browser smoke | ⚠️ 라이브 미수행(배포 필요) — 권장: KPA `/content/:id`(배지/제목/메타/요약/태그/본문/추천/복사/수정/AppreciationPanel) · `/content/documents`(검색·초기화) |

## 10. 후속 작업

| 후보 | 내용 |
|------|------|
| `WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-PHASE3-LIST-V1` | list-page shell(BaseTable columns/bulk/drawer/mobile/pagination 을 config·slot 으로) — 또는 GP/KCos 적용 시 함께 |
| `IR-O4O-CONTENT-ROUTE-ROLE-REDEFINE-V1` | `/content`=회원 / browse=`/store-hub/content` 역할 재정의(GP 라이브 `/content` browse 충돌) |
| `WO-O4O-CONTENT-BROWSE-ROUTE-CLEANUP-V1` | GP `/library/content` alias 제거 + browse 이동 |
| `WO-O4O-GP/KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1` | GP/KCos 표준 모듈 적용(제품 go 후) — write/detail/search shell 위에 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 추출 | `CommunityContentDetailView`(상세 표시) + `CommunityContentSearchBar`(검색) |
| 적용 | KPA ContentDetailPage thin wrapper(437→~190줄), ContentDocumentsPage 검색 UI 교체 |
| KPA 고유 | AppreciationPanel=footerSlot, 액션=actionsSlot, contentApi=wrapper |
| list-page shell | **의도적 보류**(BaseTable 강결합·리스크) → Phase 3/적용 시 |
| API/DB/route/menu | 무변경 |
| GP/KCos/Neture | 무변경 |
| 제품 비종속 | 유지 |
| 신규 패키지/dep/Dockerfile | 없음 |
| TypeScript | shared-space-ui + web-kpa-society PASS |
| browser smoke | 라이브 보류(배포 필요) |
| 다른 세션 WIP | 미포함(path-specific) |
| 다음 | (선택)Phase 3 list shell → route 역할 재정의 → GP/KCos 적용 |
