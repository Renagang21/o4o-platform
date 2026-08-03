# WO-O4O-MEMBERSHIP-UI-API-CONTRACT-AUDIT-AND-MINIMAL-RECOVERY-V1 — CHECK

> **선행**: `WO-O4O-MEMBERSHIP-RESIDUAL-SUBTREE-GUARD-V1` · `WO-O4O-ADMIN-MEMBERSHIP-API-AUTHORIZATION-GUARD-V2`
> **일자**: 2026-08-03 · branch `main` · 시작 HEAD `e250eb0bb`

**최종 판정: `PASS_WITH_FOLLOWUP`**
A(감사 로그) 최소 조치 완료 · **B(소속 관리) 화면 제거 완료** (§12 — 사용자 결정 후 실행).

---

## 1. 테이블 · migration · 프로덕션 적용 상태

프로덕션 Cloud SQL **read-only SELECT** 로 직접 확인했다(본인 전용 프록시, 포트 5481).

| 테이블 | 프로덕션 | 행 수 |
|---|:--:|---:|
| **`yaksa_member_audit_logs`** | **없음** | — |
| `yaksa_member_affiliations` | 존재 | **0** |
| `yaksa_members` | 존재 | **0** |
| `yaksa_member_categories` | 존재 | **0** |

| 축 | 결과 |
|---|---|
| 엔티티 | `@Entity('yaksa_member_audit_logs')` **존재** (`MemberAuditLog.ts:64`), DataSource 에도 등록됨(`entities.ts:538,936`) |
| **migration** | 저장소 전체에서 이 테이블을 만드는 migration **0건** (scanned·orphan 양쪽 모두) |
| `typeorm_migrations` 이력 | member audit 관련 항목 **없음** (검색된 2건은 진단용 `DiagnosticMembershipGateAudit…` 로 테이블 생성과 무관) |

> **판정: 감사 로그 기능은 "미배포"** — 코드에 엔티티만 있고 스키마가 존재한 적이 없다.
> 선행 CHECK 의 `relation "yaksa_member_audit_logs" does not exist` 500 관측과 일치하며,
> 이번에 **현재 프로덕션 기준으로 재확인**했다(요청하신 선행 조건).

**부수 확인**: Membership 3개 테이블이 모두 **0 rows** 다. 즉 Membership 도메인 전체가 프로덕션에서
아직 데이터가 없는 상태다. 이는 아래 실사용 판정의 배경이 된다.

---

## 2. 화면별 실사용 · 도달성 판정

| 화면 | route | 메뉴 | 다른 진입 | 도달성 | 판정 |
|---|---|:--:|---|:--:|---|
| `MemberDetail` (변경 이력 탭) | `/admin/membership/members/:id` | ✅ (Members) | — | **도달 가능** | 화면 실사용, **기능 미배포** |
| `MemberProfilePage` (최근 변경 이력) | main-site `/mypage` | — | 마이페이지 탭 | **도달 가능** | 화면 실사용, **기능 미배포** |
| `AffiliationManagement` | `/admin/membership/affiliations` | **없음** | **없음** | **직접 URL 만** | **미연결 화면** |

- 두 감사 로그 UI 는 **탭 진입 시에만** 호출하며 `auditLogs.length > 0 ? … : (빈 상태)` 구조라
  **이미 빈 상태로 정상 degrade** 한다.
- `AffiliationManagement` 는 메뉴에도 없고 `MembershipDashboard` 에서 링크하지도 않는다.
  (대시보드가 링크하는 것은 `audit-logs` 뿐 — `MembershipDashboard.tsx:490`)

---

## 3. 변경 전/후 최종 URL 과 API 계약

`authClient.api` 의 baseURL = `https://api.neture.co.kr/api/v1`.

| # | 호출부 | 변경 전 최종 URL | 결함 | 변경 후 |
|---|---|---|---|---|
| A-1 | `MemberDetail.tsx:216` | `/api/v1/membership/audit-logs/member/{id}` | **경로 부재** (이중 접두 **아님**) | **호출 제거** |
| A-2 | `MemberProfilePage.tsx:160` | `/api/v1/membership/audit-logs/member/{id}` | **경로 부재** (이중 접두 **아님**) | **호출 제거** |
| B | `AffiliationManagement.tsx:52` | `/api/v1/`**`api/`**`membership/affiliations?…` | **이중 `/api` 접두 + GET endpoint 부재** | **보류** (§4-B) |

> **선행 보고 정정**: 직전 보고에서 "감사 로그 호출부 2건도 이중 `/api` 접두"라고 했으나
> **사실이 아니다.** A-1·A-2 는 `/membership/...` 로 접두가 올바르며 **경로만 틀렸다.**
> 이중 접두는 **B 1건뿐**이다. 따라서 이번 범위의 접두 교정 대상은 B 하나이며, B 는 보류되어 미적용이다.

### 정상 route 대조

| 축 | 값 |
|---|---|
| 실제 존재하는 감사 로그 route | `GET /api/v1/membership/members/:memberId/logs` (`routes/index.ts:63`) |
| 그 route 의 guard | `membersSelective` → `/me`·`/me/summary` 외 **platform:admin·super_admin 전용** |
| 연결 가능성 | **불가** — ① 테이블이 없어 연결해도 500 ② main-site 회원 본인은 관리자 권한이 없어 403 |

---

## 4. 항목별 선택

### A. 회원 감사 로그 → **비활성(호출 제거) + 빈 상태 유지** — WO §4-A ②

테이블 부재 = 기능 미배포이므로 지시대로 **임의 migration·운영 DB 변경을 하지 않았다.**

정상 route 로 "연결"하는 선택지는 **성립하지 않는다**:
- 테이블이 없어 연결 즉시 **500**
- main-site 회원 본인은 해당 route 에 **접근 권한이 없다**(관리자 전용)

→ 현재 UI 구조에 맞는 최소 조치로 **없는 endpoint 호출만 제거**하고,
UI 블록·상태·탭 구조는 **그대로 두어 기존 빈 상태를 렌더**한다. 화면에서 사라지는 기능은 없다
(원래도 `catch {}` 로 빈 배열이었다).

**부수 효과 제거**: 선행 보안 WO 로 `/audit-logs` subtree 가 보호되면서 이 호출은
404 가 아니라 **401** 을 받게 됐다. 회원 마이페이지에서 매번 401 이 발생해
인증 문제처럼 보일 수 있었는데, 호출 제거로 그 소음도 사라진다.

### B. 소속 관리 → **보류 (중지 조건 해당)**

중지 조건 *"기존 API 재사용과 신규 API 추가 사이에 의미 있는 정책 선택이 필요함"* 에 해당한다.

**"최소 GET 복구"가 실제로는 최소가 아니다.** `AffiliationService` 에는
**전체 소속을 나열하는 메서드가 없다**:

```
listByMember(memberId)          ← 회원 단위
listByOrganization(organizationId) ← 조직 단위
findById(id)
(전체 목록 없음)
```

화면이 요구하는 것은 **scope 없는 전역 목록 + 페이지네이션 + 필터(status·organizationType·search)** 다.
이를 만들려면 **service 메서드 + controller + route 를 새로 추가**해야 하므로
"기존 API 재사용"이 아니라 **신규 백엔드 표면 추가**다.

판단에 필요한 선택지:

| 선택 | 내용 | 비용 / 위험 |
|---|---|---|
| **① 복구** | 관리자 전용 전역 목록 GET 신설(service+controller+route) | 신규 백엔드 표면. 0 rows 라 실사용 근거 약함 |
| **② 제거** | 미연결 화면 + 잘못된 호출 dead code 제거 | 완성된 UI 폐기. 되살리려면 재작업 |
| **③ 현상 유지** | 메뉴 미연결 상태로 방치 | 잘못된 호출·이중 접두가 남음 |

**②를 추정으로 실행하지 않았다** — 화면 하나를 통째로 지우는 것은 되돌리기 어렵고,
"미연결 = 미사용"으로 단정하려면 제품 의도 확인이 필요하기 때문이다.
`AffiliationManagement` 는 필터·페이지네이션까지 갖춘 **완성된 UI** 라 폐기 여부는 사용자 판단 영역이다.

---

## 5. 변경 파일과 최소 변경 내용

| 파일 | 변경 |
|---|---|
| `apps/admin-dashboard/src/pages/membership/members/MemberDetail.tsx` | `fetchAuditLogs` 의 네트워크 호출 제거 → `setAuditLogs([])` + 사유 주석 |
| `apps/main-site/src/pages/mypage/MemberProfilePage.tsx` | `loadAuditLogs` 동일 처리 + 사유 주석 |

`git diff --stat`: **2 files changed, 32 insertions(+), 20 deletions(-)**

- 백엔드·router·guard·schema·migration **무변경**
- UI 구조·탭·빈 상태 **무변경**
- `authClient` import 는 두 파일 모두 다른 호출에서 계속 사용 → 미사용 경고 없음

---

## 6. 인증 · 역할 · scope 검증

**보안 경계를 완화하지 않았다.**

| 항목 | 상태 |
|---|:--:|
| Membership subtree guard 완화 | **0** |
| `platform:admin`·`super_admin` 정책 확대 | **0** |
| 조직·지부·분회 관리자 신규 권한 | **0** |
| `/members/:memberId/...` 소유권 검사 변경 | **0** |
| 신규 permission 체계 | **0** |

선행 WO 의 guard 계약이 유지되는지 회귀로 확인했다(§7).
개인정보·토큰·실제 감사 로그 본문은 **출력하지 않았다** — 테이블 존재 여부와 **행 수만** 조회했다.

> 조사 중 확인된 정책 공백: **회원 본인이 자기 변경 이력을 볼 수 있는 경로가 현재 없다.**
> `/members/:memberId/logs` 는 관리자 전용이고 `/me` 예외에 이력 경로가 없다.
> 본인 열람을 허용하려면 권한 설계가 필요하므로 **여기서 결정하지 않고 후속으로 남긴다.**

---

## 7. 테스트 · typecheck · 배포

| 항목 | 결과 |
|---|---|
| `admin-dashboard` typecheck | **0 error** |
| `main-site` typecheck | **0 error** |
| `admin-dashboard` 전체 테스트 | **182 pass / 0 fail** (10 파일) |
| membership·service-admin guard spec | 선행 WO 에서 **208 pass** 유지 (guard 무변경) |
| 배포 | **미실행** — §14 참조 |

---

## 8. 운영 DB write · 타 세션 파일

| 항목 | 값 |
|---|---:|
| 운영 DB INSERT·UPDATE·DELETE | **0** |
| migration 적용 | **0** |
| 실행한 SQL | **SELECT 전용** (`to_regclass`, `COUNT(*)`, `information_schema`) |
| 개인정보·감사 로그 본문 출력 | **0** |
| HFF-ZH·OTC 작업물 접촉 | **0** |
| **타 세션 Cloud SQL Proxy 종료** | **0** — 내가 띄운 3개(PID 10356·9940·15796)만 종료, 타 세션 PID 11404·12168 **생존 확인** |
| `pnpm-lock.yaml` | 미변경·미포함 |

---

## 9. 잔여 후속 작업

| # | 후속 WO | 내용 | 선행 |
|---|---|---|---|
| 1 | `WO-O4O-MEMBERSHIP-AUDIT-LOG-FEATURE-DEPLOY` | `yaksa_member_audit_logs` migration + 기록 적재 + 화면 재연결 | 기능 필요 여부 결정 |
| 2 | `WO-O4O-MEMBERSHIP-SELF-AUDIT-LOG-ACCESS-POLICY` | 회원 본인의 자기 이력 열람 허용 여부 | 1 |
| 3 | `WO-O4O-MEMBERSHIP-AFFILIATION-SCREEN-DISPOSITION` | §4-B 3택 1 (복구 / 제거 / 유지) | **사용자 판단** |
| 4 | (기존) `WO-O4O-ADMIN-API-PREFIX-RESIDUAL-SWEEP-V1` | 잔여 이중 접두 — B 의 접두도 여기 포함 가능 | — |

---

## 10. 커밋 · push

```
ca73ef1b6  fix(membership): stop calling non-existent audit-log endpoint
           (2 files changed, 32 insertions, 20 deletions)
HEAD...origin/main = 0 0
```

---

## 11. 최종 판정 — `PASS_WITH_FOLLOWUP`

| 항목 | 결과 |
|---|:--:|
| 테이블·migration·프로덕션 상태 재확인 | ✅ **미배포 확정** |
| A 감사 로그 — 최소 안전 조치 | ✅ 완료 |
| 존재하지 않는 endpoint 호출 잔존 | ✅ **0** (A 기준) |
| B 소속 관리 | ⏸ **보류** — 정책 선택 필요 |
| 보안 경계 완화 | ✅ **0** |
| 운영 DB write | ✅ **0** |

`PASS` 가 아닌 이유: 감사 로그 **기능 자체가 미배포**로 남아 있기 때문이다(§9-1·2).
B 는 §12 에서 사용자 결정에 따라 종료됐다.

---

## 12. 후속 처리 — 배포 및 B 결정 실행 (2026-08-03)

사용자 결정: **① 신규 GET 개발하지 않음 ② `AffiliationManagement` dead code 제거 ③ 감사 로그 기능은 보류.**

### 12-1. 배포 (A 변경)

`ca73ef1b6` 은 **양쪽 모두 자동 배포 완료**되어 있었다(수동 트리거 불필요).

| workflow | commit | 결과 |
|---|---|:--:|
| `Deploy Admin Dashboard (Cloud Run)` | `ca73ef1b6` | **success** |
| `Deploy Main Site (Cloud Run)` | `ca73ef1b6` | **success** |

### 12-2. 배포 후 검증 — 감사 로그 요청 중단

| 화면 | 감사 로그 요청 | 크래시 | 렌더 |
|---|:--:|:--:|:--:|
| 회원 목록 `/admin/membership/members` | **없음** | 없음 | 정상 |
| 회원 분류 `/admin/membership/categories` | **없음** | 없음 | 정상 (빈 상태) |

`MemberDetail`·`MemberProfilePage` 에서 나가던 `/membership/audit-logs/member/:id` 요청이
**완전히 사라졌다.** 화면 탭·빈 상태·UX 는 그대로다.

### 12-3. `AffiliationManagement` 소비처 최종 확인

| 소비처 | 성격 |
|---|---|
| `routes/yaksa.routes.tsx:13,95` | 실 route (**메뉴·대시보드 링크 없음** — 직접 URL 전용) |
| `pages/membership/MembershipRouter.tsx:20,41` | **이 router 자체가 어디에도 mount 되지 않은 legacy** |
| 테스트·스토리·공용 컴포넌트 | **0건** |

→ 실사용 소비처 **0**. 제거 요건 충족.

### 12-4. 제거 내용

| 파일 | 처리 |
|---|---|
| `pages/membership/affiliations/AffiliationManagement.tsx` | **삭제** (241줄) |
| `routes/yaksa.routes.tsx` | lazy import + Route 블록 제거 (사유 주석 대체) |
| `pages/membership/MembershipRouter.tsx` | 해당 참조 2줄만 제거 |

- 공용 컴포넌트·다른 정상 소비처 **미제거**
- `MembershipRouter` 는 mount 되지 않은 legacy 라 **파일 자체는 남겼다**(별도 정리 대상 — §13)
- 코드 상 `AffiliationManagement` 참조 **0건** (남은 1건은 사유 주석)

### 12-5. 검증

| 항목 | 결과 |
|---|---|
| typecheck | **0 error** |
| 테스트 | **182 pass / 0 fail** (10 파일) |
| build | **성공** |
| 배포 | `597a29983` → `Deploy Admin Dashboard` **success** |

**제거 후 프로덕션 실측**

| route | 결과 |
|---|---|
| `/admin/membership/affiliations` | `/admin` 으로 폴백 · **크래시 없음 · 콘솔 0** (죽은 화면 사라짐) |
| `/admin/membership/members` · `/categories` · `/verifications` · `/dashboard` | **전부 정상 렌더 · 크래시 0** |

인접 Membership 화면 회귀 **없음**. (콘솔 오류는 검증 계정 권한에 따른 기존 403.)

---

## 13. 이번 턴에 새로 확인된 항목 (범위 밖 — 미조치)

### `AuditLogManagement` 화면도 이중 `/api` 접두로 호출 중

| 항목 | 값 |
|---|---|
| 화면 | `pages/membership/audit-logs/AuditLogManagement.tsx:52` |
| route | `/admin/membership/audit-logs` |
| 진입 | **`MembershipDashboard.tsx:490` 에서 링크됨** (메뉴에는 없음) |
| 실측 요청 | `GET /api/v1/`**`api/`**`membership/audit-logs?page=1&limit=50` → **이중 접두** |

이번 WO 의 A 범위는 `MemberDetail`·`MemberProfilePage` 2건으로 명시돼 있어 **손대지 않았다.**
다만 감사 로그 **기능 자체가 미배포**이므로, 접두를 고쳐도 테이블이 없어 동작하지 않는다.
→ **`MEMBERSHIP-AUDIT-LOG-FEATURE-DEPLOY` 시점에 이 화면까지 함께 처리**하는 것이 옳다.
그때까지는 대시보드에서 링크되는 비동작 화면이 하나 남는다.

### `MembershipRouter.tsx` 자체가 미mount legacy

7개 화면을 라우팅하는 완전한 router 이지만 **어디에서도 mount 되지 않는다.**
실 route 는 `routes/yaksa.routes.tsx` 가 담당한다. 파일 통째 제거는 이번 범위 밖이라 남겼다.

---

## 14. 최종 상태

```
ca73ef1b6  감사 로그 죽은 호출 제거      → Admin·Main Site 배포 success
7567807d2  CHECK
597a29983  AffiliationManagement 제거   → Admin 배포 success
HEAD...origin/main = 0 0
```

| 항목 | 값 |
|---|---:|
| 운영 DB write | **0** |
| schema·migration | **0** |
| 보안 경계 변경 | **0** |
| 타 세션 작업물 접촉 | **0** |
| `pnpm-lock.yaml` | 미변경·미포함 |
