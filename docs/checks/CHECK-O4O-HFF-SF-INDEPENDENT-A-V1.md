# CHECK — HFF 단일 기능성 관절·피부 계열 독립 소유 생산 (Agent A) V1

- WO: `WO-O4O-HFF-SF-INDEPENDENT-TODO-A-V1` · 자동승인 계약(조사·generate·dry-run·apply·독립검증·CHECK·commit·push 사전승인).
- 성격: **완결형 독립 생산** — Agent A 단독 소유(뮤코다당·단백·히알루론산·추가 관절/피부). 공용 pipeline `10399ac0e` 재사용, 공용 registry/parser/composer 수정 0.
- 시작 `2026-07-22 22:xx +0900` (진행 중, 라운드별 commit).
- 매장용 원칙: 공식 기능성/질환 표현 유지(순화 0), 원문 외 의학사실 0, 전문가 상담 footer 유지 — 정본 composer 준수 확인.

## 기준선 (새 DB 연결)

단일 기능성 LIVE 3,358 · 프로바이오틱스 767 · 복합형 4,527 · **canonicalDup 0** · **statementNo 중복 master 0**.

## 라운드 1 — 초기 소유 성분 (뮤코다당·단백 + 히알루론산)

| 성분 | slug | READY | PASS→LIVE | REVIEW_LATER | HOLD | tag |
|---|---|:-:|:-:|:-:|:-:|---|
| 뮤코다당·단백(콘드로이친) | mucopolysaccharide-protein | 54 | **51** | 3 | 0 | batch:single-functional-mucopolysaccharide-protein-a1 |
| 히알루론산 | hyaluronic-acid | 2 | **0** | 2 | 1 | — (generate PASS 0) |

### 뮤코다당·단백 51 LIVE (자동 apply · 독립검증 PASS)
- select readyTotal 54(all-shard, exclude-taken) → generate PASS 51 · REVIEW 3(D-CLAIM-GROUNDED-002·PRE-SRC-BASIS-UNVERIFIABLE-003, review-later) · BLOCKED 0 · composeErr 0.
- dry-run PASS: candMatch 51(missing/ambiguous 0) · masterDup 0 · 예상=실측 204=51×4 · postVerifyPass ✓.
- apply COMMIT: masters 51 · spdKo 51 · spdEn 51 · canonicalDup 0 · candidatesLinked 51.
- 독립검증(새 연결): masters/ko/en 51 · **canonicalDup 0** · spdRefLinked 102 · **stmtDupMasters 0** · **independentVerifyPass true**. 롤백 매니페스트 master 51·spd 102.
- 매장 원칙 실측: 공식 기능성 "관절 및 연골건강에 도움을 줄 수 있음" verbatim 유지 · 순화 0 · 전문가 상담 footer 유지.

### 히알루론산 0 LIVE
- readyTotal 2 → generate PASS 0(REVIEW 1 PRE-SRC-BASIS-UNVERIFIABLE-003 · BLOCKED 1) → apply 대상 0. 전량 REVIEW_LATER/HOLD. 개별 실패 → 다음 성분 계속.

### 라운드 1 집계
- **신규 LIVE 51 · DB write 204** · canonicalDup 0 · statementNo 중복 master 0 · 기존 LIVE drift 0.

## 라운드 2 — 추가 관절·피부 계열

registry-ready(공용 코드 수정 불요) 관절·피부 성분 전수 확인:

| 성분 | slug | 계열 | readyTotal | LIVE | 판정 |
|---|---|---|:-:|:-:|---|
| 로즈힙 | rosehip | 관절 | 0 | 0 | taken/EN-pending/non-parseable |
| 알로에전잎 | aloe-whole-leaf | 배변(≠관절/피부) | 5 | — | **소유 밖(배변활동)** 제외 |

- registry 14종 중 관절/피부 = 뮤코다당·단백(done)·히알루론산(done)·로즈힙(0). 나머지(인삼·키토산·홍국·콜레우스·돌외잎·키토올리고당·알로에전잎) = 면역·체지방·콜레스테롤·배변 → 타 계열, 미접근.
- **registry-ready 관절·피부 풀 소진.**

### PENDING_SHARED (공용 registry 추가 필요 — 강제 처리 안 함)
- **MSM**(관절, producible ~21) · **글루코사민**(관절, ~3): `SF_INGREDIENTS` 미등재 → 공용 registry 추가 필요. EN mapping(관절 및 연골건강)은 기존 `mapFunctionEn`으로 충족(config만 추가하면 즉시 생산). 근거 stmt = `hff-sf-research/sf-research-{msm,glucosamine}.json` readyStmts.
- 보스웰리아·초록입홍합·콜라겐·세라마이드: registry 미등재 + 일부 EN lookup 미확정.
- **강제 처리하지 않고 PENDING_SHARED 기록**(WO 운영 원칙 준수).

## 종합 (독립 소유 완결)

```text
시작 2026-07-22 22:xx · 종료 2026-07-22 23:00 +0900 (KST)
처리 성분: 뮤코다당·단백 / 히알루론산 / 로즈힙 (+ 알로에전잎 소유밖 제외)
성분별 대상→LIVE→REVIEW_LATER→HOLD:
  뮤코다당·단백  54→51→3→0
  히알루론산     2→0→2→1
  로즈힙        0→0→0→0
총 신규 LIVE 51 · 총 DB write 204 (master51+candidate51+SPD102)
canonicalDup 0 · statementNo 중복 master 0 · 기존 LIVE drift 0 · 독립검증 PASS
추가 발견·생산: registry-ready 관절/피부 소진(로즈힙 0). PENDING_SHARED: MSM~21·글루코사민~3(registry 추가 시 즉시 생산)
미완료 TODO: 없음(소유 registry-ready 풀 소진). 재개 위치 = 공용 registry에 MSM/글루코사민 등록 후 sf-select/generate/apply
중지 사유: 없음
```

---

*완결형 독립 생산 · 자동승인. 공용 pipeline(10399ac0e) 재사용 · registry/parser/composer 수정 0 · DB write 204 · 독립검증 PASS. 관절·피부 registry-ready 풀 소진, 잔여는 PENDING_SHARED.*
