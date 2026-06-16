# CHECK — WO-O4O-CROSSSERVICE-OPERATOR-FORUM-HUB-CATEGORIES-GP-KCOS-INTRODUCE-V1

> KPA 전용 operator **Forum 운영 hub** + **포럼 목록 관리** 화면을 GlycoPharm / K-Cosmetics 에 이식 시도.
>
> 선행: FORUM-MENU-LABEL-ORDER-PARITY(`80a869ec8`) · FORUM-BASE-ROUTE-ALIAS-PARITY(`03acbaae4`) · FORUM-ANALYTICS-COMMONIZE(`46e639fa4`)
>
> - 일자: 2026-06-16
> - 대상: KPA(reference) / GlycoPharm / K-Cosmetics. Neture 제외.
>
> ## 판정: **HOLD** (코드 변경 없음 — 조사 단계 중단)
>
> 조사 결과 두 화면 모두 WO 의 중단 기준에 해당. 무리한 route/page 신설은 404(dead link)·403(권한)·정책 미확정 destructive mutation 노출 위험. 아래 근거와 권장 단계화 경로 기록.

---

## 1. KPA reference 화면 조사 결과

### 1-1. Forum 운영 hub — `services/web-kpa-society/src/pages/operator/OperatorForumPage.tsx`
- route: `/operator/forum` (`routes/OperatorRoutes.tsx:139`)
- 구조: 긴급 알림 배너 + 포럼 KPI(클릭 이동) + 관리 바로가기 카드 + **최근 게시글 DataTable(수정/단건·일괄 삭제)**
- 상태/액션: `DataTable` + `useBatchAction` + `defineActionPolicy`/`buildRowActions` (operator-ux-core) — stateful, **mutation 포함**

### 1-2. 포럼 목록 관리 — `services/web-kpa-society/src/pages/operator/ForumCategoriesManagementPage.tsx`
- route: `/operator/forum-categories` (`OperatorRoutes.tsx:84`)
- 기능: 카테고리(포럼) 목록 + **directDeactivate / activate / hardDelete(영구 삭제) / 일괄 비활성·영구삭제 / updateCategory(tags)**
- → **destructive mutation 중심** 화면 (`confirm('영구 삭제합니다. 복구할 수 없습니다')`).

---

## 2. KPA hub / categories 사용 API

| 화면 | API | endpoint 성격 | mutation |
|---|---|---|---|
| hub KPI | `forumAnalyticsApi.getSummary()` | 공통 `/api/v1/forum/operator/analytics/*?serviceCode=` | 조회 |
| hub 최근글 | `forumApi.getPosts({limit})` | **community-scoped** `/api/v1/{service}/forum/posts` | 조회 |
| hub 삭제 | `forumApi.deletePost(id)` (단건+일괄) | `DELETE /api/v1/{service}/forum/posts/:id` | **삭제** |
| categories | `forumOperatorApi.getCategories/updateCategory/directDeactivate/activate/getDeleteCheck/hardDelete` | 공통 `/api/v1/forum/operator/categories/*?serviceCode=` | **비활성/영구삭제** |

---

## 3. GP/KCos API 지원 여부

| 항목 | GlycoPharm | K-Cosmetics | 판정 |
|---|---|---|---|
| analytics summary (`forumAnalyticsApi`) | ✅ 보유 | ✅ 보유 | OK |
| community 포럼 posts **read** (`/api/v1/{svc}/forum/posts`) | ✅ 존재 (`CommunityMainPage`, `services/forumApi.ts`) | ✅ 존재 (`services/forumApi.ts`) | 읽기 가능 |
| operator 관점 posts **delete** client | ❌ 프론트 client 없음 | ❌ 없음 | 미지원 + 권한 미확정 |
| forum **categories** operator client (getCategories/updateCategory/deactivate/hardDelete) | ❌ 없음 | ❌ 없음 | 프론트 미보유 |
| forum categories operator backend (공통 namespace) | 추정 존재(serviceCode) — **미검증** | 추정 존재 — 미검증 | 정책 미확정 |

> GP/KCos 의 forum operator client 는 requests/delete-requests/analytics 콘솔의 adapter 형태로만 존재. posts/categories 용 client 는 부재.

---

## 4. 중단 기준 해당 항목

- **#1 (KPA 전용 결합)**: hub 의 최근글/삭제는 community-scoped `forumApi`(KPA `/api/v1/kpa/forum/posts`)에 결합. GP/KCos 프론트 client 부재.
- **#3 (mutation 중심 + 정책 확인 필요)**: 포럼 목록 관리가 **영구 삭제(hardDelete)/비활성** 중심. GP/KCos 에 destructive operator surface 도입은 사업/정책 결정 사항.
- **#4 (route 추가 시 dead link/권한 오류)**: hub 가 `/operator/forum-management`(KPA-only) · `/operator/community`(KCos 부재)로 hard-nav → 그대로 이식 시 dead link. posts delete 는 GP/KCos operator 권한 미확정 → 403 위험.

→ 하나라도 해당하면 HOLD/PARTIAL 보고가 WO 지침. 본 건은 #1·#3·#4 복합 → **HOLD**.

---

## 5. backend/API/DB/capability 무변경 확인

- 본 작업에서 코드 변경 없음 (조사만 수행). backend/API/DB/migration/capability/route/menu **전부 미변경**.
- Neture 미접촉. 다른 세션 WIP 미접촉.

---

## 6. 조회/수정 기능 범위 확인

- hub: 조회(KPI/최근글) + **삭제 mutation** 혼재.
- categories: **비활성/영구삭제 mutation** 중심.
- → 단순 조회 화면이 아니므로 "안전 조회 이식"으로 단축 불가. 픽셀 복제 시 destructive 동작까지 따라옴.

---

## 7. TypeScript / build 결과

- 코드 변경 없음 → 해당 없음 (현 origin/main 상태 유지).

---

## 8. smoke 결과 / 보류 사유

- 코드 변경 없음 → smoke 해당 없음.

---

## 9. HOLD 사유 요약

1. hub 의 posts read/delete 가 community-scoped `forumApi` 에 결합 — GP/KCos 프론트 client 부재 + operator delete 권한 미확정(403 위험).
2. categories 가 영구삭제(hardDelete)/비활성 중심 destructive surface — GP/KCos 도입은 정책 결정 선행 필요.
3. hub hard-nav 타깃(`/operator/forum-management`, `/operator/community`)이 GP/KCos 에 부재 — 그대로 이식 시 dead link.
4. backend(공통 categories operator endpoint)의 GP/KCos serviceCode 지원은 **미검증** — 검증 없이 route 노출 시 403/빈화면 위험.

---

## 10. 후속 WO 후보 (권장 단계화)

순서대로 분리 진행 권장 (한 번에 이식 금지):

1. **WO-...-FORUM-HUB-API-FEASIBILITY-VERIFY-V1** — GP/KCos 의 (a) operator posts delete 권한, (b) 공통 `/api/v1/forum/operator/categories` serviceCode 지원, (c) operator 가 community posts 삭제 가능 여부를 backend/API 레벨로 검증. read-only 검증.
2. **WO-...-FORUM-HUB-READONLY-INTRODUCE-V1** (feasibility PASS 시) — KPA hub 를 공통 모듈화하되 **삭제 mutation 제거 + nav 타깃 parametrize**(forum-management→forum-requests, KCos 는 community shortcut 제외)한 read-only 운영 hub 로 GP/KCos 도입. `/operator/forum` redirect → 실 hub 승격.
3. **WO-...-FORUM-CATEGORIES-INTRODUCE-V1** — 영구삭제/비활성 정책을 GP/KCos 에 대해 명시 승인 후 categories 도입 (별도 사업 결정 선행).

> hub 의 삭제 기능을 GP/KCos 에 그대로 줄지, read-only 로 줄지는 **사업 정책 결정**. 본 WO 범위에서 단독 결정하지 않음.

---

## 11. 완료 판정

- ⛔ **HOLD** — GP/KCos 이식 코드 미작성.
- ✅ 조사·근거·단계화 경로 기록 완료. backend/API/DB/capability/route/menu/Neture 전부 무변경.
- 다음: §10-1 feasibility 검증 WO 부터 진행 권장.
