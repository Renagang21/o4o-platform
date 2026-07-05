# CHECK-O4O-MEDICAL-DEVICE-ALL-GRADES-MFDS-STATUS-EXPORT-EXCLUSION-CLEANUP-BEFORE-GRADE2-V1

> WO: `WO-O4O-MEDICAL-DEVICE-ALL-GRADES-MFDS-STATUS-EXPORT-EXCLUSION-CLEANUP-BEFORE-GRADE2-V1`
> 결론: **삭제 대상 0건 — 이 WO가 찾는 수출용/죽은 허가 신호가 현재 DB에 존재하지 않음. migration·삭제 없음.**
> 상태: **조사 완료 · null 결과 문서화 · 종료** (2026-07-05)

---

## 0. 실행 환경 / 메타

| 항목 | 값 |
|---|---|
| 실행 환경 | 프로덕션 `o4o_platform` (Cloud SQL `o4o-platform-db`) |
| 조사 채널 | Cloud SQL Auth Proxy v2 (localhost:5433, **read-only**) |
| 실행 커밋 | _(문서 커밋 후 기록)_ |
| production delete | **없음** (삭제 대상 0) |
| migration | **없음** (스키마/데이터 변경 0) |
| 상세설명서 생성 | 0건 |

선행 완료: 4등급 hard delete(755), 3등급 name-based(1,664). 현재 의료기기 17,183.

---

## 1. 사용한 의료기기 판별 조건

```sql
regulatory_type='MEDICAL_DEVICE'
-- (mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%' 과 동치, 실측 전량 일치)
```

의료기기 등급별 (삭제 전 = 삭제 후, 불변):

| 등급 | count |
|---|---:|
| 1 | 4,632 |
| 2 | 12,533 |
| 3 | 18 |
| 4 | 0 (선행 삭제 완료) |
| 합계 | 17,183 |

---

## 2. 식약처 원문 조사 결과 (핵심)

### 2.1 상태 원문은 DB에 존재하지 않음

의료기기 master 는 candidate(`product_candidates.matched_product_master_id` join, 17,183 전건 링크
유지)의 `raw_payload` 에 원문을 보관한다. raw_payload 전체 필드를 확인:

- **source 필드(20종)**: `PRDLST_NM` `PRDT_NM_INFO` `FOML_INFO` `MDEQ_CLSF_NO` `CLSF_NO_GRAD_CD`
  `PERMIT_NO` `PRMSN_YMD` `MNFT_IPRT_ENTP_NM` `USE_PURPS_CONT` `CMBNMD_YN` `DSPSBL_MDEQ_YN`
  `TOTAL_DEV` `TRCK_MNG_TRGT_YN` `RCPRSLRY_TRGT_YN` `HMBD_TRSPT_MDEQ_YN` `STRG_CND_INFO`
  `CIRC_CND_INFO` `STERILIZATION_METHOD_NM` `USE_BEFORE_STRLZT_NEED_YN` `UDIDI_CD`
- **top-level**: `grade` `model` `permitNo` `permitDate` `usePurpose` `classificationNo`
  `regulatoryType` `reviewFlags` `sourceKind` `statusJoined` 등

**허가 상태(취소/폐업/무효/말소)·수출용·비고 필드는 없다.** raw_payload 가 이를 명시:
- `reviewFlags: ["...","STATUS_UNCHECKED"]`
- `statusJoined: false`
- 출처 데이터셋 = **"의료기기 표준코드별 제품정보"(15073875)** — 생애주기 상태 필드가 없는 데이터셋

`product_data_curation_reason` 은 3등급 정리 결과(18건)에만 값이 있고, 1/2등급은 null →
WO §7 의 `product_data_curation_reason ILIKE '%취소%'` 류 쿼리는 구조적으로 0.

### 2.2 전 텍스트 필드 신호 검색 (read-only)

검색 대상: `name` · `regulatory_name` · `manufacturer_name` · `raw_payload.model` ·
`source.PRDLST_NM` · `source.PRDT_NM_INFO` · `source.FOML_INFO` · `source.MNFT_IPRT_ENTP_NM` ·
`source.USE_PURPS_CONT` · `source.PERMIT_NO` (의료기기 17,183 전건)

| 신호 | 매치 | 판정 |
|---|---:|---|
| 수출용 / 수출전용 / 전량수출 | 0 | 없음 |
| EXPORT ONLY / FOR EXPORT | 0 | 없음 |
| 허가취소 / 인증취소 / 신고취소 / 품목취소 | 0 | 없음 |
| 폐업 | 0 | 없음 |
| 무효 / 말소 | 0 | 없음 |
| 양도 / 양수 / 재신고 / 휴업 / 변경 | 0 | 없음 |
| 취하 | 31 | **전부 오탐** — `USE_PURPS_CONT` 의 "채취하다"(혈액/검체 채취) 부분 문자열. 실질 0 |

취하 오탐 근거(context): "물 등을 **채취하**는 도구", "흡인, **채취하**는 기구",
"검체를 **채취하**기 위한", "혈액을 **채취하**는 가는 튜브".

### 2.3 "수출용" 부재의 구조적 원인 (허가번호 접두어)

| 접두어 | count | 의미 |
|---|---:|---|
| 제인 / 제신 / 제허 | 12,541 | **제조**(국내 제조) |
| 수인 / 수신 / 수허 | 4,488 | **수입**(국내 판매용 수입) |
| 체외 | 154 | 체외진단 |

`수` = **수입(import)** 이지 수출(export)이 아니다. 수입 의료기기는 국내 유통 정상 제품이다.
수출용 의료기기는 별도 허가체계(수출용 제조허가)라 표준코드(국내 UDI) 데이터셋에 포함되지 않는다.

### 2.4 죽은 허가 부재의 원인 (선행 Gate B 필터)

Gate B 승격 시 이미 **active 허가만 통과**(`RTRCN_DSCTN_DIVS_CD IS NULL`)시키고 inactive 는
보류(3건)했다. 즉 취소/폐업/취하 상태 제품은 master 생성 이전 단계에서 이미 제외되었다.

---

## 3. 삭제/보류 기준 (적용 결과)

- **삭제 확정 신호(수출용/취소/폐업/무효/말소)**: 매치 0 → delete_marked 0.
- **보류 신호(취하/변경/양도양수/재신고/휴업)**: 실질 매치 0(취하 31은 채취 오탐) → review_required 추가 0.
- 대체 정상 품목 확인 로직: 적용 대상(취하 row) 자체가 없어 미실행.

WO §5 기준을 적용했으나 신호 자체가 존재하지 않아 표시 대상이 없다.

---

## 4. Count Report (WO §10)

| 항목 | 값 |
|---|---:|
| 삭제 전 전체 ProductMaster | 248,026 |
| 삭제 전 의료기기 ProductMaster | 17,183 |
| 등급 1 의료기기 | 4,632 |
| 등급 2 의료기기 | 12,533 |
| 등급 3 의료기기 | 18 |
| 등급 4 의료기기 | 0 |
| 수출용/수출전용 삭제표시 | **0** |
| 취소/폐업/무효 삭제표시 | **0** |
| 취하/변경/양도양수 review_required | **0** (취하 31 = 채취 오탐) |
| 실제 삭제 수 | **0** |
| 삭제 후 의료기기 ProductMaster | 17,183 (불변) |
| 삭제 후 전체 ProductMaster | 248,026 (불변) |
| 의료기기 삭제 비율 | **0.00%** |
| 전체 ProductMaster 삭제 비율 | **0.00%** |

---

## 5. Acceptance Criteria 대응

| 기준 | 상태 |
|---|---|
| 의료기기 전체/등급별 count 확인 | ✅ 17,183 (4,632/12,533/18/0) |
| 식약처 상태 원문/원천 필드 확인 | ✅ raw_payload 전 필드 조사 — 상태 필드 부재 확인(STATUS_UNCHECKED) |
| 수출용/수출전용 후보 count | ✅ 0 |
| 취소/폐업/무효 후보 count | ✅ 0 |
| 취하/변경/양도양수 review_required 분리 | ✅ 삭제 미포함(실질 0, 오탐만 존재) |
| delete_marked 100건 샘플 정상제품 미혼입 | ✅ 해당 없음(0건) |
| review_required hard delete 제외 | ✅ 해당 없음 |
| hard delete 전 snapshot | ✅ 해당 없음(삭제 0) |
| 실제 삭제 수·비율 기록 | ✅ 0 / 0.00% |
| 상세설명서 미생성 | ✅ |

---

## 6. dry-run / delete / rollback

- **dry-run**: 삭제 대상 0 → 실행 대상 없음.
- **production delete**: 없음. 데이터/스키마 변경 0.
- **rollback**: 변경이 없어 rollback 불필요. (향후 필요 시 이 WO 범위에서는 되돌릴 것이 없음.)

---

## 7. 결론 및 후속

**현재 DB 기준 이 WO의 삭제/보류 대상은 0건이다.** 수출용/죽은 허가 정리는:
1. 원천 데이터셋(표준코드별 제품정보)에 상태·수출 필드가 없고,
2. 수입(수)≠수출이며 수출용은 별도 규제라 애초 미포함,
3. Gate B active 필터로 죽은 허가가 이미 제외됨

으로 인해 **사실상 이미 완료된 상태**다. 억지 삭제 없음.

향후 더 엄밀한 확인이 필요하면(별도 승인 사안): MFDS 허가상태 API
(`MdlpPrdlstPrmisnInfoService`) 로 17,183건 재조회하여 수출용/취소/폐업 필드를 직접 대조.
단 Gate B 가 이미 active 필터를 적용해 기대 수확은 낮음.

**다음 WO(§13):** ① 3등급 review_required 13건 쿠팡/네이버 조사 → ② 의료기기 2등급 품목분류명
기반 정리 → ③ 건강기능식품 → ④ 의약외품.
