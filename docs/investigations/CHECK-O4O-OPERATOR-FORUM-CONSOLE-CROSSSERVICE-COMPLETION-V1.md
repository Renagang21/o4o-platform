# CHECK-O4O-OPERATOR-FORUM-CONSOLE-CROSSSERVICE-COMPLETION-V1

> **read-only 완료 검증 CHECK.** 코드/UI/API/DB/route/menu 변경 없음.
> 4개 서비스(GlycoPharm / K-Cosmetics / Neture / KPA-Society)의 operator **포럼 신청·삭제요청 콘솔 공통화 완료**를 정적 검증한다.

| 항목 | 값 |
|------|------|
| 작성일 | 2026-06-03 |
| 분류 | CHECK (완료 검증, read-only) |
| 기준 커밋 | origin/main `eac6ced4d` (WO-O4O-KPA-FORUM-REQUESTS-CONSOLE-CONVERGENCE-WITH-STATE-EXTENSION-V1) 반영 |
| 공통 모듈 | `@o4o/operator-core-ui/modules/forum-requests`, `.../forum-delete-requests` |
| 판정 | **PASS — 4/4 서비스 공통 콘솔 수렴 완료** |

---

## 1. 목적

operator 포럼 **신청(category 생성 요청)** 과 **삭제 요청** 두 콘솔을 4개 서비스가 동일한 공통 컴포넌트(`@o4o/operator-core-ui`) 기반 thin wrapper로 수렴했는지 확인하고, 잔여 직접구현/누락 서비스가 없음을 고정한다.

### 범위 밖 (명시)

> **동시 진행 중인 아래 작업은 본 forum 콘솔 공통화 범위 밖이며 본 CHECK의 판정 대상이 아니다.**
> - `f9ce750e8` — KCos **seller / store-owner write-path** (WO-O4O-KCOSMETICS-SELLER-STORE-OWNER-WRITEPATH-FIX-V1)
> - `backfill-cosmetics-seller-stores.ts` — KCos 판매자 → store_owner / org context 보정 (prod backfill, 별도 세션 담당, Cloud Run Job / 운영 채널 실행 필요)
> - `a61853fd1` — KPA qualification migration timestamp collision fix (별도 세션)
> - API Server (Cloud Run) 배포 + role 정규화 마이그레이션 실행 결과 (배포 watch 별도 추적 — forum CHECK의 직접 차단요소 아님)
>
> KPA 고유 **포럼 목록/카테고리 관리**(`ForumCategoriesManagementPage`)와 **포럼 운영 허브**(`OperatorForumPage`)도 신청 콘솔 공통화 대상이 아니다(IR 판정 D — 별도 유지).

---

## 2. 검증 방법

정적 코드 분석(read-only). 공통 콘솔 소비처 grep · wrapper 규모 측정 · optional 확장 사용 확인 · 타입체크 결과 인용. 코드 실행/배포/DB 접근 없음.

---

## 3. 공통 콘솔 채택 매트릭스 (4/4)

| 서비스 | 신청 콘솔 wrapper | 삭제요청 콘솔 wrapper | batch-client |
|--------|-------------------|------------------------|:------------:|
| **GlycoPharm** | `ForumRequestsPage.tsx` (43L) ✅ | `ForumDeleteRequestsPage.tsx` (48L) ✅ | fan-out (미보유) |
| **K-Cosmetics** | `ForumRequestsPage.tsx` (42L) ✅ | `ForumDeleteRequestsPage.tsx` (48L) ✅ | fan-out (미보유) |
| **Neture** | `ForumManagementPage.tsx` (50L) ✅ | `ForumDeleteRequestsPage.tsx` (60L) ✅ | batchReview / batchApprove·Reject 주입 |
| **KPA-Society** | `ForumRequestsManagementPage.tsx` (140L) ✅ | `ForumDeleteRequestsPage.tsx` (62L) ✅ | delete: batchApprove·Reject 주입 / requests: fan-out |

- **신청 콘솔(`OperatorForumRequestsConsolePage`) 소비처 = 4** (GP/K-Cos/KPA/Neture)
- **삭제요청 콘솔(`OperatorForumDeleteRequestsConsolePage`) 소비처 = 4** (GP/K-Cos/KPA/Neture)
- 모든 wrapper가 thin(42–140L, 직접 DataTable/ActionBar/Drawer 마크업 없음). KPA 신청 wrapper(140L)는 optional 확장 config 주입 때문에 다소 길지만 여전히 wrapper(콘솔 위임).

> 잔여 직접구현 forum 신청/삭제 콘솔 **없음**. 누락 서비스 **없음**.

---

## 4. 서비스별 수렴 경로 (계보)

| 서비스 | 수렴 WO |
|--------|---------|
| GlycoPharm | WO-O4O-OPERATOR-FORUM-REQUESTS/DELETE-REQUESTS-CONSOLE-COMMONIZATION-V1 |
| K-Cosmetics | 〃 (동일 commonization WO) |
| Neture | WO-O4O-NETURE-FORUM-CONSOLE-CONVERGENCE-APPLY-V1 (+ batch-client option) |
| KPA-Society (삭제) | WO-O4O-KPA-FORUM-DELETE-REQUESTS-CONSOLE-CONVERGENCE-V1 (`627e6c4f0`) |
| KPA-Society (신청) | WO-O4O-KPA-FORUM-MANAGEMENT-TAB-DECOMPOSITION-V1 (`5162648ed`, 2탭 분해) → WO-O4O-KPA-FORUM-REQUESTS-CONSOLE-CONVERGENCE-WITH-STATE-EXTENSION-V1 (`eac6ced4d`, 수렴+상태확장) |

근거 IR: `docs/investigations/IR-O4O-KPA-FORUM-MANAGEMENT-TAB-DECOMPOSITION-V1.md`

---

## 5. KPA 고유 요소 — optional 확장으로 흡수 (공통 콘솔 기본 동작 불변)

KPA 신청 wrapper(`ForumRequestsManagementPage.tsx`)는 공통 콘솔의 **backward-compatible optional 확장**을 전부 사용:

| 확장 | KPA 주입 | 검증 |
|------|----------|------|
| `statusConfig` (병합 override) | creating/completed/failed + approved=blue 등 | grep ✓ |
| `statusFilterOptions` | 전체/대기/보완/승인/생성실패/거부 | grep ✓ |
| `extraColumns` | 포럼 유형(공개/비공개) + 태그 | grep ✓ |
| `canRecreate` + `client.recreate` | `status==='failed'` 복구(recreateForum, 단건 전용) | grep ✓ |
| `recreateActionLabel` | '재생성' | grep ✓ |
| `renderDetailExtra` | 유형/태그/생성오류/슬러그 drawer 상세 | grep ✓ |

- **상태머신 보존**: `creating` · `completed` · `failed` · `recreate` 모두 유지(WO 요구 충족).
- **GP/K-Cos/Neture 영향 없음**: base 4-state만 사용 → 확장 미주입 시 기존 동작 그대로. `operator-core-ui` tsc(forum-requests 오류 0) + `web-neture` tsc(forum 오류 0)로 type-level 호환 검증.
- **정책 계승**: 보완(revision) 의견 필수 · bulk는 승인/거절만 · recreate는 bulk 제외(단건 drawer) — 공통 콘솔에서 일괄 보장.

---

## 6. 공통 콘솔 optional 확장 surface (origin/main `eac6ced4d` 반영)

`packages/operator-core-ui/src/modules/forum-requests/`:
- `types.ts` — `ForumRequestExtendedStatus`(creating/completed/failed), `ForumRequest.forumType?/tags?/errorMessage?`, `client.recreate?`, props(`statusConfig`/`statusFilterOptions`/`extraColumns`/`canRecreate`/`recreateActionLabel`/`renderDetailExtra`), `client.list` status 파라미터 ExtendedStatus 확대
- `ForumRequestsConsole.tsx` — default+override 병합 statusConfig, filterOptions 렌더, tags 검색 흡수, extraColumns 삽입, recreate drawer 액션, renderDetailExtra
- `index.ts` — `ForumRequestExtendedStatus` export

삭제요청 모듈은 이전 WO에서 batch-client option(`batchApprove?/batchReject?`) + `loadGuideSections` 확장 완료(GP/K-Cos/Neture/KPA 공용).

---

## 7. origin/main 반영 상태

```
origin/main 최신:
  f9ce750e8  KCos seller write-path        (다른 세션, 범위 밖)
  a61853fd1  KPA qualification migration   (다른 세션, 범위 밖)
  eac6ced4d  ← forum-requests 수렴 (본 CHECK 기준 커밋)
```
- `eac6ced4d` ∈ origin/main 확인 ✓ (selective push `eac6ced4d:main`, fast-forward)
- forum 변경 6개 파일(누적): forum-requests 모듈 3 + KPA wrapper(requests) + KPA wrapper(delete) + KPA 2탭 분해분 — 전부 origin 반영.

---

## 8. 배포 상태 (참고 — forum CHECK 차단요소 아님)

- **Deploy Web Services (Cloud Run)** = ✅ **success** — forum-requests 수렴(operator-core-ui + web-kpa-society 등 웹 서비스)의 실제 배포. **forum 공통화는 배포까지 완료**.
- Deploy API Server (Cloud Run) — 최신 main(`f9ce750e8`) 기준 진행 중. role 정규화 + `a61853fd1` 마이그레이션 실행 포함. **별도 watch로 추적**(범위 밖, 결과는 별도 보고). forum 콘솔은 frontend 변경이라 API 배포 결과가 forum 기능 정합을 좌우하지 않음.
- CodeQL/CI Pipeline의 일부 `cancelled`는 연속 push에 따른 GitHub concurrency 표준 동작(실패 아님).

---

## 9. 판정

**PASS — operator 포럼 신청·삭제요청 콘솔 4-service 공통화 완료.**

- 신청 4/4 · 삭제요청 4/4 공통 콘솔 수렴, 잔여 직접구현/누락 없음.
- KPA 상태머신·recreate·태그/유형은 공통 콘솔 optional 확장으로 보존, 타 서비스 동작 불변(type-level 검증).
- forum 변경 origin/main 반영 + Web Services 배포 success.
- KPA 카테고리 관리는 고유 화면으로 별도 유지(IR D), 신청 콘솔에 미혼입.

### 후속 (범위 밖 — 다른 세션/추적)
- [ ] API Server 배포 + 마이그레이션 성공 확인 (watch 진행 중)
- [ ] KCos `backfill-cosmetics-seller-stores.ts` prod 실행 (KCos 세션 / Cloud Run Job)
- [ ] (선택) KPA 포럼 목록/카테고리 관리 공통화 검토 — 현재 KPA 단독 수요라 비대상
