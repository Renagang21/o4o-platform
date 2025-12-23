# Document Policy

> O4O 플랫폼 문서 운영 정책

**Version:** 1.0  
**Date:** 2025-12-23  
**Status:** Active

---

## 1. 문서의 역할 정의

### 1.1 문서는 기준이다

O4O 플랫폼에서 문서는 **기록물이 아니라 기준점**이다.

- **문서 = 현재 시스템의 정의**
- **코드 = 문서의 구현체**
- **대화/조사 = 문서의 입력 재료**

### 1.2 문서의 우선순위

시스템 이해의 우선순위:

1. **기준 문서** (\_platform, services/\*/\*-definition.md, apps/\*/app-definition.md)
2. **현황 문서** (current-status.md, service-status.md)
3. **코드**
4. **기타 문서** (reports, investigations)

---

## 2. 문서 계층별 책임

### 2.1 `_platform/` - 플랫폼 정책

**책임:** 플랫폼 전체의 불변 원칙 정의

**변경 권한:** 플랫폼 아키텍트  
**변경 영향:** 전체 시스템  
**변경 빈도:** 매우 낮음 (분기 1회 이하)

**포함 문서:**
- platform-definition.md
- core-boundary.md
- app-classification.md
- ai-usage-policy.md
- refactoring-policy.md
- document-policy.md (본 문서)

### 2.2 `_environment/` - 환경 정책

**책임:** 배포, 인프라, CI/CD 정책

**변경 권한:** DevOps 팀  
**변경 영향:** 배포 프로세스  
**변경 빈도:** 낮음 (월 1회 이하)

### 2.3 `services/{service-name}/` - 서비스 정의

**책임:** 서비스별 정의, 정책, 현황

**변경 권한:** 서비스 오너  
**변경 영향:** 해당 서비스  
**변경 빈도:** 중간 (주 1회 이하)

**필수 문서:**
- service-definition.md
- service-policy.md
- service-status.md

### 2.4 `services/{service-name}/apps/{app-name}/` - 앱 정의

**책임:** 앱별 정의, 동작, 현황

**변경 권한:** 앱 개발자  
**변경 영향:** 해당 앱  
**변경 빈도:** 높음 (개발 시마다)

**필수 문서:**
- app-definition.md
- app-behavior.md
- current-status.md

### 2.5 `_shared/` - 공통 모듈

**책임:** 공통 모듈 후보 및 설계 규칙

**변경 권한:** 플랫폼 아키텍트  
**변경 영향:** 여러 서비스  
**변경 빈도:** 낮음

---

## 3. 문서 생명주기

### 3.1 생성 시점

| 문서 유형 | 생성 시점 |
|----------|----------|
| service-definition.md | 서비스 기획 완료 시 |
| service-policy.md | 서비스 정책 확정 시 |
| service-status.md | 서비스 첫 앱 개발 시작 시 |
| app-definition.md | 앱 개발 시작 시 |
| app-behavior.md | 앱 핵심 로직 구현 시 |
| current-status.md | 앱 첫 기능 구현 완료 시 |

### 3.2 갱신 시점

| 문서 유형 | 갱신 시점 |
|----------|----------|
| current-status.md | **모든 기능 추가/변경 시 (필수)** |
| app-behavior.md | 핵심 로직 변경 시 |
| app-definition.md | 앱 역할/책임 변경 시 |
| service-status.md | 앱 추가/제거 시 |
| service-policy.md | 서비스 정책 변경 시 |

### 3.3 종료/폐기 기준

**Archive 이동 원칙:**

- **investigations/** - 조사 완료 후 즉시
- **drafts/** - 정식 문서로 승격되거나 폐기 시
- **deprecated/** - 앱/서비스 제거 시

**Archive 이동 절차:**

1. 문서 상단에 `[ARCHIVED]` 표시
2. Archive 날짜 기록
3. 대체 문서 링크 (있는 경우)
4. `docs/archive/` 하위로 이동

---

## 4. 개발 완료 규칙 (핵심)

### 4.1 개발 완료의 정의

> **개발 완료는 코드 완료가 아니라,  
> 기준 문서 업데이트 완료 시점이다.**

### 4.2 개발 작업 완료 조건

모든 개발 작업은 다음 조건을 **모두** 만족해야 완료로 간주된다:

- [x] 코드 구현 완료
- [x] 관련 `current-status.md` 업데이트
- [x] 필요 시 `app-behavior.md` 반영
- [x] 필요 시 `app-definition.md` 반영

### 4.3 문서 갱신 없는 작업

**문서 갱신이 없는 완료 보고는 "미완료"로 간주된다.**

예외:
- 버그 수정 (기능 변경 없음)
- 리팩토링 (동작 변경 없음)
- 성능 최적화 (기능 변경 없음)

단, 위 예외도 **동작이 변경되면 문서 갱신 필수**.

### 4.4 문서 갱신 체크리스트

개발 완료 시 확인:

```markdown
## 문서 업데이트 체크리스트

- [ ] current-status.md 업데이트 (구현 완료 기능 추가)
- [ ] app-behavior.md 검토 (핵심 로직 변경 시)
- [ ] app-definition.md 검토 (역할 변경 시)
- [ ] service-status.md 검토 (앱 추가/제거 시)
```

---

## 5. Work Order와 문서의 관계

### 5.1 Work Order 필수 항목

모든 Work Order는 다음을 명시해야 한다:

```markdown
## 영향받는 문서

- `docs/services/{service}/apps/{app}/current-status.md`
- `docs/services/{service}/apps/{app}/app-behavior.md`
- (기타)
```

### 5.2 Work Order 종료 시 확인

Work Order 종료 전 확인:

- [ ] 명시된 모든 문서가 업데이트되었는가?
- [ ] 새로 생성된 기능이 current-status.md에 반영되었는가?
- [ ] 변경된 동작이 app-behavior.md에 반영되었는가?

### 5.3 문서 미반영 시 조치

문서가 반영되지 않은 Work Order는:

1. **완료로 간주하지 않음**
2. 문서 반영 후 재검토
3. 반복 시 Work Order 반려

---

## 6. 문서 작성 원칙

### 6.1 사실만 기록

- ✅ "X 기능이 구현되어 있음"
- ❌ "X 기능이 잘 구현되어 있음"
- ❌ "X 기능을 개선해야 함"

### 6.2 현재 상태만 기록

- ✅ "현재 Y 기능은 부분 구현됨"
- ❌ "Y 기능을 완성할 예정임"
- ❌ "Y 기능은 나중에 추가될 것임"

### 6.3 평가 금지

- ✅ "Z 기능은 미구현"
- ❌ "Z 기능이 없어서 문제임"
- ❌ "Z 기능을 추가하면 좋을 것임"

---

## 7. 문서 검증

### 7.1 자동 검증 (향후)

- 모든 앱에 current-status.md 존재 확인
- Work Order 종료 시 문서 업데이트 확인
- 문서 형식 검증

### 7.2 수동 검증

- 주간 문서 리뷰
- 분기별 문서 감사

---

## 8. 예외 처리

### 8.1 긴급 핫픽스

긴급 핫픽스의 경우:

1. 코드 먼저 배포
2. **24시간 이내 문서 반영 필수**
3. 문서 미반영 시 기술 부채로 등록

### 8.2 실험적 기능

실험적 기능의 경우:

- current-status.md에 "실험 단계" 명시
- 정식 기능 전환 시 문서 업데이트

---

## 9. 이 정책의 적용

### 9.1 적용 범위

- **모든 서비스**
- **모든 앱**
- **모든 개발자**
- **모든 Work Order**

### 9.2 적용 시작일

**2025-12-23부터 즉시 적용**

### 9.3 기존 문서

- 기존 문서는 점진적으로 이 정책에 맞춰 정비
- 신규 개발은 즉시 이 정책 적용

---

## 10. 정책 변경

이 정책의 변경은:

- 플랫폼 아키텍트 승인 필요
- 변경 이력 기록 필수
- 전체 팀 공지 필수

---

*Version: 1.0*  
*Last Updated: 2025-12-23*  
*Owner: Platform Architecture Team*
