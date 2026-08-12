/**
 * BranchPostsPage — 공지 / 자료실 목록 + 본문
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 *
 * 공개 API 가 본문까지 함께 내려주므로 목록에서 펼쳐 읽는다 (별도 상세 라우트 없음 — 1차 범위).
 */
import { useEffect, useState } from 'react';
import { getPublicPosts, type BranchPost, type BranchPostCategory } from '../lib/api/branch';

const LABEL: Record<BranchPostCategory, string> = { notice: '공지', resource: '자료실' };

export default function BranchPostsPage({ slug, category }: { slug: string; category: BranchPostCategory }) {
  const [items, setItems] = useState<BranchPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    setError(null);
    getPublicPosts(slug, { category, limit: 50 })
      .then((r) => alive && setItems(r.items))
      .catch(() => alive && setError('글 목록을 불러오지 못했습니다.'));
    return () => {
      alive = false;
    };
  }, [slug, category]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-gray-900">{LABEL[category]}</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && items === null && <p className="text-sm text-gray-500">불러오는 중입니다…</p>}
      {items?.length === 0 && <p className="text-sm text-gray-500">등록된 글이 없습니다.</p>}
      <ul className="divide-y divide-gray-100 rounded border border-gray-200">
        {(items ?? []).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setOpenId(openId === p.id ? null : p.id)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50"
            >
              {p.isPinned && <span className="rounded bg-primary-50 px-1.5 py-0.5 text-xs text-primary-700">고정</span>}
              <span className="truncate font-medium text-gray-900">{p.title}</span>
              <span className="ml-auto shrink-0 text-xs text-gray-400">
                {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('ko-KR') : ''}
              </span>
            </button>
            {openId === p.id && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 text-sm">
                <p className="whitespace-pre-wrap leading-relaxed text-gray-800">{p.content}</p>
                {p.attachments.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {p.attachments.map((a) => (
                      <li key={a.url}>
                        <a href={a.url} className="text-primary-700 hover:underline" target="_blank" rel="noreferrer">
                          {a.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
