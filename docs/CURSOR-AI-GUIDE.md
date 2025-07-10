# 🤖 Cursor AI 실무 사용법 가이드

## 📖 **개요**
이 가이드는 O4O Platform 개발 시 Cursor AI를 효과적으로 활용하는 실무 방법을 제공합니다.

## 🚀 **빠른 시작**

### 1. 환경 설정 확인
```bash
# 프로젝트 루트에서 Cursor 실행
cd /path/to/o4o-platform
cursor .

# 또는 VSCode 사용자의 경우
code .
```

### 2. 필수 확장 프로그램 설치
Cursor를 열면 자동으로 권장 확장 프로그램 설치를 제안합니다:
- ✅ **설치 권장**: 모든 권장 확장 프로그램 설치
- ⏭️ **Skip**: GitHub Copilot (Cursor AI가 대체)

## 💡 **Cursor AI 핵심 기능 활용법**

### 🎯 **1. 코드 자동완성 (가장 중요!)**

#### **TypeScript 컴포넌트 작성**
```typescript
// 🤖 프롬프트: "ProductCard 컴포넌트를 만들어줘"
// Cursor AI가 자동으로 다음과 같은 구조를 제안합니다:

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  // ... AI가 자동으로 필요한 props 추론
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit }) => {
  // AI가 컴포넌트 로직 자동 생성
};
```

#### **API 훅 생성**
```typescript
// 🤖 "useProducts 훅을 만들어줘"라고 코멘트를 작성하면
// Cursor AI가 즉시 React Query 기반 훅을 생성합니다

export const useProducts = (filters?: ProductFilters) => {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => EcommerceApi.getProducts(filters),
    // AI가 자동으로 적절한 옵션 추가
  });
};
```

### 🧪 **2. 테스트 코드 자동 생성**

#### **컴포넌트 테스트**
```typescript
// 🤖 기존 컴포넌트 파일에서 Cmd+I (또는 Ctrl+I)를 누르고
// "이 컴포넌트의 테스트 코드를 만들어줘"라고 입력

describe('ProductCard Component', () => {
  test('renders product information correctly', () => {
    // AI가 자동으로 테스트 케이스 생성
  });
});
```

#### **API 훅 테스트**
```typescript
// 🤖 "useProducts 훅 테스트를 만들어줘"
// MSW, React Query 테스트 보일러플레이트 자동 생성
```

### 🎨 **3. 리팩토링 및 최적화**

#### **코드 개선 요청**
```typescript
// 🤖 코드를 선택하고 Cmd+K를 누른 후:
// "이 코드를 TypeScript strict 모드에 맞게 개선해줘"
// "성능을 최적화해줘"
// "테스트하기 쉽게 리팩토링해줘"
```

### 🔧 **4. 설정 파일 생성**

#### **새로운 서비스 설정**
```bash
# 🤖 "새 서비스를 위한 package.json을 만들어줘"
# AI가 자동으로 의존성, 스크립트, 설정을 추천
```

## 🎯 **실무 워크플로우 최적화**

### **📝 일일 개발 루틴**

#### **1. 아침 작업 시작**
```bash
# 터미널에서 AI에게 질문
# 🤖 "오늘 작업할 기능에 대해 계획을 세워줘"
```

#### **2. 기능 개발 시**
1. **요구사항 분석**: Cursor Chat에 기능 설명
2. **구조 설계**: AI가 컴포넌트/API 구조 제안
3. **코드 작성**: AI 자동완성 활용
4. **테스트 생성**: AI가 테스트 케이스 자동 생성
5. **리팩토링**: AI가 코드 품질 개선 제안

#### **3. 저녁 작업 마무리**
```bash
# 🤖 "오늘 작성한 코드의 품질을 검토해줘"
# AI가 코드 리뷰 및 개선 사항 제안
```

### **🚨 문제 해결 패턴**

#### **에러 디버깅**
```typescript
// 🤖 에러 메시지를 복사하고 Cursor Chat에 붙여넣기
// "이 에러를 어떻게 해결할까?"
// AI가 단계별 해결 방법 제시
```

#### **성능 최적화**
```typescript
// 🤖 느린 컴포넌트 코드를 선택하고
// "이 컴포넌트의 렌더링 성능을 최적화해줘"
```

## 🎯 **프로젝트별 특화 활용법**

### **🛍️ E-commerce 기능 개발**
```typescript
// 🤖 "Medusa 기반 상품 관리 컴포넌트를 만들어줘"
// AI가 Medusa API 구조를 이해하고 적절한 컴포넌트 생성
```

### **🧪 테스트 작성**
```typescript
// 🤖 "MSW를 사용한 API 모킹 테스트를 만들어줘"
// AI가 자동으로 MSW 핸들러와 테스트 케이스 생성
```

### **📱 반응형 UI 개발**
```typescript
// 🤖 "모바일 친화적인 ProductCard를 만들어줄래?"
// AI가 Tailwind CSS 반응형 클래스 자동 적용
```

## ⚡ **고급 활용 팁**

### **🎨 코드 스타일 통일**
```typescript
// 🤖 프로젝트 루트에서 Cmd+I:
// "이 프로젝트의 코딩 스타일을 분석하고 일관성 있게 코드를 작성해줘"
```

### **🔍 대규모 리팩토링**
```typescript
// 🤖 여러 파일을 선택하고:
// "이 컴포넌트들을 공통 패턴으로 리팩토링해줘"
```

### **📊 성능 분석**
```typescript
// 🤖 "이 React 앱의 번들 크기를 최적화하는 방법을 알려줘"
```

## 🚨 **주의사항 및 베스트 프랙티스**

### **✅ 권장사항**
- **구체적인 프롬프트**: "버튼 만들어줘" ❌ → "MedusaProduct 타입을 받는 ProductCard 컴포넌트를 만들어줘" ✅
- **컨텍스트 제공**: 관련 파일들을 열어두고 AI가 프로젝트 구조를 이해할 수 있게 함
- **점진적 개발**: 한 번에 너무 많은 기능을 요청하지 말고 단계별로 진행

### **⚠️ 주의사항**
- **보안 정보**: API 키, 비밀번호 등을 코드에 포함하지 않도록 주의
- **코드 검토**: AI가 생성한 코드는 반드시 검토 후 사용
- **타입 안전성**: TypeScript strict 모드 준수 확인

### **🔧 설정 최적화**
- **자동 저장**: `"editor.formatOnSave": true` 활성화
- **Import 정리**: `"source.organizeImports": "explicit"` 설정
- **ESLint 통합**: 실시간 코드 품질 검사

## 📚 **추가 학습 자료**

### **Cursor AI 공식 문서**
- [Cursor 공식 웹사이트](https://cursor.so)
- [Cursor AI 사용법 가이드](https://docs.cursor.so)

### **프로젝트별 참고 자료**
- `CLAUDE.md`: 프로젝트 구조 및 개발 가이드
- `DEVELOPMENT.md`: 개발 환경 설정 가이드
- `API-TESTING-GUIDE.md`: 테스트 작성 가이드

## 🎯 **일일 체크리스트**

### **작업 시작 시**
- [ ] Cursor/VSCode 최신 버전 확인
- [ ] 확장 프로그램 업데이트 확인
- [ ] 프로젝트 의존성 업데이트 (`npm update`)
- [ ] 최신 코드 pull (`git pull`)

### **작업 중**
- [ ] AI 자동완성 적극 활용
- [ ] 컴포넌트 작성 시 테스트도 함께 생성
- [ ] TypeScript 에러 즉시 수정
- [ ] ESLint 경고 해결

### **작업 마무리 시**
- [ ] 테스트 실행 (`npm test`)
- [ ] 빌드 확인 (`npm run build`)
- [ ] 코드 포맷팅 (`npm run lint:fix`)
- [ ] Git 커밋 및 푸시

## 🤝 **팀 협업 가이드**

### **코드 리뷰 시**
- AI가 생성한 코드임을 명시
- 비즈니스 로직의 정확성 검증
- 성능 및 보안 측면 검토

### **지식 공유**
- AI 활용 팁 및 유용한 프롬프트 공유
- 팀 내 코딩 스타일 통일
- 문제 해결 사례 문서화

---

**💡 이 가이드는 지속적으로 업데이트됩니다. 새로운 팁이나 개선사항이 있으면 팀과 공유해주세요!**