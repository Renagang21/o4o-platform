/**
 * Community forum AI phase 1 (WO-O4O-COMMUNITY-FORUM-AI-PHASE1-V1).
 * - ForumAiAssistPanel: runs only when the author presses the button; every suggestion is applied item by item.
 * - ForumSimilarPosts: keyword hints while typing the title; AI search only on "더 찾기".
 * Neither saves anything. Publishing stays on the form's own submit button. All buttons are type="button":
 * both components render inside the write form.
 */
import { useEffect, useRef, useState } from 'react';
import {
  fetchForumAiStatus,
  fetchSimilarForumPosts,
  FORUM_AI_LIMITS,
  forumAiErrorCode,
  forumAiErrorMessage,
  requestForumComposeAssist,
  searchSimilarForumPostsWithAi,
  type ForumAiStatus,
  type ForumComposeSuggestion,
  type SimilarForumPosts,
} from '../../services/forumAiApi';

const SIMILAR_DEBOUNCE_MS = 600;
const SIMILAR_MIN_TITLE = 2;

const secondaryButton = 'min-h-11 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

/** Editor HTML to the plain text the AI receives. Parsed inertly so nothing in a draft runs or loads. */
export function forumHtmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html.replace(/<\/(p|div|li|h[1-6])>|<br\s*\/?>/gi, '$&\n'), 'text/html');
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
}

/** AI text back to editor HTML. Always escaped: a suggestion can never add markup to the draft. */
export function forumTextToHtml(text: string): string {
  const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  return text.split(/\n+/).map((part) => `<p>${escape(part)}</p>`).join('');
}

interface ForumAiAssistPanelProps {
  title: string;
  editorHtml: string;
  forumId: string;
  tags: readonly string[];
  onApplyTitle: (title: string) => void;
  onApplyBody: (html: string) => void;
  onToggleTag: (tag: string) => void;
  onApplyBoard: (board: { id: string; name: string }) => void;
}

export function ForumAiAssistPanel({ title, editorHtml, forumId, tags, onApplyTitle, onApplyBody, onToggleTag, onApplyBoard }: ForumAiAssistPanelProps) {
  const [status, setStatus] = useState<ForumAiStatus | null>(null);
  const [statusFailed, setStatusFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [suggestion, setSuggestion] = useState<ForumComposeSuggestion | null>(null);
  const [previousHtml, setPreviousHtml] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchForumAiStatus()
      .then((next) => { if (alive) setStatus(next); })
      .catch(() => { if (alive) setStatusFailed(true); });
    return () => { alive = false; };
  }, []);

  const bodyText = forumHtmlToText(editorHtml);
  const trimmedTitle = title.trim();
  const tooLong = trimmedTitle.length > FORUM_AI_LIMITS.title || bodyText.length > FORUM_AI_LIMITS.body;
  const empty = trimmedTitle.length < 2 && bodyText.length < 2;
  const unavailable = statusFailed || (status !== null && !status.available);
  const unavailableMessage = statusFailed ? forumAiErrorMessage('AI_UNAVAILABLE') : forumAiErrorMessage(status?.reason ?? undefined);

  async function ask() {
    // previousHtml stays: a new suggestion must not take away the way back to the original.
    setBusy(true); setMessage(''); setSuggestion(null);
    try {
      setSuggestion(await requestForumComposeAssist({ title: trimmedTitle, body: bodyText, ...(forumId ? { forumId } : {}) }));
      setStatus((current) => current && { ...current, remainingToday: Math.max(current.remainingToday - 1, 0) });
    } catch (error) {
      const code = forumAiErrorCode(error);
      setMessage(forumAiErrorMessage(code));
      if (code === 'AI_DISABLED' || code === 'AI_NOT_CONFIGURED' || code === 'AI_DAILY_LIMIT_EXCEEDED' || code === 'AI_QUOTA_EXCEEDED') {
        setStatus((current) => ({ available: false, reason: code, dailyLimit: current?.dailyLimit ?? 0, remainingToday: 0 }));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="AI 글쓰기 도움" className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-sm font-semibold text-slate-800">AI 도움</h2>
          <p className="m-0 mt-1 text-xs text-slate-600">제안만 드립니다. 적용할 항목을 직접 고르시고, 게시는 등록 버튼으로만 이루어집니다. 의약 질문에는 답하지 않고 글 다듬기와 분류만 돕습니다.</p>
        </div>
        <button type="button" className={secondaryButton} disabled={busy || unavailable || !status || tooLong || empty} onClick={ask}>
          {busy ? '제안을 만드는 중…' : 'AI 도움 받기'}
        </button>
      </div>
      {unavailable && <p role="status" className="m-0 mt-3 text-xs text-amber-800">{unavailableMessage}</p>}
      {!unavailable && tooLong && <p role="status" className="m-0 mt-3 text-xs text-amber-800">{forumAiErrorMessage('INPUT_TOO_LONG')}</p>}
      {!unavailable && status && !tooLong && <p className="m-0 mt-3 text-xs text-slate-500">오늘 남은 횟수: {status.remainingToday}회</p>}
      {message && <p role="alert" className="m-0 mt-3 text-xs text-red-700">{message}</p>}
      {suggestion && <div className="mt-3 space-y-4">
        <div>
          <h3 className="m-0 mb-2 text-xs font-semibold text-slate-700">제목 후보</h3>
          <ul className="m-0 list-none space-y-2 p-0">
            {suggestion.titles.map((candidate) => <li key={candidate} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2">
              <span className="min-w-0 break-words">{candidate}</span>
              <button type="button" className={secondaryButton} onClick={() => onApplyTitle(candidate)} disabled={trimmedTitle === candidate} aria-label={`제목 적용: ${candidate}`}>
                {trimmedTitle === candidate ? '적용됨' : '적용'}
              </button>
            </li>)}
          </ul>
        </div>
        {suggestion.body && <div>
          <h3 className="m-0 mb-2 text-xs font-semibold text-slate-700">본문 수정안</h3>
          {suggestion.body.note && <p className="m-0 mb-2 text-xs text-slate-600">{suggestion.body.note}</p>}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="min-w-0 rounded border border-slate-200 bg-white p-2"><p className="m-0 mb-1 text-xs text-slate-500">현재 본문</p><p className="m-0 whitespace-pre-wrap break-words">{bodyText}</p></div>
            <div className="min-w-0 rounded border border-blue-200 bg-white p-2"><p className="m-0 mb-1 text-xs text-slate-500">수정안</p><p className="m-0 whitespace-pre-wrap break-words">{suggestion.body.suggestion}</p></div>
          </div>
          <p className="m-0 mt-2 text-xs text-amber-800">적용하면 본문이 수정안 글자로 바뀌며 서식과 이미지는 유지되지 않습니다.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={secondaryButton} onClick={() => { setPreviousHtml((current) => current ?? editorHtml); onApplyBody(forumTextToHtml(suggestion.body!.suggestion)); }}>본문에 적용</button>
            {previousHtml !== null && <button type="button" className={secondaryButton} onClick={() => { onApplyBody(previousHtml); setPreviousHtml(null); }}>적용 취소</button>}
          </div>
        </div>}
        {suggestion.tags.length > 0 && <div>
          <h3 className="m-0 mb-2 text-xs font-semibold text-slate-700">태그 후보</h3>
          <div className="flex flex-wrap gap-2">
            {suggestion.tags.map((tag) => <button key={tag} type="button" aria-pressed={tags.includes(tag)} className={`${secondaryButton} ${tags.includes(tag) ? 'border-blue-500 text-blue-700' : ''}`} onClick={() => onToggleTag(tag)}>
              {tags.includes(tag) ? `#${tag} 제거` : `#${tag} 추가`}
            </button>)}
          </div>
        </div>}
        {suggestion.board && <div>
          <h3 className="m-0 mb-2 text-xs font-semibold text-slate-700">추천 게시판</h3>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2">
            <span className="min-w-0 break-words"><strong>{suggestion.board.name}</strong>{suggestion.board.reason && ` — ${suggestion.board.reason}`}</span>
            <button type="button" className={secondaryButton} disabled={forumId === suggestion.board.id} onClick={() => onApplyBoard(suggestion.board!)}>
              {forumId === suggestion.board.id ? '선택됨' : '이 게시판으로 변경'}
            </button>
          </div>
        </div>}
      </div>}
    </section>
  );
}

interface ForumSimilarPostsProps {
  title: string;
  /** Community forum base path; results open from here in a new tab so the draft stays. */
  basePath: string;
  postSegment?: string;
}

export function ForumSimilarPosts({ title, basePath, postSegment = 'post' }: ForumSimilarPostsProps) {
  const [result, setResult] = useState<SimilarForumPosts | null>(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const latest = useRef(0);
  const query = title.trim().slice(0, FORUM_AI_LIMITS.title);

  useEffect(() => {
    const request = ++latest.current;
    setMessage('');
    if (query.length < SIMILAR_MIN_TITLE) { setResult(null); return; }
    const timer = setTimeout(() => {
      fetchSimilarForumPosts(query)
        .then((next) => { if (latest.current === request) setResult(next); })
        // A hint must never get in the way of writing.
        .catch(() => { if (latest.current === request) setResult(null); });
    }, SIMILAR_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  async function findMore() {
    const request = ++latest.current;
    setSearching(true); setMessage('');
    try {
      const next = await searchSimilarForumPostsWithAi(query);
      if (latest.current === request) setResult(next);
    } catch (error) {
      // The keyword results already shown stay on screen.
      if (latest.current === request) setMessage(forumAiErrorMessage(forumAiErrorCode(error)));
    } finally {
      setSearching(false);
    }
  }

  if (query.length < SIMILAR_MIN_TITLE || (!result && !message)) return null;
  const posts = result?.posts ?? [];
  return (
    <section aria-label="비슷한 글" className="mt-2 rounded border border-slate-200 bg-white p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-xs font-semibold text-slate-700">{posts.length ? '비슷한 글이 있습니다' : '비슷한 글을 찾지 못했습니다'}</h2>
        {result && !result.enough && result.source === 'keyword' && <button type="button" className={secondaryButton} disabled={searching} onClick={findMore}>{searching ? '찾는 중…' : 'AI로 더 찾기'}</button>}
      </div>
      {posts.length > 0 && <ul className="m-0 mt-2 list-none space-y-1 p-0">
        {posts.map((post) => <li key={post.id} className="min-w-0 break-words">
          <a href={`${basePath}/${postSegment}/${encodeURIComponent(post.slug)}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{post.title}</a>
          {post.forumName && <span className="ml-2 text-xs text-slate-500">{post.forumName}</span>}
        </li>)}
      </ul>}
      {message && <p role="alert" className="m-0 mt-2 text-xs text-amber-800">{message}</p>}
    </section>
  );
}
