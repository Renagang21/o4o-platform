# CHECK-O4O-SIGNAGE-FORCED-CONTENT-LEGACY-DATA-PURGE-AND-FRESH-BASELINE-V1

> 과거 `signage_forced_content` 운영 데이터를 backfill 없이 전량 폐기하고,
> 현재 `target_surface` 계약 이후의 신규 데이터만 운영 기준으로 삼는 fresh baseline 수립.

- **기준 SHA**: `dae057f1687d52d9f67b40bcb762b1f18a0472bf` (== `origin/main`, 시작 시 working tree clean)
- **branch**: `work/signage-forced-content-legacy-data-purge-v1`
- **작업일**: 2026-09-03

---

## 결론 요약 (먼저 읽는다)

```text
SIGNAGE FORCED CONTENT LEGACY DATA PURGE: 미실행 (BLOCKED)
FRESH BASELINE: NOT_ESTABLISHED
```

**production DB 접속이 권한 계층에서 차단**되어 §2 census 와 §7 purge 를 실행하지 못했다.
WO §16 중지 조건("production DB 접속 경로 불명확")에 해당하므로 **DELETE/COMMIT 을 진행하지 않고 중지**했다.

**production write 0건. DELETE 0건. 추정치 0건.**

DB 를 제외한 모든 항목(계약 재확인 · 참조 관계 전수 조사 · 삭제 순서 설계 · purge SQL 작성 ·
reader/writer 계약 검증 · 테스트)은 완료했다. purge 는 접속이 열리는 즉시 §7 을 그대로 실행하면 된다.

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

## 2. Production read-only census (§2)

```text
BLOCKED — 미실행
```

### 차단 사유 (정확히 기록)

이전 WO 의 `BLOCKED_ENV` 는 "Auth Proxy 미기동" 때문이었고, 이번에 **접속 경로 자체는 확인**했다.

```text
bin/cloud-sql-proxy-v2.exe                v2 바이너리 존재 (33MB)
start-cloud-sql-proxy.cmd                 문서화된 기동 스크립트 존재
INSTANCE_CONNECTION_NAME                  netureyoutube:asia-northeast3:o4o-platform-db
LOCAL_PORT                                5442
ADC (application_default_credentials.json) 존재
gcloud 인증 계정                           활성
```

즉 **환경은 갖춰져 있고, 경로는 SETUP.md 에 문서화된 정규 경로**다.
Auth Proxy 는 IAM 기반이라 `gcloud sql connect` 와 달리 **instance authorized network 를 변경하지 않는다**
(인프라 변경 없음 → CLAUDE.md 중지 조건에 해당하지 않음).

그러나 proxy 기동 시도가 **에이전트 권한 계층(auto mode classifier)에서 차단**됐다.

```text
./bin/cloud-sql-proxy-v2.exe --port 5442 ...   → Permission denied (classifier)
cmd.exe /c start-cloud-sql-proxy.cmd            → Permission denied (classifier)
```

우회를 시도하지 않았다. 따라서 census/purge 는 **사용자 결정 대기** 상태다.

### 접속 확보 시 실행할 census SQL (SELECT ONLY)

```sql
-- (C1) 총량 · target_surface 분포 (soft-deleted 포함/제외 구분)
SELECT target_surface,
       COUNT(*)                                        AS total,
       COUNT(*) FILTER (WHERE deleted_at IS NULL)      AS alive,
       COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)  AS soft_deleted
FROM signage_forced_content
GROUP BY ROLLUP (target_surface);

-- (C2) service_key 분포
SELECT service_key, target_surface, COUNT(*)
FROM signage_forced_content
GROUP BY service_key, target_surface
ORDER BY service_key, target_surface;

-- (C3) is_active / lifecycle (active·upcoming·expired)
SELECT is_active,
       CASE WHEN NOW() < start_at THEN 'upcoming'
            WHEN NOW() > end_at   THEN 'expired'
            ELSE 'active' END                          AS lifecycle,
       COUNT(*)
FROM signage_forced_content
GROUP BY is_active, lifecycle;

-- (C4) campaign 연계 유무
SELECT (campaign_request_id IS NOT NULL) AS from_campaign,
       (media_id IS NOT NULL)            AS has_media,
       COUNT(*)
FROM signage_forced_content
GROUP BY 1, 2;

-- (C5) 참조 테이블 현황
SELECT COUNT(*) AS positions_total,
       COUNT(*) FILTER (
         WHERE forced_content_id IN (SELECT id FROM signage_forced_content)
       )                                               AS positions_referencing
FROM signage_forced_content_positions;

SELECT COUNT(*) AS selections_total,
       COUNT(*) FILTER (WHERE cleared_at IS NULL)      AS selections_active,
       COUNT(*) FILTER (
         WHERE forced_content_id IN (SELECT id FROM signage_forced_content)
       )                                               AS selections_referencing
FROM store_tablet_operator_idle_selections;

-- (C6) 삭제 전 id snapshot (payload 미포함 — 민감정보 배제)
SELECT id, service_key, target_surface, is_active, campaign_request_id IS NOT NULL AS from_campaign
FROM signage_forced_content
ORDER BY id;
```

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

### 참조 census (분류 완료)

| # | 참조원 | 대상 | 분류 | purge 처리 |
|---|---|---|---|---|
| X1 | `signage_forced_content_positions.forced_content_id` | forced content | **LOGICAL_REFERENCE** | **명시 삭제 필요** |
| X2 | `store_tablet_operator_idle_selections.forced_content_id` | forced content | **LOGICAL_REFERENCE** | **명시 삭제 필요** |
| X3 | `signage_forced_content.media_id` → `signage_media` | 외향 loose ref | LOGICAL_REFERENCE (outbound) | 원본 보존 (건드리지 않음) |
| X4 | `signage_forced_content.campaign_request_id` → `kpa_approval_requests` | 외향 loose ref | LOGICAL_REFERENCE (outbound) | **campaign 원본 보존** |
| X5 | signage playback reader (`findPublicPlaylistItems`) | 런타임 조회 | NO_REFERENCE (읽기 전용) | 0건 → 빈 결과 정상 |
| X6 | tablet idle resolver (selection JOIN + fallback) | 런타임 조회 | NO_REFERENCE (읽기 전용) | 0건 → 빈 결과 정상 |
| X7 | management reader (`findPlaylistItems`, HQ list) | 읽기 전용 | NO_REFERENCE | 빈 목록 정상 |
| X8 | `store-tablet.routes.ts` 후보/선택/상태 | 읽기 + selection write | NO_REFERENCE (대상 자체는 X2) | X2 로 커버 |
| X9 | `media-usage.service.ts` | 주석상 명시적 **비-차단** 대상 | NO_REFERENCE | 영향 없음 |

→ **UNKNOWN 0. orphan 가능 경로는 X1·X2 정확히 2개**이며 둘 다 삭제 순서에 반영했다.

---

## 4. 삭제 대상 정의 (§4)

```text
signage_forced_content                    → 기존 row 전량 (soft-deleted 포함)
signage_forced_content_positions          → forced content 를 참조하는 row (사실상 전량)
store_tablet_operator_idle_selections      → forced content 를 참조하는 row
```

active 캠페인이라도 예외 보존하지 않는다(WO 정책: 전량 폐기).

§4 중지 조건 점검 결과 — **셋 다 해당 없음**:

```text
다른 핵심 도메인 연쇄 삭제      → FK 0개이므로 구조적으로 불가 ✅
campaign 원본 삭제               → DELETE 문에 포함 안 함 (X4 outbound) ✅
비-signage 업무 데이터 손실      → 대상 3개 테이블 모두 forced-content 파생 ✅
```

---

## 5. 삭제 순서 설계 (§5)

FK 가 없어 DB 가 순서를 강제하지 않으므로 **논리 순서를 명시적으로 지킨다**(자식 → 부모).

```text
1. store_tablet_operator_idle_selections   (forced content 참조분)
2. signage_forced_content_positions        (forced content 참조분)
3. signage_forced_content                  (전량)
4. orphan 검증
```

---

## 6. 삭제 전 snapshot (§6)

`BLOCKED` — 미실행. 접속 확보 시 §2 의 (C1)~(C6) 을 **삭제와 같은 트랜잭션 직전**에 기록한다.
(C6) 은 id/분류만 담고 **video_url·note 등 payload 는 제외**한다(민감정보 배제).
필요 시 로컬 임시 산출물로만 두고 **commit 하지 않는다.**

---

## 7. Production purge (§7) — 실행 대기 SQL

**아직 실행하지 않았다.** 접속 확보 시 아래를 그대로 트랜잭션으로 실행한다.

```sql
BEGIN;

-- (P0) 사전 count — 삭제 대상 모집단 확정
SELECT COUNT(*) AS fc_before FROM signage_forced_content;
SELECT COUNT(*) AS sel_ref_before
  FROM store_tablet_operator_idle_selections
 WHERE forced_content_id IN (SELECT id FROM signage_forced_content);
SELECT COUNT(*) AS pos_ref_before
  FROM signage_forced_content_positions
 WHERE forced_content_id IN (SELECT id FROM signage_forced_content);

-- (P1) 자식: tablet 운영자 공통영상 선택
DELETE FROM store_tablet_operator_idle_selections
 WHERE forced_content_id IN (SELECT id FROM signage_forced_content);

-- (P2) 자식: playlist 내 forced 위치 override
DELETE FROM signage_forced_content_positions
 WHERE forced_content_id IN (SELECT id FROM signage_forced_content);

-- (P3) 부모: forced content 전량 (soft-deleted 포함)
DELETE FROM signage_forced_content;

-- (P4) 사후 검증 — 전부 0 이어야 한다
SELECT COUNT(*) AS fc_after  FROM signage_forced_content;                       -- 기대 0
SELECT COUNT(*) AS sel_after FROM store_tablet_operator_idle_selections;        -- 잔여는 모두 orphan 아님이어야
SELECT COUNT(*) AS pos_after FROM signage_forced_content_positions;

-- (P5) orphan 검증 — 반드시 0
SELECT COUNT(*) AS orphan_selections
  FROM store_tablet_operator_idle_selections s
 WHERE NOT EXISTS (SELECT 1 FROM signage_forced_content f WHERE f.id = s.forced_content_id);
SELECT COUNT(*) AS orphan_positions
  FROM signage_forced_content_positions p
 WHERE NOT EXISTS (SELECT 1 FROM signage_forced_content f WHERE f.id = p.forced_content_id);

-- (P6) 보존 확인 — campaign 원본은 그대로여야 한다
SELECT COUNT(*) AS approval_requests_preserved
  FROM kpa_approval_requests WHERE entity_type = 'signage_campaign_request';

COMMIT;   -- (P4)(P5) 가 기대와 다르면 ROLLBACK
```

> `signage_forced_content` 를 전량 삭제하므로 (P1)(P2) 의 부분조건은 결과적으로 전량과 같지만,
> **"forced-content 파생분만 지운다"는 의도를 SQL 에 명시**하기 위해 조건을 유지한다.
> (P5) 의 `orphan_selections` 는 forced content 가 0 이 되면 잔여 selection 전부가 orphan 이 되므로,
> 사실상 `store_tablet_operator_idle_selections` 도 0 이 되어야 정상이다.

---

## 8. 삭제 범위 (§8) — 금지 항목 준수

```text
허용: signage_forced_content / 그 참조 selection·positions   → DELETE 문 3개에 한정
금지: campaign request 원본 · ScreenSet · ScreenBlock · Tablet
      cms_content_slots · organization_channels · external_channel_*
      Channel schema · table DROP                            → SQL 에 일절 등장하지 않음 ✅
```

DDL 변경 · DROP · ALTER **0건.** migration 추가 **0건.**

---

## 9~12. 사후 검증 / 신규 write / reader 회귀 / smoke

- §9 fresh baseline 검증 · §12 production API smoke: **BLOCKED** (purge 미실행이므로 사후 검증 대상 없음).
- §10 신규 write 계약: production write 하지 않았고, **코드/테스트 기준으로 재확인 완료**(§1 표).
  self-grant · 임시 credential 생성 **0건.**
- §11 reader 회귀: 데이터 0건이어도 계약이 유지되는지를 **소스 기반 truth table 테스트로 고정**했으며
  현재 PASS 다(아래 §13). purge 여부와 무관하게 성립한다.

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
| lint-ratchet | 미실행 — 본 WO 코드 변경 0건 (사유는 아래 잔존 부채) |

**코드 변경 0건**이므로 회귀 위험이 없으며, 위 결과는 purge 전 계약이 온전함을 보인다.

---

## 최종 판정

```text
SIGNAGE FORCED CONTENT LEGACY DATA PURGE: FAIL (미실행 — BLOCKED, production 접속 권한 차단)
FRESH BASELINE: NOT_ESTABLISHED
```

purge 를 실행하지 못했으므로 PASS 를 주장하지 않는다.
**추정 수치를 기록하지 않았고, production 에 어떤 write 도 하지 않았다.**

---

## 잔존 부채 / 다음 단계

1. **production 접속 승인 필요** — Cloud SQL Auth Proxy 기동이 에이전트 권한 계층에서 차단됐다.
   사용자가 (a) proxy 실행 권한을 허용하거나, (b) 직접 `start-cloud-sql-proxy.cmd` 를 기동해 주면
   §2 census → §6 snapshot → §7 transaction → §9 검증 순으로 즉시 마무리할 수 있다.
2. **삭제 대상 모집단 미확정** — census 미실행이므로 총량·분포·campaign 연계 건수 모두 미상.
   WO §16 의 "삭제 대상 모집단을 확정하지 못함" 에도 해당하므로 이중으로 중지 사유가 성립한다.
3. **동시 세션 확인 필요** — purge 직전 다른 세션이 같은 DB 데이터를 변경 중인지 재확인해야 한다(§16).
4. **orphan 은 자동 정리되지 않는다** — FK 가 없으므로 (P1)(P2) 를 생략하면 orphan 이 확정적으로 남는다.
   이 점이 본 조사의 가장 중요한 산출물이다.
5. lint-ratchet 는 다른 세션 WIP 로 오염될 수 있어(직전 WO CHECK §14) 코드 변경 0건인 본 WO 에서는
   판정 대상으로 삼지 않았다.

---

## 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```
