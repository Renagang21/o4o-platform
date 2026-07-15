# CHECK-O4O-OTC-EN-CANONICAL-PROMOTION-686-V1 — 영문 686건 canonical 전환 (APPLY 완료)

WO: `WO-O4O-OTC-EN-CANONICAL-PROMOTION-686-V1` · 일자: 2026-07-16 · 상태: **완료 (DB 적용됨)**
선행: [EN-PERSIST-APPLY-681](CHECK-O4O-OTC-EN-PERSIST-APPLY-681-V1.md) (686 저장) · 번역 사람 검수 완료

> ⚠️ **프로덕션 DB write** — **UPDATE 686 rows** (`needs_review` → `canonical`).
> INSERT **0** · DELETE **0** · **본문 수정 0** · 한국어 canonical **불변**.
> **이 전환으로 영문 설명서가 소비 화면에 노출된다** (`needs_review` 는 미표시, `canonical` 은 표시).

---

## 1. 결론

> **686건 전환 완료** (`dbWrite=686`). 영문 `needs_review` 잔여 **0**.
> **콘텐츠 지문이 전환 전후 완전히 동일** — 본문 변경 0이 해시로 증명됨.
> 사후검증 **전건 통과**. 재실행 **no-op 확인**.

---

## 2. 실행 전 확인 — 6항목 전건 통과

| 항목 | 기대 | 실측 |
|---|---|---:|
| 영문 `needs_review` | 686 | **686** |
| 한국어 canonical | 686 | **686** |
| ko↔en `master_id` 1:1 | 686 | **686** |
| `source_ref_id` 일치 | 686 | **686** |
| 기존 `STORE/en/canonical` 충돌 | 0 | **0** |
| 콘텐츠 청결(한글·주석·`<table>`·`sd-card`) | 0 | **0** |

> 전환 시뮬레이션도 미리 확인: 전환 후 `(master, STORE, en)` 중복 예상 **0**.

---

## 3. 실행

```text
전환 대상            : 686 (needs_review → canonical)
INSERT / DELETE      : 0 / 0 (문 없음 — grep 확인)
본문 수정            : 0 (SET = status, updated_at 뿐)
dbWrite(UPDATE)      : 686
```

| 안전 설계 | 구현 |
|---|---|
| 본문 미수정 | `SET status, updated_at` — `content`·`summary` 를 **SET 절에 두지 않음** |
| 한국어 불변 | `WHERE language='en'` 으로 잠김 + 커밋 전 ko 686 재확인 |
| 대상 수 가드 | 686 ≠ 실제 → **중단** |
| canonical 충돌 | 커밋 전 `(master, description_type, COALESCE(language,'ko'))` 중복 검사 → 있으면 **롤백** |
| INSERT·DELETE | 스크립트에 문 **0개** |

---

## 4. 사후검증 — 전건 통과

| # | 항목 | 기대 | 실측 | 결과 |
|---|---|---|---|:---:|
| ① | **영문 canonical** | 686 | **686** | ✅ |
| ② | **영문 `needs_review` 잔여** | 0 | **0** | ✅ |
| ③ | **한국어 canonical 불변** | 686 | **686** | ✅ |
| ④ | **콘텐츠 변경 0** | 지문 동일 | **`3a03f966…` = `3a03f966…`** | ✅ |
| ⑤ | **canonical 중복 0** | 0 | **0** (계약 기준) | ✅ |
| ⑥ | **ko↔en 연결 유지** | 686 | **686 pairs · source_ref_id 686/686** | ✅ |
| ⑦ | **재실행 no-op** | — | 사전 조건에서 **중단**(대상 0), 686 유지 | ✅ |

**콘텐츠 무변경 증명**

```text
apply 전 : md5(모든 content+summary 결합) = 3a03f9669f57f3a5e334d87d5a608a6f  (686 rows)
apply 후 : md5(모든 content+summary 결합) = 3a03f9669f57f3a5e334d87d5a608a6f  (686 rows)
```

**기존 데이터 무변경**: e약은요 canonical 19,177 · candidate 254 · nutrition_combo 1,915 · manual 72/42/30/19 — baseline 동일.

---

## 5. 실행 중 발생한 오류 1건 — 트랜잭션이 막았다

첫 apply 시도가 **`UPDATE 수 불일치: 2 ≠ 686`** 으로 실패·롤백됐다.

| 항목 | 내용 |
|---|---|
| **원인** | **TypeORM 이 `UPDATE … RETURNING` 을 `[rows, affected]` 로 돌려준다**(INSERT 는 rows 배열). `res.length` 를 그대로 세어 **2**가 나옴 — 실제로는 686행이 갱신된 상태였다 |
| **영향** | **0** — 롤백 확인: `needs_review 686` 그대로 · **콘텐츠 지문 불변** |
| **수정** | `Array.isArray(res[0]) ? res[0] : res` 로 **두 결과 형태를 모두 처리** |
| 재실행 | 사전 조건 6항목 재통과 → apply **686 성공** |

> 가드가 **정상 UPDATE 를 오판해 롤백**한 사례다. 데이터는 안전했고, 결과 형태를 확인한 뒤 재실행했다.
> (앞선 apply 의 `parse_param` 오류와 함께 — **단일 트랜잭션 + 수량 가드**가 두 번 다 부분 반영을 막았다.)

---

## 6. 현재 상태 — 영문 공개

| source_type | status | lang | rows | 소비 화면 |
|---|---|---|---:|---|
| `mfds_easy_drug` | canonical | ko | 19,177 | 표시 |
| `mfds_drug_otc_nutrition_combo` | canonical | ko | 1,915 | 표시 |
| **`mfds_drug_otc`** | **canonical** | **ko** | **686** | 표시 |
| **`mfds_drug_otc`** | **canonical** | **en** | **686** | **표시 (신규)** |

- **일반의약품 A군 37그룹이 한국어·영어 양쪽으로 공개**됐다.
- **rollback 경로**: `UPDATE … SET status='needs_review' WHERE source_type='mfds_drug_otc' AND language='en'` (686 rows). 콘텐츠는 그대로라 상태만 되돌리면 된다.

---

## 7. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 686건 canonical 전환 | ✅ |
| INSERT·DELETE 0 | ✅ (문 없음) |
| 본문 수정 0 | ✅ 지문 동일 |
| 사후검증 통과 | ✅ §4 |
| commit·push | ✅ |

---

## 8. 남은 것 (각각 별도 작업)

| 항목 | 비고 |
|---|---|
| **B군 608 약사 검토** | 23그룹. **생약 2그룹(은행엽 203 · 포도엽 96 = 299, B군의 49%) 우선** — 사유 동일(grounding 얇음) |
| **디자인 §8-A** | 주의사항·금기 전용 class 부재 — 검수 페이지에서 실물 확인됨. 렌더러 WO |
| 전개 불가 10건 | ATC 형식 groupKey |
| 디자인 §8-B/§8-C | 키오스크·다국어 랜딩 미전환 / 언어 전환 UI 4중 중복 |
| build 선행 결함 | 타 세션 `e41c78157`(content-guard) — 본 WO 무관 |
