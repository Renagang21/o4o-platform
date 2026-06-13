# CHECK-O4O-CONTACT-NETURE-LEGACY-IP-CLEANUP-V1

> **WO:** [WO-O4O-CONTACT-NETURE-LEGACY-IP-CLEANUP-V1](../work-orders/WO-O4O-CONTACT-NETURE-LEGACY-IP-CLEANUP-V1.md)
> **선행:** [WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1](../work-orders/WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1.md)
> **작성일:** 2026-06-13
> **상태:** ✅ **완료** — migration 적용 + end-state 검증(raw ipAddress 0) + 신규 submit 회귀 없음.

## 1. 목적
`neture_contact_messages` legacy `ipAddress` 원문 데이터 정리(null화 + 가능 시 ipHash 백필). 신규 경로는 이미 ipHash 기준. 기능 추가 아님 — 개인정보 원문 제거.

## 2. 선행 privacy-consent WO 반영
신규 submit은 `ipAddress=null`+`ipHash=sha256`. 이번은 기존 row의 원문 정리만.

## 3. 사전 데이터 count
- 정리 후 전체 `neture_contact_messages` row = 4 (신규 smoke 1건 추가 후 5). **migration console.log 카운트는 Cloud Logging 미surface(known issue)** 라 before 정확값은 로그 미확보 — 대신 migration 적용(`[X] 543`) + end-state(raw ipAddress=0)로 검증.
- (현 단계 disposable 데이터, row 소수. 정리 후 raw IP 보유 row 0.)

## 4. migration 방식
`20261110000000-CleanupNetureContactLegacyIpAddress.ts` (migration 전용):
- 테이블/컬럼 존재 가드.
- pgcrypto `digest` probe via `pg_proc`(함수 직접 호출 없이 — 트랜잭션 poison 방지).
- `ipAddress IS NOT NULL` row: digest 가용 시 `ipHash` 빈 row에 `encode(digest("ipAddress",'sha256'),'hex')` 백필(Option A) → 이후 `ipAddress=NULL`. digest 불가 시 null화만(Option C).
- row 삭제 없음, 컬럼 drop 없음, seed 없음.
- **down: no-op** (일방향 hash, 원문 복구 불가 — 주석 명시).

## 5. 원문 IP 미기록 확인
- migration은 **카운트만 로깅**(`[IP-CLEANUP] before/after`), 원문 IP 값 미출력.
- 본 CHECK·커밋·smoke 어디에도 원문 IP 값 미기재. 검증 시 `ipHash` 길이(64)만 확인.

## 6. legacy row 처리 결과
- 정리 후 `ipAddress IS NOT NULL` row = **0** (admin API 전수 확인, total 4건 중 0건).
- `ipHash` 보유 row 존재(신규 submit + 백필분).

## 7. 기존 row 수 보존
- row 삭제 0. 정리 전후 total 동일(이후 smoke 1건만 증가). DELETE 없음.

## 8. 신규 submit 검증
- `/contact` 동의 후 submit → **201** (id `f79f182c…`).
- 신규 row: `ipAddress=null`, `ipHash` **64자**, `privacyConsent=true`. 회귀 없음.

## 9. Admin/Operator UI 회귀
- admin API 목록/상세 정상(전수 조회). operator API는 ipAddress SELECT 제외(불변). frontend 미수정.

## 10. email/autoreply/in-app 회귀
- 신규 submit 정상 접수. 알림 경로 미변경(이번 작업 backend migration only). 회귀 없음.

## 11. KPA/GP/KCos 미수정
- 커밋 파일: WO 문서 + migration 1개. `services/web-*` 0건. KPA/GP/KCos 미수정.

## 12. ContactInquiry 미사용
- Neture 기존 `neture_contact_messages` 유지. ContactInquiry 미이관.

## 13. 검증
- backend `tsc --noEmit` ✅ 0 errors.
- migration 적용 `[X] 543 CleanupNetureContactLegacyIpAddress20261110000000` ✅.
- raw `ipAddress` 정리 후 0 ✅ · row 수 보존 ✅ · 신규 submit `ipAddress=null`/`ipHash=64`/`privacyConsent=true` ✅.
- migration additive/safe(row 삭제·컬럼 drop 없음) ✅ · 원문 IP 미기록 ✅.

## 14. 배포/migration
- Deploy API Server ✅ success (`6144c39f6`). migration job: `[X] 543` 적용. web 변경 없음 → web 배포 불요.

## 15. Commit
- WO 문서: `ea1dbaa53` 이후 커밋(WO). migration: `6144c39f6`. 본 CHECK: 별도 path-specific commit.

## 16. 후속
1. `WO-O4O-CONTACT-NETURE-IPADDRESS-COLUMN-DROP-V1` — legacy `ipAddress` 컬럼 제거 검토
2. `WO-O4O-CONTACT-NETURE-MIGRATION-TO-CONTACT-INQUIRY-V1` (필요 시)
3. `WO-O4O-CONTACT-KPA-MIGRATION-TO-CONTACT-INQUIRY-V1` (필요 시)

---
*End of CHECK-O4O-CONTACT-NETURE-LEGACY-IP-CLEANUP-V1*
