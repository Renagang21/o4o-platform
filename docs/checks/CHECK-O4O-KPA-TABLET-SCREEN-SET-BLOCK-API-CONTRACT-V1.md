# CHECK-O4O-KPA-TABLET-SCREEN-SET-BLOCK-API-CONTRACT-V1

> WO: `WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-API-CONTRACT-V1`
> 성격: **API 계약 설계 only** — 코드/DB write/migration/UI/public runtime 변경 0. 계약 명세 문서.
> 선행: [DESIGN-V1](CHECK-O4O-KPA-TABLET-CORNER-SCREEN-SET-BLOCK-DESIGN-V1.md) · [SCHEMA-V1](CHECK-O4O-KPA-TABLET-SCREEN-SET-BLOCK-SCHEMA-V1.md)
> 조사 대상 commit: `2c4471f7c`

---

## 0. 결론 요약 & 반드시 짚을 3가지 정합 이슈

관리 API는 기존 `store-tablet.routes.ts` 규약(`withStoreAuth` = requireAuth + requirePharmacyOwner, `organizationId` 스코프, `{success,data}`) 위에 **additive**로 얹는다. 공개 뷰어(`/stores/:slug/tablet/*`)는 이번 계약에서 **읽지도 바꾸지도 않는다.**

**⚠️ 배포된 SCHEMA-V1과 WO 초안 사이 3개 정합 이슈 — 계약은 "배포된 스키마"를 정본으로 삼는다:**

| # | WO 초안 | 배포된 스키마(SCHEMA-V1, CHECK/컬럼 강제) | 계약 결정 |
|---|---|---|---|
| 1 | block_type에 `notice`, `qr_link` (§6) | CHECK 허용값 = `idle_media, product_list, product_content, corner_description, health_info, staff_inquiry, qr_guide` (`notice`/`qr_link` **미포함 → INSERT 시 CHECK 위반 실패**) | 계약 enum = **배포된 7종**. `notice`≈`staff_inquiry`, `qr_link`≈`qr_guide`로 매핑. 다른 이름을 원하면 **구현 WO에서 additive CHECK 확장 migration** 필요(본 WO는 migration 금지 → §11에 스니펫만 제시) |
| 2 | block 필드 `isEnabled` (§6) | 컬럼명 = `is_visible` | DTO 필드 `isEnabled` ↔ 컬럼 `is_visible` **매핑**(구현 시 alias). 혼동 방지 위해 계약에 명시 |
| 3 | 경로 `/store/tablets/screen-sets` (§4) | 기존 `/store/tablets/:id` param 라우트 존재 → Express는 `screen-sets`를 `:id`로 포획(라우트 순서 gotcha) | **top-level `/api/v1/store/screen-sets`** 채택(충돌 회피, DESIGN-V1 §6과 동일). assignment만 `/store/tablets/:tabletId/current-screen-set`(특정 tabletId라 무충돌) |

> §4가 "예상 경로는 실제 코드 관례를 조사해 조정한다"고 명시 → 위 조정은 WO 지시 범위 내.

---

## 1. 조사한 기존 API/route 구조 (§9)

| 조사 항목 | 사실 |
|---|---|
| store tablet API route 위치 | `apps/api-server/src/routes/platform/store-tablet.routes.ts`, 마운트 `/api/v1/store` (`register-routes.ts:316`) |
| 인증/org scoping | `withStoreAuth(handler)` = `requireAuth` + `requirePharmacyOwner`(`createRequireStoreOwner`) → handler에 `organizationId` 주입. 전 라우트 org 스코프 |
| 기존 store_tablets CRUD | GET/POST/PUT/DELETE `/tablets[/:id]`, 응답 `{success,data}`, 에러 `res.status(4xx/5xx).json({success:false, error:'<문자열>'})` |
| idle 저장 API | GET/PUT `/tablets/:id/idle-playlist` → `store_tablets.idle_playlist_items`(jsonb) |
| operator common idle selection API | GET/POST/DELETE `/tablets/:id/operator-common-idle-selection` → `store_tablet_operator_idle_selections` |
| displays 저장 API | PUT `/tablets/:id/displays` = **전체 삭제+재삽입(트랜잭션 교체)**, 검증 후 `store_tablet_displays` |
| StoreTabletDisplaysPage 호출 | `fetchTablets/ProductPool/TabletDisplays/saveTabletDisplays/…IdlePlaylist/…DisplaySettings` + operator common idle fns (`services/web-kpa-society/src/api/tabletDisplays.ts`) |
| public↔관리 경계 | 공개 = `/api/v1/stores/:slug/tablet/*`(무인증, slug). 관리 = `/api/v1/store/*`(requirePharmacyOwner). **screen-set API는 관리측 전용, 공개 미접촉** |

관례 계승: (a) 경로 prefix `/api/v1/store`, (b) `withStoreAuth`+org 스코프, (c) `{success,data}`, (d) blocks 저장은 displays PUT과 동일한 **전체 교체(replace)** 패턴, (e) soft-delete(deleted_at) 관례.

---

## 2. 최종 API 계약표 (관리, `/api/v1/store/*`, 전부 `withStoreAuth` org 스코프)

| # | 기능 | Method / Path | 성공 | 주요 에러 |
|---|---|---|---|---|
| 1 | Screen Set 목록 | `GET /store/screen-sets?tabletId=&status=&scope=` | 200 `{success,data:ScreenSet[]}` | 400 INVALID_QUERY |
| 2 | Screen Set 상세(+blocks) | `GET /store/screen-sets/:id` | 200 `{success,data:ScreenSetDetail}` | 404 SCREEN_SET_NOT_FOUND |
| 3 | Screen Set 생성 | `POST /store/screen-sets` | 201 `{success,data:ScreenSet}` | 400 SCREEN_SET_NAME_REQUIRED / INVALID_TABLET / INVALID_STATUS |
| 4 | Screen Set 수정 | `PATCH /store/screen-sets/:id` | 200 `{success,data:ScreenSet}` | 404 SCREEN_SET_NOT_FOUND / 400 INVALID_STATUS |
| 5 | Screen Set archive/delete | `DELETE /store/screen-sets/:id` | 200 `{success,data:{id,deleted:true}}` | 404 SCREEN_SET_NOT_FOUND / 409 SCREEN_SET_IN_USE |
| 6 | Block 저장/정렬(전체 교체) | `PUT /store/screen-sets/:id/blocks` | 200 `{success,data:Block[]}` | 404 SCREEN_SET_NOT_FOUND / 400 INVALID_BLOCK_TYPE / INVALID_BLOCK_CONFIG |
| 7 | current screen set 적용 | `POST /store/tablets/:tabletId/current-screen-set` | 200 `{success,data:{tabletId,currentScreenSetId}}` | 404 TABLET_NOT_FOUND / SCREEN_SET_NOT_FOUND / 409 SCREEN_SET_NOT_APPLICABLE |
| 8 | current screen set 해제 | `DELETE /store/tablets/:tabletId/current-screen-set` | 200 `{success,data:{tabletId,currentScreenSetId:null}}` | 404 TABLET_NOT_FOUND |

- 정렬/필터: `status`(draft|active|archived), `tabletId`(특정 코너 세트), `scope`(=`reusable` → tablet_id NULL만 / `tablet` → 특정 태블릿 / 기본 전체). 페이지네이션은 세트 수가 작아 V1 미도입(목록 전체 반환), 필요 시 후속.
- **에러 코드 정책**: 신규 엔드포인트는 프로그래밍 처리 위해 **UPPER_SNAKE 코드**(`{success:false, error:'CODE'}`) 권장. 기존 store-tablet.routes는 사람용 문자열 혼재 → 신규는 코드로 통일 권장(구현 WO 확정).

---

## 3. Request / Response DTO 초안

### ScreenSet (response)
```ts
interface ScreenSet {
  id: string;
  organizationId: string;
  serviceKey: string | null;
  tabletId: string | null;      // null = 매장 재사용 세트
  name: string;                  // 1..120
  origin: 'store' | 'operator';  // 매장 API 생성 = 'store' 고정
  status: 'draft' | 'active' | 'archived' | 'operator_template';
  createdByUserId: string | null;
  createdAt: string; updatedAt: string;
  isCurrentForTablet?: boolean;  // 목록에 tabletId 필터 시 편의 플래그(파생, 저장 아님)
}
interface ScreenSetDetail extends ScreenSet { blocks: Block[]; }
```

### Block (response)  — DTO `isEnabled` ↔ 컬럼 `is_visible`
```ts
interface Block {
  id: string;
  screenSetId: string;
  blockType: BlockType;          // 배포 enum(§4-block) 7종
  sortOrder: number;
  isEnabled: boolean;            // = DB is_visible
  config: Record<string, unknown>; // block_type별 스키마(§4)
  createdAt: string; updatedAt: string;
}
type BlockType =
  | 'idle_media' | 'product_list' | 'product_content'
  | 'corner_description' | 'health_info' | 'staff_inquiry' | 'qr_guide';
```

### 생성 / 수정 / 저장 요청
```ts
// POST /store/screen-sets
{ name: string; tabletId?: string | null; status?: 'draft' | 'active' }   // origin='store' 서버 강제, serviceKey=매장 컨텍스트 서버 주입
// PATCH /store/screen-sets/:id
{ name?: string; status?: 'draft'|'active'|'archived'; tabletId?: string|null }
// PUT /store/screen-sets/:id/blocks  (전체 교체 — displays PUT 패턴)
{ blocks: Array<{ blockType: BlockType; sortOrder: number; isEnabled: boolean; config: object }> }
// POST /store/tablets/:tabletId/current-screen-set
{ screenSetId: string }
```

- **origin/serviceKey/organizationId 는 요청으로 받지 않는다**(서버가 org/스코프에서 강제) — 스푸핑 방지(Boundary Guard).
- blocks PUT: 서버가 id 발급, sortOrder 재정규화(0..n), 트랜잭션 delete+insert. config는 blockType별 검증 통과분만 저장.

---

## 4. block_type별 config schema (jsonb 계약)

> enum = 배포 CHECK 7종. WO의 `notice`→`staff_inquiry`, `qr_link`→`qr_guide` 매핑(§0 이슈 1).

| block_type | config 스키마(초안) | 데이터 연결(dual-read, Phase 1) |
|---|---|---|
| `idle_media` | `{ source: 'legacy_idle_playlist'\|'operator_common'\|'inline', durationMs?: number, forcedContentId?: string(operator_common), items?: [{type:'image'\|'video', url, durationMs?}] }` | `legacy_idle_playlist`→`store_tablets.idle_playlist_items`, `operator_common`→`store_tablet_operator_idle_selections`. **대기화면=idle block 원칙 충족(참조)** |
| `product_list` | `{ source: 'legacy_tablet_displays' }` | 그 태블릿의 `store_tablet_displays`(configured/legacy 오버레이) 참조 |
| `product_content` | `{ productRef: {type:'supplier'\|'local', id:string}, contentId?: string }` | `contentId`→`kpa_store_contents`(Store Production Material) **단방향 참조**(F12 불변식 ⑥) |
| `corner_description` | `{ title?: string, body: string, i18n?: Record<lang,{title?,body}> }` | 자체 텍스트 |
| `health_info` | `{ contentRefs: Array<{type,id}> }` | 콘텐츠 단방향 참조 |
| `staff_inquiry` (WO `notice`) | `{ message: string, variant?: 'inquiry'\|'notice' }` | 자체 텍스트 (variant로 notice/inquiry 구분) |
| `qr_guide` (WO `qr_link`) | `{ url?: string, label?: string, enabled?: boolean }` | 자체 |

> **WO 예시 정합**: `idle_media` config 예시(`source:'legacy_idle_playlist', durationMs:30000`)는 위 스키마와 일치. `source`는 dual-read 소스 선택자 — 저장소 이전 없음.
> **검증 계약**: 서버는 blockType별 config를 zod류 스키마로 검증, 미지의 key는 무시 or reject(구현 WO 확정). 잘못된 blockType/config → 400 INVALID_BLOCK_TYPE / INVALID_BLOCK_CONFIG.

---

## 5. 권한 / organization scoping 규칙 (§5)

```text
- 전 엔드포인트 withStoreAuth → req.organizationId 파생. 모든 쿼리 WHERE organization_id = req.organizationId.
- 세트 mutation(수정/삭제/blocks/적용)은 대상 set.organization_id === req.organizationId 확인. 불일치 → 404(존재 은닉) 또는 403.
- current-screen-set 적용: tablet.organization_id === req.organizationId AND
    (set.tablet_id IS NULL  OR  set.tablet_id === :tabletId) AND set.status='active'.
    아니면 409 SCREEN_SET_NOT_APPLICABLE.
- service_key: 매장 API에서는 (a) 세트 저장 시 매장 서비스 컨텍스트 주입(조회/필터용), (b) origin='operator_template' 세트 읽기 필터에만 사용. 매장 owner는 operator_template 생성/수정 불가(읽기·복제만 — 복제는 후속 WO).
- Boundary(F6): screen_set = organizationId(Store Ops). operator template/공통영상 = serviceKey(Broadcast). cross-domain FK 없음.
```

---

## 6. Legacy fallback 규칙 (§7 — 반드시 명시)

```text
tablet.current_screen_set_id IS NULL
  → 기존 store_tablet_displays / idle_playlist_items / operator common idle 경로 그대로.
  → 공개 뷰어 동작 완전 불변.

tablet.current_screen_set_id IS NOT NULL
  → 값만 저장. 이번 WO(및 API 구현 WO)에서는 공개 렌더링에 아무 영향 없음.
  → block 기반 조립은 이후 PUBLIC-RUNTIME-READ WO에서만 활성화.
```

> **⚠️ 운영 UX 경고(계약 필수 문구)**: current screen set을 적용해도 **공개 태블릿 화면은 아직 바뀌지 않는다**(public runtime 미연동). 관리 API/편집기는 "예약/구성" 단계이며, 실제 송출 전환은 PUBLIC-RUNTIME-READ 배포 후. 편집기 UX(후속 WO)는 이 사실을 사용자에게 명시해야 오해가 없다.
> 이번 WO에서 **runtime 분기 구현 금지** 준수.

---

## 7. 동시성 / 무결성 계약

- `PUT /blocks` = 트랜잭션 `DELETE FROM store_tablet_screen_blocks WHERE screen_set_id=:id` 후 재삽입(displays PUT와 동일). last-write-wins.
- `DELETE /screen-sets/:id`: 이 세트를 `current_screen_set_id`로 참조하는 태블릿이 있으면 → FK가 `ON DELETE SET NULL`이라 **하드 삭제 시 자동 NULL**. 단 계약은 **soft delete(deleted_at)** 기본 → 이 경우 참조 태블릿을 먼저 자동 해제(current NULL)하거나 409 SCREEN_SET_IN_USE로 막고 사용자 해제 유도(구현 WO 택1; **권장=409 후 명시 해제**).
- 적용은 멱등: 같은 set 재적용 무해.

---

## 8. 금지 범위 준수 (§8)

| 금지 | 준수 |
|---|:--:|
| DB migration / DB write / API 구현 / UI 구현 | ✅ 없음 (계약 문서만) |
| public tablet runtime 변경 | ✅ 없음 (경계 명시만) |
| idle_playlist_items 이전 / store_tablet_displays 흡수 | ✅ 없음 (dual-read 참조로 설계) |
| operator common video 정책 변경 | ✅ 없음 |
| 테스트 데이터 생성 / OPL·service_key 작업 혼합 | ✅ 없음 |

---

## 9. 다음 구현 WO 분리안 (§10·§12)

1. **WO-...-SCREEN-SET-BLOCK-API-IMPLEMENTATION-V1** — 본 계약 구현. store-tablet.routes에 §2 8개 엔드포인트 additive + service(raw SQL, org 스코프) + client fn. blockType config 검증. **공개 미접촉**. (정합 이슈 1/2/3 반영: enum=배포7종 또는 CHECK 확장 migration 동반 결정, isEnabled↔is_visible alias, top-level 경로.)
2. **WO-...-IDLE-BLOCK-INTEGRATION-V1** — idle_media block ↔ idle_playlist_items/operator_common dual-read 확정.
3. **WO-...-SCREEN-SET-EDITOR-UX-V1** — 세트 카드+block 편집기 UX(현 refit 위 additive) + "공개 미반영" 경고 문구.
4. **WO-...-PUBLIC-RUNTIME-SCREEN-SET-READ-V1** — 공개 핸들러 current_screen_set_id 분기(있으면 block 조립, 없으면 legacy).
5. **WO-...-LEGACY-COMPATIBILITY-V1** — displays/idle 흡수·정리(선택).

> (선택) block_type에 `notice`/`qr_link` 정식 이름이 필요하면 구현 WO에 **additive CHECK 확장** 포함:
> ```sql
> ALTER TABLE store_tablet_screen_blocks DROP CONSTRAINT "CHK_store_tablet_screen_blocks_type";
> ALTER TABLE store_tablet_screen_blocks ADD CONSTRAINT "CHK_store_tablet_screen_blocks_type"
>   CHECK (block_type IN ('idle_media','product_list','product_content','corner_description',
>          'health_info','staff_inquiry','qr_guide','notice','qr_link'));
> ```
> (본 WO는 migration 금지 → 스니펫만. 미적용.)

---

## 10. 완료 기준 대비 (§11)

| 완료 기준 | 상태 |
|---|:--:|
| API 계약 확정 | ✅ §2·§3·§4·§5·§6·§7 |
| 구현 변경 0 / DB write 0 / migration 0 / public runtime 변경 0 | ✅ 문서만 |
| CHECK 문서 commit/push | ✅ 본 커밋 |

**계약 확정 요지**: 관리측 8개 엔드포인트(top-level `/store/screen-sets` + `/store/tablets/:tabletId/current-screen-set`), org 스코프, `{success,data}`, blocks=전체 교체, block enum=배포 7종(notice/qr_link 매핑), isEnabled↔is_visible, current_screen_set NULL=legacy 불변, 적용해도 공개 미반영(runtime은 후속 WO). 3개 정합 이슈 명시.
