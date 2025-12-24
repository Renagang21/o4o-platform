# App Structure Boundary (Phase R4 기준)

> **Status**: Active
> **Created**: 2025-12-24
> **Investigation**: IR-20251224-R4-APP-BOUNDARY

---

## 1. R4 작업 범위 결정

### 결론: Option A (구조/경계 정리만)

Phase R4는 **기존 패키지 통합을 수행하지 않는다.**
현재 아키텍처가 이미 CLAUDE.md 기준을 충족하므로,
**문서화와 거버넌스 규칙 수립**에 집중한다.

---

## 2. 현황 분석 (조사 결과)

### 2.1 패키지 통계

| 항목 | 값 |
|------|-----|
| 총 패키지 수 | 61개 |
| 중복 패키지 | 0개 |
| 금지된 의존성 | 0건 |
| FROZEN Core 위반 | 0건 |

### 2.2 도메인별 구조

| 도메인 | Core | Extensions | Features | 상태 |
|--------|------|------------|----------|------|
| Forum | forum-core | 4개 | - | 정상 |
| Cosmetics | - | 7개 | - | 정상 |
| Yaksa | - | - | 10개 | 정상 |
| Organization | organization-core (FROZEN) | 2개 | - | 정상 |

### 2.3 의도적 분리 사례

다음 패키지들은 **통합 대상이 아님**:

1. **member-yaksa vs membership-yaksa**
   - member-yaksa: 사용자 앱
   - membership-yaksa: 관리자 앱
   - 의도된 분리 (역할 기반)

2. **organization-forum, organization-lms**
   - 얇은 통합 레이어 (5줄 manifest)
   - Core 간 연결 역할
   - 분리 유지 권장

3. **cosmetics-* extensions**
   - seller, supplier, partner, display
   - 각각 독립된 비즈니스 역할

---

## 3. R4 수행 범위 (DO/DON'T)

### ⭕ R4에서 수행할 작업

1. **경계 문서화**
   - 도메인별 패키지 관계도 작성
   - 통합 확장(integration extension) 사용 기준 정의

2. **거버넌스 규칙 수립**
   - 새 패키지 생성 시 검토 기준
   - AppStore 등록 필수 조건 명확화

3. **명명 규칙 표준화**
   - domain-core, domain-extension, domain-app 패턴
   - 약어 사용 규칙 (yaksa, cosmetics 등)

### ❌ R4에서 수행하지 않을 작업

1. **패키지 통합/병합**
   - forum-cosmetics → forum-core ❌
   - member-yaksa + membership-yaksa ❌
   - organization-forum → forum-core ❌

2. **FROZEN Core 수정**
   - auth-core, cms-core, platform-core, organization-core

3. **기능 리팩토링**
   - 중복 코드 제거 (R5+ 범위)
   - 성능 최적화 (R5+ 범위)

---

## 4. 통합 필요 판단 기준

향후 패키지 통합이 필요한 경우 아래 기준을 적용:

### 통합 수행 조건 (모두 충족 시)

1. 두 패키지가 **동일 도메인** + **동일 역할**
2. 분리 이유가 **역사적 우연** (의도적 분리 아님)
3. 통합 시 **의존성 방향** 위반 없음
4. 통합 후 **테이블 스키마 변경** 없음

### 통합 금지 조건 (하나라도 해당 시)

1. FROZEN Core와 연관
2. 역할이 명확히 다름 (user vs admin)
3. 도메인이 다름
4. 통합 시 순환 의존성 발생

---

## 5. R4 완료 기준 (DoD)

- [ ] 도메인별 패키지 관계도 문서화
- [ ] 통합 확장 사용 기준 문서화
- [ ] 새 패키지 생성 검토 체크리스트 작성
- [ ] 명명 규칙 가이드 작성

---

*Investigation: IR-20251224-R4-APP-BOUNDARY*
*Updated: 2025-12-24*
