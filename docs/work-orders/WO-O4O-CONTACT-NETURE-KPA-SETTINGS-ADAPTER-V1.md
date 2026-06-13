# WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1

> **유형:** 구현 (Option D — 설정/알림 표준화)
> **선행 IR:** [IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1](../investigations/IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1.md)
> **작성일:** 2026-06-13
> **CHECK 산출물:** `docs/checks/CHECK-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1.md`

---

## 1. 목적

Neture와 KPA Society의 기존 Contact 구조는 유지하되, GP/KCos의 `ServiceContactSettings` 기반 문의 알림 설정을 연결한다.

선행 IR 결과, Neture/KPA는 깨지기 쉬운 레거시 폼이 아니라 이미 다음을 갖춘 정상 작동 구조다.

- DB 저장
- in-app `contact.new` 알림
- 운영자 문의 관리 UI

다만 GP/KCos 대비 아래 3가지가 없다.

1. 운영자 이메일 알림
2. 문의자 자동 회신
3. Admin 문의 수신자·문구 설정

이번 작업은 IR 권고의 **Option D — 설정/알림 표준화**를 구현한다.

## 2. 핵심 원칙

1. Neture/KPA 기존 **저장소를 변경하지 않는다.**
2. Neture/KPA 기존 **공개 submit route를 변경하지 않는다.**
3. Neture/KPA 기존 **운영자 문의 관리 UI를 교체하지 않는다.**
4. `ContactInquiry`로 **이관하지 않는다.**
5. `ServiceContactSettings`를 `neture`, `kpa-society`에도 적용한다.
6. 운영자 이메일 알림과 문의자 자동 회신만 기존 submit 흐름에 **adapter 방식**으로 추가한다.
7. **실패해도 문의 접수는 성공**해야 한다 (best-effort).
8. 개인정보 동의와 Neture IP hash 전환은 후속 WO로 분리한다.

## 3. 작업 대상

- 서비스: Neture, KPA Society
- 수정 후보: `apps/api-server`, `services/web-neture`, `services/web-kpa-society`, 필요 시 `packages/operator-core-ui`, CHECK 문서

## 4. 제외 대상 (이번 작업에서 하지 않음)

1. `ContactInquiry`로 Neture/KPA 문의 저장소 이관
2. `neture_contact_messages` 제거/변경
3. `contact_requests` 제거/변경
4. Neture `/neture/contact` route 변경
5. KPA `/api/v1/kpa/contact-requests` route 변경
6. Neture/KPA 공개 Contact form 대규모 교체
7. Neture/KPA 문의 관리 UI 교체
8. Neture/KPA 기존 in-app 알림 제거
9. 개인정보 동의 UI 추가
10. Neture IP 원문 저장 → hash 전환
11. GP/KCos Contact 구조 수정
12. 법정정보/약관/푸터 수정

> 개인정보 동의 + Neture IP hash 전환은 후속 `WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1`에서 처리.

## 5. 선행 작업 반영

`IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1`, `WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1`, `WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1`, `WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1`, `WO-O4O-CONTACT-EMAIL-NOTIFICATION-V1`, `WO-O4O-CONTACT-AUTO-REPLY-V1`

## 6. 현재 기준선

### 6.1 Neture
- 공개 route `/contact` · submit `POST /neture/contact` · 저장소 `neture_contact_messages` (entity `NetureContactMessage`)
- 알림 in-app `contact.new` · Admin UI `/admin/contact-messages` · Operator UI `/operator/contact-messages`
- 이메일 알림/자동 회신/Contact 설정 Admin: **없음**

### 6.2 KPA Society
- 공개 route `/contact` · submit `POST /api/v1/kpa/contact-requests` · 저장소 `contact_requests` (entity `ContactRequest`, `service_key=kpa-society`)
- 알림 in-app `contact.new` · Operator UI `/operator/collaboration-requests`
- 이메일 알림/자동 회신/Contact 설정 Admin: **없음**

## 7. 구현 방향

### 7.1 ServiceContactSettings 확장
대상 serviceKey: `neture`, `kpa-society`
1. 현재 `ServiceContactSettings` serviceKey whitelist가 GP/KCos로 제한되어 있는지 확인
2. 제한되어 있으면 Neture/KPA 추가
3. row 없을 때 기본값 병합 정책 그대로 사용
4. **seed 넣지 않음**
5. **이메일 수신자 하드코딩 금지**

기본값: in-app=기존 유지, 이메일 알림=OFF, 자동 회신=OFF, recipientEmails=empty

### 7.2 Admin 설정 화면 연결
- 권장 route `/admin/settings/contact` · 메뉴명 "문의 설정"
1. GP/KCos `ServiceContactSettingsPage` 재사용
2. Neture wrapper `serviceKey='neture'`
3. KPA wrapper `serviceKey='kpa-society'`
4. 메뉴는 **Admin 설정 영역**에 둠
5. 일반 Operator 메뉴에 신규 설정 화면 노출 금지

> KPA 기존 문의 관리는 `/operator/collaboration-requests`에 그대로 남김. 이번엔 설정 화면만 Admin 영역에 추가.

### 7.3 Neture submit adapter
현재: `POST /neture/contact` → `neture_contact_messages` 저장 → in-app `contact.new`
추가: → `ServiceContactSettings(neture)` 조회 → `emailNotificationEnabled`+`recipientEmails` 있으면 운영자 이메일 발송 → `autoReplyEnabled`이면 문의자 자동 회신 발송 → 발송 결과 기록
> 기존 in-app 알림 제거하지 않음.

### 7.4 KPA submit adapter
현재: `POST /api/v1/kpa/contact-requests` → `contact_requests` 저장 → in-app `contact.new`
추가: → `ServiceContactSettings(kpa-society)` 조회 → 동일 (운영자 이메일 + 자동 회신 + 결과 기록)
> 기존 in-app 알림 제거하지 않음.

## 8. notification_status 처리

Neture/KPA 기존 테이블에는 GP/KCos의 `notification_status`가 없다.

- **옵션 1 (권장):** additive migration으로 컬럼 추가 (`neture_contact_messages.notification_status`, `contact_requests.notification_status`). 운영 추적 가능, 기존 데이터 무영향.
- 옵션 2: 로그만 — DB 변경 최소이나 운영 화면에서 상태 확인 어려움.

**권장: 옵션 1 (additive only).**

상태 문자열 예:
```txt
inapp:sent;email:sent;autoreply:sent
inapp:sent;email:off;autoreply:off
inapp:sent;email:norecipient;autoreply:off
inapp:sent;email:fail;autoreply:sent
```

## 9. 이메일 알림 기준 (GP/KCos와 동일 원칙)

1. 수신자는 `ServiceContactSettings.recipientEmails`에서만 가져온다 (하드코딩 금지)
2. `emailNotificationEnabled=false`이면 발송하지 않는다
3. 수신자가 없으면 발송하지 않는다
4. SMTP 실패가 문의 접수 실패가 되면 안 된다
5. 발송 결과는 best-effort로 기록한다
6. 문의 내용은 HTML escape 후 메일에 포함한다

권장 제목: `[Neture] 새 문의가 접수되었습니다` / `[KPA Society] 새 문의가 접수되었습니다` (또는 서비스 표시명 기준)

## 10. 자동 회신 기준 (GP/KCos와 동일 원칙)

1. `autoReplyEnabled=true`일 때만 발송
2. `autoReplySubject`, `autoReplyMessage`가 있어야 함
3. 문의자 이메일로만 발송
4. 운영자 수신자와 문의자 이메일을 혼동하지 않음
5. 실패해도 문의 접수는 성공
6. 자동 회신은 "답변"이 아니라 "접수 확인"

> 기본 문구 seed 금지. Admin 입력 문구만 사용. row 없으면 자동 회신 OFF.

## 11. 개인정보/보안 기준

1. 공개 API에서 `recipientEmails` 노출 금지
2. Admin 설정 API는 Admin 권한만 허용
3. 이메일 본문 HTML escape
4. 메일 header injection 방어
5. secret/env 값 문서 기록 금지
6. 문의 전문을 서버 로그에 과도하게 남기지 않음
7. Neture/KPA 개인정보 동의 추가는 이번 작업 외 — CHECK에 후속 명시
8. Neture IP hash 전환은 이번 작업 외 — CHECK에 후속 명시

## 12. 권한 기준

### 12.1 Neture
- Admin 설정 화면: Neture admin 권한
- 기존 문의 관리(Admin `/admin/contact-messages`, Operator `/operator/contact-messages`) 권한 변경하지 않음

### 12.2 KPA Society
- Admin 설정 화면: KPA admin(또는 기존 서비스 admin) 권한 확인 후 적용
- 기존 문의 관리(Operator `/operator/collaboration-requests`) 권한 변경하지 않음

> KPA에 Admin 설정 라우트/레이아웃이 없거나 불명확하면 무리하게 만들지 말고 **CHECK에 blocker로 기록**. 기존 KPA Admin 영역이 있으면 GP/KCos 패턴에 맞춰 추가.

## 13. 검증 기준

1. Neture Admin 문의 설정 화면 접근 가능
2. KPA Admin 문의 설정 화면 접근 가능
3. Neture 설정 저장 가능
4. KPA 설정 저장 가능
5. 이메일 OFF → 기존처럼 in-app만 동작
6. 이메일 ON + 수신자 있음 → 운영자 이메일 발송
7. 자동 회신 OFF → 문의자에게 안 보냄
8. 자동 회신 ON → 문의자에게 접수 확인 메일
9. Neture `/neture/contact` route 유지
10. KPA `/api/v1/kpa/contact-requests` route 유지
11. Neture 기존 Admin/Operator 문의 관리 UI 유지
12. KPA 기존 Operator 문의 관리 UI 유지
13. GP/KCos 미수정
14. ContactInquiry로 이관하지 않음
15. backend TypeScript 검증 통과
16. Neture/KPA web TypeScript 검증 통과
17. migration이 있으면 additive이며 적용 검증
18. 브라우저 smoke test 수행

## 14. Smoke 기준

### 14.1 Neture
URL: `https://neture.co.kr/admin/settings/contact`, `/contact`, `/admin/contact-messages`
절차: ① Admin 설정 화면 렌더 ② 이메일 ON + 테스트 수신자 저장 ③ 자동 회신 ON + 제목/본문 저장 ④ `/contact` 테스트 제출 ⑤ Admin 문의 목록 확인 ⑥ 이메일 도착 확인 ⑦ 자동 회신 도착 확인 ⑧ notification_status 기록 확인(가능 시) ⑨ 테스트 문의 상태 처리 ⑩ 설정 OFF/수신자 제거로 복구

### 14.2 KPA Society
URL: `https://kpa-society.co.kr/admin/settings/contact`, `/contact`, `/operator/collaboration-requests`
절차: Neture와 동일. 단 KPA Admin 설정 route가 없으면 실제 존재하는 Admin 설정 IA 기준으로 확인.

## 15. 배포 기준

- backend 변경 시 API Server 배포
- Neture/KPA web 변경 시 각각 배포

> ⚠️ Cloud Run Deploy Web Services가 success여도 detect-changes가 push tip 기준으로 skip될 수 있다. web 변경 시 라이브 번들 반영 여부를 브라우저에서 확인하고, 필요 시 `workflow_dispatch`로 대상 서비스만 재배포한다.

## 16. staged 파일 가드

commit 전 반드시 `git diff --cached --name-only` 확인.

허용 경로: `apps/api-server/**`, `services/web-neture/**`, `services/web-kpa-society/**`, `packages/**`, `docs/checks/CHECK-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1.md`, `docs/work-orders/WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1.md`

**금지 경로:** `services/web-glycopharm/**`, `services/web-k-cosmetics/**` (GP/KCos는 범위 외)

commit은 반드시 **명시 경로** 사용:
```bash
git commit -m "feat(contact): add settings adapter for Neture and KPA" -- \
  apps/api-server/<수정파일> services/web-neture/<수정파일> \
  services/web-kpa-society/<수정파일> packages/<수정파일> \
  docs/checks/CHECK-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1.md
```

## 17. CHECK 문서

완료 후 `docs/checks/CHECK-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1.md` 생성. 기록 항목: ① 목적 ② 선행 IR 반영 ③ Option D 적용 확인 ④ Neture 기존 저장소/route/UI 유지 ⑤ KPA 기존 저장소/route/UI 유지 ⑥ ServiceContactSettings 확장 ⑦ Admin 설정 화면 추가 ⑧ 운영자 이메일 알림 연결 ⑨ 문의자 자동 회신 연결 ⑩ notification_status 처리 ⑪ migration 여부 ⑫ Neture smoke ⑬ KPA smoke ⑭ 테스트 설정 복구 ⑮ 테스트 문의 처리 ⑯ GP/KCos 미수정 ⑰ 개인정보 동의/IP hash 후속 분리 ⑱ 검증 결과 ⑲ 배포 결과 ⑳ commit hash

## 18. 후속 작업

1. `WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1` — 공개 폼 개인정보 동의 + Neture IP hash 전환
2. `WO-O4O-CONTACT-NETURE-MIGRATION-TO-CONTACT-INQUIRY-V1` — (필요 시) Neture `ContactInquiry` 이관
3. `WO-O4O-CONTACT-KPA-MIGRATION-TO-CONTACT-INQUIRY-V1` — (필요 시) KPA `ContactInquiry` 이관

> 이 작업은 "통합"이 아니라 **기존 구조 위에 알림/설정만 붙이는 adapter 작업**이다.

---

*End of WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1*
