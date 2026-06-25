# CHECK-O4O-KPA-ONLINE-SALES-ORDER-NOTIFICATION-V1

> WO-O4O-KPA-ONLINE-SALES-ORDER-NOTIFICATION-V1 실행 결과
> 실행일: 2026-06-25 · 대상: 프로덕션 API `o4o-core-api`
> 선행: 온라인 판매 메뉴/주문 관리/주문 상세(WO-...-ORDER-MANAGEMENT / -ORDER-DETAIL)
> 구현 커밋: `82d99409f` (backend, KPA) — API Server(Cloud Run) 배포

## 1. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/entities/Notification.ts` | NotificationType에 `store.online_sales_order_created` 추가 |
| `apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts` | 주문 생성 commit 직후 매장 경영자 in-app 알림 생성(best-effort) + `notificationService` import |

- DB/migration **무변경**(기존 `notifications` 구조·`NotificationService.createNotification` 재사용). checkout/결제 로직 무변경. 프론트 무변경. GP/KCos 무변경.

## 2. 알림 생성 위치

- `POST /checkout`(kpa-checkout.controller) 핸들러에서 **`queryRunner.commitTransaction()` 직후**(주문·결제 row 영속 확정 후), `res.status(201)` 직전.
- `void (async () => { … })()` **fire-and-forget**로 실행 → 고객 응답 지연 0.

## 3. 알림 수신자 결정 방식

- `organization_members` 에서 `organization_id = sellerOrganizationId(=organization.id)` AND `role IN ('owner','admin','manager')` AND `left_at IS NULL` (LIMIT 20).
- 복수 매장 사용자 모두에게 생성(`Promise.allSettled`). 선행 상담요청 알림(`store-public-tablet.handler`)과 동일 패턴 재사용.

## 4. 알림 제목 / 본문 / targetUrl

- type: `store.online_sales_order_created`, serviceKey: `kpa-society`, organizationId: sellerOrg.
- 제목: `새 온라인 판매 주문이 접수되었습니다`
- 본문: `주문 {orderNumber} · {amount}원이 접수되었습니다.`
- metadata: `{ targetUrl: '/store/online-sales/orders/{orderId}', orderId, orderNumber, totalAmount, targetType: 'checkout_order' }`

## 5. 개인정보 미노출 확인

- 본문/메타데이터에 **고객명·연락처·이메일·주소 없음**. 주문번호·금액·orderId만. 내부 `channel_type='B2C'` 등 기술 용어 비노출("온라인 판매" 표현).

## 6. 알림 실패 시 주문 성공 유지

- 알림 블록은 **commit 이후** + **자체 try/catch** + **await 하지 않음(fire-and-forget)**. 알림/수신자 조회 실패는 `logger.error`로만 기록되고 **주문 생성 응답(201)에 영향 없음**.
- 의도적으로 commit 이후 배치 → 알림 코드가 outer try로 throw돼 (이미 커밋된) tx를 rollback 시도하는 위험 차단.

## 7. 중복 알림 방지

- 주문 1건 생성당 1회 실행(주문 생성 경로는 트랜잭션 1회). 별도 dedupeKey 미도입 — 동일 주문에 대한 재알림은 주문 재생성(별도 row)이 있어야만 발생(현 경로상 미발생). 과도한 중복 위험 낮아 V1 추가 dedupe 생략.

## 8. NotificationBell 클릭 이동 확인

- 프론트 무변경. `KpaGlobalHeader.handleNotificationClick`이 `metadata.targetUrl`을 읽어 **내부 path만 허용**(외부 `//`·`http(s)://` 차단)하고 `navigate(target)` → `/store/online-sales/orders/:id` 정상 이동. 공개 storefront(`/store/:slug`)로 이동 불가(가드).
- 선행 상담요청 알림이 동일 경로로 동작 중 → 본 알림도 동일 인프라.

## 9. GP/KCos 무변경

- 변경은 KPA checkout 경로(`kpa-checkout.controller`)와 공통 `Notification` 타입 추가(additive)만. GP/KCos checkout·notification 경로 무변경.

## 10. 테스트/빌드/smoke

| 검증 | 결과 |
|---|---|
| `api-server` tsc --noEmit | ✅ error 0 |
| 배포 (API Server Cloud Run, 82d99409f) | ✅ |
| 알림 생성 코드 호출(commit 후) / targetUrl=내부 주문 상세 / 개인정보 미포함 / 실패 비전파 | ✅ 정적 확인(코드) |
| 운영 e2e smoke (실제 고객 주문 → bell 알림 → 클릭 이동) | ⬜ **보류** |

> **운영 e2e smoke 보류 사유**: (a) 실제 고객 주문 생성은 데모 매장 B2C_COMMERCE capability 미활성으로 storefront 주문 자체가 불가(선행 WO와 동일 capability 제약). (b) Playwright 영속 프로필이 다른 Chrome 세션에 점유되어 브라우저 검증 불가. → 코드+tsc+배포로 검증, 실주문 e2e는 capability 활성 매장 + 프로필 해제 시 후속 수행. 알림 인프라(createNotification/SSE/bell targetUrl)는 선행 상담요청 알림으로 운영 실증된 동일 경로.

## 11. 후속 후보

- 주문 상태 변경/취소/환불 알림.
- 온라인 주문 CS 알림 + 상담 요청 알림 통합.
- 이메일/SMS/카카오 알림 확장.
- 실주문 e2e smoke(capability ON 매장).

## 결론

온라인 스토어 신규 판매 주문 접수 시 매장 경영자에게 in-app 알림을 생성하고, 클릭 시 내부 주문 상세로 이동하도록 연결. **주문 생성은 알림 실패와 완전 격리**(commit 후 fire-and-forget). 개인정보 미노출, 내부 경로 전용 이동, backend/DB/결제/GP/KCos 무영향. 실주문 e2e만 환경 제약으로 보류.
