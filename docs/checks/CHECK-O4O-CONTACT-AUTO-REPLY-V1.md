# CHECK-O4O-CONTACT-AUTO-REPLY-V1

> **작업명:** WO-O4O-CONTACT-AUTO-REPLY-V1
> **유형:** GP/KCos Contact 문의자 **접수 확인 자동 회신** 메일 + Admin 설정(ON/OFF·제목·본문). `ServiceContactSettings` 확장.
> **결과: PASS** (api-server tsc 0 / GP·KCos tsc 0 / 배포 success / GP·KCos 자동 회신 실증 `inapp:sent;email:off;autoreply:sent`). — 2026-06-12
> 선행: `WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1` · `WO-O4O-CONTACT-EMAIL-NOTIFICATION-V1` 외 contact 계열.

---

## 1. 작업 목적
GP/KCos 문의 접수 시 **문의자 이메일**로 "접수 확인" 자동 회신을 발송. 운영자 알림과 구분(문의자에게만). Admin 에서 ON/OFF·제목·본문 관리. 답변/처리완료 아님.

## 2. 선행 반영
- submit → `ContactInquiry` 저장 + in-app/운영자 email 알림 + SMTP 발송 운영 검증(EMAIL_SERVICE_ENABLED=true, ENV provider) 위에, **문의자 자동 회신** 채널 추가.

## 3. ServiceContactSettings 확장
- 컬럼 추가: `auto_reply_enabled`(bool default false) · `auto_reply_subject`(text null) · `auto_reply_message`(text null) · `auto_reply_include_original`(bool default false). 헬퍼 effective 병합(row 없으면 OFF).

## 4. migration
- `20261107000000-AddContactAutoReply.ts` — additive·idempotent(컬럼 존재 검사) ADD 4 + `contact_inquiries.notification_status` **varchar(40)→(100)** 확장(복합 상태 `inapp;email;autoreply` 수용). down: 컬럼 drop + 길이 원복. **seed 없음**.

## 5. Admin UI 추가
- 공통 `ServiceContactSettingsPage` 에 **"자동 회신 설정"** 섹션: 사용 토글 + 제목 input + 본문 textarea + 문의 내용 요약 포함 토글 + 안내 문구("답변/처리완료 아님", "발송 실패해도 접수 유지"). GP/KCos wrapper **무변경**(pass-through).

## 6. 자동 회신 ON/OFF 처리
- 설정 `autoReplyEnabled` true + 제목·본문 존재 + 문의자 이메일 유효 시에만 발송. OFF/미설정이면 발송 안 함(`autoreply:off`).

## 7. 제목/본문 저장 방식
- plain text 저장(제목 ≤300, 본문 ≤5000 slice). 백엔드 검증: ON 인데 제목/본문 비면 400. 프론트도 동일 사전 검증. 발송 시 **HTML escape**.

## 8. Contact submit 연동
- 순서: validation → 저장 → settings 조회 → in-app → 운영자 email → **자동 회신**(문의자 `cleanEmail` 에게 best-effort) → 복합 status 기록 → 201. 자동 회신 본문 = 설정 본문 + 접수 요약(서비스/유형/제목/시각) + (옵션)문의 전문. `to: cleanEmail`(운영자 수신자와 분리).

## 9. notificationStatus 결과
- 복합: `inapp:<x>;email:<y>;autoreply:<z>` (varchar(100)). autoreply ∈ `sent|off|noemail|noprovider|fail`. 예: `inapp:sent;email:off;autoreply:sent`.

## 10·11. GP / KCos 테스트 (2026-06-12, 배포 826fd6ade)
- **GP** `glycopharm.co.kr/admin/settings/contact`: "자동 회신 설정" 섹션 노출 → 제목/본문 입력 + 자동 회신 ON 저장 → 공개 API 제출(문의자 이메일) → 문의 상세 **알림 상태 `inapp:sent;email:off;autoreply:sent`** ✅ → 테스트 문의 spam → 자동 회신 OFF 복구 ✅
- **KCos** `www.k-cosmetics.site/admin/settings/contact`: 동일(serviceKey k-cosmetics) → **`inapp:sent;email:off;autoreply:sent`** ✅ → spam → OFF 복구 ✅

## 12. 실제 메일 도착 여부
- 자동 회신 수신자 = 문의자 이메일. 테스트는 **사용자 SSOT 테스트 계정 `sohae2100@gmail.com`** 을 문의자로 제출 → `autoreply:sent`(SMTP 수락)까지 실증. 최종 inbox 도착 확인은 사용자 inbox(메일 2건: GP/KCos 각 1건, 제목 `[GlycoPharm]`/`[K-Cosmetics] 문의가 접수되었습니다`).

## 13. 테스트 설정 복구 / 14. 테스트 문의 처리
- GP·KCos 모두 **자동 회신 OFF 로 복구**(운영 clean). 테스트 문의 2건 → **spam 처리**(hard delete 없음).

## 15. 운영자 알림 회귀
- in-app/운영자 email 블록 무변경(자동 회신은 뒤에 append). 복합 status 의 inapp/email 부분 보존.

## 16. Neture/KPA 미수정
- `services/web-neture`·`services/web-kpa-society` 0건. backend 화이트리스트(glycopharm/k-cosmetics) 유지.

## 17. 보안/개인정보
- 자동 회신은 **문의자에게만**(`to: cleanEmail`), 운영자 수신자 미혼입. 제목/본문 HTML escape. 설정 본문은 admin-only(공개 API 미노출 — public contact 컨트롤러는 settings 의 autoReply 필드를 응답에 넣지 않음). 로그에 secret/문의 전문 미기록.

## 18. 검증 결과
- tsc: api-server 0 / web-glycopharm 0 / web-k-cosmetics 0 ✅
- migration: additive 1(컬럼 4 + 길이 확장), seed 없음. CI/CD 자동 적용.

## 19. 배포 결과
- api-server deploy success(마이그레이션 `20261107000000-AddContactAutoReply` 자동 적용). web: GP/KCos deploy success.
- **부수 장애 해결**: GP/KCos web 빌드가 forum write parity 커밋(`83a32c507`)이 `@o4o/forum-core/utils` 를 ForumWritePage 에 도입했으나 GP/KCos Dockerfile 이 forum-core 를 COPY/빌드하지 않아 실패(`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` → rollup unresolved import). KPA/neture 패턴대로 **GP/KCos Dockerfile 에 organization-core + forum-core COPY/빌드 추가**(`efb26a4c9`)하여 복구. 본 WO 무관 회귀였으나 web 배포 차단 해소 위해 동반 수정.

## 20. commit hash
- 구현/문서: `826fd6ade` (feat(contact): inquirer auto-reply for GP/KCos)
- 빌드 복구: `efb26a4c9` (fix(web): forum-core+organization-core Docker build for GP/KCos)
- smoke 반영: 본 갱신 커밋(아래)

---

## 후속
1. `WO-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1` — Neture/KPA ↔ ContactInquiry 통합.
2. `WO-O4O-SERVICE-CONTACT-SETTINGS-ENHANCEMENT-V1` — 유형/문구/수신자 그룹/SLA 고도화.
3. `WO-O4O-CONTACT-THREAD-REPLY-V1` — Admin 에서 문의자 실제 답변 발송.

*Date: 2026-06-12 · WO-O4O-CONTACT-AUTO-REPLY-V1 · 문의자 접수 확인 자동 회신 + Admin 설정. migration 1(additive), Neture/KPA·공개폼·운영자 알림 무변경.*
