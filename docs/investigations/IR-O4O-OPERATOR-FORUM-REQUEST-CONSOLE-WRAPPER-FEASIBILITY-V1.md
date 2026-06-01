# IR-O4O-OPERATOR-FORUM-REQUEST-CONSOLE-WRAPPER-FEASIBILITY-V1

**작성 일자**: 2026-06-01
**조사 환경**: HEAD (main) `0b4f5d9ce` 시점 (read-only)
**작업 성격**: read-only 조사 IR — 코드/UI/route/backend/API/DB/migration/package 수정 없음
**선행 / 모문서**: [`IR-O4O-OPERATOR-FORUM-LIST-COMMONIZATION-AUDIT-V1`](IR-O4O-OPERATOR-FORUM-LIST-COMMONIZATION-AUDIT-V1.md) (`6341f531a`) §7 의 **보류 후보** `IR-O4O-OPERATOR-FORUM-REQUEST-CONSOLE-WRAPPER-FEASIBILITY-V1`
**완료 인계**: 모IR의 핵심 권고(GP/K-Cos bulk parity)는 이미 구현·검증 완료 — `WO-...FORUM-DELETE-REQUEST-BULK-PARITY-V1`(`16a76fb6e`), `WO-...FORUM-REQUEST-BULK-PARITY-V1`(`bb52b6819`), smoke PASS `CHECK-...FORUM-BULK-PARITY-SMOKE-V1`(`f2c772945`)

---

## 0. 이 IR이 답하는 질문

모IR(`...AUDIT-V1`)은 "GP/K-Cos에 bulk action이 누락됨"을 지적했고, 그 후속 WO가 실행되어 **bulk parity는 해소**되었다. 모IR §7은 그다음 단계로 **공통 wrapper 추출 타당성**을 별도 IR로 보류했다.

본 IR은 **bulk parity 완료 이후 현재 상태**에서 다음을 판단한다:

> Operator Forum 신청/삭제요청 리스트를 `@o4o/operator-core-ui`의 공통 콘솔 컴포넌트(`ForumDeleteRequestsConsole` / `ForumRequestsConsole`)로 추출하는 것이 현실적인가? 어느 순서·위험으로 가능한가?

**결론(선)**: **현실적이며 권장.** `OperatorMembersConsolePage`(client 주입형 full-page 콘솔)가 직접 선례다. 삭제요청 → 신청 → Neture 수렴 → KPA 검토 순으로 단계화하면 위험을 통제할 수 있다.

---

## 1. 사전 git 상태

```
git rev-list --left-right --count HEAD...origin/main → 0  0
git status --short (다른 세션 WIP — 미접촉):
 M docs/investigations/CHECK-O4O-CURRENT-WORKSTREAM-NEXT-SCOPE-AUDIT-V1.md
?? docs/investigations/IR-O4O-ADMIN-DASHBOARD-LAYOUT-COMMONIZATION-AUDIT-V1.md
?? services/web-glycopharm/docs/
?? *.png
```

진행 전 조건(ForumRequestsPage WIP 없음) 충족 — 모IR과 동일 확인.

---

## 2. bulk parity 이후 현재 상태 (모IR §2~§3 갱신)

모IR 작성 시점 GP/K-Cos는 "단건 처리(selectable/ActionBar/bulk 없음)"였다. **현재는 보강 완료**:

| 서비스 | 화면 | DataTable | selectable | ActionBar | BulkResultModal | bulk 제외 |
|--------|------|:---:|:---:|:---:|:---:|------|
| GP | ForumRequestsPage | ✅ | ✅ | ✅ | ✅ | 보완(revision) bulk 제외 |
| K-Cos | ForumRequestsPage | ✅ | ✅ | ✅ | ✅ | 보완 bulk 제외 |
| GP | ForumDeleteRequestsPage | ✅ | ✅ | ✅ | ✅ | — |
| K-Cos | ForumDeleteRequestsPage | ✅ | ✅ | ✅ | ✅ | — |

→ 모IR의 "2패턴 혼재(Full canonical vs 단건)" drift는 **신청/삭제요청에서 해소**. 4서비스가 동일 골격(DataTable selectable → ActionBar → useBatchAction → BulkResultModal)으로 수렴했다. 이제 남은 것은 **중복 구현(복제)을 단일 콘솔로 묶는 것**이다.

---

## 3. 공통 빌딩블록 인벤토리 (추출 기반)

| 컴포넌트/훅 | 패키지 | import |
|-------------|--------|--------|
| `DataTable` (selectable/selectedKeys/onSelectionChange) | `@o4o/operator-ux-core` | `import { DataTable, useBatchAction } from '@o4o/operator-ux-core'` |
| `ListColumnDef` | `@o4o/operator-ux-core` | type |
| `useBatchAction` (executeBatch/retryFailed) | `@o4o/operator-ux-core` | — |
| `defineActionPolicy` / `buildRowActions` | `@o4o/operator-ux-core` | — |
| `ActionBar` (V4, confirm 내장) | `@o4o/ui` | `import { ActionBar, BulkResultModal, RowActionMenu, BaseDetailDrawer } from '@o4o/ui'` |
| `BulkResultModal` (retry) | `@o4o/ui` | — |
| `RowActionMenu` | `@o4o/ui` | — |
| `BaseDetailDrawer` (560px) | `@o4o/ui` | — |
| `MemberListLayout` (검색+탭+표 레이아웃) | `@o4o/operator-ux-core` | — |
| **`OperatorMembersConsolePage`** (client 주입, 상태/데이터 보유 full-page) | **`@o4o/operator-core-ui`** | **선례** |
| `GuideContentsConsolePage` (manager 위임 경량 wrapper) | `@o4o/operator-core-ui` | 선례2 |

**핵심**: 콘솔 추출에 필요한 모든 부품이 이미 패키지에 존재한다. 신규 인프라 불필요.

---

## 4. `useBatchAction`이 backend 편차를 흡수한다 (추출의 결정적 근거)

서비스별 bulk 실행 방식은 다르다:

| 서비스 | 신청/삭제요청 bulk |
|--------|-------------------|
| GP / K-Cos | **fan-out** `Promise.allSettled(ids.map(single))` (backend batch endpoint 없음) |
| KPA | 삭제요청은 **실제 batch endpoint** `batchApproveDelete`/`batchRejectDelete` |
| Neture | 신청 `batchReview`, 삭제요청 `batchApproveDelete`/`batchRejectDelete` (**실제 batch**) |

`useBatchAction.executeBatch(apiFn, ids)`는 `apiFn`만 교체하면 **fan-out·batch endpoint 양쪽을 동일 인터페이스로 흡수**한다. 응답도 `res.data.results` / `res.data.data.results` 양쪽 파싱. → **backend/API contract 변경 없이** 서비스별 `apiFn`(또는 주입형 client)만 다르게 주입해 단일 콘솔에서 처리 가능.

---

## 5. 콘솔 추출 청사진 (`OperatorMembersConsolePage` 패턴)

```
@o4o/operator-core-ui
└─ modules/forum-requests/
   ├─ ForumDeleteRequestsConsolePage.tsx   (상태·데이터·컬럼·정책 보유)
   └─ ForumRequestsConsolePage.tsx
        props: { serviceKey, client: ForumRequestsConsoleClient, config? }

ForumRequestsConsoleClient (서비스별 주입):
   getRequests(params) / review(id, {action, reviewComment}) / batchApiFn(ids, action)

서비스측 (thin wrapper):
services/web-glycopharm/.../ForumRequestsPage.tsx
   → <ForumRequestsConsolePage serviceKey="glycopharm" client={glycopharmForumClient} />
services/web-k-cosmetics/.../ForumRequestsPage.tsx
   → <ForumRequestsConsolePage serviceKey="k-cosmetics" client={kcosForumClient} />
```

콘솔 내부: `DataTable(selectable)` + `ActionBar(approve/reject)` + `useBatchAction` + `BulkResultModal` + `BaseDetailDrawer`. **보완(revision) bulk 제외 정책을 콘솔에 내장**(코멘트 필수 action은 bulk에서 제외).

---

## 6. 단계별 타당성·위험

| 단계 | 범위 | 타당성 | 위험 |
|:---:|------|:---:|:---:|
| 1 | **ForumDeleteRequestsConsole (GP+K-Cos)** | 높음 (95%+ 동일, 승인/거절만 — 위험 action 없음) | **낮음** |
| 2 | **ForumRequestsConsole (GP+K-Cos)** | 높음 (95%+ 동일) | 낮음~중간 (보완 bulk 제외 정확 계승 필요) |
| 3 | **Neture 합류** | 중간 (동일 콘솔에 batch client 주입) | 중간 (detail이 **고정 Modal** → Drawer 전환 검수 영향) |
| 4 | **KPA 합류 검토** | 낮음~중간 | 중간~높음 (신청+카테고리 **2탭 결합** 구조·RowActionMenu 정책·delete-check·1449줄 규모 = 도메인 차이) |

추출하면 안 되는 것:
- **GP `forum-management/OperatorForumManagementPage.tsx`** — mock 데이터 + TODO placeholder + 카드/plain table(비표준). 콘솔 대상 아니라 **정리/제거 검토 대상**.
- **KPA 카테고리 탭** (activate/deactivate/hardDelete + delete-check + 커스텀 모달) — KPA 약사회 도메인 고유. 강제 통합 금지.
- **Neture `MyForumDashboardPage`** — supplier-scoped, operator 아님.

---

## 7. 부수적으로 확인된 정합 편차 (콘솔화 시 함께 canonical 통일)

| 편차 | 현황 | canonical 제안 |
|------|------|----------------|
| 상태필터 UI | GP 신청=select / 삭제요청=탭그룹, K-Cos=개별 버튼 | 탭그룹으로 통일 |
| error 상태 UI | GP=AlertCircle+retry, **K-Cos 누락** | 콘솔에 표준 내장 |
| status badge / header | GP=`StatusBadge`/`PageHeader`, K-Cos=인라인 | 공통 컴포넌트 사용 |
| detail 진입 | GP/K-Cos/KPA=Drawer, Neture=Modal | `BaseDetailDrawer` canonical |
| 위험 action bulk 입력 | KPA 카테고리 bulk 중 `prompt()` reason | 사전 모달로 분리 (anti-pattern 제거) |

---

## 8. 후속 WO/IR 후보

| WO/IR | 범위 | 위험 | 우선 |
|-------|------|:---:|:---:|
| `WO-O4O-OPERATOR-FORUM-DELETE-REQUESTS-CONSOLE-COMMONIZATION-V1` | `@o4o/operator-core-ui`에 `ForumDeleteRequestsConsolePage` 추출 + GP/K-Cos thin wrapper + 주입형 client. error UI·탭그룹 canonical 포함. backend 변경 없음 | 낮음 | 🥇 |
| `WO-O4O-OPERATOR-FORUM-REQUESTS-CONSOLE-COMMONIZATION-V1` | `ForumRequestsConsolePage` 추출. **보완 bulk 제외 계승**. StatusBadge/PageHeader 공통화 | 낮음~중간 | 🥈 |
| `IR-O4O-NETURE-FORUM-CONSOLE-CONVERGENCE-V1` | Neture Modal→Drawer 전환 비용·검수 영향 + batch client 계약 조사 | 중간 | 🥉 |
| `IR-O4O-KPA-FORUM-MANAGEMENT-TAB-DECOMPOSITION-V1` | KPA 2탭 결합에서 신청 콘솔만 합류 가능 여부 / RowActionMenu 보존 판단 | 중간~높음 | 4 |
| `CHECK-O4O-GLYCOPHARM-FORUM-MANAGEMENT-ORPHAN-CLEANUP-V1` | GP forum-management orphan(mock/TODO) 라우트 연결 확인 후 제거/표준화 | 낮음 | 정리 |

---

## 9. Current Structure vs O4O Philosophy Conflict Check

- **운영 경험 공통화 원칙과 충돌?** 없음. 4서비스가 이미 동일 빌딩블록으로 수렴했고, 콘솔 추출은 Operator OS 공통화·`OperatorMembersConsolePage` 선례와 정합. 중복 4지점 → 1지점 수렴으로 1인 유지보수성 향상.
- **서비스 차이가 도메인 차이인가 구현 편차인가?** 도메인 차이(보존): KPA 2탭 결합·카테고리 관리·Neture batch endpoint·detail Modal. 구현 편차(공통화 대상): GP/K-Cos status badge·header·error UI·상태필터 형태.
- **선택→검토→승인/거절 흐름이 운영 효율을 높이는가?** 그렇다. "선택→ActionBar→batch→결과+retry"는 HUB "선택→복사→사용처→실행"과 동형.
- **의견 입력 action과 bulk 안전 분리?** 정착됨(보완=코멘트 필수→bulk 제외, 전 서비스). 단 KPA 카테고리 bulk 중 `prompt()`는 anti-pattern → 콘솔화 시 사전 모달 분리.
- **과도 공통화로 서비스 정책 은폐 위험?** KPA 카테고리·2탭은 추출 제외로 회피. 신청/삭제요청만 콘솔화 → 안전.

**결론**: 철학 충돌 없음. bulk parity로 이미 수렴된 GP/K-Cos를 **삭제요청 콘솔부터 단계적으로 추출**하는 것이 위험 대비 실익이 가장 크다. Neture·KPA는 별도 IR로 신중 진행.

---

## 최종 보고 요약

- **수정 파일**: 없음 (read-only IR)
- **생성 IR 문서**: `docs/investigations/IR-O4O-OPERATOR-FORUM-REQUEST-CONSOLE-WRAPPER-FEASIBILITY-V1.md` (모IR §7 보류 후보를 실현)
- **모IR 처리**: `IR-O4O-OPERATOR-FORUM-LIST-COMMONIZATION-AUDIT-V1`(`6341f531a`) **원본 보존** — 덮어쓰지 않음
- **핵심 판정**: bulk parity 완료 후 신청/삭제요청 4서비스 수렴 확인 → **공통 콘솔 추출 현실적·권장**. `useBatchAction`이 fan-out/batch 편차 흡수 → backend 변경 불필요. `OperatorMembersConsolePage` 직접 선례.
- **우선순위**: 1) ForumDeleteRequestsConsole(GP+K-Cos) 2) ForumRequestsConsole(GP+K-Cos) 3) Neture 수렴 IR 4) KPA 검토 IR 5) GP orphan 정리
- **git status**: 본 IR 생성 외 변경 없음. 다른 세션 WIP 미접촉. **git add/commit/push 미실행**(WO 금지 준수).

---

*작성: Claude Code (2026-06-01)*
*read-only 조사 — 코드/UI/route/backend/API/DB/migration/package 수정 없음. 모IR 원본 보존.*
