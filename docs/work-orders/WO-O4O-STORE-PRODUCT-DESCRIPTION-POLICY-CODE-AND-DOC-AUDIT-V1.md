# WO-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1

## 1. 목적

새로 확정된 [O4O 매장용 상품 상세설명서 정책](../guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md)이 현재 코드·DB·기존 문서와 어떻게 연결되는지 read-only로 조사한다.

이번 WO는 **조사·문서 정비 전용**이다. 코드 구현, DB write, migration, deploy는 하지 않는다.

---

## 2. 기준 정책

반드시 먼저 읽는다.

```text
docs/guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md
docs/guides/products/O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1.md
docs/guides/products/health-functional-food/README.md
docs/guides/products/general-food/README.md
```

핵심 정책:

- 설명서 최우선 목적 = 제품의 매력과 신뢰를 보여 주어 소비자의 구매를 돕는 것
- O4O 공통 설명서 = O4O 상품 DB/ProductMaster 귀속
- 일반 공개 인터넷 비노출, O4O 로그인 사용자만 열람
- 건강기능식품은 O4O 직접 제작
- 일반식품 신규 제작 중단, 기존 설명서 유지
- 화장품 O4O 직접 제작 제외, 공급자 제작
- 공급자 제작 설명서 하단에 조직명·등록 연락처 자동 표시
- 약국·매장 자체 콘텐츠는 O4O 상품 DB 공통 설명서가 아니며 제작원 표시 대상 아님

---

## 3. 조사할 사항

### A. 설명서 저장 계층

다음을 실제 entity/schema/service/API 기준으로 확인한다.

- `shared_product_descriptions`
- `store_multilingual_product_content_groups/pages`
- 공급자 제작 상품 콘텐츠 저장 계층
- 약국·매장 자체 제작 제품 콘텐츠 저장 계층
- ProductMaster 연결 키
- 작성 주체·조직·소유권을 구분하는 컬럼과 메타데이터

다음 세 유형이 실제로 구분 가능한지 판정한다.

```text
O4O 공통 설명서
공급자 제작 설명서
약국·매장 자체 콘텐츠
```

### B. 공급자 조직정보와 제작원 자동 표시

- 공급자가 콘텐츠를 제작하기 전에 사용하는 회원·조직 등록 구조
- 공급자 조직명 필드
- 공식 연락처 필드
- 작성자와 공급자 조직 연결 방식
- 콘텐츠 렌더러가 조직정보를 조회할 수 있는지
- 현재 콘텐츠 하단 credit/author/source 표시 구조 존재 여부
- 조직정보 변경 시 기존 콘텐츠 표시에 자동 반영 가능한지

판정:

```text
현재 구조로 renderer 자동 표시 가능
최소 API 확장 필요
스키마 보강 필요
```

설명서 본문 HTML에 업체명·연락처 문자열을 직접 저장하는 방식과, 렌더링 시 조직정보를 자동 표시하는 방식을 비교하고 권고안을 제시한다. 정책상 후자를 우선 검토한다.

### C. 로그인 전용 설명서 열람

다음을 실제 route/API 기준으로 확인한다.

- 상품 고정 URL 후보와 현재 resolver
- 상품 기본 QR 경로
- 설명서 HTML/API의 현재 인증 여부
- 비로그인 요청 시 본문 노출 여부
- 로그인 후 원래 URL 복귀(`returnUrl`) 가능 여부
- 검색엔진 sitemap/noindex/OG/공개 캐시 상태
- 공개 검색 API에 설명서 본문이 포함되는지

구현하지 말고 현재 상태와 gap만 기록한다.

### D. 제작·비제작 분류 정책 잔여 충돌

저장소 전체에서 다음 문구와 정책을 검색한다.

```text
일반식품 설명서 신규 제작
화장품 설명서 O4O 직접 제작
건기식·일반식품·기타 공통 제품 단위 제작
약사 등 전문인 고정 문구
일반 공개/public QR 전제
공급자 연락처 직접 입력
```

각 문서를 다음으로 분류한다.

```text
Active 유지
새 SSOT 링크 추가
Legacy 표시
정책 충돌로 수정 필요
IR/CHECK 역사 문서라 수정 금지
```

IR·CHECK 역사 문서는 수정하지 않는다. Active Guide·README·KICKOFF만 수정 후보로 정리한다.

### E. 기존 일반식품 설명서 보존

- 기존 일반식품 설명서 실제 저장 위치와 건수
- ProductMaster·QR·태블릿·매장 연결 상태
- 신규 제작 중단이 기존 조회·활용에 영향을 주지 않는지
- Legacy 샘플과 실제 DB 콘텐츠의 관계

read-only로 조사하고 삭제·상태변경·연결변경은 하지 않는다.

### F. 건강기능식품 실행 문서 정렬

`health-functional-food/AGENT-KICKOFF.md`, examples, ledger와 새 SSOT 간 잔여 충돌을 정리한다.

특히 확인:

- 최우선 목적이 구매 지원으로 명확한가
- 제품 신뢰가 판매 요소로 표현되는가
- 과도한 제한·경고 중심 규칙이 남아 있는가
- 일반식품 README를 건기식 SSOT로 참조하는 잔여 문구
- 언어 정책(ko/en 등)의 현재 확정 상태
- canonical 저장·승격 절차의 현재 구현 상태

---

## 4. 산출물

```text
docs/investigations/IR-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1.md
docs/checks/CHECK-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1.md
```

IR에 포함:

- 저장 계층/소유권 맵
- 인증·고정 URL·QR 현재 상태
- 공급자 조직정보/제작원 자동 표시 가능성
- 기존 일반식품 콘텐츠 보존 상태
- Active 문서 충돌 목록
- 코드 변경이 필요한 gap 목록
- 최소 후속 WO 분리안

CHECK에 포함:

- 조사 파일·코드 경로
- DB write 0 / 코드 변경 0 / deploy 0
- 정책과 현재 구현의 일치·불일치 표
- 수정 대상 Active 문서 목록

---

## 5. 금지 사항

```text
DB write 금지
migration 금지
코드 구현 금지
배포 금지
기존 일반식품 설명서 삭제·archive 금지
QR 재발급 금지
공급자 조직정보 변경 금지
IR·CHECK 역사 문서의 정책 소급 수정 금지
```

---

## 6. 완료 기준

- 세 콘텐츠 유형의 실제 저장·소유 구조 확인
- 공급자 제작원 자동 표시 구현 가능성 판정
- 로그인 전용 설명서 열람 현재 상태 확인
- 기존 일반식품 설명서 보존 상태 확인
- 건강기능식품 실행 문서의 잔여 충돌 확인
- 후속 구현 WO를 최소 단위로 제안
- commit/push 완료
