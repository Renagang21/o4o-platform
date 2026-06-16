# CHECK-O4O-SELLER-RECRUITMENT-SELLER-NOTIFICATION-V1

> **작업명:** WO-O4O-SELLER-RECRUITMENT-SELLER-NOTIFICATION-V1
> **유형:** 기존 알림 구조 연결 (backend only, best-effort). 새 알림 시스템·entity·migration **무**.
> **결과: PASS — 기존 `notificationService.createNotification`(in-app) 재사용. 승인/반려/참여 해지 시 판매자(application.partnerId)에게 in-app 알림 best-effort 생성. NotificationType 3종 추가(varchar → migration 없음). 알림 실패가 원 처리(승인/반려/해지)를 실패시키지 않음. api-server typecheck 0 · web-neture build ✓(프론트 무변경 회귀).**
> 선행: `WO-...-PARTICIPATION-TERMINATION-V1`(65549bbfa) — 2026-06-16

---

## 1. 조사 결과

- **기존 in-app 알림 구조 존재**: `notificationService.createNotification({ userId, type, title, message, serviceKey, actorId, metadata })` (`services/NotificationService.ts:61`, 싱글톤 `notificationService:326`). auth-register/lms/contact 등 광범위 사용, **best-effort(try-catch/allSettled) 패턴 확립**.
- **NotificationType = varchar(50) union**(`entities/Notification.ts:110`, DB enum 아님) → 전용 type 추가가 **migration-free**(기존 패턴: market_trial.*, member.registration_*).
- **이메일**: 별도 구조 존재하나 본 WO 범위 외(in-app 1순위 재사용으로 충분).
- **이벤트 위치**: `approvePartnerApplication`/`rejectPartnerApplication`/`terminateParticipation` 모두 `partner-contract.service.ts` — 모두 `application.partnerId`(수신=판매자 user id) + `recruitment`(productName/serviceId) scope 보유.
- **판매자 신청 현황 전용 route 미확인** → dead link 방지 위해 targetUrl 생략(metadata 만). 판매자 신청 현황 화면은 후속 WO 후보.

## 2. 변경 내용 (backend only, 2)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/entities/Notification.ts` | NotificationType 3종 추가: `recruitment.application_approved`/`application_rejected`/`participation_terminated` (varchar union — migration 없음) |
| `.../neture/services/partner-contract.service.ts` | `notificationService`/`NotificationType` import + private `notifyApplicant`(best-effort) + 승인/반려/참여해지 3지점에서 판매자 알림 생성 |

- **frontend 무변경**: in-app 알림은 기존 플랫폼 알림 센터가 소비 → UI 추가 불요.

## 3. 알림 사양

| 이벤트 | type | 수신자 | title / message |
|------|------|--------|------|
| 승인 | `recruitment.application_approved` | application.partnerId | "판매자 모집 신청이 승인되었습니다." / "{제품} … 조달 가능한 상품으로 확인할 수 있습니다." |
| 반려 | `recruitment.application_rejected` | application.partnerId | "판매자 모집 신청이 반려되었습니다." / "… 자세한 사유는 모집 신청 내역을 확인해 주세요." |
| 참여 해지 | `recruitment.participation_terminated` | application.partnerId | "판매자 모집 참여가 해지되었습니다." / "… 조달 가능 상태가 종료되었습니다. 기존 주문 이력은 유지됩니다." |

- serviceKey = recruitment.serviceId. metadata = {recruitmentId, applicationId, productId, eventType}. 문구: "즉시 판매"/"계약 해지" 등 금지 표현 미사용("조달 가능 상품 확인"/"참여 해지").

## 4. best-effort 처리

- `notifyApplicant` 는 try-catch 로 감싸 **알림 실패 시 warn 로그만** 남기고 throw 안 함 → 승인/반려/참여 해지 자체는 항상 성공(기존 C bridge best-effort 와 동일 정책).
- 알림 호출은 각 처리의 **성공 후**(상태 저장/bridge/cleanup 완료 뒤) 1회.

## 5. 제외 범위 (WO 준수)

새 notification 테이블/entity / 새 메일 인프라 / queue·job / 알림 설정 화면 / SMS·알림톡 / 정산·주문 알림 / 모집 생성·마감·재개 알림 / 운영자 알림 / RBAC·bridge·계약·OPL·가격 변경 / migration / 판매자 신청 현황 화면. **모두 미수행.**

## 6. 검증

- **api-server:** `tsc --noEmit` **0 errors** ✅
- **web-neture:** `build ✓ (~12s)` ✅ (프론트 무변경 회귀 확인)
- **정적:** 알림은 기존 service 재사용, 3지점 best-effort. NotificationType varchar 추가(migration 없음). 승인/반려/해지 로직·C bridge·계약 무변경. 존재하지 않는 route link 없음(targetUrl 생략).
- **browser/DB smoke:** 미수행 — dev·인증 guard. **배포 후 권장:** 판매자 신청 → 공급자 승인 → 판매자 알림 센터에 승인 알림 / 반려 → 반려 알림 / 참여 해지 → 해지 알림. 알림 실패해도 승인/반려/해지 성공.

## 7. 완료 판정 / 후속

**PASS.** 기존 in-app 알림에 판매자 모집 승인/반려/참여 해지 이벤트 연결(best-effort). 새 알림 시스템·migration 없음, 원 처리 무영향.

**커밋:** path-specific 3파일 · `<commit>`.
**후속(선택):** `WO-O4O-SELLER-RECRUITMENT-SELLER-APPLICATION-STATUS-VIEW-V1`(판매자 본인 신청 현황 화면 + 알림 link target) / 이메일 알림 / 통보 i18n.

---

*Date: 2026-06-16 · 알림 연결 PASS · 기존 notificationService 재사용, 승인/반려/참여해지 → 판매자 in-app 알림 best-effort. NotificationType 3종 varchar 추가(migration 없음). frontend·bridge·계약·가격 무변경. typecheck 0 · build ✓.*
