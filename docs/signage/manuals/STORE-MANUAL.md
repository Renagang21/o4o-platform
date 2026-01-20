# Digital Signage 매장 관리자 매뉴얼

## Version 3.0 (Phase 3)

**최종 수정일:** 2026-01-20
**대상:** 매장 관리자 (Store)

---

## 목차

1. [시작하기](#1-시작하기)
2. [Global Content 이해하기](#2-global-content-이해하기)
3. [콘텐츠 Clone하기](#3-콘텐츠-clone하기)
4. [내 콘텐츠 관리](#4-내-콘텐츠-관리)
5. [Force 콘텐츠 이해하기](#5-force-콘텐츠-이해하기)
6. [Extension별 콘텐츠](#6-extension별-콘텐츠)
7. [자주 묻는 질문](#7-자주-묻는-질문)

---

## 1. 시작하기

### 1.1 Digital Signage란?

Digital Signage는 매장 내 디지털 화면에 표시되는 콘텐츠 관리 시스템입니다.
본사에서 제공하는 다양한 콘텐츠 중 원하는 것을 선택하여 우리 매장에 맞게 활용할 수 있습니다.

### 1.2 매장 관리자의 역할

매장 관리자로서 할 수 있는 일:
- ✅ Global Content 조회
- ✅ 원하는 콘텐츠 Clone (복사)
- ✅ Clone한 콘텐츠 편집/삭제
- ✅ 콘텐츠 순서 조정

할 수 없는 일:
- ❌ Global Content 직접 생성
- ❌ Force 콘텐츠 삭제
- ❌ 다른 매장 콘텐츠 접근

### 1.3 로그인 및 접속

1. 관리자 페이지 접속
2. 매장 계정으로 로그인
3. "Signage 관리" 메뉴 선택

---

## 2. Global Content 이해하기

### 2.1 Global Content란?

본사(HQ)에서 제공하는 콘텐츠입니다.
모든 매장에서 조회하고 선택할 수 있습니다.

### 2.2 콘텐츠 종류

| 종류 | 출처 | 특징 |
|------|------|------|
| **Pharmacy** | 본사 헬스케어팀 | 건강정보, 제품소개 |
| **Cosmetics** | 브랜드별 | 화장품, 트렌드 |
| **Seller** | 광고주/파트너 | 광고, 프로모션 |

### 2.3 Global Content 조회

#### Pharmacy 콘텐츠

```
GET /api/signage/{serviceKey}/ext/pharmacy/global/contents
```

**필터 옵션:**
- `categoryId`: 카테고리별
- `season`: 시즌별 (spring, summer, fall, winter)
- `contentType`: 유형별

#### Cosmetics 콘텐츠

```
GET /api/signage/{serviceKey}/ext/cosmetics/global/contents
```

**필터 옵션:**
- `brandId`: 브랜드별
- `contentType`: 유형별 (product, promotion, lookbook)
- `season`: 시즌별

#### Seller 콘텐츠

```
GET /api/signage/{serviceKey}/ext/seller/global/contents
```

**필터 옵션:**
- `partnerId`: 파트너별
- `contentType`: 유형별

---

## 3. 콘텐츠 Clone하기

### 3.1 Clone이란?

Global Content를 우리 매장 전용으로 복사하는 것입니다.
Clone한 콘텐츠는 자유롭게 편집하거나 삭제할 수 있습니다.

### 3.2 Clone 방법

#### Pharmacy 콘텐츠 Clone

```bash
POST /api/signage/{serviceKey}/ext/pharmacy/global/contents/{contentId}/clone
{
  "title": "우리 매장용 건강정보"  // 선택사항: 제목 변경
}
```

#### Cosmetics 콘텐츠 Clone

```bash
POST /api/signage/{serviceKey}/ext/cosmetics/global/contents/{contentId}/clone
{
  "title": "우리 매장용 프로모션"
}
```

#### Seller 콘텐츠 Clone

```bash
POST /api/signage/{serviceKey}/ext/seller/global/contents/{contentId}/clone
{
  "title": "우리 매장 광고"
}
```

### 3.3 Clone 결과

Clone 후 응답:
```json
{
  "data": {
    "content": {
      "id": "new-uuid",
      "title": "우리 매장용 건강정보",
      "scope": "store",
      "parentContentId": "original-uuid",
      ...
    },
    "originalId": "original-uuid",
    "clonedAt": "2025-01-20T10:00:00Z"
  }
}
```

### 3.4 Clone 제한

| 콘텐츠 유형 | Clone 가능 |
|-------------|-----------|
| Pharmacy Force | ❌ 불가 |
| Pharmacy Non-Force | ✅ 가능 |
| Cosmetics | ✅ 가능 (모두) |
| Seller | ✅ 가능 (모두) |

**참고:** Force 콘텐츠는 자동으로 매장에 표시되므로 Clone할 필요가 없습니다.

---

## 4. 내 콘텐츠 관리

### 4.1 내 콘텐츠 목록 조회

Clone한 콘텐츠와 직접 만든 콘텐츠를 조회합니다.

```bash
GET /api/signage/{serviceKey}/ext/{extension}/contents
?scope=store&page=1&limit=20
```

### 4.2 콘텐츠 수정

Clone한 콘텐츠의 제목, 설명 등을 수정할 수 있습니다.

```bash
PATCH /api/signage/{serviceKey}/ext/{extension}/contents/{id}
{
  "title": "수정된 제목",
  "displayOrder": 5
}
```

**수정 가능 항목:**
- `title`: 제목
- `description`: 설명
- `displayOrder`: 표시 순서
- `isActive`: 활성화 여부

### 4.3 콘텐츠 삭제

Clone한 콘텐츠를 삭제합니다.

```bash
DELETE /api/signage/{serviceKey}/ext/{extension}/contents/{id}
```

**응답:** 204 No Content (성공)

### 4.4 표시 순서 변경

콘텐츠가 Player에 표시되는 순서를 변경합니다.

```bash
PATCH /api/signage/{serviceKey}/ext/{extension}/contents/{id}
{
  "displayOrder": 3
}
```

**팁:** 숫자가 작을수록 먼저 표시됩니다.

---

## 5. Force 콘텐츠 이해하기

### 5.1 Force 콘텐츠란?

본사에서 **반드시 표시되어야 한다**고 지정한 콘텐츠입니다.
매장에서 삭제하거나 숨길 수 없습니다.

### 5.2 Force 콘텐츠 특징

| 특징 | 설명 |
|------|------|
| 자동 표시 | Clone 없이 자동으로 표시됨 |
| 삭제 불가 | 매장에서 삭제할 수 없음 |
| 순서 고정 | 항상 최우선 표시 |
| Pharmacy만 | 현재 Pharmacy Extension만 지원 |

### 5.3 Force 콘텐츠 확인

Global Content 목록에서 `isForced: true`인 콘텐츠가 Force 콘텐츠입니다.

```json
{
  "id": "xxx",
  "title": "필수 건강 안내",
  "isForced": true,
  "canClone": false,
  ...
}
```

### 5.4 Force 콘텐츠 삭제 시도 시

```json
{
  "error": "CANNOT_DELETE_FORCED",
  "message": "Forced content cannot be deleted",
  "statusCode": 400
}
```

---

## 6. Extension별 콘텐츠

### 6.1 Pharmacy 콘텐츠

**특징:**
- 건강정보, 제품정보, 시즌 캠페인
- Force 콘텐츠 존재 (필수 안내 등)
- 카테고리별 분류

**주요 콘텐츠 유형:**
| 유형 | 설명 |
|------|------|
| product-info | 제품 정보 |
| health-tip | 건강 팁 |
| promotion | 프로모션 |
| seasonal | 시즌 캠페인 |
| announcement | 공지사항 |

### 6.2 Cosmetics 콘텐츠

**특징:**
- 브랜드별 콘텐츠
- 시즌별 트렌드
- 모든 콘텐츠 Clone 가능

**주요 콘텐츠 유형:**
| 유형 | 설명 |
|------|------|
| product | 제품 소개 |
| brand-story | 브랜드 스토리 |
| promotion | 프로모션 |
| lookbook | 룩북/트렌드 |
| tutorial | 사용법/튜토리얼 |

### 6.3 Seller 콘텐츠

**특징:**
- 광고주/파트너 콘텐츠
- 캠페인 기간 내에만 표시
- 성과 측정 (노출, 클릭)

**주요 콘텐츠 유형:**
| 유형 | 설명 |
|------|------|
| product-ad | 제품 광고 |
| brand-video | 브랜드 영상 |
| promotion | 프로모션 배너 |
| event | 이벤트 안내 |

**참고:** Seller 콘텐츠는 캠페인 기간이 지나면 Global Content에서 자동으로 사라집니다.

---

## 7. 자주 묻는 질문

### Q1. Clone한 콘텐츠를 수정하면 원본도 바뀌나요?

**아니요.** Clone한 콘텐츠는 완전히 독립적입니다.
수정해도 원본에는 영향이 없습니다.

### Q2. Force 콘텐츠를 숨길 수 있나요?

**아니요.** Force 콘텐츠는 본사에서 반드시 표시되어야 한다고 지정한 것이므로 숨기거나 삭제할 수 없습니다.

### Q3. 캠페인 기간이 지난 Seller 콘텐츠는 어떻게 되나요?

Global Content 목록에서 사라지지만, 이미 Clone한 콘텐츠는 매장에 그대로 유지됩니다.
필요 없으면 직접 삭제하세요.

### Q4. 여러 Extension의 콘텐츠를 함께 사용할 수 있나요?

**예.** Pharmacy, Cosmetics, Seller 콘텐츠를 모두 Clone하여 함께 표시할 수 있습니다.

### Q5. 콘텐츠 표시 순서는 어떻게 되나요?

기본 순서:
1. Force 콘텐츠 (최우선)
2. Global 콘텐츠
3. Store 로컬 콘텐츠

동일 레벨에서는 `displayOrder`가 작은 것이 먼저 표시됩니다.

### Q6. 인터넷이 끊기면 어떻게 되나요?

Player가 캐시된 콘텐츠를 재생합니다.
인터넷 복구 시 자동으로 최신 콘텐츠로 업데이트됩니다.

### Q7. 콘텐츠가 보이지 않아요.

다음을 확인하세요:
1. `isActive`가 `true`인가요?
2. 유효 기간 내인가요?
3. (Seller) 캠페인이 활성 상태인가요?
4. 네트워크 연결 상태가 정상인가요?

### Q8. 도움이 필요해요.

본사 운영팀에 문의하세요:
- 이메일: support@o4o-platform.com
- 전화: 1588-XXXX

---

## 부록

### A. 용어 설명

| 용어 | 설명 |
|------|------|
| Global Content | 본사에서 제공하는 공용 콘텐츠 |
| Clone | 콘텐츠를 매장 전용으로 복사하는 것 |
| Force | 삭제할 수 없는 필수 콘텐츠 |
| Extension | 기능 확장 모듈 (Pharmacy, Cosmetics, Seller) |
| Player | 매장 화면에서 콘텐츠를 재생하는 장치/앱 |

### B. 오류 메시지

| 오류 | 의미 | 해결 방법 |
|------|------|----------|
| 401 Unauthorized | 로그인 필요 | 다시 로그인 |
| 403 Forbidden | 권한 없음 | 매장 관리자 권한 확인 |
| 404 Not Found | 콘텐츠 없음 | 콘텐츠 ID 확인 |
| CANNOT_CLONE_FORCED | Force는 Clone 불가 | Force 콘텐츠는 자동 표시됨 |
| CANNOT_DELETE_FORCED | Force는 삭제 불가 | 본사에 문의 |

---

*문서 버전: 3.0.0*
*최종 수정: 2026-01-20*
