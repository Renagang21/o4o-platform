# CHECK-O4O-KPA-STORE-CONSULTATION-REQUEST-NOTIFICATION-WIRING-V1

> WO: `WO-O4O-KPA-STORE-CONSULTATION-REQUEST-NOTIFICATION-WIRING-V1`
> 기준 IR: `docs/ir/IR-O4O-KPA-STORE-CONSULTATION-REQUESTS-NOTIFICATION-REPLACEMENT-AUDIT-V1.md` (커밋 `d952c2c04`)
> 작업일: 2026-06-25
> 성격: 기능 추가 (요청 인지 경로를 polling → 알림 중심으로 보완). 메뉴/route/테이블 삭제 없음.

---

## 1. 변경 요약

KPA 매장 상담 요청(`tablet_interest_requests`) 생성 시 **매장 사용자에게 in-app 알림을 생성**하고,
알림 클릭 시 처리 화면(`/store/requests`)으로 이동하도록 보완했다.

- 기존: 요청 생성 시 알림 없음 → 직원이 `/store/requests` 를 5초 polling 으로 직접 봐야만 인지.
- 변경: 요청 생성 직후 해당 매장 owner/admin/manager 에게 알림 생성 → 알림 클릭 → `/store/requests` 이동.
- 알림 생성은 **best-effort** — 실패해도 상담 요청 생성(본 기능)은 성공한다.

이 작업은 `/store/requests` 메뉴 삭제의 **선행 조건**이며, 이번 WO에서는 메뉴/route/테이블을 삭제하지 않는다.

---

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/entities/Notification.ts` | `NotificationType` 에 `'store.consultation_requested'` 추가 |
| `apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts` | `POST /:slug/tablet/interest` 요청 생성 후 매장 사용자 알림 생성 (best-effort, KPA 한정) + `notificationService` import |
| `services/web-kpa-society/src/components/KpaGlobalHeader.tsx` | 알림 클릭 navigate 에 **내부 path 가드** 추가 (외부 URL 차단) |

DB migration: **없음** (varchar 컬럼, TS union 만 확장).

---

## 3. 알림 대상자 산정 방식

요청이 생성된 매장(`organization_id = resolved.storeId`)의 사용자에게만 보낸다. **운영자 전체(`kpa:operator`)에게 보내지 않는다.**

```sql
SELECT DISTINCT user_id
  FROM organization_members
 WHERE organization_id = $1
   AND role IN ('owner','admin','manager')
   AND left_at IS NULL
 LIMIT 20
```

- 근거: 매장 경영자 = `organization_members` (마이그레이션 `20260304210000-BackfillKpaStoreOwners` 가 KPA 약국 개설약사 → `role='owner'`).
- owner(경영자) + admin/manager(직원/관리) 포괄.

---

## 4. Notification type

신규 type `store.consultation_requested` 를 `NotificationType` union 에 추가.

- DB 컬럼은 `varchar(50)` 이므로 enum 제약/마이그레이션 불필요.
- 프론트(@o4o/account-ui `NotificationBell`, admin `getNotificationIcon`)는 미지정 type 을 default(🔔)로 렌더 → 신규 type 추가가 기존 렌더를 깨지 않음.

---

## 5. metadata 구조

```json
{
  "targetUrl": "/store/requests",
  "requestId": "<tablet_interest_requests.id>",
  "organizationId": "<storeId>",
  "storeSlug": "<:slug>",
  "source": "tablet",
  "targetType": "tablet_interest_request",
  "productName": "<상품명>"
}
```

- `targetUrl` 은 1차 안전안인 `/store/requests` 고정. (`?requestId=` highlight 는 후속 — 페이지 미지원이라 이번 범위 제외)
- title: `새 상담 요청이 도착했습니다`
- message: 상품명 있으면 `{productName} 상담 요청이 접수되었습니다.`, 없으면 `매장 상담 요청이 접수되었습니다.`
- 고객명/연락처 등 상세는 알림에 노출하지 않음 → `/store/requests` 처리 화면에서 확인.

---

## 6. serviceKey 매핑 주의점 (핵심)

- `platform_store_slugs.service_key = 'kpa'` 이지만, KPA web 알림 bell(`KpaGlobalHeader` → `useNotifications`)은 `serviceKey='kpa-society'` 로 필터한다.
- 따라서 알림 생성 시 `serviceKey: 'kpa-society'` 로 저장해야 bell 에 노출된다. (`resolved.serviceKey`('kpa') 그대로 쓰면 bell 에 안 보임)
- 기존 `pharmacy-request.controller` / `contact-request.controller` 도 동일하게 `'kpa-society'` 사용 — 정합.

---

## 7. best-effort 처리

요청 생성(`interestRepo.save`) 성공 후 알림 블록 전체를 `try/catch` 로 감쌈.

- 알림 대상 조회/생성 실패 → `console.error` 로그만 남기고 **API 응답은 201 성공 유지.**
- 개별 알림 생성은 `Promise.allSettled` 로 일부 실패가 전체를 막지 않음.

---

## 8. 프론트엔드 (알림 클릭 → 이동)

- KPA web `KpaGlobalHeader.handleNotificationClick` 은 **이미** `metadata.targetUrl` navigate 를 구현(기존 회원가입 알림 WO에서 도입). 본 WO 에서 추가로 **내부 path 가드**만 보강:
  - `target.startsWith('/') && !target.startsWith('//')` 일 때만 navigate.
  - 외부 URL(`http://`, `https://`, `//`) navigate 차단.
- `apps/admin-dashboard/src/components/layout/NotificationList.tsx` 는 store owner 가 쓰는 화면이 아니므로(매장은 web-kpa-society 사용) 본 WO 범위에서 미수정 → 후속 과제.

---

## 9. 검증 결과

| 항목 | 결과 |
|---|---|
| api-server typecheck (`tsc --noEmit`) | ✅ PASS (error 0) |
| web-kpa-society typecheck (KpaGlobalHeader) | ✅ PASS (error 0) |
| 상담 요청 생성 경로에 알림 생성 코드 진입 | ✅ (save 직후, KPA 한정) |
| best-effort try/catch | ✅ |
| metadata 필수 필드(targetUrl/requestId/organizationId/source) | ✅ |
| 알림 클릭 → 내부 path navigate | ✅ (KpaGlobalHeader 기존+가드) |
| 브라우저 smoke (요청 생성 → 알림 도착 → 클릭 → /store/requests) | ⏳ 배포 후 별도 수행 권장 |

> 브라우저 smoke 는 프로덕션 배포 후 매장 계정 로그인 + 태블릿 공개 화면 상담 요청으로 검증 필요(메모리 정책: 배포 success 만으로 PASS 금지).

---

## 10. 제외한 범위 (WO §3 제외 항목 그대로)

- `/store/requests` 메뉴/route 삭제, `StoreHomePage`/`StoreChannelsPage` 링크 정리
- `tablet_interest_requests` / `tablet_service_requests` 테이블 변경
- QR page 콘텐츠 하단 상담 CTA, `store_qr_codes` 스키마/`source` 컬럼
- GP/KCos 요청 모델 통합 및 GP/KCos 알림 생성 (handler 는 service-neutral 이나 `resolved.serviceKey === 'kpa'` 로 한정 → GP/KCos 동작 무변경)
- 알림센터 인라인 처리 액션, SSE/WebSocket 구조 변경

---

## 11. 후속 과제

1. `/store/requests` 메뉴 제거 또는 hidden route 전환 + 홈/채널 링크 정리 (본 알림 동선 검증 후)
2. QR page 콘텐츠 하단 상담 CTA 옵션 (`store_qr_codes` 설정값 방식)
3. `tablet_interest_requests` `source` 구분 컬럼 또는 GP `customer_requests`(source_type+purpose) 모델 통합
4. `/store/requests?requestId=` highlight 지원 후 metadata.targetUrl 에 requestId 부착
5. GP/KCos 상담 요청 알림 parity
6. `apps/admin-dashboard` NotificationList targetUrl navigate (운영자 화면 일반화 시)
7. `tablet_service_requests` live 참조 여부 정리
