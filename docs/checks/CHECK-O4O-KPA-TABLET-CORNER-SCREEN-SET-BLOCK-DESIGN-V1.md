# CHECK-O4O-KPA-TABLET-CORNER-SCREEN-SET-BLOCK-DESIGN-V1

> WO: `WO-O4O-KPA-TABLET-CORNER-SCREEN-SET-BLOCK-DESIGN-V1`
> 성격: **설계 WO** — read-only 조사 + 설계 확정. 코드/migration/DB write/public runtime 변경 0, 테이블 생성 0, 테스트 데이터 0.
> 선행: [AUDIT-V1](CHECK-O4O-KPA-TABLET-CURRENT-DASHBOARD-DATA-STRUCTURE-AUDIT-V1.md) · [LOCATION-FIRST-UX-REFIT-V1](CHECK-O4O-KPA-TABLET-LOCATION-FIRST-UX-REFIT-V1.md)
> 조사 대상 commit: `c979e1556`
> 거버넌스: CLAUDE.md §7 Boundary Policy(F6), F12 Product Resource Architecture, Signage/Store Playlist 경계(KEEP-LEGACY)

---

## 0. 결론 요약 (먼저 읽기)

- **권장안 = A안(최소 호환형)을 Phase 1로 채택하고, 단계적으로 B안(정식 block 모델)로 수렴.** 전면 정식화(B안 일괄)나 설계 보류(C안)는 모두 비권장.
- **이번 WO가 반드시 내려야 할 결론 — "대기화면 = Screen Set의 idle block" — 을 확정한다.** 단, 저장소는 즉시 이전하지 않고 `idle_media` block이 기존 `idle_playlist_items` / `store_tablet_operator_idle_selections`를 **참조(dual-read)** 하는 방식으로 모델 원칙을 만족시킨다. operator common idle video는 **별도 override가 아니라 idle block의 source option** 으로 흡수한다(현재 prepend 동작을 block 순서로 표현).
- **Phase 1 public runtime 변경 = 0.** screen_set/block은 우선 **관리(운영자·매장) 레이어 추상**으로만 도입하고, 공개 렌더링의 source of truth 전환은 별도 후속 WO(PUBLIC-RUNTIME-SCREEN-SET-READ)에서 `current_screen_set_id` 유무로 분기(있으면 block 조립, 없으면 legacy)한다.
- **Corner는 Phase 1에서 신규 테이블을 만들지 않는다.** `store_tablets`(+ `location` 자유텍스트)를 코너 단위로 계속 사용. corners 정규화 테이블은 Phase 2/B로 유보.
- **경계 준수(F6)**: 매장 제작 Screen Set = `organizationId` 스코프(Store Ops). 운영자 템플릿/공통영상 = `serviceKey` 스코프(Broadcast). cross-domain FK 없음. F12: content block은 Store Production Material(`kpa_store_contents`)/Product Resource를 **단방향 참조**.
- **migration 필요 여부**: Phase 1은 **additive 신규 테이블 2개 + 컬럼 1개**만(데이터 이전 0, rollback = 무시). 데이터 흡수 migration은 Phase 2에서 별도 WO.

---

## 1. 현재 구조 요약 (선행 감사 재확인)

| 축 | 현재 저장소 | 성격 | 관리 저장 경로 |
|---|---|---|---|
| 태블릿(코너) | `store_tablets` (id, org, name, **location 자유텍스트**, is_active) | 기기=코너 단위 | tablets CRUD |
| 상품 진열 | `store_tablet_displays` (tablet_id, product_type, product_id, sort_order, is_visible, **content_id**) | 평면 row 리스트 | displays PUT (전체 교체) |
| 진열별 콘텐츠 | `content_id` → `kpa_store_contents` (Store Production Material) | 진열 항목 속성 | displays PUT 포함 |
| 대기화면(store) | `store_tablets.idle_playlist_items` (**jsonb**: `{type:image|video, url, durationMs?}[]`) | inline 배열 | idle-playlist PUT |
| 대기화면(operator) | `store_tablet_operator_idle_selections` (tablet_id, forced_content_id, partial unique) → `signage_forced_content` (target_surface, tablet_duration_seconds) | 태블릿당 1개 선택 | selection POST/DELETE |
| 전시 설정 | `store_tablet_display_settings` (**org UNIQUE**, show_price/qr/consultation, auto/idle slide seconds) | 매장(org) 1행 | display-settings PUT |

**파편화 지점(핵심 문제)**: 위 6축이 **서로 다른 4개 저장소 + 4개 저장 버튼**으로 분리. "한 코너 화면 = 하나의 편집·교체 단위"라는 개념이 없다.

**Public runtime**(`store-public-tablet.handler.ts`): 상품 = 동적 쿼리(OPL 4-gate + local), `store_tablet_displays`는 **큐레이션·정렬 오버레이**(configured→제한, 없으면 legacy_fallback 전체). idle = `idle_playlist_items` + operator common(선택→deterministic fallback) **prepend**. settings = org 단위. tabletId = `?tabletId=`로 device 선택, 없으면 first-active.

**Frontend(refit 후)**: 위치/코너 좌측 사이드바 + 우측 "현재 코너 화면 구성 요약" + 편집 4섹션(상품/idle/공통영상/설정). → **요약 패널이 곧 "current screen set summary"로 확장될 자리**, 편집 4섹션이 **block editor로 승격될 자리**.

---

## 2. 모델 정의 (Corner / Screen Set / Screen Block / Assignment)

```
Corner/Location  ── (Phase 1: store_tablets = 코너, location=라벨) ──┐
      │ 1:N                                                          │
   Screen Set (코너에 적용 가능한 화면 묶음; 여러 개 저장, 1개 current)  │
      │ 1:N                                                          │
   Screen Block (idle / corner_description / health_info /           │
                 product_list / product_content / staff_inquiry / qr)│
      │ (block config)                                               │
   Content / Product  ── displays·kpa_store_contents·forced_content 참조 (dual-read)
      ▲                                                              │
   Assignment ── store_tablets.current_screen_set_id (어느 세트가 지금 적용 중인가) ┘
```

- **Corner/Location**: 실제 정보전달 위치. Phase 1 = `store_tablets` 1대 = 1 코너(현행 유지), `location`은 표시·그룹핑 라벨.
- **Screen Set**: 코너 태블릿에 적용할 콘텐츠 묶음. 같은 코너에 여러 세트를 저장하고 하나를 "현재 적용".
- **Screen Block**: 세트 내부 구성 단위. type 판별 + jsonb config. 순서/표시조건 포함.
- **Idle Block**: 대기화면 = `idle_media` block(별도 기능 아님). source = store_playlist | operator_common | inline.
- **Assignment**: 코너(=태블릿)에 현재 적용 중인 세트. Phase 1 = `store_tablets.current_screen_set_id`.

---

## 3. 설계 질문 답변 (§4 전체)

### 3.1 Corner / Location
1. **신규 테이블 vs location 정규화** → **Phase 1: 신규 테이블 없음**(store_tablets=코너). corners 정규화는 Phase 2/B(다수 태블릿/코너 명명 표준화가 실수요로 확인될 때).
2. **한 코너에 태블릿 여러 대?** → 개념상 가능. Phase 1은 태블릿=코너라 "여러 대"는 같은 location 라벨을 가진 여러 store_tablets로 표현(사이드바 그룹핑). corners 테이블 도입 시 corner 1:N tablets로 정식화.
3. **한 태블릿이 여러 코너 전환?** → 물리적으론 1 태블릿=1 위치. "전환"은 코너가 아니라 **Screen Set 교체**로 해결(같은 태블릿에 세트만 바꿈). → 코너 전환 불필요, 세트 전환으로 충족.
4. **V1에서 store_tablets를 코너 단위로 계속?** → **예.** 이것이 A안 핵심.
5. **location→canonical corner migration** → Phase 2에서 corners 테이블 생성 + `store_tablets.corner_id` 추가 + location 문자열 dedupe/매핑 backfill. Phase 1에선 불필요.

### 3.2 Screen Set
1. **태블릿별/코너별/매장 재사용?** → **org 스코프 기본 + `tablet_id` nullable**. tablet_id 지정 = 그 코너 전용, NULL = 매장 내 재사용 가능(여러 코너에 적용). → 세 경우 모두 한 모델로 표현.
2. **여러 세트 저장 + "현재 적용"?** → **예.** 세트는 여러 개, 적용은 `store_tablets.current_screen_set_id` 1개.
3. **복제/템플릿?** → **필요.** `status='operator_template'` 세트를 매장이 복제 → 자기 org 세트로. 복제 = 세트+블록 deep copy(신규 API).
4. **운영자 세트 vs 매장 세트 같은 모델?** → **예, `origin` 판별 컬럼**(`operator`|`store`) + 스코프 컬럼으로 구분. 운영자 세트 = serviceKey 스코프(Broadcast, F6), 매장 세트 = organizationId 스코프(Store Ops, F6).
5. **상태값** → `draft` | `active` | `archived` | `operator_template`. (`expired`는 세트 자체보다 블록 소스(forced_content 기간)에서 파생 → 세트 상태로 두지 않음.)

### 3.3 Screen Block
1. **시작 block type** → `idle_media`, `product_list`, `product_content`, `corner_description`, `health_info`, `staff_inquiry`, `qr_guide`. (V1 필수 = idle_media + product_list + product_content; 나머지는 스켈레톤.)
2. **순서/표시조건** → `sort_order INT` + `is_visible BOOL`. 조건부 표시(스케줄 등)는 V1 제외.
3. **payload typed columns vs jsonb** → **jsonb `config`**(block_type 이질적 → 컬럼 폭발 방지). 판별 컬럼 `block_type` + zod/서버 스키마 검증. 상품 참조 등 관계형 무결성이 필요한 부분만 Phase 2에서 `screen_block_items` 정규화 테이블로 승격.
4. **product_list block ↔ store_tablet_displays** → **Phase 1: 참조(dual-read)**. product_list block config = `{ source:'tablet_displays' }` → 공개/편집 모두 기존 displays 사용. Phase 2: displays row를 `screen_block_items`로 흡수(옵션).
5. **product_content block ↔ 기존 콘텐츠** → 기존 `content_id`(진열별 선택 콘텐츠) 개념을 계승. block config가 `kpa_store_contents`(Store Production Material) / Product Resource(F12)를 **단방향 참조**. ProductMaster→Resource FK 신설 금지(F12 불변식 ⑥ 준수).

### 3.4 Idle Block (필수 결론)
1. **기존 idle_playlist_items 유지 + 호환?** → **예. dual-read.** 저장소 이전 없음(Phase 1).
2. **idle_media/idle_playlist block으로 흡수?** → **`idle_media` block으로 흡수(모델상).** block config: `{ source: 'store_playlist'|'operator_common'|'inline', items?, forcedContentId? }`.
   - `store_playlist` → 기존 `idle_playlist_items` 참조.
   - `operator_common` → 기존 `store_tablet_operator_idle_selections` 참조.
   - `inline` → block config에 직접 항목(Phase 2 완전 이전 시).
3. **operator common video = source option vs override?** → **source option.** 현재 "prepend"는 idle_media block을 **2개(operator_common + store_playlist) 순서 배치**로 표현 → 현행 동작을 block 순서로 자연 표현. 별도 override 개념 폐기.
4. **idle block 없으면 fallback?** → 세트에 idle block 없음 = 기존 legacy idle 경로(idle_playlist_items + operator fallback) 그대로. `current_screen_set_id` NULL도 동일.
5. **무조작 auto-return 유지?** → **유지.** auto-return은 공개 뷰어(tablet-kiosk-core)의 클라이언트 동작 → 데이터 모델과 무관, 변경 없음.

### 3.5 Assignment
1. **현재 적용 세트 저장 위치** → **Phase 1: `store_tablets.current_screen_set_id`(nullable FK)**. (별도 assignments 테이블/코너 테이블은 Phase 2 이력·스케줄 필요 시.)
2. **예약/스케줄** → **V1 제외.** current 1개만.
3. **적용 이력/audit** → V1 최소(신규 테이블 없음). 필요 시 Phase 2 `screen_set_assignments`(from/to, changed_by, at) 이력 테이블. (기존 action-log-core 재사용 검토.)
4. **selectedTabletId UI 호환** → **호환.** 사이드바 선택(=코너=태블릿)은 그대로, 우측이 "그 태블릿의 current_screen_set + 적용 가능한 세트 목록"으로 확장. current_screen_set_id NULL이면 현행 편집 UI(legacy) 표시.

### 3.6 Migration / 호환 전략
1. **즉시 이전 vs dual-read** → **dual-read.** Phase 1은 데이터 이전 0.
2. **store_tablet_displays 흡수?** → **Phase 1 유지·참조**, Phase 2 선택적 흡수.
3. **idle_playlist_items 복사?** → **Phase 1 참조(복사 안 함)**, Phase 2 선택적 복사.
4. **배포 순서** → (1) 스키마 additive(sets/blocks/current_screen_set_id) → (2) 관리 API/UX(세트 CRUD·적용·복제·block 편집, 공개 미변경) → (3) public runtime screen_set read(분기) → (4) 레거시 흡수·정리.
5. **롤백** → Phase 1~2 관리 레이어는 `current_screen_set_id` NULL로 전부 legacy 복귀(무해). Phase 3 public read는 feature flag/분기라 롤백 시 legacy 경로 유지.

---

## 4. 데이터 모델 후보 비교 & 권장

| 기준 | A안 최소 호환형 | B안 정식 block 모델 | C안 UX only 보류 |
|---|---|---|---|
| 신규 테이블 | 2 (sets, blocks) + 컬럼 1 | 5+ (corners, sets, blocks, block_items, assignments) | 0 |
| 데이터 migration | 0 (dual-read) | 큼 (displays/idle/settings 이전) | 0 |
| public runtime 변경 | Phase 1 = 0, Phase 3 분기 1곳 | 큼 (조립 재작성) | 0 |
| "여러 세트 교체" 구현 | ✅ | ✅ | ❌ |
| "대기화면=idle block" 원칙 | ✅ (모델상, dual-read) | ✅ (완전) | ❌ |
| 회귀 위험 | 낮음 | 높음 | 없음 |
| 파편화 해소 | 부분(관리층 통합, 저장층 점진) | 완전 | 미해소 |
| 구현 속도 | 빠름 | 느림 | 매우 빠름 |

**권장 = A안(Phase 1) → 점진적 B안 수렴.**
- C안은 WO의 필수 결론("대기화면=idle block")·"여러 세트 교체"를 구현 불가 → 탈락.
- B안 일괄은 migration/runtime 회귀 위험이 커, 검증 전 대규모 이전은 부적절(선행 감사도 "증분 확장" 권고) → 목표로만.
- **A안은 관리 레이어에서 세트/블록/교체/idle-block 원칙을 즉시 실현하면서 저장층은 dual-read로 무회귀**. 검증 후 Phase 2~4에서 흡수·public 전환으로 B안에 수렴.

---

## 5. 예상 테이블/컬럼 초안 (Phase 1, **미생성 — 설계안**)

> 경계(F6): `screen_sets.organization_id`(Store Ops) 필수, 운영자 템플릿은 `service_key`. FK는 org/set/tablet 등 도메인 내부만, cross-domain(forced_content 등)은 soft ref.

```
screen_sets
  id                uuid PK
  organization_id   uuid   NOT NULL           -- 매장 세트(Store Ops 경계)
  service_key       varchar(50) NULL          -- operator_template 세트(Broadcast 경계)
  tablet_id         uuid   NULL               -- 지정 시 그 코너 전용, NULL=매장 재사용
  name              varchar(120) NOT NULL
  origin            varchar(20)  NOT NULL      -- 'store' | 'operator'
  status            varchar(20)  NOT NULL      -- 'draft'|'active'|'archived'|'operator_template'
  created_by_user_id uuid NULL
  created_at / updated_at / deleted_at
  -- 인덱스: (organization_id, status), (tablet_id) WHERE deleted_at IS NULL

screen_blocks
  id                uuid PK
  screen_set_id     uuid NOT NULL (FK screen_sets, CASCADE)
  block_type        varchar(30) NOT NULL       -- idle_media|product_list|product_content|
                                               --  corner_description|health_info|staff_inquiry|qr_guide
  sort_order        int  NOT NULL
  is_visible        bool NOT NULL DEFAULT true
  config            jsonb NOT NULL DEFAULT '{}' -- block_type별 스키마(서버 검증)
  created_at / updated_at
  -- 인덱스: (screen_set_id, sort_order)

store_tablets  (기존 테이블, 컬럼 1개 additive)
  + current_screen_set_id  uuid NULL           -- 현재 적용 세트(assignment). NULL=legacy 경로
```

**block_type별 config(jsonb) 스키마 초안**
```
idle_media       { source: 'store_playlist'|'operator_common'|'inline',
                   forcedContentId?: uuid, items?: [{type,url,durationMs?}] }
product_list     { source: 'tablet_displays' }         // Phase1: 기존 displays 참조
product_content  { productRef: {type,id}, contentId?: uuid }  // Store Production Material 단방향
corner_description { title, body, i18n? }
health_info      { contentRefs: [...] }
staff_inquiry    { message }
qr_guide         { enabled: bool }
```

> **Store Production Material / F12**: product_content block의 `contentId`는 `kpa_store_contents`(logical: Store Production Material)를 **단방향 참조**. ProductMaster→Resource FK 신설 금지(F12 불변식 ⑥). 상세 규칙은 `docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md`.

---

## 6. API 계약 초안 (Phase 2 관리 API, 공개 미변경)

> 마운트 `/api/v1/store/*`, `requireAuth + requirePharmacyOwner`(org 스코프) — 기존 store-tablet.routes와 동일 모델.

```
GET    /store/screen-sets?tabletId=            → 이 코너/매장의 세트 목록(+current 여부)
POST   /store/screen-sets                      → 세트 생성 {name, tabletId?}
POST   /store/screen-sets/:id/duplicate        → 복제(운영자 템플릿→매장 세트 포함)
PATCH  /store/screen-sets/:id                  → name/status
DELETE /store/screen-sets/:id                  → soft delete(archived)
POST   /store/tablets/:tabletId/apply-screen-set  { screenSetId }  → current_screen_set_id 설정(assignment)
DELETE /store/tablets/:tabletId/apply-screen-set  → 해제(→legacy)
GET    /store/screen-sets/:id/blocks           → block 목록
PUT    /store/screen-sets/:id/blocks           → block 순서/표시/config 일괄 저장(displays PUT 패턴)
GET    /store/operator-screen-set-templates    → 운영자 제공 템플릿(serviceKey 스코프, 복제용)
```
- 응답 표준 `{ success, data }`. idle_media block의 `operator_common` source 후보는 기존 `tablet-operator-common-idle-candidates` 재사용.
- **공개 API는 Phase 3까지 무변경**(관리 API만 추가).

---

## 7. UI/UX 배치 초안 (현 refit 위에 additive)

```
좌: 코너/위치 사이드바(현행)  +  각 코너의 "현재 적용 세트명" 뱃지
중앙 상단: 현재 코너 화면 구성 요약(현행 요약 패널 확장)
           → 현재 적용 Screen Set 이름 + block 구성 요약 + 공개URL/미리보기/변경됨
중앙 하단(신규): 이 코너에 적용 가능한 Screen Set 카드
           → [현재 적용 중] / 적용하기 / 복제 / 편집 / 보관
우측 or 모달(신규): Screen Set 편집기 = block 리스트(순서변경) + block type별 편집
           - Idle Media Block(youtube/vimeo/image/video/operator 제공)  ← 현 idle 섹션 승격
           - Product List Block                                        ← 현 진열 편집기 승격
           - Product Content Block                                     ← 현 content_id 선택 승격
           - Corner Description / Health Info / Staff Inquiry / QR (스켈레톤)
```
- **호환**: `current_screen_set_id` NULL인 코너는 현행 편집 4섹션(legacy)을 그대로 노출 → 점진 전환.
- 전시 설정(org 단위)은 세트가 아니라 **device/store setting**으로 유지(세트 교체와 무관) — 세트 편집기 밖 별도 유지.

---

## 8. Migration / 호환 전략 (요약)

| Phase | 내용 | migration | public runtime | rollback |
|---|---|---|---|---|
| 1 | 스키마 additive(sets, blocks, current_screen_set_id) | 신규 2테이블 + 컬럼 1 (데이터 이전 0) | 무변경 | 무시하면 legacy |
| 2 | 관리 API/UX(세트 CRUD·적용·복제·block 편집) | 없음 | 무변경 | current_screen_set_id NULL=legacy |
| 3 | public runtime screen_set read | 없음 | **분기 1곳**(set 있으면 block 조립, 없으면 legacy) | 분기 off |
| 4 | 레거시 흡수(displays→block_items, idle→block) 선택 | 데이터 복사 migration | block 우선 | 원본 보존 시 복귀 |

- **dual-read 원칙**: Phase 1~3 내내 idle/displays 원본은 원천, block은 참조. 데이터 이중화 없음 → 정합성 리스크 최소.

## 9. Public runtime 변경 범위 판단

- **Phase 1~2 = 0.** screen_set은 관리 추상.
- **Phase 3 = 최소 1곳 분기**: `store-public-tablet.handler.ts`가 resolved tablet의 `current_screen_set_id`를 읽어, 있으면 blocks로 상품/idle 조립(product_list=displays 참조, idle_media=source별 조립), 없으면 **현행 configured/legacy_fallback 그대로**. → 기존 4-gate visibility·auto-return·operator merge 로직 재사용, 조립 진입점만 교체.
- OPL/service_key·visibility 쿼리 자체는 불변(WO 금지 준수).

---

## 10. 단계별 후속 WO (권장 순서)

1. **WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-SCHEMA-DESIGN-OR-MIGRATION-V1** — §5 스키마 확정 + Phase 1 additive migration 설계(생성은 별도 승인).
2. **WO-O4O-KPA-TABLET-SCREEN-SET-API-CONTRACT-V1** — §6 관리 API 계약 확정.
3. **WO-O4O-KPA-TABLET-IDLE-BLOCK-INTEGRATION-V1** — idle_media block ↔ idle_playlist_items/operator_common dual-read 통합(필수 결론 구현).
4. **WO-O4O-KPA-TABLET-SCREEN-SET-EDITOR-UX-V1** — 세트 카드 + block 편집기 UX(현 refit 위 additive).
5. **WO-O4O-KPA-TABLET-PUBLIC-RUNTIME-SCREEN-SET-READ-V1** — Phase 3 공개 분기.
6. **WO-O4O-KPA-TABLET-LEGACY-DISPLAY-IDLE-COMPATIBILITY-V1** — Phase 4 흡수/정리(선택).

> 1~2를 먼저 확정·승인한 뒤 3~4(관리·구현), 마지막에 5(공개 전환). 각 단계는 독립 배포·롤백 가능.

---

## 11. 금지 범위 준수 & 완료 기준

| 금지 | 준수 |
|---|:--:|
| 코드 구현 / migration 작성 / DB write / 데이터 UPDATE | ✅ 없음 (설계 문서만) |
| public runtime 수정 / screen_set·block 테이블 생성 | ✅ 없음 |
| idle_playlist_items 구조 변경 / operator 정책 변경 | ✅ 없음 |
| OPL/service_key 작업 혼합 / 테스트 데이터 생성 | ✅ 없음 |

| 완료 기준 | 상태 |
|---|:--:|
| read-only 조사 완료 | ✅ (§1, 선행 감사 재확인) |
| 현재 구조·파편화 지점 정리 | ✅ §1 |
| Corner/Set/Block/Assignment 모델 정의 | ✅ §2·§3 |
| 데이터 모델 후보 비교 + 권장 1안 | ✅ §4 (A안) |
| 예상 테이블/컬럼·API·UX 초안 | ✅ §5·§6·§7 |
| migration 필요 여부 판단 | ✅ §8 (Phase 1 additive 2테이블+1컬럼) |
| public runtime 변경 범위 판단 | ✅ §9 (Phase 3 분기 1곳) |
| 후속 WO 순서 제안 | ✅ §10 |
| CHECK 문서 작성·커밋·push | ✅ 본 커밋 |
