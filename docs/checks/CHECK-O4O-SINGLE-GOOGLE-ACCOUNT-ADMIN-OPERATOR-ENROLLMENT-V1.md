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
> 최소 요구 역할이 곧 `platform:super_admin` 이다.

### 2-1. 사용자 결정 (2026-09-26)

**`platform:super_admin` 도 최종적으로 이 계정에 부여한다.** 단:

```text
금지  범용 역할 API(POST /operator/members/:id/roles)의 관리자 검사 우회로 즉시 부여
이유  operator-assignments allowlist 가 platform:* 을 의도적으로 제외한 경계를 돌아가는 것
대신  정식 부여 · 검증 · 기존 계정 정리 경로를 마련한 뒤 진행
완료  '두 최고 관리자 계정을 검증 없이 계속 유지' 는 완료 기준이 아니다 —
      목표는 관리자 업무를 새 계정으로 **옮기는** 것이다
```

### 2-2. 선행 실측 — 자기 역할 정리 가드의 운영 배포 상태 **확인됨**

| 축 | 실측 |
|---|---|
| serving revision | `o4o-core-api-03755-6zf` |
| 그 revision 의 소스 | 태그 `deploy/2026-09-26-google-only-auth-cleanup` → SHA `14587a9ad` |
| PR #236 포함 여부 | `23212304f`(#236 merge) ⊂ `14587a9ad` — **조상 관계로 확인** |

→ **가드가 운영에 떠 있다.** 따라서 아래 경로 설계는 현재 운영 동작을 전제로 한다.

### 2-3. 정식 경로 설계

**현재 가드 지형** (코드 실측)

| 동작 | 경로 | 현재 상태 |
|---|---|---|
| super_admin **부여** | — | **경로 없음** ← 유일한 결손 |
| super_admin **회수** (타인) | `DELETE /operator/members/:id/roles/platform:super_admin` | **가능** — `LAST_PLATFORM_SUPER_ADMIN` 이 0명 되는 것만 차단 |
| super_admin **회수** (자기) | 두 경로 모두 | **차단** — 중앙은 `SUPER_ADMIN_ROLE_PROTECTED`, 콘솔은 자기 `platform:*` 해제 금지(PR #236 에서 service-scoped 만 열었다) |

> **이 지형이 순서를 강제한다.** 기존 관리자는 **자기 super_admin 을 스스로 뗄 수 없다.**
> 새 계정이 super_admin 이 된 뒤 **새 계정이 기존 계정의 것을 회수**해야 한다.
> 두 계정이 잠시 공존하는 구간은 우회가 아니라 **이 가드 설계가 요구하는 구간**이다.

**제안 순서 (한 TODO 안에서 끝낸다)**

```text
B1  정식 부여 경로 신설           코드 변경 + 배포 1회          ← 이번 범위
B2  부여                          B1 경로로 renagang21 사용자에게 1건
B3  검증                          새 계정으로 Google 로그인 → 관리자 화면 · 각 운영자 화면
─────────────────────────────── 이번 완료 기준은 여기까지 ───────────────────────────────
(후속)  기존 계정의 platform:super_admin 회수 — **이번 작업에서 하지 않는다**
```

**범위 정정 (2026-09-26 사용자 결정)** — 처음 정한 범위는 새 계정에 권한을 **마련**하고
**기존 관리자 계정은 유지**하는 것이다. 기존 계정의 `super_admin` 회수는 **이후 관리자 계정 변경**
때 결정할 일이므로 이번 완료 기준에서 뺀다.

> 앞서 내가 제안했던 B4(기존 회수) · B5(활성 1명)는 **완료 기준이 아니다.**
> 가드 지형상 "기존 관리자는 자기 것을 못 뗀다" 는 사실은 그대로이며(§2-3 표),
> 그 제약은 **후속 단계에서** 의미를 갖는다. 이번에는 두 계정이 공존한 채로 끝난다.

**이번 작업의 완료 기준**

```text
새 계정에 서비스 역할 11개 + platform:super_admin 이 등록되고,
그 계정으로 로그인해 관리자 화면과 각 서비스 운영자 화면 접근이 확인된다.
기존 관리자 계정의 권한은 건드리지 않는다.
```

---

## 3. TODO

| # | 항목 | 상태 |
|---|---|---|
| A1 | 대상 서비스·권한 확정 (코드 정본) | `[x]` §1 |
| A2 | 관리자 권한 부여 경로 조사 + 영향 보고 | `[x]` §2 — **사용자 확인 대기** |
| A3 | `renagang21@gmail.com` 의 **내부 사용자 ID** 확인 | `[!]` **차단** — 운영 DB read 채널 없음(ADC 부재) · Admin API 는 세션 필요 |
| A4 | 운영자 역할 11개 부여 | `[!]` **차단** — Admin 화면 조작 필요(이 세션에 브라우저 도구 없음) |
| A5 | 관리자 권한 — **정식 경로 설계** | `[x]` §2-3 (가드 지형 실측 · 순서 확정) |
| B1 | 정식 부여 경로 신설 — **구현·검증 완료** | `[x]` §6 (배포 전) |
| B2 | 부여 | `[ ]` B1 배포 이후 |
| B3 | 새 계정 검증 (관리자 화면 · 운영자 화면) | `[ ]` |
| A6 | 운영자 역할 로그인 후 접근 검증 | `[ ]` A4 이후 |
| — | (후속) 기존 계정 super_admin 회수 | **이번 범위 아님** |

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

---

## 5. 사용자에게 필요한 조작·결정 (한 번에)

| # | 항목 | 내용 |
|---|---|---|
| ① | **운영자 11개 부여** | `admin.neture.co.kr` → 운영자 관리 → 등록 → 후보 검색 `renagang21` → **Google 연결된 후보 선택** → 서비스·역할 선택 → 부여 (§1-1 표 11회). 후보가 **유일하게 식별되지 않으면 중지**하고 알린다 |
| ② | **B1 착수 여부** | 정식 부여 경로(`POST /admin/platform-accounts/:id/super-admin`) 신설에 착수할지. 코드 변경 + 배포 1회가 필요하다 |
| ③ | (참고) | Google-only cleanup 의 T5·T6·T7 은 **이 작업과 별개로** 계속 열려 있다 — 그쪽 조작(Console origin 대조 · 실브라우저 4건 · ADC 1회)은 해당 CHECK 에 그대로 남아 있다 |

---

## 6. B1 구현 — `POST /api/v1/admin/platform-accounts/:id/super-admin`

**우회하지 않았다.** `operator-assignments` allowlist 는 `platform:*` 을 여전히 제외하며
(테스트가 고정), 범용 역할 API 의 검사 우회도 쓰지 않는다. "플랫폼 계정은
`/settings/admin-accounts` 소관" 이라는 기존 선언에 맞춰 **관리자 전용 경로를 신설**했다.

| 가드 | 내용 |
|---|---|
| 권한 | `requireRole(['platform:super_admin'])` — 부여자는 super_admin |
| 대상 실재·활성 | 없으면 `404 NOT_FOUND` · 비활성이면 `400 TARGET_INACTIVE` |
| **Google 연결 필수** | `linked_accounts(provider='google')` 없으면 `400 GOOGLE_LINK_REQUIRED`. Identity 가 Google sub 이므로 연결 없이는 그 계정으로 로그인 자체가 불가능하다 — 의미 없는 부여를 막는다 |
| **멱등** | 이미 활성 보유면 아무 것도 바꾸지 않고 `{ changed: false }` |
| RBAC SSOT | 부여는 `roleAssignmentService.assignRole` 한 경로로만 (직접 SQL·repository save 없음) |
| 감사 | `SUPER_ADMIN_GRANTED` — 대상·행위자 기록 |
| 회수 | **만들지 않았다** (이번 범위 밖) |

**검증** — `platform-accounts.superAdminGrant.test.ts` **10 PASS** (G1~G7 + 기존 계약 회귀 +
allowlist 우회 부재). `tsc` rc=0 · 변경 2파일 eslint 0.

> **worktree 함정 기록**: 처음 `tsc` 가 31개 오류를 냈는데 **내 변경과 무관**했다.
> `@o4o/file-understanding-core` 가 이 worktree 에 빌드돼 있지 않아 생긴 것이고,
> 패키지를 빌드하자 0 이 됐다. main 결함이 아니다(변경을 stash 하고 재측정해 확인).

**배포** — `DEPLOY_ENABLED` 는 **이 작업만을 위해 열지 않는다.** B1 의 운영 배포는 다른 배포
트랙의 준비 상태와 함께 조율한다. **배포 전에는 운영 완료로 표시하지 않는다.**
