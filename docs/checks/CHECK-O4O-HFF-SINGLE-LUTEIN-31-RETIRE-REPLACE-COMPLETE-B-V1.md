# CHECK — single-lutein 31 RETIRE+REPLACE 완결 (Agent B)

- 상위 설계: `CHECK-O4O-HFF-SINGLE-LINE-ABSORPTION-CORRECTION-DESIGN-A-V1` §4~§6 (Agent A, `fa082f7f8`)
- **정본**: `docs/checks/data/product-description-guard/hff-lut31-final-correction-queue.json` (Agent A 최종 큐, `8761bdea7`) — 문서가 아니라 큐 JSON 이 기준
- 선행: 파서 하드닝 `6a2769045` · 파일럿 중지 `ee10f5375`(verifiedFullSet 16/31 불일치 — 본 작업에서 해소)
- 성격: **파서 gap 2종 수정 → 31건 전체 재검증 → RETIRE+REPLACE 일괄 완결**. 26건 부분 적용 안 함(지시).

## 1. 파서 gap 2종 수정 (공용 생산 파서)

`hff-source-parse.ts` 는 생산 `hff-combo-select` 가 `parseSpecs` 로 사용하는 **공용 경로**(하드닝 `6a2769045` 에서 일원화)라 수정이 생산에 그대로 반영된다.

| gap | 건수 | 원인 | 수정 |
|-----|:---:|------|------|
| `UNIT_MODIFIER_UG_RAE` | 3 | `(?<=[\d\s(])u\s*g\b` 의 `\b` 가 `700ugRAE`·`210 ugRE` 처럼 **수식어 결합 시 성립하지 않아** 정규화 실패 → spec 전체 누락(과소추출) | 수식어(`RAE|RE|NE|DFE|α-TE`) 선행도 경계로 인정: `u\s*g(?=\s*(?:RAE|RE|NE|DFE|α-?TE)\b|\b)` |
| `FN_MODE_COLON` | 2 | MAIN_FNCTN 이 `비타민E : 항산화…` **콜론 라벨** 구조인데 bracket/numbered 만 인정 → `inline` 폴백 → 원문에 없는 **구리·망간·비타민C·셀레늄으로 추정 귀속**(오귀속) | 명시 구조 3형식 중 ③ **콜론 라벨 모드**를 inline 폴백 **앞**에 추가(2건 이상일 때만 인정 → 미달 시 기존 동작 유지). `FnMode` 에 `colon` 추가, `hff-lut-fullset-rederive` 도 명시 구조로 인정 |

- **추정 귀속 금지 원칙 유지**: colon 모드는 원문 라벨에만 근거하며 registry 추정 매칭을 하지 않는다.
- 루테인 동의어(`마리골드꽃추출물`)는 기존 CLS 에 이미 반영되어 있어 추가 수정 불요.

## 2. 31건 재검증 (수정 파서, read-only)

| 항목 | 결과 |
|------|------|
| 재산출 그룹 | 루테인+비타민A+비타민E **21** · 루테인+비타민A **8** · 루테인+비타민E **2** |
| 정본 큐 `verifiedFullSet` 와 일치 | **31 / 31** (statementNo 커버리지 31/31/31) |
| `changedVsQueue` | 0 |
| fnMode | bracket 26 · numbered 3 · **colon 2** (= Agent A `attributionMode` 와 동일) |
| 추정 귀속(inline) | **0건** |

→ 파일럿 중지 사유(16/31 불일치)와 파서 대비 불일치 5건이 **전건 해소**.

## 3. RETIRE+REPLACE 계약·구현

신규 스크립트 `hff-lut31-retire-replace-apply.ts` (기존 `hff-nutrient-store-canonical-apply` 는 **신규 master INSERT 흐름**이라 계약이 반대 — 설계 §6).

```text
기존 단일 STORE canonical(ko+en) → status='deprecated' 은퇴   (테이블 기존 어휘 재사용, 선례 612건)
verifiedFullSet 복합형 STORE canonical(ko+en) 신규 INSERT
master_id 불변 · product_masters write 0 · product_candidates write 0 · source_ref_id 승계
은퇴+신규 = 단일 트랜잭션 원자적 (이중 canonical 금지) · 이중게이트(HFF_LUT31_APPLY_CONFIRM=YES)
```

**write 계약 = 제품당 4** (은퇴 UPDATE 2 + 신규 INSERT 2) → **31 × 4 = 124**.

preload 게이트: ①정본대조(큐 밖 혼입/누락) ②큐 verdict·action ③Guard BLOCKED/draft ④그룹 정합 ⑤master 존재·유일(신규생성 금지) ⑥기존 canonical 형태(ko1+en1)·source_ref ⑦candidate 링크 ⑧sanitize.

## 4. dry-run → apply → 독립검증

| 항목 | dry-run | apply(COMMIT) | 독립검증(새 연결) |
|------|:---:|:---:|:---:|
| target / 그룹 | 31 · 21/8/2 | 동일 | — |
| 예상=실측 write | **124 = 124** | 124 | — |
| 기존 canonical 은퇴 | 62 | 62 | `deprecated` **62** |
| 신규 복합형 canonical | 62 (ko31/en31) | 62 | `canonical` **62** (ko31/en31) |
| canonicalDup | 0 | 0 | **0** |
| master / candidate | 31 / 31 불변 | 불변 | masters **31** · candidateLinked **31** |
| source_ref 보존 | 62 | 62 | srcRefNotNull **62** |
| 결과 | ROLLBACK (DB write 0) | **COMMIT 완료** | **PASS** |

- 신규 본문이 실제 복합형인지 배지 수 샘플 확인: `[3, 2, 3]`(원료 수) — 단일 루테인 콘텐츠 아님.
- rollback manifest 저장(제품별 masterId / retiredSpdIds / newSpdIds).

## 5. 준수·범위

- 26건 부분 apply **안 함**(31건 일괄) · 큐 밖 제품 혼입 **0** · 신규 ProductMaster **0** · 추정 귀속 **0** · `git add .` 미사용(path-specific).
- 기존 배치 태그(`batch:single-nutrient-lutein`)는 master write 금지 계약에 따라 **변경하지 않음** — 복합형 집계 태그 축과는 별개(누적 카운트 영향 없음).

## 6. 후속

- 공용 파서 추가 보강 5종(Agent C 발견분: `9.9mg/850mg(표시량의 80~120%)` 형식 · 미파싱 spec 소실 금지(REVIEW_LATER/HOLD) · 브래킷 기능성 원료별 분리 · 다음 영양소 끌림 추정귀속 금지 · functionsKo 선행 쉼표·공백 정리)은 **별도 단위**로 진행.
- `UNIT_MODIFIER_UG_RAE` 수정은 생산 select 과소추출을 해소하므로 **타 그룹 후보 재점검 권고**(누락 방향이라 기존 LIVE 콘텐츠 오염은 아님).

*정본 = 최종 큐 JSON · apply 는 사용자 승인 기반 · 독립검증 read-only(DB write 0).*
