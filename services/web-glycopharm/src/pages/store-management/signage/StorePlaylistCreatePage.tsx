/**
 * StorePlaylistCreatePage — 내 매장 플레이리스트 등록 (매장 디지털 사이니지)
 *
 * WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1
 *   - 공통 SignagePlaylistCreateShell 채택(store 모드).
 *   - 저장 endpoint(/glycopharm/store-playlists)는 현행 유지 — 매장 목록 조회와 동일 테이블.
 *     GlycoPharm store-playlists 는 이름만 받으므로 태그/설명 필드는 비노출.
 *   - 항목(미디어)은 생성 후 목록/상세에서 HUB 복사로 추가한다.
 *
 * WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1 §5-A:
 *   화면 껍데기를 공통 StorePlaylistCreateView 로 이관(KPA/KCos 와 동일 View). 동작·문구 변경 없음.
 *
 * ⚠️ KEEP-LEGACY (docs/baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1.md):
 *   내 매장 저장을 canonical POST /api/signage/:serviceKey/playlists 로 바꾸지 말 것.
 *   store_playlist_items(snapshot_id) ≠ signage_playlist_items(mediaId) — 항목 모델 비호환.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorePlaylistCreateView } from '@o4o/shared-space-ui';
import type { SignagePlaylistCreateValues } from '@o4o/shared-space-ui';
import { createStorePlaylist } from '@/api/storePlaylist';

const LIST_PATH = '/store/marketing/signage/playlist';

export default function StorePlaylistCreatePage() {
  const navigate = useNavigate();

  const handleSubmit = useCallback(async (values: SignagePlaylistCreateValues) => {
    await createStorePlaylist(values.name, 'LIST');
    navigate(LIST_PATH);
  }, [navigate]);

  return (
    <StorePlaylistCreateView
      accentColor="#2563eb"
      onBack={() => navigate(LIST_PATH)}
      onSubmit={handleSubmit}
      config={{ showTags: false, showDescription: false }}
    />
  );
}
