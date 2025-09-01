# API Server 의존성 문제 분석 보고서

## 발견된 문제들

### 1. TypeScript 타입 오류 (해결됨)
**문제**: `performance.service.ts`에서 불필요한 `@ts-expect-error` 지시문
**원인**: `AffiliateAnalyticsCache` 엔티티의 `cacheKey` 필드가 실제로 존재함에도 타입 체크 오류 회피
**해결**: 
- `as any` 캐스팅 제거
- 정확한 타입 사용: `where: { cacheKey: key }`

### 2. 순환 참조 문제 (42개 발견)
**주요 순환 참조 패턴**:

#### Entity 간 순환 참조 (가장 심각)
```
1. User.ts ↔ ApprovalLog.ts
2. User.ts ↔ LinkedAccount.ts  
3. User.ts ↔ RefreshToken.ts
4. Cart.ts ↔ CartItem.ts
5. Product.ts ↔ ProductAttribute.ts ↔ ProductAttributeValue.ts
6. Store.ts ↔ SignageSchedule.ts ↔ StorePlaylist.ts
```

#### Service 간 순환 참조
```
31. analytics.service.ts ↔ analytics-cache.service.ts
38. shortcode-parser.service.ts ↔ shortcode-handlers.ts
```

### 3. CORS 설정 문제 (해결됨)
**문제**: preflight 요청에 대한 응답 헤더 누락
**해결**: 명시적 CORS 헤더 설정 미들웨어 추가

## 순환 참조가 일으키는 문제

1. **빌드 시간 증가**: 의존성 해결이 복잡해져 컴파일 시간 증가
2. **메모리 사용량 증가**: 순환 참조로 인한 불필요한 모듈 로딩
3. **런타임 오류 가능성**: 초기화 순서 문제로 undefined 참조 발생
4. **테스트 어려움**: 모킹과 격리된 테스트가 어려워짐
5. **코드 유지보수성 저하**: 결합도가 높아 변경 시 영향 범위 예측 어려움

## 권장 해결 방안

### 1. Entity 순환 참조 해결
```typescript
// 나쁜 예 (순환 참조)
// User.ts
@OneToMany(() => RefreshToken, token => token.user)
refreshTokens: RefreshToken[];

// RefreshToken.ts  
@ManyToOne(() => User, user => user.refreshTokens)
user: User;

// 좋은 예 (단방향 참조)
// RefreshToken.ts만 User를 참조
@ManyToOne(() => User)
user: User;
// User.ts에서는 필요시 repository로 조회
```

### 2. Service 분리
```typescript
// 나쁜 예
// analytics.service.ts imports analytics-cache.service.ts
// analytics-cache.service.ts imports analytics.service.ts

// 좋은 예
// 공통 인터페이스/타입 분리
// interfaces/analytics.interface.ts
export interface IAnalyticsService { ... }
export interface ICacheService { ... }
```

### 3. Lazy Loading 활용
```typescript
// TypeORM Lazy Relations
@ManyToOne(() => User, { lazy: true })
user: Promise<User>;
```

### 4. 이벤트 기반 아키텍처
```typescript
// EventEmitter 또는 NestJS Events 활용
@Injectable()
export class UserService {
  constructor(private eventEmitter: EventEmitter2) {}
  
  async createUser() {
    // ...
    this.eventEmitter.emit('user.created', user);
  }
}
```

## 우선순위별 작업 계획

### 높음 (즉시 수정 필요)
1. ✅ TypeScript 타입 오류 수정
2. ✅ CORS 설정 수정
3. User ↔ RefreshToken 순환 참조 해결
4. analytics.service ↔ analytics-cache.service 순환 참조 해결

### 중간 (1주일 내)
1. Product 관련 엔티티 순환 참조 정리
2. Store 관련 엔티티 순환 참조 정리
3. Service 레이어 의존성 정리

### 낮음 (점진적 개선)
1. 나머지 엔티티 순환 참조 개선
2. 이벤트 기반 아키텍처 도입 검토
3. 모듈 경계 재정의

## 성과

- ✅ TypeScript 빌드 오류 0개 달성
- ✅ CORS 설정 강화
- ✅ 불필요한 타입 캐스팅 제거
- 🔄 42개 순환 참조 발견 및 문서화

## 다음 단계

1. 가장 영향이 큰 User 관련 순환 참조부터 해결
2. CI/CD 파이프라인에 순환 참조 체크 추가
3. 코드 리뷰 시 순환 참조 방지 가이드라인 적용