# WO-O4O-DRUG-OTC-KO-STORE-HARDCUT-RECOVERY-V1 — CHECK

- 상태: **조사 완결 / `HC-CARD-SUMMARY` 250 복구 COMPLETE · PASS** — 본문 하드컷 2,535 는 기준 미확정으로 HOLD
- 실행일: 2026-07-31
- 착수 HEAD: `275905888` (origin/main 과 동일, fetch 시점 기준 최신)
- 조사 단계 커밋: `d75879ef1` (DB write 0) · 복구 단계: 본 CHECK 커밋
- **LIVE DB write: 250** (`HC-CARD-SUMMARY` 카드 타일 in-place 교정만. 조사 전 구간은 read-only)
- 범위: KO STORE canonical 15,908 의 하드컷 모집단 독립 재현 · 결함 독립 검출 · 분류 확정 · 승인 범위 복구
- EN 240건: **읽지 않음 · 변경 없음** (별도 WO)

> **진행 순서**
> 1. 조사를 먼저 완결하고 **DB write 0 인 상태로 보고**했다. 결함 2,630 문서 어느 유형에도 재사용 가능한
>    기존 안전 runner 가 없어 WO §6 게이트("기존 runner 가 없다면 신규 기능을 만들지 말고 먼저 보고")에 걸렸다.
> 2. 사용자가 **카드 타일 250 건만 복구**(본문 무변경 · summary 컬럼 신규 생성 없음)를 승인했다.
>    본문 원문 재적재 기준은 "지금 정하지 않음" → §6-2 그대로 HOLD.
> 3. 승인 범위만 신규 러너로 복구했다(§10). 본문 260 절단은 **불변임을 게이트로 증명**했다(G8).

---

## 1. 접속 · 검증 채널

| 항목 | 값 |
|---|---|
| 채널 | Cloud SQL Auth Proxy v2 (`bin/cloud-sql-proxy-v2.exe`) + `gcloud auth print-access-token` |
| 연결 | `127.0.0.1:5512` → `netureyoutube:asia-northeast3:o4o-platform-db` / `o4o_platform` |
| 자격증명 | `apps/api-server/.env` 를 `dotenv` 로 로드해 `process.env` 로만 사용 — 값 출력 0 |
| 트랜잭션 | 모든 세션 `SET default_transaction_read_only = on` |

---

## 2. 모집단 재현 — 조건을 숫자에 맞추지 않았다

```sql
s.deleted_at IS NULL
AND s.description_type = 'STORE'
AND s.source_type      = 'mfds_drug_otc'
AND s.status           = 'canonical'
AND COALESCE(s.language,'ko') = 'ko'
```

`source_type` 은 **기준값에 맞추려고 고른 것이 아니다.** LIVE 의 `%drug%` source_type 분포를 먼저 전수 조회했고,
일반의약품 STORE ko canonical 은 4계열(`mfds_drug_otc` 15,908 · `mfds_drug_otc_nutrition_combo` 3,545 ·
`o4o_drug_otc_topical` 2,567 · `mfds_easy_drug` 353)로 존재한다. 이 중 **확정 기준 15,908 과 정확히 일치하는 계열은
`mfds_drug_otc` 하나**이며, 나머지 3계열은 본 WO 의 확정 기준값 밖이므로 대상에서 제외하고 §7 에 관측으로 남겼다.

| 지표 | 기대 | 실측 |
|---|---:|---:|
| KO STORE canonical | 15,908 | **15,908** |
| DISTINCT `master_id` | 15,908 | **15,908** |
| master 당 canonical 중복 | 0 | **0** |
| ProductMaster 연결 실패 | 0 | **0** |
| ProductMaster 비-ACTIVE | 0 | **0** |
| `regulatory_type` / `drug_category` | DRUG / otc | **DRUG / otc 15,908 (단일)** |
| description_type·language·status·삭제 혼입 | 0 | **0** |
| `source_ref_id` NULL | 0 | **0** |

**15,908 재현 = PASS.** 누락·초과 0 이므로 차이 추정 절차는 발생하지 않았다.

---

## 3. "하드컷" 의 최신 코드상 정의

과거 CHECK 의 대상 수·목록·코드 위치를 인용하지 않고 저장소에서 다시 찾았다. 현재 main 에 실재하는 **영속 경로**의 고정 절단은 4곳이다.

| 코드 | 절단 | 영향 |
|---|---|---|
| [otc-v3-content-leaflet-composer.na.ts:133](../../apps/api-server/src/scripts/otc-v3-content-leaflet-composer.na.ts#L133) | `efficacy.split('\n')[0].slice(0, 120)` | 카드 요약 / `작용` 타일 |
| [otc-v2-store-leaflet-runner.shared.ts:427](../../apps/api-server/src/scripts/otc-v2-store-leaflet-runner.shared.ts#L427) | 동일 `slice(0, 120)` | 동일 |
| [otc-unproduced-oral-unit-approval.ts:210](../../apps/api-server/src/scripts/otc-unproduced-oral-unit-approval.ts#L210) | `indication/dosage/caution` 각 `slice(0, 260)` | **본문 6섹션** |
| [otc-v4-carryover72-author.ga.ts:87](../../apps/api-server/src/scripts/otc-v4-carryover72-author.ga.ts#L87) | 요약 `slice(0, 200)` | 카드 요약 |

**코드는 후보일 뿐 대상이 아니다.** 실제 절단 길이는 LIVE content 에서 독립 산출했다:
전 텍스트 단위(intro / intake / warn `<li>` / 6타일 / foot, 총 **212,049 단위**)의 길이 히스토그램을 만들고
이웃(±6) 중앙값 대비 6배 이상 스파이크를 탐지했다.

| kind | 길이 | 건수 | 이웃 중앙값 | 판정 |
|---|---:|---:|---:|---|
| `warn:li` | 260 | 2,114 | 33 | 절단 스파이크 |
| `warn:li` | 259 | 450 | 42 | 260 절단 + 끝 공백 소실 |
| `intake` | 260 | 125 | 2 | 절단 스파이크 |
| `tile:작용` | 120 | 379 | 14 | 절단 스파이크 |

`slice(0, 200)` 은 **LIVE 에 0 건**이다 — 코드 존재 ≠ 데이터 존재.

### 3-1. 절단의 증명 — 길이만으로 판정하지 않았다

길이 스파이크는 후보 선정에만 쓰고, 실제 결함은 **공식 원문의 진접두(strict prefix)** 로 증명했다.

- 원문 = `source_type='mfds_easy_drug'` STORE ko 문서(현재 전량 `deprecated` 로 밀려 있으나 본문은 보존).
  모집단 15,908 중 **14,636** 이 원문을 가진다.
- 저작기와 **동일한** `sections()` / `normalize()` 로 원문 섹션(효능·효과 / 용법·용량 / 경고+사용상 주의사항+상호작용)을 만들고,
  leaflet 단위 텍스트도 같은 `normalize()` 로 접어 비교했다.
- 판정: **미종결(문장 종결부호 없음) + 원문 정규화 텍스트의 진접두** → 절단 확정.

> **정규화 없이 비교하면 오판한다.** 본문 `<li>` 는 `사용상 주의사항` 과 `상호작용` 결합부에 개행이 남아 있어
> 원문 공백 정규화 없이는 접두 판정이 깨진다. 1차 판정의 "증명 실패 37" 은 전부 이 비교 결함이었고,
> 정규화 후 12 건이 결함으로 확정, 25 건이 비결함으로 확정됐다.

---

## 4. 전수 조사 결과 (READ-ONLY)

[otc-ko-store-hardcut-recovery-census.ga.ts](../../apps/api-server/src/scripts/otc-ko-store-hardcut-recovery-census.ga.ts) — DB write 0

### 4-1. 문서 단위 상호배타 분류

| 분류 | 문서 수 |
|---|---:|
| 정상 | **13,278** |
| 결함 | **2,630** |
| **합계 검증** | **15,908 = 모집단 PASS** |

### 4-2. 결함 유형별 (발생 건수 · 문서 수)

| 코드 | 의미 | 발생 건수 | 문서 수 | 상호배타 1차 분류 |
|---|---|---:|---:|---:|
| `HC-BODY-CAUTION` | `주의 대상` `<li>` 가 공식 주의사항 원문의 260자 지점에서 절단 | **2,378** | 2,378 | 2,378 |
| `HC-CARD-SUMMARY` | `작용` 타일이 sd-intro 첫 줄의 120자 지점에서 절단 | **250** | 250 | 250 |
| `HC-BODY-DOSAGE` | `복용 안내` 가 공식 용법·용량 원문의 260자 지점에서 절단 | **155** | 155 | 2 |
| `HC-BODY-INDICATION` | 효능 문장이 공식 효능·효과 원문에서 절단 | **2** | 2 | 0 |
| **합계** | | **2,785** | — | **2,630** |

문서 수 합(2,785) > 결함 문서 수(2,630) 인 이유는 한 문서가 복수 유형을 갖기 때문이다(대부분 주의사항 + 복용 안내 동시 절단).
1차 분류는 `CAUTION > DOSAGE > INDICATION > CARD-SUMMARY` 우선순위로 문서당 하나만 부여했다.

절단 길이 분포(원시 길이): `260` 2,156 · `259` 367 · `120` 250 · `282` 6 · `337` 6
→ 정규화 길이로 접으면 **260 / 259 / 120 세 값**으로 수렴한다(282·337 은 `&nbsp;` 등이 포함된 동일 260 절단).

### 4-3. 결함이 아닌 것으로 확정한 경계 사례

| 사례 | 건수 | 판정 근거 |
|---|---:|---|
| 미종결이지만 **공식 원문 전체의 충실한 사본** | 17 | MFDS 원문 자체가 종결부호 없이 끝난다(원천측). 우리 파이프라인의 절단이 아니다 |
| 미종결 + 원문과 접두·동일 어느 쪽도 아님 | **8** | 저작·편집된 주의 목록이 마침표 없이 끝남. 고정 길이 아님 → **사람 검토 필요** |
| 공식 원문 없는 문서 | 1,272 | 이 1,272 에는 절단 서명(259/260/120, 미종결 200자 이상)이 **0 건**이다 → 누락 위험 없음 |

> 원문이 없는 1,272 를 "판정 불가" 로 남기지 않고 **절단 서명 자체가 0 임을 실측**해 과소 계수 가능성을 닫았다.

### 4-4. 복구 가능성

| 구분 | 발생 건수 |
|---|---:|
| 자동 복구 가능(잘린 뒷부분이 공식 원문/상위 텍스트에 **그대로 남아 있음** — 추정 불필요) | **2,785 (100%)** |
| 사람 검토 필요 | 8 |
| 복구 불가 | 0 |

---

## 5. 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `git fetch origin main` → `git rev-parse origin/main` | `275905888` — 로컬 main 과 동일, pull 불필요 |
| proxy 기동 (`--port 5512`) | `ready for new connections` |
| `tsx src/scripts/otc-ko-store-hardcut-recovery-census.ga.ts --port 5512` | 모집단 15,908 / 결함 문서 2,630 / 발생 2,785 / 합계 검증 PASS |
| `tsc --noEmit -p tsconfig.json` | 오류 12 건 — **전부 기존 스크립트**(audit-roles, drug-otc-*, hff-*, otc-easy-drug-*). 본 WO 산출물 0 건 |
| `card-tile-rebuild … ` (dry-run ×2) | target 250 / blocked 0 / plan byte-identical |
| `card-tile-rebuild … --rollback-test` | RBT PASS 250 / residue 0 / write 0 |
| `OTC_KO_CARD_TILE_REBUILD=CONFIRM … --apply --confirm` | GREEN 250 / **writeActual 250** / exception 0 |
| `card-tile-verify … --since '2026-07-31 13:25:26+00'` | 19 게이트 **failed 0** |
| `card-tile-rebuild …` (멱등 재실행) | target 0 / write 0 |
| 조사 단계 DB write | **0** (read-only 트랜잭션 강제) |
| 복구 단계 DB write | **250** (승인 범위) |

canonical 중복 0 · description_type/language/status 혼입 0 · `source_ref_id` NULL 0 은 §2 표에 실측으로 기록했다.

---

## 5-A. 조사 시점 게이트 판정 (복구 착수 전)

### 5-A-1. `HC-CARD-SUMMARY` 250 — 기존 runner 의 대상 밖

[otc-ko-summary-rebuild.ga.ts:198](../../apps/api-server/src/scripts/otc-ko-summary-rebuild.ga.ts#L198) 은
`summary === null` 행을 **명시적으로 건너뛴다**("요약 없음 — 본 WO 대상 아님(신규 생성 금지)").

실측: **250 건 전부 `summary IS NULL`** (`summary_null 250 / summary_120 0 / summary_other 0`).
즉 결함은 요약 컬럼이 아니라 **`작용` 타일에만** 남아 있고, 기존 runner 의 타일 교체 조건(타일 값 = 옛 요약)도 성립하지 않는다.
→ 기존 runner 재사용 불가. 대상 규칙 변경 = 신규 기능이므로 착수하지 않았다.

### 5-A-2. `HC-BODY-*` 2,535 — runner 부재 + 원문 재적재 기준 미확정 (**HOLD 유지**)

- 본문 6섹션 변경이며, 전용 runner 가 저장소에 **없다**.
- 잘린 뒷부분은 공식 원문에 그대로 있으나 **얼마나 되돌릴지는 기준이 필요하다.**
  실측 예: 절단 260자 ↔ 공식 주의사항 원문 1,397자. 전량 복원은 매장 카드를 원문 덤프로 바꾸고,
  문장 경계 절사는 정보를 남긴다. 이 선택은 기계적 복구가 아니라 **매장용 설명서 편집 기준**이다.
- 경고·금기 문장을 다루므로 기준 없이 자동 적용하면 위해도가 요약 절단보다 높다.

사용자 판단(2026-07-31): **"지금 정하지 않음"** → 본 WO 에서 착수하지 않는다. §10 의 G8 이 불변을 증명한다.

---

## 6. 복구 실행 — `HC-CARD-SUMMARY` 250 (승인 범위)

[otc-ko-store-hardcut-card-tile-rebuild.ga.ts](../../apps/api-server/src/scripts/otc-ko-store-hardcut-card-tile-rebuild.ga.ts)

**신규 규칙을 만들지 않았다.** 새 값은 EN·KO 에서 이미 검증된 언어 중립 단일 함수
[`deriveLeafletSummary()`](../../apps/api-server/src/scripts/otc-leaflet-summary.shared.ts) 를 sd-intro 첫 줄에 그대로 적용한 것이다
(① 첫 완결 문장 ② 축약은 문장 경계에서만 ③ 어절 중간 절단 금지).

### 6-1. 변경 지점 — 표시값 2곳뿐

| 지점 | 마커 |
|---|---|
| 한눈에 보기 `작용` 타일 | `<span class="sd-tag">작용</span>…<p>{값}</p>` |
| sd-hero 배지 | `<span class="sd-badge">{값}</span>` — **타일과 값이 정확히 같을 때만** 교체(실측 250/250 일치) |

`summary` 컬럼은 **쓰지 않는다**(250 전건 NULL 유지 — 요약 신규 생성은 승인 범위 밖).
교체 지점은 원본 바이트(정규식 매치 결과)를 그대로 쓰고, 재이스케이프 왕복 오차를 차단했다
(실측: 250 건의 옛/새 값에 `& < > "` 가 **0 건** — 이스케이프는 항등).

### 6-2. 실행 게이트

| 단계 | 결과 |
|---|---|
| dry-run 2회 byte-identical | plan sha256 `bfccd5d1ffe6c8fd…`, planDigest `01196348d7f80c3a…`, target **250** / blocked **0** |
| 계획 전건 사전 검사 | 새 값이 옛 값의 확장 250/250 · 효능 첫 줄의 접두 250/250 · 문장 종결 250/250 |
| rollback-test 250 | PASS **250** / residue **0** / writeActual **0** |
| **LIVE apply** | GREEN **250** / blocked 0 / exception 0 / **writeActual 250** / summary 컬럼 write **0** / auditRows **0** |
| 독립검증 19 게이트 | **failed 0 · failures 0** |
| 멱등 재실행 | target **0** (planDigest = 빈 집합 해시) / write 0 |

DB write 계약: 행 단위 트랜잭션 + `SAVEPOINT`, `UPDATE … SET content, updated_at`,
**낙관적 잠금 `md5(content)=oldHash` + `summary IS NULL`** 동시 조건, `rowCount=1` 아니면 차단.
audit 0행 — canonical 교체가 아닌 in-place 표시값 교정(선례: `otc-ko-summary-rebuild` · `drug-otc-additive-warning-apply`).

### 6-3. 복구 전후 (LIVE 전수 재조회)

| 지표 | 적용 전 | 적용 후 |
|---|---:|---:|
| KO STORE canonical | 15,908 | **15,908** |
| canonical 중복 master | 0 | **0** |
| 정상 문서 | 13,278 | **13,528** (+250) |
| 결함 문서 | 2,630 | **2,380** (−250) |
| `HC-CARD-SUMMARY` | 250 | **0** |
| `HC-BODY-CAUTION` / `DOSAGE` / `INDICATION` | 2,378 / 155 / 2 | **2,378 / 155 / 2** (불변) |
| 합계 검증 | PASS | **PASS** |

예: `이 약은 … 소아 질환(습관성 구토, 비감염성 장관 통과 장애(변비,` (120자, 괄호·어절 중간 절단)
→ `… 장애(변비, 설사))에 사용합니다.` (133자, 문장 완결). 원문에 없는 내용 추가 0.

---

## 7. 남은 검토 대상 · 범위 밖 관측

| 항목 | 규모 | 성격 |
|---|---:|---|
| `HC-BODY-CAUTION` / `DOSAGE` / `INDICATION` | 2,535 발생 / 2,380 문서 | **HOLD** — 원문 재적재 기준 확정 후 별도 WO |
| `HC-CARD-SUMMARY` (summary NULL) | 250 | **복구 완료** (§6) |
| 미종결 + 원문 미대조 8 건 | 8 | 사람 검토 |
| 원문 자체가 미종결 17 건 | 17 | MFDS 원천측 — 우리 결함 아님 |
| 요약 컬럼 NULL | 1,577 | 요약 신규 생성 여부는 별도 판단(본 WO 범위 밖) |
| 인접 OTC 계열 미조사 | `mfds_drug_otc_nutrition_combo` 3,545 · `o4o_drug_otc_topical` 2,567 · `mfds_easy_drug` 353 | 확정 기준 15,908 밖 — 동일 절단 존재 여부 미조사 |

---

## 8. 다음 EN 240건 작업으로 넘길 사항

- 본 WO 는 EN 을 **읽지도 변경하지도 않았다.** `mfds_drug_otc` EN canonical 15,908 · deprecated 3 은 조회 시점 그대로다.
- KO 본문 하드컷이 복구되면 **동일 master 의 EN 본문도 같은 지점에서 잘려 있을 가능성**이 높다(같은 approval 경로 산출물).
  EN 240건 착수 시 `otc-en-coverage-incomplete-list.ga.json` 만 보지 말고, 본 CHECK 의 판정기(원문 진접두 증명)를
  EN 에 적용해 **모집단을 다시 세는 것**을 권한다.
- KO 복구를 먼저 끝내야 EN 대조의 기준선이 고정된다.

---

## 9. 산출물

| 파일 | 역할 |
|---|---|
| [otc-ko-store-hardcut-recovery-census.ga.ts](../../apps/api-server/src/scripts/otc-ko-store-hardcut-recovery-census.ga.ts) | 모집단 재현 + 절단 길이 독립 탐색 + 전수 판정 (READ-ONLY) |
| [otc-ko-store-hardcut-card-tile-rebuild.ga.ts](../../apps/api-server/src/scripts/otc-ko-store-hardcut-card-tile-rebuild.ga.ts) | 카드 타일 재조립 러너 (dry-run / rollback-test / apply) |
| [otc-ko-store-hardcut-card-tile-verify.ga.ts](../../apps/api-server/src/scripts/otc-ko-store-hardcut-card-tile-verify.ga.ts) | 독립검증기 19 게이트 (READ-ONLY · 러너·파생 규칙 모듈 미import) |
| `data/otc-ko-store-hardcut-recovery-census.ga.json` | **적용 전** 모집단·분류·스파이크·합계 검증 요약 |
| `data/otc-ko-store-hardcut-recovery-defects.ga.json` | **적용 전** 결함 2,785 건 전체 목록(문서 id·master·상품명·유형·절단 길이·판정 근거·복구 방법·원문 잔여 꼬리) |
| `data/otc-ko-store-hardcut-recovery-census-post-apply.ga.json` | **적용 후** 재조사 요약(카드 0 · 본문 불변 · 합계 PASS) |
| `data/otc-ko-store-hardcut-card-tile-plan.ga.json` | dry-run 계획 원장 (+ `run-*` 불변 사본) |
| `data/otc-ko-store-hardcut-card-tile-result.ga.json` | rollback-test / apply 결과 원장 (+ `run-*` 사본) |
| `data/otc-ko-store-hardcut-card-tile-checkpoint.ga.json` | 100건 단위 체크포인트 원장 |
| `data/otc-ko-store-hardcut-card-tile-verify.ga.json` | 독립검증 19 게이트 결과 |

## 10. 독립검증 19 게이트 (별도 코드 경로)

핵심 증명(**G7**): LIVE 본문에서 **새 타일 값 2지점만** 옛 값으로 되돌리면 md5 가 적용 전 해시와
**byte 단위로 일치**한다(250/250). 따라서 본문 6섹션·수치·연령·횟수·기간·경고 강도·footer 는 변경될 수 없다.

| 게이트 | 기대 | 실측 |
|---|---:|---:|
| G0 KO canonical 모집단 | 15,908 | 15,908 |
| G1 계획 건수 | 250 | 250 |
| G2 본문 해시 = 계획 newHash | 250 | 250 |
| G3 대상 `작용` 타일 = 새 값 | 250 | 250 |
| G3b 대상 120자 고정 절단 잔존 | 0 | 0 |
| G4 KO **전수** 120자 타일 절단 잔존 | 0 | 0 |
| G5 hero 배지 ↔ 새 타일 동기화 | 250 | 250 |
| G6 summary 컬럼 NULL 유지(요약 신규 생성 0) | 250 | 250 |
| G7 역패치 복원 → 적용 전 해시 일치 | 250 | 250 |
| G8 **본문 260 절단(범위 밖) 불변** | 2,029 | 2,029 |
| G9 새 타일이 효능 첫 줄의 접두 | 250 | 250 |
| G10 새 타일 문장 종결 | 250 | 250 |
| G11 KO canonical 중복 master | 0 | 0 |
| G12 상태·타입·언어·sourceRef·삭제 드리프트 | 0 | 0 |
| G13 적용 창 이후 KO 갱신 총건 | 250 | 250 |
| G13b 적용 창 이후 **대상 밖** KO 갱신 | 0 | 0 |
| G14 적용 창 이후 EN 갱신 | 0 | 0 |
| G14b 적용 창 이후 타 source_type 갱신 | 0 | 0 |
| G15 비의약품 master 혼입 | 0 | 0 |
| G16 EN canonical 총건 불변 | 15,908 | 15,908 |

적용 창 기준 시각 = `2026-07-31 13:25:26.087164+00` (apply 직전 DB `now()`).
적용 전 `mfds_drug_otc` 최종 갱신은 `07:36:24` 였으므로 창 이후 갱신은 전부 본 실행분이며, 실측 250 = 대상 전건이다.
