# CHECK-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1

> **WO:** [WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1](../work-orders/WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1.md)
> **선행:** [IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1](../investigations/IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1.md) · [WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1](../work-orders/WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1.md)
> **작성일:** 2026-06-13
> **상태:** ✅ **완료** — 구현 + 정적 검증 + 배포 + 마이그레이션 + 프로덕션 smoke(API 레벨) 전부 PASS.

## 1. 목적
Neture/KPA 공개 Contact form에 개인정보 수집·이용 동의 추가 + Neture IP 원문 → SHA256 hash 전환. IR §7 주의신호 ①②. ContactInquiry 이관 없이 기존 구조 유지.

## 2. 선행/Option D 반영
설정 adapter WO(email·자동회신·Admin 설정) 위에, 개인정보 동의·IP 최소수집만 추가. 저장소·route·운영 UI 불변.

## 3. Neture 개인정보 동의 추가
- Frontend `ContactPage.tsx`: 동의 체크박스 + `/privacy` 링크, 미동의 시 제출 차단(버튼 비활성 + message), payload `privacyConsent`.
- `lib/api/contact.ts`: `ContactFormData.privacyConsent` 추가.

## 4. KPA 개인정보 동의 추가
- Frontend `ContactModal.tsx`: 동의 체크박스 + `/privacy` 링크, 미동의 차단, payload `privacyConsent`.
- `api/contactRequest.ts`: `ContactRequestPayload.privacyConsent` 추가.

## 5. Backend validation
- Neture `contact.controller.ts`: `privacyConsent !== true` → 400 `PRIVACY_CONSENT_REQUIRED` (저장·알림 없음).
- KPA `contact-request.controller.ts`: 동일 가드(저장 전 early return).

## 6. Neture IP hash 전환
- 신규 저장: `ipAddress: null` + `ipHash = sha256(ip)`. `privacyConsent: true` 저장.
- legacy `ipAddress` 컬럼 보존(drop 안 함, 후속 cleanup WO 대상).

## 7. Migration
- `20261109000000-AddContactPrivacyConsentNetureKpa.ts` (additive, idempotent):
  - `neture_contact_messages."ipHash"` VARCHAR(64) NULL
  - `neture_contact_messages."privacyConsent"` BOOLEAN DEFAULT false
  - `contact_requests.privacy_consent` BOOLEAN DEFAULT false
- 적용 확인: `[X] 542 AddContactPrivacyConsentNetureKpa20261109000000`.

## 8. 기존 구조 유지
Neture `POST /neture/contact`·`/admin/contact-messages`·`/operator/contact-messages`, KPA `POST /api/v1/kpa/contact-requests`·`/operator/collaboration-requests` 전부 유지. ContactInquiry 미이관.

## 9~10. email/autoreply · in-app 알림 회귀
- smoke에서 두 서비스 모두 `notification_status: inapp:sent;email:off;autoreply:off` 확인(설정 off라 email/autoreply off, in-app 정상 sent). 기존 알림 경로 회귀 없음. (email/autoreply ON 동작은 설정 adapter WO smoke에서 sent 확인 완료.)

## 11~12. GP/KCos 미수정 · ContactInquiry 미사용
- 커밋 9파일 모두 neture/kpa/api-server — GP/KCos 0건. ContactInquiry 미사용.

## 13. 정적 검증
| 대상 | 결과 |
|------|------|
| api-server `tsc --noEmit` | ✅ 0 errors |
| web-neture `tsc --noEmit` | ✅ 0 errors |
| web-kpa-society `tsc --noEmit` | ✅ 0 errors |

## 14. Neture smoke — ✅ PASS (API 레벨, prod)
| 단계 | 결과 |
|------|------|
| 동의 없이 submit | ✅ HTTP **400 `PRIVACY_CONSENT_REQUIRED`** (저장·알림 없음) |
| 동의 후 submit | ✅ HTTP 201, id `ed63ed21…` |
| `privacyConsent` 저장 | ✅ `true` |
| `ipHash` 저장 | ✅ 64자 SHA256 (`1d2b7d81…`) |
| `ipAddress`(원문) | ✅ **null** (원문 미저장) |
| 기존 in-app 알림 | ✅ `inapp:sent;email:off;autoreply:off` (회귀 없음) |

## 15. KPA smoke — ✅ PASS (API 레벨, prod)
| 단계 | 결과 |
|------|------|
| 동의 없이 submit | ✅ HTTP **400 `PRIVACY_CONSENT_REQUIRED`** |
| 동의 후 submit | ✅ HTTP 201, id `08fd6c24…` |
| `privacy_consent` 저장 | ✅ `true` |
| 기존 in-app 알림 | ✅ `inapp:sent;email:off;autoreply:off` |

> **UI 시각 렌더 보류:** Playwright 브라우저가 병렬 세션 점유로 잠겨 동의 체크박스 시각 확인 보류. 백엔드 가드(400)·저장 결과 API 검증 완료 + web deploy 성공. 브라우저 가용 시 1회 확인 권장.

## 16. 테스트 문의 처리
- Neture `ed63ed21…` → resolved. KPA `08fd6c24…` → done. (미동의 테스트는 400으로 저장 안 됨 — 잔재 없음.)

## 17. 배포 결과
| 대상 | 결과 |
|------|------|
| API Server | ✅ success (tip `e4a9edef1`, 내 커밋 `953c69597` ancestor 포함) |
| 마이그레이션 | ✅ `[X] 542 AddContactPrivacyConsentNetureKpa20261109000000` |
| web-neture | ✅ success (`workflow_dispatch service=neture` — detect-changes skip 우회) |
| web-kpa-society | ✅ success (docker tip deploy 동승) |
| GP/KCos | 이 변경으로 미배포(범위 외) |

## 18. Commit
- 코드 9파일: `953c69597`. WO 문서: `43c34bc2b`. 본 CHECK: 별도 path-specific commit.

---
*End of CHECK-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1*
