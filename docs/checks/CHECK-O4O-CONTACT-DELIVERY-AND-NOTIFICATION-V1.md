# CHECK-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1

> `WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1` 결과 (범위 정정: GP/KCos 우선).
> GlycoPharm·K-Cosmetics 의 공개 문의를 **신규 cross-service `ContactInquiry`** 로 접수하고 운영자 **in-app 알림**
> (`contact.new`)으로 연결. 기존 contact 가 있던 Neture/KPA 는 **무변경**. 이메일·Admin 화면은 후속.
> **결과: CODE PASS** (tsc api-server/GP/KCos 0 + build 0). 배포 후 migration 자동 + 브라우저 smoke 예정. — 2026-06-12

---

## 1. 작업 목적
GP/KCos 의 공개 문의가 화면 제출(mailto/정적)에서 끝나지 않고 backend 저장 + 운영자 in-app 알림으로 연결되게 한다.

## 2. 기존 Contact 구조 조사 결과
| 서비스 | 현황 | 처리 |
|--------|------|------|
| **Neture** | `NetureContactMessage` + `POST /neture/contact` + 운영자 알림(contact.new) — 작동 중 | **무변경** |
| **KPA** | `ContactRequest` + `POST /kpa/contact-requests` + 운영자 알림(contact.new) — 작동 중 | **무변경** |
| **GlycoPharm** | 백엔드 없음, 프론트 mailto 링크만 | **신규 연결** |
| **K-Cosmetics** | 백엔드 없음, 프론트 정적 연락처만 | **신규 연결** |
- 공통 `ContactInquiry` 부재 확인 → 신규 추가. 4서비스 전면 통합은 후속 IR/WO 로 분리(작동 중 Neture/KPA 미접촉).

## 3. backend entity/API 구현
- **entity** `ContactInquiry` (table `contact_inquiries`) — serviceKey/inquiryType/name/email/phone/organizationName/subject/
  message/privacyConsent/status/source_path/user_agent/ip_hash/notification_status/handled_*(후속)/timestamps.
  `apps/api-server/src/modules/contact-inquiry/entities/ContactInquiry.entity.ts`.
- **migration** `20261105000000-CreateContactInquiries` — additive(hasTable 가드, 인덱스 (service_key,status)/(service_key,created_at), seed 없음).
- **connection.ts** 등록(additive). **register-routes** mount(`/api/v1/public/services`).
- **public API** `POST /api/v1/public/services/:serviceKey/contact-inquiries` (no auth).
  - serviceKey 화이트리스트 = **glycopharm / k-cosmetics 만**(Neture/KPA 는 자체 경로 → 본 API 거부).

## 4. 알림 수신자 결정 기준
- `role_assignments` 에서 `{prefix}:operator` + `{prefix}:admin` (glycopharm→glycopharm, k-cosmetics→cosmetics) DISTINCT user 조회.
  (Neture/KPA 기존 contact 와 동일 role-broadcast 패턴.) 수신자 없으면 `notification_status='skipped_no_recipient'`.

## 5. email/notification 처리 방식
- **in-app 알림만**(V1): `notificationService.createNotification({ type:'contact.new', serviceKey, metadata:{contactInquiryId,inquiryType} })`,
  best-effort(Promise.allSettled). 알림벨로 운영자 즉시 확인. **이메일 발송 미포함**(후속 `WO-O4O-CONTACT-EMAIL-NOTIFICATION-V1`).
- notification_status: `sent` / `skipped_no_recipient` / `failed` 기록(접수 성공과 분리).

## 6. 각 서비스 form 연결 결과
- 공통 `PublicContactForm`(`@o4o/shared-space-ui`) 신규: inquiryType select + 이름/이메일/연락처/소속/제목/내용 + **개인정보 동의 체크** +
  honeypot + loading/success/error. plain text, `dangerouslySetInnerHTML` 미사용. submitInquiry 어댑터 주입.
- **GP** `ContactPage`: 상단 폼(serviceKey 'glycopharm', 약국명 라벨, /privacy 동의 링크) + 기존 mailto 카드는 "직접 연락" 보조로 유지.
- **KCos** `ContactPage`: 상단 폼(serviceKey 'k-cosmetics', 매장명 라벨) + 기존 카드/안내 유지. **하드코딩 법정정보 "운영 회사 정보" 카드
  (㈜쓰리라이프존/108-86-02873) 제거**(footer 동적화 원칙과 일관).

## 7. serviceKey 확인 결과
- GP `'glycopharm'`, KCos canonical `'k-cosmetics'`. backend 화이트리스트 + role prefix 매핑 일치.

## 8. 개인정보 동의 처리
- 동의 체크 없으면 client 차단 + server `PRIVACY_CONSENT_REQUIRED`(400). 동의 문구 + 개인정보처리방침(/privacy) 링크.

## 9. validation 처리
- client+server 이중: 필수(이름/이메일/제목/내용), 이메일 형식, 내용 10~5000자, 제목 ≤300, 동의 필수. 유형 화이트리스트(미일치→other).

## 10. 스팸 방지 처리
- **honeypot**(`company_website` 숨김 필드) — 채워지면 저장/알림 없이 success 응답(단서 미제공). 길이 제한.
- (참고) 전용 rate limiter 는 V1 미적용 — 후속 과제(register-routes 에 publicLimiter 적용 검토).

## 11. 수신자 미설정 fallback
- 수신자 0명이어도 **접수(저장) 성공**, `notification_status='skipped_no_recipient'`. 알림 실패도 접수 실패로 만들지 않음.

## 12. Admin 문의 관리 화면 제외 여부
- **제외**(후속 `WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1`). entity 에 handled_*/internal_note 필드만 미리 둠(nullable).

## 13. 테스트 문의 생성 여부
- smoke 로 **GP/KCos 각 1건의 [SMOKE] 테스트 문의**(email `smoke-test@example.com`, 제목 `[SMOKE] … 문의 접수+알림 검증`) 생성됨.
  status='received'. **삭제 endpoint 미존재(Admin UI 후속)** — 명확히 [SMOKE] 표기. 후속 Admin 관리 WO 에서 정리 가능.
  honeypot/validation smoke 는 미저장(실데이터 0).

## 14. 검증 결과
- tsc: api-server 0 / web-glycopharm 0 / web-k-cosmetics 0 ✅
- build: web-glycopharm 0 / web-k-cosmetics 0 ✅
- **배포**: Deploy API Server (Cloud Run) success + Deploy Web Services success → migration 자동 실행됨.
- **public API smoke (no-write)**: unknown serviceKey→`404 UNKNOWN_SERVICE` · 동의 누락→`400 PRIVACY_CONSENT_REQUIRED` ·
  잘못된 이메일→`400 INVALID_EMAIL` · honeypot 채움→`201 {id:null}`(미저장) ✅

## 15. 브라우저 smoke 결과 (프로덕션 end-to-end)
| 서비스 | 결과 |
|--------|------|
| **GlycoPharm** | `/contact` 폼 렌더(유형/필드/약국명/동의+/privacy/honeypot) → [SMOKE] 제출 → "문의가 접수되었습니다." → GP admin 로그인 → 알림벨 "새 문의가 접수되었습니다 / [서비스 이용 문의] [SMOKE] GP …" ✅ |
| **K-Cosmetics** | `/contact` 폼 렌더(매장명 라벨, **하드코딩 사업자번호 카드 제거 확인**) → [SMOKE] 제출 → 성공 → KCos admin 로그인 → 알림벨 "새 문의가 접수되었습니다 / [서비스 이용 문의] [SMOKE] KCos …" ✅ |
- serviceKey 'k-cosmetics'→'cosmetics' role broadcast 정상(KCos admin 에게 알림 도달). 접수 저장 + 운영자 in-app 알림 end-to-end 확인.

## 16. commit hash
- 구현 + CHECK: `9acfbb58c` (api-server + web deploy success)
- CHECK smoke 반영: (본 커밋)
- 동시 세션 혼입 방지: `git commit -- <10 명시 경로>` 로 커밋, shared-space-ui/index.ts 의 타 세션 `formatForumDate` export 는
  커밋 전 임시 제거 → 내 export 만 커밋 → 복원(타 세션 WIP 보존). connection.ts diff 도 내 ContactInquiry 추가만 확인.

---

## 미수정 확인
- Neture(`/neture/contact`, NetureContactMessage)·KPA(`/kpa/contact-requests`, ContactRequest) **0건 수정**. 기존 알림 경로 유지.

## 후속 작업
1. `WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1` — GP/KCos 문의 조회·상태 처리 Admin 화면 + 알림 targetUrl.
2. `WO-O4O-CONTACT-EMAIL-NOTIFICATION-V1` — 서비스별 수신자(OperatorNotificationSettings/customer_service_email) 이메일 발송.
3. (통합) Neture/KPA contact 를 ContactInquiry 로 일원화할지 IR.

*Date: 2026-06-12 · Status: CODE PASS. GP/KCos 공개 문의 접수+운영자 in-app 알림 신규. Neture/KPA 무변경, 이메일/Admin 후속.*
