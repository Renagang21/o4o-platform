# O4O Platform Archive

## 목적
개발 과정에서 생성된 실험적 코드, 이전 버전, 사용하지 않는 컴포넌트들을 보관하는 아카이브입니다.
필요 시 참조할 수 있도록 보관하되, 실제 개발/빌드에서는 제외됩니다.

## 디렉토리 구조

```
archive/
├── YYYY-MM-DD/           # 아카이브 날짜
│   ├── components/       # 컴포넌트 백업
│   ├── pages/           # 페이지 컴포넌트 백업
│   ├── themes/          # 테마 관련 백업
│   └── README.md        # 해당 날짜의 아카이브 설명
```

## 아카이브 정책

### 아카이브 대상
- `.old`, `.old2` 등의 이전 버전 파일
- `*Bulk`, `*QuickEdit`, `*Enhanced` 등 실험적 버전
- 사용하지 않는 테마/외모 관련 파일
- DEPRECATED 마크된 코드
- 3개월 이상 사용하지 않은 컴포넌트

### 아카이브 시점
- 새로운 버전으로 완전히 대체됐을 때
- 리팩토링 완료 후
- 기능이 더 이상 필요 없을 때

### 복원 방법
필요 시 아카이브에서 원래 위치로 복사:
```bash
cp archive/YYYY-MM-DD/components/SomeComponent.tsx src/components/
```

## 아카이브 로그

### 2025-09-04
- **이동된 파일들:**
  - `PostListQuickEdit.tsx` - PostList.tsx로 대체
  - `PostListBulk.tsx` - WordPressTable 기반으로 대체
  - `UsersListBulk.tsx` - UserList.tsx로 대체
  
- **이유:** WordPress 스타일 테이블로 통합 리팩토링

---

## 주의사항
- 아카이브 폴더는 git에 포함되지만 빌드에서는 제외
- 정기적으로 오래된 아카이브 정리 (1년 이상)
- 중요한 로직이 있다면 문서화 후 아카이브