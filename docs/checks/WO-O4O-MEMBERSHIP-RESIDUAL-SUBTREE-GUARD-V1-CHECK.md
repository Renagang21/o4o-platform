# WO-O4O-MEMBERSHIP-RESIDUAL-SUBTREE-GUARD-V1 — CHECK

> **선행**: `WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-AUTHORIZATION-AUDIT-V1` · `WO-O4O-ADMIN-MEMBERSHIP-API-AUTHORIZATION-GUARD-V2` · `WO-O4O-SERVICE-ADMIN-API-GUARD-EMERGENCY-V1`
> **일자**: 2026-08-03 · branch `main` · 시작 HEAD `9efba8fca`

**최종 판정: `PASS_WITH_SCOPE_FOLLOWUP`**

---

## 1. 시작 기준

| 항목 | 값 |
|---|---|
| branch | `main` |
| 시작 HEAD | `9efba8fca` |
| `HEAD...origin/main` | `0 0` |
| `git status` | `M apps/api-server/src/scripts/data/otc-zh-batch01-verify.ga.json` — **다른 세션 소유, 미접촉** |
| remote | `git@github.com:Renagang21/o4o-platform.git` |

**중지 조건 #6 확인**: `packages/membership-yaksa/src/backend/routes/` 최근 커밋은
`6c285645d`(카테고리 목록 표시) 로 **다른 세션이 동일 router·middleware 를 수정 중이지 않음**을 확인했다.

---

## 2. Membership mount 과 middleware 구조

```
register-routes.ts:364
    registerMembershipAdminGuards(app);                     ← guard 를 먼저 등록
    app.use('/api/v1/membership', createMembershipRoutes(dataSource));
```

`@o4o/membership-yaksa` 는 packages 계층이라 `apps/api-server` 미들웨어를 import 할 수 없다.
따라서 guard 는 **mount 지점**에서 건다(기존 확립된 패턴, `membership-admin-guard.ts`).
Express 는 등록 순서로 매칭하므로 guard 등록이 mount 보다 앞서야 한다 — 테스트로 고정했다(§15).

기존 보호 방식은 2종이다.

| guard | 대상 | 동작 |
|---|---|---|
| `adminOnly` | subtree 전체 | `authenticate` → `requireRole(MEMBERSHIP_ADMIN_ROLES)` |
| `membersSelective` | `/members` | `/me`·`/me/summary` 만 통과, 나머지는 `adminOnly` |

---

## 3. 대상 4개 subtree 의 endpoint 전수 목록

**총 16개.** 라우터 정의와 1:1 대조했고, 테스트가 개수 일치를 강제한다(§15).

### A. `/audit-logs` — 4 (전부 read)

| method | path | 성격 |
|---|---|---|
| GET | `/` | 전체 감사 로그 조회 |
| GET | `/recent` | 최근 변경 이력 |
| GET | `/stats` | 변경 통계 |
| GET | `/:id` | 감사 로그 상세 |

### B. `/affiliations` — 2 (전부 write)

| method | path | 성격 |
|---|---|---|
| PUT | `/:id` | 소속 정보 수정 |
| DELETE | `/:id` | 소속 삭제 |

### C. `/organizations/:organizationId/members` — 2 (전부 read)

| method | path | 성격 |
|---|---|---|
| GET | `/` | 조직 회원 목록 |
| GET | `/history` | 조직 회원 변경 이력 |

### D. `/license-verification` — 8 (read 3 / write 5)

| method | path | 성격 |
|---|---|---|
| POST | `/requests` | 검증 요청 생성 |
| GET | `/requests` | 대기 요청 목록 |
| GET | `/stats` | 검증 통계 |
| POST | `/bulk-requests` | 일괄 요청 생성 |
| GET | `/requests/:id` | 요청 상세 |
| POST | `/requests/:id/verify` | 검증 수행 |
| POST | `/requests/:id/manual-verify` | 수동 검증 처리 |
| POST | `/requests/:id/fail` | 실패 처리 |

---

## 4. read / write 구분

| subtree | read | write | 계 |
|---|---:|---:|---:|
| `/audit-logs` | 4 | 0 | 4 |
| `/affiliations` | 0 | **2** | 2 |
| `/organizations/:id/members` | 2 | 0 | 2 |
| `/license-verification` | 3 | **5** | 8 |
| **합계** | **9** | **7** | **16** |

read·write 의 정상 권한이 **동일**(플랫폼 관리자)하므로 분리하지 않았다(§6).

---

## 5. 기존 guard 누락 원인

선행 WO(V2)는 `/members` 에 **회원 본인용 경로가 섞여 있다**는 이유로 mount 전체가 아니라
**subtree 별로** guard 를 걸었고, 그때 확정한 목록이 categories·export·stats·verifications 4종이었다.
Phase 2 에서 추가된 이 4개 subtree 는 그 목록에 포함되지 않아 **경계 밖에 남았다**.

선행 CHECK 에도 미보호로 명시돼 있었고, 테스트가 그 상태를 "범위 밖"으로 고정하고 있었다
(`membership-admin-guard.spec.ts` — 이번에 갱신).

---

## 6. 정상 허용 역할과 코드 근거

**결론: 4개 subtree 전부 플랫폼 관리자 전용.** 근거는 다음과 같다.

| 근거 | 내용 |
|---|---|
| 라우터 JSDoc | 네 파일 모두 "관리 라우트"로 기술. 공개·본인용 표기 없음 |
| 데이터 성격 | 감사 기록 / 타인 소속 수정·삭제 / 조직 회원 명부 / 면허 검증 승인 — 전부 관리 행위 |
| `createRequest` 주체 | `requestedBy = req.user.id` 를 **스탬프만** 하고 대상 회원은 `req.body` 에서 받는다 → 신청자 self-service 가 아니라 **운영자 대행 생성** |
| 기존 정책 | 선행 guard 가 확립한 `MEMBERSHIP_ADMIN_ROLES = ['platform:admin','platform:super_admin']` 재사용 |
| 데이터 경계 | membership 데이터에는 `serviceKey` 가 없어 서비스 역할(`kpa:admin`)로 범위를 제한할 경계가 없다 |

신규 역할·permission 체계를 만들지 않았다.

---

## 7. 공개 endpoint 존재 여부 — **없음**

지시대로 "공개 계약이 확인된 endpoint 까지 일괄 차단"하지 않기 위해 먼저 확인했다.

**회원 본인용 endpoint 는 대상 4개 subtree 안에 하나도 없다.** 전부 `/members/:memberId/...` 아래에
별도 factory 로 mount 되어 있으며 **이미 `membersSelective` guard 로 보호**된다.

| 본인용 router | mount | 이번 변경 |
|---|---|---|
| `createMemberAffiliationRoutes` | `/members/:memberId/affiliations` | 없음 (기존 보호) |
| `getMemberLogs` | `/members/:memberId/logs` | 없음 (기존 보호) |
| `createMemberLicenseVerificationRoutes` | `/members/:memberId/license-verification` | 없음 (기존 보호) |

즉 `/affiliations` 와 `/license-verification` 은 **관리자용 factory 와 회원용 factory 가 애초에 분리**돼 있었고,
경계 밖에 남아 있던 것은 관리자용 쪽뿐이다. 따라서 router 를 쪼갤 필요가 없었다.

---

## 8. organization · member · service scope 계약

`/organizations/:organizationId/members` 는 요청자가 URL 로 조직을 지정한다.
"URL 의 `organizationId` 를 신뢰하지 않는다" 는 요구를 **접근 주체를 좁혀** 만족시켰다.

| 주체 | 결과 |
|---|---|
| 비로그인 | **401** |
| 일반 사용자 | **403** — 어떤 조직도 조회 불가 |
| 서비스 역할(`kpa:admin` 등) | **403** — 어떤 조직도 조회 불가 |
| `platform:admin` · `platform:super_admin` | 통과 (플랫폼 전역 관리자이므로 cross-org 가 **정상 권한**) |

**"임의 organizationId 로 남의 조직 회원을 조회"할 수 있는 주체가 존재하지 않는다.**
통과 가능한 유일한 주체가 이미 전 조직 권한을 가진 플랫폼 관리자이기 때문이다.

### 왜 조직 소유권 필터를 추가하지 않았는가

조사 결과 scope 재료는 **존재한다**:
`role_assignments.scopeType='organization'` / `scopeId`, 그리고
`organization_members` 의 `role IN ('owner','admin','manager')`
(`signage-role.middleware.ts:279` 가 이 방식을 쓴다).

그럼에도 적용하지 않은 이유:

1. 지금 통과하는 주체는 **플랫폼 관리자뿐**이다. 여기에 조직 소유권 필터를 걸면
   **정상 권한을 축소**할 뿐 보안 이득이 없다(플랫폼 관리자는 원래 cross-org 가 정상).
2. 조직 관리자에게 자기 조직 회원 조회를 **위임**하는 것은 현재 없는 권한을 **새로 부여**하는
   정책 확대다. 보호 강화 WO 에서 접근을 넓히는 것은 방향이 반대이고,
   "신규 permission 체계를 만들지 않는다" 규칙에도 어긋난다.

→ **조직 관리자 위임 계층은 별도 설계 WO 로 남긴다**(§22·판정 사유).

---

## 9. 적용한 guard 와 위치

기존 `MEMBERSHIP_ADMIN_SUBTREES` 에 4종을 추가했다. **새 미들웨어를 만들지 않았다.**

```ts
export const MEMBERSHIP_ADMIN_SUBTREES = [
  '/api/v1/membership/categories',
  '/api/v1/membership/export',
  '/api/v1/membership/stats',
  '/api/v1/membership/verifications',
  // WO-O4O-MEMBERSHIP-RESIDUAL-SUBTREE-GUARD-V1
  '/api/v1/membership/audit-logs',
  '/api/v1/membership/affiliations',
  '/api/v1/membership/organizations',
  '/api/v1/membership/license-verification',
];
```

`/organizations` 는 하위에 `:organizationId/members` 만 존재하므로 **subtree 째로** 건다.
guard 가 path parameter 해석에 의존하지 않게 하기 위함이다.

**변경 파일 3개** — 백엔드 handler·controller·service·schema 는 **무변경**.

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/bootstrap/membership-admin-guard.ts` | subtree 목록 + 판단 근거 주석 |
| `apps/api-server/src/__tests__/membership-admin-guard.spec.ts` | 기존 "범위 밖" 단언 갱신 |
| `apps/api-server/src/__tests__/membership-residual-subtree-guard.spec.ts` | 신규 계약 테스트 |

---

## 10~14. 권한 검증 결과 (자동화 테스트)

| # | 검증 | 결과 |
|---|---|:--:|
| 10 | **비로그인 → 401** (16 endpoint 전수) + handler 미도달 | ✅ |
| 11 | 일반 사용자 → **403** (전수) · 서비스 역할 `kpa:admin` → **403** (전수) | ✅ |
| 12 | `platform:admin` / `platform:super_admin` → **handler 도달** (전수) | ✅ |
| 13 | 다른 조직 scope 차단 — 임의·비정상 조직 ID 전부 401/403 | ✅ |
| 14 | **read 9 · write 7 모두** 동일하게 보호 | ✅ |

`downstreamCalls` 배열로 **handler 도달 여부를 직접 관측**한다 — 상태 코드만 보지 않는다.
기존에 500 이던 경로도 401 로 바뀌는지 별도 케이스로 고정했다.

---

## 15. guard 순서 · 전수 회귀 테스트

| 고정 항목 | 방식 |
|---|---|
| 테스트 목록 = 실제 라우터 endpoint 수 | 라우터 소스에서 factory 별 endpoint 수를 세어 `{auditLogs:4, affiliations:2, orgMembers:2, license:8}` 대조 → **신규 endpoint 추가 시 실패** |
| guard 밖 신규 subtree 탐지 | `index.ts` 의 `router.use()` mount 를 전부 뽑아 guard 목록과 대조 → **미보호 mount 0건** |
| guard 등록이 mount 보다 앞 | `register-routes.ts` 인덱스 비교 |
| 4개 subtree 가 guard 목록에 포함 | `MEMBERSHIP_RESIDUAL_SUBTREES ⊂ MEMBERSHIP_ADMIN_SUBTREES` |

> 기존 spec 의 `unguarded` 단언은 **`[]`(전수 보호)** 로 갱신됐다.
> 이제 새 mount 가 guard 없이 추가되면 이 단언이 실패한다.

---

## 16. 기존 테스트 결과

| spec | 결과 |
|---|---|
| `membership-residual-subtree-guard.spec.ts` (신규) | **PASS** |
| `membership-admin-guard.spec.ts` | **PASS** (2건 갱신) |
| `service-admin-guard.spec.ts` | **PASS** |
| `kpa-role-guard.spec.ts` | **PASS** |
| **합계** | **208 pass / 0 fail** |

---

## 17. typecheck

| 항목 | 명령 | 결과 |
|---|---|---|
| api-server 범위 | `npx tsc --noEmit -p tsconfig.build.json` | **0 error** |
| 전체 monorepo build | — | 미실행 (범위 제외) |

---

## 18. 배포 및 프로덕션 read-only smoke

| 항목 | 값 |
|---|---|
| commit | **`dd792c64e`** |
| workflow | `Deploy API Server` → **success** |
| 다른 서비스 배포 | **없음** |

**비로그인 GET, 상태 코드만 확인. 본문 미출력.**

| endpoint | 수정 전 | **수정 후** |
|---|---|:--:|
| `/audit-logs` | **500** (선행 CHECK §3 기록: `relation "yaksa_member_audit_logs" does not exist`) | **401** |
| `/audit-logs/recent` | **500** (동일 근거) | **401** |
| `/audit-logs/stats` | — | **401** |
| `/audit-logs/{uuid}` | — | **401** |
| `/organizations/{uuid}/members` | — | **401** |
| `/organizations/{uuid}/members/history` | — | **401** |
| `/license-verification/requests` | — | **401** |
| `/license-verification/stats` | — | **401** |
| `/license-verification/requests/{uuid}` | — | **401** |

> 수정 전 값은 **선행 CHECK 문서에 기록된 실측**을 인용한다(내가 수정 전 프로덕션을 직접 측정하지는 않았다).
> 인증 없이 handler 에 도달해 500 이 나던 것이 **guard 단계에서 401** 로 차단된다 — 요구 #3 충족.

**회귀 (비로그인)**: `/categories` 401 · `/stats` 401 · `/verifications` 401 · `/members/me` 401 — 기존과 동일.

비로그인 POST·PUT·PATCH·DELETE 는 **프로덕션에서 재현하지 않았다.**
유효 organizationId·memberId·license 데이터로 무단 접근을 시험하지 않았다.

---

## 19~21. 운영 안전성

| 항목 | 값 |
|---|---:|
| 운영 DB write | **0** |
| 직접 SQL 실행 | **0** |
| schema · migration | **0** |
| 역할·계정 데이터 변경 | **0** |
| 응답 본문·개인정보·자격증명·토큰 출력 | **0** (상태 코드만) |
| 테스트의 DB 접근 | **0** (in-memory express + 주입 대역 + 가상 UUID) |
| 다른 세션 Cloud SQL Proxy 종료 | **0** |

---

## 22. 미검증 항목 및 후속

- **정상 관리자 계정의 프로덕션 실측** — 안전한 플랫폼 관리자 테스트 계정으로 보호 데이터를 열람해야 하므로
  지시(§프로덕션 실측 6)대로 **미검증**으로 남긴다. 허용 경로는 테스트 대역으로만 확인했다.
- **비로그인 write 의 프로덕션 실측** — 지시대로 재현하지 않았다(테스트로만 고정).
- **조직 관리자 위임 계층** — §8. 별도 설계 WO 필요.

### 조사 중 확인된 범위 밖 사항 (수정하지 않음, 기록만)

| 항목 | 내용 |
|---|---|
| `yaksa_member_audit_logs` 테이블 부재 | 선행 CHECK 기록. audit-logs 기능은 프로덕션에서 원래 동작하지 않는다. 이번 guard 와 무관 |
| 프런트 dead route | `MemberDetail.tsx:216` · `MemberProfilePage.tsx:160` 이 `/membership/audit-logs/member/:id` 를 호출하나 **그런 route 는 없다**(정상 경로는 `/members/:id/logs`). 범위 제외 항목이라 손대지 않음 |
| `AffiliationManagement.tsx:52` | `GET /membership/affiliations` 를 호출하나 해당 router 에 **GET 이 없다**(PUT·DELETE 뿐). 이중 `/api` 접두도 존재. 범위 제외 |
| 지부/분회 관리자 영향 | membership 관리 API 는 플랫폼 관리자 전용이라 `yaksa-admin` 계열은 접근할 수 없다. **선행 WO(V2) 가 확립한 정책**이며 이번 변경이 만든 것이 아니다 |

---

## 23. commit · push

```
dd792c64e  fix(membership): guard residual subtrees behind admin auth   → Deploy API Server success
           (guard 1 + spec 2, 3 files changed, 377 insertions, 10 deletions)
```

---

## 24. 최종 git status

```
내 산출물 — 전부 commit·push 완료
남은 변경: apps/api-server/src/scripts/data/otc-zh-batch01-verify.ga.json  (다른 세션 소유)
HEAD...origin/main = 0 0
```

---

## 25. pnpm-lock.yaml 및 다른 세션 작업물

| 항목 | 상태 |
|---|---|
| `pnpm-lock.yaml` | **미변경·미포함** |
| HFF·OTC·다국어·태블릿 작업물 | **미접촉** |
| commit 방식 | `--only -- <pathspec>` 범위 제한, `git add .` 미사용 |

---

## 26. 최종 판정 — `PASS_WITH_SCOPE_FOLLOWUP`

| 요구 | 결과 |
|---|:--:|
| 4개 subtree 전수 보호 (16 endpoint) | ✅ |
| 비로그인 401 · handler 미도달 | ✅ |
| 일반 사용자·비허용 역할 403 | ✅ |
| 정상 역할만 handler 도달 | ✅ |
| read·write 모두 보호 | ✅ |
| 공개 endpoint 오차단 없음 | ✅ (대상 내 공개 endpoint 0) |
| 회원 본인용 경로 회규 없음 | ✅ |
| guard 밖 신규 endpoint 탐지 | ✅ |
| 신규 역할·permission·schema | ✅ **0** |

### `PASS` 가 아니라 `PASS_WITH_SCOPE_FOLLOWUP` 인 이유

인증·역할은 완결됐고 **임의 organizationId 로 남의 조직을 조회할 수 있는 주체는 존재하지 않는다.**
다만 이는 **조직 소유권을 검사해서**가 아니라 **접근 주체를 플랫폼 관리자로 좁혀서** 달성한 것이다.

조직 관리자에게 자기 조직만 위임하는 계층은 **없던 권한을 새로 부여**하는 정책 확대라
보호 강화 범위 밖으로 판단해 넣지 않았다. 이 위임이 필요하면 별도 WO 에서 설계해야 하므로
`PASS` 대신 `PASS_WITH_SCOPE_FOLLOWUP` 으로 닫는다.
