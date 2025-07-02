# Phase 2 Stage 1: 구조적 기반 강화 실행 계획

**작성일**: 2025-01-03  
**목표**: 폴더 구조 현대화 및 TypeScript Strict 모드 전체 적용

## 🏗️ Stage 1-1: 폴더 구조 현대화

### 현재 구조 → 목표 구조
```
현재:                    목표:
services/        →       apps/
├── api-server/          ├── api-server/
├── main-site/           ├── web/  
├── admin-dashboard/     ├── admin/
└── crowdfunding/        └── crowdfunding/

shared/          →       packages/
└── components/          ├── ui/         (공통 컴포넌트)
    ├── admin/           ├── lib/        (유틸리티)
    ├── editor/          ├── types/      (타입 정의)
    ├── dropshipping/    ├── config/     (공통 설정)
    ├── healthcare/      └── tsconfig/   (TypeScript 설정)
    └── ui/
```

### Import 경로 마이그레이션 매핑
```typescript
// 기존 경로 → 새 경로
const pathMigrationMap = {
  '@shared/components/ui': '@o4o/ui',
  '@shared/components/admin': '@o4o/ui/admin',
  '@shared/components/editor': '@o4o/ui/editor',
  '@shared/components/dropshipping': '@o4o/ui/dropshipping',
  '@shared/components/healthcare': '@o4o/ui/healthcare',
  '@shared/lib': '@o4o/lib',
  '@shared/types': '@o4o/types',
  '@o4o/shared': '@o4o/ui'
};
```

### 작업 순서
1. **백업 생성**: 전체 프로젝트 백업
2. **폴더 구조 변경**: 
   - services → apps 이름 변경
   - shared → packages 이름 변경 및 재구성
3. **package.json 업데이트**: 
   - 워크스페이스 경로 수정
   - 패키지 이름 변경
4. **Import 경로 자동 변환**: 
   - codemod 스크립트 작성 및 실행
   - 수동 검증 및 수정
5. **빌드 검증**: 
   - 각 앱별 빌드 테스트
   - 프로덕션 빌드 확인

## 🔧 Stage 1-2: main-site TypeScript Strict 모드

### 적용 전략 (admin-dashboard 성공 패턴 활용)
1. **현재 에러 수 파악**: tsc --noEmit 실행
2. **단계별 해결**:
   - any 타입 제거
   - null/undefined 체크
   - 함수 파라미터 타입 명시
   - 컴포넌트 props 타입 정의
3. **빌드 검증**: 프로덕션 빌드 성공 확인

### 예상 작업량
- 예상 에러: 800-1000개
- 예상 소요 시간: 1주
- 우선순위: 비즈니스 핵심 컴포넌트부터

## 📋 체크리스트

### Stage 1-1 (폴더 구조)
- [ ] 전체 프로젝트 백업
- [ ] Git 브랜치 생성: `feat/phase2-folder-modernization`
- [ ] 폴더 이름 변경 실행
- [ ] package.json 파일들 업데이트
- [ ] codemod 스크립트 작성
- [ ] Import 경로 자동 변환
- [ ] 수동 검증 및 수정
- [ ] 각 앱 빌드 테스트
- [ ] PR 생성 및 리뷰

### Stage 1-2 (TypeScript Strict)
- [ ] main-site tsconfig.json strict 활성화
- [ ] 초기 에러 수 기록
- [ ] 에러 카테고리별 분류
- [ ] 단계별 수정 진행
- [ ] 빌드 및 런타임 테스트
- [ ] PR 생성 및 리뷰

## 🚨 리스크 및 대응

### 주요 리스크
1. **대량의 import 경로 변경**: 누락 가능성
2. **빌드 실패**: 경로 문제로 인한 빌드 에러
3. **런타임 에러**: 동적 import 문제

### 대응 전략
1. **점진적 적용**: 한 번에 하나의 앱씩
2. **자동화 도구**: codemod로 실수 최소화
3. **철저한 테스트**: 각 단계별 빌드/런타임 검증
4. **롤백 준비**: 각 단계별 커밋으로 안전한 복원점

## 🎯 성공 지표
- ✅ 모든 앱 정상 빌드
- ✅ Import 경로 100% 현대화
- ✅ TypeScript 에러 0
- ✅ 프로덕션 빌드 성공
- ✅ 개발자 경험 개선 확인