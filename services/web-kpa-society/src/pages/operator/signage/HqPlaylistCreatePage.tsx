/**
 * HqPlaylistCreatePage — HQ 플레이리스트 등록 (운영자 디지털 사이니지)
 *
 * WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1
 *   - 공통 SignagePlaylistCreateShell 채택. 저장은 canonical /api/signage/:serviceKey/hq/* 다단계
 *     (URL별 HQ media 생성 → 플레이리스트 생성 → 항목 일괄 추가) — 기존 HqPlaylistsPage 모달 흐름 동일.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListMusic } from 'lucide-react';
import { getAccessToken } from '../../../contexts/AuthContext';
import { SignagePlaylistCreateShell } from '@o4o/shared-space-ui';
import type { SignagePlaylistCreateValues } from '@o4o/shared-space-ui';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';
const LIST_PATH = '/operator/signage/hq-playlists';

const DEFAULT_TAG_SUGGESTIONS = [
  '복약지도', '당뇨', '혈압', '면역', '건강기능식품',
  '의약외품', '이벤트', '프로모션', '신제품', '추천상품',
];

export default function HqPlaylistCreatePage() {
  const navigate = useNavigate();

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || body?.message || `API error ${res.status}`);
    }
    return res.json();
  }, []);

  const handleSubmit = useCallback(async (
    values: SignagePlaylistCreateValues,
    { setProgress }: { setProgress: (m: string) => void },
  ) => {
    // Step 1: URL 별로 HQ media 생성
    const mediaIds: string[] = [];
    for (let i = 0; i < values.items.length; i++) {
      const item = values.items[i];
      setProgress(`동영상 등록 중 (${i + 1}/${values.items.length})...`);
      const mediaResult = await apiFetch(`/api/signage/${SERVICE_KEY}/hq/media`, {
        method: 'POST',
        body: JSON.stringify({
          name: item.title || `동영상 ${i + 1}`,
          mediaType: 'video',
          sourceUrl: item.url,
          duration: item.durationSeconds,
          tags: values.tags,
        }),
      });
      mediaIds.push((mediaResult.data || mediaResult).id);
    }

    // Step 2: 플레이리스트 생성
    setProgress('플레이리스트 생성 중...');
    const playlistResult = await apiFetch(`/api/signage/${SERVICE_KEY}/hq/playlists`, {
      method: 'POST',
      body: JSON.stringify({
        name: values.name,
        loopEnabled: values.loopEnabled,
        defaultItemDuration: values.defaultItemDuration,
        transitionType: values.transitionType,
        tags: values.tags,
      }),
    });
    const playlist = playlistResult.data || playlistResult;

    // Step 3: 항목 일괄 추가
    setProgress('항목 추가 중...');
    await apiFetch(`/api/signage/${SERVICE_KEY}/playlists/${playlist.id}/items/bulk`, {
      method: 'POST',
      body: JSON.stringify({
        items: mediaIds.map((mediaId, idx) => ({
          mediaId,
          sortOrder: idx + 1,
          duration: values.defaultItemDuration,
          transitionType: values.transitionType,
          sourceType: 'hq',
        })),
      }),
    });

    navigate(`${LIST_PATH}/${playlist.id}`);
  }, [apiFetch, navigate]);

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate(LIST_PATH)} className="text-sm text-blue-600 hover:underline mb-2">← 목록으로</button>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ListMusic className="w-6 h-6 text-blue-600" /> 플레이리스트 등록
        </h1>
        <p className="text-slate-500 text-sm mt-1">운영자 제공 사이니지 플레이리스트</p>
      </div>

      <SignagePlaylistCreateShell
        config={{
          surface: 'operator',
          tagSuggestions: DEFAULT_TAG_SUGGESTIONS,
          namePlaceholder: '플레이리스트 이름',
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate(LIST_PATH)}
      />
    </div>
  );
}
