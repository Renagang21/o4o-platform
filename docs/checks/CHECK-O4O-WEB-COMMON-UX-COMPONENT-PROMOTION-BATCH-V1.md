# CHECK-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1

- **WO**: `WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1`
- **작성일**: 2026-08-11
- **판정**: **PASS**
- **범위**: `services/web-neture` · `web-kpa-society` · `web-glycopharm` · `web-k-cosmetics` · `web-pharmacy-hub` + `@o4o/ui` · `@o4o/store-ui-core` · `@o4o/operator-core-ui` · `@o4o/shared-space-ui`
- **backend / API / 권한 판정 변경**: 없음 (UI 표시 계약만)

---

## 1. 공통 컴포넌트 승격 위치

`@o4o/ui` (Design Core v1.0) 의 `src/feedback/` 신설. 5개 web 서비스가 모두 이미 의존하고
tailwind config 가 `packages/ui/src/**` 를 스캔하므로 신규 패키지 생성(=web-kpa Dockerfile 선별 COPY 함정)을 피했다.

| 파일 | export |
|---|---|
| `packages/ui/src/feedback/AccessDenied.tsx` | `AccessDenied`, `ACCESS_DENIED_TITLE`, `ACCESS_DENIED_MESSAGE` |
| `packages/ui/src/feedback/LoadError.tsx` | `LoadError`, `LOAD_ERROR_TITLE`, `LOAD_ERROR_DESCRIPTION` |
| `packages/ui/src/feedback/NotFound.tsx` | `NotFound` |
| `packages/ui/src/feedback/index.ts` | barrel (`src/index.tsx` 에서 re-export) |

표준 문구는 WO §6 원문 그대로. raw stack trace / HTML 응답 / secret 노출 없음 (`detail` 은 선택 prop 이며 어떤 호출부도 예외 원문을 넘기지 않는다).

---

## 2. 축별 결과

### 축 1 — AccessDenied
- 삭제: `web-neture` · `web-k-cosmetics` · `web-glycopharm` 의 로컬 `components/auth/AccessDenied.tsx` 3개 파일
- 인라인 카드 제거: KPA `RoleGuard` · `PharmacistOnlyGuard` · `PharmacyOwnerOnlyGuard` · `AdminAuthGuard`, Neture `HubPage`
- 공통 컴포넌트가 로컬 변형의 상위집합이 되도록 `showLogin` / `loginTo` / `homeTo` / `homeLabel` / `showHome` / `children` 추가 → affordance 손실 0
- 현재 소비처 15개 파일

### 축 2 — LoadError
- 삭제 파일 4개: `web-glycopharm/components/common/ErrorState.tsx` · `web-k-cosmetics/components/common/LoadErrorNotice.tsx` · `web-kpa-society/components/common/LoadErrorState.tsx` · `web-neture/components/common/LoadErrorNotice.tsx`
- 배럴 export 제거: glycopharm · kpa `components/common/index.ts`
- 호출부 29곳 전량 재작성 (얇은 re-export wrapper 대신 직접 교체). glycopharm 만 prop 명 `message` → `description` 매핑
- 4상태 계약 유지: API 실패 → error, 정상 0건 → empty(`EmptyState`)

### 축 3 — NotFound
- `web-glycopharm` · `web-k-cosmetics` · `web-neture` · `web-pharmacy-hub` 의 `NotFoundPage` 를 공통 `<NotFound>` 로 교체
- `web-kpa-society/src/App.tsx` 의 인라인 `NotFoundPage()` (약 100줄 인라인 스타일) 제거
- 서비스별 링크는 `children` 슬롯으로 보존 (glycopharm·k-cosmetics: 커뮤니티/문의하기, kpa: 커뮤니티/이용 가이드)

### 축 4 — StoreOwnerGuard 주입점
- `packages/store-ui-core/src/auth/StoreOwnerGuard.tsx` 에 optional `renderDenied?: ReactNode | (() => ReactNode)` 추가
- **미주입 서비스는 기존 `Navigate(denialFallback)` 동작이 그대로 유지된다** (판정 로직 무변경)
- 주입: glycopharm `PharmacyStoreGuard` · kpa `PharmacyGuard` · k-cosmetics `App.tsx StoreOwnerRoute` · pharmacy-hub `StoreOwnerShell`

### 축 5 — GlycoPharm 잔여 HOLD 3건 (전건 해소)
| HOLD | 처리 |
|---|---|
| forum-analytics error 상태 | `OperatorForumAnalyticsPage` 에 `loadError` state + try/catch/finally 추가 (기존에 **catch 자체가 없어** throw 시 무한 로딩) · glycopharm `forumAnalyticsApi` 3개 메서드가 고정 한국어 문구로 throw |
| StandardHomeTemplate `noticesError` prop | 템플릿에 optional `noticesError` + `onNoticesRetry` 추가 → 실패 시 `LoadError`. glycopharm `CommunityMainPage` 가 soft-result `res.error` 를 검사해 전달. 미전달 서비스 영향 0 |
| forum-delete-requests error 표면화 | `ForumDeleteRequestsConsole` 에 `loadError` state + `LoadError(다시 시도)` early return |

soft-result wrapper(`{ data, error }`) 특성상 `catch` 만으로는 error 상태에 닿지 않으므로 **`res.error` 검사 → 고정 한국어 throw** 패턴을 사용했다. wrapper 의 영문 원문은 사용자에게 노출하지 않는다.

---

## 3. 검증

| 항목 | 결과 |
|---|---|
| typecheck `@o4o/ui` | PASS |
| typecheck `@o4o/shared-space-ui` · `@o4o/store-ui-core` · `@o4o/operator-core-ui` | PASS |
| typecheck web 5종 | PASS (전부 무오류) |
| build web 5종 | PASS (neture 32.8s / kpa 16.4s / glyco 22.2s / kcos 13.4s / pharmacy-hub 13.4s) |
| API 서버 변경·배포 | 없음 (WO §9) |
| DB write · migration | 없음 |

### 배포

`Deploy Web Services (Cloud Run)` run **31465412776 = success** (detect-changes / k-cosmetics / kpa-society / pharmacy-hub / glycopharm / neture / summary 전 job success).

> `Deploy API Server` 워크플로는 `paths: packages/**` 트리거 때문에 자동 기동됐다 (본 커밋이 `packages/ui` 등을 건드림).
> `apps/api-server` 변경은 0건이며 동일 소스 재빌드다 — WO §9 의 "API 배포를 **수행하지 않는다**" 는 별도 배포를 하지 않는다는 뜻으로 지켰고,
> 저장소 표준 트리거에 의한 자동 기동은 취소하지 않았다(진행 중 취소가 더 위험).

### 브라우저 smoke (프로덕션, 배포 후)

| # | 항목 | 대상 | 결과 |
|---|---|---|---|
| 1 | 404 | neture / glycopharm / kpa-society / k-cosmetics / pharmacy-hub 전 5종 `/this-route-does-not-exist-wo-smoke` | PASS — 표준 문구 + 요청 경로 + 홈/뒤로. glyco·kcos 는 커뮤니티·문의하기, kpa 는 커뮤니티·이용 가이드 children 유지 |
| 2 | 로그인 필요 | neture `/workspace/hub` (비로그인) | PASS — "로그인이 필요합니다 / 허브에 접근하려면 로그인이 필요합니다." + [로그인하기] |
| 3 | 권한 없음 | glycopharm `/operator/forum` (매장 계정) | PASS — "접근 권한이 없습니다 / 현재 계정으로는 이 기능을 사용할 수 없습니다." + [홈으로 돌아가기] |
| 4 | LoadError (error→retry→ready) | glycopharm `/operator/forum-analytics` | PASS — 실패 시 LoadError, [다시 시도] 후 정상 렌더 (**기존에는 catch 부재로 무한 로딩**) |
| 5 | LoadError (error→retry→empty) | glycopharm `/operator/forum-delete-requests` | PASS — 실패 시 LoadError, retry 후 "해당 상태의 삭제 요청이 없습니다"(empty) 로 복귀 → error/empty 구분 확인 |
| 6 | noticesError | glycopharm 홈 `/` | PASS — "공지를 불러오지 못했습니다." + [다시 시도] → retry 후 "등록된 공지가 없습니다"(empty). 최신글 등 나머지 블록은 정상 렌더 |
| 7 | LoadError 스타일 | k-cosmetics `/store/library/contents` | PASS — amber 카드·lucide 아이콘·[다시 시도] 정상 (서비스별 tailwind 빌드에 공통 클래스 포함 확인), retry 후 목록 복구 |
| 8 | 정상 / empty | 위 4·5·6·7 의 복구 경로에서 함께 확인 | PASS |

실패 주입은 브라우저에서 해당 XHR만 network error 로 만드는 방식이며 **서버·DB 는 건드리지 않았다** (비파괴).

**미재현 1건 — StoreOwnerGuard 거부 화면**: 사용 가능한 테스트 계정(glycopharm / k-cosmetics / pharmacy-hub)이 모두 매장 스코프를 통과해
거부 분기를 실브라우저에서 재현하지 못했다. 렌더 대상 컴포넌트 자체는 위 3번에서 동일 화면으로 확인됐고,
`renderDenied` 미주입 시 기존 `Navigate` 동작 보존은 코드로 확인했다. 계정 준비 시 후속 확인 대상.

---

## 4. HOLD / 범위 외

| 항목 | 사유 |
|---|---|
| `services/signage-player-web/src/components/ErrorState.tsx` | WO §2 대상 서비스 목록 밖 (player 는 별도 런타임). 손대지 않음 — 후속 batch 후보 |

HOLD 없음 (WO §7 "표시 컴포넌트 승격은 원칙적으로 진행한다" 준수).

---

## 5. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
