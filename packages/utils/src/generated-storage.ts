import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * _generated 폴더 관리 유틸리티
 *
 * AI 생성 UI 파일을 표준화된 구조로 저장/조회
 */

export type SourceType = 'antigravity' | 'gemini' | 'claude' | 'chatgpt' | 'manual';

export interface GeneratedMetadata {
  version: string;
  timestamp: string;
  source: SourceType;
  feature: string;
  prompt?: string;
  aiModel?: string;
  generation: {
    status: 'success' | 'partial' | 'failed';
    blockCount?: number;
    placeholderCount?: number;
    componentCount?: number;
  };
  conversion?: {
    jsxToBlocks: boolean;
    tailwindParsed: boolean;
    placeholdersCreated?: string[];
  };
  files: {
    preview?: string;
    react?: string;
    html?: string;
    blocks?: string;
  };
  stats?: {
    linesOfCode?: number;
    estimatedTokens?: number;
  };
}

export interface SaveOptions {
  source: SourceType;
  feature?: string;
  prompt?: string;
  aiModel?: string;
  react?: {
    code: string;
    fileName?: string;
  };
  html?: string;
  blocks?: any;
  images?: {
    preview?: Buffer;
    components?: { name: string; data: Buffer }[];
  };
  stats?: {
    linesOfCode?: number;
    estimatedTokens?: number;
  };
}

/**
 * 타임스탬프 생성 (UTC, YYYY-MM-DD_HH-mm-ss)
 */
export function generateTimestamp(): string {
  const now = new Date();
  return now.toISOString()
    .replace(/T/, '_')
    .replace(/\..+/, '')
    .replace(/:/g, '-');
}

/**
 * _generated 경로 생성
 */
export function getGeneratedPath(
  source: SourceType,
  feature: string = 'ui',
  timestamp?: string
): string {
  const rootPath = path.join(process.cwd(), '_generated');
  const ts = timestamp || generateTimestamp();
  return path.join(rootPath, source, feature, ts);
}

/**
 * 생성물 저장
 */
export async function saveGenerated(options: SaveOptions): Promise<string> {
  const timestamp = generateTimestamp();
  const basePath = getGeneratedPath(options.source, options.feature || 'ui', timestamp);

  // 디렉토리 생성
  await fs.mkdir(path.join(basePath, 'images'), { recursive: true });
  await fs.mkdir(path.join(basePath, 'html'), { recursive: true });
  await fs.mkdir(path.join(basePath, 'react'), { recursive: true });
  await fs.mkdir(path.join(basePath, 'blocks'), { recursive: true });

  const files: GeneratedMetadata['files'] = {};

  // React 코드 저장
  if (options.react) {
    const fileName = options.react.fileName || 'App.tsx';
    const reactPath = path.join(basePath, 'react', fileName);
    await fs.writeFile(reactPath, options.react.code, 'utf-8');
    files.react = `react/${fileName}`;
  }

  // HTML 저장
  if (options.html) {
    const htmlPath = path.join(basePath, 'html', 'index.html');
    await fs.writeFile(htmlPath, options.html, 'utf-8');
    files.html = 'html/index.html';
  }

  // Blocks 저장
  if (options.blocks) {
    const blocksPath = path.join(basePath, 'blocks', 'blocks.json');
    await fs.writeFile(blocksPath, JSON.stringify(options.blocks, null, 2), 'utf-8');
    files.blocks = 'blocks/blocks.json';
  }

  // 이미지 저장
  if (options.images?.preview) {
    const previewPath = path.join(basePath, 'images', 'preview.png');
    await fs.writeFile(previewPath, options.images.preview);
    files.preview = 'images/preview.png';
  }

  if (options.images?.components) {
    for (const comp of options.images.components) {
      const imgPath = path.join(basePath, 'images', comp.name);
      await fs.writeFile(imgPath, comp.data);
    }
  }

  // Metadata 생성
  const metadata: GeneratedMetadata = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    source: options.source,
    feature: options.feature || 'ui',
    prompt: options.prompt,
    aiModel: options.aiModel,
    generation: {
      status: 'success',
      blockCount: options.blocks ? (Array.isArray(options.blocks) ? options.blocks.length : options.blocks.blocks?.length) : undefined,
      componentCount: options.react ? 1 : undefined,
    },
    files,
    stats: options.stats,
  };

  // metadata.json 저장
  const metadataPath = path.join(basePath, 'metadata.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return basePath;
}

/**
 * 생성물 조회
 */
export async function loadGenerated(
  source: SourceType,
  timestamp: string,
  feature: string = 'ui'
): Promise<GeneratedMetadata | null> {
  const basePath = getGeneratedPath(source, feature, timestamp);
  const metadataPath = path.join(basePath, 'metadata.json');

  try {
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * 생성물 목록 조회
 */
export async function listGenerated(
  source: SourceType,
  feature: string = 'ui'
): Promise<GeneratedMetadata[]> {
  const featurePath = path.join(process.cwd(), '_generated', source, feature);

  try {
    const timestamps = await fs.readdir(featurePath);
    const metadataList: GeneratedMetadata[] = [];

    for (const timestamp of timestamps) {
      const metadata = await loadGenerated(source, timestamp, feature);
      if (metadata) {
        metadataList.push(metadata);
      }
    }

    // 최신순 정렬
    return metadataList.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    return [];
  }
}

/**
 * 생성물 삭제
 */
export async function deleteGenerated(
  source: SourceType,
  timestamp: string,
  feature: string = 'ui'
): Promise<boolean> {
  const basePath = getGeneratedPath(source, feature, timestamp);

  try {
    await fs.rm(basePath, { recursive: true, force: true });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 오래된 생성물 정리 (일 단위)
 */
export async function cleanupOldGenerated(
  daysOld: number = 30,
  source?: SourceType
): Promise<number> {
  const rootPath = path.join(process.cwd(), '_generated');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  let deletedCount = 0;
  const sources: SourceType[] = source
    ? [source]
    : ['antigravity', 'gemini', 'claude', 'chatgpt', 'manual'];

  for (const src of sources) {
    const metadataList = await listGenerated(src);

    for (const metadata of metadataList) {
      const timestamp = new Date(metadata.timestamp);
      if (timestamp < cutoffDate) {
        const deleted = await deleteGenerated(src, metadata.timestamp.split('T')[0].replace(/-/g, '-'));
        if (deleted) deletedCount++;
      }
    }
  }

  return deletedCount;
}
