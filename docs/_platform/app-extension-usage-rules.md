# App Extension Usage Rules (O4O Platform)

> **Status**: Active
> **Created**: 2025-12-24
> **Phase**: R4 App Structure Cleanup

---

## 1. Extension 정의

Extension은 Core 패키지의 기능을 특정 도메인이나 서비스에 맞게 확장하는 패키지다.

### 1.1 Extension vs Core
| 구분 | Core | Extension |
|------|------|-----------|
| 역할 | 도메인 기반 기능 | Core 확장/특화 |
| 의존 방향 | 독립적 | Core에 의존 |
| 변경 빈도 | 낮음 (FROZEN 가능) | 높음 |
| 서비스 결합 | 느슨함 | 밀접함 |

### 1.2 계층 구조
```
Core (Layer 0)
  ↑
Extension (Layer 1)
  ↑
Feature/Service (Layer 2)
```

---

## 2. Extension 유형

### 2.1 역할 기반 Extension
특정 사용자 역할을 위한 기능 확장

```
cosmetics-seller-extension   → 셀러 역할
cosmetics-supplier-extension → 공급업체 역할
cosmetics-partner-extension  → 파트너 역할
```

**사용 조건**:
- 역할별로 명확히 다른 UI/기능 필요
- 공통 Core 기반 위에 역할 특화 로직
- 역할 간 의존성 없음

### 2.2 서비스 특화 Extension
특정 서비스(비즈니스)를 위한 기능 확장

```
forum-yaksa      → 약사회 포럼
forum-cosmetics  → 화장품 포럼
lms-yaksa        → 약사회 LMS
```

**사용 조건**:
- 서비스별 비즈니스 로직 분리 필요
- Core 기능을 서비스 요구에 맞게 커스터마이징
- 서비스 간 충돌 방지

### 2.3 통합 Extension (Integration Layer)
두 개 이상의 Core를 연결하는 얇은 레이어

```
organization-forum → organization-core + forum-core
organization-lms   → organization-core + lms-core (계획)
```

**사용 조건**:
- 두 Core 간 연결이 필요한 경우만
- manifest + 최소 연결 코드만 포함 (5줄 이하 권장)
- 비즈니스 로직 포함 금지

---

## 3. Extension 사용 규칙

### 3.1 의존성 규칙

**허용**:
```
Extension → Core ✅
Extension → Utility ✅
Extension → types/utils ✅
```

**금지**:
```
Core → Extension ❌
Extension → Extension (같은 레벨) ❌
Extension → api-server ❌
Extension → apps/* ❌
```

### 3.2 Entity 규칙

| 규칙 | 설명 |
|------|------|
| Core Entity 수정 금지 | Extension에서 Core Entity를 변경할 수 없음 |
| 확장 Entity 허용 | Extension 전용 Entity 생성 가능 |
| Soft FK 권장 | Core Entity 참조 시 UUID로 느슨한 연결 |

**예시**:
```typescript
// ✅ 올바른 패턴 - Extension 전용 Entity
@Entity('cosmetics_seller_profiles')
export class CosmeticsSellerProfile {
  @Column()
  sellerId: string;  // Soft FK to Seller

  @Column()
  cosmeticsLicense: string;  // Extension 전용 필드
}

// ❌ 금지 패턴 - Core Entity 수정
// Seller entity에 cosmeticsLicense 추가 시도
```

### 3.3 Service 규칙

| 규칙 | 설명 |
|------|------|
| Core Service 호출 허용 | Extension에서 Core Service 사용 가능 |
| Core Service 상속 허용 | 필요시 Core Service 확장 가능 |
| Core Service 수정 금지 | Core Service 코드 직접 변경 불가 |

---

## 4. 통합 Extension 특별 규칙

### 4.1 정의
통합 Extension은 두 Core 간의 연결만 담당하는 최소 패키지다.

### 4.2 필수 조건
- manifest.ts만 필수 (5줄 이하)
- 비즈니스 로직 포함 금지
- 양쪽 Core의 타입만 re-export

### 4.3 예시: organization-forum
```typescript
// manifest.ts
export const manifest = {
  id: 'organization-forum',
  name: 'Organization Forum Integration',
  type: 'extension',
  dependencies: ['organization-core', 'forum-core'],
};

// index.ts - 타입 re-export만
export * from '@o4o/organization-core';
export * from '@o4o/forum-core';
```

### 4.4 통합 Extension 목록

| 패키지 | 연결 Core | 상태 |
|--------|-----------|------|
| `organization-forum` | organization + forum | Active |
| `organization-lms` | organization + lms | Planned |

---

## 5. Extension 생성 판단 기준

### 5.1 Extension이 필요한 경우
- [ ] 특정 서비스만을 위한 로직이 필요
- [ ] Core 기능의 역할별 분리가 필요
- [ ] 두 Core 간 연결이 필요
- [ ] 서비스별 Entity 확장이 필요

### 5.2 Extension이 불필요한 경우
- [ ] Core에 직접 추가해도 되는 범용 기능
- [ ] 단순 UI 변경 (ui 패키지에서 처리)
- [ ] 설정 변경으로 해결 가능
- [ ] 이미 유사한 Extension 존재

---

## 6. Extension AppStore 등록 규칙

### 6.1 등록 조건
| 조건 | 필수 여부 |
|------|-----------|
| manifest.ts 존재 | 필수 |
| lifecycle/ 폴더 존재 | 필수 |
| 연결 서비스 Active/Development | 필수 |

### 6.2 Hidden 처리 조건
- 연결 서비스가 Experimental
- 연결 서비스가 Legacy
- 테스트/개발 전용

---

## 7. 의도적 분리 사례

다음 패키지들은 통합 대상이 아닌 **의도적 분리**:

### 7.1 member-yaksa vs membership-yaksa
| 패키지 | 역할 | 사용자 |
|--------|------|--------|
| `member-yaksa` | 사용자 앱 | 일반 회원 |
| `membership-yaksa` | 관리자 앱 | 관리자 |

→ 역할 기반 분리, 통합 금지

### 7.2 cosmetics-* extensions
| 패키지 | 역할 |
|--------|------|
| `cosmetics-seller-extension` | 셀러 |
| `cosmetics-supplier-extension` | 공급업체 |
| `cosmetics-partner-extension` | 파트너 |

→ 각각 독립된 비즈니스 역할, 통합 금지

---

*Phase R4: WO-R4-APP-STRUCTURE-CLEANUP-V1*
*Updated: 2025-12-24*
