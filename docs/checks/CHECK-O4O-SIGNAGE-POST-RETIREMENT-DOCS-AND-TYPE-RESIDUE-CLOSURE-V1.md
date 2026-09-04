# CHECK-O4O-SIGNAGE-POST-RETIREMENT-DOCS-AND-TYPE-RESIDUE-CLOSURE-V1

> WO: `WO-O4O-SIGNAGE-POST-RETIREMENT-DOCS-AND-TYPE-RESIDUE-CLOSURE-V1`
> 성격: 이미 은퇴한 Signage 구조를 **문서 · 타입 잔여**까지 현재 main 실제 상태와 일치시킨다.
> 기능 코드 변경 · schema 변경 · production 접근 **없음**.

---

## 1. 기준

| 항목 | 값 |
|---|---|
| 기준 `origin/main` SHA | `2a063dc3d` |
| 작업 branch | `work/signage-post-retirement-docs-type-residue-v1` |
| worktree | `C:/tmp/o4o-sig-docs` (격리 · 다른 세션 WIP 미접촉) |

---

## 2. 선행 상태 확인 (WO §3)

| 확인 항목 | 결과 |
|---|---|
| `apps/digital-signage-agent` 은퇴 유지 | **부재** — `apps/` 내 signage 앱 0 |
| digital-signage-core backend runtime 은퇴 유지 | `src/backend/` 하위 = `entities/` **뿐** |
| express 잔여 제거 유지 | `packages/digital-signage-core/package.json` 에 express **0건** |
| Phase-6 legacy entity 7종 제거 유지 | entity 디렉터리 = `Signage*` 9 + `index.ts` |
| ACTIVE `SignageCoreEntities` 9종 유지 | `entities.ts:505-506` import · `:966` spread — 유일 배열 |
| Tablet ScreenSet canonical 유지 | `screen-content-core` · `tablet-kiosk-core` · `tablet-screen-set-editor` 존속 |
| forced-content 계약 유지 | migration 3 · controller · repository · spec 3 존속 |
| Channel runtime 은퇴 유지 | `register-routes.ts:1024` `[RETIRED]` · retirement guard spec 존속 |

→ **되돌아간 항목 0건.** 중지 조건 미발동.

---

## 3. 문서 census — `docs/services/_core/apps/digital-signage-core/app-definition.md` (WO §4·§5)

| 위치 | 서술 | 분류 | 실측 |
|---|---|---|---|
| `## 역할` | "미디어, 디스플레이, 스케줄, 액션 관리" | **STALE_RUNTIME_DESCRIPTION** | Display / Action entity 는 Phase-6 에서 은퇴 — 남은 9종에 없음 |
| `## API Routes` `/api/v1/signage/media` · `/displays` · `/schedules` | 현재 route 인 것처럼 서술 | **STALE_RUNTIME_DESCRIPTION** | 해당 mount **0건**. 실제 signage HTTP runtime = api-server `routes/signage/`, mount `/api/signage/:serviceKey` · `/api/signage/:serviceKey/public` (`register-routes.ts:1030-1041`). 이 패키지는 route 를 제공하지 않는다 |
| `## Dependencies` "platform-core, cms-core" | 현재 의존인 것처럼 서술 | **STALE_RUNTIME_DESCRIPTION** | `package.json` deps = `typeorm` 뿐 (peer `reflect-metadata`) |
| `## 외부 노출` Entities (9) · `SignageCoreEntities` | — | **CURRENT** | 일치 |
| `## 비고` Phase-6 / agent 은퇴 2줄 | 과거형 이력 | **HISTORY_ONLY** | 유지 |

### 수정 내용 (최소 교정)

- `## 역할` → "entity 패키지 / backend runtime 을 제공하지 않는다" 로 정정
- `## API Routes` → "이 패키지는 API route 를 제공하지 않는다" + 실제 api-server mount 명시.
  과거 3개 route 는 **삭제하지 않고** "현재 존재하지 않는다" 는 과거형 주석으로 보존
- `## Dependencies` → `typeorm` (peer `reflect-metadata`) 로 실측 정정
- `## 비고` → Channel runtime 은퇴 유지 1줄 추가 (복구 근거를 만들지 않는다는 계약 명시)

---

## 4. 타입 consumer census — `services/web-glycopharm/src/types/signage.ts` (WO §6)

barrel: `services/web-glycopharm/src/types/index.ts` 가 `export * from './signage'` 로 재수출한다.
→ **단순 직접 importer 0 만 보고 판단하지 않았다.** symbol 단위로 전수 조사했다.

| symbol | glycopharm 내 소비 | 분류 |
|---|---:|---|
| `ContentType` | **3** (`ContentLibraryPage.tsx:25,142,180`) | **ACTIVE_TYPE** |
| `ContentItem` | **3** (`ContentLibraryPage.tsx:25,74,78`) | **ACTIVE_TYPE** |
| `ContentSource` | 0 (`ContentItem` 필드로만 사용) | **ACTIVE_TYPE** (동반) |
| `MySignageItem` | 0 | DEAD_TYPE |
| `SignageChannel` | 0 | DEAD_TYPE |
| `MediaSourceType` | 0 | DEAD_TYPE |
| `MediaSource` | 0 | DEAD_TYPE |
| `PlaylistItem` | 0 | DEAD_TYPE |
| `PlaylistStatus` | 0 | DEAD_TYPE |
| `Playlist` | 0 | DEAD_TYPE |
| `DayOfWeek` | 0 | DEAD_TYPE |
| `DisplaySchedule` | 0 | DEAD_TYPE |
| `SharedPlaylist` | 0 | DEAD_TYPE |
| `PlaybackState` | 0 | DEAD_TYPE |
| `ParsedVideoUrl` | 0 | DEAD_TYPE |
| `DisplaySettings` | 0 | DEAD_TYPE |

보조 확인:

- `ContentLibraryPage` 는 dead 화면이 아니다 — `App.tsx:99` lazy import, `:904` `/store/signage/library`, `:1084` `/store/marketing/signage/library` 2 route 로 살아 있다.
- `ContentSource` 동명 타입이 `lib/api/signageV2.ts:102` 에도 있으나 **다른 타입**(`'hq' | 'community'`)이며 signage 상세 화면들은 그쪽을 import 한다. 혼동 없음.
- `@/types` alias 는 glycopharm 로컬 — 타 서비스 소비 0.
- 나머지 signage 화면 3종(`HubSignageLibraryPage` · `MediaDetailPage` · `PlaylistDetailPage`)은 canonical `@o4o/types/signage` 를 사용한다.

### 판정 (WO §7 · §19)

**파일 삭제 = 하지 않음.** `ContentItem` / `ContentType` 의 실제 consumer 가 존재하므로 WO §19 중지 조건에 해당한다.
대신 소비처 0 이면서 canonical(`@o4o/types/signage`)로 이미 대체된 **Phase-6 형태의 dead type 13종만 제거**하고,
ACTIVE 3종은 유지했다. 파일 삭제 0 / barrel(`types/index.ts`) 변경 0.

---

## 5. 저장소 잔여 census (WO §8)

| 키워드 | 코드(apps·packages·services·scripts·.github) | 분류 |
|---|---|---|
| `digital-signage-agent` | **0건** | — (docs 는 `docs/checks/**` · `docs/archive/**` = HISTORY_ONLY) |
| `/api/digital-signage` | **0건** | — (docs 만 HISTORY_ONLY) |
| `ChannelPlayer` | `channels-stack-retirement.spec.ts:53,98` | **TEST_GUARD** — 유지 |
| `/api/v1/channels` | `register-routes.ts:1024` `[RETIRED]` 주석 · `entities.ts:955` · migration 주석 · retirement spec | **TEST_GUARD / EXPECTED_MIGRATION_HISTORY** — 유지 |
| `digital-signage-core backend` | **0건** | — |
| `SignageEntities` / `AllSignageEntities` | `entities/index.ts:46` 은퇴 주석 1줄 | **HISTORY_ONLY** — 유지 |
| `MediaSource` | `entities/index.ts:2` 주석 · glycopharm `types/signage.ts` | 주석=HISTORY_ONLY / 타입=**STALE_REFERENCE** → §4 에서 제거 |
| `MediaList` | `entities/index.ts:2` 주석 · `pharmacy-hub-store-subject-provisioning.ts:35` | 주석=HISTORY_ONLY / 스크립트=**STALE_REFERENCE** → 아래 |
| `DisplaySlot` · `ActionExecution` | `entities/index.ts:3` 주석 | **HISTORY_ONLY** — 유지 |

### STALE_REFERENCE 교정 1건

`apps/api-server/src/scripts/pharmacy-hub-store-subject-provisioning.ts:34-35` 는 slim DataSource 를 쓰는 이유로
"digital-signage-core `MediaListItem` ↔ `MediaList` 순환 참조" 를 지목했다. 해당 entity 는 Phase-6 에서 삭제돼
**현존하지 않는 원인**이다. slim DataSource 자체는 여전히 타당하므로 로직은 그대로 두고,
없어진 구체 원인 지목만 일반 서술로 정정했다.

---

## 6. 이력 보존 (WO §9)

| 대상 | 처리 |
|---|---|
| migration history (`20260417100000-DropSignageDeadTables` · `20270319000000-AddChannelsCodeUniqueIndex` 등) | **삭제 0** |
| retirement CHECK (`CHECK-O4O-DIGITAL-SIGNAGE-AGENT-*` · `*-EXPRESS-*` · `*-PHASE6-*` 등) | **삭제 0** |
| 과거 WO · `docs/archive/**` · `docs/investigations/**` | **삭제 0** |
| baseline `O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md` | 이미 과거형(§4 "은퇴했다") · **변경 0** |
| `entities/index.ts` 은퇴 주석 | **유지** |

---

## 7. raw-source / test census (WO §10)

`readFileSync` · `existsSync` 를 쓰면서 signage 를 언급하는 spec 7개를 전수 확인했다.

| spec | 삭제된 파일 존재 강제 | 처리 |
|---|---|---|
| `app-management-runtime-residue-retirement.spec.ts` | 없음 (주석에서 15→14 이력만 언급) | 유지 |
| `channels-stack-retirement.spec.ts` | 없음 — `not.toContain` 계열 **retirement guard** | **유지** |
| `legacy-followup-auth-notification-catalog-final-closure.spec.ts` | 없음 | 유지 |
| `main-site-appstore-parallel-axis-retirement.spec.ts` | 없음 | 유지 |
| `signage-campaign-forced-content-tablet-surface.spec.ts` | 없음 | 유지 |
| `signage-forced-content-surface-read-contract.spec.ts` | 없음 | 유지 |
| `signage-player-web-deployment-contract.spec.ts` | 없음 | 유지 |

→ **삭제된 파일의 존재를 강제하는 stale test 0건.** 정리 대상 없음. retirement guard 전부 유지.

---

## 8. 실제 변경 파일 (3)

| 파일 | 변경 |
|---|---|
| `docs/services/_core/apps/digital-signage-core/app-definition.md` | 역할 · API Routes · Dependencies 실측 정정 + Channel 은퇴 1줄 |
| `services/web-glycopharm/src/types/signage.ts` | dead type 13종 제거 (ACTIVE 3종 유지) |
| `apps/api-server/src/scripts/pharmacy-hub-store-subject-provisioning.ts` | 주석의 없어진 원인 지목 정정 (로직 무변경) |

**파일 삭제 0 / barrel 변경 0 / schema · migration 0 / production 접근 0.**

---

## 9. 검증 (WO §15)

| # | 검증 | 결과 |
|---|---|---|
| 1 | `node scripts/lint-ratchet.mjs` (build 전) | **PASS** — 59 errors / baseline 62. `ERROR_BASELINE` 은 WO §14 에 따라 하향하지 않았다 |
| 2 | glycopharm typecheck (`tsc --noEmit -p tsconfig.json`) | **PASS** — 0 error |
| 3 | 영향 app build (`pnpm --filter "glycopharm-web..." build`) | **PASS** — deps 포함 빌드 성공 (`built in 17.97s`) |
| 4 | digital-signage-core build (`tsc`) | **PASS** |
| 5 | signage tests | **PASS** |
| 6 | Tablet canonical tests | **PASS** |
| 7 | forced-content tests | **PASS** |
| 8 | Channel retirement guard (`channels-stack-retirement.spec.ts`) | **PASS** |
| 9 | api-server 전체 Jest | **PASS** — 220 suites / **3,708 tests** 전부 통과 |

5~8 묶음 실행 결과: `--testPathPattern "signage|channels-stack|tablet|app-management-runtime"` → **15 suites / 354 tests PASS**.

> 참고: 의존 workspace package 의 `dist` 가 없는 상태에서 `glycopharm-web` 단독 build 를 먼저 돌렸을 때
> `@o4o/ui` · `@o4o/content-editor` · `@o4o/auth-client` · `@o4o/account-ui` 미해결로 TS2307 7건 + 파생 TS7006 2건이 났다.
> **signage 관련 오류 0건**이었고, 의존 패키지를 함께 빌드하자(3번) 전부 해소됐다 — 이번 변경과 무관한 환경 조건이다.

---

## 10. 사후 잔여 census (WO §16)

| 키워드 | 코드 잔여 | 판정 |
|---|---:|---|
| `digital-signage-agent` | **0** | — |
| `SignageEntities` / `AllSignageEntities` | 1 (`entities/index.ts:46` 은퇴 주석) | **HISTORY_ONLY** |
| `MediaSource` | 2 (`entities/index.ts:2` · glycopharm `types/signage.ts:4` — 둘 다 은퇴 주석) | **HISTORY_ONLY** |
| `MediaSourceType` · `MediaList` · `DisplaySlot` · `ActionExecution` | 각 1 (은퇴 주석) | **HISTORY_ONLY** |
| `/api/v1/signage` | 1 (`app-definition.md:33` — "현재 존재하지 않는다" 과거형 주석) | **HISTORY_ONLY** |
| `/api/digital-signage` | **0** | — |
| `ChannelPlayer` · `/api/v1/channels` | retirement guard · `[RETIRED]` 주석 · migration 주석 | **TEST_GUARD / EXPECTED_MIGRATION_HISTORY** |

```
UNEXPECTED_RESIDUAL = 0
```

남은 참조는 전부 의도적으로 보존한 **은퇴 이력 주석 · retirement guard · migration history** 다.
현재 기능인 것처럼 읽히는 서술은 남아 있지 않다.

---

## 11. 보호 대상 무변경 확인 (WO §12·§13)

| 대상 | 상태 |
|---|---|
| Tablet ScreenSet / StoreTablet / ScreenSet / ScreenBlock / idle_media | **무변경** |
| `signage_forced_content` · `target_surface` 계약 | **무변경** |
| store-playlist runtime | **무변경** |
| `SignageCoreEntities` ACTIVE 9종 | **무변경** |
| digital-signage-core package 구조 (export · main · types) | **무변경** |
| schema · migration · production 데이터 | **무변경 · 접근 0** |
| Channel runtime | **은퇴 유지** — 문서 정리 과정에서 복구 근거를 만들지 않았다 |

`ERROR_BASELINE = 62` 는 WO §14 에 따라 **이번 WO 에서 내리지 않는다** (다른 in-flight branch 기준 보호).

---

## 12. 문서 정합

```
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

- 발견 1건 = `app-definition.md` stale 서술 (본 WO 범위 내 · 교정 완료)
- 별도 WO 제안 = `scripts/lint-ratchet.mjs` `ERROR_BASELINE` 62 → 실측 하향 (in-flight branch 정리 후)

---

## 13. 결론

```
SIGNAGE POST-RETIREMENT DOCS/TYPE RESIDUE CLOSURE: PASS
SIGNAGE STRUCTURAL CLEANUP: CLOSED
```
