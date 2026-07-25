# CHECK — WO-O4O-OTC-ORAL-COMBO-BIGCON-S600-HOLD-SOURCE-RESOLUTION-V1

- 담당: 드럭 OTC 원문 보강 전용 세션 (경구 복합 가·나·다 생산 트랙과 분리)
- 대상: `빅콘에스600정` — fingerprint `44a15789a2cc1596`, 3 ProductMaster
- 기준 시점: 2026-07-25
- base commit: `6ba3100f1` (shard C LIVE 완결 포함), HEAD == origin/main
- **최종 판정: `HOLD_SOURCE_CONFIRMED`** (단, SSOT의 HOLD 사유는 부정확 → 아래 §6 정정)
- **DB write: 0** (조사·판정 전용, 기존 LIVE 상태 무변경)

---

## 1. 대상 3 master 식별정보

| # | master id | barcode(표준코드) | specification | created_at |
|---|-----------|------------------|---------------|-----------|
| 1 | `96b520aa-eb65-43cd-86bf-8bf4d442f9f0` | 8806452084702 | 600밀리그램 / 0 | 2026-07-02 |
| 2 | `ae6ada5f-a9ae-4cba-80d2-86225a56e672` | 8806452084726 | 600밀리그램 / 90 / 정 / 병 | 2026-07-02 |
| 3 | `bf9dba11-5d9f-4c4e-8e57-ca5c6054e170` | 8806452084719 | 600밀리그램 / 45 / 정 / 병 | 2026-07-02 |

공통 속성 (3 master 전부 동일):

- 제품명(regulatory_name/name): **빅콘에스600정**
- 업체명: **(주)에이프로젠바이오로직스** (bizrno 2188100518)
- **품목기준코드(MFDS item code): `201404702`** — 3 master 전부 동일
- 일반명코드(성분명): `D05200ATB` · ATC: `A11EX`
- 전문/일반 구분: **일반의약품(OTC)** · drug_category=`otc`
- regulatory_type: `DRUG` · 품목허가일자: 2014-10-14
- data_source: `HIRA_DRUG_MASTER` (약가/급여 마스터, `mfds-drug-master-standard-code_2025-10-31`)
- product_masters.status: `ACTIVE` · is_mfds_verified: true
- 취소일자: null (미취소) · 수출/군납/비매품 표식 없음

## 2. 동일 허가·동일 조성 여부 → **동일 (SPLIT 불필요)**

3 master는 **동일 품목허가(품목기준코드 201404702)의 포장단위 sibling**이다.

- 유효성분·함량·제형·투여경로·허가 효능·용법·핵심 금기 = **동일**(단일 품목허가).
- 차이는 **포장 수량(정 45 / 90 / 미기재)뿐** — barcode(표준코드)만 상이.
- `representative_product_id` = `ccb02439-228c-41a2-a9f4-a755849ec895` (3 master 공통) — 단, 해당 id의 product_master row는 존재하지 않음(dangling 대표 포인터, 본 WO 대상 아님).
- 서로 다른 조성을 하나로 묶은 것이 아님 → **SPLIT_REQUIRED 아님**.

## 3. 조사한 공식 출처

| # | 출처 | 위치 | 결과 |
|---|------|------|------|
| 1 | ProductMaster / product_drug_extensions | DB | efficacy/dosage/caution/contraindication/active_ingredients/dosage_form/strength **전부 NULL**, data_source=HIRA_DRUG_MASTER, mfds_source_url NULL |
| 2 | product_identifiers | DB | KOREA_DRUG_CODE=barcode, MFDS_CODE=201404702, ATC=A11EX (HIRA import) |
| 3 | product_candidates (HIRA) | DB | `mfds-drug-master-standard-code_2025-10-31` — 약가마스터 원문(효능·용법 텍스트 없음) |
| 4 | **product_candidates (e약은요)** | DB `6be75b79-...` | **MFDS_EASY_DRUG_INFO / itemSeq 201404702 존재** — status=pending, match_status=**unmatched** |
| 5 | shared_product_descriptions | DB | **3 master 전부 STORE ko `canonical` 존재** (source_type=mfds_easy_drug, source_ref=6be75b79, clen 801) |
| 6 | MFDS 의약품안전나라 품목상세 (`nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=201404702`) | WebFetch | 용법·용량 **미확보** — JS 렌더링 페이지, 텍스트 추출 불가 |
| 7 | MFDS 품목허가 상세 cache endpoint | WebFetch | 용법·용량 **미확보** |

## 4. 효능·용법·주의사항 복원 결과 (공식 e약은요 itemSeq 201404702 원문 기준)

| 축 | 공식 원문 존재 | 비고 |
|----|:---:|------|
| **효능·효과** (efcyQesitm) | ✅ | "이 약은 육체피로, 임신·수유기, 병중·병후의 체력 저하 시 비타민 B1, B2, B6의 보급과 신경통, 근육통, 관절통(요통, 어깨결림 등)의 완화, 각기, 눈의 피로에 사용합니다." |
| **사용상 주의사항** (atpnQesitm) | ✅ | 금기(과민증·12개월 미만 젖먹이·대두유/콩/땅콩 과민·갈락토오스 불내성 등) + 신중투여(임부·수유부·미숙아·심순환기/신장 장애·지방대사이상 등) 전문 존재 |
| **이상반응** (seQesitm) | ✅ | 구역·구토·설사·구내염·발진·부종·(신/심부전) 수분저류 등 전문 존재 |
| **용법·용량** (useMethodQesitm) | ❌ | **NULL** — 공식 e약은요 원문에 부재. MFDS 품목허가 상세에서도 검증가능 형태로 확보 실패 |
| 상호작용 / 경고 / 저장방법 | ❌ | e약은요 null |

→ **효능·주의·이상반응 3개 축은 공식 원문으로 확보되며 이미 LIVE canonical로 존재**한다. **오직 용법·용량(usage) 한 축만 공식 출처에서 확보 불가**.

## 5. 최종 판정: `HOLD_SOURCE_CONFIRMED`

authored 경구 복합 매장 설명서(KO 4T + EN 2T)는 러너/composer가 **효능·용법·주의 3축 전부**를 요구한다. **용법·용량이 공식 원문에서 확보되지 않으므로**, 추정 없이 authored 설명서를 저작할 수 없다.

- 소비자용 의약품 설명서의 용법·용량을 외부 LLM/일반지식으로 생성·보강하는 것은 **CLAUDE.md 콘텐츠 작성 불변 원칙 위반**(신규 의료 사실 0 / 무검증 배포 금지) → 저작하지 않음.
- 쇼핑몰·블로그·검색요약·타 제품·ATC·제품명 추론은 근거로 사용하지 않음(WO 금지 목록 준수).
- 따라서 **authored 설명서 승격은 HOLD 유지**, DB write 0.

### 부족 근거 (정확)

- **부재 축 = 용법·용량(useMethodQesitm) 단 하나.**
- 공식 e약은요(itemSeq 201404702)에 usage=null이며, MFDS 품목허가 상세(의약품안전나라)는 가용 도구(WebFetch)로 검증가능한 용법·용량 텍스트를 반환하지 않음(JS 렌더 페이지).

## 6. ⚠️ SSOT HOLD 사유 정정 (중요)

`apps/api-server/src/scripts/data/otc-oral-combo-shardC-hold-source.da.json` 의 기록:

> "HOLD_SOURCE — ko-compose SKIP(no eff/use/cau): 공식 easy_drug 원문에 효능·용법·주의 섹션 부재."

**이 사유는 부정확하다.** 실측:

- **효능·주의·이상반응 3축은 공식 원문에 존재하며, 3 master 전부 STORE ko `canonical` 로 이미 LIVE**(shared_product_descriptions, source_type=mfds_easy_drug, clen 801).
- 실제 SKIP 원인은 (a) **용법·용량(usage) 단일 축 부재** + (b) e약은요 candidate `6be75b79` 가 3 master에 **unmatched**(compose가 매칭 easy 원문을 못 봄).
- 즉 "효능·용법·주의 전부 부재"가 아니라 **"용법 1축만 부재 + candidate 미매칭"**.

> shard C 세션(에이전트 다) 소유의 tracked 파일이므로 본 세션은 해당 JSON을 수정하지 않고 본 CHECK에 정정 사실만 기록한다. 원 파일 수정은 소유 세션 몫.

## 7. canonical · audit · dup · drift · no-op

- DB write: **0** (조사·판정 전용)
- 기존 easy_drug canonical(STORE ko, 3건) **보존** — 삭제·demote·downgrade 없음
- canonical duplicate: 없음 (신규 생성 0)
- target 밖 write: 0 · 비대상 LIVE drift: 0
- 재실행 시 no-op (읽기 전용)

## 8. 향후 재개 조건 (SOURCE_RECOVERED 전환 트리거)

아래 중 하나로 **itemSeq 201404702 의 공식 용법·용량**이 검증가능 형태로 확보되면 authored KO+EN 생산으로 전환:

1. MFDS OpenAPI(getDrugPrdtPrmsnDtlInq, 인증 serviceKey)로 `UD_DOC_DATA`(용법용량) XML 확보, 또는
2. e약은요 `useMethodQesitm` 가 후속 수집분에서 non-null 로 갱신, 또는
3. 승인된 공식 허가사항 원문 첨부(품목허가증/허가사항 변경 이력)로 용법·용량 확정.

재개 시:
- e약은요 candidate `6be75b79` 를 3 master에 매칭 처리(unmatched → matched).
- 정본 러너 `otc-oral-combo-store-leaflet-runner.ga.ts` 로 KO 4T(easy demote→deprecated / authored canonical INSERT / audit) + EN 2T, 예상 최대 write KO 12T·EN 6T·총 18T.
- 확보 전까지 기존 easy_drug canonical 이 LIVE 설명서로 유지된다(제거 금지).

## 9. Git / 무결성

- git add . 미사용 · reset/clean/stash 미사용 · 타 세션 파일 미접촉
- 자기 산출물(본 CHECK)만 path-specific stage·commit·push
- 종료 시 HEAD == origin/main, 미푸시 자기 산출물 0

## 10. 경구 복합 트랙 완결 판정 영향 없음

본 3 master의 HOLD 유지는 기존 경구 복합 생산 트랙(208 fp / 624 master A/B/C LIVE 완결)의 완결 판정에 영향을 주지 않는다. 이 fp는 애초에 생산 가능 모집단에서 제외된 HOLD_SOURCE 항목이다.
