# CHECK-KPA-STORE-ASSET-DERIVATION-VIEWER-QR-BLOG-EXTEND-V1

## 1. Summary

KPA 매장 제작 자료 화면(`StoreProductionMaterialsPage`)에서 POP 행에만 제공되던 `원본 보기` relation viewer를
**QR-code·블로그 행에도 확장**했다. 기존 read endpoint(`GET /store/asset-derivations`)와 기존 모달을 그대로 재사용하고,
결과물 종류(ResultKind)별 `derivedKind` 분기 + UI 노출만 추가했다. 신규 API/DB/migration/write-path 변경 없음.

## 2. Scope

- read-only relation viewer 확장 (POP → POP+QR+블로그).
- 단일 파일 변경: `services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx`.
- 공통 모듈/사이드바/메뉴/홈/타 서비스 미접촉.

## 3. Changed Files

- `services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx`
  - `openDerivations()` 를 `derivedKind` 고정('pop_pdf')에서 **item.kind 별 매핑**으로 일반화.
  - QR-code/블로그 행 "활용" 컬럼의 기존 `-` → **"원본 보기" 버튼** 추가(material 의 RowUseMenu extra 는 기존 유지).
  - `derivTarget` 상태에 `kind` 추가, 모달 헤더/문구를 종류별로 일반화(POP 고정 문구 제거).
- `docs/investigations/CHECK-KPA-STORE-ASSET-DERIVATION-VIEWER-QR-BLOG-EXTEND-V1.md` (본 문서)

> 신규 API/DB/migration **없음**. write-path **미변경**.

## 4. derivedKind Mapping

| 행(ResultKind) | derivedKind | derivedId |
|---|---|---|
| material (= POP 결과물, purpose='pop') | `pop_pdf` (기존 유지) | item.id |
| qr | `qr_code` | item.id (store_qr_codes id) |
| blog | `blog_post` | item.id (store_blog_posts id) |

호출: `getStoreAssetDerivations({ derivedKind, derivedId })` (기존 endpoint 재사용).

## 5. UI Behavior

- **POP**: 기존 동작 유지 — RowUseMenu 내 `원본 보기`(material+purpose='pop'). 출력/활용하기/삭제 회귀 없음.
- **QR-code**: "활용" 컬럼에 `원본 보기` 버튼(Link2). 클릭 → derivation 모달(`qr_code`). 기존 열기/삭제(soft delete) 유지.
- **블로그**: "활용" 컬럼에 `원본 보기` 버튼. 클릭 → derivation 모달(`blog_post`). 기존 열기 유지, hard delete 미노출(불변).
- **모달**: 헤더 "원본 자료", 대상 라벨 종류별(POP/QR-code/블로그), 본문 "이 자료는 아래 N개의 원본 자료를 바탕으로 만들어졌습니다." (POP 고정 문구 제거).

## 6. Empty State

relation 없는 항목(이전 생성/원본 없이 작성)은 에러가 아니라 empty state:
> "연결된 원본 정보가 없습니다. 이전 버전에서 생성되었거나 원본 관계가 기록되지 않은 자료일 수 있습니다."
- 사용자-facing 문구에 `derivedKind`/`store_asset_derivations` 등 개발 용어 미노출.

## 7. TypeScript Result

- `web-kpa-society` typecheck (`tsc --noEmit`) → **EXIT 0** (오류 없음). 공통 패키지 변경 없음.

## 8. Browser Smoke Result (배포 후 수행, 2026-06-06)

- 배포: `Deploy Web Services` run 27049437950 → **deploy-kpa-society success** (타 서비스 skip).
- 계정: KPA 약국 경영자 `renagang21@gmail.com` 로그인 성공 → `/store/library/production-materials` 진입.
- **페이지 정상 렌더** ✅: 제목 "매장 제작 자료", 설명 문구 "POP·QR-code·블로그" 반영, 하단 안내 정상. 크래시/무한로딩 없음.
- **empty state 정상** ✅: 해당 계정 매장에 제작 자료 행이 없어 "저장된 제작 자료가 없습니다." 표시.
- ⚠️ **한계(WO §11.3)**: 제작 자료(POP/QR/블로그) **데이터 행이 없어** QR/블로그 행의 `원본 보기` 버튼·모달은 **라이브 미관측**. row-level 상호작용은 정적 검증 + typecheck 로 확인.
- console error 1건: `GET /kpa/stores/<store>/blog/staff 403` — **본 변경과 무관**(블로그 목록 fetch의 사전존재 권한 이슈; 본 WO 는 blog fetch 미변경). 페이지는 graceful empty 로 처리.

### 판정
- 코드/문서/typecheck/배포: **PASS**.
- 라이브 화면 렌더·empty state: **PASS**.
- QR/블로그 row 원본 보기 라이브 상호작용: **데이터 부재로 미관측(CONDITIONAL)** — 데이터 확보 후 재확인 권장.

## 9. Regression Check

- POP `원본 보기`(RowUseMenu extra) 로직 미변경(분기 그대로).
- QR soft delete / 블로그 hard-delete-미노출 / 각 생성 write-path 미변경.
- 변경은 단일 KPA 페이지 파일 한정. K-Cosmetics signage/cosmetics cleanup, Home/Hero, StoreSidebar/menuConfig **diff 없음**.

## 10. Out of Scope (미수행)

신규 API/DB/migration, relation write-path, POP/QR/블로그 생성 로직, 블로그 hard delete 노출, 자료함 구조 개편,
사이드바/메뉴, 홈/Hero, GlycoPharm/K-Cosmetics 확장, cosmetics cleanup — **전부 미접촉**.

## 11. Follow-ups

- 배포 후 KPA 약국 경영자 계정으로 QR/블로그 `원본 보기` 라이브 smoke.
- (선택) 동일 패턴 GlycoPharm/K-Cosmetics 자료함 확장(별도 WO).
