# IR-O4O-KPA-ACTIVITY-TYPE-CHANGE-FLOW-AUDIT-V1

**작성일**: 2026-05-16
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**대상**:
- KPA-Society 의 **직역(`activity_type`) 변경 흐름** 과 **매장 경영자(Store Owner) 전환 흐름**
- 두 흐름을 단일 모달로 통합할지, 별도 흐름으로 분리할지 결정용 사전 조사
- 코드 복잡성 최소화 관점

**연관 작업**:
- WO-O4O-KPA-MEMBER-APPROVAL-STORE-OWNER-AUTO-ACTIVATION-V1 (commit `6a6f9426e`) — 회원 승인 시 자동 store_owner 부여
- WO-O4O-KPA-MYPAGE-CAPABILITY-CARD-AUTO-ALIGN-V1 (commit `27efcbe87`) — role 보유 시 capability 카드 미표시
- WO-KPA-PHARMACY-APPROVAL-ENSURE-STORE-LINK-V1 — pharmacy_request 승인 시 organization 연결
- IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1 (선행 IR)

---

## 0. 결론 요약

**분리 흐름 유지 권장 (옵션 B)** — 코드 변경 최소 + 정책 명확성 최대.

- 일반 직역 변경(`pharmacy_employee` / `hospital` / `manufacturer` 등 10종)과 매장 경영자(`pharmacy_owner`) 전환은 **물리적으로 이미 분리**되어 있음:
  - 일반 직역 → `PATCH /auth/me/profile` 즉시 반영, 운영자 승인 없음
  - 매장 경영자 → `POST /kpa/pharmacy-requests` 신청 + 운영자 `PATCH /:id/approve` 승인 + organizations + role_assignments 자동 생성
- 통합 모달(옵션 A)은 UI 편의를 약간 늘리지만 backend 분기 로직 / 테스트 비용 / 트랜잭션 복잡도가 증가
- **현재 코드 변경 0건으로 정책이 작동**하며, 작은 안전장치(직역 `pharmacy_owner` 직접 선택 차단) 만 보강하면 충분

→ 핵심 후속 작업은 **모달 구조 변경이 아니라 자동 부여 정책과 직역 변경 자유도의 모순을 메우는 가드** 1건.

---

## 1. `activity_type` 저장 구조

| 위치 | 컬럼 | 역할 | 비고 |
|------|------|------|------|
| `kpa_pharmacist_profiles` | `activity_type` (varchar 50) | **SSOT** | UPSERT 시점에 갱신 |
| `kpa_members` | `activity_type` (varchar 50) | mirror | sync 필요 (PATCH 시 함께 update) |
| `users.businessInfo` (JSONB) | `{businessNumber, businessName, ...}` | 사업자 부수 정보 | 직역과 분리 |

**enum 값 (11종)** — backend 와 frontend 동일:
```
pharmacy_owner | pharmacy_employee | hospital | manufacturer |
importer | wholesaler | other_industry | government | school |
other | inactive
```

**`EDITABLE_ACTIVITY_TYPES`** (`MyProfilePage.tsx` L50-54): 위 11종 모두 노출 — `pharmacy_owner` 포함.

**`ACTIVITY_TYPE_LABELS`** (`useAuth` 또는 contexts): 직역 한글 라벨.

---

## 2. 현재 직역 변경 흐름 — 즉시 반영, 승인 없음

### 2-A. 일반 직역 변경 흐름

```
[Frontend] MyProfilePage role 탭 → handleRoleSave
  1. mypageApi.updateProfile({ university, workplace })       — 기본 정보
  2. setActivityType(roleForm.activityType)                   — 직역
  3. checkAuth() + fetchKpaContext()                          — 즉시 반영
       ↓
[Backend] PATCH /api/v1/auth/me/profile
  1. kpa_pharmacist_profiles UPSERT (SSOT)
  2. kpa_members.activity_type UPDATE (mirror)
  3. users.businessInfo merge (사업자 부수 정보)
  4. 약국명/주소 mirror to kpa_members.pharmacy_name/address
       ↓
[Response]
  → user.activityType 갱신 → UI 즉시 변경
```

**권한**: 자신의 직역만 변경 가능 (`req.user.id`). 운영자 검토 없음.

**즉시 반영**: ✅ — 승인 대기 / 검토 단계 없음.

### 2-B. 매장 경영자(`pharmacy_owner`) 전환 흐름

매장 경영자 전환은 **두 가지 진입 경로** 존재:

**경로 1 — 가입 시 자동 부여 (자동 흐름)**

```
[가입] RegisterModal — activity_type=pharmacy_owner + businessInfo 입력
       ↓
[운영자] /operator/members 에서 회원 승인 (pending → active)
       ↓
[Backend] member.controller.ts pending→active 분기 (L550-614)
  IF activity_type='pharmacy_owner' AND businessNumber/pharmacyName 존재:
    1. organizations(type='pharmacy') ensureOrganization
    2. organization_members(role='owner') INSERT
    3. role_assignments('kpa:store_owner') 부여
       ↓
[결과] role 자동 부여 — 별도 신청 불필요
```

**경로 2 — 가입 후 수동 신청 (fallback / 다른 직역에서 전환)**

```
[Frontend] /pharmacy 신청 페이지 → pharmacyRequestApi.create
       ↓
[Backend] POST /kpa/pharmacy-requests
  → kpa_pharmacy_requests INSERT (status='pending')
       ↓
[운영자] /operator/pharmacy-requests 에서 PATCH /:id/approve
  1. organizations(type='pharmacy') ensureOrganization
  2. kpa_members.organization_id ← org.id (null 일 때만)
  3. organization_members(role='owner') INSERT
  4. role_assignments('kpa:store_owner') 부여
  5. kpa_pharmacist_profiles.activity_type ← 'pharmacy_owner' UPSERT
       ↓
[결과] role + activity_type 동시 변경
```

---

## 3. 현재 activity_type 변경 승인 구조 — 없음

| 변경 경로 | 운영자 승인 |
|----------|:----------:|
| 가입 시 activity_type 선택 (RegisterModal) | 회원 승인(pending→active)에 묶임 |
| 가입 후 MyProfilePage 에서 직역 변경 | ❌ 없음 (즉시 반영) |
| pharmacy_request 신청 → 승인 | ✅ 있음 (단, pharmacy_owner 전용 경로) |

일반 직역 변경 자체에는 **별도 승인 절차 없음**. pharmacy_request 가 매장 경영자 신청 단일 용도로 존재.

---

## 4. pharmacy_request 흐름 정리

**테이블** `kpa_pharmacy_requests`:
```
id | user_id | pharmacy_name | business_number |
pharmacy_phone | owner_phone | tax_invoice_email |
payload (JSONB) | status ('pending'|'approved'|'rejected') |
review_note | approved_by | approved_at | created_at
```

**엔드포인트**:

| 메서드 | 경로 | 권한 |
|--------|------|------|
| POST | `/kpa/pharmacy-requests` | auth |
| GET | `/kpa/pharmacy-requests/my` | auth (본인 신청 조회) |
| GET | `/kpa/pharmacy-requests/pending` | `kpa:operator` |
| PATCH | `/kpa/pharmacy-requests/:id/approve` | `kpa:operator` |
| PATCH | `/kpa/pharmacy-requests/:id/reject` | `kpa:operator` |

**승인 시 부수효과** (WO-KPA-PHARMACY-APPROVAL-ENSURE-STORE-LINK-V1):
- organizations + organization_members + role_assignments + activity_type 변경 모두 한 번에 처리

**용도**: 현재 매장 경영자 신청 **단일 용도**. 다른 용도(예: 정보 등록만) 로 활용되지 않음.

---

## 5. pharmacy_request 재사용 가능성 — 가능하지만 불필요

pharmacy_request 가 매장 경영자 신청 단일 용도라 다른 용도(일반 직역 변경 승인)로 확장 가능. 단:

- 일반 직역 변경은 **현재 승인 없이도 충분** — 사용자가 본인 정보 갱신만
- pharmacy_request 로 끌어들이면 일반 직역 변경에도 운영자 승인 필요 → 운영 부담 증가
- 두 정책의 의도(직역=자유 변경 / 매장 권한=검증 필요)가 다른데 한 테이블에 합치면 분기 로직 늘어남

→ 재사용 가능성은 있으나 정책상 합치는 이득 없음. 분리 유지 권장.

---

## 6. 옵션 비교 — 통합 모달 vs 분리

| 항목 | 옵션 A (통합 모달) | 옵션 B (분리 유지) |
|------|---|---|
| Frontend | 직역 select + 조건부 pharmacy_owner 폼 + 단일 submit | 직역 탭 + 별도 capability 카드 / `/pharmacy` 페이지 |
| Backend | 1 endpoint 가 두 정책 분기 OR 2 endpoint client 분기 | 기존 PATCH `/auth/me/profile` + POST `/kpa/pharmacy-requests` 그대로 |
| 트랜잭션 | pharmacy_owner 분기 시 organizations + role_assignments + activity_type 동시 처리 (현재 PATCH 흐름엔 없는 부수효과) | 기존 흐름 무변경 |
| 테스트 | 모달 내 조건부 분기 + 캔슬/실패 시 부분 반영 회복 | 기존 테스트 재사용 |
| 사용자 인지 | "한 곳에서 모든 직역 관리" 편의 ↑ | "권한과 정보 분리" 명확성 ↑ |
| WO 규모 | 중 (frontend + backend + 테스트) | 매우 작음 (기존 코드 활용) |
| 위험 | 모달 캔슬 시 frontend state vs backend 동기화 | 낮음 |

→ **옵션 B (분리 유지)** 가 코드 복잡성 / 정책 명확성 / 작업 비용 모두에서 우수.

---

## 7. 최소 복잡도 기준 권장안

**현재 코드 변경 0건으로 정책이 작동**. 다만 한 가지 가드만 보강 필요:

### 핵심 모순
- 사용자가 MyProfilePage 에서 activity_type → `'pharmacy_owner'` 로 직접 변경 가능 (즉시 반영)
- 그러나 businessNumber 없음 → `role_assignments('kpa:store_owner')` 자동 부여 트리거 없음
- UI: 직역 "약국 개설자" 표시 + 매장 진입 불가 → 모순

### 권장 가드 (옵션)
- **Option I** (가장 간단): `EDITABLE_ACTIVITY_TYPES` 에서 `pharmacy_owner` 제거. pharmacy_owner 는 가입 시 또는 pharmacy_request 승인 경로로만 진입 가능
- **Option II**: pharmacy_owner 선택 시 비활성화 + "매장 운영 권한 신청 필요" 안내 + Link to `/pharmacy`
- **Option III**: MyProfile 에서 pharmacy_owner 선택 시 businessNumber 입력 폼 노출 — 복잡도 ↑

→ **Option I 또는 II** 권장. 단순함이 핵심.

---

## 8. dead code / 중복 흐름

| 항목 | 판정 |
|------|------|
| pharmacy_request controller / 테이블 / API | **활성** — 매장 경영자 신청 fallback 경로, 운영자 처리 |
| `/pharmacy` 신청 페이지 | **활성** (다른 직역 → pharmacy_owner 전환 / 자동 부여 실패 / 재신청) |
| MyProfilePage role 탭 — activity_type select | **활성** — 일반 직역 변경 |
| RegisterModal 의 ACTIVITY_TYPE_OPTIONS (가입 시 6종) vs MyProfilePage 의 EDITABLE_ACTIVITY_TYPES (11종) | **분기 정당** — 가입 단순화 vs 수정 상세 |
| `EDITABLE_ACTIVITY_TYPES` 의 `pharmacy_owner` 포함 | **잠재 dead** — 안전장치 추가 시 직접 선택 불가 권장 |

---

## 9. 다른 서비스(GlycoPharm / K-Cosmetics) 공통화 가능성 — 낮음

| 서비스 | activity_type 개념 | pharmacy_request 류 흐름 | store_owner role |
|--------|:-----------------:|:----------------------:|:----------------:|
| KPA-Society | ✅ 11종 | ✅ kpa_pharmacy_requests | `kpa:store_owner` |
| GlycoPharm | ❌ 없음 | ❌ 없음 | `glycopharm:store_owner` (단순 부여) |
| K-Cosmetics | ❌ 없음 | ❌ 없음 | `cosmetics:store_owner` (단순 부여) |

다른 서비스는 "단순 판매자 권한" 1단계 모델. KPA-Society 는 "약사회 회원 + 매장 경영자" 2단계 검증 모델. **개념 자체가 다름** → 공통화 가치 없음.

---

## 10. 위험 신호 / 추가 결정 사항

| # | 항목 | 영향 |
|---|------|------|
| 1 | **`pharmacy_owner` 직접 변경 시 role 미부여 모순** — MyProfile 에서 pharmacy_owner 선택 가능하나 businessNumber 없어 role 자동 부여 안 됨 | ⭐ 즉시 해결 권장 (가드 추가) |
| 2 | **pharmacy_owner → 다른 직역 전환 시 role revoke 누락** — kpa:store_owner role 이 active 상태로 잔존 가능 | 정책 + 코드 추가 (role 동기화) |
| 3 | **운영자의 직역 변경 권한 미정** — 운영자가 기존 회원의 activity_type 변경 가능한 엔드포인트 없음 | 정책 확정 필요 |
| 4 | **자동 부여 silent fail 시 사용자 UX** — businessNumber 누락 시 자동 활성화 실패, 사용자는 인지 어려움 (이미 별도 IR 에서 다룸) | 별도 WO 권장 |
| 5 | **`/pharmacy` 페이지의 already-owner redirect** — role 보유 사용자가 직접 URL 입력 시 신청 폼 다시 노출되는지 확인 필요 | 별도 확인 |

---

## 11. 후속 WO 제안 (2건)

### 11-A. WO-O4O-KPA-PHARMACY-OWNER-DIRECT-CHANGE-GUARD-V1 ⭐ 1차 권장

```text
WO-O4O-KPA-PHARMACY-OWNER-DIRECT-CHANGE-GUARD-V1

목적:
MyProfilePage 직역 select 에서 'pharmacy_owner' 직접 변경 시 발생하는
"직역=약국 개설자 but role=미부여" 모순 방지.

근거: docs/investigations/IR-O4O-KPA-ACTIVITY-TYPE-CHANGE-FLOW-AUDIT-V1.md

작업 범위 (옵션 중 1택):
- 옵션 I: EDITABLE_ACTIVITY_TYPES 에서 'pharmacy_owner' 제거 + 현재 직역이
  'pharmacy_owner' 인 사용자만 select 에 옵션 표시 (변경 비활성화)
- 옵션 II: 'pharmacy_owner' 선택 시 disabled + 안내 문구
  "약국 개설자 전환은 [매장 운영 권한 신청] 메뉴에서 진행" + Link

권장: 옵션 I (가장 단순)

작업 외:
- backend / DB 무변경
- pharmacy_request 흐름 무변경
- 자동 부여 로직 무변경
- 다른 서비스 무변경

검증:
- pharmacy_owner 외 사용자 → select 에서 pharmacy_owner 선택 불가
- 기존 pharmacy_owner 사용자 → 표시는 유지, 다른 직역으로 변경은 가능
- TypeScript clean
- /mypage/profile 직역 탭 정상 동작
```

규모: **소** — MyProfilePage.tsx 한 파일, 10줄 이내.

### 11-B. (선택) WO-O4O-KPA-ACTIVITY-TYPE-ROLE-SYNC-V1

```text
WO-O4O-KPA-ACTIVITY-TYPE-ROLE-SYNC-V1

목적:
activity_type 변경 시 role_assignments('kpa:store_owner') 자동 동기화 추가.
직역 'pharmacy_owner' → 다른 직역 전환 시 store_owner role revoke.

범위:
- backend PATCH /api/v1/auth/me/profile (auth-account.controller.ts):
  · 이전 activity_type='pharmacy_owner' && 새 activity_type≠'pharmacy_owner'
    → roleAssignmentService.removeRole('kpa:store_owner')
  · 새 activity_type='pharmacy_owner' && businessNumber 존재
    → roleAssignmentService.assignRole('kpa:store_owner')
    (단 가드 11-A 채택 시 이 분기는 거의 발생하지 않음)
- frontend: checkAuth() 호출은 이미 있음 — role 갱신 자동
```

규모: **중** — backend 변경 + 트랜잭션 처리.
권장: 11-A 적용 후 별도 시점에 검토.

---

## 12. 본 IR 범위 외 (후속 확인)

- 운영자가 기존 회원의 activity_type 변경 권한 정책 확정
- `/pharmacy` 페이지의 already-owner redirect 동작 확인
- 자동 부여 실패 시 운영자 알림 (별도 IR 권장됨 — IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1 §11)
- pharmacy_request 와 kpa_member_services / service_memberships 의 동기화 (IR-O4O-KPA-OPERATOR-MEMBER-APPROVAL-STALE-PENDING-AUDIT-V1 와 연관)
- gist: 약국 폐업 후 직역 전환 시나리오 (organization 처리)

---

## 13. 참조

- `apps/api-server/src/routes/kpa/controllers/member.controller.ts` L550-614 (자동 부여)
- `apps/api-server/src/routes/kpa/pharmacy-request.controller.ts` (수동 신청)
- `apps/api-server/src/routes/auth/auth-account.controller.ts` (PATCH /auth/me/profile)
- `apps/api-server/src/entities/kpa/KpaPharmacistProfile.ts` (SSOT 엔티티)
- `services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx` L50-54 (EDITABLE_ACTIVITY_TYPES), L196-218 (handleRoleSave)
- `services/web-kpa-society/src/contexts/AuthContext.tsx` (setActivityType, checkAuth, fetchKpaContext)
- `services/web-kpa-society/src/api/pharmacyRequestApi.ts`
- WO 추적:
  - `WO-O4O-KPA-MEMBER-APPROVAL-STORE-OWNER-AUTO-ACTIVATION-V1` (commit `6a6f9426e`)
  - `WO-O4O-KPA-MYPAGE-CAPABILITY-CARD-AUTO-ALIGN-V1` (commit `27efcbe87`)
  - `WO-KPA-PHARMACY-APPROVAL-ENSURE-STORE-LINK-V1`
- 연관 IR:
  - `IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1` (capability 카드 정렬)
  - `IR-O4O-KPA-OPERATOR-MEMBER-APPROVAL-STALE-PENDING-AUDIT-V1` (sm 동기화)

---

*조사 전용 — 코드/DB 수정 없음. 코드 변경은 후속 WO 로 분리 진행.*
