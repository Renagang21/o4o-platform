/**
 * HqPlaylistCreatePage — 운영자 사이니지 HQ 플레이리스트 등록 (공통 콘솔)
 *
 * WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1 (원본):
 *   공통 `SignagePlaylistCreateShell`(@o4o/shared-space-ui) 채택.
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1:
 *   Shell 은 이미 공통이었으나 그 위의 **다단계 저장 오케스트레이션**이
 *   KPA/K-Cosmetics 에 각각 복제돼 있었다. 그 부분을 여기로 수렴한다.
 *
 * 저장 흐름 (canonical, 3단계 — 기존과 동일):
 *   1) URL 별로 HQ media 생성   POST /api/signage/:serviceKey/hq/media
 *   2) 플레이리스트 생성         POST /api/signage/:serviceKey/hq/playlists
 *   3) 항목 일괄 추가            POST /api/signage/:serviceKey/playlists/:id/items/bulk
 */

import { useCallback, useState } from 'react';
import { ListMusic } from 'lucide-react';
import { SignagePlaylistCreateShell } from '@o4o/shared-space-ui';
import type { SignageHqPageProps } from './types';

export function HqPlaylistCreatePage({ apiFetch, config, navigate }: SignageHqPageProps) {
  const { serviceKey, accent, routeBase, tagSuggestions, playlistLabel } = config;
  const listPath = `${routeBase}/hq-playlists`;

  const [progress, setProgress] = useState<string>('');

  const handleSubmit = useCallback(async (values: any) => {
    // Step 1: URL 별로 HQ media 생성
    const mediaIds: string[] = [];
    const items = values.items ?? [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setProgress(`동영상 등록 중... (${i + 1}/${items.length})`);
      const mediaResult = await apiFetch(`/api/signage/${serviceKey}/hq/media`, {
        method: 'POST',
        body: JSON.stringify({
          name: item.title || `동영상 ${i + 1}`,
          mediaType: 'video',
          sourceUrl: item.url,
          duration: item.durationSeconds,
          tags: values.tags,
        }),
      });
      const media = mediaResult?.data ?? mediaResult;
      mediaIds.push(media.id);
    }

    // Step 2: 플레이리스트 생성
    setProgress(`${playlistLabel} 생성 중...`);
    const playlistResult = await apiFetch(`/api/signage/${serviceKey}/hq/playlists`, {
      method: 'POST',
      body: JSON.stringify({
        name: values.name,
        loopEnabled: values.loopEnabled,
        defaultItemDuration: values.defaultItemDuration,
        transitionType: values.transitionType,
        tags: values.tags,
      }),
    });
    const playlist = playlistResult?.data ?? playlistResult;

    // Step 3: 항목 일괄 추가
    setProgress('재생 항목 추가 중...');
    await apiFetch(`/api/signage/${serviceKey}/playlists/${playlist.id}/items/bulk`, {
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

    setProgress('');
    navigate(`${listPath}/${playlist.id}`);
  }, [apiFetch, serviceKey, navigate, listPath, playlistLabel]);

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate(listPath)} className={`text-sm ${accent.linkText} hover:underline mb-2`}>
          ← 목록으로
        </button>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ListMusic className={`w-6 h-6 ${accent.icon}`} /> {playlistLabel} 등록
        </h1>
        <p className="text-slate-500 text-sm mt-1">운영자 제공 사이니지 {playlistLabel}</p>
        {progress && <p className="text-xs text-slate-400 mt-1">{progress}</p>}
      </div>

      <SignagePlaylistCreateShell
        config={{
          surface: 'operator',
          tagSuggestions,
          namePlaceholder: `${playlistLabel} 이름`,
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate(listPath)}
      />
    </div>
  );
}
