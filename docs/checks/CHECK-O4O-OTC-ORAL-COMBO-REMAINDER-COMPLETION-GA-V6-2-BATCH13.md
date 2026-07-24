# CHECK — OTC 경구 복합성분 잔여 연속 생산 GA-V6-2 batch13

**WO:** WO-O4O-OTC-ORAL-COMBO-REMAINDER-CONTINUOUS-PRODUCTION-GA-V6-2-RESUME
**에이전트:** 가 (Drug OTC)
**일자:** 2026-07-24
**상태:** PASS — batch13 20그룹 / 269 master KO+EN STORE canonical LIVE, 독립검증 GREEN, 재실행 no-op

---

## 1. 범위

batch12(파일럿 10그룹 / 95 master, commit `01248d985`) PASS 이후 **연속 생산 재개 첫 배치**. 신규 조사·파일럿 반복 없이 batch12에서 검증된 V6 composer·runner·검증 계약을 그대로 재사용했다.

## 2. 잔여 풀 실측 (WO 전제와의 차이)

| 항목 | WO 전제 | 실측 (2026-07-24 pool-regen v5 재실행) |
|------|---------|--------------------------------------|
| 잔여 fp | 약 698 | **772** |
| 잔여 pending master | 약 1,967 | **3,479** |

- 실측 원자료: `{"atc_oral_combo_fp_groups":2694,"total_masters":10359,"candidates_count":772,"total_pending_masters":3479}`
- **주의:** `otc-combo-pool-regen.ga.v5.mjs` 는 `candidates.slice(0,300)` 로 **상위 300 후보만 파일에 기록**한다. 전체 772 fp 를 덮으려면 상한 상향이 필요하다(후속 배치에서 처리).
- WO 전제 "698/1,967"은 batch12 시점 스냅샷 기준의 잔여 추정치이며, 전수 sweep 실측과 다르다(batch12 CHECK §3 의 "43 vs 708"과 동일 구조).

## 3. 조성 판별 근거 확정 (신규 — 본 배치의 핵심 조사 결과)

batch12 이후 스크린을 확장하며 **조성(단일/복합) 판별 신호**를 실측 확정했다.

- `product_drug_extensions.active_ingredients` / `ingredient_summary` — 전체 **177,413 master 중 채워진 행 0** (`ai_filled=0, summ_filled=0`). 조성 판별에 사용 불가.
- `atc_code` — 176,962 채워짐, 그중 7자리 완전코드 129,173.
- easy_drug 원문도 효능·용법·주의만 담고 성분을 열거하지 않음.
- ⇒ **DB 내 유일한 공식 조성 신호 = ATC.** WHO 규약상 7자리 완전코드의 5단계 숫자 ≥50 = 복합제, <50 = 단일성분. 절단코드(3~5자리)는 조성 판별 불가이며 **단일성분 근거도 아니다.**
- 검증: batch12 승인 95 master 는 **전량 절단 ATC**(A09A 46 / A02AH 21 / A09AA 10 / A09AC 10 / A05A 8). 따라서 ATC 는 **적극적 배제 신호로만** 사용한다 — 7자리 & <50 인 경우에만 단일성분 확정 EXCLUDE.
- 보강 배제 규칙(pool 의 `!g.ingredient` 필터를 통과한 단일성분 누수 실측 차단): 그룹 **전 멤버 제품명**에 대해 ① 괄호 성분 표기(`바르젠정(클로닉신리시네이트)`) ② 말미 함량 표기(`오스틴엘시스틴연질캡슐500밀리그램`) 시 EXCLUDE. 단일물질 정의군 ATC 4단계(`A03AD` 파파베린)는 HOLD.

## 4. 스크린 판정 (상위 300 후보)

| 판정 | 그룹 수 |
|------|--------|
| READY | 137 (805 master) |
| EXCLUDE | 154 |
| HOLD | 8 |
| SPLIT_REQUIRED | 1 |
| **합** | **300** |

batch13 = READY 중 size 상위 **20그룹 / 269 master**.

## 5. batch13 선정 그룹 (20 fp / 269 master)

| fp | 대표명 | ATC | master |
|----|--------|-----|-------:|
| eeeb3afbdc7fbee8 | 새로모아캡슐 | D11AX | 60 |
| a0df42651d724493 | 덴드리스캡슐 | A01AD | 41 |
| 14d98713dec31160 | 티스탑에프캡슐 | A01AD | 13 |
| fba608b29a1b7ed0 | 파로네프캡슐 | A01AD | 12 |
| 0977eed528f941e8 | 락토폴정 | A07FA51 | 11 |
| 7ffa970ad3e1f793 | 케라탑캡슐 | D11AX | 11 |
| 2f70f3125c893365 | 락토폴플러스정 | A07FA51 | 10 |
| 417ff6f3ac64e5ce | 마이시딜캡슐 | D11AX | 10 |
| 5c5833336f4105bc | 리피클연질캡슐 | C10B | 10 |
| a84ed9470bc34b72 | 이덴큐캡슐 | A01AD | 10 |
| b86ec051457ce436 | 콜레스텐연질캡슐 | C10B | 10 |
| 65c686b22a3a960e | 멜린씨정 | D11AX | 9 |
| 73e0834e852d6957 | 웰러드연질캡슐 | C10B | 9 |
| 1ed969e3dfb3a843 | 덴카바캡슐 | A01AD | 8 |
| 268b5da57ba3c359 | 듀오레플러스정 | A07FA51 | 8 |
| 7cd43f797f5647b6 | 듀오레정 | A07FA51 | 8 |
| a451c1b9a5656f1d | 락토스탑정 | A07FA51 | 8 |
| 246b347480652e7f | 체비거프러스정 | A08AX | 7 |
| 827c2fdaa18b348c | 트레스오릭스포르테캡슐 | A15 | 7 |
| d3f60492492fb5dc | 에스알파정 | A09A | 7 |

치료군: 탈모·모발(D11AX ×3) · 치주염 보조(A01AD ×5) · 지사(A07FA51 ×5) · 고콜레스테롤/지질(C10B ×3) · 색소침착·비타민(D11AX 멜린씨정) · 체중감량 보조(A08AX) · 식욕부진(A15) · 소화불량(A09A).

## 6. claim 교집합 0

- 나(SAFETY_MISMATCH) claim master UUID ∩ batch13 = **0**
- 다(첩부제 DA-V8) claim ∩ batch13 = **0**
- 기존 가 claim fp(77) ∩ batch13 fp = **0**
- 나·다 산출 config JSON 내 master UUID(1,497) ∩ batch13 269 = **0**
- pool 필터 `pending===size` 자체가 타 트랙 선점분을 배제한다.

## 7. 생산 파이프 (무변경 재사용)

- **screen:** `otc-oral-combo-screen.ga.v6.mjs` — 판정 계단 확장(§3). 4-way verdict.
- **KO:** `otc-combo-ko-compose.ga.v6.mjs` — batch12와 동일, 의료 로직 무변경. easy_drug 공식 원문 → content_json 충실 재구성(신규 의료 사실 0).
- **EN:** `otc-oral-combo-leaflet-en-batch13.ga.json` 저작 후 config 각 그룹 `en` 블록 병합. 수치·연령·금기·상담연결 보존, 한글 렌더 0, summaryTable 3축.
- **runner:** `otc-oral-combo-store-leaflet-runner.ga.ts` 무변경, 이중게이트 `--apply` + `OTC_COMBO_LEAFLET_{KO,EN}_CONFIRM=YES`.

## 8. 실행 결과

| 단계 | 결과 |
|------|------|
| KO dry-run ×20 | 전부 PASS · 이상 0 |
| KO apply ×20 | 전부 APPLIED · writePlan == writeActual == **1,076 T** (269×4) |
| KO 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |
| EN dry-run ×20 | 전부 PASS · 이상 0 |
| EN apply ×20 | 전부 APPLIED · writePlan == writeActual == **538 T** (269×2) · step1 269 / step2 269 · koUnchanged true ×20 · dup 0 ×20 |
| EN 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |

master당 총 **6T** (KO 4T + EN 2T), 배치 합 **1,614 T**.

## 9. 독립 검증 (runner 밖 직접 DB 쿼리, 269 master)

| 항목 | 값 | 판정 |
|------|----|----|
| 대상 distinct master | 269 | — |
| KO authored canonical STORE (내 fp 앵커) | 269 | OK |
| EN canonical STORE | 269 | OK |
| EN needs_review 잔여 | 0 | OK |
| canonicalDup (master/type/lang) | 0 | OK |
| easy 원문 잔여 canonical | 0 | OK (전량 deprecated) |
| target 밖 drift (내 fp 앵커가 비-대상 master 접촉) | 0 | OK |

## 10. 중지 조건 점검

타 claim 교집합 0 / source·fingerprint 불일치 0 / writePlan≠writeActual 0 / canonicalDup 0 / target 밖 write 0 / 기존 LIVE drift 0 / audit 누락 0 / rollback 발동 0 / DB·스키마·인증 장애 0 / 동일 오류 반복 0 → **중지 조건 미발동.**

## 11. 후속

batch14 이후 연속 생산 계속. 종료 조건(신규 40 fp AND 400 master / 10시간 / 잔여 전량 처리 / 안전 풀 소진 / 중지 조건) 미충족 상태.
다음 재시작 지점 = 스크린 READY 137그룹 중 batch13 20그룹을 제외한 **117그룹 / 536 master** 상위부터. 전체 772 fp 커버에는 pool-regen 상한(300) 상향 필요.
