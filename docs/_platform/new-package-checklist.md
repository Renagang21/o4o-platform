# New Package Creation Checklist (O4O Platform)

> **Status**: Active
> **Created**: 2025-12-24
> **Phase**: R4 App Structure Cleanup

---

## 사용 방법

새 패키지 생성 전 이 체크리스트를 **반드시** 완료한다.
모든 항목에 체크되지 않으면 패키지 생성을 진행하지 않는다.

---

## 1. 필요성 검증

### 1.1 기존 패키지 확인
- [ ] 동일/유사 기능의 기존 패키지가 없음을 확인
- [ ] 기존 패키지 확장으로 해결 불가능함을 확인
- [ ] `docs/_platform/app-package-map.md`에서 중복 검토 완료

### 1.2 분리 타당성
- [ ] 새 패키지가 필요한 명확한 이유 존재
- [ ] Core에 직접 추가할 수 없는 이유 존재
- [ ] 독립 배포/테스트가 필요한 이유 존재

---

## 2. 타입 결정

### 2.1 패키지 타입 선택
`docs/_platform/app-classification.md` 참조

- [ ] 아래 중 하나의 타입 선택:
  - [ ] `core` - 도메인 핵심 기능
  - [ ] `extension` - Core 확장
  - [ ] `feature` - 역할 기반 기능
  - [ ] `standalone` - 독립 서비스
  - [ ] `utility` - 보조 도구

### 2.2 타입별 추가 확인

**core 선택 시**:
- [ ] 해당 도메인에 Core가 없음 확인
- [ ] FROZEN 정책 준수 가능 확인

**extension 선택 시**:
- [ ] 연결할 Core 패키지 존재 확인
- [ ] 연결 Core가 FROZEN이면 Entity 추가 금지 인지

**feature 선택 시**:
- [ ] 특정 역할(seller/supplier/partner 등) 대상임 확인
- [ ] `*ops` 명명 규칙 적용 여부 검토

---

## 3. 명명 규칙 준수

### 3.1 이름 검증
`docs/_platform/app-naming-guidelines.md` 참조

- [ ] 영문 소문자만 사용
- [ ] 단어 구분은 하이픈(-) 사용
- [ ] 올바른 접미사 사용 (`-core`, `-extension`, `ops`)
- [ ] 금지된 패턴 미사용 (`new-*`, `*-v2`, `*-service`)

### 3.2 도메인 약어 확인
- [ ] 새 약어 사용 시 승인 목록에 등록
- [ ] 기존 약어와 충돌 없음

### 3.3 기존 패키지와 이름 충돌 없음
```bash
ls packages/ | grep -i <proposed-name>
```
- [ ] 위 명령 실행 결과 충돌 없음

---

## 4. 의존성 규칙 준수

### 4.1 허용된 의존성만 사용
- [ ] Core → 다른 Core (허용)
- [ ] Extension → Core (허용)
- [ ] Feature → Core (허용)
- [ ] Utility → 없음 또는 types/utils만 (허용)

### 4.2 금지된 의존성 미사용
- [ ] Core → Extension (금지)
- [ ] Core → Service (금지)
- [ ] Extension → api-server (금지)
- [ ] Any → apps/* 직접 import (금지)

### 4.3 순환 의존성 없음
```bash
npx madge --circular packages/<package-name>
```
- [ ] 위 명령 실행 결과 순환 없음

---

## 5. 필수 파일 구조

### 5.1 기본 파일
- [ ] `package.json` 생성
- [ ] `tsconfig.json` 생성
- [ ] `src/index.ts` 생성

### 5.2 AppStore 대상 패키지 추가 파일
(core/feature/extension/standalone만 해당)

- [ ] `src/manifest.ts` 생성
- [ ] `src/lifecycle/install.ts` 생성
- [ ] `src/lifecycle/activate.ts` 생성
- [ ] `src/lifecycle/deactivate.ts` 생성
- [ ] `src/lifecycle/uninstall.ts` 생성

### 5.3 package.json 필수 필드
```json
{
  "name": "@o4o/<package-name>",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  }
}
```
- [ ] 위 필수 필드 포함 확인

---

## 6. 문서화

### 6.1 문서 업데이트
- [ ] `docs/_platform/app-package-map.md`에 추가
- [ ] `docs/_platform/app-classification.md`에 분류 추가

### 6.2 README 작성 (선택)
- [ ] 패키지 목적 설명
- [ ] 사용 방법 설명
- [ ] 의존성 명시

---

## 7. 최종 확인

### 7.1 빌드 성공
```bash
pnpm -F @o4o/<package-name> build
```
- [ ] 빌드 성공

### 7.2 타입 체크 성공
```bash
pnpm -F @o4o/<package-name> type-check
```
- [ ] 타입 에러 없음

### 7.3 린트 통과 (해당 시)
```bash
pnpm -F @o4o/<package-name> lint
```
- [ ] 린트 에러 없음

---

## 8. 승인 프로세스

### 8.1 PR 생성
- [ ] feature/* 브랜치에서 작업
- [ ] develop 브랜치로 PR 생성
- [ ] 이 체크리스트 완료 내용 PR 설명에 포함

### 8.2 리뷰 요청
- [ ] 코드 리뷰 요청
- [ ] 아키텍처 적합성 확인 요청

---

## 체크리스트 요약

| 단계 | 필수 확인 사항 |
|------|---------------|
| 1. 필요성 | 중복 없음, 분리 타당성 |
| 2. 타입 | 올바른 타입 선택 |
| 3. 명명 | 규칙 준수, 충돌 없음 |
| 4. 의존성 | 허용만 사용, 순환 없음 |
| 5. 파일 | 필수 구조 완비 |
| 6. 문서 | 패키지맵 업데이트 |
| 7. 검증 | 빌드/타입/린트 통과 |
| 8. 승인 | PR 리뷰 완료 |

---

*Phase R4: WO-R4-APP-STRUCTURE-CLEANUP-V1*
*Updated: 2025-12-24*
