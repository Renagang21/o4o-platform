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
B1  정식 부여 경로 신설           코드 변경 + 배포 1회
      POST /admin/platform-accounts/:id/super-admin   (가칭)
      · requireRole(['platform:super_admin'])
      · 대상에 Google 연결(linked_accounts) 필수 — 없으면 거절
      · 감사 로그 필수 · 멱등(이미 보유면 변경 없음)
      · 화면: /settings/admin-accounts 에 명시 액션으로 노출
      · 테스트: 비-super_admin 거절 · Google 미연결 거절 · 멱등 · 감사 기록
B2  부여                          B1 경로로 renagang21 사용자에게 1건
B3  검증                          새 계정으로 Google 로그인 → 관리자 화면 · 각 운영자 화면
B4  기존 계정 정리                새 계정이 기존 계정의 platform:super_admin 회수
                                  (기존 경로 사용 · 코드 변경 0 · LAST_PLATFORM_SUPER_ADMIN 이 0명 방지)
B5  최종 확인                     super_admin 활성 보유자 1명 · 새 계정으로 전 업무 수행 가능
```

**공존 구간의 권한** — B2~B4 사이에는 최고 관리자가 2명이고 **둘 다 전 서비스 거버넌스 권한**을
갖는다. 이 구간을 짧게 유지하는 것이 안전 조치다. B4 는 **기존 계정 삭제가 아니라 역할 회수**이며,
이번 요청의 "기존 관리자 계정 유지" 와 충돌하지 않는다(계정은 남고 관리자 역할만 이동).

> **B1 은 코드 변경 + 배포가 필요하다.** 착수 여부는 사용자 결정 사항이다 — §5 에 모아 둔다.

---

## 3. TODO

| # | 항목 | 상태 |
|---|---|---|
| A1 | 대상 서비스·권한 확정 (코드 정본) | `[x]` §1 |
| A2 | 관리자 권한 부여 경로 조사 + 영향 보고 | `[x]` §2 — **사용자 확인 대기** |
| A3 | `renagang21@gmail.com` 의 **내부 사용자 ID** 확인 | `[!]` **차단** — 운영 DB read 채널 없음(ADC 부재) · Admin API 는 세션 필요 |
| A4 | 운영자 역할 11개 부여 | `[!]` **차단** — Admin 화면 조작 필요(이 세션에 브라우저 도구 없음) |
| A5 | 관리자 권한 — **정식 경로 설계** | `[x]` §2-3 (가드 지형 실측 · 순서 확정) |
| B1 | 정식 부여 경로 신설 (코드+배포) | `[ ]` **사용자 착수 결정 대기** |
| B2 | 부여 | `[ ]` B1 이후 |
| B3 | 새 계정 검증 (관리자 화면 · 운영자 화면) | `[ ]` |
| B4 | 기존 계정의 super_admin 회수 (기존 경로) | `[ ]` |
| B5 | 최종 확인 — 활성 super_admin 1명 | `[ ]` |
| A6 | 운영자 역할 로그인 후 접근 검증 | `[ ]` A4 이후 |

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
