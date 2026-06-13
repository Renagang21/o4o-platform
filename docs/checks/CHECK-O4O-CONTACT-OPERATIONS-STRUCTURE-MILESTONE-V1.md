# CHECK-O4O-CONTACT-OPERATIONS-STRUCTURE-MILESTONE-V1

> **유형:** Read-only 마일스톤 (코드/DB/route/UI/API 변경 없음, 문서 1개만 생성)
> **목적:** O4O 4개 서비스(GlycoPharm / K-Cosmetics / Neture / KPA Society)의 Contact Us 운영 구조 정비 완료 상태를 하나의 마일스톤으로 고정한다.
> **작성일:** 2026-06-13
> **선행 SSOT:** [IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1](../investigations/IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1.md)

---

## 1. 목적

최근 Contact 관련 WO/IR을 통해 다음 흐름이 4서비스에 정비되었다. 본 문서는 신규 기능이 아니라 **완료 상태와 남은 선택 과제를 고정**하는 read-only 마일스톤이다.

```txt
공개 Contact 제출 → DB 저장 → 운영자 in-app 알림 → 운영자 이메일 알림
→ 문의자 자동 회신 → Admin/Operator 문의 관리 → Contact 설정 Admin
→ 개인정보 동의 → IP 원문 저장 제거
```

## 2. 작업 유형
read-only 문서 정리 · 코드/backend/API/DB/migration/frontend 수정 없음 · 배포 없음 · 문서 1개만 생성.

## 3. 산출물
`docs/checks/CHECK-O4O-CONTACT-OPERATIONS-STRUCTURE-MILESTONE-V1.md`

## 4. 정리 대상
GlycoPharm · K-Cosmetics · Neture · KPA Society

## 5. 선행 작업
- **GP/KCos 신규 구조:** DELIVERY-AND-NOTIFICATION / INQUIRY-ADMIN-MANAGEMENT / SERVICE-CONTACT-SETTINGS-ADMIN / EMAIL-NOTIFICATION / AUTO-REPLY
- **Cross-service 조사·Neture/KPA 보강:** IR-CROSSSERVICE-STANDARDIZATION / SETTINGS-ADAPTER / PRIVACY-CONSENT / LEGACY-IP-CLEANUP
- **공개 정보 마일스톤:** CHECK-O4O-PUBLIC-INFO-LEGAL-CONTACT-STRUCTURE-MILESTONE-V1

## 6. 서비스별 현재 상태 요약

| 서비스 | 저장소 | 공개 submit | 운영자 알림 | 운영자 이메일 | 자동 회신 | 관리 화면 | 설정 화면 | 동의 | IP 처리 |
|--------|--------|-------------|:------:|------|------|----------|----------|:----:|--------|
| GlycoPharm | `contact_inquiries` | `/api/v1/public/services/glycopharm/contact-inquiries` | in-app | 설정 기반 | 설정 기반 | `/admin/contact-inquiries` | `/admin/settings/contact` | 필수 | `ip_hash` |
| K-Cosmetics | `contact_inquiries` | `/api/v1/public/services/k-cosmetics/contact-inquiries` | in-app | 설정 기반 | 설정 기반 | `/admin/contact-inquiries` | `/admin/settings/contact` | 필수 | `ip_hash` |
| Neture | `neture_contact_messages` | `/neture/contact` | in-app | 설정 기반 adapter | 설정 기반 adapter | `/admin/contact-messages`, `/operator/contact-messages` | `/admin/settings/contact` | 필수 | 신규/기존 모두 원문 제거, `ipHash` |
| KPA Society | `contact_requests` | `/api/v1/kpa/contact-requests` | in-app | 설정 기반 adapter | 설정 기반 adapter | `/operator/collaboration-requests` | `/admin/settings/contact` | 필수 | IP 미저장 |

## 7. 구조적 결론
1. **GP/KCos**는 신규 `ContactInquiry` 기반 공통 구조로 운영 흐름 완성.
2. **Neture/KPA**는 기존 저장소·route·운영 UI 유지 상태에서 설정/알림/동의/개인정보 보강 완료(Option D).
3. 4서비스 모두 접수 시 운영자가 알 수 있는 구조(in-app).
4. 4서비스 모두 운영자 이메일 알림을 Admin 설정 기반으로 사용 가능.
5. 4서비스 모두 문의자 자동 회신을 Admin 설정 기반으로 사용 가능.
6. 4서비스 모두 개인정보 동의 게이트 보유.
7. Neture 신규·기존 IP 원문 저장 문제 정리 완료.
8. **ContactInquiry 전면 이관은 현 시점 필수가 아니라 선택 과제.**

## 8. 핵심 원칙 정리

### 8.1 Contact 접수
① 공개 Contact는 화면 제출에서 끝나면 안 됨 ② DB 저장 ③ 접수 실패와 알림 실패 분리 ④ 알림 실패가 접수 실패로 이어지지 않음(best-effort) ⑤ submit route는 각 서비스 기존 구조 존중.

### 8.2 알림
① in-app 알림은 기본 안전망 ② 운영자 이메일은 Admin 설정 기반 ③ 수신 이메일 하드코딩 금지 ④ 자동 회신은 "접수 확인"이지 답변 아님 ⑤ 자동 회신 실패가 접수 실패로 이어지지 않음.

### 8.3 설정
① Contact 설정은 Admin 설정 영역 ② 수신 이메일 목록 공개 노출 금지 ③ Neture/KPA 기존 운영자 문의 관리 UI 유지 ④ KPA 문의 관리는 기존 operator workflow 유지 ⑤ 서비스별 설정은 `ServiceContactSettings`로 통일.

### 8.4 개인정보
① 수집·이용 동의는 공개 제출 전 필수 ② backend도 동의 누락 거부(400) ③ IP 원문 저장 금지 ④ 필요 시 hash만 ⑤ 기존 원문 IP는 문서·로그·커밋에 미기록, count/end-state로만 검증.

## 9. 데이터 소스 정리

| 영역 | GlycoPharm | K-Cosmetics | Neture | KPA Society |
|------|-----------|-------------|--------|-------------|
| 문의 저장 | `ContactInquiry` | `ContactInquiry` | `NetureContactMessage` | `ContactRequest` |
| 설정 저장 | `ServiceContactSettings` | `ServiceContactSettings` | `ServiceContactSettings` | `ServiceContactSettings` |
| 알림 상태 | `notification_status` | `notification_status` | `notificationStatus` | `notification_status` |
| 개인정보 동의 | `privacy_consent` | `privacy_consent` | `privacyConsent` | `privacy_consent` |
| IP | `ip_hash` | `ip_hash` | `ipHash`, legacy `ipAddress`=null | 미저장 |

> 컬럼 네이밍: `contact_inquiries`/`contact_requests`/`service_contact_settings`는 snake_case, `neture_contact_messages`는 camelCase(`notificationStatus`/`privacyConsent`/`ipHash`) — 각 테이블 기존 컨벤션 유지.

## 10. 완료된 Contact WO/IR 목록

| 작업 | 목적 | commit (closing) |
|------|------|--------|
| `WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1` | GP/KCos 저장 + in-app 알림 | `b7db3213e` |
| `WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1` | GP/KCos 문의 Admin 관리 | `6256b50ad` |
| `WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1` | GP/KCos 문의 설정 Admin | `b3659de05` |
| `WO-O4O-CONTACT-EMAIL-NOTIFICATION-V1` | GP/KCos 운영자 이메일 알림 검증 | `442c73d78` |
| `WO-O4O-CONTACT-AUTO-REPLY-V1` | GP/KCos 문의자 자동 회신 | `649f16791` |
| `IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1` | 4서비스 Contact 구조 조사(Option D 권고) | `1bd90f986` |
| `WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1` | Neture/KPA 설정·알림 adapter | code `d8cc391bc` · CHECK `809ca1445` |
| `WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1` | Neture/KPA 동의 + Neture IP hash | code `953c69597` · CHECK `ea4068f77` |
| `WO-O4O-CONTACT-NETURE-LEGACY-IP-CLEANUP-V1` | Neture legacy IP 원문 제거 | code `6144c39f6` · CHECK `3638aa1e5` |

> GP/KCos 5건은 각 WO를 닫은 CHECK 커밋 hash. Neture/KPA 4건은 본 세션 code/CHECK 커밋.

## 11. 검증 상태 정리

### 11.1 GP/KCos (선행 WO CHECK 기준)
공개 submit 성공 · DB 저장 · in-app 알림 · 운영자 이메일 알림(`email:sent`) · 문의자 자동 회신(`autoreply:sent`) · Admin 문의 관리 · Contact 설정 저장 · 테스트 문의 spam 처리 · 테스트 수신자/설정 복구 — 각 CHECK에서 PASS.

### 11.2 Neture/KPA (본 세션 smoke 기준, API 레벨 prod)
- 기존 저장소·공개 route·운영 UI 유지 ✅
- settings adapter 적용 ✅ (`/admin/services/{neture|kpa-society}/contact-settings` GET/PUT 200)
- 운영자 email 알림 + 문의자 자동 회신 `inapp:sent;email:sent;autoreply:sent` ✅
- 개인정보 동의 누락 시 **400 `PRIVACY_CONSENT_REQUIRED`** ✅ / 동의 후 201 ✅
- Neture 신규 row `ipHash` 64자 + `ipAddress=null` ✅
- Neture legacy `ipAddress` 원문 → 정리 후 non-null **0건** ✅
- 테스트 문의 처리(resolved/done) + 설정 복구 완료 ✅

## 12. 보류/주의 사항
1. Neture/KPA `/contact` **동의 체크박스 UI 시각 렌더**는 Playwright 점유로 보류 — 브라우저 가용 시 1회 확인 권장(배포·백엔드 검증은 완료).
2. Neture/KPA `/admin/settings/contact` **UI 시각 렌더**도 API/배포 검증 완료, 필요 시 브라우저 1회 확인.
3. `neture_contact_messages.ipAddress` 컬럼은 아직 존재하나 값은 전부 null.
4. 컬럼 drop은 별도 선택 과제.
5. ContactInquiry 전면 이관은 운영상 필수 아님(선택).

## 13. 남은 선택 과제
- **`WO-O4O-CONTACT-NETURE-IPADDRESS-COLUMN-DROP-V1`** — `neture_contact_messages.ipAddress` 컬럼 제거 검토/실행. 의존 코드 완전 제거 확인. 되돌리기 어려운 schema 정리이므로 보수적 진행.
- **`WO-O4O-CONTACT-NETURE-MIGRATION-TO-CONTACT-INQUIRY-V1` / `WO-O4O-CONTACT-KPA-MIGRATION-TO-CONTACT-INQUIRY-V1`** — 저장소까지 4서비스 공통화가 필요해질 때만. 현재는 기능 가치보다 내부 표준화 성격. Neture 우선·KPA 후행.
- **`WO-O4O-CONTACT-CROSSSERVICE-ADMIN-UI-UNIFICATION-V1`** — 4서비스 문의 관리 UI 공통 Admin 통일 검토. 기존 Neture/KPA 운영 UI 유지 여부 판단 필요.

## 14. 검증 (이 마일스톤 자체)
- [x] 문서 1개만 생성 (`docs/checks/CHECK-O4O-CONTACT-OPERATIONS-STRUCTURE-MILESTONE-V1.md`)
- [x] 코드/backend/API/DB/migration/frontend 변경 없음 (read-only)
- [x] 4서비스 Contact 운영 구조 한눈 정리 (§6·§9)
- [x] GP/KCos vs Neture/KPA 구조 차이 명확 (§7)
- [x] 완료 WO/IR 목록 + commit hash (§10)
- [x] 개인정보 동의/IP 처리 완료 상태 (§11)
- [x] 남은 선택 과제 분리 (§13)
- [x] ContactInquiry 이관 = 선택임 명시 (§7-8·§13)
- [x] path-specific commit

---

*End of CHECK-O4O-CONTACT-OPERATIONS-STRUCTURE-MILESTONE-V1*
