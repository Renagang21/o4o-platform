# CHECK-O4O-OTC-NEXT-POOL-RECLASSIFY-AND-CLAIM-CONTRACT-NA-V1 — 후보 재분류·claim 계약 (에이전트 나)

WO: `WO-O4O-OTC-NEXT-POOL-RECLASSIFY-AND-CLAIM-CONTRACT-NA-V1` · 일자: 2026-07-22 · 상태: **완료 — read-only, DB write 0, runner/registry 미수정**
채널: Cloud SQL Auth Proxy(127.0.0.1:5442) → production `o4o_platform` · **SELECT only**. 감사 스크립트 `otc-track-a-completion-inventory-and-queue.ts`(AUTHORED_SOURCES 에 `mfds_drug_otc_nutrition_combo` 반영, WO §2) + 직접 SQL 교차.

---

## 0. 결론

> **Track A(grounded-upgrade, easy→mfds_drug_otc) = 48 그룹 / 704 master · ko/en 완결(en 결손 0)** — 단일성분 grounded-upgrade 풀 **소진**(신규 READY_TRACK_A ≈ 0). **차기 대량 생산 풀 = NUTRITION_COMBO_EN_ONLY = 16 그룹 / 1,915 master(ko 완료·en 전량 결손)**. 가/다 claim 12그룹은 전량 완료(충돌 0). 비오틴은 split(nutrition_combo 8 + easy-canonical 8, fp 재계산 divergence)로 HOLD, 펙소페나딘은 부분 승격(잔여 easy는 fp 불일치)로 HOLD. **10시간 생산은 nutrition_combo EN-only 로 물량상 가능하나, 신규 EN-only 경로(fresh 번역·`mfds_drug_otc_nutrition_combo` sourceType·복합제 콘텐츠 정책) 확립을 전제**로 한다. grounded-upgrade 로는 10시간 물량 불가(소진).

---

## 1. 완료 그룹 재집계 (production 정본)

| 축 | 그룹 | master | ko canonical | en canonical | en 결손 |
|---|---:|---:|---:|---:|---:|
| **Track A grounded-upgrade** (easy→`mfds_drug_otc`, canonical_replaced audit) | **48** | **704** | 704 | 704 | **0** |
| `mfds_drug_otc` authored 전체(herbal 299·bulk 포함) | — | 1,976 | 1,976 | 1,976 | 0 |
| **`mfds_drug_otc_nutrition_combo`** | **16** | **1,915** | 1,915 | **0** | **1,915** |
| canonical duplicate(전역) | — | 0 | — | — | — |

- Track A 완료 48그룹 ≥ WO 예상 41그룹. en 결손 0(전 그룹 ko+en). audit `canonical_replaced` newSource=`mfds_drug_otc` = 704 master(1행/master 정합).
- **nutrition_combo 16그룹 전량 en 결손** = 차기 생산 핵심 백로그. 각 그룹 ko 지문 균일(md5 kinds=1).

---

## 2. 상태별 재분류 (WO §3 taxonomy)

| 상태 | 그룹 | master | 근거 |
|---|---:|---:|---|
| **COMPLETED** | 48+ | 704(+herbal/bulk) | Track A grounded-upgrade ko+en 완결. 가/다 claim 12 전량 포함 |
| **NUTRITION_COMBO_EN_ONLY** | **16** | **1,915** | ko authored(`mfds_drug_otc_nutrition_combo`) 완료·en 0. §5 목록 |
| **KO_COMPLETE_EN_MISSING** (mfds_drug_otc) | ~0 | ~0 | `mfds_drug_otc` ko 1,976 == en 1,976 → 결손 없음(스냅샷) |
| **READY_TRACK_A** | **~0** | ~0 | bridge `authored그대로확장` 단일성분 풀 소진. 유일 잔여 후보 비오틴은 split→HOLD |
| **HOLD_FINGERPRINT** | 소수 | — | 펙소페나딘 120mg(authored 34+easy 29 잔여)·60mg(14+easy 45) 등 부분 승격 잔여 easy가 target fp 밖 |
| **HOLD_BRIDGE_MISMATCH** | 1 | 8 | 비오틴 5mg 정: nutrition_combo authored 8 + easy-canonical 8 동일 fp. coarse(canonical-or-deprecated) 재계산 divergence(excluded 11≠5). 소스 정책 결정 필요 |
| **HOLD_HERBAL** | — | — | 은행엽/포도엽 등 herbal 은 이미 완료(COMPLETED). herbal ETL 갭 그룹은 원천 부재로 미생산 |
| **HOLD_SENSITIVE** | 1 | — | 민감 약효군(bridge SSOT 정규식) |
| **HOLD_NON_ORAL** | 대량 | 2,619 | bridge `비경구별도트랙` 전량 |
| **HOLD_SOURCE** | 대량 | 3,075 | `새설명서필요` 2,882 + `검토후확장` 193 (grounded authored 부재) |
| (참고) HOLD_MULTI_INGREDIENT (atc-keyed) | 74 | — | coarse (ingredient) 파이프라인 부적합 |
| (참고) SAFETY_MISMATCH (bridge `안전지문불일치`) | 410 | — | 안전지문 불일치 |

> bridge 전체 6,261 fp-entry 기준. `authored그대로확장` ingredient-keyed 83 = COMPLETED 76 + HOLD_SOURCE 4 + HOLD_SENSITIVE 1 + SAFETY_MISMATCH 1 + (biotin READY→HOLD 재분류) 1.

---

## 3. 비오틴·펙소페나딘·은행엽 (WO §4 명시)

| 그룹 | 상태 | 상세 |
|---|---|---|
| **비오틴 5mg 정** | **HOLD_BRIDGE_MISMATCH** | 8 master 이미 `mfds_drug_otc_nutrition_combo` authored ko canonical(source_ref `79a515f0`, easy deprecated)·en 0. 별도 8 master 는 easy-canonical(fp 458af310) 잔존. 그룹이 두 소스로 split → grounded-upgrade(`mfds_drug_otc`) 강행 시 소스 불일치. **자동 생산 금지**, 소스 정책 결정 후 EN-only(combo) 처리 |
| **펙소페나딘염산염** | **HOLD_FINGERPRINT** | 120mg: authored 34(ko+en 완료) + easy canonical 29 잔여. 60mg: authored 14(완료) + easy 45 잔여. 잔여 easy 는 target fp 밖(다른 지문) → 별도 fp 그룹·검토 필요. 부분 승격 상태 |
| **은행엽건조엑스 80mg 정** | **COMPLETED** | authored ko 209 · en 209 완료(가 claim). 이전 우려한 out-of-scope 203 포함 전량 완결 |

---

## 4. claim 현황 (외부 config = 현행 claim SSOT)

| config | owner | claim 그룹 | 상태 |
|---|---|---|---|
| `...-3h-da.config.json` | 다 | 시트룰린500·독시라민25·로페라미드2·이부프로펜200정 | 4/4 완료 |
| `...-3h-ga.config.json` | 가 | 은행엽80·세티리진10연질·포도엽180·탄산수소나트륨500 | 4/4 완료 |
| `...-3h-ga-r.config.json` | 가 | L-시스틴500·디펜히드라민50·이부프로펜400연질·플루벤다졸500 | 4/4 완료 |
| `...-3h-na.config.json` | 나 | 비오틴5(중단) | 미실행(HOLD) |

→ 가/다 claim 12그룹 전량 authored ko==en(완료). **claim 충돌 0**.

---

## 5. 즉시 생산 가능 후보 = NUTRITION_COMBO_EN_ONLY 16그룹 (WO §5)

> grounded-upgrade 단일성분은 소진(신규 0). 아래 16그룹(1,915 master)이 유일한 대량 생산 풀. **전량 EN-only**(ko 완료·en 0, sourceType `mfds_drug_otc_nutrition_combo`, ko 지문 그룹 내 균일). sibling en 부재 → **fresh 번역**(ko canonical 충실 번역·GUIDE/GLOSSARY/TEST-LOG·fact-0).

| # | source_ref | master | 대표명 | op |
|---:|---|---:|---|---|
| 1 | `d29b1340` | 585 | 진셀몬큐디플러스연질캡슐 | EN_ONLY |
| 2 | `26c2af33` | 331 | 센트본정 | EN_ONLY |
| 3 | `2bb82579` | 317 | 디카맥스500츄어블정 | EN_ONLY |
| 4 | `b21c54a6` | 208 | 비타콤보씨플러스정 | EN_ONLY |
| 5 | `029b8650` | 169 | 셀타골드에스연질캡슐 | EN_ONLY |
| 6 | `b96f3977` | 138 | 티티아민정 | EN_ONLY |
| 7 | `db7c085e` | 60 | 레날비타정 | EN_ONLY |
| 8 | `6f143bbc` | 25 | 파비스비타민씨정 | EN_ONLY |
| 9 | `270a10a2` | 21 | 눈모아연질캡슐 | EN_ONLY |
| 10 | `6343c0f5` | 18 | 하노백연질캡슐1000IU(비타민E) | EN_ONLY |
| 11 | `91d2a67d` | 16 | 마그신정 | EN_ONLY |
| 12 | `79a515f0` | 8 | 비오딜정5mg(비오틴) | EN_ONLY |
| 13 | `03751234` | 7 | 유니온비타민E연질캡슐 | EN_ONLY |
| 14 | `5a342fe9` | 5 | 셀레트론플러스연질캡슐 | EN_ONLY |
| 15 | `fcf616ee` | 4 | 벤포벨브이정 | EN_ONLY |
| 16 | `cda011db` | 3 | 지오로사연질캡슐100mg(토코페롤) | EN_ONLY |
| — | **합계** | **1,915** | | |

> 16그룹(<20)이지만 master 1,915 = 대량. "20그룹 이상" 은 단일성분 grounded 풀 소진으로 불가 — 대신 combo EN-only master 물량으로 대체.
> ⚠️ **정책 선결**: nutrition_combo 는 멀티비타민·복합제. EN 소비자 콘텐츠 정책(HFF 규칙 겹침·복합 성분 표기)·`mfds_drug_otc_nutrition_combo` EN persist 경로가 **미확립**. 대량 착수 전 별도 EN-only 설계 WO 필요.

---

## 6. EN-only 후보 목록 (요약)

- **NUTRITION_COMBO_EN_ONLY**: §5 의 16그룹 / 1,915 master (전량).
- **mfds_drug_otc KO_COMPLETE_EN_MISSING**: 스냅샷 0 (1,976==1,976). 단, 가/다 mid-flight 그룹이 순간적으로 ko-only 일 수 있으므로 claim/fetch 후 재확인.

---

## 7. HOLD 목록·사유 (요약)

| HOLD | 규모 | 사유 |
|---|---|---|
| HOLD_NON_ORAL | 2,619 | 비경구 — 별도 트랙 |
| HOLD_SOURCE | 3,075 | grounded authored 부재(새설명서필요·검토후확장) |
| SAFETY_MISMATCH | 410 | 안전지문 불일치 |
| HOLD_MULTI_INGREDIENT | 74 | atc-keyed 복합, coarse(ingredient) 부적합 |
| HOLD_FINGERPRINT | 소수 | 펙소페나딘 등 부분 승격 잔여 easy(fp 밖) |
| HOLD_BRIDGE_MISMATCH | 1(8m) | 비오틴 split(combo+easy) |
| HOLD_SENSITIVE | 1 | 민감 약효군 |
| HOLD_HERBAL | — | 원천 부재 ETL 갭(완료분 제외) |

---

## 8. claim 파일 형식·충돌 해결 규칙 (WO §6-7)

### 8-1. claim 파일 형식

- 파일: `apps/api-server/src/scripts/data/otc-production-claim.<agent>.json` (agent ∈ `ga|da|na`). 템플릿 = `otc-production-claim.template.json`(본 커밋 동봉).
- 각 에이전트는 **자기 claim 파일 1개만** 소유·수정·commit(path-specific). 타 에이전트 claim 파일 미접촉.
- claim 항목: `{ groupKey, sourceRef, sourceType, track, masters, op(EN_ONLY|KO_EN), status }`.
- 선점 시각 SSOT = **commit 타임스탬프**(파일 내 시각 미기재 → 결정론). `git log` 로 확인.

### 8-2. selection → claim → 교집합 재확인 절차 (필수 순서)

```text
1. selection : 후보 풀(§5)에서 미claim 그룹 선택 (자기 claim + 타 config/claim 파일 제외)
2. claim     : 자기 claim 파일에 sourceRef 추가
3. commit    : git commit -- <자기 claim 파일>  (path-specific)
4. push      : git push origin main
5. fetch     : git fetch origin  →  모든 *claim*.json / *config*.json 재로드
6. 교집합    : 자기 claim ∩ (타 에이전트 claim ∪ config) 계산
   - 교집합 0  → 생산 착수(ko/en apply)
   - 교집합 ≠0 → 충돌 해결(8-3) 후 5 재실행
```

### 8-3. 충돌 해결 규칙 (deterministic)

- 동일 sourceRef 를 2+ 에이전트가 claim 시 **먼저 commit 된 쪽이 소유**(git commit 타임스탬프 오름차순, 동률 시 commit SHA 사전순). 후順 에이전트는 자기 claim 에서 해당 sourceRef **제거·재commit** 후 다른 후보 선택.
- **runner 이중 no-op 가드가 최종 안전판**: 설령 교집합을 놓쳐도 bundle/en-complete 는 `ALREADY_*` 로 write 0(이중쓰기 구조적 차단). claim 은 *중복 노동* 방지용이며 데이터 안전은 runner 가드가 보장.
- production write 는 **claim push+fetch+교집합 0 확인 이후에만**.

---

## 9. 10시간 생산 가능 여부 (WO 보고)

| 경로 | 물량 | 10h 가능? | 조건 |
|---|---|---|---|
| grounded-upgrade 단일성분 | ~0 | ❌ | 풀 소진 |
| **nutrition_combo EN-only** | 1,915 master / 16그룹 | ⚠️ **조건부 YES** | 신규 EN-only 경로(fresh 번역·`mfds_drug_otc_nutrition_combo` persist·복합제 콘텐츠 정책) 확립 선행 |
| mfds_drug_otc EN 결손 | ~0 | ❌ | 결손 없음 |

> **결론**: 물량상 10시간 생산은 nutrition_combo EN-only(1,915)로 가능. 단 현행 byte-identical grounded-upgrade 툴체인으로는 부적합 — **복합제 EN-only fresh 번역 트랙(설계 WO)** 이 선결 조건. 그 전까지 즉시 착수 가능한 안전 grounded-upgrade 물량은 없음.

---

## 10. 준수 / 산출물

- **read-only · production DB write 0 · runner 로직 수정 0 · 공용 registry 수정 0 · 실제 apply 0.**
- 수정: 자기 소유 감사 스크립트 `otc-track-a-completion-inventory-and-queue.ts` AUTHORED_SOURCES 에 `mfds_drug_otc_nutrition_combo` 추가(WO §2, 내 파일).
- 산출: 본 CHECK · `otc-production-claim.template.json`(claim 계약 템플릿) · 감사 스크립트 1줄.
- 미푸시 자기 산출물 0(path-specific commit·push).

> read-only 재분류·계약 확정. 실제 생산은 claim 계약 + nutrition_combo EN-only 설계 후 별도 WO.
