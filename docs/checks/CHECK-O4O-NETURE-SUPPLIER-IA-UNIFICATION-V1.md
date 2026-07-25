# CHECK-O4O-NETURE-SUPPLIER-IA-UNIFICATION-V1

## 1. 변경 파일

- services/web-neture/src/App.tsx
- services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx
- services/web-neture/src/pages/supplier/SupplierDashboardPage.tsx
- services/web-neture/src/pages/supplier/SupplierOrdersPage.tsx
- services/web-neture/src/pages/account/SupplierOrderDetailPage.tsx
- services/web-neture/src/pages/account/SupplierInventoryPage.tsx
- services/web-neture/src/pages/account/SupplierSettlementsPage.tsx

## 2. 추가한 canonical route

- /supplier/orders/:id
- /supplier/inventory
- /supplier/settlements

## 3. 재사용한 기존 페이지

- SupplierOrderDetailPage
- SupplierInventoryPage
- SupplierSettlementsPage

## 4. 재사용한 API

- supplierApi.getOrderById()
- supplierApi.updateOrderStatus()
- supplierApi.getShipment()
- supplierApi.createShipment()
- supplierApi.updateShipmentStatus()
- supplierApi.getInventory()
- supplierApi.updateInventory()
- supplierApi.getSettlements()
- supplierApi.getSettlementKpi()
- supplierApi.getSettlementDetail()

## 5. 내부 링크 변경

- /supplier/orders 목록에서 주문 상세로 이동하는 링크를 /supplier/orders/:id로 정렬
- 공급자 대시보드 Quick Link에 재고 관리 / 정산 내역 추가
- 공급자 사이드바에 재고 관리 / 정산 내역 진입점 추가

## 6. 메뉴 최소 변경

- 주문·배송 그룹에 재고 관리 추가
- 정산 그룹 추가 및 정산 내역 연결
- 기존 Partner Commissions는 유지

## 7. 대시보드 진입 변경

- /supplier/dashboard에서 주문 현황 / 재고 관리 / 정산 내역으로 직접 진입 가능하도록 Quick Link 보강

## 8. 기존 account 경로 보존 결과

- /account/supplier
- /account/supplier/products
- /account/supplier/orders
- /account/supplier/orders/:id
- /account/supplier/inventory
- /account/supplier/settlements

위 경로는 기존 route 정의를 유지하고, 새 canonical route와 함께 동작하도록 구성했다.

## 9. backend 변경 여부

- 없음

## 10. DB 변경 여부

- 없음

## 11. typecheck / build 결과

- web-neture build: PASS
- 검증 명령: pnpm --filter @o4o/web-neture build

## 12. 브라우저 smoke 결과

- 미실행
- 사유: 현재 작업 범위는 route 연결 및 메뉴 진입 연결에 한정되며, 브라우저 자동화 환경 구성 없이 빠른 smoke 검증은 생략함

## 13. 미완료 또는 후속 항목

- 공급자 사이드바 전체 IA 재구성은 후속 WO로 분리
- 브라우저 smoke는 추후 별도 검증 권장
