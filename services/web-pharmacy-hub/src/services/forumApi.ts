import { api } from '../lib/apiClient';
import type { ForumHubCategory } from '@o4o/shared-space-ui';

const SERVICE_CODE = 'pharmacy-hub';

interface ForumDirectoryRow {
  id: string;
  name: string;
  description?: string | null;
  iconEmoji?: string | null;
  iconUrl?: string | null;
  serviceCode: string;
  metadata?: Record<string, unknown> | null;
}

interface ForumDirectoryResponse {
  success: boolean;
  data?: ForumDirectoryRow[];
}

/**
 * PharmacyHub forum directory adapter.
 *
 * The common directory endpoint currently returns rows from the shared
 * forum_category_requests SSOT. PharmacyHub renders only rows belonging to
 * its canonical serviceCode. Post/activity reads are intentionally not wired
 * in this first adoption step; they are commonized in the next forum-list WO.
 */
export async function fetchPharmacyHubForumCategories(): Promise<ForumHubCategory[]> {
  const response = await api.get<ForumDirectoryResponse>('/forum/categories');
  const rows = response.data?.data ?? [];

  return rows
    .filter((forum) => forum.serviceCode === SERVICE_CODE)
    .map((forum) => ({
      id: forum.id,
      name: forum.name,
      description: forum.description ?? null,
      iconEmoji: forum.iconEmoji ?? null,
      iconUrl: forum.iconUrl ?? null,
      postCount: 0,
    }));
}
