/**
 * StorePlaylistCreatePage — 내 매장 플레이리스트 등록 (매장 디지털 사이니지)
 *
 * WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1
 *   - 공통 SignagePlaylistCreateShell 채택(store 모드: 제목/설명/태그).
 *   - 저장 endpoint(store-playlists)는 현행 유지 — 매장 목록 조회와 동일 테이블(데이터 정합성).
 *   - 항목(미디어)은 생성 후 목록/상세에서 HUB 복사로 추가한다.
 *
 * WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1 §5-A:
 *   KPA/KCos/GP 3벌이 복제하던 화면 껍데기(뒤로가기·제목·부제)를 공통 StorePlaylistCreateView 로 이관.
 *   저장 API·목록 경로·accent 색만 주입한다. 동작·문구 변경 없음.
 *
 * ⚠️ KEEP-LEGACY (docs/baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1.md):
 *   내 매장 저장을 canonical POST /api/signage/:serviceKey/playlists 로 바꾸지 말 것.
 *   store_playlist_items(snapshot_id) ≠ signage_playlist_items(mediaId) — 항목 모델 비호환.
 *   항목 reconciliation 전 전환 시 목록 불일치/항목 손실. 근거: IR-...-CANONICAL-DATA-MODEL-V1.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorePlaylistCreateView } from '@o4o/shared-space-ui';
import type { SignagePlaylistCreateValues } from '@o4o/shared-space-ui';
import { createStorePlaylist } from '../../api/storePlaylist';

const LIST_PATH = '/store/marketing/signage/playlist';

export function StorePlaylistCreatePage() {
  const navigate = useNavigate();

  const handleSubmit = useCallback(async (values: SignagePlaylistCreateValues) => {
    await createStorePlaylist({
      name: values.name,
      playlistType: 'LIST',
      description: values.description || undefined,
      tags: values.tags.length > 0 ? values.tags : undefined,
    });
    navigate(LIST_PATH);
  }, [navigate]);

  return (
    <StorePlaylistCreateView
      accentColor="#2563eb"
      onBack={() => navigate(LIST_PATH)}
      onSubmit={handleSubmit}
      config={{
        descriptionPlaceholder: '이 플레이리스트의 사용 목적이나 적용 위치를 간략히 기록하세요',
      }}
    />
  );
}

export default StorePlaylistCreatePage;
