# CHECK-O4O-OTC-BULK-BATCH-01-EN-CANONICAL-PROMOTION-162-V1 — Batch 01 영문 canonical 전환

WO: `WO-O4O-OTC-BULK-BATCH-01-EN-CANONICAL-PROMOTION-162-V1` · 일자: 2026-07-17 · 상태: **완료 (적용·검증)**
근거: [BATCH-01 EN 전개](./CHECK-O4O-OTC-BULK-BATCH-01-EN-TRANSLATION-PERSIST-162-V1.md)

> **상태 전환만.** content·summary **불변**(지문 md5) · ko canonical **불변** · INSERT/DELETE **0** · Batch 02 **무관** · 단일 TX · 이중 게이트.

---

## 0. 결론

> **Batch 01 en 설명서 162건을 `needs_review` → `canonical` 로 상태만 전환. flip 162 / 지문 162/162 동일 / en needs_review 잔여 0 / ko canonical 162 불변 / ko↔en 정합 162 / 중복 0 / Batch 02 교집합 0 / 재실행 no-op. Batch 01 = 162 제품 ko·en canonical 완비 — 종료.**

---

## 1. 적용

| 항목 | 값 |
|---|---|
| 스크립트 | [`drug-otc-bulk-batch-01-en-canonical-promotion.ts`](../../apps/api-server/src/scripts/drug-otc-bulk-batch-01-en-canonical-promotion.ts) |
| 게이트 | `--apply` + `DRUG_OTC_BATCH01_EN_PROMOTE_CONFIRM=YES` |
| 대상 | en STORE(mfds_drug_otc) · 8그룹 candidate · status=needs_review |
| 변경 | `status: needs_review → canonical` · `updated_at` 갱신만 |

**실행 전 게이트(전건 통과)**: en needs_review **162** · ko canonical **162** · ko↔en(master_id·source_ref_id) **162** · 기존 en canonical 충돌 **0** · **Batch 02 교집합 0** · 한글·`<table>`·주석·이중 escape 0 · sd-warn.

---

## 2. 지문 검증 (변경 증명)

- 전환 대상 162건의 `content`·`summary` 지문(길이 + md5) 전후 대조 → **162/162 동일**.
- 허용 변경 = `status` + `updated_at` 뿐. 본문·요약 무변경 증명.

---

## 3. 사후검증 (독립 재조회)

| 항목 | 결과 | 판정 |
|---|---|:---:|
| flip / 지문 불변 | **162 / 162** | ✅ |
| en canonical | **162** | ✅ |
| en needs_review 잔여 | **0** | ✅ |
| ko canonical 불변 | **162** | ✅ |
| ko↔en master_id·source_ref_id 정합 | **162** | ✅ |
| en canonical 중복 | **0** | ✅ |
| Batch 02 교집합 / 제외 2그룹 변경 | 0 / 0 | ✅ |
| 재실행 멱등 | flip **0** | ✅ |

> 최종 상태: (mfds_drug_otc STORE) **en canonical 162 · ko canonical 162** · needs_review 0.

---

## 4. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 영어 162건 canonical 전환 | ✅ flip 162 |
| 상태 외 콘텐츠 변경 0 | ✅ 지문 162/162 |
| 한국어 canonical 변경 0 | ✅ 162 불변 |
| Batch 02 충돌 0 | ✅ 교집합 0 |
| 사후검증 통과 | ✅ §3 |
| commit·push | ✅ |

---

## 5. Batch 01 종료 · 다음

- **Batch 01 완결**: 8그룹 **162 제품에 한국어·영문 canonical 완비**(나프록센275·클로닉신125·이부프로펜200정/연질·아스피린100·디펜히드라민50·독시라민25·메코발라민500).
- **다음**: 제외 2그룹(알파칼시돌0.5 효능-용법·유육종증 / 글루코사민250 황색5호) 원문 누락 보완 WO → Batch 01-b 또는 다음 배치 편입.
- Batch 02(agent 나) · 원문없음 115 · combo · rx혼입 · 질정 · 피임약 = 계속 분리.
