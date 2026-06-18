# CHECK-O4O-NETURE-SUPPLIER-SIGNUP-REQUIRED-FIELDS-GATE-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-SIGNUP-REQUIRED-FIELDS-GATE-V1
> **유형:** 배포 후 라이브 스모크 — Neture 공급자 가입신청 필수항목 백엔드 게이트 검증
> **결과: PASS — 배포 리비전에서 필수 누락 400(missingFields) / 정상 게이트 통과 / 다른 역할 무영향 모두 확인. DB 무기록 스모크.**
> 선행: IR-O4O-NETURE-SUPPLIER-SIGNUP-REQUIRED-FIELDS-AUDIT-V1 · 구현 커밋 `a2ba3d779`

## 1. 배포

- main push `a2ba3d779` → Deploy API Server (Cloud Run) **success** (run 27730632206, exit 0).
- 대상 엔드포인트: `POST /api/v1/auth/register` (o4o-core-api).

## 2. 스모크 결과

| # | 케이스 | 기대 | 실측 | 판정 |
|---|--------|------|------|------|
| 1 | supplier, `businessAddress` 누락 | 400 `NETURE_SUPPLIER_REQUIRED_FIELDS_MISSING` | HTTP 400, `missingFields:["businessAddress"]` | ✅ |
| 1b | supplier, 다중 누락 + `managerPhone` 9자리 | 400, missingFields 다중 | HTTP 400, `["representativeName","contactName","managerPhone","businessAddress"]` | ✅ |
| 2 | supplier, 전 항목 입력 + 기존 멤버 이메일 | 게이트 통과 → 409 | HTTP 409 `SERVICE_ALREADY_JOINED` | ✅ |
| 3 | `role=partner` (다른 역할) | 게이트 미적용 | HTTP 409 (게이트 무통과·기존 흐름) | ✅ |

해석:
- **게이트 작동**: supplier 필수 5항목 누락 시 400 + 누락 필드 목록 정확.
- **연락처 검증**: `managerPhone` 숫자 10자리 미만 → 누락 처리(1b).
- **오탐 없음**: 전 항목 입력 시 게이트 통과(409는 기존 멤버십 중복 — 게이트 무관).
- **역할 격리**: `partner` 등 비-supplier 역할은 게이트 미적용 → 기존 가입 흐름 유지.

## 3. 비파괴 검증 설계

- 게이트는 existing-user 조회 **이전**에 실행 → Test 1/1b 는 어떤 이메일이든 DB 무기록.
- Test 2/3 은 기존 Neture 멤버 이메일(`sohae21@naver.com`) 사용 → 게이트 통과 후 409 로 종료, **신규 row 미생성**.
- 따라서 본 스모크는 프로덕션 데이터 무변경.

## 4. 미수행(선택)

- 진짜 신규 이메일 201 가입 — pending row 가 프로덕션에 영속되므로 미수행. 게이트 통과는 Test 2(409)로 동등 증명됨.
- 브라우저 UX(amber 누락 안내) — 프론트 빌드 배포 후 수동 확인 권장(선택). 코드 정합은 type-check 통과로 확인됨.
- `BulkResultModal` 빈 results 방어 — 운영자 일괄처리 화면에서 후속 관찰(선택, 비핵심).

## 5. 결론

핵심 백엔드 가입 게이트 PASS. WO-O4O-NETURE-SUPPLIER-SIGNUP-REQUIRED-FIELDS-GATE-V1 **완전 종료**.

---

*Date: 2026-06-18 · CHECK · PASS · /auth/register supplier 필수 게이트 400/missingFields 확인 · 정상 통과·역할 격리 확인 · DB 무기록 스모크 · 구현 a2ba3d779.*
