/**
 * home-news — O4O 대표 홈 「O4O 서비스 소식」 데이터 계층
 *
 * WO-O4O-NETURE-HOME-SERVICE-NEWS-FORUM-V1
 *
 * 데이터: `GET /neture/home/news?limit=5` (서버가 소식 포럼을 slug 로 확정하고
 * 공개(publish) 글만 게시일 내림차순으로 돌려준다 — 비공개 · 초안 · 삭제 글 배제는 서버 책임).
 * 바로가기 · 전체 보기 링크는 기존 포럼 목록(`/forum/posts`)의 `category` · `tag` 필터를 그대로 쓴다.
 * 별도 게시판 · 별도 저장소 없음. 실패는 "글 없음" 과 구분해 재시도로 돌려준다.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from './apiClient';

export const HOME_NEWS_LIMIT = 5;

/** 홈 바로가기 3종 — 소식 포럼의 분류 태그와 문자열이 같아야 한다 (`?tag=` 정확 일치). */
export const HOME_NEWS_SHORTCUTS: ReadonlyArray<{ id: string; label: string; tag: string }> = [
  { id: 'updates', label: '새 기능·업데이트', tag: '새 기능·업데이트' },
  { id: 'howto', label: '사용법', tag: '사용법' },
  { id: 'cases', label: '활용 사례', tag: '활용 사례' },
];

export interface HomeNewsForum {
  id: string;
  slug: string;
  name: string;
}

export interface HomeNewsPost {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  publishedAt: string;
}

export interface HomeNewsData {
  forum: HomeNewsForum | null;
  posts: HomeNewsPost[];
}

/** 포럼 전체 목록 (기존 ForumPage `?category=<forumId>`) */
export function forumListPath(forum: HomeNewsForum): string {
  return `/forum/posts?category=${encodeURIComponent(forum.id)}`;
}

/** 분류별 목록 (기존 ForumPage `?category=<forumId>&tag=<태그>`) */
export function forumTagPath(forum: HomeNewsForum, tag: string): string {
  return `${forumListPath(forum)}&tag=${encodeURIComponent(tag)}`;
}

/** 글 상세 (기존 `/forum/post/:slug`) */
export function forumPostPath(post: HomeNewsPost): string {
  return `/forum/post/${post.slug}`;
}

export function formatNewsDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export async function fetchHomeNews(limit: number = HOME_NEWS_LIMIT): Promise<HomeNewsData> {
  const res = await api.get(`/neture/home/news?limit=${limit}`);
  const data = res.data?.data;
  if (!data || !Array.isArray(data.posts)) throw new Error('bad response');
  const forum = data.forum && data.forum.id && data.forum.slug
    ? { id: String(data.forum.id), slug: String(data.forum.slug), name: String(data.forum.name ?? '') }
    : null;
  const posts: HomeNewsPost[] = data.posts
    .filter((p: any) => p && p.slug && p.title)
    .slice(0, limit)
    .map((p: any) => ({
      id: String(p.id),
      slug: String(p.slug),
      title: String(p.title),
      tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
      publishedAt: String(p.publishedAt ?? ''),
    }));
  return { forum, posts };
}

export function useHomeNews() {
  const [data, setData] = useState<HomeNewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchHomeNews()
      .then((d) => {
        if (cancelled) return;
        setData(d);
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
        setError('소식을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { data, loading, error, reload };
}
