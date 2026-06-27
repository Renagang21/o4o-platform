# CHECK-O4O-KPA-OPERATOR-STORE-CONTENT-MENU-TERMINOLOGY-ALIGNMENT-V1

> 운영자/내매장 콘텐츠 명칭·문구 통일 (라벨 only, route/기능/데이터 무변경) 구현·배포·smoke 검증.
>
> WO: `WO-O4O-KPA-OPERATOR-STORE-CONTENT-MENU-TERMINOLOGY-ALIGNMENT-V1`
> 선행: [`IR-...-LIVE-UX-VALIDATION-V1 §9`](../ir/IR-O4O-KPA-OPERATOR-STORE-SHARED-FUNCTION-LIVE-UX-VALIDATION-V1.md) (불일치 실측 + 통일 후보표)
> 작성일: 2026-06-27 · 상태: 구현·배포·라이브 smoke 완료 PASS · 커밋 `c814bdbd7`(KPA-local) + `2950425f5`(shared)

---

## 1. 사용자 확정 라벨 (입력값)
| 항목 | 결정 |
|---|---|
| 상태 라벨(draft/published/archived) | **초안 / 발행 / 보관** |
| 생성 버튼 | **매장 스타일** (블로그 글쓰기 / X 만들기) |
| 사이드바 그룹 언어 | **국문 통일** |
| "콘텐츠 허브" 충돌 | **매장에 맞춤** (운영자 측 개명, 매장 유지) |

---

## 2. 변경 내용

### 2.1 KPA-local (commit `c814bdbd7`, 8 files)
| 카테고리 | 변경 | 파일 |
|---|---|---|
| 상태 라벨 | 매장 블로그 `임시저장→초안`, `발행됨→발행` | `PharmacyBlogPage.tsx:45-46` |
| 상태 라벨 | 운영자 다국어 `발행됨→발행`, `보관됨→보관` | `OperatorMultilingualContentListPage.tsx:33-34` |
| 생성 버튼 | `새 블로그→블로그 글쓰기` / `새 POP→POP 만들기` / `새 QR 템플릿→QR 템플릿 만들기` / `새 동영상→동영상 만들기` / `새 콘텐츠 작성→콘텐츠 만들기` / `콘텐츠 등록→콘텐츠 만들기` | Operator{Blog,Pop,Qr,Video,MlcList,ContentHub}Page |
| 콘텐츠 허브 개명 | 운영자 `/operator/docs` 제목·메뉴 `콘텐츠 허브→콘텐츠 허브 관리` (매장 `/store-hub/content` 탭 "콘텐츠 허브" 유지) | `OperatorContentHubPage.tsx:402`, `operatorMenuGroups.ts`(2곳) |
| 빈화면 문구 | 운영자 POP `작성한→만든`, 동영상 `등록한→만든` | OperatorPop/VideoListPage |

> 운영자 list 페이지(blog/pop/qr/video)는 이미 `초안/발행/보관` → 무변경. 운영자 콘텐츠 허브는 별도 모델(draft/ready=`초안/완료`)이라 상태 어휘 통일 대상 외(§R6 값 정합은 별도 IR).

### 2.2 SHARED (commit `2950425f5`, 1 file)
`packages/ui/src/operator-shell/constants.ts` `STANDARD_GROUPS` 라벨 영문→국문:
`Dashboard→대시보드 · Users→회원 · Approvals→승인 · Products→상품 · Stores→매장 · Orders→주문 · Content→콘텐츠 · Resources→자료실 · LMS→강의 · Signage→사이니지 · Forum→포럼 · Analytics→분석 · System→시스템`. **key/capability/순서 불변.**

> ⚠️ **SHARED**: `@o4o/operator-ux-core`(DomainIASidebar/OperatorAreaShell) 경유로 **KPA·Neture·GlycoPharm·K-Cosmetics 4개 operator 대시보드 공통 적용**. 모두 국문 서비스라 적합. label-only(로직/route/capability 무영향). Shared-Module Protocol: 소비처 4서비스 식별·검증 완료.

---

## 3. 검증

### 3.1 정적
- `pnpm -C services/web-kpa-society exec tsc --noEmit` → **0 errors** (direct-include 패턴; `tsc -b`는 tsconfig.node emit 제약으로 부적합).

### 3.2 배포
- KPA-local + shared push 후 **Deploy Web Services `service=all`** 트리거 → k-cosmetics/kpa-society/glycopharm/neture **4개 모두 success**(shared `packages/ui` 변경 반영 보장; detect-changes는 HEAD만 보므로 수동 all 트리거).

### 3.3 라이브 브라우저 smoke (배포 후, read-only)
| 화면 | 실측 | 판정 |
|---|---|---|
| 운영자 사이드바 그룹 | 승인/매장/콘텐츠/강의/사이니지/포럼/분석/시스템 — **영문 잔존 0** | ✅ |
| `/operator/blog` 버튼 | **"블로그 글쓰기"** / 상태탭 전체·초안·발행·보관 | ✅ |
| `/operator/docs` | 제목 **"콘텐츠 허브 관리"** + **"콘텐츠 만들기"** | ✅ |
| `/operator/multilingual-product-contents` | **"콘텐츠 만들기"** + 상태 발행·보관 | ✅ |
| `/store/content/blog` | 상태탭 **전체·초안·발행·보관** + "Not the store owner" 미노출 | ✅ |

---

## 4. What Was Not Changed
- route / 기능 / API / DB / capability / 데이터 무변경 (라벨 문자열만).
- 운영자 콘텐츠 허브 상태 **값** (draft/ready) 통일은 미수행 — 별도 설계 IR(§R6, 고위험).
- 내부 코드명(컴포넌트/심볼/group key) 무변경.
- GP/Cosmetics/Neture 의 KPA-local 라벨(상태/버튼)은 미변경 — 본 WO는 KPA 한정(사이드바 그룹만 shared 공통).

---

## 5. Follow-ups
- 상태 **값** 정합(`ready/draft↔published`) — `WO-O4O-KPA-STATUS-VOCAB-VALUE-NORMALIZATION-IR-V1`(고위험, 설계 선행).
- 콘텐츠 작성·발행 흐름 통일(모달/페이지) — `WO-O4O-KPA-OPERATOR-CONTENT-EDITOR-FLOW-PARITY-V1`.
- QR 생성 동선 통일 — `WO-O4O-KPA-QR-CREATION-FLOW-PARITY-V1`.
- 빈화면 문구 잔여(매장 HUB import-side "운영자 게시 …" 등)는 의미가 달라 유지.

---

**작성:** O4O Platform Team · 2026-06-27
**상태:** 명칭/문구 통일 완료 — KPA-local + 사이드바 국문화(4서비스 shared) 배포·라이브 smoke PASS.
