# IR-STORE-DISPLAY-ROLE-MATRIX-V1

**유사 진열/채널 4개 페이지 역할 경계 고정**

| 항목 | 값 |
|---|---|
| 작성일 | 2026-04-16 |
| 작성자 | Claude (O4O Platform AI) |
| 범위 | KPA Society `/store` 영역 4개 유사 페이지 |
| 조사 대상 | `/store/channels`, `/store/commerce/products/b2c`, `/store/commerce/tablet-displays`, `/store/marketing/signage` |
| 성격 | 조사·분석 (코드 수정 없음) |
| 목적 | WO-STORE-HIDDEN-ROUTES-UNHIDE-V1 진행 전, 유사 페이지의 역할 경계 확정 |

---

## 0. 배경

WO-STORE-SIDEBAR-4CATEGORY-RESTRUCTURE-V1 / WO-STORE-HOME-CARDS-REALIGN-V1 진행 후,
`/store` 좌측 사이드바 "매장 디스플레이" 섹션에 아래 4개 페이지가 나란히 노출된다.

- `/store/channels` — 채널 콘솔
- `/store/commerce/products/b2c` — 판매/진열
- `/store/commerce/tablet-displays` — 태블릿 진열
- `/store/marketing/signage` — 사이니지 엔진

이 4개는 **"상품·콘텐츠 + 출력 대상(채널/기기)"** 이라는 공통 축을 갖지만,
실제 코드는 서로 다른 엔티티·API·액션을 중심으로 쌓여 있다.

**이 문서의 결론은 WO-STORE-HIDDEN-ROUTES-UNHIDE-V1의 사이드바 최종 노출 결정을 좌우한다.**

---

## 1. 페이지별 코드 조사 결과

### 1.1 `/store/channels` — StoreChannelsPage

**파일**: [services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx) (911 LOC)
**컴포넌트**: `StoreChannelsPage`

#### Q1. 1차 목적
**4개 채널(B2C, KIOSK, TABLET, SIGNAGE)의 상위 실행 콘솔** — 채널을 하나의 단위로 보고, 각 채널에 "어떤 상품/콘텐츠가 올라와 있는지"를 한눈에 요약·관리하는 **채널 메타데이터 허브**.

#### Q2. 실제 핵심 행동
- 4개 탭(B2C/KIOSK/TABLET/SIGNAGE) 전환
- 선택 채널의 KPI 확인 (상태, 상품 수, 콘텐츠 수, forced 수)
- Quick Actions 실행:
  - SIGNAGE 탭 → `/store/signage`(현 `/store/marketing/signage`)로 **이탈**
  - TABLET 탭 → `/store/channels/tablet` (TabletRequestsPage)으로 **이탈**
  - B2C 탭 → `/store/{orgCode}` 스토어프론트 프리뷰로 **이탈**
- 채널에 속한 제품(B2C/KIOSK만) 추가/제거/순서변경 — `channel_products` 테이블
- 채널별 애셋 토글 — `channelMap` `{ signage, home }`
- 채널 생성 (createChannel)

#### Q3. 주 입력 · 주 출력
| 구분 | 내용 |
|---|---|
| 입력 | 채널 타입 선택, 상품 pool에서 드래그/추가, `channel_products.displayOrder` 변경, 애셋 `channelMap` 토글 |
| 출력 | 채널 객체 자체(channel row), `channel_products` 테이블, asset의 `channelMap` JSON |

#### Q4. 다른 페이지와의 차이
- **vs PharmacySellPage (`/commerce/products/b2c`)**:
  StoreChannelsPage는 **채널 단위 묶음 관리**, PharmacySellPage는 **listing(상품) 단위 상세 설정**. 전자는 "B2C 채널 전체에 어떤 상품 30개가 걸려있나", 후자는 "이 약국의 ○○상품이 B2C/KIOSK/TABLET/SIGNAGE 각각에 isVisible=true/false인가".
- **vs StoreTabletDisplaysPage**:
  TABLET 탭은 애셋 토글만 제공하고, 실제 **태블릿 상품 진열 구성은 `/store/commerce/tablet-displays`로 이관되어 있음**. 즉 channels의 TABLET 탭은 **상단 요약만 담당**.
- **vs StoreSignagePage**:
  SIGNAGE 탭은 "Signage 바로가기" 수준. 실제 **플레이리스트·스케줄 조작은 `/store/marketing/signage`에 있음**. 즉 channels의 SIGNAGE 탭은 **Shortcut Hub 역할**.

#### Q5. 사이드바에 들어간다면 권장 메뉴명 + 이유
- **후보 A**: "채널 현황" — 4채널 KPI/요약이 핵심이라는 점을 강조
- **후보 B**: "채널 콘솔" — 4채널 스위칭 UI라는 점을 강조
- **권장**: **"채널 현황"**
  - Signage·TabletDisplays·PharmacySell이 각 채널의 "실행 페이지"로 분리되어 있으므로, channels는 **상위 메타 뷰**임을 명확히 표시해야 중복 인상이 줄어든다.
  - "콘솔"은 편집 중심 느낌이 강한데, 현재 페이지는 토글/순서 등 얕은 편집만 지원 → "현황"이 실제 역할에 더 정합.

---

### 1.2 `/store/commerce/products/b2c` — PharmacySellPage

**파일**: [services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx) (856 LOC)
**컴포넌트**: `PharmacySellPage`

#### Q1. 1차 목적
**약국의 "판매 등록"과 "진열 상품" 운영** — 외부 공급자 상품을 내 매장에 "끌어와서", 어떤 채널에서 어떻게 진열·판매할지를 **listing 단위**로 세밀하게 설정.

#### Q2. 실제 핵심 행동
- **탭 1: 판매 등록 신청 (ApplicationsTab)**
  - Supply 상품을 `externalProductId` + `service_key`(kpa/kpa-groupbuy/cosmetics/glycopharm)로 신청
  - `applyProduct` API 호출 → Operator 승인 대기
  - 신청 내역/상태(PENDING/APPROVED/REJECTED) 열람
- **탭 2: 내 매장 진열 상품 (ListingsTab)**
  - 승인된 listing 목록
  - listing별 `updateListing` (가격/재고/설명 덮어쓰기)
  - listing별 **채널 설정 패널** (`ChannelSettingsPanel`) — 각 채널(B2C/KIOSK/TABLET/SIGNAGE)에서 isVisible, salesLimit, displayOrder 설정
  - 채널 칩 필터 (ALL + 동적 채널 목록)

#### Q3. 주 입력 · 주 출력
| 구분 | 내용 |
|---|---|
| 입력 | externalProductId, serviceKey, 가격/재고 overrides, listing별 per-channel isVisible/salesLimit/displayOrder |
| 출력 | `listings` 테이블 rows, `listing_channels` 테이블 rows, `applications` 테이블 rows |

#### Q4. 다른 페이지와의 차이
- **vs StoreChannelsPage**:
  channels는 "채널 → 상품 목록"(top-down), PharmacySell은 "상품 → 채널 설정"(bottom-up). **같은 데이터의 서로 다른 뷰**지만 편집 대상이 반대 방향. PharmacySellPage가 실제 상품 중심 편집 UI.
- **vs StoreTabletDisplaysPage**:
  PharmacySell의 ChannelSettingsPanel에도 TABLET 항목이 있지만, 이는 "listing이 태블릿에 노출될지"의 **boolean 스위치**. 반면 TabletDisplays는 **여러 태블릿 디바이스별로 supplier+local 상품을 섞어 순서까지 배치**하는 구성 편집기. 깊이가 다름.
- **vs StoreSignagePage**:
  PharmacySell은 상품만 다루고, Signage는 **콘텐츠(사이니지 이미지/비디오/캐러셀)** 가 주 대상. 데이터 모델 자체가 분리.

#### Q5. 사이드바에 들어간다면 권장 메뉴명 + 이유
- **후보 A**: "매장 진열 상품" (기존)
- **후보 B**: "판매/진열 상품"
- **권장**: **"매장 진열 상품"**
  - 기존 WO-STORE-HOME-CARDS-REALIGN-V1과 정합.
  - 사용자는 이 페이지를 "내 약국이 '뭘 팔고 있는지' 볼 곳"으로 인지 → "진열"이 상위 개념으로 자연스러움.
  - 신청(ApplicationsTab)은 진열의 하위 동작으로 위치시키는 것이 직관적.

---

### 1.3 `/store/commerce/tablet-displays` — StoreTabletDisplaysPage

**파일**: [services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx) (475 LOC)
**컴포넌트**: `StoreTabletDisplaysPage`

#### Q1. 1차 목적
**단일 태블릿 디바이스 단위의 "상품 진열 편집기"** — 각 태블릿에 어떤 상품을 어떤 순서로 띄울지를 **디바이스별**로 구성.

#### Q2. 실제 핵심 행동
- 태블릿 목록 로드 → 편집할 태블릿 선택 (select dropdown)
- 좌측 "상품 풀" (supplier 상품 + local 상품 2탭) → 체크박스 다중 선택 → 진열에 추가
- 우측 "현재 진열 구성" → ▲/▼ 순서 변경, X 제거, isVisible 토글
- 변경사항 저장 → `saveTabletDisplays` API → `store_tablet_displays` 테이블 (product_type discriminator: 'supplier' | 'local')
- 네비게이션: 헤더 `←` 버튼 → `/store/commerce/local-products`로 복귀

#### Q3. 주 입력 · 주 출력
| 구분 | 내용 |
|---|---|
| 입력 | selectedTabletId, supplier/local 상품 선택, sortOrder 조정, isVisible 토글 |
| 출력 | `store_tablet_displays` rows (tablet_id + product_type + product_id + sort_order + is_visible) |

#### Q4. 다른 페이지와의 차이
- **vs PharmacySellPage**:
  PharmacySell의 ChannelSettingsPanel은 "이 상품이 태블릿에 노출 가능한가?"의 **allow-list 등록**. TabletDisplays는 **그 allow-list에서 실제로 디바이스마다 어떤 상품을 어떤 순서로 띄울지** 결정하는 **후속 편집 레이어**. 따라서 **입력(PharmacySell) → 배치(TabletDisplays)** 의존 관계.
- **vs StoreChannelsPage**:
  channels의 TABLET 탭은 KPI/요약. TabletDisplays는 디바이스별 상세 편집. **channels의 TABLET 탭에서 "태블릿 진열 구성하기" Quick Action으로 연결되어야 정합**인데, 현재 코드는 `/store/channels/tablet` (TabletRequestsPage — 주문 요청 관리) 쪽으로 연결되어 있어 **혼선이 있음**.
- **vs StoreSignagePage**:
  TabletDisplays는 **상품 진열**, Signage는 **콘텐츠 플레이리스트**. 디바이스(태블릿) vs 디바이스(사이니지 모니터)라는 유사성은 있지만 다루는 엔티티(상품 vs 콘텐츠)가 완전히 다름.

#### Q5. 사이드바에 들어간다면 권장 메뉴명 + 이유
- **후보 A**: "태블릿 진열"
- **후보 B**: "태블릿 기기 진열 구성"
- **권장**: **"태블릿 진열"**
  - "기기", "구성" 같은 단어를 붙이면 다른 메뉴와 글자 길이 불균형. 단순·명확 원칙 유지.
  - "매장 진열 상품"과 구분 포인트는 "태블릿"이라는 출력 대상이므로 이를 앞에 두는 것이 가독성 우수.
  - **단, 사이드바 노출 전에 StoreChannelsPage의 TABLET 탭 Quick Action 연결 재정비 필요** (현재는 TabletRequestsPage로 가고 있음).

---

### 1.4 `/store/marketing/signage` — StoreSignagePage

**파일**: [services/web-kpa-society/src/pages/pharmacy/StoreSignagePage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreSignagePage.tsx) (1623 LOC)
**컴포넌트**: `StoreSignagePage`

#### Q1. 1차 목적
**매장 사이니지(모니터) 운영 엔진 전체** — 콘텐츠 확보 → 플레이리스트 구성 → 스케줄 적용이라는 3단 플로우로 사이니지 재생을 완전히 통제.

#### Q2. 실제 핵심 행동
- **탭 1: 내 콘텐츠 (assets)**
  - Hub에서 복사된 snapshot asset 목록 (`storeAssetControlApi.list({ type: 'signage' })`)
  - 애셋별 `channelMap` 토글 (signage / home / promotion)
  - isForced (Admin이 강제 송출) 상태 확인
- **탭 2: 내 플레이리스트**
  - 플레이리스트 CRUD (`createStorePlaylist`, `addPlaylistItem`)
  - 플레이리스트 = 사이니지의 유일한 재생 단위
- **탭 3: 스케줄**
  - `fetchSchedules` / `createSchedule`
  - priority, daysOfWeek, validFrom/validUntil, time range
- 공개 렌더: `/public/signage?playlist=:id` (iframe/external-render entry)

#### Q3. 주 입력 · 주 출력
| 구분 | 내용 |
|---|---|
| 입력 | Hub snapshot 선택, asset channelMap 토글, 플레이리스트 구성(순서/지속시간), 스케줄(요일/시간/우선순위) |
| 출력 | `store_assets`, `store_playlists`, `store_playlist_items`, `store_signage_schedules` |

#### Q4. 다른 페이지와의 차이
- **vs StoreChannelsPage**:
  channels의 SIGNAGE 탭은 **Shortcut Hub/KPI 카드**에 가까움. 실질적 편집은 모두 여기에 있음. channels의 SIGNAGE 탭 Quick Action이 `/store/signage`(현 `/store/marketing/signage`)로 이동하는 것도 이 역할 분리를 시사.
- **vs PharmacySellPage**:
  **엔티티가 근본적으로 다름** — Signage는 콘텐츠(이미지/비디오), PharmacySell은 상품(listing). 겹치지 않음.
- **vs StoreTabletDisplaysPage**:
  둘 다 **디바이스 기반 출력**이지만 대상(콘텐츠 vs 상품)이 다름. Signage는 **플레이리스트 + 스케줄**이라는 시간 축이 있고, TabletDisplays는 **정적 sort_order**만 있음. 모델이 완전히 분리.

#### Q5. 사이드바에 들어간다면 권장 메뉴명 + 이유
- **후보 A**: "매장 사이니지"
- **후보 B**: "사이니지 운영"
- **권장**: **"매장 사이니지"**
  - 기존 WO-STORE-HOME-CARDS-REALIGN-V1과 정합.
  - "사이니지"만 있으면 외부 광고판과 혼동 가능 → "매장"을 prefix로 붙이는 것이 맥락 명확.

---

## 2. 역할 매트릭스 (한 장 고정표)

| 페이지 | URL | 1차 목적 | 핵심 행동 (단일 문장) | 주 입력 | 주 출력 | 다른 페이지와 가장 큰 차이 | 권장 메뉴명 |
|---|---|---|---|---|---|---|---|
| **StoreChannelsPage** | `/store/channels` | 4채널(B2C/KIOSK/TABLET/SIGNAGE) 상위 현황·요약 허브 | "채널 단위로 KPI/상품/애셋을 훑고, 각 실행 페이지로 진입" | 채널 선택, 채널별 상품 pool/애셋 channelMap | `channel_products`, asset `channelMap` | **채널 단위 top-down 뷰** (다른 3개는 엔티티 단위) | 채널 현황 |
| **PharmacySellPage** | `/store/commerce/products/b2c` | 외부 상품 신청 + listing별 채널 설정 | "상품을 내 매장에 등록하고, 각 채널 노출을 listing 단위로 설정" | externalProductId, listing 가격/재고, per-channel isVisible/salesLimit | `listings`, `listing_channels`, `applications` | **상품 중심 bottom-up 편집** | 매장 진열 상품 |
| **StoreTabletDisplaysPage** | `/store/commerce/tablet-displays` | 태블릿 디바이스별 상품 진열 편집 | "선택한 태블릿에 어떤 상품을 어떤 순서로 띄울지 배치" | tabletId, supplier+local 상품 선택, sortOrder | `store_tablet_displays` | **디바이스별 상품 순서 배치** (PharmacySell의 후속 레이어) | 태블릿 진열 |
| **StoreSignagePage** | `/store/marketing/signage` | 사이니지 콘텐츠·플레이리스트·스케줄 전 영역 운영 | "콘텐츠 snapshot을 플레이리스트로 엮고, 스케줄로 송출 시점 제어" | Hub snapshot, playlist items, schedule(요일/시간) | `store_assets`, `store_playlists`, `store_signage_schedules` | **유일하게 콘텐츠(비상품) 엔티티 + 시간축(schedule) 보유** | 매장 사이니지 |

---

## 3. 의존 관계 다이어그램

```
                   ┌─────────────────────────────────────────┐
                   │  StoreChannelsPage (/store/channels)    │
                   │  4채널 top-down 요약 허브               │
                   │  B2C · KIOSK · TABLET · SIGNAGE 탭       │
                   └──────┬─────────────────────┬────────────┘
                          │                     │
              Quick Action│                     │Quick Action
                          ▼                     ▼
       ┌──────────────────────────┐    ┌─────────────────────────┐
       │ PharmacySellPage         │    │ StoreSignagePage        │
       │ (/commerce/products/b2c) │    │ (/marketing/signage)    │
       │                          │    │                         │
       │ - 신청(Applications)     │    │ - 콘텐츠(assets)        │
       │ - 진열(Listings)         │    │ - 플레이리스트          │
       │   - ChannelSettingsPanel │    │ - 스케줄                │
       │     (B2C/KIOSK/TABLET/   │    │                         │
       │      SIGNAGE isVisible)  │    │ → /public/signage 재생  │
       └──────────┬───────────────┘    └─────────────────────────┘
                  │
                  │  TABLET isVisible=true인 listing만
                  │  태블릿 진열 pool에 편입 가능
                  ▼
       ┌────────────────────────────────┐
       │ StoreTabletDisplaysPage        │
       │ (/commerce/tablet-displays)    │
       │                                │
       │ - 디바이스별(tablet_id)        │
       │   supplier + local 상품         │
       │   순서 배치 편집                │
       └────────────────────────────────┘
```

**핵심 관계**:
- channels는 **dispatcher** (요약 + 실행 페이지로 이탈)
- PharmacySell은 **원천 등록/채널 스위치**
- TabletDisplays는 PharmacySell의 **TABLET 채널 후속 레이어** (디바이스별 배치)
- Signage는 **별도 트랙** (콘텐츠 엔티티, 상품 라인과 분리)

---

## 4. 판정

### 4.1 유지 여부

| 페이지 | 판정 | 근거 |
|---|---|---|
| `/store/channels` | 유지 | 4채널 요약/Quick Action 허브. 중복이 아니라 **dispatcher 레이어**. |
| `/store/commerce/products/b2c` | 유지 | 상품 등록/진열의 단일 편집점. 대체 불가. |
| `/store/commerce/tablet-displays` | 유지 | 디바이스별 배치 편집. PharmacySell의 채널 스위치와 다른 편집 레이어. |
| `/store/marketing/signage` | 유지 | 콘텐츠/플레이리스트/스케줄의 단일 편집점. 엔티티가 분리되어 있음. |

**4개 모두 독립 역할. 제거 후보 없음.**

### 4.2 종속 관계 (주·부 구분)

아래 관계를 사이드바/홈 카드 배치에 반영할 것.

| 주 페이지 | 부속/진입 | 관계 설명 |
|---|---|---|
| `/store/channels` | `/store/commerce/products/b2c` | channels의 B2C·KIOSK 탭은 PharmacySell의 **요약 뷰**. 편집은 PharmacySell에서. |
| `/store/channels` | `/store/marketing/signage` | channels의 SIGNAGE 탭은 Signage 페이지로의 **바로가기**. |
| `/store/channels` | `/store/commerce/tablet-displays` | **(현재 미연결 — 수정 필요)** channels의 TABLET 탭은 현재 TabletRequestsPage(`/store/channels/tablet`)로 연결. TabletDisplays로도 별도 Quick Action이 있어야 함. |
| `/store/commerce/products/b2c` | `/store/commerce/tablet-displays` | ChannelSettingsPanel에서 TABLET isVisible=true로 설정한 listing만 TabletDisplays에서 배치 가능. **입력 → 배치**의 직렬 의존. |

### 4.3 주 메뉴 우선순위 (사이드바 "매장 디스플레이" 섹션 내 순서)

실제 사용자(약사)의 일상 업무 흐름 빈도 기준:

1. **매장 진열 상품** (`/store/commerce/products/b2c`) — 매일 열어보는 상품 운영의 단일 진입점. 가장 위.
2. **채널 현황** (`/store/channels`) — 주 1~2회 훑어보는 요약 뷰. 2순위.
3. **매장 사이니지** (`/store/marketing/signage`) — 매장 디스플레이 감각의 핵심. 콘텐츠 업데이트 주기(주~월)에 맞게 3순위.
4. **태블릿 진열** (`/store/commerce/tablet-displays`) — 태블릿 보유 매장 한정, 설정 후 거의 변경 없음. 4순위.

### 4.4 기대 산출 문장

사이드바/홈 재구성 시 아래 멘탈 모델이 고정되어야 한다.

- **`/store/commerce/products/b2c` 는 매장 진열 상품 페이지다. 상품 자체를 다룬다.**
- **`/store/channels` 는 채널 현황 페이지다. 채널별 요약을 보고 각 실행 페이지로 이동한다.**
- **`/store/commerce/tablet-displays` 는 태블릿 진열 페이지다. 디바이스별 상품 순서를 배치한다.**
- **`/store/marketing/signage` 는 매장 사이니지 페이지다. 콘텐츠·플레이리스트·스케줄을 관리한다.**

---

## 5. 후속 조치 권고

### 5.1 즉시 (WO-STORE-HIDDEN-ROUTES-UNHIDE-V1에 반영)

1. 사이드바 "매장 디스플레이" 섹션 항목 순서를 §4.3 우선순위대로 고정.
2. 4개 페이지 메뉴명을 §1 Q5 권장값으로 통일 — "매장 진열 상품", "채널 현황", "매장 사이니지", "태블릿 진열".

### 5.2 별도 WO 권고 (이 IR로 발견된 이슈)

- **WO-STORE-CHANNELS-TABLET-QUICKACTION-FIX-V1 (권고)**:
  StoreChannelsPage의 TABLET 탭 Quick Action이 현재 `/store/channels/tablet` (TabletRequestsPage — 주문 요청)으로만 연결되어 있음. 역할 매트릭스상 TabletDisplays(`/store/commerce/tablet-displays`)에 대한 Quick Action이 추가로 필요.
- **WO-STORE-SELL-LISTINGS-TABLET-LINK-V1 (권고)**:
  PharmacySellPage Listing 행의 ChannelSettingsPanel에서 TABLET을 isVisible=true로 전환할 때, "이 상품을 태블릿 어디에 배치하겠습니까?" 안내와 함께 `/store/commerce/tablet-displays` 바로가기를 노출. 입력→배치 의존 관계의 UX 완결.

---

## 6. 메모

- 이 IR은 **수정 없이 조사만** 수행했다. 4개 파일 총 **3,865 LOC** 읽음 (StoreChannelsPage 911 + PharmacySellPage 856 + StoreSignagePage 1623 + StoreTabletDisplaysPage 475).
- 4개 페이지 모두 FROZEN 대상 아님 (store-ui-core가 F3로 동결되어 있을 뿐, 서비스 측 페이지는 WO로 수정 가능).
- §4.2의 종속 관계는 사이드바 구조에는 반영하지 않고(트리 계층은 만들지 않음), **각 페이지 내부 Quick Action/안내 텍스트**로만 표현한다. 사이드바는 flat 4항목 유지.

---

*End of IR-STORE-DISPLAY-ROLE-MATRIX-V1*
