# _generated 폴더 표준

## 📁 디렉토리 구조

```
/_generated/
   └── {source}/            # antigravity, gemini, claude, chatgpt, manual
        └── ui/
             └── {timestamp}/
                  ├── images/
                  │   ├── preview.png       # 전체 미리보기
                  │   ├── component-1.png   # 개별 컴포넌트 스크린샷
                  │   └── ...
                  ├── html/
                  │   └── index.html        # 정적 HTML 미리보기
                  ├── react/
                  │   ├── App.tsx           # 메인 컴포넌트
                  │   ├── components/       # 분리된 컴포넌트들
                  │   └── package.json      # 의존성
                  ├── blocks/
                  │   └── blocks.json       # O4O Block 변환 결과
                  └── metadata.json         # 생성 정보 메타데이터
```

## 📋 metadata.json 스키마

```json
{
  "version": "1.0.0",
  "timestamp": "2025-01-15T14:30:25Z",
  "source": "antigravity",
  "feature": "ui",
  "prompt": "AI에게 전달한 프롬프트 원문",
  "aiModel": "claude-3-5-sonnet-20250116",
  "generation": {
    "status": "success",
    "blockCount": 12,
    "placeholderCount": 2,
    "componentCount": 5
  },
  "conversion": {
    "jsxToBlocks": true,
    "tailwindParsed": true,
    "placeholdersCreated": ["CustomCarousel", "PricingTable"]
  },
  "files": {
    "preview": "images/preview.png",
    "react": "react/App.tsx",
    "html": "html/index.html",
    "blocks": "blocks/blocks.json"
  },
  "stats": {
    "linesOfCode": 245,
    "estimatedTokens": 3200
  }
}
```

## 🔧 생성 규칙

### 1. Source 타입
- `antigravity`: Antigravity AI 생성
- `gemini`: Google Gemini 생성
- `claude`: Anthropic Claude 생성
- `chatgpt`: OpenAI ChatGPT 생성
- `manual`: 수동 생성

### 2. Timestamp 형식
- 형식: `YYYY-MM-DD_HH-mm-ss`
- 예: `2025-01-15_14-30-25`
- UTC 기준

### 3. 파일 저장 규칙

**images/**
- 모든 스크린샷 및 미리보기 이미지
- PNG 또는 JPEG 형식
- `preview.png`는 필수

**html/**
- 정적 HTML 미리보기
- CSS 인라인 또는 `<style>` 태그 포함
- 브라우저에서 바로 열 수 있어야 함

**react/**
- TypeScript React 컴포넌트
- `App.tsx` 또는 `index.tsx`가 진입점
- 의존성은 `package.json`에 명시

**blocks/**
- O4O Block 변환 결과 (JSON)
- `blocks.json`만 포함
- 페이지 생성기 앱에서 사용

## 📊 사용 예시

### 새 생성물 저장
```bash
# Timestamp 생성
timestamp=$(date -u +"%Y-%m-%d_%H-%M-%S")

# 디렉토리 생성
mkdir -p _generated/antigravity/ui/$timestamp/{images,html,react,blocks}

# 파일 저장
cp preview.png _generated/antigravity/ui/$timestamp/images/
cp App.tsx _generated/antigravity/ui/$timestamp/react/
cp metadata.json _generated/antigravity/ui/$timestamp/
```

### 조회
```bash
# 최신 생성물 찾기
ls -lt _generated/antigravity/ui/ | head -n 5

# 특정 생성물 확인
cat _generated/antigravity/ui/2025-01-15_14-30-25/metadata.json
```

## 🔍 통계 및 관리

### 생성물 개수 확인
```bash
find _generated -name "metadata.json" | wc -l
```

### 용량 확인
```bash
du -sh _generated/*
```

### 오래된 파일 정리 (30일 이상)
```bash
find _generated -type d -mtime +30 -exec rm -rf {} \;
```

## ⚠️ 주의사항

1. **metadata.json은 필수**
   - 모든 생성물은 metadata.json을 반드시 포함해야 함
   - 없으면 유효하지 않은 생성물로 간주

2. **타임스탬프 중복 방지**
   - 동일 초에 여러 생성물이 만들어질 경우 충돌 가능
   - 필요시 밀리초 추가: `YYYY-MM-DD_HH-mm-ss-SSS`

3. **용량 관리**
   - 이미지 파일은 압축 권장
   - 주기적으로 오래된 파일 정리

4. **Git 추적**
   - `.gitignore`에 `_generated/`를 추가하여 Git 추적 제외 권장
   - 또는 중요한 생성물만 선별적으로 커밋

## 📚 관련 문서

- [페이지 생성기 앱 설계](../../docs/dev/PAGE_GENERATOR_APP_DESIGN.md) (예정)
- [VSCode Extension 아카이브](../../docs/dev/VSCODE_EXTENSION_ARCHIVE.md)
- [Block Specification](../../docs/blocks/BLOCK_SPEC.md) (예정)

---

**작성일**: 2025-12-01
**버전**: 1.0.0
