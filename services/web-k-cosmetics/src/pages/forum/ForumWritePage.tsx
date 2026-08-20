/**
 * ForumWritePage (K-Cosmetics) — Forum Post Create / Edit
 *
 * WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1
 * WO-O4O-FORUM-TAG-CANONICAL-ALIGNMENT-V1: category 제거 (KPA Canonical 정렬)
 * WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1: 폼 본문 = @o4o/shared-space-ui ForumWriteForm
 * WO-O4O-COMMUNITY-FORUM-WRITE-SHELL-TEMPLATE-V1:
 *   폼을 감싸던 화면 셸(page/container · heading · 작성자 표시 · 로그인 게이트 · 로딩 · 게시판 selector)을
 *   공통 ForumWritePageShell 로 승격. 본 파일은 data/mutation/navigation + 라벨 config 만 소유한다.
 *
 * Route: /forum/write · /forum/edit/:postId
 * RichTextEditor HTML 을 그대로 전송 — 백엔드 normalizeContent 가 Block[] 정규화.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createForumPost, fetchForumPostById, fetchWritableForums, updateForumPost } from '../../services/forumApi';
import type { WritableForum } from '../../services/forumApi';
import { toast } from '@o4o/error-handling';
import { ForumWriteForm, ForumWritePageShell, forumContentToHtml } from '@o4o/shared-space-ui';
import type { ForumWriteFormPayload, ForumWriteFormPostTypeOption, ForumWritePageShellLabels } from '@o4o/shared-space-ui';

const POST_TYPES: ForumWriteFormPostTypeOption[] = [
  { value: 'discussion', label: 'Discussion' },
  { value: 'question', label: 'Question' },
  { value: 'guide', label: 'Guide' },
  { value: 'poll', label: 'Poll' },
  { value: 'announcement', label: 'Announcement' },
];

const SHELL_LABELS: ForumWritePageShellLabels = {
  createHeading: 'Write a Post',
  editHeading: 'Edit Post',
  loadingText: 'Loading...',
  loginTitle: 'Login Required',
  loginDescription: 'Please log in to write a post.',
  authorLabel: 'Display name:',
  authorHint: '(You can change your display name in your profile settings)',
  forumLabel: 'Forum',
  forumLoadingOption: 'Loading…',
  forumEmptyOption: 'No forum available',
  forumEmptyHint: 'No forum is open for posting yet. Please try again later.',
};

export default function ForumWritePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  // WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C:
  //   게시글 수정 adoption gap 해소 — 같은 페이지의 edit 모드(KPA ForumWritePage 와 같은 축).
  //   초기값 버퍼만 여기서 소유하고, 이후 편집 상태는 공통 ForumWriteForm 이 소유한다.
  const { postId } = useParams<{ postId?: string }>();
  const isEdit = Boolean(postId);
  const [loading, setLoading] = useState(isEdit);
  const [initialTitle, setInitialTitle] = useState('');
  const [initialContentHtml, setInitialContentHtml] = useState('');
  // forum 미지정 작성은 forum_id NULL 로 저장돼 이 서비스에서 다시 보이지 않는다 → 대상 게시판 선택 유지.
  const [forums, setForums] = useState<WritableForum[]>([]);
  const [forumId, setForumId] = useState('');
  const [forumsLoading, setForumsLoading] = useState(!isEdit);

  useEffect(() => {
    if (isEdit) return;
    let alive = true;
    fetchWritableForums()
      .then((list) => {
        if (!alive) return;
        setForums(list);
        if (list.length > 0) setForumId((prev) => prev || list[0].id);
      })
      .finally(() => { if (alive) setForumsLoading(false); });
    return () => { alive = false; };
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit || !postId) return;
    let alive = true;
    fetchForumPostById(postId)
      .then((res) => {
        if (!alive || !res?.data) return;
        setInitialTitle(res.data.title);
        setInitialContentHtml(forumContentToHtml(res.data.content));
      })
      .catch(() => toast.error('게시글을 불러오지 못했습니다.'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isEdit, postId]);

  const handleUpdate = async (payload: ForumWriteFormPayload) => {
    if (!postId) return;
    try {
      const data = await updateForumPost(postId, {
        title: payload.title,
        type: payload.type ?? 'discussion',
        content: payload.editorHtml,
      });
      if (data.success) {
        navigate(`/forum/post/${postId}`);
      } else {
        toast.error(data.error || 'Failed to update post.');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) toast.error('본인이 작성한 글만 수정할 수 있습니다.');
      else toast.error(err.response?.data?.error || 'Network error. Please try again.');
    }
  };

  const handleCreate = async (payload: ForumWriteFormPayload) => {
    if (!forumId) {
      toast.error('Please select a forum to post in.');
      return;
    }
    try {
      const data = await createForumPost({
        title: payload.title,
        type: payload.type ?? 'discussion',
        forumId,
        // 백엔드 normalizeContent 가 HTML→Block[] 정규화 (forum-core 프론트 의존 제거)
        content: payload.editorHtml,
      });

      if (data.success && data.data?.id) {
        navigate(`/forum/post/${data.data.id}`);
      } else {
        toast.error(data.error || 'Failed to create post.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Network error. Please try again.');
    }
  };

  return (
    <ForumWritePageShell
      mode={isEdit ? 'edit' : 'create'}
      isAuthenticated={isAuthenticated}
      isLoading={isEdit && loading}
      authorName={user ? (user.nickname || user.name) : null}
      forums={forums}
      forumId={forumId}
      forumsLoading={forumsLoading}
      onForumChange={setForumId}
      selectId="kcos-forum-select"
      labels={SHELL_LABELS}
    >
      <ForumWriteForm
        initialTitle={initialTitle}
        initialContentHtml={initialContentHtml}
        showPostType
        postTypeOptions={POST_TYPES}
        postTypeLabel="Post Type"
        titleLabel="Title"
        titlePlaceholder="Enter post title"
        contentLabel="Content"
        contentPlaceholder="Write your post content here"
        submitLabel={isEdit ? 'Update' : 'Post'}
        submittingLabel={isEdit ? 'Updating...' : 'Posting...'}
        cancelLabel="Cancel"
        theme="pink"
        minHeight="300px"
        editorProps={{ preset: 'compact' }}
        onSubmit={isEdit ? handleUpdate : handleCreate}
        onCancel={() => navigate(-1)}
        onInvalid={(reason) =>
          toast.error(reason === 'title' ? 'Please enter a title.' : 'Please enter content.')
        }
      />
    </ForumWritePageShell>
  );
}
