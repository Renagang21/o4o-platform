/**
 * HqPlaylistCreatePage — HQ 재생목록 등록 (운영자 디지털 사이니지)
 *
 * WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1
 *   - 공통 SignagePlaylistCreateShell 채택. KPA 기준 등록 흐름과 동일:
 *     canonical /api/signage/k-cosmetics/hq/* 다단계(URL별 HQ media → 플레이리스트 → 항목 일괄).
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../../../lib/apiClient';
import { SignagePlaylistCreateShell } from '@o4o/shared-space-ui';
import type { SignagePlaylistCreateValues } from '@o4o/shared-space-ui';

const SERVICE_KEY = 'k-cosmetics';
const BASE = `${API_BASE_URL}/api/signage/${SERVICE_KEY}`;
const LIST_PATH = '/operator/signage/hq-playlists';

const DEFAULT_TAG_SUGGESTIONS = [
  '스킨케어', '메이크업', '신제품', '프로모션', '이벤트',
  '베스트셀러', '추천상품', '브랜드', '클렌징', '선케어',
];

export default function HqPlaylistCreatePage() {
  const navigate = useNavigate();

  const apiPost = useCallback(async (path: string, body: any) => {
    const response = await api.request({ method: 'POST', url: path, data: body });
    return response.data;
  }, []);

  const handleSubmit = useCallback(async (
    values: SignagePlaylistCreateValues,
    { setProgress }: { setProgress: (m: string) => void },
  ) => {
    // Step 1: URL 별 HQ media 생성
    const mediaIds: string[] = [];
    for (let i = 0; i < values.items.length; i++) {
      const item = values.items[i];
      setProgress(`동영상 등록 중 (${i + 1}/${values.items.length})...`);
      const mediaResult = await apiPost(`${BASE}/hq/media`, {
        name: item.title || `동영상 ${i + 1}`,
        mediaType: 'video',
        sourceUrl: item.url,
        duration: item.durationSeconds,
        tags: values.tags,
      });
      mediaIds.push((mediaResult.data || mediaResult).id);
    }

    // Step 2: 플레이리스트 생성
    setProgress('재생목록 생성 중...');
    const playlistResult = await apiPost(`${BASE}/hq/playlists`, {
      name: values.name,
      loopEnabled: values.loopEnabled,
      defaultItemDuration: values.defaultItemDuration,
      transitionType: values.transitionType,
      tags: values.tags,
    });
    const playlist = playlistResult.data || playlistResult;

    // Step 3: 항목 일괄 추가
    setProgress('항목 추가 중...');
    await apiPost(`${BASE}/playlists/${playlist.id}/items/bulk`, {
      items: mediaIds.map((mediaId, idx) => ({
        mediaId,
        sortOrder: idx + 1,
        duration: values.defaultItemDuration,
        transitionType: values.transitionType,
        sourceType: 'hq',
      })),
    });

    navigate(`${LIST_PATH}/${playlist.id}`);
  }, [apiPost, navigate]);

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate(LIST_PATH)} className="text-sm text-pink-600 hover:underline mb-2">← 목록으로</button>
        <h1 className="text-2xl font-bold text-slate-800">재생목록 등록</h1>
        <p className="text-slate-500 text-sm mt-1">본사 사이니지 재생목록</p>
      </div>

      <SignagePlaylistCreateShell
        config={{
          surface: 'operator',
          tagSuggestions: DEFAULT_TAG_SUGGESTIONS,
          namePlaceholder: '재생목록 이름',
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate(LIST_PATH)}
      />
    </div>
  );
}
