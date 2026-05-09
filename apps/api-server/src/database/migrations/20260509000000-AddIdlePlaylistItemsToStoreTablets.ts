import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-TABLET-IDLE-PLAYLIST-CONFIG-V1
 *
 * store_tablets.idle_playlist_items 컬럼 추가.
 *
 * 매장 내 tablet kiosk 가 idle 모드(미조작 N초 후 매장 대기 화면)에 진입했을 때
 * 재생할 항목 snapshot 을 저장. 외부 playlist FK 가 아니라 jsonb inline 저장.
 *
 * 형식 (IdlePlaylistItem 배열):
 *   [{ type: 'image'|'video', url: string, durationMs?: number }, ...]
 *
 * 정책:
 * - 매장당 N 개의 tablet device 가 등록 가능하나 현재 device pairing 부재로
 *   kiosk URL(/store/:slug/tablet) 에서는 어떤 tablet 인지 식별 불가.
 *   따라서 본 단계에서는 "매장 단위" 설정으로 운영하며, public API 는
 *   해당 매장의 첫 active tablet row 의 idle_playlist_items 를 사용한다.
 * - 추후 device pairing 도입 시 tablet 별 설정으로 자연스럽게 확장 가능
 *   (테이블/컬럼 그대로, 의미만 진화).
 *
 * Signage runtime 미터치 — Tablet 자체 minimal player 로 재생 (PlaybackEngine 미사용).
 */
export class AddIdlePlaylistItemsToStoreTablets20260509000000 implements MigrationInterface {
  name = 'AddIdlePlaylistItemsToStoreTablets20260509000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE store_tablets
        ADD COLUMN IF NOT EXISTS idle_playlist_items JSONB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE store_tablets
        DROP COLUMN IF EXISTS idle_playlist_items
    `);
  }
}
