/**
 * Content Hub Page — GlycoPharm
 *
 * WO-O4O-SIGNAGE-HUB-TEMPLATE-FOUNDATION-V1
 *   SignageManagerTemplate 기반으로 전환.
 *   읽기 전용 (등록/수정/삭제 없음).
 *   플레이리스트 클릭 → 상세 페이지 이동.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignageManagerTemplate } from '@o4o/shared-space-ui';
import type { SignageHubVideo, SignageHubPlaylist } from '@o4o/shared-space-ui';
import { publicContentApi } from '@/lib/api/signageV2';

const SERVICE_KEY = 'glycopharm';
const PAGE_LIMIT = 20;

export default function ContentHubPage() {
  const navigate = useNavigate();

  const [videos, setVideos] = useState<SignageHubVideo[]>([]);
  const [playlists, setPlaylists] = useState<SignageHubPlaylist[]>([]);
  const [videoTotal, setVideoTotal] = useState(0);
  const [playlistTotal, setPlaylistTotal] = useState(0);
  const [videoPage, setVideoPage] = useState(1);
  const [playlistPage, setPlaylistPage] = useState(1);
  const [videosLoading, setVideosLoading] = useState(false);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'playlists'>('playlists');

  // ── Fetch videos ──
  useEffect(() => {
    if (activeTab !== 'videos') return;
    setVideosLoading(true);
    publicContentApi.listMedia(undefined, SERVICE_KEY, {
      page: videoPage,
      limit: PAGE_LIMIT,
    })
      .then((res: any) => {
        if (res.success && res.data) {
          setVideos((res.data as any).items ?? []);
          setVideoTotal((res.data as any).total ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setVideosLoading(false));
  }, [activeTab, videoPage]);

  // ── Fetch playlists ──
  useEffect(() => {
    if (activeTab !== 'playlists') return;
    setPlaylistsLoading(true);
    publicContentApi.listPlaylists(undefined, SERVICE_KEY, {
      page: playlistPage,
      limit: PAGE_LIMIT,
    })
      .then((res: any) => {
        if (res.success && res.data) {
          setPlaylists((res.data as any).items ?? []);
          setPlaylistTotal((res.data as any).total ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setPlaylistsLoading(false));
  }, [activeTab, playlistPage]);

  return (
    <SignageManagerTemplate config={{
      title: '안내 영상 · 자료',
      description: '영상과 플레이리스트를 검색하고 활용하세요',

      // ── 동영상 탭 ──
      videos,
      videosLoading,
      videoTotal,
      videoPage,
      videoPageLimit: PAGE_LIMIT,
      onVideoPageChange: (p) => setVideoPage(p),

      // ── 플레이리스트 탭 ──
      playlists,
      playlistsLoading,
      playlistTotal,
      playlistPage,
      playlistPageLimit: PAGE_LIMIT,
      onPlaylistPageChange: (p) => setPlaylistPage(p),
      onPlaylistClick: (p) => navigate(`signage/playlist/${p.id}`),

      // ── 탭 제어 ──
      initialTab: 'playlists',
      onTabChange: (tab) => setActiveTab(tab),
    }} />
  );
}
