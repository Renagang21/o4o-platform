# WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1

e약은요 기반으로 새로 확정된 KO STORE canonical **19,363건**을 유일한 기준본으로 삼아
영어 STORE 설명서를 전량 재생산하고, 독립검증 통과 후 canonical 로 공개한다.

- 발행: 2026-08-06
- 선행 완료: [`WO-O4O-EASY-DRUG-KO-FULL-REBUILD-BROWSER-SMOKE-V1`](../checks/WO-O4O-EASY-DRUG-KO-FULL-REBUILD-BROWSER-SMOKE-V1-CHECK.md) — KO 브라우저 검증 PASS (커밋 `873ac46e6` · `dc97a5d0c` · `1d92ca9c7`)
- 상태: **핸드오프** (본 문서는 요청서이며, 실행은 별도 지시로 착수)

---

## 1. 목표

e약은요 기반으로 새로 확정된 KO STORE canonical 19,363건을 유일한 기준본으로 삼아
영어 STORE 설명서를 전량 재생산하고, 독립검증 통과 후 canonical 로 공개한다.

## 2. 기준

- 번역 모집단: KO 정상 canonical 19,363
- HOLD 144 제외
- 기존 hidden EN 은 번역 입력으로 사용하지 않음
- 기존 EN 은 용어 참고 · diff · 검증에만 사용
- 신규 KO `generatedContentHash` 와 `officialSourceHash` 를 기준으로 잠금
- 제품별 자기 KO 만 번역
- 다른 제품 · 성분군 · ATC 기반 공유 금지

## 3. 핵심 원칙

1. KO 정보 전부 보존
2. 효능 · 용법 · 연령 · 1회량 · 횟수 · 간격 · 기간 보존
3. route 동사 정확히 번역
4. 금기 · 부정어 · 경고 강도 보존
5. 이상반응 · 상호작용 · 보관 누락 금지
6. 의료 정보 추가 금지
7. 고정 길이 절단 금지
8. 제품명 · 성분명 · 함량 · 제형 혼입 금지
9. 문장 단위 TM 재사용은 허용하되 제품 귀속과 수치는 별도 검증
10. 기존 hidden EN 을 그대로 canonical 복구하지 않음

## 4. 실행

- 최신 KO 19,363 모집단 재확인
- 번역 단위 추출 및 TM census
- 신규 · 재사용 · 검토 필요 단위 분류
- 전량 파일 생산
- 독립검증
- dry-run 2회
- rollback-test
- master 별 transaction + `FOR UPDATE`
- 기존 hidden EN 과 별도 신규 정상 EN canonical 생성 또는 안전 교체
- post-verify
- 브라우저 대표 스모크
- 멱등 재실행
- CHECK · 정확한 pathspec commit · push

## 5. 완료 조건

- KO 19,363 대비 EN 생산 누락 0 또는 명시적 HOLD
- 수치 · 연령 · 경로 · 부정어 · 경고 강도 손실 0
- 다른 제품 내용 혼입 0
- 기존 오류 EN canonical 복구 0
- 정상 EN 만 공개
- KO · ZH · JA 본문 변경 0
- 독립검증 PASS
- 브라우저 대표 검증 PASS
- 재실행 write 0

---

## 6. 실행 세션이 알아야 할 전제 (선행 트랙에서 확정된 사실)

### 6-1. 모집단 SSOT

- 19,363 의 단일 출처는 `apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/results/apply-result-live.jsonl` (전건 `status:'APPLIED'`).
- `plan-run2.jsonl` 은 **19,507건이며 `HOLD_NO_REPLACEMENT` 144건을 포함**한다. 즉 **§2 의 "HOLD 144 제외" 는 19,363 에 이미 반영된 상태**다 — 여기서 144 를 다시 빼지 말 것.
- 별도로 존재하는 **`MANUAL_REVIEW` HOLD KO 130건**은 위 144 와 다른 집합이다. 두 숫자를 합산하거나 혼동하지 말 것.

### 6-2. canonical 유일성

- SPD canonical 유일 키는 `(master, resourceType, descriptionType, COALESCE(language,'ko'))` 다. EN 은 언어별로 유일하므로 기존 EN 행이 남아 있으면 **409 계열 충돌**이 난다. "신규 생성" 과 "안전 교체" 중 어느 쪽인지 dry-run 단계에서 먼저 확정할 것.

### 6-3. 공개 노출 계약 lockstep (중요)

- KO 검증 스크립트 [`h1-audit-api.mjs`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/h1-audit-api.mjs) 는 공개 랜딩 응답의 `languages` 가 **정확히 `['ko']`** 가 아니면 `LANGUAGE_EXPOSURE_DEFECT` 로 판정한다.
- EN 을 공개하는 순간 이 단정은 거짓이 된다. **EN 공개와 같은 커밋에서 이 판정식을 `['en','ko']` 기준으로 갱신**하지 않으면 이후 회귀검증이 전건 실패한다.

### 6-4. 재사용 가능한 검증 자산

- 브라우저 대표 스모크: [`select-browser-smoke.mjs`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/select-browser-smoke.mjs) · [`run-browser-smoke.mjs`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/run-browser-smoke.mjs)
- 공개 API 전수 감사: `h1-audit-api.mjs` (인증은 **localStorage Bearer `o4o_accessToken`** — 쿠키 `credentials:'include'` 만으로는 401)
- API 진입점은 `https://api.neture.co.kr` 이고, `neture.co.kr` 은 정적 SPA 호스팅이라 `/api` 를 서빙하지 않는다.
- 공개 경로: `https://neture.co.kr/p/{public_key}`

### 6-5. 운영 제약

- `product_masters` 의 제품명 컬럼은 **`name`** (`product_name` 아님).
- 프로덕션 DB 는 read-only 검증만 무확인 진행 가능. **UPDATE/DELETE/INSERT 는 사용자 승인 필요**이며, DB write owner 세션은 하나만 유지한다.
- 자격증명은 환경변수로만 사용하고 로그 · 산출물 · 커밋에 남기지 않는다.
- 커밋은 반드시 `git commit -- <정확한 파일 목록>` path-specific. 타 세션 WIP 미접촉, `git add .` 금지, amend · rebase · force-push 금지.

---

## 7. 단일제 · 복합제 처리 규칙 (2026-08-06 추가 지시)

**복합제를 별도 공통 설명서로 만들지 않는다.** KO canonical 은 이미 제품별 e약은요 기준으로 확정됐고,
단일제 · 복합제 · 외용제 · 점안제 모두 **생산 단위는 master** 로 동일하다. 복합제만 다른 것은 **검증 규칙**이다.

복합제에 추가로 강화하는 검증:

- 모든 성분 존재
- 성분별 함량 1:1 보존
- 성분 순서 보존
- 단일제 / 복합제 혼동 0
- 다른 조합 제품 혼입 0

TM 재사용은 문장 번역 최적화일 뿐, 복합제 설명서를 여러 제품에 공유하는 근거로 쓰지 않는다.

```
제품별 KO canonical
  → 의료 본문 문장 번역
  → 제품별 고정 정보 결합
  → 성분·함량·수치 독립검증
  → master별 EN canonical
```

### 7-1. 성분 grounding 실측 — 외부 원장 대조는 불가 (`NO_STRUCTURED_INGREDIENT_LEDGER`)

위 5개 규칙을 "성분 원장과 대조" 로 구현할 방법이 **DB · 원천 어디에도 없다.** 실측 근거:

| 확인 대상 | 결과 |
|---|---|
| `product_drug_extensions` 전체 177,413행 | `ingredient_summary` **0** · `active_ingredients` **0** · `strength` **0** · `dosage_form` **0** (채워진 것은 `atc_code` 176,962 뿐) |
| DB 전체 성분 관련 컬럼 (information_schema 전수) | 위 4개가 전부 — 다른 성분 테이블 없음 |
| e약은요 원천 응답 | `efcy · useMethod · atpnWarn · atpn · intrc · se · depositMethod` 7개 섹션 + `itemName · entpName`. **성분 필드 없음** |
| KO canonical 본문 | FIXED_IDENTITY 필드 = `구분 · 제품명 · 제조·수입사 · 품목기준코드` 4종. 성분 · 함량 · 제형 섹션 없음 |
| 제품명 괄호로 성분 유추 | 2토큰 이상 **4건**뿐 · 1토큰 9,316 · 괄호 없음 10,040 → 복합제 식별자로 사용 불가 |

따라서 기준본은 **KO canonical 자기 자신**이다. 원칙 1(KO 정보 전부 보존) · 6(의료 정보 추가 금지) 과 같은 방향이며,
없는 원장을 지어내지 않는다. 5개 규칙은 KO↔EN 대조로 다음과 같이 실행된다.

| 지시 규칙 | KO↔EN 실행 형태 |
|---|---|
| 모든 성분 존재 | KO 에 등장한 성분 · 제품 식별 토큰이 EN 에 전부 잔존 |
| 성분별 함량 1:1 보존 | KO 수치+단위 multiset 이 EN 에서 가감 없이 보존 |
| 성분 순서 보존 | KO 등장 **순서**가 EN 에서 뒤집히지 않음 (multiset 아닌 배열로 비교) |
| 단일제 / 복합제 혼동 0 | EN 에만 있는 수치 · 성분 토큰 = 0 |
| 다른 조합 제품 혼입 0 | EN 이 자기 KO 이외 문서에서 오지 않음 — master 단위 lineage |

복합제는 보존해야 할 토큰이 많으므로 **이 검사에서 자동으로 더 엄격해진다.** 별도 복합제 분기를 만들지 않고,
master 별 보존 기대치([`combo-census.mjs`](../../apps/api-server/src/scripts/easy-drug-en-full-retranslation/combo-census.mjs) → `results/en-expectations.jsonl`)로 일원화한다.

### 7-2. 산출된 master 별 EN 보존 기대치 (19,360건)

- 수치+단위 토큰 **170,204** (master 당 p50 7 · p95 27 · max 47 · 0건인 master 129)
- 순수 수치 **215,653** (p50 9 · p95 32 · max 78 · 0건인 master 88)
- 섹션 수 분포: 9섹션 9,529 · 8섹션 6,967 · 7섹션 2,415 · 6섹션 314 · 5섹션 135
- FIXED_IDENTITY (제품명 · 제조·수입사 · 품목기준코드 · 구분) 는 번역 대상이 아니라 **그대로 옮기는 값** — TM 경유 금지

---

### 7-3. 5단계 표본 계약 검증 결과 — 수치·경로 판정 규칙 정정 (2026-08-06)

전량 생산기 착수 전, 대표 13 master(투여경로 10종 · 섹션수 5~9 · 수치 3~139)의 EN 본문을 실제로 작성해
독립검증기에 통과시켰다. 초회 결과는 **13건 전건 실패**였고, 세 갈래 모두 번역 결함이 아니라
**검증기 규칙의 과도함**이었음이 실측으로 확인됐다. 규칙을 아래와 같이 정정한다.

| 초회 위반 | 건수 | 실측 원인 | 조치 |
|---|---:|---|---|
| `NUMBER_SEQUENCE` | 12 | 맨숫자 배열 동일성은 **자연스러운 영어로 만족 불가능**. `1일 3회`→"3 times a day", `1회 1정`→"1 tablet per dose" 처럼 한국어 구조적 계수사가 영어 관용구에 흡수되며 `1` 이 소실된다. 맨숫자 순서 일치 1/13, 구조적 `1` 제거 보정 후에도 9 exact + 2 multiset-only + 2 잔여 — 보정 규칙 자체가 결정적이지 않다. | **`STRENGTH_SEQUENCE` 로 대체.** 단위를 동반한 수치 토큰의 순서 배열 동일성으로 판정 → 13/13 exact. 복합제 성분별 함량 1:1 · 순서 보존은 이 토큰 배열이 담보한다. 단위 표기는 정규화(`㎎`=`mg` 등)하고, 단위 뒤 로마자는 단위가 아니다(`IU` vs `diuretics`). |
| `ROUTE_LOST` | 4 | 4건 **전부 문서 전체 substring 오탐** — `내복용`의 `복용`, `바르비탈계`의 `바르`, 오연(誤嚥) 경고의 `복용`, 병용약(메토트렉세이트) 서술의 `투여`. | 판정 범위를 **사용 방법 섹션**(`ROUTE_SECTIONS`)으로 한정. 그 제품 자신의 투여 경로가 적히는 곳은 여기뿐이다 → 오탐 4건 소거. |
| `NEGATION_WEAKENED` | 3 | 사전 누락. "Take care that it does not get into the eyes" 형태의 3인칭 부정을 `NEGATION_EN` 이 담지 못했다. | `does not · did not · is not · are not · cannot · can't` 추가. |

**정정 후 재실행**

- 표본 계약 검증 13/13 pass · `codeTally {}` · dbWrites 0
- 자기검증(300 표본): 프레임 커버리지 pass · 합성 기준선 300/300 pass · 돌연변이 11종 전부 탐지율 100%
- `NUMBER_ADDED` 는 표본에서 0건 — EN 의 모든 수치가 KO 에 존재했다. **원문에 없는 의료 정보 추가**를 잡는 축이므로 완화 없이 유지한다.

원칙 9(수치 보존)의 판정 대상은 이로써 "모든 숫자"가 아니라 **"단위를 동반한 수치의 순서 배열 + EN 전용 수치 0"** 으로 확정한다.

---

## 8. 후속 순서 (본 WO 이후)

1. hidden EN 정리
2. ZH 재번역
3. JA 신규 생산
