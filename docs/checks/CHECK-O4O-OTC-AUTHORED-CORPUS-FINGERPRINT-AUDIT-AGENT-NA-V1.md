# CHECK-O4O-OTC-AUTHORED-CORPUS-FINGERPRINT-AUDIT-AGENT-NA-V1 — authored 설명서 지문 조사 (에이전트 나)

WO: `WO-O4O-OTC-AUTHORED-CORPUS-FINGERPRINT-AUDIT-AGENT-NA-V1` (스크립트) · `WO-O4O-OTC-AUTHORED-CORPUS-FINGERPRINT-EXECUTE-AGENT-GA-V1` (실행)
일자: 2026-07-18 · 상태: **완료 (조사)**
스크립트 커밋: `2e78f8990` (에이전트 나 · 미인증 클론에서 작성·push)
실행 환경: 에이전트 가 인증 환경 — Cloud SQL Auth Proxy `127.0.0.1:5442` (프로덕션 read-only SELECT)
방법론 계승: shard-1(`drug-otc-full-corpus-fingerprint-shard-1.ts` 565546b7f) — 정규화·Tier·경로/제형/성분·안전지문 동일 축 + authored 자유형 파서 fallback.

> **read-only.** DB write **0** · canonical/draft/번역/연결 변경 **0** · shard 0·1·2 산출물 미수정. 통합은 별도 WO.

---

## 0. 결론

> **authored-ungrounded OTC 3,128 master 전수 지문화(추출 실패 0). source_type 실측 = `mfds_drug_otc` ko 1,213(+en 1,213 완비) + `mfds_drug_otc_nutrition_combo` ko 1,915(ko-only) = 3,128 — WO 예상과 정확 일치. content-지문 그룹 289 · Tier1 1,881(60%)/Tier3 1,245(40%)/Tier5 2. 거의 전량 경구(oral 3,126). 성분명 추출 가능 1,370 / 무성분명 1,758 → 무성분명 bridge 는 atc_code 축(ATC 보유 3,114 / 미보유 14). 동일 약학적 키에 authored 설명서 다중 = 충돌 12그룹(그중 안전지문 상충 6). authored 1건이 grounded 로 확장 가능한 bridge 후보 = 133그룹 / grounded ≈ 3,652 master(근사, 통합단계 안전지문 대조 후 확정). 재실행 결정론 확인(동일 md5).**

---

## 1. 모집단 (전수 열거)

| 항목 | 값 |
|---|---|
| 모집단 정의 | `shared_product_descriptions` · `source_type ∈ authored set` · `language='ko'` · `status='canonical'` · `deleted_at IS NULL` |
| authored master (ko canonical, distinct) | **3,128** |
| 추출 성공 | **3,128** |
| 추출 실패 | **0** |

> WO 예상 **3,128 = 실측 3,128 정확 일치**. 첫 게이트(sourceTypeBreakdown·수량) 통과 후 산출물 확정.

### source_type 자기검증 (WO 표기 vs 실측 리터럴)

WO 는 `('mfds_drug_otc','nutrition_combo')` 로 표기했으나 **실측 리터럴은 `mfds_drug_otc_nutrition_combo`** 이다. 스크립트가 두 표기 모두 후보로 넣고 실측 distinct 를 리포트해 확정:

| source_type | language | status | master |
|---|---|---|---:|
| `mfds_drug_otc` | ko | canonical | 1,213 |
| `mfds_drug_otc` | en | canonical | 1,213 |
| `mfds_drug_otc_nutrition_combo` | ko | canonical | 1,915 |
| `nutrition_combo` (WO 표기) | — | — | **0 (미존재)** |

> ko canonical 모집단 = 1,213 + 1,915 = **3,128**. `mfds_drug_otc` 는 전량 en 완비, `nutrition_combo` 는 ko-only.

---

## 2. 지문화 (shard-1 계승 + authored fallback)

원문 = authored content(자체 작성). e약은요 SPD 포맷이 아니므로 섹션 파서 **이중**:
1. e약은요 파서(`<p><strong>제목</strong><br>본문</p>`) 시도 → 0섹션이면
2. 자유형 파서(`<h1..4>`/`<strong>`/줄머리 제목) fallback → 표준 축(효능/용법/주의/상호작용) 매핑.

지문: raw_full·norm_full·norm_{ind,dos,cau} · ingredient_strength·dose_form·route·dosage_numeric·age·duration·contraindication·pregnancy·interaction·allergy_additive. 정규화 = HTML·공백·목록기호·문장부호변형·NFKC(전각)만 제거, **숫자·함량·연령·기간·금기·첨가제·경로·제형·성분 보존.**

---

## 3. content-지문 그룹 · Tier

| Tier | master | 그룹 | 판정 |
|---|---:|---:|---|
| **Tier1** (raw_full 동일) | **1,881** | 245 | 원문 완전 동일 |
| Tier2 (normalized 동일) | 0 | 0 | — |
| **Tier3** (섹션 지문 동일) | **1,245** | 43 | 대표 1건 검토 후 공유 |
| Tier4 (안전 다름) | 0¹ | 0 | — |
| Tier5 (비경구·복합제) | 2 | 1 | 별도 트랙 |
| 합 | **3,128** | **289** | |

¹ Tier4=0: 그룹 키가 섹션 지문을 포함하므로 안전 상이 시 애초에 다른 그룹으로 분리(§6 충돌로 표면화). shard 구조 동일.

**경로 분포**: oral **3,126** · unknown 2. authored corpus 는 거의 전량 경구 단일 계열.

---

## 4. WO 필수 보고 항목

| 항목 | 값 | 비고 |
|---|---:|---|
| authored master 총수 | **3,128** | 전수, 추출 실패 0 |
| source_type별 (ko canonical) | mfds_drug_otc **1,213** / mfds_drug_otc_nutrition_combo **1,915** | §1 |
| fingerprint 그룹 수 | **289** | content-지문 |
| **단일제** (name-token) | 3,128 | name `·` 복합 표기 없음 → §4-A 주의 |
| **복합제** (source_type=nutrition_combo) | **1,915** | 정의상 복합영양. name-token 기준은 0 |
| 성분명 추출 **가능** | **1,370** | name 말미 `(성분)` 존재 |
| 성분명 추출 **불가**(무성분명) | **1,758** | bridge 는 atc_code 축 |
| ATC **보유** | **3,114** | |
| ATC **미보유** | **14** | atc_code null |
| ko/en canonical **완비** | **1,213** | 전량 mfds_drug_otc |
| ko-only | 1,915 | nutrition_combo(en 미보유) |
| 동일 약학적 키 **충돌 그룹** | **12** (안전지문 상충 6) | §6 |
| grounded bridge **후보** | 133그룹 / grounded ≈ **3,652** master | §7, 근사·통합단계 확정 |
| 재실행 결정론 | ✅ 동일 md5 `64bbdbb010864906645d78e59cbed789` | §8 |

### 4-A. 단일/복합 판정 주의 (통합단계 재확인 대상)

name-token multiIngredient(이름에 `·` 2+ 또는 성분에 `·`/`,`) 기준으로는 **복합 0**. 그러나 `mfds_drug_otc_nutrition_combo` **1,915** 는 **source_type 분류상 복합영양제**이며 다수가 무성분명(name 말미 단일 `(성분)` 없음 → §4 무성분명 1,758 의 주요 구성). 따라서 **약학적 복합 판정은 source_type = nutrition_combo(1,915)** 를 1차 신호로 삼고, name-token 은 참고값으로만 병기한다. 통합단계에서 grounded 축·성분 리스트와 대조해 최종 확정.

---

## 5. bridge 키 원칙 (WO 고정)

| 조건 | pharmKey |
|---|---|
| 성분명 있음 | `ing:성분\|함량\|제형\|경로` |
| 성분명 없음(무성분명) | `atc:atc_code\|함량\|제형\|경로` |

고정 원칙: **ATC = 후보 연결 키 / 안전지문(용법수치·연령·기간·금기·임신·첨가제·상호작용·단일복합) = 최종 분리 키.** authored pharmKey 총 **334** (성분 축 + ATC 축).

---

## 6. 동일 약학적 키 충돌 그룹 (12 · 안전 상충 6)

같은 pharmKey 인데 authored content-지문(norm_full)이 2개 이상 = 제품별 설명서 실차이. 통합단계 대표화/분리 판단 대상.

| pharmKey | 문서 변이 | 안전 변이 | authored master | 예시 |
|---|---:|---:|---:|---|
| 에르도스테인\|300mg\|캡슐\|oral | 3 | 3 | 67 | 에르도스텐캡슐 |
| 암브록솔염산염\|30mg\|정\|oral | 3 | 3 | 15 | 암브린정 |
| A11JC\|100mg\|정\|oral | 2 | 1 | 98 | 리큐비뉴로정 |
| 세티리진염산염\|10mg\|정\|oral | 2 | 2 | 72 | 세르텍정 |
| A11JC\|296.7mg\|연질캡슐\|oral | 2 | 1 | 40 | 네오아이연질캡슐 |

> **안전지문 상충 6** = 같은 성분·함량·제형·경로라도 용법·금기 등 안전 텍스트 실차이 → **분리 유지**(오병합 방지). **문서만 상충(안전 동일) 6** = 서식/문구 변이 → 대표 1건 수렴 후보. 상세 12건은 산출물 `_detail.conflicts`.

---

## 7. grounded bridge 기계 판독 목록

authored 1건이 grounded(e약은요) 제품 몇 개로 확장 가능한지 산정할 입력. authored pharmKey ↔ grounded pharmKey(name/spec/atc 파생) 매칭.

| 항목 | 값 |
|---|---:|
| authored pharmKey | 334 |
| **확장 후보 그룹**(grounded 매칭>0) | **133** |
| 매칭 grounded master(근사 합) | **≈ 3,652** |

상위 확장 후보(authored → grounded 매칭 수):

| keyType | pharmKey | authored | grounded |
|---|---|---:|---:|
| 성분 | 에르도스테인\|300mg\|캡슐\|oral | 67 | 364 |
| 성분 | 아세틸시스테인\|200mg\|캡슐\|oral | 59 | 224 |
| 성분 | 세티리진염산염\|10mg\|정\|oral | 72 | 148 |
| ATC | A11JC\|100mg\|정\|oral | 98 | 129 |
| 성분 | 알마게이트\|500mg\|정\|oral | 26 | 124 |
| 성분 | 트리메부틴말레산염\|100mg\|정\|oral | 38 | 122 |
| ATC | A11JC\|500mg\|연질캡슐\|oral | 151 | 103 |
| 성분 | 아스피린\|100mg\|정\|oral | 23 | 97 |

> **⚠️ 근사값·통합단계 확정.** grounded 매칭 수는 name/spec/atc 파생으로 산정한 상한 후보이며, 실제 확장은 **shard 0·1·2 fingerprint 병합 + 안전지문 대조 후**만 유효(오병합 방지). ATC 축(A11JC 등 broad 코드)은 함량·제형·경로 + 안전지문이 분리 담보. 전체 목록은 산출물 `_detail.bridgeList`(334건, grounded 매칭 내림차순).

---

## 8. 재실행 결정론

| 검증 | 결과 |
|---|---|
| 동일 인자 2회 실행 | 산출물 md5 `64bbdbb010864906645d78e59cbed789` **불변** |
| populationMasters | 3,128 (2회 동일) |
| content 그룹 | 289 (2회 동일) |

---

## 9. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| authored 3,128 전수 열거 | ✅ 3,128 / 추출 실패 0 |
| source_type 실측 확인 | ✅ mfds_drug_otc 1,213 + nutrition_combo 1,915 |
| fingerprint·안전지문 생성 | ✅ Tier1–5 + 안전지문 번들 |
| 중복·충돌 그룹 확인 | ✅ 12그룹(안전 상충 6) |
| grounded bridge 기계 판독 목록 | ✅ 334 pharmKey / 확장 후보 133 |
| 재실행 결과 동일 | ✅ md5 불변 |
| DB write 0 | ✅ read-only(프록시 5442 SELECT only) |
| 자기 산출물만 commit | ✅ JSON + CHECK path-specific(§10) |

---

## 10. 산출물

- `apps/api-server/src/scripts/drug-otc-authored-corpus-fingerprint-audit.ts` (스크립트, 커밋 `2e78f8990`)
- `apps/api-server/src/scripts/data/otc-authored-corpus-fingerprint-v1.json` (집계 + `_detail`: groups 289 · conflicts 12 · bridgeList 334 · exceptions 0)
- `docs/checks/CHECK-O4O-OTC-AUTHORED-CORPUS-FINGERPRINT-AUDIT-AGENT-NA-V1.md` (본 문서)

> **환경 정리 주의**: 프록시(`:5442`)·`apps/api-server/.env` 는 **에이전트 가의 라이브 병렬 세션**이 구성·사용 중이므로 본 세션에서 종료·삭제하지 않는다(다른 세션 파일 미접촉 원칙). teardown 은 소유 세션에 위임. 본 세션은 비밀번호·로그·scratch·`.env` 를 **커밋하지 않음**.

## 11. 통합 WO 반영 후보 (3-shard + authored)

1. **충돌 12그룹** — 안전 상충 6 분리 유지 / 문서만 상충 6 대표화.
2. **무성분명 1,758** — ATC 축 bridge(ATC 보유 3,114). broad ATC 는 함량·제형·경로+안전지문 분리.
3. **bridge 확장 후보 133그룹 / grounded ≈ 3,652** — 안전지문 대조 후 확정(근사값 확정 금지).
4. **복합 판정** — source_type=nutrition_combo 1,915 를 1차 신호(§4-A). name-token 0 은 참고.
5. **ko-only 1,915**(nutrition_combo) — en 확장 필요 여부는 통합단계 정책 판단.
