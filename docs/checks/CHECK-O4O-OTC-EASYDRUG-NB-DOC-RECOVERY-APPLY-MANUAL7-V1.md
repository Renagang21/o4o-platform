# CHECK-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-APPLY-MANUAL7-V1 — 수동 7건 적용

WO: `WO-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-APPLY-MANUAL7-V1` · 일자: 2026-07-17 · 상태: **완료 (적용·검증)**
근거: [MANUAL7 dry-run](./CHECK-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-MANUAL7-V1.md) · 화이트리스트 `recovery-whitelist-manual7.json`(7/21/en0)

> **ko canonical UPDATE 21만.** INSERT/DELETE **0** · 영문 **0** · 타 source_type **0** · 단일 TX · 이중 게이트.

---

## 0. 결론

> **수동 7 item_seq / ko canonical 21건 유실값 복원. UPDATE 21 / 사후검증 21/21. 이로써 e약은요 유실 복구 완결 — 누적 113 item_seq / 483 master.**

---

## 1. 적용

| 항목 | 값 |
|---|---|
| 스크립트 | [`drug-otc-easydrug-nb-doc-recovery-manual7.ts`](../../apps/api-server/src/scripts/drug-otc-easydrug-nb-doc-recovery-manual7.ts) |
| 게이트 | `--apply` + `DRUG_OTC_NB_RECOVERY_MANUAL7_CONFIRM=YES` (이중) |
| 크레아티닌 4 | `크레아티닌 청소율이` → `…&lt; 25 mL/min)`[+`\n\n`] (NB_DOC) · 14 master |
| pH 3 | `(pH` → `(pH &lt; 5.5)` (UD_DOC, 섹션끝 최소복구) · 7 master |

**행별 게이트**(전 21건 통과): find 1회 · 역치환 `after.replace(replace,find)===before` · 결과 값 존재 · 삼중개행 `)\n\n\n` 0 · 예상 7/21 불일치 ABORT.

---

## 2. 사후검증 (독립 재조회)

| 항목 | 결과 | 판정 |
|---|---|:---:|
| UPDATE / 트랜잭션 내 검증 | **21 / 21** | ✅ |
| 7 품목 전부 복구 | rows **21** / seqs **7** | ✅ |
| 값 복원(`&lt; 25 mL/min)` · `(pH &lt; 5.5)`) | **21** | ✅ |
| 삼중개행(`)\n\n\n`) | **0** | ✅ |
| 이중 escape(`&amp;lt;`) | **0** | ✅ |
| e약은요 ko canonical 전체 | **19,177**(불변) | ✅ |
| 수동7 master canonical 중복 | **0** | ✅ |
| 재실행 멱등 | 복원대상 **0** / 이미복원 **21** / UPDATE **0** | ✅ |

---

## 3. e약은요 유실 복구 누적 (완결)

| 단계 | item_seq | ko master |
|---|---:|---:|
| Tier1 (값+`)`) | 20 | 108 |
| Tier2 (값+`)`+경계) | 86 | 354 |
| **Manual7 (크레아티닌 4 + pH 3)** | **7** | **21** |
| **누적 복구** | **113** | **483** |

> 실측 재조회: 3 화이트리스트 item_seq(113) 의 ko canonical **483 row** — 기대 정확 일치. e약은요 크레아티닌·pH 유실 복구 **종료**.
> 미복구 잔여: NB근거부족 1(201906326) + 복구불필요 22(닫힘괄호만 유실=정보손실0). 조치 없음.

---

## 4. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 21건 최소 복구 | ✅ UPDATE 21 / 검증 21 |
| 허용된 값·괄호·문단 경계 외 변경 0 | ✅ 역치환·전체수 불변·중복0·이중escape0·삼중개행0 |
| 사후검증 통과 | ✅ §2 |
| 누적 113 item_seq / 483 master 확인 | ✅ §3 |
| commit·push | ✅ |

---

## 5. 다음

- e약은요 유실 복구 **종료**.
- **다음**: 첨가제 함유 master 서브그룹 분리·재승격([NB-DOC-BULK-FETCH](./CHECK-O4O-OTC-NB-DOC-BULK-FETCH-V1.md) 첨가제 지표 기반, [GROUP-SPLIT §5](./CHECK-O4O-OTC-GROUP-SPLIT-AUDIT-BATCH-13-V1.md)).
