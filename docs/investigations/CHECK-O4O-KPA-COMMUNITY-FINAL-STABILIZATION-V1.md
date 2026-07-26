# CHECK-O4O-KPA-COMMUNITY-FINAL-STABILIZATION-V1

> **WO:** WO-O4O-KPA-COMMUNITY-FINAL-STABILIZATION-V1
> **작성일:** 2026-07-26
> **유형:** 최종 점검 + 발견 오류 최소 수정. 백엔드 1파일(쿼리 2건). 신규 API·테이블·migration·정책 변경 0.
> **상태:** ✅ 완료 — 배포·프로덕션 smoke 완료. **추가 발견 2건 중 1건 수정 · 1건 정책 판단 필요로 보고**

---

## 1. 진행 중 작업 마감 — `WO-O4O-KPA-RESOURCE-LIST-SOURCE-URL-PAYLOAD-PARITY-V1`

커밋 `d73a9196c` · API 배포 success.

| 항목 | 결과 | 근거 |
|------|:----:|------|
| 목록 API `source_url` 반환 | ✅ | 자료 3건 전부 실제 GCS URL 반환 |
| `source_file_name` 반환 | ✅ | `FSB_0712_09.pdf` 등 |
| **파일 유형 배지 정합** | ✅ | 배지 **PDF** 정상 표시(추가 전에는 배지가 뜨면서 '기타'로 오표시될 상태였다) |
| **파일 링크 복사 성공** | ✅ | 토스트 **`파일 링크가 복사되었습니다`**, 클립보드에 실제 PDF URL 기록 |
| `/assets/copy` 요청 | ✅ **0건** | 클릭 후 네트워크 감시 결과 매칭 0 |
| Drawer 다운로드 회귀 | ✅ | `다운로드` 앵커 + `download="치아우식증 예방을 위한.pdf"` 정상 |

> 수정 전에는 `복사할 파일 링크가 없습니다` 오류였다. **행 버튼이 프로덕션에서 처음으로 실제 동작한다.**

---

## 2. 최종 점검한 화면과 흐름

| 화면 | 결과 | 비고 |
|------|:----:|------|
| `/` (Home) | ✅ | 404 0 · 공지 비링크 유지 · 최신글 6링크 · 섹션 7개 정상 |
| `/forum` | ✅ | 검색·글쓰기 CTA 정상 · **매장 복사 문구 0** |
| `/content` | ✅ | 검색 입력 정상 · 문서 3행 · 상세 링크 5 |
| `/content/documents` | ✅ | (선행 WO 확인) 액션 버튼 유지 |
| `/content/resources` | ✅ | (선행 WO 확인) 가져가기 액션 0 |
| `/content/surveys` | ✅ | `설문조사` 렌더 · 검색 존재 · 빈 상태 문구 정상 |
| `/resources` | ✅ | §1 전 항목 통과 |
| `/lms` | ⚠️→✅ | **강의 5건 존재 확인 → §3-1 오류 발견 계기** |
| `/signage` | ⚠️ | 동영상 5건 정상 렌더 → **§3-2 발견** |
| `/store/library/contents` | ✅ | 로그인 후 진입·자료함 조회 정상 |

로그인/비로그인 양쪽 흐름, 데스크톱·모바일 뷰 모두 확인했다.

---

## 3. 추가 발견 오류 (2건)

### 3-1. ✅ **수정** — Home 최신글 '강의' 탭이 항상 비어 있었다 (silent SQL 실패)

**증상:** `/lms` 에는 `published` 강의가 존재하는데 `/home/latest?type=course` 는 **항상 0건**.
선행 WO(C2)에서 "데이터 부재" 로 판단해 클릭 검증을 미뤘던 항목인데, **실제로는 데이터가 있었다.**

**원인:** `lms_courses` 는 camelCase 인용 컬럼(`"instructorId"` · `"createdAt"`)을 쓰는데
쿼리가 snake_case(`instructor_id` · `created_at`)로 조회 → **매 호출 SQL throw** →
상위 `Promise.allSettled` 가 삼켜 **오류 표시 없이 빈 목록**이 됐다.

**수정:** 컬럼명만 실제 스키마에 맞춤(커밋 `3cbb927cd`). 조회 조건·정렬·개수 무변경.

```
c.instructor_id → c."instructorId"
c.created_at    → c."createdAt" AS created_at   (응답 키는 기존 유지)
```

**검증(배포 후):** `type=course` **5건** · `type=all` 에 course 3건 포함 ·
Home 강의 탭 링크 5개(전부 canonical `/lms/course/{id}`) · **클릭 시 강의 상세 정상 진입**.
→ **C2(강의 링크)가 이제 실데이터로 완전 검증됐다.**

### 3-2. ✅ **해소 (2026-07-26 결정 후 수정)** — Home 최신글 '사이니지' 탭이 비어 있었다

> **사용자 결정:** Home 도 HUB 공유 계약과 동일하게 `hq · supplier · community` 로 정렬한다.
> `store` 는 개별 매장 전용이라 계속 제외. **새 정책이 아니라 Home 만 오래된 출처 구성을 쓰던 불일치 수정.**
>
> **수정:** [kpa.routes.ts](../../apps/api-server/src/routes/kpa/kpa.routes.ts) `sources: ['hq','store']` → `['hq','supplier','community']` (커밋 `4a763d857`)
>
> **검증(배포 후):**
> - `/home/latest?type=signage` **0건 → 5건**, 전부 canonical `/signage/media/{id}` 링크
> - `/home/signage` media **0 → 5**, playlists **0 → 1**
> - `type=all` 타입 분포에 `signage: 5` 포함
> - 브라우저: 사이니지 탭 개별 상세 링크 5개, 클릭 시 미디어 상세 정상 렌더(제목·재생시간·"내 매장에 추가"), 허브 고정 링크 0
> - → **선행 WO 의 C3(사이니지 개별 상세 연결)가 이제 실데이터로 완전 검증됐다**
>
> 아래는 결정 이전의 원 조사 기록이다.

**사실:** KPA 사이니지 미디어 5건이 **전부 `source='community'`** 인데,
Home 이 쓰는 `SignageQueryService` 의 KPA config 는 `sources: ['hq','store']` 라 전부 제외된다.

| 경로 | source 조건 | 결과 |
|------|-------------|------|
| `/signage` 허브(공개 목록) | `hq, supplier, community` | **5건 표시** |
| `/home/signage` · `/home/latest?type=signage` | `hq, store` | **0건** |

**수정하지 않은 이유:** 이는 SQL 오류가 아니라 **"KPA Home 에 어떤 소스를 노출할지" 설정값**이다.
`sources` 에 `'community'` 를 추가하면 Home 표시 항목이 늘어나는 동시에
**`/home/signage` 와 operator dashboard/summary 의 집계**(같은 `listForHome` 사용)도 함께 바뀐다.
→ WO §6 중지 조건 **"정책 결정"** 에 해당하여 별도 판단 대상으로 남긴다.

**결정 시 변경 지점(1줄):** [kpa.routes.ts:195](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L195) `sources: ['hq','store']`

> 참고: 선행 WO(C3)에서 사이니지 항목의 개별 상세 링크는 **공개 조건 충족 시에만** 연결하도록
> 이미 처리했으므로, community 를 포함시키면 그 항목들은 `/signage/media/:id` 로 정상 연결된다.

---

## 4. 함께 수정한 항목

| # | 수정 | 파일 | 커밋 |
|---|------|------|------|
| 1 | 자료실 목록 `source_url`·`source_file_name` additive 반환 | `kpa.routes.ts` | `d73a9196c` |
| 2 | `lms_courses` 컬럼 케이싱 정정(강의 탭 복구) | `kpa.routes.ts` | `3cbb927cd` |

두 건 모두 **기존 쿼리의 필드/컬럼명 정합**이며 조건·권한·정렬·복사 게이트는 무변경이다.

---

## 5. 남겨 둔 항목과 사유

| 항목 | 사유 |
|------|------|
| §3-2 사이니지 source 설정 | **정책 결정 필요**(WO §6) — Home 노출 범위 + operator 집계 동시 변경 |
| GlycoPharm·K-Cosmetics 의 동일 `lms_courses` 컬럼 버그 | 동일 SQL 패턴이 [glycopharm.routes.ts:639](../../apps/api-server/src/routes/glycopharm/glycopharm.routes.ts#L639) · [cosmetics.routes.ts:344](../../apps/api-server/src/routes/cosmetics/cosmetics.routes.ts#L344) 에도 존재하나 **WO §5 "GP·KCos·Neture 정비 금지"** 로 미변경 |
| 자료실 `LINK`/`COPY` 유형 라벨 | KPA 자료 전부 `DOWNLOAD` 유형이라 실데이터 부재 — **PASS 처리하지 않음** |
| IR C5(최신글 자료 링크) · U4(자료실 이원화) | 사용자 결정으로 **진행하지 않음** |

---

## 6. 정책 준수 확인

프로덕션 API 로 전건 확인(로그인 = `renagang21`, `kpa:store_owner`).

| 정책 | 요청 | 결과 |
|------|------|------|
| **금지** 포럼 | `copy{assetType:'forum'}` | **400 `INVALID_ASSET_TYPE`** ✅ |
| **금지** 자료실 | `copy{assetType:'resource'}` | **404 `SOURCE_NOT_FOUND`** ✅ |
| **금지** 자료실(content 우회) | `copy{assetType:'content', 자료실id}` | **404 `SOURCE_NOT_FOUND`** ✅ |
| **허용** 콘텐츠 | `copy{assetType:'content', 문서형id}` | **201 생성** ✅ |
| **허용** 디지털사이니지 | `copy{assetType:'signage', mediaId}` | **201 생성** ✅ |
| 태그 최소 1개 필수 | 변경 없음 | ✅ 유지 |
| 자료실 기능 | 링크 열기 / 파일 링크 복사 / 내용 복사 / Drawer 다운로드 | ✅ 유지 |

강의·공지는 애초에 복사 대상 assetType 이 없어 구조적으로 금지 상태다.

---

## 7. 검증 결과

| 항목 | 결과 |
|------|:----:|
| api-server tsc (변경 파일 `kpa.routes.ts`) | ✅ **0 errors** |
| web-kpa-society typecheck / build | ✅ (프론트 변경 0 — 본 WO 는 백엔드만 수정) |
| API 배포 | ✅ success (`d73a9196c`, `3cbb927cd` — 후자는 병행 세션 push 로 run 이 취소돼 후속 run `7cb9c1a15` 에 포함되어 배포됨) |
| 데스크톱 실브라우저 smoke | ✅ |
| 모바일(390×844) | ✅ (선행 WO 에서 버튼 109×26, 오버플로·가로스크롤 0 확인) |
| 로그인 / 비로그인 흐름 | ✅ |
| 콘솔 치명 오류 | ✅ 0 (LMS 상세의 비치명 로그 제외) |

> api-server 전체 tsc 는 병행 세션의 `drug-otc-*`·`hff-*` 스크립트 오류로 exit 1 이나, **본 작업 변경 파일은 0 errors** 이며 해당 파일들은 미접촉이다.

---

## 8. 테스트 데이터 정리

| 생성 | 용도 | 정리 |
|------|------|------|
| `d256c6d3-2295-4052-a326-008220dc1ef2` | 콘텐츠 복사 허용 검증 | `DELETE` **200 `deleted:true`** |
| `b9336a3e-e668-4b04-9cbd-f50dda5fbf4d` | 사이니지 복사 허용 검증 | `DELETE` **200 `deleted:true`** |

재조회 시 두 ID **부재 확인**(`stillPresent: 0`). 원본 커뮤니티 자산·사이니지 미디어는 무변경.

---

## 9. KPA 커뮤니티 정비 종료 판단

> **2026-07-26 최종:** §3-2 정책 판단이 결정·수정·검증되어 **미결 항목 0**. 아래 판단이 그대로 확정된다.
>
> 후속 `WO-...-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1` 에서 접근·복사 통제(비공개 콘텐츠
> 조회/복사 차단 · 사이니지·CMS 서비스 격리 · assetType 정리 · Home 오류 구분)까지 완료됐다.
>
> **남은 기술 부채(KPA 범위 밖):** GlycoPharm·K-Cosmetics·Neture 가 KPA 전용 `KpaAssetResolver` 를
> 공유 mount 하고 있어, 각 서비스 정비 시 `serviceKey` 주입형 공용 resolver 또는 서비스별 resolver 분리가
> 필요하다. 기존 구조 문제이며 본 정비에서 확장하지 않았다.

**종료 가능하다고 판단한다.**

- WO §2 기완료 10항목 **재작업 0**.
- 이번 전수 점검에서 나온 실오류는 §3-1 **1건뿐이며 수정·검증 완료**.
- §3-2 는 오류가 아니라 **설정/정책 판단 항목**으로, 결정만 있으면 1줄이다.
- 남은 미검증은 **실데이터 부재**(자료실 LINK/COPY 유형) 하나이며, 해당 유형 자료가 등록되는 시점에 1회 확인하면 닫힌다.

→ 새로운 오류가 관측되지 않는 한 IR 잔여 항목을 추가로 소진할 필요는 없다.

---

## 10. 커밋

| 커밋 | 내용 |
|------|------|
| `d73a9196c` | fix(kpa): return source_url in resource list payload |
| `3cbb927cd` | fix(kpa): correct lms_courses column casing in home latest query |
| (본 문서) | docs(kpa): final stabilization check |

모두 path-specific stage. 병행 세션 파일(`pnpm-lock.yaml`, drug-otc/admin 관련) 미접촉.

---

*End of CHECK-O4O-KPA-COMMUNITY-FINAL-STABILIZATION-V1*
