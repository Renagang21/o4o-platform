/**
 * Convert plain text to Block[] format
 * Used for backwards compatibility with string content
 */
export function textToBlocks(text) {
    if (!text || text.trim() === '') {
        return [];
    }
    // Split by double newlines to create paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    return paragraphs.map((paragraph, index) => ({
        id: `block-${Date.now()}-${index}`,
        type: 'paragraph',
        content: paragraph.trim(),
        attributes: {},
        order: index,
    }));
}
/**
 * Convert Block[] to plain text
 * Used for excerpt generation and search indexing
 */
export function blocksToText(blocks) {
    if (!Array.isArray(blocks) || blocks.length === 0) {
        return '';
    }
    return blocks
        .map(block => {
        if (typeof block.content === 'string') {
            return block.content;
        }
        if (typeof block.content === 'object' && block.content?.text) {
            return block.content.text;
        }
        return '';
    })
        .filter(text => text.trim())
        .join('\n\n');
}
/**
 * Normalize content to Block[] format
 * Accepts either string or Block[] and always returns Block[]
 */
export function normalizeContent(content) {
    if (!content) {
        return [];
    }
    if (typeof content === 'string') {
        return textToBlocks(content);
    }
    if (Array.isArray(content)) {
        return content;
    }
    return [];
}
/**
 * Normalize metadata to ensure consistent structure
 * Handles legacy flat structure and converts to new nested structure
 */
export function normalizeMetadata(input) {
    if (!input) {
        return {};
    }
    const metadata = input;
    const result = {};
    // Normalize SEO section
    result.seo = {
        ...(metadata.seo || {}),
        title: metadata.seo?.title || metadata.seoTitle,
        description: metadata.seo?.description || metadata.seoDescription,
        keywords: metadata.seo?.keywords || metadata.seoKeywords,
    };
    // Normalize moderation section
    result.moderation = {
        ...(metadata.moderation || {}),
        moderationNote: metadata.moderation?.moderationNote || metadata.moderationNote,
        moderatedAt: metadata.moderation?.moderatedAt || metadata.moderatedAt,
        moderatedBy: metadata.moderation?.moderatedBy || metadata.moderatedBy,
    };
    // Normalize analytics section
    result.analytics = {
        ...(metadata.analytics || {}),
        lastViewedAt: metadata.analytics?.lastViewedAt || metadata.lastViewedAt,
        peakViewCount: metadata.analytics?.peakViewCount || metadata.peakViewCount,
    };
    // Normalize display section
    result.display = {
        ...(metadata.display || {}),
        featuredImage: metadata.display?.featuredImage || metadata.featuredImage,
        thumbnailUrl: metadata.display?.thumbnailUrl || metadata.thumbnailUrl,
    };
    // Normalize extensions section
    result.extensions = {
        ...(metadata.extensions || {}),
        neture: metadata.extensions?.neture || metadata.neture,
        yaksa: metadata.extensions?.yaksa || metadata.yaksa,
    };
    // Preserve custom fields
    if (metadata.custom) {
        result.custom = metadata.custom;
    }
    // Clean up empty sections
    if (Object.values(result.seo || {}).every(v => v === undefined)) {
        delete result.seo;
    }
    if (Object.values(result.moderation || {}).every(v => v === undefined)) {
        delete result.moderation;
    }
    if (Object.values(result.analytics || {}).every(v => v === undefined)) {
        delete result.analytics;
    }
    if (Object.values(result.display || {}).every(v => v === undefined)) {
        delete result.display;
    }
    if (!result.extensions?.neture && !result.extensions?.yaksa) {
        delete result.extensions;
    }
    return result;
}
/**
 * Check if metadata has any extension data
 */
export function hasExtensionMeta(metadata) {
    if (!metadata)
        return false;
    return !!(metadata.extensions?.neture || metadata.extensions?.yaksa || metadata.neture || metadata.yaksa);
}
/**
 * Get extension metadata safely
 */
export function getExtensionMeta(metadata, extension) {
    if (!metadata)
        return undefined;
    return metadata.extensions?.[extension] || metadata[extension];
}
export { PostStatus, PostType } from '../entities/ForumPost.js';
//# sourceMappingURL=index.js.map