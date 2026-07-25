# CHECK — V2 OTC 잔여 READY 3-shard LIVE apply 전체 완료

**WO-O4O-OTC-REMAINING-READY-SHARD-DA-V2-LIVE-APPLY-V1 (다 shard) + V2 종합**

| 항목 | 값 |
|------|-----|
| 대상 | V2 census READY 전체 — 716 fingerprint / 2,517 master |
| 적재 완료 | **2,509 master** (KO canonical 2,509 · EN canonical 2,509) |
| HOLD_SOURCE | **8 master** (가 2 · 다 6) — write 0, easy_drug canonical 원상 유지 |
| 총 write | **15,054T** (가 5,022 + 나 5,034 + 다 4,998) |
| 상태 | 3-shard 전부 `koApplied` · `enApplied` · `independentVerified` = true |

기준 커밋: census/SSOT `81b39da72` · 공용 러너 `3447b2323` (+`31ac7233c` EN 수량 게이트 교정)
· apply 지원 `394ab0e4b` · 다 EN 저작 COMPLETE `340ad4c22` · 나 apply 완료 `1b4c207e4`

---

## 1. 최종 집계

| shard | census | HOLD | eligible fp / master | KO write | EN write | 소계 |
|:---:|:---:|:---:|:---:|---:|---:|---:|
| 가 | 238 fp / 839 m | 1 fp / 2 m (227703ATB) | 237 / 837 | 3,348 | 1,674 | 5,022 |
| 나 | 240 fp / 839 m | 0 | 240 / 839 | 3,356 | 1,678 | 5,034 |
| 다 | 238 fp / 839 m | 1 fp / 6 m (227736ATD) | 237 / 833 | 3,332 | 1,666 | 4,998 |
| **합계** | **716 / 2,517** | **2 fp / 8 m** | **714 / 2,509** | **10,036** | **5,018** | **15,054** |

- write 계약: KO 4T/master (easy canonical→deprecated · authored INSERT · canonical 전환 · audit),
  EN 2T/master (INSERT · canonical 전환). 6 회 apply 전부 `writeActual == 예상` **MATCH**.
- 프로덕션 실측 종합: authored KO canonical **2,509** · authored EN canonical **2,509**.

---

## 2. 다 shard apply

### 2-1. 사전 확인 (최신 main 반영 · 러너 340ad4c22 기준)

`origin/main == HEAD` (ahead 0 / behind 0), `340ad4c22` ancestor 확인.
다 EN 저작본 재검증 — coverage **COMPLETE** (237 fp / 833 master, HOLD 1 fp / 6 master 제외,
누락 0 · 중복 0), verify **237 entries PASS**.

### 2-2. apply-readiness 필수 기대값 — 18/18 일치

| 항목 | 실측 / 기대 |
|------|---|
| eligible fp / master | 237 / 237 · 833 / 833 |
| HOLD fp / master | 1 / 1 · 6 / 6 |
| ga verified / na verified | true / true |
| fingerprint 재현 / 실패 | 839 / 839 · 0 |
| canonicalDup | 0 |
| 차단집합 (blockedFp · blockedMaster · CLQ/CDS/CSI) | 0 · 0 · 0 |
| shard 밖 master | 0 |
| writePlan KO / EN / total | 3,332 · 1,666 · 4,998 |
| 순서 게이트 · blockers | PASS · 0 |

### 2-3. KO apply

- 게이트 10/10 PASS → 실행 → **237 그룹 · writeActual 3,332 / 예상 3,332 MATCH**

### 2-4. EN apply

- 러너의 EN apply 는 단일 `--en-config` 에 eligible 전 fp 페이로드를 요구하므로
  12 파트를 **무변형 병합**해 입력 (`otc-v2-en-config-merge.da.mjs` → `otc-v2-en-config-da-all.json`).
  병합본 재검증: coverage COMPLETE 237/833 · verify 237 entries PASS.
- 게이트 11/11 PASS. post-KO 선행 실측 — authored ko canonical 833 · easy ko canonical 0
  · ko dup 0 · audit 833.
- 실행 → **237 그룹 · writeActual 1,666 / 예상 1,666 MATCH**

---

## 3. 다 사후 독립검증 — 33/33 GREEN

`otc-remaining-v2-postverify.da.mjs` (신규 · read-only SELECT 전용 · 러너 미import ·
앵커 산식만 계약대로 재구현해 교차 확인).

| 축 | 결과 |
|----|------|
| authored KO / EN canonical | 833 / 833 |
| master 당 KO / EN canonical == 1 | 833 / 833 |
| canonicalDup | 0 |
| easy_drug KO canonical 잔존 / needs_review | 0 / 0 |
| easy_drug KO deprecated (강등분) | 833 |
| audit(canonical_replaced/ko) | 833 |
| 앵커 KO / EN canonical 행 · distinct 앵커 | 833 / 833 · 237 |
| shard 밖 앵커 write | 0 |
| **HOLD 6 master** — authored 행 / EN 행 / audit 행 / 앵커 사용 | **0 / 0 / 0 / 0** |
| **HOLD 6 master** — easy_drug KO canonical 유지 / 잘못 강등 | **6 / 0** |
| 실제 write KO / EN / 합 | 3,332 / 1,666 / **4,998** |
| **가 shard KO·EN canonical** | **837 / 837 (drift 0)** |
| **나 shard KO·EN canonical** | **839 / 839 (drift 0)** |
| EN 한글 잔존 / 본문 결손 | 0 / 0 |
| **V2 전체 authored KO / EN canonical** | **2,509 / 2,509** |

`--mark-verified=da` 완료 → 원장 3-shard 전부 `independentVerified=true`.

---

## 4. HOLD_SOURCE 8 master (미적재 · 의도된 보류)

| shard | fp | gencode | master | 사유 |
|:---:|---|---|:---:|---|
| 가 | — | 227703ATB | 2 | 공식 원문 축 부재 (KO 필수필드 누락) |
| 다 | `d6a0785fdee2decf` | 227736ATD (구강용해필름) | 6 | 공식 주의 3축 전부 부재 — 안전정보 창작 금지 |

두 그룹 모두 **write 0**, 기존 `mfds_easy_drug` canonical 이 그대로 남아 있음(다 6/6 실측 확인).
안전정보를 창작하지 않는다는 원칙에 따른 보류이며, 원문 보강 시 별도 WO 로 재개 가능하다.

---

## 5. 진행 중 처리한 사안

### 5-1. EN 수량 게이트 하이픈 범위 오탐 (나 세션 발견 → 다 세션 교정)

- 원문 `4-6시간` 을 `normalize()` 가 `4,6시간` 으로 바꾸고 수량 정규식이 이를 천단위 구분자로 읽어
  실재하지 않는 토큰 `46` 을 요구 → 해당 fp EN apply 차단.
- 나 세션은 러너 수정 금지 규칙에 따라 우회하지 않고 `otc-v2-en-blocker.na.json` 에 기록만 남겼다.
  게이트 통과 목적의 수치 삽입은 공식 원문에 없는 수치 생성이므로 채택하지 않았다.
- 러너 소유 세션(다)이 `31ac7233c` 로 교정 — `missingNumericsEn` **내부에서만** 하이픈 범위를 분리.
  fingerprint · KO 경로 · writePlan 불변.
- drift 0 증명: 교정 후 나 dry-run manifest 가 커밋본과 byte-identical
  (md5 `08356775c82f0c6a6f6525bf834ad647`).

### 5-2. 원문 자체 결손 (창작 없이 명시 처리)

`15e1651112c8e4f4`(A35000ATB, 나 shard) — 저장 원문의 용법이 태그 스트립으로 절단되어
크레아티닌 청소율 임계값이 소실. 없는 수치를 만들지 않고 절단 사실을 명시하고 매장 약사 문의로 연결.

---

## 6. 규칙 준수

- apply 순서 계약 준수: 가 → 나 → 다. 각 단계 선행 shard 의 KO/EN apply + 독립검증 완료를
  원장으로 확인한 뒤 착수했고, 러너의 순서 게이트도 매번 PASS.
- V1 산출물 미사용 (V2 census/SSOT 전용) · 라 census/SSOT 수정 0
- 별도 앵커 생성 0 — `fpToUuidV2` 단일 산출, 앵커 distinct 가 eligible fp 수와 정확히 일치
- 검증 경로 이중화: 러너 내부 트랜잭션 사후검증 + 러너 미import 독립검증기(SELECT 전용)
- `.env` 무접촉 · 값 미출력 · 루트 `.env` 미사용
- `git add .` 미사용 · reset/clean/stash 미사용 · path-specific commit
