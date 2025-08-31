E-commerce 시스템 Phase 1 - 고급 재고 관리 구현

== 기존 시스템과의 연동 고려사항 ==

Phase 1에서 구현된 VendorController 기반 확장:
- VendorInfo 엔티티와 Inventory 엔티티 연결
- 판매자별 재고 권한 및 알림 설정
- 기존 Express 스타일 Controller 구조 활용
- JWT 인증 및 역할 기반 권한 시스템 연동

== 기술 스택 ==

- Express + TypeScript (기존 구조 유지)
- PostgreSQL + TypeORM
- Schedule 모듈 (크론잡)
- EventEmitter2 (이벤트 시스템)
- Nodemailer (알림 이메일)

== Phase 1 구현 범위 ==

새로운 엔티티 (4개):
1. Inventory (재고 관리)
2. StockMovement (재고 이동 기록)
3. ReorderRule (재주문 규칙)
4. InventoryAlert (재고 알림)

API 엔드포인트 (12개):
1. GET /api/inventory - 재고 목록 조회
2. POST /api/inventory/adjust - 재고 조정
3. GET /api/inventory/alerts - 재고 알림 조회
4. POST /api/inventory/alerts/:id/acknowledge - 알림 확인
5. GET /api/inventory/:id/movements - 재고 이동 내역
6. GET /api/inventory/:id/forecast - 재고 예측
7. GET /api/inventory/reorder/settings - 재주문 설정
8. PUT /api/inventory/reorder/settings - 재주문 설정 업데이트
9. GET /api/inventory/reorder/rules - 재주문 규칙 목록
10. PUT /api/inventory/reorder/rules/:id - 재주문 규칙 업데이트
11. GET /api/inventory/dead-stock - 데드스톡 조회
12. GET /api/inventory/value - 총 재고 가치 조회

== 기존 시스템과의 통합 포인트 ==

1. VendorInfo 연계:
- inventory.vendor_id 외래 키 추가
- 판매자별 재고 접근 권한 구현
- 판매자 상태(active/suspended)와 재고 관리 연동

2. Product 연계:
- inventory.product_id 외래 키 추가
- 제품 정보와 재고 정보 동기화

3. 권한 시스템 연동:
- admin: 모든 재고 관리
- manager: 전체 조회 및 승인
- vendor: 자신의 제품 재고만 관리

== 핵심 비즈니스 로직 ==

1. 자동 재주문 시스템:
- 재고 부족 시 자동 알림
- 공급자 연동 재주문 (Phase 2 예정)
- 동적 재주문점 계산

2. 실시간 재고 추적:
- 주문 시 재고 예약/차감
- 재고 이동 기록 관리
- 상태별 알림 시스템

3. 예측 분석:
- 30일 판매 데이터 기반 예측
- 회전율 계산
- 데드스톡 식별

== 알림 시스템 ==

이메일 알림 대상:
- 재고 부족 (critical)
- 품절 (critical)
- 유효기한 임박 (warning)
- 과재고 (info)

== 크론 작업 ==

1. 재고 상태 확인 (매시간):
- 재주문점 도달 확인
- 품절/재고부족 상태 업데이트
- 자동 알림 발송

== Express Controller 스타일 ==

기존 vendorController.ts와 동일한 패턴:
- Express Request/Response 객체 사용
- 표준화된 응답 형식 ({ success: boolean, data: any })
- 기존 authMiddleware 및 roleMiddleware 활용

== Mock 데이터 처리 ==

Phase 1에서 실제 연동이 어려운 부분은 Mock 데이터로 처리:
- 공급자 재주문 (Phase 2에서 실제 구현)
- 복잡한 예측 알고리즘 (기본 로직으로 구현)

문서에 포함된 완전한 구현 코드를 참고하되, 
기존 Express 기반 구조와 통합되도록 구현해주세요.

VendorController와 동일한 품질과 일관성을 유지하면서,
재고 관리의 핵심 기능들을 구현해주세요.