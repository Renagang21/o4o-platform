# CHECK-O4O-OTC-NONORAL-TOPICAL-STORE-LEAFLET-DA-V2 — 외용제 매장용 설명서 생산 (에이전트 다)

WO: `WO-O4O-OTC-NONORAL-TOPICAL-STORE-LEAFLET-PRODUCTION-DA-V2` · 역할: 드럭 OTC 에이전트 다.
선행: 조사 CHECK `10ca66911` (`CHECK-O4O-OTC-NONORAL-TOPICAL-INVESTIGATION-DA-V1.md`).

## 0. 결론 · 정정

> **정정**: V1의 "안전 생산 계약 확정 불가·READY 0"은 과방어였다. 이 설명서는 **약사 매장용 소비자 보조 설명서**로, 공식 원문(효능·용법·주의·이상반응)을 표현층(제목/요약/카드/문장분리/도포표현)으로 재구성하는 것이 허용된다(의료사실 추가 0). authored draft 부재는 HOLD 사유가 아니다.
>
> **결과**: 외용제 매장용 설명서 composer + KO/EN 생산 파이프라인 구축·검증 완료. **파일럿 1그룹 LIVE**: 테르비나핀염산염 1% 크림 fp `665c4d2fe63aeb02` **19 master KO+EN canonical**. postVerify PASS · canonicalDup 0 · drift 0 · 재실행 target 0(멱등).

## 1. 매장용 외용제 계약 (composer)

- 기존 STORE 빌더(`buildDrugOtcConsumerHtml`/`buildDrugOtcEnConsumerHtml`) 재사용. **마케팅 필드(작용/선택포인트) 미사용**, `usageLabel`=경로신호(경구 '복용' 표현 0). 하단 sd-foot = 매장 약사 상담 안내.
- 원문 sections → efficacy(sd-intro)·usage(sd-intake, 문장분리·도포표현)·caution(sd-warn 문장별 항목)·summaryTable(분류/성분/제형만). **질환명·증상명·허가 효능 명확 표시**(족부백선·어루러기·피부칸디다증 등 원문 그대로).
- 금기 유지: 원문에 없는 부위·횟수·기간 추가 0 · 강도완화 0 · 타제품 안전정보 혼합 0 · 성분당 master 개별 compose(md5 균일 = 안전지문 동일 확인, 비균일 시 자동 ABORT→subgroup 분리 신호).

## 2. route 재분류 (이름→원문·제형·경로)

- 미생산 피부외용 2,462 master(크림 1,052·겔 715·연고 305·스프레이 170·외용액 117·로션 103) 기반. `routeSig`에 나잘/나살(비강) 추가 배제. fingerprint 재현 시 target route=topical 단일 강제(비단일 시 ABORT).
- 파일럿 coarse 135 → target fp 19 (route topical 단일 · koMd5 균일).

## 3. 파일럿 생산 · 검증 (게이트 전통과 자동 apply)

| 게이트 | 값 |
|---|---|
| target (fp 665c4d2f 재현) | 19 · route topical 단일 · koDistinctMd5 1 |
| writePlan = writeActual | KO 4T=76 · EN 2T=38 · 총 6T=114 (koIns/enIns/demote/flipKo/flipEn/audit 각 19) |
| dry-run postVerify | koCanonical1 19 · enCanonical1 19 · deprecatedEasy 19 · dup 0 · koAuthored 19 → PASS → (apply COMMIT) |
| 독립검증(fresh) | ko 19 · en 19 · easyDep 19 · canonicalDup 0 · koMd5 균일=manifest · 질환명有 · 복용표현無 · 외용전용有 · 약사footer有 |
| 재실행 no-op | target 0 (전량 생산 → NOT EXISTS 제외) |

- source_type=`o4o_drug_otc_topical`(독립 트랙, varchar) · source_ref_id=원문 easy SPD id(provenance) · audit metadata{previousSource=mfds_easy_drug, newSource=o4o_drug_otc_topical, route=topical, composedFromSource=true}.
- **target 밖 write 0 · 기존 LIVE drift 0**(easy만 deprecated, target 스코프).

## 4. 상태별 (V1 대비 정정)

| 상태 | 수 | 비고 |
|---|---:|---|
| COMPLETED (LIVE) | 19 master (1 fp group) | 테르비나핀 1% 크림 |
| READY_TOPICAL_SOURCE_GROUNDED (검증된 계약 적용 가능) | ~2,443 master 후보 | 단일성분 크림/연고/겔/로션/외용액/스프레이 fp 그룹(그룹당 EN 저작 필요) |
| HOLD_PATCH | 1,517 | 첩부·플라스타(별도) |
| HOLD_MUCOSAL/EXCLUDED | 3,185 | 점막·안이비·좌제질·route불명 |

## 5. 보고 요약

```text
실제 작업: composer/파이프라인 구축·검증 + 파일럿 1그룹 LIVE
route 재분류: 피부외용 2,462(크림1052·겔715·연고305·스프레이170·외용액117·로션103), 비강/점막/안이비 배제
READY: 계약 검증 완료(fp별 생산 가능) · HOLD: patch 1517·mucosal/excl 3185
완료 그룹 1 · 완료 master 19 (테르비나핀 1% 크림)
제형별 완료: 크림 19
KO write 76 · EN write 38 · 총 114 (writePlan==writeActual)
canonicalDup 0 · target 밖 drift 0 · route 혼입 0 · 재실행 no-op(target 0)
DB 연결: proxy 5433/5436 ECONNRESET(타 세션 불안정) → 5444 사용(공용 미종료)
다음 재시작 지점: 테르비나핀 잔여 fp 그룹(8585f53d/10093afc/56582fa2 등) + 나프티핀·아시클로버·우레아 등 단일성분 크림/연고/겔 — fp별 EN 저작 후 동일 스크립트로 연속 생산
```

## 6. 산출물

- 생산 스크립트/composer: `apps/api-server/src/scripts/drug-otc-topical-store-leaflet-produce.ts`
- 파일럿 EN 번역: `.../data/topical/otc-topical-en-terbinafine-cream-1pct.json`
- run/manifest: `.../data/topical/otc-topical-terbinafine-cream-1pct.{run,manifest}.json`
- 본 문서. 공용 runner registry·타 claim·`pnpm-lock.yaml` 미접촉.
