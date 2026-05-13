# IR-O4O-KPA-MEMBER-APPLICATION-LIST-MISSING-AUDIT-V1

**조사 유형:** Investigation Report (IR)  
**조사 대상:** KPA-Society 가입 신청자가 운영자 회원 목록에 표시되지 않는 문제  
**조사 날짜:** 2026-05-13  
**상태:** COMPLETE

---

## 목적

KPA-Society에서 사용자가 가입 신청을 했다고 하나, 운영자 화면 `/operator/members` 회원 관리 목록과 "가입 신청" 탭/카운트에 표시되지 않는 원인을 파악한다.

추적 기준: 김용우(pharmabase@nate.com), 조훈(chojj22@naver.com) 두 신청자.

---

## 1. 가입 신청 흐름 구조

### 1-A. 사용자 가입 경로

**실제 사용 경로 (RegisterModal):**
```
RegisterModal.tsx (회원가입 모달)
  → POST /api/v1/auth/register
  → payload: { service: 'kpa-society', membershipType: '...' }
  → AuthRegisterController.register()
      → users 테이블 생성
      → service_memberships 생성 (serviceKey='kpa-society', status='pending')
      → createKpaRecords() 호출 (service === 'kpa-society' 조건 만족 시)
          → kpa_members 생성 (status='pending', organization_id=null)
          → kpa_member_services 생성 (service_key='kpa-a', status='pending')
```

**레거시 경로 (MemberApplyPage):**
```
MemberApplyPage.tsx (Legacy)
  → POST /api/v2/roles/apply (kpaApi.applyForRole)
  → role_applications 테이블에 저장
  → kpa_members / kpa_applications 생성 없음
  → 운영자 화면에 표시되지 않음
```

### 1-B. 운영자 회원 목록 API

```
MemberManagementPage.tsx
  apiClient.get('/members', ...) → GET /api/v1/kpa/members
    → kpa_members 테이블 조회
    → status 필터 없으면 전체 (pending/active/rejected/suspended 모두 표시)

  apiClient.get('/applications/admin/stats') → GET /api/v1/kpa/applications/admin/stats
    → kpa_applications 테이블의 submitted 건수 반환
    → "가입 신청" 탭 카운트로 사용
```

### 1-C. 탭 구성 vs 실제 데이터 흐름

| 탭 | API | 테이블 | Register 흐름에서 생성 |
|---|---|---|---|
| 전체/약사/약대생/승인대기/승인완료 | GET /kpa/members | `kpa_members` | ✅ (service='kpa-society' 시) |
| 가입 신청 | GET /kpa/applications/admin/stats | `kpa_applications` | ❌ **생성되지 않음** |

**구조적 문제**: `RegisterModal` 가입 흐름은 `kpa_applications`를 생성하지 않는다.  
따라서 "가입 신청" 탭 카운트는 등록 직후 항상 0이다.  
신규 가입자는 "승인대기" 탭(`kpa_members.status='pending'`)에서만 조회 가능하다.

---

## 2. 실명 추적 결과

### 2-A. 김용우 (pharmabase@nate.com)

**조사 방법:** 프로덕션 로그 + `/__debug__/user?email=pharmabase@nate.com`

| 항목 | 값 |
|------|---|
| User ID | `6c91544f-cd3c-40b3-ac24-aaaecaba9fca` |
| 이름 | 김용우 |
| 등록 시각 | 2026-05-12T01:52:16 |
| 이메일 인증 | 미완료 |
| service_memberships | `serviceKey='neture'`, `status='pending'`, `role='supplier'` |
| role_assignments | 없음 |
| **kpa_members** | **없음** |
| businessName | 파마링크케이알 |

### 2-B. 조훈 (chojj22@naver.com)

**조사 방법:** 프로덕션 로그 + `/__debug__/user?email=chojj22@naver.com`

| 항목 | 값 |
|------|---|
| User ID | `f72fb8a9-47b1-4ead-b7fe-2ca99edefdbc` |
| 이름 | 조훈 |
| 등록 시각 | 2026-05-12T01:57:37 |
| 이메일 인증 | 미완료 |
| service_memberships | `serviceKey='neture'`, `status='pending'`, `role='supplier'` |
| role_assignments | 없음 |
| **kpa_members** | **없음** |
| businessName | 하이리빙아파트 |

### 2-C. 핵심 판정

**두 사람 모두 `serviceKey='neture'`, `role='supplier'`로 등록되었다.**

즉, KPA Society 회원으로 가입한 것이 아니라 **Neture 공급자(supplier)로 가입**되었다.

- `createKpaRecords()`는 `data.service === 'kpa-society'` 조건을 검사한다.
- 두 사람의 등록 payload에 `service: 'neture'`가 전달되었으므로 이 조건이 실패했다.
- 결과: `kpa_members` 레코드가 생성되지 않아 KPA 운영자 화면에 표시되지 않는다.

---

## 3. 왜 `service='neture'`로 등록되었는가

### 3-A. 등록 경로 분석

로그에서 확인된 요청 body:
- 조훈: `{ agreeTerms, agreePrivacy, agreeMarketing, businessNumber, businessType, companyName, role: 'supplier', ... }`
- `RegisterModal`은 `tos`, `privacyAccepted` 필드를 사용한다 (agreeTerms/agreePrivacy 아님)

이 차이는 **두 사람이 KPA Society의 `RegisterModal`이 아닌 다른 등록 양식을 사용했음을 의미한다**.

### 3-B. 추정 원인

**가능성 1 (높음): Neture 사이트에서 supplier 등록**  
- 두 사람이 kpa-society.co.kr이 아닌 neture.co.kr에서 공급자 등록 양식을 사용
- 로그에서 Neture 관련 API 호출(neture/content, neture hub) 이후 등록 요청이 발생

**가능성 2 (중간): KPA Society 내 잘못된 링크/리디렉션**  
- KPA Society 페이지에 Neture supplier 등록 링크가 존재하고, 사용자가 이를 통해 등록

**가능성 3 (낮음): RegisterModal 코드 버그**  
- `RegisterModal`이 특정 조건에서 `service: 'neture'`를 전송하는 코드 분기가 있을 가능성
- 현재 코드 검토 결과 RegisterModal은 `service: 'kpa-society'`를 하드코딩 → 가능성 낮음

---

## 4. 누락 원인 체계적 판정

| 항목 | 판정 |
|------|------|
| DB에 계정이 있는가 | ✅ `users` 테이블에 존재 |
| kpa_members에 있는가 | ❌ 없음 |
| service_memberships kpa-society가 있는가 | ❌ 없음 (`neture`만 있음) |
| role_assignments에 kpa 역할이 있는가 | ❌ 없음 |
| 운영자 회원관리 API에서 조회되는가 | ❌ 없음 (kpa_members 없음) |
| 누락 원인 | **service_key 불일치**: `kpa-society`가 아닌 `neture`로 저장됨 |
| 저장 자체 실패 | ❌ 저장은 성공 (201 응답, users + service_memberships 생성됨) |
| 다른 테이블에만 저장 | ⚠️ `neture` service_memberships에만 저장됨 |
| 운영자 목록 API 조회 조건 누락 | ❌ API 자체는 정상 |
| 프론트 필터/탭 계산 오류 | 부분적 (가입 신청 탭이 kpa_applications 기준 → 항상 0) |

---

## 5. 부가 발견: "가입 신청" 탭 구조 불일치

### 현재 구조
```
"가입 신청" 탭 카운트 = kpa_applications.submitted 건수
```

### 실제 가입 흐름이 생성하는 데이터
```
RegisterModal → kpa_members (status='pending')
            ≠ kpa_applications (submitted)
```

**결론**: 신규 가입자는 "승인대기" 탭에는 표시되지만, "가입 신청" 탭에는 **영구적으로 0**이다.  
"가입 신청" 탭의 `kpa_applications` 테이블은 RegisterModal 흐름과 연결되지 않는다.  
현재 이 탭이 의미 있으려면 별도의 `kpa_applications` 생성 흐름이 있어야 하는데, 존재하지 않는다.

---

## 6. 수정이 필요한 경우 최소 수정 방안

### Case A. 두 사람을 KPA 회원으로 등록 처리 (운영자가 직접 처리)

1. DB에서 두 사람의 `service_memberships`를 `kpa-society`로 추가하거나 수정
2. `kpa_members` 레코드를 수동 생성 (status='pending', membership_type='...')
3. 운영자가 승인 처리

### Case B. KPA 가입 경로 오입력 방지 (프론트 개선)

- KPA Society 사이트에서 supplier/파트너 등록 경로가 노출되지 않도록 검토
- 혹은 가입 완료 화면에서 서비스 키 확인 메시지 추가

### Case C. "가입 신청" 탭 동작 수정 (프론트)

- "가입 신청" 탭의 카운트를 `kpa_members.status='pending'` 기준으로 변경
- 또는 "승인대기" 탭(이미 정상 동작)만 사용하고 "가입 신청" 탭 제거

---

## 7. 관련 파일

| 파일 | 역할 | 주목 사항 |
|------|------|----------|
| `services/web-kpa-society/src/components/RegisterModal.tsx` | KPA Society 가입 모달 | `service: 'kpa-society'` 하드코딩 — 정상 |
| `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts` | 회원가입 처리 | `createKpaRecords()` — service 조건 분기 |
| `services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx` | 운영자 회원 목록 | "가입 신청" 탭 = kpa_applications (구조 불일치) |
| `apps/api-server/src/routes/kpa/controllers/member.controller.ts` | 회원 목록 API | `GET /kpa/members` — kpa_members 조회 |
| `apps/api-server/src/routes/kpa/controllers/application.controller.ts` | 신청서 API | `GET /kpa/applications/admin/stats` — kpa_applications 조회 |
| `services/web-kpa-society/src/pages/MemberApplyPage.tsx` | 레거시 신청 페이지 | `/api/v2/roles/apply` → role_applications (운영자 화면 연결 없음) |

---

## 판정 요약

| 질문 | 판정 |
|------|------|
| 가입 신청 데이터가 저장되었는가 | ✅ 저장됨 — 단, `neture` service로 저장 |
| KPA members 테이블에 있는가 | ❌ 없음 |
| service_key 불일치인가 | ✅ **핵심 원인**: `kpa-society`가 아닌 `neture`로 등록됨 |
| 운영자 목록 API 문제인가 | ❌ API 자체는 정상 |
| "가입 신청" 탭 0 원인 | `kpa_applications` ≠ `kpa_members` 구조 불일치 (별도 문제) |
| 권장 다음 WO | `WO-O4O-KPA-MEMBER-APPLICATION-RECOVERY-V1` — 두 사람 수동 KPA 등록 처리 + "가입 신청" 탭 count 기준 수정 |
