import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth';

const router = Router();

// Get media folders
router.get('/folders', authenticateJWT, async (req, res) => {
  try {
    // Mock data for now
    const folders = [
      {
        id: '1',
        name: 'Images',
        path: '/images',
        parent: null,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Documents',
        path: '/documents',
        parent: null,
        createdAt: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: folders,
      total: folders.length
    });
  } catch (error) {
    console.error('Error fetching media folders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch media folders'
    });
  }
});

// Get media files
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 24;
    
    // Mock data for now
    const media = [
      {
        id: '1',
        name: 'placeholder.jpg',
        url: '/uploads/placeholder.jpg',
        type: 'image/jpeg',
        size: 1024,
        folder: null,
        createdAt: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: media,
      pagination: {
        page,
        limit,
        total: 1,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch media'
    });
  }
});

export default router;