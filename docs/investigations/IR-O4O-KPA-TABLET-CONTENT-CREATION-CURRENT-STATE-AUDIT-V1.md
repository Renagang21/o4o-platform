# IR-O4O-KPA-TABLET-CONTENT-CREATION-CURRENT-STATE-AUDIT-V1

> **조사 전용 IR.** 프론트 구현 / API 변경 / DB migration·write / 템플릿 변경 / public runtime·kiosk-core 변경 / 운영 샘플 변경 / QR 콘텐츠 생성 — **전부 미수행.** 정적 코드 조사로만 작성.
> 대상: KPA 태블릿 콘텐츠 제작 흐름 (재구성 전 현재 상태 확정)
> 작성: 2026-07-14 · Status: 조사 완료 (후속 구현 WO 미착수)

---

## 0. 목표 흐름 대비 현재 요약

향후 목표:

```text
태블릿 콘텐츠 리스트 → 만들기 → 템플릿 선택 → 템플릿별 제작
→ 태블릿·QR 모바일 미리보기 → 저장 → 리스트 복귀
(제작 = 원본 생성 / 코너 적용 = 연결·교체·제거, 두 관심사 분리)
```

한 줄 결론: **데이터 계층(2단계 screen_set/block + template_key)과 제작/적용 분리(`mode`)는 이미 목표에 근접**하나, **① 스텝형 제작 셸 ② draft 미리보기 ③ 태블릿↔QR 공통 원본 배선 ④ 표준 리스트**는 미구현이다. 목표 흐름의 대부분은 **기존 자산 재사용 + 얇은 셸 신설**로 도달 가능하며, 유일하게 새 스키마/엔티티가 필요한 부분은 **태블릿·QR 공통 노출(§5·§7)** 이다.

---

## 1. 현재 데이터 · API · 화면 구조

### 1.1 데이터 (2단계 모델)

| 테이블 | 역할 | 핵심 컬럼 | 근거 |
|---|---|---|---|
| `store_tablet_screen_sets` | 화면 세트(콘텐츠 원본) | `organization_id`(NOT NULL), `tablet_id`(**nullable**), `name`, `origin`(store/operator), `status`(draft/active/archived/operator_template), `template_key`(nullable, 코드 화이트리스트), `deleted_at`(soft delete) | `20270120000000-CreateTabletScreenSetsAndBlocks.ts:22-49` · `20270205000000-AddTemplateKeyToTabletScreenSets.ts:13-16` |
| `store_tablet_screen_blocks` | 세트 내부 구성 단위 | `screen_set_id`(FK CASCADE), `block_type`(CHECK 8종), `sort_order`, `is_visible`, `config`(JSONB) | `20270120000000:52-74` · content_list 추가 `20270206000000:18-26` |
| `store_tablets.current_screen_set_id` | 세트 적용(assignment) | UUID nullable, FK SET NULL. **NULL=legacy / NOT NULL=block 렌더** 단일 스위치 | `20270120000000:77-94` |

- **block_type 8종**: `idle_media`, `product_list`, `product_content`, `corner_description`, `health_info`, `staff_inquiry`, `qr_guide`, `content_list`. (`notice`/`qr_link` 미지원.)
- **`tablet_id` nullable** → tablet에 묶이지 않은 **매장 공용 세트** 생성 가능(주석 "코너/태블릿 단위 또는 매장 재사용", `:20`). 목표의 "매장 공용 콘텐츠 원본"이 스키마상 이미 성립.
- **원본 무수정**: `content_list`/`product_list`/`product_content` 블록은 원본(SPD `shared_product_descriptions` / `kpa_store_contents` / 상품)을 **참조 ID로만** config에 담고, 표시 override는 `displayTitle`/`displaySummary` 라벨 한정. 공개 resolve는 원본을 SELECT만 (`store-tablet-content-list-block.ts:105-117`, `store-public-tablet-content-resolve.ts:76-146`).
- **별개 축 주의**: 상품 진열은 `store_tablet_displays`(별도 저장소)가 담당하고, `product_list` 블록은 공개 렌더 시 그 진열의 visibility gate 함수를 재사용한다(`handler:536-541`). 즉 "화면 구성(screen_set)"과 "상품 진열(displays)"은 다른 축.

### 1.2 API (관리 = 인증+매장owner, 공개 = 무인증 런타임)

| Method | Path | 역할 | 근거 |
|---|---|---|---|
| GET | `/store/screen-sets`, `/screen-sets/:id` | 목록 / 상세+blocks | `store-tablet.routes.ts:1175-1217` |
| POST | `/store/screen-sets` | 세트 신규 생성(`name` 필수, `templateKey?`, `tabletId?`) | `:1220-1250` |
| PATCH | `/store/screen-sets/:id` | 세트 메타 수정(name/status/tabletId/templateKey) | `:1253-1297` |
| PUT | `/store/screen-sets/:id/blocks` | 블록 **전체 교체** 저장 | `:1319-1360` |
| DELETE | `/store/screen-sets/:id` | 보관(soft delete: `deleted_at`+`status='archived'`; 적용 중이면 409) | `:1300-1316` |
| POST/DELETE | `/store/tablets/:id/current-screen-set` | 세트 적용 / 적용 해제(→legacy) | `:1420-1451` |
| GET | `/store/tablet-content-sources/{store-contents,o4o-descriptions}?q=` | content_list picker(검색 read-only, "저장/복사/생성 없음") | `:1367-1417` |
| GET | `/:slug/tablet/screen` | **공개 런타임** — legacy/screen_set 분기 + sections 조립 | `store-public-tablet.handler.ts:482-572` |

- **신규 vs 수정 차이**: 신규 = `POST screen-sets` + `PUT blocks` (2콜). 수정 = `PATCH` + `PUT blocks`. 블록은 신규·수정 무관하게 항상 delete-all+insert 전체 교체.
- **복제(clone) 엔드포인트 없음** (§5 gap).
- **공개 분기**: `current_screen_set_id` NULL 또는 세트 무효(org 불일치/archived/deleted) → `{mode:'legacy'}` 안전 폴백. 유효 → `is_visible` 블록을 `sort_order`로 정렬해 `{mode:'screen_set', templateKey, sections[]}` 반환. 개별 블록 resolve 실패는 해당 섹션만 생략(`handler:503-564`).

### 1.3 화면 (프론트)

| 파일 | 역할 |
|---|---|
| `StoreTabletDisplaysPage.tsx` | 상위 컨테이너. 탭(`corners`/`contents`)으로 corner/library 매니저 마운트(`:720-737`,`1107`,`1565`). legacy 진열·idle·설정 편집기 + kiosk-core 미리보기 오버레이 보유 |
| `TabletScreenSetManager.tsx` | **제작 UI 핵심** — 목록+생성+편집+적용이 한 파일에 결합. `mode='corner'|'library'` 분기 |
| `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | **유일 렌더 허브** — 뷰어·template_key 분기·idle·QR |
| `api/tabletDisplays.ts` / `api/tablet.ts` | 관리(auth) API / 공개(no-auth) 런타임 API |

---

## 2. 재사용 가능한 기능과 분리해야 할 기능

### 2.1 이미 재사용 준비된 자산 (신규 개발 불필요)

| 목표 스텝 | 재사용 컴포넌트/자산 | 위치 | 상태 |
|---|---|---|---|
| 템플릿 선택 | `TemplateSelectField` | `TabletScreenSetManager.tsx:577-597` | props-only, 스텝 화면으로 승격 가능 |
| 블록 제작 | `BlockConfigForm` | `:600-649` | block+onPatch props |
| 콘텐츠 선택기 | `ContentListEditor` + `ContentPickerModal` (O4O/매장 탭·검색·dedup) | `:657-882` | props-only, 다중선택 있음 |
| 대기 미디어 | `CustomMediaItems` / `IdlePlaylistEditor`(kiosk-core) | `:884-901` | props-only |
| 미리보기 | `TabletKioskPage`(실 뷰어) + `previewApi.fetchScreen` | `StoreTabletDisplaysPage.tsx:286-321` | 모달 재사용 이미 동작(§7) |
| 리스트(표준화) | `@o4o/operator-ux-core`: `useStandardListQuery`·`DataTable`(selectable)·`Pagination`·`useBatchAction`·`action-policy`(kebab) | `packages/operator-ux-core/src/list/*` | 완비. `StoreHandledProductsPage` 선례(§8) |

### 2.2 분리·신설이 필요한 결합 지점

| 항목 | 현재 상태 | 필요 작업 |
|---|---|---|
| 리스트 ↔ 에디터 | `editDetail` null 여부로 같은 컴포넌트 내 인라인 전환(모달/route 아님) `TabletScreenSetManager.tsx:418-569` | 스텝 셸로 추출(리스트·생성·템플릿·제작·미리보기·저장 단계) |
| 생성 흐름 | `handleCreate`가 생성 직후 자동 `openEdit`까지 수행 `:187-204` | 스텝화 시 자동전환 분리 |
| 저장 후 복귀 | 저장 후 패널 유지(인라인 편집 모델), 리스트 복귀 없음 `:206-238` | "저장→리스트 복귀" 전환 신설 |
| 저장 분리 | `handleSaveSet`(PATCH) + `handleSaveBlocks`(PUT) 2개 버튼 | 스텝형은 "한 번에 저장" 통합 검토 |
| 제작 vs 적용 | **이미 분리됨** — `mode`+함수+엔드포인트 축 분리. corner=apply/unapply only, library=create/edit only | 유지. ⚠단 `handleApply`가 적용 시 status를 자동 PATCH→active(`:245-247`) — 유일한 교차점 |
| 제품 선택기 | 제작기엔 없음. `product_list`는 "코너 진열 제품 사용" 안내만(`:635-636`), 실제 진열 선택은 `StoreTabletDisplaysPage` 별도 편집기 | 스텝 통합 시 legacy 진열 편집기와의 관계 정리 필요 |

---

## 3. 템플릿별 제작기 구현 가능성

### 3.1 현재 템플릿 구조

> ⚠️ 혼동 주의: `pharmacy/templates/TabletTemplates.tsx`·`KioskTemplates.tsx`는 **런타임과 무관한 정적 소개 썸네일**(Modern/Emotional/Dry/Professional 디자인 카드)이다. 실제 런타임 템플릿은 `template_key` 모델이다.

| template_key | 배치(뷰어 분기 결과) | 근거 플래그 (`TabletKioskPage.tsx:440-450`) |
|---|---|---|
| `corner_information_basic_v1`(기본/NULL) | 헤더→코너설명→QR(상단)→콘텐츠목록→상품그리드 | 모든 is*=false |
| `product_focus` | 상품 대형그리드 + QR 하단배너 | isProductFocus/isProductLayout |
| `product_grid_qr` | 밀집 상품그리드 + QR 하단배너 | isProductGrid/isProductLayout |
| `corner_overview_qr` | 코너설명+콘텐츠목록+QR 중심, 상품그리드 생략 | isCornerOverview/hideProductsBody |
| `idle_touch_video` | 상단 hero 영상 + "화면을 터치하세요/Touch to start" + QR chip | isIdleTouch |

- **코드 관리·선택형 확정**: 5키는 프론트/백엔드 화이트리스트 하드코딩(`TabletScreenSetManager.tsx:66-95`, `store-tablet.routes.ts:1158-1164`). 사용자는 등록 아닌 선택. 허용 외 키 400 `INVALID_TEMPLATE_KEY`.
- **템플릿 = 동일 sections 재배치/생략**. 템플릿이 새 블록을 요구하지 않음(`TabletKioskPage.tsx:438-439`).
- **신규 템플릿 비활성 안전**: 화이트리스트에서 키를 빼도 뷰어·서버가 기본키로 폴백. 콘텐츠 손실 없이 배치만 기본화(`:440`, `store-public-tablet-screen.ts:16-19`).

### 3.2 "템플릿마다 다른 제작 단계" 구현 가능성

**현재 데이터로는 불가 — 확장 필요.**

- 템플릿 메타는 `{key, label, description}` 3필드뿐(`TabletScreenSetManager.tsx:67-94`). **템플릿별 필수/선택 블록 계약도, 스텝/필드 스키마도 코드에 없다.** 블록 편집은 `BLOCK_TYPES` 전역 단일 목록(`:48-58`)으로 템플릿과 무관하게 동일.
- 각 섹션은 "데이터 있으면 렌더/없으면 생략"의 방어적 옵셔널 렌더뿐이라, 템플릿이 특정 블록을 **강제하지 않는다**(예: QR도 옵셔널).

→ **구현 방향**: `TEMPLATE_OPTIONS` 메타에 `requiredBlocks[]` / `steps[]`(스텝별 노출 블록·필드) 스키마를 additive로 추가하면, 기존 `BlockConfigForm`·`ContentListEditor`를 그대로 스텝별로 배치하는 "템플릿 주도 제작기"가 성립한다. 렌더러(kiosk-core)는 이미 template_key 분기가 있으므로 **제작기 측 메타 확장만으로 충분**하고 런타임 변경 불필요.

---

## 4. 태블릿 · QR 공통 원본 구조

### 4.1 현재: 두 채널은 서로 모른다

```text
[QR 채널]  store_qr_codes (slug·landing_type·landing_target_id) — QR 이미지 비저장·동적
   landing_type: video→store_videos(QR 전용 복사본) / page→kpa_contents·store_asset / product→공급자 링크
[태블릿 채널]  store_tablets → current_screen_set_id → screen_sets → blocks(config)
   content_list.items[] → SPD(master_id+language) | store_content(id)  [참조]
[공유 원본]  shared_product_descriptions · kpa_store_contents
   → QR(page/product)도 태블릿(content_list)도 각자 포인터로 도달 가능하나
     두 채널을 잇는 "단일 콘텐츠 채널 레코드"는 없음
```

- **원본 레벨 참조 공유는 가능**(SPD/kpa_store_contents), 그러나 **`store_videos`는 QR 전용 독립 복사본**(`store-video.entity.ts:12-13,86-91` `copied_from_id`)이고 screen_set은 store_videos를 전혀 참조하지 않는다.
- 태블릿 `qr_guide` 블록은 **자유 텍스트 `{label,url}`** — 운영자 임의 URL을 QR화할 뿐(`TabletScreenSetManager.tsx:118`), F12 `/r/`·`store_qr_codes`와 미연동. "이 태블릿 콘텐츠 전체 → 모바일 미러"로 자동 연결되는 코드가 없다(§6).

### 4.2 "원본 1개 → 태블릿 + QR 모바일" 성립에 필요한 최소 구조 (현재 없는 것)

1. **화면 세트 공개 slug/식별자** — `store_tablet_screen_sets`에 slug 컬럼 부재.
2. **QR landing_type에 `screen_set`(또는 `tablet_corner`) 값 + landing 렌더러 분기** — `store-qr-landing.controller.ts` switch에 케이스 추가.
3. **저장 오케스트레이션** — 현재 저장은 `saveScreenSetBlocks` 단일 채널만. 태블릿+QR 동시 등록 계층 부재.
4. **모바일(QR) 세로 렌더러** — content_list/블록을 세로 반응형으로 소비하는 뷰가 없음(§6).

> 2계층 entitlement 정책(`O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1`)은 문서상 태블릿을 과금 후보로 지목하나 resolver는 아직 `is_active`만 확인(미배선). 태블릿 QR 도입 시에도 "QR 무변경 + resolver 게이트 1곳 추가" 설계는 유효 → [[project_qr_entitlement_two_tier_policy]] 원칙 준수 가능.

---

## 5. 필요한 API · 스키마 변경 여부

| 영역 | 스키마 변경 | API 변경 | 판정 |
|---|---|---|---|
| 매장 공용 콘텐츠 원본 생성 | 불필요 (`tablet_id` nullable 이미 존재) | 불필요 (`POST screen-sets` tabletId 선택) | **가능(무변경)** |
| 스텝형 제작 셸 | 불필요 | 불필요 (기존 CRUD+blocks 재사용) | **프론트 셸만** |
| 템플릿별 제작 단계 | 불필요 | 불필요 | **프론트 메타(`TEMPLATE_OPTIONS`) 확장** |
| draft 미리보기 | 불필요 | **신설 권장** — 현재 draft preview API 없음. `TabletKioskPage`는 sections를 `api.fetchScreen`으로만 수신(주입 prop 없음). 옵션 A) 편집 중 sections를 뷰어에 직접 주입하는 prop 추가(런타임 변경) / 옵션 B) draft preview 엔드포인트 | **택1 필요** |
| embedded 미리보기 | 불필요 | kiosk-core `styles.fullscreen`(`position:fixed`) embedded prop 분리(현재 외부 컨테이너로 우회) | **선택(품질)** |
| 태블릿↔QR 공통 노출 | **필요** — screen_set slug 컬럼 + `landing_type='screen_set'` | **필요** — QR landing 렌더러 분기 + 저장 오케스트레이션 + 모바일 렌더러 | **신규 스키마/엔티티 필요** |
| 표준 리스트 | 불필요 | 불필요 | **기존 `operator-ux-core` 재사용** |
| 복제(clone) | 불필요 | **신설** — clone 엔드포인트 없음(선택) | **선택** |

핵심: **§5의 대부분은 무변경 또는 프론트 한정**이며, **새 스키마가 강제되는 것은 태블릿↔QR 공통 원본(§4.2)뿐**이다. draft 미리보기는 런타임에 sections 주입 prop을 얹느냐(최소 변경)로 처리 가능.

---

## 6. 후속 구현 WO와 의존 순서

> 모두 별도 WO 승인 필요. kiosk-core/public runtime 변경 포함 항목은 Frozen(§14 F-계열 아님이나 baseline `O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY`/kiosk consumer WO 계열) 영향 확인 필수.

```text
WO-1 (독립, 무런타임)  표준 리스트 전환
     TabletScreenSetManager library 목록 → operator-ux-core 표준 리스트
     (검색/필터/페이지네이션/체크박스 일괄/kebab). StoreHandledProductsPage 선례.
        ↓ (리스트가 진입점 제공)
WO-2 (독립, 프론트 셸)  스텝형 제작 셸
     리스트→만들기→템플릿 선택→제작→저장→리스트 복귀.
     기존 하위 위젯(TemplateSelectField/BlockConfigForm/ContentListEditor/ContentPickerModal) 재사용.
     저장 후 리스트 복귀 전환 신설. 제작/적용 분리는 mode로 이미 성립(유지).
        ↓ (제작 셸 안에 미리보기 스텝)
WO-3 (런타임 최소변경)  draft 미리보기
     kiosk-core에 sections 주입 prop(또는 draft preview API) + embedded 모드(position:fixed 분리).
        ↓ (제작기 메타 확장, WO-2 위에서)
WO-4 (프론트 메타)  템플릿별 제작 단계
     TEMPLATE_OPTIONS에 requiredBlocks/steps 스키마 additive. 런타임 무변경.

WO-5 (신규 스키마·별트랙)  태블릿↔QR 공통 원본
     screen_set slug + landing_type='screen_set' + QR landing 렌더러 + 모바일 세로 렌더러
     + 저장 오케스트레이션. entitlement 게이트는 QR 무변경 원칙(resolver 1곳)로 후속.
     ※ WO-1~4와 독립 트랙. 가장 큰 신규 작업이며 별도 설계 CHECK 선행 권장.

WO-6 (선택)  복제(clone) 엔드포인트 — 운영 편의, 독립.
```

**의존 요약**: WO-1 → WO-2 → WO-3 → WO-4 는 직렬(각 단계가 다음의 진입/토대). **WO-5(QR 공통)** 는 독립 병렬 트랙이나 신규 스키마·엔티티가 필요해 **가장 무겁고 별도 설계 선행**이 필요. WO-6 은 어디에도 독립.

---

## 7. 완료 기준 대조

| 완료 기준 | 결과 |
|---|---|
| 현재 제작 구조를 코드 근거로 확인 | ✅ §1 (스키마·API·화면 전부 file:line) |
| 기존 편집기 재사용 범위 확정 | ✅ §2.1 재사용 자산 / §2.2 분리 지점 |
| 템플릿별 제작 흐름 구현 방법 제시 | ✅ §3.2 (TEMPLATE_OPTIONS 메타 확장, 런타임 무변경) |
| 태블릿·QR 동일 원본 저장 가능 여부 확정 | ✅ §4 — 현재 불가(두 채널 미연동), 최소 구조 4항 명시 |
| 필요한 변경을 최소 단위 WO로 분리 | ✅ §5 변경표 + §6 WO 6종·의존순서 |
| 문서 commit/push | 본 문서 |
| 코드 변경 | **0** |

---

## 8. 조사에서 하지 않은 것 (금지선 준수)

프론트 구현 / API 변경 / DB migration·write / 템플릿 변경 / public runtime 변경 / kiosk-core 변경 / 운영 샘플 변경 / QR 콘텐츠 생성 — **전부 미수행.**
