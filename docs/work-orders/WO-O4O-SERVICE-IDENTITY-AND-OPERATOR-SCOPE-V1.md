# WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1

> 발행: 2026-09-27 · 상태: **설계 확정 / 구현 착수**
> 근거: [`IR-O4O-SERVICE-LOGIN-SIGNUP-OPERATOR-STRUCTURE-9-DOMAINS-V1`](../investigations/IR-O4O-SERVICE-LOGIN-SIGNUP-OPERATOR-STRUCTURE-9-DOMAINS-V1.md)
>
> **하나의 작업이다.** 서비스별 WO 로 나누지 않는다. 호스트 이름만 Admin 화면에 추가하고 완료로 판정하지 않는다.

---

## INITIAL_PURPOSE

하나의 Google 계정으로 **서비스마다 따로 가입**하고, **서비스별 운영자 권한이 독립**으로 동작하게 한다.
Neture 에서 가입한 서비스로 이동할 때 **Google 로그인을 반복하지 않는다.**
**로그인 성공 ≠ 서비스 이용 승인 ≠ 운영자 권한** — 세 판정을 분리한다.

## CONFIRMED_DECISIONS

```text
대상 9개   neture · supplier · funding · community · pharmacy · retail · kpa · store · study  (.neture.co.kr)
           pharmcy / cosmetics.neture.co.kr 같은 새 대상 만들지 않음. 강의는 study
가입승인   가입 신청이 필요한 서비스는 그 서비스 운영자가 승인
독립성     한 서비스 탈퇴·중지가 Neture 기본 계정과 다른 서비스 가입에 영향 주지 않음
커뮤니티   community 운영자가 개설 신청 승인 · 신청자가 첫 운영자
           **모든 커뮤니티는 가입 승인형 하나로 통일** (오픈형·자동가입형 분기 만들지 않음)
           slug 는 신청 시 + 승인 직전 2회 중복 검사 · 충돌 시 신청자에게 새 slug 요청
분회       kpa 운영자가 개설 신청 승인 · 신청자가 첫 운영자 · 주소도 같은 2회 검사
Store      서비스 가입 신청 추가하지 않음. 매장 조직 소속·소유 권한 유지
           Store 전체 운영 권한은 개별 매장 소유자와 구분 — 이번엔 **범위와 진입 경로만 확정**
로그아웃   현재 서비스의 O4O 세션만 종료. 전 서비스 일괄 종료 없음. Google 세션 불변
역할       기존 11개 역할을 새 구조 등록 완료로 간주하지 않음 · 임의 삭제 없음
           한 사용자에게 여러 서비스 운영자 권한 부여 가능
관리자     platform:super_admin 은 별도 관리 · 기존 관리자 권한 이번에 회수하지 않음
배포단위   Cloud Run 웹 서비스를 서브도메인 수에 맞춰 신설하거나 하나로 합치지 않음
```

## OUT_OF_SCOPE

- KPA Society · K-Cosmetics · Pharmacy-Hub 의 **기능·Hub 이전 위치 설계/실행** (URL 트랙 소관)
- 기존 OAuth 승인 원본 **삭제**
- Store 통계·공급 **업무 기능 개발**
- 서비스 키 · role prefix **일괄 이름 변경**
- 커뮤니티 오픈형/자동가입형 · 범용 policy engine

## DONE_CRITERIA

```text
[ ] 9개 대상별 결과표 — Google 로그인 · Neture 이동 · 직접 진입 · 가입/승인 ·
    운영자 지정/접근 · 탈퇴·중지 범위
[ ] 코드 검증과 운영 실측을 구분 표기. 미배포 화면은 PASS 로 쓰지 않음
[ ] 배포 전 OAuth 승인 원본 재확인 (특히 study.neture.co.kr 저장 여부)
[ ] 함께 배포될 다른 트랙 변경 확인 후 통제 배포 · 게이트 즉시 복구
[ ] 배포 후 사용자가 Admin 에서 운영자를 직접 지정할 수 있도록 대상·방법을 한 번에 안내
=>  운영자 지정과 실제 접근 검증 전에는 DONE 으로 보고하지 않는다
```

---

## 1. 설계 원칙 — 분회 2층 패턴을 재사용한다

IR §13 에서 확인한 선례: **분회는 서비스 키를 늘리지 않고** `kpa-branch` 1개 +
개체별 소속(`branch_memberships`) + `resolveBranch`/`requireBranchScope` 로
"자기 분회만" 을 만들었다.

```text
1층  서비스 키        누가 이 도메인의 운영자 후보인가        role_assignments
2층  개체 소속·범위    그 중 어느 개체를 관리하는가            {entity}_memberships + scope guard
```

**이 패턴을 커뮤니티에 그대로 적용하면 새 서비스 키 없이** 개설·승인·운영자 한정이 가능하다 →
URL 트랙의 "서비스 키 · role prefix 일괄 변경 금지" 와 **충돌하지 않는다.**

`supplier` · `funding` 은 개체가 아니라 **호스트 영역**이므로 2층이 아니라 1층 문제다(§4).

## 2. 대상별 설계 판정

| # | 도메인 | 1층(서비스 키) | 2층(개체 범위) | 이번에 만들 것 |
|---|---|---|---|---|
| 1 | `neture` | `neture` 유지 | — | 배너(가입 서비스 목록) · 로그인 전 AI 입력창 노출 |
| 2 | `supplier` | ~~`supplier` 신설~~ → **`neture` 재사용** (실측 정정 2026-09-27) | — | 없음 — §4 참조 |
| 3 | `funding` | ~~`funding` 신설~~ → **`neture` 재사용** (실측 정정 2026-09-27) | — | 없음 — §4 참조 |
| 4 | `community` | **`community` 키 + `community:admin` 신설**(전체 관리자 축만) | **커뮤니티 개체**(`role`+`status`) | 개설 신청·승인 · 커뮤니티 membership · 범위 가드 |
| 5 | `pharmacy` | `kpa-society` **재사용** | — | 가입 승인 경로 정비 |
| 6 | `retail` | `k-cosmetics` **재사용** | — | 〃 |
| 7 | `kpa` | `kpa-branch` **재사용** | **분회 개체(있음)** | 개설 신청·승인 + 주소 2회 검사 + 첫 운영자 |
| 8 | `store` | 서비스 아님 | 조직·매장 | **전체 운영 권한 범위·진입 경로만 확정** |
| 9 | `study` | `lecture` **재사용** | — | 가입 승인 경로 정비 |

> **기존 키가 범위를 올바르게 표현하는 곳은 그대로 쓴다.** 새 키는 독립 범위를 표현할 수
> 없는 곳에만 만든다 — 지시받은 기준 그대로다. **실측 결과 그곳은 `community` 하나였다**
> (2·3 은 기존 키가 이미 범위를 올바르게 표현하고 있었다 — §4).

## 3. 커뮤니티 — 설계

### 3-1. 저장

```text
communities                 id · slug(UNIQUE) · name · status(pending|active|suspended)
                            created_by_user_id · approved_by_user_id · approved_at
community_creation_requests id · requester_user_id · desired_slug · name · status
                            (pending|approved|rejected|slug_conflict) · reviewed_by · reason
community_memberships       id · community_id · user_id
                            role(operator|member)            ← 개체 단위 역할
                            status(pending|active|rejected|withdrawn)
                            UNIQUE(community_id, user_id)
```

> **운영자 권한은 `community_id` 일치로 결정되지 않는다.** 승인된 일반 회원도 같은
> `community_id` 를 갖는다. 운영자 판정은 **`role='operator'` AND `status='active'`** 다(§3-3).

기존 `config/community-catalog.ts` 3개(`pharmacy`·`cosmetics`·`o4o-general`)는 **삭제하지 않는다.**
읽기 경로를 DB 우선 + 카탈로그 폴백으로 두어 **진입(목록·상세)** 은 깨지 않는다.

> **⚠ 폴백이 가입 승인 검사를 우회해서는 안 된다.**
> 기존 진입을 보존하는 것과 **승인 없이 글을 읽고 쓰게 하는 것은 별개다.**
>
> ```text
> 폴백이 커버하는 것:   커뮤니티 목록 · 상세 조회(메타데이터)
> 폴백이 커버하지 않는 것: 게시글 읽기 · 작성 · 중재 · 가입 승인
> ```
>
> 카탈로그 3개도 **DB 로 승격**(`communities` 행 생성)하고, 게시글 경로는 **예외 없이**
> `requireCommunityScope` 를 지난다. 즉 `participationPolicy`(`authenticated` ·
> `service_membership_any`)가 **게시글 권한을 대신 판정하지 않는다.**
>
> **영향**: 지금 서비스 membership 만으로 포럼을 보던 경로가 **가입 승인 필요**로 바뀐다.
> 현재는 개발·검증 단계이고 일반 사용자가 없어 수용 가능하다. 기존 참여자 처리 방침은
> S2 에서 실측(대상 행 수) 후 정한다 — **임의 일괄 승인은 하지 않는다.**

### 3-2. 흐름

```text
개설: 신청(desired_slug) → [검사 1] slug 중복 즉시 통보
      → community 운영자 승인 → [검사 2] 승인 직전 재검사
         충돌 시: 관리자가 임의 slug 로 개설하지 않는다 → status='slug_conflict' 로
                  신청자에게 새 slug 요청(재제출 경로)
      → communities(active) 생성 + 신청자를 community_memberships(role=operator, active)

이용: Neture 로그인 사용자 → 커뮤니티 탐색 → 가입 신청(status=pending)
      → 그 커뮤니티 운영자 승인 → active → 게시글 읽기·작성
      **가입 승인형 하나** — 오픈형/자동가입 분기 없음
```

### 3-3. 검사 지점

| 권한 | 검사 | 범위 |
|---|---|---|
| **개설 신청 승인** | `community:admin` (전체 관리자) | 서비스 전체 |
| **커뮤니티 가입 승인** | `requireCommunityScope('operator')` | **그 커뮤니티만** |
| **게시글 관리(중재)** | 〃 | 그 커뮤니티만 |
| **게시글 읽기·작성** | `requireCommunityScope('member')` | 그 커뮤니티만 |

### 3-3-1. `requireCommunityScope` — ID 일치만으로 통과시키지 않는다

```text
resolveCommunity   params.communitySlug (없으면 Host) → req.community 확정. 없으면 404

requireCommunityScope(level)
  1. community_memberships(user_id, community_id = req.community.id) 조회
  2. 행이 없거나 status !== 'active'                     → 403 COMMUNITY_MEMBERSHIP_REQUIRED
  3. level === 'operator' 인데 role !== 'operator'        → 403 COMMUNITY_OPERATOR_REQUIRED
  4. 통과
```

**세 조건이 모두 필요하다** — 개체 일치 · `status='active'` · (운영자 요구 시) `role='operator'`.
`community_id` 일치만 보면 **승인된 일반 회원이 운영 기능을 통과**한다. 그것이 이 절의 존재 이유다.

> 다른 커뮤니티의 ID·URL 을 넘기면 1~2 에서 걸린다(분회의 `BRANCH_SCOPE_MISMATCH` 와 같은 형태).
> `community:admin` 을 여기서 bypass 시킬지는 **열지 않는다** — 전체 관리자는 개설 승인 경로에서만
> 쓰고, 개별 커뮤니티 운영 기능은 개체 역할로만 통과시킨다.

### 3-3-2. 첫 운영자 부여 범위 — 전체 권한을 주지 않는다

```text
개설 승인 시 부여하는 것:
  community_memberships(community_id, role='operator', status='active')   ← 개체 운영자
  service_memberships('community', status='active')                        ← **가입**(진입 자격)

부여하지 않는 것:
  community:admin · community:operator                                     ← 서비스 전체 역할
```

> **가입과 역할은 다른 축이다.** 새 `community` 서비스 키에는 가입 검사(`membership-guard`)가
> 붙으므로, 개체 운영자 소속만 주면 **첫 운영자가 자기 커뮤니티 관리 화면 진입에서 막힌다.**
> 그래서 개설 승인 흐름이 **서비스 가입도 함께 active** 로 만든다 — 이것은 **진입 자격**이지
> 운영 권한이 아니다. 서비스 전체 운영 권한(`community:admin`/`:operator`)은 여전히 주지 않는다.
>
> 같은 이유로 **커뮤니티 가입 승인** 흐름도 그 사용자의 `service_memberships('community')` 를
> active 로 만든다(없으면 생성). 회원은 개체 `role='member'` 일 뿐 운영 권한이 없다.

신청자가 첫 운영자가 되는 것은 **그 커뮤니티에 한정**된다. 전체 서비스 운영 권한이
따라붙으면 개설만으로 다른 커뮤니티 개설을 승인할 수 있게 된다 — 만들지 않는다.

## 4. 서비스 키 판정 — 실측 후 `community` 하나만 신설

### 4-0. 방향 변경 기록 (2026-09-27 · S4 실측)

| 항목 | 내용 |
|---|---|
| **바꾼 판정** | `supplier` · `funding` **키 신설 → 신설하지 않음** (`community` 신설은 유지) |
| **왜** | 두 호스트의 인가 축을 코드로 확인한 결과 **기존 키가 이미 범위를 올바르게 표현**하고 있었다. 새 키를 만들면 인가 축이 둘로 갈라진다 |
| **근거** | ① `supplier`: FROZEN 정본 [`O4O-SUPPLIER-DOMAIN-BOUNDARY-V1`](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md) §7 이 `organization_members(role=owner) → organizations(type='supplier') → neture_suppliers` 를 **canonical authorization** 으로 고정. 라우터는 `/api/v1/neture/supplier/**` 이고 가드는 `neture-identity.middleware`(같은 관계를 읽는다) — 서비스 역할 축이 아니다<br>② `funding`: 유통참여형 펀딩 = market-trial. 운영자 가드 실측 = `requireNetureScope('neture:operator')` (`routes/market-trial-operator.routes.ts`) |
| **영향** | 새 role·카탈로그·CORS 항목이 줄어든다. 두 호스트의 운영자 지정 대상은 기존 `neture:admin` / `neture:operator` 다. Supplier 사업자 본인의 접근은 종전대로 `organization_members` |
| **되돌릴 조건** | supplier·funding 운영 권한을 `neture` 전체와 **분리해야 할 업무 요구**가 확인되면 그때 키를 만든다. 지금은 그 요구가 확인되지 않았고, FROZEN 도메인에 두 번째 인가 축을 넣는 비용이 더 크다 |
| **미해결로 남는 것** | `neture:operator` 하나가 여러 호스트를 연다는 IR §12 R1 은 **해소되지 않는다.** 이는 키 추가가 아니라 호스트별 운영 범위 분리 문제이며, 별도 WO 로 분리한다 |

### 4-1. `community` 는 왜 신설했는가

개별 커뮤니티는 개체(`communities`)이고, 그 **위의 서비스 축**(진입 자격 · 전체 관리자)이
기존 어떤 키로도 표현되지 않았다. `neture` 로 두면 Neture 회원 전원이 커뮤니티 진입 자격을
갖게 되어 가입 승인형 결정과 어긋난다.

### 4-2. URL 트랙과의 관계

| 축 | 내용 |
|---|---|
| **충돌 대상** | `CHECK-O4O-URL-FIRST-CENSUS-V1` CONFIRMED_DECISIONS — **"서비스 키 · role prefix 일괄 변경 금지"** |
| **충돌이 아닌 이유** | 금지된 것은 **일괄 이름 변경**이다. 기존 키(`neture`·`kpa-society`·`k-cosmetics`·`lecture`·`kpa-branch`)는 이름을 바꾸지 않았고, 추가한 것은 `community` **하나**다 |
| **배포 범위 조율** | 새 키는 카탈로그·역할·handoff 대상에 영향을 준다. URL 트랙이 같은 호스트를 다루므로 **배포 창을 함께** 잡는다 |
| **되돌릴 수 있는가** | 추가이므로 기존 동작을 바꾸지 않는다. `community:admin` 은 **부여될 때만** 효력이 생긴다 |

> 이 절이 지시받은 "충돌 지점과 이유를 CHECK 에 명시" 에 해당한다.

## 5. 분회 — 설계 (기존 구조에 얹는다)

```text
branch_creation_requests  id · requester_user_id · desired_slug · desired_hostname · name
                          · status(pending|approved|rejected|slug_conflict) · reviewed_by · reason
```

- 승인 주체: **`kpa-branch:admin`** — `kpa.neture.co.kr` **서브도메인 전체 운영자**.
  기존 super_admin 전용 `POST /admin/branches` 는 **남긴다**(플랫폼 경로).

  > **`kpa-branch:operator` 로 열면 안 된다(실측).** 이 역할은 **서비스 전역 역할**이고,
  > 개별 분회 한정은 `branch_memberships` + `requireBranchScope` 가 따로 만든다.
  > 즉 **개별 분회 운영자도 `kpa-branch:operator` 를 갖는다** — 승인을 이 역할로 열면
  > A 분회 운영자가 B 분회 개설을 승인할 수 있다.
  >
  > `kpa-branch:admin` 은 이미 존재한다(`20270305000000-SeedKpaBranchServiceAndRoles`:
  > "분회 서비스 전체 관리 (분회 registry / 도메인 승인)" · `assignable: true`).
  > 다만 **Admin 지정 카탈로그에는 없어** 화면에서 줄 수 없다 → §9 에서 추가한다.
- 주소 검사 2회: 신청 시 + 승인 직전. 충돌 시 `slug_conflict` → 신청자 재제출.
- 승인 시: `kpa_organizations` 생성 + 신청자를 `branch_memberships(active)` + `kpa-branch:operator` 부여.
- **`requireBranchScope` 경계 유지** — 새 경로가 다른 분회로 권한을 넓히지 않는지 테스트로 고정.

## 6. Store — 범위·진입 경로만 확정

```text
개별 매장     기존 유지 — 조직 소속·소유 권한. 서비스 가입 신청 추가하지 않음
전체 운영     '매장 전체 통계 · 공급 흐름' 은 개별 매장 소유자와 구분되는 권한이다
진입          store.neture.co.kr 의 운영 영역 (경로는 구현 시 확정)
권한          platform:super_admin 으로 충분한가 / 별도 역할이 필요한가 = 구현 시 판정
기능          통계·공급 업무 기능 자체는 만들지 않는다 (OUT_OF_SCOPE)
```

## 7. 로그아웃

> **실측 정정 (2026-09-27 · S7).** 착수 시점의 "`POST /auth/logout` = 현재 세션 종료" 는
> **사실이 아니었다.** `AuthTokenSessionService.logout` 이 `logoutAll` 에 위임해
> `users.refreshTokenFamily`(사용자 전체 범위)를 비웠고, 그래서 한 서비스에서 로그아웃하면
> 모든 주소의 세션이 끊겼다. 프런트는 두 경로를 이미 구분해 불렀으므로 차이는 서버 하나에
> 있었다. `logout` 이 세션 원장을 건드리지 않도록 고쳤고 `logoutAll` 은 전역 폐기를 자기
> 구현으로 갖는다.
>
> **남는 구조적 한계**: 기기·서비스별 세션 레코드가 없어 서버가 특정 세션 하나만 무효화할
> 수단이 없다. `logout` 이 할 수 있는 일은 "전역 폐기를 하지 않는 것"이며, 서버측 즉시
> 무효화가 필요하면 `logout-all` 을 쓴다. 세션 레코드 도입은 별도 WO 다.

`POST /auth/logout` = 현재 서비스 세션 종료 · `POST /auth/logout-all` = 전 세션 종료.
**`logout-all` 을 서비스 이동 흐름에 연결하지 않는다.** 화면 로그아웃은 `logout` 만 호출한다.
Google 계정 세션은 건드리지 않는다(`google.accounts.id.disableAutoSelect` 류 호출 금지).

## 8. 구현 순서

```text
S1  설계 문서 고정                                  ← 이 문서
S1' 권한 경계 보정 (2026-09-27) — 아래 3건. S2 착수 전 완료
      ① requireCommunityScope 가 ID 일치만 검사하지 않는다 (role+status)
      ② 첫 운영자에게 전체 서비스 역할을 주지 않는다
      ③ 분회 개설 승인은 kpa-branch:admin (개별 분회 운영자 제외)
      ④ 카탈로그 폴백이 가입 승인 검사를 우회하지 않는다
S2  커뮤니티 도메인 (테이블 · 신청/승인 · membership · scope guard · 테스트)
S3  분회 개설 신청/승인 (+ 주소 2회 검사 · 첫 운영자)
S4  서비스 키 추가 — 실측 후 `community` **하나만** (supplier · funding 은 신설하지 않음, §4-0)
      + 역할(community:admin · kpa-branch:admin) + Admin 지정 대상
S5  Neture 배너 · 로그인 전 AI 입력창 노출 · handoff 대상 확장
S6  Store 전체 운영 권한 범위·진입 확정
S7  로그아웃 경로 점검
S8  CI → 원본 재확인(study 포함) → 통제 배포 → 결과표 → 사용자 지정 안내
```

**migration 원칙**: 새 테이블은 incremental migration + `manifest.ts` + `expected-schema-states.ts`
를 **같은 커밋**에 넣고, fingerprint 는 격리 PostgreSQL 15 에서 만든다(운영 복사 금지).

---

## 9. Admin 지정 카탈로그 — 추가할 역할

| 역할 | 왜 |
|---|---|
| `kpa-branch:admin` | **이미 roles 에 있으나 지정 카탈로그에 없다.** 분회 개설 승인 주체를 화면에서 지정하려면 필요하다. 개별 분회 운영자(`kpa-branch:operator`)와 **분리된 상위 권한**임을 라벨에 명시한다 |
| `community:admin` | 커뮤니티 전체 관리자(개설 승인). 신설 |
| `supplier:admin` · `supplier:operator` | §4 새 키 |
| `funding:admin` · `funding:operator` | 〃 |

**주지 않는 것**: `community:operator` — 개별 커뮤니티 운영은 **개체 membership** 으로만 하고
서비스 전역 operator 역할을 만들지 않는다(§3-3-2 와 같은 이유).

## 10. 검증 항목 — 권한 경계 (S2 에서 테스트로 고정)

| # | 고정할 것 | 실패 시 의미 |
|---|---|---|
| V1 | 승인된 **일반 회원**이 그 커뮤니티 운영 기능에서 **403** | ID 일치만 검사하는 구멍 |
| V2 | `status='pending'` 회원이 게시글 읽기·작성에서 **403** | 승인 우회 |
| V3 | A 커뮤니티 운영자가 **B 커뮤니티** ID·URL 로 요청 → **403** | 개체 간 월권 |
| V4 | 개설 승인으로 만들어진 첫 운영자에게 `community:admin`/`:operator` **미부여** | 권한 승격 |
| V5 | `kpa-branch:operator` 만 가진 사용자의 **분회 개설 승인 요청 → 403** | 개별 분회 운영자의 상위 권한 획득 |
| V6 | A 분회 운영자가 **B 분회** 관리 요청 → **403**(기존 `BRANCH_SCOPE_MISMATCH` 유지) | 기존 경계 회귀 |
| V7 | 카탈로그 폴백 커뮤니티(`pharmacy`·`cosmetics`·`o4o-general`)의 게시글 경로도 **동일한 가입 승인 검사** | 폴백 우회 |
| **V8** | **개설 승인 → 첫 운영자 로그인 → 자기 커뮤니티 관리 화면 진입·관리 성공** (`community:admin`/`:operator` **없이**) | 가입 검사가 자기 커뮤니티 운영을 막는 역설 |
| V8-b | 그 첫 운영자에게 **서비스 전체 운영 권한이 없음**을 같은 테스트에서 함께 단정 | V8 을 위해 전체 권한을 주는 우회 |
