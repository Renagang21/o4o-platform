# CHECK-O4O-SIGNAGE-FORCED-CONTENT-SURFACE-READ-CONTRACT-CLOSURE-V2

> `signage_forced_content.target_surface` 의 write/read 계약을 현재 main 기준으로 재조사하고,
> 실제 살아 있는 signage playback reader 에만 `signage|both` 계약을 최소 수정으로 적용한다.

- **기준 SHA**: `eed815e168870b31bdb3c5ce45c21f268a5ca6a6` (== `origin/main`, 작업 시작 시 working tree clean)
- **branch**: `work/signage-forced-content-surface-read-contract-v2`
- **작업일**: 2026-09-03

### 최종 반영 상태

| 항목 | 값 |
|---|---|
| 작업 commit | `433a01c1c` |
| **merge commit** | **`21a514fa2dc65f6bc34b94135cb17f82b88f7e4c`** (PR #188, merged 2026-09-03T04:22:47Z) |
| merge 후 `origin/main` | `21a514fa2` — `433a01c1c` 가 ancestor 임을 확인 |
| merge 방식 | merge commit (GitHub) |
| working tree | clean · `HEAD == origin/main` 확인 |

**최종 CI 상태 (PR #188 — 전부 pass)**

```text
Code Quality Check                 pass  11m52s
Analyze (typescript)               pass   2m51s
Build Applications (admin-dashboard) pass  3m08s
SonarCloud Code Analysis           pass   5m13s
CodeQL                             pass
Apply Size Labels                  pass
mergeable=MERGEABLE  mergeState=CLEAN
```

> 로컬 lint-ratchet 는 다른 세션 WIP 로 오염돼 판정 불가였으나(§14),
> CI 의 **Code Quality Check 가 clean branch 기준으로 pass** 하여
> `168 > 64` 초과가 본 변경과 무관함이 독립적으로 확인됐다.

---

## 1. 과거 전제 재검증 (재사용하지 않음)

WO 가 지시한 두 전제를 현재 main 에서 다시 확인했다.

| 전제 | 재확인 결과 |
|---|---|
| `store-playlist.repository.ts` 가 지금도 실제 signage runtime reader 인가 | **YES — 살아 있다.** DEAD 아님 (§4) |
| `target_surface` 필터 부재가 지금도 실제로 존재하는가 | **YES — 존재한다.** `findPublicPlaylistItems()` forced UNION 에 필터 없음 |

전제가 유지되므로 과거 판정 구조 그대로 재판정했다.

---

## 2. 수정 전 재현 (현재 main 에서 실제 FAIL 확인)

과거 결과를 옮기지 않고, 신규 spec 을 **수정 전에** 실행해 FAIL 을 확인했다.

```text
npx jest src/__tests__/signage-forced-content-surface-read-contract.spec.ts
→ Tests: 8 failed, 8 passed, 16 total
```

핵심 재현 항목:

```text
× forced content UNION 이 target_surface 를 필터한다
× 허용 집합은 정확히 signage · both 이며 tablet_idle 을 포함하지 않는다
× signage → signage=true, tablet=false
× both   → signage=true, tablet=true
× campaign writer = both → 양쪽 playback reader 에 포함
```

즉 수정 전 signage playback reader 의 허용 집합은 **∅ (필터 없음 = 전체 통과)** 였고,
`target_surface='tablet_idle'` row 가 사이니지 재생 목록에 포함됐다.

> 참고: 8 failed 중 1 건은 spec 자체의 assertion 오타(resolver 의 ScreenSet 식별자명)였고
> 소스 결함이 아니었다. 해당 assertion 을 실제 식별자(`screenSetIdleConfig`)로 교정했다.
> 나머지 7 건이 본 결함의 재현이다.

---

## 3. Forced content **write** census (미조사 0)

`signage_forced_content` 에 쓰는 모든 경로.

| # | 경로 | 종류 | target_surface | 비고 |
|---|---|---|---|---|
| W1 | `routes/kpa/services/content-approval.service.ts` → `createCampaignForcedContent()` | INSERT (campaign 승인) | **`'both'`** (`CAMPAIGN_TARGET_SURFACE`) | `tablet_duration_seconds=30`, `is_active=true`, `media_id`/`campaign_request_id` 기록. service_key = targetServices 각각 |
| W2 | `routes/signage/controllers/forced-content.controller.ts` (create) | INSERT (운영자 수동) | **default `'signage'`** — body 미지정 시 | `VALID_TARGET_SURFACES` 검증 후 저장 |
| W3 | `routes/signage/controllers/forced-content.controller.ts` (update) | UPDATE | 지정 시에만 `target_surface = $n` | 동일 집합 검증 |
| W4 | `routes/signage/controllers/forced-content.controller.ts` (delete) | soft delete (`deleted_at`) | 미변경 | surface 무관 |
| W5 | `routes/o4o-store/repositories/store-playlist.repository.ts` → `reorderItems()` | INSERT/UPDATE **`signage_forced_content_positions`** | 해당 없음 | 본체 테이블 아님(정렬 보조 테이블) |

**본 WO 에서 write 는 한 건도 변경하지 않았다.** (campaign `'both'` 유지, manual default `'signage'` 유지)

---

## 4. Forced content **reader** census (미조사 0)

| # | 경로 | 분류 | 수정 전 surface 조건 | 수정 후 |
|---|---|---|---|---|
| R1 | `o4o-store/repositories/store-playlist.repository.ts` → **`findPublicPlaylistItems()`** | **PLAYBACK_READER (signage)** | **없음 ← 결함** | **`IN ('signage','both')`** |
| R2 | `o4o-store/repositories/store-playlist.repository.ts` → `findPlaylistItems()` | MANAGEMENT_READER (편집) | 없음 | **유지** (편집 화면은 전체 surface 노출) |
| R3 | `platform/store-public/store-public-tablet-idle-resolve.ts` (selection JOIN) | **PLAYBACK_READER (tablet)** | `IN ('tablet_idle','both')` | 불변 |
| R4 | `platform/store-public/store-public-tablet-idle-resolve.ts` (fallback 후보) | **PLAYBACK_READER (tablet)** | `IN ('tablet_idle','both')` | 불변 |
| R5 | `platform/store-tablet.routes.ts` — `GET /tablet-operator-common-idle-candidates` | STATUS/CANDIDATE_READER | `IN ('tablet_idle','both')` | 불변 |
| R6 | `platform/store-tablet.routes.ts` — `POST /tablets/:id/operator-common-idle-selection` (후보 검증) | STATUS/CANDIDATE_READER | `IN ('tablet_idle','both')` | 불변 |
| R7 | `platform/store-tablet.routes.ts` — `GET .../operator-common-idle-selection` (상태) | STATUS/CANDIDATE_READER | `NOT IN ('tablet_idle','both') → 'unavailable'` | 불변 |
| R8 | `signage/controllers/forced-content.controller.ts` (list/create/update 응답) | MANAGEMENT_READER (HQ) | 전체 (surface 를 컬럼으로 반환) | 불변 |
| R9 | `signage/repositories/media.repository.ts` | 비-reader | 주석 참조만 (`video_url` 독립) | 불변 |
| R10 | `signage/services/media-usage.service.ts` | 비-reader | 주석 참조만 (사용처 차단 사유 아님) | 불변 |

**playback reader 는 정확히 3개**(R1 signage / R3·R4 tablet)이며, 이번 수정 대상은 R1 하나다.

---

## 5. 실제 signage runtime consumer (UNKNOWN 0)

R1 이 dead code 가 아님을 end-to-end 로 확인했다.

```text
services/web-kpa-society/src/App.tsx:1121
  <Route path="/public/signage" element={<PublicSignagePage />} />
    ↓
services/web-kpa-society/src/pages/signage/PublicSignagePage.tsx:62
  GET /store-playlists/public/:id      (무인증 렌더링 endpoint)
    ↓
routes/o4o-store/controllers/store-playlist.controller.ts:71
  repo.findPublicPlaylistItems(id, serviceKey)
    ↓
routes/o4o-store/repositories/store-playlist.repository.ts
  forced content UNION  ← 본 결함 지점
```

**서비스별 mount 상태** (`createStorePlaylistController(dataSource, auth, serviceKey, storeOwnerServiceKey)`):

| 서비스 | mount | 전달 `serviceKey` | forced merge 활성 |
|---|---|---|---|
| KPA | `kpa.routes.ts:452` | **`'kpa-society'`** | **YES — 살아 있는 경로** |
| GlycoPharm | `glycopharm.routes.ts:440` | `undefined` | NO (serviceKey 없으면 forced UNION 자체를 타지 않음) |
| K-Cosmetics | `cosmetics.routes.ts:178` | `undefined` | NO |
| Neture | `neture.routes.ts:56` | `undefined` | NO |

→ 4개 서비스 모두 route 는 마운트돼 있으나, **forced content 병합이 실제로 발생하는 서비스는 KPA 하나**다.
UNKNOWN 0.

---

## 6. target_surface SSOT (UNKNOWN 0)

| 위치 | 값 |
|---|---|
| `forced-content.controller.ts:52` `VALID_TARGET_SURFACES` | `['signage','tablet_idle','both']` |
| controller validation (create/update) | 위 집합 외 → `400 INVALID_INPUT` |
| DB default | `'signage'` (migration `20261203000000`, `VARCHAR(20) NOT NULL DEFAULT 'signage'`) |
| migration | `20261203000000-AddTabletIdleToForcedContentAndSelections.ts` (additive, `NOT NULL`) |
| index | `idx_sfc_target_surface (service_key, target_surface, is_active) WHERE deleted_at IS NULL` |
| repository query | R1 `IN ('signage','both')` / R3·R4 `IN ('tablet_idle','both')` |
| tests | 본 CHECK 의 신규 spec + `signage-campaign-forced-content-tablet-surface.spec.ts` |
| UI literal | 태블릿 후보/선택 화면은 API 응답 소비 (자체 literal 분기 없음) |

컬럼은 `NOT NULL DEFAULT 'signage'` 이므로 **스키마상 NULL 은 발생하지 않는다.**
invalid 값은 controller 검증으로 차단되며, 만약 존재하더라도 `IN (...)` 조건에 의해
**양쪽 playback reader 에서 모두 제외**된다(안전 방향).

---

## 7. 실제 수정

**수정 파일 1개 + 신규 테스트 1개.**

```diff
apps/api-server/src/routes/o4o-store/repositories/store-playlist.repository.ts
  findPublicPlaylistItems()  — forced content UNION
           AND fc.deleted_at IS NULL
+          AND fc.target_surface IN ('signage','both')
           AND NOW() >= fc.start_at
```

- 판정 근거를 메서드 docblock 에 기록(왜 playback reader 인지 · 편집 reader 와의 차이).
- `findPlaylistItems()`(편집)는 의도적으로 필터하지 않으며, 그 사실을 테스트로 고정했다.
- schema/migration 추가 0. writer 변경 0. DB default 변경 0.

---

## 8. Truth table (자동 테스트로 고정)

| target_surface | signage playback | tablet playback |
|---|:---:|:---:|
| `signage` | **포함** | 제외 |
| `tablet_idle` | **제외** | 포함 |
| `both` | **포함** | 포함 |
| invalid / NULL | 제외 | 제외 |

추가 고정:

```text
campaign writer 'both'      → 양쪽 포함
manual  default 'signage'   → signage 포함 / tablet 제외
두 playback reader 의 합집합 = 전체 surface, 교집합 = {both}
management reader           → 필터 없음(전체 surface) 유지
```

---

## 9. Production row census

```text
BLOCKED_ENV
```

- `apps/api-server/.env` 의 DB 설정은 `localhost:5432` (로컬 개발용)이며 해당 포트에 리스너 없음.
- Cloud SQL Auth Proxy 미기동 (5442/5432 리스닝 없음).
- 프로덕션은 방화벽 차단이며, `gcloud sql connect` 는 인스턴스 authorized network 를 변경하는
  인프라 조작이라 본 WO 범위(중지 조건: 인프라 변경)에서 수행하지 않았다.
- **추정하지 않는다.** total / signage / tablet_idle / both / NULL / invalid 집계는 미산출.
- **production UPDATE/DELETE 0건. production write 0건.**

후속으로 census 가 필요하면 Auth Proxy 기동 후 아래 SELECT 만 실행하면 된다.

```sql
SELECT target_surface, COUNT(*)
FROM signage_forced_content
WHERE deleted_at IS NULL
GROUP BY target_surface;
```

---

## 10. NULL / invalid 판정

- 컬럼이 `NOT NULL DEFAULT 'signage'` 이므로 NULL row 는 스키마상 불가.
- invalid 는 controller 검증으로 차단.
- 양쪽 reader 모두 whitelist(`IN`) 방식이므로 예기치 못한 값은 **자동 제외**된다.
  임의로 노출하거나 숨기는 분기를 추가하지 않았다.
- production row 를 확인하지 못했으므로(§9) 기존 row 에 대한 backfill/변경은 하지 않았다.

---

## 11. 테스트

신규: `apps/api-server/src/__tests__/signage-forced-content-surface-read-contract.spec.ts` (16 tests)

```text
signage playback reader   3
tablet playback reader    2
truth table               5
writer 정합               3
management reader         1
회귀 경계(Channel/Tablet) 2
```

reader 를 mock 하지 않고 **원본 소스의 SQL 에서 허용 집합을 추출**해 평가하므로 순환 검증이 아니다.

```text
수정 전: Tests: 8 failed, 8 passed, 16 total
수정 후: Tests: 16 passed
```

---

## 12. 전체 회귀

| 검증 | 결과 |
|---|---|
| lint-ratchet | **분리 보고** — §14 참조 (다른 세션 WIP 로 오염, 본 변경과 무관) |
| `tsc --noEmit` (api-server) | **PASS** (exit 0) |
| 신규 forced-content spec | **PASS** (16) |
| signage/tablet/channel/campaign/forced/playlist 관련 전체 | **PASS — 14 suites / 292 tests** |
| api-server 전체 Jest | **PASS — 221 suites / 3708 tests** (249s, 실패 0) |

관련 spec 을 삭제하거나 skip 해서 통과시키지 않았다.

---

## 13. 회귀 확인 항목

```text
campaign forced content 'both' 유지        ✅ (writer 미변경 · 테스트 고정)
manual forced content default 'signage'    ✅ (writer 미변경 · 테스트 고정)
tablet reader 는 signage 제외              ✅ (R3·R4 불변 · 테스트 고정)
signage reader 는 tablet_idle 제외         ✅ (R1 수정 · 테스트 고정)
Channel runtime 부활                        0 (retirement guard PASS)
retired signage stack 복구                  0
Tablet ScreenSet canonical 유지            ✅ (resolver 구조 미변경)
schema / migration 추가                     0
production write                            0
```

---

## 14. 잔존 부채 / 분리 보고

1. **lint-ratchet 는 본 WO 에서 판정 불가 — 다른 세션 WIP 오염.**
   작업 시작 시 working tree 는 clean 이었으나, 작업 도중 동일 저장소에서 **다른 세션의 변경이 유입**됐다
   (`.github/workflows/ci-pipeline.yml`, `services/web-kpa-society/src/pages/pharmacy/StoreOrderWorktablePage.tsx`,
   `services/web-pharmacy-hub/**`, 미추적 `vitest.config.mjs` · `worktableCart.ts`, staged 삭제 `RoleEntryPage.tsx`).
   - ratchet 결과: `168 > 64` 초과 및 이후 `status=2` 실패(미추적 `vitest.config.mjs` 읽기 실패).
   - **보고된 오류 파일 목록에 본 WO 수정 파일은 0건**이다
     (`otc-v4-*.ga.ts`, `digital-signage-agent/**`, `block-core/PluginLoader.ts`, `web-neture/**` 등 무관 파일).
   - 다른 세션의 파일은 규칙에 따라 **수정·삭제·stash 하지 않았다.**
2. **GlycoPharm / K-Cosmetics / Neture 는 `serviceKey` 를 넘기지 않아 forced merge 가 영구 비활성**이다.
   의도된 정책인지(서비스별 forced content 미사용) 누락인지는 본 WO 범위 밖 — 별도 판단 필요.
3. 기존 production row 의 surface 분포 미확인 (§9 `BLOCKED_ENV`).
4. `findPlaylistItems()`(편집 reader)는 전체 surface 를 노출한다. 편집 화면에서 태블릿 전용 항목을
   시각적으로 구분할지는 UI 정책 사안으로 남는다.

---

## 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

---

## 최종 판정

```text
SIGNAGE FORCED CONTENT SURFACE READ CONTRACT: PASS
```
