# CHECK — 분회 행사 · 참가 응답 (W10)

- **WO**: `WO-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1`
- **일자**: 2026-09-09
- **판정**: **CLOSED** — 조사 + migration + 구현 + 프로덕션 E2E 32항목 실측 · fixture 전량 원복
- **선행**: [W9 회비 면제사유](CHECK-O4O-KPA-BRANCH-FEE-EXEMPTION-REASON-LEDGER-V1.md) · 공지는 기존 `branch_posts` 재사용
- **후속**: W11 조직/회의 (조사 우선)
- **commit**: `5e6a15bb4` (migration + entity ×2 + service + controller + route + 운영자/회원 UI) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 (`https://api.neture.co.kr` · DB `o4o_platform` · `kpa-branch-web`)

---

## 0. 결과 요약

WO §9 필수 13항목 + 추가 19항목.

| # | E2E 항목 | 결과 |
|:--:|---|:---:|
| 1 | 운영자 행사 생성 | ✅ 201 · `draft` · 기본 `members_only` |
| 2 | draft 는 회원에게 미노출 | ✅ 회원 목록 0건 · draft RSVP 시도 404 |
| 2b | draft 는 공개 목록에도 없음 | ✅ 0건 |
| 3 | publish 후 회원 조회 | ✅ 1건 · `rsvpOpen=true` |
| 3b | `members_only` 는 공개 목록에 안 나옴 | ✅ 0건 |
| 4 | 참가신청 | ✅ `attending` · 참가 1 |
| 5 | 중복 신청 방지 | ✅ 재전송해도 행 1개 유지 |
| 6 | 참가 → 불참 변경 | ✅ 참가 0 / 불참 1 |
| 6b | 정의되지 않은 응답값(`maybe`) | ✅ 422 |
| 6c | 다시 참가 + 메모 | ✅ **4회 변경 후에도 DB 행 1개** |
| 7 | 운영자 참가명단 | ✅ total 1 · 회원·응답·메모 표시 |
| 8 | 마감 후 신청 차단 | ✅ 409 `RSVP_CLOSED` · `rsvpOpen=false` |
| 9 | cancelled 상태 처리 | ✅ 409 `RSVP_NOT_OPEN` |
| 9b | 취소 행사도 회원 목록에 노출 | ✅ 취소 사실을 알 수 있다 |
| 10 | 타 분회 접근/신청 차단 | ✅ 운영자 목록·상세·명단·회원 신청 전부 403 · 공개 상세 404 |
| 10b | 회원이 운영자 API | ✅ 목록·생성·명단 전부 403 |
| 10c | 미인증 | ✅ 401 |
| 10d | 미소속 `eventId` | ✅ 404 |
| 11 | 공개범위 정책 | ✅ `public` 전환 → 공개 목록 노출 · 되돌리면 사라짐 |
| 11b | 공개 응답에 본인 응답 미유출 | ✅ `myRsvp=null` |
| — | 입력 검증 3종 (공백 제목 · 시작일시 누락 · 종료<시작) | ✅ 전건 422 |
| — | DB CHECK 제약 6종 + UNIQUE (앱 우회) | ✅ 전건 거부 |
| — | FK ON DELETE CASCADE | ✅ 행사 삭제 시 응답 0 |
| 12 | 기존 화면 회귀 0 | ✅ 운영자 7 + 회원 4 경로 전부 200 · `branch_posts` 0행 유지 |
| — | 브라우저 smoke | ✅ 운영자 3 + 회원 3 · 4xx 없음 (§7) |
| 13 | fixture 원복 | ✅ 전량 0 복귀 · 403 `MEMBERSHIP_NOT_FOUND` |

---

## 1. 재사용 조사 (WO §1)

**재사용 가능한 행사 구조가 없다.** 구현 전에 프로덕션에서 실측했다.

| 후보 | 실측 | 판정 |
|---|---|---|
| `lms_events` | `courseId!` **필수**(강좌 결합) · RSVP 는 `currentAttendees` **카운터뿐** · 0행 | 강좌 없는 총회·친목행사를 담을 수 없고 회원별 응답이 없다 |
| `lms_attendance` | 0행 · LMS 출결 | 축이 다름 |
| `partner_events` | 파트너 커미션 조건 · **테이블이 프로덕션에 없다**(엔티티만 존재) | 무관 |
| `o4o_event_logs` · `*_qr_scan_events` | 텔레메트리·감사 로그 | 무관 |
| `signage_schedules` · `payment_event_logs` | 사이니지 편성 · 결제 감사 | 무관 |
| event-offer 공통 도메인 | 공급자 B2B 오퍼 | 무관 |
| **회원별 RSVP 개념** | 저장소 전체에 **없음** (LMS 의 숫자 카운터가 전부) | 신규 필요 |
| `web-kpa-branch` 행사·캘린더 화면 | **없음** | — |
| `branch_events` | **테이블 부재** · `branch_posts` 0행 | 신규가 중복 아님 |

dead/mock 구조를 복원하지 않았다. LMS 는 읽지도 쓰지도 않는다.

## 2. 데이터 모델

migration `20270329000000-CreateBranchEvents` (프로덕션 적용 확인).

### `branch_events`

| 컬럼 | 비고 |
|---|---|
| `organization_id` · `title` · `starts_at` | 필수. **제목과 시작시각만 있으면 만들 수 있다** |
| `description` · `ends_at` · `location` · `external_url` | 선택 |
| `rsvp_enabled` · `rsvp_deadline` | 마감일은 `rsvp_enabled` 일 때만 존재 가능 |
| `visibility` | `public` / `members_only` (기본) |
| `status` | `draft` / `published` / `cancelled` |
| `created_by` | |

**행사 종류(type) 컬럼을 두지 않았다.** 총회·세미나·교육·친목이 전부 같은 한 행이다.
분류가 필요하다는 근거가 아직 없고, 지금 넣으면 화면마다 종류 분기가 생긴다.
필요해지면 varchar 하나를 더하면 된다.

### `branch_event_rsvps`

`event_id` · `user_id` · `status`(`attending`/`not_attending`) · `memo` · `responded_at`
· **UNIQUE(event_id, user_id)**

**`maybe` 를 만들지 않았다** (WO §2): 준비 인원을 세는 데 "미정"은 참가로도 불참으로도
셀 수 없어 명단을 흐린다. 응답 이력 테이블도 만들지 않았다 — "참가 → 불참"은 사실의
정정이지 이력이 아니다 (W5 납부이력 · W6 평점내역과 같은 판단).
실측 6c: 응답을 4번 바꿔도 DB 행은 1개였다.

### DB 가 강제하는 것 (앱 우회 UPDATE 전건 거부 실측)

```text
CHK_branch_events_status          draft / published / cancelled
CHK_branch_events_visibility      public / members_only
CHK_branch_events_title           공백만인 제목 금지
CHK_branch_events_period          ends_at >= starts_at
CHK_branch_events_rsvp_deadline   마감일은 rsvp_enabled 일 때만
CHK_branch_event_rsvps_status     attending / not_attending
UQ_branch_event_rsvps_event_user  중복 신청 방지가 DB 계약
FK ... ON DELETE CASCADE          고아 응답이 명단 집계를 틀지 않게 (실측: 삭제 후 0)
```

`rsvp_deadline` 제약을 둔 이유: 신청을 받지 않는 행사에 마감일만 남으면 화면이
"마감 지남"을 잘못 말한다.

## 3. 운영자 UI / API

| Method | Path | 비고 |
|---|---|---|
| GET | `/branches/:slug/operator/events?status=` | draft 포함 |
| POST | `/branches/:slug/operator/events` | 생성 (기본 draft · members_only) |
| GET | `/branches/:slug/operator/events/:eventId` | |
| PATCH | `/branches/:slug/operator/events/:eventId` | 수정 · **게시 · 취소** |
| GET | `/branches/:slug/operator/events/:eventId/rsvps` | 참가 명단 |

- **게시·취소 전용 endpoint 를 만들지 않았다** — 상태도 행사의 한 속성이다.
- **삭제 경로가 없다** — 취소는 상태이지 삭제가 아니고, 참가 응답이 딸려 있다.
- 화면 `/{slug}/operator/events`: 목록 + 생성/수정 폼 + 참가명단. 행사 템플릿을 만들지 않았다.

## 4. 회원 RSVP

| Method | Path |
|---|---|
| GET | `/branches/:slug/me/events` — 게시·취소 행사 + 내 응답 |
| POST | `/branches/:slug/me/events/:eventId/rsvp` |

- 기존 응답이 있으면 **갱신**된다 (`ON CONFLICT DO UPDATE`). 중복 신청이 아니라 정정이다.
- 응답 주체는 언제나 로그인 본인이다 — **대리 응답 경로가 없다.**
- 응답 가능 여부는 서버 `isRsvpOpen` **한 함수**가 판정하고 목록·상세·쓰기가 같은 값을 쓴다.
  화면이 따로 계산하면 "버튼은 열려 있는데 저장은 409" 가 된다.
- 화면 `/{slug}/mypage/events`: 참가/불참 토글. 취소 행사는 버튼 대신 안내문구.

## 5. 공지와의 경계 (WO §6)

**행사를 `branch_posts` 에 이중 생성하지 않는다.** event 가 자체 `title`/`description` 을
갖고, 공지에서 행사 상세로 링크만 걸 수 있게 둔다. 자동 게시글 생성 로직이 없다.

실측 12: E2E 전 구간에서 `branch_posts` 는 **0행을 유지**했다 — 행사를 만들고 게시·취소해도
공지가 생기지 않는다.

## 6. 공개 범위 (WO §5 조사 결과)

**기존 공지에는 공개범위 개념이 없다.** `branch_posts` 는 `status='published'` 면
`/branches/:slug/posts` (public 라우트)로 비로그인도 본다.

행사는 총회 안건·참석 명단이 섞이므로 같은 정책을 쓸 수 없다고 판단해 2단계만 두고
**기본을 `members_only`** 로 했다 (WO §5 권고와 같은 결론). 대외 안내가 필요할 때만
운영자가 명시적으로 `public` 을 고른다.

실측 11: `public` 전환 시 공개 목록에 나오고 되돌리면 사라졌다.
실측 11b: 공개 응답의 `myRsvp` 는 `null` — 로그인 없는 경로로 남의 응답이 새지 않는다.

## 7. tenant / 권한

- Primary Boundary = `organizationId`. 모든 조회가 `(id, organization_id)` 복합 — **UUID 단독 조회 없음.**
- body 의 `organizationId` / `userId` 를 읽지 않는다. tenant 는 `:branchSlug` 로만 정해진다.
- **`branch_event_rsvps` 에는 `organization_id` 가 없다.** 분회는 `branch_events` 가 갖는다.
  그래서 모든 RSVP 쿼리가 `branch_events` 를 `(id, organization_id)` 로 조인해 좁힌다 —
  `WHERE event_id = $1` 단독 조회가 한 곳도 없다. 비정규화로 중복 보관하지 않은 이유는
  두 값이 어긋날 여지를 만들지 않기 위해서다.
- 실측 10: 타 분회 경로 403 · 타 분회 공개상세 404 · member→operator 403 · 미인증 401 ·
  미소속 eventId 404. 미게시 행사는 회원에게 404 로 응답해 **존재 여부를 알려주지 않는다.**

## 8. 일정 (WO §7)

`starts_at` / `ends_at` 을 canonical 로 두어 향후 분회 캘린더가 재사용할 수 있게 했다.
`IDX_branch_events_org_starts` 로 기간 조회를 받친다. **이번 WO 에서 calendar 시스템은
만들지 않았다.**

## 9. 브라우저 smoke

`https://kpa-society.co.kr/kpa/namgu` · Playwright.

| 검사 | 결과 |
|---|---|
| 운영자 행사 화면 렌더 | ✅ 행사 표시 |
| 취소 배지 | ✅ |
| 참가명단 렌더 | ✅ |
| 회원 행사 화면 | ✅ |
| 취소 행사 안내문구 + 참가 버튼 사라짐 | ✅ (§9-1 참조) |
| 내 응답 표시 | ✅ |
| 4xx 없음 | ✅ (기존 `/branches/namgu/site` 404 제외 — 별도 WO 로 이미 마감된 건) |

### 9-1. 첫 실행의 FAIL 1건 — 제품 결함이 아니라 검증 오류

첫 브라우저 실행에서 "취소 행사 안내" 가 FAIL 로 나왔다. **원인은 제 단언이 낡은 것**이었다 —
E2E 11(공개범위 검증)에서 행사를 `published` 로 되돌려 놓고, 화면에서 "취소" 문구를 찾았다.
API 로 현재 상태를 확인하니 `published` 였다. 실제로 `cancelled` 로 만든 뒤 재검증하니
배지·안내문구가 나오고 참가/불참 버튼이 사라졌다. **FAIL 을 제품 문제로 보고하지 않고
원인을 먼저 특정했다** (게이트 오탐 우선 의심).

## 10. fixture · 원복

운영자 1 + 회원 1 + 행사 1 + 응답 1. `kpa_members` 미변경.

| 대상 | before | 부여 | after (원복) |
|---|:--:|:--:|:--:|
| `service_memberships` (kpa-branch) | 0 | 2 | **0** |
| `role_assignments` (`kpa-branch:*`) | 0 | 2 | **0** |
| `branch_memberships` | 0 | 2 | **0** |
| `branch_events` | 0 | 1 | **0** |
| `branch_event_rsvps` | 0 | 1 | **0** (FK CASCADE) |
| `branch_posts` | 0 | **미변경** | **0** |
| `branch_fee_ledgers` · `branch_education_credit_ledgers` · `annual_reports` | 0 | **미변경** | 0 |
| `kpa_members` / `users` | 7 / 57 | **미변경** | **7 / 57** |

- namgu 분회 + 검증 2계정으로 한정했다. 타 분회 · 타 서비스 데이터는 건드리지 않았다.
- 로그인은 L1(플랫폼 자격). `service_credentials` 를 만들지 않았다.
- 원복 확인: 운영자·회원 403 `MEMBERSHIP_NOT_FOUND` · 공개 목록 0건.

### 제약 기록

1. **행사 생성·게시·취소·RSVP 전 과정을 제품 API 로 통과**시켰다. 신고기간처럼 SQL 로
   상태를 만든 부분이 없다 (W3~W9 와 달리 이 도메인은 기간 게이트가 없다).
2. 검증 계정 2개는 실사용 계정이다 (`sohae2100` · `renagang21`). 프로덕션에 전용 테스트
   계정이 없어 SSOT(`docs/local/TEST-ACCOUNTS.local.md`) 등재 계정을 썼다.
3. 한글 payload 는 UTF-8 파일 + `--data-binary @file` 로 보냈다 (W5·W6·W9 와 같은 도구 함정).
4. `status` 필터에 정의되지 않은 값이 오면 무시하고 전체를 반환한다 (W4~W9 와 같은 판단).

## 11. 범위 밖 (건드리지 않음)

행사별 결제 · 좌석배정 · QR 출결 · LMS 강좌 · Zoom/Meet 생성 · SMS 발송 ·
복잡한 신청서 · 행사 종류별 서브시스템 · 총회/학술대회 전용 모델 · 별도 calendar 시스템 ·
`branch_posts` 카테고리 확장(W11 조사 대상) · 회원 업무 콘솔(W7)에 행사 섹션 추가.

---

## 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건

**발견 1건 (범위 밖 · 미수정)** — `apps/api-server/src/copilot/insight-rules.ts:38` 타입 오류가
W9 CHECK 기록 이후에도 남아 있다. `83853d8d3 GlycoPharm 서비스 완전 삭제` 가 데이터에서
`glycopharm` 을 제거했으나 `AIServiceId` 타입에는 남겨두어 `Record<AIServiceId, …>` 불만족.
이번 변경과 무관한 기존 실패이며 CLAUDE.md 중지 조건에 해당해 고치지 않았다. → 별도 WO 후보.
