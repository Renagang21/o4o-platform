# IR-O4O-KPA-OPERATOR-PROFILE-PRESENCE-AUDIT-V1

**작성일**: 2026-05-16
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**대상**:
- `https://kpa-society.co.kr/operator/members` 운영자 회원관리 화면의 "KPA 프로필 없음" 표시 (sohae2100@gmail.com 케이스)
- 동일 사용자의 `/mypage/profile` 에는 직역/약국 개설자/근무처 정보가 노출됨 — 두 화면의 판정 기준 불일치

**연관 IR/WO**:
- `WO-O4O-KPA-OPERATOR-MEMBER-LIST-SOURCE-FIX-V1` (`has_kpa_member` 도입)
- `WO-O4O-KPA-MEMBER-APPROVAL-STORE-OWNER-AUTO-ACTIVATION-V1` (자동 store_owner 활성화)
- `IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1` (관련 capability 카드 정합성)

---

## 0. 결론 요약

**두 화면이 서로 다른 source 를 보고 있어 표시 기준이 분리됨**. 둘 다 자기 코드 기준에는 정확하지만, 사용자/운영자 인지 모델에서는 모순.

| 화면 | "프로필 있음/없음" 판정 source | sohae2100 케이스에서의 결과 |
|---|---|---|
| operator `/operator/members` | **`kpa_members` row 존재 여부** (`has_kpa_member = !!km_id`) | row 없음 → "KPA 프로필 없음" |
| `/mypage/profile` 직역 탭 | `kpa_pharmacist_profiles.activity_type` + `users.businessInfo.metadata.workplace` | row 있음 → 직역(`pharmacy_owner`) + 근무처 정상 표시 |

→ 두 표시 모두 "기술적으로는 옳음". 진짜 문제는 **canonical "프로필 있음" 기준이 정의되지 않은 채 여러 테이블이 부분적으로 채워질 수 있는 lifecycle**.

**근본 원인 가설** (DB 확인 필요): sohae2100 의 `kpa_members` row 가 **존재하지 않음**. `kpa_pharmacist_profiles` + `users.businessInfo` + (자동 부여로 인한) `role_assignments` 만 있는 부분 가입 상태일 가능성 높음.

**일반 영향**: register 정상 흐름은 `createKpaRecords()` 가 `kpa_members` 를 항상 생성. 그러나 admin 직접 생성 / 마이그레이션 / 자동 store_owner 활성화 우회 경로 등에서 `kpa_members` 누락 가능 — sohae2100 한 계정 문제로 끝나지 않을 가능성 존재.

---

## 1. operator 회원관리 조회 API 흐름

### 1.1 Endpoint
- Frontend: [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx:382](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L382) `apiClient.get('/members', ...)`
- Backend: `GET /api/v1/kpa/members` — [apps/api-server/src/routes/kpa/controllers/member.controller.ts:235-403](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L235)

### 1.2 SQL (해당 부분)
```sql
SELECT
  sm.id        AS sm_id,
  sm.user_id,
  sm.status    AS status,
  km.id        AS km_id,
  km.status    AS kpa_status,
  km.membership_type,
  km.pharmacy_name,
  km.activity_type,
  ...
FROM service_memberships sm
JOIN users u ON u.id = sm.user_id
LEFT JOIN kpa_members km ON km.user_id = sm.user_id
WHERE sm.service_key IN ('kpa-society', 'kpa')
  [AND sm.status = $1] [AND km.role = $2] ...
ORDER BY sm.created_at DESC
LIMIT $N OFFSET $M
```

### 1.3 `has_kpa_member` 결정 ([member.controller.ts:319-323](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L319))
```ts
const members = (rows as any[]).map((r) => ({
  id: r.km_id ?? r.sm_id,
  sm_id: r.sm_id,
  user_id: r.user_id,
  has_kpa_member: !!r.km_id,      // ← km_id (kpa_members.id) 존재 여부만
  ...
}));
```

### 1.4 Frontend 표시 ([MemberManagementPage.tsx:632-637](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L632))
```tsx
{!m.has_kpa_member && (
  <span ...>KPA 프로필 없음</span>
)}
```

→ **단일 기준**: `kpa_members.user_id = sm.user_id` LEFT JOIN 매칭 실패 시 = "KPA 프로필 없음". `kpa_pharmacist_profiles` / `kpa_student_profiles` / `users.businessInfo` 는 전혀 고려되지 않음.

---

## 2. 사용자 프로필 화면 API 흐름

### 2.1 Endpoint
- Frontend: [services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx:150](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L150) `mypageApi.getProfile()`
- Backend: `GET /api/v1/kpa/profile` — [apps/api-server/src/routes/kpa/services/mypage.service.ts:24-111](apps/api-server/src/routes/kpa/services/mypage.service.ts#L24)

### 2.2 Backend `MypageService.getProfile()` source 매트릭스
| 응답 필드 | 실제 source |
|---|---|
| `pharmacist.licenseNumber` | `kpa_members.license_number` |
| `pharmacist.university` | `kpa_members.university_name` |
| `pharmacist.workplace` | **`users.businessInfo.metadata.workplace`** (JSONB) — `kpa_members` 무관 |
| `pharmacy.name` | `kpa_members.pharmacy_name` |
| `pharmacy.address` | `kpa_members.pharmacy_address` |
| `userType.isPharmacyOwner` (backend) | `kpa_members.pharmacy_name` 존재 여부 |
| `businessInfo` | `users.businessInfo` (JSONB) |
| `organizations` | `organization_members` + `organizations` join |

### 2.3 Frontend 표시 로직
| Frontend 변수/표시 | 실제 source | `kpa_members` 의존 |
|---|---|---|
| `hasPharmacistInfo = profile?.pharmacist !== null` | backend 가 super_operator 가 아닌 한 항상 object 반환 → **거의 항상 true** | ❌ |
| `activityType = user?.activityType` | **`kpa_pharmacist_profiles.activity_type`** ([auth-helpers.ts:69](apps/api-server/src/modules/auth/controllers/auth-helpers.ts#L69), [auth-account.controller.ts:142](apps/api-server/src/modules/auth/controllers/auth-account.controller.ts#L142)) — JWT user context | ❌ |
| `isPharmacyOwner = activityType === 'pharmacy_owner'` (frontend) | activityType ← `kpa_pharmacist_profiles.activity_type` | ❌ |
| "직역" 표시 | `ACTIVITY_TYPE_LABELS[activityType]` | ❌ |
| "근무처" 표시 | `businessInfo.metadata.workplace` | ❌ |
| "약국명/주소" 표시 | `pharmacy.name / address` ← `kpa_members.pharmacy_name/address` | ✅ |
| "면허번호" 표시 | `pharmacist.licenseNumber` ← `kpa_members.license_number` | ✅ |
| "대학" 표시 | `pharmacist.university` ← `kpa_members.university_name` | ✅ |

→ **sohae2100 의 프로필에 "약국 개설자" 라벨이 보이는 것**: 이는 `activityType === 'pharmacy_owner'` 로 결정 → `kpa_pharmacist_profiles.activity_type='pharmacy_owner'` 이면 `kpa_members` 없어도 표시 가능. 단 "약국명/주소" 까지 보이려면 `kpa_members.pharmacy_name` 도 있어야 함 (다음 §3 시나리오 분기).

---

## 3. DB 기준 비교 — sohae2100@gmail.com 가설 시나리오

본 IR 은 read-only 라 운영 DB 실제 row 미확인. 두 시나리오:

### 시나리오 A — `kpa_members` row **있음** (LEFT JOIN 매칭 실패)
| 테이블 | 가설 상태 |
|---|---|
| `users` | row 있음, email='sohae2100@gmail.com' |
| `kpa_members` | row 있음 (license, pharmacy_name, activity_type 등) |
| `kpa_pharmacist_profiles` | row 있음 (activity_type='pharmacy_owner') |
| `users.businessInfo` | metadata.workplace 등 일부 |
| `service_memberships` | row 있음 (sm.status='active' 또는 다른 값) |
| `role_assignments` | `kpa:store_owner` 등 |

이 시나리오에서는 LEFT JOIN `km.user_id = sm.user_id` 가 매칭되어야 함 → has_kpa_member=true. 매칭 실패 원인 가능성:
- `kpa_members.user_id` 가 NULL (스키마상 불가능에 가까움)
- 데이터 정합성 깨짐 (`kpa_members.user_id` 가 다른 user id 값)
- 동일 user_id 에 `service_memberships` 가 여러 row 있고 일부에만 매칭 — **그러나 LEFT JOIN 은 user_id 기준이라 동일 user 의 모든 sm row 에 동일 km 가 매칭됨**

→ 시나리오 A 는 확률 낮음.

### 시나리오 B — `kpa_members` row **없음** (가장 가능성 높음)
| 테이블 | 가설 상태 |
|---|---|
| `users` | row 있음 |
| `kpa_members` | **row 없음** |
| `kpa_pharmacist_profiles` | row 있음 (activity_type='pharmacy_owner') |
| `users.businessInfo` | `metadata.workplace` + 기타 |
| `service_memberships` | row 있음 (admin 직접 생성 또는 다른 흐름) |
| `role_assignments` | `kpa:store_owner` 등 (자동 활성화 또는 admin 부여) |

이 경우:
- operator list: `has_kpa_member=false` → "KPA 프로필 없음" ✅ (코드 기준 정확)
- MyProfilePage: 직역 (activityType) ✅ + 근무처 (businessInfo) ✅ 표시. 약국명/주소는 `kpa_members.pharmacy_name` 없으니 표시 안 됨 — 사용자 진술 "약국 개설자 정보가 보인다" 는 "약국 개설자 직역(activity_type=pharmacy_owner)" 으로 보였을 가능성. 실제 "약국명/주소" 까지 보였다면 시나리오 A 또는 별도 source.

### 권장 DB 진단 SQL (사용자 승인 후 read-only 실행)
```sql
SELECT
  u.id, u.email,
  u."businessInfo" -> 'metadata' ->> 'workplace' AS workplace,
  km.id AS km_id, km.status AS km_status, km.activity_type AS km_activity, km.pharmacy_name, km.membership_type,
  pp.user_id AS pp_user_id, pp.activity_type AS pp_activity, pp.license_number AS pp_license,
  sm.id AS sm_id, sm.service_key AS sm_service_key, sm.status AS sm_status, sm.role AS sm_role,
  ARRAY_AGG(DISTINCT ra.role) FILTER (WHERE ra.is_active = true) AS active_roles,
  ARRAY_AGG(DISTINCT om.role || '@' || om.organization_id::text) AS org_memberships
FROM users u
LEFT JOIN kpa_members km ON km.user_id = u.id
LEFT JOIN kpa_pharmacist_profiles pp ON pp.user_id = u.id
LEFT JOIN service_memberships sm ON sm.user_id = u.id
LEFT JOIN role_assignments ra ON ra.user_id = u.id
LEFT JOIN organization_members om ON om.user_id = u.id
WHERE u.email = 'sohae2100@gmail.com'
GROUP BY u.id, u.email, u."businessInfo", km.id, km.status, km.activity_type, km.pharmacy_name, km.membership_type,
         pp.user_id, pp.activity_type, pp.license_number, sm.id, sm.service_key, sm.status, sm.role;
```
- 실행 채널: Cloud Console SQL Editor (psql 로컬 미설치)
- read-only — 데이터 변경 없음

---

## 4. 두 화면의 표시 기준 차이 — 정리

| 의미 단위 | operator list 기준 | MyProfilePage 기준 |
|---|---|---|
| "KPA 회원 가입했음" | `kpa_members` row 존재 | `kpa_pharmacist_profiles` 또는 `service_memberships` 의 일부 |
| "약사" 표시 | `kpa_members.membership_type` = pharmacist | (직접 표시 없음 — 직역 라벨로 대체) |
| "약대생" 표시 | `kpa_members.membership_type` = student | (직접 표시 없음) |
| "약국 개설자" 표시 | (없음 — has_kpa_member 만 표시) | `activityType==='pharmacy_owner'` (frontend) / `kpa_members.pharmacy_name` (backend) |
| "직역" 표시 | (없음) | `activityType` (`kpa_pharmacist_profiles.activity_type`) |
| "근무처" 표시 | (없음) | `users.businessInfo.metadata.workplace` |
| "약국명" 표시 | (column 노출 안 됨) | `kpa_members.pharmacy_name` |

→ operator list 는 `kpa_members` 1 소스 단일 판정. MyProfilePage 는 4 소스 (`kpa_members` + `kpa_pharmacist_profiles` + `users.businessInfo` + auth JWT context) 조합.

---

## 5. "프로필 없음" 판정 기준 점검

| 정책 검토 항목 | 현 상태 | 평가 |
|---|---|---|
| operator list 가 `kpa_pharmacist_profiles` 존재만으로도 "프로필 있음" 인정해야 하는가? | 미반영 | 정책 결정 필요 — 약사 세부 프로필이 있는 사용자는 operator 가 회원으로 인지 가능해야 함 |
| `users.businessInfo` (근무처/사업자번호) 가 있는 사용자도 "프로필 있음" 인정? | 미반영 | businessInfo 는 KPA 도메인 외 데이터 (Core users JSONB) — 단독 기준으로는 약함 |
| `service_memberships` 활성 row 만으로도 "회원" 인정? | sm row 가 없으면 list 에 안 나옴 (WHERE 절) | sm 존재는 list 진입 조건이라 별도 라벨 불요 |
| `kpa_members` row 가 모든 KPA 회원에게 반드시 있어야 한다는 invariant? | 정책 명시 없음 | 정책 결정 필요 — invariant 라면 backfill 로 정렬 |
| 라벨 "KPA 프로필 없음" 이 사용자 친화적인가? | 모호 — 실제 의미는 "kpa_members domain row 미생성" | "약사 정보 미입력" / "회원 프로필 미작성" 등 명확화 권장 |

### 분리 권장 라벨 (예시)
- "KPA 멤버 row 있음" = `kpa_members` 존재
- "약사 프로필 입력됨" = `kpa_pharmacist_profiles` 존재 + 필수 필드 (license/activity_type) 충족
- "약대생 프로필 입력됨" = `kpa_student_profiles` 존재 + 필수 필드 충족
- "회원 가입 완료" = `service_memberships.status='active'` + 위 둘 중 하나
- 현재 라벨 "KPA 프로필 없음" → "KPA 멤버 row 미생성" 으로 직역하거나, **lifecycle 의 어디에서 누락되었는지**를 정확히 표현해야 함

---

## 6. canonical profile presence 기준 제안

**제안 A — kpa_members 를 SSOT 로 강제** (구조 정합)
- 모든 KPA 회원은 가입 lifecycle 의 일부로 `kpa_members` row 생성 보장
- 누락 row 는 backfill migration 으로 정리
  - `service_memberships(kpa-society)` 가 있고 `kpa_members` 가 없는 user 에 대해 skeleton 생성 (membership_type, status='active' 등 derive)
- operator list 의 `has_kpa_member` 기준 유지 + 라벨을 "KPA 회원 등록 누락" 으로 정확화
- 자동 store_owner 활성화 흐름에 `kpa_members` ensure 단계 추가

**제안 B — 다중 source 인정** (UX 호환)
- "프로필 있음" 기준을 multi-source OR 로 확장:
  ```
  has_kpa_profile = !!km_id
    || EXISTS (kpa_pharmacist_profiles WHERE user_id)
    || EXISTS (kpa_student_profiles WHERE user_id)
  ```
- 단점: source drift 영속화, lifecycle 무결성 약화
- 단기 fallback 으로만 유효, 장기 canonical 로는 약함

**권장**: 제안 A — `kpa_members` SSOT 강제. 별도 source (pharmacist/student/businessInfo) 는 보조 데이터로 유지하되, `kpa_members` 누락은 데이터 정합성 문제로 분류하여 backfill.

---

## 7. 일반 영향 판단 (sohae2100 한정 아님)

| 가입 경로 | `kpa_members` 생성 책임 | 누락 가능성 |
|---|---|---|
| `POST /api/v1/auth/register` (일반 가입) | [auth-register.controller.ts:351-455](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts) `createKpaRecords()` 항상 호출 | 낮음 (정상 흐름) |
| Admin/Operator 가 회원을 직접 추가 (Admin Users API) | `kpa_members` 별도 생성 안 함 (AdminUserController) | **높음** |
| `MembershipApprovalService.approveMembership()` STEP4 | 명시적 kpa_members upsert 있음 | 낮음 (호출되면 정상) |
| PATCH `/kpa/members/:id/status` pending→active | 이미 존재하는 `kpa_members` 의 status 만 변경 (없으면 생성 안 함) | 이미 있으면 영향 없음 — 없는 경우는 처리 못 함 |
| 자동 store_owner 활성화 (member.controller 자동 분기) | `kpa_members.organization_id` UPDATE 만 (skeleton 생성 없음) | 자동 부여는 이미 kpa_members 있는 경우 전제 — 없으면 silent skip 가능 |
| Bootstrap seed / 마이그레이션 | 케이스별 별도 처리 | 일부 누락 가능 |

→ **admin 직접 추가 또는 backfill 누락 케이스**에서 sohae2100 과 같은 상태가 재발 가능. 다른 pharmacy_owner / store_owner 사용자에게도 동일 영향 발생 가능성.

운영 DB 진단으로 영향 범위 확인 권장:
```sql
SELECT COUNT(*)
FROM service_memberships sm
LEFT JOIN kpa_members km ON km.user_id = sm.user_id
WHERE sm.service_key IN ('kpa-society','kpa')
  AND km.id IS NULL;
```

---

## 8. 수정 필요 파일 목록

### 제안 A 진로 시 (canonical kpa_members SSOT)
| 파일 | 변경 종류 |
|---|---|
| backfill migration (신규) | `kpa_members` 누락 user 에 대해 skeleton row 생성 (membership_type derive, status='active' default 가드) |
| [apps/api-server/src/controllers/admin/AdminUserController.ts](apps/api-server/src/controllers/admin/AdminUserController.ts) `createUser`/`updateUser` | admin 이 KPA scope user 추가 시 `kpa_members` ensure 단계 추가 (호출처 분기) |
| [apps/api-server/src/routes/kpa/controllers/member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts) 자동 store_owner 활성화 분기 (L535-599) | `kpa_members` 존재 사전 점검 + 없으면 skeleton 생성 |
| [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx:632-637](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L632) | 라벨 "KPA 프로필 없음" → "회원 정보 누락" 등 정확화 (선택) |

### 즉시 가능한 UX 보강 (제안 A 진행과 별개)
| 파일 | 변경 종류 |
|---|---|
| `MemberManagementPage.tsx` | "KPA 프로필 없음" badge 옆에 보조 정보 표시 — activity_type / business name 이 있으면 함께 노출하여 운영자가 회원 식별 가능 |
| `mypage.service.ts` `getProfile` | super_operator 가 아닌 경우 `pharmacist` object 항상 반환하지 말고 의미 있는 데이터 있을 때만 반환 (또는 명시적 `pharmacistInfoSource` 메타 필드 추가) |

---

## 9. 권장 수정 방향

### 1순위 (정합성 핵심)
- **canonical 정책 확정**: `kpa_members` 를 KPA 회원 SSOT 로 invariant 화
- **운영 DB backfill**: `service_memberships(kpa-society)` 있고 `kpa_members` 없는 user 정리
- **admin 추가/자동 활성화 경로 보강**: `kpa_members` ensure 단계 추가

### 2순위 (UX 명확화)
- operator list 라벨 정확화 ("KPA 프로필 없음" → "회원 정보 누락" 등)
- "프로필 없음" 회원에 대해서도 fallback 정보 (activity_type, business name 등) 표시 — 운영자가 식별 가능하게

### 3순위 (구조 정렬)
- `kpa_members` vs `kpa_pharmacist_profiles` 의 역할 분리 명확화 (어떤 데이터가 어느 테이블에 있어야 하는지 문서화)
- `mypage.service.ts` 의 `isPharmacyOwner` 정의를 frontend (`activityType==='pharmacy_owner'`) 와 정렬 또는 명시적으로 분리

---

## 10. 후속 WO 초안

### WO-O4O-KPA-MEMBER-CANONICAL-PRESENCE-BACKFILL-V1 (정합성 정리)

```text
WO-O4O-KPA-MEMBER-CANONICAL-PRESENCE-BACKFILL-V1

목적:
KPA 회원의 canonical SSOT 를 kpa_members 로 invariant 화. service_memberships(kpa-society) 가
있고 kpa_members 가 없는 사용자(예: admin 직접 추가, 자동 활성화 우회) 를 정리.

근거: docs/investigations/IR-O4O-KPA-OPERATOR-PROFILE-PRESENCE-AUDIT-V1.md

작업 범위:
1. 사전 진단 SQL — kpa_members 누락 사용자 수 + 샘플 5건
2. Backfill migration 신규
   · kpa_members skeleton row 생성 (membership_type derive: pharmacist_profile 있으면 'pharmacist',
     student_profile 있으면 'pharmacy_student_member', 둘 다 없으면 SM.role 기준)
   · status='active' (SM 가 active 일 때만), identity_status='active'
   · joined_at = SM.created_at
   · ON CONFLICT (user_id) DO NOTHING
3. AdminUserController 의 KPA scope user 추가 흐름에 kpa_members ensure 단계 추가
4. member.controller 자동 store_owner 활성화 분기에 kpa_members 사전 점검 + ensure

(주의: backfill 은 운영 DB UPDATE 포함 — 사용자 명시 승인 필수)

검증:
- TypeScript clean
- backfill 실행 후 누락 카운트 = 0
- operator list 의 "KPA 프로필 없음" 회원 수 변화 확인
- 신규 admin 직접 추가 → kpa_members 자동 생성 확인
```

### WO-O4O-KPA-OPERATOR-MEMBER-LIST-LABEL-ACCURATE-V1 (UX 라벨 정확화)

```text
WO-O4O-KPA-OPERATOR-MEMBER-LIST-LABEL-ACCURATE-V1

목적:
operator 회원관리의 "KPA 프로필 없음" 라벨을 의미에 맞게 변경 + 보조 정보 노출.

작업 범위:
- MemberManagementPage 의 "KPA 프로필 없음" 표시:
  · 라벨 "회원 정보 누락" 으로 변경
  · 보조 표시: activity_type 또는 business name 이 있으면 함께 노출 (운영자 식별 보조)
- API 응답 확장 검토:
  · has_kpa_member 외에 has_pharmacist_profile / has_student_profile / has_business_info 등
    multi-source 플래그 추가 가능성

검증:
- 라벨 변경 후 운영자 화면 확인
- 회원 식별 보조 정보 노출 확인
```

### (참조) 별도 IR 후보 — 본 IR 범위 외

- `IR-O4O-KPA-PROFILE-TABLE-SEPARATION-CANONICAL-V1`: `kpa_members` / `kpa_pharmacist_profiles` / `kpa_student_profiles` / `users.businessInfo` 의 역할 분리 + 데이터 소유권 정리

---

## 11. 본 IR 범위 외 (후속 확인)

- 운영 DB 의 sohae2100 실제 row 상태 (§3.3 SQL — 사용자 승인 후 실행)
- 운영 DB 전체에서 `kpa_members` 누락 user 수 (§7 SQL)
- `users.activityType` JWT 응답에서의 정확한 빌드 경로 (auth/me 흐름)
- `MyProfilePage` 의 "약국 개설자" 표시 사용자가 실제로 "약국 정보 (이름/주소)" 까지 보고 있는지 — 시나리오 A/B 확정의 핵심 단서

---

## 12. 참조

- 코드:
  - [apps/api-server/src/routes/kpa/controllers/member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts) L235-403 (GET /members), L319 (has_kpa_member)
  - [apps/api-server/src/routes/kpa/services/mypage.service.ts](apps/api-server/src/routes/kpa/services/mypage.service.ts) L24-111 (getProfile)
  - [apps/api-server/src/modules/auth/controllers/auth-helpers.ts](apps/api-server/src/modules/auth/controllers/auth-helpers.ts) L69 (activity_type ← kpa_pharmacist_profiles)
  - [apps/api-server/src/modules/auth/controllers/auth-register.controller.ts](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts) L351-455 (createKpaRecords)
  - [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx) L632 (KPA 프로필 없음 표시)
  - [services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx) L301-305 (hasPharmacistInfo / isPharmacyOwner)
- 연관 IR/WO:
  - `IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1` (capability 카드 정합성)
  - `IR-O4O-KPA-OPERATOR-MEMBER-APPROVAL-STALE-PENDING-AUDIT-V1` (SM 동기화)
  - `WO-O4O-KPA-OPERATOR-MEMBER-LIST-SOURCE-FIX-V1` (has_kpa_member 도입)
  - `WO-O4O-KPA-MEMBER-APPROVAL-STORE-OWNER-AUTO-ACTIVATION-V1` (자동 활성화)
  - `WO-O4O-KPA-REGISTER-CANONICAL-CLEANUP-V1` (register 정리)

---

*조사 전용 — 코드/DB 수정 없음. 코드 변경은 후속 WO 로 분리 진행.*
