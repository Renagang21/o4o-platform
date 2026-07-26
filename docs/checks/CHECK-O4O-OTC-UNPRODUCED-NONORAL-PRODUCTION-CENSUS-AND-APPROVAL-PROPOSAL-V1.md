# CHECK-O4O-OTC-UNPRODUCED-NONORAL-PRODUCTION-CENSUS-AND-APPROVAL-PROPOSAL-V1 — 비경구 657 전건 재검증 · 승인 proposal

WO: `WO-O4O-OTC-UNPRODUCED-NONORAL-PRODUCTION-CENSUS-AND-APPROVAL-PROPOSAL-V1` · 일자: 2026-07-26 · 담당: **드럭 OTC 에이전트 나**
census 기준: **`6ca15aa81`** (라 대형 census, 조상 확인) · 입력: `otc-unproduced-ready-split-proposal-v1.json` (**미수정**)
성격: **read-only 조사·승인 proposal.** **DB write 0** · 설명서 생성 0 · dry-run 0 · LIVE apply 0.

---

## 0. 결론

> **비경구 657 master 전건 재검증 완료. `READY_NONORAL` 104 fp / 602 master 확정. 필수 게이트 전량 PASS.**
>
> | 축 | 결과 |
> |---|---|
> | 모집단 재현 | 115 fp / **657** master (distinct 657) — WO 수치 일치 |
> | READY_NONORAL | **104 fp / 602 master** |
> | HOLD | 55 master (HOLD_ROUTE 53 · HOLD_MULTI_ROUTE 2) |
> | fp 내부 안전지문 mismatch | **0** |
> | 기존 LIVE 교집합 (4방향) | **0 / 0 / 0 / 0** |
> | 예상 write | KO 2,408 + EN 1,204 = **3,612T** |
> | 2회 실행 byte-identical | **PASS** (`d6cc2206…`) |
> | **DB write** | **0** |
>
> **생산 단위 2개 제안** — 러너 route 계약 차이(ophthalmic 프로파일 부재)가 유일한 분리 사유다. **후속 최종 승인 SSOT 단계 착수 가능.**

---

## 1. 모집단 재현 (필수작업 1·2)

라 census READY_SPLIT 862 fp / 4,356 master 중 `route !== 'oral'` 전량:

| route | fp | master | WO 기준 | 판정 |
|---|---:|---:|---:|:---:|
| topical (= cutaneous) | 66 | **437** | 437 | ✅ |
| ophthalmic | 34 | **159** | 159 | ✅ |
| oromucosal | 8 | **40** | 40 | ✅ |
| vaginal | 7 | **21** | 21 | ✅ |
| **합계** | **115** | **657** | 657 | ✅ |

- masterIds **distinct 657** — 누락·중복 0.
- 접미 8종(AMS·ATO·CCM·COM·COO·COS·CPL·CTB) 전부 allowlist 등재. **적용부위 미확정 접미(CLQ/CDS/CSI) 0건** → 본 트랙은 제형이 코드로 확정된다.

## 2. 판정 계약 — 선행 트랙 VERBATIM 재사용

재구현이 아니라 **동일 산식 복제**다(다른 잣대로 재판정하면 검증이 아니라 재판정이 되므로).

| 계약 | 출처 |
|---|---|
| `sections` · `normalize` · `SITE_PATTERNS` · `SUFFIX_MAP` · `ROUTE_CONTRADICTION` | `otc-unproduced-large-census.ts` |
| `NEGATION` · `isNegated` · `SURGICAL_CONTEXT` · `PRO_MARKERS` · `findEvidence` | 전문용 분리 감사 (`3719b8280`) |
| `numericTokens` · `ageTokens` · `durationTokens` · `contraSig` · **10축 safetyFp** | `otc-unproduced-large-census.ts` |

**10축 안전지문** = `indication · dosage · caution · numeric · age · duration · contraindication · codeIngredientStrength · codeForm · route`
→ WO 요구 안전지문(성분·함량·제형·경로·적용부위·효능·용법 수치·연령·기간·금기·단일제/복합제)을 코드축(`codeIngredientStrength` = 일반명코드 1–6자리 = 성분+함량, `codeForm` = 접미 = 제형)과 원문축으로 전량 포괄한다.

**원본 파일은 수정하지 않았다.**

## 3. 조사 원칙 준수 (WO 1~7)

| # | 원칙 | 구현 |
|---:|---|---|
| 1 | 제품명으로 route·부위 추정 금지 | route = **코드 접미(SUFFIX_MAP)**, 부위 = **용법·용량 원문**. 제품명 미사용 |
| 2 | 효능·효과와 용법·용량 대조 필수 | `indSites` ↔ `dosSites` 충돌 시 `HOLD_MULTI_ROUTE` |
| 3 | 공식 제형·경로·일반명코드 검증 | gencode DB 재도출(`raw_payload->'source'->>'일반명코드(성분명코드)'`) + 접미↔route 대조 |
| 4 | 복수 경로 병존 시 단일 강제 금지 | `dosSites.length > 1` → `HOLD_MULTI_ROUTE` (2건 실제 분리) |
| 5 | 수술자 손·수술부위·무균·전문기구 제외 | `PRO_MARKERS` 5종 |
| 6 | "수술용 제외" 부정 문맥 오분류 금지 | `isNegated`(괄호 내부 + 직후 30자) · `APPLICATOR` 는 수술 문맥 동반 시에만 |
| 7 | 4방향 중복 검사 | master / fp / sourceRef / canonical — §6 |

## 4. 판정 결과 (필수작업 3·4·5·8)

| 판정 | fp | master | 사유 |
|---|---:|---:|---|
| **READY_NONORAL** | **104** | **602** | 전 축 통과 |
| HOLD_ROUTE | 10 | **53** | 전량 `NO_SITE_IN_DOSAGE` — 용법 원문에 적용부위 표현 부재 (topical 45 · oromucosal 8) |
| HOLD_MULTI_ROUTE | 1 | **2** | `DOSAGE_SITES: cutaneous, oromucosal` 병존 (topical 코드) |
| HOLD_PROFESSIONAL_USE | 0 | 0 | — |
| HOLD_SOURCE | 0 | 0 | 공식 효능·용법·주의 **결손 0** |
| HOLD_SAFETY_VARIANCE | 0 | 0 | — |
| READY_SPLIT | 0 | 0 | **분할 불필요** — §5 |
| EXCLUDE | 0 | 0 | — |
| **합계** | | **657** | 누락 0 |

- **HOLD_ROUTE 53건은 추정 보완하지 않았다.** 제품명·제형으로 부위를 유추하면 WO 원칙 1 위반이므로 보류가 정답이다.
- **HOLD_MULTI_ROUTE 2건은 단일 route 로 강제하지 않았다**(원칙 4). 용법 일부만 잘라 생산하지 않는다.
- **HOLD_PROFESSIONAL_USE 0 은 구조적 결과**다. 전문용 79 master 는 선행 외용 트랙에서 이미 분리되어 HOLD 원장에 있고 READY_SPLIT 에 진입하지 않는다. 탐지기는 정상 동작했다(부정 문맥 규칙 포함).

## 5. fp 내부 안전지문 검증 → READY_SPLIT 0 인 이유 (필수작업 5)

| 게이트 | 결과 |
|---|---|
| 제안 fp 내부 safetyFp 종수 > 1 인 그룹 | **0** |
| 제안 fp ≠ 재도출 safetyFp 인 그룹 | **0** |

라 census 는 **처음부터 안전지문 단위로 그룹을 구성**하므로, 재도출 결과가 제안 fp 와 **1:1 재현**됐다. 따라서 안전지문 분할이 필요한 그룹이 없고 `READY_SPLIT = 0` 이다. **fingerprint 그룹 분할 0** (WO 생산 단위 원칙 준수).

## 6. 기존 LIVE 교집합 — 4방향 전부 0 (필수작업 6·7)

| 방향 | 대상 | 결과 |
|---|---|---:|
| **master** | 외부 적용부위 LIVE 199 + READY_SPLIT LIVE 90 + V2 apply-run 전량 | **0** |
| **fingerprint** | 동상 | **0** |
| **sourceRef** | `uuid(md5("otc-combo-leaflet:"+fp))` 앵커 대조 | **0** |
| **authored canonical** | DB `mfds_drug_otc`·`nutrition_combo`·`mfds_drug_otc_nutrition_combo` STORE canonical | **0** |
| **en canonical** | DB STORE en canonical | **0** |

- LIVE 집합은 apply-run 산출물(`otc-v2-apply-run.*` · `otc-external-site-final-apply-run.*` · `otc-external-site-split-apply-run.*`)과 승인 SSOT 3종에서 조립했다(라 census 계약 VERBATIM).
- **authored·en canonical 0** 은 DB 실측이다 — 파일 대조가 아니라 원장 직접 확인.

## 7. 기존 러너 재사용 가능 여부 (필수작업 9)

| 러너 | 판정 | 근거 |
|---|---|---|
| `otc-v2-store-leaflet-runner.shared.ts` | **ROUTE_OK** | selftest 지원 route 에 oral·oromucosal·topical·**ophthalmic**·nasal·vaginal·rectal 전부 포함. 단 입력이 V2 SSOT·V2 5축 fp 기준 |
| `otc-external-site-split-production.ts` | **SHAPE_OK / ROUTE_GAP** | 승인 SSOT + **9축 안전지문 그룹키** + `fpToUuidV2` 앵커 = 본 산출물과 **입력 형태 동일**. write 계약(KO 4T + EN 2T · INSERT-only · 단일 TX · 커밋 전 사후검증)도 그대로 적합 |

**유일한 결손**: `otc-v2-external-site-recovery-adapter.ts` 의 `RECOVERY_ROUTE_PROFILE` 이 `cutaneous·oromucosal·nasal·rectal·vaginal` 만 보유하고 **`ophthalmic` 프로파일이 없다**. 본 모집단의 ophthalmic 은 34 fp / 159 master(READY 의 26.4%)로 무시할 수 없다.

- 필요 변경: **`ophthalmic` RouteProfile 1건 추가**(usageLabel + EN 문구). 공용 자산이므로 **다 세션 요청 대상** — 본 세션은 수정하지 않았다.
- 부수 사항: `ROUTE_LABEL_KO` 는 CLQ/CDS/CSI 제형 미확정 대비 폴백이다. 본 모집단은 제형이 접미로 확정되므로(크림·연고·플라스타·점안액·점안겔·트로키·껌·질정) 폴백을 쓰지 말고 **확정 제형명을 그대로 쓰는 편이 정확**하다.

## 8. 생산 단위 제안 (필수작업 10·11)

WO 생산 단위 원칙: “전체를 1개로 처리할 수 있으면 단일 단위 우선 / 러너·route 계약이 크게 다르면 2개로 분리(예: 피부·구강·질 / 점안)”.

> **판정: 2단위.** 단일 단위를 우선 검토했으나 **ophthalmic route 프로파일 부재**로 unit1 과 계약이 갈린다. WO 가 예시한 분리안과 정확히 일치한다.

| 단위 | route | fp | master | write (6T/master) | 러너 |
|---|---|---:|---:|---:|---|
| **Unit 1 — 피부·구강·질** | topical 390 · oromucosal 32 · vaginal 21 | **70** | **443** | **2,658** | `otc-external-site-split-production.ts` 계약 재사용 (프로파일 기보유) |
| **Unit 2 — 점안** | ophthalmic 159 | **34** | **159** | **954** | 동일 계약 + `ophthalmic` RouteProfile 추가 후 |
| **합계** | | **104** | **602** | **3,612** | |

- **fingerprint 그룹 분할 0** — 각 fp 는 정확히 한 단위.
- **후속 DB write-owner 는 단일 에이전트로 순차 처리 가능**(Unit 1 → Unit 2). Unit 2 는 프로파일 추가 반영 후 착수하면 되므로 병렬 write-owner 가 필요 없다.

## 9. 필수 게이트

| 게이트 | 결과 | 판정 |
|---|---|:---:|
| 입력 657 master | 657 | ✅ |
| master 누락·중복 0 | distinct 657 · 판정 합계 657 | ✅ |
| route별 합계 일치 | 437 / 159 / 40 / 21 | ✅ |
| fp 내부 안전지문 mismatch 0 | 0 | ✅ |
| 효능·용법 충돌 0 | READY 내 충돌 0 (충돌분은 HOLD 분리) | ✅ |
| 전문용 혼입 0 | 0 | ✅ |
| 기존 LIVE 교집합 0 | master·fp·sourceRef 0 | ✅ |
| authored canonical 혼입 0 | 0 (en canonical 도 0) | ✅ |
| 공식 근거 결손 0 | HOLD_SOURCE 0 | ✅ |
| **DB write 0** | 0 | ✅ |
| 2회 실행 byte-identical | `d6cc22061f84b99fa2355be84a8a3c17` 동일 | ✅ |

중지 조건 **발동 0** — 모집단 재현 성공 · route 수량 일치 · 구조적 충돌 없음 · 안전지문 일치 · LIVE 교집합 0 · 표현 불가 route 없음(프로파일 1건 추가로 해소) · 타 세션 파일 변경 감지 0.

## 10. 산출물

| 경로 | 성격 |
|---|---|
| `apps/api-server/src/scripts/data/otc-unproduced-nonoral-approval-proposal-v1.json` | **승인 proposal** (`status: PROPOSAL — 승인 전 생산 금지`) |
| `apps/api-server/src/scripts/otc-unproduced-nonoral-census.na.ts` | 재검증 census (read-only, 결정론) |
| 본 CHECK | 기록 |

## 11. 준수 / 금지

| 항목 | 결과 |
|---|---|
| 다 Unit 1 생산 파일 · 가 Unit 2 준비 파일 | **미수정** (`otc-unproduced-oral-unit1-approved-ssot-v1.json` · `...-unit2-...` 무접촉) |
| 기존 census · SSOT · 러너 · 생산 원장 | **미수정** (읽기만) |
| 공용 러너 / recovery adapter | **미수정** — ophthalmic 프로파일은 다 세션 요청 사항으로 보고만 |
| 다른 세션 파일 | 미수정 |
| `apps/api-server/.env` | **미수정·미삭제** · 자격증명 출력 0 |
| `git add .` / reset / clean / stash | 미사용 — 신규 산출물만 path-specific add |
| **DB write** | **0** |

## 12. 다음 단계

**최종 승인 SSOT 단계 착수 가능** — 게이트 전량 PASS, 판정·그룹·단위·write 계획이 proposal 에 고정되어 있다. 착수 전 선결 1건: **`ophthalmic` RouteProfile 추가**(다 세션). Unit 1(443 master)은 그 선결 없이도 즉시 SSOT 확정 가능하다.
