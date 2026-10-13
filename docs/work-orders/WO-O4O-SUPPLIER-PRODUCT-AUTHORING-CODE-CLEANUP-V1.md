# 공급자 상품 등록·import 코드 정비 — 2차

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (KST)
> **근거**: 사용자 — 다음 작업 진행. 1차 다음의 등록/import 정비, commit → push 종료 범위 유지.

## 최초 TODO와 재점검

코드 점검 전에 `/workspace/artifacts/supplier-code-phase2-todo.md`에 TODO를 작성했다.
최신 main `aa59a0962`에서 재점검한 대상은 Create 1,202행 / Import 1,233행이다.
1차 push `f03b36325` 및 앞선 미통합 공급자 변경을 새 독립 checkout/`wo/supplier-code-phase2`에
dependency merge했다. 이전 checkout/branch는 그대로 보존했다.

정본: [Role Workspace §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[Supplier Boundary](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md),
[B2B Contract](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md),
[Commerce Boundary](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md).

- [x] 최초 TODO → 최신 코드·문서·route·소비처·테스트 조사 → TODO 보정
- [x] 원래 두 화면 상호작용 검사로 회귀 기준 확인
- [x] 등록 폼·master-less 미디어·Candidate 제출·단계 표시 책임 분리
- [x] import 분석/편집 workflow·이미지 복사/초안 전달·표시 모듈 분리
- [x] 기존 소스 경계 검사를 분리된 모듈까지 확장하고 assertion 유지
- [x] 회귀·타입·빌드·lint·AST 비교·PC/mobile browser 검사
- [x] 명시적 파일 commit → branch push → 원격 일치 확인

## 확정 구현

| 영역 | 변경 |
|---|---|
| SupplierProductCreatePage | `product-create/`의 form/guide/media/submission hook, 기본 정보/미디어 표시 모듈로 분리. 페이지 1,202 → 373행 |
| 폼 상태 | 단일사용 import draft·제품 유형·카테고리/브랜드·바코드 조회·외부 LLM draft 적용·단계 검증/이동은 form hook. 기존 Master 발견 시 from-master 안내 |
| 가격 폼 초기값 | 기존 단계별 초기화 의미를 명시적인 step snapshot으로 보존. 입력 중 parent 재렌더가 가격을 초기화하지 않음. 바코드 callback은 안정화하고 자동 조회의 1회 guard 유지 |
| 후보 제출 | Candidate 전용 endpoint/payload, 수동 Brand identity, 규제 유형/drugCategory, master-less 미디어 URL, 이미지 부분 실패 안내·성공 화면을 보존 |
| SupplierProductImportPage | `product-import/`의 workflow, transfer hook, 분석 매핑 helper, 프록시 이미지/추출 결과/등록 설정 표시 모듈로 분리. 페이지 1,233 → 203행 |
| import transfer | thumbnail/standard/preserve 복사 정책·선택 순서·복사 실패·설명 삽입·draft 저장 후 이동 책임 분리. 원본 HTML은 브라우저에서만 분석 |
| import 갤러리 누락 | 도우미가 `detailImageUrls`에 저장한 갤러리를 등록 폼이 읽지 않아 후보에서 빠지던 결함 보완. 기존 `contentImageUrls` API 입력으로 합치고 중복 제거·순서 보존 |
| 경계 검사 | cutover 검사가 새 등록/import 모듈 전체를 읽도록 확장. Supplier 에디터 소비처 검사에 이동한 에디터 추가. 금지 항목 assertion 제거 없음 |

폼과 transfer 소비처 사이의 입출력을 typed context로 명시했다.
기존 parser, storage, ProductForm, RichTextEditor, SupplierActivationGate 및 public route/export를 재사용한다.
신규 제품은 Candidate → 운영자 승격 → Master, 기존 제품은 Master → Offer 연결이다.
등록 도우미가 Master/Offer를 직접 생성하거나 내부 AI 호출로 바뀌지 않는다.
API·권한·schema·CI·package/lockfile·운영 데이터 변경은 없다. 백엔드 변경은 소스 경계 테스트만이다.

## 검증·후속 경계

동일 상품 UI 정비 트랙의 [CHECK 2차 절](../checks/CHECK-O4O-SUPPLIER-PRODUCT-UI-CODE-CLEANUP-V1.md)을 참고한다.
실계정은 사용자 유예대로 NOT_RUN이다. main PR/merge·배포는 범위 밖이다.
최종 fetch에서도 main은 `aa59a0962`다.

다음 개발 단계는 공급자 프로필/API 모듈 책임 정비다. 이후 backend router/controller와 공유 설명/program 소비처를 조사한다.
기존 모바일 Drawer 잘림과 공통 에디터 이미지 도구막대 넘침은 후속 UI 보완으로 남긴다.
공통 에디터의 변경은 모든 소비처 점검을 거친 별도 범위이며 이번에 임의 수정하지 않았다.

문서 정합: 이번 WO와 동일 트랙 CHECK의 2차 검증 절만 추가. 정본·1차 기록 의미 변경 없음.

## Git 인계

구현 `15498766a0cb946d52c8492d2cc1ea3e0b10a68d`를 `wo/supplier-code-phase2`에 push했고
`ls-remote` 일치를 확인했다. 이후 완료 기록 commit의 최종 원격 SHA는 결과 보고에서 확인한다.
앞선 공급자 변경도 dependency merge로 이 branch에 포함된다. main PR/merge·배포는 수행하지 않았다.
자기 검증 서버는 종료했다. checkout/branch는 KEEP — main 미통합, 후속 인계에 필요하다.
