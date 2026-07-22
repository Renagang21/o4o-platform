# CHECK-O4O-OTC-ORAL-MULTI-INGREDIENT-STORE-LEAFLET-PRODUCTION-GA-V2

WO: `WO-O4O-OTC-ORAL-MULTI-INGREDIENT-STORE-LEAFLET-PRODUCTION-GA-V2` · 에이전트 **가(GA)** · 2026-07-22

## 0. 정정 배경 (V1 → V2)

V1 감사는 "기존 authored 공통 canonical 을 **확장**할 수 없다"를 "생산 불가(NO_NEW_BATCH)"로 과잉 방어 해석했다.
정정(사용자 지시): **공식 `easy_drug` 원문을 근거로 제품별·안전 동질 subgroup별 매장용 설명서를 신규 저작**하면 된다.
이 설명서는 약사가 있는 매장의 소비자 설명서로, **질병명·증상명·허가 효능을 명확히 표현**하고 매장 내 전문가 상담으로 연결하는 것이 안전 원칙이다. 정보 은폐가 안전이 아니다.

## 1. 결과 (파일럿 3그룹 KO+EN LIVE)

| # | groupKey | ATC | 제형 | target | source_type | KO | EN |
|--:|---|---|---|--:|---|:--:|:--:|
| 1 | 위엔스탈정\|A02AX\|100밀리그램\|정 | A02AX | 정 | 3 | mfds_drug_otc | ✅ | ✅ |
| 2 | 에스톰액\|A16AX\|20그램\|액 | A16AX | 액 | 3 | mfds_drug_otc | ✅ | ✅ |
| 3 | 디케이정\|A11JC\|339.5밀리그램\|정 | A11JC | 정 | 3 | mfds_drug_otc_nutrition_combo | ✅ | ✅ |

**[Batch 2 추가]**

| # | groupKey | ATC | 제형 | target | source_type | KO | EN |
|--:|---|---|---|--:|---|:--:|:--:|
| 4 | 마그온플러스연질캡슐\|A11JC\|250밀리그램\|연질캡슐 | A11JC | 연질캡슐 | 3 | mfds_drug_otc_nutrition_combo | ✅ | ✅ |
| 5 | 엑세라민에이스정\|A11AA\|50밀리그램\|정 | A11AA | 정 | 3 | mfds_drug_otc_nutrition_combo | ✅ | ✅ |
| 6 | 쎌레타민정\|A11JC\|100밀리그램\|정 | A11JC | 정 | 3 | mfds_drug_otc_nutrition_combo | ✅ | ✅ |
| 7 | 헤모글루탑연질캡슐\|B03AE10\|200밀리그램\|연질캡슐 | B03AE10 | 연질캡슐 | 3 | mfds_drug_otc | ✅ | ✅ |

**세션 합계: 완료 그룹 7 · 완료 master 21 · KO write 21(교체) · EN write 21(신규).**
Batch2 독립검증: 12 target → ko_authored 12 · en 12 · easy_deprecated 12 · easy_still_canon 0 · ko_dup 0.
Batch2 보존 안전정보 예: 비타민 A 5,000 IU 임신 초기 금기 경고(엑세라민), 대두유·콩·땅콩 과민 금기(마그온·쎌레타민), 철분 6세 이하 과량 중독사망 경고(헤모글루탑) — 전량 원문 강도 그대로 보존.

## 2. 독립 검증 (runner 자기보고와 별도 SQL)

9 target 기준: `ko_canon_authored=9 · en_canon=9 · easy_deprecated=9 · ko_dup=0 · easy_still_canon=0 · audit_logs(canonical_replaced, V2)=9`.
→ 교체 정상 · 중복 0 · easy canonical 잔존 0 · 감사로그 완비.

## 3. 파이프라인 (신규 저작 = 확장 아님)

1. **감사 SSOT**: `otc-oral-multi-ingredient-combo-fp-audit-ga.mjs` — 경구 복합 fingerprint 클러스터 2,826, 그중 clean 소규모 균일 후보 **1,587**(3≤size≤8, safety/source/form/route 균일, 전량 pending). target_master_ids = 클러스터 멤버.
2. **저작**: 공식 easy_drug 원문(효능·효과 / 용법·용량 / 경고 / 사용상 주의사항 / 상호작용 / 이상반응)을 소비자 친화 구조화 필드(efficacy·usage·caution·summaryTable·ingredientSelection)로 재구성. `otc-oral-combo-leaflet-config.ga.json`.
3. **KO 적재(교체)**: `buildDrugOtcConsumerHtml`(sd-* 계약) → STEP A authored needs_review INSERT → STEP B 단일TX(easy canonical→deprecated / authored→canonical / audit_log). fingerprint 재현 게이트 + easy-canonical-정확히1 + authored 충돌0 + route/form/safety 균일.
4. **EN 적재(신규)**: `buildDrugOtcEnConsumerHtml` → en needs_review INSERT → flip canonical + ko 불변 사후검증.
5. **이중게이트**: `--apply` + `OTC_COMBO_LEAFLET_KO_CONFIRM=YES` / `..._EN_CONFIRM=YES`. dry-run 기본. 재실행 ALREADY_COMPLETE no-op. source_ref=uuid(md5(targetFp)) 결정론 앵커.

## 4. 저작 계약 준수 (V2)

| 원칙 | 준수 |
|---|---|
| 공식 원문 효능·용법·금기·주의 재구성 | ✅ 전 필드 원문 근거 |
| 질병명·증상명·허가 효능 명확 표현 | ✅ (위산과다·소화불량·구루병 예방 등 원문 그대로) |
| 신규 의료사실 추가 | 0 |
| 효능·금기·주의 강도 약화 | 0 (페닐케톤뇨증 경고·고칼슘혈증 금기 등 보존) |
| 마케팅 비교·추천·우월성 | 0 |
| 조성(성분명·함량) 창작 | 0 (성분 미상 → 기능 서술만, 특정 성분 단정 없음) |
| 매장 내 약사 상담 연결 | ✅ ingredientSelection 하단 |

## 5. 안전·경계

- 예약 combo 계열(`DRUG_OTC_COMBO_FAMILIES`: A06AB52·A06AC51·M03BB53·M09AB52·A02BA53·M01AE51) 및 감기약(cold-combo) 계열 **회피**.
- 대상 9 master: 기존 authored SPD 0 · draft 0 (사전 확인). easy canonical 정확히 1.
- 타 에이전트(나·다) claim(nutrition_combo EN-only 16그룹) 과 교집합 0 — 신규 source_ref 앵커.
- production write = KO 교체 9 + EN 신규 9. canonicalDup 0 · 기존 LIVE drift 0 · target 밖 write 0.

## 6. 산출물

- `apps/api-server/src/scripts/otc-oral-combo-store-leaflet-runner.ga.ts` (KO 교체 + EN 신규 러너, --selftest PASS)
- `apps/api-server/src/scripts/data/otc-oral-combo-leaflet-config.ga.json` (3그룹 KO+EN 저작)
- `apps/api-server/src/scripts/otc-oral-multi-ingredient-combo-fp-audit-ga.mjs` (+candidate 산출)
- `apps/api-server/src/scripts/otc-oral-combo-source-fetch.ga.mjs` (원문 fetch, read-only)
- `apps/api-server/src/scripts/data/otc-combo-leaflet-*.run.json` (6 실행 manifest)
- 본 CHECK

## 6-B. Batch 3 (V3 연속 생산 — 결정론 KO composer)

WO-O4O-OTC-ORAL-MULTI-INGREDIENT-CONTINUOUS-PRODUCTION-GA-V3.

- **결정론 KO composer** `otc-combo-ko-compose.ga.mjs`: 공식 easy_drug 원문 섹션(효능/용법/경고/주의/상호작용/이상반응)을 소비자 sd-* 카드 구조 content_json 으로 **충실 재구성**(신규 의료사실 0·강도 약화 0·마케팅 0·조성 창작 0, 어투만 소비자화 마십시오→마세요·의사또는약사→약사, caution 을 경고/금기/상담/상호작용/이상반응 항목으로 분리). 요약: 순수 원문 재구성이라 자유 저작보다 왜곡 위험이 낮음.
- **생산 스크린** `otc-combo-prodscreen.ga.mjs`: 명확한 복합제 ATC 계열 allowlist(A11·A12·A13A·B03AE 비타민/미네랄/토닉/철복합, A02AD/AH/AX 제산복합, A09AA 소화효소복합, A05 간담즙복합, A16A) — 단일성분·감기·민감(항혈소판/호르몬)·구강국소·예약계열 제외.
- **Batch3 = 15 fp 그룹 / 271 master KO LIVE**(헤모텐 46·알마게이트 22·네오칼큐 21 등). KO 교체 271, 전량 dry-run PASS·독립검증(global ko dup 0, GA canonical_replaced audit 292=21+271). EN 후속(KO 우선).
- 세션 누계: **22 fp 그룹 / 292 master KO**(그중 7그룹 21master EN 완결). authored_ko_canon 3,891→4,190.

## 6-C. Batch 4 (V3 연속 생산) — 종료 임계 달성

- **Batch4 = 25 fp 그룹 / 238 master KO LIVE**(소화효소·제산·간담즙·비타민 복합제). 결정론 composer 동일 파이프라인. 전량 dry-run PASS.
- **세션 누계: 47 fp 그룹 / 530 master KO LIVE** — V3 종료 임계 **≥40 그룹 AND ≥400 master 동시 달성**.
- 독립검증: GA `canonical_replaced` audit **530**(=21+271+238) · global ko dup **0** · easy∩authored canonical **0**(교체 무결). EN 완결 7그룹 21master, EN 후속 40그룹 509master(다음 재시작).

## 7. 다음 (계속 생산)

후보 1,587 중 예약계열·감기약 제외, clean 균일 subgroup 부터 연속 저작·적재. 계약 안정 확인됨(3/3 PASS·독립검증 통과).
