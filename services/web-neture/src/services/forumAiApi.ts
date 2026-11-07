/**
 * Community forum AI phase 1 client (WO-O4O-COMMUNITY-FORUM-AI-PHASE1-V1).
 * Phase 1 opens these routes on the `community` forum context only; the server decides access from that route.
 */
import { api } from '../lib/apiClient';

const BASE = '/communities/community/forum';

export interface ForumAiStatus {
  available: boolean;
  reason: string | null;
  dailyLimit: number;
  remainingToday: number;
}
export interface ForumComposeSuggestion {
  titles: string[];
  body: { suggestion: string; note: string } | null;
  tags: string[];
  board: { id: string; name: string; reason: string } | null;
}
export interface SimilarForumPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  forumId: string;
  forumName: string;
  createdAt: string;
}
export interface SimilarForumPosts {
  source: 'keyword' | 'ai';
  keywords: string[];
  posts: SimilarForumPost[];
  enough: boolean;
}

export const FORUM_AI_LIMITS = { title: 160, body: 4000 } as const;

export function forumAiErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'AI_DISABLED': return 'AI 도움이 현재 꺼져 있습니다. 글쓰기는 그대로 하실 수 있습니다.';
    case 'AI_NOT_CONFIGURED':
    case 'AI_UNAVAILABLE': return 'AI 도움을 지금 사용할 수 없습니다. 글쓰기는 그대로 하실 수 있습니다.';
    case 'AI_DAILY_LIMIT_EXCEEDED': return '오늘 사용할 수 있는 AI 도움 횟수를 모두 사용했습니다. 글쓰기는 그대로 하실 수 있습니다.';
    case 'AI_QUOTA_EXCEEDED': return 'AI 사용 한도에 도달했습니다. 글쓰기는 그대로 하실 수 있습니다.';
    case 'AI_REQUEST_IN_PROGRESS': return '이전 AI 요청을 처리하고 있습니다. 잠시 후 다시 시도해 주시기 바랍니다.';
    case 'AI_OUTPUT_INVALID': return 'AI 제안을 확인하지 못해 표시하지 않았습니다. 다시 시도해 주시기 바랍니다.';
    case 'INPUT_TOO_LONG': return `제목은 ${FORUM_AI_LIMITS.title}자, 본문은 ${FORUM_AI_LIMITS.body.toLocaleString()}자까지 AI 도움을 받을 수 있습니다.`;
    case 'INPUT_REQUIRED': return '제목이나 본문을 먼저 입력해 주시기 바랍니다.';
    case 'FORUM_NOT_WRITABLE': return '이 게시판에는 글을 쓸 수 없습니다.';
    default: return 'AI 도움을 처리하지 못했습니다. 글쓰기는 그대로 하실 수 있습니다.';
  }
}

export function forumAiErrorCode(error: unknown): string | undefined {
  return (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
}

export async function fetchForumAiStatus(): Promise<ForumAiStatus> {
  return (await api.get(`${BASE}/ai/status`)).data.data;
}
export async function requestForumComposeAssist(input: { title: string; body: string; forumId?: string }): Promise<ForumComposeSuggestion> {
  return (await api.post(`${BASE}/ai/compose-assist`, input)).data.data;
}
export async function fetchSimilarForumPosts(title: string): Promise<SimilarForumPosts> {
  return (await api.get(`${BASE}/posts/similar`, { params: { title } })).data.data;
}
export async function searchSimilarForumPostsWithAi(title: string): Promise<SimilarForumPosts> {
  return (await api.post(`${BASE}/ai/similar-search`, { title })).data.data;
}
