# 상품 요청의 명시 선택 매장 일치 검증

> 상태: ACTIVE
> 작성일: 2026-10-11
> 범위: 자체 상품·취급 상품의 선택 매장 불일치 수정·검증·push·현재 통합 정책에 따른 main/Delivery 확인

## 문제와 구현 경계

[실제 테스트 계정 검증](../checks/CHECK-O4O-STORE-REAL-WORKFLOW-VERIFICATION-V1.md)에서 약국 업무 후보 밖 조직을 명시 선택했는데 자체 상품 목록과 새 상품 상세가 기존 유지 매장의 데이터를 반환했다. 읽기 재현뿐 아니라 표준 사용자 API로 새 검증 상품의 생성·수정·조회도 확인했으며, 다른 선택 조직에서 같은 상품이 반환됐다.

공통 resolver의 후보 밖 힌트 무시 규칙과 권한 후보는 변경하지 않는다. 상품 서비스 어댑터 `resolveStoreProductAccess`가 기존 `resolveStoreAccess`로 role·원장·계약·소유 관계를 확인한 뒤, 명시 선택값과 확정 조직이 다르면 null로 차단한다. 이는 새 후보·권한을 추가하는 변경이 아니다. 선택값 없는 기존 단일 매장과 서비스 중립 경로는 기존 판정을 유지한다.

적용 소비처는 `store-local-product.routes.ts`의 목록·상세·등록·수정·비활성화와 `store-handled-products.routes.ts`의 목록·제거·상품 정보 QR·QR export다. 목록은 기존 미해석 조직의 HTTP 200 빈 목록 계약, 그 외는 기존 403 계약을 그대로 재사용한다. QR은 제품정보 제공 기능이며 소비자 commerce·B2B 주문·결제 계약을 변경하지 않는다. playlist·event offer·seller의 공통 helper 호출은 변경하지 않는다.

근거: `O4O-STORE-ACCESS-AND-MEMBERSHIP-V1`, `STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1`, `O4O-STORE-COMMERCE-BOUNDARY-V1`, `O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`. Frozen Core, schema/migration, 역할, 의존성/lockfile, 배포 인프라 변경은 없다.

## TODO

- [x] 운영 재현과 공통 조직 해석·소비처 조사
- [x] 상품 어댑터에서 명시 선택 조직 일치 확인
- [x] 자체 상품·취급 상품 HTTP 회귀 시나리오 추가
- [x] 선택 일치/불일치·다중 승인 매장·미선택·쓰기 차단 검증
- [x] 관련 기존 테스트·API build·lint·민감정보 검사
- [ ] commit·push·PR CI·자동 리뷰 확인
- [ ] main 통합·post-merge CI·Delivery 확인
- [ ] 배포 후 실제 계정 읽기 재현으로 상품 선택 불일치 해결 확인

원래 검증 사본의 완전 정리와 실제 기기 검증은 별도 TODO다. 이번 수정의 배포 후 확인은 읽기 API로 수행하며 운영 DB 쓰기·정리 작업을 추가하지 않는다.

## 로컬 검증

기존 상품·조직 회귀와 신규 HTTP 선택 경계: 4 suites / 58 tests PASS. 서비스 키·중립 경로 정적 계약: 1 suite / 10 tests PASS. 공통 패키지 빌드·API 번들 빌드 PASS. 변경 TypeScript focused ESLint·diff check·docs 민감정보 검사 PASS. 이 로컬 결과를 배포 후 운영 해결 확인으로 간주하지 않는다.
