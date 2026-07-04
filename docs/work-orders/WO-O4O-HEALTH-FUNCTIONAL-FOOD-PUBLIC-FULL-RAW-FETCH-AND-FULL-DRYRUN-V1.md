# WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-FULL-RAW-FETCH-AND-FULL-DRYRUN-V1

> 작업 성격: **전량 raw fetch + 전량 offline dry-run (read-only).** DB write 0, apply 0, migration 0, Cloud Run Job 0, 프로덕션 코드 변경 0.
> 작성일: 2026-07-04
> 선행: [`CHECK-...-LIVE-RESPONSE-V1`](../checks/CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-LIVE-RESPONSE-V1.md) · [`WO-...-RAW-SAMPLE-FETCH-DRYRUN-V1`](WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-RAW-SAMPLE-FETCH-DRYRUN-V1.md) · [`WO-...-CANDIDATE-IMPORT-DRYRUN-V1`](WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-IMPORT-DRYRUN-V1.md)
> 매핑 기준: 실제 엔티티 `apps/api-server/src/modules/neture/entities/ProductCandidate.entity.ts`
> 범위 고정: **건강기능식품 트랙 전용.** 의료기기/의약외품 확장 금지. 병렬 세션 파일 무수정.

---

## 0. 목적

건강기능식품정보 API `totalCount=44,885` 를 **전량 수집**하여, ProductCandidate Gate A apply 이전
**전량 기준 품질 지표**(STTEMNT_NO 유일성 / candidate_name 길이 / 필드 결측률 / created·skipped·errored)를
확정한다. 100 표본 dry-run([선행 WO](WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-IMPORT-DRYRUN-V1.md))의
예측을 전량으로 검증·대체한다. **DB write·apply 없음.** ProductMaster 승격 0건 유지.

---

## 1. 수집 조건 (실측 확정)

```
endpoint: https://apis.data.go.kr/1471000/HtfsInfoService03/getHtfsItem01
ServiceKey=<repo 밖 .env.public-data, 미출력>
type=json
numOfRows=500      ← ★ 이 API 최대치 = 500 (1000 요청 시 resultCode 11 "numOfRows maximum is =[500]")
pageNo=1..90       ← ceil(44,885 / 500) = 90 페이지
페이지 간 sleep 250ms, page 실패 시 3회 재시도(1s backoff) + 잔여 실패목록 재시도 1회
```

- **numOfRows 최대 500** 은 이번에 실측으로 확정(신규 발견). 전량/증분 수집 스크립트 모두 500 상한 준수.
- 저장 형식: `body.items[].item` flatten → **1 line = 1 item JSONL**.

### 1.1 raw 저장 / 기존 sample 처리
```
저장(repo 밖): G:\내 드라이브\자료실\public-data-api-samples\mfds-health-functional-food-info-raw.jsonl
```
- **기존 100건 sample 은 백업 후 전량으로 덮어씀**: `mfds-health-functional-food-info-raw.sample100.bak.jsonl` (repo 밖) 로 보존.
- 최종 raw = 전량 44,885 라인. **raw commit 없음** (repo 밖 canonical 유지).

---

## 2. 전량 dry-run 결과 (44,885 전량)

| # | 지표 | 값 |
|---|---|---:|
| 1 | totalCount(api) vs JSONL line | 44,885 vs 44,885 · **일치** |
| 2 | JSON parse 오류 | **0** |
| 3 | flatten 오류 | **0** |
| 4 | unexpected field (11개 외) | **0 (none)** |
| 6 | STTEMNT_NO distinct | **44,885 / 44,885** |
| 6 | STTEMNT_NO duplicate | **0** (extra dup rows 0) |
| 7 | STTEMNT_NO 결측/비정상 | **0** |
| 8 | PRDUCT trim 필요 | **771** (1.72%) |
| 10 | 필수 결측 (STTEMNT_NO/PRDUCT/ENTRPS) | **0 / 0 / 0** |
| 11 | created / skipped / errored (예측) | **44,885 / 0 / 0** |
| 12 | ProductMaster 승격 대상 | **0 (명시 유지)** |
| — | 실패 페이지 | **0 / 90** |

### 2.5 필드 존재율 (non-empty / 44,885) — 전량 실측

| 필드 | 존재율 | 결측 | 처리 |
|---|---:|---:|---|
| `ENTRPS` (업체명) | 100.00% | 0 | 필수 |
| `PRDUCT` (제품명) | 100.00% | 0 | 필수 (trim) |
| `STTEMNT_NO` (신고번호) | 100.00% | 0 | 필수·식별자 |
| `REGIST_DT` (등록일) | 100.00% | 0 | |
| `BASE_STANDARD` (기준규격) | 99.99% | 4 | optional |
| `MAIN_FNCTN` (기능성) | 99.93% | 31 | optional (→ raw_payload.mainFunction) |
| `DISTB_PD` (유통기한) | 100.00% | 2 | optional |
| `SUNGSANG` (성상) | 99.96% | 18 | optional |
| `SRV_USE` (섭취방법) | 99.10% | 405 | optional |
| `PRSRV_PD` (보관조건) | 99.08% | 415 | optional |
| `INTAKE_HINT1` (섭취주의) | 96.29% | 1,663 | optional (결측률 최대) |

→ **필수 3필드는 전량 100%**. 나머지는 optional (nullable 허용). 결측률 최대는 `INTAKE_HINT1` 3.71%.

### 2.9 length guard — 전량 실측 (apply 선결 판정)

| 필드 | 컬럼 한도 | 전량 max | 초과 |
|---|---:|---:|---:|
| `STTEMNT_NO` → identifier_value | 128 | 15 | **0** |
| `PRDUCT` → candidate_name | 255 | **110** | **0** |
| `ENTRPS` → candidate_manufacturer | 255 | 30 | **0** |

- **전량에서도 candidate_name overlength 0** (max 110자). 의약외품(ITEM_NAME max 1,840자, 260건 초과)과 **근본적으로 다름** — 건강기능식품은 truncation 선결 조건이 **전량 기준으로도 불필요**.
- 다만 방어적 truncate(255)+`CANDIDATE_NAME_OVERLENGTH` flag 로직은 회귀 방지 차원에서 mapper에 유지 권장(비용 0).

---

## 3. 100 표본 → 전량 대비 (예측 검증)

| 지표 | 100 표본 예측 | 전량 44,885 실측 | 판정 |
|---|---|---|---|
| STTEMNT_NO 유일성 | distinct(중복 0) | **distinct 44,885, 중복 0** | ✅ 유지 |
| candidate_name max | 83 | **110** (여전히 <255) | ✅ truncation 불요 |
| 필수 결측 | 0 | **0** | ✅ 유지 |
| created/skipped/errored | 100/0/0 | **44,885/0/0** | ✅ 스케일 유지 |
| optional 결측 | PRSRV_PD 1%, INTAKE_HINT1 6% | PRSRV_PD 0.92%, INTAKE_HINT1 3.71% | ✅ 유사·확정 |

전량 검증 결과 100 표본 예측이 모두 유지되며, candidate_name max만 83→110 으로 소폭 상승(여전히 안전).

---

## 4. Candidate 매핑 (변경 없음 — 선행 WO §1 그대로)

`source_type='external_api'` / `source_label='MFDS_HEALTH_FUNCTIONAL_FOOD'` /
`identifier_type='MFDS_STTEMNT_NO'` / `identifier_value=normalized=trim(STTEMNT_NO)` /
`candidate_name=trim(PRDUCT)` / `candidate_manufacturer=trim(ENTRPS)` /
`candidate_category='HEALTH_FUNCTIONAL_FOOD'` / `raw_payload`={source 11필드 + regulatoryType + mainFunction}.
dedupKey = `external_api::MFDS_STTEMNT_NO::<STTEMNT_NO>::health_functional_food`.

---

## 5. read-only 준수 확인

| 항목 | 결과 |
|---|---|
| ProductCandidate apply / DB write | 0 |
| ProductMaster/ProductIdentifier 생성 | 0 |
| migration / Cloud Run Job | 0 |
| raw 대용량 파일 커밋 | 0 (raw·백업 모두 repo 밖 G: 드라이브) |
| serviceKey 원문 출력/기록 | 0 |
| 프로덕션 코드 변경 | 0 (fetch/분석은 scratchpad 스크립트) |
| 병렬 세션 파일 수정 | 0 (pnpm-lock.yaml 등 무수정) |
| 범위 확장(의료기기/의약외품) | 0 |

이번 변경은 문서 1건(본 WO) 추가뿐이다.

---

## 6. apply 전 남은 리스크 (13)

1. **성능**: 44,885 INSERT — 청크 multi-row(500行/문) + dedup 선적재 필요(선례 존재).
2. **idempotency**: 재실행 시 dedupKey 기존 조회로 updated 처리(중복 INSERT 금지).
3. **optional 결측**: `INTAKE_HINT1` 3.71% 등 — NOT NULL 제약 금지, flag만.
4. **candidate_name**: 전량 max 110 이나 방어적 truncate 로직 유지(향후 증분 데이터 대비).
5. **증분 갱신 정책**: HFF는 신규 신고 지속 발생 → 재수집 주기·증분 dedup 정책 후속 결정.
6. **서비스 귀속**: `service_key=null` 공공 seed 유지(특정 서비스 귀속 금지).
7. **Gate B 보류 근거**: barcode/포장단위/허가상태 원천 부재 — ProductMaster 승격은 별도 원천 확보 후.

---

## 7. 결론

**건강기능식품 전량 44,885 수집·검증 완료. STTEMNT_NO 전량 유일(중복 0), 필수 3필드 100%, candidate_name max 110(<255, truncation 불요), 실패 페이지 0, created 44,885·skipped 0·errored 0.** 건강기능식품 트랙은 이제 **Gate A ProductCandidate apply 의사결정 가능 상태**다. apply는 사용자 승인 + 백업 확인 후 별도 WO(`product_candidates` only INSERT, idempotent)로 진행하며, ProductMaster 승격은 계속 범위 밖(0건)이다.
