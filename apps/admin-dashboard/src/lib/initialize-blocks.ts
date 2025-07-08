import { blockRegistry } from './block-registry';
import { allBlockDefinitions } from './block-definitions';

/**
 * 블록 레지스트리 초기화
 * 애플리케이션 시작 시 모든 블록을 등록합니다.
 */
export const initializeBlocks = () => {
  // 기존 블록들 제거 (개발 환경에서 Hot Reload 대응)
  allBlockDefinitions.forEach(blockDef => {
    blockRegistry.unregister(blockDef.name);
  });

  // 모든 블록 정의 등록
  allBlockDefinitions.forEach(blockDef => {
    blockRegistry.register(blockDef);
    console.log(`✅ Block registered: ${blockDef.name} (${blockDef.title})`);
  });

  console.log(`🎉 Block registry initialized with ${allBlockDefinitions.length} blocks`);
};

/**
 * 등록된 블록 목록 확인 (디버깅용)
 */
export const listRegisteredBlocks = () => {
  const blocks = blockRegistry.getAllBlocks();
  console.log('📋 Registered blocks:', blocks.map(b => `${b.name} (${b.title})`));
  return blocks;
};