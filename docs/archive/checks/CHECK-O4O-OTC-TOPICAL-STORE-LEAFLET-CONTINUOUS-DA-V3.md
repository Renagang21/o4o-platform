# CHECK-O4O-OTC-TOPICAL-STORE-LEAFLET-CONTINUOUS-DA-V3 — 외용제 매장용 설명서 연속 생산 (에이전트 다)

WO: `WO-O4O-OTC-TOPICAL-STORE-LEAFLET-CONTINUOUS-PRODUCTION-DA-V3` · 파이프라인: 검증본 `a25796959` 재사용(재설계 0).

## 0. 결론

> **검증된 composer/builder/write 계약(a25796959)으로 단일성분 크림 8 fp 그룹 87 master KO+EN 추가 LIVE.** 우선순위 순: 테르비나핀 잔여 3 + 나프티핀 2 + 아시클로버 2 + 우레아 3. 파일럿(19) 포함 **topical 누계 106 master (9 fp) LIVE**. canonicalDup 0 · route 혼입 0 · drift 0.

## 1. 생산 (priority 순, 그룹당 dry-run PASS→apply→postVerify)

| 약물 | fp | target | KO/EN write |
|---|---|---:|---|
| 테르비나핀 크림 | 8585f535 · 10093afc · 56582fa2 | 14·12·10 | 각 4T/2T |
| 나프티핀 크림 | 0d3a080a · 57a849ce | 8·7 | 각 4T/2T |
| 아시클로버 크림 | a2666004 · 0859028005 | 8·6 | 각 4T/2T |
| 우레아 크림 | b8d6d210 · 2c481ebc · b47ed2d9 | 9·7·6 | 각 4T/2T |

- 각 그룹: target route=topical 단일 · koDistinctMd5 1(안전지문 동일) · postVerify koCanonical1=T·enCanonical1=T·deprecatedEasy=T·dup 0.
- **EN 재사용 원칙**: 동일 약물 상위 fp는 효능·용법·주의·이상반응 **의료사실 동일**(fp 차이=제조사 표기 변형=cosmetic) → 약물별 EN 1개 저작·재사용(다른 제품 안전정보 혼합 아님). 약물별 EN 파일: naftifine/aciclovir/urea/terbinafine.
- **질환명·효능 명확 표시**: 족부백선·어루러기·피부칸디다증(항진균), 단순포진·구순포진(아시클로버), 지장각피증·어린선·노인성 건피증(우레아) 등 원문 그대로. 원문에 없는 부위·횟수·기간 추가 0 · 강도완화 0 · 마케팅 0 · 약사 상담 footer 유지.

## 2. 독립검증 (fresh 연결, source_type=o4o_drug_otc_topical)

| 항목 | 값 |
|---|---|
| topical KO canonical | 106 |
| topical EN canonical | 106 |
| canonicalDup | 0 |
| 비-topical route 혼입 master | 0 |

- writePlan==writeActual(그룹별 4T/2T) · target 밖 write 0 · 기존 LIVE drift 0(easy만 deprecated, target 스코프) · 재실행 no-op(생산 그룹 재실행 시 target 0).

## 3. DB 연결 안정성

- 공용 proxy 5433/5436/5444 ECONNRESET flapping(타 세션). 그룹 apply는 단일 TX(연결 손실=rollback, 부분커밋 0). healthy proxy(5444→5455) 자동 탐지 후 진행. 공용 proxy 미종료.

## 4. 보고 요약

```text
완료 그룹 8(V3) · 완료 master 87(V3) · 누계 106(파일럿 포함)
제형별: 크림 87 (테르비나핀 36·우레아 22·나프티핀 15·아시클로버 14)
KO write 348(87×4) · EN write 174(87×2) · 총 522(V3)
canonicalDup 0 · target 밖 drift 0 · route 혼입 0 · no-op OK
DB: proxy flapping(5444→5455), 부분커밋 0
다음 재시작 지점: 각 약물 잔여 소형 fp(원문 동일성 확인 후 동일 EN 재사용) + 신규 단일성분(우레아 연고·기타 크림/겔) + 겔/로션/외용액/스프레이 제형
```

## 5. 산출물

- 생산 스크립트: `drug-otc-topical-store-leaflet-produce.ts`(a25796959, 재사용) · EN: `data/topical/otc-topical-en-{terbinafine,naftifine,aciclovir,urea}-cream.json` · run/manifest: `data/topical/otc-topical-*-{run,manifest}.json`.
- 공용 runner registry·타 claim·`pnpm-lock.yaml` 미접촉.
