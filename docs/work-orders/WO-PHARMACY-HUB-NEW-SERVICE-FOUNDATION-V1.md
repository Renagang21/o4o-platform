# WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1

> **상태: 핸드오프 (미실행)**
> 등록일: 2026-07-30 · 등록 시 HEAD: `2424016a004e19ba195dcdcb600c1a56efda613f` (main)
> 이 문서는 실행 대상 작업요청서이며, 본 커밋 시점에는 **어떤 코드도 구현되지 않았다.**
> 실행 시작 전 아래 "작업 시작 전 공통 확인"을 반드시 먼저 수행한다.

---

## 작업 시작 전 공통 확인

1. VS Code/Claude Code의 선택 영역 공유를 해제하고, 선택된 긴 문서·JSON·설명서 내용이 자동 첨부되지 않았는지 확인한다.

2. 현재 폴더가 실제 O4O 저장소인지 확인한다.

3. 다음 순서로 상태를 점검한다.

```bash
git status --short
git branch --show-current
git rev-parse HEAD
```

4. 작업 트리가 clean이 아니면 기존 변경을 수정·삭제·stash·revert하거나 이번 작업에 포함하지 말고, 내용을 보고한 뒤 중지한다.

5. clean이면 다음을 실행한다.

```bash
git checkout main
git pull --ff-only origin main
pnpm install --frozen-lockfile
```

6. 현재 `main`의 실제 코드를 기준으로 조사한다. 과거 문서와 코드가 다르면 현재 코드를 우선하고 차이를 보고한다.

---

## 1. 핵심 목표

신규 약국 전문 서비스 **Pharmacy-Hub**의 Foundation을 조사하고 최소 골격을 구현한다.

확정 정보:

* 사용자 표시명: `Pharmacy-Hub`
* 한글 표시명: `파머시 허브`
* 대표 도메인: `pharmacyhub.co.kr`
* 플랫폼 serviceKey: `pharmacy-hub`
* 이벤트 오퍼 serviceKey: `pharmacy-hub-event-offer`
* 웹 앱 후보명: `web-pharmacy-hub`

Pharmacy-Hub는 공급자와 약국 경영자를 직접 연결하는 O4O 약국 전문 서비스다.

기본 원칙:

* 공통 사용자·조직·ProductMaster·공급자·Offer·콘텐츠·주문 원장을 재사용한다.
* Pharmacy-Hub 전용 ProductMaster나 별도 상품 데이터베이스를 만들지 않는다.
* 서비스 가입·승인·회원 상태·역할은 다른 서비스와 분리한다.
* 다른 서비스 회원이라고 Pharmacy-Hub에 자동 가입시키지 않는다.
* 공급자와 약국 경영자 간 일반 상품 거래와 공급자 콘텐츠 전달에 서비스 운영자가 개입하지 않는다.
* 서비스 운영자는 회원 가입 승인, 회원 관리, 커뮤니티 관리, 신고·공지·운영자 콘텐츠 제공을 담당한다.
* 유통참여형 펀딩은 현재와 같이 Neture 전용으로 유지하며 Pharmacy-Hub와 연결하지 않는다.

---

## 2. 이번 작업 범위

### A. 현재 구조 조사

다음 항목을 실제 코드 기준으로 조사한다.

1. 기존 서비스 앱 구성

   * KPA Society
   * GlycoPharm
   * K-Cosmetics
   * Neture
   * 공통 서비스 등록 및 배포 구조

2. 신규 서비스 추가 시 필요한 등록 지점

   * 공통 service key 상수
   * 프론트엔드 앱과 package/workspace
   * API 라우트와 서비스별 scope
   * 인증·회원가입·승인
   * 조직 및 서비스 membership
   * 메뉴·레이아웃·권한 가드
   * 콘텐츠의 serviceKey 경계
   * 장바구니와 checkout의 serviceKey
   * 커뮤니티·포럼의 서비스 경계
   * 배포 workflow와 환경변수
   * CORS·쿠키·로그인 callback·도메인 설정

3. 가장 적합한 재사용 기준 앱

   * 약국 경영자 UI는 KPA Society를 우선 검토한다.
   * 공급자 원장과 공급 기능은 Neture Core를 재사용한다.
   * 운영자 UI는 현재 공통 운영자 구조를 우선 재사용한다.
   * 앱 전체 복제보다 공통 패키지와 기존 컴포넌트 재사용을 우선한다.

4. Pharmacy-Hub 전용 분기가 필요한 부분과 단순 설정 추가만 필요한 부분을 구분한다.

### B. Foundation 골격 구현

조사 결과 안전하게 가능한 최소 범위만 구현한다.

최소 목표:

1. `pharmacy-hub` 서비스 키 등록
2. `pharmacy-hub-event-offer` 이벤트 오퍼 키 등록
3. Pharmacy-Hub 앱 또는 기존 멀티서비스 구조에서의 독립 진입 골격 생성
4. 기본 브랜드 표시

   * Pharmacy-Hub
   * 파머시 허브
5. 기본 라우트와 로그인 진입
6. 역할별 기본 진입점

   * 약국 경영자
   * 공급자
   * 서비스 운영자
7. 서비스별 membership·권한 경계를 적용할 수 있는 Foundation
8. 로컬 빌드가 가능한 workspace/package 연결

이번 작업에서 실제 상품 거래 전체, 콘텐츠 전체, 커뮤니티 전체를 완성하지 않는다. 후속 기능이 연결될 수 있는 안전한 Foundation까지만 구현한다.

---

## 3. 구조 원칙

### 공통 데이터 재사용

다음을 새로 복제하거나 Pharmacy-Hub 전용 테이블로 만들지 않는다.

* 사용자
* 조직
* ProductMaster
* SupplierProductOffer
* 공급자 원장
* 장바구니 원장
* 주문 원장
* 공통 콘텐츠 원장

서비스 구분은 기존 `serviceKey` 및 서비스 membership 구조를 우선 사용한다.

### 상품 제공 원칙

향후 공급자는 기존 `SupplierProductOffer.serviceKeys`를 통해 Pharmacy-Hub를 제공 대상으로 선택한다.

Pharmacy-Hub에서 일반 상품은:

```text
공급자가 Pharmacy-Hub에 제공
→ 승인된 Pharmacy-Hub 약국 전체에 노출
→ 운영자 상품 승인 없이 장바구니·주문
```

이번 Foundation에서는 이 전체 기능을 완성할 필요는 없지만, 이후 이 흐름을 방해하는 구조를 만들지 않는다.

### 이벤트 오퍼 원칙

이벤트 오퍼는 향후 기존 공통 이벤트 오퍼 구조를 재사용한다.

* Pharmacy-Hub 대상 매핑 가능 구조를 준비한다.
* 신규 서비스에서 공급자 이벤트 오퍼 자동승인이 단순한 서비스별 정책 분기로 가능하면 후속 작업에서 자동승인한다.
* 기존 KPA·GlycoPharm·K-Cosmetics의 운영자 승인 흐름은 변경하지 않는다.
* 이번 Foundation에서 자동승인까지 무리하게 구현하지 않아도 된다.
* 단, 이벤트 오퍼 키와 확장 지점은 조사·정리한다.

### 유통참여형 펀딩 원칙

* Neture 전용 유지
* Pharmacy-Hub 메뉴·카드·배너·리다이렉트·참여 이력·주문 연결 없음
* 관련 코드를 Pharmacy-Hub에 복제하지 않는다.

### 소비자 대상 배송 원칙

소비자 직접 배송은 Pharmacy-Hub의 기본 기능이 아니라 약국 경영자를 위한 선택적 부가 기능이다.

향후 기존 B2B 주문의 배송지 기능을 재사용하여 다음만 지원한다.

* 매장 주소로 배송
* 다른 배송지로 배송

소비자 회원, 소비자 주소록, 고객 관리, 소비자별 구매 이력 시스템은 만들지 않는다.

이번 Foundation에서는 별도 소비자 도메인을 만들지 않는다.

---

## 4. 실행 순서

1. 저장소와 작업 트리 상태 확인
2. 기존 서비스 추가 구조 전수 조사
3. 재사용 기준 앱과 공통 패키지 결정
4. 신규 서비스 추가에 필요한 파일 목록 작성
5. 중지 조건 점검
6. `pharmacy-hub` 및 `pharmacy-hub-event-offer` 키 등록
7. 최소 앱·라우트·브랜드·권한 골격 구현
8. TypeScript 및 대상 앱 빌드
9. 기존 서비스 회귀 영향 점검
10. CHECK 문서 작성
11. 변경 파일만 path-specific commit
12. `main`에 push

---

## 5. 중지 조건

다음 중 하나라도 해당하면 임의 구현하지 말고 조사 결과를 보고한 뒤 중지한다.

1. Pharmacy-Hub 추가를 위해 기존 KPA·GlycoPharm·K-Cosmetics의 회원·주문 의미를 변경해야 하는 경우
2. ProductMaster·SupplierProductOffer·주문 원장을 복제해야만 구현 가능한 경우
3. 현재 서비스 membership 구조로 서비스별 가입·승인 분리가 불가능한 경우
4. 기존 인증 또는 쿠키 구조가 단일 도메인에 강하게 고정되어 대규모 인증 재설계가 필요한 경우
5. 공통 패키지 변경이 여러 기존 서비스의 UI·권한·주문에 광범위한 회귀를 유발하는 경우
6. 다른 작업자의 미커밋 변경 또는 보호 대상 파일을 수정해야 하는 경우
7. 도메인·Cloud Run·DNS 실설정 없이는 로컬 골격조차 만들 수 없는 경우

단순히 배포 도메인이 아직 연결되지 않은 것은 중지 조건이 아니다. 로컬 및 코드 Foundation은 진행할 수 있다.

---

## 6. 금지 범위

이번 작업에서는 다음을 하지 않는다.

* 별도 데이터베이스 생성
* Pharmacy-Hub 전용 ProductMaster 생성
* SupplierProductOffer 복제
* 기존 서비스 회원 자동 가입
* 일반 상품 승인 전체 구현
* 상품 카탈로그 전체 구현
* 주문·결제·정산 전체 구현
* 소비자 회원·주소록·고객 관리 구현
* 콘텐츠 제작·가져오기 전체 구현
* 커뮤니티 전체 구현
* 이벤트 오퍼 자동승인 전체 구현
* 유통참여형 펀딩 연결
* 기존 서비스 정책 변경
* 운영자 승인 기능 공통 삭제
* 대규모 디자인 개편
* 불필요한 migration
* 배포 및 DNS 변경
* 기존 WIP 수정·삭제·stash·revert

---

## 7. 검증

최소한 다음을 검증한다.

1. 신규 service key가 공통 타입과 백엔드에서 인식됨
2. Pharmacy-Hub 앱 또는 독립 서비스 진입 골격이 빌드됨
3. 기본 라우트가 렌더됨
4. 서비스 표시명이 정상 노출됨
5. 기존 서비스 키와 충돌하지 않음
6. 기존 KPA·GlycoPharm·K-Cosmetics·Neture 빌드에 회귀가 없음
7. Pharmacy-Hub에 Market Trial 연결 흔적이 없음
8. 신규 앱이 공통 사용자·조직·상품·주문 원장을 재사용하도록 설계됨
9. 회원·권한 분리의 후속 구현 지점이 명확함

전체 monorepo build는 공통 패키지 또는 전역 설정을 변경한 경우에만 실행한다. 그 외에는 대상 앱과 관련 패키지의 typecheck/build를 우선한다.

---

## 8. 산출물

1. Pharmacy-Hub Foundation 코드
2. 신규 서비스 등록 및 재사용 구조 조사 문서
3. CHECK 문서

CHECK 문서 후보:

```text
docs/checks/CHECK-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1.md
```

CHECK에는 다음을 포함한다.

* 조사한 기존 서비스 구조
* 선택한 재사용 기준 앱과 이유
* 추가한 service key
* 생성하거나 변경한 앱·라우트·패키지
* 회원·상품·콘텐츠·주문의 재사용 경계
* 이번 작업에서 구현한 범위
* 후속 작업 목록
* 중지 조건 해당 여부
* 실행한 검증 명령과 결과

---

## 9. 완료 보고 형식

### 1. 조사 결과

* 재사용 기준 앱
* 공통 패키지
* 서비스 추가 지점
* 신규 테이블 필요 여부
* 주요 위험과 미해결점

### 2. 구현 내용

* service key
* 이벤트 오퍼 key
* 앱·라우트
* 브랜드
* 권한·membership Foundation
* 변경 파일

### 3. 제외한 범위

* 상품
* 주문
* 콘텐츠
* 커뮤니티
* 이벤트 오퍼 자동승인
* 배포·DNS

### 4. 검증 결과

* typecheck
* build
* 기존 서비스 회귀
* 신규 기본 라우트

### 5. 후속 작업

우선순위 순으로 제시한다.

1. Pharmacy-Hub 회원가입·승인
2. 공급자의 Pharmacy-Hub 상품 제공
3. 약국 경영자 B2B 카탈로그·장바구니·주문
4. 공급자 콘텐츠와 운영자 콘텐츠
5. 커뮤니티
6. 이벤트 오퍼
7. 다른 배송지 부가 기능
8. `pharmacyhub.co.kr` 배포·DNS 연결

### 6. Git

* 작업 전 HEAD
* 작업 후 HEAD
* commit SHA
* push 결과

작업 완료 후 변경 내용을 path-specific commit하고 `main`에 push한다.

---

## 참조 (SSOT)

* `CLAUDE.md` — 개발 헌법 (§1 브랜치·계층, §7 Boundary Policy, §14 Frozen Baselines)
* [`docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) — 사업 철학 SSOT (공급자/운영사업자/매장 정의)
* [`docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) — 3자 Canonical Flow SSOT
* [`docs/architecture/USER-OPERATOR-FREEZE-V1.md`](../architecture/USER-OPERATOR-FREEZE-V1.md) — F11 users·service_memberships·role_assignments 3테이블 고정
* [`docs/architecture/O4O-BOUNDARY-POLICY-V1.md`](../architecture/O4O-BOUNDARY-POLICY-V1.md) — F6 Domain Boundary Matrix (serviceKey / organizationId / storeId)
* [`docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md`](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) — 공통 모듈 변경 시 전 소비처 식별 절차
* [`docs/baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md`](../baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md) — 이벤트 오퍼 공통 도메인
* [`docs/o4o-common-structure.md`](../o4o-common-structure.md) — forum/lms/signage 공통 구조 원칙
