import { Router, type RequestHandler } from 'express';
import { apiLimiter } from '../middleware/rateLimiter.js';

/**
 * 비로그인 공개 읽기(공개 게시판 · 공개 글 지정) — 은퇴.
 *
 * 2026-11-14 통합 담당 결정: O4O 는 사용자(로그인한 회원)만 이용한다. 비로그인 방문자는 로그인 화면으로 가고,
 * 계정이 없으면 회원가입한다. 그래서 공개 글 목록 · 상세와 운영자의 공개 지정 API 를 닫는다.
 * 저장된 공개 지정 값(forum_category.metadata)은 지우지 않는다(데이터 변경 없음) — 읽는 경로만 닫는다.
 * 회원의 게시판 · 글은 인증된 forum mount(/communities/:communityKey/forum)가 그대로 제공한다.
 */
const retired: RequestHandler = (_req, res) => {
  res.set('Cache-Control', 'no-store').status(410).json({
    success: false,
    code: 'COMMUNITY_PUBLIC_READ_RETIRED',
    error: '공개 열람 기능은 종료되었습니다. 로그인한 뒤 커뮤니티를 이용해 주시기 바랍니다.',
  });
};

export function createCommunityPublicReadRoutes(): Router {
  const router = Router({ mergeParams: true });
  router.get('/:communityKey/public/posts', apiLimiter, retired);
  router.get('/:communityKey/public/posts/:id', apiLimiter, retired);
  router.get('/:communityKey/public-read-settings', apiLimiter, retired);
  router.put('/:communityKey/boards/:boardId/public-read', apiLimiter, retired);
  return router;
}
