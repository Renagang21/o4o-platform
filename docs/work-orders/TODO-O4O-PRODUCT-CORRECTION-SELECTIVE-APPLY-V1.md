# 상품 보정 근거·변경안·선택 반영 TODO V1

> **상태**: COMPLETED · **작성일**: 2026-10-25
> **범위**: 수동 보정 P2. AI 기능 변경·호출, 예약, migration, 운영 상품 보정 제외.
> **근거**: 사용자 승인 우선순위 1~3 및 [수동 운영 안내](../guides/products/O4O-ADMIN-PRODUCT-CORRECTION-WORKSPACE-V1.md).

## 코드 대조와 구현 계약

- 기존 `workspace.service.ts`는 원본 미적용 계약을 유지한다. 독립 변경안 API와 settings namespace를 추가한다.
- catalog 수정 API는 원본 충돌 검사가 없고 설명서 POST는 즉시 canonical을 변경하므로 초안 저장에 호출하지 않는다.
- 초기 허용 필드는 name/brandName/specification/originCountry/tags/descriptionContent만이다. 제조사·바코드·규제·허가·상태·분류·이미지는 변경하지 않는다.
- 전문인/AI 지원/소비자 QR 목적과 B2B/B2C/STORE/SUPPLIER_STORE 유형·언어를 구분한다. QR 공식 DB 채택 보류와 자산 경계를 유지한다.
- 원문 전체를 서버에서 읽어 fingerprint로 비교한다. 초안 저장과 반영 시 최신 원본을 검사하며 보정 당시 잘린 설명서를 변경 기준으로 사용하지 않는다.
- 근거는 상품 사실/전문 참고자료, 출처, 확인일, 관련 항목, 확인 상태로 구조화한다. 기본정보 변경에는 확인된 상품 사실 근거가 필요하다.
- 작성→명시적 승인/반려→선택 반영을 분리한다. 같은 관리자도 처리 가능하며 이중 인적 승인 정책을 새로 만들지 않는다.
- 반영은 상품별 transaction으로 원본·설명서·이력을 함께 저장한다. 하나라도 실패하면 전부 rollback한다. 반영 완료 요청의 같은 선택 재전송은 멱등 처리한다.
- canonical 변경은 기존 설명을 candidate로 보존하고 동일 master/type/language의 새 설명만 canonical로 지정한다. 다른 설명 유형·언어와 매장 제작물·QR을 수정하지 않는다.
- 변경안 revision, 승인자·시각, 적용자·시각, 전후 값·기준·근거를 보존한다. 충돌 때 자동 덮어쓰기·자동 재기준화하지 않는다.
- 공통 Product DB 조회·쓰기 모두 platform:super_admin이며 AI 정비 코드는 그대로 유지한다.

## 실행 TODO

- [x] T1. 구조화 근거·허용 변경 필드·변경안/승인/반영 계약
- [x] T2. 전체 원본 조회·충돌 검사와 초안 저장·버전 이력
- [x] T3. 명시적 승인·반려 및 선택 반영 transaction·멱등 처리
- [x] T4. 기존 작업 화면에 근거·변경안·전후 비교·선택 반영 연결
- [x] T5. 변경안별 승인·반영·이력 현황과 재개
- [x] T6. 권한·보호 필드·근거 검증·충돌·rollback·동시 요청·UI 검증
- [x] T7. 운영 안내·검증 기록 갱신 및 commit/push

## 검증 경계

격리 로컬 PostgreSQL 합성 상품만 변경한다. 실제 운영 계정·상품 변경을 smoke로 수행하지 않는다. 예약·AI 호출 및 직접 운영 보정은 포함하지 않는다. 기존 보정 검토 완료는 새 반영 완료로 취급하지 않는다.

## 구현·검증 결과

개발 브랜치 구현과 검증을 완료했다. [검증 기록](../checks/CHECK-O4O-PRODUCT-CORRECTION-SELECTIVE-APPLY-V1.md)과 운영 안내 P2 절을 따른다. 기존 P1 배포와 구분하며, 이번 main 병합·운영 배포 및 실제 상품 보정은 수행하지 않는다.
