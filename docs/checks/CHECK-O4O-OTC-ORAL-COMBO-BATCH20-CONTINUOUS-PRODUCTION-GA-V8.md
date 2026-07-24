# CHECK — OTC 경구 복합성분 연속 생산 GA-V8 batch20

**WO:** WO-O4O-OTC-ORAL-COMBO-BATCH20-CONTINUOUS-PRODUCTION-GA-V8
**에이전트:** 가 (Drug OTC) · **기계:** sohae (병렬 home 기계와 분리 — 파이프라인 sohae 포팅)
**일자:** 2026-07-25
**상태:** PASS — batch20 **25 fp / 103 master** KO+EN STORE canonical LIVE, 독립검증 GREEN, 재실행 no-op.

## 1. 파이프라인 (sohae 기계 포팅)

home 기계 정본(pool-regen v7 / prodscreen v5 / ko-compose v6)은 hardcoded `C:/Users/home/coding` 경로 → **타 세션 소유, 미수정.** sohae 사본 신설(경로·프록시 5456만 치환, 의료/compose 로직 byte-identical):
- `otc-combo-pool-regen.ga.sohae.mjs` · `otc-combo-prodscreen.ga.sohae.mjs` · `otc-combo-ko-compose.ga.sohae.mjs`

READY 재산출(read-only): 경구 복합 fp 클러스터 census → **259 pickable / 816 pending master**(size3 ×223·size4 ×33·size5 ×3). 기존 tracked done fp(287) ∩ pickable = **0**. batch20 = size 내림차순 상위 25(size5 ×3 + size4 ×22 = 103 master).

## 2. 선정 그룹 (25 fp / 103 master)

치료군: 철분+비타민 조혈복합(B03AE·철함유 A11JC ×7) · 종합비타민/미네랄(A11AA·A11JC·A11JB·A11EX ×9) · 칼슘/비타민D(A12AX·A12CC ×3) · 마그네슘복합(×3) · 비오틴(A11HA05 ×1) · 니코틴산아미드(A11HA01 ×1) · 소화/제산(A02AX·A09AA ×3). sourceType: `A11/A12/A13A/B03AE` 접두 → `mfds_drug_otc_nutrition_combo`, 그 외(A02AX·A09AA) → `mfds_drug_otc`.

## 3. 콘텐츠 충실성 (원문 보존 — 신규 의료 사실 0)

deterministic KO composer(공식 easy_drug 효능·용법·경고·주의·상호작용·이상반응 → sd-* content_json 충실 재구성), EN은 KO 1:1 번역(로마자 title). 보존 안전정보:
- **6세 이하 철분 과량 치명적 중독 경고 + 어린이 손 닿지 않는 곳 보관**: 훼리큐·훼리탑에프·헤모테인·페리닥터·헤모포민에스35·하이비날골드·액티나민플러스.
- **비타민 A ≥5,000 IU 선천 기형 경고 + 임신 3개월 내 금기**: 키드칼골드·알피렌·아이비즈·알파파워.
- **아스파탐/페닐케톤뇨증 경고**: 키드칼골드·하이비날골드.
- **대두유/콩/땅콩 과민증 금기**: 마그엘디·토코엔지·쎄라투·씨이멕스·알피렌·그루타제·아이비즈.
- **고칼슘혈증·유육종증·신장결석·신부전 금기 + 강심배당체 병용주의**: 마이칼디·맥스디스·마그엘디·알파파워·비맥스메타.
- **레보도파 병용 금기**: 구아내·마그네스디·비맥스메타 등 다수(인산염·칼슘염·테트라사이클린·제산제 병용 금지 동반).
- **감초/글리시리진산·이뇨제(푸로세미드·트리클로르메티아지드) 상호작용 + 가성알도스테론증·근병증 경고**: 뉴믹스탈삼중정(제산제).
- **혈색소증·헤모시데린침착증·비철결핍성 빈혈 금기**(철분제 공통). 연령 경계·용량 수치·임신/수유/소아/고령 경고 전량 보존. 매장 내 약사 상담 안내 유지. 효능·금기·주의 약화 0, 제품 간 조성·경로 혼합 0.

## 4. claim 교집합 0

- 기존 가 tracked done fp(287) ∩ batch20(25) = **0**
- 나(SAFETY_MISMATCH)·다(첩부제) 트랙 완결분은 authored SPD 보유 → pool-regen `pending===size` + prodscreen `authored===0` 이중 제외로 census 진입 불가 → 교집합 0.

## 5. 실행 결과 (master당 6T = KO 4T + EN 2T, 배치 618 T)

| 단계 | 결과 |
|------|------|
| KO compose ×25 | 25/25 · skip 0 |
| KO dry-run ×25 | 25/25 PASS |
| KO apply ×25 | 25/25 APPLIED · writePlan==writeActual · dup 0 = **412 T** |
| EN dry-run ×25 | 25/25 PASS (한글 leak 0) |
| EN apply ×25 | 25/25 APPLIED = **206 T** |
| KO/EN 재실행 no-op | ALREADY_COMPLETE · dbWrite 0 |

## 6. 독립 검증 (runner 밖 직접 DB, 103 master)

| 항목 | 값 | 판정 |
|------|----|----|
| 대상 distinct master | 103 | — |
| KO authored canonical STORE | 103 | OK |
| EN canonical STORE | 103 | OK |
| EN needs_review 잔여 | 0 | OK |
| KO canonicalDup / EN canonicalDup | 0 / 0 | OK |
| easy 원문 deprecated | 103 | OK (전량 교체) |
| easy 원문 잔여 canonical | 0 | OK |

## 7. 중지 조건 점검

target/fingerprint/source 불일치 0 · 조성 혼합 0 · writePlan≠writeActual 0 · canonicalDup 0 · target 밖 write 0 · 기존 LIVE drift 0 · audit 누락 0 · rollback 0 · DB/인증/프록시 장애 0 · claim 교집합 0 → **중지 조건 미발동.**

## 8. 잔여 및 다음

- batch20 후 READY 잔여: 259 − 25 = **234 fp**(pending master 816 − 103 = **713**). size3 ×223·size4 ×11·size5 ×0.
- 다음 재시작: **batch21** (size4 잔여 11 + size3). 동일 sohae 파이프라인 재사용.
- GA-V8 라운드 목표(신규 80 fp AND 400 master) 진행: batch20 시점 25 fp / 103 master.
