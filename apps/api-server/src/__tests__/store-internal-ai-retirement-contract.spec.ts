/**
 * 내 매장 AI First 4단계 — Store 내부 AI 은퇴 계약 (Source Contract)
 *
 * WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1 §8
 *
 * 범위 ① Store runtime 한정. 고정하는 것:
 *   (A) Store-facing 편집기 dead `aiRequestHeaders` 0 · AI 헤더 전용 `getAccessToken` 0
 *   (B) KPA StoreQrAiDescriptionPage — legacy 내부 생성(handleGenerate · fetch /api/ai/qr-description · Gemini provenance) 0,
 *       외부 LLM 경로(LlmAssistPanel + Prompt Core task='qr')만 존재 · aiDescription read compatibility 유지
 *   (C) backend `/api/ai/qr-description` route · `ai-prompts/qrDescription.ts` 제거 · 나머지 ai-proxy route 불변
 *   (D) Store 파일에 `AiContentModal` import/mount 0 · `/api/ai/content` 문자열 0 · `gemini-qr-description` write 0
 *   (E) NON-STORE · content-editor 공통 AI 불변 — AiContentModal · StoreUseModal · /api/ai/content · Community/Lecture 소비처 존재
 *
 * web 서비스에는 DOM test runner 가 없다 → api-server jest 소스 텍스트 계약(저장소 관례).
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(REPO_ROOT, rel));

/** Store-facing 화면 — WO1~3 census 합집합(일반 콘텐츠 4 · 제작 자료 2 · 목적별 13, 중복 제거) */
const STORE_FILES = [
  // KPA
  'services/web-kpa-society/src/pages/pharmacy/CreateContentFromResourcesModal.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreDirectContentPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreContentEditPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/ProductionMaterialEditorPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/PharmacyPopPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreLocalProductsPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreProductMultilingualContentPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreQrAiDescriptionPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/productionTargets.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx',
  // KCos
  'services/web-k-cosmetics/src/pages/store/ProductionMaterialEditorPage.tsx',
  'services/web-k-cosmetics/src/pages/store/StoreBlogManagePage.tsx',
  'services/web-k-cosmetics/src/pages/store/StorePopStaffPage.tsx',
  'services/web-k-cosmetics/src/pages/store/StoreProductDescriptionsPage.tsx',
  // PH
  'services/web-pharmacy-hub/src/pages/store-owner/ContentPage.tsx',
  'services/web-pharmacy-hub/src/pages/store-owner/LibraryResourcesPage.tsx',
  'services/web-pharmacy-hub/src/pages/store-owner/BlogEditorPage.tsx',
  'services/web-pharmacy-hub/src/pages/store-owner/PopPage.tsx',
  'services/web-pharmacy-hub/src/pages/store-owner/ProductDescriptionsPage.tsx',
  'services/web-pharmacy-hub/src/pages/store-owner/StoreProductMultilingualContentPage.tsx',
];

/** 이번 WO 에서 건드리지 않는 non-Store AI 소비처(대표) — 존재 + AI 연결 유지 */
const NON_STORE_AI_FILES = [
  'services/web-kpa-society/src/pages/contents/ContentWritePage.tsx', // Community(/content/*) — 이름만 Store 아님
  'services/web-kpa-society/src/pages/forum/ForumWritePage.tsx',
  // WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 §14: KPA/PH 강사 화면 은퇴 → Lecture 강사 화면(공통 편집기 기본 AI 유지)
  'services/web-lecture/src/pages/instructor/InstructorCourseEditPage.tsx',
];

const QR_PAGE = 'services/web-kpa-society/src/pages/pharmacy/StoreQrAiDescriptionPage.tsx';
const AI_ROUTES = 'apps/api-server/src/routes/ai-proxy.routes.ts';

describe('WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1 — (A) Store dead aiRequestHeaders 0', () => {
  for (const rel of STORE_FILES) {
    it(`${rel} — aiRequestHeaders 0 · AI 헤더 전용 aiHeaders helper 0 · showInternalAi={false} 유지(편집기 있는 경우)`, () => {
      const src = read(rel);
      // 은퇴 이력 주석의 단어 언급은 허용 — prop 으로 넘기는 형태만 금지
      expect(src).not.toMatch(/aiRequestHeaders\s*=/);
      expect(src).not.toMatch(/const aiHeaders\s*=/);
      if (src.includes('<RichTextEditor')) {
        expect(src).toContain('showInternalAi={false}');
        expect(src).not.toContain('showInternalAi={true}');
      }
    });
  }
  it('Store 파일에서 getAccessToken 은 AI 헤더 용도로 남아 있지 않다(다른 용도 import 는 허용)', () => {
    for (const rel of STORE_FILES) {
      const src = read(rel);
      expect(src).not.toMatch(/Authorization:\s*`Bearer \$\{token\}`\s*\}\s*:\s*undefined/);
    }
  });
});

describe('WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1 — (B) QR 페이지 legacy 내부 생성 0 · 외부 경로만', () => {
  const src = read(QR_PAGE);
  it('handleGenerate · AI_ROOT_BASE · fetch(/api/ai/qr-description) · generating/authoredBy 상태 · 재생성 버튼 0', () => {
    expect(src).not.toMatch(/const handleGenerate\b/);
    expect(src).not.toContain('AI_ROOT_BASE');
    expect(src).not.toMatch(/fetch\(/);
    expect(src).not.toMatch(/['"`][^'"`\n]*\/api\/ai\//);
    expect(src).not.toMatch(/\[generating, setGenerating\]|\[authoredBy, setAuthoredBy\]/);
    expect(src).not.toMatch(/AI로 설명 만들기|AI 다시 만들기/);
    expect(src).not.toContain("from '../../contexts/AuthContext'");
  });
  it('외부 LLM 경로 존재 — LlmAssistPanel + Prompt Core task=qr + 결과→편집기(자동 저장/QR 없음)', () => {
    expect(src).toMatch(/import \{[^}]*LlmAssistPanel[^}]*\} from '@o4o\/content-editor'/);
    expect(src).toContain("task: 'qr'");
    expect(src).toContain('label={STORE_LLM_ASSIST_LABEL}');
    expect(src).toContain('onApplyHtml={handleExternalApply}');
    const apply = src.slice(src.indexOf('const handleExternalApply'), src.indexOf('// 콘텐츠 저장(없으면 생성)'));
    expect(apply).not.toMatch(/ensureContentSaved|createQr\(|handleUpdate|handleSaveAndCreate|apiClient\.post/);
  });
  it("Gemini provenance write 0 — 'gemini-qr-description' 문자열 0 · 저장 payload 에 generatedBy 값 기록 없음", () => {
    expect(src).not.toContain('gemini-qr-description');
    expect(src).not.toMatch(/generatedBy:\s*'[^']+'/);
    // edit 모드 갱신은 legacy 최상위 generatedBy 를 이월하지 않는다
    expect(src).toContain('generatedBy: undefined');
  });
  it('aiDescription read compatibility — legacy 필드는 optional 로 읽기만 · 편집 모드 로드 유지', () => {
    expect(src).toMatch(/model\?: string;\s*\n\s*generatedBy\?: string;\s*\n\s*generatedAt\?: string;/);
    expect(src).toContain('const ai = (cj.aiDescription ?? {}) as AiDescriptionMeta');
    expect(src).toContain('aiDescription: aiMeta ?? (curJson.aiDescription as unknown)');
  });
  it('route 계약 유지 — 컴포넌트명·파일명 불변(rename 없음)', () => {
    expect(src).toContain('export default function StoreQrAiDescriptionPage()');
  });
});

describe('WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1 — (C) backend /api/ai/qr-description 처분', () => {
  const routes = read(AI_ROUTES);
  it("router.post('/qr-description') 0 · qrDescription prompt import 0 · 모듈 파일 삭제", () => {
    expect(routes).not.toMatch(/router\.(post|get)\(\s*['"]\/qr-description/);
    expect(routes).not.toContain("ai-prompts/qrDescription");
    expect(routes).not.toMatch(/QrDescription(Input|ItemInput|Mode)\b/);
    expect(exists('apps/api-server/src/services/ai-prompts/qrDescription.ts')).toBe(false);
  });
  it('나머지 ai-proxy route 불변 — /content · /url-to-blocks · store-use 계열 존재', () => {
    expect(routes).toMatch(/router\.post\(\s*['"]\/content['"]/);
    expect(routes).toMatch(/router\.post\(\s*['"]\/url-to-blocks['"]/);
    expect(routes).toContain("type StoreUseCase = 'qr' | 'pop' | 'sns' | 'blog'");
  });
  it('전역 runtime consumer 0 — 5 web 서비스 · mobile 에 qr-description 호출 문자열 없음', () => {
    const roots = ['services', 'mobile-app/src', 'packages'];
    const hits: string[] = [];
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name.startsWith('.')) continue;
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(full);
        else if (/\.(tsx?|jsx?|mjs)$/.test(ent.name)) {
          const txt = fs.readFileSync(full, 'utf8');
          if (/['"`][^'"`\n]*\/api\/ai\/qr-description/.test(txt)) hits.push(path.relative(REPO_ROOT, full));
        }
      }
    };
    for (const r of roots) walk(path.join(REPO_ROOT, r));
    expect(hits).toEqual([]);
  });
});

describe('WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1 — (D) Store AiContentModal / /api/ai/content consumer 0', () => {
  for (const rel of STORE_FILES) {
    it(`${rel}`, () => {
      const src = read(rel);
      expect(src).not.toMatch(/import\s*\{[^}]*AiContentModal|<AiContentModal/);
      expect(src).not.toMatch(/['"`][^'"`\n]*\/api\/ai\/content/);
      expect(src).not.toContain("'gemini-qr-description'");
    });
  }
  it('productionTargets — dead AiContentModal 진입 매핑(PRODUCTION_TARGET_TO_AI_MODE · AiModeForProduction) 제거', () => {
    const src = read('services/web-kpa-society/src/pages/pharmacy/productionTargets.tsx');
    expect(src).not.toMatch(/export (const|type) (PRODUCTION_TARGET_TO_AI_MODE|AiModeForProduction)\b/);
    expect(src).not.toMatch(/productionTargetToAiMode\s*\(/);
  });
});

describe('WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1 — (E) non-Store · content-editor 공통 AI 불변', () => {
  it('content-editor 공통 AI 파일 존재 + 핵심 export/endpoint 유지', () => {
    expect(exists('packages/content-editor/src/components/AiContentModal.tsx')).toBe(true);
    expect(exists('packages/content-editor/src/components/StoreUseModal.tsx')).toBe(true);
    expect(read('packages/content-editor/src/components/AiContentModal.tsx')).toMatch(/export function AiContentModal|export (const|default) AiContentModal/);
    expect(read('packages/content-editor/src/components/AiContentModal.tsx')).toContain('/api/ai/content');
    expect(read('packages/content-editor/src/components/RichTextEditor.tsx')).toContain('aiRequestHeaders');
    expect(read('packages/content-editor/src/components/RichTextEditor.tsx')).toContain('showInternalAi');
  });
  it('non-Store AI 소비처는 이번 WO 에서 변경되지 않았다 — aiRequestHeaders/AiContentModal 연결 유지', () => {
    for (const rel of NON_STORE_AI_FILES) {
      const src = read(rel);
      // 공통 편집기(RichTextEditor) 의 내부 AI 는 showInternalAi 미지정(기본 true) 이면 유지된다.
      expect(src).toMatch(/aiRequestHeaders|AiContentModal|<RichTextEditor\b/);
      expect(src).not.toContain('showInternalAi={false}');
    }
  });
  it('ContentWritePage 는 Community 화면(/content/* · CommunityContentWriteShell)이라 Store 대상이 아니다', () => {
    const src = read('services/web-kpa-society/src/pages/contents/ContentWritePage.tsx');
    expect(src).toContain('CommunityContentWriteShell');
    expect(read('services/web-kpa-society/src/App.tsx')).toMatch(/path="\/content\/documents\/new"[^\n]*<ContentWritePage/);
  });
  it('aiDescription read 경로 불변 — store-qr.service · store-library-feed.controller · QrLandingPage', () => {
    expect(read('apps/api-server/src/services/store/store-qr.service.ts')).toContain("aiDescription");
    expect(read('apps/api-server/src/routes/o4o-store/controllers/store-library-feed.controller.ts')).toContain("content_json->'aiDescription'->>'mode'");
    expect(read('services/web-kpa-society/src/pages/qr/QrLandingPage.tsx')).toContain('descriptionHtml');
  });
});
