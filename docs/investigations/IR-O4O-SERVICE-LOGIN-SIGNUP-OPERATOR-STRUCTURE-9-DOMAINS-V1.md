# IR-O4O-SERVICE-LOGIN-SIGNUP-OPERATOR-STRUCTURE-9-DOMAINS-V1

> 작성일: 2026-09-27 · 확장: 2026-09-27(커뮤니티 · 분회 · 권한 범위) · **조사 전용 — 코드 · DB · 권한 · OAuth 설정 변경 0 · 배포 0**
> 선행: [`IR-O4O-OPERATOR-ASSIGNMENT-TARGET-DOMAINS-9-V1`](IR-O4O-OPERATOR-ASSIGNMENT-TARGET-DOMAINS-9-V1.md)

---

## 0. 목표 구조 (요청받은 것)

```text
neture.co.kr = 전체 서비스 메인. Google 로그인 후 가입한 서비스 배너 표시
하나의 Google 계정 → 여러 서비스에 각각 가입
배너로 이동할 때 Google 로그인을 반복하지 않는다
가입 상태와 운영자 권한은 서비스별로 구분   ← 같은 앱이 여러 서브도메인을 서빙해도
일반 사용자 없음 · 현재는 개발/검증 단계
```

## 1. 먼저 — 이 구조를 이해하는 축 3개

조사 결과, **호스트 · 서비스 · 세션이 서로 다른 축**이라는 점이 모든 판단의 전제다.

| 축 | 무엇이 정하나 | 근거 |
|---|---|---|
| **호스트** | 어떤 화면으로 들어오는가 | `web-neture/src/lib/hostProfile.ts` — 호스트별 소유 경로와 `/` 대표 화면만 가른다 |
| **서비스** | 가입·권한을 가르는 단위 | **API 경로**가 정한다. `membership-guard.middleware.ts` 는 라우트 등록 시 주입된 `config.serviceKey` 로 `service_memberships(active)` 를 검사한다 — **브라우저 호스트를 보지 않는다** |
| **세션** | 로그인 상태 | **origin 별 localStorage**. `hostProfile.ts` 주석: "토큰은 origin 별 localStorage 라, 대표 호스트로 보내면 로그인이 이어지지 않는다" |

> **로그인은 서비스를 가르지 않는다.** `POST /auth/google/login` 의 `serviceKey` 는
> `google-auth.service.ts:205-208` 에서 **그 서비스 membership 상태를 응답에 실어줄 뿐**이고,
> 세션 발급 여부와 무관하며 membership 을 만들지도 않는다. 즉 **Google 로그인 = 전역 인증**,
> **서비스 구분 = membership + role**.

## 2. 9개 대상 조사표

`서빙 앱`은 각 호스트의 실제 응답 `<title>` 로 식별했다(추정 아님).

| # | 도메인 | ① 서빙 앱 / 서비스 식별자 / 로그인 진입 | ③ 가입 상태 저장·검사 | ④ 운영자 값 저장·검사 · Admin 지정 |
|---|---|---|---|---|
| 1 | `neture.co.kr` | neture-web · **`neture`** · `/login` Google 버튼 | `service_memberships('neture')` · membership-guard | `role_assignments` `neture:admin`·`neture:operator` · **Admin 지정 가능** |
| 2 | `supplier.neture.co.kr` | **neture-web (같은 번들)** · 서비스 키 **없음**(호스트 프로필 `supplier`) · `/login` 공유 경로 | **별도 없음** — `neture` membership 을 그대로 씀 | **별도 없음.** 화면 가드는 `SUPPLIER_HUB_ACCESS_ROLES` = `neture:admin` · `platform:super_admin` · `supplier`(+legacy) |
| 3 | `funding.neture.co.kr` | **neture-web (같은 번들)** · 키 **없음**(프로필 `funding`) · `/login` 공유 | **별도 없음** | **별도 없음.** `/market-trial/*` 에 역할 가드 **없음**(참여자 가드 없음) |
| 4 | `community.neture.co.kr` | **neture-web (같은 번들)** · 키 **없음**(프로필 `community`) | **별도 없음** — 주석: "독립 커뮤니티 가입 · 운영은 아직 없다" | **별도 없음** |
| 5 | `pharmacy.neture.co.kr` | **kpa-society-web** · `kpa-society`(role prefix `kpa`) | `service_memberships('kpa-society')` | `kpa:admin`·`kpa:operator` · **Admin 지정 가능** |
| 6 | `retail.neture.co.kr` | **k-cosmetics-web** · `k-cosmetics`(prefix `cosmetics`) | `service_memberships('k-cosmetics')` | `cosmetics:admin`·`cosmetics:operator` · **Admin 지정 가능** |
| 7 | `kpa.neture.co.kr` | kpa-branch-web · `kpa-branch` | `service_memberships('kpa-branch')` + `branch_memberships` | `kpa-branch:operator` · **Admin 지정 가능**(분회 소속은 별도 화면) |
| 8 | `store.neture.co.kr` | store-web · **서비스 아님** · 매장/조직 축 | **membership 아님** — "Store 접근 가능 organization ≥ 1" | **운영자 역할 없음**(소유·조직 권한) · **Admin 지정 대상 아님** |
| 9 | `study.neture.co.kr` | lecture-web · `lecture` | `service_memberships('lecture')` | `lecture:admin`·`lecture:operator` · **Admin 지정 가능** |

### ② Google → 내부 사용자 · 이동 시 세션 전달

- **연결**: `id_token` 검증 → `linked_accounts(provider='google', providerId=sub)` → `users.id`.
  이메일은 Identity Key 가 아니다(자동 병합 금지).
- **이동**: `POST /auth/handoff` → 단기 코드 → 대상 origin 에서 `POST /auth/handoff/exchange`.
  대상은 **두 종류뿐**이다.
  - `targetServiceKey`(SERVICE) — 대상 서비스 `service_memberships.status='active'` 검증.
    `neture`(대표 진입)만 membership 검사 예외.
  - `targetWorkspace='store'`(WORKSPACE) — membership 이 아니라 "Store 접근 가능 organization ≥ 1",
    exchange 는 `store.neture.co.kr` origin 에서만 허용.
- **따라서 handoff 로 갈 수 있는 곳은 서비스 키가 있는 대상뿐**이다.
  `supplier` · `funding` · `community` 는 **키가 없어 handoff 대상이 될 수 없다.**

### ⑤ 예상 동작 — 배너 진입 vs 직접 진입

| 대상 | Neture 배너에서 이동 | 서브도메인 직접 진입 |
|---|---|---|
| `pharmacy` · `retail` · `kpa` · `study` | handoff 코드 교환 → **재로그인 없음**(해당 membership active 일 때) | 그 origin 에 토큰 없으면 **Google 로그인 필요** |
| `store` | WORKSPACE handoff → 재로그인 없음(조직 ≥ 1) | 같음 |
| `supplier` · `funding` · `community` | **handoff 대상 아님** → 일반 링크 이동 → 그 origin 에 토큰 없으면 **재로그인** | **재로그인 필요** |
| `neture` | 대표 진입 | 로그인 |

> 세션이 origin 별 localStorage 이므로, **handoff 가 없는 호스트는 구조적으로 재로그인이 생긴다.**
> 목표 "로그인을 반복하지 않는 경험" 과 직접 부딪치는 지점이다.

### ⑥ 근거 구분

| 성격 | 내용 |
|---|---|
| **코드로 확인** | 호스트 프로필 매핑 · 서비스 키 부재 · membership-guard 의 serviceKey 출처 · handoff 대상 2종 · 각 앱 고정 SERVICE_KEY · 역할 allowlist 11개 · supplier 화면 가드 역할 |
| **호스트 응답으로 확인** | 9개 전부 `200` · 각 호스트가 서빙하는 앱(`<title>`) |
| **배포 후에만 검증 가능** | 각 호스트에서의 실제 Google 로그인 성립 · handoff 왕복 · 배너 목록 렌더 |
| **현재 구조에서 빠진 것** | `supplier`·`funding`·`community` 의 **서비스 키 · membership · 운영자 역할 · handoff 대상 등록** 전부. `store` 의 **운영자 역할 축**(소유 축만 있음) |

## 3. 기존 11개 역할의 효력 범위

| 역할 | 효력이 미치는 호스트 | 비고 |
|---|---|---|
| `neture:admin` · `neture:operator` | `neture.co.kr` **+ `supplier`·`funding`·`community`** | 같은 번들·같은 키라 **세 서브도메인이 자동으로 포함된다.** 구분 불가 |
| `kpa:admin` · `kpa:operator` | `pharmacy.neture.co.kr` (+ `kpa-society.co.kr`) | 같은 앱의 두 호스트 |
| `cosmetics:admin` · `cosmetics:operator` | `retail.neture.co.kr` (+ `k-cosmetics.site`) | 〃 |
| `lecture:admin` · `lecture:operator` | `study.neture.co.kr` | |
| `kpa-branch:operator` | `kpa.neture.co.kr` (+ `kpa-society.co.kr/kpa`) | |
| `pharmacy-hub:admin` · `pharmacy-hub:operator` | `pharmacyhub.co.kr` | **9개 대상에 해당 호스트 없음** |

> **역할 이름과 도메인 이름이 일치하지 않는다.** `pharmacy.neture.co.kr` 의 운영자는
> `pharmacy-hub:*` 가 아니라 **`kpa:*`** 다. `retail.neture.co.kr` 은 `cosmetics:*` 다.
> 이름만 보고 추정하면 틀린다.

## 4. 목표 구조와의 차이

| # | 목표 | 현재 | 차이의 성격 |
|---|---|---|---|
| G1 | 서비스별 가입 구분 | `supplier`·`funding`·`community` 는 **`neture` 하나의 membership** 을 공유 | **키가 없다** — 구분할 단위 자체가 없음 |
| G2 | 서비스별 운영자 권한 구분 | 위 3개는 `neture:*` 로 한꺼번에 열린다 | 〃 |
| G3 | 배너 이동 시 재로그인 없음 | handoff 는 **서비스 키가 있는 대상**만 지원 | 위 3개는 handoff 대상이 될 수 없음 |
| G4 | 메인에서 가입 서비스 배너 | `neture` membership · 서비스 카탈로그 기반 | 위 3개는 카탈로그에 없어 배너 대상이 아님 |
| G5 | `store` 운영자 지정 | 소유·조직 축만 있고 **운영자 역할 없음** | 다른 축이라 역할을 붙이려면 설계가 필요 |

## 5. 충돌 — URL 재구성 트랙의 확정 결정

`CHECK-O4O-URL-FIRST-CENSUS-V1` CONFIRMED_DECISIONS:

> **서비스 키 · role prefix 일괄 변경 금지**

G1·G2 를 충족하려면 `supplier`·`funding`·`community`(필요시 `store`)에 **새 서비스 키와
`{key}:operator` 역할**을 만들어야 한다. 이는 위 결정과 정면으로 부딪치고, RBAC SSOT 는
**F9 동결** 대상이라 구조 변경에 명시적 WO 가 필요하다.

또한 같은 트랙의 확정 결정에 **"커뮤니티는 서비스 회원과 별도 가입"** 이 이미 있다 —
즉 `community` 는 **언젠가 독립 가입 축을 갖는 것이 확정된 방향**이고, 현재 코드도
"독립 커뮤니티 가입 · 운영은 아직 없다" 고 적어 미완임을 밝히고 있다.

## 6. 선택지 — 영향과 함께

| # | 내용 | 얻는 것 | 치르는 것 |
|---|---|---|---|
| **A. 호스트 = 표시 단위** | 서비스 키는 그대로 6개. Admin 화면에 도메인 이름으로 보여주되 뒤에서는 기존 키 사용 | 코드 최소 · 충돌 없음 | **G1·G2 미충족** — `supplier`·`funding`·`community` 는 영원히 `neture` 와 한 덩어리. 사용자가 요청한 "서비스별 구분" 이 안 됨 |
| **B. 새 서비스 키 신설** (`supplier`·`funding`·`community` ±`store`) | 목표 구조 그대로 | G1~G4 충족 | URL 트랙 결정 **뒤집기** · F9 동결 해제 WO · 카탈로그·역할·handoff·배너·가드 전부 신설 · 기존 `neture` membership 보유자의 이전 정책 필요 |
| **C. 단계 분리** | 지금은 키가 있는 6개만 정비(**`neture`·`kpa-society`·`k-cosmetics`·`lecture`·`kpa-branch`** + `store` 는 소유 축 유지), `supplier`·`funding`·`community` 는 URL 재구성이 **커뮤니티 독립 가입** 을 확정할 때 함께 키를 만든다 | 충돌 0 · 되돌릴 일 없음 | 목표가 **부분 달성**. 세 호스트는 당분간 `neture` 권한으로 동작 |

**판단 근거로 덧붙일 사실** — URL 재구성 트랙은 아직 **배포 대기**(Google 승인 원본 7개 미등록)이고,
그 트랙이 `community` 독립 가입을 확정 방향으로 이미 적어 두었다. 지금 B 를 하면 곧 확정될 구조와
두 번 부딪칠 가능성이 있다.

## 7. 이번 조사에서 하지 않은 것

- 코드 · DB · 권한 · OAuth 설정 변경 **0** · 배포 **0**
- 서비스 기능 · Hub 를 옮길 위치 설계 **0** (범위 밖)
- 새 서비스 키 · 역할 신설 **0**
- 기존 권한 데이터 변경 **0**

---

# 확장 조사 — 개설 · 승인 · 권한 범위 (2026-09-27)

> 추가 목표: 커뮤니티/분회를 **개설 신청 → 승인 → 운영** 구조로 보고,
> 권한이 **자기 커뮤니티·자기 분회에 한정**되는지 확인한다.
> **주소 하나에 운영자 하나라고 가정하지 않았다** — 역할은 `role_assignments` 다대다이므로
> 같은 `{service}:operator` 를 여러 사용자가 동시에 보유할 수 있다(활성 1행/사용자·역할).

## 8. 권한 범위 4단계 — 코드에 실재하는 축

| 범위 | 저장 | 검사 | 실재 |
|---|---|---|---|
| **플랫폼** | `role_assignments` `platform:super_admin` | `requireRole` | **있음** |
| **서비스** | `role_assignments` `{prefix}:{admin\|operator}` + `service_memberships` | `membership-guard`(`config.serviceKey`) · scope guard | **있음** |
| **개별 분회** | `branch_memberships.organization_id` | `resolveBranch` → `requireBranchScope` | **있음** |
| **개별 커뮤니티** | — | — | **없음** |
| **조직/매장** | `organization_members` · 매장 소유 | store handoff("조직 ≥ 1") · store auth | **있음** |

> **대상 ID 변조 방어**: 분회는 실재한다. `requireBranchScope` 가
> `active branch_memberships.organization_id === req.branch.id` 를 비교하고 불일치 시
> `403 BRANCH_SCOPE_MISMATCH` 를 낸다(주석: "분회 A 운영자가 분회 B 회원을 관리할 수 없다" 보장 지점).
> **커뮤니티는 비교할 소속 자체가 없어 이 검사가 성립하지 않는다.**

## 9. 커뮤니티 — 현재 구현 상태

`config/community-catalog.ts` 가 **SSOT 이고 코드 상수**다(DB 테이블 아님). 등록 3개:
`pharmacy`(policy=`service_membership_any` [kpa-society, pharmacy-hub]) ·
`cosmetics`(=[k-cosmetics]) · `o4o-general`(=`authenticated`).

| 목표 기능 | 상태 | 근거 |
|---|---|---|
| 개설 **신청** | **없음** | `routes/communities.routes.ts` 에 **GET 2개**(목록·상세)뿐. POST/PATCH/DELETE 0 |
| 전체 관리자 **승인** | **없음** | 승인 주체·상태·엔드포인트 없음 |
| 개설자에게 **운영 권한 부여** | **없음** | 커뮤니티 단위 역할(`community:*` · `{key}` 스코프) 0건 |
| **공개형/회원제** 설정 | **일부** | 정책이 `authenticated` / `service_membership_any` **2종 고정**. "범용 policy engine 금지" 가 설계 의도. 공개형(비로그인 열람)은 없음 |
| 커뮤니티별 **가입** | **없음** | 커뮤니티 membership 테이블 없음. 참여 자격은 **서비스 membership 으로 대리 판정** |
| 커뮤니티별 **접근 검사** | **일부** | 위 정책으로 진입 판정. **어느 커뮤니티의 운영자인가** 는 판정하지 않음 |
| 운영자 **추가·교체·회수** | **없음** | 대상 역할이 없으므로 회수할 것도 없음 |
| 개설 = 무엇인가 | **코드 수정 + 배포** | 카탈로그가 상수라 새 커뮤니티는 배포로만 생긴다 |

**물리 저장의 함정(코드 주석이 명시)** — Forum 원장 `forum_category_requests.service_code` 는
Community 파티션이자 **운영자 governance(어느 서비스 운영자가 승인·중재하는가)** 를 겸하는
**Service scope** 다. `forumStorageCodes` 는 논리→물리 adapter 이며
**`community == serviceKey` 를 가정하면 안 된다**고 적혀 있다.

> 따라서 현재 커뮤니티 운영은 **그 커뮤니티가 쓰는 원장의 서비스 운영자**가 한다.
> 예: `pharmacy` 커뮤니티의 중재 권한은 `kpa:*` · `pharmacy-hub:*` 쪽에 있고,
> **커뮤니티 단위로 좁혀지지 않는다.**

## 10. 약사회 분회 — 현재 구현 상태

| 목표 기능 | 상태 | 근거 |
|---|---|---|
| 분회 **개설** | **있음(제한적)** | `POST /kpa-branch/admin/branches` — **`platform:super_admin` 전용**. 주석: "분회를 새로 만드는 일은 서비스 관리자 권한이 아니라 플랫폼 구조 변경" |
| 개설 **신청**(신청자 제출) | **없음** | 신청 테이블·엔드포인트 0. 존재하는 `/join` 은 **회원 가입**이지 개설이 아니다 |
| 개설 **승인** 워크플로 | **없음** | 신청이 없으므로 승인 단계도 없음. 생성은 즉시 반영 |
| 신청 시 **주소 함께 제출** | **없음** | 생성 API 는 registry 만 만든다("site/운영자/회원은 만들지 않는다") |
| 주소 등록 | **있음** | `branch_domains`(hostname · is_primary · status) · `POST …/operator/domains` · `…/verify-request` |
| 주소 **상태 전이** | **있음** | `pending → verifying → active / failed / disabled` |
| 주소 **중복 방지** | **있음(부분)** | `UQ_branch_domains_primary`(분회당 primary 1개) · `CHK_..._hostname_lower`. **호스트명 전역 유일 제약은 확인되지 않음** |
| 주소 **변경·반려** | **일부** | `failed` · `disabled` 상태는 있으나 "반려 사유 · 재신청" 흐름은 확인되지 않음 |
| 분회 관리자 **권한 부여** | **있음** | `kpa-branch:operator`(Admin 지정 가능) + `branch_memberships` 소속 |
| **자기 분회만** 관리 | **있음** | `requireBranchScope` — §8 참조 |
| 관리자 **추가·교체·회수** | **있음** | 역할 부여/회수 + 소속 변경. 역할은 다대다라 **여러 명 가능** |
| 다른 분회 접근 차단 | **있음** | `403 BRANCH_SCOPE_MISMATCH` |

> **중요**: `kpa-branch:admin` 과 `platform:super_admin` 은 `requireBranchScope` 를 **그냥 통과**한다
> (서비스 전체 관리). 즉 분회 경계는 **operator 급에만** 적용된다.

## 11. 구현 상태 통합표 (요청 형식)

| 영역 | 항목 | 상태 |
|---|---|---|
| 인증 | Google → `linked_accounts` → `users.id` | **현재 구현됨** |
| 인증 | 전역 로그인(서비스 무관) | **현재 구현됨** |
| 인증 | origin 간 세션 전달 handoff (SERVICE · WORKSPACE 2종) | **현재 구현됨** |
| 인증 | `supplier`·`funding`·`community` 로의 handoff | **없음**(서비스 키 부재) |
| 가입 | 서비스 가입·승인(`service_memberships`) | **현재 구현됨** |
| 가입 | 커뮤니티별 가입 | **없음** |
| 가입 | 분회 가입(`/join` · `branch_memberships`) | **현재 구현됨** |
| 개설 | 커뮤니티 개설 신청·승인 | **없음** (카탈로그 = 코드 상수) |
| 개설 | 분회 개설 | **일부** (super_admin 직접 생성 · 신청/승인 없음) |
| 개설 | 분회 주소 제출·검증 | **일부** (등록·상태전이 있음 · 신청 시 동시 제출/전역 유일/반려 흐름 미확인) |
| 권한 | 플랫폼 · 서비스 · 분회 · 조직 범위 | **현재 구현됨** |
| 권한 | 커뮤니티 범위 | **없음** |
| 권한 | 대상 ID 변조 방어(분회) | **현재 구현됨** |
| 권한 | 대상 ID 변조 방어(커뮤니티) | **없음**(비교할 소속 없음) |
| 화면 | Admin 운영자 지정(6서비스 11역할) | **현재 구현됨** |
| 화면 | Neture 첫 화면 AI 입력창 · 배너 | **배포 후 검증 필요** |
| 검증 | 각 호스트 실제 로그인 · handoff 왕복 | **배포 후 검증 필요** |
| 검증 | 분회 주소 호스트명 전역 유일성 | **배포 후 검증 필요**(운영 DB read 차단 중) |

## 12. 권한이 과도하게 공유되는 위험

| # | 위험 | 왜 |
|---|---|---|
| R1 | **`neture:operator` 하나가 4개 호스트를 연다** | `neture.co.kr` + `supplier`·`funding`·`community` 가 같은 키. 공급자 영역 운영자에게 준 권한이 펀딩·커뮤니티 호스트까지 미친다 |
| R2 | **커뮤니티 중재 권한이 서비스 전체 권한과 같다** | 커뮤니티 단위 역할이 없어 `kpa:*` · `cosmetics:*` 로 대리된다. "자기 커뮤니티만" 이 성립하지 않는다 |
| R3 | **`kpa-branch:admin` 은 모든 분회를 연다** | `requireBranchScope` 를 통과한다. 분회 경계는 operator 급에만 적용 |
| R4 | 역할 이름 ≠ 도메인 이름 | `pharmacy.neture.co.kr` 운영자는 `kpa:*`. 이름으로 부여하면 엉뚱한 범위가 열린다 |
| R5 | `store` 는 역할이 아니라 소유 축 | 운영자 지정 화면에 넣으면 **없는 축을 만드는 것** |

## 13. "서비스 키 · role prefix 일괄 변경 금지" 와의 관계

- **분회**는 이미 **서비스 키 1개(`kpa-branch`) + 개체별 소속(`branch_memberships`)** 이라는
  2층 구조로 해결돼 있다. **키를 늘리지 않고** 개체 경계를 만든 선례다.
- **커뮤니티**에 같은 패턴을 쓰면(커뮤니티 membership + `resolveCommunity`/`requireCommunityScope`)
  **새 서비스 키 없이** R2 를 해소할 수 있다 — 위 결정과 충돌하지 않는다.
- 반면 `supplier`·`funding`·`community` **호스트**를 서비스로 승격하는 것은 키 신설이라
  결정과 정면으로 부딪친다. R1 해소에는 (a) 키 신설 (b) 호스트 단위 하위 역할
  (c) 현 상태 수용 중 선택이 필요하다 — **이번 조사는 선택하지 않는다.**

## 14. 한 번에 검토할 설계 결정 (선택하지 않고 제시만)

| # | 결정할 것 | 선택지 | 영향 |
|---|---|---|---|
| D1 | 커뮤니티를 **개체**로 만들 것인가 | 카탈로그 상수 유지 / DB 테이블 + membership + 개체 범위 역할 | 후자는 개설·승인·운영자 한정이 전부 가능해지고 **키 신설 불필요**(분회 선례) |
| D2 | 커뮤니티 **공개형/회원제** | 현 2종 정책 유지 / `visibility` 추가 | 비로그인 열람 필요 여부에 달림 |
| D3 | 분회 **개설 신청→승인** | super_admin 직접 생성 유지 / 신청 테이블 + 승인 | 주소 동시 제출·반려·재신청이 여기에 붙는다 |
| D4 | 분회 주소 **전역 유일성** | 현행 유지 / hostname UNIQUE 추가 | 스키마 변경 → migration · 운영 데이터 확인 선행 |
| D5 | `supplier`·`funding`·`community` **호스트 권한 분리** | 현 상태 수용 / 하위 역할 / 키 신설 | 키 신설만 URL 트랙 결정과 충돌 |
| D6 | `kpa-branch:admin` 의 전 분회 통과 | 유지 / 좁히기 | 현재는 의도된 설계 |
| D7 | `store` 운영자 축 | 만들지 않음 / 조직 역할로 표현 | 없는 축을 만들지 않는 편이 단순 |

## 15. 이번 확장에서 하지 않은 것

코드 · DB · 권한 · OAuth 변경 **0** · 배포 **0** · A·B·C 안 확정 **0** ·
구현 작업 분할 **0** · 서비스 기능/Hub 이전 위치 설계 **0**.
