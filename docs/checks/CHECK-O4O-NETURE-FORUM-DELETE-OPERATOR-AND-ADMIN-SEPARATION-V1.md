# CHECK-O4O-NETURE-FORUM-DELETE-OPERATOR-AND-ADMIN-SEPARATION-V1

> Neture 포럼 삭제를 **Operator 운영 삭제(soft, 복구 가능)** 와 **Admin 완전 삭제(hard, 복구 불가)** 로 분리한다.
> 원칙: **Operator의 삭제 = 운영에서 내리기(복구 가능) / Admin의 완전 삭제 = 데이터 영구 제거(복구 불가)**

- WO: `WO-O4O-NETURE-FORUM-DELETE-OPERATOR-AND-ADMIN-SEPARATION-V1`
- 상태: 구현 완료 · typecheck PASS · (배포/스모크 별도 기록)

---

## 1. 기존 구조 (조사 결과)

- "포럼" = `forum_category_requests` row (엔티티 `ForumCategoryRequest`, `@o4o/forum-core`). `forum_category` 테이블·`Forum` 엔티티는 이미 제거됨.
- 삭제 상태는 전용 컬럼 없이 **`status`** (활성 `completed` / 소프트삭제 `archived`) + **`metadata` jsonb**(`deleteRequestStatus`, `directDeactivatedAt/By/Reason`, `archivedAt`, `reactivatedAt` 등) 로 표현.
- 삭제 요청 흐름: 소유자 요청(`metadata.deleteRequestStatus='pending'`) → Operator 승인(`archived`) / 반려(상태 유지). **별도 테이블 없음**.
- 삭제 로직은 **4개 서비스(KPA/GlycoPharm/K-Cosmetics/Neture) 공유** 라우터 `apps/api-server/src/routes/forum/operator-forum.routes.ts`(mount `/api/v1/forum/operator`)에 존재. `serviceCode` 쿼리 파라미터 + operator 역할로 서비스 격리.
- FK/cascade: `forum_post.forum_id`=SET NULL, `forum_comment.postId`→`forum_post`=CASCADE, `forum_category_members`·`forum_post_like`·`forum_notifications`는 포럼 FK 없음(수동 정리 필요).

---

## 2. Operator 변경

- 메뉴: `삭제 요청` → **`포럼 삭제`** (`services/web-neture/src/config/operatorMenuGroups.ts`, path `/operator/forum-delete`). 관리자에게는 같은 그룹에 `삭제된 포럼`(→`/admin/forum-deleted`, adminOnly) 노출.
- 신규 페이지 `ForumDeletePage.tsx` (2-탭):
  - **삭제 요청** — 기존 `OperatorForumDeleteRequestsConsolePage` 보존(승인/반려/일괄).
  - **포럼 직접 삭제** — 공유 `OperatorForumCategoriesPage` 재사용. **`disableHardDelete`** 로 완전 삭제 미노출(soft delete=비활성화만), **`requireNameConfirmForNonEmpty`** 로 게시글 있는 포럼 비활성화 시 포럼명 재입력 요구.
- `forumApi.ts` `forumOperatorApi` 에 categories 어댑터(getCategories/updateCategory/directDeactivate/activate) 추가. `getDeleteCheck/hardDelete` 는 인터페이스 충족용이며 **Operator UI 에서 호출되지 않음**.
- 사용자 화면 미노출: soft delete(`archived`) 시 공개 목록/검색/글쓰기/가입에서 제외(기존 동작), 데이터 보존, Admin 에서 복구 가능.

---

## 3. Admin 변경

- 신규 페이지 `services/web-neture/src/pages/admin/ForumDeletedManagementPage.tsx` (route `/admin/forum-deleted`, AdminRoute). 2-탭: **삭제된 포럼** / **삭제 이력**.
  - 삭제된 포럼: `archived` 목록 + 삭제유형/사유/처리자/삭제일 + 게시글/댓글/회원 카운트, 검색·유형 필터.
  - 복구: `POST /forum/admin/forums/:id/restore` — slug/name 충돌 시 **차단(409, 자동변경 금지)**, 생성자 계정 부재는 경고.
  - 완전 삭제: 사전점검(`GET /forum/admin/forums/:id/hard-delete-check`) → **포럼명 재입력 + 사유 필수 + "복구 불가" 체크 + 정상 게시글 잔존 시 409 차단** → `DELETE /forum/admin/forums/:id/hard`.
  - 삭제 이력: `GET /forum/admin/audit-logs` (action_logs).
- 메뉴: `getAdminMenu()` content 그룹(커뮤니티·콘텐츠 운영)에 `삭제된 포럼` 추가.

### 권한 분리 (결정 A — 백엔드 분리)

- 신규 **admin-scoped** 라우터 `apps/api-server/src/routes/forum/admin-forum.routes.ts` (mount `/api/v1/forum/admin`).
- 서버 가드 `requireServiceAdmin` = `isServiceAdmin(serviceCode)` → **`neture:admin` 또는 `platform:super_admin`** 만 통과. 일반 operator 는 URL/API 직접 호출로도 완전 삭제 불가(UI 숨김만으로 통제하지 않음).
- 기존 공통 `DELETE /forum/operator/categories/:id/hard` 는 **역할 게이트/제거 변경 없음**(KPA/GP/KCos 호환). Neture Admin UI 는 공통 operator hard-delete 가 아닌 **admin 전용 API 만** 호출.
- Admin 완전 삭제는 **`archived` 상태만** 대상(활성 포럼 차단, `NOT_ARCHIVED`).

---

## 4. 데이터 처리 (결정 C — cleanup 보강 + 공유 함수)

- 공유 정리 함수 `apps/api-server/src/services/forum/forumHardDelete.ts` → `purgeForumAndDependents(manager, forum)` 를 **공통 operator hard-delete 와 Neture Admin hard-delete 가 재사용**.
- 트랜잭션 내 정리 대상(모두 명시적 식별자 기준):
  - `forum_post`(forum_id) + 해당 게시글의 `forum_comment` / `forum_post_like`
  - `forum_notifications` 중 위 게시글/댓글에 연결된 것(**postId/commentId 기준만**, userId 기준 광범위 삭제 금지)
  - `forum_category_members`(forum_category_id)
  - `forum_category_requests` row
- 정상 게시글 잔존 시 **409 차단**(고아 게시글만 자동 정리) — 기존 안전장치 보존.
- 반환 `affectedCounts` 를 응답·감사로그에 포함.

---

## 5. 감사 로그

- 공통 `action_logs`(`@o4o/action-log-core` `ActionLogService.logSuccess`) 재사용(신규 체계 없음).
- 액션 키: `forum.delete_request.approve` / `forum.operator.soft_delete` / `forum.operator.hard_delete` / `forum.admin.restore` / `forum.admin.hard_delete`.
- 기록 meta: `forumId, forumName, serviceCode, action, reason, actorUserId, actorRoles, requestedBy, beforeStatus, afterStatus, affectedCounts`.
- **완전 삭제는 row 제거 전 스냅샷**(forumName/serviceCode/사유/실행자/영향 건수)을 확보 후 기록. 감사 실패는 주 업무를 롤백하지 않음(경고 로깅).

---

## 6. 검증

- typecheck: api-server `tsc --noEmit` — forum 관련 오류 0 (기존 `src/scripts/*` drug-otc 오류는 무관/미커밋). operator-core-ui / web-neture — forum 관련 오류 0.
- build/deploy/smoke: (아래 별도 기록 — 배포 후 갱신)
  - [ ] Neture Operator `포럼 삭제` 2탭 표시 + 삭제 요청 승인/반려
  - [ ] Neture Operator 직접 soft delete(비활성화) + 사용자 화면 미노출
  - [ ] Neture Admin `삭제된 포럼` 목록/복구/완전삭제 + 삭제 이력
  - [ ] 일반 Operator 의 admin hard-delete API 호출 403 차단
  - [ ] KPA/GlycoPharm/K-Cosmetics 기존 포럼 삭제(카테고리 관리/삭제요청) 회귀

---

## 7. 타 서비스 영향 (공유 모듈)

- 백엔드 공통 라우터(operator-forum.routes.ts hard-delete) 동작 변경: likes/notifications 정리 추가 + 트랜잭션 + 감사로그. **정상 게시글 차단 가드 동일** → KPA/GP/KCos 회귀 검증 필요.
- `@o4o/operator-core-ui` forum-categories 콘솔에 `disableHardDelete`/`requireNameConfirmForNonEmpty` **옵션 추가(기본 off)** → KPA/GP/KCos 동작 불변.
- serviceCode 격리로 Neture 삭제가 타 서비스 포럼 데이터에 영향 없음.

---

## 8. 변경 파일

**백엔드**
- `apps/api-server/src/services/forum/forumHardDelete.ts` (신규)
- `apps/api-server/src/routes/forum/admin-forum.routes.ts` (신규)
- `apps/api-server/src/routes/forum/operator-forum.routes.ts` (수정: purge 재사용 + 감사로그)
- `apps/api-server/src/routes/forum/forum.routes.ts` (수정: `/admin` 마운트)

**공유 패키지**
- `packages/operator-core-ui/src/modules/forum-categories/types.ts` (옵션 추가)
- `packages/operator-core-ui/src/modules/forum-categories/OperatorForumCategoriesPage.tsx` (옵션 반영)

**web-neture**
- `services/web-neture/src/services/forumApi.ts` (categories 어댑터 + forumAdminApi)
- `services/web-neture/src/config/operatorMenuGroups.ts` (메뉴)
- `services/web-neture/src/pages/operator/ForumDeletePage.tsx` (신규) + `pages/operator/index.ts`
- `services/web-neture/src/pages/admin/ForumDeletedManagementPage.tsx` (신규)
- `services/web-neture/src/App.tsx` (라우트/lazy import)
