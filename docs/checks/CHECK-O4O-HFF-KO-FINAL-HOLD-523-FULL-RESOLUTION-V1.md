# CHECK-O4O-HFF-KO-FINAL-HOLD-523-FULL-RESOLUTION-V1

건강기능식품 한국어 비번역 최종 HOLD **523건 전수 해결** (삭제 없음)

- 근거 WO: `WO-O4O-HFF-KO-FINAL-HOLD-523-FULL-RESOLUTION-V1`
- 기준 커밋: `f79aa4c10` (origin/main 조상 확인)
- 판정: **PASS** — 47건 해결 · 476건 근거 있는 FINAL_HOLD 유지 · 삭제 0

---

## 1. 실행 조건

| 항목 | 결과 |
|---|---|
| `ide_selection` | 없음 |
| 작업트리 | 타 세션 WIP(`pnpm-lock.yaml`, `otc-en-coverage-*`) — **미접촉** |
| DB read-only | 조사·판정·독립검증 전 세션 `SET default_transaction_read_only = on` |
| 삭제·archive·terminal 처리 | **0** (WO §3 준수) |
| EN 대상 write | **0** |
| 공용 renderer·CSS | **미수정** |

---

## 2. 모집단 재구성 — 정확 재현

큐 `hff-ko-nontranslation-final-hold-v1.jsonl` 523행을 현재 DB 로 전건 재파생했다.

| 항목 | 값 |
|---|---|
| 큐 행수 | **523** (기대 일치) |
| Track A (KO canonical 보유) | **175** |
| Track B (canonical 미보유) | **348** |
| candidate 결손 | **0** |
| 큐 사유 분포 | WO 기준선과 **완전 일치** (314/67/53/49/29/5/4/2) |

### 2-1. 공식 필드 커버리지 (실측)

| 필드 | Track A (175) | Track B (348) |
|---|---|---|
| `MAIN_FNCTN` | 175 | **319** |
| `SRV_USE` | 175 | **34** |
| `INTAKE_HINT1` | 172 | 340 |
| `BASE_STANDARD` | 175 | 348 |
| **`MAIN_FNCTN` && `SRV_USE`** | **175** | **5** |

### 2-2. ProductMaster 상태 (실측)

| 상태 | 건수 |
|---|---|
| 이미 연결됨 (Track A) | 175 |
| permit 로 기존 master **단일 매칭** | **0** |
| permit 로 기존 master 복수 매칭 | 0 |
| **permit 로 기존 master 없음** (Track B) | **348** |

Track B 348건이 미연결인 이유는 조회 실패가 아니라 **해당 허가번호의 ProductMaster 가 존재하지 않기** 때문이다. 따라서 매칭이 아니라 **신규 생성**만이 경로다.

---

## 3. 공식 원천 복구 조사 — 결정적 결과

WO §11 의 지시대로 공식 MFDS raw 를 전수 대조했다.

```
raw: mfds-health-functional-food-info-raw.jsonl (44,885행)
대상: Track B 결측 343건
```

| 검사 | 결과 |
|---|---|
| raw 에서 발견 | **343 / 343** (미발견 0) |
| raw 에 `SRV_USE` 존재 | **29** |
| raw 에 `MAIN_FNCTN` 존재 | **314** |
| **raw 에 둘 다 존재** | **0** |

**결론: 결측은 ETL 손실이 아니라 공식 원천 자체의 부재다.** DB 는 원천을 충실히 반영하고 있으며, 데이터 복구로는 해결할 수 없다. 외부 일반 정보·유사 제품 복사는 WO 금지 사항이므로 수행하지 않았다.

`repairsApplied: 0` — 원천 보정을 적용한 건은 없다.

---

## 4. 최종 판정 (523 전량)

| 상태 | 건수 |
|---|---|
| **RESOLVED_UPDATED** (Track A canonical 수정) | **40** |
| **RESOLVED_NO_CHANGE** | **2** |
| **PRODUCTMASTER_LINKED_AND_CREATED** (Track B) | **5** |
| `FINAL_HOLD_OFFICIAL_SOURCE_MISSING` | **343** |
| `FINAL_HOLD_BOUNDARY_AMBIGUOUS` | **124** |
| `FINAL_HOLD_SOURCE_CONFLICT` | **9** |
| `FAILED_SYSTEM` | **0** |
| **합계** | **523** ✅ |

**해결 47건 / 유지 476건.**

### 4-1. FINAL_HOLD 세부 사유

| 사유 | 건수 | 근거 |
|---|---|---|
| 공식 `SRV_USE` 부재 | 314 | raw 전수 대조로 원천 부재 확증 |
| 공식 `MAIN_FNCTN` 부재 | 29 | 동일 |
| `NO_LABELED_CLAUSE` | 96 | 원문에 원료 라벨이 없어 귀속 확정 불가 |
| `ORPHAN_CLAUSE_NO_OWNER` | 9 | 라벨 없는 고아 절 존재 |
| `OPEN_LABEL_NO_MARKER` | 1 | 라벨/절 분리점 없음 |
| `EMBEDDED_MARKER_IN_CLAUSE` · `CLAUSE_SUBSTRING_OVERLAP` | 9 | 원문 손상(마커 혼입·문장 이어붙임) |

---

## 5. Track A — 40건 기능성 구조 복구

### 5-1. 실제 결함 (재현 확인)

| 제품 | 결함 |
|---|---|
| 건기남의 올레유러핀 | 올리브잎추출물의 **혈압 조절 기능성이 통째로 누락** (바나바잎 것만 렌더) |
| 채움콜라겐 · 에버콜라겐 타임비오틴 셀 | 콜라겐만 렌더되고 **비오틴·비타민C·아연·셀레늄 기능성 누락** |
| 관절엔 MSM2000 | 2원료만 렌더, **비타민D·아연 누락** |

### 5-2. 적용 계약 (보수적)

```
SAFE 조건: 전 절이 라벨된 원료 그룹에 귀속(고아 절 0) · 경계 단일 확정
          · 전 절 원문 verbatim · (영문) 절은 KO 에서 제외 · 현재 canonical 대비 누락 재현
구조    : 단일 원료 = sd-why / 다원료 = sd-func (직전 WO 로 CSS 지원 완료)
범위    : 기능성 블록만 교체, 블록 외 byte 동일
```

| 항목 | 값 |
|---|---|
| 수정 제품 | **40** |
| **복원 기능성 절** | **146** |
| 영문 절 제외 | 정상 동작 (KO 에 영문 0) |

---

## 6. Track B — 5건 생산

`MAIN_FNCTN` && `SRV_USE` 를 모두 보유하고 permit 로 기존 master 가 0건인 5건에 대해 수행했다.

| 작업 | 건수 |
|---|---|
| ProductMaster 신규 생성 | **5** |
| candidate 링크 (`approved_new_master`) | **5** |
| STORE/ko canonical 신규 생성 | **5** |

생성 계약: `regulatory_type='건강기능식품'` · `mfds_permit_number=STTEMNT_NO` · `barcode NULL` · `is_mfds_verified=true` · tags 에 WO 표식. canonical 은 driver 계약 구조(주요 기능성 / 섭취량 및 섭취방법 / 섭취 시 참고사항 / 확인 가능한 기준·규격 / 매장 전문가 문의)를 재사용했고 `이런 분께`·구매 CTA·영문은 생성하지 않았다.

---

## 7. 작업 중 교정한 파서 결함 3건 (기록)

표본 검토에서 발견해 **적용 전에** 모두 교정했다.

| 결함 | 증상 | 교정 |
|---|---|---|
| 숫자 괄호 마커 미제거 | `(1)` `(2)` 형태가 렌더 항목에 그대로 노출 | `MARK` 에 `\(\s*\d+\s*\)` 추가 |
| 이중 마커 | `(국문) 1) 피부 보습…` 에서 `1)` 잔존 | `cleanClause` 로 **더 이상 없을 때까지 반복 제거** |
| 원문 손상 통과 | `1) 배변활동 원활1) 배변활동 원활` → `배변활동 원활1) 배변활동 원활` 생성 | 절 내부 마커·절 간 부분문자열 중복 가드 추가 → `FINAL_HOLD_SOURCE_CONFLICT` 9건 분리 |

교정 후 SAFE 40건 전량 정밀 검사: 마커 잔존 **0** · 내부 마커 **0** · 영문 혼입 **0** · 빈 절 **0**.

---

## 8. 렌더 검증

**래퍼 증명**: `.sd-card` max-width 래퍼 없이 `none` → 래퍼 적용 **`860px`** (`cssActuallyApplied: true`).

| 검사 (45문서 × 430/820/1280 = **135 렌더**) | 결과 |
|---|---|
| 페이지/요소 overflow · 클리핑 | **0 / 0 / 0** |
| 빈 `h2`·`ul`·`li` | **0** |
| 미정의 class | **0** |
| 전문가 안내 누락 | **0** |
| raw HTML 노출 | **0** |
| 열거 마커 노출 | **0** |
| 영문 노출 (KO 문서) | **0** |
| 기능성 섹션 부재 | **0** |
| 판정 | **PASS** |

---

## 9. Apply (LIVE)

이중 게이트(`--apply` + `HFF_523_APPLY_CONFIRM=YES`) · **단일 트랜잭션**.

Track A UPDATE 는 DB 측 `encode(sha256(convert_to(content,'UTF8')),'hex') = oldContentHash` 낙관적 잠금을 사용했다.

| 작업 | expected | actual |
|---|---|---|
| Track A canonical UPDATE | 40 | **40** |
| ProductMaster 생성 | 5 | **5** |
| candidate 링크 | 5 | **5** |
| STORE/ko canonical 생성 | 5 | **5** |

| 전역 | BEFORE | AFTER |
|---|---|---|
| SPD 총수 | 120,118 | **120,123** (+5) |
| KO canonical | 40,913 | **40,918** (+5) |
| HFF ProductMaster | 40,943 | **40,948** (+5) |

트랜잭션 내 사후검증(canonical 유일성 · SPD/PM 델타 정확) 통과 후 COMMIT. rollback 없음.

---

## 10. 독립검증 (별도 read-only 세션)

| 검사 | 결과 |
|---|---|
| Track A new hash 일치 | **40 / 40** |
| Track A old hash 잔존 | **0** |
| Track A 절 누락 | **0** |
| Track B 링크 유효 | **5 / 5** |
| Track B canonical 생성 | **5 / 5** |
| Track B permit 보유 / 중복 | 5 / **0** |
| canonicalDup | **0** |
| **EN 문서 변경** | **0** |
| 대상 밖 변경 | **0** |
| expected vs actual | **전 항목 일치** |
| 상태 합계 | **523** ✅ |
| 판정 | **PASS** |

---

## 11. 최종 미해결 큐 (삭제 없음)

```
apps/api-server/src/scripts/data/hff-ko-final-unresolved-v1.jsonl        (476행)
apps/api-server/src/scripts/data/hff-ko-final-unresolved-summary-v1.json
```

각 행에 `officialEvidenceChecked` · `missingRequirement` · `requiredNextAction` · `retryCondition` 을 남겼다.

| 사유 | 건수 | 재처리 조건 |
|---|---|---|
| `FINAL_HOLD_OFFICIAL_SOURCE_MISSING` | **343** | 식약처 공식 원천에 `SRV_USE`(314) / `MAIN_FNCTN`(29) 이 추가 공개되면 재처리 |
| `FINAL_HOLD_BOUNDARY_AMBIGUOUS` | **124** | 사람이 기능성 절 경계·원료 귀속을 확정하면 재처리 |
| `FINAL_HOLD_SOURCE_CONFLICT` | **9** | 공식 원천 손상(마커 혼입·문장 이어붙임)이 정정되면 재처리 |

candidate·ProductMaster·canonical·manifest 중 삭제한 것은 **없다**.

---

## 12. 산출물

```
hff-ko-final-hold-523-population-v1.json
hff-ko-final-hold-523-decisions-v1.json
hff-ko-final-hold-523-productmaster-resolution-v1.json
hff-ko-final-hold-523-source-repair-v1.json
hff-ko-final-hold-523-safe-targets-v1.json
hff-ko-final-hold-523-rollback-v1.json
hff-ko-final-hold-523-render-audit-v1.json
hff-ko-final-hold-523-apply-results-v1.json
hff-ko-final-hold-523-independent-verification-v1.json
hff-ko-final-unresolved-v1.jsonl
hff-ko-final-unresolved-summary-v1.json
```

+ HFF 전용 script 6개 · 본 CHECK. 임시 파일 전량 삭제.

**rollback**: Track A = `newBlock → oldBlock` 치환 후 `oldContentHash` 대조. Track B = 생성된 SPD 5 · ProductMaster 5 삭제 + candidate 링크 해제(ID 는 rollback manifest 의 `createdIds` 에 기록).

---

## 13. 번역 대상 불변 확인

| 항목 | 상태 |
|---|---|
| EN 문서 변경 | **0** |
| EN 기능성 HOLD 824 | **미접촉** |
| EN 짝 없는 KO 25,415 | **미접촉** |
| KO→EN 번역·영문 디자인 | **미수행** |

---

## 14. 다음에 크게 묶을 작업

| 항목 | 규모 | 성격 |
|---|---|---|
| 기능성 경계·귀속 사람 확정 | **124** | 원문에 원료 라벨이 없는 96건이 주류 — 공식 표시사항 대조 필요 |
| 공식 원천 결측 | **343** | **플랫폼 내부 작업으로 해결 불가** — 식약처 원천 갱신 대기 |
| 원문 손상 정정 | **9** | 원천 ETL/공개 데이터 품질 이슈 |
| EN 계약 정합 | 8,716 + 824 | 별도 번역 트랙 |

> **343건은 재시도해도 동일 결과다.** raw 전수 대조로 원천 부재가 확증됐으므로, 원천이 갱신되기 전까지 이 집합을 다시 판정하는 WO 는 비용만 발생한다. `retryCondition` 충족 시에만 재개할 것.

## 15. 함정 기록

1. **"미연결 = 매칭 실패" 가 아니다** — Track B 348 은 permit 에 해당하는 master 가 **아예 없어서** 미연결이었다. 매칭 로직을 개선해도 0건이며, 생성만이 경로다.
2. **결측 필드는 원천에서 먼저 확인할 것** — DB 만 보면 ETL 손실로 오인한다. raw 44,885행 대조로 원천 부재가 확인됐다.
3. **마커 제거는 반복 적용** — `(국문) 1) …` 처럼 마커가 중첩되면 1회 제거로는 남는다.
4. **`(1)` 형태 숫자 괄호 마커**를 정규식에 포함할 것 — 누락 시 렌더 항목에 그대로 노출된다.
5. **원문 손상 가드 필요** — 절 내부 열거 마커, 절 간 부분문자열 중복은 원천 이어붙임 손상 신호다. 통과시키면 깨진 문장이 생산된다.
6. 다원료 라벨 구조는 `sd-func` 를 쓴다 — 직전 WO 의 CSS 지원이 선행됐기에 이번에 사용 가능했다.

---

*작성: 2026-07-31*
