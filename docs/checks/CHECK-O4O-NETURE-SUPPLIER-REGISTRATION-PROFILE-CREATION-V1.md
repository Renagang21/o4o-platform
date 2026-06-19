# CHECK-O4O-NETURE-SUPPLIER-REGISTRATION-PROFILE-CREATION-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-REGISTRATION-PROFILE-CREATION-V1 (축소 실행)
> **유형:** backend — Neture 공급자 가입 시점 `neture_suppliers` row 즉시 생성 + 기존 누락분 백필. 2단계 승인 모델 불변.
> **결과: PASS — 가입 write-path(신규/기존 flow)에 createNetureSupplier(PENDING+org seed, 멱등) 추가, step1 무변경(존재 가드 자동 no-op), 누락 보정 idempotent migration 추가. api-server tsc 통과.**
> 선행: IR-O4O-NETURE-OPERATOR-MEMBERS-SUPPLIER-PENDING-STATE-AUDIT-V1 (2단계 모델 = 정상)

## 1. 사전 조사로 확정된 사실 (WO 전제 정정)

원본 WO 전제 중 다음은 **이미 해소** — 본 실행은 **유일한 미해결 결정(row 생성 시점)만** 다룬다:

| WO 전제 | 실제 |
|---------|------|
| "neture_suppliers row 미생성/lazy" | ❌ 종전에도 **회원 승인(step1)에서 결정적 생성**(PENDING, full seed+org). lazy 아님 |
| "승인대기 혼동" | ✅ 이미 감사+UX 명확화 배포(`IR-...-SUPPLIER-PENDING-STATE-AUDIT-V1` Case A / `e8dc2f0a9`) |
| §5.5 운영자 상태 축 분리 | ✅ 이미 구현 |
| §5.4 상품 승인 gate(공급자 상태) | ✅ 이미 존재(`offer.service.ts:834` `SUPPLIER_NOT_ACTIVE`) |
| 회원 승인 ≠ 공급자 승인 분리 | ✅ 이미 2단계 모델(step1 가입 / step2 공급) |

**사용자 결정:** row 생성 시점을 **회원 승인 → 가입 시점**으로 앞당김(미승인 회원도 프로필 row 보유).

## 2. write-path 확정 (조사)

| 경로 | 종전 | 변경 후 |
|------|------|---------|
| 가입(`auth-register`) | neture_suppliers 생성 없음 | **즉시 PENDING 생성**(seed+org, 멱등) |
| 회원 승인 step1(`operator-registration.service`) | PENDING 생성(full seed+org) | **무변경** — 존재 가드(`if (!existingSupplier)`) + `ON CONFLICT DO NOTHING`로 가입분 발견 시 자동 no-op(updated_at만 touch) |
| 공급 승인 step2(`/operator/suppliers`) | PENDING→ACTIVE | 무변경 |

→ **2단계 모델 불변**: 가입 시 PENDING 생성, step2에서 ACTIVE. 중복 생성/충돌 없음.

## 3. 변경 (2파일)

| 파일 | 변경 |
|------|------|
| `auth/controllers/auth-register.controller.ts` | private static `createNetureSupplier(manager, userId, data, effectiveRole, resolvedName)` 추가 — `data.service==='neture' && effectiveRole==='supplier'` 시 neture_suppliers(PENDING) + organizations(type=supplier) seed, 멱등(user_id 존재 skip + ON CONFLICT). 신규/기존 user 양 flow 트랜잭션 내 호출. 로직은 step1 생성과 동일 형태(snapshot). |
| `database/migrations/20260618000000-BackfillNetureSupplierProfiles.ts` | neture supplier membership 중 row 없는 사용자 PENDING 보정(INSERT...SELECT, NOT EXISTS + ON CONFLICT DO NOTHING). down=no-op. org 연동은 보정 범위 외. |

## 4. 가드/안전

- **step1 무변경** — 기존 승인 흐름 회귀 위험 최소. 존재 가드가 가입분을 자동 흡수.
- **멱등 3중**: 가입 헬퍼 `SELECT ... if exists return` + `ON CONFLICT (user_id) DO NOTHING`; migration `NOT EXISTS` + `ON CONFLICT`.
- **status=PENDING 만 부여** — 승인 상태 임의 부여 없음(2단계 준수). 기존 ACTIVE 공급자 무변경.
- **트랜잭션** — 가입 flow의 기존 `AppDataSource.transaction(manager => ...)` 내부에서 호출(원자성 유지).
- **타 서비스 무영향** — `data.service==='neture' && supplier` 한정.
- **Market Trial ParticipantType.STORE_OWNER 등 무관** — 본 변경은 neture_suppliers 한정.

## 5. 검증

- `npm run type-check` (api-server) → **exit 0**.
- 변경 = auth-register.controller.ts + 신규 migration **2개만**. step1(operator-registration.service) 무변경 확인.
- 동시 세션 파일 무간섭(RegisterModal 등은 이미 별도 커밋됨).

## 6. PASS 기준 대비

| 기준 | 결과 |
|------|------|
| 신규 공급자 가입 직후 neture_suppliers row 존재 | ✅ (createNetureSupplier) |
| 프로필 상태 PENDING(검토대기) | ✅ |
| 기존 누락 supplier 보정(멱등) | ✅ (migration) |
| 기존 승인완료 공급자 상태 훼손 없음 | ✅ (존재 skip) |
| 2단계 모델/step1/step2 불변 | ✅ |
| DB migration은 보정용 1개(스키마 변경 0) | ✅ |
| api-server tsc | ✅ |

## 7. 배포 후 권장 스모크 (필수 — 신규 데이터 생성 경로)

1. Neture 공급자 신규 가입 → `neture_suppliers` row(PENDING) 생성 확인(read-only SELECT 또는 operator 화면 "공급자 프로필: 검토대기").
2. 해당 회원 step1 승인 → 중복 생성/에러 없이 membership active, neture_suppliers PENDING 유지 확인.
3. step2 공급 승인 → ACTIVE 전환 확인.
4. migration 실행 로그 확인(보정 건수). 현 prod 는 0건 가능성(기존 IR §4: 전원 active+row 보유).

## 8. 비범위 / 후속

- frontend UI(가입 폼/대시보드 안내/운영자 표시) — 이미 별도 WO로 처리됨/비범위.
- 온보딩 status 컬럼 분리(profile_status/onboarding_status enum 신설) — 본 실행 비범위(현 status PENDING/ACTIVE 모델 유지). 필요 시 별도 WO.
- org 백필(보정분의 organization 연동) — 비범위(승인/프로필 편집 시 연동).
- 후속 후보: `WO-O4O-NETURE-SUPPLIER-ELIGIBILITY-GATE-CENTRALIZE-V1`(상품/모집/정산 공급자 자격 gate 공통화).

---

*Date: 2026-06-18 · CHECK · PASS · Neture 공급자 가입 시점 neture_suppliers(PENDING) 즉시 생성 + 누락 보정 migration · step1 무변경(존재가드 자동 no-op) · 2단계 모델 불변 · 멱등 3중 · api-server tsc 통과 · 배포 후 가입→row 스모크 권장.*
