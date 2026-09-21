# CHECK-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1

> **WO**: [`WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1`](../work-orders/WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1.md) · **IR**: [`IR-O4O-UNIFIED-STORE-WORKSPACE-SUBDOMAIN-AND-CROSSSERVICE-ROUTING-V1`](../investigations/IR-O4O-UNIFIED-STORE-WORKSPACE-SUBDOMAIN-AND-CROSSSERVICE-ROUTING-V1.md)
> **실행일**: 2026-09-21 · **기준 `origin/main`**: `1f4538d42` · **상태**: **CLOSED_WITH_HANDOFF_STOP** — Foundation(①②③⑤⑥ + 수신 페이지) 완료 · **④ workspace handoff 발급 측은 STOP(DDL 판단 요청)** · 브라우저 인증 smoke `PENDING_USER_VERIFICATION`
> **실행 지시(사용자 · 2026-09-21)**: WO A 실행 승인 · handoff 우선안 ③(DDL 0) · 동등 보안 불가 시 STOP 보고 · `services/web-store` 신설에 따른 workspace/lockfile · Dockerfile · `deploy-web-services.yml` 변경은 정상 범위로 승인 · 세 서비스 실제 기능 이전 없음.

## 1. 결과 요약

```text
STORE_WEB_APP=CREATED (services/web-store · vite 4210 · tsc -b && vite build PASS · dev 기동 PASS)
NEW_SERVICE_IDENTITY=0 · SERVICE_CATALOG_CHANGED=0 · NEW_ROLE=0 · NEW_TABLE=0 · DB_MIGRATION=0
UNIFIED_STORE_CONTEXT=organizationId-first (services[] secondary)          StoreContext.tsx
STORE_SELECTOR=1 auto / ≥2 select / 0 guide · SELECTION_DB_PERSISTED=0 (sessionStorage) · SERVER_REVALIDATES_ORG=PASS
LEGACY_AUTO_ORG_PICK_IN_UNIFIED_PATH=0   (createRequireStoreOwner 미사용 · 후보 ≥2 → 사용자 선택 강제)
WORKSPACE_HANDOFF(targetWorkspace='store')=RECEIVER PASS · ISSUER=STOP(DDL 판단 대기)   ← §5
SERVICE_HANDOFF_UNCHANGED=PASS · FAKE_SERVICE_KEY=0 · handoff_tokens 무변경
CORS_EXACT_ORIGIN=ADDED(code · 배포 전) · GOOGLE_ORIGIN=RECORDED(승인 대기)              ← §7
ROOT_SHELL_NAV=6 · FEATURE_MIGRATED=0 · MENU_UNION=0
EXISTING_3_SERVICE_STORE_ROUTES=UNCHANGED (spec 단언)
CI_REGISTERED=deploy-web-services.yml deploy-store (사용자 승인 범위) · DNS/GCLB/cert=WO C
TESTS: jest 4 suites 49/49 PASS (신규 15) · api-server tsc PASS · store-web build PASS · neture/kpa-society/k-cosmetics/pharmacy-hub/lecture tsc -b PASS
```

## 2. 변경 파일

| 구분 | 경로 | 내용 |
|---|---|---|
| 신규 앱 | `services/web-store/**` (28 파일) | Vite/React 골격(web-lecture 복제) · `config/workspace.ts` · `contexts/{AuthContext,StoreContext}.tsx` · `components/{RootShell,StoreGate,TermsAcceptanceGate}.tsx` · `pages/{Home,Login,Handoff,StoreSelector,NoStore,MyServices,Placeholder}Page.tsx` · `lib/{apiClient,storeApi,storeSelection,footerLegal}.ts` · `Dockerfile` |
| API additive | `apps/api-server/src/utils/service-tenant.resolver.ts` | `resolveAccessibleStores(dataSource, userId)` — `findAnyServiceStoreOrganizationCandidates`(store-services 와 같은 후보 집합) + `organizations.name` 부착 · name→id 정렬 · 자동 선택 없음 |
| API additive | `apps/api-server/src/routes/work-scope.routes.ts` | `GET /api/v1/work-scope/accessible-stores` (`requireAuth`) → `{ stores:[{organizationId, organizationName, memberRole}] }` |
| CORS | `apps/api-server/src/bootstrap/setup-middlewares.ts` | prodOrigins 에 `https://store.neture.co.kr` 정확 origin 1건 |
| 공통 패키지 | `packages/auth-react/src/types.ts` | `ServiceAuthConfig.serviceKey` 필수 → **선택**(additive). 소비처 5 앱 전부 값 전달 유지 · `createRouteGuard.tsx` 는 이미 optional. 서버(`google-auth.controller` · `auth-login.controller`)는 serviceKey 가 없으면 생략하는 계약이라 web-store 는 serviceKey 없이 로그인 |
| CI | `.github/workflows/deploy-web-services.yml` | paths · dispatch 목록 · env `VITE_API_URL_STORE`/`VITE_SERVICE_URL_STORE` · outputs/decide `store` · job `deploy-store`(이미지 `store-web` · lecture 와 동일 리소스) |
| lockfile | `pnpm-lock.yaml` | `services/web-store` importer 추가 · `services/web-lecture` 블록 위치 정렬 · deprecated 문구 2건 갱신 · 끝 개행. **의존성 resolution 변경 0 · 외부 dependency 신규 0** |
| 테스트 | `apps/api-server/src/__tests__/unified-store-workspace-foundation.spec.ts` | 15 케이스(§6) |
| 문서 | 본 CHECK · WO 헤더 상태 | |

**무변경**: `service-catalog.ts` · roles · `handoff.controller.ts` · `auth.routes.ts` · `handoff_tokens` migration · `resolveStoreServices`(질의 수/형상 유지 — 기존 spec 이 `calls.toHaveLength(2)` 를 고정) · 세 서비스 `App.tsx` · `store-ui-core` · WO5 파일.

## 3. 재사용 / 신규 구분표 (WO §2)

| 필요 | 처리 | 근거 |
|---|---|---|
| 접근 가능 매장 목록(이름 포함) | **additive API** `accessible-stores` | `store-services` 응답에는 organizationName 이 없고 `ambiguous` 시 id 만 준다. 기존 spec 이 `resolveStoreServices` 의 질의 수·형상을 고정하므로 변경 대신 같은 후보 집합을 쓰는 별도 함수/경로 추가 |
| 선택 매장의 서비스 목록 | **재사용** `store-services?organizationId=` | 항상 organizationId 를 명시해 부른다(서버 소유권 재검증 · `NOT_STORE_MEMBER` 시 선택 폐기) |
| Store shell · nav | **신규(얇은 plain-CSS)** — `store-ui-core/workspace/*` 미사용 | `StoreWorkspaceNav`·`MyServicesView` 는 Tailwind + `@o4o/ui`·`operator-ux-core`·`error-handling`·`lucide-react` 의존. Foundation 을 그 스택에 묶으면 web-store Dockerfile 선별 COPY·빌드 표면이 커지고 기능 이전(WO B)보다 먼저 UI 스택을 결정하게 됨. **WO B 첫 단계 = store-ui-core + Tailwind 채택 여부 결정** 으로 인계 |
| Google 로그인 · 토큰 | **재사용** `useServiceAuth` · `GoogleContinue` · `AuthClient(localStorage)` | serviceKey 만 생략 |
| 약관 gate · 법정 footer | **재사용** `PolicyAcceptanceGate` · `PublicLegalFooterInfo(serviceKey='neture')` | 정책 문서 serviceKey 는 세션 응답의 pending 항목 값을 그대로 사용(앱이 정하지 않음) |
| handoff 수신 | **패턴 재사용** lecture `HandoffPage`(`clearStoredTokens` stale guard · `storeTokens` · `returnTo` 검증) | 교환 API 는 기존 `/auth/handoff/exchange` 그대로 |
| 앱 골격 | **복제** `services/web-lecture`(port 4209 → 4210) | 서비스 페이지 복제 0 |
| Agreement 428 gate | **census 만** | §8 |

## 4. Store Selector 전달 방식 결정

- **선택값 저장 = `sessionStorage['o4o.store.selectedOrganizationId']`** (`lib/storeSelection.ts`, 접근은 try/catch). 새로고침 생존 ○ · 탭 단위 · DB 0.
- **서버 전달 = query `organizationId`** (`store-services?organizationId=`) — header 방식은 기존 route 계약에 없어 채택 안 함.
- 규칙(`StoreContext.tsx`): 목록 1개 → 자동 · 저장값이 목록에 있으면 복원 · 아니면 `select` 상태 → `/select-store`. 서버가 `resolved` 가 아니면(`NOT_STORE_MEMBER` 등) 선택값 폐기 + 재선택. `내 매장: ○○ ▼`(`data-testid=store-switcher`) 로 언제든 변경(1개면 disabled).
- URL 에 organizationId 를 두지 않는 이유: canonical path(IR §21)를 서비스·매장 무관하게 유지하고, 공유 링크로 타인 조직 id 가 새어 나가는 표면을 만들지 않기 위함. 서버는 어차피 매 요청 재검증하므로 URL 에 둘 이점이 없다.

## 5. Workspace handoff 결정 — ③ 로는 동등 보안 불가 → **STOP · DDL 판단 요청**

기존 service handoff 의 보안 속성 = `handoff_tokens` 행(사용자 바인딩 · `expires_at` 짧은 TTL · `consumed_at` **원자적 UPDATE 로 1회성/replay 방지** · target 검증) + exchange 후 `refreshTokenFamily` 승계 · `persistRefreshTokenFamily` · `setAuthCookies`.

③(DDL 0 · 별도 단기 Workspace Handoff Token)으로 같은 속성을 만드는 경로를 검토한 결과:

| 후보 | 1회성 · replay 방지 | 판정 |
|---|---|---|
| stateless 서명 토큰(JWT 류, 짧은 TTL · 사용자 · targetWorkspace · targetOrigin 서명) | **불가** — 소비 기록이 없어 TTL 안에서 재사용 가능. 인메모리 소비 집합은 API Cloud Run `--max-instances=10` 에서 인스턴스 간 공유되지 않음(Redis 은퇴 상태) | ✗ |
| `handoff_tokens` 재사용 + `target_service_key='store'` 마커 | 원자성 ○ 이나 **가짜 serviceKey**(IR §13 · 지시로 금지) | ✗ 금지 |
| `refresh_tokens` / `linking_sessions` 등 기존 테이블에 의미 다른 row 저장 | 원자성 ○ 이나 의미 오용 · 기존 계약(family · linking) 오염 | ✗ |
| exchange 시 refresh family 회전으로 1회성 대체 | 원자적이지만 "exchange 후 기존 session/token family 계약 유지" 조건 위반 | ✗ |

→ **DDL 0 으로는 "기존 handoff 와 동등한 replay 방지" 를 확보할 수 없다.** 지시대로 우회하지 않고 STOP.

**최소 DDL 안(사용자 판단 요청)**:
```sql
ALTER TABLE handoff_tokens ALTER COLUMN target_service_key DROP NOT NULL;
ALTER TABLE handoff_tokens ADD COLUMN target_workspace varchar(32) NULL;
-- CHECK (target_service_key IS NOT NULL OR target_workspace IS NOT NULL)  -- 둘 중 하나는 반드시
```
승인 시 후속 WO 범위: migration(epoch13 + manifest · Job 먼저→deploy) · `POST /auth/handoff` body `{ targetWorkspace:'store' }` 분기(권한 = `resolveAccessibleStores` ≥1 · targetOrigin=`https://store.neture.co.kr` 고정 · 기존 serviceKey 분기 무변경) · exchange 의 target 검증 분기 · 계약 spec(org 없음=403 · service membership 무관). 기존 service handoff 동작 변경 0.

**이번 WO 산출**: 수신 페이지 `services/web-store/src/pages/HandoffPage.tsx`(`/handoff?token=&returnTo=`) — 발급 측이 열리기 전까지 유효 토큰을 받을 수 없어 `HANDOFF_TOKEN_INVALID` 안내만 동작(로컬 smoke: 토큰 없음 → "이동 정보가 없습니다" PASS). 백엔드 handoff 코드 변경 0(spec 으로 단언).

## 6. 검증

| 항목 | 결과 |
|---|---|
| `jest unified-store-workspace-foundation.spec.ts` | **15/15 PASS** — resolveAccessibleStores(2 질의 · 정렬 · 0건 · 빈 userId · 최소 필드 3개) · 라우트 requireAuth/additive · store-services 계약 불변 · catalog 에 'store' 없음 · handoff 라우트/NOT NULL/컨트롤러 무변경 · CORS 정확 origin · web-store serviceKey 0 · Selector 규칙 · nav 6 · 3 서비스 /store 라우트 · CI 등록 |
| 기존 `service-tenant-foundation` · `store-workspace-integration` · `lecture-service-foundation` | **34/34 PASS** (합계 4 suites 49) |
| `apps/api-server` `tsc --noEmit` | PASS |
| `pnpm --filter store-web build` (`tsc -b && vite build`) | PASS (637 kB chunk 경고만 · lecture 와 동일 수준) |
| auth-react 소비처 `tsc -b`: web-neture · web-kpa-society · web-k-cosmetics · web-pharmacy-hub · web-lecture | 5/5 PASS |
| 로컬 dev `http://localhost:4210` 실브라우저 | `/` → 로그인 안내 카드 + 상위 nav 6 + footer PASS · `/login` 렌더 PASS · `/handoff`(토큰 없음) PASS. **API 호출은 프로덕션 API CORS 가 `localhost:4210` 을 허용하지 않아 차단**(`devOrigins` 에 42xx 없음 — lecture 로컬도 동일 전제). Google 버튼은 config 조회 실패로 "준비 중" 표시 |
| Google 로그인 → Selector → 빈 Workspace | **PENDING_USER_VERIFICATION** — Google authorized origin 미등록(§7) + 로컬 CORS 차단 + store_owner 계정 미준비(WO5 Gate 0 과 동일 규칙: 로그인 반복 시도 · seed · lockout 해제 금지). 배포 후 `https://store.neture.co.kr` 에서 사용자 브라우저로 수행 |
| Docker 이미지 빌드 | 미실행(CI 가 수행 · lecture Dockerfile 과 동일 구조 · 선별 COPY 대상 패키지 동일 4종) |
| 사전 존재 문제 | `packages/auth-client/dist` stale 로 첫 빌드 실패(`GoogleLinkResult` export 누락) → `pnpm --filter @o4o/auth-client build` 로 해소. 코드 변경 아님 |

## 7. 인계 항목 (WO C · 사용자 승인)

| 항목 | 값 | 담당 |
|---|---|---|
| Google authorized JavaScript origins | `https://store.neture.co.kr` · (로컬 검증용) `http://localhost:4210` | 사용자(Google 콘솔) |
| API CORS | 코드 반영 완료 → api-server 배포 시 적용. env 추가 불요 | 배포 |
| Cloud Run | `store-web`(이미지 `gcr.io/<project>/store-web`) — `deploy-web-services.yml` 등록 완료 · 첫 push 시 자동 배포 | CI |
| DNS · cert · GCLB | `store.neture.co.kr` → backend `backend-store-web` + NEG · URL map path-matcher · managed cert(lecture 절차 `CHECK-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1` 동일) · Gabia DNS | WO C / 사용자 |
| 로컬 dev CORS | `localhost:4210` 은 프로덕션 API 에서 차단. 로컬 API 기동 또는 `devOrigins` 추가는 별도 판단 | 미지시 |
| handoff 발급 측 | §5 DDL 판단 → 후속 WO | 사용자 |

## 8. Store Owner Agreement 428 gate census (변경 0)

- 발생 지점 1곳: `apps/api-server/src/utils/store-owner.utils.ts:296` `STORE_OWNER_AGREEMENT_REQUIRED`(428) — `createRequireStoreOwner` 계열 guard 안.
- 소비 라우트 파일 28곳(KPA/KCos/PH store · store-library · store-ai · o4o-store 다국어 등)이 `createRequireStoreOwner(` 로 걸린다.
- Unified 경로(`accessible-stores` · `store-services`)는 이 guard 를 거치지 않으므로 **매장 선택 · 서비스 목록까지는 agreement 없이 도달**하고, WO B 에서 기능 화면을 붙일 때 서비스별 store API 호출 시점에 428 이 발생한다. → WO B 입력: Workspace 공통 428 처리(어느 서비스 agreement 인지 표시) 필요. 정책 · guard 변경 없음.

## 9. WO B 로 넘기는 nav 하위 항목

| 상위(placeholder) | 후보 하위(기존 3 서비스 `/store` 합집합이 아니라 WO B 에서 선별) |
|---|---|
| 내 매장 `/store` | 매장 정보 · 경영자 계약/agreement 상태 · 제품(handled products) · 콘텐츠/자료함 · QR · POP · 태블릿 · 사이니지 · 다국어 |
| 서비스 업무 `/work` | 선택된 서비스 context 의 업무(서비스 filter 실동작) |
| 매장 HUB `/hub` | Unified Store Hub(공급자 콘텐츠 유입 · 상담 요청) |
| 내 서비스 `/services` | 표시+선택 상태 구현됨 → filter 전환 실동작 · 가입 안내 |
| 설정 `/settings` | 계정 · 알림 · 매장 전환 기본값 |
| 공통 | `store-ui-core` + Tailwind 채택 결정 · 428 agreement 공통 처리 · handoff 송신 측(WO C) |

## 10. Git

- path-specific stage · `check-staged-scope.mjs` · `git commit -- <paths>` · push main. 다른 세션 파일(`structure-inference.service.ts` · `scripts/ai/*smoke.mts`) 불가침.
- 자격정보 · 계정 email 기록 0.
