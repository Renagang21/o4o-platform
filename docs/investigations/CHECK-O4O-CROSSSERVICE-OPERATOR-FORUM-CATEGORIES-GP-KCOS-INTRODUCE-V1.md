# CHECK — WO-O4O-CROSSSERVICE-OPERATOR-FORUM-CATEGORIES-GP-KCOS-INTRODUCE-V1

> KPA 전용 operator **포럼 목록 관리(categories)** 를 공통 모듈로 추출, GlycoPharm / K-Cosmetics 에 도입.
>
> 선행: FORUM-HUB-API-FEASIBILITY-VERIFY(`6f1ba771`, PARTIAL PASS) · FORUM-HUB-READONLY-INTRODUCE(`a245f607`)
>
> - 일자: 2026-06-16
> - 대상: `packages/operator-core-ui`, `web-kpa-society`, `web-glycopharm`, `web-k-cosmetics`. Neture 제외.
>
> ## 판정: **PASS**

---

## 1. KPA reference categories 구조

`services/web-kpa-society/src/pages/operator/ForumCategoriesManagementPage.tsx` (897L 원본):
목록 + 검색/상태필터 + DataTable(selectable) + 상세 Drawer + **활성/비활성(soft·가역) / 태그 수정 / 영구삭제(hardDelete)** + 일괄(비활성/활성/영구삭제).
hardDelete: `getDeleteCheck` 사전확인 → `hardDeleteAllowed` 일 때만 버튼 노출, 409 `blockedReasons` 표시, 확인 문구.
client: `forumOperatorApi`(getCategories/updateCategory/directDeactivate/activate/getDeleteCheck/hardDelete). copy 는 서비스 중립.

---

## 2. 공통 모듈 위치

`packages/operator-core-ui/src/modules/forum-categories/`
- `OperatorForumCategoriesPage.tsx` — KPA 화면 verbatim 추출 (client/tableId 만 파라미터화, action policy key `forum:categories` 일반화)
- `types.ts` — `ForumCategoriesClient`(6 메서드), `ForumCategoryData`, `ForumCategoryDeleteCheck`, props
- `index.ts` — public export

`package.json` exports subpath 추가: `"./modules/forum-categories": "./src/modules/forum-categories/index.ts"`.

---

## 3. 서비스별 wrapper / config

| 서비스 | client | tableId |
|---|---|---|
| KPA | `forumOperatorApi` (기존, serviceCode=kpa-society) | `kpa-forum-categories` |
| GlycoPharm | 신규 inline client (`api`=authClient.api, `/forum/operator/categories?serviceCode=glycopharm`) | `glycopharm-forum-categories` |
| K-Cosmetics | 신규 inline client (serviceCode=k-cosmetics) | `kcosmetics-forum-categories` |

GP/KCos client 는 KPA `forumOperatorApi` 의 categories subset 과 **동일 구현**(동일 axios `authClient.api`, base `/api/v1`, 동일 path/메서드, serviceCode 만 상이) → 응답/에러(409) shape 동일.

---

## 4. GP/KCos route 추가 내용

| 서비스 | route |
|---|---|
| GlycoPharm | `App.tsx`: `<Route path="forum-categories" element={<ForumCategoriesManagementPage/>}>` + lazy import |
| K-Cosmetics | 동일 |

기존 forum-requests/forum-delete-requests/forum-analytics/forum(hub) route 불변. KPA route 불변.

---

## 5. GP/KCos menu 추가 내용

`operatorMenuGroups.ts` forum 그룹: 포럼 신청 관리 다음에 `{ label: '포럼 목록 관리', path: '/operator/forum-categories' }` 삽입.
canonical 5항목: **포럼 운영 → 포럼 신청 관리 → 포럼 목록 관리 → 삭제 요청 → 포럼 분석**.
(GP UNIFIED_MENU + legacy 두 블록.) KPA 는 기존 canonical 유지(이미 5항목).

---

## 6. GP/KCos hub shortcut 보정 내용

`forum-hub` 모듈 `ForumHubNav` 에 optional `categories?` 추가 + 조건부 ShortcutCard(`포럼 목록 관리`, List 아이콘).
3서비스 hub wrapper(KPA/GP/KCos)에 `categories: '/operator/forum-categories'` 주입 → hub 에서 목록 관리 진입 가능.
미주입 시 미렌더(dead-nav 방지). hub 의 read-only posts 정책은 변경 없음.

---

## 7. destructive action 안전장치

- **비활성화**: soft delete(가역) — "기존 게시글/댓글 삭제되지 않음 / soft delete" 문구 + 사유 필수.
- **활성화**: 가역 복구 — confirm.
- **영구삭제(hardDelete)**: delete-check 사전 확인 → `hardDeleteAllowed=true` 일 때만 버튼 렌더, 사유 필수, "복구할 수 없습니다" 경고. 차단 시 `blockedReasons` + "정상 게시글 먼저 삭제" 안내.
- **일괄 영구삭제**: prompt(사유) + confirm(복구 불가) + 항목별 delete-check 후 차단 항목 skipped.
- 전부 KPA 원본 그대로 보존(공통 모듈에 verbatim 이식).

---

## 8. hardDelete 409 차단 정책 보존 확인

- backend `DELETE /categories/:id/hard` 는 정상 게시글 1건↑이면 409(`HARD_DELETE_BLOCKED`) 반환(미변경).
- 공통 콘솔: `err?.response?.data?.data?.blockedReasons` 표시(`삭제 불가: ...`). GP/KCos client 가 동일 axios 라 에러 shape 동일 → 메시지 정상.
- backend 안전장치 우회 없음. UI 는 차단 사유를 사용자에게 노출.

---

## 9. 게시글 삭제 미추가 확인

- 본 작업은 **카테고리(포럼) 관리**만. 게시글 단건/일괄 삭제 기능 없음.
- GP/KCos hub 의 posts delete 도 비활성 그대로(이전 WO read-only 유지).

---

## 10. backend/API/DB/capability 무변경 확인

- backend/API/DB/migration/capability **전부 미변경**. categories endpoint 신규 생성 없음. serviceCode guard 변경 없음. hardDelete 정책 변경 없음.
- GP/KCos 는 기존 공통 endpoint 를 serviceCode 만 바꿔 호출(프론트 client 추가). Neture 미접촉. 다른 세션 WIP 미접촉.

---

## 11. TypeScript 결과

- `@o4o/operator-core-ui`: forum-categories/forum-hub 에러 **0** (잔여 1건은 타 패키지 `error-handling` baseline).
- `web-kpa-society` / `web-glycopharm` / `web-k-cosmetics`: `ForumCategories`/`forum-categories` 관련 에러 **0**.

---

## 12. build 결과

`pnpm --filter <svc> build` (vite) — 3서비스 **성공(exit 0)**:

| 서비스 | 결과 |
|---|---|
| `@o4o/web-k-cosmetics` | ✓ 21.11s |
| `glycopharm-web` | ✓ 20.18s |
| `@o4o/web-kpa-society` | ✓ 19.61s |

Tailwind: 공통 모듈이 Tailwind-heavy(rose/`bg-black/`/arbitrary/`line-clamp`)라 3서비스 `tailwind.config.js` content 에 `operator-core-ui` 글롭 추가(순수 additive — 누락 클래스 purge 회귀 차단, 기존 렌더 영향 없음).

---

## 13. smoke 결과 / 보류 사유

- 브라우저 smoke: 보류(배포 후 권장). build PASS + 타입 PASS + verbatim 추출.
- 배포 후 권장: KPA/GP/KCos `/operator/forum-categories` 목록/empty 정상, Forum 메뉴 canonical 5항목, hub 에서 포럼 목록 관리 shortcut, 비활성/활성/영구삭제 버튼 표시. **운영 데이터에서 실제 destructive action 실행 금지(버튼 표시만 확인)**, console/4xx 없음.

---

## 14. 후속 WO 후보

1. (옵션) forum-categories accent 를 서비스별 색으로 분기(현재 KPA 기준 blue 고정 — 기능 동일).
2. (옵션) categories 와 hub/analytics 간 cross-link UX 정리.

---

## 15. 완료 판정

- ✅ KPA categories 공통 모듈 수렴(verbatim, 안전장치 보존, 빌드 PASS)
- ✅ GP/KCos `/operator/forum-categories` route/page 도입 (serviceCode client adapter, backend 무변경)
- ✅ GP/KCos Forum 메뉴 canonical 5항목 완성, hub 에 포럼 목록 관리 shortcut
- ✅ hardDelete 409 차단·확인 문구 보존, 게시글 삭제 미추가
- ✅ backend/API/DB/capability 무변경, Neture·타 세션 미접촉
- ✅ TypeScript 3서비스+패키지 클린, build 3서비스 PASS

**완료 고정 가능.** → Forum 축 3서비스 parity 실질 완료.
