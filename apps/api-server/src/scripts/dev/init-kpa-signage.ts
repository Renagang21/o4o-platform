/**
 * WO-KPA-A-SIGNAGE-SEED-V1
 *
 * KPA-a 서비스용 디지털 사이니지 테스트 데이터 초기화 스크립트
 *
 * 기능:
 * - 기존 kpa-society signage 데이터 삭제 (idempotent)
 * - Media 6개 생성
 * - Playlist 2개 생성
 * - Playlist-Media 매핑 생성
 *
 * 실행: pnpm run seed:kpa:signage
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const SERVICE_KEY = 'kpa-society';

// 운영 DB 접근은 Cloud SQL Auth Proxy 를 경유한다 (직접 host 지정 금지).
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5442'),
  database: process.env.DB_NAME || 'o4o_platform',
  user: process.env.DB_USERNAME || 'o4o_api',
  password: process.env.DB_PASSWORD,
  ssl: false,
});

// ============================================================================
// Media 데이터 정의
// ============================================================================
interface MediaSeed {
  id: string;
  name: string;
  description: string;
  mediaType: 'image' | 'video';
  sourceType: 'url' | 'youtube';
  sourceUrl: string;
  embedId: string | null;
  thumbnailUrl: string;
  duration: number | null;
  category: string;
  tags: string[];
}

const mediaSeeds: MediaSeed[] = [
  {
    id: uuidv4(),
    name: 'KPA 약국 경영 세미나',
    description: '2026년 약국 경영 트렌드와 전략을 소개하는 세미나 자료입니다.',
    mediaType: 'image',
    sourceType: 'url',
    sourceUrl: 'https://placehold.co/1920x1080/4F46E5/FFFFFF/png?text=KPA+약국경영세미나',
    embedId: null,
    thumbnailUrl: 'https://placehold.co/400x225/4F46E5/FFFFFF/png?text=세미나',
    duration: null,
    category: 'education',
    tags: ['세미나', '경영', '교육'],
  },
  {
    id: uuidv4(),
    name: 'CGM 교육 영상',
    description: '연속혈당측정기(CGM) 사용법 및 환자 상담 가이드 영상입니다.',
    mediaType: 'video',
    sourceType: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedId: 'dQw4w9WgXcQ',
    thumbnailUrl: 'https://placehold.co/400x225/DC2626/FFFFFF/png?text=CGM+교육',
    duration: 180,
    category: 'education',
    tags: ['CGM', '당뇨', '교육', '영상'],
  },
  {
    id: uuidv4(),
    name: '건강기능식품 프로모션',
    description: '봄철 건강기능식품 프로모션 안내 배너입니다.',
    mediaType: 'image',
    sourceType: 'url',
    sourceUrl: 'https://placehold.co/1920x1080/059669/FFFFFF/png?text=건강기능식품+프로모션',
    embedId: null,
    thumbnailUrl: 'https://placehold.co/400x225/059669/FFFFFF/png?text=프로모션',
    duration: null,
    category: 'promotion',
    tags: ['프로모션', '건강기능식품', '봄'],
  },
  {
    id: uuidv4(),
    name: '봄 시즌 이벤트',
    description: '2026년 봄 시즌 약국 이벤트 안내입니다.',
    mediaType: 'image',
    sourceType: 'url',
    sourceUrl: 'https://placehold.co/1920x1080/EC4899/FFFFFF/png?text=봄+시즌+이벤트',
    embedId: null,
    thumbnailUrl: 'https://placehold.co/400x225/EC4899/FFFFFF/png?text=봄이벤트',
    duration: null,
    category: 'event',
    tags: ['이벤트', '봄', '시즌'],
  },
  {
    id: uuidv4(),
    name: '운영 공지 배너',
    description: 'KPA 약사회 공지사항 안내 배너입니다.',
    mediaType: 'image',
    sourceType: 'url',
    sourceUrl: 'https://placehold.co/1920x1080/F59E0B/000000/png?text=KPA+공지사항',
    embedId: null,
    thumbnailUrl: 'https://placehold.co/400x225/F59E0B/000000/png?text=공지',
    duration: null,
    category: 'notice',
    tags: ['공지', '안내', 'KPA'],
  },
  {
    id: uuidv4(),
    name: '테스트 전용 콘텐츠',
    description: '개발 및 테스트 목적으로 생성된 콘텐츠입니다.',
    mediaType: 'image',
    sourceType: 'url',
    sourceUrl: 'https://placehold.co/1920x1080/6B7280/FFFFFF/png?text=테스트+콘텐츠',
    embedId: null,
    thumbnailUrl: 'https://placehold.co/400x225/6B7280/FFFFFF/png?text=테스트',
    duration: null,
    category: 'test',
    tags: ['테스트', '개발'],
  },
];

// ============================================================================
// Playlist 데이터 정의
// ============================================================================
interface PlaylistSeed {
  id: string;
  name: string;
  description: string;
  mediaIds: string[]; // 매핑할 media ID 인덱스
}

const playlistSeeds: PlaylistSeed[] = [
  {
    id: uuidv4(),
    name: 'KPA 기본 플레이리스트',
    description: '공용공간에 기본으로 노출되는 KPA 플레이리스트입니다. 세미나, 교육, 공지 콘텐츠를 포함합니다.',
    mediaIds: [], // 나중에 채움
  },
  {
    id: uuidv4(),
    name: 'KPA 시즌 프로모션',
    description: '시즌별 프로모션 및 이벤트 콘텐츠 플레이리스트입니다.',
    mediaIds: [], // 나중에 채움
  },
];

// ============================================================================
// 메인 실행 함수
// ============================================================================
async function initKpaSignage() {
  const client = await pool.connect();

  try {
    console.log('🚀 KPA-a Signage 초기화 시작...\n');
    console.log(`   serviceKey: ${SERVICE_KEY}`);
    console.log('');

    // ========================================================================
    // Step 1: 기존 데이터 삭제 (idempotent)
    // ========================================================================
    console.log('📌 Step 1: 기존 kpa-society signage 데이터 삭제...');

    // Playlist Items 먼저 삭제 (FK 제약)
    const deleteItemsResult = await client.query(`
      DELETE FROM signage_playlist_items
      WHERE "playlistId" IN (
        SELECT id FROM signage_playlists WHERE "serviceKey" = $1
      )
    `, [SERVICE_KEY]);
    console.log(`   - Playlist Items 삭제: ${deleteItemsResult.rowCount}건`);

    // Playlists 삭제
    const deletePlaylistsResult = await client.query(`
      DELETE FROM signage_playlists WHERE "serviceKey" = $1
    `, [SERVICE_KEY]);
    console.log(`   - Playlists 삭제: ${deletePlaylistsResult.rowCount}건`);

    // Media 삭제
    const deleteMediaResult = await client.query(`
      DELETE FROM signage_media WHERE "serviceKey" = $1
    `, [SERVICE_KEY]);
    console.log(`   - Media 삭제: ${deleteMediaResult.rowCount}건`);

    console.log('   ✓ 기존 데이터 삭제 완료\n');

    // ========================================================================
    // Step 2: Media 생성
    // ========================================================================
    console.log('📌 Step 2: Media 6개 생성...');

    for (const media of mediaSeeds) {
      await client.query(`
        INSERT INTO signage_media (
          id,
          "serviceKey",
          "organizationId",
          name,
          description,
          "mediaType",
          "sourceType",
          "sourceUrl",
          "embedId",
          "thumbnailUrl",
          duration,
          category,
          tags,
          status,
          source,
          scope,
          metadata,
          "createdAt",
          "updatedAt",
          version
        ) VALUES (
          $1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          'active', 'hq', 'global', '{}', NOW(), NOW(), 1
        )
      `, [
        media.id,
        SERVICE_KEY,
        media.name,
        media.description,
        media.mediaType,
        media.sourceType,
        media.sourceUrl,
        media.embedId,
        media.thumbnailUrl,
        media.duration,
        media.category,
        media.tags,
      ]);
      console.log(`   ✓ ${media.name}`);
    }
    console.log('');

    // ========================================================================
    // Step 3: Playlist 생성
    // ========================================================================
    console.log('📌 Step 3: Playlist 2개 생성...');

    // Playlist 1: 첫 4개 media (세미나, CGM, 프로모션, 공지)
    playlistSeeds[0].mediaIds = [
      mediaSeeds[0].id,
      mediaSeeds[1].id,
      mediaSeeds[2].id,
      mediaSeeds[4].id,
    ];

    // Playlist 2: 프로모션, 이벤트, 테스트
    playlistSeeds[1].mediaIds = [
      mediaSeeds[2].id,
      mediaSeeds[3].id,
      mediaSeeds[5].id,
    ];

    for (const playlist of playlistSeeds) {
      await client.query(`
        INSERT INTO signage_playlists (
          id,
          "serviceKey",
          "organizationId",
          name,
          description,
          status,
          "loopEnabled",
          "defaultItemDuration",
          "transitionType",
          "transitionDuration",
          "totalDuration",
          "itemCount",
          source,
          scope,
          "isPublic",
          "likeCount",
          "downloadCount",
          metadata,
          "createdAt",
          "updatedAt",
          version
        ) VALUES (
          $1, $2, NULL, $3, $4,
          'active', true, 10, 'fade', 500,
          $5, $6, 'hq', 'global', true, 0, 0, '{}', NOW(), NOW(), 1
        )
      `, [
        playlist.id,
        SERVICE_KEY,
        playlist.name,
        playlist.description,
        playlist.mediaIds.length * 10, // 각 10초 가정
        playlist.mediaIds.length,
      ]);
      console.log(`   ✓ ${playlist.name}`);
    }
    console.log('');

    // ========================================================================
    // Step 4: Playlist Items 생성 (매핑)
    // ========================================================================
    console.log('📌 Step 4: Playlist-Media 매핑 생성...');

    let itemCount = 0;
    for (const playlist of playlistSeeds) {
      for (let i = 0; i < playlist.mediaIds.length; i++) {
        await client.query(`
          INSERT INTO signage_playlist_items (
            id,
            "playlistId",
            "mediaId",
            "sortOrder",
            duration,
            "transitionType",
            "isActive",
            "isForced",
            "sourceType",
            metadata,
            "createdAt",
            "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, 10, 'fade', true, false, 'hq', '{}', NOW(), NOW()
          )
        `, [
          uuidv4(),
          playlist.id,
          playlist.mediaIds[i],
          i + 1,
        ]);
        itemCount++;
      }
    }
    console.log(`   ✓ Playlist Items ${itemCount}개 생성 완료\n`);

    // ========================================================================
    // 완료 요약
    // ========================================================================
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ KPA-a Signage 초기화 완료!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   📹 Media: ${mediaSeeds.length}개`);
    console.log(`   📋 Playlists: ${playlistSeeds.length}개`);
    console.log(`   🔗 Playlist Items: ${itemCount}개`);
    console.log('');
    console.log('🔍 확인 방법:');
    console.log('   1. https://kpa-society.co.kr/signage 접속');
    console.log('   2. 플레이리스트 2개, 미디어 6개 노출 확인');
    console.log('   3. 상세 페이지 진입 확인');
    console.log('');

  } catch (error) {
    console.error('❌ 초기화 실패:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// 실행
initKpaSignage();
