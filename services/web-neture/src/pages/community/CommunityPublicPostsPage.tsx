import { Navigate, useParams } from 'react-router-dom';

/**
 * 옛 공개 글 주소(/communities/:communityKey/public[/post/:slug]) — 공개 열람 은퇴(2026-11-14 통합 담당 결정).
 * 즐겨찾기 · 공유된 링크가 끊기지 않게 회원 포럼의 같은 글로 보낸다. 비로그인이면 포럼이 로그인으로 보낸다.
 */
export default function CommunityPublicPostsPage() {
  const { communityKey = '', slug } = useParams();
  const forum = `/communities/${encodeURIComponent(communityKey)}/forum`;
  return <Navigate to={slug ? `${forum}/post/${encodeURIComponent(slug)}` : forum} replace />;
}
