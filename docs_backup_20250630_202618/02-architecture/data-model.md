# 🗄️ 데이터베이스 설계 계획서

> **작성일**: 2025-06-24  
> **상태**: 향후 정비용 계획서  
> **기준**: TypeORM + PostgreSQL 16

---

## 📋 **현재 상태**

### **✅ 구현 완료**
- TypeORM 엔티티 9개 정의
- 역할 기반 가격 시스템 로직
- 기본적인 관계 설정

### **📝 향후 정비 필요 사항**

---

## 🏗️ **1. 상세 스키마 정의 필요**

### **현재 부족한 부분**
- 각 컬럼별 상세 제약조건
- 데이터 타입 최적화
- 기본값 및 NULL 허용 정책

### **정비 계획**
```sql
-- 예시: User 테이블 상세 설계
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role_enum NOT NULL DEFAULT 'customer',
  status user_status_enum NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 인덱스
  INDEX idx_users_email (email),
  INDEX idx_users_role_status (role, status),
  INDEX idx_users_created_at (created_at)
);
```

---

## 🔗 **2. 관계 설계 정교화**

### **현재 관계**
- User ↔ Product (생성자)
- User ↔ Cart (소유)
- User ↔ Order (주문자)
- Product ↔ Category (분류)

### **정비 필요 사항**
```typescript
// CASCADE 규칙 명확화
@OneToMany(() => Order, order => order.user, {
  cascade: ['soft-remove'], // 사용자 삭제 시 주문은 보존
  onDelete: 'SET NULL'
})

@OneToMany(() => CartItem, item => item.cart, {
  cascade: ['remove'], // 장바구니 삭제 시 아이템도 삭제
  onDelete: 'CASCADE'
})
```

---

## 💰 **3. 역할별 가격 시스템 고도화**

### **현재 구현**
```typescript
getPriceForUser(userRole: string): number {
  switch (userRole) {
    case 'business': return this.wholesalePrice || this.retailPrice;
    case 'affiliate': return this.affiliatePrice || this.retailPrice;
    default: return this.retailPrice;
  }
}
```

### **향후 확장 계획**
- 수량별 할인 계층
- 지역별 가격 차별화
- 시간대별 특가 시스템
- 멤버십 등급별 혜택

---

## 📊 **4. 성능 최적화 계획**

### **인덱스 전략**
```sql
-- 자주 사용되는 쿼리 패턴별 인덱스
CREATE INDEX idx_products_search ON products 
  USING GIN (to_tsvector('korean', name || ' ' || description));

CREATE INDEX idx_orders_user_date ON orders (user_id, created_at DESC);

CREATE INDEX idx_products_category_status ON products (category_id, status) 
  WHERE status = 'active';
```

### **파티셔닝 고려사항**
- 주문 테이블: 월별 파티셔닝
- 로그 테이블: 일별 파티셔닝
- 대용량 데이터 대비

---

## 🔒 **5. 보안 설계 강화**

### **데이터 암호화**
```typescript
// 민감 정보 암호화
@Column({ type: 'text', transformer: encryptionTransformer })
businessInfo: BusinessInfo;

@Column({ type: 'varchar', transformer: encryptionTransformer })
phoneNumber: string;
```

### **접근 권한 설계**
- Row Level Security (RLS) 적용
- 역할별 데이터 접근 제한
- 감사 로그 시스템

---

## 🚀 **6. 마이그레이션 및 시드 데이터**

### **초기 데이터 계획**
```typescript
// 테스트 사용자
const testUsers = [
  { email: 'customer@test.com', role: 'customer' },
  { email: 'business@test.com', role: 'business' },
  { email: 'admin@test.com', role: 'admin' }
];

// 샘플 상품
const sampleProducts = [
  { name: '비타민 D', category: 'health', prices: {...} },
  { name: '프로틴 파우더', category: 'supplements', prices: {...} }
];
```

### **마이그레이션 전략**
- 순서별 마이그레이션
- 롤백 계획
- 데이터 무결성 검증

---

## 📈 **7. 모니터링 및 백업**

### **성능 모니터링**
- 쿼리 실행 시간 추적
- 인덱스 사용률 분석
- 커넥션 풀 모니터링

### **백업 전략**
- 일일 전체 백업
- 시간별 증분 백업
- Point-in-time 복구 지원

---

## 🗓️ **정비 우선순위**

### **Phase 2 (현재)**
1. ✅ PostgreSQL 연결 설정
2. ⏳ 기본 마이그레이션 실행
3. ⏳ 초기 테스트 데이터 생성

### **Phase 3 (향후)**
1. 상세 스키마 최적화
2. 인덱스 성능 튜닝
3. 보안 강화

### **Phase 4 (장기)**
1. 대용량 데이터 대응
2. 분산 데이터베이스 고려
3. 고가용성 설계

---

## 📝 **메모 및 이슈**

### **현재 확인된 이슈**
- 환경 변수 포트 불일치 (5173 vs 3000)
- Docker 관련 문서 수정 필요
- medusa 관련 잘못된 정보

### **향후 검토 사항**
- Redis 캐싱 전략
- 검색 기능 최적화
- 실시간 알림 시스템

---

**📅 다음 업데이트**: PostgreSQL 연결 완료 후  
**🎯 목표**: 실용적이고 확장 가능한 데이터베이스 설계