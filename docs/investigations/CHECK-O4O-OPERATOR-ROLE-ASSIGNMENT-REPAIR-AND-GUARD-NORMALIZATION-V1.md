# CHECK-O4O-OPERATOR-ROLE-ASSIGNMENT-REPAIR-AND-GUARD-NORMALIZATION-V1

> **검증 보고서 (Verification Report)**
>
> 코드 수정 없음 / 데이터 수정 없음
>
> WO-O4O-OPERATOR-ROLE-ASSIGNMENT-REPAIR-AND-GUARD-NORMALIZATION-V1 의 5 Phase 완료 후 5 operator endpoint 의 동작을 검증한 결과 보고서.

- **작성일:** 2026-05-23
- **분류:** Verification Report (Smoke Test — Production)
- **선행 WO:** [WO-O4O-OPERATOR-ROLE-ASSIGNMENT-REPAIR-AND-GUARD-NORMALIZATION-V1 (commit bcaa4a5dd)](https://github.com/Renagang21/o4o-platform/commit/bcaa4a5dd)
- **선행 IR:**
  - [IR-O4O-MEMBERSHIP-ONLY-OPERATOR-ROLE-GUARD-V1](IR-O4O-MEMBERSHIP-ONLY-OPERATOR-ROLE-GUARD-V1.md) (Option A 권장)
  - [IR-O4O-OPERATOR-ROLE-ASSIGNMENT-DATA-AUDIT-V1](IR-O4O-OPERATOR-ROLE-ASSIGNMENT-DATA-AUDIT-V1.md) (보정 대상 4 계정 확정)
- **검증 환경:** `api.neture.co.kr` (Cloud Run 배포본)
- **버전:** V1

---

## 0. 결론

| 항목 | 결과 |
|------|------|
| Phase 1 (assignRole 구현 확인) | **PASS** |
| Phase 2 (RA reactivation 4 계정) | **4/4 PASS** |
| Phase 3 (재로그인 JWT.roles 검증) | **4/4 PASS** |
| Phase 4 (stores.routes 정상화) | **PASS** (build/typecheck 통과 + deploy success) |
| Phase 5 (5 endpoint × 3 시나리오 smoke) | **15/15 PASS** |

**최종 판정: PASS (Complete)** — F9 + F11 정합 회복. 5 operator endpoint 의 guard 체인 일관화 완료. silent drift (Inactive RA + membership bypass) 정리 완료.

---

## 1. Phase 별 상세 결과

### 1.1 Phase 1 — assignRole 구현 확인

[role-assignment.service.ts:123-161](apps/api-server/src/modules/auth/services/role-assignment.service.ts#L123-L161):

```ts
let assignment = await this.repository.findOne({ where: { userId, role } });
if (assignment) {
  // Reactivate existing assignment
  assignment.isActive = true;
  ...
}
```

→ assignRole 은 (userId, role) 의 **기존 row 를 찾아 reactivate** (없으면 INSERT). 우리 4 계정은 inactive row 1 개씩 존재 → reactivation 경로로 안전 통과. `unique_active_role_per_user` constraint 충돌 가능성 없음.

### 1.2 Phase 2 — RA Reactivation (4/4 PASS)

호출자: `sohae2100@gmail.com` (platform:super_admin)
경로: `POST /api/v1/operator/members/<userId>/roles` (F9 SSOT Write path 정합)

| Account | userId | Role | HTTP | isActive |
|---------|--------|------|:----:|:--------:|
| neture-operator@o4o.com | b0000000-...-000005 | `neture:operator` | 200 | true ✅ |
| kcos-operator@o4o.com | b0000000-...-000007 | `cosmetics:operator` | 200 | true ✅ |
| kcos-admin@o4o.com | b0000000-...-000006 | `cosmetics:admin` | 200 | true ✅ |
| glyco-operator@o4o.com | b0000000-...-000008 | `glycopharm:operator` | 200 | true ✅ |

각 응답에서 `assignment.id` 값 확인 → 기존 inactive row 와 동일 ID 가 reactivation 으로 갱신됨 (INSERT 가 아닌 UPDATE 경로 사용).

### 1.3 Phase 3 — JWT.roles 재로그인 검증 (4/4 PASS)

```text
neture-operator@o4o.com  → roles=["neture:operator"]      | YES
kcos-operator@o4o.com    → roles=["cosmetics:operator"]   | YES
kcos-admin@o4o.com       → roles=["cosmetics:admin"]      | YES
glyco-operator@o4o.com   → roles=["glycopharm:operator"]  | YES
```

→ JWT 발급 경로 (`roleAssignmentService.getRoleNames()` → token payload) 가 RA active 상태 변화를 즉시 반영. F9 SSOT 의 Read path 정합.

### 1.4 Phase 4 — stores.routes 정상화 (PASS)

[stores.routes.ts](apps/api-server/src/routes/operator/stores.routes.ts):

| 변경 항목 | 변경 전 | 변경 후 |
|----------|--------|---------|
| Auth guard | 커스텀 `requireOperatorAccess` (RA OR membership fallback) | 표준 `requireRole([...])` |
| 파일 라인 수 | helper 33줄 + middleware chain | 단순 `router.use(requireRole(...))` |
| F11 §2 forbidden pattern | "membership bypass 로직 ❌" 위반 | 위반 해소 |
| 다른 4 operator route 와 일관성 | 차이 (1 endpoint 만 다른 guard) | 5 endpoint 모두 동일 guard 체인 |

Build: api-server tsc 통과 (수정 파일 무관 모듈 기존 에러만 존재).
Deploy: Cloud Run revision success (CI watch exit 0).

---

### 1.5 Phase 5 — 5 endpoint × 3 시나리오 smoke (15/15 PASS)

#### 시나리오 1 — service operator (neture-operator, RA reactivated) → 5 endpoint 직접 호출

| Endpoint | 이전 (W1 전) | 본 검증 (W1 후) |
|----------|:------------:|:--------------:|
| `/operator/members?limit=3` | 403 (RA 없어 차단) | **200** ✅ |
| `/operator/members/stats` | 403 | **200** ✅ |
| `/operator/stores?limit=3` | 200 (membership fallback) | **200** ✅ (이제 RA 경로) |
| `/operator/products?limit=3` | 403 | **200** ✅ |
| `/operator/analytics/summary?days=7` | 403 | **200** ✅ |

→ **4/5 → 5/5 회복.** stores 도 fallback 없는 표준 경로(RA)로 통과 — 의미적 일관성 확보.

#### 시나리오 2 — platform admin + `?serviceKey=neture` → Option B + RA 통합 검증

| Endpoint | HTTP |
|----------|:----:|
| `/operator/members?...&serviceKey=neture` | **200** ✅ |
| `/operator/members/stats?serviceKey=neture` | **200** ✅ |
| `/operator/stores?...&serviceKey=neture` | **200** ✅ |
| `/operator/products?...&serviceKey=neture` | **200** ✅ |
| `/operator/analytics/summary?...&serviceKey=neture` | **200** ✅ |

→ 5/5 PASS. platform admin 의 explicit scope opt-in 정상 동작.

#### 시나리오 3 — platform admin + scope query 없음 → Option B 400 보호

| Endpoint | HTTP |
|----------|:----:|
| `/operator/members?limit=3` | **400** ✅ `PLATFORM_ADMIN_SCOPE_REQUIRED` |
| `/operator/members/stats` | **400** ✅ |
| `/operator/stores?limit=3` | **400** ✅ |
| `/operator/products?limit=3` | **400** ✅ |
| `/operator/analytics/summary?days=7` | **400** ✅ |

→ 5/5 PASS. Option B 400 가드 W1 후에도 일관 유지.

---

## 2. 정합성 회복 매트릭스

| 정책 / 차원 | W1 전 | W1 후 |
|------------|------|------|
| **F9 RBAC SSOT** "권한 = role_assignments" | 4 계정에서 inactive RA = JWT.roles=[] 불일치 | RA active 회복 → JWT 일관 |
| **F11 §1.2** "Operator = SM, 권한 = RA" 책임 분리 | 분리되어 있으나 데이터 partial | 분리 + 데이터 정합 |
| **F11 §2** ❌ "membership bypass 로직" | stores.routes 가 명시적 위반 | **위반 제거** |
| **F11** seed 의도 (SM + RA 둘 다 채움) | 4 계정에서 깨짐 | 4 계정 복구 |
| **F6 Boundary Policy** guard 일관성 | 5 endpoint 중 1 endpoint 만 다른 guard | 5 endpoint 모두 표준 `requireRole` |
| **신규 endpoint 안전성** | 새 endpoint 가 우연히 requireOperatorAccess 패턴 답습 가능 | 표준 패턴만 존재 → 자동 정합 |

---

## 3. 부수 관찰

### 3.1 Inactive Row 정리는 W1 범위 밖

reactivation 후 inactive row 는 그대로 잔존 (super-admin 의 패턴과 동일하게 active + inactive 가 공존 가능).

- 본 4 계정의 경우 assignRole 이 UPDATE 경로로 작동했으므로 inactive row 가 active 로 *바뀌었음* (별도 row 추가 없음 추정 — assignment ID 동일성으로 확인됨)
- super-admin 의 active+inactive 패턴은 별도 사건의 잔재

본 WO 범위 밖. 데이터 위생 cleanup 은 후속 별도.

### 3.2 KPA seed 계정 부재 (별도 사안)

선행 IR §2.1 에서 확인된 KPA seed 계정 (kpa-admin, kpa-operator, phamacy1) 부재는 본 WO 범위 밖. seed migration 자체가 production 미적용 (timestamp 미래 — 2026-09-27). 후속 별도 대응.

### 3.3 `injectServiceScope` 의 membership fallback 은 의도적 유지

[serviceScope.ts:83-101](apps/api-server/src/utils/serviceScope.ts#L83-L101) 의 fallback 은 *scope 식별 용도* 로 유지. F11 §1.2 ("Operator = SM 존재") 와 정합. 본 fallback 은 권한 검사가 아닌 *어느 서비스 데이터를 보여줄지* 결정용이므로 forbidden pattern 에 해당하지 않음.

---

## 4. 변경 통계

```
apps/api-server/src/routes/operator/stores.routes.ts | 53 ++++------------
1 file changed, 10 insertions(+), 43 deletions(-)
```

데이터 변경 (별도 production API write):
- 4 role_assignments row 의 is_active=false → true (reactivation)

---

## 5. 잔여 작업 / 후속

### 5.1 본 WO 완결 — 추가 작업 없음

- W1 Phase 1-5 모두 PASS
- F9 + F11 정합 회복
- silent drift (membership bypass) 정리 완료

### 5.2 별도 사안 (본 WO 범위 밖)

| # | 항목 | 비고 |
|---|------|------|
| 1 | KPA seed 계정 부재 (kpa-admin, kpa-operator, phamacy1) | seed migration `20260927100000` 적용 또는 수동 생성 검토 |
| 2 | super-admin 의 중복 inactive RA row 정리 | 데이터 위생, 우선순위 낮음 |
| 3 | RA cleanup/rotation 스크립트의 partial repair 흔적 추적 | 4 계정 RA 가 inactive 된 시점/원인 추가 조사 필요 시 |

### 5.3 정책 신뢰도 차원

본 WO 완료로 다음 정책 신뢰도 회복:

- **F9 SSOT**: role_assignments 가 권한 single source — 5 endpoint 모두 일관 적용
- **F11 §2 forbidden patterns**: "membership bypass 로직" 위반 0 건
- **F11 §1.2** identity/permission 책임 분리 — 5 endpoint 모두 정합

---

## 6. 최종 PASS/FAIL 매트릭스

| WO 요구사항 | 결과 |
|------------|:----:|
| Phase 1 — constraint + assignRole 동작 사전 확인 | **PASS** |
| Phase 2 — 4 계정 RA reactivation (assignRole 경로) | **4/4 PASS** |
| Phase 3 — JWT.roles 재로그인 검증 | **4/4 PASS** |
| Phase 4 — stores.routes requireOperatorAccess 제거 | **PASS** (commit bcaa4a5dd) |
| Phase 5 — 5 endpoint × 3 시나리오 smoke | **15/15 PASS** |
| F9 정합 | **회복** |
| F11 §1.2 / §2 정합 | **회복** |
| 5 endpoint guard 체인 일관성 | **달성** |

**최종 판정: PASS** — W1 완결, 추가 작업 없음.

---

## 7. 검증 절차 (재현 가능)

```bash
BASE="https://api.neture.co.kr/api/v1"

# 두 계정 로그인
curl -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"neture-operator@o4o.com","password":"O4oBootstrap1!"}' -c op.jar
curl -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"<admin>","password":"<pwd>"}' -c admin.jar

# 시나리오 1 (service operator)
for ep in /operator/{members,members/stats,stores,products,analytics/summary}; do
  curl -b op.jar -o /dev/null -w "%{http_code}  $ep\n" "$BASE$ep?limit=3"
done

# 시나리오 2 (platform admin + serviceKey)
for ep in /operator/{members,members/stats,stores,products,analytics/summary}; do
  curl -b admin.jar -o /dev/null -w "%{http_code}  $ep\n" "$BASE$ep?serviceKey=neture&limit=3"
done

# 시나리오 3 (platform admin no scope → 400)
for ep in /operator/{members,members/stats,stores,products,analytics/summary}; do
  curl -b admin.jar -o /dev/null -w "%{http_code}  $ep\n" "$BASE$ep"
done
```

---

*Version: V1 (2026-05-23)*
*Status: Verification PASS — W1 Complete*
*Next: 본 WO 범위 작업 완결. 후속은 §5.2 의 별도 사안.*
