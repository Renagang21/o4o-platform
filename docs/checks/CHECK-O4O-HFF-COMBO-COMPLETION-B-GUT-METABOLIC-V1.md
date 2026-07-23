# CHECK — WO-O4O-HFF-COMBO-COMPLETION-B-GUT-METABOLIC-V1 (에이전트 나)

> 장·배변·혈당·체지방·콜레스테롤·면역 **복합형(combo)** HFF 매장용 설명서 연속 생산.
> 조사 → HOLD_MULTI census → signature 분류 → 생산 → dry-run → apply → 독립검증.

- 시작: 2026-07-23T05:50:18Z
- 종료: 2026-07-23T06:28:02Z
- 기준선(내 세션 시작 시점): STORE canonical HFF SPD = **19,628**
- 최종 재측정: STORE canonical HFF SPD = **21,164** (동시 진행 중인 A/C 세션 포함 누계)
- 내 세션 순수 기여: **신규 마스터 190 · STORE canonical SPD 380(ko 190 + en 190)**

---

## 1. 산출 요약

| 항목 | 값 |
|------|---:|
| 후보 전량 스캔(product_candidates) | 전체 MFDS HFF |
| B/MIXED 완전분류 다원료 signature | **236** |
| 구조상 untaken 후보(census) | **827** |
| select 통과(정밀 표시량 grounding) sig | 57 |
| generate 생산가능 units | 247 |
| dry-run PASS sig / units | 47 / 220 |
| **apply COMMIT sig / 신규 마스터** | **43 / 190** |
| 총 DB write | **760** (masters 190 + candidate update 190 + SPD 380) |
| auto-HOLD units | 2 |
| A/C 동시생산 선점 race-skip sig | 14 (전량 승격됨, DB write 0) |

### 상위 조합별 신규 LIVE

| signature | 신규 |
|-----------|---:|
| 셀레늄+아연+프로폴리스 (면역) | 22 |
| 가르시니아+비타민B1 (체지방+대사) | 19 |
| 가르시니아+나이아신+B복합 (체지방+대사) | 19 |
| 가르시니아+녹차 (체지방+항산화+콜레스테롤) | 11 |
| 비타민E+아연+프로폴리스 (면역+항산화) | 10 |
| 가르시니아+나이아신+B복합+비타민C | 6 |
| 가르시니아+비타민B1B2B6+셀레늄+판토텐산 | 6 |
| 가르시니아+비타민B1B2B6 | 6 |
| … (총 43 sig) | |

도메인: **체지방(가르시니아 계열)·면역(프로폴리스·아연 계열)·대사(녹차·B복합)** — B 영역 정중앙.

---

## 2. basis 원칙 준수 (B-08)

기능성 원료명 / 지표성분명 / 원료 함량 / 지표성분 함량 / 1일 섭취량 / 총 제품 용량을 구분.

- **가르시니아**: 설명서에 `가르시니아캄보지아 추출물 1000mg` = **원료 표시량**으로 기재. HCA(무수 하이드록시시트르산) 지표성분 함량을 원료량으로 오인하지 않음.
- 표시 기준 블록에 `표시량(1000mg/3600mg)의 80~120%` 형식 — **원료 표시량 vs 총 제품 용량(3600mg)** 명시 구분.
- **grounding 게이트 작동**: select 단계에서 원료 declaredAmount 가 `표시량 이상`(ratio, 상한값 부재)이거나 value/basisAmount ≤ 0 인 후보는 전량 HOLD. 식이섬유·차전자피·이눌린 계열은 표준 표기가 `X g 이상`이라 정밀 dose 임베드 불가 → 전량 보류(방어 아님, basis 무결성 보호).
- **G-MULTI-AMOUNT-SOURCE** 가드: 각 원료 표시량이 BASE_STANDARD 원문에서 자기 원료에 귀속되어 등장하는지 검증(원료 간 수치 이동 차단).

## 3. 복합 기능성 보존

임의 축소 없이 원료별 공식 인정 기능성 전량 병기 확인:

- 아연 → `정상적인 면역기능에 필요` + `정상적인 세포분열에 필요` (2개 모두 유지)
- 가르시니아 → `탄수화물이 지방으로 합성되는 것을 억제하여 체지방 감소에 도움`
- 녹차 카테킨 → `체지방 감소` + `항산화·체지방 감소·혈중 콜레스테롤 개선` (복수 기능성 유지)
- 질환·증상·전문 표현 순화 없음. 원문 밖 치료·예방 주장 없음. 전문가 상담 footer 전 제품 유지.

---

## 4. 자동 apply 게이트 (독립검증 결과)

| 게이트 | 결과 |
|--------|:---:|
| dry-run postVerifyPass | ✅ 47/47 |
| canonicalDup (내 190 마스터) | **0** |
| statementNo 중복(파일 내) | **0** (247 유일) |
| 예상 write = 실측 write | ✅ (masters 190 / spdKo 190 / spdEn 190 / candLinked 190) |
| rollback manifest | ✅ 배치별 `hff-combo-b-*-apply-rollback-manifest.json` |
| A/C 조합 교집합 (permitOverlap) | **0** |
| 기존 LIVE drift (spd created≠updated) | **0** |
| 연결(candidatesLinked, spdRefLinked) | ✅ 190 / 380 |

이중게이트: dry-run(exec+ROLLBACK, DB write 0) → apply(`HFF_NUTRIENT_APPLY_CONFIRM=YES` COMMIT). 동시 생산 레이스는 `--skip-promoted` 로 배치 abort 대신 선점분 제외.

---

## 5. A/C 트랙 경계

- 콜라겐·관절·피부 → A / 눈·인지·혈행 → C. 본 세션은 B(장·대사·면역)만.
- 동시 진행 중인 Agent C 가 녹차·GLA·가르시니아-비타민C·나이아신-녹차 combo 를 세션 중 선점 → dry-run→apply 사이 14 sig(20 units) 전량 승격. `--skip-promoted` + select `--exclude-taken` 로 **교집합 0** 확보(permitOverlap=0).
- 파일 격리: B 전용 `hff-combo-b-census.ts` 만 수정/추가. Agent C 공용 파이프(`hff-combo-select/generate/compose`, `hff-nutrient-registry`, `hff-nutrient-store-canonical-apply`)는 **read-only 실행만**(무편집).

## 6. 미생산 / 잔여

- **식이섬유·차전자피·이눌린·난소화성말토덱스트린 계열**(장 건강·배변): 표준 표기 `X g 이상` → 정밀 표시량 부재 → grounding HOLD. 별도 "표시량 이상형 combo" 저작 규격 필요(현 파이프 범위 외).
- **키토산·키토올리고당·알콕시글리세롤 / 알로에·베타글루칸·표고버섯균사체**: census 완전분류 signature 미출현(미등록 원료 또는 단일형). B-03 registry 보완 후보 조사 결과 unknownFreq 상위는 파싱 노이즈 + HCA(가르시니아로 이미 처리) + C 도메인(Rg3/DHA) → **신규 등록가치 B 원료 없음**.
- greentea/gla/garcinia-vc 계열: Agent C 선점.
- 따라서 **현 파이프·registry 기준 생산가능 안전 후보 소진(B-10 충족)**.

## 7. 검증 채널

- DB: cloud-sql-proxy `127.0.0.1:5442` · user `o4o_api` · database `o4o_platform` (read-only 검증 SELECT).
- 독립검증 쿼리: myMasters=190 · spdKo=190 · spdEn=190 · canonicalDup=0 · candLinked=190 · permitOverlap=0 · spdUpdatedNeqCreated=0.

## 8. 산출물

- B 전용 census: `apps/api-server/src/scripts/hff-combo-b-census.ts` (READ-ONLY, DB write 0. sig→untaken stmt 맵 출력 추가).
- rollback manifest: 배치별 (OS temp `hff-apply-manifests/` 하위, 세션 산출물).
- 공용 파이프(select/generate/compose/apply): 무편집 read-only 실행.

**결론**: B(장·대사·면역) 복합형 190 신규 STORE canonical LIVE. canonicalDup 0 · A/C 교집합 0 · drift 0 · basis 무결성 보존 · 복합 기능성 전량 유지. 중지 조건 해당 없음.
