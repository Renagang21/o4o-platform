# O4O Signage Canonical Playback Path V1

> **상태**: ACTIVE · **제정일**: 2026-08-26
> **제정 WO**: `WO-O4O-SIGNAGE-CHANNEL-STACK-RETIREMENT-AND-TABLET-SCREENSET-CANONICALIZATION-V1`
> **선행 감사**: [`CHECK-O4O-SIGNAGE-CHANNEL-STACK-REDUCTION-AND-SIMPLE-VIDEO-PLAYBACK-AUDIT-V1`](../checks/CHECK-O4O-SIGNAGE-CHANNEL-STACK-REDUCTION-AND-SIMPLE-VIDEO-PLAYBACK-AUDIT-V1.md)
> **guard**: `apps/api-server/src/__tests__/channels-stack-retirement.spec.ts`

---

## 1. 이 문서가 정하는 것

**매장 태블릿에서 영상(YouTube/Vimeo)을 재생하는 canonical 경로는 하나다.**

```text
StoreTablet
  └ current_screen_set_id
     └ ScreenSet (store_tablet_screen_sets)
        └ ScreenBlock (store_tablet_screen_blocks, block_type = 'idle_media')
           └ config.items[].url        ← YouTube / Vimeo URL
```

이 경로 밖의 재생 축은 신설하지 않는다.

---

## 2. 왜 이것이 canonical 인가 (프로덕션 실측 근거)

2026-08-26 프로덕션 read-only 실측:

| 축 | 프로덕션 데이터 | 판정 |
|---|---|---|
| **Tablet ScreenSet (본 문서)** | `store_tablet_screen_sets` **54** · `store_tablet_screen_blocks` **184** (`idle_media` **35**, 그중 **21블록이 YouTube URL** 보유) · `store_tablets` 6 | **canonical** |
| CMS Channel 축 | `channels` **0** · `channel_heartbeats` **0** · `channel_playback_logs` **0** | **은퇴 (§4)** |
| Signage 축 | `signage_media` **7**(전부 YouTube) · `signage_playlists` 1 / items 3 · `signage_schedules` **0** · `signage_playback_logs` **0** | **축소 대상 (§5)** |

**"코드가 있으니 그 축이 살아 있다"는 역추론을 하지 않는다** (CLAUDE.md 역추론 금지).
축 판정 근거는 **실제 데이터와 실제 소비처**다.

---

## 3. Canonical 모델

### 3-1. Display = `store_tablets`

새 Display 테이블을 만들지 않는다. 이미 필요한 것을 전부 갖고 있다.

| 컬럼 | 역할 |
|---|---|
| `id` | 기기 식별자 — **별도 channel code 를 두지 않는다** |
| `organization_id` | **소유 경계 SSOT** (§6) |
| `name` · `location` | 표시 정보 |
| `is_active` | 활성 여부 |
| `current_screen_set_id` | **재생 대상 지정** |
| `idle_playlist_items` | 레거시 컬럼 — 프로덕션 6/6 전부 비어 있다. **신규 사용 금지** |

### 3-2. 영상 저장 형태

```jsonc
// store_tablet_screen_blocks.config  (block_type = 'idle_media')
{
  "source": "custom_media",
  "items": [ { "mediaType": "youtube" | "vimeo", "url": "https://..." } ]
}
```

- 입력 UI 정본: `packages/tablet-screen-set-editor`
- **youtube / vimeo 만 허용**한다. 그 외 URL 은 invalid 로 처리한다 (편집기 검증 유지 — §7)
- 현재 재생기는 `items[0]` 하나만 읽는다. **다중 URL 순서 재생은 현행 요구가 아니다.**
  필요해지면 별도 playlist 테이블을 만들지 말고 이 `items` 배열을 확장한다.

---

## 4. 은퇴한 축 — CMS Channel

다음은 **은퇴했다**. 되살리지 않는다.

| 은퇴 대상 | 비고 |
|---|---|
| `/api/v1/channels` (11 endpoint) | route 파일 삭제 |
| `/api/v1/admin/channel-playback-logs` (3) | 〃 |
| `/api/v1/admin/channels/heartbeat` (3) | 〃 |
| `/api/v1/admin/channels/ops` (2) | 〃 |
| admin `/admin/cms/channels` · `/admin/cms/channels/ops` | route · menu · page 삭제 |
| player `/player/channels/*` (`ChannelPlayerPage`) | route · page · api client 삭제 |
| `channels.slotKey` 연계 | 위와 함께 소멸 |

### 4-1. schema 는 아직 drop 하지 않는다

`channels` · `channel_heartbeats` · `channel_playback_logs` **테이블과 migration 과 entity 등록은 그대로 둔다.**
runtime 을 먼저 죽이고 dead 상태를 확정한 뒤, schema drop 은 **마지막 단계**에서 별도 WO 로 판단한다.

> entity 를 지우면 TypeORM metadata 와 실제 schema 가 어긋난다.
> **entity 가 남아 있다는 사실을 근거로 route 를 되살리지 않는다.**

---

## 5. Signage 축 (`/api/signage/:serviceKey/*`) — 축소 대상, 이번에 제거하지 않음

| 대상 | 프로덕션 | 판정 |
|---|---|---|
| `/media` 계열 (`signage_media` 7건, 전부 YouTube) | 사용 중 | **KEEP** — 이미 정규화된 simple-video 모델(`mediaType·sourceType·sourceUrl·embedId`) |
| `/playlists` 계열 | playlist 1 / items 3 | **SIMPLIFY** |
| `/schedules` 계열 | **0** | **DEFER** |
| `/templates` · `/content-blocks` · `/layout-presets` · `/ai` | 4 / 0 / 0 / 0 | **DEFER** |
| `/hq/forced-content` | 2 | **DEFER** — 별도 업무 축, 소비처 미추적 |
| `/global/*` · `/community/*` | — | **DEFER** |
| `/active-content` | — | **KEEP (조건부)** — §5-1 |

### 5-1. 확인된 결함 2건 (이번 WO 에서 고치지 않음 · 별도 WO)

1. **player telemetry 3개가 서버에 없다.**
   `PlayerTelemetry` 는 `/api/signage/:serviceKey/channels/:channelId/{heartbeat,playback-logs,errors}` 를
   호출하지만 **api-server 에 해당 핸들러가 존재하지 않는다.** 전부 404 로 버려진다.
   → `signage_playback_logs` 0행의 직접 원인.
2. **`/active-content` 는 인증을 요구한다** (`allowSignageStoreRead` → 미인증 401).
   따라서 **로그인 없는 매장 태블릿은 축 B player 로 재생할 수 없다.**
   이것이 축 C 가 실사용 경로가 된 구조적 이유다.

---

## 6. 경계 (Boundary)

| 축 | 판정 | 근거 |
|---|---|---|
| **`organization_id`** | **ESSENTIAL — 소유 SSOT** | `store_tablets.organization_id`. `store_tablet_screen_blocks` 는 `screen_set_id` 로 간접 귀속 |
| `serviceKey` | **DERIVED_ONLY** | `store_tablet_screen_sets.service_key` 가 `kpa` 25 · **NULL 29** — 재생 경계로 쓰이지 않는다 |

> **serviceKey 정리와 Channel 은퇴를 섞지 않는다.** NULL 29건은 이 문서가 다루지 않으며,
> 지금 고칠 이유도 없다. 필요해지면 별도 WO 로 판단한다.
>
> CMS(`cms_contents`)의 serviceKey 는 **다른 문제**이며
> [`CHECK-O4O-CMS-READ-VISIBILITY-AND-SERVICE-SCOPE-CONTRACT-CLOSURE-V1`](../checks/CHECK-O4O-CMS-READ-VISIBILITY-AND-SERVICE-SCOPE-CONTRACT-CLOSURE-V1.md)
> 계약대로 **ESSENTIAL** 이다.

---

## 7. 손대지 않는 것 (이름이 비슷해 오인되기 쉬움)

| 대상 | 왜 다른 축인가 |
|---|---|
| `cms_content_slots` (30행) | **웹 CMS 화면 배치 슬롯** (hero/banner). signage 편성과 무관 |
| `organization_channels` · `organization_product_channels` | **매장 판매채널** |
| `external_channel_product_links` · `ExternalChannel` | **외부 판매채널** (네이버/쿠팡 등) |
| `/api/v1/store/channel-products` | 매장 채널 상품 |
| `StoreChannelsView` · `OperatorStoreChannelsPage` | 위 매장 판매채널의 UI |
| `store_tablet_displays` | 태블릿 **상품 진열** — 영상 축이 아니다 |

### 7-1. 삭제하면 안 되는 안전장치

```text
편집기의 youtube/vimeo URL 검증          — 잘못된 URL 차단
공개 resolve 의 draft/archived 제외 규칙  — 미게시 콘텐츠 노출 방지
media-library 사용처 판정                 — 자산 회수 오작동 방지
store_tablets.organization_id 소유 판정    — 매장 간 경계
CMS read serviceKey 경계                  — signage 축소와 무관, 유지
```

---

## 8. 신규 개발 규칙

1. 매장 태블릿 영상 재생 기능은 **§1 경로 위에서만** 만든다.
2. **새 재생용 채널/슬롯/플레이리스트 테이블을 만들지 않는다.**
3. 다중 URL 이 필요하면 `config.items` 배열을 쓴다.
4. 기기 주소가 필요하면 `store_tablets.id` 를 쓴다. **새 code 축을 만들지 않는다.**
5. 재생 경계 판단은 `organization_id` 로 한다.
6. `channels` 관련 entity/table 이 남아 있다는 사실을 근거로 축 A 를 재사용하지 않는다.

---

## 9. 후속 단계 (순서 고정)

```text
1. [완료] Channel 축 runtime 은퇴 + 본 문서 canonical 확정
2. Signage 72 endpoint 실행 단계 축소 (§5)
3. §5-1 결함 2건 처리 (player telemetry 미구현 / active-content 인증)
4. signage_forced_content(2행) 소비처 조사
5. dead table/schema 제거 여부 결정 — channels 3테이블 drop 판단 (마지막)
```
