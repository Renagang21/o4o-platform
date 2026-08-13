/**
 * PharmacyBlogPage — Staff Blog Management (Glycopharm)
 *
 * WO-O4O-GLYCO-BLOG-INTRODUCE-V1
 * WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1:
 *   화면 본체(list / editor / settings)를 @o4o/store-ui-core 의 StoreBlogManageView 로 이관.
 *   이 파일은 blogStaff API adapter + slug resolver + 문구 + RichTextEditor 주입만 담는다.
 *
 * 경로: /store/content/blog
 * 인증 필수 (상위 ProtectedRoute + StoreLayoutWrapper).
 *
 * Glycopharm-specific override:
 *  - store-resolver: pharmacyApi.getPharmacyStatus().storeSlug
 *  - getAccessToken: '@o4o/auth-client'
 *  - service param: 'glycopharm'
 *  - 이미지 업로드 핸들러는 본 서비스 범위 외 (RichTextEditor URL 직접 입력 가능)
 *
 * 흐름(View 안에서 보존):
 *  - list ViewMode: 게시글 목록 + 발행/보관/삭제/URL복사/미리보기
 *  - editor ViewMode: RichTextEditor 본문 + 임시저장
 *  - settings ViewMode: 블로그 이름/소개/heroImage/defaultTemplate
 */

import {
  StoreBlogManageView,
  type StoreBlogManageApi,
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
} from '../../api/blogStaff';
import { pharmacyApi } from '../../api/pharmacy';
import { RichTextEditor } from '@o4o/content-editor';
import { getAccessToken } from '@o4o/auth-client';

const SERVICE = 'glycopharm';

const blogApi: StoreBlogManageApi = {
  resolveSlug: async () => {
    const res = await pharmacyApi.getPharmacyStatus();
    return res?.data?.storeSlug ?? null;
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

export default function PharmacyBlogPage() {
  return (
    <StoreBlogManageView
      api={blogApi}
      labels={{
        listSubtitle: '매장 블로그 게시글을 관리합니다.',
        noStoreError: '연결된 매장이 없습니다. 약국 신청을 먼저 진행하세요.',
        resolveErrorFallback: '약국 정보를 불러올 수 없습니다.',
        editorPlaceholder: '전문 칼럼을 작성하세요',
        publishedActionTitles: { copyUrl: '공개 URL 복사', preview: '새 탭에서 열기' },
        settings: {
          subtitle: '블로그 자체의 identity (이름·소개·대표 이미지·기본 템플릿) 를 설정합니다. 미입력 항목은 매장 정보로 대체됩니다.',
          blogNamePlaceholder: '예: 우리약국 칼럼 (미입력 시 매장명 표시)',
          descriptionPlaceholder: '블로그 채널의 짧은 소개 (전문 분야, 주요 주제 등)',
          heroImagePlaceholder: 'https:// 이미지 URL',
          heroImageHint: '공개 블로그 목록 페이지 상단에 column masthead 로 표시됩니다.',
        },
      }}
      renderEditor={({ value, onChange, placeholder }) => (
        <RichTextEditor
          value={value}
          onChange={(c) => onChange(c.html)}
          placeholder={placeholder}
          minHeight="360px"
          preset="full"
          aiRequestHeaders={(() => {
            const token = getAccessToken();
            return token ? { Authorization: `Bearer ${token}` } : undefined;
          })()}
        />
      )}
    />
  );
}
