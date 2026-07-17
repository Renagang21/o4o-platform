# CHECK-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-APPLY-TIER1-V1 — 유실 복구 Tier1 적용

WO: `WO-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-APPLY-TIER1-V1` · 일자: 2026-07-17 · 상태: **완료 (적용·검증)**
근거: [RECOVERY-DRYRUN](./CHECK-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-DRYRUN-V1.md) · 화이트리스트 `recovery-whitelist.json`(20/108/en0)

> **ko canonical UPDATE 108만.** INSERT/DELETE **0** · 영문 **0** · 타 source_type **0** · NB 전체대체 **0** · 단일 트랜잭션 · 이중 게이트.

---

## 0. 결론

> **자동 복구 20 item_seq / ko canonical 108건에 크레아티닌 청소율 값(`&lt; 10 mL/min`)과 닫는 괄호를 삽입 복원. UPDATE 108 / 사후검증 108/108. 대상 외 불변, 이중 escape·중복 0, 재실행 no-op.**

---

## 1. 적용

| 항목 | 값 |
|---|---|
| 스크립트 | [`drug-otc-easydrug-nb-doc-recovery-tier1.ts`](../../apps/api-server/src/scripts/drug-otc-easydrug-nb-doc-recovery-tier1.ts) |
| 게이트 | `--apply` + `DRUG_OTC_NB_RECOVERY_TIER1_CONFIRM=YES` (이중) |
| 대상 | `mfds_easy_drug` · `status=canonical` · `language=ko` · 화이트리스트 20 item_seq |
| 변경 | `find`("크레아티닌 청소율 ") → `replace`("크레아티닌 청소율 &lt; 10 mL/min)") — 값+`)` 삽입만 |
| 트랜잭션 | 단일 TX, 사후검증 실패 시 ROLLBACK |

**행별 안전 게이트**(전 108건 통과):
- `find` 콘텐츠 내 **정확히 1회** 출현.
- **역치환** `after.replace(replace, find) === before` (삽입분 외 무변경 증명).
- 결과에 `크레아티닌 청소율 &lt; 10 mL/min)` 존재.
- 예상 **20 item_seq / 108 row** 불일치 시 ABORT · 이상 1건이라도 ABORT.

---

## 2. 사후검증 (독립 재조회)

| 항목 | 결과 | 판정 |
|---|---|:---:|
| UPDATE 수 | **108** | ✅ |
| 트랜잭션 내 사후검증 | **108/108** (content===after + 값 존재) | ✅ |
| 20 품목 전부 복구 | rows **108** / seqs **20** / recovered **108** | ✅ |
| 이중 escape(`&amp;lt;`) | **0** | ✅ |
| e약은요 ko canonical 전체 | **19,177**(불변) | ✅ |
| 대상 master ko canonical 중복 | **0** | ✅ |
| 재실행 멱등 | 복원대상 **0** / 이미복원 **108** / UPDATE **0** | ✅ |

**유실 규모 변화**(엔티티 인식 집계 — 복구본은 `&lt;` 엔티티):

| | 값 존재(완전) | 값 유실(잔여) |
|---|---:|---:|
| 적용 전 | 3 | 145 |
| **적용 후** | **111**(=3+108) | **37**(=145−108) |

> 신규 복구형 `크레아티닌 청소율 &lt; 10 mL/min)` **108건**. 잔여 37 = 자동 외 7 item_seq(수동 6 + NB부족 1) — Tier2/수동 대상.
> ⚠️ 참고: `<`(literal) 기준 옛 정규식은 `&lt;`(엔티티) 복구본을 "유실"로 오집계함 — **검출 아티팩트이지 데이터 문제 아님**(LIKE `%&lt; 10 mL/min)%` 108 확증).

**HTML 렌더**: 저장값 `&lt;` = 유효 단일 엔티티(이중 escape 0) → ContentRenderer 렌더 시 `< 10 mL/min` 정상 표시(엔티티 정합으로 보장).

---

## 3. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 한국어 canonical 108건 최소 복구 | ✅ UPDATE 108 / 검증 108 |
| 허용된 삽입 외 콘텐츠 변경 0 | ✅ 역치환·전체수 불변·중복0·이중escape0 |
| 사후검증 통과 | ✅ §2 전항 |
| commit·push | ✅ |

---

## 4. 제외 / 다음

- 제외(WO): Tier2 수동 93 · 문단 경계 복원 · NB 전체 대체 · 영문 생성/수정.
- **다음**: Tier2 중 **문단 경계 이어붙은 86건**(354 master)의 복구 방식 확정 — 값+`)`+문단구분(\n\n) 삽입 모델 승인 후 별도 apply. 이어서 첨가제 서브그룹 분리.
