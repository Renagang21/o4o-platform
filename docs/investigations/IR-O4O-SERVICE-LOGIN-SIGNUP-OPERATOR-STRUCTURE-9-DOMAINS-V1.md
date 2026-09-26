# IR-O4O-SERVICE-LOGIN-SIGNUP-OPERATOR-STRUCTURE-9-DOMAINS-V1

> 작성일: 2026-09-27 · **조사 전용 — 코드 · DB · 권한 · OAuth 설정 변경 0 · 배포 0**
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
