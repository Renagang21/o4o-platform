# CHECK-O4O-KPA-TABLET-TEMPLATE-CONTRACT-DESIGN-V1

> WO: `WO-O4O-KPA-TABLET-TEMPLATE-CONTRACT-DESIGN-V1`
> 성격: **설계 전용** — 코드 변경 0 / DB write 0 / migration 0 / template 선택 UI 0. 계약 확정 문서.
> 선행(라이브): SCHEMA · API · IDLE-BLOCK · EDITOR-UX · PUBLIC-RUNTIME-READ · KIOSK-CORE-SCREEN-CONSUMER · FRESH-CORNER-SEED.
> 조사 대상 commit: `6bf175f43`. 기준 샘플: 구강관리 코너(`c86863d8`) / set(`7280872e`).

---

## 0. 결론 요약

- **템플릿의 역할 = 표현(배치·슬롯·강조)만 결정.** 데이터(어떤 콘텐츠)는 block 소관. 템플릿은 block set을 새로 만들지 않고, **같은 block들을 어떻게/어디에 배치하느냐**만 바꾼다.
- **template_key 저장 = A안(권장): `store_tablet_screen_sets.template_key VARCHAR(50) NULL`** additive 컬럼. NULL → 기본 `corner_information_basic_v1`(이미 `resolveTemplateKey`가 처리). 별도 `tablet_templates` 레지스트리 테이블은 **Phase 2**(템플릿별 메타/슬롯 정의를 DB로 옮길 때).
- **기본 템플릿 `corner_information_basic_v1` 계약 = 현재 라이브 동작을 정본화**(§3). 슬롯 매핑: corner_description→헤더, qr_guide→배너, product_list→상품 그리드(기존 gate), idle_media→대기 오버레이.
- **후속 템플릿 = 같은 7 block에 대한 배치/강조 변형**(product_focus / idle_video_first / comparison). 신규 template = renderer(백엔드 `/screen` + 뷰어) 분기 1개. **schema 변경 없음**(template_key 값만).
- **책임 분리**: block = `{block_type, config, sort_order, is_visible}` 데이터. template = `template_key` 배치 선택. **레이아웃(위치/크기/색/강조)을 block config에 넣지 않는다.**
- **관리 UI 템플릿 선택**: 세트 단위 `template_key` 드롭다운(계약만 — 구현은 SELECTION-EDITOR WO). API 계약 = `PATCH /screen-sets/:id { templateKey? }` + GET 응답에 `templateKey` 포함(둘 다 additive).

---

## 1. 현재 라이브 구조 재확인 (정본화 근거)

| 요소 | 현재 구현 |
|---|---|
| template key 해석 | `store-public-tablet-screen.ts` `resolveTemplateKey(set) = set.templateKey ?? 'corner_information_basic_v1'`. **컬럼 없음 → 항상 기본.** |
| /screen 조립 | visible blocks(sort_order) → section별 resolve: idle_media(`resolveTabletIdleItems`), product_list(`queryTabletVisibleProducts` gate), product_content(참조 passthrough), corner_description/health_info/staff_inquiry/qr_guide(`shapeStaticBlock`). |
| 뷰어 렌더(kiosk-core) | corner_description→헤더 제목/부제 · qr_guide→안내 배너 · idle_media→IdleOverlay 소스 · product_list→기존 `fetchProducts` 그리드. health_info/staff_inquiry/product_content→**뷰어 미렌더(계약상 슬롯 미정)**. |
| block_type (배포 CHECK 7종) | idle_media, product_list, product_content, corner_description, health_info, staff_inquiry, qr_guide |

> 즉 **현재 라이브가 곧 `corner_information_basic_v1`의 사실상 계약**이다. 이 문서는 이를 명문화한다.

## 2. 템플릿의 역할 (§1 결론)

템플릿이 **결정하는 것**:
- 각 block_type을 **어느 슬롯**(헤더/배너/메인/오버레이/사이드)에 놓을지 (슬롯 매핑).
- **배치 순서/강조**(예: product 우선 vs idle 우선), 반응형 레이아웃.
- (선택) **허용/무시 block set** — 템플릿이 소비하지 않는 block_type은 렌더 생략(soft, 데이터는 보존).

템플릿이 **결정하지 않는 것**:
- block의 **콘텐츠/데이터**(제목·본문·미디어 url·source·상품 gate) — block.config 소관.
- 상품 **visibility gate**(항상 기존 `queryTabletVisibleProducts` 정책 — 템플릿 무관).

## 3. 기본 템플릿 계약 — `corner_information_basic_v1`

**목적**: "코너 정보전달" 기본형. 코너 설명 + 상품 안내 + QR + 대기영상.

| block_type | 슬롯 | 렌더(현재 정본) |
|---|---|---|
| `corner_description` | header | 헤더 제목=title, 부제=body (없으면 기본 "매장 상품 안내") |
| `qr_guide` | banner (헤더 아래) | 📱 label + url. 없으면 미표시 |
| `product_list` | main | 상품 그리드 = 기존 `fetchProducts`(supplier gate + local). 터치→상세 |
| `idle_media` | idle overlay | 무조작 시 대기 미디어(`resolveTabletIdleItems`: legacy_idle_playlist/operator_common/custom_media). 터치→복귀(auto-return) |
| `health_info` | (V1: reserved) | 계약상 슬롯 예약 — 현재 뷰어 미렌더. 후속 슬롯 확정 |
| `staff_inquiry` | (V1: reserved) | 동일 |
| `product_content` | (V1: reserved) | 진열별 상세 콘텐츠 참조. 상세 화면 연동은 후속 |

- **슬롯 매핑은 block_type 기준(고정)** — sort_order는 리스트 내부(상품/idle 항목) 순서에만 적용, 슬롯 배치엔 미적용.
- idle **auto-return / product gate 불변**. legacy(세트 미적용) 태블릿은 기존 `/products`+`/idle` 그대로.
- **정본 규칙**: `corner_information_basic_v1`의 렌더는 현재 KIOSK-CORE-SCREEN-CONSUMER 동작과 동일하게 유지(회귀 금지). health_info/staff_inquiry/product_content 슬롯 확정은 이 템플릿의 후속 minor 개정 대상.

## 4. template_key 저장 위치 (A/B 비교 → A 권장)

| 기준 | A안 컬럼 (`store_tablet_screen_sets.template_key`) | B안 별도 테이블 (`tablet_templates` 레지스트리) |
|---|---|---|
| 스키마 변경 | additive 컬럼 1개(nullable) | 신규 테이블 + FK |
| 기존 코드 정합 | `resolveTemplateKey`가 이미 `set.templateKey` 읽음 → 컬럼만 추가하면 자동 반영 | 조회 join 추가 |
| 템플릿 정의 위치 | **코드**(renderer/슬롯 매핑) — Phase 1 | DB(메타/슬롯/허용 block) |
| 확장성 | 템플릿=코드 분기(값만 저장). 충분 | 템플릿 메타를 운영자가 편집해야 할 때 유리 |
| 비용/위험 | 低 | 中~高 |

**권장 = A안.** template_key는 세트가 "어떤 렌더 변형"인지 가리키는 **값**이고, 템플릿 **정의는 코드**(renderer + 슬롯 매핑)에 둔다. 운영자가 템플릿 자체를 편집(슬롯 재배치)할 실수요가 확인되면 Phase 2에서 B안(레지스트리)으로 승격.

**A안 스키마 초안(미실행 — 후속 WO):**
```sql
ALTER TABLE store_tablet_screen_sets
  ADD COLUMN IF NOT EXISTS template_key VARCHAR(50);   -- NULL = corner_information_basic_v1
```
- NULL 기본 → `resolveTemplateKey` 자동 처리(기존 세트 무변경). CHECK 제약은 두지 않음(코드 화이트리스트로 검증 — 신규 템플릿 추가 시 migration 불필요). 롤백 = 컬럼 무시.

## 5. 후속 템플릿 확장 방식 (§4 결론)

**원칙: 같은 7 block에 대한 배치/강조 변형.** 신규 데이터 모델 없음.

| template_key | 의도 | 배치/강조 차이(예시 계약) |
|---|---|---|
| `corner_information_basic_v1` | 코너 정보전달 기본 | §3 |
| `product_focus` | 상품 강조 | product_list를 전면 크게(대형 카드/2-3열 강조), corner_description 축소(간결 헤더) |
| `idle_video_first` | 대기영상 우선 | 진입 시 idle_media 전면(대기 우선), 터치 시 product_list. idle 비중↑ |
| `comparison` | 비교 안내 | product_list를 2-up 비교 레이아웃, corner_description=비교 기준 안내 |

**확장 메커니즘**:
1. 백엔드 `/screen`은 **template-agnostic** 유지 가능(sections + templateKey 반환) — 배치는 뷰어가 template_key로 분기. 또는 백엔드가 template별 section 가공(강조 플래그) 추가. **권장: 배치/강조는 뷰어(kiosk-core) 책임**, 백엔드는 sections + templateKey 전달(단순).
2. 뷰어: `template_key` → 레이아웃 컴포넌트 선택(switch). 미지의 template_key → 기본(corner_information_basic_v1) fallback(안전).
3. **schema/block 변경 없음** — 신규 템플릿 = 뷰어 레이아웃 분기 + (필요 시) 백엔드 강조 플래그. template_key 값만 저장.

## 6. block ↔ template renderer 책임 분리 (§5 결론)

```
block  = 데이터/콘텐츠   : { block_type, config(타입별 스키마), sort_order, is_visible }
template = 표현/배치     : template_key → 슬롯 매핑 · 강조 · 레이아웃
renderer = 조립          : 백엔드 /screen(sections 산출) + 뷰어(template_key로 배치)
```
- **금지**: block.config에 레이아웃(위치/크기/색/열수/강조) 넣기 → 표현은 template 소관. block config는 "무엇을"(title/body/source/url/items)만.
- **gate/정책은 renderer 고정**: 상품 visibility(`queryTabletVisibleProducts`), idle dual-read, auto-return — template 무관 불변.
- 미지의 block_type(향후 배포 CHECK 확장 시) → 뷰어 미렌더(안전 생략), 데이터는 보존.

## 7. 관리 UI 템플릿 선택 (계약만 — 구현 안 함)

- **Screen Set 편집기**에 세트 단위 **template 선택 드롭다운** 추가(옵션 = 코드 화이트리스트). 기본값 = corner_information_basic_v1.
- **API 계약(additive)**: `PATCH /store/screen-sets/:id { templateKey?: string }` 수용 + `GET /screen-sets[/:id]` 응답에 `templateKey` 포함(setCols에 template_key 추가). 값 검증 = 코드 화이트리스트(허용 외 400).
- 미리보기(previewApi)·공개 뷰어는 이미 `/screen`→template_key 소비 경로 존재 → 값만 흐르면 반영.
- **이번 WO는 계약만.** 컬럼/화이트리스트/select UI 구현은 후속.

## 8. 금지 범위 준수 & 완료 기준

| 금지 | 준수 |
|---|:--:|
| 코드 변경 / DB write / migration 작성 / template 선택 UI 구현 | ✅ 없음 (설계 문서만) |

| 완료 기준 | 상태 |
|---|:--:|
| 템플릿 역할 확정 | ✅ §2 |
| template_key 저장 위치 확정(A/B+권장) | ✅ §4 (A안 컬럼) |
| 기본 템플릿 corner_information_basic_v1 계약 정본화 | ✅ §3 |
| 후속 템플릿 확장 방식 | ✅ §5 |
| block↔template 책임 분리 | ✅ §6 |
| 관리 UI 템플릿 선택 계약(구현 X) | ✅ §7 |
| CHECK 커밋/push | ✅ 본 커밋 |

## 9. 다음 단계 (권장 순서)

1. **WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-KEY-SCHEMA-V1** — §4 additive 컬럼(`template_key`) + setCols/DTO/PATCH 화이트리스트 검증(관리 API에 template_key 노출). *SELECTION-EDITOR 선행 필요.*
2. **WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1** — 편집기 template 드롭다운(§7). 기본 1개라도 선택 UI + 값 저장.
3. **WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-APPLY-V1** — product_focus/idle_video_first 등 뷰어 레이아웃 분기 구현(§5).

> 순서: 계약(본 WO) → 컬럼/관리API(1) → 선택 UI(2) → 템플릿별 렌더 변형(3). 각 단계 additive·독립 배포.
