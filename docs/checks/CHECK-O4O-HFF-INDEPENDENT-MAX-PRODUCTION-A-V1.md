# CHECK-O4O-HFF-INDEPENDENT-MAX-PRODUCTION-A-V1

> WO: **WO-O4O-HFF-INDEPENDENT-MAX-PRODUCTION-A-V1** — Agent A (관절·간·피부 영역)
> 계약: WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1 (조사→최소보완→생성→dry-run→apply→독립검증→CHECK→path-specific commit)
> 상태: **CLOSED** — 핵심 3성분 생산 완료, 잔여 성분 근거기반 HOLD/PENDING_SHARED

---

## 1. 개요

Agent A 는 관절·간·피부 영역 성분을 독립 소유하고, 기존 공용 canonical 파이프라인
(select → generate → dry-run → apply)으로 안전 생산 가능한 만큼 생산했다.
타 에이전트(B/C) 산출물은 대기/통합하지 않았으며, 성분 교집합 0 을 유지했다.

- **매장용 설명서 원칙 준수**: 질환명·증상명·전문 기능성 표현을 공식 grounding 원문에서 삭제/완화하지 않음.
  소스에 없는 의학적 사실 추가 0. 매장 내 전문가 문의 footer 유지.
- **파이프라인 원칙 준수**: 공용 parser/composer/apply 복제 0. 병렬 세션 수정 중 공용 파일 미접촉.
  즉시 생산 불가 성분만 PENDING_SHARED 로 기록하고 다음 성분 계속.

---

## 2. 성분별 결과

| # | 성분 | 도메인 | 후보(MAIN_FNCTN 언급) | 이번 세션 신규 LIVE | 누적 LIVE(tag) | 판정 |
|---|------|--------|---------:|---------:|---------:|------|
| A-01 | MSM | 관절 | — | **12** | 352 masters | ✅ 생산·소진 |
| A-02 | 글루코사민 | 관절 | — | **7** | 87 masters | ✅ 생산·소진 |
| A-03 | 밀크씨슬 | 간 | — | **8** | 177 masters | ✅ 생산·소진 |
| A-04 | 보스웰리아 | 관절 | 50 | 0 | — | ⏸ HOLD (pure-single producible=2 < elig≥4 게이트) |
| A-05 | 초록입홍합 | 관절 | 27 | 0 | — | 🔶 PENDING_SHARED (spec 라벨=오메가3 지표 + 2차 비타민E → pure-single 아님) |
| A-06 | 콜라겐 | 피부 | 213 (액상 72) | 0 | — | 🔶 PENDING_SHARED (spec 라벨=펩타이드 마커 서열, 원료명 아님 · 대량 잠재풀) |
| A-07 | 세라마이드 | 피부 | 0 | 0 | — | 🔶 PENDING_SHARED (HFF 소스 부재 — "SOURCE 없으면 설명서 안 만듦") |
| A-08 | 추가 관절·간·피부 단일 | — | 조사완료 | 0 | — | 🔶 무경합 즉시생산 가능 성분 0 (히알루론산 9=SF 파이프라인 경합) |

**이번 세션 신규 LIVE 합계 = 27** (masters 27 · SPD 54 = ko/en 각 27). DB write = 27×4 = **108 rows**
(INSERT product_masters 27 + UPDATE product_candidates 27 + INSERT SPD 54).

---

## 3. 잔여 성분 근거 (whole-stop 아님 — 개별 성분 비생산은 중지 사유 아님)

### A-04 보스웰리아 — HOLD
- MAIN_FNCTN 언급 후보 50건이나, BASE_STANDARD spec-set 이 보스웰리아 단일 signature 와
  **정확히 일치**하는 pure-single 은 2건뿐(나머지는 복합 관절 signature).
- elig ≥ 4 게이트 미달 → 생산 보류. 복합형(콤보) 라인에서 후속 검토 대상.

### A-05 초록입홍합 — PENDING_SHARED
- BASE_STANDARD spec 라벨 = 오메가3 지표(`Docosahexaenoic acid (DHA), eicosapentaenoic acid (EPA),
  docosapentaenoic acid (DPA), α-linolenic acid 전체합`) + **2차 spec 비타민E**.
- parseSpecs 는 이를 오메가3/비타민E 로 분류 → 초록입홍합 signature 미형성, 관절 기능성 귀속 불가.
- pure-single 파이프라인으로 즉시 생산 불가. 오메가3 마커의 소스별 상이 의미(관절 vs 혈중지질)를
  안전 귀속하려면 공용 parser 확장 필요 → 공용 작업으로 이관.

### A-06 콜라겐 — PENDING_SHARED (고가치 잠재풀)
- 후보 213건(비액상 141) — **대량 잠재풀**이나 즉시 생산 0.
- BASE_STANDARD spec 라벨 = 펩타이드 지표 서열(예 `Val-Gly-Pro-Hyp-Gly-Pro-Ala-Gly : 표시량(1.86 mg/20g)`),
  원료명 "콜라겐" 은 spec 에 미노출(MAIN_FNCTN·제품명에만 존재) → `keys !== TARGET_SET` → mention 0.
- 액상 72건은 isLiquidDrop 제외 대상. 공용 parser 가 펩타이드 마커 서열 → 콜라겐 인식을 지원하면
  141건 규모 생산 가능. 공용 parser 확장 우선순위 상위 권고.

### A-07 세라마이드 — PENDING_SHARED
- MFDS HFF 후보 중 세라마이드 기능성 언급 **0건**. 표준화 HFF 소스 자체 부재(기타가공품/화장품 영역).
- 소스 없이 설명서 생성하지 않음(불변 원칙) → 생산 대상 아님.

### A-08 추가 성분 전수 조사 (read-only producible 서베이)
- pure-single producible 서베이(scanned 41,261 · pureSingleTotal 867 · grandProducible 387) 결과,
  관절·간·피부 도메인에서 무경합 즉시생산 가능한 미등록 단일 성분 **0**.
- 유일 후보 **히알루론산(피부, solid 9)** 은 공용 SF 레지스트리(hff-sf-registry.ts) 소속·기생산 21건 존재이며,
  병렬 세션이 SF 파이프라인을 fork 운용 중(hff-sf-b-*, hff-sf-c-* 미추적) → **경합 위험**.
  성분 교집합 0 게이트 및 "병렬 세션 공용 파일 미접촉" 원칙에 따라 단독 생산 보류 → PENDING_SHARED(SF 조율 필요).
- 그 외 상위 producible(프로바이오틱스·포스파티딜세린·홍경천·회화나무·바나바·홍국·쏘팔메토·헤마토코쿠스)은
  전부 **타 에이전트 도메인** → 미접촉(교집합 0 유지).

---

## 4. Auto-apply 게이트 (A-01~03, 전 항목 PASS)

| 게이트 | 결과 |
|--------|------|
| dry-run PASS | ✅ |
| postVerify PASS | ✅ |
| canonicalDup 0 (HFF 도메인 전체) | ✅ **0** groups |
| statementNo dup master 0 | ✅ (HFF import:mfds-hff permit-dup 0) |
| expected write = actual write | ✅ 27×4=108 |
| rollback manifest 생성 | ✅ (scratchpad/a/manifests) |
| 기존 LIVE drift 0 | ✅ |
| master/candidate/source_ref 정상 | ✅ |
| 타 에이전트 성분 교집합 0 | ✅ |
| 독립검증 PASS | ✅ |

**독립검증**: `batch:single-nutrient-{msm,glucosamine,milk-thistle}` 3 tag 전부 masters=STORE-canonical-SPD/2
정합, HFF 도메인(`source_type='o4o_hff_generated'`) canonicalDup **0 groups**. 전역 permit-dup 950 은
레거시/cross-type 선존(내 산출 아님) — HFF 도메인 한정 dup 0.

---

## 5. Git / 파일

- **공용 shared 파일 미접촉**: 초록입홍합/콜라겐용 CLS·registry·select 임시 편집은 **즉시 생산 불가 확인 후 revert**
  (hff-source-parse.ts / hff-nutrient-registry.ts / hff-combo-select.ts → HEAD 복원). 공용 파일 순변경 0.
- **커밋 대상(path-specific)**: 본 CHECK 문서 1건.
- 생산 산출물(gen/target/manifest/rollback)은 scratchpad(temp) 및 DB 반영분 — 리포 트래킹 대상 아님.
- `git add .` 미사용 · pnpm-lock 및 타 세션 WIP(hff-sf-b-*, hff-sf-c-*, drug-otc-topical-*) 미접촉 · force push 없음.

---

## 6. 최종 산정

| 항목 | 값 |
|------|-----|
| 처리 성분 | MSM · 글루코사민 · 밀크씨슬 (생산) + 보스웰리아·초록입홍합·콜라겐·세라마이드·히알루론산 (조사·판정) |
| 이번 세션 총 신규 LIVE | **27** (MSM 12 / 글루코사민 7 / 밀크씨슬 8) |
| 총 DB write | 108 rows (27 master + 27 candidate update + 54 SPD) |
| canonicalDup / statementNo dup (HFF) | **0 / 0** |
| 기존 LIVE drift | **0** |
| 독립검증 | **PASS** |
| 추가 발굴·생산 | 발굴 다수(히알루론산 등) · 무경합 즉시생산 0 |
| 잔여 TODO / 재개 지점 | 콜라겐(펩타이드 마커 parser) · 초록입홍합(오메가마커+2차성분 parser) · 히알루론산(SF 조율) — **전부 공용 parser/조율 선행 필요 → PENDING_SHARED**. 재개=공용 parser 확장 WO 후. |
| whole-stop 발생 | **없음** (개별 성분 비생산은 중지 사유 아님) |

**결론**: 관절·간 등록 단일 도메인은 이번 세션으로 사실상 소진(27 잔여분 생산 완료, 누적 616 masters LIVE).
피부·잔여 성분은 공용 parser(펩타이드/마커 서열 인식) 또는 SF 파이프라인 조율 선행이 필요한 구조적
제약으로 PENDING_SHARED. 전 항목 게이트 PASS, drift 0, 교집합 0.
