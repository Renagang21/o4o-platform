# CHECK-O4O-TEST-ACCOUNTS-IDENTITY-V2-SERVICE-CREDENTIAL-DOCUMENTATION-V1

> **결과: 완료** — 테스트 계정 문서를 `계정 하나 = 비밀번호 하나` → **`계정 × serviceKey credential`** 구조로 개편.
> **작성일:** 2026-08-09
> **근거:** `CHECK-O4O-AUTH-SERVICEKEY-LOGIN-INVALID-CREDENTIALS-P0-V1` §8 **결정 D**
> **대상 문서:** `docs/local/TEST-ACCOUNTS.local.md` — **gitignored(추적 제외), 본 커밋에 포함되지 않음**
> **자격증명 0** — 본 CHECK 에는 비밀번호·해시를 적지 않는다.

---

## 1. 왜 필요했나

기존 문서는 계정마다 비밀번호 1개를 기재했다. 이는 Identity V2 계약과 **구조적으로 어긋난다.**

```ts
// auth-login.service.ts:215
const targetHash = credentialHash ?? user.password;
```

웹 로그인 폼은 항상 `serviceKey` 를 보내므로 **L2(`service_credentials`)** 로 판정된다.
문서에 적힌 값은 **L1(`users.password`)** 이므로, 문서대로 웹 로그인을 시도하면 401 이 난다.
그 401 이 "비밀번호가 일치하지 않습니다" 라서 **계정 문제로 오인**된다.

실제로 이 오인이 연쇄로 발생했다.

1. 공급자 IA smoke 중 401 → **"웹 로그인이 막혔다(P0)"** 로 과잉 보고
2. 후속 조사에서 **설계된 동작**으로 정정 (HOLD)
3. 관리자 재설정 WO smoke 중 다시 401 → **"문서 비밀번호 drift"** 로 오진
4. 본 WO 에서 재확인 → **오진이었고, 진짜 원인은 role 부재**(§3-2)

문서 구조가 매번 잘못된 결론을 유도했다.

---

## 2. 조사 (프로덕션 read-only)

### 2-1. 채널

Cloud SQL Auth Proxy v2 + `gcloud auth print-access-token`, 임시 포트 5452, `SELECT` 전용.
조회 후 프록시 종료·임시 SQL 삭제. **DB write 0.**

### 2-2. credential 실태 — 전 계정이 L1 과 다르다

`service_credentials.password_hash = users.password` 비교(불리언만 조회, **해시 미출력**):

| 계정 | credential 보유 serviceKey | L1 과 동일? |
|------|---------------------------|:-----------:|
| 계정 A | kpa-society · glycopharm · k-cosmetics · neture | 전부 **false** |
| 계정 B | kpa-society · glycopharm · k-cosmetics · neture · pharmacy-hub | 전부 **false** |
| 계정 C | neture · pharmacy-hub | 전부 **false** |

→ **문서의 단일 비밀번호로는 어떤 서비스 웹 로그인도 되지 않는다.** 구조 개편이 불가피했다.

### 2-3. 로그인 실측 (계정당 **1회**, 잠금 회피)

| 계정 | `serviceKey` 없는 로그인 |
|------|:------------------------:|
| 계정 A | **200** ✅ |
| 계정 B | **200** ✅ |
| 계정 C | **401** ❌ (L1 값 불일치 → unknown 처리) |

### 2-4. `platform:super_admin` 보유 현황

| 항목 | 값 |
|------|----|
| 전체 보유 계정 수 | **2** |
| 그중 테스트 계정 문서에 있는 계정 | **0** |

---

## 3. 개편 결과

### 3-1. 새 문서 구조

| 절 | 내용 |
|:--:|------|
| §0 | **L1/L2 2계층 설명** — "비밀번호는 계정당 1개가 아니다", 401 의 의미 |
| §1 | **L1 표** (`users.password`) — 값 + 실측 결과 + 확인일 |
| §2 | **L2 매트릭스** (계정 × serviceKey) — credential 유무 / 비밀번호 상태 |
| §2-1 | unknown 해소 절차 = **각 서비스 `/forgot-password`** (관리자 재설정으로는 안 됨) |
| §3 | 역할·멤버십 실측 |
| §4 | **smoke 채널 가능 여부 표** + `platform:super_admin` 부재 경고 + L1 토큰 주입 우회 |
| §5 | 이전 문서 오류 기록 |
| §6 | 사용 규칙(추측 금지·invent 금지·1회 판정) |

### 3-2. 표기 원칙 준수

```text
✅ 확인 안 된 비밀번호 = 'unknown / needs verification' 로 표기
✅ 새 비밀번호 값을 invent 하지 않음
✅ 실제 super_admin 비밀번호 추측·재설정 하지 않음
✅ 계정당 로그인 시도 1회 (잠금 임계치 5회/30분 회피)
✅ 프로덕션 호출 최소화 (로그인 3회 + read-only SELECT 2회)
```

### 3-3. 이전 문서에서 발견·수정한 오류

| 유형 | 내용 | 처리 |
|------|------|------|
| 구조 | 계정당 비밀번호 1개 표기 | L1/L2 분리 |
| 데이터 | `K-cosmetics operator` 행의 **아이디 칸에 이메일이 아닌 값** | 실제 계정 불명 → **추측하지 않고 제거**, §5 에 기록 |
| 오타 | 이메일에 공백 포함 | 수정 |
| 값 | 계정 C 의 L1 값이 프로덕션과 불일치 | `unknown` 표기 |

---

## 4. ⚠️ 남은 차단 — `platform:super_admin` 검증 계정 부재

문서 개편으로도 **관리자 기능 smoke 는 열리지 않는다.**

```text
GET/PATCH /api/v1/admin/platform-accounts/*   (platform:super_admin 전용)
PUT       /api/v1/admin/users/:id             (ADMIN_ROLES = ['platform:super_admin'])
admin-dashboard 관리자 계정 설정 · 운영자 관리 화면
```

**필요 조치는 문서 작업이 아니라 사용자 결정이다** — 검증용 `platform:super_admin` 계정을 지정하거나
기존 2개 중 하나를 검증 채널로 지정해야 한다. **에이전트는 role 을 임의 부여하지 않는다**(권한 변경 = 중지 조건).

---

## 5. 선행 CHECK 정정

`CHECK-O4O-ADMIN-PASSWORD-RESET-SERVICE-CREDENTIAL-SCOPE-CLARIFY-V1 §7-2` 를 정정했다.

| 원문 | 정정 |
|------|------|
| "`sohae2100` 문서 비밀번호가 프로덕션과 불일치(401)" | **오류.** 다른 계정의 비밀번호를 잘못 대입한 결과. 문서값으로 **200** |
| "문서 자격증명 drift 가 검증을 막는다" | 진짜 원인은 **`platform:super_admin` role 부재** |

---

## 6. 변경 없음 / 산출물

```
코드 변경 0 · migration 0 · DB write 0 · 배포 0 · 권한(role) 변경 0 · 계정 비밀번호 재설정 0
docs/local/TEST-ACCOUNTS.local.md 개편 — gitignored 이므로 커밋 대상 아님
git 변경 = 본 CHECK 1건 + 선행 CHECK 정정 1건 (자격증명 미포함)
```

---

## 7. 후속

| 순위 | 내용 | 상태 |
|:---:|------|------|
| 1 | 검증용 `platform:super_admin` 계정 지정 → `...-SCOPE-CLARIFY-V1` smoke 3단계 마감 | **사용자 결정 대기** |
| 2 | `WO-O4O-AUTH-ACCOUNT-ACTIVITIES-SUCCESS-FLAG-FIX-V1` (결정 C) | 착수 가능 |
| 3 | 각 서비스 `/forgot-password` 로 L2 비밀번호 확보 → 문서 §2 매트릭스 채우기 | 계정 소유자 작업 |

---

*범위: 문서 구조 개편 + 실태 확정 · 자격증명 추측/생성 0 · 권한 변경 0 · 코드 무변경*
