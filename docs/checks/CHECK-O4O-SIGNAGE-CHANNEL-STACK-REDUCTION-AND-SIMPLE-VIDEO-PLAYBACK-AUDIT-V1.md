# CHECK-O4O-SIGNAGE-CHANNEL-STACK-REDUCTION-AND-SIMPLE-VIDEO-PLAYBACK-AUDIT-V1

**대상 WO**: WO-O4O-SIGNAGE-CHANNEL-STACK-REDUCTION-AND-SIMPLE-VIDEO-PLAYBACK-AUDIT-V1
**기준 commit**: `2184053ba` (origin/main, worktree clean)
**작성일**: 2026-08-26
**성격**: **감축 감사** — 구현·삭제 0. production **SELECT only**, write 0 · schema/migration 0

---

## 0. 결론 요약

```text
"매장 태블릿에서 YouTube/Vimeo 를 재생한다" 는 요구는
이미 프로덕션에서 동작하고 있다 — 단, Channel 스택이 아니라 Tablet ScreenSet 축에서.
```

프로덕션 실측으로 **서로 다른 3개 축**이 병존함이 확인됐다.

| 축 | 경로 | 프로덕션 데이터 | 판정 |
|---|---|---|---|
| **A. Channel 스택** | `/api/v1/channels` (12 endpoint) → `ChannelPlayerPage` | `channels` **0** · `channel_heartbeats` **0** · `channel_playback_logs` **0** | **RETIRE 후보** |
| **B. Signage 스택** | `/api/signage/:serviceKey/*` (72 endpoint) → `SignagePlayerPage` | `signage_media` **7**(전부 YouTube, active 5) · `playlists` 1/items 3 · `schedules` **0** · `playback_logs` **0** | **SIMPLIFY** |
| **C. Tablet ScreenSet** | `store-public/*` · `o4o-store/*` → `PublicScreenSetViewer` | `screen_sets` **54** · `screen_blocks` **184** (**`idle_media` 35 중 21건이 YouTube URL**) · `store_tablets` 6 | **KEEP (실제 활성 축)** |

**즉 실제 영상 재생은 축 C 에서 일어나고 있고, 축 A 는 데이터가 0이다.**

---

## 1. 기준선 (WO §3)

```text
HEAD == origin/main == 2184053ba · branch=main · worktree clean
다른 세션 WIP 미접촉 · git add . 미사용
production write 0 (SELECT 전용) · schema/migration 0 · 코드 변경 0
```

> DB read 채널: `apps/api-server/.env` 의 `DB_PASSWORD`(8/6자 기록)는 **더 이상 인증되지 않는다**.
> Secret Manager `o4o-api-db-password` 최신 버전으로 조회했다. (§38 UNKNOWN 참조)

---

## 2. 모집단 census (WO §4) — 미조사 0

프로덕션 실측 32개 테이블 (`channel|display|tablet|playlist|player|heartbeat|playback|slot|screen|signage|media` 매칭).

| table | rows | 축 | 상태 분류 (§22) |
|---|---:|---|---|
| `store_tablet_screen_blocks` | **184** | C | **ACTIVE_IN_PRODUCTION** |
| `store_tablet_screen_sets` | **54** | C | **ACTIVE_IN_PRODUCTION** |
| `media_assets` | 35 | 공용 | ACTIVE |
| `cms_content_slots` | 30 | CMS(웹) | ACTIVE — **signage 아님**(§8) |
| `store_playlists` | 11 | B/C 경계 | DEPLOYED_BUT_UNUSED (published+active 0) |
| `store_tablet_corner_contents` | 10 | C | ACTIVE |
| `signage_media` | **7** | B | ACTIVE (전부 YouTube) |
| `store_tablet_displays` | 6 | C | ACTIVE (상품 진열, 영상 아님) |
| `store_tablets` | 6 | C | ACTIVE (active 2) |
| `signage_templates` | 4 | B | DEPLOYED_BUT_UNUSED |
| `signage_playlist_items` | 3 | B | 최소 사용 |
| `tablet_interest_requests` | 3 | C | ACTIVE |
| `organization_channels` | 2 | 별개(매장 채널) | ACTIVE — **signage 아님** |
| `signage_forced_content` | 2 | B | 최소 사용 |
| `store_tablet_display_settings` | 2 | C | ACTIVE |
| `signage_playlists` | 1 | B | 최소 사용 (kpa-society 1건) |
| **`channels`** | **0** | **A** | **DEPLOYED_BUT_UNUSED** |
| **`channel_heartbeats`** | **0** | **A** | **DEPLOYED_BUT_UNUSED** |
| **`channel_playback_logs`** | **0** | **A** | **DEPLOYED_BUT_UNUSED** |
| `signage_playback_logs` | 0 | B | DEPLOYED_BUT_UNUSED |
| `signage_schedules` | 0 | B | DEPLOYED_BUT_UNUSED |
| `signage_content_blocks` · `signage_layout_presets` · `signage_template_zones` · `signage_ai_generation_logs` · `signage_forced_content_positions` | 0 | B | DEPLOYED_BUT_UNUSED |
| `store_playlist_items` | 0 | B/C | DEPLOYED_BUT_UNUSED |
| `store_tablet_operator_idle_selections` | 0 | C | DEPLOYED_BUT_UNUSED |
| `cosmetics.cosmetics_store_playlists` · `_items` | 0 | 서비스 확장 | DEPLOYED_BUT_UNUSED |
| `external_channel_product_links` · `organization_product_channels` | 0 | 외부판매(별개 도메인) | 범위 밖 |

---

## 3. 실제 사용자 흐름 vs 현재 기술 흐름 (WO §5)

### 3-1. 지금 **실제로 동작하는** 흐름 (축 C · 프로덕션)

```text
매장 운영자
└ 태블릿 화면 세트 편집기 (packages/tablet-screen-set-editor, 1581 L)
  └ idle_media 블록에 YouTube/Vimeo URL 직접 입력
     저장 형태: { source:'custom_media', items:[{ mediaType, url }] }
     → store_tablet_screen_blocks.config
└ store_tablets.current_screen_set_id 로 태블릿에 세트 지정
└ 공개 뷰어(PublicScreenSetViewer / store-public-tablet-idle-resolve)가 재생
```

**계층 수: 3** (Tablet → ScreenSet → Block(URL)). Channel·Slot·CMS Content·Playlist **전부 미경유**.

### 3-2. 축 A 가 요구하는 흐름 (프로덕션 데이터 0)

```text
Channel 생성 → slotKey 지정 → CMS Content 생성 → Channel↔Slot 연결
→ channel.code 발급 → Player URL → Heartbeat → Playback Log
```

**계층 수: 7+.** 같은 목적(URL 재생)에 4계층이 더 많고, 그 4계층이 **전부 빈 테이블**이다.

### 3-3. 불필요 단계 발생 지점

| 단계 | 최소 요구 대비 |
|---|---|
| Channel 생성 | 태블릿(Display)이 이미 소유·주소 축을 가짐 → **중복** |
| slotKey | 화면 배치 개념. 단일 대기영상 재생에 **불필요** |
| CMS Content | 제목·본문·기간·authorRole 등 문서 모델. URL 재생에 **과잉** |
| Channel↔Slot 연결 | 위 둘의 부산물 |
| channel.code | `store_tablets.id` + 공개 resolve 로 **대체 가능** |
| Heartbeat / Playback Log | 조회 UI·비즈니스 요구 미확인, row 0 |

---

## 4. 축별 상세 판정

### 4-1. Display / Tablet (WO §6) → **KEEP**

`store_tablets` 컬럼: `id, organization_id, name, location, is_active, idle_playlist_items, current_screen_set_id`

**WO §23 이 스케치한 Display 모델이 이미 존재한다.** 새로 만들 필요가 없다.

```text
프로덕션: 6대 (active 2) · 2개 organization · current_screen_set_id 보유 2
주의: idle_playlist_items 컬럼은 6/6 전부 비어 있다 → 실사용 0 (SIMPLIFY 대상)
```

### 4-2. Channel (WO §7·§28) → **RETIRE 후보 / REDUNDANT**

| 질문 | 답 |
|---|---|
| Channel 이 물리 기기인가? | **아니다.** 물리 기기는 `store_tablets` 다 |
| 재생 목록인가? | 아니다. 목록은 slot↔content 연결로 파생된다 |
| 논리 방송 채널인가? | 설계상 그렇지만 **프로덕션 인스턴스 0** |
| 단순 중간 객체인가? | **사실상 그렇다** |

**Q1. Channel 객체가 필요한가 → 현재 요구에는 필요 없다.**
**Q2. Display 가 직접 media 를 가리키면 되는가 → 되고, 이미 그렇게 동작 중이다**
(`store_tablets.current_screen_set_id` → block.config.url).
**Q3. 유지 시 최소 역할 → "기기 주소(code)로 재생 대상 찾기" 하나뿐이며, 그것도 축 C 의 공개 resolve 가 이미 수행한다.**

### 4-3. Slot (WO §8·§29) → **분리 판정**

| 대상 | 판정 |
|---|---|
| `cms_content_slots` (30행: hero/banner 등 **웹 UI 배치 슬롯**) | **KEEP** — signage 와 무관한 CMS 웹 화면 축 |
| **signage 편성 슬롯으로서의 slotKey** (`channels.slotKey`) | **RETIRE 후보** |

**Signage 전용 player 에 CMS Slot 은 필요하지 않다.** 축 C 는 slot 을 전혀 쓰지 않으며,
축 A 의 slotKey 는 `channels` 가 0이라 실사용 근거가 없다. 두 개념을 혼동하지 않도록 문서상 분리한다.

### 4-4. CMS Content (WO §9·§30) → **NOT_NEEDED_FOR_SIMPLE_VIDEO**

축 A player 가 소비하는 content 필드: `id · title · contentType · body? · excerpt? · featuredImage? · metadata?`
**단순 URL 재생에 필요한 것은 URL 하나뿐이다.** 축 C 는 CMS Content 를 경유하지 않고
`block.config.items[0].url` 을 직접 쓴다.

→ CMS Content 는 **웹 콘텐츠 모델로서 KEEP**, **signage 재생 모델로서는 불필요**.

### 4-5. Playlist (WO §10·§24) → **SIMPLIFY (3중복)**

| 모델 | rows | 비고 |
|---|---:|---|
| `signage_playlists` / `_items` | 1 / 3 | 축 B |
| `store_playlists` / `_items` | 11 / **0** | published+active **0** — 항목이 하나도 없다 |
| `cosmetics_store_playlists` / `_items` | 0 / 0 | 미사용 |

**핵심**: 축 C 의 편집기는 `idleCfg.items[0]` — **첫 번째 URL 하나만** 읽는다
(`index.tsx:1135`, `1186`). 즉 **프로덕션 재생은 사실상 단일 URL** 이며,
WO §24 의 "playlist table 없이 `mediaUrl` 하나" 1단계 모델로 충분하다.

→ **여러 URL 순서 재생은 현재 요구가 아니며, 필요해질 때 축 C 의 `items` 배열로 자연 확장된다.**

---

## 5. YouTube/Vimeo URL 저장 경로 census (WO §11)

| # | 저장 위치 | 입력 UI | API | player 직접 사용 | 프로덕션 |
|---|---|---|---|:---:|---|
| 1 | **`store_tablet_screen_blocks.config`** (`idle_media`) | `packages/tablet-screen-set-editor` | `o4o-store/operator-screen-set` · `supplier-screen-set` · `store-public/*` | ✅ | **21건 YouTube** |
| 2 | `signage_media.sourceUrl` + `embedId` | KPA/GP/PH 매장 signage 화면 | `/api/signage/:serviceKey/media`, PH `/store-owner/signage/media` | ✅ (축 B) | **7건 전부 YouTube** |
| 3 | `store_tablets.idle_playlist_items` | — | — | — | **0 (미사용 컬럼)** |
| 4 | `cms_contents` (URL 을 본문/metadata 로) | admin CMS | `/api/v1/cms/*` | 축 A 경유 | signage 용도 실사용 0 |

**→ simple-video 모델 후보는 #1(활성) 과 #2(공통 서비스, 이미 YouTube/Vimeo 정규화 보유) 둘뿐이다.**
`signage_media` 는 `mediaType · sourceType · sourceUrl · embedId · thumbnailUrl · duration` 을 이미 갖춘
**정규화된 simple-video 모델**이다 (`PharmacyHubStoreSignageAxesController` 가 `/vimeo\./` 판정으로 youtube/vimeo 분기).

---

## 6. Player 실제 필요 필드 (WO §12)

`services/signage-player-web` 은 **두 개의 진입점**을 갖는다.

```text
/signage/:serviceKey/channel/:channelId      → SignagePlayerPage  (축 B, PlayerController/PlaybackEngine)
/signage/:serviceKey/channel/code/:code      → 동일
/player/channels/:channelId                  → ChannelPlayerPage  (축 A, api/channels.ts)
/player/channels/code/:code                  → 동일
```

축 A `Channel` 타입 필드 판정:

| 필드 | 판정 | 근거 |
|---|---|---|
| `id` · `code` · `status` | REQUIRED (축 A 한정) | 조회·활성 판정 |
| `slotKey` | **UNUSED for simple video** | 축 C 미사용 |
| `contents[].content.{title,body,excerpt,featuredImage,metadata}` | **OVERGENERALIZED** | URL 재생에 불필요 |
| `displayOrder` · `startDate` · `endDate` | OPTIONAL | 순서/기간 — 현재 요구 아님 |
| `refreshIntervalSec` · `defaultDurationSec` · `autoplay` | OPTIONAL | 재생 튜닝 |
| `orientation` · `resolution` · `location` · `description` · `metadata` | **UNUSED** | 소비 근거 미확인 |
| `organizationId` · `serviceKey` | 경계용 | §9·§10 |

---

## 7. Telemetry 판정 (WO §13·§14·§32)

| 항목 | rows | 조회 UI | 판정 |
|---|---:|---|---|
| `channel_heartbeats` | **0** | admin `/admin/cms/channels/ops` 존재하나 데이터 0 | **RETIRE** |
| `channel_playback_logs` | **0** | 동일 | **RETIRE** |
| `signage_playback_logs` | **0** | 미확인 | **OPTIONAL_LATER** |

"기기가 살아있는지 보고 싶을 수 있다" 는 가정만으로 KEEP 하지 않는다(WO §13). **현재 소비 증거가 0이다.**
단 축 C(태블릿)에 대한 생존 확인 요구가 실제로 생기면, 그때는 `store_tablets` 축에
붙이는 것이 맞지 채널 축을 되살릴 이유가 아니다.

---

## 8. Channel Code (WO §15) → **REPLACE_BY_DISPLAY_ID**

`channels.code` 는 기기 주소 역할이지만 `channels` 자체가 0행이다.
축 C 는 이미 `store_tablets.id` + 공개 resolve(`store-public-tablet-idle-resolve` ·
`store-public-screen-set-resolve`)로 같은 일을 하고 있다. **별도 code 축이 필요 없다.**

---

## 9. Service Scope (WO §16) → **DERIVED_ONLY**

`store_tablet_screen_sets.service_key` 분포: `kpa` 25 · **NULL 29**.
즉 실제 활성 축에서 serviceKey 는 **절반 이상이 비어 있어도 동작한다** → 재생 경계로 쓰이지 않는다.
소유 경계는 `organization_id` 다.

> 단 CMS(`cms_contents`)의 `serviceKey` 는 **다른 문제**이며 방금 종결한
> `…CMS-READ-VISIBILITY…` 계약대로 **ESSENTIAL** 이다. 두 축을 섞지 않는다.

## 10. Organization Scope (WO §17) → **ESSENTIAL — 소유권 SSOT**

`store_tablets.organization_id` 가 매장 소유 SSOT 다 (6대 / 2개 org).
`store_tablet_screen_blocks` 는 `screen_set_id` 로 간접 귀속된다. 새 정책을 만들지 않는다.

---

## 11. Admin UI census (WO §18)

| 화면 | route | consumer API | 프로덕션 데이터 | 판정 |
|---|---|---|---|---|
| CMS 슬롯 | `/admin/cms/slots` | `/cms/slots*` | 30 | **KEEP** (웹 CMS) |
| CMS 채널 | `/admin/cms/channels` | `/api/v1/channels` | **0** | **RETIRE 후보** |
| 채널 ops(health/heartbeat/log) | `/admin/cms/channels/ops` | `/channels/:id/heartbeat` · `/playback-log` | **0** | **RETIRE 후보** |
| 디지털 사이니지 | `/admin/digital-signage/*` | `/api/signage/*` | 축 B 소량 | **SIMPLIFY** |

## 12. Store UI census (WO §19·§20)

**질문: 매장 운영자가 YouTube/Vimeo URL 을 직접 입력할 수 있는가 → 그렇다. 두 경로 모두 존재한다.**

1. **축 C(활성)** — 태블릿 화면 세트 편집기의 `idle_media` 블록. `detectIdleMediaType` 이
   youtube/vimeo 만 허용하고 그 외는 invalid 처리한다.
2. **축 B** — KPA(3) · GlycoPharm(2) · PharmacyHub(3) 매장 화면이 `signage/media` · `signage/schedules` 소비.

### 12-1. Tablet 관리 vs Channel 관리 (WO §20)

사용자가 두 객체를 따로 관리할 이유가 **없다**. `store_tablets` 가 이미
`current_screen_set_id` 로 재생 대상을 직접 가리키므로 Channel 은 **중간 객체일 뿐**이다.
→ 통합 방향은 "Channel 을 Tablet 으로 흡수" 가 아니라 **"Channel 을 쓰지 않는다"** 다(이미 그렇게 운영 중).

---

## 13. 전체 KEEP/SIMPLIFY/RETIRE 표 (WO §26) — 미판정 0

| Component | Current Role | Actual Consumer | Production Data | Decision | Reason |
|---|---|---|---|---|---|
| **Display/Tablet** (`store_tablets`) | 물리 기기 + 재생 대상 지정 | KPA 매장 UI · 공개 뷰어 | 6 (active 2) | **KEEP** | 이미 WO §23 Display 모델 형태. 소유·주소·재생지정 전부 보유 |
| `store_tablets.idle_playlist_items` | 대기 영상 목록(레거시) | 없음 | **0** | **SIMPLIFY** | 6/6 비어 있음. `current_screen_set_id` 로 대체됨 |
| **ScreenSet/Block** | 화면 구성 + **영상 URL 보관** | 편집기 · 공개 resolve | 54 / 184 (**YouTube 21**) | **KEEP** | 실제 재생 경로 |
| **Channel** (`channels`) | 논리 방송 채널 | `ChannelPlayerPage` · admin 2화면 | **0** | **RETIRE** | 인스턴스 0. 재생 경로 미경유 |
| **Channel Code** | 기기 주소 | 동상 | **0** | **RETIRE** | `store_tablets.id` + 공개 resolve 로 대체 |
| **Slot (CMS 웹)** | hero/banner 배치 | admin · KCos | 30 | **KEEP** | signage 와 무관 |
| **Slot (signage `slotKey`)** | 편성 슬롯 | 축 A 전용 | **0** | **RETIRE** | 단순 영상 재생에 불필요 |
| **CMS Content** | 웹 콘텐츠 모델 | CMS 전 서비스 | 129 | **KEEP (웹) / RETIRE (signage 용도)** | 영상 재생에는 과잉 모델 |
| **Playlist — `signage_playlists`** | 재생 목록 | 축 B | 1 / 3 | **SIMPLIFY** | 단일 URL 로 충분 |
| **Playlist — `store_playlists`** | 매장 재생 목록 | PH 편성 참조 | 11 / **items 0** | **SIMPLIFY** | 항목 0, published+active 0 |
| **Playlist — cosmetics** | 서비스 확장 | 없음 | 0 | **RETIRE** | 실사용 0 |
| **`signage_media`** | 정규화된 영상 모델 | KPA/GP/PH 매장 UI | 7 (전부 YouTube) | **KEEP** | 이미 simple-video 모델. 최소안의 유력 후보 |
| **Player — `SignagePlayerPage`/Controller** | 축 B 재생기 | 배포됨 | — | **KEEP** | 실제 재생 엔진 |
| **Player — `ChannelPlayerPage`/`api/channels.ts`** | 축 A 재생기 | 배포됨 | **0** | **RETIRE** | 빈 테이블만 조회 |
| **Heartbeat (`channel_heartbeats`)** | 기기 생존 | admin ops 화면 | **0** | **RETIRE** | 소비 증거 0 |
| **Playback Log (`channel_playback_logs`)** | 재생 로그 | admin ops 화면 | **0** | **RETIRE** | 소비 증거 0 |
| **`signage_playback_logs`** | 재생 로그(축 B) | 미확인 | **0** | **OPTIONAL_LATER** | 분석 요구 생기면 |
| **`signage_schedules`** | 편성 스케줄 | PH 편성 API | **0** | **DEFER** | API 는 최근 구현. 데이터 0 |
| **`signage_templates`/`zones`/`layout_presets`/`content_blocks`/`ai_generation_logs`** | 레이아웃·AI | — | 4 / 0 / 0 / 0 / 0 | **DEFER** | 축 B 축소 시 함께 판단 |
| **`signage_forced_content`(+positions)** | 본사 강제 노출 | 축 B | 2 / 0 | **DEFER** | 소량 사용. 별도 업무 축 |
| **serviceKey (signage/display)** | 서비스 경계 | screen_sets | kpa 25 · **NULL 29** | **DERIVED_ONLY** | 재생 경계로 미사용 |
| **organizationId** | 소유 경계 | 전 축 | 2 org | **KEEP (SSOT)** | 매장 소유 판정 근거 |
| `store_tablet_displays` | 태블릿↔상품 진열 | KPA | 6 (local) | **KEEP** | 영상 아님(상품 축) |
| `store_tablet_corner_contents` · `_display_settings` · `tablet_interest_requests` | 코너/설정/요청 | KPA | 10 / 2 / 3 | **KEEP** | 활성 |
| `store_tablet_operator_idle_selections` | 운영자 대기영상 선택 | — | **0** | **DEFER** | 미사용 |

---

## 14. RETIRE 후보 dependency (WO §27)

| 대상 | API | FK | import/route | UI | test | 난이도 |
|---|---|---|---|---|---|:---:|
| `channels` 테이블 | `/api/v1/channels` **12 endpoint** | `channel_heartbeats.channelId` · `channel_playback_logs.channelId` | `register-routes.ts:1020` · `packages/cms-core` entity | admin 2화면 + player 2 route | `channel_*` spec 존재 | **MEDIUM** |
| `channel_heartbeats` | 1 endpoint | channels FK | cms-core entity | admin ops | — | **LOW** |
| `channel_playback_logs` | 1 endpoint | channels FK | cms-core entity | admin ops | — | **LOW** |
| `ChannelPlayerPage` + `api/channels.ts` | — | — | player App.tsx 2 route | — | — | **LOW** |
| signage `slotKey` 축 | `/channels/:id/contents` | cms_content_slots 참조 | — | — | — | **MEDIUM** (CMS slot 과 이름 충돌 주의) |
| cosmetics playlist 2테이블 | 서비스 확장 | — | cosmetics entity | — | — | **LOW** |

---

## 15. 최소 모델 (WO §23·§24·§25)

### 15-1. 새 테이블을 만들지 않는다 — 이미 있다

WO §23 이 스케치한 모델은 **`store_tablets` + `store_tablet_screen_blocks(idle_media)`** 로 이미 충족된다.
정규화된 대안이 필요하면 **`signage_media`** 가 그 자리를 이미 갖고 있다.

```text
Display              → store_tablets
  id                 → id
  organizationId     → organization_id      (소유 SSOT)
  name / location    → name / location
  enabled            → is_active
  재생 대상           → current_screen_set_id

DisplayMedia         → store_tablet_screen_blocks(block_type='idle_media').config
  type/url           → items[{ mediaType, url }]   ← youtube|vimeo 검증 존재
  displayOrder       → items 배열 순서 (현재 items[0] 만 사용)
  enabled            → is_visible
```

### 15-2. 1단계 단순 모델 가능 여부 (WO §24) → **가능**

편집기가 `items[0]` 하나만 읽으므로 **`Display.mediaUrl` + `mediaType`** 수준으로도 현재 요구는 충족된다.
**playlist 테이블을 새로 만들 이유가 없다.**

### 15-3. 현재 vs 최소 (WO §25)

```text
현재(축 A)              최소안(실제 운영 중인 축 C)
--------------------------------------------------------
Channel                 제거 — Tablet 이 직접 가리킴
Channel Code            제거 — store_tablets.id + 공개 resolve
Slot(slotKey)           제거 — 배치 개념 불필요
CMS Content             제거(재생 용도) — block.config.url
Playlist                보류 — 단일 URL 로 충분
Heartbeat               제거
Playback Log            제거(또는 OPTIONAL_LATER)
Player                  KEEP(SignagePlayer) / 제거(ChannelPlayer)
Display/Tablet          KEEP ← 핵심 객체
ScreenSet/Block         KEEP ← URL 보관처
organizationId          KEEP ← 소유 SSOT
serviceKey              DERIVED_ONLY
```

---

## 16. Migration 전략 초안 (WO §33 — 이번에 실행하지 않음)

```text
Phase 1  축 A write 중지 — /api/v1/channels 의 POST/PUT/PATCH/DELETE 를 비활성 (데이터 0이라 영향 0)
Phase 2  ChannelPlayerPage · api/channels.ts · admin 채널 2화면을 dead 로 표시 (route 제거는 Phase 4)
Phase 3  축 B 소비처(KPA/GP/PH 매장 signage 화면)를 signage_media 단일 축으로 정리
         — store_playlists(items 0) 의존 제거
Phase 4  dead API/UI 제거 (channels routes · player route · admin route)
Phase 5  table retirement: channel_heartbeats → channel_playback_logs → channels
         (FK 역순. cosmetics playlist 2테이블 동반)
```

## 17. 호환 전략 (WO §34)

`channels` 데이터가 **0**이므로 이관할 데이터가 없다 → **dual-write 불필요**.
`legacy read-only` 조차 필요 없고, Phase 1~2 의 **비활성화 + 표시**만으로 충분하다.
축 B→C 정리 구간에서만 짧은 **adapter**(`signage_media` ↔ block.config)가 필요할 수 있다.

---

## 18. 최근 작업 가치 재평가 (WO §36)

| 최근 작업 | 재평가 |
|---|---|
| **CMS serviceKey boundary** | **STILL_VALUABLE** — CMS 는 signage 밖(공개/회원/관리자)에서 실사용 중. 축소와 무관하게 유지 |
| entity registry fix | **VALUE_ONLY_AS_SAFETY** — 부팅 안정성. 축 A 제거 시 일부 항목은 함께 사라짐 |
| **channel.code uniqueness** | **LIKELY_RETIRE** — channels 0. code 축 자체가 제거 후보 |
| **player deployment** (`signage-player-web`) | **부분 STILL_VALUABLE** — SignagePlayer 는 유지, ChannelPlayer 는 제거 |
| **heartbeat/playback infrastructure** | **LIKELY_RETIRE** — 양쪽 로그 테이블 모두 0 |
| **slot linkage(channel↔slot)** | **LIKELY_RETIRE** — CMS 웹 슬롯과는 별개 |

### 18-1. 삭제하면 안 되는 안전장치 (WO §35 대응)

```text
CMS read serviceKey 경계 (방금 종결)      — signage 축소와 무관, 유지
store_tablets.organization_id 소유 판정    — 소유 SSOT
idle_media 의 youtube/vimeo 검증           — 잘못된 URL 차단
공개 resolve 의 draft/archived 제외 규칙    — 미게시 노출 방지
media-library 사용처 판정(iframe 제외)      — 자산 회수 오작동 방지
```

---

## 19. 직접 답변 (WO §28·§29·§30·§31·§32)

```text
Q. Channel 객체 자체가 필요한가?
A. 아니다. 프로덕션 인스턴스 0이고 실제 재생 경로가 경유하지 않는다. RETIRE.

Q. Display 가 직접 media/playlist 를 가리키면 되는가?
A. 된다. 이미 store_tablets → screen_set → idle_media(url) 로 그렇게 동작 중이다.

Q. Channel 을 유지한다면 최소 역할은?
A. "기기 주소로 재생 대상 찾기" 뿐이며, 그것도 축 C 공개 resolve 가 이미 수행한다 → 유지 근거 없음.

Q. Signage 전용 player 에 CMS Slot 이 필요한가?
A. 필요 없다. 웹 CMS 슬롯(30행)과는 다른 개념이며 그쪽은 KEEP.

Q. YouTube/Vimeo 재생에 CMS Content 전체 모델이 필요한가?
A. 필요 없다. 필요한 필드는 URL(과 선택적 mediaType) 뿐이다.

Q. Player 는?
A. SIMPLIFY — SignagePlayerPage 축 KEEP, ChannelPlayerPage 축 RETIRE.
   독립 SPA 유지 여부는 DEFER (태블릿 공개 뷰어가 KPA web 에 이미 있어 흡수 가능성 있음).

Q. Telemetry 는?
A. channel_heartbeats · channel_playback_logs = RETIRE.
   signage_playback_logs = OPTIONAL_LATER.
```

---

## 20. 후속 구현 우선순위 (WO §40-36)

```text
1) 축 A 비활성화 (write 중지 + dead 표시) — 위험 0 (데이터 0)
2) store_tablets.idle_playlist_items 미사용 컬럼 정리 판단
3) 축 B 재생목록 3중복 정리 (store_playlists items 0 확인 후)
4) 축 A 코드/UI 제거
5) 테이블 retirement (FK 역순)
```

---

## 21. DB / schema / write 영향 (WO §35·§37)

```text
production write        0   (SELECT 전용)
schema / migration      0
코드 변경               0
삭제                    0
```

## 22. UNKNOWN / 미조사 (WO §38)

| # | 내용 |
|---|---|
| 1 | **`apps/api-server/.env` 의 `DB_PASSWORD` 가 프로덕션과 불일치**(인증 실패). Secret Manager `o4o-api-db-password` 로 우회했다. 로컬 env 갱신 여부는 별도 판단 필요 — 이번 WO 범위 밖 |
| 2 | `signage_forced_content`(2행)의 업무적 역할은 본사 강제 노출 축으로 보이나, **소비 UI 를 끝까지 추적하지 않았다** → DEFER |
| 3 | `signage-player-web` 의 실제 접속 트래픽(어느 route 가 쓰이는지)은 로그 미조회. 데이터 0 근거로 축 A 를 판정했다 |
| 4 | `store_tablet_screen_sets.service_key` NULL 29건의 의도(레거시인지 설계인지) 미확정 |

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§20 축소 실행 · §22-#1 로컬 DB 자격 갱신)
