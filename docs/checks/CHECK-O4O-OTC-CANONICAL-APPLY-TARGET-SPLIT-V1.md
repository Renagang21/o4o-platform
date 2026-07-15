# CHECK-O4O-OTC-CANONICAL-APPLY-TARGET-SPLIT-V1 — 승격 대상 분리 (A: 승격 후보 / B: 약사 검토)

WO: `WO-O4O-OTC-CANONICAL-APPLY-TARGET-SPLIT-V1` · 일자: 2026-07-16 · 상태: 완료
선행: [EXPANSION-APPLY-PATH](CHECK-O4O-OTC-SINGLE-GROUP-EXPANSION-APPLY-PATH-V1.md) (1,294 대상 확정) · [READINESS](CHECK-O4O-OTC-KO-CANONICAL-PROMOTION-READINESS-V1.md)

> **read-only.** DB write **0** · canonical 승격 **0** · draft 상태 변경 **0** · 기존 설명 수정 **0** · apply **미실행**.

---

## 1. 결론

> **1,294 master 를 A 686 / B 608 로 분리했다.**
> **A군(승격 후보) = 37그룹 · 686 master** — 전부 `INSERT_auto` · 전부 `route=oral` · 구조/route/주석 게이트 **전건 통과** · 기존 데이터 충돌 **0**.
> **B군(약사 검토 선행) = 23그룹 · 608 master** — 그중 **은행엽·포도엽 2그룹 299 master(B군의 49%)** 가 최대 덩어리다.
>
> **A군 686건만 canonical apply 후보.** B군은 draft `needs_review` 를 그대로 두고 **SPD 에 아무것도 넣지 않는다.**

---

## 2. 분류 결과

| 군 | 그룹 | master | 판정 근거 |
|---|---:|---:|---|
| **A. canonical 승격 후보** | **37** | **686** | `INSERT_auto` |
| **B. 약사 검토 선행** | **23** | **608** | `review_flag` 202 · `low_ground_flag` 354 · `rx_minor_flag` 38 · `manual_flag` 14 |
| **합계** | **60** | **1,294** | ✅ 전수 일치 |

> `686` 은 선행 dry-run 의 `C(auto only) / auto+noSpd = 686` 과 **정확히 일치**한다(독립 산출 교차검증).

### 2-1. ⚠️ `rx_minor_flag` 2그룹(38 master) 처리 — **확인 필요**

WO 의 B군 정의는 `review / low_ground / manual` 이라 **`rx_minor_flag` 가 명시되지 않았다.**
**A군 정의("auto 근거 그룹")에 해당하지 않으므로 B군으로 분류**했다. 근거:

| 그룹 | master | 사유 |
|---|---:|---|
| `파모티딘\|10밀리그램\|정` | 24 | 초안 주석: "소수 rx 품목 혼입(OTC 97.7%) → 판매 구분은 약사 확인" |
| `펙소페나딘염산염\|60밀리그램\|정` | 14 | 초안 주석: "소수 rx 혼입(OTC 96.2%)" |

**전문의약품 혼입 가능성**이라 자동 승격은 위험하다고 판단했다. **A군에 넣어야 한다면 알려주십시오** (그 경우 A = 39그룹 · 724 master).

---

## 3. A군 (canonical 승격 후보) — 37그룹 · 686 master

### 3-1. 게이트 검증 — **전건 통과**

| 게이트 | 결과 |
|---|---:|
| 필수 4필드 구조 | **실패 0** |
| `route` 파생 | **`needs_review` 0** — **37그룹 전부 `route=oral`** (비경구 0) |
| 내부 주석 소비자 노출 | **0** |
| 기존 설명 없음(`hasAnySpd=false`) | **686/686** |
| **기존 canonical 충돌** | **0** (독립 SQL 재확인) |
| master 중복 | **0** (distinct 686 = 686) |

> A군에 **비경구(질정 등)가 하나도 없다** — G-01 오투여 위험 표면이 A군엔 없다는 뜻이라 승격 안전성에 유리하다.

### 3-2. 상위 그룹 (master 수)

| master | route | 그룹 |
|---:|---|---|
| 72 | oral | `세티리진염산염\|10밀리그램\|정` |
| 67 | oral | `에르도스테인\|300밀리그램\|캡슐` |
| 59 | oral | `아세틸시스테인\|200밀리그램\|캡슐` |
| 39 | oral | `트리메부틴말레산염\|150밀리그램\|정` |
| 38 | oral | `트리메부틴말레산염\|100밀리그램\|정` |
| 34 | oral | `펙소페나딘염산염\|120밀리그램\|정` |
| 33 | oral | `알벤다졸\|400밀리그램\|정` |
| 33 | oral | `니자티딘\|75밀리그램\|정` |
| 29 | oral | `브로멜라인\|100밀리그램\|정` |
| 26 | oral | `알마게이트\|500밀리그램\|정` |
| 26 | oral | `디오스민\|600밀리그램\|정` |
| 16 | oral | `시트룰린말산염\|500밀리그램\|정` |

… 외 25그룹. 전체 목록 = `C:/tmp/pilot/split.json` 재현 가능(§6).

---

## 4. B군 (약사 검토 선행) — 23그룹 · 608 master

**B군은 SPD 에 넣지 않는다.** draft `review_status='needs_review'` 유지.

| master | verdict | 그룹 | 비고 |
|---:|---|---|---|
| **203** | `low_ground_flag` | `은행엽건조엑스\|80밀리그램\|정` | **★생약 — 선검토** |
| **96** | `low_ground_flag` | `포도엽건조엑스\|180밀리그램\|캡슐` | **★생약 — 선검토** |
| 40 | `review_flag` | `나프록센나트륨\|275밀리그램\|정` | 함량축(550mg=RX) DR-005 |
| 29 | `review_flag` | `클로닉신리시네이트\|125밀리그램\|정` | |
| 24 | `rx_minor_flag` | `파모티딘\|10밀리그램\|정` | RX 혼입 2.3% |
| 24 | `review_flag` | `이부프로펜\|200밀리그램\|정` | |
| 23 | `review_flag` | `아스피린\|100밀리그램\|정` | 항혈소판(해열진통 아님) |
| 21 | `review_flag` | `알파칼시돌\|0.5마이크로그램\|연질캡슐` | 고칼슘혈증 금기 |
| 16 | `review_flag` | `디펜히드라민염산염\|50밀리그램\|연질캡슐` | 적응증=불면증 |
| 14 | `manual_flag` | `클로트리마졸\|100밀리그램\|정` | **유일한 비경구(질정)** G-01 |
| 14 | `review_flag` | `나프록센\|250밀리그램\|연질캡슐` | |
| 14 | `rx_minor_flag` | `펙소페나딘염산염\|60밀리그램\|정` | RX 혼입 3.8% |
| 13 | `review_flag` | `독시라민숙신산염\|25밀리그램\|정` | |
| 10 | `low_ground_flag` | `알파칼시돌\|1마이크로그램\|연질캡슐` | |
| 10 | `low_ground_flag` | `아르기닌티디아시케이트\|200밀리그램\|연질캡슐` | grounding 얇음(7건) |
| 10 | `low_ground_flag` | `메코발라민\|500마이크로그램\|캡슐` | |
| 8 | `low_ground_flag` | `결정글루코사민황산염\|250밀리그램\|캡슐` | |
| 8 | `review_flag` | `이부프로펜\|400밀리그램\|연질캡슐` | |
| 7 | `review_flag` | `클로닉신리시네이트\|125밀리그램\|연질캡슐` | |
| 7 | `review_flag` | `이부프로펜\|200밀리그램\|연질캡슐` | |
| 7 | `low_ground_flag` | `플루벤다졸\|500밀리그램\|정` | |
| 6 | `low_ground_flag` | `이부프로펜아르기닌\|368.9밀리그램\|정` | 이부프로펜 200mg 상당 |
| 4 | `low_ground_flag` | `L-시스틴\|500밀리그램\|연질캡슐` | |

### 4-1. 생약 2그룹 = **299 master (B군의 49%)**

| master | 그룹 | 초안 내부 주석(번역자·검토자용) |
|---:|---|---|
| 203 | 은행엽건조엑스 80mg 정 | "생약. e약은요 grounding 이 얇음(10건) → 약사 검토 강화" |
| 96 | 포도엽건조엑스 180mg 캡슐 | "생약. e약은요 grounding 이 얇음(7건) → 약사 검토 강화. 디오스민 계열과 유사한 정맥순환 적응증" |

> **B군 검토는 이 2그룹부터** 하는 것이 효율적이다 — 건수의 절반이고, 사유가 동일(원문 grounding 부족)해 한 번의 판단으로 299건이 갈린다.

---

## 5. 확인 결과 (WO 요구)

| 항목 | 값 |
|---|---|
| **A군 그룹 수 / master 수** | **37 / 686** |
| **B군 그룹 수 / master 수** | **23 / 608** |
| 그룹별 근거 상태 | §3-2 · §4 (verdict 명시) |
| **예상 canonical INSERT 수** | **686** (A군만) |
| 예상 UPDATE | **0** |
| **기존 데이터 충돌 0 여부** | ✅ **충돌 0** — A군 686 전부 `hasAnySpd=false`, 그중 canonical 보유 **0**(독립 SQL 재확인), distinct 686 |

### 5-1. 상태 원칙 준수

| 원칙 | 반영 |
|---|---|
| A군만 `canonical` apply 후보 | ✅ B군은 후보에서 제외 |
| B군은 draft `needs_review` 유지 | ✅ **draft 상태 변경 0** |
| SPD 에 `needs_review` 로 먼저 넣지 않음 | ✅ **B군 INSERT 0** (정책 D 유형 병행 저장 안 함) |
| 기존 canonical 수정 안 함 | ✅ **UPDATE 경로 없음** |

---

## 6. 재현 방법 (read-only)

```bash
# 전체 60그룹 dry-run (A/B 합산 1,294)
DB_HOST=127.0.0.1 DB_PORT=<proxy> DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
  npx tsx src/scripts/drug-otc-single-canonical-promotion.ts
# → JSON_REPORT 의 byVerdict 로 A(INSERT_auto)/B 분리 확인
```

분리는 **전개 결과의 `guard_result.verdict` 필터**일 뿐이며 전개 로직은 선행 WO 와 동일(공용 모듈). 반복 실행 동일 결과.

---

## 7. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 1,294건 전수 분류 | ✅ A 686 + B 608 = 1,294 |
| A군 apply 예상 수 확정 | ✅ **686 INSERT / 0 UPDATE** |
| B군 약사 검토 목록 확정 | ✅ §4 (23그룹 전체, 생약 2그룹 별도 표시) |
| DB write · 승격 · draft 상태 변경 · 기존 설명 수정 | ✅ **전부 0** |

---

## 8. 다음 (승인 apply WO 에 넘길 것)

| 항목 | 내용 |
|---|---|
| **대상** | **A군 37그룹 · 686 master** |
| **apply 조건** | `verdict='INSERT_auto'` 필터 **추가 필요** — 현재 스크립트는 60그룹 전체(1,294)를 대상으로 한다. **A군 한정 옵션이 없으므로 승인 WO 에서 추가**해야 한다 |
| status | `canonical` 하드코딩 — 승인 시 재확인 |
| 미결 | **`rx_minor_flag` 2그룹(38) 의 A/B 귀속** (§2-1) |
| 후속 | B군 608 약사 검토 → 생약 2그룹(299) 우선 |
