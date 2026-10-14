import type { SemiFranchiseContent, SemiFranchiseContentInput } from './api';
export interface ContentDraft { title: string; summary: string; body: string; thumbnailUrl: string; tags: string; }
export const EMPTY_CONTENT_DRAFT: ContentDraft = { title: '', summary: '', body: '', thumbnailUrl: '', tags: '' };
export function contentToDraft(content: SemiFranchiseContent): ContentDraft {
  return { title: content.title ?? '', summary: content.summary ?? '', body: content.body ?? '',
    thumbnailUrl: content.thumbnailUrl ?? '', tags: (content.tags ?? []).join(', ') };
}
export function buildContentInput(form: ContentDraft): SemiFranchiseContentInput {
  return { title: form.title.trim(), summary: form.summary.trim(), body: form.body,
    thumbnailUrl: form.thumbnailUrl.trim(), tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean) };
}
