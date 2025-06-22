# 🛍️ Ecommerce Service

## 📋 **서비스 개요**

O4O Platform의 통합 전자상거래 서비스입니다. B2C, B2B, Affiliate 모든 기능을 하나의 통합된 시스템에서 처리합니다.

---

## 🏗️ **서비스 구조**

```
services/ecommerce/
├── 📁 web/                   # 통합 쇼핑몰 (고객용)
│   ├── src/
│   │   ├── pages/           # B2C/B2B 통합 페이지
│   │   ├── components/      # 공통 컴포넌트
│   │   └── hooks/          # 사용자 타입별 로직
│   └── package.json
├── 📁 admin/                # 통합 관리자 패널
│   ├── src/
│   │   ├── pages/          # 상품/주문/사용자 관리
│   │   └── components/     # 관리자 컴포넌트
│   └── package.json
└── 📄 README.md            # 이 파일
```

---

## 🎯 **통합 접근 방식**

### **🔐 사용자 역할 기반 구분**
- **CUSTOMER**: 일반 고객 (B2C)
- **BUSINESS**: 사업자 고객 (B2B) 
- **AFFILIATE**: 제휴 파트너
- **ADMIN**: 관리자

### **💰 역할별 차별화**
- **가격 정책**: 일반가 / 도매가 / 제휴가
- **할인 혜택**: 역할별 차등 적용
- **주문 한도**: 사업자는 대량 주문 가능
- **결제 방식**: 개인 / 사업자 결제 옵션

---

## 🌐 **API 엔드포인트**

```
/api/v1/ecommerce/
├── /products               # 상품 관리
├── /orders                 # 주문 처리
├── /cart                   # 장바구니
├── /users                  # 사용자 관리
└── /analytics              # 통계 분석
```

---

## 🚀 **개발 실행**

### **웹 쇼핑몰 (포트 3001)**
```bash
cd services/ecommerce/web
npm install
npm run dev
```

### **관리자 패널 (포트 3002)**
```bash
cd services/ecommerce/admin  
npm install
npm run dev
```

---

## 🛠️ **기술 스택**

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **API Client**: Axios
- **Authentication**: Supabase (향후 적용)

---

## 📊 **주요 기능**

### **🛒 쇼핑몰 기능**
- 상품 카탈로그 (카테고리별 분류)
- 장바구니 및 위시리스트
- 주문 및 결제 시스템
- 사용자별 맞춤 가격 표시

### **👨‍💼 관리자 기능**
- 상품 등록/수정/삭제
- 주문 관리 및 배송 처리
- 고객 관리 (B2C/B2B 구분)
- 매출 통계 및 분석

### **🤝 파트너 기능**
- 제휴 수수료 관리
- 추천 링크 생성
- 판매 실적 통계

---

## 🎯 **개발 우선순위**

1. **기본 상품 관리** (완료)
2. **장바구니 시스템** (진행중)
3. **주문/결제 연동** (예정)
4. **사용자 역할별 UI** (예정)
5. **Supabase 인증 통합** (예정)

---

**📅 마지막 업데이트**: 2025-06-22  
**🏆 상태**: 기본 구조 완성, 기능 개발 진행 중
