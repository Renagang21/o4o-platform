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

## 라운드 2 — 추가 관절·피부 계열 (진행)

- registry-ready 후보(공용 코드 수정 불요): **로즈힙(rosehip · 관절)**. 인삼/키토산/홍국/콜레우스/돌외잎/키토올리고당 = 면역·체지방·콜레스테롤 → 타 에이전트 계열(제외).
- 공용 코드 변경 필요 성분 → PENDING_SHARED 기록 후 다음 진행.

*(라운드별 갱신)*

---

*완결형 독립 생산 · 자동승인. 공용 pipeline(10399ac0e) 재사용 · registry/parser/composer 수정 0. 라운드별 commit·push.*
