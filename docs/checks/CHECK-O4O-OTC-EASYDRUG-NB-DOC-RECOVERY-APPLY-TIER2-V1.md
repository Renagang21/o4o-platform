# CHECK-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-APPLY-TIER2-V1 — 유실 복구 Tier2 적용

WO: `WO-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-APPLY-TIER2-V1` · 일자: 2026-07-17 · 상태: **완료 (적용·검증)**
근거: [RECOVERY-DRYRUN-TIER2](./CHECK-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-DRYRUN-TIER2-V1.md) · 화이트리스트 `recovery-whitelist-tier2.json`(86/354/en0)

> **ko canonical UPDATE 354만.** INSERT/DELETE **0** · 영문 **0** · 타 source_type **0** · NB 전체대체 **0** · 단일 TX · 이중 게이트.

---

## 0. 결론

> **경계검토 86 item_seq / ko canonical 354건에 크레아티닌 청소율 값(`&lt; 25/10 mL/min`)·닫는 괄호·문단 경계(`\n\n`)를 복원. UPDATE 354 / 사후검증 354/354. 결과 전건 `값)\n\n다음문단` 구조, 삼중개행·이중 escape·중복 0, 재실행 no-op.**

---

## 1. 적용

| 항목 | 값 |
|---|---|
| 스크립트 | [`drug-otc-easydrug-nb-doc-recovery-tier2.ts`](../../apps/api-server/src/scripts/drug-otc-easydrug-nb-doc-recovery-tier2.ts) |
| 게이트 | `--apply` + `DRUG_OTC_NB_RECOVERY_TIER2_CONFIRM=YES` (이중) |
| 대상 | `mfds_easy_drug` · `canonical` · `ko` · 화이트리스트 86 item_seq |
| 변경 | 항목별 `find`→`replace`: 값+`)`+`\n\n`(경계 유실 75) / 값+`)` 만(`\n\n` 생존 11) |
| 값 | 84× `&lt; 25 mL/min)`(에르도스테인) · 2× `&lt; 10 mL/min)`(세티리진) |

**행별 안전 게이트**(전 354건 통과):
- `find` 정확히 **1회** 출현 · **역치환** `after.replace(replace, find)===before` · 결과에 `<값>)` 존재 · **삼중개행 `)\n\n\n` 0**.
- 예상 **86 item_seq / 354 row** 불일치 시 ABORT · 이상 1건이라도 ABORT.

---

## 2. 사후검증 (독립 재조회)

| 항목 | 결과 | 판정 |
|---|---|:---:|
| UPDATE / 트랜잭션 내 검증 | **354 / 354** | ✅ |
| 86 품목 전부 복구 | rows **354** / seqs **86** | ✅ |
| 값 복원(`&lt; 25/10 mL/min)`) | **354** | ✅ |
| 문단 경계(`mL/min)\n\n`) | **354** | ✅ |
| 삼중개행(`)\n\n\n`) | **0** | ✅ |
| 이중 escape(`&amp;lt;`) | **0** | ✅ |
| e약은요 ko canonical 전체 | **19,177**(불변) | ✅ |
| 대상 master canonical 중복 | **0** | ✅ |
| 재실행 멱등 | 복원대상 **0** / 이미복원 **354** / UPDATE **0** | ✅ |

**복구 구조**(2유형, 결과 동일 `값)\n\n독립문단`):
```
값+\n\n(75): (크레아티닌 청소율 이 약을…  → (크레아티닌 청소율 &lt; 10 mL/min)\n\n이 약을…
값만(11):   (크레아티닌청소율이\n\n이 약을… → (크레아티닌청소율이&lt; 25 mL/min)\n\n이 약을…
```

---

## 3. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 한국어 canonical 354건 최소 복구 | ✅ UPDATE 354 / 검증 354 |
| 허용된 값·문단 경계 외 변경 0 | ✅ 역치환·전체수 불변·중복0·이중escape0·삼중개행0 |
| 사후검증 통과 | ✅ §2 전항 |
| commit·push | ✅ |

---

## 4. 누적 복구 현황

| 단계 | item_seq | ko master |
|---|---:|---:|
| Tier1(값+`)`) | 20 | 108 |
| **Tier2(값+`)`+경계)** | **86** | **354** |
| **누적 복구** | **106** | **462** |
| 잔여(수동) | 7 | 21 |

---

## 5. 제외 / 다음

- 제외(WO): pH 3 · 앵커 비고유 4(수동 7건 / 21 master) · NB 전체 대체 · 영문.
- **다음**: 수동 7건(pH 값·앵커 비고유) 건별 처리 → 첨가제 함유 master 서브그룹 분리.
