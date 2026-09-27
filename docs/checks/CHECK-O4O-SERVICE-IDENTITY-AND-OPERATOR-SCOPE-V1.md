# CHECK-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1

> 시작: 2026-09-27 · 상태: **`IN_PROGRESS`** — 코드 일부 완료 · 운영 미적용
> WO: [`WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1`](../work-orders/WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1.md)
>
> **하나의 작업이다.** S2-1 · S2-2 는 내부 구현 순서일 뿐 보고 단위가 아니다.
> **운영 적용과 실제 접근 확인 전에는 DONE 으로 보고하지 않는다.**

---

## 1. 진행 상태

| # | 항목 | 상태 | 근거 |
|---|---|---|---|
| S1 | 설계 고정 | **완료** | WO §0~§10 |
| S1' | 권한 경계 보정 4건 | **완료** | WO §3-3-1 · §3-3-2 · §5 · §3-1 |
| S2 | 커뮤니티 도메인 | **완료(코드)** | 아래 §2 |
| S3 | 분회 개설 신청·승인 | **미착수** | — |
| S4 | 서비스 키 3개 + Admin 지정 대상 | **부분** — `kpa-branch:admin` · `community:admin` 추가 완료 / `supplier`·`funding` 키 미착수 | §3 |
| S5 | Neture 배너 · AI 입력창 · handoff 확장 | **미착수** | — |
| S6 | Store 전체 운영 범위·진입 | **미착수** | — |
| S7 | 로그아웃 경로 점검 | **미착수** | — |
| S8 | CI · 원본 재확인 · 통제 배포 · 결과표 | **미착수** | — |

## 2. 커뮤니티 도메인 — 구현 내용

### 2-1. 저장 (migration)

`1790400000000-CreateCommunityDomain` — 3테이블. migration + `manifest.ts` +
`expected-schema-states.ts` **같은 커밋**.

| 테이블 | 핵심 제약 |
|---|---|
| `communities` | `slug` 전역 UNIQUE(주소) · lower CHECK |
| `community_creation_requests` | `desired_slug` **pending 범위 부분 UNIQUE**(동시 선점 물리 차단) · `approved ↔ created_community_id` 상호 CHECK |
| `community_memberships` | `(community_id, user_id)` UNIQUE · `role(operator\|member)` · `status(pending\|active\|rejected\|withdrawn)` · `(community_id, role, status)` 인덱스 |

**fingerprint 산출**: 격리 PostgreSQL 15(docker `postgres:15` · 포트 55433 · throwaway DB)에서
baseline + incremental 1..6 을 **실제 적용**. 운영 DB 복사 아님.

```text
5793 -> 5854 (+61)
c7ada575b9db6d4e8cbf8a2e158f4754bb86e3afa4ca2333f4e86916f60148e3
재실행: PRE/POST_MIGRATION_SCHEMA_ASSERTION = PASS · MIGRATION_JOB = SUCCESS
테이블 3개 생성 확인 후 컨테이너 정리
```

### 2-2. 권한 경계

`middleware/community-scope.middleware.ts`

```text
resolveCommunity        :communitySlug 를 **행으로** 확인(404). URL 값을 그대로 신뢰하지 않는다
requireCommunityScope   ① 개체 일치 ② status='active' ③ (operator 요구 시) role='operator'
                        community:admin · platform:super_admin 을 여기서 bypass 시키지 않는다
```

세 조건이 모두 필요한 이유: **승인된 일반 회원도 같은 `community_id`** 를 갖는다.
ID 만 비교하면 회원이 가입 승인·중재를 통과한다.

### 2-3. lifecycle

`services/community/community-lifecycle.service.ts`

| 흐름 | 규칙 |
|---|---|
| 개설 신청 | slug **검사 1회차**. 이미 쓰는 주소면 409 로 즉시 알림 |
| 개설 승인 | slug **검사 2회차**. 선점됐으면 **임의 주소로 개설하지 않고** `slug_conflict` 로 신청자에게 재신청 요청 |
| 개설 승인 부여 | `community_memberships(role='operator', status='active')` + `service_memberships('community','active')` |
| 개설 승인 **미부여** | `community:admin` · `community:operator` — `role_assignments` write **0** |
| 가입 | **승인형 하나**. 자동 승인 없음. 다른 커뮤니티 `membershipId` 승인 시도는 404 |

## 3. Admin 지정 카탈로그 변경

| 역할 | 성격 |
|---|---|
| `kpa-branch:admin` **추가** | 분회 **서비스 전체** 관리자 — 개설 승인 주체. roles seed 에 이미 있었으나 카탈로그에 없어 화면에서 줄 수 없었다 |
| `community:admin` **추가** | 커뮤니티 **전체** 관리자 — 개설 신청 승인 |
| `community:operator` **만들지 않음** | 개별 커뮤니티 운영은 개체 역할로만 |

기존 11개 역할은 **그대로 둔다**(삭제·이름 변경 없음).

## 4. 검증 — 통과한 것

| # | 고정한 것 | 결과 |
|---|---|---|
| V1 | 승인된 일반 회원의 운영 기능 **403** | PASS |
| V2 | `pending` 회원의 게시글 수준 **403** | PASS |
| V3 | A 커뮤니티 운영자의 B 커뮤니티 요청 **403** | PASS |
| V4 | 가드가 서비스 전체 역할을 보지 않음(소스 고정) · 개설 승인 시 `role_assignments` write 0 | PASS |
| V5 | `kpa-branch:admin` 지정 가능 · `kpa-branch:operator` 와 분리 · seed 정의 확인 | PASS |
| V6 | `requireBranchScope` 의 `organization_id` 비교 · `BRANCH_SCOPE_MISMATCH` 유지 · operator 는 bypass 목록에 없음 | PASS |
| V8 | 첫 운영자에게 **서비스 가입**이 함께 생김(자기 커뮤니티 진입 막히지 않음) | PASS |
| V8-b | 그 첫 운영자에게 서비스 전체 역할 **미부여** | PASS |
| — | slug 정규화/거절 · 선점 시 미개설 · 중복 신청 409 · 가입 자동승인 없음 | PASS |

`tsc` api-server · admin-dashboard **0** · 변경 파일 eslint **0**.
관련 suite 회귀: **11 suite · 131 PASS**.

> **V7(폴백 커뮤니티도 동일 승인 검사)은 아직 PASS 가 아니다.** 게시글 경로를
> `requireCommunityScope` 에 연결하는 작업(S2 잔여)이 남아 있다.

## 5. 미확인 — 배포 판정에 필요한 것 (한곳)

| # | 미확인 | 왜 |
|---|---|---|
| U1 | 기존 커뮤니티 참여자 행 수(`forum` 이용자 중 새 승인 검사에 걸릴 대상) | **운영 DB read 채널 없음**(ADC 부재). **임의 일괄 승인하지 않는다** |
| U2 | `study.neture.co.kr` 승인 원본 저장 여부 | Console 조회 수단 없음(내 `checkOrigin` 호출은 403) |
| U3 | 새 원본 7개의 저장 반영 여부 | 〃 — 배포 직전 재확인 필요 |
| U4 | 함께 배포될 다른 트랙(Store·URL 재구성) 준비 상태 | API 41파일이 함께 나간다 |

**미확인을 0 으로 간주하지 않는다. 운영 적용을 PASS 로 쓰지 않는다.**

## 6. 남은 구현 (같은 작업)

S2 잔여(게시글 경로 연결 · 라우트 노출) → S3 분회 개설 신청·승인 → S4 `supplier`·`funding` 키 →
S5 배너·handoff → S6 Store 범위 → S7 로그아웃 → S8 CI·배포·결과표.
