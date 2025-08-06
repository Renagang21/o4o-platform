import { useState, useEffect } from 'react';
import { transformWordPressBlocks } from '../utils/wordpress-block-parser';

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
        
        const response = await fetch(`/api/wp/v2/blocks/${blockId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch reusable block');
        }
        
        const data = await response.json();
        
        // Transform WordPress blocks to our format
        const transformedContent = transformWordPressBlocks(
          typeof data.content === 'string' ? JSON.parse(data.content) : data.content
        );
        
        setReusableBlock({
          id: data.id,
          title: data.title?.rendered || '',
          content: transformedContent,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchReusableBlock();
  }, [blockId]);

  return { reusableBlock, loading, error };
}