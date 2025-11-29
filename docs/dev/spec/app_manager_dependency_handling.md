# AppManager Dependency Handling Specification

## 개요

AppManager는 Core + Extension 앱 구조를 지원하기 위해 의존성 그래프 기반의 설치/제거 순서를 보장해야 합니다.

---

## 핵심 기능

### 1. 의존성 그래프 생성

#### 입력
- 앱 manifest의 `dependencies` 필드

\`\`\`typescript
// forum-neture manifest
{
  appId: "forum-neture",
  dependencies: {
    "forum-core": ">=1.0.0"
  }
}
\`\`\`

#### 출력
- DAG (Directed Acyclic Graph)

\`\`\`typescript
{
  "forum-core": [],
  "forum-neture": ["forum-core"],
  "forum-yaksa": ["forum-core"]
}
\`\`\`

---

### 2. 설치 순서 결정 (Topological Sort)

#### 알고리즘
Kahn's Algorithm 또는 DFS 기반 topological sort

#### 예시

\`\`\`typescript
// 사용자가 forum-neture 설치 요청
const requestedApp = "forum-neture";

// 1. 의존성 트리 수집
const dependencyTree = await collectDependencies(requestedApp);
// → ["forum-core", "forum-neture"]

// 2. Topological sort
const installOrder = topologicalSort(dependencyTree);
// → ["forum-core", "forum-neture"]

// 3. 순차 설치
for (const appId of installOrder) {
  await installSingleApp(appId);
}
\`\`\`

#### 버전 체크

\`\`\`typescript
// forum-neture가 "forum-core": ">=1.0.0" 요구
const installedVersion = await getInstalledVersion("forum-core");
// → "1.2.5"

const isCompatible = semver.satisfies(installedVersion, ">=1.0.0");
// → true

if (!isCompatible) {
  throw new Error(
    `forum-neture requires forum-core >=1.0.0, but ${installedVersion} is installed`
  );
}
\`\`\`

---

### 3. 제거 순서 결정 (Reverse Topological Sort)

#### 의존성 확인

\`\`\`typescript
async function findDependentApps(coreAppId: string): Promise<string[]> {
  const allApps = await getAllInstalledApps();

  const dependents = allApps.filter(app => {
    return app.dependencies &&
           Object.keys(app.dependencies).includes(coreAppId);
  });

  return dependents.map(app => app.appId);
}
\`\`\`

#### 제거 차단

\`\`\`typescript
async function uninstall(appId: string, options?: { force?: boolean }) {
  // 1. 의존성 확인
  const dependents = await findDependentApps(appId);

  // 2. 의존성이 있고 force가 아니면 차단
  if (dependents.length > 0 && !options?.force) {
    throw new DependencyError(
      `Cannot uninstall ${appId}: ` +
      `The following apps depend on it: ${dependents.join(', ')}. ` +
      `Please uninstall these apps first, or use --force to override.`
    );
  }

  // 3. force면 의존성 앱도 함께 제거 (cascade)
  if (options?.force) {
    const removeOrder = reverseTopologicalSort([appId, ...dependents]);
    for (const app of removeOrder) {
      await uninstallSingleApp(app);
    }
  } else {
    await uninstallSingleApp(appId);
  }
}
\`\`\`

---

## 데이터 구조

### App Registry Schema

\`\`\`sql
CREATE TABLE app_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id VARCHAR(100) UNIQUE NOT NULL,
  version VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL,  -- 'core' | 'extension' | 'standalone'
  status VARCHAR(20) NOT NULL,  -- 'installed' | 'active' | 'inactive'
  dependencies JSONB,  -- { "app-id": "version-range" }
  installed_at TIMESTAMP DEFAULT NOW(),
  activated_at TIMESTAMP,
  metadata JSONB
);

-- 인덱스
CREATE INDEX idx_app_registry_status ON app_registry(status);
CREATE INDEX idx_app_registry_type ON app_registry(type);
\`\`\`

### Dependencies Graph (In-Memory)

\`\`\`typescript
interface DependencyGraph {
  [appId: string]: string[];  // appId → [dependent appIds]
}

// 예시
const graph: DependencyGraph = {
  "forum-core": [],
  "forum-neture": ["forum-core"],
  "forum-yaksa": ["forum-core"],
  "catalog-core": [],
  "catalog-neture": ["catalog-core"]
};
\`\`\`

---

## AppManager API

### 설치

\`\`\`typescript
interface InstallOptions {
  skipDependencyCheck?: boolean;
  adoptExistingTables?: boolean;
  seedDefaultData?: boolean;
}

async function install(
  appId: string,
  options?: InstallOptions
): Promise<void> {
  // 1. Manifest 로드
  const manifest = await loadManifest(appId);

  // 2. 의존성 수집
  const dependencies = await collectDependencies(manifest);

  // 3. 설치 순서 결정
  const installOrder = topologicalSort(dependencies);

  // 4. 순차 설치
  for (const depAppId of installOrder) {
    if (!await isInstalled(depAppId)) {
      await installSingleApp(depAppId, options);
    }
  }

  // 5. Registry 업데이트
  await updateRegistry(appId, 'installed');
}
\`\`\`

### 제거

\`\`\`typescript
interface UninstallOptions {
  force?: boolean;
  purgeData?: boolean;
}

async function uninstall(
  appId: string,
  options?: UninstallOptions
): Promise<void> {
  // 1. 의존성 확인
  const dependents = await findDependentApps(appId);

  // 2. 차단 또는 cascade 제거
  if (dependents.length > 0 && !options?.force) {
    throw new DependencyError(
      `Cannot uninstall ${appId}. Dependent apps: ${dependents.join(', ')}`
    );
  }

  // 3. 제거 순서 결정
  const removeOrder = options?.force
    ? reverseTopologicalSort([appId, ...dependents])
    : [appId];

  // 4. 순차 제거
  for (const appToRemove of removeOrder) {
    await uninstallSingleApp(appToRemove, options);
  }

  // 5. Registry 업데이트
  await removeFromRegistry(appId);
}
\`\`\`

### 의존성 조회

\`\`\`typescript
async function findDependentApps(appId: string): Promise<string[]> {
  const query = `
    SELECT app_id
    FROM app_registry
    WHERE dependencies @> $1::jsonb
  `;

  const result = await db.query(query, [JSON.stringify({ [appId]: "*" })]);
  return result.rows.map(row => row.app_id);
}

async function getDependencies(appId: string): Promise<string[]> {
  const app = await db.query(
    'SELECT dependencies FROM app_registry WHERE app_id = $1',
    [appId]
  );

  if (!app.rows[0] || !app.rows[0].dependencies) {
    return [];
  }

  return Object.keys(app.rows[0].dependencies);
}
\`\`\`

---

## Lifecycle Hook 실행

### 설치 시 Hook 순서

\`\`\`typescript
async function installSingleApp(appId: string, options?: InstallOptions) {
  const manifest = await loadManifest(appId);

  // 1. Pre-install validation
  await validateManifest(manifest);
  await checkDatabaseConnection();

  // 2. Run install lifecycle hook
  if (manifest.lifecycle?.install) {
    const installHook = await import(manifest.lifecycle.install);
    await installHook.install({
      appId,
      version: manifest.version,
      db: getDatabase(),
      options: options || manifest.installOptions
    });
  }

  // 3. Run migrations (if core app)
  if (manifest.type === 'core' && manifest.migrations) {
    await runMigrations(manifest.migrations);
  }

  // 4. Register in app_registry
  await registerApp(manifest);

  // 5. Auto-activate (optional)
  if (options?.autoActivate !== false) {
    await activate(appId);
  }
}
\`\`\`

### 제거 시 Hook 순서

\`\`\`typescript
async function uninstallSingleApp(appId: string, options?: UninstallOptions) {
  const manifest = await loadManifest(appId);

  // 1. Deactivate first (if active)
  const status = await getAppStatus(appId);
  if (status === 'active') {
    await deactivate(appId);
  }

  // 2. Run uninstall lifecycle hook
  if (manifest.lifecycle?.uninstall) {
    const uninstallHook = await import(manifest.lifecycle.uninstall);
    await uninstallHook.uninstall({
      appId,
      version: manifest.version,
      db: getDatabase(),
      appManager: this,
      options
    });
  }

  // 3. Remove from registry
  await unregisterApp(appId);
}
\`\`\`

---

## 순환 의존성 감지

\`\`\`typescript
function detectCyclicDependencies(graph: DependencyGraph): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(node: string): boolean {
    visited.add(node);
    recStack.add(node);

    for (const dep of graph[node] || []) {
      if (!visited.has(dep)) {
        if (hasCycle(dep)) return true;
      } else if (recStack.has(dep)) {
        return true;  // Cycle detected
      }
    }

    recStack.delete(node);
    return false;
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      if (hasCycle(node)) return true;
    }
  }

  return false;
}
\`\`\`

---

## 에러 처리

### DependencyError

\`\`\`typescript
class DependencyError extends Error {
  constructor(
    message: string,
    public readonly dependents: string[]
  ) {
    super(message);
    this.name = 'DependencyError';
  }
}
\`\`\`

### VersionMismatchError

\`\`\`typescript
class VersionMismatchError extends Error {
  constructor(
    public readonly appId: string,
    public readonly required: string,
    public readonly installed: string
  ) {
    super(
      `${appId} requires version ${required}, ` +
      `but ${installed} is installed`
    );
    this.name = 'VersionMismatchError';
  }
}
\`\`\`

### CyclicDependencyError

\`\`\`typescript
class CyclicDependencyError extends Error {
  constructor(public readonly cycle: string[]) {
    super(`Cyclic dependency detected: ${cycle.join(' → ')}`);
    this.name = 'CyclicDependencyError';
  }
}
\`\`\`

---

## 구현 우선순위

### Phase 1 (현재 Task F-4/F-5)
- [x] Extension App Manifest 규약 정의
- [x] 문서화
- [ ] app_registry 테이블 스키마 생성
- [ ] 기본 의존성 조회 API

### Phase 2 (향후)
- [ ] Topological sort 구현
- [ ] install/uninstall with dependency resolution
- [ ] Version compatibility check
- [ ] Lifecycle hook integration

### Phase 3 (고급 기능)
- [ ] Cyclic dependency detection
- [ ] Dependency upgrade path
- [ ] Bundle install (multiple apps at once)
- [ ] Rollback support

---

## 테스트 시나리오

### 1. 기본 설치

\`\`\`typescript
// forum-neture 설치 요청
await appManager.install("forum-neture");

// 예상 동작:
// 1. forum-core 설치 (의존성)
// 2. forum-neture 설치
\`\`\`

### 2. 의존성 차단

\`\`\`typescript
// forum-neture, forum-yaksa가 설치된 상태에서
// forum-core 제거 시도
await appManager.uninstall("forum-core");

// 예상 결과:
// DependencyError: Cannot uninstall forum-core:
// The following apps depend on it: forum-neture, forum-yaksa
\`\`\`

### 3. Force 제거

\`\`\`typescript
// Force 옵션으로 cascade 제거
await appManager.uninstall("forum-core", { force: true });

// 예상 동작:
// 1. forum-yaksa 제거
// 2. forum-neture 제거
// 3. forum-core 제거
\`\`\`

### 4. 버전 호환성 체크

\`\`\`typescript
// forum-core 1.0.0이 설치된 상태에서
// forum-neture (requires >=2.0.0) 설치 시도
await appManager.install("forum-neture");

// 예상 결과:
// VersionMismatchError: forum-neture requires forum-core >=2.0.0,
// but 1.0.0 is installed
\`\`\`

---

## 정리

AppManager의 의존성 처리는:
1. **Topological sort**로 설치 순서 보장
2. **의존성 조회**로 제거 시 차단
3. **Version semver**로 호환성 체크
4. **Lifecycle hook**을 올바른 순서로 실행
