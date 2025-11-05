import { Router, Request, Response } from 'express';

const router: Router = Router();

/**
 * GET /api/v1/search/suggestions
 * Returns search suggestions based on query
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.json({ success: true, suggestions: [] });
    }

    const query = q.toLowerCase();
    const maxLimit = Math.min(Number(limit), 10);

    // TODO: Replace with actual database queries
    // Mock suggestions for now
    const mockSuggestions = [
      {
        id: '1',
        type: 'product',
        title: `상품: ${q}`,
        description: '상품 설명입니다',
        url: `/products/1`
      },
      {
        id: '2',
        type: 'page',
        title: `페이지: ${q}`,
        description: '페이지 설명입니다',
        url: `/pages/about`
      },
      {
        id: '3',
        type: 'category',
        title: `카테고리: ${q}`,
        description: '카테고리 설명입니다',
        url: `/category/electronics`
      },
      {
        id: '4',
        type: 'post',
        title: `블로그: ${q}`,
        description: '블로그 포스트 설명입니다',
        url: `/blog/post-1`
      }
    ];

    // Filter suggestions that match the query
    const filtered = mockSuggestions.filter(
      s => s.title.toLowerCase().includes(query) ||
           s.description?.toLowerCase().includes(query)
    );

    res.json({
      success: true,
      suggestions: filtered.slice(0, maxLimit)
    });
  } catch (error: any) {
    console.error('Search suggestions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch search suggestions'
    });
  }
});

export default router;
