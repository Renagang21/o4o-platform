# CHECK-O4O-SINGLE-GOOGLE-ACCOUNT-ADMIN-OPERATOR-ENROLLMENT-V1

> 시작: 2026-09-26 · 상태: **`BLOCKED — 실행 전 사용자 결정 1건 + 사용자 조작 필요`**
> 대상 계정: `renagang21@gmail.com` (**이미 등록된 Google 사용자 1명**)

---

## 0. 목적 · 확정 사항 · 제외 범위

**목적** — 이 Google 계정 **하나**로 ① 관리자 화면에 들어가고 ② 운영자가 필요한 현행 서비스에서
업무를 수행한다. 새 로그인 방식·별도 운영자 계정을 만들지 않는다.

**확정 사항**

```text
기존 관리자 계정        유지 (권한 제거·삭제 금지)
관리자 아이디 변경       이번 작업 범위 아님 (나중)
같은 이메일 사용자 신규 생성  금지
은퇴 서비스·기기 등록 전용 화면  운영자 계정 만들지 않음
```

**제외 범위** — 인증 방식 변경 · 기존 관리자 권한 회수 · 분회 소속(`branch_memberships`) 지정 ·
매장/조직 소유권 부여.

---

## 1. 대상 서비스 · 권한 — 코드 정본에서 확정

근거: `apps/api-server/src/config/operator-role-catalog.ts` (서버 allowlist · 부여 판정 SSOT) ·
`apps/admin-dashboard/src/lib/operator-role-catalog.ts` (화면 표현 · 두 목록 일치는 테스트가 강제) ·
`apps/api-server/src/config/service-catalog.ts` (서비스 · 진입 주소).

### 1-1. 부여 대상 (11개 역할 / 6개 서비스) — **Admin 화면에서 처리 가능**

| # | 서비스 | canonical service_key | 역할 | 진입 주소 |
|---|---|---|---|---|
| 1 | KPA 커뮤니티 | `kpa-society` | `kpa:admin` · `kpa:operator` | `kpa-society.co.kr` |
| 2 | Neture | `neture` | `neture:admin` · `neture:operator` | `neture.co.kr` |
| 3 | Pharmacy-Hub | `pharmacy-hub` | `pharmacy-hub:admin` · `pharmacy-hub:operator` | `pharmacyhub.co.kr` |
| 4 | O4O 강의 | `lecture` | `lecture:admin` · `lecture:operator` | `study.neture.co.kr` |
| 5 | K-Cosmetics | `k-cosmetics` | `cosmetics:admin` · `cosmetics:operator` | `k-cosmetics.site` |
| 6 | 약사회 분회 | `kpa-branch` | `kpa-branch:operator` (**admin 역할 없음**) | `kpa-society.co.kr/kpa` |

> `kpa-branch:operator` 부여는 **분회 소속 지정이 아니다.** 대상 분회는 분회 운영자 화면에서 별도로 정한다.

### 1-2. 부여 대상 아님 — 근거와 함께

| 서비스 | 이유 |
|---|---|
| Store (`store.neture.co.kr`) | 서비스 카탈로그에 key 자체가 없다. 접근은 **매장 소유·조직 소속** 축이며 운영자 role 이 없다 |
| Hospital Pharmacy (`neture.co.kr/hospital`) | **기기 등록 전용** 진입(EnrollmentGate). 사람 운영자 role 없음 |
| Signage Player | 익명 단말 런타임. 사람 로그인 축 아님 |
| `cafe24-b2b` | 카탈로그에 있으나 **부여 가능 역할 0** — 사람 운영자 역할이 정의돼 있지 않다 |

---

## 2. ⚠️ 실행 전 보고 — 관리자 권한은 화면에 부여 경로가 없다

**`관리자 화면 접근 = platform:super_admin`** 이다(`ADMIN_ACCESS_ROLES = ['platform:super_admin']` ·
`routes/admin/platform-accounts.routes.ts` · `platform-users.routes.ts`).

그런데 **그 역할을 남에게 부여하는 화면·API 가 없다.**

| 경로 | 관리자 권한 부여 가능? |
|---|---|
| Admin `/settings/admin-accounts` + `GET/PATCH /admin/platform-accounts` | **불가** — 목록 조회와 활성/비활성 토글뿐 |
| Admin 운영자 관리 + `POST /admin/operator-assignments` | **불가** — allowlist 에 `platform:*` 이 **의도적으로 없다**("플랫폼 계정은 `/settings/admin-accounts` 소관") |
| `POST /api/v1/operator/members/:userId/roles` (운영자 콘솔) | **가능** — 요청자가 platform admin 이면 assignability·scope 검사를 건너뛴다. **현재 열려 있는 유일한 경로** |

**영향** — 부여하면 **플랫폼 최고 관리자가 2명**이 된다.

- 두 계정 모두 전 서비스 거버넌스 권한을 갖는다.
- 최근 배포된 가드 변경(PR #236)에 따라 super_admin 은 자기 서비스 역할과 마지막 `{service}:admin`
  도 정리할 수 있다 — 권한 범위가 넓다.
- 반대로, 2명이 되어야 `LAST_PLATFORM_SUPER_ADMIN` 보호에 걸리지 않고 **나중에 관리자 아이디를
  바꿀 수 있다.** 이번 요청의 "나중에 아이디 변경" 과 방향이 일치한다.

> **이것은 '필요한 권한보다 넓은 역할' 이 아니라 '그 역할밖에 없는' 경우다.** 관리자 화면 접근의
> 최소 요구 역할이 곧 `platform:super_admin` 이다. 다만 영향이 크므로 **부여 전에 확인을 받는다.**
> 확인 없이는 §1-1 의 운영자 역할 11개만 처리한다.

---

## 3. TODO

| # | 항목 | 상태 |
|---|---|---|
| A1 | 대상 서비스·권한 확정 (코드 정본) | `[x]` §1 |
| A2 | 관리자 권한 부여 경로 조사 + 영향 보고 | `[x]` §2 — **사용자 확인 대기** |
| A3 | `renagang21@gmail.com` 의 **내부 사용자 ID** 확인 | `[!]` **차단** — 운영 DB read 채널 없음(ADC 부재) · Admin API 는 세션 필요 |
| A4 | 운영자 역할 11개 부여 | `[!]` **차단** — Admin 화면 조작 필요(이 세션에 브라우저 도구 없음) |
| A5 | 관리자 권한 부여 | `[!]` **차단** — A2 확인 + 실행 수단 필요 |
| A6 | 로그인 후 접근 검증 | `[ ]` A4·A5 이후 |

### A3 — 계정 식별을 추정으로 하지 않는다

이메일 문자열만 보고 고르지 않는다. Admin 운영자 관리의 **후보 검색**은 서버가
`linked_accounts`(Google sub) 연결 여부(`hasGoogleLink`)까지 돌려주므로, 화면에서 검색해 고르면
**내부 사용자 ID 로 전송**된다(`userId: selectedCandidate.userId` — email 은 Identity Key 가 아니다).
따라서 **§1-1 은 화면에서 처리하는 것이 가장 안전하다.**

검색 결과가 0건이거나 동명이인·`hasGoogleLink=false` 가 보이면 **부여하지 말고 알린다.**

---

## 4. 결과표 (부여 후 채운다 — 추정 기록 금지)

| 서비스 | 역할 | 부여 여부 | 부여 경로 | 로그인 후 접근 | 근거 |
|---|---|---|---|---|---|
| KPA 커뮤니티 | `kpa:admin` | — | — | — | — |
| KPA 커뮤니티 | `kpa:operator` | — | — | — | — |
| Neture | `neture:admin` | — | — | — | — |
| Neture | `neture:operator` | — | — | — | — |
| Pharmacy-Hub | `pharmacy-hub:admin` | — | — | — | — |
| Pharmacy-Hub | `pharmacy-hub:operator` | — | — | — | — |
| O4O 강의 | `lecture:admin` | — | — | — | — |
| O4O 강의 | `lecture:operator` | — | — | — | — |
| K-Cosmetics | `cosmetics:admin` | — | — | — | — |
| K-Cosmetics | `cosmetics:operator` | — | — | — | — |
| 약사회 분회 | `kpa-branch:operator` | — | — | — | — |
| (플랫폼) | `platform:super_admin` | — | — | — | **§2 확인 대기** |

검증은 **세 가지를 구분**해 기록한다 — ① 로그인 성공 ② 서비스 소속(membership) ③ 실제 권한 동작
(운영자 화면 진입). 확인하지 못한 항목을 PASS 로 쓰지 않는다.
