# CHECK — HFF 액상 mL 재생산 shard 0 (Agent A) V1

- WO: `WO-O4O-HFF-LIQUID-ML-RECOVERY-A-V1` · 자동승인 계약 적용.
- 성격: **액상 잔여 재생산(자동 apply)** — 공용 parser·Guard mL 기준량 보강(`72d78afc9`) 기준으로 shard 0 액상 재생산.
- 종료 `2026-07-25 08:23 +0900`. 기존 액상 파이프라인(`hff-liquid-c-select`/`passfilter` + `hff-nutrient-generate`/`store-canonical-apply`) 재사용. 공용 parser/registry/composer/Guard/apply **무수정**.
- 선행 commit 확인: `72d78afc9`(액상 mL 기준량 검증+SPEC) ✓ · `3ed118f8c`(액상 mL shard-2) ✓ — 둘 다 origin/main 포함.

## 0. 결론

> **shard 0 액상 단일 기능성 신규 LIVE = 179** (mL 기준량 Guard 보강으로 재검증 통과).
> DB write **716**(179×4) · canonicalDup 0 · statementNo 중복 master 0 · stmtDupMasters 0 · 기존 LIVE drift 0 · **independentVerifyPass true**.
> 총 내용량 ↔ 기능성 원료량 분리 유지(예: 식이섬유 5g / 100mL). mL 기준량은 원료 직접연결 원문만 인정.

## 1. 퍼널 (기존 파이프라인 재사용)

| 단계 | 수 |
|---|:-:|
| shard 0(`stableHash%3=0`) 액상 not-taken stmt | 4,347 |
| `hff-liquid-c-select` ELIGIBLE pool | 194 (hold 1,590) |
| `hff-liquid-c-passfilter` Guard **PASS** | **179** (REVIEW/BLOCKED 15) |
| `hff-nutrient-generate` 작성 | 179 (PASS 179 · BLOCKED 0 · 자동HOLD 0) |
| **apply LIVE** | **179** |

- select servingForm: 포 130·병 24·mL 31·방울 7·팩 1·캡슐 1.
- passfilter 비-PASS 15 = `PRE-SRC-BASIS-UNVERIFIABLE-003`·`E-NAME-DERIVED-GROUNDED-002`·`H-MAKER-NO-OFFICIAL-EN-007` 등(개별 HOLD, 배치 계속).

## 2. mL 기준량 분리 검증 (72d78afc9 보강)

- 표본 stmt `2015001201277`: grounding `declaredAmount {value:5, unit:g, basisAmount:100, basisUnit:mL}` — **질량(원료 5g) ↔ 부피(기준 100mL) 교차매칭 정확**(총 내용량 아님).
- spec 렌더: "식이섬유 표시량(5g/100mL)의 80% 이상" — mL 기준량 = 원료 직접연결 원문 그대로. 질환/기능성 순화 0 · 원문 밖 주장 0 · 전문가 상담 footer 유지.
- basisUnit 분포: mL 기준량 원료가 이번 보강으로 PASS 편입(이전 REVIEW_LATER → 재생산).

## 3. 자동 apply 게이트 (전통과)

| 게이트 | 결과 |
|---|---|
| dry-run·postVerify | PASS · candidateMatch 179(missing/ambiguous 0) · 사전승격 0 · masterDup 0 · canonicalSpdDup 0 · BLOCKED 0 |
| 예상=실측 write | 716 = 179×4 |
| canonicalDup | 0 |
| apply(`HFF_NUTRIENT_APPLY_CONFIRM=YES`) | **COMMIT** · masters/spdKo/spdEn 179 · candidatesLinked 179 |
| 독립검증(새 연결, tag) | masters 179 · canonicalDup 0 · candidatesLinked 179 · spdRefLinked 358 · **stmtDupMasters 0** · **independentVerifyPass true** |

- tag `batch:single-nutrient-liq-s0-a1`. 롤백 매니페스트(createdMasters 179·createdSpd 358). **기존 LIVE drift 0**(신규 master INSERT + candidate 179 UPDATE).

## 4. 보고 요약

```text
종료 2026-07-25 08:23 +0900 · parser/Guard 72d78afc9 기준 · 공용 무수정 · 기존 액상 파이프라인 재사용
fresh 액상 후보: shard0 not-taken 4,347 → select pool 194 → Guard PASS 179
Guard PASS 179 / HOLD(select 1,590 + passfilter 15)
신규 LIVE 179 · DB write 716
HOLD 원인: select 총량/원료량 분리·serving 불명확 1,590 · passfilter PRE-SRC-UNVERIFIABLE/E-NAME/H-MAKER 15
canonicalDup 0 · statementNo 중복 master 0 · stmtDupMasters 0 · 기존 LIVE drift 0
독립검증 PASS
남은 후보: select-hold 1,590(다원료·serving 불명확·mL 미연결) + passfilter 15 held
중지 사유: 없음 (안전 PASS 액상 소진)
```

## 5. 산출물

- target: `docs/checks/data/product-description-guard/hff-liquid-a-shard0/liq-shard0-a1-target.json` (179, drafts+grounding).
- 롤백 매니페스트: `.../liq-shard0-a1-rollback-manifest.json` (masters 179·spd 358).
- 본 문서. (파이프라인 `hff-liquid-c-select`/`passfilter`·`hff-nutrient-*`는 기커밋, 무수정 재사용.)

---

*액상 mL 재생산 · 자동 apply. 공용 parser/Guard 72d78afc9 기준(무수정) · 총량↔원료량 분리 · 신규 LIVE 179 · DB write 716 · 독립검증 PASS · 기존 LIVE drift 0.*
