# CHECK-O4O-DRUG-OTC-DESCRIPTION-REGISTRY-POPULATE-V1

Status: DONE — registry 실후보 population (2026-07-07)
WO: [`WO-O4O-DRUG-OTC-DESCRIPTION-REGISTRY-POPULATE-V1`](../work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-REGISTRY-POPULATE-V1.md)
산출: [`docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md`](../registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md) (177행)
Scope: 적용완료 66 + 100그룹 후보(단일 32 + 복합 68) + 비경구 route 대표 11을 registry에 등록. **DB write 0(read-only 조회만). 설명서 본문 작성 0.**

> **요약:** registry에 **177행** 등록 — `imported` 66(product_candidate_description_drafts 실측) + `candidate` 111(단일 32 + 복합 68 + route 대표 11). **group_key 중복 0.** batch: ORAL-SINGLE 97 · ORAL-COMBO 68 · route 12. status: imported 66 · candidate 111. risk_class: normal 50 · review_required 121 · manual_curation 6. 클로트리마졸 100mg은 seed_json상 "정"이나 **실제 질정→route=vaginal 교정**. route 전량(외용 146·점안 44·파스 41…)은 각 route batch DRAFT WO가 candidate 추가.

---

## 1. 작업 일시 / 채널

| 항목 | 값 |
| --- | --- |
| 작업 일시 | 2026-07-07 |
| 접속 | Cloud SQL Auth Proxy(127.0.0.1:15437) → psql SELECT (`product_candidate_description_drafts` 66행 조회) + 로컬 오프라인 조립 |
| write | **0** (registry는 문서 파일. DB·SPD·canonical 변경 0) |

## 2. 확인한 선행 문서

| 문서 | 반영 |
| --- | --- |
| `docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md` | 스키마·group_key·상태·batch 그대로 사용 |
| `CHECK-...-100-GROUP-DRAFT-V1.md` | 복합 68(부록 A) + 단일 32(§4.2) |
| `CHECK-...-ROUTE-TEMPLATE-V1.md` / `...-HIGH-RISK-GROUP-CURATION-V1.md` | route 대표·risk_class·농도 규칙 |
| `CHECK-...-COMBINATION-GROUPING-RULE-V1`(v2) | 복합 ingredient_key=ATC 조합코드 |
| `CHECK-...-PARALLEL-BATCH-REGISTRY-DESIGN-V1.md` | 거버넌스 |

누락 없음. (복합 68 원천 CSV는 gitignore이나 100-GROUP-DRAFT 부록 A에 전량 표로 존재 → 그것을 사용)

## 3. 반영한 후보 출처

| 출처 | 건수 | 상태 | 획득 |
| --- | --: | --- | --- |
| 적용완료 OTC 초안 | **66** | `imported` | DB `product_candidate_description_drafts` seed_json 실측(ingredient/strengthToken/doseForm/klass/sourceDoc/groupScope) |
| 100그룹 단일 신규 | **32** | `candidate` | NORMALIZATION §13 (q14 산출: rep_ing/함량/제형/atc/easy/grade) |
| 100그룹 복합 경구 | **68** | `candidate` | 100-GROUP-DRAFT 부록 A (atc/함량/제형/grounded/대표제품) |
| 비경구 route 대표 | **11** | `candidate` | HIGH-RISK §4~6 (batch별 대표 성분) |
| **합계** | **177** | — | — |

## 4. group_key 생성 방식

```text
drug_otc::{single|combo}::{route}::{ingredient_key}::{strength_key}::{dosage_form}
```

- `ingredient_key`: 단일 = 성분명 정규화 토큰(공백·`.`·`·`·`/`·`-` 제거). 복합 = ATC 조합코드 소문자+`_combo`. route 대표 = 로마자 슬러그. **로마자 전면 통일은 후속 기계 작업**(현재 단일은 한글 정규화 토큰, 유일성·dedup에는 충분).
- `strength_key`: 밀리그램→mg · 마이크로그램→ug · IU→iu · 그램→g · 밀리리터→ml · 없음→na.
- `dosage_form`: 정→tablet · 연질캡슐→soft_capsule · 캡슐→capsule · 과립→granule · 액/시럽→liquid · 크림→cream · 연고→ointment · 파스→patch · 점안→eye_drop · 비강→nasal_spray · 좌제→suppository · 질정→vaginal_tablet · 트로키→troche.
- **교정:** 클로트리마졸 100mg = seed_json doseForm "정"이나 실제 **칸디다성 질염 질정** → group_key `...::vaginal::클로트리마졸::100mg::vaginal_tablet`, BATCH-VAGINAL.

## 5. registry 반영 결과 (집계)

**status별:**

| status | 수 |
| --- | --: |
| imported | 66 |
| candidate | 111 |
| **합계** | **177** |

**single/combo:**

| 구분 | 수 |
| --- | --: |
| single | 109 (imported 66 + candidate 43[단일 32 + route 대표 11]) |
| combo | 68 |

**batch별:**

| batch | 수 | 비고 |
| --- | --: | --- |
| BATCH-ORAL-SINGLE | 97 | imported 65 + candidate 32 |
| BATCH-ORAL-COMBO | 68 | candidate 68 |
| BATCH-TOPICAL | 4 | 대표(항진균·스테로이드·항생·미백) |
| BATCH-EYE | 2 | 대표(인공눈물·항알레르기) |
| BATCH-NASAL | 2 | 대표(충혈완화·세척) |
| BATCH-PATCH | 1 | 대표(케토프로펜) |
| BATCH-RECTAL | 1 | 대표(해열 좌제) |
| BATCH-VAGINAL | 1 | 클로트리마졸(imported) |
| BATCH-ORAL-LOCAL | 1 | 대표(트로키) |

**risk_class별:**

| risk_class | 수 |
| --- | --: |
| normal | 50 |
| review_required | 121 |
| manual_curation | 6 |

## 6. 중복/충돌 처리

- **group_key 중복 = 0** (177행 전량 유일, `cut`+`uniq -d` 검증).
- 단일 32(candidate)는 완료 66과 겹치지 않음(NET 신규, 선행에서 done 57 트리플 anti-join). 함량/제형 변형(나프록센 250 정 vs 완료 250 연질캡슐, 이부프로펜 200 캡슐 vs 완료 200 정/연질 등)은 제형 다름 → 별개 group_key, 충돌 아님.
- 기존 66 우선 원칙(WO §8): 겹침 없어 적용 불필요. 겹쳤다면 imported 우선.
- route 대표와 경구 후보 겹침 없음(route≠oral로 분리).

## 7. blocked/excluded 내역

- 이번 population 범위에 `blocked`/`excluded` 행은 등록하지 않음(100그룹은 GO 후보, route 대표는 candidate). **R05X 감기약 catch-all**은 registry §2 규칙상 `blocked` 대상이나, 개별 그룹 enumeration은 HIGH-RISK/route WO 소관 → 이번엔 미등록(규칙만 명시).
- 저grounding 단일 8건은 `candidate` + notes "저grounding(e약은요<=2)"로 표기(제외 아님, 검토 시 판단).

## 8. 다음 batch 작업 제안 (우선순위)

| 우선 | batch | 근거 |
| --: | --- | --- |
| 1 | **BATCH-ORAL-SINGLE** candidate 32 초안 | 자동 3 + 검토강화 21이 즉시 작성 가능(grounding 확보), imported 66 형식 재사용 |
| 2 | **BATCH-ORAL-COMBO** candidate 68 | 전량 약사검토강화 — e약은요 원문 grounding 확인 루프 필요. 약효군별(변비 A06AB52·비충혈 R01BA52·해열진통 N02BE51) 분할 |
| 3 | route batch **enumeration WO** | 외용 146·점안 44·파스 41 전량을 candidate로 채움(농도 재파싱·S01XA20 분리) 후 batch 작성 |

각 batch 작업방은 시작 전 registry에서 `status=candidate` & `assigned_batch` 확인, 완료 시 `CHECK-...-[BATCH]-DRAFT-V1` 제출 + `draft_check` 링크 + status→drafted.

## 9. 금지사항 준수

```text
DB write 0 (product_candidate_description_drafts는 SELECT만)
설명서 본문 작성 0
설명서 수정 0
SharedProductDescription 변경 0
ProductDrugExtension 임상 텍스트 입력 0
canonical 변경 0
매장 콘텐츠 / QR·POP·태블릿 연결 변경 0
import/apply 실행 0
병렬 세션 파일 수정 0
```

## 10. 완료 기준 대조 (WO §11)

| 성공 기준 | 충족 |
| --- | --- |
| registry에 실제 후보 등록 | ✅ 177행 |
| 기존 66 적용 초안 표시 | ✅ imported 66 (DB 실측) |
| 100그룹 후보 반영 | ✅ candidate 100 (단일 32 + 복합 68) |
| route 후보 batch별 반영 | ✅ 대표 11 + 전량 enumeration 후속 명시 |
| 중복 group_key 확인/정리 | ✅ 중복 0 |
| batch별 다음 작업량 산출 | ✅ §5·§8 |
| 설명서 작성 0 / DB write 0 | ✅ §9 |

---

**최종: registry에 177행 등록(imported 66 + candidate 111). group_key 중복 0. batch ORAL-SINGLE 97·ORAL-COMBO 68·route 12. risk_class normal 50·review 121·manual 6. 클로트리마졸 질정 route 교정. 다음=BATCH-ORAL-SINGLE(32)→ORAL-COMBO(68)→route enumeration. DB write 0.**
