# WO-O4O-SERVICE-ADMIN-API-GUARD-EMERGENCY-V1 — CHECK

**작업일:** 2026-08-03
**대상:** `/api/v1/service-admin` subtree 백엔드 인증·권한 경계 긴급 복구
**선행 감사:** [O4O-ADMIN-AUTHORIZATION-ROLE-ROUTE-API-CONSISTENCY-AUDIT-V1](../audits/O4O-ADMIN-AUTHORIZATION-ROLE-ROUTE-API-CONSISTENCY-AUDIT-V1.md) P0-1

---

## 0. 작업 시작 상태

| 항목 | 값 |
|---|---|
| branch | `main` |
| 시작 HEAD | `f787d15610c0f61539356d0dd95df6b97285fd66` |
| 시작 worktree | clean |
| origin/main 동기 | `git rev-list --left-right --count HEAD...origin/main` → `0 0` |
| remote | `https://github.com/Renagang21/o4o-platform.git` |
| 작업 중 HEAD 이동 | `f787d1561` → `f8b046cb5` (다른 세션 push) |
| 작업 중 타 세션 변경 | ` M packages/tablet-kiosk-core/src/TabletKioskPage.tsx` — **미접촉·미스테이지** |

`pnpm-lock.yaml`, HFF·OTC·다국어·태블릿 작업물 **전부 미접촉**.

---

## 1. 기존 mount 와 guard 누락 원인

`apps/api-server/src/bootstrap/register-routes.ts:266`

```ts
app.use('/api/v1/service-admin', serviceAdminRoutes);
```

- mount 지점에 미들웨어 인자 없음.
- `service-admin.routes.ts` 내부에도 `authenticate` / `requireAdmin` / `requireRole` 토큰 0건.
- `main.ts` 는 `/api/v1` 에 **전역 인증을 걸지 않는다** (등록되는 것은 `globalErrorHandler` 뿐).

→ 세 계층 모두에 경계가 없어 8개 endpoint 전부가 비로그인에 공개. 감사 단계에서 프로덕션 비로그인 `GET 200` 실측으로 확인됨.

**누락 원인 판정:** 이 플랫폼은 **라우터 내부 guard 가 유일한 방어선**인데, 이 라우터는 Phase 8 신설 당시 `routes/admin/*.routes.ts` 계열이 따르는 `router.use(authenticate); router.use(requireAdmin);` 관례를 적용하지 않았다. 전역 인증이 없으므로 관례 누락이 곧 경계 부재가 된다. 구조적 실패이지 개별 endpoint 실수가 아니다.

---

## 2. service-admin endpoint 전수 목록

| # | Method | Path | Read/Write | 호출 화면 |
|---|---|---|:---:|---|
| 1 | GET | `/summary` | R | **없음** |
| 2 | GET | `/apps` | R | **없음** |
| 3 | GET | `/theme` | R | **없음** |
| 4 | **PUT** | `/theme` | **W** | **없음** |
| 5 | **POST** | `/theme/reset` | **W** | **없음** |
| 6 | GET | `/init-preview/:templateId` | R | **없음** |
| 7 | GET | `/templates` | R | **없음** |
| 8 | GET | `/stats` | R | **없음** |

**소비처 0건** — 저장소 전수 검색(`service-admin`) 결과 정의부와 mount 1줄 외 참조 없음. admin-dashboard / services/web-* 어디에서도 호출하지 않는다.

---

## 3. 정상 허용 역할과 근거

**판정: platform 관리자 전용** (`platform:admin` / `platform:super_admin`)

WO 의 핵심 요구 — "무조건 `requireAdmin` 을 붙이는 것이 아니라 platform 전용인지 서비스별인지 먼저 확인" — 에 대해 코드 근거 3가지로 확정했다.

**근거 ①  반환 데이터가 서비스별이 아니라 플랫폼 전역 레지스트리다**

| 의존 | 성격 |
|---|---|
| `moduleLoader` | 프로세스에 설치된 **모듈 전체** |
| `templateRegistry` | **서비스 템플릿 전체** (`getAllTemplates`, `getStats`) |
| `initPackRegistry` | init pack 전체 |
| `themePresetService.getAllDefaultPresets()` | **플랫폼 기본 프리셋** |

특정 서비스의 데이터를 반환하지 않으므로 서비스 경계로 나눌 대상이 아니다.

**근거 ②  serviceKey / organization scope 로 좁힐 축이 존재하지 않는다**

- `tenantId` · `serviceGroup` 은 **요청자가 query·body 로 직접 지정**하며 소유권 검사가 없다.
- `req.tenantId` 를 채우는 `tenant-context.middleware` 는 **어디에도 등록돼 있지 않다** → 항상 `undefined`, 즉 실사용 값은 100% 요청자 입력.

→ 서비스 관리자에게 열면 임의 `tenantId` 를 지정해 **다른 테넌트의 테마를 조회·변경**할 수 있다. scope 검사를 추가하려면 tenant 소유권 모델이 필요한데, 이는 이번 긴급 WO 범위 밖(schema·역할 데이터 변경 금지)이다. 따라서 최소 권한 = platform 전용.

**근거 ③  소비처 0건 → 기능 회귀 위험 0**

정상 사용 중인 서비스 관리자 흐름이 존재하지 않으므로, platform 전용으로 좁혀도 차단되는 합법적 사용자가 없다. "정상 서비스 관리자를 차단하지 않는다" 조건과 충돌하지 않는다.

**theme 조회·수정·reset 의 성격:** 플랫폼 공용. `themePresetService` 는 플랫폼 기본 프리셋 + tenant override 를 다루며, tenant 축은 위와 같이 요청자 입력이다. 서비스별 기능이 아니다.

---

## 4. 적용한 guard

`apps/api-server/src/routes/service-admin.routes.ts` — **router 수준 1회 적용**, 개별 endpoint 수정 0.

```ts
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
...
const router: Router = Router();
// (근거 주석)
router.use(authenticate);
router.use(requireAdmin);
```

- **기존 canonical guard 재사용** — `routes/admin/apps.routes.ts`, `routes/admin/dashboard.routes.ts` 와 동일 조합.
- `requireAdmin` = `hasAnyRole(['platform:admin','platform:super_admin'])` (WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1).
- **신규 역할 체계·permission 시스템 신설 0.** 새 상수 정의 0.
- 오류 계약 준수: 미인증 `401 AUTH_REQUIRED` / 권한 부족 `403 FORBIDDEN`.
- mount 지점(`register-routes.ts`) **미변경** — 경계는 라우터 내부에만 둔다.
- **로그에 요청 본문·인증정보 추가 0건** (logger 호출 신규 추가 없음).

첫 endpoint 정의보다 앞에 두었으므로 **이후 추가되는 endpoint 도 자동으로 경계 아래**에 놓인다.

---

## 5. 검증 결과 (11항목)

테스트: `apps/api-server/src/__tests__/service-admin-guard.spec.ts` — **47 tests, 47 passed**

| # | 필수 검증 | 결과 |
|:---:|---|:---:|
| ① | 비로그인 GET → 401 | **PASS** (6 GET 전부, `code: AUTH_REQUIRED`) |
| ② | 비로그인 PUT `/theme` → 401 | **PASS** |
| ③ | 비로그인 POST `/theme/reset` → 401 | **PASS** |
| ④ | 일반 사용자 → 403 | **PASS** (8 endpoint 전부, `code: FORBIDDEN`) |
| ⑤ | 허용되지 않은 서비스 역할 → 403 | **PASS** (`kpa:admin` · `neture:admin` · `kpa:operator` · 비prefix `operator`/`admin`/`super_admin`) |
| ⑥ | 정상 관리자 → 기존 handler 도달 | **PASS** (`platform:admin` · `platform:super_admin` × 8 endpoint, 401·403 아님) |
| ⑦ | 타 서비스 scope 요청 차단 | **N/A → 후속** (§7 참조) |
| ⑧ | 모든 endpoint 가 guard 아래 | **PASS** (선언 8건 = 테스트 8건, guard 앞 선언 0건) |
| ⑨ | guard 밖 신규 endpoint 추가 시 실패하는 회귀 테스트 | **PASS — mutation 실증** |
| ⑩ | 기존 관련 테스트 통과 | **PASS** (`membership-admin-guard.spec.ts` 44/44) |
| ⑪ | typecheck 또는 범위 build | **PASS** (`tsc -p tsconfig.build.json` 오류 0) |

### ⑨ mutation 실증

guard 위에 `router.get('/__mutation_probe__', ...)` 를 임시 삽입 → **3 tests failed**:

- `guard 가 첫 endpoint 정의보다 앞에 등록된다`
- `guard 보다 앞에 선언된 endpoint 가 0건이다`
- `테스트가 라우터의 endpoint 를 전수 포함한다`

probe 제거 후 **47/47 재통과**. 회귀 가드가 실제로 동작함을 확인.

### ⑪ typecheck 참고

`tsc --noEmit -p tsconfig.json` 는 오류 21건을 보고하나 **전부 `src/scripts/**` 의 기존 OTC·HFF 일회성 스크립트**이며 이번 변경 이전부터 존재한다. 빌드 대상인 `tsconfig.build.json` 은 `scripts` 를 제외하며 **오류 0**. 이번 변경 파일(`routes/`, `__tests__/`)에서 발생한 오류는 0건.

---

## 6. 심각도 보정 — 사실만 기록

- 확정된 사실: **인증되지 않은 요청이 관리자 handler 까지 도달했다** (프로덕션 GET 200 실측).
- **무인증 쓰기 성공은 확정하지 않았다** — 프로덕션 write 요청을 실행하지 않았다.
- 다만 `themePresetService` 는 `private tenantThemes = new Map<...>()` 로 **in-memory 저장**이다. 따라서 PUT·POST 가 성공했더라도 변경 대상은 프로세스 메모리이며 **DB write·영속 데이터·개인정보 변경은 아니다**. 그럼에도 무인증 요청이 관리자 write handler 에 도달한다는 사실 자체가 P0 이다.

---

## 7. scope 후속 (미해결로 명시)

`tenantId` / `serviceGroup` 의 **소유권 검사가 여전히 없다**. 현재는 `requireAdmin` 으로 platform 관리자만 통과하므로 실질 위험은 제거됐으나, 다음이 남는다.

- `tenant-context.middleware` 미등록 → `req.tenantId` 영구 `undefined`.
- 향후 이 라우터를 서비스 관리자에게 개방하려면 tenant 소유권 축이 **먼저** 필요하다.

이번 WO 범위 밖(schema·역할 데이터 변경 금지). 별도 후속으로 남긴다.

---

## 8. 안전성 기록

| 항목 | 결과 |
|---|:---:|
| 운영 데이터 write | **0건** |
| 직접 SQL | **0건** |
| schema / migration | **0건** |
| 배포 전 프로덕션 쓰기 요청 | **0건** |
| 비로그인 PUT·POST 프로덕션 재현 | **하지 않음** (WO 지시) |
| 보호 데이터 응답 본문 출력 | **0건** |
| 자격증명·토큰·개인정보 출력 | **0건** |
| 테스트 계정 생성·역할 변경 | **0건** |
| 다른 세션 Cloud SQL Proxy 종료 | **0건** (프록시 미사용) |
| `pnpm-lock.yaml` 접촉 | **0건** |
| 타 세션 작업물 stage | **0건** |
| 테스트의 DB 접근 | **0건** (전 의존 in-memory 대역) |

---

## 9. 범위 준수

미수정 확인: membership subtree / `AdminProtectedRoute` / 메뉴·route 권한 / 역할명 정비 / permission 체계 / **theme 기능 자체** / 데이터 모델 / 운영 데이터 / 다른 관리자 API.

변경 파일 3건:

- `apps/api-server/src/routes/service-admin.routes.ts` (guard 2줄 + import + 근거 주석)
- `apps/api-server/src/__tests__/service-admin-guard.spec.ts` (신규)
- `docs/checks/WO-O4O-SERVICE-ADMIN-API-GUARD-EMERGENCY-V1-CHECK.md` (본 문서)

---

## 10. 최종 판정

**`PASS_WITH_SCOPE_FOLLOWUP`**

- 8개 endpoint 전부가 router 수준 단일 경계 아래로 들어갔고, 회귀 테스트가 그 순서를 고정한다.
- 정상 허용 역할을 코드 근거로 확정한 뒤 기존 guard 를 재사용했다 — 신규 권한 체계 0.
- `tenantId` 소유권 검사 부재(§7)가 미해결로 남아 `_WITH_SCOPE_FOLLOWUP`.

**다음 P0:** `WO-O4O-MEMBERSHIP-RESIDUAL-SUBTREE-GUARD-V1` — `/audit-logs`, `/affiliations`, `/organizations/:organizationId/members`, `/license-verification`.
