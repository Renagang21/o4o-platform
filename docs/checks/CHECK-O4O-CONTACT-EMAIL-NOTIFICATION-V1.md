# CHECK-O4O-CONTACT-EMAIL-NOTIFICATION-V1

> **작업명:** WO-O4O-CONTACT-EMAIL-NOTIFICATION-V1
> **유형:** GP/KCos Contact 이메일 알림 **운영 발송 검증**(provider 구성 확인 + 실제 발송 smoke). 코드 변경 없음.
> **결과: PASS — 프로덕션 SMTP provider 구성 확인(ENV), GP·KCos 실제 발송 실증 `inapp:sent;email:sent`. 코드/migration 0.** — 2026-06-12
> 선행: `WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1`(발송 경로·설정 완비) 외 contact 계열.

---

## 1. 작업 목적
선행 WO 로 이미 연결된 `emailService.sendEmail` 경로가 **운영 환경에서 실제 발송되는지** 검증하고, 수신자는 Admin 설정에서 가져옴을 확인. 신규 구조 생성 아님.

## 2. 선행 Contact 설정 반영
- `ServiceContactSettings`(email on/off + recipientEmails) + submit 흐름의 settings 기반 알림 + `notification_status = inapp:<x>;email:<y>` 기록은 선행 WO 에서 완비. 본 WO 는 그 위에서 **발송 운영 검증**만 수행.

## 3. email service 조사 결과
- facade `apps/api-server/src/services/email.service.ts` → `@o4o/mail-core` `MailService`.
- 설정 우선순위: **ENV(`createTransportFromEnv`, 생성자 시점) → DB `SmtpSettings`(initialize 시 fallback)**.
- `sendEmail({to,subject,html})` 반환 `{success, error}` — **throw 없음**(내부 try/catch). transport 미가용 시 실패 반환 → submit 흐름 안전.
- 여러 수신자: `to` 배열 join 지원. HTML 본문은 submit 컨트롤러에서 **escape 후** 구성. EmailLog 감사 기록(fire-and-forget).

## 4. provider/env 구성 여부
- **프로덕션 `o4o-core-api`(Cloud Run, asia-northeast3) 에 SMTP ENV 전부 SET** — `createTransportFromEnv` 가 생성자에서 transporter 생성 → **발송 라이브**. (DB SmtpSettings fallback 불필요.)

## 5. 사용한 환경변수 이름 (값 미기록)
- `EMAIL_SERVICE_ENABLED`(=`true`) · `SMTP_HOST` · `SMTP_PORT`(=`587`) · `SMTP_SECURE`(=`false`, STARTTLS) · `SMTP_USER` · `SMTP_PASS` · `EMAIL_FROM_NAME`.

## 6. secret 값 미기록 확인
- host/user/pass 등 **secret 값은 본 문서·로그·코드 어디에도 미기록**(존재 여부 + 비밀 아닌 flag 값(enabled/port/secure)만 기록). 변경 없음(기존 구성 사용).

## 7. 발신자 주소 정책
- facade 기준: `from = "${EMAIL_FROM_NAME||...}" <${EMAIL_FROM||SMTP_USER||noreply@o4o.com}>`. 제목 `[서비스명] 새 문의가 접수되었습니다 — <subject>`. replyTo 별도 미설정(문의자 이메일은 본문 표기) → header injection 노출면 없음(주소를 헤더로 직접 사용 안 함).

## 8·9. GP / KCos 테스트 결과
- **GP**: 문의 설정 email ON + 수신자(테스트) 저장 → 공개 API 제출(`/public/services/glycopharm/contact-inquiries`) → Admin 문의 상세 **알림 상태 `inapp:sent;email:sent`** ✅ → 테스트 문의 spam → **설정 email OFF + 수신자 삭제(정리)**.
- **KCos**: 동일(serviceKey `k-cosmetics`, role prefix cosmetics) → **`inapp:sent;email:sent`** ✅ → spam → 정리.

## 10. notificationStatus 결과
- 양 서비스 `inapp:sent;email:sent` — in-app 생성 + SMTP 발송 성공(메시지 수락) 동시 확인. (email OFF 기본 상태에서는 `email:off`, 수신자 0+ON 은 설정 단계에서 차단.)

## 11. 실제 메일 도착 여부
- 테스트 수신자 = **사용자 SSOT 테스트 계정 `sohae2100@gmail.com`**(본인 확인 가능 주소, RFC reserved 아님). `email:sent`(SMTP 수락) 까지 실증. **최종 수신함 도착 확인은 사용자 inbox 확인 항목**(메일 2건: GP/KCos 각 1건, 제목 `[GlycoPharm]`/`[K-Cosmetics] 새 문의가 접수되었습니다…`).

## 12. 테스트 수신자 제거 여부
- GP·KCos 모두 검증 후 **수신자 삭제 + email 알림 OFF 로 복구** — 운영 상태 clean(실 contact 제출이 사용자 개인 inbox 로 가지 않음).

## 13. 테스트 문의 처리 결과
- GP `[SMOKE] email notification…` · KCos `[SMOKE] KCos email notification…` 각 1건 → **spam 처리**(hard delete 없음).

## 14. 이메일 실패 시 접수 성공 유지
- `sendEmail` throw 없음 + 컨트롤러 best-effort(try/catch) → 발송 실패해도 `ContactInquiry` 저장·201 응답 유지, `notification_status` 에 `email:fail`/`noprovider` 기록(코드 검증). 본 smoke 는 성공 경로 실증.

## 15. in-app 알림 유지
- `inapp:sent` 동시 기록으로 in-app 기본 안전망 유지 확인.

## 16. Neture/KPA 미수정
- 코드/설정/배포 변경 0. Neture/KPA contact 구조 무관. 화이트리스트로 backend 도 glycopharm/k-cosmetics 한정.

## 17. 검증 결과
- provider ENV 인식(발송 라이브) ✅ · GP/KCos 발송 시도+성공(`email:sent`) ✅ · 수신자 Admin 설정 기반(하드코딩 0) ✅ · secret 미노출 ✅ · in-app 유지 ✅ · 접수 성공 불변 ✅ · Neture/KPA 무변경 ✅.
- **migration 없음**(WO §14 — 설정/엔티티는 선행 WO 에 존재, 본 WO 는 운영 검증). **코드 변경 없음**(발송 경로·status 매핑 선행 WO 에서 완비, ENV provider 가 이미 구성되어 추가 코드 불필요).

## 18. 배포 결과
- 코드/env 변경 없음 → **재배포 없음**. 라이브 화면(GP/KCos `/admin/settings/contact`)·발송 동작 검증만 수행.

## 19. commit hash
- 코드 변경 0 → 본 CHECK 문서 1건만 커밋(아래).

---

## 후속
1. `WO-O4O-CONTACT-AUTO-REPLY-V1` — 문의자 접수 확인 자동 회신.
2. `WO-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1` — Neture/KPA ↔ ContactInquiry 통합.
3. `WO-O4O-SERVICE-CONTACT-SETTINGS-ENHANCEMENT-V1` — 문의 유형/안내 문구/자동응답/수신자 그룹 고도화.
- (운영) 실제 운영 수신자 등록은 사용자가 확인한 주소로 GP/KCos 문의 설정에서 ON.
- (선택) `notification_status` 의 `email:fail` vs `noprovider` 구분 정밀화 — 현 ENV 구성 환경에선 미발생(저우선).

*Date: 2026-06-12 · WO-O4O-CONTACT-EMAIL-NOTIFICATION-V1 · 운영 SMTP provider 구성 확인 + GP/KCos 실제 발송 실증(email:sent). 코드/migration 0, secret 미기록, Neture/KPA 무변경.*
