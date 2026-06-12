/**
 * ForumWritePage - 포럼 글쓰기 페이지
 *
 * WO-O4O-FORUM-CATEGORY-FULL-REMOVAL-V2:
 * 카테고리 완전 제거 — 제목 + 내용만 작성
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { blocksToHtml } from '@o4o/forum-core/utils';
// WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1: 공통 글쓰기 폼 (form body create/edit 공용)
import { ForumWriteForm } from '@o4o/shared-space-ui';
import type { ForumWriteFormPayload } from '@o4o/shared-space-ui';
import { PageHeader, LoadingSpinner, Card } from '../../components/common';
import { forumApi } from '../../api';
import { useAuth, getAccessToken } from '../../contexts';
import { colors, typography } from '../../styles/theme';

export function ForumWritePage() {
  const { id, slug: forumSlug } = useParams<{ id?: string; slug?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  // edit 모드 초기값 버퍼 — 폼 마운트(로딩 게이트 이후) 시 initial* 로 전달. 이후 편집 상태는 폼이 소유.
  const [title, setTitle] = useState('');
  const [editorHtml, setEditorHtml] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;
    forumApi.getPost(id)
      .then((res) => {
        const post = res.data;
        const htmlContent = Array.isArray(post.content)
          ? blocksToHtml(post.content)
          : (typeof post.content === 'string' ? post.content : '');
        setTitle(post.title);
        setEditorHtml(htmlContent);
      })
      .catch(() => toast.error('데이터를 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSave = async (payload: ForumWriteFormPayload) => {
    // WO-O4O-FORUM-MULTI-STRUCTURE-RECONSTRUCTION-V1: forumSlug 전달 → 백엔드에서 forum_id 매핑
    // content 는 HTML string 으로 전송 — 백엔드 normalizeContent 가 Block[] 정규화
    const submitData = forumSlug
      ? { title: payload.title, content: payload.editorHtml, forumSlug }
      : { title: payload.title, content: payload.editorHtml };
    try {
      if (isEdit && id) {
        await forumApi.updatePost(id, submitData);
        navigate(`/forum/post/${id}`);
      } else {
        const res = await forumApi.createPost(submitData);
        // 글이 속한 포럼 피드로 이동 (forum slug 있으면 포럼 피드, 없으면 게시글 상세)
        if (forumSlug) {
          navigate(`/forum/${forumSlug}`);
        } else {
          navigate(`/forum/post/${res.data.id}`);
        }
      }
    } catch (err: any) {
      console.error('[ForumWritePage] save failed:', err);
      const status = err?.status;
      if (status === 401) {
        toast.error('로그인이 만료되었습니다. 다시 로그인해 주세요.');
      } else if (status === 403) {
        toast.error('이 글을 수정할 권한이 없습니다.');
      } else if (status === 404) {
        toast.error('게시글을 찾을 수 없습니다.');
      } else {
        toast.error('저장에 실패했습니다.');
      }
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <Card padding="large">
          <p style={styles.loginPrompt}>글을 작성하려면 로그인이 필요합니다.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="로딩 중..." />;
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title={isEdit ? '글 수정' : '글쓰기'}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '포럼', href: '/forum' },
          { label: isEdit ? '수정' : '글쓰기' },
        ]}
      />

      <Card padding="large">
        {/* WO-O4O-KPA-FORUM-DISPLAYNAME-NICKNAME-ALIGNMENT-V1:
            포럼 공개 표시명 canonical: nickname → name → email local-part → '익명'. */}
        <div style={styles.authorInfo}>
          <span style={styles.authorLabel}>작성자 표시명:</span>
          <span style={styles.authorName}>
            {user.nickname || user.name || user.email?.split('@')[0] || '익명'}
          </span>
          <p style={styles.authorHint}>(표시명은 프로필에서 변경할 수 있습니다)</p>
        </div>

        <ForumWriteForm
          initialTitle={title}
          initialContentHtml={editorHtml}
          titleLabel="제목"
          titlePlaceholder="예: 세무 신고 어떻게 하시나요? / 신제품 입고 후기 공유"
          contentLabel="내용"
          contentPlaceholder="질문, 정보 공유, 경험담 등 자유롭게 작성해보세요"
          submitLabel={isEdit ? '수정하기' : '등록하기'}
          submittingLabel="저장 중..."
          cancelLabel="취소"
          submitColor={colors.primary}
          minHeight="400px"
          editorProps={{
            aiRequestHeaders: (() => {
              const token = getAccessToken();
              return token ? { Authorization: `Bearer ${token}` } : undefined;
            })(),
            showCommunitySave: true,
            showStoreSave: user?.roles?.includes('kpa:store_owner') ?? false,
          }}
          onSubmit={handleSave}
          onCancel={() => navigate(-1)}
          onInvalid={() => toast.error('제목과 내용을 모두 입력해주세요.')}
        />
      </Card>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  authorInfo: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    marginBottom: '24px',
  },
  authorLabel: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  authorName: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  authorHint: {
    fontSize: '12px',
    color: colors.neutral400,
    margin: 0,
    width: '100%',
    marginTop: '2px',
  },
  loginPrompt: {
    ...typography.bodyL,
    color: colors.neutral500,
    textAlign: 'center',
    padding: '40px',
  },
  field: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 500,
    color: colors.neutral700,
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '32px',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '12px 32px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
