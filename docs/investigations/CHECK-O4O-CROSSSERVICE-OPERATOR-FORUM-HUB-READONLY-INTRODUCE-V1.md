# CHECK — WO-O4O-CROSSSERVICE-OPERATOR-FORUM-HUB-READONLY-INTRODUCE-V1

> KPA Forum 운영 hub 를 공통 모듈로 추출, GlycoPharm / K-Cosmetics 에 **read-only** hub 도입.
> `/operator/forum` 을 redirect → 실제 hub page 로 승격.
>
> 선행: WO-...-FORUM-HUB-API-FEASIBILITY-VERIFY-V1 (PARTIAL PASS, `6f1ba771`)
>
> - 일자: 2026-06-16
> - 대상: `packages/operator-core-ui`, `web-kpa-society`, `web-glycopharm`, `web-k-cosmetics`. Neture 제외.
>
> ## 판정: **PASS**

---

## 1. KPA reference hub 구조

`services/web-kpa-society/src/pages/operator/OperatorForumPage.tsx` (원본):
긴급 알림 배너 + 포럼 KPI(클릭 이동) + 관리 바로가기 카드 + 최근 게시글 DataTable(수정/단건·일괄 삭제).
API: `forumAnalyticsApi.getSummary` + `forumApi.getPosts` + `forumApi.deletePost`. nav: forum-management/community 등.

---

## 2. 공통 모듈 위치

`packages/operator-core-ui/src/modules/forum-hub/`
- `OperatorForumHubPage.tsx` — presentation + 데이터 로드 + (옵션) 삭제 액션
- `types.ts` — `ForumHubClient`(getSummary/getPosts/optional deletePost), `ForumHubAccent`, `ForumHubNav`, summary/post 타입, props
- `index.ts` — public export

`package.json` exports subpath 추가: `"./modules/forum-hub": "./src/modules/forum-hub/index.ts"` (기존 forum 모듈 관례).

---

## 3. 서비스별 wrapper / config

| 서비스 | enablePostActions | accent(icon/bg) | nav.requests | community shortcut | client |
|---|---|---|---|---|---|
| KPA | **true** (삭제 유지) | `#2563eb` / `#dbeafe` | `/operator/forum-management` | `/operator/community` | getSummary+getPosts+**deletePost** |
| GlycoPharm | false (read-only) | `#0d9488` / `#ccfbf1` (teal) | `/operator/forum-requests` | `/operator/community` (존재) | getSummary+getPosts (delete 없음) |
| K-Cosmetics | false (read-only) | `#db2777` / `#fce7f3` (pink) | `/operator/forum-requests` | **미주입** (route 부재) | getSummary+getPosts (delete 없음) |

- GP/KCos `getPosts` = `fetchForumPosts({limit}).then(r => ({ data: r.data }))` (community `/forum/posts` read, optionalAuth).
- GP/KCos `client.deletePost` 미주입 → 공통 모듈이 `canDelete=false` 로 액션/선택/일괄삭제 전부 비노출.

---

## 4. GP/KCos read-only 제한 내용

- `enablePostActions` 기본 false → DataTable 의 `_actions` 컬럼(수정/삭제) 미렌더, `selectable`/선택/`ActionBar`/`BulkResultModal`/일괄삭제 전부 미노출.
- row 클릭은 `nav.postDetail`(`/forum/posts/:id`) read 이동만.
- `deletePost` adapter 자체를 주입하지 않음(이중 안전장치).

---

## 5. GP/KCos route 변경

| 서비스 | 변경 |
|---|---|
| GlycoPharm | `App.tsx`: `<Route path="forum" element={<Navigate to="/operator/forum-requests"/>}>` → `<Route path="forum" element={<OperatorForumPage/>}>` + lazy import 추가 |
| K-Cosmetics | 동일 |

기존 `forum-requests`/`forum-delete-requests`/`forum-analytics` route 불변. KPA route(`/operator/forum`) 불변.

---

## 6. GP/KCos menu 변경

`operatorMenuGroups.ts` forum 그룹 최상단에 `{ label: '포럼 운영', path: '/operator/forum' }` 추가.
canonical 순서: **포럼 운영 → 포럼 신청 관리 → 삭제 요청 → 포럼 분석**.
(GP 는 UNIFIED_MENU + legacy 두 블록 모두.) `포럼 목록 관리` 미추가.

---

## 7. 삭제 기능 미노출 확인

- GP/KCos: `enablePostActions` 미설정(false) + `deletePost` adapter 미주입 → 단건/일괄 삭제·수정 액션 코드 경로 비활성.
- 공통 모듈 `canDelete = enablePostActions && typeof client.deletePost === 'function'` → GP/KCos 양쪽 false.
- KPA 만 true (기존 동작 보존).

---

## 8. categories 미도입 확인

- `포럼 목록 관리`(forum-categories) route/page/menu 미추가. categories 모듈 미생성.
- deactivate/activate/hardDelete UI 일절 없음.

---

## 9. route/page dead link 없음 확인

- GP/KCos `/operator/forum` → 실제 page 렌더(빌드 PASS).
- nav 타깃 전부 실재 route: requests(`forum-requests`)/deleteRequests/analytics 3서비스 존재, community 는 GP 존재(주입)·KCos 부재(미주입).
- KPA hard-nav 그대로(forum-management 는 KPA redirect 존재).
- `/operator/forum-management` 등 KPA-only 경로를 GP/KCos 에 남기지 않음(GP/KCos 는 forum-requests 주입).

---

## 10. backend/API/DB/capability 무변경 확인

- backend/API/DB/migration/capability **전부 미변경**. 신규 API 호출은 기존 community posts read(optionalAuth) + 공통 analytics summary 뿐.
- mutation 추가 없음(GP/KCos). Neture 미접촉. 다른 세션 WIP 미접촉.

---

## 11. TypeScript 결과

- `@o4o/operator-core-ui`: forum-hub 에러 **0** (잔여 1건은 타 패키지 `error-handling` baseline).
- `web-kpa-society` / `web-glycopharm` / `web-k-cosmetics`: `OperatorForumPage`/`forum-hub` 관련 에러 **0**.

---

## 12. build 결과

`pnpm --filter <svc> build` (vite) — 3서비스 **성공(exit 0)**:

| 서비스 | 결과 |
|---|---|
| `@o4o/web-k-cosmetics` | ✓ 25.50s |
| `glycopharm-web` | ✓ 19.55s |
| `@o4o/web-kpa-society` | ✓ 18.54s |

---

## 13. smoke 결과 / 보류 사유

- 브라우저 smoke: 보류(배포 후 권장). build PASS + 타입 PASS + read-only 분기 정적 확인.
- 배포 후 권장: KPA `/operator/forum`(기존 동작·삭제 유지), GP/KCos `/operator/forum`(hub 렌더, 삭제 액션 없음), 3서비스 Forum 메뉴 펼침 → 포럼 운영/신청 관리/삭제 요청/분석 표시, console/pageerror/4xx 없음.

---

## 14. 후속 WO 후보

1. **WO-...-FORUM-CATEGORIES-INTRODUCE-V1** — 포럼 목록 관리(비활성/영구삭제) GP/KCos 도입. **영구삭제 정책 명시 승인 선행** (API 는 이미 ready — IR feasibility §4).
2. (옵션) GP/KCos hub 의 게시글 moderation 을 operator-safe 경로(`/forum/operator/*`)로 제공할지 정책 검토.

---

## 15. 완료 판정

- ✅ KPA hub 공통 모듈 수렴(기존 삭제 동작 보존, 회귀 없음 — 빌드 PASS)
- ✅ GP/KCos `/operator/forum` read-only hub 도입 (redirect → 실 hub 승격)
- ✅ GP/KCos 삭제/일괄삭제/수정 액션 미노출
- ✅ GP/KCos Forum 메뉴 `포럼 운영` 추가 (canonical 4항목)
- ✅ 포럼 목록 관리 미도입 / dead link 없음 / backend·API·DB·capability 무변경 / Neture·타 세션 미접촉
- ✅ TypeScript 3서비스+패키지 클린, build 3서비스 PASS

**완료 고정 가능.**
