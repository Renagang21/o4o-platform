# CHECK-O4O-OTC-HERBAL-EN-CANONICAL-PROMOTION-299-V1 — 은행엽·포도엽 en canonical 전환

WO: `WO-O4O-OTC-HERBAL-EN-CANONICAL-PROMOTION-299-V1` · 일자: 2026-07-17 · 상태: **완료 (적용·검증)**
근거: [HERBAL-EN-TRANSLATION-PERSIST](./CHECK-O4O-OTC-HERBAL-EN-TRANSLATION-PERSIST-299-V1.md)

> **상태 전환만.** content·summary **불변**(지문 md5 전후 동일) · ko canonical **불변** · INSERT/DELETE **0** · 단일 TX · 이중 게이트.

---

## 0. 결론

> **은행엽·포도엽 en 설명서 299건을 `needs_review` → `canonical` 로 상태만 전환. flip 299 / 지문 299/299 동일 / en needs_review 잔여 0 / ko canonical 불변 299 / ko↔en 연결 299 / 중복 0 / 재실행 no-op.**

---

## 1. 적용

| 항목 | 값 |
|---|---|
| 스크립트 | [`drug-otc-herbal-en-canonical-promotion.ts`](../../apps/api-server/src/scripts/drug-otc-herbal-en-canonical-promotion.ts) |
| 게이트 | `--apply` + `DRUG_OTC_HERBAL_EN_PROMOTE_CONFIRM=YES` |
| 대상 | en STORE(source_type=mfds_drug_otc) · 은행엽/포도엽 candidate(0736bb94·018897db) · status=needs_review |
| 변경 | `status: needs_review → canonical` · `updated_at` 갱신만 |

**실행 전 게이트**(전건 통과): en STORE 299 · needs_review 299 · 기존 en canonical 충돌 **0** · ko canonical 299 · 한글 0 · `<table>` 0 · 주석 0 · sd-warn.

---

## 2. 변경 증명 (지문)

- flip 대상 299건의 `content`·`summary` 지문(길이+본문+요약)을 전후 대조 → **299/299 동일**.
- 허용 변경 = `status` + `updated_at` 뿐. 본문·요약 무변경 증명.

---

## 3. 사후검증 (독립 재조회)

| 항목 | 결과 | 판정 |
|---|---|:---:|
| flip | **299** | ✅ |
| 지문 불변 | **299/299** | ✅ |
| en canonical | **299** (은행엽 203 + 포도엽 96) | ✅ |
| en needs_review 잔여 | **0** | ✅ |
| ko canonical 불변 | **299/299** | ✅ |
| ko↔en canonical 연결 | **299/299** | ✅ |
| en canonical (master) 중복 | **0** | ✅ |
| INSERT/DELETE | 0 | ✅ |
| 재실행 멱등 | needs_review 0 · flip **0** | ✅ |

> **gotcha**: `UPDATE … RETURNING` 결과가 `[rows, affected]` 형태라 첫 시도 `res.length`=2 로 오집계 → 게이트가 ROLLBACK(안전). `Array.isArray(res[0]) ? res[0] : res` 로 수정 후 재적용.

---

## 4. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 299건 canonical 전환 | ✅ flip 299 |
| 콘텐츠 변경 0 | ✅ 지문 299/299 동일 |
| 사후검증 통과 | ✅ §3 |
| commit·push | ✅ |

---

## 5. 정리 / 다음

- 은행엽·포도엽 **ko(299) + en(299) canonical 완결**.
- **다음(별건)**: 원문없음 115 master 는 원천 재수집 후 재판정(보류 유지). 별도 지시 대기.
