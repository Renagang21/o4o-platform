# CHECK-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1

> **유형:** WO 실행 결과 (CHECK)
> **WO:** WO-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1
> **선행 IR:** IR-O4O-DIGITAL-SIGNAGE-CROSSSURFACE-UIUX-AUDIT-V1
> **작성:** 2026-06-13
> **판정:** **PASS** (Neture signage frontend surface 제거, KPA/GP/KCos·shared core·DB 무변경)

---

## 1. 작업 개요

IR 조사 중 "Neture 디지털사이니지 없음" 전제가 틀린 것으로 확인됨 → 사용자 결정에 따라 **Neture frontend signage surface(route/menu/page/API client/진입점)를 제거**했다. KPA/GP/KCos signage, shared signage core/backend, DB 데이터는 **변경하지 않았다**.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| 조사/작업 시작 HEAD | `677a9e61c` |
| 작업 중 origin 진행(다른 세션) | HEAD `2570a4b78` 까지 진행 (LMS/footer IR/product-approval 등) |
| staged(시작 시점) | 없음 → 진행 가능 |
| 다른 세션 WIP | k-cosmetics LMS 2파일(M), footer IR(??), **본 IR 최초본(??)** — 모두 미포함. (footer IR·LMS 는 다른 세션이 그 사이 커밋, 본 IR 최초본은 병렬 git 작업으로 유실 → §9 참조) |

## 3. 제거한 route

| route | 위치 | 비고 |
|-------|------|------|
| `/supplier/signage/manage` | App.tsx | StoreSignagePage |
| `/admin/signage/hq-media` (+`/:mediaId`) | App.tsx | HQ 미디어 |
| `/admin/signage/hq-playlists` (+`/:playlistId`) | App.tsx | HQ 플레이리스트 |
| `/admin/signage/templates` (+`/:templateId`) | App.tsx | 템플릿 |
| `/operator/signage/hq-media` (+`/:mediaId`) | App.tsx | HQ 미디어 |
| `/operator/signage/hq-playlists` (+`/:playlistId`) | App.tsx | HQ 플레이리스트 |
| `/operator/signage/templates` (+`/:templateId`) | App.tsx | 템플릿 |

**합계 13개 route + 7개 lazy import 제거.**

## 4. 제거한 menu / sidebar / dashboard 진입점

| 진입점 | 파일 | 처리 |
|--------|------|------|
| `UNIFIED_MENU.signage` (운영자 사이드바 '사이니지') | config/operatorMenuGroups.ts | 그룹 제거 |
| `OPERATOR_MENU_ITEMS.signage` (legacy) | config/operatorMenuGroups.ts | 그룹 제거 |
| `NETURE_DOMAIN_GROUP_ORDER.community_content` 의 `'signage'` | config/operatorMenuGroups.ts | 배열에서 제거 |
| operator 대시보드 '사이니지' 링크 + 설명 '· 사이니지 ·' | pages/operator/NetureOperatorDashboard.tsx | 링크·문구 제거 |
| guide 홈 '디지털사이니지' 진입 링크(`/supplier/signage/manage`) | pages/guide/GuideHomePage.tsx | 데드링크 제거 |
| `CommunitySignagePage` barrel export | pages/community/index.ts | export 제거 |

> `NETURE_GROUP_TO_DOMAIN.signage` 는 `Record<OperatorGroupKey,...>` 완전성(모든 group key 필요) 때문에 **유지**하되 "미사용 — 안전 default" 로 표기(resources/lms 동일 패턴). 메뉴 항목이 없으므로 화면 노출 0.

## 5. 제거한 page / component (파일 삭제)

| 파일 | 종류 |
|------|------|
| pages/operator/signage/HqMediaPage.tsx | operator HQ 미디어 |
| pages/operator/signage/HqMediaDetailPage.tsx | operator HQ 미디어 상세 |
| pages/operator/signage/HqPlaylistsPage.tsx | operator HQ 플레이리스트 |
| pages/operator/signage/HqPlaylistDetailPage.tsx | operator HQ 플레이리스트 상세 |
| pages/operator/signage/TemplatesPage.tsx | operator 템플릿 |
| pages/operator/signage/TemplateDetailPage.tsx | operator 템플릿 상세 |
| pages/supplier/StoreSignagePage.tsx | supplier signage |
| pages/community/CommunitySignagePage.tsx | community signage (미라우팅 dead) |
| pages/seller/SignageContentHubPage.tsx | seller signage hub (미라우팅 dead) |

**합계 9개 page 삭제.** `pages/operator/signage/` 디렉터리는 빈 디렉터리로 untrack.

## 6. 제거한 API client (파일 삭제)

| 파일 | 사용처(삭제 전) | 삭제 후 사용처 |
|------|----------------|----------------|
| lib/api/signageV2.ts | CommunitySignagePage + SignageContentHubPage (둘 다 삭제) | 0 |
| lib/api/assetSnapshot.ts | supplier/StoreSignagePage (삭제) | 0 |

> 삭제 전 import 사용처 grep 으로 0 확인 후 제거.

## 7. 남긴 것 (의도적 보존)

### 7.1 shared signage core / backend / DB (WO 금지 — 무변경)
- `packages/` / `@o4o-apps/digital-signage-core` (백엔드 entities/services/controllers)
- backend signage API (`/api/signage/:serviceKey/*`) — KPA/GP/KCos 사용 중
- `@o4o/shared-space-ui` 의 SignageManagerTemplate/SignageHubTemplate/SignageIcon
- `@o4o/types/signage`
- signage DB 테이블·migration — **무변경, DB 데이터 미삭제**

### 7.2 Neture 내 비-진입점 텍스트 (보존, 진입점 아님)
| 위치 | 내용 | 보존 사유 |
|------|------|----------|
| pages/SupplierLandingPage.tsx:43 | "…POP 디자인, Digital Signage를 매장에 제공합니다." | 비클릭 마케팅/개념 prose. O4O 모델상 공급자 원천자료가 매장 signage 가 되는 개념 설명 |
| pages/guide/GuideHomePage.tsx:152 | "POP · 블로그 · 디지털사이니지 · 타블렛 … 서비스별 제공 범위가 다르며" | 매장 실행 도구 개념 설명(명시적으로 "서비스별 상이"). 진입 route 아님 |
| pages/guide/* , manual/concepts | O4O 사업 개념 내 '사이니지' 언급 | 플랫폼 개념 교육 텍스트(KPA/GP/KCos 에 실제 존재) |
| pages/dashboard/MyContentPage.tsx:50 | `EXPOSURE_BADGE_CONFIG.signage` 배지 | 데이터 노출 타입 표시 fallback map(클릭 진입 아님) |
| lib/api/dashboardCopy.ts:12 | `DashboardAssetSourceType` 의 `'signage_media'|'signage_playlist'` | 타입 union 플러밍(백엔드 응답 호환). 제거 시 타입 깨짐 위험 |
| lib/apiClient.ts:26 | 주석 예시 `/api/signage` | 문서 주석 |
| config/operatorMenuGroups.ts (comment), AdminLayoutWrapper.tsx (comment) | 주석 내 '사이니지' | 코드 주석 |

> 위 항목은 **진입점/route/CTA 가 아니므로** WO 범위("진입점 제거 + 문서/문구 미수정")에 따라 보존. 필요 시 별도 copy-cleanup WO 후보.

## 8. KPA/GP/KCos 미수정 확인

✅ git diff 상 변경 파일은 **전부 `services/web-neture/`** 한정. KPA-society / glycopharm / k-cosmetics / packages signage 파일 **diff 0**. (k-cosmetics LMS 2파일은 다른 세션 WIP — 본 커밋 미포함.)

## 9. DB / migration 미변경 확인

✅ DB 데이터·테이블·migration **무변경**. 본 WO 는 frontend surface 제거만 수행. Neture serviceKey signage 데이터 잔존 여부·운영성 판단은 후속 read-only 조사 `IR-O4O-NETURE-SIGNAGE-DATA-CLEANUP-AUDIT-V1` 권장(필요 시).

## 10. TypeScript 검증

| 패키지 | 결과 |
|--------|------|
| web-neture (`npx tsc --noEmit`) | ✅ **PASS (exit 0, 0 error)** |
| KPA/GP/KCos | 미수정(파일 diff 0) → 영향 없음. signage 파일 미변경 정적 확인 |

## 11. grep 검증

| 확인 | 결과 |
|------|------|
| `route:/href=/to=/path:` 에 signage 경로 | **0건** (web-neture 전체) |
| 삭제 모듈(signageV2/assetSnapshot/Signage* page) import 잔존 | **0건** |
| `/operator/signage`·`/admin/signage`·`/supplier/signage` route 잔존 | **0건** |
| 잔존 'signage' 매치 | 제거 마커 주석 + 보존 prose/타입/주석(§7.2)만 |

## 12. browser smoke

⚠️ **라이브 미수행(보류).** 변경은 route/menu/import 제거 + dead 파일 삭제로 **순수 제거**이며, web-neture tsc PASS + grep 진입점 0 확인. 제거된 route 직접 진입 시 기존 NotFound/fallback 처리. 회귀 위험 낮아 정적 검증으로 갈음. (권장 후속: Neture operator/admin/supplier/community 진입 화면에서 signage 메뉴 부재 육안 확인.)

## 13. 후속 데이터 cleanup 필요 여부

- frontend 제거로 Neture 사용자에게 signage 노출 0 달성.
- **DB 데이터는 미삭제** — Neture serviceKey signage 데이터 존재/운영성 확인 후에만 판단. 후속 `IR-O4O-NETURE-SIGNAGE-DATA-CLEANUP-AUDIT-V1`(read-only SQL) 권장.

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 제거 route | 13개 (+lazy import 7) |
| 제거 menu/dashboard 진입점 | 6곳 (UNIFIED/legacy menu, group order, dashboard 링크·문구, guide 링크, barrel export) |
| 삭제 page | 9개 |
| 삭제 API client | 2개 (signageV2, assetSnapshot) |
| 남긴 shared core/backend/DB | 전부 무변경 |
| KPA/GP/KCos | 미수정(diff 0) |
| DB/migration | 무변경(데이터 미삭제) |
| TypeScript | web-neture PASS (0 error) |
| browser smoke | tsc+grep 정적 갈음(라이브 보류) |
| 다른 세션 WIP | 미포함(path-specific) |
| 후속 | `IR-O4O-NETURE-SIGNAGE-DATA-CLEANUP-AUDIT-V1`(선택), 이후 `WO-O4O-KPA-DIGITAL-SIGNAGE-UIUX-BASELINE-V1` |
