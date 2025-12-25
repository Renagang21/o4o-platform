# Extension Patterns Reference (C1 정비 결과)

> **Phase**: C1 - Core Extension Cleanup
> **작성일**: 2025-12-25
> **상태**: Active Reference

---

## 1. 확장 패턴 분류

O4O 플랫폼의 Extension은 3가지 패턴으로 분류됩니다.

### 1.1 수직 통합 패턴 (Vertical Integration)

```
Core → Primary Extension → Feature Extensions
```

**특징**:
- Core 기능을 도메인 특화 기능으로 확장
- Primary Extension이 도메인 로직 담당
- Feature Extension은 역할별 UI/워크플로우 담당

**예시**:
```
organization-core
  └── membership-yaksa (Primary)
      ├── member-yaksa (회원 앱)
      ├── reporting-yaksa (신상신고)
      ├── annualfee-yaksa (연회비)
      └── yaksa-admin (관리 센터)
```

### 1.2 수평 통합 패턴 (Cross-Core Integration)

```
Core A + Core B → Integration Extension
```

**특징**:
- 두 Core 간의 연결 레이어
- 자체 테이블 없음 (Thin Layer)
- 이벤트 기반 통합

**예시**:
```
organization-core + forum-core → organization-forum
organization-core + lms-core → organization-lms
```

### 1.3 인프라 유틸리티 패턴

```
Utility Extension (독립)
  ← 사용: 여러 Extension
```

**특징**:
- Core 의존성 없음
- peerDependency로 연결
- 공유 기능 제공

**예시**:
```
yaksa-scheduler (독립)
  ← 사용: membership-yaksa, annualfee-yaksa
```

---

## 2. 3-Sided Platform 패턴

Cosmetics Suite에서 사용하는 다면 플랫폼 구조:

```
dropshipping-core
  └── dropshipping-cosmetics (도메인 특화)
      ├── cosmetics-seller-extension (판매원)
      ├── cosmetics-supplier-extension (공급사)
      └── cosmetics-partner-extension (파트너)
```

**역할 분리**:
| 역할 | Extension | 주요 기능 |
|------|-----------|-----------|
| Seller | cosmetics-seller-extension | 진열, 샘플, 재고, KPI |
| Supplier | cosmetics-supplier-extension | 가격정책, 캠페인, 승인 |
| Partner | cosmetics-partner-extension | 루틴 추천, 수익 정산 |

**통합 레이어**:
- `cosmetics-sample-display-extension`: Seller ↔ Supplier 샘플/디스플레이 통합

---

## 3. Extension 필수 구조

### 3.1 디렉토리 구조

```
packages/<extension>/
  ├── src/
  │   ├── manifest.ts        # 필수
  │   ├── index.ts           # 필수
  │   ├── lifecycle/         # 필수
  │   │   ├── install.ts
  │   │   ├── activate.ts
  │   │   ├── deactivate.ts
  │   │   └── uninstall.ts
  │   ├── backend/           # 선택
  │   │   ├── entities/
  │   │   ├── services/
  │   │   └── controllers/
  │   └── frontend/          # 선택
  │       ├── pages/
  │       └── components/
  └── package.json
```

### 3.2 Manifest 필수 필드

```typescript
export const manifest = {
  // 기본 정보
  id: string,
  appId: string,
  displayName: string,
  version: string,
  appType: 'extension',
  description: string,

  // 의존성
  dependencies: {
    core: string[],
    apps?: string[],
    optional?: string[],
  },

  // 테이블
  ownsTables: string[],

  // 삭제 정책
  uninstallPolicy: {
    defaultMode: 'keep-data' | 'purge-data',
    allowPurge: boolean,
    autoBackup: boolean,
  },

  // Lifecycle
  lifecycle: {
    install: string,
    activate: string,
    deactivate: string,
    uninstall: string,
  },
};
```

---

## 4. E-Commerce Core 연동 규칙

CLAUDE.md §7에 따른 규칙:

### 4.1 주문 생성

```typescript
// ✅ 올바른 방법
const order = await EcommerceOrderService.create({
  orderType: 'dropshipping',
  items: [...],
});

// ❌ 금지 - E-commerce Core 우회
const order = await CustomOrderService.create({...});
```

### 4.2 OrderRelay 연결

```typescript
// dropshipping-core
const relay = await OrderRelayService.create({
  ecommerceOrderId: order.id,  // FK 연결
  supplierId: supplier.id,
  sellerId: seller.id,
});
```

---

## 5. Lifecycle 표준 구현

### 5.1 Install

```typescript
export async function install(dataSource: DataSource): Promise<void> {
  console.log('[app-name] Installing...');
  // 테이블 확인 또는 생성 (Migration 권장)
  // 초기 시드 데이터
  console.log('[app-name] Installation complete');
}
```

### 5.2 Activate

```typescript
export async function activate(dataSource: DataSource): Promise<void> {
  console.log('[app-name] Activating...');
  // 이벤트 리스너 등록
  // 서비스 초기화
  console.log('[app-name] Activation complete');
}
```

### 5.3 Deactivate

```typescript
export async function deactivate(dataSource: DataSource): Promise<void> {
  console.log('[app-name] Deactivating...');
  // 이벤트 리스너 해제
  // 캐시 정리
  console.log('[app-name] Deactivation complete');
}
```

### 5.4 Uninstall

```typescript
export async function uninstall(dataSource: DataSource): Promise<void> {
  console.log('[app-name] Uninstalling...');
  // 데이터 백업 (autoBackup=true인 경우)
  // 테이블 삭제 (allowPurge=true이고 사용자 요청 시)
  console.log('[app-name] Uninstallation complete');
}
```

---

## 6. 현재 Extension 현황

### 6.1 Lifecycle 완결 상태

| 상태 | 수량 |
|------|------|
| 완결 (38개) | 100% |
| 미완결 | 0% |

### 6.2 AppStore Guard 결과

```
[1/4] Manifest + Lifecycle Completeness
   ✅ 38 packages complete, 0 with warnings

[2/4] AppsCatalog Consistency
   ✅ 31/37 required apps in Catalog
   (6개는 Development/Experimental - 허용)

[3/4] FROZEN Core Dependency Guard
   ✅ FROZEN Core integrity maintained

[4/4] Package Naming Convention
   ✅ 38 packages follow naming convention
```

---

## 7. 금지 사항

### 7.1 의존성 규칙

| 허용 | 금지 |
|------|------|
| Extension → Core | Core → Extension |
| Feature → Core | Core → Service |
| Service → Core | Extension → api-server 직접 import |

### 7.2 데이터 규칙

- Core Entity 수정 금지 (FROZEN)
- 다른 Extension의 테이블 직접 접근 금지
- Soft FK 패턴 사용 권장

---

*Phase C1 정비 결과 문서*
*작성일: 2025-12-25*
