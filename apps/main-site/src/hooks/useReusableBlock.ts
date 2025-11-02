import { useState, useEffect } from 'react';
import { transformWordPressBlocks } from '../utils/wordpress-block-parser';
import { authClient } from '@o4o/auth-client';

interface ReusableBlock {
  id: string;
  title: string;
  content: any[];
}

export function useReusableBlock(blockId?: string) {
  const [reusableBlock, setReusableBlock] = useState<ReusableBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!blockId) {
      setLoading(false);
      return;
    }

    const fetchReusableBlock = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await authClient.api.get(`/wp/v2/blocks/${blockId}`);

        // Transform WordPress blocks to our format
        const transformedContent = transformWordPressBlocks(
          typeof response.data.content === 'string' ? JSON.parse(response.data.content) : response.data.content
        );

        setReusableBlock({
          id: response.data.id,
          title: response.data.title?.rendered || '',
          content: transformedContent,
        });
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchReusableBlock();
  }, [blockId]);

  return { reusableBlock, loading, error };
}