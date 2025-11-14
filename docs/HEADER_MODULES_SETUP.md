# 📋 헤더 모듈 페이지 생성 완료

## ✅ 생성된 페이지 목록

모든 헤더 모듈에 필요한 페이지가 성공적으로 생성되었습니다.

### 1️⃣ Account Module 관련 페이지

| URL | 제목 | 상태 | 접속 링크 |
|-----|------|------|-----------|
| `/login` | 로그인 | ✅ | https://neture.co.kr/login |
| `/my-account` | 마이페이지 | ✅ | https://neture.co.kr/my-account |
| `/my-account/orders` | 주문 내역 | ✅ | https://neture.co.kr/my-account/orders |
| `/my-account/wishlist` | 위시리스트 | ✅ | https://neture.co.kr/my-account/wishlist |
| `/my-account/notifications` | 알림 | ✅ | https://neture.co.kr/my-account/notifications |
| `/my-account/settings` | 설정 | ✅ | https://neture.co.kr/my-account/settings |
| `/support` | 고객지원 | ✅ | https://neture.co.kr/support |

### 2️⃣ Cart Module 관련 페이지

| URL | 제목 | 상태 | 접속 링크 |
|-----|------|------|-----------|
| `/cart` | 장바구니 | ✅ | https://neture.co.kr/cart |

### 3️⃣ Role Switcher 관련 페이지

| URL | 제목 | 역할 | 상태 | 접속 링크 |
|-----|------|------|------|-----------|
| `/seller` | 판매자 대시보드 | 판매자 | ✅ | https://neture.co.kr/seller |
| `/supplier` | 공급자 대시보드 | 공급자 | ✅ | https://neture.co.kr/supplier |
| `/affiliate` | 제휴자 대시보드 | 제휴자 | ✅ | https://neture.co.kr/affiliate |

---

## 🎯 헤더 모듈 사용 가이드

### Account Module 추가하기

헤더 템플릿에 다음 shortcode를 추가하세요:

```
[[account_module showAvatar="true" showName="false" loginUrl="/login" accountUrl="/my-account"]]
```

**파라미터:**
- `showAvatar` - 사용자 아바타 표시 (기본: true)
- `showName` - 사용자 이름 표시 (기본: false)
- `loginUrl` - 로그인 페이지 경로 (기본: /login)
- `accountUrl` - 마이페이지 경로 (기본: /my-account)

**드롭다운 메뉴 항목:**
- 프로필 → `/my-account`
- 주문 내역 → `/my-account/orders`
- 위시리스트 → `/my-account/wishlist`
- 알림 → `/my-account/notifications`
- 설정 → `/my-account/settings`
- 고객지원 → `/support`
- 로그아웃 → `/logout` (자동 처리)

---

### Cart Module 추가하기

```
[[cart_module action="mini-cart" showCount="true" showTotal="false"]]
```

**파라미터:**
- `action` - 동작 모드 ("mini-cart" 또는 "page", 기본: "mini-cart")
- `showCount` - 아이템 개수 표시 (기본: true)
- `showTotal` - 총 금액 표시 (기본: false)
- `cartUrl` - 장바구니 페이지 경로 (기본: /cart, action="page"일 때만 사용)

**동작 모드:**
- `mini-cart` - 클릭 시 드롭다운 미니 카트 표시
- `page` - 클릭 시 `/cart` 페이지로 이동

---

### Role Switcher 추가하기

```
[[role_switcher showLabel="true"]]
```

**파라미터:**
- `showLabel` - "역할 전환" 텍스트 표시 (기본: true)

**역할별 이동 경로:**
- 사용자 (customer) → `/` (홈)
- 판매자 (seller) → `/seller`
- 공급자 (supplier) → `/supplier`
- 제휴자 (affiliate) → `/affiliate`

**표시 조건:**
- 로그인 상태여야 함
- 복수 역할을 보유한 사용자에게만 표시됨

---

## 🔧 페이지 재생성 방법

페이지를 삭제하거나 재생성이 필요한 경우:

```bash
npx tsx scripts/create-header-pages.ts
```

**참고:**
- 이미 존재하는 페이지는 건너뜁니다
- 관리자 계정으로 자동 로그인하여 생성합니다
- 환경변수로 계정 변경 가능:
  - `ADMIN_EMAIL` (기본: test@example.com)
  - `ADMIN_PASSWORD` (기본: test123!@#)

---

## 📝 페이지 커스터마이징

생성된 페이지는 관리자 대시보드에서 수정할 수 있습니다:

1. Admin 대시보드 접속: https://admin.neture.co.kr
2. 좌측 메뉴에서 "Pages" 선택
3. 수정할 페이지 검색 (예: "마이페이지")
4. 편집 버튼 클릭
5. 내용 수정 후 저장

---

## 🎨 페이지 디자인 예시

### 마이페이지 (/my-account)
- 카드 형태의 메뉴 그리드 레이아웃
- 각 메뉴별 아이콘과 설명 포함
- 프로필, 주문 내역, 위시리스트, 알림, 설정, 고객지원

### 역할 대시보드 (/seller, /supplier)
- Shortcode를 사용하여 동적 대시보드 렌더링
- `[[seller_dashboard]]`, `[[supplier_dashboard]]`

### 제휴자 대시보드 (/affiliate)
- 수익, 클릭, 전환율 통계 카드
- 제휴 링크 표시

---

## ✅ 테스트 체크리스트

### Account Module
- [ ] 비로그인 상태: "로그인" 버튼 표시
- [ ] 로그인 상태: 사용자 아바타 표시
- [ ] 드롭다운 클릭: 메뉴 항목 표시
- [ ] 각 메뉴 클릭: 해당 페이지로 이동
- [ ] 로그아웃: 홈으로 이동

### Cart Module
- [ ] Mini-cart 모드: 클릭 시 드롭다운 표시
- [ ] Page 모드: 클릭 시 /cart 페이지로 이동
- [ ] 아이템 개수 표시
- [ ] 총 금액 표시 (옵션)

### Role Switcher
- [ ] 단일 역할: 모듈 숨김
- [ ] 복수 역할: 모듈 표시
- [ ] 역할 선택: API 호출 및 상태 업데이트
- [ ] 페이지 이동: 역할별 경로로 SPA 라우팅
- [ ] 토스트 알림: "○○로 전환되었습니다"

---

## 📞 지원

문제가 발생하거나 추가 기능이 필요한 경우:
- 이슈 등록: GitHub Issues
- 이메일: support@neture.co.kr

---

**생성 일시:** 2025-11-14
**스크립트 위치:** `/scripts/create-header-pages.ts`
**상태:** ✅ 모든 페이지 생성 완료
