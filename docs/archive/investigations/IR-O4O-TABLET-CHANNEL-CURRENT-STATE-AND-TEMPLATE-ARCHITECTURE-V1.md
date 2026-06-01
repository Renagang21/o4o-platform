# IR-O4O-TABLET-CHANNEL-CURRENT-STATE-AND-TEMPLATE-ARCHITECTURE-V1

**조사 일자**: 2026-05-09
**조사 기준**: main (`a40c46e81` 시점, sync 완료)
**조사 범위**: O4O Tablet 시스템 — 현재 구현 상태 / Signage·Storefront 와의 관계 / Template 기반 hybrid runtime 가능성
**조사자**: Claude Opus 4.7 (코드 수정 없음, 정적 분석)

---

## 0. 핵심 결론 (TL;DR)

> **현재 Tablet은 "Signage형"도 "Storefront형"도 아닌, "Display Domain 기반 정적 진열 + Interest Queue" 형태의 미니멀 kiosk다. Channel 개념 없음, Playlist 개념 없음, Template 개념 없음, Idle 개념은 부분적(폴링 후 자동복귀)으로 존재한다. Signage와는 코드/데이터/도메인이 완전히 분리되어 있어 직접 통합은 불가하나, 둘 다 `organizationId` 기반 멀티테넌트 모델을 공유하므로 상위 추상(`O4O Surface Runtime`) 위에 두 도메인을 얹는 구조로 진화하는 것은 가능하다.**

**판정**: 권장 방향 = **C-변형: Tablet = Storefront 콘텐츠 자원 + Signage idle runtime을 합성하는 Template-based composition layer**.
즉 신규 코어 엔진을 만드는 것이 아니라 **이미 존재하는 store-public-* 핸들러 + signage PlaybackEngine**을 두 모드(active/idle)로 합성하는 얇은 composition shell을 도입한다.

핵심 사실:
1. Tablet은 이미 **production-ready 수준으로 구현됨** (DB 3 테이블 + 인증/공개 API + Kiosk UI + 관리 UI). 추정 완성도 ~80%.
2. **현재 구조는 "주문 없는 전자상거래형"** — Display Domain (Commerce Core 비통과) + Interest Request Queue.
3. **"Channel" 어휘 오용 위험** — 코드에서 Tablet은 "Channel"이 아니라 "Display Device"다. WO 명명 시 `Tablet Channel` 표현은 재검토 필요.
4. **Device 개념은 이미 존재** (`store_tablets.id`) — 매장당 복수 tablet 가능.
5. **Playlist / Template / Idle Mode 개념 없음** — 단일 흐름 (browse → detail → submitted → polling → reset).
6. **Signage 코드 직접 재사용 불가** — Signage runtime(PlaybackEngine, MediaRenderer)은 시간순 재생 전제, Tablet은 공간 진열 전제. 단 device/multi-tenant 추상은 공유 가능.
7. **콘텐츠 자원은 이미 풍부하게 재사용 가능** — products / blog / QR / AI content / library 모두 store-public-* 핸들러로 공개되어 있어 Tablet에서 그대로 호출 가능.

---

## 1. 현재 Tablet Channel 구조 조사

### 1.1 데이터 구조 (DB Schema)

[20260224200000-CreateStoreLocalProductTables.ts](apps/api-server/src/database/migrations/20260224200000-CreateStoreLocalProductTables.ts#L16-L101) 에서 확정:

| 테이블 | 핵심 컬럼 | 관계 | 비고 |
|--------|----------|------|------|
| `store_tablets` | `id`, `organization_id`, `name`, `location`, `is_active` | OneToMany → displays | **device 단위** (매장당 복수 가능) |
| `store_tablet_displays` | `id`, `tablet_id`(FK), `product_type('supplier'\|'local')`, `product_id`, `sort_order`, `is_visible` | ManyToOne ← tablet | **product_id는 soft reference** (FK 없음). supplier+local 혼합 진열 |
| `store_local_products` | `id`, `organization_id`, `name`, `description`, `images`, `category`, `price_display`, `is_active`, `sort_order` | 독립 | 매장 자체 등록 상품 |

[20260301400000-TabletInterestRequests.ts](apps/api-server/src/database/migrations/20260301400000-TabletInterestRequests.ts#L24-L64):

| 테이블 | 핵심 컬럼 | 비고 |
|--------|----------|------|
| `tablet_interest_requests` | `id`, `organization_id`, `master_id`, `product_name`, `customer_name`, `customer_note`, `status`, timestamps | 상태 머신: REQUESTED → ACKNOWLEDGED → COMPLETED \| CANCELLED |

**판정**: `store_tablets` = device 엔티티, `store_tablet_displays` = device-product 매핑, `tablet_interest_requests` = 고객→직원 큐. **Channel 어휘는 코드 어디에도 없음**.

### 1.2 Backend Routes / Handlers

| 경로 | 파일 | 역할 |
|------|------|------|
| `GET /api/v1/store/tablets` 외 CRUD | [store-tablet.routes.ts](apps/api-server/src/routes/platform/store-tablet.routes.ts#L96-L721) | 인증된 직원의 tablet 관리 (CRUD, displays, product pool, interest 처리) |
| `GET /api/v1/stores/:slug/tablet/products` | [store-public-tablet.handler.ts](apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts#L23-L188) | Kiosk 공개 상품 조회 (supplier 4중 gate + local 단순 gate) |
| `POST /api/v1/stores/:slug/tablet/interest` | 위 동일 | Rate-limited 관심 요청 생성 |
| `GET /api/v1/stores/:slug/tablet/interest/:id` | 위 동일 | 3초 폴링용 상태 조회 |

### 1.3 Frontend 구조

| 모드 | 파일 | 인증 | 역할 |
|------|------|------|------|
| Kiosk (KPA) | [TabletStorePage.tsx](services/web-kpa-society/src/pages/tablet/TabletStorePage.tsx#L74-L530) | 무인증 | 풀스크린 kiosk, 4뷰 모드 (browse → detail → submitted → error) |
| Kiosk (Cosmetics) | [TabletStorePage.tsx](services/web-k-cosmetics/src/pages/tablet/TabletStorePage.tsx) | 무인증 | KPA 동등 |
| 관리 (KPA) | [StoreTabletDisplaysPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx#L36-L150) | requireAuth | tablet 선택 → pool/displays 편집 → transaction 저장 |
| 관리 (GlycoPharm) | [StoreTabletDisplaysPage.tsx](services/web-glycopharm/src/pages/store-management/StoreTabletDisplaysPage.tsx#L36-L100) | requireAuth | KPA 동등 |
| 직원보조 (GlycoPharm) | [TabletLayout.tsx](services/web-glycopharm/src/components/layouts/TabletLayout.tsx#L1-L50) | requireAuth | **하이브리드 UX** — consultation/sample/order 요청 dialog (Kiosk와 별개의 사용 패턴) |

### 1.4 Store Menu에서의 위치

[storeMenuConfig.ts#L227](packages/store-ui-core/src/config/storeMenuConfig.ts#L227): `tablet-displays` 메뉴 — KPA/GlycoPharm/Cosmetics 모두 **active 상태**.

---

## 2. 현재 Tablet UX 흐름 조사

### 2.1 Kiosk Mode 흐름 (TabletStorePage.tsx)

```
[browse: 4칼럼 그리드, supplier+local 혼합]
   ↓ (상품 카드 클릭)
[detail: 큰 이미지(300px), 상품명/가격, 설명, 고객명/메모 입력]
   ↓ (관심 표시 버튼)
[submitted: requestId 반환, 3초 폴링 시작]
   ↓ (상태 변화: REQUESTED → ACKNOWLEDGED → COMPLETED|CANCELLED)
[COMPLETED/CANCELLED 후 2분 자동 리셋 → browse]
```

**현재 구조 분류**:
- ❌ 단순 상품 리스트형 — 아님 (상세 + 관심 큐가 있음)
- ⭕ Storefront형 — 가깝지만 결제·장바구니 없음
- ❌ Signage형 — 자동재생 없음
- ⭕ Interactive 구조 — 맞음 (고객 입력 + 직원 응답)
- ❌ Idle 상태 개념 — **거의 없음**. 2분 후 browse 복귀가 유일한 idle behavior.

### 2.2 직원보조 Mode 흐름 (TabletLayout.tsx, GlycoPharm)

별개 UX. consultation/sample/order 요청 dialog 중심. Kiosk와 데이터 모델 일부 공유 가능성 있으나 흐름은 완전히 다름.

### 2.3 Idle / Autoplay / Schedule 부재

| 개념 | 존재 여부 | 위치 |
|------|----------|------|
| Idle 상태 (사용자 미조작 N분 후 행동) | ❌ | grep 결과 없음 |
| Autoplay | ❌ | 없음 |
| Schedule (시간/요일 기반 분기) | ❌ | 없음 |
| Browse 자동복귀 (kiosk timeout) | ⭕ 부분 | [TabletStorePage.tsx](services/web-kpa-society/src/pages/tablet/TabletStorePage.tsx) `submitted → 2분 후 reset` |
| Idle Slideshow | ❌ | 없음 |

---

## 3. Playlist / Signage 재사용 가능성 조사

### 3.1 Signage 시스템 요약

[CreateSignageCoreEntities Migration](apps/api-server/src/database/migrations/2026011700001-CreateSignageCoreEntities.ts#L1-L696) 기반:

- **Entity**: `signage_playlists`, `signage_media`, `signage_playlist_items`, `signage_schedules`, `signage_templates`, `signage_template_zones`, `signage_content_blocks`, `signage_layout_presets`
- **Runtime**: [PlaybackEngine.ts](services/signage-player-web/src/engine/PlaybackEngine.ts#L1-L150) — IDLE/LOADING/PLAYING/PAUSED/ERROR/STOPPED 상태머신, preload, autoAdvance, loop
- **Player Mode**: zero-ui / minimal / preview / debug
- **Device Agent**: [AgentRegistrar.ts](apps/digital-signage-agent/src/agent/AgentRegistrar.ts#L1-L120) — hardwareId 기반 등록, heartbeat

### 3.2 코드 공유 매트릭스

| 영역 | Signage | Tablet | 공유 가능성 | 메모 |
|------|---------|--------|:----------:|------|
| 재생 엔진 | PlaybackEngine | 없음 | ❌ | Tablet은 시간순 재생 개념이 없음 |
| Media Player | image/video/web (PlayerFactory) | 없음 | ❌ | 목적 상이 |
| Device 등록 | hardwareId + displayId + heartbeat | organization_id + name (정적) | ⭕ 부분 | Signage는 hardware-bound, Tablet은 organization-bound |
| Multi-tenant 경계 | serviceKey + organizationId | organization_id | ✅ | 동일 조직 ID 사용 가능 |
| Schedule | daysOfWeek + time window + priority | 없음 | ❌ | Tablet에 없는 개념 |
| Playlist Item | (mediaId, sortOrder, duration, isActive) | (productId, sortOrder, isVisible) | ⭕ 추상화 가능 | 공통 `OrderedDisplayableItem` 인터페이스 추상화 가능 |
| 상태 머신 | playing/paused/stopped/error | active/idle (암묵) | ❌ | 의미 다름 |
| UI Mode (zero-ui 등) | 4가지 | 없음 (kiosk only) | ⭕ 가능 | Tablet에 player-mode 개념 추가하면 정렬 |

### 3.3 Signage runtime을 Tablet idle 모드로 끼워넣기 — 충돌 분석

| 시나리오 | 가능 여부 | 이유 |
|----------|:--------:|------|
| TabletStorePage browse 위에 signage PlaybackEngine을 그대로 마운트 | ⭕ 가능 | 두 컴포넌트가 z-index 분리되면 가능. 단 데이터 fetch 경로 분리 필요 |
| Signage `signage_playlists` 를 Tablet idle 콘텐츠로 직접 사용 | ⭕ 가능 | 동일 `organizationId` 매장의 playlist 활용 가능 |
| Tablet device 등록을 Signage AgentRegistrar 로 통합 | ❌ 불가 | Tablet은 organization-bound (web 브라우저 기반), Signage는 hardware-bound (agent 앱) |
| 단일 Device entity 통합 (BaseDevice) | ❌ 비추천 | Display 사용 패턴이 너무 다름 (kiosk 입력 vs broadcast 출력). 추상화 비용 > 이득 |

**판정**: Signage 코드를 Tablet에 통합하는 것은 **runtime 합성 수준**(같은 화면에 두 모드를 합성)에서만 가능하며, **Entity/스키마 통합은 비추천**.

---

## 4. Template Architecture 가능성 조사

### 4.1 현재 Template 구조 부재

- Tablet 코드 어디에도 `template`, `tabletTemplate`, `kioskTemplate` 변수 없음.
- TabletStorePage 단일 흐름만 존재 — 분기 없음.
- 서비스(KPA/Cosmetics) 별 코드는 거의 동일, 차이는 색상/카피 정도.

### 4.2 5개 템플릿 도입 가능성 평가

| 템플릿 | 필요한 자원 | 현재 가능 여부 | 신규 설계 필요 항목 |
|--------|------------|:--------------:|--------------------|
| **shopping** | tablet displays + interest queue | ⭕ 즉시 가능 | (현재 구조 그대로) |
| **promotion** | playlist (slideshow) + product spotlight | ⭕ 부분 | signage runtime 합성 + spotlight rotation 정책 |
| **consultation** | consultation request flow + slot/queue | ⭕ 부분 | GlycoPharm TabletLayout 일부 재사용 가능. consultation entity 신규 필요 |
| **waiting** | queue/ticket + idle slideshow | ❌ 신규 | 대기번호/큐 entity 부재. signage idle 합성 필요 |
| **campaign** | event_offer + time-bound visibility | ⭕ 부분 | [EVENT-OFFER-COMMON-DOMAIN-V1.md](docs/baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md) baseline 존재. tablet 노출 매핑만 추가 |

### 4.3 Template-Based Composition 구조 제안 (개념)

```
TabletExperienceShell (route: /tablet/:storeSlug)
   ├── TabletTemplateResolver (DB의 store_tablets.template_key 또는 default)
   ├── ActiveModeRenderer (사용자 입력 시)
   │     ├── ShoppingMode (현재 TabletStorePage)
   │     ├── PromotionMode (product spotlight)
   │     ├── ConsultationMode (요청 dialog)
   │     ├── WaitingMode (대기번호)
   │     └── CampaignMode (event-offer 노출)
   └── IdleModeRenderer (N분 미조작)
         └── SignagePlayerEmbed (signage_playlists 합성)
```

**필요한 신규 컬럼**: `store_tablets.template_key`, `store_tablets.idle_playlist_id`, `store_tablets.idle_timeout_seconds`. 모두 nullable + default. 기존 데이터 호환.

---

## 5. Device 구조 조사

### 5.1 현재 Device 모델 평가

| 항목 | 현재 상태 |
|------|----------|
| Device 엔티티 존재 | ⭕ `store_tablets` 가 device 단위 |
| 매장당 복수 tablet | ⭕ 가능 (organization_id로 N개 등록 가능) |
| tablet별 다른 displays 구성 | ⭕ 가능 (`store_tablet_displays.tablet_id`) |
| tablet별 다른 template | ❌ 컬럼 없음 |
| tablet별 다른 idle playlist | ❌ 컬럼 없음 |
| device pairing (hardware 식별) | ❌ 없음 (web URL slug 의존) |
| device 상태 (online/offline/last_seen) | ❌ 없음 (heartbeat 없음) |

### 5.2 GAP

- **device pairing 부재** = 한 매장에 tablet A·B를 두면 둘 중 누가 누구인지 식별 불가. 현재는 URL/접속 시점에 의존.
- **상태 모니터링 부재** = 직원 화면에서 "tablet A 오프라인" 같은 정보 표시 불가.
- 다만 Signage는 이미 [AgentRegistrar.ts](apps/digital-signage-agent/src/agent/AgentRegistrar.ts) 로 hardware pairing을 구현 → 패턴 모사 가능.

---

## 6. Product + Content 혼합 구조 조사

### 6.1 재사용 가능 콘텐츠 자원

| 자원 | API 엔드포인트 | 위치 | Tablet 재사용 |
|------|---------------|------|:------------:|
| Supplier Products | `GET /:slug/products` | [store-public-product.handler.ts](apps/api-server/src/routes/platform/store-public/store-public-product.handler.ts#L1-L150) | ✅ 이미 사용 |
| Local Products | `GET /:slug/products` (local merge) | 위 동일 | ✅ 이미 사용 |
| Blog Posts | `GET /:slug/blog`, `GET /:slug/blog/:postSlug` | [store-public-content.handler.ts](apps/api-server/src/routes/platform/store-public/store-public-content.handler.ts#L1-L127) | ⭕ 미사용. promotion/idle 모드에서 재사용 가능 |
| Blog Settings (heroImage 등) | `GET /:slug/blog/settings` | 위 동일 | ⭕ idle 배경 등에 사용 가능 |
| QR Codes (스캔/landing) | StoreQrCode entity, `/qr/{slug}` | [store-qr-code.entity.ts](apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts) | ⭕ tablet detail 페이지에 QR 노출 가능 |
| Store Home (logo/hero/info) | `GET /:slug` | [store-public-home.handler.ts](apps/api-server/src/routes/platform/store-public/store-public-home.handler.ts#L29-L59) | ⭕ idle/welcome 화면에 사용 가능 |
| AI Generated Content | ProductAiContent entity (`product_description`, `pop_short`, `pop_long`, `qr_description`, `signage_text`) | [product-ai-content.entity.ts](apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts) | ⭕ tablet detail 텍스트에 활용 가능 |
| Block Renderer | KPA 콘텐츠 블록 (text/image/link/list) | [StoreContentEditPage.tsx#L42](services/web-kpa-society/src/pages/pharmacy/StoreContentEditPage.tsx#L42) | ⭕ tablet detail 본문 렌더에 재사용 가능 |
| HubCard 컴포넌트 | hub-core | [HubCard.tsx](packages/hub-core/src/components/HubCard.tsx) | ⭕ tablet 메뉴 카드로 활용 가능 |

### 6.2 Lesson / Video 자원

- LMS Lesson: [APP-LMS-BASELINE.md](docs/architecture/APP-LMS-BASELINE.md) 베이스라인 정의됨 (Phase 1, 백엔드 공통).
- 매장 단위 video 자원: 별도 entity는 없으나 signage_media (mediaType=video) 는 존재.
- Tablet에서 lesson/video 노출은 가능하나 **신규 매핑 필요**.

---

## 7. AI 연계 가능성 조사

### 7.1 AI Content 재사용

[product-ai-content.entity.ts](apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts) — productId 기반 5종 콘텐츠 타입(`product_description`, `pop_short`, `pop_long`, `qr_description`, `signage_text`).
- Tablet detail 화면에서 productId로 직접 조회 가능 → 별도 작업 없이 재사용.
- `signage_text` 타입은 idle 모드 텍스트로 활용 가능.

### 7.2 AI 추천 / AI 상담

- AI 추천: 별도 추천 엔진 부재. ProductAiContent는 콘텐츠 생성 결과만 저장.
- AI 상담: [O4O-AI-USAGE-FLOW-BASELINE-V1.md](docs/baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md) 참조. consultation 모드에서 신규 wiring 필요.
- AI Summary block: hub-core에 signal 기반으로 존재 ([HubCard.tsx](packages/hub-core/src/components/HubCard.tsx)).

### 7.3 판정

AI 콘텐츠 표시는 **즉시 가능**. AI 추천/상담은 **별도 wiring 필요** (현재 TabletStorePage에 미연동).

---

## 8. Gap 분석

### 8.1 GAP 매트릭스

| 영역 | 현재 구조 | Canonical 목표 (가정) | 충돌 요소 | 재사용 가능 부분 | 신규 설계 필요 부분 |
|------|----------|----------------------|----------|----------------|-------------------|
| **Channel 개념** | 없음 (Display Device) | "Tablet Channel" 표현은 외부 어휘 | WO 명명에서 어휘 정합성 정리 필요 | `store_tablets` (device 단위) | "channel" 어휘 폐기 또는 정식 정의 |
| **Template** | 없음 | 5개 (shopping/promotion/consultation/waiting/campaign) | TabletStorePage 단일 흐름 | TabletStorePage = shopping 템플릿 | template_key 컬럼 + 5개 mode 컴포넌트 |
| **Idle Mode** | 거의 없음 (2분 reset만) | active+idle 합성 runtime | Signage 직접 통합 불가 | Signage PlaybackEngine **임베드 가능** | idle_playlist_id 컬럼 + composition shell |
| **Device 관리** | organization_id + name | hardware pairing + 상태 모니터 | Signage agent와 paradigm 다름 | organization_id 멀티테넌트 | device pairing 토큰 + heartbeat 엔드포인트 |
| **Playlist** | 없음 | tablet은 product 진열, idle은 signage 재사용 | 두 도메인 의미 다름 | signage_playlists 직접 사용 가능 | tablet → playlist 매핑 컬럼 |
| **Storefront 분리** | TabletStorePage = mini storefront | Tablet ≠ Storefront (상이한 출력 매체) | 코드 중복 가능성 (현재는 분리 OK) | store-public-* 핸들러 공유 | 분리 유지, runtime은 별개 |
| **AI 연결** | 없음 (TabletStorePage에 미연동) | detail/idle/consultation 영역에 wiring | (없음) | ProductAiContent entity | TabletStorePage에 AI fetcher 추가 |
| **QR/POP/Blog** | 없음 (별도 페이지) | tablet에서 발견 가능 | (없음) | store-public-content/qr 핸들러 | template-mode별 wiring |

### 8.2 Signage 충돌 핵심 항목

1. **시간 vs 공간** — Signage는 시간축(playlist 순차), Tablet은 공간축(grid 진열). 동일 entity로 묶을 수 없다.
2. **출력 vs 입력** — Signage는 broadcast(단방향 출력), Tablet은 interactive(고객 입력 → 직원 응답). 상태 머신이 다르다.
3. **Hardware vs Web** — Signage는 hardware agent, Tablet은 브라우저. pairing 방식이 다르다.

→ **결론**: 두 시스템을 같은 엔티티/엔진으로 통합하는 것은 비추천. 단 **runtime 임베드** (idle 모드에서 signage 재생기를 마운트)는 가능하며 권장.

---

## 9. 최종 판단

### 9.1 4개 옵션 평가

| 옵션 | 설명 | 평가 |
|------|------|------|
| **A. Tablet = Storefront 기반 + idle overlay** | 현재 TabletStorePage 위에 idle 슬라이드쇼 추가 | ⚠️ 단기적으로 가능. 그러나 storefront(웹 결제 가능 매장 사이트)와 tablet(매장 내 키오스크)의 출력 매체·UX가 달라 코드를 합치면 두 책임이 혼재 |
| **B. Tablet = Signage 기반 + interactive mode** | Signage runtime에 입력 기능 추가 | ❌ 비추천. Signage 동결 baseline 침범. 상태 머신 충돌 |
| **C. Tablet = Template 기반 hybrid runtime** | Template-based composition layer (5 mode + idle) | ✅ **권장**. 기존 자원 최대 재사용, 신규 코어 없음 |
| **D. Tablet = Device runtime + template composition 구조** | C + hardware pairing + heartbeat 추가 | ⏳ 단계적 권장. Phase 2로 분리 |

### 9.2 권장 방향: C (Phase 1) → D (Phase 2)

**Phase 1 (Composition Shell)**
- `store_tablets`에 `template_key`, `idle_playlist_id`, `idle_timeout_seconds` 3컬럼 추가 (nullable, 호환).
- `TabletExperienceShell` 컴포넌트 도입 — TabletStorePage를 `shopping` 템플릿으로 wrap.
- `IdleModeRenderer` — signage_playlists 임베드 (PlaybackEngine 그대로 사용).
- 추가 템플릿(promotion/consultation/waiting/campaign)은 후속 WO로 분할.

**Phase 2 (Device Maturity)**
- Tablet pairing 토큰 + 상태 모니터링 추가.
- 매장 직원 화면에 "tablet A 온라인 / B 오프라인" 표시.
- 필요 시 tablet별 template/playlist 다르게 구성.

### 9.3 어휘 정리 (필수)

WO/문서에서 다음 어휘를 정리해야 한다:

| 잘못된 사용 | 정확한 표현 | 근거 |
|------------|------------|------|
| "Tablet Channel" | "Tablet Device" 또는 "Tablet Surface" | `store_tablets`는 device, channel은 organization_product_listings의 grouping |
| "Tablet Playlist" | "Tablet Idle Playlist" (signage 재사용 시) 또는 "Tablet Display" (상품 진열) | 두 개념 분리 |
| "Tablet Storefront" | "Tablet Kiosk" 또는 "In-store Tablet Surface" | Storefront는 매장 외부 노출 사이트 |

---

## 10. 산출물 및 후속 WO 순서 제안

### 10.1 산출물 (이 IR이 다루는 것)

- ✅ Tablet 시스템의 entity / route / component / API / file path 매핑
- ✅ Signage / Storefront 와의 코드 공유 가능성 매트릭스
- ✅ Template-based composition 가능성 평가
- ✅ 4개 방향(A/B/C/D) 비교 및 권장 방향 결정
- ✅ 어휘 정합성 (Channel vs Device) 지적
- ✅ 후속 WO 순서

### 10.2 후속 WO 순서 제안

| 순서 | WO 후보 | 목적 | 의존 |
|:----:|---------|------|------|
| 1 | **WO-O4O-TABLET-VOCABULARY-NORMALIZATION-V1** | "Channel" 어휘 정리, 코드/문서 일관성 | 없음 |
| 2 | **WO-O4O-TABLET-EXPERIENCE-SHELL-V1** | TabletExperienceShell 도입, 현재 화면을 `shopping` 템플릿으로 wrap (기능 변경 0, 구조만 도입) | 1 |
| 3 | **WO-O4O-TABLET-IDLE-MODE-V1** | signage_playlists 임베드 idle runtime, idle_playlist_id 컬럼 추가 | 2 |
| 4 | **WO-O4O-TABLET-AI-CONTENT-WIRING-V1** | TabletStorePage detail에 ProductAiContent 연결 (`product_description`/`pop_long`) | 2 |
| 5 | **WO-O4O-TABLET-PROMOTION-TEMPLATE-V1** | promotion 템플릿 — product spotlight + event_offer 노출 | 2, [EVENT-OFFER baseline](docs/baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md) |
| 6 | **WO-O4O-TABLET-CONSULTATION-TEMPLATE-V1** | consultation 템플릿 (GlycoPharm TabletLayout 패턴 흡수) | 2 |
| 7 | **WO-O4O-TABLET-WAITING-TEMPLATE-V1** | waiting 템플릿 (대기번호 entity 신규) | 2, 3 |
| 8 | **WO-O4O-TABLET-DEVICE-PAIRING-V1** | hardware pairing 토큰 + heartbeat | Phase 2 |
| 9 | **WO-O4O-TABLET-DEVICE-MONITOR-V1** | 직원 화면에 device 상태 모니터 노출 | 8 |

각 WO는 독립 가능하며, 1·2는 선행 필수. 3 이후는 병렬 가능.

### 10.3 주의사항

- **Signage Frozen baseline 침범 금지** — runtime 임베드만 허용, signage entity/스키마 수정 금지.
- **Storefront 동결 baseline 위반 금지** — Tablet은 Storefront와 별개의 출력 매체, store-public-* 핸들러 공유는 OK.
- **Channel 개념 신규 도입 시 명시적 WO** — 현재 코드에 없으므로 도입은 별도 베이스라인 필요.
- **OrderType 비통과 유지** — Tablet은 Display Domain으로 유지, Commerce Core 통과 금지 ([CLAUDE.md §4](CLAUDE.md), [STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md](docs/baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md)).
- KPA 기준 조사이나 **GlycoPharm/Cosmetics 모두 동일 store_tablets 구조 사용** → Phase 1 결과는 3개 서비스 동시 적용 가능.

---

# Part B — 추가 보완 조사 (2026-05-09 추가)

> **추가 목적**: Signage TV 전용 축소 가능성 / Playlist 독립 콘텐츠 orchestration layer 분리 가능성 / Tablet interactive 유지 + idle playlist 재사용 구조 평가.
>
> **핵심 추가 발견**: Signage는 이미 매체 불가지론적으로 설계되어 있다. `signage_schedules.storePlaylistId`, `signage_playlist_items.sourceType='store'` 등 분리 인프라가 이미 존재한다. 따라서 "Playlist Core 독립화"는 **신규 코어를 만드는 일이 아니라, 이미 분리된 구조를 명시적으로 노출하고 어휘를 정리하는 작업**에 가깝다.

---

## 11. Signage Runtime 분리 가능성 조사

### 11.1 Signage 코드 내 Tablet/Kiosk 흔적

| 항목 | 결과 | 근거 |
|------|------|------|
| signage 코드에서 'tablet'/'kiosk' grep | ❌ deprecated/legacy 흔적 없음 | signage 폴더는 깨끗함 |
| signage_schedules가 store playlist 지원 | ⭕ **이미 지원** | [schedule.service.ts#L69](apps/api-server/src/routes/signage/services/schedule.service.ts#L69) — `storePlaylistId` 검증 로직 |
| signage DTO에 storePlaylistId 필드 | ⭕ **존재** | [signage/dto/index.ts#L204,L219](apps/api-server/src/routes/signage/dto/index.ts) |
| forced content가 모든 store playlist에 자동 주입 | ⭕ 존재 | [forced-content.controller.ts#L12](apps/api-server/src/routes/signage/controllers/forced-content.controller.ts#L12) |

**판정**: Signage는 **TV만의 도메인이 아니라 store playlist도 함께 다루는 통합 스케줄러**로 설계되어 있다. Tablet/Kiosk 결합이 아니라 **Playlist 결합**이다.

### 11.2 Multi-device 전제 구조 (= 매체 불가지론적 설계)

| 구조 | TV 전용? | 근거 |
|------|:-------:|------|
| `SignagePlaylist` | ❌ 아님 | [SignagePlaylist.entity.ts#L82-L108](packages/digital-signage-core/src/backend/entities/SignagePlaylist.entity.ts#L82-L108) — `source`('hq'\|'supplier'\|'community'\|'store'), `scope`('global'\|'store') 모두 매체 무관 |
| `SignageSchedule` | ❌ 혼합 | [SignageSchedule.entity.ts#L54-L60](packages/digital-signage-core/src/backend/entities/SignageSchedule.entity.ts#L54-L60) — `playlistId`(Signage) + `storePlaylistId`(Tablet/Store) 둘 다 nullable |
| `PlayerMode` | ⭕ 브라우저 전제 | [signage.ts#L138](services/signage-player-web/src/types/signage.ts#L138) — 'zero-ui'\|'minimal'\|'preview'\|'debug' (TV 전용 모드 없음) |
| `device_type` 필드 | ❌ **없음** | 어느 entity에도 device_type 컬럼 없음 |
| `SignagePlaylistItem.sourceType` | ❌ 매체 무관 | [SignagePlaylistItem.entity.ts#L60-L65](packages/digital-signage-core/src/backend/entities/SignagePlaylistItem.entity.ts#L60-L65) — 'platform'\|'hq'\|'supplier'\|'store'\|'operator_ad' |

### 11.3 Fullscreen / Autoplay / PlaybackEngine 의존성

- **DOM 의존**: `position: fixed` + `object-fit: contain` 정도. `requestFullscreen` API 미사용.
- **Electron / hardware-only API**: 부재 (`window.electronAPI` 없음).
- **PlaybackEngine 코어**: [PlaybackEngine.ts#L414](services/signage-player-web/src/engine/PlaybackEngine.ts#L414) — 표준 `window.setTimeout`만 사용. 매체 무관.

**판정**: PlaybackEngine은 TV·Tablet·Kiosk·embedded 어디서든 동작 가능. 의존성 깨끗.

### 11.4 TV 전용 축소 시 보존 / 이동 / 제거 매트릭스

| 항목 | 보존 (Generic Core) | 이동 (TV 분리) | 제거 |
|------|:------------------:|:------------:|:----:|
| PlaybackEngine | ✅ 100% | – | – |
| SignageMedia entity | ✅ | – | – |
| SignagePlaylist entity | ✅ | – | – |
| SignagePlaylistItem entity | ✅ | – | – |
| SignageSchedule entity | ✅ 핵심 | `storePlaylistId` 컬럼은 Playlist Core로 흡수 | – |
| ScheduleResolver | ✅ | – | – |
| PlayerConfig.PlayerMode | ⚠️ 일부 | 'zero-ui' 등은 TV 특화 | – |
| MediaRenderer | ⚠️ 70% | `corner-display` 블록은 signage 종속 | – |
| Forced Content 주입 정책 | ⚠️ | TV 전용 강제 정책으로 한정 | – |
| `signage_template_zones` (멀티존) | ⭕ | TV-only feature | – |
| `signage_layout_presets` | ⭕ | TV-only | – |

**판정**: Signage 코드 ~30~40%만 TV 전용. 나머지 60~70%는 Playlist Core로 승격 가능.

---

## 12. Playlist Core 독립화 가능성 조사

### 12.1 현재 4개 Playlist 테이블의 관계

| 테이블 | 위치 | 역할 | 관계 |
|--------|------|------|------|
| `signage_playlists` | [migration#L25](apps/api-server/src/database/migrations/2026011700001-CreateSignageCoreEntities.ts#L25) | HQ/Supplier 원본 | 21개 컬럼 (source/scope/parentPlaylistId 포함) |
| `signage_playlist_items` | [migration#L142](apps/api-server/src/database/migrations/2026011700001-CreateSignageCoreEntities.ts#L142) | mediaId + sourceType('store' 포함) | sourceType이 이미 다중출처 |
| `store_playlists` (KPA) | [store-playlist.entity.ts#L24](apps/api-server/src/routes/kpa/entities/store-playlist.entity.ts#L24) | 매장 복사본 (snapshot) | source_playlist_id로 signage_playlists 참조 |
| `cosmetics_store_playlist` | [cosmetics-store-playlist.entity.ts#L25](apps/api-server/src/routes/cosmetics/entities/cosmetics-store-playlist.entity.ts#L25) | Cosmetics 격리 스키마 | `asset_type` 기반 (signage와 **호환 불가**) |

### 12.2 Item Type 확장 가능성

현재 mediaType 값 ([SignageMedia.entity.ts#L49](packages/digital-signage-core/src/backend/entities/SignageMedia.entity.ts#L49)):
```
'video' | 'image' | 'html' | 'text' | 'rich_text' | 'link'
```

신규 item type 도입 시 영향:

| 신규 type | 데이터 | PlaybackEngine 변경 | MediaRenderer 변경 | 위험도 |
|-----------|-------|:------------------:|:------------------:|:----:|
| `product` | productId | ❌ (외부 fetch) | ⭕ 중간 (product card 렌더) | 낮음 |
| `blog` | postSlug | ❌ | ⭕ 높음 (HTML/마크다운 + XSS 위험) | 중간 |
| `lesson` | lessonId | ❌ (video로 변환) | ❌ 재사용 | 낮음 |
| `qr` | qrSlug | ❌ | ⭕ (QR 생성) | 낮음 |
| `ai_summary` | prompt | ⭕ 높음 (생성 대기 + timeout) | ⭕ 높음 (streaming text) | 높음 |
| `external_url` | iframe URL | ❌ | ❌ ('html' 재사용) | 낮음 |

**핵심**: PlaybackEngine 자체는 **`PlaylistItem` 인터페이스만 의존** ([PlaybackEngine.ts#L13](services/signage-player-web/src/engine/PlaybackEngine.ts#L13)). 신규 item type 도입 시 엔진 변경 없이 **MediaRenderer의 switch 문 확장**만 필요. 단 ai_summary는 비동기 생성 timeout 정책 신규 필요.

### 12.3 PlaybackEngine 재사용 인터페이스 평가

PlaybackEngine 의존성 ([PlaybackEngine.ts#L88-L325](services/signage-player-web/src/engine/PlaybackEngine.ts#L88-L325)):
- 입력: `PlaylistItem[]` (id / media / displayDuration / displayOrder / isActive)
- 외부 의존: 없음 (signage 전용 import 부재)
- DOM: 표준 Web API만 (setTimeout, clearTimeout)

→ **Tablet idle 모드 임베드 시 코드 변경 0**. `engine.loadPlaylist(items); engine.play();` 호출만으로 동작.

### 12.4 Playlist Core 독립화 GAP 매트릭스

| 영역 | 현재 | 목표 | 충돌 | 신규 설계 | 위험 |
|------|------|------|------|-----------|:---:|
| Entity 위치 | `apps/api-server/src/routes/signage/` 와 `packages/digital-signage-core/` 혼재 | `packages/playlist-core/`로 분리 | 패키지 경계 변경 | playlist-core 신규 패키지 | 중 |
| sourceType 어휘 | 'platform'\|'hq'\|'supplier'\|'store'\|'operator_ad' (signage 어휘) | 'broadcast'\|'kiosk'\|'commerce'\|... 같은 매체 어휘 | 마이그레이션 필요 | enum 재정의 + 매핑 테이블 | 중 |
| MediaRenderer 분리 | `corner-display` 블록이 강결합 | Renderer Plugin Registry | corner-display는 TV 전용 | 플러그인 패턴 | 높음 |
| Cosmetics 호환 | 별도 `cosmetics_store_playlist` (asset_type 기반) | 통합 또는 어댑터 | 데이터 모델 충돌 | 어댑터 레이어 또는 마이그레이션 | 높음 |
| PlaybackEngine | 이미 generic | 그대로 유지 | 없음 | – | 없음 |
| API 경로 | `/api/v1/signage/playlists` | `/api/v1/playlists` 또는 alias | URL 변경 클라이언트 영향 | 별칭 라우트 + 점진 마이그레이션 | 낮음 |
| Forced Content | "모든 store playlist 자동 주입" | TV 전용 vs 모든 매체 정책 분리 | 정책 결정 필요 | per-playlist forced policy 컬럼 | 중 |

**판정**: 기술적으로 **"Playlist Core 분리"는 이미 80% 진행되어 있다**. 남은 작업은 (1) packages/playlist-core 패키지 신규 생성 + entity 이동, (2) MediaRenderer 플러그인화, (3) Cosmetics 어댑터, (4) 어휘 정리. **신규 코어 엔진을 만드는 일이 아님**.

---

## 13. Tablet Idle Mode 구조 조사

### 13.1 현재 Idle 관련 코드

[TabletStorePage.tsx#L150-L161](services/web-kpa-society/src/pages/tablet/TabletStorePage.tsx#L150-L161):
```
idleRef.current = setTimeout(() => { resetToDefault(); }, 120_000);
```
- 트리거 조건: `submitted` 상태 진입 후 (COMPLETED/CANCELLED 도달 시)
- 동작: BROWSE 복귀
- **사용자 미조작 추적은 없음** (`lastInteraction`, `pointerdown` 핸들러 부재)

동일 패턴 [web-k-cosmetics/.../TabletStorePage.tsx#L15](services/web-k-cosmetics/src/pages/tablet/TabletStorePage.tsx#L15).

### 13.2 다른 도메인의 idle 패턴 (학습 가능)

| 패턴 | 위치 | 비고 |
|------|------|------|
| Mouse-idle controls hide | [SignageFullscreenPlayerPage.tsx#L285-L289](services/web-kpa-society/src/pages/signage/SignageFullscreenPlayerPage.tsx#L285-L289) | 3.5초 후 controls 숨김 — Tablet에 차용 가능 |
| Duration 기반 자동 전환 | [SignageFullscreenPlayerPage.tsx#L274-L282](services/web-kpa-society/src/pages/signage/SignageFullscreenPlayerPage.tsx#L274-L282) | playlist autoplay 루프 |
| Schedule 모드 | [SignagePlaybackPage.tsx#L196](services/web-kpa-society/src/pages/pharmacy/SignagePlaybackPage.tsx#L196) | `playlistId === '_schedule'` |
| Request dialog 자동 닫음 | [TabletLayout.tsx#L86-L89](services/web-glycopharm/src/components/layouts/TabletLayout.tsx#L86-L89) | 3초 후 close — kiosk timeout 패턴 |

### 13.3 Interactive → Autoplay 전환 가능성

- 현재 부재. `pointerdown`/`onTouchStart` 핸들러 미사용.
- 도입 시 추가 필요: (1) 마지막 입력 시각 추적 ref, (2) N분 미조작 감지 timer, (3) Idle overlay 컴포넌트, (4) overlay 위 터치 → 즉시 BROWSE 복귀.
- Signage PlaybackEngine 임베드 시 `engine.stop()` 호출만으로 인터럽트 가능 ([PlaybackEngine.ts#L88-L325](services/signage-player-web/src/engine/PlaybackEngine.ts#L88-L325)).

### 13.4 Runtime State Machine 필요성

**현재 분산된 useState** (TabletStorePage 기준 8+ 개):
- viewMode, selectedProduct, customerName, customerNote, interestId, interestStatus, isSubmitting, error
- 추가 idle 도입 시 → 충돌 위험. 조건식 9개 → 12개+

**useReducer / xstate 도입 권장 — 효과**:
- 상태 전이 명시화 (`browse → detail → submitted → idle_browse`)
- side-effect (polling, timeout) 한 곳에서 관리
- Template별 정책 주입 용이

**Tablet Runtime State Machine 제안**:

```
        ┌──────────┐
        │ LOADING  │ (initial fetch)
        └────┬─────┘
             ▼
   ┌────────────────────┐
   │ BROWSE             │◀──── 모든 reset 경로 종착점
   │ (grid)             │
   └─┬──────────────┬───┘
     │ touch        │ no-input timeout (idle_threshold)
     │ product      │
     ▼              ▼
┌──────────┐   ┌───────────────────┐
│ DETAIL   │   │ IDLE_BROWSE       │  ← NEW
│          │   │ (signage embed:   │
└─┬──────┬─┘   │  PlaybackEngine)  │
  │      │    └────────┬──────────┘
  │      │ touch       │ touch (any pointerdown)
  │      └─────────────┘
  │ submit
  ▼
┌──────────────┐
│ SUBMITTED    │ (3s polling)
│              │
└──┬───────────┘
   │ COMPLETED / CANCELLED + 2분
   ▼
   BROWSE
```

---

## 14. Tablet Template + Playlist 연결 구조

### 14.1 제안 구조

```
store_tablets (확장 컬럼 — 모두 nullable + default)
 ├─ template_key       ('shopping' | 'promotion' | 'consultation' | 'waiting' | 'campaign')
 ├─ idle_playlist_id   (FK → playlist-core.playlists.id, nullable)
 ├─ interaction_mode   ('kiosk' | 'staff_assist' | 'hybrid')
 └─ runtime_policy     (jsonb: { idle_timeout_seconds, auto_return, fullscreen, prompt_on_idle })
```

### 14.2 Template별 Idle 정책 매트릭스

| Template | Idle 행동 | 데이터 자원 | runtime_policy | 구현 난도 |
|----------|----------|------------|---------------|:--------:|
| **shopping** | 매장 슬라이드쇼 (signage playlist 임베드) | `idle_playlist_id` → signage_playlists | `{ idle_timeout: 120, auto_return: true, fullscreen: false }` | 중 |
| **promotion** | 캠페인 영상 + QR (full-screen) | `idle_playlist_id` (campaign용) + event_offer | `{ idle_timeout: 60, auto_return: true, fullscreen: true }` | 중 |
| **consultation** | AI prompt 화면 ("어떤 도움이 필요하세요?") | aiPromptId | `{ idle_timeout: 300, prompt_on_idle: true }` | 높음 |
| **waiting** | 대기번호 + 예상 시간 (idle이 main mode) | queueMetricsUrl + idle_playlist_id | `{ idle_timeout: 0 }` (idle disabled, 항상 idle 화면) | 낮음 |
| **campaign** | 캠페인 영상 루프 + 터치 시 상세 | campaign_video_playlist_id | `{ idle_timeout: 0, autoplay: true }` | 낮음 |

### 14.3 Coexistence 가능성

| 시나리오 | 가능 | 비고 |
|----------|:----:|------|
| shopping template + playlist coexist | ✅ | active=BROWSE/DETAIL/SUBMITTED, idle=PlaybackEngine 임베드. z-index 분리 |
| consultation template + AI runtime coexist | ✅ | active=AI 대화, idle=signage playlist 또는 AI 인사 prompt |
| waiting template만 playlist 사용 | ✅ | playlist가 main 콘텐츠 |
| campaign template + interactive overlay | ✅ | playlist 위에 터치 hotspot |

**판정**: 모두 가능. 현재 `store_tablets` 구조에 컬럼 추가만으로 도달 가능 (호환성 유지).

---

## 15. TV 전용 Signage 단순화 조사

### 15.1 Signage 메뉴/구조 내 비-TV 흔적

| 항목 | 결과 | 근거 |
|------|:----:|------|
| 'tablet' / 'kiosk' 키워드 | ❌ 없음 | grep 결과 0 |
| 멀티 device 분기 | ❌ 없음 | device_type 컬럼 부재 |
| 'store playlist' 통합 | ⭕ **존재** | `signage_schedules.storePlaylistId`가 이미 매장 playlist를 스케줄링 |
| 'multi-zone' 레이아웃 | ⭕ 존재 | `signage_template_zones` (TV 전용 멀티존) |
| 'corner-display' 블록 | ⭕ 존재 | [MediaRenderer.tsx#L226-L242](services/signage-player-web/src/components/player/MediaRenderer.tsx#L226-L242) — TV에 특화된 코너 노출 |

### 15.2 정리 항목

**제거 가능**: 없음 (legacy 코드 부재).

**TV 전용으로 축소**:
- `signage_template_zones` (멀티존 레이아웃) — TV-only feature
- `signage_layout_presets` — TV-only
- `corner-display` 블록 — TV-only
- `Forced Content`의 "모든 store playlist 자동 주입" 정책 — TV-only로 한정 가능

**공통 Playlist Core로 이동**:
- `signage_playlists` → `playlists` (table rename or alias)
- `signage_playlist_items` → `playlist_items`
- `signage_media` → `media_assets`
- `PlaybackEngine` (이미 generic)
- `SignageSchedule` (이미 storePlaylistId 지원)
- `ScheduleResolver`

**판정**: Signage는 이미 두 개 도메인(TV broadcast + Store playlist)을 함께 다루고 있다. **단순화 = 명시적 분리**.

---

## 16. Canonical 구조 제안 (보완)

### 16.1 3-Layer 분리

```
┌──────────────────────────────────────────────────────────────┐
│                  PLAYLIST CORE (신규 분리)                     │
│  packages/playlist-core/                                      │
│  - playlists, playlist_items, media_assets                   │
│  - PlaybackEngine (generic)                                  │
│  - ScheduleResolver                                          │
│  - MediaRenderer Plugin Registry                             │
│  - item types: image | video | html | product | blog |       │
│                lesson | qr | ai_summary | external           │
│  소비자: signage / tablet / 향후 다른 surface                  │
└──────────────────────────────────────────────────────────────┘
                ▲                        ▲
                │                        │
   ┌────────────┴───────────┐  ┌─────────┴──────────────┐
   │  TV SIGNAGE RUNTIME    │  │  TABLET INTERACTIVE    │
   │  (TV 전용 축소)         │  │  RUNTIME               │
   │                        │  │                        │
   │  - fullscreen playback │  │  - shopping template   │
   │  - multi-zone layout   │  │  - promotion template  │
   │  - corner-display      │  │  - consultation        │
   │  - forced content      │  │  - waiting             │
   │  - layout presets      │  │  - campaign            │
   │  - zero-ui mode        │  │  - idle = playlist     │
   │                        │  │    embed (Playlist Core)│
   └────────────────────────┘  └────────────────────────┘
```

### 16.2 책임 경계

| Layer | 책임 | 금지 |
|-------|------|------|
| **Playlist Core** | playlists, items, media, scheduling, generic playback engine, plugin registry | UI 모드(zero-ui/fullscreen) 결정 금지. 매체별 분기 금지 |
| **TV Signage Runtime** | fullscreen playback, multi-zone, corner-display, forced content, layout presets | playlist core entity 신규 추가/스키마 변경 금지 |
| **Tablet Interactive Runtime** | template (5종), interaction mode, idle overlay, runtime policy, AI/QR/blog/product wiring | playlist core entity 변경 금지. Signage 컴포넌트 직접 import 금지 (playlist core를 경유) |

### 16.3 Storefront / Tablet / TV의 매체 정의

| 매체 | 목적 | 출력 | 입력 | 사용 자원 |
|------|------|------|------|----------|
| **Storefront** | 매장 외부 노출 (웹) | 일반 브라우저 | 마우스/키보드 | store-public-* + 결제 |
| **Tablet (Kiosk)** | 매장 내 고객 + 직원 | 풀스크린 (브라우저 기반) | 터치 | store-public-* + interest queue + Playlist Core (idle) |
| **TV Signage** | 매장 내 broadcast | TV (Electron/agent 또는 web) | 없음 (broadcast) | Playlist Core + multi-zone layout |

### 16.4 보완된 후속 WO 순서

기존 9개 WO (Part A §10.2)에 다음 4개 추가:

| 순서 | WO 후보 | 목적 | 의존 |
|:----:|---------|------|------|
| 0 | **WO-O4O-PLAYLIST-CORE-EXTRACT-V1** | `packages/playlist-core` 신규 + signage entity/엔진 이동 (rename/alias) | (선행 WO) |
| 0.5 | **WO-O4O-PLAYLIST-RENDERER-PLUGIN-V1** | MediaRenderer 플러그인화, corner-display 블록 분리 | 0 |
| 0.7 | **WO-O4O-PLAYLIST-COSMETICS-ADAPTER-V1** | `cosmetics_store_playlist` 어댑터 또는 마이그레이션 | 0 |
| 0.9 | **WO-O4O-SIGNAGE-TV-RUNTIME-NORMALIZATION-V1** | Signage를 TV 전용 runtime으로 명시화, multi-zone/corner-display/forced 정책을 TV 한정 | 0 |

새 WO 0~0.9는 Part A WO 1~9의 **선행 인프라**다. 단 신중한 점진 마이그레이션 필요 (signage 코드 동결 baseline 영향).

### 16.5 위험 요소 및 주의사항

- **Cosmetics 격리 스키마 호환** (높은 위험) — `cosmetics_store_playlist`는 `asset_type` 기반으로 `signage_playlists`와 호환 안 됨. 어댑터 또는 마이그레이션 결정 필요.
- **Signage Frozen baseline** — Signage는 동결 영역. Playlist Core 분리 시 entity rename은 alias로 점진 진행 필요.
- **MediaRenderer corner-display 분리** — TV-only 컴포넌트가 generic renderer에 강결합. 플러그인 패턴 도입 비용.
- **AI item type 비동기성** — `ai_summary` item은 PlaybackEngine의 동기 duration 가정과 충돌. timeout 정책 신규 필요.
- **어휘 통일** — 현재 'sourceType'='store'는 매체가 아니라 출처. 매체(broadcast/kiosk/...) 와 출처(hq/store/supplier/...)를 분리해서 정의 필요.

### 16.6 권장 단계 요약

1. **Phase 0 — Playlist Core 분리** (인프라): WO-0, WO-0.5, WO-0.7, WO-0.9
2. **Phase 1 — Tablet Composition Shell** (Part A §9.2): WO-1, WO-2, WO-3
3. **Phase 2 — Tablet 템플릿 확장 + AI Wiring**: WO-4, WO-5, WO-6, WO-7
4. **Phase 3 — Device Maturity**: WO-8, WO-9

각 Phase 종료 시 별도 baseline 문서로 동결 권장.

---

*IR-O4O-TABLET-CHANNEL-CURRENT-STATE-AND-TEMPLATE-ARCHITECTURE-V1 (Part B 추가)*
*Updated: 2026-05-09*
*Status: Investigation Complete — Phase 0~3 후속 WO 분기 대기*
