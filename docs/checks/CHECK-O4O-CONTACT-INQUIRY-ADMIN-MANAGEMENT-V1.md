# CHECK-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1

> `WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1` 결과.
> GP/KCos 접수 문의(`ContactInquiry`)를 Admin 운영자가 **조회·상태 처리**할 수 있는 화면을 추가.
> 공통 `ContactInquiryAdminPage`(operator-core-ui) + GP/KCos admin route/menu. 알림 targetUrl 연결. **migration 없음.**
> Neture/KPA·공개 Contact form 무변경.
> **결과: CODE PASS** (tsc api-server/GP/contact파일 0 + GP build 0). 배포 후 smoke + 테스트 문의 정리 예정. — 2026-06-12

---

## 1. 작업 목적
선행 WO 로 GP/KCos 문의가 저장·알림되지만 조회·처리 화면이 없던 운영 흐름을 닫는다(목록/상세/상태/메모).

## 2. 선행 ContactInquiry 반영
- `contact_inquiries` + `POST /public/services/:serviceKey/contact-inquiries`(접수+in-app 알림) 위에 admin 조회/처리 API + UI 추가.
- entity 의 handled_at/handled_by/internal_note/notification_status(선행에서 nullable 로 선반영) 를 본 WO 에서 사용.

## 3. backend Admin API 구현
- `apps/api-server/src/modules/contact-inquiry/admin-contact-inquiry.controller.ts`:
  - `GET /:serviceKey/contact-inquiries`(목록 status/page/limit, **본문 미노출**) ·
    `GET /:serviceKey/contact-inquiries/:id`(상세 본문 포함) ·
    `PATCH .../:id/status`({status}, +handled_at/handled_by) · `PATCH .../:id/note`({internalNote}).
  - mount `/api/v1/admin/services`(service-legal admin 과 동일 group). public 컨트롤러 알림 metadata 에 `targetUrl:'/admin/contact-inquiries'` 추가.
- **migration 없음** — 기존 contact_inquiries 재사용(WO §12.15 충족).

## 4. 권한 처리 방식
- `requireServiceLegalScope('admin')` 재사용 — serviceKey 별 `{prefix}:admin`(glycopharm→glycopharm, k-cosmetics→cosmetics),
  KPA platformBypass=false 자동 준수. **admin only**(operator 기본 접근 없음).
- + serviceKey 화이트리스트 = **glycopharm / k-cosmetics**(Neture/KPA 는 404). service admin 은 자기 서비스만(타 서비스 403/404).

## 5. GP Admin UI / 6. KCos Admin UI
- 공통 `ContactInquiryAdminPage`(`@o4o/operator-core-ui/modules/contact-inquiry`): 목록(상태 필터/페이지/새로고침) + 상세 drawer
  (유형/이름/이메일/연락처/소속/본문/접수일/알림상태/경로) + **상태 변경 + 내부 메모 저장**. 본문 plain text(whitespace-pre-wrap,
  dangerouslySetInnerHTML 미사용). inline style.
- GP wrapper `pages/admin/ContactInquiriesPage.tsx`(serviceKey 'glycopharm', 약국 톤 유형 라벨) ·
  KCos wrapper(serviceKey 'k-cosmetics', 매장 톤). authClient api 어댑터(401/403 메시지).

## 7. 메뉴/route 추가 결과
- GP: `/admin/contact-inquiries`(App.tsx admin 하위) + DashboardLayout admin System 그룹 "문의 관리".
- KCos: 동일(`/admin/contact-inquiries` + DashboardLayout admin System "문의 관리").

## 8. 목록/상세/상태 변경 기능
- 목록: 접수일/유형/제목/이름/소속/상태/처리일 + 상태 필터 + 페이지네이션. 본문 미노출(상세에서만).
- 상세: 전체 필드 + 상태 select(received/in_review/answered/closed/spam) + 내부 메모 textarea + 저장(status 변경 시 handled_at/by 기록).

## 9. 알림 targetUrl 처리 여부
- `contact.new` 알림 metadata 에 `targetUrl:'/admin/contact-inquiries'` 추가 → 알림벨 클릭 시 문의 관리 목록 이동
  (NotificationBell 의 기존 targetUrl 라우팅 재사용). 상세 deep-link 는 후속(목록까지 연결).

## 10. 테스트 문의 처리 결과
- (배포 후 smoke 시: 선행 WO 의 [SMOKE] GP/KCos 문의를 `spam` 상태로 변경 — hard delete 미생성, WO §6.4)

## 11. 개인정보/XSS 처리 기준
- 목록 본문 미노출 / 상세는 admin 권한만 / 본문 plain text(dangerouslySetInnerHTML 미사용) / 오류 메시지 내부 stack 미노출.

## 12. Neture/KPA 미수정 / 13. 공개 Contact form 회귀
- `services/web-neture`·`services/web-kpa-society` **0건**. 공개 Contact form(GP/KCos ContactPage) **무변경**(이번은 admin 측만).

## 14. 검증 결과
- tsc: api-server 0 / web-glycopharm 0 / **contact-inquiry 파일 0**(공유 컴포넌트 포함) ✅
- build: web-glycopharm 0 ✅ (공유 `ContactInquiryAdminPage` 번들 정상).
- KCos full local build 는 **타 세션 미커밋 ForumPage WIP**(`pageNumbers` 미사용)로 차단 — 본 WO 파일과 무관, path-specific 커밋에 미포함 → main 무영향(CI 는 clean main 빌드).
- migration 없음.

## 15. 브라우저 smoke 결과
- (배포 후 갱신)

## 16. commit hash
- (커밋 후 기재)

---

## 후속
1. `WO-O4O-CONTACT-EMAIL-NOTIFICATION-V1` — 서비스별 이메일 수신자/발송.
2. `WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1` — 유형/수신자/자동응답 Admin 설정.
3. `WO-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1` — Neture/KPA ↔ ContactInquiry 통합 IR.
- 알림 상세 deep-link(`/admin/contact-inquiries/:id`) · 목록 keyword/date 필터는 후속 확장.

*Date: 2026-06-12 · Status: CODE PASS. GP/KCos 문의 조회·처리 Admin + 알림 targetUrl. migration 없음, Neture/KPA·공개폼 무변경.*
