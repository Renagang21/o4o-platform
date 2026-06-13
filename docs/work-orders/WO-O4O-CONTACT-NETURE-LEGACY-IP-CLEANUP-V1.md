# WO-O4O-CONTACT-NETURE-LEGACY-IP-CLEANUP-V1

> **유형:** 데이터 정리 (legacy IP 원문 제거) — migration 전용
> **선행:** [WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1](WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1.md), [IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1](../investigations/IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1.md)
> **작성일:** 2026-06-13
> **CHECK 산출물:** `docs/checks/CHECK-O4O-CONTACT-NETURE-LEGACY-IP-CLEANUP-V1.md`

---

## 1. 목적
`neture_contact_messages`의 legacy `ipAddress` 원문 데이터를 정리한다. 신규 submit은 이미 `ipHash`(SHA256) 기준(선행 privacy-consent WO). 이번 작업은 신규 경로가 아니라 **기존 row의 IP 원문 정리 migration**.

## 2. 핵심 원칙
1. 신규 저장 경로(`ipHash` 기준) 미변경
2. legacy `ipAddress` 원문은 최소수집 원칙대로 정리(null화 + 가능 시 hash 백필)
3. 문의 row 삭제 금지
4. message/status/adminNotes/notificationStatus 등 운영 데이터 보존
5. 원문 IP를 공개·Admin 화면·로그·문서에 노출 금지
6. additive/safe migration
7. `ipAddress` 컬럼 drop 안 함(후속 WO)
8. Neture만 대상 (KPA/GP/KCos 미수정)

## 3. 작업 대상
`apps/api-server/**`(migration), CHECK 문서. (조사 결과 **frontend 미노출** → `services/web-neture` 수정 없음.)

## 4. 제외
row 삭제 / `ipAddress` 컬럼 drop / ContactInquiry 이관 / 공개 form 수정 / 문의 관리 UI 교체 / KPA·GP·KCos 수정 / email·autoreply 로직 / 법정정보·약관·푸터 / 문의 내용 마스킹.

## 5. 사전 조사 결과
- 컬럼: `neture_contact_messages."ipAddress"` VARCHAR(50) NULL, `"ipHash"` VARCHAR(64) NULL (camelCase 컨벤션).
- 신규 submit: `ipAddress=null`, `ipHash=sha256(ip)` (privacy-consent WO 배포 완료).
- **frontend ipAddress 노출 없음**: operator API는 SELECT에서 제외, admin 프론트 미렌더. → frontend/controller 수정 불요.
- app hash = Node `createHash('sha256').update(ip).digest('hex')` → DB `encode(digest(ip,'sha256'),'hex')` 와 동일 출력(pgcrypto).

## 6. 정리 정책
- `ipAddress` 있고 `ipHash` 없음 → `ipHash = sha256(ipAddress)`, `ipAddress = null`
- `ipAddress`·`ipHash` 둘 다 있음 → `ipHash` 보존, `ipAddress = null`
- `ipAddress` 없음 → 무변경
- 컬럼 drop 안 함(호환성, 후속 WO).

## 7. Migration 기준 (`20261110000000-CleanupNetureContactLegacyIpAddress.ts`)
1. `neture_contact_messages` 테이블 + `ipAddress`/`ipHash` 컬럼 존재 확인
2. pgcrypto `digest` 가용성 probe(`pg_proc` 조회 — 트랜잭션 poison 방지, 함수 직접 호출 안 함)
3. before count 로깅(IP 값 미출력)
4. `ipAddress IS NOT NULL` 처리:
   - digest 가용 → `ipHash` 비어있는 row에 `encode(digest("ipAddress",'sha256'),'hex')` 백필 (Option A)
   - `ipAddress` 전체 null화
   - digest 불가 → null화만 (Option C), 로그에 사유
5. after count 로깅(기대 0)
6. seed 없음, row 삭제 없음
7. **down: no-op** — 원문 IP는 복구 불가(일방향). 주석·CHECK 명시.

## 8. 대안 (§9)
- A: DB SHA256(pgcrypto digest) — 원문이 app 로그로 안 감, 단순. **1순위(가용 시).**
- C: 단순 null화 — 가장 안전, hash 추적 없음. **A 불가 시 fallback.**
- B: application migration — 원문을 app으로 읽어야 함(로그 위험) → 최후. **미채택.**

## 9. API/UI
- frontend IP 미노출(조사) → UI 수정 없음.
- admin API는 entity 전체 반환하나 정리 후 `ipAddress=null` → 원문 노출 0. (§10 "null이므로 영향 없음" 채택, 응답 스키마 미변경.)

## 10. Smoke
### DB(migration 로그 기반)
before `ipAddress IS NOT NULL` count → after = 0, `ipHash IS NOT NULL` count 증가(legacy 보유분), row 총수 불변.
### Contact submit 회귀
`/contact` 동의 후 submit 201 → `ipAddress=null`, `ipHash` 64자, in-app/email/autoreply 회귀 없음, `/admin/contact-messages` 조회 정상.
### UI
admin/operator 목록·상세 렌더 정상, IP 원문 노출 0, 상태 처리 정상.

## 11. 검증
legacy `ipAddress` → null · 가능 시 `ipHash` 백필 · row 수 불변 · 신규 submit 정상(`ipAddress=null`/`ipHash=64`) · 운영 UI 정상 · email/autoreply/in-app 회귀 없음 · KPA/GP/KCos 미수정 · ContactInquiry 미이관 · backend tsc · migration additive/safe · **CHECK에 원문 IP 미기록**.

## 12. 배포
backend migration 있음 → API Server 배포 + migration job 확인. web 변경 없음 → web 배포 불요.

## 13. staged 가드
허용: `apps/api-server/**`, CHECK. **금지: `services/web-{kpa-society,glycopharm,k-cosmetics}/**`.** commit 명시 경로.

## 14. CHECK 문서
`docs/checks/CHECK-O4O-CONTACT-NETURE-LEGACY-IP-CLEANUP-V1.md` — 목적·선행 반영·사전 count·migration 방식·**원문 IP 미기록 확인**·legacy 처리 결과·row 수 보존·신규 submit 검증·UI 회귀·알림 회귀·KPA/GP/KCos 미수정·ContactInquiry 미사용·검증·배포·commit hash.

## 15. 후속
1. `WO-O4O-CONTACT-NETURE-IPADDRESS-COLUMN-DROP-V1` — legacy 컬럼 제거 검토
2. `WO-O4O-CONTACT-NETURE-MIGRATION-TO-CONTACT-INQUIRY-V1` (필요 시)
3. `WO-O4O-CONTACT-KPA-MIGRATION-TO-CONTACT-INQUIRY-V1` (필요 시)

---

*End of WO-O4O-CONTACT-NETURE-LEGACY-IP-CLEANUP-V1*
