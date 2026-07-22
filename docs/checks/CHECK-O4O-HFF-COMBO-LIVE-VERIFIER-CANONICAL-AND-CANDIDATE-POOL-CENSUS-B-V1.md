# CHECK — HFF 복합형 verifier 정본화(tag-agnostic) + 신규 대량 후보 풀 census (Agent B) V1

- 성격: **read-only · DB write 0 · generate/apply 0 · registry 수정 0**.
- SSOT 기준선: totalComboLive **3,845**.
- 도구: Cloud SQL Auth Proxy 5433 · 공용 파서 `hff-source-parse.ts`.

---

## 작업 1 — 복합형 verifier 정본화

### 1-1. 정본 verifier
**`apps/api-server/src/scripts/hff-combo-live-verify.ts`** (tag-agnostic). 정의:

```text
description_type='STORE' · status='canonical' · deleted_at IS NULL
· language='ko' · source_type='o4o_hff_generated'
· 원료 카드 수 ≥ 2 · distinct master 집계
```

- **원료 카드 마커** = `</b><ul class="sd-why">` (combo compose 의 원료별 기능성 카드). combo=원료수 N(≥2), single=0. **tag(batch:*) 비의존.**
- 실행 결과: **totalComboLive = 3,845 (SSOT 정확 재현)** · **canonicalDup 0** · **statementNo 중복 master 0**.
- 부가: single-nutrient LIVE 3,912 · en 대칭 복합형 canonical 3,845(ko와 동수) · ko STORE canonical master 총 7,757.

### 1-2. 카드 수(원료 수) 분포 — 복합형 3,845
| cards | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| masters | 1392 | 912 | 525 | 343 | 278 | 73 | 108 | 78 | 45 | 26 | 25 | 13 | 8 | 10 | 5 | 1 | 1 | 2 |

### 1-3. 기존 tag 기반 집계 폐기(회귀 근거)
`hff-combo-verifier-regression.ts` 실측:

| 방식 | 복합형 master |
|---|--:|
| **tag-agnostic 정본** | **3,845** |
| tag `combo-%` 접두 only | 2,923 |
| **과소집계** | **-922** |

- distinct batch tag **368종** → allowlist 유지 불가. 복합형인데 batch tag 없는 master **0**(전건 태그 보유)이나 `combo-%` 접두가 아닌 slug(`nc-vd-vk`·`vd-ve`·`b-complex-n8`·`nc2-*` 등)가 922 누락.
- 최근 A/B/C 배치 커버리지 확인: `vd-ve` 24 · `vd-se-zn` 8 · `combo-vd-ca` 45 · `g13-6mineral` 10 — 전부 정본 집계에 포함.
- 조치: `hff-combo-verify-committed.ts` 의 **전역 `totalComboLive`/`existingTotal`(combo-% + allowlist) 집계에 DEPRECATED 명시**. 단일 배치 postVerify(`--slug --expect`) 용도만 유지. **향후 모든 생산 CHECK 의 전역 복합형 집계는 `hff-combo-live-verify.ts` 를 정본으로 인용한다.**

---

## 작업 2 — 신규 대량 후보 풀 census

`hff-candidate-pool-census.ts` · `hff-single-functional-producible.ts` · `hff-probiotics-remaining-probe.ts`. 스캔 = HFF 후보 **41,261** (active) · 이미 생산된 master 7,757.

### 2-1. 우선 원료군 raw/생산/제형
| 원료군 | raw | 이미 생산(matched) | 액상(미지원) | 고형 잔여 |
|---|--:|--:|--:|--:|
| **유산균/프로바이오틱스** | 5,920 | 692 | 120 | **5,114** |
| **식이섬유계**(프락토올리고당 등) | 2,298 | 77 | 499 | 1,743 |
| **홍삼** | 3,186 | 234 | **2,555** | 453 |
| **알로에** | 200 | 1 | 139 | 60 |

- 홍삼은 **액상이 80%**(대표 제형) → 고형만 453. 알로에도 액상 우세.
- 유산균은 고형(분말·캡슐) 우세 → 잔여 최대.

### 2-2. 미등재 다빈도 단일 기능성 원료 (pure-single, bracket=1, 고형·미생산)
| 원료 | pure-single | 이미 생산 | 고형 잔여 | registry |
|---|--:|--:|--:|:--:|
| **프로바이오틱스** | 643 | 234 | **403** | 미등재(전용 파이프라인 有) |
| 바나바잎추출물 | 51 | 0 | 46 | 미등재 |
| 포스파티딜세린 | 46 | 0 | 46 | 미등재 |
| 히알루론산 | 41 | 0 | 30 | 미등재 |
| 헤마토코쿠스추출물 | 20 | 0 | 20 | 미등재 |
| 쏘팔메토열매추출물 | 19 | 0 | 19 | 미등재 |
| 홍경천추출물 | 13 | 0 | 13 | 미등재 |
| 회화나무열매추출물 | 13 | 0 | 13 | 미등재 |
| 홍국 | 13 | 0 | 12 | 미등재 |
| 대두이소플라본 | 8 | 0 | 6 | 미등재 |
| **합계(고형 잔여)** | | | **608** | |

> pure-single(bracket=1)은 **보수적 하한**. 번호목록 포맷 MAIN_FNCTN 은 제외되므로 group-level solidAvail(유산균 5,114)이 상한. 실제 producible 은 그 사이.

### 2-3. registry 준비 여부 / 신규 KO/EN 기능성 필요
- **어느 우선 원료도 `hff-nutrient-registry.ts` 미등재.** 단, **유산균(고형)·액상은 전용 apply 파이프라인 존재** (`hff-probiotics-solid-store-canonical-apply.ts` = env 파라미터화 generic 계약 재사용, `hff-liq-store-canonical-apply.ts`).
- 신규 단일 원료 5종(바나바잎·포스파티딜세린·히알루론산·헤마토코쿠스·쏘팔메토)은 **원료별 공식 인정 기능성 KO/EN 1세트 grounding + composer 경로**가 선행조건. **문구 임의 생성 금지**(공식 원문 grounding 필수).

### 2-4. shard 0/1/2 분포
- **원료-축 shard**(=hff-combo-select signature 방식)는 단일 기능성에 **부적합**: 프로바이오틱스 단독이 shard1 을 독점(shard0=0). skew 심함.
- **stmt-축 shard** 는 균형: 프로바이오틱스 잔여 403 → shard **0:131 / 1:149 / 2:123**. → 단일 기능성 병렬은 **stmt-축 3-way** 권장.

---

## 3. realistic producible & 10~15h 우선순위

| 순위 | 원료군 | realistic producible | 착수 조건 | 근거 |
|:--:|---|--:|---|---|
| **1** | **프로바이오틱스(고형)** | **403** (bracket) ~ 수천(group) | **즉시** — 전용 파이프라인 generic 재사용, registry 무변경 | 부분생산 234, 파이프라인 검증됨 |
| 2 | 신규 단일 5종(바나바잎·PS·히알루론산·헤마토코쿠스·쏘팔메토) | ~161 | 원료별 KO/EN 기능성 grounding + composer | clean single, 소량 |
| 3 | 식이섬유계 | 최대 1,743 | 프리바이오틱스 기능성 귀속 **재검증** 선행 | Agent A fiber+zn DROP 이력(귀속 실패) |
| 4 | 홍삼(고형) | 453 | 전용 라인, 액상 정책 제외 | 액상 2,555 미지원 |
| 5 | 알로에 | 60 | 소량·액상 우세 | 저우선 |

**10~15h 현실 총량**: 프로바이오틱스 403(즉시) + 신규 5종 161(grounding 후) ≈ **560 clean single-functional**. 식이섬유 재검증 통과 시 +대량(≤1,743).

**권장 다음 배치**: **프로바이오틱스 잔여 고형 403 — stmt-축 3-way shard(131/149/123)**. 전용 파이프라인 재사용, registry 무변경, 즉시 착수 가능. 신규 단일 5종은 원료별 기능성 grounding WO 를 병행 준비.

---

## 4. 보고 요약

```text
verifier 정본 경로:   apps/api-server/src/scripts/hff-combo-live-verify.ts (tag-agnostic)
totalComboLive 재현:  3,845 (== SSOT)
canonicalDup:         0
statementNo 중복:     0
tag 기반 폐기:        combo-% 접두 2,923 (−922 과소) · 368 tag → allowlist 불가. hff-combo-verify-committed 전역집계 DEPRECATED
신규 원료군 realistic(고형 잔여):
  프로바이오틱스 403(hard) / 유산균 group 5,114(soft) · 식이섬유계 1,743 · 홍삼 453 · 알로에 60
  신규 단일: 바나바잎46·PS46·히알루론산30·헤마토코쿠스20·쏘팔메토19 (합 161)
shard(프로바이오틱스 403, stmt-축): 0:131 / 1:149 / 2:123 (균형) — 원료-축은 skew라 부적합
10~15h 가능 총량:     ~560 clean(프로바이오틱스 403 즉시 + 신규 5종 161 grounding 후), 식이섬유 재검증 시 +≤1,743
권장 다음 배치:       프로바이오틱스 잔여 403 (stmt-축 3-way), registry 무변경 즉시 착수
```

---

*read-only · DB write 0 · generate/apply/registry 수정 0. 생산은 승인·이중게이트 후 별도 WO.*
