# CHECK-O4O-KPA-STORE-HUB-HOME-LATEST-RESOURCE-FEED-V1

> WO: `WO-O4O-KPA-STORE-HUB-HOME-LATEST-RESOURCE-FEED-V1`
> 검증일: 2026-06-29 · 배포 커밋: `b2deb2012`
> 결론: **PASS** — KPA `/store-hub` 홈이 정적 안내 카드에서 최신 자원 피드(상품/콘텐츠/디지털)로 전환됨. GP/KCos 기본 5-block 무회귀(라이브 확인).

---

## 1. 변경 요약
- **StoreHubTemplate**(공용): `renderMainSections` + `showHeroCta` optional 슬롯 additive. 미전달 시 기존 5-block 그대로 → GP/KCos 무영향.
- **StoreHubLatestFeed.tsx**(신규, KPA-local): 3 섹션 피드(새 상품 4 / 새 콘텐츠 4 / 새 디지털 자료 6), 섹션별 독립 로딩·빈·부분오류(Promise.allSettled), 읽기 전용(mutation 0).
- **StoreHubPage**(KPA): 자원 4카드 / AI placeholder / 내 약국 CTA 블록 / 운영 흐름 3단계 / 상단 큰 CTA 제거 + 피드 주입 + `showHeroCta=false`.
- **catalog API**: 응답에 `imageUrl` additive(LATERAL subquery, 없으면 null) + `CatalogProduct.imageUrl`. 피드는 imageUrl 없어도 placeholder 동작(디커플링).

## 2. 정적 검증 (typecheck) — 모두 PASS
| 대상 | 명령 | 결과 |
|---|---|---|
| web-kpa-society | `tsc --noEmit` | EXIT 0 |
| shared-space-ui | `tsc --noEmit` | EXIT 0 |
| web-k-cosmetics | `tsc --noEmit` | EXIT 0 |
| web-glycopharm | `tsc -b --noEmit` | EXIT 0 |

## 3. 배포
| 워크플로 | 결과 |
|---|---|
| Deploy Web Services (Cloud Run) | success — detect-changes 전 서비스(neture/glycopharm/k-cosmetics/kpa-society) 배포(shared-space-ui 변경 감지). deploy-kpa-society success. |
| Deploy API Server (Cloud Run) | success |

## 4. API 검증
`GET /pharmacy/products/catalog?limit=4&offset=0` (약국 인증) → **200**.
- 기존 필드 보존, `imageUrl` 키 additive 반영(테스트 약국 catalog 0건이라 row 기준 값 확인은 데이터 0 — UNVERIFIED-with-data, SQL은 additive·배포됨).
- 네트워크 4xx/5xx 0건.

## 5. 운영 브라우저 smoke (kpa-society-web, 약국 계정)
`/store-hub` 라이브 — **PASS** (스크린샷 desktop/mobile 확보):
- ✅ 3 섹션 렌더: `새로 공급 가능한 상품` / `새로운 콘텐츠` / `새로운 디지털 자료`
- ✅ 상품 = 빈 상태("현재 새로 공급 가능한 상품이 없습니다", 약국 catalog 0건) + `상품 전체 보기 →`
- ✅ 콘텐츠 = CMS published 1건 "대한약사회에 오신 것을…" + **운영자 자료** 출처 배지 + 날짜
- ✅ 디지털 = 사이니지 4건, 유형 배지 + placeholder 썸네일 + 날짜
- ✅ 제거 확인: AI 맞춤 추천/준비 중 블록, 자원 4카드, 운영 흐름 3단계, 상단 큰 "내 약국 관리" CTA 모두 본문에서 제거(상단 hero에 큰 CTA 없음)
- ✅ console error 0 / pageerror 0 / network 4xx-5xx 0
- ✅ 모바일(390px) 가로 스크롤 없음(scrollW==clientW==390)
- ✅ mutation 없음(미리보기만), 각 섹션 `전체 보기`/항목 클릭 = 기존 HUB 하위 목록 이동

> 참고: "운영 흐름" 문자열은 좌측 사이드바 `홈` 메뉴 부제("자원 탐색 허브 · 운영 흐름 안내")에 존재 — 제거 대상 Flow 블록(본문)과 무관(레이아웃 chrome).

## 6. 회귀 smoke (공용 템플릿 무영향)
- **GlycoPharm `/store-hub`** 라이브 — **PASS**: 기본 5-block 그대로(hero+큰 CTA / 자원 4카드 / AI 준비중 / 내 약국 CTA / 운영 흐름 3단계). **KPA 피드 미노출**(`새로 공급 가능한 상품`/`새로운 디지털 자료` 부재). console error 0. → additive 슬롯이 KPA opt-in 으로만 동작함을 라이브 확인.
- **K-Cosmetics**: 동일 default 코드 경로(renderMainSections 미설정) + typecheck PASS 로 무회귀 판정(라이브 미실행).

## 7. 미검증/정직 표기
- catalog `imageUrl` 의 실제 이미지 매핑은 테스트 약국 catalog 0건이라 데이터로 확인 못함(SQL additive·배포 완료, 디지털 섹션 thumbnailUrl placeholder 정상 동작으로 이미지 렌더 경로는 간접 확인).
- KCos `/store-hub` 라이브 미실행(typecheck + GP 라이브 동형으로 대체).
- `/store-hub/*` 하위 라우트는 본 WO 미변경(사이드바 링크 정상 노출 확인).

---
**작성:** 2026-06-29 · 배포 `b2deb2012` · KPA 피드 PASS / GP 기본 5-block 무회귀 PASS.
