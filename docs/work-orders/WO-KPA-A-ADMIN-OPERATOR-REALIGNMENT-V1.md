# WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1

**Admin / Operator 전면 재정렬 정비 작업 지시서**

> 작성일: 2026-02-15
> 근거: IR-KPA-A-ADMIN-OPERATOR-STRUCTURE-AUDIT-V1
> 상태: In Progress

---

## 설계 기준 (불변 원칙)

```
구조 생성/삭제        → requireKpaScope('kpa:admin')
Role 부여/회수        → requireKpaScope('kpa:admin')
정책 변경            → requireKpaScope('kpa:admin')
운영 실행            → requireKpaScope('kpa:operator')
콘텐츠 관리          → requireKpaScope('kpa:operator')
운영 조회            → requireKpaScope('kpa:operator')
공개 조회            → optionalAuth 또는 없음
```

## Phase 진행 현황

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | Guard 체계 통일 | In Progress |
| Phase 2 | Router 구조 분리 | Pending (Phase 1 후) |
| Phase 3 | Role Assignment 재설계 | In Progress |
| Phase 4 | LMS Owner 검증 | In Progress |
| Phase 5 | Frontend 재정렬 | In Progress |
| Phase 6 | Legacy 제거 | Pending |

---

*Updated: 2026-02-15*
