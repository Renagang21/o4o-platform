# CHECK-O4O-SIGNAGE-CHANNEL-STACK-RETIREMENT-AND-TABLET-SCREENSET-CANONICALIZATION-V1

**대상 WO**: WO-O4O-SIGNAGE-CHANNEL-STACK-RETIREMENT-AND-TABLET-SCREENSET-CANONICALIZATION-V1
**선행 감사**: [CHECK-O4O-SIGNAGE-CHANNEL-STACK-REDUCTION-AND-SIMPLE-VIDEO-PLAYBACK-AUDIT-V1](CHECK-O4O-SIGNAGE-CHANNEL-STACK-REDUCTION-AND-SIMPLE-VIDEO-PLAYBACK-AUDIT-V1.md)
**제정 문서**: [docs/baseline/O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md](../baseline/O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md)
**기준 commit**: `316a8ea08` (origin/main, worktree clean)
**작성일**: 2026-08-26

---

## 0. 결론

```text
Channel 축 runtime 은퇴 완료 · schema 보존.
Tablet ScreenSet 축을 canonical 재생 경로로 문서·코드·테스트에 고정.
프로덕션 브라우저에서 "매장 태블릿 YouTube 재생" 을 실제로 확인했다.
production write 0 · schema/migration 0 · DROP TABLE 0.
```

---

## 1. 실행 결과 요약

| WO 항목 | 결과 |
|---|---|
| 1. Channel 축 runtime 진입점 은퇴 | **완료** — API 19 endpoint · admin 2화면 · player 2 route 제거 |
| 2. Tablet ScreenSet canonical 확정 | **완료** — baseline 문서 + 코드 주석 + guard spec |
| 3. Signage 72 endpoint 실행 단계 판정 | **완료(판정)** — §7. 코드 변경은 하지 않음(후속 단계) |
| 4. `cms_content_slots` 미접촉 | **완료** — 손대지 않음. guard 로 고정(§6-C) |
| 5. production browser 검증 | **재생 PASS / 저작(write) 미실행** — §8 |

변경 규모: **33 files · +30 / −7,129** (신규 2 파일 제외 시 순감소)

---

## 2. 은퇴한 진입점 (전수)

### 2-1. api-server — 19 endpoint

| 제거 route | endpoint | 파일 |
|---|:---:|---|
| `/api/v1/channels` | 11 | `routes/channels/channels.routes.ts` (898 L) |
| `/api/v1/admin/channel-playback-logs` | 3 | `routes/admin/channel-playback-logs.routes.ts` |
| `/api/v1/admin/channels/heartbeat` | 3 | `routes/admin/channel-heartbeat.routes.ts` |
| `/api/v1/admin/channels/ops` | 2 | `routes/admin/channel-ops.routes.ts` |

`register-routes.ts` 의 import 4개 + 등록 블록 4개(#33/#34/#35/#36)를 **은퇴 사유 주석으로 대체**했다.
`routes/channels/` 디렉터리 자체가 사라졌다.

### 2-2. admin-dashboard — 2화면

```text
route  : /admin/cms/channels · /admin/cms/channels/ops   (content.routes.tsx)
menu   : cms-channels · cms-channel-ops                  (admin-menu.static.tsx)
page   : pages/cms/channels/{ChannelList,ChannelFormModal,ChannelContentsPreview}.tsx
         pages/channels/ops/{ChannelOpsDashboard,ChannelOpsTable,ChannelDetailDrawer,ChannelStatusBadge,index}.ts(x)
client : lib/channels.ts
```

### 2-3. signage-player-web — 축 A 렌더 클러스터

```text
route  : /player/channels/:channelId · /player/channels/code/:code
page   : pages/ChannelPlayerPage.tsx
client : api/channels.ts · api/content-render-kind.ts
render : components/{ContentRenderer,EmptyState,InactiveState,ErrorState,LoadingState}.tsx
```

`SignagePlayerPage` · `PlayerController` · `PlaybackEngine` · `MediaRenderer` ·
`blocks/CornerDisplayBlock` 은 **축 B 이므로 유지**했다.

> 삭제 판단 근거: 위 5개 렌더 컴포넌트는 `ChannelPlayerPage` 와 `api/channels.ts` 외
> 참조가 **0**이었다(실측). 축 B `MediaRenderer` 가 쓰는 `CornerDisplayBlock` 은 남겼다.
> player 의 `components/ContentRenderer.tsx` 는 **로컬 파일**이며,
> 전 저장소에서 널리 쓰이는 `@o4o/content-editor` 의 동명 컴포넌트와 **다른 것**이다(무관·미접촉).

---

## 3. 보존한 것 — schema drop 하지 않았다

WO 지시대로 **runtime 만 죽이고 table 은 남겼다.**

```text
보존: channels · channel_heartbeats · channel_playback_logs  (3 table)
보존: packages/cms-core/src/entities/Channel{,Heartbeat,PlaybackLog}.entity.ts
보존: entities.ts 의 3 entity 등록 (부분 해제 금지)
보존: 1736600000000-CreateChannelsTable · 1736700000000-CreateChannelPlaybackLog
      · 1736710000000-CreateChannelHeartbeat · 20270319000000-AddChannelsCodeUniqueIndex
추가: DROP TABLE migration 0건
```

`entities.ts` 주석 2곳을 **"왜 아직 등록하는가"** 로 다시 썼다 —
`/api/v1/channels` 를 근거로 들던 기존 설명이 은퇴 후에는 거짓이 되기 때문이다.

---

## 4. 이름이 같은 다른 축 — 손대지 않았다

`channel` 이라는 이름은 **3개 무관한 도메인**에 걸쳐 있다. 오인 제거를 피하려고 명시적으로 분리했다.

| 미접촉 대상 | 정체 |
|---|---|
| `organization_channels` · `organization_product_channels` | **매장 판매채널** (프로덕션 2행) |
| `external_channel_product_links` · `ExternalChannel` | **외부 판매채널** (네이버/쿠팡) |
| `/api/v1/store/channel-products` · `store-channel.service.ts` | 매장 채널 상품 |
| `StoreChannelsView` · `OperatorStoreChannelsPage` | 위 판매채널 UI |
| `cms_content_slots` · `/admin/cms/slots` | **웹 CMS 배치 슬롯** (30행) |
| `/api/signage/:serviceKey/*` | Signage 축 (별도 판정 §7) |

이 분리는 문서 서술이 아니라 **guard spec 의 실제 검사 항목**이다(§6-C).

---

## 5. 잔여 참조 0 (실측)

```text
grep 대상: createChannelRoutes · createAdminChannelOpsRoutes · createAdminHeartbeatRoutes
          · createAdminPlaybackLogRoutes · ChannelPlayerPage · content-render-kind
          · resolveContentRenderKind · @/lib/channels · pages/cms/channels · pages/channels/ops
범위    : apps packages services scripts (node_modules·dist 제외)
결과    : 0건 (은퇴 guard 자신 제외)

실행 코드의 '/api/v1/channels' 문자열: 0건 (남은 것은 은퇴 사유 주석뿐)
```

### 5-1. raw-source spec 1건을 이 방식으로 잡았다

`node scripts/quality/check-literal-consumers.mjs` (CLAUDE.md 프로토콜 §3-A) 로
`apps/api-server/src/__tests__/signage-player-content-render-kind.spec.ts` 를 찾았다.
이 spec 은 `readFileSync` 로 `ChannelPlayerPage.tsx` · `api/channels.ts` · `ContentRenderer.tsx` 를
직접 읽으므로 **import graph 에는 나타나지 않는다.** 식별자 검색만 했으면 놓쳤을 것이다.
검사 대상이 전부 은퇴했으므로 spec 도 함께 은퇴시키고, 그 파일 목록을 은퇴 guard 에 흡수했다.

---

## 6. 테스트 계약 교체

### 6-1. 삭제한 구 spec 5개 (2,040 L) + 1개

전부 은퇴한 `/api/v1/channels` 를 supertest 로 호출하거나 route 소스를 `readFileSync` 하던 것이다.

```text
channels-code-lookup-contract.spec.ts
channels-code-unique-integrity.spec.ts
channels-service-scoped-authorization-contract.spec.ts
channels-servicekey-canonical-scope.spec.ts
channels-typeorm-entity-registration.spec.ts
signage-player-content-render-kind.spec.ts        ← §5-1
```

> **은퇴 전 baseline 을 먼저 측정했다**: 5 suites / 119 passed (green).
> 즉 "원래 깨져 있었다" 가 아니라 **의도적으로 계약을 교체**한 것이다.

### 6-2. 신규 `channels-stack-retirement.spec.ts` — 35 tests, 전부 PASS

선례(`partner-application-retirement.spec.ts`)와 같은 형식이다.

| describe | 검사 |
|---|---|
| **A. runtime 은퇴** | 은퇴 파일 20개 부재 · register-routes import/mount 부재 · admin route/menu 부재 · player route 부재 · 남은 소비처의 `/api/v1/channels` 호출 0 |
| **B. schema 보존** | entity 파일 3개 존재 · entities.ts 등록 유지 · migration 3개 존재 · **DROP TABLE migration 0** |
| **C. 타 축 미접촉** | 판매채널·외부채널·store-channel-products·Signage·`cms_content_slots` 가 그대로 |
| **D. canonical 고정** | baseline 문서 존재 · 은퇴 사유가 코드 주석에 잔존 |

### 6-3. 게이트 오탐을 먼저 의심해 규칙을 좁혔다

"DROP TABLE migration 0" 검사가 처음에 **오탐 5건**을 냈다.

```text
오탐 원인 1: CreateXTable migration 의 down() 에 있는 DROP TABLE 은 정상이다
오탐 원인 2: 'organization_channels' 가 'channels' 부분문자열로 매칭됐다 (다른 축!)
```

→ `up()` 구간만 보고, `(?<![\w_])…(?![\w_])` 경계를 넣어 좁혔다.
그리고 **규칙 자체의 회귀 테스트 2개**를 추가했다.

```text
미탐 0 : up() 에서 축 A table 을 drop 하면 반드시 잡는다        → PASS
오탐 0 : down() 의 DROP · organization_channels 는 잡지 않는다  → PASS
```

---

## 7. Signage 72 endpoint 실행 단계 판정 (WO 항목 3)

이번에 **코드는 바꾸지 않았다**(WO 우선순위상 후속 단계). 판정만 확정한다.

| 대상 | 프로덕션 | 판정 |
|---|---|---|
| `/media` 계열 (`signage_media` 7건, 전부 YouTube, `embedId` 보유) | 사용 중 | **KEEP** — 이미 정규화된 simple-video 모델 |
| `/playlists` · `/playlists/:id/items` (11 endpoint) | playlist 1 / items 3 | **SIMPLIFY** |
| `/schedules` 계열 (6) | **0** | **DEFER** |
| `/templates` · `/zones` (10) | 4 / 0 | **DEFER** |
| `/content-blocks` (5) · `/layout-presets` (5) | 0 / 0 | **DEFER** |
| `/ai/generate` · `/upload/presigned` | 0 | **DEFER** |
| `/global/*` (4) · `/hq/*` (12) · `/community/*` (4) | forced-content 2 외 0 | **DEFER** |
| `/active-content` | — | **KEEP (조건부)** — §7-1 |

### 7-1. 조사 중 확인된 축 B 결함 2건 — 고치지 않았다 (범위 밖 · 별도 WO)

1. **player telemetry 3개가 서버에 없다.**
   `PlayerTelemetry` 는 `/api/signage/:serviceKey/channels/:channelId/{heartbeat,playback-logs,errors}` 를
   호출하는데 api-server 에 **해당 핸들러가 존재하지 않는다**(grep 0건).
   → `signage_playback_logs` 0행의 직접 원인이다.
2. **`/active-content` 는 인증을 요구한다.**
   프로덕션 실측: `GET /api/signage/kpa/active-content` → **401 `AUTH_REQUIRED`**.
   즉 **로그인 없는 매장 태블릿은 축 B player 로 재생할 수 없다.**
   이것이 축 C 가 실사용 경로가 된 구조적 이유다.

또한 `apps/admin-dashboard/src/pages/digital-signage/v2/ChannelList.tsx` 는
**어떤 route 에도 등록돼 있지 않은 dead UI** 이며, 존재하지 않는
`/api/signage/:serviceKey/channels` 를 호출한다(프로덕션 401 → 실제로는 라우트 자체 없음).
이번에 손대지 않았다 — `admin-operation-boundary.test.ts` 가 그 경로를 참조하므로 별도 판단이 필요하다.

---

## 8. 프로덕션 검증 (WO 항목 5)

### 8-1. 3축 동시 실측 — 축 판정의 결정적 증거

모두 **프로덕션 무인증 호출**이다.

| 축 | 호출 | 결과 |
|---|---|---|
| **A. Channel** | `GET /api/v1/channels?serviceKey=kpa` | `200` · `{"data":[],"pagination":{"total":0}}` → **API 레벨에서 0행 확인** |
| **B. Signage** | `GET /api/signage/kpa/active-content` | **`401 AUTH_REQUIRED`** → 미인증 태블릿 재생 불가 |
| **C. Tablet ScreenSet** | `GET /api/v1/stores/{slug}/tablet/screen?tabletId=…` | **`200`** · `mode: screen_set` · **YouTube URL 전달** |

> 축 A 는 아직 배포 전이라 살아 있다(내 변경은 미배포). 그래서 `total: 0` 은
> "은퇴해서 비었다" 가 아니라 **"원래 비어 있었다"** 는 증거다.

### 8-2. 브라우저 재생 검증 — PASS

대상: 프로덕션 `테스트 약국`(slug `네뚜레-약국`), 활성 태블릿 2대, 각각 적용 세트 보유.

| 태블릿 | 화면 세트 | 기대 videoId | 결과 |
|---|---|---|---|
| 구강관리 코너 | 구강관리 기본 코너 안내형 | `aqz-KE-bpKQ` | **iframe src 에 존재 ✅** |
| 피부관리 코너 | 피부관리 기본 화면 세트 | `eRsGyueVLvQ` | **iframe src 에 존재 ✅** |

렌더된 embed:

```text
https://www.youtube.com/embed/{videoId}?autoplay=1&mute=1&loop=1&playlist={videoId}&controls=0&playsinline=1&rel=0&…
콘솔 error 0 · 실패 API 0 · HTTP 200
```

**Channel · slot · CMS Content · playlist 를 하나도 경유하지 않는다.**

#### 8-2-1. 첫 시도는 위음성이었다 — 그대로 PASS 하지 않았다

첫 실행은 `HTTP 200 · 콘솔 error 0 · 실패 API 0` 인데 **iframe 0** 이었다.
콘솔이 깨끗하다는 이유로 PASS 처리하지 않고 원인을 찾았다.

```text
원인: idle_media 는 대기(idle) 상태에서만 렌더된다.
      services/web-kpa-society/src/pages/tablet/TabletStorePage.tsx: IDLE_TIMEOUT_MS = 60_000
      첫 시도는 3.5초만 기다렸다 → 메인 코너 화면만 렌더된 상태였다.
조치: 무조작 65초 대기 후 재측정 → 두 대 모두 YouTube iframe 확인.
```

### 8-3. 저작(입력·선택·적용) write smoke — **미실행**

숨기지 않고 기록한다. **이번 변경 때문이 아니라 자격증명 문제로 막혔다.**

```text
막힌 이유: docs/local/TEST-ACCOUNTS.local.md §2 — 모든 (계정 × 서비스) L2 credential 이 unknown.
           서비스 웹 로그인이 전 서비스에서 불가하다.
           문서가 허용하는 우회(L1 토큰 주입)는 "로그인 자체의 검증에는 쓸 수 없다" 고 §4-2 가 명시한다.
확인한 것: L1 API 로그인 200 · GET /api/v1/store/tablets 200 (계약 살아 있음)
           단 data=[] — renagang21 은 org 4개(공급자/GP약국/테스트약국/뷰티샵) 소속이라
           service-scoped org 해석이 테스트 약국으로 수렴하지 않았다.
           x-service-key(kpa · kpa-society) · x-organization-id 를 줘도 동일하게 0.
           이는 TEST-ACCOUNTS §7 주의가 이미 기록한 다중 org 특성이며 신규 결함이 아니다.
막힌 게 아닌 것: 저작 경로 코드는 이번 WO 에서 한 줄도 건드리지 않았다.
                 (PUT /store/screen-sets/:id/blocks · POST /store/tablets/:id/current-screen-set)
해소 경로: TEST-ACCOUNTS §7 smoke 계정 A(o4o-smoke-mystore@neture.co.kr, 테스트 약국 manager,
           현재 suspended)를 재활성화 → 서비스별 L2 로 웹 로그인.
           재활성화는 프로덕션 write 이므로 이번 WO 에서 실행하지 않았다.
```

---

## 9. 검증 결과 전수

| 검증 | 결과 |
|---|---|
| `@o4o/api-server` type-check | **PASS** |
| `@o4o/admin-dashboard` type-check | **PASS** |
| `signage-player-web` build (`tsc -b && vite build`) | **PASS** (1,671 modules) |
| 은퇴 guard `channels-stack-retirement.spec.ts` | **35/35 PASS** |
| signage/cms/channel 관련 12 suites | **328/328 PASS** |
| `typeorm-entity-registry-guard.spec.ts` | **PASS** (§9-1) |
| `lms-kpa-frontend-api-contract-residue` · `partner-application-retirement` | **PASS** |
| admin-dashboard 전체 test | **13 files / 229 PASS** |
| 잔여 참조 grep | **0건** |
| `check-literal-consumers.mjs` (수정 파일 5개) | 소비처 전수 확인 → §5-1 1건 처리 |

### 9-1. 실행 중 사고 1건 — CRLF 오염과 그 복구

`typeorm-entity-registry-guard.spec.ts` 가 2건 실패했다. 원인 추적 결과:

```text
원인: 편집에 쓴 python 이 Windows 기본 newline 변환으로 파일 전체를 LF → CRLF 로 바꿨다.
      그 spec 은 entities.ts 를 readFileSync 해 /\n(\s*)AiEngine,\n/ 로 치환하는데
      CRLF 에서는 이 정규식이 매칭되지 않는다.
확인: HEAD 원본은 LF (git show 로 대조) · 내 entities.ts diff 는 주석 2블록뿐
조치: 내가 쓴 파일 7개를 LF 로 정규화 → 재실행 52/52 PASS
부수 확인: git core.autocrlf=true 라 커밋 blob 은 어차피 LF 로 정규화된다
          (앞 커밋 6dc4d15f7 blob 의 CR 0건으로 확인). 즉 작업트리 한정 사고였다.
```

> 검사식 자체도 한 번 틀렸다 — `grep -c $'\r'` 가 이 셸에서 확장되지 않아
> 문자 `r` 을 세고 있었다. `CR=$(printf '\r')` 로 바꿔 재확인했다(전 파일 0).

---

## 10. 영향 · 금지선 준수

```text
production DB write        0   (SELECT only)
schema / migration 변경     0
DROP TABLE                 0
cms_content_slots          미접촉
screen_sets.service_key    미접촉 (NULL 29건 그대로 — WO 지시대로 Channel 은퇴와 섞지 않음)
매장 판매채널/외부채널       미접촉
다른 세션 WIP              미접촉 (착수 시 worktree clean)
git add .                  미사용 (path-specific)
```

---

## 11. 후속 (순서 고정)

```text
1. [완료] Channel 축 runtime 은퇴 + canonical 문서 확정
2. Signage 72 endpoint 축소 실행 (§7)
3. §7-1 결함 2건 — player telemetry 미구현 / active-content 인증
4. digital-signage/v2/ChannelList dead UI 판단 (admin-operation-boundary.test 참조 있음)
5. signage_forced_content(2행) 소비처 조사
6. channels 3테이블 DROP 여부 결정 — **마지막**
```

---

## 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건

- **발견 1건 · 제안 1건**: 신규 baseline `docs/baseline/O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md` 를
  CLAUDE.md 「상세 규칙 문서 목록」에 등재하는 것이 맞다. 다만 CLAUDE.md 색인 줄 추가는
  §16-4 상 **인라인 금지 · 별도 WO** 이므로 이번에 하지 않고 제안만 남긴다.
