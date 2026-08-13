/**
 * ForumWritePage — PharmacyHub 커뮤니티 글쓰기
 *
 * WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1
 *
 * 공통 ForumWriteForm 재사용 (신규 write 컴포넌트/에디터 도입 없음).
 * 권한 경계는 backend 가 강제한다 — /pharmacy-hub/forum/posts 는 active PharmacyHub membership 만 write 허용.
 * 프론트 MembershipGate 는 UX 안내이며 판정 근거가 아니다.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ForumWriteForm, type ForumWriteFormPayload, type ForumHubCategory } from '@o4o/shared-space-ui';
import {
  createPharmacyHubForumPost,
  fetchPharmacyHubForumCategories,
} from '../../services/forumApi';

export default function ForumWritePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [categories, setCategories] = useState<ForumHubCategory[]>([]);
  const [forumId, setForumId] = useState<string>(searchParams.get('forum') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchPharmacyHubForumCategories();
      setCategories(rows);
      setForumId((current) => (current || rows[0]?.id || ''));
    } catch (err) {
      setCategories([]);
      setError(err instanceof Error ? err.message : '게시판 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCategories(); }, [loadCategories]);

  const handleSubmit = async (payload: ForumWriteFormPayload) => {
    if (!forumId) {
      setError('게시판을 선택해 주세요.');
      return;
    }
    setError(null);
    try {
      const created = await createPharmacyHubForumPost({
        forumId,
        title: payload.title,
        content: payload.editorHtml,
        type: payload.type,
      });
      navigate(`/forum/posts/${created.id}`);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setError('이 게시판에 글을 쓸 권한이 없습니다. PharmacyHub 가입 상태를 확인해 주세요.');
      } else {
        setError(err instanceof Error ? err.message : '게시글을 등록하지 못했습니다.');
      }
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <button className="mb-4 text-sm text-blue-600" onClick={() => navigate('/forum/posts')}>
          ← 게시글 목록
        </button>
        <h1 className="mb-5 text-2xl font-bold text-slate-900">글쓰기</h1>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="ph-forum-select">
            게시판
          </label>
          <select
            id="ph-forum-select"
            value={forumId}
            disabled={loading || categories.length === 0}
            onChange={(event) => setForumId(event.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {loading && <option value="">불러오는 중…</option>}
            {!loading && categories.length === 0 && <option value="">게시판 없음</option>}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>

        <ForumWriteForm
          showPostType
          theme="blue"
          submitLabel="등록"
          onSubmit={handleSubmit}
          onCancel={() => navigate('/forum/posts')}
          onInvalid={(reason) =>
            setError(reason === 'title' ? '제목을 입력해 주세요.' : '내용을 입력해 주세요.')
          }
        />
      </div>
    </main>
  );
}
