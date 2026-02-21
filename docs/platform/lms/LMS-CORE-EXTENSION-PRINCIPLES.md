# LMS Core-Extension 분리 원칙

> **상태**: Baseline (확정)
> **적용 범위**: LMS 관련 모든 개발
> **관련**: `LMS-CORE-CONTRACT.md`, `LMS-INSTRUCTOR-ROLE-V1-FREEZE.md`

---

## 1. 분리 이유

LMS를 단일 모듈로 개발 시 특정 도메인(약사회 등) 종속 코드가 Core에 침투하여 재사용·유지보수가 어려워진다.

- **LMS Core**: 모든 학습 시스템에 공통 기능
- **LMS Extension**: 특정 도메인 특화 기능 (예: Yaksa)

---

## 2. Core 담당

| 기능 | 설명 |
|------|------|
| 강좌 구조 | 강좌, 섹션, 레슨 기본 구조 |
| 학습 진도 | 진도율, 완료 상태 추적 |
| 수강 등록 | 등록/해제 기본 메커니즘 |
| 콘텐츠 연결 | Content Core와의 연동 |
| 기본 이벤트 | 학습 시작·완료 등 공통 이벤트 |

## 3. Extension 담당 (예: Yaksa)

| 기능 | 설명 |
|------|------|
| 인증 포인트 | 약사회 평점 연동 |
| 도메인 규칙 | 특화 수료 조건 |
| 외부 연동 | 외부 시스템 API |
| 특화 UI/리포트 | 대시보드, 이수증 |

---

## 4. 의존 방향

```
Extension → Core (허용)
Core → Extension (금지)
```

Core 코드에 Extension 이름이 등장하면 **위반**이다.

### 판단 기준

| 질문 | Core | Extension |
|------|------|-----------|
| 모든 LMS에 필요한가? | ✅ | |
| 특정 도메인에만 필요한가? | | ✅ |
| 외부 시스템 연동? | | ✅ |
| 도메인 특화 규칙? | | ✅ |

---

## 5. 데이터 소유권

### Core 소유 데이터

| 데이터 | 테이블 | 설명 |
|--------|--------|------|
| 강좌 정보 | `lms_courses` | 기본 정보 |
| 섹션/레슨 | `lms_sections`, `lms_lessons` | 커리큘럼 구조 |
| 수강 등록 | `lms_enrollments` | 등록 정보 |
| 학습 진도 | `lms_progress` | 진도 상태 |
| 완료 기록 | `lms_completions` | 레슨/강좌 완료 |

### Extension 소유 데이터 (예: Yaksa)

| 데이터 | 테이블 | 설명 |
|--------|--------|------|
| 인증 포인트 | `yaksa_certification_points` | 약사회 평점 |
| 도메인 설정 | `yaksa_settings` | 특화 설정 |
| 외부 연동 로그 | `yaksa_sync_logs` | 동기화 |
| 특화 완료 조건 | `yaksa_completion_rules` | 도메인 규칙 |

### 접근 규칙

- ✅ Extension → Core API 읽기/쓰기 (정해진 인터페이스)
- ❌ Extension → Core 테이블 직접 쿼리/수정
- ❌ Core → Extension 데이터 접근

### FK 패턴

```
허용: Extension 테이블 → Core 테이블 (FK 참조)
금지: Core 테이블 → Extension 테이블 (FK 참조)
```

### 마이그레이션

- **Core 테이블**: Core 팀 수행, 하위 호환성 유지, 영향도 분석 필수
- **Extension 테이블**: Extension 팀 독립 수행, Core 무영향

---

## 6. 확장 시나리오

새 도메인(의사회, 간호협회 등) 추가 시:
1. LMS Core **수정하지 않음**
2. 새 Extension 생성 (예: `lms-medical-extension`)
3. Extension이 Core API를 활용하여 도메인 규칙 구현

---

*이 문서는 CLAUDE.md §16에서 참조하는 기준 문서이다.*
