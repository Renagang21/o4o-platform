/**
 * StoreBlogManagePage — Staff Blog Management (K-Cosmetics)
 *
 * WO-O4O-KCOS-STORE-EXECUTION-CANONICAL-ALIGNMENT-V1
 * WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1:
 *   화면 본체(list / editor / settings)를 @o4o/store-ui-core 의 StoreBlogManageView 로 이관.
 *   이 파일은 blogStaff API adapter + slug resolver + 문구 + RichTextEditor 주입만 담는다.
 *
 * 경로: /store/content/blog
 * 인증 필수 (상위 ProtectedRoute + StoreLayoutWrapper).
 *
 * K-Cosmetics override:
 *  - slug resolver: fetchChannelOverviewWithCode().organizationCode
 *  - SERVICE = 'cosmetics'
 */

import {
  StoreBlogManageView,
  type StoreBlogManageApi,
  buildStoreContentAuthoringPrompt,
  STORE_LLM_ASSIST_LABEL,
} from '@o4o/store-ui-core';
import {
  fetchStaffBlogPosts,
  createBlogPost,
  updateBlogPost,
  publishBlogPost,
  archiveBlogPost,
  deleteBlogPost,
  fetchBlogSettings,
  updateBlogSettings,
} from '@/api/blogStaff';
import { fetchChannelOverviewWithCode } from '@/api/storeHub';
import { RichTextEditor, LlmAssistPanel } from '@o4o/content-editor';

const SERVICE = 'cosmetics';

const blogApi: StoreBlogManageApi = {
  resolveSlug: async () => {
    const overview = await fetchChannelOverviewWithCode();
    return overview?.organizationCode ?? null;
  },
  fetchPosts: (slug, params) =>
    fetchStaffBlogPosts(slug, params, SERVICE).then((res) => res.data),
  createPost: (slug, input) => createBlogPost(slug, input, SERVICE),
  updatePost: (slug, postId, input) => updateBlogPost(slug, postId, input, SERVICE),
  publishPost: (slug, postId) => publishBlogPost(slug, postId, SERVICE),
  archivePost: (slug, postId) => archiveBlogPost(slug, postId, SERVICE),
  deletePost: (slug, postId) => deleteBlogPost(slug, postId, SERVICE),
  fetchSettings: (slug) => fetchBlogSettings(slug, SERVICE),
  updateSettings: (slug, input) => updateBlogSettings(slug, input, SERVICE),
};

export default function StoreBlogManagePage() {
  return (
    <StoreBlogManageView
      api={blogApi}
      labels={{
        listSubtitle: '매장 블로그 게시글을 관리합니다.',
        noStoreError: '연결된 매장이 없습니다. 매장 신청을 먼저 진행하세요.',
        resolveErrorFallback: '매장 정보를 불러올 수 없습니다.',
        editorPlaceholder: '매장 블로그 글을 작성하세요',
        settings: {
          subtitle: '블로그 identity (이름·소개·대표 이미지·기본 템플릿) 를 설정합니다. 미입력 항목은 매장 정보로 대체됩니다.',
          blogNamePlaceholder: '예: 우리매장 칼럼 (미입력 시 매장명 표시)',
          descriptionPlaceholder: '블로그 채널의 짧은 소개',
          heroImagePlaceholder: 'https:// 이미지 URL',
        },
      }}
      /* WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1 §16: 외부 LLM(ChatGPT) 블로그 본문 작업 — Prompt 는 store-ui-core(task='blog'), UI 는 공용 LlmAssistPanel */
      renderAssist={({ title, value, onApplyHtml }) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LlmAssistPanel
            label={STORE_LLM_ASSIST_LABEL}
            contextLabel="매장 블로그 본문 — 새로 작성하거나 현재 글을 다듬습니다"
            guideText={({ additionalInstruction }) =>
              buildStoreContentAuthoringPrompt({ task: 'blog', title, currentHtml: value, additionalInstruction })
            }
            currentHtml={value}
            onApplyHtml={onApplyHtml}
          />
        </div>
      )}
      renderEditor={({ value, onChange, placeholder }) => (
        <RichTextEditor showInternalAi={false}
          value={value}
          onChange={(c) => onChange(c.html)}
          placeholder={placeholder}
          minHeight="360px"
          preset="full"
        />
      )}
    />
  );
}
