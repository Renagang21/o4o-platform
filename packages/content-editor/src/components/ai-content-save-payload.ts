/** AiContentModal's distinct save contracts. No fetch calls or React state. */
import { htmlToForumBlocks } from './ai-content-format';

export function buildCommunitySavePayload(html: string, title: string, forumId: string) {
  const blocks = htmlToForumBlocks(html);
  return {
    title: title.trim() || 'AI 생성 콘텐츠',
    content: blocks.length > 0 ? blocks : html,
    type: 'discussion',
    ...(forumId ? { forumId } : {}),
  };
}

export function buildStoreSavePayload(html: string, title: string) {
  const blocks = htmlToForumBlocks(html);
  return {
    title: title.trim() || 'AI 생성 콘텐츠',
    contentJson: blocks.length > 0 ? blocks : { html },
  };
}

export function buildProductionMaterialSavePayload(
  result: { html: string; summary?: string },
  title: string,
  outputType: string,
  sourceMetadata?: { sourceContentId?: string; sourceTitle?: string; sourceOrigin?: string },
  templateId?: string,
) {
  return {
    title: title.trim() || 'AI 생성 매장 제작 자료',
    description: result.summary || null,
    assetType: 'content',
    htmlContent: result.html,
    category: outputType,
    usageType: outputType === 'pop' ? 'pop' : outputType === 'store_qr' ? 'qr' : null,
    sourceType: 'generated',
    ...(sourceMetadata ? { sourceMetadata } : {}),
    ...(templateId ? { templateId } : {}),
  };
}
