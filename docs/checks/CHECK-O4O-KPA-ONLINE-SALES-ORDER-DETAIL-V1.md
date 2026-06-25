# CHECK-O4O-KPA-ONLINE-SALES-ORDER-DETAIL-V1

> WO-O4O-KPA-ONLINE-SALES-ORDER-DETAIL-V1 실행 결과
> 실행일: 2026-06-25 · 대상: 프로덕션 `https://kpa-society.co.kr`
> 선행: WO-O4O-KPA-ONLINE-SALES-ORDER-MANAGEMENT-AND-BUYER-ORDER-RELABEL-V1
> 구현 커밋: `328c9bfb3` (frontend, KPA) — Web Cloud Run 배포

## 1. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/OnlineSalesOrderDetailPage.tsx` | **신규** — 판매 주문 상세(읽기 전용) |
| `services/web-kpa-society/src/App.tsx` | route `/store/online-sales/orders/:orderId` 추가(lazy) |
| `services/web-kpa-society/src/pages/pharmacy/OnlineSalesOrdersPage.tsx` | 목록 주문번호 링크 + '상세 보기' 컬럼 → 상세 진입 |

- backend/DB/migration **무변경**. checkout 생성/결제 로직 무변경. 상태변경/취소/환불 미포함. GP/KCos 무변경.

## 2. 상세 진입 방식

- **route 방식**: `/store/online-sales/orders/:orderId` (URL 직접 접근 가능). 목록에서 (a) 주문번호 링크, (b) '상세 보기' 컬럼 링크 → 상세. 상세 상단 "주문 목록으로" 뒤로가기.

## 3. 사용 상세 API + 권한 스코프

- **기존 백엔드 재사용**(신규 0): `GET /checkout/store-orders/:orderId` (`kpa-checkout.controller`).
  - `requireAuth + requireStoreOwner`, `where { id, sellerOrganizationId }` + serviceKey('kpa-society'/'kpa') → **자기 매장 판매 주문만** 조회. 미존재/타매장 = 404.
- 프론트 클라이언트 `getStoreOrderDetail` 연결.

## 4. 표시 필드

| 섹션 | 항목 |
|---|---|
| 주문 정보 | 주문번호, 주문일시, 주문 경로("온라인 스토어 주문"), 주문상태(배지), 결제상태, 결제일시(paidAt) |
| 주문자 정보 | 주문자명(마스킹), 이메일(서버 부분 마스킹) |
| 주문 상품 | 상품명·수량·단가·금액 + 합계/배송비/할인/결제금액 |
| 수령/배송(있을 때) | 수령인(마스킹), 연락처(마스킹), 주소(우편번호+address1+상세 부분 마스킹), 요청사항(memo) |
| 결제 내역(있을 때) | 결제수단·상태·금액 |

- `channelType/channelId` 등 기술 용어 비노출 → "온라인 스토어 주문"으로 표기.

## 5. 마스킹 처리 방식 (프론트 로컬 helper — 공용 유틸 부재)

- 이름: `홍길동 → 홍*동`, 2글자 `홍길 → 홍*`.
- 연락처: `010-1234-5678 → 010-****-5678`(앞 3 + 뒤 4 유지).
- 이메일: **서버**가 `local.slice(0,3)***@domain`로 내려줌 → 그대로 표시.
- 주소 상세(address2): 앞 2자 + `***` 부분 마스킹. 우편번호/address1(일반 지역)은 표시.
- 원문 전체 노출 없음.

## 6. 미표시 필드 / 이유

- `logs`(주문 상태 이력): 상태 처리(취소/환불) 범위 외라 본 읽기 전용 화면에서 생략(후속 처리 화면에서 활용).
- buyerId 등 내부 식별자: 비노출.

## 7. 빈 상태 / 404 / 권한 / 오류 처리

- 로딩: "주문 상세를 불러오는 중...".
- 404(`ORDER_NOT_FOUND`/status 404): "주문 정보를 찾을 수 없습니다."
- 권한(status 403): "이 주문을 확인할 권한이 없습니다."
- API 오류: "주문 상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." + 다시 시도.
- 모든 상태에서 "주문 목록으로" 제공. 수령/배송·결제 내역은 데이터 있을 때만 섹션 렌더.

## 8·9·10. 회귀 / 무변경

- 온라인 판매 주문 목록(`/online-sales/orders`)·발주 내역(`/commerce/orders`)·판매 설정/상품 화면 무변경(목록은 진입 링크만 추가).
- GP/KCos 파일·메뉴 무변경(신규는 KPA 전용 파일, 공통 config 미변경).

## 11. 테스트/빌드/smoke

| 검증 | 결과 |
|---|---|
| `web-kpa-society` tsc --noEmit | ✅ exit 0 |
| 배포 (Web Cloud Run, 328c9bfb3) | ✅ |
| 상세 API 실재/스코프 | ✅ 정적 확인(requireStoreOwner + sellerOrg + 404) |
| 브라우저 시각 smoke (상세 진입/마스킹/오류 상태) | ⬜ **보류** — Playwright 영속 프로필이 다른 Chrome 세션에 점유되어 launch 실패(로컬 환경 제약, 본 변경 무관). 코드+tsc+배포로 확인. 프로필 점유 해제 후 재시도 가능 |

## 12. 후속 후보

- 주문 상태 변경/처리(이행), 취소/환불(`PATCH /store-orders/:id/status` 연결).
- 배송/수령 처리.
- 온라인 주문 CS + 상담 요청 알림 통합.
- 주문 알림(요청 생성/상태 변경 시).
- 영수증/거래명세서 출력.
- 마스킹 공용 유틸 승격(현재 KPA 로컬 helper) — 다른 화면에서 재사용 시.

## 결론

온라인 판매 주문 상세를 **읽기 전용**으로 신설(기존 seller detail API 재사용, 개인정보 프론트 마스킹). 상태 처리·환불은 의도적으로 제외해 정책 범위를 키우지 않음. backend/DB/결제/GP/KCos 무영향, tsc·배포 통과. 브라우저 시각 smoke만 로컬 프로필 점유로 보류.
