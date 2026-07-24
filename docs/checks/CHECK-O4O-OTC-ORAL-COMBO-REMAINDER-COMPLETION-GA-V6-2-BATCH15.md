# CHECK — OTC 경구 복합성분 잔여 연속 생산 GA-V6-2 batch15

**WO:** WO-O4O-OTC-ORAL-COMBO-REMAINDER-CONTINUOUS-PRODUCTION-GA-V6-2-RESUME
**에이전트:** 가 (Drug OTC)
**일자:** 2026-07-24
**상태:** PASS — batch15 20그룹 / 100 master KO+EN STORE canonical LIVE, 독립검증 GREEN, 재실행 no-op

---

## 1. 범위

batch13(20그룹 / 269 master, `338653a8a`) · batch14(20그룹 / 114 master, `2028db4f7`) PASS 이후 **연속 생산 세 번째 배치**. 신규 조사·파일럿 없이 batch12~14에서 검증된 V6 composer·runner·검증 계약을 그대로 재사용했다.

선정 기준 = 스크린(상위 300 후보) READY 137그룹 중 batch13·14의 40그룹을 제외한 97그룹의 size 상위 20그룹(전부 size 5).

## 2. batch15 선정 그룹 (20 fp / 100 master)

| fp | 대표명 | ATC | master | 치료 내용 |
|----|--------|-----|-------:|-----------|
| 6175c7cfbc6b8b54 | 삐콤씨정 | A11JB | 5 | 비타민 E·B1·B2·B6·C 보급, 신경통·근육통·관절통, 구내염, 색소침착 |
| 79456d8c2fff00c9 | 바로코민골드정 | A11JB | 5 | 비타민 보급 + 아연 보급, 구내염·습진 |
| 8ed6f9fb16aa7184 | 비오라민골드정 | A11JA | 5 | 비타민 보급, 신경통·각기·눈의 피로 |
| 9f7f626fecc205eb | 투엑스비디큐정 | A11JC | 5 | 비타민 D·E·B·C + 아연, 뼈·치아 발육 부전·구루병 예방 |
| add2b07bc1583454 | 비스콘틴엠800정 | A11JC | 5 | 비타민 B1·B2·B6·D, 신경통·구내염 |
| 8d6181cd7e484a0c | 레날민정 | A11EB | 5 | 투석·만성신부전 환자 비타민 B·C 보급 |
| 7a3c740ee9e83703 | 원더칼-디츄어블정 | A12AX | 5 | 비타민 D·칼슘 보급 (아스파탐 경고) |
| 86ce27ed6717d145 | 비카페롤플러스정 | A12AX | 5 | 비타민 D·칼슘 보급 |
| 8da10ae53a23825a | 칼디업츄어블정 | A12AX | 5 | 칼슘 보급 (아스파탐 경고) |
| 67a6c8244150d509 | 덴파사캡슐 | A01AD | 5 | 치주치료 후 치은염·치주염 보조 |
| a8009ef123db1b0f | 덴타포스캡슐 | A01AD | 5 | 치은염·치주염 보조 |
| 7ebfea340c93bee7 | 트레스오릭스훠트정 | A15 | 5 | 식욕부진 (아스파탐 경고 · 녹내장·요저류 금기) |
| 81f555b1f8c38c77 | 복합탈시드츄어블정 | A02AX | 5 | 속쓰림·위산과다 (아스파탐 경고 · 투석환자 금기) |
| b176b6aee4c65b4f | 애니탈삼중정 | A02AX | 5 | 소화성 궤양 수반 증상 개선 (감초·이뇨제 상호작용) |
| 996ad30df85d3b48 | 스피자임에스정 | A09AA | 5 | 소화불량·식욕감퇴 |
| b69f346969f4961f | 판크론정 | A09AA | 5 | 소화불량 (대두유·콩·땅콩 과민증 금기) |
| b3c0e43517584a43 | 제스탈정 | A09A | 5 | 소화불량 (황색4호 과민증 주의) |
| 9b90a09f2962c569 | 더블락캡슐 | A07FA51 | 5 | 소화불량 + 정장·변비·장내이상발효 |
| 84f0ccc6e6c161bc | 스토프정 | A07AX | 5 | 설사·묽은 변·토사 |
| a09214a7cfa42bfb | 동성정로환에프정 | A07XA | 5 | 설사·토사 |

치료군: 비타민·미네랄 보급(A11/A12 ×9) · 소화기(A02/A09 ×5) · 지사·정장(A07 ×3) · 치주염 보조(A01AD ×2) · 식욕부진(A15).

`sourceType` — `mfds_drug_otc` 11그룹, `mfds_drug_otc_nutrition_combo` 9그룹.

## 3. claim 교집합 0

- 나(SAFETY_MISMATCH) claim ∩ batch15 fp/master = **0**
- 다(첩부제 DA-V8) claim ∩ batch15 fp/master = **0**
- 기존 가 claim fp(119) ∩ batch15 fp(20) = **0**
- 보강 검증: `src/scripts/data` 내 `*claim*.json`(ga/na/da/template) + `*safety-subgroup*.json` 전문에 내 20 fp + 100 master UUID 토큰 스캔 → **hit 0**. 레거시 코퍼스·분석 산출물(`otc-fingerprint-shard-*`, `otc-full-corpus-*` 등) 11건 매칭은 claim 파일이 아니며 선점과 무관.
- pool 필터 `pending===size` 자체가 타 트랙 선점분을 배제한다.

## 4. 생산 파이프 (무변경 재사용)

- **KO:** `otc-combo-ko-compose.ga.v6.mjs` — batch12~14와 동일, 의료 로직 무변경. easy_drug 공식 원문 → `content_json` 충실 재구성(신규 의료 사실 0, 효능·금기·주의 약화 0, 약사 상담 안내 유지).
- **EN:** `otc-oral-combo-leaflet-en-batch15.ga.json` 저작 후 config 각 그룹 `en` 블록 병합. 수치·연령·금기·상호작용(레보도파·타닌 함유 차·감초·이뇨제 등)·페닐케톤뇨 아스파탐 경고·상담연결 보존, 한글 렌더 0(`groupKey` 제외), summaryTable 3축.
- **runner:** `otc-oral-combo-store-leaflet-runner.ga.ts` 무변경, 이중게이트 `--apply` + `OTC_COMBO_LEAFLET_{KO,EN}_CONFIRM=YES`.

## 5. 실행 결과

| 단계 | 결과 |
|------|------|
| KO dry-run ×20 | 전부 PASS · 이상 0 |
| KO apply ×20 | 전부 APPLIED · stepA_inserted 100 / flipped 100 / demoted 100 / audited 100 · authoredConflict 0 = **400 T** |
| KO 사후 | canonical1 100 / authored 100 / deprecatedEasy 100 / dup 0 |
| KO 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |
| EN dry-run ×20 | 전부 PASS · 이상 0 · koFingerprintKinds 전부 1 · existingEn 0 |
| EN apply ×20 | 전부 APPLIED · plan == actual · step1_inserted 100 / step2_flipped 100 = **200 T** · koUnchanged true ×20 · dup 0 ×20 |
| EN 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |

master당 총 **6T** (KO 4T + EN 2T), 배치 합 **600 T**.

## 6. 독립 검증 (runner 밖 직접 DB 쿼리, 100 master)

| 항목 | 값 | 판정 |
|------|----|----|
| 대상 distinct master | 100 | — |
| KO authored canonical STORE (내 fp 앵커) | 100 | OK |
| EN canonical STORE | 100 | OK |
| EN needs_review 잔여 | 0 | OK |
| canonicalDup (master/type/lang) | 0 | OK |
| EN target 밖 drift (내 fp 앵커 ∧ 비대상 master) | 0 | OK |
| KO target 밖 drift | 0 | OK |
| easy 원문 잔여 canonical | 0 | OK (전량 deprecated) |

## 7. 중지 조건 점검

타 claim 교집합 0 / source·fingerprint 불일치 0 / writePlan≠writeActual 0 / canonicalDup 0 / target 밖 write 0 / 기존 LIVE drift 0 / audit 누락 0 / rollback 발동 0 / DB·스키마·인증 장애 0 / 동일 오류 반복 0 → **중지 조건 미발동.**

## 8. 누계 및 후속

| 항목 | batch13 | batch14 | batch15 | **재개 누계** |
|------|--------:|--------:|--------:|-----------:|
| fp | 20 | 20 | 20 | **60** |
| master | 269 | 114 | 100 | **483** |
| write T | 1,614 | 684 | 600 | **2,898** |

- WO 종료 조건 "신규 40 fp 이상 **AND** 신규 400 master 이상" — fp 60 · master 483 → **충족. 재개 배치 종료.**
- 다음 재시작 지점 = 스크린 READY 137그룹 중 batch13·14·15의 60그룹을 제외한 **77그룹 / 약 322 master** 상위부터.
- 전체 772 fp 커버에는 `otc-combo-pool-regen.ga.v5.mjs` 의 `candidates.slice(0,300)` 상한 상향이 필요하다(batch13 CHECK §2).
