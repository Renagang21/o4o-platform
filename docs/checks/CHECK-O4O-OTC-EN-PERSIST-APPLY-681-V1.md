# CHECK-O4O-OTC-EN-PERSIST-APPLY-681-V1 — 영문 681건 저장 (APPLY 완료)

WO: `WO-O4O-OTC-EN-PERSIST-APPLY-681-V1` · 일자: 2026-07-16 · 상태: **완료 (DB 적용됨)**
선행: [FANOUT-DESIGN](CHECK-O4O-OTC-EN-GROUP-TO-MASTER-FANOUT-DESIGN-V1.md) · [TRANSLATION-BATCH-37](CHECK-O4O-OTC-EN-TRANSLATION-BATCH-37-V1.md) · **사람 검수 완료**

> ⚠️ **프로덕션 DB write** — 영문 **681 rows INSERT**. UPDATE **0** · DELETE **0** · 한국어 변경 **0** · canonical 전환 **0**.

---

## 1. 결론

> **681건 저장 완료** (`dbWrite=681`). 영문 `needs_review` 총 **686** = ko canonical **686** 과 1:1.
> 사후검증 **10항목 전건 통과**. 재실행 **no-op 확인**.

---

## 2. APPLY 결과

```text
번역 파일            : otc-en-translations-v1.json (37건, GUIDE V0.5 / GLOSSARY V0.4)
그룹(ko canonical)   : 37
전체 master          : 686
기존 en 제외         : 5      ← 파일럿 저장분
그룹 간 master 중복  : 0
보류 그룹            : 0
예상 INSERT rows     : 681
예상 UPDATE rows     : 0 (UPDATE 문 없음)
status               : needs_review (canonical 공개 전환은 별도 작업)
dbWrite              : 681
```

| 저장 계약 | 값 |
|---|---|
| `description_type` | `STORE` |
| `language` | `en` |
| `status` | **`needs_review`** |
| `source_type` | `mfds_drug_otc` |
| `source_ref_id` | **한국어 canonical 의 값 그대로** |
| 전개 기준 | **저장된 한국어 canonical 행** (재계산 없음 → ko/en 축 불일치 불가) |

---

## 3. 사후검증 — 전건 통과

| # | 항목 | 기대 | 실측 | 결과 |
|---|---|---|---|:---:|
| ① | **신규 영문** | 681 | **681** (`dbWrite`) | ✅ |
| ② | **전체 영문 `needs_review`** | 686 | **686** (`en`/`STORE`/`needs_review`) | ✅ |
| ③ | **한국어 canonical 불변** | 686 | **686** | ✅ |
| ④ | **ko↔en `master_id` 연결** | 686 | **686 pairs** | ✅ |
| ⑤ | **`source_ref_id` 일치** | 686 | **686/686** | ✅ |
| ⑥ | **한글 잔존** | 0 | **0** | ✅ |
| ⑦ | **내부 주석 노출** | 0 | **0** (`&gt;` 0 · 주석 문구 0) | ✅ |
| ⑧ | **`sd-card` 적용** | 686/686 | **686/686** | ✅ |
| ⑨ | **`<table>`** | 0 | **0** | ✅ |
| ⑩ | **중복** | 0 | en STORE 중복 **0** · canonical 계약 중복 **0** | ✅ |
| ⑪ | **재실행 no-op** | — | 재실행 시 `예상 INSERT 0 ≠ 681` **중단**, 행 수 **686 유지** | ✅ |
| ⑫ | **파일럿 5건 변경 0** | 5 | 기존 5행 **그대로**(created_at 불변) | ✅ |

**기존 데이터 무변경**: e약은요 canonical 19,177 · nutrition_combo 1,915 · manual 72/42/30/19 — baseline 과 동일. **UPDATE·DELETE 문이 스크립트에 0개**(grep 확인).

---

## 4. apply 중 발생한 오류 1건 — 트랜잭션이 막았다

첫 apply 시도가 **실패하고 롤백**됐다.

```text
PostgreSQL: parse_param.c / variable_coerce_param_hook
INSERT … SELECT mid, $3, $4, $2, $5::uuid, $6, $7, $8 …
WHERE … s.description_type = $8 AND s.language = $7
```

| 항목 | 내용 |
|---|---|
| **원인** | `$7`(language)·`$8`(description_type)이 **SELECT 목록과 WHERE 비교에 동시 사용**돼 파라미터 타입 추론이 충돌 |
| **영향** | **0** — 트랜잭션 롤백으로 행 수가 **5(파일럿) 그대로** 유지됨을 즉시 확인 |
| **수정** | `$7::varchar` · `$8::varchar` 명시 캐스트 (SELECT·WHERE 양쪽) |
| 검증 | 재-dry-run 681 확인 후 apply → **681 성공** |

> 부분 저장이 남지 않았다 — 단일 트랜잭션 + 실패 시 롤백 설계가 실제로 작동했다.

---

## 5. 안전 조건 대조

| 조건 | 결과 |
|---|---|
| 예상 INSERT ≠ 681 → 중단 | ✅ 재실행에서 **실제로 중단**(0 ≠ 681) |
| 그룹 수 ≠ 37 → 중단 | ✅ 가드 존재 |
| master 중복 → 중단 | ✅ 그룹 간 중복 0, 가드 존재 |
| **UPDATE·DELETE 금지** | ✅ 스크립트에 문 **0개** |
| 한국어 설명서 변경 금지 | ✅ ko 686 불변 |
| **`bodyMarkdown` 사용 금지** | ✅ 번역 JSON → sd-* HTML. 빌더 입력 타입에 없음 |
| 기존 파일럿 영문 5건 변경 금지 | ✅ 제외 + `NOT EXISTS` 이중 방어 |

---

## 6. 현재 상태

| source_type | status | lang | rows |
|---|---|---|---:|
| `mfds_easy_drug` | canonical | ko | 19,177 |
| `mfds_drug_otc_nutrition_combo` | canonical | ko | 1,915 |
| **`mfds_drug_otc`** | **canonical** | **ko** | **686** |
| **`mfds_drug_otc`** | **needs_review** | **en** | **686** ← 신규 681 포함 |

- **영문은 소비 화면에 노출되지 않는다** (`needs_review`) — 공개는 canonical 전환 후.
- **rollback 경로**: `source_type='mfds_drug_otc' AND language='en'` (686 rows).

---

## 7. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 681건 INSERT 완료 | ✅ |
| UPDATE·DELETE 0 | ✅ |
| 사후검증 전건 통과 | ✅ §3 |
| commit·push | ✅ |

---

## 8. 남은 것

| 항목 | 비고 |
|---|---|
| **영문 `canonical` 공개 전환** | **별도 작업** (WO 명시). 전환 시 (master, STORE, en) 유일 인덱스가 적용된다 |
| B군 608 약사 검토 | 생약 2그룹(은행엽 203 · 포도엽 96) 우선 |
| 전개 불가 10건 | ATC groupKey |
| 디자인 §8-A | 주의사항 전용 class 부재 — 검수 페이지에서 확인된 한계 |
| build 선행 결함 | 타 세션 `e41c78157`(content-guard) — 본 WO 무관 |
