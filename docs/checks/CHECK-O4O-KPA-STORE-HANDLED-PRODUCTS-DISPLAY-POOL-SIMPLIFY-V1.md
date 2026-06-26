# CHECK-O4O-KPA-STORE-HANDLED-PRODUCTS-DISPLAY-POOL-SIMPLIFY-V1

> WO: WO-O4O-KPA-STORE-HANDLED-PRODUCTS-DISPLAY-POOL-SIMPLIFY-V1
> 선행: IR-...-DISPLAY-CONTENT-MODEL-V1 / WO-...-UNIFIED-VIEW-V1 / -INTERNAL-TABS-V1
> 범위: KPA 프론트 1파일. API/DB/route/메뉴 무변경.

## 1. 선행 IR 요약

매장 취급제품 = 채널 상태판이 아니라 **진열·콘텐츠·온라인 노출용 제품 풀**. 공급처/구매처 미관리, 온라인 주문 이후 조달·배송=O4O 비대상, 가격=매장 표시 가격 1개. 채널 상태 컬럼은 축소/제거 권장.

## 2. 변경 전 화면 구조

컬럼: 제품 / 출처 / 표시 가격 / 상태 / **타블렛 / 온라인몰 / 상품 설명** / 최근 수정일 / 관리 (9컬럼). 하단 '매장 자체 제품=온라인몰 미지원' 고지.

## 3. 변경 후 화면 구조

컬럼: 제품 / **구분** / **매장 표시 가격** / 상태 / 최근 수정일 / 관리 (6컬럼). 하단 안내를 제품 풀 정의 + 온라인 주문 후 O4O 비대상 문구로 교체.

## 4. 제거 또는 축소한 컬럼

- **타블렛 / 온라인몰 / 상품 설명** 컬럼 제거(채널 상태판 인상 제거).
- 관련 badge 헬퍼(tabletBadge/onlineBadge/descBadge)·타입 import(TabletExposure/OnlineExposure/DescriptionStatus) 제거.
- '출처'→'구분', '표시 가격'→'매장 표시 가격' 라벨 정리.

## 5. 유지한 동선

- 출처 탭(전체/O4O 취급 제품/매장 자체 제품) + URL sync(?source=) 유지.
- 상단 관리 버튼(O4O 제품 신청→/commerce/products, 매장 자체 제품 등록→/commerce/local-products) 유지.
- 행 관리 버튼(managePath /my-products?highlight= · /commerce/local-products?highlight=) 유지.
- 검색·페이지네이션 유지.

## 6. API/DB/route 변경 확인

> 업데이트(커밋 `6665be2ed`, 동시 진행 후속분): 프론트 컬럼 제거(이 CHECK 본문)에 이어 **백엔드 API 다이어트까지 완료**됨. 본 절의 "API 무변경"은 그 시점 기준이며 현재는 아래와 같이 정리됨.

- `GET /api/v1/store/handled-products`: 채널 상태 enrich **조인 3종 제거**(store_tablet_displays / organization_product_channels / shared_product_descriptions) — 요청당 추가 DB 쿼리 3개 감소. 응답 필드 `tabletExposure`/`onlineSalesExposure`/`productDescriptionStatus` **제거**(타 소비처 0건 grep 확인). `handledProducts.ts` 타입도 동기 제거.
- 화면 하단 보조 안내에 "매장 자체 제품 온라인몰 미지원" 1문장 추가.
- DB/migration/route/메뉴 변경 없음. api-server·web tsc PASS, API+Web 배포 success.
- smoke(약국 경영자 renagang21): 6컬럼·온라인몰 미지원 안내·API 200 확인(테스트 매장 취급제품 0건이라 실 항목 키 확인은 불가, 백엔드 map 제거로 코드 보장).

## 7. 공급처/구매처 미표시 확인

- 화면에 공급처(supplier)/구매처/조달 경로 표시 없음(handled-products API가 애초에 supplier 미반환).

## 8. 온라인 주문 이후 O4O 비대상 정책 유지 확인

- 하단 안내에 "온라인 주문 이후의 조달·재고·배송·발송·응대는 매장 경영자가 자체적으로 처리합니다." 명시.
- 매장 경영활용 제품을 '온라인몰 배치 가능'으로 오해시키는 문구 없음(미지원 컬럼 제거 + 채널 설정은 별도 메뉴 안내).

## 9. typecheck 결과

| 패키지 | 결과 |
|---|---|
| `services/web-kpa-society` tsc | ✅ PASS |

## 10. browser smoke 결과

✅ PASS (2026-06-26, KPA `테스트 약국 매장`, 배포본 04218af3e web deploy success).

| 항목 | 결과 |
|---|---|
| 테이블 헤더 6컬럼: 제품 / 구분 / 매장 표시 가격 / 상태 / 최근 수정일 / 관리 | ✅ |
| 타블렛 컬럼 미노출 | ✅ |
| 온라인몰 컬럼 미노출 | ✅ |
| 상품 설명 컬럼 미노출 | ✅ |
| 출처 탭(전체/O4O 취급 제품/매장 자체 제품) 유지 | ✅ |
| 상단 버튼(O4O 제품 신청·매장 자체 제품 등록·새로고침) 유지 | ✅ |
| 하단 안내 = 제품 풀 정의 + "온라인 주문 이후 조달·재고·배송·발송·응대는 매장 경영자 자체 처리" | ✅ |
| 공급처/구매처 표시 없음 | ✅ |
| 콘솔 페이지 오류 없음(로그인 시점 401만) | ✅ |

> 컬럼 제거는 헤더 레벨 변경으로 확정(행 렌더는 선행 UNIFIED-VIEW-V1 smoke에서 검증). 테스트 매장 active 제품 0건.

## 11. 후속 후보

- `WO-...-TERM-CLARIFICATION-V1` (매장 자체 제품→매장 경영활용 제품, 내 매장 제품→취급 중인 O4O 제품)
- `WO-...-CONTENT-LINK-V1` (콘텐츠↔제품 연결 + 연결 콘텐츠 수)
- `WO-...-TABLET-DISPLAY-CONTENT-SELECTION-V1`
- `WO-...-O4O-B2C-DESCRIPTION-COPY-TO-STORE-CONTENT-V1`
- (가드) 온라인 판매 풀필먼트 비확장
