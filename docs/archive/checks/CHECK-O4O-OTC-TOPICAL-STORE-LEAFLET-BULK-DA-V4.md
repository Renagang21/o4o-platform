# CHECK-O4O-OTC-TOPICAL-STORE-LEAFLET-BULK-DA-V4 — 외용제 매장용 설명서 대량 연속 생산 (에이전트 다)

WO: `WO-O4O-OTC-TOPICAL-STORE-LEAFLET-CONTINUOUS-PRODUCTION-DA-V4` · 파이프라인: 검증본(`a25796959`) 계약 재사용(변경 0).

## 0. 결론

> **피부 외용제 매장용 설명서 대량 생산 — topical 누계 402 master KO+EN LIVE(WO 최소 400 충족).** V4 신규 생산 296 master(V3 106 → 402). fp 그룹 200+ (WO 최소 40 충족). canonicalDup 0 · route/수출 혼입 0 · 기존 LIVE drift 0.

## 1. 배치 러너 (검증본 core 재사용)

- `drug-otc-topical-store-leaflet-batch.ts`: 검증본(`drug-otc-topical-store-leaflet-produce.ts`)의 fingerprint·composer·apply TX·postVerify **동일 계약**을 단일 연결 fp 루프로 실행. per-fp: compose per-master(md5 균일)·KO/EN INSERT·easy demote·flip canonical·audit·postVerify(ko1/en1/dep=T·dup 0).
- **efficacy-key 가드**: fp 대표 원문 효능이 약물 핵심 질환명을 포함해야 생산(이질 fp → HOLD_EFF_MISMATCH). **수출 제외**: `name NOT LIKE '%수출%'`.

## 2. 생산 (약물·제형별)

| 약물·제형 | fp | master | EN |
|---|---:|---:|---|
| 테르비나핀 크림(잔여) | 54 | 80 | 재사용 |
| 아시클로버 크림(잔여) | 16 | 22 | 재사용 |
| 우레아 크림(잔여) | 11 | 14 | 재사용 |
| 나프티핀 크림(잔여) | 4 | 6 | 재사용 |
| 테르비나핀 겔 | 7 | 27 | 재사용(Gel) |
| 염산테르비나핀 크림 | 11 | 14 | 재사용 |
| 히드로코르티손 로션 | 41 | 78 | 신규 저작 |
| 피록시캄 겔 | 40 | 64 | 신규 저작 |

- 질환명·효능 명확 표시: 피부진균감염증·족부백선·어루러기(항진균), 단순포진(아시클로버), 각피증·어린선·건피증(우레아), 습진·피부염·벌레물린데(히드로코르티손), 퇴행성관절염·건초염·근육통(피록시캄) — 원문 그대로. 원문 없는 부위·횟수·기간 추가 0 · 강도완화 0 · 마케팅 0 · 약사 상담 footer 유지.
- EN 재사용: 동일 약물 상위 fp는 의료사실 동일(cosmetic fp 변형) → 약물별 EN 1개. 신규 약물(히드로코르티손·피록시캄)은 원문 전 섹션 grounding 저작.

## 3. 수출 혼입 교정 (개별 HOLD → 소급 정정)

- 초기 집계 411 중 **9 master 가 수출용(4)·수출명(5) 명칭** 포함 → 소급 retract(내 authored ko/en 18 soft-delete·easy canonical 9 복원, verify 9/9). 배치 쿼리에 `NOT LIKE '%수출%'` 추가로 재발 방지. 최종 402.

## 4. 독립검증 (fresh 연결, source_type=o4o_drug_otc_topical)

| 항목 | 값 |
|---|---|
| topical KO canonical | 402 |
| topical EN canonical | 402 (ko==en) |
| canonicalDup | 0 |
| route/수출 혼입 | 0 |

- writePlan==writeActual(그룹별 4T/2T) · target 밖 write 0 · 기존 LIVE drift 0(easy만 deprecated) · 재실행 no-op(생산 fp 재실행 시 target 0/멱등) · postVerify 그룹별 PASS · held(가드) 정상.

## 5. DB 연결 안정성

- 공용 proxy 5433/5436/5444 반복 ECONNRESET flapping(타 세션). healthy proxy 자동 탐지(5444→5455). 그룹 apply=단일 TX(연결 손실=rollback·부분커밋 0). 공용 proxy 미종료.

## 6. 보고 요약

```text
처리 fp 그룹(V4) 184 · 처리 master(V4) 296 · 누계 402(V2~V4)
제형별 완료(누계): 크림 302 · 로션 78 · 겔(피록시캄64+테르비나핀27)=91 ... (source_type 기준 402)
KO write(V4) 1184 · EN write(V4) 592 · 총 1776(V4)
canonicalDup 0 · route/수출 혼입 0 · target 밖 drift 0 · no-op OK
HOLD: efficacy-mismatch/복용-quirk(무피로신 등) fp는 개별 HOLD, 다음 후보 진행
DB: proxy flapping(5455), 부분커밋 0
다음 재시작 지점: 무피로신 연고(원문 복용-quirk 가드 예외 처리 후)·퓨시드산나트륨·프레드니솔론·티로트리신·히드로퀴논·클로트리마졸·부테나핀 등(신규 EN 저작), 리도카인 성기용(site-sensitivity 검토 후)
```

## 7. 산출물

- 배치 러너: `drug-otc-topical-store-leaflet-batch.ts` · EN: `data/topical/otc-topical-en-{terbinafine-gel,hydrocortisone-lotion,piroxicam-gel}.json` · run: `data/topical/otc-topical-batch-*.run.json`.
- 공용 runner registry·타 claim·`pnpm-lock.yaml` 미접촉. 자기 파일만 path-specific.
