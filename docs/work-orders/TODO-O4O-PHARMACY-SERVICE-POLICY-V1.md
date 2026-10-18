# 약국 서비스 설정·직원 허용 통합 TODO

> **상태**: COMPLETED
> **작성일**: 2026-10-18
> **범위**: 관리자 → My Home → 내 매장, 로컬 검증·commit·push

## 승인된 기준

- 전체 관리자가 대상을 선택하고 제공 기능을 선택한다. 대상은 기본 제공·유료회원·등록된 각 협력사업이다.
- 유료 자격은 기존 경영자 회원 원장의 유료/무료만 사용한다. 약국 규모·협력사업 미가입 조건·유료 등급을 만들지 않는다.
- 약국 기능은 기본 + 활성 협력사업 + 현재 경영자 유료 제공 기능의 합집합이다. 직원은 그 범위와 경영자 허용의 교집합을 이용한다.
- 직원 초대·수락·최종 승인 및 Role ∧ Relationship, 다른 매장 차단은 기존 계약을 유지한다. 무료 초대 직원도 허용 범위에서 이용한다.
- 조회 실패는 503·재시도로 구분한다. 지급 원천 하나가 끝나도 다른 자격이 남으면 유지한다.
- 이번에는 구현된 tablet·multilingual-content·store-staff-support에 적용한다. 실시간 다국어 상담의 입력·언어·AI·전문인 확인은 후속 설계이며 미구현 기능을 제공 중으로 노출하지 않는다.

## 코드·문서 대조 및 보완

- [x] 최신 main의 기존 협력사업 metadata 설정·owner 유료 원장·공통 판정 확인.
- [x] My Home 직원 관리·수락→최종 승인·계정/매장 변경 응답 폐기 흐름 확인.
- [x] 기존 settings 및 organization_members.metadata 재사용 가능 확인. schema/migration·유료 원장 변경 불필요.
- [x] 기본 미설정은 추가 제공 없음, 유료 미설정은 기존 두 기능을 보존한다. 명시적 빈 배열은 제공 해제이며 조회 오류와 구분한다.
- [x] 기존 승인 직원의 미설정은 종전 구현된 세 기능 허용을 보존한다. 신규 승인 시 당시 허용 목록을 저장하며, 재초대 시 과거 개별 설정을 초기화한다. 미래 기능을 자동 허용하지 않는다.
- [x] 소비자 공개 QR·독립 사본 읽기는 유지한다. 기기 토큰/공개 태블릿은 매장 자격을 사용하며 직원 로그인 실행에는 개별 허용을 적용한다. 공용 기기의 직원 식별은 후속 범위다.
- [x] 공통 모듈 소비처: operator-core-ui(Admin·Neture wrapper), web-neture My Home, web-store(공통/서비스 layout), API 태블릿·다국어 콘텐츠·직원 지원. 정확한 route·파일 경로와 raw-source spec도 검증한다.

## 실행 TODO

- [x] 관리자 `약국 서비스 설정` 메뉴·대상 선택·체크·저장·오류/재시도 구현. 협력사업 등록은 기존 메뉴 재사용.
- [x] 기본/유료 정책 저장 및 조회, 협력사업 제공 설정 재사용. 전체 관리자 guard·입력 검증·no-store 적용.
- [x] 공통 합산 판정 및 직원 허용 교집합 연결. 현재 경영자 관계·활성 약국·조회 오류 경계 유지.
- [x] My Home 승인 시 기능 선택, 승인 직원별 수정. 선택 매장·계정 변경 시 입력과 이전 요청 폐기.
- [x] 내 매장 메뉴·직접 URL·인증된 실행 API가 같은 공통 판정을 사용하도록 연결.
- [x] 정책 변경·유료/사업 중복/종료·직원 제한/해제·타 매장 차단·malformed/DB 오류 통합 검증.
- [x] Admin·My Home·내 매장 PC/모바일 fixture smoke 및 관련 단위/통합 테스트·타입/빌드 확인.
- [x] 현행 설계·My Home/접근 정본의 해당 계약 갱신, 결과 CHECK에 소비처 영향·미확인 운영 범위 기록.
- [x] 경로별 stage·scope 검사·commit·최신 main 이동 확인·작업 branch push. PR/merge/배포/운영 설정 변경은 통합 담당에게 인계.

정본: [약국 설계](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md), [My Home](../baseline/O4O-MY-HOME-CANONICAL-V1.md), [매장 접근](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md), [공유 모듈](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md).

검증 결과와 운영 미실행 범위는 [CHECK](../checks/CHECK-O4O-PHARMACY-SERVICE-POLICY-V1.md)를 따른다.
