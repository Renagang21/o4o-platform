# CHECK — 회원 콘솔 정본 확정 (KEEP_SEPARATE)

- **WO**: `WO-O4O-KPA-BRANCH-MEMBER-CONSOLE-CANONICAL-ADOPTION-V1`
- **일자**: 2026-09-08
- **판정**: **CLOSED — KEEP_SEPARATE** · 코드 변경 없음 (제거할 중복이 없다)
- **선행**: [W7 회원 업무 콘솔](CHECK-O4O-KPA-BRANCH-MEMBER-OPERATIONS-CONSOLE-V1.md)
- **후속**: W8 전입·전출 운영
- **환경**: 조사 전용 (프로덕션 데이터 미변경 · migration 없음 · fixture 없음)

---

## 0. 결론 요약

WO 는 "두 구현이 병렬로 자라고 있다"는 전제로 착수했다. **census 결과 그 전제가 성립하지 않는다.**

| | `operator-core-ui` OperatorMembersConsolePage | `web-kpa-branch` MembersConsolePage (W7) |
|---|---|---|
| 도메인 | **계정 · 가입승인 관리** | **분회 업무 현황** |
| 데이터 계약 | `UserData`(email·name·phone·status·roles·memberships) + pagination | 분회소속 + 신상신고 + 회비 + 연수교육 (year 축) |
| 액션 | 승인/반려/정지/활성화/수정/비밀번호/삭제 | **없음 — 읽기 전용 진입점** |
| year 개념 | 없음 | 있음 (세 원장의 결합 축) |
| 살아있는 소비처 | **7개 화면** | 1개 (kpa-branch) |
| 출처 | `WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1` (기존) | `WO-...-MEMBER-OPERATIONS-CONSOLE-V1` (W7) |

두 화면이 공유하는 것은 **"members" 라는 단어뿐**이다. 같은 것의 두 버전이 아니라 서로 다른 두 업무다.

> **선행 보고 정정** — W7 종료 보고에서 "다른 세션이 병렬로 유사한 회원 콘솔을 공용 패키지에
> 만들고 있다"고 적었으나 **사실이 아니다.** 파일명(`OperatorMembersConsolePage`)만 보고
> 판단한 오류다. 해당 파일은 기존에 확립된 공통 컴포넌트이며 WIP 가 아니다.

## 1. 두 구현 비교 (WO §1)

### 1-1. operator-core-ui 회원 콘솔 — 소유 상태

| 항목 | 실측 |
|---|---|
| 경로 | `packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx` |
| 출처 WO | `WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1` |
| 최근 커밋 | `b91f47196` (WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1) |
| 미커밋 변경 | **없음 (clean)** — 병렬 세션 WIP 아님 |
| 자기 선언 | 헤더·types 양쪽에 *"KPA 는 KpaMember entity 기반 별도 페이지 유지 — 본 wrapper 범위 외"* 명시 |

**살아있는 소비처 7개** (전부 thin wrapper):

```text
services/web-neture/src/pages/operator/UsersManagementPage.tsx          Neture 회원 관리
services/web-glycopharm/src/pages/operator/UsersPage.tsx                GlycoPharm
services/web-glycopharm/src/pages/admin/GlycoPharmAdminMembersPage.tsx  GlycoPharm admin
services/web-k-cosmetics/src/pages/operator/UsersPage.tsx               K-Cosmetics
services/web-k-cosmetics/src/pages/admin/KCosmeticsAdminMembersPage.tsx K-Cosmetics admin
services/web-pharmacy-hub/src/pages/operator/MembersPage.tsx            Pharmacy-Hub 회원 관리
services/web-pharmacy-hub/src/pages/operator/MembershipsPage.tsx        Pharmacy-Hub 가입 승인
services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx    KPA-Society 회원 관리
```

### 1-2. 항목별 대조 (WO §1 축)

| 축 | operator-core-ui | W7 kpa-branch |
|---|---|---|
| route | 서비스별 `/operator/users` · `/operator/members` | `/{slug}/operator/members` (분회 tenant 경로) |
| page/layout | `MemberListLayout` + DataTable + Drawer | 단일 페이지 (표 + 인라인 상세 4섹션) |
| table | `@o4o/operator-ux-core` DataTable · 선택/일괄 | 순수 `<table>` — 선택·일괄 없음 |
| filter/search | status tab · search · 서버 정렬 · 페이지네이션 | year · attention · 성명/면허번호 |
| status badge | `StatusBadge`/`RoleBadge` (계정 상태·역할) | 3축 업무 배지(신고/회비/교육) + attention |
| detail | Drawer + "전체 상세 페이지 →" (`CommonUserDetailPage`) | 인라인 4섹션 + 전문화면 링크 |
| actions | approve/reject/suspend/activate/edit/password/delete | **없음** (읽기 전용) |
| data fetching | 서비스별 client adapter (`page`/`limit`/`status`/`search`) | 통합 API 1회 (`year` 축 · 4원장 조인) |
| 도메인 가정 | users · service_memberships · roles | branch_memberships · annual_reports · fee · education |

### 1-3. 의존성

```text
web-kpa-branch deps (8):
  @o4o/auth-client · @o4o/auth-react · @o4o/auth-utils · @o4o/types
  lucide-react · react · react-dom · react-router-dom
```

`@o4o/operator-core-ui` · `@o4o/operator-ux-core` **미의존**. W7 페이지는 공통 UI 를 하나도 import 하지 않는다.

## 2. 판정 (WO §2·§3)

| 대상 | 판정 | 근거 |
|---|:---:|---|
| operator-core-ui 회원 콘솔 | **COMMON_CORE (기존 유지)** | 계정·가입승인 도메인의 정본. 소비처 7. 변경 없음 |
| W7 kpa-branch 회원 업무 콘솔 | **KPA_BRANCH_SPECIFIC** | 분회 업무 도메인. year 축 · 4원장 결합 |
| 목록 shell / table / filter / badge / detail | **KEEP_SEPARATE** | 아래 §3 |
| 제거 대상 중복 | **DUPLICATE_REMOVE 0건** | 중복이 존재하지 않는다 |

### 정본 경계 (확정)

```text
operator-core-ui            = 계정 · 가입승인 관리의 공통 정본
                              (users · service_memberships · roles · password · delete)

web-kpa-branch              = 분회 업무 콘솔의 정본
MembersConsolePage            (branch_memberships · annual_reports
                               · branch_fee_ledgers · branch_education_credit_ledgers)
```

**공통 패키지가 KPA 도메인을 소유하지 않는다**는 WO 원칙은 **현재 상태에서 이미 지켜지고 있다.**

## 3. adoption 을 하지 않은 이유 (WO §4 는 조건부 — "가능하면")

1. **계약 불일치.** 공통 콘솔의 입력은 `UserData` + `pagination` 이다. W7 의 행은 "회원 × 연도 ×
   3원장 요약"이라 shape 이 겹치지 않는다. 수용하려면 공통 타입에 year 축과 업무 원장 개념을
   넣어야 하는데, 그것이 곧 **공통 패키지가 KPA 도메인을 소유하는 것**이라 WO 원칙에 정면으로 어긋난다.
2. **소비처 7개 컴포넌트의 계약 변경 위험.** CLAUDE.md 공통 모듈 변경 프로토콜이 경고하는
   상황 그대로다. 얻는 것(중복 제거)이 0 인데 위험만 진다.
3. **의존성 확장 비용.** 채택하면 `web-kpa-branch`(현재 deps 8)에 `@o4o/operator-core-ui` ·
   `@o4o/operator-ux-core` · `@o4o/ui` · `@o4o/error-handling` 이 들어오고 Tailwind content
   설정도 그 패키지 src 를 스캔하도록 고쳐야 한다.
4. **사용처 1곳짜리 공통 모듈 방지.** W7 shell 만 공통 패키지로 옮기면 소비처가 kpa-branch
   하나뿐인 "공통" 모듈이 생긴다. 공통화가 아니라 위치 이동이다.

> 다만 **UI 부품 재사용 자체를 영구히 배제하지는 않는다.** 두 번째 서비스가 같은 모양의
> "업무 현황 콘솔"을 요구하는 시점이 오면 그때 `operator-ux-core` 의 DataTable·StatusBadge
> 채택을 재검토한다. 지금은 중복이 없어 그 비용을 치를 근거가 없다.

## 4. 제거한 중복 (WO §5)

**0건.** 제거 대상이 없다.

다른 세션의 WIP 를 건드리지 않았다 — 애초에 WIP 가 아니었고(§1-1 clean), 이 WO 에서
`packages/operator-core-ui/**` 는 **읽기만** 했다.

## 5. W7 계약 불변 (WO §4 단서)

코드를 변경하지 않았으므로 W7 의 5개 계약이 그대로다.

| 계약 | 상태 |
|---|:---:|
| 목록 1-query | 불변 |
| explicit missing states (`not_submitted`/`not_assessed`/`not_recorded`) | 불변 |
| `diffAgainstLedger` 공유 판정 | 불변 |
| tenant boundary (organizationId primary · UUID 단독조회 없음) | 불변 |
| 기존 `/operator/members` superset 계약 | 불변 |

## 6. 타 서비스 회귀 (WO §6)

`packages/operator-core-ui/**` · `services/web-{neture,glycopharm,k-cosmetics,pharmacy-hub,kpa-society}/**`
**미변경.** 소비처 7개 화면에 회귀 가능성이 없다.

`services/web-kpa-branch/**` 도 미변경이므로 W7 검증(목록·상세·전문화면 링크·브라우저 smoke)이
그대로 유효하다.

## 7. W8 확장 지점 (WO §7) — 이미 존재

새로 만들지 않았다. **W7 설계에 이미 있다.**

```tsx
// services/web-kpa-branch/src/pages/operator/MembersConsolePage.tsx:86
function Section({ title, action, children }:
  { title: string; action?: React.ReactNode; children: React.ReactNode })
```

- 상세 4섹션이 전부 이 `Section` 을 쓰고 `action` 슬롯을 받는다.
  현재는 "검수 화면 →" 같은 링크가 들어가 있다.
- **W8 전입/전출 버튼은 소속 섹션의 `action` 슬롯에 붙인다.** 페이지 구조 변경이 필요 없다.
- 목록에도 row 단위 action 셀이 있다(현재 "상세" 토글).

백엔드도 준비돼 있다 — `POST .../operator/members` (전입) · `POST .../operator/members/:userId/leave`
(전출)가 이미 존재하며 화면만 없다.

## 8. 부수 발견 — 진짜 공통화 기회 (별도 WO 후보)

**`web-kpa-branch` 에 가입 승인 화면이 없다.**

```text
backend  GET/PATCH /api/v1/kpa-branch/admin/service-members{,/:id/approve,/:id/reject}   존재
frontend 대응 화면                                                                        없음
```

이것은 공통 콘솔의 `consoleMode='approval'`(Pharmacy-Hub 의 `MembershipsPage` 가 이미 쓰는 모드)과
**같은 도메인**이다. 기술적으로는 여기가 공통 콘솔을 채택할 자리다.

**다만 착수 우선순위는 낮다** (2026-09-08 결정). 가입 승인 기능을 `web-kpa-branch` 로 끌어오면
분회 **업무** 콘솔과 서비스 **가입·권한** 관리가 한 서비스 화면군에 섞여 경계가 흐려질 수 있다.
필요해지면 W7 업무 콘솔과 **완전히 별개 화면**으로 만든다 — 하나는 "서비스 접근을 승인하는가",
다른 하나는 "이 회원의 분회 업무가 어디까지 됐는가"이며 섞지 않는다.

## 9. 범위 밖 (건드리지 않음)

`operator-core-ui` 변경 · 소비처 7개 화면 · W7 코드 · 전입/전출 구현(W8) ·
가입 승인 화면 구현(§8, 별도 WO) · UI 부품 공통화(§3 단서).

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건

1. **kpa-branch 가입 승인 화면** — 공통 콘솔 approval 모드 채택 (§8)
2. `BranchLayout` 운영자 영역 첫 렌더 site 404 (W7 CHECK §7 에서 이월)
3. 회비 원장 보강 — `fee.exemptionType` 면제 사유 구분 (W6 CHECK 에서 이월)
