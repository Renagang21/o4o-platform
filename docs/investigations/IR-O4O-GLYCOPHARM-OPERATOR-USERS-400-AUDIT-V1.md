# IR-O4O-GLYCOPHARM-OPERATOR-USERS-400-AUDIT-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·DB·UI·migration 변경 없음.**
>
> GlycoPharm 운영자 회원 관리 화면 `https://glycopharm.co.kr/operator/users` 접근 시 `Request failed with status code 400` 발생 원인 조사.

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only)
- **선행 산출물:** 본 IR 은 [CHECK-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1 §9.3](CHECK-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1.md) 에서 별건으로 분리된 후속.
- **참조 SSOT:**
  - `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` (F6)
  - `docs/investigations/CHECK-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1.md` (선행 fix CHECK)
- **검증 환경:** `api.neture.co.kr` (production, Cloud Run `o4o-core-api`, project `netureyoutube`)
- **검증 채널:** Frontend/backend 코드 정적 분석 + Cloud Run 로그 (read-only)
- **수정 행위:** **없음** (조사 전용)

---

## 0. 최종 판정

### Verdict: **E. Legacy Drift** (정확히는 "Frontend drift after backend Boundary Policy fix")

**400 의 정확한 원인 (1 문장):**
[`MembershipConsoleController.getMembers`](apps/api-server/src/controllers/operator/MembershipConsoleController.ts#L47-L65) 가 호출자를 **platform admin** 으로 인식하면 `serviceKey` query 또는 `all=true` 둘 중 하나를 요구하는데, **GlycoPharm / KPA / K-Cosmetics 의 `UsersPage` 가 둘 다 보내지 않아** `resolveOperatorScope` 가 null 반환 → `HTTP 400 PLATFORM_ADMIN_SCOPE_REQUIRED`.

**Drift 의 본질:**
- Neture `UsersManagementPage.tsx` 는 `WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1` 이후 `params.set('serviceKey', 'neture')` 를 명시 (정렬됨).
- **GlycoPharm / KPA / K-Cosmetics 의 `UsersPage.tsx` 3 개 모두 serviceKey 미명시** — Boundary Policy fix 가 4 service frontend 에 균일하게 propagate 되지 않음.

**Identity V2 와의 관련성: 없음.** 본 이슈는 F6 Boundary Policy (platform admin scope 의 명시 opt-in 정책) 영역. Identity V2 / Handoff / Service Join / Phase 1/2 모두 본 400 의 원인과 무관.

| Option | 판정 |
|---|---|
| A. Frontend query parameter bug | △ 부분 — 3 service 의 frontend 가 serviceKey 미전달 |
| B. Backend validation/schema mismatch | ❌ — backend 는 의도된 동작 (Boundary Policy fix) |
| C. Route/path mismatch | ❌ — endpoint 자체는 정확 |
| D. Role/serviceKey guard mismatch | ❌ — guard 는 정상 동작 |
| **E. Legacy drift** | ✅ **확정** — Boundary fix 가 Neture 만 적용되고 3 service 미정렬 |
| F. 최근 Auth 작업 회귀 | ❌ — Identity V2 / Handoff 무관 |
| G. 기타 | — |

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 (0 commits 차이) |
| 조사 범위 | services/web-{glycopharm, k-cosmetics, kpa-society, neture}/src/pages/operator/Users*.tsx + apps/api-server (controller, route, serviceScope util) + Cloud Run logs |

---

## 2. 산출물 1 — 400 발생 API endpoint

```
GET /api/v1/operator/members?page=1&limit=20
```

본 endpoint 는 `WO-O4O-MEMBERSHIP-CONSOLE-V1` 의 Extension Layer 라우트로, 4 service 의 회원 관리 frontend 가 공통 호출.

부가로 같은 패턴 400 발생 가능 endpoint:
- `GET /api/v1/operator/members/stats`
- `GET /api/v1/operator/members?limit=1000` (stats 계산용 전체 조회)

---

## 3. 산출물 2 — Frontend 호출 위치

### 3.1 호출 코드 (4 service 비교)

| Service | Frontend 파일 | 라인 | serviceKey 전달? |
|---|---|:---:|:---:|
| **Neture** | `services/web-neture/src/pages/operator/UsersManagementPage.tsx` | 257 | ✅ **명시** (`params.set('serviceKey', 'neture')`) |
| GlycoPharm | `services/web-glycopharm/src/pages/operator/UsersPage.tsx` | 408 | ❌ 미전달 |
| KPA Society | `services/web-kpa-society/src/pages/operator/UsersPage.tsx` | 319 | ❌ 미전달 |
| K-Cosmetics | `services/web-k-cosmetics/src/pages/operator/UsersPage.tsx` | 295 | ❌ 미전달 |

### 3.2 Neture 의 정렬 코드 (참조)

[services/web-neture/src/pages/operator/UsersManagementPage.tsx:255-257](services/web-neture/src/pages/operator/UsersManagementPage.tsx#L255-L257):

```tsx
// serviceKey 를 명시적으로 전달한다 (backend platform admin 분기에서
// serviceKey 가 없으면 cross-service leak 발생).
params.set('serviceKey', 'neture');
```

→ **Neture frontend 는 명시적 의도로 serviceKey 를 보낸다.** 주석에 이유 명시.

### 3.3 GlycoPharm / KPA / K-Cosmetics 의 미정렬 코드 (참조)

GlycoPharm [UsersPage.tsx:400-410](services/web-glycopharm/src/pages/operator/UsersPage.tsx#L400-L410):
```tsx
const params = new URLSearchParams();
params.set('page', String(page));
params.set('limit', '20');
if (activeTab === 'pending') {
  params.set('status', 'pending');
}
if (searchQuery) params.set('search', searchQuery);
const data = await apiFetch<any>(`/api/v1/operator/members?${params}`);
```

KPA Society [UsersPage.tsx:309-319](services/web-kpa-society/src/pages/operator/UsersPage.tsx#L309-L319) 및 K-Cosmetics [UsersPage.tsx:287-295](services/web-k-cosmetics/src/pages/operator/UsersPage.tsx#L287-L295) — **동일 패턴, serviceKey 미명시**.

---

## 4. 산출물 3 — Backend route / controller 위치

### 4.1 Route 등재

[apps/api-server/src/bootstrap/register-routes.ts:408](apps/api-server/src/bootstrap/register-routes.ts#L408):
```ts
app.use('/api/v1/operator/members', operatorMembershipRoutes);
```

### 4.2 Route 파일

[apps/api-server/src/routes/operator/membership.routes.ts](apps/api-server/src/routes/operator/membership.routes.ts):
```ts
router.use(authenticate);
router.use(requireRole([...platform/service admin·operator roles...]));
router.use(injectServiceScope);

router.get('/', controller.getMembers);
router.get('/stats', controller.getStats);
// ... 외 다수
```

### 4.3 Controller

[apps/api-server/src/controllers/operator/MembershipConsoleController.ts:47-65](apps/api-server/src/controllers/operator/MembershipConsoleController.ts#L47-L65):
```ts
getMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const scope: ServiceScope = (req as any).serviceScope;
    const { ... } = req.query;

    // WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1: Option B 스코프 결정
    const resolved = resolveOperatorScope(scope, req.query);
    if (!resolved) {
      res.status(400).json(PLATFORM_ADMIN_SCOPE_REQUIRED_RESPONSE);
      return;
    }
    if (resolved.crossService) logCrossServiceQuery(req);
    ...
```

→ **`resolveOperatorScope` 가 null 반환 → 400 즉시 반환.**

### 4.4 Scope 결정 로직

[apps/api-server/src/utils/serviceScope.ts:138-160](apps/api-server/src/utils/serviceScope.ts#L138-L160):
```ts
export function resolveOperatorScope(
  scope: ServiceScope,
  query: { serviceKey?: unknown; all?: unknown }
): ResolvedOperatorScope | null {
  if (!scope.isPlatformAdmin) {
    return { mode: 'service-scoped', serviceKeys: scope.serviceKeys, crossService: false };
  }
  const sk = typeof query.serviceKey === 'string' ? query.serviceKey.trim() : '';
  if (sk && sk !== 'all') {
    return { mode: 'platform-scoped', serviceKeys: [sk], crossService: false };
  }
  if (query.all === 'true' || query.all === true) {
    return { mode: 'platform-cross-service', serviceKeys: null, crossService: true };
  }
  return null;  // ← platform admin 가 serviceKey/all 둘 다 안 보내면 여기
}

export const PLATFORM_ADMIN_SCOPE_REQUIRED_RESPONSE = {
  success: false,
  error: 'serviceKey or all=true required for platform admin',
  code: 'PLATFORM_ADMIN_SCOPE_REQUIRED',
} as const;
```

### 4.5 정책 도입 배경 (코드 주석 인용)

[serviceScope.ts:108-122](apps/api-server/src/utils/serviceScope.ts#L108-L122):
> **WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1**
> Option B — Operator endpoint 의 service scope 결정 헬퍼.
> 정책 (F6 Boundary Policy Rule 3 정합):
> - Service operator: 자동 scope (scope.serviceKeys)
> - Platform admin + serviceKey: 단일 service scope
> - Platform admin + all=true: cross-service (명시 opt-in, 감사 로그)
> - Platform admin + 둘 다 없음: null 반환 → caller 가 400 응답
> 도입 배경: F6 Rule 3 "예외 없이" 와 정합화. **silent platform admin exemption 제거.**

→ **400 자체는 의도된 동작.** F6 Boundary Policy Rule 3 의 "예외 없이" 정합화. silent platform admin bypass 가 cross-service data leak 위험이라 명시 opt-in 으로 전환된 것.

---

## 5. 산출물 4 — 실제 400 원인 (Cloud Run 로그 교차검증)

### 5.1 발생 시점/URL/status (최근 7 일)

| 시각 | Status | URL | 발생 위치 추정 |
|---|:---:|---|---|
| 2026-05-24T00:48:42 | 400 | `/operator/members?page=1&limit=20` | GlycoPharm / KPA / K-Cosmetics (Rena 보고와 정합) |
| 2026-05-24T00:48:42 | 400 | `/operator/members/stats` | 동일 (stats 호출도 같이 400) |
| 2026-05-23T07:19:37 | 400 | `/operator/members/stats` | 동일 |
| 2026-05-23T07:19:37 | 400 | `/operator/members?limit=3` | 동일 (stats 의 보조 호출) |
| 2026-05-23T06:28:17 | 400 | `/operator/members` | 동일 |

### 5.2 200 OK 호출 (Neture frontend)

| URL | 횟수 (7 일) |
|---|:---:|
| `/operator/members?page=1&limit=20&serviceKey=neture` | 6 |
| `/operator/members?limit=1000&serviceKey=neture` | 다수 |
| `/operator/members/stats?serviceKey=neture` | 다수 |

→ **Neture 는 모두 serviceKey 명시 → 200 OK.**

### 5.3 400 패턴 분포 (7 일)

| Query pattern | 호출 횟수 | Status |
|---|:---:|:---:|
| `?page=1&limit=20` (no serviceKey) | 18 | **400** |
| `?page=1&limit=20&serviceKey=neture` | 6 | 200 |
| `?page=1&limit=20&status=pending` (no serviceKey) | 7 | **400** |

→ **호출 패턴이 정확히 일치**: serviceKey 미명시 = 400. Rena 가 본 보고와 정합.

### 5.4 400 발생 조건 (확정)

다음 3 조건이 모두 성립할 때 400 발생:

1. 호출자가 `platform:admin` 또는 `platform:super_admin` 보유 (= `isPlatformAdmin === true`)
2. `serviceKey` query 미전달 (또는 빈 문자열)
3. `all=true` query 미전달

→ Rena (`sohae2100` = `platform:super_admin`) 가 GlycoPharm 화면에 접속하면 정확히 이 조건. 화면이 frontend 의 `params.set('page', ...)` 만 보내고 serviceKey 미명시 → 400.

**비-platform-admin 가 호출하면 400 미발생** (예: 평범한 `glycopharm:operator` 만 가진 사용자). 따라서 `glycopharm:operator` 만 가진 사용자는 정상 동작, **`platform:super_admin` 가 추가로 있는 사용자만 400** 경험.

---

## 6. 산출물 5 — KPA와의 차이

| 차원 | KPA / GP / K-Cosmetics | Neture |
|---|---|---|
| 회원 관리 frontend 파일 | `UsersPage.tsx` | `UsersManagementPage.tsx` |
| 호출 endpoint | `/api/v1/operator/members` | `/api/v1/operator/members` (동일) |
| serviceKey 전달 | ❌ 미전달 | ✅ `params.set('serviceKey', '<svc>')` |
| Boundary Policy fix 대응 | ❌ 미정렬 | ✅ 정렬 (코드 주석에 명시) |
| platform admin 호출 결과 | **400** | 200 |
| 일반 service operator 호출 결과 | 200 (service-scoped) | 200 |

**핵심 차이:** 동일 backend 를 호출하지만, **Neture frontend 만 Boundary Policy fix 의 frontend 측 정렬을 반영**했음.

KPA-Society 의 `/operator/members` API 는 service-scoped operator 가 호출하면 정상 작동하므로 (자동 service-scoped), Rena 가 일상적으로 KPA admin 화면을 쓸 때는 platform:super_admin 가 우선 매칭되지 않는 한 정상. 그러나 본 IR 의 핵심 사실은 **3 service 모두 platform admin 가 접근하면 400** — KPA / K-Cosmetics 도 동일 issue 잠재.

→ Rena 가 "KPA 운영자 회원 관리는 정상" 이라고 본 적이 있다면, 그건 KPA 자체 endpoint (`/api/v1/kpa-society/members` 등 = `routes/kpa/kpa.routes.ts:187` 의 `/members`) 에서 다른 화면을 본 것일 수 있음. 두 endpoint 는 다른 system:
- `/api/v1/operator/members` = 공통 Extension Layer (본 400 의 무대)
- `/api/v1/kpa-society/members` (또는 비슷) = KPA service-scoped 자체 endpoint

본 IR 의 범위는 전자 (`/operator/members`).

---

## 7. 산출물 6 — 최근 Identity V2 작업과의 관련성

| 최근 작업 | 관련 여부 | 근거 |
|---|:---:|---|
| `WO-O4O-IDENTITY-V2-PHASE1-REGISTER-LOGIN-V1` (Service Credential L2) | ❌ 무관 | login/register 만 변경, /operator/members 영역 무관 |
| `WO-O4O-IDENTITY-V2-PHASE2-CHANGE-PASSWORD-V1` | ❌ 무관 | user.controller change-password 만 변경 |
| `WO-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1` | ❌ 무관 | Service Join API 만 변경 |
| `WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1` | ❌ 무관 | Handoff controller 만 변경 |
| `WO-O4O-PASSWORD-RESET-EMAIL-LINK-PRODUCTION-URL-FIX-V1` | ❌ 무관 | mail-core / passwordResetService 만 변경 |
| `WO-O4O-AUTH-VERIFY-EMAIL-FRONTEND-PAGE-V1` | ❌ 무관 | verify-email 만 추가 |
| `WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1` | ✅ **본 400 의 backend 변경 출처** | resolveOperatorScope / 400 반환 코드 추가 |

→ **본 400 은 Identity V2 / Handoff / Service Join 등 최근 Auth 작업과 완전히 무관.** F6 Boundary Policy Rule 3 정합화 (silent platform admin exemption 제거) WO 의 결과이며, 그 frontend 정렬이 Neture 에만 적용되고 3 service 에 propagate 안 된 drift 가 직접적 원인.

---

## 8. 산출물 7 — 수정 필요 범위

### 8.1 즉시 수정 권고 (별도 WO 분리)

**대상 파일 3 개:**
- `services/web-glycopharm/src/pages/operator/UsersPage.tsx`
- `services/web-kpa-society/src/pages/operator/UsersPage.tsx`
- `services/web-k-cosmetics/src/pages/operator/UsersPage.tsx`

**변경 패턴 (각 파일):**
1. `fetchUsers()` 의 `URLSearchParams` 에 `params.set('serviceKey', '<service>')` 추가
2. `fetchStats()` 의 `/operator/members/stats` 호출에 `?serviceKey=<service>` 추가
3. `/operator/members?limit=1000` (role count 용) 에도 추가
4. (옵션) `EditUserModal.tsx` / `UserDetailPage.tsx` 등 같은 endpoint 를 호출하는 보조 화면도 확인

**service 별 serviceKey 값:**
- web-glycopharm → `serviceKey=glycopharm`
- web-kpa-society → `serviceKey=kpa-society`
- web-k-cosmetics → `serviceKey=k-cosmetics`

### 8.2 부차 검토 (별도 IR 가치)

- `/operator/members` 외에 같은 패턴 (`resolveOperatorScope` 사용) 의 endpoint 가 더 있을 수 있음 — `controllers/operator/MembershipConsoleController.ts:1163` 에서 `getStats` 또는 다른 메서드 동일 분기. 모든 frontend 가 같이 정렬돼야 일관.
- `/operator/products` / `/operator/stores` / `/operator/roles` / `/operator/analytics` 등 동일 라우터 그룹 endpoint 도 같은 fix 패턴인지 확인 필요 (별건).

---

## 9. 산출물 8 — 후속 WO 제안

### 9.1 즉시 WO 후보

**`WO-O4O-OPERATOR-MEMBERS-FRONTEND-SERVICEKEY-ALIGNMENT-V1`**

| 항목 | 내용 |
|---|---|
| 범위 | 3 service (web-glycopharm, web-kpa-society, web-k-cosmetics) 의 `pages/operator/UsersPage.tsx` 의 `/operator/members*` 호출에 serviceKey 명시 추가 |
| 코드 변경 | 각 파일 3 곳 (fetchUsers, fetchStats, role count 용 limit=1000 호출) |
| 패턴 | Neture `UsersManagementPage.tsx:255-257` 그대로 적용 |
| DB 변경 | 0 |
| Migration | 0 |
| Backend 변경 | 0 |
| 회귀 위험 | 매우 낮음 — serviceKey 명시는 service operator 호출에도 무영향 (resolveOperatorScope 의 첫 분기에서 자체 scope 반환) |
| 검증 | 각 service 의 platform admin 계정 (Rena) 으로 `/operator/users` 접속 → 200 확인 |
| 정합 기준 | F6 Boundary Policy + Neture 정렬 패턴 |

### 9.2 후속 IR 후보 (즉시 WO 아님)

**`IR-O4O-OPERATOR-CONSOLE-FRONTEND-BOUNDARY-POLICY-ALIGNMENT-AUDIT-V1`** — 다른 operator endpoint (`/operator/products`, `/operator/stores`, `/operator/roles`, `/operator/analytics` 등) 의 4 service frontend 가 동일 drift 인지 일괄 audit. 본 IR 은 `/operator/members` 1 endpoint 만 확정.

### 9.3 본 IR 의 의도된 비-결정

- 즉시 WO 의 실제 실행 — 본 IR 은 조사만, 코드 변경은 후속 WO 책임
- 다른 operator endpoint 의 drift audit — 본 IR 범위 외
- Boundary Policy fix 자체의 재설계 (예: backend 가 origin header 로 serviceKey 자동 추론) — 별건 정책 논의

---

## 10. 현재 구조 vs O4O 철학 충돌 체크

| 원칙 | Current (3 service drift) | F6 Rule 3 정합 후 | 충돌 |
|---|:---:|:---:|:---:|
| **GlycoPharm 도 KPA 와 같은 독립 서비스 운영자 구조** | ⚪ 코드 베이스는 거의 동일 (UsersPage 파일명/구조 일치) | ✅ 정합 | 일시적 frontend drift 만 |
| **운영자 회원 관리는 서비스별 독립 membership 기준** | ✅ backend 가 `extractServiceScope` 로 service-scoped 처리 | ✅ 정합 | 없음 |
| **KPA canonical 과 GlycoPharm 구조가 불필요하게 drift 되었는가** | ✅ Neture 만 정렬, 3 service 모두 미정렬 (drift) | ✅ 정합 (WO 후) | **현재 있음** |
| **현재 오류가 O4O 공통화/서비스 독립 원칙과 충돌하는가** | ❌ 충돌 아님 — drift 는 backend 정책 강화의 frontend 미정렬일 뿐 | — | 없음 (구조적 충돌 없음) |

→ **본 400 은 구조적 충돌이 아닌 frontend 정렬 누락.** F6 정책 (silent platform admin exemption 제거) 은 옳고, frontend 가 따라가야 할 일관성을 4 service 중 3 service 에 적용 안 한 것이 직접 원인.

---

## 11. 본 IR 이 결정하지 않는 것

- WO 의 실제 실행 (코드 변경) — 본 IR 은 조사 전용
- 다른 operator endpoint (`/products`, `/stores`, `/roles`, `/analytics`) 의 동일 drift audit
- Boundary Policy fix 의 재설계 (예: origin header 자동 추론) — 별건 정책 논의
- 4 service frontend 의 통합 / 공통 컴포넌트화 — 별건 (Operator Core Design)

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. Backend route 등재
grep -n "operator/members" apps/api-server/src/bootstrap/register-routes.ts

# 2. Controller 의 400 분기
grep -n "PLATFORM_ADMIN_SCOPE_REQUIRED\|resolveOperatorScope" \
  apps/api-server/src/controllers/operator/MembershipConsoleController.ts

# 3. Frontend 호출 패턴 비교
grep -n "params.set\|new URLSearchParams" \
  services/web-{glycopharm,kpa-society,k-cosmetics,neture}/src/pages/operator/Users*.tsx

# 4. Cloud Run 로그 — 400 발생 호출
gcloud logging read 'resource.type=cloud_run_revision
  AND resource.labels.service_name="o4o-core-api"
  AND httpRequest.status=400
  AND httpRequest.requestUrl:"operator/members"' \
  --limit=20 --project=netureyoutube --freshness=7d \
  --format="value(timestamp,httpRequest.requestUrl)"

# 5. 정상 호출 패턴 (Neture)
gcloud logging read 'resource.type=cloud_run_revision
  AND resource.labels.service_name="o4o-core-api"
  AND httpRequest.requestUrl:"operator/members?page"' \
  --limit=50 --project=netureyoutube --freshness=7d \
  --format="value(httpRequest.requestUrl)" | sort | uniq -c
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only)*
*Status: 조사 완료 — Verdict E (Legacy Drift). 즉시 WO 후보 1 건 제시.*
*Decision Required: `WO-O4O-OPERATOR-MEMBERS-FRONTEND-SERVICEKEY-ALIGNMENT-V1` 진입 여부.*
