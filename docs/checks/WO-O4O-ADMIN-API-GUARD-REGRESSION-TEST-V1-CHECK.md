# WO-O4O-ADMIN-API-GUARD-REGRESSION-TEST-V1 — CHECK

> **선행**: `WO-O4O-ADMIN-AUTHORIZATION-ROLE-ROUTE-API-CONSISTENCY-AUDIT-V1`(판정 `CRITICAL_ACCESS_RISK`) ·
> `WO-O4O-SERVICE-ADMIN-API-GUARD-EMERGENCY-V1` · `WO-O4O-MEMBERSHIP-RESIDUAL-SUBTREE-GUARD-V1`
> **일자**: 2026-08-04 · branch `main` · 시작 HEAD `122866ff9` · commit **`081a6d1c4`**
> **9단계 후속 순서 중 3번** (관리자 API guard 누락 회귀 테스트)

**최종 판정: `PASS_WITH_SCOPE_FOLLOWUP`**

---

## 1. 왜 필요한가 — 선행 두 WO 가 덮지 못하는 층

`main.ts` 는 `/api/v1` 에 전역 인증을 걸지 않는다. 등록되는 것은 `globalErrorHandler` 뿐이다.
따라서 **라우터 guard 가 유일한 방어선**이고, 관례를 한 번 빠뜨리면 그 순간 관리자 API 가 무인증 공개된다.

선행 두 WO 의 테스트는 **각자 고친 subtree 안에서만** 순서·전수를 고정한다.

| 기존 spec | 덮는 범위 | 덮지 못하는 것 |
|---|---|---|
| `service-admin-guard.spec.ts` | `/api/v1/service-admin` 라우터 내부 | 다른 관리자 라우터 |
| `membership-admin-guard.spec.ts` · `membership-residual-subtree-guard.spec.ts` | `/api/v1/membership/*` mount 목록 | membership 밖 |

즉 **새 관리자 라우터가 guard 없이 `register-routes.ts` 에 추가되는 경우를 잡는 장치가 없었다.**
이번 산출물은 그 위 계층을 고정한다.

---

## 2. 현재 상태 실측 — 관리자 mount 43건 전수

`register-routes.ts` 의 `app.use('/api...')` 138건 중 `/admin`·`/operator`·`/service-admin` 성격 **43건**을
정적 분석했다. 결과는 다음과 같다.

| guard 형태 | 건수 | 의미 |
|---|---:|---|
| 라우터 수준 `router.use(인증 + 인가)` | 28 | 신규 endpoint 가 방어선을 자동 상속 |
| 라우터 수준 인증 + endpoint 별 인가 | 4 | `admin/users`·`platform-accounts`·`platform-users`·`operator`(알림) |
| endpoint 별 인증·인가 | 10 | channel-*·ops-metrics·contact-inquiry·service-legal 등 |
| handler 내부 인가 | 1 | `/api/admin/orders` (§4) |
| **guard 없음** | **0** | — |

**즉 현재 무방비로 노출된 관리자 mount 는 없다.** 이번 WO 는 새로 뚫린 구멍을 메운 것이 아니라
**메워진 상태를 깨지지 않게 고정**한 것이다.

---

## 3. 조사 중 정정한 오탐 3종 (테스트 설계에 반영)

처음 스캔은 실제보다 넓게 "미보호"를 보고했다. 코드를 읽어 전부 오탐으로 확정했고, 판정 규칙을 고쳤다.

| 오탐 | 실제 | 반영 |
|---|---|---|
| `requireAdmin` 단독 = 인증 없음 | `requireAdmin`·`requireRole` 은 `req.user` 가 없으면 `requireAuth` 로 위임해 **401** 을 돌려준다 (`common/middleware/auth/authorization.middleware.ts:42`·`:106`) | 인가 미들웨어는 인증도 만족하는 것으로 판정 |
| `requireOperatorOrAdmin` 미인식 | 인가 미들웨어가 맞다 | 인가 패턴을 `require(?!Auth)[A-Z]…` 로 일반화 |
| `manageGuard` 같은 지역 변수 미인식 | `const manageGuard = requireServiceLegalScope('operator')` 재사용 패턴 | 라우터 파일 안에서 인가식을 담은 `const` 이름을 인가 토큰으로 인정 |

---

## 4. `/api/admin/orders` — 문서화된 유일한 예외

라우터에는 `authenticate` 만 있고 인가 미들웨어가 없다. 다만 `AdminOrderController` 가
**5개 handler 전부에서** `isAdmin(user)` 를 직접 검사한다(`controllers/admin/adminOrderController.ts:22`).
따라서 무인가 접근이 성립하지는 않는다.

그럼에도 **미들웨어 방식보다 약하다**:

1. endpoint 를 추가하는 사람이 검사를 빠뜨려도 정적으로 드러나지 않는다.
2. `isAdmin` 은 `user.roles` 를 읽는다 — RBAC SSOT 인 `role_assignments` 경유(`requireAdmin`)와 **경로가 다르다**.

이번 범위(테스트 추가)에서 미들웨어로 옮기는 것은 **런타임 동작 변경**이라 넣지 않았다.
테스트는 이를 근거와 함께 예외 목록에 적고, **예외가 불필요해지면(=미들웨어로 정상화되면) 실패**하도록 했다.
죽은 예외가 방치되지 않는다.

---

## 5. 산출물

**파일 1개 추가, 프로덕션 코드 무변경.**

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/__tests__/admin-api-guard-inventory.spec.ts` | 신규 계약 테스트 (338줄) |

정적 분석이다. DB·네트워크·express 부팅이 없다.

### 고정하는 8개 단언

| # | 단언 | 깨지는 상황 |
|---|---|---|
| 1 | 관리자 mount 를 40건 이상 찾는다 | 파서가 깨져 0건이 되면(공허한 통과) 실패 |
| 2 | 모든 mount 의 라우터 소스를 **해석할 수 있다** | 새 mount 표기법을 스캐너가 못 읽으면 실패 |
| 3 | 모든 mount 에 인증 guard | 인증 누락 |
| 4 | 모든 mount 에 인가 guard | 인가 누락 |
| 5 | endpoint 단위로도 인가 누락 0 | 라우터 일부 endpoint 만 방치 |
| 6 | 예외 목록이 여전히 필요하다 | 예외가 정상화됐는데 목록에 남아 있음 |
| 7 | `/api/v1/service-admin` 은 **라우터 수준** guard 유지 | per-endpoint 로 되돌아감 |
| 8 | `/api/v1` 전역 인증이 여전히 없다 | 방어 구조가 바뀌면 이 spec 의 전제를 재검토하라는 신호 |

> #2 가 핵심이다. **해석 실패를 통과로 처리하지 않는다.** 그래야 이 테스트가 "보이는 것만 검사하는" 상태로 썩지 않는다.

---

## 6. 요구 ⑨ 검증 — 변이(mutation) 로 실제 실패를 확인

"신규 endpoint 를 guard 밖에 추가하면 실패하는 회귀 테스트" 라는 요구를 **주장이 아니라 실측**으로 확인했다.

### 변이 1 — guard 없는 관리자 라우터를 새로 mount

```
+ app.use('/api/v1/admin/mutation-probe', mutationProbeRoutes);   // router.get('/secrets', handler) 뿐
```

**결과: 3개 단언 실패** (#3 인증 · #4 인가 · #5 endpoint 단위).
실패 메시지가 경로·`register-routes.ts` 줄번호·파일·endpoint(`L4 GET /secrets`) 를 그대로 지목한다.

### 변이 2 — 스캐너가 해석할 수 없는 형태로 mount

```
+ app.use('/api/v1/admin/mutation-probe', someUnresolvableBinding);
```

**결과: #2 실패.** 조용히 건너뛰지 않는다.

### 변이 원복

두 변이 모두 원복했고 `git diff` 가 비었음을 확인했다. probe 파일은 삭제했다.
(파이썬 재기록으로 줄바꿈이 CRLF→LF 로 바뀐 것까지 `git checkout -- <해당 파일 1개>` 로 되돌렸다.
그 시점 diff 는 **내용상 비어 있어** 다른 세션 변경을 잃을 위험이 없음을 먼저 확인했다.)

---

## 7. 테스트·타입체크 결과

| 항목 | 명령 | 결과 |
|---|---|---|
| 신규 spec | `npx jest src/__tests__/admin-api-guard-inventory.spec.ts` | **8 pass / 0 fail** |
| `__tests__` 전체 | `npx jest src/__tests__/` | **25 suites / 630 tests 전부 pass** |
| 선행 guard spec 회귀 | 위에 포함 (`service-admin` · `membership-admin` · `membership-residual` · `kpa-role`) | **pass** |
| 타입체크 | `npx tsc --noEmit -p tsconfig.build.json` | **error 1건 — 내 변경과 무관** (§9) |

---

## 8. 안전성

| 항목 | 값 |
|---|---:|
| 프로덕션 요청 (읽기·쓰기 모두) | **0** — 정적 분석이라 필요 없었다 |
| 운영 DB write · 직접 SQL · migration | **0** |
| 프로덕션 코드 변경 | **0** (테스트 파일 1개 추가만) |
| 자격증명·토큰·응답 본문 출력 | **0** |
| 테스트 계정 사용 | **0** |
| Cloud SQL Proxy 기동·종료 | **0** |
| 다른 세션 파일 접촉 | **0** — commit 은 `-- <내 파일 1개>` pathspec |

---

## 9. 범위 밖으로 남긴 것 (수정하지 않음, 기록만)

| 항목 | 내용 |
|---|---|
| `/api/admin/orders` 인가의 미들웨어化 | §4. 런타임 동작 변경이라 별도 WO. `isAdmin`(`user.roles`) → `requireAdmin`(`role_assignments`) 로 SSOT 통일이 함께 필요 |
| main 타입체크 red | `services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts(340,11) TS2322: '"pharmacy-hub"' is not assignable to 'StoreSlugServiceKey'` — 다른 세션의 `43f52789b` 에서 유입. **내 변경 이전부터 존재**하며 내 파일과 무관 |
| CI Pipeline red | admin-dashboard Vitest 의 `Failed to resolve entry for package "@o4o/auth-client"`. 다른 세션이 `CHECK-O4O-CI-AUTH-CLIENT-BUILD-ORDER-FIX-V1.md` 로 다루는 중 |
| membership subtree | 별도 spec 2종이 이미 덮는다. 중복 설계하지 않았다 |
| 프런트 route·메뉴 권한 | 9단계 순서의 4·5번. 이번 범위 아님 |

---

## 10. 최종 판정 — `PASS_WITH_SCOPE_FOLLOWUP`

| 요구 | 결과 |
|---|:--:|
| 관리자 API guard 누락을 잡는 회귀 테스트 | ✅ |
| 저장소 전역(43 mount) 커버 | ✅ |
| 신규 mount 가 guard 밖이면 실패 — **변이로 실증** | ✅ |
| 스캐너 해석 실패를 통과로 처리하지 않음 | ✅ |
| 선행 두 WO 의 결과를 회귀로 고정 | ✅ |
| 프로덕션 코드·DB·요청 변경 | ✅ **0** |

### `PASS` 가 아닌 이유

현재 무방비 관리자 mount 는 0건이고 신규 추가는 테스트가 잡는다. 다만 `/api/admin/orders` 는
**미들웨어가 아니라 handler 내부**에서 인가를 검사하며 그 검사가 RBAC SSOT 와 다른 경로(`user.roles`)를 읽는다.
정적으로 보장되지 않는 지점이 하나 남아 있으므로 `PASS_WITH_SCOPE_FOLLOWUP` 으로 닫는다.
