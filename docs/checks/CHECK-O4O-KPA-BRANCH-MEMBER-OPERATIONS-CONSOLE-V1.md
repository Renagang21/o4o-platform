# CHECK — 회원 업무 콘솔 (W7)

- **WO**: `WO-O4O-KPA-BRANCH-MEMBER-OPERATIONS-CONSOLE-V1`
- **일자**: 2026-09-08
- **판정**: **CLOSED** — 재사용 조사 + 구현 + 프로덕션 E2E 20항목 실측 · fixture 전량 원복
- **선행**: [W1](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1.md) · [W2](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1.md) · [W3](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-MEMBERSHIP-SYNC-V1.md) · [W4](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-REVIEW-V1.md) · [W5](CHECK-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1.md) · [W6](CHECK-O4O-KPA-BRANCH-CONTINUING-EDUCATION-CREDIT-LEDGER-V1.md)
- **commit**: `f8ad76a5e` (service + controller + route + 운영자 UI) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 (`https://api.neture.co.kr` · DB `o4o_platform` · `kpa-branch-web`)
- **migration 없음** — 신규 원장을 만들지 않았다 (WO §5).

---

## 0. 결과 요약

WO §10 필수 13항목 + 추가 7항목.

| # | E2E 항목 | 결과 |
|:--:|---|:---:|
| A | **기존 8필드 계약 불변** (배포 전/후 응답 대조) | ✅ 값·타입 전건 동일 · 필드 9개만 추가 |
| 1 | 목록 1회 호출로 3회원 상태 정확 | ✅ A/B/C 조합 그대로 |
| 2 | 원장 없는 회원도 목록 존재 | ✅ C 가 `not_submitted`/`not_assessed`/`not_recorded` 로 노출 |
| 3 | year 변경 시 세 축 동시 변경 | ✅ `year=2025` → 4명 전원 세 축 모두 '없음' |
| 3b | year 복귀 | ✅ `year=2026` → 원래 상태 복원 |
| 4 | 상세 1회 호출로 4영역 정확 | ✅ A/B/C 각각 |
| 5 | 신상신고 status/제출·승인·sync 정확 | ✅ A `approved`+synced · B `submitted` · C 없음 |
| 6 | 회비 상태 정확 | ✅ A `paid` 300,000/300,000 · B `partial` 150,000/50,000 (미수 100,000) |
| 7 | 교육 평점/status 정확 | ✅ A `complete` 8/8 · B `incomplete` 8/3 (잔여 5) |
| 8 | 타 분회 회원 접근 차단 | ✅ 타 분회 userId → 404 `MEMBER_NOT_FOUND` · 타 분회 경로 → 403 `BRANCH_SCOPE_MISMATCH` |
| 9 | member 가 operator API 호출 | ✅ 목록·상세 양쪽 403 |
| 10 | query count / N+1 부재 | ✅ 회원 4명 · **SQL statement 1회** (회원당 0.25) — §3 |
| 11 | 브라우저 목록/상세 smoke | ✅ 6/6 (목록 API 1회 · 상세 API 1회 실측) — §7 |
| 12 | 기존 신고/회비/교육 전문화면 회귀 0 | ✅ 4개 API 200 · 값이 콘솔과 일치 |
| 13 | fixture 원복 | ✅ 전량 0 복귀 · 403 `MEMBERSHIP_NOT_FOUND` |

추가 실측: 미인증 401 · `year=abcd` 422 `YEAR_INVALID` · attention 필터 2종 ·
성명 검색 · EXPLAIN 단일 플랜.

---

## 1. 재사용 조사 (WO §9)

| 대상 | 실측 | 판정 |
|---|---|---|
| kpa-branch 회원 목록 UI | **없음** | 재사용할 화면이 없어 신규 페이지 1개를 만들었다. 새 회원관리 프레임워크는 만들지 않았다 |
| `GET .../operator/members` (기존) | **존재**. `branch_memberships` 원형 반환 | 아래 §2 — superset 으로 확장 |
| 기존 전문화면 3종 | 신상신고 검수 · 회비 관리 · 연수교육 | **그대로 유지**. 콘솔은 진입점이고 처리는 전문화면에서 한다 |

**기존 엔드포인트 소비처 조사 (3축)** — 식별자 검색만으로 판단하지 않았다:

| 축 | 결과 |
|---|---|
| `check-literal-consumers` (routes 파일) | 살아있는 소비처 0 — 3건 전부 `HISTORICAL_DOC` |
| `check-literal-consumers` (controller 파일) | `DEAD_REFERENCE` — 0건 |
| `services/web-kpa-branch` 프런트 | 호출 없음 |
| `apps/api-server` 테스트 | 0건 |

> `/operator/members` 로 검색되는 pharmacy-hub·admin 코드는 **경로 prefix 가 다른 별개 API**
> (`/pharmacy-hub/operator/...`, 플랫폼 운영자 사용자관리)라 이 라우트와 무관하다.

## 2. 기존 API 계약 변경 — superset 확장

WO §1 이 지정한 경로가 이미 있었다. 살아있는 소비처가 0건이어도 **파괴적 변경으로 만들지 않았다.**

```text
기존 8필드  id · userId · organizationId · status · joinedAt · leftAt · transferReason · note   (유지)
추가 9필드  name · email · licenseNumber · activityType · feeCategory · report · fee · education · attention
```

**배포 전/후 응답을 실측 대조**했다 (E2E A). 배포 직전 구버전 응답을 캡처해 두고,
배포 후 같은 요청으로 받은 응답과 회원 id 기준 1:1 비교했다.

| 검사 | 결과 |
|---|---|
| 회원 id 집합 동일 | ✅ 4/4 |
| 기존 8필드 **존재** | ✅ 누락 0 |
| 기존 8필드 **값 동일** | ✅ 변경 0 |
| 기존 8필드 **타입 동일** | ✅ 변경 0 |
| `total` 동일 | ✅ 4 → 4 |
| 추가 필드 | 9개 (위 목록) |

향후 숨은 소비처가 있더라도 기존 계약으로 읽는 코드는 그대로 동작한다.

## 3. query 구조 / query count (WO §2)

### 목록 = DB 쿼리 1회

```text
branch_memberships                              (분회 소속 = 기준 축)
  JOIN      users                               (성명·이메일)
  LEFT JOIN kpa_members                         (면허번호·직역·회비구분)
  LEFT JOIN annual_reports                (org, user, year)
  LEFT JOIN branch_fee_ledgers            (org, user, year)
  LEFT JOIN branch_education_credit_ledgers (org, user, year)
```

세 원장 조인이 전부 `(organization_id, user_id, year)` 이라 **같은 연도로만 합쳐진다** (WO §8).

**팬아웃이 없는 근거** — 조인 조건상 회원당 최대 1행:

| 테이블 | 제약 |
|---|---|
| `annual_reports` | UNIQUE(user_id, year) |
| `branch_fee_ledgers` | UNIQUE(organization_id, user_id, year) |
| `branch_education_credit_ledgers` | UNIQUE(organization_id, user_id, year) |
| `kpa_members` | user_id 당 1행 |
| `branch_memberships` | active 는 회원당 최대 1행(부분 UNIQUE) |

> `status=all` 은 전입·전출 이력이라 회원이 여러 번 나올 수 있다. 콘솔 기본값이 `active` 인
> 이유이며, 이는 기존 엔드포인트의 의미를 그대로 물려받은 것이다.

### 실측

**앱 계층 계측** — `pg` client.query 를 래핑해 호출 횟수를 세고, 서비스가 만드는 것과
**같은 SQL** 을 프로덕션 DB(Auth Proxy loopback)에 실행했다.

```json
{ "members_returned": 4, "sql_statements": 1, "per_member_statements": 0.25 }
```

**EXPLAIN (ANALYZE)** — 단일 플랜 트리, 결과 4행. `Nested Loop Left Join` 의 `loops=4` 는
같은 statement 안의 inner rescan 이며 **별도 SQL 왕복이 아니다.** 회비·연수교육 조인은
`UQ_branch_fee_ledgers_org_user_year` / `UQ_branch_edu_credits_org_user_year` 인덱스를 탄다.

> 플래너가 `kpa_members`·`annual_reports` 에 Seq Scan 을 고른 것은 **현재 두 테이블이
> 각각 7행·2행이기 때문**이다(작은 테이블에서는 인덱스보다 싸다). 규모가 커지면 플랜이
> 바뀌며, 이 실측은 "플랜 모양이 최적"이라는 뜻이 아니라 **statement 가 1개**라는 뜻이다.

### 측정하지 못한 것 (숨기지 않는다)

- **`pg_stat_statements` 는 이 DB 에 설치돼 있지 않다** (`pg_available_extensions` 에는 있고
  `track=top` 으로 라이브러리는 로드됨). `CREATE EXTENSION` 은 프로덕션 DDL 이라 이 WO 범위 밖이다.
- **서버 query 로깅이 없다** — `connection.ts` 의 TypeORM 설정이 `logging: ['error']` 다.
  프로덕션 설정 변경도 범위 밖이라 하지 않았다.
- 따라서 위 계측은 **엔드포인트 프로세스 내부가 아니라 동일 SQL 의 재현 실행**이다.
  이를 보완하는 사실 두 가지: (a) `BranchMemberConsoleService.list()` 의 DB 접근은
  `AppDataSource.query` **단 1회**이고 루프가 없다, (b) 전 구간 raw SQL 이라 TypeORM
  relation lazy-load 가 원천적으로 없다. 브라우저 실측(§7)에서 **HTTP 요청도 1회**임을 확인했다.
- `pg_stat_user_tables` 델타는 **쓰지 않았다** — 동시 트래픽 노이즈가 섞여 오히려 부정확하다.

### 상세 = 1 + 2회

회원 1명 기준 같은 조인 1회 + 신고 "주요 변경사항" 계산용 2회(양식 · 회원 원장).
**회원 수와 무관한 상수**이며, W3/W4 와 **같은 판정 함수**(`diffAgainstLedger`)를 쓰려고
감수한 비용이다 — 검수화면과 콘솔이 다른 답을 내면 안 된다.

## 4. 상태 정규화 (WO §6)

원장이 없을 때 `null` 을 그대로 내보내지 않는다. 화면이 null 을 해석하게 두면 축마다
다르게 해석된다. 서버가 명시적 상태로 바꾼다.

| 축 | 원장 없음 | 있음 |
|---|---|---|
| 신상신고 | `not_submitted` | draft / submitted / revision_requested / approved |
| 회비 | `not_assessed` | unpaid / partial / paid / exempt |
| 연수교육 | `not_recorded` | incomplete / complete / exempt |

**LEFT JOIN 인 것이 계약이다** — 실측 2: 세 원장이 전부 없는 회원 C 가 목록에 정상 노출됐다.

### 주의상태 (attention)

통계가 아니라 **행동이 필요한 항목**만 8종. 목록·상세가 같은 함수로 만든다.

`REPORT_REVIEW_PENDING` / `REPORT_REVISION_OPEN` / `REPORT_SYNC_PENDING` / `REPORT_MISSING` /
`FEE_OUTSTANDING` / `FEE_NOT_ASSESSED` / `EDUCATION_INCOMPLETE` / `EDUCATION_NOT_RECORDED`

**필터를 SQL 로 옮기지 않았다.** 8종이 3개 축의 조합으로 만들어지므로 SQL 조건으로 복제하면
코드와 SQL 두 곳에 같은 규칙이 생겨 반드시 어긋난다. 조회 후 애플리케이션에서 건다 —
분회 회원 수(수백)에서 충분하다. 실측: `FEE_OUTSTANDING` 1명 · `REPORT_MISSING` 2명으로
**전체 모집단 기준** 정확했다.

## 5. API

기존 operator 가드 2겹(`requireKpaBranchScope` + `resolveBranch` + `requireBranchScope`)을
그대로 재사용했다. 콘솔 전용 가드를 만들지 않았다.

| Method | Path | 비고 |
|---|---|---|
| GET | `/branches/:slug/operator/members?year=&status=&attention=&q=` | 목록 (쿼리 1회) |
| GET | `/branches/:slug/operator/members/:userId?year=` | 상세 4영역 |

- body/query 의 `organizationId`·`userId` 를 신뢰하지 않는다. tenant 는 `:branchSlug` 로만 정해진다.
- 상세는 `(organizationId, userId)` 복합 조회다 — **UUID 단독 조회 없음.**
  다른 분회 userId 를 넣으면 소속 행이 없어 404 이고 **존재 여부를 알려주지 않는다** (실측 8).
- 검색은 성명·면허번호 부분일치 하나뿐이다 (WO §1 — 과도한 CRM 검색 금지).

## 6. 화면

`/{slug}/operator/members` — 운영자 네비게이션의 **첫 항목**(진입점)으로 배치했다.

- 목록: 성명 · 면허번호 · 신상신고 · 회비 · 연수교육 · 주의 · 상세 (WO §4 그대로)
- 상세: 4영역 카드(기본·소속 / 신상신고 / 회비 / 연수교육) + 각 전문화면 링크
- **각 원장의 편집 UI 를 다시 만들지 않았다** (WO §4·§9). 콘솔에서 값을 고칠 수 없다.
- 상태 배지는 서버가 준 값을 그대로 쓴다. 화면이 다시 계산하지 않는다.

## 7. 브라우저 smoke (E2E 11)

`https://kpa-society.co.kr/kpa/namgu/operator/members` · Playwright · 운영자 로그인.

| 검사 | 결과 |
|---|---|
| 로그인 | ✅ |
| 목록 렌더 | ✅ 표 4행 |
| 배지 3축 표시 | ✅ "승인" · "부분납부" · "미부과" 동시 확인 |
| **목록 API 호출 1회** | ✅ kpa-branch 호출 3건 중 `members` 1건 (회원별 추가호출 없음) |
| 상세 4영역 표시 | ✅ 신상신고 / 회비 / 연수교육 섹션 |
| **상세 API 호출 1회** | ✅ 1건 |

### 발견 — W7 회귀 아님 (범위 밖, 수정하지 않음)

콘솔 오류 1건: `404 GET /api/v1/kpa-branch/branches/namgu/site`.

**기존 3개 운영자 화면에서도 동일하게 재현**된다:

```text
operator/fees            → 404 /branches/namgu/site
operator/education       → 404 /branches/namgu/site
operator/annual-reports  → 404 /branches/namgu/site
operator/members         → 404 /branches/namgu/site   (본 WO 화면)
```

원인은 `BranchLayout` 이 `canOperate` 확정 전 첫 렌더에서 **공개** site 를 조회하고,
namgu 분회 홈이 미게시라 404 가 나는 기존 동작이다. 화면은 이 상태를 정상 처리한다
(운영자 영역에서는 곧 운영자 조회로 대체). **W7 이 만든 문제가 아니고 WO 범위 밖**이라
고치지 않고 보고한다 → 별도 WO 후보 (§10).

## 8. fixture · 원복

상태 조합이 다른 회원 3명 + 운영자 1명. `kpa_members` 는 건드리지 않았다.

| 회원 | 신상신고 | 회비 | 연수교육 | attention |
|---|---|---|---|---|
| A `renagang21` | approved + synced | paid 300,000/300,000 | complete 8/8 | **없음** |
| B `o4o-e2e-auth-main` | submitted | partial 150,000/50,000 | incomplete 8/3 | 3종 |
| C `handoff-v2…@example.test` | 없음 | 없음 | 없음 | 3종(모두 '없음') |
| operator `sohae2100` | 없음 | 없음 | 없음 | 3종(모두 '없음') |

| 대상 | before | 부여 | after (원복) |
|---|:--:|:--:|:--:|
| `service_memberships` (kpa-branch) | 0 | 1 | **0** |
| `role_assignments` (`kpa-branch:*`) | 0 | 1 | **0** |
| `branch_memberships` | 0 | 4 | **0** |
| `annual_reports` | 0 | 2 | **0** |
| `branch_fee_ledgers` | 0 | 2 | **0** |
| `branch_education_credit_ledgers` | 0 | 2 | **0** |
| `kpa_members.fee_category` | 전건 NULL | **미변경** | 전건 NULL |
| `kpa_members` / `users` 총 행수 | 7 / 57 | **미변경** | **7 / 57** |
| `lms_courses` / `lms_enrollments` | 11 / 11 | **미변경** | **11 / 11** |

- 대상은 namgu 분회 + 검증 4계정으로 한정했다. 타 분회 227개 · 타 서비스 데이터는 건드리지 않았다.
- 로그인은 L1(플랫폼 자격)로 했다 — `service_credentials` 를 만들지 않았다.
- 원복 확인: 운영자 목록 재호출 → `403 MEMBERSHIP_NOT_FOUND`.

### 제약 기록

1. **회원 A/B/C 의 신고 상태는 SQL 로 만들었다.** 2026 신고기간(2026-01-01~02-28)이 닫혀 있어
   제품 API 로 제출을 만들 수 없다 (W3·W4·W6 와 같은 제약). 콘솔은 **읽기 전용**이라
   이 제약이 콘솔 자체의 검증을 약화시키지 않는다.
2. **검증 계정 4개 중 2개는 실사용 계정**(`sohae2100`·`renagang21`)이다. 프로덕션에 전용
   테스트 계정이 없어 SSOT(`docs/local/TEST-ACCOUNTS.local.md`) 등재 계정을 썼다.
3. **query count 는 엔드포인트 프로세스 내부가 아니라 동일 SQL 재현으로 측정했다** (§3 참조).
4. 목록의 `total` 은 페이지 내 건수다. attention 필터가 애플리케이션 계층이라 전체 건수와
   다를 수 있다 — V1 은 페이지네이션 UI 를 두지 않았고 limit 기본 100 이다.

## 9. 범위 밖 (건드리지 않음)

회원정보 대량 편집 · CRM · 상담이력 · 메시지 발송 · 신규 원장 · 통계 대시보드 ·
CSV export/import · 전국 단위 회원 검색 · 콘솔에서의 원장 편집 · 페이지네이션 UI ·
`BranchLayout` 의 site 404 (§7).

## 10. 별도 WO 후보

| # | 내용 | 근거 |
|---|---|---|
| 1 | `BranchLayout` 이 운영자 영역 첫 렌더에서 공개 site 를 조회해 미게시 분회에서 404 | §7 — 기존 4개 화면 공통, W7 범위 밖 |
| 2 | 회비 원장 보강 (`fee.exemptionType` 면제 사유 구분) | W6 CHECK 에서 이월 |

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§10)
