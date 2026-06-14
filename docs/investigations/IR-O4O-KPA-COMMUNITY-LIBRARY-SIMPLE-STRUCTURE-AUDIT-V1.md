# IR-O4O-KPA-COMMUNITY-LIBRARY-SIMPLE-STRUCTURE-AUDIT-V1

> **유형:** 조사 IR (read-only, 코드/UI/API/DB/route/menu 무변경)
> **목적:** KPA Society 커뮤니티 자료실(`/resources`)의 현재 구조를 확인하고, 제목·설명·태그·첨부파일 중심의 단순 구조로 정리/공통화 가능한지 판단한다.
> **작성:** 2026-06-13

---

## ⚠️ 핵심 결론 (먼저 읽을 것)

> **KPA 커뮤니티 자료실은 이미 "단순 자료실" 구조에 매우 가깝다.** 자료 종류별 **메뉴/탭 분류가 없고**, 분류 필드(usage_type/category)는 **DB enum/check 제약 없이 soft(애플리케이션 검증)**이며 **표시·동작 selector 일 뿐 필터가 아니다.** 파일 형식은 **확장자 자동감지 badge**(필터 아님). **태그는 이미 필수(JSONB 배열)**, 검색은 제목/설명/등록자 단일 필드. 목록/검색/drawer 는 **`ResourcesHubTemplate`(@o4o/shared-space-ui)로 이미 KPA/GP/KCos 공유**.
>
> → **판정: A안 (현재 구조가 이미 단순하여 큰 수정 없이 공통화 가능).** 남은 정비는 ① `usage_type` 필수 선택을 자동감지/optional 로 약화(경미 UX), ② 단일→멀티 첨부(스키마 변경, 별도 WO) 두 가지 *선택* 항목뿐. **큰 단순화 WO 불필요.**

## 1. 조사 개요

KPA `/resources`(커뮤니티 공동 자료실)의 route·목록·등록/수정·상세·분류·검색·첨부·API·DB·공유 컴포넌트를 read-only 2-에이전트(프론트 / API·DB) 병렬 조사.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `40e66492` |
| origin ahead/behind | 0 / 0 |
| 다른 세션 WIP | shared-space-ui/index.ts · store-ui-core · App.tsx(KPA/GP/KCos) · pnpm-lock · CHECK-CODEX · StoreFacingFooter — **미접촉** |
| 조사 기준 commit | `40e66492` |

## 3. 현재 구조 요약 (route / 화면)

| route | component | 성격 | shared |
|-------|-----------|------|--------|
| `/resources` | ResourcesHubPage | 목록(hero "자료실", "회원들이 함께 이용하는 공동자료실입니다.") | **ResourcesHubTemplate(@o4o/shared-space-ui)** + KPA adapter |
| `/resources/new` | ResourceWritePage | 등록(operator 페이지형) | KPA-local |
| `/resources/:id/edit` | ResourceWritePage | 수정 | KPA-local |
| (상세) | drawer(modal) | **별도 route 없음** — 행 클릭 시 side drawer | ResourcesHubTemplate |
| (등록, 일반회원) | ResourceWriteModal | 간소 등록 modal | KPA-local |

- 목록/검색/페이지네이션/상세 drawer = **shared template**. 등록 form + `resourcesApi` = KPA-local.

## 4. 현재 분류 체계와 문제점

### 4.1 분류 구조 = LIGHT (메뉴/탭 없음, soft, 표시 전용)
| 항목 | 현황 |
|------|------|
| 자료 종류별 메뉴/탭 | **없음** — 단일 homogeneous 목록 |
| 카테고리 필터 UI | **없음** |
| 타입/usage_type 필터 UI | **없음** |
| `usage_type`(READ/LINK/DOWNLOAD/COPY) | DB VARCHAR(20), **enum/check 제약 없음**(앱 검증). 목록에선 "가져가기" 동작 아이콘/badge 로만 표시 — **필터 아님** |
| `category` | VARCHAR(100) free-form, **enum 없음**, 필터로 노출 안 됨 |
| `content_type`(participation/information)·`sub_type`(resource/content) | soft, route 분기용(sub_type='resource'로 자료실 필터). UI 분류 아님 |
| 파일 형식(PDF/IMG/DOC/VID) | **확장자 자동감지 → 색 badge**. 필터 아님 |

> **문제점이라 할 만한 강한 분류 체계가 없다.** 모든 분류는 soft(앱 레벨)·표시/동작용이며 DB enum/메뉴/탭으로 굳어 있지 않다. → 유지보수 부담이 큰 강분류 구조가 **애초에 없음**.

### 4.2 유일한 "필수 분류성 선택" = usage_type (consumption mode)
- 등록 form 에서 **"자료 활용 방식"(읽기/링크/다운로드/복사) 필수 선택** + 선택에 따라 입력 UI(파일/URL/본문) 전환.
- 단 이는 **자료 종류 taxonomy 가 아니라 "소비 방식" selector** (behavior). DB soft. → 자동감지(external→LINK, upload→DOWNLOAD)로 이미 일부 derive 됨.

## 5. 제목/설명/태그/첨부 중심 단순화 가능 여부

| 요소 | 현황 | 단순화 |
|------|------|:--:|
| 제목(title) | 필수, text | ✅ 이미 |
| 설명(summary) | 선택, textarea | ✅ 이미 |
| **태그(tags)** | **필수(최소 1), JSONB 배열, chip 입력, `@>` 검색** | ✅ **이미 구현** |
| 첨부(file) | `source_url`+`source_file_name`, **단일 파일** | △ 단일만 |
| 검색 | 제목/설명/등록자 단일 필드 | ✅ 이미 |
| 파일 형식 | 확장자 자동감지 표시 | ✅ 이미 |

> **이미 제목·설명·태그·첨부 중심.** 추가로 줄일 것은 usage_type 필수선택뿐. 단 **첨부는 단일 파일**(여러 파일 첨부는 미지원 — `attachments` 배열 없음).

## 6. 핵심 질문 답변

1. **자료 종류별 분류 제거/약화 가능한가?** → **이미 약함.** 메뉴/탭 0, 필터 0, DB enum 0. usage_type 필수선택을 자동감지/optional 로 더 약화 가능(선택).
2. **제목/설명/태그/첨부 중심 단순 구조 가능한가?** → **이미 그러함.** 태그 필수·검색 단일·분류 표시전용.
3. **파일 형식을 분류 아닌 자동 표시로 처리 가능한가?** → **이미 그러함.** 확장자 자동감지 badge, 필터 아님.
4. **운영자/내 매장 자료실 기준형으로 삼을 수 있는가?** → **가능.** `ResourcesHubTemplate` 이미 3서비스 공유, `kpa_contents.sub_type`('resource'|'content')로 운영자/내매장 연계 존재. 단 **데이터 테이블은 per-service**(kpa_contents / glycopharm_contents / cosmetics_contents — serviceKey 컬럼 대신 분리 테이블).
5. **다음 단계 = 단순화 WO vs 추가 조사?** → **큰 단순화 WO 불요.** 경미한 선택 WO(usage_type 자동감지/optional) + (선택) 멀티첨부 스키마 WO. 또는 현 상태로 종료.

## 7. 공통화 가능성 판단

| 레이어 | 공통화 현황 |
|--------|------------|
| 목록/검색/drawer UI | ✅ **이미 공유**(ResourcesHubTemplate, config-driven) |
| 등록/수정 form | KPA-local(ResourceWritePage/Modal) — 공유 여지 있음(선택) |
| API | per-service(`/kpa/contents` 등), resourcesApi adapter |
| DB | **per-service 분리 테이블**(kpa_contents/glycopharm_contents/cosmetics_contents), serviceKey 컬럼 없음 |

> UI/템플릿은 이미 공통화. 데이터·API 는 서비스별 분리(설계상). **새 공통 컴포넌트 추출보다 기존 config-driven 템플릿 확장**이 맞음 — 단 이미 적용돼 있어 추가 작업 적음.

## 8. 운영자/내 매장 자료실 확장 시 고려사항

- `kpa_contents` 가 `sub_type`('resource'=자료실 / 'content'=콘텐츠)으로 커뮤니티·운영자(`/operator/resources`)와 동일 테이블 공유. 내 매장은 `o4o_asset_snapshots`(복사본) + `store_execution_assets`.
- 운영자 자료실(`/operator/resources`)은 이미 `OperatorResourcesConsolePage`(operator-core-ui) 공유. 내 매장 `/store/library/*`는 별도 cross-service 공통 컴포넌트(선행 WO).
- 따라서 "커뮤니티 자료실 구조를 기준형으로" 는 **이미 상당 부분 실현** — 강제 통일보다 현 config-driven 구조 유지가 적절.
- **단일→멀티 첨부**를 표준으로 하려면 `kpa_contents`(+타 서비스 contents)에 `attachments` JSONB 추가 마이그레이션 필요 → 3서비스·운영자·내매장 영향, 별도 신중 WO.

## 9. 후속 작업 제안

| 후보 | 내용 | 권장도 |
|------|------|:--:|
| (현 상태 종료) | 자료실 구조 이미 단순 — 추가 WO 없이 닫기 | **유력** |
| `WO-O4O-KPA-RESOURCES-USAGE-TYPE-AUTODETECT-V1` | usage_type 필수선택 → 파일/URL 입력에서 자동감지, 수동선택 optional 화(경미 UX 단순화) | 선택 |
| `IR-O4O-RESOURCES-MULTI-ATTACHMENT-SCHEMA-V1` | 단일→멀티 첨부 스키마(3서비스 contents + 운영자/내매장 영향) 조사 | 선택(필요 시) |
| `WO-O4O-RESOURCES-WRITE-FORM-COMMONIZATION-V1` | ResourceWriteForm 을 3서비스 공유(현재 KPA-local) | 선택(낮음) |

## 10. 판단 (A/B/C/D)

**A안: 현재 구조가 이미 단순하여 큰 수정 없이 공통화 가능.**

- 강분류(메뉴/탭/DB enum) 부재, 제목·설명·태그·첨부 중심 이미 구현, 파일형식 자동표시, 목록 UI 이미 공유 → A 명확.
- B(먼저 단순화 후 공통화)는 불요 — 이미 단순+공유.
- C/D 아님 — 서비스 간 UI 동형(템플릿 공유), 커뮤니티 전용 성격 때문에 별도 설계할 구조적 이유 없음(sub_type 으로 운영자/내매장 연계).

## 11. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| 자료실이 원본·참고자료 저장 공간인가 | ✅ source_url/blocks/태그 기반 원본 보관, sub_type='resource' |
| 자료 종류별 분류 최소화 | ✅ 이미 최소(메뉴/탭/필터 0, soft 표시만) |
| 제목/설명/태그/첨부 우선 | ✅ 이미 그러함(태그 필수) |
| 파일 형식 = 자동 표시 정보 | ✅ 확장자 자동감지 badge, 분류 기준 아님 |
| 커뮤니티/운영자/내매장 같은 구조 | △ UI 템플릿 공유 + sub_type 연계. 단 멀티첨부·form 공유는 미완(선택 후속) |
| 콘텐츠 리스트·제작 편집기는 별도 단계 | ✅ 본 IR 범위 외 유지 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 수정 파일 | **없음** (read-only IR) |
| 생성 IR | `docs/investigations/IR-O4O-KPA-COMMUNITY-LIBRARY-SIMPLE-STRUCTURE-AUDIT-V1.md` |
| 조사 기준 commit | `40e66492` |
| 분류 체계 | **LIGHT/soft** — 메뉴/탭/DB enum 없음, usage_type/category 표시·동작용(필터 아님) |
| 제목/설명/태그/첨부 중심 | **이미 구현**(태그 필수). 첨부만 단일 파일 |
| 파일 형식 처리 | 확장자 자동감지 표시(분류 아님) |
| 기준형 가능성 | 가능 — ResourcesHubTemplate 이미 3서비스 공유, sub_type 연계. DB는 per-service 분리 |
| 판정 | **A안 — 이미 단순, 큰 수정 없이 공통화 가능** |
| 다음 단계 | 큰 단순화 WO 불요. (선택) usage_type 자동감지 / 멀티첨부 스키마 IR |
| git status | 다른 세션 WIP 다수(미접촉), 본 IR 문서만 신규 |
