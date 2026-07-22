# CHECK-O4O-HFF-COMBO-C-COMPLETION-BATCH2-JOINT-ANTIOX-V1 — 완결형 생산 2차 배치 (Agent C)

- 성격: **완결형 생산** — 조사 → KO/EN 설명서 → 디자인 → DB canonical 반영 → 검증 → commit/push 독립 완결.
- 시작 `2026-07-22 12:09:11 +0900` · 종료 `2026-07-22 13:05:44 +0900` · 소요 **약 56분**
- 담당: 기능성앵커(MSM·글루코사민·옥타코사놀·Q10·밀크씨슬·프로폴리스) 전량 + 비앵커 shard2/3. Agent A/B 대상 중복 금지.
- 소스: `G:/…/mfds-health-functional-food-info-raw.jsonl` (44,885)

## 0. 결론

> **608건 복합형 STORE canonical LIVE 반영 완료 (COMMIT · 독립 사후검증 PASS).**
> 최종 복합형 LIVE SSOT(tag-agnostic 카드≥2) = **2,421**.
> canonicalDup 0 · 기존 LIVE drift 0 · DB write 2,432 (master 608 + candidate 608 + SPD ko 608·en 608).
> 목표(최소 600) 충족. 767 READY 중 **159건은 동시 진행 타 에이전트가 선점**(정상 스킵, 아래 §4).

## 1. 단일 패스 harvester (핵심 도구)

per-group `hff-combo-select`(그룹당 ~37s) 대신 **코퍼스 1회 스캔(8s)** 으로 전 signature 의 production-ready
ComboSeed[] 를 동시 산출. 공용 하드닝 모듈(`parseSpecs`/`splitFunctions`/registry)을 그대로 사용.

- **drift 검증**: batch-1 실 select 9그룹 대비 eligible 카운트 **9/9 정확 일치, drift 0**.
- 산출: 738 signature · totalEligible 2,962 · totalFresh 1,710 (기제작 5,422 stmt 차감).

## 2. 그룹 선택 · 예약

- 선택: 기능성앵커 전량 + 비앵커 `md5(sig)%3==2`(shard2/3) = **344그룹 / fresh 812**.
- **예약 파일 조기 push**(`efdf1c2e8`): `hff-completion-reservations/agent-c-batch2.json` (812 signature/stmt). 타 에이전트 제외용.

## 3. 퍼널

| 단계 | 수량 |
|---|---:|
| fresh 후보(harvest, produced 차감) | 812 |
| DB dedup | 0 제거 (812 clean) |
| generate (KO/EN + G-MULTI + 표준 Guard) | 802 (auto-HOLD 10 = G-MULTI-AMOUNT-SOURCE) |
| 은닉 감사 H1 제외 | −16 |
| REVIEW_LATER (PRE-SRC 17 + Q-TRUNCATED 3, 1중복) | −19 |
| READY (race 前) | 767 |
| **동시 선점 스킵** | **−159** |
| **최종 COMMIT** | **608** |

## 4. 동시성 충돌 (159건 스킵)

apply preload 에서 767 중 **159건이 이미 승격**(masterDup 159 · canonicalSpdDup 159 일치) 확인.
태그 조사 결과 **타 에이전트 산출물**:

| 태그 | 건수 |
|---|---:|
| `nc2-*` (Agent A batch2: mg-vd-ca 41·vd-ca 29·mg-mn-vd-vk-ca 12·mg-mn-vd-ca 11) | 93 |
| `nc2b-*` (cu-zn 7·biotin-se-zn 6) | 13 |
| `combo-sh1-g*` (shard1 에이전트, g5~g46) | 44 |
| … | 159 |

- 원인: 내 예약 push(12:16) 이전 타 에이전트가 동일 stmt 선점 추정. `combo-sh1-*` = shard1 존재 → 샤딩 스킴이 이미 가동 중이나 내 `md5%3` 파티션과 방식이 달라 shard1 과 겹침.
- 처리: apply 를 **race-tolerant** 로 보강 — `--skip-promoted`(기본 off) 로 승격/마스터/SPD 존재 candidate 를 **트랜잭션 내에서 제외**하고 나머지만 원자적 적재. abort 반복(whack-a-mole) 회피, DB 무결성 유지.
- **중지 아님**: 개별 충돌 제품 스킵으로 계속(운영원칙). 내 apply 가드가 오염을 정상 차단(부정 write 0).

## 5. 은닉 기능성 감사 (생산 전, 전수)

| 검사 | 결과 |
|---|---|
| H3 (미분류 spec 라벨) | **0 / 812** (파서 안전망 유효) |
| H1 (signature 밖 분류가능 원료 규격 존재) | **16 → 전량 REVIEW_LATER 제외** |

- H1 16건 = 비타민E 13 · 비타민B2 2 · 나이아신 1. 대부분 **`Ndigit+mga-TE` 무공백 표기**(예 `7mga-TE`)로 `normalizeSpecText` 의 `\bmg…a-TE` 정규화가 단어경계 부재로 실패 → 비타민E spec 미포착 → **불완전 signature**. 리버케어지티(1차)와 동류의 파서 gap.
- 조치: 16건 개별 제외(REVIEW_LATER). **파서 수정(digit-인접 mga-TE 정규화)은 별도 WO 권고** — 수정 시 비타민E 포함 조합이 추가로 수확됨(향후 확장 여지).

## 6. DB 반영 · 검증

| 단계 | 결과 |
|---|---|
| dry-run(exec+rollback) | postVerifyPass ✓ · canonicalDup 0 → ROLLBACK(write 0) |
| **승인** | 사용자 COMMIT 승인 (767 기준, 스킵 후 608 = 승인 부분집합) |
| apply (`--apply --skip-promoted`, 이중게이트) | **COMMIT 완료** · skipped 159 · 트랜잭션내 postVerify masters/spdKo/spdEn/candidatesLinked 608 · canonicalDup 0 · spdRefLinked 1216 |
| **독립 사후검증** (fresh 연결) | masters 608 · spdKo 608 · spdEn 608 · **canonicalDup 0** · candidatesLinked 608 · sourceHff 1216 · **PASS** |

- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · regulatory_type=건강기능식품 · mfds_permit_number=STTEMNT_NO · barcode NULL · candidate=approved_new_master.
- **기존 LIVE drift 0** (INSERT-only + canonicalDup 0). 롤백 매니페스트: `hff-combo-c-batch2-rollback-manifest.json` (masters 608·spd 1216·skipped 159).

## 7. 코드 변경 (additive · 하위호환)

| 파일 | 변경 |
|---|---|
| `hff-nutrient-store-canonical-apply.ts` | `--skip-promoted`(기본 off) — 동시 생산 레이스에서 승격된 candidate 를 배치 abort 대신 트랜잭션 내 제외. 기존 A/B 동작 불변. |
| `hff-combo-c-categorize.ts` | REVIEW_LATER 규칙에 `Q-TRUNCATED-PARTIAL-005` 추가 + `--exclude`(은닉 stmt) 지원. |
| 신규 | `hff-combo-c-harvest.ts`(단일패스 수확·drift 검증) · `hff-combo-c-pool-hidden-audit.ts` · `hff-combo-c-tag-probe.ts` |

## 8. 보고 요약

```text
시작 12:09:11 · 종료 13:05:44 · 소요 56분
조사 그룹 344 (기능성앵커 전량 + 비앵커 shard2/3)
READY 608 · REVIEW_LATER 35 · 동시선점 스킵 159 · auto-HOLD 10
KO 설명서 608 · EN 설명서 608 · 디자인(sd-card KO/EN) 608쌍
dry-run write 0 · 실제 DB write 2,432
canonicalDup 0 · 기존 LIVE drift 0 · 은닉 H1 16 제외 · H3 0
최종 복합형 LIVE SSOT(tag-agnostic) 2,421
시간당 처리량 ≈ 651건/시간
중지 사유: 없음 (159 동시충돌은 skip-promoted 로 원자 처리, DB 무결성 유지)
```

## 9. 산출물

- 결과 JSON: `docs/checks/data/product-description-guard/hff-combo-c-batch2-completion.json`
- 롤백 매니페스트: `docs/checks/data/product-description-guard/hff-combo-c-batch2-rollback-manifest.json`
- 예약: `docs/checks/data/product-description-guard/hff-completion-reservations/agent-c-batch2.json`
- 본 문서
