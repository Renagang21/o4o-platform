# 📘 WORK ORDER (STANDARD)

## WO-NETURE-CORE-V1

**Neture 유통·제휴 연결 플랫폼 – Core P0 구현**

---

### 0. Work Order 표준 헤더

* **ServiceGroup**: `neture`
* **Service Name**: Neture
* **Service Status**: **Development**
* **App Type**: **standalone (non-core)**
* **Target Phase**: P0 (Minimal Operable Scope)
* **Branch Strategy**: `feature/neture-core-v1`
* **Design Core**: **v1.0 적용 (필수)**
* **Governance**: CLAUDE.md 전면 준수
* **Change Policy**: Core 변경·구조 재설계·API 계약 수정 시 **즉시 중단 후 ChatGPT 판단 요청**

---

## 1. 목적 (Purpose)

Neture를 **주문·결제·정산을 수행하지 않는**
B2B 유통 **정보 · 선택 · 제휴 연결 플랫폼**으로 P0 수준에서 구현한다.

본 Work Order는 **기능 확장용 문서가 아니라, 경계를 고정하기 위한 문서**이다.

---

## 2. 범위 (Scope)

### IN SCOPE

* Neture 웹 서비스(P0)
* Home 화면
* 공급자 소개 페이지
* 제휴 요청(판매자 주도) 목록/상세
* 로그인/계정 연결(표시 레벨)
* 외부 커뮤니케이션 연결(카카오톡 포함)

### OUT OF SCOPE (절대 금지)

* 주문 생성
* 결제/정산
* 내부 메시지/채팅
* 매출·성과 분석
* 계약/수수료 계산
* **Neture 전용 판매자 대시보드**

> ⚠️ OUT OF SCOPE 요구 발생 시 **즉시 작업 중단**

---

## 3. 핵심 원칙 (Non-Negotiable)

1. Neture는 **중립 연결 레이어**다.
2. 관리/운영의 중심이 되지 않는다.
3. 모든 실질 협의는 **외부 채널**에서 이루어진다.
4. 판매자 관리 행위는 **각 서비스 판매자 대시보드**에서 수행한다.
5. P0를 넘기지 않는다.

---

## 4. 기능 요구사항

### 4.1 Home

**목표**: 흐름 제시(설명 최소화)

* Hero: 유통 정보·제휴 연결 플랫폼 메시지
* 공급자 탐색 CTA
* 제휴 요청 카드 섹션
  * 판매자명
  * 제휴 대상 제품 수
  * 제휴 기간
  * 제휴 기준 수익 구조(표시용)
  * CTA: "제휴 조건 보기"

---

### 4.2 공급자 페이지

* **URL**: `/suppliers/{supplierSlug}`
* **성격**: 공급자 마이크로 소개 사이트(표준 템플릿)

**표시 정보**

* 공급자 소개
* 제품 리스트
* 가격 정책(표시)
* MOQ
* 배송 정책(일반/도서/산간)
* 외부 연락: 이메일/전화/웹/카카오톡

**금지**

* 주문/결제 버튼
* 내부 메시지

---

### 4.3 제휴 요청(파트너 모집)

* **개념**: 파트너 소개 ❌ / **판매자 제휴 요청 ⭕**
* **URL**
  * `/partners/requests`
  * `/partners/requests/{requestId}`

**제휴 요청 구성**

1. 판매자(사이트) 정보
2. 제휴 대상 제품 리스트
3. 제휴 기준 수익 구조 *(정산 약속 아님)*
4. 제휴 기간(시작/종료)
5. 홍보 범위(선택형)
6. 협의 채널(이메일/전화/웹/카카오톡)

**상태값**

* `OPEN` / `MATCHED` / `CLOSED`
* `MATCHED`: 노출 유지, 추가 선택 불가

> 생성 UI는 **각 서비스 판매자 대시보드**에서 호출(연동 전제).
> Neture는 **표시/상태 관리만** 담당.

---

### 4.4 로그인/계정

* 기본 로그인
* 판매자/공급자 구분(표시 레벨)
* 권한 로직 확장 금지

---

## 5. UI/UX 가이드

* Design Core v1.0 필수 적용
* 행위 중심 문구(신청/조건 보기/외부로 이동)
* 관리 콘솔처럼 보이지 않도록 제한

---

## 6. 기술적 중단 조건 (Mandatory Stop)

다음 발생 시 **즉시 중단**:

* 결제/정산 로직 필요 주장
* 내부 메시지 요구
* Neture 전용 판매자 대시보드 추가 시도
* 다중 파트너 매칭 제안
* Core/API 계약 변경 필요 판단

---

## 7. Definition of Done

* [ ] Home 정상 노출
* [ ] 공급자 페이지 접근 가능
* [ ] 제휴 요청 목록/상세 표시
* [ ] 상태값 정상 작동
* [ ] 외부 링크(카카오톡) 작동
* [ ] OUT OF SCOPE 위반 없음
* [ ] Design Core v1.0 적용 확인

---

## 8. 개발 후 단계

* 각 서비스 판매자 대시보드에
  **"Neture 연결 섹션" 순차 적용** (별도 WO)
* P0 운영 결과에 따라 확장 여부 판단

---

### 최종 선언

> **본 Work Order는 "여기까지만 만든다"를 보장한다.**
> 범위를 넘기려는 모든 시도는 중단 대상이다.

---

**상태**: ✔ 표준 헤더 적용 완료 · ✔ 헌법 정합성 충족

---

## 9. 개발 착수 체크리스트

### 9.1 사전 준비

- [ ] `feature/neture-core-v1` 브랜치 생성
- [ ] Service Template 정의 여부 확인
- [ ] DB 스키마 설계 (neture_ prefix)
- [ ] API 엔드포인트 계약 정의

### 9.2 Core 영향 검토

- [ ] Core DB 변경 필요 여부 → **없음 확인**
- [ ] Core API 변경 필요 여부 → **없음 확인**
- [ ] Auth/User 구조 변경 → **없음 확인**
- [ ] E-commerce Core 연동 → **없음 (주문/결제 없음)**

### 9.3 개발 진행

- [ ] Design Core v1.0 컴포넌트 사용
- [ ] GlycoPharm/K-Cosmetics HomePage 패턴 참조
- [ ] 외부 링크 처리 (카카오톡 등)
- [ ] 상태 관리 (OPEN/MATCHED/CLOSED)

### 9.4 배포 전 검증

- [ ] `pnpm build` 성공
- [ ] OUT OF SCOPE 위반 검토
- [ ] Design Core v1.0 적용 확인
- [ ] 콘솔 에러 없음

---

**Work Order 생성일**: 2026-01-11
**예상 완료 단계**: P0 (Minimal Operable)
**다음 단계**: 서비스별 대시보드 연동 (별도 WO)
