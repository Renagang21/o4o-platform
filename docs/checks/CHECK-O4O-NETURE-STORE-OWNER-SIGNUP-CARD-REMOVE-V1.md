# CHECK-O4O-NETURE-STORE-OWNER-SIGNUP-CARD-REMOVE-V1

> **작업명:** WO-O4O-NETURE-STORE-OWNER-SIGNUP-CARD-REMOVE-V1
> **유형:** Neture 가입 유형에서 `매장 경영자(store_owner)` 카드 제거 (frontend + backend 신규 가입 차단). 펀딩/포럼/DB migration 무변경.
> **결과: PASS — RegisterModal store_owner 카드·입력분기·SignupRole 제거, backend NETURE_ALLOWED_SIGNUP_ROLES 에서 'store_owner' 제거. market-trial/forum/legacy 데이터 무변경. web-neture·api-server tsc 통과.**
> 선행: IR-O4O-NETURE-STORE-OWNER-ROLE-SEMANTIC-AUDIT-V1 / IR-O4O-NETURE-STORE-OWNER-SIGNUP-AND-FUNDING-PARTICIPATION-POLICY-AUDIT-V1

## 1. 가드레일 (핵심)

**가입 role `store_owner` 제거 ≠ Market Trial `ParticipantType.STORE_OWNER` 제거.** 후자는 펀딩 참여 기록 분류값(별개 도메인)으로 **건드리지 않음**. 검증: `git status packages/market-trial` = 변경 0.

## 2. 변경 (2파일)

### Frontend — `services/web-neture/src/components/RegisterModal.tsx`
| 항목 | 처리 |
|------|------|
| `SignupRole` 타입 | `'supplier' \| 'partner' \| 'store_owner'` → `'supplier' \| 'partner'` |
| roleOptions | '매장 경영자' 카드 객체 제거 (supplier/partner만) |
| `Store` 아이콘 import | 미사용 → 제거 |
| 섹션 타이틀 | store_owner 분기 제거 → `supplier ? '공급자 정보' : '파트너 정보'` |
| store_owner 입력 분기 | 매장명/업종 select/매장지역/담당자명/연락처 블록 **전체 제거** |
| 주석 정합 | store_owner 관련 주석 정리 |

- supplier 분기(업태/종목/BusinessRegistrationFields/AddressSearch)·partner 분기 **무변경**.
- `isStep2Valid` 의 companyName 필수 체크는 supplier/partner 양쪽에 그대로 유효(로직 변경 없음, 주석만 갱신).
- diff: +8 / −103 (블록 제거 중심).

### Backend — `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts`
| 항목 | 처리 |
|------|------|
| `NETURE_ALLOWED_SIGNUP_ROLES` | `['supplier','partner','store_owner']` → `['supplier','partner']` |
| 에러 메시지 | "(supplier / partner / store_owner)" → "(supplier / partner)" |
| 주석 | WO 근거 명시 |

- 신규 `role=store_owner` Neture 가입 요청 → `400 NETURE_SIGNUP_ROLE_REQUIRED` 로 거절.
- `VALID_ROLES`(cross-service 공용)는 **미변경** — store_owner 는 일반 role 로 유효 유지, Neture 신규 가입만 차단.

## 3. 미변경 (가드레일 / legacy 보호)

- `packages/market-trial/*` (ParticipantType.STORE_OWNER enum, 펀딩 참여 흐름) — **변경 0**.
- forum membership / 승인 로직 — 무변경.
- `services/web-neture/src/config/dashboard.ts`, `operator/EditUserModal.tsx` 의 store_owner 잔재 — **legacy store_owner 사용자 라우팅/표시 보호 위해 유지**(WO 가드레일: 깨질 위험 시 강제 삭제 금지).
- 기존 store_owner 회원 데이터 / role_assignments — migration 0 (operator 화면이 이미 '일반 회원' collapse).

## 4. 검증

- `npx tsc --noEmit` (web-neture) → **exit 0**.
- `npm run type-check` (api-server) → **exit 0**.
- 정적 격리:
  - 변경 = RegisterModal.tsx + auth-register.controller.ts **2파일만** (동시 세션의 타 6파일은 미스테이지).
  - RegisterModal 내 `store_owner` 잔존 = 가드레일 주석 3곳뿐(코드 분기 0).
  - `git status packages/market-trial` = 변경 0.

## 5. PASS 기준 대비

| 기준 | 결과 |
|------|------|
| 신규 가입 UI 매장 경영자 카드 제거 | ✅ |
| 허용 role = supplier/partner | ✅ (frontend+backend) |
| 기존 store_owner 데이터 무변경 | ✅ (migration 0) |
| Market Trial ParticipantType.STORE_OWNER 유지 | ✅ (변경 0) |
| 펀딩/forum 로직 무변경 | ✅ |
| supplier/partner 가입 회귀 없음 | ✅ (분기 무변경, tsc 통과) |

## 6. 배포 후 권장 (선택)

- 브라우저: Neture 가입 모달 → supplier/partner 2개 카드만 노출, 매장 경영자 부재 확인.
- API: `POST /auth/register {service:'neture', role:'store_owner'}` → `400 NETURE_SIGNUP_ROLE_REQUIRED` 확인(DB 무기록 — 역할 체크가 user 조회 이전).

## 7. 후속 (선택)

- legacy store_owner 잔재(dashboard.ts/EditUserModal) 정리는 legacy 회원 소진 후 별도 판단.
- 명칭 정리(후보 B `유통참여 회원`)는 §IR 상 실익 낮아 보류.

---

*Date: 2026-06-18 · CHECK · PASS · Neture 매장 경영자 가입 카드 제거(frontend+backend allowed role) · market-trial ParticipantType/forum/legacy 데이터 무변경 · web-neture+api-server tsc 통과 · 2파일 path-specific.*
