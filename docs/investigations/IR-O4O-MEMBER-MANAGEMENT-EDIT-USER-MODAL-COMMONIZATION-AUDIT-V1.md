# IR-O4O-MEMBER-MANAGEMENT-EDIT-USER-MODAL-COMMONIZATION-AUDIT-V1

**Date**: 2025-02-12  
**Investigator**: Claude Code  
**Scope**: EditUserModal structure across Neture, GlycoPharm, K-Cosmetics, KPA  
**Purpose**: Identify commonization scope and design risks

---

## 1. 전체 판정

### 현황 분석
O4O 플랫폼의 EditUserModal은 **이미 상당 부분 공통화되었으나, 구조적 설계 차이로 인해 단순 통합의 함정이 존재한다.**

- **기존 진행**: WO-O4O-OPERATOR-EDITUSER-MODAL-PHASE1-NETURE-GP-KCOS-V1 완료
  - Neture / GlycoPharm / K-Cosmetics: CommonEditUserModal 을 경량 wrapper로 채택
  - KPA: 별도 KpaEditUserModal 구현 (entity/API 차이)

- **공통화 완성도**: 약 85%
  - 기본 필드 (이름, 닉네임, 연락처)
  - 사업자 정보 (businessName, businessNumber, address)
  - 회원 유형 (membershipRole)
  - 운영 권한 (adminRole)
  - 프로필 분류 (serviceKey별 sub_role, 현재 K-Cosmetics만)

- **미공통화 영역**:
  - KPA 약국 정보 필드군
  - KPA 상태 변경 엔드포인트 분리
  - KPA activity_type 자동 권한 부여 로직

### 판정
**Phase 2 공통화 권장 수준: MEDIUM-HIGH**
- 낮은 위험으로 범위 확장 가능
- 단, KPA는 entity/API 구조 차이로 별도 유지 필수
- admin/operator 권한 분기는 추상화 가능

---

## 2. 조사한 파일

### operator-core-ui 공통 모달
- packages/operator-core-ui/src/modules/members/CommonEditUserModal.tsx
- packages/operator-core-ui/src/modules/members/KpaEditUserModal.tsx
- packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx
- packages/operator-core-ui/src/modules/members/types.ts
- packages/operator-core-ui/src/modules/members/components/MemberHardDeleteConfirmModal.tsx

### 서비스별 thin wrapper
- services/web-glycopharm/src/pages/operator/EditUserModal.tsx
- services/web-k-cosmetics/src/pages/operator/EditUserModal.tsx
- services/web-neture/src/pages/operator/EditUserModal.tsx

### 서비스별 페이지
- services/web-glycopharm/src/pages/operator/UsersPage.tsx
- services/web-k-cosmetics/src/pages/operator/UsersPage.tsx
- services/web-neture/src/pages/operator/UsersManagementPage.tsx
- services/web-glycopharm/src/pages/admin/GlycoPharmAdminMembersPage.tsx
- services/web-k-cosmetics/src/pages/admin/KCosmeticsAdminMembersPage.tsx
- services/web-neture/src/pages/admin/AdminMemberManagementPage.tsx

---

## 3. 서비스별 EditUserModal 사용 현황 요약

| 서비스 | 회원 유형 | 운영 권한 | profileClassification | Hard Delete | 비고 |
|--------|---------|---------|-----|------|------|
| Neture | supplier, partner | neture:operator, admin | ✗ | ✓ | status tabs 지원 |
| GlycoPharm | pharmacy, supplier | glycopharm:operator, admin | ✗ | ✓ | DeleteRiskModal |
| K-Cosmetics | seller, consumer, pharmacist, supplier, partner | cosmetics:operator, admin | ✓ (subRole) | ✓ | store_owner/staff |
| KPA | pharmacist, student | (내부 유형) | ✗ | ✓ | 별도 entity/API |

---

## 4. CommonEditUserModal 핵심 구조

### Props
```typescript
interface CommonEditUserModalProps {
  userId: string;           // users.id
  config: EditUserModalConfig;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditUserModalConfig {
  serviceKey: 'neture' | 'glycopharm' | 'k-cosmetics';
  makeRequest: ApiRequestFn;
  membershipRoleOptions: EditUserModalOption[];
  adminRoleOptions: EditUserModalOption[];
  businessInfoLabel?: string;      // "사업자 정보" vs "약국 정보"
  businessNameLabel?: string;
  profileClassification?: ProfileClassificationConfig;  // K-Cosmetics only
}
```

### 폼 필드 (12개)
lastName, firstName, nickname (required), phone, businessName, businessNumber, taxEmail, businessType, businessCategory, zipCode, address1, address2

### 저장 시퀀스
1. PUT /operator/members/{userId} — 기본정보 + role
2. DELETE + POST — admin role 변경 (있으면)
3. PATCH /cosmetics/members/{userId} — profile classification (K-Cos만)

---

## 5. KPA KpaEditUserModal 특이성

### 근본적 차이
- **entity**: kpa_members.id (users.id 아님)
- **API**: PATCH /members/:id/info vs PATCH /members/:id/status (분리)
- **필드**: 17개 (pharmacy_name, activity_type, license_number 등)
- **특수 로직**: activity_type=pharmacy_owner 선택 시 store_owner 자동 부여 (warnings[] 포함)

### 공통화 불가 이유
1. entity ID 차이 (근본적)
2. API 엔드포인트 설계 차이 (info/status 분리)
3. activity_type → store_owner 자동 부여 로직
4. warnings[] 응답 처리

**결론**: KPA는 절대 CommonEditUserModal에 통합하지 말 것

---

## 6. profileClassification (K-Cosmetics 유일)

```typescript
interface ProfileClassificationConfig {
  label: string;                         // "매장 역할"
  options: EditUserModalOption[];         // [store_owner, store_staff]
  fetchPath: (userId) => string;         // GET 경로
  patchPath: (userId) => string;         // PATCH 경로
  responseField: string;                 // 응답의 필드명 (e.g., 'subRole')
}
```

**확장 가능성**: 높음 (이미 구현됨, 문서화 부족)

---

## 7. 공통 필드 분석

### 모든 서비스 공통 (14개)
lastName, firstName, nickname (required), phone, businessName, businessNumber, taxEmail, businessType, businessCategory, zipCode, address1, address2, membershipRole, adminRole

### 서비스별 추가 필드
- **K-Cosmetics**: profileClassification (subRole)
- **Neture**: 없음
- **GlycoPharm**: 없음
- **KPA**: activity_type, pharmacy_name, pharmacy_phone 등 10개 추가

---

## 8. 저장 API 비교

### CommonEditUserModal
```
1. PUT /operator/members/{userId}
2. DELETE /operator/members/{userId}/roles/{role} + POST ...
3. PATCH /cosmetics/members/{userId} (K-Cos profileClassification)
```

### KpaEditUserModal
```
1. PATCH /members/{id}/info
2. PATCH /members/{id}/status
```

---

## 9. Admin 페이지 hard delete 현황

### MemberHardDeleteConfirmModal (공통)
- UI: "완전삭제" 입력 확인 모달
- optional `children` slot: 서비스별 위험 정보

### 서비스별 구현
- **Neture**: AdminMemberDeleteModal 래핑
- **GlycoPharm**: DeleteRiskModal (forum post/comment 카운트)
- **K-Cosmetics**: simple confirm
- **KPA**: AdminMemberManagementPage hard delete 전용

**통합 기회**: admin hard delete modal 통합 가능 (Medium Risk)

---

## 10. 공통화 설계 안 비교

### 안 A: 현상 유지
- **비용**: 0
- **위험**: Low (변경 없음)
- **단점**: 코드 중복, 유지보수 비용

### 안 B: profileClassification 확장
- **변경**: 모든 서비스에서 선택적 사용 (현재는 가능, 문서화만 필요)
- **비용**: ~1일 (문서화)
- **위험**: Low

### 안 C: Admin hard delete 통합 (권장)
- **변경**: MemberHardDeleteConfirmModal 확장 + 3개 서비스 adapter
- **비용**: ~3일
- **위험**: Medium (API 호출 순서 확인 필요)

### 안 D: CommonEditUserModal에 KPA 통합 (강력 비권장)
- **비용**: ~5일
- **위험**: Very High (조건부 로직 폭증, 회귀 위험)
- **결론**: 절대 금지

---

## 11. W-B 권장 범위

### Phase 2 우선 순위

1. **profileClassification 문서화** (B안, ~1일)
   - EditUserModalConfig 사용법
   - 각 서비스 config 참조 예시

2. **Admin hard delete 통합** (C안, ~3일)
   - MemberHardDeleteConfirmModal 확장 (riskInfo children, mode select)
   - GlycoPharm / K-Cosmetics / Neture adapter 작성
   - API 호출 순서 테스트

3. **KPA 별도 유지 공식화** (문서화, ~1일)
   - "KPA는 entity/API 차이로 Phase 3+에서 재평가"

---

## 12. 위험 요소

### 피해야 할 것
- ❌ KPA를 CommonEditUserModal에 통합
- ❌ 공통 modal에 서비스별 conditionals 추가 (isKpa, showActivityType)
- ❌ entity ID 차이를 무시한 통합

### 완화책
- profileClassification: responseField 명시 (이미 구현)
- hard delete: DI 기반 soft/hard delete flow adapter
- 문서화: 각 서비스의 config/API endpoint 명시

---

## 13. O4O Philosophy Alignment

### 현재 구조 평가
✓ **철학 준수**: thin wrapper + DI 기반 config
✗ **개선 필요**: profileClassification 범용성 문서화, KPA 계획 명시

### 권장 개선
1. EditUserModalConfig JSDoc 강화 (profileClassification 확장 가이드)
2. KPA: "Phase 3에서 재평가" 공식 문서화
3. admin hard delete: DI 기반 soft/hard delete policy 추상화

---

## 14. 다음 WO 제안

### 단기 (1개월)
1. WO-O4O-OPERATOR-EDITUSER-MODAL-DOCUMENTATION-EXPANSION-V1
   - profileClassification 확장 가이드, 각 서비스 config 참조
   - 비용: ~1일

2. WO-O4O-OPERATOR-EDITUSER-MODAL-PHASE2-ADMIN-DELETE-COMMONIZATION-V1
   - MemberHardDeleteConfirmModal 확장, 3개 서비스 hard delete adapter
   - 비용: ~3일

### 중기 (2-3개월)
3. WO-O4O-OPERATOR-EDITUSER-MODAL-PHASE3-ENTITY-ABSTRACTION-EVALUATION-V1
   - KPA entity/API 차이 최종 평가 (통합 vs 별도 유지)
   - 비용: ~2-3일 분석 + 구현

---

## 15. 최종 요약

**공통화 현황**: 85% (Neture/GP/K-Cos 통합, KPA 별도)

**Phase 2 권장 범위**:
- profileClassification 문서화 (Low Risk)
- admin hard delete 통합 (Medium Risk)
- KPA 별도 유지 공식화

**절대 금지**: KPA를 CommonEditUserModal에 통합

**평가 시점**: Phase 3 (3-6개월) - KPA entity 구조 변경 가능성 재평가

