# CHECK-O4O-GLYCOPHARM-FORUM-MANAGEMENT-ORPHAN-CLEANUP-V1

**작성 일자**: 2026-06-02
**조사 환경**: HEAD (main) `34f8bd754` 시점 (read-only)
**작업 성격**: read-only CHECK — 코드/파일/route/menu/API/DB/migration/package 수정·삭제 없음
**목적**: GlycoPharm operator `forum-management/OperatorForumManagementPage.tsx` mock/TODO orphan 여부 및 정리 필요성 판정

---

## 1. CHECK 개요

GP/K-Cos 포럼 신청·삭제요청 콘솔 공통화(`...DELETE-REQUESTS-CONSOLE...` `f3bd56e21` / `...REQUESTS-CONSOLE...` `098403588` / smoke `34f8bd754`) 완료 후, 후순위 후보로 분류된 GlycoPharm `forum-management/OperatorForumManagementPage.tsx`(mock/TODO)의 실제 사용 여부·삭제 가능성을 정적 코드로 판정한다.

**핵심 판정**: **NEEDS-FOLLOWUP** — 해당 페이지는 **죽은 파일이 아니라 live route + operator 메뉴 2그룹 + 대시보드 단축에 연결된 mock-only(538줄) 페이지**다. 즉시 삭제하면 route 404·메뉴 깨짐이 발생하므로, route+menu+dashboard를 함께 정리하는(또는 실제 구현으로 교체하는) 별도 WO가 필요하다. 단, "포럼 관리" surface 존치 여부는 **사업/스코프 결정**이 선행되어야 한다.

---

## 2. 사전 git 상태

```
git rev-list --left-right --count HEAD...origin/main → 0  0
git status --short (non-png):
 M services/web-k-cosmetics/src/App.tsx                              ← 다른 세션 WIP (미접촉)
 M services/web-k-cosmetics/src/config/operatorMenuGroups.ts        ← 다른 세션 WIP (미접촉)
?? services/web-k-cosmetics/src/pages/operator/signage/ForcedContentPage.tsx ← 다른 세션 WIP (미접촉)
?? docs/investigations/IR-O4O-CROSSSERVICE-POSTLOGIN-STOREOWNER-DASHBOARD-POLICY-AUDIT-V1.md ← 다른 세션 WIP (미접촉)
```

다른 세션 WIP 4건은 모두 미접촉. 본 CHECK는 신규 CHECK 문서 1개만 생성한다.

---

## 3. 조사 대상 파일/경로

| 파일 | 내용 |
|------|------|
| `services/web-glycopharm/src/pages/operator/forum-management/OperatorForumManagementPage.tsx` | 538줄, mock/TODO 구현 |
| `services/web-glycopharm/src/pages/operator/forum-management/index.ts` | `export { default as OperatorForumManagementPage }` |

---

## 4. route 연결 여부 — **연결됨 (live)**

`services/web-glycopharm/src/App.tsx`:
- L116: `const OperatorForumManagementPage = lazy(() => import('@/pages/operator/forum-management').then(m => ({ default: m.OperatorForumManagementPage })));`
- L761: `<Route path="forum-management" element={<OperatorForumManagementPage />} />` — `/operator/*`(OperatorRoute) 하위

→ `/operator/forum-management` 경로가 **실제 라우팅됨**. legacy redirect 아님. 죽은 route 아님.

같은 `/operator` 하위 canonical 포럼 route(비교):
- L757 `forum-requests` → `ForumRequestsPage` (공통 콘솔 wrapper)
- L758 `forum-delete-requests` → `ForumDeleteRequestsPage` (공통 콘솔 wrapper)
- L760 `forum-analytics` → `ForumAnalyticsPage`

---

## 5. menu 노출 여부 — **노출됨 (메뉴 2그룹 + 대시보드 단축)**

`services/web-glycopharm/src/config/operatorMenuGroups.ts` — `forum` 그룹이 **두 곳(L82-87, L168-173, 추정 role 변형)** 에 동일 정의:
```
forum: [
  { label: '포럼 관리', path: '/operator/forum-management' },     ← mock 페이지 (첫 항목)
  { label: '포럼 신청', path: '/operator/forum-requests' },        ← canonical
  { label: '포럼 삭제 요청', path: '/operator/forum-delete-requests' }, ← canonical
  { label: '포럼 분석', path: '/operator/forum-analytics' },        ← canonical
]
```

`services/web-glycopharm/src/pages/operator/GlycoPharmOperatorDashboard.tsx`:
- L48: `{ key: 'forum', label: '포럼 운영', href: '/operator/forum-management' }` — 대시보드 단축이 **mock 페이지로 연결**

→ mock 페이지가 **operator 메뉴의 "포럼 관리"(포럼 그룹 첫 항목)** 와 **대시보드 "포럼 운영" 단축**으로 노출된다. 운영자가 실제로 진입 가능.

---

## 6. import/use 참조 여부 — **활성 참조 존재**

`OperatorForumManagementPage` / `forum-management` 참조처 (forum-management 폴더 외부):
- `App.tsx:116` lazy import
- `App.tsx:761` route element
- `operatorMenuGroups.ts:83, :169` 메뉴 path
- `GlycoPharmOperatorDashboard.tsx:48` 대시보드 단축 href

→ **죽은 import 아님.** route·menu·dashboard 4지점에서 활성 참조. "우회 진입 가능한 파일"이 아니라 **정규 메뉴 진입 페이지**.

---

## 7. mock/TODO 데이터 여부 — **mock-only 확정**

`OperatorForumManagementPage.tsx` 근거:
- L60 `const mockApplications: ForumApplication[] = [...]`
- L89 `const mockForums: Forum[] = [...]`
- L149-150 `useState(mockApplications)` / `useState(mockForums)`
- L220 `// TODO: 실제로 포럼 생성 API 호출`
- 핸들러(`handleApprove`/`handleReject`/`handleStatusChange`)는 로컬 setState만, 실제 호출 없음
- **실제 API client import 없음**: `authClient`/`@/services`/`@/api`/`forumOperatorApi`/`forumRequestApi`/`apiClient`/`axios` 일절 import 안 함 (순수 mock state)

→ 화면은 카드 + plain `<table>` UI에 mock 데이터만 렌더. 운영자가 승인/반려/상태변경을 눌러도 **백엔드에 반영되지 않는다**. 표준 컴포넌트(DataTable/ActionBar/공통 콘솔) 미사용.

---

## 8. canonical 포럼 operator 화면과의 중복 여부

`OperatorForumManagementPage`는 2탭 구조:
- **신청(applications) 탭** — canonical `ForumRequestsPage`(`/operator/forum-requests`, 공통 콘솔)와 **기능 중복** (포럼 생성 신청 승인/반려). 단 mock vs 실제 API.
- **포럼 목록(forums) 탭** — GP에 canonical 대응 화면 없음(KPA `ForumManagementPage` 카테고리 탭에 해당하나 GP엔 실제 구현 부재). 즉 forum 목록/관리는 GP에선 이 mock 페이지가 유일 surface.

→ "신청" 기능은 canonical과 **중복**(mock이 구버전), "포럼 목록 관리"는 GP에 실 구현이 없는 **빈 자리(mock)**. 메뉴상 "포럼 관리"(mock)가 "포럼 신청"(canonical)보다 위에 노출되어 운영자 혼선 가능.

---

## 9. 삭제 가능성 판정

| 분류 | 해당 | 근거 |
|------|:---:|------|
| 즉시 삭제 가능 | ❌ | route+menu+dashboard 활성 연결 — 삭제 시 404·메뉴 깨짐 |
| route/menu 정리 후 삭제 가능 | ✅ (조건부) | route(App.tsx:116,761) + 메뉴 2그룹(operatorMenuGroups:83,169) + 대시보드 단축(Dashboard:48)을 **함께** 제거하면 삭제 가능 |
| 아직 사용 중이므로 유지 | △ | "사용 중"이나 mock이라 실효 운영 가치 없음. UI 진입은 가능 |
| mock/TODO 제거 후 유지 | △ (대안) | "포럼 목록 관리" surface가 필요하다면 실제 API 구현으로 교체(KPA 카테고리 패턴 참고) |
| 판단 보류 | — | 정리 방향(제거 vs 실구현)은 사업 스코프 결정 필요 |

**결론**: 두 갈래 중 택1이 필요하며 둘 다 **코드 변경 WO**가 수반 → 본 CHECK 범위(read-only) 밖.
- **(A) 제거**: "포럼 관리"가 신청/삭제요청/분석으로 충분하다면 route+menu 2곳+dashboard 단축+파일(2개) 일괄 제거.
- **(B) 실구현**: "포럼 목록 관리"(활성/비활성/카테고리)가 GP operator에 필요하다면 mock→실 API + 공통 콘솔/표준 컴포넌트로 교체.

---

## 10. 후속 WO 후보

| WO 후보 | 범위 | 전제 |
|---------|------|------|
| `WO-O4O-GLYCOPHARM-FORUM-MANAGEMENT-ORPHAN-REMOVAL-V1` (A안) | route(App.tsx) + 메뉴 2그룹 + 대시보드 단축 + 파일 2개 제거. 신청/삭제요청/분석만 잔존 | "포럼 관리" surface 불필요 결정 시 |
| `WO-O4O-GLYCOPHARM-FORUM-MANAGEMENT-REAL-IMPL-V1` (B안) | mock→실 API + 표준 컴포넌트(공통 콘솔/DataTable) 교체. KPA `ForumManagementPage` 카테고리 패턴 참고 | "포럼 목록 관리" 필요 결정 시 |

→ **권고**: A안(제거)이 낮은 위험·높은 정합(공통화 완료 축과 일치). 단 "포럼 목록 관리" 필요 여부 **사업 확인 선행**.

---

## 11. 최종 판정

```
판정: NEEDS-FOLLOWUP

근거:
✅ orphan 성격 명확히 판정: "live route+menu+dashboard 연결된 mock-only 페이지" (죽은 파일 아님)
✅ mock/TODO 확정 (mockApplications/mockForums/TODO, 실제 API import 0)
✅ canonical(신청/삭제요청/분석)과 관계 규명: 신청 탭 중복, 포럼목록 탭은 GP 실구현 부재
⚠️ 즉시 삭제 불가 — route(App.tsx:116,761) + 메뉴 2그룹(:83,:169) + 대시보드 단축(:48) 활성 연결
⚠️ 정리 방향(A 제거 / B 실구현) = 사업 스코프 결정 필요 → 본 CHECK(read-only) 범위 밖

→ 바로 삭제할 수 없고, route/menu/dashboard 동반 정리(또는 실구현 교체) WO가 필요한 상태.
```

(판정 기준상 "실제 사용 중인 route/menu와 연결되어 바로 정리 불가" = **NEEDS-FOLLOWUP**. canonical 충돌·서비스 붕괴 위험은 없으므로 FAIL 아님.)

---

## 12. Current Structure vs O4O Philosophy Conflict Check

| 기준 | 현황 | 판정 |
|------|------|:---:|
| mock/TODO orphan이 operator UI 표준화 원칙과 충돌하는가 | mock 페이지가 메뉴 "포럼 관리"(첫 항목)·대시보드 단축으로 노출, 표준 컴포넌트 미사용, 클릭해도 백엔드 무반영 | **충돌** — 표준화·신뢰성 위반 |
| canonical 포럼 콘솔과 중복되는 낡은 구현이 남아 있는가 | "신청" 탭이 canonical `ForumRequestsPage`(공통 콘솔)와 기능 중복(mock 구버전) | **부분 충돌** |
| 삭제/정리가 1인 개발 유지보수성을 높이는가 | 538줄 mock + route+menu 2곳+dashboard 정리 시 혼선 제거·유지지점 축소 | ✅ 향상 |
| GP/K-Cos 공통화 완료 축을 다시 오염시키지 않는가 | 본 CHECK는 read-only, 공통 콘솔/wrapper 무접촉. 후속 A안도 forum-requests/delete-requests 콘솔 무변경 | ✅ 오염 없음 |

**결론**: mock orphan이 운영자에게 노출되어 표준화·신뢰성 원칙과 충돌. canonical 공통화 축은 안전(무접촉). 정리(A안 제거)가 철학·생산성에 부합하나, "포럼 목록 관리" 필요 여부 사업 확인 후 WO로 진행.

---

## 코드 변경 없음 확인

이 CHECK에서 수정/삭제한 소스/route/menu/DB/migration/package: **없음.** 신규 생성: 본 CHECK 문서 1개.
git status: 다른 세션 WIP(K-Cos App/menu/signage, POSTLOGIN IR) 미접촉.

---

*작성: Claude Code (2026-06-02)*
*read-only CHECK — 코드/파일/route/menu/API/DB/migration/package 수정·삭제 없음*
