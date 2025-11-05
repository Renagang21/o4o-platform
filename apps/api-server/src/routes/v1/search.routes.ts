import { Router, Request, Response } from 'express';
import { SearchService } from '../../services/SearchService.js';

const router: Router = Router();
const searchService = new SearchService();

/**
 * GET /api/v1/search/suggestions
 * Returns search suggestions based on query
 * Query params:
 * - q: search query (2-64 characters, required)
 * - limit: max results (1-10, default 8)
 * - type: 'product' | 'post' | 'page' | 'category' | 'all' (default 'all')
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q, limit = '8', type = 'all' } = req.query;

    // Validate query parameter
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    // Validate limit parameter
    const parsedLimit = Math.min(Math.max(parseInt(limit as string, 10) || 8, 1), 10);

    // Validate type parameter
    const validTypes = ['product', 'post', 'page', 'category', 'all'];
    const searchType = validTypes.includes(type as string) ? (type as any) : 'all';

    // Get suggestions from database
    const suggestions = await searchService.getSuggestions(q, parsedLimit, searchType);

    // No-store cache policy (user input based, should not be cached)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');

    res.json({
      success: true,
      suggestions
    });
  } catch (error: any) {
    console.error('[SearchSuggestions] Error:', error);
    // Fail silently - return empty suggestions on error
    res.json({
      success: true,
      suggestions: []
    });
  }
});

export default router;
