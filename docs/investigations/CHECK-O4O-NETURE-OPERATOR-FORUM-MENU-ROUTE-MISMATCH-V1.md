# CHECK-O4O-NETURE-OPERATOR-FORUM-MENU-ROUTE-MISMATCH-V1

**작성 일자**: 2026-06-02
**조사 환경**: HEAD (main) `dfbf9f5a5` 시점 (read-only)
**작업 성격**: read-only CHECK — 코드/UI/route/menu/API/DB/migration/package 수정 없음
**목적**: Neture operator 포럼/커뮤니티 메뉴 path가 실제 App route와 정합하는지 확인 (IR 부수 발견 검증)

---

## 1. CHECK 개요

`IR-O4O-NETURE-FORUM-CONSOLE-CONVERGENCE-V1`에서 Neture operator 포럼 메뉴와 route 불일치 가능성(메뉴 `/operator/n-delete-requests`·`/operator/n-analytics` vs route `/operator/forum-delete-requests`·`/operator/forum-analytics`)이 부수 발견으로 기록되었다. 본 CHECK는 이를 현재 main 기준으로 검증한다.

**핵심 판정**: **PASS** — 현재 커밋된 코드에서 **forum/community operator 메뉴 3항목의 path는 실제 route와 완전 일치**한다. IR이 의심한 `n-delete-requests`/`n-analytics` 경로는 **커밋 이력에 존재한 적이 없으며**(`git log -S` 무결과), 현재 작업트리에도 없다. 404 가능 경로 없음. (IR 시점 관측은 동시 세션의 일시적 working-tree 상태이거나 오독으로 판단.)

---

## 2. 사전 git 상태

```
git rev-list --left-right --count HEAD...origin/main → 0  0
git status --short (non-png): (clean)
```

작업트리 clean, 다른 세션 WIP 없음. 본 CHECK는 신규 CHECK 문서 1개만 생성.

---

## 3. 조사 대상 파일

- `services/web-neture/src/config/operatorMenuGroups.ts` (메뉴 정의 + `filterMenuByRole`)
- `services/web-neture/src/App.tsx` (route 정의, operator+admin 이중 마운트)
- `services/web-neture/src/components/layouts/OperatorLayoutWrapper.tsx` (operator 메뉴 소비)

---

## 4. Neture operator forum menu 현황

`operatorMenuGroups.ts` `forum` 그룹 (2개 정의 위치 L79-81, L205-207, 동일):

| label | path |
|-------|------|
| 포럼 신청 | `/operator/community` |
| 삭제 요청 | `/operator/forum-delete-requests` |
| 포럼 분석 | `/operator/forum-analytics` |

(참고) `content` 그룹 L73: `커뮤니티 광고` → `/operator/community-admin`, **`adminOnly: true`**.

---

## 5. Neture App route 현황

`App.tsx`:

| route | 컴포넌트 |
|-------|---------|
| `/operator/community` (L984) | `ForumManagementPage` (신청, 공통 콘솔 wrapper) |
| `/operator/forum-delete-requests` (L985) | `ForumDeleteRequestsPage` (공통 콘솔 wrapper) |
| `/operator/forum-analytics` (L986) | `ForumAnalyticsPage` |
| `/admin/community` (L902) | `ForumManagementPage` (이중 마운트) |
| `/admin/forum-delete-requests` (L903) | `ForumDeleteRequestsPage` |
| `/admin/forum-analytics` (L904) | `ForumAnalyticsPage` |
| `/admin/community-admin` (L947) | `CommunityManagementPage` |

→ `/operator/community-admin` route는 **존재하지 않음** (admin 측 `/admin/community-admin`만 존재).

---

## 6. menu ↔ route 정합 매트릭스

| 메뉴 항목 | menu path | 실제 route | 정합 |
|-----------|-----------|-----------|:---:|
| 포럼 신청 | `/operator/community` | ✅ 존재 (ForumManagementPage) | ✅ |
| 삭제 요청 | `/operator/forum-delete-requests` | ✅ 존재 | ✅ |
| 포럼 분석 | `/operator/forum-analytics` | ✅ 존재 | ✅ |
| (참고) 커뮤니티 광고 (adminOnly) | `/operator/community-admin` | ❌ /operator 없음 (/admin만) | △ (아래 §7) |

**forum 그룹 3항목 모두 정합 ✅.** IR이 의심한 `n-delete-requests`/`n-analytics`는 메뉴·route 어디에도 없음.

---

## 7. 404 가능 경로 여부

- forum 그룹(신청/삭제요청/분석): **404 경로 없음** — 전부 실재 route.
- `커뮤니티 광고` → `/operator/community-admin` (no /operator route): **실질 404 아님**. 근거:
  - `content` 그룹의 해당 항목은 `adminOnly: true`.
  - operator 메뉴는 `OperatorLayoutWrapper`에서 `filterMenuByRole(UNIFIED_MENU, false)` 로 구성 ([L24](services/web-neture/src/components/layouts/OperatorLayoutWrapper.tsx#L24)).
  - `filterMenuByRole(menu, isAdmin)` 은 `.filter(item => !item.adminOnly || isAdmin)` ([operatorMenuGroups.ts:113](services/web-neture/src/config/operatorMenuGroups.ts#L113)). `isAdmin=false` → **adminOnly 항목 제외**.
  - 따라서 `커뮤니티 광고`(adminOnly)는 **operator 사이드바에 렌더되지 않음** → `/operator/community-admin` 으로 이동할 진입점이 없음. admin은 별도 `admin` 그룹의 `/admin/community-admin`(route 존재) 사용.
  - → 클릭 가능한 live 404 아님. **저우선 cosmetic 관찰**(adminOnly 항목의 path가 /operator 접두로 적혀 있으나 operator에서 미렌더)일 뿐.

---

## 8. legacy redirect/alias 여부

- forum 경로에 대한 legacy redirect/alias 불필요(전부 직접 route 존재).
- `n-delete-requests`/`n-analytics` 에 대한 redirect도 없음(애초에 그런 경로가 없으므로 불필요).

---

## 9. 공통 콘솔 수렴 작업 영향 여부

`WO-O4O-NETURE-FORUM-CONSOLE-CONVERGENCE-APPLY-V1`(`dfbf9f5a5`)은 `ForumManagementPage.tsx`·`ForumDeleteRequestsPage.tsx` **2개 파일만** thin wrapper로 변경했고 route/menu/guard는 미변경(해당 커밋 stat로 확인됨). 본 CHECK 시점 확인:
- 세 화면(`ForumManagementPage`/`ForumDeleteRequestsPage`/`ForumAnalyticsPage`) 모두 operator+admin route에 정상 연결.
- 공통 콘솔 수렴이 메뉴-route 정합을 깨뜨리지 않음. operator는 신청/삭제요청/분석에 안정 접근 가능.

---

## 10. 수정 필요성 판정

| 항목 | 판정 |
|------|------|
| forum 메뉴 path 수정 | **불필요** — 이미 route와 정합 |
| route alias/redirect 추가 | **불필요** |
| menu label 정리 | **불필요** (IR이 본 "n 신청/n 분석"은 현재 "포럼 신청/포럼 분석", 정상) |
| 커뮤니티 광고 adminOnly path(/operator→/admin) | **선택(저우선)** — operator 미렌더로 실害 없음. 일관성 위해 `/admin/community-admin` 로 통일하거나 adminOnly path 규약 정리 가능하나 필수 아님 |

→ IR이 의심한 mismatch는 **존재하지 않음**. 단순 오타/잔재 아님, n branding drift도 현재 없음.

---

## 11. 후속 WO 후보

- **필수 후속: 없음** (forum 메뉴-route 정합).
- (선택, 저우선) `커뮤니티 광고` adminOnly 항목의 path 표기를 `/admin/community-admin` 으로 통일하는 cosmetic 정리 — 단독 WO 가치는 낮고, 다른 메뉴 정리 작업 시 묶음 처리 권장. 본 CHECK는 후보로만 기록.

---

## 12. 최종 판정

```
판정: PASS

근거:
✅ forum operator 메뉴 3항목(포럼 신청/삭제 요청/포럼 분석) path = 실제 route 완전 일치
✅ IR 의심 경로(n-delete-requests/n-analytics) 커밋 이력·현재 모두 부재 (git log -S 무결과)
✅ 404 가능 경로 없음 (forum 그룹)
✅ 공통 콘솔 수렴(dfbf9f5a5)이 route/menu/guard 미변경 — operator 접근 안정
△ 커뮤니티 광고 adminOnly path는 /operator 접두이나 filterMenuByRole(false)로 operator 미렌더 → 실질 404 아님 (저우선 cosmetic)

→ 메뉴-route 정합 확인됨. 필수 수정 없음.
```

---

## 13. Current Structure vs O4O Philosophy Conflict Check

- **Neture "n" branding이 route 정합성을 해치는가?** ❌ 아니오. 현재 메뉴 label은 "포럼 신청/삭제 요청/포럼 분석"이며 path는 canonical `/operator/community`·`/operator/forum-*`로 정합. n branding이 route를 깨뜨리지 않음.
- **menu label ↔ route path가 운영 경험을 혼란시키는가?** ❌ forum 그룹은 명확·정합. (cosmetic: adminOnly 항목 path 접두만 비일관, 단 미렌더로 사용자 노출 없음.)
- **공통 콘솔 수렴 이후 operator가 신청/삭제요청/분석에 안정 접근 가능한가?** ✅ 가능. 세 화면 모두 operator+admin route 연결 유지.
- **단순 구현 편차 방치로 운영자 UX를 해치는가?** ❌ forum 영역은 정합. 유일한 잔여는 저우선 cosmetic(adminOnly path 표기)으로 운영자에게 노출되지 않음.

**결론**: O4O 철학과 충돌 없음. IR이 우려한 navigation 정합 문제는 현재 코드에 존재하지 않으며, operator 포럼 운영 동선은 공통 콘솔 수렴 이후에도 안정적이다.

---

## 코드 변경 없음 확인

이 CHECK에서 수정한 소스/route/menu/DB/migration/package: **없음.** 신규 생성: 본 CHECK 문서 1개.
git status: 다른 세션 WIP 미접촉.

---

*작성: Claude Code (2026-06-02)*
*read-only CHECK — 코드/route/menu/API/DB/migration/package 수정 없음*
