# CHECK-O4O-HFF-COMBO-C-COMPLETION-BATCH3-SHARD2-V1 — 완결형 생산 Batch 3 (shard 2, FNV-1a) (Agent C)

- 성격: **완결형 생산 (자동 apply)** — 조사 → KO/EN 설명서 → 디자인 → DB canonical → 검증 → commit/push. 사전 승인 반복 생산.
- 시작 `2026-07-22 14:41:02 +0900` · 종료 `2026-07-22 14:52:46 +0900` · 소요 **약 12분** (풀 한계로 조기 마감)
- 기준 commit: `cf95b9d5c` (Agent B: select statementNo 직접주입 + mga-TE 숫자인접 파서 gap 보강)
- 샤딩: **FNV-1a · shard-count 3 · Agent C = shard 2**. md5 미사용.

## 0. 결론

> **178건 복합형 STORE canonical LIVE 반영 완료 (자동 apply · 독립 사후검증 PASS).**
> 최종 totalComboLive(tag-agnostic 카드≥2) = **2,782**.
> canonicalDup 0 · 기존 LIVE drift 0 · DB write 712 (master 178 + candidate 178 + SPD ko 178·en 178).
> **목표(최소 500) 미달 — 시간 아닌 풀 고갈**: shard 2 미승격 fresh 가 187 뿐(3차 병렬 생산으로 소진). 가용분 전량 생산.

## 1. shard 계약 (FNV-1a)

- `hff-combo-select --shard 2 --shard-count 3 --exclude-taken --statement-nos-file` (공식 계약) 로 그룹별 생산.
- signature(정렬 키 `+` 결합)의 `FNV-1a % 3 == 2` 만 대상. select 가 shard 판정을 내부 재확인(교집합 0 보장).
- fresh shard 분포(FNV): shard0 238 · shard1 114 · **shard2 248**. 제외패밀리 제거 후 shard2 = 104그룹 / fresh 187.
- 발견은 `hff-combo-c-harvest`(batch-1 대비 drift 0 검증, 현 파서 사용)로 수행, 생산은 위 공식 select 로 수행.

## 2. 풀 고갈 (목표 미달 사유)

| 단계 | 수량 |
|---|---:|
| shard2 후보 stmt (104그룹) | 272 |
| `--exclude-taken` DB 제거(기승격/canonical 존재) | −86 |
| select ELIGIBLE | 186 |
| generate (auto-HOLD 5 = G-MULTI-AMOUNT-SOURCE) | 181 |
| 은닉 H1 제외 | −2 |
| REVIEW_LATER (PRE-SRC 1) | −1 |
| **READY** | **178** |

- batch-1(194)+batch-2(608) 및 병렬 에이전트(shard0/1)가 관절·항산화·비타민 조합을 대량 소진 → **shard 2 기능성앵커 잔여 0**.
- exclude-taken 이 272 중 86(32%)을 DB-taken 으로 제거 → 풀 고갈을 DB 로 재확인.
- 목표 500 은 가용 풀(187) 을 초과. **가용 전량(178) 생산 후 마감**. 다음 라운드 실익 없음(잔여 fresh ≈ 0).

## 3. mga-TE 파서 복구 (Agent B cf95b9d5c 효과)

- READY 178 중 **비타민E 포함 29** · 그중 **복구 9건**(mga-TE 숫자인접형 7 + ugRAE/RE 무공백형 2).
- 이전 파서는 `7mga-TE`(숫자 인접) / `700ugRAE`(수식어 결합) 를 `\b` 경계 부재로 놓쳐 비타민E spec 을 과소추출 → 불완전 signature. cf95b9d5c 보강으로 정상 포착.
- batch-2 REVIEW_LATER(H1) 16건은 복구된 signature 가 **shard 0/1 로 재배정**되어 본 shard(2) 밖 → 본 배치 미포함(교집합 0 준수).

## 4. 잔여 파서 gap (신규 발견 · 후속 WO 권고)

은닉 H1 2건은 **cf95b9d5c 이후에도 남은 비타민E 표기 변이**:

| 제품 | 변이 | 원인 |
|---|---|---|
| 우리 아이(eye) 튼튼 | `9mgɑ-TE` | `ɑ` = Latin small letter alpha (U+0271), 정규화가 다루는 `α`(U+03B1)·`a` 아님 |
| 유판씨 멀티 구미 딸기맛 | `11mg α-TE-/` | `α-TE` 뒤 **trailing dash** 후 `/` — SPEC_RE 수식어 후 `/` 기대와 불일치 |

- 조치: 2건 REVIEW_LATER 제외(불완전 signature 방지). **파서 보강(Latin ɑ 정규화 + `α-TE-` trailing dash 허용)은 별도 WO 권고**.

## 5. DB 반영 · 검증 (자동 apply)

사전 승인 게이트 **전통과 → 승인 질문 없이 자동 완결**:

| 게이트 | 결과 |
|---|---|
| dry-run | PASS · postVerifyPass ✓ · canonicalDup 0 → ROLLBACK(write 0) |
| 예상=실측 write | 712 = 178×4 ✓ |
| H1/H3 은닉 (READY) | 0 ✓ (2건 사전 제외) |
| apply (`--apply --skip-promoted`, 이중게이트) | **COMMIT 완료** · skipped 0 · postVerify masters/spdKo/spdEn/candidatesLinked 178 · canonicalDup 0 · spdRefLinked 356 |
| **독립 사후검증** (fresh 연결) | masters 178 · spdKo 178 · spdEn 178 · **canonicalDup 0** · candidatesLinked 178 · sourceHff 356 · **PASS** |

- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · regulatory_type=건강기능식품 · barcode NULL · candidate=approved_new_master.
- **기존 LIVE drift 0** · 롤백 매니페스트: `hff-combo-c-batch3-rollback-manifest.json` (masters 178·spd 356).

## 6. 보고 요약

```text
시작 14:41:02 · 종료 14:52:46 · 소요 12분 (풀 한계 조기 마감)
조사 signature 733 · shard2 대상 104그룹
READY 178 · REVIEW_LATER 3 (H1 2 + PRE-SRC 1) · HOLD(auto) 5
mga-TE 복구 포함 9 (mga-TE 7 + ugRAE/RE 2, 비타민E 포함 29)
KO 설명서 178 · EN 설명서 178
DB write 712 · canonicalDup 0 · 기존 LIVE drift 0
최종 totalComboLive 2,782
시간당 처리량 ≈ 890건 (풀 한계로 12분 조기 종료)
중지 사유: 없음 (shard 교집합 0 · 오귀속 0 · 독립검증 PASS)
```

## 7. 산출물

- 결과 JSON: `docs/checks/data/product-description-guard/hff-combo-c-batch3-completion.json`
- 롤백 매니페스트: `docs/checks/data/product-description-guard/hff-combo-c-batch3-rollback-manifest.json`
- 본 문서
