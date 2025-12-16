# 2차 조사 보고서: AppStore & Lifecycle 심층 조사

**조사 일자**: 2025-12-16
**조사 목적**: AppStore 실체 규명 및 Lifecycle 동작 확인
**조사 단계**: 2차 (코드 수정 없음, 현황 파악만)

---

## 1. 핵심 질문에 대한 답변

### Q1. AppStore는 "상태를 관리하는 시스템"인가, "설치 이벤트만 흉내 내는 장치"인가?

**답변: 현재는 "설치 이벤트만 흉내 내는 장치"에 가깝다.**

**근거:**
- AppStore는 Core App이 아닌 **api-server 내부 서비스** (`AppStoreService.ts`)
- 상태 저장소가 **메모리 기반** (`ModuleLoader.registry = new Map()`)
- 서버 재시작 시 **모든 상태 초기화**
- DB 영속성 없음 (app_registry 테이블 업데이트 시도하나, 이는 CMS에서 사용)

---

### Q2. lifecycle.install은 어떤 context로 실행되는가?

**답변: 필수 context가 누락된 상태로 실행된다.**

| 위치 | 실제 전달 | 기대 (hook 정의) |
|------|----------|-----------------|
| `AppStoreService.installApp()` line 89 | `{ appId }` | `{ dataSource, manifest, logger }` |
| `ModuleLoader.activateModule()` line 235 | `{ appId, manifest }` | `{ dataSource, manifest, logger }` |
| `AppStoreService.deactivateApp()` | `{ appId }` | `{ dataSource, manifest, logger }` |
| `AppStoreService.uninstallApp()` | `{ appId }` | `{ dataSource, manifest, logger, purgeData }` |

**Critical Issue**: **dataSource가 전달되지 않음** → DB 작업 실패

---

### Q3. install과 activate는 구분되어 있는가?

**답변: 설계상 분리되어 있으나, 실행에서 문제가 있다.**

**설계된 책임:**
| 단계 | 책임 | 실제 코드 |
|------|------|----------|
| **install** | 테이블 생성, 초기 데이터 시딩 | cms-core: 16개 테이블 생성 |
| **activate** | View/Navigation 등록, 라우트 활성화 | cms-core: viewRegistry, navigationRegistry 등록 |

**실행 문제:**
1. **서버 시작 시 install 미실행**
   ```
   main.ts:
   await moduleLoader.loadAll();        // manifest 로드
   await moduleLoader.activateModule(); // activate만 실행
   // ❌ install 호출 없음!
   ```

2. **AppStore API로 install 시에도 context 불일치**
   ```typescript
   // AppStoreService.installApp() line 89
   const installContext = { appId };  // ❌ dataSource 없음
   await appModule.lifecycle.install(installContext);
   ```

---

### Q4. 서버 재시작 시 어떤 상태가 유지/소멸되는가?

**답변: 모든 앱 상태가 소멸된다.**

| 상태 | 재시작 후 |
|------|----------|
| 설치됨 (installed) | ❌ 소멸 |
| 활성화됨 (active) | ❌ 소멸 |
| Registry 등록 | ❌ 소멸 → 다시 로드 |
| DB 테이블 | ✅ 유지 |
| app_registry 레코드 | ✅ 유지 (있다면) |

**현재 동작:**
```
서버 시작 → loadAll() → 모든 manifest 스캔 → activateModule() → 상태: active
→ 실제로는 "전부 active"가 아니라 "전부 새로 로드"됨
```

---

### Q5. "설치됨 but 메뉴/라우팅 없음" 현상의 원인은?

**답변: 복합적 원인 (3가지 가능성)**

1. **lifecycle 미완성** (6개 앱)
   - install.ts/activate.ts 파일 없음 또는 빈 구현
   - Registry 등록 코드 없음

2. **Context 불일치로 activate 실패**
   - dataSource 없이 호출 → DB 업데이트 실패
   - 하지만 상태는 'active'로 표시됨 (silent failure)

3. **disabled-apps.registry 등록**
   - 빌드 에러로 비활성화된 8개 앱
   - 로드 자체가 안 됨

---

## 2. 체크리스트 점검 결과

### A. AppStore 기본 구조 인식

| 항목 | 답변 | 근거 |
|------|------|------|
| AppStoreService 위치 | api-server 내부 | `apps/api-server/src/services/AppStoreService.ts` |
| AppStore가 Core App인가 | ❌ 아니오 | 서비스 코드, manifest 없음 |
| 단일 진실 소스(SoT) | `ModuleLoader.registry` | 메모리 Map |
| enabled/disabled 저장 | **없음** | 코드 기반 (disabled-apps.registry.ts) |

### B. App Registry 상태 관리

| 항목 | 답변 | 근거 |
|------|------|------|
| "설치됨" 판단 기준 | `registry.has(appId)` | 메모리 존재 여부 |
| disabled-apps.registry 역할 | 로드 제외 목록 | 8개 앱 등록 |
| enabled 상태 데이터 구조 | **없음** | 모두 로드되면 enabled |
| 서버 재기동 후 복원 | ❌ 아니오 | 전부 새로 로드 |

### C. lifecycle.install 실행 흐름

| 항목 | 답변 | 근거 |
|------|------|------|
| install 호출자 | `AppStoreService.installApp()` | line 87-91 |
| 전달되는 context | `{ appId }` | line 89 |
| dataSource 전달 여부 | ❌ 아니오 | **Critical Issue** |
| install 실패 시 처리 | throw → 설치 중단 | line 92-95 |
| 실패했는데 "설치됨" 상태 | ❌ 아니오 | 예외 발생 시 중단 |

### D. install vs activate 책임 분리

| 항목 | 답변 | 근거 |
|------|------|------|
| install 책임 정의 | ✅ 예 | 테이블 생성, 데이터 시딩 |
| activate 책임 정의 | ✅ 예 | Registry 등록, 상태 업데이트 |
| 두 단계 코드 혼재 | ❌ 아니오 | 분리되어 있음 |
| activate 실제 호출 여부 | ✅ 예 | `main.ts` line 435 |

### E. deactivate / uninstall 흐름

| 항목 | 답변 | 근거 |
|------|------|------|
| deactivate 상태 변화 | `status: 'inactive'` | `ModuleLoader` line 286 |
| 메뉴/라우트/view 제거 | ✅ 구현됨 | cms-core deactivate.ts |
| uninstall 리소스 제거 | ✅ 구현됨 | cms-core uninstall.ts |
| uninstall 후 흔적 | ⚠️ 부분 | app_registry는 삭제, 테이블은 조건부 |
| uninstall TODO/미구현 | ✅ 있음 | AppStoreService line 137 주석 |

### F. CMS / Router / AppStore 연계

| 항목 | 답변 | 근거 |
|------|------|------|
| AppStore → CMS Registry 전달 | ❌ 아니오 | 직접 연결 없음 |
| lifecycle → View/Navigation 반영 | ✅ 예 | activate.ts에서 호출 |
| 앱 비활성화 시 CMS 정리 | ✅ 구현됨 | deactivate.ts |
| "설치됨 but 메뉴 없음" 설명 | **Context 불일치** | dataSource 없이 activate 실패 |

### G. 실제 증상과의 연결성

| 항목 | 답변 | 근거 |
|------|------|------|
| lifecycle 미완성 6개 앱 상태 | 로드됨, 활성화 실패 가능 | lifecycle 파일 없음 |
| install/activate 실행 여부 | activate만 실행 | main.ts 확인 |
| registry 등록 여부 | 부분적 | context 불일치로 실패 가능 |
| 메뉴/라우트 미노출 인과관계 | **확인됨** | Context 불일치 |

---

## 3. AppStore의 현재 실체 정의

### 3.1 AppStore가 하고 있는 것

1. **앱 카탈로그 관리** - 정적 목록 (`appsCatalog.ts`)
2. **앱 로드** - workspace 스캔, manifest import
3. **앱 활성화 시도** - activate hook 호출 (context 불완전)
4. **라우트 등록** - `getModuleRouter()` (여기서만 dataSource 전달)
5. **ServiceGroup 필터링** - Phase 6 기능

### 3.2 AppStore가 못하고 있는 것

1. **상태 영속성** - 서버 재시작 시 상태 소멸
2. **정확한 Context 전달** - dataSource/logger 누락
3. **install hook 실행** - 서버 시작 시 미호출
4. **진정한 설치/제거** - 물리적 패키지 관리 없음
5. **앱 간 의존성 버전 검증** - 버전 호환성 체크 없음

### 3.3 AppStore의 현재 위상

```
설계된 역할:    실제 역할:
┌──────────┐   ┌──────────┐
│ App 설치 │   │ App 로드 │ ← loadAll()로 manifest 스캔
│ App 활성화│   │ 부분 활성화│ ← context 불완전
│ 상태 관리 │   │ 메모리 임시│ ← 재시작 시 소멸
│ Lifecycle │   │ 부분 실행 │ ← install 미호출
└──────────┘   └──────────┘
```

---

## 4. lifecycle 구조 평가

### 평가: **설계상 정상, 실행상 미완성**

| 구분 | 상태 | 설명 |
|------|------|------|
| 설계 | ✅ 정상 | install/activate/deactivate/uninstall 4단계 분리 |
| 책임 분리 | ✅ 정상 | 각 단계 역할 명확 |
| 파일 구조 | ⚠️ 부분 | 6개 앱 lifecycle 미완성 |
| Context 정의 | ✅ 정상 | `InstallContext` 등 인터페이스 존재 |
| **Context 전달** | ❌ 실패 | **dataSource 미전달** |
| **실행 시점** | ❌ 실패 | **서버 시작 시 install 미호출** |

---

## 5. 상태 영속성 문제의 실체

### 5.1 문제인가?

**예, 문제이다.** 하지만 현재 운영 방식에서는 **허용 가능할 수 있다.**

### 5.2 현재 동작 (문제 없는 경우)

```
서버 시작 → loadAll() → activateModule() → 모든 앱 active
```
- 모든 앱이 매번 로드되므로, "설치" 개념이 불필요
- 테이블은 DB에 유지되므로 데이터 손실 없음

### 5.3 현재 동작 (문제 있는 경우)

```
앱 X를 비활성화 → 서버 재시작 → 앱 X가 다시 active
```
- 비활성화 상태가 유지되지 않음
- 특정 앱만 끄고 싶은 경우 불가능

### 5.4 판단

| 시나리오 | 허용 가능성 |
|----------|------------|
| 모든 앱이 항상 켜져 있어야 함 | ✅ 허용 가능 |
| 특정 앱만 끄고 싶음 | ❌ 불가능 |
| 앱 설치/제거 개념 필요 | ❌ 불가능 |
| 멀티테넌트 앱 분리 | ❌ 불가능 |

---

## 6. 후속 조치 분류

### 6.1 지금 고치면 안 되는 구조 문제

1. **AppStore를 Core App으로 재배치**
   - 현재: api-server 내부 서비스
   - 목표: `packages/platform-core` 또는 별도 Core App
   - 이유: 플랫폼 핵심 기능이 api-server에 종속

2. **앱 상태 영속성 저장소 설계**
   - 현재: 메모리 Map
   - 목표: DB 테이블 또는 설정 파일
   - 이유: 아키텍처 결정 필요

### 6.2 Core 재배치가 필요한 문제

1. **lifecycle Context 정정**
   - `ModuleLoader.activateModule()`에 dataSource 전달
   - `AppStoreService.installApp()`에 dataSource 전달
   - 위치: api-server 내부이므로 가능하나, Core 이동 후 수행 권장

2. **서버 시작 시 install 호출 여부 결정**
   - 옵션 A: 매 시작마다 install (멱등성 보장 필요)
   - 옵션 B: 최초 1회만 install (상태 영속성 필요)
   - 이유: 정책 결정 필요

### 6.3 별도 Work Order로 분리할 문제

| 문제 | Work Order |
|------|------------|
| 6개 앱 lifecycle 미완성 | WO-LIFECYCLE-INCOMPLETE |
| disabled-apps 8개 복구 | WO-DISABLED-APPS |
| app_registry 테이블 정합성 | WO-APP-REGISTRY |
| Context 인터페이스 통일 | WO-CONTEXT-UNIFY |

---

## 7. 결론 및 권장사항

### 7.1 AppStore & Lifecycle 상태 요약

| 항목 | 상태 |
|------|------|
| AppStore 설계 | ✅ 기본 구조 있음 |
| AppStore 실행 | ⚠️ 부분 동작 |
| lifecycle 설계 | ✅ 4단계 분리 |
| lifecycle 실행 | ❌ Context 불일치 |
| 상태 영속성 | ❌ 없음 |
| CMS 연계 | ✅ 구현됨 (실행은 불완전) |

### 7.2 핵심 병목 판정

**AppStore & Lifecycle은 플랫폼 안정화의 핵심 병목이다.**

이유:
1. **Context 불일치**로 lifecycle hook이 정상 동작하지 않음
2. **install 미호출**로 테이블 생성/시딩이 불확실
3. **상태 비영속**으로 앱 관리가 불가능
4. **silent failure**로 문제가 드러나지 않음

### 7.3 권장 다음 단계

**3차 조사 방향: Core 재배치 판단**

1. platform-core의 현재 상태 및 역할 확인
2. AppStore를 platform-core로 이동할 경우 영향 범위
3. auth-core entities 마이그레이션과의 연관성
4. 최소 수정으로 Context 문제만 해결할 수 있는지 검토

---

## 8. 파일 경로 참조

### AppStore 관련
- `apps/api-server/src/services/AppStoreService.ts` (line 89: Context 불일치)
- `apps/api-server/src/modules/module-loader.ts` (line 235: Context 불일치)
- `apps/api-server/src/app-manifests/disabled-apps.registry.ts`
- `apps/api-server/src/main.ts` (line 427, 435: 서버 시작 흐름)

### Lifecycle 관련
- `packages/auth-core/src/lifecycle/install.ts` (line 17: InstallContext 정의)
- `packages/cms-core/src/lifecycle/install.ts` (line 10: context 사용)
- `packages/cms-core/src/lifecycle/activate.ts` (line 74: context 사용)
- `packages/cms-core/src/lifecycle/deactivate.ts`
- `packages/cms-core/src/lifecycle/uninstall.ts`

---

*이 보고서는 코드 수정 없이 현황 파악만을 목적으로 작성되었습니다.*
*조치 항목의 실제 구현은 별도 Work Order를 통해 진행되어야 합니다.*
