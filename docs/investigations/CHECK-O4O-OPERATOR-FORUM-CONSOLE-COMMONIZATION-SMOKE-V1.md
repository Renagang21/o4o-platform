# CHECK-O4O-OPERATOR-FORUM-CONSOLE-COMMONIZATION-SMOKE-V1

**작성 일자**: 2026-06-02
**조사 환경**: HEAD (main) `098403588` 시점 (read-only)
**작업 성격**: read-only smoke CHECK — 코드/UI/API/DB/migration/route/package 수정 없음
**목적**: GP/K-Cosmetics operator 포럼 신청·삭제요청 콘솔 공통화 완료 상태를 정적 코드 기준으로 검증·고정

---

## 1. CHECK 개요

`@o4o/operator-core-ui`로 GP/K-Cosmetics의 operator 포럼 **신청(ForumRequests)** 및 **삭제요청(ForumDeleteRequests)** 리스트 화면을 공통 콘솔로 추출한 3개 작업의 결과가 main에 정상 반영되었는지 정적 검증한다. 새 구현은 하지 않으며, 현재 단계 완료를 문서로 고정한다.

**핵심 판정**: **CONDITIONAL PASS** — 정적 구조·export·정책·타입 모두 정상. live pending 데이터 0건으로 브라우저 bulk action 실증만 NOT TESTED(데이터 부재, 코드 결함 아님). GP의 pre-existing TS 오류 23건은 이번 범위와 무관.

---

## 2. 사전 git 상태

```
git rev-list --left-right --count HEAD...origin/main → 0  0 (동기화)
git status --short (non-png):
?? docs/investigations/IR-O4O-CROSSSERVICE-POSTLOGIN-STOREOWNER-DASHBOARD-POLICY-AUDIT-V1.md  ← 다른 세션 WIP (미접촉)
```

다른 세션 WIP는 미접촉. 본 CHECK는 신규 CHECK 문서 1개만 생성한다.

---

## 3. 검증 대상 commit / 작업 목록

| commit | 작업 |
|--------|------|
| `4afde5fe0` | `IR-O4O-OPERATOR-FORUM-REQUEST-CONSOLE-WRAPPER-FEASIBILITY-V1` (타당성 IR) |
| `f3bd56e21` | `WO-O4O-OPERATOR-FORUM-DELETE-REQUESTS-CONSOLE-COMMONIZATION-V1` (삭제요청 콘솔) |
| `098403588` | `WO-O4O-OPERATOR-FORUM-REQUESTS-CONSOLE-COMMONIZATION-V1` (신청 콘솔) |

3개 커밋 전체 변경 파일 (영향 범위):
- `packages/operator-core-ui/package.json`
- `packages/operator-core-ui/src/modules/forum-delete-requests/{ForumDeleteRequestsConsole.tsx,index.ts,types.ts}`
- `packages/operator-core-ui/src/modules/forum-requests/{ForumRequestsConsole.tsx,index.ts,types.ts}`
- `services/web-glycopharm/src/pages/operator/{ForumRequestsPage,ForumDeleteRequestsPage}.tsx`
- `services/web-k-cosmetics/src/pages/operator/{ForumRequestsPage,ForumDeleteRequestsPage}.tsx`
- `docs/investigations/IR-...FEASIBILITY-V1.md`

→ **operator-core-ui + GP/K-Cos 4개 wrapper + IR 문서만**. KPA/Neture/backend/route/guard **없음**.

---

## 4. 공통 모듈 export 정합 확인

`packages/operator-core-ui/package.json` subpath exports:
```
"./modules/forum-delete-requests": "./src/modules/forum-delete-requests/index.ts",
"./modules/forum-requests": "./src/modules/forum-requests/index.ts"
```

각 모듈 `index.ts`:
- `forum-delete-requests/index.ts` → `OperatorForumDeleteRequestsConsolePage` + 타입(`ForumDeleteRequestsConsoleClient`, `ForumDeleteRequest`, `ForumDeleteRequestStatus`, `ForumDeleteReviewResult` 등) export
- `forum-requests/index.ts` → `OperatorForumRequestsConsolePage` + 타입(`ForumRequestsConsoleClient`, `ForumRequest`, `ForumRequestStatus`, `ForumRequestReviewAction`, `ForumRequestReviewResult`) export

→ **export/subpath 정합 ✅**. (root `src/index.ts`는 두 콘솔을 re-export하지 않으나, 기존 컨벤션상 콘솔 페이지는 subpath 소비가 표준 — `members`/`resources`와 동일 패턴이므로 정상.)

---

## 5. GlycoPharm wrapper 정합 확인

| 파일 | 줄수 | import | 주입 |
|------|:---:|--------|------|
| `operator/ForumRequestsPage.tsx` | 43 | `OperatorForumRequestsConsolePage` ← `@o4o/operator-core-ui/modules/forum-requests` | serviceKey=`glycopharm`, title, description, headerIcon(`text-primary-600`), tableId, client adapter(`forumRequestApi`, `{data,error:{message}}` 정규화) |
| `operator/ForumDeleteRequestsPage.tsx` | 43 | `OperatorForumDeleteRequestsConsolePage` ← `.../modules/forum-delete-requests` | serviceKey, title, description, headerIcon(`text-red-500`), tableId, loadGuideSections(`fetchGuidePageContent`), client adapter |

→ 두 파일 모두 **공통 콘솔 호출 thin wrapper** ✅. UI/상태/검토/bulk 로직은 콘솔이 소유, wrapper는 주입만.

---

## 6. K-Cosmetics wrapper 정합 확인

| 파일 | 줄수 | import | 주입 |
|------|:---:|--------|------|
| `operator/ForumRequestsPage.tsx` | 42 | `OperatorForumRequestsConsolePage` ← `.../modules/forum-requests` | serviceKey=`k-cosmetics`, title, description, headerIcon(`text-pink-600`), tableId, client adapter(`forumOperatorApi`, `{success,error}` 정규화) |
| `operator/ForumDeleteRequestsPage.tsx` | 42 | `OperatorForumDeleteRequestsConsolePage` ← `.../modules/forum-delete-requests` | serviceKey, title, description, headerIcon(`text-pink-600`), tableId, loadGuideSections, client adapter |

→ 두 파일 모두 **공통 콘솔 호출 thin wrapper** ✅. brand 색(pink)은 headerIcon으로 보존.

---

## 7. ForumDeleteRequestsConsole 기능 보존 확인

| 기능 | 보존 |
|------|:---:|
| 목록 조회(client.list) | ✅ |
| 상태 탭(대기/승인/반려/전체, segmented canonical) | ✅ |
| 단건 drawer 승인/반려(`BaseDetailDrawer` 560px) | ✅ |
| bulk 승인/반려(ActionBar) | ✅ |
| pending 대상 제한(`selectedPendingCount` 필터) | ✅ |
| ActionBar | ✅ |
| BulkResultModal | ✅ |
| retry(`batch.retryFailed`) | ✅ |
| postCount 경고(amber 배너) | ✅ |
| 검토 의견 입력(textarea) | ✅ |
| empty/loading 상태 | ✅ (DataTable loading + emptyMessage) |
| GuideBlock + fallback | ✅ (loadGuideSections 동적 + 기본 fallback) |

bulk 실행: 단건 endpoint fan-out(`Promise.allSettled`) — 응답 shape 차이는 client adapter `{ok,error}` 정규화.

---

## 8. ForumRequestsConsole 기능 보존 확인

| 기능 | 보존 |
|------|:---:|
| 목록 조회(client.list) | ✅ |
| 상태 필터(모든/대기/보완/승인/거절 select) | ✅ |
| 검색(포럼명/신청자) | ✅ |
| 단건 drawer 검토(`BaseDetailDrawer` 560px) | ✅ |
| 승인 흐름 | ✅ |
| 거절 흐름 | ✅ |
| 보완 요청 흐름(단건만) | ✅ |
| 검토 의견 입력 | ✅ |
| bulk 승인/거절(ActionBar, reviewable 대상) | ✅ |
| BulkResultModal + retry | ✅ |
| empty/loading/error 상태 | ✅ (error 전체화면+재시도 canonical 포함) |
| route/menu/API/guard 무변경 | ✅ |

> GuideBlock: 원본 ForumRequestsPage에 **없었으므로** 콘솔도 추가하지 않음 (기존 동작 보존). 삭제요청 콘솔에만 GuideBlock 존재 — 이는 원본 차이를 그대로 반영한 것.

---

## 9. 보완 요청 bulk 제외 정책 확인

`forum-requests/ForumRequestsConsole.tsx` 코드 근거:
- `runBulk = async (action: 'approve' | 'reject')` — 시그니처에 **`revision` 없음** ✅
- ActionBar `actions`: `key: 'approve'`, `key: 'reject'` **2개만** (revision 미노출) ✅
- 보완은 단건 drawer 액션에서만: `{ label: '보완', onClick: () => handleReview('revision') }`
- 의견 필수 차단: `if (action === 'revision' && !reviewComment.trim()) { toast.error('보완 요청 시 의견을 입력해주세요.'); return; }` ✅
- **K-Cos gap 보강**: 원본 K-Cos ForumRequestsPage에는 보완 의견 필수 검증이 없었고 placeholder도 "(선택)"이었으나, 콘솔이 GP의 canonical 정책(의견 필수)을 양 서비스에 적용 → K-Cos 정책 갭 보강 ✅

→ **보완 요청 bulk 제외 + 의견 필수 정책 유지·강화 ✅**

---

## 10. TypeScript / build 검증 결과

| 패키지 | 명령 | 결과 |
|--------|------|------|
| `@o4o/operator-core-ui` | `tsc --noEmit -p tsconfig.json` | forum 모듈 오류 **0** (유일 오류는 의존 `error-handling`의 `import.meta.env` — pre-existing/환경적) |
| `web-glycopharm` | `tsc -b tsconfig.json` (local tsc 5.9.3, app config 포함) | forum wrapper 오류 **0**. 전체 23건은 pre-existing 무관 파일(lms/education/hub/instructor/App.tsx 등), 직전 WO 전후 동일 카운트 |
| `web-k-cosmetics` | `tsc -p tsconfig.json --noEmit` | **clean (EXIT=0)** |

→ **신규 TypeScript 오류 0 ✅**. (루트 `npx tsc`는 5.4.5라 app config 옵션 미인식 — 검증은 서비스 로컬 tsc 5.9.3 사용.)

---

## 11. live pending 데이터 및 브라우저 검증 가능 여부

- **NOT TESTED (BLOCKED — 데이터 부재)**: operator 포럼 신청·삭제요청 live pending 데이터 0건(선행 `CHECK-O4O-OPERATOR-FORUM-BULK-PARITY-SMOKE-V1` 기준 동일)으로 브라우저에서 bulk approve/reject/보완 action을 실증할 데이터가 없음. **코드 결함 아님**.
- 본 작업은 동일 컴포넌트·동일 API·동일 흐름을 보존하는 frontend 리팩토링이며, 정적 구조·타입·정책 검증으로 갈음. main push로 CI/CD 배포됨.

---

## 12. 영향 범위 확인

| 항목 | 결과 |
|------|:---:|
| KPA 파일 수정 | 없음 ✅ |
| Neture 파일 수정 | 없음 ✅ |
| backend/API/DB/migration 변경 | 없음 ✅ |
| route/guard 변경 | 없음 ✅ |
| Store Hub / My Store 영향 | 없음 ✅ |
| `ForumDeleteRequestsConsole` ↔ `ForumRequestsConsole` 상호 침범 | 없음 ✅ (별도 모듈·별도 타입·별도 client 인터페이스) |

3개 커밋 변경 파일 = operator-core-ui + GP/K-Cos 4 wrapper + IR 문서뿐 (§3).

---

## 13. 남은 후순위 후보

이번 축(GP/K-Cos 신청·삭제요청 콘솔) 완료 이후, **즉시 확장하지 말고** 다음 중 선택 권장:

| 후보 | 성격 | 비고 |
|------|------|------|
| `IR-O4O-NETURE-FORUM-CONSOLE-CONVERGENCE-V1` | IR | Neture는 detail이 고정 Modal(Drawer 아님)·실제 batch endpoint → 수렴 비용·검수 영향 조사 |
| `IR-O4O-KPA-FORUM-MANAGEMENT-TAB-DECOMPOSITION-V1` | IR | KPA 신청+카테고리 2탭 결합·RowActionMenu 정책 보존 전제 |
| `CHECK-O4O-GLYCOPHARM-FORUM-MANAGEMENT-ORPHAN-CLEANUP-V1` | CHECK | GP `forum-management/OperatorForumManagementPage`(mock/TODO orphan) 라우트 연결 확인 후 제거/표준화 |

---

## 14. 최종 판정

```
판정: CONDITIONAL PASS

근거:
✅ GP/K-Cos 신청·삭제요청 4개 wrapper 모두 공통 콘솔 기반 정렬 (43/43/42/42줄 thin wrapper)
✅ 공통 모듈 export/subpath 정합 (2개 subpath)
✅ 보완 요청 bulk 제외 + 의견 필수 정책 유지·강화 (K-Cos gap 보강)
✅ backend/API/route/guard/KPA/Neture 영향 없음
✅ 신규 TypeScript 오류 0 (operator-core-ui / GP / K-Cos)
⚠️ live pending 데이터 0건 → 브라우저 bulk action NOT TESTED (데이터 부재, 코드 결함 아님)
⚠️ GP pre-existing TS 23건 — 이번 작업 범위와 무관

→ 정적 구조 완전 정상 + live 실증만 데이터 부재 = CONDITIONAL PASS.
   GP/K-Cosmetics 포럼 신청·삭제요청 콘솔 공통화 축 = 완료 고정.
```

---

## 15. Current Structure vs O4O Philosophy Conflict Check

- **운영 경험 공통화 원칙 정렬?** ✅ 4개 화면이 단일 콘솔(2모듈) + thin wrapper로 수렴. Operator OS 공통화·`OperatorMembersConsolePage`/`OperatorResourcesConsolePage` 선례와 동형. 유지보수 지점 4→2.
- **도메인 차이 vs 구현 편차?** ✅ GP/K-Cos의 차이(응답 shape·status 배지·헤더·error UI·보완 검증)는 **구현 편차**였고 client adapter + config props로 흡수. 도메인 차이가 아님이 확인됨.
- **보완 요청과 bulk 안전 분리?** ✅ 의견 입력 필요한 보완은 bulk에서 제외(승인/거절만 fan-out), 단건 drawer + 의견 필수. anti-pattern(bulk 중 인터랙티브 입력) 없음.
- **KPA/Neture 도메인 차이 무리하게 건드리지 않음?** ✅ 두 서비스 파일 무수정. Neture(Modal·batch endpoint)·KPA(2탭 결합)는 별도 IR로 분리 보류.
- **1인 개발 생산성·유지보수성?** ✅ 약 1,450줄(4파일) 중복 → 콘솔 2모듈 + thin wrapper 4개(170줄)로 축소. 정책 변경 시 단일 지점 수정.

**결론**: O4O 철학과 충돌 없음. 구현 편차만 공통화하고 도메인 차이는 보존한 정렬로, 운영 경험 일관성·생산성 양면에 부합.

---

## 코드 변경 없음 확인

이 CHECK에서 수정한 소스/DB/migration/package: **없음.** 신규 생성: 본 CHECK 문서 1개.
git status: 다른 세션 WIP(`IR-...POSTLOGIN-STOREOWNER...`) 미접촉.

---

*작성: Claude Code (2026-06-02)*
*read-only smoke CHECK — 코드/DB/source/migration/package/route 수정 없음*
