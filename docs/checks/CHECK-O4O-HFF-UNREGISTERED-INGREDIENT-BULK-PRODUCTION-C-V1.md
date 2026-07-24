# CHECK-O4O-HFF-UNREGISTERED-INGREDIENT-BULK-PRODUCTION-C-V1

> WO: **WO-O4O-HFF-UNREGISTERED-INGREDIENT-BULK-PRODUCTION-C-V1** (에이전트 다 / Agent C)
> 대상: **공식 원문에 원료가 명확히 선언되어 있으나 registry 미등록이라 생산되지 못한 후보** × shard `stableHash(STTEMNT_NO) % 3 = 2`
> 상태: **CLOSED — 안전 후보 소진** · 신규 LIVE **109** · DB write **436** · 독립검증 PASS

---

## 1. 문제 — «원료가 없어서»가 아니라 «registry 에 없어서»

선행 WO(`NO_FUNCTIONAL_KEY-BULK-PRODUCTION-C-V1`) 종료 후에도 shard 2 에는 규격 라벨이 해소되지 않아
생산 불가 상태인 제품이 다수 남아 있었다. READ-ONLY census(`hff-uir-c-census.ts`)로 원인을 원문 근거로 확정했다.

- shard 2 미승격·비액상 **7,131 제품** 중 **2,253 제품**이 미해소 라벨을 보유, **581 종**의 미등록 라벨.
- 이 중 «그 라벨 하나만 미해소 + 다른 해소 키 0» 인 **sole 라벨**이 곧 «그 제품의 유일 원료 후보»다.
  실측 상위: `조단백질 53` · `칼륨 24` · `크레아틴 모노하이드레이트 21` · `프로바이오틱스(단독) 17` ·
  `총 안토시아노사이드 9` · `안트라퀴논계화합물(무수바바로인으로서) 9` · `철(단독) 7`.

즉 공식 `BASE_STANDARD` 에 표시량 규격으로 선언된 실재 기능성 원료인데 공용 registry 가 그 라벨을 모르는 상태였다.
**제품명·브랜드명 추정은 판정에 일절 사용하지 않았다.**

## 2. 해결 — C 전용 additive mapping (공용 파일 무편집)

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/scripts/hff-uir-c-census.ts` | READ-ONLY 미등록 라벨 census — 모든 mapping 결정의 원문 근거 |
| `apps/api-server/src/scripts/hff-uir-c-registry.ts` | 미등록 원료 라벨→key · 원료 메타 · **공식 기능성 집합** · KO 추출기 확장 · EN 정본 |
| `apps/api-server/src/scripts/hff-uir-c-build.ts` | C 소유 빌드(DB write 0). 게이트 전량 통과분만 apply 대상 산출 |

### 2-1. 귀속 계약 — 직전 WO 계약 승계 + lane 분리

1. `BASE_STANDARD` **규격 항목 전수 열거**. 각 라벨은 비기능 한도시험 / 공용 `classify()` / 공용 `SF_INGREDIENTS` /
   C 전용 `NFK_LABELS` / C 전용 `UIR_LABELS` 중 하나로 **반드시 해소**. 하나라도 미해소면 `UNKNOWN_SPEC_LABEL` HOLD.
   → «선언됐는데 못 본 원료»가 구조적으로 불가능하고, 그 위에서 «기능성 키 정확히 1종» 규칙이 성립한다.
2. **lane 한정** — 라벨 중 최소 1개가 `UIR_LABELS` 로만 해소되는 제품만 본 WO 가 담당(`notUirLane` 1,360 은 기존 lane 소관).
3. **공식 기능성 집합 게이트** — key 에 공식 FN 집합이 있으면 추출된 KO 문장이 **전량** 그 집합에 속해야 한다(밖이면 `FN_NOT_OFFICIAL`).
4. `FN_COVERAGE_INCOMPLETE`(공식 기능성 누락) · `FOREIGN_FN`(타 원료 기능성 혼입) · `GROUNDING_PENDING_EN`(EN 정본 미매핑) 유지.

### 2-2. 추가된 key — 전부 원문 규격 라벨 근거

| key | 원문 근거 라벨 | 근거 성격 |
|---|---|---|
| `단백질` | `조단백질` / `단백질 함량` | 고시형 영양성분(규격은 조단백질 정량) |
| `칼륨` | `칼륨` | 고시형 영양성분 |
| `철` | `철`(원료명 단독 라벨) | 공용 `NUTRIENT_META['철']` 존재하나 라벨 미인식이었음 |
| `크레아틴` | `크레아틴모노하이드레이트` | 고시형 기능성 원료 |
| `알로에전잎` | `안트라퀴논계화합물(무수바바로인으로서)` | MFDS 지표성분(알로에 겔의 겔 다당체와 구분) |
| `빌베리추출물` | `총 안토시아노사이드` | MFDS 지표성분 |
| `프로바이오틱스` | `프로바이오틱스` / `유산균` / `생균` (원료명 단독 표기) | 직전 WO 는 `… 수/함량` 형만 인식 |
| `쏘팔메토열매추출물` | `로르산` | MFDS 지표성분. **§4 최소 보완**에서 추가 |

동일 지표성분을 공유하는 타 원료(예: `총 안토시아노사이드` 를 쓰는 크랜베리 제품)는 **공식 기능성 집합 게이트**에서
전량 HOLD 되므로 오귀속이 발생하지 않는다(크랜베리의 요로 건강 기능성은 빌베리의 공식 집합 밖).

### 2-3. KO 추출기 확장 — «…에 필요» / «구성성분» 형

공용 `extractFunctionsKo` 의 필터는 `도움|개선|유지|억제|완화|증진|보호|보습` 이라 **고시형 영양성분 표시문구**
(«…에 필요», «…의 구성성분» — 단백질·칼륨·철)가 통째로 탈락한다. 공용 파일을 수정하지 않고 C 소유
`extractFunctionsUir()` 에 `필요|구성성분` 을 추가해 **공식 기능성을 하나도 잃지 않도록** 했다.
EN 은 `mapFunctionEnUir → mapFunctionEnNfk → mapFunctionEnC → mapFunctionEn` 순의 정본 매핑만 사용하고,
전 원자를 **완전일치(`^…$`)** 로 고정했다(접두일치는 결합 문장의 뒷 기능성을 조용히 소실시킨다 — 직전 WO 실측 결함).

## 3. 결과

### 배치 1

| 단계 | 값 |
|---|---|
| scanned / inShard | 41,261 / 13,767 |
| 이미 승격 / 액상 제외 | 4,359 / 2,277 |
| UIR lane 외(기존 계약 소관) | 1,360 |
| eligible = target | **106** |

`distKey`: 단백질 46 · 크레아틴 17 · 칼륨 16 · 프로바이오틱스 13 · 알로에 전잎 5 · 철 5 · 빌베리추출물 4

- **dry-run** — candMatch 106(missing 0 / ambiguous 0) · masterDup 0 · expectedWrites 424 ·
  postVerify masters 106 / spdKo 106 / spdEn 106 · canonicalDup 0 · `postVerifyPass true` → ROLLBACK(DB write 0)
- **apply** — 동일 수치 · `"result": "COMMIT 완료"` · **DB write 424**

### 배치 2 — 최소 보완 후

`로르산 → 쏘팔메토열매추출물` 추가(§4) 후 재빌드 → eligible **3**. dry-run PASS → apply · **DB write 12**.
(로르산 제품 대부분은 비타민·아연 등과의 복합형이라 `MULTI_INGREDIENT` 로 정당 HOLD 된다.)

### 배치 3 — 소진 확인

`promoted` 4,465 → **4,468**(= +3, 내 배치가 정확히 승격으로 이동), **eligible 0 / target 0**.
누적 `promoted` 4,359 → 4,468(**+109**). **본 계약하 shard 2 의 미등록 원료 안전 후보는 109 로 소진**되었다.
(WO 는 1,000건 배치를 지시했으나 안전 후보 총량이 109 이므로 배치는 채워지지 않는다.)

### 독립검증 (`hff-nb-c-verify.ts` — 별도 커넥션·별도 쿼리·매니페스트 master ID 기준, READ-ONLY)

```json
{ "b1": { "expect":106, "masters":106, "withPermit":106, "spdKo":106, "spdEn":106,
          "nonCanonical":0, "badSourceType":0, "noSourceRef":0, "emptyBody":0,
          "candLinked":106, "canonicalDup":0, "stmtDupMasters":0, "independentVerifyPass": true },
  "b2": { "expect":3, "masters":3, "spdKo":3, "spdEn":3, "canonicalDup":0,
          "stmtDupMasters":0, "independentVerifyPass": true } }
```

**기존 LIVE drift 0** — `source_type='o4o_hff_generated'` 이면서 3시간 이전에 생성된 canonical SPD 중
최근 3시간 내 `updated_at` 이 변경된 행 **0건**(본 배치는 신규 insert 전용, 기존 행 무접촉).

## 4. 최소 보완 검토 — WO «같은 원인 100건 이상» 트리거

배치 1 이후 잔여 `UNKNOWN_SPEC_LABEL` 을 라벨 단위로 분해했을 때 **100건 이상은 `로르산` 129 하나뿐**이었다.

- `로르산` 은 **쏘팔메토 열매 추출물의 MFDS 지표성분**이며, 공용 `SF_INGREDIENTS['쏘팔메토열매추출물']` 은
  원료명 라벨(`쏘팔메토|톱야자`)만 인식하고 지표성분 라벨을 몰랐다.
- 원문 실측(400건 표본): 해당 제품군의 공식 기능성은 **«전립선 건강의 유지에 도움을 줄 수 있음»** 로 일관.
  공용 `FUNCTION_MAP` 은 조사 없는 «전립선 건강 유지» 형만 인식하므로 원문 표기를 EN 정본에 직접 매핑했다(의미 동일 보존).

그 다음 빈도는 `계피산 67`(프로폴리스) · `시트리닌 48`·`모나콜린 K 40/31`(홍국) · `로사빈 47` · `소포리코사이드 46`
등으로 **단일 원인 100건 미만**이라 WO 기준상 보완 트리거 미충족 → 기록만 남긴다.

## 5. HOLD 상위 원인 (최종 기준, shard 2 전체 funnel)

| 원인 | 건수 | 성격 |
|---|---:|---|
| `MULTI_INGREDIENT` | 3,568 | 복합형 — 단일 귀속 앵커 부적용(정당) |
| `UNKNOWN_SPEC_LABEL` | 1,317 | 규격 라벨 미해소 → 성분 집합 불완전 가능 → 정당 HOLD |
| `NO_FUNCTIONAL_KEY` | 718 | 규격에 기능성 원료 선언 자체가 없음 |
| `GUARD_REVIEW` / `GUARD_BLOCKED` | 16 / 2 | Guard 정당 차단 |
| `FN_NOT_OFFICIAL` | 16 | 우리 키의 공식 기능성 집합 밖 문장 존재(예: 크랜베리) |
| `COMPOSE_SERVING_PARSE_FAILED` | 10 | 공용 composer 섭취량 파싱 계약 밖 |
| `FN_COVERAGE_INCOMPLETE` / `GROUNDING_PENDING_EN` | 7 / 7 | 공식 기능성 누락 우려 · EN 정본 미매핑(임의 영문 생성 0) |
| `NO_FUNCTION` | 1 | 개별 HOLD |

## 6. 품질 — 콘텐츠 불변 원칙 준수

- KO 기능성은 공식 `MAIN_FNCTN` 원문 그대로. **삭제·순화·완화 0** (오히려 «…에 필요» 형 누락을 복구).
- 원문 밖 치료·예방 주장 추가 0. 제품명·브랜드 기반 원료·기능성 추정 0.
- EN 은 정본 매핑만 사용, 한 원자라도 미매핑이면 전량 HOLD.
- 전문가 상담 안내 footer 유지. SPD canonical 유일성 `(master_id, description_type, COALESCE(language,'ko'))` 위반 0.

## 7. 산출물

| 경로 | 내용 |
|---|---|
| `apps/api-server/src/scripts/hff-uir-c-census.ts` | READ-ONLY 미등록 라벨 census |
| `apps/api-server/src/scripts/hff-uir-c-registry.ts` | 미등록 원료 additive mapping · 공식 FN 집합 · KO 추출 확장 · EN 정본 |
| `apps/api-server/src/scripts/hff-uir-c-build.ts` | C 소유 빌드(DB write 0) |
| `apps/api-server/docs/checks/data/product-description-guard/hff-uir-c/{census,b1,b2,b3,manifests}` | target · pool · hold · selfcheck · rollback manifest |

공용 파일(`hff-source-parse` · `hff-sf-registry` · `hff-nutrient-registry` · `hff-sf-compose` ·
`hff-sf-c-en-overlay` · `hff-nfk-c-registry` · `hff-sf-apply` · `content-guard`) **편집 0**.
