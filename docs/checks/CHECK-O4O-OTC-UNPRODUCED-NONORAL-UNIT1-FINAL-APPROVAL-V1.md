# CHECK-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-FINAL-APPROVAL-V1 — 피부·구강·질 70 fp / 443 master 최종 생산 승인

WO: `WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-FINAL-APPROVAL-V1` · 일자: 2026-07-26 · 담당: **드럭 OTC 에이전트 나**
입력: `otc-unproduced-nonoral-approval-proposal-v1.json` (**`05dc50b14`, 미수정**) · census 원기준 `6ca15aa81`
성격: **read-only 승인 확정.** **DB write 0** · 설명서 생성 0 · dry-run 0 · LIVE apply 0 · 러너·어댑터 미수정.

---

## 0. 결론

> **`APPROVED_FOR_PRODUCTION` — 70 fp / 443 master 확정. 필수 게이트 12/12 PASS. 생산 착수 가능.**
>
> | 축 | 결과 |
> |---|---|
> | 최종 | **70 fp / 443 master** (distinct 443) |
> | route | topical 390 · oromucosal 32 · vaginal 21 |
> | DB 전건 재도출 탈락 | **0** (443/443 통과) |
> | 안전지문 mismatch | **0** — proposal fp 와 1:1 재현 |
> | HOLD 혼입 | **0** (HOLD_ROUTE 53 · HOLD_MULTI_ROUTE 2 전량 배제) |
> | 기존 LIVE 교집합 (4방향) | **0 / 0 / 0 / 0** |
> | authored ko / en canonical | **0 / 0** (DB 실측) |
> | 예상 write | KO 1,772 + EN 886 = **2,658T** (기대 일치) |
> | 2회 실행 byte-identical | **PASS** |
> | **DB write** | **0** |

---

## 1. 최종 fp / master · route별 수량 (게이트 1·2·3)

| route | fp | master | 기대 | 판정 |
|---|---:|---:|---:|:---:|
| topical (피부) | 56 | **390** | 390 | ✅ |
| oromucosal (구강) | 7 | **32** | 32 | ✅ |
| vaginal (질) | 7 | **21** | 21 | ✅ |
| **합계** | **70** | **443** | 443 | ✅ |

- master **distinct 443** — 누락 0 · 중복 0 · 탈락(rejected) **0**.
- 제형 6종: 크림 · 연고 · 플라스타 · 트로키 · 껌 · 질정. 전부 일반명코드 접미로 확정(적용부위 미확정 CLQ/CDS/CSI **0**).
- `sourceRef` distinct **70/70** — `uuid(md5("otc-combo-leaflet:"+fp))` 앵커 충돌 0.

## 2. DB 공식 원문 전건 재도출

443 master 전건을 e약은요 STORE ko canonical 원문에서 재도출했다. proposal 을 신뢰하지 않고 **동일 산식으로 다시 계산해 대조**한다.

| 재도출 축 | 방법 |
|---|---|
| 일반명코드 | `product_identifiers.MFDS_CODE` → `product_candidates.raw_payload->>'mfdsCode'` → `->'source'->>'일반명코드(성분명코드)'` |
| 제형·경로 | 접미 3자리 → `SUFFIX_MAP` (**제품명 미사용**) |
| 적용부위 | **용법·용량 원문**에서 `SITE_PATTERNS` 도출. 정확히 1종이 아니면 탈락 |
| 효능 대조 | 효능·효과 부위 ↔ 용법 부위 충돌 시 탈락 |
| 전문용 | `PRO_MARKERS` 5종 + `isNegated` 부정 문맥 + `APPLICATOR` 수술문맥 조건 |
| 10축 안전지문 | indication·dosage·caution·numeric·age·duration·contraindication·codeIngredientStrength·codeForm·route |

**판정 계약은 proposal·라 census·전문용 분리 감사(`3719b8280`)와 동일 산식**이다. 다른 잣대로 재검증하면 검증이 아니라 재판정이 되므로 산식을 바꾸지 않았다.

## 3. 안전지문 검증 (게이트 4)

| 항목 | 결과 |
|---|---:|
| 재도출 safetyFp ≠ proposal fp | **0** |
| 그룹 내 master 집합 불일치 | **0** |
| fingerprint 그룹 분할 | **0** |

443 master 전부 자기 그룹의 10축 안전지문을 **1:1 재현**했다. 그룹 경계가 DB 원문 기준으로 그대로 성립한다.

## 4. HOLD 혼입 여부 (게이트 6·7)

| 배제 대상 | 수 | 혼입 |
|---|---:|:---:|
| HOLD_ROUTE (용법 원문 적용부위 부재) | 53 | **0** |
| HOLD_MULTI_ROUTE (cutaneous+oromucosal 병존) | 2 | **0** |
| 전문용 (PRO_MARKERS) | — | **0** |
| 적용부위 미확정 접미 | — | **0** |
| ophthalmic (Unit 2) | 34 fp / 159 m | **0** (별도 단위) |

승인 대상 443 master 를 proposal HOLD 원장과 대조해 **교집합 0** 을 확인했다.

## 5. 기존 LIVE 교집합 — 4방향 전부 0 (게이트 8·9)

| 방향 | 대상 | 결과 |
|---|---|---:|
| **master** | 외부 적용부위 LIVE 199 · READY_SPLIT LIVE 90 · V2 apply-run · **경구 Unit1/Unit2 SSOT** | **0** |
| **fingerprint** | 동상 | **0** |
| **sourceRef** | 앵커 uuid 대조 | **0** |
| **authored STORE ko canonical** | DB 실측 (`mfds_drug_otc`·`nutrition_combo`·`mfds_drug_otc_nutrition_combo`) | **0** |
| **STORE en canonical** | DB 실측 | **0** |

> LIVE 집합에 **경구 Unit 1·Unit 2 승인 SSOT** 를 포함해 조립했다. 다 세션이 경구 Unit1 KO LIVE(7,400T)를 진행 중이므로, 비경구 대상이 그와 겹치지 않음을 명시적으로 확인한 것이다. 해당 파일들은 **읽기만** 했다.

## 6. 예상 write (게이트 10)

| 항목 | 값 |
|---|---:|
| master당 | KO 4T + EN 2T = 6T |
| KO | **1,772** |
| EN | **886** |
| **총계** | **2,658T** |

WO 기대치와 **정확히 일치**.

## 7. 필수 게이트 12/12

| # | 게이트 | 결과 | 판정 |
|---:|---|---|:---:|
| 1 | 70 fp / 443 master 재현 | 70 / 443 | ✅ |
| 2 | route별 390 / 32 / 21 | 일치 | ✅ |
| 3 | master 누락·중복 0 | 0 / 0 (탈락 0) | ✅ |
| 4 | fp 내부 안전지문 mismatch 0 | 0 | ✅ |
| 5 | 공식 원문 결손 0 | 0 | ✅ |
| 6 | HOLD_ROUTE 53 포함 0 | 0 | ✅ |
| 7 | HOLD_MULTI_ROUTE 2 포함 0 | 0 | ✅ |
| 8 | 기존 LIVE master/fp/sourceRef/canonical 교집합 0 | 0 | ✅ |
| 9 | authored STORE ko/en canonical 0 | 0 / 0 | ✅ |
| 10 | 예상 write 2,658T | 2,658 | ✅ |
| 11 | 2회 실행 byte-identical | SSOT `87b16f66…` · 원장 `94993195…` 동일 | ✅ |
| 12 | DB write 0 | 0 | ✅ |

## 8. 산출물

| 경로 | 성격 |
|---|---|
| `apps/api-server/src/scripts/data/otc-unproduced-nonoral-unit1-approved-ssot-v1.json` | **최종 승인 SSOT** — `status: APPROVED_FOR_PRODUCTION` |
| `apps/api-server/src/scripts/data/otc-unproduced-nonoral-unit1-execution-order-v1.json` | **실행 순서 원장** |
| `apps/api-server/src/scripts/otc-unproduced-nonoral-unit1-ssot-build.na.ts` | 빌더 (read-only, 결정론) |
| 본 CHECK | 기록 |

### 실행 순서 원장 요약

| step | unitId | routes | fp | master | write | 선결 |
|---:|---|---|---:|---:|---:|---|
| 1 | `nonoral-unit-1` | topical·oromucosal·vaginal | 70 | 443 | **2,658** | **승인 즉시 착수 가능** — 러너 route profile 기보유 |
| 2 | `nonoral-unit-2` | ophthalmic | 34 | 159 | 954 | `ophthalmic` RouteProfile 추가(다) · Unit 1 완료·독립검증 GREEN |

- 합계 검증: 70+34 = **104 fp** · 443+159 = **602 master** = 비경구 READY 전량. `G3_sumMatch: true`
- 단위 간 fp·master 교집합 0 · fingerprint 그룹 분할 0.
- **DB write-owner 단일 에이전트 순차** (Unit 1 → Unit 2).

## 9. 준수 / 금지

| 항목 | 결과 |
|---|---|
| proposal 원본 수정 | **0** (읽기만) |
| 설명서 생성 / dry-run / LIVE apply | **0 / 0 / 0** |
| 기존 러너·어댑터 수정 | **0** (`otc-external-site-split-production.ts` · `otc-v2-external-site-recovery-adapter.ts` 무접촉) |
| 다른 세션 파일 (경구 Unit1/Unit2, 라 census·SSOT) | **미수정** (LIVE 대조 목적 읽기만) |
| `apps/api-server/.env` | 미수정·미삭제 · 자격증명 출력 0 |
| `git add .` / reset / clean / stash | 미사용 — 신규 산출물만 path-specific add |
| **DB write** | **0** |

## 10. 생산 착수 가능 여부

> **가능.** `status: APPROVED_FOR_PRODUCTION` · `allGatesPass: true`. 대상·그룹·앵커·write 계획이 SSOT 에 고정됐고, Unit 1 의 3 route(cutaneous·oromucosal·vaginal)는 `RECOVERY_ROUTE_PROFILE` 에 **이미 프로파일이 있어 선결 조건이 없다.**
>
> 후속 생산 WO 는 `otc-external-site-split-production.ts` 계약(승인 SSOT 입력 · 9축/10축 안전지문 그룹키 · `fpToUuidV2` 앵커 · KO 4T + EN 2T · INSERT-only · 단일 TX · 커밋 전 사후검증)을 그대로 쓰되, **SSOT 경로만 본 파일로 바꾸면 된다**. 러너 수정이 필요하면 공용 자산이므로 다 세션 요청 대상이다.
