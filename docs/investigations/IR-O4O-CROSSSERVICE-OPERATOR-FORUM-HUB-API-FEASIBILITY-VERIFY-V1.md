# IR — WO-O4O-CROSSSERVICE-OPERATOR-FORUM-HUB-API-FEASIBILITY-VERIFY-V1

> GlycoPharm / K-Cosmetics 에 Forum 운영 hub + 포럼 목록 관리 도입 가능성을 backend/API/권한 관점 **read-only** 로 검증.
> 실제 mutation(DELETE/hardDelete/deactivate/activate) 호출 없음 — 코드 정적 분석만 수행.
>
> 선행: WO-...-FORUM-HUB-CATEGORIES-GP-KCOS-INTRODUCE-V1 (HOLD, `46d4039d6`)
>
> - 일자: 2026-06-16
> - 대상: KPA(reference) / GlycoPharm / K-Cosmetics. Neture 제외.
>
> ## 판정: **PARTIAL PASS**
> - read-only hub 도입 **가능(PASS)** — analytics summary + posts read 만으로 구성 가능.
> - hub 의 **게시글 삭제 mutation 은 제외 필요** — 서비스 operator 는 community post 삭제 권한 없음(author/platform-admin 전용).
> - categories 도입은 **API/guard 상 GP/KCos 지원 확인(PASS)** 이나, destructive(영구삭제/비활성) → **정책 결정 선행(별도 WO)**.

---

## 1. 조사 대상 파일

**Backend**
- `apps/api-server/src/routes/forum/operator-forum.routes.ts` (공통 operator: requests/delete-requests/categories/analytics)
- `apps/api-server/src/routes/forum/forum.routes.ts` (community: posts/categories/membership)
- `apps/api-server/src/controllers/forum/ForumPostController.ts` (`deletePost` 권한)
- `utils/role.utils.ts` (`isServiceOperator`, `isPlatformAdmin`)

**Frontend client**
- `services/web-kpa-society/src/api/forum.ts` (`forumApi`, `forumOperatorApi`, `forumAnalyticsApi`)
- `services/web-glycopharm/src/services/forumApi.ts`, `services/web-k-cosmetics/src/services/forumApi.ts`

**Pages/routes**
- KPA `OperatorForumPage.tsx`, `ForumCategoriesManagementPage.tsx`, `routes/OperatorRoutes.tsx`
- GP/KCos `App.tsx` forum routes

---

## 2. GP/KCos posts **read** 가능 여부 — ✅ PASS

- 라우트: `GET /api/v1/{service}/forum/posts` → `forum.routes.ts:56` `optionalAuth` (공개, 로그인 선택).
- GP/KCos 프론트에 community 포럼 posts read 경로 존재(`CommunityMainPage`, `services/forumApi.ts`).
- → GP/KCos operator 가 최근 게시글 조회 가능. (인증 operator 는 당연 통과)

---

## 3. GP/KCos posts **delete** 가능 여부 — ❌ 서비스 operator 불가 (코드 판정, 호출 없음)

- 라우트: `DELETE /api/v1/{service}/forum/posts/:id` → `forum.routes.ts:71` `authenticate` + `ForumPostController.deletePost`.
- 권한 검사(`ForumPostController.ts:448`):
  ```
  if (post.authorId !== userId && !isPlatformAdmin(userRoles)) → 403
  ```
  주석: "Author-only self-service; platform admin/super_admin retained as governance override. **Service operator moderation is handled via dedicated /forum/operator/* endpoints.**"
- → **순수 서비스 operator 는 community 게시글 삭제 불가(403)**. KPA hub 의 `forumApi.deletePost` 가 현재 동작하는 것은 테스트 계정이 platform admin/super_admin(거버넌스 override)이거나 작성자일 때뿐.
- **결론: 이식 hub 에서 게시글 삭제(단건/일괄)는 제외해야 한다.** operator 의 포럼 moderation 은 `/forum/operator/categories/*` (비활성/영구삭제) 경로가 canonical.

---

## 4. categories operator endpoint serviceCode 지원 — ✅ PASS

`operator-forum.routes.ts` (mount `/api/v1/forum/operator`):
- `SERVICE_CODE_TO_RBAC_KEY = { glycopharm, neture, 'k-cosmetics'→cosmetics, 'kpa-society'→kpa }` → **glycopharm / k-cosmetics 모두 valid serviceCode**.
- guard `requireServiceOperator`: `serviceCode` 검증 + `isServiceOperator(user.roles, rbacKey)`. → GP operator(glycopharm) / KCos operator(cosmetics) 통과. **GP/KCos 가 이미 requests/delete-requests/analytics 에 쓰는 동일 guard.**
- categories 엔드포인트 전부 이 라우터 하위 + 쿼리마다 `serviceCode` 격리:
  - `GET /categories`, `PATCH /categories/:id`, `POST /categories/:id/deactivate`, `POST /categories/:id/activate`, `GET /categories/:id/delete-check`, `DELETE /categories/:id/hard`
- → **categories backend 는 GP/KCos serviceCode 를 이미 지원**. KPA 전용 아님.

---

## 5. categories mutation 정책 — 기술 허용, 정책 결정 필요

| 동작 | 성격 | 복구 |
|---|---|---|
| `deactivate` | soft (status→archived) + 해당 포럼 publish 글 archived cascade | 가역 (activate) |
| `activate` | status→completed | 가역 |
| `hardDelete` (`DELETE /categories/:id/hard`) | **물리 삭제** (`requestRepo().remove` + 멤버/고아글 삭제) | **불가역** |

- hardDelete 안전장치: **정상 게시글 1건 이상이면 409 차단**(`HARD_DELETE_BLOCKED`). 고아 게시글(작성자 계정 없음)만 있으면 자동 정리 후 삭제 허용.
- 권한: 위 operator guard 통과 시 서비스 operator 도 호출 가능(서버가 service operator 에게 허용). 즉 **기술적으로는 GP/KCos operator 도 비활성/영구삭제 가능**.
- → endpoint/guard 는 ready 이나, "GP/KCos operator 에게 포럼 **영구삭제/비활성** UI 를 노출할지"는 **사업 정책 결정**. 본 검증은 기술 가능성만 확정.

---

## 6. read-only hub 도입 가능성 — ✅ PASS

- 최소 API 조합: `forumAnalyticsApi.getSummary()`(공통 operator, GP/KCos 보유) + posts read(`/forum/posts`, optionalAuth). **둘 다 GP/KCos 가용.**
- 제외: 게시글 삭제(§3), 삭제/비활성 등 mutation.
- nav parametrize 필요(§8).
- → KPA hub 를 공통 모듈화하여 **삭제 mutation 제거 + nav 주입**한 read-only 운영 hub 로 GP/KCos 도입 가능.

---

## 7. categories 도입 가능성 — 🟡 API PASS / UI 정책 HOLD

- API/guard/serviceCode: **GP/KCos 지원 확인(PASS)**.
- UI 도입: destructive(영구삭제/비활성) 정책 결정 선행 → 본 WO 범위 밖. 별도 WO 로 분리 권장.

---

## 8. dead-nav 후보 (KPA hub hard-nav 중 GP/KCos 부재/차이)

| KPA hub nav 타깃 | GP | KCos | 이식 시 처리 |
|---|---|---|---|
| `/operator/forum-management` | ❌ (KPA-only, KPA 는 forum-requests redirect) | ❌ | `/operator/forum-requests` 로 치환 |
| `/operator/community` | ✅ (Home 편집) | ❌ 부재 | KCos 는 해당 shortcut 제외(parametrize) |
| `/operator/forum-delete-requests` | ✅ | ✅ | 그대로 |
| `/operator/forum-analytics` | ✅ | ✅ | 그대로 |
| `/forum/post/:id`, `/forum/edit/:id` | posts 상세는 `/forum/posts/:id` 패턴 | 동일 | row 클릭 nav 는 read-only hub 에서 단순화/주입 |

---

## 9. backend/API/DB/route/menu 무변경 확인

- 본 IR 은 **조사 전용**. backend/API/DB/migration/route/menu/capability **전부 미변경**.
- 실제 mutation(DELETE/hardDelete/deactivate/activate) 호출 없음.
- Neture 미접촉. 다른 세션 WIP 미접촉.

---

## 10. 최종 판정: **PARTIAL PASS**

| 항목 | 판정 |
|---|---|
| posts read (GP/KCos operator) | ✅ PASS |
| posts delete (서비스 operator) | ❌ 불가 (author/platform-admin 전용) → 이식 hub 에서 제외 |
| categories serviceCode 지원 | ✅ PASS (glycopharm/k-cosmetics) |
| categories mutation 기술 허용 | ✅ (operator guard 통과) |
| categories UI 도입 | 🟡 정책 결정 선행 (영구삭제 destructive) |
| read-only hub 도입 | ✅ PASS |

---

## 11. 후속 WO 제안

1. **WO-...-FORUM-HUB-READONLY-INTRODUCE-V1** (권장 즉시 진행) — KPA hub 를 `@o4o/operator-core-ui/modules/forum-hub` 공통 모듈로 추출(삭제 mutation 제거, nav 주입), GP/KCos wrapper + `/operator/forum` redirect→실 hub 승격 + menu `포럼 운영` 추가. KPA 는 thin wrapper 로 회귀 없이 수렴(삭제 기능 유지 여부는 KPA accent/option 으로 보존 결정 — KPA 는 platform-admin 경로라 동작).
   - 주의: KPA hub 의 삭제 기능은 KPA 에서 platform-admin override 로 동작 중 → 공통 모듈은 "삭제 액션 optional(서비스별 on/off)"로 설계해 GP/KCos 는 off, KPA 는 기존 유지.
2. **WO-...-FORUM-CATEGORIES-INTRODUCE-V1** — categories(비활성/영구삭제) UI 를 GP/KCos 에 도입. **영구삭제 정책 명시 승인 선행.** API 는 이미 ready.

---

## 12. 완료 판정

- ✅ 검증 완료 — **PARTIAL PASS**. read-only hub 진행 가능, posts delete 제외, categories 는 정책 게이트.
- ✅ backend/API/DB/route/menu/capability 무변경, mutation 호출 없음, Neture·타 세션 미접촉.
- 다음: §11-1 read-only hub 도입 WO 권장.
