# Service Template Versioning

> Phase 10 - Service Evolution Layer

이 문서는 O4O Platform의 Service Template 버전 관리 시스템을 설명합니다.

---

## 1. 개요

Service Template Versioning은 서비스 템플릿의 진화를 가능하게 하는 핵심 시스템입니다.

### 주요 기능

- **Semantic Versioning**: 모든 템플릿은 `major.minor.patch` 형식의 버전을 가집니다
- **Multiple Version Support**: 하나의 템플릿 ID에 여러 버전이 공존 가능
- **Version Resolution**: 다양한 전략으로 적절한 버전 선택
- **Migration Scripts**: 버전 간 자동 마이그레이션 지원
- **Deprecation Handling**: 구버전 폐기 프로세스 관리

---

## 2. Template Version Schema

### VersionedServiceTemplate 구조

```typescript
interface VersionedServiceTemplate {
  templateId: string;           // 템플릿 ID (예: "yaksa-intranet-template")
  version: string;              // 시맨틱 버전 (예: "2.1.0")
  label: string;                // 표시 이름
  description: string;          // 설명
  serviceGroup: string;         // 서비스 그룹 (cosmetics, yaksa 등)

  coreApps: string[];           // 필수 Core Apps
  extensionApps?: string[];     // 선택적 Extension Apps
  globalCoreApps?: string[];    // 전역 Core Apps

  initPack: string;             // 연결된 InitPack ID
  autoInstall: boolean;         // 자동 설치 여부

  changelog: ChangelogEntry[];  // 변경 이력
  migrationScripts?: MigrationScript[];  // 마이그레이션 스크립트

  deprecated?: boolean;         // 폐기 여부
  deprecationMessage?: string;  // 폐기 메시지
  recommendedUpgradeVersion?: string;  // 권장 업그레이드 버전

  releasedAt: Date;             // 릴리스 날짜
  isActive: boolean;            // 활성 상태
}
```

### Changelog Entry 타입

| 타입 | 설명 |
|------|------|
| `added` | 새로운 기능 |
| `changed` | 기존 기능 변경 |
| `deprecated` | 폐기 예정 기능 |
| `removed` | 제거된 기능 |
| `fixed` | 버그 수정 |
| `security` | 보안 패치 |

---

## 3. Version Resolution 전략

템플릿 버전 선택 시 사용 가능한 전략:

### 3.1 latest

```typescript
// 항상 최신 버전 사용
versionedTemplateRegistry.resolveVersion({
  templateId: 'yaksa-intranet-template',
  strategy: 'latest'
});
```

### 3.2 stable

```typescript
// 최신 안정(비-deprecated) 버전 사용
versionedTemplateRegistry.resolveVersion({
  templateId: 'yaksa-intranet-template',
  strategy: 'stable'
});
```

### 3.3 pinned

```typescript
// 지정된 버전으로 고정
versionedTemplateRegistry.resolveVersion({
  templateId: 'yaksa-intranet-template',
  strategy: 'pinned',
  currentVersion: '1.5.0'
});
```

### 3.4 compatible

```typescript
// 조건을 만족하는 최신 버전
versionedTemplateRegistry.resolveVersion({
  templateId: 'yaksa-intranet-template',
  strategy: 'compatible',
  constraints: [
    { operator: '>=', version: '2.0.0' },
    { operator: '<', version: '3.0.0' }
  ]
});
```

---

## 4. Service Version Binding

각 테넌트(서비스)는 특정 템플릿 버전에 바인딩됩니다.

```typescript
interface ServiceVersionBinding {
  tenantId: string;
  templateId: string;
  pinnedVersion: string;        // 고정된 버전
  installedVersion: string;     // 현재 설치된 버전
  lastUpgradeAt?: Date;         // 마지막 업그레이드 시간
  autoUpgrade: boolean;         // 자동 업그레이드 여부
  upgradeChannel: 'stable' | 'latest' | 'manual';
}
```

### Upgrade Channel 설명

| 채널 | 동작 |
|------|------|
| `stable` | 안정 버전만 자동 업그레이드 |
| `latest` | 모든 새 버전 자동 업그레이드 |
| `manual` | 수동 업그레이드만 |

---

## 5. Deprecation Process

### 5.1 단계별 프로세스

1. **Deprecation 선언**: 버전에 `deprecated: true` 설정
2. **경고 기간**: 기존 사용자에게 deprecation 경고 표시
3. **End of Life**: `endOfLifeDate` 이후 사용 차단
4. **제거**: 레지스트리에서 완전 제거

### 5.2 Deprecation 예시

```json
{
  "templateId": "yaksa-intranet-template",
  "version": "1.0.0",
  "deprecated": true,
  "deprecationMessage": "보안 취약점으로 인해 폐기됨. v2.0.0으로 업그레이드하세요.",
  "recommendedUpgradeVersion": "2.0.0",
  "endOfLifeDate": "2025-06-01"
}
```

---

## 6. 버전 관리 모범 사례

### DO's

- 모든 변경사항을 changelog에 기록
- Breaking change는 major 버전 증가
- 폐기 전 충분한 경고 기간 제공
- Migration script 제공으로 원활한 업그레이드 지원

### DON'T's

- 릴리스된 버전의 내용 수정 금지
- Major 버전 변경 없이 breaking change 금지
- 충분한 공지 없이 버전 폐기 금지

---

## 7. API Reference

### Template Registry API

```typescript
// 모든 버전 조회
versionedTemplateRegistry.getAllVersions('yaksa-intranet-template');

// 특정 버전 조회
versionedTemplateRegistry.getTemplateVersion('yaksa-intranet-template', '2.0.0');

// 최신 버전 조회
versionedTemplateRegistry.getLatestVersion('yaksa-intranet-template');

// 최신 안정 버전 조회
versionedTemplateRegistry.getLatestStableVersion('yaksa-intranet-template');

// 업그레이드 경로 계산
versionedTemplateRegistry.calculateUpgradePath('yaksa-intranet-template', '1.0.0', '2.0.0');

// 마이그레이션 스크립트 조회
versionedTemplateRegistry.getMigrationScripts('yaksa-intranet-template', '1.0.0', '2.0.0');
```

---

*최종 업데이트: 2025-12-11*
