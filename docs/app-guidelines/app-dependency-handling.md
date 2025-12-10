# App Dependency Handling

**버전:** 2.0.0
**상태:** Active

---

## 1. Purpose

앱 간 의존성 그래프 기반 설치/제거 순서 보장 규칙을 정의한다.

## 2. Overview

- AppStore는 manifest의 `dependencies` 필드를 읽어 DAG(Directed Acyclic Graph)를 생성한다.
- Topological Sort로 설치 순서를, Reverse Sort로 제거 순서를 결정한다.
- 의존성 앱이 있는 Core는 제거가 차단된다.

## 3. Dependency Rules

| 허용 | 금지 |
|------|------|
| Core → Core | Core → Extension |
| Extension → Core | Core → Service |
| Service → Core | Extension → Service |
| Service → Extension | Service → Service |

## 4. Install Flow

```
1. Manifest 로드 → dependencies 수집
2. Topological Sort → 설치 순서 결정
3. 순차 설치 (Core 먼저 → Extension → Service)
4. Lifecycle hook 실행 (install → activate)
```

**버전 체크**: semver로 호환성 검사 (`>=1.0.0` 형식)

## 5. Uninstall Flow

```
1. 의존성 확인 (findDependentApps)
2. 의존 앱이 있으면 → 차단 또는 force cascade
3. Reverse Topological Sort → 제거 순서 결정
4. 순차 제거 (Extension/Service 먼저 → Core)
```

## 6. Error Types

| Error | 원인 | 해결 |
|-------|------|------|
| DependencyError | 의존 앱이 존재하는데 Core 제거 시도 | 의존 앱 먼저 제거 |
| VersionMismatchError | 버전 요구사항 불충족 | Core 업그레이드 |
| CyclicDependencyError | 순환 의존성 감지 | manifest 수정 |

## 7. Rules

1. **manifest dependencies 필수**: 의존 앱은 반드시 manifest에 선언한다.
2. **순환 의존성 금지**: Core 간에도 순환 의존성 금지.
3. **Core 제거 차단**: 의존 Extension/Service가 있으면 Core 제거 불가.
4. **버전 명시**: semver 형식으로 최소 버전을 명시한다.
5. **Lifecycle 순서**: install/activate/deactivate/uninstall 순서를 지킨다.

---

## Related Documents

- [manifest-guideline.md](./manifest-guideline.md)
- [extension-lifecycle.md](../design/architecture/extension-lifecycle.md)

---
*최종 업데이트: 2025-12-10*
