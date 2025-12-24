# App Naming Guidelines (O4O Platform)

> **Status**: Active
> **Created**: 2025-12-24
> **Phase**: R4 App Structure Cleanup

---

## 1. 기본 원칙

### 1.1 명명 규칙 목표
- 패키지 역할을 이름에서 즉시 파악 가능
- 도메인과 타입이 명확히 구분됨
- 일관된 패턴으로 예측 가능성 확보

### 1.2 언어 규칙
- 모든 패키지명은 **영문 소문자**
- 단어 구분은 **하이픈(-)** 사용
- 언더스코어(_) 사용 금지
- 숫자는 버전 표시 외 사용 금지

---

## 2. 패키지 명명 패턴

### 2.1 Core 패키지
```
{domain}-core
```

| 예시 | 설명 |
|------|------|
| `forum-core` | 포럼 도메인 Core |
| `lms-core` | LMS 도메인 Core |
| `ecommerce-core` | 이커머스 도메인 Core |
| `dropshipping-core` | 드롭쉬핑 도메인 Core |

**규칙**:
- 반드시 `-core` 접미사
- 도메인은 단일 단어 권장
- 복합 도메인은 하이픈 연결 (`digital-signage-core`)

### 2.2 Extension 패키지
```
{domain}-{target}-extension  또는  {domain}-{service}
```

| 패턴 | 예시 | 설명 |
|------|------|------|
| `{domain}-{role}-extension` | `cosmetics-seller-extension` | 역할 기반 확장 |
| `{domain}-{service}` | `dropshipping-cosmetics` | 서비스 특화 확장 |
| `{core1}-{core2}` | `organization-forum` | 통합 레이어 |

**규칙**:
- 역할 기반: `-extension` 접미사 권장
- 서비스 특화: 타겟 서비스명 접미사
- 통합 레이어: 두 Core 이름 조합

### 2.3 Feature 패키지 (Ops)
```
{role}ops
```

| 예시 | 설명 |
|------|------|
| `sellerops` | 셀러 운영 기능 |
| `supplierops` | 공급업체 운영 기능 |
| `partnerops` | 파트너 운영 기능 |
| `pharmacyops` | 약국 운영 기능 |

**규칙**:
- `ops` 접미사는 붙여서 작성
- 역할명은 단수형 사용

### 2.4 Utility 패키지
```
{function}  또는  {domain}-{function}
```

| 예시 | 설명 |
|------|------|
| `types` | 공통 타입 |
| `utils` | 공통 유틸리티 |
| `ui` | UI 컴포넌트 |
| `auth-client` | 인증 클라이언트 |
| `block-renderer` | 블록 렌더러 |

**규칙**:
- 기능을 직접적으로 표현
- 복합 기능은 하이픈 연결

---

## 3. 도메인 약어 규칙

### 3.1 승인된 도메인 약어

| 약어 | 전체명 | 사용 예 |
|------|--------|---------|
| `yaksa` | 약사회 서비스 | `forum-yaksa`, `membership-yaksa` |
| `cosmetics` | 화장품 도메인 | `forum-cosmetics`, `dropshipping-cosmetics` |
| `lms` | Learning Management System | `lms-core`, `lms-yaksa` |
| `cms` | Content Management System | `cms-core` |
| `cpt` | Custom Post Type | `cpt-registry` |
| `ai` | Artificial Intelligence | `pharmacy-ai-insight` |
| `cgm` | Continuous Glucose Monitor | `cgm-pharmacist-app` |

### 3.2 약어 사용 규칙
- 새 약어 도입 시 이 문서에 먼저 등록
- 3글자 이하 약어만 허용
- 도메인 내 일관성 유지 필수

---

## 4. 서비스별 명명 패턴

### 4.1 Yaksa 서비스 (약사회)
```
{feature}-yaksa
```
예: `forum-yaksa`, `membership-yaksa`, `member-yaksa`, `lms-yaksa`

**특이사항**:
- `member-yaksa`: 사용자 앱
- `membership-yaksa`: 관리자 앱
- 역할 구분이 명확할 때만 분리

### 4.2 Cosmetics 서비스 (화장품)
```
{domain}-cosmetics  또는  cosmetics-{role}-extension
```
예: `forum-cosmetics`, `dropshipping-cosmetics`, `cosmetics-seller-extension`

### 4.3 Healthcare 서비스 (헬스케어)
```
{specialty}-{function}  또는  {function}-extension
```
예: `diabetes-pharmacy`, `pharmacy-ai-insight`, `health-extension`

---

## 5. 금지된 명명 패턴

| 패턴 | 사유 | 대안 |
|------|------|------|
| `new-*` | 버전 혼란 | 기능명 직접 사용 |
| `*-v2`, `*-v3` | 버전 관리 혼란 | Breaking change 시 새 이름 |
| `*-service` | application과 혼동 | `-core` 또는 `-extension` |
| `*-module` | NestJS 혼동 | 구체적 기능명 |
| `*-lib` | 모호함 | `utils`, `types` 등 |
| `my-*`, `test-*` | 임시 패키지 | 정식 이름 사용 |

---

## 6. 신규 패키지 이름 검증

### 6.1 체크리스트
- [ ] 기존 패키지와 이름 충돌 없음
- [ ] 도메인 약어가 승인 목록에 있음
- [ ] 타입 접미사가 올바름 (`-core`, `-extension`, `ops`)
- [ ] 하이픈 연결 규칙 준수
- [ ] 소문자만 사용

### 6.2 이름 변경 시 주의
- 이미 배포된 패키지는 이름 변경 금지
- Breaking change로 간주
- 새 패키지 생성 후 마이그레이션 권장

---

## 7. 예외 사항

### 7.1 역사적 예외 (변경하지 않음)
| 패키지 | 이유 |
|--------|------|
| `@o4o-apps` | 메타 패키지, 스코프 사용 |
| `admin` | 레거시, deprecated 예정 |
| `commerce` | 레거시, deprecated 예정 |

### 7.2 특수 패키지
| 패키지 | 이유 |
|--------|------|
| `slide-app` | 독립 앱, `-app` 허용 |
| `forum-app` | 프론트엔드 앱, `-app` 허용 |

---

*Phase R4: WO-R4-APP-STRUCTURE-CLEANUP-V1*
*Updated: 2025-12-24*
