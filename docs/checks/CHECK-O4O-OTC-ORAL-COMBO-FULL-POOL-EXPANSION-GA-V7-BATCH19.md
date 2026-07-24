# CHECK — OTC 경구 복합성분 연속 생산 GA-V7 batch19 (종료 배치)

**WO:** WO-O4O-OTC-ORAL-COMBO-BATCH16-AND-FULL-POOL-EXPANSION-GA-V7
**에이전트:** 가 (Drug OTC)
**일자:** 2026-07-24
**상태:** PASS — batch19 25그룹 / 100 master KO+EN STORE canonical LIVE, 독립검증 GREEN, 재실행 no-op. **WO 종료 조건 "신규 40 fp AND 400 master" 충족(누계 100 fp / 414 master).**

---

## 1. 범위

batch18(25그룹 / 100 master, `922dc53f2`) 이후 GA-V7 연속 생산 종료 배치. 스크리너 slice 상한은 batch16에서 제거(`712101b9a`)되어 전체 census 완료 상태이므로, batch19는 재산출 없이 재분류된 READY 잔여 중 상위 25그룹(전부 size 4)을 생산했다.

## 2. batch19 선정 그룹 (25 fp / 100 master, 전부 size 4)

| fp | 대표명 | ATC | sourceType | master |
|----|--------|-----|-----------|-------:|
| 896c9f96ab4136c9 | 쎈비백뉴로업정 | A11JC | nutrition_combo | 4 |
| 8cd3f4345b3aa75a | 맥세렌비제트정 | A11JB | nutrition_combo | 4 |
| 93f8f9da82d5e19d | 미투-에스연질캡슐 | A11JB | nutrition_combo | 4 |
| 94159bef193bffba | 리버골드에프연질캡슐 | A05BA | drug_otc | 4 |
| 94c92b1f1f508cec | 테라젠비타골드정 | A11JC | nutrition_combo | 4 |
| 95f26bb515556289 | 위싱유정 | A02AX | drug_otc | 4 |
| 97f798410bdae1d6 | 활비에이캡슐 | A11JA | nutrition_combo | 4 |
| 98079e34748adae9 | 엘비페롤정 | A12AX | nutrition_combo | 4 |
| 9a533ad885ec10ec | 헤모큐수정 | B03AE | nutrition_combo | 4 |
| 9c0c04463feaad48 | 삐콤정 | A11EB | nutrition_combo | 4 |
| a1623f1a1f1ab3d8 | 에디맥스디정 | A12AX | nutrition_combo | 4 |
| a39edf7cb87e4a26 | 제니폴연질캡슐 | C10B | drug_otc | 4 |
| a3dec6a19ffd68b2 | 토마쎈플러스연질캡슐 | A11JB | nutrition_combo | 4 |
| a5244581d1b9a531 | 센티렉스어드밴스정 | A11JC | nutrition_combo | 4 |
| a5a7e0c58f2624fa | 위속엔정 | A02AX | drug_otc | 4 |
| a9fb9874e9cc78c3 | 코큐텐비타알부정 | A11AB | nutrition_combo | 4 |
| ac3c1c16bb8ccf74 | 속편아제정 | A09AA | drug_otc | 4 |
| b0ba0bbcff5da724 | 센티렉스실버어드밴스정 | A11JC | nutrition_combo | 4 |
| b151c57cfc31f604 | 네오칼디정 | A12AX | nutrition_combo | 4 |
| bb280c74c76cf677 | 위앤프레쉬정 | A02AX | drug_otc | 4 |
| bca957a346248e42 | 메가트루골드정 | A11AA | nutrition_combo | 4 |
| bd6e77255e5f9e61 | 조인파워연질캡슐 | A11EX | nutrition_combo | 4 |
| bde6c720ceabe49d | 토마벤연질캡슐 | A11JC | nutrition_combo | 4 |
| bec236229e411cd0 | 헤파코엔플러스정 | A11AB | nutrition_combo | 4 |
| bf208d9058d5138c | 쎄투연질캡슐 | A11JB | nutrition_combo | 4 |

치료군: 비타민·미네랄·칼슘 보급(A11/A12/B03 계열 ×18) · 제산/소화기(A02AX·A09AA ×4) · 간질환 보조(A05BA ×1) · 지질대사 개선(C10B ×1) · 총 25. `sourceType` — ATC `A11/A12/A13A/B03AE` 접두 → `mfds_drug_otc_nutrition_combo`, 그 외(A05BA·A02AX·A09AA·C10B) → `mfds_drug_otc`.

## 3. 콘텐츠 충실성 (원문 보존 — 신규 의료 사실 0)

공식 원문(easy_drug)의 효능·용법·금기·주의를 KO `content_json`으로 충실 재구성, EN은 KO를 1:1 번역하며 다음 안전정보를 보존했다.

- **비타민 A ≥5,000 IU 선천 기형 경고 + 임신 3개월 내 금기**: 센티렉스어드밴스정 · 코큐텐비타알부정 · 센티렉스실버어드밴스정 · 메가트루골드정 · 헤파코엔플러스정.
- **6세 이하 철분 과량 치명적 중독 경고(어린이 손 닿지 않는 곳 보관)**: 헤모큐수정 · 센티렉스어드밴스정 · 코큐텐비타알부정 · 센티렉스실버어드밴스정.
- **대두유/콩/땅콩 과민증 금기**: 미투-에스 · 리버골드에프 · 제니폴 · 토마쎈플러스 · 조인파워 · 토마벤 · 쎄투.
- **제산제(위속엔정·위앤프레쉬정)**: 15세 미만·임신/임신 가능·수유부·투석 환자 금기, 감초/글리시리진산/이뇨제(furosemide·트리클로르메티아지드) 상호작용, 가성 알도스테론증·근병증(미오파시) 경고 보존.
- **위싱유정(제산제)**: 투석 환자·7세 이하 금기, 테트라사이클린계 항생제 병용 회피 명시.
- **활비에이캡슐**: 레보도파 병용 금기, 3개월 미만 영아 금기 명시.
- **제니폴연질캡슐(지질대사)**: 비만·당뇨/본태성 고콜레스테롤혈증 지질대사 개선 효능 보존, 대두·황색5호 과민 주의.
- **리버골드에프연질캡슐**: 만성 간질환·독성 간질환 보조 효능 명시.
- **엘비페롤·에디맥스디·네오칼디정**: 고칼슘혈증·사르코이드증·신장결석·심한 신부전 금기, 강심배당체 병용 주의 보존.
- 모든 그룹에 매장 내 약사 상담 안내 유지, 효능·금기·주의 약화 0, 제품 간 조성·경로 혼합 0.

## 4. claim 교집합 0

- 나(SAFETY_MISMATCH) claim ∩ batch19 fp/master = **0**
- 다(첩부제 DA-V8/V9, `otc-combo-leaflet-*`) claim ∩ batch19(`otc-oral-combo-leaflet-*`) fp/master = **0**
- 기존 가 DONE claim fp(batch16·17·18) ∩ batch19 fp(25) = **0**
- prep 스크립트 da 교집합 가드(`da intersection` throw)로 사전 차단.

## 5. 실행 결과

| 단계 | 결과 |
|------|------|
| KO 저작(compose) ×25 | 25/25 · skip 0 |
| KO dry-run ×25 | 전부 PASS |
| KO apply ×25 | 전부 APPLIED · writePlan==writeActual · dup 0 = **400 T** |
| EN dry-run ×25 | 전부 PASS |
| EN apply ×25 | 전부 APPLIED = **200 T** |
| KO 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |
| EN 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |

master당 총 **6T** (KO 4T + EN 2T), 배치 합 **600 T**. EN `title`은 영문 로마자 표기(예: `Elbiferol Tablet`, `Neocaldi Tablet`)로 저작하여 `en 한글 포함` ABORT 없이 25/25 통과.

## 6. 독립 검증 (runner 밖 직접 DB 쿼리, 100 master)

| 항목 | 값 | 판정 |
|------|----|----|
| 대상 distinct master | 100 | — |
| KO authored canonical STORE (내 fp 앵커) | 100 | OK |
| EN canonical STORE | 100 | OK |
| EN needs_review 잔여 | 0 | OK |
| KO canonicalDup | 0 | OK |
| EN canonicalDup | 0 | OK |
| 앵커 밖 drift (내 fp 앵커 ∧ 비대상 master) | 0 | OK |
| easy 원문 잔여 canonical | 0 | OK (전량 deprecated) |

## 7. 중지 조건 점검

타 claim 교집합 0 / source·fingerprint 불일치 0 / writePlan≠writeActual 0 / canonicalDup 0 / target 밖 write 0 / 기존 LIVE drift 0 / audit 누락 0 / rollback 발동 0 / DB·스키마·인증 장애 0 / 동일 오류 반복 0 → **중지 조건 미발동.**

## 8. 누계 및 종료 판정

| 항목 | batch16 | batch17 | batch18 | batch19 | **GA-V7 누계** |
|------|--------:|--------:|--------:|--------:|-------------:|
| fp | 25 | 25 | 25 | 25 | **100** |
| master | 114 | 100 | 100 | 100 | **414** |
| write T | 684 | 600 | 600 | 600 | **2,484** |

- **WO 종료 조건 "신규 400 master AND 신규 40 fp" 충족**: fp 100 ≥ 40 ✓ AND master 414 ≥ 400 ✓ → **양쪽 조건 동시 충족 → GA-V7 연속 생산 종료.**
- 잔여 READY: GA 누적 DONE(100 fp) 처리 후 **잔여 READY 251그룹 / 779 master**(size 3 ×225, size 4 ×26) — 후속 배치(batch20+) 대기.
- 전체 재분류 census(712 fp): READY 351 / 나머지 HOLD·EXCLUDE·SPLIT은 batch16 CHECK에 기재. batch19 신규 READY/SPLIT/HOLD/EXCLUDE 재분류 변동 0(census 불변, 이미 batch16에서 확정).
