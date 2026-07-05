# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-CANDIDATE-SAMPLE-MARKET-TEST-AND-LISTING-NO-DESCRIPTION-V2

> WO: `WO-O4O-HEALTH-FUNCTIONAL-FOOD-CANDIDATE-SAMPLE-MARKET-TEST-AND-LISTING-NO-DESCRIPTION-V2`
> 성격: 건강기능식품 ProductCandidate 표본 시장성 조사 + 상품리스트 노출 가능성 검증. **measurement-only, DB write 0, 삭제/승격/설명 미실행.**
> 작성일: 2026-07-05 · 트랙: 건강기능식품 전용

---

## 1. 결론 — 표본 과반이 실판매 제품 → **전량 삭제 부적절**. keep 후보 노출 + 미검색군 재검토 권장.

- HFF는 `product_masters` **0건**, `product_candidates` **44,885건**(전부 `pending`) — 이 WO 대상은 candidate.
- **dead-permit(폐업/취소/취하/행정취소) 신호는 현재 적재 데이터에 없음** → 상태기반 선삭제 불가(별도 원천 필요).
- 무작위 100건 추출 → **63건 시장성 조사(WebSearch, 네이버쇼핑/쿠팡/11번가/올리브영/공식몰 커머스 노출 기준)**. 4개 구간(n=32/42/53/63)에서 비율 수렴:

| 판정 | 건수 | 비율 |
|---|---:|---:|
| `keep_candidate` (실상품 검색됨) | **32** | **50.8%** |
| `delete_marked` 후보 (실판매 미확인) | 21 | 33.3% |
| `review_required` (애매) | 10 | 15.9% |

- **약 절반이 쿠팡/네이버 등에서 실제 판매 중** → §1 "쇼핑몰 유통 흔적 있으면 우선 보존" 정책상 **candidate 전량 hard delete 는 부적절**(정상 상품 대량 오삭제).
- delete_marked 후보(33%)는 대부분 (a) 제품명 미검색 (b) 개별인정 원료/균주(소비자 SKU 아님) (c) 전량 수출용. review_required(16%)는 일반명(홍삼농축액/아연 등)·ODM 브랜드 미확인.
- **DB write 0**: candidate 상태·삭제·승격·설명 전부 미실행.

**한 줄 결론:** HFF candidate 44,885 중 무작위 63건을 네이버/쿠팡 커머스 기준으로 조사하니 **50.8%가 실제 판매 제품(keep), 33.3% 미확인(delete 후보), 15.9% 애매**로 수렴했다. 과반이 실상품이므로 전량 삭제는 정상 상품을 대량 오삭제한다 — **전량 hard delete 대신, keep 후보는 상품리스트 노출 후보(설명 없이)로 남기고 delete/review 군만 별도 정리**가 옳다. 노출은 ProductMaster 승격·설명 생성 없이 **listable candidate 플래그 + 배지** 방식이 가장 안전하다.

---

## 2. 범위와 비범위

- 수행: candidate count, dead-permit 신호 점검, 무작위 100 추출, 63건 시장성 조사·분류, 비율 산출, 노출 설계 제안, CHECK.
- 미수행(비범위): 삭제/삭제표시 DB write, ProductMaster 승격, 상세설명서/LLM 생성, 44,885 전량 조사, 쿠팡·네이버 동시 강제 조사, 무제한 크롤링, 공급자/매장 등록 흐름 변경.

---

## 3. 실행 환경 · 판별 조건

- **환경**: 프로덕션 `o4o_platform`(Cloud SQL Auth Proxy v2, 127.0.0.1:5434, 방화벽 무변경). read-only SELECT만. 검색=WebSearch(제품명+업체명, 커머스 노출 판정).
- **HFF candidate 판별 조건(확정)**: `source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD'` (정확일치). WO 퍼지조건(`source_label ILIKE '%health%' … OR raw_payload::text ILIKE '%HEALTH_FUNCTIONAL%'`)과 **결과 완전 동일(둘 다 44,885)** — 정확 라벨을 canonical 로 사용.
- **상세설명서 존재 판별**: `product_candidate_description_drafts` = **0건**(전 HFF candidate 미보유) → 조사제외 대상 없음.
- **공급자/매장 연결 판별**: candidate 는 pre-master 후보라 supplier/store 연결 컬럼 없음(연결 0). 내부 유통증거(matched_master/identifier/image/price/unit) 전 행 0.

---

## 4. dead-permit(죽은 허가) 선처리 점검 — 현재 데이터로 불가

사용자 요청(폐업/취소/취하/행정취소 우선 삭제 가능성)에 따라 raw 점검:

- raw.source 필드 11종(BASE_STANDARD/DISTB_PD/ENTRPS/INTAKE_HINT1/MAIN_FNCTN/PRDUCT/PRSRV_PD/REGIST_DT/SRV_USE/STTEMNT_NO/SUNGSANG)에 **허가상태·취소·폐업 컬럼 없음**.
- raw_payload 텍스트 키워드 스캔: **폐업 0 / 취소 0 / 행정처분 0 / 판매중지·회수 0**. `취하` 39,584는 **오탐**(신고취하가 아니라 섭취안내문 "**섭취하**세요/섭취하는"의 부분문자열).
- `DISTB_PD` = 상태값 아님, **유통기한**("제조일로부터 24개월" 등 기간값).
- **판정**: 현재 적재 HFF 데이터(MFDS HtfsInfoService03)에는 허가상태 원천이 없어 dead-permit 선삭제 불가. 하려면 별도 MFDS 원천(품목제조신고 현황 + 취소/폐업 상태코드) 신규 수집 필요 → Gate B 선행감사의 "유효상태 원천 NO-GO"와 동일. **별도 WO**.

---

## 5. Preflight count (read-only)

| 항목 | 값 |
|---|---:|
| 전체 ProductCandidate (`deleted_at IS NULL`) | 398,115 |
| 건강기능식품 ProductCandidate | **44,885** |
| 건강기능식품 pending ProductCandidate | **44,885** |
| candidate_name/manufacturer 결측 | 0 / 0 |
| HFF 설명 draft 보유(조사제외) | 0 |
| 내부 유통증거(master/id/이미지/가격/단위) | 0 / 0 / 0 / 0 / 0 |

---

## 6. 샘플 추출 SQL

```sql
SELECT id, candidate_name, candidate_manufacturer, raw_payload->'source'->>'REGIST_DT' AS regist
FROM product_candidates
WHERE deleted_at IS NULL
  AND candidate_status = 'pending'
  AND source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD'
  AND candidate_name IS NOT NULL AND candidate_name <> ''
ORDER BY random()
LIMIT 100;   -- 100 추출 후 상위 63건을 시장성 조사(비율 수렴으로 조기 종료)
```

---

## 7. 판정 기준 (WO §6)

- `keep_candidate`: 쿠팡/네이버쇼핑/11번가/올리브영/컬리/공식몰 등에서 동일·유사 제품이 **실상품으로 노출**(제품명·업체·브랜드·제형이 현실적으로 동일). 완벽일치 불요.
- `delete_marked` 후보: 커머스에서 실판매 미확인(제품명 미검색 / 개별인정 원료·균주 = 소비자 SKU 아님 / 전량 수출용).
- `review_required`: 일반명(홍삼농축액·아연·비타민C 등)이라 식별 곤란 / ODM·원료사 브랜드로 정확 제품 미확인 / 공식사이트만 존재.
- 블로그·카페·기사·기업정보 페이지만 노출 = 시장성 근거로 불인정.

---

## 8. 샘플 63건 판정 결과

| # | id(prefix) | 제품명 | 업체 | 판정 | 근거 |
|--:|---|---|---|---|---|
|1|ef667602|홍삼천국|한국인삼공사|review|KGC 대형사이나 해당 SKU 커머스 미확인|
|2|dcfd96e0|식물성 뉴티지 오메가3|대원헬스케어|keep|다이소몰/11번가 뉴티지 오메가3 판매|
|3|2028adda|라파바인|코스맥스바이오|delete|미검색·ODM만|
|4|62b3d9e1|눈에 좋아 루테인 미니|한미양행|keep|한미 루테인 라인 11번가/코스트코|
|5|da0ef55f|피토틱스 베이비|코스맥스엔비티|keep|피토틱스 브랜드 올리브영 판매|
|6|77aa712e|데일리 비타민C 1000|동서바이오팜|keep|데일리 비타민C 1000 커머스 판매|
|7|2250d675|화진 쏘팔HLJG0701|화진바이오코스메틱|keep|까까마에 정확 제품 판매|
|8|849e4891|알로에 젤리스틱|웰파인|keep|알로에 젤리스틱 커머스 판매|
|9|24ab5f73|우먼스헬스(전량 수출용)|씨티씨바이오|delete|전량수출용=비국내 유통|
|10|ad2aa170|고려홍삼정슈프림|케이지앤에프|keep|고려홍삼정 GS SHOP 판매|
|11|5dfbbe1f|슈퍼멀티비타민|한미양행|keep|한미 멀티비타민 코스트코/자사몰|
|12|376374bc|사라처럼 플러스|허브큐어|delete|제품 미검색|
|13|46563afb|엘릭솔플러스|한미양행|keep|한미몰 엘릭솔플러스 판매|
|14|86e10ee9|황해쑥추출분말|신우코퍼레이션|delete|개별인정 원료(소비자 SKU 아님)|
|15|11040bdb|비피더스4종혼합유산균-6000|비피도|keep|비피도 유산균 SSG/자사몰|
|16|5266bc46|셀로맥스 명품 피크노제놀|노바렉스|keep|cellromaxstore 정확 제품|
|17|b2f9f226|바나바+징코 Pro|한미양행|keep|한미 바나바징코 다나와/오아시스|
|18|c211cc0d|빼르르륵 라이트|네이처텍|delete|제품 미검색|
|19|0651a585|이뮨 올인원 멀티비타민&미네랄 플러스|한미양행|keep|JW중외 이뮨 올인원 동원몰|
|20|a2233a77|앤플러스디에이치에이|서흥|review|ODM 서흥, 정확 제품 미확인|
|21|d68c9a1e|티이아이-에이알지(TEI-ARG)|노바렉스|delete|미검색·아미노산 소재|
|22|7f36696c|홍삼농축액|비티씨|review|일반명·원료사(FermenGIN)|
|23|5af1efc9|홍삼영지농축분말캡슐골드(전량 수출용)|구안산업|delete|전량수출용=비국내|
|24|41c73c2b|홍삼의정석|고려원인삼|keep|고려원인삼 GS SHOP/vitaminzo|
|25|3a5dd301|홍삼농축액 20|진산사이언스|review|일반명, 정확 SKU 미확인|
|26|0b65b0e9|고려홍삼활력|정원|review|정확 제품 미확인|
|27|e0659842|조선 송침유|대원헬스케어|delete|제품 미검색|
|28|836b9143|건강한가 밀크씨슬|한풍네이처팜|keep|한풍 밀크씨슬 커머스 판매|
|29|2b78590f|바디폼레버리지오리밤|노바렉스|keep|바디폼레버리지 라인 gitree 판매|
|30|ed46a19f|슬림미드림다이어트|에스에스바이오팜|delete|제품 미검색|
|31|806c6102|녹차 카테킨|한국코스모|keep|다이소몰 녹차카테킨(한국코스모 유통) 판매|
|32|16f80bc2|종합건강 멀티비타민&미네랄|이앤에스|review|일반명|
|33|ee369eea|비타민C|한풍네이처팜|keep|한풍 비타민C(리포좀) 판매|
|34|70c8fcb9|삼성 MSM 365 플러스|씨이에스팜|keep|삼성제약 MSM 라인 다나와 판매|
|35|b20b7290|루테인지아잔틴24|대원헬스케어|keep|frombio 정확 제품 판매|
|36|28d0f944|매스테크|엠에스바이오텍|delete|제품 미검색|
|37|9e3f651e|인테로 눈건강 루테인 메타|케이지앤에프|delete|브랜드 미검색|
|38|c522cc75|흑삼기력 프리미엄|네이처텍|keep|유니베라 흑삼기력 프리미엄 판매|
|39|5d899069|듀오락 프로바이오틱스 에이(A)|쎌바이오텍|keep|듀오락 브랜드 다나와/공식몰|
|40|83749356|레나로 쇼|팜텍코리아|delete|미검색·ODM|
|41|f9f68b40|비피도박테리움 롱굼 엘(L)2|락토메이슨|delete|균주/원료(소비자 SKU 아님)|
|42|4c504a29|관절엔 콘드로이친 뮤코다당단백 1200|한미양행|keep|한미 콘드로이친 쿠팡 판매|
|43|9bea95b2|릴렉스 테아닌|다원바이오|review|정확 제품/업체 미확인|
|44|ab2ca930|태극삼분말5|대동고려삼|review|mfr 브랜드 존재, 정확 제품 미확인|
|45|23e9203d|쏙쏙 Ⅱ|오투바이오|delete|미검색·ODM|
|46|9b4d443e|초록유산균플러스9|메디오젠|delete|미검색·원료사(90% 원료매출)|
|47|40e7abb6|Orthomol Pro Metabol(전량수출용)|쎌바이오텍|delete|전량수출용=비국내|
|48|72ca88e9|초임계 쏘팔메토 로르산 115 앤 옥타코사놀|우리바이오|keep|순수식품 정확 제품 다나와|
|49|65fdf1be|더블액션 프리바이오틱스|맥널티바이오|keep|이승남 더블액션 11번가/GS/롯데|
|50|50c5718e|에센셜 포 맨 S|노바렉스|keep|셀파렉스 에센셜 포 맨 쿠팡/SSG|
|51|582dbb3b|키즈짱 STEP1|보고신약|delete|제품 미검색|
|52|28a39967|잘크톤 튼트니 홍삼젤리|바이오 로제트|keep|파머스 잘크톤 튼트니 홍삼 goldcandy|
|53|b2f918e9|간건강 밀크씨슬&비타민B|유디바이오|keep|유디 간건강 밀크씨슬 자사몰|
|54|7dd25b70|과채유래유산균 CJLP-133|씨제이웰케어|keep|CJ 바이오코어(CJLP133) 판매|
|55|a43e2e9c|레토나슈파림디|한국파비스알엔디|delete|제품 미검색|
|56|5c881714|슬림모닝 다이어트|콜마비앤에이치|delete|미검색·ODM(애터미 slim)|
|57|65b1526d|아연S|태웅식품|review|일반명(아연)|
|58|b4631cb7|루테인비타민D2000IU|노바렉스|review|일반명/조합, 정확 SKU 미확인|
|59|bf5a9cce|메가맨 50+|노바렉스|keep|GNC 메가맨 50+(노바렉스 제조) 11번가/동원몰|
|60|4b61f0b7|천일고려태극인삼정캅셀|케이지앤에프|delete|제품 미검색|
|61|f81cd189|우먼스울트라메가건강팩50플러스|노바렉스|keep|GNC 우먼스 울트라메가 50+ 동원몰|
|62|659cee6c|안성마춤 홍삼정골드|안성인삼농협|keep|안성마춤 홍삼정 자사몰/11번가|
|63|879580eb|카보스탑|해나눔|delete|제품 미검색|

**미조사 37건(#64~100)**: 추출됐으나 개별 검색 미수행(63건에서 비율 수렴 → 조기 종료). silent cap 방지 위해 명시. 필요 시 후속에서 조사.

---

## 9. 상품리스트 노출 구현 방향 제안 (§7)

`keep_candidate`(약 50%)를 상품리스트에 **설명 없이** 노출하기 위한 가장 안전한 방향:

| 방식 | 평가 | 판단 |
|---|---|---|
| **listable candidate 플래그 + 배지** (권장) | candidate 에 노출가능 표식(예 `candidate_status='listable'` 또는 `review_note` 태그) → 운영자/매장 상품검색이 HFF candidate 를 **'후보/미승격' 배지**로 함께 반환. ProductMaster·설명 무관. | **채택 권장** — master 불변, 설명 파이프라인 미접촉, 최소 변경 |
| Basic ProductMaster 승격 | 시장성 확인분만 최소필드 master 생성 | **비권장** — Gate B HOLD(바코드/SKU 원천 부재)로 grain 위반, 설명 파이프라인 차단 별도 필요 |
| candidate 포함 상품리스트 | 기존 상품리스트 API가 candidate 일부 반환 | 가능하나 소비자 노출면 UX·정합성 검토 필요(운영자/매장 화면 우선) |

**필요 변경 범위(권장안)**: (1) candidate 노출 플래그 컬럼/값 정의(추가 write WO), (2) operator/store 상품검색 read 필터에 `listable HFF candidate` optional 포함 + 배지, (3) 설명 생성 파이프라인은 candidate 노출과 **무관하게 유지**(자동 실행 경로 없음 — 이미 draft 0, bulk-apply 게이트로 차단). **이번 WO 에서는 구현하지 않음(설계만).**

---

## 10. 상세설명서 미생성 확인

- 상세설명서/LLM 설명 **생성 0건**. `product_candidate_description_drafts` 불변(0).
- 노출 항목은 상품명/업체·브랜드/(기존 candidate 이미지 없음)만. 설명은 후속에서도 자동 실행 금지.

---

## 11. DB 불변 검증

| 항목 | 값 |
|---|---|
| 이번 WO DB write | **0** (measurement-only) |
| candidate 상태 변경 / 삭제 / 승격 | 0 / 0 / 0 |
| `product_candidate_description_drafts` | 0 |
| `product_masters` | 무변경(HFF 0 유지) |

---

## 12. 후속 권장 정책 (§12)

표본 결과 **검색됨(keep) 50.8%** — "검색됨 비율 높음" 구간:

1. **전량 hard delete 철회 유지** — 과반이 실판매 제품. 전량삭제는 정상 상품 대량 오삭제.
2. **keep_candidate → 상품리스트 노출 후보**(설명 미생성). §9 listable 플래그 방식 별도 write WO.
3. **delete_marked 후보(33%)** — 단, 표본조사는 오탐 가능(수출용·원료·미검색). 전량 자동삭제 대신 **①전량수출용 ②개별인정 원료/균주(소비자 SKU 아님)** 같은 **규칙 기반 확실군 우선 정리** + 나머지는 표본 확대 후 결정.
4. **review_required(16%)** — 일반명/ODM. 검색기준 보강 또는 보류.
5. **dead-permit 선삭제**는 별도 원천(품목제조신고 현황+상태코드) 수집 WO 후에만 가능.
6. 모든 삭제/상태변경/노출은 **snapshot + 사용자 승인 후** write WO 로 분리.

---

## 부록. 필수 기록

| 항목 | 값 |
|---|---|
| 대상 | `product_candidates` (HFF, source_label=MFDS_HEALTH_FUNCTIONAL_FOOD) |
| 전체/HFF/pending candidate | 398,115 / 44,885 / 44,885 |
| 샘플 추출 / 조사 | 100 추출 / **63 조사** (비율 수렴 조기종료, 37 미조사 명시) |
| 검색원 | WebSearch(네이버쇼핑/쿠팡/11번가/올리브영/공식몰 커머스 노출) |
| keep / delete / review | **32(50.8%) / 21(33.3%) / 10(15.9%)** |
| dead-permit 신호 | **없음**(현재 데이터), 별도 원천 필요 |
| 상세설명서 생성 | **0** |
| DB write | **0** (삭제/승격/상태변경/설명 미실행) |
| 노출 방식 제안 | listable candidate 플래그 + 배지(master 불변, 설명 미생성) |
| 최종 판정 | **전량삭제 부적절 · keep 노출 + 확실군 우선 정리 권장** |
| 커밋 | 하단 |

**최종:** HFF candidate 무작위 63건 시장성 조사 결과 **keep 50.8% / delete 33.3% / review 15.9%** 로 수렴. 과반이 쿠팡/네이버 실판매 제품이므로 **전량 hard delete 는 부적절**. keep 후보는 ProductMaster 승격·설명 생성 없이 listable 플래그+배지로 노출, delete 후보는 규칙 기반 확실군(수출용·원료/균주) 우선 정리 후 표본 확대, dead-permit 선삭제는 별도 원천 수집 후. DB write 0, 설명 0.
