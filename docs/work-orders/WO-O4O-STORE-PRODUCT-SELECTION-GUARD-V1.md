# 상품 요청의 명시 선택 매장 일치 검증

> 상태: COMPLETED
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
- [x] commit·push·PR CI·자동 리뷰 확인
- [x] main 통합·post-merge CI·Delivery 확인
- [x] 배포 후 실제 계정 읽기 재현으로 상품 선택 불일치 해결 확인

원래 검증 사본의 완전 정리와 실제 기기 검증은 별도 TODO다. 이번 수정의 배포 후 확인은 읽기 API로 수행하며 운영 DB 쓰기·정리 작업을 추가하지 않는다.

## 로컬 검증

기존 상품·조직 회귀와 신규 HTTP 선택 경계: 4 suites / 58 tests PASS. 서비스 키·중립 경로 정적 계약: 1 suite / 10 tests PASS. 공통 패키지 빌드·API 번들 빌드 PASS. 변경 TypeScript focused ESLint·diff check·docs 민감정보 검사 PASS. 이 로컬 결과를 배포 후 운영 해결 확인으로 간주하지 않는다.

최초 원격 SonarCloud는 새 코드 중복률 4.1%(기준 3%)로 FAIL했다. 취급 상품 제거·QR·export의 반복 인증·조직 판정을 내부 함수로 모았으며 미인증 사용자 메시지와 목록의 빈 응답을 유지했다. 기존 68 tests에 인증 응답 계약 4 tests를 더해 최종 5 suites / 72 tests PASS. API build·focused ESLint 다시 PASS. 로컬 문자열 무시 중복 검사에서 변경 상품 파일과 겹치는 clone은 0건이며 이 결과를 SonarCloud PASS로 대체하지 않는다. 최신 main의 문서·운영 진단 변경은 정상 merge로 반영했다.

## 통합 확인

[PR #442](https://github.com/Renagang21/o4o-platform/pull/442)는 2026-10-11 UTC main의 `6b79aabcd551c26556f67aadc6c6f69cc97fa1dd`로 병합했다. 최종 PR HEAD `5cb9e7dc82a509385954dfa04bec6fa4257a587c`의 필수 CI Gate·API 전체 테스트·품질 검사([CI 38101516841](https://github.com/Renagang21/o4o-platform/actions/runs/38101516841))와 CodeQL 38101516725는 PASS다.

자동 Codex 리뷰는 최초 구현 `875d951`에서 완료되어 지적·미해결 스레드가 없었다. 이후 인증 코드 중복 정리는 로컬 응답 계약 테스트와 변경 검토로 확인했으며 최신 HEAD 자동 리뷰가 다시 실행됐다고 주장하지 않는다. SonarCloud는 직전 상품 코드와 최종 PR HEAD `5cb9e7dc82a509385954dfa04bec6fa4257a587c`에서 모두 PASS(새 이슈 0·hotspot 0·중복률 2.7%)다. 최종 HEAD 결과는 병합 후 완료 확인했다. 새 코드 coverage 표시는 0.0%이며 로컬 72 tests를 원격 coverage 수치로 대체하지 않는다.

병합 SHA의 [post-merge CI 38102130550](https://github.com/Renagang21/o4o-platform/actions/runs/38102130550)와 CodeQL 38102130640는 PASS다. 다른 문서 PR #446이 뒤이어 main에 반영되어 `6b79aabcd`의 Delivery 38102596828은 SUPERSEDED로 종료됐다. 상품 코드가 포함된 최신 main `f66114199a6b28fad457efc2e95d7f00a3972dfa`의 CI 38102515273·CodeQL 38102515271 PASS 이후 [Delivery 38102704989](https://github.com/Renagang21/o4o-platform/actions/runs/38102704989)가 성공했다. commit status `production`은 **DEPLOYED · deploy: api**다. 프런트는 변경·배포하지 않았다.

## 배포 후 실제 계정 읽기 확인

2026-10-11 UTC 로컬 계정 안내가 지정한 동일 테스트 계정으로 새로 로그인하고 유지 매장 A와 기존 비교 조직 B를 읽었다. 조직·계정 관계를 변경하거나 자료를 새로 만들지 않았다. `health/ready` HTTP 200과 아래 6개 시나리오 PASS를 확인했다.

| 읽기 시나리오 | 결과 |
|---|---|
| A 자체 상품 목록 | 200, 첫 페이지 8개 |
| B 자체 상품 목록 | 200, 빈 목록 |
| A 기존 상품 상세 | 200 |
| B 같은 상품 상세 | 403 |
| A 취급 상품 목록 | 200, 첫 페이지 20개 |
| B 취급 상품 목록 | 200, 빈 목록 |

자체 상품은 `/api/v1/kpa/store/local-products`, 취급 상품은 `/api/v1/store/handled-products` mount를 검증했다. 첫 페이지 건수를 전체 상품 건수로 간주하지 않는다. 당시 B에서 A의 상품을 반환하던 읽기 불일치는 해결됐다. 운영 쓰기 차단은 새로 실행하지 않았으며 로컬 HTTP 회귀 결과와 구분한다. 두 정상 승인 매장 간 업무 전환·원본 변경 후 사본 유지·검증 사본 완전 정리·실제 기기 검증은 원래 CHECK의 별도 TODO로 남는다.
