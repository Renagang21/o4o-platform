# CHECK — WO-O4O-OTC-TOPICAL-PATCH-STORE-LEAFLET-PRODUCTION-DA-V7

> 첩부제(플라스타·파프·카타플라스마·패치) OTC 매장용 설명서 KO+EN 연속 생산 — 에이전트 다
> 실행일: 2026-07-23 · 상태: **CLOSED / PASS (종료 임계 달성)**

---

## 1. 결과 요약

| 항목 | 값 |
|------|-----|
| 종료 임계 | 신규 master ≥ 400 → **달성 (513)** |
| 신규 canonical master | **513** (KO 2,052행 + EN 1,026행) |
| 성분별 | 케토프로펜 179 · 플루르비프로펜 173 · 디클로페낙나트륨 149 · 디클로페낙디에틸암모늄 8 · 디클로페낙에폴아민 4 |
| HOLD | 하루펜플라스타 4 (HOLD_MIX_NONRETAIL — 군납용 혼입, 케토프로펜 트랙) |
| canonicalDup (자기 audit set) | 0 |
| drift (`복용|삼키|점안|바르는 방법`) | 0 |
| route 혼입 | 0 (트로키·스프레이·경구 제외 확인) |
| no-op 재실행 | 전 run masters 0 (계약 충족) |
| topical KO canonical LIVE 누계 | **1,843** |
| 커밋 | 케토·플루르비 배치들 → 디클로페낙 batch6 `d77b7e4be` (push 완료, HEAD==origin/main) |

## 2. 생산 방식

- 러너: `apps/api-server/src/scripts/drug-otc-topical-patch-store-leaflet-batch.ts`
  - `--form` = 제품명 substring 타겟팅, `--effkey` 효능 substring 게이트(HOLD_EFF_MISMATCH), HOLD_KO 가드(경구 표현·다중 hash·원문 결손)
  - write 계약: master당 KO 4T + EN 2T, easy(`mfds_easy_drug`)는 본문 미변경 status=deprecated, `--wo-id` audit 필수, 이중게이트(`--apply` + `TOPICAL_APPLY_CONFIRM=YES`)
- 분리 기준: 제형/함량/부착 횟수·시간/최대 사용 기간/연령/임부·수유부/광과민/밀봉 제한 등 — 다르면 EN config·run 분리
- EN 제형 표기: 플라스타→Plaster, 파프·카타플라스마→Cataplasm (Pap), 첩부제→Adhesive Patch
- 1 run = 1 uniform content(단일 KO md5). 동일 content hash는 EN config 공유(예: 디클로 A형 config를 4 hash·14 run 공유)

## 3. 러너 정규화 추가 (V7 중 수정)

- `'함께 복용 시'→'함께 사용 시'`, `병용(함께 복용, 사용)`/`병용(함께 복용(사용))` 괄호 주해 → `병용(함께 사용)` — 외용 맥락 확인 후에만 적용, 안전정보 약화 아님(사용⊇복용)
- 플루르비프로펜 트랙: '복용하기 전에' 경구 오기 정규화

## 4. 검증 (프로덕션 read-only, proxy 5463 + o4o_api)

- audit DISTINCT master_id (WO 필터, 당일) = ko_canonical = en_canonical = deprecated_easy = **513** ✅
- 자기 audit set canonical dup = 0 ✅
- drift 검사 0 ✅ · no-op 전 run masters 0 ✅

### 관찰 사항 (타 WO — 수정하지 않음, 보고만)

전역 canonical dup 검사에서 9건 발견: 크림/겔 수출용 제품(무라졸크림·파인스겔·고려아시클로버크림 등). 당일 14:05~14:15 `WO-...-DA-V4` audit으로 생성된 `o4o_drug_otc_topical` canonical과 **easy canonical 잔존 병존**(타 세션의 easy 미강등). 본 WO write와 무관(`in_today_audit=false`). 후속 보정 필요 시 별도 승인 대상.

## 5. 잔여 후보 / 재시작 지점

claim RELEASED (미착수): 록소프로펜 65 · 펠비낙 48 · 퓨시드산나트륨 18 · 인도메타신 17 · 이부프로펜 16 · 피록시캄 11 · 살리실산 4(특별게이트). 후속 라운드는 **록소프로펜|첩부제**부터 재시작.

기타 보류: 리도카인 성기 부위 제품(정책 보류, V6부터), 첩부제 외 비첩부 topical은 V6에서 안전풀 소진.

## 6. 산출물

- claim: `apps/api-server/src/scripts/data/otc-production-claim.da.json` — V7 12건 중 5 DONE / 7 RELEASED, verdict ROUND_DONE
- EN config: `apps/api-server/src/scripts/data/topical-patch/otc-patch-en-*.json` (디클로 11종 포함)
- run manifest: `otc-topical-patch-batch-*.run.json`
