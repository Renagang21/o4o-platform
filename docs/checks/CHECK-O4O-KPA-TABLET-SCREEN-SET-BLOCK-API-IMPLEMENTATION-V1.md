# CHECK-O4O-KPA-TABLET-SCREEN-SET-BLOCK-API-IMPLEMENTATION-V1

> WO: `WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-API-IMPLEMENTATION-V1`
> 성격: **관리 API 구현** — UI/public runtime/데이터 이전/migration 없음.
> 계약: [API-CONTRACT-V1](CHECK-O4O-KPA-TABLET-SCREEN-SET-BLOCK-API-CONTRACT-V1.md) · 스키마: [SCHEMA-V1](CHECK-O4O-KPA-TABLET-SCREEN-SET-BLOCK-SCHEMA-V1.md)

---

## 1. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/routes/platform/store-tablet.routes.ts` | 8개 관리 엔드포인트 additive(기존 `createStoreTabletRoutes` 라우터 내, `return router` 직전). 기존 라우트 무변경 |

> 단일 파일. 신규 서비스 파일 없음(기존 파일이 raw SQL inline 관례 → 동일 패턴 계승). 엔티티/마이그레이션/프론트/공개 핸들러 무변경.

## 2. 구현한 route (8, `/api/v1/store/*`, 전부 `withStoreAuth` org 스코프)

| Method / Path | 동작 |
|---|---|
| `GET /screen-sets` | 목록(org). filter: `tabletId`/`status`/`includeArchived`(기본 archived 제외). blockCount·isApplied 포함 |
| `GET /screen-sets/:id` | 상세 + blocks[] |
| `POST /screen-sets` | 생성. origin='store'·service_key=NULL·organization_id 서버 강제. name(1..120) 필수, status draft(기본)/active, tabletId? org 검증 |
| `PATCH /screen-sets/:id` | name/status/tabletId 수정(부분). status ∈ draft/active/archived |
| `DELETE /screen-sets/:id` | soft delete(deleted_at + status=archived). **적용 중이면 409 SCREEN_SET_IN_USE** |
| `PUT /screen-sets/:id/blocks` | 전체 교체(트랜잭션 delete+insert, displays PUT 패턴). block_type 7종 검증, config object 검증 |
| `POST /tablets/:id/current-screen-set` | current 적용. tablet·set org 검증 + set active + (set.tablet_id NULL 또는 일치) |
| `DELETE /tablets/:id/current-screen-set` | current 해제(NULL → legacy) |

- 경로: **top-level `/screen-sets`**(계약대로 `/tablets/:id` 포획 회피). `/tablets/:id/current-screen-set`는 하위 세그먼트라 무충돌. `return router` 직전 등록(기존 라우트가 포획 안 함).

## 3. DTO / validation 요약

- 요청에서 **organization_id/service_key/origin 받지 않음** — 서버가 org(auth)·'store'·NULL 강제(스푸핑 방지, Boundary Guard).
- ScreenSet 응답: id/organizationId/serviceKey/tabletId/name/origin/status/createdByUserId/createdAt/updatedAt (+목록 blockCount·isApplied, +상세 blocks[]).
- Block: id/screenSetId/blockType/**isEnabled(=is_visible)**/sortOrder/config/타임스탬프.
- blocks PUT 검증: 배열 / 각 항목 object / `blockType ∈ 7종` / `config` object(널 허용, 배열 불가). **config 심층(타입별) 검증은 최소** — 상세 config 스키마 강제는 후속 IDLE-BLOCK-INTEGRATION WO.
- 에러: `{success:false, error, code}` (UPPER_SNAKE 코드) — SCREEN_SET_NOT_FOUND / SCREEN_SET_NAME_REQUIRED / INVALID_STATUS / INVALID_BLOCK_TYPE / INVALID_BLOCK_CONFIG / INVALID_TABLET / TABLET_NOT_FOUND / SCREEN_SET_NOT_ACTIVE / SCREEN_SET_NOT_APPLICABLE / SCREEN_SET_IN_USE / VALIDATION_ERROR / INTERNAL_ERROR.

## 4. org scoping 검증

- 전 엔드포인트 `withStoreAuth` → `organizationId` 주입. 모든 SQL `WHERE organization_id = $auth`.
- set mutation(수정/삭제/blocks/apply)은 대상 set·tablet의 org 일치 확인 → 불일치 404(존재 은닉).
- apply: tablet·set 둘 다 org 소속 + set active + set.tablet_id(NULL|일치) 아니면 409.

## 5. 배포 스키마 정합 결정 (계약 §0 이슈 반영)

| 이슈 | 구현 결정 |
|---|---|
| block_type `notice`/`qr_link` (WO §6) | **미지원.** 배포 CHECK 7종만(idle_media/product_list/product_content/corner_description/health_info/staff_inquiry/qr_guide). |
| 필드 `isEnabled` (WO §6) | DTO `isEnabled` ↔ 컬럼 `is_visible` 매핑 구현 |
| 경로 `/tablets/screen-sets` (WO §4) | **미사용.** top-level `/screen-sets` 채택(포획 회피) |
| create `description` (WO §5) | **미지원.** 배포 스키마에 description 컬럼 없음 → name만. (필요 시 후속 additive 컬럼 migration) |

> 이상 4건은 "배포 스키마가 정본"이라는 계약 원칙에 따른 결정. `notice`/`qr_link`/`description`을 원하면 구현이 아니라 **추가 스키마 WO**(additive migration)가 선행돼야 함.

## 6. archive 정책 / tablet 적용·해제 정책

- **archive**: soft delete(deleted_at + status=archived). 적용 중(current_screen_set_id 참조)이면 **409로 차단** → 사용자가 먼저 해제. (계약 §7 권장안 채택. FK는 `ON DELETE SET NULL`이나 하드 삭제를 쓰지 않고 soft delete + 명시 해제 유도.)
- **apply**: `store_tablets.current_screen_set_id = setId`. **public runtime 미반영**(값만 저장). store_tablets엔 updated_at 컬럼 없어 미변경.
- **clear**: `current_screen_set_id = NULL` → legacy 경로.

## 7. Legacy / public runtime 불변

- current_screen_set_id NULL = 기존 displays/idle/operator 경로 그대로.
- **public tablet runtime(`store-public-tablet.handler.ts`) 미접촉** — current_screen_set_id를 아직 읽지 않음. 적용해도 공개 화면 불변(runtime 연동은 PUBLIC-RUNTIME-READ WO).

## 8. 금지 범위 준수

| 금지 | 준수 |
|---|:--:|
| UI 구현 / public runtime 변경 | ✅ 없음 |
| idle_playlist_items 이전 / store_tablet_displays 흡수 | ✅ 없음 (config는 참조만) |
| operator common video 정책 변경 | ✅ 없음 |
| 기존 태블릿 current_screen_set 자동 적용 / screen set 자동 생성 | ✅ 없음 |
| DB migration | ✅ 없음 (SCHEMA-V1 테이블 사용) |
| OPL/service_key 작업 혼합 | ✅ 없음 |

## 9. 검증 결과

| 항목 | 결과 |
|---|:--:|
| api-server typecheck (변경 파일) | ✅ PASS (store-tablet.routes error 0; 무관 `src/scripts/drug-otc-*` 선존재 에러 별개) |
| 배포 (Deploy API, CI 마이그레이션 없음) | ⏳ (배포 후) |
| 8개 route 등록 + org scope + E2E smoke | ⏳ (배포 후) |
| read-only DB 검증(생성/blocks/apply/해제 + 기존 displays/idle 불변) | ⏳ (배포 후) |

_(배포 후 채움)_

## 10. 완료 기준 대비

- [x] 8개 관리 API 구현
- [x] schema 추가 없음 / UI·public runtime 변경 없음
- [x] typecheck 통과
- [ ] build/배포 성공 + smoke
- [x] CHECK 작성 · [ ] commit/push

## 11. 다음 단계

IDLE-BLOCK-INTEGRATION → EDITOR-UX → PUBLIC-RUNTIME-READ → LEGACY-COMPATIBILITY.
