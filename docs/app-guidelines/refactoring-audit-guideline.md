# Refactoring & Audit Guideline (v1.0)

> O4O Platform 대규모 리팩토링 및 점검 가이드라인
> Claude Code가 리팩토링 작업 수행 시 반드시 참조해야 하는 기준 문서

---

## 1. Purpose

이 문서는 O4O Platform 전체에 걸쳐 **대규모 리팩토링, Core 변경, Extension 영향 점검, AppStore 구조 변경**이 필요할 때
**반드시 준수해야 하는 절차와 검사 기준**을 정의한다.

리팩토링은 단순한 코드 변경이 아니라:

- 데이터 구조
- 앱 간 의존 관계
- Core API
- lifecycle
- Frontend / Backend 연결
- AppStore 설치 흐름

까지 영향을 미치므로 확실한 기준이 필요하다.

---

## 2. Scope

이 Guideline은 다음 상황에서 반드시 적용된다:

- Core App 구조 변경
- Core Entity/Service 변경
- Extension App 구조 변경
- Service App 구조 변경
- API 경로 변경
- Domain 모델 변경
- AppStore 구조 변경
- Lifecycle 변경
- 테넌트(SaaS) 구조 변경
- 프로젝트 전체 Frontend 재배치
- DB schema 재설계

---

## 3. Core Principles (핵심 원칙)

### 3.1 "Refactoring은 기능 추가가 아니다."

리팩토링은 기능을 변경하는 것이 아니라
**구조적 안정성을 높이고 유지보수성을 강화하는 작업**이다.

### 3.2 "리팩토링 전에 반드시 전체 영향도를 검토해야 한다."

단일 앱 변경이라도 Core의 일부를 건드리면
Service App 전체가 무너질 수 있다.

### 3.3 "Core 우선, Extension 후행"

Core가 안정된 구조를 가지지 않으면
Extension & Service가 고정되지 않는다.

### 3.4 "AppStore 기반 시스템에서 리팩토링은 'install/activate/uninstall' 흐름을 100% 고려해야 한다."

---

## 4. Pre-Refactoring Audit Checklist (가장 중요한 섹션)

리팩토링을 시작하기 전 반드시 아래 항목을 전수조사해야 한다.

### 4.1 Manifest 검사

**필수항목:**

- appId
- version
- appType
- dependencies(core/extension)
- ownsTables
- exposes
- lifecycle 경로

**검사 기준:**

- manifest 선언과 실제 코드(import/entity/service)가 일치하는가?
- missing dependency가 없는가?
- requiredApps 충족 여부 확인

---

### 4.2 Dependency Audit

**검사 항목:**

- Core 간 순환 의존성
- Extension -> Core 의존성 정상 여부
- Core -> Extension 잘못된 의존성 존재 여부
- Service App 간 import 여부
- api-server 상대경로 import 여부
- 패키지 간 잘못된 tsconfig paths 존재 여부

**검사 기준:**

- "Core -> Extension import" 발견 시 즉시 중단 (CRITICAL)
- "Extension -> Service" import 발견 시 즉시 중단 (CRITICAL)
- api-server import 발견 시 즉시 중단 (CRITICAL)

---

### 4.3 Lifecycle Audit

**필수 검사:**

- install 존재 여부
- uninstall 존재 여부
- activate/deactivate 존재 여부
- 초기 데이터 생성 로직 확인
- 이벤트 핸들러 등록/해제 확인

**검사 기준:**

- install에서 DB 테이블 누락 없는지
- uninstall에서 orphan data 남지 않는지

---

### 4.4 DB Schema Audit

**검사 항목:**

- entity export 일관성 확인
- entity naming 규칙 준수
- migration 생성 여부
- soft-delete 적용 여부
- foreign key 규칙 확인
- metadata 타입 정의 확인

**검사 기준:**

- Entity 변경 시 반드시 migration 생성
- Core Entity 변경 시 Extension 영향도 분석
- unique/index 충돌 여부 확인

---

### 4.5 API Audit

**검사 항목:**

- API prefix 통일 여부
- DTO 구조 일관성
- controller/service 분리
- pagination/search 규칙 준수

**검사 기준:**

- GET/POST/PUT/DELETE 모두 테스트
- API 변경 시 Frontend 영향 목록 생성

---

### 4.6 Permission & Role Audit

**검사 항목:**

- permission 명명 규칙 준수
- role mapping 충돌 여부
- organization-core 접근 규칙 확인

**검사 기준:**

- Core permission 오버라이드 금지
- Extension permission은 Core permission을 확장하는 구조 허용

---

### 4.7 Frontend Integration Audit

**검사 항목:**

- admin-dashboard 메뉴 자동 생성 규칙 준수
- main-site 페이지 충돌 여부
- hooks/api 구조 사용 여부 (authClient)

---

### 4.8 AppStore Installation Flow Audit

**검사 항목:**

- install -> activate -> deactivate -> uninstall 흐름
- requiredApps 설치 순서
- Core/Extension 충돌 여부

**검사 기준:**

- "dry-run install" 수행하여 설치 가능한지 확인
- uninstall 시 DB 정리 확인

---

## 5. Refactoring Execution Guideline (리팩토링 실행 규칙)

### 5.1 소규모 리팩토링 규칙 (Minor Refactoring)

- Service 로직 분리
- 파일 구조 정리
- naming 정리
- DTO 개선
- 코드 중복 제거

---

### 5.2 대규모 리팩토링 규칙 (Major Refactoring)

대규모 리팩토링은 다음을 포함한다:

- Entity 구조 재설계
- Domain Model 변경
- Core API 재작성
- AppStore manifest 변경
- Lifecycle 변경
- 테넌트 구조 변경
- Core/Extension 분리

**필수:**

- 반드시 Pre-Refactoring Audit(4번 섹션)을 완료해야 한다.

---

### 5.3 Core 변경 시 Extension 영향 처리

Core 변경 시:

1. Extension 영향 리스트 생성
2. 각 Extension App에 수정이 필요한 부분 표시
3. Extension 개발 채널에 Work Order 전달
4. Extension 수정 완료되기 전에는 Core merge 금지

---

### 5.4 리팩토링 실행 순서

리팩토링은 반드시 다음 순서로 실행한다:

1. Core 도메인 분석
2. Pre-Audit 체크리스트 수행
3. 구조 변경안 설계
4. Work Order 생성
5. Extension 영향 점검
6. 구현
7. migration 생성
8. install/uninstall 테스트
9. E2E 테스트
10. merge

---

## 6. Post-Refactoring Validation Checklist

리팩토링 완료 후 반드시 다음 검증 수행:

- [ ] install hook 정상 작동
- [ ] activate 정상
- [ ] API 정상
- [ ] DB schema 충돌 없음
- [ ] Frontend 연결 정상
- [ ] Extension 기능 정상
- [ ] AppStore 설치/삭제 테스트
- [ ] 성능 문제 없는지

---

## 7. Forbidden Changes List (절대 금지 변경)

Extension, Service, Core 개발자 모두에게 적용되는 규칙:

| 금지 사항 | 이유 |
|-----------|------|
| Core -> Extension import | 구조 붕괴 |
| api-server import | AppStore 위반 |
| Extension이 Core entity 수정 | Core 안정성 붕괴 |
| Service App 간 데이터 공유 | 도메인 충돌 |
| Core 서비스 override | 기능 전체 불안정 |
| lifecycle 누락 | 설치 오류 |
| metadata에 임의 필드 추가 | 예측 불가능한 schema |

발견 시 "CRITICAL 리팩토링 필요"로 간주한다.

---

## 8. Refactoring Documentation Requirements

리팩토링 시 반드시 문서화해야 하는 항목:

- 변경된 Domain Model
- 변경된 Entity
- 변경된 API
- 변경된 lifecycle
- Extension 영향 분석
- 마이그레이션 내용
- 테스트 결과
- Release Note

---

## 9. Appendix

- 리팩토링 예시
- Core 변경 플로우 다이어그램
- Extension 영향도 매트릭스

(향후 버전에서 추가 예정)

---

*최종 업데이트: 2025-12-09*
