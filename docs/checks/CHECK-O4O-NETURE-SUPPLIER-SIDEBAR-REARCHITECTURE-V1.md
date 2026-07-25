# CHECK-O4O-NETURE-SUPPLIER-SIDEBAR-REARCHITECTURE-V1

## 1. 완료 범위

- 공급자 사이드바 정보구조를 운영 축 기준으로 재구성
- 최상위 메뉴 구조를 홈 / 상품 / 콘텐츠 / 유통 / 주문·정산 / 커뮤니티 / 설정으로 정리
- 주문·모집·펀딩·포럼 상세/작성 경로에 대한 활성 상태 처리 보강
- 기존 supplier route 및 /account/supplier/* 경로는 유지

## 2. 최종 최상위 메뉴

- 공급자 홈
- 상품
- 콘텐츠
- 유통
- 주문·정산
- 커뮤니티
- 설정

## 3. 활성 경로 처리

다음 경로에서 하위 메뉴가 활성 상태로 유지되도록 처리했다.

- 주문 상세: /supplier/orders/:id
- 판매자 모집 상세: /supplier/recruitments/:id
- 유통참여형 펀딩 상세·수정: /supplier/market-trial/*
- 공급자 포럼 작성·상세: /supplier/forum/*

## 4. 보존 범위

- 기존 supplier route 삭제: 0
- /account/supplier/* 변경: 0
- 기능 삭제: 0

## 5. 검증

- web-neture build: PASS
- desktop sidebar: 적용 완료 (레이아웃/활성 경로 처리 반영)
- mobile drawer: 미실행 (브라우저 smoke 미실행)

## 6. 변경 범위

- frontend-only
- backend 변경: 0
- DB 변경: 0
- migration: 0

## 7. 산출물

- docs/checks/CHECK-O4O-NETURE-SUPPLIER-SIDEBAR-REARCHITECTURE-V1.md
- commit hash: f6e67529c
- main push result: success (origin main)
