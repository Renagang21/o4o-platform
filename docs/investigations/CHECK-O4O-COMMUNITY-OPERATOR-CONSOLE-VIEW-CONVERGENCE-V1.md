# CHECK — O4O 커뮤니티 운영자 콘솔 View 수렴

- **WO**: `WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1`
- **선행 CHECK**: [`CHECK-O4O-COMMUNITY-CROSSSERVICE-FINAL-CENSUS-AND-COMMONIZATION-CLOSURE-AUDIT-V1.md`](CHECK-O4O-COMMUNITY-CROSSSERVICE-FINAL-CENSUS-AND-COMMONIZATION-CLOSURE-AUDIT-V1.md)
- **일자**: 2026-08-20
- **판정**: **PASS** — B21 + C7 관련 `MUST_FIX_BEFORE_CLOSE` 0

---

## 1. 범위

이번 WO 는 **운영자 콘솔 2개 화면군만** 다룬다. 커뮤니티 전체 재감사는 하지 않는다.

| 화면군 | 대상 서비스 | 착수 시점 판정 |
|---|---|---|
| **B21 운영자 커뮤니티 콘솔** | KPA · GlycoPharm · Neture | GP↔Neture `VIEW_DUPLICATED` · KPA `CORE_ONLY` (MUST_FIX_BEFORE_CLOSE) |
| **C7 운영자 콘텐츠 허브** | KPA · GlycoPharm | KPA↔GP `VIEW_DUPLICATED` |

---

## 2. 모집단 재측정 (현재 main 기준 — 과거 수치 미신뢰)

조사 대상 cell: **5**

### 2-1. B21 운영자 커뮤니티 콘솔

| service | route | page/component | API client | shared module 사용 | lines | 중복 상대 | 착수 판정 |
|---|---|---|---|---|---:|---|---|
| KPA | `/operator/community` (`OperatorRoutes.tsx:102`) | `pages/operator/CommunityManagementPage.tsx` | `src/api/community.ts` `communityManageApi` | `@o4o/operator-ux-core` (DataTable) · `@o4o/ui` | 629 | GP·Neture (업무 동일) | `CORE_ONLY` |
| GlycoPharm | `/operator/community` (`App.tsx:867`) | `pages/operator/CommunityManagementPage.tsx` | `src/services/communityApi.ts` | `@o4o/ui` 만 | 489 | Neture (거의 동일) · KPA | `VIEW_DUPLICATED` |
| Neture | `/admin/community-admin` (`App.tsx:1121`) | `pages/admin/CommunityManagementPage.tsx` | `src/lib/api/communityAdmin.ts` | 없음 | 454 | GlycoPharm · KPA | `VIEW_DUPLICATED` |

**업무 정체 확정**: B21 은 forum moderation 콘솔이 아니라 **Home 편집 콘솔**(광고 / 스폰서 / (KPA) 하단 링크 CRUD)이다.
GP 본문 140–489 ↔ Neture 본문 110–454 diff 결과 실제 차이는 **5 hunk** — accent color · 삭제 확인 방식(`ConfirmActionDialog` vs `window.confirm`) · 안내 배너 유무 · API 모듈 경로뿐이다.

**KPA 가 채택하지 않았던 이유**(§5 요구 확인): 공통 View 자체가 없었다. KPA 만 먼저 DataTable / RowActionMenu / MediaPicker / retry 로 현대화되어 있었고, 그 결과 "가장 앞선 구현이 공통화되지 않은" 상태였다.
→ **권한·업무 정책 차이가 아니므로 §17 중지 조건 미해당.** KPA 구현을 canonical 로 승격했다.

### 2-2. C7 운영자 콘텐츠 허브

| service | route | page/component | API client | shared module 사용 | lines | 중복 상대 | 착수 판정 |
|---|---|---|---|---|---:|---|---|
| KPA | `/operator/docs` · `/operator/resources/new` (`OperatorRoutes.tsx:143,149`) | `pages/operator/OperatorContentHubPage.tsx` | 로컬 `apiFetch` → `/api/v1/kpa/contents` | `@o4o/operator-ux-core` · `@o4o/ui` · `@o4o/content-editor` | 707 | GlycoPharm | `VIEW_DUPLICATED` |
| GlycoPharm | `/operator/docs` (`App.tsx:914`) | `pages/operator/OperatorContentHubPage.tsx` | 로컬 `apiFetch` → `/api/v1/glycopharm/contents` | `@o4o/operator-ux-core` | 590 | KPA | `VIEW_DUPLICATED` |

GP 파일 헤더가 스스로 "KPA OperatorContentHubPage 를 GlycoPharm 용으로 포팅/파라미터화" 라고 기록하고 있다 — 복제 사실이 문서화된 중복.

미조사: **0**

---

## 3. 실제 차이 분해 (§3 공통화 판단)

### B21

| 차이 | 성격 | 처리 |
|---|---|---|
| accent color (KPA/Neture blue · GP emerald) | 표현 | `accent` preset config |
| quickLinks(하단 링크) 탭 — KPA 전용 | 기능 유무 | `enableQuickLinks` + optional client method |
| 이미지 선택 — KPA 만 미디어 라이브러리 | 서비스 자산 | `renderImageField` slot (+ 공통 `ImageFieldShell`) |
| GP 제한적 제공 안내 배너 | 서비스 고유 공지 | `notice` slot |
| 삭제 확인 (`window.confirm` vs 다이얼로그) | UX 품질 | 공통 `ConfirmActionDialog` 로 상향 |
| API 모듈 경로 / 응답 unwrap | 데이터 접근 | `CommunityHomeClient` adapter |

**업무 흐름 · 정보 구조 · 필드 · 상태 전이는 3서비스 동일** → 공통화 대상 확정.

### C7

| 차이 | 성격 | 처리 |
|---|---|---|
| status enum (KPA draft/ready · GP draft/published/private) | 서비스 계약 | `statusOptions[]` + `defaultStatus` config |
| status 필터 '전체' 값 (`'all'` vs 빈 문자열) | 백엔드 계약 | `allStatusValue` / `allStatusLabel` |
| 카테고리 필터 (KPA 만) | 기능 유무 | `categoryOptions` 미지정 시 미노출 |
| 본문 편집기 (RichTextEditor vs textarea) | 기능 수준 | `bodyEditor` + `client.uploadImage` |
| 상세 화면 이동 (KPA 만) | route 존재 여부 | `onOpenItem` 미주입 시 수정 모달 (orphan route 방지) |
| 콘텐츠 제작 가이드 (KPA 만) | 서비스 고유 액션 | `headerActions` slot |
| manual 본문 필수 검증 (KPA 만) | 저작 정책 | `requireBodyForManual` |

**노출/추천/가시성 정책은 backend 계약 그대로**이며 공통 View 는 status 값을 표시·전달만 한다 (§6 "View 가 정책을 결정하지 않게 한다").

---

## 4. 목표 구조 — 기존 공통 패키지 재사용 (§7)

신규 패키지를 만들지 않고 기존 `@o4o/operator-core-ui` 에 module 2개를 추가했다
(`forum-categories` / `hub-content-list` 등과 동일한 adapter 주입 패턴).

```
packages/operator-core-ui/src/modules/
  community-home/          CommunityHomeConsole.tsx (629) · types.ts (126) · index.ts (20)
  operator-content-hub/    OperatorContentHubConsole.tsx (663) · types.ts (113) · index.ts (17)
```

`package.json` exports 2줄 추가: `./modules/community-home` · `./modules/operator-content-hub`

**공통 View 금지사항 준수** (테스트로 고정): `fetch`/`axios`/`apiClient` 직접 호출 없음 · 서비스별 API import 없음 · 서비스 분기 조건문 없음.

### adapter 계약

- `CommunityHomeClient` — `listAds/createAd/updateAd/deleteAd` · `listSponsors/…` · (optional) `listQuickLinks/…`
  3서비스 API 모듈이 메서드명·인자·응답 shape 상 이미 호환되어 **서비스 API 코드 변경 0**.
- `ContentHubClient` — `list/get?/create/update/remove/uploadImage?`
  KPA/GP 각각 wrapper 안의 로컬 `apiFetch` 로 구성. **backend endpoint·DTO·error semantics 무변경** (§10).

---

## 5. adoption 결과

| # | 화면군 | 파일 | 전 (lines) | 후 (lines) | 판정 |
|---|---|---|---:|---:|---|
| 1 | B21 | `services/web-kpa-society/src/pages/operator/CommunityManagementPage.tsx` | 629 | 67 | `FULLY_COMMON` |
| 2 | B21 | `services/web-glycopharm/src/pages/operator/CommunityManagementPage.tsx` | 489 | 47 | `FULLY_COMMON` |
| 3 | B21 | `services/web-neture/src/pages/admin/CommunityManagementPage.tsx` | 454 | 28 | `FULLY_COMMON` |
| 4 | C7 | `services/web-kpa-society/src/pages/operator/OperatorContentHubPage.tsx` | 707 | 147 | `FULLY_COMMON` |
| 5 | C7 | `services/web-glycopharm/src/pages/operator/OperatorContentHubPage.tsx` | 590 | 92 | `FULLY_COMMON` |

- wrapper 합계: **2,869 → 381 lines**
- 공통 View 신규: **1,568 lines** (2 module)
- 순 코드량: **2,869 → 1,949 lines (−920)** — 공통화 후 코드량/복잡도 증가 없음 (§17 미해당)
- 제거된 duplicated lines: **1,533** (GP B21 489 + Neture B21 454 + GP C7 590 의 자체 구현 본문 전량)
- KPA 공통 shell 중복(629 + 707 = 1,336) 도 잔존 없이 승격 (§5 "공통 shell 중복은 남기지 않는다")

### 라우팅·권한 무변경 (§11)

route · guard · role · moderation 권한 · content visibility · membership 정책 **변경 0**.
wrapper 는 default export 컴포넌트 시그니처를 유지하므로 라우터 파일도 수정하지 않았다.

---

## 6. View 상태 계약 (§10)

| 상태 | B21 공통 View | C7 공통 View |
|---|---|---|
| loading | `불러오는 중...` 스피너 | DataTable `loading` + 새로고침 비활성 |
| error | `데이터를 불러오지 못했습니다.` | client 예외 메시지 그대로 |
| retry | `다시 시도` 버튼 → `fetchData` | `다시 시도` 버튼 → `fetchItems` |
| empty | 탭별 empty 메시지 | `등록된 콘텐츠가 없습니다.` + 첫 등록 CTA |
| populated | DataTable + row action | DataTable + 통계 카드 + 페이지네이션 |
| permission denied | client 예외 → error 분기 (backend semantics 유지) | 동일 |
| partial data | 필드 null-safe 렌더 | 동일 |

Neture 는 이전에 없던 **retry** 를, GP 는 이전에 없던 **ConfirmActionDialog 기반 삭제 확인**을 공통화로 획득했다.

### 6-1. 관측된 표시 차이 1건 (의도된 것)

기존 KPA/GP 구현은 `statusOptions` 에 없는 status 값을 **무조건 '초안' 배지로 표시**했다(`STATUS_BADGE[status] || STATUS_BADGE.draft`).
공통 View 는 알 수 없는 status 를 **원본 값 그대로 중립 배지**로 표시한다.

브라우저 smoke 에서 KPA `/operator/docs` 의 일부 행이 `published` 로 표시됐다 —
KPA 문서상 enum(`draft|ready`) 밖의 값이 프로덕션 데이터에 실재한다는 뜻이며, 기존 화면은 이를 '초안' 으로 **오표시**하고 있었다.
공통 View 가 값을 재해석하지 않는 편이 §11(권한·정책 재해석 금지)에 부합하므로 원본 표시를 유지했다.

> 데이터 자체(왜 KPA contents 에 `published` 가 있는지)는 본 WO 범위 밖이다 — 별도 조사 필요 시 후속 WO 로 분리한다.

---

## 7. 테스트 (§12)

`packages/operator-core-ui/vitest.config.mjs` 신규 (루트 기설치 vitest/jsdom/@testing-library 사용 — **package.json·lockfile 무변경**).

```
npx vitest run --config packages/operator-core-ui/vitest.config.mjs
→ Test Files 3 passed (3) · Tests 33 passed (33)
```

| 파일 | 케이스 |
|---|---|
| `community-home/__tests__/CommunityHomeConsole.test.tsx` (9) | loading · error+retry(재조회 호출 검증) · empty · populated · quickLinks 미노출/노출 · 탭 전환 client 호출 · title/subtitle/notice config · notice 미지정 시 미렌더 |
| `operator-content-hub/__tests__/OperatorContentHubConsole.test.tsx` (12) | loading · error+retry · empty+CTA · populated+status badge · 검색 파라미터 · status 필터 파라미터 · categoryOptions 유/무 · onOpenItem 콜백 · headerActions/createButtonLabel · headerActions 미지정 · statCards 집계 |
| `modules/__tests__/community-console-adoption.test.ts` (12) | 5 wrapper 의 공통 View import 고정 · wrapper 내 자체 table/DataTable/ListColumnDef/window.confirm 부재 · 공통 View 의 service-neutral 계약 |

---

## 8. 정적 검증 (§13)

| 대상 | 명령 | 결과 |
|---|---|---|
| `@o4o/operator-core-ui` | `tsc --noEmit` | PASS |
| `web-kpa-society` | `tsc --noEmit` | PASS |
| `web-glycopharm` | `tsc --noEmit` | PASS |
| `web-neture` | `tsc --noEmit` | PASS |
| `@o4o/web-kpa-society` | `pnpm build` | PASS (34.36s) |
| `glycopharm-web` | `pnpm build` | PASS (23.41s) |
| `@o4o/web-neture` | `pnpm build` | PASS (14.49s) |

backend 변경 0 → `apps/api-server` 전체 build 불필요. DB migration **없음**.

> typecheck 중 발견·수정: `CommunityAdInput` 등 3 input 타입을 `interface` → `type` alias 로 변경.
> KPA `updateAd(id, Record<string, unknown>)` 시그니처와의 index-signature 호환을 위한 것으로, 필드 구성은 불변.

---

## 9. 잔존 판정

| 항목 | 잔존 |
|---|---:|
| B21 `VIEW_DUPLICATED` | **0** |
| C7 `VIEW_DUPLICATED` | **0** |
| KPA B21 `MUST_FIX_BEFORE_CLOSE` `CORE_ONLY` | **0** |

**B21 + C7 관련 `MUST_FIX_BEFORE_CLOSE` = 0 → WO 완료 조건 충족.**

남은 커뮤니티 closure blocker: **B8 Forum Write Shell KCos ↔ GlycoPharm 2 cell** (본 WO §16 제외 범위).

---

## 9-1. 배포 · 브라우저 smoke (§14)

- CI `Deploy Web Services (Cloud Run)` run `32322639212` — 7 job 전부 success (kpa-society · glycopharm · neture · k-cosmetics · kpa-branch · pharmacy-hub)
- 계정: `docs/local/TEST-ACCOUNTS.local.md` 의 운영자 계정 (실 로그인, 권한 없는 계정 강제 접근 테스트 없음)

| 화면 | 결과 |
|---|---|
| KPA `/operator/community` | Home 편집 · 4탭(Hero/페이지/스폰서/하단 링크) · empty 정상 |
| KPA `/operator/docs` | 콘텐츠 허브 관리 · 가이드 버튼 · 카테고리 필터 · 6건 목록 정상 |
| GlycoPharm `/operator/community` | Home 편집 · 3탭 · 제한적 제공 안내 배너 정상 |
| GlycoPharm `/operator/docs` | 콘텐츠 허브 · 3상태 필터 · empty + 첫 등록 CTA 정상 |
| Neture `/admin/community-admin` | 커뮤니티 관리 · 3탭 · empty 정상 |

white screen **0** · JS exception **0** · 신규 4xx/5xx **0** · mobile(390px) overflow **0**

---

## 10. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
