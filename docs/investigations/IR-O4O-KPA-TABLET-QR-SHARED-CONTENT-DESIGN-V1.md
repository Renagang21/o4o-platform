# IR-O4O-KPA-TABLET-QR-SHARED-CONTENT-DESIGN-V1

> **조사·설계 전용.** migration 작성 / API 구현 / QR landing 생성 / 운영 데이터 변경 / public runtime 변경 / kiosk-core 변경 / 운영 샘플 변경 — **전부 미수행.** 정적 코드 조사 + 기존 baseline 대조.
> 대상: 태블릿 콘텐츠 원본 1개를 **태블릿 화면 + QR 모바일 화면**이 함께 사용하는 구조 설계.
> 작성: 2026-07-15 · Status: 설계 완료 (구현 WO 미착수)

---

## 0. 목표 구조 (한 줄)

```text
store_tablet_screen_sets (원본 1개 · blocks 공통)
├─ 태블릿 화면  : GET /:slug/tablet/screen  (기존, current_screen_set_id) → kiosk 가로/터치
└─ QR 모바일 화면: GET /qr/public/:qrSlug   (신규 landing_type='screen_set') → 세로/스크롤
```

**태블릿용·QR용 콘텐츠를 별도 작성/복사하지 않는다.** 두 화면은 같은 blocks를 **레이아웃만 다르게** 소비한다.

핵심 발견: **신규 스키마 부담이 최소**다. `store_qr_codes.landing_type` 은 CHECK 없는 `VARCHAR(50)` → `'screen_set'` 추가에 store_qr_codes 스키마 migration **불필요**. 실제 신규 작업은 ① 앱 레벨 화이트리스트/resolver 분기 ② 모바일 렌더러 ③ 저장 시 QR row 연결 ④ (선택) screen_set 조회 인덱스·denorm 컬럼이다.

---

## 1. 현재 QR · Screen Set 구조 (조사 결과)

### 1.1 두 채널은 현재 서로 모른다

| 채널 | 저장 | 공개 진입 | 게이팅 |
|---|---|---|---|
| **QR** `store_qr_codes` | org·**slug(unique)**·**landing_type(varchar)**·landing_target_id·is_active | `GET /qr/public/:slug` **무인증**([`store-qr-landing.controller.ts:110`](../../apps/api-server/src/routes/platform/store-qr-landing.controller.ts#L110)) | `is_active=true` 만(보관/삭제=is_active=false) |
| **태블릿** `store_tablet_screen_sets` → `current_screen_set_id` → blocks | org·tablet_id(nullable)·status·template_key·**deleted_at** (slug 없음) | `GET /:slug/tablet/screen` **무인증**([`store-public-tablet.handler.ts:482`](../../apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts#L482)) | `org 일치 + deleted_at IS NULL + status<>'archived'` |

- `landing_type` = **varchar(50), CHECK/enum 없음**(`20260304120000-CreateStoreQrCodes.ts`) → 값 추가에 migration 불필요. 현재 분기: `product`/`video`/`page`/`promotion`/`link`.
- QR slug: **client `toSlug(title)` 생성 → 서버 unique 검증**(409 `SLUG_CONFLICT`). fallback `qr-${Date.now()}`.
- 두 공개 핸들러 모두 **무인증 + slug로 org 도출**(QR=store_qr_codes.organization_id / 태블릿=platform_store_slugs→storeId). QR slug ≠ store slug(별개 네임스페이스).
- 태블릿 blocks→sections **shaping 로직**은 [`store-public-tablet.handler.ts:509-559`](../../apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts#L509-L559)(정적=`shapeStaticBlock`, content_list/idle/product는 async resolve). WO-3에서 이 resolve 함수들을 read-only preview로 이미 재사용함.

### 1.2 entitlement

- `store_paid_feature_entitlements`(org+serviceKey+planCode, ACTIVE/EXPIRED/CANCELED, `isActive` 헬퍼) 존재. **QR resolver는 entitlement 미조회**(is_active만). 2계층 정책([[project_qr_entitlement_two_tier_policy]], `O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1`): QR=식별자만, resolver에 게이트 자리만(현재 "전부 통과"), 태블릿이 구독에 특히 적합.

---

## 2. 권장 스키마

> 원칙: **store_qr_codes 를 QR 채널로 재사용**(신규 테이블·landing_type migration 없음). screen_set 은 최소 additive.

### 2.1 store_qr_codes (컬럼 변경 없음, 인덱스만)

- `landing_type='screen_set'`, `landing_target_id = store_tablet_screen_sets.id`, `organization_id = set.organization_id`, `slug = toSlug(name)`(unique).
- **컬럼 추가 없음**(varchar landing_type 재사용). **인덱스 1개 추가 권장**: `idx_store_qr_codes_landing (organization_id, landing_type, landing_target_id)` — screen_set ↔ QR 역방향 조회(1:1) 가속. 없으면 org 인덱스 + 필터로도 가능(소량).

### 2.2 store_tablet_screen_sets (선택 · denorm 1컬럼)

두 안:

| 안 | 내용 | 장단 |
|---|---|---|
| **A. denorm (권장)** | nullable `public_qr_slug VARCHAR(200)` 추가. 저장 시 링크된 QR slug 를 함께 기록 | 빌더/미리보기/태블릿 qr_guide URL 도출 O(1), 조회 단순. additive 컬럼 1개 |
| B. 무컬럼 | screen_set 에 컬럼 없이 `store_qr_codes(org, 'screen_set', set.id)` 로 매번 조회 | screen_set 스키마 무변경. 대신 조회·인덱스 의존, 빌더에서 URL 노출 시 추가 쿼리 |

→ **A 권장**(1:1 링크라 denorm 안전, 빌더가 "이 콘텐츠의 QR 주소"를 즉시 표시). 동기화는 저장 오케스트레이션(§4)이 담당.

> **공개 식별자 = QR slug**(store_qr_codes.slug). **screen_set UUID 직접 노출 없음**(WO §1 우선순위 충족). screen_set 자체 slug 컬럼은 불필요(QR slug 가 공개 키 역할).

---

## 3. QR landing 계약

### 3.1 resolver 분기 신설 (`GET /qr/public/:slug`)

`landing_type==='screen_set'` 분기 추가:
```text
slug → store_qr_codes(is_active=true) → landing_target_id(=screen_set.id) + organization_id
  → store_tablet_screen_sets 로드: id=target AND organization_id=qr.org
       AND deleted_at IS NULL AND status<>'archived'   ← 태블릿 핸들러와 동일 게이트
  → blocks(is_visible) → sections (shaping)             ← §5 공용 함수
  → { landingType:'screen_set', templateKey, sections }
```
- **게이팅 이중화**: QR `is_active` **+** screen_set `deleted_at/archived`. QR is_active 만으로는 screen_set 보관을 못 거르므로 **screen_set status 재확인 필수**.
- 무효(보관/삭제/미존재) → 404 또는 안내 화면(§6).

### 3.2 POST 화이트리스트

`POST /pharmacy/qr` landingType 화이트리스트 `['product','promotion','page','link','video']` 에 **`'screen_set'` 추가**([`store-qr-landing.controller.ts:788`](../../apps/api-server/src/routes/platform/store-qr-landing.controller.ts#L788)). screen_set 유효성(org 소유·비보관) 검증 스텝 추가.

### 3.3 QR 이미지

- **동적 생성 유지**(저장 안 함). 태블릿 화면의 QR = kiosk `QrImage`(client SVG, `qr_guide.url`). 이 URL 을 `/qr/{public_qr_slug}` 로 도출(§4·§5).

---

## 4. 저장 오케스트레이션

### 4.1 ensure 패턴 (idempotent)

screen_set 저장 시 링크 QR 보장:
```text
Screen Set 저장(create/update + blocks PUT)
  → ensureScreenSetQr(set):
       기존 store_qr_codes(org, 'screen_set', set.id) 있으면 재사용
       없으면 생성: slug=toSlug(set.name) → unique 검증(충돌 시 -2/-3 suffix 재시도) → INSERT
  → (안 A) set.public_qr_slug = qr.slug 동기화
```
- **신규 저장**: set 생성 → ensure(QR 생성) → (denorm 동기화). 트랜잭션 권장(set + QR 원자적).
- **기존 수정**: ensure 가 **멱등**(이미 있으면 no-op). 이름 변경 시 slug 는 **유지**(공개 주소 불변 원칙 — 2계층 정책). title/description 만 갱신 가능.
- **lazy fallback**: resolver(§3)가 QR row 없이 접근된 경우(백필 전 기존 콘텐츠)에도 안전하도록, screen_set 이 유효하면 **접근 시 지연 생성**하거나 안내. (§7 백필과 연동.)

### 4.2 태블릿 qr_guide URL 도출

- 태블릿 메인 QR 은 `qr_guide.url` 을 **자동 = `/qr/{public_qr_slug}`** 로. 두 방법:
  - (권장) **public runtime 도출**: `/tablet/screen` shaping 시 qr_guide 섹션의 url 을 링크 QR slug 로 서버 주입(블록 config 불변, 항상 정확). ← public runtime 변경(구현 WO).
  - 또는 저장 시 qr_guide 블록 config.url 에 기록(블록 데이터에 URL 박힘 — slug 변경 시 갱신 필요, 비권장).
- **QR 원칙(모든 템플릿 메인에 QR)**: 이미 WO-4 에서 신규 draft 에 qr_guide seed + requiredBlocks 로 확보. 링크 QR 도출로 "그 QR = 이 콘텐츠 전체 모바일 진입점" 성립.

---

## 5. 모바일 렌더 구조

### 5.1 sections 공용화 (중복·게이트 불일치 방지)

- 태블릿 핸들러의 blocks→sections shaping(`:509-559`)을 **공용 함수로 추출**(`resolveScreenSetSections(ds, org, setId)` 등) → **태블릿 핸들러 + QR resolver 양쪽 재사용**. 게이트(deleted_at/archived)·resolve(content_list/idle/product/static)·templateKey 를 단일 소스로.
- WO-3 의 `POST /screen-sets/preview` 도 유사 resolve 를 하므로, 3자(preview·tablet·QR)가 같은 공용 함수를 쓰면 정합.

### 5.2 모바일 뷰어 (신규)

- QrLandingPage 는 이미 **모바일 세로 카드 UI**(maxWidth 420, 100vh). `video` 가 `PublicVideoViewer` 로 조기 분기하듯, `data.landingType==='screen_set'` → **신규 `PublicScreenSetViewer`**(sections 세로 순회 렌더러) 분기.
- 렌더: 대기 동영상 → 코너 설명 → 정보 콘텐츠(content_list 카드) → 제품 목록 → 상세(모달/인라인). `detail.html` 은 **ContentRenderer(DOMPurify)** 로만(기존 규약).
- **태블릿 vs 모바일 = 레이아웃만**: 태블릿=가로·터치 전환·큰 버튼(kiosk), 모바일=세로·스크롤·반응형(신규 뷰어). **데이터(sections)는 동일**.
- 블록 타입 커버리지: WO 예시의 "회사·브랜드 안내 / 사용 방법 / 주의사항 / 제품 상세"는 별도 block_type 이 아니라 기존 타입(`corner_description`/`health_info`/`content_list`/`product_content`)으로 표현됨 — 모바일 뷰어는 sections 를 순서대로 렌더하면 커버.

### 5.3 대기 동영상

- 모바일: `idle_media` 를 상단 영상으로 표시 후 **아래 콘텐츠 바로 스크롤**(터치 진입 강제 없음). 태블릿: 영상 + "화면을 터치하여 자세히 보세요 / Touch the screen to learn more"(kiosk 는 현재 "화면을 터치하세요/Touch to start" 하드코딩 — 문구 정합은 별도).
- idle source 중 `legacy_idle_playlist`/`operator_common` 은 tablet 저장소 의존 → **모바일(태블릿 비종속 screen_set)에서는 `custom_media` 만 안정 표시**. legacy/operator idle 을 모바일에 어떻게 노출할지는 구현 WO 결정(대개 생략 또는 대표 1개).

---

## 6. 접근 · entitlement 정책

| 항목 | 확정 |
|---|---|
| QR 모바일 화면 공개 | **공개(무인증)** — 소비자 스캔. `/qr/public/:slug` 기존 무인증 모델 유지 |
| 로그인 필요 | **불필요** |
| 비활성·보관·삭제 차단 | QR `is_active=false` → 404 **+** screen_set `deleted_at/archived` → 차단(§3.1 이중 게이트) |
| entitlement 적용 위치 | **resolver 1지점**(screen_set 분기). 현재=전부 통과(2계층 정책 "지금"). 도입 시=`isActive(entitlement(org, STORE_TABLET or STORE_BUSINESS_QR))` 확인 → 유효면 표시 / 만료면 **O4O 기본 콘텐츠·안내 화면 fallback**. QR·slug 불변 |
| 생성 시 게이트(선택) | `POST /pharmacy/qr` screen_set 분기에서 org ACTIVE 이용권 확인 후 403(도입 시). 초기엔 미적용 |

- **원칙 준수**: QR row 에 구독상태 복사 금지, 게이트는 entitlement 조회 한 곳. 태블릿=STORE_TABLET / 사업용 QR=STORE_BUSINESS_QR 플랜 후보(카탈로그는 도입 WO).

---

## 7. 기존 콘텐츠 백필

| 전략 | 내용 | 안전성 / 멱등성 |
|---|---|---|
| **A. 지연 생성(권장)** | resolver/저장에서 QR row 없으면 그때 생성(ensure). 기존 콘텐츠는 처음 저장/접근 시 QR 확보 | 대량 write 0, 멱등(있으면 no-op), 가장 안전. 단 "아직 QR 안 만들어진 콘텐츠"는 목록에서 QR 주소 미표시 |
| B. 일괄 백필 | 비보관 screen_set 전수에 QR row 생성(스크립트) | 즉시 전 콘텐츠 QR 확보. slug 충돌·대량 write 관리 필요. 멱등 위해 (org,'screen_set',set.id) 존재 검사 후 삽입 |
| C. 신규만 | 신규 콘텐츠부터 QR 링크 | 가장 단순. 기존 콘텐츠는 QR 없음(수동 재저장 시 생성) |

→ **A(지연 생성) 를 기본 + 필요 시 B(멱등 일괄 백필) 를 운영 편의로.** 둘 다 (org, landing_type, landing_target_id) 존재검사로 멱등 보장. [[reference_large_delete_migration_limit]] 원칙 준용(대량은 청크·멱등).

---

## 8. 구현 WO 분리와 순서

```text
WO-A (스키마·landing 계약)   [migration + backend]
  - store_qr_codes 인덱스(org, landing_type, landing_target_id)
  - (안 A) store_tablet_screen_sets.public_qr_slug 추가(nullable)
  - resolveScreenSetSections 공용 함수 추출(tablet 핸들러 ↔ QR resolver 공유)
  - POST /pharmacy/qr 화이트리스트 'screen_set' + 유효성
  - GET /qr/public/:slug screen_set 분기(이중 게이트) — sections 반환
        ↓
WO-B (모바일 렌더러)          [frontend]
  - QrLandingPage 에 landingType==='screen_set' 분기 + PublicScreenSetViewer(세로)
  - 대기영상/코너설명/콘텐츠/제품/상세 세로 렌더(ContentRenderer)
        ↓
WO-C (저장 오케스트레이션 + qr_guide 도출)  [backend + public runtime]
  - ensureScreenSetQr(idempotent) 를 screen_set 저장 경로에 연결
  - /tablet/screen qr_guide.url 서버 도출(= /qr/{public_qr_slug})
  - 빌더에 "이 콘텐츠의 QR 주소" 노출(선택)
        ↓
WO-D (백필 + smoke)
  - 지연 생성 확인 + (선택) 멱등 일괄 백필 스크립트
  - browser smoke: 태블릿 QR 스캔 → 모바일 세로 화면 = 같은 콘텐츠 확인
  - (도입 시 별트랙) entitlement 게이트 STORE_TABLET/BUSINESS_QR
```

- **의존**: A → B → C → D 직렬(A 가 계약·게이트 토대). entitlement 게이트는 구독 서비스 도입 시 별트랙(2계층 정책 — QR 무변경).
- **스키마 부담**: store_qr_codes **컬럼 변경 0**(인덱스만), screen_set **컬럼 1개(선택)**. landing_type migration 불필요가 이 트랙의 핵심 이점.

---

## 9. 완료 기준 대조

| 완료 기준 | 결과 |
|---|---|
| 공개 식별자 방식 확정 | ✅ QR slug(store_qr_codes.slug) = 공개 키. screen_set UUID 미노출. (선택 denorm public_qr_slug) — §2 |
| store_qr_codes 재사용 여부 확정 | ✅ 재사용(landing_type='screen_set', varchar라 migration 불필요) — §2·§3 |
| 태블릿·QR 공통 원본 구조 확정 | ✅ 원본 1개(blocks) → 2 렌더(가로 kiosk / 세로 뷰어), sections 공용 함수 — §5 |
| 저장 시 QR 연결 생성 방식 확정 | ✅ ensure(idempotent) on save + lazy fallback — §4 |
| 모바일 반응형 렌더 구조 확정 | ✅ QrLandingPage screen_set 분기 + PublicScreenSetViewer(세로) — §5 |
| 접근·구독 정책 확정 | ✅ 무인증 공개 + 이중 게이트 + resolver 1지점 entitlement(현재 통과) — §6 |
| 기존 콘텐츠 백필 전략 확정 | ✅ 지연 생성 기본 + 멱등 일괄 백필 옵션 — §7 |
| 후속 구현 WO 분리 | ✅ WO-A~D 직렬 + entitlement 별트랙 — §8 |
| 코드/DB 변경 | **0** (설계 전용) |

---

## 10. 조사에서 하지 않은 것 (금지선 준수)

migration 작성 / API 구현 / QR landing 생성 / 운영 데이터 변경 / public runtime 변경 / kiosk-core 변경 / 운영 샘플 변경 — **전부 미수행.** 정적 코드 조사 + baseline 대조로만 작성.
