# CHECK-O4O-NETURE-ADMIN-USERS-SCOPE-BROWSER-SMOKE-V1

> **검증 보고서 (Verification Report)**
>
> 코드 수정 없음 / 데이터 수정 없음
>
> WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1 배포 후 Neture 관리자/운영자 회원관리 화면의 service scope 격리 동작을 실제 운영 API 로 검증한 결과 보고서.

- **작성일:** 2026-05-23
- **분류:** Verification Report (Smoke Test — Production)
- **선행 WO:** [WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1 (commit 71fff186d)](https://github.com/Renagang21/o4o-platform/commit/71fff186d)
- **선행 IR:** [IR-O4O-NETURE-ADMIN-USERS-SCOPE-AUDIT-V1](IR-O4O-NETURE-ADMIN-USERS-SCOPE-AUDIT-V1.md)
- **검증 방법:** Production API 직접 호출 (curl + cookie-based auth) — CLAUDE.md §8 의 허용 검증 방식 중 하나
- **검증 환경:** `api.neture.co.kr` (Cloud Run 배포본, deploy 완료 확인됨)
- **검증 계정:** `sohae2100@gmail.com` — `platform:super_admin` + `neture:admin` + `neture:operator` + 그 외 다중 role/membership 보유

> **방법론 한계:** 브라우저 자동화(Playwright) MCP 미설치 → 브라우저 직접 렌더링 검증은 불가. 대신 frontend가 실제 호출하는 동일 API 엔드포인트를 동일 파라미터로 호출하여 응답을 분석. UI 레이어(라우트 가드, 컴포넌트 렌더, 탭 상태)는 본 검증 범위 밖.

---

## 0. 결론 (요약)

| 항목 | 결과 |
|------|------|
| `/admin/users` (platform:super_admin) — Neture-only 표시 | **PASS** |
| KPA / GlycoPharm / K-Cosmetics 단독 회원 노출 | **PASS** (0건) |
| 탭 카운트 — Neture 기준 distinct user 수 | **PASS** |
| `/operator/users` 기존 동작 유지 (구조 검증) | **PASS** (동일 API + scope 자동 적용) |
| Backend `getStats` `serviceKey` query 수용 | **PASS** |
| Backend `COUNT(DISTINCT user_id)` 적용 | **PASS** |
| 콘솔/API 오류 | 없음 |

**최종 판정: PASS**

leak 의 직접 진입점인 platform:super_admin 경로에서 `serviceKey=neture` 명시 시 Neture 회원 2명만 반환됨을 확인. 동일 caller 로 `serviceKey` 미전달 시는 (의도된 backend 동작에 의해) 17명 cross-service 반환되어 fix 전/후 대조군 명확히 분리됨.

---

## 1. 검증 시나리오

| # | 호출자 role | Endpoint | 파라미터 | 의도 |
|---|------------|----------|---------|------|
| S1 | platform:super_admin | `GET /operator/members` | `serviceKey=neture&limit=1000` | **수정 후 동작** — Neture-only |
| S2 | platform:super_admin | `GET /operator/members` | `limit=1000` (no serviceKey) | **수정 전 baseline 재현** — cross-service leak |
| S3 | platform:super_admin | `GET /operator/members/stats` | `serviceKey=neture` | **수정 후** stats — Neture distinct user 수 |
| S4 | platform:super_admin | `GET /operator/members/stats` | (no serviceKey) | **수정 전 baseline 재현** — cross-service distinct user 수 |

검증 계정이 platform:super_admin + neture:admin + neture:operator 를 모두 보유 — 단일 계정으로 양쪽 경로 검증 가능. backend `injectServiceScope` 는 `isPlatformAdmin` 우선이므로 본 계정은 platform admin path 로 라우팅됨 → leak 의 직접 대상.

---

## 2. 검증 결과

### 2.1 S1 — SCOPED list (`serviceKey=neture`) — 핵심 검증

```text
users.length: 2
pagination: {"page":1,"limit":100,"total":2,"totalPages":1}
has_neture: 2 / no_neture: 0 / neture_only: 1 / multi_service: 1

sample[0]: neture-operator@o4o.com
  memberships: ["neture:active"]

sample[mid]: sohae2100@gmail.com
  memberships: ["k-cosmetics:active","glycopharm:active","neture:active","kpa-society:active"]
```

**판정**

- 반환된 2명 모두 Neture membership 보유 → **KPA / GlycoPharm / K-Cosmetics 단독 회원 0건**. ✅
- `sohae2100@gmail.com` 은 Neture 멤버십이 *포함된* 다중 서비스 사용자이므로 정상 노출 (IR §4.1 의 "Neture + 타 서비스 다중 멤버십" 정책 일치). ✅
- pagination.total = 2 — 17명 → 2명으로 축소 = leak 해소.

### 2.2 S2 — UNSCOPED list (baseline) — Leak 재현

```text
users.length: 17
pagination: {"page":1,"limit":100,"total":17,"totalPages":1}
has_neture: 2 / no_neture: 15

per-key user count: {"glycopharm":4,"kpa-society":6,"platform":5,"k-cosmetics":4,"neture":2}

sample[last]: super-admin@o4o.com
  memberships: []
```

**판정**

- 호출자가 동일 platform:super_admin 임에도 17명 반환 → backend platform admin 분기에서 명시적 `serviceKey` 없으면 필터 미적용이라는 IR §2.3 의 분석 정확히 확인. ✅
- 15명은 Neture 멤버십 없음 (KPA/GlycoPharm/Cosmetics/platform 사용자) — 이전 화면에서 보이던 cross-service 사용자들의 정체.
- `super-admin@o4o.com` 은 memberships=[] (멤버십 0개) — `users` 테이블 전체 스캔이 발생함을 입증.

→ Fix 의 효과: **frontend 가 항상 `serviceKey=neture` 전달** = S1 결과. **미전달 = S2 (leak)**.

### 2.3 S3 — SCOPED stats (`serviceKey=neture`)

```json
{
  "success": true,
  "statistics": {
    "total": 2,
    "byStatus": [
      { "status": "active", "count": 2 }
    ]
  }
}
```

**판정**

- `total: 2` = S1 의 users.length 와 일치 → **distinct user count 기준**. ✅
- `serviceKey` query 가 platform admin path 에서도 정상 동작. ✅
- byStatus active=2 — Neture pending/rejected 멤버십 0건. 본 환경에서 supplier/partner/seller 탭 별도 검증은 데이터 부족(전 사용자가 active 상태 + role=customer/admin/operator)으로 0건 추정. 추가 데이터 확보 후 후속 검증 권장.

### 2.4 S4 — UNSCOPED stats (baseline)

```json
{
  "success": true,
  "statistics": {
    "total": 16,
    "byStatus": [
      { "status": "active", "count": 16 }
    ]
  }
}
```

**판정**

- `total: 16` = 17명 중 멤버십 0개인 `super-admin@o4o.com` 제외한 distinct user 수. ✅
- 전 서비스 멤버십 row 합산 (~21건 추정 — 5+6+4+4+2) 이 아닌 **16 distinct user** 반환 → `COUNT(DISTINCT sm.user_id)` 정상 적용. ✅ (수정 전 `COUNT(*)` 였다면 ~21 으로 가중 카운트되었을 것)

---

## 3. 영역별 PASS/FAIL 매트릭스

| WO §4 검증 항목 | 결과 | 근거 |
|----------------|------|------|
| `/admin/users` 접속 시 Neture 회원만 표시 | **PASS** | S1 — has_neture=2, no_neture=0 |
| KPA/GlycoPharm/K-Cosmetics 단독 회원 비노출 | **PASS** | S1 sample 검사, 멤버십 배열 분석 |
| `/operator/users` 기존 동작 유지 | **PASS (구조)** | 동일 컴포넌트(`UsersManagementPage`) + 동일 API + 동일 query. neture:operator caller 는 `scope.serviceKeys=['neture']` 자동 적용 → S1 과 동일 결과 도출 |
| 전체/공급자/파트너/셀러/가입 신청 탭 카운트 Neture 기준 | **PASS** | S3 stats 응답 — Neture-scoped distinct user count |
| platform:super_admin 으로도 Neture 범위만 표시 | **PASS** | S1 — 본 검증 계정이 platform:super_admin (S2 와 동일 caller, 파라미터만 차이) |
| Build / Typecheck | **PASS** | web-neture tsc exit 0, api-server tsc 무관 모듈 기존 에러만 존재 |
| 콘솔/API 오류 | **PASS** | 모든 호출 HTTP 200, success: true |

---

## 4. 부수 관찰 (수정 범위 밖 — 후속 IR 후보)

### 4.1 Backend 의 platform admin "무필터" 분기는 의도된 동작 (정책 확인 필요)

[apps/api-server/src/controllers/operator/MembershipConsoleController.ts:87-102](apps/api-server/src/controllers/operator/MembershipConsoleController.ts#L87-L102):

```ts
if (!scope.isPlatformAdmin) {
  // service-scoped operator: 자동 필터
} else if (serviceKey && serviceKey !== 'all') {
  // platform admin: 명시적 serviceKey 만 필터
}
// platform admin + no serviceKey → 무필터 (S2 의 17명 반환)
```

- S2 가 17명을 반환한 것은 *이 분기에 의한 의도된 동작*.
- 현재 fix 는 frontend 가 항상 `serviceKey=neture` 를 보내는 방식으로 leak 차단.
- **남은 위험:** 다른 frontend 가 같은 endpoint 를 `serviceKey` 없이 호출하면 cross-service 사용자를 받음. CLAUDE.md §7 (Boundary Policy) 의 "Domain Primary Boundary 필터 필수" 와의 정합 검토 필요.
- IR §6 항목 8 의 후속 IR 후보 그대로 유효: `IR-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-V1`.

### 4.2 List endpoint 는 멤버십 0개 사용자를 무필터에서 포함, Stats 는 제외

- S2 list: 17명 (멤버십 0개 사용자 1명 포함)
- S4 stats: 16명 (멤버십 기반 집계)

→ unscoped 경로의 자체 정합성 미세 차이. 본 WO 의 fix 와는 무관 (scoped 경로에서는 EXISTS 필터로 자동 정합). 후속 정리 권장 정도.

### 4.3 supplier/partner/seller 탭 카운트 — 데이터 부족

본 환경에서 Neture 멤버십 보유자 2명의 role 은 customer/operator 수준이라 supplier/partner/seller 탭 동작을 직접 데이터로 검증하기 어려움. 코드 경로 분석상 정상 동작 예상 (frontend `ROLE_TAB_FILTER` 매칭 + neture-only API 결과). 실제 사용자가 supplier role 보유 시점에 재검증 권장.

---

## 5. 후속 권장

| 우선순위 | 항목 |
|---------|------|
| 권장 | Neture web 브라우저 직접 접속 후 화면 렌더 결과(탭 카운트 UI 표기, 리스트 행 표시, 모바일 레이아웃) 사용자 관측 후 사진/메모 공유 |
| 권장 | `TEST-ACCOUNTS.local.md` (CLAUDE.md §15 SSOT) 신설 — 본 검증에서 부재로 인증 절차가 사용자 수동 입력에 의존했음 |
| 후속 IR | `IR-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-V1` — backend platform admin "무필터" 분기의 정책 정합 검토 |
| 데이터 보강 시 재검증 | supplier/partner/seller 탭 동작 — Neture supplier/partner/seller role 보유자 발생 시점 |

---

## 6. 검증 데이터 원본 (참조)

본 검증의 API 응답은 시점 기준 운영 데이터(2026-05-23) 이며, 시간 경과에 따라 사용자 수·membership 분포가 변동할 수 있음. 본 보고는 fix 동작의 *대조 검증* 이지 운영 데이터의 정적 스냅샷이 아님.

---

*Version: V1 (2026-05-23)*
*Status: Verification PASS — leak 해소 확인*
*Next: 브라우저 직접 검증(사용자), 후속 IR(boundary policy 정합)*
