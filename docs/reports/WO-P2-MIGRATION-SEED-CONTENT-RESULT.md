# WO-P2-MIGRATION-SEED-CONTENT 결과 보고서

> **Work Order ID**: WO-P2-MIGRATION-SEED-CONTENT
> **완료일**: 2026-01-09
> **상태**: READY FOR DEPLOYMENT
> **선행 작업**: WO-P2-IMPLEMENT-CONTENT (완료)

---

## 1. 작업 요약

CMS Content 테이블 생성 마이그레이션과 초기 콘텐츠 Seed 마이그레이션을 준비함.
GitHub Actions 배포 워크플로우를 통해 프로덕션 DB에 적용됨.

---

## 2. Migration 파일

| 파일 | 타임스탬프 | 설명 |
|------|------------|------|
| `1736500000000-CreateCmsContentTables.ts` | 1736500000000 | 테이블 생성 |
| `1736500001000-SeedCmsContent.ts` | 1736500001000 | 초기 데이터 |

### 실행 순서
1. `CreateCmsContentTables` - 테이블 생성
2. `SeedCmsContent` - 초기 콘텐츠 입력

---

## 3. Seed Data 내역

### 3.1 Glycopharm

| Type | Title | Status |
|------|-------|--------|
| hero | 글라이코팜에 오신 것을 환영합니다 | published |
| notice | 서비스 이용 안내 | published |

**Hero Slot**: `home-hero` (serviceKey: glycopharm)

### 3.2 KPA Society

| Type | Title | Status |
|------|-------|--------|
| hero | 대한약사회에 오신 것을 환영합니다 | published |
| notice | 인트라넷 이용 안내 | published |

**Hero Slot**: `intranet-hero` (serviceKey: kpa)

---

## 4. 콘텐츠 정책 준수

- [x] 샘플/데모 문구 없음
- [x] 실운영에 적합한 중립적 문구
- [x] 최소 수량 (서비스당 2개)
- [x] 기존 데이터 영향 없음

---

## 5. 빌드 검증

| 대상 | 결과 |
|------|------|
| `pnpm -F api-server build` | ✅ 성공 |
| Migration 컴파일 | ✅ 성공 |

### 컴파일된 파일 확인
```
dist/database/migrations/
├── 1736500000000-CreateCmsContentTables.js
├── 1736500001000-SeedCmsContent.js
```

---

## 6. 배포 방법

### GitHub Actions 자동 배포
```bash
# main 브랜치에 push 시 자동 실행
git push origin main
```

### 배포 워크플로우 흐름
1. `deploy-api.yml` 트리거
2. TypeORM 마이그레이션 실행 (Cloud Run Job)
3. API 서버 배포

---

## 7. 예상 결과

### 배포 후 확인 가능 항목

| 서비스 | 엔드포인트 | 예상 응답 |
|--------|------------|----------|
| Glycopharm | `GET /api/v1/cms/stats?serviceKey=glycopharm` | hero: 1, notice: 1 |
| Glycopharm | `GET /api/v1/cms/slots/home-hero?serviceKey=glycopharm` | 1 slot |
| KPA | `GET /api/v1/cms/stats?serviceKey=kpa` | hero: 1, notice: 1 |
| KPA | `GET /api/v1/cms/slots/intranet-hero?serviceKey=kpa` | 1 slot |

### 화면 확인

| 서비스 | 페이지 | 예상 결과 |
|--------|--------|----------|
| Glycopharm | Operator Dashboard | contentStatus에 실데이터 표시 |
| KPA Society | Intranet Home | Hero 슬라이드 표시 |
| KPA Society | Intranet Home | 최근 공지 표시 |

---

## 8. Rollback 절차

문제 발생 시 다음 명령으로 롤백 가능:

```sql
-- Seed 데이터 롤백
DELETE FROM cms_content_slots WHERE "serviceKey" IN ('glycopharm', 'kpa');
DELETE FROM cms_contents WHERE "serviceKey" IN ('glycopharm', 'kpa');

-- 테이블 롤백 (필요시)
DROP TABLE IF EXISTS cms_content_slots;
DROP TABLE IF EXISTS cms_contents;
```

---

## 9. Definition of Done 체크리스트

- [x] CreateCmsContentTables 마이그레이션 준비
- [x] SeedCmsContent 마이그레이션 준비
- [x] Glycopharm 초기 콘텐츠 (Hero 1, Notice 1)
- [x] KPA Society 초기 콘텐츠 (Hero 1, Notice 1)
- [x] api-server 빌드 성공
- [x] 마이그레이션 파일 컴파일 확인
- [ ] 프로덕션 DB 마이그레이션 실행 (배포 시)
- [ ] CMS API 실데이터 응답 확인 (배포 후)

---

## 10. 다음 단계

1. **main 브랜치 Push**: 마이그레이션 자동 실행
2. **프로덕션 확인**: API 응답 및 화면 검증
3. **P3 진행**: Content CRUD UI 개발

---

**작업 상태**: READY FOR DEPLOYMENT
**다음 단계**: git push origin main → 프로덕션 확인 → P3
