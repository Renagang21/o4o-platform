# IR — 분회 조직·회의 최소 모델 판정

- **IR**: `IR-O4O-KPA-BRANCH-ORGANIZATION-AND-MEETING-MINIMAL-MODEL-V1`
- **일자**: 2026-09-09
- **성격**: **조사 전용** — 코드 수정 0 · DB write 0 · migration 0
- **선행**: [W10 행사](../checks/CHECK-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1.md) · 공지는 기존 `branch_posts`
- **후속**: `WO-O4O-KPA-BRANCH-OFFICER-ROSTER-V1` (W11-A) · W11-B 회의 category
- **환경**: 프로덕션 read-only (`o4o_platform`)

---

## 0. 판정 요약

| 축 | 판정 | 결론 |
|---|:---:|---|
| **조직** | **`STRUCTURED_REQUIRED`** | `branch_officers` 1테이블 신규. 재사용 가능한 원장이 없다 |
| **회의** | **`EVENT_PLUS_POST`** | 일정 = `branch_events`(W10) · 회의록/자료 = `branch_posts` category 확장 |

**신규 테이블은 `branch_officers` 하나뿐이다.** 회의는 새 테이블을 만들지 않는다.

---

## 1. 선행 오류 정정

조사 착수 전 구두로 *"`branch_posts.category` 는 varchar 기본값이라 migration 없이
카테고리를 추가할 수 있다"* 고 말했으나 **사실이 아니다.** 프로덕션 실측:

```sql
CHK_branch_posts_category ::
  CHECK ((category)::text = ANY ((ARRAY['notice','resource'])::text[]))
```

CHECK 제약이 실재하므로 **category 추가는 migration 이 필요하다.**
WO 의 "migration 없이 먼저 재사용한다" 전제는 이 축에서 성립하지 않는다.
(W11-B 가 작은 migration 1건을 갖는 이유다.)

---

## 2. 조직 census

### 2-1. 재사용 후보 전수

| 후보 | 실측 | 판정 |
|---|---|---|
| `organization_members.metadata.position` | 총 22행 · **position 채워진 행 0** · **`kpa_organizations` 참조 0** | 미사용 + **축이 다름**(OrganizationStore 소속) |
| `organization_members.role` | `admin` / `manager` / `member` / `moderator` | **접근권한**이지 직책이 아니다 |
| `packages/organization-core` | **Frozen Core** (CLAUDE.md §3) | 구조·테이블 변경 금지 |
| `kpa_organizations` | `name` · `type` · `slug` · `parent_id` · `description` · `address` · `phone` · `is_active` · `storefront_config` | 임원 정보 없음 |
| `branch_sites` | `contact{phone,email,address,hours,fax}` · `template` · `is_published` | 임원 필드 없음 |
| `branch_memberships` | `user_id` · `organization_id` · `status` · `joined_at` · `left_at` | **소속**이지 직책이 아니다 |
| officer / committee / board / executive 테이블 | 프로덕션 **없음** | — |
| `web-kpa-branch` 조직·임원 화면 | **없음** (공개 메뉴 = 홈·공지·자료실) | — |

### 2-2. 선행 판단 — 직책은 RBAC 이 아니다

`20270305000000-SeedKpaBranchServiceAndRoles` 가 이미 명시하고 있다:

> 조직 직책(회장·부회장·위원장 등)은 이번 WO 에서 **RBAC 역할로 만들지 않는다.**

역할은 `kpa-branch:admin` / `operator` / `member` 3종뿐이며 분회 식별자도 role 에 넣지
않는다(4축 분리). 따라서 **직책은 RBAC 축에도, 기존 원장에도 없다.**

### 2-3. 판정 근거 — 왜 게시글로 부족한가

`branch_posts` 로 임원 소개를 쓰면 다음이 전부 불가능하다.

```text
표시순서 정렬        회장 → 부회장 → 이사  (본문 문자열로는 정렬 불가)
현직 판별            임기 종료자를 자동으로 내릴 수 없다
이력 조회            "2024년 임원이 누구였나" 를 답할 수 없다
W7 콘솔 연동         회원 상세에 "현재 이사" 를 표시할 근거가 없다
```

임기(시작·종료)·직책·표시순서는 **구조화하지 않으면 기능이 성립하지 않는다.**
반대로 인사말·조직 소개문 같은 서술형은 게시글로 충분하며 이번 모델에 넣지 않는다.

---

## 3. 회의 census

| 요소 | 재사용 대상 | 근거 |
|---|---|---|
| 회의 일시·장소·안내 | **`branch_events`** (W10) | 이미 있다. 중복 schedule 모델을 만들지 않는다 |
| 참석자 | **`branch_event_rsvps`** (W10) | 참가/불참 응답이 이미 있다 |
| 회의록 본문 | **`branch_posts`** (category 확장) | `title` · `content` · `status` · `published_at` · `view_count` |
| 회의자료 | **`branch_posts.attachments`** (jsonb) | 첨부 배열이 이미 있다 |
| 의결 · 전자결재 · 화상회의 | **불필요** | WO 원칙상 범위 밖 |

프로덕션에 meeting / minutes 계열 테이블은 **없다**.

### 별도 `meeting` 테이블이 필요해지는 최소 조건

**"회의 ↔ 회의록을 시스템이 연결해야 할 때"** 하나뿐이다. 지금은 회의록 게시글 본문에
행사 링크를 넣는 것으로 충분하다. 연결 자체를 원장화해야 하면 그때
`branch_posts` 에 nullable `event_id` 를 더하는 편이 새 테이블보다 가볍다.
**이번에는 만들지 않는다.**

---

## 4. 확정된 최소 모델

```text
조직
└─ branch_officers (신규 1테이블)
   organization_id · user_id(nullable) · name · position · group(nullable)
   term_start · term_end(nullable) · display_order · status · visibility

회의
├─ branch_events                    일정 · 장소 · RSVP        (기존, 무변경)
└─ branch_posts(category='meeting') 회의록 본문 · 첨부=회의자료 (CHECK 확장 1건)
```

### 4-1. 확정된 설계 판단 (2026-09-09)

| 항목 | 결정 | 근거 |
|---|---|---|
| 공개 범위 | `public` / `members_only`, **기본 `public`** | 공개 홈페이지의 임원 소개는 자연스럽다. 이 모델에 **연락처·주소를 넣지 않으므로** 개인정보 노출이 성명·직책에 그친다. 위원회·TF 처럼 내부 성격이면 개별 전환 |
| 연락처 필드 | **넣지 않는다** | 위 공개 기본값의 전제다 |
| `user_id` | **nullable 유지** | 고문·자문 등 외부 인사는 회원 계정이 없다. `name` 은 **항상 저장**하고 `user_id` 는 선택 연결축이다 |
| W7 콘솔 표시 | `user_id` 연결된 현직만 | 연결되지 않은 외부 인사는 회원 상세에 표시할 대상이 아니다 |
| 회의 category | **`meeting` 하나** | 본문=회의록 · 첨부=회의자료. 자료 유형 분리는 실제 필요가 확인될 때 |

---

## 5. W11 구현 분할

**분할한다.** 두 작업의 성격과 검증 무게가 다르다.

| WO | 범위 | migration | 검증 무게 |
|---|---|:---:|---|
| **W11-A** `WO-O4O-KPA-BRANCH-OFFICER-ROSTER-V1` | `branch_officers` + 운영자 CRUD + 공개 명부 + W7 연동 | 신규 테이블 1 | 신규 원장이므로 E2E 필요 |
| **W11-B** 회의 | `branch_posts.category` CHECK 에 `'meeting'` 추가 | CHECK 교체 1 | 기존 화면 재사용 → 회귀 확인이 주 작업 |

한 WO 로 묶으면 B 가 A 의 검증 무게에 끌려간다.

---

## 6. 범위 밖 (이 IR 이 만들지 않기로 한 것)

임원 조직도 편집기 · 직책별 권한 · 결재 · 의결 시스템 · 연락처 관리 ·
위원회별 별도 테이블 · 회의 전용 schedule 모델 · cross-service 공통화
(분회 서비스는 공통화 대상이 아니다) · 과거 mock/legacy 복원.

---

## 7. 미해결 · 후속 판단 대상

1. **재임 시 과거행 보존 방식** — W11-A 구현 시 확정한다. `branch_memberships` 의
   append-only 선례(전출 = 행 마감, 전입 = 새 행)를 따르는 것이 일관적이다.
2. **`status` 를 DB 파생으로 만들 수 있는가** — `term_end` 와 오늘 날짜 비교가 필요한데
   `now()` 는 IMMUTABLE 이 아니라 generated column·CHECK 에 쓸 수 없다(W6 연수교육과 다른 점).
   저장 + CHECK 로 가되 조회에서 날짜도 함께 거는 방식이 유력하다.
3. **W11-B 의 기존 게시글 화면 재사용 범위** — 카테고리 필터 UI 만 늘릴지, 회의 전용
   목록을 별도 라우트로 둘지. W11-A 종료 후 판정한다.

---

## 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건

**발견 1건 (범위 밖 · 미수정)** — `apps/api-server/src/copilot/insight-rules.ts:38` 타입 오류.
`83853d8d3 GlycoPharm 서비스 완전 삭제` 가 데이터에서 `glycopharm` 을 제거했으나
`AIServiceId` 타입에 남겨두어 `Record<AIServiceId, …>` 불만족. W9·W10 CHECK 에 이어
여전히 남아 있다. 이번 조사와 무관하며 별도 WO 대상이다.
