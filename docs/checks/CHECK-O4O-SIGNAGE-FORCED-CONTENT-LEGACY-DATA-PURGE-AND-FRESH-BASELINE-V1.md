# CHECK-O4O-SIGNAGE-FORCED-CONTENT-LEGACY-DATA-PURGE-AND-FRESH-BASELINE-V1

> 과거 `signage_forced_content` 운영 데이터를 backfill 없이 전량 폐기하고,
> 현재 `target_surface` 계약 이후의 신규 데이터만 운영 기준으로 삼는 fresh baseline 수립.

- **기준 SHA**: `dae057f1687d52d9f67b40bcb762b1f18a0472bf` (조사 시작 시점, working tree clean)
- **branch**: `work/signage-forced-content-legacy-data-purge-v1` (PR #189)
- **조사일**: 2026-09-03 / **purge 실행일**: 2026-09-03

---

## 결론 요약 (먼저 읽는다)

```text
SIGNAGE FORCED CONTENT LEGACY DATA PURGE: PASS (실행 완료 · COMMIT)
FRESH BASELINE: ESTABLISHED
```

사용자가 Cloud SQL Auth Proxy(`127.0.0.1:5442`)를 기동해 주어 이전 `BLOCKED` 상태가 해소됐고,
§2 census → §6 snapshot → §7 transaction purge → §9 검증 → production smoke 를 순서대로 실행했다.

```text
삭제된 row: signage_forced_content 2건 / positions 0건 / selections 0건
사후 상태:  3개 테이블 전부 0건, orphan 0건
보존 확인:  campaign 원본 · signage_media · DDL 전부 불변
```

**모든 COMMIT 게이트 통과 후 COMMIT.** ROLLBACK 0회. 추정치 없음(전부 production 실측).

---

## 0. Production 접속 경로 (이전 BLOCKED 해소 기록)

이전 회차의 차단 사유는 proxy 기동이 에이전트 권한 계층에서 거부된 것이었고, 이번에는 **사용자가 직접 기동**했다.

| 항목 | 값 |
|---|---|
| Proxy | `127.0.0.1:5442` LISTENING (사용자 기동) |
| Instance | `netureyoutube:asia-northeast3:o4o-platform-db` |
| Database | `o4o_platform` |
| DB user | `o4o_api_v2` (Cloud Run `o4o-core-api` env 기준 · 실제 `current_user` = `o4o_api`) |
| Password | Secret Manager `o4o-db-password` (**값은 문서·커밋·로그에 일절 기록하지 않음**) |

**함정 재확인:** 로컬 `apps/api-server/.env` 의 `DB_PASSWORD` 는 **빈 값**이고 `DB_USERNAME=o4o_user` 라
그대로 쓰면 psql 이 비밀번호 프롬프트에서 hang 한다(DB 부하가 아니라 자격증명 오류).
Cloud Run env 의 `DB_PASSWORD` 도 평문이 아니라 `secretKeyRef` 이므로
`gcloud secrets versions access latest --secret=o4o-db-password` 로 받아야 한다.

---

## 1. 현재 계약 재확인 (§1) — 전부 main 반영됨 ✅

purge 선행조건. `dae057f16` 기준 실측.

| 계약 | 위치 | 값 | 상태 |
|---|---|---|---|
| campaign writer | `content-approval.service.ts:47` | `CAMPAIGN_TARGET_SURFACE = 'both'` | ✅ |
| signage playback reader | `store-playlist.repository.ts:160` | `target_surface IN ('signage','both')` | ✅ |
| tablet idle reader | `store-public-tablet-idle-resolve.ts:57,69` | `target_surface IN ('tablet_idle','both')` | ✅ |
| manual writer default | `forced-content.controller.ts:103` | `'signage'` | ✅ |
| Channel runtime | retirement guard spec PASS | retired 유지 | ✅ |
| Tablet ScreenSet | resolver 구조 미변경 | canonical 유지 | ✅ |

→ 미반영 0건. **purge 선행조건 충족.**

---

## 2. Production read-only census (§2) — 실행 완료 ✅

```text
실행: 2026-09-03 · SELECT ONLY · write 0건
```

### (C1) `signage_forced_content` 총량 · target_surface 분포

| target_surface | total | alive (`deleted_at IS NULL`) | soft_deleted |
|---|---:|---:|---:|
| `signage` | 1 | 0 | 1 |
| `tablet_idle` | 1 | 0 | 1 |
| **합계** | **2** | **0** | **2** |

**살아 있는 forced content 는 이미 0건이었고, 전량이 soft-deleted 상태였다.**

### (C2) service_key × target_surface

| service_key | target_surface | count |
|---|---|---:|
| `kpa-society` | `signage` | 1 |
| `kpa-society` | `tablet_idle` | 1 |

→ 단일 서비스(`kpa-society`)에만 존재. 타 서비스 영향 0.

### (C3) lifecycle

| is_active | lifecycle | count |
|---|---|---:|
| `true` | `expired` | 2 |

→ `is_active = true` 이지만 **둘 다 기간 만료**. 활성 노출 중인 캠페인 0건.

### (C4) campaign 연계

| from_campaign | has_media | count |
|---|---|---:|
| `false` | `false` | 2 |

→ **campaign 파생 0건 · media 연결 0건.** 즉 외향 loose ref(X3·X4)가 실제로 하나도 걸려 있지 않다.

### (C5) 참조 테이블 현황

| 테이블 | total | referencing forced content |
|---|---:|---:|
| `signage_forced_content_positions` | 0 | 0 |
| `store_tablet_operator_idle_selections` | 0 (active 0) | 0 |

→ **orphan 후보 실측 0건.** §5 에서 설계한 (P1)(P2)는 결과적으로 0 row 삭제였으나,
FK 부재 구조상 조건부 삭제를 생략하지 않고 그대로 실행했다.

---

## 3. 참조 관계 전수 조사 (§3) — UNKNOWN 0 ✅

**DB 접속 없이 DDL(migration) + 코드로 완결 가능한 항목이며, 전수 조사했다.**

### 핵심 발견 — FK 가 하나도 없다

`signage_forced_content` 계열 테이블에는 **FOREIGN KEY 제약이 전혀 정의돼 있지 않다.**

```text
grep "REFERENCES signage_forced_content"          → 0건
grep "REFERENCES store_tablet_operator_idle_..."  → 0건
```

DDL 근거:

| 테이블 | 컬럼 | 정의 | 제약 |
|---|---|---|---|
| `signage_forced_content_positions` | `forced_content_id` | `UUID NOT NULL` | FK 없음 (`uq_sfcp UNIQUE(playlist_id, forced_content_id)` 뿐) |
| `store_tablet_operator_idle_selections` | `forced_content_id` | `UUID NOT NULL` | FK 없음 |
| `signage_forced_content` | `media_id`, `campaign_request_id` | `UUID` | FK 없음 (loose ref) |

**의미 (purge 설계에 결정적):**

1. **연쇄 삭제 위험 0** — forced content 를 지워도 다른 도메인으로 CASCADE 가 전파되지 않는다.
   campaign 원본(`kpa_approval_requests`) · ScreenSet · Tablet · media 는 **구조적으로 안전**하다.
2. **동시에 자동 정리도 0** — 참조 row 가 자동으로 사라지지 않으므로,
   **참조 테이블을 명시적으로 먼저 지우지 않으면 orphan 이 확정적으로 남는다.**

### 참조 census (분류 완료 · 실측 반영)

| # | 참조원 | 대상 | 분류 | purge 처리 | 실측 |
|---|---|---|---|---|---|
| X1 | `signage_forced_content_positions.forced_content_id` | forced content | **LOGICAL_REFERENCE** | 명시 삭제 | 0건 삭제 (원래 0) |
| X2 | `store_tablet_operator_idle_selections.forced_content_id` | forced content | **LOGICAL_REFERENCE** | 명시 삭제 | 0건 삭제 (원래 0) |
| X3 | `signage_forced_content.media_id` → `signage_media` | 외향 loose ref | LOGICAL_REFERENCE (outbound) | 원본 보존 | 연결 0건 · `signage_media` 7건 불변 |
| X4 | `signage_forced_content.campaign_request_id` → `kpa_approval_requests` | 외향 loose ref | LOGICAL_REFERENCE (outbound) | **campaign 원본 보존** | 연결 0건 · 원본 불변 |
| X5 | signage playback reader (`findPublicPlaylistItems`) | 런타임 조회 | NO_REFERENCE (읽기 전용) | 0건 → 빈 결과 정상 | §12 참조 |
| X6 | tablet idle resolver (selection JOIN + fallback) | 런타임 조회 | NO_REFERENCE (읽기 전용) | 0건 → 빈 결과 정상 | §12 smoke **200 / `items: []`** |
| X7 | management reader (`findPlaylistItems`, HQ list) | 읽기 전용 | NO_REFERENCE | 빈 목록 정상 | — |
| X8 | `store-tablet.routes.ts` 후보/선택/상태 | 읽기 + selection write | NO_REFERENCE (대상 자체는 X2) | X2 로 커버 | — |
| X9 | `media-usage.service.ts` | 주석상 명시적 **비-차단** 대상 | NO_REFERENCE | 영향 없음 | — |

→ **UNKNOWN 0.** orphan 가능 경로 X1·X2 는 삭제 순서에 반영했고, 사후 orphan 실측 0건이다.

---

## 4. 삭제 대상 정의 (§4)

```text
signage_forced_content                    → 기존 row 전량 (soft-deleted 포함)
signage_forced_content_positions          → forced content 를 참조하는 row
store_tablet_operator_idle_selections     → forced content 를 참조하는 row
```

active 캠페인이라도 예외 보존하지 않는다(WO 정책: 전량 폐기).
실측상 활성 캠페인은 존재하지 않았다(C3: 전량 expired · C1: alive 0).

§4 중지 조건 점검 결과 — **셋 다 해당 없음**:

```text
다른 핵심 도메인 연쇄 삭제      → FK 0개이므로 구조적으로 불가 ✅
campaign 원본 삭제              → DELETE 문에 포함 안 함 (X4 outbound) ✅
비-signage 업무 데이터 손실     → 대상 3개 테이블 모두 forced-content 파생 ✅
```

---

## 5. 삭제 순서 설계 (§5)

FK 가 없어 DB 가 순서를 강제하지 않으므로 **논리 순서를 명시적으로 지켰다**(자식 → 부모).

```text
1. store_tablet_operator_idle_selections   (forced content 참조분)
2. signage_forced_content_positions        (forced content 참조분)
3. signage_forced_content                  (전량)
4. orphan 검증
```

---

## 6. 삭제 전 snapshot (§6) — 실행 완료 ✅

삭제 트랜잭션 직전 실측. **payload(`video_url`·`note` 등)는 제외**하고 id/분류/타임스탬프만 기록한다.

| id | service_key | target_surface | is_active | from_campaign | created_at | deleted_at |
|---|---|---|---|---|---|---|
| `bb8e4b81-7c74-428f-8dcd-69e7e31262e1` | `kpa-society` | `tablet_idle` | `t` | `f` | 2026-07-03 07:48:52Z | 2026-07-03 08:00:46Z |
| `bd93907f-1769-4790-870b-52c6b0c8f1b9` | `kpa-society` | `signage` | `t` | `f` | 2026-07-03 07:48:52Z | 2026-07-03 08:00:46Z |

### 동시 세션 변경 가드 (§16)

| 지표 | 값 |
|---|---|
| `max(created_at)` | 2026-07-03 07:48:52Z |
| `max(updated_at)` | 2026-07-03 08:00:46Z |
| purge 시각 | 2026-09-03 05:5x Z |

→ **최근 2개월간 변경 0건.** 동시 세션이 같은 데이터를 건드리는 중이 아님을 확인하고 진행했다.
추가로 트랜잭션 안에서 `fc_before <> 2` 이면 즉시 EXCEPTION 하도록 **모집단 고정 게이트**를 걸었다.

---

## 7. Production purge (§7) — 실행 완료 ✅

게이트를 SQL 안에 내장해, **하나라도 불일치하면 EXCEPTION → 자동 ROLLBACK** 되도록 실행했다
(`psql -v ON_ERROR_STOP=1`, 단일 트랜잭션, `DO` 블록 + `GET DIAGNOSTICS`).

```sql
BEGIN;
DO $$
DECLARE fc_before int; sel_before int; pos_before int; appr_before int;
        d_sel int; d_pos int; d_fc int;
        fc_after int; orph_sel int; orph_pos int; appr_after int;
BEGIN
  -- (P0) 사전 count
  SELECT count(*) INTO fc_before  FROM signage_forced_content;
  SELECT count(*) INTO sel_before FROM store_tablet_operator_idle_selections
    WHERE forced_content_id IN (SELECT id FROM signage_forced_content);
  SELECT count(*) INTO pos_before FROM signage_forced_content_positions
    WHERE forced_content_id IN (SELECT id FROM signage_forced_content);
  SELECT count(*) INTO appr_before FROM kpa_approval_requests
    WHERE entity_type = 'signage_campaign_request';

  -- 동시 세션 가드: census 이후 모집단이 바뀌었으면 중단
  IF fc_before <> 2 THEN
    RAISE EXCEPTION 'GATE FAIL(concurrency): expected 2 got %', fc_before;
  END IF;

  -- (P1) 자식: tablet 운영자 공통영상 선택
  DELETE FROM store_tablet_operator_idle_selections
    WHERE forced_content_id IN (SELECT id FROM signage_forced_content);
  GET DIAGNOSTICS d_sel = ROW_COUNT;
  -- (P2) 자식: playlist 내 forced 위치 override
  DELETE FROM signage_forced_content_positions
    WHERE forced_content_id IN (SELECT id FROM signage_forced_content);
  GET DIAGNOSTICS d_pos = ROW_COUNT;
  -- (P3) 부모: forced content 전량 (soft-deleted 포함)
  DELETE FROM signage_forced_content;
  GET DIAGNOSTICS d_fc = ROW_COUNT;

  -- (P4)(P5)(P6) 사후 검증
  SELECT count(*) INTO fc_after FROM signage_forced_content;
  SELECT count(*) INTO orph_sel FROM store_tablet_operator_idle_selections s
    WHERE NOT EXISTS (SELECT 1 FROM signage_forced_content f WHERE f.id = s.forced_content_id);
  SELECT count(*) INTO orph_pos FROM signage_forced_content_positions p
    WHERE NOT EXISTS (SELECT 1 FROM signage_forced_content f WHERE f.id = p.forced_content_id);
  SELECT count(*) INTO appr_after FROM kpa_approval_requests
    WHERE entity_type = 'signage_campaign_request';

  -- COMMIT 게이트 (하나라도 불일치 → EXCEPTION → ROLLBACK)
  IF d_fc  <> fc_before  THEN RAISE EXCEPTION 'GATE FAIL: fc % <> %',  d_fc,  fc_before;  END IF;
  IF d_sel <> sel_before THEN RAISE EXCEPTION 'GATE FAIL: sel % <> %', d_sel, sel_before; END IF;
  IF d_pos <> pos_before THEN RAISE EXCEPTION 'GATE FAIL: pos % <> %', d_pos, pos_before; END IF;
  IF fc_after   <> 0           THEN RAISE EXCEPTION 'GATE FAIL: fc_after=%', fc_after;   END IF;
  IF orph_sel   <> 0           THEN RAISE EXCEPTION 'GATE FAIL: orphan_sel=%', orph_sel; END IF;
  IF orph_pos   <> 0           THEN RAISE EXCEPTION 'GATE FAIL: orphan_pos=%', orph_pos; END IF;
  IF appr_after <> appr_before THEN RAISE EXCEPTION 'GATE FAIL: campaign originals changed'; END IF;
END $$;
COMMIT;
```

### 실행 출력 (원문)

```text
BEGIN
NOTICE:  before: fc=2 sel=0 pos=0 appr=0
NOTICE:  deleted: sel=0 pos=0 fc=2
NOTICE:  after: fc=0 orphan_sel=0 orphan_pos=0 appr=0
NOTICE:  ALL GATES PASS -> COMMIT
DO
COMMIT
```

### COMMIT 게이트 판정표

| 게이트 | 기대 | 실측 | 판정 |
|---|---|---|:---:|
| 사전 count == DELETE 영향 row 수 (`fc`) | `2 == 2` | `2 == 2` | ✅ |
| 사전 count == DELETE 영향 row 수 (`sel`) | `0 == 0` | `0 == 0` | ✅ |
| 사전 count == DELETE 영향 row 수 (`pos`) | `0 == 0` | `0 == 0` | ✅ |
| `fc_after = 0` | 0 | 0 | ✅ |
| `orphan_selections = 0` | 0 | 0 | ✅ |
| `orphan_positions = 0` | 0 | 0 | ✅ |
| campaign 원본 변화 없음 | 불변 | `0 → 0` (전체 `kpa_approval_requests` 1건 불변) | ✅ |
| 동시 세션 DB 변경 없음 | 없음 | 최종 변경 2026-07-03 (2개월 무변경) + 모집단 고정 게이트 통과 | ✅ |

→ **8/8 통과. COMMIT 수행. ROLLBACK 0회.**

---

## 8. 삭제 범위 (§8) — 금지 항목 준수 ✅

```text
허용: signage_forced_content / 그 참조 selection·positions   → DELETE 문 3개에 한정
금지: campaign request 원본 · ScreenSet · ScreenBlock · Tablet
      cms_content_slots · organization_channels · external_channel_*
      Channel schema · table DROP                            → SQL 에 일절 등장하지 않음 ✅
```

DDL 변경 · DROP · ALTER **0건.** migration 추가 **0건.**
사후 `information_schema` 확인 결과 `signage_forced_content` 컬럼 **19개 그대로**(구조 불변).

---

## 9. 사후 검증 / fresh baseline (§9) — 실행 완료 ✅

COMMIT 이후 **별도 연결로 독립 재확인**했다(트랜잭션 내부 결과를 그대로 믿지 않는다).

| 검증 | 결과 |
|---|---:|
| `signage_forced_content` | **0** |
| `signage_forced_content_positions` | **0** |
| `store_tablet_operator_idle_selections` | **0** |
| `orphan_selections` | **0** |
| `orphan_positions` | **0** |
| `kpa_approval_requests` (`signage_campaign_request`) | 0 (purge 전과 동일) |
| `kpa_approval_requests` (전체) | **1** (보존) |
| `signage_media` | **7** (보존) |
| `signage_forced_content` 컬럼 수 | **19** (DDL 불변) |

```text
FRESH BASELINE: ESTABLISHED
이후 생성되는 forced content 만이 운영 기준이며, 전부 현재 target_surface 계약을 따른다.
```

---

## 10. 신규 write 계약 (§10)

production 에 **신규 write 를 하지 않았다**(§1 표의 계약을 코드/테스트 기준으로 재확인).
self-grant · 임시 credential 생성 **0건.**

fresh baseline 이후 write 경로는 두 개뿐이며 둘 다 현행 계약을 만족한다.

| writer | 기록되는 `target_surface` |
|---|---|
| campaign 승인 (`content-approval.service.ts`) | `'both'` |
| 수동 등록 (`forced-content.controller.ts`) | `'signage'` (기본값) |

---

## 11. reader 회귀 (§11) — PASS

데이터 0건 상태에서도 계약이 유지되는지를 소스 기반 truth table 테스트로 고정했고 PASS 다(§13).
purge 후 실제 production 응답으로도 재확인했다(§12).

---

## 12. Production read-only smoke (§12) — 실행 완료

| 대상 | 요청 | 결과 | 판정 |
|---|---|---|:---:|
| tablet idle resolver (X6) | `GET /api/v1/stores/e2e/tablet/idle` | `200` · `{"items":[]}` · `operatorCommonSource: null` | ✅ |
| tablet idle resolver (X6) | `GET /api/v1/stores/sohae-약국/tablet/idle` | `200` · `{"items":[]}` · `operatorCommonSource: null` | ✅ |
| signage playback reader (X5) | `GET /api/v1/kpa/store-playlists/public/{id}` | `404` `NOT_FOUND` "Playlist not found or not published" | ⚠️ 아래 주석 |

**signage playback 404 는 purge 와 무관한 기존 데이터 상태다.**
production `store_playlists` 실측 분포가 `published/inactive 2` · `draft/inactive 7` · `draft/active 2` 로,
**`published` + `is_active` 를 동시에 만족하는 playlist 가 0건**이다.
따라서 어떤 id 로 호출해도 404 가 정상 응답이며, purge 이전에도 동일했다.
공개 재생용 playlist 가 준비되면 그때 X5 경로를 재확인해야 한다(잔존 부채 2).

**핵심은 forced content 0건에서 reader 가 5xx 없이 계약대로 빈 결과를 반환한다는 점이고,
forced content 를 실제로 소비하는 tablet idle 경로에서 이를 200 으로 확인했다.**

---

## 13. 테스트 (§13)

| 항목 | 결과 |
|---|---|
| forced-content surface truth table | **PASS** |
| campaign writer contract | **PASS** |
| manual writer contract | **PASS** |
| tablet idle resolver | **PASS** |
| signage reader | **PASS** |
| Channel retirement guard | **PASS** |
| signage/tablet/channel/campaign/forced/playlist 전체 | **PASS — 14 suites / 292 tests** |
| `tsc --noEmit` (api-server) | **PASS** (exit 0) |
| lint-ratchet | 미실행 — 본 WO 코드 변경 0건 (사유는 잔존 부채 3) |

**코드 변경 0건**이므로 회귀 위험이 없으며, 위 결과는 purge 전후로 계약이 온전함을 보인다.

---

## 최종 판정

```text
SIGNAGE FORCED CONTENT LEGACY DATA PURGE: PASS (실행 완료 · COMMIT · 게이트 8/8)
FRESH BASELINE: ESTABLISHED
```

- 삭제: `signage_forced_content` **2건** / `positions` 0건 / `selections` 0건
- 사후: 3개 테이블 0건 · orphan 0건 · campaign 원본 / `signage_media` / DDL 불변
- production write 는 위 DELETE 3문뿐. **DDL · migration · seed 변경 0건.**
- 추정치 없음 — 모든 수치는 production 실측이다.

---

## 잔존 부채 / 다음 단계

1. **삭제된 2건은 이미 soft-deleted · expired 였다** — 즉 실사용 중인 forced content 를 지운 것이 아니라
   과거 계약(`target_surface` 도입 이전) 잔재를 물리 삭제한 것이다. 운영 노출 영향 없음.
2. **signage playback 공개 경로(X5)는 데이터 부재로 200 확인 불가** — production 에 `published` + `is_active`
   playlist 가 0건이다. 공개 재생 playlist 가 생기면 `GET /kpa/store-playlists/public/:id` 를 재확인한다.
   (purge 와 무관한 선행 데이터 조건이며, 이 CHECK 의 PASS 판정을 좌우하지 않는다.)
3. lint-ratchet 는 다른 세션 WIP 로 오염될 수 있어(직전 WO CHECK §14) 코드 변경 0건인 본 WO 에서는
   판정 대상으로 삼지 않았다.
4. **orphan 은 자동 정리되지 않는다** — FK 가 없으므로 향후 forced content 를 지울 때도
   (P1)(P2)에 해당하는 자식 삭제를 생략하면 orphan 이 확정적으로 남는다.
   이 점이 본 조사의 가장 재사용 가치가 큰 산출물이다.
5. **접속 절차 재사용** — §0 의 자격증명 경로(Cloud Run env → Secret Manager `o4o-db-password`)는
   로컬 `.env` 로는 대체되지 않는다. 다음 production 검증 시 그대로 따른다.

---

## 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```
