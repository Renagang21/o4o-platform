# member-yaksa Phase 0 App Bootstrap Report

**Work Order ID**: `WO-MEMBER-YAKSA-PHASE0-APP-BOOTSTRAP`
**Date**: 2025-12-18
**Status**: Completed

---

## 1. Executive Summary

member-yaksa Phase 0 (App Bootstrap & Policy Fixation)이 완료되었습니다.
- 패키지 구조 생성
- manifest.ts에 정책 주석 고정
- lifecycle 핸들러 구현
- 라우트 스켈레톤 생성

---

## 2. Implementation Summary

### 2.1 생성된 파일

```
packages/member-yaksa/
├── package.json
├── tsconfig.json
└── src/
    ├── manifest.ts              # 정책 주석 고정
    ├── index.ts
    ├── lifecycle/
    │   ├── install.ts
    │   ├── activate.ts
    │   ├── deactivate.ts
    │   └── index.ts
    ├── backend/
    │   ├── routes/index.ts      # 라우트 스켈레톤
    │   └── index.ts
    └── frontend/
        └── placeholder.ts
```

---

## 3. 정책 고정 (Policy Fixation)

### 3.1 manifest.ts에 고정된 정책 (DO NOT DELETE)

```typescript
/**
 * member-yaksa Policy Fixation
 *
 * 1. pharmacistLicenseNumber (약사 면허번호)
 *    - 약사 고유 식별자
 *    - 조회만 가능 (READ-ONLY)
 *    - 사용자 직접 수정 불가
 *    - 수정 필요 시 관리자에게 요청 (본회 확인 필수)
 *
 * 2. Pharmacy Information (약국 정보)
 *    - 약사 본인만 수정 가능
 *    - 관리자 수정 불가 (Privacy Protection)
 *    - 수정 시 "본인 책임" 안내 필수
 *
 * 3. Home UX Priority (홈 화면 우선순위)
 *    1) Organization Notice (지부/분회 공지)
 *    2) Groupbuy (공동구매 - 진행 중인 캠페인)
 *    3) LMS (필수 교육 - 미이수 항목)
 *    4) Forum (게시판 - 최신 글)
 *    5) Banner (배너 - 광고/이벤트)
 *
 * 4. Access Control (접근 제어)
 *    - 약사회 회원(pharmacist)만 접근 가능
 *    - 조직 멤버십 기반 인증
 *    - 지부/분회별 컨텐츠 스코프 적용
 */
```

---

## 4. Manifest 정보

| 항목 | 값 |
|------|-----|
| appId | `member-yaksa` |
| name | 약사회 회원 |
| type | `extension` |
| version | 1.0.0 |
| status | development |
| serviceGroup | yaksa |

### 4.1 Dependencies

- `organization-core` - 조직 관리 (지부/분회)
- `membership-yaksa` - 회비 관리
- `lms-yaksa` - 교육 관리
- `forum-yaksa` - 게시판
- `groupbuy-yaksa` - 공동구매

### 4.2 Routes

| Route | 설명 |
|-------|------|
| `/member/home` | 통합 홈 화면 |
| `/member/profile` | 회원 프로필 (면허번호 읽기전용) |
| `/member/pharmacy` | 약국 정보 (본인만 수정 가능) |

### 4.3 Permissions

- `member:profile:read`
- `member:profile:write:self`
- `member:pharmacy:read`
- `member:pharmacy:write:self`
- `member:home:read`

---

## 5. Lifecycle Handlers

### 5.1 install.ts

- Phase 0: 로그 출력만
- Phase 1+: 엔티티 마이그레이션 추가 예정

### 5.2 activate.ts

- 라우트 등록
- 권한 스코프 활성화

### 5.3 deactivate.ts

- 라우트 비활성화
- 리소스 정리

---

## 6. Definition of Done 체크리스트

| 항목 | 상태 |
|------|------|
| 패키지 생성 완료 | ✅ |
| manifest.ts 작성 | ✅ |
| 정책 주석 고정 | ✅ |
| lifecycle 파일 생성 | ✅ |
| 라우트 스켈레톤 생성 | ✅ |
| 빌드 성공 | ✅ |
| feature 브랜치 푸시 | ✅ |

---

## 7. 다음 단계

### Phase 1: MemberProfile 엔티티 설계

- 면허번호 필드 (READ-ONLY)
- 약국 정보 필드 (owner-only 수정)
- organization-core 연동

---

**Phase 0 상태**: ✅ **Completed**

---

*Generated: 2025-12-18*
*Author: Claude Code*
