# CHECK-O4O-OTC-NO-CANONICAL-TOP5-SOURCE-AVAILABILITY-AUDIT-V1 — 첫5그룹 관제 원문 확보 감사 (에이전트 가)

WO: `WO-O4O-OTC-NO-CANONICAL-TOP5-OFFICIAL-SOURCE-AVAILABILITY-AUDIT-GA-V1` · 일자: 2026-07-18 · 상태: **완료 (read-only 감사)**
채널: Cloud SQL Auth Proxy(:5442) → production `o4o_platform`, SELECT only. DB write **0** · draft/canonical 변경 **0**.

---

## 0. 결론

> **첫 5 authoring 배치 후보(829 master) 전부 `SOURCE_MISSING`. 관제 효능·용법·주의·첨가제 원문이 DB에 미인입 — 유일 candidate 소스가 `mfds-drug-master-standard-code`(메타데이터만: 제품명·제조사·규격·제형·허가일자·취소·ATC)이고 원문 텍스트 0. e약은요는 미보유 universe 와 disjoint(0). → AUTHORING_READY 그룹 = 0. 첫 authoring 배치 착수 불가(관제 원문 인입 선행 필요). MFDS_CODE 100%·취소 0·rx 0 이므로 원문만 확보되면 즉시 진행 가능.**

---

## 1. 확인 항목 결과

| 그룹 | master | MFDS_CODE율 | e약은요 | 원문 확보율 | 취소 | rx | authoring 가능 | verdict |
|---|---:|---:|---:|---:|---:|---:|---:|:---:|
| 은행엽건조엑스\|240밀리그램\|정 | 395 | 100% | 0 | **0%** | 0 | 0 | 0 | **SOURCE_MISSING** |
| 은행엽건조엑스\|120밀리그램\|정 | 179 | 100% | 0 | **0%** | 0 | 0 | 0 | **SOURCE_MISSING** |
| 은행엽건조엑스\|40밀리그램\|정 | 104 | 100% | 0 | **0%** | 0 | 0 | 0 | **SOURCE_MISSING** |
| 은행엽엑스\|120밀리그램\|정 | 77 | 100% | 0 | **0%** | 0 | 0 | 0 | **SOURCE_MISSING** |
| 라니티딘염산염\|75밀리그램\|정 | 74 | 100% | 0 | **0%** | 0 | 0 | 0 | **SOURCE_MISSING** |
| **합** | **829** | 100% | 0 | **0%** | 0 | 0 | **0** | 전부 SOURCE_MISSING |

- 동일 그룹 내 원문 수렴/안전지문 분리: 원문이 0 이라 **판정 불가(N/A)** — 원문 확보 후 재감사.
- 원문 미확보 100% · 취소 0 · 수출 0(선행 audit 에서 제외) · rx 0.

---

## 2. 원문 소스 실측 (핵심 근거)

- 829 master 의 **유일 matched candidate 소스 = `mfds-drug-master-standard-code_2025-10-31`**.
- 해당 payload 키: `비고·업체명·대표코드·약품규격·제형구분·취소일자·포장형태·표준코드·제품총수량·한글상품명·전문일반구분·품목기준코드·품목허가일자·ATC코드·성분명코드` — **전부 메타. 효능·용법·주의·첨가제 텍스트 0**(샘플 3/3 has_text=0).
- e약은요(MFDS_EASY_DRUG_INFO) itemSeq join = **0**(미보유 universe 와 disjoint).
- 결론: 관제 품목허가 **원문(효능/용법/주의/첨가제)** 은 현재 DB에 인입돼 있지 않다.

---

## 3. 판정 / 완료 기준

| 판정 | 그룹수 |
|---|---:|
| AUTHORING_READY | **0** |
| PARTIAL_HOLD | 0 |
| SAFETY_SPLIT | 0 |
| **SOURCE_MISSING** | **5** |

| 완료 기준 | 결과 |
|---|---|
| 그룹별 master 수·itemSeq율·원문율·취소·rx | ✅ (§1) |
| 실제 authoring 가능 master 수 | **0** |
| HOLD 대상·사유 | 829 전량 = 원문 미확보(SOURCE_MISSING) |
| AUTHORING_READY 그룹 | **없음** |
| 재실행 결정론 | ✅ md5 `43def11d8f622fc93598c2fd72ba51e4` |
| DB write | **0** |

---

## 4. 산출물 / 다음

- `apps/api-server/src/scripts/drug-otc-no-canonical-top5-source-availability-audit.ts`
- `apps/api-server/src/scripts/data/otc-no-canonical-top5-source-availability-v1.json`
- 본 CHECK 문서.

> **다음(차단)**: 첫 5그룹 authoring 승인 불가 — **관제 품목허가 원문 인입(ingestion)이 선행 조건**. 인입 경로 = 의약품안전나라 품목허가 상세(효능·용법·주의·첨가제) 또는 동등 관제 원문 소스. 인입 후 본 감사 재실행 → 원문 100%+안전수렴 그룹만 AUTHORING_READY 로 승격. 트랙 분리 유지: **Track A(grounded upgrade, e약은요 canonical 보유 2,882그룹/9,101제품)** ≠ **Track B(no-canonical new authoring, 1,258그룹/5,364제품 — 관제 원문 확보 시에만)**.
