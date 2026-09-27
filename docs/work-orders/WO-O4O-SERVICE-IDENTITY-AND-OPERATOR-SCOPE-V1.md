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
| 2 | `supplier` | **`supplier` 신설 필요** | — | §4 충돌 절 참조 |
| 3 | `funding` | **`funding` 신설 필요** | — | 〃 |
| 4 | `community` | **`community` 신설 필요**(전체 관리자 축) | **커뮤니티 개체** | 개설 신청·승인 · 커뮤니티 membership · 범위 가드 |
| 5 | `pharmacy` | `kpa-society` **재사용** | — | 가입 승인 경로 정비 |
| 6 | `retail` | `k-cosmetics` **재사용** | — | 〃 |
| 7 | `kpa` | `kpa-branch` **재사용** | **분회 개체(있음)** | 개설 신청·승인 + 주소 2회 검사 + 첫 운영자 |
| 8 | `store` | 서비스 아님 | 조직·매장 | **전체 운영 권한 범위·진입 경로만 확정** |
| 9 | `study` | `lecture` **재사용** | — | 가입 승인 경로 정비 |

> **기존 키가 범위를 올바르게 표현하는 곳(5·6·7·9)은 그대로 쓴다.** 새 키는
> 독립 범위를 표현할 수 없는 곳(2·3·4)에만 만든다 — 지시받은 기준 그대로다.

## 3. 커뮤니티 — 설계

### 3-1. 저장

```text
communities                 id · slug(UNIQUE) · name · status(pending|active|suspended)
                            created_by_user_id · approved_by_user_id · approved_at
community_creation_requests id · requester_user_id · desired_slug · name · status
                            (pending|approved|rejected|slug_conflict) · reviewed_by · reason
community_memberships       id · community_id · user_id · role(operator|member)
                            · status(pending|active|rejected|withdrawn)   UNIQUE(community_id,user_id)
```

기존 `config/community-catalog.ts` 3개(`pharmacy`·`cosmetics`·`o4o-general`)는 **삭제하지 않는다.**
읽기 경로를 DB 우선 + 카탈로그 폴백으로 두어 기존 진입을 깨지 않는다.

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

| 권한 | 검사 |
|---|---|
| 개설 승인 | `community:operator`(전체 관리자 축) |
| 커뮤니티 가입 승인 | `resolveCommunity` → `requireCommunityScope('operator')` — **그 커뮤니티 membership.role='operator'** |
| 게시글 관리 | 〃 |
| 게시글 읽기·작성 | 그 커뮤니티 membership `status='active'` |

`resolveCommunity` 는 `params.communitySlug`(없으면 Host)로 개체를 확정하고,
`requireCommunityScope` 가 **`community_memberships.community_id === req.community.id`** 를 비교한다.
**다른 커뮤니티 ID·URL 을 넘겨도 서버가 거부한다**(분회의 `BRANCH_SCOPE_MISMATCH` 와 같은 형태).

## 4. ⚠️ 충돌 지점 — `supplier` · `funding` · `community` 서비스 키 신설

| 축 | 내용 |
|---|---|
| **충돌 대상** | `CHECK-O4O-URL-FIRST-CENSUS-V1` CONFIRMED_DECISIONS — **"서비스 키 · role prefix 일괄 변경 금지"** |
| **왜 필요한가** | 세 호스트가 `neture` 키를 공유해 **`neture:operator` 하나가 4개 호스트를 연다**(IR §12 R1). 지시는 "같은 웹 앱을 쓰더라도 서비스별 가입·운영자·접근 검사는 독립" 이다. 1층을 나누지 않으면 독립이 성립하지 않는다 |
| **충돌이 아닌 부분** | 금지된 것은 **일괄 이름 변경**이다. 기존 키(`neture`·`kpa-society`·`k-cosmetics`·`lecture`·`kpa-branch`)는 **이름을 바꾸지 않고 그대로 둔다.** 새 키 3개를 **추가**할 뿐이다 |
| **배포 범위 조율** | 새 키는 카탈로그·역할·CORS·handoff 대상에 영향을 준다. URL 트랙이 같은 호스트를 다루므로 **배포 창을 함께** 잡는다 |
| **되돌릴 수 있는가** | 새 키는 추가이므로 기존 동작을 바꾸지 않는다. `neture:*` 보유자의 기존 접근은 유지하고, 새 키 역할은 **부여될 때만** 효력이 생긴다 |

> 이 절이 지시받은 "충돌 지점과 이유를 CHECK 에 명시" 에 해당한다.

## 5. 분회 — 설계 (기존 구조에 얹는다)

```text
branch_creation_requests  id · requester_user_id · desired_slug · desired_hostname · name
                          · status(pending|approved|rejected|slug_conflict) · reviewed_by · reason
```

- 승인 주체: **`kpa-branch:operator`**(= `kpa.neture.co.kr` 운영자). 기존 super_admin 전용
  `POST /admin/branches` 는 **남긴다**(플랫폼 경로).
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

현재 `POST /auth/logout` = 현재 세션 종료 · `POST /auth/logout-all` = 전 세션 종료.
**`logout-all` 을 서비스 이동 흐름에 연결하지 않는다.** 화면 로그아웃은 `logout` 만 호출한다.
Google 계정 세션은 건드리지 않는다(`google.accounts.id.disableAutoSelect` 류 호출 금지).

## 8. 구현 순서

```text
S1  설계 문서 고정                                  ← 이 문서
S2  커뮤니티 도메인 (테이블 · 신청/승인 · membership · scope guard · 테스트)
S3  분회 개설 신청/승인 (+ 주소 2회 검사 · 첫 운영자)
S4  서비스 키 3개 추가 (supplier · funding · community) + 역할 + Admin 지정 대상
S5  Neture 배너 · 로그인 전 AI 입력창 노출 · handoff 대상 확장
S6  Store 전체 운영 권한 범위·진입 확정
S7  로그아웃 경로 점검
S8  CI → 원본 재확인(study 포함) → 통제 배포 → 결과표 → 사용자 지정 안내
```

**migration 원칙**: 새 테이블은 incremental migration + `manifest.ts` + `expected-schema-states.ts`
를 **같은 커밋**에 넣고, fingerprint 는 격리 PostgreSQL 15 에서 만든다(운영 복사 금지).
